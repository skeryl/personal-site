import {Shape} from "grraf";
import {Vertex, VERTEX_RADIUS} from "./Vertex";

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
        if (a && b) {
            this.context.beginPath();
            const posA = a.position;
            const posB = b.position;

            const deltaX = posA.x - posB.x;
            const deltaY = posA.y - posB.y;

            const angle = Math.atan(deltaY / deltaX);

            const mX = Math.cos(angle) * VERTEX_RADIUS;
            const mY = Math.sin(angle) * VERTEX_RADIUS;

            const sign = Math.sign(posB.x - posA.x);

            const startX = posA.x - (mX * -1 * sign);
            const startY = posA.y - (mY * -1 * sign);

            const endX = posB.x - (mX * sign);
            const endY = posB.y - (mY * sign);

            this.context.moveTo(startX, startY);

            this.context.lineTo(endX, endY);

            const pointerAngle1 = (angle - (Math.PI / 8));
            const pointerAngle2 = (angle + (Math.PI / 8));

            this.context.lineTo(endX - (sign * Math.cos(pointerAngle1) * 10), endY - (sign * Math.sin(pointerAngle1) * 10));
            this.context.lineTo(endX - (sign * Math.cos(pointerAngle2) * 10), endY - (sign * Math.sin(pointerAngle2) * 10));

            this.context.lineTo(endX, endY);
            this.context.closePath();
            this.context.stroke();
        }
    }
}