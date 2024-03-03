import { Stage } from "grraf";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export interface Unique {
  id: string;
}

export enum PostType {
  exploration = "explorations",
  experiment = "experiments",
  experiment3d = "experiments-3d",
}

export interface PostSummary extends Unique {
  type: PostType;
  title: string;
  subtitle?: string;
  tags: string[];
  timestamp: Date;
  thumbnail?: string;
  isHidden?: boolean;
  path?: string;
}

export type PostContent = StageContent | ExperimentContent3D;

export type ContentGenerator<T extends PostContent> = () => T;

export interface Post<TContent extends PostContent = PostContent> {
  summary: PostSummary;
  content: ContentGenerator<TContent>;
}

export interface StageContent {
  start(stage: Stage): void;

  unpause?: () => void;

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
