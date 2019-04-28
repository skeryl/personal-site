import * as React from "react";
import {ContentDatabase, StageContent} from "../index";
import {PostType} from "../../../../personal-site-model/models";
import {Color, Rectangle, Stage, Animation, DirectionalMagnitude, NearbyShape, Circle} from "grraf";

const rowSize = 20;

const magnitude = 2;

const numColors = {
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

const feedingCloneCost = 5000;

function randomDirection(){
    return {
        x: Math.sign(Math.random() - 0.5),
        y: Math.sign(Math.random() - 0.5),
    };
}

class Wanderer {

    private previous: DirectionalMagnitude;

    private wandering = false;
    public readonly circle: Circle;
    public food: number = 2000;

    public direction: DirectionalMagnitude = randomDirection();

    private cloneCount = 0;

    constructor(
        private readonly stage: Stage,
        private readonly bounds: DirectionalMagnitude,
        public currentLocation: DirectionalMagnitude,
        private onLocationChange: (self: Wanderer) => void,
        public generation: number = 0,

    ){
        this.previous = currentLocation;
        this.circle = this.stage.createShape(Circle, { position: currentLocation, fill: getColor(generation), radius: 10, layer: 1 });
        this.wandering = true;
        this.startWandering();
    }

    startWandering = () => {
        if(this.wandering){
            const updatedLocation = {
                x: Math.max(
                    0,
                    Math.min(
                        this.bounds.x,
                        this.currentLocation.x + ((Math.random()*magnitude*this.direction.x))
                    )
                ),
                y: Math.max(
                    0,
                    Math.min(
                        this.bounds.y,
                        this.currentLocation.y + ((Math.random()*magnitude*this.direction.y))
                    )
                )
            };

            this.previous = this.currentLocation;
            this.currentLocation = updatedLocation;
            this.circle.setPosition(this.currentLocation);
            this.onLocationChange(this);

            if(this.currentLocation.x >= this.bounds.x || this.currentLocation.x <= 0){
                this.direction.x = this.direction.x*-1;
            }
            if(this.currentLocation.y >= this.bounds.y || this.currentLocation.y <= 0){
                this.direction.y = this.direction.y*-1;
            }
            this.food--;
            if(this.food <= 0){
                this.die();
            }
            requestAnimationFrame(this.startWandering);
        }
    };

    eat = (n: number) => {
        this.direction = randomDirection();
        this.food += n;
        if(this.food > feedingCloneCost){
            this.clone();
        }
    };

    clone = (): Wanderer => {
        this.cloneCount++;
        this.food -= feedingCloneCost;
        if(this.cloneCount > 2){
            this.die();
        }
        return new Wanderer(this.stage, this.bounds, this.currentLocation, this.onLocationChange, this.generation + 1);
    };

    die = () => {
        this.wandering = false;
        this.stage.removeShape(this.circle);
    };

    stop(){
        this.wandering = false;
    }

}

export class AntFarmContent implements StageContent {

    private squares: Rectangle[][] = [];
    private stage: Stage;
    private isPlaying: boolean = false;

    private ongoingAnimations: Animation[] = [];

    start = (stage: Stage) => {
        this.stage = stage;

        const size = stage.getSize();

        const outerSquareSize = Math.floor(size.width / rowSize);
        const innerSquareSize = outerSquareSize*0.6;

        const total = Math.floor(size.height / outerSquareSize) * rowSize;

        const extra = (size.width - (outerSquareSize*rowSize)) / 2;

        const spacing = (outerSquareSize - innerSquareSize)/2;

        for(let n = 0; n < total; n++){
            const row = Math.floor(n / rowSize);
            if(!this.squares[row]){
                this.squares[row] = [];
            }
            const col = n % rowSize;

            this.squares[row][col] = stage.createShape(Rectangle, {
                position: {
                    x: (col * outerSquareSize) + (spacing) + extra,
                    y: (row * outerSquareSize) + (spacing)
                },
                fill: Color.white,
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
                wanderer.eat(color.red() + color.green() + color.blue());
                nearestRectangle.setFill(Color.white);
            }
        };

        new Wanderer(
            this.stage,
            { x: size.width, y: size.height },
            { x: size.width / 2, y: size.width / 2},
            onLocationUpdate
        );

        this.startDrawLoop();
    };

    startDrawLoop = () => {
        if(this.isPlaying){
            this.stage.draw();
            requestAnimationFrame(this.startDrawLoop);
        }
    };

    get numRows(): number {
        return this.squares.length;
    }

    get numCols(): number {
        return rowSize;
    }

    regenerate = () => {
        if(this.isPlaying){
            const randomRow = Math.round(Math.random() * (this.numRows - 1));
            const randomCol = Math.round(Math.random() * (this.numCols - 1));

            const row = this.squares[randomRow];
            if(!row){
                console.log(randomRow);
            } else {
                const randomSquare = row[randomCol];

                if(!randomSquare){
                    console.log(randomRow, randomCol);
                } else {
                    const animation = this.stage.animate(randomSquare).transition("fill", {
                        0: randomSquare.fill,
                        1500: new Color(
                            (randomRow / this.numRows)*255,
                            ((randomCol / this.numCols)*120),
                            (((randomRow + randomCol) / (this.numRows + this.numCols))*255),
                            0.1
                        ),
                    }).create();

                    this.ongoingAnimations.push(animation);
                    animation.then(this.remove(animation));
                    animation.start();
                }

            }

            window.setTimeout(this.regenerate, 200);
        }
    };

    private remove(animation) {
        return () => {
            const ix = this.ongoingAnimations.findIndex(a => a === animation);
            if (ix >= 0) {
                this.ongoingAnimations.splice(ix, 1);
            }
        };
    }

    stop = () => {
        this.isPlaying = false;
        this.ongoingAnimations.forEach(animation => {
            animation.cancel();
        });
        this.ongoingAnimations = [];
        if(this.stage){
            this.stage.clear();
            this.stage = undefined;
        }
    };
}

export const Antfarm = ContentDatabase.add<PostType.experiment>({
        id: 'antfarm',
        tags: ['fun'],
        title: 'Ant Farm',
        timestamp: new Date(2019, 3, 27),
        type: PostType.experiment,
    },
    new AntFarmContent(),
);