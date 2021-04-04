import { createContext } from "react";
import { ContentService } from "personal-site-ui/src/content/ContentService";
import { LocalSynthService, SynthService } from "../services/synths";

export const ServicesContext = createContext<{ synthService: SynthService }>({
  synthService: new LocalSynthService(),
});
