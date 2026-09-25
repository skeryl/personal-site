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
	<!-- The builder names itself across the top, ruled off from the work. -->
	<h1 class="masthead">Quilt Builder</h1>
	<section class="body">
		<SidePanel {store} />
		<Wall {store} />
	</section>
</div>

<style>
	.qb {
		/*
		 * The design's two voices, both loaded from Google Fonts in app.html.
		 * Mono is the app's own writing — what it is called, what a shape is
		 * named, what a value reads. Sans is the labelling around it: the
		 * headings, the field names, the quilt's own ruler marks.
		 */
		--qb-mono: 'Spline Sans Mono', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
		--qb-sans: 'Cabin', var(--font-sans, system-ui, -apple-system, 'Segoe UI', sans-serif);
		/* The builder's own name, and only that: a serif against the other two. */
		--qb-title: 'Neuton', Georgia, 'Times New Roman', serif;

		/* Read from the design file rather than eyeballed. */
		--qb-accent: #763edf;
		/* One warm off-white behind both the palette and the wall. */
		--qb-panel: #f5f4f2;
		--qb-wall: #f5f4f2;
		/*
		 * Every line that divides one part of the builder from another, down
		 * the panel and across it: black, and half a pixel. Distinct from the
		 * hairlines that edge a swatch or a tile, which are not dividers.
		 */
		--qb-divider: 0.5px solid #000;
		/* Rules between sections, and the cream the quilt is ruled in. */
		--qb-line: #d0cfc7;
		--qb-square: #f3f0e8;
		--qb-tile: #d9d9d9;
		--qb-ink: #525252;
		/* The quilt's binding, and the grey its quieter writing is set in. */
		--qb-binding: #83817d;
		--qb-muted: #83817d;
		--qb-guide: #ff8585;
		/* The blue every link in the design is set in. */
		--qb-link: #0011cf;
		/*
		 * How anything picked is marked, wherever it is picked: a hairline of
		 * black held off the thing itself, so what you chose still reads as
		 * the colour or the shape it is rather than as one with a dark edge.
		 */
		--qb-picked: 1px solid #000;
		--qb-picked-gap: 2px;
		/* The quilt's ruler marks, and the tool names under it. */
		--qb-rule: #7a7a7a;
		--qb-tool: #9b9b9b;
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

	/* 33px tall, the name centred in it, as the design heads the page. */
	.masthead {
		flex-shrink: 0;
		box-sizing: border-box;
		height: 33px;
		margin: 0;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--qb-title);
		font-size: 16px;
		font-weight: 400;
		line-height: 20px;
		color: #000;
		/* White, not the warm ground the work below it sits on. */
		background: #fff;
		border-bottom: var(--qb-divider);
	}

	.body {
		display: grid;
		grid-template-columns: 26.625rem minmax(0, 1fr);
		align-items: stretch;
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
