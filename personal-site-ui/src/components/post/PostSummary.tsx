import * as React from "react";
import {Post, PostType, PostTypes} from "../../../../personal-site-model/models";
import {Renderers, RenderThing} from "../../content";
import * as moment from "moment";
import {Tags} from "../Tags";

export interface PostProps<T extends Post> {
    post: T;
    full: boolean;
}

export function PostSummaryComponent<T extends PostType>(postType: PostType) {
    return function(props: PostProps<PostTypes[T]>){

        const SummaryRenderer: RenderThing<T> | undefined = Renderers[postType].summary;

        return (
            <>
                <div className="post-header">
                    <div className="post-title">
                        <h1>{props.post.title}</h1>
                        <span className="timestamp">{`published ${moment(props.post.timestamp).format("LL")}`}</span>
                    </div>
                    {/*{ props.post.subtitle && <h2>{props.post.subtitle}</h2> }*/}
                    <Tags tags={props.post.tags} />
                </div>
                {SummaryRenderer && <SummaryRenderer post={props.post as any as PostTypes[T]}/>}
            </>
        );
    }
}