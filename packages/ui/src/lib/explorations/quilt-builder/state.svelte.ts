/*
 * All editor state and behavior for the quilt builder. Pure logic lives in
 * the sibling modules; this class wires it to Svelte runes and the pointer
 * lifecycle. Every board mutation funnels through `commit`, so undo grouping
 * cannot be bypassed by any editing path.
 */

import { browser } from '$app/environment';
import {
	DEFAULT_BLOCK_SIZE,
	DEFAULT_SIZE_ID,
	QUILT_SIZE_BY_ID,
	STARTER_HEXES,
	isNamed,
	normalizeHex,
	type Material
} from './data';
import { BLOCK_TYPES, BLOCK_TYPE_BY_ID } from './blocks';
import { CUTS, type Point } from './geometry';
import {
	applyUpdates,
	boardsEqual,
	cloneBlock,
	cloneBoard,
	divisionOf,
	emptyBoard,
	isEmpty,
	mapLeaves,
	materialsInUse,
	recompose,
	resizeBoard,
	rotateBlock,
	withoutMaterial,
	type Block,
	type Board
} from './model';
import {
	buildErase,
	buildPlacement,
	firstFilledPoint,
	keyboardPoint,
	type Pending
} from './placement';
import { emptyHistory, record, redo as redoHistory, undo as undoHistory } from './history';
import {
	LEGACY_STATE_KEY,
	STATE_KEY,
	gridDims,
	parseSavedState,
	readJson,
	writeJson,
	type CustomBlock,
	type SavedState
} from './persistence';
import { cuttingListFor, materialsListText } from './cutting';

export type Tab = 'block' | 'piece';
export type Tool = 'place' | 'erase' | 'select';

/** Compositions offered in the toolbar: one piece, 2x2, or 4x4. */
export const DIVISIONS = [1, 2, 4] as const;

export interface Hover {
	index: number;
	point: Point;
}

interface PaintGesture {
	pointerId: number;
	mode: Tool;
}

const CUSTOM_PREFIX = 'custom:';

export class QuiltStore {
	name = $state('');
	sizeId = $state(DEFAULT_SIZE_ID);
	blockSize = $state(DEFAULT_BLOCK_SIZE);
	materials = $state<Material[]>([]);
	selectedMaterialId = $state<string | null>(null);
	customBlocks = $state<CustomBlock[]>([]);
	cells = $state<Board>(emptyBoard(gridDims(DEFAULT_SIZE_ID, DEFAULT_BLOCK_SIZE)));
	/** The block the composition control acts on. */
	selectedIndex = $state<number | null>(null);

	tab = $state<Tab>('block');
	pieceId = $state('square');
	/** A built-in layout id, or `custom:<id>` for a saved block. */
	blockId = $state(BLOCK_TYPES[0].id);
	rotation = $state(0);
	tool = $state<Tool>('place');
	/** "+ Add new" is waiting for a cell to be picked. */
	capturing = $state(false);

	hover = $state<Hover | null>(null);
	gesture = $state<PaintGesture | null>(null);

	private history = $state(emptyHistory());
	/** Pre-gesture board, recorded into history on the first real change. */
	private gestureBase: Board | null = null;
	private gestureRecorded = false;

	constructor() {
		if (!browser) return;
		const raw = readJson(localStorage, STATE_KEY) ?? readJson(localStorage, LEGACY_STATE_KEY);
		const saved = parseSavedState(raw);
		if (saved) this.restore(saved);
	}

	private restore(saved: SavedState) {
		this.name = saved.name;
		this.sizeId = saved.sizeId;
		this.blockSize = saved.blockSize;
		this.materials = saved.materials;
		this.selectedMaterialId = saved.selectedMaterialId;
		this.customBlocks = saved.customBlocks;
		this.cells = saved.cells;
	}

	// ── Derived state ────────────────────────────────────────────────

