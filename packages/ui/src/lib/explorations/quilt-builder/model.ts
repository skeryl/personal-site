/*
 * Board model: cells, coordinates, and the sparse-update transaction every
 * editing path goes through.
 */

import { LAYOUTS } from './geometry';

export interface Cell {
	layout: string;
	rotation: number;
	/** One material id (or null) per slot of the layout. */
	slots: (string | null)[];
}

export type Board = Cell[];

export interface Dims {
	rows: number;
	cols: number;
}

export const emptyCell = (): Cell => ({ layout: 'square', rotation: 0, slots: [null] });
export const emptyBoard = ({ rows, cols }: Dims): Board =>
	Array.from({ length: rows * cols }, emptyCell);
export const isEmpty = (cell: Cell): boolean => cell.slots.every((s) => s === null);
export const cloneCell = (cell: Cell): Cell => ({ ...cell, slots: [...cell.slots] });
export const cloneBoard = (board: readonly Cell[]): Board => board.map(cloneCell);

export const rowOf = (index: number, cols: number): number => Math.floor(index / cols);
export const colOf = (index: number, cols: number): number => index % cols;
export const cellIndex = (row: number, col: number, cols: number): number => row * cols + col;

export const cellsEqual = (a: Cell, b: Cell): boolean =>
	a.layout === b.layout &&
	a.rotation === b.rotation &&
	a.slots.length === b.slots.length &&
	a.slots.every((s, i) => s === b.slots[i]);

export const boardsEqual = (a: readonly Cell[], b: readonly Cell[]): boolean =>
	a.length === b.length && a.every((cell, i) => cellsEqual(cell, b[i]));

/** Apply sparse cell updates as one transaction; null when nothing changes. */
export const applyUpdates = (
	board: readonly Cell[],
	updates: ReadonlyMap<number, Cell>
): Board | null => {
	const changed = [...updates].some(([index, cell]) => !cellsEqual(board[index], cell));
	if (!changed) return null;
	return board.map((cell, index) => {
		const update = updates.get(index);
		return update ? cloneCell(update) : cell;
	});
};

/** Re-grid a board, keeping every block that still fits at its row/column. */
export const resizeBoard = (board: readonly Cell[], from: Dims, to: Dims): Board =>
	Array.from({ length: to.rows * to.cols }, (_, i) => {
		const row = rowOf(i, to.cols);
		const col = colOf(i, to.cols);
		if (row >= from.rows || col >= from.cols) return emptyCell();
		return cloneCell(board[cellIndex(row, col, from.cols)]);
	});

/** Blank out every slot cut from a material that no longer exists. */
export const withoutMaterial = (board: readonly Cell[], materialId: string): Board =>
	board.map((cell) => {
		if (!cell.slots.includes(materialId)) return cell;
		const slots = cell.slots.map((s) => (s === materialId ? null : s));
		return slots.every((s) => s === null) ? emptyCell() : { ...cell, slots };
	});

/** Materials referenced by the board, so the palette can warn before a delete. */
export const materialsInUse = (board: readonly Cell[]): Set<string> =>
	new Set(board.flatMap((cell) => cell.slots.filter((s): s is string => s !== null)));

export const slotCountOf = (layout: string): number => LAYOUTS[layout].slots.length;
