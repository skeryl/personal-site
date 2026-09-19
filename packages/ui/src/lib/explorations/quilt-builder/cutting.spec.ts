import { describe, expect, it } from 'vitest';
import type { Material } from './data';
import { blankInches, cuttingListFor } from './cutting';
import type { Cell } from './model';

const blue: Material = { id: 'blue', name: 'Blue', hex: '#0000ff' };
const green: Material = { id: 'green', name: 'Green', hex: '#00ff00' };

describe('blankInches', () => {
	it('adds seam allowance on both sides of the finished size', () => {
		expect(blankInches(8, 1)).toBe(8.5);
		expect(blankInches(8, 0.5)).toBe(4.5);
	});
});

describe('cuttingListFor', () => {
	it('lists only fabrics that are placed, in palette order', () => {
		const cells: Cell[] = [{ layout: 'square', rotation: 0, slots: ['green'] }];
		const groups = cuttingListFor(cells, [blue, green], 8);
		expect(groups.map((g) => g.material.id)).toEqual(['green']);
	});

	it('rounds triangles up to whole blanks by yield', () => {
		// Three half-square triangles need two 8½" squares cut corner to corner.
		const cells: Cell[] = [
			{ layout: 'hst', rotation: 0, slots: ['blue', null] },
			{ layout: 'hst', rotation: 0, slots: ['blue', 'blue'] }
		];
		const [group] = cuttingListFor(cells, [blue], 8);
		expect(group.rows).toHaveLength(1);
		expect(group.rows[0].label).toBe('8½”');
		expect(group.rows[0].kinds).toEqual([{ kind: 'hst', pieces: 3, blanks: 2 }]);
		expect(group.totalBlanks).toBe(2);
	});

	it('groups by blank size, largest first', () => {
		const cells: Cell[] = [
			{ layout: 'square-in-square', rotation: 0, slots: ['green', 'blue', 'blue', 'blue', 'blue'] }
		];
		const groups = cuttingListFor(cells, [blue, green], 8);
		expect(groups[0].material.id).toBe('blue');
		expect(groups[0].rows.map((r) => r.label)).toEqual(['4½”']);
		expect(groups[0].rows[0].kinds).toEqual([{ kind: 'hst', pieces: 4, blanks: 2 }]);
		expect(groups[1].rows.map((r) => r.label)).toEqual(['6⅛”']);
	});
});
