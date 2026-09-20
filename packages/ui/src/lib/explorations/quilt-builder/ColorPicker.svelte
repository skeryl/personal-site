<script lang="ts">
	/*
	 * The design's colour picker, built rather than borrowed.
	 *
	 * `<input type="color">` opens an OS window the page has no say over, and
	 * it lands wherever the browser feels like putting it, which on a wide
	 * display is often the far side of the screen. This is a plain element, so
	 * it opens where it is asked to and looks like the rest of the app.
	 *
	 * Hue, saturation and value are the state, not the hex. Round-tripping
	 * through hex would lose the hue whenever the colour went black or grey,
	 * and the square would jump under the cursor as you dragged into a corner.
	 */

	import { untrack } from 'svelte';

	type Hsv = { h: number; s: number; v: number };

	let {
		hex,
		title = 'Color Picker',
		anchor = null,
		onpick,
		onclose
	}: {
		hex: string;
		title?: string;
		anchor?: DOMRect | null;
		onpick: (hex: string) => void;
		onclose: () => void;
	} = $props();

	/* The design's frame, to the pixel: 380x410 with a 29px title bar. */
	const W = 380;
	const H = 410;
	const MARGIN = 12;

	const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

	const hsvToHex = ({ h, s, v }: Hsv): string => {
		const channel = (n: number) => {
			const k = (n + h / 60) % 6;
			return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
		};
		return `#${[channel(5), channel(3), channel(1)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
	};

	const hexToHsv = (value: string): Hsv => {
		const n = parseInt(value.slice(1), 16);
		const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
		const max = Math.max(r, g, b);
		const span = max - Math.min(r, g, b);
		let h = 0;
		if (span) {
			if (max === r) h = ((g - b) / span) % 6;
			else if (max === g) h = (b - r) / span + 2;
			else h = (r - g) / span + 4;
			h = (h * 60 + 360) % 360;
		}
		return { h, s: max ? span / max : 0, v: max };
	};

	/*
	 * Seeded once. From here the picker owns hue, saturation and value; the
	 * parent remounts it per fabric, so there is nothing to keep in step.
	 */
	let hsv = $state<Hsv>(hexToHsv(untrack(() => hex)));
	const current = $derived(hsvToHex(hsv));

	/*
	 * Opens beside whatever was clicked, clamped into the window. The title bar
	 * then drags it, because a picker that covers the thing you are colouring
	 * is no use.
	 */
	const place = (rect: DOMRect | null) => {
		if (typeof window === 'undefined') return { x: 0, y: 0 };
		const { innerWidth: vw, innerHeight: vh } = window;
		let x = rect ? rect.right + MARGIN : (vw - W) / 2;
		if (rect && x + W + MARGIN > vw) x = rect.left - W - MARGIN;
		const y = rect ? rect.top - 40 : (vh - H) / 2;
		return {
			x: Math.max(MARGIN, Math.min(x, vw - W - MARGIN)),
			y: Math.max(MARGIN, Math.min(y, vh - H - MARGIN))
		};
	};

	let pos = $state(place(untrack(() => anchor)));

	const commit = (next: Hsv) => {
		hsv = next;
		onpick(hsvToHex(next));
	};

	/* ── The saturation/value square ──────────────────────────────── */

	let svEl = $state<HTMLDivElement | null>(null);
	let svDown = $state(false);

	const readSv = (e: PointerEvent) => {
		if (!svEl) return;
		const r = svEl.getBoundingClientRect();
		commit({
			h: hsv.h,
			s: clamp01((e.clientX - r.left) / r.width),
			v: 1 - clamp01((e.clientY - r.top) / r.height)
		});
	};

	/* ── The hue strip ────────────────────────────────────────────── */

	let hueEl = $state<HTMLDivElement | null>(null);
	let hueDown = $state(false);

	const readHue = (e: PointerEvent) => {
		if (!hueEl) return;
		const r = hueEl.getBoundingClientRect();
		/* Red at both ends, running backwards: the design's strip, sampled. */
		commit({ ...hsv, h: 360 * (1 - clamp01((e.clientY - r.top) / r.height)) });
	};

	/* ── Dragging the window by its bar ───────────────────────────── */

	let root = $state<HTMLDivElement | null>(null);
	let grab = $state<{ x: number; y: number } | null>(null);

	/*
	 * A click anywhere else puts the picker away. It waits a frame first: the
	 * pointerdown that opened the window is still travelling when the window
	 * mounts, and would otherwise close it on the spot.
	 */
	$effect(() => {
		let armed = false;
		const frame = requestAnimationFrame(() => (armed = true));
		const onDown = (e: PointerEvent) => {
			if (armed && root && !root.contains(e.target as Node)) onclose();
		};
		window.addEventListener('pointerdown', onDown);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('pointerdown', onDown);
		};
	});

	const onBarDown = (e: PointerEvent) => {
		/*
		 * Not on the close button. Capturing the pointer here would retarget
		 * the click at the bar, and the button would never fire.
		 */
		if ((e.target as HTMLElement).closest('.close')) return;
		grab = { x: e.clientX - pos.x, y: e.clientY - pos.y };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	};

	const onBarMove = (e: PointerEvent) => {
		if (!grab) return;
		pos = {
			x: Math.max(0, Math.min(e.clientX - grab.x, window.innerWidth - W)),
			y: Math.max(0, Math.min(e.clientY - grab.y, window.innerHeight - H))
		};
	};

	/* ── The hex field ────────────────────────────────────────────── */

	/* Held while the field has focus, so a half-typed hex is not overwritten. */
	let typed = $state<string | null>(null);

	const onHexInput = (e: Event & { currentTarget: HTMLInputElement }) => {
		const raw = e.currentTarget.value.replace(/^#/, '');
		typed = raw.toUpperCase();
		if (/^[0-9a-f]{6}$/i.test(raw)) commit(hexToHsv(`#${raw}`));
	};

	/* ── The eyedropper ───────────────────────────────────────────── */

	const hasDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

	const useDropper = async () => {
		try {
			const dropper = new (
				window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
			).EyeDropper();
			const { sRGBHex } = await dropper.open();
			commit(hexToHsv(sRGBHex));
		} catch {
			/* Dismissed. */
		}
	};

	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	};
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="picker-window"
	role="dialog"
	aria-label={title}
	bind:this={root}
	style="left: {pos.x}px; top: {pos.y}px"