	dims = $derived(gridDims(this.sizeId, this.blockSize));
	size = $derived(QUILT_SIZE_BY_ID[this.sizeId]);
	materialById = $derived(new Map(this.materials.map((m) => [m.id, m])));
	selectedMaterial = $derived(
		this.selectedMaterialId ? (this.materialById.get(this.selectedMaterialId) ?? null) : null
	);
	/** Placement is allowed only with a named fabric selected. */
	canPlace = $derived(this.selectedMaterial !== null && isNamed(this.selectedMaterial));
	filled = $derived(this.cells.filter((block) => !isEmpty(block)).length);
	inUse = $derived(materialsInUse(this.cells));
	canUndo = $derived(this.history.past.length > 0);
	canRedo = $derived(this.history.future.length > 0);
	cutting = $derived(cuttingListFor(this.cells, this.materials, this.blockSize));

	selectedCustom = $derived(
		this.blockId.startsWith(CUSTOM_PREFIX)
			? (this.customBlocks.find((b) => b.id === this.blockId.slice(CUSTOM_PREFIX.length)) ?? null)
			: null
	);

	/** The block under the composition control, if one is selected. */
	selectedBlock = $derived(
		this.selectedIndex === null ? null : (this.cells[this.selectedIndex] ?? null)
	);
	selectedDivision = $derived(this.selectedBlock ? divisionOf(this.selectedBlock) : 0);

	/** Drop references to fabrics that have since been deleted. */
	private withKnownFabrics = (block: Block): Block =>
		mapLeaves(block, (leaf) => ({
			...leaf,
			fabrics: leaf.fabrics.map((f) => (f && this.materialById.has(f) ? f : null))
		}));

	/** What a click would place, given the active tab and selection. */
	pending = $derived.by<Pending>(() => {
		if (this.tab === 'piece') {
			const cut = this.pieceId in CUTS ? this.pieceId : 'square';
			return { mode: 'paint', cut, rotation: this.rotation };
		}
		const custom = this.selectedCustom;
		if (custom) {
			return {
				mode: 'exact',
				block: rotateBlock(this.withKnownFabrics(custom.block), this.rotation)
			};
		}
		const type = BLOCK_TYPE_BY_ID[this.blockId] ?? BLOCK_TYPES[0];
		return { mode: 'stamp', block: rotateBlock(type.block, this.rotation) };
	});

	/** The hovered cell renders as the exact state a click would produce. */
	placePreview = $derived.by(() => {
		if (this.tool !== 'place' || this.gesture || this.capturing || !this.hover) return null;
		if (!this.canPlace || !this.selectedMaterialId) return null;
		const { index, point } = this.hover;
		const block = buildPlacement(this.cells[index], point, this.pending, this.selectedMaterialId);
		return { index, block };
	});

	erasePreview = $derived.by(() => {
		if (this.tool !== 'erase' || this.gesture || !this.hover) return null;
		const block = buildErase(this.cells[this.hover.index], this.hover.point);
		return block ? { index: this.hover.index, block } : null;
	});

	savedState = $derived<SavedState>({
		name: this.name,
		sizeId: this.sizeId,
		blockSize: this.blockSize,
		materials: this.materials,
		selectedMaterialId: this.selectedMaterialId,
		customBlocks: this.customBlocks,
		cells: this.cells
	});

	// ── Mutation gate ────────────────────────────────────────────────

	private commit(updates: ReadonlyMap<number, Block>): boolean {
		const next = applyUpdates(this.cells, updates);
		if (!next) return false;
		if (this.gesture) {
			if (!this.gestureRecorded && this.gestureBase) {
				this.history = record(this.history, this.gestureBase);
				this.gestureRecorded = true;
			}
		} else {
			this.history = record(this.history, this.cells);
		}
		this.cells = next;
		return true;
	}

	private replaceBoard(next: Board): boolean {
		if (boardsEqual(next, this.cells)) return false;
		this.history = record(this.history, this.cells);
		this.cells = cloneBoard(next);
		return true;
	}

	private beginGesture(gesture: PaintGesture) {
		this.gesture = gesture;
		this.gestureBase = cloneBoard(this.cells);
		this.gestureRecorded = false;
	}

	private endGesture() {
		this.gesture = null;
		this.gestureBase = null;
		this.gestureRecorded = false;
	}

