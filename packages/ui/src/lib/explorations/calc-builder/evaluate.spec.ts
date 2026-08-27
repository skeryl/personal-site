import { describe, expect, it } from 'vitest';
import type { CalcNode, Literal, MapNode, OpNode, SwitchNode } from './ast';
import { MODEL_BY_ID } from './datamodels';
import { evaluate } from './evaluate';
import type { OperatorId } from './operators';

const num = (value: number): Literal => ({ kind: 'literal', type: 'number', value });
const str = (value: string): Literal => ({ kind: 'literal', type: 'string', value });
const bool = (value: boolean): Literal => ({ kind: 'literal', type: 'boolean', value });
const field = (id: string): CalcNode => ({ kind: 'field', field: id });
const op = (id: OperatorId, ...inputs: (CalcNode | null)[]): OpNode => ({
	kind: 'op',
	op: id,
	inputs
});

const aapl = MODEL_BY_ID['trading-position'].samples[0].values;
const bnd = MODEL_BY_ID['trading-position'].samples[2].values;

describe('leaves', () => {
	it('evaluates literals and field refs', () => {
		expect(evaluate(num(5), aapl)).toEqual({ ok: true, value: 5 });
		expect(evaluate(field('price'), aapl)).toEqual({ ok: true, value: 187.5 });
	});

	it('reports unknown fields', () => {
		expect(evaluate(field('midPrice'), aapl)).toEqual({ ok: false, error: 'unknown-field' });
	});

	it('resolves dot paths into nested reference data', () => {
		expect(evaluate(field('instrument.sector'), aapl)).toEqual({ ok: true, value: 'tech' });
		expect(evaluate(field('instrument.outlook'), aapl)).toEqual({
			ok: false,
			error: 'unknown-field'
		});
		expect(evaluate(field('instrument.creditRatings.score'), aapl)).toEqual({
			ok: false,
			error: 'unknown-field'
		});
	});

	it('reports an empty tree as incomplete', () => {
		expect(evaluate(null, aapl)).toEqual({ ok: false, error: 'incomplete' });
	});
});

describe('operators', () => {
	it('evaluates nested arithmetic against a record', () => {
		// (price - costBasis) * quantity
		const tree = op('mul', op('sub', field('price'), field('costBasis')), field('quantity'));
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: 1500 });
	});

	it('propagates incompleteness from any empty slot', () => {
		expect(evaluate(op('mul', field('price'), null), aapl)).toEqual({
			ok: false,
			error: 'incomplete'
		});
	});

	it('surfaces division by zero per record', () => {
		expect(evaluate(op('div', num(1), num(0)), aapl)).toEqual({ ok: false, error: 'div-by-zero' });
	});

	it('aggregates arrays and surfaces empty-array errors', () => {
		expect(evaluate(op('avg', field('dailyReturns')), aapl)).toEqual({ ok: true, value: 2 });
		expect(evaluate(op('avg', field('dailyReturns')), bnd)).toEqual({
			ok: false,
			error: 'empty-array'
		});
		expect(evaluate(op('sum', field('dailyReturns')), bnd)).toEqual({ ok: true, value: 0 });
	});

	it('rejects runtime type mismatches defensively', () => {
		expect(evaluate(op('sum', field('symbol')), aapl)).toEqual({
			ok: false,
			error: 'type-mismatch'
		});
		expect(evaluate(op('and', num(1), bool(true)), aapl)).toEqual({
			ok: false,
			error: 'type-mismatch'
		});
	});

	it('aggregates mixed scalar and array inputs by flattening', () => {
		expect(evaluate(op('avg', field('price'), field('costBasis')), aapl)).toEqual({
			ok: true,
			value: (187.5 + 150) / 2
		});
		expect(evaluate(op('sum', field('dailyReturns'), field('quantity')), aapl)).toEqual({
			ok: true,
			value: 46
		});
		expect(evaluate(op('avg', field('price')), aapl)).toEqual({ ok: true, value: 187.5 });
	});

	it('short-circuits and/or before erroring siblings', () => {
		const explodes = op('gt', op('div', num(1), num(0)), num(0));
		expect(evaluate(op('and', bool(false), explodes), aapl)).toEqual({ ok: true, value: false });
		expect(evaluate(op('or', bool(true), explodes), aapl)).toEqual({ ok: true, value: true });
		expect(evaluate(op('and', bool(true), explodes), aapl)).toEqual({
			ok: false,
			error: 'div-by-zero'
		});
	});
});

describe('object arrays', () => {
	const ratings = field('instrument.creditRatings');

	it('averages plucked credit scores per record', () => {
		const tree = op('avg', op('pluck', ratings, str('score')));
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: 19 });
		expect(evaluate(tree, MODEL_BY_ID['trading-position'].samples[1].values)).toEqual({
			ok: true,
			value: 12
		});
		expect(evaluate(tree, bnd)).toEqual({ ok: false, error: 'empty-array' });
	});

	it('looks up a rating by agency', () => {
		const tree = op('lookupString', ratings, str('agency'), str('moodys'), str('rating'));
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: 'AA' });
		expect(evaluate(tree, bnd)).toEqual({ ok: false, error: 'no-match' });
	});

	it('rejects non-object arrays where object[] is expected', () => {
		expect(evaluate(op('pluck', field('dailyReturns'), str('score')), aapl)).toEqual({
			ok: false,
			error: 'type-mismatch'
		});
	});

	it('rejects object arrays as switch scrutinees', () => {
		const tree: SwitchNode = {
			kind: 'switch',
			on: ratings,
			cases: [{ when: str('x'), then: num(1) }],
			fallback: num(0)
		};
		expect(evaluate(tree, aapl)).toEqual({ ok: false, error: 'type-mismatch' });
	});
});

