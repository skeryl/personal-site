
import {Route, RouteProps} from 'react-router-dom';
import {Home} from "./containers/Home";

export type RouteConfig = RouteProps & { name: '' };

const index: RouteProps = {
    exact: true,
    path: '/',
    component: Home
};

export const routes = [
    index,
];
