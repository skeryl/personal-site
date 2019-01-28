import * as React from "react";
import {Experiment, WriteUp} from "../../../personal-site-model/models";
import {useEffect} from "react";
import {Stage} from "grraf";

export interface WriteUpProps {
    post: WriteUp;
}

export function WriteUpComponent(props: WriteUpProps){
    return (
        <div className="write-up-container">
            {props.post.render()}
        </div>
    );
}