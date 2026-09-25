/*
 * Sew list: the units the quilt is assembled from, at every level.
 *
 * The cutting list is about fabric — how much, in what blanks. This is about
 * the table, and a block cannot be taken at face value there: a pinwheel is
 * not sewn as a pinwheel, it is four half square triangles pieced and then
 * joined. So every node that takes sewing is listed, the whole block and the
 * parts it is built from, each with how many of it to make.
 *
 * A plain patch is not a unit. One square of one fabric is cut and set aside;
 * that is the cutting list's business, not this one's.
 *
 * Units are counted by what they look like, so a quilt of one repeated block
 * asks for that block once with a number against it.
 */

import { BLOCK_TYPES } from './blocks';
import { fmtLengthPair } from './data';
import { CUTS } from './geometry';
import { flatten, isEmpty, rotateBlock, sameStructure, type Block } from './model';
import { cellsOf, type Pattern } from './pattern';

export interface SewUnit {
	/** A representative block, for drawing the unit. */
	block: Block;
	name: string;
	/** Finished size in inches, square. */
	inches: number;
	count: number;
	label: string;
}

/*
 * A leaf by its shape and which fabric plays which part in it, read off the
 * pieces rather than the fabrics array, whose order follows the turn.
 */
const leafShape = (block: Block): string => {
	const pieces = flatten(block)
		.map((piece) => `${piece.role}:${piece.fabric ?? ''}`)
		.sort();
	return `l${block.kind === 'leaf' ? block.cut : ''}:${pieces.join('/')}`;
};

const shapeOf = (block: Block): string =>
	block.kind === 'grid'
		? `g${block.cols}x${block.rows}(${block.children.map(shapeOf).join(',')})`
		: leafShape(block);

/*
 * Identity for tallying. A unit turned is the same unit — you sew one and set
 * it whichever way up the block wants — so of the four turns, the one that
 * sorts first stands for all of them. Otherwise a pinwheel would ask for four
 * triangles four times over instead of sixteen of the one triangle.
 */
const signature = (block: Block): string => {
	let best = shapeOf(block);
	let turned = block;
	for (let turn = 1; turn < 4; turn++) {
		turned = rotateBlock(turned, 1);
		const shape = shapeOf(turned);
		if (shape < best) best = shape;
	}
	return best;
};

/*
 * Whether this node is sewn or merely cut. Anything composed is pieced from
 * its children; a leaf of more than one shape is pieced from those shapes. A
 * single patch is neither.
 */
const isSewn = (block: Block): boolean => block.kind === 'grid' || flatten(block).length > 1;

/*
 * What to call a unit. A block that matches one of the named types is called
 * by that name whatever its colours, and a saved pattern by the name it was
 * given; anything else is named for the cut it is made of, which is what a
 * lone triangle wants.
 */
const nameOf = (block: Block, patterns: readonly Pattern[]): string => {
	const pattern = patterns.find((p) => {
		const cells = cellsOf(p.blocks);
		return cells.length === 1 && sameStructure(cells[0].block, block);
	});
	if (pattern) return pattern.name.trim() || 'Block';
	const type = BLOCK_TYPES.find((t) => sameStructure(t.block, block));
	if (type) return type.name;
	// A pattern names a half square triangle an HST, and has the room for it.
	if (block.kind === 'leaf') {
		const cut = CUTS[block.cut];
		return cut?.abbr ?? cut?.name ?? block.cut;
	}
	return 'Block';
};

export const sewListFor = (
	blocks: readonly Block[],
	blockSize: number,
	patterns: readonly Pattern[] = [],
	metric = false
): SewUnit[] => {
	const tally = new Map<string, { block: Block; inches: number; count: number }>();

	/** Every sewn node under `block`, which is `inches` across. */
	const walk = (block: Block, inches: number) => {
		if (isEmpty(block)) return;
		if (isSewn(block)) {
			const key = `${signature(block)}@${inches}`;
			const seen = tally.get(key);
			if (seen) seen.count += 1;
			else tally.set(key, { block, inches, count: 1 });
		}
		// Square grids throughout, so one divisor does for both ways.
		if (block.kind === 'grid') {
			block.children.forEach((child) => walk(child, inches / block.cols));
		}
	};

	blocks.forEach((block) => walk(block, blockSize));

	// A whole block before the parts it is made of.
	return [...tally.values()]
		.sort((a, b) => b.inches - a.inches || b.count - a.count)
		.map(({ block, inches, count }) => {
			const name = nameOf(block, patterns);
			return {
				block,
				name,
				inches,
				count,
				label: `${name} - ${fmtLengthPair(inches, inches, metric)} (${count})`
			};
		});
};
