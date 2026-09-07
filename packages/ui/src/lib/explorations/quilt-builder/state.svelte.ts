/*
 * All editor state and behavior for the quilt builder. Pure logic lives in
 * the sibling modules; this class wires it to Svelte runes and the gesture
 * lifecycle. One `gesture` discriminated union makes concurrent pointer
 * modes unrepresentable, and every board mutation funnels through
 * `commitUpdates`/`replaceBoard`, so budget checks and undo grouping cannot
 * be bypassed by any editing path.
 */

import { browser } from '$app/environment';
import { COLS, FABRICS, ROWS } from './data';
import { LAYOUTS, slotAt, type LayoutId, type Point } from './geometry';
import {
	applyUpdates,
	boardsEqual,
	cellIndex,
	cloneBoard,
	cloneCell,
	colOf,
	emptyBoard,
	emptyCell,
	groupDelta,
	isEmpty,
	remainingOf,
	rowOf,
	usageOf,
	withinBudget,
	type Board,
	type Cell
} from './model';
import { buildPlacement, keyboardPoint } from './placement';
import { mirrorTargets, withMirrors, type Symmetry } from './mirror';
import { emptyHistory, record, redo as redoHistory, undo as undoHistory } from './history';
import {
	CURRENT_KEY,
	PATTERNS_KEY,
	parseWorkingState,
	readJson,
	sanitizeCells,
	sanitizePatterns,
	writeJson,
	type PatternMap,
	type SavedPattern
} from './persistence';
import { cuttingListFor, thumbPolys, type CutGroup, type ThumbPoly } from './cutting';

export type Tool = 'select' | 'place' | 'erase';

export interface Hover {
	index: number;
	point: Point;
}

interface PaintGesture {
	kind: 'paint';
	pointerId: number;
	mode: 'place' | 'erase';
}

interface SlotDragGesture {
	kind: 'slot-drag';
	pointerId: number;
	fabricId: string;
	/** Null when dragging a fresh piece from a palette swatch. */
	from: { index: number; slot: number } | null;
	x: number;
	y: number;
	active: boolean;
	copy: boolean;
}

interface GroupDragGesture {
	kind: 'group-drag';
	pointerId: number;
	fabricId: string;
	from: number;
	x: number;
	y: number;
	active: boolean;
	copy: boolean;
}

interface MarqueeGesture {
	kind: 'marquee';
	pointerId: number;
	x0: number;
	y0: number;
	x: number;
	y: number;
	toggleIndex: number;
	base: number[];
	/** Cell rects captured once at gesture start. */
	rects: { index: number; rect: DOMRect }[];
	active: boolean;
}

interface AxisGesture {
	kind: 'axis';
	pointerId: number;
	axis: 'v' | 'h';
}

export type Gesture =
	PaintGesture | SlotDragGesture | GroupDragGesture | MarqueeGesture | AxisGesture;

export interface Clipboard {
	w: number;
	h: number;
	items: { dr: number; dc: number; cell: Cell }[];
}

export interface PatternCard extends SavedPattern {
	polys: ThumbPoly[];
	spec: CutGroup[];
}

const DRAG_THRESHOLD = 5;

export class QuiltStore {
	cells = $state<Board>(emptyBoard());
	tool = $state<Tool>('place');
	fabric = $state<string>(FABRICS[0].id);
	piece = $state<LayoutId>('whole');
	rotation = $state(0);
	selection = $state<number[]>([]);
	/** Last cell acted on: base for arrow-key navigation and group drags. */
	anchor = $state<number | null>(null);
	hover = $state<Hover | null>(null);
	gesture = $state<Gesture | null>(null);
	clipboard = $state<Clipboard | null>(null);

	symV = $state(false);
	symH = $state(false);
	axisV = $state(COLS);
	axisH = $state(ROWS);

	patterns = $state<PatternMap>({});
	patternName = $state('');
	/** Id of the loaded pattern; null while working on something unsaved. */
	currentId = $state<string | null>(null);
	patternFilter = $state('');

	blanketEl: HTMLElement | null = null;

	/** What escape deselected, so enter can bring it back. */
	private lastSelection: number[] = [];
	private lastAnchor: number | null = null;

	private history = $state(emptyHistory());
	/** Pre-gesture board, recorded into history on the first real change. */
	private gestureBase: Board | null = null;
	private gestureRecorded = false;

