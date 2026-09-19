<script lang="ts">
	import { tick } from 'svelte';
	import Minimap from './Minimap.svelte';
	import { toPolygonPoints } from './geometry';
	import {
		colOf,
		columnLabel,
		divisionOf,
		dominantFabric,
		flatten,
		isEmpty,
		leafRects,
		rowOf,
		walkLeaves,
		type Block
	} from './model';
	import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, type QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const VB = 100;

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#ffffff') : '#ffffff';

	const nameOf = (id: string | null): string =>
		id ? store.materialById.get(id)?.name.trim() || 'unnamed fabric' : 'empty';

	/** Position plus contents, so a screen reader can read the design. */
	const cellLabel = (index: number, block: Block): string => {
		const position = `Row ${rowOf(index, store.dims.cols) + 1}, column ${colOf(index, store.dims.cols) + 1}`;
		if (isEmpty(block)) return `${position}: empty`;
		const names = [...new Set(flatten(block).map((p) => nameOf(p.fabric)))];
		const division = divisionOf(block);
		const shape =
			division > 1
				? `${division} by ${division} composition`
				: walkLeaves(block)[0].leaf.cut.replace(/-/g, ' ');
		return `${position}: ${shape} in ${names.join(', ')}`;
	};

	const banner = $derived.by(() => {
		if (store.tool === 'mouse') {
			return store.selection.length ? null : 'Click, shift-click, or drag a box to select blocks';
		}
		if (store.tool === 'grid') return 'Click or drag to paint the grid chosen on the left';
		if (store.tool === 'erase') return null;
		if (!store.materials.length) return 'Add a color in Attributes to start placing';
		if (!store.selectedMaterial) return 'Pick a color in Attributes to start placing';
		return null;
	});

	const finishedW = $derived(store.dims.cols * store.blockSize);
	const finishedH = $derived(store.dims.rows * store.blockSize);

	// ── Zoom and pan ─────────────────────────────────────────────────

	let viewport = $state<HTMLElement | null>(null);
	let viewW = $state(0);
	let viewH = $state(0);
	/* The headers live inside the scroller, so they eat into the fit. */
	let headerH = $state(0);
	let headerW = $state(0);
	let scrollX = $state(0);
	let scrollY = $state(0);

	const aspect = $derived(store.dims.cols / store.dims.rows);

	/*
	 * Size at zoom 1: the whole quilt, contained in the viewport. The column
	 * and row headers scroll with the quilt, so they take space away from the
	 * fit; not subtracting them is what put a scrollbar on a zoomed-out wall
	 * and clipped the letters off the top.
	 */
	const FIT_SLACK = 8;
	const base = $derived.by(() => {
		const availW = viewW - headerW - FIT_SLACK;
		const availH = viewH - headerH - FIT_SLACK;
		if (availW <= 0 || availH <= 0) return { w: 0, h: 0 };
		const w = Math.max(Math.min(availW, availH * aspect), 80);
		return { w, h: w / aspect };
	});
	const content = $derived({ w: base.w * store.zoom, h: base.h * store.zoom });
	const zoomed = $derived(content.w > viewW + 1 || content.h > viewH + 1);

	const readView = () => {
		const el = viewport;
		if (!el) return;
		scrollX = el.scrollLeft;
		scrollY = el.scrollTop;
	};

	$effect(() => {
		const el = viewport;
		if (!el) return;
		const measure = () => {
			viewW = el.clientWidth;
			viewH = el.clientHeight;
			readView();
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	});

	/*
	 * Ctrl (or cmd) plus wheel zooms about the pointer, so the block under the
	 * cursor stays under the cursor. Registered by hand because preventDefault
	 * needs a non-passive listener.
	 */
	$effect(() => {
		const el = viewport;
		if (!el) return;
		const onWheel = async (e: WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;
			const before = store.zoom;
			store.zoomBy(Math.exp(-e.deltaY * 0.0025));
			const ratio = store.zoom / before;
			if (ratio === 1) return;
			await tick();
			el.scrollLeft = (el.scrollLeft + cx) * ratio - cx;
			el.scrollTop = (el.scrollTop + cy) * ratio - cy;
			readView();
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

	/** Fraction of the quilt currently visible, for the minimap. */
	const view = $derived({
		x: content.w ? clamp01(scrollX / content.w) : 0,
		y: content.h ? clamp01(scrollY / content.h) : 0,
		w: content.w ? clamp01(viewW / content.w) : 1,
		h: content.h ? clamp01(viewH / content.h) : 1
	});

	/*
	 * Middle-button drag pans. Listeners are attached by hand, like the wheel
	 * one: they need preventDefault (to suppress autoscroll) and they belong on
	 * a scroll container, not on an element with an interactive role. A drag
	 * that starts over a block still pans, because cell handlers ignore every
	 * button but 0 and pointer capture keeps the drag alive outside the wall.
	 */
	let panning = $state(false);

	$effect(() => {
		const el = viewport;
		if (!el) return;

		const down = (e: PointerEvent) => {
			if (e.button !== 1) return;
			e.preventDefault();
			panning = true;
			el.setPointerCapture(e.pointerId);
		};
		const move = (e: PointerEvent) => {
			if (!panning) return;
			el.scrollLeft -= e.movementX;
			el.scrollTop -= e.movementY;
			readView();
		};
		const up = (e: PointerEvent) => {
			if (!panning) return;
			panning = false;
			if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
		};
		// Middle click would otherwise start the browser's own autoscroll.
		const auxclick = (e: MouseEvent) => e.button === 1 && e.preventDefault();

		el.addEventListener('pointerdown', down);
		el.addEventListener('pointermove', move);
		el.addEventListener('pointerup', up);
		el.addEventListener('pointercancel', up);
		el.addEventListener('auxclick', auxclick);
		return () => {
			el.removeEventListener('pointerdown', down);
			el.removeEventListener('pointermove', move);
			el.removeEventListener('pointerup', up);
			el.removeEventListener('pointercancel', up);
			el.removeEventListener('auxclick', auxclick);
		};
	});

	const panTo = (fx: number, fy: number) => {
		const el = viewport;
		if (!el) return;
		el.scrollLeft = fx * content.w - el.clientWidth / 2;
		el.scrollTop = fy * content.h - el.clientHeight / 2;
		readView();
	};

	/** One fill per block, by dominant fabric, for the minimap. */
	const minimapFills = $derived(store.cells.map((block) => hexOf(dominantFabric(block))));

	const zoomPercent = $derived(Math.round(store.zoom * 100));
</script>

<section class="wall">
	<div class="wall-frame">
		<div class="banner-slot" aria-live="polite">
			{#if banner}
				<span class="banner">{banner}</span>
			{/if}
		</div>

		<div class="stage">
			<div class="viewport" class:panning bind:this={viewport} onscroll={readView}>
				<div class="canvas">
					<!--
						Headers scroll with the quilt rather than sticking, which is how the
						design shows the zoomed-in state: the letters and numbers go with it.
					-->
					<div class="sheet">
						<div class="corner" aria-hidden="true"></div>
						<div
							class="col-headers"
							bind:clientHeight={headerH}
							aria-hidden="true"
							style="grid-template-columns: repeat({store.dims.cols}, 1fr); width: {content.w}px"
						>
							{#each { length: store.dims.cols } as _, c (c)}
								<span class="head">{columnLabel(c)}</span>
							{/each}
						</div>
						<div
							class="row-headers"
							bind:clientWidth={headerW}
							aria-hidden="true"
							style="grid-template-rows: repeat({store.dims.rows}, 1fr); height: {content.h}px"
						>
							{#each { length: store.dims.rows } as _, r (r)}
								<span class="head">{r + 1}</span>
							{/each}
						</div>
						<div
							class="blanket"
							class:tool-erase={store.tool === 'erase'}
							class:tool-mouse={store.tool === 'mouse'}
							class:copying={store.copyDrag !== null}
							class:tool-grid={store.tool === 'grid'}
							class:locked={store.tool === 'place' && !store.canPlace}
							style="grid-template-columns: repeat({store.dims
								.cols}, 1fr); width: {content.w}px; height: {content.h}px"
						>
							{#if store.marqueeRect}
								{@const rect = store.marqueeRect}
								<div
									class="lasso"
									aria-hidden="true"
									style="grid-column: {rect.c0 + 1} / {rect.c1 + 2}; grid-row: {rect.r0 +
										1} / {rect.r1 + 2}"
								></div>
							{/if}
							{#each store.cells as cell, i (i)}
								{@const pv =
									(store.placePreview ?? store.gridPreview ?? store.copyPreview)?.get(i) ?? null}
								{@const ev = store.erasePreview?.get(i) ?? null}
								{@const display = pv ?? cell}
								{@const pieces = flatten(display)}
								{@const before = pv ? new Map(flatten(cell).map((p) => [p.key, p.fabric])) : null}
								{@const after = ev ? new Map(flatten(ev).map((p) => [p.key, p.fabric])) : null}
								<button
									class="cell"
									class:hovered={store.hover?.index === i}
									class:selected={store.highlighted.has(i)}
									data-cell-index={i}
									aria-label={cellLabel(i, cell)}
									onpointerdown={(e) => store.onCellPointerDown(e, i)}
									onclick={(e) => {
										// detail 0 = keyboard activation; pointer clicks are
										// handled by the pointer gesture machinery.
										if (e.detail === 0) store.activateCell(i);
									}}
									oncontextmenu={(e) => {
										e.preventDefault();
										store.rotateCell(i);
									}}
								>
									<svg viewBox="0 0 {VB} {VB}" preserveAspectRatio="none" aria-hidden="true">
										{#each pieces as piece (piece.key)}
											<polygon
												points={toPolygonPoints(piece.points, VB)}
												fill={hexOf(piece.fabric)}
												class:ghost={before !== null &&
													(before.get(piece.key) ?? null) !== piece.fabric}
												class:erasing={after !== null &&
													piece.fabric !== null &&
													(after.get(piece.key) ?? null) !== piece.fabric}
												stroke={pieces.length > 1 ? 'rgba(0, 0, 0, 0.18)' : 'none'}
												stroke-width="1"
												vector-effect="non-scaling-stroke"
											/>
										{/each}
										{#each leafRects(display) as seam, s (s)}
											<rect
												class="seam"
												x={seam.x * VB}
												y={seam.y * VB}
												width={seam.w * VB}
												height={seam.h * VB}
											/>
										{/each}
									</svg>
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
			{#if zoomed}
				<div class="minimap-slot">
					<Minimap
						cols={store.dims.cols}
						rows={store.dims.rows}
						fills={minimapFills}
						{view}
						onPan={panTo}
					/>
				</div>
			{/if}
		</div>

		<p class="readout" aria-live="polite">{store.selectionLabel}</p>

		<p class="caption">
			{store.dims.cols} × {store.dims.rows} blocks at {store.blockSize}” · {finishedW}” × {finishedH}”
			finished
		</p>

		<div class="actions">
			<button
				class="action"
				class:active={store.tool === 'place'}
				onclick={() => (store.tool = 'place')}
			>
				Place <kbd>P</kbd>
			</button>
			<button
				class="action"
				class:active={store.tool === 'mouse'}
				onclick={() => (store.tool = 'mouse')}
			>
				Mouse <kbd>V</kbd>
			</button>
			<button
				class="action"
				class:active={store.tool === 'grid'}
				onclick={() => (store.tool = 'grid')}
			>
				Grid <kbd>G</kbd>
			</button>
			<button
				class="action"
				class:active={store.tool === 'erase'}
				onclick={() => (store.tool = 'erase')}
			>
				Erase <kbd>E</kbd>
			</button>
			<button class="action" onclick={() => store.rotate()}>Rotate <kbd>R</kbd></button>
			<button class="action" onclick={() => store.undo()} disabled={!store.canUndo}>
				Undo <kbd>⌘Z</kbd>
			</button>
			<button class="action" onclick={() => store.redo()} disabled={!store.canRedo}>
				Redo <kbd>⇧⌘Z</kbd>
			</button>
			<button class="action" onclick={() => store.clearAll()} disabled={store.filled === 0}
				>Clear</button
			>
		</div>

		<div class="zoom" role="group" aria-label="Zoom">
			<button
				class="action"
				aria-label="Zoom out"
				onclick={() => store.zoomBy(1 / ZOOM_STEP)}
				disabled={store.zoom <= ZOOM_MIN}>−</button
			>
			<button class="action zoom-level" onclick={() => store.resetZoom()} title="Reset zoom">
				{zoomPercent}%
			</button>
			<button
				class="action"
				aria-label="Zoom in"
				onclick={() => store.zoomBy(ZOOM_STEP)}
				disabled={store.zoom >= ZOOM_MAX}>+</button
			>
			<span class="zoom-hint">⌃scroll</span>
		</div>

		<button
			class="export"
			onclick={() => store.exportMaterialsList()}
			disabled={!store.cutting.length}
		>
			Export materials list
		</button>
	</div>
</section>

<style>
	.wall {
		font-family: var(--qb-mono);
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
	}
	.wall-frame {
		background: var(--qb-wall);
		border: 1px solid var(--qb-line);
		padding: 0.75rem 2rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		min-height: 0;
	}
	.banner-slot {
		height: 1.5rem;
		margin-bottom: 0.25rem;
		display: flex;
		align-items: center;
	}
	.banner {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}

	.stage {
		position: relative;
		width: 100%;
		max-width: 80rem;
		flex: 1;
		min-height: 0;
	}
	.viewport {
		height: 100%;
		overflow: auto;
		/*
		 * Scroll chaining stays on: the wall fills most of the window, so
		 * trapping the wheel here would strand the toolbar below it.
		 */
		background: var(--qb-wall);
	}
	.viewport.panning,
	.viewport.panning :global(.cell) {
		cursor: grabbing;
	}
	/*
	 * Grows with the blanket so the viewport scrolls once zoomed in, and stays
	 * viewport-sized when it fits, which centres the quilt.
	 */
	.canvas {
		display: flex;
		align-items: center;
		justify-content: center;
		width: max-content;
		height: max-content;
		min-width: 100%;
		min-height: 100%;
	}
	.minimap-slot {
		position: absolute;
		right: 0.75rem;
		bottom: 0.75rem;
		z-index: 4;
	}

	/*
	 * Headers align to the blanket's tracks by repeating its column and row
	 * template, its 1px gaps, and padding that matches its 2px border.
	 */
	.sheet {
		display: grid;
		grid-template-columns: auto auto;
		grid-template-rows: auto auto;
		align-items: start;
	}
	.col-headers {
		display: grid;
		gap: 1px;
		padding: 0 2px;
		box-sizing: border-box;
	}
	.row-headers {
		display: grid;
		gap: 1px;
		padding: 2px 0;
		box-sizing: border-box;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.6;
	}
	.row-headers .head {
		padding-right: 0.35rem;
	}

	.blanket {
		position: relative;
		display: grid;
		gap: 1px;
		background: var(--qb-line);
		border: 2px solid #1a1a1a;
		/* Width and height are set from the fit, so the border must sit inside. */
		box-sizing: border-box;
	}
	.cell {
		position: relative;
		border: none;
		padding: 0;
		background: #fff;
		/* pan-y keeps the page scrollable on touch; horizontal drags still paint. */
		touch-action: pan-y;
		line-height: 0;
		cursor: cell;
	}
	.cell svg {
		width: 100%;
		height: 100%;
		display: block;
	}
	.locked .cell {
		cursor: not-allowed;
	}
	.tool-erase .cell {
		cursor: crosshair;
	}

	.tool-mouse .cell {
		cursor: pointer;
	}
	.tool-grid .cell {
		cursor: crosshair;
	}
	.copying .cell {
		cursor: copy;
	}
	/*
	 * Outlines, not inset box-shadows. Each cell's svg covers it exactly, and
	 * an inset shadow paints UNDER child content, so every one of these was
	 * invisible. Outlines paint above descendants, which is why the focus ring
	 * was the only state that ever showed. Negative offsets keep them inside
	 * the cell so they do not overlap the neighbour.
	 *
	 * Source order is the precedence: hover, then selected, then focus.
	 */
	.cell.hovered {
		outline: 2px solid rgba(0, 0, 0, 0.35);
		outline-offset: -2px;
		z-index: 1;
	}
	/* With the mouse tool, hover previews what a click would select. */
	.tool-mouse .cell.hovered {
		outline-color: rgba(199, 102, 228, 0.7);
	}
	.cell.selected,
	.tool-mouse .cell.selected {
		outline: 3px solid var(--qb-accent);
		outline-offset: -3px;
		z-index: 2;
	}
	/*
	 * Absolute, so it does not take part in auto-placement: as a grid ITEM it
	 * occupied tracks and shoved every cell along while a drag was in flight.
	 * Placed by grid line, so it still lines up exactly with the tracks.
	 */
	.lasso {
		position: absolute;
		/* Fills its grid area: without this it collapses to its own content. */
		inset: 0;
		pointer-events: none;
		z-index: 3;
		border: 1.5px dashed var(--qb-accent);
		background: rgba(199, 102, 228, 0.1);
	}
	.cell:focus-visible {
		outline: 3px solid var(--qb-accent);
		outline-offset: -3px;
		z-index: 3;
	}
	polygon.ghost {
		opacity: 0.7;
		stroke: rgba(0, 0, 0, 0.7);
		stroke-dasharray: 4 3;
		stroke-width: 1.5;
	}
	polygon.erasing {
		opacity: 0.25;
	}
	/* Seams between composed children read heavier than seams inside one. */
	rect.seam {
		fill: none;
		stroke: rgba(0, 0, 0, 0.32);
		stroke-width: 1.75;
		vector-effect: non-scaling-stroke;
	}

	.readout {
		margin: 0.9rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.caption {
		margin: 0.35rem 0 0;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.zoom {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}
	.zoom-level {
		min-width: 3.5rem;
	}
	.zoom-hint {
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.25rem 1rem;
		margin-top: 0.75rem;
	}

	.action {
		border: none;
		background: none;
		padding: 0.2rem 0;
		font: inherit;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.action kbd {
		font: inherit;
		opacity: 0.6;
	}
	.action:hover:not(:disabled),
	.action.active {
		color: var(--color-text-strong);
	}
	.action.active {
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}
	.action:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.export {
		margin-top: 2.5rem;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #1d4ed8;
		cursor: pointer;
	}
	.export:hover:not(:disabled) {
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}
	.export:disabled {
		opacity: 0.35;
		cursor: default;
	}
</style>
