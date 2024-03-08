export class KeyPressHelper {
	public onEvent: (() => void) | undefined;

	private down: { [key: string]: boolean } = {
		w: false,
		a: false,
		s: false,
		d: false
	};

	constructor() {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	private onKeyDown = (ev: KeyboardEvent) => {
		this.down[ev.key.toLowerCase()] = true;
		if (this.onEvent) {
			this.onEvent();
		}
	};

	private onKeyUp = (ev: KeyboardEvent) => {
		this.down[ev.key.toLowerCase()] = false;
		if (this.onEvent) {
			this.onEvent();
		}
	};

	public isDown(key: string) {
		return Boolean(this.down[key.toLowerCase()]);
	}
}
