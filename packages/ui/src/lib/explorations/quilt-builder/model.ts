/*
 * Board model: blocks, coordinates, and the sparse-update transaction every
 * editing path goes through.
 *
 * A block is either a LEAF (one cut, divided into pieces of fabric) or a GRID
 * of smaller blocks. A grid does not change the block's outer size; it only
 * makes the pieces inside it smaller. That is the whole of "block
 * composition": 1 is a leaf, 2x2 and 4x4 are grids.
 *
 * Geometry is expressed as rects in BLOCK SPACE, the unit square covering one
 * block of the quilt. A leaf's rect says both where it sits and how big its
 * pieces are relative to the block, which is what the cutting list needs.
 */

import { CUTS, normalizeTurns, rotatedPieces, type Point, type ShapeKind } from './geometry';

export type MaterialId = string;

export interface LeafBlock {
	kind: 'leaf';
	cut: string;
	rotation: number;
	/** One material id (or null) per piece of the cut. */
	fabrics: (MaterialId | null)[];
	/**
	 * Added to every piece's role. Lets a grid alternate which of its children
	 * take the stamped fabric, the way a four patch checkerboards.
	 *
	 * Present, even as zero, means a composition gave this leaf its role. That
	 * is what tells a four patch's plain quarters apart from blank space,
	 * which is otherwise the same leaf.
	 */
	roleOffset?: number;
}

export interface GridBlock {
	kind: 'grid';
	cols: number;
	rows: number;
	/** Row-major, length cols * rows. */
	children: Block[];
}

export type Block = LeafBlock | GridBlock;

export type Board = Block[];

export interface Dims {
	rows: number;
	cols: number;
}

/** A region of block space: x/y/w/h as fractions of the block. */
export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export const UNIT_RECT: Rect = { x: 0, y: 0, w: 1, h: 1 };

/** Nudge used to sample just inside a rect rather than on its boundary. */
const EPS = 1e-9;

export const leafBlock = (
	cut: string,
	rotation = 0,
	fabrics?: (MaterialId | null)[],
	roleOffset?: number
): LeafBlock => ({
	kind: 'leaf',
	cut,
	rotation,
	fabrics: fabrics ?? Array(CUTS[cut].pieces.length).fill(null),
	...(roleOffset === undefined ? {} : { roleOffset })
});

export const emptyBlock = (): Block => leafBlock('square');
export const emptyBoard = ({ rows, cols }: Dims): Board =>
	Array.from({ length: rows * cols }, emptyBlock);

export const cloneBlock = (block: Block): Block =>
	block.kind === 'leaf'
		? { ...block, fabrics: [...block.fabrics] }
		: { ...block, children: block.children.map(cloneBlock) };

export const cloneBoard = (board: readonly Block[]): Board => board.map(cloneBlock);

export const blocksEqual = (a: Block, b: Block): boolean => {
	if (a.kind !== b.kind) return false;
	if (a.kind === 'leaf' && b.kind === 'leaf') {
		return (
			a.cut === b.cut &&
			a.rotation === b.rotation &&
			// Strict: no role at all and role zero are the blank and the shape.
			a.roleOffset === b.roleOffset &&
			a.fabrics.length === b.fabrics.length &&
			a.fabrics.every((f, i) => f === b.fabrics[i])
		);
	}
	const g = a as GridBlock;
	const h = b as GridBlock;
	return (
		g.cols === h.cols &&
		g.rows === h.rows &&
		g.children.length === h.children.length &&
		g.children.every((child, i) => blocksEqual(child, h.children[i]))
	);
};

/** Same tree shape, cuts and rotations, ignoring which fabrics are in it. */
export const sameStructure = (a: Block, b: Block): boolean => {
	if (a.kind !== b.kind) return false;
	if (a.kind === 'leaf' && b.kind === 'leaf') {
		return (
			a.cut === b.cut &&
			a.rotation === b.rotation &&
			/*
			 * Absent and zero are the same offset. Which of the two a leaf
			 * carries says whether somebody placed it or it is blank space —
			 * that is what is in the block, not the shape of it, and blocksEqual
			 * is where the difference belongs.
			 */
			(a.roleOffset ?? 0) === (b.roleOffset ?? 0)
		);
	}
	const g = a as GridBlock;
	const h = b as GridBlock;
	return (
		g.cols === h.cols &&
		g.rows === h.rows &&
		g.children.every((child, i) => sameStructure(child, h.children[i]))
	);
};