	constructor() {
		if (!browser) return;
		const initial = sanitizePatterns(readJson(localStorage, PATTERNS_KEY));
		this.patterns = initial;
		// Persist migrated ids immediately so they stay stable across reloads.
		writeJson(localStorage, PATTERNS_KEY, initial);
		const working = parseWorkingState(
			readJson(localStorage, CURRENT_KEY),
			new Set(Object.keys(initial))
		);
		if (working.cells) this.cells = working.cells;
		if (working.currentId) this.currentId = working.currentId;
		if (working.name !== null) this.patternName = working.name;
	}

	// ── Derived state ────────────────────────────────────────────────

	used = $derived(usageOf(this.cells));
	remaining = $derived(remainingOf(this.used));
	filled = $derived(this.cells.filter((cell) => !isEmpty(cell)).length);
	selectedKind = $derived(LAYOUTS[this.piece].kind);
	selectedSet = $derived(new Set(this.selection));
	canUndo = $derived(this.history.past.length > 0);
	canRedo = $derived(this.history.future.length > 0);

	private symmetry = $derived<Symmetry>({
		v: this.symV,
		h: this.symH,
		axisV: this.axisV,
		axisH: this.axisH
	});

	/*
	 * The hovered cell renders as the exact state a click would produce,
	 * mirrors included: a placement whose mirrors would overdraw the pile
	 * previews as blocked instead of lying and then doing nothing.
	 */
	placePreview = $derived.by(() => {
		if (this.tool !== 'place' || this.gesture || !this.hover) return null;
		const { index, point } = this.hover;
		const built = buildPlacement(
			this.cells,
			index,
			point,
			{ layout: this.piece, rotation: this.rotation },
			this.fabric
		);
		if (built.blocked) {
			return { index, ...built, mirrors: new Map<number, Cell>() };
		}
		const mirrors = mirrorTargets(index, built.cell, this.symmetry);
		const dry = applyUpdates(this.cells, new Map([[index, built.cell], ...mirrors]));
		if (!dry.ok && dry.reason === 'over-budget') {
			return {
				index,
				cell: this.cells[index],
				slot: built.slot,
				blocked: true,
				mirrors: new Map<number, Cell>()
			};
		}
		return { index, ...built, mirrors };
	});

	erasePreview = $derived.by(() => {
		if (this.tool !== 'erase' || this.gesture || !this.hover) return null;
		const cell = this.cells[this.hover.index];
		const slot = slotAt(cell.layout, cell.rotation, this.hover.point);
		return cell.slots[slot] === null ? null : { index: this.hover.index, slot };
	});

	/** During a group drag, the exact cells the drop would produce, keyed by target index. */
	groupPreview = $derived.by(() => {
		const g = this.gesture;
		if (g?.kind !== 'group-drag' || !g.active || !this.hover) return null;
		const sel = this.selection.filter((i) => !isEmpty(this.cells[i]));
		if (!sel.length) return null;
		const [dr, dc] = groupDelta(sel, g.from, this.hover.index);
		if (!dr && !dc) return null;
		return new Map(sel.map((s) => [cellIndex(rowOf(s) + dr, colOf(s) + dc), this.cells[s]]));
	});

	/** Thumbnails and cutting specs recompute only when patterns change. */
	patternCards = $derived<PatternCard[]>(
		Object.values(this.patterns)
			.sort((a, b) => b.savedAt - a.savedAt)
			.map((pattern) => ({
				...pattern,
				polys: thumbPolys(pattern.cells),
				spec: cuttingListFor(pattern.cells)
			}))
	);

	filteredPatterns = $derived(
		this.patternCards.filter((card) =>
			card.name.toLowerCase().includes(this.patternFilter.trim().toLowerCase())
		)
	);

	workingState = $derived({
		cells: this.cells,
		currentId: this.currentId,
		name: this.patternName
	});

	// ── Mutation gate ────────────────────────────────────────────────

	/** One-shot edit: its own undo step. */
	private commitAction(updates: ReadonlyMap<number, Cell>): boolean {
		const result = applyUpdates(this.cells, updates);
		if (!result.ok) return false;
		this.history = record(this.history, this.cells);
		this.cells = result.board;
		return true;
	}

