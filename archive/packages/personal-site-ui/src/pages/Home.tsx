import React from "react";
import styled from "styled-components";
import { navRoutes } from "../routes";

export const HomeContainer = styled("div")`
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
`;

export const HomeLink = styled("a")`
  color: rgb(85, 73, 0);
  display: flex;
  flex: 1;
  flex-direction: column;
  text-decoration: none;
  * {
    font-family: "PlayfairDisplay", "serif";
    justify-content: center;
    display: flex;
  }
  margin: 1rem;
  :hover {
    text-shadow: 2px 2px #ffbc00;
  }
`;

export const LinkTitle = styled("span")`
  font-size: 2rem;
`;

export const LinkSubtitle = styled("span")`
  font-size: 0.75rem;
`;

export default function Home() {
  return (
    <HomeContainer className={"container"}>
      {navRoutes
        .filter((rt) => !rt.hidden)
        .map((navRoute) => (
          <HomeLink href={navRoute.path} key={navRoute.path}>
            <LinkTitle>{navRoute.name}</LinkTitle>
            <LinkSubtitle>{navRoute.description}</LinkSubtitle>
          </HomeLink>
        ))}
    </HomeContainer>
  );
}
