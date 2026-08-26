<script lang="ts">
	import { COLS, FABRIC_BY_ID, ROWS, SQUARE_INCHES, inchesToFeet } from './data';
	import { LAYOUTS, rotatedSlots, toPolygonPoints } from './geometry';
	import { KIND_NOUN } from './cutting';
	import { CELL_COUNT, colOf, isEmpty, rowOf, type Cell } from './model';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const VB = 100;
	let blanket = $state<HTMLElement | null>(null);
	$effect(() => {
		store.blanketEl = blanket;
	});

	const widthIn = COLS * SQUARE_INCHES;
	const heightIn = ROWS * SQUARE_INCHES;

	const drag = $derived(
		store.gesture?.kind === 'slot-drag' || store.gesture?.kind === 'group-drag'
			? store.gesture
			: null
	);
	const marquee = $derived(store.gesture?.kind === 'marquee' ? store.gesture : null);

	/** Position plus contents, so a screen reader can read the design. */
	const cellLabel = (index: number, cell: Cell): string => {
		const position = `Row ${rowOf(index) + 1}, column ${colOf(index) + 1}`;
		if (isEmpty(cell)) return `${position}: empty`;
		const defs = LAYOUTS[cell.layout].slots;
		const pieces = cell.slots
			.map((id, i) => (id ? `${FABRIC_BY_ID[id].name} ${KIND_NOUN[defs[i].kind]}` : null))
			.filter((piece): piece is string => piece !== null);
		return `${position}: ${pieces.join(', ')}`;
	};

	const onAxisKey = (e: KeyboardEvent, axis: 'v' | 'h') => {
		const delta =
			e.key === 'ArrowLeft' || e.key === 'ArrowUp'
				? -1
				: e.key === 'ArrowRight' || e.key === 'ArrowDown'
					? 1
					: 0;
		if (!delta) return;
		e.preventDefault();
		e.stopPropagation();
		store.nudgeAxis(axis, delta);
	};
</script>