	/** Edit within the active gesture: shares the gesture's undo step. */
	private commitGestureEdit(updates: ReadonlyMap<number, Cell>): boolean {
		const result = applyUpdates(this.cells, updates);
		if (!result.ok) return false;
		if (!this.gestureRecorded && this.gestureBase) {
			this.history = record(this.history, this.gestureBase);
			this.gestureRecorded = true;
		}
		this.cells = result.board;
		return true;
	}

	/** Whole-board replacement (clear/load); loads skip the budget gate. */
	private replaceBoard(
		next: Board,
		{ checkBudget = true }: { checkBudget?: boolean } = {}
	): boolean {
		if (boardsEqual(next, this.cells)) return false;
		if (checkBudget && !withinBudget(next)) return false;
		this.history = record(this.history, this.cells);
		this.cells = cloneBoard(next);
		return true;
	}

	private beginGesture(gesture: Gesture) {
		this.gesture = gesture;
		this.gestureBase = cloneBoard(this.cells);
		this.gestureRecorded = false;
	}

	private endGesture() {
		this.gesture = null;
		this.gestureBase = null;
		this.gestureRecorded = false;
	}

	/** Escape: a cancelled paint stroke reverts entirely. */
	cancelGesture() {
		if (this.gesture?.kind === 'paint' && this.gestureRecorded && this.gestureBase) {
			this.cells = cloneBoard(this.gestureBase);
			this.history = { past: this.history.past.slice(0, -1), future: this.history.future };
		}
		if (this.gesture?.kind === 'marquee') this.selection = this.gesture.base;
		this.endGesture();
	}

	undo() {
		if (this.gesture) return;
		const restored = undoHistory(this.history, this.cells);
		if (!restored) return;
		this.history = restored.history;
		this.cells = restored.board;
	}

	redo() {
		if (this.gesture) return;
		const restored = redoHistory(this.history, this.cells);
		if (!restored) return;
		this.history = restored.history;
		this.cells = restored.board;
	}

	// ── Editing primitives ───────────────────────────────────────────

	private placeAt(index: number, point: Point, fabricId: string, inGesture: boolean): boolean {
		const built = buildPlacement(
			this.cells,
			index,
			point,
			{ layout: this.piece, rotation: this.rotation },
			fabricId
		);
		if (built.blocked) return false;
		const updates = withMirrors(index, built.cell, this.symmetry);
		return inGesture ? this.commitGestureEdit(updates) : this.commitAction(updates);
	}

	private eraseAt(index: number, point: Point): boolean {
		const cell = this.cells[index];
		const slot = slotAt(cell.layout, cell.rotation, point);
		if (cell.slots[slot] === null) return false;
		const slots = cell.slots.map((id, i) => (i === slot ? null : id));
		const next = slots.every((id) => id === null) ? emptyCell() : { ...cell, slots };
		return this.commitGestureEdit(withMirrors(index, next, this.symmetry));
	}

	rotateCells(indices: readonly number[]) {
		if (this.gesture) return;
		const targets = indices.filter((i) => !isEmpty(this.cells[i]));
		if (!targets.length) return;
		this.commitAction(
			new Map(
				targets.map((i) => [i, { ...this.cells[i], rotation: (this.cells[i].rotation + 1) % 4 }])
			)
		);
	}

	deleteCells(indices: readonly number[]) {
		const targets = indices.filter((i) => !isEmpty(this.cells[i]));
		if (!targets.length) return;
		if (this.commitAction(new Map(targets.map((i) => [i, emptyCell()])))) {
			this.selection = [];
		}
	}

	clearAll() {
		if (this.replaceBoard(emptyBoard())) this.selection = [];
	}

	rotate() {
		if (this.tool === 'place') this.rotation = (this.rotation + 1) % 4;
		else if (this.selection.length) this.rotateCells(this.selection);
	}

	/** Move or duplicate the whole selection by the drag offset. */
	private dropGroup(srcIndex: number, destIndex: number, copy: boolean) {
		const sel = this.selection.filter((i) => !isEmpty(this.cells[i]));
		if (!sel.length) return;
		const [dr, dc] = groupDelta(sel, srcIndex, destIndex);
		if (!dr && !dc) return;
		const moved = sel.map((s) => cellIndex(rowOf(s) + dr, colOf(s) + dc));
		const updates = new Map<number, Cell>([
			...(copy ? [] : sel.filter((s) => !moved.includes(s)).map((s) => [s, emptyCell()] as const)),
			...sel.map((s, i) => [moved[i], this.cells[s]] as const)
		]);
		if (!this.commitAction(updates)) return;
		this.selection = moved;
		this.anchor =
			this.anchor !== null && sel.includes(this.anchor)
				? cellIndex(rowOf(this.anchor) + dr, colOf(this.anchor) + dc)
				: moved[0];
	}

