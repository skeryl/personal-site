/*
 * The block types and block patterns the palette offers, as the design file
 * draws them in its two roster frames.
 *
 * A type fills one square of the quilt; a pattern is an arrangement of
 * several. Both are built from the same two quarters — a half square
 * triangle at some turn, and a plain square in the ground fabric — because
 * that is how the design draws them, and because describing them as data
 * rather than as polygon lists means the cutting list and the sew list read
 * them for free.
 *
 * Patterns here are seed data: they are what a new quilt starts with, and
 * from then on they are the quilter's to rename, add to, or throw away.
 */

import { CUTS } from './geometry';
import { leafBlock, rotateBlock, type Block, type GridBlock } from './model';
import { blocksFrom, type Pattern } from './pattern';

export interface BlockType {
	id: string;
	name: string;
	block: Block;
}

const grid = (division: number, children: Block[]): GridBlock => ({
	kind: 'grid',
	cols: division,
	rows: division,
	children
});

/** The four children of a 2x2, in reading order: top-left first. */
const quarters = (tl: Block, tr: Block, bl: Block, br: Block): GridBlock =>
	grid(2, [tl, tr, bl, br]);

/*
 * A half square triangle at a given turn. Turn 0 puts the fabric half at the
 * bottom left, and each turn takes it one step clockwise, so 2 is the top
 * right the design draws a lone HST at.
 */
const hst = (turn: number): Block => leafBlock('hst', turn);

/*
 * A quarter in the ground fabric rather than the stamped one. The role offset
 * is what makes it read that way: offset 1 means "keep what was underneath",
 * which is also what the light half of an HST beside it does.
 */
const ground = (): Block => leafBlock('square', 0, undefined, 1);

const turned = (block: Block, turns: number): Block => rotateBlock(block, turns);

/*
 * The six shapes of the design's `default block types`, in the order it
 * stacks them. Each is read straight off that frame's geometry: which
 * quarter, and which half of it, the dark fabric covers.
 */
const HST = hst(2);
/** Two triangles facing each other across the centre, the rest plain. */
const HALF_PINWHEEL = quarters(ground(), hst(0), hst(2), ground());
/** Four triangles all facing the same way, which reads as a run of stripes. */
const ZIG_ZAG = quarters(hst(2), hst(2), hst(2), hst(2));
/** One goose in the right half, the left half plain: an arrow pointing right. */
const GEESE = quarters(ground(), hst(2), ground(), hst(3));
/** A band corner to corner, made of three triangles and one plain quarter. */
const STRIPE = quarters(hst(2), hst(0), ground(), hst(2));
/** Four triangles pointing in: a square set on its point. */
const DIAMOND = quarters(hst(3), hst(0), hst(2), hst(1));

export const BLOCK_TYPES: readonly BlockType[] = [
	{ id: 'hst', name: CUTS.hst.abbr ?? CUTS.hst.name, block: HST },
	{ id: 'half-pinwheel', name: 'Half pinwheel', block: HALF_PINWHEEL },
	{ id: 'zig-zag', name: 'Zig zag', block: ZIG_ZAG },
	{ id: 'geese', name: 'Flying geese', block: GEESE },
	{ id: 'stripe', name: 'Diagonal stripe', block: STRIPE },
	{ id: 'diamond', name: 'Diamond', block: DIAMOND }
];

export const BLOCK_TYPE_BY_ID: Record<string, BlockType> = Object.fromEntries(
	BLOCK_TYPES.map((type) => [type.id, type])
);

/*
 * Compositions no longer offered in the palette, kept because saved designs
 * from before block composition existed are migrated through them. A v2 cell
 * that says "pinwheel" has to keep meaning the pinwheel it was drawn as.
 */
const PINWHEEL = grid(
	2,
	[2, 3, 1, 0].map((rotation) => leafBlock('hst', rotation))
);
const BROKEN_DISHES = grid(
	2,
	[1, 2, 0, 3].map((rotation) => leafBlock('hst', rotation))
);
const FOUR_PATCH = grid(
	2,
	[0, 1, 1, 0].map((roleOffset) => leafBlock('square', 0, undefined, roleOffset))
);

/** Legacy cut id -> the composition that replaced it, for migrating saves. */
export const REPLACED_BY: Record<string, Block> = {
	pinwheel: PINWHEEL,
	'broken-dishes': BROKEN_DISHES,
	'four-patch': FOUR_PATCH
};

/*
 * The six arrangements of the design's `default block patterns`, each two
 * blocks by two. The names are ours: the design leaves its own layers
 * unnamed, and every one of these can be renamed in the panel.
 */
const pattern = (id: string, name: string, [tl, tr, bl, br]: Block[]): Pattern => ({
	id,
	name,
	blocks: blocksFrom([
		{ x: 0, y: 0, block: tl },
		{ x: 1, y: 0, block: tr },
		{ x: 0, y: 1, block: bl },
		{ x: 1, y: 1, block: br }
	])
});

export const DEFAULT_PATTERNS: readonly Pattern[] = [
	pattern('star', 'Star', [
		HALF_PINWHEEL,
		turned(HALF_PINWHEEL, 1),
		turned(HALF_PINWHEEL, 1),
		HALF_PINWHEEL
	]),
	pattern('kaleidoscope', 'Kaleidoscope', [
		turned(ZIG_ZAG, 1),
		turned(ZIG_ZAG, 2),
		ZIG_ZAG,
		turned(ZIG_ZAG, 3)
	]),
	pattern('arrows', 'Arrows', [GEESE, turned(GEESE, 1), turned(GEESE, 3), turned(GEESE, 2)]),
	pattern('diamond-frame', 'Diamond frame', [
		turned(STRIPE, 1),
		turned(STRIPE, 2),
		STRIPE,
		turned(STRIPE, 3)
	]),
	pattern('lattice', 'Lattice', [BROKEN_DISHES, BROKEN_DISHES, BROKEN_DISHES, BROKEN_DISHES]),
	pattern('pinwheel', 'Pinwheel', [hst(0), hst(1), hst(3), hst(2)])
];
