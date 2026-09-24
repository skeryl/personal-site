/*
 * Sew list: the units the quilt is assembled from.
 *
 * The cutting list is about fabric — how much, in what blanks. This is about
 * the table: the distinct squares on the wall, each with how many of it to
 * piece. Two squares count as the same unit when they are the same shapes in
 * the same fabrics, so a quilt of one repeated block asks for that block
 * once, with a number against it.
 */

import { BLOCK_TYPES } from './blocks';
import { fmtLengthPair } from './data';
import { CUTS } from './geometry';
import { isEmpty, sameStructure, type Block } from './model';
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
 * Identity for tallying: the shapes, their turns, and the fabric in each.
 * Two squares that look the same are the same unit however they were built.
 */
const signature = (block: Block): string =>
	block.kind === 'grid'
		? `g${block.cols}x${block.rows}(${block.children.map(signature).join(',')})`
		: `l${block.cut}:${block.rotation}:${block.fabrics.join('/')}`;

/*
 * What to call a unit. A block that matches one of the named types is called
 * by that name whatever its colours, and a saved pattern by the name it was
 * given; anything else is named for the cut it is made of, which is what a
 * plain square or a lone triangle wants.
 */
const nameOf = (block: Block, patterns: readonly Pattern[]): string => {
	const pattern = patterns.find((p) => {
		const cells = cellsOf(p.blocks);
		return cells.length === 1 && sameStructure(cells[0].block, block);
	});
	if (pattern) return pattern.name.trim() || 'Block';
	const type = BLOCK_TYPES.find((t) => sameStructure(t.block, block));
	if (type) return type.name;
	if (block.kind === 'leaf') return CUTS[block.cut]?.name ?? block.cut;
	return 'Block';
};

export const sewListFor = (
	blocks: readonly Block[],
	blockSize: number,
	patterns: readonly Pattern[] = [],
	metric = false
): SewUnit[] => {
	const tally = new Map<string, { block: Block; count: number }>();
	blocks.forEach((block) => {
		if (isEmpty(block)) return;
		const key = signature(block);
		const seen = tally.get(key);
		if (seen) seen.count += 1;
		else tally.set(key, { block, count: 1 });
	});

	return [...tally.values()]
		.sort((a, b) => b.count - a.count)
		.map(({ block, count }) => {
			const name = nameOf(block, patterns);
			return {
				block,
				name,
				inches: blockSize,
				count,
				label: `${name} - ${fmtLengthPair(blockSize, blockSize, metric)} (${count})`
			};
		});
};
