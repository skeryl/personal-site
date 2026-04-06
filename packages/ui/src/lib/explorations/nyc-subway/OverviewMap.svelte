<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { subwayLineRoutes, stationCoords } from './subway-geodata';

	let mapContainer: HTMLDivElement;
	let map: any;
	let L: any;
	let canvasOverlay: any;

	onMount(async () => {
		L = await import('leaflet');

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		document.head.appendChild(link);
		await new Promise((r) => setTimeout(r, 100));

		map = L.map(mapContainer, {
			center: [40.7128, -73.95],
			zoom: 11,
			zoomControl: true,
			scrollWheelZoom: true
		});

		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);

		// Add distance gradient overlay
		addDistanceOverlay();

		// Draw subway lines
		for (const line of subwayLineRoutes) {
			if (line.coords.length < 2) continue;
			L.polyline(line.coords, {
				color: line.color,
				weight: 2.5,
				opacity: 0.9
			}).addTo(map);
		}

		// Add labels tile layer on top
		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
			subdomains: 'abcd',
			maxZoom: 19,
			pane: 'overlayPane'
		}).addTo(map);
	});

	onDestroy(() => {
		if (map) map.remove();
	});

	function addDistanceOverlay() {
		const DistanceGrid = L.GridLayer.extend({
			createTile(tileCoords: any) {
				const tile = document.createElement('canvas');
				const tileSize = this.getTileSize();
				tile.width = tileSize.x;
				tile.height = tileSize.y;
				const ctx = tile.getContext('2d')!;
				const imgData = ctx.createImageData(tileSize.x, tileSize.y);

				const step = 4; // compute every 4th pixel for performance
				const zoom = tileCoords.z;

				for (let py = 0; py < tileSize.y; py += step) {
					for (let px = 0; px < tileSize.x; px += step) {
						const point = L.point(tileCoords.x * tileSize.x + px, tileCoords.y * tileSize.y + py);
						const latlng = map.unproject(point, zoom);
						const lat = latlng.lat;
						const lng = latlng.lng;

						// Skip points clearly outside NYC area
						if (lat < 40.49 || lat > 40.92 || lng < -74.27 || lng > -73.68) {
							fillBlock(imgData, px, py, step, tileSize.x, 0, 0, 0, 0);
							continue;
						}

						// Find min distance to any station
						let minDist = Infinity;
						for (let i = 0; i < stationCoords.length; i++) {
							const dlat = lat - stationCoords[i][0];
							const dlng = (lng - stationCoords[i][1]) * Math.cos((lat * Math.PI) / 180);
							const d = dlat * dlat + dlng * dlng;
							if (d < minDist) minDist = d;
						}
						minDist = Math.sqrt(minDist) * 111.32; // rough km

						// Map distance to color: green (close) -> yellow -> red (far)
						// 0km = green, ~1.5km = yellow, ~3km+ = red
						const maxDist = 3.5;
						const t = Math.min(minDist / maxDist, 1);
						const [r, g, b] = distanceColor(t);
						const alpha = 100; // semi-transparent

						fillBlock(imgData, px, py, step, tileSize.x, r, g, b, alpha);
					}
				}

				ctx.putImageData(imgData, 0, 0);
				return tile;
			}
		});

		canvasOverlay = new DistanceGrid({ opacity: 0.6 });
		canvasOverlay.addTo(map);
	}

	function fillBlock(
		imgData: ImageData,
		px: number,
		py: number,
		step: number,
		width: number,
		r: number,
		g: number,
		b: number,
		a: number
	) {
		for (let dy = 0; dy < step && py + dy < imgData.height; dy++) {
			for (let dx = 0; dx < step && px + dx < imgData.width; dx++) {
				const idx = ((py + dy) * width + (px + dx)) * 4;
				imgData.data[idx] = r;
				imgData.data[idx + 1] = g;
				imgData.data[idx + 2] = b;
				imgData.data[idx + 3] = a;
			}
		}
	}

	function distanceColor(t: number): [number, number, number] {
		// Green (#2ed573) -> Yellow (#ffc048) -> Red (#ff4757)
		if (t < 0.5) {
			const s = t * 2;
			return [
				Math.round(46 + (255 - 46) * s),
				Math.round(213 + (192 - 213) * s),
				Math.round(115 + (72 - 115) * s)
			];
		} else {
			const s = (t - 0.5) * 2;
			return [
				Math.round(255 + (255 - 255) * s),
				Math.round(192 + (71 - 192) * s),
				Math.round(72 + (87 - 72) * s)
			];
		}
	}
</script>

<div class="map-wrapper">
	<div bind:this={mapContainer} class="map-container"></div>
	<div class="map-legend">
		<div class="legend-title">Subway Access</div>
		<div class="legend-gradient">
			<div class="gradient-bar"></div>
			<div class="gradient-labels">
				<span>Near station</span>
				<span>Far from station</span>
			</div>
		</div>
		<div class="legend-lines">
			<div class="legend-line-item">
				<span class="swatch" style="background: #EE352E"></span>
				<span>1/2/3</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #00933C"></span>
				<span>4/5/6</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #B933AD"></span>
				<span>7</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #2850AD"></span>
				<span>A/C/E</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #FF6319"></span>
				<span>B/D/F/M</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #6CBE45"></span>
				<span>G</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #996633"></span>
				<span>J/Z</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #A7A9AC"></span>
				<span>L</span>
			</div>
			<div class="legend-line-item">
				<span class="swatch" style="background: #FCCC0A"></span>
				<span>N/Q/R/W</span>
			</div>
		</div>
	</div>
</div>

<style>
	.map-wrapper {
		position: relative;
		width: 100%;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
		margin-top: 24px;
	}

	.map-container {
		width: 100%;
		height: 560px;
	}

	.map-legend {
		position: absolute;
		bottom: 12px;
		left: 12px;
		background: rgba(20, 20, 30, 0.92);
		padding: 12px 14px;
		border-radius: 8px;
		font-size: 12px;
		z-index: 1000;
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		max-width: 160px;
	}

	.legend-title {
		font-weight: 600;
		margin-bottom: 8px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.6);
	}

	.gradient-bar {
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(to right, #2ed573, #ffc048, #ff4757);
		margin-bottom: 4px;
	}

	.gradient-labels {
		display: flex;
		justify-content: space-between;
		font-size: 9px;
		color: rgba(255, 255, 255, 0.45);
		margin-bottom: 10px;
	}

	.legend-lines {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3px 8px;
	}

	.legend-line-item {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.75);
	}

	.swatch {
		display: inline-block;
		width: 14px;
		height: 3px;
		border-radius: 1px;
		flex-shrink: 0;
	}
</style>
