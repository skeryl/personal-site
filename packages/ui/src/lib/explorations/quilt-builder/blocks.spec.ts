/*
 * The point of composition: blocks that used to be hardcoded polygon lists are
 * now grids of simpler cuts. These tests hold the two descriptions to each
 * other, so a composed pinwheel is provably the same shape as the old one.
 */

import { describe, expect, it } from 'vitest';
import { BLOCK_TYPES, BLOCK_TYPE_BY_ID, REPLACED_BY } from './blocks';
import { CUTS, centroidOf, rotatedPieces, type Point } from './geometry';
import { divisionOf, flatten, leafBlock, rotateBlock, type Block } from './model';

/** Polygons as a comparable set: vertex order and piece order do not matter. */
const shapeKey = (points: readonly Point[]): string =>
	points
		.map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`)
		.sort()
		.join(' ');

const composedShapes = (block: Block) =>
	flatten(block)
		.map((p) => `${p.kind} ${p.frac.toFixed(6)} r${p.role} ${shapeKey(p.points)}`)
		.sort();

const legacyShapes = (cutId: string, rotation = 0) =>
	rotatedPieces(cutId, rotation)
		.map((s) => `${s.kind} ${s.frac.toFixed(6)} r${s.role} ${shapeKey(s.points)}`)
		.sort();

describe('compositions match the cuts they replaced', () => {
	it.each(Object.keys(REPLACED_BY))('%s is the same shape, frac and role', (cutId) => {
		expect(composedShapes(REPLACED_BY[cutId])).toEqual(legacyShapes(cutId));
	});

	it.each(Object.keys(REPLACED_BY))('%s still matches after rotation', (cutId) => {
		for (const turns of [1, 2, 3]) {
			expect(composedShapes(rotateBlock(REPLACED_BY[cutId], turns))).toEqual(
				legacyShapes(cutId, turns)
			);
		}
	});
});

describe('BLOCK_TYPES', () => {
	it('offers the six the design draws, in the order it stacks them', () => {
		const ids = BLOCK_TYPES.map((t) => t.id);
		expect(ids).toEqual(['hst', 'half-pinwheel', 'zig-zag', 'geese', 'stripe', 'diamond']);
	});

	it('gives every type at least one piece that takes the selected fabric', () => {
		BLOCK_TYPES.forEach((type) => {
			expect(flatten(type.block).some((p) => p.role === 0)).toBe(true);
		});
	});

	it('describes all but the lone triangle as 2x2 grids', () => {
		expect(divisionOf(BLOCK_TYPE_BY_ID.hst.block)).toBe(1);
		['half-pinwheel', 'zig-zag', 'geese', 'stripe', 'diamond'].forEach((id) => {
			expect(divisionOf(BLOCK_TYPE_BY_ID[id].block)).toBe(2);
		});
	});

	it('builds them out of half square triangles and plain ground', () => {
		BLOCK_TYPES.forEach((type) => {
			expect(flatten(type.block).every((p) => p.kind === 'hst' || p.kind === 'square')).toBe(true);
		});
		// The ground quarters keep what was under them rather than taking fabric.
		const ground = flatten(BLOCK_TYPE_BY_ID['half-pinwheel'].block).filter(
			(p) => p.kind === 'square'
		);
		expect(ground).toHaveLength(2);
		expect(ground.every((p) => p.role === 1)).toBe(true);
	});

	it('still knows the compositions that replaced the v2 cuts', () => {
		['pinwheel', 'broken-dishes', 'four-patch'].forEach((id) => {
			expect(divisionOf(REPLACED_BY[id])).toBe(2);
		});
		// Two of a four patch's squares take the fabric; the others keep what was under.
		const roles = flatten(REPLACED_BY['four-patch']).map((p) => p.role);
		expect(roles.filter((r) => r === 0)).toHaveLength(2);
	});
});

describe('centroids stay inside their own piece', () => {
	it('so resampling a composition samples the right child', () => {
		flatten(REPLACED_BY.pinwheel).forEach((p) => {
			const [cx, cy] = centroidOf(p.points);
			expect(cx).toBeGreaterThan(0);
			expect(cx).toBeLessThan(1);
			expect(cy).toBeGreaterThan(0);
			expect(cy).toBeLessThan(1);
		});
	});

	it('keeps a plain leaf identical to its cut', () => {
		expect(flatten(leafBlock('hst')).map((p) => p.kind)).toEqual(
			CUTS.hst.pieces.map((p) => p.kind)
		);
	});
});
