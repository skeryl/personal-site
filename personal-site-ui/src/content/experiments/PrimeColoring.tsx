import {ContentDatabase, StageContent} from "../index";
import {Color, Rectangle, Stage} from "grraf";
import {PostType} from "../../../../personal-site-model/models";

const rowSize = 80;

const numColors = {
    [2]: new Color(255, 237, 168),
    [3]: new Color(0, 147, 59),
    [5]: new Color(193, 61, 0),
    [7]: new Color(193, 0, 164),
    [11]: new Color(158, 57, 140),
    [13]: new Color(57, 157, 14),
};

function getColor(seed: number): Color {
    return seed in numColors ? numColors[seed] : new Color((Math.random()*125) + 130, (Math.random()*55)+85, (Math.random()*125)+130, 1);
}

export class PrimeColoringContent implements StageContent {

    private stage: Stage;
    private stopped = false;

    private waitFor = async (ms: number) => {
        return new Promise((resolve, reject) => setTimeout(() => {
            if(!this.stopped){
                resolve();
            }
        }, ms));
    };

    public start = async (stage: Stage) => {
        this.stopped = false;
        this.stage = stage;

        const size = stage.getSize();

        const squareSize = Math.floor(size.width / rowSize);

        const squares: {[index: number]: Rectangle} = {};
        const total = Math.floor(size.height / squareSize) * rowSize;

        const actualWidth = (squareSize*rowSize);
        const extra = (size.width - actualWidth) / 2;

        for(let ix = 0; ix < total; ix++){
            const row = Math.floor(ix / rowSize);
            const col = ix % rowSize;

            const n = ix + 1;

            squares[n] = stage.createShape(Rectangle, {
                position: { x: (col * squareSize) + extra, y: row * squareSize },
                fill: Color.transparent,
                strokeStyle: new Color(0,0, 0, 0.5),
                strokeWidth: 1,
                layer: 1
            })
                .setWidth(squareSize)
                .setHeight(squareSize);
        }

        stage.draw();

        const colors: {[index: number]: Color} = {};

        for(let num = 2; num < total; num++){

            if(num in colors){
               continue;
            }

            colors[num] = getColor(num);
            for(let multiple = num + num; multiple < total; multiple += num){
                const square = squares[multiple];
                square.fill = square.fill === Color.transparent ? colors[num] : Color.mix([square.fill as Color, colors[num]]);
            }

            stage.draw();
            await this.waitFor(1);
            if(this.stopped){
                break;
            }
        }
        stage.draw();
    };

    public stop = () => {
        this.stopped = true;
        if(this.stage){
            this.stage.clear();
        }
    };

}

export const PrimeColoring = ContentDatabase.add<PostType.experiment>({
    id: 'prime-coloring',
    tags: ['math'],
    title: 'Prime Coloring',
    timestamp: new Date(2019, 3, 21),
    type: PostType.experiment,
},
    new PrimeColoringContent()
);