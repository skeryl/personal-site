import { type ExperimentContent3D, type Post, PostType, type RendererParams } from '@sc/model';
import { Camera, Color, Light, Points, Scene, ShaderMaterial, SpotLight, Vector3 } from 'three';
import { SoftBody } from '$lib/simulation/soft-body';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class BouncyCapsule implements ExperimentContent3D {
	private lights: Light[] = [];

	private camera: Camera | undefined;
	private scene: Scene | undefined;

	private controls: OrbitControls | undefined;
	private softBody: SoftBody | undefined;

	start = ({ scene, camera, renderer, container }: RendererParams) => {
		scene.background = new Color(0xf4dbce);
		this.scene = scene;
		this.setupLights(scene);

		this.softBody = new SoftBody(new Vector3(0, 10, 0));

		const material = new ShaderMaterial({
			uniforms: {
				color: { value: new Color(0xce4a04) }
			},
			vertexShader: `attribute float scale;
                
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_PointSize = scale * ( 300.0 / - mvPosition.z );
                    gl_Position = projectionMatrix * mvPosition;
                }`,
			fragmentShader: `uniform vec3 color;
                void main() {
                    if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;
                    gl_FragColor = vec4( color, 1.0 );
                }
            `
		});

		const softBodyMesh = new Points(this.softBody.geometry, material);

		this.controls = new OrbitControls(camera, container);

		scene.add(softBodyMesh);

		camera.position.z = 10;
		this.camera = camera;
		camera.position.z = -20;
		camera.position.x = -20;
		camera.position.y = 6;
		camera.lookAt(0, 6, 0);
	};

	onFullScreenChange = (isFull: boolean) => {};

	onRender = () => {
		this.softBody?.tick();
	};

	stop = () => {
		const scene = this.scene;
		if (!scene) {
			return;
		}
		this.lights.forEach((light) => scene.remove(light));
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
		id: 'bouncy-capsule',
		title: 'Bouncy Capsule',
		isHidden: true,
		timestamp: new Date(2024, 2, 9),
		tags: ['3d', 'mathematics']
	},
	content: () => new BouncyCapsule()
};

export default post;
