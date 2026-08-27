import { describe, expect, it } from 'vitest';
import type { CalcNode, Literal, MapNode, OpNode, SwitchNode } from './ast';
import { MODEL_BY_ID } from './datamodels';
import type { OperatorId } from './operators';
import {
	accepts,
	check,
	compatibleOperators,
	expectedTypeAt,
	resultTypeOf,
	scopeAt
} from './typecheck';

const model = MODEL_BY_ID['trading-position'];
const num = (value: number): Literal => ({ kind: 'literal', type: 'number', value });
const str = (value: string): Literal => ({ kind: 'literal', type: 'string', value });
const field = (id: string): CalcNode => ({ kind: 'field', field: id });
const op = (id: OperatorId, ...inputs: (CalcNode | null)[]): OpNode => ({
	kind: 'op',
	op: id,
	inputs
});
const switchNode = (partial: Partial<SwitchNode> = {}): SwitchNode => ({
	kind: 'switch',
	on: null,
	cases: [{ when: null, then: null }],
	fallback: null,
	...partial
});

describe('accepts', () => {
	it('lets any accept everything', () => {
		expect(accepts('any', 'number')).toBe(true);
		expect(accepts('any', 'number[]')).toBe(true);
	});

	it('lets scalar accept everything but arrays', () => {
		expect(accepts('scalar', 'number')).toBe(true);
		expect(accepts('scalar', 'string')).toBe(true);
		expect(accepts('scalar', 'boolean')).toBe(true);
		expect(accepts('scalar', 'number[]')).toBe(false);
		expect(accepts('scalar', 'object[]')).toBe(false);
	});

	it('matches concrete types exactly', () => {
		expect(accepts('number', 'number')).toBe(true);
		expect(accepts('number', 'boolean')).toBe(false);
	});

	it('lets array accept only arrays', () => {
		expect(accepts('array', 'number[]')).toBe(true);
		expect(accepts('array', 'object[]')).toBe(true);
		expect(accepts('array', 'number')).toBe(false);
	});

	it('lets numeric accept numbers and number arrays', () => {
		expect(accepts('numeric', 'number')).toBe(true);
		expect(accepts('numeric', 'number[]')).toBe(true);
		expect(accepts('numeric', 'boolean')).toBe(false);
		expect(accepts('numeric', 'object[]')).toBe(false);
	});
});

describe('resultTypeOf', () => {
	it('types leaves from literals and model fields', () => {
		expect(resultTypeOf(num(1), model)).toBe('number');
		expect(resultTypeOf(field('symbol'), model)).toBe('string');
		expect(resultTypeOf(field('dailyReturns'), model)).toBe('number[]');
		expect(resultTypeOf(field('instrument.creditRatings'), model)).toBe('object[]');
		expect(resultTypeOf(field('nope'), model)).toBeNull();
	});

	it('types object-array operators from the registry', () => {
		expect(resultTypeOf(op('pluck', null, null), model)).toBe('number[]');
		expect(resultTypeOf(op('lookupString', null, null, null, null), model)).toBe('string');
		expect(resultTypeOf(op('lookupNumber', null, null, null, null), model)).toBe('number');
	});

	it('types ops from the registry through nesting', () => {
		expect(resultTypeOf(op('gt', op('avg', null), null), model)).toBe('boolean');
	});

	it('types a switch from its first known branch', () => {
		expect(resultTypeOf(switchNode(), model)).toBeNull();
		expect(resultTypeOf(switchNode({ fallback: str('low') }), model)).toBe('string');
		expect(resultTypeOf(switchNode({ cases: [{ when: null, then: num(1) }] }), model)).toBe(
			'number'
		);
	});
});

