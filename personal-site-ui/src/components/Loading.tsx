import * as React from "react";
import {Animation, Circle, Color, Rectangle, Stage, TimingFunction} from "grraf";
import {CanvasComponent, CanvasRenderer} from "./CanvasComponent";


class LoadingRenderer implements CanvasRenderer {
    private readonly stage: Stage;
    private readonly animations: Animation[] = [];

    constructor(
        cnv: HTMLCanvasElement
    ){
        this.stage = new Stage(cnv);
    }

    start(): void {
        const circle = this.stage.createShape(Circle, {
            radius: 25,
            fill: new Color(240, 20, 60),
            position: {x: 50, y: 50}
        });
        const animation = this.stage.animate(circle).transition('radius', {
                0: 15,
                500: 30,
                1000: 15
            },
            TimingFunction.EaseInOutCubic
        ).create({repeat: true});
        this.animations.push(animation);


        const square = this.stage.createShape(Rectangle, {
            width: 60,
            height: 60,
            fill: new Color(240, 20, 60),
            position: {x: 20, y: 20}
        });
        const sqrAnimation = this.stage.animate(square)
            .transition('height', {
                    0: 60,
                    500: 30,
                    1000: 60
                },
                TimingFunction.EaseInOutCubic
            )
            .transition('width',
                {
                    0: 60,
                    500: 30,
                    1000: 60,
                },
                TimingFunction.EaseInOutCubic
            )
            .transition('position',
                {
                    0: {x: 20, y: 20},
                    500: {x: 35, y: 35},
                    1000: {x: 20, y: 20},
                },
                TimingFunction.EaseInOutCubic
            )
            .create({repeat: true});
        this.animations.push(sqrAnimation);

        animation.start();
        sqrAnimation.start();
    }

    dispose(): void {
        this.animations.forEach(ani => ani.cancel());
        this.stage.clear();
        this.animations.splice(0, this.animations.length);
    }
}

export function Loading() {
    return (
        <div className="loading-container">
            <CanvasComponent renderer={LoadingRenderer} width={100} height={100} fallback="loading..."/>
        </div>
    );
}
