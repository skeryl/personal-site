/*
 * Cuts: how one block is divided into pieces.
 *
 * A "cut" is a list of polygons over the unit square. A piece is one of those
 * polygons: a single shape of fabric. Simple cuts (square, half square
 * triangle) and compound ones (sawtooth star) are the same kind of thing;
 * compound ones just have more pieces. Adding a new one means adding one
 * entry to CUTS.
 *
 * Each piece records which cut shape it is (kind), the size of the cut blank
 * it comes from as a fraction of the block (frac), and a role used for icons
 * and for stamping: role 0 takes the selected fabric, other roles keep
 * whatever was underneath.
 *
 * Blocks that are really a grid of smaller blocks (a pinwheel is four half
 * square triangles) are not cuts. They live in `blocks.ts` as compositions.
 */

export type Point = [number, number];

export type ShapeKind = 'square' | 'rect' | 'hst' | 'qst';

/** One polygon of a cut: the shape of a single piece of fabric. */
export interface PieceShape {
	kind: ShapeKind;
	frac: number;
	role: number;
	points: Point[];
}

/**
 * 'legacy' cuts are not offered in the palette. They exist only so saved
 * designs that predate block composition can be read and converted; delete
 * them once no stored state references them.
 */
export type CutGroup = 'piece' | 'block' | 'legacy';

