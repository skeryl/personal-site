import React, { useRef, useState } from "react";
import styled from "styled-components";
import {
  IAudioGraphNode,
  NodeConfigs,
  NodeFunction,
  NodeTypes,
} from "../model/nodes";
import { AudioNodeComponent } from "./AudioNodeComponent";
import { AudioGraphNode } from "../core/AudioGraphNode";
import { KeyboardComponent } from "./KeyboardComponent";
import { Notes } from "../model/notes";
import { KeyboardController } from "../core/KeyboardController";

interface Props {
  context: AudioContext;
}

const GraphContainer = styled("div")`
  display: flex;
  flex: 1;
  flex-basis: 40%;
`;

export function AudioGraphEditor(props: Props) {
  const myRoot = new AudioGraphNode(
    NodeFunction.Input,
    NodeConfigs[NodeTypes.Oscillator],
  ); /*.connectNode(
    new AudioGraphNode(
      NodeFunction.Effect,
      NodeConfigs[NodeTypes.Gain],
    ).connect(NodeConfigs[NodeTypes.AudioDestination]),
  );*/
  console.log(myRoot);

  const [rootNode, setRootNode] = useState<IAudioGraphNode>(myRoot);

  const keyController = useRef(new KeyboardController(rootNode));

  const onNodeChange = (node: IAudioGraphNode) => {
    setRootNode(node);
    console.log("new root! ", node);
  };

  const startPlaying = (note: Notes) => {
    if (rootNode) {
      keyController.current.startPlaying(props.context, note);
    }
  };

  const stopPlaying = (note: Notes) => {
    if (rootNode) {
      keyController.current.stopPlaying(note);
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
          context={props.context}
          label="Input Node"
          node={rootNode}
          onNodeChange={onNodeChange}
        />
      )}
    </GraphContainer>
  );
}
