import * as React from "react";
import {RouteComponentProps} from "react-router";
import {ContentDatabase} from "../content";
import {PostType, PostTypes} from "../../../personal-site-model/models";
import {PostComponent} from "../components/post/Post";

export interface PostDetailProps {
    id: string;
}

export function PostDetail<T extends PostType>(postType: T){
    return function (props: RouteComponentProps<PostDetailProps>){
        const id = props.match.params.id;
        const experiment: PostTypes[T] = ContentDatabase.get(id, postType);
        return (
            <PostComponent post={experiment} full={true}/>
        )
    }
}