>
	<div
		class="bar"
		role="presentation"
		onpointerdown={onBarDown}
		onpointermove={onBarMove}
		onpointerup={() => (grab = null)}
	>
		<span class="bar-title">{title}</span>
		<button class="close" onclick={onclose} aria-label="Close the color picker">
			<svg viewBox="0 0 9 9" width="9" height="9" aria-hidden="true">
				<path
					fill="#f3f3f3"
					fill-rule="evenodd"
					d="M1.09929 0.186429C0.848571 -0.0642857 0.437143 -0.0642857 0.186429 0.186429C-0.0642857 0.437143 -0.0642857 0.848572 0.186429 1.09929L3.58714 4.5L0.186429 7.90071C-0.0642857 8.15143 -0.0642857 8.55643 0.186429 8.80714C0.437143 9.05786 0.842143 9.05786 1.09286 8.80714L4.49357 5.40643L7.89429 8.80714C8.145 9.05786 8.55 9.05786 8.80071 8.80714C9.05143 8.55643 9.05143 8.15143 8.80071 7.90071L5.4 4.5L8.81357 1.09929C9.06429 0.848572 9.06429 0.443571 8.81357 0.192857C8.56286 -0.0578571 8.15786 -0.0578571 7.90714 0.192857L4.50643 3.59357L1.09929 0.186429Z"
				/>
			</svg>
		</button>
	</div>

	<div
		class="sv"
		bind:this={svEl}
		role="slider"
		tabindex="0"
		aria-label="Saturation and brightness"
		aria-valuemin="0"
		aria-valuemax="100"
		aria-valuenow={Math.round(hsv.s * 100)}
		aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
		style="--hue: {hsv.h}"
		onpointerdown={(e) => {
			svDown = true;
			e.currentTarget.setPointerCapture(e.pointerId);
			readSv(e);
		}}
		onpointermove={(e) => svDown && readSv(e)}
		onpointerup={() => (svDown = false)}
	>
		<span class="sv-dot" style="left: {hsv.s * 100}%; top: {(1 - hsv.v) * 100}%"></span>
	</div>

	<div
		class="hue"
		bind:this={hueEl}
		role="slider"
		tabindex="0"
		aria-label="Hue"
		aria-valuemin="0"
		aria-valuemax="360"
		aria-valuenow={Math.round(hsv.h)}
		onpointerdown={(e) => {
			hueDown = true;
			e.currentTarget.setPointerCapture(e.pointerId);
			readHue(e);
		}}
		onpointermove={(e) => hueDown && readHue(e)}
		onpointerup={() => (hueDown = false)}
	></div>

	<svg class="hue-marker" viewBox="0 0 11 12" style="top: {39 + (1 - hsv.h / 360) * 319}px">
		<polygon points="0.5,6 10.5,0.5 10.5,11.5" fill="#fafafa" stroke="#000" />
	</svg>

	<div class="hex-row">
		<span class="hex-label">Hex code:</span>
		<input
			class="hex-chip"
			type="text"
			maxlength="7"
			spellcheck="false"
			aria-label="Hex code"
			value={typed ?? current.slice(1).toUpperCase()}
			oninput={onHexInput}
			onblur={() => (typed = null)}
			onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
		/>
		{#if hasDropper}
			<button class="dropper" onclick={useDropper} aria-label="Pick a color from the screen">
				<svg viewBox="0 0 13 13" width="13" height="13" aria-hidden="true">
					<path
						fill="#f3f3f3"
						d="M12.9987 1.625C12.9987 1.1908 12.8297 0.7826 12.5229 0.4758C12.2161 0.169 11.8079 0 11.3737 0C10.9395 0 10.5313 0.169 10.2245 0.4758L8.7425 1.9578L8.3993 1.6146C8.2173 1.4326 7.9742 1.3325 7.7168 1.3325C7.4594 1.3325 7.2163 1.4326 7.0343 1.6146L5.9475 2.7014C5.8682 2.7807 5.8682 2.9094 5.9475 2.9887L7.1175 4.1587L1.3728 9.9034C1.0634 10.2128 0.9451 10.6626 1.0569 11.0799L0.1781 11.9587C0.0637 12.0731 -0.0013 12.2265 -0.0013 12.389C-0.0013 12.5515 0.0624 12.7049 0.1781 12.8193C0.2925 12.935 0.4459 12.9987 0.6084 12.9987C0.7709 12.9987 0.9243 12.935 1.0387 12.8193L1.9175 11.9405C2.0202 11.9678 2.1268 11.9821 2.2334 11.9821C2.5584 11.9821 2.8652 11.8547 3.0953 11.6246L8.8426 5.8773L10.0126 7.0473C10.0516 7.0863 10.1036 7.1071 10.1569 7.1071C10.2102 7.1071 10.2609 7.0876 10.3012 7.0473L11.388 5.9605C11.57 5.7785 11.6701 5.5354 11.6701 5.278C11.6701 5.0206 11.57 4.7775 11.388 4.5955L11.0448 4.2523L12.5268 2.7703C12.8336 2.4635 13.0026 2.0553 13.0026 1.6211L12.9987 1.625ZM2.8093 11.3399C2.6559 11.4933 2.4518 11.5778 2.2347 11.5778C2.1333 11.5778 2.0332 11.5596 1.9383 11.5219C1.8629 11.492 1.7784 11.5102 1.7212 11.5674L0.754 12.5346C0.715 12.5736 0.6643 12.5944 0.6097 12.5944C0.5551 12.5944 0.5044 12.5736 0.4654 12.5346C0.4264 12.4956 0.4056 12.4449 0.4056 12.3903C0.4056 12.3357 0.4264 12.285 0.4654 12.246L1.4326 11.2788C1.4898 11.2216 1.508 11.1358 1.4781 11.0604C1.3598 10.7601 1.4313 10.4169 1.6601 10.1894L4.3355 7.514H6.6339L2.8093 11.3386V11.3399ZM7.0395 7.1097H4.7411L7.4061 4.4447L8.5553 5.5939L7.0395 7.1097ZM11.0994 4.8854C11.3178 5.1038 11.3178 5.4574 11.0994 5.6758L10.1569 6.6183L6.383 2.8431L7.3255 1.9006C7.5439 1.6822 7.8975 1.6822 8.1159 1.9006L11.1007 4.8854H11.0994ZM10.7549 3.9676L9.0311 2.2438L10.5118 0.7618C10.7419 0.5317 11.0474 0.4043 11.3737 0.4043C11.7 0.4043 12.0055 0.5317 12.2356 0.7618C12.4657 0.9919 12.5918 1.2974 12.5918 1.6237C12.5918 1.95 12.4657 2.2555 12.2356 2.4856L10.7549 3.9676Z"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	/*
	 * Laid out by coordinate rather than by flow: every number here is read
	 * straight off the design's 380x410 frame.
	 */
	.picker-window {
		position: fixed;
		z-index: 40;
		width: 380px;
		height: 410px;
		background: #444343;
		font-family: var(--qb-mono);
		user-select: none;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
	}

	.bar {
		position: absolute;
		inset: 0 0 auto 0;
		height: 29px;
		background: #3c3c3c;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: grab;
		touch-action: none;
	}
	.bar:active {
		cursor: grabbing;
	}
	.bar-title {
		font-size: 10px;
		line-height: 20px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #fff;
	}
	.close {
		position: absolute;
		right: 15px;
		top: 10px;
		width: 9px;
		height: 9px;
		padding: 0;
		border: none;
		background: none;
		line-height: 0;
		cursor: pointer;
	}

	/* White across the top, hue on the right, black at the bottom. */
	.sv {
		position: absolute;
		left: 14px;
		top: 39px;
		width: 318px;
		height: 319px;
		cursor: crosshair;
		touch-action: none;
		background:
			linear-gradient(to bottom, rgba(0, 0, 0, 0), #000),
			linear-gradient(to right, #fff, rgba(255, 255, 255, 0)), hsl(var(--hue) 100% 50%);
	}
	.sv:focus-visible,
	.hue:focus-visible {
		outline: 1px solid #fff;
		outline-offset: 1px;
	}
	.sv-dot {
		position: absolute;
		width: 14px;
		height: 14px;
		margin: -7px 0 0 -7px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
		pointer-events: none;
	}

	.hue {
		position: absolute;
		left: 338px;
		top: 39px;
		width: 25px;
		height: 319px;
		cursor: ns-resize;
		touch-action: none;
		background: linear-gradient(
			to bottom,
			#f00 0%,
			#f0f 16.667%,
			#00f 33.333%,
			#0ff 50%,
			#0f0 66.667%,
			#ff0 83.333%,
			#f00 100%
		);
	}
	/* Apex on the strip's right edge, 11x12, measured off the design. */
	.hue-marker {
		position: absolute;
		left: 363px;
		width: 11px;
		height: 12px;
		margin-top: -6px;
		pointer-events: none;
	}

	.hex-row {
		position: absolute;
		left: 18px;
		right: 15px;
		top: 370px;
		height: 20px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.hex-label {
		font-size: 10px;
		line-height: 20px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--qb-line);
	}
	.hex-chip {
		width: 51px;
		height: 17px;
		padding: 0 4px;
		border: none;
		background: var(--qb-wall);
		font: inherit;
		font-size: 10px;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #000;
		text-align: center;
	}
	.hex-chip:focus {
		outline: 1px solid #fff;
		outline-offset: 1px;
	}
	.dropper {
		width: 13px;
		height: 13px;
		margin-left: auto;
		padding: 0;
		border: none;
		background: none;
		line-height: 0;
		cursor: pointer;
		opacity: 0.85;
	}
	.dropper:hover {
		opacity: 1;
	}
</style>
