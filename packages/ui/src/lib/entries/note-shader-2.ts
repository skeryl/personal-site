import { type Post, PostType, type RendererParams } from '@sc/model';
import { BookOfShadersContent } from '../book-of-shaders';
import { DefaultKeyMapping, Pitch, type KeyNoteMapping } from '@sc/synth-builder/src/model/notes';
import { type IUniform } from '$lib/three';
import { MutableAudioNode as AudioGraphNode } from '@sc/synth-builder/src/core/nodes/MutableAudioNode';
import { MutableAudioGraph } from '@sc/synth-builder/src/core/nodes/MutableAudioGraph';
import { NodeTypes } from '@sc/synth-builder/src/model/nodes';
import { getReleaseTime, Synth } from '@sc/synth-builder/src/core/Synth';
import { DataTexture, FloatType, LinearFilter, NearestFilter, RGBAFormat } from 'three';
import {
	type ContentParams,
	type ContentParam,
	ParamType,
	numberParam,
	selectParam,
	paramsById
} from '$lib/content-params';

/* ── constants ─────────────────────────────────────────────── */

const MAX_SLOTS = 12;
const FREQ_BINS = 256;
const FFT_SIZE = FREQ_BINS * 2;
const MIN_DB = -70;
const MAX_DB = -10;
const DB_RANGE = MAX_DB - MIN_DB;
const GLOBAL_FREQ_BINS = 64;

/* build a pitch → numeric index lookup (C0=0 … B8=107) */
const ALL_PITCHES = Object.values(Pitch);
const PITCH_INDEX = new Map<Pitch, number>(ALL_PITCHES.map((p, i) => [p, i]));

/* normalize to the playable keyboard range instead of full C0-B8 */
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

/* ── note slot manager ─────────────────────────────────────── */

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

		/* detect newly pressed notes */
		for (const pitch of notesPlaying) {
			if (this.previouslyPlaying.has(pitch)) continue;

			/* already have a slot for this pitch? reactivate it */
			const existing = this.slots.find((s) => s.pitch === pitch);
			if (existing) {
				existing.state = 'active';
				existing.amplitude = 1.0;
				continue;
			}

			/* find a free slot */
			let target = this.slots.find((s) => s.state === 'silent');
			if (!target) {
				/* evict the releasing slot with lowest amplitude */
				let minAmp = Infinity;
				for (const s of this.slots) {
					if (s.state === 'releasing' && s.amplitude < minAmp) {
						minAmp = s.amplitude;
						target = s;
					}
				}
			}
			if (!target) continue; /* all 12 slots actively held — rare */

			const idx = PITCH_INDEX.get(pitch) ?? 0;
			target.pitch = pitch;
			target.pitchNormalized = Math.max(0, Math.min(1, (idx - MIN_PLAYABLE) / PLAYABLE_RANGE));
			target.amplitude = 1.0;
			target.state = 'active';
			target.releaseStart = 0;
		}

		/* detect released notes */
		for (const s of this.slots) {
			if (s.state === 'active' && s.pitch !== null && !notesPlaying.has(s.pitch)) {
				s.state = 'releasing';
				s.releaseStart = now;
			}
		}

		/* decay releasing notes */
		for (const s of this.slots) {
			if (s.state === 'releasing') {
				const elapsed = now - s.releaseStart;
				s.amplitude = Math.exp(-elapsed / (this.releaseTimeMs * 0.4));
				if (s.amplitude < 0.005) {
					s.state = 'silent';
					s.pitch = null;
					s.amplitude = 0;
				}
			}
		}

		this.previouslyPlaying = new Set(notesPlaying);
	}

	get activeCount(): number {
		return this.slots.filter((s) => s.state !== 'silent').length;
	}

	get totalAmplitude(): number {
		return this.slots.reduce((sum, s) => sum + s.amplitude, 0);
	}
}

/* ── helpers ───────────────────────────────────────────────── */

/** normalize a dB frequency value to 0–1 */
function normDB(db: number): number {
	return Math.max(0, Math.min(1, (db - MIN_DB) / DB_RANGE));
}

