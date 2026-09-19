<script lang="ts">
	import { isNamed } from './data';
	import { KIND_ICON_LAYOUT, KIND_NOUN } from './cutting';
	import LayoutSvg from './LayoutSvg.svelte';
	import type { QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const LIGHT = '#e4e4e4';

	const onHexChange = (e: Event & { currentTarget: HTMLInputElement }, id: string) => {
		if (!store.recolorMaterial(id, e.currentTarget.value)) {
			e.currentTarget.value = store.materialById.get(id)?.hex.slice(1).toUpperCase() ?? '';
		}
	};
</script>

<aside class="materials">
	<h3 class="title">Materials</h3>

	{#if !store.materials.length}
		<p class="hint">Add a fabric, name it, and pick its color. Then start placing.</p>
	{/if}

	<ul class="material-list">
		{#each store.materials as material (material.id)}
			{@const selected = store.selectedMaterialId === material.id}
			{@const group = store.cutting.find((g) => g.material.id === material.id) ?? null}
			<li class="material" class:selected onfocusin={() => store.selectMaterial(material.id)}>
				<div class="material-head">
					<button
						class="use"
						class:selected
						aria-pressed={selected}
						onclick={() => store.selectMaterial(material.id)}
					>
						{selected ? 'Selected' : 'Use'}
					</button>
					<button
						class="remove"
						aria-label={`Remove ${material.name.trim() || 'fabric'}`}
						title="Remove"
						onclick={() => store.deleteMaterial(material.id)}
					>
						×
					</button>
				</div>

				<label class="field">
					<span class="label">Name</span>
					<input
						class="name"
						type="text"
						placeholder="Name this fabric"
						maxlength="40"
						value={material.name}
						oninput={(e) => store.renameMaterial(material.id, e.currentTarget.value)}
					/>
				</label>

				<div class="field">
					<span class="label">Color</span>
					<label class="swatch" style="background: {material.hex}" title="Pick a color">
						<input
							type="color"
							value={material.hex}
							aria-label="Color"
							oninput={(e) => store.recolorMaterial(material.id, e.currentTarget.value)}
						/>
					</label>
				</div>

				<label class="field hex-field">
					<span class="label">Hex code:</span>
					<input
						class="hex"
						type="text"
						maxlength="7"
						spellcheck="false"
						value={material.hex.slice(1).toUpperCase()}
						onchange={(e) => onHexChange(e, material.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter') e.currentTarget.blur();
						}}
					/>
				</label>

				{#if selected && !isNamed(material)}
					<p class="note">Name it to start placing.</p>
				{:else if group}
					<div class="cuts">
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
												<LayoutSvg
													layout={KIND_ICON_LAYOUT[k.kind]}
													fills={[material.hex, LIGHT, material.hex, LIGHT]}
												/>
											</span>
											<span class="kind-count">×{k.pieces}</span>
										</span>
									{/each}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="note muted">Not placed yet.</p>
				{/if}
			</li>
		{/each}
	</ul>

	<button class="add" onclick={() => store.addMaterial()}>+Add</button>
</aside>

<style>
	.materials {
		padding: 1.25rem 1rem 2rem 1.25rem;
		font-family: var(--qb-mono);
	}
	.title {
		margin: 0 0 1.25rem;
		font-family: var(--qb-mono);
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-strong);
	}
	.hint,
	.note {
		margin: 0;
		font-size: 0.68rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	.note {
		margin-top: 0.75rem;
		color: var(--qb-accent);
	}
	.note.muted {
		color: var(--color-text-muted);
	}

	.material-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.material {
		position: relative;
		padding: 0.75rem 0.75rem 0.9rem;
		margin: 0 -0.75rem;
		border-left: 3px solid transparent;
		border-radius: 0.25rem;
	}
	.material.selected {
		border-left-color: var(--qb-accent);
		background: rgba(199, 102, 228, 0.06);
	}
	.material-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.use {
		border: 1px solid var(--qb-line);
		border-radius: 999px;
		background: #fff;
		padding: 0.15rem 0.6rem;
		font: inherit;
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.use.selected {
		background: var(--qb-accent);
		border-color: var(--qb-accent);
		color: #fff;
	}
	.remove {
		border: none;
		background: none;
		font: inherit;
		font-size: 1rem;
		line-height: 1;
		padding: 0 0.25rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.remove:hover {
		color: var(--color-accent-danger);
	}

	.field {
		display: block;
		margin-top: 0.75rem;
	}
	.label {
		display: block;
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-strong);
		margin-bottom: 0.3rem;
	}
	.name {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.15rem 0;
		border: none;
		border-bottom: 1px solid var(--color-text-strong);
		background: transparent;
		color: var(--color-text-strong);
	}
	.name:focus {
		outline: none;
		border-bottom-color: var(--qb-accent);
	}
	.swatch {
		display: block;
		width: 100%;
		height: 2rem;
		border-radius: 0.125rem;
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}
	.swatch input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
	.hex-field {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.hex-field .label {
		margin: 0;
	}
	.hex {
		width: 5rem;
		font: inherit;
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.15rem 0.35rem;
		border: none;
		border-radius: 0.125rem;
		background: #e5e5e5;
		color: var(--color-text-strong);
	}
	.hex:focus {
		outline: 2px solid var(--qb-accent);
	}

	.cuts {
		margin-top: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.cut-row .label {
		margin-bottom: 0.25rem;
	}
	.kinds {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.kind {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.65rem;
		color: var(--color-text-secondary);
	}
	.kind-icon {
		display: inline-block;
		width: 1.2rem;
		height: 1.2rem;
	}

	.add {
		display: block;
		margin: 1.75rem auto 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-strong);
		cursor: pointer;
	}
	.add:hover {
		color: var(--qb-accent);
	}
</style>
