<script lang="ts">
	/*
	 * The palette, in the order the design lays it out: block size, block grid,
	 * block type, block patterns, attributes.
	 *
	 * There are no Block/Piece tabs. The difference between them was never
	 * about which palette you were looking at, it was what a click does: a cut
	 * recuts the piece under the cursor, a block type stamps the whole square.
	 * That is a property of the thing you picked, so the list can be flat and
	 * the store works it out.
	 */

	import { BINDINGS, BLOCK_SIZES, SEAM_ALLOWANCES, fmtFraction, fmtInches } from './data';
	import Dropdown from './Dropdown.svelte';
	import { BLOCK_TYPES } from './blocks';
	import { PIECE_CUTS, ROLE_FILL } from './geometry';
	import { flatten, leafBlock, rotateBlock, type Block } from './model';
	import { boundsOf, rotatePattern } from './pattern';
	import AttributesPanel from './AttributesPanel.svelte';
	import BlockSvg from './BlockSvg.svelte';
	import PatternSvg from './PatternSvg.svelte';
	import { DIVISIONS, PATTERN_PREFIX, type QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	/** Icon fills: dark for the fabric role, light for background, white for empty. */
	const roleFills = (block: Block): string[] =>
		flatten(block).map((p) => ROLE_FILL[p.role] ?? '#ffffff');

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#fff') : '#fff';

	/*
	 * Everything that fills exactly one square: the cuts, which paint, and the
	 * block types, which stamp.
	 *
	 * Only the armed one turns with R. The palette is a list of what the shapes
	 * are, and spinning every icon in it to show the turn of the one about to
	 * be placed made the list hard to read. Leaving the rest at their own
	 * identity also keeps the flatten cache hitting.
	 */
	const armedCut = $derived(store.tab === 'piece' ? store.pieceId : null);
	const armedBlock = $derived(store.tab === 'block' ? store.blockId : null);

	const cutEntries = $derived(
		PIECE_CUTS.map((cut) => ({
			cut,
			block: leafBlock(cut.id, cut.id === armedCut ? store.rotation : 0)
		}))
	);
	const blockEntries = $derived(
		BLOCK_TYPES.map((type) => ({
			type,
			block: type.id === armedBlock ? rotateBlock(type.block, store.rotation) : type.block
		}))
	);
	const patternEntries = $derived(
		store.patterns.map((saved) => {
			const armed = `${PATTERN_PREFIX}${saved.id}` === armedBlock;
			const blocks = armed ? rotatePattern(saved.blocks, store.rotation) : saved.blocks;
			const { w, h } = boundsOf(blocks);
			return { saved, blocks, size: w === 1 && h === 1 ? null : `${w}×${h}` };
		})
	);

	const selectedCount = $derived(store.selection.length);
	const capturableCount = $derived(store.capturable.length);
</script>

<aside class="side">
	<!-- The dimensions the whole design is cut to, along the top. -->
	<div class="dimensions">
		<Dropdown
			label="Block size:"
			display={`${store.blockSize}”`}
			value={String(store.blockSize)}
			choices={BLOCK_SIZES.map((size) => ({ value: String(size), label: `${size}”` }))}
			onpick={(next) => store.setBlockSize(Number(next))}
		/>
		<Dropdown
			label="Seam allowance:"
			display={fmtFraction(store.seamInches)}
			value={String(store.seamInches)}
			title="Added to every side of every blank in the cutting list"
			choices={SEAM_ALLOWANCES.map((inches) => ({
				value: String(inches),
				label: `${fmtFraction(inches)}”`
			}))}
			onpick={(next) => (store.seamInches = Number(next))}
		/>
		<Dropdown
			label="Binding"
			display={`${fmtFraction(store.bindingInches)}”`}
			value={String(store.bindingInches)}
			choices={BINDINGS.map((inches) => ({
				value: String(inches),
				label: `${fmtFraction(inches)}”`
			}))}
			onpick={(next) => (store.bindingInches = Number(next))}
		/>
	</div>

	<details class="group" data-panel="type" bind:open={store.panels.type}>
		<summary class="label section">Block type</summary>
		<div class="group-scroll">
			<div class="types">
				{#each cutEntries as entry (entry.cut.id)}
					<button
						class="type"
						class:active={store.tab === 'piece' && store.pieceId === entry.cut.id}
						aria-pressed={store.tab === 'piece' && store.pieceId === entry.cut.id}
						aria-label={entry.cut.name}
						title={entry.cut.name}
						onclick={() => store.pickPiece(entry.cut.id)}
					>
						<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
					</button>
				{/each}
				{#each blockEntries as entry (entry.type.id)}
					<button
						class="type"
						class:active={store.tab === 'block' && store.blockId === entry.type.id}
						aria-pressed={store.tab === 'block' && store.blockId === entry.type.id}
						aria-label={entry.type.name}
						title={entry.type.name}
						onclick={() => store.pickBlock(entry.type.id)}
					>
						<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
					</button>
				{/each}
			</div>
		</div>
	</details>

	<details class="group" data-panel="patterns" bind:open={store.panels.patterns}>
		<summary class="label section">Block patterns</summary>
		<div class="group-scroll">
			{#if patternEntries.length}
				<div class="types">
					{#each patternEntries as entry (entry.saved.id)}
						<div class="saved">
							<button
								class="type"
								class:active={store.selectedPattern?.id === entry.saved.id}
								aria-pressed={store.selectedPattern?.id === entry.saved.id}
								aria-label={entry.saved.name}
								title={entry.saved.name}
								onclick={() => store.pickPattern(entry.saved.id)}
							>
								<PatternSvg blocks={entry.blocks} fillOf={hexOf} />
							</button>
							<span class="saved-name">
								{entry.saved.name}{#if entry.size}<span class="saved-size">{entry.size}</span>{/if}
							</span>
							<button
								class="saved-remove"
								aria-label={`Remove ${entry.saved.name}`}
								title="Remove"
								onclick={() => store.deletePattern(entry.saved.id)}
							>
								×
							</button>
						</div>
					{/each}
				</div>
			{/if}
			<button class="add-new" disabled={!capturableCount} onclick={() => store.capturePattern()}>
				+ Add selection as pattern
			</button>
			{#if !capturableCount}
				<p class="hint">
					{selectedCount
						? 'Those blocks are empty; fill one to save it.'
						: 'Select filled blocks on the quilt to save them as a pattern.'}
				</p>
			{/if}
		</div>
	</details>

	<section class="pane">
		<h2 class="label section">Attributes</h2>
		<div class="pane-scroll">
			<div class="grid-section" data-panel="grid">
				<div class="label section">Block grid <kbd>G</kbd></div>
				<div class="composition" role="group" aria-label="Block grid">
					{#each DIVISIONS as division (division)}
						{@const label = division === 1 ? 'One piece' : `${division} by ${division}`}
						{@const weight = store.activeDivision === division ? 1.5 : 1}
						<button
							class="chip"
							class:active={store.activeDivision === division}
							aria-pressed={store.activeDivision === division}
							aria-label={label}
							title={`${label}, ${fmtInches(store.blockSize / division)}” pieces`}
							onclick={() => store.setGrid(division)}
						>
							<!--
						The tile IS the block, divided by dashed seams. The viewBox is
						the design's own 102 x 103.378, and the panel renders it at
						exactly that size, so stroke and dash values are literal pixels.
						Seams run edge to edge, as they do in the design.

						The frame is drawn in the svg rather than as a CSS border
						because browsers round border-width to whole pixels, which
						flattened the chosen tile's 1.5px rule back to 1px.
					-->
							<svg
								class="chip-grid"
								viewBox="0 0 102 103.378"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<rect
									class="chip-frame"
									x={weight / 2}
									y={weight / 2}
									width={102 - weight}
									height={103.378 - weight}
									stroke-width={weight}
								/>
								{#each { length: division - 1 } as _, i (i)}
									{@const x = ((i + 1) * 102) / division}
									{@const y = ((i + 1) * 103.378) / division}
									<line x1={x} y1="0" x2={x} y2="103.378" stroke-width={weight} />
									<line x1="0" y1={y} x2="102" y2={y} stroke-width={weight} />
								{/each}
							</svg>
							<span class="chip-label">
								{division === 1 ? '(1)' : `(${division}X${division})`}
							</span>
						</button>
					{/each}
				</div>

				<p class="hint">
					{#if selectedCount}
						{selectedCount === 1
							? '1 block selected'
							: `${selectedCount} blocks selected`}{store.selectedDivision === 0
							? ', mixed grids'
							: ''}
					{:else if store.tool === 'grid'}
						Click or drag on the quilt to paint this grid.
					{:else if store.tool === 'place'}
						Pieces you place land at this grid. Hold alt to cover a whole square.
					{:else}
						Pick a grid to paint it on, or
						<button class="link" onclick={() => (store.tool = 'mouse')}>select</button>
						blocks to change theirs.
					{/if}
				</p>
			</div>

			<AttributesPanel {store} />
		</div>
	</section>

	<div class="trailer">
		<button
			class="export"
			onclick={() => store.exportMaterialsList()}
			disabled={!store.cutting.length}
		>
			Export materials list
		</button>
	</div>
</aside>

<style>
	/*
	 * Four bands: the dimensions, the shapes to choose from, what is selected,
	 * and the export. Only the shapes scroll with the page; Attributes and the
	 * export stay put at the foot of the panel, because they are what you
	 * reach for while looking at the quilt rather than while browsing.
	 */
	.side {
		display: flex;
		flex-direction: column;
		background: var(--qb-panel);
		border-right: 1px solid var(--qb-line);
		font-family: var(--qb-mono);
		min-height: 0;
	}
	/* The dimensions and the export hold their own height at either end. */
	.dimensions,
	.trailer {
		flex: none;
	}
	/*
	 * Three sections of equal height, each scrolling inside itself. The
	 * headings stay where they are however long the lists get, so the panel
	 * as a whole never scrolls and nothing you are reaching for moves.
	 */
	.group,
	.pane {
		flex: 1 1 0;
		min-height: 0;
	}
	/* Collapsed, a section is its heading and nothing else. */
	.group:not([open]) {
		flex: none;
	}
	/*
	 * The disclosure scrolls as a whole with its heading pinned to the top,
	 * rather than holding a scrolling box inside itself: a <details> wraps
	 * everything below the summary in a box of its own making, which will not
	 * take a height from us, so an inner scroller just overflows the section.
	 */
	.group {
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.group > summary {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--qb-panel);
	}
	.group-scroll {
		padding-bottom: 0.9rem;
	}
	/* Attributes is a plain section, so its heading and body can sit apart. */
	.pane {
		display: flex;
		flex-direction: column;
	}
	.pane > .label {
		flex: none;
	}
	.pane-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	/*
	 * Given room to show its colours and no more: past that it scrolls inside
	 * itself rather than pushing the export off the bottom of the panel.
	 */
	.pane {
		border-top: 1px solid var(--qb-line);
	}
	.trailer {
		display: flex;
		justify-content: center;
		padding: 0.85rem var(--qb-pad);
		border-top: 1px solid var(--qb-line);
	}
	.export {
		border: none;
		background: none;
		font: inherit;
		font-size: 10px;
		line-height: 10px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--qb-link);
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
	.group {
		border-top: 1px solid var(--qb-line);
	}
	/*
	 * Native disclosures, so keyboard and screen readers get the behaviour for
	 * free. The marker is replaced with one that does not shift the label.
	 */
	summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::before {
		content: '';
		width: 0;
		height: 0;
		border-left: 4px solid currentColor;
		border-top: 3.5px solid transparent;
		border-bottom: 3.5px solid transparent;
		transition: transform 120ms ease;
	}
	details[open] > summary::before {
		transform: rotate(90deg);
	}
	summary:hover {
		color: var(--color-text-strong);
	}

	/* Three dimensions on one line, at the design's 10px gutter. */
	.dimensions {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1.55rem;
		padding: 0.9rem 10px 0.75rem;
		border-bottom: 1px solid var(--qb-line);
	}
	.label {
		/* 12px uppercase Cabin, in black: the design's section heading. */
		font-family: var(--qb-sans);
		font-size: 12px;
		line-height: 18px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}
	/* Attributes heads a whole pane rather than a list, and is set larger. */
	.pane > .label {
		font-size: 16px;
	}
	.section {
		padding: 1.5rem var(--qb-pad) 0.55rem;
	}
	.section kbd {
		font: inherit;
		font-size: 0.85em;
		opacity: 0.55;
		margin-left: 0.25rem;
	}

	.composition {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		padding: 0 var(--qb-pad);
	}
	.chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		font: inherit;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	/* The square itself carries the state, so there is no button chrome. */
	.chip-grid {
		display: block;
		width: 100%;
		aspect-ratio: 102 / 103.378;
		background: #fff;
		color: var(--qb-ink);
	}
	.chip:hover .chip-grid {
		color: #000;
	}
	/* The design marks the chosen tile with a heavier black rule, not colour. */
	.chip.active .chip-grid {
		color: #000;
	}
	.chip-frame {
		fill: none;
		stroke: currentColor;
	}
	.chip-grid line {
		stroke: currentColor;
		stroke-dasharray: 5 5;
	}
	/* The count under each tile is a label, so it is set in the sans. */
	.chip-label {
		font-family: var(--qb-sans);
		font-size: 11px;
		line-height: 18px;
		text-transform: uppercase;
		color: var(--qb-ink);
	}
	.chip.active .chip-label {
		color: #000;
	}

	/* Three 102px tiles with 20px gutters is exactly the design's 426px panel. */
	.types {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		padding: 0 var(--qb-pad);
	}
	.type {
		aspect-ratio: 1;
		padding: 0;
		border: 1px solid var(--qb-tile);
		background: none;
		cursor: pointer;
		line-height: 0;
	}
	.type:hover {
		border-color: var(--qb-ink);
	}
	.type.active {
		border: 1.5px solid #000;
	}
	.type:focus-visible {
		outline: 2px solid var(--qb-accent);
		outline-offset: 1px;
	}

	/* Pattern icons are fitted inside the square, so centre them in it. */
	.saved .type {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.saved {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	/* A pattern's name is the app's own writing, so it stays mono. */
	.saved-name {
		font-size: 12px;
		line-height: 18px;
		text-transform: uppercase;
		color: #000;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.saved-size {
		margin-left: 0.3rem;
		opacity: 0.6;
	}
	.saved-remove {
		position: absolute;
		top: -0.4rem;
		right: -0.4rem;
		width: 1.1rem;
		height: 1.1rem;
		font: inherit;
		font-size: 0.8rem;
		line-height: 1;
		color: var(--color-text-secondary);
		background: var(--qb-panel);
		border: 1px solid var(--qb-line);
		cursor: pointer;
		opacity: 0;
	}
	.saved:hover .saved-remove,
	.saved-remove:focus-visible {
		opacity: 1;
	}

	/* The design's other "+ add" link, in the same blue and the same size. */
	.add-new {
		display: block;
		margin: 0.9rem var(--qb-pad) 0;
		font: inherit;
		font-size: 10px;
		line-height: 18px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--qb-link);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}
	.add-new:hover:not(:disabled) {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
	.add-new:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/*
	 * Held open to the tallest wording, three lines. These hints change as the
	 * tool changes, and a hint that shrinks drags the palette up under the
	 * pointer mid-gesture: the second half of a double-click then lands on
	 * whatever slid into its place.
	 */
	/* Prose about what to do next, so it takes the sans the design labels in. */
	.hint {
		margin: 0.6rem var(--qb-pad) 0;
		min-height: 3.375rem;
		font-family: var(--qb-sans);
		font-size: 12px;
		line-height: 1.5;
		letter-spacing: 0.36px;
		color: var(--qb-tool);
	}
	.link {
		font: inherit;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-text-strong);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