/** downsample a Float32Array to targetSize bins (average) */
function downsample(source: Float32Array, targetSize: number): number[] {
	const result = new Array<number>(targetSize);
	const ratio = source.length / targetSize;
	for (let i = 0; i < targetSize; i++) {
		const start = Math.floor(i * ratio);
		const end = Math.floor((i + 1) * ratio);
		let sum = 0;
		for (let j = start; j < end; j++) sum += source[j];
		result[i] = sum / (end - start);
	}
	return result;
}

/* ── keyboard controller ───────────────────────────────────── */
/* Replaces SynthController/KeyController to fix:
   1. Uses keydown/keyup (not deprecated keypress) with a heldKeys set to deduplicate auto-repeat
   2. Releases all notes on window blur so notes never get stuck
   3. Defers listener registration to start() and cleans up in stop() */

class KeyboardSynthController {
	/* Map physical key code → pitch that was started for it.
	   Using e.code (physical key) instead of e.key (character) prevents
	   mismatches when modifier keys change between keydown and keyup
	   (e.g. pressing '1' then Shift causes keyup to report '!' instead of '1'). */
	private readonly heldKeys = new Map<string, Pitch>();
	private audioUnlocked = false;

	constructor(
		private readonly synth: Synth,
		private readonly keyMap: KeyNoteMapping
	) {}

	getHeldPitches(): Pitch[] {
		return Array.from(this.heldKeys.values());
	}

	private onKeyDown = (e: KeyboardEvent) => {
		if (e.metaKey || e.ctrlKey || e.altKey) return; /* ignore keyboard shortcuts */
		if (e.repeat) return; /* ignore auto-repeat at the event level — critical because
		   our keyup handler aggressively clears heldKeys for all same-pitch codes,
		   which would otherwise let a still-held key's auto-repeat be treated as new */
		if (this.heldKeys.has(e.code)) return; /* belt-and-suspenders dedup */

		const pitch = this.keyMap[e.key.toLowerCase()];
		if (pitch) {
			/* Unlock AudioContext on first user gesture. WebKit (Safari/DuckDuckGo)
			   requires actually playing a sound during the gesture — resume() alone
			   isn't enough. Play a silent buffer to fully unlock the audio output. */
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

		/* Remove this key AND any other keys mapping to the same pitch.
		   This cleans up phantom key entries from keyboard ghosting —
		   when multiple keys are held, some keyboards report keypresses
		   for keys that aren't physically pressed. Those phantom entries
		   would otherwise prevent stopPlaying from ever being called. */
		for (const [code, p] of this.heldKeys) {
			if (p === pitch) this.heldKeys.delete(code);
		}
		this.synth.stopPlaying(pitch);
	};

	private onBlur = () => {
		/* release every note when the window loses focus */
		const pitches = new Set(this.heldKeys.values());
		for (const pitch of pitches) {
			this.synth.stopPlaying(pitch);
		}
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
			this.onBlur(); /* release any held notes on unmount */
		};
	}
}

/* ── content params ────────────────────────────────────────── */

const MODE_NAMES = [
	'Radial',
	'Droste Spiral',
	'Möbius Lens',
	'Kaleidoscope',
	'Ripple',
	'Tunnel',
	'Fractal Mirror',
	'Diamond',
	'Vortex',
	'Fractal Mirror 2'
];

const visualizationParams: ContentParams = [
	selectParam('Mode', MODE_NAMES, 'Fractal Mirror 2'),
	selectParam(
		'Wave',
		WAVE_TYPES.map((w) => w.charAt(0).toUpperCase() + w.slice(1)),
		'Sawtooth'
	),
	numberParam('Volume', 0.08, { min: 0.01, max: 0.25, step: 0.01 }),
	numberParam('Attack', 0.95, { min: 0, max: 1, step: 0.05 }),
	numberParam('Release', 0.7, { min: 0, max: 1, step: 0.05 }),
	numberParam('Unison', 3, { min: 1, max: 6, step: 1 }),
	numberParam('Detune', 0.15, { min: 0, max: 0.5, step: 0.01 })
];

/* ── main content class ────────────────────────────────────── */

/** Access the Synth's private pitches map */
type SynthPitchNodes = {
	oscillators: { node: OscillatorNode }[];
	gains: { node: GainNode }[];
	analysers: { node: AnalyserNode }[];
	pitch: Pitch;
};
function getSynthPitches(s: Synth): Map<Pitch, SynthPitchNodes> {
	return (s as unknown as { pitches: Map<Pitch, SynthPitchNodes> }).pitches;
}

