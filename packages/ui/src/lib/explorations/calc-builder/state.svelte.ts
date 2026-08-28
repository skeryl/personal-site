/*
 * All editor state for the calc builder. Pure logic lives in the sibling
 * modules; this class wires it to Svelte runes. Every fill funnels through
 * `fill`, so type gating cannot be bypassed and the selection always
 * advances to the next empty slot.
 */

import {
	addCase,
	addVariadicInput,
	childSlots,
	firstEmptyPath,
	getAt,
	newMapNode,
	newOpNode,
	newSwitchNode,
	pathInside,
	pathKey,
	removeCase,
	removeVariadicInput,
	setAt,
	type CalcNode,
	type Literal,
	type NodePath,
	type ValueType
} from './ast';
import { browser } from '$app/environment';
import { MODEL_BY_ID, type DataModelId } from './datamodels';
import { nodesEqual } from './dsl';
import { evaluate } from './evaluate';
import {
	LIBRARY,
	effectiveVersion,
	latestVersion,
	referencesTo,
	uniqueCalcId,
	type CalcDef
} from './library';
import { OPERATOR_BY_ID, type OperatorId } from './operators';
import {
	CURRENT_KEY,
	LIBRARY_KEY,
	parseWorkingState,
	readJson,
	sanitizeDefs,
	writeJson
} from './persistence';
import { suggestForSlot } from './suggestions';
import {
	accepts,
	check,
	compatibleOperators,
	expectedTypeAt,
	resultTypeOf,
	scopeAt,
	type ExpectedType
} from './typecheck';

export class CalcStore {
	modelId = $state<DataModelId>('trading-position');
	root = $state<CalcNode | null>(null);
	/** Selected empty slot; [] is the root slot, null is no selection. */
	selectedPath = $state<NodePath | null>([]);
	/** Whether the in-place fill popover is open at the selected slot. */
	menuOpen = $state(false);
	/** Stored calculations; user saves join the built-ins and persist locally. */
	library = $state<CalcDef[]>(LIBRARY);
	/** The tree as last loaded, saved, or cleared; divergence means unsaved work. */
	private baseline = $state<CalcNode | null>(null);
	/** Which panel the right column shows. */
	sideTab = $state<'results' | 'library' | 'definition' | 'history' | 'debug'>('library');
	/** pathKey of the debugger's current step; the tree highlights it. */
	debugKey = $state<string | null>(null);
	/** An in-flight drag: the payload, its origin (null = palette), its type. */
	drag = $state<{ node: CalcNode; from: NodePath | null; produces: ValueType | null } | null>(null);
	/** pathKey of the drop target currently hovered during a drag. */
	dragOverKey = $state<string | null>(null);
	/** Display name of the calculation being edited. */
	calcName = $state('');
	/** Library id this tree was loaded from or saved as, for in-place updates. */
	loadedId = $state<string | null>(null);

	constructor() {
		if (!browser) return;
		// The seed writes once; from then on localStorage is the whole library
		// and every entry is an ordinary, editable, deletable calc.
		const raw = readJson(localStorage, LIBRARY_KEY);
		if (raw === null) {
			this.library = LIBRARY;
			this.persistLibrary();
		} else {
			this.library = sanitizeDefs(raw);
		}
		const working = parseWorkingState(readJson(localStorage, CURRENT_KEY));
		if (working.modelId !== null) this.modelId = working.modelId;
		if (working.root !== null) {
			this.root = working.root;
			this.baseline = working.root;
			this.selectedPath = firstEmptyPath(working.root);
		}
		this.calcName = working.name;
		this.loadedId = working.loadedId;
	}

	model = $derived(MODEL_BY_ID[this.modelId]);
	/** True when the tree differs from what was last loaded or saved. */
	dirty = $derived(!nodesEqual(this.root, this.baseline));
	/** The library entry this tree was loaded from; any entry updates in place. */
	loadedCalc = $derived(
		this.loadedId === null ? null : (this.library.find((def) => def.id === this.loadedId) ?? null)
	);
	workingState = $derived({
		modelId: this.modelId,
		root: this.root,
		name: this.calcName,
		loadedId: this.loadedId
	});
	checkResult = $derived(check(this.root, this.model, this.library));
	selectedKey = $derived(this.selectedPath === null ? null : pathKey(this.selectedPath));
	selectedExpected = $derived<ExpectedType | null>(
		this.selectedPath === null
			? null
			: expectedTypeAt(this.root, this.selectedPath, this.model, this.library)
	);
	results = $derived(
		this.model.samples.map((sample) => ({
			sample,
			result: evaluate(this.root, sample.values, this.library)
		}))
	);
	suggestions = $derived(suggestForSlot(this.root, this.selectedPath, this.model));
	/** Element fields in scope at the selected slot (inside map bodies). */
	scopeFields = $derived(
		this.selectedPath === null
			? []
			: scopeAt(this.root, this.selectedPath, this.model, this.library)
	);
	/** Library entries for the current model, seen through their effective version. */
	modelLibrary = $derived(
		this.library
			.map((def) => this.libraryEntry(def))
			.filter((entry) => entry.version.modelId === this.modelId)
	);
	/** Library calcs that reference the one being edited. */
	referencedIn = $derived(this.loadedId === null ? [] : referencesTo(this.loadedId, this.library));
	/** Entries for the other models; loading one switches the model. */
	otherLibrary = $derived(
		this.library
			.map((def) => this.libraryEntry(def))
			.filter((entry) => entry.version.modelId !== this.modelId)
	);

