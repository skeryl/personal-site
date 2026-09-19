<script lang="ts">
	import { CUSTOM_SIZE_ID, MAX_CUSTOM_INCHES, MIN_CUSTOM_INCHES, QUILT_SIZES } from './data';
	import { QuiltStore } from './state.svelte';
	import SidePanel from './SidePanel.svelte';
	import Wall from './Wall.svelte';

	const store = new QuiltStore();

	/*
	 * The builder is an app shell, not a document: it fills the window from
	 * wherever it starts down to the bottom edge, and only the work area
	 * scrolls. How much page chrome sits above it depends on the post header,
	 * so measure rather than hardcode an offset.
	 */
	let root = $state<HTMLElement | null>(null);
	let top = $state(0);

	$effect(() => {
		const el = root;
		if (!el) return;
		const measure = () => {
			top = el.getBoundingClientRect().top + window.scrollY;
		};
		measure();
		window.addEventListener('resize', measure);
		const observer = new ResizeObserver(measure);
		observer.observe(document.body);
		return () => {
			window.removeEventListener('resize', measure);
			observer.disconnect();
		};
	});

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

<div class="qb" bind:this={root} style="--qb-top: {top}px">
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
		<div class="size">
			<label>
				<span class="sr-only">Quilt size</span>
				<select value={store.sizeId} onchange={(e) => store.setSize(e.currentTarget.value)}>
					{#each QUILT_SIZES as size (size.id)}
						<option value={size.id}>
							{size.name.toUpperCase()} ({size.width}”x{size.height}”)
						</option>
					{/each}
					<option value={CUSTOM_SIZE_ID}>
						CUSTOM ({store.customWidth}”x{store.customHeight}”)
					</option>
				</select>
			</label>
			{#if store.isCustomSize}
				<span class="custom-size">
					<label>
						<span class="sr-only">Custom width in inches</span>
						<input
							class="inches"
							type="number"
							min={MIN_CUSTOM_INCHES}
							max={MAX_CUSTOM_INCHES}
							value={store.customWidth}
							onchange={(e) =>
								store.setCustomSize(Number(e.currentTarget.value), store.customHeight)}
						/>
					</label>
					<span aria-hidden="true">×</span>
					<label>
						<span class="sr-only">Custom height in inches</span>
						<input
							class="inches"
							type="number"
							min={MIN_CUSTOM_INCHES}
							max={MAX_CUSTOM_INCHES}
							value={store.customHeight}
							onchange={(e) =>
								store.setCustomSize(store.customWidth, Number(e.currentTarget.value))}
						/>
					</label>
				</span>
			{/if}
		</div>
	</div>

	<section class="body">
		<SidePanel {store} />
		<Wall {store} />
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
		padding: 1rem 0 0;
		color: var(--color-text);
		line-height: 1.5;
		display: flex;
		flex-direction: column;
		/* Bottom gutter matches the page layout's own pb-8. */
		height: calc(100dvh - var(--qb-top, 0px) - 2rem);
	}
	.hero {
		text-align: center;
		margin-bottom: 0.75rem;
		flex-shrink: 0;
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
		flex-shrink: 0;
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
	.size {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.custom-size {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.inches {
		font: inherit;
		font-size: 0.85rem;
		width: 3.5rem;
		padding: 0.1rem 0.2rem;
		color: var(--color-text-strong);
		background: transparent;
		border: 1px solid var(--qb-line);
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
		grid-template-columns: 22rem minmax(0, 1fr);
		align-items: stretch;
		border-top: 1px solid var(--qb-line);
		flex: 1;
		min-height: 0;
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
	}
	/* Narrow screens go back to a document that scrolls as a whole. */
	@media (max-width: 768px) {
		.qb {
			height: auto;
			padding-bottom: 4rem;
		}
		.body {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
