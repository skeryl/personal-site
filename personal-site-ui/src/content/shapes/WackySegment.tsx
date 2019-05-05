import {Color, DirectionalMagnitude, Shape, ShapeProperties, Stage} from "grraf";

interface WackySegmentProps extends ShapeProperties {
    a: DirectionalMagnitude;
    b: DirectionalMagnitude;
    cp1: DirectionalMagnitude;
    cp2: DirectionalMagnitude;
    pointRadius: number;
}

export class WackySegment extends Shape<WackySegmentProps> {

    get a(): DirectionalMagnitude {
        return this.properties.a;
    }

    get b(): DirectionalMagnitude {
        return this.properties.b;
    }

    get cp1(): DirectionalMagnitude {
        return this.properties.cp1;
    }

    get cp2(): DirectionalMagnitude {
        return this.properties.cp2;
    }

    get pointRadius(): number {
        return this.properties.pointRadius;
    }

    set a(value: DirectionalMagnitude) {
        this.properties.a = value;
    }

    set b(value: DirectionalMagnitude) {
        this.properties.b = value;
    }

    set cp1(value: DirectionalMagnitude) {
        this.properties.cp1 = value;
    }

    set cp2(value: DirectionalMagnitude) {
        this.properties.cp2 = value;
    }

    set pointRadius(value: number) {
        this.properties.pointRadius = value;
    }

    constructor(stage: Stage, id: number, initialProperties: Partial<WackySegmentProps>) {
        super(stage, id, initialProperties);
        this.strokeStyle = new Color(255, 0, 50, 0.01);
        this.strokeWidth = 1;
    }

    protected isPathLike(): boolean {
        return true;
    }

    drawShape(): void {
        const {a, b, cp1, cp2} = this.properties;
        this.context.moveTo(a.x, a.y);
        this.context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, b.x, b.y);
        this.context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, a.x, a.y);
        this.context.closePath();
    }
}