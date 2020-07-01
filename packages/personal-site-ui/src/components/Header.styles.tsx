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
  background-color: #442f14;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  height: 25px;
  border-bottom: groove #ffbc00 0.5rem;

  span {
    font-family: "PlayfairDisplay", "serif";
    transition: opacity, max-width ease-out 325ms;
  }

  span.hidden {
    max-width: 0px;
    overflow: hidden;
  }

  span.dot {
    opacity: 1;
  }

  :hover,
  .expanded {
    span.hidden {
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
    color: rgb(255, 233, 173) !important;
    text-decoration: none;
    text-align: right;
    height: 1.75rem;
    line-height: 1.75rem;
  }

  a:hover {
    text-shadow: 2px 2px #ff8100e3;
  }
`;