describe('expectedTypeAt', () => {
	it('accepts anything at the root', () => {
		expect(expectedTypeAt(null, [], model)).toBe('any');
	});

	it('reads op signatures for fixed and variadic inputs', () => {
		expect(expectedTypeAt(op('sum', null), [{ part: 'input', index: 0 }], model)).toBe('numeric');
		expect(expectedTypeAt(op('and', null, null), [{ part: 'input', index: 1 }], model)).toBe(
			'boolean'
		);
	});

	it('expects a scalar scrutinee until a when pins it', () => {
		expect(expectedTypeAt(switchNode(), [{ part: 'on' }], model)).toBe('scalar');
		const pinned = switchNode({ cases: [{ when: str('AAPL'), then: null }] });
		expect(expectedTypeAt(pinned, [{ part: 'on' }], model)).toBe('string');
	});

	it('pins case matches to the scrutinee type', () => {
		const root = switchNode({ on: field('symbol') });
		expect(expectedTypeAt(root, [{ part: 'case-when', index: 0 }], model)).toBe('string');
		expect(expectedTypeAt(switchNode(), [{ part: 'case-when', index: 0 }], model)).toBe('scalar');
	});

	it('pins branches to the first filled branch type', () => {
		expect(expectedTypeAt(switchNode(), [{ part: 'fallback' }], model)).toBe('any');
		const pinned = switchNode({ cases: [{ when: null, then: num(1) }] });
		expect(expectedTypeAt(pinned, [{ part: 'fallback' }], model)).toBe('number');
		expect(expectedTypeAt(pinned, [{ part: 'case-then', index: 0 }], model)).toBe('number');
	});
});

describe('map scoping', () => {
	const map = (source: CalcNode | null, body: CalcNode | null): MapNode => ({
		kind: 'map',
		source,
		body
	});
	const ratings = field('instrument.creditRatings');

	it('expects an array source and a number body', () => {
		const root = map(null, null);
		expect(expectedTypeAt(root, [{ part: 'source' }], model)).toBe('array');
		expect(expectedTypeAt(root, [{ part: 'body' }], model)).toBe('number');
		expect(resultTypeOf(root, model)).toBe('number[]');
	});

	it('exposes element fields inside object-array bodies', () => {
		const root = map(ratings, null);
		expect(scopeAt(root, [{ part: 'body' }], model)).toEqual([
			{ id: 'agency', type: 'string' },
			{ id: 'rating', type: 'string' },
			{ id: 'score', type: 'number' }
		]);
		expect(scopeAt(root, [{ part: 'source' }], model)).toEqual([]);
	});

	it('exposes item inside number-array bodies', () => {
		const root = map(field('dailyReturns'), null);
		expect(scopeAt(root, [{ part: 'body' }], model)).toEqual([{ id: 'item', type: 'number' }]);
	});

	it('types scope fields inside the body without flagging them unknown', () => {
		const root = map(ratings, field('score'));
		expect(check(root, model)).toMatchObject({ complete: true, resultType: 'number[]' });
	});

	it('flags non-numeric bodies and scope fields used outside their map', () => {
		const nonNumeric = check(map(ratings, field('rating')), model);
		expect(nonNumeric.issues.some((issue) => issue.message.includes('produce a number'))).toBe(
			true
		);
		const escaped = check(field('rating'), model);
		expect(escaped.issues.some((issue) => issue.message.includes('Unknown field'))).toBe(true);
	});
});

describe('calc references', () => {
	const refNode = (calcId: string): CalcNode => ({ kind: 'calc', calcId });
	const lib = (
		id: string,
		root: CalcNode,
		modelId: 'trading-position' | 'order-book' = 'trading-position'
	): import('./library').CalcDef => ({
		id,
		description: '',
		versions: [{ version: 1, status: 'published', savedAt: 0, label: id, modelId, root }]
	});

	it('types a reference from its definition, against its own model', () => {
		const library = [lib('mv', op('mul', field('price'), field('quantity')))];
		expect(resultTypeOf(refNode('mv'), model, [], library)).toBe('number');
		expect(resultTypeOf(refNode('missing'), model, [], library)).toBeNull();
	});

	it('accepts references as typed op inputs', () => {
		const library = [lib('mv', op('mul', field('price'), field('quantity')))];
		const root = op('div', refNode('mv'), num(2));
		expect(check(root, model, library)).toMatchObject({ complete: true, resultType: 'number' });
	});

	it('flags unknown ids, model mismatches, and circular references', () => {
		const library = [
			lib('spread', field('spread'), 'order-book'),
			lib('a', refNode('b')),
			lib('b', refNode('a'))
		];
		const messages = (root: CalcNode) =>
			check(root, model, library).issues.map((issue) => issue.message);
		expect(messages(refNode('ghost'))[0]).toContain('Unknown calc');
		expect(messages(refNode('spread'))[0]).toContain('defined for Order Book');
		expect(messages(refNode('a'))[0]).toContain('Circular');
	});
});

