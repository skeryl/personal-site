/*
 * All editor state and behavior for the quilt builder. Pure logic lives in
 * the sibling modules; this class wires it to Svelte runes and the pointer
 * lifecycle. Every board mutation funnels through `commit`, so undo grouping
 * cannot be bypassed by any editing path.
 */

import { browser } from '$app/environment';
import {
	CUSTOM_SIZE_ID,
	DEFAULT_BLOCK_SIZE,
	DEFAULT_SIZE_ID,
	QUILT_SIZE_BY_ID,
	STARTER_HEXES,
	clampCustomInches,
	normalizeHex,
	type Material
} from './data';
import { BLOCK_TYPES, BLOCK_TYPE_BY_ID } from './blocks';
import { CUTS, pieceAt, rotatedPieces, type Point } from './geometry';
import {
	applyUpdates,
	blocksEqual,
	boardsEqual,
	cellIndex,
	cloneBlock,
	cloneBoard,
	colOf,
	divisionOf,
	emptyBlock,
	emptyBoard,
	flatten,
	isEmpty,
	leafAt,
	localPoint,
	mapLeaves,
	materialsInUse,
	recompose,
	resizeBoard,
	rotateBlock,
	middleOf,
	rowOf,
	setAt,
	subtreeAt,
	squareLabel,
	withoutMaterial,
	type Block,
	type Board,
	type MaterialId
} from './model';
import {
	buildErase,
	buildPaint,
	buildPlacement,
	firstFilledPoint,
	keyboardPoint,
	type Pending
} from './placement';
import {
	anchorFor,
	blocksFrom,
	boundsOf,
	placementAt,
	rotatePattern,
	type Pattern,
	type PatternBlocks
} from './pattern';
import { emptyHistory, record, redo as redoHistory, undo as undoHistory } from './history';
import {
	LEGACY_STATE_KEY,
	PANELS_KEY,
	STATE_KEY,
	gridDims,
	parsePanels,
	parseSavedState,
	sizeInches,
	readJson,
	writeJson,
	type Panels,
	type SavedState
} from './persistence';
import { cuttingListFor, materialsListText } from './cutting';

export type Tab = 'block' | 'piece';
export type Tool = 'place' | 'paint' | 'erase' | 'mouse' | 'grid';

/** Compositions offered in the toolbar: one piece, 2x2, or 4x4. */
export const DIVISIONS = [1, 2, 4] as const;

/*
 * Small UI toggles, remembered between visits: which palette sections are
 * open, and whether the centre markers are showing.
 */
export const DEFAULT_PANELS: Panels = {
	grid: true,
	type: true,
	patterns: true,
	attributes: true,
	centerGuides: false
};

/** Zoom is view state: never saved, never undone. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 12;
export const ZOOM_STEP = 1.25;

/** A row in Attributes: a fabric in the selection, or its bare pieces of one role. */
export type ColorSlot = { kind: 'fabric'; id: MaterialId } | { kind: 'unset'; role: number };

export interface Hover {
	index: number;
	point: Point;
	/**
	 * Alt inverts the grain the tool works at: the Mouse tool drills down to
	 * the piece under the cursor, Place breaks out to the whole square.
	 */
	alt: boolean;
}

/** One piece of fabric, addressed within the board. */
export interface PieceRef {
	cell: number;
	path: number[];
	piece: number;
}

/** A block, at any depth: an empty path is the whole square. */
export interface BlockRef {
	cell: number;
	path: number[];
}

interface PaintGesture {
	pointerId: number;
	mode: Tool;
}

export const PATTERN_PREFIX = 'pattern:';

/** A drag with the Select tool: a rectangle from `anchor` to `head`. */
interface Marquee {
	pointerId: number;
	anchor: number;
	head: number;
	additive: boolean;
	/** Sweeps skip empty squares unless this is held. */
	includeEmpty: boolean;
}

/** Whole blocks being carried to wherever they are dropped. */
interface BlockDrag {
	pointerId: number;
	/** Alt duplicates; cmd or ctrl picks the blocks up and moves them. */
	mode: 'copy' | 'move';
	origin: number;
	/** Where in the origin square the press landed, for an alt-click. */
	point: Point;
	sources: number[];
	over: number;
}

export class QuiltStore {
	name = $state('');
	sizeId = $state(DEFAULT_SIZE_ID);
	customWidth = $state(QUILT_SIZE_BY_ID[DEFAULT_SIZE_ID].width);
	customHeight = $state(QUILT_SIZE_BY_ID[DEFAULT_SIZE_ID].height);
	blockSize = $state(DEFAULT_BLOCK_SIZE);
	materials = $state<Material[]>([]);
	selectedMaterialId = $state<string | null>(null);
	patterns = $state<Pattern[]>([]);
	cells = $state<Board>(emptyBoard(gridDims(DEFAULT_SIZE_ID, DEFAULT_BLOCK_SIZE)));
	/** Board indices the composition control and pattern capture act on. */
	selection = $state<number[]>([]);
	marquee = $state<Marquee | null>(null);
	blockDrag = $state<BlockDrag | null>(null);
	/** Set by alt-clicking: a single piece, the bottom rung. */
	selectedPiece = $state<PieceRef | null>(null);
	/** The middle rung: one block inside a composed square. */
	selectedNode = $state<BlockRef | null>(null);

