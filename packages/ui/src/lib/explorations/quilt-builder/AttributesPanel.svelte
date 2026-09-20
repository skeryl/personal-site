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
	import { ROLE_FILL } from './geometry';
	import BlockSvg from './BlockSvg.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { leafBlock, type Block } from './model';
	import type { ShapeKind } from './geometry';
	import type { ColorSlot, QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

	const LIGHT = '#e4e4e4';

	const KIND_ICON: Record<ShapeKind, Block> = Object.fromEntries(
		Object.entries(KIND_ICON_CUT).map(([kind, cut]) => [kind, leafBlock(cut)])
	) as Record<ShapeKind, Block>;

	/** Which row of the Attributes list a slot is, for keying the list. */
	const slotKey = (slot: ColorSlot) =>
		slot.kind === 'fabric' ? slot.id : `\u0000unset:${slot.role}`;

	const hexOf = (id: string | null): string =>
		id ? (store.materialById.get(id)?.hex ?? '#ffffff') : '#ffffff';

	const nameOf = (id: string): string =>
		store.materialById.get(id)?.name.trim() || hexOf(id).slice(1).toUpperCase();

	/** Bare hex, as the design prints it in its chip. */
	const hexTextOf = (id: string | null): string => (id ? hexOf(id).slice(1).toUpperCase() : '—');

	const onHexChange = (e: Event & { currentTarget: HTMLInputElement }, id: string) => {
		if (!store.recolorMaterial(id, e.currentTarget.value)) {
			e.currentTarget.value = hexOf(id).slice(1).toUpperCase();
		}
	};

	const activeMaterial = $derived(store.selectedMaterial);

	/*
	 * The picker edits a fabric in place, live. Blocks reference fabrics by id,
	 * so dragging around the square repaints every piece cut from it, wherever
	 * it is on the quilt.
	 *
	 * Adding a colour is the same act: the fabric joins the palette first, at
	 * its starter hex, and the picker then recolours it. So there is one path
	 * through here rather than an add path and an edit path, and a new colour
	 * shows up in the palette while you are still choosing it.
	 */
	interface Picking {
		/** The fabric the window is open on. */
		id: string;
		anchor: DOMRect;
		/*
		 * Bumped when the window should start over on a different colour, and
		 * left alone when the same gesture carries on. Forking a fabric
		 * mid-drag must not tear the window down under the pointer.
		 */
		token: number;
		/** Made only to open this row, and dropped again if it ends up unused. */
		created?: boolean;
		/** What choosing from the window's palette means for the row it came from. */
		apply: (from: string, to: string) => void;
		/** What going back to no colour means for it. */
		reset: (from: string) => void;
		/*
		 * What mixing a shade means. A palette swatch is the fabric itself, so
		 * it changes wherever it is used; a row is the pieces in front of you,
		 * so the first change forks a fabric of their own rather than
		 * repainting every other piece cut from the same one.
		 */
		forks: boolean;
	}

	let token = 0;

	let picking = $state<Picking | null>(null);

	/*
	 * From the palette: the colour you pick is the one you paint with, and
	 * resetting paints with none, so shapes go down in the greys again.
	 */
	const openPicker = (id: string, anchor: DOMRect) => {
		picking = {
			id,
			anchor,
			token: ++token,
			forks: false,
			apply: (_from, to) => store.selectMaterial(to),
			reset: () => (store.selectedMaterialId = null)
		};
	};

	/*
	 * From a COLOR row: the colours in the selection. Choosing another fabric
	 * remaps every piece cut from this one; mixing a new shade in the square
	 * recolours the fabric itself, wherever else it is used.
	 *
	 * An unset row has no fabric to open, so it gets one first. That is what
	 * the row is asking for, and the window's palette is right there if an
	 * existing colour was wanted instead.
	 */
	const openSlot = (slot: ColorSlot, anchor: DOMRect) => {
		const apply = (from: string, to: string) => store.remapFabric(from, to);
		const reset = (from: string) => store.remapFabric(from, null);
		if (slot.kind === 'fabric') {
			picking = { id: slot.id, anchor, token: ++token, forks: true, apply, reset };
			return;
		}
		const id = store.addMaterial().id;
		store.fillUnset(slot.role, id);
		picking = { id, anchor, token: ++token, created: true, forks: true, apply, reset };
	};

	/** From the one-piece row: the fabric that piece is cut from. */
	const openPiece = (anchor: DOMRect) => {
		const apply = (_from: string, to: string) => store.setPieceFabric(to);
		const reset = () => store.setPieceFabric(null);
		const current = store.selectedPieceFabric;
		if (current) {
			picking = { id: current, anchor, token: ++token, forks: true, apply, reset };
			return;
		}
		const id = store.addMaterial().id;
		store.setPieceFabric(id);
		picking = { id, anchor, token: ++token, created: true, forks: true, apply, reset };
	};

	/*
	 * The picker opens clear of the left panel rather than on top of it, so the
	 * palette and the swatch you came from stay visible while you choose. It
	 * still lines up with whatever was clicked, vertically.
	 */
	const rectOf = (e: Event) => {
		const el = e.currentTarget as HTMLElement;
		const own = el.getBoundingClientRect();
		const panel = el.closest('.side')?.getBoundingClientRect();
		return panel ? new DOMRect(panel.x, own.y, panel.width, own.height) : own;
	};

	const addAndPick = (e: Event) => openPicker(store.addMaterial().id, rectOf(e));
</script>

<details class="attributes" data-panel="attributes" bind:open={store.panels.attributes}>
	<summary class="label section">Attributes</summary>

	{#if store.selectedPiece}
		<ul class="colors">
			<li class="color">
				<span class="color-label">Color 1</span>
				<button
					class="swatch"
					style="background: {hexOf(store.selectedPieceFabric)}"
					aria-label={`Piece colour: ${store.selectedPieceFabric ? nameOf(store.selectedPieceFabric) : 'empty'}. Change it.`}
					onclick={(e) => openPiece(rectOf(e))}
				></button>
				<span class="hex-row">
					<span class="hex-label">Hex code:</span>
					<span class="hex-chip">{hexTextOf(store.selectedPieceFabric)}</span>
				</span>
				<span class="color-name">
					{store.selectedPieceFabric ? nameOf(store.selectedPieceFabric) : 'Empty'}
				</span>
			</li>
		</ul>
		<p class="hint">
			Inside
			<button class="link" onclick={() => store.selectParent()}>{store.parentLabel}</button>
		</p>
	{:else if !store.activeScope.length}
		<p class="hint muted">No blocks selected</p>
	{:else if !store.selectionSlots.length}
		<p class="hint muted">The selected blocks are empty</p>
	{:else}
		<ul class="colors">
			{#each store.selectionSlots as slot, i (slotKey(slot))}
				{@const fabric = slot.kind === 'fabric' ? slot.id : null}
				{@const label = slot.kind === 'fabric' ? `Color ${i + 1}` : `Unset ${slot.role + 1}`}
				<li class="color">
					<span class="color-label">{label}</span>
					<button
						class="swatch"
						style="background: {slot.kind === 'fabric' ? hexOf(slot.id) : ROLE_FILL[slot.role]}"
						aria-label={`${label}: ${fabric ? nameOf(fabric) : 'no color yet'}. Change it.`}
						onclick={(e) => openSlot(slot, rectOf(e))}
					></button>
					<span class="hex-row">
						<span class="hex-label">Hex code:</span>
						<span class="hex-chip">
							{slot.kind === 'fabric'
								? hexTextOf(slot.id)
								: ROLE_FILL[slot.role].slice(1).toUpperCase()}
						</span>
					</span>
					<span class="color-name">{fabric ? nameOf(fabric) : 'No color'}</span>
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
	<p class="hint muted">Click a color to paint with it and adjust it.</p>
	<div class="swatches palette">
		{#each store.materials as material (material.id)}
			<button
				class="swatch"
				class:current={material.id === store.selectedMaterialId}
				style="background: {material.hex}"
				title={material.name.trim() || material.hex.toUpperCase()}
				aria-label={`Paint with ${material.name.trim() || material.hex.toUpperCase()} and adjust it.`}
				onclick={(e) => {
					store.selectMaterial(material.id);
					openPicker(material.id, rectOf(e));
				}}
				onkeydown={(e) => {
					// The swatch you are on is the one delete takes.
					if (e.key !== 'Delete' && e.key !== 'Backspace') return;
					e.preventDefault();
					e.stopPropagation();
					store.deleteMaterial(material.id);
				}}
			></button>
		{/each}
		<button class="swatch add" title="Add a color" aria-label="Add a color" onclick={addAndPick}>
			<span aria-hidden="true">+</span>
		</button>
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
				<span class="hex-label">Hex code:</span>
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
		<p class="hint muted">
			{store.materials.length
				? 'No color chosen. Shapes you place stay gray.'
				: 'No colors yet. Shapes you place stay gray until you add one.'}
		</p>
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
</details>

<!-- Keyed on the fabric, so opening it on a second colour starts it over. -->
{#if picking}
	{@const target = picking}
	{#key target.token}
		<ColorPicker
			hex={hexOf(target.id)}
			anchor={target.anchor}
			swatches={store.materials}
			selectedId={target.id}
			onpick={(next) => {
				// A row's first change forks; from then on it is that fork being mixed.
				if (!target.forks || target.created) {
					store.recolorMaterial(target.id, next);
					return;
				}
				const forked = store.addMaterial(next);
				target.apply(target.id, forked.id);
				picking = { ...target, id: forked.id, created: true };
			}}
			onselect={(id) => {
				target.apply(target.id, id);
				// A fabric made only to open the row goes again if nothing took it up.
				if (target.created && !store.inUse.has(target.id)) store.deleteMaterial(target.id);
				picking = {
					id,
					anchor: target.anchor,
					token: ++token,
					forks: target.forks,
					apply: target.apply,
					reset: target.reset
				};
			}}
			onreset={() => {
				target.reset(target.id);
				if (target.created && !store.inUse.has(target.id)) store.deleteMaterial(target.id);
				picking = null;
			}}
			onclose={() => (picking = null)}
		/>
	{/key}
{/if}

<style>
	.attributes {
		border-top: 1px solid var(--qb-line);
		padding-bottom: 1.5rem;
	}
	.attributes > summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.attributes > summary::-webkit-details-marker {
		display: none;
	}
	.attributes > summary::before {
		content: '';
		width: 0;
		height: 0;
		border-left: 4px solid currentColor;
		border-top: 3.5px solid transparent;
		border-bottom: 3.5px solid transparent;
		transition: transform 120ms ease;
	}
	.attributes[open] > summary::before {
		transform: rotate(90deg);
	}
	.label {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}
	.section {
		padding: 1.5rem var(--qb-pad) 0.55rem;
	}
	.hint {
		margin: 0 var(--qb-pad) 0.5rem;
		font-size: 0.75rem;
		color: var(--qb-ink);
	}
	.muted {
		font-style: italic;
	}

	/* Two 107px columns, 33px apart: the design's attributes block. */
	.colors {
		list-style: none;
		margin: 0;
		padding: 0 var(--qb-pad);
		display: grid;
		grid-template-columns: repeat(auto-fill, 6.6875rem);
		gap: 1.1rem 2.0625rem;
	}
	.color {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.color-label {
		font-size: 0.625rem;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
	}
	.color-name {
		font-size: 0.625rem;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--qb-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* A flat fill, no border: the colour is the control. */
	.color .swatch {
		width: 6.6875rem;
		height: 2.3125rem;
		border: none;
	}
	.hex-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.hex-label {
		font-size: 0.625rem;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
		white-space: nowrap;
	}
	.hex-chip {
		display: inline-block;
		min-width: 2.75rem;
		padding: 0.1875rem 0.3rem;
		background: #dadbde;
		font-size: 0.625rem;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
		text-align: center;
	}

	.swatch {
		width: 2.5rem;
		height: 1.35rem;
		padding: 0;
		border: 1px solid var(--qb-line);
		cursor: pointer;
		position: relative;
	}
	/* Marked the way every other chosen tile is: a heavier black rule. */
	.swatch.current {
		outline: 1.5px solid #000;
		outline-offset: 0;
	}
	.swatch.add {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fff;
		color: var(--qb-ink);
		font-size: 0.9rem;
		line-height: 1;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.palette {
		position: relative;
		padding: 0 var(--qb-pad);
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
		padding: 0.75rem var(--qb-pad) 0;
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
		font-size: 0.75rem;
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
		margin: 1rem var(--qb-pad) 0;
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
