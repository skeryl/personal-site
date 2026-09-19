<script lang="ts">
	import { QUILT_SIZES } from './data';
	import { QuiltStore } from './state.svelte';
	import SidePanel from './SidePanel.svelte';
	import Wall from './Wall.svelte';
	import MaterialsPanel from './MaterialsPanel.svelte';

	const store = new QuiltStore();

	/*
	 * Autosave the working state, debounced so a paint stroke is one write
	 * instead of one per pointer move.
	 */
	const AUTOSAVE_MS = 250;
	$effect(() => {
		void store.savedState;
		const timer = setTimeout(() => store.persist(), AUTOSAVE_MS);
		return () => clearTimeout(timer);
	});
</script>

<svelte:window
	onpointermove={(e) => store.onPointerMove(e)}
	onpointerup={(e) => store.onPointerUp(e)}
	onkeydown={(e) => store.onKeyDown(e)}
/>

<div class="qb">
	<header class="hero">
		<h1>Quilt Builder</h1>
	</header>

	<div class="titlebar">
		<input
			class="quilt-name"
			type="text"
			placeholder="Untitled"
			aria-label="Quilt name"
			maxlength="60"
			bind:value={store.name}
			onkeydown={(e) => {
				if (e.key === 'Enter') e.currentTarget.blur();
			}}
		/>
		<label class="size">
			<span class="sr-only">Quilt size</span>
			<select value={store.sizeId} onchange={(e) => store.setSize(e.currentTarget.value)}>
				{#each QUILT_SIZES as size (size.id)}
					<option value={size.id}>
						{size.name.toUpperCase()} ({size.width}”x{size.height}”)
					</option>
				{/each}
			</select>
		</label>
	</div>

	<section class="body">
		<SidePanel {store} />
		<Wall {store} />
		<MaterialsPanel {store} />
	</section>
</div>

<style>
	.qb {
		--qb-mono: 'JetBrains Mono', 'Fira Mono', 'SF Mono', Menlo, Consolas, monospace;
		--qb-accent: #c766e4;
		--qb-panel: #f4f4f4;
		--qb-wall: #efefef;
		--qb-line: #cfcfcf;

		/*
		 * Full bleed: cancel the page layout's horizontal padding (px-6, and
		 * px-3 on small screens) so the wall can use the whole window. The
		 * explicit width matters because the parent is a flex container, where
		 * negative margins alone would shift the box rather than widen it.
		 */
		width: calc(100% + 3rem);
		margin-inline: -1.5rem;
		padding: 1.5rem 0 6rem;
		color: var(--color-text);
		line-height: 1.5;
	}
	.hero {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	.hero h1 {
		font-family: var(--qb-mono);
		font-weight: 500;
		font-size: clamp(2rem, 5vw, 3rem);
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-text-strong);
	}

	.titlebar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		max-width: 46rem;
		margin: 0 auto 0.75rem;
		padding: 0 1rem;
		font-family: var(--qb-mono);
	}
	.quilt-name {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 1.1rem;
		color: var(--color-text-strong);
		background: none;
		border: none;
		border-bottom: 1px solid transparent;
		padding: 0.1rem 0;
	}
	.quilt-name:hover {
		border-bottom-color: var(--qb-line);
	}
	.quilt-name:focus {
		outline: none;
		border-bottom-color: var(--color-text-strong);
	}
	.size select {
		font: inherit;
		font-size: 0.85rem;
		color: var(--color-text-strong);
		background: transparent;
		border: none;
		cursor: pointer;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.body {
		display: grid;
		grid-template-columns: 22rem minmax(0, 1fr) 17rem;
		align-items: start;
		border-top: 1px solid var(--qb-line);
	}

	@media (max-width: 639px) {
		.qb {
			width: calc(100% + 1.5rem);
			margin-inline: -0.75rem;
		}
	}

	@media (max-width: 1100px) {
		.body {
			grid-template-columns: 18rem minmax(0, 1fr);
		}
		.body > :global(.materials) {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 768px) {
		.body {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
