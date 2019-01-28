import * as React from "react";
import {Experiment} from "../../../personal-site-model/models";
import {useEffect} from "react";
import {Stage} from "grraf";

export interface ExperimentProps {
    post: Experiment;
}

export function ExperimentComponent(props: ExperimentProps){

    let stage: Stage | undefined;
    const cnvRef = React.createRef<HTMLCanvasElement>();

    useEffect(() => {
        if(cnvRef.current != null && !stage){
            stage = new Stage(cnvRef.current);
            props.post.start(stage);
        }
        return () => {
            if(stage){
                props.post.stop();
                stage.clear();
            }
        };
    });

    return (
        <canvas id={"experiment-canvas"} ref={cnvRef}>
        </canvas>
    );
}