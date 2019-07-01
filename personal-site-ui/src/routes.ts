import {RouteProps} from 'react-router-dom';
import {Home, /*HomeWithOverlay*/} from "./containers/Home";
import {PostList} from "./containers/PostList";
import {AboutOverlay} from "./overlays/AboutOverlay";
import {ExperimentDetail} from "./containers/ExperimentDetail";

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
    component: PostList,
};

/*const about: NavRoute = {
    name: 'about',
    exact: true,
    path: '/about',
    component: HomeWithOverlay(AboutOverlay),
};*/

const experimentDetail: RouteProps = {
    path: '/experiments/:id',
    component: ExperimentDetail,
};

export const routes = [
    index,
    //about,
    experiments,
    experimentDetail,
];
