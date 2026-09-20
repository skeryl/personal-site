<script lang="ts">
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
		void store.panels;
		const timer = setTimeout(() => store.persist(), AUTOSAVE_MS);
		return () => clearTimeout(timer);
	});
</script>

<svelte:window
	onpointermove={(e) => store.onPointerMove(e)}
	onpointerup={(e) => store.onPointerUp(e)}
	onkeydown={(e) => store.onKeyDown(e)}
	onkeyup={(e) => store.onKeyUp(e)}
/>

<div class="qb" bind:this={root} style="--qb-top: {top}px">
	<section class="body">
		<SidePanel {store} />
		<Wall {store} />
	</section>
</div>

<style>
	.qb {
		--qb-mono: 'JetBrains Mono', 'Fira Mono', 'SF Mono', Menlo, Consolas, monospace;

		/* Read from the design file rather than eyeballed. */
		--qb-accent: #763edf;
		--qb-panel: #ffffff;
		--qb-wall: #f3f3f3;
		--qb-line: #cacaca;
		/* Squares on the quilt are ruled lighter than the panel's own borders. */
		--qb-square: #dfdfdf;
		--qb-tile: #d9d9d9;
		--qb-ink: #525252;
		--qb-guide: #ff8585;
		/* The panel's 40px gutter, in a 426px panel. */
		--qb-pad: 2.5rem;

		/*
		 * Full bleed: cancel the page layout's horizontal padding (px-6, and
		 * px-3 on small screens) so the wall can use the whole window. The
		 * explicit width matters because the parent is a flex container, where
		 * negative margins alone would shift the box rather than widen it.
		 */
		width: calc(100% + 3rem);
		margin-inline: -1.5rem;
		/* Cancels the page layout's own pb-8, so the wall reaches the bottom. */
		margin-bottom: -2rem;
		padding: 0;
		color: var(--color-text);
		line-height: 1.5;
		display: flex;
		flex-direction: column;
		/* Bottom gutter matches the page layout's own pb-8. */
		height: calc(100dvh - var(--qb-top, 0px));
	}

	.body {
		display: grid;
		grid-template-columns: 26.625rem minmax(0, 1fr);
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
			grid-template-columns: 20rem minmax(0, 1fr);
		}
	}
	/* Narrow screens go back to a document that scrolls as a whole. */
	@media (max-width: 768px) {
		.qb {
			height: auto;
			margin-bottom: 0;
			padding-bottom: 4rem;
		}
		.body {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
