import { describe, expect, it } from 'vitest';
import { CELL_COUNT, emptyCell, isEmpty } from './model';
import {
	parseWorkingState,
	readJson,
	sanitizeCells,
	sanitizePatterns,
	writeJson,
	type StorageLike
} from './persistence';

const fakeStorage = (
	initial: Record<string, string> = {}
): StorageLike & {
	data: Map<string, string>;
} => {
	const data = new Map(Object.entries(initial));
	return {
		data,
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value)
	};
};

const throwingStorage: StorageLike = {
	getItem: () => {
		throw new Error('denied');
	},
	setItem: () => {
		throw new DOMException('quota', 'QuotaExceededError');
	}
};

describe('readJson / writeJson', () => {
	it('round-trips values', () => {
		const storage = fakeStorage();
		expect(writeJson(storage, 'k', { a: 1 })).toBe(true);
		expect(readJson(storage, 'k')).toEqual({ a: 1 });
	});

	it('returns null for missing keys and malformed JSON', () => {
		expect(readJson(fakeStorage(), 'missing')).toBeNull();
		expect(readJson(fakeStorage({ bad: '{oops' }), 'bad')).toBeNull();
	});

	it('never throws when storage does', () => {
		expect(readJson(throwingStorage, 'k')).toBeNull();
		expect(writeJson(throwingStorage, 'k', 1)).toBe(false);
	});
});

describe('sanitizeCells', () => {
	it('turns garbage into a full empty board', () => {
		for (const garbage of [null, 42, 'nope', {}, []]) {
			const board = sanitizeCells(garbage);
			expect(board).toHaveLength(CELL_COUNT);
			expect(board.every(isEmpty)).toBe(true);
		}
	});

	it('preserves valid cells and normalizes rotation', () => {
		const board = sanitizeCells([{ layout: 'diagonal', rotation: -1, slots: ['tan', null] }]);
		expect(board[0]).toEqual({ layout: 'diagonal', rotation: 3, slots: ['tan', null] });
	});

	it('rejects unknown layouts, wrong slot counts, and unknown fabrics', () => {
		const board = sanitizeCells([
			{ layout: 'hexagon', rotation: 0, slots: [null] },
			{ layout: 'diagonal', rotation: 0, slots: [null] },
			{ layout: 'whole', rotation: 0, slots: ['no-such-fabric'] }
		]);
		expect(board[0]).toEqual(emptyCell());
		expect(board[1]).toEqual(emptyCell());
		expect(board[2]).toEqual({ layout: 'whole', rotation: 0, slots: [null] });
	});
});

describe('sanitizePatterns', () => {
	const mintId = () => 'minted-id';

	it('migrates legacy name-keyed saves, minting stable ids', () => {
		const migrated = sanitizePatterns({ 'my quilt': { cells: [], savedAt: 123 } }, mintId);
		expect(migrated['minted-id']).toMatchObject({
			id: 'minted-id',
			name: 'my quilt',
			savedAt: 123
		});
	});

	it('keeps modern id-keyed entries as-is', () => {
		const migrated = sanitizePatterns(
			{ abc: { id: 'abc', name: 'kept', cells: [], savedAt: 5 } },
			mintId
		);
		expect(Object.keys(migrated)).toEqual(['abc']);
		expect(migrated.abc.name).toBe('kept');
	});

	it('drops garbage entries and garbage input', () => {
		expect(sanitizePatterns(null, mintId)).toEqual({});
		expect(sanitizePatterns({ junk: 42 }, mintId)).toEqual({});
	});
});

describe('parseWorkingState', () => {
	const known = new Set(['known-id']);

	it('accepts the legacy bare-array format', () => {
		const state = parseWorkingState([], known);
		expect(state.cells).toHaveLength(CELL_COUNT);
		expect(state.currentId).toBeNull();
	});

	it('keeps currentId only when the pattern still exists', () => {
		expect(parseWorkingState({ currentId: 'known-id' }, known).currentId).toBe('known-id');
		expect(parseWorkingState({ currentId: 'gone' }, known).currentId).toBeNull();
	});

	it('returns nulls for garbage', () => {
		expect(parseWorkingState('junk', known)).toEqual({ cells: null, currentId: null, name: null });
	});
});
