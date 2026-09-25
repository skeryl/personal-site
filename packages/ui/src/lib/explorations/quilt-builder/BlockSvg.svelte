<script lang="ts">
	import { toPolygonPoints } from './geometry';
	import { flatten, leafRects, type Block } from './model';

	interface Props {
		block: Block;
		/** One fill per flattened piece, in reading order; missing entries render white. */
		fills: readonly (string | null | undefined)[];
		stroke?: string;
		strokeWidth?: number;
	}

	/*
	 * Undrawn by default. Outlining every piece laid a darker edge of its own
	 * colour round each shape, which read as the block having been drawn with
	 * a pen rather than cut from cloth — the pieces meet, and that is the
	 * whole of the seam.
	 */
	let { block, fills, stroke = 'none', strokeWidth = 0 }: Props = $props();

	const outlined = $derived(stroke !== 'none' && strokeWidth > 0);

	const VB = 100;

	const pieces = $derived(flatten(block));
	/** Seams between composed children, drawn heavier than seams within one. */
	const seams = $derived(leafRects(block));
</script>

<svg viewBox="0 0 {VB} {VB}" aria-hidden="true">
	{#each pieces as piece, i (piece.key)}
		<polygon
			points={toPolygonPoints(piece.points, VB)}
			fill={fills[i] ?? '#ffffff'}
			{stroke}
			stroke-width={strokeWidth}
			vector-effect="non-scaling-stroke"
		/>
	{/each}
	{#each outlined ? seams : [] as seam, i (i)}
		<rect
			x={seam.x * VB}
			y={seam.y * VB}
			width={seam.w * VB}
			height={seam.h * VB}
			fill="none"
			{stroke}
			stroke-width={strokeWidth * 1.75}
			vector-effect="non-scaling-stroke"
		/>
	{/each}
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
