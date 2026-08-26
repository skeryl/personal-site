/*
 * Cutting spec: real-world counts per pattern.
 *
 * Shane's order of operations: every piece starts from one cut blank
 * (finished size + seam allowance both sides). Rectangles are the blank
 * folded in half and cut on the fold; triangles are the blank cut on one or
 * both diagonals. Piece dimensions are subdivisions of the blank, by design;
 * do not "correct" them to standard quilting formulas.
 */

import { FABRICS, FABRIC_BY_ID, SEAM_INCHES, SQUARE_INCHES, type Fabric } from './data';
import { LAYOUTS, rotatedSlots, type LayoutId, type ShapeKind } from './geometry';
import { colOf, isEmpty, rowOf, type Cell } from './model';

/** Pieces cut from one blank, per kind. */
export const CUT_YIELD: Record<ShapeKind, number> = { square: 1, rect: 2, hst: 2, qst: 4 };

const KIND_ORDER: readonly ShapeKind[] = ['square', 'rect', 'hst', 'qst'];

export const BLANK_INCHES = SQUARE_INCHES + 2 * SEAM_INCHES;

export const CUT_DIMS: Record<ShapeKind, string> = {
	square: `${BLANK_INCHES}”x${BLANK_INCHES}”`,
	rect: `${BLANK_INCHES / 2}”x${BLANK_INCHES}”`,
	hst: `${BLANK_INCHES}”x${BLANK_INCHES}” square cut corner to corner`,
	qst: `${BLANK_INCHES}”x${BLANK_INCHES}” square cut on both diagonals`
};

export const KIND_NOUN: Record<ShapeKind, string> = {
	square: 'square',
	rect: 'rectangle',
	hst: 'triangle',
	qst: 'half triangle'
};

/** kind -> the layout built from it, derived from LAYOUTS itself. */
export const KIND_LAYOUT: Record<ShapeKind, LayoutId> = Object.values(LAYOUTS).reduce(
	(out, layout) => ({ ...out, [layout.kind]: layout.id }),
	{} as Record<ShapeKind, LayoutId>
);

export interface CutRow {
	kind: ShapeKind;
	count: number;
	/** Blanks to cut for these pieces, rounded up by yield. */
	squares: number;
}

export interface CutGroup {
	fabric: Fabric;
	rows: CutRow[];
	totalSquares: number;
}

export const cuttingListFor = (cells: readonly Cell[]): CutGroup[] => {
	const byFabric = cells.reduce((map, cell) => {
		const defs = LAYOUTS[cell.layout].slots;
		cell.slots.forEach((id, i) => {
			if (!id) return;
			const counts = map.get(id) ?? new Map<ShapeKind, number>();
			counts.set(defs[i].kind, (counts.get(defs[i].kind) ?? 0) + 1);
			map.set(id, counts);
		});
		return map;
	}, new Map<string, Map<ShapeKind, number>>());

	return FABRICS.filter((fabric) => byFabric.has(fabric.id)).map((fabric) => {
		const counts = byFabric.get(fabric.id)!;
		const rows = KIND_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
			kind,
			count: counts.get(kind)!,
			squares: Math.ceil(counts.get(kind)! / CUT_YIELD[kind])
		}));
		return {
			fabric,
			rows,
			totalSquares: rows.reduce((sum, row) => sum + row.squares, 0)
		};
	});
};

/** SVG user units per cell in pattern thumbnails. */
export const THUMB_SCALE = 10;

export interface ThumbPoly {
	points: string;
	fill: string;
}

/** Flatten a saved pattern into offset polygons for a thumbnail SVG. */
export const thumbPolys = (cells: readonly Cell[]): ThumbPoly[] =>
	cells.flatMap((cell, i) => {
		if (isEmpty(cell)) return [];
		const row = rowOf(i);
		const col = colOf(i);
		return rotatedSlots(cell.layout, cell.rotation).map((slot, s) => ({
			points: slot.points
				.map(([x, y]) => `${(col + x) * THUMB_SCALE},${(row + y) * THUMB_SCALE}`)
				.join(' '),
			fill: cell.slots[s] ? FABRIC_BY_ID[cell.slots[s]!].hex : '#ffffff'
		}));
	});
