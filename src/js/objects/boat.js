import * as THREE from 'three';

export const createBoat = (score = 0, colectedContainerColors) => {

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

    for (let i = 0; i < score; i++) {
        const geomcontainer = new THREE.BoxGeometry(8, 3, 3, 1, 1, 1);
        const matcontainer = new THREE.MeshPhongMaterial({ color: colectedContainerColors[i], flatShading: true });
        const container = new THREE.Mesh(geomcontainer, matcontainer);
        if (i < 6 || i > 11 && i < 18){
            container.position.x = -5;
            if (i > 11 && i < 18){
                container.position.z = -15 + 4 * (i - 12);
            } else {
                container.position.z = -15 + 4 * i;
            }
        } else {
            container.position.x = 5;
            if (i > 17) {
                container.position.z = -15 + 4 * (i - 18);
            } else {
                container.position.z = -15 + (-4 *6) + 4 * i;
            }
        }

        if(i < 12){
            container.position.y = 4;
        } else {
            container.position.y = 7;
        }

        container.castShadow = true;
        container.receiveShadow = true;
        mesh.add(container); 
    }

    return {
        mesh
    }
};