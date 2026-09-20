<script lang="ts">
	import { tick } from 'svelte';
	import { CUSTOM_SIZE_ID, MAX_CUSTOM_INCHES, MIN_CUSTOM_INCHES, QUILT_SIZES } from './data';
	import Minimap from './Minimap.svelte';
	import { ROLE_FILL, toPolygonPoints } from './geometry';
	import {
		colOf,
		columnLabel,
		pieceKey,
		rectAt,
		divisionOf,
		dominantFabric,
		flatten,
		isEmpty,
		leafRects,
		rowOf,
		walkLeaves,
		type Block,
		type FlatPiece
	} from './model';
	import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, type QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const VB = 100;

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#ffffff') : '#ffffff';

	/*
	 * A shape can be placed before it has any fabric. Its pieces are then drawn
	 * in the greys the palette icons use, so it still reads as the shape it is.
	 * Blank space stays blank.
	 */
	const fillOf = (piece: FlatPiece): string =>
		piece.fabric
			? hexOf(piece.fabric)
			: piece.shaped
				? (ROLE_FILL[piece.role] ?? '#ffffff')
				: '#ffffff';

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
			return store.selection.length
				? null
				: 'Drag a box to select filled squares · hold ⌘ or Ctrl for empty ones, or to click into a piece';
		}
		if (store.tool === 'grid') return 'Click or drag to paint the grid chosen on the left';
		if (store.tool === 'paint') return 'Click or drag to color pieces without recutting them';
		return null;
	});

	const finishedW = $derived(store.dims.cols * store.blockSize);
	const finishedH = $derived(store.dims.rows * store.blockSize);

	// ── Zoom and pan ─────────────────────────────────────────────────

	let viewport = $state<HTMLElement | null>(null);
	/* The visible area: what the quilt is centred in and the minimap reports. */
	let viewW = $state(0);
	let viewH = $state(0);
	/* The scroller's own box, which its scrollbars do not change. */
	let boxW = $state(0);
	let boxH = $state(0);
	let gutter = $state(0);
	let scrollX = $state(0);
	let scrollY = $state(0);

	const aspect = $derived(store.dims.cols / store.dims.rows);

	/*
	 * Size at zoom 1: the whole quilt, contained in the viewport. The headers
	 * sit in their own gutters outside the scroller, so the viewport's own
	 * size is already the space available; the slack just keeps the border off
	 * the edge so fitting never raises a scrollbar.
	 *
	 * Measured against the scroller's box rather than its visible area, and a
	 * scrollbar's width held back from it. A scrollbar shrinks the visible
	 * area, so sizing the quilt to that let the two chase each other: the
	 * quilt grew past the viewport, a scrollbar appeared, the quilt shrank to
	 * fit what was left, the scrollbar went away, and around again. It showed
	 * as a flicker at whatever zoom sat on the threshold.
	 */
	const FIT_SLACK = 8;
	const base = $derived.by(() => {
		// The gutter comes off the width: a scrollbar down the side is the one
		// that can be there at zoom 1, and nothing overflows sideways until
		// the quilt is already taller than the viewport.
		const availW = boxW - FIT_SLACK - gutter;
		const availH = boxH - FIT_SLACK;
		if (availW <= 0 || availH <= 0) return { w: 0, h: 0 };
		const w = Math.max(Math.min(availW, availH * aspect), 80);
		return { w, h: w / aspect };
	});

	const content = $derived({ w: base.w * store.zoom, h: base.h * store.zoom });
	const zoomed = $derived(content.w > viewW + 1 || content.h > viewH + 1);

	/*
	 * The canvas centres the quilt when it is smaller than the viewport. The
	 * labels have to cross that slack to stay beside the quilt, otherwise they
	 * sit marooned at the far edge of the wall when fully zoomed out.
	 */
	const slack = $derived({
		x: Math.max(0, (viewW - content.w) / 2),
		y: Math.max(0, (viewH - content.h) / 2)
	});

	/** Where the quilt's top-left corner sits: slack and scroll together. */
	const offset = $derived({ x: slack.x - scrollX, y: slack.y - scrollY });

	/*
	 * How much room a scrollbar takes, measured once. Zero where scrollbars
	 * overlay the content, as they do on a Mac, so nothing is held back there.
	 */
	const scrollbarSize = (el: HTMLElement): number => {
		const probe = document.createElement('div');
		probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll';
		document.body.append(probe);
		const size = probe.offsetWidth - probe.clientWidth;
		probe.remove();
		// Either the gutter already held open, or what one would take.
		return Math.max(size, el.offsetWidth - el.clientWidth);
	};

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
			boxW = el.offsetWidth;
			boxH = el.offsetHeight;
			readView();
		};
		gutter = scrollbarSize(el);
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

	/*
	 * A click on the wall away from any square lets the selection go, the way
	 * clicking off a shape does anywhere else. Only the wall: the palette acts
	 * on the selection, so clearing it on the way to a control there would
	 * undo the thing the click was for.
	 */
	const onWallDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest('[data-cell-index]')) return;
		store.clearSelection();
	};

	/*
	 * Seams and piece outlines are non-scaling strokes, a fixed weight in
	 * device pixels. Against a 4x4 block zoomed out that weight swamps the
	 * pieces themselves, and neighbouring leaves each draw their own seam, so
	 * shared edges come out doubled. Fade both with how big a sub-cell
	 * actually is on screen: full detail when there is room, nothing at all
	 * once the pieces are only a few pixels across.
	 */
	const blockPx = $derived(store.dims.cols ? content.w / store.dims.cols : 0);

	const ramp = (value: number, lo: number, hi: number) =>
		Math.min(1, Math.max(0, (value - lo) / (hi - lo)));

	const detailAt = (division: number) => ramp(blockPx / Math.max(1, division), 8, 26);

	/** Which piece of a given square is selected, and which is alt-hovered. */
	const marksFor = (index: number) => {
		const selected = store.selectedPiece;
		const hovered = store.hoverPiece;
		return {
			selected:
				selected && selected.cell === index ? pieceKey(selected.path, selected.piece) : null,
			hovered: hovered && hovered.cell === index ? pieceKey(hovered.path, hovered.piece) : null
		};
	};
