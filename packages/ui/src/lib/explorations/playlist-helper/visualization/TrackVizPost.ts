import { BookOfShadersContent } from '$lib/book-of-shaders';
import { Texture, TextureLoader, Vector2 } from 'three';

import type { IUniform } from '$lib/three';
import type { RendererParams } from '@sc/model';
import type { AudioFeaturesObject, CurrentlyPlayingContextObject } from '@sc/spotify';

const noop = () => {};
function loadAsTexture(url: string, onLoad: (texture: Texture) => void = noop): Texture {
	const loader = new TextureLoader();
	return loader.load(url, onLoad);
}

export class TrackVizContent extends BookOfShadersContent {
	private setImageUniforms = () => {
		const image = this.albumArtImg.image;
		if (image) {
			this.uniforms.u_imageResolution.value.x = image.width;
			this.uniforms.u_imageResolution.value.y = image.height;

			const imageAspect = image.width / image.height;

			const aspectRatio = this.uniforms.u_resolution.value.x / this.uniforms.u_resolution.value.y;

			const yScale = 0.8;
			this.uniforms.u_imageScale.value.x = (yScale * imageAspect) / aspectRatio;
			this.uniforms.u_imageScale.value.y = yScale;
		}
	};

	private albumArtImg = new Texture();

	constructor() {
		super();
		this.uniforms.u_albumArt = {
			type: 't',
			value: this.albumArtImg
		} as IUniform<Texture>;
		this.uniforms.u_imageResolution = {
			type: 'v2',
			value: new Vector2()
		} as IUniform<Vector2>;

		this.uniforms.u_tempo = {
			type: 'f',
			value: 120
		} as IUniform<number>;
		this.uniforms.u_imageScale = {
			type: 'v2',
			value: new Vector2()
		} as IUniform<Vector2>;
	}

	setContext(ctx: CurrentlyPlayingContextObject, analysis: AudioFeaturesObject | undefined) {
		const imageUrl = ctx?.item?.album?.images?.[0]?.url;
		if (imageUrl) {
			this.albumArtImg = loadAsTexture(imageUrl, () => {
				this.handleResize();
				this.setImageUniforms();
			});

			this.uniforms.u_albumArt = {
				type: 't',
				value: this.albumArtImg
			} as IUniform<Texture>;
		}

		if (analysis?.tempo) {
			this.uniforms.u_tempo.value = analysis?.tempo;
		}
	}

	start = (params: RendererParams) => {
		super.start(params);
	};

	onRender = () => {
		super.onRender();
	};

	stop = () => {
		super.stop();
	};

	onResize = (res: Vector2) => {
		this.setImageUniforms();
	};