describe('calc references', () => {
	const lib = (id: string, root: CalcNode): import('./library').CalcDef => ({
		id,
		description: '',
		versions: [
			{ version: 1, status: 'published', savedAt: 0, label: id, modelId: 'trading-position', root }
		]
	});
	const refNode = (calcId: string): CalcNode => ({ kind: 'calc', calcId });

	it('evaluates a referenced calc against the record', () => {
		const library = [lib('mv', op('mul', field('price'), field('quantity')))];
		expect(evaluate(op('div', refNode('mv'), num(2)), aapl, library)).toEqual({
			ok: true,
			value: 3750
		});
	});

	it('resolves nested references and reports unknown ids', () => {
		const library = [
			lib('base', field('quantity')),
			lib('double', op('mul', refNode('base'), num(2)))
		];
		expect(evaluate(refNode('double'), aapl, library)).toEqual({ ok: true, value: 80 });
		expect(evaluate(refNode('nope'), aapl, library)).toEqual({
			ok: false,
			error: 'unknown-calc'
		});
	});

	it('catches circular references instead of recursing forever', () => {
		const library = [
			lib('a', op('add', refNode('b'), num(1))),
			lib('b', op('add', refNode('a'), num(1)))
		];
		expect(evaluate(refNode('a'), aapl, library)).toEqual({ ok: false, error: 'circular' });
	});

	it('resolves references to the published version, not newer drafts', () => {
		const def: import('./library').CalcDef = {
			id: 'staged',
			description: '',
			versions: [
				{
					version: 1,
					status: 'published',
					savedAt: 0,
					label: 'staged',
					modelId: 'trading-position',
					root: num(10)
				},
				{
					version: 2,
					status: 'draft',
					savedAt: 1,
					label: 'staged',
					modelId: 'trading-position',
					root: num(99)
				}
			]
		};
		expect(evaluate(refNode('staged'), aapl, [def])).toEqual({ ok: true, value: 10 });
	});

	it('gives referenced calcs the record, not the local map scope', () => {
		const library = [lib('leaky', field('item'))];
		const tree: CalcNode = {
			kind: 'map',
			source: field('dailyReturns'),
			body: refNode('leaky')
		};
		expect(evaluate(tree, aapl, library)).toEqual({ ok: false, error: 'unknown-field' });
	});
});

describe('map', () => {
	const map = (source: CalcNode | null, body: CalcNode | null): MapNode => ({
		kind: 'map',
		source,
		body
	});

	it('maps object elements with their fields in scope', () => {
		const tree = map(field('instrument.creditRatings'), field('score'));
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: [20, 19, 18] });
	});

	it('maps number arrays with item in scope, falling back to the record', () => {
		const tree = map(field('dailyReturns'), op('mul', field('item'), field('quantity')));
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: [40, 80, 120] });
	});

	it('supports switch bodies for letter-grade mapping', () => {
		const grade: SwitchNode = {
			kind: 'switch',
			on: field('rating'),
			cases: [
				{ when: str('AA'), then: num(19) },
				{ when: str('A'), then: num(17) }
			],
			fallback: num(0)
		};
		const tree = op('avg', map(field('instrument.creditRatings'), grade));
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: (19 + 19 + 17) / 3 });
	});

	it('yields an empty array for empty sources', () => {
		expect(evaluate(map(field('dailyReturns'), field('item')), bnd)).toEqual({
			ok: true,
			value: []
		});
	});

	it('reports incomplete and non-numeric bodies', () => {
		expect(evaluate(map(field('dailyReturns'), null), aapl)).toEqual({
			ok: false,
			error: 'incomplete'
		});
		expect(evaluate(map(field('instrument.creditRatings'), field('rating')), aapl)).toEqual({
			ok: false,
			error: 'type-mismatch'
		});
	});

	it('rejects non-array sources and unknown scope fields', () => {
		expect(evaluate(map(field('price'), num(1)), aapl)).toEqual({
			ok: false,
			error: 'type-mismatch'
		});
		expect(evaluate(map(field('dailyReturns'), field('score')), aapl)).toEqual({
			ok: false,
			error: 'unknown-field'
		});
	});
});

describe('switch', () => {
	const tiers = (fallback: CalcNode | null): SwitchNode => ({
		kind: 'switch',
		on: field('symbol'),
		cases: [
			{ when: str('AAPL'), then: num(1) },
			{ when: str('TSLA'), then: num(2) }
		],
		fallback
	});

	it('takes the first matching case', () => {
		expect(evaluate(tiers(num(0)), aapl)).toEqual({ ok: true, value: 1 });
	});

	it('falls back when nothing matches', () => {
		expect(evaluate(tiers(num(0)), bnd)).toEqual({ ok: true, value: 0 });
	});

	it('reports no-case-match when the fallback is empty', () => {
		expect(evaluate(tiers(null), bnd)).toEqual({ ok: false, error: 'no-case-match' });
	});

	it('evaluates only the matched branch', () => {
		const explode = op('div', num(1), num(0));
		const tree: SwitchNode = {
			kind: 'switch',
			on: str('AAPL'),
			cases: [
				{ when: str('AAPL'), then: num(1) },
				{ when: str('TSLA'), then: explode }
			],
			fallback: explode
		};
		expect(evaluate(tree, aapl)).toEqual({ ok: true, value: 1 });
	});

	it('rejects array scrutinees and matches', () => {
		const tree: SwitchNode = {
			kind: 'switch',
			on: field('dailyReturns'),
			cases: [{ when: num(1), then: num(1) }],
			fallback: num(0)
		};
		expect(evaluate(tree, aapl)).toEqual({ ok: false, error: 'type-mismatch' });
	});
});
