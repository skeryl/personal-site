import { Camera, Clock, Raycaster, Vector2, Vector3, WebGLRenderer } from 'three';
import { PointerLockControls } from '$lib/shapes';
import { KeyPressHelper } from '$lib/simulation/helpers/keyPressHelper';
import { MouseTracker } from '$lib/simulation/helpers/mouse-tracker';

export class Walker {
	private readonly raycaster: Raycaster = new Raycaster(
		new Vector3(),
		new Vector3(0, -1, 0),
		0,
		10
	);

	public readonly mouse: Vector2 = new Vector2();

	private velocity = new Vector3();

	private readonly controls: PointerLockControls;
	private readonly mouseTracker: MouseTracker;

	constructor(
		private readonly camera: Camera,
		readonly renderer: WebGLRenderer,
		private keyHelper: KeyPressHelper = new KeyPressHelper(),
		private readonly clock: Clock = new Clock()
	) {
		this.controls = new PointerLockControls();
		this.mouseTracker = new MouseTracker(renderer, camera.quaternion, this.controls);
	}

	public setPointerLock = (lock: boolean) => {
		if (lock) {
			this.controls.lock();
		} else {
			this.controls.unlock();
		}
	};

	update = () => {
		this.raycaster.ray.origin.copy(this.camera.position);

		const direction = this.raycaster.ray.direction;

		const delta = this.clock.getDelta();

		this.velocity.x -= this.velocity.x * 10.0 * delta;
		this.velocity.z -= this.velocity.z * 10.0 * delta;

		this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

		const moveForward = this.keyHelper.isDown('w');
		const moveBackward = this.keyHelper.isDown('s');
		const moveRight = this.keyHelper.isDown('d');
		const moveLeft = this.keyHelper.isDown('a');

		direction.z = Number(moveForward) - Number(moveBackward);
		direction.x = Number(moveLeft) - Number(moveRight);
		direction.normalize(); // this ensures consistent movements in all directions

		if (moveForward || moveBackward) this.velocity.z -= direction.z * 150.0 * delta;
		if (moveLeft || moveRight) this.velocity.x -= direction.x * 150.0 * delta;

		this.camera.translateX(this.velocity.x * delta);
		this.camera.position.y += this.velocity.y * delta; // new behavior
		this.camera.translateZ(this.velocity.z * delta);

		if (this.camera.position.y < 10) {
			this.velocity.y = 0;
			this.camera.position.y = 10;
		}
	};

	disconnect = () => {
		this.controls.disconnect();
		this.mouseTracker.disconnect();
	};
}
