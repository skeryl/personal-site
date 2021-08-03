import { Synth, SynthesizerSettings } from "../core/Synth";
import { MutableAudioGraph } from "../core/nodes/MutableAudioGraph";
import { IAudioGraph } from "../core/nodes";
import { v4 as uuid } from "uuid";
import { Pitch } from "../model/notes";
import { IAudioNode } from "../core/nodes/MutableAudioNode";
import { Instrument } from "../core/Instrument";

export interface SynthMetadata {
  id: string;
  name: string;
  lastUpdated: Date;
}

interface PersistedSynthMetadata extends Pick<SynthMetadata, "id" | "name"> {
  lastUpdated: string;
}

export interface ISynth extends Instrument {
  id: string | undefined;
  settings: SynthesizerSettings;
  audioGraph: IAudioGraph;
  metadata: SynthMetadata;
  changeSettings: (
    settings: Partial<SynthesizerSettings>,
  ) => SynthesizerSettings;
  notesPlaying: ReadonlySet<Pitch>;
  setGain: (gain: number) => void;
  gainNodes: IAudioNode[];
  getTimeDomainData: () => Float32Array | undefined;
  getFrequencyData: () => Float32Array | undefined;
}

interface PersistedSynth {
  settings: SynthesizerSettings;
  metadata: PersistedSynthMetadata;
  audioGraph: string;
}

function deserializeSynthMetadata({
  lastUpdated,
  ...other
}: PersistedSynthMetadata): SynthMetadata {
  return { ...other, lastUpdated: new Date(lastUpdated) };
}

function serializeSynthMetadata({
  lastUpdated,
  ...other
}: SynthMetadata): PersistedSynthMetadata {
  return { ...other, lastUpdated: lastUpdated.toISOString() };
}

export interface SynthService {
  listSynths(): Promise<ISynth[]>;
  saveSynth(synth: ISynth): Promise<ISynth>;
  deleteSynth(synthId: string): Promise<ISynth | undefined>;
  getSynth(id: string): Promise<ISynth | undefined>;
}

function deserializeSynth(sd: PersistedSynth): [string, ISynth] {
  const synth = new Synth(
    MutableAudioGraph.deserialize(sd.audioGraph),
    sd.settings,
    deserializeSynthMetadata(sd.metadata),
  );
  return [synth.metadata.id, synth];
}

function serializeSynth(synth: ISynth): PersistedSynth {
  return {
    metadata: serializeSynthMetadata(synth.metadata),
    settings: synth.settings,
    audioGraph: synth.audioGraph.serialize(),
  };
}

function loadSynthById(id: string): PersistedSynth | undefined {
  const key = `${LocalSynthService.KEY}:${id}`;
  const persistedSynthString = localStorage.getItem(key);
  if (!persistedSynthString) {
    return undefined;
  }
  return JSON.parse(persistedSynthString) as PersistedSynth;
}

export class LocalSynthService implements SynthService {
  static KEY = "LocalSynthService";
  private readonly synths = new Map<string, ISynth>();

  constructor() {
    const synthIds = this.persistedSynthIds;
    console.log(synthIds);
    try {
      const persistedSynths = synthIds
        .map(loadSynthById)
        .filter(Boolean) as Array<PersistedSynth>;
      console.info("persisted synths: ", persistedSynths);
      this.synths = new Map<string, ISynth>(
        persistedSynths.map(deserializeSynth),
      );
      if (!this.synths.size) {
        this.saveSynth(Synth.createBasic());
      }
    } catch (e) {
      console.error(
        `Unable to load saved synths. Data is corrupt or is incompatible with deserialization.`,
        e,
      );
      console.info("Please report an issue on GitHub!");
    }
  }

  get persistedSynthIds(): string[] {
    const synthIdsStr = localStorage.getItem(LocalSynthService.KEY);
    return synthIdsStr ? (JSON.parse(synthIdsStr) as Array<string>) : [];
  }

  listSynths(): Promise<ISynth[]> {
    return Promise.resolve(Array.from(this.synths.values()));
  }

  saveSynth(synth: ISynth): Promise<ISynth> {
    const id = synth.id || uuid();
    const wasNew = !this.synths.has(id);

    synth.metadata.id = id;
    synth.metadata.lastUpdated = new Date();

    localStorage.setItem(
      `${LocalSynthService.KEY}:${id}`,
      JSON.stringify(serializeSynth(synth)),
    );

    this.synths.set(id, synth);

    if (wasNew) {
      localStorage.setItem(
        LocalSynthService.KEY,
        JSON.stringify(Array.from(this.synths.keys())),
      );
    }
    return Promise.resolve(synth);
  }

  getSynth(id: string): Promise<ISynth | undefined> {
    return Promise.resolve(this.synths.get(id));
  }

  async deleteSynth(synthId: string): Promise<ISynth | undefined> {
    const synth = this.synths.get(synthId);
    if (synth) {
      if (this.synths.delete(synthId)) {
        localStorage.removeItem(`${LocalSynthService.KEY}:${synthId}`);

        localStorage.setItem(
          LocalSynthService.KEY,
          JSON.stringify(Array.from(this.synths.keys())),
        );
      }
      return synth;
    }
    return undefined;
  }
}
