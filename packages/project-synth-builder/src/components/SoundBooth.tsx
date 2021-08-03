import React, {
  JSXElementConstructor,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { connect, Provider } from "react-redux";
import { Box, Paper, Tab, Tabs } from "@material-ui/core";
import SynthsEditor from "./synths/SynthsEditor";
import { Skeleton } from "@material-ui/lab";
import CompositionEditor from "./composition/CompositionEditor";
import { createSoundBoothStore } from "../redux";
import { ServicesContext } from "../context/synth-service-context";
import { useSearchParams } from "../hooks/url";
import { Dispatch } from "redux";
import { createSynthAction, SynthActionTypes } from "../redux/actions/synths";
import { State } from "../redux/state";
import { getSynths } from "../redux/selectors/synths";
import { ISynth } from "../services/synths";

interface TabConfig {
  id: string;
  label: string;
  component: JSXElementConstructor<any>;
}

const tabs: TabConfig[] = [
  {
    id: "synths",
    label: "Synths",
    component: SynthsEditor,
  },
  {
    id: "composition",
    label: "Composition",
    component: CompositionEditor,
  },
];

function useActiveTabIndex(tabs: TabConfig[]) {
  const { view } = useSearchParams();
  const foundTab = tabs.findIndex((tab) => tab.id === view);
  return Math.max(0, foundTab);
}

interface StateProps {
  synths: ISynth[];
}

interface DispatchProps {
  loadSynths: () => void;
}

type Props = StateProps & DispatchProps;

export function SoundBooth({ loadSynths, synths }: Props) {
  const [tabIndex, setActiveTabIndex] = React.useState(
    useActiveTabIndex(tabs) || 0,
  );

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    const tabConfig = tabs[newValue];
    history.replaceState(null, "", `?view=${tabConfig.id}`);
    setActiveTabIndex(newValue);
  };

  useEffect(() => {
    loadSynths();
  }, [loadSynths]);

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

function mapStateToProps(state: State): StateProps {
  return {
    synths: getSynths(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch): DispatchProps {
  return {
    loadSynths: () => dispatch(createSynthAction(SynthActionTypes.loadSynths)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SoundBooth);