	/*
	 * A plain square is what is armed on load. The palette's first block type
	 * happens to be a pinwheel, and defaulting to it meant the first thing you
	 * placed was a pinwheel you never asked for.
	 */
	tab = $state<Tab>('piece');
	pieceId = $state('square');
	/** A built-in block type id, or `pattern:<id>` for a saved pattern. */
	blockId = $state(BLOCK_TYPES[0].id);
	rotation = $state(0);
	/* Selecting is the resting state; picking a shape is what arms placing. */
	#tool = $state<Tool>('mouse');

	get tool(): Tool {
		return this.#tool;
	}

	/*
	 * Placing and selecting are separate modes, so arming placement drops the
	 * selection. A selection carried in from the Mouse tool went on answering
	 * for things aimed at the piece being placed: R turned the selected
	 * squares instead of the block type waiting to go down.
	 */
	set tool(next: Tool) {
		if (next === this.#tool) return;
		this.#tool = next;
		if (next === 'place') this.clearSelection();
	}
	/** 1 fits the whole quilt in the viewport; above that the wall scrolls. */
	zoom = $state(1);
	/*
	 * The grid the Grid tool paints, and the one G cycles through. Starts at
	 * one piece: on load nothing is subdivided, so marking 2x2 as the armed
	 * grid drew a tile darker than its neighbours for no reason the eye could
	 * account for.
	 */
	gridDivision = $state<number>(1);
	/** Which palette sections are open, bound directly by the disclosures. */
	panels = $state<Panels>({ ...DEFAULT_PANELS });

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
		this.panels = parsePanels(readJson(localStorage, PANELS_KEY), DEFAULT_PANELS);
	}

	private restore(saved: SavedState) {
		this.name = saved.name;
		this.sizeId = saved.sizeId;
		this.customWidth = saved.customWidth;
		this.customHeight = saved.customHeight;
		this.blockSize = saved.blockSize;
		this.materials = saved.materials;
		this.selectedMaterialId = saved.selectedMaterialId;
		this.patterns = saved.patterns;
		this.cells = saved.cells;
	}

	// ── Derived state ────────────────────────────────────────────────

	dims = $derived(gridDims(this.sizeId, this.blockSize, this.customWidth, this.customHeight));
	isCustomSize = $derived(this.sizeId === CUSTOM_SIZE_ID);
	sizeInches = $derived(sizeInches(this.sizeId, this.customWidth, this.customHeight));
	sizeName = $derived(
		this.isCustomSize ? 'Custom' : (QUILT_SIZE_BY_ID[this.sizeId]?.name ?? 'Custom')
	);
	materialById = $derived(new Map(this.materials.map((m) => [m.id, m])));
	selectedMaterial = $derived(
		this.selectedMaterialId ? (this.materialById.get(this.selectedMaterialId) ?? null) : null
	);
	/*
	 * Placement needs a fabric, but no longer a NAMED one: names are optional
	 * now, and an unnamed fabric exports as its hex code.
	 */

	filled = $derived(this.cells.filter((block) => !isEmpty(block)).length);
	inUse = $derived(materialsInUse(this.cells));
	canUndo = $derived(this.history.past.length > 0);
	canRedo = $derived(this.history.future.length > 0);
	cutting = $derived(cuttingListFor(this.cells, this.materials, this.blockSize));

	selectedPattern = $derived(
		this.blockId.startsWith(PATTERN_PREFIX)
			? (this.patterns.find((p) => p.id === this.blockId.slice(PATTERN_PREFIX.length)) ?? null)
			: null
	);

