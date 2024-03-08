import { Euler, Quaternion, Raycaster, Vector2, Vector3, WebGLRenderer } from 'three';
import { PointerLockControls } from '$lib/shapes';

const PI_2 = Math.PI / 2;

export class MouseTracker {
	public readonly raycaster: Raycaster = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 10);
	public readonly mouse: Vector2 = new Vector2();
	public readonly euler = new Euler(0, 0, 0, 'YXZ');

	private readonly size = new Vector2();

	constructor(
		private readonly renderer: WebGLRenderer,
		public readonly quaternion: Quaternion = new Quaternion(),
		private readonly pointerLock?: PointerLockControls
	) {
		window.addEventListener('mousemove', this.onMouseMove);
	}

	private onMouseMove = (ev: MouseEvent) => {
		if (this.pointerLock && !this.pointerLock.locked()) {
			return;
		}

		this.renderer.getSize(this.size);
		this.mouse.x = (ev.clientX / this.size.x) * 2 - 1;
		this.mouse.y = -(ev.clientY / this.size.y) * 2 + 1;

		const movementX = ev.movementX || 0;
		const movementY = ev.movementY || 0;

		this.euler.setFromQuaternion(this.quaternion);

		this.euler.y -= movementX * 0.002;
		this.euler.x -= movementY * 0.002;

		this.euler.x = Math.max(-PI_2, Math.min(PI_2, this.euler.x));

		this.quaternion.setFromEuler(this.euler);
	};

	public disconnect = () => {
		window.removeEventListener('mousemove', this.onMouseMove);
	};
}
