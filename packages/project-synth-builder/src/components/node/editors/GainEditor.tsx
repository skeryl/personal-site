import React, { ChangeEvent } from "react";
import styled from "styled-components";
import { NodeEditorProps } from "./index";
import { Input } from "personal-site-common";

const GainInput = styled("input")`
  width: 100%;
`;

export function GainEditor(props: NodeEditorProps) {
  function onGainChange(e: ChangeEvent<HTMLInputElement>) {
    props.onChange(
      props.node.withProperty(
        "maxGain",
        Math.round(parseFloat(e.target.value) * 100) / 100,
      ),
    );
  }
  return (
    <Input label={`gain level`}>
      <GainInput
        type="range"
        onChange={onGainChange}
        min={0}
        max={1}
        step={0.01}
      />
    </Input>
  );
}
