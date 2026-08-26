import { describe, expect, it } from 'vitest';
import { centroidOf, rotatedSlots } from './geometry';
import { emptyBoard, type Cell } from './model';
import { buildPlacement, inheritedSlots, keyboardPoint } from './placement';

const square = (fabric: string): Cell => ({ layout: 'whole', rotation: 0, slots: [fabric] });

describe('inheritedSlots', () => {
	it('recuts a solid square into quarters of the same fabric', () => {
		expect(inheritedSlots(square('tan'), 'quarters', 0)).toEqual(['tan', 'tan', 'tan', 'tan']);
	});

	it('recuts a diagonal into a rectangle pair by centroid', () => {
		const cell: Cell = { layout: 'diagonal', rotation: 0, slots: ['teal-deep', 'teal-mint'] };
		// Top strip centroid sits in the upper triangle, bottom in the lower.
		expect(inheritedSlots(cell, 'half', 0)).toEqual(['teal-deep', 'teal-mint']);
	});

	it('keeps empty cells empty', () => {
		expect(inheritedSlots({ layout: 'whole', rotation: 0, slots: [null] }, 'diagonal', 0)).toEqual([
			null,
			null
		]);
	});
});

describe('buildPlacement', () => {
	const piece = { layout: 'whole', rotation: 0 } as const;

	it('places into an empty cell', () => {
		const result = buildPlacement(emptyBoard(), 0, [0.5, 0.5], piece, 'tan');
		expect(result.blocked).toBe(false);
		expect(result.cell.slots).toEqual(['tan']);
	});

	it('adds to a matching layout without resetting other slots', () => {
		const board = emptyBoard();
		board[0] = { layout: 'diagonal', rotation: 0, slots: ['teal-deep', null] };
		const result = buildPlacement(
			board,
			0,
			[0.2, 0.7],
			{ layout: 'diagonal', rotation: 0 },
			'teal-mint'
		);
		expect(result.cell.slots).toEqual(['teal-deep', 'teal-mint']);
	});

	it('preserves existing fabric when a different layout is placed on top', () => {
		const board = emptyBoard();
		board[0] = square('teal-deep');
		const result = buildPlacement(
			board,
			0,
			[0.5, 0.1],
			{ layout: 'quarters', rotation: 0 },
			'orchid'
		);
		expect(result.blocked).toBe(false);
		expect(result.cell.slots).toEqual(['orchid', 'teal-deep', 'teal-deep', 'teal-deep']);
	});

	it('blocks when the pile has nothing left of the placed fabric', () => {
		const board = emptyBoard();
		board[5] = square('white'); // white's entire count of 1
		const result = buildPlacement(board, 0, [0.5, 0.5], piece, 'white');
		expect(result.blocked).toBe(true);
		expect(result.cell).toBe(board[0]);
	});

	it('allows re-placing the fabric already in the slot even at zero remaining', () => {
		const board = emptyBoard();
		board[0] = square('white');
		const result = buildPlacement(board, 0, [0.5, 0.5], piece, 'white');
		expect(result.blocked).toBe(false);
	});

	it('drops inherited slots the pile can no longer cover', () => {
		// A board loaded over budget: two white squares against a count of one.
		const board = emptyBoard();
		board[0] = square('white');
		board[1] = square('white');
		const result = buildPlacement(board, 0, [0.5, 0.1], { layout: 'quarters', rotation: 0 }, 'tan');
		expect(result.blocked).toBe(false);
		// The placed tan quarter survives; the inherited white quarters do not.
		expect(result.cell.slots).toEqual(['tan', null, null, null]);
	});
});

describe('keyboardPoint', () => {
	it('targets the first slot of the pending piece', () => {
		const point = keyboardPoint({ layout: 'diagonal', rotation: 0 });
		expect(point).toEqual(centroidOf(rotatedSlots('diagonal', 0)[0].points));
	});
});