export const boardsEqual = (a: readonly Block[], b: readonly Block[]): boolean =>
	a.length === b.length && a.every((block, i) => blocksEqual(block, b[i]));

// ── Walking the tree ───────────────────────────────────────────────

export interface LeafRef {
	leaf: LeafBlock;
	rect: Rect;
	/** Index path from the root: [] for a lone leaf, [2] for child 2 of a grid. */
	path: number[];
}

export const childRect = (rect: Rect, grid: GridBlock, index: number): Rect => {
	const w = rect.w / grid.cols;
	const h = rect.h / grid.rows;
	return {
		x: rect.x + (index % grid.cols) * w,
		y: rect.y + Math.floor(index / grid.cols) * h,
		w,
		h
	};
};

/** Every leaf of the block, with its rect in block space, in reading order. */
export const walkLeaves = (block: Block, rect: Rect = UNIT_RECT, path: number[] = []): LeafRef[] =>
	block.kind === 'leaf'
		? [{ leaf: block, rect, path }]
		: block.children.flatMap((child, i) =>
				walkLeaves(child, childRect(rect, block, i), [...path, i])
			);

/** The leaf covering a point in block space. */
export const leafAt = (
	block: Block,
	point: Point,
	rect: Rect = UNIT_RECT,
	path: number[] = []
): LeafRef => {
	if (block.kind === 'leaf') return { leaf: block, rect, path };
	const lx = Math.min(Math.max((point[0] - rect.x) / rect.w, 0), 1 - EPS);
	const ly = Math.min(Math.max((point[1] - rect.y) / rect.h, 0), 1 - EPS);
	const index = Math.floor(ly * block.rows) * block.cols + Math.floor(lx * block.cols);
	return leafAt(block.children[index], point, childRect(rect, block, index), [...path, index]);
};

/** A block-space point expressed in the leaf's own unit square. */
export const localPoint = (rect: Rect, [x, y]: Point): Point => [
	(x - rect.x) / rect.w,
	(y - rect.y) / rect.h
];

/*
 * Replace whatever sits at `path` with `next`, returning a new tree. `next`
 * may be a grid, not just a leaf: stamping a pinwheel into one quarter of a
 * 2x2 block is exactly that, a grid replacing a leaf.
 */
export const setAt = (block: Block, path: readonly number[], next: Block): Block => {
	if (!path.length || block.kind === 'leaf') return next;
	const [index, ...rest] = path;
	return {
		...block,
		children: block.children.map((child, i) => (i === index ? setAt(child, rest, next) : child))
	};
};

/** The rect of the subtree at `path`, in block space. */
export const rectAt = (block: Block, path: readonly number[], rect: Rect = UNIT_RECT): Rect => {
	if (!path.length || block.kind === 'leaf') return rect;
	const [index, ...rest] = path;
	return rectAt(block.children[index], rest, childRect(rect, block, index));
};

/** The subtree at `path`, stopping early if the path runs past a leaf. */
export const subtreeAt = (block: Block, path: readonly number[]): Block =>
	path.length === 0 || block.kind === 'leaf'
		? block
		: subtreeAt(block.children[path[0]], path.slice(1));

/** Rewrite every leaf in place, with its rect, keeping the grid structure. */
export const mapLeavesWithRect = (
	block: Block,
	fn: (leaf: LeafBlock, rect: Rect) => LeafBlock,
	rect: Rect = UNIT_RECT
): Block =>
	block.kind === 'leaf'
		? fn(block, rect)
		: {
				...block,
				children: block.children.map((child, i) =>
					mapLeavesWithRect(child, fn, childRect(rect, block, i))
				)
			};

/** Rewrite every leaf in place, keeping the grid structure. */
export const mapLeaves = (block: Block, fn: (leaf: LeafBlock) => LeafBlock): Block =>
	block.kind === 'leaf'
		? fn(block)
		: { ...block, children: block.children.map((child) => mapLeaves(child, fn)) };

// ── Flattened pieces ───────────────────────────────────────────────

/** Stable identity for one piece within a block: "<leaf path>:<piece index>". */
export const pieceKey = (path: readonly number[], piece: number): string =>
	`${path.join('.')}:${piece}`;

