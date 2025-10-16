import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import { createSea, uniforms } from './objects/sea';
import { createBoat } from './objects/boat';
import { createContainer } from './objects/container';
import { createShark } from './objects/shark';
import { createBorder } from './objects/border';


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

let seaMesh, boatMesh, sharkMesh, containerMesh, borderMesh;
const boatBox = new THREE.Box3()
const sharkBox = new THREE.Box3()
const containerBox = new THREE.Box3()
const wallBox = new THREE.Box3()

let elapsedTime = 0

let boatSpeed = 0;
let boatTilt = 0;

let score = 0;
let playTime = {
    startTime: 0,
    endTime: 0
}
let state = "menu";

let shark = {
    active: false,
    TimeUntilActive: 10
}

const seaColors = {
    default: [
        { waterBaseColor: "#093e74", waterColor: "#63773c", waterTopColor: "#135d23" },
        { waterBaseColor: "#1a5a99", waterColor: "#789d50", waterTopColor: "#2b7e36" },
        { waterBaseColor: "#2b7fbf", waterColor: "#90b66a", waterTopColor: "#3da84a" },
        { waterBaseColor: "#4ca3e0", waterColor: "#add486", waterTopColor: "#5bcc63" },
    ],
    red: {
        waterBaseColor: "#740909",
        waterColor: "#ad2c2c",
        waterTopColor: "#6d2222"
    }
}

const containers = []
const maxContainers = 12;
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
    for (let i = 0; i < maxContainers; i++) {
        const containerColor = containerColors[Math.floor(Math.random() * containerColors.length)]
        containerMesh = createContainer(containerColor).mesh;
        containerMesh.position.set((Math.random() - 0.5) * 450, 0, (Math.random() - 0.5) * 450)
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
    getLocalStream() 

    seaMesh = createSea().mesh;
    seaMesh.receiveShadow = true
    scene.add(seaMesh);
    
    boatMesh = createBoat(score).mesh;
    boatMesh.receiveShadow = true
    scene.add(boatMesh);

    generateContainers()

    borderMesh = createBorder().mesh;
    borderMesh.receiveShadow = true
    scene.add(borderMesh);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    directionalLight.shadow.camera.top = 2000;
    directionalLight.shadow.camera.bottom = - 2000;
    directionalLight.shadow.camera.left = - 2000;
    directionalLight.shadow.camera.right = 2000;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 2000;
    directionalLight.shadow.mapSize.width = 5000;
    directionalLight.shadow.mapSize.height = 5000;

    resizeRenderer()
    scene.background = new THREE.Color("#255174")

    requestAnimationFrame(render);
};
const clock = new THREE.Clock();

