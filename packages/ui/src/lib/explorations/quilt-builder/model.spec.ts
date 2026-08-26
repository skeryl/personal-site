import { describe, expect, it } from 'vitest';
import { COLS, ROWS } from './data';
import {
	CELL_COUNT,
	applyUpdates,
	boardsEqual,
	cellIndex,
	cellsEqual,
	cloneCell,
	colOf,
	emptyBoard,
	emptyCell,
	groupDelta,
	inBounds,
	isEmpty,
	remainingOf,
	rowOf,
	usageOf,
	withinBudget,
	type Cell
} from './model';

const square = (fabric: string): Cell => ({ layout: 'whole', rotation: 0, slots: [fabric] });
const diagonal = (a: string | null, b: string | null): Cell => ({
	layout: 'diagonal',
	rotation: 0,
	slots: [a, b]
});

describe('coordinates', () => {
	it('round-trips row/col through cellIndex', () => {
		const index = cellIndex(3, 2);
		expect([rowOf(index), colOf(index)]).toEqual([3, 2]);
	});

	it('bounds-checks the grid', () => {
		expect(inBounds(0, 0)).toBe(true);
		expect(inBounds(ROWS, 0)).toBe(false);
		expect(inBounds(0, COLS)).toBe(false);
		expect(inBounds(-1, 0)).toBe(false);
	});
});

describe('cell equality and cloning', () => {
	it('compares layout, rotation, and slots', () => {
		expect(cellsEqual(square('tan'), square('tan'))).toBe(true);
		expect(cellsEqual(square('tan'), square('cream'))).toBe(false);
		expect(cellsEqual(square('tan'), { ...square('tan'), rotation: 1 })).toBe(false);
	});

	it('clones deeply enough that slots are independent', () => {
		const original = diagonal('tan', null);
		const copy = cloneCell(original);
		copy.slots[0] = 'cream';
		expect(original.slots[0]).toBe('tan');
	});
});

describe('usage and budget', () => {
	it('counts fractional areas per fabric', () => {
		const cells = [square('tan'), diagonal('tan', 'cream')];
		expect(usageOf(cells)).toEqual({ tan: 1.5, cream: 0.5 });
	});

	it('reports remaining inventory for every fabric', () => {
		const remaining = remainingOf({ white: 1 });
		expect(remaining.white).toBe(0);
		expect(remaining.tan).toBe(21);
	});

	it('rejects boards that overdraw a fabric', () => {
		// White has exactly one square in the pile.
		expect(withinBudget([square('white')])).toBe(true);
		expect(withinBudget([square('white'), square('white')])).toBe(false);
	});
});

describe('applyUpdates', () => {
	it('rejects updates that change nothing', () => {
		const board = emptyBoard();
		const result = applyUpdates(board, new Map([[0, emptyCell()]]));
		expect(result).toEqual({ ok: false, reason: 'no-op' });
	});

	it('rejects updates that overdraw the pile', () => {
		const board = emptyBoard();
		board[0] = square('white');
		const result = applyUpdates(board, new Map([[1, square('white')]]));
		expect(result).toEqual({ ok: false, reason: 'over-budget' });
	});

	it('applies changes without mutating the input board', () => {
		const board = emptyBoard();
		const result = applyUpdates(board, new Map([[0, square('tan')]]));
		expect(result.ok).toBe(true);
		expect(isEmpty(board[0])).toBe(true);
		if (result.ok) {
			expect(result.board[0].slots).toEqual(['tan']);
			expect(boardsEqual(board, result.board)).toBe(false);
		}
	});

	it('treats the update set as one transaction', () => {
		// Individually affordable, jointly over budget.
		const result = applyUpdates(
			emptyBoard(),
			new Map([
				[0, square('white')],
				[1, square('white')]
			])
		);
		expect(result).toEqual({ ok: false, reason: 'over-budget' });
	});
});

describe('groupDelta', () => {
	it('passes through unclamped deltas', () => {
		expect(groupDelta([cellIndex(1, 1)], cellIndex(1, 1), cellIndex(3, 2))).toEqual([2, 1]);
	});

	it('clamps so the whole group stays on the grid', () => {
		const selection = [cellIndex(0, 0), cellIndex(0, COLS - 1)];
		// The group spans the full width, so no horizontal movement fits.
		expect(groupDelta(selection, cellIndex(0, 0), cellIndex(0, 3))).toEqual([0, 0]);
		// Vertical movement clamps at the bottom edge.
		expect(groupDelta(selection, cellIndex(0, 0), cellIndex(ROWS + 3, 0))[0]).toBe(ROWS - 1);
	});
});

describe('board basics', () => {
	it('creates a full empty board', () => {
		const board = emptyBoard();
		expect(board).toHaveLength(CELL_COUNT);
		expect(board.every(isEmpty)).toBe(true);
	});
});
