import { RouteProps } from "react-router-dom";
import { Home } from "./containers/Home";
import { PostList } from "./containers/PostList";
import { PostDetail } from "./containers/PostDetail";

export type NavRoute = RouteProps & { name: string };

const index: RouteProps = {
  exact: true,
  path: "/",
  component: Home,
};

const experiments: NavRoute = {
  name: "posts",
  exact: true,
  path: "/posts",
  component: PostList,
};

/*const about: NavRoute = {
    name: 'about',
    exact: true,
    path: '/about',
    component: HomeWithOverlay(AboutOverlay),
};*/

const experimentDetail: RouteProps = {
  path: "/posts/:id",
  component: PostDetail,
};

export const routes = [
  index,
  //about,
  experiments,
  experimentDetail,
];
