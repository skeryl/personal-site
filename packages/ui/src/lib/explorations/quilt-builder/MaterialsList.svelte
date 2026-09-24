<script lang="ts">
	/*
	 * The materials list, as its own frame in the design draws it: a letter
	 * page you take to the table. Three sections — the fabrics to buy, the
	 * shapes to cut, and the units to sew — each shape drawn to scale against
	 * the others in its row, so the page is read at a glance rather than
	 * measured.
	 *
	 * It opens over the builder rather than downloading, because the thing you
	 * usually want is to look at it, and printing is a button away when you do
	 * want it on paper.
	 */

	import BlockSvg from './BlockSvg.svelte';
	import { fmtInches } from './data';
	import { ROLE_FILL } from './geometry';
	import { flatten, type Block } from './model';
	import type { QuiltStore } from './state.svelte';

	let { store, onclose }: { store: QuiltStore; onclose: () => void } = $props();

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#ffffff') : '#ffffff';

	const fillsOf = (block: Block): string[] =>
		flatten(block).map((p) =>
			p.fabric ? hexOf(p.fabric) : p.shaped ? (ROLE_FILL[p.role] ?? '#ffffff') : '#ffffff'
		);

	const nameOf = (id: string, hex: string): string =>
		store.materialById.get(id)?.name.trim() || hex.slice(1).toUpperCase();

	/*
	 * Yardage, at the width fabric is sold in. Blanks are laid across the
	 * bolt, so what a fabric costs is how many rows of them you need times how
	 * tall a row is — not the bare area, which would always come out short.
	 */
	const BOLT_INCHES = 42;
	const yardsFor = (materialId: string): number => {
		const inches = store.cutPieces
			.filter((piece) => piece.material.id === materialId)
			.reduce((total, piece) => {
				const across = Math.max(1, Math.floor(BOLT_INCHES / piece.w));
				return total + Math.ceil(piece.count / across) * piece.h;
			}, 0);
		// Quilters buy in eighths, and always round up.
		return Math.ceil((inches / 36) * 8) / 8;
	};

	/* Written the way a bolt is cut: in eighths, not in decimals. */
	const fmtYards = (yards: number): string =>
		yards === 0 ? '—' : `${fmtInches(yards)} ${yards <= 1 ? 'yard' : 'yards'}`;

	/* Fabrics the quilt actually uses, in the order the palette holds them. */
	const fabrics = $derived(
		store.materials.filter((m) => store.cutPieces.some((p) => p.material.id === m.id))
	);

	/*
	 * One scale per row, taken from its largest shape, so the pieces read
	 * against each other. The design draws each row to fit the same band.
	 */
	const BAND = 156;
	const cutScale = $derived(
		BAND / Math.max(1, ...store.cutPieces.map((piece) => Math.max(piece.w, piece.h)))
	);
	const sewScale = $derived(BAND / Math.max(1, ...store.sewList.map((unit) => unit.inches)));

	const print = () => window.print();
</script>

<!-- Presentational: the sheet itself is what takes focus. -->
<div
	class="backdrop"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onclose()}
