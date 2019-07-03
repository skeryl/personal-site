import * as React from "react";
import {RouteComponentProps} from "react-router";
import {PostComponent} from "../components/post/Post";
import {useContext, useEffect, useState} from "react";
import {ContentContext} from "../content/ContentContext";
import {PostSummary, StageContent} from "../../../personal-site-model";
import {Loading} from "../components/Loading";

export interface Props {
    id: string;
}

export function ExperimentDetail(props: RouteComponentProps<Props>){
    const [summary, setSummary] = useState<PostSummary | null>(null);
    const [experiment, setExperiment] = useState<StageContent | null>(null);
    const contentService = useContext(ContentContext);

    useEffect(() => {
        contentService.getPost(props.match.params.id).then(post => {
            setSummary(post.summary);
            setExperiment(post.content() as StageContent);
        })
    }, []);

    return !(summary && experiment) ? <Loading/> : (
        <PostComponent content={experiment} summary={summary} full={true}/>
    );
}
