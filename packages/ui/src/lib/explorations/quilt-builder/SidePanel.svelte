<script lang="ts">
	/*
	 * The palette, in the order the design lays it out: block size, block grid,
	 * block type, block patterns, attributes.
	 *
	 * There are no Block/Piece tabs. The difference between them was never
	 * about which palette you were looking at, it was what a click does: a cut
	 * recuts the piece under the cursor, a block type stamps the whole square.
	 * That is a property of the thing you picked, so the list can be flat and
	 * the store works it out.
	 */

	import { BLOCK_SIZES, fmtInches } from './data';
	import { BLOCK_TYPES } from './blocks';
	import { PIECE_CUTS, ROLE_FILL } from './geometry';
	import { flatten, leafBlock, rotateBlock, type Block } from './model';
	import { boundsOf, rotatePattern } from './pattern';
	import AttributesPanel from './AttributesPanel.svelte';
	import BlockSvg from './BlockSvg.svelte';
	import PatternSvg from './PatternSvg.svelte';
	import { DIVISIONS, type QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	/** Icon fills: dark for the fabric role, light for background, white for empty. */
	const roleFills = (block: Block): string[] =>
		flatten(block).map((p) => ROLE_FILL[p.role] ?? '#ffffff');

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#fff') : '#fff';

	/*
	 * Everything that fills exactly one square: the cuts, which paint, and the
	 * block types, which stamp. Rotated once per rotation change so the flatten
	 * cache keeps hitting.
	 */
	const cutEntries = $derived(
		PIECE_CUTS.map((cut) => ({ cut, block: leafBlock(cut.id, store.rotation) }))
	);
	const blockEntries = $derived(
		BLOCK_TYPES.map((type) => ({ type, block: rotateBlock(type.block, store.rotation) }))
	);
	const patternEntries = $derived(
		store.patterns.map((saved) => {
			const blocks = rotatePattern(saved.blocks, store.rotation);
			const { w, h } = boundsOf(blocks);
			return { saved, blocks, size: w === 1 && h === 1 ? null : `${w}×${h}` };
		})
	);

	const selectedCount = $derived(store.selection.length);
	const capturableCount = $derived(store.capturable.length);
</script>

<aside class="side">
	<label class="setting">
		<span class="label">Block size:</span>
		<select
			class="select"
			value={store.blockSize}
			onchange={(e) => store.setBlockSize(Number(e.currentTarget.value))}
		>
			{#each BLOCK_SIZES as size (size)}
				<option value={size}>{size}”</option>
			{/each}
		</select>
	</label>

	<details class="group" data-panel="grid" bind:open={store.panels.grid}>
		<summary class="label section">Block grid <kbd>G</kbd></summary>
		<div class="composition" role="group" aria-label="Block grid">
			{#each DIVISIONS as division (division)}
				{@const label = division === 1 ? 'One piece' : `${division} by ${division}`}
				{@const weight = store.activeDivision === division ? 1.5 : 1}
				<button
					class="chip"
					class:active={store.activeDivision === division}
					aria-pressed={store.activeDivision === division}
					aria-label={label}
					title={`${label}, ${fmtInches(store.blockSize / division)}” pieces`}
					onclick={() => store.setGrid(division)}
				>
					<!--
						The tile IS the block, divided by dashed seams. The viewBox is
						the design's own 102 x 103.378, and the panel renders it at
						exactly that size, so stroke and dash values are literal pixels.
						Seams run edge to edge, as they do in the design.

						The frame is drawn in the svg rather than as a CSS border
						because browsers round border-width to whole pixels, which
						flattened the chosen tile's 1.5px rule back to 1px.
					-->
					<svg
						class="chip-grid"
						viewBox="0 0 102 103.378"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<rect
							class="chip-frame"
							x={weight / 2}
							y={weight / 2}
							width={102 - weight}
							height={103.378 - weight}
							stroke-width={weight}
						/>
						{#each { length: division - 1 } as _, i (i)}
							{@const x = ((i + 1) * 102) / division}
							{@const y = ((i + 1) * 103.378) / division}
							<line x1={x} y1="0" x2={x} y2="103.378" stroke-width={weight} />
							<line x1="0" y1={y} x2="102" y2={y} stroke-width={weight} />
						{/each}
					</svg>
					<span class="chip-label">
						{division === 1 ? '(1)' : `(${division}X${division})`}
					</span>
				</button>
			{/each}
		</div>

		<p class="hint">
			{#if selectedCount}
				{selectedCount === 1
					? '1 block selected'
					: `${selectedCount} blocks selected`}{store.selectedDivision === 0 ? ', mixed grids' : ''}
			{:else if store.tool === 'grid'}
				Click or drag on the quilt to paint this grid.
			{:else if store.tool === 'place'}
				Pieces you place land at this grid. Hold alt to cover a whole square.
			{:else}
				Pick a grid to paint it on, or
				<button class="link" onclick={() => (store.tool = 'mouse')}>select</button>
				blocks to change theirs.
			{/if}
		</p>
	</details>

	<details class="group" data-panel="type" bind:open={store.panels.type}>
		<summary class="label section">Block type</summary>
		<div class="types">
			{#each cutEntries as entry (entry.cut.id)}
				<button
					class="type"
					class:active={store.tab === 'piece' && store.pieceId === entry.cut.id}
					aria-pressed={store.tab === 'piece' && store.pieceId === entry.cut.id}
					aria-label={entry.cut.name}
					title={entry.cut.name}
					onclick={() => store.pickPiece(entry.cut.id)}
				>
					<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
				</button>
			{/each}
			{#each blockEntries as entry (entry.type.id)}
				<button
					class="type"
					class:active={store.tab === 'block' && store.blockId === entry.type.id}
					aria-pressed={store.tab === 'block' && store.blockId === entry.type.id}
					aria-label={entry.type.name}
					title={entry.type.name}
					onclick={() => store.pickBlock(entry.type.id)}
				>
					<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
				</button>
			{/each}
		</div>
	</details>

	<details class="group" data-panel="patterns" bind:open={store.panels.patterns}>
		<summary class="label section">Block patterns</summary>
		{#if patternEntries.length}
			<div class="types">
				{#each patternEntries as entry (entry.saved.id)}
					<div class="saved">
						<button
							class="type"
							class:active={store.selectedPattern?.id === entry.saved.id}
							aria-pressed={store.selectedPattern?.id === entry.saved.id}
							aria-label={entry.saved.name}
							title={entry.saved.name}
							onclick={() => store.pickPattern(entry.saved.id)}
						>
							<PatternSvg blocks={entry.blocks} fillOf={hexOf} />
						</button>
						<span class="saved-name">
							{entry.saved.name}{#if entry.size}<span class="saved-size">{entry.size}</span>{/if}
						</span>
						<button
							class="saved-remove"
							aria-label={`Remove ${entry.saved.name}`}
							title="Remove"
							onclick={() => store.deletePattern(entry.saved.id)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
		{/if}
		<button class="add-new" disabled={!capturableCount} onclick={() => store.capturePattern()}>
			+ Add selection as pattern
		</button>
		{#if !capturableCount}
			<p class="hint">
				{selectedCount
					? 'Those blocks are empty; fill one to save it.'
					: 'Select filled blocks on the quilt to save them as a pattern.'}
			</p>
		{/if}
	</details>

	<AttributesPanel {store} />
</aside>

<style>
	.side {
		display: flex;
		flex-direction: column;
		background: var(--qb-panel);
		border-right: 1px solid var(--qb-line);
		font-family: var(--qb-mono);
		/* Fills the shell and scrolls itself, rather than growing the page. */
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.group {
		border-top: 1px solid var(--qb-line);
		padding-bottom: 0.9rem;
	}
	/*
	 * Native disclosures, so keyboard and screen readers get the behaviour for
	 * free. The marker is replaced with one that does not shift the label.
	 */
	summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::before {
		content: '';
		width: 0;
		height: 0;
		border-left: 4px solid currentColor;
		border-top: 3.5px solid transparent;
		border-bottom: 3.5px solid transparent;
		transition: transform 120ms ease;
	}
	details[open] > summary::before {
		transform: rotate(90deg);
	}
	summary:hover {
		color: var(--color-text-strong);
	}

	.setting {
		display: flex;
		align-items: baseline;
		gap: 1.3rem;
		padding: 2.3rem var(--qb-pad) 1.6rem;
	}
	.setting .label {
		white-space: nowrap;
	}
	.label {
		/* 12px uppercase, in black: the design's section heading. */
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}
	.section {
		padding: 1.5rem var(--qb-pad) 0.55rem;
	}
	.section kbd {
		font: inherit;
		font-size: 0.85em;
		opacity: 0.55;
		margin-left: 0.25rem;
	}
	.select {
		font: inherit;
		font-size: 1.05rem;
		color: var(--color-text-strong);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--qb-line);
		padding: 0.15rem 0;
		cursor: pointer;
	}

	.composition {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		padding: 0 var(--qb-pad);
	}
	.chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		font: inherit;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	/* The square itself carries the state, so there is no button chrome. */
	.chip-grid {
		display: block;
		width: 100%;
		aspect-ratio: 102 / 103.378;
		background: #fff;
		color: var(--qb-ink);
	}
	.chip:hover .chip-grid {
		color: #000;
	}
	/* The design marks the chosen tile with a heavier black rule, not colour. */
	.chip.active .chip-grid {
		color: #000;
	}
	.chip-frame {
		fill: none;
		stroke: currentColor;
	}
	.chip-grid line {
		stroke: currentColor;
		stroke-dasharray: 5 5;
	}
	.chip-label {
		font-size: 0.75rem;
		color: var(--qb-ink);
	}
	.chip.active .chip-label {
		color: #000;
	}

	/* Three 102px tiles with 20px gutters is exactly the design's 426px panel. */
	.types {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		padding: 0 var(--qb-pad);
	}
	.type {
		aspect-ratio: 1;
		padding: 0;
		border: 1px solid var(--qb-tile);
		background: none;
		cursor: pointer;
		line-height: 0;
	}
	.type:hover {
		border-color: var(--qb-ink);
	}
	.type.active {
		border: 1.5px solid #000;
	}
	.type:focus-visible {
		outline: 2px solid var(--qb-accent);
		outline-offset: 1px;
	}

	.saved {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.saved-name {
		font-size: 0.7rem;
		color: var(--qb-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.saved-size {
		margin-left: 0.3rem;
		opacity: 0.6;
	}
	.saved-remove {
		position: absolute;
		top: -0.4rem;
		right: -0.4rem;
		width: 1.1rem;
		height: 1.1rem;
		font: inherit;
		font-size: 0.8rem;
		line-height: 1;
		color: var(--color-text-secondary);
		background: var(--qb-panel);
		border: 1px solid var(--qb-line);
		cursor: pointer;
		opacity: 0;
	}
	.saved:hover .saved-remove,
	.saved-remove:focus-visible {
		opacity: 1;
	}

	.add-new {
		display: block;
		margin: 0.9rem var(--qb-pad) 0;
		font: inherit;
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}
	.add-new:hover:not(:disabled) {
		color: var(--color-text-strong);
	}
	.add-new:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/*
	 * Held open to the tallest wording, three lines. These hints change as the
	 * tool changes, and a hint that shrinks drags the palette up under the
	 * pointer mid-gesture: the second half of a double-click then lands on
	 * whatever slid into its place.
	 */
	.hint {
		margin: 0.6rem var(--qb-pad) 0;
		min-height: 3.375rem;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	.link {
		font: inherit;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-text-strong);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
