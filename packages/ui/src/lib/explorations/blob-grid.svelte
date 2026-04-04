<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	const WIDTH = 1080;
	const HEIGHT = 1920;
	const BG_COLOR = '#f5f0ea';
	let numRing = 16;
	let connections = 1;
	const WALL_MARGIN = 3;
	let blobSize = 275;

	let speed = 2.5;
	let stiffness = 0.012;
	let pressure = 0.004;
	let damping = 0.96;
	let showMesh = true;
	let topology: 'spokes' | 'rings' | 'cross' | 'grid' = 'grid';
	let panelOpen = false;

	interface Point {
		ox: number; oy: number;
		vx: number; vy: number;
	}

	interface Spring {
		a: number; b: number;
		restLen: number; k: number;
	}

	interface SoftBlob {
		cx: number; cy: number;
		vx: number; vy: number;
		speed: number;
		points: Point[];
		springs: Spring[];
		boundaryN: number; // first boundaryN points are the outer ring
		restArea: number;
		color: [number, number, number];
		phase: number;
		innerWeights: number[][]; // per interior node: weights over each outer ring node
	}

	function pdist(pts: Point[], a: number, b: number): number {
		return Math.sqrt((pts[b].ox - pts[a].ox) ** 2 + (pts[b].oy - pts[a].oy) ** 2);
	}

	function computeArea(pts: Point[], n: number): number {
		let area = 0;
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			area += pts[i].ox * pts[j].oy - pts[j].ox * pts[i].oy;
		}
		return Math.abs(area) / 2;
	}

	function createBlob(topo: typeof topology): SoftBlob {
		const points: Point[] = [];
		const springs: Spring[] = [];
		const N = numRing;
		const rx = blobSize * 1.09, ry = blobSize * 0.91;
		const rot = Math.random() * Math.PI * 2;

		// Outer ring is always the first N points — consistent across all topologies
		for (let i = 0; i < N; i++) {
			const angle = (i / N) * Math.PI * 2 + rot;
			points.push({ ox: Math.cos(angle) * rx, oy: Math.sin(angle) * ry, vx: 0, vy: 0 });
		}

		// Ring neighbor springs (always present)
		for (let i = 0; i < N; i++) {
			springs.push({ a: i, b: (i + 1) % N, restLen: pdist(points, i, (i + 1) % N), k: 0.2 });
		}

		// Cross-connections based on connections param
		const maxSkip = Math.min(connections, Math.floor(N / 2));
		for (let skip = 2; skip <= maxSkip; skip++) {
			for (let i = 0; i < N; i++) {
				const j = (i + skip) % N;
				if (j > i) {
					springs.push({ a: i, b: j, restLen: pdist(points, i, j), k: 0.15 / skip });
				}
			}
		}

		if (topo === 'spokes') {
			const cIdx = points.length;
			points.push({ ox: 0, oy: 0, vx: 0, vy: 0 });
			for (let i = 0; i < N; i++) {
				springs.push({ a: i, b: cIdx, restLen: pdist(points, i, cIdx), k: 0.15 });
			}

		} else if (topo === 'rings') {
			const MN = Math.max(4, Math.round(N / 2)), IN = Math.max(2, Math.round(N / 4));
			const mStart = points.length;
			for (let i = 0; i < MN; i++) {
				const angle = (i / MN) * Math.PI * 2 + rot;
				points.push({ ox: Math.cos(angle) * rx * 0.6, oy: Math.sin(angle) * ry * 0.6, vx: 0, vy: 0 });
			}
			for (let i = 0; i < MN; i++) {
				springs.push({ a: mStart + i, b: mStart + (i + 1) % MN, restLen: pdist(points, mStart + i, mStart + (i + 1) % MN), k: 0.15 });
			}

			const iStart = points.length;
			for (let i = 0; i < IN; i++) {
				const angle = (i / IN) * Math.PI * 2 + rot;
				points.push({ ox: Math.cos(angle) * rx * 0.3, oy: Math.sin(angle) * ry * 0.3, vx: 0, vy: 0 });
			}
			for (let i = 0; i < IN; i++) {
				springs.push({ a: iStart + i, b: iStart + (i + 1) % IN, restLen: pdist(points, iStart + i, iStart + (i + 1) % IN), k: 0.1 });
			}

			const cIdx = points.length;
			points.push({ ox: 0, oy: 0, vx: 0, vy: 0 });

			for (let i = 0; i < N; i++) {
				const mi = Math.round((i / N) * MN) % MN;
				springs.push({ a: i, b: mStart + mi, restLen: pdist(points, i, mStart + mi), k: 0.15 });
			}
			for (let i = 0; i < MN; i++) {
				const ii = Math.round((i / MN) * IN) % IN;
				springs.push({ a: mStart + i, b: iStart + ii, restLen: pdist(points, mStart + i, iStart + ii), k: 0.12 });
			}
			for (let i = 0; i < IN; i++) {
				springs.push({ a: iStart + i, b: cIdx, restLen: pdist(points, iStart + i, cIdx), k: 0.1 });
			}

		} else if (topo === 'cross') {
			for (let i = 0; i < N / 2; i++) {
				springs.push({ a: i, b: i + N / 2, restLen: pdist(points, i, i + N / 2), k: 0.15 });
			}
			for (let i = 0; i < N; i++) {
				const j = (i + Math.round(N / 4)) % N;
				springs.push({ a: i, b: j, restLen: pdist(points, i, j), k: 0.1 });
			}

		} else if (topo === 'grid') {
			const spacing = Math.max(25, Math.PI * (rx + ry) / N * 0.85);
			const gMap = new Map<string, number>();

			for (let gy = -(ry - spacing * 0.5); gy <= ry - spacing * 0.5; gy += spacing) {
				for (let gx = -(rx - spacing * 0.5); gx <= rx - spacing * 0.5; gx += spacing) {
					if ((gx / rx) ** 2 + (gy / ry) ** 2 < 0.75) {
						const key = `${Math.round(gx / spacing)},${Math.round(gy / spacing)}`;
						gMap.set(key, points.length);
						points.push({ ox: gx, oy: gy, vx: 0, vy: 0 });
					}
				}
			}

			for (const [key, idx] of gMap) {
				const [kx, ky] = key.split(',').map(Number);
				for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]] as [number, number][]) {
					const nkey = `${kx + dx},${ky + dy}`;
					if (gMap.has(nkey)) {
						const restLen = spacing * Math.sqrt(dx ** 2 + dy ** 2);
						springs.push({ a: idx, b: gMap.get(nkey)!, restLen, k: dx === 0 || dy === 0 ? 0.12 : 0.07 });
					}
				}
			}

			for (const [, gi] of gMap) {
				const gp = points[gi];
				let nearest = 0, nearestD = Infinity;
				for (let ri = 0; ri < N; ri++) {
					const d = Math.sqrt((points[ri].ox - gp.ox) ** 2 + (points[ri].oy - gp.oy) ** 2);
					if (d < nearestD) { nearestD = d; nearest = ri; }
				}
				springs.push({ a: gi, b: nearest, restLen: nearestD, k: 0.1 });
			}
		}

		// Precompute influence weights: for each interior node, how much each ring node pulls it
		const innerWeights: number[][] = [];
		for (let i = N; i < points.length; i++) {
			const p = points[i];
			const ws = new Array(N);
			let total = 0;
			for (let j = 0; j < N; j++) {
				const rp = points[j];
				const dx = rp.ox - p.ox, dy = rp.oy - p.oy;
				ws[j] = 1 / Math.max(dx * dx + dy * dy, 1);
				total += ws[j];
			}
			for (let j = 0; j < N; j++) ws[j] /= total;
			innerWeights.push(ws);
		}

		const moveAngle = Math.random() * Math.PI * 2;
		const baseSpeed = speed + Math.random() * 0.15;

		return {
			cx: WIDTH / 2, cy: HEIGHT / 2,
			vx: Math.cos(moveAngle) * baseSpeed,
			vy: Math.sin(moveAngle) * baseSpeed,
			speed: baseSpeed,
			points, springs,
			boundaryN: N,
			restArea: computeArea(points, N),
			color: [66, 165, 245],
			phase: Math.random() * Math.PI * 2,
			innerWeights,
		};
	}

	function updateBlob(blob: SoftBlob, time: number) {
		const cellLeft = WALL_MARGIN;
		const cellRight = WIDTH - WALL_MARGIN;
		const cellTop = WALL_MARGIN;
		const cellBottom = HEIGHT - WALL_MARGIN;
		const N = blob.boundaryN;

		// Step 1: Wall reflection on boundary ring
		let touchLeft = false, touchRight = false, touchTop = false, touchBottom = false;
		for (let i = 0; i < N; i++) {
			const p = blob.points[i];
			const ax = blob.cx + p.ox, ay = blob.cy + p.oy;
			if (ax <= cellLeft + 1) touchLeft = true;
			if (ax >= cellRight - 1) touchRight = true;
			if (ay <= cellTop + 1) touchTop = true;
			if (ay >= cellBottom - 1) touchBottom = true;
		}
		const prevVx = blob.vx, prevVy = blob.vy;
		if (touchLeft && blob.vx < 0) blob.vx = Math.abs(blob.vx);
		if (touchRight && blob.vx > 0) blob.vx = -Math.abs(blob.vx);
		if (touchTop && blob.vy < 0) blob.vy = Math.abs(blob.vy);
		if (touchBottom && blob.vy > 0) blob.vy = -Math.abs(blob.vy);

		// On bounce, inject inertia into ring points so they continue pressing
		// into the wall while the center has already reversed — this is the squish.
		const dvx = blob.vx - prevVx, dvy = blob.vy - prevVy;
		if (dvx !== 0 || dvy !== 0) {
			const inertia = 0.9;
			for (const p of blob.points) {
				p.vx -= dvx * inertia;
				p.vy -= dvy * inertia;
			}
		}

		// Step 2: Maintain constant speed
		const targetSpeed = Math.max(0.05, speed + (blob.speed - 2.5));
		const mag = Math.sqrt(blob.vx ** 2 + blob.vy ** 2);
		if (mag > 0.001) {
			blob.vx = (blob.vx / mag) * targetSpeed;
			blob.vy = (blob.vy / mag) * targetSpeed;
		}

		// Step 3: Move center
		blob.cx += blob.vx;
		blob.cy += blob.vy;
		blob.cx = Math.max(cellLeft + 3, Math.min(cellRight - 3, blob.cx));
		blob.cy = Math.max(cellTop + 3, Math.min(cellBottom - 3, blob.cy));

		// Step 4: Spring forces across entire network
		for (const s of blob.springs) {
			const pa = blob.points[s.a], pb = blob.points[s.b];
			const dx = pb.ox - pa.ox, dy = pb.oy - pa.oy;
			const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
			const force = (d - s.restLen) * s.k * stiffness;
			const fx = (dx / d) * force, fy = (dy / d) * force;
			pa.vx += fx; pa.vy += fy;
			pb.vx -= fx; pb.vy -= fy;
		}

		// Outward pressure on boundary ring only
		const pulse = 1 + Math.sin(time * 0.0008 + blob.phase) * 0.03;
		for (let i = 0; i < N; i++) {
			const p = blob.points[i];
			const d = Math.sqrt(p.ox * p.ox + p.oy * p.oy) || 0.001;
			p.vx += (p.ox / d) * pressure * pulse;
			p.vy += (p.oy / d) * pressure * pulse;
		}

		// Damping + integrate outer ring only
		for (let i = 0; i < N; i++) {
			const p = blob.points[i];
			p.vx *= damping;
			p.vy *= damping;
			p.ox += p.vx;
			p.oy += p.vy;
		}

		// Interior nodes: directly derive position from weighted outer ring positions
		for (let i = N; i < blob.points.length; i++) {
			const p = blob.points[i];
			const ws = blob.innerWeights[i - N];
			let tx = 0, ty = 0;
			for (let j = 0; j < N; j++) {
				tx += blob.points[j].ox * ws[j];
				ty += blob.points[j].oy * ws[j];
			}
			p.ox = tx;
			p.oy = ty;
			p.vx = 0;
			p.vy = 0;
		}

		// Step 5: Clamp outer ring points to walls
		for (let i = 0; i < N; i++) {
			const p = blob.points[i];
			const ax = blob.cx + p.ox, ay = blob.cy + p.oy;
			if (ax < cellLeft) { p.ox = cellLeft - blob.cx; p.vx = Math.abs(p.vx) * 0.2; }
			if (ax > cellRight) { p.ox = cellRight - blob.cx; p.vx = -Math.abs(p.vx) * 0.2; }
			if (ay < cellTop) { p.oy = cellTop - blob.cy; p.vy = Math.abs(p.vy) * 0.2; }
			if (ay > cellBottom) { p.oy = cellBottom - blob.cy; p.vy = -Math.abs(p.vy) * 0.2; }
		}

		// Step 6: Directional area conservation (boundary ring only)
		const wallTol = 2;
		let squishX = 0, squishY = 0;
		for (let i = 0; i < N; i++) {
			const p = blob.points[i];
			const ax = blob.cx + p.ox, ay = blob.cy + p.oy;
			if (ax <= cellLeft + wallTol) squishX += 1;
			if (ax >= cellRight - wallTol) squishX -= 1;
			if (ay <= cellTop + wallTol) squishY += 1;
			if (ay >= cellBottom - wallTol) squishY -= 1;
		}
		const sqMag = Math.sqrt(squishX * squishX + squishY * squishY);
		if (sqMag > 0.001) { squishX /= sqMag; squishY /= sqMag; }

		for (let iter = 0; iter < 8; iter++) {
			const area = computeArea(blob.points, N);
			const ratio = blob.restArea / Math.max(area, 1);
			if (Math.abs(ratio - 1) < 0.01) break;

			const baseScale = 1 + (Math.sqrt(ratio) - 1) * 0.25;
			const correction = (Math.sqrt(ratio) - 1) * 8.0;
			for (let i = 0; i < blob.points.length; i++) {
				const p = blob.points[i];
				const len = Math.sqrt(p.ox * p.ox + p.oy * p.oy) || 0.001;
				const align = (p.ox * squishX + p.oy * squishY) / len;
				const boost = 1 + Math.max(0, align) * 1.5;
				if (i < N) {
					// Outer ring: direct positional scale (existing behaviour)
					const ax = blob.cx + p.ox, ay = blob.cy + p.oy;
					const touching =
						ax <= cellLeft + wallTol || ax >= cellRight - wallTol ||
						ay <= cellTop + wallTol || ay >= cellBottom - wallTol;
					if (!touching) {
						const scale = 1 + (baseScale - 1) * boost;
						p.ox *= scale;
						p.oy *= scale;
					}
				} else {
					// Interior: velocity impulse so they visibly spring with the outer ring
					p.vx += (p.ox / len) * correction * boost;
					p.vy += (p.oy / len) * correction * boost;
				}
			}
			for (let i = 0; i < N; i++) {
				const p = blob.points[i];
				const ax = blob.cx + p.ox, ay = blob.cy + p.oy;
				if (ax < cellLeft) p.ox = cellLeft - blob.cx;
				if (ax > cellRight) p.ox = cellRight - blob.cx;
				if (ay < cellTop) p.oy = cellTop - blob.cy;
				if (ay > cellBottom) p.oy = cellBottom - blob.cy;
			}
		}
	}

	function drawBlob(ctx: CanvasRenderingContext2D, blob: SoftBlob) {
		const [r, g, b] = blob.color;
		const pts = blob.points;
		const N = blob.boundaryN;

		let centX = 0, centY = 0;
		for (let i = 0; i < N; i++) { centX += blob.cx + pts[i].ox; centY += blob.cy + pts[i].oy; }
		centX /= N; centY /= N;

		let maxDist = 0;
		for (let i = 0; i < N; i++) {
			const dx = blob.cx + pts[i].ox - centX, dy = blob.cy + pts[i].oy - centY;
			const d = dx * dx + dy * dy;
			if (d > maxDist) maxDist = d;
		}
		maxDist = Math.sqrt(maxDist);

		ctx.beginPath();
		let midX = (blob.cx + pts[0].ox + blob.cx + pts[N - 1].ox) / 2;
		let midY = (blob.cy + pts[0].oy + blob.cy + pts[N - 1].oy) / 2;
		ctx.moveTo(midX, midY);
		for (let i = 0; i < N; i++) {
			const curr = pts[i], next = pts[(i + 1) % N];
			const px = blob.cx + curr.ox, py = blob.cy + curr.oy;
			midX = (px + blob.cx + next.ox) / 2;
			midY = (py + blob.cy + next.oy) / 2;
			ctx.quadraticCurveTo(px, py, midX, midY);
		}
		ctx.closePath();

		ctx.shadowBlur = 20;
		ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.35)`;
		const gradR = maxDist * 1.15;
		const gradient = ctx.createRadialGradient(centX, centY, 0, centX, centY, gradR);
		gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
		gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.92)`);
		gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.75)`);
		gradient.addColorStop(0.88, `rgba(${r}, ${g}, ${b}, 0.35)`);
		gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);
		ctx.fillStyle = gradient;
		ctx.fill();
		ctx.shadowBlur = 0;
	}

	function drawMesh(ctx: CanvasRenderingContext2D, blob: SoftBlob) {
		const pts = blob.points;
		const N = blob.boundaryN;
		ctx.save();

		// Clip everything to the blob outline
		ctx.beginPath();
		let midX = (blob.cx + pts[0].ox + blob.cx + pts[N - 1].ox) / 2;
		let midY = (blob.cy + pts[0].oy + blob.cy + pts[N - 1].oy) / 2;
		ctx.moveTo(midX, midY);
		for (let i = 0; i < N; i++) {
			const curr = pts[i], next = pts[(i + 1) % N];
			const px = blob.cx + curr.ox, py = blob.cy + curr.oy;
			midX = (px + blob.cx + next.ox) / 2;
			midY = (py + blob.cy + next.oy) / 2;
			ctx.quadraticCurveTo(px, py, midX, midY);
		}
		ctx.closePath();
		ctx.clip();

		// All spring edges
		ctx.strokeStyle = 'rgba(255, 80, 0, 0.45)';
		ctx.lineWidth = 1.5;
		for (const s of blob.springs) {
			ctx.beginPath();
			ctx.moveTo(blob.cx + pts[s.a].ox, blob.cy + pts[s.a].oy);
			ctx.lineTo(blob.cx + pts[s.b].ox, blob.cy + pts[s.b].oy);
			ctx.stroke();
		}

		// Interior points (smaller, dimmer)
		ctx.fillStyle = 'rgba(255, 80, 0, 0.6)';
		for (let i = N; i < pts.length; i++) {
			ctx.beginPath();
			ctx.arc(blob.cx + pts[i].ox, blob.cy + pts[i].oy, 4, 0, Math.PI * 2);
			ctx.fill();
		}

		// Boundary ring points (larger, bright)
		ctx.fillStyle = 'rgba(255, 80, 0, 1)';
		for (let i = 0; i < N; i++) {
			ctx.beginPath();
			ctx.arc(blob.cx + pts[i].ox, blob.cy + pts[i].oy, 6, 0, Math.PI * 2);
			ctx.fill();
		}

		// Physics center
		ctx.fillStyle = 'white';
		ctx.strokeStyle = 'rgba(255, 80, 0, 1)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(blob.cx, blob.cy, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.restore();
	}

	const STORAGE_KEY = 'blob-grid-params';

	function saveParams() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				speed, stiffness, pressure, damping, showMesh, topology, numRing, blobSize, connections, panelOpen
			}));
		} catch { /* storage unavailable */ }
	}

	function loadParams() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const p = JSON.parse(raw);
			if (p.speed !== undefined) speed = p.speed;
			if (p.stiffness !== undefined) stiffness = p.stiffness;
			if (p.pressure !== undefined) pressure = p.pressure;
			if (p.damping !== undefined) damping = p.damping;
			if (p.showMesh !== undefined) showMesh = p.showMesh;
			if (p.topology !== undefined) topology = p.topology;
			if (p.numRing !== undefined) numRing = p.numRing;
			if (p.blobSize !== undefined) blobSize = p.blobSize;
			if (p.connections !== undefined) connections = p.connections;
			if (p.panelOpen !== undefined) panelOpen = p.panelOpen;
		} catch { /* corrupt storage */ }
	}

	$: speed, stiffness, pressure, damping, showMesh, topology, numRing, blobSize, connections, panelOpen, saveParams();

	onMount(() => {
		loadParams();
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let blob = createBlob(topology);
		let prevTopology = topology;
		let prevNumRing = numRing;
		let prevBlobSize = blobSize;
		let prevConnections = connections;
		let animationId: number;

		function animate(time: number) {
			// Recreate blob when topology or node count changes
			if (topology !== prevTopology || numRing !== prevNumRing || blobSize !== prevBlobSize || connections !== prevConnections) {
				blob = createBlob(topology);
				prevTopology = topology;
				prevNumRing = numRing;
				prevBlobSize = blobSize;
				prevConnections = connections;
			}

			ctx!.fillStyle = BG_COLOR;
			ctx!.fillRect(0, 0, WIDTH, HEIGHT);

			updateBlob(blob, time);
			drawBlob(ctx!, blob);
			if (showMesh) drawMesh(ctx!, blob);

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationId);
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
					<label for="param-size" class="text-xs font-bold">Size</label>
					<input id="param-size" type="range" min={50} max={500} step={5} bind:value={blobSize} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{blobSize}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-nodes" class="text-xs font-bold">Nodes</label>
					<input id="param-nodes" type="range" min={6} max={48} step={1} bind:value={numRing} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{numRing}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-connections" class="text-xs font-bold">Connections</label>
					<input id="param-connections" type="range" min={1} max={8} step={1} bind:value={connections} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{connections}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-topology" class="text-xs font-bold">Topology</label>
					<select
						id="param-topology"
						bind:value={topology}
						class="w-full rounded text-sm px-2 py-1 mt-1 bg-surface border border-neutral-300"
					>
						<option value="spokes">Spokes (original)</option>
						<option value="rings">Rings</option>
						<option value="cross">Cross</option>
						<option value="grid">Grid</option>
					</select>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-speed" class="text-xs font-bold">Speed</label>
					<input id="param-speed" type="range" min={0.05} max={10} step={0.05} bind:value={speed} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{speed.toFixed(2)}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-stiffness" class="text-xs font-bold">Stiffness</label>
					<input id="param-stiffness" type="range" min={0.0005} max={0.1} step={0.0005} bind:value={stiffness} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{stiffness.toFixed(4)}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-pressure" class="text-xs font-bold">Pressure</label>
					<input id="param-pressure" type="range" min={0} max={0.9} step={0.001} bind:value={pressure} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{pressure.toFixed(4)}</span>
				</div>

				<div class="flex flex-col my-2.5">
					<label for="param-damping" class="text-xs font-bold">Damping</label>
					<input id="param-damping" type="range" min={0.8} max={0.99} step={0.005} bind:value={damping} class="w-full rounded !text-md px-2 py-1" />
					<span class="text-xs text-neutral-500">{damping.toFixed(3)}</span>
				</div>

				<div class="flex items-center gap-2 my-2.5">
					<input id="param-mesh" type="checkbox" bind:checked={showMesh} />
					<label for="param-mesh" class="text-xs font-bold">Show mesh</label>
				</div>
			</div>
		{/if}
	</div>
</div>
