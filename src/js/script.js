import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import { createSea, uniforms } from './objects/sea';
import { createBoat } from './objects/boat';
import { createContainer } from './objects/container';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
})
renderer.shadowMap.enabled = true;

const fov = 90;
const aspect = window.innerWidth / window.innerHeight;
const near = 1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 90, 0);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();

let seaMesh, boatMesh, containerMesh;

let boatSpeed = 0;
let boatTilt = 0;

let score = 0;

const containers = []

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

let keyPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowRight: false,
    ArrowLeft: false, 
}

const init = () => {
    seaMesh = createSea().mesh;
    seaMesh.receiveShadow = true
    scene.add(seaMesh);
    
    boatMesh = createBoat(score).mesh;
    boatMesh.receiveShadow = true
    scene.add(boatMesh);

    for (let i = 0; i < 3; i++) {        
        containerMesh = createContainer().mesh;
        containerMesh.position.set((Math.random() - 0.5) * 1000, 3.5, (Math.random() - 0.5) * 1000)
        scene.add(containerMesh);
        containers.push(containerMesh)
    }

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 512; // default
    directionalLight.shadow.mapSize.height = 512; // default
    directionalLight.shadow.camera.near = 0.5; // default
    directionalLight.shadow.camera.far = 1000; // default
    scene.add(directionalLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    resizeRenderer()
    scene.background = new THREE.Color("#255174")

    requestAnimationFrame(render);
};
const clock = new THREE.Clock();

const render = () => {
    const elapsedTime = clock.getElapsedTime()
    uniforms.iTime.value = elapsedTime;

    if (keyPressed.ArrowUp) {
        if (boatSpeed <= 0.25) {
            boatSpeed += 0.002
        }
    }
    if (keyPressed.ArrowDown) {
        if (boatSpeed >= -0.25) {
            boatSpeed -= 0.001
        }
    }
    if (boatSpeed != 0 && keyPressed.ArrowLeft) {
        boatMesh.rotation.y += 0.002
        if (boatTilt <= 0.1) {
            boatTilt += 0.005
        }
    }
    if (boatSpeed != 0 && keyPressed.ArrowRight) {
        boatMesh.rotation.y -= 0.002
        if (boatTilt >= -0.1) {
            boatTilt -= 0.005
        }
    }

    boatMesh.rotation.z = boatTilt
    boatMesh.rotation.x = Math.sin(elapsedTime) * 0.15;

    boatMesh.position.y = 3.5 + Math.sin(elapsedTime * 2.0) * 0.5;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(boatMesh.quaternion);
    boatMesh.position.add(forward.clone().multiplyScalar(boatSpeed));
    

    if (boatSpeed > 0) {
        boatSpeed -= 0.0005
    } else if (boatSpeed < 0) {
        boatSpeed += 0.0005
    }

    if (boatTilt > 0) {
        boatTilt -= 0.0025
    } else if (boatTilt < 0) {
        boatTilt += 0.0025
    }

    const cameraOffset = new THREE.Vector3(0, 40, 60); // omhoog en naar achter
    cameraOffset.applyQuaternion(boatMesh.quaternion);
    camera.position.copy(boatMesh.position.clone().add(cameraOffset));

    // Camera laten kijken naar de boot
    camera.lookAt(boatMesh.position);


    const boatBox = new THREE.Box3().setFromObject(boatMesh);

    containers.forEach((container, index) => {
        const containerBox = new THREE.Box3().setFromObject(container);

        if (boatBox.intersectsBox(containerBox)){
            scene.remove(container)
            containers.splice(index, 1)

            const boatParams = {
                xPos: boatMesh.position.x,
                yPos: boatMesh.position.y,
                zPos: boatMesh.position.z,
                xRot: boatMesh.rotation.x,
                yRot: boatMesh.rotation.y,
                zRot: boatMesh.rotation.z,
            }

            scene.remove(boatMesh)
            score++
            boatMesh = createBoat(score).mesh
            boatMesh.position.set(boatParams.xPos, boatParams.yPos, boatParams.zPos)
            boatMesh.rotation.set(boatParams.xRot, boatParams.yRot, boatParams.zRot)
            scene.add(boatMesh)
            console.log(score)
        }
    })


    uniforms.uBoatPosition.value.set(boatMesh.position.x, boatMesh.position.y, boatMesh.position.z);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
};

const resizeRenderer = () => {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth * window.devicePixelRatio | 0;
    const height = canvas.clientHeight * window.devicePixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

const handleKeyDown = (e) => {
    if(e.key === "ArrowUp"){
        keyPressed.ArrowUp = true
    }
    if (e.key === "ArrowDown") {
        keyPressed.ArrowDown = true
    }
    if (e.key === "ArrowLeft") {
        keyPressed.ArrowLeft = true
    }
    if (e.key === "ArrowRight") {
        keyPressed.ArrowRight = true
    }
}

const handleKeyUp = (e) => {
    if (e.key === "ArrowUp") {
        keyPressed.ArrowUp = false
    }
    if (e.key === "ArrowDown") {
        keyPressed.ArrowDown = false
    }
    if (e.key === "ArrowLeft") {
        keyPressed.ArrowLeft = false
    }
    if (e.key === "ArrowRight") {
        keyPressed.ArrowRight = false
    }
}

window.addEventListener('resize', resizeRenderer)
window.addEventListener('keydown', handleKeyDown)
window.addEventListener('keyup', handleKeyUp)

init();