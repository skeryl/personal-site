import * as React from "react";
import {PostComponent} from "../components/post/Post";
import {DirectionalMagnitude} from "grraf";
import {useContext, useEffect, useState} from "react";
import {ContentContext} from "../content/ContentContext";
import {Post} from "../../../personal-site-model";

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
    const [latestPost, setLatest] = useState<Post | null>(null);
    const contentService = useContext(ContentContext);

    useEffect(() => {
        contentService.getLatestPost().then(latest => {
            setLatest(latest);
        });
    }, []);

    function renderOverlay(Overlay: React.ComponentType<OverlayProps>){
        return <Overlay position={{ x: 0, y: 0 }}/>;
    }

    return (
        <div className={'container'}>
        {props.overlay && renderOverlay(props.overlay)}
        {
            latestPost && <PostComponent summary={latestPost.summary} content={latestPost.content()} full={false} />
        }
        </div>
    );
}
