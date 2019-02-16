import * as React from "react";
import {ContentDatabase, StageContent} from "../index";
import {PostType} from "../../../../personal-site-model/models";
import {Circle, Color, DirectionalMagnitude, MouseInfo, Path, Stage} from "grraf";

const blue = new Color(37, 150, 230);
const bg = new Color(244,215,220);
const orange = new Color(230, 150, 37);

interface Thickness {
    min: number;
    max: number;
    current: number;
}

class Pen {

    private lines: Path[] = [];
    private currentLine: Path | undefined;
    private color: Color = orange;

    constructor(
        public width: number,
        private readonly stage: Stage,
        private transformCoordinates?: (coords: DirectionalMagnitude) => DirectionalMagnitude
    ){
        this.stage.onMouseUpdate(this.onMouseUpdate);
    }

    public setColor = (color: Color) => {
        this.color = color;
    };

    private position(position: DirectionalMagnitude): DirectionalMagnitude {
        if(this.transformCoordinates){
            return this.transformCoordinates(position);
        }
        return position;
    }

    private onMouseUpdate = (mouse: MouseInfo) => {
        if (mouse.isLeftDown()) {
            this.addPoint(mouse.position());
        } else {
            this.stopLine();
        }
    };


    public addPoint(coordinates: DirectionalMagnitude) {
        const coords = this.position(coordinates);
        if(this.currentLine){
            this.currentLine.lineTo(coords.x, coords.y);
        } else {
            this.currentLine = this.stage.createShape(Path, coords.x, coords.y, this.color, 2)
                .moveTo(coords.x, coords.y)
                .setLineCap('round')
                .setStrokeColor(this.color)
                .setStrokeWidth(this.width) as Path;
        }
    }

    public stopLine() {
        if(this.currentLine){
            this.lines.push(this.currentLine);
            this.currentLine = undefined;
        }
    }
}

export class MirrorsContent implements StageContent {

    private readonly thickness: Thickness = {
        min: 1,
        max: 50,
        current: 1,
    };

    private pointer: Circle | undefined;
    private stage: Stage | undefined;
    private pens: Pen[] = [];
    private interval: number | undefined;

    start = (stage: Stage) => {
        const ctx = stage.canvas.getContext('2d');
        ctx.lineJoin = 'round';

        window.addEventListener('wheel', this.handleMouseWheel);

        this.stage = stage;
        const size = stage.getSize();
        const reflection = size.width / 2;

        this.pointer = this.stage.createShape(Circle)
            .setRadius(this.thickness.current/2)
            .setColor(new Color(255, 145, 98, 1)) as Circle;

        this.pens = [
            new Pen(this.thickness.current, this.stage),
            new Pen(this.thickness.current, this.stage, ({ x, y }) => ({
                x: reflection + (reflection - x),
                y: y,
            })),
        ];

        let position = { x: size.width/2, y: size.height/2 };
        this.interval = setInterval(() => {
            const newPosition = {
                x: position.x + Math.ceil(Math.sign(Math.random() - 0.5)),
                y: position.y + Math.ceil(Math.sign(Math.random() - 0.5))
            };

            if(this.pens){
                this.pens.forEach(pen => pen.addPoint(newPosition));
            }

            if((Math.random()*100) > 0.1){
                position = newPosition;
            } else {
                const red = (125*Math.random())+95;
                const color = new Color(red, Math.random()*25, Math.random()*25);
                this.setThickness(Math.random() > 0.5 ? 1 : 2);
                this.pens.forEach(pen => {
                    pen.stopLine();
                    pen.setColor(color);
                });
                position = { x: Math.random()*size.width, y: Math.random()*size.height };
            }

            stage.draw();
        }, 2);

        this.stage.onMouseUpdate(mouse => {
            this.pointer.setPosition(mouse.position());
            if(mouse.isLeftDown()){
                position = mouse.position();
            }
            window.requestAnimationFrame(() => this.stage.draw());
        });
    };

    private handleMouseWheel = (e) => {
        const additional = Math.ceil(e.deltaY/100);
        this.setThickness(additional);
    };

    private setThickness(additional: number) {
        this.thickness.current += additional;
        this.thickness.current = Math.min(this.thickness.max,
            Math.max(this.thickness.min, this.thickness.current)
        );
        this.pens.forEach(pen => pen.width = this.thickness.current);
        if (this.pointer) {
            this.pointer.setRadius(this.thickness.current / 2);
        }
        if (this.stage) {
            this.stage.draw();
        }
    }

    stop = () => {
        if(this.stage){
            this.stage.clear();
            this.stage = undefined;
        }
        if(this.interval){
            clearInterval(this.interval);
        }
    };
}

export const Mirrors = ContentDatabase.add<PostType.experiment>({
        id: 'mirrors',
        tags: ['fun', 'canvas', 'grraf', 'interactive'],
        title: 'Mirrors',
        timestamp: new Date(2019, 1, 15),
        type: PostType.experiment,
    },
    new MirrorsContent(),
);