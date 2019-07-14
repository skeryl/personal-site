import {PostSummary} from "personal-site-model";
import {PostSummaryComponent} from "../components/post/PostSummary";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {ContentContext} from "../content/ContentContext";

export function PostList(){
    const [posts, setPosts] = useState<PostSummary[] | null>(null);
    const contentService = useContext(ContentContext);

    useEffect(() => {
        contentService.listPosts().then(posts => {
            setPosts(posts);
        });
    }, []);

    return (
        <div className="post-summary-container">
        {
            posts && posts.map(post => (
                <a href={`/posts/${post.id}`} className="post-list-item">
                    <PostSummaryComponent key={post.id} post={post}/>
                </a>
            ))
        }
        </div>
    );
}