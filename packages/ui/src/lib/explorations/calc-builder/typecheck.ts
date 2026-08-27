/*
 * Static analysis of a calculation tree: result-type inference, the expected
 * type at any slot (used to gate the palette), and completeness reporting.
 * Map bodies are typed against a scope of element fields layered over the
 * data model; referenced library calcs are typed against their own model,
 * with unknown ids, model mismatches, and circular references reported.
 */

import {
	childSlots,
	getAt,
	type CalcNode,
	type NodePath,
	type PathStep,
	type ValueType
} from './ast';
import { MODEL_BY_ID, type DataModel } from './datamodels';
import { effectiveVersion, type CalcDef } from './library';
import { OPERATORS, OPERATOR_BY_ID, type OperatorId, type ParamType } from './operators';

/**
 * 'scalar' means any non-array type (switch scrutinees and case matches);
 * 'array' means any array type (map sources); 'numeric' means number or
 * number[] (aggregation inputs).
 */
export type ExpectedType = ParamType | 'scalar' | 'array' | 'any';

/** A field visible inside a map body (an element field, or `item`). */
export interface ScopeField {
	id: string;
	type: ValueType;
}

export interface EmptySlot {
	path: NodePath;
	expected: ExpectedType;
}

export interface TreeIssue {
	path: NodePath;
	message: string;
}

export interface CheckResult {
	resultType: ValueType | null;
	emptySlots: EmptySlot[];
	issues: TreeIssue[];
	complete: boolean;
}

export const accepts = (expected: ExpectedType, actual: ValueType): boolean => {
	switch (expected) {
		case 'any':
			return true;
		case 'scalar':
			return actual !== 'number[]' && actual !== 'object[]';
		case 'array':
			return actual === 'number[]' || actual === 'object[]';
		case 'numeric':
			return actual === 'number' || actual === 'number[]';
		default:
			return expected === actual;
	}
};

export const resultTypeOf = (
	node: CalcNode | null,
	model: DataModel,
	scope: ScopeField[] = [],
	library: CalcDef[] = [],
	seen: Set<string> = new Set()
): ValueType | null => {
	if (node === null) return null;
	switch (node.kind) {
		case 'literal':
			return node.type;
		case 'field':
			return (
				scope.find((field) => field.id === node.field)?.type ??
				model.fields.find((field) => field.id === node.field)?.type ??
				null
			);
		case 'calc': {
			const def = library.find((entry) => entry.id === node.calcId);
			if (!def || seen.has(def.id)) return null;
			const version = effectiveVersion(def);
			return resultTypeOf(
				version.root,
				MODEL_BY_ID[version.modelId],
				[],
				library,
				new Set(seen).add(def.id)
			);
		}
		case 'op':
			return OPERATOR_BY_ID[node.op].result;
		case 'map':
			return 'number[]';
		case 'switch': {
			for (const branch of [...node.cases.map((c) => c.then), node.fallback]) {
				const type = resultTypeOf(branch, model, scope, library, seen);
				if (type !== null) return type;
			}
			return null;
		}
	}
};

/** The fields a map body sees for a given source expression. */
const elementScopeOf = (
	source: CalcNode | null,
	model: DataModel,
	scope: ScopeField[],
	library: CalcDef[]
): ScopeField[] => {
	const sourceType = resultTypeOf(source, model, scope, library);
	if (sourceType === 'number[]') return [{ id: 'item', type: 'number' }];
	if (sourceType === 'object[]' && source?.kind === 'field') {
		const elements = model.fields.find((field) => field.id === source.field)?.elementFields;
		return elements?.map((element) => ({ id: element.id, type: element.type })) ?? [];
	}
	return [];
};

/** Inner scope shadows outer on id collisions. */
const mergeScope = (outer: ScopeField[], inner: ScopeField[]): ScopeField[] => [
	...outer.filter((field) => !inner.some((shadow) => shadow.id === field.id)),
	...inner
];

