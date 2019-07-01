import {Post, PostType, StageContent} from "personal-site-model";
import {Circle, Color, Environment, EnvironmentalProperties, Simulation, Stage, subtract} from "grraf";

const blue = new Color(37, 150, 230);
const bg = new Color(244, 215, 220);
const orange = new Color(230, 150, 37);

class OrbitSimulation implements StageContent {

    private readonly envProperties: Partial<EnvironmentalProperties> = {};

    private simulation: Simulation | undefined;
    private stage: Stage | undefined;
    private intervalId: number | undefined;

    start = (stage: Stage) => {
        this.stage = stage;
        const environment = new Environment(this.stage, this.envProperties);
        const simulation = new Simulation(environment);

        const size = stage.getSize();

        const center = environment.createParticle({
                position: {
                    x: Math.ceil(size.width / 2),
                    y: Math.ceil(size.height / 2),
                },
                mass: 6 * (10 ** 23)
            },
            stage.createShape(Circle).setRadius(Math.ceil(size.width / 50)).setColor(orange)
        );

        const particleRadius = Math.ceil(size.width / 350);

        const particle = environment.createParticle({
                position: subtract(center.position, {x: 0, y: 150}),
                initialVelocity: {
                    x: 5, y: 0
                }
            }, this.createParticle(stage, particleRadius)
        );

        const pointerRadius = particleRadius * 2;

        const pointer = this.stage.createShape(Circle)
            .setRadius(pointerRadius)
            .setColor(new Color(255, 214, 98, 0.4)) as Circle;

        this.stage.onMouseUpdate(mouse => {
            pointer.setPosition(mouse.position());

            const centerCircle = center.shape as Circle;

            if (centerCircle.withinBounds(mouse.position())) {
                const start = subtract(centerCircle.position, {x: centerCircle.radius, y: centerCircle.radius});
                centerCircle.setColor(new Color(240, 47, 47)
                );
            } else {
                centerCircle.setColor(orange);
            }
        });

        this.intervalId = window.setInterval(() => {
                const particleGhost = this.createParticle(stage, particleRadius)
                    .setPosition(particle.position);
                const animation = stage.animate(particleGhost)
                    .transition("fill", {0: blue, 3000: bg})
                    .create();
                animation.then(() => {
                    stage.removeShape(particleGhost);
                });
                animation.start();
            },
            1000
        );

        this.simulation = simulation;
        this.simulation.setSpeed(20);
        this.simulation.start();
    };

    private createParticle(stage: Stage, particleRadius: number): Circle {
        return stage.createShape(Circle)
            .setRadius(particleRadius)
            .setColor(blue) as Circle;
    }

    stop = () => {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.stage) {
            this.stage.clear();
            this.stage = undefined;
        }
    };
}

const post: Post = {
    summary: {
        id: 'orbit',
        tags: ['fun', 'canvas', 'grraf', 'interactive'],
        title: 'Orbit',
        timestamp: new Date(2019, 1, 10),
        type: PostType.experiment,
    },
    content: () => new OrbitSimulation(),
};

export default post;