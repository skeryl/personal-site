import {Color, Rectangle, ShapeProperties} from "grraf";
import {Vertex} from "./Vertex";

export const plum = new Color(101,2,92);

function dotProduct(a: number[], b: number[]): number {
    return a.reduce((result: number, aValue: number, aIndex: number) => {
        return result + (aValue * b[aIndex]);
    }, 0);
}

export class VisibilityMatrix {

    public static identity(m: number): VisibilityMatrix {
        const values = [];
        for(let i = 0; i < m; i++){
            if(!values[i]){
                values[i] = [];
            }
            for(let j = 0; j < m; j++){
                if(i === j){
                    values[i][j] = 1;
                } else {
                    values[i][j] = 0;
                }
            }
        }
        return new VisibilityMatrix(values);
    }

    private size = 0;
    private idToIndex: { [shapeId: number]: number } = {};
    private readonly vals: number[][];

    constructor(vals: number[][] = []) {
        this.vals = vals;
    }

    public addVertex(vertex: Vertex) {
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

    get values(): number[][] {
        return this.vals;
    }

    public numRows = () => {
        return this.vals.length;
    };

    public numCols = () => {
        return this.vals.length ? this.vals[0].length : 0;
    };

    public getColumn(j: number) {
        return this.vals.reduce((resultColumn: number[], currentRow: number[]) => {
            resultColumn.push(currentRow[j]);
            return resultColumn;
        }, []);
    }

    public multiply(other: VisibilityMatrix): VisibilityMatrix {

        // rows must equal others' columns
        if(other.numRows() !== this.numCols()){
            throw new Error('Matrix multiplication not possible (size incompatibility)');
        }

        let result: number[][] = [];
        for (let i = 0; i < this.numRows(); i++) {
            if(!result[i]){
                result[i] = [];
            }
            for (let j = 0; j < other.numCols(); j++) {
                result[i][j] = dotProduct(this.vals[i], other.getColumn(j));
            }
        }
        return new VisibilityMatrix(result);
    }

    public add(other: VisibilityMatrix): VisibilityMatrix {
        const values = [];
        for(let i = 0; i < this.numRows(); i++){
            if(!values[i]){
                values[i] = [];
            }
            for(let j = 0; j < this.numCols(); j++){
                values[i][j] = Math.min(1, this.values[i][j] + other.values[i][j]);
            }
        }
        return new VisibilityMatrix(values);
    }
}

export class MatrixShape extends Rectangle {

    private visibilityMatrix = new VisibilityMatrix();

    public matrix = () => this.visibilityMatrix;

    public setMatrix = (matrix: VisibilityMatrix) => {
        this.visibilityMatrix = matrix;
    };

    public add(vertex: Vertex) {
        this.visibilityMatrix.addVertex(vertex);
    }

    public toggleConnection(a: Vertex, b: Vertex): boolean {
        return this.visibilityMatrix.toggleConnection(a, b);
    }

    get values(): number[][] {
        return this.visibilityMatrix.values;
    }

    public numRows = () => {
        return this.visibilityMatrix.numRows();
    };

    public numCols = () => {
        return this.visibilityMatrix.numCols();
    };

    drawShape(): void {
        const lineWidth = 2;
        this.context.lineWidth = lineWidth;
        this.context.strokeStyle = plum.fillStyle(this.context);

        const width = (this.width / this.values.length) - (lineWidth * 2);
        const height = (this.height / this.values.length) - (lineWidth * 2);

        this.values.forEach((row, ix) => {
            let y = (ix * height);
            row.forEach((value, ix) => {
                let x = (ix * width);

                this.context.fillStyle = (value ? Color.black : Color.white).fillStyle(this.context);
                this.context.beginPath();
                this.context.rect(this.x + x + lineWidth, this.y + y + lineWidth, width, height);
                this.context.closePath();
                this.context.stroke();
                this.context.fill();
            });
        });
    }

    public getColumn(j: number) {
        this.visibilityMatrix.getColumn(j);
    }
}