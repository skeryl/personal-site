import React from "react";
import Box from "@material-ui/core/Box";
import { OscillatorEditor } from "../node/editors/OscillatorEditor";
import { UnisonEditor } from "../node/editors/UnisonEditor";
import { ScaleEditor } from "../node/editors/ScaleEditor";
import {
  getAttackTime,
  getReleaseTime,
  SynthesizerSettings,
} from "../../core/Synth";
import { Typography } from "@material-ui/core";

type GenericSettingsChangeHandler = <
  K extends keyof SynthesizerSettings,
  V extends SynthesizerSettings[K]
>(
  key: K,
  value: V,
) => void;

export interface SynthSettingsProps extends SynthesizerSettings {
  onGenericSynthSettingChange: GenericSettingsChangeHandler;
}

export function SynthSettings(props: SynthSettingsProps) {
  const { waveType, attack, release } = props;
  const onUnisonChange = (u: number) =>
    props.onGenericSynthSettingChange("unison", u);
  const onAttackChange = (val: number) =>
    props.onGenericSynthSettingChange("attack", val);
  const onReleaseChange = (val: number) =>
    props.onGenericSynthSettingChange("release", val);
  const onWaveTypeChange = (val: OscillatorType) =>
    props.onGenericSynthSettingChange("waveType", val);
  const onUnisonDetuneChange = (val: number) =>
    props.onGenericSynthSettingChange("unisonDetune", val);
  return (
    <Box display="flex" flexDirection="column" flexBasis="100%">
      <Box px={2} py={1}>
        <Typography variant="h6">Settings</Typography>
      </Box>
      <Box flexDirection="row" width="30%" flexBasis="40%" p={2} flexGrow={0}>
        <OscillatorEditor value={waveType} onChange={onWaveTypeChange} />
      </Box>
      <Box display="flex" flexDirection="row" p={2} flexBasis="100%">
        <Box flexBasis="50%" flexGrow={0} pr={1}>
          <ScaleEditor
            label="Attack"
            value={attack}
            onChange={onAttackChange}
            min={0.7}
            max={1}
            step={0.005}
            valueLabelFormat={(val) =>
              `${
                Math.round(
                  10 *
                    getAttackTime({
                      attack: val,
                      minAttackTime: props.minReleaseTime,
                      maxAttackTime: props.maxReleaseTime,
                    }),
                ) / 10
              }s`
            }
          />
        </Box>
        <Box flexBasis="50%" flexGrow={0} pl={1}>
          <ScaleEditor
            label="Release"
            value={release}
            onChange={onReleaseChange}
            min={0.7}
            max={1}
            step={0.01}
            valueLabelFormat={(val) =>
              `${
                Math.round(
                  10 *
                    getReleaseTime({
                      release: val,
                      minReleaseTime: props.minReleaseTime,
                      maxReleaseTime: props.maxReleaseTime,
                    }),
                ) / 10
              }s`
            }
          />
        </Box>
      </Box>

      <Box display="flex" flexDirection="row" p={2} flexBasis="100%">
        <Box flexBasis="50%" pr={1}>
          <UnisonEditor value={props.unison} onChange={onUnisonChange} />
        </Box>
        <Box flexBasis="50%" pl={1}>
          <ScaleEditor
            label="Unison detune"
            value={props.unisonDetune}
            onChange={onUnisonDetuneChange}
            min={0.1}
            max={1}
          />
        </Box>
      </Box>
    </Box>
  );
}
