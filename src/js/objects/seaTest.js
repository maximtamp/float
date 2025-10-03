// objects/sea.js
import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

export const uniforms = {
    iTime: { value: 0 }
};

export function createSea() {
    const geometry = new THREE.PlaneGeometry(1000, 1000, 256, 256);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
        vertexShader: `
      uniform float iTime;
      varying float vWave;
      
      void main() {
        vec3 pos = position;
        // eenvoudige golfbeweging
        float freq = 0.1;
        float amp = 2.0;
        pos.y += sin(pos.x * freq + iTime) * amp;
        pos.y += cos(pos.z * freq * 0.7 + iTime * 1.2) * amp * 0.5;
        
        vWave = pos.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
        fragmentShader: `
      varying float vWave;
      void main() {
        // simpele kleur afhankelijk van hoogte
        vec3 waterColor = mix(vec3(0.0, 0.2, 0.5), vec3(0.0, 0.4, 0.8), (vWave + 2.0) / 4.0);
        gl_FragColor = vec4(waterColor, 1.0);
      }
    `,
        uniforms,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return { mesh };
}
