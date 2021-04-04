import React from "react";
import { AppBar, Box, Paper, Tab, Tabs } from "@material-ui/core";
import { SynthsEditor } from "./synths/SynthsEditor";
import { Skeleton, TabPanel } from "@material-ui/lab";

interface TabConfig {
  id: string;
  label: string;
  component: (props?: any) => JSX.Element;
}

const tabs: TabConfig[] = [
  {
    id: "synths",
    label: "Synths",
    component: SynthsEditor,
  },
  /*{
    id: "composition",
    label: "Composition",
    component: Skeleton,
  },*/
];

export default function SoundBooth() {
  const [tabIndex, setActiveTabIndex] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  const TabComponent = tabs[tabIndex].component || Skeleton;
  return (
    <Box mt={4} width="100%">
      <Paper square variant="outlined">
        <Tabs variant="scrollable" value={tabIndex} onChange={handleChange}>
          {tabs.map((t, ix) => (
            <Tab label={t.label} value={ix} key={t.id} />
          ))}
        </Tabs>
      </Paper>
      <Box role="tabpanel">
        <TabComponent />
      </Box>
    </Box>
  );
}
