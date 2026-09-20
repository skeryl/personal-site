import { describe, expect, it } from 'vitest';
import { HISTORY_CAP, emptyHistory, record, redo, undo, type Snapshot } from './history';
import { emptyBoard, leafBlock, type Block, type Board, type LeafBlock } from './model';

const DIMS = { rows: 3, cols: 3 };

const square = (fabric: string): Block => leafBlock('square', 0, [fabric]);

const boardWith = (fabric: string): Board => {
	const board = emptyBoard(DIMS);
	board[0] = square(fabric);
	return board;
};

const PALETTE = [{ id: 'tan', name: 'Tan', hex: '#d2b48c' }];

const shot = (fabric: string, materials = PALETTE): Snapshot => ({
	board: boardWith(fabric),
	materials
});

const blank = (): Snapshot => ({ board: emptyBoard(DIMS), materials: PALETTE });

/** The fabric in the top-left square of a snapshot. */
const fabricOf = (snapshot: Snapshot) => (snapshot.board[0] as LeafBlock).fabrics;

describe('record', () => {
	it('stores the snapshot and clears redo', () => {
		const withFuture = { past: [], future: [blank()] };
		const next = record(withFuture, shot('tan'));
		expect(next.past).toHaveLength(1);
		expect(next.future).toHaveLength(0);
	});

	it('caps the past at HISTORY_CAP entries', () => {
		const full = Array.from({ length: HISTORY_CAP + 5 }, blank).reduce(
			(history, snapshot) => record(history, snapshot),
			emptyHistory()
		);
		expect(full.past).toHaveLength(HISTORY_CAP);
	});

	it('clones the snapshot so later mutation cannot corrupt history', () => {
		const snapshot = shot('tan');
		const history = record(emptyHistory(), snapshot);
		snapshot.board[0] = square('cream');
		expect(fabricOf(history.past[0])).toEqual(['tan']);
	});
});

describe('undo/redo', () => {
	it('round-trips through undo and redo', () => {
		const history = record(emptyHistory(), shot('tan'));

		const undone = undo(history, shot('cream'));
		expect(undone).not.toBeNull();
		expect(fabricOf(undone!.snapshot)).toEqual(['tan']);

		const redone = redo(undone!.history, undone!.snapshot);
		expect(redone).not.toBeNull();
		expect(fabricOf(redone!.snapshot)).toEqual(['cream']);
	});

	it('returns null with nothing to restore', () => {
		expect(undo(emptyHistory(), blank())).toBeNull();
		expect(redo(emptyHistory(), blank())).toBeNull();
	});

	it('skips snapshots identical to the current state', () => {
		// A junk entry equal to the current state sits on top of a real one.
		const history = { past: [shot('cream'), shot('tan')], future: [] };
		const undone = undo(history, shot('tan'));
		expect(fabricOf(undone!.snapshot)).toEqual(['cream']);
		// The junk entry was discarded, not left to eat a second undo.
		expect(undone!.history.past).toHaveLength(0);
	});

	it('undo pushes the current state onto redo', () => {
		const history = record(emptyHistory(), shot('tan'));
		const undone = undo(history, shot('cream'));
		expect(undone!.history.future).toHaveLength(1);
		expect(fabricOf(undone!.history.future[0])).toEqual(['cream']);
	});

	/*
	 * The palette is half the snapshot. Recolouring a fabric changes every
	 * piece cut from it, so an undo that ignored the palette would be no undo.
	 */
	it('counts a recoloured palette as a change, and puts it back', () => {
		const before = shot('tan');
		const after = shot('tan', [{ id: 'tan', name: 'Tan', hex: '#000000' }]);
		const history = record(emptyHistory(), before);

		const undone = undo(history, after);
		expect(undone).not.toBeNull();
		expect(undone!.snapshot.materials[0].hex).toBe('#d2b48c');
	});
});