const render = () => {
    elapsedTime = clock.getElapsedTime()
    uniforms.iTime.value = elapsedTime;


    if (keyPressed.ArrowUp) {
        if (boatSpeed <= 0.35) {
            boatSpeed += 0.002
        }
    }
    if (keyPressed.ArrowDown) {
        if (boatSpeed >= -0.35) {
            boatSpeed -= 0.001
        }
    }
    if (boatSpeed != 0 && keyPressed.ArrowLeft) {
        boatMesh.rotation.y += 0.005
        if (boatTilt <= 0.1) {
            boatTilt += 0.005
        }
    }
    if (boatSpeed != 0 && keyPressed.ArrowRight) {
        boatMesh.rotation.y -= 0.005
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

    boatBox.setFromObject(boatMesh);

    containers.forEach((container, index) => {
        containerBox.setFromObject(container.mesh);

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
            document.querySelector('#totalCollected p').innerHTML = score + "/" + maxContainers
            colectedContainerColors.push(container.color)
            boatMesh = createBoat(score, colectedContainerColors).mesh
            boatMesh.position.set(boatParams.xPos, boatParams.yPos, boatParams.zPos)
            boatMesh.rotation.set(boatParams.xRot, boatParams.yRot, boatParams.zRot)
            scene.add(boatMesh)

            if(score === maxContainers){
                setState("gameWon")
            } else {
                uniforms.waterBaseColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterBaseColor)
                uniforms.waterColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterColor)
                uniforms.waterTopColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterTopColor)
            }

        }
    })

    uniforms.uBoatPosition.value.set(boatMesh.position.x, boatMesh.position.y, boatMesh.position.z);
    if( state === "game"){
        document.querySelector('#timer').innerHTML = Math.round((elapsedTime - playTime.startTime) * 100) / 100
        if (!shark.active && Math.floor(elapsedTime * 1000) > shark.TimeUntilActive){
            shark.active = true;
            sharkMesh = createShark().mesh;
            sharkMesh.receiveShadow = true
            sharkMesh.position.set(boatMesh.position.x + ((Math.random() - 0.5) * (250 - 100) + 100), 3.5, boatMesh.position.z + ((Math.random() - 0.5) * (250 - 100) + 100))
            scene.add(sharkMesh);
            document.querySelector('#sharkAlert').classList.remove('visually-hidden')
        } else if (shark.active){
            const test = new THREE.Vector3(0, 0, -1);
            test.applyQuaternion(sharkMesh.quaternion);
            sharkMesh.lookAt(boatMesh.position);
            sharkMesh.position.add(test.clone().multiplyScalar(-0.5));
            sharkMesh.rotation.z = Math.sin(elapsedTime) * 0.25;
    
            camera.position.x = boatMesh.position.x
            camera.position.y = 150
            camera.position.z = boatMesh.position.z
            camera.lookAt(boatMesh.position);

            uniforms.waterBaseColor.value.set(seaColors.red.waterBaseColor)
            uniforms.waterColor.value.set(seaColors.red.waterColor)
            uniforms.waterTopColor.value.set(seaColors.red.waterTopColor)
    
            sharkBox.setFromObject(sharkMesh);
            if (boatBox.intersectsBox(sharkBox)){
                document.querySelector('#sharkAlert').classList.add('visually-hidden')
                setState("gameOver")
                scene.remove(sharkMesh)
                shark.active = false
            }
        }
    }

    borderMesh.children.forEach(wall => {
        wallBox.setFromObject(wall);
        if (boatBox.intersectsBox(wallBox)) {
            boatSpeed = -boatSpeed * 0.5;
            console.log("appel")
        }
    })

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
        if (e.key === "z" && shark.active === true ) {
            scene.remove(sharkMesh)
            shark.active = false
            shark.TimeUntilActive = elapsedTime * 1000 + (Math.random() * (12000 - 6000) + 6000)
            uniforms.waterBaseColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterBaseColor)
            uniforms.waterColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterColor)
            uniforms.waterTopColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterTopColor)
            document.querySelector('#sharkAlert').classList.add('visually-hidden')
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
        document.querySelector('#gameUi').classList.remove('visually-hidden')
        document.querySelector('#menu').classList.add('visually-hidden')
        document.querySelector('#gameOverMenu').classList.add('visually-hidden')
        document.querySelector('#gameWonMenu').classList.add('visually-hidden')
        document.querySelector('#totalCollected p').innerHTML = "0/" + maxContainers
        shark.TimeUntilActive = elapsedTime * 1000 + (Math.random() * (12000 - 6000) + 6000)
        score = 0
        containers.forEach(container => {
            scene.remove(container.mesh);
        })
        containers.length = 0
        colectedContainerColors.length = 0
        uniforms.waterBaseColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterBaseColor)
        uniforms.waterColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterColor)
        uniforms.waterTopColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterTopColor)

        generateContainers()
       
        scene.remove(boatMesh)
        boatMesh = createBoat(score, colectedContainerColors).mesh
        boatMesh.position.set(0, 0, 0)
        boatMesh.rotation.set(0, 0, 0)
        scene.add(boatMesh)
        playTime.startTime = elapsedTime
    } else if (state === "gameOver") {
        document.querySelector('#gameUi').classList.add('visually-hidden')
        document.querySelector('#gameOverMenu').classList.remove('visually-hidden')
        document.querySelector('#totalScore').innerHTML = "Score: " + score
        keyPressed.ArrowUp = false
        keyPressed.ArrowDown = false
        keyPressed.ArrowLeft = false
        keyPressed.ArrowRight = false
        boatSpeed = 0;
        boatTilt = 0;

        playTime.endTime = elapsedTime
        console.log(playTime.endTime - playTime.startTime)
    }
    else if (state === "gameWon") {
        const totalTime = Math.round((elapsedTime - playTime.startTime) * 100) / 100 + " Sec"
        document.querySelector('#gameUi').classList.add('visually-hidden')
        document.querySelector('#gameWonMenu').classList.remove('visually-hidden')
        document.querySelector('#totalTime').innerHTML = "Current Time: " + totalTime

        const bestTime = parseFloat(localStorage.getItem("bestTime"));
        if (!isNaN(bestTime)){
            if (parseFloat(totalTime) < bestTime){
                localStorage.setItem("bestTime", totalTime)
                document.querySelector('#bestTime').innerHTML = "Best Time: " + totalTime + " Sec"
            } else {
                document.querySelector('#bestTime').innerHTML = "Best Time: " + bestTime + " Sec"
            }
        } else {
            localStorage.setItem("bestTime", totalTime)
            document.querySelector('#bestTime').innerHTML = "Best Time: " + totalTime + " Sec"
        }

        keyPressed.ArrowUp = false
        keyPressed.ArrowDown = false
        keyPressed.ArrowLeft = false
        keyPressed.ArrowRight = false
        boatSpeed = 0;
        boatTilt = 0;

        playTime.endTime = elapsedTime
    }
}

const handleClickStart = () => {
    setState("game")
}

const getLocalStream = async () =>  {
    /* https://jameshfisher.com/2021/01/18/measuring-audio-volume-in-javascript */
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioContext = new AudioContext();
    const mediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);
    const analyserNode = audioContext.createAnalyser();
    mediaStreamAudioSourceNode.connect(analyserNode);

    const pcmData = new Float32Array(analyserNode.fftSize);
    const onFrame = () => {
        analyserNode.getFloatTimeDomainData(pcmData);
        let sumSquares = 0.0;
        for (const amplitude of pcmData) { sumSquares += amplitude * amplitude; }
        if (sumSquares > 250 && state === "game"){
            scene.remove(sharkMesh)
            shark.active = false
            shark.TimeUntilActive = elapsedTime * 1000 + (Math.random() * (12000 - 6000) + 6000)
            uniforms.waterBaseColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterBaseColor)
            uniforms.waterColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterColor)
            uniforms.waterTopColor.value.set(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)].waterTopColor)
            document.querySelector('#sharkAlert').classList.add('visually-hidden')
        }
        window.requestAnimationFrame(onFrame);
    };
    window.requestAnimationFrame(onFrame);
}

window.addEventListener('resize', resizeRenderer)
window.addEventListener('keydown', handleKeyDown)
window.addEventListener('keyup', handleKeyUp)
document.querySelector('#startButton').addEventListener('click', handleClickStart)
document.querySelector('#playAgainButton').addEventListener('click', handleClickStart)

init();