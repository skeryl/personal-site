import { createContext } from "react";
import { PostType } from "personal-site-model";
import { PostClient } from "../clients/post-client";

export type ContentClientGetter = (type: PostType) => PostClient;

export const ContentContext = createContext<ContentClientGetter>(
  (type) => new PostClient(type),
);
