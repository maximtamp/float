import * as THREE from 'three';
import { sharkColor } from '../constants/colors';

export const createShark = () => {
    const geom = new THREE.ConeGeometry(5, 20, 6);

    geom.rotateX(Math.PI / 2);

    const mat = new THREE.MeshPhongMaterial({
        color: sharkColor,
        flatShading: true
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return {
        mesh
    }
};