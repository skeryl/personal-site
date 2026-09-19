/*
 * Cell geometry.
 *
 * Every cell of the quilt is one block. A cell is subdivided by a "layout": a
 * list of polygons over the unit square. Pieces and blocks are both layouts;
 * blocks just have more polygons. Adding a new piece or block means adding
 * one entry to LAYOUTS.
 *
 * Each slot records which cut piece it is (kind), the size of the cut blank
 * it comes from as a fraction of the block (frac), and a role used for icons
 * and for stamping blocks: role 0 takes the selected fabric, other roles keep
 * whatever was underneath.
 */

export type Point = [number, number];

export type ShapeKind = 'square' | 'rect' | 'hst' | 'qst';

export interface Slot {
	kind: ShapeKind;
	frac: number;
	role: number;
	points: Point[];
}

export type LayoutGroup = 'piece' | 'block';

export interface Layout {
	id: string;
	name: string;
	group: LayoutGroup;
	slots: Slot[];
}

const TL: Point = [0, 0];
const TR: Point = [1, 0];
const BR: Point = [1, 1];
const BL: Point = [0, 1];
const MID: Point = [0.5, 0.5];

export const normalizeTurns = (turns: number): number => ((turns % 4) + 4) % 4;

/** Rotate a point clockwise about the centre of the unit square. */
export const rotatePoint = (point: Point, turns: number): Point =>
	Array.from({ length: normalizeTurns(turns) }).reduce<Point>(([x, y]) => [1 - y, x], point);

const slot = (kind: ShapeKind, frac: number, role: number, points: Point[]): Slot => ({
	kind,
	frac,
	role,
	points
});

/** Repeat a top-left quadrant's slots around all four quadrants. */
const spin = (quadrant: Slot[], roleOf: (turn: number, base: number) => number = (_, r) => r) =>
	[0, 1, 2, 3].flatMap((turn) =>
		quadrant.map((s) => ({
			...s,
			role: roleOf(turn, s.role),
			points: s.points.map((p) => rotatePoint(p, turn))
		}))
	);

/** One flying-geese unit filling the left half of the cell, goose pointing right. */
const geeseUnit = (x0: number, gooseRole: number, skyRole: number): Slot[] => [
	slot('qst', 1, gooseRole, [
		[x0, 0],
		[x0 + 0.5, 0.5],
		[x0, 1]
	]),
	slot('hst', 0.5, skyRole, [
		[x0, 0],
		[x0 + 0.5, 0],
		[x0 + 0.5, 0.5]
	]),
	slot('hst', 0.5, skyRole, [
		[x0, 1],
		[x0 + 0.5, 1],
		[x0 + 0.5, 0.5]
	])
];

const PIECES: Layout[] = [
	{ id: 'square', name: 'Square', group: 'piece', slots: [slot('square', 1, 0, [TL, TR, BR, BL])] },
	{
		id: 'rectangle',
		name: 'Rectangle',
		group: 'piece',
		slots: [
			slot('rect', 1, 0, [TL, [0.5, 0], [0.5, 1], BL]),
			slot('rect', 1, 1, [[0.5, 0], TR, BR, [0.5, 1]])
		]
	},
	{
		id: 'hst',
		name: 'Half square triangle',
		group: 'piece',
		slots: [slot('hst', 1, 0, [TL, BR, BL]), slot('hst', 1, 1, [TL, TR, BR])]
	},
	{
		id: 'flying-geese',
		name: 'Flying geese',
		group: 'piece',
		slots: [...geeseUnit(0, 1, 0), ...geeseUnit(0.5, 2, 2)]
	}
];

