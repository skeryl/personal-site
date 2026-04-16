import { type Post, PostType, type RendererParams } from '@sc/model';
import { BookOfShadersContent } from '../book-of-shaders';
import { type IUniform } from '$lib/three';
import { DataTexture, FloatType, NearestFilter, RGBAFormat, Vector2 } from 'three';
import { type ContentParams, numberParam, selectParam, paramsById } from '$lib/content-params';

/* ── constants ─────────────────────────────────────────────── */

const MAX_BLOBS = 100;
const SUBSTEPS = 6;
const MAX_DISPLACEMENT = 8;
const MERGE_OVERLAP = 0.7;
const COLOR_LERP_SPEED = 0.025;

/* ── types ─────────────────────────────────────────────────── */

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
	maxDX: number;
	maxDY: number;
	baseColor: [number, number, number];
	renderColor: [number, number, number];
}

/* ── palette ───────────────────────────────────────────────── */

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

/* ── physics helpers ───────────────────────────────────────── */

const WALL = 3;

function polyArea(ring: VPoint[]): number {
	let a = 0;
	const n = ring.length;
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		a += ring[i].x * ring[j].y - ring[j].x * ring[i].y;
	}
	return Math.abs(a) / 2;
}

/* ── params ─────────────────────────────────────────────────── */

const defaultParams: ContentParams = [
	{ ...numberParam('Speed', 2.7, { min: 0.05, max: 5, step: 0.05 }), group: 'Motion' },
	{ ...numberParam('Damping', 0.979, { min: 0.95, max: 1, step: 0.001 }), group: 'Motion' },
	{ ...numberParam('Blobs', 33, { min: 1, max: 100, step: 1 }), group: 'Structure' },
	{ ...numberParam('Ring Nodes', 17, { min: 12, max: 48, step: 1 }), group: 'Structure' },
	{ ...numberParam('Spring K', 0.106, { min: 0.001, max: 0.5, step: 0.001 }), group: 'Structure' },
	{ ...numberParam('Pressure', 2920, { min: 10, max: 5000, step: 10 }), group: 'Structure' },
	{ ...numberParam('Merge Strength', 1.4, { min: 1, max: 5, step: 0.1 }), group: 'Blob Merging' },
	{ ...selectParam('Show Mesh', ['Off', 'On'], 'Off'), group: 'Debug' }
];

/* ── content class ─────────────────────────────────────────── */

class BlobConvergenceContent extends BookOfShadersContent {
	private blobs: SoftBlob[] = [];
	private merges = new Map<string, { hostIdx: number }>();

	private blobData: Float32Array;
	private blobTexture: DataTexture;

	private physW = 1080;
	private physH = 1920;
	private numBlobs = 33;
	private speed = 2.7;
	private springK = 0.106;
	private pressureK = 2920;
	private damping = 0.979;
	private numRing = 17;

	private params: ContentParams = defaultParams.map((p) => ({ ...p }));

	constructor() {
		super();

		this.blobData = new Float32Array(MAX_BLOBS * 2 * 4);
		this.blobTexture = new DataTexture(
			this.blobData as Float32Array<ArrayBuffer>,
			MAX_BLOBS,
			2,
			RGBAFormat,
			FloatType
		);
		this.blobTexture.minFilter = NearestFilter;
		this.blobTexture.magFilter = NearestFilter;

		this.uniforms.u_blobData = { value: this.blobTexture } as IUniform;
		this.uniforms.u_numBlobs = { value: 0 } as IUniform;
		this.uniforms.u_physSize = { value: new Vector2(1080, 1920) } as IUniform;
		this.uniforms.u_showMesh = { value: 0.0 } as IUniform;
		this.uniforms.u_colorBleed = { value: 2.2 } as IUniform;
	}

	/* ── blob creation ─────────────────────────────────────── */

