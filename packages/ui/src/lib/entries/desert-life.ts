import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import {
	BoxGeometry,
	Color,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	TextureLoader
} from 'three';
import { numberParam, paramsById, type ContentParams } from '$lib/content-params';

import skyUrl from '$lib/assets/images/desert life/src files/desert life-sky.png';

import cloudsUrl from '$lib/assets/images/desert life/src files/desert life-clouds.png';
import cactusShadowUrl from '$lib/assets/images/desert life/src files/desert life-cactus shadow.png';
import cactusUrl from '$lib/assets/images/desert life/src files/desert life-cactus.png';

// ─── Shaders ─────────────────────────────────────────────────────────────────

// Fullscreen-quad vertex shader: positions the geometry directly in NDC
// (normalized device coordinates), bypassing the camera entirely.
// This makes the plane always fill the screen regardless of camera position.
const BG_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

// Dithered background layer (sky, ground): applies a checkerboard lightening
// pattern in screen space, so block size stays consistent regardless of depth.
const DITHER_FRAG = /* glsl */`
uniform sampler2D u_texture;
uniform float u_pixelSize;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(u_texture, vUv);
  if (color.a < 0.01) discard;

  vec2 blockId = floor(gl_FragCoord.xy / u_pixelSize);
  bool isLight = mod(blockId.x + blockId.y, 2.0) < 0.5;
  if (isLight) {
    color.rgb += (1.0 - color.rgb) * 0.25;
  }

  gl_FragColor = color;
}
`;

// Sprite layer (clouds, cactus shadow, cactus): no dithering, just alpha
const SPRITE_FRAG = /* glsl */`
uniform sampler2D u_texture;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(u_texture, vUv);
  if (color.a < 0.01) discard;
  gl_FragColor = color;
}
`;

// Standard 3D vertex shader — used for ground plane and 3D billboards
const MESH_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Solid color + screen-space dither — for the ground plane (no texture needed)
const GROUND_FRAG = /* glsl */`
uniform vec3 u_color;
uniform float u_pixelSize;

void main() {
  vec2 blockId = floor(gl_FragCoord.xy / u_pixelSize);
  bool isLight = mod(blockId.x + blockId.y, 2.0) < 0.5;
  vec3 color = u_color;
  if (isLight) color += (1.0 - color) * 0.25;
  gl_FragColor = vec4(color, 1.0);
}
`;

// ─── Params ───────────────────────────────────────────────────────────────────

const defaultPixelSize = 14;
const params = [numberParam('Pixel Size', defaultPixelSize, { min: 4, max: 40, step: 1 })];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loader = new TextureLoader();
const bgGeo = new PlaneGeometry(2, 2); // NDC fullscreen quad

function makeDitherMat(url: string, pixelSize: number): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: BG_VERT,
		fragmentShader: DITHER_FRAG,
		uniforms: {
			u_texture: { value: loader.load(url) },
			u_pixelSize: { value: pixelSize }
		},
		transparent: true,
		depthTest: false,
		depthWrite: false
	});
}

function makeSpriteMat(url: string): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: BG_VERT,
		fragmentShader: SPRITE_FRAG,
		uniforms: { u_texture: { value: loader.load(url) } },
		transparent: true,
		depthTest: false,
		depthWrite: false
	});
}

function makeBillboardMat(url: string): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: MESH_VERT,
		fragmentShader: SPRITE_FRAG,
		uniforms: { u_texture: { value: loader.load(url) } },
		transparent: true,
		depthTest: true,
		depthWrite: false
	});
}

// ─── Snake constants ──────────────────────────────────────────────────────────

const NUM_SEGS = 72;
const SEG_SPACING = 0.20;    // world units between segments along Z
const APPROACH_SPEED = 1.6;  // world units / sec (how fast it comes toward you)
const WAVE_AMP = 1.2;        // world units of lateral swing (narrower for portrait)
const WAVE_FREQ = 1.5;       // spatial frequency (curves per world unit)
const WAVE_SPEED = 1.8;      // rad / sec (body undulation)
const Z_START = -8;          // where the snake emerges (near the horizon)
const Z_END = 5.5;           // where it exits (past the camera)

const COLOR_HEAD = 0x7a1a30;
const COLOR_BODY = 0xd44f6e;
const COLOR_BELLY = 0xe8899e;

