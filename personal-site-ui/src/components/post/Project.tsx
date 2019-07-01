import * as React from "react";
import {PostType} from "personal-site-model";
import {PostProps} from "./Post";

export function ProjectComponent(props: PostProps<PostType.project>){
    return (
        <div className="project-container">
            {props.content.render()}
        </div>
    );
}