<script lang="ts">
	import BlockSvg from './BlockSvg.svelte';
	import { flatten } from './model';
	import { boundsOf, cellsOf, coordOf, type PatternBlocks } from './pattern';

	interface Props {
		blocks: PatternBlocks;
		/** Fill for one piece's fabric; lets icons render by role or by colour. */
		fillOf: (fabric: string | null) => string;
	}

	let { blocks, fillOf }: Props = $props();

	const bounds = $derived(boundsOf(blocks));
	const cells = $derived(cellsOf(blocks));
</script>

<!-- Sparse on purpose: a coordinate with no block leaves a hole in the grid. -->
<div
	class="pattern"
	style="--cols: {Math.max(bounds.w, 1)}; --rows: {Math.max(bounds.h, 1)}; aspect-ratio: {Math.max(
		bounds.w,
		1
	)} / {Math.max(bounds.h, 1)}"
>
	{#each cells as cell (coordOf(cell.x, cell.y))}
		<div class="slot" style="grid-column: {cell.x + 1}; grid-row: {cell.y + 1}">
			<BlockSvg block={cell.block} fills={flatten(cell.block).map((p) => fillOf(p.fabric))} />
		</div>
	{/each}
</div>

<style>
	.pattern {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		grid-template-rows: repeat(var(--rows), 1fr);
		width: 100%;
	}
	.slot {
		min-width: 0;
		min-height: 0;
	}
</style>
