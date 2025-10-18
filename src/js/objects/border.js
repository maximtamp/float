import * as THREE from 'three';
import { borderColor } from '../constants/colors';

export const createBorder = () => {
    const mesh = new THREE.Object3D();
    const wallCordinats = [
        { x: 500, z: 0, width: 16, length: 1016 },
        { x: 0, z: 500, width: 1016, length: 16 },
        { x: 0, z: -500, width: 1016, length: 16 },
        { x: -500, z: 0, width: 16, length: 1016 },
    ]
    
    for (let i = 0; i < 4; i++) {
        const geom = new THREE.BoxGeometry(wallCordinats[i].width, wallCordinats[i].length, 16);
    
        geom.rotateX(Math.PI / 2);
    
        const mat = new THREE.MeshPhongMaterial({
            color: borderColor,
            flatShading: true
        });
    
        const wall = new THREE.Mesh(geom, mat);
        wall.position.x = wallCordinats[i].x
        wall.position.z = wallCordinats[i].z
        wall.castShadow = true;
        mesh.add(wall)
    }

    return {
        mesh
    }
};