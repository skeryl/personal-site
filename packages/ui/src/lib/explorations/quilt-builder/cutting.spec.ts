import { describe, expect, it } from 'vitest';
import { SEAM_INCHES, SQUARE_INCHES } from './data';
import {
	BLANK_INCHES,
	CUT_DIMS,
	KIND_LAYOUT,
	THUMB_SCALE,
	cuttingListFor,
	thumbPolys
} from './cutting';
import { emptyBoard, type Cell } from './model';

describe('cut dimensions', () => {
	it('derives the blank from the finished size plus seam allowance both sides', () => {
		expect(BLANK_INCHES).toBe(SQUARE_INCHES + 2 * SEAM_INCHES);
	});

	it('subdivides the blank per the real cutting workflow', () => {
		expect(CUT_DIMS.square).toContain(`${BLANK_INCHES}”x${BLANK_INCHES}”`);
		expect(CUT_DIMS.rect).toContain(`${BLANK_INCHES / 2}”x${BLANK_INCHES}”`);
		expect(CUT_DIMS.hst).toContain('corner to corner');
		expect(CUT_DIMS.qst).toContain('both diagonals');
	});
});

describe('KIND_LAYOUT', () => {
	it('inverts LAYOUTS by piece kind', () => {
		expect(KIND_LAYOUT).toEqual({
			square: 'whole',
			rect: 'half',
			hst: 'diagonal',
			qst: 'quarters'
		});
	});
});

describe('cuttingListFor', () => {
	it('returns nothing for an empty board', () => {
		expect(cuttingListFor(emptyBoard())).toEqual([]);
	});

	it('rounds blanks up by piece yield', () => {
		const board = emptyBoard();
		// Three triangles: two blanks (one triangle spare).
		board[0] = { layout: 'diagonal', rotation: 0, slots: ['teal-deep', 'teal-deep'] };
		board[1] = { layout: 'diagonal', rotation: 0, slots: ['teal-deep', null] };
		// Two rectangles: one blank folded and cut.
		board[2] = { layout: 'half', rotation: 0, slots: ['teal-mint', 'teal-mint'] };
		// One quarter triangle: still one whole blank.
		board[3] = { layout: 'quarters', rotation: 0, slots: ['orchid', null, null, null] };

		const groups = cuttingListFor(board);
		expect(groups.map((g) => [g.fabric.id, g.totalSquares])).toEqual([
			['teal-deep', 2],
			['teal-mint', 1],
			['orchid', 1]
		]);
		expect(groups[0].rows).toEqual([{ kind: 'hst', count: 3, squares: 2 }]);
	});

	it('splits one fabric across piece kinds', () => {
		const board = emptyBoard();
		board[0] = { layout: 'whole', rotation: 0, slots: ['tan'] };
		board[1] = { layout: 'half', rotation: 0, slots: ['tan', 'tan'] };
		const [tan] = cuttingListFor(board);
		expect(tan.rows).toEqual([
			{ kind: 'square', count: 1, squares: 1 },
			{ kind: 'rect', count: 2, squares: 1 }
		]);
		expect(tan.totalSquares).toBe(2);
	});
});

describe('thumbPolys', () => {
	it('skips empty cells entirely', () => {
		expect(thumbPolys(emptyBoard())).toEqual([]);
	});

	it('offsets polygons by grid position and maps fabric to hex', () => {
		const board = emptyBoard();
		const cell: Cell = { layout: 'whole', rotation: 0, slots: ['white'] };
		board[8] = cell; // row 1, col 1
		const [poly] = thumbPolys(board);
		expect(poly.fill).toBe('#ffffff');
		expect(poly.points.split(' ')[0]).toBe(`${THUMB_SCALE},${THUMB_SCALE}`);
	});

	it('renders null slots of a pieced cell as white', () => {
		const board = emptyBoard();
		board[0] = { layout: 'diagonal', rotation: 0, slots: ['tan', null] };
		const polys = thumbPolys(board);
		expect(polys).toHaveLength(2);
		expect(polys[1].fill).toBe('#ffffff');
	});
});
