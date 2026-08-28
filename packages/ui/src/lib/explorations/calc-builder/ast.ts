/*
 * AST model: calculation nodes, slot paths into the tree, and the immutable
 * editing helpers every mutation path goes through.
 */

import { OPERATOR_BY_ID, type OperatorId } from './operators';

export type ValueType = 'number' | 'boolean' | 'string' | 'number[]' | 'object[]';

/** CSS badge modifier for a value/expected type ('number[]' -> 't-array'). */
export const typeClass = (type: string): string =>
	type === 'number[]'
		? 'array'
		: type === 'object[]'
			? 'objects'
			: type === 'numeric'
				? 'number'
				: type;

export type CalcNode = OpNode | SwitchNode | MapNode | FieldRef | CalcRef | Literal;

export interface OpNode {
	kind: 'op';
	op: OperatorId;
	/** One entry per argument; null marks an empty slot. */
	inputs: (CalcNode | null)[];
}

export interface SwitchCase {
	when: CalcNode | null;
	then: CalcNode | null;
}

/** Scrutinee + equality-matched cases + an "otherwise" branch. */
export interface SwitchNode {
	kind: 'switch';
	on: CalcNode | null;
	cases: SwitchCase[];
	fallback: CalcNode | null;
}

/**
 * Evaluate body once per element of source. Inside the body, the element's
 * fields (or `item` for number arrays) are in scope, over the record fields.
 */
export interface MapNode {
	kind: 'map';
	source: CalcNode | null;
	body: CalcNode | null;
}

export interface FieldRef {
	kind: 'field';
	field: string;
}

/** A reference to a stored library calculation, composed like any leaf. */
export interface CalcRef {
	kind: 'calc';
	calcId: string;
}

export type LiteralType = 'number' | 'boolean' | 'string';

export interface Literal {
	kind: 'literal';
	type: LiteralType;
	value: number | boolean | string;
}

export type PathStep =
	| { part: 'input'; index: number }
	| { part: 'on' }
	| { part: 'case-when'; index: number }
	| { part: 'case-then'; index: number }
	| { part: 'fallback' }
	| { part: 'source' }
	| { part: 'body' };

/** A slot address from the root; [] is the root slot itself. */
export type NodePath = PathStep[];

export const pathKey = (path: NodePath): string =>
	path.length === 0
		? 'root'
		: path.map((step) => ('index' in step ? `${step.part}.${step.index}` : step.part)).join('/');

export const pathsEqual = (a: NodePath, b: NodePath): boolean => pathKey(a) === pathKey(b);

/** True when `path` lies strictly inside the subtree rooted at `prefix`. */
export const pathInside = (path: NodePath, prefix: NodePath): boolean =>
	path.length > prefix.length && pathKey(path.slice(0, prefix.length)) === pathKey(prefix);

export interface ChildSlot {
	step: PathStep;
	child: CalcNode | null;
}

/** Every fillable child position of a node, in display (preorder) order. */
export const childSlots = (node: CalcNode): ChildSlot[] => {
	switch (node.kind) {
		case 'op':
			return node.inputs.map(
				(child, index): ChildSlot => ({ step: { part: 'input', index }, child })
			);
		case 'switch':
			return [
				{ step: { part: 'on' }, child: node.on },
				...node.cases.flatMap((c, index): ChildSlot[] => [
					{ step: { part: 'case-when', index }, child: c.when },
					{ step: { part: 'case-then', index }, child: c.then }
				]),
				{ step: { part: 'fallback' }, child: node.fallback }
			];
		case 'map':
			return [
				{ step: { part: 'source' }, child: node.source },
				{ step: { part: 'body' }, child: node.body }
			];
		default:
			return [];
	}
};

const childAt = (node: CalcNode, step: PathStep): CalcNode | null => {
	switch (step.part) {
		case 'input':
			return node.kind === 'op' ? (node.inputs[step.index] ?? null) : null;
		case 'on':
			return node.kind === 'switch' ? node.on : null;
		case 'case-when':
			return node.kind === 'switch' ? (node.cases[step.index]?.when ?? null) : null;
		case 'case-then':
			return node.kind === 'switch' ? (node.cases[step.index]?.then ?? null) : null;
		case 'fallback':
			return node.kind === 'switch' ? node.fallback : null;
		case 'source':
			return node.kind === 'map' ? node.source : null;
		case 'body':
			return node.kind === 'map' ? node.body : null;
	}
};

