import * as React from "react";
import {ContentDatabase} from "../content";
import {PostComponent} from "../components/post/Post";

export function Home() {
    let latestPost = ContentDatabase.latest();
    return (
        <div className={'container'}>
            {
                latestPost && <PostComponent post={latestPost} full={false} />
            }
        </div>
    );
}