	private initBlobs() {
		this.blobs = [];
		this.merges.clear();
		const N = this.numRing;
		const W = this.physW,
			H = this.physH;
		const cols = Math.ceil(Math.sqrt(this.numBlobs * (W / H)));
		const rows = Math.ceil(this.numBlobs / cols);
		const baseR = Math.min(W / (cols * 2.5), H / (rows * 2.5), 130);

		for (let idx = 0; idx < this.numBlobs; idx++) {
			const col = idx % cols;
			const row = Math.floor(idx / cols);
			const cx = (col + 0.5) * (W / cols) + (Math.random() - 0.5) * 40;
			const cy = (row + 0.5) * (H / rows) + (Math.random() - 0.5) * 40;
			const rot = Math.random() * Math.PI * 2;
			const ang = Math.random() * Math.PI * 2;
			const iv = this.speed;

			const sv = 0.8 + Math.random() * 0.4;
			const av = 0.85 + Math.random() * 0.3;
			const rx = baseR * sv * av;
			const ry = (baseR * sv) / av;

			const ring: VPoint[] = [];
			for (let i = 0; i < N; i++) {
				const a = (i / N) * Math.PI * 2 + rot;
				const c = Math.cos(a - rot),
					s = Math.sin(a - rot);
				const r = (rx * ry) / Math.sqrt((ry * c) ** 2 + (rx * s) ** 2);
				const x = cx + Math.cos(a) * r;
				const y = cy + Math.sin(a) * r;
				ring.push({ x, y, px: x - Math.cos(ang) * iv, py: y - Math.sin(ang) * iv });
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

			const color: [number, number, number] = [...palette[idx % palette.length]];
			this.blobs.push({
				cx,
				cy,
				ring,
				restLens,
				bendLens,
				restArea: polyArea(ring),
				avgRadius: (rx + ry) / 2,
				maxDX: rx,
				maxDY: ry,
				baseColor: color,
				renderColor: [...color]
			});
		}
	}

	/* ── physics step ──────────────────────────────────────── */

	private stepBlob(blob: SoftBlob) {
		const N = blob.ring.length;
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
				const ex = pj.x - pi.x,
					ey = pj.y - pi.y;
				const el = Math.sqrt(ex * ex + ey * ey) || 0.001;
				const f = P * el * 0.5;
				const nx = ey / el,
					ny = -ex / el;
				pi.x += nx * f;
				pi.y += ny * f;
				pj.x += nx * f;
				pj.y += ny * f;
			}

			const kE = this.springK * dt;
			for (let i = 0; i < N; i++) {
				const j = (i + 1) % N;
				const pi = blob.ring[i],
					pj = blob.ring[j];
				const dx = pj.x - pi.x,
					dy = pj.y - pi.y;
				const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const diff = (d - blob.restLens[i]) / d;
				const fx = dx * diff * kE * 0.5,
					fy = dy * diff * kE * 0.5;
				pi.x += fx;
				pi.y += fy;
				pj.x -= fx;
				pj.y -= fy;
			}

			const kB = this.springK * 0.4 * dt;
			for (let i = 0; i < N; i++) {
				const j = (i + 2) % N;
				const pi = blob.ring[i],
					pj = blob.ring[j];
				const dx = pj.x - pi.x,
					dy = pj.y - pi.y;
				const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const diff = (d - blob.bendLens[i]) / d;
				const fx = dx * diff * kB * 0.5,
					fy = dy * diff * kB * 0.5;
				pi.x += fx;
				pi.y += fy;
				pj.x -= fx;
				pj.y -= fy;
			}

			const WR = this.physW - WALL,
				HB = this.physH - WALL;
			for (const p of blob.ring) {
				if (p.x < WALL) {
					p.x = WALL;
					if (p.px < WALL) p.px = WALL;
				}
				if (p.x > WR) {
					p.x = WR;
					if (p.px > WR) p.px = WR;
				}
				if (p.y < WALL) {
					p.y = WALL;
					if (p.py < WALL) p.py = WALL;
				}
				if (p.y > HB) {
					p.y = HB;
					if (p.py > HB) p.py = HB;
				}
			}
		}

		// Maintain speed
		let vx = 0,
			vy = 0;
		for (const p of blob.ring) {
			vx += p.x - p.px;
			vy += p.y - p.py;
		}
		vx /= N;
		vy /= N;
		const cs = Math.sqrt(vx * vx + vy * vy);
		if (cs > 0.0001) {
			const dv = (this.speed / cs - 1) * 0.03;
			for (const p of blob.ring) {
				p.px -= vx * dv;
				p.py -= vy * dv;
			}
		} else {
			const a = Math.random() * Math.PI * 2;
			for (const p of blob.ring) {
				p.px -= Math.cos(a) * this.speed * 0.5;
				p.py -= Math.sin(a) * this.speed * 0.5;
			}
		}

