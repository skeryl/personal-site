import { KeyboardComponent } from "./KeyboardComponent";
import React, { useEffect, useRef, useState } from "react";
import { Synth } from "../core/Synth";
import { IAudioGraphNode, NodeTypes } from "../model/nodes";
import { Pitch, PitchInformation } from "../model/notes";
import { AudioGraphNode } from "../core/nodes/AudioGraphNode";
import styled from "styled-components";
import SynthNoteVisualizer from "./visualizers/SynthNoteVisualizer";
import { SynthSettings } from "./settings/SynthSettings";
import { Box } from "@material-ui/core";

const SynthContainer = styled("div")`
  margin: calc(2rem + 42px) 2rem 2rem 2rem;
  width: calc(100% - 4rem);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;

  > * {
    display: flex;
    flex-basis: 100%;
  }
`;

function startingNode() {
  const osc = AudioGraphNode.createOscillator().withProperty("type", "sine");

  return osc.connectNode(
    AudioGraphNode.createGain()
      .withProperty("maxGain", 0.12)
      .connectNode(AudioGraphNode.createDestination()),
  );
}

export default function SynthComponent() {
  const synth = useRef<Synth>(new Synth(startingNode()));
  const [playing, setPlaying] = useState(synth.current.notesPlaying);

  const [rootNode, setRootNode] = useState<IAudioGraphNode>(
    synth.current.oscillator,
  );

  // on root node change update the synth
  useEffect(() => {
    if (rootNode) {
      synth.current.oscillator = rootNode;
    }
  }, [rootNode]);

  const onRootNodeChange = (node: IAudioGraphNode) => {
    setRootNode(node);
  };

  const startPlaying = (note: Pitch) => {
    if (rootNode) {
      synth.current.startPlaying(note);
      setPlaying(synth.current.notesPlaying);
    }
  };

  const stopPlaying = (note: Pitch) => {
    if (rootNode) {
      synth.current.stopPlaying(note);
      setPlaying(synth.current.notesPlaying);
    }
  };

  const gainNode = rootNode.findClosest(NodeTypes.Gain)!;

  function onGainChanged(node: IAudioGraphNode) {
    setRootNode(rootNode.withOutput(node, 0));
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      flexBasis="100%"
      width="100%"
      mt={6}
      px={2}
    >
      <SynthSettings
        gainNode={gainNode}
        onGainChange={onGainChanged}
        rootNode={rootNode}
        onRootNodeChange={onRootNodeChange}
      />
      <KeyboardComponent
        startPlaying={startPlaying}
        stopPlaying={stopPlaying}
      />
      <SynthNoteVisualizer playing={playing} />
    </Box>
  );
}
