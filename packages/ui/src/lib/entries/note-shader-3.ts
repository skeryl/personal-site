import { type Post, PostType, type RendererParams, type ExperimentContent3D } from '@sc/model';
import { DefaultKeyMapping, Pitch, PitchInformation, type KeyNoteMapping } from '@sc/synth-builder/src/model/notes';
import { MutableAudioNode as AudioGraphNode } from '@sc/synth-builder/src/core/nodes/MutableAudioNode';
import { MutableAudioGraph } from '@sc/synth-builder/src/core/nodes/MutableAudioGraph';
import { NodeTypes } from '@sc/synth-builder/src/model/nodes';
import { getReleaseTime, Synth } from '@sc/synth-builder/src/core/Synth';
import {
	AdditiveBlending, BufferAttribute, BufferGeometry, Clock, Color,
	Points, Scene, ShaderMaterial
} from 'three';
import { type ContentParams, type ContentParam, ParamType, numberParam, selectParam, paramsById } from '$lib/content-params';

/* ── constants ─────────────────────────────────────────────── */

const MAX_SLOTS = 12;
const FFT_SIZE = 512;
const FREQ_BINS = FFT_SIZE / 2;
const MIN_DB = -70;
const MAX_DB = -10;
const DB_RANGE = MAX_DB - MIN_DB;
const MAX_PARTICLES = 4000;

const ALL_PITCHES = Object.values(Pitch);
const PITCH_INDEX = new Map<Pitch, number>(ALL_PITCHES.map((p, i) => [p, i]));
const PLAYABLE_PITCHES = Object.values(DefaultKeyMapping);
const MIN_PLAYABLE = Math.min(...PLAYABLE_PITCHES.map((p) => PITCH_INDEX.get(p) ?? 0));
const MAX_PLAYABLE = Math.max(...PLAYABLE_PITCHES.map((p) => PITCH_INDEX.get(p) ?? 0));
const PLAYABLE_RANGE = Math.max(1, MAX_PLAYABLE - MIN_PLAYABLE);

/* ── audio graph ───────────────────────────────────────────── */

const WAVE_TYPES: OscillatorType[] = ['sawtooth', 'triangle', 'sine', 'square'];

function getAudioGraph(waveType: OscillatorType = 'sawtooth') {
	const osc = AudioGraphNode.createOscillator().setProperty('type', waveType);
	return MutableAudioGraph.create(
		osc.connect(
			AudioGraphNode.createGain()
				.setProperty('maxGain', 0.08)
				.connect(
					AudioGraphNode.create(NodeTypes.Analyser)
						.setProperty('minDecibels', MIN_DB)
						.setProperty('maxDecibels', MAX_DB)
						.setProperty('fftSize', FFT_SIZE)
						.setProperty('smoothingTimeConstant', 0.8)
						.connect(AudioGraphNode.createDestination())
				)
		)
	);
}

function normDB(db: number): number {
	return Math.max(0, Math.min(1, (db - MIN_DB) / DB_RANGE));
}

/* ── note slot manager (from note-shader-2) ────────────────── */

interface NoteSlot {
	pitch: Pitch | null;
	pitchNormalized: number;
	amplitude: number;
	state: 'silent' | 'active' | 'releasing';
	releaseStart: number;
}

function createEmptySlot(): NoteSlot {
	return { pitch: null, pitchNormalized: 0, amplitude: 0, state: 'silent', releaseStart: 0 };
}

class NoteSlotManager {
	readonly slots: NoteSlot[] = Array.from({ length: MAX_SLOTS }, createEmptySlot);
	private previouslyPlaying = new Set<Pitch>();
	private releaseTimeMs: number;

	constructor(releaseTimeMs: number) {
		this.releaseTimeMs = releaseTimeMs;
	}

