<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	let canvas: HTMLCanvasElement;
	let renderer: THREE.WebGLRenderer;
	let animFrame: number;

	const CAR_COUNT = 2;
	const G_GREEN = 0x6cbe45;

	onMount(() => {
		const width = 56;
		const height = 500;

		const scene = new THREE.Scene();
		scene.background = null;

		const aspect = width / height;
		const viewSize = 22;
		const camera = new THREE.OrthographicCamera(
			-viewSize * aspect,
			viewSize * aspect,
			viewSize,
			-viewSize,
			0.1,
			100
		);
		camera.position.set(0, 14, 1.2);
		camera.lookAt(0, 0, 0);

		renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.1;

		scene.add(new THREE.AmbientLight(0xdde4f0, 0.7));
		const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
		keyLight.position.set(2, 10, 4);
		scene.add(keyLight);
		const rimLight = new THREE.DirectionalLight(0x6688cc, 0.35);
		rimLight.position.set(-3, 6, -3);
		scene.add(rimLight);

		const train = new THREE.Group();

		const bodyW = 3.4;
		const bodyLen = bodyW * (60.5 / 10); // real subway car aspect ratio: 60'6" × 10'
		const bodyH = 1.0;
		const carSpacing = bodyLen + 0.2;
		const totalLen = carSpacing * CAR_COUNT;
		const startZ = (totalLen - carSpacing) / 2;

		for (let c = 0; c < CAR_COUNT; c++) {
			const carGroup = buildCar(bodyLen, bodyW, bodyH, c === 0);
			carGroup.position.z = startZ - c * carSpacing;
			train.add(carGroup);

			if (c < CAR_COUNT - 1) {
				const coupler = new THREE.Mesh(
					new THREE.BoxGeometry(0.3, 0.12, 0.18),
					new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 })
				);
				coupler.position.set(0, bodyH * 0.1, startZ - c * carSpacing - bodyLen / 2 - 0.1);
				train.add(coupler);
			}
		}

		scene.add(train);

		let time = 0;
		function animate() {
			time += 0.008;
			train.rotation.y = Math.sin(time * 0.3) * 0.008;
			train.children.forEach((child, i) => {
				if (child.userData.isCar) {
					child.position.x = Math.sin(time * 0.5 + i * 0.4) * 0.005;
				}
			});
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(animate);
		}
		animate();
	});

	function buildCar(bodyLen: number, bodyW: number, bodyH: number, isHead: boolean): THREE.Group {
		const car = new THREE.Group();
		car.userData.isCar = true;

		const silverBody = new THREE.MeshStandardMaterial({
			color: 0xc0c0c4,
			metalness: 0.75,
			roughness: 0.25
		});
		const darkMetal = new THREE.MeshStandardMaterial({
			color: 0x222222,
			metalness: 0.9,
			roughness: 0.5
		});

		// Main body — rectangular box
		const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH * 0.65, bodyLen);
		bodyGeo.translate(0, bodyH * 0.325, 0);
		car.add(new THREE.Mesh(bodyGeo, silverBody));

		// Flat roof with slight crown
		const roofGeo = new THREE.BoxGeometry(bodyW, bodyH * 0.08, bodyLen);
		const roof = new THREE.Mesh(
			roofGeo,
			new THREE.MeshStandardMaterial({
				color: 0xb0b0b4,
				metalness: 0.6,
				roughness: 0.35
			})
		);
		roof.position.y = bodyH * 0.69;
		car.add(roof);

		// Longitudinal ridges on roof (the striations visible from above)
		const ridgeMat = new THREE.MeshStandardMaterial({
			color: 0xa0a0a4,
			metalness: 0.7,
			roughness: 0.3
		});
		for (let i = -2; i <= 2; i++) {
			const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, bodyLen * 0.95), ridgeMat);
			ridge.position.set(i * (bodyW * 0.18), bodyH * 0.74, 0);
			car.add(ridge);
		}

		// AC units on roof (rectangular boxes)
		const acMat = new THREE.MeshStandardMaterial({
			color: 0x888888,
			metalness: 0.7,
			roughness: 0.35
		});
		for (const zOff of [-bodyLen * 0.25, bodyLen * 0.25]) {
			const ac = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.4, 0.1, bodyLen * 0.25), acMat);
			ac.position.set(0, bodyH * 0.78, zOff);
			car.add(ac);
		}

		// Side panels (corrugated appearance — subtle vertical lines)
		const sideMat = new THREE.MeshStandardMaterial({
			color: 0xb8b8bc,
			metalness: 0.8,
			roughness: 0.2
		});
		for (const xSign of [-1, 1]) {
			const side = new THREE.Mesh(new THREE.BoxGeometry(0.02, bodyH * 0.55, bodyLen), sideMat);
			side.position.set((xSign * bodyW) / 2, bodyH * 0.35, 0);
			car.add(side);
		}

		// Windows — dark strip with panes
		const winStripMat = new THREE.MeshStandardMaterial({
			color: 0x181828,
			metalness: 0.1,
			roughness: 0.6
		});
		const paneMat = new THREE.MeshStandardMaterial({
			color: 0x2a3a55,
			metalness: 0.3,
			roughness: 0.15,
			emissive: 0x1a2840,
			emissiveIntensity: 0.4
		});

		for (const xSign of [-1, 1]) {
			const strip = new THREE.Mesh(
				new THREE.BoxGeometry(0.025, bodyH * 0.24, bodyLen * 0.88),
				winStripMat
			);
			strip.position.set(xSign * (bodyW / 2 + 0.008), bodyH * 0.46, 0);
			car.add(strip);

			for (let i = -5; i <= 5; i++) {
				const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, bodyH * 0.18, 1.0), paneMat);
				pane.position.set(xSign * (bodyW / 2 + 0.015), bodyH * 0.48, i * (bodyLen * 0.08));
				car.add(pane);
			}

			// G train green stripe
			const stripe = new THREE.Mesh(
				new THREE.BoxGeometry(0.025, 0.06, bodyLen * 0.92),
				new THREE.MeshStandardMaterial({
					color: G_GREEN,
					emissive: G_GREEN,
					emissiveIntensity: 0.2
				})
			);
			stripe.position.set(xSign * (bodyW / 2 + 0.005), bodyH * 0.17, 0);
			car.add(stripe);
		}

		// Head car details
		if (isHead) {
			const front = new THREE.Mesh(
				new THREE.BoxGeometry(bodyW * 0.9, bodyH * 0.5, 0.05),
				new THREE.MeshStandardMaterial({ color: 0x2a2a35, metalness: 0.5, roughness: 0.4 })
			);
			front.position.set(0, bodyH * 0.33, bodyLen / 2 + 0.02);
			car.add(front);

			// Route circle (green G)
			const plate = new THREE.Mesh(
				new THREE.CircleGeometry(0.2, 16),
				new THREE.MeshStandardMaterial({
					color: G_GREEN,
					emissive: G_GREEN,
					emissiveIntensity: 0.6
				})
			);
			plate.position.set(0, bodyH * 0.36, bodyLen / 2 + 0.05);
			car.add(plate);

			// Windshield
			const ws = new THREE.Mesh(
				new THREE.BoxGeometry(bodyW * 0.45, bodyH * 0.2, 0.025),
				new THREE.MeshStandardMaterial({
					color: 0x1a2a40,
					metalness: 0.2,
					roughness: 0.1,
					emissive: 0x0a1a30,
					emissiveIntensity: 0.3
				})
			);
			ws.position.set(0, bodyH * 0.55, bodyLen / 2 + 0.035);
			car.add(ws);

			// Headlights
			for (const xSign of [-1, 1]) {
				const hl = new THREE.Mesh(
					new THREE.CircleGeometry(0.08, 8),
					new THREE.MeshStandardMaterial({
						color: 0xffffee,
						emissive: 0xffffcc,
						emissiveIntensity: 0.8
					})
				);
				hl.position.set(xSign * bodyW * 0.33, bodyH * 0.25, bodyLen / 2 + 0.05);
				car.add(hl);
			}
		}

		// Trucks/bogies (dark undercarriage)
		for (const zPos of [bodyLen * 0.3, -bodyLen * 0.3]) {
			const truck = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 1.02, 0.12, 0.55), darkMetal);
			truck.position.set(0, -0.02, zPos);
			car.add(truck);
		}

		return car;
	}

	onDestroy(() => {
		if (animFrame) cancelAnimationFrame(animFrame);
		if (renderer) renderer.dispose();
	});
</script>

<canvas bind:this={canvas} class="train-canvas"></canvas>

<style>
	.train-canvas {
		width: 56px;
		height: 500px;
		display: block;
	}
</style>
