import {Post, PostType, StageContent} from "personal-site-model";
import {Circle, Color, DirectionalMagnitude, Stage, TimingFunction} from "grraf";
import {WackySegment, WackySegmentProps} from "personal-site-shapes";

const lightPink = new Color(255, 20, 150);

function getSecondLocation(point: DirectionalMagnitude, radius: number) {
    const now = new Date();
    const minutePart = Math.PI * 2 * (((now.getSeconds()*1000) + now.getMilliseconds()) / 60000) + (Math.PI/2);
    return {
        x: point.x - (Math.cos(minutePart)*radius),
        y: point.y - (Math.sin(minutePart)*radius),
    };
}

function getMinuteLocation(point: DirectionalMagnitude, radius: number) {
    const now = new Date();
    const secondPart = now.getSeconds();
    const minutePart = now.getMinutes() * 60;

    const percentOfMinutes = (Math.PI * 2 * (secondPart + minutePart) / (60*60)) + (Math.PI/2);

    return {
        x: point.x - (Math.cos(percentOfMinutes)*radius),
        y: point.y - (Math.sin(percentOfMinutes)*radius),
    };
}

function getHourLocation(point: DirectionalMagnitude, radius: number) {
    const now = new Date();
    const minutePart = now.getMinutes();
    const hourPart = now.getHours() * 60;

    const percentOfMinutes = (Math.PI * 4 * (minutePart + hourPart) / (60*24)) + (Math.PI/2);

    return {
        x: point.x - (Math.cos(percentOfMinutes)*radius),
        y: point.y - (Math.sin(percentOfMinutes)*radius),
    };
}

class MeanderingPath {

    public segment: WackySegment;

    private isMeandering = false;
    private circle: Circle;

    constructor(
        private readonly stage: Stage,
        private readonly bounds: DirectionalMagnitude,
        private a: DirectionalMagnitude,
        private b: DirectionalMagnitude,
        private time: number,
        private getLocation: (point: DirectionalMagnitude, radius: number) => DirectionalMagnitude,
        private radius: number,
        private opacity: number,
    ){
        this.isMeandering = true;

        const size = stage.getSize();

        const midpoint = {
            x: (size.width / 2),
            y: (size.height / 2),
        };

        const fill = Color.withOpacity(lightPink, this.opacity);

        this.segment = stage.createShape<WackySegment, WackySegmentProps>(WackySegment, {
            a,
            b,
            fill,
            cp1: midpoint,
            cp2: midpoint,
        }).setStrokeWidth(5);

        const circleRadius = Math.round(Math.pow(Math.min(size.width, size.height) / this.radius, 1.6) + 2);
        this.circle = stage.createShape(Circle, { position: midpoint, fill: fill, radius: circleRadius });

        // try to ensure ticking starts on a second mark
        const untilNextSecond = 1000 - new Date().getMilliseconds();
        setTimeout(this.startMeandering, untilNextSecond);
    }

    public startMeandering = () => {
        if(this.isMeandering){
            const time = this.time;
            const size = this.stage.getSize();

            const halfWidth = size.width / 2;
            const halfHeight = size.height / 2;

            const cp1 = this.getLocation({ x: halfWidth, y: halfHeight }, this.radius);
            const cp2 = {
                x: ((halfWidth - cp1.x)) + (halfWidth),
                y: ((halfHeight - cp1.y)) + (halfHeight),
            };

            const animation = this.stage.animate(this.segment)
                .transition("cp1", { 0: this.segment.cp1, [time]: cp1 }, TimingFunction.EaseInOutCubic)
                .transition("cp2", { 0: this.segment.cp2, [time]: cp2 }, TimingFunction.EaseInOutCubic)
                .create({ manualDraw: true });

            animation.then(() => {
                this.startMeandering();
            });

            this.stage.animate(this.circle)
                .transition('position', { 0: this.circle.position, [time]: cp1, }, TimingFunction.EaseInOutCubic)
                .create({ manualDraw: true }).start();

            animation.start();
        }
    };
}

class ChrysanthemumContent implements StageContent {

    private stage: Stage | undefined;
    private isPlaying: boolean = false;

    start = (stage: Stage) => {
        this.stage = stage;

        const size = stage.getSize();

        this.isPlaying = true;

        const bounds = { x: size.width, y: size.height };

        const halfWidth = size.width / 2;
        const halfHeight = size.height / 2;

        const radius = Math.min(halfHeight, halfWidth)*0.9;

        const secondHandSize = radius;
        const minuteHandSize = radius*0.8;
        const hourHandSize = radius*0.5;

        for(let i = 0; i < 30; i++){
            const angle = (Math.PI * 2 * (i / 60)) + (Math.PI / 2);
            new MeanderingPath(
                this.stage,
                bounds,
                { x: halfWidth + (Math.cos(angle)*(secondHandSize)), y: halfHeight - (Math.sin(angle)*((secondHandSize))) },
                { x: halfWidth - (Math.cos(angle)*(secondHandSize)), y: halfHeight + (Math.sin(angle)*((secondHandSize))) },
                1000,
                getSecondLocation,
                secondHandSize,
                0.035,
            );
        }

        for(let i = 0; i < 6; i++){
            const angle = (Math.PI * 2 * (i / 12)) + (Math.PI / 3);
            new MeanderingPath(
                this.stage,
                bounds,
                { x: halfWidth + (Math.cos(angle)*(minuteHandSize)), y: halfHeight - (Math.sin(angle)*((minuteHandSize))) },
                { x: halfWidth - (Math.cos(angle)*(minuteHandSize)), y: halfHeight + (Math.sin(angle)*((minuteHandSize))) },
                2_500,
                getMinuteLocation,
                minuteHandSize,
                0.1
            );
        }

        for(let i = 0; i < 6; i++){
            const angle = (Math.PI * 2 * (i / 12)) + (Math.PI / 3);
            new MeanderingPath(
                this.stage,
                bounds,
                { x: halfWidth + (Math.cos(angle)*(hourHandSize)), y: halfHeight - (Math.sin(angle)*((hourHandSize))) },
                { x: halfWidth - (Math.cos(angle)*(hourHandSize)), y: halfHeight + (Math.sin(angle)*((hourHandSize))) },
                5_000,
                getHourLocation,
                hourHandSize,
                0.3
            );
        }

        this.startDrawLoop();
    };

    startDrawLoop = () => {
        if(this.isPlaying && this.stage){
            this.stage.draw();
            requestAnimationFrame(this.startDrawLoop);
        }
    };

    stop = () => {
        this.isPlaying = false;
        const stage = this.stage;
        if(stage){
            stage.shapes.forEach(shape => stage.removeShape(shape));
            stage.clear();
            this.stage = undefined;
        }
    };
}

const post: Post = {
    summary: {
        id: 'chrysanthemum',
        tags: ['mothers-day', 'floral', 'time'],
        title: 'Chrysanthemum',
        timestamp: new Date(2019, 4, 5),
        type: PostType.experiment,
    },
    content: () => new ChrysanthemumContent()
};

export default post;
