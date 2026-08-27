import { describe, expect, it } from 'vitest';
import { newOpNode, setAt, type CalcNode, type Literal } from './ast';
import { nodesEqual, parseCalc, printCalc } from './dsl';
import { LIBRARY, effectiveVersion } from './library';
import type { OperatorId } from './operators';

const num = (value: number): Literal => ({ kind: 'literal', type: 'number', value });
const str = (value: string): Literal => ({ kind: 'literal', type: 'string', value });
const field = (id: string): CalcNode => ({ kind: 'field', field: id });
const op = (id: OperatorId, ...inputs: (CalcNode | null)[]): CalcNode => ({
	kind: 'op',
	op: id,
	inputs
});

const parsed = (text: string): CalcNode | null => {
	const result = parseCalc(text);
	if (!result.ok) throw new Error(`${text} -> ${result.error} @ ${result.position}`);
	return result.root;
};

describe('parse', () => {
	it('parses empty input as an empty tree and _ as an empty slot', () => {
		expect(parsed('')).toBeNull();
		expect(parsed('  ')).toBeNull();
		expect(parsed('_')).toBeNull();
		expect(parsed('sum(_)')).toEqual(op('sum', null));
	});

	it('parses literals, fields, and dotted paths', () => {
		expect(parsed('42')).toEqual(num(42));
		expect(parsed('-2.5')).toEqual(num(-2.5));
		expect(parsed('"AAPL"')).toEqual(str('AAPL'));
		expect(parsed('true')).toEqual({ kind: 'literal', type: 'boolean', value: true });
		expect(parsed('price')).toEqual(field('price'));
		expect(parsed('instrument.creditRatings')).toEqual(field('instrument.creditRatings'));
	});

	it('applies precedence and parentheses', () => {
		expect(parsed('price + quantity * 2')).toEqual(
			op('add', field('price'), op('mul', field('quantity'), num(2)))
		);
		expect(parsed('(price + quantity) * 2')).toEqual(
			op('mul', op('add', field('price'), field('quantity')), num(2))
		);
	});

	it('flattens variadic chains but keeps parenthesized nesting', () => {
		expect(parsed('1 + 2 + 3')).toEqual(op('add', num(1), num(2), num(3)));
		expect(parsed('(1 + 2) + 3')).toEqual(op('add', op('add', num(1), num(2)), num(3)));
		expect(parsed('1 - 2 - 3')).toEqual(op('sub', op('sub', num(1), num(2)), num(3)));
		expect(parsed('1 + 2 - 3')).toEqual(op('sub', op('add', num(1), num(2)), num(3)));
	});

	it('parses comparisons and logic with the right binding', () => {
		expect(parsed('price > 100 and quantity < 50 or true')).toEqual(
			op(
				'or',
				op('and', op('gt', field('price'), num(100)), op('lt', field('quantity'), num(50))),
				{ kind: 'literal', type: 'boolean', value: true }
			)
		);
		expect(parsed('not price >= 100')).toEqual(op('not', op('gte', field('price'), num(100))));
	});

	it('parses calc references', () => {
		expect(parsed('@moodys-grade')).toEqual({ kind: 'calc', calcId: 'moodys-grade' });
		expect(parsed('(@moodys-grade + @sp-grade) / 2')).toEqual(
			op(
				'div',
				op('add', { kind: 'calc', calcId: 'moodys-grade' }, { kind: 'calc', calcId: 'sp-grade' }),
				num(2)
			)
		);
		const bare = parseCalc('@');
		expect(bare.ok).toBe(false);
		if (!bare.ok) expect(bare.error).toContain('calc id');
	});

	it('parses calls, case, and map', () => {
		expect(parsed('avg(pluck(instrument.creditRatings, "score"))')).toEqual(
			op('avg', op('pluck', field('instrument.creditRatings'), str('score')))
		);
		expect(parsed('avg(@moodys-grade, @sp-grade, 14)')).toEqual(
			op(
				'avg',
				{ kind: 'calc', calcId: 'moodys-grade' },
				{ kind: 'calc', calcId: 'sp-grade' },
				num(14)
			)
		);
		expect(parsed('case symbol when "AAPL" then 1 else 0 end')).toEqual({
			kind: 'switch',
			on: field('symbol'),
			cases: [{ when: str('AAPL'), then: num(1) }],
			fallback: num(0)
		});
		expect(parsed('case symbol when "AAPL" then 1 end')).toEqual({
			kind: 'switch',
			on: field('symbol'),
			cases: [{ when: str('AAPL'), then: num(1) }],
			fallback: null
		});
		expect(parsed('map(dailyReturns, item * 2)')).toEqual({
			kind: 'map',
			source: field('dailyReturns'),
			body: op('mul', field('item'), num(2))
		});
	});

	it('reports helpful errors with positions', () => {
		const cases: [string, string][] = [
			['price +', 'Expected an expression'],
			['(price', 'Expected ")"'],
			['bogus(1)', 'Unknown function "bogus"'],
			['pluck(x)', 'pluck takes 2 arguments'],
			['avg()', 'avg takes at least 1 argument'],
			['map(x)', 'map takes 2 arguments'],
			['case x end', 'case needs at least one "when"'],
			['"oops', 'Unterminated string'],
			['1 2', 'Unexpected trailing input'],
			['price ?', 'Unexpected character "?"']
		];
		for (const [text, message] of cases) {
			const result = parseCalc(text);
			expect(result.ok, text).toBe(false);
			if (!result.ok) expect(result.error, text).toContain(message);
		}
	});
});

describe('print', () => {
	it('prints an empty tree as empty text', () => {
		expect(printCalc(null)).toBe('');
	});

	it('adds parentheses only where precedence needs them', () => {
		expect(printCalc(op('mul', op('add', field('price'), num(1)), num(2)))).toBe('(price + 1) * 2');
		expect(printCalc(op('add', field('price'), op('mul', num(1), num(2))))).toBe('price + 1 * 2');
		expect(printCalc(op('not', op('and', field('a'), field('b'))))).toBe('not (a and b)');
	});

	it('prints empty slots as _', () => {
		expect(printCalc(setAt(newOpNode('gt'), [{ part: 'input', index: 0 }], field('price')))).toBe(
			'price > _'
		);
	});
});

describe('round-trip', () => {
	it('parse(print(tree)) is structurally identical for every library calc', () => {
		for (const def of LIBRARY) {
			const root = effectiveVersion(def).root;
			const text = printCalc(root);
			const result = parseCalc(text);
			expect(result.ok, `${def.id}: ${text}`).toBe(true);
			if (result.ok) expect(nodesEqual(result.root, root), `${def.id}: ${text}`).toBe(true);
		}
	});

	it('round-trips awkward shapes: nested variadics, partial trees, escapes', () => {
		const shapes: (CalcNode | null)[] = [
			op('add', op('add', num(1), num(2)), num(3)),
			op('sub', num(1), op('sub', num(2), num(3))),
			op('div', op('add', field('a'), field('b')), op('mul', num(2), num(3))),
			op('and', op('not', field('flag')), op('gt', field('price'), num(0)), null),
			op('avg', op('pluck', null, str('score'))),
			str('quote " and \\ slash'),
			{
				kind: 'map',
				source: field('instrument.creditRatings'),
				body: {
					kind: 'switch',
					on: field('rating'),
					cases: [{ when: null, then: null }],
					fallback: null
				}
			}
		];
		for (const shape of shapes) {
			const text = printCalc(shape);
			const result = parseCalc(text);
			expect(result.ok, text).toBe(true);
			if (result.ok) expect(nodesEqual(result.root, shape), text).toBe(true);
		}
	});
});
