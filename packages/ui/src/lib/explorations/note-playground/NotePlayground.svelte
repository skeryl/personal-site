<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { DefaultKeyMapping, Pitch, PitchInformation } from '@sc/synth-builder/src/model/notes';
	import { MutableAudioNode as AudioGraphNode } from '@sc/synth-builder/src/core/nodes/MutableAudioNode';
	import { MutableAudioGraph } from '@sc/synth-builder/src/core/nodes/MutableAudioGraph';
	import { NodeTypes } from '@sc/synth-builder/src/model/nodes';
	import { Synth } from '@sc/synth-builder/src/core/Synth';

	/* ── constants ──────────────────────────────────────────── */

	const ALL_PITCHES = Object.values(Pitch);
	const PITCH_INDEX = new Map<Pitch, number>(ALL_PITCHES.map((p, i) => [p, i]));
	const PITCH_INFO = Object.entries(PitchInformation);
	const MIN_PLAYABLE_IDX = 35; /* B2 */
	const MAX_PLAYABLE_IDX = 66; /* F#5 */
	const PLAYABLE_RANGE = MAX_PLAYABLE_IDX - MIN_PLAYABLE_IDX;
	const MAX_PARTICLES = 3000;
	const ORB_RADIUS = 40;

	/* ── audio graph ────────────────────────────────────────── */

	function getAudioGraph() {
		const osc = AudioGraphNode.createOscillator().setProperty('type', 'triangle');
		return MutableAudioGraph.create(
			osc.connect(
				AudioGraphNode.createGain()
					.setProperty('maxGain', 0.06)
					.connect(
						AudioGraphNode.create(NodeTypes.Analyser)
							.setProperty('minDecibels', -70)
							.setProperty('fftSize', 256)
							.setProperty('smoothingTimeConstant', 0.8)
							.connect(AudioGraphNode.createDestination())
					)
			)
		);
	}

	type SynthPitchNodes = {
		oscillators: { node: OscillatorNode }[];
		gains: { node: GainNode }[];
		analysers: { node: AnalyserNode }[];
		pitch: Pitch;
	};
	function getSynthPitches(s: Synth): Map<Pitch, SynthPitchNodes> {
		return (s as unknown as { pitches: Map<Pitch, SynthPitchNodes> }).pitches;
	}

	/* ── color helpers (circle of fifths) ───────────────────── */

	function pitchToHue(pitchNorm: number): number {
		const pitchIdx = Math.round(pitchNorm * PLAYABLE_RANGE + MIN_PLAYABLE_IDX);
		const semitone = ((pitchIdx % 12) + 12) % 12;
		return ((semitone * 7) % 12) / 12;
	}

	function hslToCSS(h: number, s: number, l: number, a = 1): string {
		return `hsla(${(h * 360).toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%, ${a})`;
	}

	/* ── distance → pitch ───────────────────────────────────── */

	function distanceToPitch(nx: number, ny: number): { pitch: Pitch; pitchNorm: number } {
		const dx = nx - 0.5, dy = ny - 0.5;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const norm = Math.max(0, Math.min(1, dist / 0.5));
		const idx = Math.round(norm * PLAYABLE_RANGE + MIN_PLAYABLE_IDX);
		const clamped = Math.max(MIN_PLAYABLE_IDX, Math.min(MAX_PLAYABLE_IDX, idx));
		const pitch = ALL_PITCHES[clamped];
		return { pitch, pitchNorm: (clamped - MIN_PLAYABLE_IDX) / PLAYABLE_RANGE };
	}

	/* ── note orb ───────────────────────────────────────────── */

	interface NoteOrb {
		id: string;
		x: number; y: number; /* normalized 0-1 */
		pitch: Pitch;
		pitchNorm: number;
		hue: number;
		dragging: boolean;
		birthTime: number;
		keyboard: boolean; /* true = created by keyboard, auto-removed on keyup */
	}

	/* ── particle ───────────────────────────────────────────── */

	interface Particle {
		x: number; y: number;
		vx: number; vy: number;
		life: number;
		hue: number;
		orbId: string;
	}

	/* ── state ──────────────────────────────────────────────── */

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let w = 0, h = 0;
	let animId = 0;
	let audioUnlocked = false;

	const orbs: NoteOrb[] = [];
	const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
		x: 0, y: 0, vx: 0, vy: 0, life: 0, hue: 0, orbId: ''
	}));

	let synth: Synth;
	let lastTime = 0;
	let bgHue = 0;
	let turbulence = 0.2;
	let particleSize = 1;
	let sustainTime = 0; /* 0 = infinite */

	/* ── synth setup ────────────────────────────────────────── */

	function initSynth() {
		const s = new Synth(getAudioGraph(), {
			attack: 0.95,
			release: 0.8,
			unison: 2,
			unisonDetune: 0.12
		});
		const releasing = (s as unknown as { releasing: { onDelete: (pitch: Pitch, params: AudioParam[]) => void } }).releasing;
		releasing.onDelete = (pitch: Pitch) => {
			const pitches = getSynthPitches(s);
			const nodes = pitches.get(pitch);
			if (nodes) {
				nodes.oscillators.forEach((o) => { try { o.node.stop(); o.node.disconnect(); } catch { /* */ } });
				nodes.gains.forEach((g) => { try { g.node.disconnect(); } catch { /* */ } });
				nodes.analysers.forEach((a) => { try { a.node.disconnect(); } catch { /* */ } });
				pitches.delete(pitch);
			}
		};
		return s;
	}

	function unlockAudio() {
		if (audioUnlocked) return;
		const c = synth.context;
		c.resume();
		const buf = c.createBuffer(1, 1, c.sampleRate);
		const src = c.createBufferSource();
		src.buffer = buf;
		src.connect(c.destination);
		src.start();
		audioUnlocked = true;
	}

	/* ── orb management ─────────────────────────────────────── */

	let orbIdCounter = 0;

	/** Convert a pitch to a canvas position on a ring around center */
	function pitchToPosition(pitch: Pitch): { x: number; y: number } {
		const idx = PITCH_INDEX.get(pitch) ?? MIN_PLAYABLE_IDX;
		const norm = Math.max(0, Math.min(1, (idx - MIN_PLAYABLE_IDX) / PLAYABLE_RANGE));
		const radius = norm * 0.45 + 0.05; /* 0.05 at center, 0.5 at edge */
		const semitone = ((idx % 12) + 12) % 12;
		const angle = (semitone / 12) * Math.PI * 2 - Math.PI / 2; /* 12 o'clock = C */
		return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
	}

	function addOrb(nx: number, ny: number, keyboard = false, pitch?: Pitch) {
		unlockAudio();
		let p: Pitch, pn: number;
		if (pitch) {
			p = pitch;
			const idx = PITCH_INDEX.get(pitch) ?? MIN_PLAYABLE_IDX;
			pn = Math.max(0, Math.min(1, (idx - MIN_PLAYABLE_IDX) / PLAYABLE_RANGE));
		} else {
			({ pitch: p, pitchNorm: pn } = distanceToPitch(nx, ny));
		}
		const orb: NoteOrb = {
			id: `orb-${orbIdCounter++}`,
			x: nx, y: ny,
			pitch: p, pitchNorm: pn,
			hue: pitchToHue(pn),
			dragging: false,
			birthTime: performance.now(),
			keyboard
		};
		orbs.push(orb);
		synth.startPlaying(p);
		return orb;
	}

	/** Check if any orb (other than `exclude`) is playing this pitch */
	function isPitchInUse(pitch: Pitch, exclude?: NoteOrb): boolean {
		return orbs.some((o) => o !== exclude && o.pitch === pitch);
	}

	function removeOrb(orb: NoteOrb) {
		const idx = orbs.indexOf(orb);
		if (idx >= 0) orbs.splice(idx, 1);
		/* only stop the pitch if no other orb still needs it */
		if (!isPitchInUse(orb.pitch)) {
			synth.stopPlaying(orb.pitch);
		}
	}

	function removeAllOrbs() {
		const pitchesToStop = new Set(orbs.map((o) => o.pitch));
		orbs.length = 0;
		for (const p of pitchesToStop) synth.stopPlaying(p);
	}

	function updateOrbPitch(orb: NoteOrb) {
		const oldPitch = orb.pitch;
		const { pitch, pitchNorm } = distanceToPitch(orb.x, orb.y);
		if (pitch !== oldPitch) {
			orb.pitch = pitch;
			orb.pitchNorm = pitchNorm;
			orb.hue = pitchToHue(pitchNorm);
			if (!isPitchInUse(oldPitch)) synth.stopPlaying(oldPitch);
			synth.startPlaying(pitch);
		}
	}

	function hitTestOrb(nx: number, ny: number): NoteOrb | undefined {
		const orbR = ORB_RADIUS / Math.max(w, 1);
		for (let i = orbs.length - 1; i >= 0; i--) {
			const o = orbs[i];
			const dx = o.x - nx, dy = o.y - ny;
			if (Math.sqrt(dx * dx + dy * dy) < orbR) return o;
		}
		return undefined;
	}

	/* ── pointer events ─────────────────────────────────────── */

	let activeOrb: NoteOrb | null = null;
	let pointerDownPos = { x: 0, y: 0 };
	let lastTapOrb: NoteOrb | null = null;
	let lastTapTime = 0;
	const DOUBLE_TAP_MS = 400;

	function norm(e: PointerEvent): { nx: number; ny: number } {
		const rect = canvas.getBoundingClientRect();
		return { nx: (e.clientX - rect.left) / rect.width, ny: (e.clientY - rect.top) / rect.height };
	}

	function onPointerDown(e: PointerEvent) {
		const { nx, ny } = norm(e);
		pointerDownPos = { x: nx, y: ny };
		const hit = hitTestOrb(nx, ny);
		if (hit) {
			hit.dragging = true;
			activeOrb = hit;
		} else {
			addOrb(nx, ny);
		}
		canvas.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!activeOrb || !activeOrb.dragging) return;
		const { nx, ny } = norm(e);
		activeOrb.x = Math.max(0, Math.min(1, nx));
		activeOrb.y = Math.max(0, Math.min(1, ny));
		updateOrbPitch(activeOrb);
	}

	function onPointerUp(e: PointerEvent) {
		if (activeOrb) {
			const { nx, ny } = norm(e);
			const dx = nx - pointerDownPos.x, dy = ny - pointerDownPos.y;
			const wasTap = Math.sqrt(dx * dx + dy * dy) < 0.02;
			if (wasTap) {
				const now = performance.now();
				if (lastTapOrb === activeOrb && now - lastTapTime < DOUBLE_TAP_MS) {
					/* double-tap → delete */
					removeOrb(activeOrb);
					lastTapOrb = null;
				} else {
					lastTapOrb = activeOrb;
					lastTapTime = now;
				}
			}
			activeOrb.dragging = false;
			activeOrb = null;
		}
	}

	/* ── keyboard input ─────────────────────────────────────── */

	const heldKeys = new Map<string, NoteOrb>(); /* e.code → orb */

	function onKeyDown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
		if (heldKeys.has(e.code)) return;
		const pitch = DefaultKeyMapping[e.key.toLowerCase()];
		if (!pitch) return;

		/* place the orb at a position derived from the pitch */
		const pos = pitchToPosition(pitch);
		const orb = addOrb(pos.x, pos.y, true, pitch);
		heldKeys.set(e.code, orb);
	}

	function onKeyUp(e: KeyboardEvent) {
		const orb = heldKeys.get(e.code);
		if (!orb) return;
		/* remove all keys for the same pitch (keyboard ghosting cleanup) */
		for (const [code, o] of heldKeys) {
			if (o.pitch === orb.pitch) heldKeys.delete(code);
		}
		removeOrb(orb);
	}

	function onWindowBlur() {
		for (const [, orb] of heldKeys) removeOrb(orb);
		heldKeys.clear();
	}

	/* ── consonance (for turbulence) ────────────────────────── */

	function consonance(a: number, b: number): number {
		const hzA = 130.81 * Math.pow(2, a * (PLAYABLE_RANGE / 12));
		const hzB = 130.81 * Math.pow(2, b * (PLAYABLE_RANGE / 12));
		const ratio = hzA > hzB ? hzA / hzB : hzB / hzA;
		const simple = [1, 2, 1.5, 4 / 3, 5 / 4, 5 / 3, 6 / 5];
		let best = 1;
		for (const r of simple) { const d = Math.abs(ratio - r); if (d < best) best = d; }
		return 1.0 - Math.min(best * 4, 1.0);
	}

	/* ── render loop ────────────────────────────────────────── */

	function tick(timestamp: number) {
		if (!ctx) { animId = requestAnimationFrame(tick); return; }

		const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
		lastTime = timestamp;
		const time = timestamp / 1000;

		/* sustain expiry */
		if (sustainTime > 0) {
			const now = performance.now();
			for (let i = orbs.length - 1; i >= 0; i--) {
				if (now - orbs[i].birthTime > sustainTime * 1000) removeOrb(orbs[i]);
			}
		}

		/* compute discordance */
		let disc = 0, pairs = 0;
		for (let a = 0; a < orbs.length; a++) {
			for (let b = a + 1; b < orbs.length; b++) {
				disc += 1 - consonance(orbs[a].pitchNorm, orbs[b].pitchNorm);
				pairs++;
			}
		}
		if (pairs > 0) disc /= pairs;
		const turb = turbulence + disc * 0.5;

		/* emit particles */
		const emitPerOrb = Math.ceil(6 * delta * 60);
		for (const orb of orbs) {
			let emitted = 0;
			for (let p = 0; p < MAX_PARTICLES && emitted < emitPerOrb; p++) {
				if (particles[p].life > 0) continue;
				const angle = Math.random() * Math.PI * 2;
				const spread = 4 / Math.max(w, 1);
				particles[p] = {
					x: orb.x + Math.cos(angle) * spread,
					y: orb.y + Math.sin(angle) * spread,
					vx: Math.cos(angle) * 0.002 + (Math.random() - 0.5) * 0.001,
					vy: Math.sin(angle) * 0.002 + (Math.random() - 0.5) * 0.001,
					life: 0.7 + Math.random() * 0.5,
					hue: orb.hue,
					orbId: orb.id
				};
				emitted++;
			}
		}

		/* update particles */
		for (let p = 0; p < MAX_PARTICLES; p++) {
			const pt = particles[p];
			if (pt.life <= 0) continue;

			/* turbulence */
			pt.vx += Math.sin(pt.y * 12 + time * 2) * turb * 0.0004;
			pt.vy += Math.cos(pt.x * 12 + time * 2) * turb * 0.0004;

			/* gravity toward ALL orbs — stronger pull from others, gentle orbit around own */
			for (const orb of orbs) {
				const dx = orb.x - pt.x, dy = orb.y - pt.y;
				const dist2 = dx * dx + dy * dy + 0.0001;
				const isOwn = orb.id === pt.orbId;
				const force = (isOwn ? 0.000003 : 0.000008) / dist2;
				pt.vx += dx * force;
				pt.vy += dy * force;
				/* add slight tangential velocity for orbital drift around nearby orbs */
				if (!isOwn) {
					const dist = Math.sqrt(dist2);
					if (dist < 0.15) {
						pt.vx += -dy * 0.00002 / dist;
						pt.vy += dx * 0.00002 / dist;
					}
				}
			}

			pt.vx *= 0.985;
			pt.vy *= 0.985;
			pt.x += pt.vx * delta * 60;
			pt.y += pt.vy * delta * 60;
			pt.life -= delta * 0.35;
		}

		/* background */
		if (orbs.length > 0) {
			let sinSum = 0, cosSum = 0;
			for (const o of orbs) {
				sinSum += Math.sin(o.hue * Math.PI * 2);
				cosSum += Math.cos(o.hue * Math.PI * 2);
			}
			const avgHue = (Math.atan2(sinSum, cosSum) / (Math.PI * 2) + 1) % 1;
			const targetHue = (avgHue + 0.5) % 1;
			if (Math.abs(targetHue - bgHue) > 0.5) bgHue = targetHue;
			else bgHue += (targetHue - bgHue) * 0.05;
			ctx.fillStyle = hslToCSS(bgHue, 0.25, 0.06);
		} else {
			bgHue += (0 - bgHue) * 0.03;
			ctx.fillStyle = '#000';
		}
		ctx.fillRect(0, 0, w, h);

		/* draw particles (additive) */
		ctx.globalCompositeOperation = 'lighter';
		for (let p = 0; p < MAX_PARTICLES; p++) {
			const pt = particles[p];
			if (pt.life <= 0) continue;
			const px = pt.x * w, py = pt.y * h;
			const r = particleSize * (1 + pt.life) * 1.5;
			const alpha = pt.life * 0.6;
			const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
			grad.addColorStop(0, hslToCSS(pt.hue, 0.8, 0.65, alpha));
			grad.addColorStop(1, hslToCSS(pt.hue, 0.8, 0.3, 0));
			ctx.fillStyle = grad;
			ctx.fillRect(px - r, py - r, r * 2, r * 2);
		}
		ctx.globalCompositeOperation = 'source-over';

		/* draw orbs */
		for (const orb of orbs) {
			const ox = orb.x * w, oy = orb.y * h;
			const r = ORB_RADIUS;
			const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
			grad.addColorStop(0, hslToCSS(orb.hue, 0.9, 0.7, 0.9));
			grad.addColorStop(0.5, hslToCSS(orb.hue, 0.8, 0.5, 0.4));
			grad.addColorStop(1, hslToCSS(orb.hue, 0.7, 0.3, 0));
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(ox, oy, r, 0, Math.PI * 2);
			ctx.fill();

			/* pitch label */
			const info = PitchInformation[orb.pitch];
			if (info) {
				ctx.fillStyle = 'rgba(255,255,255,0.8)';
				ctx.font = '11px monospace';
				ctx.textAlign = 'center';
				ctx.fillText(info.nameLong, ox, oy + 4);
			}
		}

		/* hint text when empty */
		if (orbs.length === 0) {
			ctx.fillStyle = 'rgba(255,255,255,0.3)';
			ctx.font = '16px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('Click or tap anywhere to place a note', w / 2, h / 2);
		}

		animId = requestAnimationFrame(tick);
	}

	/* ── resize ─────────────────────────────────────────────── */

	function resize() {
		if (!canvas || !canvas.parentElement) return;
		w = canvas.parentElement.clientWidth;
		h = canvas.parentElement.clientHeight;
		canvas.width = w;
		canvas.height = h;
	}

	/* ── lifecycle ──────────────────────────────────────────── */

	onMount(() => {
		synth = initSynth();
		ctx = canvas.getContext('2d');
		resize();
		window.addEventListener('resize', resize);
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onWindowBlur);
		lastTime = performance.now();
		animId = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		cancelAnimationFrame(animId);
		window.removeEventListener('resize', resize);
		document.removeEventListener('keydown', onKeyDown);
		document.removeEventListener('keyup', onKeyUp);
		window.removeEventListener('blur', onWindowBlur);
		onWindowBlur();
		orbs.forEach((o) => synth.stopPlaying(o.pitch));
		synth?.destroy();
	});
</script>

<div class="flex flex-1 w-full h-full min-h-[80vh] relative">
	<canvas
		bind:this={canvas}
		class="absolute inset-0 w-full h-full cursor-crosshair"
		on:pointerdown={onPointerDown}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
	/>
	{#if orbs.length > 0}
		<button
			class="absolute bottom-4 left-4 px-3 py-1.5 text-xs rounded-full
				bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/80
				hover:text-white transition-colors backdrop-blur-sm"
			on:click|stopPropagation={removeAllOrbs}
		>
			Clear All
		</button>
	{/if}
</div>
