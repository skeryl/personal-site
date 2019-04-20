import * as React from "react";
import {Post, PostTypes} from "../../../../personal-site-model/models";
import {Renderers, RenderThing} from "../../content";
import * as moment from "moment";
import {Tags} from "../Tags";

export interface PostProps<T extends Post> {
    post: T;
    full: boolean;
}

export function PostComponent<T extends Post>(props: PostProps<T>) {

    type postType = T['type'];
    type itemType = PostTypes[postType];

    const Renderer = Renderers[props.post.type].main as RenderThing<postType>;

    return (
        <div className="post-container">
            <div className="post-header">
                <div className="post-title">
                    <div><span>this post is called</span><h1>{props.post.title}</h1></div>
                    <div><span>and was published</span><span className="timestamp">{`${moment(props.post.timestamp).format("LL")}`}</span></div>
                    <div><Tags tags={props.post.tags} /></div>
                </div>
            </div>
            <Renderer post={props.post as any as itemType}/>
        </div>
    );
}