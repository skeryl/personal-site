import * as React from "react";
import { PostSummary } from "personal-site-model";
import { Tags } from "../Tags";

export interface PostSummaryProps {
  post: PostSummary;
}

export function PostSummaryComponent(props: PostSummaryProps) {
  return (
    <div className="post-summary">
      <div className="post-header">
        <div className="post-title">
          <div>
            <h1>{props.post.title}</h1>
            <span>published</span>
            <span className="timestamp">
              {new Date(props.post.timestamp).toLocaleDateString()}
            </span>
          </div>
          <div>
            <Tags tags={props.post.tags} />
          </div>
        </div>
      </div>
    </div>
  );
}
