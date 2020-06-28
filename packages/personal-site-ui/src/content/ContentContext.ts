import { createContext } from "react";
import { ContentService } from "./ContentService";

export const ContentContext = createContext<ContentService>(
  new ContentService(),
);
