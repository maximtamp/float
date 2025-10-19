import * as THREE from 'three';

import { createSea, uniforms } from './objects/sea';
import { createBoat } from './objects/boat';
import { createContainer } from './objects/container';
import { createShark } from './objects/shark';
import { createBorder } from './objects/border';

import { containerColors, seaColors } from './constants/colors';


/* SOUND EFFECT SETUP */

import collectSoundFile from '../assets/sounds/splach.mp3';
import sharkNearSoundFile from '../assets/sounds/shark-near.mp3';
import hornSoundFile from '../assets/sounds/horn.mp3';
import boatSinkSoundFile from '../assets/sounds/sinking.mp3';
import winSoundFile from '../assets/sounds/win.wav';

const collectSound = new Audio(collectSoundFile);
const sharkNearSound = new Audio(sharkNearSoundFile);
const hornSound = new Audio(hornSoundFile);
const boatSinkSound = new Audio(boatSinkSoundFile);
const winSound = new Audio(winSoundFile);

const playSound = (sound) => {
    sound.currentTime = 0;
    sound.play();
}



/* MIC GLOBALS */

let stream;
let micDenied = false;



/* CANVAS AND RENDER SETUP */

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
})
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(1)
let highQuality = true;

const fov = 90;
const aspect = window.innerWidth / window.innerHeight;
const near = 1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 90, 0);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();



/* GAME GLOBALS AND SETUP */

let state = "menu";
let score = 0;
let elapsedTime = 0
let playTime = {
    startTime: 0,
    endTime: 0
}

let seaMesh, boatMesh, sharkMesh, containerMesh, borderMesh;
const boatBox = new THREE.Box3()
const sharkBox = new THREE.Box3()
const containerBox = new THREE.Box3()
const wallBox = new THREE.Box3()

let boatSpeed = 0;
let boatTilt = 0;

let shark = {
    active: false,
    TimeUntilActive: 10
}

const containers = []
const maxContainers = 12;
const colectedContainerColors = []

let keyPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowRight: false,
    ArrowLeft: false,
}

const clock = new THREE.Clock();



/* CODE */

const setWaterColor = (color) => {
    uniforms.waterBaseColor.value.set(color.waterBaseColor)
    uniforms.waterColor.value.set(color.waterColor)
    uniforms.waterTopColor.value.set(color.waterTopColor)
}

const getLocalStream = async () => {
    /* https://jameshfisher.com/2021/01/18/measuring-audio-volume-in-javascript */
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const audioContext = new AudioContext();
        const mediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);
        const analyserNode = audioContext.createAnalyser();
        mediaStreamAudioSourceNode.connect(analyserNode);

        const pcmData = new Float32Array(analyserNode.fftSize);
        const onFrame = () => {
            analyserNode.getFloatTimeDomainData(pcmData);
            let sumSquares = 0.0;
            for (const amplitude of pcmData) { sumSquares += amplitude * amplitude; }
            if (sumSquares > 100 && state === "game") {
                sharkNearSound.pause()
                playSound(hornSound)

                scene.remove(sharkMesh)
                shark.active = false
                shark.TimeUntilActive = elapsedTime * 1000 + (Math.random() * (12000 - 6000) + 6000)

                setWaterColor(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)])

                document.querySelector('#sharkAlert').classList.add('visually-hidden')
            }
            window.requestAnimationFrame(onFrame);
        };
        window.requestAnimationFrame(onFrame);
    } catch (error) {
        console.error("No mic avilable:", error)
        micDenied = true
    }
}

