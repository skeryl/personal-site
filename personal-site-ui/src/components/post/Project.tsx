import * as React from "react";
import {Project} from "../../../../personal-site-model/models";
import {PostProps} from "./Post";

export function ProjectComponent(props: PostProps<Project>){
    return (
        <div className="project-container">
            {props.post.render()}
        </div>
    );
}