import * as React from "react";
import {Experiment} from "../../../../personal-site-model/models";
import {useEffect, useRef} from "react";
import {Stage} from "grraf";
import {PostProps} from "./Post";

export function ExperimentComponent(props: PostProps<Experiment>){

    let stage: Stage | undefined;
    const containerRef = useRef<HTMLDivElement>(null);

    function onResize(){
        tearDown();
        setup();
    }

    function setup() {
        const container = containerRef.current as HTMLDivElement;
        if (container != null && !stage) {
            stage = new Stage(container, props.full);
            stage.canvas.height = container.clientHeight;
            stage.canvas.width = container.clientWidth;
            props.post.start(stage);
        }
    }

    function tearDown() {
        if(stage){
            props.post.stop();
            stage.clear();
        }
        stage = null;
    }

    function initialize() {
        setup();
        window.addEventListener("resize", onResize);
        return () => {
            tearDown();
            window.removeEventListener("resize", onResize);
        };
    }

    useEffect(initialize, [stage, containerRef.current]);

    return (
        <div id={"experiment-canvas"} ref={containerRef}>
        </div>
    );
}