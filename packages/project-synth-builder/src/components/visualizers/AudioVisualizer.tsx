import React, { createRef, useEffect, useMemo, useRef } from "react";
import { Box } from "@material-ui/core";
import { Color, Path, Stage } from "grraf";

export interface AudioVisualizerProps {
  getTimeDomainData: () => Float32Array | undefined;
}

interface Extrema {
  min: number;
  max: number;
  range: number;
}

function getExtrema(data: Float32Array | Uint8Array | Array<number>): Extrema {
  let min: number | undefined = undefined;
  let max: number | undefined = undefined;
  for (let i = 0; i < data.length; i++) {
    const currentValue = data[i];
    min = min === undefined ? currentValue : Math.min(currentValue, min);
    max = max === undefined ? currentValue : Math.max(currentValue, max);
  }
  min = min !== undefined ? min : Number.NaN;
  max = max !== undefined ? max : Number.NaN;
  return { min, max, range: max - min };
}

function getScaledValue(value: number, extrema: Extrema): number {
  return (value - extrema.min) / extrema.range;
}

function cleanUp(x: number) {
  return Math.round(x * 100) / 100 + 0.5;
}

export function AudioVisualizer({ getTimeDomainData }: AudioVisualizerProps) {
  const isDrawing = useRef(true);
  const stageRef = useRef<Stage | undefined>();
  const pathRef = useRef<Path | undefined>();
  const canvasRef = createRef<HTMLCanvasElement>();

  function setupPath(stage: Stage) {
    const { height, width } = stage.getSize();
    const halfHeight = height / 2;
    return stage
      .createShape(Path)
      .moveTo(0, halfHeight)
      .lineTo(width, halfHeight)
      .setStrokeStyle(Color.black)
      .setLineCap("round")
      .setStrokeWidth(1);
  }

  useEffect(() => {
    const stage = new Stage(canvasRef.current, false, 0);
    stageRef.current = stage;
    pathRef.current = setupPath(stage);
    reDraw();
    return () => {
      isDrawing.current = false;
      stageRef.current?.clear();
    };
  }, []);

  function updatePath(stage: Stage, path: Path) {
    const { height, width } = stage.getSize();
    const halfHeight = height / 2;
    const waveHeight = height * 0.4;
    const margin = height - waveHeight;
    const data = getTimeDomainData();
    if (!data) {
      return;
    }
    path.resetPath().moveTo(0, halfHeight);
    /*const start = 400;
    const end = data.length / 2;*/
    const slicedData = data; // data.slice(start, end);
    const extrema = getExtrema(slicedData);

    const binXDimension = width / slicedData.length;
    for (let i = 0; i < slicedData.length; i++) {
      const value = slicedData[i];
      const scaledValue = getScaledValue(value, extrema);
      const x = (i + 1) * binXDimension;
      const y = scaledValue * waveHeight + margin / 2;
      path.lineTo(cleanUp(x), cleanUp(y));
    }
  }

  function reDraw() {
    if (isDrawing.current) {
      const stage = stageRef.current;
      const path = pathRef.current;
      if (stage && path) {
        updatePath(stage, path);
        stage.draw();
      }
      requestAnimationFrame(reDraw);
    }
  }

  return (
    <Box flexBasis="100%">
      <canvas
        ref={canvasRef}
        id={"audio-viz-canvas"}
        width="100%"
        style={{ minHeight: "200px", width: "100%" }}
      >
        you should get a better browser
      </canvas>
    </Box>
  );
}
