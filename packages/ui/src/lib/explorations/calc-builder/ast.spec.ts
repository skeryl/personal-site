import { describe, expect, it } from 'vitest';
import {
	addCase,
	addVariadicInput,
	childSlots,
	firstEmptyPath,
	getAt,
	newMapNode,
	newOpNode,
	newSwitchNode,
	pathKey,
	removeCase,
	removeVariadicInput,
	setAt,
	type CalcNode,
	type Literal,
	type NodePath
} from './ast';

const num = (value: number): Literal => ({ kind: 'literal', type: 'number', value });
const field = (id: string): CalcNode => ({ kind: 'field', field: id });

describe('pathKey', () => {
	it('names the root slot', () => {
		expect(pathKey([])).toBe('root');
	});

	it('serializes indexed and bare steps uniquely', () => {
		const a: NodePath = [
			{ part: 'input', index: 0 },
			{ part: 'case-then', index: 1 }
		];
		const b: NodePath = [
			{ part: 'input', index: 0 },
			{ part: 'case-then', index: 2 }
		];
		expect(pathKey(a)).toBe('input.0/case-then.1');
		expect(pathKey(a)).not.toBe(pathKey(b));
		expect(pathKey([{ part: 'on' }, { part: 'fallback' }])).toBe('on/fallback');
	});
});

describe('factories', () => {
	it('sizes fixed-arity inputs from the signature', () => {
		expect(newOpNode('not').inputs).toEqual([null]);
		expect(newOpNode('gt').inputs).toEqual([null, null]);
		expect(newOpNode('sum').inputs).toEqual([null]);
	});

	it('sizes variadic inputs to the minimum', () => {
		expect(newOpNode('and').inputs).toEqual([null, null]);
		expect(newOpNode('add').inputs).toEqual([null, null]);
	});

	it('starts a switch with one empty case and a fallback', () => {
		const node = newSwitchNode();
		expect(node.on).toBeNull();
		expect(node.cases).toEqual([{ when: null, then: null }]);
		expect(node.fallback).toBeNull();
	});

	it('starts a map with empty source and body', () => {
		expect(newMapNode()).toEqual({ kind: 'map', source: null, body: null });
	});
});

describe('getAt / setAt', () => {
	it('reads nested slots through ops and switches', () => {
		const root = setAt(newOpNode('mul'), [{ part: 'input', index: 1 }], newSwitchNode());
		expect(
			getAt(root, [
				{ part: 'input', index: 1 },
				{ part: 'case-when', index: 0 }
			])
		).toBeNull();
		expect(getAt(root, [{ part: 'input', index: 0 }])).toBeNull();
	});

	it('replaces the root when the path is empty', () => {
		expect(setAt(null, [], num(1))).toEqual(num(1));
		expect(setAt(num(1), [], null)).toBeNull();
	});

	it('fills a slot without mutating the original tree', () => {
		const original = newOpNode('mul');
		const next = setAt(original, [{ part: 'input', index: 0 }], field('price'));
		expect(original.inputs).toEqual([null, null]);
		expect(getAt(next, [{ part: 'input', index: 0 }])).toEqual(field('price'));
	});

	it('shares untouched branches structurally', () => {
		const filled = setAt(newOpNode('mul'), [{ part: 'input', index: 0 }], num(2));
		const next = setAt(filled, [{ part: 'input', index: 1 }], num(3));
		if (!next || next.kind !== 'op' || !filled || filled.kind !== 'op') throw new Error('op');
		expect(next.inputs[0]).toBe(filled.inputs[0]);
	});

	it('empties a slot with null, discarding the subtree', () => {
		const filled = setAt(newOpNode('mul'), [{ part: 'input', index: 0 }], num(2));
		const next = setAt(filled, [{ part: 'input', index: 0 }], null);
		expect(getAt(next, [{ part: 'input', index: 0 }])).toBeNull();
	});

	it('writes into switch on, case, and fallback slots', () => {
		let root: CalcNode | null = newSwitchNode();
		root = setAt(root, [{ part: 'on' }], field('symbol'));
		root = setAt(root, [{ part: 'case-when', index: 0 }], num(1));
		root = setAt(root, [{ part: 'case-then', index: 0 }], num(2));
		root = setAt(root, [{ part: 'fallback' }], num(3));
		expect(getAt(root, [{ part: 'on' }])).toEqual(field('symbol'));
		expect(getAt(root, [{ part: 'case-when', index: 0 }])).toEqual(num(1));
		expect(getAt(root, [{ part: 'case-then', index: 0 }])).toEqual(num(2));
		expect(getAt(root, [{ part: 'fallback' }])).toEqual(num(3));
	});
});

