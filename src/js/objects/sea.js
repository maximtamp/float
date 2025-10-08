import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';
import seaVertexShader from '../shaders/sea/vertex.glsl?raw';
import seaFragmentShader from '../shaders/sea/fragment.glsl?raw';

export const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uBoatPosition: { value: new THREE.Vector3(0,0,0) },
    waterBaseColor: { value: new THREE.Color("#093e74") },
    waterColor: { value: new THREE.Color("#63773c") },
    waterTopColor: { value: new THREE.Color("#135d23") }
};

export const createSea = () => {
    const geom = new THREE.PlaneGeometry(2000, 2000, 500, 500);
    geom.rotateX(Math.PI / 2);

    const mat = new THREE.RawShaderMaterial({
        uniforms,
        vertexShader: seaVertexShader,
        fragmentShader: seaFragmentShader,
        side: THREE.DoubleSide,
        glslVersion: THREE.GLSL3,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return {
        mesh
    }
};