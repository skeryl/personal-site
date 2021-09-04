import { Post, PostType } from "personal-site-model";
import { BookOfShadersContent } from "../book-of-shaders";
import {
  DefaultKeyMapping,
  Pitch,
  PitchInfo,
  PitchInformation,
} from "project-synth-builder/src/model/notes";
import { SynthController } from "project-synth-builder/src/core/SynthController";
import { Camera, Scene, Vector2, WebGLRenderer } from "three";
import { IUniform } from "three/src/renderers/shaders/UniformsLib";
import { MutableAudioNode as AudioGraphNode } from "project-synth-builder/src/core/nodes/MutableAudioNode";
import { MutableAudioGraph } from "project-synth-builder/src/core/nodes/MutableAudioGraph";
import { NodeTypes } from "project-synth-builder/src/model/nodes";
import { Synth } from "project-synth-builder/src/core/Synth";

const FFT_SIZE = 512;

function getAudioGraph() {
  const osc = AudioGraphNode.createOscillator().setProperty("type", "sine");
  return MutableAudioGraph.create(
    osc.connect(
      AudioGraphNode.createGain()
        .setProperty("maxGain", 0.12)
        .connect(
          AudioGraphNode.create(NodeTypes.Analyser)
            .setProperty("minDecibels", -40)
            .setProperty("fftSize", FFT_SIZE)
            .setProperty("smoothingTimeConstant", 1)
            .connect(AudioGraphNode.createDestination()),
        ),
    ),
  );
}

/* scales float 0 - 1 data to integers between 0 - 255 */
function scaleData(sourceData: Float32Array, result: Uint8Array) {
  sourceData.forEach((d, ix) => {
    result[ix] = Math.floor(Math.max(0.0, Math.min(255.0, d * 255.0)));
  });
}

interface MorePitchInfo extends PitchInfo {
  pitch: Pitch;
  octave: number;
}

const allPitches = Object.values(Pitch);

const pitchInfo: ReadonlyMap<Pitch, MorePitchInfo> = new Map(
  allPitches.map((pitch) => {
    const pitchInfo = PitchInformation[pitch];
    return [pitch, { ...pitchInfo, pitch, octave: parseInt(pitch.substr(-1)) }];
  }),
);

const octaves = Math.max(
  ...Array.from(pitchInfo.values()).map((p) => p.octave),
);

class NoteStateController {
  private readonly pitchTimeData = new Map<Pitch, Float32Array>(
    allPitches.map((pitch) => [pitch, new Float32Array(FFT_SIZE)]),
  );

  constructor(private readonly synth: Synth) {}

  get pitchData(): ReadonlyMap<Pitch, Float32Array> {
    this.synth.getTimeDomainDataByPitch(this.pitchTimeData);
    return this.pitchTimeData;
  }
}

class NoteShaderContent extends BookOfShadersContent {
  private readonly synth = new Synth(getAudioGraph(), {
    attack: 0.99,
    release: 0.5,
    unison: 4,
    unisonDetune: 0.1,
  });

  private readonly synthController = new SynthController(
    this.synth,
    DefaultKeyMapping,
  );

  private readonly onUnmount = this.synthController.mount(document);

  private readonly noteStateController = new NoteStateController(this.synth);

  private data = new Array(allPitches.length)
    .fill(undefined)
    .map(() => ({ values: new Uint8Array(512) }));

  constructor() {
    super();
    this.uniforms.u_noteData = {
      value: this.data,
    } as IUniform;
    this.uniforms.u_noteDimensions = {
      type: "v2",
      value: new Vector2(Math.ceil(allPitches.length / octaves), octaves),
    } as IUniform;
    this.uniforms.u_noteDimensions = {
      type: "v2",
      value: new Vector2(Math.ceil(allPitches.length / octaves), octaves),
    } as IUniform;
  }

  start = (scene: Scene, camera: Camera, renderer: WebGLRenderer) => {
    super.start(scene, camera, renderer);
  };

  onRender = () => {
    const pitchData = this.noteStateController.pitchData;

    this.data.forEach((d, ix) => {
      const pitch = allPitches[ix];
      pitchData.get(pitch);
    });

    // this.uniforms.u_noteData.value = this.data;
    super.onRender();
  };

  stop = () => {
    super.stop();
    if (this.onUnmount) {
      this.onUnmount();
    }
  };

  getFragmentShader =
    // language=GLSL
    () => `
      #define TWO_PI 6.28318530718
      #define PI 3.14159265359

      #ifdef GL_ES
      precision mediump float;
      #endif

      struct NotePoint
      {
        uint values [512];
      };

      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform sampler2D u_noteData;
      uniform vec2 u_noteDimensions;

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;
        
        int i = 0;

        vec3 color = vec3(1.0, 0.25, 0.25);
        for (int x = 0; x < int(u_noteDimensions.x); x++) {
          for (int y = 0; y < int(u_noteDimensions.y); y++) {
            vec2 coords = vec2(float(x) / u_noteDimensions.x, float(y) / u_noteDimensions.y);

            vec2 toCenter = coords - st;
            float angle = atan(toCenter.y, toCenter.x) + PI;
            
            NotePoint point = u_noteData[i];

            float angularData = float(point.values[int(floor((angle / TWO_PI)*512.0))]) / 255.0;
            float radius = length(abs(toCenter));

            float dataValue = 1.-smoothstep(angularData, angularData*1.00125, radius*2.0);

            color = mix(color, vec3(dataValue, 0.0, 0.15), 0.5);
            
            i++;
          }
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;
}

const post: Post = {
  summary: {
    type: PostType.experiment3d,
    id: "note-points",
    title: "Note Points",
    timestamp: new Date(2021, 7, 13),
    isHidden: true,
    tags: ["webgl", "music"],
  },
  content: () => new NoteShaderContent(),
};

export default post;
