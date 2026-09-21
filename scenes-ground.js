// scenes-ground.js — small ground-level scenes that play on api.front, relative to letter rects.
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = t => { const c = 1.70158, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp01 = v => Math.max(0, Math.min(1, v));
const fadeEnds = (p, e = 0.12) => clamp01(Math.min(p / e, (1 - p) / e));
const rects = api => api.letters.map(l => api.letterRect(l));
const baseline = r => r.y + r.h * 0.78;
const lw = h => Math.max(1.5, Math.min(2.5, h * 0.012));
// roundRect fallback for older Safari.
const rrect = (g, x, y, w, h, r) => {
  if (typeof g.roundRect === 'function') return g.roundRect(x, y, w, h, r);
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

function wave(api) {
  const done = new Array(api.letters.length).fill(false);
  return { duration: 3.5, draw(p) {
    const rs = rects(api), h = rs[0].h, c = api.palette.colors(), g = api.front;
    const x0 = rs[0].x - h * 0.5, x1 = rs[rs.length - 1].x + rs[rs.length - 1].w + h * 0.5;
    const crest = x0 + (x1 - x0) * p, amp = h * 0.05, len = h * 0.9, by = baseline(rs[0]) + h * 0.12;
    rs.forEach((r, i) => { if (!done[i] && crest >= r.x + r.w / 2) { done[i] = true; api.nudge(i, 0, -160); } });
    g.save(); g.globalAlpha = fadeEnds(p); g.strokeStyle = c.accent; g.lineWidth = lw(h); g.beginPath();
    for (let x = x0; x <= x1; x += 3) { const y = by + Math.cos((x - crest) / len * Math.PI * 2) * -amp; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke(); g.restore();
  } };
}

function car(api, info) {
  const done = new Array(api.letters.length).fill(false);
  const rev = !!(info && info.x > api.W / 2);
  return { duration: 4, draw(p) {
    const rs = rects(api), h = rs[0].h, c = api.palette.colors(), g = api.front;
    const L = h * 0.28, r = L * 0.13, by = baseline(rs[0]);
    const xs = -L * 1.5, xe = api.W + L * 1.5, t = easeInOut(p);
    const x = rev ? xe - (xe - xs) * t : xs + (xe - xs) * t; // car centre
    const front = x + (rev ? -L / 2 : L / 2);
    rs.forEach((rc, i) => { const cx = rc.x + rc.w / 2; if (!done[i] && (rev ? front <= cx : front >= cx)) { done[i] = true; api.nudge(i, rev ? -60 : 60, -90); } });
    g.save(); g.fillStyle = c.accent2; g.strokeStyle = c.ink; g.lineWidth = lw(h);
    g.beginPath(); rrect(g, x - L / 2, by - r * 2 - L * 0.22, L, L * 0.22, r * 0.6); g.fill();
    g.beginPath(); rrect(g, x - L * 0.25, by - r * 2 - L * 0.38, L * 0.5, L * 0.18, r * 0.5); g.fill();
    const ang = (x / r) * (rev ? -1 : 1);
    for (const wx of [x - L * 0.3, x + L * 0.3]) {
      g.fillStyle = c.ink; g.beginPath(); g.arc(wx, by - r, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c.bg; g.beginPath(); g.moveTo(wx, by - r); g.lineTo(wx + Math.cos(ang) * r * 0.7, by - r + Math.sin(ang) * r * 0.7); g.stroke();
    }
    g.restore();
  } };
}

function ball(api, info) {
  const rs = rects(api), h = rs[0].h;
  let idx = Math.floor(Math.random() * rs.length);
  if (info) { let best = 1e9; rs.forEach((r, i) => { const d = Math.abs(r.x + r.w / 2 - info.x); if (d < best) { best = d; idx = i; } }); }
  const st = { x: rs[idx].x + rs[idx].w / 2, y: baseline(rs[idx]) - h * 1.4, vy: 0, vx: 0, bounces: 0, nudged: false, rolling: false, dir: Math.random() < 0.5 ? -1 : 1 };
  return { duration: 3, draw(p, t, dt) {
    const r = h * 0.07, by = baseline(rs[0]) - r, c = api.palette.colors(), g = api.front;
    const gvt = h * 9;
    st.vy += gvt * dt; st.y += st.vy * dt; st.x += st.vx * dt;
    if (st.y >= by && st.vy > 0) {
      st.y = by; st.bounces++;
      if (!st.nudged) { st.nudged = true; api.nudge(idx, 0, -220, 0.02); }
      if (st.bounces <= 2) { st.vy = -st.vy * 0.55; st.vx = st.dir * h * 0.3; }
      else { st.vy = 0; st.rolling = true; st.vx = st.dir * h * 1.2; }
    }
    if (st.rolling) st.y = by;
    g.save(); g.globalAlpha = st.rolling ? clamp01((1 - p) / 0.25) : 1;
    g.fillStyle = c.accent3; g.beginPath(); g.arc(st.x, st.y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = c.ink; g.lineWidth = lw(h); g.stroke(); g.restore();
  } };
}

function flower(api) {
  const idx = Math.floor(Math.random() * api.letters.length), seed = Math.random() * 6.28;
  return { duration: 4.5, draw(p, t) {
    const rs = rects(api), r0 = rs[idx], h = r0.h, c = api.palette.colors(), g = api.front;
    const bx = r0.x + r0.w * 0.5, by = baseline(r0);
    const grow = p < 0.3 ? easeOutBack(p / 0.3) : p > 0.8 ? 1 - easeInOut((p - 0.8) / 0.2) : 1;
    const open = clamp01((p - 0.25) / 0.2) * (p > 0.8 ? 1 - easeInOut((p - 0.8) / 0.2) : 1);
    const stemH = h * 0.26 * Math.max(0, grow), sway = Math.sin(t * 1.6 + seed) * (Math.PI / 36) * open;
    g.save(); g.translate(bx, by); g.rotate(sway); g.strokeStyle = c.accent2; g.lineWidth = lw(h);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * 0.03, -stemH * 0.5, 0, -stemH); g.stroke();
    if (open > 0) {
      const pr = h * 0.03 * open; g.fillStyle = c.accent;
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(Math.cos(a) * pr * 1.3, -stemH + Math.sin(a) * pr * 1.3, pr, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = c.accent3; g.beginPath(); g.arc(0, -stemH, pr * 0.7, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  } };
}

function door(api) {
  return { duration: 3.5, draw(p) {
    const r = api.letterRect(api.letters[5]), h = r.h, c = api.palette.colors(), g = api.front;
    const w = h * 0.18, dh = h * 0.28, x = r.x + r.w * 0.55 - w / 2, y = r.y + h * 0.78 - dh;
    const open = p < 0.35 ? easeInOut(p / 0.35) : p < 0.65 ? 1 : 1 - easeInOut((p - 0.65) / 0.35);
    const sx = 1 - open * 0.85, k = lw(h);
    g.save(); g.translate(r.x + r.w / 2, r.y + h / 2); g.rotate(r.rot); g.translate(-(r.x + r.w / 2), -(r.y + h / 2));
    g.fillStyle = c.accent3; g.globalAlpha = open; g.fillRect(x + k, y + k, w - 2 * k, dh - k); g.globalAlpha = 1;
    g.fillStyle = c.bg; g.strokeStyle = c.ink; g.lineWidth = k;
    g.beginPath(); g.rect(x, y, w * sx, dh); g.fill(); g.stroke();
    if (sx > 0.4) { g.fillStyle = c.ink; g.beginPath(); g.arc(x + w * sx * 0.8, y + dh * 0.55, k * 0.9, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(x, y + dh); g.lineTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + dh); g.stroke();
    g.restore();
  } };
}

export const GROUND_SCENES = [
  { name: 'wave', weight: 1, interactive: false, create: wave },
  { name: 'car', weight: 1, interactive: true, create: car },
  { name: 'ball', weight: 0.8, interactive: true, create: ball },
  { name: 'flower', weight: 0.7, interactive: false, create: flower },
  { name: 'door', weight: 0.5, interactive: true, create: door },
];
