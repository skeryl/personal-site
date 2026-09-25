import { describe, expect, it } from 'vitest';
import { BLOCK_TYPE_BY_ID, REPLACED_BY } from './blocks';
import { divisionOf, emptyBlock, flatten, leafBlock, recompose, type Block } from './model';
import { buildErase, buildPlacement, fabricAt, resample } from './placement';

const solid = (id: string): Block => leafBlock('square', 0, [id]);
const fabrics = (block: Block) => flatten(block).map((p) => p.fabric);

describe('resample', () => {
	it('carries a solid square into every piece of a new shape', () => {
		expect(fabrics(resample(leafBlock('hourglass'), solid('blue')))).toEqual(Array(4).fill('blue'));
	});

	it('carries a solid square into every piece of a composed block', () => {
		const pinwheel = REPLACED_BY.pinwheel;
		expect(fabrics(resample(pinwheel, solid('blue')))).toEqual(Array(8).fill('blue'));
	});

	it('leaves an empty block empty', () => {
		expect(fabrics(resample(leafBlock('hst'), emptyBlock()))).toEqual([null, null]);
	});
});

describe('buildPlacement', () => {
	it('paints only the clicked piece of a cut', () => {
		const block = buildPlacement(
			emptyBlock(),
			[0.75, 0.5],
			{ mode: 'paint', cut: 'rectangle', rotation: 0 },
			'blue'
		);
		expect(fabrics(block)).toEqual([null, 'blue']);
	});

	it('keeps the colour underneath when re-cutting a solid square', () => {
		const block = buildPlacement(
			solid('blue'),
			[0.7, 0.2],
			{ mode: 'paint', cut: 'hst', rotation: 0 },
			'green'
		);
		expect(fabrics(block)).toEqual(['blue', 'green']);
	});

	it('stamps a block into the fabric role and inherits the rest', () => {
		const block = buildPlacement(
			solid('blue'),
			[0.5, 0.5],
			{ mode: 'stamp', block: leafBlock('square-in-square') },
			'green'
		);
		expect(fabrics(block)).toEqual(['green', 'blue', 'blue', 'blue', 'blue']);
	});

	it('repaints one piece when that block is already there', () => {
		const stamped = buildPlacement(
			solid('blue'),
			[0.5, 0.5],
			{ mode: 'stamp', block: leafBlock('square-in-square') },
			'green'
		);
		const block = buildPlacement(
			stamped,
			[0.05, 0.05],
			{ mode: 'stamp', block: leafBlock('square-in-square') },
			'red'
		);
		expect(fabrics(block)).toEqual(['green', 'red', 'blue', 'blue', 'blue']);
	});

	it('inherits into a stamp whose cut does not match what is there', () => {
		const block = buildPlacement(
			solid('blue'),
			[0.5, 0.5],
			{ mode: 'stamp', block: leafBlock('hst') },
			'green'
		);
		expect(fabrics(block)).toEqual(['green', 'blue']);
	});
});

describe('buildPlacement inside a composition', () => {
	const pinwheel = REPLACED_BY.pinwheel;

	it('paints one piece of one child, leaving the other children alone', () => {
		const stamped = buildPlacement(
			solid('cream'),
			[0.5, 0.5],
			{ mode: 'stamp', block: pinwheel },
			'navy'
		);
		// Top-left child covers 0..0.5; this point lands inside it.
		const block = buildPlacement(
			stamped,
			[0.1, 0.4],
			{ mode: 'paint', cut: 'hst', rotation: 0 },
			'red'
		);
		const after = fabrics(block);
		expect(after.filter((f) => f === 'red')).toHaveLength(1);
		// Only the top-left child changed.
		expect(after.slice(2)).toEqual(fabrics(stamped).slice(2));
	});

	it('recuts only the child under the cursor', () => {
		const block = buildPlacement(
			pinwheel,
			[0.75, 0.75],
			{ mode: 'paint', cut: 'square', rotation: 0 },
			'red'
		);
		// Three half square triangle children (2 pieces each) plus one square.
		expect(flatten(block)).toHaveLength(7);
	});
});

describe('buildErase', () => {
	it('clears the piece under the point and collapses an emptied leaf', () => {
		const half = leafBlock('rectangle', 0, ['blue', null]);
		expect(buildErase(half, [0.25, 0.5])).toEqual(emptyBlock());
	});

	it('empties one child of a composition without changing the others', () => {
		const filled = resample(REPLACED_BY.pinwheel, solid('blue'));
		const erased = buildErase(filled, [0.1, 0.1]);
		expect(erased).not.toBeNull();
		expect(fabricAt(erased!, [0.1, 0.1])).toBeNull();
		expect(fabricAt(erased!, [0.9, 0.9])).toBe('blue');
	});

	it('is a no-op on an empty piece', () => {
		expect(buildErase(emptyBlock(), [0.5, 0.5])).toBeNull();
	});
});