	// ── Clipboard ────────────────────────────────────────────────────

	copySelection() {
		const sel = this.selection.filter((i) => !isEmpty(this.cells[i]));
		if (!sel.length) return;
		const minRow = Math.min(...sel.map(rowOf));
		const minCol = Math.min(...sel.map(colOf));
		this.clipboard = {
			w: Math.max(...sel.map(colOf)) - minCol + 1,
			h: Math.max(...sel.map(rowOf)) - minRow + 1,
			items: sel.map((i) => ({
				dr: rowOf(i) - minRow,
				dc: colOf(i) - minCol,
				cell: cloneCell(this.cells[i])
			}))
		};
	}

	pasteClipboard() {
		if (!this.clipboard || this.gesture) return;
		const { w, h, items } = this.clipboard;
		const base = this.hover
			? [rowOf(this.hover.index), colOf(this.hover.index)]
			: this.anchor !== null
				? [rowOf(this.anchor), colOf(this.anchor) + w]
				: [0, 0];
		const baseRow = Math.min(ROWS - h, Math.max(0, base[0]));
		const baseCol = Math.min(COLS - w, Math.max(0, base[1]));
		const placed = items.map((item) => cellIndex(baseRow + item.dr, baseCol + item.dc));
		const updates = new Map(items.map((item, i) => [placed[i], item.cell]));
		if (!this.commitAction(updates)) return;
		this.selection = placed;
		this.anchor = placed[0];
		this.tool = 'select';
	}

	// ── Pointer handlers ─────────────────────────────────────────────

	/** Resolve a screen point to a cell and its local 0..1 coordinates. */
	private resolve(x: number, y: number): Hover | null {
		const el = document.elementFromPoint(x, y)?.closest('[data-cell-index]');
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return {
			index: Number((el as HTMLElement).dataset.cellIndex),
			point: [(x - rect.left) / rect.width, (y - rect.top) / rect.height]
		};
	}

	startSwatchDrag(e: PointerEvent, fabricId: string) {
		if (e.button !== 0 || this.gesture) return;
		this.gesture = {
			kind: 'slot-drag',
			pointerId: e.pointerId,
			fabricId,
			from: null,
			x: e.clientX,
			y: e.clientY,
			active: false,
			copy: e.altKey
		};
	}

	startAxisDrag(e: PointerEvent, axis: 'v' | 'h') {
		if (e.button !== 0 || this.gesture) return;
		this.gesture = { kind: 'axis', pointerId: e.pointerId, axis };
	}

	onCellPointerDown(e: PointerEvent, index: number) {
		if (e.button !== 0 || this.gesture) return;
		const hit = this.resolve(e.clientX, e.clientY);
		if (!hit) return;

		if (this.tool === 'place' || this.tool === 'erase') {
			const mode = this.tool;
			this.beginGesture({ kind: 'paint', pointerId: e.pointerId, mode });
			if (mode === 'erase') this.eraseAt(index, hit.point);
			else this.placeAt(index, hit.point, this.fabric, true);
			return;
		}

		const cell = this.cells[index];
		const slot = slotAt(cell.layout, cell.rotation, hit.point);
		const existing = cell.slots[slot];

		if (e.shiftKey) {
			// Becomes a rubber-band drag if the pointer moves; else toggles on release.
			this.gesture = {
				kind: 'marquee',
				pointerId: e.pointerId,
				x0: e.clientX,
				y0: e.clientY,
				x: e.clientX,
				y: e.clientY,
				toggleIndex: index,
				base: [...this.selection],
				rects: this.captureCellRects(),
				active: false
			};
			this.anchor = index;
			return;
		}
		if (!existing) {
			this.selection = [];
			this.anchor = null;
			return;
		}
		if (e.altKey || (this.selection.length > 1 && this.selection.includes(index))) {
			// Dragging any member of a multi-selection carries the group;
			// alt-drag always carries whole cells so a pieced square
			// duplicates completely.
			if (!this.selection.includes(index)) this.selection = [index];
			this.anchor = index;
			this.gesture = {
				kind: 'group-drag',
				pointerId: e.pointerId,
				fabricId: cell.slots.find((s) => s !== null) ?? existing,
				from: index,
				x: e.clientX,
				y: e.clientY,
				active: false,
				copy: e.altKey
			};
			return;
		}
		this.selection = [index];
		this.anchor = index;
		this.gesture = {
			kind: 'slot-drag',
			pointerId: e.pointerId,
			fabricId: existing,
			from: { index, slot },
			x: e.clientX,
			y: e.clientY,
			active: false,
			copy: e.altKey
		};
	}

