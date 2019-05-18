import {DirectionalMagnitude, Stage} from "grraf";
import {ReactElement} from "react";
import {Camera, Scene} from "three";

export interface Unique {
    id: string;
}

export interface Linkable {
    uri: string;
}

export enum PostType {
    writeUp = 'writeUp',
    experiment = 'experiment',
    experiment3d = 'experiment3d',
    project = 'project'
}

export type PostTypes = {
    [PostType.writeUp]: WriteUp,
    [PostType.experiment]: Experiment,
    [PostType.experiment3d]: Experiment3D,
    [PostType.project]: Project,
};

export interface PostSummary extends Unique {
    type: PostType;
    title: string;
    subtitle?: string;
    tags: string[];
    timestamp: Date;
    thumbnail?: string;
}

export interface Post extends PostSummary, Linkable {
}

export interface WriteUp extends Post {
    type: PostType.writeUp;
    render(): ReactElement<any> | null;
}

export interface StageContent {
    start(stage: Stage);
    stop();
}

export interface ExperimentContent3D {
    start(scene: Scene, camera: Camera);
    stop();
}

export interface Experiment extends Post, StageContent {
    type: PostType.experiment;
    aspectRatio?: () => DirectionalMagnitude;
}

export interface Experiment3D extends Post, ExperimentContent3D {
    type: PostType.experiment3d;
}

export interface Project extends Post {
    type: PostType.project;
    render(): ReactElement<any> | null;
}