export interface Cut {
	id: string;
	name: string;
	/*
	 * What a quilter calls it in a pattern, where the full name would run on.
	 * Only the ones with a shorthand in the trade carry this.
	 */
	abbr?: string;
	group: CutGroup;
	pieces: PieceShape[];
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

const piece = (kind: ShapeKind, frac: number, role: number, points: Point[]): PieceShape => ({
	kind,
	frac,
	role,
	points
});

/** Repeat a top-left quadrant's pieces around all four quadrants. */
const spin = (
	quadrant: PieceShape[],
	roleOf: (turn: number, base: number) => number = (_, r) => r
) =>
	[0, 1, 2, 3].flatMap((turn) =>
		quadrant.map((s) => ({
			...s,
			role: roleOf(turn, s.role),
			points: s.points.map((p) => rotatePoint(p, turn))
		}))
	);

/** One flying-geese unit filling the left half of the cell, goose pointing right. */
const geeseUnit = (x0: number, gooseRole: number, skyRole: number): PieceShape[] => [
	piece('qst', 1, gooseRole, [
		[x0, 0],
		[x0 + 0.5, 0.5],
		[x0, 1]
	]),
	piece('hst', 0.5, skyRole, [
		[x0, 0],
		[x0 + 0.5, 0],
		[x0 + 0.5, 0.5]
	]),
	piece('hst', 0.5, skyRole, [
		[x0, 1],
		[x0 + 0.5, 1],
		[x0 + 0.5, 0.5]
	])
];

/*
 * How a role reads with no fabric behind it: the greys the palette icons are
 * drawn in, so an uncoloured shape on the quilt looks like its own icon.
 */
/*
 * The two greys a shape is drawn in before it has any fabric — the design's
 * own, warm rather than neutral, so an uncoloured block sits with the cream
 * the quilt is ruled in instead of against it.
 */
export const ROLE_FILL = ['#83817d', '#d9d9d9'];

/*
 * The grey a piece of this role is drawn in before it has any fabric. A shape
 * with more parts than there are named roles — flying geese has three — takes
 * the last of them for the rest, so it draws in cloth rather than in a hole.
 */
export const roleFill = (role: number): string =>
	ROLE_FILL[role] ?? ROLE_FILL[ROLE_FILL.length - 1];

const PIECES: Cut[] = [
	{
		id: 'square',
		name: 'Square',
		group: 'piece',
		pieces: [piece('square', 1, 0, [TL, TR, BR, BL])]
	},
	{
		id: 'rectangle',
		name: 'Rectangle',
		group: 'piece',
		pieces: [
			piece('rect', 1, 0, [TL, [0.5, 0], [0.5, 1], BL]),
			piece('rect', 1, 1, [[0.5, 0], TR, BR, [0.5, 1]])
		]
	},
	{
		id: 'hst',
		name: 'Half square triangle',
		abbr: 'HST',
		group: 'piece',
		pieces: [piece('hst', 1, 0, [TL, BR, BL]), piece('hst', 1, 1, [TL, TR, BR])]
	},
	{
		id: 'flying-geese',
		name: 'Flying geese',
		group: 'piece',
		pieces: [...geeseUnit(0, 1, 0), ...geeseUnit(0.5, 2, 2)]
	}
];

/*
 * Cuts that subdivide the block in ways a uniform grid cannot express:
 * triangles meeting at the centre, a square on point, or the 1:2:1 column
 * proportions of a sawtooth star.
 */
const BLOCKS: Cut[] = [
	{
		id: 'hourglass',
		name: 'Hourglass',
		group: 'block',
		pieces: spin([piece('qst', 1, 0, [TL, TR, MID])], (turn) => turn % 2)
	},
	{
		id: 'square-in-square',
		name: 'Square in a square',
		group: 'block',
		pieces: [
			piece('square', Math.SQRT1_2, 0, [
				[0.5, 0],
				[1, 0.5],
				[0.5, 1],
				[0, 0.5]
			]),
			...spin([piece('hst', 0.5, 1, [TL, [0.5, 0], [0, 0.5]])])
		]
	},
	{
		id: 'nine-patch',
		name: 'Nine patch',
		group: 'block',
		pieces: [0, 1, 2].flatMap((row) =>
			[0, 1, 2].map((col) =>
				piece('square', 1 / 3, (row + col) % 2, [
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
		pieces: [
			piece('square', 0.5, 1, [
				[0.25, 0.25],
				[0.75, 0.25],
				[0.75, 0.75],
				[0.25, 0.75]
			]),
			...spin([
				piece('square', 0.25, 1, [TL, [0.25, 0], [0.25, 0.25], [0, 0.25]]),
				piece('qst', 0.5, 0, [
					[0.25, 0.25],
					[0.5, 0],
					[0.75, 0.25]
				]),
				piece('hst', 0.25, 1, [
					[0.25, 0],
					[0.5, 0],
					[0.25, 0.25]
				]),
				piece('hst', 0.25, 1, [
					[0.5, 0],
					[0.75, 0],
					[0.75, 0.25]
				])
			])
		]
	}
];

/*
 * Superseded by grid compositions in `blocks.ts`. Kept only to migrate saved
 * designs: a stored pinwheel is resampled into four half square triangles.
 */
const LEGACY: Cut[] = [
	{
		id: 'pinwheel',
		name: 'Pinwheel',
		group: 'legacy',
		pieces: spin([
			piece('hst', 0.5, 0, [TL, [0.5, 0], MID]),
			piece('hst', 0.5, 1, [TL, MID, [0, 0.5]])
		])
	},
	{
		id: 'broken-dishes',
		name: 'Broken dishes',
		group: 'legacy',
		pieces: spin([
			piece('hst', 0.5, 0, [TL, [0.5, 0], [0, 0.5]]),
			piece('hst', 0.5, 1, [[0.5, 0], MID, [0, 0.5]])
		])
	},
	{
		id: 'four-patch',
		name: 'Four patch',
		group: 'legacy',
		pieces: spin([piece('square', 0.5, 0, [TL, [0.5, 0], MID, [0, 0.5]])], (turn) => turn % 2)
	}
];

export const CUTS: Record<string, Cut> = Object.fromEntries(
	[...PIECES, ...BLOCKS, ...LEGACY].map((cut) => [cut.id, cut])
);

export const PIECE_CUTS: readonly Cut[] = PIECES;
export const BLOCK_CUTS: readonly Cut[] = BLOCKS;

export const isCutId = (value: unknown): value is string =>
	typeof value === 'string' && value in CUTS;

/*
 * There are only |cuts| x 4 possible piece lists; memoize them so hot paths
 * (previews recompute per pointer move) reuse frozen instances.
 */
const rotationCache = new Map<string, PieceShape[]>();

export const rotatedPieces = (cutId: string, rotation: number): PieceShape[] => {
	const turns = normalizeTurns(rotation);
	const key = `${cutId}:${turns}`;
	const cached = rotationCache.get(key);
	if (cached) return cached;
	const cut = CUTS[cutId];
	const pieces =
		turns === 0
			? cut.pieces
			: cut.pieces.map((s) => ({ ...s, points: s.points.map((p) => rotatePoint(p, turns)) }));
	rotationCache.set(key, pieces);
	return pieces;
};

export const toPolygonPoints = (points: readonly Point[], size: number): string =>
	points.map(([x, y]) => `${x * size},${y * size}`).join(' ');

export const centroidOf = (points: readonly Point[]): Point => [
	points.reduce((sum, [x]) => sum + x, 0) / points.length,
	points.reduce((sum, [, y]) => sum + y, 0) / points.length
];

/** Ray casting, so a click can be resolved to the piece it landed in. */
export const pointInPolygon = ([px, py]: Point, points: readonly Point[]): boolean =>
	points.reduce((inside, [xi, yi], i) => {
		const [xj, yj] = points[(i + points.length - 1) % points.length];
		const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
		return intersects ? !inside : inside;
	}, false);

/*
 * Points exactly on the far edges (x or y of 1) fall outside every polygon's
 * strict inequalities; clamp just inside so edge clicks resolve to the edge
 * piece instead of falling through to piece 0.
 */
const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1 - 1e-6);

/** Which piece of `cutId` contains the unit-square point, or 0 as a fallback. */
export const pieceAt = (cutId: string, rotation: number, [x, y]: Point): number => {
	const point: Point = [clamp01(x), clamp01(y)];
	const hit = rotatedPieces(cutId, rotation).findIndex((s) => pointInPolygon(point, s.points));
	return hit === -1 ? 0 : hit;
};

export const pieceCountOf = (cutId: string): number => CUTS[cutId].pieces.length;
