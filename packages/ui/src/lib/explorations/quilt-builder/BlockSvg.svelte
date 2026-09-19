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

	let { block, fills, stroke = 'rgba(0, 0, 0, 0.18)', strokeWidth = 1 }: Props = $props();

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
	{#each seams as seam, i (i)}
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
