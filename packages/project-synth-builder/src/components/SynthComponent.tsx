import { KeyboardComponent } from "./KeyboardComponent";
import React, { useEffect, useRef, useState } from "react";
import { Synth, SynthesizerSettings } from "../core/Synth";
import { IAudioGraphNode, NodeTypes } from "../model/nodes";
import { Pitch } from "../model/notes";
import { AudioGraphNode } from "../core/nodes/AudioGraphNode";
import SynthNoteVisualizer from "./visualizers/SynthNoteVisualizer";
import { SynthSettings } from "./settings/SynthSettings";
import { Box } from "@material-ui/core";
import { AudioVisualizer } from "./visualizers/AudioVisualizer";

function startingNode() {
  const osc = AudioGraphNode.createOscillator().withProperty("type", "sine");

  return osc.connectNode(
    AudioGraphNode.createGain()
      .withProperty("maxGain", 0.12)
      .connectNode(
        AudioGraphNode.create(NodeTypes.Analyser)
          .withProperty("minDecibels", -40)
          .withProperty("fftSize", 1024)
          .connectNode(AudioGraphNode.createDestination()),
      ),
  );
}

export default function SynthComponent() {
  const synth = useRef<Synth>(
    new Synth(startingNode(), { attack: 0.99, release: 0.93 }),
  );
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

  function onGenericSynthSettingChange<
    K extends keyof SynthesizerSettings,
    V extends SynthesizerSettings[K]
  >(key: K, value: V) {
    synth.current.changeSettings({ [key]: value });
  }

  function getData(): Float32Array | undefined {
    return synth.current.getTimeDomainData();
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
        {...synth.current.settings}
        onAttackChange={(newAttack) =>
          onGenericSynthSettingChange("attack", newAttack)
        }
        onReleaseChange={(newRelease) =>
          onGenericSynthSettingChange("release", newRelease)
        }
      />
      <KeyboardComponent
        startPlaying={startPlaying}
        stopPlaying={stopPlaying}
      />
      <Box display="flex" flexDirection="row" width="100%">
        <Box flexBasis="65%">
          <SynthNoteVisualizer playing={playing} />
        </Box>
        <Box flexBasis="35%">
          <AudioVisualizer getTimeDomainData={getData} />
        </Box>
      </Box>
    </Box>
  );
}
