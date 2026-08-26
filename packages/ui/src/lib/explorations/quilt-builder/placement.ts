/*
 * Placement: what one click of the paint tool does to a cell. Shared by the
 * editing path and the ghost preview so what you see is what you get.
 */

import {
	LAYOUTS,
	SHAPE_AREA,
	centroidOf,
	rotatedSlots,
	slotAt,
	type LayoutId,
	type Point
} from './geometry';
import { remainingOf, usageOf, type Cell } from './model';

export interface PendingPiece {
	layout: LayoutId;
	rotation: number;
}

export interface Placement {
	cell: Cell;
	slot: number;
	blocked: boolean;
}

/*
 * Re-cut a cell's current fabric into a new layout: each new slot takes the
 * color under its centroid. Placing a triangle over a solid square keeps the
 * square's color everywhere the triangle doesn't cover.
 */
export const inheritedSlots = (cell: Cell, layout: LayoutId, rotation: number): (string | null)[] =>
	rotatedSlots(layout, rotation).map(
		(slot) => cell.slots[slotAt(cell.layout, cell.rotation, centroidOf(slot.points))]
	);

/**
 * Work out the exact cell a placement click would produce. The placed slot
 * is budgeted first; inherited slots that no longer fit the scrap pile fall
 * back to empty. The whole cell is being rebuilt, so its current usage is
 * refundable.
 */
export const buildPlacement = (
	board: readonly Cell[],
	index: number,
	point: Point,
	piece: PendingPiece,
	fabricId: string
): Placement => {
	const cell = board[index];
	const matches = cell.layout === piece.layout && cell.rotation === piece.rotation;
	const slots = matches ? [...cell.slots] : inheritedSlots(cell, piece.layout, piece.rotation);
	const target: Cell = matches
		? { layout: cell.layout, rotation: cell.rotation, slots }
		: { layout: piece.layout, rotation: piece.rotation, slots };
	const defs = LAYOUTS[target.layout].slots;
	const slot = slotAt(target.layout, target.rotation, point);

	const remaining = remainingOf(usageOf(board));
	const before = usageOf([cell]);
	const avail = Object.fromEntries(
		Object.entries(remaining).map(([id, left]) => [id, left + (before[id] ?? 0)])
	);

	if ((avail[fabricId] ?? 0) < SHAPE_AREA[defs[slot].kind]) {
		return { cell, slot, blocked: true };
	}
	slots[slot] = fabricId;
	avail[fabricId] -= SHAPE_AREA[defs[slot].kind];
	slots.forEach((id, i) => {
		if (i === slot || !id) return;
		const area = SHAPE_AREA[defs[i].kind];
		if (avail[id] >= area) avail[id] -= area;
		else slots[i] = null;
	});
	return { cell: target, slot, blocked: false };
};

/** The point keyboard activation should target: the first slot's centroid. */
export const keyboardPoint = (piece: PendingPiece): Point =>
	centroidOf(rotatedSlots(piece.layout, piece.rotation)[0].points);
