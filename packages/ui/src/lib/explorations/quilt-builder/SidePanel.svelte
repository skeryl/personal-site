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

	import {
		BINDINGS,
		BLOCK_SIZES,
		SEAM_ALLOWANCES,
		fmtFraction,
		fmtInches,
		fmtLength
	} from './data';
	import Dropdown from './Dropdown.svelte';
	import { BLOCK_TYPES } from './blocks';
	import { roleFill } from './geometry';
	import { flatten, rotateBlock, type Block } from './model';
	import { boundsOf, rotatePattern } from './pattern';
	import AttributesPanel from './AttributesPanel.svelte';
	import MaterialsList from './MaterialsList.svelte';
	import BlockSvg from './BlockSvg.svelte';
	import PatternSvg from './PatternSvg.svelte';
	import { DIVISIONS, PATTERN_PREFIX, type QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	/* The materials list opens over the builder rather than downloading. */
	let showMaterials = $state(false);

	/** Icon fills: dark for the fabric role, light for background, white for empty. */
	const roleFills = (block: Block): string[] => flatten(block).map((p) => roleFill(p.role));

	/*
	 * A pattern's pieces, drawn in their fabric where they have one and in the
	 * shape greys where they do not — so a pattern nobody has coloured in
	 * still reads as the shape it is, the way the block types above it do.
	 */
	const hexOf = (id: string | null, role: number): string =>
		id ? (store.materialById.get(id)?.hex ?? roleFill(role)) : roleFill(role);

	/*
	 * Everything that fills exactly one square: the cuts, which paint, and the
	 * block types, which stamp.
	 *
	 * Only the armed one turns with R. The palette is a list of what the shapes
	 * are, and spinning every icon in it to show the turn of the one about to
	 * be placed made the list hard to read. Leaving the rest at their own
	 * identity also keeps the flatten cache hitting.
	 */
	/* Filled squares chosen on the quilt: what a capture would take. */
	const capturableCount = $derived(store.capturable.length);

	const armedBlock = $derived(store.tab === 'block' ? store.blockId : null);

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

	/*
	 * Inches are written the way the design writes them — 1/4, 5/8 — rather
	 * than as the eighths glyphs, so the dimensions read as a pattern does.
	 * Millimetres have no such convention and are just numbers.
	 */
	const metric = $derived(store.metric);
	const length = (inches: number) => (metric ? fmtLength(inches, true) : `${fmtInches(inches)}”`);

	/*
	 * The design's own block-grid tile. The panel renders it at exactly this
	 * size, so the stroke and dash values inside stay literal pixels.
	 */
	const TILE_W = 50;
	const TILE_H = 50;
	/* Every rule inside the tile, chosen or not: the ring says which is which. */
	const RULE = 1;
</script>

<aside class="side">
	<!--
		Which unit every measurement is written in. A two-part track rather than
		a pair of buttons: the design marks the chosen half of the rule, so the
		control reads as one switch with a side thrown, not two things to press.
	-->
	<div class="units" role="group" aria-label="Units">
		<button
			class="unit"
			class:on={!metric}
			aria-pressed={!metric}
			onclick={() => (store.panels.metric = false)}>in</button
		>
		<button
			class="unit"
			class:on={metric}
			aria-pressed={metric}
			onclick={() => (store.panels.metric = true)}>mm</button
		>
	</div>

	<!-- The dimensions the whole design is cut to, along the top. -->
	<div class="dimensions">
		<Dropdown
			label="Block size:"
			display={length(store.blockSize)}
			value={String(store.blockSize)}
			choices={BLOCK_SIZES.map((size) => ({ value: String(size), label: length(size) }))}
			onpick={(next) => store.setBlockSize(Number(next))}
		/>
		<Dropdown
			label="Seam allowance:"
			display={metric ? fmtLength(store.seamInches, true) : `${fmtFraction(store.seamInches)}”`}
			value={String(store.seamInches)}
			title="Added to every side of every blank in the cutting list"
			choices={SEAM_ALLOWANCES.map((inches) => ({
				value: String(inches),
				label: metric ? fmtLength(inches, true) : `${fmtFraction(inches)}”`
			}))}
			onpick={(next) => (store.seamInches = Number(next))}
		/>
		<Dropdown
			label="Binding:"
			display={metric
				? fmtLength(store.bindingInches, true)
				: `${fmtFraction(store.bindingInches)}”`}
			value={String(store.bindingInches)}
			choices={BINDINGS.map((inches) => ({
				value: String(inches),
				label: metric ? fmtLength(inches, true) : `${fmtFraction(inches)}”`
			}))}
			onpick={(next) => (store.bindingInches = Number(next))}
		/>
	</div>

	<details class="group" data-panel="type" bind:open={store.panels.type}>
		<summary class="label section">
			Block type
			<button
				class="add-new"
				onclick={(e) => {
					/* Inside the summary, so the press must stop short of it. */
					e.preventDefault();
					e.stopPropagation();
					store.capturePattern();
				}}
			>
				+ Add block type
			</button>
		</summary>
		<div class="group-scroll">
			<div class="types">
				{#each blockEntries as entry (entry.type.id)}
					<div class="shape">
						<button
							class="type"
							class:active={store.tab === 'block' && store.blockId === entry.type.id}
							aria-pressed={store.tab === 'block' && store.blockId === entry.type.id}
							aria-label={entry.type.name}
							onclick={() => store.pickBlock(entry.type.id)}
						>
							<BlockSvg block={entry.block} fills={roleFills(entry.block)} />
						</button>
						<input
							class="shape-name"
							type="text"
							maxlength="40"
							aria-label={`Name for ${entry.type.name}`}
							value={store.blockNames[entry.type.id] ?? ''}
							placeholder={entry.type.name}
							oninput={(e) => store.renameBlock(entry.type.id, e.currentTarget.value)}
						/>
					</div>
				{/each}
			</div>
		</div>
	</details>

	<details class="group" data-panel="patterns" bind:open={store.panels.patterns}>
		<summary class="label section">
			Block patterns
			<button
				class="add-new"
				onclick={(e) => {
					/* It lives inside the summary, so it must not work the disclosure too. */
					e.preventDefault();
					e.stopPropagation();
					store.capturePattern();
				}}
			>
				{capturableCount ? '+ Add selection as pattern' : '+ Add block pattern'}
			</button>
		</summary>
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
								<input
									class="shape-name"
									type="text"
									maxlength="40"
									aria-label={`Name for ${entry.saved.name}`}
									value={entry.saved.name}
									oninput={(e) => store.renamePattern(entry.saved.id, e.currentTarget.value)}
								/>{#if entry.size}<span class="saved-size">{entry.size}</span>{/if}
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
						<button
							class="chip"
							class:active={store.activeDivision === division}
							aria-pressed={store.activeDivision === division}
							aria-label={label}
							title={`${label}, ${length(store.blockSize / division)} pieces`}
							onclick={() => store.setGrid(division)}
						>
							<!--
						The tile IS the block, divided by dashed seams. The viewBox is
						the design's own tile, and the panel renders it at exactly that
						size, so stroke and dash values are literal pixels. Seams run
						edge to edge, as they do in the design.

						The frame is drawn in the svg rather than as a CSS border
						because browsers round border-width to whole pixels, which
						flattened the chosen tile's 1.5px rule back to 1px.
					-->
							<svg
								class="chip-grid"
								viewBox="0 0 {TILE_W} {TILE_H}"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<rect
									class="chip-frame"
									x={RULE / 2}
									y={RULE / 2}
									width={TILE_W - RULE}
									height={TILE_H - RULE}
									stroke-width={RULE}
								/>
								{#each { length: division - 1 } as _, i (i)}
									{@const x = ((i + 1) * TILE_W) / division}
									{@const y = ((i + 1) * TILE_H) / division}
									<line x1={x} y1="0" x2={x} y2={TILE_H} stroke-width={RULE} />
									<line x1="0" y1={y} x2={TILE_W} y2={y} stroke-width={RULE} />
								{/each}
							</svg>
							<span class="chip-label">
								{division === 1 ? '(1)' : `(${division}X${division})`}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<AttributesPanel {store} />
		</div>
	</section>

	<div class="trailer">
		<button class="export" onclick={() => (showMaterials = true)} disabled={!store.cutting.length}>
			Export materials list
		</button>
	</div>
</aside>

{#if showMaterials}
	<MaterialsList {store} onclose={() => (showMaterials = false)} />
{/if}

<style>
	/*
	 * Four bands: the dimensions, the shapes to choose from, what is selected,
	 * and the export. Only the shapes scroll with the page; Attributes and the
	 * export stay put at the foot of the panel, because they are what you
	 * reach for while looking at the quilt rather than while browsing.
	 */
	.side {
		--sheet-gutter: 10px;
		display: flex;
		flex-direction: column;
		background: var(--qb-panel);
		border-right: var(--qb-divider);
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
	/*
	 * A section keeps its third of the panel whether it is open or shut.
	 * Letting a closed one give its room back moved everything below it, so
	 * collapsing the patterns made the shapes above appear to jump.
	 */
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
		/*
		 * Room for the ring a chosen tile wears, which stands outside the tile
		 * and was being cut off by the scroller's own top edge. Taken back out
		 * of the heading above so nothing moves.
		 */
		padding-top: 4px;
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
		border-top: var(--qb-divider);
	}
	.trailer {
		display: flex;
		justify-content: center;
		padding: 0.85rem var(--sheet-gutter);
		border-top: var(--qb-divider);
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
		border-top: var(--qb-divider);
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

	/*
	 * Two 22px halves of one 44px rule. The chosen half is drawn black and
	 * heavier over a light track, which is what says which unit is in force.
	 */
	.units {
		display: flex;
		width: 44px;
		margin: 10px 0 0 10px;
	}
	.unit {
		flex: 1;
		padding: 0 0 1px;
		border: none;
		border-bottom: 1px solid var(--qb-line);
		background: none;
		font-family: var(--qb-mono);
		font-size: 10px;
		font-weight: 300;
		line-height: 18px;
		text-transform: uppercase;
		color: var(--qb-tool);
		cursor: pointer;
	}
	.unit.on {
		border-bottom: 2px solid #000;
		font-weight: 700;
		color: #000;
	}

	/*
	 * Three dimensions on one line, at the design's 10px gutter. Each one
	 * grows by an equal share of whatever the row has spare, so the slack
	 * falls between them rather than collecting after the last.
	 */
	.dimensions {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 23px;
		padding: 0.9rem 10px 0.75rem;
		border-bottom: var(--qb-divider);
	}
	.dimensions > :global(.dropdown) {
		flex: 1 1 auto;
	}
	/* 10px uppercase Cabin, in black: the design's section heading, every one
	   of them the same size, Attributes included. */
	.label {
		font-family: var(--qb-sans);
		font-size: 10px;
		line-height: 18px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}
	/* A heading that carries an add button lays the two along its own line. */
	.section {
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 16px var(--sheet-gutter) 1px;
	}
	/*
	 * Down the Attributes pane the design spaces things differently from the
	 * lists above: a heading sits right on top of what it names, and the room
	 * is between the groups rather than inside them.
	 */
	.pane > .label.section {
		/* The site gives every h2 a margin of its own; this one sets its room. */
		margin: 0;
		padding: 15px var(--sheet-gutter) 3px;
	}
	.grid-section > .label.section {
		padding: 0 var(--sheet-gutter) 5px;
	}
	.section kbd {
		font: inherit;
		font-size: 0.85em;
		opacity: 0.55;
		margin-left: 0.25rem;
	}

	/*
	 * Three 55px tiles spread across the panel, as the design now draws them
	 * — small squares with air between, rather than three wide ones filling
	 * the width. Their height is what sets the rhythm of the pane below.
	 */
	.composition {
		display: grid;
		grid-template-columns: repeat(3, 50px);
		justify-content: start;
		gap: 0 64px;
		padding: 0 10px 0 71px;
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
		aspect-ratio: 1;
		background: #fff;
		color: var(--qb-ink);
	}
	.chip:hover .chip-grid {
		color: #000;
	}
	/* The box says which tile is chosen, so the tile is drawn the same either
	   way and only goes black to match its ring. */
	.chip.active .chip-grid {
		color: #000;
		outline: var(--qb-picked);
		outline-offset: var(--qb-picked-gap);
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
	/* Three 100px tiles a row at the design's own 50px apart, 43px between
	   rows, starting at the panel's gutter rather than spread across it. */
	.types {
		display: grid;
		grid-template-columns: repeat(3, 100px);
		justify-content: start;
		gap: 43px 50px;
		padding: 0 var(--sheet-gutter);
	}
	/* A tile and the name under it, which is what the grid lays out now. */
	.shape {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	/* A field, not a caption: a shape can be called what its quilter calls it. */
	.shape-name {
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 12px;
		line-height: 15px;
		text-transform: uppercase;
		text-align: center;
		color: #000;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.shape-name::placeholder {
		color: inherit;
		opacity: 1;
	}
	.shape-name:focus {
		outline: none;
		box-shadow: 0 1px 0 0 #000;
	}
	/*
	 * The rule is laid over the block rather than beside it. As a border it
	 * took a pixel out of the box, and the block, sized to what was left,
	 * rounded clear of one edge and over the other — a hair of panel showing
	 * down one side and the rule swallowed on the far one.
	 */
	/*
	 * The rule is laid over the block rather than beside it. As a border it
	 * took a pixel out of the box, and the block, sized to what was left,
	 * rounded clear of one edge and over the other — a hair of panel showing
	 * down one side and the rule swallowed on the far one. Drawn on a layer of
	 * its own above the block, it sits on the edges exactly.
	 *
	 * Not an inset shadow, which paints under the block and disappears, and
	 * not an outline, which the chosen tile's ring already has.
	 */
	.type {
		position: relative;
		aspect-ratio: 1;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		line-height: 0;
		overflow: hidden;
	}
	.type::after {
		content: '';
		position: absolute;
		inset: 0;
		box-sizing: border-box;
		border: 0.5px solid #000;
		pointer-events: none;
	}
	.type:hover::after {
		border-color: var(--qb-ink);
	}
	/* Ringed, not bordered: a heavier edge would shift what is inside it. */
	.type.active {
		outline: var(--qb-picked);
		outline-offset: var(--qb-picked-gap);
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
		margin: 0;
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
	}
	.add-new:hover:not(:disabled) {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	/*
	 * Held open to the tallest wording. These hints change as the tool changes,
	 * and a hint that shrinks drags the palette up under the pointer
	 * mid-gesture: the second half of a double-click then lands on whatever
	 * slid into its place. Which is why the room stays reserved even with
	 * nothing to say, as it is at rest now.
	 */
	/* Prose about what to do next, so it takes the sans the design labels in. */
</style>
