import * as THREE from 'three';

export const createShark = () => {
    const geom = new THREE.BoxGeometry(2, 12, 20);

    geom.rotateX(Math.PI / 2);

    const mat = new THREE.MeshPhongMaterial({
        color: "#f2ee02",
        flatShading: true
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;

    return {
        mesh
    }
};