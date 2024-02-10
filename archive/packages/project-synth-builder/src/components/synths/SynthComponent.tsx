import React, { useEffect, useState } from "react";
import { NodeTypes } from "../../model/nodes";
import { Pitch } from "../../model/notes";
import { MutableAudioGraph } from "../../core/nodes/MutableAudioGraph";
import SynthNoteVisualizer from "../visualizers/SynthNoteVisualizer";
import { SynthSettings } from "../settings/SynthSettings";
import { Box, Button, TextField, Tooltip, Typography } from "@material-ui/core";
import { AudioVisualizer } from "../visualizers/AudioVisualizer";
import { SynthesizerSettings } from "../../core/Synth";
import { MutableAudioNode as AudioGraphNode } from "../../core/nodes/MutableAudioNode";
import { ISynth } from "../../services/synths";
import { GainEditor } from "../node/editors/GainEditor";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";
import { useKeyboardController } from "../../hooks/keyboard";
import { useSynthController } from "../../hooks/synth-controller";

export function startingGraph() {
  const osc = AudioGraphNode.createOscillator().setProperty("type", "sine");

  return MutableAudioGraph.create(
    osc.connect(
      AudioGraphNode.createGain()
        .setProperty("maxGain", 0.12)
        .connect(
          AudioGraphNode.create(NodeTypes.Analyser)
            .setProperty("minDecibels", -40)
            .setProperty("fftSize", 1024)
            .connect(AudioGraphNode.createDestination()),
        ),
    ),
  );
}

export interface SynthEdits {
  name?: string;
  settings?: SynthesizerSettings;
}

export interface SynthComponentProps {
  synth: ISynth;
  edits: SynthEdits;
  onNameChange: (name: string) => void;
  onSettingsChange: (settings: SynthesizerSettings) => void;
  onSave: (synth: ISynth, changes: SynthEdits) => void;
  onDelete: (synth: ISynth) => void;
}

export function hasEdits(edits: SynthEdits): boolean {
  return Object.values(edits).reduce(
    (hasEdits, value) => hasEdits || value !== undefined,
    false,
  );
}

export default function SynthComponent({
  synth,
  edits,
  onNameChange,
  onSettingsChange,
  onSave,
  onDelete,
}: SynthComponentProps) {
  const { name: editedName, settings: editedSettings } = edits;

  function onGenericSynthSettingChange<
    K extends keyof SynthesizerSettings,
    V extends SynthesizerSettings[K]
  >(key: K, value: V) {
    onSettingsChange(synth.changeSettings({ [key]: value }));
  }

  function onSaveClicked() {
    onSave(synth, edits);
  }

  const { playing } = useSynthController({
    synth,
  });

  const isSaveDisabled = !hasEdits(edits);
  return (
    <Box
      display="flex"
      flexDirection="column"
      flexBasis="100%"
      width="100%"
      pt={0}
    >
      <Box display="flex" flexDirection="row">
        <Box>
          <TextField
            label="name"
            variant="outlined"
            value={editedName === undefined ? synth.metadata.name : editedName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </Box>

        <Box flexGrow={1} pl={2}>
          <GainEditor synth={synth} />
        </Box>

        <Box
          display="flex"
          flexShrink={0}
          flexBasis="55%"
          alignSelf="flex-start"
          alignItems="center"
        >
          <Box pl={2}>
            <Tooltip
              title={isSaveDisabled ? "No changes to save" : "Save changes"}
              aria-label="save"
            >
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={onSaveClicked}
                color={isSaveDisabled ? "default" : "primary"}
              >
                Save
              </Button>
            </Tooltip>
          </Box>

          <Box flexShrink={0} justifyContent="center" pl={2}>
            <Typography variant="caption">
              last saved at {synth.metadata.lastUpdated.toLocaleString()}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="flex-end" flexGrow={1} pr={2}>
            <Tooltip title="Delete" aria-label="delete">
              <Button
                variant="contained"
                startIcon={<DeleteIcon />}
                onClick={() => onDelete(synth)}
              >
                Delete
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Box>
      <Box display="flex" flexDirection="row" width="100%">
        <Box flexBasis="45%" py={4}>
          <SynthSettings
            onGenericSynthSettingChange={onGenericSynthSettingChange}
            {...(editedSettings || synth.settings)}
          />
        </Box>
        <Box flexBasis="55%" p={2}>
          <AudioVisualizer synth={synth} />
        </Box>
      </Box>
      <Box display="flex" flexDirection="row" flexBasis="100%" p={2}>
        <SynthNoteVisualizer playing={playing} />
      </Box>
    </Box>
  );
}