	update(notesPlaying: ReadonlySet<Pitch>): void {
		const now = performance.now();
		for (const pitch of notesPlaying) {
			if (this.previouslyPlaying.has(pitch)) continue;
			const existing = this.slots.find((s) => s.pitch === pitch);
			if (existing) { existing.state = 'active'; existing.amplitude = 1.0; continue; }
			let target = this.slots.find((s) => s.state === 'silent');
			if (!target) {
				let minAmp = Infinity;
				for (const s of this.slots) {
					if (s.state === 'releasing' && s.amplitude < minAmp) { minAmp = s.amplitude; target = s; }
				}
			}
			if (!target) continue;
			const idx = PITCH_INDEX.get(pitch) ?? 0;
			target.pitch = pitch;
			target.pitchNormalized = Math.max(0, Math.min(1, (idx - MIN_PLAYABLE) / PLAYABLE_RANGE));
			target.amplitude = 1.0;
			target.state = 'active';
			target.releaseStart = 0;
		}
		for (const s of this.slots) {
			if (s.state === 'active' && s.pitch !== null && !notesPlaying.has(s.pitch))
				{ s.state = 'releasing'; s.releaseStart = now; }
		}
		for (const s of this.slots) {
			if (s.state === 'releasing') {
				s.amplitude = Math.exp(-(now - s.releaseStart) / (this.releaseTimeMs * 0.4));
				if (s.amplitude < 0.005) { s.state = 'silent'; s.pitch = null; s.amplitude = 0; }
			}
		}
		this.previouslyPlaying = new Set(notesPlaying);
	}

	get activeCount(): number { return this.slots.filter((s) => s.state !== 'silent').length; }
	get totalAmplitude(): number { return this.slots.reduce((sum, s) => sum + s.amplitude, 0); }
}

/* ── keyboard controller (from note-shader-2) ──────────────── */

class KeyboardSynthController {
	private readonly heldKeys = new Map<string, Pitch>();
	private audioUnlocked = false;

	constructor(private readonly synth: Synth, private readonly keyMap: KeyNoteMapping) {}

	getHeldPitches(): Pitch[] { return Array.from(this.heldKeys.values()); }

	private onKeyDown = (e: KeyboardEvent) => {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.repeat) return;
		if (this.heldKeys.has(e.code)) return;
		const pitch = this.keyMap[e.key.toLowerCase()];
		if (pitch) {
			if (!this.audioUnlocked) {
				const ctx = this.synth.context;
				ctx.resume();
				const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
				const src = ctx.createBufferSource();
				src.buffer = buf;
				src.connect(ctx.destination);
				src.start();
				this.audioUnlocked = true;
			}
			this.heldKeys.set(e.code, pitch);
			this.synth.startPlaying(pitch);
		}
	};

	private onKeyUp = (e: KeyboardEvent) => {
		const pitch = this.heldKeys.get(e.code);
		if (pitch === undefined) return;
		for (const [code, p] of this.heldKeys) { if (p === pitch) this.heldKeys.delete(code); }
		this.synth.stopPlaying(pitch);
	};

	private onBlur = () => {
		const pitches = new Set(this.heldKeys.values());
		for (const pitch of pitches) this.synth.stopPlaying(pitch);
		this.heldKeys.clear();
	};

	mount(doc: Document): () => void {
		doc.addEventListener('keydown', this.onKeyDown);
		doc.addEventListener('keyup', this.onKeyUp);
		window.addEventListener('blur', this.onBlur);
		return () => {
			doc.removeEventListener('keydown', this.onKeyDown);
			doc.removeEventListener('keyup', this.onKeyUp);
			window.removeEventListener('blur', this.onBlur);
			this.onBlur();
		};
	}
}

/* ── synth pitches helper ──────────────────────────────────── */

type SynthPitchNodes = { oscillators: { node: OscillatorNode }[]; gains: { node: GainNode }[]; analysers: { node: AnalyserNode }[]; pitch: Pitch };
function getSynthPitches(s: Synth): Map<Pitch, SynthPitchNodes> {
	return (s as unknown as { pitches: Map<Pitch, SynthPitchNodes> }).pitches;
}

