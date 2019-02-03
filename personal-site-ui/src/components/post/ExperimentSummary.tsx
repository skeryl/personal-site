import * as React from "react";
import {Experiment} from "../../../../personal-site-model/models";
import {PostProps} from "./Post";

export function ExperimentSummary(props: PostProps<Experiment>){
    return props.post.thumbnail ? <img src={props.post.thumbnail} alt={`thumbnail for experiment ${props.post.title}`}/> : (
      null
    );
}
