import*as e from"https://unpkg.com/three@0.169.0/build/three.module.js";import{OrbitControls as N}from"https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&s(d)}).observe(document,{childList:!0,subtree:!0});function i(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(a){if(a.ep)return;a.ep=!0;const r=i(a);fetch(a.href,r)}})();const D=`precision highp float;

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
`,F=`precision highp float;

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
`,T={iTime:{value:0},iResolution:{value:new e.Vector2(window.innerWidth,window.innerHeight)},uBoatPosition:{value:new e.Vector3(0,0,0)}},W=()=>{const n=new e.PlaneGeometry(2e3,2e3,500,500);n.rotateX(Math.PI/2);const t=new e.RawShaderMaterial({uniforms:T,vertexShader:D,fragmentShader:F,side:e.DoubleSide,glslVersion:e.GLSL3}),i=new e.Mesh(n,t);return i.receiveShadow=!0,{mesh:i}},z=(n=0,t)=>{const i=new e.Object3D,s=new e.CylinderGeometry(10,10,40,50,2,!1,Math.PI*.5,Math.PI*1),a=new e.MeshPhongMaterial({color:"#1f1f1f",flatShading:!0}),r=new e.Mesh(s,a);r.rotateX(-Math.PI/2),r.castShadow=!0,r.receiveShadow=!0,i.add(r);const d=new e.BoxGeometry(20,2,40,1,1,1),b=new e.MeshPhongMaterial({color:"#dedede",flatShading:!0}),P=new e.Mesh(d,b);P.position.y=1,P.castShadow=!0,P.receiveShadow=!0,i.add(P);const B=new e.BoxGeometry(15,15,8,1,1,1),H=new e.MeshPhongMaterial({color:"#dedede",flatShading:!0}),A=new e.Mesh(B,H);A.position.y=2,A.position.z=15,A.castShadow=!0,A.receiveShadow=!0,i.add(A);for(let f=0;f<n;f++){const U=new e.BoxGeometry(8,3,3,1,1,1),G=new e.MeshPhongMaterial({color:t[f],flatShading:!0}),h=new e.Mesh(U,G);f<6||f>11&&f<18?(h.position.x=-5,f>11&&f<18?h.position.z=-15+4*(f-12):h.position.z=-15+4*f):(h.position.x=5,f>17?h.position.z=-15+4*(f-18):h.position.z=-39+4*f),f<12?h.position.y=4:h.position.y=7,h.castShadow=!0,h.receiveShadow=!0,i.add(h)}return{mesh:i}},V=(n="#d2760e")=>{const t=new e.BoxGeometry(24,8,8);t.rotateX(Math.PI/2);const i=new e.MeshPhongMaterial({color:n,flatShading:!0}),s=new e.Mesh(t,i);return s.receiveShadow=!0,{mesh:s}},j=()=>{const n=new e.BoxGeometry(2,12,20);n.rotateX(Math.PI/2);const t=new e.MeshPhongMaterial({color:"#f2ee02",flatShading:!0}),i=new e.Mesh(n,t);return i.receiveShadow=!0,{mesh:i}},Q=document.querySelector("#c"),E=new e.WebGLRenderer({canvas:Q,alpha:!0,antialias:!0});E.shadowMap.enabled=!0;const Y=90,X=window.innerWidth/window.innerHeight,K=1,J=1e4,y=new e.PerspectiveCamera(Y,X,K,J);y.position.set(0,90,0);y.lookAt(0,0,0);const c=new e.Scene;let _,o,p,x,u=0,m=0,v=0,S=0,g="menu",w={active:!1,TimeUntilActive:10};const M=[],L=["#3751cf","#d2760e","#a31010","#afafaf","#dbdada"],R=[],C=new N(y,E.domElement);C.target.set(0,0,0);C.update();let l={ArrowUp:!1,ArrowDown:!1,ArrowRight:!1,ArrowLeft:!1};const q=()=>{for(let n=0;n<24;n++){const t=L[Math.floor(Math.random()*L.length)];x=V(t).mesh,x.position.set((Math.random()-.5)*1e3,0,(Math.random()-.5)*1e3),x.rotation.z=Math.random()*.5,x.rotation.y=Math.random()*100,c.add(x),M.push({mesh:x,color:t})}},Z=()=>{_=W().mesh,_.receiveShadow=!0,c.add(_),o=z(S).mesh,o.receiveShadow=!0,c.add(o),q();const n=new e.DirectionalLight(16777215,1.5);n.position.set(50,100,50),n.castShadow=!0,c.add(n);const t=new e.AmbientLight(16777215,.4);c.add(t),I(),c.background=new e.Color("#255174"),requestAnimationFrame(O)},$=new e.Clock,O=()=>{u=$.getElapsedTime(),T.iTime.value=u,l.ArrowUp&&m<=.25&&(m+=.002),l.ArrowDown&&m>=-.25&&(m-=.001),m!=0&&l.ArrowLeft&&(o.rotation.y+=.002,v<=.1&&(v+=.005)),m!=0&&l.ArrowRight&&(o.rotation.y-=.002,v>=-.1&&(v-=.005)),o.rotation.z=v,o.rotation.x=Math.sin(u)*.15,o.position.y=3.5+Math.sin(u*2)*.5;const n=new e.Vector3(0,0,-1);n.applyQuaternion(o.quaternion),o.position.add(n.clone().multiplyScalar(m)),m>0?m-=5e-4:m<0&&(m+=5e-4),v>0?v-=.0025:v<0&&(v+=.0025);const t=new e.Vector3(0,40,60);t.applyQuaternion(o.quaternion),y.position.copy(o.position.clone().add(t)),y.lookAt(o.position);const i=new e.Box3().setFromObject(o);if(M.forEach((s,a)=>{const r=new e.Box3().setFromObject(s.mesh);if(s.mesh.rotation.x=Math.sin(u)*.15,s.mesh.position.y=3.5+Math.sin(u*2)*.5,i.intersectsBox(r)){c.remove(s.mesh),M.splice(a,1);const d={xPos:o.position.x,yPos:o.position.y,zPos:o.position.z,xRot:o.rotation.x,yRot:o.rotation.y,zRot:o.rotation.z};c.remove(o),S++,R.push(s.color),o=z(S,R).mesh,o.position.set(d.xPos,d.yPos,d.zPos),o.rotation.set(d.xRot,d.yRot,d.zRot),c.add(o),console.log(S)}}),T.uBoatPosition.value.set(o.position.x,o.position.y,o.position.z),g==="game"){if(!w.active&&Math.floor(u*1e3)>w.TimeUntilActive)w.active=!0,p=j().mesh,p.receiveShadow=!0,p.position.set((Math.random()-.5)*1e3,3.5,(Math.random()-.5)*1e3),c.add(p);else if(w.active){const s=new e.Vector3(0,0,-1);s.applyQuaternion(p.quaternion),p.lookAt(o.position),p.position.add(s.clone().multiplyScalar(-.5));const a=new e.Vector3(0,90,120);a.applyQuaternion(o.quaternion),y.position.copy(o.position.clone().add(a)),y.lookAt(o.position);const r=new e.Box3().setFromObject(p);i.intersectsBox(r)&&(k("gameOver"),c.remove(p),w.active=!1)}}E.render(c,y),requestAnimationFrame(O)},I=()=>{const n=E.domElement,t=n.clientWidth*window.devicePixelRatio|0,i=n.clientHeight*window.devicePixelRatio|0;(n.width!==t||n.height!==i)&&(E.setSize(t,i,!1),y.aspect=t/i,y.updateProjectionMatrix())},ee=n=>{g==="game"?(n.key==="ArrowUp"&&(l.ArrowUp=!0),n.key==="ArrowDown"&&(l.ArrowDown=!0),n.key==="ArrowLeft"&&(l.ArrowLeft=!0),n.key==="ArrowRight"&&(l.ArrowRight=!0),n.key===" "&&w.active&&(c.remove(p),w.active=!1,w.TimeUntilActive=u*1e3+(Math.random()*6e3+6e3))):n.key==="Enter"&&k("game")},ne=n=>{g==="game"&&(n.key==="ArrowUp"&&(l.ArrowUp=!1),n.key==="ArrowDown"&&(l.ArrowDown=!1),n.key==="ArrowLeft"&&(l.ArrowLeft=!1),n.key==="ArrowRight"&&(l.ArrowRight=!1))},k=n=>{g=n,g==="menu"?document.querySelector("#menu").classList.remove("visually-hidden"):g==="game"?(document.querySelector("#menu").classList.add("visually-hidden"),w.TimeUntilActive=u*1e3+(Math.random()*6e3+6e3),console.log(u),S=0,M.forEach(t=>{c.remove(t.mesh)}),M.length=0,R.length=0,q(),c.remove(o),o=z(S,R).mesh,o.position.set(0,0,0),o.rotation.set(0,0,0),c.add(o)):g==="gameOver"&&(document.querySelector("#menu").classList.remove("visually-hidden"),l.ArrowUp=!1,l.ArrowDown=!1,l.ArrowLeft=!1,l.ArrowRight=!1,m=0,v=0)},oe=()=>{k("game")};window.addEventListener("resize",I);window.addEventListener("keydown",ee);window.addEventListener("keyup",ne);document.querySelector("#startButton").addEventListener("click",oe);Z();
