import { describe, expect, it } from 'vitest';
import { LIBRARY, effectiveVersion } from './library';
import {
	parseWorkingState,
	readJson,
	sanitizeDefs,
	sanitizeNode,
	writeJson,
	type StorageLike
} from './persistence';

const memoryStorage = (): StorageLike & { data: Record<string, string> } => {
	const data: Record<string, string> = {};
	return {
		data,
		getItem: (key) => data[key] ?? null,
		setItem: (key, value) => {
			data[key] = value;
		}
	};
};

describe('readJson / writeJson', () => {
	it('round-trips values and tolerates corrupt JSON', () => {
		const storage = memoryStorage();
		writeJson(storage, 'k', { a: 1 });
		expect(readJson(storage, 'k')).toEqual({ a: 1 });
		storage.data.k = '{nope';
		expect(readJson(storage, 'k')).toBeNull();
		expect(readJson(storage, 'missing')).toBeNull();
	});
});

describe('sanitizeNode', () => {
	it('round-trips every built-in library tree through JSON', () => {
		for (const def of LIBRARY) {
			const root = effectiveVersion(def).root;
			expect(sanitizeNode(JSON.parse(JSON.stringify(root))), def.id).toEqual(root);
		}
	});

	it('degrades malformed subtrees to empty slots', () => {
		expect(sanitizeNode('garbage')).toBeNull();
		expect(sanitizeNode({ kind: 'op', op: 'not-an-op', inputs: [] })).toBeNull();
		expect(sanitizeNode({ kind: 'literal', type: 'number', value: 'nan' })).toBeNull();
		const sanitized = sanitizeNode({
			kind: 'op',
			op: 'mul',
			inputs: [{ kind: 'field', field: 'price' }, { bad: true }]
		});
		expect(sanitized).toEqual({
			kind: 'op',
			op: 'mul',
			inputs: [{ kind: 'field', field: 'price' }, null]
		});
	});

	it('restores fixed arity sizes and minimum switch shape', () => {
		expect(sanitizeNode({ kind: 'op', op: 'gt', inputs: [] })).toEqual({
			kind: 'op',
			op: 'gt',
			inputs: [null, null]
		});
		expect(sanitizeNode({ kind: 'switch', on: null, cases: [], fallback: null })).toEqual({
			kind: 'switch',
			on: null,
			cases: [{ when: null, then: null }],
			fallback: null
		});
	});
});

describe('sanitizeDefs', () => {
	const validVersion = (versionNumber: number, status = 'draft') => ({
		version: versionNumber,
		status,
		savedAt: 100 + versionNumber,
		label: 'Mine',
		modelId: 'trading-position',
		root: { kind: 'field', field: 'price' }
	});

	it('keeps valid versioned defs, drops dupes, junk, and empty histories', () => {
		const defs = sanitizeDefs([
			{ id: 'mine', versions: [validVersion(1), validVersion(2, 'published')] },
			{ id: 'mine', versions: [validVersion(1)] },
			{ id: 'market-value', versions: [validVersion(1)] },
			{ id: 'bad-status', versions: [{ ...validVersion(1), status: 'wat' }] },
			{ id: 'bad-model', versions: [{ ...validVersion(1), modelId: 'nope' }] },
			{ id: 'no-versions', versions: [] },
			'garbage'
		]);
		expect(defs.map((def) => def.id)).toEqual(['mine', 'market-value']);
		expect(defs[0].versions).toHaveLength(2);
		expect(defs[0].versions[1]).toMatchObject({ version: 2, status: 'published' });
		expect(defs[0].description).toBe('');
	});

	it('drops malformed versions but keeps the valid remainder', () => {
		const defs = sanitizeDefs([
			{ id: 'mixed', versions: [validVersion(1, 'published'), { junk: true }, validVersion(3)] }
		]);
		expect(defs[0].versions.map((entry) => entry.version)).toEqual([1, 3]);
		expect(defs[0].versions[0].publishedAt).toBeUndefined();
	});
});

describe('parseWorkingState', () => {
	it('recovers model, root, and naming, defaulting invalid parts', () => {
		expect(parseWorkingState(null)).toEqual({
			modelId: null,
			root: null,
			name: '',
			loadedId: null
		});
		expect(
			parseWorkingState({
				modelId: 'order-book',
				root: { kind: 'field', field: 'spread' },
				name: 'Spread',
				loadedId: 'spread-calc'
			})
		).toEqual({
			modelId: 'order-book',
			root: { kind: 'field', field: 'spread' },
			name: 'Spread',
			loadedId: 'spread-calc'
		});
		expect(parseWorkingState({ modelId: 'bogus', root: 'junk', name: 7, loadedId: 9 })).toEqual({
			modelId: null,
			root: null,
			name: '',
			loadedId: null
		});
	});
});
