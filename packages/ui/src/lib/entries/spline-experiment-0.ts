import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import {
	AmbientLight,
	BufferGeometry,
	Camera,
	Color,
	Light,
	Line,
	LineBasicMaterial,
	Scene,
	SplineCurve,
	Vector2
} from 'three';

class SpineExp0 implements ExperimentContent3D {
	private lights: Light[] = [];

	private camera: Camera | undefined;
	private scene: Scene | undefined;

	start = ({ scene, camera }: RendererParams) => {
		scene.background = new Color(0xf4dbce);
		this.scene = scene;

		const curve = new SplineCurve([
			new Vector2(-10, 0),
			new Vector2(-5, 5),
			new Vector2(0, 0),
			new Vector2(5, -5),
			new Vector2(10, 0)
		]);

		const points = curve.getPoints(50);
		const geometry = new BufferGeometry().setFromPoints(points);

		const material = new LineBasicMaterial({ color: 0x333333 });

		const line = new Line(geometry, material);

		scene.add(line);

		// soft body physics
		// geometry of points that are connected by springs in patterns
		// collision
		// "air pressure" (more or less particles?)

		this.setupLights(scene);

		camera.position.z = 10;
		this.camera = camera;
		this.animate();
	};

	animate = () => {
		//const time = new Date().getTime() / 1000 / 15;
		//const camera = this.camera;
		/*if (camera) {
			camera.position.x = Math.sin(time) * 20;
			camera.position.z = Math.cos(time) * 20;
			camera.position.y = Math.cos(time) * 30;
			camera.lookAt(0, 0, 0);
		}*/
		window.requestAnimationFrame(this.animate);
	};

	stop = () => {
		const scene = this.scene;
		if (!scene) {
			return;
		}
		this.lights.forEach((light) => scene.remove(light));
	};

	private setupLights(scene: Scene) {
		this.lights = [new AmbientLight(0xffffff, 0.2)];

		this.lights[0].position.set(0, 200, 0);

		this.lights.forEach((light) => {
			scene.add(light);
		});
	}
}

const post: Post = {
	summary: {
		type: PostType.experiment3d,
		isHidden: true,
		id: 'spline-experiment-0',
		title: 'Spline Experiment 0',
		timestamp: new Date(2024, 2, 2),
		tags: ['3d', 'mathematics']
	},
	content: () => new SpineExp0()
};

export default post;
