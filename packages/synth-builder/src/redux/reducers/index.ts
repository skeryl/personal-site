import { combineReducers } from "redux";
import synthReducer from "./synths";

export default combineReducers({
  synths: synthReducer,
});
