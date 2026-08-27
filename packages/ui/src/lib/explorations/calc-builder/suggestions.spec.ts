import { describe, expect, it } from 'vitest';
import { newOpNode, setAt, type CalcNode, type NodePath } from './ast';
import { MODEL_BY_ID } from './datamodels';
import { suggestForSlot } from './suggestions';

const model = MODEL_BY_ID['trading-position'];
const ratings: CalcNode = { kind: 'field', field: 'instrument.creditRatings' };
const str = (value: string): CalcNode => ({ kind: 'literal', type: 'string', value });
const input = (index: number): NodePath => [{ part: 'input', index }];

describe('suggestForSlot', () => {
	it('suggests nothing without a selected reference-data slot', () => {
		expect(suggestForSlot(null, null, model)).toEqual([]);
		expect(suggestForSlot(null, [], model)).toEqual([]);
		expect(suggestForSlot(newOpNode('mul'), input(0), model)).toEqual([]);
	});

	it('suggests nothing until the object[] source is a known field', () => {
		expect(suggestForSlot(newOpNode('pluck'), input(1), model)).toEqual([]);
		const literalSource = setAt(newOpNode('pluck'), input(0), str('oops'));
		expect(suggestForSlot(literalSource, input(1), model)).toEqual([]);
	});

	it('suggests numeric element fields for pluck', () => {
		const root = setAt(newOpNode('pluck'), input(0), ratings);
		expect(suggestForSlot(root, input(1), model)).toEqual(['score']);
	});

	it('suggests all element fields for the lookup match field', () => {
		const root = setAt(newOpNode('lookupString'), input(0), ratings);
		expect(suggestForSlot(root, input(1), model)).toEqual(['agency', 'rating', 'score']);
	});

	it('suggests result fields matching the lookup flavor', () => {
		const asString = setAt(newOpNode('lookupString'), input(0), ratings);
		expect(suggestForSlot(asString, input(3), model)).toEqual(['agency', 'rating']);
		const asNumber = setAt(newOpNode('lookupNumber'), input(0), ratings);
		expect(suggestForSlot(asNumber, input(3), model)).toEqual(['score']);
	});

	it('suggests sample values once the match field is chosen', () => {
		let root = setAt(newOpNode('lookupString'), input(0), ratings);
		expect(suggestForSlot(root, input(2), model)).toEqual([]);
		root = setAt(root, input(1), str('agency'));
		expect(suggestForSlot(root, input(2), model)).toEqual(['moodys', 'sp', 'fitch']);
	});
});
