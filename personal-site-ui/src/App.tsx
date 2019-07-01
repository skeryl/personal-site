import * as React from 'react';
import {useEffect} from 'react';
import {BrowserRouter, Route, Switch} from "react-router-dom";
import {routes} from "./routes";
import {Header} from "./components/Header";
import {Stage} from "grraf";
import {Home} from "./containers/Home";

export function App() {

    const container = React.createRef<HTMLCanvasElement>();

    let stage: Stage | undefined;

    useEffect(() => {
        if(!stage && container.current){
            stage = new Stage(container.current, true);
        }
        return () => {
            if(stage){
                stage.clear();
            }
            stage = undefined;
        };
    });

    return (
        <div>
            <canvas id="cnv-background" ref={container}/>
            <Header/>
            <div id="app-content">
                <BrowserRouter>
                    <Switch>
                        {
                            routes.map(routeProps => (
                                <Route key={Array.isArray(routeProps.path) ? routeProps.path.join('/') : routeProps.path} {...routeProps} />
                            ))
                        }
                    </Switch>
                </BrowserRouter>
            </div>
        </div>
    );
}