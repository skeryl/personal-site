import * as React from "react";
import {ContentDatabase} from "../content";
import {PostComponent} from "../components/post/Post";
import {DirectionalMagnitude} from "grraf";

export interface OverlayProps {
    position: DirectionalMagnitude;
}

export function HomeWithOverlay(Overlay: React.ComponentType<OverlayProps>){
    return function(){
        return <>
            <Home overlay={Overlay}/>
        </>
    }
}

interface HomeProps {
    overlay?: React.ComponentType<OverlayProps>
}

export function Home(props: HomeProps) {
    let latestPost = ContentDatabase.latest();

    function renderOverlay(Overlay: React.ComponentType<OverlayProps>){
        return <Overlay position={{ x: 0, y: 0 }}/>;
    }

    return (
        <div className={'container'}>
        {props.overlay && renderOverlay(props.overlay)}
        {
            latestPost && <PostComponent post={latestPost} full={false} />
        }
        </div>
    );
}
