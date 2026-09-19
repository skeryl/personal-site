<script lang="ts">
	import { BLOCK_SIZES } from './data';
	import { BLOCK_TYPES } from './blocks';
	import { PIECE_CUTS } from './geometry';
	import { flatten, leafBlock, rotateBlock, type Block } from './model';
	import BlockSvg from './BlockSvg.svelte';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const DARK = '#4a4a4a';
	const LIGHT = '#d9d9d9';

	/** Icon fills: dark for the fabric role, light for background, white for empty. */
	const roleFills = (block: Block, dark = DARK): string[] =>
		flatten(block).map((p) => (p.role === 0 ? dark : p.role === 1 ? LIGHT : '#ffffff'));

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#fff') : '#fff';

	/** Rotated once per rotation change, so the flatten cache keeps hitting. */
	const pieceEntries = $derived(
		PIECE_CUTS.map((cut) => ({ cut, block: leafBlock(cut.id, store.rotation) }))
	);
	const blockEntries = $derived(
		BLOCK_TYPES.map((type) => ({ type, block: rotateBlock(type.block, store.rotation) }))
	);
	const customEntries = $derived(
		store.customBlocks.map((saved) => ({
			saved,
			block: rotateBlock(saved.block, store.rotation)
		}))
	);

	const exampleBlock = $derived(
		store.pending.mode === 'paint'
			? leafBlock(store.pending.cut, store.pending.rotation)
			: store.pending.block
	);

	const exampleFills = $derived.by(() => {
		const dark = store.selectedMaterial?.hex ?? DARK;
		const custom = store.selectedCustom !== null;
		return flatten(exampleBlock).map((p) =>
			custom ? hexOf(p.fabric) : p.role === 0 ? dark : p.role === 1 ? LIGHT : '#ffffff'
		);
	});
</script>

<aside class="side">
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
						class:active={!store.capturing && store.blockId === entry.type.id}
						aria-pressed={store.blockId === entry.type.id}
						aria-label={entry.type.name}
						title={entry.type.name}
						onclick={() => store.pickBlock(entry.type.id)}
					>
						<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
					</button>
				{/each}
				{#each customEntries as entry (entry.saved.id)}
					<div class="custom">
						<button
							class="type"
							class:active={!store.capturing && store.selectedCustom?.id === entry.saved.id}
							aria-pressed={store.selectedCustom?.id === entry.saved.id}
							aria-label={entry.saved.name}
							title={entry.saved.name}
							onclick={() => store.pickCustomBlock(entry.saved.id)}
						>
							<BlockSvg
								block={entry.block}
								fills={flatten(entry.block).map((p) => hexOf(p.fabric))}
							/>
						</button>
						<span class="custom-name">{entry.saved.name}</span>
						<button
							class="custom-remove"
							aria-label={`Remove ${entry.saved.name}`}
							title="Remove"
							onclick={() => store.deleteCustomBlock(entry.saved.id)}
						>
							×
						</button>
					</div>
				{/each}
				<button
					class="add-new"
					class:active={store.capturing}
					aria-pressed={store.capturing}
					onclick={() => (store.capturing ? (store.capturing = false) : store.startCapture())}
				>
					+ Add new
				</button>
			</div>
			{#if store.capturing}
				<p class="hint">
					{store.filled
						? 'Click a block on the quilt to save it as a type.'
						: 'Place something on the quilt first, then save it as a type.'}
				</p>
			{/if}
		</div>

		<div class="example">
			<div class="label example-label">Center block example</div>
			<div class="example-art">
				<BlockSvg block={exampleBlock} fills={exampleFills} stroke="rgba(0, 0, 0, 0.12)" />
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
	.add-new:hover,
	.add-new.active {
		color: var(--qb-accent);
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
