import { describe, expect, it } from 'vitest';
import { OPERATORS, OPERATOR_BY_ID, isApplyError, type Value } from './operators';

const apply = (id: keyof typeof OPERATOR_BY_ID, args: Value[]) => OPERATOR_BY_ID[id].apply(args);

describe('registry shape', () => {
	it('exposes every operator by id', () => {
		expect(Object.keys(OPERATOR_BY_ID)).toHaveLength(OPERATORS.length);
		for (const def of OPERATORS) expect(OPERATOR_BY_ID[def.id]).toBe(def);
	});

	it('gives variadic ops a minimum of two inputs', () => {
		for (const id of ['and', 'or', 'add', 'mul'] as const) {
			expect(OPERATOR_BY_ID[id].arity).toEqual(
				expect.objectContaining({ kind: 'variadic', min: 2 })
			);
		}
	});
});

describe('logic', () => {
	it('applies and/or over many args', () => {
		expect(apply('and', [true, true, true])).toBe(true);
		expect(apply('and', [true, false, true])).toBe(false);
		expect(apply('or', [false, false, true])).toBe(true);
		expect(apply('or', [false, false])).toBe(false);
	});

	it('negates', () => {
		expect(apply('not', [true])).toBe(false);
		expect(apply('not', [false])).toBe(true);
	});
});

describe('comparators', () => {
	it.each([
		['gt', 2, 1, true],
		['gt', 1, 1, false],
		['gte', 1, 1, true],
		['gte', 0, 1, false],
		['lt', 1, 2, true],
		['lt', 2, 2, false],
		['lte', 2, 2, true],
		['lte', 3, 2, false],
		['eq', 2, 2, true],
		['eq', 2, 3, false],
		['neq', 2, 3, true],
		['neq', 2, 2, false]
	] as const)('%s(%d, %d) -> %s', (id, a, b, expected) => {
		expect(apply(id, [a, b])).toBe(expected);
	});
});

describe('arithmetic', () => {
	it('adds and multiplies variadically', () => {
		expect(apply('add', [1, 2, 3])).toBe(6);
		expect(apply('mul', [2, 3, 4])).toBe(24);
	});

	it('subtracts and divides', () => {
		expect(apply('sub', [5, 2])).toBe(3);
		expect(apply('div', [10, 4])).toBe(2.5);
	});

	it('flags division by zero', () => {
		expect(apply('div', [1, 0])).toEqual({ error: 'div-by-zero' });
	});
});

describe('aggregations', () => {
	it('aggregates a number array', () => {
		expect(apply('sum', [[1, 2, 3]])).toBe(6);
		expect(apply('avg', [[1, 2, 3]])).toBe(2);
		expect(apply('min', [[3, 1, 2]])).toBe(1);
		expect(apply('max', [[3, 1, 2]])).toBe(3);
		expect(apply('count', [[3, 1, 2]])).toBe(3);
	});

	it('flattens any mix of numbers and arrays before aggregating', () => {
		expect(apply('avg', [10, [20, 30]])).toBe(20);
		expect(apply('sum', [1, 2, [3, 4]])).toBe(10);
		expect(apply('count', [[1, 2], 3])).toBe(3);
		expect(apply('max', [5, [1, 9]])).toBe(9);
	});

	it('is variadic with a minimum of one input', () => {
		for (const id of ['sum', 'avg', 'min', 'max', 'count'] as const) {
			expect(OPERATOR_BY_ID[id].arity).toEqual({ kind: 'variadic', param: 'numeric', min: 1 });
		}
	});

	it('treats empty arrays as zero for sum and count', () => {
		expect(apply('sum', [[]])).toBe(0);
		expect(apply('count', [[]])).toBe(0);
	});

	it('flags empty arrays for avg, min, and max', () => {
		expect(apply('avg', [[]])).toEqual({ error: 'empty-array' });
		expect(apply('min', [[]])).toEqual({ error: 'empty-array' });
		expect(apply('max', [[]])).toEqual({ error: 'empty-array' });
	});
});

describe('object arrays', () => {
	const ratings = [
		{ agency: 'moodys', rating: 'AA', score: 20 },
		{ agency: 'sp', rating: 'A', score: 18 }
	];

	it('plucks a numeric field into a number array', () => {
		expect(apply('pluck', [ratings, 'score'])).toEqual([20, 18]);
		expect(apply('pluck', [[], 'score'])).toEqual([]);
	});

	it('flags pluck of missing or non-numeric fields', () => {
		expect(apply('pluck', [ratings, 'outlook'])).toEqual({ error: 'unknown-field' });
		expect(apply('pluck', [ratings, 'rating'])).toEqual({ error: 'type-mismatch' });
	});

	it('looks up a field from the first matching entry', () => {
		expect(apply('lookupString', [ratings, 'agency', 'sp', 'rating'])).toBe('A');
		expect(apply('lookupNumber', [ratings, 'agency', 'moodys', 'score'])).toBe(20);
	});

	it('flags lookups with no match, missing fields, or wrong result types', () => {
		expect(apply('lookupString', [ratings, 'agency', 'fitch', 'rating'])).toEqual({
			error: 'no-match'
		});
		expect(apply('lookupString', [[], 'agency', 'moodys', 'rating'])).toEqual({
			error: 'no-match'
		});
		expect(apply('lookupString', [ratings, 'agency', 'sp', 'outlook'])).toEqual({
			error: 'unknown-field'
		});
		expect(apply('lookupString', [ratings, 'agency', 'sp', 'score'])).toEqual({
			error: 'type-mismatch'
		});
		expect(apply('lookupNumber', [ratings, 'agency', 'sp', 'rating'])).toEqual({
			error: 'type-mismatch'
		});
	});
});

describe('isApplyError', () => {
	it('distinguishes errors from values, including arrays and records', () => {
		expect(isApplyError({ error: 'div-by-zero' })).toBe(true);
		expect(isApplyError(0)).toBe(false);
		expect(isApplyError(false)).toBe(false);
		expect(isApplyError([])).toBe(false);
		expect(isApplyError({ agency: 'moodys', rating: 'AA', score: 20 })).toBe(false);
	});
});
