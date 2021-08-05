import { Post, PostType } from "personal-site-model";
import { BookOfShadersContent } from "../book-of-shaders";
import { LocalSynthService } from "project-synth-builder/src/services/synths";
import { DefaultKeyMapping } from "project-synth-builder/src/model/notes";
import { SynthController } from "project-synth-builder/src/core/SynthController";
import { Camera, Scene, WebGLRenderer } from "three";
import { IUniform } from "three/src/renderers/shaders/UniformsLib";
import { MutableAudioNode as AudioGraphNode } from "project-synth-builder/src/core/nodes/MutableAudioNode";
import { MutableAudioGraph } from "project-synth-builder/src/core/nodes/MutableAudioGraph";
import { NodeTypes } from "project-synth-builder/src/model/nodes";
import { Synth } from "project-synth-builder/src/core/Synth";

function getAudioGraph() {
  const osc = AudioGraphNode.createOscillator().setProperty("type", "sine");
  return MutableAudioGraph.create(
    osc.connect(
      AudioGraphNode.createGain()
        .setProperty("maxGain", 0.12)
        .connect(
          AudioGraphNode.create(NodeTypes.Analyser)
            .setProperty("minDecibels", -40)
            .setProperty("fftSize", 512)
            .setProperty("smoothingTimeConstant", 1)
            .connect(AudioGraphNode.createDestination()),
        ),
    ),
  );
}

/* scales time-domain data to integers between 0 - 255 */
function getTimeDomainDataAsArray(sourceData: Float32Array): Uint8Array {
  return Uint8Array.from(sourceData, (v) =>
    Math.floor(Math.max(0.0, Math.min(255.0, v * 255.0))),
  );
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

  constructor(private synthService = new LocalSynthService()) {
    super();
    this.uniforms.u_noteData = {
      type: "iv1",
      value: new Uint8Array(512),
    } as IUniform;
  }

  start = (scene: Scene, camera: Camera, renderer: WebGLRenderer) => {
    super.start(scene, camera, renderer);
  };

  onRender = () => {
    const timeDomainData = this.synth.getTimeDomainData();
    const freqData = this.synth.getFrequencyData();
    if (timeDomainData && freqData) {
      this.uniforms.u_noteData.value = getTimeDomainDataAsArray(timeDomainData);
      super.onRender();
    }
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
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform int u_noteData [512];

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;
        vec2 toCenter = vec2(0.5) - st;

        float angle = atan(toCenter.y, toCenter.x) + PI;

        float angularData = float(u_noteData[int(floor((angle / TWO_PI)*512.0))]) / 255.0;
        float radius = length(abs(toCenter));

        float dataValue = 1.-smoothstep(angularData, angularData*1.00125, radius*2.0);

        vec3 color = mix(vec3(1.0, 0.25, 0.25), vec3(dataValue, 0.0, 0.15), 0.5);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
}

const post: Post = {
  summary: {
    type: PostType.experiment3d,
    id: "note-shader",
    title: "Note Shader",
    timestamp: new Date(2021, 7, 5),
    tags: ["webgl", "music", "the-book-of-shaders"],
  },
  content: () => new NoteShaderContent(),
};

export default post;
