import { lazy } from "react";
import { RouteProps } from "react-router-dom";

const PostList = lazy(() => import("./containers/PostList"));
const PostDetail = lazy(() => import("./containers/PostDetail"));
const Home = lazy(() => import("./containers/Home"));

const SoundBooth = lazy(() =>
  import("project-synth-builder/src/components/SoundBoothWrapper"),
);

export type NavRoute = RouteProps & {
  path: string;
  name: string;
  description: string;
  hidden?: boolean;
};

const index: RouteProps = {
  exact: true,
  path: "/",
  component: Home,
};

const posts: NavRoute = {
  name: "art",
  exact: true,
  path: "/art",
  component: PostList,
  description: "snippets of saucy software",
};

const postDetail: RouteProps = {
  path: "/art/:id",
  component: PostDetail,
};

const soundBooth: NavRoute = {
  name: "sound booth",
  description: "make your own jams",
  exact: true,
  path: "/sound-booth",
  component: SoundBooth,
  hidden: false,
};

export const routes = [
  index,
  //about,
  posts,
  postDetail,
  soundBooth,
];

export const navRoutes: NavRoute[] = [posts, soundBooth];
