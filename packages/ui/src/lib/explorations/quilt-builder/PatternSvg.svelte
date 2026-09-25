<script lang="ts">
	import BlockSvg from './BlockSvg.svelte';
	import { flatten } from './model';
	import { boundsOf, cellsOf, coordOf, type PatternBlocks } from './pattern';

	interface Props {
		blocks: PatternBlocks;
		/*
		 * Fill for one piece. The role comes with the fabric so a pattern that
		 * has not been coloured in yet can still be drawn in the greys the
		 * shapes beside it are drawn in, rather than in nothing at all.
		 */
		fillOf: (fabric: string | null, role: number) => string;
	}

	let { blocks, fillOf }: Props = $props();

	const bounds = $derived(boundsOf(blocks));
	const cells = $derived(cellsOf(blocks));

	/*
	 * Fit inside the square the icon is given rather than filling its width: a
	 * pattern taller than it is wide would otherwise run to several times the
	 * button's height and dwarf every other icon in the list.
	 *
	 * Sized from the width alone, and the aspect ratio does the rest. Asking
	 * for a percentage of the height instead would resolve against nothing,
	 * since the button's own height comes from its aspect ratio, and the
	 * content would end up driving the button taller.
	 */
	const cols = $derived(Math.max(bounds.w, 1));
	const rows = $derived(Math.max(bounds.h, 1));
	const width = $derived(cols >= rows ? 100 : (100 * cols) / rows);
</script>

<!-- Sparse on purpose: a coordinate with no block leaves a hole in the grid. -->
<div
	class="pattern"
	style="--cols: {cols}; --rows: {rows}; aspect-ratio: {cols} / {rows}; width: {width}%"
>
	{#each cells as cell (coordOf(cell.x, cell.y))}
		<div class="at" style="grid-column: {cell.x + 1}; grid-row: {cell.y + 1}">
			<BlockSvg
				block={cell.block}
				fills={flatten(cell.block).map((p) => fillOf(p.fabric, p.role))}
			/>
		</div>
	{/each}
</div>

<style>
	.pattern {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		grid-template-rows: repeat(var(--rows), 1fr);
	}
	.at {
		min-width: 0;
		min-height: 0;
	}
</style>