<div class="wall-side">
	<div class="wall-title-row">
		<input
			class="wall-title"
			type="text"
			placeholder="Untitled pattern"
			aria-label="Pattern name"
			maxlength="40"
			bind:value={store.patternName}
			onblur={() => store.commitName()}
			onkeydown={(e) => {
				if (e.key === 'Enter') e.currentTarget.blur();
			}}
		/>
		{#if store.currentId === null}
			<span class="unsaved-tag">unsaved</span>
		{/if}
	</div>

	<div class="wall">
		<div
			class="blanket"
			bind:this={blanket}
			class:tool-select={store.tool === 'select'}
			class:tool-place={store.tool === 'place'}
			class:tool-erase={store.tool === 'erase'}
			style="grid-template-columns: repeat({COLS}, 1fr); aspect-ratio: {COLS} / {ROWS}"
		>
			{#each store.cells as cell, i (i)}
				{@const pv = store.placePreview?.index === i ? store.placePreview : null}
				{@const ev = store.erasePreview?.index === i ? store.erasePreview : null}
				{@const gv = store.groupPreview?.get(i) ?? null}
				{@const mv =
					store.placePreview !== null && store.placePreview.index !== i
						? (store.placePreview.mirrors.get(i) ?? null)
						: null}
				{@const display = gv ?? mv ?? (pv && !pv.blocked ? pv.cell : cell)}
				<button
					class="cell"
					class:hovered={store.hover?.index === i}
					class:selected={store.selectedSet.has(i)}
					class:blocked={pv?.blocked}
					class:lifted={store.groupPreview !== null &&
						drag?.kind === 'group-drag' &&
						!drag.copy &&
						store.selectedSet.has(i)}
					data-cell-index={i}
					aria-label={cellLabel(i, cell)}
					aria-pressed={store.selectedSet.has(i)}
					onpointerdown={(e) => store.onCellPointerDown(e, i)}
					onclick={(e) => {
						// detail 0 = keyboard activation; pointer clicks are
						// handled by the pointer gesture machinery.
						if (e.detail === 0) store.activateCell(i);
					}}
					oncontextmenu={(e) => {
						e.preventDefault();
						store.contextRotate(i);
					}}
				>
					<svg viewBox="0 0 {VB} {VB}" preserveAspectRatio="none" aria-hidden="true">
						{#each rotatedSlots(display.layout, display.rotation) as slot, s (s)}
							{@const id = display.slots[s]}
							<polygon
								points={toPolygonPoints(slot.points, VB)}
								fill={id ? FABRIC_BY_ID[id].hex : '#ffffff'}
								class:ghost={gv !== null ||
									mv !== null ||
									(pv !== null && s === pv.slot && !pv.blocked)}
								class:erasing={ev !== null && s === ev.slot}
								stroke={display.slots.length > 1 ? 'rgba(0, 0, 0, 0.18)' : 'none'}
								stroke-width="1"
								vector-effect="non-scaling-stroke"
							/>
						{/each}
					</svg>
				</button>
			{/each}

			{#if store.symV}
				<div
					class="axis axis-v"
					role="slider"
					tabindex="0"
					aria-label="Vertical symmetry axis"
					aria-orientation="vertical"
					aria-valuemin="1"
					aria-valuemax={2 * COLS - 1}
					aria-valuenow={store.axisV}
					style="left: {(store.axisV / (2 * COLS)) * 100}%"
					onpointerdown={(e) => {
						e.stopPropagation();
						store.startAxisDrag(e, 'v');
					}}
					onkeydown={(e) => onAxisKey(e, 'v')}
				></div>
			{/if}
			{#if store.symH}
				<div
					class="axis axis-h"
					role="slider"
					tabindex="0"
					aria-label="Horizontal symmetry axis"
					aria-orientation="horizontal"
					aria-valuemin="1"
					aria-valuemax={2 * ROWS - 1}
					aria-valuenow={store.axisH}
					style="top: {(store.axisH / (2 * ROWS)) * 100}%"
					onpointerdown={(e) => {
						e.stopPropagation();
						store.startAxisDrag(e, 'h');
					}}
					onkeydown={(e) => onAxisKey(e, 'h')}
				></div>
			{/if}
		</div>
	</div>

	<p class="wall-caption">
		{COLS} × {ROWS} squares at {SQUARE_INCHES}" ({inchesToFeet(widthIn)} × {inchesToFeet(heightIn)} finished);
		{store.filled} of {CELL_COUNT} cells started. Pick a piece and color, then click or drag to paint.
		The mouse tool selects squares (shift-click, shift-drag, or arrow keys for more): R or right-click
		rotates, delete removes, drag moves, alt-drag duplicates. ⌘C copies the selection and ⌘V pastes it
		at the cursor. ⌘Z undoes, ⇧⌘Z redoes.
	</p>
</div>

{#if marquee?.active}
	<div
		class="marquee"
		style="left: {Math.min(marquee.x0, marquee.x)}px; top: {Math.min(
			marquee.y0,
			marquee.y
		)}px; width: {Math.abs(marquee.x - marquee.x0)}px; height: {Math.abs(marquee.y - marquee.y0)}px"
	></div>
{/if}

{#if drag?.active}
	<div
		class="drag-ghost"
		style="left: {drag.x}px; top: {drag.y}px; background: {FABRIC_BY_ID[drag.fabricId].hex}"
	>
		{#if drag.kind === 'group-drag' || drag.copy}
			<span class="ghost-badge">
				{drag.kind === 'group-drag' ? `×${store.selection.length}` : ''}{drag.copy ? '+' : ''}
			</span>
		{/if}
	</div>
{/if}

<style>
	.wall-title-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
	}
	/* A title that is secretly an input: plain text at rest, obviously
	   editable on hover, a real field when focused. */
	.wall-title {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--color-text-strong);
		background: none;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		padding: 0.1rem 0.4rem;
		margin-left: -0.4rem;
	}
	.wall-title:hover {
		border-color: var(--color-border);
		background: var(--color-surface-active);
		cursor: text;
	}
	.wall-title:focus {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
		outline: none;
	}
	.unsaved-tag {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		border: 1px dashed var(--color-border-strong);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		white-space: nowrap;
	}

	/* The design wall: a neutral backdrop so the fabric colours read true. */
	.wall {
		background: var(--qb-wall, #616161);
		padding: 1.25rem;
		border-radius: 0.5rem;
	}
	.blanket {
		position: relative;
		display: grid;
		width: 100%;
		gap: 1px;
		background: #b0b0b0;
		border: 1px solid #3a3a3a;
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
	}
	.cell svg {
		width: 100%;
		height: 100%;
		display: block;
	}
	.tool-select .cell {
		cursor: pointer;
	}
	.tool-place .cell {
		cursor: cell;
	}
	.tool-place .cell.blocked {
		cursor: not-allowed;
	}
	.tool-erase .cell {
		cursor: crosshair;
	}
	.cell.hovered {
		box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.45);
		z-index: 1;
	}
	.cell:focus-visible {
		outline: 3px solid var(--qb-accent);
		outline-offset: -3px;
		z-index: 3;
	}
	.cell.selected {
		z-index: 2;
	}
	/* Drawn on top of the fabric so selection reads on any color. */
	.cell.selected::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 3px solid var(--qb-accent);
		box-shadow:
			inset 0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 8px rgba(245, 158, 11, 0.7);
		pointer-events: none;
	}
	polygon.ghost {
		opacity: 0.55;
		stroke: rgba(0, 0, 0, 0.6);
		stroke-dasharray: 4 3;
		stroke-width: 1.5;
	}
	polygon.erasing {
		opacity: 0.3;
	}
	/* Group-move sources fade while their ghost shows at the destination. */
	.cell.lifted svg {
		opacity: 0.35;
	}

	.axis {
		position: absolute;
		z-index: 5;
		touch-action: none;
	}
	.axis:focus-visible {
		outline: 2px solid var(--qb-accent);
	}
	.axis-v {
		top: 0;
		bottom: 0;
		width: 14px;
		transform: translateX(-50%);
		cursor: col-resize;
	}
	.axis-h {
		left: 0;
		right: 0;
		height: 14px;
		transform: translateY(-50%);
		cursor: row-resize;
	}
	.axis-v::before,
	.axis-h::before {
		content: '';
		position: absolute;
		background: var(--qb-axis-v);
		opacity: 0.8;
	}
	.axis-v::before {
		left: 50%;
		top: 0;
		bottom: 0;
		width: 3px;
		transform: translateX(-50%);
	}
	.axis-h::before {
		top: 50%;
		left: 0;
		right: 0;
		height: 3px;
		transform: translateY(-50%);
		background: var(--qb-axis-h);
	}

	.wall-caption {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0.6rem 0 0;
	}

	.marquee {
		position: fixed;
		border: 1.5px dashed var(--qb-accent);
		background: rgba(245, 158, 11, 0.12);
		pointer-events: none;
		z-index: 40;
	}
	.drag-ghost {
		position: fixed;
		width: 2.5rem;
		height: 2.5rem;
		margin: -1.25rem 0 0 -1.25rem;
		border: 1px solid rgba(0, 0, 0, 0.3);
		border-radius: 0.125rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		pointer-events: none;
		z-index: 50;
	}
	.ghost-badge {
		position: absolute;
		top: -0.55rem;
		right: -0.55rem;
		background: #1f2937;
		color: #fff;
		font-size: 0.65rem;
		line-height: 1;
		padding: 0.2rem 0.35rem;
		border-radius: 999px;
	}
</style>
