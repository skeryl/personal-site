import { describe, expect, it } from 'vitest';
import {
	LAYOUTS,
	centroidOf,
	normalizeTurns,
	pointInPolygon,
	rotatePoint,
	rotatedSlots,
	slotAt,
	toPolygonPoints,
	type Point
} from './geometry';

describe('normalizeTurns', () => {
	it('wraps positive and negative turns into 0..3', () => {
		expect([0, 1, 4, 5, -1, -4].map(normalizeTurns)).toEqual([0, 1, 0, 1, 3, 0]);
	});
});

describe('rotatePoint', () => {
	it('rotates a corner clockwise about the centre', () => {
		expect(rotatePoint([0, 0], 1)).toEqual([1, 0]);
		expect(rotatePoint([1, 0], 1)).toEqual([1, 1]);
	});

	it('is the identity after four turns', () => {
		expect(rotatePoint([0.25, 0.75], 4)).toEqual([0.25, 0.75]);
	});

	it('treats negative turns as their positive complement', () => {
		expect(rotatePoint([0.25, 0.75], -1)).toEqual(rotatePoint([0.25, 0.75], 3));
	});
});

describe('rotatedSlots', () => {
	it('memoizes: repeated calls return the same instance', () => {
		expect(rotatedSlots('diagonal', 1)).toBe(rotatedSlots('diagonal', 1));
	});

	it('normalizes rotation, so 4 turns equals 0', () => {
		expect(rotatedSlots('quarters', 4)).toBe(rotatedSlots('quarters', 0));
	});

	it('returns the raw layout slots for rotation 0', () => {
		expect(rotatedSlots('half', 0)).toBe(LAYOUTS.half.slots);
	});
});

describe('slotAt', () => {
	it('always hits slot 0 in the whole layout', () => {
		expect(slotAt('whole', 0, [0.5, 0.5])).toBe(0);
	});

	it('splits the half layout at the horizontal middle', () => {
		expect(slotAt('half', 0, [0.5, 0.25])).toBe(0);
		expect(slotAt('half', 0, [0.5, 0.75])).toBe(1);
	});

	it('resolves clicks exactly on the far edge to the edge slot, not slot 0', () => {
		// y=1 lies outside every polygon's strict inequalities without clamping.
		expect(slotAt('half', 0, [0.5, 1])).toBe(1);
		expect(slotAt('half', 0, [1, 1])).toBe(1);
	});

	it('distinguishes the diagonal halves', () => {
		expect(slotAt('diagonal', 0, [0.7, 0.2])).toBe(0);
		expect(slotAt('diagonal', 0, [0.2, 0.7])).toBe(1);
	});

	it('finds all four quarters', () => {
		expect(slotAt('quarters', 0, [0.5, 0.1])).toBe(0);
		expect(slotAt('quarters', 0, [0.9, 0.5])).toBe(1);
		expect(slotAt('quarters', 0, [0.5, 0.9])).toBe(2);
		expect(slotAt('quarters', 0, [0.1, 0.5])).toBe(3);
	});
});

describe('pointInPolygon', () => {
	const triangle: Point[] = [
		[0, 0],
		[1, 0],
		[1, 1]
	];

	it('accepts interior points and rejects exterior ones', () => {
		expect(pointInPolygon([0.7, 0.2], triangle)).toBe(true);
		expect(pointInPolygon([0.2, 0.7], triangle)).toBe(false);
	});
});

describe('centroidOf', () => {
	it('averages the vertices', () => {
		expect(
			centroidOf([
				[0, 0],
				[1, 0],
				[1, 1]
			])
		).toEqual([2 / 3, 1 / 3]);
	});
});

describe('toPolygonPoints', () => {
	it('scales points into an SVG points string', () => {
		expect(
			toPolygonPoints(
				[
					[0, 0],
					[1, 0.5]
				],
				100
			)
		).toBe('0,0 100,50');
	});
});
