import * as React from "react";
import {ContentDatabase, StageContent} from "../index";
import {PostType} from "../../../../personal-site-model/models";
import {Circle, Color, DirectionalMagnitude, FillStyle, MouseInfo, Rectangle, Shape, Stage, Text} from "grraf";

const clear = new Color(255,255,255, 0.0);
const white = new Color(255,255,255);
const black = new Color(0,0,0);
const plum = new Color(101,2,92);

let animate = true;

const colors = [
    new Color(255, 125, 42),
    new Color(155, 175, 42),
    new Color(255, 42, 255),
    new Color(15, 200, 255),
    new Color(15, 15, 200),
    new Color(200, 20, 88),
    new Color(150, 20, 190),
    new Color(175, 0, 42),
];

const VERTEX_RADIUS = 15;

class Vertex extends Shape {

    private circle: Circle;
    private text: Text;
    public radius: number = 0;

    constructor(stage: Stage, id: number, context: CanvasRenderingContext2D, x: number, y: number, color: FillStyle, layer: number = 0) {
        super(stage, id, context, x, y, color, layer);
        this.circle = stage.createShape(Circle, x, y, color as Color, layer);
        this.text = stage.createShape(Text, x, y, white, layer + 1).setFontSize(20);
    }

    setRadius(radius: number): this {
        this.circle.setRadius(radius);
        this.radius = radius;
        return this;
    }

    setLabel(str: string): this {
        const size = this.context.measureText(str);
        this.text.setText(str);
        this.text.setPosition({ x: this.x - (size.width/2), y: this.y + 2 });
        return this;
    }

    getLabel(): string {
        return this.text.text;
    }

    select(){
        this.circle.setStrokeWidth(2).setStrokeColor(black);
    }

    deselect(){
        this.circle.setStrokeWidth(2).setStrokeColor(clear);
    }

    withinBounds(position: DirectionalMagnitude): boolean {
        return this.circle.withinBounds(position);
    }
}

class Matrix extends Rectangle {

    // only need to track size since the matrix will always be square
    private size = 0;

    private idToIndex: {[shapeId: number]: number} = {};

    private readonly vals: number[][] = [];

    public add(vertex: Vertex){
        this.idToIndex[vertex.id] = this.size;
        this.size++;

        // add new column to all existing rows
        this.vals.forEach(values => {
            values.push(0);
        });

        // create a new row
        this.vals.push(new Array(this.size).fill(undefined).map(() => 0));
    }

    public toggleConnection(a: Vertex, b: Vertex): boolean {
        const ixA = this.idToIndex[a.id];
        const ixB = this.idToIndex[b.id];
        const existingValue = this.vals[ixA][ixB];
        const result = existingValue ? 0 : 1;
        this.vals[ixA][ixB] = result;
        return Boolean(result);
    }

    get values(): number[][]{
        return this.vals;
    }

    drawShape(): void {
        const lineWidth = 2;
        this.context.lineWidth = lineWidth;
        this.context.strokeStyle = plum.fillStyle(this.context);

        const width = (this.width() / this.vals.length) - (lineWidth*2);
        const height = (this.height() / this.vals.length)  - (lineWidth*2);

        this.vals.forEach((row, ix) => {
            let y = (ix*height);
            row.forEach((value, ix) => {
                let x = (ix*width);

                this.context.fillStyle = (value ? black : white).fillStyle(this.context);
                this.context.beginPath();
                this.context.rect(this.x + x + lineWidth, this.y + y + lineWidth, width, height);
                this.context.closePath();
                this.context.stroke();
                this.context.fill();
            });
        });
    }
}

async function waitFor(ms: number) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export class Edge extends Shape {

    public a: Vertex | undefined;
    public b: Vertex | undefined;

    addVertices(a: Vertex, b: Vertex): this {
        this.a = a;
        this.b = b;
        return this;
    }

    drawShape(): void {
        const a = this.a;
        const b = this.b;
        if(a && b){
            this.context.beginPath();
            const posA = a.position;
            const posB = b.position;

            const deltaX = posA.x - posB.x;
            const deltaY = posA.y - posB.y;

            const angle = Math.atan(deltaY / deltaX);

            const mX = Math.cos(angle)*VERTEX_RADIUS;
            const mY = Math.sin(angle)*VERTEX_RADIUS;

            const sign = Math.sign(posB.x - posA.x);

            const startX = posA.x - (mX * -1* sign);
            const startY = posA.y - (mY * -1 * sign);

            const endX = posB.x - (mX * sign);
            const endY = posB.y - (mY * sign);

            this.context.moveTo(startX, startY);

            this.context.lineTo(endX, endY);

            const pointerAngle1 = (angle - (Math.PI/8));
            const pointerAngle2 = (angle + (Math.PI/8));

            this.context.lineTo(endX - (sign*Math.cos(pointerAngle1)*10), endY - (sign*Math.sin(pointerAngle1)*10));
            this.context.lineTo(endX - (sign*Math.cos(pointerAngle2)*10), endY - (sign*Math.sin(pointerAngle2)*10));

            this.context.lineTo(endX , endY);
            this.context.closePath();
            this.context.stroke();
        }
    }
}