const BLOCKS: Layout[] = [
	{
		id: 'pinwheel',
		name: 'Pinwheel',
		group: 'block',
		slots: spin([
			slot('hst', 0.5, 0, [TL, [0.5, 0], MID]),
			slot('hst', 0.5, 1, [TL, MID, [0, 0.5]])
		])
	},
	{
		id: 'broken-dishes',
		name: 'Broken dishes',
		group: 'block',
		slots: spin([
			slot('hst', 0.5, 0, [TL, [0.5, 0], [0, 0.5]]),
			slot('hst', 0.5, 1, [[0.5, 0], MID, [0, 0.5]])
		])
	},
	{
		id: 'hourglass',
		name: 'Hourglass',
		group: 'block',
		slots: spin([slot('qst', 1, 0, [TL, TR, MID])], (turn) => turn % 2)
	},
	{
		id: 'square-in-square',
		name: 'Square in a square',
		group: 'block',
		slots: [
			slot('square', Math.SQRT1_2, 0, [
				[0.5, 0],
				[1, 0.5],
				[0.5, 1],
				[0, 0.5]
			]),
			...spin([slot('hst', 0.5, 1, [TL, [0.5, 0], [0, 0.5]])])
		]
	},
	{
		id: 'four-patch',
		name: 'Four patch',
		group: 'block',
		slots: spin([slot('square', 0.5, 0, [TL, [0.5, 0], MID, [0, 0.5]])], (turn) => turn % 2)
	},
	{
		id: 'nine-patch',
		name: 'Nine patch',
		group: 'block',
		slots: [0, 1, 2].flatMap((row) =>
			[0, 1, 2].map((col) =>
				slot('square', 1 / 3, (row + col) % 2, [
					[col / 3, row / 3],
					[(col + 1) / 3, row / 3],
					[(col + 1) / 3, (row + 1) / 3],
					[col / 3, (row + 1) / 3]
				])
			)
		)
	},
	{
		id: 'sawtooth-star',
		name: 'Sawtooth star',
		group: 'block',
		slots: [
			slot('square', 0.5, 1, [
				[0.25, 0.25],
				[0.75, 0.25],
				[0.75, 0.75],
				[0.25, 0.75]
			]),
			...spin([
				slot('square', 0.25, 1, [TL, [0.25, 0], [0.25, 0.25], [0, 0.25]]),
				slot('qst', 0.5, 0, [
					[0.25, 0.25],
					[0.5, 0],
					[0.75, 0.25]
				]),
				slot('hst', 0.25, 1, [
					[0.25, 0],
					[0.5, 0],
					[0.25, 0.25]
				]),
				slot('hst', 0.25, 1, [
					[0.5, 0],
					[0.75, 0],
					[0.75, 0.25]
				])
			])
		]
	}
];

export const LAYOUTS: Record<string, Layout> = Object.fromEntries(
	[...PIECES, ...BLOCKS].map((layout) => [layout.id, layout])
);

export const PIECE_LAYOUTS: readonly Layout[] = PIECES;
export const BLOCK_LAYOUTS: readonly Layout[] = BLOCKS;

export const isLayoutId = (value: unknown): value is string =>
	typeof value === 'string' && value in LAYOUTS;

/*
 * There are only |layouts| x 4 possible slot lists; memoize them so hot
 * paths (previews recompute per pointer move) reuse frozen instances.
 */
const rotationCache = new Map<string, Slot[]>();

export const rotatedSlots = (layoutId: string, rotation: number): Slot[] => {
	const turns = normalizeTurns(rotation);
	const key = `${layoutId}:${turns}`;
	const cached = rotationCache.get(key);
	if (cached) return cached;
	const layout = LAYOUTS[layoutId];
	const slots =
		turns === 0
			? layout.slots
			: layout.slots.map((s) => ({ ...s, points: s.points.map((p) => rotatePoint(p, turns)) }));
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
export const slotAt = (layoutId: string, rotation: number, [x, y]: Point): number => {
	const point: Point = [clamp01(x), clamp01(y)];
	const hit = rotatedSlots(layoutId, rotation).findIndex((s) => pointInPolygon(point, s.points));
	return hit === -1 ? 0 : hit;
};
