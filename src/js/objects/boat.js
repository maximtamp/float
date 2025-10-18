import * as THREE from 'three';
import { boatColors } from '../constants/colors';

export const createBoat = (score = 0, colectedContainerColors) => {

    const mesh = new THREE.Object3D();

    const geomBottom = new THREE.CylinderGeometry(10, 10, 40, 50, 2, false, Math.PI * 0.5, Math.PI * 1);
    const matBottom = new THREE.MeshPhongMaterial({ color: boatColors.secondary, flatShading: true });
    const bottom = new THREE.Mesh(geomBottom, matBottom);
    bottom.rotateX(-Math.PI / 2);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    mesh.add(bottom);

    const geomFloor = new THREE.BoxGeometry(20, 2, 40, 1, 1, 1);
    const matFloor = new THREE.MeshPhongMaterial({ color: boatColors.primary, flatShading: true });
    const floor = new THREE.Mesh(geomFloor, matFloor);
    floor.position.y = 1;
    floor.castShadow = true;
    floor.receiveShadow = true;
    mesh.add(floor);

    const geomCockpit = new THREE.BoxGeometry(15, 15, 8, 1, 1, 1);
    const matCockpit = new THREE.MeshPhongMaterial({ color: boatColors.primary, flatShading: true });
    const cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.position.y = 2;
    cockpit.position.z = 15;
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    mesh.add(cockpit);

    for (let i = 0; i < score; i++) {
        const geomContainer = new THREE.BoxGeometry(8, 3, 3, 1, 1, 1);
        const matContainer = new THREE.MeshPhongMaterial({ color: colectedContainerColors[i], flatShading: true });
        const container = new THREE.Mesh(geomContainer, matContainer);
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