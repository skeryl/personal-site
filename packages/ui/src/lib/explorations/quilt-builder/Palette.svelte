<script lang="ts">
	import { FABRICS } from './data';
	import { LAYOUTS, SHAPE_AREA, rotatedSlots, toPolygonPoints, type LayoutId } from './geometry';
	import { CUT_DIMS, KIND_NOUN } from './cutting';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const VB = 100;

	/*
	 * The rectangle gets two palette entries (horizontal and vertical)
	 * instead of one entry plus a rotate step; rot pins the orientation.
	 * Entries with rot null keep whatever pending rotation is active, so R
	 * can spin them.
	 */
	const PALETTE: { layout: LayoutId; rot: number | null; label: string }[] = [
		{ layout: 'whole', rot: null, label: 'Square' },
		{ layout: 'half', rot: 0, label: 'Horizontal' },
		{ layout: 'half', rot: 1, label: 'Vertical' },
		{ layout: 'diagonal', rot: null, label: 'Triangle' },
		{ layout: 'quarters', rot: null, label: 'Half triangle' }
	];

	const fmt = (n: number): string =>
		Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
</script>

<aside class="palette">
	<h3>Piece</h3>
	<div class="pieces">
		{#each PALETTE as entry (entry.label)}
			<button
				class="tool-btn piece"
				class:active={store.tool === 'place' &&
					store.piece === entry.layout &&
					(entry.rot === null || store.rotation % 2 === entry.rot)}
				aria-pressed={store.tool === 'place' && store.piece === entry.layout}
				onclick={() => store.pickPiece(entry.layout, entry.rot)}
				title={CUT_DIMS[LAYOUTS[entry.layout].kind]}
			>
				<svg viewBox="0 0 {VB} {VB}" aria-hidden="true">
					{#each rotatedSlots(entry.layout, entry.rot ?? store.rotation) as slot, i (i)}
						<polygon
							points={toPolygonPoints(slot.points, VB)}
							fill={i === 0 ? 'var(--color-text-secondary)' : 'transparent'}
							stroke="var(--color-text-secondary)"
							stroke-width="3"
						/>
					{/each}
				</svg>
				<span>{entry.label}</span>
			</button>
		{/each}
	</div>

	<div class="group-label">Tools</div>
	<div class="palette-actions">
		<button
			class="tool-btn"
			class:active={store.tool === 'select'}
			aria-pressed={store.tool === 'select'}
			onclick={() => (store.tool = 'select')}
		>
			Mouse <kbd>V</kbd>
		</button>
		<button
			class="tool-btn"
			class:active={store.tool === 'erase'}
			aria-pressed={store.tool === 'erase'}
			onclick={() => (store.tool = 'erase')}
		>
			Eraser <kbd>E ⌫</kbd>
		</button>
	</div>

	<div class="group-label">Actions</div>
	<div class="palette-actions">
		<button class="tool-btn" onclick={() => store.rotate()}>Rotate <kbd>R</kbd></button>
		<button
			class="tool-btn"
			onclick={() => store.copySelection()}
			disabled={store.selection.length === 0}
		>
			Copy <kbd>⌘C</kbd>
		</button>
		<button
			class="tool-btn"
			onclick={() => store.pasteClipboard()}
			disabled={store.clipboard === null}
		>
			Paste <kbd>⌘V</kbd>
		</button>
		<button class="tool-btn" onclick={() => store.undo()} disabled={!store.canUndo}>
			Undo <kbd>⌘Z</kbd>
		</button>
		<button class="tool-btn" onclick={() => store.redo()} disabled={!store.canRedo}>
			Redo <kbd>⇧⌘Z</kbd>
		</button>
		<button class="tool-btn" onclick={() => store.clearAll()} disabled={store.filled === 0}>
			Clear
		</button>
	</div>

	<div class="group-label">Symmetry</div>
	<div class="palette-actions">
		<button
			class="tool-btn"
			class:active={store.symV}
			aria-pressed={store.symV}
			onclick={() => (store.symV = !store.symV)}
		>
			Vertical
		</button>
		<button
			class="tool-btn"
			class:active={store.symH}
			aria-pressed={store.symH}
			onclick={() => (store.symH = !store.symH)}
		>
			Horizontal
		</button>
	</div>
	{#if store.symV || store.symH}
		<p class="hint">
			Painting and erasing mirror across the axes. Drag a line on the blanket (or focus it and use
			the arrow keys) to move it.
		</p>
	{/if}

	<h3 class="scraps-head">The scrap pile</h3>
	<p class="hint">
		Counted in whole squares: a {KIND_NOUN.hst} uses half of one, a {KIND_NOUN.qst} a quarter.
	</p>
	<div class="swatches">
		{#each FABRICS as fabric (fabric.id)}
			{@const left = store.remaining[fabric.id]}
			{@const depleted = left < SHAPE_AREA[store.selectedKind]}
			<button
				class="swatch"
				class:active={store.fabric === fabric.id && store.tool === 'place'}
				class:depleted
				aria-disabled={depleted}
				onpointerdown={(e) => !depleted && store.startSwatchDrag(e, fabric.id)}
				onclick={() => store.pickFabric(fabric.id)}
				title={`${fabric.name}: ${fmt(left)} of ${fabric.count} squares left`}
			>
				<span class="chip" style="background: {fabric.hex}"></span>
				<span class="swatch-name">{fabric.name}</span>
				<span class="swatch-count">{fmt(left)}<span class="of">/{fabric.count}</span></span>
			</button>
		{/each}
	</div>
</aside>

<style>
	.palette h3 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
		color: var(--color-text-heading);
	}
	.scraps-head {
		margin-top: 1.75rem;
	}

	.pieces {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.4rem;
	}
	.piece {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.5rem 0.25rem;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.piece.active {
		color: var(--color-text-strong);
	}
	.piece svg {
		width: 2rem;
		height: 2rem;
	}

	.palette-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}

	.swatches {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.swatch {
		position: relative;
		display: grid;
		grid-template-columns: 1.4rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.82rem;
		text-align: left;
		cursor: grab;
		touch-action: pan-y;
	}
	.swatch:hover {
		background: var(--color-surface-active);
	}
	.swatch.active {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
	}
	/* Depletion needs a non-color cue on top of the dimming. */
	.swatch.depleted {
		opacity: 0.45;
		cursor: not-allowed;
		text-decoration: line-through;
	}
	.swatch-count {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}
	.of {
		color: var(--color-text-muted);
	}
</style>
