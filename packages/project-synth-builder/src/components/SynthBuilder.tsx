import * as React from "react";
import styled from "styled-components";
import { useAudioContext } from "../hooks/useAudioContext";
import { AudioNodeList } from "./AudioNodeList";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import { AudioGraphEditor } from "./AudioGraphEditor";
import { SubHeader } from "personal-site-common";

const Frame = styled("div")`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const SynthBuilderBody = styled("div")`
  display: flex;
  flex-direction: row;
`;

export default function SynthBuilder() {
  const context = useAudioContext();
  return (
    <Frame>
      <SubHeader text={"synth builder"} />
      <SynthBuilderBody>
        <DndProvider backend={HTML5Backend}>
          <AudioNodeList />
          {context.current && <AudioGraphEditor context={context.current} />}
        </DndProvider>
      </SynthBuilderBody>
    </Frame>
  );
}
