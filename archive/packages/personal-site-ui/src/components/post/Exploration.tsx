import * as React from "react";
import { PostType } from "personal-site-model";
import { PostProps } from "./Post";

export function ExplorationComponent(props: PostProps<PostType.exploration>) {
  return <div className="exploration-container">{props.content}</div>;
}
