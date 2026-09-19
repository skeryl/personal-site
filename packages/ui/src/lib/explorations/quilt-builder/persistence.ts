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
	CUSTOM_SIZE_ID,
	DEFAULT_BLOCK_SIZE,
	DEFAULT_SIZE_ID,
	LEGACY_SIZE_IDS,
	QUILT_SIZE_BY_ID,
	clampCustomInches,
	normalizeHex,
	type Material
} from './data';
import { REPLACED_BY } from './blocks';
import { CUTS, isCutId, normalizeTurns } from './geometry';
import { cloneBlock, emptyBlock, leafBlock, rotateBlock, type Block, type Board } from './model';
import { resample } from './placement';
import { blocksFrom, coordOf, type Pattern, type PatternBlocks } from './pattern';

export const STATE_KEY = 'quilt-builder:v3';
/*
 * Which palette sections are open. Kept out of the saved design: it is a
 * preference about the window, not part of the quilt.
 */
export const PANELS_KEY = 'quilt-builder:panels';

export type Panels = Record<string, boolean>;

export const parsePanels = (raw: unknown, defaults: Panels): Panels => {
	if (typeof raw !== 'object' || raw === null) return { ...defaults };
	const saved = raw as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(defaults).map(([id, fallback]) => [
			id,
			typeof saved[id] === 'boolean' ? saved[id] : fallback
		])
	);
};
/** Read once when v3 is absent, so existing designs survive the upgrade. */
export const LEGACY_STATE_KEY = 'quilt-builder:v2';

/** Compositions the palette offers. Anything else in a save is rejected. */
const DIVISIONS = [1, 2, 4];

/** Guard against a corrupt save claiming an enormous pattern. */
const MAX_PATTERN_BLOCKS = 256;

export interface SavedState {
	name: string;
	sizeId: string;
	/** Only meaningful when sizeId is 'custom'. */
	customWidth: number;
	customHeight: number;
	blockSize: number;
	materials: Material[];
	selectedMaterialId: string | null;
	patterns: Pattern[];
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

/*
 * Three shapes have to read: a pattern's sparse map, the single `block` a
 * saved block carried before patterns existed, and the v2 layout stored
 * inline. The last two become a one-by-one pattern.
 */
const sanitizePatternBlocks = (raw: Loose, known: ReadonlySet<string>): PatternBlocks => {
	if (typeof raw.blocks !== 'object' || raw.blocks === null) {
		return blocksFrom([
			{ x: 0, y: 0, block: sanitizeBlock('block' in raw ? raw.block : raw, known) }
		]);
	}
	const entries = Object.entries(raw.blocks as Record<string, unknown>)
		.filter(([key]) => /^-?\d+,-?\d+$/.test(key))
		.slice(0, MAX_PATTERN_BLOCKS)
		.map(([key, value]) => {
			const [x, y] = key.split(',').map(Number);
			return { x, y, block: sanitizeBlock(value, known) };
		});
	return entries.length ? blocksFrom(entries) : { [coordOf(0, 0)]: emptyBlock() };
};

const sanitizePatterns = (raw: unknown, known: ReadonlySet<string>): Pattern[] => {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		if (typeof item !== 'object' || item === null) return [];
		const p = item as Loose;
		if (typeof p.id !== 'string' || typeof p.name !== 'string') return [];
		return [{ id: p.id, name: p.name, blocks: sanitizePatternBlocks(p, known) }];
	});
};

/** Finished dimensions for any size id, custom included. */
export const sizeInches = (
	sizeId: string,
	customWidth: number,
	customHeight: number
): { width: number; height: number } => {
	if (sizeId === CUSTOM_SIZE_ID) {
		return { width: clampCustomInches(customWidth), height: clampCustomInches(customHeight) };
	}
	const size = QUILT_SIZE_BY_ID[sizeId] ?? QUILT_SIZE_BY_ID[DEFAULT_SIZE_ID];
	return { width: size.width, height: size.height };
};

export const gridDims = (
	sizeId: string,
	blockSize: number,
	customWidth = 0,
	customHeight = 0
): { rows: number; cols: number } => {
	const { width, height } = sizeInches(sizeId, customWidth, customHeight);
	return {
		rows: Math.max(1, Math.floor(height / blockSize)),
		cols: Math.max(1, Math.floor(width / blockSize))
	};
};

export const parseSavedState = (raw: unknown): SavedState | null => {
	if (typeof raw !== 'object' || raw === null) return null;
	const s = raw as Partial<Record<keyof SavedState, unknown>> & { customBlocks?: unknown };
	const rawSizeId = typeof s.sizeId === 'string' ? (LEGACY_SIZE_IDS[s.sizeId] ?? s.sizeId) : '';
	const sizeId =
		rawSizeId === CUSTOM_SIZE_ID || rawSizeId in QUILT_SIZE_BY_ID ? rawSizeId : DEFAULT_SIZE_ID;
	const fallback = QUILT_SIZE_BY_ID[DEFAULT_SIZE_ID];
	const customWidth = clampCustomInches(
		typeof s.customWidth === 'number' ? s.customWidth : fallback.width
	);
	const customHeight = clampCustomInches(
		typeof s.customHeight === 'number' ? s.customHeight : fallback.height
	);
	const blockSize =
		typeof s.blockSize === 'number' && BLOCK_SIZES.includes(s.blockSize)
			? s.blockSize
			: DEFAULT_BLOCK_SIZE;
	const materials = sanitizeMaterials(s.materials);
	const known = new Set(materials.map((m) => m.id));
	const { rows, cols } = gridDims(sizeId, blockSize, customWidth, customHeight);
	return {
		name: typeof s.name === 'string' ? s.name : '',
		sizeId,
		customWidth,
		customHeight,
		blockSize,
		materials,
		selectedMaterialId:
			typeof s.selectedMaterialId === 'string' && known.has(s.selectedMaterialId)
				? s.selectedMaterialId
				: null,
		// Saves written before patterns existed keep their blocks under `customBlocks`.
		patterns: sanitizePatterns(s.patterns ?? s.customBlocks, known),
		cells: sanitizeCells(s.cells, rows * cols, known)
	};
};
