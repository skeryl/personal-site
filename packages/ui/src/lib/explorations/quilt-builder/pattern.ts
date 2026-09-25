/*
 * Block patterns: a named, reusable group of one or more blocks.
 *
 * A pattern lives in its own coordinate space, independent of where it sits
 * on a quilt. Occupancy is SPARSE, so a pattern can be an L, a plus, or any
 * other shape; an absent coordinate simply is not part of it. The bounding
 * box derived from the occupied coordinates is the rectangular backdrop the
 * pattern editor draws against.
 *
 * Conventions, fixed here so nothing downstream has to guess:
 *   - x increases to the right, y increases downward, matching the board.
 *   - Coordinates are normalized so the smallest x and y are both 0.
 *   - One clockwise turn maps (x, y) to (h - 1 - y, x), and a w by h pattern
 *     becomes h by w. Integer, so rotation is exact and reversible.
 */

import { cloneBlock, rotateBlock, type Block } from './model';

export type Coord = `${number},${number}`;

export type PatternBlocks = Record<Coord, Block>;

export interface Pattern {
	id: string;
	name: string;
	blocks: PatternBlocks;
}

export interface Bounds {
	w: number;
	h: number;
}

export interface PatternCell {
	x: number;
	y: number;
	block: Block;
}

export const coordOf = (x: number, y: number): Coord => `${x},${y}`;

export const parseCoord = (coord: string): [number, number] => {
	const [x, y] = coord.split(',');
	return [Number(x), Number(y)];
};

/** Occupied cells in reading order, so rendering and tests are deterministic. */
export const cellsOf = (blocks: PatternBlocks): PatternCell[] =>
	Object.entries(blocks)
		.map(([key, block]) => {
			const [x, y] = parseCoord(key);
			return { x, y, block };
		})
		.sort((a, b) => a.y - b.y || a.x - b.x);

export const blockCount = (blocks: PatternBlocks): number => Object.keys(blocks).length;

/** The rectangular backdrop: 0 by 0 for an empty pattern. */
export const boundsOf = (blocks: PatternBlocks): Bounds => {
	const cells = cellsOf(blocks);
	if (!cells.length) return { w: 0, h: 0 };
	const xs = cells.map((c) => c.x);
	const ys = cells.map((c) => c.y);
	return {
		w: Math.max(...xs) - Math.min(...xs) + 1,
		h: Math.max(...ys) - Math.min(...ys) + 1
	};
};

/** Shift so the smallest x and y are 0, so equal shapes compare equal. */
export const normalizeBlocks = (blocks: PatternBlocks): PatternBlocks => {
	const cells = cellsOf(blocks);
	if (!cells.length) return {};
	const dx = Math.min(...cells.map((c) => c.x));
	const dy = Math.min(...cells.map((c) => c.y));
	return Object.fromEntries(
		cells.map(({ x, y, block }) => [coordOf(x - dx, y - dy), block])
	) as PatternBlocks;
};

export const blocksFrom = (cells: readonly PatternCell[]): PatternBlocks =>
	normalizeBlocks(
		Object.fromEntries(
			cells.map(({ x, y, block }) => [coordOf(x, y), cloneBlock(block)])
		) as PatternBlocks
	);

/*
 * A pattern with its own copy of every block. Seed patterns are shared module
 * constants, so anything that will be edited has to take a copy first.
 */
export const clonePattern = (pattern: Pattern): Pattern => ({
	...pattern,
	blocks: blocksFrom(cellsOf(pattern.blocks))
});

/** Turn the whole pattern clockwise: positions move and every block turns. */
export const rotatePattern = (blocks: PatternBlocks, turns: number): PatternBlocks => {
	const t = ((turns % 4) + 4) % 4;
	let out = blocks;
	for (let i = 0; i < t; i++) out = rotateOnce(out);
	return out;
};

const rotateOnce = (blocks: PatternBlocks): PatternBlocks => {
	const { h } = boundsOf(blocks);
	return normalizeBlocks(
		Object.fromEntries(
			cellsOf(blocks).map(({ x, y, block }) => [coordOf(h - 1 - y, x), rotateBlock(block, 1)])
		) as PatternBlocks
	);
};

export const patternsEqualShape = (a: PatternBlocks, b: PatternBlocks): boolean => {
	const ka = Object.keys(normalizeBlocks(a)).sort();
	const kb = Object.keys(normalizeBlocks(b)).sort();
	return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
};

export interface Dims {
	rows: number;
	cols: number;
}

/*
 * Where a pattern lands on the board. The anchor is the board cell the
 * pattern's own (0, 0) sits on. Returns null when any part would fall off
 * the quilt, so a stamp is all-or-nothing rather than silently clipped.
 */
export const placementAt = (
	blocks: PatternBlocks,
	anchorCol: number,
	anchorRow: number,
	dims: Dims
): Map<number, Block> | null => {
	const updates = new Map<number, Block>();
	for (const { x, y, block } of cellsOf(blocks)) {
		const col = anchorCol + x;
		const row = anchorRow + y;
		if (col < 0 || row < 0 || col >= dims.cols || row >= dims.rows) return null;
		updates.set(row * dims.cols + col, cloneBlock(block));
	}
	return updates;
};

/*
 * Anchor a pattern so the cell the pointer is over is the one under the
 * pattern's top-left occupied cell. Patterns grow right and down from the
 * cursor, which is what a stamp feels like.
 */
export const anchorFor = (index: number, dims: Dims): { col: number; row: number } => ({
	col: index % dims.cols,
	row: Math.floor(index / dims.cols)
});
