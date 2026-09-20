/*
 * Undo/redo as a pure structure. Callers record the PRE-change snapshot of a
 * gesture only once something actually changes, so no-op gestures can never
 * eat an undo press or wipe the redo stack.
 *
 * A snapshot is the board AND the palette. They are one document: recolouring
 * a fabric changes every piece cut from it, so an undo that put the pieces
 * back but not the colour would be no undo at all.
 */

import type { Material } from './data';
import { boardsEqual, cloneBoard, type Board } from './model';

export interface Snapshot {
	readonly board: Board;
	readonly materials: readonly Material[];
}

export interface History {
	readonly past: readonly Snapshot[];
	readonly future: readonly Snapshot[];
}

export const HISTORY_CAP = 200;

export const emptyHistory = (): History => ({ past: [], future: [] });

const clone = (snapshot: Snapshot): Snapshot => ({
	board: cloneBoard(snapshot.board),
	materials: snapshot.materials.map((material) => ({ ...material }))
});

const materialsEqual = (a: readonly Material[], b: readonly Material[]): boolean =>
	a.length === b.length &&
	a.every((material, i) => {
		const other = b[i];
		return material.id === other.id && material.hex === other.hex && material.name === other.name;
	});

const sameState = (a: Snapshot, b: Snapshot): boolean =>
	boardsEqual(a.board, b.board) && materialsEqual(a.materials, b.materials);

/** Record a pre-change snapshot. Any new edit invalidates redo. */
export const record = (history: History, snapshot: Snapshot): History => ({
	past: [...history.past.slice(1 - HISTORY_CAP), clone(snapshot)],
	future: []
});

export interface Restore {
	history: History;
	snapshot: Snapshot;
}

const lastDifferent = (snapshots: readonly Snapshot[], current: Snapshot): number =>
	snapshots.reduce((found, snapshot, i) => (sameState(snapshot, current) ? found : i), -1);

export const undo = (history: History, current: Snapshot): Restore | null => {
	const index = lastDifferent(history.past, current);
	if (index === -1) return null;
	return {
		history: {
			past: history.past.slice(0, index),
			future: [...history.future, clone(current)]
		},
		snapshot: clone(history.past[index])
	};
};

export const redo = (history: History, current: Snapshot): Restore | null => {
	const index = lastDifferent(history.future, current);
	if (index === -1) return null;
	return {
		history: {
			past: [...history.past.slice(1 - HISTORY_CAP), clone(current)],
			future: history.future.slice(0, index)
		},
		snapshot: clone(history.future[index])
	};
};
