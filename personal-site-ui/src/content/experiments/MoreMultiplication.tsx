import * as React from "react";
import {ContentDatabase, StageContent} from "../index";
import {PostType} from "../../../../personal-site-model/models";
import {Color, DirectionalMagnitude, MouseInfo, ShapeProperties, Stage, subtract} from "grraf";
import {Vertex} from "../shapes/Vertex";
import {Edge} from "../shapes/Edge";
import {MatrixShape, plum, VisibilityMatrix} from "../shapes/Matrix";

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

export class MoreMultiplicationContent implements StageContent {

    private vertices: Vertex[] = [];
    private edges: Edge[] = [];
    private stage: Stage | undefined;

    private selectedSource: Vertex | undefined;

    private matrix: MatrixShape | undefined;

    start = (stage: Stage) => {
        this.stage = stage;
        const size = stage.getSize();

        const x = size.width / 2;
        const y = size.height / 2;

        const width = Math.min(size.height, size.width) * 0.65;

        this.matrix = stage.createShape(MatrixShape)
            .setWidth(width).setHeight(width)
            .setPosition({ x: 10, y: y - (width/4) - 20 })
            .setStrokeWidth(2)
            .setStrokeStyle(plum) as MatrixShape;

        stage.onMouseClick(this.onClick.bind(this));
        stage.draw();
        window.addEventListener('keypress', (e) => {
            if(e.key === 'Enter'){
                this.multiply();
            }
            if(e.key === 't'){
                this.connectTightly();
            }
            if(e.key === 'l'){
                this.connectLoosely();
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
        const matrix = this.matrix;
        if(stage && matrix){
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
        if(this.stage && this.matrix){
            const wasTurnedOn = this.matrix.toggleConnection(vertexA, vertexB);
            this.createOrDestroyEdge(wasTurnedOn, this.stage, vertexA, vertexB);
        }
    }

    private addVertex(stage: Stage, position: DirectionalMagnitude) {
        const vertex = stage.createShape(Vertex, { position, fill: this.nextColor() })
            .setRadius(VERTEX_RADIUS)
            .setLabel(this.nextLetter()) as Vertex;
        if(this.matrix){
            this.matrix.add(vertex);
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

    private connectTightly = () => {
        this.connectNodes(0.4);
    };

    private connectLoosely = () => {
        this.connectNodes(0.9);
    };

    private connectNodes = (percent: number) => {
        for(let vi = 0; vi < this.vertices.length; vi++){
            for(let vj = this.vertices.length - 1; vj >= 0; vj--){
                if(vi !== vj && (Math.random() > percent)){
                    this.connect(this.vertices[vi], this.vertices[vj]);
                    this.stage.draw();
                }
            }
        }
    };

    private multiply = () => {
        const size = this.stage.getSize();
        const width = Math.min(size.height, size.width) * 0.3;

        const matrices: VisibilityMatrix[] = this.vertices.reduce(
            (result: VisibilityMatrix[], _, index: number) => {
                const previous = result[index + 1]; // (skip the identity matrix)
                result.push(previous.multiply(previous));
                return result;
            },
            [VisibilityMatrix.identity(this.matrix.numRows()), this.matrix.matrix()]
        );

        const final = matrices.reduce((result: VisibilityMatrix, current: VisibilityMatrix) => {
            return result.add(current);
        });
        matrices.push(final);

        const matrixShapes = matrices.map((matrix: VisibilityMatrix, ix: number) => {
            const m = this.stage.createShape(MatrixShape)
                .setWidth(200).setHeight(200)
                .setPosition({ x: (size.width - 240), y: (ix * width) + 10 })
                .setStrokeWidth(1)
                .setStrokeStyle(plum) as MatrixShape;
            m.setMatrix(matrix);
            return m;
        });

        const animations = matrixShapes.map(shape => {
            return this.stage.animate(shape)
                .transition('position', {
                    0: shape.position,
                    2_000: shape.position,
                    25_000: subtract(shape.position, { x: 0, y: (matrixShapes.length * 200) + (size.height / 2) })
                })
                .create();
        });

        animations.forEach(animate => {
            animate.start();
        });

        this.stage.draw();
    };
}

export const MoreMultiplication = ContentDatabase.add<PostType.experiment>({
        id: 'more-multiplication',
        tags: ['software', 'research'],
        title: 'More Multiplication',
        timestamp: new Date(2019, 2, 3),
        type: PostType.experiment,
    },
    new MoreMultiplicationContent(),
);


interface Node {
    dependsOn: Node;
}