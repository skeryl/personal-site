import { describe, expect, it } from 'vitest';
import {
	BLOCK_LAYOUTS,
	LAYOUTS,
	PIECE_LAYOUTS,
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

describe('LAYOUTS', () => {
	it('registers every piece and block by id', () => {
		[...PIECE_LAYOUTS, ...BLOCK_LAYOUTS].forEach((layout) => {
			expect(LAYOUTS[layout.id]).toBe(layout);
		});
	});

	it('gives every block at least one slot that takes the selected fabric', () => {
		BLOCK_LAYOUTS.forEach((layout) => {
			expect(layout.slots.some((s) => s.role === 0)).toBe(true);
		});
	});
});

describe('rotatedSlots', () => {
	it('memoizes: repeated calls return the same instance', () => {
		expect(rotatedSlots('hst', 1)).toBe(rotatedSlots('hst', 1));
	});

	it('normalizes rotation, so 4 turns equals 0', () => {
		expect(rotatedSlots('hourglass', 4)).toBe(rotatedSlots('hourglass', 0));
	});

	it('returns the raw layout slots for rotation 0', () => {
		expect(rotatedSlots('rectangle', 0)).toBe(LAYOUTS.rectangle.slots);
	});
});

describe('slotAt', () => {
	it('always hits slot 0 in the square layout', () => {
		expect(slotAt('square', 0, [0.5, 0.5])).toBe(0);
	});

	it('splits the rectangle layout at the vertical middle', () => {
		expect(slotAt('rectangle', 0, [0.25, 0.5])).toBe(0);
		expect(slotAt('rectangle', 0, [0.75, 0.5])).toBe(1);
	});

	it('resolves clicks exactly on the far edge to the edge slot, not slot 0', () => {
		// x=1 lies outside every polygon's strict inequalities without clamping.
		expect(slotAt('rectangle', 0, [1, 0.5])).toBe(1);
		expect(slotAt('rectangle', 0, [1, 1])).toBe(1);
	});

	it('distinguishes the half square triangle halves', () => {
		expect(slotAt('hst', 0, [0.2, 0.7])).toBe(0);
		expect(slotAt('hst', 0, [0.7, 0.2])).toBe(1);
	});

	it('finds all four hourglass quarters', () => {
		expect(slotAt('hourglass', 0, [0.5, 0.1])).toBe(0);
		expect(slotAt('hourglass', 0, [0.9, 0.5])).toBe(1);
		expect(slotAt('hourglass', 0, [0.5, 0.9])).toBe(2);
		expect(slotAt('hourglass', 0, [0.1, 0.5])).toBe(3);
	});

	it('finds the goose and its sky corners in a flying geese unit', () => {
		expect(slotAt('flying-geese', 0, [0.15, 0.5])).toBe(0);
		expect(slotAt('flying-geese', 0, [0.4, 0.08])).toBe(1);
		expect(slotAt('flying-geese', 0, [0.4, 0.92])).toBe(2);
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
