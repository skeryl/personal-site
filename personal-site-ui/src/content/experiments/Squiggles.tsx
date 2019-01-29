import * as React from "react";
import {ContentDatabase} from "../index";
import {Experiment, PostType} from "../../../../personal-site-model/models";
import {Color, DirectionalMagnitude, MouseInfo, Path, Rectangle, Shape, Stage} from "grraf";

const SEGMENT_LENGTH = 20;

const redOrange = new Color(221, 60, 2);
const aqua = new Color(66, 229, 244);
const white = new Color(255, 255, 255);

const SEGMENT_SPACING = 4.5;
const VERTICAL_SPACING = 20;

const BORDER_WIDTH = 800;
const BORDER_HEIGHT = 800;


export class AnchoredSquiggle extends Shape {

    private path: Path;
    private target: DirectionalMagnitude = { x: this.x + SEGMENT_LENGTH, y: this.y };
    private cpPosition: DirectionalMagnitude= { x: this.target.x, y: this.target.y };

    constructor(stage: Stage, id: number, context: CanvasRenderingContext2D, x: number, y: number, color: Color) {
        super(stage, id, context, x, y, color);


        this.path = this.stage.createShape(Path)
            .setLineCap("round")
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


export class SomethingPretty {

    private stage: Stage | undefined;
    private mouse: MouseInfo | undefined;
    private border: Shape | undefined;

    private squiggles: AnchoredSquiggle[] = [];

    start = (stage: Stage) => {
        this.stage = stage;

        const startingPosition = {
            x: (window.innerWidth - BORDER_WIDTH) / 2,
            y: (window.innerHeight - BORDER_HEIGHT) / 2,
        };

        this.border = this.stage.createShape(Rectangle, startingPosition.x, startingPosition.y, white, -1)
            .setHeight(BORDER_HEIGHT)
            .setWidth(BORDER_WIDTH)
            .setColor(white)
            .setStrokeWidth(20)
            .setStrokeColor(aqua);

        const borderEdgeRight = BORDER_WIDTH + this.border.x;
        const borderEdgeDown = BORDER_HEIGHT + this.border.y;

        const initialX = this.border.position.x + (this.border.strokeWidth || 0);
        let next: DirectionalMagnitude | null = {
            x: initialX,
            y: this.border.position.y  + (this.border.strokeWidth || 0)
        };

        let count = 0;

        while(next !== null){
            const currentX: number = next.x + SEGMENT_LENGTH;
            const currentY: number = next.y;

            const squiggle = this.stage.createShape(AnchoredSquiggle)
                .setPosition({ x: next.x, y: next.y }) as AnchoredSquiggle;

            this.squiggles.push(squiggle);

            const nextX = currentX + SEGMENT_LENGTH + SEGMENT_SPACING;
            const nextY = currentY + VERTICAL_SPACING;

            const outsideBoundsX = nextX > borderEdgeRight;
            const outsideBoundsY = nextY > borderEdgeDown;

            next = (outsideBoundsX && outsideBoundsY) ? null :
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

    };


    private redrawLines = (): void => {
        if(this.stage){
            if(this.border && this.mouse){
                const position = this.mouse.position();
                const velocity = this.mouse.velocity();
                // const width = Math.min(20,Math.max(1,Math.floor((velocity.x + velocity.y))));

                this.squiggles.forEach(squiggle => {
                    squiggle.setTarget(Math.ceil(position.x), Math.ceil(position.y))
                        .setCpPosition({ x: Math.ceil(velocity.x), y: Math.ceil(velocity.y) })
                        .setStrokeWidth(1);
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
    id: '1',
    tags: ['fun', 'canvas', 'grraf', 'interactive'],
    title: 'Squiggles',
    timestamp: new Date(2019, 0, 29),
    type: PostType.experiment
},
    new SomethingPretty(),
);