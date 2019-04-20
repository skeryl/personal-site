import * as React from "react";
import {NavRoute, routes} from "../routes";


function pathString(path: string | string[]): string {
    return Array.isArray(path) ? path.join('/') : path;
}

export function Header(){
    return (
        <div id="header-container">
            <a href="/" className="logo-name"><h1>Shane Carroll</h1></a>
            <a href="/experiments">&lt;&lt;&nbsp;all experiments&nbsp;&gt;&gt; </a>
        </div>
    )
}