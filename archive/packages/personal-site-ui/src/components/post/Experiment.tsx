import * as React from "react";
import {useEffect, useRef} from "react";
import {PostType} from "personal-site-model";
import {Stage} from "grraf";
import {PostProps} from "./Post";

type Size = { height: number, width: number };

function same(a: Size | undefined, b: Size | undefined): boolean {
    return Boolean(
        a && b && a.width === b.width &&
        a.height === b.height
    );
}

const resizeWaitPeriod = 500; //ms

export function ExperimentComponent(props: PostProps<PostType.experiment>){

    let stage: Stage | undefined;
    let lastSize: Size | undefined;
    let resizeTimeout: number | undefined;

    const containerRef = useRef<HTMLDivElement>(null);

    function onResize(){
        const currentSize = stage && stage.getSize();
        if(!same(currentSize, lastSize)){
            tearDown();
            if(resizeTimeout){
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = window.setTimeout(() => {
                setup();
            }, resizeWaitPeriod);
        }
        lastSize = currentSize;
    }

    function setup() {
        const container = containerRef.current as HTMLDivElement;
        if (container != null && !stage) {
            stage = new Stage(container, true);
            stage.canvas.height = container.clientHeight;
            stage.canvas.width = container.clientWidth;
            props.content.start(stage);
            lastSize = stage.getSize();
        }
    }

    function tearDown() {
        if(stage){
            props.content.stop();
            stage.clear();
        }
        stage = undefined;
    }

    useEffect(function initialize() {
        setup();
        window.addEventListener("resize", onResize);
        return () => {
            tearDown();
            window.removeEventListener("resize", onResize);
        };
    }, [stage, containerRef.current]);

    return (
        <div id={"experiment-canvas"} ref={containerRef}>
        </div>
    );
}