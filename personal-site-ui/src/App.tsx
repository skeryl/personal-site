import * as React from 'react';
import {useEffect} from 'react';
import {BrowserRouter, Route, Switch} from "react-router-dom";
import {routes} from "./routes";
import {Header} from "./components/Header";
import {Animation, Color, Rectangle, SizeStrategy, Stage, TimingFunction} from "grraf";


const lightPeach = new Color(255, 245, 237);
const lightRose = new Color(252, 227, 227);

export function App() {

    const container = React.createRef<HTMLCanvasElement>();

    let stage: Stage | undefined;
    let animation: Animation | undefined;

    useEffect(() => {
        if(!stage && container.current){
            stage = new Stage(container.current, true);
            stage.draw();
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