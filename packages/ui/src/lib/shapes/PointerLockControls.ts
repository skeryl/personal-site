import { EventDispatcher, type Quaternion, Vector3 } from 'three';

/**
 * This class was stolen and then modified from the ThreeJS examples.
 * I introduced the types and slightly changed things to be helpful for my personal use.
 */
export class PointerLockControls extends EventDispatcher {
	private isLocked: boolean = false;

	constructor(private domElement: HTMLElement = document.body) {
		super();
		document.addEventListener('pointerlockchange', this.onPointerlockChange, false);
		document.addEventListener('pointerlockerror', this.onPointerlockError, false);
	}

	private lockEvent = { type: 'lock' };
	private unlockEvent = { type: 'unlock' };

	onPointerlockChange = () => {
		if (document.pointerLockElement === this.domElement) {
			this.dispatchEvent(this.lockEvent);
			this.isLocked = true;
		} else {
			this.dispatchEvent(this.unlockEvent);
			this.isLocked = false;
		}
	};

	onPointerlockError = () => {
		console.error('THREE.PointerLockControls: Unable to use Pointer Lock API');
	};

	disconnect = () => {
		document.removeEventListener('pointerlockchange', this.onPointerlockChange, false);
		document.removeEventListener('pointerlockerror', this.onPointerlockError, false);
	};

	locked = () => {
		return this.isLocked;
	};

	getDirection = (quaternion: Quaternion) => {
		const direction = new Vector3(0, 0, -1);

		return function (v: Vector3) {
			return v.copy(direction).applyQuaternion(quaternion);
		};
	};

	lock = () => {
		this.domElement.requestPointerLock();
	};

	unlock = function () {
		document.exitPointerLock();
	};
}
