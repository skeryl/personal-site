<script lang="ts">
	/*
	 * Colour lives here, not in a separate materials panel.
	 *
	 * The palette IS the materials list: every fabric used in the design, plus
	 * whatever you add. Clicking one makes it the fabric you paint with. With
	 * blocks selected, the section above lists the distinct fabrics in that
	 * selection, and picking a different one remaps every piece using it.
	 *
	 * Materials still exist behind the scenes, unchanged, because the cutting
	 * list and the export are built from them.
	 */

	import { KIND_ICON_CUT, KIND_NOUN } from './cutting';
	import BlockSvg from './BlockSvg.svelte';
	import { leafBlock, type Block } from './model';
	import type { ShapeKind } from './geometry';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const LIGHT = '#e4e4e4';

	const KIND_ICON: Record<ShapeKind, Block> = Object.fromEntries(
		Object.entries(KIND_ICON_CUT).map(([kind, cut]) => [kind, leafBlock(cut)])
	) as Record<ShapeKind, Block>;

	/** Which COLOR n row has its palette open, by fabric id. */
	let editing = $state<string | null>(null);
	/** Sentinel for the single row shown when one piece is selected. */
	const PIECE = '\u0000piece';

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#ffffff') : '#ffffff';

	const nameOf = (id: string): string =>
		store.materialById.get(id)?.name.trim() || hexOf(id).slice(1).toUpperCase();

	const onHexChange = (e: Event & { currentTarget: HTMLInputElement }, id: string) => {
		if (!store.recolorMaterial(id, e.currentTarget.value)) {
			e.currentTarget.value = hexOf(id).slice(1).toUpperCase();
		}
	};

	const remap = (from: string, to: string) => {
		store.remapFabric(from, to);
		editing = null;
	};

	const addAndRemap = (from: string, hex: string) => {
		const material = store.addMaterial(hex);
		store.remapFabric(from, material.id);
		editing = null;
	};

	const activeMaterial = $derived(store.selectedMaterial);
</script>

