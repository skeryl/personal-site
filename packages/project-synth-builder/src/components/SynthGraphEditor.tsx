import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { IAudioGraphNode } from "../model/nodes";
import { AudioNodeComponent } from "./node/AudioNodeComponent";
import { KeyboardComponent } from "./KeyboardComponent";
import { Notes } from "../model/notes";
import { Synth } from "../core/Synth";

interface Props {}

const GraphContainer = styled("div")`
  display: flex;
  flex: 1;
  flex-basis: 40%;
  margin: 1rem;
`;

export function SynthGraphEditor(props: Props) {
  const synth = useRef<Synth>(new Synth());

  const [rootNode, setRootNode] = useState<IAudioGraphNode>(
    synth.current.oscillator,
  );

  // on root node change update the synth
  useEffect(() => {
    if (rootNode) {
      synth.current.oscillator = rootNode;
    }
  }, [rootNode]);

  const onNodeChange = (node: IAudioGraphNode) => {
    setRootNode(node);
  };

  const startPlaying = (note: Notes) => {
    if (rootNode) {
      synth.current.startPlaying(note);
    }
  };

  const stopPlaying = (note: Notes) => {
    if (rootNode) {
      synth.current.stopPlaying(note);
    }
  };

  return (
    <GraphContainer>
      <KeyboardComponent
        startPlaying={startPlaying}
        stopPlaying={stopPlaying}
      />
      {rootNode && (
        <AudioNodeComponent
          node={rootNode}
          onNodeChange={onNodeChange}
          /*onRootChange={onNodeChange}*/
        />
      )}
    </GraphContainer>
  );
}
