// ====== CONFIG ======
const TARGET_SAVED = 2500;

// Full-scale value maps to a fully-filled bottle.
// You can tune this to your program's storytelling.
const FULL_SCALE = 5000; // e.g., 5000 saved = full bottle

// Animation timing
const FILL_DURATION_MS = 2400;
const COUNT_DURATION_MS = 2200;

// Floating bottle behavior
const NUM_FLOATERS = 22;
const FLOATER_SIZE_MIN = 18;
const FLOATER_SIZE_MAX = 34;

// Bottle interior bounds (approx; tuned for this SVG)
const BOUNDS = {
  left: 165,
  right: 355,
  top: 105,
  bottom: 485
};

// ====== HELPERS ======
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t) => (t < 0.5) ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;

function formatNumber(n){
  return n.toLocaleString("en-US");
}

// ====== DOM ======
const countEl = document.getElementById("count");
const replayBtn = document.getElementById("replay");
const waterRect = document.getElementById("waterRect");
const wavePath = document.getElementById("wavePath");
const floatersG = document.getElementById("floaters");
const scaleLabel = document.getElementById("scaleLabel");

scaleLabel.textContent = formatNumber(FULL_SCALE);

// ====== STATE ======
let startTime = 0;
let running = false;

let fillTarget01 = clamp(TARGET_SAVED / FULL_SCALE, 0, 1);
let fillNow01 = 0;

// Wave animation params
let wavePhase = 0;
let waveAmp = 7;       // px
let waveLen = 110;     // px
let waveSpeed = 0.065; // phase increment

// Floaters
let floaters = [];

// ====== BUILD FLOATERS ======
function rand(min, max){ return min + Math.random() * (max - min); }

function clearFloaters(){
  floaters = [];
  while (floatersG.firstChild) floatersG.removeChild(floatersG.firstChild);
}

function createFloaters(){
  clearFloaters();

  for (let i = 0; i < NUM_FLOATERS; i++){
    const size = rand(FLOATER_SIZE_MIN, FLOATER_SIZE_MAX);

    // Start them somewhat lower so they "exist" in the water region as it rises
    const x = rand(BOUNDS.left + 12, BOUNDS.right - 12);
    const y = rand(BOUNDS.top + 120, BOUNDS.bottom - 12);

    const vx = rand(-0.18, 0.18);
    const bobSpeed = rand(0.8, 1.6);
    const bobAmp = rand(2.5, 6.5);
    const rot = rand(-18, 18);
    const rotSpeed = rand(-0.15, 0.15);

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#miniBottle");
    use.setAttribute("x", (-size/2).toString());
    use.setAttribute("y", (-size*0.75).toString());

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.appendChild(use);
    floatersG.appendChild(g);

    floaters.push({
      g,
      x, y,
      vx,
      bobSpeed,
      bobAmp,
      rot,
      rotSpeed,
      size,
      seed: rand(0, 1000),
    });
  }
}

// ====== WAVE DRAWING ======
function buildWavePath(yTop, t){
  // yTop = water surface y (lower number means higher fill)
  // Create a horizontal wavy shape across the whole viewBox,
  // then close it downwards to fill.
  const W = 520;
  const H = 520;

  const amp = waveAmp;
  const len = waveLen;

  const points = [];
  const step = 18;

  for (let x = -40; x <= W + 40; x += step){
    const k = (x / len) * Math.PI * 2;
    const y = yTop + Math.sin(k + t) * amp;
    points.push([x, y]);
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++){
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }

  // Close shape down to bottom
  d += ` L ${W + 60} ${H + 30} L -60 ${H + 30} Z`;
  return d;
}

// ====== ANIMATION LOOP ======
function setFill01(v01){
  fillNow01 = clamp(v01, 0, 1);

  const topY = lerp(BOUNDS.bottom, BOUNDS.top, fillNow01);

  // Rect starts at surface and extends downward
  waterRect.setAttribute("y", topY.toFixed(2));
  waterRect.setAttribute("height", (520 - topY + 30).toFixed(2));

  // Wave sits at topY
  wavePath.setAttribute("d", buildWavePath(topY, wavePhase));
}

function updateFloaters(dt){
  // Floaters should only appear within the water region:
  // if a floater is above the surface, nudge it down.
  const surfaceY = lerp(BOUNDS.bottom, BOUNDS.top, fillNow01);

  for (const f of floaters){
    f.x += f.vx * dt;
    // wrap inside bottle-ish bounds
    if (f.x < BOUNDS.left + 6) f.x = BOUNDS.right - 6;
    if (f.x > BOUNDS.right - 6) f.x = BOUNDS.left + 6;

    // gentle upward buoyancy, but keep them below surface
    const buoyancy = -0.014 * dt; // upward drift
    f.y += buoyancy;

    // keep within vertical bounds
    if (f.y > BOUNDS.bottom - 4) f.y = BOUNDS.bottom - 4;

    // If above current surface, push it just under (so it doesn't float in "air")
    const minY = surfaceY + 10;
    if (f.y < minY){
      f.y = minY + rand(0, 22);
    }

    const bob = Math.sin((performance.now()/1000) * f.bobSpeed + f.seed) * f.bobAmp;
    f.rot += f.rotSpeed * (dt / 16);

    // scale relative to perspective: slightly smaller higher up
    const depth01 = (f.y - BOUNDS.top) / (BOUNDS.bottom - BOUNDS.top);
    const scale = lerp(0.78, 1.08, depth01) * (f.size / 28);

    f.g.setAttribute(
      "transform",
      `translate(${f.x.toFixed(2)} ${ (f.y + bob).toFixed(2) }) rotate(${f.rot.toFixed(2)}) scale(${scale.toFixed(3)})`
    );

    // Fade slightly as they approach surface for realism
    const fade = clamp((f.y - surfaceY) / 80, 0.25, 1);
    f.g.style.opacity = fade.toFixed(2);
  }
}

function animate(now){
  if (!running) return;

  const t = now - startTime;
  const dt = Math.min(34, now - (animate._last || now));
  animate._last = now;

  // Fill progression
  const fillT = clamp(t / FILL_DURATION_MS, 0, 1);
  const easedFill = easeInOutQuad(fillT);
  setFill01(easedFill * fillTarget01);

  // Counter progression
  const countT = clamp(t / COUNT_DURATION_MS, 0, 1);
  const easedCount = easeOutCubic(countT);
  const countVal = Math.round(easedCount * TARGET_SAVED);
  countEl.textContent = formatNumber(countVal);

  // Wave motion (always)
  wavePhase += waveSpeed * (dt / 16);
  setFill01(fillNow01); // redraw wave with updated phase

  // Floaters
  updateFloaters(dt);

  if (fillT >= 1 && countT >= 1){
    // keep subtle idle motion: wave + floaters
    // but stop the "fill" from changing
    // We'll continue animating for idle movement.
  }

  requestAnimationFrame(animate);
}

// ====== CONTROLS ======
function start(){
  startTime = performance.now();
  animate._last = performance.now();
  running = true;
  countEl.textContent = "0";
  setFill01(0);
  createFloaters();
  requestAnimationFrame(animate);
}

replayBtn.addEventListener("click", start);

// Kick off on load
start();
