/*
 * Cutting list: real-world counts per fabric.
 *
 * Every piece starts from one cut blank square (finished size + seam
 * allowance both sides). Rectangles are the blank cut in half; triangles are
 * the blank cut on one or both diagonals. Blank size is a fraction of the
 * block, so a pinwheel's small triangles come from half-block blanks.
 */

import { DEFAULT_SEAM_INCHES, fmtInches, fmtLengthPair, type Material } from './data';
import { type ShapeKind } from './geometry';
import { flatten, type Block } from './model';

/*
 * Fabric not chosen yet. A shape can be placed before it has any colour, and
 * those pieces still cost cloth — so they are bought and cut like any other
 * fabric, under the grey they are drawn in, rather than left off the list.
 */
export const UNSET_MATERIAL: Material = {
	id: '\u0000unset',
	name: 'Unset',
	hex: '#d9d9d9'
};

/** Pieces cut from one blank, per kind. */
export const CUT_YIELD: Record<ShapeKind, number> = { square: 1, rect: 2, hst: 2, qst: 4 };

const KIND_ORDER: readonly ShapeKind[] = ['square', 'rect', 'hst', 'qst'];

export const KIND_NOUN: Record<ShapeKind, string> = {
	square: 'square',
	rect: 'rectangle',
	hst: 'half square triangle',
	qst: 'quarter square triangle'
};

export const KIND_CUT: Record<ShapeKind, string> = {
	square: 'as is',
	rect: 'cut in half',
	hst: 'cut corner to corner',
	qst: 'cut on both diagonals'
};

/** The cut whose first piece draws this kind, for icons. */
export const KIND_ICON_CUT: Record<ShapeKind, string> = {
	square: 'square',
	rect: 'rectangle',
	hst: 'hst',
	qst: 'hourglass'
};

export const blankInches = (blockSize: number, frac: number, seam = DEFAULT_SEAM_INCHES): number =>
	blockSize * frac + 2 * seam;

export interface CutKind {
	kind: ShapeKind;
	pieces: number;
	blanks: number;
}

export interface CutRow {
	/** Blank size as a fraction of the block. */
	frac: number;
	inches: number;
	label: string;
	blanks: number;
	kinds: CutKind[];
}

export interface CutGroup {
	material: Material;
	rows: CutRow[];
	totalBlanks: number;
}

const plural = (n: number, noun: string): string => (n === 1 ? noun : `${noun}s`);

export const cuttingListFor = (
	blocks: readonly Block[],
	materials: readonly Material[],
	blockSize: number,
	seam = DEFAULT_SEAM_INCHES
): CutGroup[] => {
	// material -> frac -> kind -> piece count
	const tally = new Map<string, Map<number, Map<ShapeKind, number>>>();
	blocks.forEach((block) => {
		// `frac` arrives already scaled by the composition, so a pinwheel inside
		// a 2x2 grid tallies at half the blank size of a plain one.
		flatten(block).forEach(({ fabric, frac, kind, shaped }) => {
			// Blank space costs nothing; a placed shape does, coloured or not.
			if (!fabric && !shaped) return;
			const id = fabric ?? UNSET_MATERIAL.id;
			const byFrac = tally.get(id) ?? new Map<number, Map<ShapeKind, number>>();
			const byKind = byFrac.get(frac) ?? new Map<ShapeKind, number>();
			byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
			byFrac.set(frac, byKind);
			tally.set(id, byFrac);
		});
	});

	// Unset comes last, after every fabric that has been chosen.
	return [...materials, UNSET_MATERIAL]
		.filter((material) => tally.has(material.id))
		.map((material) => {
			const byFrac = tally.get(material.id)!;
			const rows = [...byFrac.entries()]
				.sort(([a], [b]) => b - a)
				.map(([frac, byKind]) => {
					const kinds = KIND_ORDER.filter((kind) => byKind.has(kind)).map((kind) => ({
						kind,
						pieces: byKind.get(kind)!,
						blanks: Math.ceil(byKind.get(kind)! / CUT_YIELD[kind])
					}));
					const inches = blankInches(blockSize, frac, seam);
					return {
						frac,
						inches,
						label: `${fmtInches(inches)}”`,
						blanks: kinds.reduce((sum, k) => sum + k.blanks, 0),
						kinds
					};
				});
			return { material, rows, totalBlanks: rows.reduce((sum, row) => sum + row.blanks, 0) };
		});
};

export interface ExportInfo {
	name: string;
	sizeName: string;
	widthIn: number;
	heightIn: number;
	blockSize: number;
	rows: number;
	cols: number;
}

export const materialsListText = (info: ExportInfo, groups: readonly CutGroup[]): string => {
	const lines = [
		`Quilt Builder — ${info.name.trim() || 'Untitled'}`,
		`${info.sizeName} (${info.widthIn}” x ${info.heightIn}”), ${info.blockSize}” blocks, ${info.cols} x ${info.rows} blocks`,
		''
	];
	if (!groups.length) lines.push('Nothing placed yet.');
	groups.forEach((group) => {
		lines.push(`${group.material.name.trim()} (${group.material.hex.toUpperCase()})`);
		group.rows.forEach((row) => {
			lines.push(`  ${row.label} squares: ${row.blanks}`);
			row.kinds.forEach((k) => {
				lines.push(
					`    ${k.blanks} ${plural(k.blanks, 'square')} ${KIND_CUT[k.kind]} -> ${k.pieces} ${plural(k.pieces, KIND_NOUN[k.kind])}`
				);
			});
		});
		lines.push('');
	});
	return lines.join('\n');
};

/*
 * The materials list, as the design lays it out.
 *
 * The cutting list above answers "how many blanks", which is what the quilt
 * costs in fabric. These two answer what you actually do at the table: what
 * shapes to cut out, and what units to sew from them.
 */

/** One shape to cut, at the size it is cut to. */
export interface CutPiece {
	material: Material;
	kind: ShapeKind;
	/** Cut size in inches, seam allowance included. */
	w: number;
	h: number;
	count: number;
	label: string;
}

const dims = fmtLengthPair;

/*
 * A blank is a square, except for a rectangle, which is the square cut in
 * half — so that is the shape you lay on the fabric, and there are two of
 * them per blank. Triangles are sub-cut after piecing, so what you cut is
 * still the square.
 *
 * Shapes of the same size in the same fabric are one entry however they go on
 * to be used: at the cutting table they are the same cut, and listing them
 * apart would ask for the same square twice.
 */
export const cutPiecesFor = (groups: readonly CutGroup[], metric = false): CutPiece[] => {
	const merged = new Map<string, CutPiece>();
	groups.forEach((group) =>
		group.rows.forEach((row) =>
			row.kinds.forEach((k) => {
				const rect = k.kind === 'rect';
				const w = rect ? row.inches / 2 : row.inches;
				const h = row.inches;
				const count = rect ? k.pieces : k.blanks;
				const key = `${group.material.id}|${w}|${h}`;
				const seen = merged.get(key);
				if (seen) seen.count += count;
				else merged.set(key, { material: group.material, kind: k.kind, w, h, count, label: '' });
			})
		)
	);
	return [...merged.values()].map((piece) => ({
		...piece,
		label: `${plural(piece.count, piece.kind === 'rect' ? 'rectangle' : 'square')} - ${dims(piece.w, piece.h, metric)} (${piece.count})`
	}));
};
