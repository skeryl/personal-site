import * as React from "react";
import {RouteComponentProps} from "react-router";
import {useEffect} from "react";
import { Stage, Circle, Color, Text, Animation } from "grraf";
import {ContentDatabase} from "../content";
import {PostComponent} from "../components/Post";

export interface Props {
}

export function Home(props: RouteComponentProps<Props>) {
    let latestPost = ContentDatabase.latest();
    return (
        <div className={'container'}>
            {
                latestPost && <PostComponent post={latestPost}/>
            }
        </div>
    );
}
