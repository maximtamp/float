import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

export const createContainer = () => {
    const geom = new THREE.BoxGeometry(20, 20, 40);

    geom.rotateX(Math.PI / 2);

    const mat = new THREE.MeshPhongMaterial({
        color: 0x333333,
        flatShading: true

    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;

    return {
        mesh
    }
};