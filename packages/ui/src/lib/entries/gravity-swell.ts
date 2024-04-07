import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';

import fragmentShader from '$lib/glsl/gravity-swell.frag?raw';
import vertexShader from '$lib/glsl/gravity-swell.vert?raw';

import {
	type ContentParam,
	type ContentParams,
	createParam,
	paramsById,
	ParamType
} from '$lib/content-params';

import {
	BufferAttribute,
	BufferGeometry,
	Clock,
	Color,
	GLSL3,
	Points,
	ShaderMaterial
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Helper function to check if a point is within the larger circle
function isInCircle(x: number, y: number, circleRadius: number) {
	return x * x + y * y <= circleRadius * circleRadius;
}

function getCirclePositions(
	center: [number, number],
	radius: number,
	particleRadius: number,
	packingDensity: number
): number[] {
	const positions = new Array<number>();
	for (let y = -radius; y < radius; y += particleRadius * 2 * packingDensity) {
		for (let x = -radius; x < radius; x += particleRadius * 2 * packingDensity) {
			if (isInCircle(x, y, radius)) {
				positions.push(x + center[0], y + center[1], -10);
			}
		}
	}
	return positions;
}

function createBufferGeometryFromParams(params: ContentParams) {
	const p = paramsById(params);

	const packingDensity = (p['particle-density'] as ContentParam<ParamType.number>).value;

	const particleRadius = (p['particle-radius'] as ContentParam<ParamType.number>).value;

	const leftCenter = (p[`left-center`] as ContentParam<ParamType.vec2>).value;
	const leftRadius = (p[`left-radius`] as ContentParam<ParamType.number>).value;
	const leftPositions = getCirclePositions(leftCenter, leftRadius, particleRadius, packingDensity);

	const rightCenter = (p[`right-center`] as ContentParam<ParamType.vec2>).value;
	const rightRadius = (p[`right-radius`] as ContentParam<ParamType.number>).value;
	const rightPositions = getCirclePositions(
		rightCenter,
		rightRadius,
		particleRadius,
		packingDensity
	);

	// Create BufferGeometry and BufferAttribute for positions
	const geometry = new BufferGeometry();
	const positionValues = new Float32Array([...leftPositions, ...rightPositions]);
	const positionAttribute = new BufferAttribute(positionValues, 3);
	geometry.setAttribute('position', positionAttribute);

	const scaleValues = new Float32Array(positionValues.length).map((_) => particleRadius);
	const scaleAttribute = new BufferAttribute(scaleValues, 1);
	geometry.setAttribute('scale', scaleAttribute);

	return { geometry, positionAttribute };
}

const params = [
	createParam('Point Mass', ParamType.number, 2500000 * 2, { min: 1000, max: 2500000 * 40 }),

	createParam('Left Center', ParamType.vec2, [-6, 0]),
	createParam('Left Radius', ParamType.number, 4, { min: 1, max: 9 }),

	createParam('Right Center', ParamType.vec2, [6, 2]),
	createParam('Right Radius', ParamType.number, 4, { min: 1, max: 9 }),

	createParam('Particle Radius', ParamType.number, 0.05, { min: 0.01, max: 0.5, step: 'any' }),
	createParam('Particle Density', ParamType.number, 0.5, { min: 0.01, max: 9 })
];

type Side = 'left' | 'right';

type MassCoordinates = Record<Side | 'center', [number, number]>;
type Masses = number;

export const GravitationalConstant: number = 6.674 * Math.pow(10, -11);

function distanceBetween(x1: number, y1: number, x2: number, y2: number) {
	const x = x1 - x2;
	const y = y1 - y2;
	return { x, y, total: Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) };
}

type Vec2 = { x: number; y: number };

function add(a: Vec2, b: Vec2): Vec2 {
	return {
		x: a.x + b.x,
		y: a.y + b.y
	};
}

function multiply(a: Vec2, n: number): Vec2 {
	return {
		x: a.x * n,
		y: a.y * n
	};
}

function getParticleRadius(contentParams: ContentParam<ParamType>[]) {
	return (contentParams.find((p) => p.id === 'particle-radius') as ContentParam<ParamType.number>)
		.value;
}

class Simulation {
	private velocities = new Array<Vec2>();
	private accelerations = new Array<Vec2>();
	private massProduct = 1.0;

	constructor(
		private positions: BufferAttribute,
		private masses: Masses,
		private massCoords: MassCoordinates,
		private particleRadius: number,
		private readonly clock: Clock = new Clock()
	) {
		this.masses = masses;
	}

	init() {
		for (let i = 0; i < this.positions.count; i++) {
			this.velocities[i] = { x: 0, y: 0 };
			this.accelerations[i] = { x: 0.0, y: 0.0 };
		}
		this.massProduct = this.masses * 1000;
	}

