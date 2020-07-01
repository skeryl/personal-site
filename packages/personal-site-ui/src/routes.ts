import { lazy } from "react";
import { RouteProps } from "react-router-dom";

const PostList = lazy(() => import("./containers/PostList"));
const PostDetail = lazy(() => import("./containers/PostDetail"));
const Home = lazy(() => import("./containers/Home"));
const SynthBuilder = lazy(() => import("project-synth-builder"));

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

const synthBuilder: NavRoute = {
  name: "synth builder",
  description: "craft your own synth, make your own jams",
  exact: true,
  path: "/synth-builder",
  component: SynthBuilder,
  hidden: true,
};

export const routes = [
  index,
  //about,
  posts,
  postDetail,
  synthBuilder,
];

export const navRoutes: NavRoute[] = [posts, synthBuilder];
