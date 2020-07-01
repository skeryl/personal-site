import React from "react";
import styled from "styled-components";
import { useDrop } from "react-dnd";
import { DropTargetMonitor } from "react-dnd/lib/interfaces/monitors";
import { NodeFunction } from "../model/nodes";

interface StyleProps {
  isOver: boolean;
  canDrop: boolean;
}

const NodeSinkContainer = styled("div")``;

const NodeSink = styled("div")<StyleProps>`
  display: block;
  width: 100px;
  height: 100px;
  border-width: 4px;
  border-color: ${(props) =>
    props.isOver ? (props.canDrop ? "blue" : "red") : "black"};
  border-style: ${(props) => (props.isOver ? "dashed" : "solid")};
  position: absolute;
  top: -4px;
  left: -4px;
`;

interface Props {
  label?: string;
  functions: NodeFunction | NodeFunction[];
  onDrop: (item: any, monitor: DropTargetMonitor) => void;
}

export function AudioNodeSink(props: Props) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: props.functions,
    drop: props.onDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <NodeSinkContainer>
      <NodeSink ref={drop} isOver={isOver} canDrop={canDrop} />
    </NodeSinkContainer>
  );
}
