// main.js — "tschudis": fade in, drag a letter and it springs back, tap to explode.
const wordEl = document.getElementById('word');
const spans = [...wordEl.querySelectorAll('span')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = 0, H = 0;

// Each letter: offset from home (x,y), velocity (vx,vy), rotation (r, vr), who is holding it.
const letters = spans.map((el, i) => ({
  el, i, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, grab: null,
  home: { x: 0, y: 0, w: 0, h: 0 },
}));

// ---------------------------------------------------------------- layout
function measure() {
  const saved = letters.map(l => l.el.style.transform);
  letters.forEach(l => (l.el.style.transform = 'none'));
  letters.forEach(l => {
    const b = l.el.getBoundingClientRect();
    l.home = { x: b.left, y: b.top, w: b.width, h: b.height };
  });
  letters.forEach((l, i) => (l.el.style.transform = saved[i]));
}
function resize() {
  W = innerWidth; H = innerHeight;
  const target = W < 700 ? W * 0.88 : W * 0.6;         // word ≈ 88% of a phone, 60% of a desktop
  wordEl.style.fontSize = Math.min(target / 4.05, H * 0.34) + 'px';
  measure();
}
const center = l => ({ x: l.home.x + l.home.w / 2 + l.x, y: l.home.y + l.home.h * 0.6 + l.y });
const size = () => letters[0].home.h || 100;

// ---------------------------------------------------------------- input
const pointers = new Map(); // pointerId -> { x, y, vx, vy, t, letter, moved, startX, startY }

function nearest(x, y, maxD) {
  let best = null, bd = maxD;
  for (const l of letters) {
    const c = center(l), d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

addEventListener('pointerdown', e => {
  if (!ready) return;
  const p = { x: e.clientX, y: e.clientY, vx: 0, vy: 0, t: e.timeStamp, letter: null, moved: false, startX: e.clientX, startY: e.clientY };
  pointers.set(e.pointerId, p);
  const l = nearest(p.x, p.y, size() * 0.8);
  if (l && l.grab == null) { l.grab = e.pointerId; p.letter = l; wordEl.style.cursor = 'grabbing'; }
}, { passive: true });

addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dt = Math.max(0.008, (e.timeStamp - p.t) / 1000);
  p.vx = (e.clientX - p.x) / dt; p.vy = (e.clientY - p.y) / dt;
  p.x = e.clientX; p.y = e.clientY; p.t = e.timeStamp;
  if (Math.hypot(p.x - p.startX, p.y - p.startY) > 8) p.moved = true;
}, { passive: true });

function release(e) {
  const p = pointers.get(e.pointerId); if (!p) return;
  pointers.delete(e.pointerId);
  wordEl.style.cursor = 'grab';
  if (p.letter) {
    p.letter.grab = null;
    if (p.moved) {
      // throw: hand the finger's velocity to the letter (capped), it springs back
      const sp = Math.hypot(p.vx, p.vy), cap = size() * 10, s = sp > cap ? cap / sp : 1;
      if (e.timeStamp - p.t < 90) { p.letter.vx += p.vx * s; p.letter.vy += p.vy * s; }
      p.letter.vr += p.vx * s * 0.0012;
      return;
    }
  }
  if (!p.moved) explode(p.x, p.y);   // a clean tap anywhere
}
addEventListener('pointerup', release, { passive: true });
addEventListener('pointercancel', release, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());

// ---------------------------------------------------------------- explode
function explode(x, y) {
  const S = size();
  for (const l of letters) {
    if (l.grab != null) continue;
    const c = center(l);
    // direction away from the tap, scattered ±40° so it never looks mechanical
    let a = Math.atan2(c.y - y, c.x - x) + (Math.random() - 0.5) * 1.4;
    const d = Math.hypot(c.x - x, c.y - y);
    const near = 1 / (1 + d / (S * 3));
    const f = S * (14 + 8 * near) * (0.75 + Math.random() * 0.5);
    l.vx += Math.cos(a) * f;
    l.vy += Math.sin(a) * f - S * 4;                             // a little upward bias: it's a pop
    l.vr += (Math.random() - 0.5) * 16;
  }
}

// ---------------------------------------------------------------- physics
const STIFF = 22;    // spring back to home (1/s²) — soft, so letters travel far
const DAMP = 4.2;    // damping (1/s) — underdamped: a clear bounce, then rest
const ROT_STIFF = 18, ROT_DAMP = 3.5;

function step(dt) {
  const S = size();
  for (const l of letters) {
    if (l.grab != null) {
      // held: a stiff spring to the finger, heavily damped, so it feels attached but alive
      const p = pointers.get(l.grab);
      if (!p) { l.grab = null; continue; }
      const c = center(l);
      l.vx += (p.x - c.x) * 400 * dt; l.vy += (p.y - c.y) * 400 * dt;
      l.vx *= Math.exp(-28 * dt); l.vy *= Math.exp(-28 * dt);
      l.vr += (p.vx / S) * 0.25 * dt;
    } else {
      l.vx += -l.x * STIFF * dt; l.vy += -l.y * STIFF * dt;
      l.vx *= Math.exp(-DAMP * dt); l.vy *= Math.exp(-DAMP * dt);
    }
    l.x += l.vx * dt; l.y += l.vy * dt;

    // gentle walls: letters can leave the viewport briefly on an explosion, but come back
    const c = center(l), m = S * 0.5;
    if (c.x < m) l.vx += (m - c.x) * 30 * dt;
    if (c.x > W - m) l.vx -= (c.x - (W - m)) * 30 * dt;
    if (c.y < m) l.vy += (m - c.y) * 30 * dt;
    if (c.y > H - m) l.vy -= (c.y - (H - m)) * 30 * dt;

    l.vr += -l.r * ROT_STIFF * dt; l.vr *= Math.exp(-ROT_DAMP * dt); l.r += l.vr * dt;
  }

  // letters don't pass through each other (only when both free)
  for (let i = 0; i < letters.length - 1; i++) {
    const a = letters[i], b = letters[i + 1];
    if (a.grab != null || b.grab != null) continue;
    const ca = center(a), cb = center(b);
    const minGap = ((a.home.w + b.home.w) / 2) * 0.8;
    const gap = cb.x - ca.x;
    if (gap < minGap && Math.abs(cb.y - ca.y) < a.home.h * 0.5) {
      const push = (minGap - gap) / 2;
      a.x -= push; b.x += push;
      const rel = b.vx - a.vx;
      if (rel < 0) { a.vx += rel * 0.5; b.vx -= rel * 0.5; }
    }
  }

  // snap tiny residuals so the word is perfectly still at rest
  for (const l of letters) {
    if (l.grab != null) continue;
    if (Math.abs(l.x) < 0.05 && Math.abs(l.vx) < 2) { l.x = 0; l.vx = 0; }
    if (Math.abs(l.y) < 0.05 && Math.abs(l.vy) < 2) { l.y = 0; l.vy = 0; }
    if (Math.abs(l.r) < 0.001 && Math.abs(l.vr) < 0.02) { l.r = 0; l.vr = 0; }
  }
}

// ---------------------------------------------------------------- entrance: rise + fade, staggered from the middle
let ready = false, t0 = -1, elapsed = 0, lastT = 0;
const ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
const ease = t => 1 - Math.pow(1 - t, 3);
function entrance() {
  if (ready) return;
  const e = elapsed - t0;
  let done = true;
  letters.forEach((l, i) => {
    const start = reduced ? 0 : 0.1 + ORDER.indexOf(i) * 0.09;
    const p = Math.max(0, Math.min(1, (e - start) / (reduced ? 0.01 : 0.9)));
    if (p < 1) done = false;
    l.el.style.opacity = p.toFixed(3);
    l.y = (1 - ease(p)) * size() * 0.35;
  });
  if (done) { ready = true; letters.forEach(l => { l.el.style.opacity = '1'; l.y = 0; }); }
}

function render() {
  for (const l of letters)
    l.el.style.transform = `translate3d(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px,0) rotate(${l.r.toFixed(4)}rad)`;
}

function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.033, lastT ? t - lastT : 0.016);
  lastT = t; elapsed += dt;
  try { if (ready) step(dt); else entrance(); } catch (_) { /* never let one bad frame stop the word */ }
  render();
  requestAnimationFrame(loop);
}

addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 150));
document.fonts.addEventListener('loadingdone', measure);
function init() {
  resize();
  wordEl.classList.add('ready');
  t0 = elapsed;
  requestAnimationFrame(loop);
}
document.fonts.load('700 100px "Archivo"').then(init, init);
