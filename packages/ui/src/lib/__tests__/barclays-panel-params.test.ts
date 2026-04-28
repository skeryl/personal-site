import { expect, test, describe } from 'vitest';
import { numberParam, type ContentParams } from '$lib/content-params';
import { readParams } from '$lib/entries/barclays-panel';

function makeParams(overrides: Record<string, number> = {}): ContentParams {
	const defaults: Record<string, [string, number, { min: number; max: number; step: number }]> = {
		columns: ['Columns', 20, { min: 1, max: 40, step: 1 }],
		rows: ['Rows', 30, { min: 1, max: 50, step: 1 }],
		'spacing-x': ['Spacing X', 0.6, { min: 0.1, max: 3, step: 0.1 }],
		'spacing-y': ['Spacing Y', 0.6, { min: 0.1, max: 3, step: 0.1 }],
		'column-offset': ['Column Offset', 0, { min: -2, max: 2, step: 0.05 }],
		growth: ['Growth', 0, { min: -0.5, max: 3, step: 0.05 }],
		yaw: ['Yaw', 0.3, { min: -3, max: 3, step: 0.05 }],
		pitch: ['Pitch', 0, { min: -3, max: 3, step: 0.05 }],
		roll: ['Roll', 0, { min: -3, max: 3, step: 0.05 }]
	};

	return Object.entries(defaults).map(([id, [name, defaultVal, range]]) => {
		const val = id in overrides ? overrides[id] : defaultVal;
		const p = numberParam(name, defaultVal, range);
		return { ...p, value: val };
	});
}

describe('readParams: each param is independent', () => {
	test('returns all defaults', () => {
		const r = readParams(makeParams());
		expect(r.cols).toBe(20);
		expect(r.rows).toBe(30);
		expect(r.spacingX).toBe(0.6);
		expect(r.spacingY).toBe(0.6);
		expect(r.yaw).toBe(0.3);
		expect(r.pitch).toBe(0);
		expect(r.roll).toBe(0);
		expect(r.columnOffset).toBe(0);
		expect(r.growth).toBe(0);
	});

	test('changing one param does not affect others', () => {
		const pairs: [string, number, keyof ReturnType<typeof readParams>][] = [
			['columns', 10, 'cols'],
			['rows', 15, 'rows'],
			['spacing-x', 2.0, 'spacingX'],
			['spacing-y', 1.5, 'spacingY'],
			['column-offset', 1.5, 'columnOffset'],
			['growth', 1.0, 'growth'],
			['yaw', 2.0, 'yaw'],
			['pitch', -1.0, 'pitch'],
			['roll', 0.5, 'roll']
		];

		const defaults = readParams(makeParams());

		for (const [paramId, newVal, key] of pairs) {
			const result = readParams(makeParams({ [paramId]: newVal }));
			expect(result[key]).toBe(newVal);
			for (const [, , otherKey] of pairs) {
				if (otherKey !== key) {
					expect(result[otherKey]).toBe(defaults[otherKey]);
				}
			}
		}
	});

	test('multiple params changed at once all take effect', () => {
		const r = readParams(makeParams({ columns: 5, rows: 10, yaw: 1.5, growth: 2.0 }));
		expect(r.cols).toBe(5);
		expect(r.rows).toBe(10);
		expect(r.yaw).toBe(1.5);
		expect(r.growth).toBe(2.0);
		expect(r.spacingX).toBe(0.6);
		expect(r.pitch).toBe(0);
	});
});