const generateContainers = () => {
    for (let i = 0; i < maxContainers; i++) {
        const containerColor = containerColors[Math.floor(Math.random() * containerColors.length)]
        containerMesh = createContainer(containerColor).mesh;
        containerMesh.position.set((Math.random() - 0.5) * 600, 0, (Math.random() - 0.5) * 600)
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
    directionalLight.position.set(50, 150, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    directionalLight.shadow.camera.top = 600;
    directionalLight.shadow.camera.bottom = -600;
    directionalLight.shadow.camera.left = -600;
    directionalLight.shadow.camera.right = 600;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 1500;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;

    resizeRenderer()
    scene.background = new THREE.Color("#255174")

    requestAnimationFrame(render);
};

const resetMovement = () => {
    keyPressed.ArrowUp = false
    keyPressed.ArrowDown = false
    keyPressed.ArrowLeft = false
    keyPressed.ArrowRight = false
    boatSpeed = 0;
    boatTilt = 0;
}

const boatReplace = (xPos = 0, yPos = 0, zPos = 0, xRot = 0, yRot = 0, zRot = 0) => {
    scene.remove(boatMesh)
    boatMesh = createBoat(score, colectedContainerColors).mesh
    boatMesh.position.set(xPos, yPos, zPos)
    boatMesh.rotation.set(xRot, yRot, zRot)
    scene.add(boatMesh)
}

const setState = (newState) => {
    state = newState;

    if (state === "menu") {
        document.querySelector('#menu').classList.remove('visually-hidden')
        document.querySelector('#gameOverMenu').classList.add('visually-hidden')
        document.querySelector('#gameWonMenu').classList.add('visually-hidden')
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
        setWaterColor(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)])

        generateContainers()
        boatReplace()

        playTime.startTime = elapsedTime
    } else if (state === "gameOver") {
        document.querySelector('#gameUi').classList.add('visually-hidden')
        document.querySelector('#gameOverMenu').classList.remove('visually-hidden')
        document.querySelector('#totalScore').innerHTML = "Score: " + score

        resetMovement()

        playTime.endTime = elapsedTime
    } else if (state === "gameWon") {
        sharkNearSound.pause()

        const totalTime = Math.round((elapsedTime - playTime.startTime) * 100) / 100
        document.querySelector('#gameUi').classList.add('visually-hidden')
        document.querySelector('#gameWonMenu').classList.remove('visually-hidden')
        document.querySelector('#totalTime').innerHTML = totalTime + " Sec"

        const bestTime = parseFloat(localStorage.getItem("bestTime"));
        if (!isNaN(bestTime)) {
            if (parseFloat(totalTime) < bestTime) {
                localStorage.setItem("bestTime", totalTime)
                document.querySelector('#bestTime').innerHTML = "Best Time: " + totalTime + " Sec"
            } else {
                document.querySelector('#bestTime').innerHTML = "Best Time: " + bestTime + " Sec"
            }
        } else {
            localStorage.setItem("bestTime", totalTime)
            document.querySelector('#bestTime').innerHTML = "Best Time: " + totalTime + " Sec"
        }

        resetMovement()

        playTime.endTime = elapsedTime
    }
}

const boatMovement = () => {
    if (keyPressed.ArrowUp && boatSpeed <= 0.4) {
        boatSpeed += 0.005
    }
    if (keyPressed.ArrowDown && boatSpeed >= -0.3) {
        boatSpeed -= 0.005
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
        boatSpeed -= 0.002
    } else if (boatSpeed < 0) {
        boatSpeed += 0.002
    }

    if (boatTilt > 0) {
        boatTilt -= 0.0025
    } else if (boatTilt < 0) {
        boatTilt += 0.0025
    }
}

const containerColisionChecker = () => {
    containers.forEach((container, index) => {
        containerBox.setFromObject(container.mesh);

        container.mesh.rotation.x = Math.sin(elapsedTime) * 0.15;
        container.mesh.position.y = 3.5 + Math.sin(elapsedTime * 2.0) * 0.5;

        if (boatBox.intersectsBox(containerBox)) {
            scene.remove(container.mesh)
            containers.splice(index, 1)

            playSound(collectSound)
            score++
            document.querySelector('#totalCollected p').innerHTML = score + "/" + maxContainers
            colectedContainerColors.push(container.color)

            boatReplace(boatMesh.position.x, boatMesh.position.y, boatMesh.position.z, boatMesh.rotation.x, boatMesh.rotation.y, boatMesh.rotation.z)

            if (score === maxContainers) {
                playSound(winSound)
                setState("gameWon")
            } else {
                setWaterColor(seaColors.default[Math.floor((score / maxContainers) * seaColors.default.length)])
            }

        }
    })
}

