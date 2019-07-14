import * as React from 'react';
import {CanvasComponent, CanvasRenderer} from "./CanvasComponent";
import {Color, Rectangle, Stage, TimingFunction, Animation} from "grraf";
import {useState} from "react";

interface Props {
    onClick: () => void;
    // show: boolean;
}

class FullScreenButtonRenderer implements CanvasRenderer {
    private readonly animation: Animation;

    constructor(private cnv: HTMLCanvasElement){
        const stage = new Stage(cnv);
        const outerRect = stage.createShape(Rectangle, { fill: new Color(75, 55, 55, 0.3 ), width: 50, height: 35, layer: 0 });
        const innerRect = stage.createShape(Rectangle, { fill: new Color(75, 55, 55, 0.6 ), width: 40, height: 25, layer: 1 });
        this.animation = stage.animate(innerRect)
            .transition("height", { 0: 25, 500: 35, 1350: 25 }, TimingFunction.EaseInOutCubic)
            .transition("width", { 0: 40, 500: 50, 1350: 40 }, TimingFunction.EaseInOutCubic)
            .create({ repeat: true });
    }

    dispose(): void {
        this.animation.cancel();
    }

    start(): void {
        this.animation.start();
    }
}

export function FullScreenButton(props: Props){
    return (
        <button onClick={props.onClick} className={"fullscreen-button"}>
            <CanvasComponent renderer={FullScreenButtonRenderer} className={"fullscreen-canvas"} height={35} width={50} fallback="full-screen!"/>
        </button>
    );
}