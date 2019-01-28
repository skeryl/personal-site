import * as React from "react";
import {Post, PostTypes} from "../../../personal-site-model/models";
import {Renderers, RenderThing} from "../content";

export interface Props<T extends Post> {
    post: T
}

export function PostComponent<T extends Post>(props: Props<T>) {

    type postType = T['type'];
    type itemType = PostTypes[postType];

    const Renderer = Renderers[props.post.type].template as RenderThing<postType>;

    return (
        <Renderer post={props.post as any as itemType}/>
    );
}