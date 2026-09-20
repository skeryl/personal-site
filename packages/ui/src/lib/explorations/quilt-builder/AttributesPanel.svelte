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

<div class="attributes" data-panel="attributes">
	<div class="label section">Color selection</div>

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
				<span class="hex-chip">{hexTextOf(store.selectedPieceFabric)}</span>
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
					<span class="hex-chip">
						{slot.kind === 'fabric'
							? hexTextOf(slot.id)
							: ROLE_FILL[slot.role].slice(1).toUpperCase()}
					</span>
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

	<div class="label section">Color palette</div>
	<div class="palette">
		{#each store.materials as material (material.id)}
			{@const name = material.name.trim() || material.hex.slice(1).toUpperCase()}
			<div class="entry">
				<button
					class="chip"
					class:current={material.id === store.selectedMaterialId}
					style="background: {material.hex}"
					aria-label={`Paint with ${name} and adjust it.`}
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
				<span class="entry-name" title={name}>{name} ({store.usage.get(material.id) ?? 0})</span>
			</div>
		{/each}
		<button class="add-color" onclick={addAndPick}>+ Add color</button>
	</div>

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
</div>

<!-- Keyed on the fabric, so opening it on a second colour starts it over. -->
{#if picking}
	{@const target = picking}
	{#key target.token}
		<ColorPicker
			hex={hexOf(target.id)}
			anchor={target.anchor}
			name={store.materialById.get(target.id)?.name ?? ''}
			onrename={(next) => store.renameMaterial(target.id, next)}
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
		padding-bottom: 1.5rem;
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
	/*
	 * The design's own sizes: a 51 by 37 swatch with its hex directly under
	 * it, and no label in between. The fabric's name belongs to the palette
	 * below, where it is shown with how much of it the quilt uses.
	 */
	.color .swatch {
		width: 51px;
		height: 37px;
		padding: 0;
		border: none;
		cursor: pointer;
	}
	.hex-chip {
		display: block;
		width: 51px;
		padding: 0.1875rem 7px;
		background: #dadbde;
		font-size: 10px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
	}

	/* Swatches 50 by 43, each over its name and its share of the quilt. */
	.palette {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.75rem 19px;
		padding: 0 var(--qb-pad);
	}
	.entry {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 50px;
	}
	.chip {
		width: 50px;
		height: 43px;
		padding: 0;
		border: none;
		cursor: pointer;
	}
	.chip.current {
		outline: 1.5px solid #000;
		outline-offset: 0;
	}
	.entry-name {
		font-size: 10px;
		line-height: 18px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--qb-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.add-color {
		align-self: center;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 10px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #1d4ed8;
		cursor: pointer;
	}
	.add-color:hover {
		text-decoration: underline;
		text-underline-offset: 0.25em;
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

	/* Marked the way every other chosen tile is: a heavier black rule. */

	.link {
		font: inherit;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-text-strong);
		text-decoration: underline;
		cursor: pointer;
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
