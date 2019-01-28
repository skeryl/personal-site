import {Stage} from "grraf";
import * as React from "react";
import {ReactElement} from "react";

export interface Unique {
    id: string;
}

export interface Linkable {
    uri: string;
}

export enum PostType {
    writeUp = 'writeUp',
    experiment = 'experiment',
    project = 'project'
}

export type PostTypes = {
    [PostType.writeUp]: WriteUp,
    [PostType.experiment]: Experiment,
    [PostType.project]: Project,
};

export interface PostSummary extends Unique {
    type: PostType;
    title: string;
    subtitle: string;
    tags: string[];
    timestamp: Date;
}

export interface Post extends PostSummary, Linkable {
}

export interface WriteUp extends Post {
    type: PostType.writeUp;
    render(): ReactElement<any> | null;
}

export interface Experiment extends Post {
    type: PostType.experiment;
    start(stage: Stage);
    stop();
}

export interface Project extends Post {
    type: PostType.project;
    render(): ReactElement<any> | null;
}