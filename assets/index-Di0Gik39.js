import*as n from"https://unpkg.com/three@0.169.0/build/three.module.js";import{OrbitControls as O}from"https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js";(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))m(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const h of r.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&m(h)}).observe(document,{childList:!0,subtree:!0});function a(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerPolicy&&(r.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?r.credentials="include":t.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function m(t){if(t.ep)return;t.ep=!0;const r=a(t);fetch(t.href,r)}})();const b=`precision highp float;

in vec3 position;

out vec2 vUv;
out vec3 vPosition;
out float vWaveHeight;

uniform float iTime;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

void main() {
    vUv = position.xz * 0.5 + 0.5;
    vPosition = position;

    vec3 pos = position;
    float y = 0.0;

    // laag 1
    float freq1 = 0.1;
    float amp1 = 2.0;
    y += sin(pos.x * freq1 + iTime) * amp1;
    y += cos(pos.z * freq1 * 0.7 + iTime * 1.2) * amp1 * 0.5;

    // laag 2 (kortere golven)
    float freq2 = 0.3;
    float amp2 = 0.5;
    y += sin(pos.x * freq2 * 2.3 + iTime * 1.5 + hash(pos.x+pos.z)) * amp2;
    y += cos(pos.z * freq2 * 1.7 + iTime * 1.8 + hash(pos.z-pos.x)) * amp2;

    // laag 3 (nog kortere, fijne rimpels)
    float freq3 = 0.7;
    float amp3 = 0.2;
    y += sin(pos.x * freq3 * 3.5 + iTime * 2.0 + hash(pos.x*0.5)) * amp3;
    y += cos(pos.z * freq3 * 2.5 + iTime * 2.2 + hash(pos.z*0.5)) * amp3;

    pos.y += y;

    vWaveHeight = pos.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`,k=`precision highp float;

uniform vec2 iResolution;
uniform float iTime;

in vec2 vUv;
in vec3 vPosition;
in float vWaveHeight;

out vec4 fragColor; 
      
      // "Seascape" by Alexander Alekseev aka TDM - 2014
      // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
      // Contact: tdmaav@gmail.com
      
      const int NUM_STEPS = 32;
      const float PI	 	= 3.141592;
      const float EPSILON	= 1e-3;
      #define EPSILON_NRM (0.1 / iResolution.x)
      //#define AA

      // sea
      const int ITER_GEOMETRY = 2;
      const int ITER_FRAGMENT = 3;
      const float SEA_HEIGHT = 0.6;
      const float SEA_CHOPPY = 4.0;
      const float SEA_SPEED = 0.8;
      const float SEA_FREQ = 0.16;
      const vec3 SEA_BASE = vec3(0.0,0.09,0.18);
      const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6)*0.6;
      #define SEA_TIME (1.0 + iTime * SEA_SPEED)
      const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

      // math
      mat3 fromEuler(vec3 ang) {
	      vec2 a1 = vec2(sin(ang.x),cos(ang.x));
        vec2 a2 = vec2(sin(ang.y),cos(ang.y));
        vec2 a3 = vec2(sin(ang.z),cos(ang.z));
        mat3 m;
        m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
	      m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
	      m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
	      return m;
      }

      float hash( vec2 p ) {
	      float h = dot(p,vec2(127.1,311.7));
        return fract(sin(h)*43758.5453123);
      }

      float noise( in vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );
	      vec2 u = f*f*(3.0-2.0*f);
        return -1.0+2.0*mix( 
          mix( hash( i + vec2(0.0,0.0) ),
          hash( i + vec2(1.0,0.0) ), u.x),
          mix( hash( i + vec2(0.0,1.0) ),
          hash( i + vec2(1.0,1.0) ), u.x), u.y);
      }

      // lighting
      float diffuse(vec3 n,vec3 l,float p) {
        return pow(dot(n,l) * 0.4 + 0.6,p);
      }

      float specular(vec3 n,vec3 l,vec3 e,float s) {
        float nrm = (s + 8.0) / (PI * 8.0);
        return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
      }

      // sky
      vec3 getSkyColor(vec3 e) {
        e.y = (max(e.y,0.0)*0.8+0.2)*0.8;
        return vec3(pow(1.0-e.y,2.0), 1.0-e.y, 0.6+(1.0-e.y)*0.4) * 1.1;
      }

      // sea
      float sea_octave(vec2 uv, float choppy) {
        uv += noise(uv);
        vec2 wv = 1.0-abs(sin(uv));
        vec2 swv = abs(cos(uv));
        wv = mix(wv,swv,wv);
        return pow(1.0-pow(wv.x * wv.y,0.65),choppy);
      }

      float map(vec3 p) {
        float freq = SEA_FREQ;
        float amp = SEA_HEIGHT;
        float choppy = SEA_CHOPPY;
        vec2 uv = p.xz; uv.x *= 0.75;

        float d, h = 0.0;
        for(int i = 0; i < ITER_GEOMETRY; i++) {
        	d = sea_octave((uv+SEA_TIME)*freq,choppy);
        	d += sea_octave((uv-SEA_TIME)*freq,choppy);
          h += d * amp;
        	uv *= octave_m; freq *= 1.9; amp *= 0.22;
          choppy = mix(choppy,1.0,0.2);
        }
        return p.y - h;
      }

      float map_detailed(vec3 p) {
        float freq = SEA_FREQ;
        float amp = SEA_HEIGHT;
        float choppy = SEA_CHOPPY;
        vec2 uv = p.xz; uv.x *= 0.75;

        float d, h = 0.0;
        for(int i = 0; i < ITER_FRAGMENT; i++) {
        	d = sea_octave((uv+SEA_TIME)*freq,choppy);
        	d += sea_octave((uv-SEA_TIME)*freq,choppy);
            h += d * amp;
        	uv *= octave_m; freq *= 1.9; amp *= 0.22;
            choppy = mix(choppy,1.0,0.2);
        }
        return p.y - h;
      }

      vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {
        float fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
        fresnel = min(fresnel * fresnel * fresnel, 0.5);

        vec3 reflected = getSkyColor(reflect(eye, n));
        vec3 refracted = SEA_BASE + diffuse(n, l, 80.0) * SEA_WATER_COLOR * 0.12;

        vec3 color = mix(refracted, reflected, fresnel);

        float atten = max(1.0 - dot(dist, dist) * 0.001, 0.0);
        color += SEA_WATER_COLOR * (p.y - SEA_HEIGHT) * 0.18 * atten;

        color += specular(n, l, eye, 600.0 * inversesqrt(dot(dist,dist)));

        return color;
      }

      // tracing
      vec3 getNormal(vec3 p, float eps) {
        vec3 n;
        n.y = map_detailed(p);
        n.x = map_detailed(vec3(p.x+eps,p.y,p.z)) - n.y;
        n.z = map_detailed(vec3(p.x,p.y,p.z+eps)) - n.y;
        n.y = eps;
        return normalize(n);
      }

      float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
        float tm = 0.0;
        float tx = 1000.0;
        float hx = map(ori + dir * tx);
        if(hx > 0.0) {
            p = ori + dir * tx;
            return tx;
        }
        float hm = map(ori);
        for(int i = 0; i < NUM_STEPS; i++) {
            float tmid = mix(tm, tx, hm / (hm - hx));
            p = ori + dir * tmid;
            float hmid = map(p);
            if(hmid < 0.0) {
                tx = tmid;
                hx = hmid;
            } else {
               tm = tmid;
                hm = hmid;
            }
            if(abs(hmid) < EPSILON) break;
        }
        return mix(tm, tx, hm / (hm - hx));
      }

      vec3 getPixel(in vec2 coord, float time) {
        vec2 uv = coord / iResolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= iResolution.x / iResolution.y;
        uv.y = -uv.y;

        // ray (camera)
        // vec3 ang = vec3(sin(time*3.0)*0.1,sin(time)*0.2+0.3,time);
        // vec3 ang = vec3(0.0, PI/2.0, 0.0);
        vec3 ang = vec3(0.0, 0.0, 0.0);
        //vec3 ori = vec3(0.0,3.5,time*5.0);
        vec3 ori = vec3(uv.x * 5.0, 5.0, uv.y * 5.0);
        vec3 dir = vec3(0.0, -1.0, 0.0);
        dir = normalize(dir) * fromEuler(ang);

        // tracing
        vec3 p;
        heightMapTracing(ori,dir,p);
        vec3 dist = p - ori;
        vec3 n = getNormal(p, dot(dist,dist) * EPSILON_NRM);
        vec3 light = normalize(vec3(0.0,1.0,0.8));

        // color
        return mix(
          getSkyColor(dir),
          getSeaColor(p,n,light,dir,dist),
        	pow(smoothstep(0.0,-0.02,dir.y),0.2)
        );
      }

      // main
      void main() {
    vec2 fragCoord = (vPosition.xz + 50.0) * (iResolution.x / 100.0);
    vec3 color = getPixel(fragCoord, iTime*0.3);
    float highlight = smoothstep(1.0, 2.0, vWaveHeight);
color += vec3(0.01, 0.3, 0.15) * highlight * 0.13;
    fragColor = vec4(color, 1.0);
}
`,E={iTime:{value:0},iResolution:{value:new n.Vector2(window.innerWidth,window.innerHeight)},uBoatPosition:{value:new n.Vector3(0,0,0)}},q=()=>{const e=new n.PlaneGeometry(2e3,2e3,500,500);e.rotateX(Math.PI/2);const i=new n.RawShaderMaterial({uniforms:E,vertexShader:b,fragmentShader:k,side:n.DoubleSide,glslVersion:n.GLSL3}),a=new n.Mesh(e,i);return a.receiveShadow=!0,{mesh:a}},P=(e=0)=>{const i=new n.Object3D,a=new n.CylinderGeometry(10,10,40,50,2,!1,Math.PI*.5,Math.PI*1),m=new n.MeshPhongMaterial({color:"#1f1f1f",flatShading:!0}),t=new n.Mesh(a,m);t.rotateX(-Math.PI/2),t.castShadow=!0,t.receiveShadow=!0,i.add(t);const r=new n.BoxGeometry(20,2,40,1,1,1),h=new n.MeshPhongMaterial({color:"#dedede",flatShading:!0}),c=new n.Mesh(r,h);c.position.y=1,c.castShadow=!0,c.receiveShadow=!0,i.add(c);const T=new n.BoxGeometry(15,15,8,1,1,1),z=new n.MeshPhongMaterial({color:"#dedede",flatShading:!0}),v=new n.Mesh(T,z);v.position.y=2,v.position.z=15,v.castShadow=!0,v.receiveShadow=!0,i.add(v);const L=["#3751cf","#d2760e","#a31010"];for(let y=0;y<e;y++){const C=new n.BoxGeometry(12,6,6,1,1,1),I=new n.MeshPhongMaterial({color:L[y],flatShading:!0}),u=new n.Mesh(C,I);u.position.y=5,u.position.z=-12+8*y,u.castShadow=!0,u.receiveShadow=!0,i.add(u)}return{mesh:i}},H=()=>{const e=new n.BoxGeometry(20,20,40);e.rotateX(Math.PI/2);const i=new n.MeshPhongMaterial({color:3355443,flatShading:!0}),a=new n.Mesh(e,i);return a.receiveShadow=!0,{mesh:a}},G=document.querySelector("#c"),w=new n.WebGLRenderer({canvas:G,alpha:!0,antialias:!0});w.shadowMap.enabled=!0;const N=90,B=window.innerWidth/window.innerHeight,D=1,U=1e4,p=new n.PerspectiveCamera(N,B,D,U);p.position.set(0,90,0);p.lookAt(0,0,0);const f=new n.Scene;let S,o,x,l=0,d=0,g=0;const A=[],M=new O(p,w.domElement);M.target.set(0,0,0);M.update();let s={ArrowUp:!1,ArrowDown:!1,ArrowRight:!1,ArrowLeft:!1};const F=()=>{S=q().mesh,S.receiveShadow=!0,f.add(S),o=P(g).mesh,o.receiveShadow=!0,f.add(o);for(let a=0;a<3;a++)x=H().mesh,x.position.set((Math.random()-.5)*1e3,3.5,(Math.random()-.5)*1e3),f.add(x),A.push(x);const e=new n.DirectionalLight(16777215,1.5);e.position.set(50,100,50),e.castShadow=!0,e.shadow.mapSize.width=512,e.shadow.mapSize.height=512,e.shadow.camera.near=.5,e.shadow.camera.far=1e3,f.add(e);const i=new n.AmbientLight(16777215,.4);f.add(i),_(),f.background=new n.Color("#255174"),requestAnimationFrame(R)},W=new n.Clock,R=()=>{const e=W.getElapsedTime();E.iTime.value=e,s.ArrowUp&&l<=.25&&(l+=.002),s.ArrowDown&&l>=-.25&&(l-=.001),l!=0&&s.ArrowLeft&&(o.rotation.y+=.002,d<=.1&&(d+=.005)),l!=0&&s.ArrowRight&&(o.rotation.y-=.002,d>=-.1&&(d-=.005)),o.rotation.z=d,o.rotation.x=Math.sin(e)*.15,o.position.y=3.5+Math.sin(e*2)*.5;const i=new n.Vector3(0,0,-1);i.applyQuaternion(o.quaternion),o.position.add(i.clone().multiplyScalar(l)),l>0?l-=5e-4:l<0&&(l+=5e-4),d>0?d-=.0025:d<0&&(d+=.0025);const a=new n.Vector3(0,40,60);a.applyQuaternion(o.quaternion),p.position.copy(o.position.clone().add(a)),p.lookAt(o.position);const m=new n.Box3().setFromObject(o);A.forEach((t,r)=>{const h=new n.Box3().setFromObject(t);if(m.intersectsBox(h)){f.remove(t),A.splice(r,1);const c={xPos:o.position.x,yPos:o.position.y,zPos:o.position.z,xRot:o.rotation.x,yRot:o.rotation.y,zRot:o.rotation.z};f.remove(o),g++,o=P(g).mesh,o.position.set(c.xPos,c.yPos,c.zPos),o.rotation.set(c.xRot,c.yRot,c.zRot),f.add(o),console.log(g)}}),E.uBoatPosition.value.set(o.position.x,o.position.y,o.position.z),w.render(f,p),requestAnimationFrame(R)},_=()=>{const e=w.domElement,i=e.clientWidth*window.devicePixelRatio|0,a=e.clientHeight*window.devicePixelRatio|0;(e.width!==i||e.height!==a)&&(w.setSize(i,a,!1),p.aspect=i/a,p.updateProjectionMatrix())},V=e=>{e.key==="ArrowUp"&&(s.ArrowUp=!0),e.key==="ArrowDown"&&(s.ArrowDown=!0),e.key==="ArrowLeft"&&(s.ArrowLeft=!0),e.key==="ArrowRight"&&(s.ArrowRight=!0)},j=e=>{e.key==="ArrowUp"&&(s.ArrowUp=!1),e.key==="ArrowDown"&&(s.ArrowDown=!1),e.key==="ArrowLeft"&&(s.ArrowLeft=!1),e.key==="ArrowRight"&&(s.ArrowRight=!1)};window.addEventListener("resize",_);window.addEventListener("keydown",V);window.addEventListener("keyup",j);F();
