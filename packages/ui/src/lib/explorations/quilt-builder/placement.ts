/*
 * Placement: what one click does to a cell. Shared by the editing path and
 * the ghost preview so what you see is what you get.
 */

import { centroidOf, rotatedSlots, slotAt, type Point } from './geometry';
import { cellsEqual, emptyCell, type Cell } from './model';

export type Pending =
	/** Paint the clicked slot only. */
	| { mode: 'paint'; layout: string; rotation: number }
	/** Stamp a block: role-0 slots take the fabric, the rest keep what was under them. */
	| { mode: 'stamp'; layout: string; rotation: number }
	/** Stamp a saved block exactly as it was captured. */
	| { mode: 'exact'; layout: string; rotation: number; slots: (string | null)[] };

/*
 * Re-cut a cell's current fabric into a new layout: each new slot takes the
 * color under its centroid. Placing a triangle over a solid square keeps the
 * square's color everywhere the triangle doesn't cover.
 */
export const inheritedSlots = (cell: Cell, layout: string, rotation: number): (string | null)[] =>
	rotatedSlots(layout, rotation).map(
		(s) => cell.slots[slotAt(cell.layout, cell.rotation, centroidOf(s.points))]
	);

export interface Placement {
	cell: Cell;
	slot: number;
}

export const buildPlacement = (
	cell: Cell,
	point: Point,
	pending: Pending,
	materialId: string
): Placement => {
	const matches = cell.layout === pending.layout && cell.rotation === pending.rotation;
	const slot = slotAt(pending.layout, pending.rotation, point);

	if (pending.mode === 'exact') {
		return {
			cell: { layout: pending.layout, rotation: pending.rotation, slots: [...pending.slots] },
			slot
		};
	}

	const slots = matches ? [...cell.slots] : inheritedSlots(cell, pending.layout, pending.rotation);
	if (pending.mode === 'paint' || matches) {
		slots[slot] = materialId;
	} else {
		rotatedSlots(pending.layout, pending.rotation).forEach((s, i) => {
			if (s.role === 0) slots[i] = materialId;
		});
	}
	return { cell: { layout: pending.layout, rotation: pending.rotation, slots }, slot };
};

/** The cell after erasing the slot under `point`. */
export const buildErase = (cell: Cell, point: Point): Cell | null => {
	const slot = slotAt(cell.layout, cell.rotation, point);
	if (cell.slots[slot] === null) return null;
	const slots = cell.slots.map((s, i) => (i === slot ? null : s));
	const next = slots.every((s) => s === null) ? emptyCell() : { ...cell, slots };
	return cellsEqual(next, cell) ? null : next;
};

/** The point keyboard activation should target: the first slot's centroid. */
export const keyboardPoint = (layout: string, rotation: number): Point =>
	centroidOf(rotatedSlots(layout, rotation)[0].points);
