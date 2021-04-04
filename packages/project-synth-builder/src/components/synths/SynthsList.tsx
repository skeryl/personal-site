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
  onDelete: (synth: ISynth) => void;
}
export const SynthsList: FC<SynthsListProps> = ({
  synths,
  onSynthSelected,
  activeSynth,
  onNewSynth,
  onDelete,
}) => {
  return (
    <>
      <Box display="flex" flexDirection="row" alignItems="flex-start" p={2}>
        <Box display="flex" flexGrow={1}>
          <Typography variant="h6">Synths</Typography>
        </Box>
        <Box display="flex" alignSelf="flex-end" flexShrink={0}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNewSynth}
            color="default"
          >
            New
          </Button>
        </Box>
      </Box>
      <List component="nav">
        {synths.map((s) => (
          <ListItem
            button
            key={s.id}
            onClick={() => onSynthSelected(s)}
            selected={s === activeSynth}
          >
            <ListItemText>{s.metadata.name}</ListItemText>
            <ListItemSecondaryAction>
              <IconButton onClick={() => onDelete(s)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </>
  );
};
