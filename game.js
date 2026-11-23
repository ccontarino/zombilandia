"use strict";
// Zombilandia: platformer de zombies en canvas, sin librerías. Personajes y arte propios (rects de píxel).
const T = 16, H = 240, ROWS = 15;
let W = 480;
const cv = document.getElementById("c"), g = cv.getContext("2d");
function fit() { // en celu vertical el mundo se ve más angosto, así los sprites quedan grandes
  W = innerWidth < innerHeight ? 300 : 480; cv.width = W; cv.height = H; cv.style.aspectRatio = W + " / " + H; g.imageSmoothingEnabled = false;
}
fit(); addEventListener("resize", fit);

// ---------- Nivel ----------
const COLS = 190;
const map = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));
const set = (x, y, ch) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) map[y][x] = ch; };
const gaps = [[30, 33], [52, 55], [74, 78], [96, 99], [118, 123], [140, 143]];
for (let x = 0; x < COLS; x++) {
  if (gaps.some(([a, b]) => x >= a && x < b)) continue;
  set(x, 13, "#"); set(x, 14, "#");
}
const plat = (x, y, n, ch = "=") => { for (let i = 0; i < n; i++) set(x + i, y, ch); };
const coins = (x, y, n) => { for (let i = 0; i < n; i++) set(x + i, y, "c"); };
plat(12, 9, 4); coins(12, 8, 4);
plat(22, 10, 3, "?"); coins(22, 9, 3);
plat(36, 9, 5); coins(36, 8, 5);
plat(44, 7, 3); coins(44, 6, 3);
plat(58, 10, 4); plat(63, 8, 4); coins(63, 7, 4);
plat(70, 10, 3);
plat(82, 9, 6); coins(82, 8, 6);
plat(92, 10, 2); plat(100, 9, 3, "?"); coins(100, 8, 3);
plat(108, 10, 4); plat(113, 8, 4); coins(113, 7, 4);
plat(126, 9, 3); plat(131, 7, 3); coins(131, 6, 3);
plat(146, 10, 5); coins(146, 9, 5);
plat(156, 9, 3); plat(160, 7, 3); plat(164, 5, 3); coins(164, 4, 3);
for (let i = 0; i < 6; i++) for (let j = 0; j <= i; j++) set(172 + i, 12 - j, "#"); // escalera final
const goalX = 184;
const zombieSpawns = [18, 27, 40, 47, 60, 66, 85, 90, 104, 110, 115, 128, 134, 148, 152, 158, 166, 170];

// ---------- Estado ----------
const keys = { left: false, right: false, jump: false, fire: false };
let state, player, zombies, items, parts, cam, score, lives, brains, time, over, won, msg, msgT, shake, started = false;

function resetLevel(full) {
  if (full) { score = 0; lives = 3; brains = 0; }
  player = { x: 40, y: 150, vx: 0, vy: 0, w: 10, h: 14, face: 1, ground: false, coyote: 0, jumps: 0, cd: 0, beam: 0, beamDir: 1, ray: null, firePrev: false, inv: 0, dead: 0, step: 0 };
  zombies = zombieSpawns.map((x, i) => ({ x: x * T, y: 12 * T - 14, w: 12, h: 14, vx: (i % 2 ? 0.35 : -0.35) * (1 + (i % 3) * 0.2), dead: 0, step: i }));
  items = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === "c") items.push({ x: x * T + 4, y: y * T + 4, w: 8, h: 8, got: false });
  // los bloques "?" son sólidos y se resetean
  parts = []; cam = 0; time = 0; over = false; won = false; shake = 0; msg = ""; msgT = 0;
}
resetLevel(true);