</script>

<section class="wall">
	<!-- The quilt's name and size head the canvas, as the design places them. -->
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
	<!--
		Spoken, not shown. The selection is already plain from the outlines on
		the quilt, and naming every square wrapped over several lines once a few
		were selected; but somebody who cannot see those outlines still needs to
		be told what changed.
	-->
	<p class="readout sr-only" aria-live="polite">{store.selectionLabel}</p>
	<div class="wall-frame">
		<div class="banner-slot" aria-live="polite">
			{#if banner}
				<span class="banner">{banner}</span>
			{/if}
		</div>

		<div class="stage">
			<!--
				Headers live OUTSIDE the scroller and are translated by the scroll
				offset, so they stay pinned to the edges the way a spreadsheet
				freezes its row and column labels.
			-->
			<div class="corner" aria-hidden="true"></div>
			<div class="col-strip" aria-hidden="true" style="height: calc(var(--head-h) + {slack.y}px)">
				<div
					class="col-headers"
					style="grid-template-columns: repeat({store.dims
						.cols}, 1fr); width: {content.w}px; transform: translate({offset.x}px, {slack.y}px)"
				>
					{#each { length: store.dims.cols } as _, c (c)}
						<span class="head">{columnLabel(c)}</span>
					{/each}
				</div>
			</div>
			<div class="row-strip" aria-hidden="true" style="width: calc(var(--head-w) + {slack.x}px)">
				<div
					class="row-headers"
					style="grid-template-rows: repeat({store.dims
						.rows}, 1fr); height: {content.h}px; transform: translate({slack.x}px, {offset.y}px)"
				>
					{#each { length: store.dims.rows } as _, r (r)}
						<span class="head">{r + 1}</span>
					{/each}
				</div>
			</div>
			<!-- Presentational: Escape is the keyboard way to drop a selection. -->
			<div
				class="viewport"
				class:panning
				role="presentation"
				bind:this={viewport}
				onscroll={readView}
				onpointerdown={onWallDown}
			>
				<div class="canvas">
					<div
						class="blanket"
						class:tool-erase={store.tool === 'erase'}
						class:tool-mouse={store.tool === 'mouse'}
						class:copying={store.blockDrag?.mode === 'copy'}
						class:moving={store.blockDrag?.mode === 'move'}
						class:tool-grid={store.tool === 'grid'}
						class:tool-paint={store.tool === 'paint'}
						style="grid-template-columns: repeat({store.dims
							.cols}, 1fr); grid-template-rows: repeat({store.dims
							.rows}, 1fr); width: {content.w}px; height: {content.h}px"
					>
						{#if store.centerLines}
							{@const lines = store.centerLines}
							<div
								class="center-guide vertical"
								aria-hidden="true"
								style="grid-column: {lines.c0 + 1} / {lines.c1 + 2}; grid-row: 1 / -1"
							></div>
							<div
								class="center-guide horizontal"
								aria-hidden="true"
								style="grid-row: {lines.r0 + 1} / {lines.r1 + 2}; grid-column: 1 / -1"
							></div>
						{/if}
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
								(
									store.placePreview ??
									store.paintPreview ??
									store.gridPreview ??
									store.dragPreview
								)?.get(i) ?? null}
							{@const ev = store.erasePreview?.get(i) ?? null}
							{@const display = pv ?? cell}
							{@const pieces = flatten(display)}
							{@const before = pv ? new Map(flatten(cell).map((p) => [p.key, p.fabric])) : null}
							{@const pieceMarks = marksFor(i)}
							{@const detail = detailAt(divisionOf(display))}
							{@const after = ev ? new Map(flatten(ev).map((p) => [p.key, p.fabric])) : null}
							<button
								class="cell"
								class:hovered={store.hover?.index === i}
								class:selected={store.highlighted.has(i)}
								class:context={store.contextCell === i}
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
											fill={fillOf(piece)}
											class:ghost={before !== null &&
												(before.get(piece.key) ?? null) !== piece.fabric}
											class:erasing={after !== null &&
												piece.fabric !== null &&
												(after.get(piece.key) ?? null) !== piece.fabric}
											stroke={pieces.length > 1 && detail > 0
												? `rgba(0, 0, 0, ${0.18 * detail})`
												: 'none'}
											stroke-width="1"
											vector-effect="non-scaling-stroke"
										/>
									{/each}
									{#if store.selectedNode?.cell === i}
										{@const node = rectAt(display, store.selectedNode.path)}
										<rect
											class="node-outline"
											x={node.x * VB}
											y={node.y * VB}
											width={node.w * VB}
											height={node.h * VB}
										/>
									{/if}
									<!-- Drawn after the fills so the outline is not painted over. -->
									{#each pieces as piece (piece.key)}
										{#if pieceMarks.selected === piece.key || pieceMarks.hovered === piece.key}
											<polygon
												class="piece-outline"
												class:preview={pieceMarks.selected !== piece.key}
												points={toPolygonPoints(piece.points, VB)}
											/>
										{/if}
									{/each}
									{#if detail > 0}
										{#each leafRects(display) as seam, s (s)}
											<rect
												class="seam"
												x={seam.x * VB}
												y={seam.y * VB}
												width={seam.w * VB}
												height={seam.h * VB}
												style="opacity: {detail}"
											/>
										{/each}
									{/if}
								</svg>
							</button>
						{/each}
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

		<div class="actions">
			<button
				class="action"
				class:active={store.tool === 'place'}
				onclick={() => (store.tool = 'place')}
			>
				Place block <kbd>P</kbd>
			</button>
			<button
				class="action"
				class:active={store.tool === 'mouse'}
				onclick={() => (store.tool = 'mouse')}
			>
				Select <kbd>V</kbd>
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
				class:active={store.tool === 'paint'}
				onclick={() => (store.tool = 'paint')}
			>
				Paint <kbd>T</kbd>
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
		</div>

		<div class="wall-actions">
			<button
				class="action"
				class:active={store.panels.centerGuides}
				aria-pressed={store.panels.centerGuides}
				onclick={() => (store.panels.centerGuides = !store.panels.centerGuides)}
			>
				Show quilt center
			</button>
			<button class="action" onclick={() => store.clearAll()} disabled={store.filled === 0}>
				Clear quilt wall
			</button>
		</div>

		<div class="footer">
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

			<p class="caption">
				{store.dims.cols} × {store.dims.rows} blocks at {store.blockSize}” · {finishedW}” × {finishedH}”
				finished
			</p>
		</div>
	</div>
</section>

<style>
	.titlebar {
		flex-shrink: 0;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 2rem;
		padding: 0.7rem 2rem 0.6rem;
	}
	.quilt-name {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 1.05rem;
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
	.size select {
		font: inherit;
		font-size: 0.85rem;
		color: var(--color-text-strong);
		background: transparent;
		border: none;
		cursor: pointer;
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
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

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
		display: grid;
		--head-w: 2.25rem;
		--head-h: 1.5rem;
		grid-template-columns: var(--head-w) minmax(0, 1fr);
		grid-template-rows: var(--head-h) minmax(0, 1fr);
	}
	.viewport {
		grid-area: 2 / 2;
		height: 100%;
		overflow: auto;
		/*
		 * Hold the scrollbar's room open whether or not one is showing, so the
		 * visible area stops changing under the quilt as it grows. Costs
		 * nothing where scrollbars overlay the content, as on a Mac trackpad.
		 */
		scrollbar-gutter: stable;
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
	.corner {
		grid-area: 1 / 1;
	}
	/*
	 * Gutters clip their strip; the strip inside slides with the scroll. Each
	 * strip may grow past its track, across the centring slack, so the labels
	 * stay beside the quilt rather than pinned to the wall's edge. The tracks
	 * are a fixed size so that growth cannot feed back into the slack it was
	 * measured from.
	 */
	.col-strip {
		grid-area: 1 / 2;
		overflow: hidden;
		pointer-events: none;
		align-self: start;
	}
	.row-strip {
		grid-area: 2 / 1;
		overflow: hidden;
		pointer-events: none;
		justify-self: start;
	}
	.col-headers {
		display: grid;
		gap: 1px;
		/* Matches the blanket's 1px border so the labels line up exactly. */
		padding: 0 1px;
		box-sizing: border-box;
		will-change: transform;
	}
	.row-headers {
		display: grid;
		gap: 1px;
		padding: 1px 0;
		box-sizing: border-box;
		will-change: transform;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: center;
		height: var(--head-h);
		font-size: 0.8rem;
		color: var(--qb-ink);
		line-height: 1;
	}
	.row-headers {
		width: var(--head-w);
	}
	.row-headers .head {
		height: auto;
		justify-content: flex-end;
		padding-right: 0.45rem;
	}

	/*
	 * Rows are templated, not left implicit. An absolutely positioned child
	 * resolves -1 against the EXPLICIT grid, so a full-height guide collapsed
	 * to the first row while only the columns were declared.
	 */
	.blanket {
		position: relative;
		display: grid;
		gap: 1px;
		/*
		 * The design has no heavy frame: the quilt's outer edge is the same
		 * 1px rule as the seams between its squares.
		 */
		background: var(--qb-square);
		border: 1px solid var(--qb-square);
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
	.tool-erase .cell,
	.tool-paint .cell {
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
	.moving .cell {
		cursor: move;
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
	/* The square holding a drilled-in selection, so you keep your bearings. */
	.cell.context {
		outline: 1.5px dashed rgba(199, 102, 228, 0.4);
		outline-offset: -1px;
		z-index: 1;
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
	/*
	 * The piece rung of the selection ladder. Drawn as its own polygon after
	 * the fills, since a stroke on the filled polygon would be painted over by
	 * whichever piece is drawn next.
	 */
	polygon.piece-outline {
		fill: none;
		stroke: var(--qb-accent);
		stroke-width: 3;
		vector-effect: non-scaling-stroke;
	}
	polygon.piece-outline.preview {
		stroke-width: 2;
		stroke-dasharray: 4 3;
	}
	/* The middle rung: one block inside a composed square. */
	rect.node-outline {
		fill: none;
		stroke: var(--qb-accent);
		stroke-width: 3;
		vector-effect: non-scaling-stroke;
	}

	/*
	 * The seams inside a square: one device pixel, solid, in the same grey as
	 * the rules between squares. Every line on the quilt is drawn alike, so
	 * nothing about a subdivision catches the eye more than the quilt does.
	 * The design dashes these, but a dash against a pieced block reads as an
	 * artefact of the drawing rather than as a seam.
	 */
	rect.seam {
		fill: none;
		stroke: var(--qb-square);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	/*
	 * The middle of the quilt, drawn the way the design does: dashed lines
	 * running the full width and height. Placed by grid line rather than by
	 * percentage, so they land exactly on the seams between squares despite
	 * the blanket's gaps and border.
	 */
	.center-guide {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 4;
	}
	.center-guide.vertical {
		border-left: 2px dashed var(--qb-guide);
		border-right: 2px dashed var(--qb-guide);
	}
	.center-guide.horizontal {
		border-top: 2px dashed var(--qb-guide);
		border-bottom: 2px dashed var(--qb-guide);
	}

	/*
	 * One row under the tools: zoom at one end, the export at the other, and
	 * what the quilt comes to between them.
	 */
	/* Spelled out, on a line of their own: these act on the whole quilt. */
	.wall-actions {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 0.4rem;
	}
	.footer {
		width: 100%;
		margin-top: 0.4rem;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
	}
	/* The site gives every <p> vertical padding; this one sets its own room. */
	.caption {
		margin: 0;
		padding: 0;
		text-align: center;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.zoom {
		display: flex;
		align-items: center;
		justify-self: start;
		gap: 0.4rem;
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
</style>
