import {RouteProps} from 'react-router-dom';
import {Home} from "./containers/Home";
import {PostDetail} from "./containers/PostDetail";
import {PostType} from "../../personal-site-model/models";

export type RouteConfig = RouteProps & { name: '' };

const index: RouteProps = {
    exact: true,
    path: '/',
    component: Home
};

const experiments: RouteProps = {
    path: '/experiments'
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
    experimentDetail,
    writeUpDetail,
    projectDetail,
];
