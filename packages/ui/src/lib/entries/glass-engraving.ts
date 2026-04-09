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
	const fontSize = Math.floor(width * 0.055);
	ctx.font = `italic ${fontSize}px Georgia, serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#fff';
	ctx.fillText('The Glass & Mirror', cx, cy - Math.min(width, height) * 0.34);

	const fontSize2 = Math.floor(width * 0.03);
	ctx.font = `small-caps ${fontSize2}px Georgia, serif`;
	ctx.fillText('Est. 2026', cx, cy + Math.min(width, height) * 0.34);

	// Soften the texture with a slight blur for more realistic engraving
	applyBlur(ctx, width, height, 1.5);

	const texture = new CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

function drawBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
	const inset = Math.min(w, h) * 0.08;
	const cornerRadius = Math.min(w, h) * 0.04;
	const lineWidth = Math.min(w, h) * 0.008;

	// Double border
	for (const offset of [0, lineWidth * 3]) {
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
	const bandWidth = radius * 0.18;
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
	ctx.lineWidth = bandWidth * 0.4;
	ctx.globalCompositeOperation = 'source-over';
	ctx.beginPath();
	ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
	ctx.stroke();

	ctx.beginPath();
	ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
	ctx.lineWidth = bandWidth * 0.15;
	ctx.stroke();
}

/** Draw a floral flourish — a curling vine with leaves. */
function drawFlourish(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(dx, dy);

	const scale = ctx.canvas.width * 0.001;
	ctx.lineWidth = 2.5 * scale;
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
		ctx.arc(bx * scale, by * scale, 2 * scale, 0, Math.PI * 2);
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
	ctx.lineWidth = s * 0.06;
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

/** Simple box blur. */
function applyBlur(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number) {
	ctx.filter = `blur(${radius}px)`;
	ctx.drawImage(ctx.canvas, 0, 0);
	ctx.filter = 'none';
}

/** Create a normal map from the engraving texture to give depth to the grooves. */
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

			// Sample neighboring heights
			const getHeight = (px: number, py: number) => {
				const cx = Math.max(0, Math.min(w - 1, px));
				const cy = Math.max(0, Math.min(h - 1, py));
				return srcData[(cy * w + cx) * 4] / 255;
			};

			const left = getHeight(x - 1, y);
			const right = getHeight(x + 1, y);
			const up = getHeight(x, y - 1);
			const down = getHeight(x, y + 1);

			// Compute normal from height differences
			const nx = (left - right) * strength;
			const ny = (up - down) * strength;
			const nz = 1.0;
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

			// Encode normal as RGB (tangent space: 0.5 = zero, 0 = -1, 1 = +1)
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
		const normalMap = createNormalMapFromCanvas(engravingTexture.image as HTMLCanvasElement, 4);

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
			normalScale: new Vector2(0.4, 0.4),

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
