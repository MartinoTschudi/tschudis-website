// scenes.js — scheduler for easter-egg scenes plus the signature confetti burst.
import { GROUND_SCENES } from './scenes-ground.js';
import { SKY_SCENES } from './scenes-sky.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createScenes(api) {
  const all = [...GROUND_SCENES, ...SKY_SCENES];
  let active = null;          // { name, scene, start }
  let lastName = null;
  let nextAt = null;          // elapsed time at which the next ambient scene starts
  let lastInteractionT = -10;
  const particles = [];
  const MAX_PARTICLES = 200;

  function pick(list) {
    const pool = list.filter(s => s.name !== lastName);
    const src = pool.length ? pool : list;
    let total = 0;
    for (const s of src) total += s.weight || 1;
    let r = Math.random() * total;
    for (const s of src) { r -= s.weight || 1; if (r <= 0) return s; }
    return src[src.length - 1];
  }

  function start(factory, ctxInfo) {
    if (!factory) return;
    let scene = null;
    try { scene = factory.create(api, ctxInfo); } catch (e) { scene = null; }
    if (!scene || typeof scene.draw !== 'function') return;
    active = { name: factory.name, scene, start: api.elapsed, duration: Math.max(0.1, scene.duration || 4) };
    lastName = factory.name;
  }

  function scheduleNext() {
    let gap = rnd(14, 24);
    if (api.stillness > 6) gap *= 0.7;
    nextAt = api.elapsed + gap;
  }

  // A scene that throws mid-draw may leave save()/clip()/alpha state behind; wipe it.
  function resetCanvasState() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    for (const c of [api.front, api.back]) {
      if (typeof c.reset === 'function') c.reset();
      else { for (let i = 0; i < 16; i++) c.restore(); c.globalAlpha = 1; c.setLineDash([]); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function updateScene(t, dt) {
    if (active) {
      const p = (api.elapsed - active.start) / active.duration;
      if (p >= 1) { active = null; nextAt = null; }
      else {
        try { active.scene.draw(Math.max(0, p), t, dt); }
        catch (e) { active = null; nextAt = null; resetCanvasState(); }
      }
    }
    if (api.reduced || active || api.elapsed <= 6) return;
    if (nextAt == null) scheduleNext();
    else if (api.elapsed >= nextAt) { nextAt = null; start(pick(all), null); }
  }

  function updateParticles(dt) {
    if (!particles.length) return;
    const ctx = api.front;
    const drag = Math.pow(0.985, dt * 60);
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.age += dt;
      if (q.age >= q.life) { particles.splice(i, 1); continue; }
      q.vy += 900 * dt;
      q.vx *= drag; q.vy *= drag;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.rot += q.vr * dt;
      const rem = 1 - q.age / q.life;
      const alpha = rem < 1 / 3 ? rem * 3 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
      ctx.restore();
    }
  }

  return {
    update(t, dt) {
      updateScene(t, dt);
      updateParticles(dt);
    },

    onInteraction(strength, x, y) {
      if (api.reduced || active) return;
      if (api.elapsed - lastInteractionT < 3) return;
      const list = all.filter(s => s.interactive);
      if (!list.length) return;
      lastInteractionT = api.elapsed;
      nextAt = null;
      start(pick(list), { x, y });
    },

    signature(x, y, dirx) {
      if (api.reduced) return;
      const c = api.palette.colors();
      const colors = [c.accent, c.accent2, c.accent3, c.ink];
      const n = Math.min(Math.floor(rnd(50, 71)), MAX_PARTICLES - particles.length);
      const d = dirx || 1;
      for (let i = 0; i < n; i++) {
        const spread = rnd(-0.35, 0.35);
        particles.push({
          x, y,
          vx: d * rnd(200, 700) + spread * 300, vy: -rnd(150, 500),
          w: rnd(5, 9), h: rnd(3, 5),
          rot: rnd(0, Math.PI * 2), vr: rnd(-12, 12),
          color: colors[Math.floor(Math.random() * colors.length)],
          age: 0, life: 1.6,
        });
      }
    },
  };
}