describe('a block type lands in the sub-block under the cursor', () => {
	const pinwheel = REPLACED_BY.pinwheel;
	const stamp = (block: Block, point: [number, number]) =>
		buildPlacement(block, point, { mode: 'stamp', block: pinwheel }, 'navy');

	it('fills the whole block when the block is one piece', () => {
		const block = stamp(emptyBlock(), [0.5, 0.5]);
		// Four half square triangles, two pieces each.
		expect(flatten(block)).toHaveLength(8);
		expect(divisionOf(block)).toBe(2);
	});

	it('fills one quarter of a 2x2 block, leaving the others alone', () => {
		const grid = recompose(emptyBlock(), 2);
		const block = stamp(grid, [0.1, 0.1]);
		// One quarter became a pinwheel (8 pieces); the other three stay square.
		expect(flatten(block)).toHaveLength(8 + 3);
		expect(fabricAt(block, [0.6, 0.6])).toBeNull();
	});

	it('fills one sixteenth of a 4x4 block', () => {
		const block = stamp(recompose(emptyBlock(), 4), [0.05, 0.05]);
		expect(flatten(block)).toHaveLength(8 + 15);
	});

	it('scales the blank size by where it landed', () => {
		// A pinwheel's triangles are half a block; inside a 2x2 that is a quarter.
		const plain = stamp(emptyBlock(), [0.5, 0.5]);
		expect(new Set(flatten(plain).map((p) => p.frac))).toEqual(new Set([0.5]));

		const nested = stamp(recompose(emptyBlock(), 2), [0.1, 0.1]);
		const fracs = new Set(flatten(nested).map((p) => p.frac));
		expect(fracs.has(0.25)).toBe(true);
	});

	it('recolours rather than nesting when that spot already holds it', () => {
		const once = stamp(recompose(emptyBlock(), 2), [0.1, 0.1]);
		const twice = buildPlacement(once, [0.1, 0.1], { mode: 'stamp', block: pinwheel }, 'cream');
		// Still one pinwheel in that quarter, not a pinwheel inside a pinwheel.
		expect(flatten(twice)).toHaveLength(flatten(once).length);
		expect(fabricAt(twice, [0.1, 0.1])).toBe('cream');
	});

	it('inherits the colour that was under that quarter, not the whole block', () => {
		const grid = recompose(solid('blue'), 2);
		const block = stamp(grid, [0.1, 0.1]);
		// Background pieces of the stamped quarter keep the blue beneath them.
		const quarter = flatten(block).filter((p) => p.points.every(([x, y]) => x <= 0.5 && y <= 0.5));
		expect(quarter.some((p) => p.fabric === 'blue')).toBe(true);
		expect(quarter.some((p) => p.fabric === 'navy')).toBe(true);
	});
});

describe('stamping the same block onto itself', () => {
	/*
	 * Clicking a block type onto a square it already fills recolours the piece
	 * under the cursor. It must keep doing that however many times you click:
	 * painting marks the leaf it touched as placed, and the guard has to go on
	 * recognising its own work through that mark, or the third click starts
	 * nesting pinwheels inside pinwheels.
	 */
	it('recolours rather than nesting, however many times it is stamped', () => {
		const pending = { mode: 'stamp' as const, block: REPLACED_BY.pinwheel };
		let block: Block = emptyBlock();
		for (let i = 0; i < 6; i++) {
			block = buildPlacement(block, [0.3, 0.3], pending, `m${i}`);
			expect(divisionOf(block)).toBe(2);
			expect(flatten(block)).toHaveLength(8);
		}
		// And the clicks land somewhere: the piece under the cursor is repainted.
		expect(fabrics(block)).toContain('m5');
	});

	it('still nests a different block type into the square under the cursor', () => {
		const pinwheel = { mode: 'stamp' as const, block: REPLACED_BY.pinwheel };
		const diamond = { mode: 'stamp' as const, block: BLOCK_TYPE_BY_ID.diamond.block };
		const first = buildPlacement(emptyBlock(), [0.3, 0.3], pinwheel, 'a');
		const second = buildPlacement(first, [0.3, 0.3], diamond, 'b');
		expect(flatten(second).length).toBeGreaterThan(flatten(first).length);
	});
});
