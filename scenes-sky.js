// scenes-sky.js — sky & landscape easter eggs: ridge, sun, moon, shooting star, paper plane, tree, snow.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = t => { const c = 1.70158, k = c + 1; return 1 + k * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// generic 3-phase envelope: grow over [0,a], hold, shrink over [b,1]
const env = (p, a, b, ease = easeOutBack) => (p < a ? ease(p / a) : p > b ? 1 - easeOutCubic((p - b) / (1 - b)) : 1);
const wordBounds = api => {
  const rs = api.letters.map(l => api.letterRect(l));
  const x0 = Math.min(...rs.map(r => r.x)), x1 = Math.max(...rs.map(r => r.x + r.w));
  return { x0, x1, cx: (x0 + x1) / 2, top: rs[0].y + rs[0].h * 0.32, base: rs[0].y + rs[0].h * 0.7, h: rs[0].h };
};

function ridge(api) {
  const idx = pick([0, 3, 5]);
  const n = 5 + Math.floor(Math.random() * 3);
  const pts = Array.from({ length: n }, (_, i) => ({ u: (i + 0.5) / n, v: 0.45 + Math.random() * 0.55 }));
  return { duration: 4, draw(p) {
    const r = api.letterRect(api.letters[idx]), c = api.palette.colors(), ctx = api.front;
    const s = env(p, 0.3, 0.72); if (s <= 0.001) return;
    const w = r.w * 1.6, hh = r.h * 0.16, bx = r.x + r.w / 2, by = r.y + r.h * 0.12;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(r.rot); ctx.scale(1, s);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0);
    pts.forEach(q => ctx.lineTo(-w / 2 + q.u * w, -hh * q.v));
    ctx.lineTo(w / 2, 0); ctx.closePath();
    ctx.globalAlpha = 0.9; ctx.fillStyle = c.accent3; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  } };
}

// shared rise/set path for sun & moon
function arc(p, b, xFrac) {
  const k = p < 0.5 ? easeInOut(p / 0.5) : 1 - easeInOut((p - 0.5) / 0.5);
  return { x: b.x0 + (b.x1 - b.x0) * xFrac, y: b.base - b.h * 0.5 * k, k };
}

function sun(api) {
  return { duration: 6, draw(p) {
    const b = wordBounds(api), c = api.palette.colors(), ctx = api.back;
    const { x, y, k } = arc(p, b, 0.5), r = b.h * 0.22;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, api.W, b.base); ctx.clip();
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const ra = clamp((k - 0.6) / 0.4);
    if (ra > 0) {
      ctx.globalAlpha = ra; ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + p * 0.6, r1 = r * 1.3, r2 = r * 1.3 + r * 0.4 * ra;
        ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
      }
      ctx.stroke();
    }
    ctx.restore();
  } };
}

function moon(api) {
  return { duration: 6, draw(p) {
    const b = wordBounds(api), c = api.palette.colors(), ctx = api.back;
    const { x, y } = arc(p, b, 0.92), r = b.h * 0.18;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, api.W, b.base); ctx.clip();
    ctx.fillStyle = c.accent2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.bg; ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } };
}

function star(api, info) {
  const W = api.W, H = api.H;
  const dir = info && info.x > W / 2 ? -1 : 1;
  const sx = info ? clamp(info.x, W * 0.1, W * 0.9) : (dir > 0 ? W * 0.15 : W * 0.85);
  const sy = H * 0.06 + Math.random() * H * 0.1;
  const len = W * 0.35, ex = clamp(sx + dir * len, W * 0.02, W * 0.98), ey = sy + H * 0.16;
  return { duration: 1.4, draw(p) {
    const c = api.palette.colors(), ctx = api.back, m = easeOutCubic(p);
    const hx = sx + (ex - sx) * m, hy = sy + (ey - sy) * m, fade = 1 - clamp((p - 0.6) / 0.4);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = c.accent2; ctx.lineWidth = 2;
    const tail = 0.28 * m;
    for (let i = 0; i < 12; i++) {
      const a = m - tail * i / 12, bq = m - tail * (i + 1) / 12;
      if (bq < 0) break;
      ctx.globalAlpha = fade * (1 - i / 12) * 0.9; ctx.beginPath();
      ctx.moveTo(sx + (ex - sx) * a, sy + (ey - sy) * a); ctx.lineTo(sx + (ex - sx) * bq, sy + (ey - sy) * bq); ctx.stroke();
    }
    ctx.globalAlpha = fade; ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } };
}

