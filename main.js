// main.js — the living word. Core: letter spring physics, input, entrance, signature burst,
// and the scheduler that calls into scenes.js (easter eggs) and palette.js (evolving colours).
import { createScenes } from './scenes.js';
import { createPalette } from './palette.js';

const wordEl = document.getElementById('word');
const spans = [...wordEl.querySelectorAll('span')];
const back = document.getElementById('back');
const front = document.getElementById('front');
const bctx = back.getContext('2d');
const fctx = front.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = 0, H = 0, dpr = 1;

// ---------------------------------------------------------------- letters
// Each letter is a damped spring in x/y plus weight/width/skew axes.
const letters = spans.map((el, i) => ({
  el, i,
  x: 0, y: 0, vx: 0, vy: 0,        // offset from home position (px)
  rot: 0, vr: 0,                   // rotation (rad)
  wght: 700, vw: 0,                // variable font weight
  wdth: 100, vd: 0,                // variable font width
  home: { x: 0, y: 0, w: 0, h: 0 }, // layout rect in page px (measured)
  entered: false,
}));

function measure() {
  // Measure home positions with transforms cleared so springs are relative to layout.
  const saved = letters.map(l => l.el.style.transform);
  letters.forEach(l => (l.el.style.transform = 'none'));
  letters.forEach(l => {
    const b = l.el.getBoundingClientRect();
    l.home.x = b.left; l.home.y = b.top; l.home.w = b.width; l.home.h = b.height;
  });
  letters.forEach((l, i) => (l.el.style.transform = saved[i]));
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  for (const c of [back, front]) { c.width = W * dpr; c.height = H * dpr; }
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Word takes ~62% of width on desktop, more on narrow screens; capped by height.
  const target = W < 600 ? W * 0.86 : W * 0.62;
  const size = Math.min(target / 4.05, H * 0.36); // 4.05 ≈ em-width of "tschudis" at wdth 100
  wordEl.style.fontSize = size + 'px';
  measure();
}

// ---------------------------------------------------------------- input
const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, vx: 0, vy: 0, down: false, speed: 0, inside: false };
let lastMoveT = 0;

function resetPointerMotion() {
  pointer.vx = pointer.vy = pointer.speed = 0; pointer.inside = false;
}
function onMove(x, y, t) {
  if (pointer.inside) {
    const dt = Math.max(8, t - lastMoveT) / 1000;
    pointer.vx = (x - pointer.x) / dt; pointer.vy = (y - pointer.y) / dt;
  }
  pointer.px = pointer.x; pointer.py = pointer.y;
  pointer.x = x; pointer.y = y; pointer.inside = true; lastMoveT = t;
  pointer.speed = Math.hypot(pointer.vx, pointer.vy);
}
addEventListener('pointermove', e => onMove(e.clientX, e.clientY, e.timeStamp), { passive: true });
addEventListener('pointerdown', e => {
  resetPointerMotion();                       // a fresh touch never inherits old velocity
  pointer.down = true; onMove(e.clientX, e.clientY, e.timeStamp);
  if (entranceDone) poke(e.clientX, e.clientY, 1);
}, { passive: true });
const endPointer = e => {
  pointer.down = false;
  if (e.pointerType !== 'mouse') resetPointerMotion(); // touch lifted: no pointer on screen
};
addEventListener('pointerup', endPointer, { passive: true });
addEventListener('pointercancel', endPointer, { passive: true });
document.addEventListener('mouseleave', () => { resetPointerMotion(); pointer.x = pointer.y = -1e4; });

// Device tilt: gentle gravity on the letters.
const tilt = { x: 0, y: 0 };
addEventListener('deviceorientation', e => {
  if (e.gamma == null || e.beta == null) return;
  tilt.x = Math.max(-1, Math.min(1, e.gamma / 35));
  tilt.y = Math.max(-1, Math.min(1, (e.beta - 40) / 35));
}, { passive: true });

// ---------------------------------------------------------------- physics helpers
function letterCenter(l) {
  return { x: l.home.x + l.home.w / 2 + l.x, y: l.home.y + l.home.h * 0.6 + l.y };
}
function nudge(i, fx, fy, spin = 0) {
  const l = letters[i]; if (!l || !l.entered) return;
  l.vx += fx; l.vy += fy; l.vr += spin;
}
function poke(x, y, strength) {
  // Impulse radiating from a point — the family flinches together.
  for (const l of letters) {
    if (!l.entered) continue;
    const c = letterCenter(l);
    const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) + 1;
    const r = l.home.h * 2.2;
    if (d > r) continue;
    const f = (1 - d / r) * 380 * strength;
    l.vx += (dx / d) * f; l.vy += (dy / d) * f * 0.5 - f * 0.2;
    l.vr += (dx / d) * -0.004 * strength * (1 - d / r);
    l.vw += -120 * strength * (1 - d / r);
  }
  energy = Math.min(1, energy + 0.35 * strength);
  scenes.onInteraction(strength, x, y);
}

