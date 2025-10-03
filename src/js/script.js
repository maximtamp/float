import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import { createSea, uniforms } from './objects/sea';
import { createBoat } from './objects/boat';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
})

const fov = 90;
const aspect = window.innerWidth / window.innerHeight;
const near = 1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 90, 0);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();

let seaMesh, boatMesh;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

const init = () => {
    seaMesh = createSea().mesh;
    scene.add(seaMesh);

    boatMesh = createBoat().mesh;

    boatMesh.position.set(0, -200, 0);

    boatMesh.rotation.x = Math.PI / 6;
    boatMesh.rotation.y = Math.PI;

    scene.add(boatMesh);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    resizeRenderer()

    requestAnimationFrame(render);
};
const clock = new THREE.Clock();

const render = () => {
    const elapsedTime = clock.getElapsedTime()
    uniforms.iTime.value = elapsedTime;

    boatMesh.position.y = 3.5 + Math.sin(elapsedTime * 2.0) * 0.5;
    boatMesh.rotation.z = Math.sin(elapsedTime) * 0.15;

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

window.addEventListener('resize', resizeRenderer)

init();