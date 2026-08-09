<script lang="ts">
	import { COLS, FABRIC_BY_ID, FABRICS, ROWS, SQUARE_INCHES, inchesToFeet } from './data';
	import {
		LAYOUTS,
		SHAPE_AREA,
		SHAPE_CUT,
		SHAPE_LABEL,
		type LayoutId,
		type Point,
		type ShapeKind,
		rotatedSlots,
		slotAt,
		toPolygonPoints
	} from './geometry';

	const CELL_COUNT = ROWS * COLS;
	/** SVG user units per cell; the cell scales with CSS, coordinates stay simple. */
	const VB = 100;

	interface Cell {
		layout: LayoutId;
		rotation: number;
		/** One fabric id (or null) per slot of the layout. */
		slots: (string | null)[];
	}

	const emptyCell = (): Cell => ({ layout: 'whole', rotation: 0, slots: [null] });
	const isEmpty = (cell: Cell) => cell.slots.every((s) => s === null);

	let cells = $state<Cell[]>(Array.from({ length: CELL_COUNT }, emptyCell));

	type Tool = 'select' | 'place' | 'erase';
	let tool = $state<Tool>('place');
	let fabric = $state<string>(FABRICS[0].id);
	let piece = $state<LayoutId>('whole');
	let rotation = $state(0);
	let selected = $state<number | null>(null);
	let hover = $state<{ index: number; point: Point } | null>(null);
	let painting = $state(false);

	/*
	 * The rectangle gets two palette entries (horizontal and vertical) instead
	 * of one entry plus a rotate step; rot pins the orientation. Entries with
	 * rot null keep whatever pending rotation is active, so R can spin them.
	 */
	const PALETTE: { layout: LayoutId; rot: number | null; label: string }[] = [
		{ layout: 'whole', rot: null, label: 'Square' },
		{ layout: 'half', rot: 0, label: 'Horizontal' },
		{ layout: 'half', rot: 1, label: 'Vertical' },
		{ layout: 'diagonal', rot: null, label: 'Triangle' },
		{ layout: 'quarters', rot: null, label: 'Half triangle' }
	];

	/* ── Inventory ─────────────────────────────────────────────────────
	 * Counted in whole-square equivalents: a triangle eats half a square,
	 * a quarter-square triangle a quarter. Offcuts are assumed reusable,
	 * which is optimistic but keeps the number legible.
	 */
	const used = $derived.by(() => {
		const totals: Record<string, number> = {};
		for (const cell of cells) {
			const slots = LAYOUTS[cell.layout].slots;
			cell.slots.forEach((id, i) => {
				if (id) totals[id] = (totals[id] ?? 0) + SHAPE_AREA[slots[i].kind];
			});
		}
		return totals;
	});
	const remaining = $derived(
		Object.fromEntries(FABRICS.map((f) => [f.id, f.count - (used[f.id] ?? 0)]))
	);
	const filled = $derived(cells.filter((c) => !isEmpty(c)).length);
	const selectedKind = $derived<ShapeKind>(LAYOUTS[piece].kind);

	function fmt(n: number): string {
		return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
	}

	/* ── History ───────────────────────────────────────────────────────
	 * One snapshot per gesture (a whole paint-drag is a single undo step).
	 * Undo skips no-op snapshots so gestures that changed nothing do not
	 * eat an undo press.
	 */
	let history = $state<Cell[][]>([]);
	const snapshot = () => cells.map((c) => ({ ...c, slots: [...c.slots] }));

	function pushHistory() {
		history = [...history.slice(-199), snapshot()];
	}

	function undo() {
		const h = [...history];
		const now = JSON.stringify(cells);
		while (h.length) {
			const prev = h.pop()!;
			if (JSON.stringify(prev) !== now) {
				history = h;
				cells = prev;
				return;
			}
		}
		history = h;
	}

	/** Resolve a screen point to a cell and its local 0..1 coordinates. */
	function resolve(x: number, y: number): { index: number; point: Point } | null {
		const el = document.elementFromPoint(x, y)?.closest('[data-cell-index]');
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return {
			index: Number((el as HTMLElement).dataset.cellIndex),
			point: [(x - rect.left) / rect.width, (y - rect.top) / rect.height]
		};
	}

	function update(index: number, next: Cell) {
		const copy = [...cells];
		copy[index] = next;
		cells = copy;
	}

	/** Drop the pending piece into the cell at the given local point. */
	function placeAt(index: number, point: Point, fabricId: string) {
		const cell = cells[index];
		const matches = cell.layout === piece && cell.rotation === rotation;
		const target: Cell = matches
			? { ...cell, slots: [...cell.slots] }
			: { layout: piece, rotation, slots: Array(LAYOUTS[piece].slots.length).fill(null) };

		const slot = slotAt(target.layout, target.rotation, point);
		if (matches && target.slots[slot] === fabricId) return;
		const kind = LAYOUTS[target.layout].slots[slot].kind;
		if (target.slots[slot] !== fabricId && remaining[fabricId] < SHAPE_AREA[kind]) return;
		target.slots[slot] = fabricId;
		update(index, target);
	}

	function eraseAt(index: number, point: Point) {
		const cell = cells[index];
		const slot = slotAt(cell.layout, cell.rotation, point);
		if (cell.slots[slot] === null) return;
		const slots = [...cell.slots];
		slots[slot] = null;
		update(index, slots.every((s) => s === null) ? emptyCell() : { ...cell, slots });
	}

	function rotateCell(index: number) {
		const cell = cells[index];
		if (isEmpty(cell)) return;
		pushHistory();
		update(index, { ...cell, rotation: (cell.rotation + 1) % 4 });
	}

	function deleteSelected() {
		if (selected === null || isEmpty(cells[selected])) return;
		pushHistory();
		update(selected, emptyCell());
		selected = null;
	}

	function clearAll() {
		pushHistory();
		cells = Array.from({ length: CELL_COUNT }, emptyCell);
		selected = null;
	}

	function rotate() {
		if (tool === 'place') rotation = (rotation + 1) % 4;
		else if (selected !== null) rotateCell(selected);
	}

	/* ── Ghost previews ────────────────────────────────────────────────
	 * In place mode the hovered cell renders as the exact state a click
	 * would produce, with the incoming slot at reduced opacity. If the
	 * layout differs, pieces the click would wipe simply vanish from the
	 * preview: an honest before/after.
	 */
	const placePreview = $derived.by(() => {
		if (tool !== 'place' || painting || drag || !hover) return null;
		const { index, point } = hover;
		const cell = cells[index];
		const matches = cell.layout === piece && cell.rotation === rotation;
		const target: Cell = matches
			? { ...cell, slots: [...cell.slots] }
			: { layout: piece, rotation, slots: Array(LAYOUTS[piece].slots.length).fill(null) };
		const slot = slotAt(target.layout, target.rotation, point);
		const kind = LAYOUTS[target.layout].slots[slot].kind;
		const blocked = target.slots[slot] !== fabric && remaining[fabric] < SHAPE_AREA[kind];
		if (!blocked) target.slots[slot] = fabric;
		return { index, cell: target, slot, blocked };
	});

	const erasePreview = $derived.by(() => {
		if (tool !== 'erase' || painting || drag || !hover) return null;
		const cell = cells[hover.index];
		const slot = slotAt(cell.layout, cell.rotation, hover.point);
		if (cell.slots[slot] === null) return null;
		return { index: hover.index, slot };
	});

	/* ── Drag (mouse tool: move pieces between cells) ──────────────────
	 * Pointer events rather than HTML5 drag-and-drop, so touch behaves the
	 * same as mouse. A press only becomes a drag past a small threshold,
	 * leaving plain taps free to select.
	 */
	const DRAG_THRESHOLD = 5;

	interface Drag {
		fabricId: string;
		/** Where the drag started, or null when dragging a fresh piece from the palette. */
		from: { index: number; slot: number } | null;
		x: number;
		y: number;
		active: boolean;
	}
	let drag = $state<Drag | null>(null);

	function startDrag(e: PointerEvent, fabricId: string, from: Drag['from']) {
		if (e.button !== 0) return;
		drag = { fabricId, from, x: e.clientX, y: e.clientY, active: false };
	}

	function onCellPointerDown(e: PointerEvent, index: number) {
		if (e.button !== 0) return;
		const hit = resolve(e.clientX, e.clientY);
		if (!hit) return;
		if (tool === 'place') {
			pushHistory();
			painting = true;
			placeAt(index, hit.point, fabric);
			return;
		}
		if (tool === 'erase') {
			pushHistory();
			painting = true;
			eraseAt(index, hit.point);
			return;
		}
		const cell = cells[index];
		const slot = slotAt(cell.layout, cell.rotation, hit.point);
		const existing = cell.slots[slot];
		if (existing) {
			selected = index;
			startDrag(e, existing, { index, slot });
		} else {
			selected = null;
		}
	}

	function onPointerMove(e: PointerEvent) {
		const hit = resolve(e.clientX, e.clientY);
		hover = hit ? { index: hit.index, point: hit.point } : null;
		if (painting) {
			if (hit) {
				if (tool === 'erase') eraseAt(hit.index, hit.point);
				else placeAt(hit.index, hit.point, fabric);
			}
			return;
		}
		if (drag) {
			if (!drag.active) {
				if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
				drag = { ...drag, active: true };
			}
			drag = { ...drag, x: e.clientX, y: e.clientY };
		}
	}

	function onPointerUp(e: PointerEvent) {
		painting = false;
		if (!drag) return;
		const { from, fabricId, active } = drag;
		drag = null;
		if (!active) return;

		const hit = resolve(e.clientX, e.clientY);
		if (!hit) {
			// Dragged off the blanket: take the piece back out of the layout.
			if (from) {
				pushHistory();
				const cell = cells[from.index];
				const slots = [...cell.slots];
				slots[from.slot] = null;
				update(from.index, slots.every((s) => s === null) ? emptyCell() : { ...cell, slots });
			}
			return;
		}

		if (!from) {
			pushHistory();
			placeAt(hit.index, hit.point, fabricId);
			return;
		}

		// Moving a piece already on the blanket: swap with whatever it lands on.
		const source = cells[from.index];
		const dest = cells[hit.index];
		const destSlot = slotAt(dest.layout, dest.rotation, hit.point);
		if (from.index === hit.index && from.slot === destSlot) return;

		pushHistory();
		const sourceSlots = [...source.slots];
		const destSlots = from.index === hit.index ? sourceSlots : [...dest.slots];
		const displaced = destSlots[destSlot];
		destSlots[destSlot] = fabricId;
		sourceSlots[from.slot] = displaced;

		update(hit.index, { ...dest, slots: destSlots });
		if (from.index !== hit.index) {
			update(
				from.index,
				sourceSlots.every((s) => s === null) ? emptyCell() : { ...source, slots: sourceSlots }
			);
		}
		selected = hit.index;
	}

	function onKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			undo();
			return;
		}
		if (e.key === 'Escape') {
			drag = null;
			selected = null;
			return;
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (tool === 'select') deleteSelected();
			return;
		}
		if (e.key === 'r' || e.key === 'R') rotate();
	}

	function pickPiece(entry: (typeof PALETTE)[number]) {
		piece = entry.layout;
		if (entry.rot !== null) rotation = entry.rot;
		tool = 'place';
	}

	function pickFabric(id: string) {
		fabric = id;
		tool = 'place';
	}

	const widthIn = COLS * SQUARE_INCHES;
	const heightIn = ROWS * SQUARE_INCHES;
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onkeydown={onKeyDown} />

