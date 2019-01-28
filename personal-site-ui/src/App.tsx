import * as React from 'react';
import {BrowserRouter, Route} from "react-router-dom";
import {routes} from "./routes";
import {Header} from "./components/Header";

export function App() {
    return (
        <div>
            <Header/>
            <div id="app-content">
                <BrowserRouter>
                    {
                        routes.map(routeProps => (
                            <Route key={Array.isArray(routeProps.path) ? routeProps.path.join('/') : routeProps.path} {...routeProps} />
                        ))
                    }
                </BrowserRouter>
            </div>
        </div>
    );
}