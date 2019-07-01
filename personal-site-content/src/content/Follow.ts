import {Post, PostType, StageContent} from "personal-site-model";
import {add, Circle, Color, DirectionalMagnitude, MouseInfo, Path, Stage} from "grraf";

interface Thickness {
    min: number;
    max: number;
    current: number;
}

class Pen {

    private lines: Path[] = [];
    private currentLine: Path | undefined;
    private color: Color = colors[0];

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
        /*if (mouse.isLeftDown()) {
            this.addPoint(mouse.position());
        } else {
            this.stopLine();
        }*/
    };

    public addPoint(coordinates: DirectionalMagnitude) {
        const coords = this.position(coordinates);
        if(this.currentLine){
            this.currentLine.lineTo(coords.x, coords.y);
            this.stopLine();
        } else {
            this.currentLine = this.stage.createShape(Path, {position: coords, fill: this.color, layer: 2 })
                .moveTo(coords.x, coords.y)
                .setLineCap('round')
                .setStrokeStyle(this.color)
                .setStrokeWidth(this.width) as Path;
        }
    }

    public stopLine() {
        if(this.currentLine){
            this.lines.push(this.currentLine);
            this.currentLine = undefined;
        }
    }

    public setWidth = (current: number) => {
        this.width = current;
    };
}

const waitFor = (num: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, num);
    });
};

const colorA = new Color(219, 92, 135);
const colorB = new Color(227, 3, 140);
const colorC = new Color(207, 49, 179);

const colors = [colorA, colorB, colorC];

class FollowContent implements StageContent {

    private readonly thickness: Thickness = {
        min: 1,
        max: 50,
        current: 10,
    };

    private pointer: Circle | undefined;
    private stage: Stage | undefined;
    private pens: Pen[] = [];
    private interval: number | undefined;

    startDrawLoop = () => {
        if(this.stage){
            this.stage.draw();
            requestAnimationFrame(this.startDrawLoop);
        }
    };

    start = (stage: Stage) => {
        const ctx = stage.canvas.getContext('2d');
        if(!ctx){
            console.error('canvas needs a context, dude');
            return;
        }
        ctx.lineJoin = 'round';

        this.stage = stage;
        const size = stage.getSize();

        this.pointer = this.stage.createShape(Circle)
            .setRadius(this.thickness.current/2)
            .setColor(new Color(255, 145, 98, 1)) as Circle;

        const halfWidth = size.width/2;

        this.pens = [
            new Pen(this.thickness.current, this.stage),
        ];

        let position = { x: halfWidth, y: size.height/2 };

        this.stage.onMouseClick(async mouse => {
            position = mouse.position();
            if(this.pens){

                await this.drawSpiral(position);

                this.pens.forEach(pen => pen.stopLine());

            }
        });

        this.startDrawLoop();
    };

    private drawSpiral = async (position: DirectionalMagnitude) => {
        let delta = {...position};
        let pos = {...position};
        let count = 0;

        while((count++) < 900){
            delta = (await (this.drawNext(pos, count)));
            pos = add(pos, delta);
        }
    };

    private drawNext = async (pos: DirectionalMagnitude, count: number): Promise<DirectionalMagnitude> => {
        await waitFor(Math.log(count));

        const delta = { x: -Math.sin(count)*count*2, y: Math.cos(count)*-2*count};
        const color = colors[count % 3];

        this.pens.forEach(pen => {
            pen.setWidth(Math.floor(1.5*Math.log(count)));
            pen.setColor(color);
            pen.addPoint(pos);
        });
        return delta;
    };

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

const post: Post = {
    summary: {
        id: 'follow',
        tags: ['fun', 'canvas', 'grraf', 'interactive'],
        title: 'Follow',
        timestamp: new Date(2019, 1, 16),
        type: PostType.experiment,
    },
    content: () => new FollowContent(),
};

export default post;