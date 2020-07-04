import styled from "styled-components";
import React, { ChangeEvent } from "react";

export const StyledSelect = styled("select")`
  padding: 4px 8px;
`;

export interface SelectProps {
  value: string;
  options: string[];
  onChange: (option: string) => void;
}

export function Select(props: SelectProps) {
  function onSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    props.onChange(e.target.value);
  }
  return (
    <StyledSelect onChange={onSelectChange}>
      {props.options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </StyledSelect>
  );
}
