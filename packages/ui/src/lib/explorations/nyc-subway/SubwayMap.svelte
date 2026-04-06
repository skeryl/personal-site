<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ProposedLine, UnderservedArea } from './data';

  export let proposedLines: ProposedLine[] = [];
  export let underservedAreas: UnderservedArea[] = [];
  export let selectedLine: ProposedLine | null = null;
  export let onSelectLine: (line: ProposedLine | null) => void = () => {};

  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  let lineLayerGroup: any;
  let markerLayerGroup: any;

  onMount(async () => {
    L = await import('leaflet');

    // Import leaflet CSS via a link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Wait briefly for CSS to load
    await new Promise((r) => setTimeout(r, 100));

    map = L.map(mapContainer, {
      center: [40.7128, -73.95],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    lineLayerGroup = L.layerGroup().addTo(map);
    markerLayerGroup = L.layerGroup().addTo(map);

    drawLines();
    drawMarkers();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function drawLines() {
    if (!lineLayerGroup || !L) return;
    lineLayerGroup.clearLayers();

    for (const line of proposedLines) {
      const isSelected = selectedLine?.id === line.id;
      const polyline = L.polyline(line.route, {
        color: line.color,
        weight: isSelected ? 6 : 3,
        opacity: selectedLine && !isSelected ? 0.3 : 0.85,
        dashArray: line.status === 'advocacy' ? '8 6' : undefined,
      }).addTo(lineLayerGroup);

      polyline.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px;">
          <strong style="font-size: 14px;">${line.name}</strong><br/>
          <span style="color: #aaa; font-size: 12px;">${line.lengthMiles} miles &middot; ${line.status.replace('_', ' ')}</span>
          <hr style="border-color: #333; margin: 6px 0;" />
          <div style="font-size: 12px; line-height: 1.4;">${line.description.slice(0, 120)}...</div>
        </div>
      `);

      polyline.on('click', () => {
        onSelectLine(isSelected ? null : line);
      });
    }
  }

  function drawMarkers() {
    if (!markerLayerGroup || !L) return;
    markerLayerGroup.clearLayers();

    for (const area of underservedAreas) {
      const marker = L.circleMarker([area.lat, area.lng], {
        radius: Math.min(Math.sqrt(area.population / 1000) * 3, 14),
        fillColor: '#ff4757',
        color: '#ff6b81',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.5,
      }).addTo(markerLayerGroup);

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 180px;">
          <strong>${area.name}</strong><br/>
          <span style="color: #aaa; font-size: 12px;">${area.borough}</span>
          <hr style="border-color: #333; margin: 6px 0;" />
          <div style="font-size: 12px; line-height: 1.5;">
            <div>Population: <strong>${area.population.toLocaleString()}</strong></div>
            <div>Nearest station: <strong>${area.nearestStationMiles} mi</strong></div>
            <div>Median income: <strong>$${area.medianIncome.toLocaleString()}</strong></div>
          </div>
        </div>
      `);
    }
  }

  $: if (map && L) {
    drawLines();
  }

  $: if (selectedLine && map) {
    const bounds = L.latLngBounds(selectedLine.route);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
</script>

<div class="map-wrapper">
  <div bind:this={mapContainer} class="map-container"></div>
  <div class="map-legend">
    <div class="legend-title">Map Legend</div>
    <div class="legend-item">
      <span class="legend-line solid"></span>
      <span>Planned line</span>
    </div>
    <div class="legend-item">
      <span class="legend-line dashed"></span>
      <span>Advocacy / proposed</span>
    </div>
    <div class="legend-item">
      <span class="legend-dot"></span>
      <span>Underserved area</span>
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
  }

  .map-container {
    width: 100%;
    height: 500px;
  }

  .map-legend {
    position: absolute;
    bottom: 12px;
    left: 12px;
    background: rgba(20, 20, 30, 0.9);
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 1000;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .legend-title {
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.6);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
    color: rgba(255, 255, 255, 0.85);
  }

  .legend-line {
    display: inline-block;
    width: 24px;
    height: 3px;
    background: #f39c12;
  }

  .legend-line.dashed {
    background: repeating-linear-gradient(
      90deg,
      #f39c12 0px,
      #f39c12 6px,
      transparent 6px,
      transparent 10px
    );
  }

  .legend-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 71, 87, 0.5);
    border: 1px solid #ff6b81;
  }
</style>