	private libraryEntry(def: CalcDef) {
		const version = effectiveVersion(def);
		return {
			def,
			version,
			produces: resultTypeOf(version.root, MODEL_BY_ID[version.modelId], [], this.library),
			draftPending: latestVersion(def).version !== version.version
		};
	}

	canFill(produces: ValueType): boolean {
		return this.selectedExpected !== null && accepts(this.selectedExpected, produces);
	}

	/** Empty slots and leaves are selectable; filling a selected leaf replaces it. */
	select(path: NodePath) {
		const node = getAt(this.root, path);
		if (node !== null && node.kind !== 'field' && node.kind !== 'literal' && node.kind !== 'calc')
			return;
		this.selectedPath = path;
	}

	/** A direct slot click: select it and pop the in-place fill menu. */
	openMenu(path: NodePath) {
		this.select(path);
		this.menuOpen = this.selectedKey === pathKey(path);
	}

	closeMenu() {
		this.menuOpen = false;
	}

	/** Set the node into the selected slot, then advance to the next empty slot. */
	private fill(node: CalcNode) {
		if (this.selectedPath === null) return;
		this.root = setAt(this.root, this.selectedPath, node);
		this.selectedPath = firstEmptyPath(this.root);
		this.menuOpen = false;
	}

	fillOperator(id: OperatorId) {
		if (!this.canFill(OPERATOR_BY_ID[id].result)) return;
		this.fill(newOpNode(id));
	}

	/** A switch adopts its branch type, so any selected slot can take one. */
	fillSwitch() {
		if (this.selectedPath === null) return;
		this.fill(newSwitchNode());
	}

	fillMap() {
		if (!this.canFill('number[]')) return;
		this.fill(newMapNode());
	}

	fillField(fieldId: string) {
		const field =
			this.scopeFields.find((entry) => entry.id === fieldId) ??
			this.model.fields.find((entry) => entry.id === fieldId);
		if (!field || !this.canFill(field.type)) return;
		this.fill({ kind: 'field', field: fieldId });
	}

	fillCalc(calcId: string) {
		const entry = this.modelLibrary.find(({ def }) => def.id === calcId);
		if (!entry || entry.produces === null || !this.canFill(entry.produces)) return;
		this.fill({ kind: 'calc', calcId });
	}

	fillLiteral(literal: Literal) {
		if (!this.canFill(literal.type)) return;
		this.fill(literal);
	}

	/** Swap an op in place, keeping its inputs; gated on compatibility. */
	changeOperator(path: NodePath, op: OperatorId) {
		const node = getAt(this.root, path);
		if (!node || node.kind !== 'op' || node.op === op) return;
		if (!compatibleOperators(this.root, path, this.model, this.library).includes(op)) return;
		this.root = setAt(this.root, path, { kind: 'op', op, inputs: node.inputs });
	}

	remove(path: NodePath) {
		const node = getAt(this.root, path);
		const hasFilledChildren = node !== null && childSlots(node).some(({ child }) => child !== null);
		if (hasFilledChildren && !confirm('Remove this whole branch?')) return;
		this.root = setAt(this.root, path, null);
		this.selectedPath = path;
	}

	/** Adding a case is meant to be filled: open the menu on its match slot. */
	addSwitchCase(path: NodePath) {
		const before = this.root;
		this.root = addCase(this.root, path);
		if (this.root === before) return;
		const node = getAt(this.root, path);
		if (!node || node.kind !== 'switch') return;
		this.selectedPath = [...path, { part: 'case-when', index: node.cases.length - 1 }];
		this.menuOpen = true;
	}

