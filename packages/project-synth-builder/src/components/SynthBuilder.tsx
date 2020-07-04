import * as React from "react";
import styled from "styled-components";
import { AudioNodeList } from "./node/AudioNodeList";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import { SynthGraphEditor } from "./SynthGraphEditor";
import { SubHeader } from "personal-site-common";

const Frame = styled("div")`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const SynthBuilderBody = styled("div")`
  display: flex;
  flex-direction: row;
  margin: calc(2rem + 42px) 2rem 2rem 2rem;
`;

export default function SynthBuilder() {
  return (
    <Frame>
      <SubHeader text={"synth builder"} />
      <SynthBuilderBody>
        <DndProvider backend={HTML5Backend}>
          <AudioNodeList />
          <SynthGraphEditor />
        </DndProvider>
      </SynthBuilderBody>
    </Frame>
  );
}
