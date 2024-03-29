import { ComponentClass, ReactElement } from "react";
import { PostType, PostTypes } from "personal-site-model";
import { ExperimentComponent } from "../components/post/Experiment";
import { ExperimentSummary } from "../components/post/ExperimentSummary";
import { ExperimentComponent3D } from "../components/post/Experiment3d";
import { ExplorationComponent } from "../components/post/Exploration";
import { PostProps } from "../components/post/Post";
import { PostSummaryProps } from "../components/post/PostSummary";

type ContentRenderers = {
  [key in PostType]: Renderer<key>;
};

export type RenderThing<T extends PostType> =
  | ComponentClass<PostProps<T>, any>
  | ((props: PostProps<T>) => ReactElement<any> | null);

export type RenderSummaryThing<T extends PostType> =
  | ComponentClass<{ post: PostTypes[T] }, any>
  | ((props: PostSummaryProps) => ReactElement<any> | null);

export type Renderer<T extends PostType> = {
  main: RenderThing<T>;
  summary?: RenderSummaryThing<T>;
};

export const Renderers: ContentRenderers = {
  [PostType.experiment]: {
    main: ExperimentComponent,
    summary: ExperimentSummary,
  },
  [PostType.experiment3d]: {
    main: ExperimentComponent3D,
  },
  [PostType.exploration]: {
    main: ExplorationComponent,
  },
};

export interface StaticContent {
  render(): ReactElement<any> | null;
}
