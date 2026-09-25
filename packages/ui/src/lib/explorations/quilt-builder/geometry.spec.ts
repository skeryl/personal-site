import { describe, expect, it } from 'vitest';
import {
	BLOCK_CUTS,
	CUTS,
	PIECE_CUTS,
	centroidOf,
	normalizeTurns,
	pointInPolygon,
	rotatePoint,
	rotatedPieces,
	pieceAt,
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

describe('CUTS', () => {
	it('registers every piece and block cut by id', () => {
		[...PIECE_CUTS, ...BLOCK_CUTS].forEach((cut) => {
			expect(CUTS[cut.id]).toBe(cut);
		});
	});

	it('gives every block cut at least one piece that takes the selected fabric', () => {
		BLOCK_CUTS.forEach((cut) => {
			expect(cut.pieces.some((s) => s.role === 0)).toBe(true);
		});
	});

	it('keeps legacy cuts out of the palette but resolvable for migration', () => {
		expect(CUTS.pinwheel.group).toBe('legacy');
		expect([...PIECE_CUTS, ...BLOCK_CUTS].map((c) => c.id)).not.toContain('pinwheel');
	});
});

describe('rotatedPieces', () => {
	it('memoizes: repeated calls return the same instance', () => {
		expect(rotatedPieces('hst', 1)).toBe(rotatedPieces('hst', 1));
	});

	it('normalizes rotation, so 4 turns equals 0', () => {
		expect(rotatedPieces('hourglass', 4)).toBe(rotatedPieces('hourglass', 0));
	});

	it('returns the raw cut pieces for rotation 0', () => {
		expect(rotatedPieces('rectangle', 0)).toBe(CUTS.rectangle.pieces);
	});
});

describe('pieceAt', () => {
	it('always hits piece 0 in the square cut', () => {
		expect(pieceAt('square', 0, [0.5, 0.5])).toBe(0);
	});

	it('splits the rectangle cut at the vertical middle', () => {
		expect(pieceAt('rectangle', 0, [0.25, 0.5])).toBe(0);
		expect(pieceAt('rectangle', 0, [0.75, 0.5])).toBe(1);
	});

	it('resolves clicks exactly on the far edge to the edge piece, not piece 0', () => {
		// x=1 lies outside every polygon's strict inequalities without clamping.
		expect(pieceAt('rectangle', 0, [1, 0.5])).toBe(1);
		expect(pieceAt('rectangle', 0, [1, 1])).toBe(1);
	});

	it('distinguishes the half square triangle halves', () => {
		expect(pieceAt('hst', 0, [0.2, 0.7])).toBe(0);
		expect(pieceAt('hst', 0, [0.7, 0.2])).toBe(1);
	});

	it('finds all four hourglass quarters', () => {
		expect(pieceAt('hourglass', 0, [0.5, 0.1])).toBe(0);
		expect(pieceAt('hourglass', 0, [0.9, 0.5])).toBe(1);
		expect(pieceAt('hourglass', 0, [0.5, 0.9])).toBe(2);
		expect(pieceAt('hourglass', 0, [0.1, 0.5])).toBe(3);
	});

	it('finds the goose and its sky corners in a flying geese unit', () => {
		expect(pieceAt('flying-geese', 0, [0.15, 0.5])).toBe(0);
		expect(pieceAt('flying-geese', 0, [0.4, 0.08])).toBe(1);
		expect(pieceAt('flying-geese', 0, [0.4, 0.92])).toBe(2);
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
