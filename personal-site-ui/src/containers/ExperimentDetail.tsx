import * as React from "react";
import {RouteComponentProps} from "react-router";
import {ContentDatabase} from "../content";
import {PostComponent} from "../components/post/Post";

export interface Props {
    id: string;
}

export function ExperimentDetail(props: RouteComponentProps<Props>){
    const { experiment } = ContentDatabase.getExperiment(props.match.params.id);
    return experiment ? (
        <PostComponent post={experiment} full={true}/>
    ) : <div>Oops; you know the drill. I couldn't locate a post with id '{props.match.params.id}'.</div>
}
