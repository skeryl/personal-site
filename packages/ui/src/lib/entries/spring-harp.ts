import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import {
	Camera,
	CircleGeometry,
	Color,
	DoubleSide,
	Light,
	LineCurve3,
	Mesh,
	MeshBasicMaterial,
	MeshPhongMaterial,
	MeshStandardMaterial,
	Scene,
	SphereGeometry,
	SpotLight,
	TubeGeometry
} from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { Walker } from '$lib/simulation/helpers/walker';
import { Spring, SpringHelper } from '$lib/simulation/helpers/spring';
import { MouseTracker } from '$lib/simulation/helpers/mouse-tracker';
import { MutableAudioNode as AudioGraphNode } from '@sc/synth-builder/src/core/nodes/MutableAudioNode';
import { MutableAudioGraph } from '@sc/synth-builder/src/core/nodes/MutableAudioGraph';
import { Synth } from '@sc/synth-builder/src/core/Synth';
import { Notes, Pitch, PitchInformation } from '@sc/synth-builder/src/model/notes';

function createSphere(sphereMaterial: MeshStandardMaterial, x: number, y: number, z: number) {
	const sphere = new SphereGeometry(1, 18, 24);
	const sphereMesh = new Mesh(sphere, sphereMaterial);
	const center = sphereMesh.position.set(x, y, z);
	return { sphereMesh, center };
}

function getAudioGraph() {
	const osc = AudioGraphNode.createOscillator().setProperty('type', 'sine');
	return MutableAudioGraph.create(
		osc.connect(
			AudioGraphNode.createGain()
				.setProperty('maxGain', 0.12)
				.connect(AudioGraphNode.createDestination())
		)
	);
}

const notes = new Set<Notes>([Notes.C, Notes.E, Notes.G]);

const pitchesByFrequency = Object.entries(PitchInformation)
	.filter(
		([n, p]) =>
			notes.has(p.note) &&
			(p.nameLong.includes('2') ||
				p.nameLong.includes('3') ||
				p.nameLong.includes('4') ||
				p.nameLong.includes('5'))
	)
	.sort(([, a], [, b]) => a.hertz - b.hertz);

console.log(pitchesByFrequency.length);

function getPitch(y: number): Pitch | undefined {
	const upperBound = 8;
	const value = Math.abs(y) / upperBound;
	return pitchesByFrequency[Math.floor(pitchesByFrequency.length * value - 1)]?.[0] as Pitch;
}

const audioGraph = getAudioGraph();

class SpringExp implements ExperimentContent3D {
	private lights: Light[] = [];

	private camera: Camera | undefined;
	private scene: Scene | undefined;
	private walker: Walker | undefined;

	private spring: Spring | undefined;

	private dragControls: DragControls | undefined;

	private readonly sphereColor = new Color(0xff, 0x11, 0xaa);
	private readonly lineColor = new Color(0x11, 0xcc, 0xaa);
	private readonly lineMaterial = new MeshPhongMaterial({ color: this.lineColor });

	private line: Mesh<TubeGeometry, MeshBasicMaterial> | undefined;
	private mouseTracker: MouseTracker | undefined;
	private springHelper: SpringHelper | undefined;
	private lineCurve: LineCurve3 | undefined;

	private readonly synth = new Synth(audioGraph, {
		attack: 0.99,
		release: 0.5,
		unison: 4,
		unisonDetune: 0.1
	});

