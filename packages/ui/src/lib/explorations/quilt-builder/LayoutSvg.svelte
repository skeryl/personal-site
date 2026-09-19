<script lang="ts">
	import { rotatedSlots, toPolygonPoints } from './geometry';

	interface Props {
		layout: string;
		rotation?: number;
		/** One fill per slot; missing entries render white. */
		fills: readonly (string | null | undefined)[];
		stroke?: string;
		strokeWidth?: number;
	}

	let {
		layout,
		rotation = 0,
		fills,
		stroke = 'rgba(0, 0, 0, 0.18)',
		strokeWidth = 1
	}: Props = $props();

	const VB = 100;
</script>

<svg viewBox="0 0 {VB} {VB}" aria-hidden="true">
	{#each rotatedSlots(layout, rotation) as slot, i (i)}
		<polygon
			points={toPolygonPoints(slot.points, VB)}
			fill={fills[i] ?? '#ffffff'}
			{stroke}
			stroke-width={strokeWidth}
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
