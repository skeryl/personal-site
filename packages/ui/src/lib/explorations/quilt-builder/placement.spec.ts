import { describe, expect, it } from 'vitest';
import { emptyCell, type Cell } from './model';
import { buildErase, buildPlacement, inheritedSlots } from './placement';

const solid = (id: string): Cell => ({ layout: 'square', rotation: 0, slots: [id] });

describe('inheritedSlots', () => {
	it('carries a solid square into every slot of a new layout', () => {
		expect(inheritedSlots(solid('blue'), 'pinwheel', 0)).toEqual(Array(8).fill('blue'));
	});

	it('leaves an empty cell empty', () => {
		expect(inheritedSlots(emptyCell(), 'hst', 0)).toEqual([null, null]);
	});
});

describe('buildPlacement', () => {
	it('paints only the clicked slot of a piece', () => {
		const { cell, slot } = buildPlacement(
			emptyCell(),
			[0.75, 0.5],
			{ mode: 'paint', layout: 'rectangle', rotation: 0 },
			'blue'
		);
		expect(slot).toBe(1);
		expect(cell.slots).toEqual([null, 'blue']);
	});

	it('keeps the color underneath when re-cutting a solid square', () => {
		const { cell } = buildPlacement(
			solid('blue'),
			[0.7, 0.2],
			{ mode: 'paint', layout: 'hst', rotation: 0 },
			'green'
		);
		expect(cell.slots).toEqual(['blue', 'green']);
	});

	it('stamps a block into the fabric role and inherits the rest', () => {
		const { cell } = buildPlacement(
			solid('blue'),
			[0.5, 0.5],
			{ mode: 'stamp', layout: 'square-in-square', rotation: 0 },
			'green'
		);
		expect(cell.slots).toEqual(['green', 'blue', 'blue', 'blue', 'blue']);
	});

	it('repaints one slot when the block is already there', () => {
		const stamped: Cell = {
			layout: 'square-in-square',
			rotation: 0,
			slots: ['green', 'blue', 'blue', 'blue', 'blue']
		};
		const { cell } = buildPlacement(
			stamped,
			[0.05, 0.05],
			{ mode: 'stamp', layout: 'square-in-square', rotation: 0 },
			'red'
		);
		expect(cell.slots).toEqual(['green', 'red', 'blue', 'blue', 'blue']);
	});

	it('places a saved block exactly', () => {
		const { cell } = buildPlacement(
			solid('blue'),
			[0.5, 0.5],
			{ mode: 'exact', layout: 'hst', rotation: 2, slots: ['red', null] },
			'green'
		);
		expect(cell).toEqual({ layout: 'hst', rotation: 2, slots: ['red', null] });
	});
});

describe('buildErase', () => {
	it('clears the slot under the point and collapses an emptied cell', () => {
		const half: Cell = { layout: 'rectangle', rotation: 0, slots: ['blue', null] };
		expect(buildErase(half, [0.25, 0.5])).toEqual(emptyCell());
	});

	it('is a no-op on an empty slot', () => {
		expect(buildErase(emptyCell(), [0.5, 0.5])).toBeNull();
	});
});
