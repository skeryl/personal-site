import { describe, expect, it } from 'vitest';
import { leafBlock, type Block } from './model';
import {
	anchorFor,
	blockCount,
	blocksFrom,
	boundsOf,
	cellsOf,
	coordOf,
	normalizeBlocks,
	parseCoord,
	patternsEqualShape,
	placementAt,
	rotatePattern,
	type PatternBlocks
} from './pattern';

const sq = (fabric: string | null): Block => leafBlock('square', 0, [fabric]);

/** An L: two cells down the left, one to the right of the bottom. */
const ELL: PatternBlocks = {
	'0,0': sq('a'),
	'0,1': sq('b'),
	'1,1': sq('c')
};

const fabricAt = (blocks: PatternBlocks, coord: string) => {
	const block = blocks[coord as keyof PatternBlocks];
	return block && block.kind === 'leaf' ? block.fabrics[0] : undefined;
};

describe('coordinates', () => {
	it('round-trips', () => {
		expect(parseCoord(coordOf(3, 7))).toEqual([3, 7]);
	});

	it('lists cells in reading order', () => {
		expect(cellsOf(ELL).map((c) => [c.x, c.y])).toEqual([
			[0, 0],
			[0, 1],
			[1, 1]
		]);
	});
});

describe('boundsOf', () => {
	it('measures the rectangular backdrop, holes included', () => {
		expect(boundsOf(ELL)).toEqual({ w: 2, h: 2 });
		expect(blockCount(ELL)).toBe(3);
	});

	it('is zero for an empty pattern', () => {
		expect(boundsOf({})).toEqual({ w: 0, h: 0 });
	});

	it('measures a single block as one by one', () => {
		expect(boundsOf({ '0,0': sq('a') })).toEqual({ w: 1, h: 1 });
	});
});

describe('normalizeBlocks', () => {
	it('shifts the smallest x and y to zero', () => {
		const offset: PatternBlocks = { '4,9': sq('a'), '5,9': sq('b') };
		expect(Object.keys(normalizeBlocks(offset)).sort()).toEqual(['0,0', '1,0']);
	});

	it('makes the same shape at different offsets compare equal', () => {
		expect(patternsEqualShape(ELL, { '9,9': sq('a'), '9,10': sq('b'), '10,10': sq('c') })).toBe(
			true
		);
	});

	it('does not call different shapes equal', () => {
		expect(patternsEqualShape(ELL, { '0,0': sq('a'), '1,0': sq('b'), '0,1': sq('c') })).toBe(false);
	});
});

describe('rotatePattern', () => {
	it('turns a horizontal domino into a vertical one', () => {
		const domino: PatternBlocks = { '0,0': sq('a'), '1,0': sq('b') };
		const turned = rotatePattern(domino, 1);
		expect(boundsOf(turned)).toEqual({ w: 1, h: 2 });
		expect(fabricAt(turned, '0,0')).toBe('a');
		expect(fabricAt(turned, '0,1')).toBe('b');
	});

	it('walks an L around without changing its cell count', () => {
		for (const turns of [1, 2, 3]) {
			expect(blockCount(rotatePattern(ELL, turns))).toBe(3);
		}
	});

	it('is the identity after four turns', () => {
		const four = rotatePattern(ELL, 4);
		expect(Object.keys(four).sort()).toEqual(Object.keys(ELL).sort());
		expect(fabricAt(four, '0,0')).toBe('a');
		expect(fabricAt(four, '1,1')).toBe('c');
	});

	it('moves the top-left cell to the top-right', () => {
		const turned = rotatePattern(ELL, 1);
		// (0,0) with h=2 lands at (1, 0).
		expect(fabricAt(turned, '1,0')).toBe('a');
	});
});

describe('blocksFrom', () => {
	it('normalizes and clones', () => {
		const source = sq('a');
		const blocks = blocksFrom([{ x: 5, y: 5, block: source }]);
		expect(Object.keys(blocks)).toEqual(['0,0']);
		expect(blocks['0,0']).not.toBe(source);
	});
});

describe('placementAt', () => {
	const dims = { rows: 4, cols: 4 };

	it('maps every cell of the pattern onto board indices', () => {
		const updates = placementAt(ELL, 1, 1, dims);
		expect([...updates!.keys()].sort((a, b) => a - b)).toEqual([5, 9, 10]);
	});

	it('refuses rather than clipping when part would fall off the edge', () => {
		expect(placementAt(ELL, 3, 3, dims)).toBeNull();
		expect(placementAt(ELL, 3, 2, dims)).toBeNull();
	});

	it('fits exactly at the bottom-right corner it can occupy', () => {
		expect(placementAt(ELL, 2, 2, dims)).not.toBeNull();
	});

	it('anchors from the hovered cell', () => {
		expect(anchorFor(6, dims)).toEqual({ col: 2, row: 1 });
	});
});