>
	<div class="sheet-frame" role="dialog" aria-modal="true" aria-label="Materials list">
		<div class="controls">
			<button class="act" onclick={print}>Print</button>
			<button class="act" onclick={() => store.exportMaterialsList()}>Download text</button>
			<button class="act" onclick={onclose}>Close</button>
		</div>

		<article class="sheet">
			<p class="quilt">{store.name.trim() || 'Untitled'}</p>
			<h1 class="title">Materials List</h1>

			<h2 class="section">Fabric</h2>
			{#if fabrics.length}
				<ul class="fabrics">
					{#each fabrics as material (material.id)}
						<li class="fabric">
							<span class="fabric-swatch" style="background: {material.hex}"></span>
							<span class="fabric-name">{nameOf(material.id, material.hex)}</span>
							<span class="fabric-yards">{fmtYards(yardsFor(material.id))}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">No fabric used yet.</p>
			{/if}

			<h2 class="section">Cut List</h2>
			{#if store.cutPieces.length}
				<ul class="row">
					{#each store.cutPieces as piece, i (`${piece.material.id}-${piece.kind}-${piece.w}-${piece.h}-${i}`)}
						<li class="cell">
							<span class="art">
								<span
									class="cut-shape"
									style="background: {piece.material.hex}; width: {piece.w *
										cutScale}px; height: {piece.h * cutScale}px"
								></span>
							</span>
							<span class="caption">{piece.label}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">Nothing to cut yet.</p>
			{/if}

			<h2 class="section">Sew List</h2>
			{#if store.sewList.length}
				<ul class="row">
					{#each store.sewList as unit, i (`${unit.name}-${i}`)}
						<li class="cell">
							<span class="art">
								<span class="sew-shape" style="width: {unit.inches * sewScale}px">
									<BlockSvg block={unit.block} fills={fillsOf(unit.block)} />
								</span>
							</span>
							<span class="caption">{unit.label}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">Nothing to sew yet.</p>
			{/if}
		</article>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem 1rem;
		overflow: auto;
		background: rgba(0, 0, 0, 0.35);
	}
	.sheet-frame {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.6rem;
		width: 612px;
		max-width: 100%;
	}
	.controls {
		display: flex;
		justify-content: flex-end;
		gap: 1.25rem;
	}
	.act {
		border: none;
		background: none;
		padding: 0;
		font-family: var(--qb-mono);
		font-size: 10px;
		line-height: 18px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #fff;
		cursor: pointer;
	}
	.act:hover {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	/* The design's own page: 612 by 792, which is letter at 72 to the inch. */
	.sheet {
		box-sizing: border-box;
		width: 612px;
		max-width: 100%;
		min-height: 792px;
		padding: 30px 10px 40px;
		background: #fff;
		color: #000;
	}
	.quilt {
		margin: 0;
		padding: 0;
		font-family: var(--qb-mono);
		font-size: 10px;
		line-height: 18px;
		color: var(--qb-ink);
	}
	.title {
		margin: 3px 0 0;
		padding: 0;
		font-family: var(--qb-sans);
		font-size: 17.75px;
		font-weight: 400;
		line-height: 18px;
		color: var(--qb-ink);
	}
	.section {
		margin: 43px 0 0;
		padding: 0;
		font-family: var(--qb-sans);
		font-size: 12px;
		font-weight: 400;
		line-height: 18px;
		text-transform: uppercase;
		color: #000;
	}
	.empty {
		margin: 0;
		padding: 0.75rem 0 0;
		font-family: var(--qb-sans);
		font-size: 12px;
		font-style: italic;
		color: var(--qb-tool);
	}

	/* Fabric: a 48px swatch, its name, and what to buy. */
	.fabrics {
		list-style: none;
		margin: 0;
		padding: 29px 0 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.fabric {
		display: flex;
		align-items: center;
		gap: 22px;
	}
	.fabric-swatch {
		flex: none;
		width: 48px;
		height: 48px;
		border: 1px solid var(--qb-line);
	}
	.fabric-name {
		flex: none;
		min-width: 120px;
		font-family: var(--qb-mono);
		font-size: 10px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
	}
	.fabric-yards {
		font-family: var(--qb-sans);
		font-size: 12px;
	}

	/*
	 * Cut and sew both lay their shapes out in a row of columns ruled apart,
	 * each shape sitting on the row's own baseline so the sizes compare.
	 */
	.row {
		list-style: none;
		margin: 0;
		padding: 21px 0 0;
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
	}
	.cell {
		flex: 1 1 0;
		min-width: 133px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 0 10px;
		border-left: 0.5px solid var(--qb-line);
	}
	.cell:first-child {
		border-left: none;
	}
	.art {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 180px;
	}
	.cut-shape {
		display: block;
		border: 1px solid var(--qb-line);
	}
	.sew-shape {
		display: block;
		aspect-ratio: 1;
	}
	.caption {
		font-family: var(--qb-mono);
		font-size: 10px;
		line-height: 18px;
		text-align: center;
		text-transform: uppercase;
	}

	/* On paper the sheet is the whole document, and the chrome goes away. */
	@media print {
		.backdrop {
			position: static;
			padding: 0;
			overflow: visible;
			background: none;
		}
		.controls {
			display: none;
		}
		.sheet {
			width: auto;
			min-height: 0;
			padding: 0;
		}
	}
</style>
