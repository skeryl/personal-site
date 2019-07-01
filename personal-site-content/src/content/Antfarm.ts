import {Post, PostType, StageContent} from "personal-site-model";
import {Animation, Circle, Color, DirectionalMagnitude, FillStyle, Rectangle, Stage} from "grraf";

const numColors: {[n: number]: Color} = {
    [0]: new Color(255, 237, 168),
    [1]: new Color(0, 147, 59),
    [2]: new Color(193, 61, 0),
    [3]: new Color(193, 0, 164),
    [4]: new Color(158, 57, 140),
    [5]: new Color(57, 157, 14),
    [6]: new Color(120, 70, 68),
    [7]: new Color(100, 50, 200),
};

function getColor(seed: number): Color {
    return seed in numColors ? numColors[seed] : new Color((Math.random()*125) + 130, (Math.random()*55)+85, (Math.random()*125)+130, 1);
}

const birthCost = 5000;

function getSpecificDirection() {
    const sign = Math.sign(Math.random() - 0.5);
    return Math.random() < 0.1 ? 0 : sign;
}

function randomDirection(){
    const x = getSpecificDirection();
    const y = getSpecificDirection();
    return {
        x,
        // if both x and y are zero our wanderer won't move. give it a tiny nudge
        y: (x | y) === 0 ? Math.sign(Math.random() - 0.5) : y,
    };
}

class Wanderer {

    private isWandering = false;
    private cloneCount = 0;
    public food: number = 2000;

    public readonly circle: Circle;
    private readonly stepSize: number;

    public direction: DirectionalMagnitude = randomDirection();

    constructor(
        private readonly stage: Stage,
        private readonly bounds: DirectionalMagnitude,
        public currentLocation: DirectionalMagnitude,
        private onLocationChange: (self: Wanderer) => void,
        public startingRadius: number,
        public generation: number = 0,

    ){
        this.circle = this.stage.createShape(Circle, { position: currentLocation, fill: getColor(generation), radius: this.startingRadius, layer: 1 });
        this.stepSize = Math.max(3, this.startingRadius / 10);
        this.isWandering = true;
        this.startWandering();
    }

    private startWandering = () => {
        if(this.isWandering){
            this.currentLocation = {
                x: Math.max(
                    0,
                    Math.min(
                        this.bounds.x,
                        this.currentLocation.x + ((Math.random() * this.stepSize * this.direction.x))
                    )
                ),
                y: Math.max(
                    0,
                    Math.min(
                        this.bounds.y,
                        this.currentLocation.y + ((Math.random() * this.stepSize * this.direction.y))
                    )
                )
            };

            this.circle.setPosition(this.currentLocation);
            this.onLocationChange(this);

            if(this.currentLocation.x >= this.bounds.x || (this.currentLocation.x - this.startingRadius) <= 0){
                this.direction.x = getSpecificDirection();
            }

            if(this.currentLocation.y >= this.bounds.y || (this.currentLocation.y - this.startingRadius) <= 0){
                this.direction.y = getSpecificDirection();
            }

            this.digest();

            requestAnimationFrame(this.startWandering);
        }
    };

    digest = () => {
        this.food--;
        if (this.food <= 0) {
            this.die();
        } else {
            const expectedRadius = this.food > (birthCost/2) ? (this.startingRadius*1.5) : this.startingRadius;
            if(expectedRadius !== this.circle.radius){
                const animation = this.stage.animate(this.circle)
                    .transition("radius", { 0: this.circle.radius, 100: expectedRadius })
                    .create({ manualDraw: true });
                animation.start();
            }
        }
    };

    eat = (n: number) => {
        this.direction = randomDirection();
        this.food += n;
        if(this.food > birthCost){
            this.giveBirth();
        }
    };

    giveBirth = (): Wanderer => {
        this.cloneCount++;
        this.food -= birthCost;
        if(this.cloneCount > 2){
            this.die();
        }
        return new Wanderer(this.stage, this.bounds, this.currentLocation, this.onLocationChange, this.startingRadius, this.generation + 1);
    };

    die = () => {
        this.isWandering = false;
        this.stage.removeShape(this.circle);
    };
}

class AntFarmContent implements StageContent {

    private squares: Rectangle[][] = [];
    private stage: Stage | undefined;
    private isPlaying: boolean = false;

    private readonly ongoingAnimations = new Map<number, Animation>();

    private rowSize: number = 0;

