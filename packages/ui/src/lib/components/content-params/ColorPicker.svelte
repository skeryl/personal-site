<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		value: string; // hex like "#c898a2"
		onChange: (hex: string) => void;
	}

	let { value, onChange }: Props = $props();

	// ── Color conversions ──────────────────────────────────────────────────────

	function hexToRgb(hex: string): [number, number, number] {
		return [
			parseInt(hex.slice(1, 3), 16),
			parseInt(hex.slice(3, 5), 16),
			parseInt(hex.slice(5, 7), 16)
		];
	}

	function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b),
			d = max - min;
		let h = 0;
		if (d) {
			if (max === r) h = ((g - b) / d + 6) % 6;
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h *= 60;
		}
		return [Math.round(h), max ? Math.round((d / max) * 100) : 0, Math.round(max * 100)];
	}

	function hsvToHex(h: number, s: number, v: number): string {
		s /= 100;
		v /= 100;
		const f = (n: number) => {
			const k = (n + h / 60) % 6;
			return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
		};
		return '#' + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('');
	}

	function hexToHsv(hex: string): [number, number, number] {
		if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 100];
		return rgbToHsv(...hexToRgb(hex));
	}

	// ── State ──────────────────────────────────────────────────────────────────

	let [h, s, v] = hexToHsv(value);
	let hState = $state(h);
	let sState = $state(s);
	let vState = $state(v);

	// Sync when external value is changed by something else (e.g. localStorage load)
	let lastCommitted = value;
	$effect(() => {
		const current = hsvToHex(hState, sState, vState);
		if (value !== lastCommitted && value !== current) {
			lastCommitted = value;
			const [nh, ns, nv] = hexToHsv(value);
			hState = nh;
			sState = ns;
			vState = nv;
		}
	});

	function commit() {
		const hex = hsvToHex(hState, sState, vState);
		lastCommitted = hex;
		onChange(hex);
	}

	let hexDisplay = $derived(hsvToHex(hState, sState, vState));
	let rgbDisplay = $derived(hexToRgb(hexDisplay));

	// ── Square drag ────────────────────────────────────────────────────────────

	let squareEl: HTMLDivElement | undefined = $state(undefined);

	function updateSV(clientX: number, clientY: number) {
		if (!squareEl) return;
		const rect = squareEl.getBoundingClientRect();
		sState = Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100);
		vState = Math.round(
			(1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))) * 100
		);
		commit();
	}

	function onSquarePointerdown(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		updateSV(e.clientX, e.clientY);
	}

	function onSquarePointermove(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		if (!el.hasPointerCapture(e.pointerId)) return;
		updateSV(e.clientX, e.clientY);
	}

	function onSquarePointerup(e: PointerEvent) {
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	// ── EyeDropper ─────────────────────────────────────────────────────────────

	const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

	async function pickFromScreen() {
		if (!hasEyeDropper) return;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await new (window as any).EyeDropper().open();
			const hex = result.sRGBHex as string;
			const [nh, ns, nv] = hexToHsv(hex);
			hState = nh;
			sState = ns;
			vState = nv;
			commit();
		} catch {
			// user cancelled
		}
	}

	// ── Hex editing ───────────────────────────────────────────────────────────

	let hexEditing = $state(false);
	let hexEditValue = $state('');

	function startHexEdit() {
		hexEditing = true;
		hexEditValue = hexDisplay.toUpperCase();
	}

	function commitHexEdit() {
		hexEditing = false;
		let cleaned = hexEditValue.trim().replace(/^#/, '');
		// Expand 3-char shorthand: "F0A" → "FF00AA"
		if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
			cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
		}
		const hex = '#' + cleaned;
		if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
			const [nh, ns, nv] = hexToHsv(hex);
			hState = nh;
			sState = ns;
			vState = nv;
			commit();
		}
	}

	function cancelHexEdit() {
		hexEditing = false;
	}

	// ── Copy ───────────────────────────────────────────────────────────────────

	let toastVisible = $state(false);
	function copyValue(text: string) {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text);
			} else {
				// Fallback for non-secure contexts (e.g. iOS Safari over LAN HTTP)
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			}
		} catch {
			// swallow — still show toast so the UI feels responsive
		}
		toastVisible = true;
		setTimeout(() => (toastVisible = false), 2000);
	}

	// Portal action: moves the node to document.body so position:fixed
	// isn't trapped by an ancestor with backdrop-filter/transform/etc.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}
</script>