// ─── Content class ────────────────────────────────────────────────────────────

class DesertLife implements ExperimentContent3D {
	private scene: Scene | undefined;
	private bgMeshes: Mesh[] = [];
	private snakeMeshes: Mesh[] = [];
	private connMeshes: Mesh[] = [];
	private ditherMats: ShaderMaterial[] = [];

	private pixelSize = defaultPixelSize;
	private headZ = Z_START;
	private wavePhase = 0;
	private lastTime: number | undefined;

	start = ({ scene, camera }: RendererParams) => {
		this.scene = scene;

		scene.background = new Color(0xeee8d8);

		// Camera: eye-level, nearly horizontal — so y=0 in 3D aligns with the
		// visual ground in the 2D background PNGs (horizon at ~45% from top).
		const cam = camera as PerspectiveCamera;
		cam.fov = 52;
		cam.position.set(0, 0.5, 8);
		cam.lookAt(0, 0, -3);
		cam.updateProjectionMatrix();

		// ── Background layers ─────────────────────────────────────────────────
		// Sky + clouds: fullscreen NDC quads, depthTest/Write off.
		// Ground + cactus: real 3D geometry, depthTest on so they integrate
		// correctly with the snake cubes.

		const skyMat = makeDitherMat(skyUrl, this.pixelSize);
		this.ditherMats = [skyMat];

		// Sky + clouds remain as fullscreen NDC quads (no spatial relationship needed)
		const bgLayers: [ShaderMaterial, number][] = [
			[skyMat,                   0],
			[makeSpriteMat(cloudsUrl), 2]
		];

		for (const [mat, order] of bgLayers) {
			const mesh = new Mesh(bgGeo, mat);
			mesh.renderOrder = order;
			scene.add(mesh);
			this.bgMeshes.push(mesh);
		}

		// Ground plane: real 3D horizontal geometry at y=0 so the snake sits on it naturally
		const groundMat = new ShaderMaterial({
			vertexShader: MESH_VERT,
			fragmentShader: GROUND_FRAG,
			uniforms: {
				u_color: { value: new Color(0xc8a87a) },
				u_pixelSize: { value: this.pixelSize }
			},
			transparent: true,
			depthTest: true,
			depthWrite: true
		});
		this.ditherMats.push(groundMat);
		const groundGeo = new PlaneGeometry(80, 80);
		const groundMesh = new Mesh(groundGeo, groundMat);
		groundMesh.rotation.x = -Math.PI / 2;
		groundMesh.renderOrder = 1;
		scene.add(groundMesh);
		this.bgMeshes.push(groundMesh);

		// Cactus shadow — horizontal plane lying flat on the ground
		const shadowGeo = new PlaneGeometry(2.5, 2.5);
		const shadowMesh = new Mesh(shadowGeo, makeBillboardMat(cactusShadowUrl));
		shadowMesh.rotation.x = -Math.PI / 2;
		shadowMesh.position.set(1.5, 0.01, -3);
		shadowMesh.renderOrder = 3;
		scene.add(shadowMesh);
		this.bgMeshes.push(shadowMesh);

		// Cactus — vertical plane facing the camera
		const cactusGeo = new PlaneGeometry(2.5, 4.0);
		const cactusMesh = new Mesh(cactusGeo, makeBillboardMat(cactusUrl));
		cactusMesh.position.set(1.5, 2.0, -3);
		cactusMesh.renderOrder = 4;
		scene.add(cactusMesh);
		this.bgMeshes.push(cactusMesh);

		// ── Snake cube pool ───────────────────────────────────────────────────
		// A fixed pool of BoxGeometry cubes; positions are updated each frame.
		// Using unit cubes scaled by cubeSize keeps geometry reuse simple.

		const cubeGeo = new BoxGeometry(1, 1, 1);
		const headMat = new MeshBasicMaterial({ color: COLOR_HEAD, transparent: true, opacity: 1.0 });
		const bodyMat = new MeshBasicMaterial({ color: COLOR_BODY, transparent: true, opacity: 1.0 });
		const bellyMat = new MeshBasicMaterial({ color: COLOR_BELLY, transparent: true, opacity: 1.0 });

		for (let i = 0; i < NUM_SEGS; i++) {
			const mat = i === 0 ? headMat : i % 2 === 0 ? bellyMat : bodyMat;
			const cube = new Mesh(cubeGeo, mat);
			cube.renderOrder = 5;
			cube.visible = false;
			scene.add(cube);
			this.snakeMeshes.push(cube);
		}

		// ── Connector pool ─────────────────────────────────────────────────────
		// One connector per gap between adjacent segments, oriented each frame
		// to fill the space between cubes and give the snake a continuous body.

		const connMat = new MeshBasicMaterial({ color: COLOR_BODY, transparent: true, opacity: 1.0 });
		for (let i = 0; i < NUM_SEGS - 1; i++) {
			const conn = new Mesh(cubeGeo, connMat);
			conn.renderOrder = 5;
			conn.visible = false;
			scene.add(conn);
			this.connMeshes.push(conn);
		}

		this.headZ = Z_START;
		this.wavePhase = 0;
		this.lastTime = undefined;
	};

