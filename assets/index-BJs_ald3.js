import*as e from"https://unpkg.com/three@0.169.0/build/three.module.js";import{OrbitControls as F}from"https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function a(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=a(r);fetch(r.href,s)}})();const G=`precision highp float;

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
`,W=`precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 waterColor;
uniform vec3 waterBaseColor;
uniform vec3 waterTopColor;

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
      #define SEA_BASE waterBaseColor
      #define SEA_WATER_COLOR waterColor
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
color += waterTopColor * highlight * 0.13;
    fragColor = vec4(color, 1.0);
}
`,v={iTime:{value:0},iResolution:{value:new e.Vector2(window.innerWidth,window.innerHeight)},uBoatPosition:{value:new e.Vector3(0,0,0)},waterBaseColor:{value:new e.Color("#093e74")},waterColor:{value:new e.Color("#63773c")},waterTopColor:{value:new e.Color("#135d23")}},V=()=>{const o=new e.PlaneGeometry(2e3,2e3,500,500);o.rotateX(Math.PI/2);const n=new e.RawShaderMaterial({uniforms:v,vertexShader:G,fragmentShader:W,side:e.DoubleSide,glslVersion:e.GLSL3}),a=new e.Mesh(o,n);return a.receiveShadow=!0,{mesh:a}},L=(o=0,n)=>{const a=new e.Object3D,i=new e.CylinderGeometry(10,10,40,50,2,!1,Math.PI*.5,Math.PI*1),r=new e.MeshPhongMaterial({color:"#1f1f1f",flatShading:!0}),s=new e.Mesh(i,r);s.rotateX(-Math.PI/2),s.castShadow=!0,s.receiveShadow=!0,a.add(s);const d=new e.BoxGeometry(20,2,40,1,1,1),P=new e.MeshPhongMaterial({color:"#dedede",flatShading:!0}),R=new e.Mesh(d,P);R.position.y=1,R.castShadow=!0,R.receiveShadow=!0,a.add(R);const H=new e.BoxGeometry(15,15,8,1,1,1),U=new e.MeshPhongMaterial({color:"#dedede",flatShading:!0}),E=new e.Mesh(H,U);E.position.y=2,E.position.z=15,E.castShadow=!0,E.receiveShadow=!0,a.add(E);for(let m=0;m<o;m++){const D=new e.BoxGeometry(8,3,3,1,1,1),N=new e.MeshPhongMaterial({color:n[m],flatShading:!0}),h=new e.Mesh(D,N);m<6||m>11&&m<18?(h.position.x=-5,m>11&&m<18?h.position.z=-15+4*(m-12):h.position.z=-15+4*m):(h.position.x=5,m>17?h.position.z=-15+4*(m-18):h.position.z=-39+4*m),m<12?h.position.y=4:h.position.y=7,h.castShadow=!0,h.receiveShadow=!0,a.add(h)}return{mesh:a}},j=(o="#d2760e")=>{const n=new e.BoxGeometry(24,8,8);n.rotateX(Math.PI/2);const a=new e.MeshPhongMaterial({color:o,flatShading:!0}),i=new e.Mesh(n,a);return i.receiveShadow=!0,{mesh:i}},Q=()=>{const o=new e.BoxGeometry(2,12,20);o.rotateX(Math.PI/2);const n=new e.MeshPhongMaterial({color:"#f2ee02",flatShading:!0}),a=new e.Mesh(o,n);return a.receiveShadow=!0,{mesh:a}},Y=document.querySelector("#c"),C=new e.WebGLRenderer({canvas:Y,alpha:!0,antialias:!0});C.shadowMap.enabled=!0;const X=90,K=window.innerWidth/window.innerHeight,J=1,Z=1e4,p=new e.PerspectiveCamera(X,K,J,Z);p.position.set(0,90,0);p.lookAt(0,0,0);const c=new e.Scene;let z,t,u,M,w=0,f=0,y=0,A=0,S="menu",x={active:!1,TimeUntilActive:10};const g={default:{waterBaseColor:"#093e74",waterColor:"#63773c",waterTopColor:"#135d23"},red:{waterBaseColor:"#740909",waterColor:"#ad2c2c",waterTopColor:"#6d2222"}},T=[],k=["#3751cf","#d2760e","#a31010","#afafaf","#dbdada"],_=[],O=new F(p,C.domElement);O.target.set(0,0,0);O.update();let l={ArrowUp:!1,ArrowDown:!1,ArrowRight:!1,ArrowLeft:!1};const B=()=>{for(let o=0;o<24;o++){const n=k[Math.floor(Math.random()*k.length)];M=j(n).mesh,M.position.set((Math.random()-.5)*1e3,0,(Math.random()-.5)*1e3),M.rotation.z=Math.random()*.5,M.rotation.y=Math.random()*100,c.add(M),T.push({mesh:M,color:n})}},$=()=>{ae(),z=V().mesh,z.receiveShadow=!0,c.add(z),t=L(A).mesh,t.receiveShadow=!0,c.add(t),B();const o=new e.DirectionalLight(16777215,1.5);o.position.set(50,100,50),o.castShadow=!0,c.add(o);const n=new e.AmbientLight(16777215,.4);c.add(n),b(),c.background=new e.Color("#255174"),requestAnimationFrame(I)},ee=new e.Clock,I=()=>{w=ee.getElapsedTime(),v.iTime.value=w,l.ArrowUp&&f<=.25&&(f+=.002),l.ArrowDown&&f>=-.25&&(f-=.001),f!=0&&l.ArrowLeft&&(t.rotation.y+=.002,y<=.1&&(y+=.005)),f!=0&&l.ArrowRight&&(t.rotation.y-=.002,y>=-.1&&(y-=.005)),t.rotation.z=y,t.rotation.x=Math.sin(w)*.15,t.position.y=3.5+Math.sin(w*2)*.5;const o=new e.Vector3(0,0,-1);o.applyQuaternion(t.quaternion),t.position.add(o.clone().multiplyScalar(f)),f>0?f-=5e-4:f<0&&(f+=5e-4),y>0?y-=.0025:y<0&&(y+=.0025);const n=new e.Vector3(0,40,60);n.applyQuaternion(t.quaternion),p.position.copy(t.position.clone().add(n)),p.lookAt(t.position);const a=new e.Box3().setFromObject(t);if(T.forEach((i,r)=>{const s=new e.Box3().setFromObject(i.mesh);if(i.mesh.rotation.x=Math.sin(w)*.15,i.mesh.position.y=3.5+Math.sin(w*2)*.5,a.intersectsBox(s)){c.remove(i.mesh),T.splice(r,1);const d={xPos:t.position.x,yPos:t.position.y,zPos:t.position.z,xRot:t.rotation.x,yRot:t.rotation.y,zRot:t.rotation.z};c.remove(t),A++,_.push(i.color),t=L(A,_).mesh,t.position.set(d.xPos,d.yPos,d.zPos),t.rotation.set(d.xRot,d.yRot,d.zRot),c.add(t),console.log(A)}}),v.uBoatPosition.value.set(t.position.x,t.position.y,t.position.z),S==="game"){if(!x.active&&Math.floor(w*1e3)>x.TimeUntilActive)x.active=!0,u=Q().mesh,u.receiveShadow=!0,u.position.set(t.position.x+((Math.random()-.5)*150+100),3.5,t.position.z+((Math.random()-.5)*150+100)),c.add(u),document.querySelector("#sharkAlert").classList.remove("visually-hidden");else if(x.active){const i=new e.Vector3(0,0,-1);i.applyQuaternion(u.quaternion),u.lookAt(t.position),u.position.add(i.clone().multiplyScalar(-.5)),u.rotation.z=Math.sin(w)*.25,p.position.x=t.position.x,p.position.y=150,p.position.z=t.position.z,p.lookAt(t.position),v.waterBaseColor.value.set(g.red.waterBaseColor),v.waterColor.value.set(g.red.waterColor),v.waterTopColor.value.set(g.red.waterTopColor);const r=new e.Box3().setFromObject(u);a.intersectsBox(r)&&(document.querySelector("#sharkAlert").classList.add("visually-hidden"),q("gameOver"),c.remove(u),x.active=!1)}}C.render(c,p),requestAnimationFrame(I)},b=()=>{const o=C.domElement,n=o.clientWidth*window.devicePixelRatio|0,a=o.clientHeight*window.devicePixelRatio|0;(o.width!==n||o.height!==a)&&(C.setSize(n,a,!1),p.aspect=n/a,p.updateProjectionMatrix())},oe=o=>{S==="game"?(o.key==="ArrowUp"&&(l.ArrowUp=!0),o.key==="ArrowDown"&&(l.ArrowDown=!0),o.key==="ArrowLeft"&&(l.ArrowLeft=!0),o.key==="ArrowRight"&&(l.ArrowRight=!0)):o.key==="Enter"&&q("game")},te=o=>{S==="game"&&(o.key==="ArrowUp"&&(l.ArrowUp=!1),o.key==="ArrowDown"&&(l.ArrowDown=!1),o.key==="ArrowLeft"&&(l.ArrowLeft=!1),o.key==="ArrowRight"&&(l.ArrowRight=!1))},q=o=>{S=o,S==="menu"?document.querySelector("#menu").classList.remove("visually-hidden"):S==="game"?(document.querySelector("#menu").classList.add("visually-hidden"),document.querySelector("#gameOverMenu").classList.add("visually-hidden"),x.TimeUntilActive=w*1e3+(Math.random()*6e3+6e3),console.log(w),A=0,T.forEach(n=>{c.remove(n.mesh)}),T.length=0,_.length=0,v.waterBaseColor.value.set(g.default.waterBaseColor),v.waterColor.value.set(g.default.waterColor),v.waterTopColor.value.set(g.default.waterTopColor),B(),c.remove(t),t=L(A,_).mesh,t.position.set(0,0,0),t.rotation.set(0,0,0),c.add(t)):S==="gameOver"&&(document.querySelector("#gameOverMenu").classList.remove("visually-hidden"),document.querySelector("#gameOverMenu p").innerHTML="Score: "+A,l.ArrowUp=!1,l.ArrowDown=!1,l.ArrowLeft=!1,l.ArrowRight=!1,f=0,y=0)},ne=()=>{q("game")},ae=async()=>{const o=await navigator.mediaDevices.getUserMedia({audio:!0,video:!1}),n=new AudioContext,a=n.createMediaStreamSource(o),i=n.createAnalyser();a.connect(i);const r=new Float32Array(i.fftSize),s=()=>{i.getFloatTimeDomainData(r);let d=0;for(const P of r)d+=P*P;d>300&&S==="game"&&(c.remove(u),x.active=!1,x.TimeUntilActive=w*1e3+(Math.random()*6e3+6e3),v.waterBaseColor.value.set(g.default.waterBaseColor),v.waterColor.value.set(g.default.waterColor),v.waterTopColor.value.set(g.default.waterTopColor),document.querySelector("#sharkAlert").classList.add("visually-hidden")),window.requestAnimationFrame(s)};window.requestAnimationFrame(s)};window.addEventListener("resize",b);window.addEventListener("keydown",oe);window.addEventListener("keyup",te);document.querySelector("#startButton").addEventListener("click",ne);$();
