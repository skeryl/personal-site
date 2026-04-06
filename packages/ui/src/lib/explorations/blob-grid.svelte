<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	const WIDTH = 1080;
	const HEIGHT = 1920;
	const BG_COLOR = '#f5f0ea';
	const WALL_MARGIN = 3;

	const SUBSTEPS = 6;
	const MAX_DISPLACEMENT = 8;

	let speed = 1.7;
	let springK = 0.02;
	let pressureK = 300;
	let damping = 0.986;
	let numRing = 28;
	let numBlobs = 30;
	let showMesh = false;
	let panelOpen = false;

	// localStorage persistence
	const STORAGE_KEY = 'blob-grid-params';

	function saveParams() {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					speed,
					springK,
					pressureK,
					damping,
					numRing,
					numBlobs,
					showMesh,
					panelOpen
				})
			);
		} catch {
			/* storage unavailable */
		}
	}

	function loadParams() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const p = JSON.parse(raw);
			if (p.speed !== undefined) speed = p.speed;
			if (p.springK !== undefined) springK = p.springK;
			if (p.pressureK !== undefined) pressureK = p.pressureK;
			if (p.damping !== undefined) damping = p.damping;
			if (p.numRing !== undefined) numRing = p.numRing;
			if (p.numBlobs !== undefined) numBlobs = p.numBlobs;
			if (p.showMesh !== undefined) showMesh = p.showMesh;
			if (p.panelOpen !== undefined) panelOpen = p.panelOpen;
		} catch {
			/* corrupt storage */
		}
	}

	$: (speed, springK, pressureK, damping, numRing, numBlobs, showMesh, panelOpen, saveParams());

	// Recording
	let isRecording = false;
	let recorder: MediaRecorder | null = null;
	let recordingUrl: string | null = null;
	let recordingExt = 'webm';

	function startRecording() {
		if (!canvas) return;
		const stream = canvas.captureStream(30);
		const chunks: Blob[] = [];
		let mimeType = 'video/webm; codecs=vp9';
		recordingExt = 'webm';
		if (MediaRecorder.isTypeSupported('video/mp4')) {
			mimeType = 'video/mp4';
			recordingExt = 'mp4';
		}
		recorder = new MediaRecorder(stream, { mimeType });
		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) chunks.push(e.data);
		};
		recorder.onstop = () => {
			const blob = new Blob(chunks, { type: mimeType });
			if (recordingUrl) URL.revokeObjectURL(recordingUrl);
			recordingUrl = URL.createObjectURL(blob);
		};
		recorder.start();
		isRecording = true;
	}

	function stopRecording() {
		if (recorder && recorder.state === 'recording') recorder.stop();
		isRecording = false;
	}

	interface VPoint {
		x: number;
		y: number;
		px: number;
		py: number;
	}

	interface SoftBlob {
		cx: number;
		cy: number;
		ring: VPoint[];
		restLens: number[];
		bendLens: number[];
		restArea: number;
		avgRadius: number;
		color: [number, number, number];
	}

	// Color palette — cycled for any blob count
	const palette: [number, number, number][] = [
		[66, 165, 245],
		[210, 175, 140],
		[230, 110, 95],
		[200, 40, 100],
		[235, 210, 55],
		[148, 128, 200],
		[80, 75, 68],
		[45, 100, 220],
		[155, 168, 28],
		[160, 118, 78],
		[210, 170, 200],
		[115, 188, 198],
		[100, 58, 28],
		[0, 210, 155],
		[200, 28, 28],
		[180, 80, 180],
		[90, 200, 90],
		[255, 160, 60],
		[60, 60, 160],
		[200, 200, 80],
		[140, 80, 60],
		[80, 180, 220],
		[220, 120, 180],
		[120, 160, 80],
		[180, 140, 200],
		[100, 200, 180],
		[200, 80, 60],
		[60, 140, 120],
		[220, 180, 120],
		[140, 100, 180]
	];

	function polyArea(ring: VPoint[]): number {
		let area = 0;
		const n = ring.length;
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			area += ring[i].x * ring[j].y - ring[j].x * ring[i].y;
		}
		return Math.abs(area) / 2;
	}

	function createBlobs(): SoftBlob[] {
		const N = numRing;
		const count = numBlobs;
		// Arrange in a grid with enough columns to fill the canvas
		const cols = Math.ceil(Math.sqrt(count * (WIDTH / HEIGHT)));
		const rows = Math.ceil(count / cols);
		const baseRadius = Math.min(WIDTH / (cols * 2.5), HEIGHT / (rows * 2.5), 130);

		const blobs: SoftBlob[] = [];
		for (let idx = 0; idx < count; idx++) {
			const col = idx % cols;
			const row = Math.floor(idx / cols);
			const cx = (col + 0.5) * (WIDTH / cols) + (Math.random() - 0.5) * 40;
			const cy = (row + 0.5) * (HEIGHT / rows) + (Math.random() - 0.5) * 40;
			const rot = Math.random() * Math.PI * 2;
			const moveAngle = Math.random() * Math.PI * 2;
			const ivx = Math.cos(moveAngle) * speed;
			const ivy = Math.sin(moveAngle) * speed;

			// Slight size/shape variation per blob
			const sizeVar = 0.8 + Math.random() * 0.4;
			const aspectVar = 0.85 + Math.random() * 0.3;
			const rx = baseRadius * sizeVar * aspectVar;
			const ry = (baseRadius * sizeVar) / aspectVar;

			const ring: VPoint[] = [];
			for (let i = 0; i < N; i++) {
				const angle = (i / N) * Math.PI * 2 + rot;
				const c = Math.cos(angle - rot),
					s = Math.sin(angle - rot);
				const r = (rx * ry) / Math.sqrt((ry * c) ** 2 + (rx * s) ** 2);
				const x = cx + Math.cos(angle) * r;
				const y = cy + Math.sin(angle) * r;
				ring.push({ x, y, px: x - ivx, py: y - ivy });
			}

			const restLens: number[] = [];
			for (let i = 0; i < N; i++) {
				const j = (i + 1) % N;
				restLens.push(Math.sqrt((ring[j].x - ring[i].x) ** 2 + (ring[j].y - ring[i].y) ** 2));
			}

			const bendLens: number[] = [];
			for (let i = 0; i < N; i++) {
				const j = (i + 2) % N;
				bendLens.push(Math.sqrt((ring[j].x - ring[i].x) ** 2 + (ring[j].y - ring[i].y) ** 2));
			}

			blobs.push({
				cx,
				cy,
				ring,
				restLens,
				bendLens,
				restArea: polyArea(ring),
				avgRadius: (rx + ry) / 2,
				color: palette[idx % palette.length]
			});
		}
		return blobs;
	}

	function updateBlob(blob: SoftBlob) {
		const N = blob.ring.length;
		const cellLeft = WALL_MARGIN;
		const cellRight = WIDTH - WALL_MARGIN;
		const cellTop = WALL_MARGIN;
		const cellBottom = HEIGHT - WALL_MARGIN;

		const dt = 1 / SUBSTEPS;
		for (let step = 0; step < SUBSTEPS; step++) {
			for (const p of blob.ring) {
				let dx = (p.x - p.px) * damping;
				let dy = (p.y - p.py) * damping;
				const spd = Math.sqrt(dx * dx + dy * dy);
				if (spd > MAX_DISPLACEMENT * dt) {
					const s = (MAX_DISPLACEMENT * dt) / spd;
					dx *= s;
					dy *= s;
				}
				p.px = p.x;
				p.py = p.y;
				p.x += dx;
				p.y += dy;
			}

			const area = polyArea(blob.ring);
			const P = (pressureK * dt * dt) / Math.max(area, 1);
			for (let i = 0; i < N; i++) {
				const j = (i + 1) % N;
				const pi = blob.ring[i],
					pj = blob.ring[j];
				const edgeX = pj.x - pi.x,
					edgeY = pj.y - pi.y;
				const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 0.001;
				const nx = edgeY / edgeLen,
					ny = -edgeX / edgeLen;
				const f = P * edgeLen * 0.5;
				pi.x += nx * f;
				pi.y += ny * f;
				pj.x += nx * f;
				pj.y += ny * f;
			}

			const kEdge = springK * dt;
			for (let i = 0; i < N; i++) {
				const j = (i + 1) % N;
				const pi = blob.ring[i],
					pj = blob.ring[j];
				const dx = pj.x - pi.x,
					dy = pj.y - pi.y;
				const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const diff = (dist - blob.restLens[i]) / dist;
				const fx = dx * diff * kEdge * 0.5;
				const fy = dy * diff * kEdge * 0.5;
				pi.x += fx;
				pi.y += fy;
				pj.x -= fx;
				pj.y -= fy;
			}

			const kBend = springK * 0.4 * dt;
			for (let i = 0; i < N; i++) {
				const j = (i + 2) % N;
				const pi = blob.ring[i],
					pj = blob.ring[j];
				const dx = pj.x - pi.x,
					dy = pj.y - pi.y;
				const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const diff = (dist - blob.bendLens[i]) / dist;
				const fx = dx * diff * kBend * 0.5;
				const fy = dy * diff * kBend * 0.5;
				pi.x += fx;
				pi.y += fy;
				pj.x -= fx;
				pj.y -= fy;
			}

			for (const p of blob.ring) {
				if (p.x < cellLeft) {
					p.x = cellLeft;
					if (p.px < cellLeft) p.px = cellLeft;
				}
				if (p.x > cellRight) {
					p.x = cellRight;
					if (p.px > cellRight) p.px = cellRight;
				}
				if (p.y < cellTop) {
					p.y = cellTop;
					if (p.py < cellTop) p.py = cellTop;
				}
				if (p.y > cellBottom) {
					p.y = cellBottom;
					if (p.py > cellBottom) p.py = cellBottom;
				}
			}
		}

		let avgVx = 0,
			avgVy = 0;
		for (const p of blob.ring) {
			avgVx += p.x - p.px;
			avgVy += p.y - p.py;
		}
		avgVx /= N;
		avgVy /= N;

		const currentSpeed = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
		if (currentSpeed > 0.0001) {
			const ratio = speed / currentSpeed;
			const blend = 0.03;
			const dvx = avgVx * (ratio - 1) * blend;
			const dvy = avgVy * (ratio - 1) * blend;
			for (const p of blob.ring) {
				p.px -= dvx;
				p.py -= dvy;
			}
		} else {
			const angle = Math.random() * Math.PI * 2;
			const push = speed * 0.5;
			for (const p of blob.ring) {
				p.px -= Math.cos(angle) * push;
				p.py -= Math.sin(angle) * push;
			}
		}

		blob.cx = 0;
		blob.cy = 0;
		for (const p of blob.ring) {
			blob.cx += p.x;
			blob.cy += p.y;
		}
		blob.cx /= N;
		blob.cy /= N;
	}

	function blobPath(ctx: CanvasRenderingContext2D, ring: VPoint[]) {
		const N = ring.length;
		ctx.beginPath();
		let midX = (ring[0].x + ring[N - 1].x) / 2;
		let midY = (ring[0].y + ring[N - 1].y) / 2;
		ctx.moveTo(midX, midY);
		for (let i = 0; i < N; i++) {
			const curr = ring[i],
				next = ring[(i + 1) % N];
			midX = (curr.x + next.x) / 2;
			midY = (curr.y + next.y) / 2;
			ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
		}
		ctx.closePath();
	}

	function drawBlob(ctx: CanvasRenderingContext2D, blob: SoftBlob) {
		const [r, g, b] = blob.color;
		const ring = blob.ring;
		const N = ring.length;

		let centX = 0,
			centY = 0;
		for (const p of ring) {
			centX += p.x;
			centY += p.y;
		}
		centX /= N;
		centY /= N;

		let maxDX = 0,
			maxDY = 0;
		for (const p of ring) {
			maxDX = Math.max(maxDX, Math.abs(p.x - centX));
			maxDY = Math.max(maxDY, Math.abs(p.y - centY));
		}

		ctx.save();
		ctx.translate(centX, centY);
		const aspect = maxDX / (maxDY || 1);
		ctx.scale(aspect, 1);

		const gradR = maxDY * 1.6;
		const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, gradR);
		const STOPS = 16;
		for (let i = 0; i <= STOPS; i++) {
			const t = i / STOPS;
			const shifted = Math.max(0, t - 0.45) / 0.55;
			const alpha = Math.exp(-(shifted * shifted) * 4.5);
			gradient.addColorStop(t, `rgba(${r}, ${g}, ${b}, ${alpha})`);
		}

		ctx.fillStyle = gradient;
		ctx.fillRect(-gradR * 2, -gradR, gradR * 4, gradR * 2);
		ctx.restore();
	}

	function drawMesh(ctx: CanvasRenderingContext2D, blob: SoftBlob) {
		const ring = blob.ring;
		const N = ring.length;

		ctx.save();
		ctx.strokeStyle = 'rgba(255, 80, 0, 0.5)';
		ctx.lineWidth = 1;
		for (let i = 0; i < N; i++) {
			const j = (i + 1) % N;
			ctx.beginPath();
			ctx.moveTo(ring[i].x, ring[i].y);
			ctx.lineTo(ring[j].x, ring[j].y);
			ctx.stroke();
		}

		ctx.strokeStyle = 'rgba(255, 80, 0, 0.15)';
		for (let i = 0; i < N; i++) {
			const j = (i + 2) % N;
			ctx.beginPath();
			ctx.moveTo(ring[i].x, ring[i].y);
			ctx.lineTo(ring[j].x, ring[j].y);
			ctx.stroke();
		}

		ctx.fillStyle = 'rgba(255, 80, 0, 1)';
		for (const p of ring) {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = 'white';
		ctx.strokeStyle = 'rgba(255, 80, 0, 1)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(blob.cx, blob.cy, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.restore();
	}

	function collideBlobs(blobs: SoftBlob[]) {
		for (let i = 0; i < blobs.length; i++) {
			for (let j = i + 1; j < blobs.length; j++) {
				const a = blobs[i],
					b = blobs[j];
				const dx = b.cx - a.cx;
				const dy = b.cy - a.cy;
				const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const minDist = a.avgRadius + b.avgRadius;

				if (dist >= minDist) continue;

				const nx = dx / dist,
					ny = dy / dist;
				const overlap = minDist - dist;
				const push = overlap * 0.15;

				for (const p of a.ring) {
					p.x -= nx * push;
					p.y -= ny * push;
				}
				for (const p of b.ring) {
					p.x += nx * push;
					p.y += ny * push;
				}
			}
		}
	}

	onMount(() => {
		loadParams();
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let blobs = createBlobs();
		let prevNumRing = numRing;
		let prevNumBlobs = numBlobs;
		let animationId: number;

		function animate(time: number) {
			if (numRing !== prevNumRing || numBlobs !== prevNumBlobs) {
				blobs = createBlobs();
				prevNumRing = numRing;
				prevNumBlobs = numBlobs;
			}

			ctx!.fillStyle = BG_COLOR;
			ctx!.fillRect(0, 0, WIDTH, HEIGHT);

			for (const blob of blobs) {
				updateBlob(blob);
			}
			collideBlobs(blobs);

			for (const blob of blobs) {
				drawBlob(ctx!, blob);
				if (showMesh) drawMesh(ctx!, blob);
			}

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
	></canvas>

	<div class="absolute top-2 right-2 z-10 flex gap-2 items-start">
		<button
			class="rounded-md shadow-lg px-3 py-1.5 text-sm font-bold"
			class:bg-red-500={isRecording}
			class:text-white={isRecording}
			class:bg-surface={!isRecording}
			on:click={() => (isRecording ? stopRecording() : startRecording())}
		>
			{isRecording ? 'Stop' : 'Record'}
		</button>
		<button
			class="bg-surface rounded-md shadow-lg px-3 py-1.5 text-sm font-bold"
			on:click={() => (panelOpen = !panelOpen)}
		>
			{panelOpen ? 'Close' : 'Params'}
		</button>

		{#if panelOpen}
			<div class="mt-2 w-[220px] bg-surface rounded-md shadow-lg p-4 max-h-[80vh] overflow-y-auto">
				<div class="flex flex-col my-2.5">
					<label for="param-blobs" class="text-xs font-bold">Blobs</label>
					<input
						id="param-blobs"
						type="range"
						min={1}
						max={50}
						step={1}
						bind:value={numBlobs}
						class="w-full"
					/>
					<span class="text-xs text-neutral-500">{numBlobs}</span>
				</div>
				<div class="flex flex-col my-2.5">
					<label for="param-speed" class="text-xs font-bold">Speed</label>
					<input
						id="param-speed"
						type="range"
						min={0.05}
						max={5}
						step={0.05}
						bind:value={speed}
						class="w-full"
					/>
					<span class="text-xs text-neutral-500">{speed.toFixed(2)}</span>
				</div>
				<div class="flex flex-col my-2.5">
					<label for="param-springK" class="text-xs font-bold">Spring K</label>
					<input
						id="param-springK"
						type="range"
						min={0.01}
						max={1}
						step={0.01}
						bind:value={springK}
						class="w-full"
					/>
					<span class="text-xs text-neutral-500">{springK.toFixed(2)}</span>
				</div>
				<div class="flex flex-col my-2.5">
					<label for="param-pressure" class="text-xs font-bold">Pressure</label>
					<input
						id="param-pressure"
						type="range"
						min={50}
						max={10000}
						step={50}
						bind:value={pressureK}
						class="w-full"
					/>
					<span class="text-xs text-neutral-500">{pressureK}</span>
				</div>
				<div class="flex flex-col my-2.5">
					<label for="param-damping" class="text-xs font-bold">Damping</label>
					<input
						id="param-damping"
						type="range"
						min={0.95}
						max={1}
						step={0.001}
						bind:value={damping}
						class="w-full"
					/>
					<span class="text-xs text-neutral-500">{damping.toFixed(3)}</span>
				</div>
				<div class="flex flex-col my-2.5">
					<label for="param-ring" class="text-xs font-bold">Ring Nodes</label>
					<input
						id="param-ring"
						type="range"
						min={12}
						max={48}
						step={1}
						bind:value={numRing}
						class="w-full"
					/>
					<span class="text-xs text-neutral-500">{numRing}</span>
				</div>
				<div class="flex items-center gap-2 my-2.5">
					<input id="param-mesh" type="checkbox" bind:checked={showMesh} />
					<label for="param-mesh" class="text-xs font-bold">Show mesh</label>
				</div>
			</div>
		{/if}
	</div>

	{#if recordingUrl}
		<div
			class="absolute bottom-2 right-2 z-10 bg-surface rounded-md shadow-lg p-3 flex gap-2 items-center"
		>
			<a
				href={recordingUrl}
				download={`blob-grid.${recordingExt}`}
				class="text-sm font-bold underline"
			>
				Download .{recordingExt}
			</a>
			<button
				class="text-xs text-neutral-500"
				on:click={() => {
					if (recordingUrl) URL.revokeObjectURL(recordingUrl);
					recordingUrl = null;
				}}
			>
				dismiss
			</button>
		</div>
	{/if}
</div>
