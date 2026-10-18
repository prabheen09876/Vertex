/* WebGL scene: noise-displaced blob + orbiting satellites + depth particles */
(function(){
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0a, 8, 22);
  const camera = new THREE.PerspectiveCamera(38, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const root = new THREE.Group(); scene.add(root);

  /* --- Blob shader --- */
  const noise = `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }`;

  const blobUniforms = {
    uTime:{value:0}, uAmp:{value:.35}, uFreq:{value:.9}, uSpeed:{value:.35},
    uColA:{value:new THREE.Color('#d8f36a')}, uColB:{value:new THREE.Color('#6a4cff')},
    uColC:{value:new THREE.Color('#0b0b0a')}, uMouse:{value:new THREE.Vector2()}, uHover:{value:0}
  };
  const blobMat = new THREE.ShaderMaterial({
    uniforms: blobUniforms,
    vertexShader: noise + `
      uniform float uTime,uAmp,uFreq,uSpeed,uHover; uniform vec2 uMouse;
      varying vec3 vN; varying vec3 vView; varying float vD;
      float disp(vec3 p){
        float t=uTime*uSpeed;
        float n=snoise(p*uFreq+vec3(t,t*.6,-t*.4));
        n+=.35*snoise(p*uFreq*2.4+vec3(-t*1.3,t,t*.7));
        float m=snoise(p*3.+uTime*1.5)*uHover*.12;
        return n*uAmp+m;
      }
      void main(){
        vec3 p=position; vec3 n=normalize(normal);
        float d=disp(p); vD=d;
        vec3 pos=p+n*d;
        // numeric normal
        vec3 t=normalize(cross(n,vec3(0.,1.,0.)+.0001)); vec3 b=normalize(cross(n,t));
        float e=.01;
        vec3 pa=(p+t*e); pa+=normalize(pa)*disp(pa);
        vec3 pb=(p+b*e); pb+=normalize(pb)*disp(pb);
        vec3 nn=normalize(cross(pa-pos,pb-pos));
        if(dot(nn,n)<0.) nn=-nn;
        vN=normalize(normalMatrix*nn);
        vec4 mv=modelViewMatrix*vec4(pos,1.);
        vView=normalize(-mv.xyz);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform vec3 uColA,uColB,uColC; uniform float uTime;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        vec3 n=normalize(vN);
        float fres=pow(1.-max(dot(n,vView),0.),2.2);
        vec3 L=normalize(vec3(.6,.8,.7));
        float diff=max(dot(n,L),0.);
        vec3 H=normalize(L+vView);
        float spec=pow(max(dot(n,H),0.),60.);
        // iridescent band
        float band=.5+.5*sin(vD*9.+fres*6.+uTime*.4);
        vec3 base=mix(uColC,uColB,smoothstep(-.3,.5,vD));
        base=mix(base,uColA,fres*.9);
        base+=uColA*band*fres*.35;
        vec3 col=base*(.35+.75*diff)+spec*.9+fres*uColA*.25;
        gl_FragColor=vec4(col,1.);
      }`
  });
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 96), blobMat);
  root.add(blob);

  /* --- Ring around the blob --- */
  const ringMat = new THREE.MeshBasicMaterial({color:0xecebe6, transparent:true, opacity:.22});
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, .006, 8, 220), ringMat);
  ring.rotation.x = Math.PI*.42; root.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.1, .004, 8, 220), ringMat.clone());
  ring2.material.opacity=.12; ring2.rotation.x = Math.PI*.55; ring2.rotation.y=.4; root.add(ring2);

  /* --- Satellites (lit) --- */
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4,5,6); scene.add(key);
  const rim = new THREE.PointLight(0x8a6bff, 3, 20); rim.position.set(-5,-2,3); scene.add(rim);
  const lime = new THREE.PointLight(0xd8f36a, 2.2, 18); lime.position.set(5,-3,4); scene.add(lime);

  const sats = [];
  const satDefs = [
    {g:new THREE.TorusGeometry(.42,.16,32,80), c:0xecebe6, r:3.3, sp:.32, y:.6, ph:0},
    {g:new THREE.BoxGeometry(.55,.55,.55), c:0xd8f36a, r:3.0, sp:-.25, y:-.9, ph:2.1},
    {g:new THREE.SphereGeometry(.26,48,48), c:0x7c5cff, r:2.7, sp:.45, y:1.2, ph:4.0},
    {g:new THREE.OctahedronGeometry(.36), c:0xff6a3d, r:3.6, sp:-.18, y:-.2, ph:5.2},
    {g:new THREE.ConeGeometry(.28,.6,40), c:0xecebe6, r:3.9, sp:.22, y:-1.5, ph:1.2},
  ];
  satDefs.forEach(d=>{
    const m = new THREE.Mesh(d.g, new THREE.MeshStandardMaterial({color:d.c, roughness:.28, metalness:.25}));
    m.userData = d; root.add(m); sats.push(m);
  });

  /* --- Particles at multiple depths --- */
  const N = 1400, pos = new Float32Array(N*3), sz = new Float32Array(N);
  for(let i=0;i<N;i++){
    pos[i*3]=(Math.random()-.5)*28; pos[i*3+1]=(Math.random()-.5)*60; pos[i*3+2]=-Math.random()*14+3;
    sz[i]=Math.random()*1.6+.4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(sz,1));
  const pMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    uniforms:{uTime:{value:0}, uPR:{value:renderer.getPixelRatio()}, uCol:{value:new THREE.Color('#ecebe6')}},
    vertexShader:`attribute float size; uniform float uTime,uPR; varying float vA;
      void main(){ vec3 p=position; p.x+=sin(uTime*.2+p.y)*.15;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=size*uPR*(26./-mv.z);
        vA=smoothstep(22.,4.,-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA;
      void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(uCol,(1.-d*2.)*vA*.55); }`
  });
  const particles = new THREE.Points(pGeo, pMat); scene.add(particles);

  /* --- State per section (lerped every frame) --- */
  const S = (o)=>Object.assign({x:0,y:0,z:0,s:1,rx:0,ry:0,amp:.35,freq:.9,speed:.35,ring:1,sat:1,colA:'#d8f36a',colB:'#6a4cff'},o);
  const states = {
    hero:     S({x:1.6, y:.35, s:1.05}),
    marquee:  S({x:1.2, y:.2, s:.9, amp:.5}),
    intro:    S({x:-2.9, y:0, s:.8, amp:.22, freq:1.4, ring:.4, colB:'#2b2a6a'}),
    work:     S({x:0, y:-.1, z:-5, s:1.6, amp:.6, freq:.6, speed:.25, ring:0, sat:.0, colA:'#ecebe6', colB:'#3a3a36'}),
    services: S({x:3.2, y:-.4, s:.75, amp:.3, freq:1.8, speed:.5, ring:.6, sat:.6, colA:'#ff6a3d', colB:'#6a4cff'}),
    para:     S({x:0, y:0, z:-3, s:1.15, amp:.8, freq:.7, ring:1, sat:1.25, colA:'#c6b8ff', colB:'#173a33'}),
    process:  S({x:-3.4, y:1.1, s:.55, amp:.25, ring:.3, sat:.2, colA:'#d8f36a', colB:'#1d1b2b'}),
    pricing:  S({x:0, y:2.6, z:-4, s:1.3, amp:.45, ring:.5, sat:.4, colA:'#d8f36a', colB:'#3d2fbf'}),
    faq:      S({x:-3.6, y:-1.2, s:.6, amp:.2, freq:2.2, ring:0, sat:0, colA:'#ecebe6', colB:'#6a4cff'}),
    cta:      S({x:0, y:0, z:-1.5, s:1.25, amp:.55, freq:1.1, speed:.6, ring:1, sat:1, colA:'#d8f36a', colB:'#7c5cff'}),
  };
  const cur = Object.assign({}, states.hero);
  const tgt = Object.assign({}, states.hero);
  const cA = new THREE.Color(cur.colA), cB = new THREE.Color(cur.colB);
  const tA = new THREE.Color(), tB = new THREE.Color();

  function setState(name){ if(states[name]) Object.assign(tgt, states[name]); }

  /* --- input --- */
  const mouse = {x:0,y:0,sx:0,sy:0}; let hover=0, hoverT=0, scrollY=0, vel=0, intro=0;
  addEventListener('pointermove', e=>{
    mouse.x = e.clientX/innerWidth*2-1; mouse.y = -(e.clientY/innerHeight*2-1);
  });
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();

  addEventListener('resize', ()=>{
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const narrow = ()=> innerWidth < 860;
  const clock = new THREE.Clock(); let last=performance.now(), fpsAcc=0, fpsN=0;
  const fpsEl = document.getElementById('fps'), mxy = document.getElementById('mouseXY');

  function tick(){
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    const k = 1-Math.pow(.025, dt); // smoothing
    for(const key of ['x','y','z','s','rx','ry','amp','freq','speed','ring','sat']) cur[key]+= (tgt[key]-cur[key])*k;
    tA.set(tgt.colA); tB.set(tgt.colB); cA.lerp(tA,k); cB.lerp(tB,k);

    mouse.sx += (mouse.x-mouse.sx)*k*1.4; mouse.sy += (mouse.y-mouse.sy)*k*1.4;
    intro += (1-intro)*k*.6;

    // hover raycast
    mv.set(mouse.x, mouse.y); ray.setFromCamera(mv, camera);
    hoverT = ray.intersectObject(blob).length ? 1 : 0;
    hover += (hoverT-hover)*k*1.5;

    blobUniforms.uTime.value = t;
    blobUniforms.uAmp.value = cur.amp + Math.min(Math.abs(vel)*.004, .35);
    blobUniforms.uFreq.value = cur.freq; blobUniforms.uSpeed.value = cur.speed;
    blobUniforms.uColA.value.copy(cA); blobUniforms.uColB.value.copy(cB);
    blobUniforms.uHover.value = hover;

    const xMul = narrow() ? .25 : 1;
    root.position.set(cur.x*xMul + mouse.sx*.25, cur.y + mouse.sy*.18 + (1-intro)*-3, cur.z);
    const sc = cur.s*(narrow()?.75:1)*(.3+.7*intro)*(1+hover*.04);
    blob.scale.setScalar(sc);
    blob.rotation.y = t*.12 + mouse.sx*.5; blob.rotation.x = mouse.sy*-.4 + scrollY*.0004;

    ring.scale.setScalar(sc*cur.ring + .0001); ring2.scale.setScalar(sc*cur.ring + .0001);
    ring.rotation.z = t*.1; ring2.rotation.z = -t*.07;
    ring.material.opacity = .22*Math.min(cur.ring,1); ring2.material.opacity=.12*Math.min(cur.ring,1);

    sats.forEach(m=>{
      const d=m.userData, a=t*d.sp+d.ph+scrollY*.0006*Math.sign(d.sp);
      const r=d.r*sc*cur.sat;
      m.position.set(Math.cos(a)*r, d.y*sc*cur.sat + Math.sin(t*.8+d.ph)*.15, Math.sin(a)*r*.6);
      m.rotation.x = t*.6+d.ph; m.rotation.y = t*.4;
      m.scale.setScalar(Math.max(Math.min(cur.sat,1.2),0.0001)*sc);
    });

    // particle parallax: scrolls slower than page => depth
    particles.position.y = scrollY*.0035;
    particles.rotation.y = mouse.sx*.06; particles.rotation.x = mouse.sy*-.04;
    pMat.uniforms.uTime.value = t;

    camera.position.x += (mouse.sx*.35 - camera.position.x)*k;
    camera.position.y += (mouse.sy*.25 - camera.position.y)*k;
    camera.lookAt(0,0,0);

    renderer.render(scene, camera);

    // HUD
    const now=performance.now(); fpsAcc+=now-last; fpsN++; last=now;
    if(fpsAcc>500){ if(fpsEl) fpsEl.textContent = Math.round(1000/(fpsAcc/fpsN))+' FPS'; fpsAcc=0; fpsN=0; }
    if(mxy) mxy.textContent = 'X '+mouse.sx.toFixed(2)+' · Y '+mouse.sy.toFixed(2);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.SCENE = {
    setState,
    setScroll(y, v){ scrollY=y; vel=v||0; },
  };
})();
