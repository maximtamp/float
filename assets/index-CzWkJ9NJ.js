import*as o from"https://unpkg.com/three@0.169.0/build/three.module.js";import{OrbitControls as j}from"https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function a(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=a(r);fetch(r.href,s)}})();const V=`precision highp float;

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
`,Q=`precision highp float;

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
`,f={iTime:{value:0},iResolution:{value:new o.Vector2(window.innerWidth,window.innerHeight)},uBoatPosition:{value:new o.Vector3(0,0,0)},waterBaseColor:{value:new o.Color("#093e74")},waterColor:{value:new o.Color("#63773c")},waterTopColor:{value:new o.Color("#135d23")}},X=()=>{const e=new o.PlaneGeometry(2e3,2e3,500,500);e.rotateX(Math.PI/2);const n=new o.RawShaderMaterial({uniforms:f,vertexShader:V,fragmentShader:Q,side:o.DoubleSide,glslVersion:o.GLSL3}),a=new o.Mesh(e,n);return a.receiveShadow=!0,a.castShadow=!0,{mesh:a}},k=(e=0,n)=>{const a=new o.Object3D,i=new o.CylinderGeometry(10,10,40,50,2,!1,Math.PI*.5,Math.PI*1),r=new o.MeshPhongMaterial({color:"#1f1f1f",flatShading:!0}),s=new o.Mesh(i,r);s.rotateX(-Math.PI/2),s.castShadow=!0,s.receiveShadow=!0,a.add(s);const d=new o.BoxGeometry(20,2,40,1,1,1),z=new o.MeshPhongMaterial({color:"#dedede",flatShading:!0}),R=new o.Mesh(d,z);R.position.y=1,R.castShadow=!0,R.receiveShadow=!0,a.add(R);const F=new o.BoxGeometry(15,15,8,1,1,1),G=new o.MeshPhongMaterial({color:"#dedede",flatShading:!0}),E=new o.Mesh(F,G);E.position.y=2,E.position.z=15,E.castShadow=!0,E.receiveShadow=!0,a.add(E);for(let h=0;h<e;h++){const N=new o.BoxGeometry(8,3,3,1,1,1),W=new o.MeshPhongMaterial({color:n[h],flatShading:!0}),y=new o.Mesh(N,W);h<6||h>11&&h<18?(y.position.x=-5,h>11&&h<18?y.position.z=-15+4*(h-12):y.position.z=-15+4*h):(y.position.x=5,h>17?y.position.z=-15+4*(h-18):y.position.z=-39+4*h),h<12?y.position.y=4:y.position.y=7,y.castShadow=!0,y.receiveShadow=!0,a.add(y)}return{mesh:a}},Y=(e="#d2760e")=>{const n=new o.BoxGeometry(24,8,8);n.rotateX(Math.PI/2);const a=new o.MeshPhongMaterial({color:e,flatShading:!0}),i=new o.Mesh(n,a);return i.receiveShadow=!0,i.castShadow=!0,{mesh:i}},K=()=>{const e=new o.BoxGeometry(2,12,20);e.rotateX(Math.PI/2);const n=new o.MeshPhongMaterial({color:"#f2ee02",flatShading:!0}),a=new o.Mesh(e,n);return a.receiveShadow=!0,{mesh:a}},J=()=>{const e=new o.Object3D,n=[{x:1e3,z:0,width:16,length:2016},{x:0,z:1e3,width:2016,length:16},{x:0,z:-1e3,width:2016,length:16},{x:-1e3,z:0,width:16,length:2016}];for(let a=0;a<4;a++){const i=new o.BoxGeometry(n[a].width,n[a].length,16);i.rotateX(Math.PI/2);const r=new o.MeshPhongMaterial({color:"#fff",flatShading:!0}),s=new o.Mesh(i,r);s.position.x=n[a].x,s.position.z=n[a].z,s.castShadow=!0,e.add(s)}return{mesh:e}},Z=document.querySelector("#c"),T=new o.WebGLRenderer({canvas:Z,alpha:!0,antialias:!0});T.shadowMap.enabled=!0;const $=90,ee=window.innerWidth/window.innerHeight,oe=1,te=1e4,v=new o.PerspectiveCamera($,ee,oe,te);v.position.set(0,90,0);v.lookAt(0,0,0);const c=new o.Scene;let q,t,p,A,L,m=0,u=0,x=0,C=0,M={startTime:0,endTime:0},S="menu",g={active:!1,TimeUntilActive:10};const w={default:{waterBaseColor:"#093e74",waterColor:"#63773c",waterTopColor:"#135d23"},red:{waterBaseColor:"#740909",waterColor:"#ad2c2c",waterTopColor:"#6d2222"}},P=[],O=["#3751cf","#d2760e","#a31010","#afafaf","#dbdada"],_=[],b=new j(v,T.domElement);b.target.set(0,0,0);b.update();let l={ArrowUp:!1,ArrowDown:!1,ArrowRight:!1,ArrowLeft:!1};const I=()=>{for(let e=0;e<24;e++){const n=O[Math.floor(Math.random()*O.length)];A=Y(n).mesh,A.position.set((Math.random()-.5)*1900,0,(Math.random()-.5)*1900),A.rotation.z=Math.random()*.5,A.rotation.y=Math.random()*100,c.add(A),P.push({mesh:A,color:n})}},ne=()=>{se(),q=X().mesh,q.receiveShadow=!0,c.add(q),t=k(C).mesh,t.receiveShadow=!0,c.add(t),I(),L=J().mesh,L.receiveShadow=!0,c.add(L);const e=new o.DirectionalLight(16777215,1.5);e.position.set(50,100,50),e.castShadow=!0,c.add(e);const n=new o.AmbientLight(16777215,.4);c.add(n),e.shadow.camera.top=2e3,e.shadow.camera.bottom=-2e3,e.shadow.camera.left=-2e3,e.shadow.camera.right=2e3,e.shadow.camera.near=1,e.shadow.camera.far=2e3,e.shadow.mapSize.width=5e3,e.shadow.mapSize.height=5e3,U(),c.background=new o.Color("#255174"),requestAnimationFrame(H)},ae=new o.Clock,H=()=>{m=ae.getElapsedTime(),f.iTime.value=m,l.ArrowUp&&u<=.25&&(u+=.002),l.ArrowDown&&u>=-.25&&(u-=.001),u!=0&&l.ArrowLeft&&(t.rotation.y+=.002,x<=.1&&(x+=.005)),u!=0&&l.ArrowRight&&(t.rotation.y-=.002,x>=-.1&&(x-=.005)),t.rotation.z=x,t.rotation.x=Math.sin(m)*.15,t.position.y=3.5+Math.sin(m*2)*.5;const e=new o.Vector3(0,0,-1);e.applyQuaternion(t.quaternion),t.position.add(e.clone().multiplyScalar(u)),u>0?u-=5e-4:u<0&&(u+=5e-4),x>0?x-=.0025:x<0&&(x+=.0025);const n=new o.Vector3(0,40,60);n.applyQuaternion(t.quaternion),v.position.copy(t.position.clone().add(n)),v.lookAt(t.position);const a=new o.Box3().setFromObject(t);if(P.forEach((i,r)=>{const s=new o.Box3().setFromObject(i.mesh);if(i.mesh.rotation.x=Math.sin(m)*.15,i.mesh.position.y=3.5+Math.sin(m*2)*.5,a.intersectsBox(s)){c.remove(i.mesh),P.splice(r,1);const d={xPos:t.position.x,yPos:t.position.y,zPos:t.position.z,xRot:t.rotation.x,yRot:t.rotation.y,zRot:t.rotation.z};c.remove(t),C++,_.push(i.color),t=k(C,_).mesh,t.position.set(d.xPos,d.yPos,d.zPos),t.rotation.set(d.xRot,d.yRot,d.zRot),c.add(t)}}),f.uBoatPosition.value.set(t.position.x,t.position.y,t.position.z),S==="game"){if(document.querySelector("#timer").innerHTML=Math.round((m-M.startTime)*100)/100,!g.active&&Math.floor(m*1e3)>g.TimeUntilActive)g.active=!0,p=K().mesh,p.receiveShadow=!0,p.position.set(t.position.x+((Math.random()-.5)*150+100),3.5,t.position.z+((Math.random()-.5)*150+100)),c.add(p),document.querySelector("#sharkAlert").classList.remove("visually-hidden");else if(g.active){const i=new o.Vector3(0,0,-1);i.applyQuaternion(p.quaternion),p.lookAt(t.position),p.position.add(i.clone().multiplyScalar(-.5)),p.rotation.z=Math.sin(m)*.25,v.position.x=t.position.x,v.position.y=150,v.position.z=t.position.z,v.lookAt(t.position),f.waterBaseColor.value.set(w.red.waterBaseColor),f.waterColor.value.set(w.red.waterColor),f.waterTopColor.value.set(w.red.waterTopColor);const r=new o.Box3().setFromObject(p);a.intersectsBox(r)&&(document.querySelector("#sharkAlert").classList.add("visually-hidden"),B("gameOver"),c.remove(p),g.active=!1)}}L.children.forEach(i=>{const r=new o.Box3().setFromObject(i);a.intersectsBox(r)&&(u=-u*.5,console.log("appel"))}),T.render(c,v),requestAnimationFrame(H)},U=()=>{const e=T.domElement,n=e.clientWidth*window.devicePixelRatio|0,a=e.clientHeight*window.devicePixelRatio|0;(e.width!==n||e.height!==a)&&(T.setSize(n,a,!1),v.aspect=n/a,v.updateProjectionMatrix())},re=e=>{S==="game"?(e.key==="ArrowUp"&&(l.ArrowUp=!0),e.key==="ArrowDown"&&(l.ArrowDown=!0),e.key==="ArrowLeft"&&(l.ArrowLeft=!0),e.key==="ArrowRight"&&(l.ArrowRight=!0),e.key==="z"&&g.active===!0&&(c.remove(p),g.active=!1,g.TimeUntilActive=m*1e3+(Math.random()*6e3+6e3),f.waterBaseColor.value.set(w.default.waterBaseColor),f.waterColor.value.set(w.default.waterColor),f.waterTopColor.value.set(w.default.waterTopColor),document.querySelector("#sharkAlert").classList.add("visually-hidden"))):e.key==="Enter"&&B("game")},ie=e=>{S==="game"&&(e.key==="ArrowUp"&&(l.ArrowUp=!1),e.key==="ArrowDown"&&(l.ArrowDown=!1),e.key==="ArrowLeft"&&(l.ArrowLeft=!1),e.key==="ArrowRight"&&(l.ArrowRight=!1))},B=e=>{S=e,S==="menu"?document.querySelector("#menu").classList.remove("visually-hidden"):S==="game"?(document.querySelector("#gameUi").classList.remove("visually-hidden"),document.querySelector("#menu").classList.add("visually-hidden"),document.querySelector("#gameOverMenu").classList.add("visually-hidden"),g.TimeUntilActive=m*1e3+(Math.random()*6e3+6e3),C=0,P.forEach(n=>{c.remove(n.mesh)}),P.length=0,_.length=0,f.waterBaseColor.value.set(w.default.waterBaseColor),f.waterColor.value.set(w.default.waterColor),f.waterTopColor.value.set(w.default.waterTopColor),I(),c.remove(t),t=k(C,_).mesh,t.position.set(0,0,0),t.rotation.set(0,0,0),c.add(t),M.startTime=m):S==="gameOver"&&(document.querySelector("#gameUi").classList.add("visually-hidden"),document.querySelector("#gameOverMenu").classList.remove("visually-hidden"),document.querySelector("#totalScore").innerHTML="Score: "+C,document.querySelector("#totalTime").innerHTML=Math.round((m-M.startTime)*100)/100+" Sec",l.ArrowUp=!1,l.ArrowDown=!1,l.ArrowLeft=!1,l.ArrowRight=!1,u=0,x=0,M.endTime=m,console.log(M.endTime-M.startTime))},D=()=>{B("game")},se=async()=>{const e=await navigator.mediaDevices.getUserMedia({audio:!0,video:!1}),n=new AudioContext,a=n.createMediaStreamSource(e),i=n.createAnalyser();a.connect(i);const r=new Float32Array(i.fftSize),s=()=>{i.getFloatTimeDomainData(r);let d=0;for(const z of r)d+=z*z;d>250&&S==="game"&&(c.remove(p),g.active=!1,g.TimeUntilActive=m*1e3+(Math.random()*6e3+6e3),f.waterBaseColor.value.set(w.default.waterBaseColor),f.waterColor.value.set(w.default.waterColor),f.waterTopColor.value.set(w.default.waterTopColor),document.querySelector("#sharkAlert").classList.add("visually-hidden")),window.requestAnimationFrame(s)};window.requestAnimationFrame(s)};window.addEventListener("resize",U);window.addEventListener("keydown",re);window.addEventListener("keyup",ie);document.querySelector("#startButton").addEventListener("click",D);document.querySelector("#playAgainButton").addEventListener("click",D);ne();
