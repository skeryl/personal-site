/*
 * Context-aware palette suggestions: when the selected slot is a field-name
 * or match-value input of a reference-data operator, offer the element
 * fields (or sample values) the user would otherwise have to type.
 */

import { getAt, type CalcNode, type NodePath } from './ast';
import type { DataModel, FieldDef } from './datamodels';
import { resolveField } from './evaluate';
import type { RecordValue } from './operators';

const elementFieldsFor = (
	objectsInput: CalcNode | null,
	model: DataModel
): { field: FieldDef; elements: NonNullable<FieldDef['elementFields']> } | null => {
	if (!objectsInput || objectsInput.kind !== 'field') return null;
	const field = model.fields.find((entry) => entry.id === objectsInput.field);
	return field?.elementFields ? { field, elements: field.elementFields } : null;
};

/** Distinct string values the samples hold for one element field. */
const sampleValues = (model: DataModel, objectsFieldId: string, elementId: string): string[] => {
	const seen = new Set<string>();
	for (const sample of model.samples) {
		const entries = resolveField(sample.values, objectsFieldId);
		if (!Array.isArray(entries)) continue;
		for (const entry of entries as RecordValue[]) {
			const value = entry[elementId];
			if (typeof value === 'string') seen.add(value);
		}
	}
	return [...seen];
};

/**
 * String-literal suggestions for the slot at path, or [] when the slot is
 * not a reference-data input (or its object[] source is not filled yet).
 */
export const suggestForSlot = (
	root: CalcNode | null,
	path: NodePath | null,
	model: DataModel
): string[] => {
	if (path === null || path.length === 0) return [];
	const step = path[path.length - 1];
	if (step.part !== 'input') return [];
	const parent = getAt(root, path.slice(0, -1));
	if (!parent || parent.kind !== 'op') return [];
	const source = elementFieldsFor(parent.inputs[0] ?? null, model);
	if (!source) return [];

	if (parent.op === 'pluck' && step.index === 1) {
		return source.elements.filter((element) => element.type === 'number').map((e) => e.id);
	}
	if (parent.op !== 'lookupString' && parent.op !== 'lookupNumber') return [];
	if (step.index === 1) return source.elements.map((element) => element.id);
	if (step.index === 3) {
		const want = parent.op === 'lookupString' ? 'string' : 'number';
		return source.elements.filter((element) => element.type === want).map((e) => e.id);
	}
	if (step.index === 2) {
		const matchField = parent.inputs[1];
		if (!matchField || matchField.kind !== 'literal' || typeof matchField.value !== 'string')
			return [];
		return sampleValues(model, source.field.id, matchField.value);
	}
	return [];
};
