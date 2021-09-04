import * as React from "react";
import { PostProps } from "./Post";
import { PostType } from "personal-site-model";
import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from "three";
import { FullScreenButton } from "../FullScreenButton";
import { MouseActiveTracker } from "../../utils/MouseActiveTracker";
import { ActionsTray } from "../ActionsTray";

interface State {
  isMouseActive: boolean;
}

function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export class ExperimentComponent3D extends React.Component<
  PostProps<PostType.experiment3d>,
  State
> {
  state = {
    isMouseActive: false,
    isFullScreen: false,
  };

  private isRunning = false;

  private scene: Scene | undefined;
  private camera: PerspectiveCamera | undefined;
  private renderer: WebGLRenderer | undefined;
  private mouseActiveTracker: MouseActiveTracker | undefined;

  private readonly res: Vector2 = new Vector2();

  private readonly canvasRef = React.createRef<HTMLCanvasElement>();

  componentDidMount(): void {
    const canvas = this.canvasRef.current as HTMLCanvasElement;

    this.renderer = new WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    window.addEventListener("resize", this.handleResize);
    this.mouseActiveTracker = new MouseActiveTracker(
      canvas,
      this.onMouseActiveChange,
      3000,
    );
    this.handleResize();
    this.props.content.start(this.scene, this.camera, this.renderer);
    this.isRunning = true;
    this.animate();
    window.setTimeout(() => this.handleResize(), 100);
  }

  componentWillUnmount(): void {
    this.isRunning = false;
    this.props.content.stop();
    window.removeEventListener("resize", this.handleResize);
  }

  render() {
    return (
      <div
        id="experiment-canvas-3d"
        className={`mouse-tracker mouse-${
          this.state.isMouseActive ? "active" : "inactive"
        }`}
      >
        <canvas ref={this.canvasRef}>
          hey, your browser must support the "canvas" component for this to work
        </canvas>
        <ActionsTray show={this.state.isMouseActive}>
          <FullScreenButton onClick={this.onFullScreenClicked} />
        </ActionsTray>
      </div>
    );
  }

  onMouseActiveChange = (status: boolean) => {
    this.setState({ isMouseActive: status });
  };

  onFullScreenClicked = () => {
    if (isFullscreen()) {
      document.exitFullscreen().then(() => {
        if (this.props.content.onFullScreenChange) {
          this.props.content.onFullScreenChange(false);
        }
      });
    } else {
      const elem =
        this.canvasRef.current && this.canvasRef.current.parentElement;
      if (elem) {
        elem.requestFullscreen().then(() => {
          if (this.props.content.onFullScreenChange) {
            this.props.content.onFullScreenChange(true);
          }
        });
      }
    }
  };

  private animate = () => {
    if (this.isRunning && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
      if (this.props.content.onRender) {
        this.props.content.onRender();
      }
      requestAnimationFrame(this.animate);
    }
  };

  public handleResize = () => {
    const canvas = this.canvasRef.current;
    const camera = this.camera;
    if (this.renderer && canvas && canvas.parentElement && camera) {
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      this.res.x = width;
      this.res.y = height;
      canvas.width = width;
      canvas.height = height;

      console.log("res: ", this.res);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      this.renderer.setSize(width, height, true);
    }
  };
}
