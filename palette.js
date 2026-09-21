// palette.js — slowly evolving moods. Writes --bg/--ink/--accent* to :root and paints
// one soft, drifting circle of light on the back canvas. No globals, no libraries.

const MOODS = [
  { name: 'paper',   bg: '#f4efe6', ink: '#1a2447', accent: '#e07a4f', accent2: '#2f6fb0', accent3: '#6a9c5b' },
  { name: 'lake',    bg: '#e6eef3', ink: '#142a44', accent: '#3f7fb5', accent2: '#8fb6d3', accent3: '#d9b46a' },
  { name: 'alpine',  bg: '#eef1e8', ink: '#16302a', accent: '#4e8a5e', accent2: '#2f6b8a', accent3: '#d9a441' },
  { name: 'italian', bg: '#f7edc9', ink: '#4a2318', accent: '#c8613f', accent2: '#e29a5a', accent3: '#4f7c6b' },
  { name: 'evening', bg: '#101a33', ink: '#ece4d4', accent: '#e3a35a', accent2: '#5b8ac9', accent3: '#c97a67' },
  { name: 'golden',  bg: '#f6e7d2', ink: '#3a2418', accent: '#d98a3a', accent2: '#b9553f', accent3: '#6d7f9e' },
];
const KEYS = ['bg', 'ink', 'accent', 'accent2', 'accent3'];
const DARK = 4; // index of the one dark mood — used sparingly

// ------------------------------------------------------------ colour math (sRGB <-> OKLab)
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const clamp01 = v => Math.min(1, Math.max(0, v));

function rgbToOklab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gam(clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    gam(clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    gam(clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ];
}
const toHex = rgb => '#' + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
const mixLab = (A, B, t) => A.map((v, i) => v + (B[i] - v) * t);
const smooth = t => t * t * (3 - 2 * t);

const labMood = m => Object.fromEntries(KEYS.map(k => [k, rgbToOklab(hexToRgb(m[k]))]));
const LAB = MOODS.map(labMood);

// ------------------------------------------------------------ factory
export function createPalette(api) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');

  let from = 0, to = 0;          // mood indices
  let fade = 1;                  // 0..1 progress of crossfade (1 = settled on `to`)
  let fadeDur = 8;
  let nextShiftAt = 40 + Math.random() * 30;
  let lastEnergyShift = -100;
  let lastMeta = -1;
  const written = {};
  const cur = {};                // current CSS strings

  // ambient light: slow drift plus pointer follow
  const light = { x: 0, y: 0, init: false };

  function pickNext() {
    const pool = MOODS.map((_, i) => i).filter(i => i !== to);
    // the dark mood shows up rarely: drop it from the pool most of the time
    const filtered = Math.random() < 0.8 ? pool.filter(i => i !== DARK) : pool;
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
  function shiftTo(i) {
    from = to; to = i; fade = 0;
    fadeDur = 6 + Math.random() * 4;
    nextShiftAt = api.elapsed + fadeDur + 40 + Math.random() * 30;
  }

  function computeColors() {
    const t = smooth(clamp01(fade));
    for (const k of KEYS) cur[k] = toHex(oklabToRgb(mixLab(LAB[from][k], LAB[to][k], t)));
  }
  function writeCss(t) {
    for (const k of KEYS) {
      const v = cur[k];
      if (written[k] !== v) { root.style.setProperty('--' + k, v); written[k] = v; }
    }
    if (meta && t - lastMeta > 0.5) {
      lastMeta = t;
      if (meta.getAttribute('content') !== cur.bg) meta.setAttribute('content', cur.bg);
    }
  }

  function drawLight(dt) {
    const { W, H, back: ctx, pointer, reduced } = api;
    if (!W || !H) return;
    const R = Math.max(W, H) * 0.55;
    // drift path: one slow loop around the middle every ~180 s
    const a = (api.elapsed / 180) * Math.PI * 2;
    const dx = W * 0.5 + Math.cos(a) * W * 0.28, dy = H * 0.5 + Math.sin(a * 0.7) * H * 0.24;
    if (!light.init || reduced) { light.x = reduced ? W * 0.5 : dx; light.y = reduced ? H * 0.45 : dy; light.init = true; }
    else {
      const tx = pointer.inside ? pointer.x : dx, ty = pointer.inside ? pointer.y : dy;
      const lag = (pointer.inside ? 0.03 : 0.01) * Math.min(3, dt * 60);
      light.x += (tx - light.x) * lag; light.y += (ty - light.y) * lag;
    }
    const alpha = to === DARK && fade > 0.5 ? 0.07 : 0.09;
    const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, R);
    g.addColorStop(0, cur.accent + Math.round(alpha * 255).toString(16).padStart(2, '0'));
    g.addColorStop(0.55, cur.accent + Math.round(alpha * 0.35 * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, cur.accent + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function update(t, dt) {
    const e = api.elapsed;
    if (fade < 1) fade = Math.min(1, fade + dt / fadeDur);
    else if (e >= nextShiftAt) shiftTo(pickNext());
    else if (api.energy > 0.8 && e - lastEnergyShift > 20 && Math.random() < dt * 0.5) {
      lastEnergyShift = e; shiftTo(pickNext());
    }
    computeColors();
    writeCss(t);
    drawLight(dt);
  }

  computeColors();
  return { update, colors: () => ({ ...cur }) };
}
