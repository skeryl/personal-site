import React from "react";
import { NodeEditorProps } from "./index";
import { Select } from "personal-site-common";
import { Input } from "personal-site-common/src/Input";

const options: OscillatorType[] = ["sine", "sawtooth", "square", "triangle"];

export function OscillatorEditor(props: NodeEditorProps) {
  function onTypeChange(type: string) {
    props.onChange(props.node.withProperty("type", type));
  }
  return (
    <Input label={"Wave Type"}>
      <Select
        onChange={onTypeChange}
        value={(props.node.properties["type"] as string) || "sine"}
        options={options}
      />
    </Input>
  );
}
