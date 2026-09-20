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
	setAt,
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

	it('withoutMaterial takes the fabric and leaves the shape', () => {
		const [stripped] = withoutMaterial([composed], 'blue');
		// Losing a fabric costs no work: the pinwheel is still a pinwheel.
		expect(isEmpty(stripped)).toBe(false);
		expect(sameStructure(stripped, composed)).toBe(true);
		// Nothing in it is cut from that fabric any more, though.
		expect(flatten(stripped).every((piece) => piece.fabric === null)).toBe(true);
	});
});

describe('empty means nothing placed, not nothing coloured', () => {
	it('a fresh block is empty, and so is one merely subdivided', () => {
		expect(isEmpty(emptyBlock())).toBe(true);
		expect(isEmpty(recompose(emptyBlock(), 2))).toBe(true);
	});

	it('a shape put down without fabric is not empty', () => {
		expect(isEmpty(leafBlock('hst'))).toBe(false);
	});

	/*
	 * A four patch is four plain squares, structurally the same as blank ones.
	 * The role its composition gave each is the only thing that tells them
	 * apart, which is why the offset is kept even when it is zero.
	 */
	it('a four patch is not empty, though every leaf of it is a plain square', () => {
		const fourPatch = BLOCK_TYPE_BY_ID['four-patch'].block;
		expect(isEmpty(fourPatch)).toBe(false);
		expect(flatten(fourPatch).map((piece) => piece.shaped)).toEqual([true, true, true, true]);
	});

	it('marks the pieces of a placed shape, and leaves blank space alone', () => {
		expect(flatten(leafBlock('hst')).map((piece) => piece.shaped)).toEqual([true, true]);
		expect(flatten(emptyBlock()).map((piece) => piece.shaped)).toEqual([false]);

		// One quarter cut into a shape; the other three are still blank.
		const mixed = setAt(recompose(emptyBlock(), 2), [0], leafBlock('hst'));
		expect(isEmpty(mixed)).toBe(false);
		expect(flatten(mixed).map((piece) => piece.shaped)).toEqual([true, true, false, false, false]);
	});
});
