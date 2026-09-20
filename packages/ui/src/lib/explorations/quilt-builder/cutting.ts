/*
 * Cutting list: real-world counts per fabric.
 *
 * Every piece starts from one cut blank square (finished size + seam
 * allowance both sides). Rectangles are the blank cut in half; triangles are
 * the blank cut on one or both diagonals. Blank size is a fraction of the
 * block, so a pinwheel's small triangles come from half-block blanks.
 */

import { DEFAULT_SEAM_INCHES, fmtInches, type Material } from './data';
import { type ShapeKind } from './geometry';
import { flatten, type Block } from './model';

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
		flatten(block).forEach(({ fabric, frac, kind }) => {
			if (!fabric) return;
			const byFrac = tally.get(fabric) ?? new Map<number, Map<ShapeKind, number>>();
			const byKind = byFrac.get(frac) ?? new Map<ShapeKind, number>();
			byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
			byFrac.set(frac, byKind);
			tally.set(fabric, byFrac);
		});
	});

	return materials
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
