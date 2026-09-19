/*
 * Persistence: the autosaved working state, sanitized on the way in so stale
 * or malformed saves degrade gracefully instead of breaking the page.
 * Storage is injected so tests can use a fake, and writes never throw.
 *
 * v2 stored one flat cell per grid position: { layout, rotation, slots }. v3
 * stores a Block tree. A v2 cell reads as a leaf, and the three layouts that
 * became compositions (pinwheel, broken dishes, four patch) are resampled
 * into their grid form so saved designs keep their colours.
 */

import {
	BLOCK_SIZES,
	DEFAULT_BLOCK_SIZE,
	DEFAULT_SIZE_ID,
	QUILT_SIZE_BY_ID,
	normalizeHex,
	type Material
} from './data';
import { REPLACED_BY } from './blocks';
import { CUTS, isCutId, normalizeTurns } from './geometry';
import { cloneBlock, emptyBlock, leafBlock, rotateBlock, type Block, type Board } from './model';
import { resample } from './placement';

export const STATE_KEY = 'quilt-builder:v3';
/** Read once when v3 is absent, so existing designs survive the upgrade. */
export const LEGACY_STATE_KEY = 'quilt-builder:v2';

/** Compositions the palette offers. Anything else in a save is rejected. */
const DIVISIONS = [1, 2, 4];

export interface CustomBlock {
	id: string;
	name: string;
	block: Block;
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

const fabricList = (raw: unknown, count: number, known: ReadonlySet<string>): (string | null)[] =>
	Array.from({ length: count }, (_, i) => {
		const value = Array.isArray(raw) ? raw[i] : null;
		return typeof value === 'string' && known.has(value) ? value : null;
	});

type Loose = Record<string, unknown>;

const sanitizeLeaf = (raw: Loose, known: ReadonlySet<string>): Block => {
	if (!isCutId(raw.cut)) return emptyBlock();
	const count = CUTS[raw.cut].pieces.length;
	if (!Array.isArray(raw.fabrics) || raw.fabrics.length !== count) return emptyBlock();
	const roleOffset = typeof raw.roleOffset === 'number' ? raw.roleOffset : 0;
	return leafBlock(
		raw.cut,
		normalizeTurns(typeof raw.rotation === 'number' ? raw.rotation : 0),
		fabricList(raw.fabrics, count, known),
		roleOffset || undefined
	);
};

/** A v2 cell, converted to a leaf and then to its replacement composition. */
const migrateCell = (raw: Loose, known: ReadonlySet<string>): Block => {
	if (!isCutId(raw.layout)) return emptyBlock();
	const count = CUTS[raw.layout].pieces.length;
	if (!Array.isArray(raw.slots) || raw.slots.length !== count) return emptyBlock();
	const rotation = normalizeTurns(typeof raw.rotation === 'number' ? raw.rotation : 0);
	const old = leafBlock(raw.layout, rotation, fabricList(raw.slots, count, known));
	const replacement = REPLACED_BY[raw.layout];
	// Resampling by centroid, so the index order of the old layout never matters.
	return replacement ? resample(rotateBlock(cloneBlock(replacement), rotation), old) : old;
};

export const sanitizeBlock = (raw: unknown, known: ReadonlySet<string>): Block => {
	if (typeof raw !== 'object' || raw === null) return emptyBlock();
	const value = raw as Loose;
	if (value.kind === 'grid') {
		const { cols, rows, children } = value;
		if (
			typeof cols !== 'number' ||
			typeof rows !== 'number' ||
			!DIVISIONS.includes(cols) ||
			!DIVISIONS.includes(rows) ||
			!Array.isArray(children) ||
			children.length !== cols * rows
		) {
			return emptyBlock();
		}
		return { kind: 'grid', cols, rows, children: children.map((c) => sanitizeBlock(c, known)) };
	}
	if (value.kind === 'leaf') return sanitizeLeaf(value, known);
	return migrateCell(value, known);
};

export const sanitizeCells = (raw: unknown, count: number, known: ReadonlySet<string>): Board => {
	const list = Array.isArray(raw) ? raw : [];
	return Array.from({ length: count }, (_, i) => sanitizeBlock(list[i], known));
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
		if (typeof item !== 'object' || item === null) return [];
		const b = item as Loose;
		if (typeof b.id !== 'string' || typeof b.name !== 'string') return [];
		// v2 saved the layout inline; v3 saves a block tree.
		const block = sanitizeBlock('block' in b ? b.block : b, known);
		return [{ id: b.id, name: b.name, block }];
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
