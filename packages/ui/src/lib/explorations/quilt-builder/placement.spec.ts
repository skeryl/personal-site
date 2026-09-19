import { describe, expect, it } from 'vitest';
import { BLOCK_TYPE_BY_ID } from './blocks';
import { emptyBlock, flatten, leafBlock, type Block } from './model';
import { buildErase, buildPlacement, fabricAt, resample } from './placement';

const solid = (id: string): Block => leafBlock('square', 0, [id]);
const fabrics = (block: Block) => flatten(block).map((p) => p.fabric);

describe('resample', () => {
	it('carries a solid square into every piece of a new shape', () => {
		expect(fabrics(resample(leafBlock('hourglass'), solid('blue')))).toEqual(Array(4).fill('blue'));
	});

	it('carries a solid square into every piece of a composed block', () => {
		const pinwheel = BLOCK_TYPE_BY_ID.pinwheel.block;
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

	it('places a saved block exactly', () => {
		const saved = leafBlock('hst', 2, ['red', null]);
		const block = buildPlacement(
			solid('blue'),
			[0.5, 0.5],
			{ mode: 'exact', block: saved },
			'green'
		);
		expect(block).toEqual(saved);
	});
});

describe('buildPlacement inside a composition', () => {
	const pinwheel = BLOCK_TYPE_BY_ID.pinwheel.block;

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
		const filled = resample(BLOCK_TYPE_BY_ID.pinwheel.block, solid('blue'));
		const erased = buildErase(filled, [0.1, 0.1]);
		expect(erased).not.toBeNull();
		expect(fabricAt(erased!, [0.1, 0.1])).toBeNull();
		expect(fabricAt(erased!, [0.9, 0.9])).toBe('blue');
	});

	it('is a no-op on an empty piece', () => {
		expect(buildErase(emptyBlock(), [0.5, 0.5])).toBeNull();
	});
});
