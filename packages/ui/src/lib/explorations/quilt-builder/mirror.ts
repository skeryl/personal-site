/*
 * Symmetry: reflecting cells across draggable axes.
 *
 * Axis positions are in half-cell units, so a mirror line can sit on a grid
 * line or through the middle of a row/column. Pieces reflect properly (a
 * triangle mirrors to its mirror image, not a copy).
 */

import { rotatedSlots, type Point } from './geometry';
import {
	cellIndex,
	cloneCell,
	colOf,
	emptyCell,
	inBounds,
	isEmpty,
	rowOf,
	type Cell
} from './model';

export type Axis = 'v' | 'h';

export interface Symmetry {
	v: boolean;
	h: boolean;
	/** Half-cell units from the top/left edge. */
	axisV: number;
	axisH: number;
}

const mirrorPoint = ([x, y]: Point, axis: Axis): Point => (axis === 'v' ? [1 - x, y] : [x, 1 - y]);

const polyKey = (points: readonly Point[]): string =>
	points
		.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`)
		.sort()
		.join('|');

const multisetKey = (keys: readonly string[]): string => [...keys].sort().join(';');

/**
 * Reflect a cell's geometry across an axis by finding the rotation of the
 * same layout whose polygons match the mirrored ones, then mapping each
 * slot's fabric across. Falls back to an unmirrored copy for a layout with
 * no reflection-symmetric rotation (none of the current layouts hit this).
 */
export const mirrorCellGeom = (cell: Cell, axis: Axis): Cell => {
	if (isEmpty(cell)) return emptyCell();
	const mirroredKeys = rotatedSlots(cell.layout, cell.rotation).map((slot) =>
		polyKey(slot.points.map((p) => mirrorPoint(p, axis)))
	);
	const mirroredMultiset = multisetKey(mirroredKeys);

	const match = [0, 1, 2, 3]
		.map((rotation) => ({
			rotation,
			keys: rotatedSlots(cell.layout, rotation).map((slot) => polyKey(slot.points))
		}))
		.find(({ keys }) => multisetKey(keys) === mirroredMultiset);
	if (!match) return cloneCell(cell);

	const taken = new Set<number>();
	const slots = match.keys.map((key) => {
		const source = mirroredKeys.findIndex((mk, i) => mk === key && !taken.has(i));
		taken.add(source);
		return cell.slots[source];
	});
	return { layout: cell.layout, rotation: match.rotation, slots };
};

/**
 * Mirrored copies of a cell for every enabled axis, keyed by grid index.
 * Cells whose mirror falls off the grid or onto themselves are skipped, so a
 * piece sitting on the axis line stays as drawn.
 */
export const mirrorTargets = (index: number, cell: Cell, symmetry: Symmetry): Map<number, Cell> => {
	const row = rowOf(index);
	const col = colOf(index);
	const mirrorCol = symmetry.v ? symmetry.axisV - col - 1 : null;
	const mirrorRow = symmetry.h ? symmetry.axisH - row - 1 : null;

	type Candidate = { row: number; col: number; mirrored: Cell };
	const candidates: Candidate[] = [
		...(mirrorCol !== null ? [{ row, col: mirrorCol, mirrored: mirrorCellGeom(cell, 'v') }] : []),
		...(mirrorRow !== null ? [{ row: mirrorRow, col, mirrored: mirrorCellGeom(cell, 'h') }] : []),
		...(mirrorCol !== null && mirrorRow !== null
			? [
					{
						row: mirrorRow,
						col: mirrorCol,
						mirrored: mirrorCellGeom(mirrorCellGeom(cell, 'v'), 'h')
					}
				]
			: [])
	];

	return candidates.reduce((out, candidate) => {
		const target = cellIndex(candidate.row, candidate.col);
		if (inBounds(candidate.row, candidate.col) && target !== index && !out.has(target)) {
			out.set(target, candidate.mirrored);
		}
		return out;
	}, new Map<number, Cell>());
};

/** A placement plus its mirrors as one sparse update set. */
export const withMirrors = (index: number, cell: Cell, symmetry: Symmetry): Map<number, Cell> =>
	new Map([[index, cell], ...mirrorTargets(index, cell, symmetry)]);