describe('compatibleOperators', () => {
	it('offers the aggregation family for an aggregation', () => {
		expect(compatibleOperators(op('avg', field('dailyReturns')), [], model)).toEqual([
			'sum',
			'avg',
			'min',
			'max',
			'count'
		]);
	});

	it('respects the surrounding slot type', () => {
		// Inside sum's number[] input, a pluck can only stay pluck or become map-free equivalents.
		const root = op('sum', op('pluck', field('instrument.creditRatings'), str('score')));
		expect(compatibleOperators(root, [{ part: 'input', index: 0 }], model)).toEqual(['pluck']);
	});

	it('widens at the root where any result fits', () => {
		const root = op('gt', field('price'), num(100));
		expect(compatibleOperators(root, [], model)).toEqual([
			'gt',
			'gte',
			'lt',
			'lte',
			'eq',
			'neq',
			'add',
			'sub',
			'mul',
			'div',
			'sum',
			'avg',
			'min',
			'max',
			'count'
		]);
	});

	it('excludes fixed arities that do not fit the current input count', () => {
		const threeWide = op('add', num(1), num(2), num(3));
		expect(compatibleOperators(threeWide, [], model)).toEqual([
			'add',
			'mul',
			'sum',
			'avg',
			'min',
			'max',
			'count'
		]);
	});

	it('keeps logic swaps within boolean signatures', () => {
		const root = op('and', { kind: 'literal', type: 'boolean', value: true }, null);
		expect(compatibleOperators(root, [], model)).toEqual(['and', 'or']);
	});

	it('lets the typed lookups swap when the slot allows both', () => {
		const root = op('lookupString', field('instrument.creditRatings'), null, null, null);
		expect(compatibleOperators(root, [], model)).toEqual(['lookupString', 'lookupNumber']);
	});

	it('returns nothing for non-op nodes', () => {
		expect(compatibleOperators(num(1), [], model)).toEqual([]);
		expect(compatibleOperators(null, [], model)).toEqual([]);
	});
});

describe('check', () => {
	it('reports the root slot for an empty tree', () => {
		const result = check(null, model);
		expect(result.emptySlots).toEqual([{ path: [], expected: 'any' }]);
		expect(result.resultType).toBeNull();
		expect(result.complete).toBe(false);
	});

	it('lists empty slots in preorder with expectations', () => {
		const root = op('gt', op('avg', null), null);
		const result = check(root, model);
		expect(result.emptySlots.map((slot) => slot.expected)).toEqual(['numeric', 'number']);
		expect(result.emptySlots[0].path).toEqual([
			{ part: 'input', index: 0 },
			{ part: 'input', index: 0 }
		]);
	});

	it('marks a filled, well-typed tree complete', () => {
		const root = op('mul', field('price'), field('quantity'));
		const result = check(root, model);
		expect(result).toMatchObject({ complete: true, resultType: 'number', issues: [] });
		expect(result.emptySlots).toEqual([]);
	});

	it('flags stale field refs after a model switch', () => {
		const root = op('mul', field('midPrice'), num(2));
		const result = check(root, model);
		expect(result.complete).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0].message).toContain('midPrice');
	});

	it('flags switch branch disagreement and mismatched case types', () => {
		const root = switchNode({
			on: field('symbol'),
			cases: [
				{ when: num(1), then: num(1) },
				{ when: str('TSLA'), then: str('two') }
			],
			fallback: null
		});
		const messages = check(root, model).issues.map((issue) => issue.message);
		expect(messages.some((message) => message.includes('disagree'))).toBe(true);
		expect(messages.some((message) => message.includes('scrutinee'))).toBe(true);
	});

	it('flags op inputs whose type no longer fits', () => {
		const root = op('sum', field('symbol'));
		const result = check(root, model);
		expect(result.issues[0].message).toContain('numeric');
	});

	it('accepts scalar numbers in aggregation inputs', () => {
		const root = op('avg', field('price'), field('costBasis'));
		expect(check(root, model)).toMatchObject({ complete: true, resultType: 'number' });
	});
});
