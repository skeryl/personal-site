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
	 * list and the materials list are built from them.
	 */

	import { ROLE_FILL } from './geometry';
	import ColorPicker from './ColorPicker.svelte';
	import type { ColorSlot, QuiltStore } from './state.svelte';

	let { store }: { store: QuiltStore } = $props();

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
	<!-- The design rules the block grid off from the colours below it. -->
	<hr class="rule" />
	<div class="label section">Color selection</div>

	{#if store.selectedPiece}
		<ul class="colors">
			<li class="color">
				<span class="color-label">{store.selectedPieceFabric ? 'Color 1' : 'Unset'}</span>
				<button
					class="swatch"
					class:bare={!store.selectedPieceFabric}
					style={store.selectedPieceFabric ? `background: ${hexOf(store.selectedPieceFabric)}` : ''}
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
		<p class="hint muted">none selected</p>
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

	<div class="label section">
		Color palette
		<button class="add-color" onclick={addAndPick}>+ Add color</button>
	</div>
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
				<!--
					The name is editable where it is read, and falls back to the
					fabric's hex until it is given one. Its count of pieces on the
					quilt sits outside the field, so a long name is shortened
					against it rather than pushing it out of sight.
				-->
				<span class="entry-name" title={name}>
					<input
						class="entry-label"
						type="text"
						maxlength="40"
						size={Math.max(name.length, 1)}
						aria-label={`Name for ${name}`}
						value={material.name}
						placeholder={material.hex.slice(1).toUpperCase()}
						oninput={(e) => store.renameMaterial(material.id, e.currentTarget.value)}
					/>
					<span class="entry-count">({store.usage.get(material.id) ?? 0})</span>
				</span>
			</div>
		{/each}
		{#if !store.materials.length}
			<!--
				Nothing chosen yet: the design leaves the slots a colour would
				fill standing empty, rather than an empty band of panel.
			-->
			{#each { length: 3 } as _, i (i)}
				<span class="slot" aria-hidden="true"></span>
			{/each}
		{/if}
	</div>
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
	/* The same 12px Cabin heading the rest of the palette uses. */
	.label {
		font-family: var(--qb-sans);
		font-size: 10px;
		line-height: 18px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}
	/* The short rule the design draws between the grid and the colours. */
	.rule {
		margin: 16px 34px 0 49px;
		border: none;
		border-top: var(--qb-divider);
	}
	.section {
		padding: 16px 10px 4px;
	}
	.hint {
		margin: 0 10px 0.5rem 47px;
		font-family: var(--qb-sans);
		font-size: 12px;
		letter-spacing: 0.36px;
		color: var(--qb-muted);
	}
	/*
	 * With nothing selected the note sits straight under the heading, as the
	 * design draws it: the heading's own bottom padding is taken back, and
	 * then the few pixels the design laps the two lines by. There are no
	 * swatches between them to separate, and the gap only read as something
	 * missing.
	 */
	.muted {
		font-style: italic;
		/* The site gives every <p> its own vertical padding; this one is a
		   single line and sets its own room. */
		padding: 0;
		margin-top: calc(-4px - 3px);
		line-height: 20px;
	}

	/* Two 107px columns, 33px apart: the design's attributes block. */
	.colors {
		list-style: none;
		margin: 0;
		padding: 0 10px 0 47px;
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
	/*
	 * A hairline on every swatch. The design draws them as flat fills, which
	 * works until the fill is white or near it and the swatch disappears into
	 * the panel with no edge to aim at.
	 */
	/*
	 * Square, as the design cuts them. The corners have to be said out loud:
	 * "chip" is also a Tailwind class the site generates, and it rounds
	 * anything wearing the name.
	 */
	.color .swatch,
	.chip {
		border: 1px solid var(--qb-line);
		border-radius: 0;
	}
	.color .swatch {
		width: 51px;
		height: 37px;
		padding: 0;
		cursor: pointer;
	}
	/*
	 * Nothing at all, rather than a colour that happens to be white: the
	 * checkerboard image editors use to mean the same thing.
	 */
	.bare {
		background-color: #fff;
		background-image:
			linear-gradient(45deg, #d5d5d5 25%, transparent 25%, transparent 75%, #d5d5d5 75%),
			linear-gradient(45deg, #d5d5d5 25%, transparent 25%, transparent 75%, #d5d5d5 75%);
		background-size: 10px 10px;
		background-position:
			0 0,
			5px 5px;
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

	/*
	 * Three to a row, each a broad band of colour 40 high with its name
	 * centred under it — the size the design draws a swatch at, and the size
	 * the empty slots below stand in at. The columns are thirds rather than a
	 * fixed width, so a row holding one fabric puts it where a row holding
	 * three would put the first instead of stretching it across the panel.
	 *
	 * Rows sit far enough apart that a chosen swatch's box has room to stand
	 * clear of the name under it.
	 */
	.palette {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		align-items: start;
		gap: 1.25rem 10px;
		padding: 0 10px;
	}
	.entry {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}
	.chip {
		width: 100%;
		height: 40px;
		padding: 0;
		cursor: pointer;
	}
	/*
	 * The fabric you are painting with, boxed in black the way the design
	 * marks a chosen tile: the rule stands off the colour rather than sitting
	 * on it, so the swatch is still read as the colour it is and not as a
	 * colour with a dark edge.
	 */
	.chip.current {
		outline: var(--qb-picked);
		outline-offset: var(--qb-picked-gap);
	}
	/*
	 * The count holds its own width at the end of the row and the name takes
	 * what is left, so it is the name that shortens — FLA...(10) rather than
	 * a count run off the edge.
	 */
	/* An empty slot: the grey the design stands in for a colour not yet made. */
	.slot {
		min-width: 0;
		height: 40px;
		background: #e9e9e9;
	}

	/*
	 * Centred under its swatch, and in the app's own hand rather than the
	 * sans the headings above are labelled in: a fabric's name is something
	 * typed into the quilt, the way the quilt's own name is.
	 */
	.entry-name {
		display: flex;
		justify-content: center;
		align-items: baseline;
		width: 100%;
		/* Clears the box drawn around a chosen swatch. */
		margin-top: 4px;
		font-family: var(--qb-mono);
		font-size: 10px;
		line-height: 18px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
	}
	/*
	 * Only as wide as the name needs. Stretched to fill the row instead, the
	 * count was thrown out to the far edge and each entry's number ended up
	 * closer to the next fabric's name than to its own.
	 */
	.entry-label {
		flex: 0 1 auto;
		min-width: 0;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: inherit;
		background: none;
		border: none;
		border-radius: 0;
		padding: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Unnamed, a fabric reads as its hex, in the same ink as any other name. */
	.entry-label::placeholder {
		color: inherit;
		opacity: 1;
	}
	.entry-label:focus {
		outline: none;
		box-shadow: 0 1px 0 0 #000;
	}
	.entry-count {
		flex: none;
		padding-left: 0.25em;
	}
	.add-color {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 10px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--qb-link);
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
</style>
