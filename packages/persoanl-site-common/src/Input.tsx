import React from "react";
import styled from "styled-components";
import { Label } from "./Label";

export interface InputProps {
  label: string;
  children: React.ReactChild;
}

const Wrapper = styled("div")`
  padding: 8px 0px;
  display: flex;
  flex-flow: column;
  flex: 1;
  > * {
    display: flex;
  }
`;

export function Input(props: InputProps) {
  return (
    <Wrapper>
      <Label>{props.label}</Label>
      {props.children}
    </Wrapper>
  );
}
