import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const SubHeaderWrapper = styled("div")<{ expanded?: boolean }>`
  z-index: 1;
  background-color: #f0e6cb;
  margin-top: ${(props) => (props.expanded ? "28px" : "6px")};
  :hover {
    margin-top: 28px;
  }
  position: fixed;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  border-bottom: groove #c5c5c5 0.5rem;
  flex: 1;
  flex-basis: 100%;
  h1 {
    font-size: 1.25rem;
    margin: 0;
  }
  transition: margin-top ease-out 200ms;
  
  a { 
    text-decoration: none;
    color: inherit;
  }
  a:hover {
    text-shadow: 2px 2px #ff8100e3;
  }
  }
`;

export interface SubHeaderProps {
  text: string;
  link?: string;
}

export function SubHeader(props: SubHeaderProps) {
  const [expanded, setExpanded] = useState(true);
  const collapseTimer = useRef<number>();

  const onMouseMove = (e: MouseEvent) => {
    // ToDo: make measurement more robust
    if (e.clientY <= 75) {
      setExpanded(true);
      cancelScheduledCollapse();
    } else {
      scheduleCollapse();
    }
  };

  const cancelScheduledCollapse = () => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current);
    }
  };

  const scheduleCollapse = (delay: number = 1000) => {
    cancelScheduledCollapse();
    collapseTimer.current = window.setTimeout(() => {
      setExpanded(false);
    }, delay);
  };

  useEffect(() => {
    scheduleCollapse();
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const header = <h1>{props.text}</h1>;
  return (
    <SubHeaderWrapper expanded={expanded}>
      {props.link ? <a href={props.link}>{header}</a> : header}
    </SubHeaderWrapper>
  );
}
