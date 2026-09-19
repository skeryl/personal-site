<script lang="ts">
	import { fmtInches, isNamed } from './data';
	import { toPolygonPoints } from './geometry';
	import {
		colOf,
		divisionOf,
		flatten,
		isEmpty,
		leafRects,
		rowOf,
		walkLeaves,
		type Block
	} from './model';
	import { DIVISIONS, type QuiltStore } from './state.svelte';

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
		if (store.capturing) return 'Pick a block on the quilt to save it as a type';
		if (store.tool === 'select') {
			return store.selectedBlock ? null : 'Click a block to change how it is composed';
		}
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
			class:tool-select={store.tool === 'select'}
			class:locked={store.tool === 'place' && !store.canPlace && !store.capturing}
			class:capturing={store.capturing}
			style="grid-template-columns: repeat({store.dims.cols}, 1fr); aspect-ratio: {store.dims
				.cols} / {store.dims.rows}"
		>
			{#each store.cells as cell, i (i)}
				{@const pv = store.placePreview?.index === i ? store.placePreview.block : null}
				{@const ev = store.erasePreview?.index === i ? store.erasePreview.block : null}
				{@const display = pv ?? cell}
				{@const pieces = flatten(display)}
				{@const before = pv ? new Map(flatten(cell).map((p) => [p.key, p.fabric])) : null}
				{@const after = ev ? new Map(flatten(ev).map((p) => [p.key, p.fabric])) : null}
				<button
					class="cell"
					class:hovered={store.hover?.index === i}
					class:selected={store.selectedIndex === i}
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
								class:ghost={before !== null && (before.get(piece.key) ?? null) !== piece.fabric}
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
				class:active={store.tool === 'select'}
				onclick={() => (store.tool = 'select')}
			>
				Select <kbd>S</kbd>
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

		{#if store.selectedBlock}
			<div class="composition" role="group" aria-label="Block composition">
				<span class="composition-label">Composition</span>
				{#each DIVISIONS as division (division)}
					<button
						class="chip"
						class:active={store.selectedDivision === division}
						aria-pressed={store.selectedDivision === division}
						onclick={() => store.setComposition(division)}
					>
						{division === 1 ? '1' : `${division}×${division}`}
						<span class="chip-size">{fmtInches(store.blockSize / division)}”</span>
					</button>
				{/each}
				<button class="chip done" onclick={() => store.select(null)}>Done</button>
			</div>
		{/if}

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
	.tool-select .cell {
		cursor: pointer;
	}
	.cell.selected {
		box-shadow: inset 0 0 0 3px var(--qb-accent);
		z-index: 2;
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
	/* Seams between composed children read heavier than seams inside one. */
	rect.seam {
		fill: none;
		stroke: rgba(0, 0, 0, 0.32);
		stroke-width: 1.75;
		vector-effect: non-scaling-stroke;
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

	.composition {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		margin-top: 0.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--qb-line);
		background: #fff;
	}
	.composition-label {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin-right: 0.25rem;
	}
	.chip {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--qb-line);
		background: none;
		color: var(--color-text-strong);
		cursor: pointer;
	}
	.chip:hover,
	.chip.active {
		border-color: var(--color-text-strong);
	}
	.chip.active {
		background: var(--qb-accent);
		border-color: var(--qb-accent);
		color: #fff;
	}
	.chip-size {
		font-size: 0.7rem;
		opacity: 0.7;
	}
	.chip.done {
		margin-left: 0.25rem;
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
