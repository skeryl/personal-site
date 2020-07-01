import React from "react";
import styled from "styled-components";
import { NodeConfig } from "../model/nodes";
import { useDrag } from "react-dnd";

interface Props {
  config: NodeConfig;
}

const NodeTemplateContainer = styled("div")<{ dragging: boolean }>`
  display: flex;
  padding: 1.5rem;
  border: solid 2px black;

  opacity: ${(props) => (props.dragging ? "0.5" : "1")};
  cursor: ${(props) => (props.dragging ? "grabbing" : "grab")};
  :hover {
    border-color: blue;
    background-color: antiquewhite;
  }
`;

const Name = styled("div")``;

export function AudioNodeTemplate(props: Props) {
  const [{ dragging }, dragRef] = useDrag({
    item: { type: props.config.nodeFunction, nodeType: props.config.type },
    collect: (monitor) => ({
      dragging: monitor.isDragging(),
    }),
  });
  return (
    <NodeTemplateContainer ref={dragRef} dragging={dragging}>
      <Name>{props.config.name}</Name>
    </NodeTemplateContainer>
  );
}
