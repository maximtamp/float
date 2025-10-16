import*as o from"https://unpkg.com/three@0.169.0/build/three.module.js";import{OrbitControls as K}from"https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))d(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const C of s.addedNodes)C.tagName==="LINK"&&C.rel==="modulepreload"&&d(C)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function d(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const J=`precision highp float;

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
`,Z=`precision highp float;

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
`,m={iTime:{value:0},iResolution:{value:new o.Vector2(window.innerWidth,window.innerHeight)},uBoatPosition:{value:new o.Vector3(0,0,0)},waterBaseColor:{value:new o.Color("#093e74")},waterColor:{value:new o.Color("#63773c")},waterTopColor:{value:new o.Color("#135d23")}},$=()=>{const e=new o.PlaneGeometry(1e3,1e3,500,500);e.rotateX(Math.PI/2);const n=new o.RawShaderMaterial({uniforms:m,vertexShader:J,fragmentShader:Z,side:o.DoubleSide,glslVersion:o.GLSL3}),t=new o.Mesh(e,n);return t.receiveShadow=!0,t.castShadow=!0,{mesh:t}},O=(e=0,n)=>{const t=new o.Object3D,d=new o.CylinderGeometry(10,10,40,50,2,!1,Math.PI*.5,Math.PI*1),r=new o.MeshPhongMaterial({color:"#1f1f1f",flatShading:!0}),s=new o.Mesh(d,r);s.rotateX(-Math.PI/2),s.castShadow=!0,s.receiveShadow=!0,t.add(s);const C=new o.BoxGeometry(20,2,40,1,1,1),q=new o.MeshPhongMaterial({color:"#dedede",flatShading:!0}),z=new o.Mesh(C,q);z.position.y=1,z.castShadow=!0,z.receiveShadow=!0,t.add(z);const V=new o.BoxGeometry(15,15,8,1,1,1),Q=new o.MeshPhongMaterial({color:"#dedede",flatShading:!0}),E=new o.Mesh(V,Q);E.position.y=2,E.position.z=15,E.castShadow=!0,E.receiveShadow=!0,t.add(E);for(let v=0;v<e;v++){const X=new o.BoxGeometry(8,3,3,1,1,1),Y=new o.MeshPhongMaterial({color:n[v],flatShading:!0}),g=new o.Mesh(X,Y);v<6||v>11&&v<18?(g.position.x=-5,v>11&&v<18?g.position.z=-15+4*(v-12):g.position.z=-15+4*v):(g.position.x=5,v>17?g.position.z=-15+4*(v-18):g.position.z=-39+4*v),v<12?g.position.y=4:g.position.y=7,g.castShadow=!0,g.receiveShadow=!0,t.add(g)}return{mesh:t}},ee=(e="#d2760e")=>{const n=new o.BoxGeometry(24,8,8);n.rotateX(Math.PI/2);const t=new o.MeshPhongMaterial({color:e,flatShading:!0}),d=new o.Mesh(n,t);return d.receiveShadow=!0,d.castShadow=!0,{mesh:d}},oe=()=>{const e=new o.BoxGeometry(2,12,20);e.rotateX(Math.PI/2);const n=new o.MeshPhongMaterial({color:"#f2ee02",flatShading:!0}),t=new o.Mesh(e,n);return t.receiveShadow=!0,{mesh:t}},te=()=>{const e=new o.Object3D,n=[{x:500,z:0,width:16,length:1016},{x:0,z:500,width:1016,length:16},{x:0,z:-500,width:1016,length:16},{x:-500,z:0,width:16,length:1016}];for(let t=0;t<4;t++){const d=new o.BoxGeometry(n[t].width,n[t].length,16);d.rotateX(Math.PI/2);const r=new o.MeshPhongMaterial({color:"#1a5a99",flatShading:!0}),s=new o.Mesh(d,r);s.position.x=n[t].x,s.position.z=n[t].z,s.castShadow=!0,e.add(s)}return{mesh:e}},ne=document.querySelector("#c"),P=new o.WebGLRenderer({canvas:ne,alpha:!0,antialias:!0});P.shadowMap.enabled=!0;const ae=90,re=window.innerWidth/window.innerHeight,ie=1,se=1e4,y=new o.PerspectiveCamera(ae,re,ie,se);y.position.set(0,90,0);y.lookAt(0,0,0);const f=new o.Scene;let k,a,w,A,B;const R=new o.Box3,I=new o.Box3,H=new o.Box3,U=new o.Box3;let h=0,p=0,S=0,c=0,T={startTime:0,endTime:0},M="menu",x={active:!1,TimeUntilActive:10};const i={default:[{waterBaseColor:"#093e74",waterColor:"#63773c",waterTopColor:"#135d23"},{waterBaseColor:"#1a5a99",waterColor:"#789d50",waterTopColor:"#2b7e36"},{waterBaseColor:"#2b7fbf",waterColor:"#90b66a",waterTopColor:"#3da84a"},{waterBaseColor:"#4ca3e0",waterColor:"#add486",waterTopColor:"#5bcc63"}],red:{waterBaseColor:"#740909",waterColor:"#ad2c2c",waterTopColor:"#6d2222"}},L=[],u=12,D=["#3751cf","#d2760e","#a31010","#afafaf","#dbdada"],_=[],F=new K(y,P.domElement);F.target.set(0,0,0);F.update();let l={ArrowUp:!1,ArrowDown:!1,ArrowRight:!1,ArrowLeft:!1};const N=()=>{for(let e=0;e<u;e++){const n=D[Math.floor(Math.random()*D.length)];A=ee(n).mesh,A.position.set((Math.random()-.5)*450,0,(Math.random()-.5)*450),A.rotation.z=Math.random()*.5,A.rotation.y=Math.random()*100,f.add(A),L.push({mesh:A,color:n})}},le=()=>{fe(),k=$().mesh,k.receiveShadow=!0,f.add(k),a=O(c).mesh,a.receiveShadow=!0,f.add(a),N(),B=te().mesh,B.receiveShadow=!0,f.add(B);const e=new o.DirectionalLight(16777215,1.5);e.position.set(50,100,50),e.castShadow=!0,f.add(e);const n=new o.AmbientLight(16777215,.4);f.add(n),e.shadow.camera.top=2e3,e.shadow.camera.bottom=-2e3,e.shadow.camera.left=-2e3,e.shadow.camera.right=2e3,e.shadow.camera.near=1,e.shadow.camera.far=2e3,e.shadow.mapSize.width=5e3,e.shadow.mapSize.height=5e3,W(),f.background=new o.Color("#255174"),requestAnimationFrame(G)},ce=new o.Clock,G=()=>{h=ce.getElapsedTime(),m.iTime.value=h,l.ArrowUp&&p<=.35&&(p+=.002),l.ArrowDown&&p>=-.35&&(p-=.001),p!=0&&l.ArrowLeft&&(a.rotation.y+=.005,S<=.1&&(S+=.005)),p!=0&&l.ArrowRight&&(a.rotation.y-=.005,S>=-.1&&(S-=.005)),a.rotation.z=S,a.rotation.x=Math.sin(h)*.15,a.position.y=3.5+Math.sin(h*2)*.5;const e=new o.Vector3(0,0,-1);e.applyQuaternion(a.quaternion),a.position.add(e.clone().multiplyScalar(p)),p>0?p-=5e-4:p<0&&(p+=5e-4),S>0?S-=.0025:S<0&&(S+=.0025);const n=new o.Vector3(0,40,60);if(n.applyQuaternion(a.quaternion),y.position.copy(a.position.clone().add(n)),y.lookAt(a.position),R.setFromObject(a),L.forEach((t,d)=>{if(H.setFromObject(t.mesh),t.mesh.rotation.x=Math.sin(h)*.15,t.mesh.position.y=3.5+Math.sin(h*2)*.5,R.intersectsBox(H)){f.remove(t.mesh),L.splice(d,1);const r={xPos:a.position.x,yPos:a.position.y,zPos:a.position.z,xRot:a.rotation.x,yRot:a.rotation.y,zRot:a.rotation.z};f.remove(a),c++,document.querySelector("#totalCollected p").innerHTML=c+"/"+u,_.push(t.color),a=O(c,_).mesh,a.position.set(r.xPos,r.yPos,r.zPos),a.rotation.set(r.xRot,r.yRot,r.zRot),f.add(a),c===u?b("gameWon"):(m.waterBaseColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterBaseColor),m.waterColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterColor),m.waterTopColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterTopColor))}}),m.uBoatPosition.value.set(a.position.x,a.position.y,a.position.z),M==="game"){if(document.querySelector("#timer").innerHTML=Math.round((h-T.startTime)*100)/100,!x.active&&Math.floor(h*1e3)>x.TimeUntilActive)x.active=!0,w=oe().mesh,w.receiveShadow=!0,w.position.set(a.position.x+((Math.random()-.5)*150+100),3.5,a.position.z+((Math.random()-.5)*150+100)),f.add(w),document.querySelector("#sharkAlert").classList.remove("visually-hidden");else if(x.active){const t=new o.Vector3(0,0,-1);t.applyQuaternion(w.quaternion),w.lookAt(a.position),w.position.add(t.clone().multiplyScalar(-.5)),w.rotation.z=Math.sin(h)*.25,y.position.x=a.position.x,y.position.y=150,y.position.z=a.position.z,y.lookAt(a.position),m.waterBaseColor.value.set(i.red.waterBaseColor),m.waterColor.value.set(i.red.waterColor),m.waterTopColor.value.set(i.red.waterTopColor),I.setFromObject(w),R.intersectsBox(I)&&(document.querySelector("#sharkAlert").classList.add("visually-hidden"),b("gameOver"),f.remove(w),x.active=!1)}}B.children.forEach(t=>{U.setFromObject(t),R.intersectsBox(U)&&(p=-p*.5,console.log("appel"))}),P.render(f,y),requestAnimationFrame(G)},W=()=>{const e=P.domElement,n=e.clientWidth*window.devicePixelRatio|0,t=e.clientHeight*window.devicePixelRatio|0;(e.width!==n||e.height!==t)&&(P.setSize(n,t,!1),y.aspect=n/t,y.updateProjectionMatrix())},de=e=>{M==="game"?(e.key==="ArrowUp"&&(l.ArrowUp=!0),e.key==="ArrowDown"&&(l.ArrowDown=!0),e.key==="ArrowLeft"&&(l.ArrowLeft=!0),e.key==="ArrowRight"&&(l.ArrowRight=!0),e.key==="z"&&x.active===!0&&(f.remove(w),x.active=!1,x.TimeUntilActive=h*1e3+(Math.random()*6e3+6e3),m.waterBaseColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterBaseColor),m.waterColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterColor),m.waterTopColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterTopColor),document.querySelector("#sharkAlert").classList.add("visually-hidden"))):e.key==="Enter"&&b("game")},me=e=>{M==="game"&&(e.key==="ArrowUp"&&(l.ArrowUp=!1),e.key==="ArrowDown"&&(l.ArrowDown=!1),e.key==="ArrowLeft"&&(l.ArrowLeft=!1),e.key==="ArrowRight"&&(l.ArrowRight=!1))},b=e=>{if(M=e,M==="menu")document.querySelector("#menu").classList.remove("visually-hidden");else if(M==="game")document.querySelector("#gameUi").classList.remove("visually-hidden"),document.querySelector("#menu").classList.add("visually-hidden"),document.querySelector("#gameOverMenu").classList.add("visually-hidden"),document.querySelector("#gameWonMenu").classList.add("visually-hidden"),document.querySelector("#totalCollected p").innerHTML="0/"+u,x.TimeUntilActive=h*1e3+(Math.random()*6e3+6e3),c=0,L.forEach(n=>{f.remove(n.mesh)}),L.length=0,_.length=0,m.waterBaseColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterBaseColor),m.waterColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterColor),m.waterTopColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterTopColor),N(),f.remove(a),a=O(c,_).mesh,a.position.set(0,0,0),a.rotation.set(0,0,0),f.add(a),T.startTime=h;else if(M==="gameOver")document.querySelector("#gameUi").classList.add("visually-hidden"),document.querySelector("#gameOverMenu").classList.remove("visually-hidden"),document.querySelector("#totalScore").innerHTML="Score: "+c,l.ArrowUp=!1,l.ArrowDown=!1,l.ArrowLeft=!1,l.ArrowRight=!1,p=0,S=0,T.endTime=h,console.log(T.endTime-T.startTime);else if(M==="gameWon"){const n=Math.round((h-T.startTime)*100)/100+" Sec";document.querySelector("#gameUi").classList.add("visually-hidden"),document.querySelector("#gameWonMenu").classList.remove("visually-hidden"),document.querySelector("#totalTime").innerHTML="Current Time: "+n;const t=parseFloat(localStorage.getItem("bestTime"));isNaN(t)||parseFloat(n)<t?(localStorage.setItem("bestTime",n),document.querySelector("#bestTime").innerHTML="Best Time: "+n+" Sec"):document.querySelector("#bestTime").innerHTML="Best Time: "+t+" Sec",l.ArrowUp=!1,l.ArrowDown=!1,l.ArrowLeft=!1,l.ArrowRight=!1,p=0,S=0,T.endTime=h}},j=()=>{b("game")},fe=async()=>{const e=await navigator.mediaDevices.getUserMedia({audio:!0,video:!1}),n=new AudioContext,t=n.createMediaStreamSource(e),d=n.createAnalyser();t.connect(d);const r=new Float32Array(d.fftSize),s=()=>{d.getFloatTimeDomainData(r);let C=0;for(const q of r)C+=q*q;C>250&&M==="game"&&(f.remove(w),x.active=!1,x.TimeUntilActive=h*1e3+(Math.random()*6e3+6e3),m.waterBaseColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterBaseColor),m.waterColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterColor),m.waterTopColor.value.set(i.default[Math.floor(c/u*i.default.length)].waterTopColor),document.querySelector("#sharkAlert").classList.add("visually-hidden")),window.requestAnimationFrame(s)};window.requestAnimationFrame(s)};window.addEventListener("resize",W);window.addEventListener("keydown",de);window.addEventListener("keyup",me);document.querySelector("#startButton").addEventListener("click",j);document.querySelector("#playAgainButton").addEventListener("click",j);le();
