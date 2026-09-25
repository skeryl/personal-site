/*
 * The v2 -> v3 upgrade. v2 stored one flat cell per grid position; v3 stores a
 * block tree, and the three layouts that became compositions have to come back
 * as grids with their colours intact.
 */

import { describe, expect, it } from 'vitest';
import { divisionOf, flatten, type Block } from './model';
import { gridDims, parseSavedState, sanitizeBlock, sizeInches } from './persistence';

const KNOWN = new Set(['blue', 'cream']);
const fabrics = (block: Block) => flatten(block).map((p) => p.fabric);

describe('sanitizeBlock reading v2 cells', () => {
	it('reads a plain cut as a leaf', () => {
		const block = sanitizeBlock({ layout: 'hst', rotation: 1, slots: ['blue', 'cream'] }, KNOWN);
		expect(divisionOf(block)).toBe(1);
		expect(fabrics(block)).toEqual(['blue', 'cream']);
	});

	it('converts a saved pinwheel into a 2x2 grid, keeping every colour', () => {
		const slots = ['blue', 'cream', 'blue', 'cream', 'blue', 'cream', 'blue', 'cream'];
		const block = sanitizeBlock({ layout: 'pinwheel', rotation: 0, slots }, KNOWN);
		expect(divisionOf(block)).toBe(2);
		expect(fabrics(block).filter((f) => f === 'blue')).toHaveLength(4);
		expect(fabrics(block).filter((f) => f === 'cream')).toHaveLength(4);
	});

	it('converts a rotated four patch, keeping the checkerboard', () => {
		const block = sanitizeBlock(
			{ layout: 'four-patch', rotation: 1, slots: ['blue', 'cream', 'blue', 'cream'] },
			KNOWN
		);
		expect(divisionOf(block)).toBe(2);
		expect(fabrics(block).filter((f) => f === 'blue')).toHaveLength(2);
	});

	it('drops fabrics that no longer exist', () => {
		const block = sanitizeBlock({ layout: 'hst', rotation: 0, slots: ['gone', 'blue'] }, KNOWN);
		expect(fabrics(block)).toEqual([null, 'blue']);
	});

	it('falls back to an empty block on a bad cut or wrong piece count', () => {
		expect(fabrics(sanitizeBlock({ layout: 'nope', slots: [] }, KNOWN))).toEqual([null]);
		expect(fabrics(sanitizeBlock({ layout: 'hst', slots: ['blue'] }, KNOWN))).toEqual([null]);
	});
});

describe('sanitizeBlock reading v3 blocks', () => {
	it('round-trips a grid', () => {
		const saved = {
			kind: 'grid',
			cols: 2,
			rows: 2,
			children: Array.from({ length: 4 }, () => ({
				kind: 'leaf',
				cut: 'square',
				rotation: 0,
				fabrics: ['blue']
			}))
		};
		const block = sanitizeBlock(saved, KNOWN);
		expect(divisionOf(block)).toBe(2);
		expect(fabrics(block)).toEqual(Array(4).fill('blue'));
	});

	it('rejects a division the palette does not offer', () => {
		const saved = {
			kind: 'grid',
			cols: 3,
			rows: 3,
			children: Array.from({ length: 9 }, () => ({
				kind: 'leaf',
				cut: 'square',
				rotation: 0,
				fabrics: ['blue']
			}))
		};
		expect(divisionOf(sanitizeBlock(saved, KNOWN))).toBe(1);
	});

	it('rejects a grid whose child count does not match its shape', () => {
		const saved = { kind: 'grid', cols: 2, rows: 2, children: [] };
		expect(divisionOf(sanitizeBlock(saved, KNOWN))).toBe(1);
	});
});

describe('parseSavedState', () => {
	it('migrates a whole v2 save, custom blocks included', () => {
		const state = parseSavedState({
			name: 'Stars',
			sizeId: 'throw',
			blockSize: 8,
			materials: [{ id: 'blue', name: 'Blue', hex: '#4f7fe8' }],
			selectedMaterialId: 'blue',
			customBlocks: [
				{ id: 'c1', name: 'Mine', layout: 'pinwheel', rotation: 0, slots: Array(8).fill('blue') }
			],
			cells: [{ layout: 'square', rotation: 0, slots: ['blue'] }]
		});
		expect(state).not.toBeNull();
		expect(state!.name).toBe('Stars');
		// A saved block becomes a one-by-one pattern.
		expect(state!.patterns).toHaveLength(1);
		expect(Object.keys(state!.patterns[0].blocks)).toEqual(['0,0']);
		expect(divisionOf(state!.patterns[0].blocks['0,0'])).toBe(2);
		expect(fabrics(state!.patterns[0].blocks['0,0'])).toEqual(Array(8).fill('blue'));
		expect(fabrics(state!.cells[0])).toEqual(['blue']);
	});

	it('reads a multi-block pattern and normalizes its coordinates', () => {
		const leaf = { kind: 'leaf', cut: 'square', rotation: 0, fabrics: ['blue'] };
		const state = parseSavedState({
			materials: [{ id: 'blue', name: 'Blue', hex: '#4f7fe8' }],
			patterns: [{ id: 'p1', name: 'Ell', blocks: { '3,3': leaf, '3,4': leaf, '4,4': leaf } }],
			cells: []
		});
		expect(Object.keys(state!.patterns[0].blocks).sort()).toEqual(['0,0', '0,1', '1,1']);
	});

	it('drops pattern coordinates that are not a coordinate', () => {
		const leaf = { kind: 'leaf', cut: 'square', rotation: 0, fabrics: ['blue'] };
		const state = parseSavedState({
			materials: [{ id: 'blue', name: 'Blue', hex: '#4f7fe8' }],
			patterns: [{ id: 'p1', name: 'Junk', blocks: { '0,0': leaf, nope: leaf } }],
			cells: []
		});
		expect(Object.keys(state!.patterns[0].blocks)).toEqual(['0,0']);
	});

	it('returns null for junk', () => {
		expect(parseSavedState(null)).toBeNull();
		expect(parseSavedState('nope')).toBeNull();
	});
});

describe('quilt size', () => {
	const base = { materials: [], cells: [] };

	it('defaults to Throw', () => {
		const state = parseSavedState(base);
		expect(state!.sizeId).toBe('throw');
		expect(sizeInches(state!.sizeId, 0, 0)).toEqual({ width: 48, height: 64 });
	});

	it('maps the sizes that were split into Full/Queen', () => {
		expect(parseSavedState({ ...base, sizeId: 'full' })!.sizeId).toBe('full-queen');
		expect(parseSavedState({ ...base, sizeId: 'queen' })!.sizeId).toBe('full-queen');
	});

	it('falls back for a size that never existed', () => {
		expect(parseSavedState({ ...base, sizeId: 'emperor' })!.sizeId).toBe('throw');
	});

	it('keeps a custom size and clamps it into range', () => {
		const state = parseSavedState({
			...base,
			sizeId: 'custom',
			customWidth: 9,
			customHeight: 5000
		});
		expect(state!.sizeId).toBe('custom');
		expect(state!.customWidth).toBe(12);
		expect(state!.customHeight).toBe(200);
	});

	it('counts whole blocks only, so a custom size can leave a remainder', () => {
		// 50 inches of 8" blocks is six blocks and two inches left over.
		expect(gridDims('custom', 8, 50, 64)).toEqual({ cols: 6, rows: 8 });
	});

	it('always leaves at least one block', () => {
		expect(gridDims('custom', 12, 12, 12)).toEqual({ cols: 1, rows: 1 });
	});
});
