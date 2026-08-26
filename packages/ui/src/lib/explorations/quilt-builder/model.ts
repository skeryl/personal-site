/*
 * Board model: cells, coordinates, inventory accounting, and the single
 * budget-checked mutation gate every editing path goes through.
 */

import { COLS, FABRICS, ROWS } from './data';
import { LAYOUTS, SHAPE_AREA, type LayoutId } from './geometry';

export interface Cell {
	layout: LayoutId;
	rotation: number;
	/** One fabric id (or null) per slot of the layout. */
	slots: (string | null)[];
}

export type Board = Cell[];

export const CELL_COUNT = ROWS * COLS;

export const emptyCell = (): Cell => ({ layout: 'whole', rotation: 0, slots: [null] });
export const emptyBoard = (): Board => Array.from({ length: CELL_COUNT }, emptyCell);
export const isEmpty = (cell: Cell): boolean => cell.slots.every((slot) => slot === null);
export const cloneCell = (cell: Cell): Cell => ({ ...cell, slots: [...cell.slots] });
export const cloneBoard = (board: readonly Cell[]): Board => board.map(cloneCell);

export const rowOf = (index: number): number => Math.floor(index / COLS);
export const colOf = (index: number): number => index % COLS;
export const cellIndex = (row: number, col: number): number => row * COLS + col;
export const inBounds = (row: number, col: number): boolean =>
	row >= 0 && row < ROWS && col >= 0 && col < COLS;

export const cellsEqual = (a: Cell, b: Cell): boolean =>
	a.layout === b.layout &&
	a.rotation === b.rotation &&
	a.slots.length === b.slots.length &&
	a.slots.every((slot, i) => slot === b.slots[i]);

export const boardsEqual = (a: readonly Cell[], b: readonly Cell[]): boolean =>
	a.length === b.length && a.every((cell, i) => cellsEqual(cell, b[i]));

/** Per-fabric square-equivalents consumed by the given cells. */
export const usageOf = (cells: readonly Cell[]): Record<string, number> =>
	cells.reduce<Record<string, number>>((totals, cell) => {
		const defs = LAYOUTS[cell.layout].slots;
		cell.slots.forEach((id, i) => {
			if (id) totals[id] = (totals[id] ?? 0) + SHAPE_AREA[defs[i].kind];
		});
		return totals;
	}, {});

export const remainingOf = (used: Record<string, number>): Record<string, number> =>
	Object.fromEntries(FABRICS.map((fabric) => [fabric.id, fabric.count - (used[fabric.id] ?? 0)]));

const EPSILON = 1e-9;

export const withinBudget = (cells: readonly Cell[]): boolean => {
	const totals = usageOf(cells);
	return FABRICS.every((fabric) => (totals[fabric.id] ?? 0) <= fabric.count + EPSILON);
};

export type ApplyResult =
	| { ok: true; board: Board }
	| { ok: false; reason: 'no-op' | 'over-budget' };

/**
 * Apply sparse cell updates as one transaction. Rejects results that change
 * nothing or that would overdraw the scrap pile, so no editing path can leak
 * past the inventory.
 */
export const applyUpdates = (
	board: readonly Cell[],
	updates: ReadonlyMap<number, Cell>
): ApplyResult => {
	const changed = [...updates].some(([index, cell]) => !cellsEqual(board[index], cell));
	if (!changed) return { ok: false, reason: 'no-op' };
	const next = board.map((cell, index) => {
		const update = updates.get(index);
		return update ? cloneCell(update) : cell;
	});
	if (!withinBudget(next)) return { ok: false, reason: 'over-budget' };
	return { ok: true, board: next };
};

/** Drag offset in rows/columns, clamped so the whole group stays on the grid. */
export const groupDelta = (
	selection: readonly number[],
	srcIndex: number,
	destIndex: number
): [number, number] => {
	const rows = selection.map(rowOf);
	const cols = selection.map(colOf);
	const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
	return [
		clamp(rowOf(destIndex) - rowOf(srcIndex), -Math.min(...rows), ROWS - 1 - Math.max(...rows)),
		clamp(colOf(destIndex) - colOf(srcIndex), -Math.min(...cols), COLS - 1 - Math.max(...cols))
	];
};
