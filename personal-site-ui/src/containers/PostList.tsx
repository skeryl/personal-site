import {Post} from "../../../personal-site-model/models";
import {PostSummaryComponent} from "../components/post/PostSummary";
import {ContentDatabase} from "../content";
import * as React from "react";

export function PostList(){
    const posts: Post[] = ContentDatabase.list();
    return (
        <div className="post-summary-container">
        {
            posts.map(post => (
                <a href={post.uri} className="post-list-item">
                    <PostSummaryComponent key={post.id} post={post} full={false}/>
                </a>
            ))
        }
        </div>
    );
}