	private captureCellRects(): { index: number; rect: DOMRect }[] {
		return Array.from(document.querySelectorAll<HTMLElement>('[data-cell-index]'), (el) => ({
			index: Number(el.dataset.cellIndex),
			rect: el.getBoundingClientRect()
		}));
	}

	onPointerMove(e: PointerEvent) {
		const g = this.gesture;
		if (g && g.pointerId !== e.pointerId) return;

		if (g?.kind === 'axis') {
			const rect = this.blanketEl?.getBoundingClientRect();
			if (!rect) return;
			if (g.axis === 'v') {
				this.axisV = Math.min(
					2 * COLS - 1,
					Math.max(1, Math.round(((e.clientX - rect.left) / rect.width) * 2 * COLS))
				);
			} else {
				this.axisH = Math.min(
					2 * ROWS - 1,
					Math.max(1, Math.round(((e.clientY - rect.top) / rect.height) * 2 * ROWS))
				);
			}
			return;
		}

		if (g?.kind === 'marquee') {
			if (!g.active && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < DRAG_THRESHOLD) return;
			const next = { ...g, x: e.clientX, y: e.clientY, active: true };
			this.gesture = next;
			const [left, right] = [Math.min(next.x0, next.x), Math.max(next.x0, next.x)];
			const [top, bottom] = [Math.min(next.y0, next.y), Math.max(next.y0, next.y)];
			const hits = next.rects
				.filter(
					({ rect }) =>
						rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top
				)
				.map(({ index }) => index)
				.filter((index) => !isEmpty(this.cells[index]));
			this.selection = [...new Set([...next.base, ...hits])];
			return;
		}

		const hit = this.resolve(e.clientX, e.clientY);
		this.hover = hit;

		if (g?.kind === 'paint') {
			if (!hit) return;
			if (g.mode === 'erase') this.eraseAt(hit.index, hit.point);
			else this.placeAt(hit.index, hit.point, this.fabric, true);
			return;
		}

		if (g?.kind === 'slot-drag' || g?.kind === 'group-drag') {
			if (!g.active && Math.hypot(e.clientX - g.x, e.clientY - g.y) < DRAG_THRESHOLD) return;
			this.gesture = { ...g, x: e.clientX, y: e.clientY, active: true, copy: e.altKey };
		}
	}

