import {ExperimentContent3D, Post, PostType} from "personal-site-model";
import {
    AmbientLight,
    BoxGeometry,
    Camera,
    Color,
    DirectionalLight,
    DoubleSide,
    Light,
    Material,
    Mesh,
    MeshPhongMaterial,
    MirroredRepeatWrapping,
    PlaneGeometry,
    Raycaster,
    Scene,
    SpotLight,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer
} from "three";

import {PointerLockControls} from "personal-site-shapes";

class KeyPressHelper {

    public onEvent: (() => void) | undefined;

    private down: {[key: string]: boolean} = {
        w: false,
        a: false,
        s: false,
        d: false
    };

    constructor(){
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    private onKeyDown = (ev: KeyboardEvent) => {
        this.down[ev.key.toLowerCase()] = true;
        if(this.onEvent){
            this.onEvent();
        }
    };

    private onKeyUp = (ev: KeyboardEvent) => {
        this.down[ev.key.toLowerCase()] = false;
        if(this.onEvent){
            this.onEvent();
        }
    };

    public isDown(key: string){
        return Boolean(this.down[key.toLowerCase()]);
    }
}

class Walker {

    private readonly raycaster: Raycaster = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 10);

    public readonly mouse: Vector2 = new Vector2();
    private readonly size = new Vector2();

    private velocity = new Vector3();

    private readonly controls: PointerLockControls;
    private lastTime: number = 0;

    constructor(
        private readonly camera: Camera,
        private readonly renderer: WebGLRenderer,
        private readonly scene: Scene,
        public readonly direction: Vector3 = new Vector3(),
        private keyHelper: KeyPressHelper = new KeyPressHelper(),
    ){
        this.controls = new PointerLockControls(this.camera);

        this.scene.add(this.controls.getObject());
        window.addEventListener('mousemove', this.onMouseMove);
    }

    public setPointerLock = (lock: boolean) => {
        if(lock){
            this.controls.lock();
        } else {
            this.controls.unlock();
        }
    };

    private onMouseMove = (ev: MouseEvent) => {
        this.renderer.getSize(this.size);
        this.mouse.x = ((ev.clientX / this.size.x)*2) - 1;
        this.mouse.y = (-(ev.clientY / this.size.y)*2) + 1;
    };

    update = () => {
        if(!this.lastTime){
            this.lastTime = performance.now();
        }

        this.raycaster.ray.origin.copy( this.controls.getObject().position );
        this.raycaster.ray.origin.y -= 10;

        const direction = this.raycaster.ray.direction;

        const time = performance.now();
        const delta = ( time - this.lastTime ) / 1000;

        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        const moveForward = this.keyHelper.isDown('w');
        const moveBackward = this.keyHelper.isDown('s');
        const moveRight = this.keyHelper.isDown('d');
        const moveLeft = this.keyHelper.isDown('a');

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveLeft ) - Number( moveRight );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( moveForward || moveBackward ) this.velocity.z -= direction.z * 150.0 * delta;
        if ( moveLeft || moveRight ) this.velocity.x -= direction.x * 150.0 * delta;

        this.controls.getObject().translateX( this.velocity.x * delta );
        this.controls.getObject().position.y += ( this.velocity.y * delta ); // new behavior
        this.controls.getObject().translateZ( this.velocity.z * delta );

        if ( this.controls.getObject().position.y < 10 ) {
            this.velocity.y = 0;
            this.controls.getObject().position.y = 10;
        }

        this.lastTime = window.performance.now();
    };
}

class Cell implements ExperimentContent3D {

    private lights: Light[] = [];
    private camera: Camera | undefined;
    private scene: Scene | undefined;
    private renderer: WebGLRenderer | undefined;
    private walker: Walker | undefined;

    start = (scene: Scene, camera: Camera, renderer: WebGLRenderer) => {
        this.renderer = renderer;
        scene.background = new Color(0x000000);
        this.scene = scene;
        this.walker = new Walker(camera, renderer, scene);

        this.setupLights(scene);

        const loader = new TextureLoader();
        const wallTexture = loader.load('/images/cinder-blocks.jpg');
        wallTexture.repeat.set(4, 4);
        wallTexture.wrapS = MirroredRepeatWrapping;
        wallTexture.wrapT = MirroredRepeatWrapping;

        const wallMaterial = new MeshPhongMaterial({ color: 0x999999, side: DoubleSide, bumpMap: wallTexture, reflectivity:0 });

        this.addFloorAndCeiling(wallMaterial, scene);
        this.addOblisks(wallMaterial, scene);
        this.createWalls(wallMaterial, scene);

        camera.position.z = 15;
        camera.position.x = -7;
        camera.position.y = 6;

        this.camera = camera;
    };

