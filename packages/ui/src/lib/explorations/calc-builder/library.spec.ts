import { describe, expect, it } from 'vitest';
import type { CalcNode } from './ast';
import { MODEL_BY_ID } from './datamodels';
import { evaluate } from './evaluate';
import {
	LIBRARY,
	effectiveVersion,
	latestVersion,
	publishedVersion,
	referencesTo,
	uniqueCalcId,
	type CalcDef,
	type CalcVersion
} from './library';
import { check } from './typecheck';

const byId = (id: string) => LIBRARY.find((def) => def.id === id)!;

const version = (
	versionNumber: number,
	status: CalcVersion['status'],
	root: CalcNode
): CalcVersion => ({
	version: versionNumber,
	status,
	savedAt: versionNumber,
	label: `v${versionNumber}`,
	modelId: 'trading-position',
	root
});

const resultsOf = (calcId: string) => {
	const def = byId(calcId);
	const current = effectiveVersion(def);
	return MODEL_BY_ID[current.modelId].samples.map((sample) =>
		evaluate(current.root, sample.values, LIBRARY)
	);
};

describe('library', () => {
	it('has unique ids and complete, well-typed trees for their pinned model', () => {
		expect(new Set(LIBRARY.map((def) => def.id)).size).toBe(LIBRARY.length);
		for (const def of LIBRARY) {
			const current = effectiveVersion(def);
			const result = check(current.root, MODEL_BY_ID[current.modelId], LIBRARY);
			expect(result.complete, def.id).toBe(true);
		}
	});

	it('ships built-ins as a single published version', () => {
		for (const def of LIBRARY) {
			expect(def.versions).toHaveLength(1);
			expect(def.versions[0]).toMatchObject({ version: 1, status: 'published' });
		}
	});

	it('never evaluates as incomplete on any sample', () => {
		for (const def of LIBRARY) {
			for (const result of resultsOf(def.id)) {
				if (!result.ok) expect(result.error, def.id).not.toBe('incomplete');
			}
		}
	});

	it('computes market value and P&L', () => {
		expect(resultsOf('market-value').map((r) => r.ok && r.value)).toEqual([7500, 2500, 8000]);
		expect(resultsOf('unrealized-pnl').map((r) => r.ok && r.value)).toEqual([1500, -500, 0]);
	});

	it('averages credit scores with a data-driven error for unrated instruments', () => {
		expect(resultsOf('avg-credit-score')).toEqual([
			{ ok: true, value: 19 },
			{ ok: true, value: 12 },
			{ ok: false, error: 'empty-array' }
		]);
	});

	it('maps each agency letter grade to a number', () => {
		expect(resultsOf('moodys-grade').map((r) => (r.ok ? r.value : r.error))).toEqual([
			19,
			11,
			'no-match'
		]);
		expect(resultsOf('sp-grade').map((r) => (r.ok ? r.value : r.error))).toEqual([
			19,
			14,
			'no-match'
		]);
		expect(resultsOf('fitch-grade').map((r) => (r.ok ? r.value : r.error))).toEqual([
			19,
			11,
			'no-match'
		]);
	});

	it('composes calcs in calcs: the consensus grade references three others', () => {
		expect(resultsOf('consensus-grade')).toEqual([
			{ ok: true, value: 19 },
			{ ok: true, value: 12 },
			{ ok: false, error: 'no-match' }
		]);
	});

	it('maps every letter grade to a number and averages across agencies', () => {
		expect(resultsOf('avg-rating-grade')).toEqual([
			{ ok: true, value: (19 + 19 + 19) / 3 },
			{ ok: true, value: (11 + 14 + 11) / 3 },
			{ ok: false, error: 'empty-array' }
		]);
	});

	it('flags investment grade holdings', () => {
		expect(resultsOf('investment-grade').map((r) => (r.ok ? r.value : r.error))).toEqual([
			true,
			false,
			'empty-array'
		]);
	});

	it('computes cross-model examples', () => {
		expect(resultsOf('book-imbalance').map((r) => r.ok && r.value)).toEqual([1.5, 0.25, 0]);
		expect(resultsOf('net-equity').map((r) => r.ok && r.value)).toEqual([31000, 7000, 1000]);
	});
});

describe('referencesTo', () => {
	it('finds the calcs that directly reference an id', () => {
		expect(referencesTo('moodys-grade', LIBRARY).map((def) => def.id)).toEqual(['consensus-grade']);
		expect(referencesTo('sp-grade', LIBRARY).map((def) => def.id)).toEqual(['consensus-grade']);
		expect(referencesTo('consensus-grade', LIBRARY)).toEqual([]);
		expect(referencesTo('market-value', LIBRARY)).toEqual([]);
	});

	it('never reports a calc as referencing itself', () => {
		const selfish: CalcDef = {
			id: 'selfie',
			description: '',
			versions: [version(1, 'published', { kind: 'calc', calcId: 'selfie' })]
		};
		expect(referencesTo('selfie', [...LIBRARY, selfish])).toEqual([]);
	});
});

describe('version resolution', () => {
	const a: CalcNode = { kind: 'literal', type: 'number', value: 1 };
	const b: CalcNode = { kind: 'literal', type: 'number', value: 2 };

	it('resolves to the latest published version, keeping drafts private', () => {
		const def: CalcDef = {
			id: 'x',
			description: '',
			versions: [version(1, 'published', a), version(2, 'draft', b)]
		};
		expect(latestVersion(def).version).toBe(2);
		expect(publishedVersion(def)?.version).toBe(1);
		expect(effectiveVersion(def).root).toBe(a);
	});

	it('falls back to the newest draft when nothing is published', () => {
		const def: CalcDef = {
			id: 'x',
			description: '',
			versions: [version(1, 'draft', a), version(2, 'draft', b)]
		};
		expect(publishedVersion(def)).toBeNull();
		expect(effectiveVersion(def).root).toBe(b);
	});

	it('lets the newest published win once promoted', () => {
		const def: CalcDef = {
			id: 'x',
			description: '',
			versions: [version(1, 'published', a), version(2, 'published', b)]
		};
		expect(effectiveVersion(def).root).toBe(b);
	});
});

describe('uniqueCalcId', () => {
	it('slugs labels and dodges collisions', () => {
		expect(uniqueCalcId("Moody's grade!", new Set())).toBe('moody-s-grade');
		expect(uniqueCalcId('Market value', new Set(['market-value']))).toBe('market-value-2');
		expect(uniqueCalcId('Market value', new Set(['market-value', 'market-value-2']))).toBe(
			'market-value-3'
		);
		expect(uniqueCalcId('!!!', new Set())).toBe('calc');
	});
});