describe('firstEmptyPath', () => {
	it('returns the root slot for an empty tree', () => {
		expect(firstEmptyPath(null)).toEqual([]);
	});

	it('walks preorder to the first empty slot', () => {
		const root = setAt(newOpNode('mul'), [{ part: 'input', index: 0 }], newOpNode('add'));
		expect(firstEmptyPath(root)).toEqual([
			{ part: 'input', index: 0 },
			{ part: 'input', index: 0 }
		]);
	});

	it('returns null for a complete tree', () => {
		let root = setAt(newOpNode('gt'), [{ part: 'input', index: 0 }], num(1));
		root = setAt(root, [{ part: 'input', index: 1 }], num(2));
		expect(firstEmptyPath(root)).toBeNull();
	});

	it('orders switch slots on, when, then, fallback', () => {
		const root = setAt(newSwitchNode(), [{ part: 'on' }], field('symbol'));
		expect(firstEmptyPath(root)).toEqual([{ part: 'case-when', index: 0 }]);
	});
});

describe('case and variadic editing', () => {
	it('adds and removes switch cases, keeping at least one', () => {
		let root = addCase(newSwitchNode(), []);
		if (!root || root.kind !== 'switch') throw new Error('switch');
		expect(root.cases).toHaveLength(2);
		root = removeCase(root, [], 0);
		if (!root || root.kind !== 'switch') throw new Error('switch');
		expect(root.cases).toHaveLength(1);
		expect(removeCase(root, [], 0)).toBe(root);
	});

	it('adds and removes variadic inputs, honoring the minimum', () => {
		let root = addVariadicInput(newOpNode('add'), []);
		if (!root || root.kind !== 'op') throw new Error('op');
		expect(root.inputs).toHaveLength(3);
		root = removeVariadicInput(root, [], 2);
		if (!root || root.kind !== 'op') throw new Error('op');
		expect(root.inputs).toHaveLength(2);
		expect(removeVariadicInput(root, [], 0)).toBe(root);
	});

	it('rejects variadic edits on fixed-arity ops', () => {
		const root = newOpNode('sub');
		expect(addVariadicInput(root, [])).toBe(root);
	});
});

describe('childSlots', () => {
	it('lists op inputs in order', () => {
		expect(childSlots(newOpNode('gt')).map(({ step }) => step)).toEqual([
			{ part: 'input', index: 0 },
			{ part: 'input', index: 1 }
		]);
	});

	it('lists switch slots in display order', () => {
		const withExtraCase = addCase(newSwitchNode(), []);
		if (!withExtraCase) throw new Error('switch');
		expect(childSlots(withExtraCase).map(({ step }) => step.part)).toEqual([
			'on',
			'case-when',
			'case-then',
			'case-when',
			'case-then',
			'fallback'
		]);
	});

	it('lists map slots source then body', () => {
		expect(childSlots(newMapNode()).map(({ step }) => step.part)).toEqual(['source', 'body']);
	});

	it('writes into map source and body slots', () => {
		let root: CalcNode | null = newMapNode();
		root = setAt(root, [{ part: 'source' }], field('dailyReturns'));
		root = setAt(root, [{ part: 'body' }], num(1));
		expect(getAt(root, [{ part: 'source' }])).toEqual(field('dailyReturns'));
		expect(getAt(root, [{ part: 'body' }])).toEqual(num(1));
		expect(firstEmptyPath(root)).toBeNull();
	});

	it('has none for leaves', () => {
		expect(childSlots(num(1))).toEqual([]);
		expect(childSlots(field('price'))).toEqual([]);
	});
});