export const getAt = (root: CalcNode | null, path: NodePath): CalcNode | null =>
	path.reduce<CalcNode | null>((node, step) => (node ? childAt(node, step) : null), root);

/**
 * Replace the node (or empty slot) at path, returning a new root with
 * structural sharing. Passing null empties the slot, discarding the subtree.
 */
export const setAt = (
	root: CalcNode | null,
	path: NodePath,
	replacement: CalcNode | null
): CalcNode | null => {
	if (path.length === 0) return replacement;
	if (root === null) return root;
	const [step, ...rest] = path;
	if (root.kind === 'op' && step.part === 'input') {
		return {
			...root,
			inputs: root.inputs.map((child, i) =>
				i === step.index ? setAt(child, rest, replacement) : child
			)
		};
	}
	if (root.kind === 'map') {
		if (step.part === 'source') return { ...root, source: setAt(root.source, rest, replacement) };
		if (step.part === 'body') return { ...root, body: setAt(root.body, rest, replacement) };
	}
	if (root.kind === 'switch') {
		if (step.part === 'on') return { ...root, on: setAt(root.on, rest, replacement) };
		if (step.part === 'fallback')
			return { ...root, fallback: setAt(root.fallback, rest, replacement) };
		if (step.part === 'case-when' || step.part === 'case-then') {
			return {
				...root,
				cases: root.cases.map((c, i) =>
					i !== step.index
						? c
						: step.part === 'case-when'
							? { ...c, when: setAt(c.when, rest, replacement) }
							: { ...c, then: setAt(c.then, rest, replacement) }
				)
			};
		}
	}
	return root;
};

/** Preorder search for the first empty slot; null when the tree is complete. */
export const firstEmptyPath = (root: CalcNode | null): NodePath | null => {
	if (root === null) return [];
	for (const { step, child } of childSlots(root)) {
		const found = firstEmptyPath(child);
		if (found !== null) return [step, ...found];
	}
	return null;
};

export const newOpNode = (op: OperatorId): OpNode => {
	const arity = OPERATOR_BY_ID[op].arity;
	const size = arity.kind === 'fixed' ? arity.params.length : arity.min;
	return { kind: 'op', op, inputs: Array.from({ length: size }, () => null) };
};

export const newSwitchNode = (): SwitchNode => ({
	kind: 'switch',
	on: null,
	cases: [{ when: null, then: null }],
	fallback: null
});

export const newMapNode = (): MapNode => ({ kind: 'map', source: null, body: null });

export const addCase = (root: CalcNode | null, path: NodePath): CalcNode | null => {
	const node = getAt(root, path);
	if (!node || node.kind !== 'switch') return root;
	return setAt(root, path, { ...node, cases: [...node.cases, { when: null, then: null }] });
};

export const removeCase = (
	root: CalcNode | null,
	path: NodePath,
	index: number
): CalcNode | null => {
	const node = getAt(root, path);
	if (!node || node.kind !== 'switch' || node.cases.length <= 1) return root;
	return setAt(root, path, { ...node, cases: node.cases.filter((_, i) => i !== index) });
};

export const addVariadicInput = (root: CalcNode | null, path: NodePath): CalcNode | null => {
	const node = getAt(root, path);
	if (!node || node.kind !== 'op') return root;
	if (OPERATOR_BY_ID[node.op].arity.kind !== 'variadic') return root;
	return setAt(root, path, { ...node, inputs: [...node.inputs, null] });
};

export const removeVariadicInput = (
	root: CalcNode | null,
	path: NodePath,
	index: number
): CalcNode | null => {
	const node = getAt(root, path);
	if (!node || node.kind !== 'op') return root;
	const arity = OPERATOR_BY_ID[node.op].arity;
	if (arity.kind !== 'variadic' || node.inputs.length <= arity.min) return root;
	return setAt(root, path, { ...node, inputs: node.inputs.filter((_, i) => i !== index) });
};
