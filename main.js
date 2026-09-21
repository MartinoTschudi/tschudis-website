// main.js — the living word. Letter spring physics only; touch-first.
import { createPalette } from './palette.js';

const wordEl = document.getElementById('word');
const spans = [...wordEl.querySelectorAll('span')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;

let W = 0, H = 0;

// ---------------------------------------------------------------- letters
const letters = spans.map((el, i) => ({
  el, i,
  x: 0, y: 0, vx: 0, vy: 0,          // offset from home (px) and velocity (px/s)
  rot: 0, vr: 0,
  wght: 700, vw: 0,
  wdth: 100, vd: 0,
  home: { x: 0, y: 0, w: 0, h: 0 },
  entered: false, enterAt: 0,
  grab: null,                        // pointerId holding this letter, or null
}));

function measure() {
  const saved = letters.map(l => l.el.style.transform);
  letters.forEach(l => (l.el.style.transform = 'none'));
  letters.forEach(l => {
    const b = l.el.getBoundingClientRect();
    l.home.x = b.left; l.home.y = b.top; l.home.w = b.width; l.home.h = b.height;
  });
  letters.forEach((l, i) => (l.el.style.transform = saved[i]));
}

function resize() {
  W = innerWidth; H = innerHeight;
  // Portrait phones: the word fills ~88% of width. Desktop: ~60%. Always capped by height.
  const target = W < 700 ? W * 0.88 : W * 0.6;
  const size = Math.min(target / 4.05, H * 0.34);
  wordEl.style.fontSize = size + 'px';
  measure();
}

// ---------------------------------------------------------------- helpers
const center = l => ({ x: l.home.x + l.home.w / 2 + l.x, y: l.home.y + l.home.h * 0.6 + l.y });
const restH = () => letters[0].home.h || 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- input
// Every active pointer (finger or mouse) is tracked; each can hold one letter.
const pointers = new Map(); // id -> { x, y, px, py, vx, vy, t, type, letter, path:[{x,t}] }
let hover = null;           // mouse-only: position when not pressed

function nearestLetter(x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const l of letters) {
    if (!l.entered) continue;
    const c = center(l);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

function down(e) {
  const p = { x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, vx: 0, vy: 0,
              t: e.timeStamp, type: e.pointerType, letter: null, path: [{ x: e.clientX, t: e.timeStamp }] };
  pointers.set(e.pointerId, p);
  if (!entranceDone) return;
  const l = nearestLetter(p.x, p.y, restH() * (isTouch ? 0.9 : 0.7));
  if (l && !l.grab) {
    l.grab = e.pointerId; p.letter = l;
    l.vw += -160;                       // it lightens slightly in the hand
  } else {
    // tapped empty space: the family flinches away from the tap, softly
    poke(p.x, p.y, 1);
  }
  if (p.type !== 'mouse') hover = null;
}

function move(e) {
  const p = pointers.get(e.pointerId);
  if (!p) { if (e.pointerType === 'mouse') hover = { x: e.clientX, y: e.clientY }; return; }
  const dt = Math.max(0.008, (e.timeStamp - p.t) / 1000);
  p.vx = (e.clientX - p.x) / dt; p.vy = (e.clientY - p.y) / dt;
  p.px = p.x; p.py = p.y; p.x = e.clientX; p.y = e.clientY; p.t = e.timeStamp;
  p.path.push({ x: p.x, t: p.t }); if (p.path.length > 12) p.path.shift();
  if (e.pointerType === 'mouse') hover = { x: p.x, y: p.y };
  maybeSweep(p);
}

function up(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (p.letter) {
    const l = p.letter;
    l.grab = null;
    // throw: carry the finger's velocity into the letter, capped
    const sp = Math.hypot(p.vx, p.vy);
    const cap = restH() * 9;
    const s = sp > cap ? cap / sp : 1;
    if (e.timeStamp - p.t < 80) { l.vx += p.vx * 0.9 * s; l.vy += p.vy * 0.9 * s; }
    l.vr += clamp(p.vx * s, -cap, cap) * 0.0009;
  }
  pointers.delete(e.pointerId);
}

addEventListener('pointerdown', down, { passive: true });
addEventListener('pointermove', move, { passive: true });
addEventListener('pointerup', up, { passive: true });
addEventListener('pointercancel', up, { passive: true });
document.addEventListener('mouseleave', () => { hover = null; });
// Block iOS long-press callout / context menu on the letters.
addEventListener('contextmenu', e => e.preventDefault());

// Tilt: the word slides gently with the phone's angle.
const tilt = { x: 0, y: 0 };
addEventListener('deviceorientation', e => {
  if (e.gamma == null || e.beta == null) return;
  tilt.x = clamp(e.gamma / 30, -1, 1);
  tilt.y = clamp((e.beta - 45) / 30, -1, 1);
}, { passive: true });

// Sweep: a fast finger crossing the word band pushes the letters aside like a curtain,
// they drift and settle back. The signature moment.
let lastSweepT = -10;
function maybeSweep(p) {
  if (!entranceDone) return;
  const now = p.t / 1000;
  if (now - lastSweepT < 1.8) return;
  const a = p.path[0], b = p.path[p.path.length - 1];
  const span = Math.abs(b.x - a.x), dur = (b.t - a.t) / 1000;
  if (dur < 0.03 || span < W * 0.28 || span / dur < W * 1.6) return;  // must cover >28% of width, fast
  const cy = letters[0].home.y + letters[0].home.h * 0.55;
  if (Math.abs(p.y - cy) > restH() * 0.8) return;
  lastSweepT = now;
  const dir = Math.sign(b.x - a.x) || 1;
  for (const l of letters) {
    if (l.grab) continue;
    const c = center(l);
    const d = clamp(1 - Math.abs(c.x - p.x) / (W * 0.6), 0, 1);
    const f = restH() * (2.2 + 2.2 * d);
    l.vx += dir * f * (0.7 + Math.random() * 0.3);
    l.vy += -f * (0.25 + Math.random() * 0.35);
    l.vr += dir * (0.5 + Math.random() * 0.8) * -1;
    l.vw += (Math.random() - 0.5) * 500;
  }
  energy = 1;
}

function poke(x, y, strength) {
  for (const l of letters) {
    if (!l.entered || l.grab) continue;
    const c = center(l);
    const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) + 1;
    const r = restH() * 2.2;
    if (d > r) continue;
    const s = (1 - d / r) ** 1.5;
    const f = restH() * 2.6 * s * strength;
    l.vx += (dx / d) * f; l.vy += (dy / d) * f * 0.5 - f * 0.15;
    l.vw += -140 * s;
  }
  energy = Math.min(1, energy + 0.3);
}

// ---------------------------------------------------------------- entrance
let entranceDone = false, entranceStart = -1;
const ENTER_DELAY = reduced ? 0 : 0.08, ENTER_STAGGER = reduced ? 0 : 0.11, ENTER_TOTAL = reduced ? 0.1 : 2.2;
function startEntrance() {
  const order = [3, 4, 2, 5, 1, 6, 0, 7];
  letters.forEach((l, i) => {
    const k = order.indexOf(i), dir = i % 2 ? 1 : -1;
    l.enterAt = ENTER_DELAY + k * ENTER_STAGGER;
    l.x = dir * (14 + k * 4); l.y = H * 0.12 + k * 6; l.rot = dir * 0.05;
    l.wght = 500; l.wdth = 96; l.entered = false;
  });
  entranceStart = elapsed;
}
function tickEntrance() {
  if (entranceDone || entranceStart < 0) return;
  const e = elapsed - entranceStart;
  for (const l of letters) if (!l.entered && e >= l.enterAt) l.entered = true;
  if (e >= ENTER_TOTAL) entranceDone = true;
}

// ---------------------------------------------------------------- physics
let energy = 0, stillness = 0, lastT = 0, elapsed = 0;

function step(dt) {
  const k = Math.min(2, 60 * dt);
  const rh = restH();

  for (const l of letters) {
    if (!l.entered) continue;
    let ax = 0, ay = 0;

    if (l.grab != null) {
      // Held: follow the finger with a firm, slightly elastic hand.
      const p = pointers.get(l.grab);
      if (p) {
        const c = center(l);
        ax += (p.x - c.x) * 14; ay += (p.y - c.y) * 14;
        l.vx *= Math.pow(0.6, k); l.vy *= Math.pow(0.6, k);
        l.vr += (p.vx / rh) * 0.0015 * k;
      } else l.grab = null;
    } else if (hover && entranceDone && !isTouch) {
      // Mouse only: letters lean gently away from a close cursor.
      const c = center(l);
      const dx = c.x - hover.x, dy = c.y - hover.y;
      const d = Math.hypot(dx, dy) + 1, r = rh * 1.5;
      if (d < r) {
        const s = (1 - d / r) ** 2;
        ax += (dx / d) * s * 28; ay += (dy / d) * s * 14;
        l.vw += -s * 14 * k; l.vd += s * 3 * k;
      }
    }

    // Other fingers (not holding this letter) push it aside when close.
    for (const p of pointers.values()) {
      if (p.letter === l) continue;
      const c = center(l);
      const dx = c.x - p.x, dy = c.y - p.y;
      const d = Math.hypot(dx, dy) + 1, r = rh * 1.1;
      if (d < r) { const s = (1 - d / r) ** 2; ax += (dx / d) * s * 60; ay += (dy / d) * s * 30; }
    }

    ax += tilt.x * 22; ay += tilt.y * 14;

    // spring home
    const K = 0.05, D = 0.80;
    l.vx += (-l.x * K + ax * dt * 4) * k; l.vy += (-l.y * K + ay * dt * 4) * k;
    l.vx *= Math.pow(D, k); l.vy *= Math.pow(D, k);
    l.x += l.vx * dt * 3.5; l.y += l.vy * dt * 3.5;

    // keep letters on screen (soft walls)
    const c = center(l);
    if (c.x < rh * 0.4) l.vx += (rh * 0.4 - c.x) * 0.6 * k;
    if (c.x > W - rh * 0.4) l.vx -= (c.x - (W - rh * 0.4)) * 0.6 * k;
    if (c.y < rh * 0.5) l.vy += (rh * 0.5 - c.y) * 0.6 * k;
    if (c.y > H - rh * 0.4) l.vy -= (c.y - (H - rh * 0.4)) * 0.6 * k;

    // rotation
    l.vr += -l.rot * 0.06 * k; l.vr *= Math.pow(0.80, k); l.rot += l.vr * dt * 3.5;
    if (Math.abs(l.rot) > 0.35) { l.rot = Math.sign(l.rot) * 0.35; l.vr *= -0.3; }

    // font axes
    l.vw += (700 - l.wght) * 0.05 * k; l.vw *= Math.pow(0.70, k); l.wght += l.vw * dt * 3;
    l.vd += (100 - l.wdth) * 0.05 * k; l.vd *= Math.pow(0.70, k); l.wdth += l.vd * dt * 3;
    l.wght = clamp(l.wght, 450, 800); l.wdth = clamp(l.wdth, 88, 110);
  }

  // neighbour coupling + collision
  for (let i = 0; i < letters.length - 1; i++) {
    const a = letters[i], b = letters[i + 1];
    if (!a.entered || !b.entered) continue;
    const ca = center(a), cb = center(b);
    const restGap = (b.home.x + b.home.w / 2) - (a.home.x + a.home.w / 2);
    const gap = cb.x - ca.x, stretch = gap - restGap;
    const f = stretch * 0.008 * k, dy = (cb.y - ca.y) * 0.004 * k;
    if (!a.grab) { a.vx += f; a.vy += dy; }
    if (!b.grab) { b.vx -= f; b.vy -= dy; }
    const minGap = restGap * 0.7;
    if (gap < minGap) {
      const push = (minGap - gap) * 0.5;
      if (!a.grab) a.x -= push * (b.grab ? 1 : 0.5);
      if (!b.grab) b.x += push * (a.grab ? 1 : 0.5);
      const rel = b.vx - a.vx;
      if (rel < 0) { if (!a.grab) a.vx += rel * 0.55; if (!b.grab) b.vx -= rel * 0.55; a.vw += 120; b.vw += 120; }
    }
  }

  let motion = 0;
  for (const l of letters) motion += Math.abs(l.vx) + Math.abs(l.vy) + Math.abs(l.vr) * 200;
  energy = Math.max(0, energy - dt * 0.25);
  if (motion > 30 || pointers.size) { energy = Math.min(1, energy + dt * 0.4); stillness = 0; } else stillness += dt;

  // snap residuals so the word is perfectly still at rest
  const quiet = motion < 8 && !pointers.size;
  for (const l of letters) {
    if (l.grab) continue;
    const eps = quiet ? 0.6 : 0.02, veps = quiet ? 1.5 : 0.05;
    if (Math.abs(l.x) < eps && Math.abs(l.vx) < veps) { l.x = 0; l.vx = 0; }
    if (Math.abs(l.y) < eps && Math.abs(l.vy) < veps) { l.y = 0; l.vy = 0; }
    if (Math.abs(l.rot) < (quiet ? 0.004 : 0.0005) && Math.abs(l.vr) < 0.01) { l.rot = 0; l.vr = 0; }
  }
}

function render() {
  for (const l of letters) {
    l.el.style.transform = `translate3d(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px,0) rotate(${l.rot.toFixed(4)}rad)`;
    l.el.style.fontVariationSettings = `"wght" ${l.wght.toFixed(0)}, "wdth" ${l.wdth.toFixed(1)}`;
    if (!entranceDone) {
      const since = l.entered ? elapsed - entranceStart - l.enterAt : 0;
      l.el.style.opacity = l.entered ? Math.min(1, since / 0.5).toFixed(3) : '0';
    } else if (l.el.style.opacity !== '') l.el.style.opacity = '';
  }
}

// ---------------------------------------------------------------- palette + loop
const palette = createPalette({
  get energy() { return energy; }, get stillness() { return stillness; }, get elapsed() { return elapsed; },
  reduced,
});

function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
  lastT = t; elapsed += dt;
  tickEntrance();
  step(dt);
  palette.update(t, dt);
  render();
  requestAnimationFrame(loop);
}

addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 150));
function init() {
  resize();
  wordEl.classList.add('ready');
  startEntrance();
  requestAnimationFrame(loop);
}
document.fonts.addEventListener('loadingdone', measure);
document.fonts.ready.then(measure, () => {});
document.fonts.load('700 100px "Archivo"').then(init, init);
