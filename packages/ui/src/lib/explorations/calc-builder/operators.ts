/*
 * Operator registry: display metadata, input signatures, and the pure
 * application of each operator over already-evaluated arguments.
 */

import type { ValueType } from './ast';

/** One entry of an object[] value (e.g. a credit rating). */
export interface RecordValue {
	[key: string]: Value;
}

export type Value = number | boolean | string | number[] | RecordValue | RecordValue[];

export type OperatorId =
	| 'and'
	| 'or'
	| 'not'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'
	| 'eq'
	| 'neq'
	| 'add'
	| 'sub'
	| 'mul'
	| 'div'
	| 'sum'
	| 'avg'
	| 'min'
	| 'max'
	| 'count'
	| 'pluck'
	| 'lookupString'
	| 'lookupNumber';

export type OperatorCategory = 'logic' | 'compare' | 'arithmetic' | 'aggregate' | 'objects';

/** 'numeric' accepts a number or a number array (aggregation inputs flatten). */
export type ParamType = ValueType | 'numeric';

export type Arity =
	| { kind: 'fixed'; params: ParamType[] }
	| { kind: 'variadic'; param: ParamType; min: number };

export interface ApplyError {
	error: 'div-by-zero' | 'empty-array' | 'no-match' | 'unknown-field' | 'type-mismatch';
}

export interface OperatorDef {
	id: OperatorId;
	label: string;
	symbol: string;
	category: OperatorCategory;
	arity: Arity;
	result: ValueType;
	/** Optional keyword shown before each input row (e.g. lookup's in/where/equals/take). */
	inputLabels?: string[];
	/** Pure application over already-evaluated, type-valid arguments. */
	apply: (args: Value[]) => Value | ApplyError;
}

export const isApplyError = (value: Value | ApplyError): value is ApplyError =>
	typeof value === 'object' && !Array.isArray(value) && 'error' in value;

const binaryNumbers = (params: ValueType[] = ['number', 'number']): Arity => ({
	kind: 'fixed',
	params
});

const compare = (
	id: OperatorId,
	label: string,
	symbol: string,
	test: (a: number, b: number) => boolean
): OperatorDef => ({
	id,
	label,
	symbol,
	category: 'compare',
	arity: binaryNumbers(),
	result: 'boolean',
	apply: ([a, b]) => test(a as number, b as number)
});

/** Find the first entry where matchField equals matchValue, extract resultField. */
const lookup = (id: OperatorId, label: string, resultType: 'string' | 'number'): OperatorDef => ({
	id,
	label,
	symbol: 'find',
	category: 'objects',
	arity: { kind: 'fixed', params: ['object[]', 'string', 'string', 'string'] },
	result: resultType,
	inputLabels: ['in', 'where', 'equals', 'take'],
	apply: ([objects, matchField, matchValue, resultField]) => {
		const match = (objects as RecordValue[]).find(
			(entry) => entry[matchField as string] === matchValue
		);
		if (!match) return { error: 'no-match' };
		const value = match[resultField as string];
		if (value === undefined) return { error: 'unknown-field' };
		if (typeof value !== resultType) return { error: 'type-mismatch' };
		return value;
	}
});

/** Aggregations take any mix of numbers and number arrays, flattened. */
const aggregate = (
	id: OperatorId,
	label: string,
	symbol: string,
	applyValues: (values: number[]) => Value | ApplyError
): OperatorDef => ({
	id,
	label,
	symbol,
	category: 'aggregate',
	arity: { kind: 'variadic', param: 'numeric', min: 1 },
	result: 'number',
	apply: (args) =>
		applyValues(args.flatMap((arg) => (Array.isArray(arg) ? (arg as number[]) : [arg as number])))
});

export const OPERATORS: OperatorDef[] = [
	{
		id: 'and',
		label: 'And',
		symbol: 'and',
		category: 'logic',
		arity: { kind: 'variadic', param: 'boolean', min: 2 },
		result: 'boolean',
		apply: (args) => args.every((value) => value === true)
	},
	{
		id: 'or',
		label: 'Or',
		symbol: 'or',
		category: 'logic',
		arity: { kind: 'variadic', param: 'boolean', min: 2 },
		result: 'boolean',
		apply: (args) => args.some((value) => value === true)
	},
	{
		id: 'not',
		label: 'Not',
		symbol: 'not',
		category: 'logic',
		arity: { kind: 'fixed', params: ['boolean'] },
		result: 'boolean',
		apply: ([value]) => value !== true
	},
	compare('gt', 'Greater than', '>', (a, b) => a > b),
	compare('gte', 'At least', '≥', (a, b) => a >= b),
	compare('lt', 'Less than', '<', (a, b) => a < b),
	compare('lte', 'At most', '≤', (a, b) => a <= b),
	compare('eq', 'Equals', '=', (a, b) => a === b),
	compare('neq', 'Not equal', '≠', (a, b) => a !== b),
	{
		id: 'add',
		label: 'Add',
		symbol: '+',
		category: 'arithmetic',
		arity: { kind: 'variadic', param: 'number', min: 2 },
		result: 'number',
		apply: (args) => (args as number[]).reduce((total, value) => total + value, 0)
	},
	{
		id: 'sub',
		label: 'Subtract',
		symbol: '-',
		category: 'arithmetic',
		arity: binaryNumbers(),
		result: 'number',
		apply: ([a, b]) => (a as number) - (b as number)
	},
	{
		id: 'mul',
		label: 'Multiply',
		symbol: '×',
		category: 'arithmetic',
		arity: { kind: 'variadic', param: 'number', min: 2 },
		result: 'number',
		apply: (args) => (args as number[]).reduce((total, value) => total * value, 1)
	},
	{
		id: 'div',
		label: 'Divide',
		symbol: '÷',
		category: 'arithmetic',
		arity: binaryNumbers(),
		result: 'number',
		apply: ([a, b]) => (b === 0 ? { error: 'div-by-zero' } : (a as number) / (b as number))
	},
	aggregate('sum', 'Sum', 'Σ', (values) => values.reduce((total, value) => total + value, 0)),
	aggregate('avg', 'Average', 'avg', (values) =>
		values.length === 0
			? { error: 'empty-array' }
			: values.reduce((total, value) => total + value, 0) / values.length
	),
	aggregate('min', 'Minimum', 'min', (values) =>
		values.length === 0 ? { error: 'empty-array' } : Math.min(...values)
	),
	aggregate('max', 'Maximum', 'max', (values) =>
		values.length === 0 ? { error: 'empty-array' } : Math.max(...values)
	),
	aggregate('count', 'Count', '#', (values) => values.length),
	{
		id: 'pluck',
		label: 'Pluck numbers',
		symbol: 'pluck',
		category: 'objects',
		arity: { kind: 'fixed', params: ['object[]', 'string'] },
		result: 'number[]',
		inputLabels: ['from', 'field'],
		apply: ([objects, fieldId]) => {
			const plucked: number[] = [];
			for (const entry of objects as RecordValue[]) {
				const value = entry[fieldId as string];
				if (value === undefined) return { error: 'unknown-field' };
				if (typeof value !== 'number') return { error: 'type-mismatch' };
				plucked.push(value);
			}
			return plucked;
		}
	},
	lookup('lookupString', 'Lookup text', 'string'),
	lookup('lookupNumber', 'Lookup number', 'number')
];

export const OPERATOR_BY_ID = Object.fromEntries(OPERATORS.map((def) => [def.id, def])) as Record<
	OperatorId,
	OperatorDef
>;