	stop = () => {
		const scene = this.scene;
		if (!scene) return;
		[...this.bgMeshes, ...this.snakeMeshes, ...this.connMeshes].forEach((m) => scene.remove(m));
		this.bgMeshes = [];
		this.snakeMeshes = [];
		this.connMeshes = [];
		this.ditherMats = [];
		this.scene = undefined;
	};

	setParams = (values: ContentParams) => {
		const p = paramsById(values);
		const newSize = p['pixel-size']?.value as number ?? defaultPixelSize;
		if (newSize !== this.pixelSize) {
			this.pixelSize = newSize;
			this.ditherMats.forEach((m) => { m.uniforms.u_pixelSize.value = newSize; });
		}
	};

	onRender = () => {
		const now = performance.now();
		const dt = this.lastTime !== undefined ? (now - this.lastTime) / 1000 : 0;
		this.lastTime = now;
		// Advance snake head; reset when it exits past the camera
		this.headZ += APPROACH_SPEED * dt;
		this.wavePhase += WAVE_SPEED * dt;
		if (this.headZ > Z_END) this.headZ = Z_START;

		// Cube size in world units, derived from the pixel size parameter.
		// At default px=14 → 0.30 world units; scales linearly.
		const cs = this.pixelSize * 0.022;
		const groundY = cs * 0.5; // sit cubes on the implied ground plane

		for (let i = 0; i < NUM_SEGS; i++) {
			const z = this.headZ - i * SEG_SPACING;
			if (z < Z_START || z > Z_END) {
				this.snakeMeshes[i].visible = false;
				continue;
			}
			const x = WAVE_AMP * Math.sin(WAVE_FREQ * z + this.wavePhase);
			this.snakeMeshes[i].position.set(x, groundY, z);
			this.snakeMeshes[i].scale.setScalar(cs);
			this.snakeMeshes[i].visible = true;
		}

		// ── Connector update ──────────────────────────────────────────────────
		// For each adjacent pair of visible cubes, position a prism between them.
		// lookAt(b.position) makes the connector's +Z axis point toward b, so
		// scaling Z by the inter-center distance fills the gap exactly.

		for (let i = 0; i < NUM_SEGS - 1; i++) {
			const conn = this.connMeshes[i];
			const a = this.snakeMeshes[i];
			const b = this.snakeMeshes[i + 1];

			if (!a.visible || !b.visible) { conn.visible = false; continue; }

			conn.position.set(
				(a.position.x + b.position.x) * 0.5,
				(a.position.y + b.position.y) * 0.5,
				(a.position.z + b.position.z) * 0.5
			);

			const dx = b.position.x - a.position.x;
			const dz = b.position.z - a.position.z;
			const len = Math.sqrt(dx * dx + dz * dz) + cs * 0.5;

			conn.scale.set(cs, cs, len);
			conn.lookAt(b.position);
			conn.visible = true;
		}
	};
}

// ─── Post export ──────────────────────────────────────────────────────────────

const post: Post = {
	summary: {
		id: 'desert-life',
		tags: ['illustration', 'animation', '3d', 'shader'],
		title: 'Desert Life',
		timestamp: new Date(2026, 3, 6),
		type: PostType.experiment3d,
		preferredFormat: 'reel'
	},
	params,
	content: () => new DesertLife()
};

export default post;
