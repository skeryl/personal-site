import * as React from "react";
import {Project} from "../../../personal-site-model/models";

export interface ProjectProps {
    post: Project;
}

export function ProjectComponent(props: ProjectProps){
    return (
        <div className="project-container">
            {props.post.render()}
        </div>
    );
}