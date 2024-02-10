import { applyMiddleware, createStore, Store } from "redux";
import reducer from "./reducers";
import serviceActions from "./middleware";
import { SynthService } from "../services/synths";

export interface Services {
  synths: SynthService;
}

export function createSoundBoothStore(services: Services) {
  return createStore(reducer, applyMiddleware(serviceActions(services)));
}
