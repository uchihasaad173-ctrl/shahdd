/* ============================================================
   SHAHD'S ISLAND — engine
   sections:
     0. state
     1. boot / loader
     2. sky canvas (gradients, sun/moon, clouds, stars, birds)
     3. ocean canvas (waves, ripples, foam, fish, floaters)
     4. particles canvas (petals, fireflies, pollen, mist)
     5. day/night cycle driven by scene
     6. HUD (chapters + music + clock)
     7. memories, letters, lightbox (living gallery)
     8. shell mini-game
     9. finale (chest, lanterns, fireworks, collage)
    10. init
   ============================================================ */
(() => {
'use strict';

/* ---------- 0. STATE ---------- */
const CFG = window.ISLAND;
const $  = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const dpr=Math.min(window.devicePixelRatio||1,2);

const STATE = {
  ready:false,
  sceneIndex:0,
  scenes:[],           // {el, key, tod, track}
  todWeights:{morning:0,afternoon:0,golden:0,sunset:0,night:0}, // current interpolation
  tod:'morning',
  progress:0,          // 0..1 across entire journey (raw)
  smoothProgress:0,    // lerped, drives cinematic camera for silky motion
  ripples:[],
  mouseX:innerWidth/2, mouseY:innerHeight/2,
  wayX:innerWidth/2, wayY:innerHeight/2, // lerped wayfinder guide-light position
  velocity:0,          // smoothed scroll velocity, drives parallax intensity
  lastScrollY:0,
  time:0,
  audio:null,
  trackIndex:0,
  muted:false,
  volume:0.55,
  shellsFound:0,
  shellsTotal:0,
  unlocked:new Set(),
  lenis:null,
};

// TIME-OF-DAY PALETTES
const PALETTES = {
  morning:  { top:'#a8dcf0', mid:'#f9d6c0', bot:'#f4c56d', sun:'#fff5c8',   moon:false, sea1:'#3ec1c6', sea2:'#08526b', vignette:.35 },
  afternoon:{ top:'#4fb7e0', mid:'#8fd4ec', bot:'#c9ecf2', sun:'#fff5c8',   moon:false, sea1:'#2fd4c9', sea2:'#0a5570', vignette:.4  },
  golden:   { top:'#e78a4a', mid:'#f4b968', bot:'#ffd28e', sun:'#ffcd7a',   moon:false, sea1:'#f0a458', sea2:'#763c1e', vignette:.5  },
  sunset:   { top:'#5b2a63', mid:'#ff6f61', bot:'#ffb17a', sun:'#ff8a6b',   moon:false, sea1:'#c0525f', sea2:'#2a1a48', vignette:.55 },
  night:    { top:'#040815', mid:'#0a1a3a', bot:'#0d2a48', sun:'#e6ecfa',   moon:true,  sea1:'#0d3d54', sea2:'#020610', vignette:.65 },
};

// map scenes to a TOD progression
const TOD_ORDER = ['morning','afternoon','afternoon','afternoon','golden','golden','sunset','night'];

/* ---------- 1. BOOT ---------- */
function initBoot(){
  const btn = $('#setSail');
  const boot = $('#boot');
  btn.addEventListener('click', ()=>{
    boot.classList.add('hidden');
    // resume audio context by starting music (user gesture required)
    startMusic(true);
    setTimeout(()=>$('#scrollHint').classList.add('show'),1200);
    setTimeout(()=>$('#scrollHint').classList.remove('show'),6000);
  }, {once:true});
}

/* ---------- 2. SKY ---------- */
const sky = { c:null, ctx:null, w:0, h:0, clouds:[], stars:[], birds:[], shootingStar:null };
function initSky(){
  sky.c = $('#skyCanvas');
  sky.ctx = sky.c.getContext('2d');
  resizeSky();
  window.addEventListener('resize', resizeSky);
  // clouds
  sky.clouds = Array.from({length:12},()=>({
    x:rand(0,1), y:rand(.08,.35), s:rand(.6,1.4), sp:rand(.00003,.00008), a:rand(.4,.85)
  }));
  // stars
  sky.stars = Array.from({length:220},()=>({
    x:Math.random(),y:Math.random()*.65, r:rand(.4,1.6), tw:rand(.01,.03), ph:rand(0,Math.PI*2)
  }));
  // birds
  sky.birds = Array.from({length:6},()=>spawnBird());
}
function spawnBird(){
  return { x:rand(-.1,1.1), y:rand(.15,.45), sp:rand(.00012,.00022)*(Math.random()<.5?-1:1), s:rand(.7,1.3), ph:rand(0,Math.PI*2) };
}
function resizeSky(){
  sky.w=sky.c.width=innerWidth*dpr; sky.h=sky.c.height=innerHeight*dpr;
  sky.c.style.width=innerWidth+'px'; sky.c.style.height=innerHeight+'px';
}
function drawSky(t){
  const ctx=sky.ctx, W=sky.w, H=sky.h;
  const P = blendedPalette();
  // gradient
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,P.top);
  g.addColorStop(.55,P.mid);
  g.addColorStop(1,P.bot);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  // stars (night weight)
  const nightW = STATE.todWeights.night;
  if(nightW>0.02){
    ctx.save();ctx.globalAlpha=nightW;
    for(const s of sky.stars){
      const x=s.x*W, y=s.y*H;
      const tw=0.5+0.5*Math.sin(t*s.tw+s.ph);
      ctx.fillStyle=`rgba(255,246,220,${tw})`;
      ctx.beginPath();ctx.arc(x,y,s.r*dpr,0,7);ctx.fill();
    }
    ctx.restore();
  }

  // shooting star
  if(nightW>.6 && !sky.shootingStar && Math.random()<0.003){
    sky.shootingStar={x:rand(.1,.6),y:rand(.05,.25),vx:rand(.008,.014),vy:rand(.003,.007),life:1};
  }
  if(sky.shootingStar){
    const s=sky.shootingStar;
    s.x+=s.vx;s.y+=s.vy;s.life-=.01;
    ctx.save();ctx.globalAlpha=Math.max(0,s.life)*nightW;
    const gx=s.x*W, gy=s.y*H;
    const grad=ctx.createLinearGradient(gx,gy,gx-s.vx*W*10,gy-s.vy*H*10);
    grad.addColorStop(0,'rgba(255,246,220,1)');grad.addColorStop(1,'rgba(255,246,220,0)');
    ctx.strokeStyle=grad;ctx.lineWidth=2*dpr;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx-s.vx*W*10,gy-s.vy*H*10);ctx.stroke();
    ctx.restore();
    if(s.life<=0)sky.shootingStar=null;
  }

  // wayfinding star-line — faint constellation threads connecting the nearest stars,
  // an ocean-voyager touch that appears once night deepens
  if(nightW>0.35){
    ctx.save();
    ctx.globalAlpha = (nightW-0.35)/0.65*0.5;
    ctx.strokeStyle = 'rgba(200,225,255,.9)';
    ctx.lineWidth = 1*dpr;
    const bright = sky.stars.filter(s=>s.r>1.15).slice(0,26);
    for(let i=0;i<bright.length;i++){
      const a = bright[i];
      const ax=a.x*W, ay=a.y*H;
      // connect to nearest neighbour only, forming a sparse wayfinding thread
      let best=null,bd=1e9;
      for(let j=0;j<bright.length;j++){
        if(i===j) continue;
        const b=bright[j];
        const d=(b.x-a.x)**2+(b.y-a.y)**2*4;
        if(d<bd && d<0.02){bd=d;best=b;}
      }
      if(best){
        ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(best.x*W,best.y*H);ctx.stroke();
      }
    }
    ctx.restore();
  }

  // clouds (dim at night)
  const cloudA = 1-nightW*0.8;
  for(const c of sky.clouds){
    c.x+=c.sp;
    if(c.x>1.2) c.x=-.2;
    drawCloud(ctx,c.x*W,c.y*H,c.s*90*dpr,c.a*cloudA);
  }

  // birds
  for(const b of sky.birds){
    b.x+=b.sp;b.ph+=.15;
    if(b.x>1.2||b.x<-.2) Object.assign(b,spawnBird(),{x:b.sp>0?-.1:1.1});
    drawBird(ctx,b.x*W,(b.y+Math.sin(b.ph)*.005)*H,b.s*12*dpr,b.sp<0,1-nightW*.7);
  }
}
function drawCloud(ctx,x,y,r,a){
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.arc(x,y,r*.6,0,7);
  ctx.arc(x+r*.6,y+r*.1,r*.5,0,7);
  ctx.arc(x-r*.6,y+r*.15,r*.45,0,7);
  ctx.arc(x+r*.2,y-r*.25,r*.4,0,7);
  ctx.fill();ctx.restore();
}
function drawBird(ctx,x,y,r,flip,a){
  ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='rgba(30,30,40,.8)';ctx.lineWidth=1.5*dpr;
  ctx.beginPath();
  const f=flip?-1:1;
  ctx.moveTo(x-r*f,y+r*.2);
  ctx.quadraticCurveTo(x-r*.4*f,y-r*.4,x,y);
  ctx.quadraticCurveTo(x+r*.4*f,y-r*.4,x+r*f,y+r*.2);
  ctx.stroke();ctx.restore();
}

