import { type Post, PostType, type RendererParams, type ExperimentContent3D } from '@sc/model';
import { DefaultKeyMapping, Pitch, PitchInformation } from '@sc/synth-builder/src/model/notes';
import { MutableAudioNode as AudioGraphNode } from '@sc/synth-builder/src/core/nodes/MutableAudioNode';
import { MutableAudioGraph } from '@sc/synth-builder/src/core/nodes/MutableAudioGraph';
import { NodeTypes } from '@sc/synth-builder/src/model/nodes';
import { Synth } from '@sc/synth-builder/src/core/Synth';
import { Clock } from 'three';

/* ── constants ─────────────────────────────────────────────── */

const ALL_PITCHES = Object.values(Pitch);
const PITCH_INDEX = new Map<Pitch, number>(ALL_PITCHES.map((p, i) => [p, i]));
const MIN_PLAYABLE_IDX = 35;
const MAX_PLAYABLE_IDX = 66;
const PLAYABLE_RANGE = MAX_PLAYABLE_IDX - MIN_PLAYABLE_IDX;
const MAX_PARTICLES = 3000;
const ORB_RADIUS = 40;

/* ── audio graph ───────────────────────────────────────────── */

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

type SynthPitchNodes = { oscillators: { node: OscillatorNode }[]; gains: { node: GainNode }[]; analysers: { node: AnalyserNode }[]; pitch: Pitch };
function getSynthPitches(s: Synth): Map<Pitch, SynthPitchNodes> {
	return (s as unknown as { pitches: Map<Pitch, SynthPitchNodes> }).pitches;
}

/* ── color helpers ─────────────────────────────────────────── */

function pitchToHue(pitchNorm: number): number {
	const pitchIdx = Math.round(pitchNorm * PLAYABLE_RANGE + MIN_PLAYABLE_IDX);
	const semitone = ((pitchIdx % 12) + 12) % 12;
	return ((semitone * 7) % 12) / 12;
}

function hslToCSS(h: number, s: number, l: number, a = 1): string {
	return `hsla(${(h * 360).toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%, ${a})`;
}

function distanceToPitch(nx: number, ny: number): { pitch: Pitch; pitchNorm: number } {
	const dx = nx - 0.5, dy = ny - 0.5;
	const dist = Math.sqrt(dx * dx + dy * dy);
	const norm = Math.max(0, Math.min(1, dist / 0.5));
	const idx = Math.round(norm * PLAYABLE_RANGE + MIN_PLAYABLE_IDX);
	const clamped = Math.max(MIN_PLAYABLE_IDX, Math.min(MAX_PLAYABLE_IDX, idx));
	return { pitch: ALL_PITCHES[clamped], pitchNorm: (clamped - MIN_PLAYABLE_IDX) / PLAYABLE_RANGE };
}

function pitchToPosition(pitch: Pitch): { x: number; y: number } {
	const idx = PITCH_INDEX.get(pitch) ?? MIN_PLAYABLE_IDX;
	const norm = Math.max(0, Math.min(1, (idx - MIN_PLAYABLE_IDX) / PLAYABLE_RANGE));
	const radius = norm * 0.45 + 0.05;
	const semitone = ((idx % 12) + 12) % 12;
	const angle = (semitone / 12) * Math.PI * 2 - Math.PI / 2;
	return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
}

function consonance(a: number, b: number): number {
	const hzA = 130.81 * Math.pow(2, a * (PLAYABLE_RANGE / 12));
	const hzB = 130.81 * Math.pow(2, b * (PLAYABLE_RANGE / 12));
	const ratio = hzA > hzB ? hzA / hzB : hzB / hzA;
	const simple = [1, 2, 1.5, 4 / 3, 5 / 4, 5 / 3, 6 / 5];
	let best = 1;
	for (const r of simple) { const d = Math.abs(ratio - r); if (d < best) best = d; }
	return 1.0 - Math.min(best * 4, 1.0);
}

/* ── types ─────────────────────────────────────────────────── */

interface NoteOrb {
	id: string;
	x: number; y: number;
	pitch: Pitch;
	pitchNorm: number;
	hue: number;
	dragging: boolean;
	birthTime: number;
	keyboard: boolean;
}

interface Particle {
	x: number; y: number;
	vx: number; vy: number;
	life: number;
	hue: number;
	orbId: string;
}

/* ── main content class ────────────────────────────────────── */

class NotePlaygroundContent implements ExperimentContent3D {
	private readonly synth = (() => {
		const s = new Synth(getAudioGraph(), { attack: 0.95, release: 0.8, unison: 2, unisonDetune: 0.12 });
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
	})();

