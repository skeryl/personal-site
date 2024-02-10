import React, { ReactNode, useState } from "react";
import styled from "styled-components";

const TabContainer = styled("div")`
  display: flex;
  flex-flow: column;
`;

const TabHeaders = styled("div")`
  flex-direction: row;
  font-weight: bold;
  * {
    border: solid 1px;
    padding: 8px;
    cursor: pointer;
    :hover {
      border-color: blue;
      background-color: antiquewhite;
    }
  }
  .active {
    border-color: blue;
    background-color: antiquewhite;
  }
`;

const TabContent = styled("div")`
  display: flex;
  flex-flow: column;
`;

interface TabProps {
  name: string;
  content: ReactNode;
}

export function Tabs(props: { tabs: Array<TabProps> }) {
  const [selectedTab, setTab] = useState(props.tabs[0].name);
  return (
    <TabContainer>
      <TabHeaders>
        {props.tabs.map((tab) => (
          <div
            key={tab.name}
            onClick={() => setTab(tab.name)}
            className={selectedTab === tab.name ? "active" : ""}
          >
            {tab.name}
          </div>
        ))}
      </TabHeaders>
      <TabContent>
        {props.tabs.find((tab) => tab.name === selectedTab)?.content}
      </TabContent>
    </TabContainer>
  );
}
