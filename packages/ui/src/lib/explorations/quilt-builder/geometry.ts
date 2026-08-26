/*
 * Cell geometry.
 *
 * Every cell of the blanket is one square. A cell is subdivided by a
 * "layout": a plain list of polygons over the unit square, drawn from the
 * top-left. Supporting a new piece configuration means adding one entry to
 * LAYOUTS — nothing else in the app needs to know about it.
 *
 * Orientation is not baked into the layouts. Each cell carries a rotation of
 * 0-3 quarter turns that is applied to the polygons at render time, so the
 * horizontal rectangle pair and the vertical pair are the same layout seen
 * from two angles.
 */

export type Point = [number, number];

/** Which physical piece a slot is cut from. Drives inventory accounting. */
export type ShapeKind = 'square' | 'rect' | 'hst' | 'qst';

/** Fraction of one square of fabric each piece consumes. */
export const SHAPE_AREA: Record<ShapeKind, number> = {
	square: 1,
	rect: 1 / 2,
	hst: 1 / 2,
	qst: 1 / 4
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
	/** One square filling the cell. */
	whole: {
		id: 'whole',
		kind: 'square',
		slots: [{ kind: 'square', points: [TL, TR, BR, BL] }]
	},
	/** Two rectangles, split horizontally. Rotate for the vertical pair. */
	half: {
		id: 'half',
		kind: 'rect',
		slots: [
			{
				kind: 'rect',
				points: [TL, TR, [1, 0.5], [0, 0.5]]
			},
			{
				kind: 'rect',
				points: [[0, 0.5], [1, 0.5], BR, BL]
			}
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

export const normalizeTurns = (turns: number): number => ((turns % 4) + 4) % 4;

/** Rotate a point clockwise about the centre of the unit square. */
export const rotatePoint = (point: Point, turns: number): Point =>
	Array.from({ length: normalizeTurns(turns) }).reduce<Point>(([x, y]) => [1 - y, x], point);

/*
 * There are only |layouts| x 4 possible slot lists; memoize them so hot
 * paths (previews recompute per pointer move) reuse frozen instances.
 */
const rotationCache = new Map<string, Slot[]>();

export const rotatedSlots = (layoutId: LayoutId, rotation: number): Slot[] => {
	const turns = normalizeTurns(rotation);
	const key = `${layoutId}:${turns}`;
	const cached = rotationCache.get(key);
	if (cached) return cached;
	const layout = LAYOUTS[layoutId];
	const slots =
		turns === 0
			? layout.slots
			: layout.slots.map((slot) => ({
					...slot,
					points: slot.points.map((p) => rotatePoint(p, turns))
				}));
	rotationCache.set(key, slots);
	return slots;
};

export const toPolygonPoints = (points: readonly Point[], size: number): string =>
	points.map(([x, y]) => `${x * size},${y * size}`).join(' ');

export const centroidOf = (points: readonly Point[]): Point => [
	points.reduce((sum, [x]) => sum + x, 0) / points.length,
	points.reduce((sum, [, y]) => sum + y, 0) / points.length
];

/** Ray casting, so a click can be resolved to the slot it landed in. */
export const pointInPolygon = ([px, py]: Point, points: readonly Point[]): boolean =>
	points.reduce((inside, [xi, yi], i) => {
		const [xj, yj] = points[(i + points.length - 1) % points.length];
		const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
		return intersects ? !inside : inside;
	}, false);

/*
 * Points exactly on the far edges (x or y of 1) fall outside every polygon's
 * strict inequalities; clamp just inside so edge clicks resolve to the edge
 * slot instead of falling through to slot 0.
 */
const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1 - 1e-6);

/** Which slot of `layoutId` contains the unit-square point, or 0 as a fallback. */
export const slotAt = (layoutId: LayoutId, rotation: number, [x, y]: Point): number => {
	const point: Point = [clamp01(x), clamp01(y)];
	const hit = rotatedSlots(layoutId, rotation).findIndex((slot) =>
		pointInPolygon(point, slot.points)
	);
	return hit === -1 ? 0 : hit;
};