function positionSunMoon(){
  const el = $('#sunMoon');
  // sun path: left-morning -> center-noon -> right-sunset -> below horizon at night
  const map = {morning:{x:.2,y:.35,size:280},afternoon:{x:.5,y:.22,size:260},golden:{x:.75,y:.35,size:300},sunset:{x:.88,y:.55,size:320},night:{x:.7,y:.28,size:180}};
  let x=0,y=0,size=0;
  for(const k in map){
    const w=STATE.todWeights[k]||0;
    x += map[k].x*w; y += map[k].y*w; size += map[k].size*w;
  }
  el.style.left = (x*100)+'%';
  el.style.top  = (y*100)+'%';
  el.style.width= el.style.height = size+'px';
  const P = blendedPalette();
  el.classList.toggle('moon', !!P.moon);
}

/* ---------- 3. OCEAN ---------- */
const ocean = { c:null, ctx:null, w:0, h:0, fish:[], flowers:[], leaves:[], whale:null, dolphin:null };
function initOcean(){
  ocean.c = $('#oceanCanvas');
  ocean.ctx = ocean.c.getContext('2d');
  resizeOcean();
  window.addEventListener('resize', resizeOcean);
  // swimming fish
  ocean.fish = Array.from({length:14},()=>spawnFish());
  // floating flowers/leaves
  ocean.flowers = Array.from({length:9},()=>({x:Math.random(),y:rand(.55,.95),r:rand(6,14),sp:rand(.00004,.00012),ph:rand(0,7),hue:rand(0,60),kind:Math.random()<.5?'flower':'leaf'}));

  // cursor ripples
  window.addEventListener('pointermove',e=>{
    STATE.mouseX=e.clientX; STATE.mouseY=e.clientY;
    if(Math.random()<.35)pushRipple(e.clientX,e.clientY);
  });
  window.addEventListener('pointerdown',e=>{
    for(let i=0;i<6;i++)pushRipple(e.clientX+rand(-8,8),e.clientY+rand(-8,8),true);
  });
}
function spawnFish(){
  const yBias = rand(.55,.95);
  return { x:Math.random(), y:yBias, sp:rand(.00008,.00018)*(Math.random()<.5?-1:1),
           s:rand(.7,1.4), ph:rand(0,7), hue:rand(160,220) };
}
function resizeOcean(){
  ocean.w=ocean.c.width=innerWidth*dpr; ocean.h=ocean.c.height=innerHeight*dpr;
  ocean.c.style.width=innerWidth+'px'; ocean.c.style.height=innerHeight+'px';
}
function pushRipple(x,y,big=false){
  STATE.ripples.push({x,y,r:0,mr:big?150:80,a:1,born:performance.now()});
  if(STATE.ripples.length>60)STATE.ripples.shift();
}
function drawOcean(t){
  const ctx=ocean.ctx, W=ocean.w, H=ocean.h;
  ctx.clearRect(0,0,W,H);
  const P = blendedPalette();
  // ocean band lives in bottom 45%
  const oy = H*0.55;
  const oh = H-oy;
  const g = ctx.createLinearGradient(0,oy,0,H);
  g.addColorStop(0,P.sea1);
  g.addColorStop(1,P.sea2);
  ctx.fillStyle=g;ctx.fillRect(0,oy,W,oh);

  // sun/moon reflection
  const sm = document.getElementById('sunMoon').getBoundingClientRect();
  const smx = (sm.left+sm.width/2)*dpr;
  const smyBottom = oy+8;
  ctx.save();
  const rg = ctx.createRadialGradient(smx,smyBottom, 0, smx, smyBottom, sm.width*1.4*dpr);
  const nightW=STATE.todWeights.night;
  const rc = nightW>.5?'rgba(240,240,255,.55)':'rgba(255,220,150,.75)';
  rg.addColorStop(0,rc);
  rg.addColorStop(.4,rc.replace(/,[.\d]+\)/,',.15)'));
  rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalCompositeOperation='screen';
  ctx.fillStyle=rg;
  ctx.beginPath();ctx.ellipse(smx,smyBottom+30*dpr,sm.width*1.1*dpr,oh*.28,0,0,7);ctx.fill();
  ctx.restore();

  // waves — layered sine curves
  const layers = [
    {amp:8,  freq:.006, sp:.0011, y:oy+8,       color:'rgba(255,255,255,.10)'},
    {amp:12, freq:.008, sp:.0016, y:oy+30,      color:'rgba(255,255,255,.08)'},
    {amp:16, freq:.010, sp:.0022, y:oy+H*.15,   color:'rgba(255,255,255,.06)'},
    {amp:22, freq:.013, sp:.0028, y:oy+H*.28,   color:'rgba(255,255,255,.04)'},
  ];
  ctx.save();
  for(const L of layers){
    ctx.beginPath();
    ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=8){
      const y = L.y + Math.sin(x*L.freq + t*L.sp)*L.amp*dpr
                    + Math.sin(x*L.freq*.5 + t*L.sp*.7)*L.amp*.5*dpr;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H);ctx.closePath();
    ctx.fillStyle=L.color;ctx.fill();
  }
  ctx.restore();

  // shimmer specks
  ctx.save();ctx.globalAlpha=.4;
  for(let i=0;i<40;i++){
    const x=((i*173 + t*.05)%W);
    const y=oy+((i*29+t*.02)%oh);
    ctx.fillStyle='rgba(255,255,255,.5)';
    ctx.fillRect(x,y,1.4*dpr,1.4*dpr);
  }
  ctx.restore();

  // floating flowers / leaves
  for(const f of ocean.flowers){
    f.x+=f.sp;
    if(f.x>1.1)f.x=-.1;
    const x=f.x*W, y=(f.y)*H + Math.sin(t*.002+f.ph)*4*dpr;
    if(f.kind==='flower') drawFlower(ctx,x,y,f.r*dpr,f.hue);
    else drawLeaf(ctx,x,y,f.r*dpr);
  }

  // fish
  for(const fi of ocean.fish){
    fi.x+=fi.sp;
    if(fi.x>1.1)fi.x=-.1; if(fi.x<-.1)fi.x=1.1;
    const x=fi.x*W;
    const y=fi.y*H+Math.sin(t*.003+fi.ph)*3*dpr;
    drawFish(ctx,x,y,fi.s*10*dpr,fi.sp<0,fi.hue);
  }

  // whale — occasional jump
  if(!ocean.whale && Math.random()<.0009){
    ocean.whale={x:rand(.1,.9),y:oy/H+.05,ph:0,life:1};
  }
  if(ocean.whale){
    const wh=ocean.whale; wh.ph+=.02; wh.life-=.004;
    const jy = -Math.sin(wh.ph*Math.PI)*40*dpr;
    if(wh.life>0) drawWhale(ctx,wh.x*W,wh.y*H+jy,26*dpr);
    if(wh.life<=0) ocean.whale=null;
  }

  // ripples (cursor) — bioluminescent plankton glow, brighter at night
  const now=performance.now();
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(let i=STATE.ripples.length-1;i>=0;i--){
    const r=STATE.ripples[i];
    const age=(now-r.born)/900;
    r.r=r.mr*age*dpr; r.a=1-age;
    if(age>1){STATE.ripples.splice(i,1);continue;}
    const glowMix = 0.35 + nightW*0.5;
    ctx.strokeStyle=`rgba(${Math.round(255-glowMix*105)},${255},${Math.round(255-glowMix*30)},${r.a*.55})`;
    ctx.lineWidth=1.5*dpr;
    ctx.beginPath();ctx.arc(r.x*dpr,r.y*dpr,r.r,0,7);ctx.stroke();
    // soft glow core near the origin, fades with age
    ctx.fillStyle=`rgba(150,255,235,${r.a*.12})`;
    ctx.beginPath();ctx.arc(r.x*dpr,r.y*dpr,r.r*.4,0,7);ctx.fill();
  }
  ctx.restore();

  // foam edge along top of ocean
  ctx.save();
  const foamY=oy+Math.sin(t*.002)*3*dpr;
  const fg=ctx.createLinearGradient(0,foamY-6,0,foamY+8);
  fg.addColorStop(0,'rgba(255,255,255,0)');
  fg.addColorStop(.5,'rgba(255,255,255,.6)');
  fg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=fg;
  ctx.fillRect(0,foamY-6,W,14);
  ctx.restore();
}
function drawFlower(ctx,x,y,r,hue){
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<5;i++){
    ctx.rotate(Math.PI*2/5);
    ctx.fillStyle=`hsla(${hue},90%,70%,.9)`;
    ctx.beginPath();ctx.ellipse(0,-r*.7,r*.55,r*.85,0,0,7);ctx.fill();
  }
  ctx.fillStyle='#fff2c8';
  ctx.beginPath();ctx.arc(0,0,r*.35,0,7);ctx.fill();
  ctx.restore();
}
function drawLeaf(ctx,x,y,r){
  ctx.save();ctx.translate(x,y);ctx.rotate((x+y)*.001);
  ctx.fillStyle='rgba(70,150,90,.9)';
  ctx.beginPath();ctx.ellipse(0,0,r*1.4,r*.6,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(20,60,30,.8)';ctx.lineWidth=1*dpr;
  ctx.beginPath();ctx.moveTo(-r*1.4,0);ctx.lineTo(r*1.4,0);ctx.stroke();
  ctx.restore();
}
function drawFish(ctx,x,y,r,flip,hue){
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.fillStyle=`hsla(${hue},70%,60%,.9)`;
  ctx.beginPath();ctx.ellipse(0,0,r*1.4,r*.7,0,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(-r*1.4,0);ctx.lineTo(-r*2,-r*.6);ctx.lineTo(-r*2,r*.6);ctx.closePath();ctx.fill();
  ctx.fillStyle='#0a1620';ctx.beginPath();ctx.arc(r*.6,-r*.15,r*.1,0,7);ctx.fill();
  ctx.restore();
}
function drawWhale(ctx,x,y,r){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(30,60,90,.85)';
  ctx.beginPath();ctx.ellipse(0,0,r*2,r*.8,0,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(-r*2,0);ctx.lineTo(-r*2.8,-r*.8);ctx.lineTo(-r*2.8,r*.4);ctx.closePath();ctx.fill();
  // splash
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.4*dpr;
  ctx.beginPath();ctx.moveTo(-r*2,r*.6);ctx.quadraticCurveTo(-r*2.5,r*1.2,-r*3,r*.8);ctx.stroke();
  ctx.restore();
}

/* ---------- 4. PARTICLES ---------- */
const parts = { c:null, ctx:null, w:0, h:0, arr:[], fireflies:[], butterflies:[] };
function initParticles(){
  parts.c = $('#particleCanvas');
  parts.ctx = parts.c.getContext('2d');
  resizeParts();
  window.addEventListener('resize', resizeParts);
  parts.arr = Array.from({length:80},()=>spawnPetal());
  parts.fireflies = Array.from({length:60},()=>spawnFirefly());
  parts.butterflies = Array.from({length:8},()=>spawnButterfly());
}
function resizeParts(){
  parts.w=parts.c.width=innerWidth*dpr; parts.h=parts.c.height=innerHeight*dpr;
  parts.c.style.width=innerWidth+'px'; parts.c.style.height=innerHeight+'px';
}
function spawnPetal(){
  return { x:Math.random(), y:Math.random()-1, vx:rand(-.0002,.0002), vy:rand(.0004,.001),
           r:rand(2,5), hue:rand(340,20+360)%360, sp:rand(.02,.06), ph:rand(0,7), kind:Math.random()<.3?'sparkle':'petal' };
}
function spawnFirefly(){
  return { x:Math.random(), y:rand(.3,.9), ph:rand(0,7), sp:rand(.005,.02), r:rand(1.2,2.4) };
}
function spawnButterfly(){
  return { x:Math.random(), y:rand(.3,.7), vx:rand(-.0004,.0004), vy:rand(-.0003,.0003), ph:rand(0,7), hue:rand(280,340) };
}
function drawParticles(t){
  const ctx=parts.ctx, W=parts.w, H=parts.h;
  ctx.clearRect(0,0,W,H);

  // petals (dayweight strong in morning/afternoon/golden)
  const day = 1-STATE.todWeights.night;
  for(const p of parts.arr){
    p.x+=p.vx; p.y+=p.vy; p.ph+=p.sp;
    if(p.y>1.1){p.y=-.05;p.x=Math.random();}
    const x=(p.x + Math.sin(p.ph)*.01)*W;
    const y=p.y*H;
    if(p.kind==='sparkle'){
      ctx.fillStyle=`rgba(255,240,180,${.6*day})`;
      ctx.beginPath();ctx.arc(x,y,p.r*dpr*.6,0,7);ctx.fill();
    }else{
      ctx.save();ctx.globalAlpha=.75*day;ctx.translate(x,y);ctx.rotate(p.ph);
      ctx.fillStyle=`hsla(${p.hue},90%,72%,.9)`;
      ctx.beginPath();ctx.ellipse(0,0,p.r*dpr*1.4,p.r*dpr*.7,0,0,7);ctx.fill();
      ctx.restore();
    }
  }

  // fireflies at night
  const nightW = STATE.todWeights.night;
  if(nightW>0.05){
    for(const f of parts.fireflies){
      f.ph+=f.sp;
      const x=(f.x + Math.sin(f.ph*.7)*.03)*W;
      const y=(f.y + Math.cos(f.ph*.9)*.02)*H;
      const glow=0.5+0.5*Math.sin(f.ph*4);
      ctx.save();ctx.globalAlpha=nightW*(0.5+0.5*glow);
      const g=ctx.createRadialGradient(x,y,0,x,y,f.r*10*dpr);
      g.addColorStop(0,'rgba(255,240,150,1)');
      g.addColorStop(1,'rgba(255,240,150,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,f.r*10*dpr,0,7);ctx.fill();
      ctx.restore();
    }
  }

  // butterflies during day
  if(day>0.4){
    for(const b of parts.butterflies){
      b.x+=b.vx; b.y+=b.vy; b.ph+=.25;
      if(b.x<0||b.x>1)b.vx*=-1;
      if(b.y<.2||b.y>.7)b.vy*=-1;
      const x=b.x*W, y=b.y*H;
      const flap = Math.abs(Math.sin(b.ph))*.7+.3;
      ctx.save();ctx.globalAlpha=day;
      ctx.fillStyle=`hsla(${b.hue},80%,72%,.9)`;
      ctx.translate(x,y);
      ctx.beginPath();ctx.ellipse(-4*dpr,0,6*dpr*flap,8*dpr,0,0,7);ctx.fill();
      ctx.beginPath();ctx.ellipse(4*dpr,0,6*dpr*flap,8*dpr,0,0,7);ctx.fill();
      ctx.restore();
    }
  }

  // light rays (subtle, top-down) in morning/golden
  const rayW = (STATE.todWeights.morning + STATE.todWeights.golden)*.5;
  if(rayW>0.02){
    ctx.save();
    ctx.globalAlpha=.18*rayW;ctx.globalCompositeOperation='screen';
    const gx = W*0.5;
    for(let i=0;i<6;i++){
      ctx.fillStyle='rgba(255,240,180,.4)';
      ctx.beginPath();
      ctx.moveTo(gx,-20);
      ctx.lineTo(gx-200*dpr + i*60*dpr, H*0.7);
      ctx.lineTo(gx-140*dpr + i*60*dpr, H*0.7);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- 5. DAY / NIGHT ---------- */
function blendedPalette(){
  // interpolate palette based on current todWeights
  const keys = Object.keys(PALETTES);
  let total = 0; for(const k of keys) total += STATE.todWeights[k]||0;
  if(total<0.001) return PALETTES[STATE.tod];
  const out = { top:'', mid:'', bot:'', sun:'', sea1:'', sea2:'', vignette:0, moon:false };
  const acc = { top:[0,0,0], mid:[0,0,0], bot:[0,0,0], sun:[0,0,0], sea1:[0,0,0], sea2:[0,0,0] };
  let vig=0, moonW=0;
  for(const k of keys){
    const w = (STATE.todWeights[k]||0)/total;
    if(w<=0)continue;
    const P = PALETTES[k];
    for(const key of ['top','mid','bot','sun','sea1','sea2']){
      const rgb = hexToRgb(P[key]);
      acc[key][0]+=rgb[0]*w;acc[key][1]+=rgb[1]*w;acc[key][2]+=rgb[2]*w;
    }
    vig += P.vignette*w;
    if(P.moon) moonW+=w;
  }
  for(const key of ['top','mid','bot','sun','sea1','sea2']){
    out[key] = rgbToStr(acc[key]);
  }
  out.vignette=vig; out.moon = moonW>.4;
  return out;
}
function hexToRgb(h){
  const s=h.replace('#','');
  return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];
}
function rgbToStr(r){return `rgb(${r[0]|0},${r[1]|0},${r[2]|0})`;}

function updateTOD(){
  // set weights based on scroll progress across scenes
  const scenes = STATE.scenes;
  if(!scenes.length) return;
  const total = scenes.length-1;
  const virt = STATE.progress*total; // 0..total
  const idx = clamp(Math.floor(virt),0,total-1);
  const frac = clamp(virt-idx,0,1);
  const todA = TOD_ORDER[idx];
  const todB = TOD_ORDER[Math.min(idx+1,TOD_ORDER.length-1)];
  const w = {morning:0,afternoon:0,golden:0,sunset:0,night:0};
  w[todA] += (1-frac);
  w[todB] += frac;
  STATE.todWeights = w;
  const dominant = Object.entries(w).sort((a,b)=>b[1]-a[1])[0][0];
  STATE.tod = dominant;
  const clock = $('#tod'); if(clock) clock.textContent = dominant;
  const vig = $('#vignette');
  const P = blendedPalette();
  vig.style.background = `radial-gradient(120% 90% at 50% 50%,transparent 55%,rgba(0,0,0,${P.vignette}) 100%)`;

  // rainbow briefly during golden->sunset transition
  const rn = $('#rainbow');
  const showBow = (w.golden>.4 && w.sunset>.15) || (w.afternoon>.5 && w.golden>.2);
  rn.classList.toggle('on', showBow);
}

/* ---------- 6. HUD / MUSIC ---------- */
function initHUD(){
  // chapters
  const nav = $('#chapters');
  const indicator = document.createElement('div');
  indicator.className = 'hud-nav-indicator';
  nav.appendChild(indicator);
  STATE.scenes = $$('.scene').map((el,i)=>({
    el, key:el.dataset.scene, tod:el.dataset.tod, track:parseInt(el.dataset.track,10)||0, i
  }));
  STATE.scenes.forEach((s,i)=>{
    const b=document.createElement('button');
    b.textContent = (i+1)+' · '+s.key;
    b.addEventListener('click',()=>scrollToScene(i));
    nav.appendChild(b);
  });
  // controls
  $('#replayBtn').addEventListener('click',()=>scrollToScene(0));
  $('#mPlay').addEventListener('click',toggleMusic);
  $('#mPrev').addEventListener('click',()=>setTrack(STATE.trackIndex-1,true));
  $('#mNext').addEventListener('click',()=>setTrack(STATE.trackIndex+1,true));
  $('#mMute').addEventListener('click',toggleMute);
  $('#mVol').addEventListener('input',e=>{
    STATE.volume=parseFloat(e.target.value);
    if(STATE.audio)STATE.audio.volume = STATE.muted?0:STATE.volume;
  });
}
function initSceneDecor(){
  // split each scene title into per-letter spans for a cinematic cascading reveal
  $$('.scene-title').forEach(title=>{
    const text = title.textContent;
    title.textContent = '';
    let i = 0;
    for(const ch of text){
      const span = document.createElement('span');
      span.className = 'lchar';
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      title.appendChild(span);
      i++;
    }
  });
  // append a drifting wave-motif divider to the base of every scene (voyager aesthetic)
  const waveSVG = `<svg viewBox="0 0 1400 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,60 C 120,110 240,10 360,60 C 480,110 600,10 720,60 C 840,110 960,10 1080,60 C 1200,110 1320,10 1400,60 L1400,120 L0,120 Z"/>
    <path d="M0,80 C 160,40 320,120 480,80 C 640,40 800,120 960,80 C 1120,40 1280,120 1400,80 L1400,120 L0,120 Z" opacity=".5"/>
  </svg>`;
  $$('.scene').forEach(sc=>{
    const div = document.createElement('div');
    div.className = 'wave-divider';
    div.innerHTML = waveSVG;
    sc.appendChild(div);
  });
}

/* ---------- WAYFINDER GUIDE-LIGHT (lerped cursor glow, ocean-voyager touch) ---------- */
function initWayfinder(){
  const el = $('#wayfinder');
  if(!el || matchMedia('(hover:none),(pointer:coarse)').matches) return;
  window.addEventListener('pointermove', e=>{
    STATE.mouseX = e.clientX; STATE.mouseY = e.clientY;
    el.classList.add('show');
  });
  window.addEventListener('pointerleave', ()=>el.classList.remove('show'));
  (function follow(){
    STATE.wayX = lerp(STATE.wayX, STATE.mouseX, 0.12);
    STATE.wayY = lerp(STATE.wayY, STATE.mouseY, 0.12);
    el.style.transform = `translate(${STATE.wayX}px,${STATE.wayY}px) translate(-50%,-50%)`;
    requestAnimationFrame(follow);
  })();
}

function scrollToScene(i){
  const s = STATE.scenes[i]; if(!s) return;
  const y = s.el.getBoundingClientRect().top + window.scrollY - 40;
  if(STATE.lenis) STATE.lenis.scrollTo(y,{duration:1.6});
  else window.scrollTo({top:y,behavior:'smooth'});
}
function updateChapters(){
  const btns = $$('#chapters button');
  btns.forEach((b,i)=>b.classList.toggle('active', i===STATE.sceneIndex));
  const active = btns[STATE.sceneIndex];
  const indicator = $('.hud-nav-indicator');
  if(active && indicator){
    indicator.style.width = active.offsetWidth+'px';
    indicator.style.transform = `translateX(${active.offsetLeft-8}px)`;
  }
}

function startMusic(userGesture=false){
  if(!STATE.audio){
    const a = new Audio();
    a.loop = true;
    a.volume = STATE.volume;
    a.preload = 'auto';
    STATE.audio = a;
    a.addEventListener('error',()=>{ /* silent fail; keep site alive */ });
  }
  setTrack(STATE.trackIndex, userGesture);
}
function setTrack(idx, playNow){
  const list = CFG.tracks; if(!list||!list.length) return;
  const n = ((idx%list.length)+list.length)%list.length;
  STATE.trackIndex = n;
  const t = list[n];
  const a = STATE.audio; if(!a) return;
  if(a.src !== t.src){
    a.src = t.src;
  }
  $('#mTrack').textContent = t.name;
  if(playNow){
    const p = a.play(); if(p&&p.catch) p.catch(()=>{});
    setPlayIcon(true);
  }
}
function toggleMusic(){
  const a = STATE.audio; if(!a) return;
  if(a.paused){ a.play().catch(()=>{}); setPlayIcon(true); }
  else { a.pause(); setPlayIcon(false); }
}
function setPlayIcon(playing){
  const svg = $('#mPlayIcon');
  svg.innerHTML = playing
    ? '<path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
    : '<path fill="currentColor" d="M8 5v14l11-7z"/>';
}
function toggleMute(){
  STATE.muted = !STATE.muted;
  if(STATE.audio) STATE.audio.volume = STATE.muted?0:STATE.volume;
  $('#mMuteIcon').innerHTML = STATE.muted
    ? '<path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5-2 4 4-4 4M20.5 8l-4 4 4 4" stroke="currentColor" stroke-width="1.6" fill="none"/>'
    : '<path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>';
}
function trackForScene(i){
  const s=STATE.scenes[i]; return s?s.track:0;
}
function ensureTrackForScene(){
  const wanted = trackForScene(STATE.sceneIndex);
  if(wanted!==STATE.trackIndex){
    // crossfade: fade out, swap src, fade in
    const a = STATE.audio; if(!a) return;
    const targetVol = STATE.muted?0:STATE.volume;
    const start = a.volume, dur=650, t0=performance.now();
    const step=()=>{
      const k=Math.min(1,(performance.now()-t0)/dur);
      a.volume = start*(1-k);
      if(k<1) requestAnimationFrame(step);
      else{
        setTrack(wanted, !a.paused);
        const t1=performance.now();
        const stepUp=()=>{
          const k2=Math.min(1,(performance.now()-t1)/dur);
          a.volume = targetVol*k2;
          if(k2<1) requestAnimationFrame(stepUp);
        };
        stepUp();
      }
    };
    step();
  }
}

/* ---------- 7. MEMORIES + LETTERS + LIGHTBOX ---------- */
function initGallery(){
  // group memories by scene
  const bySc = {};
  for(const m of CFG.memories){ (bySc[m.scene]=bySc[m.scene]||[]).push(m); }
  for(const sc of STATE.scenes){
    const container = sc.el.querySelector('[data-scene-anchors="'+sc.key+'"]');
    if(!container) continue;
    const arr = bySc[sc.key]||[];
    arr.forEach((m,i)=>{
      const el = document.createElement('div');
      el.className = 'memory h-'+(m.holder||'rope');
      el.style.animationDelay = (i*.3)+'s';
      el.dataset.id = m.id;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.style.backgroundImage = `url("${m.src}")`;
      const cap = document.createElement('div');
      cap.className='cap'; cap.textContent = m.caption||'';
      el.appendChild(thumb); el.appendChild(cap);
      if(m.unlockedBy){
        el.classList.add('locked');
        el.dataset.lock = m.unlockedBy;
      }
      el.addEventListener('click',()=>openMemory(m));
      container.appendChild(el);
    });
  }

  // letters — one bottle/envelope marker per scene
  const byScL = {};
  for(const L of CFG.letters){ byScL[L.scene]=L; }
  for(const sc of STATE.scenes){
    const layer = sc.el.querySelector('.floating-layer');
    const L = byScL[sc.key]; if(!layer||!L) continue;
    const mark = document.createElement('div');
    mark.className = 'letter-marker';
    mark.style.left = (10+Math.random()*80)+'%';
    mark.style.top  = (30+Math.random()*40)+'%';
    mark.innerHTML = `
      <div class="pulse"></div>
      <svg viewBox="0 0 64 64">
        <defs><linearGradient id="lg${sc.i}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#f9efd6"/><stop offset="1" stop-color="#e0c188"/>
        </linearGradient></defs>
        <rect x="6" y="14" width="52" height="36" rx="3" fill="url(#lg${sc.i})" stroke="#7a4a20" stroke-width="1.5"/>
        <path d="M6 14 32 34 58 14" fill="none" stroke="#7a4a20" stroke-width="1.5"/>
        <circle cx="32" cy="40" r="6" fill="#c14028" stroke="#7a1e10" stroke-width="1"/>
        <text x="32" y="43" text-anchor="middle" font-family="serif" font-size="9" fill="#f6ecd6" font-style="italic">S</text>
      </svg>`;
    mark.addEventListener('click',()=>openLetter(L));
    layer.appendChild(mark);
  }
}

function openMemory(m){
  const lb = $('#lightbox');
  const media = $('#lbMedia');
  const cap = $('#lbCaption');
  const when = $('#lbWhen');
  media.innerHTML = '';
  if(m.kind==='video'){
    const v = document.createElement('video');
    v.src = m.src; v.controls = true; v.autoplay = true; v.playsInline = true;
    media.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = m.src; img.alt = m.caption||'memory';
    media.appendChild(img);
  }
  cap.textContent = m.caption || '';
  when.textContent = m.when || '';
  lb.classList.add('open'); lb.setAttribute('aria-hidden','false');
  duckAudio(true);
}
function closeMemory(){
  const lb = $('#lightbox');
  lb.classList.remove('open'); lb.setAttribute('aria-hidden','true');
  $('#lbMedia').innerHTML='';
  duckAudio(false);
}
function openLetter(L){
  $('#letterTitle').textContent = L.title || 'a letter';
  const body = $('#letterBody'); body.innerHTML='';
  (L.body||[]).forEach(p=>{ const el=document.createElement('p'); el.textContent=p; body.appendChild(el); });
  $('#letterSign').textContent = L.signature||'';
  const el = $('#letter'); el.classList.add('open'); el.setAttribute('aria-hidden','false');
  duckAudio(true);
}
function closeLetter(){
  const el = $('#letter'); el.classList.remove('open'); el.setAttribute('aria-hidden','true');
  duckAudio(false);
}
function duckAudio(on){
  const a=STATE.audio; if(!a) return;
  const target = on ? (STATE.muted?0:STATE.volume*.25) : (STATE.muted?0:STATE.volume);
  const start = a.volume, t0=performance.now(), dur=400;
  const step=()=>{
    const k=Math.min(1,(performance.now()-t0)/dur);
    a.volume = lerp(start,target,k);
    if(k<1) requestAnimationFrame(step);
  };
  step();
}
function initModalCloses(){
  $('#lbClose').addEventListener('click',closeMemory);
  $('#letterClose').addEventListener('click',closeLetter);
  document.addEventListener('click',e=>{
    if(e.target.matches('[data-close="1"]')){
      if(e.target.parentElement.id==='lightbox') closeMemory();
      if(e.target.parentElement.id==='letter')   closeLetter();
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ closeMemory(); closeLetter(); }
  });
}

function revealMemoriesInView(){
  const items = $$('.memory');
  const vH = innerHeight;
  for(const m of items){
    const r = m.getBoundingClientRect();
    if(r.top < vH*0.9 && r.bottom > vH*0.1) m.classList.add('reveal');
  }
  const scenes = $$('.scene');
  for(const s of scenes){
    const r = s.getBoundingClientRect();
    if(r.top < vH*0.7 && r.bottom > vH*0.3) s.classList.add('in-view');
  }
}

/* ---------- 8. SHELL MINI-GAME ---------- */
function initShellGame(){
  // scatter 7 shells across scenes as absolute pinned elements
  // NOTE: we don't activate the #game overlay itself; shells live inside .floating-layer per-scene.
  const hud = document.createElement('div');
  hud.className='game-hud';
  hud.innerHTML = `🐚 shells found <span class="count" id="shellCount">0</span> / <span id="shellTotal">0</span>`;
  document.body.appendChild(hud);

  const scenesForShells = STATE.scenes.filter(s=>['ocean','beach','jungle','waterfall','cave','volcano','sunset'].includes(s.key));
  STATE.shellsTotal = scenesForShells.length;
  $('#shellTotal').textContent = STATE.shellsTotal;
  hud.classList.add('show');

  scenesForShells.forEach((sc,i)=>{
    const inner = sc.el.querySelector('.floating-layer');
    const shell = document.createElement('div');
    shell.className = 'shell-target';
    shell.style.left = (10+Math.random()*80)+'%';
    shell.style.top  = (55+Math.random()*30)+'%';
    shell.innerHTML = `
      <svg viewBox="0 0 44 44">
        <defs><linearGradient id="sh${i}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#ffe4c0"/><stop offset="1" stop-color="#f4a06a"/>
        </linearGradient></defs>
        <path d="M22 4 C34 4 40 16 40 26 C40 36 32 40 22 40 C12 40 4 36 4 26 C4 16 10 4 22 4 Z"
              fill="url(#sh${i})" stroke="#c96a3a" stroke-width="1.5"/>
        <path d="M22 4 L18 40 M22 4 L26 40 M22 4 L14 36 M22 4 L30 36" stroke="#c96a3a" stroke-width="1" fill="none" opacity=".6"/>
      </svg>`;
    shell.addEventListener('click',e=>{
      e.stopPropagation();
      shell.style.transition='transform .5s cubic-bezier(.6,.05,.2,1),opacity .5s';
      shell.style.transform='scale(0) rotate(180deg)';
      shell.style.opacity='0';
      STATE.shellsFound++;
      $('#shellCount').textContent = STATE.shellsFound;
      toast(`🐚 ${STATE.shellsFound}/${STATE.shellsTotal}  — ${
        STATE.shellsFound===STATE.shellsTotal
          ? 'a hidden memory awakens…'
          : shellQuip(STATE.shellsFound)}`);
      if(STATE.shellsFound===STATE.shellsTotal){
        STATE.unlocked.add('shells');
        // unlock any memory locked by shells
        $$('.memory.locked').forEach(el=>{
          if(el.dataset.lock==='shells'){
            el.classList.remove('locked');
            el.style.animation='pulse 1.2s ease-in-out 3';
          }
        });
      }
      setTimeout(()=>shell.remove(),600);
    });
    inner.appendChild(shell);
  });
}
function shellQuip(n){
  const q=[
    'the tide approves.',
    'now do a spin.',
    'keep going, curator of tiny sounds.',
    'the island is watching. it likes what it sees.',
    'shahd would be so proud.',
    'one more. i can feel it.'
  ];
  return q[Math.min(n-1,q.length-1)];
}
function toast(msg){
  let t = $('.game-toast');
  if(!t){ t=document.createElement('div'); t.className='game-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'),2400);
}

/* ---------- 9. FINALE ---------- */
const fire = { c:null, ctx:null, particles:[], last:0 };
function initFinale(){
  const chest = $('#openChest');
  if(chest) chest.addEventListener('click', playFinale);
  window.playFinale = playFinale;
  $('#replayFinale').addEventListener('click',()=>{
    $('#finale').classList.remove('open');
    scrollToScene(0);
    setTimeout(()=>{ document.querySelectorAll('.lantern').forEach(l=>l.remove()); },600);
  });
  fire.c = $('#fireCanvas');
  fire.ctx = fire.c.getContext('2d');
  const resizeFire=()=>{
    fire.c.width=innerWidth*dpr; fire.c.height=innerHeight*dpr;
    fire.c.style.width=innerWidth+'px'; fire.c.style.height=innerHeight+'px';
  };
  resizeFire(); window.addEventListener('resize',resizeFire);
}
function showFinale(){
  const veil = $('#finale');
  if(!veil.classList.contains('open')) veil.classList.add('open');
  veil.setAttribute('aria-hidden','false');
  const collage = $('#finaleCollage'); collage.innerHTML = '';
  const pool = CFG.memories.filter(m=>m.kind !== 'video').slice(0,8);
  pool.forEach((m,i)=>{
    const el = document.createElement('div');
    el.className = 'fc';
    el.style.backgroundImage = `url("${m.src}")`;
    const angle = (i/pool.length)*Math.PI*2;
    const rad = 200;
    el.style.setProperty('--x', Math.cos(angle)*rad+'px');
    el.style.setProperty('--y', Math.sin(angle)*rad*.55+'px');
    el.style.setProperty('--r', (angle*180/Math.PI/8)+'deg');
    el.style.transitionDelay = (i*.12)+'s';
    collage.appendChild(el);
  });
  launchLanterns();
  launchFireworks();
  if(STATE.audio){
    const a = STATE.audio;
    const target = STATE.muted ? 0 : Math.min(1, STATE.volume*1.3);
    const start = a.volume, t0 = performance.now();
    const step = ()=>{ const k = Math.min(1, (performance.now()-t0)/1200); a.volume = lerp(start, target, k); if(k<1) requestAnimationFrame(step); };
    step();
  }
}
function playFinale(){
  const letter = Array.isArray(CFG.letters) && CFG.letters.length ? CFG.letters[CFG.letters.length-1] : null;
  if(letter) openLetter(letter);
  showFinale();
}
function launchLanterns(){
  const veil = $('#finale');
  for(let i=0;i<24;i++){
    setTimeout(()=>{
      const l = document.createElement('div');
      l.className='lantern';
      l.style.left = rand(5,95)+'%';
      l.style.setProperty('--drift', rand(-60,60)+'px');
      l.style.animationDuration = rand(9,15)+'s';
      veil.appendChild(l);
      setTimeout(()=>l.remove(), 16000);
    }, i*300);
  }
}
function launchFireworks(){
  fire.particles = [];
  const burst=()=>{
    const cx = rand(.15,.85)*fire.c.width;
    const cy = rand(.15,.5)*fire.c.height;
    const hue = rand(0,360);
    for(let i=0;i<90;i++){
      const a = Math.random()*Math.PI*2;
      const s = rand(2,6);
      fire.particles.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,hue});
    }
  };
  const start = performance.now();
  const loop = ()=>{
    const ctx = fire.ctx; ctx.fillStyle='rgba(4,7,12,.22)';
    ctx.fillRect(0,0,fire.c.width,fire.c.height);
    ctx.globalCompositeOperation='lighter';
    for(let i=fire.particles.length-1;i>=0;i--){
      const p=fire.particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=.06; p.life-=.012;
      if(p.life<=0){ fire.particles.splice(i,1); continue; }
      ctx.fillStyle=`hsla(${p.hue},90%,${60*p.life+30}%,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.4*dpr,0,7); ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
    if(performance.now()-start<14000){
      if(Math.random()<.06) burst();
      requestAnimationFrame(loop);
    }
  };
  burst(); requestAnimationFrame(loop);
}

/* ---------- 10. INIT ---------- */
function initLenis(){
  if(!window.Lenis) return;
  const l = new Lenis({
    duration:1.15,
    easing:t=>Math.min(1, 1.001 - Math.pow(2, -10*t)), // exponential-out — silky, no overshoot
    smoothWheel:true,
    smoothTouch:false,
    wheelMultiplier:1,
    touchMultiplier:1.6,
    infinite:false,
  });
  STATE.lenis = l;
  function raf(t){ l.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
}

function updateProgress(){
  const doc = document.documentElement;
  const scroll = window.scrollY || doc.scrollTop;
  const max = doc.scrollHeight - innerHeight;
  STATE.progress = clamp(scroll/max, 0, 1);

  // smoothed scroll velocity (px/frame), used to add life to parallax + wave layers
  const dv = scroll - STATE.lastScrollY;
  STATE.lastScrollY = scroll;
  STATE.velocity = lerp(STATE.velocity, dv, 0.18);

  // lerp progress itself for buttery, lag-free-feeling camera motion
  STATE.smoothProgress = lerp(STATE.smoothProgress, STATE.progress, 0.085);

  // determine current scene by whichever center is closest to viewport center
  const cy = innerHeight/2;
  let best=0,bestD=1e9;
  STATE.scenes.forEach((s,i)=>{
    const r=s.el.getBoundingClientRect();
    const c=(r.top+r.bottom)/2;
    const d=Math.abs(c-cy);
    if(d<bestD){bestD=d;best=i;}
    // lively skew on the purely decorative wave-divider only (never on interactive layers)
    const wave = s.el.querySelector('.wave-divider');
    if(wave){
      const skew = clamp(STATE.velocity*0.03, -4, 4);
      wave.style.transform = `skewX(${skew}deg)`;
    }
  });
  if(best!==STATE.sceneIndex){
    STATE.sceneIndex = best;
    updateChapters();
    ensureTrackForScene();
  }

  // top scroll-progress bar
  const pf = $('#progressFill'), pg = $('#progressGlow');
  if(pf){ const pct=(STATE.progress*100); pf.style.width=pct+'%'; if(pg) pg.style.left=pct+'%'; }

  // cinematic camera: subtly shift stage, driven by the SMOOTHED progress so it never jitters
  const stage = $('#stage');
  const virt = STATE.smoothProgress;
  const tx = Math.sin(virt*Math.PI*2)*12; // slight lateral drift
  const ty = -virt*20;
  const rot = Math.sin(virt*Math.PI*2)*.4;
  const scale = 1 + virt*0.06;
  stage.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(${rot}deg) scale(${scale})`;
}

function tick(t){
  STATE.time = t;
  updateProgress();
  updateTOD();
  positionSunMoon();
  drawSky(t);
  drawOcean(t);
  drawParticles(t);
  revealMemoriesInView();
  requestAnimationFrame(tick);
}

function init(){
  initBoot();
  initSky();
  initOcean();
  initParticles();
  initHUD();
  initGallery();
  initSceneDecor();
  initWayfinder();
  initModalCloses();
  initShellGame();
  initFinale();
  initLenis();
  updateChapters();
  updateProgress();
  requestAnimationFrame(tick);
  STATE.ready = true;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

})();