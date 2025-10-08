import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

export const createBorder = () => {
    const mesh = new THREE.Object3D();
    const wallCordinats = [
        { x: 1000, z: 0, width: 16, length: 2016 },
        { x: 0, z: 1000, width: 2016, length: 16 },
        { x: 0, z: -1000, width: 2016, length: 16 },
        { x: -1000, z: 0, width: 16, length: 2016 },
    ]
    for (let i = 0; i < 4; i++) {
        const geom = new THREE.BoxGeometry(wallCordinats[i].width, wallCordinats[i].length, 16);
    
        geom.rotateX(Math.PI / 2);
    
        const mat = new THREE.MeshPhongMaterial({
            color: "#fff",
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