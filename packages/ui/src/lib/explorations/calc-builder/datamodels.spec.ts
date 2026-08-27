import { describe, expect, it } from 'vitest';
import { MODELS, MODEL_BY_ID } from './datamodels';
import { matchesType, resolveField } from './evaluate';
import type { RecordValue } from './operators';

describe('data models', () => {
	it('exposes every model by id', () => {
		expect(Object.keys(MODEL_BY_ID)).toHaveLength(MODELS.length);
		for (const model of MODELS) expect(MODEL_BY_ID[model.id]).toBe(model);
	});

	it('gives every model a string field and an array field for demos', () => {
		for (const model of MODELS) {
			expect(model.fields.some((field) => field.type === 'string')).toBe(true);
			expect(model.fields.some((field) => field.type === 'number[]')).toBe(true);
		}
	});

	it('keeps every sample record consistent with the declared fields', () => {
		for (const model of MODELS) {
			for (const sample of model.samples) {
				for (const field of model.fields) {
					const value = resolveField(sample.values, field.id);
					expect(value, `${model.id}/${sample.id}/${field.id}`).toBeDefined();
					expect(matchesType(value!, field.type), `${model.id}/${sample.id}/${field.id}`).toBe(
						true
					);
				}
			}
		}
	});

	it('keeps object[] entries consistent with their declared element shape', () => {
		for (const model of MODELS) {
			for (const field of model.fields.filter((entry) => entry.type === 'object[]')) {
				expect(field.elementFields?.length).toBeGreaterThan(0);
				for (const sample of model.samples) {
					const entries = resolveField(sample.values, field.id) as RecordValue[];
					for (const entry of entries) {
						expect(Object.keys(entry).sort()).toEqual(
							field.elementFields!.map((element) => element.id).sort()
						);
						for (const element of field.elementFields!) {
							expect(typeof entry[element.id]).toBe(element.type);
						}
					}
				}
			}
		}
	});

	it('includes an empty-array sample per model to exercise aggregation errors', () => {
		for (const model of MODELS) {
			const arrayFields = model.fields.filter((field) => field.type === 'number[]');
			const hasEmpty = model.samples.some((sample) =>
				arrayFields.some(
					(field) => (resolveField(sample.values, field.id) as number[]).length === 0
				)
			);
			expect(hasEmpty).toBe(true);
		}
	});
});