const solid = (tx, ty) => { if (tx < 0 || tx >= COLS) return true; if (ty < 0) return false; if (ty >= ROWS) return false; const c = map[ty][tx]; return c === "#" || c === "=" || c === "?" || c === "u"; };
function collideX(o) {
  const dir = Math.sign(o.vx); o.x += o.vx;
  if (!dir) return false;
  const px = dir > 0 ? o.x + o.w : o.x;
  for (let y = Math.floor(o.y / T); y <= Math.floor((o.y + o.h - 0.01) / T); y++) {
    const tx = Math.floor(px / T);
    if (solid(tx, y)) { o.x = dir > 0 ? tx * T - o.w : (tx + 1) * T; o.vx = o.vx; return true; }
  }
  return false;
}
function collideY(o) {
  o.y += o.vy; o.ground = false;
  const dir = Math.sign(o.vy); if (!dir) return;
  const py = dir > 0 ? o.y + o.h : o.y;
  for (let x = Math.floor(o.x / T); x <= Math.floor((o.x + o.w - 0.01) / T); x++) {
    const ty = Math.floor(py / T);
    if (solid(x, ty)) {
      if (dir > 0) { o.y = ty * T - o.h; o.ground = true; }
      else {
        o.y = (ty + 1) * T;
        if (o === player && map[ty][x] === "?") { map[ty][x] = "u"; items.push({ x: x * T + 4, y: ty * T - 10, w: 8, h: 8, got: false }); beep(520, .08, "square"); }
      }
      o.vy = 0; return;
    }
  }
}
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- Audio ----------
let ac; const beep = (f, d, type = "square", f2) => {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), v = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, ac.currentTime);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + d);
    v.gain.setValueAtTime(0.06, ac.currentTime); v.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.connect(v).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
  } catch {}
};

// ---------- Lógica ----------
const say = (t) => { msg = t; msgT = 90; };
function burst(x, y, col, n = 8) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3 - .5, life: 30 + Math.random() * 20, col }); }
function hurt() {
  if (player.inv > 0 || player.dead) return;
  lives--; shake = 8; beep(180, .25, "sawtooth", 60);
  if (lives <= 0) { player.dead = 1; over = true; return; }
  player.inv = 90; player.vy = -4; player.vx = -player.face * 2;
}
function update() {
  if (!started) return;
  if (over || won) return;
  time++;
  const p = player, acc = p.ground ? 0.35 : 0.22, max = 1.9;
  if (keys.left) { p.vx -= acc; p.face = -1; } else if (keys.right) { p.vx += acc; p.face = 1; } else p.vx *= p.ground ? 0.78 : 0.95;
  p.vx = Math.max(-max, Math.min(max, p.vx));
  p.coyote = p.ground ? 6 : p.coyote - 1;
  if (p.ground) p.jumps = 0; else if (p.coyote <= 0 && p.jumps === 0) p.jumps = 1; // si se cae de un borde, queda el salto de aire
  if (keys.jump && !p.jumped) {
    if (p.coyote > 0) { p.vy = -5.1; p.jumped = true; p.coyote = 0; p.jumps = 1; beep(330, .12, "square", 660); }
    else if (p.jumps < 2) { p.vy = -4.9; p.jumped = true; p.jumps = 2; burst(p.x + 5, p.y + 14, "#9ad7ff", 8); beep(520, .12, "square", 980); } // doble salto
  }
  if (!keys.jump) { p.jumped = false; if (p.vy < -2) p.vy += 0.35; } // salto variable
  p.vy = Math.min(p.vy + 0.28, 6);
  const vyb = p.vy; collideX(p); collideY(p);
  if (p.ground && !p.wasG && vyb > 2.5) burst(p.x + 5, p.y + 14, "#9a8a7a", 6); // polvo al caer
  if (p.ground && Math.abs(p.vx) > 1.5 && time % 9 === 0) burst(p.x + 5, p.y + 14, "#6a5a4a", 1);
  p.wasG = p.ground;
  if (p.x < 0) p.x = 0;
  // rayo láser de ojos: se dispara al apretar, con recarga
  if (p.cd > 0) p.cd--;
  if (keys.fire && !p.firePrev && p.cd <= 0) { p.beam = 14; p.cd = 40; p.beamDir = p.face; shake = 3; beep(140, .25, "sawtooth", 900); }
  p.firePrev = keys.fire;
  if (p.beam > 0) {
    p.beam--;
    const d = p.beamDir, x0 = d > 0 ? p.x + p.w : p.x, y = p.y + 4; let len = 0;
    while (len < 150 && !solid(Math.floor((x0 + d * len) / T), Math.floor(y / T))) len += 2;
    p.ray = { x: d > 0 ? x0 : x0 - len, y: y - 1, w: len, h: 3 };
    if (time % 2 === 0) burst(x0 + d * len, y, "#bff8ff", 2); // chispas en el impacto
    for (const z of zombies) if (!z.dead && hit(p.ray, z)) { z.dead = 1; score += 50; burst(z.x + 6, z.y + 6, "#7fbf5a", 8); burst(z.x + 6, z.y + 6, "#bff8ff", 6); beep(200, .12, "square", 70); }
  } else p.ray = null;
  if (p.ground && Math.abs(p.vx) > .3) p.step += Math.abs(p.vx) * .12;
  if (p.inv > 0) p.inv--;
  if (p.y > ROWS * T + 20) { lives--; beep(150, .4, "sawtooth", 50); if (lives <= 0) over = true; else { const x = Math.max(40, Math.floor((p.x - 80) / T) * T); safeRespawn(x); } }

  for (const z of zombies) {
    if (z.dead) { z.dead++; continue; }
    if (Math.abs(z.x - p.x) > 260) continue; // solo se mueven cerca
    z.vy = Math.min((z.vy || 0) + 0.28, 6);
    const before = z.x; collideX(z);
    const ahead = Math.floor((z.vx > 0 ? z.x + z.w + 1 : z.x - 1) / T), under = Math.floor((z.y + z.h + 2) / T);
    if (z.x === before || (z.ground && !solid(ahead, under))) { z.vx = -z.vx; z.x = before; }
    collideY(z); z.step += .08;
    if (hit(p, z) && !p.dead) {
      if (p.vy > 0.5 && p.y + p.h - z.y < 10) { z.dead = 1; p.vy = keys.jump ? -5.6 : -3.6; score += 100; burst(z.x + 6, z.y + 6, "#7fbf5a"); beep(220, .15, "square", 90); }
      else hurt();
    }
  }
  for (const it of items) if (!it.got && hit(p, it)) { it.got = true; brains++; score += 10; beep(880, .08, "triangle", 1320); if (brains % 25 === 0) { lives++; say("¡Vida extra!"); } }
  if (p.x > goalX * T) { won = true; score += lives * 200; beep(660, .5, "triangle", 1320); }
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += .15; q.life--; }
  parts = parts.filter((q) => q.life > 0);
  cam = Math.max(0, Math.min(COLS * T - W, p.x - W / 2 + 20));
  if (shake) shake--;
  if (msgT) msgT--;
}
function safeRespawn(x) {
  // busca suelo firme hacia atrás
  let tx = Math.floor(x / T);
  while (tx > 1 && (!solid(tx, 13) || !solid(tx + 1, 13))) tx--;
  Object.assign(player, { x: tx * T, y: 150, vx: 0, vy: 0, inv: 90 });
}

