import * as React from "react";

export function Header(){
    function classes(path: string, extra?: string){
        return `${window.location.pathname === path ? 'active ' : ''}${extra ? extra : ''}`;
    }
    return (
        <div id="header-container">
            <a href="/" className={classes('/', 'logo-name')}><h1>Shane Carroll</h1></a>
            {/*<a href="/about" className={classes('/about')}>about</a>*/}
            <a href="/experiments" className={classes('/experiments')}>other experiments</a>
        </div>
    )
}