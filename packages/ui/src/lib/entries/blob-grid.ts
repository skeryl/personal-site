import { type Post, PostType, type StageContent } from '@sc/model';
import { type Stage } from 'grraf';
import {
	type ContentParams,
	numberParam,
	paramsById,
	ParamType,
	selectParam,
	type ContentParam
} from '$lib/content-params';

// Cell dimensions from Shane's calibrated 1080×1920 / 3×5 grid.
// Physics constants are tuned for these exact sizes.
const CELL_W = 360;
const CELL_H = 384;
const BG_COLOR = '#f5f0ea';
const GRID_COLOR = '#000000';
const GRID_LINE_W = 2;
const WALL_MARGIN = 0;
const SUBSTEPS = 6;
const MAX_DISPLACEMENT = 8;

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
	[230, 170, 190],
	[0, 210, 155],
	[200, 28, 28]
];

interface VPoint {
	x: number;
	y: number;
	px: number;
	py: number;
}

interface CellBounds {
	left: number;
	right: number;
	top: number;
	bottom: number;
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
	cell: CellBounds;
}

function polyArea(ring: VPoint[]): number {
	let area = 0;
	const n = ring.length;
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		area += ring[i].x * ring[j].y - ring[j].x * ring[i].y;
	}
	return Math.abs(area) / 2;
}

class BlobGridContent implements StageContent {
	private stage: Stage | undefined;
	private ctx: CanvasRenderingContext2D | undefined;
	private animationId: number | undefined;
	private isPlaying = false;
	private blobs: SoftBlob[] = [];
	private cols = 0;
	private rows = 0;

	private speed = 0.65;
	private springK = 0.02;
	private pressureK = 300;
	private damping = 0.986;
	private numRing = 28;
	private showMesh = false;

	start(stage: Stage): void {
		this.stage = stage;
		this.ctx = stage.canvas.getContext('2d')!;
		this.isPlaying = true;
		this.animate();
	}

	unpause(): void {
		if (!this.isPlaying) {
			this.isPlaying = true;
			this.animate();
		}
	}

	stop(): void {
		this.isPlaying = false;
		if (this.animationId !== undefined) {
			cancelAnimationFrame(this.animationId);
			this.animationId = undefined;
		}
	}

	setParams(params: ContentParams): void {
		const byId = paramsById(params);
		const num = (id: string) => (byId[id] as ContentParam<ParamType.number>).value;

		this.speed = num('speed');
		this.springK = num('spring-k');
		this.pressureK = num('pressure');
		this.damping = num('damping');

		const newRing = num('ring-nodes');
		this.showMesh = (byId['show-mesh'] as ContentParam<ParamType.string>).value === 'On';

		if (newRing !== this.numRing) {
			this.numRing = newRing;
			this.blobs = this.createBlobs();
		}
	}

	private animate = (): void => {
		if (!this.isPlaying || !this.ctx || !this.stage) return;

		const canvas = this.stage.canvas;

		// Match Shane's visual cell size: the original 1080×1920 grid was
		// scaled to fit the canvas. Use that same scale to determine how
		// big each cell appears, then tile enough cells to fill the screen.
		const refScale = Math.min(canvas.width / 1080, canvas.height / 2080);
		const visualCellW = CELL_W * refScale;
		const visualCellH = CELL_H * refScale;
		const cols = Math.max(1, Math.ceil(canvas.width / visualCellW));
		const rows = Math.max(1, Math.ceil(canvas.height / visualCellH));
		if (cols !== this.cols || rows !== this.rows) {
			this.cols = cols;
			this.rows = rows;
			this.blobs = this.createBlobs();
		}

		const physW = cols * CELL_W;
		const physH = rows * CELL_H;
		// Scale so the grid covers the full canvas (slight overflow clipped)
		const scale = Math.max(canvas.width / physW, canvas.height / physH);
		const offsetX = (canvas.width - physW * scale) / 2;
		const offsetY = (canvas.height - physH * scale) / 2;

		// Clear full canvas
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.fillStyle = BG_COLOR;
		this.ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Uniform scale, centered
		this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

		for (const blob of this.blobs) this.updateBlob(blob);

		for (const blob of this.blobs) {
			this.drawBlob(blob);
			if (this.showMesh) this.drawMesh(blob);
		}

		this.drawGrid();

		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.animationId = requestAnimationFrame(this.animate);
	};

	private drawGrid(): void {
		const ctx = this.ctx!;
		const physW = this.cols * CELL_W;
		const physH = this.rows * CELL_H;
		ctx.strokeStyle = GRID_COLOR;
		ctx.lineWidth = GRID_LINE_W;

		for (let c = 1; c < this.cols; c++) {
			const x = c * CELL_W;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, physH);
			ctx.stroke();
		}

		for (let r = 1; r < this.rows; r++) {
			const y = r * CELL_H;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(physW, y);
			ctx.stroke();
		}

