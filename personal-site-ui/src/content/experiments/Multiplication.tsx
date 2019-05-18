import * as React from "react";
import {ContentDatabase} from "../index";
import {PostType, StageContent} from "../../../../personal-site-model/models";
import {Color, DirectionalMagnitude, MouseInfo, Stage} from "grraf";
import {Edge} from "../shapes/Edge";
import {Vertex, VERTEX_RADIUS} from "../shapes/Vertex";
import {MatrixShape, plum} from "../shapes/Matrix";

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

async function waitFor(ms: number) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export class MultiplicationContent implements StageContent {

    private vertices: Vertex[] = [];
    private edges: Edge[] = [];
    private stage: Stage | undefined;

    private selectedSource: Vertex | undefined;

    private adjacency: MatrixShape | undefined;

    start = (stage: Stage) => {
        this.stage = stage;
        const size = stage.getSize();

        const x = size.width / 2;
        const y = size.height / 2;

        const width = Math.min(size.height, size.width) * 0.65;

        this.adjacency = stage.createShape(MatrixShape)
            .setWidth(width).setHeight(width)
            .setPosition({ x: 10, y: y - (width/4) - 20 })
            .setStrokeWidth(2)
            .setStrokeStyle(plum) as MatrixShape;

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
        const vertex = stage.createShape(Vertex, { position, fill: this.nextColor() })
            .setRadius(VERTEX_RADIUS)
            .setLabel(this.nextLetter()) as Vertex;
        if(this.adjacency){
            this.adjacency.add(vertex);
        }
        this.vertices.push(vertex);
    }

    private createOrDestroyEdge(wasTurnedOn: boolean, stage: Stage, vertexA: Vertex, vertexB: Vertex) {
        if (wasTurnedOn) {
            this.edges.push(stage.createShape(Edge).addVertices(vertexA, vertexB));
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
        tags: ['software', 'research'],
        title: 'Multiplication',
        timestamp: new Date(2019, 2, 2),
        type: PostType.experiment,
    },
    new MultiplicationContent(),
);


interface Node {
    dependsOn: Node;
}