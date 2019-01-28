import * as React from "react";
import {RouteComponentProps} from "react-router";
import {ContentDatabase, CRMForDevs} from "../content";
import {PostComponent} from "../components/Post";

export interface Props {
}

export function Home(props: RouteComponentProps<Props>) {
    let latestPost = CRMForDevs;
    return (
        <div className={'container'}>
            <p>
                hi. here's my latest thing:
            </p>
            {
                latestPost && <PostComponent post={latestPost}/>
            }
        </div>
    );
}
