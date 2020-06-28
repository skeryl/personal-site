import { Camera, Euler, EventDispatcher, Vector3 } from "three";

const PI_2 = Math.PI / 2;

/**
 * This class was stolen and modified from the ThreeJS examples.
 * I introduced the types and slightly changed things to be helpful for my personal use.
 */
export class PointerLockControls extends EventDispatcher {
  private isLocked: boolean = false;

  constructor(
    private camera: Camera,
    private domElement: HTMLElement = document.body,
  ) {
    super();
    this.connect();
  }

  private changeEvent = { type: "change" };
  private lockEvent = { type: "lock" };
  private unlockEvent = { type: "unlock" };

  private euler = new Euler(0, 0, 0, "YXZ");

  onMouseMove = (event: MouseEvent) => {
    if (this.isLocked === false) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);

    this.euler.y -= movementX * 0.002;
    this.euler.x -= movementY * 0.002;

    this.euler.x = Math.max(-PI_2, Math.min(PI_2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);

    this.dispatchEvent(this.changeEvent);
  };

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
    console.error("THREE.PointerLockControls: Unable to use Pointer Lock API");
  };

  connect = () => {
    document.addEventListener("mousemove", this.onMouseMove, false);
    document.addEventListener(
      "pointerlockchange",
      this.onPointerlockChange,
      false,
    );
    document.addEventListener(
      "pointerlockerror",
      this.onPointerlockError,
      false,
    );
  };

  disconnect = () => {
    document.removeEventListener("mousemove", this.onMouseMove, false);
    document.removeEventListener(
      "pointerlockchange",
      this.onPointerlockChange,
      false,
    );
    document.removeEventListener(
      "pointerlockerror",
      this.onPointerlockError,
      false,
    );
  };

  locked = () => {
    return this.isLocked;
  };

  dispose = () => {
    this.disconnect();
  };

  getObject = () => {
    // retaining this method for backward compatibility
    return this.camera;
  };

  getDirection = () => {
    const direction = new Vector3(0, 0, -1);
    const camera = this.camera;

    return function (v: Vector3) {
      return v.copy(direction).applyQuaternion(camera.quaternion);
    };
  };

  lock = () => {
    this.domElement.requestPointerLock();
  };

  unlock = function () {
    document.exitPointerLock();
  };
}