<section class="attributes" aria-label="Attributes">
	<div class="label section">Attributes</div>

	{#if store.selectedPiece}
		<ul class="colors">
			<li class="color">
				<span class="label">Color 1</span>
				<button
					class="swatch"
					style="background: {hexOf(store.selectedPieceFabric)}"
					aria-label={`Piece colour: ${store.selectedPieceFabric ? nameOf(store.selectedPieceFabric) : 'empty'}. Change it.`}
					aria-expanded={editing === PIECE}
					onclick={() => (editing = editing === PIECE ? null : PIECE)}
				></button>
				<span class="color-name">
					{store.selectedPieceFabric ? nameOf(store.selectedPieceFabric) : 'Empty'}
				</span>

				{#if editing === PIECE}
					<div class="picker">
						<div class="label">Palette</div>
						<div class="swatches">
							{#each store.materials as material (material.id)}
								<button
									class="swatch small"
									class:current={material.id === store.selectedPieceFabric}
									style="background: {material.hex}"
									title={material.name.trim() || material.hex.toUpperCase()}
									aria-label={material.name.trim() || material.hex.toUpperCase()}
									onclick={() => {
										store.setPieceFabric(material.id);
										editing = null;
									}}
								></button>
							{/each}
						</div>
						<label class="new">
							<span class="label">New color</span>
							<input
								type="color"
								value={hexOf(store.selectedPieceFabric)}
								onchange={(e) => {
									store.setPieceFabric(store.addMaterial(e.currentTarget.value).id);
									editing = null;
								}}
							/>
						</label>
					</div>
				{/if}
			</li>
		</ul>
		<p class="hint">
			Inside
			<button class="link" onclick={() => store.selectParent()}>{store.parentLabel}</button>
		</p>
	{:else if !store.activeScope.length}
		<p class="hint muted">No blocks selected</p>
	{:else if !store.selectionFabrics.length}
		<p class="hint muted">The selected blocks are empty</p>
	{:else}
		<ul class="colors">
			{#each store.selectionFabrics as fabric, i (fabric)}
				<li class="color">
					<span class="label">Color {i + 1}</span>
					<button
						class="swatch"
						style="background: {hexOf(fabric)}"
						aria-label={`Color ${i + 1}: ${nameOf(fabric)}. Change it.`}
						aria-expanded={editing === fabric}
						onclick={() => (editing = editing === fabric ? null : fabric)}
					></button>
					<span class="color-name">{nameOf(fabric)}</span>

					{#if editing === fabric}
						<div class="picker">
							<div class="label">Palette</div>
							<div class="swatches">
								{#each store.materials as material (material.id)}
									<button
										class="swatch small"
										class:current={material.id === fabric}
										style="background: {material.hex}"
										title={material.name.trim() || material.hex.toUpperCase()}
										aria-label={material.name.trim() || material.hex.toUpperCase()}
										onclick={() => remap(fabric, material.id)}
									></button>
								{/each}
							</div>
							<label class="new">
								<span class="label">New color</span>
								<input
									type="color"
									value={hexOf(fabric)}
									onchange={(e) => addAndRemap(fabric, e.currentTarget.value)}
								/>
							</label>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if store.parentLabel}
			<p class="hint">
				Inside
				<button class="link" onclick={() => store.selectParent()}>{store.parentLabel}</button>
			</p>
		{/if}
	{/if}

	<div class="label section">Palette</div>
	<div class="swatches palette">
		{#each store.materials as material (material.id)}
			<button
				class="swatch"
				class:current={material.id === store.selectedMaterialId}
				style="background: {material.hex}"
				title={material.name.trim() || material.hex.toUpperCase()}
				aria-label={`Paint with ${material.name.trim() || material.hex.toUpperCase()}`}
				onclick={() => store.selectMaterial(material.id)}
			></button>
		{/each}
		<label class="swatch add" title="Add a color">
			<span aria-hidden="true">+</span>
			<input
				type="color"
				aria-label="Add a color"
				onchange={(e) => store.addMaterial(e.currentTarget.value)}
			/>
		</label>
	</div>

	{#if activeMaterial}
		<div class="active">
			<label class="field">
				<span class="label">Name</span>
				<input
					class="name"
					type="text"
					placeholder="Optional"
					maxlength="40"
					value={activeMaterial.name}
					oninput={(e) => store.renameMaterial(activeMaterial.id, e.currentTarget.value)}
				/>
			</label>
			<label class="field">
				<span class="label">Hex code</span>
				<input
					class="hex"
					type="text"
					maxlength="7"
					spellcheck="false"
					value={activeMaterial.hex.slice(1).toUpperCase()}
					onchange={(e) => onHexChange(e, activeMaterial.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter') e.currentTarget.blur();
					}}
				/>
			</label>
			<button
				class="remove"
				onclick={() => store.deleteMaterial(activeMaterial.id)}
				aria-label={`Remove ${activeMaterial.name.trim() || 'this fabric'}`}
			>
				Remove
			</button>
		</div>
	{:else}
		<p class="hint muted">Add a color to start placing.</p>
	{/if}

	{#if store.cutting.length}
		<details class="cut-list">
			<summary>Cutting list</summary>
			{#each store.cutting as group (group.material.id)}
				<div class="cut-group">
					<span class="cut-name">
						<span class="dot" style="background: {group.material.hex}"></span>
						{group.material.name.trim() || group.material.hex.toUpperCase()}
					</span>
					{#each group.rows as row (row.frac)}
						<div class="cut-row">
							<span class="label">{row.label} squares: ({row.blanks})</span>
							<span class="kinds">
								{#each row.kinds as k (k.kind)}
									<span
										class="kind"
										title={`${k.pieces} ${KIND_NOUN[k.kind]}${k.pieces === 1 ? '' : 's'}`}
									>
										<span class="kind-icon">
											<BlockSvg
												block={KIND_ICON[k.kind]}
												fills={[group.material.hex, LIGHT, group.material.hex, LIGHT]}
											/>
										</span>
										<span class="kind-count">×{k.pieces}</span>
									</span>
								{/each}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		</details>
	{/if}
</section>

<style>
	.attributes {
		border-top: 1px solid var(--qb-line);
		padding-bottom: 1.5rem;
	}
	.label {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.section {
		padding: 0.9rem 1rem 0.5rem;
	}
	.hint {
		margin: 0 1rem 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.muted {
		font-style: italic;
	}

	.colors {
		list-style: none;
		margin: 0;
		padding: 0 1rem;
	}
	.color {
		display: grid;
		grid-template-columns: 4rem auto 1fr;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.color-name {
		font-size: 0.75rem;
		color: var(--color-text-strong);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.swatch {
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		border: 1px solid var(--qb-line);
		cursor: pointer;
		position: relative;
	}
	.swatch.small {
		width: 1.25rem;
		height: 1.25rem;
	}
	.swatch.current {
		outline: 2px solid var(--qb-accent);
		outline-offset: 1px;
	}
	.swatch input[type='color'] {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.swatch.add {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fff;
		color: var(--color-text-secondary);
		font-size: 1rem;
		line-height: 1;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.palette {
		padding: 0 1rem;
	}

	.picker {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0.35rem 0 0.6rem;
		padding: 0.6rem;
		background: #fff;
		border: 1px solid var(--qb-line);
	}
	.new {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.new input[type='color'] {
		width: 2rem;
		height: 1.4rem;
		padding: 0;
		border: 1px solid var(--qb-line);
		background: none;
		cursor: pointer;
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
	.active {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.75rem 1rem 0;
	}
	.field {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.name,
	.hex {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 0.8rem;
		color: var(--color-text-strong);
		background: none;
		border: none;
		border-bottom: 1px solid var(--qb-line);
		padding: 0.1rem 0;
	}
	.name:focus,
	.hex:focus {
		outline: none;
		border-bottom-color: var(--color-text-strong);
	}
	.remove {
		align-self: flex-start;
		font: inherit;
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		background: none;
		border: none;
		padding: 0.2rem 0;
		cursor: pointer;
	}
	.remove:hover {
		color: var(--color-text-strong);
	}

	.cut-list {
		margin: 1rem 1rem 0;
		font-size: 0.75rem;
	}
	.cut-list summary {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.cut-group {
		margin-top: 0.6rem;
	}
	.cut-name {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-text-strong);
	}
	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border: 1px solid var(--qb-line);
	}
	.cut-row {
		margin-top: 0.25rem;
	}
	.kinds {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.15rem;
	}
	.kind {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}
	.kind-icon {
		width: 0.9rem;
		height: 0.9rem;
	}
	.kind-count {
		color: var(--color-text-secondary);
	}
</style>
