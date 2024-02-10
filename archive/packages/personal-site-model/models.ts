import { Stage } from "grraf";
import { ReactNode } from "react";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export interface Unique {
  id: string;
}

export enum PostType {
  exploration = "explorations",
  experiment = "experiments",
  experiment3d = "experiments-3d",
}

export type PostTypes = {
  [PostType.exploration]: WriteUp;
  [PostType.experiment]: StageContent;
  [PostType.experiment3d]: ExperimentContent3D;
};

export interface PostSummary extends Unique {
  type: PostType;
  title: string;
  subtitle?: string;
  tags: string[];
  timestamp: Date;
  thumbnail?: string;
  isHidden?: boolean;
}

export type PostContent = StageContent | ExperimentContent3D | WriteUp;

export type ContentGenerator = () => PostContent;

export interface Post {
  summary: PostSummary;
  content: ContentGenerator;
}

type WriteUp = ReactNode;

export interface StageContent {
  start(stage: Stage): void;
  stop(): void;
}

export interface RendererParams {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
}

export interface ExperimentContent3D {
  start(params: RendererParams): void;
  stop(): void;
  onRender?: () => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}