const sharkRun = () => {
    if (state === "game") {
        document.querySelector('#timer').innerHTML = Math.round((elapsedTime - playTime.startTime)) + " Sec"
        if (!shark.active && Math.floor(elapsedTime * 1000) > shark.TimeUntilActive) {
            playSound(sharkNearSound)
            shark.active = true;

            let xPosShark, zPosShark;
            do {
                xPosShark = boatMesh.position.x + (Math.random() * 150 * 2 - 150)
                zPosShark = boatMesh.position.z + (Math.random() * 150 * 2 - 150)
            } while (Math.abs(xPosShark - boatMesh.position.x) < 100 || Math.abs(zPosShark - boatMesh.position.z) < 100 || Math.abs(xPosShark) > 500 || Math.abs(zPosShark) > 500);

            sharkMesh = createShark().mesh;
            sharkMesh.receiveShadow = true
            sharkMesh.position.set(xPosShark, 3.5, zPosShark)
            scene.add(sharkMesh);
            
            document.querySelector('#sharkAlert').classList.remove('visually-hidden')
        } else if (shark.active) {
            const test = new THREE.Vector3(0, 0, -1);
            test.applyQuaternion(sharkMesh.quaternion);
            sharkMesh.lookAt(boatMesh.position);
            sharkMesh.position.add(test.clone().multiplyScalar(-0.7));
            sharkMesh.rotation.z = Math.sin(elapsedTime) * 0.25;

            camera.position.x = boatMesh.position.x
            camera.position.y = 150
            camera.position.z = boatMesh.position.z
            camera.lookAt(boatMesh.position);

            setWaterColor(seaColors.red)

            sharkBox.setFromObject(sharkMesh);
            if (boatBox.intersectsBox(sharkBox)) {
                sharkNearSound.pause()
                playSound(boatSinkSound)

                document.querySelector('#sharkAlert').classList.add('visually-hidden')

                scene.remove(sharkMesh)
                shark.active = false

                setState("gameOver")
            }
        }
    }
}

const borderColisionChecker = () => {
    borderMesh.children.forEach(wall => {
        wallBox.setFromObject(wall);
        if (boatBox.intersectsBox(wallBox)) {
            boatSpeed = -boatSpeed * 0.5;
        }
    })
}

const render = () => {
    elapsedTime = clock.getElapsedTime()
    uniforms.iTime.value = elapsedTime;

    const cameraOffset = new THREE.Vector3(0, 40, 60);
    cameraOffset.applyQuaternion(boatMesh.quaternion);
    camera.position.copy(boatMesh.position.clone().add(cameraOffset));
    camera.lookAt(boatMesh.position);

    boatMovement()

    uniforms.uBoatPosition.value.set(boatMesh.position.x, boatMesh.position.y, boatMesh.position.z);

    boatBox.setFromObject(boatMesh);
    containerColisionChecker()
    sharkRun()
    borderColisionChecker()

    renderer.render(scene, camera);
    requestAnimationFrame(render);
};



/* EVENT LISTENERS */

const resizeRenderer = () => {
    const canvas = renderer.domElement;
    const pixelRatio = highQuality ? 1 : window.devicePixelRatio;

    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;

    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

const handleKeyDown = (e) => {
    if (state === "game") {
        if (e.key === "ArrowUp") {
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
    } else if (e.key === "Enter") {
        handleClickStart()
    }
}

const handleKeyUp = (e) => {
    if (state === "game") {
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

const handleClickStart = async () => {
    if(micDenied) {
        alert("A mic is requerd to play this game! You have blocked it, Allow the mic to continue")
    } else {
        setState("game");
    }
}

const handleClickAgain = () => {
    setState("game");
}

const handleClickHome = () => {
    setState("menu");
}

const handleClickPerformance = () => {
    highQuality = !highQuality;

    if (highQuality) {
        renderer.setPixelRatio(1)
    } else {
        renderer.setPixelRatio(window.devicePixelRatio)
    }

    const canvas = renderer.domElement;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer)
window.addEventListener('keydown', handleKeyDown)
window.addEventListener('keyup', handleKeyUp)

document.querySelector('#startButton').addEventListener('click', handleClickStart)
document.querySelectorAll('#playAgainButton').forEach(button => {
    button.addEventListener('click', handleClickAgain)
});
document.querySelectorAll('#backHomeButton').forEach(button => {
    button.addEventListener('click', handleClickHome)
});
document.querySelector('#toggleQuality').addEventListener('change', handleClickPerformance)

init();