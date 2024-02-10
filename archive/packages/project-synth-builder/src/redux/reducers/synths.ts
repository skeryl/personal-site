import { Reducer } from "redux";
import { SynthsState } from "../state/synths";
import { SynthActionResolvers, SynthActionTypes } from "../actions/synths";
import { ISynth } from "../../services/synths";
import { deleteImmutably, setImmutably } from "../state";

export const initialState: SynthsState = new Map<string, ISynth>();

const synthReducer: Reducer<SynthsState, SynthActionResolvers> = (
  state = initialState,
  action,
) => {
  switch (action.type) {
    case SynthActionTypes.saveSynthResolved:
      const saveResult = action.result;
      if (saveResult) {
        return setImmutably(state, saveResult.metadata.id, saveResult);
      }
      console.error(`Save failed!`, action.error);
      break;

    case SynthActionTypes.deleteSynthResolved:
      const deleteResult = action.result;
      if (deleteResult) {
        return deleteImmutably(state, deleteResult.metadata.id);
      }
      console.error(`Delete failed!`, action.error);
      break;

    case SynthActionTypes.loadSynthsResolved:
      const loadResult = action.result;
      if (loadResult) {
        return new Map(
          loadResult.reduce<Array<[string, ISynth]>>(
            (result, synth) => [...result, [synth.metadata.id, synth]],
            [],
          ),
        );
      }
      console.error(`Delete failed!`, action.error);
      break;
  }
  return state;
};

export default synthReducer;
