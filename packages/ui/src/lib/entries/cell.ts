import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import {
	AmbientLight,
	BoxGeometry,
	Camera,
	Color,
	DirectionalLight,
	DoubleSide,
	Light,
	Material,
	Mesh,
	MeshPhongMaterial,
	MirroredRepeatWrapping,
	PlaneGeometry,
	Scene,
	SpotLight,
	TextureLoader,
	WebGLRenderer
} from 'three';
import cinderBlocks from '$lib/assets/images/cinder-blocks.jpg';
import { Walker } from '$lib/simulation/helpers/walker';

class Cell implements ExperimentContent3D {
	private lights: Light[] = [];
	private camera: Camera | undefined;
	private scene: Scene | undefined;
	private renderer: WebGLRenderer | undefined;
	private walker: Walker | undefined;

	start = ({ scene, camera, renderer }: RendererParams) => {
		this.renderer = renderer;
		scene.background = new Color(0x000000);
		this.scene = scene;
		this.walker = new Walker(camera, renderer, scene);

		this.setupLights(scene);

		const loader = new TextureLoader();
		const wallTexture = loader.load(cinderBlocks);
		wallTexture.repeat.set(4, 4);
		wallTexture.wrapS = MirroredRepeatWrapping;
		wallTexture.wrapT = MirroredRepeatWrapping;

		const wallMaterial = new MeshPhongMaterial({
			color: 0x999999,
			side: DoubleSide,
			bumpMap: wallTexture,
			reflectivity: 0
		});

		this.addFloorAndCeiling(wallMaterial, scene);
		this.addOblisks(wallMaterial, scene);
		this.createWalls(wallMaterial, scene);

		camera.position.z = 15;
		camera.position.x = -7;
		camera.position.y = 6;

		this.camera = camera;
	};

	onFullScreenChange = (fullScreen: boolean) => {
		this.walker?.setPointerLock(fullScreen);
	};

	private addOblisks(wallMaterial: Material, scene: Scene) {
		const oblisk = new Mesh(new BoxGeometry(2, 10, 1), wallMaterial);
		oblisk.receiveShadow = true;
		oblisk.castShadow = true;
		oblisk.position.y = 5;
		scene.add(oblisk);

		const oblisk2 = new Mesh(new BoxGeometry(4, 20, 1), wallMaterial);
		oblisk2.receiveShadow = true;
		oblisk2.castShadow = true;
		oblisk2.position.set(10, 10, 5);
		scene.add(oblisk2);
	}

	private addFloorAndCeiling(wallMaterial: Material, scene: Scene) {
		const floor = new Mesh(new PlaneGeometry(50, 50), wallMaterial);
		floor.castShadow = true;
		floor.receiveShadow = true;
		floor.rotateX(Math.PI / 2);
		scene.add(floor);

		const ceiling = new Mesh(new PlaneGeometry(50, 50), wallMaterial);
		ceiling.castShadow = true;
		ceiling.receiveShadow = true;
		ceiling.rotateX(Math.PI / 2);
		ceiling.position.y = 20;
		scene.add(ceiling);
	}

	private createWalls(wallMaterial: Material, scene: Scene) {
		const wall = new Mesh(new BoxGeometry(50, 20, 1), wallMaterial);
		wall.receiveShadow = true;
		wall.castShadow = true;
		wall.position.set(-25.15, 10, 0);
		wall.rotateY(Math.PI / 2);
		scene.add(wall);

		const wall2 = new Mesh(new BoxGeometry(50, 20, 1), wallMaterial);
		wall2.receiveShadow = true;
		wall2.castShadow = true;
		wall2.position.set(0, 10, 25);
		scene.add(wall2);

		const wall3 = new Mesh(new BoxGeometry(50, 5, 1), wallMaterial);
		//wall3.rotateY(Math.PI / 2);
		wall3.receiveShadow = true;
		wall3.castShadow = true;
		wall3.position.set(0, 2.5, -25);
		scene.add(wall3);

		const wall4 = new Mesh(new BoxGeometry(20, 5, 1), wallMaterial);
		//wall3.rotateY(Math.PI / 2);
		wall4.receiveShadow = true;
		wall4.castShadow = true;
		wall4.position.set(15.5, 7.5, -25);
		scene.add(wall4);

		const wall5 = new Mesh(new BoxGeometry(20, 5, 1), wallMaterial);
		//wall3.rotateY(Math.PI / 2);
		wall5.receiveShadow = true;
		wall5.castShadow = true;
		wall5.position.set(-15.5, 7.5, -25);

		scene.add(wall5);

		const wall6 = new Mesh(new BoxGeometry(50, 10, 1), wallMaterial);
		//wall3.rotateY(Math.PI / 2);
		wall6.receiveShadow = true;
		wall6.castShadow = true;
		wall6.position.set(0, 15, -25);
		scene.add(wall6);

		const wall7 = new Mesh(new BoxGeometry(50, 20, 1), wallMaterial);
		wall7.receiveShadow = true;
		wall7.castShadow = true;
		wall7.position.set(25, 10, 0);
		wall7.rotateY(Math.PI / 2);
		scene.add(wall7);
	}

	onRender = () => {
		if (this.walker) {
			this.walker.update();
		}
	};

	stop = () => {
		const scene = this.scene;
		if (!scene) {
			return;
		}
		this.lights.forEach((light) => scene.remove(light));
	};

	private setupLights(scene: Scene) {
		const directionalLight = new DirectionalLight(0xffffff, 0.2);
		const spotLight = new SpotLight(0xcc8843, 1);

		this.lights = [new AmbientLight(0xffffff, 0.4), directionalLight, spotLight];

		directionalLight.position.set(0, 15, 0);
		directionalLight.lookAt(0, 0, 0);

		spotLight.castShadow = true;
		spotLight.position.set(0, 12.5, -40);
		spotLight.lookAt(0, 0, 0);
		spotLight.angle = Math.PI / 4;
		spotLight.penumbra = 0.5;
		spotLight.distance = 100;
		spotLight.shadow.camera.near = 10;
		spotLight.shadow.camera.far = 100;

		this.lights.forEach((light) => {
			scene.add(light);
		});
	}
}

const post: Post = {
	summary: {
		type: PostType.experiment3d,
		id: 'cell',
		title: 'Cell',
		isHidden: true,
		timestamp: new Date(2019, 7, 4),
		tags: ['3d', 'lighting']
	},
	content: () => new Cell()
};

export default post;