/** The scope active at path: element fields of every enclosing map body. */
export const scopeAt = (
	root: CalcNode | null,
	path: NodePath,
	model: DataModel,
	library: CalcDef[] = []
): ScopeField[] => {
	let scope: ScopeField[] = [];
	for (let depth = 0; depth < path.length; depth++) {
		const node = getAt(root, path.slice(0, depth));
		if (node?.kind === 'map' && path[depth].part === 'body') {
			scope = mergeScope(scope, elementScopeOf(node.source, model, scope, library));
		}
	}
	return scope;
};

const firstKnownType = (
	nodes: (CalcNode | null)[],
	model: DataModel,
	scope: ScopeField[],
	library: CalcDef[]
): ValueType | null => {
	for (const node of nodes) {
		const type = resultTypeOf(node, model, scope, library);
		if (type !== null) return type;
	}
	return null;
};

const expectedForStep = (
	parent: CalcNode,
	step: PathStep,
	model: DataModel,
	scope: ScopeField[],
	library: CalcDef[]
): ExpectedType => {
	if (parent.kind === 'op' && step.part === 'input') {
		const arity = OPERATOR_BY_ID[parent.op].arity;
		return arity.kind === 'fixed' ? (arity.params[step.index] ?? 'any') : arity.param;
	}
	if (parent.kind === 'map') {
		if (step.part === 'source') return 'array';
		if (step.part === 'body') return 'number';
	}
	if (parent.kind === 'switch') {
		switch (step.part) {
			case 'on':
				return (
					firstKnownType(
						parent.cases.map((c) => c.when),
						model,
						scope,
						library
					) ?? 'scalar'
				);
			case 'case-when':
				return (
					resultTypeOf(parent.on, model, scope, library) ??
					firstKnownType(
						parent.cases.map((c) => c.when),
						model,
						scope,
						library
					) ??
					'scalar'
				);
			case 'case-then':
			case 'fallback':
				return (
					firstKnownType(
						[...parent.cases.map((c) => c.then), parent.fallback],
						model,
						scope,
						library
					) ?? 'any'
				);
			default:
				return 'any';
		}
	}
	return 'any';
};

/** Expected type of the slot at path; the root slot accepts anything. */
export const expectedTypeAt = (
	root: CalcNode | null,
	path: NodePath,
	model: DataModel,
	library: CalcDef[] = []
): ExpectedType => {
	if (path.length === 0) return 'any';
	const parentPath = path.slice(0, -1);
	const parent = getAt(root, parentPath);
	if (parent === null) return 'any';
	return expectedForStep(
		parent,
		path[path.length - 1],
		model,
		scopeAt(root, parentPath, model, library),
		library
	);
};

/** True when following calc references from node revisits an id in the chain. */
const refsCycle = (node: CalcNode | null, library: CalcDef[], chain: Set<string>): boolean => {
	if (node === null) return false;
	if (node.kind === 'calc') {
		if (chain.has(node.calcId)) return true;
		const def = library.find((entry) => entry.id === node.calcId);
		if (!def) return false;
		return refsCycle(effectiveVersion(def).root, library, new Set(chain).add(node.calcId));
	}
	return childSlots(node).some(({ child }) => refsCycle(child, library, chain));
};

/**
 * Operators the op node at path could swap to in place: they must accept the
 * node's current input count and filled input types, and produce a result the
 * surrounding slot still accepts. The current operator is always included.
 */
export const compatibleOperators = (
	root: CalcNode | null,
	path: NodePath,
	model: DataModel,
	library: CalcDef[] = []
): OperatorId[] => {
	const node = getAt(root, path);
	if (!node || node.kind !== 'op') return [];
	const scope = scopeAt(root, path, model, library);
	const slotExpected = expectedTypeAt(root, path, model, library);
	const inputTypes = node.inputs.map((input) => resultTypeOf(input, model, scope, library));
	return OPERATORS.filter((def) => {
		if (def.id === node.op) return true;
		if (!accepts(slotExpected, def.result)) return false;
		const arity = def.arity;
		if (arity.kind === 'fixed' && arity.params.length !== node.inputs.length) return false;
		if (arity.kind === 'variadic' && node.inputs.length < arity.min) return false;
		return inputTypes.every((type, index) => {
			if (type === null) return true;
			const expected = arity.kind === 'fixed' ? arity.params[index] : arity.param;
			return accepts(expected, type);
		});
	}).map((def) => def.id);
};

