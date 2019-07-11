import {ExperimentContent3D, Post, PostType} from "personal-site-model";
import {
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    Camera,
    Color,
    Geometry,
    Light,
    Points,
    Scene,
    ShaderMaterial,
    Vector3
} from "three";

function getGeometry(func: (x: number, z: number) => number): BufferGeometry {
    const geometry = new BufferGeometry();
    const nX = 100;
    const nY = 100;

    const numParticles = nX*nY*100;

    const scale = new Float32Array(numParticles);
    const positions = new Float32Array(numParticles*3);

    let i = 0;
    let j = 0;
    for(let x = -(nX/2); x < nX/2; x += 0.2){
        for(let z = -(nY/2); z < (nY/2); z += 0.2){
            const y = func(x, z);
            positions[i] = x;
            positions[i + 1] = y;
            positions[i + 2] = z;
            scale[j] = 0.25;
            i += 3;
            j++;
        }
    }

    geometry.addAttribute('position', new BufferAttribute(positions, 3));
    geometry.addAttribute('scale', new BufferAttribute(scale, 1));

    return geometry;
}

const func = (x: number, z: number) => {
    return (10*z/x) + (Math.cos(z + x)/2);
};

class MathJourneyContent implements ExperimentContent3D {

    private lights: Light[] = [];

    private camera: Camera | undefined;
    private scene: Scene | undefined;
    private geometry: BufferGeometry | Geometry | undefined;
    private cameraRotation: Vector3 = new Vector3(0, 0, 0);

    start = (scene: Scene, camera: Camera) => {
        this.scene = scene;
        const material = new ShaderMaterial( {
            uniforms: {
                color: { value: new Color( 0xce4a04 ) },
            },
            vertexShader:
                `attribute float scale;
                
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_PointSize = scale * ( 300.0 / - mvPosition.z );
                    gl_Position = projectionMatrix * mvPosition;
                }`,
            fragmentShader:
                `uniform vec3 color;
                void main() {
                    if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;
                    gl_FragColor = vec4( color, 1.0 );
                }
            `
        } );

        this.geometry = getGeometry(func);

        scene.add(
            new Points(this.geometry, material)
        );

        this.setupLights(scene);

        camera.position.z = 5;
        this.camera = camera;
        this.animate();
    };

    animate = () => {
        const camera = this.camera;
        if(camera){
            camera.position.x = Math.sin(this.cameraRotation.x)*20;
            camera.position.z = Math.cos(this.cameraRotation.z)*20;
            camera.position.y = Math.cos(this.cameraRotation.y)*30;
            camera.lookAt(0, 0, 0);
            this.cameraRotation.addScalar(0.001);

            const geo = this.geometry as BufferGeometry;
            if(geo){
                const positionAttr = geo.attributes.position as BufferAttribute;

                for(let i = 0; i < positionAttr.array.length; i++){
                    const newY = func(positionAttr.getX(i), positionAttr.getZ(i)) * Math.sin(this.cameraRotation.x) * 1.5;
                    if(!Number.isNaN(newY)){
                        positionAttr.setY(i, newY);
                    }
                }
                positionAttr.needsUpdate = true;
            }
        }
        window.requestAnimationFrame(this.animate);
    };

    stop = () => {
        const scene = this.scene;
        if(!scene){
            return;
        }
        this.lights.forEach(light => scene.remove(light));
    };

    private setupLights(scene: Scene) {
        this.lights = [
            new AmbientLight(0xffffff, 0.2),
        ];

        this.lights[0].position.set(0, 200, 0);

        this.lights.forEach(light => {
            scene.add(light);
        });
    }
}


const post: Post = {
    summary: {
        type: PostType.experiment3d,
        id: "math-journey",
        title: "Math Journey",
        timestamp: new Date(2019, 6, 11),
        tags: ['3d', 'mathematics'],
    },
    content: () => new MathJourneyContent(),
};

export default post;