class NoteShader2Content extends BookOfShadersContent {
	private readonly synth = (() => {
		const s = new Synth(getAudioGraph(), {
			attack: 0.95,
			release: 0.7,
			unison: 3,
			unisonDetune: 0.15
		});

		/* FIX: The Synth's `releasing` TimeSensitiveMap captures `onReleaseFinished`
		   at construction time. The default implementation calls cancelScheduledValues(),
		   which can cancel the release ramp if the timer fires at the exact ramp end time,
		   snapping the gain back to maxGain (the setValueAtTime anchor). Replace the
		   captured callback on the TimeSensitiveMap to properly clean up instead. */
		const releasing = (
			s as unknown as { releasing: { onDelete: (pitch: Pitch, params: AudioParam[]) => void } }
		).releasing;
		releasing.onDelete = (pitch: Pitch) => {
			/* Don't cancelScheduledValues — let the ramp finish naturally.
			   Just stop and disconnect the oscillators to free resources. */
			const pitches = getSynthPitches(s);
			const nodes = pitches.get(pitch);
			if (nodes) {
				nodes.oscillators.forEach((o) => {
					try {
						o.node.stop();
						o.node.disconnect();
					} catch {
						/* already stopped */
					}
				});
				nodes.gains.forEach((g) => {
					try {
						g.node.disconnect();
					} catch {
						/* noop */
					}
				});
				nodes.analysers.forEach((a) => {
					try {
						a.node.disconnect();
					} catch {
						/* noop */
					}
				});
				pitches.delete(pitch);
			}
		};
		return s;
	})();

	private readonly keyboardController = new KeyboardSynthController(this.synth, DefaultKeyMapping);

	private readonly releaseTimeMs = getReleaseTime(this.synth.settings) * 1000;
	private readonly slotManager = new NoteSlotManager(this.releaseTimeMs);

	/* DataTexture: width=FREQ_BINS, height=MAX_SLOTS, RGBA float */
	private readonly textureData = new Float32Array(MAX_SLOTS * FREQ_BINS * 4);
	private readonly dataTexture = (() => {
		const tex = new DataTexture(this.textureData, FREQ_BINS, MAX_SLOTS, RGBAFormat, FloatType);
		tex.minFilter = LinearFilter;
		tex.magFilter = LinearFilter;
		tex.needsUpdate = true;
		return tex;
	})();

	/* reusable buffers for per-pitch audio data */
	private freqBuffer = new Map<Pitch, Float32Array>();
	private timeBuffer = new Map<Pitch, Float32Array>();

	private container: HTMLElement | undefined;
	private unmountKeyboard: (() => void) | undefined;

	private params: ContentParams = [...visualizationParams];

	constructor() {
		super();

		this.uniforms.u_noteTexture = { value: this.dataTexture } as IUniform;
		this.uniforms.u_noteCount = { value: 0 } as IUniform;
		this.uniforms.u_totalAmplitude = { value: 0.0 } as IUniform;
		this.uniforms.u_globalFreq = { value: new Array<number>(GLOBAL_FREQ_BINS).fill(0) } as IUniform;
		this.uniforms.u_mode = { value: MODE_NAMES.indexOf('Fractal Mirror 2') } as IUniform;
	}

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

		/* visualization mode */
		this.uniforms.u_mode.value = Math.max(0, MODE_NAMES.indexOf(this.strVal(byId, 'mode')));

		/* wave type — update settings, template graph, and live oscillators */
		const waveType = (this.strVal(byId, 'wave').toLowerCase() as OscillatorType) ?? 'sawtooth';
		this.synth.settings.waveType = waveType;
		/* update the audio graph template so new notes use the right type */
		for (const osc of this.synth.audioGraph.find(NodeTypes.Oscillator)) {
			osc.setProperty('type', waveType);
		}
		/* update any currently-playing oscillators */
		for (const [, nodes] of pitches) {
			nodes.oscillators.forEach((o) => {
				try {
					o.node.type = waveType;
				} catch {
					/* */
				}
			});
		}

