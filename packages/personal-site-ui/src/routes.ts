import { lazy } from "react";
import { RouteProps } from "react-router-dom";

const ArtList = lazy(() => import("./pages/art"));
const ArtDetail = lazy(() => import("./pages/art/detail"));
const Home = lazy(() => import("./pages/Home"));
const Explorations = lazy(() => import("./pages/explorations"));
const ExplorationDetail = lazy(() => import("./pages/explorations/detail"));

const SoundBooth = lazy(
  () => import("project-synth-builder/src/components/SoundBoothWrapper"),
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

const artList: NavRoute = {
  name: "art",
  exact: true,
  path: "/art",
  component: ArtList,
  description: "snippets of saucy software",
};

const artDetail: RouteProps = {
  path: "/art/:id",
  component: ArtDetail,
};

const explorations: NavRoute = {
  name: "explorations",
  exact: true,
  path: "/explorations",
  component: Explorations,
  hidden: true,
  description: "deep dives into data",
};

const explorationDetail: RouteProps = {
  path: "/explorations/:id",
  component: ExplorationDetail,
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
  artList,
  artDetail,
  soundBooth,
  explorations,
  explorationDetail,
];

export const navRoutes: NavRoute[] = [artList, soundBooth, explorations];