	removeSwitchCase(path: NodePath, index: number) {
		this.root = removeCase(this.root, path, index);
		this.selectedPath = firstEmptyPath(this.root);
	}

	/** Adding an input is meant to be filled: open the menu on the new slot. */
	addInput(path: NodePath) {
		const before = this.root;
		this.root = addVariadicInput(this.root, path);
		if (this.root === before) return;
		const node = getAt(this.root, path);
		if (!node || node.kind !== 'op') return;
		this.selectedPath = [...path, { part: 'input', index: node.inputs.length - 1 }];
		this.menuOpen = true;
	}

	removeInput(path: NodePath, index: number) {
		this.root = removeVariadicInput(this.root, path, index);
		this.selectedPath = firstEmptyPath(this.root);
	}

	/** Keep the tree on a model switch; stale fields surface as issues. */
	setModel(id: DataModelId) {
		this.modelId = id;
	}

	/** Replace the tree from a parsed DSL expression (a deliberate text edit). */
	applyDsl(root: CalcNode | null) {
		this.root = root;
		this.selectedPath = firstEmptyPath(root);
	}

	/** Load a stored calculation's newest version; only unsaved work asks. */
	loadCalc(id: string) {
		this.loadVersion(id, null);
	}

	/** Load one specific version (null = latest) into the editor. */
	loadVersion(id: string, versionNumber: number | null) {
		const def = this.library.find((entry) => entry.id === id);
		if (!def) return;
		const version =
			versionNumber === null
				? latestVersion(def)
				: (def.versions.find((entry) => entry.version === versionNumber) ?? null);
		if (version === null) return;
		if (this.dirty && !confirm('Replace your unsaved changes with this calculation?')) return;
		this.modelId = version.modelId;
		this.root = version.root;
		this.baseline = version.root;
		this.selectedPath = firstEmptyPath(this.root);
		this.calcName = version.label;
		this.loadedId = def.id;
	}

	/**
	 * Append the current complete tree as a new draft version of the loaded
	 * calc (or of a brand new one). Saving identical content is a no-op, so
	 * repeated saves cannot pile up duplicate versions.
	 */
	saveToLibrary() {
		if (this.root === null || !this.checkResult.complete) return;
		const label = this.calcName.trim() || 'Untitled calc';
		const existing = this.loadedCalc;
		if (existing) {
			const latest = latestVersion(existing);
			const unchanged =
				nodesEqual(latest.root, this.root) &&
				latest.label === label &&
				latest.modelId === this.modelId;
			if (!unchanged) {
				const draft = {
					version: latest.version + 1,
					status: 'draft' as const,
					savedAt: Date.now(),
					label,
					modelId: this.modelId,
					root: this.root
				};
				this.library = this.library.map((def) =>
					def.id === existing.id ? { ...def, versions: [...def.versions, draft] } : def
				);
			}
		} else {
			const id = uniqueCalcId(label, new Set(this.library.map((def) => def.id)));
			this.library = [
				...this.library,
				{
					id,
					description: 'saved from the editor',
					versions: [
						{
							version: 1,
							status: 'draft',
							savedAt: Date.now(),
							label,
							modelId: this.modelId,
							root: this.root
						}
					]
				}
			];
			this.loadedId = id;
		}
		this.calcName = label;
		this.baseline = this.root;
		this.persistLibrary();
		// Flush the debounced autosave so a quick reload keeps the tree too.
		this.persistWorking();
	}

	/** Promote a draft version; references resolve to the latest published. */
	publishVersion(id: string, versionNumber: number) {
		this.library = this.library.map((def) =>
			def.id === id
				? {
						...def,
						versions: def.versions.map((entry) =>
							entry.version === versionNumber && entry.status === 'draft'
								? { ...entry, status: 'published' as const, publishedAt: Date.now() }
								: entry
						)
					}
				: def
		);
		this.persistLibrary();
	}

	/** Remove a calculation; seeded entries come back via resetAll. */
	deleteCalc(id: string) {
		const def = this.library.find((entry) => entry.id === id);
		if (!def) return;
		if (!confirm(`Delete "${effectiveVersion(def).label}" from the library?`)) return;
		this.library = this.library.filter((entry) => entry.id !== id);
		if (this.loadedId === id) this.loadedId = null;
		this.persistLibrary();
	}

	/** Discard local edits, restoring the last loaded or saved tree. */
	revert() {
		this.root = this.baseline;
		this.selectedPath = firstEmptyPath(this.root);
		this.menuOpen = false;
	}

