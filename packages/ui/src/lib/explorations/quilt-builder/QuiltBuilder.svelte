<script lang="ts">
	import { browser } from '$app/environment';
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

	/* ── Persistence ───────────────────────────────────────────────────
	 * Named patterns plus the working state live in localStorage. Saved
	 * cells are sanitized on the way in, so a stale save (or a future
	 * change to the grid or fabrics) degrades to empty cells instead of
	 * breaking the page.
	 */
	const PATTERNS_KEY = 'quilt-builder:patterns';
	const CURRENT_KEY = 'quilt-builder:current';

	interface SavedPattern {
		id: string;
		name: string;
		cells: Cell[];
		savedAt: number;
	}

	function sanitizeCells(raw: unknown): Cell[] {
		const list = Array.isArray(raw) ? raw : [];
		return Array.from({ length: CELL_COUNT }, (_, i) => {
			const c = list[i] as Partial<Cell> | undefined;
			const layout = c && typeof c.layout === 'string' && c.layout in LAYOUTS ? c.layout : null;
			if (!layout || !Array.isArray(c!.slots)) return emptyCell();
			const slotCount = LAYOUTS[layout].slots.length;
			if (c!.slots.length !== slotCount) return emptyCell();
			return {
				layout,
				rotation: typeof c!.rotation === 'number' ? ((c!.rotation % 4) + 4) % 4 : 0,
				slots: c!.slots.map((s) => (typeof s === 'string' && s in FABRIC_BY_ID ? s : null))
			};
		});
	}

	function readJson(key: string): unknown {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function sanitizePatterns(raw: unknown): Record<string, SavedPattern> {
		if (typeof raw !== 'object' || raw === null) return {};
		const out: Record<string, SavedPattern> = {};
		for (const [key, p] of Object.entries(raw as Record<string, Partial<SavedPattern>>)) {
			if (typeof p !== 'object' || p === null) continue;
			// Saves from before ids existed were keyed by name; migrate them.
			const id = typeof p.id === 'string' ? p.id : crypto.randomUUID();
			out[id] = {
				id,
				name: typeof p.name === 'string' ? p.name : key,
				cells: sanitizeCells(p.cells),
				savedAt: typeof p.savedAt === 'number' ? p.savedAt : 0
			};
		}
		return out;
	}

	const initialPatterns = browser ? sanitizePatterns(readJson(PATTERNS_KEY)) : {};
	let patterns = $state<Record<string, SavedPattern>>(initialPatterns);
	let patternName = $state('');
	/** Id of the loaded pattern; null while working on something unsaved. */
	let currentId = $state<string | null>(null);

	if (browser) {
		// Write migrated ids back immediately; otherwise legacy name-keyed
		// saves would mint a fresh uuid on every load and the autosaved
		// currentId could never match after a reload.
		localStorage.setItem(PATTERNS_KEY, JSON.stringify(initialPatterns));
		const current = readJson(CURRENT_KEY);
		if (Array.isArray(current)) {
			cells = sanitizeCells(current);
		} else if (current && typeof current === 'object') {
			const c = current as { cells?: unknown; currentId?: unknown; name?: unknown };
			if (c.cells) cells = sanitizeCells(c.cells);
			if (typeof c.currentId === 'string' && c.currentId in initialPatterns) {
				currentId = c.currentId;
			}
			if (typeof c.name === 'string') patternName = c.name;
		}
	}

	$effect(() => {
		localStorage.setItem(CURRENT_KEY, JSON.stringify({ cells, currentId, name: patternName }));
	});

	const patternList = $derived(Object.values(patterns).sort((a, b) => b.savedAt - a.savedAt));

	let patternFilter = $state('');
	const filteredPatterns = $derived(
		patternList.filter((p) => p.name.toLowerCase().includes(patternFilter.trim().toLowerCase()))
	);

	/** Flatten a saved pattern into offset polygons for a thumbnail SVG. */
	function thumbPolys(cellsArr: Cell[]): { points: string; fill: string }[] {
		const polys: { points: string; fill: string }[] = [];
		cellsArr.forEach((cell, i) => {
			if (isEmpty(cell)) return;
			const r = rowOf(i);
			const c = colOf(i);
			rotatedSlots(cell.layout, cell.rotation).forEach((slot, s) => {
				const id = cell.slots[s];
				polys.push({
					points: slot.points.map(([x, y]) => `${(c + x) * 10},${(r + y) * 10}`).join(' '),
					fill: id ? FABRIC_BY_ID[id].hex : '#ffffff'
				});
			});
		});
		return polys;
	}

	function savePattern() {
		const name = patternName.trim();
		if (!name) return;
		// Saving with a loaded pattern updates it in place, renames included;
		// otherwise a fresh id is minted.
		const id = currentId ?? crypto.randomUUID();
		patterns = { ...patterns, [id]: { id, name, cells: snapshot(), savedAt: Date.now() } };
		currentId = id;
		localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
	}

	function loadPattern(id: string) {
		const p = patterns[id];
		if (!p) return;
		pushHistory();
		cells = sanitizeCells(p.cells);
		selection = [];
		anchor = null;
		currentId = id;
		patternName = p.name;
	}

	function deletePattern(id: string) {
		const p = patterns[id];
		if (!p || !confirm(`Delete pattern "${p.name}"?`)) return;
		const next = { ...patterns };
		delete next[id];
		patterns = next;
		if (currentId === id) currentId = null;
		localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
	}

	/** Title edits rename a loaded pattern immediately on blur or enter. */
	function commitName() {
		const name = patternName.trim();
		if (!currentId || !name) return;
		const p = patterns[currentId];
		if (!p || p.name === name) return;
		patterns = { ...patterns, [currentId]: { ...p, name } };
		localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
	}

	function newPattern() {
		pushHistory();
		cells = Array.from({ length: CELL_COUNT }, emptyCell);
		selection = [];
		anchor = null;
		currentId = null;
		const names = new Set(Object.values(patterns).map((p) => p.name));
		let n = 1;
		while (names.has(`Pattern ${n}`)) n++;
		patternName = `Pattern ${n}`;
	}

	type Tool = 'select' | 'place' | 'erase';
	let tool = $state<Tool>('place');
	let fabric = $state<string>(FABRICS[0].id);
	let piece = $state<LayoutId>('whole');
	let rotation = $state(0);
	let selection = $state<number[]>([]);
	/** Last cell acted on: base for arrow-key navigation and group drags. */
	let anchor = $state<number | null>(null);
	/** What escape deselected, so enter can bring it back. */
	let lastSelection: number[] = [];
	let lastAnchor: number | null = null;
	let hover = $state<{ index: number; point: Point } | null>(null);
	let painting = $state(false);

	/* ── Symmetry ──────────────────────────────────────────────────────
	 * Axis positions are in half-cell units, so a mirror line can sit on
	 * a grid line or through the middle of a row/column. Painting and
	 * erasing mirror across the enabled axes; pieces reflect properly
	 * (a triangle mirrors to its mirror image, not a copy).
	 */
	let symV = $state(false);
	let symH = $state(false);
	let axisV = $state(COLS);
	let axisH = $state(ROWS);
	let axisDrag = $state<'v' | 'h' | null>(null);
	/** Shift-drag rubber-band selection (mouse tool). */
	let marquee = $state<{
		x0: number;
		y0: number;
		x: number;
		y: number;
		toggleIndex: number;
		base: number[];
		active: boolean;
	} | null>(null);
	let blanketEl = $state<HTMLElement | null>(null);

	/** Reflect a cell's geometry across a vertical or horizontal axis. */
	function mirrorCellGeom(cell: Cell, axis: 'v' | 'h'): Cell {
		if (isEmpty(cell)) return emptyCell();
		const src = rotatedSlots(cell.layout, cell.rotation);
		const polyKey = (pts: Point[]) =>
			pts
				.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`)
				.sort()
				.join('|');
		const mirroredKeys = src.map((slot) =>
			polyKey(slot.points.map(([x, y]) => (axis === 'v' ? [1 - x, y] : [x, 1 - y]) as Point))
		);
		for (let r = 0; r < 4; r++) {
			const cand = rotatedSlots(cell.layout, r);
			const candKeys = cand.map((slot) => polyKey(slot.points));
			if ([...candKeys].sort().join(';') !== [...mirroredKeys].sort().join(';')) continue;
			const taken = new Set<number>();
			const slots = candKeys.map((ck) => {
				const mi = mirroredKeys.findIndex((mk, idx) => mk === ck && !taken.has(idx));
				taken.add(mi);
				return cell.slots[mi];
			});
			return { layout: cell.layout, rotation: r, slots };
		}
		return { ...cell, slots: [...cell.slots] };
	}

	/** Mirrored copies of a cell for every enabled axis, keyed by grid index. */
	function mirrorTargets(index: number, cell: Cell): Map<number, Cell> {
		const out = new Map<number, Cell>();
		const r = rowOf(index);
		const c = colOf(index);
		const cv = symV ? axisV - c - 1 : null;
		const rh = symH ? axisH - r - 1 : null;
		const push = (rr: number, cc: number, mc: Cell) => {
			if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
			const idx = rr * COLS + cc;
			if (idx === index || out.has(idx)) return;
			out.set(idx, mc);
		};
		if (cv !== null) push(r, cv, mirrorCellGeom(cell, 'v'));
		if (rh !== null) push(rh, c, mirrorCellGeom(cell, 'h'));
		if (cv !== null && rh !== null) push(rh, cv, mirrorCellGeom(mirrorCellGeom(cell, 'v'), 'h'));
		return out;
	}

	/** Write a cell plus its mirrors, rejecting anything over the scrap budget. */
	function applyWithMirrors(index: number, target: Cell) {
		const next = [...cells];
		next[index] = target;
		for (const [mi, mc] of mirrorTargets(index, target)) next[mi] = mc;
		const totals = usageOf(next);
		if (FABRICS.some((f) => (totals[f.id] ?? 0) > f.count)) return;
		if (JSON.stringify(next) === JSON.stringify(cells)) return;
		cells = next;
	}

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
	function usageOf(arr: Cell[]): Record<string, number> {
		const totals: Record<string, number> = {};
		for (const cell of arr) {
			const defs = LAYOUTS[cell.layout].slots;
			cell.slots.forEach((id, i) => {
				if (id) totals[id] = (totals[id] ?? 0) + SHAPE_AREA[defs[i].kind];
			});
		}
		return totals;
	}
	const used = $derived(usageOf(cells));
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
	let future = $state<Cell[][]>([]);
	const snapshot = () => cells.map((c) => ({ ...c, slots: [...c.slots] }));

	function pushHistory() {
		history = [...history.slice(-199), snapshot()];
		future = [];
	}

	function undo() {
		const h = [...history];
		const now = JSON.stringify(cells);
		while (h.length) {
			const prev = h.pop()!;
			if (JSON.stringify(prev) !== now) {
				history = h;
				future = [...future, snapshot()];
				cells = prev;
				return;
			}
		}
		history = h;
	}

	function redo() {
		const f = [...future];
		const now = JSON.stringify(cells);
		while (f.length) {
			const next = f.pop()!;
			if (JSON.stringify(next) !== now) {
				future = f;
				history = [...history.slice(-199), snapshot()];
				cells = next;
				return;
			}
		}
		future = f;
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

	/** Per-fabric square-equivalents consumed by one cell. */
	function cellUsage(c: Cell): Record<string, number> {
		const totals: Record<string, number> = {};
		const defs = LAYOUTS[c.layout].slots;
		c.slots.forEach((id, i) => {
			if (id) totals[id] = (totals[id] ?? 0) + SHAPE_AREA[defs[i].kind];
		});
		return totals;
	}

	/*
	 * Re-cut a cell's current fabric into a new layout: each new slot takes
	 * the color under its centroid. Placing a triangle over a solid square
	 * keeps the square's color everywhere the triangle doesn't cover.
	 */
	function inheritedSlots(cell: Cell, layout: LayoutId, rot: number): (string | null)[] {
		return rotatedSlots(layout, rot).map((slot) => {
			const cx = slot.points.reduce((sum, p) => sum + p[0], 0) / slot.points.length;
			const cy = slot.points.reduce((sum, p) => sum + p[1], 0) / slot.points.length;
			return cell.slots[slotAt(cell.layout, cell.rotation, [cx, cy])];
		});
	}

	/*
	 * Work out the exact cell a placement click would produce. Shared by
	 * placeAt and the ghost preview so what you see is what you get. The
	 * placed slot is budgeted first; inherited slots that no longer fit
	 * the scrap pile fall back to empty.
	 */
	function buildPlacement(
		index: number,
		point: Point,
		fabricId: string
	): { cell: Cell; slot: number; blocked: boolean } {
		const cell = cells[index];
		const matches = cell.layout === piece && cell.rotation === rotation;
		const slots = matches ? [...cell.slots] : inheritedSlots(cell, piece, rotation);
		const target: Cell = matches
			? { layout: cell.layout, rotation: cell.rotation, slots }
			: { layout: piece, rotation, slots };
		const defs = LAYOUTS[target.layout].slots;
		const slot = slotAt(target.layout, target.rotation, point);

		// The whole cell is being rebuilt, so its current usage is refundable.
		const before = cellUsage(cell);
		const avail: Record<string, number> = {};
		for (const f of FABRICS) avail[f.id] = remaining[f.id] + (before[f.id] ?? 0);

		if (avail[fabricId] < SHAPE_AREA[defs[slot].kind]) {
			return { cell, slot, blocked: true };
		}
		slots[slot] = fabricId;
		avail[fabricId] -= SHAPE_AREA[defs[slot].kind];
		slots.forEach((f, i) => {
			if (i === slot || !f) return;
			const area = SHAPE_AREA[defs[i].kind];
			if (avail[f] >= area) avail[f] -= area;
			else slots[i] = null;
		});
		return { cell: target, slot, blocked: false };
	}

	/** Drop the pending piece into the cell at the given local point. */
	function placeAt(index: number, point: Point, fabricId: string) {
		const { cell: target, blocked } = buildPlacement(index, point, fabricId);
		if (blocked) return;
		applyWithMirrors(index, target);
	}

	function eraseAt(index: number, point: Point) {
		const cell = cells[index];
		const slot = slotAt(cell.layout, cell.rotation, point);
		if (cell.slots[slot] === null) return;
		const slots = [...cell.slots];
		slots[slot] = null;
		applyWithMirrors(index, slots.every((s) => s === null) ? emptyCell() : { ...cell, slots });
	}

	const rowOf = (i: number) => Math.floor(i / COLS);
	const colOf = (i: number) => i % COLS;

	function rotateCells(indices: number[]) {
		const targets = indices.filter((i) => !isEmpty(cells[i]));
		if (!targets.length) return;
		pushHistory();
		const copy = [...cells];
		for (const i of targets) copy[i] = { ...copy[i], rotation: (copy[i].rotation + 1) % 4 };
		cells = copy;
	}

	function deleteCells(indices: number[]) {
		const targets = indices.filter((i) => !isEmpty(cells[i]));
		if (!targets.length) return;
		pushHistory();
		const copy = [...cells];
		for (const i of targets) copy[i] = emptyCell();
		cells = copy;
		selection = [];
	}

	function clearAll() {
		pushHistory();
		cells = Array.from({ length: CELL_COUNT }, emptyCell);
		selection = [];
	}

	/* ── Clipboard ─────────────────────────────────────────────────────
	 * Copies keep their arrangement relative to the group's bounding box.
	 * Paste lands the box at the hovered cell (clamped to the grid), or
	 * just right of the originals when the cursor is off the blanket.
	 */
	let clipboard = $state<{
		w: number;
		h: number;
		items: { dr: number; dc: number; cell: Cell }[];
	} | null>(null);

	function copySelection() {
		const sel = selection.filter((i) => !isEmpty(cells[i]));
		if (!sel.length) return;
		const minR = Math.min(...sel.map(rowOf));
		const minC = Math.min(...sel.map(colOf));
		clipboard = {
			w: Math.max(...sel.map(colOf)) - minC + 1,
			h: Math.max(...sel.map(rowOf)) - minR + 1,
			items: sel.map((i) => ({
				dr: rowOf(i) - minR,
				dc: colOf(i) - minC,
				cell: { ...cells[i], slots: [...cells[i].slots] }
			}))
		};
	}

	function pasteClipboard() {
		if (!clipboard) return;
		let baseR = 0;
		let baseC = 0;
		if (hover) {
			baseR = rowOf(hover.index);
			baseC = colOf(hover.index);
		} else if (anchor !== null) {
			baseR = rowOf(anchor);
			baseC = colOf(anchor) + clipboard.w;
		}
		baseR = Math.min(ROWS - clipboard.h, Math.max(0, baseR));
		baseC = Math.min(COLS - clipboard.w, Math.max(0, baseC));
		const next = [...cells];
		const placed: number[] = [];
		for (const it of clipboard.items) {
			const t = (baseR + it.dr) * COLS + (baseC + it.dc);
			next[t] = { ...it.cell, slots: [...it.cell.slots] };
			placed.push(t);
		}
		// The paste has to fit the scrap pile.
		const totals = usageOf(next);
		if (FABRICS.some((f) => (totals[f.id] ?? 0) > f.count)) return;
		pushHistory();
		cells = next;
		selection = placed;
		anchor = placed[0];
		tool = 'select';
	}

	function rotate() {
		if (tool === 'place') rotation = (rotation + 1) % 4;
		else if (selection.length) rotateCells(selection);
	}

	/* ── Ghost previews ────────────────────────────────────────────────
	 * In place mode the hovered cell renders as the exact state a click
	 * would produce, with the incoming slot at reduced opacity.
	 */
	const placePreview = $derived.by(() => {
		if (tool !== 'place' || painting || drag || !hover) return null;
		const built = buildPlacement(hover.index, hover.point, fabric);
		const mirrors = built.blocked
			? new Map<number, Cell>()
			: mirrorTargets(hover.index, built.cell);
		return { index: hover.index, ...built, mirrors };
	});

	const erasePreview = $derived.by(() => {
		if (tool !== 'erase' || painting || drag || !hover) return null;
		const cell = cells[hover.index];
		const slot = slotAt(cell.layout, cell.rotation, hover.point);
		if (cell.slots[slot] === null) return null;
		return { index: hover.index, slot };
	});

	/** During a group drag, the exact cells the drop would produce, keyed by target index. */
	const groupPreview = $derived.by(() => {
		if (!drag?.active || drag.groupFrom === null || !hover) return null;
		const sel = selection.filter((i) => !isEmpty(cells[i]));
		if (!sel.length) return null;
		const [dr, dc] = groupDelta(sel, drag.groupFrom, hover.index);
		if (!dr && !dc) return null;
		const map = new Map<number, Cell>();
		for (const s of sel) map.set((rowOf(s) + dr) * COLS + (colOf(s) + dc), cells[s]);
		return map;
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
		/** Set when dragging the whole multi-selection as a group. */
		groupFrom: number | null;
		x: number;
		y: number;
		active: boolean;
		/** Alt held: the drop duplicates instead of moving. */
		copy: boolean;
	}
	let drag = $state<Drag | null>(null);

	function startDrag(
		e: PointerEvent,
		fabricId: string,
		from: Drag['from'],
		groupFrom: number | null = null
	) {
		if (e.button !== 0) return;
		drag = { fabricId, from, groupFrom, x: e.clientX, y: e.clientY, active: false, copy: e.altKey };
	}

	/** Drag offset in rows/columns, clamped so the whole group stays on the grid. */
	function groupDelta(sel: number[], srcIndex: number, destIndex: number): [number, number] {
		const rows = sel.map(rowOf);
		const colsList = sel.map(colOf);
		const dr = Math.max(
			-Math.min(...rows),
			Math.min(ROWS - 1 - Math.max(...rows), rowOf(destIndex) - rowOf(srcIndex))
		);
		const dc = Math.max(
			-Math.min(...colsList),
			Math.min(COLS - 1 - Math.max(...colsList), colOf(destIndex) - colOf(srcIndex))
		);
		return [dr, dc];
	}

	/** Move or duplicate the whole selection by the drag offset, clamped to the grid. */
	function dropGroup(srcIndex: number, destIndex: number, copy: boolean) {
		const sel = selection.filter((i) => !isEmpty(cells[i]));
		if (!sel.length) return;
		const [dr, dc] = groupDelta(sel, srcIndex, destIndex);
		if (!dr && !dc) return;
		const next = [...cells];
		if (!copy) for (const s of sel) next[s] = emptyCell();
		const moved: number[] = [];
		for (const s of sel) {
			const t = (rowOf(s) + dr) * COLS + (colOf(s) + dc);
			next[t] = { ...cells[s], slots: [...cells[s].slots] };
			moved.push(t);
		}
		if (copy) {
			// A duplicate has to fit the scrap pile; reject the drop if it can't.
			const totals = usageOf(next);
			if (FABRICS.some((f) => (totals[f.id] ?? 0) > f.count)) return;
		}
		pushHistory();
		cells = next;
		selection = moved;
		anchor =
			anchor !== null && sel.includes(anchor)
				? (rowOf(anchor) + dr) * COLS + (colOf(anchor) + dc)
				: moved[0];
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
		if (e.shiftKey) {
			// Becomes a rubber-band drag if the pointer moves; else toggles on release.
			marquee = {
				x0: e.clientX,
				y0: e.clientY,
				x: e.clientX,
				y: e.clientY,
				toggleIndex: index,
				base: [...selection],
				active: false
			};
			anchor = index;
			return;
		}
		if (!existing) {
			selection = [];
			anchor = null;
			return;
		}
		if (e.altKey || (selection.length > 1 && selection.includes(index))) {
			// Dragging any member of a multi-selection carries the group.
			// Alt-drag always carries whole cells, so duplicating a pieced
			// square copies all of it, not just the piece under the cursor.
			if (!selection.includes(index)) selection = [index];
			anchor = index;
			startDrag(e, cell.slots.find((s) => s !== null) ?? existing, null, index);
			return;
		}
		selection = [index];
		anchor = index;
		startDrag(e, existing, { index, slot });
	}

	function onPointerMove(e: PointerEvent) {
		if (axisDrag && blanketEl) {
			const r = blanketEl.getBoundingClientRect();
			if (axisDrag === 'v') {
				axisV = Math.min(
					2 * COLS - 1,
					Math.max(1, Math.round(((e.clientX - r.left) / r.width) * 2 * COLS))
				);
			} else {
				axisH = Math.min(
					2 * ROWS - 1,
					Math.max(1, Math.round(((e.clientY - r.top) / r.height) * 2 * ROWS))
				);
			}
			return;
		}
		if (marquee) {
			if (
				!marquee.active &&
				Math.hypot(e.clientX - marquee.x0, e.clientY - marquee.y0) < DRAG_THRESHOLD
			) {
				return;
			}
			const m = { ...marquee, x: e.clientX, y: e.clientY, active: true };
			marquee = m;
			const left = Math.min(m.x0, m.x);
			const right = Math.max(m.x0, m.x);
			const top = Math.min(m.y0, m.y);
			const bottom = Math.max(m.y0, m.y);
			const hits: number[] = [];
			document.querySelectorAll<HTMLElement>('[data-cell-index]').forEach((el) => {
				const r = el.getBoundingClientRect();
				if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
					const idx = Number(el.dataset.cellIndex);
					if (!isEmpty(cells[idx])) hits.push(idx);
				}
			});
			selection = [...new Set([...m.base, ...hits])];
			return;
		}
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
			drag = { ...drag, x: e.clientX, y: e.clientY, copy: e.altKey };
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (axisDrag) {
			axisDrag = null;
			return;
		}
		if (marquee) {
			const m = marquee;
			marquee = null;
			if (!m.active) {
				selection = selection.includes(m.toggleIndex)
					? selection.filter((i) => i !== m.toggleIndex)
					: [...selection, m.toggleIndex];
				anchor = m.toggleIndex;
			}
			return;
		}
		painting = false;
		if (!drag) return;
		const { from, groupFrom, fabricId, active } = drag;
		const copy = drag.copy || e.altKey;
		drag = null;
		if (!active) {
			// A plain click on a multi-selected square collapses the selection to it.
			if (groupFrom !== null) {
				selection = [groupFrom];
				anchor = groupFrom;
			}
			return;
		}

		const hit = resolve(e.clientX, e.clientY);

		if (groupFrom !== null) {
			if (!hit) {
				// Group dragged off the blanket: remove it (a copy just cancels).
				if (!copy) deleteCells(selection);
			} else {
				dropGroup(groupFrom, hit.index, copy);
			}
			return;
		}

		if (!hit) {
			// Dragged off the blanket: take the piece back out of the layout.
			if (from && !copy) {
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

		const dest = cells[hit.index];
		const destSlot = slotAt(dest.layout, dest.rotation, hit.point);
		if (from.index === hit.index && from.slot === destSlot) return;

		if (copy) {
			// Alt-drop: duplicate the piece into the target slot, source untouched.
			if (dest.slots[destSlot] === fabricId) return;
			const kind = LAYOUTS[dest.layout].slots[destSlot].kind;
			if (remaining[fabricId] < SHAPE_AREA[kind]) return;
			pushHistory();
			const destSlots = [...dest.slots];
			destSlots[destSlot] = fabricId;
			update(hit.index, { ...dest, slots: destSlots });
			selection = [hit.index];
			anchor = hit.index;
			return;
		}

		// Moving a piece already on the blanket: swap with whatever it lands on.
		const source = cells[from.index];
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
		selection = [hit.index];
		anchor = hit.index;
	}

	const ARROW_DELTAS: Record<string, [number, number]> = {
		ArrowUp: [-1, 0],
		ArrowDown: [1, 0],
		ArrowLeft: [0, -1],
		ArrowRight: [0, 1]
	};

	function onKeyDown(e: KeyboardEvent) {
		// Typing in the pattern-name input must not trigger shortcuts.
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
			return;
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
			if (selection.length) {
				e.preventDefault();
				copySelection();
			}
			return;
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
			if (clipboard) {
				e.preventDefault();
				pasteClipboard();
			}
			return;
		}
		if (e.key === 'Escape') {
			// Staged: cancel a drag, else deselect, else back to the mouse tool.
			if (drag || marquee) {
				if (marquee) selection = marquee.base;
				drag = null;
				marquee = null;
				return;
			}
			if (selection.length) {
				lastSelection = selection;
				lastAnchor = anchor;
				selection = [];
				anchor = null;
				return;
			}
			tool = 'select';
			return;
		}
		if (e.key === 'Enter') {
			if (!selection.length && lastSelection.length) {
				selection = lastSelection.filter((i) => !isEmpty(cells[i]));
				anchor =
					lastAnchor !== null && selection.includes(lastAnchor)
						? lastAnchor
						: (selection[0] ?? null);
				if (selection.length) tool = 'select';
			}
			return;
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			// With a selection, delete removes it; otherwise it picks up the eraser.
			if (tool === 'select' && selection.length) deleteCells(selection);
			else tool = 'erase';
			return;
		}
		if (e.key in ARROW_DELTAS && tool === 'select') {
			e.preventDefault();
			const [dr, dc] = ARROW_DELTAS[e.key];
			const next =
				anchor === null
					? 0
					: Math.min(ROWS - 1, Math.max(0, rowOf(anchor) + dr)) * COLS +
						Math.min(COLS - 1, Math.max(0, colOf(anchor) + dc));
			selection = e.shiftKey
				? selection.includes(next)
					? selection
					: [...selection, next]
				: [next];
			anchor = next;
			return;
		}
		if (e.metaKey || e.ctrlKey) return;
		if (e.key === 'r' || e.key === 'R') rotate();
		if (e.key === 'e' || e.key === 'E') tool = 'erase';
		if (e.key === 'v' || e.key === 'V') tool = 'select';
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
				<div class="group-label">Tools</div>
				<div class="palette-actions">
					<button
						class="tool-btn"
						class:active={tool === 'select'}
						onclick={() => (tool = 'select')}
					>
						Mouse <kbd>V</kbd>
					</button>
					<button class="tool-btn" class:active={tool === 'erase'} onclick={() => (tool = 'erase')}>
						Eraser <kbd>E ⌫</kbd>
					</button>
				</div>
				<div class="group-label">Actions</div>
				<div class="palette-actions">
					<button class="tool-btn" onclick={rotate}>Rotate <kbd>R</kbd></button>
					<button class="tool-btn" onclick={copySelection} disabled={selection.length === 0}>
						Copy <kbd>⌘C</kbd>
					</button>
					<button class="tool-btn" onclick={pasteClipboard} disabled={clipboard === null}>
						Paste <kbd>⌘V</kbd>
					</button>
					<button class="tool-btn" onclick={undo} disabled={history.length === 0}>
						Undo <kbd>⌘Z</kbd>
					</button>
					<button class="tool-btn" onclick={redo} disabled={future.length === 0}>
						Redo <kbd>⇧⌘Z</kbd>
					</button>
					<button class="tool-btn" onclick={clearAll} disabled={filled === 0}>Clear</button>
				</div>
				<div class="group-label">Symmetry</div>
				<div class="palette-actions">
					<button class="tool-btn" class:active={symV} onclick={() => (symV = !symV)}>
						Vertical
					</button>
					<button class="tool-btn" class:active={symH} onclick={() => (symH = !symH)}>
						Horizontal
					</button>
				</div>
				{#if symV || symH}
					<p class="hint">
						Painting and erasing mirror across the axes. Drag a line on the blanket to move it.
					</p>
				{/if}

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
				<div class="wall-title-row">
					<input
						class="wall-title"
						type="text"
						placeholder="Untitled pattern"
						maxlength="40"
						bind:value={patternName}
						onblur={commitName}
						onkeydown={(e) => {
							if (e.key === 'Enter') e.currentTarget.blur();
						}}
					/>
					{#if currentId === null}
						<span class="unsaved-tag">unsaved</span>
					{/if}
				</div>
				<div class="wall">
					<div
						class="blanket"
						bind:this={blanketEl}
						class:tool-select={tool === 'select'}
						class:tool-place={tool === 'place'}
						class:tool-erase={tool === 'erase'}
						style="grid-template-columns: repeat({COLS}, 1fr); aspect-ratio: {COLS} / {ROWS}"
					>
						{#each cells as cell, i}
							{@const pv = placePreview?.index === i ? placePreview : null}
							{@const ev = erasePreview?.index === i ? erasePreview : null}
							{@const gv = groupPreview?.get(i) ?? null}
							{@const mv =
								placePreview !== null && placePreview.index !== i
									? (placePreview.mirrors.get(i) ?? null)
									: null}
							{@const display = gv ?? mv ?? (pv ? pv.cell : cell)}
							<button
								class="cell"
								class:hovered={hover?.index === i}
								class:selected={selection.includes(i)}
								class:blocked={pv?.blocked}
								class:lifted={groupPreview !== null && !drag?.copy && selection.includes(i)}
								data-cell-index={i}
								onpointerdown={(e) => onCellPointerDown(e, i)}
								oncontextmenu={(e) => {
									e.preventDefault();
									rotateCells(selection.length > 1 && selection.includes(i) ? selection : [i]);
								}}
								aria-label={`Row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`}
							>
								<svg viewBox="0 0 {VB} {VB}" preserveAspectRatio="none">
									{#each rotatedSlots(display.layout, display.rotation) as slot, s}
										{@const id = display.slots[s]}
										<polygon
											points={toPolygonPoints(slot.points, VB)}
											fill={id ? FABRIC_BY_ID[id].hex : '#ffffff'}
											class:ghost={gv !== null ||
												mv !== null ||
												(pv !== null && s === pv.slot && !pv.blocked)}
											class:erasing={ev !== null && s === ev.slot}
											stroke={display.slots.length > 1 ? 'rgba(0,0,0,0.18)' : 'none'}
											stroke-width="1"
											vector-effect="non-scaling-stroke"
										/>
									{/each}
								</svg>
							</button>
						{/each}
						{#if symV}
							<div
								class="axis axis-v"
								role="separator"
								aria-orientation="vertical"
								aria-label="Vertical symmetry axis"
								style="left: {(axisV / (2 * COLS)) * 100}%"
								onpointerdown={(e) => {
									e.stopPropagation();
									axisDrag = 'v';
								}}
							></div>
						{/if}
						{#if symH}
							<div
								class="axis axis-h"
								role="separator"
								aria-orientation="horizontal"
								aria-label="Horizontal symmetry axis"
								style="top: {(axisH / (2 * ROWS)) * 100}%"
								onpointerdown={(e) => {
									e.stopPropagation();
									axisDrag = 'h';
								}}
							></div>
						{/if}
					</div>
				</div>
				<p class="wall-caption">
					{COLS} × {ROWS} squares at {SQUARE_INCHES}" ({inchesToFeet(widthIn)} × {inchesToFeet(
						heightIn
					)} finished); {filled} of {CELL_COUNT} cells started. Pick a piece and color, then click or
					drag to paint. The mouse tool selects squares (shift-click, shift-drag, or arrow keys for more):
					R or right-click rotates, delete removes, drag moves, alt-drag duplicates. ⌘C copies the selection
					and ⌘V pastes it at the cursor. ⌘Z undoes.
				</p>
			</div>

			<aside class="patterns-panel">
				<div class="patterns-head">
					<h3>Patterns</h3>
					<div class="patterns-head-actions">
						<button class="tool-btn" onclick={newPattern}>New</button>
						<button class="tool-btn" onclick={savePattern} disabled={!patternName.trim()}>
							{currentId !== null ? 'Update' : 'Save'}
						</button>
					</div>
				</div>
				{#if patternList.length > 1}
					<input
						class="pattern-filter"
						type="text"
						placeholder="Filter patterns"
						bind:value={patternFilter}
					/>
				{/if}
				{#if filteredPatterns.length > 0}
					<ul class="pattern-list">
						{#each filteredPatterns as p (p.id)}
							<li>
								<button
									class="pattern-load"
									class:current={p.id === currentId}
									onclick={() => loadPattern(p.id)}
									title="Load {p.name}"
								>
									<svg
										class="pattern-thumb"
										viewBox="0 0 {COLS * 10} {ROWS * 10}"
										preserveAspectRatio="none"
									>
										<rect width={COLS * 10} height={ROWS * 10} fill="#ffffff" />
										{#each thumbPolys(p.cells) as poly}
											<polygon points={poly.points} fill={poly.fill} />
										{/each}
									</svg>
									<span class="pattern-name">{p.name}</span>
								</button>
								<button
									class="pattern-delete"
									onclick={() => deletePattern(p.id)}
									aria-label={`Delete ${p.name}`}
								>
									×
								</button>
							</li>
						{/each}
					</ul>
				{:else if patternList.length === 0}
					<p class="hint">Nothing saved yet. Patterns are stored in this browser.</p>
				{:else}
					<p class="hint">No patterns match.</p>
				{/if}
			</aside>
		</div>
	</section>
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
		{#if drag.groupFrom !== null || drag.copy}
			<span class="ghost-badge">
				{drag.groupFrom !== null ? `×${selection.length}` : ''}{drag.copy ? '+' : ''}
			</span>
		{/if}
	</div>
{/if}

<style>
	.exploration {
		max-width: 1200px;
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
		grid-template-columns: 14rem minmax(0, 1fr) 13rem;
		gap: 2rem;
		align-items: start;
	}
	.palette h3,
	.patterns-panel h3 {
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

	.group-label {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-top: 0.9rem;
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
		z-index: 2;
	}
	/* Drawn on top of the fabric so selection reads on any color. */
	.cell.selected::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 3px solid #f59e0b;
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
		background: #e11d48;
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
		background: #2563eb;
	}
	.wall-caption {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0.6rem 0 0;
	}

	.patterns-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.6rem;
	}
	.patterns-head-actions {
		display: flex;
		gap: 0.4rem;
	}
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
	.pattern-filter {
		width: 100%;
		box-sizing: border-box;
		padding: 0.3rem 0.5rem;
		margin-bottom: 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.8rem;
		color: inherit;
	}
	.pattern-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.pattern-list li {
		position: relative;
	}
	.pattern-load {
		display: block;
		width: 100%;
		padding: 0.35rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.8rem;
		text-align: left;
		cursor: pointer;
	}
	.pattern-load:hover {
		background: var(--color-surface-active);
		border-color: var(--color-border-strong);
	}
	.pattern-load.current {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
	}
	.pattern-thumb {
		display: block;
		width: 100%;
		aspect-ratio: 7 / 10;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.25rem;
		background: #ffffff;
	}
	.pattern-name {
		display: block;
		margin-top: 0.3rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pattern-delete {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		border: none;
		background: rgba(255, 255, 255, 0.85);
		font: inherit;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0.15rem 0.35rem;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: 0.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
	.pattern-delete:hover {
		background: #ffffff;
		color: #b91c1c;
	}

	.marquee {
		position: fixed;
		border: 1.5px dashed #f59e0b;
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

	@media (max-width: 1100px) {
		.tool-grid {
			grid-template-columns: 14rem minmax(0, 1fr);
		}
		.patterns-panel {
			grid-column: 1 / -1;
		}
		.pattern-list {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		}
	}
	@media (max-width: 768px) {
		.tool-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
