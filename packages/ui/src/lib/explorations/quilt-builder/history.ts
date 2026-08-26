/*
 * Undo/redo as a pure structure. Callers record the PRE-change snapshot of a
 * gesture only once something actually changes, so no-op gestures can never
 * eat an undo press or wipe the redo stack.
 */

import { boardsEqual, cloneBoard, type Board } from './model';

export interface History {
	readonly past: readonly Board[];
	readonly future: readonly Board[];
}

export const HISTORY_CAP = 200;

export const emptyHistory = (): History => ({ past: [], future: [] });

/** Record a pre-change snapshot. Any new edit invalidates redo. */
export const record = (history: History, snapshot: Board): History => ({
	past: [...history.past.slice(1 - HISTORY_CAP), cloneBoard(snapshot)],
	future: []
});

export interface Restore {
	history: History;
	board: Board;
}

const lastDifferent = (boards: readonly Board[], current: Board): number =>
	boards.reduce((found, board, i) => (boardsEqual(board, current) ? found : i), -1);

export const undo = (history: History, current: Board): Restore | null => {
	const index = lastDifferent(history.past, current);
	if (index === -1) return null;
	return {
		history: {
			past: history.past.slice(0, index),
			future: [...history.future, cloneBoard(current)]
		},
		board: cloneBoard(history.past[index])
	};
};

export const redo = (history: History, current: Board): Restore | null => {
	const index = lastDifferent(history.future, current);
	if (index === -1) return null;
	return {
		history: {
			past: [...history.past.slice(1 - HISTORY_CAP), cloneBoard(current)],
			future: history.future.slice(0, index)
		},
		board: cloneBoard(history.future[index])
	};
};
