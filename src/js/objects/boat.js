import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

export const createBoat = (score = 0) => {
    /*
    const geom = new THREE.BoxGeometry(20, 40, 20);

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
        */

    const mesh = new THREE.Object3D();

    const geomCockpit = new THREE.CylinderGeometry(10, 10, 40, 50, 2, false, Math.PI * 0.5, Math.PI * 1);
    const matCockpit = new THREE.MeshPhongMaterial({ color: "#1f1f1f", flatShading: true });
    const cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.rotateX(-Math.PI / 2);
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    mesh.add(cockpit);

    const geomfloor = new THREE.BoxGeometry(20, 2, 40, 1, 1, 1);
    const matfloor = new THREE.MeshPhongMaterial({ color: "#dedede", flatShading: true });
    const floor = new THREE.Mesh(geomfloor, matfloor);
    floor.position.y = 1;
    floor.castShadow = true;
    floor.receiveShadow = true;
    mesh.add(floor);

    const geomconsole = new THREE.BoxGeometry(15, 15, 8, 1, 1, 1);
    const matconsole = new THREE.MeshPhongMaterial({ color: "#dedede", flatShading: true });
    const console = new THREE.Mesh(geomconsole, matconsole);
    console.position.y = 2;
    console.position.z = 15;
    console.castShadow = true;
    console.receiveShadow = true;
    mesh.add(console);

    const containerColors = ["#3751cf", "#d2760e", "#a31010"]

    for (let i = 0; i < score; i++) {
        const geomcontainer = new THREE.BoxGeometry(12, 6, 6, 1, 1, 1);
        const matcontainer = new THREE.MeshPhongMaterial({ color: containerColors[i], flatShading: true });
        const container = new THREE.Mesh(geomcontainer, matcontainer);
        container.position.y = 5;
        container.position.z = -12 + 8 * i;
        container.castShadow = true;
        container.receiveShadow = true;
        mesh.add(container); 
    }

    return {
        mesh
    }
};