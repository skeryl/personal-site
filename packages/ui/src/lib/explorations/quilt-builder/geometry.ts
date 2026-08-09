/*
 * Cell geometry.
 *
 * Every cell of the blanket is one 8in square. A cell is subdivided by a
 * "layout": a plain list of polygons over the unit square, drawn from the
 * top-left. Supporting a new piece configuration means adding one entry to
 * LAYOUTS — nothing else in the app needs to know about it.
 *
 * Orientation is not baked into the layouts. Each cell carries a rotation of
 * 0-3 quarter turns that is applied to the polygons at render time, so the
 * horizontal 8x4 rectangle and the vertical 4x8 rectangle are the same layout
 * seen from two angles.
 */

export type Point = [number, number];

/** Which physical piece a slot is cut from. Drives inventory accounting. */
export type ShapeKind = 'square' | 'rect' | 'hst' | 'qst';

/** Fraction of one 8in square of fabric each piece consumes. */
export const SHAPE_AREA: Record<ShapeKind, number> = {
	square: 1,
	rect: 1 / 2,
	hst: 1 / 2,
	qst: 1 / 4
};

export const SHAPE_LABEL: Record<ShapeKind, string> = {
	square: 'Square',
	rect: 'Rectangle',
	hst: 'Triangle',
	qst: 'Half triangle'
};

/** Cut dimensions in inches, for the cutting list. */
export const SHAPE_CUT: Record<ShapeKind, string> = {
	square: '8" × 8"',
	rect: '8" × 4"',
	hst: '8" square, cut corner to corner',
	qst: '8" square, cut both diagonals'
};

export interface Slot {
	kind: ShapeKind;
	points: Point[];
}

export type LayoutId = 'whole' | 'half' | 'diagonal' | 'quarters';

export interface Layout {
	id: LayoutId;
	/** The piece this layout is built from; also the palette entry that selects it. */
	kind: ShapeKind;
	slots: Slot[];
}

const TL: Point = [0, 0];
const TR: Point = [1, 0];
const BR: Point = [1, 1];
const BL: Point = [0, 1];
const MID: Point = [0.5, 0.5];

export const LAYOUTS: Record<LayoutId, Layout> = {
	/** One 8x8 square filling the cell. */
	whole: {
		id: 'whole',
		kind: 'square',
		slots: [{ kind: 'square', points: [TL, TR, BR, BL] }]
	},
	/** Two 8x4 rectangles, split horizontally. Rotate for the vertical pair. */
	half: {
		id: 'half',
		kind: 'rect',
		slots: [
			{ kind: 'rect', points: [TL, TR, [1, 0.5], [0, 0.5]] },
			{ kind: 'rect', points: [[0, 0.5], [1, 0.5], BR, BL] }
		]
	},
	/** Two half-square triangles, split top-left to bottom-right. */
	diagonal: {
		id: 'diagonal',
		kind: 'hst',
		slots: [
			{ kind: 'hst', points: [TL, TR, BR] },
			{ kind: 'hst', points: [TL, BR, BL] }
		]
	},
	/** Four quarter-square triangles meeting at the centre. */
	quarters: {
		id: 'quarters',
		kind: 'qst',
		slots: [
			{ kind: 'qst', points: [TL, TR, MID] },
			{ kind: 'qst', points: [TR, BR, MID] },
			{ kind: 'qst', points: [BR, BL, MID] },
			{ kind: 'qst', points: [BL, TL, MID] }
		]
	}
};

/** The palette lists pieces in the order they were described. */
export const PIECE_ORDER: LayoutId[] = ['whole', 'half', 'diagonal', 'quarters'];

/** Rotate a point clockwise about the centre of the unit square. */
function rotatePoint([x, y]: Point, turns: number): Point {
	let p: Point = [x, y];
	for (let i = 0; i < (turns % 4) + (turns < 0 ? 4 : 0); i++) {
		p = [1 - p[1], p[0]];
	}
	return p;
}

export function rotatedSlots(layoutId: LayoutId, rotation: number): Slot[] {
	const layout = LAYOUTS[layoutId];
	if (!rotation) return layout.slots;
	return layout.slots.map((slot) => ({
		...slot,
		points: slot.points.map((p) => rotatePoint(p, rotation))
	}));
}

export function toPolygonPoints(points: Point[], size: number): string {
	return points.map(([x, y]) => `${x * size},${y * size}`).join(' ');
}

/** Ray casting, so a click can be resolved to the slot it landed in. */
export function pointInPolygon([px, py]: Point, points: Point[]): boolean {
	let inside = false;
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i];
		const [xj, yj] = points[j];
		const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
}

/** Which slot of `layoutId` contains the unit-square point, or 0 as a fallback. */
export function slotAt(layoutId: LayoutId, rotation: number, point: Point): number {
	const slots = rotatedSlots(layoutId, rotation);
	const hit = slots.findIndex((slot) => pointInPolygon(point, slot.points));
	return hit === -1 ? 0 : hit;
}