/** One piece of fabric, resolved into block space. Drives drawing and cutting. */
export interface FlatPiece {
	/** Stable identity across re-renders: "<leaf path>:<piece index>". */
	key: string;
	kind: ShapeKind;
	/** Blank size as a fraction of the whole block, already scaled by the grid. */
	frac: number;
	role: number;
	points: Point[];
	fabric: MaterialId | null;
	/*
	 * Whether this piece belongs to a shape somebody put down, as opposed to
	 * the blank square a block starts as. A shape can be placed before it has
	 * any fabric, and an unset piece of one is drawn and listed; blank space
	 * is neither.
	 */
	shaped: boolean;
}

/*
 * Grids are square for now (2x2, 4x4), so a leaf's rect.w is the scale factor
 * for its blanks. Non-square cells would need frac to carry both axes.
 */
/*
 * A leaf holds a shape once it has been cut into one, or given a role by the
 * composition that built it (a four patch is four plain squares whose roles
 * alternate). Until then it is the blank a block starts as.
 */
const isShaped = (leaf: LeafBlock): boolean =>
	leaf.cut !== 'square' || leaf.roleOffset !== undefined;

const flattenUncached = (block: Block): FlatPiece[] =>
	walkLeaves(block).flatMap(({ leaf, rect, path }) =>
		rotatedPieces(leaf.cut, leaf.rotation).map((shape, i) => ({
			key: pieceKey(path, i),
			kind: shape.kind,
			frac: shape.frac * rect.w,
			role: shape.role + (leaf.roleOffset ?? 0),
			points: shape.points.map(([x, y]): Point => [rect.x + x * rect.w, rect.y + y * rect.h]),
			fabric: leaf.fabrics[i] ?? null,
			shaped: isShaped(leaf)
		}))
	);

/*
 * Blocks are immutable and replaced wholesale on edit, so caching by identity
 * is safe. It matters: hovering re-renders every cell on the wall.
 */
const flatCache = new WeakMap<Block, FlatPiece[]>();

export const flatten = (block: Block): FlatPiece[] => {
	const cached = flatCache.get(block);
	if (cached) return cached;
	const pieces = flattenUncached(block);
	flatCache.set(block, pieces);
	return pieces;
};

/** Leaf outlines in block space, so composition seams can be drawn heavier. */
const rectCache = new WeakMap<Block, Rect[]>();

export const leafRects = (block: Block): Rect[] => {
	const cached = rectCache.get(block);
	if (cached) return cached;
	const rects = block.kind === 'leaf' ? [] : walkLeaves(block).map(({ rect }) => rect);
	rectCache.set(block, rects);
	return rects;
};

// ── Composition ────────────────────────────────────────────────────

/** 1 for a leaf, or the grid's side for a square grid. */
export const divisionOf = (block: Block): number =>
	block.kind === 'leaf' ? 1 : block.cols === block.rows ? block.cols : 0;

/*
 * Change how granular a block is without changing what it looks like when
 * going finer. Every target cell samples the source leaf at its own top-left
 * corner, so 1 -> 2x2 replicates (the picture is unchanged, the cut list is
 * not) and 4x4 -> 2x2 keeps each group's top-left leaf.
 */
export const recompose = (block: Block, division: number): Block => {
	const sample = (x: number, y: number): LeafBlock =>
		cloneBlock(leafAt(block, [x, y]).leaf) as LeafBlock;
	if (division <= 1) return sample(EPS, EPS);
	return {
		kind: 'grid',
		cols: division,
		rows: division,
		children: Array.from({ length: division * division }, (_, i) =>
			sample((i % division) / division + EPS, Math.floor(i / division) / division + EPS)
		)
	};
};

/** Rotate a whole block clockwise: every leaf turns, and grids permute. */
export const rotateBlock = (block: Block, turns: number): Block => {
	const t = normalizeTurns(turns);
	if (t === 0) return block;
	if (block.kind === 'leaf') {
		return { ...block, rotation: normalizeTurns(block.rotation + t) };
	}
	let out: GridBlock = block;
	for (let i = 0; i < t; i++) out = rotateGridOnce(out);
	return out;
};

const rotateGridOnce = (grid: GridBlock): GridBlock => {
	const { cols, rows } = grid;
	const children: Block[] = new Array(cols * rows);
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			// Clockwise: (c, r) lands at (rows - 1 - r, c) in a rows x cols grid.
			children[c * rows + (rows - 1 - r)] = rotateBlock(grid.children[r * cols + c], 1);
		}
	}
	return { kind: 'grid', cols: rows, rows: cols, children };
};

// ── Queries ────────────────────────────────────────────────────────