/* ── HSL color from pitch ──────────────────────────────────── */

/** Circle of fifths → color wheel mapping.
 *  Harmonically related notes (fifths) get adjacent hues,
 *  so consonant chords look visually cohesive. */
function pitchToHSL(pitchNorm: number, time: number): [number, number, number] {
	const pitchIndex = Math.round(pitchNorm * PLAYABLE_RANGE + MIN_PLAYABLE);
	const semitone = ((pitchIndex % 12) + 12) % 12;
	const fifthsPosition = (semitone * 7) % 12;
	const hue = ((fifthsPosition / 12 + time * 0.01) % 1.0 + 1.0) % 1.0;
	return [hue, 0.8, 0.6];
}

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
	const m = l - c / 2;
	let r = 0, g = 0, b = 0;
	const sector = Math.floor(h * 6);
	if (sector === 0 || sector === 6) { r = c; g = x; }
	else if (sector === 1) { r = x; g = c; }
	else if (sector === 2) { g = c; b = x; }
	else if (sector === 3) { g = x; b = c; }
	else if (sector === 4) { r = x; b = c; }
	else { r = c; b = x; }
	return [r + m, g + m, b + m];
}

/* ── particle system ───────────────────────────────────────── */

interface Particle {
	x: number; y: number; z: number;
	vx: number; vy: number; vz: number;
	life: number;
	slot: number; /* which note slot spawned this, -1 = free */
	pitchNorm: number;
}

const STYLE_NAMES = ['Gravitational', 'Resonance'];

/* consonance score: simple frequency ratios → high, complex → low */
function consonance(pitchA: number, pitchB: number): number {
	const hzA = 130.81 * Math.pow(2, pitchA * (PLAYABLE_RANGE / 12));
	const hzB = 130.81 * Math.pow(2, pitchB * (PLAYABLE_RANGE / 12));
	const ratio = hzA > hzB ? hzA / hzB : hzB / hzA;
	/* check closeness to simple ratios */
	const simpleRatios = [1, 2, 1.5, 4 / 3, 5 / 4, 5 / 3, 6 / 5];
	let best = 1;
	for (const r of simpleRatios) {
		const dist = Math.abs(ratio - r);
		if (dist < best) best = dist;
	}
	return 1.0 - Math.min(best * 4, 1.0); /* 1 = consonant, 0 = dissonant */
}

/* ── content params ────────────────────────────────────────── */

const visualizationParams: ContentParams = [
	selectParam('Style', STYLE_NAMES, 'Gravitational'),
	selectParam('Wave', WAVE_TYPES.map((w) => w.charAt(0).toUpperCase() + w.slice(1)), 'Sawtooth'),
	numberParam('Volume', 0.08, { min: 0.01, max: 0.25, step: 0.01 }),
	numberParam('Attack', 0.95, { min: 0, max: 1, step: 0.05 }),
	numberParam('Release', 0.7, { min: 0, max: 1, step: 0.05 }),
	numberParam('Unison', 3, { min: 1, max: 6, step: 1 }),
	numberParam('Detune', 0.15, { min: 0, max: 0.5, step: 0.01 }),
	numberParam('Turbulence', 0.3, { min: 0, max: 1, step: 0.05 }),
	numberParam('Size', 0.8, { min: 0.1, max: 3, step: 0.1 }),
	numberParam('Emit Rate', 8, { min: 1, max: 20, step: 1 })
];

/* ── shaders ───────────────────────────────────────────────── */

const vertexShader = `
attribute float aSize;
attribute vec3 aColor;
attribute float aLife;
varying vec3 vColor;
varying float vLife;

void main() {
	vColor = aColor;
	vLife = aLife;
	vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = max(0.5, aSize * aLife * (100.0 / -mvPos.z));
	gl_Position = projectionMatrix * mvPos;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vLife;

void main() {
	float dist = length(gl_PointCoord - vec2(0.5));
	/* soft glow: bright core fading to transparent edge */
	float core = smoothstep(0.5, 0.15, dist);
	float glow = exp(-dist * dist * 8.0) * 0.5;
	float alpha = (core + glow) * vLife;
	if (alpha < 0.01) discard;
	gl_FragColor = vec4(vColor * (0.6 + 0.4 * core), alpha);
}
`;