    start = (stage: Stage) => {
        this.stage = stage;

        const size = stage.getSize();

        const outerSquareSize = Math.floor(Math.max(size.width, size.height) / 20);
        const innerSquareSize = outerSquareSize*0.6;

        this.rowSize = Math.floor(size.width / outerSquareSize);

        const total = Math.floor(size.height / outerSquareSize) * this.rowSize;

        const extra = (size.width - (outerSquareSize*this.rowSize)) / 2;

        const spacing = (outerSquareSize - innerSquareSize)/2;

        for(let n = 0; n < total; n++){
            const row = Math.floor(n / this.rowSize);
            if(!this.squares[row]){
                this.squares[row] = [];
            }
            const col = n % this.rowSize;

            this.squares[row][col] = stage.createShape(Rectangle, {
                position: {
                    x: (col * outerSquareSize) + (spacing) + extra,
                    y: (row * outerSquareSize) + (spacing)
                },
                fill: this.colorByPosition(row, col),
                layer: 0
            })
                .setWidth(innerSquareSize)
                .setHeight(innerSquareSize);
        }

        this.isPlaying = true;
        this.regenerate();

        const onLocationUpdate = (wanderer: Wanderer) => {
            const row = Math.max(0, Math.min(this.numRows - 1, Math.floor((wanderer.currentLocation.y - (spacing)) / outerSquareSize)));
            const col = Math.max(0, Math.min(this.numCols - 1, Math.floor((wanderer.currentLocation.x - (spacing)) / outerSquareSize)));

            const rowSquares = this.squares[row];
            if(!rowSquares){
                return;
            }

            const nearestRectangle = rowSquares[col];

            if(!nearestRectangle || !nearestRectangle.withinBounds(wanderer.currentLocation)){
                return;
            }

            const color = nearestRectangle.fill as Color;
            if(color !== Color.white){
                // to prevent massive spawns, destroy any fade-in that may be happening
                const animation = this.ongoingAnimations.get(nearestRectangle.id);
                if(animation){
                    animation.then(() => {
                        nearestRectangle.setFill(Color.white);
                    });
                    animation.cancel();
                }
                wanderer.eat(color.red() + color.green() + color.blue());
                nearestRectangle.setFill(Color.white);
            }
        };

        new Wanderer(
            this.stage,
            { x: size.width, y: size.height },
            { x: size.width / 2, y: size.height / 2},
            onLocationUpdate,
            innerSquareSize/3
        );

        this.startDrawLoop();
    };

    startDrawLoop = () => {
        if(this.isPlaying && this.stage){
            this.stage.draw();
            requestAnimationFrame(this.startDrawLoop);
        }
    };

    get numRows(): number {
        return this.squares.length;
    }

    get numCols(): number {
        return this.rowSize;
    }

    regenerate = () => {
        if(this.isPlaying && this.stage){
            const randomRow = Math.round(Math.random() * (this.numRows - 1));
            const randomCol = Math.round(Math.random() * (this.numCols - 1));

            const row = this.squares[randomRow];
            const randomSquare = row && row[randomCol];

            const color = this.colorByPosition(randomRow, randomCol);

            const setColor = (square: Rectangle, color: FillStyle) => {
                square.setFill(color);
            };
            setTimeout(setColor.bind(null, randomSquare, color), 1500);

            // Todo: fix this
            /*const animation = this.stage.animate(randomSquare).transition("fill", {
                0: randomSquare.fill,
                1500: this.colorByPosition(randomRow, randomCol),
            }).create({ manualDraw: true });*/

            //this.ongoingAnimations.set(randomSquare.id, animation);
            //animation.then(this.remove(randomSquare.id));
            //animation.start();
            window.setTimeout(this.regenerate, 750);
        }
    };

    private colorByPosition(row: number, col: number): Color {
        return new Color(
            (row / this.numRows) * 255,
            ((col / this.numCols) * 120),
            (((row + col) / (this.numRows + this.numCols)) * 255)
        );
    }

    private remove(id: number): () => void {
        return () => {
            this.ongoingAnimations.delete(id)
        };
    }

    stop = () => {
        this.isPlaying = false;
        this.ongoingAnimations.forEach((animation: Animation) => {
            animation.cancel();
        });
        this.ongoingAnimations.clear();
        if(this.stage){
            this.stage.clear();
            this.stage = undefined;
        }
    };
}

const post: Post = {
    summary: {
        id: 'antfarm',
        tags: ['fun'],
        title: 'Ant Farm',
        timestamp: new Date(2019, 3, 27),
        type: PostType.experiment,
    },
    content: () => new AntFarmContent(),
};

export default post;
