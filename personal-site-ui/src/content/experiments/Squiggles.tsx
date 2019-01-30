import * as React from "react";
import {ContentDatabase, StageContent} from "../index";
import {Experiment, PostType} from "../../../../personal-site-model/models";
import {Color, DirectionalMagnitude, MouseInfo, Path, Rectangle, Shape, Stage} from "grraf";

const SEGMENT_LENGTH = 40;

const redOrange = new Color(221, 60, 2);
const aqua = new Color(66, 229, 244);
const transparent = new Color(255, 255, 255, 0.0);

const SEGMENT_SPACING = 10;
const VERTICAL_SPACING = 40;

const BORDER_WIDTH_PCT = 0.8;
const BORDER_HEIGHT_PCT = 0.8;


export class AnchoredSquiggle extends Shape {

    private path: Path;
    private target: DirectionalMagnitude = { x: this.x + SEGMENT_LENGTH, y: this.y };
    private cpPosition: DirectionalMagnitude= { x: this.target.x, y: this.target.y };

    constructor(stage: Stage, id: number, context: CanvasRenderingContext2D, x: number, y: number, color: Color) {
        super(stage, id, context, x, y, color);


        this.path = this.stage.createShape(Path)
            .setLineCap("round")
            .setColor(redOrange)
            .setStrokeColor(redOrange) as Path;
    }

    setTarget(x: number, y: number): AnchoredSquiggle {
        this.target = { x, y };
        return this;
    }

    setCpPosition(value: DirectionalMagnitude): AnchoredSquiggle {
        this.cpPosition = value;
        return this;
    }

    drawShape() {
        this.path.resetPath();
        this.path.moveTo(this.x, this.y)
            .quadraticCurveTo(this.target.x, this.target.y, this.x + SEGMENT_LENGTH, this.y)
            .setStrokeWidth(this.strokeWidth || 1);
        this.path.drawShape();
    }
}


export class SomethingPretty implements StageContent {

    private stage: Stage | undefined;
    private mouse: MouseInfo | undefined;
    private border: Rectangle | undefined;

    private hypotenuse: number = 1;
    private squiggles: AnchoredSquiggle[] = [];

    start = (stage: Stage) => {
        this.stage = stage;

        const size = stage.getSize();

        const borderWidth = size.width * BORDER_WIDTH_PCT;
        const borderHeight = size.height * BORDER_HEIGHT_PCT;

        const startingPosition = {
            x: (size.width - borderWidth) / 2,
            y: (size.height - borderHeight) / 2,
        };

        this.border = this.stage.createShape(Rectangle, startingPosition.x, startingPosition.y, transparent, -1)
            .setWidth(borderWidth)
            .setHeight(borderHeight)
            .setColor(transparent)
            .setStrokeWidth(10)
            .setStrokeColor(aqua) as Rectangle;

        const borderEdgeRight = borderWidth + this.border.x;
        const borderEdgeDown = borderHeight + this.border.y;

        const initialX = this.border.position.x + (this.border.strokeWidth || 0);
        let next: DirectionalMagnitude | null = {
            x: initialX,
            y: this.border.position.y  + (this.border.strokeWidth || 0)
        };

        this.hypotenuse = Math.sqrt(borderWidth**2 + borderHeight**2);

        let count = 0;

        while(next !== null){
            const currentX: number = next.x + SEGMENT_LENGTH;
            const currentY: number = next.y;

            const squiggle = this.stage.createShape(AnchoredSquiggle)
                .setPosition({ x: next.x, y: next.y }) as AnchoredSquiggle;

            this.squiggles.push(squiggle);

            const nextX = currentX + SEGMENT_LENGTH + SEGMENT_SPACING;
            const nextY = currentY + VERTICAL_SPACING;

            const outsideBoundsX = nextX >= borderEdgeRight;
            const outsideBoundsY = nextY >= borderEdgeDown;

            next = (outsideBoundsY && outsideBoundsX) ? null :
                outsideBoundsX ? {
                    x: initialX,
                    y: nextY,
                } : {
                    x: nextX,
                    y: currentY,
                };
            count++;
        }

        this.stage.onMouseUpdate(mouse => {
            this.mouse = mouse;
            window.requestAnimationFrame(this.redrawLines);
        });

        this.stage.draw();
    };


    private redrawLines = (): void => {
        if(this.stage){
            if(this.border && this.mouse){
                const position = this.mouse.position();

                this.squiggles.forEach(squiggle => {

                    const progressFromCenter = Math.abs(
                        (position.y - (this.border.y + (this.border.height()/2)))
                    );

                    squiggle.setTarget(Math.ceil(position.x), Math.ceil(position.y))
                        .setStrokeWidth(Math.ceil((20*(progressFromCenter)/this.border.height())));
                });
            }
            this.stage.draw();
        }
    };

    stop = () => {
        if(this.stage){
            this.stage.clear();
            this.stage = undefined;
        }
        this.squiggles = []
    };
}

export const Squiggles = ContentDatabase.add<Experiment>({
    id: 'squiggles',
    tags: ['fun', 'canvas', 'grraf', 'interactive'],
    title: 'Squiggles',
    timestamp: new Date(2019, 0, 29),
    type: PostType.experiment
},
    new SomethingPretty(),
);