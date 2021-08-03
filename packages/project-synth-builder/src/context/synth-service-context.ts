import { createContext } from "react";
import { ContentService } from "personal-site-ui/src/content/ContentService";
import { LocalSynthService, SynthService } from "../services/synths";
import { Services } from "../redux";

export const ServicesContext = createContext<Services>({
  synths: new LocalSynthService(),
});
