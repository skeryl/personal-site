import React, { createRef, useEffect, useRef } from "react";
import { Box, Paper } from "@material-ui/core";
import { Color, Path, Stage } from "grraf";
import styled from "styled-components";
import { ISynth } from "../../services/synths";

export interface AudioVisualizerProps {
  synth: ISynth;
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

const CanvasContainer = styled("div")`
  canvas {
    width: 100%;
  }
`;

export function AudioVisualizer({ synth }: AudioVisualizerProps) {
  const isDrawing = useRef(true);
  const stageRef = useRef<Stage | undefined>();
  const pathRef = useRef<Path | undefined>();
  const canvasContainerRef = createRef<HTMLDivElement>();

  function setupPath(stage: Stage) {
    const { height, width } = stage.getSize();
    const halfHeight = height / 2;
    return stage
      .createShape(Path)
      .moveTo(0, halfHeight)
      .lineTo(width, halfHeight)
      .setStrokeStyle(Color.black)
      .setLineCap("round")
      .setStrokeWidth(2);
  }

  useEffect(() => {
    const container = canvasContainerRef.current as HTMLDivElement;
    const stage = new Stage(container, true);
    stage.canvas.width = container.clientWidth;
    stage.canvas.height = Math.round(window.document.body.clientHeight / 2);
    stageRef.current = stage;
    pathRef.current = setupPath(stage);
    isDrawing.current = true;
    reDraw();
    return () => {
      isDrawing.current = false;
      stageRef.current?.clear();
    };
  }, [synth]);

  function updatePath(stage: Stage, path: Path) {
    const { height, width } = stage.getSize();
    const halfHeight = height / 2;
    const waveHeight = height * 0.4;
    const data = synth.getTimeDomainData();
    if (!data) {
      return;
    }
    path.resetPath().moveTo(0, halfHeight);
    const binXDimension = width / data.length;
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      const scaledValue = value * 2;
      const x = (i + 1) * binXDimension;
      const y = scaledValue * waveHeight + halfHeight; /* + margin / 2*/
      path.lineTo(x, y);
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
    <Box flexBasis="100%" p={2}>
      <Paper variant="outlined">
        <CanvasContainer
          ref={canvasContainerRef}
          id={"audio-viz-canvas-container"}
          style={{ minHeight: "200px", width: "100%" }}
        />
      </Paper>
    </Box>
  );
}
