<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	const WIDTH = 1080;
	const HEIGHT = 1920;
	const COLS = 3;
	const ROWS = 5;
	const CELL_W = WIDTH / COLS;
	const CELL_H = HEIGHT / ROWS;
	const BG_COLOR = '#f5f0ea';
	const GRID_COLOR = '#2a2a2a';
	const GRID_LINE_WIDTH = 2;

	// Soft body physics
	const NUM_POINTS = 32;
	const WALL_MARGIN = 3;

	// Tunable params
	let speed = 0.35;
	let stiffness = 0.015;
	let pressure = 0.004;
	let damping = 0.92;
	let panelOpen = false;

	interface RingPoint {
		ox: number;
		oy: number;
		vx: number;
		vy: number;
	}

	interface SoftBlob {
		cx: number;
		cy: number;
		vx: number;
		vy: number;
		speed: number;
		points: RingPoint[];
		restRadii: number[];
		baseAngles: number[];
		restDistances: number[];
		maxRestRadius: number;
		restArea: number;
		rotation: number;
		rotationSpeed: number;
		color: [number, number, number];
		word: string;
		col: number;
		row: number;
		phase: number;
	}

	const blobConfigs: Array<{
		color: [number, number, number];
		word: string;
		radiusX: number;
		radiusY: number;
	}> = [
		// Row 0
		{ color: [66, 165, 245], word: 'get', radiusX: 75, radiusY: 60 },
		{ color: [210, 175, 140], word: 'be', radiusX: 70, radiusY: 55 },
		{ color: [230, 110, 95], word: 'what', radiusX: 80, radiusY: 62 },
		// Row 1
		{ color: [200, 40, 100], word: 'here', radiusX: 72, radiusY: 85 },
		{ color: [235, 210, 55], word: '&', radiusX: 68, radiusY: 50 },
		{ color: [148, 128, 200], word: 'otherwise', radiusX: 78, radiusY: 65 },
		// Row 2
		{ color: [80, 75, 68], word: 'from', radiusX: 65, radiusY: 68 },
		{ color: [45, 100, 220], word: 'how', radiusX: 82, radiusY: 72 },
		{ color: [155, 168, 28], word: 'words', radiusX: 74, radiusY: 55 },
		// Row 3
		{ color: [160, 118, 78], word: 'here', radiusX: 68, radiusY: 72 },
		{ color: [210, 170, 200], word: 'do', radiusX: 72, radiusY: 62 },
		{ color: [115, 188, 198], word: 'could', radiusX: 78, radiusY: 68 },
		// Row 4
		{ color: [100, 58, 28], word: '?', radiusX: 58, radiusY: 58 },
		{ color: [0, 210, 155], word: 'we', radiusX: 68, radiusY: 80 },
		{ color: [200, 28, 28], word: 'here', radiusX: 82, radiusY: 72 },
	];

	function ellipseRadius(rx: number, ry: number, angle: number): number {
		const cosA = Math.cos(angle);
		const sinA = Math.sin(angle);
		return (rx * ry) / Math.sqrt((ry * cosA) ** 2 + (rx * sinA) ** 2);
	}

	function computePolygonArea(points: RingPoint[]): number {
		let area = 0;
		const n = points.length;
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			area += points[i].ox * points[j].oy;
			area -= points[j].ox * points[i].oy;
		}
		return Math.abs(area) / 2;
	}

	function createBlobs(): SoftBlob[] {
		return blobConfigs.map((config, i) => {
			const col = i % COLS;
			const row = Math.floor(i / COLS);
			const cx = col * CELL_W + CELL_W / 2 + (Math.random() - 0.5) * 40;
			const cy = row * CELL_H + CELL_H / 2 + (Math.random() - 0.5) * 40;

			const moveAngle = Math.random() * Math.PI * 2;
			const baseSpeed = speed + Math.random() * 0.15;
			const rotation = Math.random() * Math.PI * 2;

			const baseAngles: number[] = [];
			const restRadii: number[] = [];
			const points: RingPoint[] = [];

			for (let j = 0; j < NUM_POINTS; j++) {
				const angle = (j / NUM_POINTS) * Math.PI * 2;
				const r = ellipseRadius(config.radiusX, config.radiusY, angle);
				baseAngles.push(angle);
				restRadii.push(r);
				points.push({
					ox: Math.cos(angle + rotation) * r,
					oy: Math.sin(angle + rotation) * r,
					vx: 0,
					vy: 0,
				});
			}

			const restDistances: number[] = [];
			for (let j = 0; j < NUM_POINTS; j++) {
				const next = (j + 1) % NUM_POINTS;
				const dx = points[next].ox - points[j].ox;
				const dy = points[next].oy - points[j].oy;
				restDistances.push(Math.sqrt(dx * dx + dy * dy));
			}

			let maxR = 0;
			for (const r of restRadii) {
				if (r > maxR) maxR = r;
			}

			const restArea = computePolygonArea(points);

			return {
				cx, cy,
				vx: Math.cos(moveAngle) * baseSpeed,
				vy: Math.sin(moveAngle) * baseSpeed,
				speed: baseSpeed,
				points,
				restRadii,
				baseAngles,
				restDistances,
				maxRestRadius: maxR,
				restArea,
				rotation,
				rotationSpeed: (Math.random() - 0.5) * 0.001,
				color: config.color,
				word: config.word,
				col, row,
				phase: Math.random() * Math.PI * 2,
			};
		});
	}

	function updateBlob(blob: SoftBlob, time: number) {
		const cellLeft = blob.col * CELL_W + WALL_MARGIN;
		const cellRight = (blob.col + 1) * CELL_W - WALL_MARGIN;
		const cellTop = blob.row * CELL_H + WALL_MARGIN;
		const cellBottom = (blob.row + 1) * CELL_H - WALL_MARGIN;

		// --- Step 1: Wall reaction from ring points drives center bounce ---
		// Ring points touching walls push the center away (replaces fixed-pad bounce)
		let reactX = 0, reactY = 0;
		for (const p of blob.points) {
			const absX = blob.cx + p.ox;
			const absY = blob.cy + p.oy;
			if (absX <= cellLeft + 1) reactX += (cellLeft + 1 - absX) + 0.5;
			if (absX >= cellRight - 1) reactX -= (absX - cellRight + 1) + 0.5;
			if (absY <= cellTop + 1) reactY += (cellTop + 1 - absY) + 0.5;
			if (absY >= cellBottom - 1) reactY -= (absY - cellBottom + 1) + 0.5;
		}
		const wallReactStrength = 0.012;
		blob.vx += reactX * wallReactStrength;
		blob.vy += reactY * wallReactStrength;

		// --- Step 2: Maintain constant speed ---
		const targetSpeed = Math.max(0.05, speed + (blob.speed - 0.35));
		const mag = Math.sqrt(blob.vx ** 2 + blob.vy ** 2);
		if (mag > 0.001) {
			blob.vx = (blob.vx / mag) * targetSpeed;
			blob.vy = (blob.vy / mag) * targetSpeed;
		}

		// --- Step 3: Move center ---
		blob.cx += blob.vx;
		blob.cy += blob.vy;
		blob.rotation += blob.rotationSpeed;

		// Hard clamp center (safety net — should rarely activate)
		const hardPad = 3;
		blob.cx = Math.max(cellLeft + hardPad, Math.min(cellRight - hardPad, blob.cx));
		blob.cy = Math.max(cellTop + hardPad, Math.min(cellBottom - hardPad, blob.cy));

		// --- Step 4: Spring/pressure forces on ring points ---
		const pulse = 1 + Math.sin(time * 0.0008 + blob.phase) * 0.03;
		const neighborStiffness = stiffness * 0.4;

		// Weaken shape spring when blob is compressed so area conservation can dominate
		const preArea = computePolygonArea(blob.points);
		const areaDeficit = Math.max(0, 1 - preArea / blob.restArea);
		const effectiveStiffness = stiffness * Math.max(0.1, 1 - areaDeficit * 2.5);

		for (let i = 0; i < NUM_POINTS; i++) {
			const p = blob.points[i];
			const angle = blob.baseAngles[i] + blob.rotation;
			const r = blob.restRadii[i] * pulse;

			// Shape spring toward rest ellipse (weakened when compressed)
			const targetOx = Math.cos(angle) * r;
			const targetOy = Math.sin(angle) * r;
			p.vx += (targetOx - p.ox) * effectiveStiffness;
			p.vy += (targetOy - p.oy) * effectiveStiffness;

			// Neighbor springs
			for (const [ni, sign] of [[(i + 1) % NUM_POINTS, 1], [(i - 1 + NUM_POINTS) % NUM_POINTS, -1]] as [number, number][]) {
				const neighbor = blob.points[ni];
				const dx = neighbor.ox - p.ox;
				const dy = neighbor.oy - p.oy;
				const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const restDist = blob.restDistances[sign > 0 ? i : ni];
				const force = (dist - restDist) * neighborStiffness;
				p.vx += (dx / dist) * force;
				p.vy += (dy / dist) * force;
			}

			// Pressure: outward from center
			const dist = Math.sqrt(p.ox * p.ox + p.oy * p.oy) || 0.001;
			p.vx += (p.ox / dist) * pressure;
			p.vy += (p.oy / dist) * pressure;

			// Damping
			p.vx *= damping;
			p.vy *= damping;

			// Update offset
			p.ox += p.vx;
			p.oy += p.vy;
		}

		// --- Step 5: Clamp ring points to walls ---
		for (const p of blob.points) {
			const absX = blob.cx + p.ox;
			const absY = blob.cy + p.oy;
			if (absX < cellLeft) { p.ox = cellLeft - blob.cx; p.vx = Math.abs(p.vx) * 0.2; }
			if (absX > cellRight) { p.ox = cellRight - blob.cx; p.vx = -Math.abs(p.vx) * 0.2; }
			if (absY < cellTop) { p.oy = cellTop - blob.cy; p.vy = Math.abs(p.vy) * 0.2; }
			if (absY > cellBottom) { p.oy = cellBottom - blob.cy; p.vy = -Math.abs(p.vy) * 0.2; }
		}

		// --- Step 6: Direct area conservation ---
		// Only scale FREE points (not touching walls) so all expansion goes to the bulge.
		// Iterate multiple times per frame for fast convergence.
		const wallTol = 2;
		for (let iter = 0; iter < 4; iter++) {
			const currentArea = computePolygonArea(blob.points);
			const areaRatio = blob.restArea / Math.max(currentArea, 1);
			if (Math.abs(areaRatio - 1) < 0.02) break;

			const targetScale = Math.sqrt(areaRatio);
			const scale = 1 + (targetScale - 1) * 0.5;

			for (const p of blob.points) {
				const absX = blob.cx + p.ox;
				const absY = blob.cy + p.oy;
				const touchingWall =
					absX <= cellLeft + wallTol || absX >= cellRight - wallTol ||
					absY <= cellTop + wallTol || absY >= cellBottom - wallTol;
				if (!touchingWall) {
					p.ox *= scale;
					p.oy *= scale;
				}
			}

			// Re-clamp after scaling
			for (const p of blob.points) {
				const absX = blob.cx + p.ox;
				const absY = blob.cy + p.oy;
				if (absX < cellLeft) p.ox = cellLeft - blob.cx;
				if (absX > cellRight) p.ox = cellRight - blob.cx;
				if (absY < cellTop) p.oy = cellTop - blob.cy;
				if (absY > cellBottom) p.oy = cellBottom - blob.cy;
			}
		}
	}

	function drawBlob(ctx: CanvasRenderingContext2D, blob: SoftBlob) {
		const [r, g, b] = blob.color;
		const pts = blob.points;
		const n = pts.length;

		// Compute centroid of deformed shape (for gradient center)
		let centOffX = 0, centOffY = 0;
		for (let i = 0; i < n; i++) {
			centOffX += pts[i].ox;
			centOffY += pts[i].oy;
		}
		centOffX /= n;
		centOffY /= n;
		const centX = blob.cx + centOffX;
		const centY = blob.cy + centOffY;

		// Compute max distance from centroid for adaptive gradient radius
		let maxDist = 0;
		for (let i = 0; i < n; i++) {
			const dx = blob.cx + pts[i].ox - centX;
			const dy = blob.cy + pts[i].oy - centY;
			const d = dx * dx + dy * dy;
			if (d > maxDist) maxDist = d;
		}
		maxDist = Math.sqrt(maxDist);

		// Clip to cell
		ctx.save();
		ctx.beginPath();
		ctx.rect(blob.col * CELL_W, blob.row * CELL_H, CELL_W, CELL_H);
		ctx.clip();

		// Build smooth closed curve through ring points
		ctx.beginPath();
		const last = pts[n - 1];
		const first = pts[0];
		let midX = (blob.cx + first.ox + blob.cx + last.ox) / 2;
		let midY = (blob.cy + first.oy + blob.cy + last.oy) / 2;
		ctx.moveTo(midX, midY);

		for (let i = 0; i < n; i++) {
			const curr = pts[i];
			const next = pts[(i + 1) % n];
			const px = blob.cx + curr.ox;
			const py = blob.cy + curr.oy;
			midX = (px + blob.cx + next.ox) / 2;
			midY = (py + blob.cy + next.oy) / 2;
			ctx.quadraticCurveTo(px, py, midX, midY);
		}
		ctx.closePath();

		// Soft shadow glow (clipped to cell)
		ctx.shadowBlur = 20;
		ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.35)`;

		// Radial gradient centered on shape centroid — mostly opaque with soft edge
		const gradR = maxDist * 1.15;
		const gradient = ctx.createRadialGradient(centX, centY, 0, centX, centY, gradR);
		gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
		gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.92)`);
		gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.75)`);
		gradient.addColorStop(0.88, `rgba(${r}, ${g}, ${b}, 0.35)`);
		gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);

		ctx.fillStyle = gradient;
		ctx.fill();

		ctx.restore();
	}

	function drawGrid(ctx: CanvasRenderingContext2D) {
		ctx.strokeStyle = GRID_COLOR;
		ctx.lineWidth = GRID_LINE_WIDTH;

		for (let i = 1; i < COLS; i++) {
			ctx.beginPath();
			ctx.moveTo(i * CELL_W, 0);
			ctx.lineTo(i * CELL_W, HEIGHT);
			ctx.stroke();
		}

		for (let i = 1; i < ROWS; i++) {
			ctx.beginPath();
			ctx.moveTo(0, i * CELL_H);
			ctx.lineTo(WIDTH, i * CELL_H);
			ctx.stroke();
		}

		ctx.strokeRect(0, 0, WIDTH, HEIGHT);
	}

	function drawWords(ctx: CanvasRenderingContext2D, blobs: SoftBlob[]) {
		ctx.font = '22px sans-serif';
		ctx.fillStyle = '#1a1a1a';
		ctx.textBaseline = 'bottom';

		for (const blob of blobs) {
			const cellX = blob.col * CELL_W;
			const cellY = blob.row * CELL_H;
			ctx.fillText(blob.word, cellX + 14, cellY + CELL_H - 14);
		}
	}

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const blobs = createBlobs();
		let animationId: number;

		function animate(time: number) {
			ctx!.fillStyle = BG_COLOR;
			ctx!.fillRect(0, 0, WIDTH, HEIGHT);

			for (const blob of blobs) {
				updateBlob(blob, time);
				drawBlob(ctx!, blob);
			}

			drawGrid(ctx!);
			drawWords(ctx!, blobs);

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(animationId);
		};
	});
</script>

<div class="flex items-center justify-center w-full h-full relative">
	<canvas
		bind:this={canvas}
		width={WIDTH}
		height={HEIGHT}
		class="max-h-[90vh] w-auto border border-neutral-300"
		style="aspect-ratio: 9 / 16;"
	/>

	<div class="absolute top-2 right-2 z-10">
		<button
			class="bg-surface rounded-md shadow-lg px-3 py-1.5 text-sm font-bold"
			on:click={() => (panelOpen = !panelOpen)}
		>
			{panelOpen ? 'Close' : 'Params'}
		</button>

		{#if panelOpen}
			<div class="mt-2 w-[220px] bg-surface rounded-md shadow-lg p-4">
				<div class="flex flex-col my-2.5">
					<label for="param-speed" class="text-xs font-bold">Speed</label>
					<input
						id="param-speed"
						type="range"
						min={0.05}
						max={2}
						step={0.05}
						bind:value={speed}
						class="w-full rounded !text-md px-2 py-1"
					/>
					<span class="text-xs text-neutral-500">{speed.toFixed(2)}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-stiffness" class="text-xs font-bold">Stiffness</label>
					<input
						id="param-stiffness"
						type="range"
						min={0.0005}
						max={0.1}
						step={0.0005}
						bind:value={stiffness}
						class="w-full rounded !text-md px-2 py-1"
					/>
					<span class="text-xs text-neutral-500">{stiffness.toFixed(3)}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-pressure" class="text-xs font-bold">Pressure</label>
					<input
						id="param-pressure"
						type="range"
						min={0}
						max={0.9}
						step={0.001}
						bind:value={pressure}
						class="w-full rounded !text-md px-2 py-1"
					/>
					<span class="text-xs text-neutral-500">{pressure.toFixed(4)}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-damping" class="text-xs font-bold">Damping</label>
					<input
						id="param-damping"
						type="range"
						min={0.8}
						max={0.99}
						step={0.005}
						bind:value={damping}
						class="w-full rounded !text-md px-2 py-1"
					/>
					<span class="text-xs text-neutral-500">{damping.toFixed(3)}</span>
				</div>
			</div>
		{/if}
	</div>
</div>