		ctx.strokeRect(0, 0, physW, physH);
	}

	private createBlobs(): SoftBlob[] {
		const N = this.numRing;
		const count = this.cols * this.rows;
		const baseRadius = Math.min(CELL_W, CELL_H) * 0.35;

		const blobs: SoftBlob[] = [];
		for (let idx = 0; idx < count; idx++) {
			const col = idx % this.cols;
			const row = Math.floor(idx / this.cols);

			const cellLeft = col * CELL_W + WALL_MARGIN;
			const cellRight = (col + 1) * CELL_W - WALL_MARGIN;
			const cellTop = row * CELL_H + WALL_MARGIN;
			const cellBottom = (row + 1) * CELL_H - WALL_MARGIN;

			const cx = (cellLeft + cellRight) / 2 + (Math.random() - 0.5) * 20;
			const cy = (cellTop + cellBottom) / 2 + (Math.random() - 0.5) * 20;
			const rot = Math.random() * Math.PI * 2;
			const moveAngle = Math.random() * Math.PI * 2;
			const ivx = Math.cos(moveAngle) * this.speed;
			const ivy = Math.sin(moveAngle) * this.speed;

			const sizeVar = 0.85 + Math.random() * 0.3;
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
				color: palette[idx % palette.length],
				cell: { left: cellLeft, right: cellRight, top: cellTop, bottom: cellBottom }
			});
		}
		return blobs;
	}

	private updateBlob(blob: SoftBlob): void {
		const N = blob.ring.length;
		const { left: cellLeft, right: cellRight, top: cellTop, bottom: cellBottom } = blob.cell;

		const dt = 1 / SUBSTEPS;
		for (let step = 0; step < SUBSTEPS; step++) {
			for (const p of blob.ring) {
				let dx = (p.x - p.px) * this.damping;
				let dy = (p.y - p.py) * this.damping;
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
			const P = (this.pressureK * dt * dt) / Math.max(area, 1);
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

			const kEdge = this.springK * dt;
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

			const kBend = this.springK * 0.4 * dt;
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
					p.px = 2 * cellLeft - p.px; // reflect velocity
				}
				if (p.x > cellRight) {
					p.x = cellRight;
					p.px = 2 * cellRight - p.px;
				}
				if (p.y < cellTop) {
					p.y = cellTop;
					p.py = 2 * cellTop - p.py;
				}
				if (p.y > cellBottom) {
					p.y = cellBottom;
					p.py = 2 * cellBottom - p.py;
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
			// Maintain target speed
			const ratio = this.speed / currentSpeed;
			const blend = 0.03;
			const dvx = avgVx * (ratio - 1) * blend;
			const dvy = avgVy * (ratio - 1) * blend;
			for (const p of blob.ring) {
				p.px -= dvx;
				p.py -= dvy;
			}
		} else {
			const angle = Math.random() * Math.PI * 2;
			const push = this.speed * 0.5;
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

	private blobPath(ring: VPoint[]): void {
		const ctx = this.ctx!;
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

	private drawBlob(blob: SoftBlob): void {
		const ctx = this.ctx!;
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

		let maxR = 0;
		for (const p of ring) {
			const dx = p.x - centX;
			const dy = p.y - centY;
			maxR = Math.max(maxR, Math.sqrt(dx * dx + dy * dy));
		}

		// Radial gradient centered on blob, sized to its radius
		const gradient = ctx.createRadialGradient(centX, centY, 0, centX, centY, maxR);
		gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
		gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.8)`);
		gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.35)`);

		// Fill the blob shape with the gradient
		ctx.save();
		this.blobPath(ring);
		ctx.fillStyle = gradient;
		ctx.fill();
		ctx.restore();
	}

	private drawMesh(blob: SoftBlob): void {
		const ctx = this.ctx!;
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
}

const params = [
	{
		...numberParam('Speed', 0.65, { min: 0.05, max: 1.5, step: 0.05 }),
		group: 'Motion',
		description: 'How fast each blob drifts within its cell'
	},
	{
		...numberParam('Damping', 0.986, { min: 0.95, max: 1, step: 0.001 }),
		group: 'Motion',
		description: 'How quickly motion fades — lower values add more friction'
	},
	{
		...numberParam('Ring Nodes', 28, { min: 12, max: 48, step: 1 }),
		group: 'Structure',
		description: "Smoothness of each blob's outline — more nodes, rounder shape"
	},
	{
		...numberParam('Spring K', 0.02, { min: 0.01, max: 0.15, step: 0.005 }),
		group: 'Structure',
		description: 'How stiff each blob is — higher values resist deformation'
	},
	{
		...numberParam('Pressure', 300, { min: 50, max: 2000, step: 25 }),
		group: 'Structure',
		description: 'Internal pressure pushing each blob outward — controls firmness'
	},
	{ ...selectParam('Show Mesh', ['Off', 'On'], 'Off'), group: 'Debug' }
];

const post: Post = {
	summary: {
		id: 'blob-grid',
		tags: ['animation', 'canvas'],
		title: 'Blob Grid',
		timestamp: new Date(2026, 3, 4),
		type: PostType.experiment,
		isHidden: false,
		collaborators: [{ name: 'Eva Warren', role: 'Art Direction', url: 'https://evamarie.studio' }]
	},
	content: () => new BlobGridContent(),
	params
};

export default post;
