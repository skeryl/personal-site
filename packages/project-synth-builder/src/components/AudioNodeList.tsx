import React from "react";
import styled from "styled-components";
import { AllNodeFunctions, NodesByFunction } from "../model/nodes";
import { AudioNodeTemplate } from "./AudioNodeTemplate";
import { Tabs } from "./Tabs";

const Container = styled("div")`
  display: flex;
  overflow-y: scroll;
  flex-direction: column;
  flex: 1;
  * {
    display: flex;
  }
`;

export function AudioNodeList() {
  return (
    <Container>
      <Tabs
        tabs={AllNodeFunctions.filter((func) =>
          NodesByFunction[func].some((node) => !node.hidden),
        ).map((nodeFunction) => ({
          name: nodeFunction,
          content: NodesByFunction[nodeFunction]
            .filter((node) => !node.hidden)
            .map((nodeConfig) => (
              <AudioNodeTemplate key={nodeConfig.type} config={nodeConfig} />
            )),
        }))}
      />
    </Container>
  );
}
