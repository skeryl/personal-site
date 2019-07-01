import * as React from "react";
import {PostSummaryProps} from "./PostSummary";

export function ExperimentSummary(props: PostSummaryProps){
    return props.post.thumbnail ? <img src={props.post.thumbnail} alt={`thumbnail for experiment ${props.post.title}`}/> : (
      null
    );
}