	/** Empty the tree but keep working on the same calculation. */
	clearAll() {
		if (this.dirty && !confirm('Clear your unsaved changes?')) return;
		this.root = null;
		this.baseline = null;
		this.selectedPath = [];
	}

	/** Start a fresh, unsaved calculation. */
	newCalc() {
		if (this.dirty && !confirm('Start a new calculation? Your unsaved changes will be lost.'))
			return;
		this.root = null;
		this.baseline = null;
		this.selectedPath = [];
		this.calcName = '';
		this.loadedId = null;
	}

	/** Wipe all local data and re-seed the library, back to factory state. */
	resetAll() {
		if (
			!confirm(
				'Reset everything? All saved calculations and edits will be replaced by the original seed data.'
			)
		)
			return;
		this.library = LIBRARY;
		this.root = null;
		this.baseline = null;
		this.selectedPath = [];
		this.menuOpen = false;
		this.calcName = '';
		this.loadedId = null;
		this.modelId = 'trading-position';
		this.persistLibrary();
		this.persistWorking();
	}

	/* ── Drag and drop ─────────────────────────────────────────────── */

	startPaletteDrag(node: CalcNode) {
		this.drag = { node, from: null, produces: this.producesOf(node) };
	}

	startTreeDrag(path: NodePath) {
		const node = getAt(this.root, path);
		if (node === null) return;
		this.drag = { node, from: path, produces: this.producesOf(node) };
	}

	endDrag() {
		this.drag = null;
		this.dragOverKey = null;
	}

	private producesOf(node: CalcNode): ValueType | null {
		return resultTypeOf(node, this.model, [], this.library);
	}

	/**
	 * A drop may fill an empty slot or replace a whole subtree. Dropping a
	 * node onto its own ancestor collapses the tree around it; dropping a
	 * node inside its own subtree is rejected.
	 */
	canDropAt(path: NodePath): boolean {
		if (this.drag === null) return false;
		const from = this.drag.from;
		if (from !== null && (pathKey(from) === pathKey(path) || pathInside(path, from))) return false;
		const expected = expectedTypeAt(this.root, path, this.model, this.library);
		if (expected === null) return false;
		return this.drag.produces === null || accepts(expected, this.drag.produces);
	}

	dropAt(path: NodePath) {
		const drag = this.drag;
		if (drag === null || !this.canDropAt(path)) return;
		this.root = setAt(this.root, path, drag.node);
		// A move from elsewhere empties its origin; a move from inside the
		// replaced subtree is already gone with it.
		if (drag.from !== null && !pathInside(drag.from, path)) {
			this.root = setAt(this.root, drag.from, null);
		}
		this.selectedPath = firstEmptyPath(this.root);
		this.menuOpen = false;
		this.endDrag();
	}

	canDropOnNewInput(path: NodePath): boolean {
		if (this.drag === null) return false;
		const node = getAt(this.root, path);
		if (node === null || node.kind !== 'op') return false;
		const def = OPERATOR_BY_ID[node.op];
		if (def.arity.kind !== 'variadic') return false;
		const from = this.drag.from;
		if (from !== null && (pathKey(from) === pathKey(path) || pathInside(path, from))) return false;
		return this.drag.produces === null || accepts(def.arity.param, this.drag.produces);
	}

	/** Drop onto "+ input": append a fresh input and place the payload there. */
	dropOnNewInput(path: NodePath) {
		const drag = this.drag;
		if (drag === null || !this.canDropOnNewInput(path)) return;
		this.root = addVariadicInput(this.root, path);
		const node = getAt(this.root, path);
		if (node === null || node.kind !== 'op') return;
		this.root = setAt(
			this.root,
			[...path, { part: 'input', index: node.inputs.length - 1 }],
			drag.node
		);
		if (drag.from !== null) this.root = setAt(this.root, drag.from, null);
		this.selectedPath = firstEmptyPath(this.root);
		this.menuOpen = false;
		this.endDrag();
	}

	private persistLibrary() {
		if (!browser) return;
		writeJson(localStorage, LIBRARY_KEY, this.library);
	}

	persistWorking() {
		if (!browser) return;
		writeJson(localStorage, CURRENT_KEY, this.workingState);
	}

	onKeyDown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (e.key === 'Escape') {
			if (this.menuOpen) this.menuOpen = false;
			else this.selectedPath = null;
		}
	}

	/** Any pointer press outside a slot or the popover dismisses the popover. */
	onPointerDownCapture(e: PointerEvent) {
		if (!this.menuOpen) return;
		const target = e.target as Element | null;
		if (target?.closest('[data-slot-menu], .slot, .leaf-btn')) return;
		this.menuOpen = false;
	}
}