// ---------------------------------------------------------------- entrance
// Letters fall in from staggered offsets, collide softly, settle.
let entranceDone = false;
let entranceStart = -1;
const ENTER_STAGGER = reduced ? 0 : 0.11, ENTER_DELAY = reduced ? 0 : 0.08, ENTER_TOTAL = reduced ? 0.1 : 2.2;
function startEntrance() {
  const order = [3, 4, 2, 5, 1, 6, 0, 7]; // h,u first — the middle of the family
  letters.forEach((l, i) => {
    const k = order.indexOf(i);
    const dir = (i % 2 ? 1 : -1);
    l.enterAt = ENTER_DELAY + k * ENTER_STAGGER;
    l.x = dir * (14 + k * 4);
    l.y = H * 0.12 + k * 6;
    l.rot = dir * 0.05;
    l.wght = 500; l.wdth = 96;
    l.entered = false;
  });
  entranceStart = elapsed;
}
function tickEntrance() {
  if (entranceDone || entranceStart < 0) return;
  const e = elapsed - entranceStart;
  for (const l of letters) if (!l.entered && e >= l.enterAt) l.entered = true;
  if (e >= ENTER_TOTAL) entranceDone = true;
}

// ---------------------------------------------------------------- state
let energy = 0;           // 0..1 recent interaction energy (drives palette + scenes)
let stillness = 0;        // seconds without meaningful motion
let lastT = 0, elapsed = 0;

// Signature interaction: a fast swipe through the word scatters the letters,
// which then find their way home — passing through a brief burst.
let lastBurstT = -10;
function maybeSignature(t) {
  if (!entranceDone || t - lastBurstT < 2.5) return;
  const fast = pointer.speed > (W < 600 ? 1800 : 2600);
  if (!fast) return;
  // must actually cross the word band
  const cy = letters[0].home.y + letters[0].home.h * 0.5;
  if (Math.abs(pointer.y - cy) > letters[0].home.h * 0.9) return;
  lastBurstT = t;
  const dirx = Math.sign(pointer.vx) || 1;
  letters.forEach((l, i) => {
    const c = letterCenter(l);
    const d = Math.abs(c.x - pointer.x) / W;
    const f = (1 - d) * 700;
    l.vx += dirx * f * (0.5 + Math.random() * 0.5);
    l.vy += -f * (0.4 + Math.random() * 0.5);
    l.vr += (Math.random() - 0.5) * 1.2;
    l.vw += (Math.random() - 0.5) * 600;
    l.vd += (Math.random() - 0.5) * 60;
  });
  energy = 1;
  scenes.signature(pointer.x, pointer.y, dirx);
}

