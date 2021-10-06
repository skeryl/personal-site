import { Stage } from "grraf";
import { ReactElement } from "react";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export interface Unique {
  id: string;
}

export enum PostType {
  writeUp = "writeUp",
  experiment = "experiment",
  experiment3d = "experiment3d",
  project = "project",
}

export type PostTypes = {
  [PostType.writeUp]: WriteUp;
  [PostType.experiment]: StageContent;
  [PostType.experiment3d]: ExperimentContent3D;
  [PostType.project]: WriteUp;
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

export interface WriteUp {
  render(): ReactElement<any> | null;
}

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
