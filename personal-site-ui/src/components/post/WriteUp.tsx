import * as React from "react";
import {WriteUp} from "../../../../personal-site-model/models";
import {PostProps} from "./Post";

export function WriteUpComponent(props: PostProps<WriteUp>){
    return (
        <div className="write-up-container">
            {props.post.render()}
        </div>
    );
}