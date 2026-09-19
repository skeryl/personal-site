import { describe, expect, it } from 'vitest';
import { BLOCK_TYPE_BY_ID } from './blocks';
import {
	blocksEqual,
	divisionOf,
	emptyBlock,
	flatten,
	isEmpty,
	leafAt,
	leafBlock,
	materialsInUse,
	recompose,
	rotateBlock,
	sameStructure,
	withoutMaterial,
	type Block
} from './model';
import { resample } from './placement';

const solid = (id: string): Block => leafBlock('square', 0, [id]);
const fabrics = (block: Block) => flatten(block).map((p) => p.fabric);

describe('recompose', () => {
	it('going finer replicates, so the picture does not change', () => {
		const composed = recompose(solid('blue'), 2);
		expect(divisionOf(composed)).toBe(2);
		expect(fabrics(composed)).toEqual(Array(4).fill('blue'));
	});

	it('scales the blank size of every piece', () => {
		expect(flatten(solid('blue')).map((p) => p.frac)).toEqual([1]);
		expect(flatten(recompose(solid('blue'), 2)).map((p) => p.frac)).toEqual(Array(4).fill(0.5));
		expect(flatten(recompose(solid('blue'), 4)).map((p) => p.frac)).toEqual(Array(16).fill(0.25));
	});

	it('leaves the block outline alone: pieces still cover the unit square', () => {
		const area = (block: Block) =>
			flatten(block).reduce((sum, p) => {
				const n = p.points.length;
				const shoelace = p.points.reduce((acc, [x, y], i) => {
					const [nx, ny] = p.points[(i + 1) % n];
					return acc + (x * ny - nx * y);
				}, 0);
				return sum + Math.abs(shoelace) / 2;
			}, 0);
		[1, 2, 4].forEach((division) => {
			expect(area(recompose(solid('blue'), division))).toBeCloseTo(1, 9);
		});
	});

	it('going coarser keeps each group top-left child', () => {
		const grid = recompose(solid(null as never), 2) as Extract<Block, { kind: 'grid' }>;
		grid.children[0] = leafBlock('square', 0, ['red']);
		grid.children[3] = leafBlock('square', 0, ['blue']);
		expect(fabrics(recompose(grid, 1))).toEqual(['red']);
	});

	it('round-trips 2x2 through itself unchanged', () => {
		const composed = recompose(solid('blue'), 2);
		expect(blocksEqual(recompose(composed, 2), composed)).toBe(true);
	});
});

describe('rotateBlock', () => {
	it('turns each child and permutes their positions', () => {
		const grid = recompose(emptyBlock(), 2) as Extract<Block, { kind: 'grid' }>;
		grid.children[0] = leafBlock('square', 0, ['red']);
		// One clockwise turn moves the top-left child to the top-right.
		const turned = rotateBlock(grid, 1);
		expect(leafAt(turned, [0.75, 0.25]).leaf.fabrics).toEqual(['red']);
		expect(leafAt(turned, [0.25, 0.25]).leaf.fabrics).toEqual([null]);
	});

	it('is the identity after four turns', () => {
		const pinwheel = resample(BLOCK_TYPE_BY_ID.pinwheel.block, solid('blue'));
		expect(blocksEqual(rotateBlock(pinwheel, 4), pinwheel)).toBe(true);
	});
});

describe('sameStructure', () => {
	it('ignores fabric but not shape', () => {
		expect(sameStructure(solid('red'), solid('blue'))).toBe(true);
		expect(sameStructure(solid('red'), leafBlock('hst'))).toBe(false);
		expect(sameStructure(recompose(solid('red'), 2), recompose(solid('blue'), 2))).toBe(true);
		expect(sameStructure(recompose(solid('red'), 2), recompose(solid('blue'), 4))).toBe(false);
	});
});

describe('board queries reach into compositions', () => {
	const composed = resample(BLOCK_TYPE_BY_ID.pinwheel.block, solid('blue'));

	it('isEmpty is true only when every child is empty', () => {
		expect(isEmpty(composed)).toBe(false);
		expect(isEmpty(recompose(emptyBlock(), 4))).toBe(true);
	});

	it('materialsInUse finds fabrics nested in a grid', () => {
		expect([...materialsInUse([composed])]).toEqual(['blue']);
	});

	it('withoutMaterial clears nested pieces', () => {
		const [cleared] = withoutMaterial([composed], 'blue');
		expect(isEmpty(cleared)).toBe(true);
	});
});
