import {RouteProps} from 'react-router-dom';
import {Home, HomeWithOverlay} from "./containers/Home";
import {PostDetail} from "./containers/PostDetail";
import {PostType} from "../../personal-site-model/models";
import {PostList} from "./containers/PostList";
import {AboutOverlay} from "./overlays/AboutOverlay";

export type NavRoute = RouteProps & { name: string };

const index: RouteProps = {
    exact: true,
    path: '/',
    component: Home
};

const experiments: NavRoute = {
    name: 'experiments',
    exact: true,
    path: '/experiments',
    component: PostList(PostType.experiment),
};

const about: NavRoute = {
    name: 'about',
    exact: true,
    path: '/about',
    component: HomeWithOverlay(AboutOverlay),
};

const experimentDetail: RouteProps = {
    path: '/experiments/:id',
    component: PostDetail(PostType.experiment),
};

export const routes = [
    index,
    about,
    experiments,
    experimentDetail,
];