/* ── main content class ────────────────────────────────────── */

class NoteShader3Content implements ExperimentContent3D {
	private readonly synth = (() => {
		const s = new Synth(getAudioGraph(), {
			attack: 0.95,
			release: 0.7,
			unison: 3,
			unisonDetune: 0.15
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
	})();

	private readonly keyboardController = new KeyboardSynthController(this.synth, DefaultKeyMapping);
	private readonly releaseTimeMs = getReleaseTime(this.synth.settings) * 1000;
	private readonly slotManager = new NoteSlotManager(this.releaseTimeMs);
	private readonly clock = new Clock(false);

	/* particle state (CPU) */
	private readonly particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
		x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, slot: -1, pitchNorm: 0
	}));

	/* background color (complementary to average particle hue) */
	private readonly bgColor = new Color(0x000000);
	private bgHue = 0;

	/* Three.js objects */
	private scene: Scene | undefined;
	private points: Points | undefined;
	private posAttr!: BufferAttribute;
	private colorAttr!: BufferAttribute;
	private sizeAttr!: BufferAttribute;
	private lifeAttr!: BufferAttribute;

	/* audio buffers */
	private freqBuffer = new Map<Pitch, Float32Array>();
	private timeBuffer = new Map<Pitch, Float32Array>();

	/* gain audit */
	private readonly releaseTimestamps = new Map<Pitch, number>();

	/* params */
	private params: ContentParams = [...visualizationParams];
	private style = 0;
	private turbulence = 0.3;
	private particleSize = 1.5;
	private emitRate = 8;
	private unmountKeyboard: (() => void) | undefined;

	/* ── lifecycle ──────────────────────────────────────────── */

	start = ({ scene, camera, renderer }: RendererParams) => {
		this.scene = scene;

		/* Position the perspective camera to look at the XY plane.
		   At z=2 with fov=75, the visible height is ~2.7 units,
		   so our particle space of roughly -1 to 1 fits well. */
		camera.position.set(0, 0, 2);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();

		scene.background = this.bgColor;

		/* create geometry */
		const positions = new Float32Array(MAX_PARTICLES * 3);
		const colors = new Float32Array(MAX_PARTICLES * 3);
		const sizes = new Float32Array(MAX_PARTICLES);
		const lives = new Float32Array(MAX_PARTICLES);

		const geometry = new BufferGeometry();
		this.posAttr = new BufferAttribute(positions, 3);
		this.colorAttr = new BufferAttribute(colors, 3);
		this.sizeAttr = new BufferAttribute(sizes, 1);
		this.lifeAttr = new BufferAttribute(lives, 1);
		geometry.setAttribute('position', this.posAttr);
		geometry.setAttribute('aColor', this.colorAttr);
		geometry.setAttribute('aSize', this.sizeAttr);
		geometry.setAttribute('aLife', this.lifeAttr);

		const material = new ShaderMaterial({
			vertexShader,
			fragmentShader,
			transparent: true,
			blending: AdditiveBlending,
			depthWrite: false
		});

		this.points = new Points(geometry, material);
		scene.add(this.points);

		this.unmountKeyboard = this.keyboardController.mount(document);
		this.clock.start();
	};

	stop = () => {
		this.unmountKeyboard?.();
		this.synth.destroy();
		if (this.points && this.scene) this.scene.remove(this.points);
		this.points?.geometry.dispose();
	};

	/* ── params ─────────────────────────────────────────────── */

	getParams = (): ContentParams => this.params;

	private numVal(byId: Record<string, ContentParam<ParamType>>, id: string): number {
		return (byId[id] as ContentParam<ParamType.number>).value;
	}
	private strVal(byId: Record<string, ContentParam<ParamType>>, id: string): string {
		const val = byId[id]?.value;
		return typeof val === 'string' ? val : String(val ?? '');
	}

	setParams = (params: ContentParams) => {
		this.params = params;
		const byId = paramsById(params);
		const pitches = getSynthPitches(this.synth);

		this.style = Math.max(0, STYLE_NAMES.indexOf(this.strVal(byId, 'style')));
		this.turbulence = this.numVal(byId, 'turbulence');
		this.particleSize = this.numVal(byId, 'size');
		this.emitRate = this.numVal(byId, 'emit-rate');

		const waveType = (this.strVal(byId, 'wave').toLowerCase() as OscillatorType) ?? 'sawtooth';
		this.synth.settings.waveType = waveType;
		for (const osc of this.synth.audioGraph.find(NodeTypes.Oscillator)) osc.setProperty('type', waveType);
		for (const [, nodes] of pitches) nodes.oscillators.forEach((o) => { try { o.node.type = waveType; } catch { /* */ } });

		const volume = this.numVal(byId, 'volume');
		this.synth.setGain(volume);

		this.synth.settings.attack = this.numVal(byId, 'attack');
		this.synth.settings.release = this.numVal(byId, 'release');
		this.synth.settings.unisonDetune = this.numVal(byId, 'detune');

		const unison = this.numVal(byId, 'unison');
		if (unison !== this.synth.settings.unison) this.synth.settings.unison = unison;
	};

	/* ── render ─────────────────────────────────────────────── */

	onRender = () => {
		const delta = this.clock.getDelta();
		const time = this.clock.getElapsedTime();
		const playing = this.synth.notesPlaying;
		const now = performance.now();

		/* gain audit (from note-shader-2) */
		const synthPitches = getSynthPitches(this.synth);
		for (const pitch of this.releaseTimestamps.keys()) {
			if (playing.has(pitch)) this.releaseTimestamps.delete(pitch);
		}
		for (const [pitch] of synthPitches) {
			if (!playing.has(pitch) && !this.releaseTimestamps.has(pitch))
				this.releaseTimestamps.set(pitch, now);
		}
		const maxAge = this.releaseTimeMs + 500;
		for (const [pitch, releasedAt] of this.releaseTimestamps) {
			if (now - releasedAt > maxAge) {
				const nodes = synthPitches.get(pitch);
				if (nodes) {
					nodes.oscillators.forEach((o) => { try { o.node.stop(); o.node.disconnect(); } catch { /* */ } });
					nodes.gains.forEach((g) => { try { g.node.disconnect(); } catch { /* */ } });
					nodes.analysers.forEach((a) => { try { a.node.disconnect(); } catch { /* */ } });
					synthPitches.delete(pitch);
				}
				this.releaseTimestamps.delete(pitch);
			}
		}

		/* update slot manager */
		this.slotManager.update(playing);

		/* get audio data */
		this.freqBuffer.clear();
		this.timeBuffer.clear();
		if (this.slotManager.activeCount > 0) {
			this.synth.getFrequencyDataByPitch(this.freqBuffer);
			this.synth.getTimeDomainDataByPitch(this.timeBuffer);
		}

		/* collect active slots with positions */
		const activeSlots: { slot: NoteSlot; idx: number; cx: number; cy: number }[] = [];
		for (let i = 0; i < MAX_SLOTS; i++) {
			const s = this.slotManager.slots[i];
			if (s.state === 'silent' || s.pitch === null) continue;
			/* map pitch to a ring radius in NDC-ish space */
			const radius = 0.15 + s.pitchNormalized * 0.7;
			activeSlots.push({ slot: s, idx: i, cx: 0, cy: 0 });
			/* cx/cy unused for emission — particles spawn at radius with random angle */
			activeSlots[activeSlots.length - 1].cx = radius;
		}

		/* emit particles for active notes */
		const emitPerSlot = Math.ceil(this.emitRate * delta * 60);
		for (const { slot, idx, cx: radius } of activeSlots) {
			if (slot.state !== 'active') continue;
			let emitted = 0;
			for (let p = 0; p < MAX_PARTICLES && emitted < emitPerSlot; p++) {
				if (this.particles[p].life > 0) continue;

				const angle = Math.random() * Math.PI * 2;
				const spread = 0.02;
				const [h, s, l] = pitchToHSL(slot.pitchNormalized, time);
				const [r, g, b] = hslToRGB(h, s, l);

				/* sample frequency magnitude at this angle for initial size boost */
				const freqData = slot.pitch ? this.freqBuffer.get(slot.pitch) : undefined;
				const bin = Math.floor((angle / (Math.PI * 2)) * FREQ_BINS);
				const freqMag = freqData ? normDB(freqData[bin]) : 0.5;

				/* sample time-domain for velocity perturbation */
				const timeData = slot.pitch ? this.timeBuffer.get(slot.pitch) : undefined;
				const tdVal = timeData ? timeData[bin] : 0;

				const px = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
				const py = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;
				const speed = 0.003 + freqMag * 0.008;
				const vx = Math.cos(angle) * speed + tdVal * 0.002;
				const vy = Math.sin(angle) * speed + tdVal * 0.002;

				this.particles[p] = {
					x: px, y: py, z: (Math.random() - 0.5) * 0.1,
					vx, vy, vz: (Math.random() - 0.5) * 0.01,
					life: 0.8 + Math.random() * 0.4,
					slot: idx,
					pitchNorm: slot.pitchNormalized
				};

				this.colorAttr.setXYZ(p, r, g, b);
				this.sizeAttr.setX(p, this.particleSize * (0.15 + freqMag * 0.85));
				emitted++;
			}
		}

		/* compute discordance from all active note pairs */
		let discordance = 0;
		let pairs = 0;
		for (let a = 0; a < activeSlots.length; a++) {
			for (let b = a + 1; b < activeSlots.length; b++) {
				const cons = consonance(activeSlots[a].slot.pitchNormalized, activeSlots[b].slot.pitchNormalized);
				discordance += (1 - cons) * activeSlots[a].slot.amplitude * activeSlots[b].slot.amplitude;
				pairs++;
			}
		}
		if (pairs > 0) discordance /= pairs;

		/* update particles — turbulence scales with discordance */
		const drag = 0.98;
		const turb = this.turbulence + discordance * 0.7;
		for (let p = 0; p < MAX_PARTICLES; p++) {
			const pt = this.particles[p];
			if (pt.life <= 0) {
				this.posAttr.setXYZ(p, 0, 0, -100); /* offscreen */
				this.lifeAttr.setX(p, 0);
				continue;
			}

			/* turbulence: curl-noise-like perturbation */
			const nx = Math.sin(pt.y * 8 + time * 2) * turb * 0.02;
			const ny = Math.cos(pt.x * 8 + time * 2) * turb * 0.02;
			pt.vx += nx;
			pt.vy += ny;

			/* interaction mode */
			if (this.style === 0) {
				/* Gravitational: attract toward other active note centers */
				for (const { slot, cx: otherRadius } of activeSlots) {
					if (slot.state === 'silent') continue;
					/* gravity well at a point on the note's ring */
					const wellAngle = time * 0.5 + slot.pitchNormalized * Math.PI * 2;
					const wx = Math.cos(wellAngle) * otherRadius;
					const wy = Math.sin(wellAngle) * otherRadius;
					const dx = wx - pt.x;
					const dy = wy - pt.y;
					const dist2 = dx * dx + dy * dy + 0.001;
					const force = slot.amplitude * 0.0003 / dist2;
					pt.vx += dx * force;
					pt.vy += dy * force;
				}
			} else {
				/* Resonance: consonant intervals attract, dissonant repel */
				for (const { slot: other } of activeSlots) {
					if (other.state === 'silent' || other.pitchNormalized === pt.pitchNorm) continue;
					const cons = consonance(pt.pitchNorm, other.pitchNormalized);
					const otherAngle = time * 0.3 + other.pitchNormalized * Math.PI * 4;
					const otherR = 0.15 + other.pitchNormalized * 0.7;
					const ox = Math.cos(otherAngle) * otherR;
					const oy = Math.sin(otherAngle) * otherR;
					const dx = ox - pt.x;
					const dy = oy - pt.y;
					const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
					/* consonant → attract (positive), dissonant → repel (negative) */
					const strength = (cons - 0.4) * other.amplitude * 0.004 / dist;
					pt.vx += dx * strength;
					pt.vy += dy * strength;
					/* dissonance adds angular scattering */
					if (cons < 0.3) {
						pt.vx += (Math.random() - 0.5) * (1 - cons) * 0.01;
						pt.vy += (Math.random() - 0.5) * (1 - cons) * 0.01;
					}
				}
			}

			/* integrate */
			pt.vx *= drag;
			pt.vy *= drag;
			pt.vz *= drag;
			pt.x += pt.vx * delta * 60;
			pt.y += pt.vy * delta * 60;
			pt.z += pt.vz * delta * 60;
			pt.life -= delta * 0.4;

			this.posAttr.setXYZ(p, pt.x, pt.y, pt.z);
			this.lifeAttr.setX(p, Math.max(0, pt.life));
		}

		this.posAttr.needsUpdate = true;
		this.colorAttr.needsUpdate = true;
		this.sizeAttr.needsUpdate = true;
		this.lifeAttr.needsUpdate = true;

		/* Background: complementary hue to the amplitude-weighted average of active notes.
		   Uses the circle of fifths hue mapping so related notes share color neighborhoods.
		   Complementary (180° opposite) ensures high contrast with the particles.
		   Very low lightness keeps it dark; saturation fades in gently with amplitude. */
		if (activeSlots.length > 0) {
			let sinSum = 0, cosSum = 0, ampSum = 0;
			for (const { slot } of activeSlots) {
				const [h] = pitchToHSL(slot.pitchNormalized, time);
				const w = slot.amplitude;
				sinSum += Math.sin(h * Math.PI * 2) * w;
				cosSum += Math.cos(h * Math.PI * 2) * w;
				ampSum += w;
			}
			/* circular mean of hues (avoids red/violet wraparound artifacts) */
			const avgHue = (Math.atan2(sinSum, cosSum) / (Math.PI * 2) + 1) % 1;
			/* complementary: shift 180° */
			const compHue = (avgHue + 0.5) % 1;
			/* smoothly interpolate toward target to avoid jarring jumps */
			const targetHue = compHue;
			const targetSat = Math.min(0.35, ampSum * 0.08);
			const targetLit = 0.04 + Math.min(0.06, ampSum * 0.015);
			this.bgHue += (targetHue - this.bgHue) * 0.05;
			/* wrap hue smoothly across the 0/1 boundary */
			if (Math.abs(targetHue - this.bgHue) > 0.5) this.bgHue = targetHue;
			const [br, bg, bb] = hslToRGB(this.bgHue, targetSat, targetLit);
			this.bgColor.setRGB(br, bg, bb);
		} else {
			/* fade to black when nothing is playing */
			this.bgColor.lerp(new Color(0x000000), 0.03);
		}
	};
}

/* ── post export ───────────────────────────────────────────── */

const post: Post = {
	summary: {
		type: PostType.experiment3d,
		id: 'note-shader-3',
		title: 'Note Particles',
		subtitle: 'A particle synth — play your keyboard',
		timestamp: new Date(2026, 2, 29),
		tags: ['webgl', 'music', 'particles', 'physics']
	},
	content: () => new NoteShader3Content(),
	params: visualizationParams
};

export default post;
