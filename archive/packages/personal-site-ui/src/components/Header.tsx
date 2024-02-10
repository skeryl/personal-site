import React, { createRef, useEffect } from "react";
import { HeaderContainer, Title } from "./Header.styles";

export function Header() {
  const dot = <span className={"dot"}>.</span>;
  const shanes = <span className={"hidden"}>hane's</span>;
  const computer = <span className={"hidden"}>omputer</span>;
  const titleRef = createRef<HTMLAnchorElement>();

  useEffect(() => {
    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.classList.remove("expanded");
      }
    }, 3500);
  }, []);
  const atHome = window.location.pathname === "/";
  return (
    <HeaderContainer>
      <Title
        href={atHome ? "#" : "/"}
        ref={titleRef}
        className={atHome ? "expanded" : ""}
      >
        <h1>
          s{shanes}
          {dot}
        </h1>
        <h1>
          c{computer}
          {dot}
        </h1>
      </Title>
    </HeaderContainer>
  );
}