// ---------- Dibujo ----------
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const stars = Array.from({ length: 80 }, (_, i) => [rnd(i) * 640, rnd(i + 99) * 130, rnd(i + 7)]);
const deco = [];
for (let x = 2; x < COLS - 12; x++) if (map[13][x] === "#" && map[12][x] === " " && map[11][x] === " ") {
  const r = rnd(x * 3.1); if (r > .9) deco.push([x, "tomb"]); else if (r > .84) deco.push([x, "cross"]); else if (r > .78) deco.push([x, "bones"]); else if (r > .55) deco.push([x, "weed"]);
}
let cache = {};
function grads() {
  if (cache.W === W) return cache;
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#07051a"); sky.addColorStop(.5, "#22163f"); sky.addColorStop(.85, "#4b2747"); sky.addColorStop(1, "#5e2f40");
  const moon = g.createRadialGradient(W - 70, 46, 6, W - 70, 46, 75); moon.addColorStop(0, "rgba(255,240,200,.45)"); moon.addColorStop(1, "rgba(255,240,200,0)");
  const fog = g.createLinearGradient(0, 150, 0, 215); fog.addColorStop(0, "rgba(170,150,210,0)"); fog.addColorStop(.6, "rgba(170,150,210,.18)"); fog.addColorStop(1, "rgba(170,150,210,0)");
  const vig = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .75); vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,.5)");
  return (cache = { W, sky, moon, fog, vig });
}
function layer(speed, period, fn) { const off = cam * speed, i0 = Math.floor(off / period) - 1; for (let i = i0; i <= i0 + Math.ceil(W / period) + 2; i++) fn(Math.round(i * period - off), i); }
function drawBg() {
  const c = grads();
  g.fillStyle = c.sky; g.fillRect(0, 0, W, H);
  for (const [x, y, s] of stars) { const sx = ((x - cam * .04) % 640 + 640) % 640; if (sx > W) continue; R(sx, y, 1, 1, Math.sin(time * .04 + x) > .7 ? "#fff" : s > .6 ? "#b9b0e0" : "#6d6496"); }
  g.fillStyle = c.moon; g.fillRect(0, 0, W, 130);
  g.fillStyle = "#f4ecc8"; g.beginPath(); g.arc(W - 70, 46, 16, 0, 7); g.fill();
  R(W - 78, 40, 4, 3, "#dcd2a8"); R(W - 66, 50, 5, 4, "#dcd2a8"); R(W - 72, 54, 3, 2, "#dcd2a8");
  g.globalAlpha = .55;
  layer(.08, 230, (x, i) => { const y = 28 + rnd(i) * 50; R(x, y, 64, 4, "#2e2152"); R(x + 12, y - 3, 34, 3, "#2e2152"); R(x + 20, y + 4, 30, 2, "#2e2152"); });
  g.globalAlpha = 1;
  for (let x = 0; x < W; x += 2) { const wx = x + cam * .15, h = 160 + Math.sin(wx * .018) * 10 + Math.sin(wx * .0067 + 1) * 16; R(x, h, 2, H - h, "#1e1538"); }
  layer(.35, 150, (x, i) => { // pueblo abandonado
    const r = rnd(i), w = Math.round(34 + r * 30), h = Math.round(40 + rnd(i + 5) * 40), base = 205, col = "#160f2b";
    R(x, base - h, w, h, col);
    if (r > .6) { const cx = x + (w >> 1); R(cx - 3, base - h - 18, 6, 18, col); R(cx - 1, base - h - 26, 2, 8, col); R(cx - 3, base - h - 23, 6, 2, col); }
    else { R(x - 3, base - h, w + 6, 3, col); R(x + 4, base - h - 8, 4, 8, col); }
    for (let k = 0; k < 4; k++) {
      const wx = x + 5 + (k % 2) * (w - 16), wy = base - h + 8 + (k >> 1) * 16, on = rnd(i * 4 + k) > .45 && Math.sin(time * .15 + i * 3 + k) > -.92;
      R(wx, wy, 6, 7, on ? "#f0b84a" : "#241a3c"); if (on) { g.globalAlpha = .22; R(wx - 2, wy - 2, 10, 11, "#f0b84a"); g.globalAlpha = 1; R(wx + 2, wy, 1, 7, "#8a5a20"); }
    }
  });
  layer(.6, 120, (x, i) => { // árboles secos y reja
    const col = "#0f0a1f";
    if (rnd(i + 3) > .45) {
      const tx = x + Math.round(rnd(i) * 60), th = Math.round(60 + rnd(i + 1) * 30), b = 212 - th;
      R(tx, b, 4, th, col); R(tx - 12, b + 12, 14, 2, col); R(tx - 14, b + 5, 2, 9, col); R(tx + 4, b + 20, 12, 2, col); R(tx + 14, b + 12, 2, 10, col); R(tx - 6, b + 30, 7, 2, col); R(tx + 1, b - 6, 2, 6, col);
    }
    for (let k = 0; k < 120; k += 8) { R(x + k, 196, 2, 16, col); R(x + k, 194, 2, 2, col); }
    R(x, 199, 120, 2, col); R(x, 206, 120, 1, col);
  });
  g.fillStyle = c.fog; g.fillRect(0, 150, W, 65);
  g.globalAlpha = .08; layer(.9, 200, (x, i) => R(x + ((time * .2) % 40), 185 + rnd(i) * 15, 120, 6, "#cfc2f0")); g.globalAlpha = 1;
}
function drawDeco(x, y, k) {
  if (k === "tomb") { R(x + 3, y + 4, 10, 12, "#5d5870"); R(x + 4, y + 2, 8, 2, "#5d5870"); R(x + 5, y + 1, 6, 1, "#5d5870"); R(x + 3, y + 4, 1, 12, "#7a7590"); R(x + 6, y + 6, 4, 1, "#3e3a50"); R(x + 6, y + 8, 4, 1, "#3e3a50"); R(x + 4, y + 13, 3, 2, "#4f7a3a"); }
  else if (k === "cross") { R(x + 7, y + 3, 2, 13, "#4a3a2a"); R(x + 4, y + 6, 8, 2, "#4a3a2a"); R(x + 7, y + 3, 1, 13, "#6a5440"); }
  else if (k === "bones") { R(x + 3, y + 14, 8, 2, "#d8d0c0"); R(x + 2, y + 13, 2, 1, "#d8d0c0"); R(x + 10, y + 13, 2, 1, "#d8d0c0"); R(x + 9, y + 10, 5, 4, "#e8e0d0"); R(x + 10, y + 11, 1, 1, "#222"); R(x + 12, y + 11, 1, 1, "#222"); }
  else { R(x + 4, y + 12, 1, 4, "#3f6a2a"); R(x + 6, y + 10, 1, 6, "#4f8a35"); R(x + 8, y + 13, 1, 3, "#3f6a2a"); R(x + 10, y + 11, 1, 5, "#4f8a35"); }
}
function drawTiles() {
  const ox = Math.floor(cam), x0 = Math.floor(cam / T), x1 = Math.min(COLS - 1, x0 + Math.ceil(W / T) + 1);
  for (const [x, k] of deco) if (x >= x0 - 1 && x <= x1) drawDeco(x * T - ox, 12 * T, k);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const c = map[y][x]; if (c === " " || c === "c") continue;
    const px = x * T - ox, py = y * T, r = rnd(x * 7 + y);
    if (c === "#") {
      const top = map[y - 1]?.[x] !== "#";
      R(px, py, T, T, top ? "#4a3326" : "#3a281f");
      R(px + (r * 10 | 0), py + 6, 3, 2, "#2d1f18"); R(px + 2 + (r * 7 | 0), py + 11, 2, 2, "#5a4234"); R(px + 11, py + 3 + (r * 8 | 0), 2, 1, "#2d1f18");
      if (r > .7) { R(px + 4, py + 9, 4, 3, "#6b5a4f"); R(px + 4, py + 9, 4, 1, "#8a7a6a"); }
      if (top) {
        R(px, py, T, 3, "#4f8a35"); R(px, py, T, 1, "#7cc456"); R(px, py + 3, T, 1, "#2f5a22"); R(px + (r * 12 | 0), py + 4, 2, 1, "#2f5a22");
        for (let k = 0; k < 4; k++) R(px + ((r * 13 + k * 4) % 15 | 0), py - 2 + (k % 2), 1, 2 - (k % 2), "#7cc456");
      }
    } else if (c === "=") {
      R(px, py, T, T, "#7a3f2e"); R(px, py, T, 2, "#b0644a"); R(px, py + T - 2, T, 2, "#4a2219");
      R(px, py + 7, T, 1, "#4a2219"); R(px + 7, py + 2, 1, 5, "#4a2219"); R(px + 3, py + 8, 1, 6, "#4a2219"); R(px + 12, py + 8, 1, 6, "#4a2219");
      R(px + 1, py + 3, 5, 1, "#93503b"); R(px + 9, py + 3, 5, 1, "#93503b"); if (r > .6) R(px + 5, py + 12, 4, 2, "#4f7a3a");
    } else if (c === "?") {
      const shine = (Math.floor(time / 8) + x) % 7 === 0;
      R(px, py, T, T, "#9a5a10"); R(px + 1, py + 1, T - 2, T - 2, shine ? "#ffe07a" : "#f2b632"); R(px + 1, py + 1, T - 2, 1, "#ffe9a8"); R(px + 1, py + T - 2, T - 2, 1, "#c27a10");
      for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(px + a, py + b, 1, 1, "#9a5a10");
      R(px + 6, py + 3, 5, 2, "#6a3a00"); R(px + 9, py + 5, 2, 2, "#6a3a00"); R(px + 7, py + 7, 2, 2, "#6a3a00"); R(px + 7, py + 11, 2, 2, "#6a3a00");
    } else if (c === "u") { R(px, py, T, T, "#4a3c30"); R(px + 1, py + 1, T - 2, T - 2, "#6b5a45"); R(px + 1, py + 1, T - 2, 1, "#8a7860"); }
  }
  const fx = goalX * T - ox; // bandera que flamea
  R(fx, 5 * T, 2, 8 * T, "#cfc8e8"); R(fx - 1, 5 * T - 3, 4, 4, "#f2c94c"); R(fx - 3, 13 * T - 3, 8, 3, "#6b5a4f");
  for (let k = 0; k < 18; k++) R(fx + 2 + k, 5 * T + 3 + Math.round(Math.sin(time * .15 - k * .5) * 1.5), 1, 12, k < 2 ? "#a02a24" : "#d6453d");
  R(fx + 8, 5 * T + 6 + Math.round(Math.sin(time * .15 - 3) * 1.5), 5, 5, "#f3efe6");
}
function drawItems() {
  for (const it of items) if (!it.got) {
    const x = it.x - Math.floor(cam), y = it.y + Math.round(Math.sin((time + it.x) * .1) * 1.5);
    g.globalAlpha = .12 + Math.sin(time * .1 + it.x) * .06; R(x - 1, y - 2, 10, 12, "#ff8fb8"); R(x - 2, y - 1, 12, 10, "#ff8fb8"); g.globalAlpha = 1;
    R(x + 1, y, 6, 1, "#f7a6c0"); R(x, y + 1, 8, 5, "#e57fa0"); R(x + 1, y + 6, 6, 1, "#c9617f"); R(x + 3, y + 7, 2, 1, "#c9617f");
    R(x + 4, y + 1, 1, 5, "#b04a6a"); R(x + 2, y + 2, 1, 2, "#b04a6a"); R(x + 6, y + 3, 1, 2, "#b04a6a"); R(x + 1, y + 1, 2, 1, "#ffd0de");
  }
}
const ZSKIN = [["#7fbf5a", "#5a8f3d"], ["#8fa89a", "#647a6e"], ["#a8b86b", "#7a8a45"]];
const ZSHIRT = ["#6a4f8a", "#7a3a3a", "#3a5a7a"];
function drawZombie(z, i) {
  const f = z.vx > 0 ? 1 : -1, s = Math.sin(z.step * 4), bob = s > 0 ? 1 : 0;
  const x = Math.round(z.x - cam), y = Math.round(z.y) + bob, [sk, skd] = ZSKIN[i % 3], sh = ZSHIRT[(i >> 1) % 3];
  if (z.dead) {
    if (z.dead > 60) return;
    g.globalAlpha = 1 - z.dead / 60; R(x - 2, y + 11 - bob, 16, 3, "#3f7a2a"); R(x + 1, y + 10 - bob, 4, 2, sk); R(x + 8, y + 12 - bob, 3, 1, "#ddd"); g.globalAlpha = 1; return;
  }
  g.globalAlpha = .35; R(x, y + 14 - bob, 12, 1, "#000"); g.globalAlpha = 1;
  R(x + 2, y + 11, 3, s > 0 ? 2 : 3, "#2f2840"); R(x + 7, y + 11, 3, s > 0 ? 3 : 2, "#2f2840");
  R(x + 2, y + 7, 8, 5, sh); R(x + 4, y + 9, 2, 2, sk); R(x + 2, y + 11, 2, 1, skd); R(x + 8, y + 7, 1, 3, "#00000040");
  const ay = y + 8 + (s > 0 ? 0 : 1);
  if (f > 0) { R(x + 9, ay, 6, 2, sk); R(x + 14, ay - 1, 1, 1, sk); } else { R(x - 3, ay, 6, 2, sk); R(x - 3, ay - 1, 1, 1, sk); }
  R(x + 2, y, 8, 7, sk); R(x + 2, y + 6, 8, 1, skd); R(x + 3, y - 1, 3, 1, "#3a2a20"); R(x + 7, y, 2, 1, "#3a2a20");
  const ex = f > 0 ? x + 6 : x + 3, eye = Math.sin(time * .1 + i) > 0 ? "#ff4040" : "#ffb020";
  R(ex, y + 2, 3, 2, "#1a1010"); R(ex + 1, y + 2, 1, 1, eye); R(f > 0 ? x + 3 : x + 7, y + 2, 2, 2, "#1a1010");
  R(x + (f > 0 ? 4 : 3), y + 5, 5, 1, "#2a1a1a"); R(x + (f > 0 ? 5 : 4), y + 5, 1, 1, "#eee"); R(x + (f > 0 ? 7 : 6), y + 5, 1, 1, "#eee");
}
function drawPlayer() {
  const p = player; if (p.dead) return;
  if (p.inv > 0 && Math.floor(p.inv / 4) % 2) return;
  const f = p.face, x = Math.round(p.x - cam) - 1, y = Math.round(p.y), s = Math.sin(p.step * 3), air = !p.ground, run = !air && Math.abs(p.vx) > .3;
  const P = (dx, dy, w, h, c) => R(f > 0 ? x + dx : x + 12 - dx - w, y + dy, w, h, c); // dibuja espejado según hacia dónde mira
  if (!air) { g.globalAlpha = .35; R(x + 1, y + 14, 10, 1, "#000"); g.globalAlpha = 1; }
  const len = 4 + Math.min(5, Math.abs(p.vx) * 2.5) + (air ? 2 : 0); // bufanda que flamea
  for (let k = 0; k < len; k++) P(1 - k, 6 + Math.round(Math.sin(time * .3 - k * .7) * (k / 3)) + (air ? -1 : 0), 1, 2, k % 2 ? "#ff8a3d" : "#e2672a");
  if (air) { P(3, 11, 3, 2, "#2b2340"); P(7, 10, 3, 2, "#2b2340"); P(3, 13, 3, 1, "#5a3a2a"); P(8, 12, 3, 1, "#5a3a2a"); }
  else { const a = run && s > 0, b = run && s <= 0; P(a ? 2 : 3, 11, 3, 2, "#2b2340"); P(b ? 8 : 7, 11, 3, 2, "#2b2340"); P(a ? 1 : 3, 13, 4, 1, "#5a3a2a"); P(b ? 8 : 7, 13, 4, 1, "#5a3a2a"); }
  P(2, 7, 8, 4, "#1f7a7a"); P(2, 7, 8, 1, "#2a9a9a"); P(5, 8, 1, 3, "#145555"); P(2, 10, 8, 1, "#145555");
  const arm = run && s > 0 ? 1 : 0; P(7, 8 + arm, 3, 2, "#1f7a7a"); P(10, 8 + arm, 1, 2, "#f0c8a0");
  P(2, 6, 8, 2, "#ff8a3d");
  P(2, 0, 8, 6, "#1f7a7a"); P(4, -1, 5, 1, "#1f7a7a"); P(3, 0, 6, 1, "#2a9a9a"); P(5, 2, 5, 4, "#f0c8a0"); P(5, 2, 5, 1, "#145555");
  const glow = p.beam > 0 ? .9 : .35 + Math.sin(time * .1) * .12;
  g.globalAlpha = glow; P(6, 2, 6, 3, "#7ff5ff"); g.globalAlpha = 1;
  P(6, 3, 1, 1, "#e8ffff"); P(8, 3, 1, 1, "#e8ffff"); P(7, 5, 2, 1, "#c08a70");
}
function drawBeam() {
  const p = player; if (!p.ray || p.beam <= 0) return;
  const r = p.ray, x = r.x - Math.floor(cam), start = p.beamDir > 0 ? x : x + r.w, end = p.beamDir > 0 ? x + r.w : x;
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = .16; R(x, r.y - 4, r.w, 11, "#3fd9ff");
  g.globalAlpha = .45; R(x, r.y - 1, r.w, 5, "#3fd9ff");
  g.globalAlpha = 1; R(x, r.y, r.w, 3, "#7ff5ff"); R(x, r.y + 1, r.w, 1, "#fff");
  g.globalAlpha = .7; g.fillStyle = "#bff8ff";
  g.beginPath(); g.arc(start, r.y + 1, 3 + (time % 2), 0, 7); g.fill();
  g.beginPath(); g.arc(end, r.y + 1, 4 + (time % 3), 0, 7); g.fill();
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}
function heart(x, y, c) { R(x + 1, y, 2, 1, c); R(x + 4, y, 2, 1, c); R(x, y + 1, 7, 2, c); R(x + 1, y + 3, 5, 1, c); R(x + 2, y + 4, 3, 1, c); R(x + 3, y + 5, 1, 1, c); }
function hud() {
  g.globalAlpha = .55; R(0, 0, W, 28, "#07051a"); g.globalAlpha = 1; R(0, 28, W, 1, "#2e2152");
  g.font = "bold 10px ui-monospace, monospace"; g.textBaseline = "top"; g.textAlign = "left";
  const t = (s, x, y, c = "#f3efe6") => { g.fillStyle = "#000"; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y); };
  const n = Math.min(6, Math.max(lives, 3)); for (let i = 0; i < n; i++) heart(8 + i * 9, 5, i < lives ? "#ff5a5a" : "#3a2a4a");
  const bx = 8 + n * 9 + 6; R(bx, 5, 7, 5, "#e57fa0"); R(bx + 3, 5, 1, 5, "#b04a6a"); t(String(brains), bx + 10, 3);
  t(String(score).padStart(5, "0"), W / 2 - 12, 3, "#f2c94c");
  const pct = Math.min(1, player.x / (goalX * T)); R(W - 52, 6, 40, 4, "#2e2152"); R(W - 52, 6, Math.round(40 * pct), 4, "#7cc456"); R(W - 10, 3, 1, 9, "#cfc8e8"); R(W - 9, 3, 5, 4, "#d6453d");
  t("RAYO", 8, 15, "#7ff5ff"); R(36, 18, 40, 4, "#1d3a4a"); R(36, 18, Math.round(40 * (1 - player.cd / 40)), 4, player.cd ? "#3fd9ff" : "#bff8ff");
  if (msgT) { g.textAlign = "center"; t(msg, W / 2, 44, "#f2c94c"); g.textAlign = "left"; }
}
function panel(title, sub, c) {
  g.fillStyle = "rgba(7,5,26,.8)"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "bold 30px ui-monospace, monospace";
  g.fillStyle = "#000"; g.fillText(title, W / 2 + 2, 82); g.shadowColor = c; g.shadowBlur = 14; g.fillStyle = c; g.fillText(title, W / 2, 80); g.shadowBlur = 0;
  g.fillStyle = "#f3efe6"; g.font = "11px ui-monospace, monospace";
  sub.forEach((s, i) => g.fillText(s, W / 2, 118 + i * 17)); g.textAlign = "left";
}
function draw() {
  g.save();
  if (shake) g.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 4));
  drawBg(); drawTiles(); drawItems();
  zombies.forEach((z, i) => { if (z.x - cam > -20 && z.x - cam < W + 20) drawZombie(z, i); });
  drawPlayer(); drawBeam();
  for (const q of parts) { g.globalAlpha = Math.min(1, q.life / 20); R(q.x - cam, q.y, 2, 2, q.col); } g.globalAlpha = 1;
  g.fillStyle = grads().vig; g.fillRect(0, 0, W, H);
  hud(); g.restore();
  if (!started) panel("ZOMBILANDIA", ["Saltá sobre los zombis o usá el rayo.", "Doble salto: saltá otra vez en el aire.", "Juntá cerebros y llegá a la bandera.", "", "Tocá o apretá una tecla para empezar"], "#7cc456");
  else if (over) panel("TE COMIERON", [`Puntos: ${score}`, "", "Tocá o apretá una tecla para reintentar"], "#ff5a5a");
  else if (won) panel("¡SOBREVIVISTE!", [`Puntos: ${score}  ·  Cerebros: ${brains}`, "", "Tocá o apretá una tecla para jugar otra vez"], "#f2c94c");
}

// ---------- Bucle (60 fps fijos) ----------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Entrada ----------
function press() { // empezar / reintentar
  if (!started) { started = true; return true; }
  if (over || won) { resetLevel(true); return true; }
  return false;
}
const map_k = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump", x: "fire", X: "fire", f: "fire", F: "fire", j: "fire", J: "fire", Shift: "fire", z: "fire", Z: "fire" };
addEventListener("keydown", (e) => { const k = map_k[e.key]; if (e.repeat) { if (k) e.preventDefault(); return; } if (press()) return; if (k) { keys[k] = true; e.preventDefault(); } });
addEventListener("keyup", (e) => { const k = map_k[e.key]; if (k) keys[k] = false; });
addEventListener("blur", () => { keys.left = keys.right = keys.jump = false; });
cv.addEventListener("pointerdown", () => { press(); });
document.querySelectorAll("#pad button").forEach((b) => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); if (press()) return; keys[k] = true; b.classList.add("on"); b.setPointerCapture?.(e.pointerId); };
  const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});
window.__game = { get state() { return { started, over, won, lives, score, brains, x: player.x, y: player.y }; }, keys };