// ---------------------------------------------------------------- step
function step(t, dt) {
  const k = Math.min(2, 60 * dt);          // frame-normalised, capped after stalls
  const restH = letters[0].home.h || 100;

  // pointer field: letters lean away from / react to nearby cursor
  const near = pointer.inside;
  for (const l of letters) {
    if (!l.entered) continue;
    let ax = 0, ay = 0;
    if (near && entranceDone) {
      const c = letterCenter(l);
      const dx = c.x - pointer.x, dy = c.y - pointer.y;
      const d = Math.hypot(dx, dy) + 1, r = restH * 1.6;
      if (d < r) {
        const s = (1 - d / r) ** 2;             // soft falloff: only close passes matter
        ax += (dx / d) * s * 28; ay += (dy / d) * s * 14;
        l.vr += (dx / d) * -s * 0.0008 * k;
        // cursor "presses" the letter: a slight, slow compression
        l.vw += -s * 14 * k; l.vd += s * 3 * k;
      }
      // dragging: pull the nearest letter along
      if (pointer.down && d < restH * 0.8) {
        ax += (pointer.x - c.x) * 6; ay += (pointer.y - c.y) * 6;
      }
    }
    // tilt gravity
    ax += tilt.x * 20; ay += tilt.y * 14;

    // spring home (critically damped feel: slow, heavy, no overshoot chatter)
    const K = 0.05, D = 0.80;
    l.vx += (-l.x * K + ax * dt * 4) * k; l.vy += (-l.y * K + ay * dt * 4) * k;
    l.vx *= Math.pow(D, k); l.vy *= Math.pow(D, k);
    l.x += l.vx * dt * 3.5; l.y += l.vy * dt * 3.5;

    // rotation — very restrained
    l.vr += -l.rot * 0.06 * k; l.vr *= Math.pow(0.80, k); l.rot += l.vr * dt * 3.5;
    if (Math.abs(l.rot) > 0.35) { l.rot = Math.sign(l.rot) * 0.35; l.vr *= -0.3; }

    // font axes spring (heavily damped)
    l.vw += (700 - l.wght) * 0.05 * k; l.vw *= Math.pow(0.70, k); l.wght += l.vw * dt * 3;
    l.vd += (100 - l.wdth) * 0.05 * k; l.vd *= Math.pow(0.70, k); l.wdth += l.vd * dt * 3;
    l.wght = Math.max(450, Math.min(800, l.wght));
    l.wdth = Math.max(88, Math.min(110, l.wdth));
  }

  // neighbour coupling: the family holds hands (soft springs + collision)
  for (let i = 0; i < letters.length - 1; i++) {
    const a = letters[i], b = letters[i + 1];
    if (!a.entered || !b.entered) continue;
    const ca = letterCenter(a), cb = letterCenter(b);
    const restGap = (b.home.x + b.home.w / 2) - (a.home.x + a.home.w / 2);
    const gap = cb.x - ca.x;
    const stretch = gap - restGap;
    const f = stretch * 0.008 * k;
    a.vx += f; b.vx -= f;
    const dy = (cb.y - ca.y) * 0.004 * k;
    a.vy += dy; b.vy -= dy;
    // collision: don't overlap
    const minGap = restGap * 0.7;
    if (gap < minGap) {
      const push = (minGap - gap) * 0.5;
      a.x -= push * 0.5; b.x += push * 0.5;
      const rel = b.vx - a.vx;
      if (rel < 0) { a.vx += rel * 0.55; b.vx -= rel * 0.55; a.vw += 120; b.vw += 120; }
    }
  }

  // energy & stillness
  let motion = 0;
  for (const l of letters) motion += Math.abs(l.vx) + Math.abs(l.vy) + Math.abs(l.vr) * 200;
  motion += pointer.speed * 0.02;
  energy = Math.max(0, energy - dt * 0.25);
  if (motion > 30) { energy = Math.min(1, energy + dt * 0.4); stillness = 0; } else stillness += dt;
  pointer.speed *= Math.pow(0.85, k); // decays unless moving

  // snap tiny residuals so the word is perfectly still at rest
  for (const l of letters) {
    if (Math.abs(l.x) < 0.02 && Math.abs(l.vx) < 0.05) { l.x = 0; l.vx = 0; }
    if (Math.abs(l.y) < 0.02 && Math.abs(l.vy) < 0.05) { l.y = 0; l.vy = 0; }
    if (Math.abs(l.rot) < 0.0005 && Math.abs(l.vr) < 0.001) { l.rot = 0; l.vr = 0; }
  }
}

function render() {
  for (const l of letters) {
    l.el.style.transform = `translate3d(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px,0) rotate(${l.rot.toFixed(4)}rad)`;
    l.el.style.fontVariationSettings = `"wght" ${l.wght.toFixed(0)}, "wdth" ${l.wdth.toFixed(1)}`;
    if (!entranceDone) {
      // fade in over the first ~0.5 s after each letter enters
      const since = l.entered ? elapsed - entranceStart - l.enterAt : 0;
      l.el.style.opacity = l.entered ? Math.min(1, since / 0.5).toFixed(3) : '0';
    } else if (l.el.style.opacity !== '') l.el.style.opacity = '';
  }
}

// ---------------------------------------------------------------- modules
const api = {
  get W() { return W; }, get H() { return H; },
  back: bctx, front: fctx,
  letters,                         // read-only use; positions via letterCenter/rect
  letterCenter,
  letterRect: l => ({ x: l.home.x + l.x, y: l.home.y + l.y, w: l.home.w, h: l.home.h, rot: l.rot }),
  nudge, poke,
  get energy() { return energy; }, get stillness() { return stillness; }, get elapsed() { return elapsed; },
  get pointer() { return pointer; },
  reduced,
  palette: null,
};
const palette = createPalette(api);
api.palette = palette;
const scenes = createScenes(api);

// ---------------------------------------------------------------- loop
function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
  lastT = t; elapsed += dt;

  tickEntrance();
  step(t, dt);
  maybeSignature(t);

  bctx.clearRect(0, 0, W, H);
  fctx.clearRect(0, 0, W, H);
  palette.update(t, dt);
  scenes.update(t, dt);
  render();
  requestAnimationFrame(loop);
}

addEventListener('resize', resize);
function init() {
  resize();
  wordEl.classList.add('ready');
  startEntrance();
  requestAnimationFrame(loop);
}
// Re-measure whenever the real font lands (the first measure may hit the fallback font).
document.fonts.addEventListener('loadingdone', measure);
document.fonts.ready.then(measure, () => {});
document.fonts.load('700 100px "Archivo"').then(init, init);