<div class="exploration">
	<header class="hero">
		<h1>Quilt Builder</h1>
		<p class="subtitle">
			A design wall for one finite pile of scrap fabric. Every cell is an {SQUARE_INCHES}" square
			that can hold a whole square, two rectangles, two triangles, or four half-triangles. Drag
			pieces around until something looks right.
		</p>
	</header>

	<section class="tool">
		<div class="tool-grid">
			<aside class="palette">
				<h3>Piece</h3>
				<div class="pieces">
					{#each PALETTE as entry}
						<button
							class="piece"
							class:active={tool === 'place' &&
								piece === entry.layout &&
								(entry.rot === null || rotation % 2 === entry.rot)}
							onclick={() => pickPiece(entry)}
							title={SHAPE_CUT[LAYOUTS[entry.layout].kind]}
						>
							<svg viewBox="0 0 {VB} {VB}" aria-hidden="true">
								{#each rotatedSlots(entry.layout, entry.rot ?? rotation) as slot, i}
									<polygon
										points={toPolygonPoints(slot.points, VB)}
										fill={i === 0 ? 'var(--color-text-secondary)' : 'transparent'}
										stroke="var(--color-text-secondary)"
										stroke-width="3"
									/>
								{/each}
							</svg>
							<span>{entry.label}</span>
						</button>
					{/each}
				</div>
				<div class="palette-actions">
					<button
						class="tool-btn"
						class:active={tool === 'select'}
						onclick={() => (tool = 'select')}
					>
						Mouse
					</button>
					<button class="tool-btn" class:active={tool === 'erase'} onclick={() => (tool = 'erase')}>
						Eraser
					</button>
					<button class="tool-btn" onclick={rotate}>Rotate <kbd>R</kbd></button>
					<button class="tool-btn" onclick={undo} disabled={history.length === 0}>
						Undo <kbd>⌘Z</kbd>
					</button>
					<button class="tool-btn" onclick={clearAll} disabled={filled === 0}>Clear</button>
				</div>

				<h3 class="scraps-head">The scrap pile</h3>
				<p class="hint">
					Counted in whole squares: a triangle uses half of one, a half-triangle a quarter.
				</p>
				<div class="swatches">
					{#each FABRICS as f}
						{@const left = remaining[f.id]}
						{@const short = left < SHAPE_AREA[selectedKind]}
						<button
							class="swatch"
							class:active={fabric === f.id && tool === 'place'}
							class:depleted={short}
							onpointerdown={(e) => !short && startDrag(e, f.id, null)}
							onclick={() => pickFabric(f.id)}
							title={`${f.name}: ${fmt(left)} of ${f.count} squares left`}
						>
							<span class="chip" style="background: {f.hex}"></span>
							<span class="swatch-name">{f.name}</span>
							<span class="swatch-count">{fmt(left)}<span class="of">/{f.count}</span></span>
						</button>
					{/each}
				</div>
			</aside>

			<div class="wall-side">
				<div class="wall">
					<div
						class="blanket"
						class:tool-select={tool === 'select'}
						class:tool-place={tool === 'place'}
						class:tool-erase={tool === 'erase'}
						style="grid-template-columns: repeat({COLS}, 1fr); aspect-ratio: {COLS} / {ROWS}"
					>
						{#each cells as cell, i}
							{@const pv = placePreview?.index === i ? placePreview : null}
							{@const ev = erasePreview?.index === i ? erasePreview : null}
							{@const display = pv ? pv.cell : cell}
							<button
								class="cell"
								class:hovered={hover?.index === i}
								class:selected={selected === i}
								class:blocked={pv?.blocked}
								data-cell-index={i}
								onpointerdown={(e) => onCellPointerDown(e, i)}
								oncontextmenu={(e) => {
									e.preventDefault();
									rotateCell(i);
								}}
								aria-label={`Row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`}
							>
								<svg viewBox="0 0 {VB} {VB}" preserveAspectRatio="none">
									{#each rotatedSlots(display.layout, display.rotation) as slot, s}
										{@const id = display.slots[s]}
										<polygon
											points={toPolygonPoints(slot.points, VB)}
											fill={id ? FABRIC_BY_ID[id].hex : '#ffffff'}
											class:ghost={pv !== null && s === pv.slot && !pv.blocked}
											class:erasing={ev !== null && s === ev.slot}
											stroke={display.slots.length > 1 ? 'rgba(0,0,0,0.18)' : 'none'}
											stroke-width="1"
											vector-effect="non-scaling-stroke"
										/>
									{/each}
								</svg>
							</button>
						{/each}
					</div>
				</div>
				<p class="wall-caption">
					{COLS} × {ROWS} squares at {SQUARE_INCHES}" ({inchesToFeet(widthIn)} × {inchesToFeet(
						heightIn
					)} finished); {filled} of {CELL_COUNT} cells started. Pick a piece and color, then click or
					drag to paint. The mouse tool selects a square: R or right-click rotates it, delete removes
					it, drag moves it. ⌘Z undoes.
				</p>
			</div>
		</div>
	</section>
</div>

{#if drag?.active}
	<div
		class="drag-ghost"
		style="left: {drag.x}px; top: {drag.y}px; background: {FABRIC_BY_ID[drag.fabricId].hex}"
	></div>
{/if}

<style>
	.exploration {
		max-width: 1000px;
		margin: 0 auto;
		padding: 3rem 1.25rem 6rem;
		color: var(--color-text);
		line-height: 1.6;
	}
	.hero {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		letter-spacing: -0.02em;
		margin: 0 0 1rem;
		color: var(--color-text-strong);
	}
	.subtitle {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		max-width: 62ch;
		margin: 0 auto;
	}

	.tool-grid {
		display: grid;
		grid-template-columns: 15rem minmax(0, 1fr);
		gap: 2rem;
		align-items: start;
	}
	.palette h3 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
		color: var(--color-text-heading);
	}
	.scraps-head {
		margin-top: 1.75rem;
	}
	.hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0 0 0.75rem;
		line-height: 1.4;
	}

	.pieces {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.4rem;
	}
	.piece {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.5rem 0.25rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.piece:hover {
		background: var(--color-surface-active);
	}
	.piece.active {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
		color: var(--color-text-strong);
	}
	.piece svg {
		width: 2rem;
		height: 2rem;
	}

	.swatches {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.swatch {
		display: grid;
		grid-template-columns: 1.4rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.82rem;
		text-align: left;
		cursor: grab;
		touch-action: none;
	}
	.swatch:hover {
		background: var(--color-surface-active);
	}
	.swatch.active {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
	}
	.swatch.depleted {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.chip {
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border-subtle);
	}
	.swatch-count {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}
	.of {
		color: var(--color-text-muted);
	}

	.palette-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}
	.tool-btn {
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.tool-btn.active {
		background: var(--color-filter-active-bg);
		color: var(--color-filter-active-text);
	}
	.tool-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	kbd {
		font-size: 0.7rem;
		opacity: 0.7;
	}

	/* The design wall: a neutral backdrop so the fabric colours read true. */
	.wall {
		background: #616161;
		padding: 1.25rem;
		border-radius: 0.5rem;
	}
	.blanket {
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
		touch-action: none;
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
	.cell.selected {
		box-shadow: inset 0 0 0 3px #f59e0b;
		z-index: 2;
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
	.wall-caption {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0.6rem 0 0;
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

	@media (max-width: 768px) {
		.tool-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
