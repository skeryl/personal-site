import { Clock, Mesh, Vector3 } from 'three';

export interface SpringPoint {
	mesh: Mesh;
	isFixed?: boolean;
	mass: number;
}

export interface SpringOptions {
	gravity?: number;
	stiffness: number;
	minimumLength: number;
	maximumLength: number;
	length: number;
	damping: number;
}

export const DEFAULT_OPTIONS: SpringOptions = {
	gravity: -9.8,
	stiffness: 5,
	minimumLength: 3,
	maximumLength: 17,
	length: 10,
	damping: 0.01
};

export class Spring {
	private readonly options: SpringOptions;
	public readonly velocityB = new Vector3(0, 0, 0);

	constructor(
		public readonly pointA: SpringPoint,
		public readonly pointB: SpringPoint,
		options: Partial<SpringOptions> = DEFAULT_OPTIONS,
		private readonly clock: Clock = new Clock()
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	public get displacement(): number {
		const distance = this.pointB.mesh.position.distanceTo(this.pointA.mesh.position);
		return distance - this.options.length;
	}

	tick() {
		const delta = this.clock.getDelta();

		// F = m * a
		// F = m *  d/dt v
		// F / m = (d/dt v)
		// F = k * X

		const forceGravity = new Vector3(0, (this.options.gravity ?? 0) * this.pointB.mass, 0);

		const k = this.options.stiffness;

		const direction = this.pointB.mesh.position.clone().sub(this.pointA.mesh.position).normalize();

		const kForce = direction.clone().multiplyScalar(this.displacement * k * -1);
		const netForces = kForce.clone().add(forceGravity);

		// F = m * a <=> a = F / m
		const acceleration = netForces.divideScalar(this.pointB.mass);

		// update velocity
		this.velocityB.add(acceleration.multiplyScalar(delta));

		// update position
		this.pointB.mesh.position.add(this.velocityB.clone().multiplyScalar(delta));

		this.velocityB.multiplyScalar(Math.max(Math.min(1 - this.options.damping, 1), 0));
	}
}

export class SpringHelper {
	private helperContents: HTMLDivElement | undefined;

	constructor(private readonly spring: Spring) {}

	async init(container: HTMLElement): Promise<void> {
		this.helperContents = document.createElement('div');
		this.helperContents.className = 'absolute top-0 left-0';
		container.appendChild(this.helperContents);
	}

	tick() {
		if (this.helperContents) {
			this.helperContents.innerText = this.spring.velocityB
				.toArray()
				.map((n) => n.toFixed(3))
				.join(' | ');
		}
	}
}
