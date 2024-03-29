import { BufferAttribute, BufferGeometry, type Matrix, SphereGeometry, Vector3 } from 'three';

const PI_2 = Math.PI * 2;

export function generateBall(center: Vector3, radius: number, points: number): Float32Array {
	// use the parametric functions to generate specific x, y, z values
	const result = new Float32Array(points * points * 3);

	const { x, y, z } = center;

	let it = 0;
	for (let ix = 0; ix < points; ix += 1) {
		const angleTheta = ix / Math.PI;
		for (let iy = 0; iy < points; iy += 1) {
			const anglePhi = iy / PI_2;
			result[it++] = x + radius * Math.sin(angleTheta) * Math.cos(anglePhi);
			result[it++] = y + radius * Math.sin(angleTheta) * Math.sin(anglePhi);
			result[it++] = z + radius * Math.cos(angleTheta);
		}
	}
	return result;
}

export function generateTriangle(sideLength: number): Float32Array {
	const points = 4;
	const result = new Float32Array(points * 3);

	result[0] = 0;
	result[1] = 0;
	result[2] = 0;

	result[3] = sideLength;
	result[3 + 1] = 0;
	result[3 + 2] = 0;

	result[6] = sideLength / 2;
	result[6 + 1] = Math.sqrt(Math.pow(sideLength, 2) * 0.75);
	result[6 + 2] = 0;

	result[9] = (result[0] + result[3] + result[6]) / 3;
	result[9 + 1] = (result[4] + result[7] + result[11]) / 3;
	result[9 + 2] = (result[5] + result[8] + result[12]) / 3;

	return result;
}

function generateTriangles() {}

/*const Points: Record<string, (center: Vector3) => Vector3[]> = {
	SPHERE: (c) => generateBall(c, 10, 20)
};*/

function instantiateMatrix(pointPositions: Float32Array): Array<Float32Array> {
	const size = pointPositions.length / 3;
	const result = new Array<Float32Array>();
	for (let ij = 0; ij < pointPositions.length; ij += 3) {
		const xj = pointPositions[ij];
		const yj = pointPositions[ij + 1];
		const zj = pointPositions[ij + 2];
		for (let ik = 0; ik < pointPositions.length; ik += 3) {
			if (ij === ik) {
				continue;
			}
			const xk = pointPositions[ij];
			const yk = pointPositions[ij + 1];
			const zk = pointPositions[ij + 2];
			// compare distance between points j and k
		}
	}
	return result;
}

export class SoftBody {
	private readonly bufferGeometry: BufferGeometry;
	private bufferAttribute: BufferAttribute;

	private matrix: Array<Float32Array>;

	constructor(
		public readonly center: Vector3,
		public readonly pointPositions: Float32Array = generateBall(center, 5, 42) // generateTriangle(5) //
	) {
		this.bufferGeometry = new BufferGeometry();
		const numPoints = Math.floor(pointPositions.length / 3);
		const scale = new Float32Array(numPoints);
		for (let i = 0; i < numPoints; i++) {
			scale[i] = 0.125;
		}
		this.bufferAttribute = new BufferAttribute(pointPositions, 3);
		this.bufferGeometry.setAttribute('position', this.bufferAttribute);
		this.bufferGeometry.setAttribute('scale', new BufferAttribute(scale, 1));

		this.matrix = instantiateMatrix(pointPositions);
	}

	get geometry(): BufferGeometry {
		return this.bufferGeometry;
	}

	public tick(): void {
		/*for (let ix = 0; ix < this.bufferAttribute.count; ix++) {
			this.bufferAttribute.setXYZ(
				ix,
				this.bufferAttribute.getX(ix) + (Math.random() * 2 - 1) / 30,
				this.bufferAttribute.getY(ix) + (Math.random() * 2 - 1) / 30,
				this.bufferAttribute.getZ(ix) + (Math.random() * 2 - 1) / 30
			);
		}

		this.bufferAttribute.needsUpdate = true;*/
	}
}
