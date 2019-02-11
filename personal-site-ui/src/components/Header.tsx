import * as React from "react";
import {NavRoute, routes} from "../routes";


function pathString(path: string | string[]): string {
    return Array.isArray(path) ? path.join('/') : path;
}

export function Header(){
    return (
        <div id="header-container">
            <h1>Shane Carroll</h1>
            {/*<a href={'/'}></a>*/}
            {/*<ul id="nav">
            {
                routes.map(route => route as NavRoute)
                    .filter(navRoute => navRoute.name)
                    .map(navRoute => (
                        <li key={pathString(navRoute.path)}><a href={pathString(navRoute.path)}>{navRoute.name}</a></li>
                    ))
            }
            </ul>*/}
        </div>
    )
}