<div class="picker">
	<!-- Gradient square -->
	<div
		class="square"
		style="background: linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl({hState}deg, 100%, 50%))"
		bind:this={squareEl}
		onpointerdown={onSquarePointerdown}
		onpointermove={onSquarePointermove}
		onpointerup={onSquarePointerup}
		onpointercancel={onSquarePointerup}
		role="presentation"
	>
		<div class="selector" style="left: {sState}%; top: {100 - vState}%"></div>
	</div>

	<!-- Hue slider -->
	<input
		type="range"
		class="hue-slider"
		min="0"
		max="359"
		value={hState}
		oninput={(e) => {
			hState = Number((e.target as HTMLInputElement).value);
			commit();
		}}
	/>

	<!-- HEX + RGB display -->
	<div class="color-values">
		<div class="color-value-line">
			<span class="color-value-label">HEX:</span>
			{#if hexEditing}
				<input
					class="hex-edit-input"
					type="text"
					value={hexEditValue}
					oninput={(e) => { hexEditValue = (e.target as HTMLInputElement).value; }}
					onkeydown={(e) => {
						if (e.key === 'Enter') { e.preventDefault(); commitHexEdit(); }
						if (e.key === 'Escape') cancelHexEdit();
					}}
					onblur={commitHexEdit}
					autofocus
				/>
			{:else}
				<button
					class="color-value-pill"
					onclick={startHexEdit}
					title="Click to edit"
				>
					{hexDisplay.toUpperCase()}
				</button>
			{/if}
		</div>
		<div class="color-values-divider"></div>
		<div class="color-value-line">
			<span class="color-value-label">R:</span>
			<button
				class="color-value-pill"
onclick={() => copyValue(String(rgbDisplay[0]))}
				title="Copy R"
			>
				{rgbDisplay[0]}
			</button>
			<span class="color-value-label">G:</span>
			<button
				class="color-value-pill"
onclick={() => copyValue(String(rgbDisplay[1]))}
				title="Copy G"
			>
				{rgbDisplay[1]}
			</button>
			<span class="color-value-label">B:</span>
			<button
				class="color-value-pill"
onclick={() => copyValue(String(rgbDisplay[2]))}
				title="Copy B"
			>
				{rgbDisplay[2]}
			</button>
		</div>
	</div>
</div>

{#if toastVisible}
	<div use:portal class="copy-toast" transition:fade={{ duration: 180 }}>copied</div>
{/if}

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		padding-top: 1rem;
	}

	.square {
		position: relative;
		width: 100%;
		height: 112px;
		cursor: crosshair;
		user-select: none;
		touch-action: none;
	}

	.selector {
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid white;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.hue-slider {
		width: 100%;
		-webkit-appearance: none;
		appearance: none;
		height: 20px;
		background: transparent;
		outline: none;
		cursor: pointer;
		border: none;
		touch-action: pan-y;
		padding: 0;
	}

	.hue-slider::-webkit-slider-runnable-track {
		height: 10px;
		border-radius: 0;
		background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
		border: none;
	}

	.hue-slider::-moz-range-track {
		height: 10px;
		border-radius: 0;
		background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
		border: none;
	}

	.hue-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		margin-top: -4px;
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.25);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		cursor: pointer;
	}

	.hue-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.25);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.color-values {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 15px;
		margin-top: 11px;
		margin-bottom: 11px;
	}

	.color-values-divider {
		width: 0.75px;
		align-self: stretch;
		background: #000;
	}

	.color-value-line {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-family: 'DM Mono', monospace;
		font-size: 0.858rem;
		letter-spacing: 0.02em;
	}

	.color-value-label {
		color: #999;
	}

	.color-value-pill {
		background: #e9eef4;
		border: none;
		padding: 0.1rem 0.35rem;
		font: inherit;
		color: #444;
		cursor: pointer;
		border-radius: 0;
		-webkit-tap-highlight-color: rgba(0, 0, 0, 0.15);
		transition: background 0.1s, color 0.1s;
	}

	.color-value-pill:hover {
		color: #000;
	}

	.hex-edit-input {
		font: inherit;
		font-family: 'DM Mono', monospace;
		font-size: 0.858rem;
		padding: 0.1rem 0.35rem;
		border: 1px solid #000;
		border-radius: 0;
		background: #fff;
		color: #000;
		width: 5.5em;
		outline: none;
	}

	.color-value-pill:active {
		background: #d6dee8;
		color: #000;
	}

	.copy-toast {
		position: fixed;
		bottom: 30%;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.82);
		color: white;
		padding: 0.55rem 1.1rem;
		border-radius: 999px;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
		z-index: 1000;
		pointer-events: none;
	}
</style>
