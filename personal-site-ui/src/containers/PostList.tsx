import * as React from "react";
import {ContentDatabase} from "../content";
import {PostType, PostTypes} from "../../../personal-site-model/models";
import {PostSummaryComponent} from "../components/post/PostSummary";

export function PostList<T extends PostType>(postType: T){
    const Summary = PostSummaryComponent(postType);
    return function (){
        const posts: PostTypes[T][] = ContentDatabase.list<T>(postType);
        return (
            <div className="post-summary-container">
                {
                    posts.map(post => (
                        <a href={post.uri} className="post-list-item">
                            <Summary key={post.id} post={post} full={false}/>
                        </a>
                    ))
                }
            </div>
        );
    }
}