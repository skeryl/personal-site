import {Circle, Color, DirectionalMagnitude, Shape, ShapeProperties, Stage, Text} from "grraf";

export const VERTEX_RADIUS = 15;

interface VertexProps extends ShapeProperties {
    radius: number;
}

export class Vertex extends Shape<VertexProps> {

    private circle: Circle;
    private text: Text;
    public radius: number = 0;

    constructor(stage: Stage, id: number, initialProperties: Partial<VertexProps>,) {
        super(stage, id, initialProperties);
        this.circle = stage.createShape(Circle, {
            position: initialProperties.position,
            fill: initialProperties.fill,
            layer: initialProperties.layer
        });
        this.text = stage.createShape(Text, {
            position: initialProperties.position,
            fill: Color.white,
            layer: initialProperties.layer + 1
        }).setFontSize(20);
        this.radius = initialProperties.radius;
    }

    setRadius(radius: number): this {
        this.circle.setRadius(radius);
        this.radius = radius;
        return this;
    }

    setLabel(str: string): this {
        const size = this.context.measureText(str);
        this.text.setText(str);
        this.text.setPosition({x: this.x - (size.width / 2), y: this.y + 2});
        return this;
    }

    getLabel(): string {
        return this.text.text;
    }

    select() {
        this.circle.setStrokeWidth(2).setStrokeStyle(Color.black);
    }

    deselect() {
        this.circle.setStrokeWidth(2).setStrokeStyle(Color.transparent);
    }

    withinBounds(position: DirectionalMagnitude): boolean {
        return this.circle.withinBounds(position);
    }
}