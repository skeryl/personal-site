import { Selector } from "react-redux";
import { State } from "../state";
import { ISynth } from "../../services/synths";

export const getSynths: Selector<State, ISynth[]> = (state) =>
  Array.from(state.synths.values());