	start = ({ scene, camera, renderer, container }: RendererParams) => {
		scene.background = new Color(0xf4dbce);
		this.scene = scene;

		this.walker = new Walker(camera, renderer);

		const sphereMaterial = new MeshStandardMaterial({
			color: this.sphereColor,
			roughness: 0.7,
			metalness: 0.5
		});

		const { sphereMesh: sphereMeshA } = createSphere(sphereMaterial, 0, 10, 0);
		const { sphereMesh: sphereMeshB } = createSphere(sphereMaterial, 0, 0, 0);

		sphereMeshA.castShadow = true;
		sphereMeshB.castShadow = true;

		this.dragControls = new DragControls([sphereMeshA, sphereMeshB], camera, container);
		this.dragControls.activate();

		const springPointB = { mesh: sphereMeshB, mass: 20 };
		const springPointA = { mesh: sphereMeshA, mass: 100, isFixed: true };

		this.spring = new Spring(springPointA, springPointB, {
			stiffness: 1000,
			gravity: -9.8,
			length: 5
		});

		// line that connects two spheres
		this.lineCurve = new LineCurve3(
			this.spring.pointA.mesh.position,
			this.spring.pointB.mesh.position
		);
		const geometry = new TubeGeometry(this.lineCurve, 64, 0.05, 8);
		this.line = new Mesh(geometry, this.lineMaterial);

		const planeGeometry = new CircleGeometry(300, 64);
		const planeMesh = new Mesh(
			planeGeometry,
			new MeshBasicMaterial({ color: 0x22c3d0, side: DoubleSide })
		);
		planeMesh.position.set(0, -40, 0);
		planeMesh.rotation.set(Math.PI / 2, 0, 0);
		scene.add(planeMesh);

		scene.add(sphereMeshA);
		scene.add(sphereMeshB);

		scene.add(this.line);

		this.setupLights(scene);

		camera.position.z = 10;
		this.camera = camera;
		camera.position.z = -10;
		camera.position.x = -10;
		camera.position.y = 6;
		camera.lookAt(0, 0, 0);

		console.log(this.synth.oscillators);
	};

	onFullScreenChange = (isFull: boolean) => {
		this.walker?.setPointerLock(isFull);
	};

	private lastNote: Pitch | undefined;

	onRender = () => {
		this.walker?.update();
		if (this.spring) {
			this.spring.tick();
			if (this.lineCurve && this.line) {
				this.lineCurve?.v1.copy(this.spring.pointA.mesh.position);
				this.lineCurve?.v2.copy(this.spring.pointB.mesh.position);

				const newNote = getPitch(this.spring.displacement);
				if (newNote) {
					if (this.lastNote && this.lastNote !== newNote) {
						this.synth.stopPlaying(this.lastNote);
					}
					this.synth.startPlaying(newNote);
					this.lastNote = newNote;

					const { x, y, z } = this.spring.velocityB;

					const velocityMagnitude = Math.pow(
						Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2),
						1 / 3
					);

					if (velocityMagnitude < 0.0001) {
						this.synth.fadeOutAll();
						this.lastNote = undefined;
					} else {
						const velocityGain = Math.min(Math.log(velocityMagnitude + 1) / 40, 0.35);
						this.synth.setGain(velocityGain);
					}
				}

				this.line.geometry = new TubeGeometry(this.lineCurve, 64, 0.05, 8);
			}

			const mouseTracker = this.mouseTracker;
			if (mouseTracker) {
				const intersections = mouseTracker.raycaster.intersectObjects([
					this.spring.pointB.mesh,
					this.spring.pointA.mesh
				]);
				if (intersections.length) {
					console.log(intersections);
				}
			}
			//this.camera?.lookAt(this.spring?.pointA.mesh.position);
		}
		if (this.springHelper) {
			this.springHelper?.tick();
		}
	};

	stop = () => {
		const scene = this.scene;
		if (!scene) {
			return;
		}
		this.lights.forEach((light) => scene.remove(light));
		this.synth.destroy();
		this.dragControls?.dispose();
	};

	private setupLights(scene: Scene) {
		const spotLight = new SpotLight(0xffffff, 25);
		this.lights = [spotLight];

		spotLight.position.set(0, 50, 0);
		spotLight.lookAt(0, 0, 0);

		this.lights.forEach((light) => {
			scene.add(light);
		});
	}
}

const post: Post = {
	summary: {
		type: PostType.experiment3d,
		id: 'spring-harp',
		title: 'Spring Harp',
		timestamp: new Date(2024, 2, 3),
		tags: ['3d', 'mathematics']
	},
	content: () => new SpringExp()
};

export default post;
