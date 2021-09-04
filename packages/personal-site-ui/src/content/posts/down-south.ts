import { Post, PostType } from "personal-site-model";
import { BookOfShadersContent } from "../book-of-shaders";
import {
  Camera,
  Scene,
  Texture,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from "three";
import { IUniform } from "three/src/renderers/shaders/UniformsLib";

const noop = () => {};

function loadAsTexture(
  url: string,
  onLoad: (texture: Texture) => void = noop,
): Texture {
  const loader = new TextureLoader();
  return loader.load(url, onLoad);
}

class NoteShaderContent extends BookOfShadersContent {
  private setImageUniforms = () => {
    const image = this.downSouthDay.image;
    if (image) {
      this.uniforms.u_imageResolution.value.x = image.width;
      this.uniforms.u_imageResolution.value.y = image.height;

      const imageAspect = image.width / image.height;

      const aspectRatio =
        this.uniforms.u_resolution.value.x / this.uniforms.u_resolution.value.y;

      const yScale = 0.8;
      this.uniforms.u_imageScale.value.x = (yScale * imageAspect) / aspectRatio;
      this.uniforms.u_imageScale.value.y = yScale;
      console.log("image scale: ", this.uniforms.u_imageScale.value);
    }
  };

  private readonly downSouthDay = loadAsTexture(
    "/images/down_south_day.jpg",
    (tex) => {
      this.handleResize();
      this.setImageUniforms();
    },
  );
  private readonly downSouthNight = loadAsTexture(
    "/images/down_south_night.jpg",
  );

  constructor() {
    super();
    this.uniforms.u_downSouthDay = {
      type: "t",
      value: this.downSouthDay,
    } as IUniform<Texture>;
    this.uniforms.u_downSouthNight = {
      type: "t",
      value: this.downSouthNight,
    } as IUniform<Texture>;
    this.uniforms.u_imageResolution = {
      type: "v2",
      value: new Vector2(),
    } as IUniform<Vector2>;
    this.uniforms.u_imageScale = {
      type: "v2",
      value: new Vector2(),
    } as IUniform<Vector2>;
  }

  start = (scene: Scene, camera: Camera, renderer: WebGLRenderer) => {
    super.start(scene, camera, renderer);
  };

  onRender = () => {
    super.onRender();
  };

  stop = () => {
    super.stop();
  };

  onResize = (res: Vector2) => {
    this.setImageUniforms();
  };

  getFragmentShader =
    // language=GLSL
    () => `
      #ifdef GL_ES
      precision mediump float;
      #endif

      uniform vec2 u_resolution;
      uniform vec2 u_imageResolution;
      uniform vec2 u_imageScale;
      uniform vec2 u_mouse;
      uniform float u_time;

      uniform sampler2D u_downSouthNight;
      uniform sampler2D u_downSouthDay;

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;

        vec2 center = vec2(0.5, 0.5);

        float mx = (1. - u_imageScale.x)/2.;
        float my = (1. - u_imageScale.y)/2.;
        
        bool xBounds = st.x < mx || st.x > 1. - mx;
        bool yBounds = st.y < my || st.y > 1. - my;
        
        vec2 imgStart = vec2(mx, my);

        if (xBounds || yBounds) {
          gl_FragColor = vec4(vec3(0.), 1.);
        } else {
          vec2 coord = (st - imgStart) / u_imageScale;

          vec4 colorDay = texture2D(u_downSouthDay, coord);
          vec4 colorNight = texture2D(u_downSouthNight, coord);

          float d = distance(st, u_mouse/u_resolution);
          float mixValue = d < 0.1 ? 0. : 1.;
          
          gl_FragColor = mix(colorNight, colorDay, mixValue);
        }
      }
    `;
}

const post: Post = {
  summary: {
    type: PostType.experiment3d,
    id: "down-south",
    title: "Down South",
    timestamp: new Date(2021, 7, 5),
    tags: ["webgl", "art", "eva", "collaboration"],
  },
  content: () => new NoteShaderContent(),
};

export default post;