	private readonly clock = new Clock(false);
	private canvas2d!: HTMLCanvasElement;
	private ctx!: CanvasRenderingContext2D;
	private container!: HTMLElement;
	private clearBtn!: HTMLButtonElement;
	private w = 0;
	private h = 0;
	private audioUnlocked = false;

	private readonly orbs: NoteOrb[] = [];
	private readonly particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
		x: 0, y: 0, vx: 0, vy: 0, life: 0, hue: 0, orbId: ''
	}));
	private orbIdCounter = 0;
	private bgHue = 0;

	/* pointer state */
	private activeOrb: NoteOrb | null = null;
	private pointerDownPos = { x: 0, y: 0 };
	private lastTapOrb: NoteOrb | null = null;
	private lastTapTime = 0;

	/* keyboard state */
	private readonly heldKeys = new Map<string, NoteOrb>();

	/* ── audio unlock ──────────────────────────────────────── */

	private unlockAudio() {
		if (this.audioUnlocked) return;
		const c = this.synth.context;
		c.resume();
		const buf = c.createBuffer(1, 1, c.sampleRate);
		const src = c.createBufferSource();
		src.buffer = buf;
		src.connect(c.destination);
		src.start();
		this.audioUnlocked = true;
	}

	/* ── orb management ────────────────────────────────────── */

	private isPitchInUse(pitch: Pitch, exclude?: NoteOrb): boolean {
		return this.orbs.some((o) => o !== exclude && o.pitch === pitch);
	}

	private addOrb(nx: number, ny: number, keyboard = false, pitch?: Pitch): NoteOrb {
		this.unlockAudio();
		let p: Pitch, pn: number;
		if (pitch) {
			p = pitch;
			const idx = PITCH_INDEX.get(pitch) ?? MIN_PLAYABLE_IDX;
			pn = Math.max(0, Math.min(1, (idx - MIN_PLAYABLE_IDX) / PLAYABLE_RANGE));
		} else {
			({ pitch: p, pitchNorm: pn } = distanceToPitch(nx, ny));
		}
		const orb: NoteOrb = {
			id: `orb-${this.orbIdCounter++}`, x: nx, y: ny,
			pitch: p, pitchNorm: pn, hue: pitchToHue(pn),
			dragging: false, birthTime: performance.now(), keyboard
		};
		this.orbs.push(orb);
		this.synth.startPlaying(p);
		this.updateClearBtn();
		return orb;
	}

	private removeOrb(orb: NoteOrb) {
		const idx = this.orbs.indexOf(orb);
		if (idx >= 0) this.orbs.splice(idx, 1);
		if (!this.isPitchInUse(orb.pitch)) this.synth.stopPlaying(orb.pitch);
		this.updateClearBtn();
	}

	private removeAllOrbs = () => {
		const pitches = new Set(this.orbs.map((o) => o.pitch));
		this.orbs.length = 0;
		for (const p of pitches) this.synth.stopPlaying(p);
		this.updateClearBtn();
	};

	private updateOrbPitch(orb: NoteOrb) {
		const oldPitch = orb.pitch;
		const { pitch, pitchNorm } = distanceToPitch(orb.x, orb.y);
		if (pitch !== oldPitch) {
			orb.pitch = pitch;
			orb.pitchNorm = pitchNorm;
			orb.hue = pitchToHue(pitchNorm);
			if (!this.isPitchInUse(oldPitch)) this.synth.stopPlaying(oldPitch);
			this.synth.startPlaying(pitch);
		}
	}

	private hitTestOrb(nx: number, ny: number): NoteOrb | undefined {
		const orbR = ORB_RADIUS / Math.max(this.w, 1);
		for (let i = this.orbs.length - 1; i >= 0; i--) {
			const o = this.orbs[i];
			const dx = o.x - nx, dy = o.y - ny;
			if (Math.sqrt(dx * dx + dy * dy) < orbR) return o;
		}
		return undefined;
	}

	private updateClearBtn() {
		if (this.clearBtn) this.clearBtn.style.display = this.orbs.length > 0 ? '' : 'none';
	}

	/* ── pointer events ────────────────────────────────────── */

	private norm(e: PointerEvent): { nx: number; ny: number } {
		const rect = this.canvas2d.getBoundingClientRect();
		return { nx: (e.clientX - rect.left) / rect.width, ny: (e.clientY - rect.top) / rect.height };
	}

	private onPointerDown = (e: PointerEvent) => {
		const { nx, ny } = this.norm(e);
		this.pointerDownPos = { x: nx, y: ny };
		const hit = this.hitTestOrb(nx, ny);
		if (hit) {
			hit.dragging = true;
			this.activeOrb = hit;
		} else {
			this.addOrb(nx, ny);
		}
		this.canvas2d.setPointerCapture(e.pointerId);
	};

	private onPointerMove = (e: PointerEvent) => {
		if (!this.activeOrb?.dragging) return;
		const { nx, ny } = this.norm(e);
		this.activeOrb.x = Math.max(0, Math.min(1, nx));
		this.activeOrb.y = Math.max(0, Math.min(1, ny));
		this.updateOrbPitch(this.activeOrb);
	};

	private onPointerUp = (e: PointerEvent) => {
		if (this.activeOrb) {
			const { nx, ny } = this.norm(e);
			const dx = nx - this.pointerDownPos.x, dy = ny - this.pointerDownPos.y;
			if (Math.sqrt(dx * dx + dy * dy) < 0.02) {
				const now = performance.now();
				if (this.lastTapOrb === this.activeOrb && now - this.lastTapTime < 400) {
					this.removeOrb(this.activeOrb);
					this.lastTapOrb = null;
				} else {
					this.lastTapOrb = this.activeOrb;
					this.lastTapTime = now;
				}
			}
			this.activeOrb.dragging = false;
			this.activeOrb = null;
		}
	};

	/* ── keyboard events ───────────────────────────────────── */

	private onKeyDown = (e: KeyboardEvent) => {
		if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
		if (this.heldKeys.has(e.code)) return;
		const pitch = DefaultKeyMapping[e.key.toLowerCase()];
		if (!pitch) return;
		const pos = pitchToPosition(pitch);
		const orb = this.addOrb(pos.x, pos.y, true, pitch);
		this.heldKeys.set(e.code, orb);
	};

	private onKeyUp = (e: KeyboardEvent) => {
		const orb = this.heldKeys.get(e.code);
		if (!orb) return;
		for (const [code, o] of this.heldKeys) { if (o.pitch === orb.pitch) this.heldKeys.delete(code); }
		this.removeOrb(orb);
	};

	private onBlur = () => {
		for (const [, orb] of this.heldKeys) this.removeOrb(orb);
		this.heldKeys.clear();
	};

	/* ── lifecycle ──────────────────────────────────────────── */

	start = ({ container }: RendererParams) => {
		this.container = container;

		/* create 2D canvas overlay */
		this.canvas2d = document.createElement('canvas');
		this.canvas2d.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;z-index:1;';
		container.appendChild(this.canvas2d);
		this.ctx = this.canvas2d.getContext('2d')!;

		/* clear all button */
		this.clearBtn = document.createElement('button');
		this.clearBtn.textContent = 'Clear All';
		this.clearBtn.style.cssText = 'position:absolute;bottom:52px;left:16px;z-index:2;padding:4px 12px;font-size:12px;border-radius:9999px;background:rgba(30,30,30,0.6);color:#aaa;border:none;cursor:pointer;backdrop-filter:blur(4px);';
		this.clearBtn.style.display = 'none';
		this.clearBtn.addEventListener('click', this.removeAllOrbs);
		container.appendChild(this.clearBtn);

		/* pointer events on 2D canvas */
		this.canvas2d.addEventListener('pointerdown', this.onPointerDown);
		this.canvas2d.addEventListener('pointermove', this.onPointerMove);
		this.canvas2d.addEventListener('pointerup', this.onPointerUp);

		/* keyboard */
		document.addEventListener('keydown', this.onKeyDown);
		document.addEventListener('keyup', this.onKeyUp);
		window.addEventListener('blur', this.onBlur);

		this.handleResize();
		window.addEventListener('resize', this.handleResize);
		this.clock.start();
	};

	stop = () => {
		this.onBlur();
		this.orbs.forEach((o) => this.synth.stopPlaying(o.pitch));
		this.synth.destroy();
		this.canvas2d?.remove();
		this.clearBtn?.remove();
		document.removeEventListener('keydown', this.onKeyDown);
		document.removeEventListener('keyup', this.onKeyUp);
		window.removeEventListener('blur', this.onBlur);
		window.removeEventListener('resize', this.handleResize);
	};

	private handleResize = () => {
		if (!this.canvas2d || !this.container) return;
		this.w = this.container.clientWidth;
		this.h = this.container.clientHeight;
		this.canvas2d.width = this.w;
		this.canvas2d.height = this.h;
	};

	/* ── render (called by ContentRendererThree each frame) ── */

	onRender = () => {
		const ctx = this.ctx;
		if (!ctx) return;
		const delta = Math.min(this.clock.getDelta(), 0.05);
		const time = this.clock.getElapsedTime();
		const { orbs, particles, w, h } = this;

		/* discordance */
		let disc = 0, pairs = 0;
		for (let a = 0; a < orbs.length; a++) {
			for (let b = a + 1; b < orbs.length; b++) {
				disc += 1 - consonance(orbs[a].pitchNorm, orbs[b].pitchNorm);
				pairs++;
			}
		}
		if (pairs > 0) disc /= pairs;
		const turb = 0.2 + disc * 0.5;

		/* emit */
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
					hue: orb.hue, orbId: orb.id
				};
				emitted++;
			}
		}

		/* update particles */
		for (let p = 0; p < MAX_PARTICLES; p++) {
			const pt = particles[p];
			if (pt.life <= 0) continue;
			pt.vx += Math.sin(pt.y * 12 + time * 2) * turb * 0.0004;
			pt.vy += Math.cos(pt.x * 12 + time * 2) * turb * 0.0004;
			for (const orb of orbs) {
				const dx = orb.x - pt.x, dy = orb.y - pt.y;
				const dist2 = dx * dx + dy * dy + 0.0001;
				const isOwn = orb.id === pt.orbId;
				pt.vx += dx * ((isOwn ? 0.000003 : 0.000008) / dist2);
				pt.vy += dy * ((isOwn ? 0.000003 : 0.000008) / dist2);
				if (!isOwn) {
					const dist = Math.sqrt(dist2);
					if (dist < 0.15) { pt.vx += -dy * 0.00002 / dist; pt.vy += dx * 0.00002 / dist; }
				}
			}
			pt.vx *= 0.985; pt.vy *= 0.985;
			pt.x += pt.vx * delta * 60; pt.y += pt.vy * delta * 60;
			pt.life -= delta * 0.35;
		}

		/* background */
		if (orbs.length > 0) {
			let sinSum = 0, cosSum = 0;
			for (const o of orbs) { sinSum += Math.sin(o.hue * Math.PI * 2); cosSum += Math.cos(o.hue * Math.PI * 2); }
			const avgHue = (Math.atan2(sinSum, cosSum) / (Math.PI * 2) + 1) % 1;
			const targetHue = (avgHue + 0.5) % 1;
			if (Math.abs(targetHue - this.bgHue) > 0.5) this.bgHue = targetHue;
			else this.bgHue += (targetHue - this.bgHue) * 0.05;
			ctx.fillStyle = hslToCSS(this.bgHue, 0.25, 0.06);
		} else {
			this.bgHue += (0 - this.bgHue) * 0.03;
			ctx.fillStyle = '#000';
		}
		ctx.fillRect(0, 0, w, h);

		/* draw particles */
		ctx.globalCompositeOperation = 'lighter';
		for (let p = 0; p < MAX_PARTICLES; p++) {
			const pt = particles[p];
			if (pt.life <= 0) continue;
			const px = pt.x * w, py = pt.y * h;
			const r = (1 + pt.life) * 1.5;
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
			const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, ORB_RADIUS);
			grad.addColorStop(0, hslToCSS(orb.hue, 0.9, 0.7, 0.9));
			grad.addColorStop(0.5, hslToCSS(orb.hue, 0.8, 0.5, 0.4));
			grad.addColorStop(1, hslToCSS(orb.hue, 0.7, 0.3, 0));
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(ox, oy, ORB_RADIUS, 0, Math.PI * 2);
			ctx.fill();
			const info = PitchInformation[orb.pitch];
			if (info) {
				ctx.fillStyle = 'rgba(255,255,255,0.8)';
				ctx.font = '11px monospace';
				ctx.textAlign = 'center';
				ctx.fillText(info.nameLong, ox, oy + 4);
			}
		}

		/* hint */
		if (orbs.length === 0) {
			ctx.fillStyle = 'rgba(255,255,255,0.3)';
			ctx.font = '16px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('Click or tap anywhere to place a note', w / 2, h / 2);
		}
	};
}

/* ── post export ───────────────────────────────────────────── */

const post: Post = {
	summary: {
		id: 'note-playground',
		tags: ['music', 'particles', 'interactive', 'web-audio'],
		title: 'Note Playground',
		subtitle: 'Click to place notes — watch them interact',
		timestamp: new Date(2026, 2, 29),
		type: PostType.experiment3d
	},
	content: () => new NotePlaygroundContent()
};

export default post;
