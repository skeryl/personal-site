/*
 * Pure recursive evaluator: walks a calculation tree against one record,
 * short-circuiting logic ops and evaluating only the matched switch branch.
 * Referenced library calcs evaluate against the record with a fresh scope;
 * an active-set guards against circular references.
 */

import type { CalcNode, MapNode, OpNode, SwitchNode } from './ast';
import { effectiveVersion, type CalcDef } from './library';
import {
	OPERATOR_BY_ID,
	isApplyError,
	type ParamType,
	type RecordValue,
	type Value
} from './operators';

export type EvalError =
	| 'incomplete'
	| 'div-by-zero'
	| 'empty-array'
	| 'no-case-match'
	| 'no-match'
	| 'unknown-field'
	| 'unknown-calc'
	| 'circular'
	| 'type-mismatch';

export type EvalResult = { ok: true; value: Value } | { ok: false; error: EvalError };

const ok = (value: Value): EvalResult => ({ ok: true, value });
const fail = (error: EvalError): EvalResult => ({ ok: false, error });

const isRecord = (value: Value): value is RecordValue =>
	typeof value === 'object' && !Array.isArray(value);

export const matchesType = (value: Value, type: ParamType): boolean => {
	switch (type) {
		case 'number[]':
			return Array.isArray(value) && value.every((entry) => typeof entry === 'number');
		case 'object[]':
			return Array.isArray(value) && value.every((entry) => isRecord(entry as Value));
		case 'numeric':
			return typeof value === 'number' || matchesType(value, 'number[]');
		default:
			return typeof value === type;
	}
};

/** Walk a dot path ('instrument.couponRate') through nested record values. */
export const resolveField = (record: RecordValue, path: string): Value | undefined =>
	path
		.split('.')
		.reduce<
			Value | undefined
		>((value, part) => (value !== undefined && isRecord(value) ? value[part] : undefined), record);

interface EvalContext {
	record: Record<string, Value>;
	library: CalcDef[];
	/** Calc ids currently being evaluated, to catch circular references. */
	active: Set<string>;
}

const walkOp = (node: OpNode, ctx: EvalContext, scope?: RecordValue): EvalResult => {
	const def = OPERATOR_BY_ID[node.op];
	if (node.op === 'and' || node.op === 'or') {
		const decides = node.op === 'or';
		for (const input of node.inputs) {
			const result = walk(input, ctx, scope);
			if (!result.ok) return result;
			if (typeof result.value !== 'boolean') return fail('type-mismatch');
			if (result.value === decides) return ok(decides);
		}
		return ok(!decides);
	}
	const args: Value[] = [];
	for (const [index, input] of node.inputs.entries()) {
		const result = walk(input, ctx, scope);
		if (!result.ok) return result;
		const expected = def.arity.kind === 'fixed' ? def.arity.params[index] : def.arity.param;
		if (!matchesType(result.value, expected)) return fail('type-mismatch');
		args.push(result.value);
	}
	const applied = def.apply(args);
	return isApplyError(applied) ? fail(applied.error) : ok(applied);
};

const walkSwitch = (node: SwitchNode, ctx: EvalContext, scope?: RecordValue): EvalResult => {
	const on = walk(node.on, ctx, scope);
	if (!on.ok) return on;
	if (typeof on.value === 'object') return fail('type-mismatch');
	for (const branch of node.cases) {
		const when = walk(branch.when, ctx, scope);
		if (!when.ok) return when;
		if (typeof when.value === 'object') return fail('type-mismatch');
		if (when.value === on.value) return walk(branch.then, ctx, scope);
	}
	return node.fallback === null ? fail('no-case-match') : walk(node.fallback, ctx, scope);
};

/** Body runs once per element with that element's fields (or `item`) in scope. */
const walkMap = (node: MapNode, ctx: EvalContext, scope?: RecordValue): EvalResult => {
	const source = walk(node.source, ctx, scope);
	if (!source.ok) return source;
	if (node.body === null) return fail('incomplete');
	if (!Array.isArray(source.value)) return fail('type-mismatch');
	const mapped: number[] = [];
	for (const element of source.value) {
		const elementScope: RecordValue =
			typeof element === 'number' ? { ...scope, item: element } : { ...scope, ...element };
		const result = walk(node.body, ctx, elementScope);
		if (!result.ok) return result;
		if (typeof result.value !== 'number') return fail('type-mismatch');
		mapped.push(result.value);
	}
	return ok(mapped);
};

const walk = (node: CalcNode | null, ctx: EvalContext, scope?: RecordValue): EvalResult => {
	if (node === null) return fail('incomplete');
	switch (node.kind) {
		case 'literal':
			return ok(node.value);
		case 'field': {
			const scoped = scope?.[node.field];
			if (scoped !== undefined) return ok(scoped);
			const value = resolveField(ctx.record, node.field);
			return value === undefined ? fail('unknown-field') : ok(value);
		}
		case 'calc': {
			const def = ctx.library.find((entry) => entry.id === node.calcId);
			if (!def) return fail('unknown-calc');
			if (ctx.active.has(def.id)) return fail('circular');
			ctx.active.add(def.id);
			// References resolve to the published version (drafts stay private)
			// and see the record, never the local map scope.
			const result = walk(effectiveVersion(def).root, ctx, undefined);
			ctx.active.delete(def.id);
			return result;
		}
		case 'op':
			return walkOp(node, ctx, scope);
		case 'switch':
			return walkSwitch(node, ctx, scope);
		case 'map':
			return walkMap(node, ctx, scope);
	}
};

export const evaluate = (
	root: CalcNode | null,
	record: Record<string, Value>,
	library: CalcDef[] = []
): EvalResult => walk(root, { record, library, active: new Set() });
