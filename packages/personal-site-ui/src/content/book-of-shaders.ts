import { ExperimentContent3D, RendererParams } from "personal-site-model";
import {
  BufferGeometry,
  Clock,
  Mesh,
  PlaneBufferGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { IUniform } from "three/src/renderers/shaders/UniformsLib";

export abstract class BookOfShadersContent implements ExperimentContent3D {
  private renderer: WebGLRenderer | undefined;
  private scene: Scene | undefined;
  private geometry: BufferGeometry | undefined;
  protected uniforms: Record<string, IUniform> = {
    u_time: { type: "f", value: 1.0 } as unknown as IUniform,
    u_resolution: {
      type: "v2",
      value: new Vector2(),
    } as unknown as IUniform,
    u_mouse: { type: "v2", value: new Vector2() } as unknown as IUniform,
  };

  private readonly clock = new Clock(false);

  protected onResize?: (resolution: Vector2) => void = () => {};

  protected handleResize = () => {
    if (this.renderer) {
      this.renderer.getSize(this.uniforms.u_resolution.value);
      this.uniforms.u_resolution.value.needsUpdate = true;
      if (this.onResize) {
        this.onResize(this.uniforms.u_resolution.value);
      }
      console.log("resolution: ", this.uniforms.u_resolution.value);
    }
  };

  onFullScreenChange = () => {
    this.handleResize();
  };

  private onWindowResize = () => {
    this.handleResize();
  };

  private onMouseMove = (e: MouseEvent) => {
    this.uniforms.u_mouse.value.x = e.pageX;
    this.uniforms.u_mouse.value.y =
      (this.renderer?.domElement.height || 0) - e.pageY;
  };

  protected getVertexShader =
    // language=GLSL
    () => `
      attribute vec2 aTextureCoord;
      varying highp vec2 vTextureCoord;
      
      void main() { 
        gl_Position = vec4( position, 1.0 );
        vTextureCoord = aTextureCoord;
      }`;

  abstract getFragmentShader: () => string;

  public start({ scene, camera, renderer }: RendererParams) {
    this.renderer = renderer;

    const vertexShader = this.getVertexShader();
    const fragmentShader = this.getFragmentShader();
    camera.position.z = 1;
    this.scene = scene;

    this.geometry = new PlaneBufferGeometry(2, 2);

    const material = new ShaderMaterial({
      depthTest: true,
      transparent: true,
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
    });

    scene.add(new Mesh(this.geometry, material));

    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize.bind(this), false);

    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.clock.start();

    this.handleResize();
  }

  public onRender() {
    this.uniforms.u_time.value += this.clock.getDelta();
  }

  public stop() {
    const scene = this.scene;
    if (!scene) {
      return;
    }
  }
}