function plane(api) {
  const dir = Math.random() < 0.5 ? 1 : -1, trail = [];
  return { duration: 5, draw(p) {
    const b = wordBounds(api), c = api.palette.colors(), ctx = api.front, s = b.h * 0.14;
    const x0 = dir > 0 ? b.x0 - s : b.x1 + s, x1 = dir > 0 ? b.x1 + s : b.x0 - s;
    const m = easeInOut(p), x = x0 + (x1 - x0) * m, yc = b.top - b.h * 0.25;
    const y = yc + Math.sin(p * Math.PI * 3) * b.h * 0.08;
    const slope = Math.cos(p * Math.PI * 3) * b.h * 0.08 * Math.PI * 3 / Math.abs(x1 - x0) * dir;
    if (!trail.length || Math.hypot(x - trail[trail.length - 1].x, y - trail[trail.length - 1].y) > s * 0.6) trail.push({ x, y, t: p });
    ctx.save(); ctx.fillStyle = c.ink;
    trail.forEach(q => { const a = clamp(1 - (p - q.t) / 0.5) * 0.5; if (a > 0) { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q.x, q.y, 1.2, 0, Math.PI * 2); ctx.fill(); } });
    ctx.globalAlpha = 1 - clamp((p - 0.92) / 0.08); ctx.translate(x, y); ctx.rotate(Math.atan(slope) * 0.6); ctx.scale(dir, 1);
    ctx.beginPath(); ctx.moveTo(s * 0.6, 0); ctx.lineTo(-s * 0.5, -s * 0.3); ctx.lineTo(-s * 0.25, 0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(s * 0.6, 0); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(-s * 0.45, s * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
  } };
}

function tree(api) {
  const idx = Math.floor(Math.random() * 8), tiers = 2 + Math.floor(Math.random() * 2);
  return { duration: 5, draw(p, t) {
    const r = api.letterRect(api.letters[idx]), c = api.palette.colors(), ctx = api.front;
    const top = r.y + r.h * (idx === 0 || idx === 3 || idx === 5 ? 0.12 : 0.32), H = r.h * 0.3, w = r.w * 0.5;
    const shrink = 1 - easeOutCubic(clamp((p - 0.8) / 0.2)); if (shrink <= 0.001) return;
    const trunk = easeOutCubic(clamp(p / 0.15)) * shrink;
    const sway = p > 0.15 && p < 0.8 ? Math.sin(t * 3) * 4 * Math.PI / 180 * clamp((p - 0.15) / 0.15) : 0;
    ctx.save(); ctx.translate(r.x + r.w / 2, top); ctx.rotate(r.rot + sway); ctx.scale(shrink, shrink);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -H * 0.35 * trunk); ctx.stroke();
    ctx.fillStyle = c.accent3; ctx.lineWidth = 1.5;
    for (let i = 0; i < tiers; i++) {
      const s = clamp((p - 0.15 - i * 0.12) / 0.25); if (s <= 0) break;
      const k = easeOutBack(s), yb = -H * (0.3 + i * 0.22), tw = w * (1 - i * 0.22) * k, th = H * 0.3 * k;
      ctx.beginPath(); ctx.moveTo(-tw / 2, yb); ctx.lineTo(tw / 2, yb); ctx.lineTo(0, yb - th); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  } };
}

function snow(api) {
  const flakes = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 0.6, ph: Math.random() * 6.28 }));
  return { duration: 7, draw(p, t) {
    const c = api.palette.colors(), ctx = api.front, W = api.W, H = api.H;
    const a = 0.5 * clamp(p * 7) * (1 - clamp((p * 7 - 6)));
    ctx.save(); ctx.fillStyle = c.ink; ctx.globalAlpha = a;
    for (const f of flakes) {
      const y = ((f.y + p * 7 * 0.05 * f.s) % 1) * H, x = (f.x * W + Math.sin(t * 0.8 + f.ph) * 14 + W) % W;
      ctx.beginPath(); ctx.arc(x, y, 1 + f.s * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } };
}

export const SKY_SCENES = [
  { name: 'ridge', weight: 1, interactive: false, create: ridge },
  { name: 'sun', weight: 0.9, interactive: false, create: sun },
  { name: 'moon', weight: 0.5, interactive: false, create: moon },
  { name: 'star', weight: 0.9, interactive: true, create: star },
  { name: 'plane', weight: 0.8, interactive: false, create: plane },
  { name: 'tree', weight: 0.7, interactive: false, create: tree },
  { name: 'snow', weight: 0.05, interactive: false, create: snow },
];
