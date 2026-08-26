/*
 * Persistence: named patterns and the autosaved working state, sanitized on
 * the way in so stale or malformed saves degrade to empty cells instead of
 * breaking the page. Storage is injected so tests can use a fake, and writes
 * never throw (a full quota must not take down the editor).
 */

import { FABRIC_BY_ID } from './data';
import { LAYOUTS } from './geometry';
import { CELL_COUNT, emptyCell, type Board, type Cell } from './model';

export const PATTERNS_KEY = 'quilt-builder:patterns';
export const CURRENT_KEY = 'quilt-builder:current';

export interface SavedPattern {
	id: string;
	name: string;
	cells: Board;
	savedAt: number;
}

export type PatternMap = Record<string, SavedPattern>;

export interface WorkingState {
	cells: Board | null;
	currentId: string | null;
	name: string | null;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const readJson = (storage: StorageLike, key: string): unknown => {
	try {
		const raw = storage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

export const writeJson = (storage: StorageLike, key: string, value: unknown): boolean => {
	try {
		storage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
};

const isLayoutId = (value: unknown): value is Cell['layout'] =>
	typeof value === 'string' && value in LAYOUTS;

export const sanitizeCells = (raw: unknown): Board => {
	const list = Array.isArray(raw) ? raw : [];
	return Array.from({ length: CELL_COUNT }, (_, i) => {
		const cell = list[i] as Partial<Cell> | undefined;
		if (!cell || !isLayoutId(cell.layout) || !Array.isArray(cell.slots)) return emptyCell();
		if (cell.slots.length !== LAYOUTS[cell.layout].slots.length) return emptyCell();
		return {
			layout: cell.layout,
			rotation: typeof cell.rotation === 'number' ? ((cell.rotation % 4) + 4) % 4 : 0,
			slots: cell.slots.map((slot) =>
				typeof slot === 'string' && slot in FABRIC_BY_ID ? slot : null
			)
		};
	});
};

/**
 * Saves from before ids existed were keyed by name; migrate them. The id
 * minting is injectable so tests are deterministic.
 */
export const sanitizePatterns = (
	raw: unknown,
	mintId: () => string = () => crypto.randomUUID()
): PatternMap => {
	if (typeof raw !== 'object' || raw === null) return {};
	return Object.entries(raw as Record<string, Partial<SavedPattern>>).reduce<PatternMap>(
		(out, [key, pattern]) => {
			if (typeof pattern !== 'object' || pattern === null) return out;
			const id = typeof pattern.id === 'string' ? pattern.id : mintId();
			out[id] = {
				id,
				name: typeof pattern.name === 'string' ? pattern.name : key,
				cells: sanitizeCells(pattern.cells),
				savedAt: typeof pattern.savedAt === 'number' ? pattern.savedAt : 0
			};
			return out;
		},
		{}
	);
};

/** The working state was a bare cells array before currentId existed. */
export const parseWorkingState = (raw: unknown, knownIds: ReadonlySet<string>): WorkingState => {
	if (Array.isArray(raw)) return { cells: sanitizeCells(raw), currentId: null, name: null };
	if (typeof raw !== 'object' || raw === null) return { cells: null, currentId: null, name: null };
	const state = raw as { cells?: unknown; currentId?: unknown; name?: unknown };
	return {
		cells: state.cells ? sanitizeCells(state.cells) : null,
		currentId:
			typeof state.currentId === 'string' && knownIds.has(state.currentId) ? state.currentId : null,
		name: typeof state.name === 'string' ? state.name : null
	};
};