	onPointerUp(e: PointerEvent) {
		const g = this.gesture;
		if (!g || g.pointerId !== e.pointerId) return;

		if (g.kind === 'axis' || g.kind === 'paint') {
			this.endGesture();
			return;
		}

		if (g.kind === 'marquee') {
			this.endGesture();
			if (!g.active) {
				this.selection = this.selection.includes(g.toggleIndex)
					? this.selection.filter((i) => i !== g.toggleIndex)
					: [...this.selection, g.toggleIndex];
				this.anchor = g.toggleIndex;
			}
			return;
		}

		const copy = g.copy || e.altKey;
		const hit = this.resolve(e.clientX, e.clientY);
		this.endGesture();

		if (!g.active) {
			// A plain click on a multi-selected square collapses the selection to it.
			if (g.kind === 'group-drag') {
				this.selection = [g.from];
				this.anchor = g.from;
			}
			return;
		}

		if (g.kind === 'group-drag') {
			if (!hit) {
				// Group dragged off the blanket: remove it (a copy just cancels).
				if (!copy) this.deleteCells(this.selection);
			} else {
				this.dropGroup(g.from, hit.index, copy);
			}
			return;
		}

		if (!hit) {
			// Dragged off the blanket: take the piece back out of the layout.
			if (g.from && !copy) {
				const cell = this.cells[g.from.index];
				const slots = cell.slots.map((id, i) => (i === g.from!.slot ? null : id));
				this.commitAction(
					new Map([
						[g.from.index, slots.every((id) => id === null) ? emptyCell() : { ...cell, slots }]
					])
				);
			}
			return;
		}

		if (!g.from) {
			this.beginGesture({ kind: 'paint', pointerId: e.pointerId, mode: 'place' });
			this.placeAt(hit.index, hit.point, g.fabricId, true);
			this.endGesture();
			return;
		}

		const dest = this.cells[hit.index];
		const destSlot = slotAt(dest.layout, dest.rotation, hit.point);
		if (g.from.index === hit.index && g.from.slot === destSlot) return;

		const destSlots = dest.slots.map((id, i) => (i === destSlot ? g.fabricId : id));
		if (copy) {
			// Alt-drop: duplicate the piece into the target slot, source untouched.
			if (this.commitAction(new Map([[hit.index, { ...dest, slots: destSlots }]]))) {
				this.selection = [hit.index];
				this.anchor = hit.index;
			}
			return;
		}

		// Moving a piece: swap with whatever it lands on. The budget gate in
		// commitAction rejects swaps between slot kinds that would overdraw.
		const displaced = dest.slots[destSlot];
		const source = this.cells[g.from.index];
		const sameCell = g.from.index === hit.index;
		const sourceSlots = (sameCell ? destSlots : [...source.slots]).map((id, i) =>
			i === g.from!.slot ? displaced : sameCell && i === destSlot ? g.fabricId : id
		);
		const updates = new Map<number, Cell>(
			sameCell
				? [[hit.index, { ...dest, slots: sourceSlots }]]
				: [
						[hit.index, { ...dest, slots: destSlots }],
						[
							g.from.index,
							sourceSlots.every((id) => id === null)
								? emptyCell()
								: { ...source, slots: sourceSlots }
						]
					]
		);
		if (this.commitAction(updates)) {
			this.selection = [hit.index];
			this.anchor = hit.index;
		}
	}

	// ── Keyboard ─────────────────────────────────────────────────────

	/** Enter/Space on a focused cell: the keyboard version of a click. */
	activateCell(index: number) {
		if (this.gesture) return;
		if (this.tool === 'place') {
			this.placeAt(
				index,
				keyboardPoint({ layout: this.piece, rotation: this.rotation }),
				this.fabric,
				false
			);
			return;
		}
		if (this.tool === 'erase') {
			const cell = this.cells[index];
			const filledSlot = cell.slots.findIndex((id) => id !== null);
			if (filledSlot === -1) return;
			this.beginGesture({ kind: 'paint', pointerId: -1, mode: 'erase' });
			const slots = cell.slots.map((id, i) => (i === filledSlot ? null : id));
			this.commitGestureEdit(
				withMirrors(
					index,
					slots.every((id) => id === null) ? emptyCell() : { ...cell, slots },
					this.symmetry
				)
			);
			this.endGesture();
			return;
		}
		if (isEmpty(this.cells[index])) {
			this.selection = [];
			this.anchor = null;
		} else {
			this.selection = this.selectedSet.has(index)
				? this.selection.filter((i) => i !== index)
				: [...this.selection, index];
			this.anchor = index;
		}
	}

	nudgeAxis(axis: 'v' | 'h', delta: number) {
		if (axis === 'v') this.axisV = Math.min(2 * COLS - 1, Math.max(1, this.axisV + delta));
		else this.axisH = Math.min(2 * ROWS - 1, Math.max(1, this.axisH + delta));
	}

