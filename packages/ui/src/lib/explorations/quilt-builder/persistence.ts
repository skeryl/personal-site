/*
 * Persistence: the autosaved working state, sanitized on the way in so stale
 * or malformed saves degrade gracefully instead of breaking the page.
 * Storage is injected so tests can use a fake, and writes never throw.
 */

import {
	BLOCK_SIZES,
	DEFAULT_BLOCK_SIZE,
	DEFAULT_SIZE_ID,
	QUILT_SIZE_BY_ID,
	normalizeHex,
	type Material
} from './data';
import { LAYOUTS, isLayoutId } from './geometry';
import { emptyCell, type Board, type Cell } from './model';

export const STATE_KEY = 'quilt-builder:v2';

export interface CustomBlock {
	id: string;
	name: string;
	layout: string;
	rotation: number;
	slots: (string | null)[];
}

export interface SavedState {
	name: string;
	sizeId: string;
	blockSize: number;
	materials: Material[];
	selectedMaterialId: string | null;
	customBlocks: CustomBlock[];
	cells: Board;
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

const sanitizeCell = (raw: unknown, known: ReadonlySet<string>): Cell => {
	const cell = raw as Partial<Cell> | undefined;
	if (!cell || !isLayoutId(cell.layout) || !Array.isArray(cell.slots)) return emptyCell();
	if (cell.slots.length !== LAYOUTS[cell.layout].slots.length) return emptyCell();
	return {
		layout: cell.layout,
		rotation: typeof cell.rotation === 'number' ? ((cell.rotation % 4) + 4) % 4 : 0,
		slots: cell.slots.map((s) => (typeof s === 'string' && known.has(s) ? s : null))
	};
};

export const sanitizeCells = (raw: unknown, count: number, known: ReadonlySet<string>): Board => {
	const list = Array.isArray(raw) ? raw : [];
	return Array.from({ length: count }, (_, i) => sanitizeCell(list[i], known));
};

export const sanitizeMaterials = (raw: unknown): Material[] => {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	return raw.flatMap((item) => {
		const m = item as Partial<Material>;
		if (typeof m?.id !== 'string' || seen.has(m.id)) return [];
		const hex = typeof m.hex === 'string' ? normalizeHex(m.hex) : null;
		if (!hex) return [];
		seen.add(m.id);
		return [{ id: m.id, name: typeof m.name === 'string' ? m.name : '', hex }];
	});
};

const sanitizeCustomBlocks = (raw: unknown, known: ReadonlySet<string>): CustomBlock[] => {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		const b = item as Partial<CustomBlock>;
		if (typeof b?.id !== 'string' || typeof b.name !== 'string') return [];
		const cell = sanitizeCell(b, known);
		return [
			{ id: b.id, name: b.name, layout: cell.layout, rotation: cell.rotation, slots: cell.slots }
		];
	});
};

export const gridDims = (sizeId: string, blockSize: number): { rows: number; cols: number } => {
	const size = QUILT_SIZE_BY_ID[sizeId] ?? QUILT_SIZE_BY_ID[DEFAULT_SIZE_ID];
	return {
		rows: Math.max(1, Math.floor(size.height / blockSize)),
		cols: Math.max(1, Math.floor(size.width / blockSize))
	};
};

export const parseSavedState = (raw: unknown): SavedState | null => {
	if (typeof raw !== 'object' || raw === null) return null;
	const s = raw as Partial<Record<keyof SavedState, unknown>>;
	const sizeId =
		typeof s.sizeId === 'string' && s.sizeId in QUILT_SIZE_BY_ID ? s.sizeId : DEFAULT_SIZE_ID;
	const blockSize =
		typeof s.blockSize === 'number' && BLOCK_SIZES.includes(s.blockSize)
			? s.blockSize
			: DEFAULT_BLOCK_SIZE;
	const materials = sanitizeMaterials(s.materials);
	const known = new Set(materials.map((m) => m.id));
	const { rows, cols } = gridDims(sizeId, blockSize);
	return {
		name: typeof s.name === 'string' ? s.name : '',
		sizeId,
		blockSize,
		materials,
		selectedMaterialId:
			typeof s.selectedMaterialId === 'string' && known.has(s.selectedMaterialId)
				? s.selectedMaterialId
				: null,
		customBlocks: sanitizeCustomBlocks(s.customBlocks, known),
		cells: sanitizeCells(s.cells, rows * cols, known)
	};
};