    onFullScreenChange = (fullScreen: boolean) => {
        if(this.walker) {
            this.walker.setPointerLock(fullScreen);
        }
    };

    private addOblisks(wallMaterial: Material, scene: Scene) {
        const oblisk = new Mesh(
            new BoxGeometry(2, 10, 1),
            wallMaterial
        );
        oblisk.receiveShadow = true;
        oblisk.castShadow = true;
        oblisk.position.y = 5;
        scene.add(oblisk);


        const oblisk2 = new Mesh(
            new BoxGeometry(4, 20, 1),
            wallMaterial
        );
        oblisk2.receiveShadow = true;
        oblisk2.castShadow = true;
        oblisk2.position.set(10, 10, 5);
        scene.add(oblisk2);
    }

    private addFloorAndCeiling(wallMaterial: Material, scene: Scene) {
        const floor = new Mesh(
            new PlaneGeometry(50, 50),
            wallMaterial,
        );
        floor.castShadow = true;
        floor.receiveShadow = true;
        floor.rotateX(Math.PI / 2);
        scene.add(floor);

        const ceiling = new Mesh(
            new PlaneGeometry(50, 50),
            wallMaterial,
        );
        ceiling.castShadow = true;
        ceiling.receiveShadow = true;
        ceiling.rotateX(Math.PI / 2);
        ceiling.position.y = 20;
        scene.add(ceiling);
    }

    private createWalls(wallMaterial: Material, scene: Scene) {
        const wall = new Mesh(
            new BoxGeometry(50, 20, 1),
            wallMaterial
        );
        wall.receiveShadow = true;
        wall.castShadow = true;
        wall.position.set(-25.15, 10, 0);
        wall.rotateY(Math.PI / 2);
        scene.add(wall);

        const wall2 = new Mesh(
            new BoxGeometry(50, 20, 1),
            wallMaterial
        );
        wall2.receiveShadow = true;
        wall2.castShadow = true;
        wall2.position.set(0, 10, 25);
        scene.add(wall2);

        const wall3 = new Mesh(
            new BoxGeometry(50, 5, 1),
            wallMaterial
        );
        //wall3.rotateY(Math.PI / 2);
        wall3.receiveShadow = true;
        wall3.castShadow = true;
        wall3.position.set(0, 2.5, -25);
        scene.add(wall3);

        const wall4 = new Mesh(
            new BoxGeometry(20, 5, 1),
            wallMaterial
        );
        //wall3.rotateY(Math.PI / 2);
        wall4.receiveShadow = true;
        wall4.castShadow = true;
        wall4.position.set(15.5, 7.5, -25);
        scene.add(wall4);

        const wall5 = new Mesh(
            new BoxGeometry(20, 5, 1),
            wallMaterial
        );
        //wall3.rotateY(Math.PI / 2);
        wall5.receiveShadow = true;
        wall5.castShadow = true;
        wall5.position.set(-15.5, 7.5, -25);

        scene.add(wall5);

        const wall6 = new Mesh(
            new BoxGeometry(50, 10, 1),
            wallMaterial
        );
        //wall3.rotateY(Math.PI / 2);
        wall6.receiveShadow = true;
        wall6.castShadow = true;
        wall6.position.set(0, 15, -25);
        scene.add(wall6);

        const wall7 = new Mesh(
            new BoxGeometry(50, 20, 1),
            wallMaterial
        );
        wall7.receiveShadow = true;
        wall7.castShadow = true;
        wall7.position.set(25, 10, 0);
        wall7.rotateY(Math.PI / 2);
        scene.add(wall7);
    }

    onRender = () => {
        if(this.walker){
            this.walker.update();
        }
    };

    stop = () => {
        const scene = this.scene;
        if(!scene){
            return;
        }
        this.lights.forEach(light => scene.remove(light));
    };

    private setupLights(scene: Scene) {
        const directionalLight = new DirectionalLight(0xffffff, 0.2);
        const spotLight = new SpotLight(0xcc8843, 1);

        this.lights = [
            new AmbientLight(0xffffff, 0.4),
            directionalLight,
            spotLight
        ];

        directionalLight.position.set(0, 15, 0);
        directionalLight.lookAt(0, 0, 0);

        spotLight.castShadow = true;
        spotLight.position.set(0, 12.5, -40);
        spotLight.lookAt(0,0,0);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        spotLight.distance = 100;
        spotLight.shadow.camera.near = 10;
        spotLight.shadow.camera.far = 100;

        this.lights.forEach(light => {
            scene.add(light);
        });
    }
}

const post: Post = {
    summary: {
        type: PostType.experiment3d,
        id: "cell",
        title: "Cell",
        timestamp: new Date(2019, 7, 4),
        tags: ['3d', 'lighting'],
    },
    content: () => new Cell(),
};

export default post;
