import * as React from "react";
import {PostProps} from "./PostSummary";
import {Experiment3D} from "../../../../personal-site-model/models";
import {Camera, PerspectiveCamera, Renderer, Scene, WebGLRenderer} from "three";

export class ExperimentComponent3D extends React.Component<PostProps<Experiment3D>> {

    private isRunning = false;

    private scene: Scene | undefined;
    private camera: Camera | undefined;
    private renderer: Renderer | undefined;

    private readonly canvasRef = React.createRef<HTMLCanvasElement>();

    componentDidMount(): void {
        const canvas = this.canvasRef.current as HTMLCanvasElement;

        this.renderer = new WebGLRenderer({ canvas: canvas, alpha: true });
        this.scene = new Scene();
        this.camera = new PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

        window.addEventListener('resize', this.onResize);

        this.onResize();
        this.props.post.start(this.scene, this.camera);
        this.isRunning = true;
        this.animate();
    }

    componentWillUnmount(): void {
        this.isRunning = false;
        this.props.post.stop();
        window.removeEventListener('resize', this.onResize);
    }

    render(){
        return (
            <div id="experiment-canvas-3d">
                <canvas ref={this.canvasRef}>
                </canvas>
            </div>
        );
    }

    private animate = () => {
        if(this.isRunning && this.renderer && this.scene && this.camera){
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(this.animate);
        }
    };

    private onResize = () => {
        const canvas = this.canvasRef.current;
        if(this.renderer && canvas){
            this.renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight, true);
        }
    };
}
