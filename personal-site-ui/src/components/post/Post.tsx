import * as React from "react";
import {PostSummary, PostType, PostTypes} from "personal-site-model";
import {Renderers, RenderThing} from "../../content";
import * as moment from "moment";
import {Tags} from "../Tags";

export interface PostProps<T extends PostType> {
    summary: PostSummary;
    content: PostTypes[T];
    full: boolean;
}

export function PostComponent<T extends PostType>(props: PostProps<T>) {
    const Renderer = Renderers[props.summary.type].main as RenderThing<T>;

    return (
        <div className="post-container">
            <Renderer content={props.content} summary={props.summary} full={true}/>
            <div className="post-header">
                <div className="post-title">
                    <div>
                        <span>this experiment is called</span>
                        <h1>{props.summary.title}</h1>
                    </div>
                    <div>
                        <span>and was published</span>
                        <span className="timestamp">{`${moment(props.summary.timestamp).format("LL")}`}</span>
                    </div>
                    <div><Tags tags={props.summary.tags} /></div>
                </div>
            </div>
        </div>
    );
}