import * as React from "react";
import {PostType} from "personal-site-model";
import {PostProps} from "./Post";

export function WriteUpComponent(props: PostProps<PostType.writeUp>){
    return (
        <div className="write-up-container">
            {props.content.render()}
        </div>
    );
}