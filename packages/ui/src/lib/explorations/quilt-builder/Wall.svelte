<script lang="ts">
	import { isNamed } from './data';
	import { rotatedSlots, toPolygonPoints } from './geometry';
	import { colOf, isEmpty, rowOf, type Cell } from './model';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const VB = 100;

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#ffffff') : '#ffffff';

	const nameOf = (id: string | null): string =>
		id ? store.materialById.get(id)?.name.trim() || 'unnamed fabric' : 'empty';

	/** Position plus contents, so a screen reader can read the design. */
	const cellLabel = (index: number, cell: Cell): string => {
		const position = `Row ${rowOf(index, store.dims.cols) + 1}, column ${colOf(index, store.dims.cols) + 1}`;
		if (isEmpty(cell)) return `${position}: empty`;
		const names = [...new Set(cell.slots.filter((s) => s !== null).map(nameOf))];
		return `${position}: ${cell.layout.replace(/-/g, ' ')} in ${names.join(', ')}`;
	};

	const banner = $derived.by(() => {
		if (store.capturing) return 'Pick a block on the quilt to save it as a type';
		if (store.tool === 'erase') return null;
		if (!store.materials.length) return 'Add a fabric in Materials to start placing';
		if (!store.selectedMaterial) return 'Select a fabric in Materials to start placing';
		if (!isNamed(store.selectedMaterial)) return 'Name the selected fabric to start placing';
		return null;
	});

	const finishedW = $derived(store.dims.cols * store.blockSize);
	const finishedH = $derived(store.dims.rows * store.blockSize);
</script>

<section class="wall">
	<div class="wall-frame">
		<div class="banner-slot" aria-live="polite">
			{#if banner}
				<span class="banner" class:capturing={store.capturing}>{banner}</span>
			{/if}
		</div>

		<div
			class="blanket"
			class:tool-erase={store.tool === 'erase'}
			class:locked={store.tool === 'place' && !store.canPlace && !store.capturing}
			class:capturing={store.capturing}
			style="grid-template-columns: repeat({store.dims.cols}, 1fr); aspect-ratio: {store.dims
				.cols} / {store.dims.rows}"
		>
			{#each store.cells as cell, i (i)}
				{@const pv = store.placePreview?.index === i ? store.placePreview : null}
				{@const ev = store.erasePreview?.index === i ? store.erasePreview : null}
				{@const display = pv?.cell ?? cell}
				{@const sameShape = display.layout === cell.layout && display.rotation === cell.rotation}
				{@const eraseShape =
					ev !== null && ev.cell.layout === cell.layout && ev.cell.rotation === cell.rotation}
				<button
					class="cell"
					class:hovered={store.hover?.index === i}
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
						{#each rotatedSlots(display.layout, display.rotation) as slot, s (s)}
							{@const id = display.slots[s]}
							<polygon
								points={toPolygonPoints(slot.points, VB)}
								fill={hexOf(id)}
								class:ghost={pv !== null && (!sameShape || cell.slots[s] !== id)}
								class:erasing={ev !== null &&
									(!eraseShape || ev.cell.slots[s] === null) &&
									id !== null}
								stroke={display.slots.length > 1 ? 'rgba(0, 0, 0, 0.18)' : 'none'}
								stroke-width="1"
								vector-effect="non-scaling-stroke"
							/>
						{/each}
					</svg>
				</button>
			{/each}
		</div>

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
	}
	.wall-frame {
		background: var(--qb-wall);
		border: 1px solid var(--qb-line);
		padding: 1rem 2rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
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
	.banner.capturing {
		color: var(--qb-accent);
	}

	.blanket {
		position: relative;
		display: grid;
		width: 100%;
		max-width: 46rem;
		gap: 1px;
		background: var(--qb-line);
		border: 2px solid #1a1a1a;
	}
	.cell {
		position: relative;
		aspect-ratio: 1;
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
	.capturing .cell {
		cursor: copy;
	}
	.cell.hovered {
		box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.35);
		z-index: 1;
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

	.caption {
		margin: 1rem 0 0;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
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
