import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PostProps } from "./Post";
import { PostType, RendererParams } from "personal-site-model";
import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from "three";
import { FullScreenButton } from "../FullScreenButton";
import { MouseActiveTracker } from "../../utils/MouseActiveTracker";
import { ActionsTray } from "../ActionsTray";

function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export function ExperimentComponent3D(props: PostProps<PostType.experiment3d>) {
  const [isMouseActive, setIsMouseActive] = useState(false);

  const isRunning = useRef<boolean>(false);

  const res = useRef<Vector2>(new Vector2());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderParams = useRef<RendererParams>();

  const mouseActiveTracker = useRef<MouseActiveTracker>();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    renderer.shadowMap.enabled = true;

    const scene = new Scene();
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    renderParams.current = {
      scene,
      camera,
      renderer,
    };

    mouseActiveTracker.current = new MouseActiveTracker(
      canvas,
      setIsMouseActive,
      3000,
    );

    window.addEventListener("resize", handleResize);
    handleResize();
    props.content.start(renderParams.current);
    isRunning.current = true;
    animate();
    setTimeout(() => handleResize(), 10);

    return () => {
      isRunning.current = false;
      props.content.stop();
      mouseActiveTracker.current?.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useLayoutEffect(() => {
    handleResize();
  }, [canvasRef.current]);

  function handleResize() {
    const canvas = canvasRef.current;
    if (!renderParams.current || !canvas) {
      return;
    }
    const { camera, renderer } = renderParams.current;
    if (renderer && canvas && canvas.parentElement && camera) {
      const width = (canvas.parentElement || canvas).clientWidth;
      const height = (canvas.parentElement || canvas).clientHeight;
      res.current.x = width;
      res.current.y = height;
      canvas.width = width;
      canvas.height = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, true);
    }
  }

  function onFullScreenClicked() {
    if (isFullscreen()) {
      document.exitFullscreen().then(() => {
        if (props.content.onFullScreenChange) {
          props.content.onFullScreenChange(false);
        }
      });
    } else {
      canvasRef.current?.parentElement?.requestFullscreen().then(() => {
        if (props.content.onFullScreenChange) {
          props.content.onFullScreenChange(true);
        }
      });
    }
  }

  function animate() {
    const params = renderParams.current;
    if (isRunning.current && params) {
      params.renderer.render(params.scene, params.camera);
      if (props.content.onRender) {
        props.content.onRender();
      }
      window.requestAnimationFrame(animate);
    }
  }

  return (
    <div
      id="experiment-canvas-3d"
      className={`mouse-tracker mouse-${isMouseActive ? "active" : "inactive"}`}
    >
      <canvas ref={canvasRef}>
        hey, your browser must support the "canvas" component for this to work
      </canvas>
      <ActionsTray show={isMouseActive}>
        <FullScreenButton onClick={onFullScreenClicked} />
      </ActionsTray>
    </div>
  );
}
