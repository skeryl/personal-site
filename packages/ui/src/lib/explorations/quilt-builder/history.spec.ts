import { describe, expect, it } from 'vitest';
import { HISTORY_CAP, emptyHistory, record, redo, undo } from './history';
import { emptyBoard, leafBlock, type Block, type Board, type LeafBlock } from './model';

const DIMS = { rows: 3, cols: 3 };

const square = (fabric: string): Block => leafBlock('square', 0, [fabric]);

const boardWith = (fabric: string): Board => {
	const board = emptyBoard(DIMS);
	board[0] = square(fabric);
	return board;
};

describe('record', () => {
	it('stores the snapshot and clears redo', () => {
		const withFuture = { past: [], future: [emptyBoard(DIMS)] };
		const next = record(withFuture, boardWith('tan'));
		expect(next.past).toHaveLength(1);
		expect(next.future).toHaveLength(0);
	});

	it('caps the past at HISTORY_CAP entries', () => {
		const full = Array.from({ length: HISTORY_CAP + 5 }, () => emptyBoard(DIMS)).reduce(
			(history, snapshot) => record(history, snapshot),
			emptyHistory()
		);
		expect(full.past).toHaveLength(HISTORY_CAP);
	});

	it('clones the snapshot so later mutation cannot corrupt history', () => {
		const snapshot = boardWith('tan');
		const history = record(emptyHistory(), snapshot);
		snapshot[0] = square('cream');
		expect((history.past[0][0] as LeafBlock).fabrics).toEqual(['tan']);
	});
});

describe('undo/redo', () => {
	it('round-trips through undo and redo', () => {
		const before = boardWith('tan');
		const after = boardWith('cream');
		const history = record(emptyHistory(), before);

		const undone = undo(history, after);
		expect(undone).not.toBeNull();
		expect((undone!.board[0] as LeafBlock).fabrics).toEqual(['tan']);

		const redone = redo(undone!.history, undone!.board);
		expect(redone).not.toBeNull();
		expect((redone!.board[0] as LeafBlock).fabrics).toEqual(['cream']);
	});

	it('returns null with nothing to restore', () => {
		expect(undo(emptyHistory(), emptyBoard(DIMS))).toBeNull();
		expect(redo(emptyHistory(), emptyBoard(DIMS))).toBeNull();
	});

	it('skips snapshots identical to the current board', () => {
		const current = boardWith('tan');
		const older = boardWith('cream');
		// A junk entry equal to the current state sits on top of a real one.
		const history = {
			past: [older, boardWith('tan')],
			future: []
		};
		const undone = undo(history, current);
		expect((undone!.board[0] as LeafBlock).fabrics).toEqual(['cream']);
		// The junk entry was discarded, not left to eat a second undo.
		expect(undone!.history.past).toHaveLength(0);
	});

	it('undo pushes the current board onto redo', () => {
		const history = record(emptyHistory(), boardWith('tan'));
		const undone = undo(history, boardWith('cream'));
		expect(undone!.history.future).toHaveLength(1);
		expect((undone!.history.future[0][0] as LeafBlock).fabrics).toEqual(['cream']);
	});
});