export const check = (
	root: CalcNode | null,
	model: DataModel,
	library: CalcDef[] = []
): CheckResult => {
	const emptySlots: EmptySlot[] = [];
	const issues: TreeIssue[] = [];

	const visit = (node: CalcNode | null, path: NodePath, scope: ScopeField[]): void => {
		if (node === null) {
			emptySlots.push({ path, expected: expectedTypeAt(root, path, model, library) });
			return;
		}
		if (
			node.kind === 'field' &&
			!scope.some((field) => field.id === node.field) &&
			!model.fields.some((field) => field.id === node.field)
		) {
			issues.push({ path, message: `Unknown field "${node.field}" on ${model.label}` });
		}
		if (node.kind === 'calc') {
			const def = library.find((entry) => entry.id === node.calcId);
			if (!def) {
				issues.push({ path, message: `Unknown calc "${node.calcId}"` });
			} else {
				const version = effectiveVersion(def);
				if (version.modelId !== model.id) {
					issues.push({
						path,
						message: `"${version.label}" is defined for ${MODEL_BY_ID[version.modelId].label}`
					});
				}
				if (refsCycle(node, library, new Set())) {
					issues.push({ path, message: `Circular reference through "${node.calcId}"` });
				}
			}
		}
		if (node.kind === 'map') {
			const bodyType = resultTypeOf(
				node.body,
				model,
				mergeScope(scope, elementScopeOf(node.source, model, scope, library)),
				library
			);
			if (bodyType !== null && bodyType !== 'number') {
				issues.push({
					path: [...path, { part: 'body' }],
					message: `Map body must produce a number but got ${bodyType}`
				});
			}
		}
		if (node.kind === 'switch') {
			const branchTypes = [...node.cases.map((c) => c.then), node.fallback]
				.map((branch) => resultTypeOf(branch, model, scope, library))
				.filter((type): type is ValueType => type !== null);
			if (new Set(branchTypes).size > 1) {
				issues.push({ path, message: 'Switch branches disagree on result type' });
			}
			const onType = resultTypeOf(node.on, model, scope, library);
			if (onType !== null) {
				node.cases.forEach((c, index) => {
					const whenType = resultTypeOf(c.when, model, scope, library);
					if (whenType !== null && whenType !== onType) {
						issues.push({
							path: [...path, { part: 'case-when', index }],
							message: `Case matches a ${whenType} against a ${onType} scrutinee`
						});
					}
				});
			}
		}
		if (node.kind === 'op') {
			const arity = OPERATOR_BY_ID[node.op].arity;
			node.inputs.forEach((input, index) => {
				const inputType = resultTypeOf(input, model, scope, library);
				const expected = arity.kind === 'fixed' ? arity.params[index] : arity.param;
				if (inputType !== null && expected !== undefined && !accepts(expected, inputType)) {
					issues.push({
						path: [...path, { part: 'input', index }],
						message: `Expected ${expected} but got ${inputType}`
					});
				}
			});
		}
		for (const { step, child } of childSlots(node)) {
			const childScope =
				node.kind === 'map' && step.part === 'body'
					? mergeScope(scope, elementScopeOf(node.source, model, scope, library))
					: scope;
			visit(child, [...path, step], childScope);
		}
	};

	visit(root, [], []);
	return {
		resultType: resultTypeOf(root, model, [], library),
		emptySlots,
		issues,
		complete: root !== null && emptySlots.length === 0 && issues.length === 0
	};
};