	getFragmentShader =
		// language=GLSL
		() => `
			#ifdef GL_ES
precision mediump float;
			#endif

// Function to calculate brightness of a color
			float brightness(vec4 color) {
				return dot(color.rgb, vec3(0.299, 0.587, 0.114)); // Luminance formula for perceived brightness
			}

			// Function to get autumnal fallback color
			vec4 getAutumnalColor(int index) {
				vec4 autumnalColors[5];
				autumnalColors[0] = vec4(0.8, 0.4, 0.0, 1.0);  // Burnt Orange
				autumnalColors[1] = vec4(0.9, 0.6, 0.1, 1.0);  // Golden Yellow
				autumnalColors[2] = vec4(0.6, 0.2, 0.0, 1.0);  // Dark Red
				autumnalColors[3] = vec4(0.4, 0.2, 0.0, 1.0);  // Deep Brown
				autumnalColors[4] = vec4(0.9, 0.7, 0.2, 1.0);  // Mustard Yellow
				return autumnalColors[index % 5];
			}

			uniform vec2 u_resolution;
			uniform vec2 u_imageResolution;
			uniform vec2 u_imageScale;
			uniform vec2 u_mouse;
			uniform float u_time;
			uniform float u_tempo;

			uniform sampler2D u_albumArt;

			const int MAX_CIRCLES = 8;  // We'll track up to 8 circles at a time

			// Function to rotate a vector by a given angle
			mat2 rotationMatrix(float angle) {
				float s = sin(angle);
				float c = cos(angle);
				return mat2(c, -s, s, c);
			}

			// Function to interpolate between colors
			vec4 getPaletteColor(float t, vec4 colors[10]) {
				int index1 = int(floor(t * 10.0)) % 10; // Get current color index
				int index2 = (index1 + 1) % 10; // Get next color index
				float blend = fract(t * 1.0); // Linear interpolation factor
				return mix(colors[index1], colors[index2], blend); // Linear interpolation
			}

			// Function to calculate circle opacity based on its lifetime
			float circleOpacity(float timeAlive, float fadeDuration) {
				return max(0.0, 1.0 - timeAlive / fadeDuration);
			}

			void main() {
				// Normalize pixel coordinates
				vec2 st = gl_FragCoord.xy / u_resolution;

				// ---------- Background Tiled Album Art with Glitch Effect ----------
				vec4 bgColor = vec4(0.0);
				float tileSize = 0.2; // Size of each tile
				float rotationSpeed = 1.0; // Speed of rotation for each tile

				// Calculate tile coordinates
				vec2 tileIndex = floor(st / tileSize); // Index of the current tile
				vec2 tileUV = fract(st / tileSize); // Coordinates within the tile

				// Randomize rotation and distortion for each tile
				float angle = (sin(dot(tileIndex, vec2(12.9898, 78.233))) * 43758.5453) * rotationSpeed * 0.1;
				tileUV = rotationMatrix(angle) * (tileUV - 0.5) + 0.5; // Rotate around the center of the tile
				tileUV *= 1.0 + u_tempo * 0.005 * sin(u_time + dot(tileIndex, vec2(0.5, 0.5))); // Pulsing distortion

				// Sample the album art texture using the distorted tile coordinates
				vec4 colorAlbumArt = texture2D(u_albumArt, tileUV);
				bgColor = mix(bgColor, colorAlbumArt, 0.5); // Blend the album art tile

				// ---------- Orb Effect Overlay ----------
				vec2 center = vec2(0.5, 0.5);
				float speed = u_tempo * 0.0015;  // Slow down for subtle motion
				float t = u_time * speed;

				// Sideways figure-eight motion with controlled amplitude
				float x = sin(t) * 0.15;
				float y = sin(2.0 * t) * 0.15;

				// Orb position based on figure-eight motion
				vec2 orbPos = vec2(0.5 + x, 0.5 + y);
				vec2 force = (center - orbPos) * 0.1;
				orbPos += force;

				// Clamp orbPos to keep it within visible area
				orbPos = clamp(orbPos, vec2(0.2), vec2(0.8));

				// Orb color and effect
				float dist = distance(st, orbPos);
				float orbRadius = 0.02;
				float trail = smoothstep(orbRadius * 0.01, orbRadius + 0.01, dist);

				// Define color palette for the orb
				vec4 palette[10];
				palette[0] = texture2D(u_albumArt, vec2(0.1, 0.1));
				palette[1] = texture2D(u_albumArt, vec2(0.3, 0.1));
				palette[2] = texture2D(u_albumArt, vec2(0.5, 0.1));
				palette[3] = texture2D(u_albumArt, vec2(0.7, 0.1));
				palette[4] = texture2D(u_albumArt, vec2(0.9, 0.1));
				palette[5] = texture2D(u_albumArt, vec2(0.1, 0.9));
				palette[6] = texture2D(u_albumArt, vec2(0.3, 0.9));
				palette[7] = texture2D(u_albumArt, vec2(0.5, 0.9));
				palette[8] = texture2D(u_albumArt, vec2(0.7, 0.9));
				palette[9] = texture2D(u_albumArt, vec2(0.9, 0.9));

				for (int i = 0; i < 10; i++) {
					if (brightness(palette[i]) < 0.075) {
						palette[i] = getAutumnalColor(i);
					}
				}

				float timeFactor = mod(u_time * 0.05, 1.0);
				vec4 currentColor = getPaletteColor(timeFactor, palette);
				vec4 orbColor = mix(bgColor, currentColor, trail * (1.0 - dist));

				// ---------- Orb Trail Effect ----------
				float spawnInterval = 100.0 / u_tempo;
				float fadeDuration = 8000.0 * spawnInterval;

				for (int i = 0; i < MAX_CIRCLES; i++) {
					float circleSpawnTime = floor(u_time / spawnInterval) * spawnInterval - float(i) * spawnInterval;
					float timeAlive = u_time - circleSpawnTime;
					if (timeAlive > fadeDuration || timeAlive < 0.0) continue;

					float opacity = circleOpacity(timeAlive, fadeDuration);

					// Position at time of spawn
					float tAtSpawn = circleSpawnTime * speed;
					float xSpawn = sin(tAtSpawn) * 0.15;
					float ySpawn = sin(2.0 * tAtSpawn) * 0.15;
					vec2 circlePos = vec2(0.5 + xSpawn, 0.5 + ySpawn);

					vec4 circleColor = getPaletteColor(mod(circleSpawnTime * 0.05, 1.0), palette);
					float circleDist = distance(st, circlePos);
					float circleRadius = 0.03;
					float circleFade = smoothstep(circleRadius, circleRadius - 0.01, circleDist) * opacity;

					orbColor = mix(orbColor, circleColor, circleFade);
				}

				// Output the final color with the orb effect overlaying the tiled album art background
				gl_FragColor = orbColor;
			}

		`;
}
