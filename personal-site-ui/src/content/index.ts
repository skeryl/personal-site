import {ExperimentContent3D, PostSummary, PostType, PostTypes, StageContent} from "../../../personal-site-model";
import {ComponentClass, ReactElement} from "react";
import {ProjectComponent} from "../components/post/Project";
import {ExperimentComponent} from "../components/post/Experiment";
import {ExperimentSummary} from "../components/post/ExperimentSummary";
import {ExperimentComponent3D} from "../components/post/Experiment3d";
import {WriteUpComponent} from "../components/post/WriteUp";
import {PostProps} from "../components/post/Post";
import {PostSummaryProps} from "../components/post/PostSummary";

type ContentRenderers = {
    [key in PostType]: Renderer<key>;
}

export type RenderThing<T extends PostType> = ComponentClass<PostProps<T>, any> |
    ((props: PostProps<T>) => (ReactElement<any> | null));

export type RenderSummaryThing<T extends PostType> = ComponentClass<{ post: PostTypes[T] }, any> |
    ((props: PostSummaryProps) => (ReactElement<any> | null));

export type Renderer<T extends PostType> = {
    main: RenderThing<T>;
    summary?: RenderSummaryThing<T>;
};

export const Renderers: ContentRenderers = {
    [PostType.project]: {
        main: ProjectComponent,
    },
    [PostType.experiment]: {
        main: ExperimentComponent,
        summary: ExperimentSummary
    },
    [PostType.experiment3d]: {
        main: ExperimentComponent3D
    },
    [PostType.writeUp]: {
        main: WriteUpComponent,
    },
};

export interface StaticContent {
    render(): ReactElement<any> | null;
}
