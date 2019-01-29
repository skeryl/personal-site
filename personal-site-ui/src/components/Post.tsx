import * as React from "react";
import {Post, PostTypes} from "../../../personal-site-model/models";
import {Renderers, RenderThing} from "../content";
import * as moment from "moment";
import {Tags} from "./Tags";

export interface Props<T extends Post> {
    post: T
}

export function PostComponent<T extends Post>(props: Props<T>) {

    type postType = T['type'];
    type itemType = PostTypes[postType];

    const Renderer = Renderers[props.post.type].template as RenderThing<postType>;

    return (
        <div className="post-container">
            <div className="post-header">
                <div className="post-title">
                    <h1>{props.post.title}</h1>
                    <span className="timestamp">{`published ${moment(props.post.timestamp).format("LL")}`}</span>
                </div>
                {/*{ props.post.subtitle && <h2>{props.post.subtitle}</h2> }*/}
                <Tags tags={props.post.tags} />
            </div>
            <Renderer post={props.post as any as itemType}/>
        </div>
    );
}