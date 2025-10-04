import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import { createSea, uniforms } from './objects/sea';
import { createBoat } from './objects/boat';
import { createContainer } from './objects/container';
import { createShark } from './objects/shark';


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

let seaMesh, boatMesh, sharkMesh, containerMesh;

let elapsedTime = 0

let boatSpeed = 0;
let boatTilt = 0;

let score = 0;
let state = "menu";

let shark = {
    active: false,
    TimeUntilActive: 10
}

const containers = []
const containerColors = ["#3751cf", "#d2760e", "#a31010", "#afafaf", "#dbdada"]
const colectedContainerColors = []

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

let keyPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowRight: false,
    ArrowLeft: false, 
}

const generateContainers = () => {
    for (let i = 0; i < 24; i++) {
        const containerColor = containerColors[Math.floor(Math.random() * containerColors.length)]
        containerMesh = createContainer(containerColor).mesh;
        containerMesh.position.set((Math.random() - 0.5) * 1000, 0, (Math.random() - 0.5) * 1000)
        containerMesh.rotation.z = Math.random() * 0.5
        containerMesh.rotation.y = Math.random() * 100
        scene.add(containerMesh);
        containers.push({
            mesh: containerMesh,
            color: containerColor
        })
    }
}

const init = () => {
    seaMesh = createSea().mesh;
    seaMesh.receiveShadow = true
    scene.add(seaMesh);
    
    boatMesh = createBoat(score).mesh;
    boatMesh.receiveShadow = true
    scene.add(boatMesh);

    generateContainers()

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    resizeRenderer()
    scene.background = new THREE.Color("#255174")

    requestAnimationFrame(render);
};
const clock = new THREE.Clock();

const render = () => {
    elapsedTime = clock.getElapsedTime()
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

    const cameraOffset = new THREE.Vector3(0, 40, 60);
    cameraOffset.applyQuaternion(boatMesh.quaternion);
    camera.position.copy(boatMesh.position.clone().add(cameraOffset));

    camera.lookAt(boatMesh.position);

    const boatBox = new THREE.Box3().setFromObject(boatMesh);

    containers.forEach((container, index) => {
        const containerBox = new THREE.Box3().setFromObject(container.mesh);

        container.mesh.rotation.x = Math.sin(elapsedTime) * 0.15;
        container.mesh.position.y = 3.5 + Math.sin(elapsedTime * 2.0) * 0.5;

        if (boatBox.intersectsBox(containerBox)){
            scene.remove(container.mesh)
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
            colectedContainerColors.push(container.color)
            boatMesh = createBoat(score, colectedContainerColors).mesh
            boatMesh.position.set(boatParams.xPos, boatParams.yPos, boatParams.zPos)
            boatMesh.rotation.set(boatParams.xRot, boatParams.yRot, boatParams.zRot)
            scene.add(boatMesh)
            console.log(score)
        }
    })

    uniforms.uBoatPosition.value.set(boatMesh.position.x, boatMesh.position.y, boatMesh.position.z);
    if( state === "game"){
        if (!shark.active && Math.floor(elapsedTime * 1000) > shark.TimeUntilActive){
            shark.active = true;
            sharkMesh = createShark().mesh;
            sharkMesh.receiveShadow = true
            sharkMesh.position.set((Math.random() - 0.5) * 1000, 3.5, (Math.random() - 0.5) * 1000)
            scene.add(sharkMesh);
        } else if (shark.active){
            const test = new THREE.Vector3(0, 0, -1);
            test.applyQuaternion(sharkMesh.quaternion);
            sharkMesh.lookAt(boatMesh.position);
            sharkMesh.position.add(test.clone().multiplyScalar(-0.5));
    
            const cameraOffset = new THREE.Vector3(0, 90, 120);
            cameraOffset.applyQuaternion(boatMesh.quaternion);
            camera.position.copy(boatMesh.position.clone().add(cameraOffset));
            camera.lookAt(boatMesh.position);
    
            const sharkBox = new THREE.Box3().setFromObject(sharkMesh);
            if (boatBox.intersectsBox(sharkBox)){
                setState("gameOver")
                scene.remove(sharkMesh)
                shark.active = false
            }
        }
    }

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
    if(state === "game"){
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
        if (e.key === " " && shark.active) {
            scene.remove(sharkMesh)
            shark.active = false
            shark.TimeUntilActive = elapsedTime * 1000 + (Math.random() * (12000 - 6000) + 6000)
        }
    } else if (e.key === "Enter") {
        setState("game")
    }
}

const handleKeyUp = (e) => {
    if(state === "game"){
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
}

const setState = (newState) => {
    state = newState;
    if(state === "menu"){
        document.querySelector('#menu').classList.remove('visually-hidden')
    } else if (state === "game") {
        document.querySelector('#menu').classList.add('visually-hidden')
        shark.TimeUntilActive = elapsedTime * 1000 + (Math.random() * (12000 - 6000) + 6000)
        console.log(elapsedTime)
        score = 0
        containers.forEach(container => {
            scene.remove(container.mesh);
        })
        containers.length = 0
        colectedContainerColors.length = 0

        generateContainers()
       
        scene.remove(boatMesh)
        boatMesh = createBoat(score, colectedContainerColors).mesh
        boatMesh.position.set(0, 0, 0)
        boatMesh.rotation.set(0, 0, 0)
        scene.add(boatMesh)
    } else if (state === "gameOver") {
        document.querySelector('#menu').classList.remove('visually-hidden')
        keyPressed.ArrowUp = false
        keyPressed.ArrowDown = false
        keyPressed.ArrowLeft = false
        keyPressed.ArrowRight = false
        boatSpeed = 0;
        boatTilt = 0;
    }
}

const handleClickStart = () => {
    setState("game")
}

window.addEventListener('resize', resizeRenderer)
window.addEventListener('keydown', handleKeyDown)
window.addEventListener('keyup', handleKeyUp)
document.querySelector('#startButton').addEventListener('click', handleClickStart)

init();