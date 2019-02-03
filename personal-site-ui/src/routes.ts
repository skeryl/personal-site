import {RouteProps} from 'react-router-dom';
import {Home} from "./containers/Home";
import {PostDetail} from "./containers/PostDetail";
import {PostType} from "../../personal-site-model/models";
import {PostList} from "./containers/PostList";

export type NavRoute = RouteProps & { name: string };

const index: RouteProps = {
    exact: true,
    path: '/',
    component: Home
};

const experiments: NavRoute = {
    name: 'experiments',
    path: '/experiments',
    component: PostList(PostType.experiment),
};

const projects: NavRoute = {
    name: 'projects',
    path: '/projects',
    component: PostList(PostType.project),
};

const writeUps: NavRoute = {
    name: 'write-ups',
    path: '/write-ups',
    component: PostList(PostType.writeUp)
};

const experimentDetail: RouteProps = {
    path: '/experiments/:id',
    component: PostDetail(PostType.experiment),
};

const writeUpDetail: RouteProps = {
    path: '/write-ups/:id',
    component: PostDetail(PostType.writeUp),
};

const projectDetail: RouteProps = {
    path: '/projects/:id',
    component: PostDetail(PostType.project),
};

export const routes = [
    index,
    experiments,
    projects,
    writeUps,
    experimentDetail,
    writeUpDetail,
    projectDetail,
];
