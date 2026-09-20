/*
 * Placement: what one click does to a block. Shared by the editing path and
 * the ghost preview so what you see is what you get.
 *
 * Painting works on the LEAF under the cursor, so a click inside a 4x4
 * composition recuts one sixteenth of the block. Stamping replaces the whole
 * block, because a block type carries its own composition.
 */

import { centroidOf, pieceAt, rotatedPieces, type Point } from './geometry';
import type { PatternBlocks } from './pattern';
import {
	blocksEqual,
	cloneBlock,
	emptyBlock,
	leafAt,
	localPoint,
	mapLeavesWithRect,
	sameStructure,
	setAt,
	subtreeAt,
	walkLeaves,
	UNIT_RECT,
	type Block,
	type LeafBlock,
	type MaterialId,
	type Rect
} from './model';

export type Pending =
	/** Paint the clicked piece only, recutting its leaf if the cut differs. */
	| { mode: 'paint'; cut: string; rotation: number }
	/** Stamp a block type: role-0 pieces take the fabric, the rest keep what was under them. */
	| { mode: 'stamp'; block: Block }
	/** Stamp a saved pattern exactly as captured; may cover several blocks. */
	| { mode: 'pattern'; blocks: PatternBlocks };

/** Everything a single-block placement can be. Patterns route through the store. */
export type BlockPending = Exclude<Pending, { mode: 'pattern' }>;

/** The fabric under a point in block space. */
export const fabricAt = (block: Block, point: Point): MaterialId | null => {
	const { leaf, rect } = leafAt(block, point);
	return leaf.fabrics[pieceAt(leaf.cut, leaf.rotation, localPoint(rect, point))] ?? null;
};

/** Block-space centroid of a piece belonging to a leaf at `rect`. */
const centroidIn = (
	rect: { x: number; y: number; w: number; h: number },
	points: Point[]
): Point => {
	const [cx, cy] = centroidOf(points);
	return [rect.x + cx * rect.w, rect.y + cy * rect.h];
};

/*
 * Re-cut a block's current fabric into a new shape: each new piece takes the
 * colour under its centroid. Placing a triangle over a solid square keeps the
 * square's colour everywhere the triangle doesn't cover.
 */
export const resample = (target: Block, source: Block): Block =>
	mapLeavesWithRect(target, (leaf, rect) => ({
		...leaf,
		fabrics: rotatedPieces(leaf.cut, leaf.rotation).map((shape) =>
			fabricAt(source, centroidIn(rect, shape.points))
		)
	}));

/*
 * Resample, except role-0 pieces take the selected fabric. `into` is where in
 * the source's block space the target is landing, so a block stamped into one
 * quarter inherits the colour that was under THAT quarter.
 */
const stampInto = (
	target: Block,
	source: Block,
	materialId: MaterialId | null,
	into: Rect = UNIT_RECT
): Block =>
	mapLeavesWithRect(
		target,
		(leaf, rect) => {
			const offset = leaf.roleOffset ?? 0;
			return {
				...leaf,
				fabrics: rotatedPieces(leaf.cut, leaf.rotation).map((shape) =>
					shape.role + offset === 0 ? materialId : fabricAt(source, centroidIn(rect, shape.points))
				)
			};
		},
		into
	);

/** One leaf recut to a new shape, inheriting colour by centroid. */
export const recutLeaf = (leaf: LeafBlock, cut: string, rotation: number): LeafBlock => ({
	kind: 'leaf',
	cut,
	rotation,
	fabrics: rotatedPieces(cut, rotation).map(
		(shape) => leaf.fabrics[pieceAt(leaf.cut, leaf.rotation, centroidOf(shape.points))] ?? null
	)
});

/*
 * Mark a leaf as something somebody put here. A plain square carries no shape
 * of its own, so without this a square placed before any colour was chosen
 * would be indistinguishable from the blank it landed on, and would neither
 * show as unset nor be listed in Attributes.
 */
const asShape = (leaf: LeafBlock): LeafBlock =>
	leaf.roleOffset === undefined ? { ...leaf, roleOffset: 0 } : leaf;

/** Set the fabric of just the piece under `point`, leaving the shape alone. */
const paintPiece = (block: Block, point: Point, materialId: MaterialId | null): Block => {
	const { leaf, rect, path } = leafAt(block, point);
	const fabrics = [...leaf.fabrics];
	fabrics[pieceAt(leaf.cut, leaf.rotation, localPoint(rect, point))] = materialId;
	return setAt(block, path, asShape({ ...leaf, fabrics }));
};

export const buildPlacement = (
	block: Block,
	point: Point,
	pending: BlockPending,
	/** Null places the shape with no fabric: its pieces read as unset. */
	materialId: MaterialId | null
): Block => {
	const { leaf, rect, path } = leafAt(block, point);

	/*
	 * A block type lands in the sub-block under the cursor, the same way a cut
	 * does: stamping a pinwheel into one quarter of a 2x2 block fills that
	 * quarter, not the whole 8" block.
	 */
	if (pending.mode === 'stamp') {
		/*
		 * If this spot already holds the pending shape, at whatever depth,
		 * recolour the piece under the cursor instead of nesting another copy
		 * inside it.
		 */
		for (let depth = path.length; depth >= 0; depth--) {
			if (sameStructure(subtreeAt(block, path.slice(0, depth)), pending.block)) {
				return paintPiece(block, point, materialId);
			}
		}
		return setAt(block, path, stampInto(cloneBlock(pending.block), block, materialId, rect));
	}

	if (leaf.cut === pending.cut && leaf.rotation === pending.rotation) {
		return paintPiece(block, point, materialId);
	}
	const next: LeafBlock = recutLeaf(leaf, pending.cut, pending.rotation);
	next.fabrics[pieceAt(next.cut, next.rotation, localPoint(rect, point))] = materialId;
	return setAt(block, path, asShape(next));
};

/*
 * The block after erasing the piece under `point`.
 *
 * There is no early exit on an uncoloured piece: a shape placed before any
 * colour was chosen has nothing to clear but is still there to remove. What
 * counts as a change is left to the comparison at the end.
 */
export const buildErase = (block: Block, point: Point): Block | null => {
	const { leaf, rect, path } = leafAt(block, point);
	const index = pieceAt(leaf.cut, leaf.rotation, localPoint(rect, point));
	const fabrics = leaf.fabrics.map((f, i) => (i === index ? null : f));
	const next = fabrics.every((f) => f === null)
		? (emptyBlock() as LeafBlock)
		: { ...leaf, fabrics };
	const result = setAt(block, path, next);
	return blocksEqual(result, block) ? null : result;
};

/** The point keyboard activation should target. */
export const keyboardPoint = (pending: Pending): Point =>
	pending.mode === 'paint'
		? centroidOf(rotatedPieces(pending.cut, pending.rotation)[0].points)
		: [0.5, 0.5];

/** The first piece holding fabric, in reading order, as a block-space point. */
export const firstFilledPoint = (block: Block): Point | null => {
	for (const { leaf, rect } of walkLeaves(block)) {
		const index = leaf.fabrics.findIndex((f) => f !== null);
		if (index !== -1) {
			return centroidIn(rect, rotatedPieces(leaf.cut, leaf.rotation)[index].points);
		}
	}
	return null;
};