export class MultiplicationContent implements StageContent {

    private vertices: Vertex[] = [];
    private edges: Edge[] = [];
    private stage: Stage | undefined;

    private selectedSource: Vertex | undefined;

    private adjacency: Matrix | undefined;

    start = (stage: Stage) => {
        this.stage = stage;
        const size = stage.getSize();

        const x = size.width / 2;
        const y = size.height / 2;

        const width = Math.min(size.height, size.width) * 0.65;

        this.adjacency = stage.createShape(Matrix)
            .setWidth(width).setHeight(width)
            .setPosition({ x: 10, y: y - (width/4) - 20 })
            .setStrokeWidth(2)
            .setStrokeColor(plum) as Matrix;

        stage.onMouseClick(this.onClick.bind(this));
        stage.draw();
        window.addEventListener('keypress', (e) => {
            if(e.key === 'Enter'){
                this.startTightlyCoupledAnimation(stage);
            }
        });
    };

    stop = () => {
        if(this.stage){
            this.stage.clear();
            this.stage = undefined;
        }
        this.vertices = [];
    };

    private onClick = (mouse: MouseInfo) => {
        const stage = this.stage;
        const adjacency = this.adjacency;
        if(stage && adjacency){
            const position = mouse.position();
            const clickedVertex: Vertex | undefined = this.findVertex(position);
            if(clickedVertex){
                if(this.selectedSource){
                    this.connect(this.selectedSource, clickedVertex);
                    this.selectedSource.deselect();
                    this.selectedSource = undefined;
                } else {
                    clickedVertex.select();
                    this.selectedSource = clickedVertex;
                }
            } else {
                this.addVertex(stage, position);
            }
            stage.draw();
        }
    };

    private connect(vertexA: Vertex, vertexB: Vertex) {
        if(this.stage && this.adjacency){
            const wasTurnedOn = this.adjacency.toggleConnection(vertexA, vertexB);
            this.createOrDestroyEdge(wasTurnedOn, this.stage, vertexA, vertexB);
        }
    }

    private addVertex(stage: Stage, position: DirectionalMagnitude) {
        const vertex = stage.createShape(Vertex, position.x, position.y, this.nextColor())
            .setRadius(VERTEX_RADIUS)
            .setLabel(this.nextLetter()) as Vertex;
        if(this.adjacency){
            this.adjacency.add(vertex);
        }
        this.vertices.push(vertex);
    }

    private createOrDestroyEdge(wasTurnedOn: boolean, stage: Stage, vertexA: Vertex, vertexB: Vertex) {
        if (wasTurnedOn) {
            this.edges.push(stage.createShape(Edge, 0, 0, new Color(), -1).addVertices(vertexA, vertexB));
        } else {
            const foundIndex = this.edges.findIndex(edge => edge.a === vertexA && edge.b === vertexB);
            if (foundIndex >= 0) {
                stage.removeShape(this.edges[foundIndex]);
                this.edges.splice(foundIndex, 1);
            }
        }
    }

    private findVertex = (position: DirectionalMagnitude): Vertex | undefined => {
        return this.vertices.find(vertex => vertex.withinBounds(position));
    };

    private nextColor = (): Color => {
        return colors[this.vertices.length % colors.length];
    };

    private nextLetter(): string {
        return String.fromCharCode(97 + this.vertices.length);
    }

    private startTightlyCoupledAnimation = async (stage: Stage) => {
        const size = stage.getSize();

        const startingLayer = 3;
        const layers = 5;
        const growthPerNode = 5;

        const spacePerLayer = (size.width / layers);

        let shapesThisLayer = 0;
        let x = VERTEX_RADIUS * 1.5;
        let y = 0;

        for(let layer = 0; layer < layers; layer++){
            shapesThisLayer = startingLayer + (growthPerNode*layer);
            x = (VERTEX_RADIUS*1.5) + (spacePerLayer*layer);

            for(let shape = 0; shape < shapesThisLayer; shape++){
                y = (shape * VERTEX_RADIUS * 3) + (2 * VERTEX_RADIUS);
                await waitFor(10);
                this.addVertex(stage, { x, y });
                stage.draw();
            }

        }

        for(let vi = 0; vi < this.vertices.length; vi++){
            for(let vj = this.vertices.length - 1; vj >= 0; vj--){
                if(vi !== vj && (Math.random() > 0.9)){
                    this.connect(this.vertices[vi], this.vertices[vj]);
                    await waitFor(5);
                    stage.draw();
                }
            }
        }
    };
}

export const Multiplication = ContentDatabase.add<PostType.experiment>({
        id: 'multiplication',
        tags: [],
        title: 'Multiplication',
        timestamp: new Date(2019, 2, 2),
        type: PostType.experiment,
    },
    new MultiplicationContent(),
);


interface Node {
    dependsOn: Node;
}