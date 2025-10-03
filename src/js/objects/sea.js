import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';
import seaVertexShader from '../shaders/sea/vertex.glsl?raw';
import seaFragmentShader from '../shaders/sea/fragmentTopCam.glsl?raw';

export const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uBoatPosition: { value: new THREE.Vector3(0,0,0) }
};

export const createSea = () => {
    const geom = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight, 256, 256);
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

    return {
        mesh
    }
};