		// Centroid + extents
		blob.cx = 0;
		blob.cy = 0;
		for (const p of blob.ring) {
			blob.cx += p.x;
			blob.cy += p.y;
		}
		blob.cx /= N;
		blob.cy /= N;
		blob.maxDX = 0;
		blob.maxDY = 0;
		for (const p of blob.ring) {
			blob.maxDX = Math.max(blob.maxDX, Math.abs(p.x - blob.cx));
			blob.maxDY = Math.max(blob.maxDY, Math.abs(p.y - blob.cy));
		}
	}

	private collideBlobs() {
		for (let i = 0; i < this.blobs.length; i++) {
			for (let j = i + 1; j < this.blobs.length; j++) {
				const a = this.blobs[i],
					b = this.blobs[j];
				const dx = b.cx - a.cx,
					dy = b.cy - a.cy;
				const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
				const minD = a.avgRadius + b.avgRadius;
				if (dist >= minD) continue;
				const nx = dx / dist,
					ny = dy / dist;
				const push = (minD - dist) * 0.08;
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

	/* ── merge logic ───────────────────────────────────────── */

	private updateMerges() {
		const active = new Set<string>();
		const merged = new Set<number>();

		for (let i = 0; i < this.blobs.length; i++) {
			for (let j = i + 1; j < this.blobs.length; j++) {
				const a = this.blobs[i],
					b = this.blobs[j];
				const dx = b.cx - a.cx,
					dy = b.cy - a.cy;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < (a.avgRadius + b.avgRadius) * MERGE_OVERLAP) {
					const key = `${i},${j}`;
					active.add(key);
					if (!this.merges.has(key)) {
						this.merges.set(key, { hostIdx: Math.random() < 0.5 ? i : j });
					}
					const m = this.merges.get(key)!;
					const guestIdx = m.hostIdx === i ? j : i;
					const hostColor = this.blobs[m.hostIdx].baseColor;
					const guest = this.blobs[guestIdx];
					merged.add(guestIdx);
					for (let c = 0; c < 3; c++) {
						guest.renderColor[c] += (hostColor[c] - guest.renderColor[c]) * COLOR_LERP_SPEED;
					}
				}
			}
		}

		for (const k of this.merges.keys()) {
			if (!active.has(k)) this.merges.delete(k);
		}

		for (let i = 0; i < this.blobs.length; i++) {
			if (!merged.has(i)) {
				const bl = this.blobs[i];
				for (let c = 0; c < 3; c++) {
					bl.renderColor[c] += (bl.baseColor[c] - bl.renderColor[c]) * COLOR_LERP_SPEED;
				}
			}
		}
	}

	/* ── texture upload ────────────────────────────────────── */

	private syncTexture() {
		for (let i = 0; i < this.blobs.length; i++) {
			const b = this.blobs[i];
			const p = i * 4; // row 0
			this.blobData[p] = b.cx;
			this.blobData[p + 1] = b.cy;
			this.blobData[p + 2] = b.maxDX;
			this.blobData[p + 3] = b.maxDY;

			const c = MAX_BLOBS * 4 + i * 4; // row 1
			this.blobData[c] = b.renderColor[0] / 255;
			this.blobData[c + 1] = b.renderColor[1] / 255;
			this.blobData[c + 2] = b.renderColor[2] / 255;
			this.blobData[c + 3] = 1;
		}
		// Zero out unused slots
		for (let i = this.blobs.length; i < MAX_BLOBS; i++) {
			const p = i * 4;
			this.blobData[p] = -9999;
			this.blobData[p + 3] = 0;
			const c = MAX_BLOBS * 4 + i * 4;
			this.blobData[c + 3] = 0;
		}
		this.blobTexture.needsUpdate = true;
		this.uniforms.u_numBlobs.value = this.blobs.length;
	}

	/* ── lifecycle ─────────────────────────────────────────── */

	start = (params: RendererParams) => {
		const { container } = params;
		container.style.aspectRatio = '9 / 16';
		container.style.maxHeight = '90vh';
		container.style.margin = '0 auto';
		container.style.width = 'auto';

		super.start(params);

		// Physics runs at fixed resolution, shader maps via UV (DPR-independent)
		this.physW = 1080;
		this.physH = 1920;
		this.uniforms.u_physSize.value.set(this.physW, this.physH);
		this.initBlobs();
	};

	onRender = () => {
		for (const b of this.blobs) this.stepBlob(b);
		this.collideBlobs();

		// Final wall clamp after all forces (collision push + speed maintenance can escape)
		const WR = this.physW - WALL,
			HB = this.physH - WALL;
		for (const b of this.blobs) {
			const N = b.ring.length;
			for (const p of b.ring) {
				if (p.x < WALL) {
					p.x = WALL;
					if (p.px < WALL) p.px = WALL;
				}
				if (p.x > WR) {
					p.x = WR;
					if (p.px > WR) p.px = WR;
				}
				if (p.y < WALL) {
					p.y = WALL;
					if (p.py < WALL) p.py = WALL;
				}
				if (p.y > HB) {
					p.y = HB;
					if (p.py > HB) p.py = HB;
				}
			}
			// Recompute centroid + extents after final clamp
			b.cx = 0;
			b.cy = 0;
			for (const p of b.ring) {
				b.cx += p.x;
				b.cy += p.y;
			}
			b.cx /= N;
			b.cy /= N;
			b.maxDX = 0;
			b.maxDY = 0;
			for (const p of b.ring) {
				b.maxDX = Math.max(b.maxDX, Math.abs(p.x - b.cx));
				b.maxDY = Math.max(b.maxDY, Math.abs(p.y - b.cy));
			}
		}

		this.updateMerges();
		this.syncTexture();
		super.onRender();
	};

	stop = () => {
		super.stop();
		this.blobTexture.dispose();
	};

	getParams = (): ContentParams => this.params;

	setParams = (p: ContentParams) => {
		this.params = p;
		const byId = paramsById(p);
		const val = (id: string) => byId[id]?.value as number;

		const newCount = val('blobs');
		const newRing = val('ring-nodes');
		const needsRebuild = newCount !== this.numBlobs || newRing !== this.numRing;

		this.speed = val('speed');
		this.springK = val('spring-k');
		this.pressureK = val('pressure');
		this.damping = val('damping');
		this.numBlobs = newCount;
		this.numRing = newRing;
		this.uniforms.u_showMesh.value = byId['show-mesh']?.value === 'On' ? 1.0 : 0.0;
		this.uniforms.u_colorBleed.value = val('merge-strength') || 2.2;

		if (needsRebuild) this.initBlobs();
	};

	/* ── shaders ────────────────────────────────────────────── */

	protected getVertexShader = () => `
		varying vec2 vUv;
		void main() {
			gl_Position = vec4(position, 1.0);
			vUv = position.xy * 0.5 + 0.5;
		}
	`;

	getFragmentShader = () => `
		#ifdef GL_ES
		precision highp float;
		#endif

		varying vec2 vUv;
		uniform float u_time;
		uniform sampler2D u_blobData;
		uniform int u_numBlobs;
		uniform vec2 u_physSize;
		uniform float u_showMesh;
		uniform float u_colorBleed;


		void main() {
			// vUv is 0..1 across the quad — completely DPR-independent
			// Map to physics space with Y flipped (vUv.y=0 is bottom, physics y=0 is top)
			vec2 st = vec2(vUv.x * u_physSize.x, (1.0 - vUv.y) * u_physSize.y);

			vec3 bgColor = vec3(0.965, 0.945, 0.922);

			float totalField = 0.0;
			vec3 weightedColor = vec3(0.0);

			for (int i = 0; i < ${MAX_BLOBS}; i++) {
				if (i >= u_numBlobs) break;

				float u = (float(i) + 0.5) / ${MAX_BLOBS}.0;
				vec4 posData = texture2D(u_blobData, vec2(u, 0.25));
				vec4 colData = texture2D(u_blobData, vec2(u, 0.75));

				vec2 blobPos = posData.xy;
				vec2 radii = posData.zw * u_colorBleed;

				if (radii.x < 1.0 || radii.y < 1.0) continue;

				vec2 diff = st - blobPos;
				vec2 norm = diff / radii;
				float dist2 = dot(norm, norm);

				float field = exp(-dist2 * 2.8);

				totalField += field;
				weightedColor += colData.rgb * field;
			}

			vec3 blobColor = weightedColor / max(totalField, 0.001);

			float alpha = smoothstep(0.08, 0.55, totalField);

			vec3 color = mix(bgColor, blobColor, alpha);

			// Mesh overlay: show centroid dots and physics radius outlines
			if (u_showMesh > 0.5) {
				for (int i = 0; i < ${MAX_BLOBS}; i++) {
					if (i >= u_numBlobs) break;
					float u = (float(i) + 0.5) / ${MAX_BLOBS}.0;
					vec4 pd = texture2D(u_blobData, vec2(u, 0.25));
					vec2 bp = pd.xy;
					vec2 rd = pd.zw;
					float d = length(st - bp);
					// Centroid dot
					if (d < 5.0) color = vec3(1.0, 0.3, 0.0);
					// Physics radius outline
					vec2 nr = (st - bp) / max(rd, vec2(1.0));
					float er = length(nr);
					if (abs(er - 1.0) < 0.03) color = mix(color, vec3(1.0, 0.3, 0.0), 0.6);
				}
			}

			gl_FragColor = vec4(color, 1.0);
		}
	`;
}

/* ── post export ───────────────────────────────────────────── */

const post: Post = {
	summary: {
		id: 'blob-convergence',
		tags: ['animation', 'webgl', 'soft-body'],
		title: 'Blob Convergence',
		timestamp: new Date(2026, 3, 5),
		type: PostType.experiment3d,
		isHidden: false,
		collaborators: [{ name: 'Eva Warren', role: 'Art Direction', url: 'https://evamarie.studio' }]
	},
	content: () => new BlobConvergenceContent(),
	params: defaultParams
};

export default post;
