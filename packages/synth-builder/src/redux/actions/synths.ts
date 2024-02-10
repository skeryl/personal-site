import { ISynth, SynthService } from "../../services/synths";
import { ServiceAction, ServiceResolution } from "../middleware";

export enum SynthActionTypes {
  saveSynth = "synths/save",
  deleteSynth = "synths/delete",
  loadSynths = "synths/load",
  saveSynthResolved = "synths/save-resolved",
  deleteSynthResolved = "synths/delete-resolved",
  loadSynthsResolved = "synths/load-resolved",
}

export interface SynthPayload {
  synth: ISynth;
}

export interface SynthActionBase<Payload, Result>
  extends ServiceAction<SynthService, Payload, Result> {
  payload: Payload;
}

export interface DeleteSynth extends SynthActionBase<SynthPayload, ISynth> {
  type: SynthActionTypes.deleteSynth;
}

export interface SaveSynth extends SynthActionBase<SynthPayload, ISynth> {
  type: SynthActionTypes.saveSynth;
}

export interface LoadSynths extends SynthActionBase<undefined, ISynth[]> {
  type: SynthActionTypes.loadSynths;
}

export interface DeleteSynthResolved extends ServiceResolution<ISynth> {
  type: SynthActionTypes.deleteSynthResolved;
}

export interface SaveSynthResolved extends ServiceResolution<ISynth> {
  type: SynthActionTypes.saveSynthResolved;
}

export interface LoadSynthsResolved extends ServiceResolution<ISynth[]> {
  type: SynthActionTypes.loadSynthsResolved;
}

export type SynthActions = SaveSynth | DeleteSynth | LoadSynths;

export type SynthActionResolvers =
  | DeleteSynthResolved
  | SaveSynthResolved
  | LoadSynthsResolved;

function getServiceFunction<Action extends SynthActions>(type: Action["type"]) {
  switch (type) {
    case SynthActionTypes.deleteSynth:
      return (service: SynthService, payload: SynthPayload) =>
        service.deleteSynth(payload.synth.metadata.id);

    case SynthActionTypes.saveSynth:
      return (service: SynthService, payload: SynthPayload) =>
        service.saveSynth(payload.synth);

    case SynthActionTypes.loadSynths:
      return (service: SynthService) => service.listSynths();
  }
  throw new Error(`type "${type}" doesn't have a service function.`);
}

export function createSynthAction<Action extends SynthActions>(
  type: Action["type"],
  payload?: Action["payload"],
): Action {
  return {
    type,
    payload,
    service: "synths",
    serviceFunction: getServiceFunction<Action>(type),
  } as Action;
}
