import styled from "styled-components";

export const Title = styled("a")`
  font-family: "PlayfairDisplay", "sans-serif";
  font-size: 1.75rem;
  flex-basis: auto;

  h1 {
    flex-shrink: 0;
    font-family: "PlayfairDisplay", "sans-serif";
    font-size: 1.25rem;
  }
`;

export const HeaderNavLink = styled("a")`
  font-weight: bold;
  text-transform: lowercase;
  padding: 0 0.5rem;
`;

export const HeaderContainer = styled("div")`
  z-index: 2;
  position: fixed;
  width: 100%;
  background-color: #32493a;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  height: 25px;
  border-bottom: groove #99cfcf 0.5rem;

  span {
    font-family: "PlayfairDisplay", "serif";
    transition: max-width ease-out 4025ms;
  }

  span.hidden {
    max-width: 0px;
    overflow: hidden;
  }

  span.dot {
    transition: opacity ease-out 725ms;
    opacity: 1;
  }

  :hover,
  .expanded {
    span.hidden {
      transition: max-width ease-out 1025ms;
      max-width: 100px;
    }
    span.dot {
      opacity: 0;
    }
  }

  * {
    margin: 0;
    display: flex;
    flex-grow: 0;
  }

  a {
    color: #88b3cb !important;
    text-decoration: none;
    text-align: right;
    height: 1.75rem;
    line-height: 1.75rem;
  }

  a:hover {
    text-shadow: 2px 2px rgba(0, 164, 255, 0.6);
  }
`;