	update(contentParams: ContentParams, positions: BufferAttribute) {
		this.masses = getMasses(contentParams);
		this.massCoords = getMassCoordinates(contentParams);
		this.positions = positions;
		this.particleRadius = getParticleRadius(contentParams);
		this.init();
	}

	gravitationalForceOn(x1: number, y1: number, x2: number, y2: number): Vec2 {
		const { x: xDistance, y: yDistance, total: distance } = distanceBetween(x1, y1, x2, y2);

		const angleX = Math.asin(xDistance / distance);
		const angleY = Math.acos(yDistance / distance);

		const forceTotal = (this.massProduct / Math.pow(distance, 2)) * GravitationalConstant;

		const currentForce = {
			x: Math.sin(angleX) * forceTotal,
			y: Math.cos(angleY) * forceTotal
		};

		if (distance < 0.4) {
			return multiply(currentForce, -0.25);
		}
		return currentForce;
	}

	tick() {
		const delta = this.clock.getDelta();

		for (let i = 0; i < this.positions.count; i++) {
			const x = this.positions.getX(i);
			const y = this.positions.getY(i);

			const [leftX, leftY] = this.massCoords.center;

			const leftForce = this.gravitationalForceOn(leftX, leftY - 1.5, x, y);
			const middleForce = this.gravitationalForceOn(leftX, leftY, x, y);
			const rightForce = this.gravitationalForceOn(leftX, leftY + 1.5, x, y);

			const netForce = add(middleForce, add(leftForce, rightForce));

			// F = ma
			this.accelerations[i] = netForce;
			const currentVelocity = add(this.velocities[i], multiply(netForce, delta));
			this.velocities[i] = currentVelocity;

			this.positions.setXY(i, x + currentVelocity.x * delta, y + currentVelocity.y * delta);
		}
		this.positions.needsUpdate = true;
	}
}

function getMasses(prms: ContentParams) {
	return (prms.find((p) => p.id === 'point-mass') as ContentParam<ParamType.number>)!.value;
}

function getMassCoordinates(params: ContentParams): MassCoordinates {
	const left = (params.find((p) => p.id === 'left-center') as ContentParam<ParamType.vec2>)!.value;
	const right = (params.find((p) => p.id === 'right-center') as ContentParam<ParamType.vec2>)!
		.value;
	return {
		left: left,
		right: right,
		center: [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2]
	};
}

class GravitySwell implements ExperimentContent3D {
	private params: ContentParams = params;

	private points: Points<BufferGeometry, ShaderMaterial> | undefined;
	private geometry: BufferGeometry | undefined;
	private positionAttribute: BufferAttribute | undefined;
	private simulation: Simulation | undefined;

	getParams = () => {
		return this.params;
	};

	setParams = (params: ContentParams) => {
		this.params = params;

		if (this.geometry) {
			this.geometry.dispose();
		}

		const { geometry, positionAttribute } = createBufferGeometryFromParams(params);
		this.geometry = geometry;
		this.positionAttribute = positionAttribute;
		if (this.points) {
			this.points.geometry = this.geometry;
		}
		this.simulation?.update(params, this.positionAttribute);
	};

	private readonly particlePositions = new Uint8Array(1024);
	start = ({ camera, container, scene }: RendererParams) => {
		const orbitControls = new OrbitControls(camera, container);
		orbitControls.autoRotate = true;

		scene.background = new Color(0xf4dbce);

		const material = new ShaderMaterial({
			uniforms: {
				color: { value: new Color(0xce4a04) }
			},
			glslVersion: GLSL3,
			vertexShader: vertexShader,
			fragmentShader: fragmentShader
		});
		const { geometry, positionAttribute } = createBufferGeometryFromParams(this.params);
		this.geometry = geometry;
		this.positionAttribute = positionAttribute;

		this.points = new Points(this.geometry, material);
		scene.add(this.points);
		this.simulation = new Simulation(
			this.positionAttribute,
			getMasses(params),
			getMassCoordinates(params),
			getParticleRadius(params)
		);
		this.simulation.init();
	};

	onRender = () => {
		this.simulation?.tick();
	};

	stop = () => {};

	getVertexShader = () => vertexShader;
	getFragmentShader = () => fragmentShader;
}

const post: Post = {
	summary: {
		id: 'gravity-swell',
		tags: ['fun', 'canvas', 'grraf', 'interactive'],
		title: 'Gravity Swell',
		timestamp: new Date(2024, 2, 29),
		type: PostType.experiment3d
	},
	content: () => new GravitySwell(),
	params
};

export default post;
