/*
 * The block types offered in the palette.
 *
 * Some are a single cut (an hourglass is four triangles meeting at the
 * centre, which no grid can express). Others are compositions: a pinwheel is
 * literally four half square triangles in a 2x2 grid, so it is described here
 * as data rather than as another hardcoded polygon list.
 *
 * This is the precursor to a user-editable pattern library. Once patterns are
 * saved and named, these become seed data rather than constants.
 */

import { CUTS } from './geometry';
import { leafBlock, type Block } from './model';

export interface BlockType {
	id: string;
	name: string;
	block: Block;
}

const grid = (division: number, children: Block[]): Block => ({
	kind: 'grid',
	cols: division,
	rows: division,
	children
});

/*
 * Four half square triangles. The rotations are not decorative: they are the
 * exact turns that reproduce the polygons, fracs and roles of the pinwheel
 * that used to be a hardcoded polygon list, which blocks.spec.ts holds them
 * to. Children are row-major: top-left, top-right, bottom-left, bottom-right.
 */
const PINWHEEL = grid(
	2,
	[2, 3, 1, 0].map((rotation) => leafBlock('hst', rotation))
);

const BROKEN_DISHES = grid(
	2,
	[1, 2, 0, 3].map((rotation) => leafBlock('hst', rotation))
);

/*
 * Four plain squares. The role offset is what makes it read as a checkerboard
 * when stamped: offset 1 means "keep what was underneath" for that child.
 */
const FOUR_PATCH = grid(
	2,
	[0, 1, 1, 0].map((roleOffset) => leafBlock('square', 0, undefined, roleOffset))
);

const fromCut = (id: string): BlockType => ({
	id,
	name: CUTS[id].name,
	block: leafBlock(id)
});

export const BLOCK_TYPES: readonly BlockType[] = [
	{ id: 'pinwheel', name: 'Pinwheel', block: PINWHEEL },
	{ id: 'broken-dishes', name: 'Broken dishes', block: BROKEN_DISHES },
	fromCut('hourglass'),
	fromCut('square-in-square'),
	{ id: 'four-patch', name: 'Four patch', block: FOUR_PATCH },
	fromCut('nine-patch'),
	fromCut('sawtooth-star')
];

export const BLOCK_TYPE_BY_ID: Record<string, BlockType> = Object.fromEntries(
	BLOCK_TYPES.map((type) => [type.id, type])
);

/** Legacy cut id -> the composition that replaced it, for migrating saves. */
export const REPLACED_BY: Record<string, Block> = {
	pinwheel: PINWHEEL,
	'broken-dishes': BROKEN_DISHES,
	'four-patch': FOUR_PATCH
};
