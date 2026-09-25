import { describe, expect, it } from 'vitest';
import { BLOCK_TYPE_BY_ID } from './blocks';
import { emptyBlock, leafBlock, type Block } from './model';
import { sewListFor } from './sewing';

/** A zig zag in two fabrics: the feature colour, and one left unset. */
const zigZag = (): Block => {
	const source = BLOCK_TYPE_BY_ID['zig-zag'].block as Block & { children: Block[] };
	return {
		...source,
		children: source.children.map((child) => ({
			...(child as Block & { fabrics: (string | null)[] }),
			fabrics: ['purple', null]
		}))
	} as Block;
};

describe('sewListFor', () => {
	it('breaks a block into the units it is pieced from', () => {
		const list = sewListFor(Array(4).fill(zigZag()), 8);
		expect(list.map((u) => [u.name, u.inches, u.count])).toEqual([
			['Zig zag', 8, 4],
			['HST', 4, 16]
		]);
	});

	it('counts a turned unit as the same unit', () => {
		// The four triangles of a zig zag are one unit sewn sixteen times over
		// rather than four units sewn four times each.
		const [, triangles] = sewListFor(Array(4).fill(zigZag()), 8);
		expect(triangles.count).toBe(16);
	});

	it('leaves plain patches to the cutting list', () => {
		// One square of one fabric is cut and set aside; nothing is sewn.
		expect(sewListFor([leafBlock('square', 0, ['blue'])], 8)).toEqual([]);
		expect(sewListFor([emptyBlock()], 8)).toEqual([]);
	});

	it('writes each unit at its own finished size', () => {
		const list = sewListFor([zigZag()], 12);
		expect(list.map((u) => u.inches)).toEqual([12, 6]);
		expect(list[1].label).toContain('6 x 6”');
	});
});