/*
 * Empty means nothing has been put down here, not merely that nothing is
 * coloured: a shape can be placed before it has any fabric, and it is still
 * a shape. A square subdivided but not cut into anything is still blank.
 */
export const isEmpty = (block: Block): boolean =>
	walkLeaves(block).every(({ leaf }) => !isShaped(leaf) && leaf.fabrics.every((f) => f === null));

/*
 * Squares are named like spreadsheet cells, which is how the design refers to
 * them: column letter plus 1-based row. Past Z it carries, so a custom quilt
 * wider than 26 blocks still reads sensibly.
 */
export const columnLabel = (col: number): string => {
	let label = '';
	for (let n = col; n >= 0; n = Math.floor(n / 26) - 1) {
		label = String.fromCharCode(65 + (n % 26)) + label;
	}
	return label;
};

export const squareLabel = (index: number, cols: number): string =>
	`${columnLabel(index % cols)}${Math.floor(index / cols) + 1}`;

/*
 * The middle of a run: one index when it is odd, two when it is even. A 14
 * wide quilt has no middle column, so both 7 and 8 count.
 */
export const middleOf = (count: number): number[] =>
	count % 2 ? [(count - 1) / 2] : [count / 2 - 1, count / 2];

export const rowOf = (index: number, cols: number): number => Math.floor(index / cols);
export const colOf = (index: number, cols: number): number => index % cols;
export const cellIndex = (row: number, col: number, cols: number): number => row * cols + col;

/** Apply sparse block updates as one transaction; null when nothing changes. */
export const applyUpdates = (
	board: readonly Block[],
	updates: ReadonlyMap<number, Block>
): Board | null => {
	const changed = [...updates].some(([index, block]) => !blocksEqual(board[index], block));
	if (!changed) return null;
	return board.map((block, index) => {
		const update = updates.get(index);
		return update ? cloneBlock(update) : block;
	});
};

/** Re-grid a board, keeping every block that still fits at its row/column. */
export const resizeBoard = (board: readonly Block[], from: Dims, to: Dims): Board =>
	Array.from({ length: to.rows * to.cols }, (_, i) => {
		const row = rowOf(i, to.cols);
		const col = colOf(i, to.cols);
		if (row >= from.rows || col >= from.cols) return emptyBlock();
		return cloneBlock(board[cellIndex(row, col, from.cols)]);
	});

/** Blank out every piece cut from a material that no longer exists. */
/*
 * The board with a fabric taken out of it. The pieces cut from it stay exactly
 * where they are and go back to unset: a shape without a colour is still a
 * shape, so losing a fabric costs no work.
 */
export const withoutMaterial = (board: readonly Block[], materialId: MaterialId): Board =>
	board.map((block) =>
		mapLeaves(block, (leaf) =>
			leaf.fabrics.includes(materialId)
				? { ...leaf, fabrics: leaf.fabrics.map((f) => (f === materialId ? null : f)) }
				: leaf
		)
	);

/** Materials referenced by the board, so the palette can warn before a delete. */
export const materialsInUse = (board: readonly Block[]): Set<MaterialId> =>
	new Set(
		board.flatMap((block) =>
			walkLeaves(block).flatMap(({ leaf }) =>
				leaf.fabrics.filter((f): f is MaterialId => f !== null)
			)
		)
	);

/*
 * The fabric covering the most of a block, for views too small to draw real
 * geometry (the minimap). Area-weighted rather than "first non-null", so a
 * block reads as the colour it actually looks like.
 */
const polygonArea = (points: readonly Point[]): number => {
	const n = points.length;
	let sum = 0;
	for (let i = 0; i < n; i++) {
		const [x, y] = points[i];
		const [nx, ny] = points[(i + 1) % n];
		sum += x * ny - nx * y;
	}
	return Math.abs(sum) / 2;
};

const dominantCache = new WeakMap<Block, MaterialId | null>();

export const dominantFabric = (block: Block): MaterialId | null => {
	const cached = dominantCache.get(block);
	if (cached !== undefined) return cached;
	const areas = new Map<MaterialId, number>();
	for (const piece of flatten(block)) {
		if (!piece.fabric) continue;
		areas.set(piece.fabric, (areas.get(piece.fabric) ?? 0) + polygonArea(piece.points));
	}
	let best: MaterialId | null = null;
	let bestArea = 0;
	for (const [id, area] of areas) {
		if (area > bestArea) {
			best = id;
			bestArea = area;
		}
	}
	dominantCache.set(block, best);
	return best;
};
