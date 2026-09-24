import { describe, expect, it } from 'vitest';
import type { Material } from './data';
import { blankInches, cuttingListFor } from './cutting';
import { leafBlock, type Block } from './model';
import { BLOCK_TYPE_BY_ID } from './blocks';
import { resample } from './placement';

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
		const cells: Block[] = [leafBlock('square', 0, ['green'])];
		const groups = cuttingListFor(cells, [blue, green], 8);
		expect(groups.map((g) => g.material.id)).toEqual(['green']);
	});

	it('rounds triangles up to whole blanks by yield', () => {
		// Three half-square triangles need two 8 1/2" squares cut corner to corner.
		const cells: Block[] = [
			leafBlock('hst', 0, ['blue', null]),
			leafBlock('hst', 0, ['blue', 'blue'])
		];
		const [group] = cuttingListFor(cells, [blue], 8);
		expect(group.rows).toHaveLength(1);
		expect(group.rows[0].label).toBe('8 1/2”');
		expect(group.rows[0].kinds).toEqual([{ kind: 'hst', pieces: 3, blanks: 2 }]);
		expect(group.totalBlanks).toBe(2);
	});

	it('groups by blank size, largest first', () => {
		const cells: Block[] = [
			leafBlock('square-in-square', 0, ['green', 'blue', 'blue', 'blue', 'blue'])
		];
		const groups = cuttingListFor(cells, [blue, green], 8);
		expect(groups[0].material.id).toBe('blue');
		expect(groups[0].rows.map((r) => r.label)).toEqual(['4 1/2”']);
		expect(groups[0].rows[0].kinds).toEqual([{ kind: 'hst', pieces: 4, blanks: 2 }]);
		expect(groups[1].rows.map((r) => r.label)).toEqual(['6 1/8”']);
	});
});

describe('cuttingListFor with composition', () => {
	const solid = (id: string): Block => leafBlock('square', 0, [id]);

	it('scales blank size by the composition, so a 2x2 halves it', () => {
		// A pinwheel is four half-block triangles: 12" block -> 6 1/2" blanks.
		const plain = resample(BLOCK_TYPE_BY_ID.pinwheel.block, solid('blue'));
		const [flat] = cuttingListFor([plain], [blue], 12);
		expect(flat.rows.map((r) => r.label)).toEqual(['6 1/2”']);

		// The same pinwheel inside each quarter of a 2x2 gives 3 1/2" blanks.
		const composed: Block = {
			kind: 'grid',
			cols: 2,
			rows: 2,
			children: Array.from({ length: 4 }, () => plain)
		};
		const [nested] = cuttingListFor([composed], [blue], 12);
		expect(nested.rows.map((r) => r.label)).toEqual(['3 1/2”']);
	});

	it('merges pieces of the same finished size from different compositions', () => {
		const composed: Block = {
			kind: 'grid',
			cols: 2,
			rows: 2,
			children: Array.from({ length: 4 }, () => leafBlock('square', 0, ['blue']))
		};
		// A 2x2 of squares in a 12" block is four 6 1/2" blanks, the same blank a
		// plain 6" block needs, so the two tally into one row.
		const [group] = cuttingListFor([composed, composed], [blue], 12);
		expect(group.rows).toHaveLength(1);
		expect(group.rows[0].label).toBe('6 1/2”');
		expect(group.totalBlanks).toBe(8);
	});
});
