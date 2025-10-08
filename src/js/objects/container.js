import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

export const createContainer = (containerColor = "#d2760e") => {
    const geom = new THREE.BoxGeometry(24, 8, 8);

    geom.rotateX(Math.PI / 2);

    const mat = new THREE.MeshPhongMaterial({
        color: containerColor,
        flatShading: true
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return {
        mesh
    }
};