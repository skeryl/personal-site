import {ExperimentContent3D, Post, PostType} from "personal-site-model";
import {BoxGeometry, Camera, DoubleSide, Mesh, MeshPhongMaterial, PointLight, Scene, TorusGeometry} from "three";

class CubePegTorusHoleContent implements ExperimentContent3D {

    private cube: Mesh | undefined;
    private donut: Mesh | undefined;
    private lights: PointLight[] = [];

    private scene: Scene | undefined;

    start = (scene: Scene, camera: Camera) => {
        this.scene = scene;
        const material = new MeshPhongMaterial(  { color: 0xce4a04, emissive: 0x6d5f58, side: DoubleSide, flatShading: true });

        this.setupLights(scene);

        this.cube = new Mesh(new BoxGeometry( 1, 1, 1 ), material);
        this.donut = new Mesh(new TorusGeometry(2, 0.5, 10, 20), material);

        scene.add(this.cube);
        scene.add(this.donut);

        camera.position.z = 5;

        window.addEventListener('mousemove', this.mouseMove);
        this.rotate();
    };

    stop = () => {
        window.removeEventListener('mousemove', this.mouseMove);
        const scene = this.scene;
        if(!scene){
            return;
        }
        if(this.cube){
            scene.remove(this.cube);
        }
        if(this.donut){
            scene.remove(this.donut);
        }
        this.cube = undefined;
        this.donut = undefined;
        this.lights.forEach(light => scene.remove(light));
    };

    private rotate = () => {
        if(this.cube && this.donut){
            this.cube.rotation.y += 0.005;
            this.donut.rotation.z += 0.005;
            requestAnimationFrame(this.rotate);
        }
    };

    private setupLights(scene: Scene) {
        this.lights = [
            new PointLight(0xffffff, 1, 0),
            new PointLight(0xffffff, 1, 0),
            new PointLight(0xffffff, 1, 0)
        ];

        this.lights[0].position.set(0, 200, 0);
        this.lights[1].position.set(100, 200, 100);
        this.lights[2].position.set(-100, -200, -100);

        this.lights.forEach(light => {
            scene.add(light);
        });
    }

    private mouseMove = (e: MouseEvent) => {
        if(this.cube && this.donut){
            const percentFromTop = e.clientY / window.innerHeight;
            const percentFromSide = e.clientX / window.innerWidth;

            this.cube.rotation.z = 4*percentFromTop;
            this.cube.rotation.x = 4*percentFromSide;

            this.donut.rotation.x = percentFromTop*10;
            this.donut.rotation.y = percentFromSide*5;

            this.lights.forEach(light => {
                light.intensity = 1 - percentFromTop;
            });
        }
    };
}


const post: Post = {
    summary: {
        type: PostType.experiment3d,
        id: "cube-peg-torus-hole",
        title: "Cube Peg, Torus Hole",
        timestamp: new Date(2019, 4, 17),
        tags: ['3d'],
    },
    content: () => new CubePegTorusHoleContent(),
};

export default post;
