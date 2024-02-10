import * as React from "react";
import { PostSummary, PostType, PostTypes } from "personal-site-model";
import { Renderers, RenderThing } from "../../content";
import { Tags } from "../Tags";

export interface PostProps<T extends PostType> {
  summary: PostSummary;
  content: PostTypes[T];
  full: boolean;
}

export function PostComponent<T extends PostType>(props: PostProps<T>) {
  const Renderer = Renderers[props.summary.type].main as RenderThing<T>;

  return (
    <div className={`post-container ${props.summary.type}`}>
      <Renderer content={props.content} summary={props.summary} full={true} />
      <div className="post-header">
        <div className="post-title">
          <div>
            <h1>{props.summary.title}</h1>
          </div>
          <div>
            <span className="timestamp">
              {new Date(props.summary.timestamp).toLocaleDateString()}
            </span>
          </div>
          <div>
            <Tags tags={props.summary.tags} />
          </div>
        </div>
      </div>
    </div>
  );
}
