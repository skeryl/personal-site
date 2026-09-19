<script lang="ts">
	import { BLOCK_SIZES, fmtInches } from './data';
	import { BLOCK_TYPES } from './blocks';
	import { PIECE_CUTS } from './geometry';
	import { flatten, leafBlock, rotateBlock, type Block } from './model';
	import { boundsOf, coordOf, rotatePattern, type PatternBlocks } from './pattern';
	import AttributesPanel from './AttributesPanel.svelte';
	import BlockSvg from './BlockSvg.svelte';
	import PatternSvg from './PatternSvg.svelte';
	import { DIVISIONS, type QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const DARK = '#4a4a4a';
	const LIGHT = '#d9d9d9';

	/** Icon fills: dark for the fabric role, light for background, white for empty. */
	const roleFill = (role: number, dark = DARK): string =>
		role === 0 ? dark : role === 1 ? LIGHT : '#ffffff';

	const roleFills = (block: Block, dark = DARK): string[] =>
		flatten(block).map((p) => roleFill(p.role, dark));

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#fff') : '#fff';

	/** Rotated once per rotation change, so the flatten cache keeps hitting. */
	const pieceEntries = $derived(
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

	/** The single block, or the pattern, that a click would place. */
	const example = $derived.by((): { block: Block } | { blocks: PatternBlocks } => {
		const pending = store.pending;
		if (pending.mode === 'paint') {
			return { block: leafBlock(pending.cut, pending.rotation) };
		}
		return pending.mode === 'pattern' ? { blocks: pending.blocks } : { block: pending.block };
	});

	const exampleFills = $derived.by(() => {
		if (!('block' in example)) return [];
		const dark = store.selectedMaterial?.hex ?? DARK;
		return flatten(example.block).map((p) => roleFill(p.role, dark));
	});

	const selectedCount = $derived(store.selection.length);
	const capturableCount = $derived(store.capturable.length);
</script>

<aside class="side">
	<section class="selection" aria-label="Grid">
		<div class="label section">Grid <kbd>G</kbd></div>
		<div class="composition" role="group" aria-label="Block grid">
			{#each DIVISIONS as division (division)}
				{@const label = division === 1 ? 'One piece' : `${division} by ${division}`}
				<button
					class="chip"
					class:active={store.activeDivision === division}
					aria-pressed={store.activeDivision === division}
					aria-label={label}
					title={`${label}, ${fmtInches(store.blockSize / division)}” pieces`}
					onclick={() => store.setGrid(division)}
				>
					<!-- Solid outline, dashed divisions: the sketch's own notation. -->
					<svg class="chip-grid" viewBox="0 0 24 24" aria-hidden="true">
						<rect x="0.5" y="0.5" width="23" height="23" />
						{#each { length: division - 1 } as _, i (i)}
							{@const at = ((i + 1) * 24) / division}
							<line class="divide" x1={at} y1="0" x2={at} y2="24" />
							<line class="divide" x1="0" y1={at} x2="24" y2={at} />
						{/each}
					</svg>
					<span class="chip-size">{fmtInches(store.blockSize / division)}”</span>
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
			{:else}
				Pick a grid to paint it on, or
				<button class="link" onclick={() => (store.tool = 'mouse')}>select</button>
				blocks to change theirs. Shift-click to add, or drag a box.
			{/if}
		</p>

		{#if selectedCount}
			<button class="add-new" disabled={!capturableCount} onclick={() => store.capturePattern()}>
				+ Save selection
			</button>
			{#if !capturableCount}
				<p class="hint">Those blocks are empty; fill one to save it.</p>
			{/if}
		{/if}
	</section>

	<div class="tabs" role="tablist" aria-label="Palette">
		<button
			role="tab"
			class="tab"
			class:active={store.tab === 'block'}
			aria-selected={store.tab === 'block'}
			onclick={() => (store.tab = 'block')}
		>
			Block
		</button>
		<button
			role="tab"
			class="tab"
			class:active={store.tab === 'piece'}
			aria-selected={store.tab === 'piece'}
			onclick={() => (store.tab = 'piece')}
		>
			Piece
		</button>
	</div>

	{#if store.tab === 'block'}
		<div class="panel-body">
			<label class="setting">
				<span class="label">Block size</span>
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

			<div class="label section">Type</div>
			<div class="types">
				{#each blockEntries as entry (entry.type.id)}
					<button
						class="type"
						class:active={store.blockId === entry.type.id}
						aria-pressed={store.blockId === entry.type.id}
						aria-label={entry.type.name}
						title={entry.type.name}
						onclick={() => store.pickBlock(entry.type.id)}
					>
						<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
					</button>
				{/each}
				{#each patternEntries as entry (entry.saved.id)}
					<div class="custom">
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
						<span class="custom-name">
							{entry.saved.name}{#if entry.size}<span class="custom-size">{entry.size}</span>{/if}
						</span>
						<button
							class="custom-remove"
							aria-label={`Remove ${entry.saved.name}`}
							title="Remove"
							onclick={() => store.deletePattern(entry.saved.id)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="example">
			<div class="label example-label">Center block example</div>
			<div class="example-art">
				{#if 'blocks' in example}
					<PatternSvg blocks={example.blocks} fillOf={hexOf} />
				{:else}
					<BlockSvg block={example.block} fills={exampleFills} stroke="rgba(0, 0, 0, 0.12)" />
				{/if}
			</div>
		</div>
	{:else}
		<div class="panel-body">
			<div class="label section">Type</div>
			<div class="types labeled">
				{#each pieceEntries as entry (entry.cut.id)}
					<button
						class="type"
						class:active={store.pieceId === entry.cut.id}
						aria-pressed={store.pieceId === entry.cut.id}
						onclick={() => store.pickPiece(entry.cut.id)}
					>
						<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
						<span class="type-name">{entry.cut.name}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
	<AttributesPanel {store} />
</aside>

<style>
	.side {
		display: flex;
		flex-direction: column;
		background: var(--qb-panel);
		border-right: 1px solid var(--qb-line);
		font-family: var(--qb-mono);
	}
	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-bottom: 1px solid var(--qb-line);
	}
	.tab {
		padding: 0.85rem 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.95rem;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.tab.active {
		background: #fafafa;
		color: var(--color-text-strong);
		font-weight: 700;
	}

	.panel-body {
		padding: 1rem 1.5rem 1.25rem;
	}
	.setting {
		display: flex;
		align-items: center;
		gap: 1rem;
		white-space: nowrap;
	}
	.label {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-strong);
	}
	.section {
		margin: 1.5rem 0 0.9rem 1.75rem;
	}
	.select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.15rem 0.4rem;
		border: none;
		border-bottom: 1px solid var(--color-text-strong);
		background: transparent;
		color: var(--color-text-strong);
		cursor: pointer;
	}

	.types {
		display: grid;
		grid-template-columns: repeat(2, 6.75rem);
		gap: 1.5rem 3rem;
		justify-content: center;
	}
	.type {
		width: 6.75rem;
		height: 6.75rem;
		padding: 0;
		border: 2px solid transparent;
		background: none;
		cursor: pointer;
		box-sizing: content-box;
	}
	.type:hover {
		border-color: var(--qb-line);
	}
	.type.active {
		border-color: var(--qb-accent);
	}
	.type:focus-visible {
		outline: 2px solid var(--qb-accent);
		outline-offset: 2px;
	}
	.labeled .type {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: auto;
	}
	.labeled .type :global(svg) {
		width: 6.75rem;
		height: 6.75rem;
	}
	.type-name {
		margin-top: 0.5rem;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-strong);
	}

	.custom {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.custom-name {
		margin-top: 0.4rem;
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		max-width: 6.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.custom-remove {
		position: absolute;
		top: -0.5rem;
		right: -0.75rem;
		width: 1.4rem;
		height: 1.4rem;
		border: 1px solid var(--qb-line);
		border-radius: 999px;
		background: #fff;
		font: inherit;
		line-height: 1;
		color: var(--color-text-secondary);
		cursor: pointer;
		opacity: 0;
	}
	.custom:hover .custom-remove,
	.custom-remove:focus-visible {
		opacity: 1;
	}

	.add-new:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.add-new {
		align-self: center;
		justify-self: center;
		padding: 0.5rem 0.25rem;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-strong);
		cursor: pointer;
	}
	.add-new:hover:not(:disabled) {
		color: var(--qb-accent);
	}
	.selection {
		padding: 0.75rem 0 0.9rem;
		border-bottom: 1px solid var(--qb-line);
	}
	.composition {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
		padding: 0 1rem;
	}
	.chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		font: inherit;
		padding: 0.5rem 0.25rem;
		border: 1px solid var(--qb-line);
		background: #fff;
		color: var(--color-text-strong);
		cursor: pointer;
	}
	.chip:hover {
		border-color: var(--color-text-strong);
	}
	.chip.active {
		border-color: var(--qb-accent);
		outline: 1px solid var(--qb-accent);
		outline-offset: -2px;
	}
	/* A miniature of the subdivision, so each option shows what it does. */
	.chip-grid {
		width: 1.6rem;
		height: 1.6rem;
		display: block;
		color: #8a8a8a;
	}
	.chip.active .chip-grid {
		color: var(--qb-accent);
	}
	.chip-grid rect {
		fill: none;
		stroke: currentColor;
		stroke-width: 1;
	}
	.chip-grid .divide {
		stroke: currentColor;
		stroke-width: 1;
		stroke-dasharray: 3 2;
	}
	.chip-size {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.section kbd {
		font: inherit;
		font-size: 0.85em;
		opacity: 0.55;
		margin-left: 0.25rem;
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
	.custom-size {
		margin-left: 0.3rem;
		opacity: 0.6;
	}

	.hint {
		margin: 1rem 0 0;
		font-size: 0.72rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}

	.example {
		border-top: 1px solid var(--qb-line);
		padding: 2rem 1.5rem 2.5rem;
		text-align: center;
	}
	.example-label {
		font-style: italic;
		font-size: 0.85rem;
		margin-bottom: 1.25rem;
	}
	.example-art {
		width: 13.5rem;
		height: 13.5rem;
		margin: 0 auto;
	}
</style>