	selectionSet = $derived(new Set(this.selection));
	selectedBlocks = $derived(this.selection.map((i) => this.cells[i]).filter(Boolean));
	/** Highlighted while a marquee drag is in flight, selected once it ends. */
	highlighted = $derived.by(() => {
		if (!this.marquee) return this.selectionSet;
		const swept = this.sweptIndices(this.marquee);
		return this.marquee.additive ? new Set([...this.selection, ...swept]) : new Set(swept);
	});
	/** The shared composition of the selection, or 0 when they disagree. */
	selectedDivision = $derived.by(() => {
		if (!this.scopeBlocks.length) return 0;
		const divisions = new Set(this.scopeBlocks.map(divisionOf));
		return divisions.size === 1 ? [...divisions][0] : 0;
	});

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
		const pattern = this.selectedPattern;
		if (pattern) {
			const blocks = Object.fromEntries(
				Object.entries(pattern.blocks).map(([at, block]) => [at, this.withKnownFabrics(block)])
			) as PatternBlocks;
			return { mode: 'pattern', blocks: rotatePattern(blocks, this.rotation) };
		}
		const type = BLOCK_TYPE_BY_ID[this.blockId] ?? BLOCK_TYPES[0];
		return { mode: 'stamp', block: rotateBlock(type.block, this.rotation) };
	});

	/** Board cells a pattern stamp would cover, or null if it would overhang. */
	private patternUpdates(index: number, blocks: PatternBlocks): Map<number, Block> | null {
		const { col, row } = anchorFor(index, this.dims);
		return placementAt(blocks, col, row, this.dims);
	}

	/** The hovered cells render as the exact state a click would produce. */
	placePreview = $derived.by(() => {
		if (this.tool !== 'place' || this.gesture || !this.hover) return null;
		const { index, point, alt } = this.hover;
		const pending = this.pending;
		if (pending.mode === 'pattern') return this.patternUpdates(index, pending.blocks);
		const target = this.placementTarget(this.cells[index], alt);
		return new Map([[index, buildPlacement(target, point, pending, this.selectedMaterialId)]]);
	});

	/** The hovered piece renders in the fabric a click would give it. */
	paintPreview = $derived.by(() => {
		if (this.tool !== 'paint' || this.gesture || !this.hover) return null;
		const { index, point } = this.hover;
		const block = buildPaint(this.cells[index], point, this.selectedMaterialId);
		return block ? new Map([[index, block]]) : null;
	});

	erasePreview = $derived.by(() => {
		if (this.tool !== 'erase' || this.gesture || !this.hover) return null;
		const block = buildErase(this.cells[this.hover.index], this.hover.point);
		return block ? new Map([[this.hover.index, block]]) : null;
	});

	savedState = $derived<SavedState>({
		name: this.name,
		sizeId: this.sizeId,
		customWidth: this.customWidth,
		customHeight: this.customHeight,
		blockSize: this.blockSize,
		materials: this.materials,
		selectedMaterialId: this.selectedMaterialId,
		patterns: this.patterns,
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

	private placeAt(index: number, point: Point, whole = false): boolean {
		const pending = this.pending;
		if (pending.mode === 'pattern') {
			const updates = this.patternUpdates(index, pending.blocks);
			return updates ? this.commit(updates) : false;
		}
		const target = this.placementTarget(this.cells[index], whole);
		const block = buildPlacement(target, point, pending, this.selectedMaterialId);
		return this.commit(new Map([[index, block]]));
	}

	/** Set the fabric of one piece, leaving its shape alone. */
	private paintAt(index: number, point: Point): boolean {
		const next = buildPaint(this.cells[index], point, this.selectedMaterialId);
		return next ? this.commit(new Map([[index, next]])) : false;
	}

	private eraseAt(index: number, point: Point): boolean {
		const next = buildErase(this.cells[index], point);
		return next ? this.commit(new Map([[index, next]])) : false;
	}

	/*
	 * R turns what is selected, at whatever rung: a piece turns the block that
	 * holds it, since a single polygon has no orientation of its own. With
	 * nothing selected it turns the block type waiting to be placed instead.
	 */
	rotate() {
		if (this.gesture) return;
		const piece = this.selectedPiece;
		if (piece) {
			const block = this.cells[piece.cell];
			if (!block) return;
			this.commit(
				new Map([
					[piece.cell, setAt(block, piece.path, rotateBlock(subtreeAt(block, piece.path), 1))]
				])
			);
			return;
		}
		if (this.activeScope.length) {
			this.editScope((block) => rotateBlock(block, 1));
			return;
		}
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
		this.clearSelection();
		this.replaceBoard(emptyBoard(this.dims));
	}

	/** The hovered block renders as the grid a click would give it. */
	gridPreview = $derived.by(() => {
		if (this.tool !== 'grid' || this.gesture || !this.hover) return null;
		const { index } = this.hover;
		const block = this.cells[index];
		if (!block) return null;
		const next = recompose(block, this.gridDivision);
		return blocksEqual(next, block) ? null : new Map([[index, next]]);
	});

	// ── Zoom ─────────────────────────────────────────────────────────

	setZoom(next: number) {
		this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
	}

	zoomBy(factor: number) {
		this.setZoom(this.zoom * factor);
	}

	resetZoom() {
		this.zoom = 1;
	}

	// ── Selection ────────────────────────────────────────────────────

	clearSelection() {
		this.selection = [];
		this.marquee = null;
		this.selectedPiece = null;
		this.selectedNode = null;
	}

	select(index: number) {
		this.selection = [index];
		this.selectedPiece = null;
		this.selectedNode = null;
	}

	/** Address the piece under a point, for alt-click and alt-hover. */
	private pieceRefAt(index: number, point: Point): PieceRef | null {
		const block = this.cells[index];
		if (!block) return null;
		const { leaf, rect, path } = leafAt(block, point);
		return { cell: index, path, piece: pieceAt(leaf.cut, leaf.rotation, localPoint(rect, point)) };
	}

	/** Alt-click: drill past the square to the single piece under the cursor. */
	selectPieceAt(index: number, point: Point) {
		const ref = this.pieceRefAt(index, point);
		if (!ref) return;
		this.selection = [];
		this.selectedNode = null;
		this.selectedPiece = ref;
	}

	/*
	 * The hyperlink out of a selection, one rung at a time: a piece climbs to
	 * the block that holds it, a nested block to its parent block, and a block
	 * at the top to the square itself.
	 */
	selectParent() {
		const piece = this.selectedPiece;
		if (piece) {
			this.selectedPiece = null;
			if (piece.path.length) this.selectedNode = { cell: piece.cell, path: piece.path };
			else this.selection = [piece.cell];
			return;
		}
		const node = this.selectedNode;
		if (!node) return;
		this.selectedNode = null;
		if (node.path.length > 1) {
			this.selectedNode = { cell: node.cell, path: node.path.slice(0, -1) };
		} else {
			this.selection = [node.cell];
		}
	}

	/*
	 * Delete: empty whatever is selected. A piece loses its fabric; a block or
	 * a square resets to blank, grid and all, which is what "reset the square"
	 * means. Returns false when nothing was selected, so the key can fall back
	 * to arming the Erase tool.
	 */
	clearSelected(): boolean {
		if (this.gesture) return false;
		if (this.selectedPiece) {
			this.setPieceFabric(null);
			return true;
		}
		if (!this.activeScope.length) return false;
		this.editScope(() => emptyBlock());
		return true;
	}

	/** Recolour just the selected piece. */
	setPieceFabric(materialId: MaterialId | null) {
		const ref = this.selectedPiece;
		if (!ref) return;
		const block = this.cells[ref.cell];
		if (!block) return;
		const leaf = subtreeAt(block, ref.path);
		if (leaf.kind !== 'leaf') return;
		const fabrics = leaf.fabrics.map((f, i) => (i === ref.piece ? materialId : f));
		this.commit(new Map([[ref.cell, setAt(block, ref.path, { ...leaf, fabrics })]]));
	}

	/** Shift-click: add or remove one block, so a selection can be any shape. */
	toggle(index: number) {
		this.selectedPiece = null;
		this.selectedNode = null;
		this.selection = this.selectionSet.has(index)
			? this.selection.filter((i) => i !== index)
			: [...this.selection, index];
	}

	selectAllFilled() {
		this.selection = this.cells.flatMap((block, i) => (isEmpty(block) ? [] : [i]));
	}

	/*
	 * Where a drag would drop. Whole blocks, so a pieced square travels
	 * complete rather than smearing one piece. All-or-nothing: if any part of
	 * the group would land off the quilt, nothing does.
	 *
	 * A move empties its sources first and then writes the targets over them,
	 * so a group shifted by one square does not erase the half it just wrote.
	 */
	dragPreview = $derived.by(() => {
		const drag = this.blockDrag;
		if (!drag) return null;
		const { cols, rows } = this.dims;
		const dCol = colOf(drag.over, cols) - colOf(drag.origin, cols);
		const dRow = rowOf(drag.over, cols) - rowOf(drag.origin, cols);
		if (!dCol && !dRow) return null;
		const updates = new Map<number, Block>();
		if (drag.mode === 'move') {
			for (const source of drag.sources) updates.set(source, emptyBlock());
		}
		for (const source of drag.sources) {
			const col = colOf(source, cols) + dCol;
			const row = rowOf(source, cols) + dRow;
			if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
			updates.set(cellIndex(row, col, cols), cloneBlock(this.cells[source]));
		}
		return updates;
	});

	/** Just the squares a drag would land on, for selecting them afterwards. */
	private dragTargets(drag: BlockDrag): number[] {
		const { cols } = this.dims;
		const dCol = colOf(drag.over, cols) - colOf(drag.origin, cols);
		const dRow = rowOf(drag.over, cols) - rowOf(drag.origin, cols);
		return drag.sources.map((source) =>
			cellIndex(rowOf(source, cols) + dRow, colOf(source, cols) + dCol, cols)
		);
	}

	/*
	 * The middle of the quilt, as column and row ranges. Drawn as lines across
	 * the whole quilt rather than a box around the centre squares, so you can
	 * line up anything against them, not just what sits in the middle. On an
	 * even grid there is no middle square, so the range covers the two either
	 * side of the centre seam.
	 */
	centerLines = $derived.by(() => {
		if (!this.panels.centerGuides) return null;
		const cols = middleOf(this.dims.cols);
		const rows = middleOf(this.dims.rows);
		return {
			c0: cols[0],
			c1: cols[cols.length - 1],
			r0: rows[0],
			r1: rows[rows.length - 1]
		};
	});

	/** The rectangle a marquee drag currently covers, in grid coordinates. */
	marqueeRect = $derived.by(() => {
		const marquee = this.marquee;
		if (!marquee) return null;
		const { cols } = this.dims;
		const [c0, c1] = [colOf(marquee.anchor, cols), colOf(marquee.head, cols)].sort((a, b) => a - b);
		const [r0, r1] = [rowOf(marquee.anchor, cols), rowOf(marquee.head, cols)].sort((a, b) => a - b);
		return { c0, c1, r0, r1 };
	});

	/** Every board index inside the rectangle a marquee drag has swept. */
	private marqueeIndices({ anchor, head }: Marquee): number[] {
		const { cols } = this.dims;
		const [c0, c1] = [colOf(anchor, cols), colOf(head, cols)].sort((a, b) => a - b);
		const [r0, r1] = [rowOf(anchor, cols), rowOf(head, cols)].sort((a, b) => a - b);
		const out: number[] = [];
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) out.push(cellIndex(r, c, cols));
		}
		return out;
	}

	/*
	 * Alt does double duty, split by whether the pointer moved: a drag
	 * duplicates, a click drills down to the piece under the cursor.
	 */
	private endDrag() {
		const drag = this.blockDrag;
		const updates = this.dragPreview;
		this.blockDrag = null;
		if (drag && updates && this.commit(updates)) {
			this.selectedPiece = null;
			this.selectedNode = null;
			this.selection = this.dragTargets(drag);
			return;
		}
		if (drag && drag.mode === 'copy' && drag.over === drag.origin) {
			this.selectPieceAt(drag.origin, drag.point);
		}
	}

	/*
	 * What a sweep would take. A click names one square and means it, empty or
	 * not; dragging a box over half the quilt does not, so a sweep keeps only
	 * the filled squares unless asked for everything.
	 */
	private sweptIndices(marquee: Marquee): number[] {
		const swept = this.marqueeIndices(marquee);
		if (marquee.includeEmpty || marquee.anchor === marquee.head) return swept;
		return swept.filter((index) => !isEmpty(this.cells[index]));
	}

	private endMarquee() {
		const marquee = this.marquee;
		this.marquee = null;
		if (!marquee) return;
		// A shift-click with no drag toggles one block rather than sweeping.
		if (marquee.anchor === marquee.head && marquee.additive) {
			this.toggle(marquee.anchor);
			return;
		}
		const swept = this.sweptIndices(marquee);
		this.selectedPiece = null;
		this.selectedNode = null;
		this.selection = marquee.additive ? [...new Set([...this.selection, ...swept])] : swept;
	}

	// ── Composition ──────────────────────────────────────────────────

	/** The piece alt-hovering would select, previewed before you commit. */
	hoverPiece = $derived.by((): PieceRef | null => {
		const hover = this.hover;
		if (this.tool !== 'mouse' || !hover?.alt || this.blockDrag || this.marquee) return null;
		return this.pieceRefAt(hover.index, hover.point);
	});

	/*
	 * What editing actions apply to. Exactly one rung of the ladder is live at
	 * a time: a piece, a block inside a square, or any number of whole squares.
	 * A piece has no scope of its own; only its colour can change.
	 */
	activeScope = $derived.by((): BlockRef[] => {
		if (this.selectedPiece) return [];
		if (this.selectedNode) return [this.selectedNode];
		return this.selection.map((cell) => ({ cell, path: [] }));
	});

	/** The subtree each scope entry points at. */
	private scopeBlocks = $derived(
		this.activeScope.flatMap(({ cell, path }) => {
			const block = this.cells[cell];
			return block ? [subtreeAt(block, path)] : [];
		})
	);

	/** Which square holds the drilled-in selection, for a context outline. */
	contextCell = $derived(this.selectedPiece?.cell ?? this.selectedNode?.cell ?? null);

	/** What the parent link climbs to from wherever the selection sits. */
	parentLabel = $derived.by(() => {
		if (this.selectedPiece) return this.selectedPiece.path.length ? 'the block' : 'the square';
		if (this.selectedNode) return this.selectedNode.path.length > 1 ? 'the block' : 'the square';
		return null;
	});

	/** The fabric of the selected piece, or null when no piece is selected. */
	selectedPieceFabric = $derived.by((): MaterialId | null => {
		const ref = this.selectedPiece;
		if (!ref) return null;
		const block = this.cells[ref.cell];
		if (!block) return null;
		const leaf = subtreeAt(block, ref.path);
		return leaf.kind === 'leaf' ? (leaf.fabrics[ref.piece] ?? null) : null;
	});

	/*
	 * How the wall reports the selection. Long selections collapse to a count:
	 * naming forty squares helps nobody.
	 */
	selectionLabel = $derived.by(() => {
		if (this.selectedPiece) {
			return `${squareLabel(this.selectedPiece.cell, this.dims.cols)} piece selected`;
		}
		if (this.selectedNode) {
			return `${squareLabel(this.selectedNode.cell, this.dims.cols)} block selected`;
		}
		const count = this.selection.length;
		if (!count) return 'no squares selected';
		const names = [...this.selection]
			.sort((a, b) => a - b)
			.map((index) => squareLabel(index, this.dims.cols));
		if (count === 1) return `${names[0]} square selected`;
		if (count <= 4) return `${names.join(', ')} squares selected`;
		return `${count} squares selected`;
	});

	/*
	 * The distinct fabrics used by the selected blocks, in reading order. This
	 * is what ATTRIBUTES lists: two for a plain block, more for a composed one.
	 */
	/*
	 * What Attributes lists for the selection: every fabric in it, then a slot
	 * for each role that still has bare pieces. A shape placed with no colour
	 * has a slot per role, so a half square triangle reads as Unset 1 and
	 * Unset 2 and each can be given its own fabric. Blank space contributes
	 * nothing: there is no shape there to colour.
	 */
	selectionSlots = $derived.by((): ColorSlot[] => {
		const fabrics: MaterialId[] = [];
		const roles: number[] = [];
		this.scopeBlocks.forEach((block) => {
			flatten(block).forEach(({ fabric, role, shaped }) => {
				if (fabric) {
					if (!fabrics.includes(fabric)) fabrics.push(fabric);
				} else if (shaped && !roles.includes(role)) {
					roles.push(role);
				}
			});
		});
		return [
			...fabrics.map((id): ColorSlot => ({ kind: 'fabric', id })),
			...roles.sort((a, b) => a - b).map((role): ColorSlot => ({ kind: 'unset', role }))
		];
	});

	/** Rewrite each scoped subtree, leaving everything outside it alone. */
	private editScope(fn: (block: Block) => Block): boolean {
		const updates = new Map<number, Block>();
		for (const { cell, path } of this.activeScope) {
			const block = updates.get(cell) ?? this.cells[cell];
			if (!block) continue;
			updates.set(cell, setAt(block, path, fn(subtreeAt(block, path))));
		}
		return updates.size ? this.commit(updates) : false;
	}

	/** Swap one fabric for another, within the selection only. */
	/*
	 * Give every bare piece of one role a fabric, across the selection. The
	 * counterpart of remapping a colour, for pieces that never had one.
	 */
	fillUnset(role: number, to: MaterialId) {
		this.editScope((block) =>
			mapLeaves(block, (leaf) => {
				const offset = leaf.roleOffset ?? 0;
				const shapes = rotatedPieces(leaf.cut, leaf.rotation);
				const bare = (fabric: MaterialId | null, i: number) =>
					fabric === null && shapes[i].role + offset === role;
				if (!leaf.fabrics.some(bare)) return leaf;
				return { ...leaf, fabrics: leaf.fabrics.map((f, i) => (bare(f, i) ? to : f)) };
			})
		);
	}

	remapFabric(from: MaterialId, to: MaterialId) {
		if (from === to) return;
		this.editScope((block) =>
			mapLeaves(block, (leaf) =>
				leaf.fabrics.includes(from)
					? { ...leaf, fabrics: leaf.fabrics.map((f) => (f === from ? to : f)) }
					: leaf
			)
		);
	}

	/** What the grid chips show as active: the selection's, else the tool's. */
	activeDivision = $derived(this.selection.length ? this.selectedDivision : this.gridDivision);

	/*
	 * Going finer replicates, so the picture does not change; only the cut list
	 * does. Going coarser keeps each group's top-left piece.
	 */
	applyGrid(division: number) {
		if (this.gesture) return;
		this.editScope((block) => recompose(block, division));
	}

	/*
	 * A grid chip means "this grid". What it acts on depends on whether
	 * anything is selected: the selection if so, otherwise it arms the Grid
	 * tool so the next click paints it.
	 */
	setGrid(division: number) {
		this.gridDivision = division;
		if (this.activeScope.length) {
			this.applyGrid(division);
			return;
		}
		/*
		 * While placing, the grid says how fine the next piece lands, so
		 * changing it must not drop you out of the Place tool.
		 */
		if (this.tool !== 'place') this.tool = 'grid';
	}

	/*
	 * The square a placement lands in.
	 *
	 * Normally the square as it stands, subdivided to the armed grid when it is
	 * coarser than that. A minimum rather than an override: a square already
	 * finer keeps its detail instead of being flattened by a placement.
	 *
	 * Alt inverts that. It hands the placement a blank square, so the piece
	 * lands across the whole thing however finely the square was divided,
	 * saving the select, clear, regrid, place round trip. It is the mirror of
	 * alt on the Mouse tool, which reaches the other way, down to a piece.
	 */
	private placementTarget(block: Block, whole: boolean): Block {
		if (whole) return emptyBlock();
		if (this.gridDivision <= 1) return block;
		return divisionOf(block) >= this.gridDivision ? block : recompose(block, this.gridDivision);
	}

	cycleGrid() {
		const order = DIVISIONS;
		const at = order.indexOf(this.activeDivision as (typeof DIVISIONS)[number]);
		this.setGrid(order[(at + 1) % order.length]);
	}

	/** Paint one block's grid, for the Grid tool. */
	private gridAt(index: number): boolean {
		const block = this.cells[index];
		if (!block) return false;
		return this.commit(new Map([[index, recompose(block, this.gridDivision)]]));
	}

	// ── Pointer handlers ─────────────────────────────────────────────

	/** Resolve a screen point to a cell and its local 0..1 coordinates. */
	private resolve(x: number, y: number): { index: number; point: Point } | null {
		const el = document.elementFromPoint(x, y)?.closest('[data-cell-index]');
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return {
			index: Number((el as HTMLElement).dataset.cellIndex),
			point: [(x - rect.left) / rect.width, (y - rect.top) / rect.height]
		};
	}

	onCellPointerDown(e: PointerEvent, index: number) {
		if (e.button !== 0 || this.gesture || this.marquee) return;
		if (this.tool === 'mouse') {
			/*
			 * Alt-drag duplicates. Dragging any member of a multi-selection
			 * carries the whole group; anything else carries just that block.
			 */
			const filled = !isEmpty(this.cells[index]);
			/*
			 * Cmd or ctrl means two things on this tool, told apart by what is
			 * under the pointer: grabbing a square that is already selected
			 * picks the selection up and moves it, anything else sweeps and
			 * takes the empty squares too.
			 */
			const moving = (e.metaKey || e.ctrlKey) && filled && this.selectionSet.has(index);
			if ((e.altKey && filled) || moving) {
				const grouped = this.selection.length > 1 && this.selectionSet.has(index);
				const hit = this.resolve(e.clientX, e.clientY);
				this.blockDrag = {
					pointerId: e.pointerId,
					mode: moving ? 'move' : 'copy',
					origin: index,
					point: hit?.point ?? [0.5, 0.5],
					sources: grouped ? [...this.selection] : [index],
					over: index
				};
				return;
			}
			this.marquee = {
				pointerId: e.pointerId,
				anchor: index,
				head: index,
				additive: e.shiftKey,
				includeEmpty: e.metaKey || e.ctrlKey
			};
			return;
		}
		const hit = this.resolve(e.clientX, e.clientY);
		if (!hit) return;
		this.beginGesture({ pointerId: e.pointerId, mode: this.tool });
		if (this.tool === 'erase') this.eraseAt(index, hit.point);
		else if (this.tool === 'paint') this.paintAt(index, hit.point);
		else if (this.tool === 'grid') this.gridAt(index);
		else this.placeAt(index, hit.point, e.altKey);
	}

	onPointerMove(e: PointerEvent) {
		const dragging = this.blockDrag;
		if (dragging) {
			if (dragging.pointerId !== e.pointerId) return;
			const hit = this.resolve(e.clientX, e.clientY);
			if (hit) this.blockDrag = { ...dragging, over: hit.index };
			return;
		}
		const m = this.marquee;
		if (m) {
			if (m.pointerId !== e.pointerId) return;
			const swept = this.resolve(e.clientX, e.clientY);
			if (swept) this.marquee = { ...m, head: swept.index };
			return;
		}
		const g = this.gesture;
		if (g && g.pointerId !== e.pointerId) return;
		const hit = this.resolve(e.clientX, e.clientY);
		this.hover = hit ? { ...hit, alt: e.altKey } : null;
		if (!g || !hit) return;
		if (g.mode === 'erase') this.eraseAt(hit.index, hit.point);
		else if (g.mode === 'paint') this.paintAt(hit.index, hit.point);
		else if (g.mode === 'grid') this.gridAt(hit.index);
		else this.placeAt(hit.index, hit.point, e.altKey);
	}

	onPointerUp(e: PointerEvent) {
		if (this.blockDrag?.pointerId === e.pointerId) {
			this.endDrag();
			return;
		}
		if (this.marquee?.pointerId === e.pointerId) {
			this.endMarquee();
			return;
		}
		if (this.gesture?.pointerId === e.pointerId) this.endGesture();
	}

	// ── Keyboard ─────────────────────────────────────────────────────

	/** Enter/Space on a focused cell: the keyboard version of a click. */
	activateCell(index: number) {
		if (this.gesture) return;
		if (this.tool === 'mouse') {
			this.toggle(index);
			return;
		}
		if (this.tool === 'grid') {
			this.gridAt(index);
			return;
		}
		if (this.tool === 'erase') {
			const point = firstFilledPoint(this.cells[index]);
			if (point) this.eraseAt(index, point);
			return;
		}
		if (this.tool === 'paint') {
			this.paintAt(index, firstFilledPoint(this.cells[index]) ?? [0.5, 0.5]);
			return;
		}
		this.placeAt(index, keyboardPoint(this.pending));
	}

	/** Alt held or released, with the pointer sitting still over a square. */
	setAlt(down: boolean) {
		if (!this.hover || this.hover.alt === down) return;
		this.hover = { ...this.hover, alt: down };
	}

	onKeyUp(e: KeyboardEvent) {
		if (e.key === 'Alt') this.setAlt(false);
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
		/*
		 * Alt changes what a click would do, so the preview has to follow the
		 * key as well as the pointer: held still over a square, it should
		 * redraw the moment alt goes down.
		 */
		if (e.key === 'Alt') {
			this.setAlt(true);
			return;
		}
		if (e.key === 'Escape') {
			if (this.gesture) this.cancelGesture();
			// Escape abandons a drag in flight, dropping nothing.
			else if (this.blockDrag) this.blockDrag = null;
			else if (this.marquee) this.marquee = null;
			// Escape climbs the ladder: piece, block, square, then back to placing.
			else if (this.selectedPiece || this.selectedNode) this.selectParent();
			else if (this.selection.length) this.clearSelection();
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
		if (e.key === 'Delete' || e.key === 'Backspace') {
			// Also stops Backspace navigating the page back.
			e.preventDefault();
			if (!this.clearSelected()) this.tool = 'erase';
			return;
		}
		if (e.key === 'e' || e.key === 'E') this.tool = 'erase';
		if (e.key === 't' || e.key === 'T') this.tool = 'paint';
		if (e.key === 'p' || e.key === 'P') this.tool = 'place';
		if (e.key === 'v' || e.key === 'V') this.tool = 'mouse';
		if (e.key === 'g' || e.key === 'G') this.cycleGrid();
		if (e.key === '+' || e.key === '=') this.zoomBy(ZOOM_STEP);
		if (e.key === '-' || e.key === '_') this.zoomBy(1 / ZOOM_STEP);
		if (e.key === '0') this.resetZoom();
	}

	// ── Palette ──────────────────────────────────────────────────────

	/*
	 * Put the armed shape into every square in the scope, replacing whatever
	 * was there. Patterns are excluded: one spans several squares, so there is
	 * no sense in which it goes into each of them.
	 */
	private applyPending(): boolean {
		const pending = this.pending;
		if (pending.mode === 'pattern') return false;
		const point = keyboardPoint(pending);
		return this.editScope(() =>
			buildPlacement(emptyBlock(), point, pending, this.selectedMaterialId)
		);
	}

	/*
	 * Picking a shape with squares selected fills them with it, the way
	 * picking a grid applies that grid: the selection is what you are working
	 * on, so the palette acts on it rather than arming for a later click. With
	 * nothing selected it arms, as before.
	 */
	pickPiece(id: string) {
		this.tab = 'piece';
		this.pieceId = id;
		if (this.applyPending()) return;
		this.tool = 'place';
	}

	pickBlock(id: string) {
		this.tab = 'block';
		this.blockId = id;
		if (this.applyPending()) return;
		this.tool = 'place';
	}

	pickPattern(id: string) {
		this.pickBlock(`${PATTERN_PREFIX}${id}`);
	}

	/** Blocks in the selection that actually hold fabric, as pattern cells. */
	capturable = $derived(
		this.selection
			.filter((i) => this.cells[i] && !isEmpty(this.cells[i]))
			.map((i) => ({
				x: colOf(i, this.dims.cols),
				y: rowOf(i, this.dims.cols),
				block: this.cells[i]
			}))
	);

	/*
	 * Save the selection as a named pattern. The selection may be any shape;
	 * `blocksFrom` normalizes it into pattern space, so an L saved from the
	 * middle of the quilt is the same pattern as an L saved from the corner.
	 */
	capturePattern() {
		const cells = this.capturable;
		if (!cells.length) return;
		const { w, h } = boundsOf(blocksFrom(cells));
		const label = w === 1 && h === 1 ? 'block' : `${w} by ${h} pattern`;
		const name = prompt(`Name this ${label}`, `Pattern ${this.patterns.length + 1}`)?.trim();
		if (!name) return;
		const pattern: Pattern = {
			id: crypto.randomUUID(),
			name,
			blocks: blocksFrom(cells)
		};
		this.patterns = [...this.patterns, pattern];
		this.rotation = 0;
		this.clearSelection();
		this.pickPattern(pattern.id);
	}

	deletePattern(id: string) {
		const pattern = this.patterns.find((p) => p.id === id);
		if (!pattern || !confirm(`Remove the "${pattern.name}" pattern?`)) return;
		this.patterns = this.patterns.filter((p) => p.id !== id);
		if (this.blockId === `${PATTERN_PREFIX}${id}`) this.blockId = BLOCK_TYPES[0].id;
	}

	// ── Materials ────────────────────────────────────────────────────

	/** Add a fabric to the palette and make it the one being painted with. */
	addMaterial(hex?: string): Material {
		const material: Material = {
			id: crypto.randomUUID(),
			name: '',
			hex: (hex && normalizeHex(hex)) || STARTER_HEXES[this.materials.length % STARTER_HEXES.length]
		};
		this.materials = [...this.materials, material];
		this.selectedMaterialId = material.id;
		return material;
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
		this.patterns = this.patterns.map((p) => ({
			...p,
			blocks: Object.fromEntries(
				Object.entries(p.blocks).map(([at, block]) => [at, this.withKnownFabrics(block)])
			) as PatternBlocks
		}));
		this.replaceBoard(withoutMaterial(this.cells, id));
	}

	// ── Quilt settings ───────────────────────────────────────────────

	setSize(sizeId: string) {
		if (sizeId !== CUSTOM_SIZE_ID && !(sizeId in QUILT_SIZE_BY_ID)) return;
		this.regrid(() => (this.sizeId = sizeId));
	}

	/** Switching to Custom starts from whatever preset was showing. */
	setCustomSize(width: number, height: number) {
		this.regrid(() => {
			this.customWidth = clampCustomInches(width);
			this.customHeight = clampCustomInches(height);
			this.sizeId = CUSTOM_SIZE_ID;
		});
	}

	setBlockSize(blockSize: number) {
		this.regrid(() => (this.blockSize = blockSize));
	}

	private regrid(apply: () => void) {
		const from = this.dims;
		apply();
		const to = gridDims(this.sizeId, this.blockSize, this.customWidth, this.customHeight);
		if (from.rows === to.rows && from.cols === to.cols) return;
		this.clearSelection();
		this.replaceBoard(resizeBoard(this.cells, from, to));
	}

	// ── Export / persistence ─────────────────────────────────────────

	materialsListText(): string {
		return materialsListText(
			{
				name: this.name,
				sizeName: this.sizeName,
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
		if (!browser) return;
		writeJson(localStorage, STATE_KEY, this.savedState);
		writeJson(localStorage, PANELS_KEY, this.panels);
	}
}