		/* volume — update template + live gain nodes */
		const volume = this.numVal(byId, 'volume');
		this.synth.setGain(volume);
		for (const [, nodes] of pitches) {
			for (const g of nodes.gains) {
				if (g.node.gain.value > 0.0001) {
					g.node.gain.setTargetAtTime(volume, this.synth.context.currentTime, 0.02);
				}
			}
		}

		/* attack & release — just update settings, takes effect on next note */
		this.synth.settings.attack = this.numVal(byId, 'attack');
		this.synth.settings.release = this.numVal(byId, 'release');

		/* detune — update settings + live oscillators */
		const detune = this.numVal(byId, 'detune');
		this.synth.settings.unisonDetune = detune;

		/* unison — requires graph rebuild if changed */
		const unison = this.numVal(byId, 'unison');
		if (unison !== this.synth.settings.unison) {
			this.synth.settings.unison = unison;
		}
	};

	/* ── lifecycle ──────────────────────────────────────────── */

	start = (params: RendererParams) => {
		super.start(params);
		this.container = params.container;
		this.container.addEventListener('pointerdown', this.onPointer);
		this.container.addEventListener('pointermove', this.onPointer);
		this.unmountKeyboard = this.keyboardController.mount(document);
	};

	stop = () => {
		super.stop();
		if (this.container) {
			this.container.removeEventListener('pointerdown', this.onPointer);
			this.container.removeEventListener('pointermove', this.onPointer);
		}
		this.unmountKeyboard?.();
		this.synth.destroy();
	};

	/* ── touch / pointer → u_mouse ─────────────────────────── */

	private onPointer = (e: PointerEvent) => {
		this.uniforms.u_mouse.value.x = e.pageX;
		this.uniforms.u_mouse.value.y =
			(this.container?.getBoundingClientRect().height ?? 0) -
			(e.pageY - (this.container?.getBoundingClientRect().top ?? 0));
	};

	/* ── render loop ───────────────────────────────────────── */

	/** Track when each pitch left `playing` so we can time-gate the cleanup */
	private readonly releaseTimestamps = new Map<Pitch, number>();

	onRender = () => {
		const playing = this.synth.notesPlaying;
		const now = performance.now();

		/* Update release timestamps */
		for (const pitch of this.releaseTimestamps.keys()) {
			if (playing.has(pitch)) this.releaseTimestamps.delete(pitch);
		}
		const pitches = getSynthPitches(this.synth);
		for (const [pitch] of pitches) {
			if (!playing.has(pitch) && !this.releaseTimestamps.has(pitch)) {
				this.releaseTimestamps.set(pitch, now);
			}
		}

		/* Gain audit: force-silence any oscillator that has been out of
		   `playing` for longer than the release time + grace period.
		   This catches zombie audio regardless of cause while preserving
		   the normal release envelope. */
		const maxReleaseAge = this.releaseTimeMs + 500;
		for (const [pitch, releasedAt] of this.releaseTimestamps) {
			if (now - releasedAt > maxReleaseAge) {
				const nodes = pitches.get(pitch);
				if (nodes) {
					console.log(
						`[AUDIT] killing zombie: ${pitch} age=${((now - releasedAt) / 1000).toFixed(1)}s gains=[${nodes.gains.map((g) => g.node.gain.value.toFixed(6)).join(',')}]`
					);
					nodes.oscillators.forEach((o) => {
						try {
							o.node.stop();
							o.node.disconnect();
						} catch {
							/* */
						}
					});
					nodes.gains.forEach((g) => {
						try {
							g.node.disconnect();
						} catch {
							/* */
						}
					});
					nodes.analysers.forEach((a) => {
						try {
							a.node.disconnect();
						} catch {
							/* */
						}
					});
					pitches.delete(pitch);
				}
				this.releaseTimestamps.delete(pitch);
			}
		}

		/* 1. update slot manager */
		this.slotManager.update(playing);

		/* 2. get per-note audio data only for pitches with active/releasing slots.
		   Using the synth's full getFrequencyDataByPitch would include zombie
		   oscillators that still run at MINIMUM_GAIN after release. */
		this.freqBuffer.clear();
		this.timeBuffer.clear();
		if (this.slotManager.activeCount > 0) {
			this.synth.getFrequencyDataByPitch(this.freqBuffer);
			this.synth.getTimeDomainDataByPitch(this.timeBuffer);
		}

		/* 3. pack data texture */
		const td = this.textureData;
		for (let i = 0; i < MAX_SLOTS; i++) {
			const slot = this.slotManager.slots[i];
			const rowOffset = i * FREQ_BINS * 4;

			if (slot.state === 'silent' || slot.pitch === null) {
				/* zero the row */
				td.fill(0, rowOffset, rowOffset + FREQ_BINS * 4);
				continue;
			}

			const freqData = this.freqBuffer.get(slot.pitch);
			const timeData = this.timeBuffer.get(slot.pitch);

			for (let j = 0; j < FREQ_BINS; j++) {
				const off = rowOffset + j * 4;
				td[off + 0] = freqData ? normDB(freqData[j]) : 0; /* R: freq magnitude 0-1 */
				td[off + 1] = timeData ? timeData[j] * 0.5 + 0.5 : 0.5; /* G: time domain centered */
				td[off + 2] = slot.amplitude; /* B: envelope */
				td[off + 3] = slot.pitchNormalized; /* A: pitch index */
			}
		}
		this.dataTexture.needsUpdate = true;

		/* 4. update scalar uniforms */
		this.uniforms.u_noteCount.value = this.slotManager.activeCount;
		this.uniforms.u_totalAmplitude.value = this.slotManager.totalAmplitude;

		/* 5. global freq data (for background) — only when notes are actually active,
		   otherwise zero out to suppress zombie oscillator noise */
		const arr = this.uniforms.u_globalFreq.value as number[];
		if (this.slotManager.activeCount > 0) {
			const globalFreq = this.synth.getFrequencyData();
			if (globalFreq) {
				const ds = downsample(globalFreq, GLOBAL_FREQ_BINS);
				for (let i = 0; i < GLOBAL_FREQ_BINS; i++) {
					arr[i] = Math.floor(Math.max(0, Math.min(255, normDB(ds[i]) * 255)));
				}
			}
		} else {
			arr.fill(0);
		}

		super.onRender();
	};

	/* ── shader ─────────────────────────────────────────────── */

	getFragmentShader = () => `
      #define TWO_PI  6.28318530718
      #define PI      3.14159265359
      #define MAX_SLOTS ${MAX_SLOTS}
      #define FREQ_BINS ${FREQ_BINS}
      #define GLOBAL_BINS ${GLOBAL_FREQ_BINS}

      #ifdef GL_ES
      precision highp float;
      #endif

      uniform vec2  u_resolution;
      uniform vec2  u_mouse;
      uniform float u_time;

      uniform sampler2D u_noteTexture;
      uniform int   u_noteCount;
      uniform float u_totalAmplitude;
      uniform int   u_globalFreq[GLOBAL_BINS];
      uniform int   u_mode;

      /* ── HSL → RGB ───────────────────────────────────────── */
      vec3 hsl2rgb(float h, float s, float l) {
        vec3 rgb = clamp(
          abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
          0.0, 1.0
        );
        return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
      }

      /* ── pitch → color (circle of fifths → color wheel) ── */
      vec3 pitchColor(float pitchNorm, float amplitude, float freqMag) {
        /* map pitch to semitone, then walk the circle of fifths */
        float pitchIdx = pitchNorm * ${PLAYABLE_RANGE}.0 + ${MIN_PLAYABLE}.0;
        float semitone = mod(floor(pitchIdx), 12.0);
        float fifths = mod(semitone * 7.0, 12.0);
        float hue = fract(fifths / 12.0 + u_time * 0.01);
        float sat = 0.55 + 0.4 * amplitude;
        float lit = 0.15 + 0.55 * freqMag * amplitude;
        return hsl2rgb(hue, sat, lit);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;
        vec2 center = vec2(0.5);
        vec2 toCenter = st - center;

        /* ── conformal map transforms ────────────────────── */
        if (u_mode == 1) {
          /* Droste spiral: log-polar with time rotation */
          float r = length(toCenter);
          float a = atan(toCenter.y, toCenter.x);
          float logR = log(max(r, 0.001));
          float spiralAngle = a + logR * 1.5 + u_time * 0.3;
          float spiralR = fract(logR * 0.8 + 0.5) * 0.5;
          toCenter = spiralR * vec2(cos(spiralAngle), sin(spiralAngle));
        }
        else if (u_mode == 2) {
          /* Möbius lens: disk automorphism centered on mouse */
          vec2 mp = (u_mouse / u_resolution - center) * 1.6;
          vec2 z = toCenter * 2.0;
          /* complex division: (z - mp) / (1 - conj(mp)*z) */
          float dr = 1.0 - (mp.x * z.x + mp.y * z.y);
          float di = mp.y * z.x - mp.x * z.y;
          float d2 = dr * dr + di * di + 0.0001;
          vec2 num = z - mp;
          toCenter = vec2(
            num.x * dr + num.y * di,
            num.y * dr - num.x * di
          ) / (d2 * 2.0);
        }
        else if (u_mode == 3) {
          /* Kaleidoscope: 6-fold mirror symmetry */
          float a = atan(toCenter.y, toCenter.x) + PI;
          float r = length(toCenter);
          float sector = TWO_PI / 6.0;
          a = mod(a, sector);
          if (a > sector * 0.5) a = sector - a;
          toCenter = r * vec2(cos(a - PI), sin(a - PI));
        }
        else if (u_mode == 4) {
          /* Ripple: audio-reactive radial wave */
          float r = length(toCenter);
          float wave = sin(r * 30.0 - u_time * 4.0) * 0.02 * min(u_totalAmplitude, 2.0);
          toCenter *= 1.0 + wave / max(r, 0.01);
        }
        else if (u_mode == 5) {
          /* Tunnel: log-polar unrolled into a repeating tunnel with perspective */
          float r = length(toCenter);
          float a = atan(toCenter.y, toCenter.x);
          float depth = 1.0 / max(r, 0.01);
          float tunnelR = fract(depth * 0.08 - u_time * 0.15) * 0.5;
          float tunnelA = a + depth * 0.2;
          toCenter = tunnelR * vec2(cos(tunnelA), sin(tunnelA));
        }
        else if (u_mode == 6) {
          /* Fractal Mirror: nested kaleidoscope with decreasing scale */
          float r = length(toCenter);
          float a = atan(toCenter.y, toCenter.x) + PI;
          /* first fold: 6-way */
          float sector = TWO_PI / 6.0;
          a = mod(a, sector);
          if (a > sector * 0.5) a = sector - a;
          /* second fold: scale-dependent 3-way reflection */
          float innerA = a * 3.0;
          innerA = mod(innerA, sector);
          if (innerA > sector * 0.5) innerA = sector - innerA;
          float blend = smoothstep(0.1, 0.25, r);
          a = mix(innerA, a, blend);
          toCenter = r * vec2(cos(a - PI), sin(a - PI));
        }
        else if (u_mode == 7) {
          /* Diamond: 4-fold symmetry with absolute-value folding */
          toCenter = abs(toCenter);
          /* rotate 45 degrees to get diamond orientation */
          float c45 = 0.7071;
          toCenter = vec2(
            toCenter.x * c45 - toCenter.y * c45,
            toCenter.x * c45 + toCenter.y * c45
          );
          toCenter = abs(toCenter);
        }
        else if (u_mode == 8) {
          /* Vortex: angular displacement increases with radius, audio-reactive spin */
          float r = length(toCenter);
          float a = atan(toCenter.y, toCenter.x);
          float spin = r * 8.0 * (1.0 + u_totalAmplitude * 0.5) - u_time * 1.5;
          /* kaleidoscope fold inside the vortex */
          float folded = mod(a + spin, TWO_PI / 5.0);
          if (folded > PI / 5.0) folded = TWO_PI / 5.0 - folded;
          toCenter = r * vec2(cos(folded), sin(folded));
        }
        else if (u_mode == 9) {
          /* Fractal Mirror 2: audio-reactive symmetry + spectral vibration */
          float r = length(toCenter);
          float a = atan(toCenter.y, toCenter.x) + PI;

          /* Sample aggregate spectral energy across active notes to measure
             harmonic complexity — more overtones / discordance = more energy
             in the upper frequency bins relative to the fundamental */
          float loEnergy = 0.0;
          float hiEnergy = 0.0;
          for (int i = 0; i < MAX_SLOTS; i++) {
            vec2 metaUV = vec2(0.5 / float(FREQ_BINS), (float(i) + 0.5) / float(MAX_SLOTS));
            float amp = texture2D(u_noteTexture, metaUV).b;
            if (amp < 0.005) continue;
            /* sample low bins (fundamentals) and high bins (overtones) */
            for (int b = 0; b < 4; b++) {
              float u = (float(b) * 8.0 + 4.0) / float(FREQ_BINS);
              loEnergy += texture2D(u_noteTexture, vec2(u, (float(i) + 0.5) / float(MAX_SLOTS))).r * amp;
            }
            for (int b = 0; b < 4; b++) {
              float u = (float(b) * 8.0 + 68.0) / float(FREQ_BINS);
              hiEnergy += texture2D(u_noteTexture, vec2(u, (float(i) + 0.5) / float(MAX_SLOTS))).r * amp;
            }
          }
          float complexity = hiEnergy / max(loEnergy + hiEnergy, 0.001);

          /* Primary fold: symmetry order oscillates with music.
             Quiet/simple → 5-fold (clean, crystalline).
             Loud/complex → 3-fold (more open, chaotic feel).
             Oscillates gently with time so it breathes even during sustained notes. */
          float nBase = mix(5.0, 3.0, clamp(complexity * 2.0, 0.0, 1.0));
          float nOsc = sin(u_time * 0.4 + u_totalAmplitude * 1.5) * 0.8;
          float n = max(2.5, nBase + nOsc);
          float sector = TWO_PI / n;
          a = mod(a, sector);
          if (a > sector * 0.5) a = sector - a;

          /* Inner fold: tighter subdivision that responds to amplitude.
             Creates the fractal "nesting" effect — more layers when louder. */
          float innerN = 2.0 + u_totalAmplitude * 1.5;
          float innerSector = sector / innerN;
          float innerA = mod(a, innerSector);
          if (innerA > innerSector * 0.5) innerA = innerSector - innerA;

          /* Blend between inner and outer based on radius — center is more fractal,
             edges are calmer. Amplitude pushes the fractal zone outward. */
          float fractalEdge = 0.12 + u_totalAmplitude * 0.08;
          float blend = smoothstep(fractalEdge, fractalEdge + 0.15, r);
          a = mix(innerA, a, blend);

          /* Angular vibration from waveform — sample time-domain data at this angle
             to create micro-wobble tied to the actual wave shape */
          float waveU = a / sector; /* normalized within the folded sector */
          float wobble = 0.0;
          for (int i = 0; i < MAX_SLOTS; i++) {
            vec2 wUV = vec2(waveU, (float(i) + 0.5) / float(MAX_SLOTS));
            vec4 wd = texture2D(u_noteTexture, wUV);
            wobble += (wd.g - 0.5) * wd.b; /* time-domain * amplitude */
          }
          a += wobble * 0.06;

          /* Radius-dependent rotation — creates a gentle twist that
             increases with spectral complexity */
          a += r * complexity * 3.0 * sin(u_time * 0.7);

          toCenter = r * vec2(cos(a - PI), sin(a - PI));
        }

        float angle  = atan(toCenter.y, toCenter.x) + PI;   /* 0 → 2PI */
        float radius = length(toCenter);

        /* mouse in normalized coordinates */
        vec2 mouseNorm = u_mouse / u_resolution;
        float mouseRadius = length(mouseNorm - center);

        vec3 color = vec3(0.0);

        /* ── per-note rings ──────────────────────────────── */
        for (int i = 0; i < MAX_SLOTS; i++) {
          /* sample metadata from first texel of row i */
          vec2 metaUV = vec2(0.5 / float(FREQ_BINS), (float(i) + 0.5) / float(MAX_SLOTS));
          vec4 meta = texture2D(u_noteTexture, metaUV);
          float amplitude  = meta.b;
          float pitchNorm  = meta.a;

          if (amplitude < 0.005) continue;

          /* ring position: low pitch → inner, high pitch → outer */
          float noteRadius = 0.05 + pitchNorm * 0.42;

          /* base ring width, widened by amplitude */
          float ringWidth = 0.012 + amplitude * 0.035;

          /* mouse proximity boost */
          float mouseDist = abs(radius - mouseRadius);
          ringWidth *= 1.0 + 0.4 * smoothstep(0.15, 0.0, mouseDist);

          /* distance from this ring */
          float ringDist = abs(radius - noteRadius);

          /* sample frequency magnitude at current angle (multi-sample for smoothness) */
          float rowV = (float(i) + 0.5) / float(MAX_SLOTS);
          float freqU = angle / TWO_PI;
          float texelW = 1.0 / float(FREQ_BINS);

          /* 3-tap weighted average along angular axis to smooth bin boundaries */
          vec4 s0 = texture2D(u_noteTexture, vec2(freqU - texelW, rowV));
          vec4 s1 = texture2D(u_noteTexture, vec2(freqU, rowV));
          vec4 s2 = texture2D(u_noteTexture, vec2(freqU + texelW, rowV));
          vec4 noteData = 0.25 * s0 + 0.5 * s1 + 0.25 * s2;

          float freqMag    = noteData.r;
          float timeDomain = noteData.g;

          /* waveform distortion on ring edge */
          float waveOffset = (timeDomain - 0.5) * 0.018 * amplitude;
          float distortedDist = abs(radius - noteRadius + waveOffset);

          /* freq magnitude expands the ring outward at spectral peaks */
          float dynamicWidth = ringWidth + freqMag * 0.03 * amplitude;

          /* smooth ring falloff with inner softness to avoid hard center edge */
          float ring = 1.0 - smoothstep(0.0, dynamicWidth * 1.2, distortedDist);

          /* intensity: ring shape × frequency detail × envelope */
          float intensity = ring * (0.3 + 0.7 * freqMag) * amplitude;

          /* outer glow — wider and softer */
          float glowWidth = 0.005 * amplitude + 0.0002;
          float glow = exp(-distortedDist * distortedDist / glowWidth) * amplitude * 0.2;
          intensity += glow;

          /* color from pitch */
          vec3 noteColor = pitchColor(pitchNorm, amplitude, freqMag);

          /* additive blend */
          color += noteColor * intensity;
        }

        /* ── background ambient ──────────────────────────── */
        float bgIdx = floor((angle / TWO_PI) * float(GLOBAL_BINS));
        int bgI = int(bgIdx);
        float bgVal = 0.0;
        /* manual unrolled lookup (GLSL 100 can't index array with variable in all impls) */
        for (int k = 0; k < GLOBAL_BINS; k++) {
          if (k == bgI) { bgVal = float(u_globalFreq[k]) / 255.0; break; }
        }
        float bgRing = smoothstep(0.44, 0.45, radius) * (1.0 - smoothstep(0.45, 0.46, radius));
        color += vec3(0.04, 0.02, 0.06) * (0.5 + bgVal * 0.5);
        color += vec3(0.08, 0.04, 0.12) * bgRing * bgVal;

        /* idle pulse when nothing is playing */
        float idle = 1.0 - smoothstep(0.0, 1.0, u_totalAmplitude);
        float pulseRadius = 0.2 + 0.02 * sin(u_time * 1.5);
        float pulse = exp(-(radius - pulseRadius) * (radius - pulseRadius) / 0.002) * 0.08 * idle;
        color += vec3(0.15, 0.08, 0.25) * pulse;

        /* ── vignette ────────────────────────────────────── */
        float vignette = 1.0 - smoothstep(0.3, 0.7, radius);
        color *= 0.5 + 0.5 * vignette;

        /* subtle overall warmth */
        color += vec3(0.01, 0.005, 0.015);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
}

/* ── post export ───────────────────────────────────────────── */

const post: Post = {
	summary: {
		type: PostType.experiment3d,
		id: 'note-shader-2',
		title: 'Note Shader 2',
		subtitle: 'A radial spectrogram synth — play your keyboard',
		timestamp: new Date(2026, 2, 28),
		tags: ['webgl', 'music', 'the-book-of-shaders', 'spectrogram', 'conformal-map']
	},
	content: () => new NoteShader2Content(),
	params: visualizationParams
};

export default post;
