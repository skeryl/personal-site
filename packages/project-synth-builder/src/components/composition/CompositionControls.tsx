import React from "react";
import { ControlState } from "./index";
import { Box, ButtonGroup, IconButton } from "@material-ui/core";
import { FiberManualRecord, Pause, PlayArrow, Stop } from "@material-ui/icons";

export interface CompositionControlsProps {
  controlState: ControlState;
  onStateChange: (state: ControlState, prevState: ControlState) => void;
}

function getNextPlayPauseState(
  currentState: ControlState,
): ControlState | undefined {
  if (currentState === ControlState.PLAYING) {
    return ControlState.EDITING;
  }
  if (currentState === ControlState.EDITING) {
    return ControlState.PLAYING;
  }
  if (currentState === ControlState.RECORDING) {
    return ControlState.RECORDING_PAUSED;
  }
  if (currentState === ControlState.RECORDING_PAUSED) {
    return ControlState.RECORDING;
  }
}

function getNextRecordState(
  currentState: ControlState,
): ControlState | undefined {
  if (currentState === ControlState.RECORDING) {
    return ControlState.EDITING;
  }
  return ControlState.RECORDING;
}

export function CompositionControls({
  controlState,
  onStateChange,
}: CompositionControlsProps) {
  const isRecording = controlState === ControlState.RECORDING;
  const isPlaying = controlState === ControlState.PLAYING;
  const isPaused = controlState === ControlState.EDITING;

  const togglePausePlay = () => {
    const nextState = getNextPlayPauseState(controlState);
    if (nextState) {
      onStateChange(nextState, controlState);
    }
  };

  const toggleRecord = () => {
    const nextState = getNextRecordState(controlState);
    if (nextState) {
      onStateChange(nextState, controlState);
    }
  };

  return (
    <Box>
      <ButtonGroup>
        <IconButton aria-label="play-pause" onClick={togglePausePlay}>
          {isPlaying || isRecording ? <Pause /> : <PlayArrow />}
        </IconButton>
        <IconButton
          aria-label="record"
          onClick={toggleRecord}
          color={"secondary"}
        >
          {isRecording ? <Stop /> : <FiberManualRecord />}
        </IconButton>
      </ButtonGroup>
    </Box>
  );
}
