import { describe, expect, it } from 'vitest';
import { COLS, ROWS } from './data';
import { slotAt, type LayoutId, type Point } from './geometry';
import { cellIndex, type Cell } from './model';
import { mirrorCellGeom, mirrorTargets, withMirrors, type Symmetry } from './mirror';

const fabricAt = (cell: Cell, point: Point): string | null =>
	cell.slots[slotAt(cell.layout, cell.rotation, point)];

/*
 * Sample points that stay clear of every layout's slot boundaries (the two
 * diagonals and the horizontal/vertical middles), so lookups are unambiguous.
 */
const samples: Point[] = [0.15, 0.35, 0.65, 0.85]
	.flatMap((x) => [0.15, 0.35, 0.65, 0.85].map((y): Point => [x, y]))
	.filter(
		([x, y]) =>
			Math.abs(x - y) > 0.1 &&
			Math.abs(x + y - 1) > 0.1 &&
			Math.abs(x - 0.5) > 0.1 &&
			Math.abs(y - 0.5) > 0.1
	);

const FABRIC_POOL = ['teal-deep', 'mint', 'orchid', 'cream'];

const filledCell = (layout: LayoutId, rotation: number, slotCount: number): Cell => ({
	layout,
	rotation,
	slots: FABRIC_POOL.slice(0, slotCount)
});

const cases: [LayoutId, number][] = [
	['whole', 1],
	['half', 2],
	['diagonal', 2],
	['quarters', 4]
];

describe('mirrorCellGeom', () => {
	it.each(cases)('reflects %s cells: fabric at p mirrors to 1-p', (layout, slotCount) => {
		for (const rotation of [0, 1, 2, 3]) {
			const cell = filledCell(layout, rotation, slotCount);
			const mirroredV = mirrorCellGeom(cell, 'v');
			const mirroredH = mirrorCellGeom(cell, 'h');
			for (const [x, y] of samples) {
				expect(fabricAt(mirroredV, [1 - x, y])).toBe(fabricAt(cell, [x, y]));
				expect(fabricAt(mirroredH, [x, 1 - y])).toBe(fabricAt(cell, [x, y]));
			}
		}
	});

	it.each(cases)('double-mirroring %s cells is the identity', (layout, slotCount) => {
		const cell = filledCell(layout, 0, slotCount);
		const twice = mirrorCellGeom(mirrorCellGeom(cell, 'v'), 'v');
		for (const point of samples) {
			expect(fabricAt(twice, point)).toBe(fabricAt(cell, point));
		}
	});

	it('maps empty cells to empty cells', () => {
		const mirrored = mirrorCellGeom({ layout: 'diagonal', rotation: 0, slots: [null, null] }, 'v');
		expect(mirrored.slots.every((slot) => slot === null)).toBe(true);
	});
});

describe('mirrorTargets', () => {
	const cell = filledCell('whole', 0, 1);
	const sym = (overrides: Partial<Symmetry>): Symmetry => ({
		v: false,
		h: false,
		axisV: COLS,
		axisH: ROWS,
		...overrides
	});

	it('mirrors across a centered vertical axis', () => {
		const targets = mirrorTargets(cellIndex(2, 0), cell, sym({ v: true }));
		expect([...targets.keys()]).toEqual([cellIndex(2, COLS - 1)]);
	});

	it('produces three mirrors when both axes are on', () => {
		const targets = mirrorTargets(cellIndex(0, 0), cell, sym({ v: true, h: true }));
		expect(new Set(targets.keys())).toEqual(
			new Set([cellIndex(0, COLS - 1), cellIndex(ROWS - 1, 0), cellIndex(ROWS - 1, COLS - 1)])
		);
	});

	it('skips cells that mirror onto themselves', () => {
		// axisV through the centre of column 3: column 3 maps to itself.
		const targets = mirrorTargets(cellIndex(0, 3), cell, sym({ v: true, axisV: 7 }));
		expect(targets.size).toBe(0);
	});

	it('skips mirrors that fall off the grid', () => {
		// Axis near the left edge: column 4 would mirror to column -3.
		const targets = mirrorTargets(cellIndex(0, 4), cell, sym({ v: true, axisV: 2 }));
		expect(targets.size).toBe(0);
	});

	it('returns nothing when symmetry is off', () => {
		expect(mirrorTargets(0, cell, sym({})).size).toBe(0);
	});
});

describe('withMirrors', () => {
	it('bundles the primary cell with its mirrors', () => {
		const cell = filledCell('whole', 0, 1);
		const updates = withMirrors(cellIndex(1, 1), cell, {
			v: true,
			h: false,
			axisV: COLS,
			axisH: ROWS
		});
		expect(updates.get(cellIndex(1, 1))).toBe(cell);
		expect(updates.size).toBe(2);
	});
});