	/** Escape: a cancelled stroke reverts entirely. */
	cancelGesture() {
		if (this.gesture && this.gestureRecorded && this.gestureBase) {
			this.cells = cloneBoard(this.gestureBase);
			this.history = { past: this.history.past.slice(0, -1), future: this.history.future };
		}
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

	// ── Editing ──────────────────────────────────────────────────────

	private placeAt(index: number, point: Point): boolean {
		if (!this.canPlace || !this.selectedMaterialId) return false;
		const block = buildPlacement(this.cells[index], point, this.pending, this.selectedMaterialId);
		return this.commit(new Map([[index, block]]));
	}

	private eraseAt(index: number, point: Point): boolean {
		const next = buildErase(this.cells[index], point);
		return next ? this.commit(new Map([[index, next]])) : false;
	}

	rotate() {
		this.rotation = (this.rotation + 1) % 4;
	}

	/** Turning a composed block turns every child and permutes their positions. */
	rotateCell(index: number) {
		if (this.gesture) return;
		const block = this.cells[index];
		if (isEmpty(block)) return;
		this.commit(new Map([[index, rotateBlock(block, 1)]]));
	}

	clearAll() {
		if (this.filled === 0 || !confirm('Clear every block on the quilt?')) return;
		this.selectedIndex = null;
		this.replaceBoard(emptyBoard(this.dims));
	}

	// ── Composition ──────────────────────────────────────────────────

	select(index: number | null) {
		this.selectedIndex = index;
	}

	/*
	 * Going finer replicates, so the picture does not change; only the cut list
	 * does. Going coarser keeps each group's top-left piece.
	 */
	setComposition(division: number) {
		const index = this.selectedIndex;
		if (index === null || this.gesture) return;
		const block = this.cells[index];
		if (!block) return;
		this.commit(new Map([[index, recompose(block, division)]]));
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

	onCellPointerDown(e: PointerEvent, index: number) {
		if (e.button !== 0 || this.gesture) return;
		if (this.capturing) {
			this.captureCell(index);
			return;
		}
		if (this.tool === 'select') {
			this.select(index);
			return;
		}
		const hit = this.resolve(e.clientX, e.clientY);
		if (!hit) return;
		this.beginGesture({ pointerId: e.pointerId, mode: this.tool });
		if (this.tool === 'erase') this.eraseAt(index, hit.point);
		else this.placeAt(index, hit.point);
	}

	onPointerMove(e: PointerEvent) {
		const g = this.gesture;
		if (g && g.pointerId !== e.pointerId) return;
		const hit = this.resolve(e.clientX, e.clientY);
		this.hover = hit;
		if (!g || !hit) return;
		if (g.mode === 'erase') this.eraseAt(hit.index, hit.point);
		else this.placeAt(hit.index, hit.point);
	}

	onPointerUp(e: PointerEvent) {
		if (this.gesture?.pointerId === e.pointerId) this.endGesture();
	}

	// ── Keyboard ─────────────────────────────────────────────────────

	/** Enter/Space on a focused cell: the keyboard version of a click. */
	activateCell(index: number) {
		if (this.gesture) return;
		if (this.capturing) {
			this.captureCell(index);
			return;
		}
		if (this.tool === 'select') {
			this.select(index);
			return;
		}
		if (this.tool === 'erase') {
			const point = firstFilledPoint(this.cells[index]);
			if (point) this.eraseAt(index, point);
			return;
		}
		this.placeAt(index, keyboardPoint(this.pending));
	}

	onKeyDown(e: KeyboardEvent) {
		// Typing in inputs must not trigger shortcuts.
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement ||
			e.target instanceof HTMLSelectElement
		) {
			return;
		}
		if (e.key === 'Escape') {
			if (this.gesture) this.cancelGesture();
			else if (this.capturing) this.capturing = false;
			else if (this.selectedIndex !== null) this.selectedIndex = null;
			else this.tool = 'place';
			return;
		}
		if (this.gesture) return;
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) this.redo();
			else this.undo();
			return;
		}
		if (e.metaKey || e.ctrlKey) return;
		if (e.key === 'r' || e.key === 'R') this.rotate();
		if (e.key === 'e' || e.key === 'E' || e.key === 'Delete' || e.key === 'Backspace') {
			this.tool = 'erase';
		}
		if (e.key === 'p' || e.key === 'P') this.tool = 'place';
		if (e.key === 's' || e.key === 'S') this.tool = 'select';
	}

	// ── Palette ──────────────────────────────────────────────────────

	pickPiece(id: string) {
		this.tab = 'piece';
		this.pieceId = id;
		this.tool = 'place';
		this.capturing = false;
	}

	pickBlock(id: string) {
		this.tab = 'block';
		this.blockId = id;
		this.tool = 'place';
		this.capturing = false;
	}

	pickCustomBlock(id: string) {
		this.pickBlock(`${CUSTOM_PREFIX}${id}`);
	}

	startCapture() {
		this.capturing = true;
		this.tab = 'block';
		this.tool = 'place';
	}

	private captureCell(index: number) {
		const cell = this.cells[index];
		if (isEmpty(cell)) return;
		const name = prompt('Name this block', `Block ${this.customBlocks.length + 1}`)?.trim();
		this.capturing = false;
		if (!name) return;
		const block: CustomBlock = {
			id: crypto.randomUUID(),
			name,
			block: cloneBlock(cell)
		};
		this.customBlocks = [...this.customBlocks, block];
		this.rotation = 0;
		this.pickCustomBlock(block.id);
	}

	deleteCustomBlock(id: string) {
		const block = this.customBlocks.find((b) => b.id === id);
		if (!block || !confirm(`Remove the "${block.name}" block type?`)) return;
		this.customBlocks = this.customBlocks.filter((b) => b.id !== id);
		if (this.blockId === `${CUSTOM_PREFIX}${id}`) this.blockId = BLOCK_TYPES[0].id;
	}

	// ── Materials ────────────────────────────────────────────────────

	addMaterial() {
		const material: Material = {
			id: crypto.randomUUID(),
			name: '',
			hex: STARTER_HEXES[this.materials.length % STARTER_HEXES.length]
		};
		this.materials = [...this.materials, material];
		this.selectedMaterialId = material.id;
		this.tool = 'place';
	}

	selectMaterial(id: string) {
		this.selectedMaterialId = id;
		this.tool = 'place';
	}

	renameMaterial(id: string, name: string) {
		this.materials = this.materials.map((m) => (m.id === id ? { ...m, name } : m));
	}

	recolorMaterial(id: string, raw: string): boolean {
		const hex = normalizeHex(raw);
		if (!hex) return false;
		this.materials = this.materials.map((m) => (m.id === id ? { ...m, hex } : m));
		return true;
	}

	deleteMaterial(id: string) {
		const material = this.materialById.get(id);
		if (!material) return;
		if (
			this.inUse.has(id) &&
			!confirm(
				`Remove ${material.name.trim() || 'this fabric'}? Pieces cut from it will be cleared.`
			)
		) {
			return;
		}
		this.materials = this.materials.filter((m) => m.id !== id);
		if (this.selectedMaterialId === id) this.selectedMaterialId = this.materials[0]?.id ?? null;
		this.customBlocks = this.customBlocks.map((b) => ({
			...b,
			block: this.withKnownFabrics(b.block)
		}));
		this.replaceBoard(withoutMaterial(this.cells, id));
	}

	// ── Quilt settings ───────────────────────────────────────────────

	setSize(sizeId: string) {
		if (!(sizeId in QUILT_SIZE_BY_ID)) return;
		this.regrid(() => (this.sizeId = sizeId));
	}

	setBlockSize(blockSize: number) {
		this.regrid(() => (this.blockSize = blockSize));
	}

	private regrid(apply: () => void) {
		const from = this.dims;
		apply();
		const to = gridDims(this.sizeId, this.blockSize);
		if (from.rows === to.rows && from.cols === to.cols) return;
		this.selectedIndex = null;
		this.replaceBoard(resizeBoard(this.cells, from, to));
	}

	// ── Export / persistence ─────────────────────────────────────────

	materialsListText(): string {
		return materialsListText(
			{
				name: this.name,
				sizeName: this.size.name,
				widthIn: this.dims.cols * this.blockSize,
				heightIn: this.dims.rows * this.blockSize,
				blockSize: this.blockSize,
				rows: this.dims.rows,
				cols: this.dims.cols
			},
			this.cutting
		);
	}

	exportMaterialsList() {
		const blob = new Blob([this.materialsListText()], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(this.name.trim() || 'untitled-quilt').replace(/[^\w-]+/g, '-')}-materials.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	persist() {
		if (browser) writeJson(localStorage, STATE_KEY, this.savedState);
	}
}