	onKeyDown(e: KeyboardEvent) {
		// Typing in inputs must not trigger shortcuts.
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (e.key === 'Escape') {
			if (this.gesture) {
				this.cancelGesture();
				return;
			}
			if (this.selection.length) {
				this.lastSelection = this.selection;
				this.lastAnchor = this.anchor;
				this.selection = [];
				this.anchor = null;
				return;
			}
			this.tool = 'select';
			return;
		}
		// Everything below would corrupt an in-flight gesture.
		if (this.gesture) return;
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) this.redo();
			else this.undo();
			return;
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
			if (this.selection.length) {
				e.preventDefault();
				this.copySelection();
			}
			return;
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
			if (this.clipboard) {
				e.preventDefault();
				this.pasteClipboard();
			}
			return;
		}
		if (e.metaKey || e.ctrlKey) return;
		if (e.key === 'Enter') {
			// Enter on a focused button is that button's activation, not ours.
			if (e.target instanceof HTMLButtonElement) return;
			if (!this.selection.length && this.lastSelection.length) {
				const restored = this.lastSelection.filter((i) => !isEmpty(this.cells[i]));
				if (restored.length) {
					this.selection = restored;
					this.anchor =
						this.lastAnchor !== null && restored.includes(this.lastAnchor)
							? this.lastAnchor
							: restored[0];
					this.tool = 'select';
				}
			}
			return;
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			// With a selection, delete removes it; otherwise it picks up the eraser.
			if (this.tool === 'select' && this.selection.length) this.deleteCells(this.selection);
			else this.tool = 'erase';
			return;
		}
		if (e.key in ARROW_DELTAS && this.tool === 'select') {
			e.preventDefault();
			const [dr, dc] = ARROW_DELTAS[e.key];
			const next =
				this.anchor === null
					? 0
					: cellIndex(
							Math.min(ROWS - 1, Math.max(0, rowOf(this.anchor) + dr)),
							Math.min(COLS - 1, Math.max(0, colOf(this.anchor) + dc))
						);
			this.selection = e.shiftKey
				? this.selectedSet.has(next)
					? this.selection
					: [...this.selection, next]
				: [next];
			this.anchor = next;
			return;
		}
		if (e.key === 'r' || e.key === 'R') this.rotate();
		if (e.key === 'e' || e.key === 'E') this.tool = 'erase';
		if (e.key === 'v' || e.key === 'V') this.tool = 'select';
	}

	contextRotate(index: number) {
		this.rotateCells(
			this.selection.length > 1 && this.selectedSet.has(index) ? this.selection : [index]
		);
	}

	// ── Palette ──────────────────────────────────────────────────────

	pickPiece(layout: LayoutId, rotation: number | null) {
		this.piece = layout;
		if (rotation !== null) this.rotation = rotation;
		this.tool = 'place';
	}

	pickFabric(id: string) {
		this.fabric = id;
		this.tool = 'place';
	}

	// ── Patterns ─────────────────────────────────────────────────────

	private persistPatterns() {
		if (browser) writeJson(localStorage, PATTERNS_KEY, this.patterns);
	}

	savePattern() {
		const name = this.patternName.trim();
		if (!name) return;
		// Saving with a loaded pattern updates it in place; otherwise a
		// fresh id is minted.
		const id = this.currentId ?? crypto.randomUUID();
		this.patterns = {
			...this.patterns,
			[id]: { id, name, cells: cloneBoard(this.cells), savedAt: Date.now() }
		};
		this.currentId = id;
		this.persistPatterns();
	}

	loadPattern(id: string) {
		const pattern = this.patterns[id];
		if (!pattern || this.gesture) return;
		// A load is not budget-gated: saved data is what it is, even if the
		// scrap counts have since been edited down.
		this.replaceBoard(sanitizeCells(pattern.cells), { checkBudget: false });
		this.selection = [];
		this.anchor = null;
		this.currentId = id;
		this.patternName = pattern.name;
	}

	deletePattern(id: string) {
		const pattern = this.patterns[id];
		if (!pattern || !confirm(`Delete pattern "${pattern.name}"?`)) return;
		this.patterns = Object.fromEntries(Object.entries(this.patterns).filter(([key]) => key !== id));
		if (this.currentId === id) this.currentId = null;
		this.persistPatterns();
	}

	newPattern() {
		if (!this.replaceBoard(emptyBoard()) && this.filled > 0) return;
		this.selection = [];
		this.anchor = null;
		this.currentId = null;
		const names = new Set(Object.values(this.patterns).map((p) => p.name));
		const next = Array.from({ length: names.size + 1 }, (_, i) => `Pattern ${i + 1}`).find(
			(candidate) => !names.has(candidate)
		);
		this.patternName = next ?? `Pattern ${names.size + 1}`;
	}

	/** Title edits rename a loaded pattern immediately on blur or enter. */
	commitName() {
		const name = this.patternName.trim();
		if (!this.currentId || !name) return;
		const pattern = this.patterns[this.currentId];
		if (!pattern || pattern.name === name) return;
		this.patterns = { ...this.patterns, [this.currentId]: { ...pattern, name } };
		this.persistPatterns();
	}

	persistWorking() {
		if (browser) writeJson(localStorage, CURRENT_KEY, this.workingState);
	}
}

const ARROW_DELTAS: Record<string, [number, number]> = {
	ArrowUp: [-1, 0],
	ArrowDown: [1, 0],
	ArrowLeft: [0, -1],
	ArrowRight: [0, 1]
};
