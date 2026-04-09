import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import {
	AmbientLight,
	BoxGeometry,
	CanvasTexture,
	Color,
	DoubleSide,
	Mesh,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	PlaneGeometry,
	PointLight,
	Scene,
	SpotLight,
	Vector2
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Draw a celtic knot with floral flourishes onto a canvas and return it as a texture. */
function createEngravingTexture(width: number, height: number): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	// Black background = clear glass (roughness 0), white = engraved (roughness 1)
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = '#fff';
	ctx.fillStyle = '#fff';
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	const cx = width / 2;
	const cy = height / 2;

	// --- Outer decorative border ---
	drawBorder(ctx, width, height);

	// --- Celtic knot in the center ---
	drawCelticKnot(ctx, cx, cy, Math.min(width, height) * 0.22);

	// --- Floral corner flourishes ---
	const margin = Math.min(width, height) * 0.18;
	drawFlourish(ctx, margin, margin, 1, 1);
	drawFlourish(ctx, width - margin, margin, -1, 1);
	drawFlourish(ctx, margin, height - margin, 1, -1);
	drawFlourish(ctx, width - margin, height - margin, -1, -1);

	// --- Side floral sprigs ---
	drawSprig(ctx, cx, margin * 0.85, Math.min(width, height) * 0.1, 0);
	drawSprig(ctx, cx, height - margin * 0.85, Math.min(width, height) * 0.1, Math.PI);
	drawSprig(ctx, margin * 0.85, cy, Math.min(width, height) * 0.1, -Math.PI / 2);
	drawSprig(ctx, width - margin * 0.85, cy, Math.min(width, height) * 0.1, Math.PI / 2);

	// --- Title text (bar mirror style) ---
	const fontSize = Math.floor(width * 0.06);
	ctx.font = `italic bold ${fontSize}px Georgia, serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#fff';
	ctx.fillText('The Glass & Mirror', cx, cy - Math.min(width, height) * 0.34);

	const fontSize2 = Math.floor(width * 0.035);
	ctx.font = `bold small-caps ${fontSize2}px Georgia, serif`;
	ctx.fillText('Est. 2026', cx, cy + Math.min(width, height) * 0.34);

	// --- Post-processing pipeline for realistic hand-engraved look ---

	// 1. Slight blur first to anti-alias the raw drawing
	applyBlur(ctx, width, height, 1.5);

	// 2. Hand-wobble: subtle displacement — skilled craftsperson, steady hand,
	//    but still human (not CNC-perfect)
	applyHandWobble(ctx, width, height, 2.5, 50);

	// 3. Another blur to soften the wobbled edges
	applyBlur(ctx, width, height, 2);

	// 4. Compute V-groove profile: bright beveled edges, darker valley center.
	//    This reshapes flat white areas into concave grooves.
	applyVGrooveProfile(ctx, width, height);

	// 5. Grain/noise for rough frosted texture with uneven pressure
	applyEngravingGrain(ctx, width, height, 0.45);

	const texture = new CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

function drawBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
	const inset = Math.min(w, h) * 0.08;
	const cornerRadius = Math.min(w, h) * 0.04;
	const lineWidth = Math.min(w, h) * 0.016;

	// Double border
	for (const offset of [0, lineWidth * 2.5]) {
		const i = inset + offset;
		ctx.lineWidth = lineWidth;
		ctx.beginPath();
		ctx.moveTo(i + cornerRadius, i);
		ctx.lineTo(w - i - cornerRadius, i);
		ctx.quadraticCurveTo(w - i, i, w - i, i + cornerRadius);
		ctx.lineTo(w - i, h - i - cornerRadius);
		ctx.quadraticCurveTo(w - i, h - i, w - i - cornerRadius, h - i);
		ctx.lineTo(i + cornerRadius, h - i);
		ctx.quadraticCurveTo(i, h - i, i, h - i - cornerRadius);
		ctx.lineTo(i, i + cornerRadius);
		ctx.quadraticCurveTo(i, i, i + cornerRadius, i);
		ctx.stroke();
	}
}

/** Draw a classic four-loop celtic knot with over/under weaving. */
function drawCelticKnot(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
	const bandWidth = radius * 0.3;
	ctx.lineWidth = bandWidth;
	ctx.strokeStyle = '#fff';

	// Draw the four interlocking loops of a quaternary celtic knot
	const loopCount = 4;
	const loopRadius = radius * 0.55;
	const segments = 200;

	// First pass: draw the full knot paths
	for (let loop = 0; loop < loopCount; loop++) {
		const baseAngle = (loop * Math.PI * 2) / loopCount;
		ctx.beginPath();
		for (let i = 0; i <= segments; i++) {
			const t = (i / segments) * Math.PI * 2;
			// Lissajous-like pattern for knot crossings
			const x =
				cx + Math.cos(t + baseAngle) * loopRadius + Math.cos(t * 2 + baseAngle) * loopRadius * 0.45;
			const y =
				cy + Math.sin(t + baseAngle) * loopRadius + Math.sin(t * 2 + baseAngle) * loopRadius * 0.45;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}

	// Second pass: create the over/under illusion by cutting gaps
	ctx.globalCompositeOperation = 'destination-out';
	const gapWidth = bandWidth * 1.6;
	ctx.lineWidth = gapWidth;

	for (let loop = 0; loop < loopCount; loop++) {
		const baseAngle = (loop * Math.PI * 2) / loopCount;
		// Draw short gap segments at crossing points
		for (let crossing = 0; crossing < 4; crossing++) {
			const tCross = (crossing / 4) * Math.PI * 2 + Math.PI / 8;
			ctx.beginPath();
			for (let i = -3; i <= 3; i++) {
				const t = tCross + (i / segments) * Math.PI * 2;
				const x =
					cx +
					Math.cos(t + baseAngle) * loopRadius +
					Math.cos(t * 2 + baseAngle) * loopRadius * 0.45;
				const y =
					cy +
					Math.sin(t + baseAngle) * loopRadius +
					Math.sin(t * 2 + baseAngle) * loopRadius * 0.45;
				if (i === -3) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}
	}

	// Third pass: re-draw the "over" strands on top of the gaps
	ctx.globalCompositeOperation = 'source-over';
	ctx.lineWidth = bandWidth * 0.6;
	ctx.strokeStyle = '#fff';

	for (let loop = 0; loop < loopCount; loop++) {
		const baseAngle = (loop * Math.PI * 2) / loopCount + Math.PI / loopCount;
		for (let crossing = 0; crossing < 4; crossing++) {
			const tCross = (crossing / 4) * Math.PI * 2 + Math.PI / 8;
			ctx.beginPath();
			for (let i = -3; i <= 3; i++) {
				const t = tCross + (i / segments) * Math.PI * 2;
				const x =
					cx +
					Math.cos(t + baseAngle) * loopRadius +
					Math.cos(t * 2 + baseAngle) * loopRadius * 0.45;
				const y =
					cy +
					Math.sin(t + baseAngle) * loopRadius +
					Math.sin(t * 2 + baseAngle) * loopRadius * 0.45;
				if (i === -3) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}
	}

	// Outer ring around the knot
	ctx.lineWidth = bandWidth * 0.5;
	ctx.globalCompositeOperation = 'source-over';
	ctx.beginPath();
	ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
	ctx.stroke();

	ctx.beginPath();
	ctx.arc(cx, cy, radius * 0.98, 0, Math.PI * 2);
	ctx.lineWidth = bandWidth * 0.25;
	ctx.stroke();
}

/** Draw a floral flourish — a curling vine with leaves. */
function drawFlourish(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(dx, dy);

	const scale = ctx.canvas.width * 0.001;
	ctx.lineWidth = 5 * scale;
	ctx.strokeStyle = '#fff';
	ctx.fillStyle = '#fff';

	// Main curling vine
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.bezierCurveTo(30 * scale, -10 * scale, 50 * scale, -40 * scale, 35 * scale, -65 * scale);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.bezierCurveTo(-10 * scale, 30 * scale, -40 * scale, 50 * scale, -65 * scale, 35 * scale);
	ctx.stroke();

	// Spiral curl at ends
	drawSpiral(ctx, 35 * scale, -65 * scale, 12 * scale, 1);
	drawSpiral(ctx, -65 * scale, 35 * scale, 12 * scale, -1);

	// Leaves along the vine
	drawLeaf(ctx, 20 * scale, -25 * scale, -0.4, 10 * scale);
	drawLeaf(ctx, 40 * scale, -45 * scale, -0.8, 8 * scale);
	drawLeaf(ctx, -25 * scale, 20 * scale, Math.PI / 2 + 0.4, 10 * scale);
	drawLeaf(ctx, -45 * scale, 40 * scale, Math.PI / 2 + 0.8, 8 * scale);

	// Small dots / berries
	for (const [bx, by] of [
		[12, -8],
		[8, -18],
		[-8, 12],
		[-18, 8]
	] as const) {
		ctx.beginPath();
		ctx.arc(bx * scale, by * scale, 3.5 * scale, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

function drawSpiral(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	dir: number
) {
	ctx.beginPath();
	const turns = 1.5;
	const steps = 40;
	for (let i = 0; i <= steps; i++) {
		const t = (i / steps) * turns * Math.PI * 2;
		const r = size * (1 - i / steps);
		const px = x + Math.cos(t * dir) * r;
		const py = y + Math.sin(t * dir) * r;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.stroke();
}

function drawLeaf(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	angle: number,
	size: number
) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);

	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.bezierCurveTo(size * 0.5, -size * 0.6, size, -size * 0.3, size * 1.2, 0);
	ctx.bezierCurveTo(size, size * 0.3, size * 0.5, size * 0.6, 0, 0);
	ctx.fill();

	// Leaf vein
	ctx.lineWidth = size * 0.08;
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(size * 1.1, 0);
	ctx.strokeStyle = '#000';
	ctx.stroke();
	ctx.strokeStyle = '#fff';

	ctx.restore();
}

/** Small floral sprig for the sides. */
function drawSprig(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	angle: number
) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);

	const s = size;
	ctx.lineWidth = s * 0.12;
	ctx.strokeStyle = '#fff';
	ctx.fillStyle = '#fff';

	// Central stem
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(0, -s);
	ctx.stroke();

	// Side branches with leaves
	for (const dir of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(0, -s * 0.3);
		ctx.quadraticCurveTo(dir * s * 0.3, -s * 0.5, dir * s * 0.4, -s * 0.7);
		ctx.stroke();
		drawLeaf(ctx, dir * s * 0.35, -s * 0.65, dir * 0.5, s * 0.2);
	}

	// Top flower bud
	const petalCount = 5;
	for (let i = 0; i < petalCount; i++) {
		const a = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
		const px = Math.cos(a) * s * 0.15;
		const py = -s + Math.sin(a) * s * 0.15;
		ctx.beginPath();
		ctx.ellipse(px, py, s * 0.08, s * 0.14, a, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.beginPath();
	ctx.arc(0, -s, s * 0.05, 0, Math.PI * 2);
	ctx.fillStyle = '#000';
	ctx.fill();
	ctx.fillStyle = '#fff';

	ctx.restore();
}

/** Simple value noise for hand-wobble displacement. */
function valueNoise(x: number, y: number, seed: number): number {
	const n = Math.sin(x * 127.1 + y * 311.7 + seed * 53.3) * 43758.5453;
	return n - Math.floor(n);
}

/** Smoothed noise via bilinear interpolation of value noise. */
function smoothNoise(x: number, y: number, seed: number): number {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	// Smoothstep
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);

	const n00 = valueNoise(ix, iy, seed);
	const n10 = valueNoise(ix + 1, iy, seed);
	const n01 = valueNoise(ix, iy + 1, seed);
	const n11 = valueNoise(ix + 1, iy + 1, seed);

	const nx0 = n00 + (n10 - n00) * sx;
	const nx1 = n01 + (n11 - n01) * sx;
	return nx0 + (nx1 - nx0) * sy;
}

/**
 * Displace pixels using low-frequency noise to simulate a hand guiding a
 * dremel — wobbly, organic, slightly irregular lines.
 * @param amplitude Max pixel displacement
 * @param scale Noise frequency (larger = gentler wobble)
 */
function applyHandWobble(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	amplitude: number,
	scale: number
) {
	const src = ctx.getImageData(0, 0, w, h);
	const dst = ctx.createImageData(w, h);
	const sd = src.data;
	const dd = dst.data;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			// Multi-octave noise for natural hand shake
			const dx =
				(smoothNoise(x / scale, y / scale, 0) - 0.5) * amplitude +
				(smoothNoise(x / (scale * 0.5), y / (scale * 0.5), 100) - 0.5) * amplitude * 0.5;
			const dy =
				(smoothNoise(x / scale, y / scale, 50) - 0.5) * amplitude +
				(smoothNoise(x / (scale * 0.5), y / (scale * 0.5), 150) - 0.5) * amplitude * 0.5;

			const sx = Math.max(0, Math.min(w - 1, Math.round(x + dx)));
			const sy = Math.max(0, Math.min(h - 1, Math.round(y + dy)));
			const si = (sy * w + sx) * 4;
			const di = (y * w + x) * 4;
			dd[di] = sd[si];
			dd[di + 1] = sd[si + 1];
			dd[di + 2] = sd[si + 2];
			dd[di + 3] = sd[si + 3];
		}
	}
	ctx.putImageData(dst, 0, 0);
}

/**
 * Transform flat white engraved areas into a concave V-groove profile.
 * Computes an approximate distance-to-edge, then maps it so the bevel edges
 * are bright (where the angled walls catch light) and the valley center is
 * darker. This gives the sense of a V-shaped cut.
 */
function applyVGrooveProfile(ctx: CanvasRenderingContext2D, w: number, h: number) {
	const imgData = ctx.getImageData(0, 0, w, h);
	const d = imgData.data;

	// Build a brightness array and approximate distance-to-edge via iterative erosion
	const brightness = new Float32Array(w * h);
	const dist = new Float32Array(w * h);

	for (let i = 0; i < w * h; i++) {
		brightness[i] = d[i * 4] / 255;
	}

	// Chamfer distance transform: approximate distance to nearest black pixel
	// Forward pass
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (brightness[i] < 0.1) {
				dist[i] = 0;
			} else {
				let d = 1000;
				if (x > 0) d = Math.min(d, dist[i - 1] + 1);
				if (y > 0) d = Math.min(d, dist[(y - 1) * w + x] + 1);
				if (x > 0 && y > 0) d = Math.min(d, dist[(y - 1) * w + (x - 1)] + 1.414);
				if (x < w - 1 && y > 0) d = Math.min(d, dist[(y - 1) * w + (x + 1)] + 1.414);
				dist[i] = d;
			}
		}
	}
	// Backward pass
	for (let y = h - 1; y >= 0; y--) {
		for (let x = w - 1; x >= 0; x--) {
			const i = y * w + x;
			if (x < w - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
			if (y < h - 1) dist[i] = Math.min(dist[i], dist[(y + 1) * w + x] + 1);
			if (x < w - 1 && y < h - 1) dist[i] = Math.min(dist[i], dist[(y + 1) * w + (x + 1)] + 1.414);
			if (x > 0 && y < h - 1) dist[i] = Math.min(dist[i], dist[(y + 1) * w + (x - 1)] + 1.414);
		}
	}

	// Apply V-groove profile using absolute pixel distance (not normalized).
	// This way thin lines and thick areas both get a proper V cross-section.
	// The groove depth is defined in pixels: bevels within ~6px of edge are bright,
	// everything deeper falls into the dark valley.
	const grooveDepthPx = 8; // how many pixels deep the bevel extends

	for (let i = 0; i < w * h; i++) {
		if (brightness[i] < 0.1) continue;

		const d_px = dist[i]; // absolute distance from edge in pixels

		// V-profile: steep bright bevel at edges, dark valley in center
		// Edge bevel: peaks at ~1-2px from edge, falls off sharply
		const bevelPeak = Math.min(d_px / 2, 1) * Math.exp(-d_px / (grooveDepthPx * 0.4));
		// Valley floor: very dim — this is the deepest part of the V
		const valleyFloor = 0.08;
		const profile = Math.max(bevelPeak, valleyFloor);

		// Subtle uneven pressure (skilled but human)
		const px = (i % w) / w;
		const py = Math.floor(i / w) / h;
		const pressure = 0.85 + smoothNoise(px * 6, py * 6, 200) * 0.3;

		const v = Math.max(0, Math.min(255, brightness[i] * profile * pressure * 255));
		const idx = i * 4;
		d[idx] = v;
		d[idx + 1] = v;
		d[idx + 2] = v;
	}
	ctx.putImageData(imgData, 0, 0);
}

/**
 * Add granular noise to engraved (white) areas to simulate the rough frosted
 * surface of real glass engraving. Leaves black (clear) areas untouched.
 */
function applyEngravingGrain(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	intensity: number = 0.5
) {
	const imgData = ctx.getImageData(0, 0, w, h);
	const d = imgData.data;
	for (let i = 0; i < d.length; i += 4) {
		const brightness = d[i];
		if (brightness > 5) {
			const noise = (Math.random() - 0.5) * 255 * intensity;
			const v = Math.max(0, Math.min(255, brightness + noise));
			d[i] = v;
			d[i + 1] = v;
			d[i + 2] = v;
		}
	}
	ctx.putImageData(imgData, 0, 0);
}

/** Simple box blur. */
function applyBlur(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number) {
	ctx.filter = `blur(${radius}px)`;
	ctx.drawImage(ctx.canvas, 0, 0);
	ctx.filter = 'none';
}

/**
 * Create a V-groove normal map from the engraving texture.
 * Uses the distance-to-edge to generate angled normals that represent the
 * sloped walls of a concave V-shaped groove — steep at the edges, flatter
 * in the valley. Also adds micro-roughness noise for the hand-ground look.
 */
function createNormalMapFromCanvas(source: HTMLCanvasElement, strength: number = 3): CanvasTexture {
	const w = source.width;
	const h = source.height;
	const srcCtx = source.getContext('2d')!;
	const srcData = srcCtx.getImageData(0, 0, w, h).data;

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	const imgData = ctx.createImageData(w, h);
	const dst = imgData.data;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const idx = (y * w + x) * 4;

			const getHeight = (px: number, py: number) => {
				const cx = Math.max(0, Math.min(w - 1, px));
				const cy = Math.max(0, Math.min(h - 1, py));
				return srcData[(cy * w + cx) * 4] / 255;
			};

			// Sample at three radii for aggressive V-groove normals
			const r1 = 1;
			const r2 = 3;
			const r3 = 6;

			const gx1 = (getHeight(x - r1, y) - getHeight(x + r1, y)) * strength * 2.0;
			const gy1 = (getHeight(x, y - r1) - getHeight(x, y + r1)) * strength * 2.0;
			const gx2 = (getHeight(x - r2, y) - getHeight(x + r2, y)) * strength * 1.0;
			const gy2 = (getHeight(x, y - r2) - getHeight(x, y + r2)) * strength * 1.0;
			const gx3 = (getHeight(x - r3, y) - getHeight(x + r3, y)) * strength * 0.4;
			const gy3 = (getHeight(x, y - r3) - getHeight(x, y + r3)) * strength * 0.4;

			let nx = gx1 + gx2 + gx3;
			let ny = gy1 + gy2 + gy3;

			// Micro-roughness noise for hand-ground surface texture
			const current = getHeight(x, y);
			if (current > 0.03) {
				const micro = 0.4;
				nx += (Math.random() - 0.5) * micro;
				ny += (Math.random() - 0.5) * micro;
			}

			const nz = 1.0;
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

			dst[idx] = ((nx / len) * 0.5 + 0.5) * 255;
			dst[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
			dst[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
			dst[idx + 3] = 255;
		}
	}

	ctx.putImageData(imgData, 0, 0);
	const texture = new CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

class GlassEngravingContent implements ExperimentContent3D {
	private scene: Scene | undefined;
	private controls: OrbitControls | undefined;
	private animationTime = 0;
	private backLight: PointLight | undefined;
	private edgeLights: PointLight[] = [];

	start = ({ scene, camera, renderer, container }: RendererParams) => {
		this.scene = scene;
		scene.background = new Color(0x1a1a2e);

		renderer.toneMappingExposure = 1.0;
		renderer.shadowMap.enabled = true;

		// Camera
		camera.position.set(0, 0, 4.5);
		camera.lookAt(0, 0, 0);

		// OrbitControls
		this.controls = new OrbitControls(camera, container);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.minDistance = 2;
		this.controls.maxDistance = 10;
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = 0.8;

		// --- Create engraving texture ---
		const texSize = 1024;
		const engravingTexture = createEngravingTexture(texSize, texSize);
		const normalMap = createNormalMapFromCanvas(engravingTexture.image as HTMLCanvasElement, 8);

		// --- Glass panel: dark tinted glass with glowing engraved lines ---
		// The key insight: instead of relying on roughness-based transmission contrast
		// (which is subtle), we use the engraving as an emissive map so the etched lines
		// glow warmly against the dark glass — like a real backlit bar sign.
		const glassGeometry = new BoxGeometry(3, 3, 0.08, 1, 1, 1);
		const glassMaterial = new MeshPhysicalMaterial({
			color: new Color(0x556655),
			metalness: 0.0,
			roughness: 0.15,
			transmission: 0.4,
			ior: 1.52,
			transparent: true,
			opacity: 1,
			side: DoubleSide,

			// The engraving texture drives roughness (frosted in grooves)
			roughnessMap: engravingTexture,

			// Engraved lines glow — this is what makes the design visible
			emissive: new Color(0xffeedd),
			emissiveMap: engravingTexture,
			emissiveIntensity: 0.8,

			// Normal map gives depth to the grooves
			normalMap: normalMap,
			normalScale: new Vector2(1.2, 1.2),

			envMapIntensity: 0.5,
			clearcoat: 0.5,
			clearcoatRoughness: 0.05
		});
		// Set properties not in the type defs for this Three.js version
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mat = glassMaterial as any;
		mat.thickness = 0.8;
		mat.specularColor = new Color(0xffffff);
		mat.specularIntensity = 1.0;

		const glassMesh = new Mesh(glassGeometry, glassMaterial);
		scene.add(glassMesh);

		// --- Lighting ---

		// Low ambient so the emissive engraving dominates
		const ambient = new AmbientLight(0x404060, 0.3);
		scene.add(ambient);

		// Backlight — reinforces the glow through the glass
		this.backLight = new PointLight(0xffeedd, 4, 12);
		this.backLight.position.set(0, 0, -1.5);
		scene.add(this.backLight);

		// Front key light — specular highlights on the glass surface
		const frontLight = new PointLight(0xffffff, 1.5, 15);
		frontLight.position.set(2, 2, 5);
		scene.add(frontLight);

		// Colored edge lights for bar ambiance
		const edgeLeft = new PointLight(0x4488ff, 2, 10);
		edgeLeft.position.set(-3, 0, 0.5);
		scene.add(edgeLeft);
		this.edgeLights.push(edgeLeft);

		const edgeRight = new PointLight(0xff8844, 2, 10);
		edgeRight.position.set(3, 0, 0.5);
		scene.add(edgeRight);
		this.edgeLights.push(edgeRight);

		// Top rim light
		const topLight = new PointLight(0xaaccff, 1.5, 10);
		topLight.position.set(0, 3, 1);
		scene.add(topLight);

		// Bottom warm light
		const bottomLight = new PointLight(0xffaa66, 1, 8);
		bottomLight.position.set(0, -3, 0.5);
		scene.add(bottomLight);

		// --- Dark backdrop ---
		const backdropGeom = new PlaneGeometry(12, 12);
		const backdropMat = new MeshStandardMaterial({
			color: 0x0a0a15,
			roughness: 0.9,
			metalness: 0.1
		});
		const backdrop = new Mesh(backdropGeom, backdropMat);
		backdrop.position.z = -3;
		scene.add(backdrop);
	};

	onRender = () => {
		this.animationTime += 0.005;
		this.controls?.update();

		// Gently pulse the backlight
		if (this.backLight) {
			this.backLight.intensity = 4 + Math.sin(this.animationTime * 2) * 0.8;
		}

		// Subtle sway on edge lights
		if (this.edgeLights.length >= 2) {
			this.edgeLights[0].position.y = Math.sin(this.animationTime * 1.3) * 0.5;
			this.edgeLights[1].position.y = Math.cos(this.animationTime * 1.1) * 0.5;
		}
	};

	stop = () => {
		this.controls?.dispose();
		if (this.scene) {
			while (this.scene.children.length > 0) {
				this.scene.remove(this.scene.children[0]);
			}
		}
	};
}

const post: Post = {
	summary: {
		type: PostType.experiment3d,
		id: 'glass-engraving',
		title: 'Glass Engraving',
		subtitle: 'Simulating engraved glass with physically-based rendering',
		timestamp: new Date(2026, 3, 9),
		tags: ['3d', 'glass', 'shader', 'pbr']
	},
	content: () => new GlassEngravingContent()
};

export default post;
