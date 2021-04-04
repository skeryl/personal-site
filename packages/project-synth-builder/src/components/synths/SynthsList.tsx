import React, { FC, useState } from "react";
import { Async, AsyncProps } from "react-async";
import { Skeleton } from "@material-ui/lab";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/AddBox";
import { useSynthService } from "../../hooks/synth-service";
import { ISynth, SynthService } from "../../services/synths";
import { Synth } from "../../core/Synth";

export interface SynthsListProps {
  synths: ISynth[];
  onSynthSelected: (synth: ISynth) => void;
  activeSynth: ISynth | undefined;
  onNewSynth: () => void;
}
export const SynthsList: FC<SynthsListProps> = ({
  synths,
  onSynthSelected,
  activeSynth,
  onNewSynth,
}) => {
  return (
    <Box
      height="100%"
      display="flex"
      flexDirection="column"
      flexBasis="100%"
      flexGrow={1}
    >
      <Paper variant="outlined" square style={{ height: "100%" }}>
        <Box
          display="flex"
          flexDirection="row"
          alignItems="flex-start"
          p={2}
          pb={1}
        >
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onNewSynth}
            color="default"
            fullWidth
          >
            New
          </Button>
        </Box>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSynth?.id}
        >
          {synths.map((s) => (
            <Tab
              key={s.id}
              value={s.metadata.id}
              label={s.metadata.name}
              onClick={() => onSynthSelected(s)}
              selected={s === activeSynth}
            />
          ))}
        </Tabs>
      </Paper>
    </Box>
  );
};
