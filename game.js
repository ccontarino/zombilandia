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
  collideX(p); collideY(p);
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
    for (const z of zombies) if (!z.dead && hit(p.ray, z)) { z.dead = 1; score += 50; burst(z.x + 6, z.y + 6, "#ff6b5a", 10); beep(200, .12, "square", 70); }
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
const stars = Array.from({ length: 50 }, (_, i) => [(i * 97) % W, (i * 53) % 130, i % 3]);
function drawBg() {
  R(0, 0, W, H, "#1d1730"); R(0, 120, W, 120, "#2a1f3d");
  for (const [x, y, s] of stars) R(x, y, 1, 1, s ? "#8a80b0" : "#d8d2f0");
  R(W - 100, 24, 22, 22, "#f1e9b8"); R(W - 92, 28, 14, 14, "#1d1730"); // luna
  g.globalAlpha = .5;
  for (let i = 0; i < 12; i++) { // siluetas de casas y árboles lejanos
    const bx = ((i * 190 - cam * .3) % (12 * 190) + 12 * 190) % (12 * 190) - 100;
    R(bx, 150, 40, 70, "#17122a"); R(bx + 8, 140, 24, 12, "#17122a"); R(bx + 12, 160, 6, 8, "#e0b84a"); 
  }
  g.globalAlpha = 1;
}
function drawTiles() {
  const x0 = Math.floor(cam / T), x1 = Math.min(COLS - 1, x0 + W / T + 1);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const c = map[y][x], px = x * T - Math.floor(cam), py = y * T;
    if (c === "#") {
      const top = map[y - 1]?.[x] !== "#";
      R(px, py, T, T, "#4a3526"); R(px + 3, py + 5, 3, 2, "#3a281c"); R(px + 10, py + 10, 3, 2, "#3a281c");
      if (top) { R(px, py, T, 4, "#5f9a3f"); R(px + 2, py + 4, 2, 2, "#5f9a3f"); R(px + 9, py + 4, 3, 1, "#5f9a3f"); }
    } else if (c === "=") { R(px, py, T, T, "#8a4f3a"); R(px, py, T, 1, "#b8715a"); R(px, py + 7, T, 1, "#5f3326"); R(px + 7, py, 1, 8, "#5f3326"); R(px + 3, py + 8, 1, 8, "#5f3326"); }
    else if (c === "?") { R(px, py, T, T, "#e0a82a"); R(px + 1, py + 1, T - 2, T - 2, "#f2c94c"); R(px + 6, py + 3, 4, 2, "#8a5a00"); R(px + 8, py + 5, 2, 3, "#8a5a00"); R(px + 6, py + 9, 4, 2, "#8a5a00"); }
    else if (c === "u") { R(px, py, T, T, "#6b5a45"); R(px + 1, py + 1, T - 2, T - 2, "#8a7860"); }
  }
  // bandera
  const fx = goalX * T - Math.floor(cam);
  R(fx, 5 * T, 2, 8 * T, "#d8d2f0"); R(fx + 2, 5 * T + 2, 16, 10, "#d6453d"); R(fx + 6, 5 * T + 5, 4, 4, "#f3efe6");
}
function drawItems() {
  for (const it of items) if (!it.got) {
    const bob = Math.sin((time + it.x) * .1) * 1.5, x = it.x - Math.floor(cam), y = it.y + bob;
    R(x, y + 1, 8, 6, "#e57fa0"); R(x + 1, y, 6, 8, "#e57fa0"); R(x + 3, y + 1, 1, 6, "#b85577"); R(x + 5, y + 2, 1, 4, "#b85577");
  }
}
function drawZombie(z) {
  const x = Math.round(z.x - cam), y = Math.round(z.y), f = z.vx > 0 ? 1 : -1, s = Math.sin(z.step * 4) > 0;
  if (z.dead) { R(x - 1, y + 10, 14, 4, "#5f9a3f"); R(x + 3, y + 9, 3, 2, "#fff"); return; }
  R(x + 2, y, 8, 7, "#7fbf5a");              // cabeza
  R(x + (f > 0 ? 6 : 2), y + 2, 2, 2, "#fff"); R(x + (f > 0 ? 7 : 2), y + 3, 1, 1, "#222"); // ojo
  R(x + 3, y + 5, 6, 1, "#3a5a2a");            // boca
  R(x + 1, y + 7, 10, 4, "#6a4f8a");           // ropa
  R(x + (f > 0 ? 8 : -2), y + 7, 6, 2, "#7fbf5a"); // brazo estirado
  R(x + 2, y + 11, 3, 3 - (s ? 1 : 0), "#3b3050"); R(x + 7, y + 11, 3, 3 - (s ? 0 : 1), "#3b3050");
}
function drawPlayer() {
  const p = player; if (p.dead) return;
  if (p.inv > 0 && Math.floor(p.inv / 4) % 2) return;
  const x = Math.round(p.x - cam) - 1, y = Math.round(p.y), f = p.face, s = Math.sin(p.step * 3) > 0, air = !p.ground;
  R(x + 2, y, 8, 3, "#2f7fd6"); R(x + (f > 0 ? 6 : 0), y + 2, 6, 2, "#2f7fd6"); // gorra
  R(x + 2, y + 3, 8, 4, "#f0c8a0");           // cara
  R(x + (f > 0 ? 7 : 3), y + 4, 2, 2, p.beam > 0 ? "#ff3b30" : "#222"); // ojo (rojo al disparar)
  R(x + 1, y + 7, 10, 4, "#d6453d");           // remera
  R(x + (f > 0 ? 9 : -1), y + 7, 3, 3, "#f0c8a0");
  R(x + 2, y + 11, 3, air ? 3 : s ? 2 : 3, "#2a2a55"); R(x + 7, y + 11, 3, air ? 3 : s ? 3 : 2, "#2a2a55");
}
function hud() {
  g.font = "bold 10px ui-monospace, monospace"; g.textBaseline = "top";
  const t = (s, x, y, c = "#f3efe6") => { g.fillStyle = "#000"; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y); };
  t("♥".repeat(Math.max(0, lives)), 8, 6, "#e0524a"); t("🧠 " + brains, 60, 6); t(String(score).padStart(5, "0"), 110, 6);
  t("⚡", 8, 20, "#ff6b5a"); R(22, 23, 40, 5, "#3a2a4a"); R(22, 23, Math.round(40 * (1 - player.cd / 40)), 5, "#ff6b5a");
  const pct = Math.min(100, Math.floor(player.x / (goalX * T) * 100)); t(pct + "%", W - 34, 6);
  if (msgT) { g.textAlign = "center"; t(msg, W / 2, 40, "#f2c94c"); g.textAlign = "left"; }
}
function panel(title, sub, c) {
  g.fillStyle = "rgba(10,6,20,.78)"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.fillStyle = c; g.font = "bold 28px ui-monospace, monospace"; g.fillText(title, W / 2, 80);
  g.fillStyle = "#f3efe6"; g.font = "12px ui-monospace, monospace";
  sub.forEach((s, i) => g.fillText(s, W / 2, 124 + i * 18)); g.textAlign = "left";
}
function draw() {
  g.save();
  if (shake) g.translate((Math.random() - .5) * 4, (Math.random() - .5) * 4);
  drawBg(); drawTiles(); drawItems();
  zombies.forEach((z) => { if (z.x - cam > -20 && z.x - cam < W + 20) drawZombie(z); });
  drawPlayer();
  if (player.ray && player.beam > 0) { // rayo: halo, núcleo y brillo
    const r = player.ray, x = r.x - Math.floor(cam), fl = player.beam % 2;
    g.globalAlpha = .45; R(x, r.y - 2, r.w, 7, "#ff3b30"); g.globalAlpha = 1;
    R(x, r.y, r.w, 3, fl ? "#ff6b5a" : "#ff3b30"); R(x, r.y + 1, r.w, 1, "#fff");
  }
  for (const q of parts) R(q.x - cam, q.y, 2, 2, q.col);
  hud(); g.restore();
  if (!started) panel("ZOMBILANDIA", ["Saltales encima a los zombis o quemalos con el rayo.", "Doble salto: tocá saltar de nuevo en el aire.", "Juntá cerebros y llegá a la bandera.", "", "Tocá o apretá una tecla para empezar"], "#7fbf5a");
  else if (over) panel("TE COMIERON", [`Puntos: ${score}`, "Tocá o apretá una tecla para reintentar"], "#d6453d");
  else if (won) panel("¡SOBREVIVISTE!", [`Puntos: ${score}  ·  Cerebros: ${brains}`, "Tocá o apretá una tecla para jugar de nuevo"], "#f2c94c");
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
