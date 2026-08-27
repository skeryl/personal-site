/*
 * localStorage persistence: the working calculation and user-saved library
 * entries survive reloads. Stored JSON is untrusted; sanitizers rebuild
 * valid trees and degrade anything malformed to empty slots or drop it.
 */

import type { CalcNode } from './ast';
import { MODEL_BY_ID, type DataModelId } from './datamodels';
import type { CalcDef, CalcVersion } from './library';
import { OPERATOR_BY_ID, type OperatorId } from './operators';

export const LIBRARY_KEY = 'calc-builder:library';
export const CURRENT_KEY = 'calc-builder:current';

export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export const readJson = (storage: StorageLike, key: string): unknown => {
	try {
		const raw = storage.getItem(key);
		return raw === null ? null : JSON.parse(raw);
	} catch {
		return null;
	}
};

export const writeJson = (storage: StorageLike, key: string, value: unknown): void => {
	try {
		storage.setItem(key, JSON.stringify(value));
	} catch {
		// Quota or privacy-mode failures just lose persistence, not the session.
	}
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Rebuild a node from untrusted JSON; malformed subtrees become empty slots. */
export const sanitizeNode = (value: unknown): CalcNode | null => {
	if (!isObject(value)) return null;
	switch (value.kind) {
		case 'literal': {
			const { type, value: literal } = value;
			if (
				(type === 'number' || type === 'boolean' || type === 'string') &&
				typeof literal === type
			) {
				return { kind: 'literal', type, value: literal as number | boolean | string };
			}
			return null;
		}
		case 'field':
			return typeof value.field === 'string' ? { kind: 'field', field: value.field } : null;
		case 'calc':
			return typeof value.calcId === 'string' ? { kind: 'calc', calcId: value.calcId } : null;
		case 'op': {
			const def = typeof value.op === 'string' ? OPERATOR_BY_ID[value.op as OperatorId] : undefined;
			if (!def) return null;
			const raw = Array.isArray(value.inputs) ? value.inputs.map(sanitizeNode) : [];
			const size =
				def.arity.kind === 'fixed' ? def.arity.params.length : Math.max(def.arity.min, raw.length);
			const inputs = Array.from({ length: size }, (_, index) => raw[index] ?? null);
			return { kind: 'op', op: def.id, inputs };
		}
		case 'switch': {
			const rawCases = Array.isArray(value.cases) ? value.cases : [];
			const cases = rawCases
				.filter(isObject)
				.map((entry) => ({ when: sanitizeNode(entry.when), then: sanitizeNode(entry.then) }));
			return {
				kind: 'switch',
				on: sanitizeNode(value.on),
				cases: cases.length > 0 ? cases : [{ when: null, then: null }],
				fallback: sanitizeNode(value.fallback)
			};
		}
		case 'map':
			return { kind: 'map', source: sanitizeNode(value.source), body: sanitizeNode(value.body) };
		default:
			return null;
	}
};

const sanitizeVersion = (value: unknown): CalcVersion | null => {
	if (!isObject(value)) return null;
	const { version, status, savedAt, publishedAt, label, modelId } = value;
	if (typeof version !== 'number' || typeof savedAt !== 'number') return null;
	if (status !== 'draft' && status !== 'published') return null;
	if (typeof label !== 'string') return null;
	if (typeof modelId !== 'string' || !(modelId in MODEL_BY_ID)) return null;
	const root = sanitizeNode(value.root);
	if (root === null) return null;
	return {
		version,
		status,
		savedAt,
		...(typeof publishedAt === 'number' ? { publishedAt } : {}),
		label,
		modelId: modelId as DataModelId,
		root
	};
};

/** Stored defs: valid versioned shape; built-in ids act as overrides. */
export const sanitizeDefs = (value: unknown): CalcDef[] => {
	if (!Array.isArray(value)) return [];
	const defs: CalcDef[] = [];
	const seen = new Set<string>();
	for (const entry of value) {
		if (!isObject(entry)) continue;
		const { id, description } = entry;
		if (typeof id !== 'string' || seen.has(id)) continue;
		const versions = Array.isArray(entry.versions)
			? entry.versions
					.map(sanitizeVersion)
					.filter((version): version is CalcVersion => version !== null)
			: [];
		if (versions.length === 0) continue;
		seen.add(id);
		defs.push({
			id,
			description: typeof description === 'string' ? description : '',
			versions
		});
	}
	return defs;
};

export interface WorkingState {
	modelId: DataModelId | null;
	root: CalcNode | null;
	name: string;
	loadedId: string | null;
}

export const parseWorkingState = (value: unknown): WorkingState => {
	if (!isObject(value)) return { modelId: null, root: null, name: '', loadedId: null };
	const modelId =
		typeof value.modelId === 'string' && value.modelId in MODEL_BY_ID
			? (value.modelId as DataModelId)
			: null;
	return {
		modelId,
		root: sanitizeNode(value.root),
		name: typeof value.name === 'string' ? value.name : '',
		loadedId: typeof value.loadedId === 'string' ? value.loadedId : null
	};
};
