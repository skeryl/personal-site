import { createContext } from "react";
import { LocalSynthService } from "../services/synths";
import { Services } from "../redux";

export const ServicesContext = createContext<Services>({
  synths: new LocalSynthService(),
});
