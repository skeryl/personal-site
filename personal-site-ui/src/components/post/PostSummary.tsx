import * as React from "react";
import * as moment from "moment";
import {Post} from "../../../../personal-site-model/models";
import {Tags} from "../Tags";

export interface PostProps<T extends Post> {
    post: T;
    full: boolean;
}

export function PostSummaryComponent(props: PostProps<any>){
    return (
        <div className="post-summary">
            <div className="post-header">
                <div className="post-title">
                    <div><h1>{props.post.title}</h1><span>published</span><span className="timestamp">{`${moment(props.post.timestamp).format("LL")}`}</span></div>
                    <div><Tags tags={props.post.tags} /></div>
                </div>
            </div>
        </div>
    );
}