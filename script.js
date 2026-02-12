const TARGET_SAVED = 2500;
const FULL_SCALE = 5000;

const FILL_DURATION_MS = 2500;
const COUNT_DURATION_MS = 2200;

const NUM_FLOATERS = 18;

const BOUNDS = {
  left: 170,
  right: 342,
  top: 95,
  bottom: 470
};

const countEl = document.getElementById("count");
const waterRect = document.getElementById("waterRect");
const wavePath = document.getElementById("wavePath");
const floatersG = document.getElementById("floaters");
const replayBtn = document.getElementById("replay");

let startTime = 0;
let fillNow = 0;
let floaters = [];
let wavePhase = 0;

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const easeOut = t=>1-Math.pow(1-t,3);
const easeInOut = t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

function format(n){ return n.toLocaleString(); }

function createFloaters(){
  floatersG.innerHTML="";
  floaters=[];

  for(let i=0;i<NUM_FLOATERS;i++){
    const g=document.createElementNS("http://www.w3.org/2000/svg","g");
    const use=document.createElementNS("http://www.w3.org/2000/svg","use");
    use.setAttribute("href","#miniBottle");
    g.appendChild(use);
    floatersG.appendChild(g);

    floaters.push({
      g,
      x:BOUNDS.left+Math.random()*(BOUNDS.right-BOUNDS.left),
      y:BOUNDS.bottom-20-Math.random()*100,
      speed:0.2+Math.random()*0.3,
      drift:(Math.random()-.5)*0.3,
      size:0.06+Math.random()*0.05
    });
  }
}

function updateFloaters(surfaceY){
  floaters.forEach(f=>{
    f.y-=f.speed;
    f.x+=f.drift;

    if(f.x<BOUNDS.left)f.x=BOUNDS.right;
    if(f.x>BOUNDS.right)f.x=BOUNDS.left;
    if(f.y<surfaceY+10)f.y=BOUNDS.bottom-20;

    f.g.setAttribute("transform",
      `translate(${f.x},${f.y}) scale(${f.size})`);
  });
}

function buildWave(y){
  const W=512;
  const H=512;
  const amp=6;
  const len=120;
  const step=16;

  let d=`M -40 ${y}`;
  for(let x=-40;x<=W+40;x+=step){
    const yy=y+Math.sin((x/len*2*Math.PI)+wavePhase)*amp;
    d+=` L ${x} ${yy}`;
  }
  d+=` L ${W+40} ${H+40} L -40 ${H+40} Z`;
  return d;
}

function animate(now){
  const t=now-startTime;

  const fillT=clamp(t/FILL_DURATION_MS,0,1);
  const easedFill=easeInOut(fillT);
  fillNow=easedFill*(TARGET_SAVED/FULL_SCALE);

  const topY=lerp(BOUNDS.bottom,BOUNDS.top,fillNow);

  waterRect.setAttribute("y",topY);
  waterRect.setAttribute("height",512-topY);

  wavePath.setAttribute("d",buildWave(topY));
  wavePhase+=0.08;

  const countT=clamp(t/COUNT_DURATION_MS,0,1);
  countEl.textContent=format(Math.round(easeOut(countT)*TARGET_SAVED));

  updateFloaters(topY);

  requestAnimationFrame(animate);
}

function start(){
  startTime=performance.now();
  createFloaters();
  requestAnimationFrame(animate);
}

replayBtn.addEventListener("click",start);
start();
