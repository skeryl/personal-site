<script lang="ts">
	import { SQUARE_INCHES } from './data';
	import { QuiltStore } from './state.svelte';
	import Palette from './Palette.svelte';
	import Wall from './Wall.svelte';
	import PatternsPanel from './PatternsPanel.svelte';

	const store = new QuiltStore();

	/*
	 * Autosave the working state, debounced so a paint stroke is one write
	 * instead of one per pointer move.
	 */
	const AUTOSAVE_MS = 250;
	$effect(() => {
		void store.workingState;
		const timer = setTimeout(() => store.persistWorking(), AUTOSAVE_MS);
		return () => clearTimeout(timer);
	});
</script>

<svelte:window
	onpointermove={(e) => store.onPointerMove(e)}
	onpointerup={(e) => store.onPointerUp(e)}
	onkeydown={(e) => store.onKeyDown(e)}
/>

<div class="exploration">
	<header class="hero">
		<h1>Quilt Builder</h1>
		<p class="subtitle">
			A design wall for one finite pile of scrap fabric. Every cell is an {SQUARE_INCHES}" square
			that can hold a whole square, two rectangles, two triangles, or four half-triangles. Drag
			pieces around until something looks right.
		</p>
	</header>

	<section class="tool-grid">
		<Palette {store} />
		<Wall {store} />
		<PatternsPanel {store} />
	</section>
</div>

<style>
	.exploration {
		/* Accent palette shared by the child components. */
		--qb-accent: #f59e0b;
		--qb-axis-v: #e11d48;
		--qb-axis-h: #2563eb;
		--qb-wall: #616161;

		max-width: 1400px;
		margin: 0 auto;
		padding: 3rem 1.25rem 6rem;
		color: var(--color-text);
		line-height: 1.6;
	}
	.hero {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		letter-spacing: -0.02em;
		margin: 0 0 1rem;
		color: var(--color-text-strong);
	}
	.subtitle {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		max-width: 62ch;
		margin: 0 auto;
	}

	.tool-grid {
		display: grid;
		grid-template-columns: 14rem minmax(0, 1fr) 24rem;
		gap: 2rem;
		align-items: start;
	}

	/* Shared building blocks used by all three panels. */
	.exploration :global(.tool-btn) {
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.exploration :global(.tool-btn.active) {
		background: var(--color-filter-active-bg);
		color: var(--color-filter-active-text);
	}
	.exploration :global(.tool-btn:disabled) {
		opacity: 0.4;
		cursor: default;
	}
	.exploration :global(kbd) {
		font-size: 0.7rem;
		opacity: 0.7;
	}
	.exploration :global(.group-label) {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-top: 0.9rem;
	}
	.exploration :global(.hint) {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0 0 0.75rem;
		line-height: 1.4;
	}
	.exploration :global(.chip) {
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border-subtle);
	}

	@media (max-width: 1100px) {
		.tool-grid {
			grid-template-columns: 14rem minmax(0, 1fr);
		}
		.tool-grid > :global(.patterns-panel) {
			grid-column: 1 / -1;
		}
		.tool-grid :global(.pattern-list) {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		}
	}
	@media (max-width: 768px) {
		.tool-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
