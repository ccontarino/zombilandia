"use strict";
// Zombilandia: platformer de zombies en canvas, sin librerías. Personajes y arte propios (rects de píxel).
// 5 niveles: cementerio, ciudad en ruinas, pantano tóxico, laboratorio y la guarida del Rey Zombi (jefe final).
const VERSION = "v14"; // subir en cada publicación (también en index.html)
const T = 16, H = 240, ROWS = 15, COLS = 190;
let W = 480, cache = {};
const cv = document.getElementById("c"), g = cv.getContext("2d");
function fit() { // en celu vertical el mundo se ve más angosto, así los sprites quedan grandes
  W = innerWidth < innerHeight ? 300 : 480; cv.width = W; cv.height = H; cv.style.aspectRatio = W + " / " + H; g.imageSmoothingEnabled = false; cache = {};
}
fit(); addEventListener("resize", fit);

const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;

// ---------- Mapa ----------
// "#" suelo, "=" plataforma, "?" bloque sorpresa, "u" bloque usado, "c" cerebro, "~" líquido mortal, "x" pinches, "^" resorte
const map = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));
const set = (x, y, ch) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) map[y][x] = ch; };
const fill = (x0, x1, y0, y1, ch) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, ch); };
const plat = (x, y, n, ch = "=") => fill(x, x + n - 1, y, y, ch);
const coins = (x, y, n) => { for (let i = 0; i < n; i++) if (map[y]?.[x + i] === " ") set(x + i, y, "c"); };
const arc = (x, y, n) => { for (let i = 0; i < n; i++) if (map[y - Math.round(Math.sin(i / (n - 1) * Math.PI) * 2)]?.[x + i] === " ") set(x + i, y - Math.round(Math.sin(i / (n - 1) * Math.PI) * 2), "c"); };
const S = (s) => s.split(" ").map((t) => [parseInt(t), { w: "walker", r: "runner", j: "jumper", b: "brute", B: "boss" }[t.slice(-1)]]);
const solid = (tx, ty) => { if (tx < 0 || tx >= COLS) return true; if (ty < 0 || ty >= ROWS) return false; const c = map[ty][tx]; return c === "#" || c === "=" || c === "?" || c === "S" || c === "u" || c === "^"; };
function surface(col) { let r = ROWS - 1; if (!solid(col, r)) return -1; while (r > 0 && solid(col, r - 1)) r--; return r; }

const THEMES = {
  cemetery: { sky: ["#07051a", "#22163f", "#4b2747", "#5e2f40"], stars: 1, moon: "#f4ecc8", cloud: "#2e2152", hill: "#1e1538", mid: "town", near: "graves", fog: "#aa96d2",
    grass: ["#7cc456", "#4f8a35", "#2f5a22"], dirt: ["#4a3326", "#3a281f", "#2d1f18", "#5a4234"], plat: ["#7a3f2e", "#b0644a", "#4a2219"], deco: ["tomb", "cross", "bones", "weed", "weed"] },
  city: { sky: ["#140a14", "#3e1c24", "#8e3e26", "#c8703a"], stars: 0, moon: "#ffb070", cloud: "#4a2226", hill: "#2a1620", mid: "city", near: "rubble", fog: "#c87850", ambient: "ash",
    grass: ["#a4a4b0", "#6e6e7a", "#3e3e48"], dirt: ["#55555f", "#44444e", "#2a2a32", "#6a6a74"], plat: ["#a8541e", "#e8964a", "#5a2810"], deco: ["cone", "barrel", "rubble", "rubble", "sign"] },
  swamp: { sky: ["#030a08", "#0c2a1e", "#1e4a2e", "#3a5a2a"], stars: 1, moon: "#d8f0a0", cloud: "#123222", hill: "#0a2016", mid: "swamp", near: "reeds", fog: "#78c878", ambient: "fireflies",
    grass: ["#8acb4a", "#4a7a2a", "#2a4a1a"], dirt: ["#3a2e1e", "#2e2416", "#22190f", "#4a3a26"], plat: ["#6a4a2a", "#8a6a3a", "#3a2614"], deco: ["mushroom", "reeds", "reeds", "bones", "weed"], liquid: ["#7aff4a", "#2a8a1a"] },
  lab: { indoor: 1, sky: ["#0a0e18", "#121a2a", "#1a2436", "#1e2a3e"], fog: "#50b4ff", ambient: "drips",
    grass: ["#9aaabb", "#5a6676", "#2e3644"], dirt: ["#3a4454", "#2e3644", "#222a36", "#4a5666"], plat: ["#6a7686", "#9aaabb", "#3a4454"], deco: ["crate", "barrel", "tank", "crate"], liquid: ["#c6ff3a", "#5a9a10"] },
  lair: { sky: ["#0a0204", "#2a0608", "#6a1410", "#a02a10"], stars: 0, moon: "#ff6a3a", cloud: "#3a0a0a", hill: "#1a0606", mid: "castle", near: "fence", fog: "#ff5a28", ambient: "embers",
    grass: ["#8a6a70", "#5a4a52", "#3a2e34"], dirt: ["#4a3a42", "#3a2e34", "#2a2026", "#5a4a52"], plat: ["#5a4a52", "#7a6a70", "#2a2026"], deco: ["skull", "torch", "bones", "skull", "torch"], liquid: ["#ffcc33", "#ff5a10"] },
};

const LEVELS = [
  { name: "El cementerio", theme: "cemetery", build() {
    fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[30, 32], [52, 54], [74, 77], [96, 98], [118, 122], [140, 142]]) fill(a, b, 13, 14, " ");
    plat(12, 9, 4); coins(12, 8, 4); plat(22, 10, 3, "?"); coins(22, 9, 3); plat(36, 9, 5); coins(36, 8, 5); plat(44, 7, 3); coins(44, 6, 3);
    plat(58, 10, 4); plat(63, 8, 4); coins(63, 7, 4); plat(70, 10, 3); plat(82, 9, 6); coins(82, 8, 6); plat(92, 10, 2); plat(100, 9, 3, "?"); coins(100, 8, 3);
    plat(108, 10, 4); plat(113, 8, 4); coins(113, 7, 4); plat(126, 9, 3); plat(131, 7, 3); coins(131, 6, 3); plat(146, 10, 5); coins(146, 9, 5);
    plat(156, 9, 3); plat(160, 7, 3); plat(164, 5, 3); coins(164, 4, 3);
    for (let i = 0; i < 6; i++) fill(172 + i, 172 + i, 12 - i, 12, "#");
    set(23, 10, "S");
    return { goal: 184, spawns: S("18w 27w 40w 47w 60w 66w 85w 90w 104w 110r 115w 128w 134w 148r 152w 158w 166r 170w") };
  } },
  { name: "Ciudad en ruinas", theme: "city", build() {
    const B = [[0, 15, 13], [18, 27, 11], [30, 37, 9], [40, 47, 10], [51, 58, 12], [61, 66, 8], [69, 78, 11], [82, 88, 10], [92, 100, 12], [104, 110, 9], [113, 120, 7], [123, 132, 10], [136, 141, 12], [145, 152, 9], [155, 160, 11], [163, 170, 8], [173, 189, 12]];
    for (const [a, b, t] of B) fill(a, b, t, 14, "#");
    for (let i = 0; i < B.length - 1; i++) { const [, b1, t1] = B[i], [a2, , t2] = B[i + 1]; arc(b1, Math.min(t1, t2) - 2, a2 - b1 + 1); }
    set(57, 11, "^"); set(159, 10, "^"); set(26, 10, "^");
    plat(21, 6, 3, "?"); plat(72, 7, 3, "?"); plat(126, 6, 2, "?"); plat(43, 6, 3); coins(43, 5, 3); plat(85, 6, 3); coins(85, 5, 3); plat(147, 5, 4); coins(147, 4, 4);
    set(73, 7, "S");
    return { goal: 185, spawns: S("22w 34w 44r 54w 63j 73r 76w 85w 96r 107w 116j 127r 130w 148b 158r 166w 178r 181w") };
  } },
  { name: "Pantano tóxico", theme: "swamp", build() {
    fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[14, 18], [26, 31], [40, 44], [50, 57], [66, 70], [78, 85], [95, 99], [108, 115], [124, 128], [136, 143], [152, 157], [166, 169]]) {
      fill(a, b, 13, 14, "~"); const n = b - a + 1;
      if (n > 5) { const m = a + Math.floor(n / 2) - 1; plat(m, 11, 2); coins(m, 10, 2); } else arc(a - 1, 11, n + 2);
    }
    fill(20, 24, 12, 12, "#"); fill(60, 63, 11, 12, "#"); fill(88, 92, 12, 12, "#"); fill(130, 133, 11, 12, "#"); fill(160, 163, 12, 12, "#");
    plat(34, 9, 4); coins(34, 8, 4); plat(102, 8, 3, "?"); plat(118, 9, 4); coins(118, 8, 4); plat(146, 8, 3); coins(146, 7, 3); plat(172, 9, 3, "?"); plat(46, 9, 2, "?");
    for (let i = 0; i < 4; i++) fill(176 + i, 176 + i, 12 - i, 12, "#");
    set(103, 8, "S");
    return { goal: 185, spawns: S("10w 22j 35w 46j 60w 62j 74r 89j 92w 104j 119w 121j 131b 148j 160r 163j 172w") };
  } },
  { name: "El laboratorio", theme: "lab", build() {
    fill(0, COLS - 1, 0, 1, "#"); fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[34, 38], [70, 75], [110, 116], [150, 155]]) fill(a, b, 13, 14, "~");
    for (const [a, b] of [[20, 23], [56, 59], [90, 93], [128, 131], [168, 170]]) { fill(a, b, 12, 12, "x"); arc(a - 1, 9, b - a + 3); }
    fill(44, 45, 2, 9, "#"); fill(100, 101, 2, 9, "#"); fill(140, 141, 2, 8, "#");
    fill(62, 63, 10, 12, "#"); fill(120, 121, 9, 12, "#"); set(117, 12, "^"); set(60, 12, "^");
    plat(35, 10, 3); coins(35, 9, 3); plat(71, 10, 4); coins(71, 9, 4); plat(111, 10, 2); plat(114, 8, 2); coins(114, 7, 2); plat(151, 10, 4); coins(151, 9, 4);
    plat(26, 8, 3, "?"); plat(80, 8, 3, "?"); plat(160, 8, 3, "?"); plat(50, 9, 3); coins(50, 8, 3);
    set(81, 8, "S");
    return { goal: 185, spawns: S("16w 28r 48b 66w 78r 86j 96w 105b 124r 133w 146b 158r 163j 175b 180r") };
  } },
  { name: "La guarida del Rey Zombi", theme: "lair", boss: true, build() {
    fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[18, 22], [34, 39], [52, 56], [68, 74], [90, 95], [108, 114], [126, 131], [144, 150]]) {
      fill(a, b, 13, 14, "~"); const n = b - a + 1;
      if (n > 5) { const m = a + Math.floor(n / 2) - 1; plat(m, 10, 2); coins(m, 9, 2); } else arc(a - 1, 11, n + 2);
    }
    for (const [a, b] of [[44, 46], [60, 62], [100, 102], [136, 138]]) fill(a, b, 12, 12, "x");
    fill(80, 83, 9, 12, "#"); set(77, 12, "^"); fill(118, 121, 8, 12, "#"); set(116, 12, "^");
    plat(26, 9, 4); coins(26, 8, 4); plat(58, 8, 3, "?"); plat(84, 6, 4); coins(84, 5, 4); plat(96, 9, 3, "?"); plat(122, 6, 3); coins(122, 5, 3); plat(138, 8, 4); coins(138, 7, 4);
    plat(165, 9, 3); plat(176, 7, 3, "?");
    set(59, 8, "S"); set(177, 7, "S");
    return { goal: 186, spawns: S("12w 25r 30j 42b 48r 59w 64j 75w 87r 98b 104j 124r 134b 141j 154r 178B") };
  } },
];

// ---------- Estado ----------
const keys = { left: false, right: false, jump: false, fire: false }, tap = { jump: false, fire: false }; // tap: toques rápidos que no deben perderse
const ZT = {
  walker: { w: 12, h: 14, hp: 1, speed: .4, pts: 100 },
  runner: { w: 12, h: 14, hp: 1, speed: 1.0, pts: 150 },
  jumper: { w: 12, h: 14, hp: 1, speed: .5, pts: 150 },
  brute: { w: 16, h: 20, hp: 3, speed: .28, pts: 300 },
  boss: { w: 28, h: 36, hp: 12, speed: .55, pts: 2000 },
};
let bossCheck = null; // punto de control en la arena del jefe: si perdés ahí, volvés directo al jefe
let mode = "title", levelIdx = 0, L, TH, goalX = 184, levelStart = 0, banner = 0, bossDead = false, arenaLocked = false, deco = [];
let player, zombies, items, parts, cam = 0, score = 0, lives = 3, brains = 0, time = 0, msg = "", msgT = 0, shake = 0, unlocked = 1;
try { unlocked = Math.max(1, Math.min(LEVELS.length, +localStorage.getItem("zombilandia-nivel") || 1)); } catch {}
const urlLevel = Math.max(1, Math.min(LEVELS.length, +new URLSearchParams(location.search).get("nivel") || 0)) || 0;
if (urlLevel) unlocked = Math.max(unlocked, urlLevel);

function makeZombie(x, y, type, i) {
  const k = ZT[type];
  return { x, y, w: k.w, h: k.h, type, hp: k.hp, vx: (i % 2 ? 1 : -1) * k.speed * (.85 + rnd(i) * .3), vy: 0, dead: 0, step: i, t: i * 17, flash: 0, shot: -1, idx: i };
}
function loadLevel(i) {
  const keep = player ? Math.max(player.tier, player.want) : 0; // el modo bestia pasa al nivel siguiente
  levelIdx = i; L = LEVELS[i]; TH = THEMES[L.theme]; cache = {};
  for (const row of map) row.fill(" ");
  const info = L.build(); goalX = info.goal;
  player = { x: 40, y: 150, vx: 0, vy: 0, w: 10, h: 14, face: 1, ground: false, coyote: 0, jumps: 0, cd: 0, beam: 0, beamDir: 1, ray: null, firePrev: false, shot: 0, inv: 0, dead: 0, step: 0, springT: 0, big: false, tier: 0, want: keep, growing: keep > 0, power: keep > 0 ? 1 : 0, beamBig: false, beamTier: 0, safe: { x: 40, y: 150 } };
  zombies = [];
  info.spawns.forEach(([col, type], n) => { const r = surface(col), k = ZT[type]; if (r > 0) zombies.push(makeZombie(col * T + (T - k.w) / 2, r * T - k.h, type, n)); });
  items = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === "c") items.push({ x: x * T + 4, y: y * T + 4, w: 8, h: 8, got: false });
  totalBrains = items.length + map.reduce((n, row) => n + row.filter((c) => c === "?").length, 0); gotBrains = 0; levelTime = 0; damaged = false;
  deco = [];
  for (let x = 4; x < goalX - 3; x++) {
    const r = surface(x); if (r < 3 || map[r][x] !== "#" || map[r - 1][x] !== " " || map[r - 2][x] === "#") continue;
    if (map[r][x - 1] === "^" || map[r][x + 1] === "^" || map[r - 1][x - 1] === "^" || map[r - 1][x + 1] === "^" || map[r - 1][x - 1] === "x" || map[r - 1][x + 1] === "x") continue;
    const q = rnd(x * 3.1 + i * 13); if (q < .36) deco.push([x, r - 1, TH.deco[Math.floor(rnd(x + i) * TH.deco.length)]]);
  }
  parts = []; cam = 0; shake = 0; msg = ""; msgT = 0; banner = 160; bossDead = false; arenaLocked = false; levelStart = score;
  if (i + 1 > unlocked) { unlocked = i + 1; try { localStorage.setItem("zombilandia-nivel", unlocked); } catch {} }
}
function lockArena() { arenaLocked = true; fill(155, 156, 2, 12, "#"); shake = 20; beep(90, .8, "sawtooth", 40); }
// ---------- Récords ----------
// Top 5 guardado en el celu. Una partida ocupa un solo lugar: si volvés a perder en la misma partida, se actualiza.
let records = [], runId = 0, naming = false, lastName = "";
try { records = JSON.parse(localStorage.getItem("zombilandia-records") || "[]"); lastName = localStorage.getItem("zombilandia-nombre") || ""; } catch {}
const saveRecords = () => { try { localStorage.setItem("zombilandia-records", JSON.stringify(records)); } catch {} };
function recordScore() {
  if (score <= 0) return;
  const mine = records.find((r) => r.id === runId);
  if (mine) { if (score > mine.s) { mine.s = score; mine.lv = levelIdx + 1; records.sort((a, b) => b.s - a.s); saveRecords(); } return; }
  if (records.length >= 5 && score <= records.at(-1).s) return;
  const entry = { id: runId, n: lastName || "???", s: score, lv: levelIdx + 1 };
  records.push(entry); records.sort((a, b) => b.s - a.s); records = records.slice(0, 5); saveRecords();
  if (!records.includes(entry)) return;
  naming = true; // pedir iniciales
  const box = document.getElementById("nm"), inp = document.getElementById("nmIn");
  box.hidden = false; inp.value = lastName; keys.left = keys.right = keys.jump = keys.fire = false;
  setTimeout(() => inp.focus(), 50);
  const done = () => {
    const n = (inp.value || "???").toUpperCase().replace(/[^A-Z0-9ÑÁÉÍÓÚ]/g, "").slice(0, 3) || "???";
    entry.n = lastName = n; saveRecords(); try { localStorage.setItem("zombilandia-nombre", n); } catch {}
    box.hidden = true; inp.blur(); setTimeout(() => { naming = false; }, 250);
  };
  document.getElementById("nmOk").onclick = done;
  inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); done(); } e.stopPropagation(); };
}
const recLines = (n) => records.slice(0, n).map((r, i) => `${i + 1}. ${r.n.padEnd(3)}  ${String(r.s).padStart(6)}  N${r.lv}`);
// ---------- Tiempo y estrellas ----------
// 3 estrellas por nivel: llegar antes del tiempo meta, juntar todos los cerebros y no recibir ningún golpe.
const PAR = [60, 75, 80, 90, 120]; // segundos
let levelTime = 0, damaged = false, gotBrains = 0, totalBrains = 0, lastStars = [false, false, false], bests = {}, sel = unlocked - 1;
try { bests = JSON.parse(localStorage.getItem("zombilandia-estrellas") || "{}"); } catch {}
const clock = (f) => { const s = Math.floor(f / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function finishLevel() {
  lastStars = [levelTime / 60 <= PAR[levelIdx], gotBrains >= totalBrains, !damaged];
  const n = lastStars.filter(Boolean).length, b = bests[levelIdx] || { st: 0, t: Infinity };
  bests[levelIdx] = { st: Math.max(b.st, n), t: Math.min(b.t, levelTime) };
  try { localStorage.setItem("zombilandia-estrellas", JSON.stringify(bests)); } catch {}
}
function star(x, y, on) { const c = on ? "#f2c94c" : "#3a2f50"; R(x + 3, y, 1, 2, c); R(x, y + 2, 7, 1, c); R(x + 1, y + 3, 5, 1, c); R(x + 2, y + 4, 3, 1, c); R(x + 1, y + 5, 2, 1, c); R(x + 4, y + 5, 2, 1, c); }
function newGame(i) { runId = Date.now(); player = null; score = 0; lives = 3; brains = 0; loadLevel(i); mode = "play"; }
loadLevel(0);

function collideX(o) {
  const dir = Math.sign(o.vx); o.x += o.vx;
  if (!dir) return false;
  const px = dir > 0 ? o.x + o.w : o.x;
  for (let y = Math.floor(o.y / T); y <= Math.floor((o.y + o.h - 0.01) / T); y++) {
    const tx = Math.floor(px / T);
    if (solid(tx, y)) { o.x = dir > 0 ? tx * T - o.w : (tx + 1) * T; return true; }
  }
  return false;
}
function collideY(o) {
  o.y += o.vy; o.ground = false;
  const dir = Math.sign(o.vy); if (!dir) return;
  const py = dir > 0 ? o.y + o.h : o.y;
  for (let x = Math.floor(o.x / T); x <= Math.floor((o.x + o.w - 0.01) / T); x++) {
    const ty = Math.floor(py / T);
    if (!solid(x, ty)) continue;
    if (dir > 0) {
      o.y = ty * T - o.h;
      if (o === player && map[ty][x] === "^") { // resorte
        o.vy = -8.3; player.jumps = 1; player.springT = 10; beep(260, .25, "triangle", 900); burst(o.x + 5, o.y + 14, "#ffd060", 6); return;
      }
      o.ground = true;
    } else {
      o.y = (ty + 1) * T;
      if (o === player && (map[ty][x] === "?" || map[ty][x] === "S")) {
        const syr = map[ty][x] === "S"; map[ty][x] = "u";
        items.push({ x: x * T + 4, y: ty * T - 10, w: 8, h: 8, got: false, kind: syr ? "syringe" : "brain" });
        beep(syr ? 700 : 520, .08, "square"); burst(x * T + 8, ty * T, syr ? "#ff5a3a" : "#f2c94c", syr ? 10 : 5);
      }
    }
    o.vy = 0; return;
  }
}
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const tileAt = (px, py) => map[Math.floor(py / T)]?.[Math.floor(px / T)];
const touching = (o, ch, pad = 3) => [[o.x + pad, o.y + pad], [o.x + o.w - pad, o.y + pad], [o.x + pad, o.y + o.h - pad], [o.x + o.w - pad, o.y + o.h - pad]].some(([x, y]) => tileAt(x, y) === ch);

// ---------- Audio ----------
let ac; const beep = (f, d, type = "square", f2, delay = 0) => {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), v = ac.createGain(), t0 = ac.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    v.gain.setValueAtTime(0.06, t0); v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(v).connect(ac.destination); o.start(t0); o.stop(t0 + d);
  } catch {}
};
// ---------- Música ----------
// Chiptune generada en el momento: cada canción sale de una escala y una semilla fija, así suena siempre igual.
let musicOn = true; try { musicOn = localStorage.getItem("zombilandia-musica") !== "0"; } catch {}
function audioInit() { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch {} }
const SONG = (root, scale, bpm, lead, seed, boss) => ({ root, scale, bpm, lead, seed, boss });
const SONGS = [
  SONG(45, [0, 3, 5, 7, 10], 112, "square", 11),        // cementerio
  SONG(43, [0, 2, 3, 7, 8], 128, "square", 23),         // ciudad en ruinas
  SONG(41, [0, 3, 5, 6, 7, 10], 98, "triangle", 37),    // pantano
  SONG(47, [0, 1, 5, 7, 8], 122, "square", 41),         // laboratorio
  SONG(40, [0, 1, 4, 5, 7, 8, 10], 136, "sawtooth", 53), // guarida
];
const BOSS_SONG = SONG(38, [0, 1, 3, 6, 7], 152, "sawtooth", 67, true), TITLE_SONG = SONG(45, [0, 3, 5, 7, 10], 92, "triangle", 79);
function compose(s) { // 4 compases de 16 pasos: un motivo que se repite sobre una progresión, más bajo y batería
  const n = s.scale.length, prog = [0, 0, 3 % n, 4 % n], motif = [];
  let d = 2;
  for (let i = 0; i < 16; i++) { d = Math.max(0, Math.min(n + 2, d + [-1, 0, 1, 2, -2][Math.floor(rnd(s.seed * 31 + i) * 5)])); motif.push(rnd(s.seed * 7 + i) < (s.boss ? .75 : .6) || i === 0 ? d : null); }
  const deg = (k) => s.scale[k % n] + 12 * Math.floor(k / n);
  const steps = [];
  for (let i = 0; i < 64; i++) {
    const bar = i >> 4, st = i % 16, m = motif[st], alt = bar === 3 && st >= 8;
    steps.push({
      bass: st % 4 === 0 || (s.boss && st % 2 === 0) ? s.root - 12 + deg(prog[bar]) : null,
      lead: m === null ? null : s.root + 12 + deg(m + prog[bar] + (alt ? 2 : 0)),
      drum: st % 8 === 0 ? "k" : st % 8 === 4 ? "s" : (s.boss || st % 2 === 0) ? "h" : null,
    });
  }
  return steps;
}
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
let mGain, noise, mSong = null, mStep = 0, mNext = 0;
function tone(f, t, d, type, vol, f2) {
  const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v).connect(mGain); o.start(t); o.stop(t + d);
}
function noiseHit(t, d, vol, hp) {
  const b = ac.createBufferSource(), v = ac.createGain(), f = ac.createBiquadFilter(); b.buffer = noise; f.type = "highpass"; f.frequency.value = hp;
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); b.connect(f).connect(v).connect(mGain); b.start(t); b.stop(t + d);
}
function musicTick() {
  if (!ac || ac.state !== "running") return;
  if (!mGain) {
    mGain = ac.createGain(); mGain.gain.value = 1; mGain.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * .3, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const want = !musicOn || mode === "over" ? null : mode === "title" ? TITLE_SONG : L.boss && arenaLocked && !bossDead ? BOSS_SONG : SONGS[levelIdx % SONGS.length];
  if (want !== mSong) { mSong = want; mStep = 0; mNext = ac.currentTime + .08; if (want) want.c ||= compose(want); }
  if (!want) return;
  const dt = 60 / want.bpm / 4;
  if (mNext < ac.currentTime - .3) mNext = ac.currentTime + .05; // volvió de una pestaña oculta
  while (mNext < ac.currentTime + .15) {
    const s = want.c[mStep % 64], t = mNext;
    if (s.bass !== null) tone(hz(s.bass), t, dt * 1.8, "triangle", .07);
    if (s.lead !== null) tone(hz(s.lead), t, dt * .9, want.lead, want.lead === "sawtooth" ? .018 : .026);
    if (s.drum === "k") tone(150, t, .12, "sine", .12, 40); else if (s.drum === "s") noiseHit(t, .1, .05, 1200); else if (s.drum === "h") noiseHit(t, .03, .02, 6000);
    mStep++; mNext += dt;
  }
}
function toggleMusic() {
  musicOn = !musicOn; try { localStorage.setItem("zombilandia-musica", musicOn ? "1" : "0"); } catch {}
  const b = document.getElementById("mus"); if (b) b.textContent = musicOn ? "♪" : "✕"; audioInit();
}
const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, .18, "triangle", 0, i * .12));

// ---------- Lógica ----------
const say = (t) => { msg = t; msgT = 120; };
function burst(x, y, col, n = 8, sp = 3) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * sp, vy: -Math.random() * sp - .5, life: 30 + Math.random() * 20, col }); }
// Jeringa: modo bestia. Más grande y musculoso, corre más rápido y el rayo pega más fuerte.
// Una segunda jeringa da el modo bestia x2 (el doble de grande). Cada golpe te baja un nivel de poder en vez de sacarte una vida;
// perder una vida te deja normal. Se mantiene entre niveles.
const TIERS = [{ w: 10, h: 14, sc: 1 }, { w: 14, h: 21, sc: 1.5 }, { w: 18, h: 28, sc: 2 }];
const TIER = { acc: [1, 1.3, 1.5], max: [1.9, 2.8, 3.4], beam: [14, 18, 22], cd: [40, 16, 12], eye: [4, 6, 7], reach: [160, 280, 380], th: [3, 7, 11], dmg: [1, 3, 5] };
function setTier(n) {
  const p = player, a = TIERS[p.tier], b = TIERS[n];
  Object.assign(p, { x: p.x + (a.w - b.w) / 2, y: p.y + a.h - b.h, w: b.w, h: b.h, tier: n, big: n > 0 });
}
function fits(n) {
  const p = player, b = TIERS[n], nx = p.x + (p.w - b.w) / 2, ny = p.y + p.h - b.h;
  for (let ty = Math.floor(ny / T); ty <= Math.floor((ny + b.h - .01) / T); ty++) for (let tx = Math.floor(nx / T); tx <= Math.floor((nx + b.w - .01) / T); tx++) if (solid(tx, ty)) return false;
  return true;
}
// ---------- Vibración ----------
// Solo donde el navegador la permite (Android). Safari en iPhone no la soporta.
const canVibe = typeof navigator !== "undefined" && "vibrate" in navigator;
let vibeOn = true; try { vibeOn = localStorage.getItem("zombilandia-vibra") !== "0"; } catch {}
const vibe = (p) => { if (vibeOn && canVibe) try { navigator.vibrate(p); } catch {} };
function toggleVibe() { vibeOn = !vibeOn; try { localStorage.setItem("zombilandia-vibra", vibeOn ? "1" : "0"); } catch {} const b = document.getElementById("vib"); if (b) b.style.opacity = vibeOn ? 1 : .4; vibe(40); }
function powerUp() {
  vibe([30, 40, 60]);
  const p = player; p.want = Math.min(2, Math.max(p.tier, p.want) + 1); p.growing = true; p.power = 1;
  say(p.want === 2 ? "¡MODO BESTIA x2!" : "¡MODO BESTIA!"); shake = p.want === 2 ? 12 : 6;
  [196, 262, 330, 392, 523, 659].forEach((f, i) => beep(f / (p.want === 2 ? 2 : 1), .12, "square", 0, i * .06)); if (p.want === 2) beep(55, .8, "sawtooth", 110);
}
function tryGrow() { // crece de a un nivel, solo si hay lugar (por ejemplo, no debajo de un techo bajo)
  const p = player;
  if (p.tier >= p.want) { p.growing = false; return; }
  if (!fits(p.tier + 1)) return;
  setTier(p.tier + 1); burst(p.x + p.w / 2, p.y + p.h / 2, p.tier === 2 ? "#ff2a8a" : "#ff5a3a", 16 + p.tier * 8, 4 + p.tier);
  if (p.tier >= p.want) p.growing = false;
}
function shrink(to = 0) {
  const p = player; if (p.tier > to) setTier(to);
  Object.assign(p, { want: to, growing: false, power: to > 0 ? 1 : 0 }); beep(500, .3, "triangle", 150);
}
function gameOver() { mode = "over"; player.dead = 1; beep(200, .6, "sawtooth", 40); recordScore(); }
function hurt(src) {
  if (player.inv <= 0 && !player.dead) vibe(70);
  const p = player; if (p.inv > 0 || p.dead) return;
  damaged = true;
  const lvl = Math.max(p.tier, p.want);
  if (lvl > 0) { shrink(lvl - 1); shake = 8; p.inv = 100; p.vy = -4; p.vx = src ? (Math.sign(p.x - src.x) || -p.face) * 3 : -p.face * 2; say(lvl === 2 ? "¡Bajaste a modo bestia!" : "¡Perdiste el poder!"); return; }
  lives--; shake = 8; beep(180, .25, "sawtooth", 60);
  if (lives <= 0) return gameOver();
  p.inv = 100; p.vy = -4.5; p.vx = src ? (Math.sign(p.x + p.w / 2 - src.x - src.w / 2) || -p.face) * (src.type === "boss" ? 4 : 2.5) : -p.face * 2;
}
function loseLife(col = "#fff") {
  const p = player; vibe([60, 40, 140]); damaged = true; shrink(); lives--; shake = 10; beep(150, .4, "sawtooth", 50); burst(p.x + 5, p.y + 8, col, 14);
  if (lives <= 0) return gameOver();
  Object.assign(p, { x: p.safe.x, y: p.safe.y - 2, vx: 0, vy: 0, inv: 90 });
}
function damage(z, n) {
  z.hp -= n; z.flash = 12; burst(z.x + z.w / 2, z.y + z.h / 2, "#bff8ff", 5);
  if (z.hp > 0) { beep(320, .08, "square", 160); if (z.type === "boss") shake = 4; return; }
  z.dead = 1; score += ZT[z.type].pts; burst(z.x + z.w / 2, z.y + z.h / 2, "#7fbf5a", z.type === "boss" ? 50 : 10, z.type === "boss" ? 6 : 3); beep(220, .15, "square", 90);
  if (z.type === "boss") { bossDead = true; shake = 40; say("¡Derrotaste al Rey Zombi!"); fanfare(); for (const m of zombies) if (!m.dead) { m.dead = 1; burst(m.x + 6, m.y + 6, "#7fbf5a", 8); } }
}
function updateZombie(z, p) {
  if (z.dead) { z.dead++; return; }
  const dx = p.x - z.x, boss = z.type === "boss";
  if (boss ? !arenaLocked : Math.abs(dx) > 280) return; // solo se mueven cerca (el jefe, cuando se cierra la arena)
  z.t++; if (z.flash) z.flash--;
  if (z.type === "runner" && Math.abs(dx) < 150 && Math.abs(p.y - z.y) < 40) z.vx = (Math.sign(dx) || 1) * 1.3;
  if (z.type === "jumper" && z.ground && z.t % 90 === 0) { z.vy = -4.8; z.vx = Math.abs(dx) < 160 ? Math.sign(dx) * .8 : z.vx; }
  if (boss) {
    const sp = z.hp < 6 ? .95 : .55;
    if (Math.abs(dx) > 6) z.vx = Math.sign(dx) * sp;
    if (z.ground && z.t % 140 === 0) z.vy = -6.2;
    if (z.t % 230 === 0 && zombies.filter((m) => m.minion && !m.dead).length < 3) { const m = makeZombie(z.x + 8, z.y, "walker", z.t); m.minion = true; zombies.push(m); beep(120, .3, "sawtooth", 60); }
  }
  z.vy = Math.min(z.vy + 0.28, 7);
  const before = z.x; collideX(z);
  if (!boss && z.ground) {
    const ahead = Math.floor((z.vx > 0 ? z.x + z.w + 1 : z.x - 1) / T), under = Math.floor((z.y + z.h + 2) / T);
    if (z.x === before && z.vx || !solid(ahead, under)) { z.vx = -z.vx; z.x = before; }
  } else if (z.x === before && z.vx) z.vx = -z.vx;
  const vyb = z.vy; collideY(z); z.step += .08 * Math.abs(z.vx) / .4;
  if (boss && z.ground && !z.wasG && vyb > 3) { shake = 12; vibe(90); burst(z.x + 14, z.y + 36, "#8a6a60", 12); beep(70, .3, "sawtooth", 40); }
  z.wasG = z.ground;
  if (z.y > ROWS * T + 30 || touching(z, "~", 4)) { z.dead = 1; burst(z.x + 6, z.y + 6, TH.liquid?.[0] || "#7fbf5a", 6); return; }
  if (!p.dead && hit(p, z)) {
    if (p.vy > 0.5 && p.y + p.h - z.y < 10) { damage(z, 1 + p.tier); p.vy = keys.jump ? -5.8 : -3.8; p.jumps = 1; }
    else hurt(z);
  }
}
function update() {
  time++;
  if (banner) banner--;
  if (mode !== "play") return;
  levelTime++;
  const p = player, acc = (p.ground ? 0.35 : 0.22) * TIER.acc[p.tier], max = TIER.max[p.tier];
  if (p.growing) tryGrow();
  if (keys.left) { p.vx -= acc; p.face = -1; } else if (keys.right) { p.vx += acc; p.face = 1; } else p.vx *= p.ground ? 0.78 : 0.95;
  p.vx = Math.max(-max, Math.min(max, p.vx));
  p.coyote = p.ground ? 6 : p.coyote - 1;
  if (p.ground) p.jumps = 0; else if (p.coyote <= 0 && p.jumps === 0) p.jumps = 1; // si se cae de un borde, queda el salto de aire
  const wantJump = keys.jump || tap.jump; tap.jump = false;
  if (wantJump && !p.jumped) {
    if (p.coyote > 0) { p.vy = -5.1; p.jumped = true; p.coyote = 0; p.jumps = 1; beep(330, .12, "square", 660); }
    else if (p.jumps < 2) { p.vy = -4.9; p.jumped = true; p.jumps = 2; burst(p.x + 5, p.y + 14, "#9ad7ff", 8); beep(520, .12, "square", 980); } // doble salto
  }
  if (!keys.jump) { p.jumped = false; if (p.vy < -2 && !p.springT) p.vy += 0.35; } // salto variable
  if (p.springT) p.springT--;
  p.vy = Math.min(p.vy + 0.28, 6.5);
  const vyb = p.vy; collideX(p); collideY(p);
  if (p.ground && !p.wasG && vyb > 2.5) burst(p.x + 5, p.y + 14, "#9a8a7a", 6); // polvo al caer
  if (p.ground && Math.abs(p.vx) > 1.5 && time % 9 === 0) burst(p.x + 5, p.y + 14, "#6a5a4a", 1);
  p.wasG = p.ground;
  if (p.x < 0) p.x = 0;
  if (p.ground && time % 15 === 0 && !touching(p, "x", 0) && solid(Math.floor((p.x + 1) / T), Math.floor((p.y + p.h + 2) / T)) && solid(Math.floor((p.x + p.w - 1) / T), Math.floor((p.y + p.h + 2) / T))) p.safe = { x: p.x, y: p.y };
  // rayo láser de ojos: se dispara al apretar, con recarga
  if (p.cd > 0) p.cd--;
  if ((tap.fire || keys.fire && !p.firePrev) && p.cd <= 0) {
    const t = p.tier; p.beamTier = t; p.beamBig = t > 0; p.beam = TIER.beam[t]; p.cd = TIER.cd[t]; p.beamDir = p.face; p.shot++; shake = [3, 7, 11][t]; if (t) vibe(30 * t);
    beep([140, 90, 60][t], [.25, .4, .5][t], "sawtooth", [900, 600, 400][t]); if (t) beep(60 / t, .4, "square", 30);
  }
  p.firePrev = keys.fire; tap.fire = false;
  if (p.beam > 0) {
    p.beam--;
    const d = p.beamDir, x0 = d > 0 ? p.x + p.w : p.x, y = p.y + TIER.eye[p.tier], reach = TIER.reach[p.beamTier], th = TIER.th[p.beamTier]; let len = 0;
    while (len < reach && !solid(Math.floor((x0 + d * len) / T), Math.floor(y / T))) len += 2;
    p.ray = { x: d > 0 ? x0 : x0 - len, y: y - (th >> 1), w: len, h: th };
    if (time % 2 === 0) burst(x0 + d * len, y, ["#bff8ff", "#ffd84a", "#ff9ae0"][p.beamTier], 2 + p.beamTier * 2);
    const zone = { x: p.ray.x, y: p.ray.y, w: p.ray.w, h: p.ray.h + [0, 6, 16][p.beamTier] }; // de grande el rayo también alcanza a los zombis chicos
    for (const z of zombies) if (!z.dead && z.shot !== p.shot && hit(zone, z)) { z.shot = p.shot; damage(z, TIER.dmg[p.beamTier]); }
  } else p.ray = null;
  if (p.ground && Math.abs(p.vx) > .3) p.step += Math.abs(p.vx) * .12;
  if (p.inv > 0) p.inv--;
  if (touching(p, "x", 2)) { if (p.vy >= 0) p.vy = -4.5; hurt(null); }
  if (p.y > ROWS * T + 20) loseLife();
  else if (touching(p, "~", 4)) loseLife(TH.liquid[0]);
  if (mode !== "play") return;
  if (L.boss && !arenaLocked && p.x > 161 * T) { // se cierra la arena del jefe
    lockArena(); say("¡Apareció el Rey Zombi!"); bossCheck = { score, brains, level: levelIdx };
  }
  for (let i = 0; i < zombies.length; i++) updateZombie(zombies[i], p);
  if (mode !== "play") return;
  for (const it of items) if (!it.got && hit(p, it) && it.kind === "syringe") { it.got = true; powerUp(); }
  for (const it of items) if (!it.got && hit(p, it)) { it.got = true; brains++; gotBrains++; score += 10; beep(880, .08, "triangle", 1320); if (brains % 25 === 0) { lives++; say("¡Vida extra!"); } }
  if (p.x > goalX * T && (!L.boss || bossDead)) {
    score += lives * 100 + 500; fanfare(); finishLevel();
    mode = levelIdx === LEVELS.length - 1 ? "won" : "clear";
    if (mode === "won") recordScore();
  }
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += .15; q.life--; }
  parts = parts.filter((q) => q.life > 0);
  cam = Math.max(0, Math.min(COLS * T - W, p.x - W / 2 + 20));
  if (shake) shake--;
  if (msgT) msgT--;
}

// ---------- Dibujo ----------
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const stars = Array.from({ length: 80 }, (_, i) => [rnd(i) * 640, rnd(i + 99) * 130, rnd(i + 7)]);
function grads() {
  if (cache.W === W && cache.th === TH) return cache;
  const s = TH.sky, sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, s[0]); sky.addColorStop(.5, s[1]); sky.addColorStop(.85, s[2]); sky.addColorStop(1, s[3]);
  const moon = TH.moon && g.createRadialGradient(W - 70, 46, 6, W - 70, 46, 80);
  if (moon) { moon.addColorStop(0, hexA(TH.moon, .45)); moon.addColorStop(1, hexA(TH.moon, 0)); }
  const fog = g.createLinearGradient(0, 150, 0, 215); fog.addColorStop(0, hexA(TH.fog, 0)); fog.addColorStop(.6, hexA(TH.fog, .16)); fog.addColorStop(1, hexA(TH.fog, 0));
  const vig = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .75); vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,.5)");
  return (cache = { W, th: TH, sky, moon, fog, vig });
}
function layer(speed, period, fn) { const off = cam * speed, i0 = Math.floor(off / period) - 1; for (let i = i0; i <= i0 + Math.ceil(W / period) + 2; i++) fn(Math.round(i * period - off), i); }

const MID = {
  town() {
    layer(.35, 150, (x, i) => {
      const r = rnd(i), w = Math.round(34 + r * 30), h = Math.round(40 + rnd(i + 5) * 40), base = 205, col = "#160f2b";
      R(x, base - h, w, h, col);
      if (r > .6) { const cx = x + (w >> 1); R(cx - 3, base - h - 18, 6, 18, col); R(cx - 1, base - h - 26, 2, 8, col); R(cx - 3, base - h - 23, 6, 2, col); }
      else { R(x - 3, base - h, w + 6, 3, col); R(x + 4, base - h - 8, 4, 8, col); }
      for (let k = 0; k < 4; k++) {
        const wx = x + 5 + (k % 2) * (w - 16), wy = base - h + 8 + (k >> 1) * 16, on = rnd(i * 4 + k) > .45 && Math.sin(time * .15 + i * 3 + k) > -.92;
        R(wx, wy, 6, 7, on ? "#f0b84a" : "#241a3c"); if (on) { g.globalAlpha = .22; R(wx - 2, wy - 2, 10, 11, "#f0b84a"); g.globalAlpha = 1; R(wx + 2, wy, 1, 7, "#8a5a20"); }
      }
    });
  },
  city() {
    layer(.3, 70, (x, i) => {
      const r = rnd(i), w = 40 + Math.round(r * 24), h = 60 + Math.round(rnd(i + 5) * 100), b = 212, col = "#24121c";
      R(x, b - h, w, h, col);
      if (r > .55) { R(x + 4, b - h - 6, w - 22, 6, col); R(x + w - 14, b - h, 14, 8, TH.sky[1]); } else R(x + w - 10, b - h - 16, 2, 16, col);
      for (let wy = b - h + 10; wy < b - 8; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7) {
        const q = rnd(i * 31 + wx * .7 + wy); if (q > .93) R(wx, wy, 3, 4, "#ffa050"); else if (q > .6) R(wx, wy, 3, 4, "#361c28");
      }
      if (rnd(i + 9) > .6) for (let k = 0; k < 6; k++) {
        const d = (time * .4 + k * 14) % 84; g.globalAlpha = .2 * (1 - d / 84); g.fillStyle = "#3a2228";
        g.beginPath(); g.arc(x + w / 2 + Math.sin(time * .02 + k) * 5, b - h - 8 - d, 5 + d / 9, 0, 7); g.fill(); g.globalAlpha = 1;
      }
    });
  },
  swamp() {
    layer(.3, 110, (x, i) => {
      const col = "#08180f", tx = x + Math.round(rnd(i) * 50), th = 50 + Math.round(rnd(i + 2) * 40), b = 208;
      R(tx, b - th, 6, th, col); R(tx - 4, b - 5, 14, 5, col);
      g.fillStyle = col; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(tx + 3 + (k - 2) * 9, b - th + (k % 2) * 6, 12, 0, 7); g.fill(); }
      for (let k = 0; k < 7; k++) R(tx - 15 + k * 6 + Math.round(Math.sin(time * .03 + k + i) * 1.5), b - th + 6, 1, 18 + ((k * 7 + i) % 14), col);
    });
  },
  castle() {
    const vx = Math.round(W * .32 - cam * .05);
    g.fillStyle = "#1e0606"; g.beginPath(); g.moveTo(vx - 130, 205); g.lineTo(vx - 18, 92); g.lineTo(vx + 18, 92); g.lineTo(vx + 130, 205); g.fill();
    g.globalAlpha = .35 + Math.sin(time * .05) * .12; R(vx - 22, 84, 44, 10, "#ff6a1a"); g.globalAlpha = 1;
    R(vx - 16, 92, 32, 2, "#ffcc33"); R(vx - 8, 94, 2, 34, "#c0300a"); R(vx + 7, 94, 2, 52, "#c0300a"); R(vx + 1, 94, 1, 20, "#ff6a1a");
    for (let k = 0; k < 6; k++) { const d = (time * .3 + k * 16) % 96; g.globalAlpha = .25 * (1 - d / 96); g.fillStyle = "#2a0a0a"; g.beginPath(); g.arc(vx + Math.sin(time * .02 + k) * 8 + d * .4, 84 - d, 8 + d / 6, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    layer(.35, 190, (x, i) => {
      const col = "#140405", h = 70 + Math.round(rnd(i) * 40), b = 210;
      R(x, b - h, 26, h, col); for (let k = 0; k < 4; k++) R(x + k * 7, b - h - 5, 5, 5, col);
      R(x + 26, b - 50, 64, 50, col); for (let k = 0; k < 8; k++) R(x + 28 + k * 8, b - 55, 5, 5, col);
      const on = Math.sin(time * .1 + i) > -.8; R(x + 10, b - h + 14, 6, 9, on ? "#ff5a1a" : "#5a1a0a"); R(x + 50, b - 36, 6, 9, on ? "#ff7a2a" : "#5a1a0a");
      const fl = Math.round(Math.sin(time * .1 + i)); R(x + 12, b - h - 24, 1, 19, col); R(x + 13, b - h - 23 + fl, 9, 6, "#6a0a18"); R(x + 15, b - h - 21 + fl, 3, 2, "#c9a227");
    });
  },
};
const NEAR = {
  graves() {
    layer(.6, 120, (x, i) => {
      const col = "#0f0a1f";
      if (rnd(i + 3) > .45) {
        const tx = x + Math.round(rnd(i) * 60), th = Math.round(60 + rnd(i + 1) * 30), b = 212 - th;
        R(tx, b, 4, th, col); R(tx - 12, b + 12, 14, 2, col); R(tx - 14, b + 5, 2, 9, col); R(tx + 4, b + 20, 12, 2, col); R(tx + 14, b + 12, 2, 10, col); R(tx - 6, b + 30, 7, 2, col); R(tx + 1, b - 6, 2, 6, col);
      }
      for (let k = 0; k < 120; k += 8) { R(x + k, 196, 2, 16, col); R(x + k, 194, 2, 2, col); }
      R(x, 199, 120, 2, col); R(x, 206, 120, 1, col);
    });
  },
  rubble() {
    layer(.6, 170, (x, i) => {
      const col = "#120810";
      R(x + 20, 150, 2, 62, col); R(x + 20, 150, 12, 2, col); R(x + 30, 151, 6, 3, col);
      if (rnd(i) > .3 && Math.sin(time * .3 + i * 5) > -.7) { g.globalAlpha = .1; g.fillStyle = "#ffd080"; g.beginPath(); g.moveTo(x + 30, 154); g.lineTo(x + 36, 154); g.lineTo(x + 52, 212); g.lineTo(x + 14, 212); g.fill(); g.globalAlpha = 1; R(x + 31, 154, 4, 1, "#ffd080"); }
      if (rnd(i + 4) > .4) { R(x + 70, 198, 42, 12, col); R(x + 78, 189, 24, 9, col); R(x + 74, 208, 9, 6, col); R(x + 99, 208, 9, 6, col); R(x + 82, 191, 7, 5, "#2a1a20"); }
      R(x + 124, 205, 32, 9, col); R(x + 130, 199, 14, 6, col);
    });
  },
  reeds() {
    layer(.65, 50, (x, i) => {
      const col = "#03100a";
      for (let k = 0; k < 4; k++) { const h = 14 + Math.round(rnd(i * 4 + k) * 18), rx = x + k * 11 + Math.round(Math.sin(time * .04 + k + i)); R(rx, 214 - h, 1, h, col); if (k % 2) R(rx - 1, 214 - h, 3, 6, col); }
    });
  },
  fence() {
    layer(.6, 100, (x, i) => {
      const col = "#0e0202";
      for (let k = 0; k < 100; k += 10) { R(x + k, 194, 2, 20, col); R(x + k - 1, 192, 4, 2, col); R(x + k, 188, 2, 4, col); }
      R(x, 200, 100, 2, col);
      if (rnd(i) > .5) { R(x + 40, 148, 3, 52, col); R(x + 28, 160, 14, 2, col); R(x + 42, 170, 14, 2, col); R(x + 30, 160, 1, 10, col); R(x + 30, 171, 3, 4, col); }
    });
  },
};
const AMB = {
  ash() { for (let i = 0; i < 40; i++) { const y = (rnd(i + 3) * H + time * (.3 + rnd(i) * .4)) % H, x = ((rnd(i) * W + Math.sin(time * .02 + i) * 8 - cam * .3) % W + W) % W; g.globalAlpha = .35; R(x, y, 1, 1, "#d8c0b0"); } g.globalAlpha = 1; },
  fireflies() {
    for (let i = 0; i < 26; i++) {
      const x = ((rnd(i) * W * 2 - cam * .7 + Math.sin(time * .01 + i) * 20) % W + W) % W, y = 110 + rnd(i + 1) * 95 + Math.sin(time * .03 + i * 2) * 6, a = (Math.sin(time * .05 + i * 3) + 1) / 2;
      g.globalAlpha = a * .25; R(x - 2, y - 2, 5, 5, "#d8ff6a"); g.globalAlpha = a; R(x, y, 1, 1, "#f0ffb0");
    }
    g.globalAlpha = 1;
  },
  embers() { for (let i = 0; i < 34; i++) { const y = H - (rnd(i) * H + time * (.4 + rnd(i + 2) * .6)) % H, x = ((rnd(i + 5) * W + Math.sin(time * .03 + i) * 10 - cam * .4) % W + W) % W; g.globalAlpha = .3 + (y / H) * .6; R(x, y, 1 + (i % 2), 1 + (i % 2), i % 3 ? "#ff8a2a" : "#ffd060"); } g.globalAlpha = 1; },
  drips() { for (let i = 0; i < 16; i++) { const sx = (i * 211 + 37) % (COLS * T) - Math.floor(cam); if (sx < -4 || sx > W) continue; R(sx - 1, 32, 3, 2, "#8ab02a"); R(sx, 34 + (time * 1.4 + i * 53) % 176, 1, 3, "#c6ff3a"); } },
};
function drawLab() {
  layer(.5, 64, (x, i) => {
    R(x, 32, 62, 180, "#141c30"); R(x, 32, 62, 1, "#1e2a44"); for (const [a, b] of [[2, 40], [59, 40], [2, 204], [59, 204]]) R(x + a, b, 1, 1, "#2a3654");
    if (rnd(i) > .7) { const on = Math.floor(time / 20 + i) % 2; R(x + 28, 44, 5, 3, on ? "#ff3030" : "#4a1010"); if (on) { g.globalAlpha = .2; R(x + 24, 40, 13, 11, "#ff3030"); g.globalAlpha = 1; } }
  });
  layer(.5, 96, (x) => { R(x, 64, 96, 5, "#2a3448"); R(x, 64, 96, 1, "#3e4a62"); R(x + 40, 62, 6, 9, "#3e4a62"); R(x, 176, 96, 4, "#26303f"); R(x + 70, 174, 5, 8, "#3a4456"); });
  layer(.5, 256, (x, i) => {
    const tx = x + 90, by = Math.round(Math.sin(time * .03 + i) * 3);
    R(tx - 2, 108, 34, 6, "#3a4456"); R(tx - 2, 182, 34, 8, "#3a4456");
    g.globalAlpha = .5; R(tx, 114, 30, 68, "#1a6a5a"); g.globalAlpha = .6;
    R(tx + 10, 128 + by, 10, 9, "#0a2a22"); R(tx + 8, 137 + by, 14, 18, "#0a2a22"); R(tx + 10, 155 + by, 3, 12, "#0a2a22"); R(tx + 17, 155 + by, 3, 12, "#0a2a22"); R(tx + 5, 138 + by, 3, 12, "#0a2a22"); R(tx + 22, 138 + by, 3, 12, "#0a2a22");
    g.globalAlpha = 1; R(tx + 12, 131 + by, 2, 1, "#ff4040"); R(tx + 16, 131 + by, 2, 1, "#ff4040");
    for (let k = 0; k < 4; k++) R(tx + 5 + k * 6, 180 - ((time * .5 + k * 17) % 64), 2, 2, "#7affd0");
    g.globalAlpha = .12; R(tx + 2, 116, 2, 62, "#fff"); g.globalAlpha = 1;
  });
  g.globalAlpha = .06; g.fillStyle = "#bfe8ff";
  layer(1, 192, (x) => { g.beginPath(); g.moveTo(x + 40, 32); g.lineTo(x + 52, 32); g.lineTo(x + 84, 208); g.lineTo(x + 8, 208); g.fill(); });
  g.globalAlpha = 1;
}
function drawBg() {
  const c = grads();
  g.fillStyle = c.sky; g.fillRect(0, 0, W, H);
  if (TH.indoor) drawLab();
  else {
    if (TH.stars) for (const [x, y, s] of stars) { const sx = ((x - cam * .04) % 640 + 640) % 640; if (sx <= W) R(sx, y, 1, 1, Math.sin(time * .04 + x) > .7 ? "#fff" : s > .6 ? "#b9b0e0" : "#6d6496"); }
    g.fillStyle = c.moon; g.fillRect(0, 0, W, 140);
    g.fillStyle = TH.moon; g.beginPath(); g.arc(W - 70, 46, 16, 0, 7); g.fill();
    R(W - 78, 40, 4, 3, "#00000022"); R(W - 66, 50, 5, 4, "#00000022"); R(W - 72, 54, 3, 2, "#00000022");
    g.globalAlpha = .55; layer(.08, 230, (x, i) => { const y = 28 + rnd(i) * 50; R(x, y, 64, 4, TH.cloud); R(x + 12, y - 3, 34, 3, TH.cloud); R(x + 20, y + 4, 30, 2, TH.cloud); }); g.globalAlpha = 1;
    for (let x = 0; x < W; x += 2) { const wx = x + cam * .15, h = 160 + Math.sin(wx * .018) * 10 + Math.sin(wx * .0067 + 1) * 16; R(x, h, 2, H - h, TH.hill); }
    MID[TH.mid](); NEAR[TH.near]();
  }
  g.fillStyle = c.fog; g.fillRect(0, 150, W, 65);
  g.globalAlpha = .07; layer(.9, 200, (x, i) => R(x + ((time * .2) % 40), 185 + rnd(i) * 15, 120, 6, TH.fog)); g.globalAlpha = 1;
  if (TH.ambient) AMB[TH.ambient]();
}
function drawDeco(x, y, k) {
  if (k === "tomb") { R(x + 3, y + 4, 10, 12, "#5d5870"); R(x + 4, y + 2, 8, 2, "#5d5870"); R(x + 5, y + 1, 6, 1, "#5d5870"); R(x + 3, y + 4, 1, 12, "#7a7590"); R(x + 6, y + 6, 4, 1, "#3e3a50"); R(x + 6, y + 8, 4, 1, "#3e3a50"); R(x + 4, y + 13, 3, 2, "#4f7a3a"); }
  else if (k === "cross") { R(x + 7, y + 3, 2, 13, "#4a3a2a"); R(x + 4, y + 6, 8, 2, "#4a3a2a"); R(x + 7, y + 3, 1, 13, "#6a5440"); }
  else if (k === "bones") { R(x + 3, y + 14, 8, 2, "#d8d0c0"); R(x + 2, y + 13, 2, 1, "#d8d0c0"); R(x + 10, y + 13, 2, 1, "#d8d0c0"); R(x + 9, y + 10, 5, 4, "#e8e0d0"); R(x + 10, y + 11, 1, 1, "#222"); R(x + 12, y + 11, 1, 1, "#222"); }
  else if (k === "cone") { R(x + 3, y + 15, 10, 1, "#c05a10"); R(x + 7, y + 6, 2, 3, "#ff7a1a"); R(x + 6, y + 9, 4, 3, "#ff7a1a"); R(x + 5, y + 12, 6, 3, "#ff7a1a"); R(x + 6, y + 10, 4, 1, "#f0f0f0"); }
  else if (k === "barrel") { const c = TH === THEMES.lab ? "#d8b020" : "#2a6a8a"; R(x + 3, y + 5, 10, 11, c); R(x + 3, y + 5, 2, 11, "#ffffff22"); R(x + 3, y + 7, 10, 1, "#00000055"); R(x + 3, y + 13, 10, 1, "#00000055"); if (c === "#d8b020") { R(x + 7, y + 9, 2, 2, "#1a1a1a"); R(x + 5, y + 10, 1, 1, "#1a1a1a"); R(x + 10, y + 10, 1, 1, "#1a1a1a"); } }
  else if (k === "rubble") { R(x + 2, y + 12, 12, 4, "#4a4a52"); R(x + 4, y + 10, 6, 2, "#5e5e68"); R(x + 9, y + 11, 3, 1, "#7a7a84"); R(x + 11, y + 9, 1, 3, "#8a5030"); }
  else if (k === "sign") { R(x + 7, y + 6, 1, 10, "#5a5a62"); R(x + 3, y + 1, 9, 6, "#d0a020"); R(x + 5, y + 3, 5, 1, "#2a2a2a"); R(x + 7, y + 4, 1, 1, "#2a2a2a"); }
  else if (k === "mushroom") { g.globalAlpha = .18 + Math.sin(time * .05 + x) * .08; R(x + 1, y + 5, 12, 9, "#c07aff"); g.globalAlpha = 1; R(x + 6, y + 11, 2, 5, "#d8d0b0"); R(x + 3, y + 8, 8, 3, "#9a3ac8"); R(x + 4, y + 7, 6, 1, "#9a3ac8"); R(x + 5, y + 9, 1, 1, "#e8c0ff"); R(x + 8, y + 8, 1, 1, "#e8c0ff"); }
  else if (k === "reeds") { R(x + 4, y + 4, 1, 12, "#4a7a2a"); R(x + 3, y + 4, 3, 4, "#6a4a2a"); R(x + 9, y + 7, 1, 9, "#3f6a2a"); R(x + 8, y + 7, 3, 3, "#6a4a2a"); R(x + 12, y + 10, 1, 6, "#4a7a2a"); }
  else if (k === "crate") { R(x + 2, y + 6, 12, 10, "#7a5a3a"); R(x + 2, y + 6, 12, 1, "#9a7a4a"); for (let i = 0; i < 9; i++) { R(x + 3 + i, y + 7 + i, 1, 1, "#4a3420"); R(x + 12 - i, y + 7 + i, 1, 1, "#4a3420"); } }
  else if (k === "tank") { R(x + 4, y + 5, 8, 11, "#3a6a5a"); R(x + 5, y + 3, 6, 2, "#5a6676"); g.globalAlpha = .6 + Math.sin(time * .1 + x) * .3; R(x + 6, y + 8, 4, 5, "#c6ff3a"); g.globalAlpha = 1; }
  else if (k === "skull") { R(x + 5, y + 10, 6, 4, "#e8e0d0"); R(x + 6, y + 14, 4, 2, "#e8e0d0"); R(x + 6, y + 11, 1, 2, "#222"); R(x + 9, y + 11, 1, 2, "#222"); R(x + 7, y + 15, 1, 1, "#222"); }
  else if (k === "torch") {
    const fl = Math.sin(time * .4 + x) > 0; g.globalAlpha = .16; R(x + 1, y - 4, 14, 14, "#ff8a1a"); g.globalAlpha = 1;
    R(x + 7, y + 6, 2, 10, "#4a3020"); R(x + 6, y + 5, 4, 2, "#6a4a30"); R(x + 6, y + 1 + (fl ? 1 : 0), 4, 4, "#ff8a1a"); R(x + 7, y + (fl ? 0 : 1), 2, 3, "#ffe060");
  }
  else { R(x + 4, y + 12, 1, 4, "#3f6a2a"); R(x + 6, y + 10, 1, 6, "#4f8a35"); R(x + 8, y + 13, 1, 3, "#3f6a2a"); R(x + 10, y + 11, 1, 5, "#4f8a35"); }
}
function drawGround(px, py, x, y, r) {
  const [g1, g2, g3] = TH.grass, [d1, d2, d3, d4] = TH.dirt, top = map[y - 1]?.[x] !== "#", bottom = map[y + 1]?.[x] !== "#" && y < ROWS - 1;
  const th = L.theme;
  if (th === "city") {
    if (top) { R(px, py, T, T, d2); R(px, py, T, 4, g2); R(px, py, T, 1, g1); R(px, py + 4, T, 1, g3); R(px + (r * 12 | 0), py + 7, 3, 1, d3); }
    else { R(px, py, T, T, d1); R(px, py + 15, T, 1, d3); R(px + 3, py + 4, 4, 7, r > .82 ? "#ffb060" : "#1c1820"); R(px + 9, py + 4, 4, 7, r > .93 ? "#ffb060" : r < .12 ? d3 : "#1c1820"); }
  } else if (th === "lab") {
    R(px, py, T, T, d2); R(px + 1, py + 1, T - 2, T - 2, d1); for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(px + a, py + b, 1, 1, d4);
    if (top && y > 1) for (let k = 0; k < T; k += 4) { R(px + k, py, 2, 3, "#f2c94c"); R(px + k + 2, py, 2, 3, "#1a1a1a"); }
    if (bottom) for (let k = 0; k < T; k += 4) { R(px + k, py + 13, 2, 3, "#f2c94c"); R(px + k + 2, py + 13, 2, 3, "#1a1a1a"); }
  } else if (th === "lair") {
    const off = (y % 2) * 8; R(px, py, T, T, d1); R(px, py + 7, T, 1, d3); R(px, py + 15, T, 1, d3); R(px + ((off + 4) % 16), py, 1, 7, d3); R(px + ((off + 12) % 16), py + 8, 1, 7, d3); R(px + 1, py + 1, 6, 1, d4);
    if (top) { R(px, py, T, 2, g1); R(px, py + 2, T, 1, g3); if (r > .7) { R(px + 5, py + 3, 1, 3, "#ff5a10"); R(px + 6, py + 5, 1, 2, "#ff5a10"); } }
  } else {
    R(px, py, T, T, top ? d1 : d2);
    R(px + (r * 10 | 0), py + 6, 3, 2, d3); R(px + 2 + (r * 7 | 0), py + 11, 2, 2, d4); R(px + 11, py + 3 + (r * 8 | 0), 2, 1, d3);
    if (r > .7) { R(px + 4, py + 9, 4, 3, "#6b5a4f"); R(px + 4, py + 9, 4, 1, "#8a7a6a"); }
    if (top) {
      R(px, py, T, 3, g2); R(px, py, T, 1, g1); R(px, py + 3, T, 1, g3); R(px + (r * 12 | 0), py + 4, 2, th === "swamp" ? 3 : 1, g3);
      for (let k = 0; k < 4; k++) R(px + ((r * 13 + k * 4) % 15 | 0), py - 2 + (k % 2), 1, 2 - (k % 2), g1);
    }
  }
}
function drawPlat(px, py, x, y, r) {
  const [p0, p1, p2] = TH.plat, th = L.theme;
  if (th === "city") { R(px, py, T, 3, p1); R(px, py + 13, T, 3, p0); for (let k = 0; k < 10; k++) { R(px + k + 2, py + 3 + k, 2, 1, p0); R(px + T - 4 - k, py + 3 + k, 2, 1, p0); } R(px, py + 2, T, 1, p2); }
  else if (th === "swamp") {
    R(px, py + 2, T, 11, p0); R(px, py + 2, T, 2, p1); R(px, py + 11, T, 2, p2); R(px + 3, py + 6, 5, 1, p2); R(px + 9, py + 8, 4, 1, p2); R(px + 2, py + 1, 4, 1, "#6aa83a");
    if (map[y][x - 1] !== "=") { R(px, py + 2, 3, 11, "#b08a5a"); R(px + 1, py + 6, 1, 3, p2); }
    if (map[y][x + 1] !== "=") { R(px + 13, py + 2, 3, 11, "#b08a5a"); R(px + 14, py + 6, 1, 3, p2); }
  } else if (th === "lab") { R(px, py, T, 5, p1); R(px, py + 5, T, 2, p2); for (let k = 0; k < 4; k++) R(px + 1 + k * 4, py + 1, 2, 3, p2); R(px + 6, py + 7, 4, 3, p2); }
  else if (th === "lair") { R(px, py, T, T, p0); R(px, py, T, 2, p1); R(px, py + 14, T, 2, p2); R(px + 7, py + 2, 1, 12, p2); if (r > .6) R(px + 3, py + 6, 1, 4, "#ff5a10"); }
  else { R(px, py, T, T, p0); R(px, py, T, 2, p1); R(px, py + T - 2, T, 2, p2); R(px, py + 7, T, 1, p2); R(px + 7, py + 2, 1, 5, p2); R(px + 3, py + 8, 1, 6, p2); R(px + 12, py + 8, 1, 6, p2); R(px + 1, py + 3, 5, 1, "#93503b"); R(px + 9, py + 3, 5, 1, "#93503b"); if (r > .6) R(px + 5, py + 12, 4, 2, "#4f7a3a"); }
}
function drawTiles() {
  const ox = Math.floor(cam), x0 = Math.max(0, Math.floor(cam / T)), x1 = Math.min(COLS - 1, x0 + Math.ceil(W / T) + 1);
  for (const [x, y, k] of deco) if (x >= x0 - 1 && x <= x1) drawDeco(x * T - ox, y * T, k);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const c = map[y][x]; if (c === " " || c === "c") continue;
    const px = x * T - ox, py = y * T, r = rnd(x * 7 + y);
    if (c === "#") drawGround(px, py, x, y, r);
    else if (c === "=") drawPlat(px, py, x, y, r);
    else if (c === "?" || c === "S") {
      const shine = (Math.floor(time / 8) + x) % 7 === 0;
      R(px, py, T, T, "#9a5a10"); R(px + 1, py + 1, T - 2, T - 2, shine ? "#ffe07a" : "#f2b632"); R(px + 1, py + 1, T - 2, 1, "#ffe9a8"); R(px + 1, py + T - 2, T - 2, 1, "#c27a10");
      for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(px + a, py + b, 1, 1, "#9a5a10");
      R(px + 6, py + 3, 5, 2, "#6a3a00"); R(px + 9, py + 5, 2, 2, "#6a3a00"); R(px + 7, py + 7, 2, 2, "#6a3a00"); R(px + 7, py + 11, 2, 2, "#6a3a00");
    } else if (c === "u") { R(px, py, T, T, "#4a3c30"); R(px + 1, py + 1, T - 2, T - 2, "#6b5a45"); R(px + 1, py + 1, T - 2, 1, "#8a7860"); }
    else if (c === "~") {
      const [l1, l2] = TH.liquid;
      if (map[y - 1]?.[x] !== "~") {
        g.globalAlpha = .22 + Math.sin(time * .08 + x) * .06; R(px, py - 6, T, 9, l1); g.globalAlpha = 1;
        R(px, py + 4, T, 12, l2); for (let k = 0; k < T; k += 2) R(px + k, py + 3 + Math.round(Math.sin(time * .1 + (x * T + k) * .3)), 2, 2, l1);
        const bt = (time + x * 13) % 60; if (bt < 24) R(px + 4 + (x % 3) * 3, py + 13 - bt * .4, 2, 2, l1);
      } else { R(px, py, T, T, l2); R(px + (r * 12 | 0), py + 6, 2, 2, l1); }
    } else if (c === "x") {
      R(px, py + 13, T, 3, "#3a3a44");
      for (let k = 0; k < 4; k++) { R(px + k * 4 + 1, py + 9, 2, 4, "#b8c0cc"); R(px + k * 4 + 1, py + 7, 1, 2, L.theme === "lair" ? "#ff6a4a" : "#e8eef5"); R(px + k * 4 + 2, py + 9, 1, 4, "#7a8290"); }
    } else if (c === "^") {
      const cmp = player.springT > 0 && Math.abs(player.x + 5 - (x * T + 8)) < 14 ? 4 : 0;
      R(px + 1, py + 13, 14, 3, "#5a5a66"); for (let k = 0; k < 3; k++) R(px + 3 + (k % 2) * 2, py + 7 + cmp + k * (cmp ? 2 : 2), 8, 1, "#c0c8d0");
      R(px + 1, py + 4 + cmp, 14, 3, "#e0402a"); R(px + 1, py + 4 + cmp, 14, 1, "#ff8a6a");
    }
  }
  if (!L.boss || bossDead) { // bandera
    const base = Math.max(surface(goalX), 3), fx = goalX * T - ox, top = (base - 8) * T;
    R(fx, top, 2, 8 * T, "#cfc8e8"); R(fx - 1, top - 3, 4, 4, "#f2c94c"); R(fx - 3, base * T - 3, 8, 3, "#6b5a4f");
    for (let k = 0; k < 18; k++) R(fx + 2 + k, top + 3 + Math.round(Math.sin(time * .15 - k * .5) * 1.5), 1, 12, k < 2 ? "#a02a24" : "#d6453d");
    R(fx + 8, top + 6 + Math.round(Math.sin(time * .15 - 3) * 1.5), 5, 5, "#f3efe6");
  }
}
function drawItems() {
  for (const it of items) if (!it.got) {
    const x = it.x - Math.floor(cam), y = it.y + Math.round(Math.sin((time + it.x) * .1) * 1.5);
    if (x < -12 || x > W + 4) continue;
    if (it.kind === "syringe") {
      g.globalAlpha = .25 + Math.sin(time * .2) * .12; R(x - 3, y - 3, 15, 13, "#ff5a3a"); g.globalAlpha = 1;
      R(x - 1, y + 2, 1, 4, "#c0c8d0"); R(x, y + 3, 2, 2, "#8a9098"); R(x + 2, y + 1, 6, 6, "#e8f0f8"); R(x + 3, y + 2, 4, 4, "#ff3a2a"); R(x + 3, y + 2, 1, 1, "#ff9a8a");
      R(x + 8, y + 3, 1, 2, "#8a9098"); R(x + 9, y + 4, 4, 1, "#d8e0e8"); continue;
    }
    g.globalAlpha = .12 + Math.sin(time * .1 + it.x) * .06; R(x - 1, y - 2, 10, 12, "#ff8fb8"); R(x - 2, y - 1, 12, 10, "#ff8fb8"); g.globalAlpha = 1;
    R(x + 1, y, 6, 1, "#f7a6c0"); R(x, y + 1, 8, 5, "#e57fa0"); R(x + 1, y + 6, 6, 1, "#c9617f"); R(x + 3, y + 7, 2, 1, "#c9617f");
    R(x + 4, y + 1, 1, 5, "#b04a6a"); R(x + 2, y + 2, 1, 2, "#b04a6a"); R(x + 6, y + 3, 1, 2, "#b04a6a"); R(x + 1, y + 1, 2, 1, "#ffd0de");
  }
}
const ZSKIN = [["#7fbf5a", "#5a8f3d"], ["#8fa89a", "#647a6e"], ["#a8b86b", "#7a8a45"]];
const ZSHIRT = ["#6a4f8a", "#7a3a3a", "#3a5a7a"];
function drawSmall(z, i, x, y, f, s) {
  let sk, skd, sh;
  if (z.type === "runner") { sk = "#c8a878"; skd = "#9a7650"; sh = "#a02a2a"; }
  else if (z.type === "jumper") { sk = "#a88ac8"; skd = "#76589a"; sh = "#2a4a3a"; }
  else { [sk, skd] = ZSKIN[i % 3]; sh = ZSHIRT[(i >> 1) % 3]; }
  const crouch = z.type === "jumper" && z.ground && z.t % 90 > 70 ? 2 : 0, lean = z.type === "runner" ? f : 0;
  y += crouch;
  R(x + 2, y + 11, 3, Math.max(1, (s > 0 ? 2 : 3) - crouch), "#2f2840"); R(x + 7, y + 11, 3, Math.max(1, (s > 0 ? 3 : 2) - crouch), "#2f2840");
  R(x + 2, y + 7, 8, 5, sh); R(x + 4, y + 9, 2, 2, sk); R(x + 2, y + 11, 2, 1, skd);
  if (z.type === "runner") { R(x + 5, y + 8, 2, 3, "#f0e0d0"); R(f > 0 ? x : x + 9, y + 8 + (s > 0 ? 0 : 1), 3, 2, sk); }
  else { const ay = y + 8 + (s > 0 ? 0 : 1); if (f > 0) { R(x + 9, ay, 6, 2, sk); R(x + 14, ay - 1, 1, 1, sk); } else { R(x - 3, ay, 6, 2, sk); R(x - 3, ay - 1, 1, 1, sk); } }
  const hx = x + lean;
  R(hx + 2, y, 8, 7, sk); R(hx + 2, y + 6, 8, 1, skd); R(hx + 3, y - 1, 3, 1, "#3a2a20"); R(hx + 7, y, 2, 1, "#3a2a20");
  const ex = f > 0 ? hx + 6 : hx + 3, eye = z.type === "runner" ? "#ff2020" : Math.sin(time * .1 + i) > 0 ? "#ff4040" : "#ffb020";
  R(ex, y + 2, 3, 2, "#1a1010"); R(ex + 1, y + 2, 1, 1, eye); R(f > 0 ? hx + 3 : hx + 7, y + 2, 2, 2, "#1a1010");
  R(hx + (f > 0 ? 4 : 3), y + 5, 5, 1, "#2a1a1a"); R(hx + (f > 0 ? 5 : 4), y + 5, 1, 1, "#eee"); R(hx + (f > 0 ? 7 : 6), y + 5, 1, 1, "#eee");
  if (z.type === "jumper") R(f > 0 ? hx + 10 : hx, y + 5 + (Math.sin(time * .2 + i) > 0 ? 1 : 0), 2, 1, "#e06080");
}
function drawBrute(z, x, y, f, s) {
  const sk = "#7a9a6a", skd = "#4f6a44";
  R(x + 3, y + 15, 4, s > 0 ? 4 : 5, "#2a2434"); R(x + 9, y + 15, 4, s > 0 ? 5 : 4, "#2a2434");
  R(f > 0 ? x - 1 : x + 14, y + 8, 3, 7, skd);
  R(x + 1, y + 6, 14, 10, "#4a4a5a"); R(x + 1, y + 6, 14, 2, "#5e5e70"); R(x + 5, y + 10, 6, 4, sk); R(x + 6, y + 11, 4, 1, skd);
  const ay = y + 8 + (s > 0 ? 0 : 1); R(f > 0 ? x + 13 : x - 3, ay, 6, 4, sk); R(f > 0 ? x + 18 : x - 5, ay - 1, 3, 6, skd);
  R(x + 4, y, 8, 7, sk); R(x + 4, y + 5, 8, 2, skd); R(x + 4, y + 1, 8, 1, "#d8d0c0");
  R(f > 0 ? x + 9 : x + 5, y + 3, 2, 1, "#ff3030"); R(f > 0 ? x + 6 : x + 8, y + 3, 2, 1, "#ff3030"); R(x + 6, y + 6, 4, 1, "#eee");
  if (z.hp < ZT.brute.hp) for (let k = 0; k < ZT.brute.hp; k++) R(x + 2 + k * 5, y - 5, 4, 2, k < z.hp ? "#ff5a5a" : "#3a2a2a");
}
function drawBoss(z, x, y, f, s) {
  R(x + 2, y + 10, 24, 22, "#4a1a5a"); R(x + 3, y + 11, 22, 2, "#7a2a8a");
  for (let k = 0; k < 6; k++) R(x + 2 + k * 4, y + 32, 3, 1 + ((k + (time >> 3)) % 2) * 2, "#4a1a5a");
  R(x + 7, y + 28, 6, s > 0 ? 7 : 8, "#2a2434"); R(x + 15, y + 28, 6, s > 0 ? 8 : 7, "#2a2434"); R(x + 5, y + 35, 9, 1, "#1a1424"); R(x + 14, y + 35, 9, 1, "#1a1424");
  R(f > 0 ? x : x + 24, y + 14, 4, 10, "#6a8a4a");
  R(x + 5, y + 12, 18, 17, "#3a5a3a"); for (let k = 0; k < 3; k++) R(x + 9, y + 15 + k * 4, 10, 1, "#9ab07a"); R(x + 5, y + 26, 18, 2, "#c9a227"); R(x + 13, y + 26, 2, 2, "#e02a4a");
  const ay = y + 14 + (s > 0 ? 0 : 1); R(f > 0 ? x + 22 : x - 4, ay, 10, 5, "#8ab05a"); for (let k = 0; k < 3; k++) R(f > 0 ? x + 31 : x - 5, ay - 1 + k * 3, 2, 1, "#e8e0d0");
  R(x + 7, y + 1, 14, 12, "#8ab05a"); R(x + 7, y + 11, 14, 2, "#5a7a3a"); R(x + 8, y + 3, 5, 1, "#2a3a1a"); R(x + 15, y + 3, 5, 1, "#2a3a1a");
  g.globalAlpha = .45 + Math.sin(time * .2) * .2; R(x + 7, y + 3, 14, 5, "#ff2a2a"); g.globalAlpha = 1;
  R(x + 9, y + 5, 3, 2, "#ffdada"); R(x + 16, y + 5, 3, 2, "#ffdada");
  R(x + 9, y + 9, 10, 3, "#2a0a0a"); for (let k = 0; k < 5; k++) { R(x + 9 + k * 2, y + 9, 1, 1, "#eee"); R(x + 10 + k * 2, y + 11, 1, 1, "#eee"); }
  R(x + 7, y - 4, 14, 4, "#e8b830"); R(x + 7, y - 7, 2, 3, "#e8b830"); R(x + 13, y - 8, 2, 4, "#e8b830"); R(x + 19, y - 7, 2, 3, "#e8b830"); R(x + 7, y - 4, 14, 1, "#fff0a0");
  R(x + 10, y - 3, 2, 2, "#e02a4a"); R(x + 16, y - 3, 2, 2, "#2a8ae0");
}
function drawZombie(z, i) {
  const x = Math.round(z.x - cam), y = Math.round(z.y);
  if (x < -40 || x > W + 40) return;
  if (z.dead) {
    if (z.dead > 60) return;
    g.globalAlpha = 1 - z.dead / 60; R(x - 2, y + z.h - 3, z.w + 4, 3, z.type === "boss" ? "#5a1a6a" : "#3f7a2a"); R(x + 8, y + z.h - 2, 3, 1, "#ddd"); g.globalAlpha = 1; return;
  }
  const f = z.vx > 0 ? 1 : -1, s = Math.sin(z.step * 4), bob = z.ground && s > 0 ? 1 : 0;
  g.globalAlpha = .35; R(x, y + z.h, z.w, 1, "#000"); g.globalAlpha = 1;
  if (z.flash && (z.flash >> 1) % 2) g.globalAlpha = .35;
  if (z.type === "brute") drawBrute(z, x, y + bob, f, s);
  else if (z.type === "boss") drawBoss(z, x, y + bob, f, s);
  else drawSmall(z, i, x, y + bob, f, s);
  g.globalAlpha = 1;
}
function drawPlayer() {
  const p = player; if (p.dead) return;
  if (p.inv > 0 && Math.floor(p.inv / 4) % 2) return;
  const f = p.face, big = p.tier > 0, x2 = p.tier === 2, s = Math.sin(p.step * 3), air = !p.ground, run = !air && Math.abs(p.vx) > .3;
  let x = Math.round(p.x - cam) - 1, y = Math.round(p.y);
  if (big) { // modo bestia: el mismo sprite a 1,5x (o 2x) con músculos y aura
    const sc = TIERS[p.tier].sc; g.save(); g.translate(Math.round(p.x - cam + (p.w - 12 * sc) / 2), y); g.scale(sc, sc); x = 0; y = 0;
    g.globalAlpha = .16 + Math.sin(time * .25) * .07; R(-2, -3, 16, 19, x2 ? "#ff2a8a" : "#ff5a3a"); g.globalAlpha = 1;
    if (x2) for (let k = 0; k < 3; k++) { const a = time * .15 + k * 2.1; R(6 + Math.cos(a) * 9, 7 + Math.sin(a) * 9, 1, 1, "#ffd0f0"); } // chispas alrededor
  }
  const P = (dx, dy, w, h, c) => R(f > 0 ? x + dx : x + 12 - dx - w, y + dy, w, h, c); // dibuja espejado según hacia dónde mira
  if (!air) { g.globalAlpha = .35; R(x + 1, y + 14, 10, 1, "#000"); g.globalAlpha = 1; }
  const len = 4 + Math.min(5, Math.abs(p.vx) * 2.5) + (air ? 2 : 0); // bufanda que flamea
  for (let k = 0; k < len; k++) P(1 - k, 6 + Math.round(Math.sin(time * .3 - k * .7) * (k / 3)) + (air ? -1 : 0), 1, 2, k % 2 ? "#ff8a3d" : "#e2672a");
  if (air) { P(3, 11, 3, 2, "#2b2340"); P(7, 10, 3, 2, "#2b2340"); P(3, 13, 3, 1, "#5a3a2a"); P(8, 12, 3, 1, "#5a3a2a"); }
  else { const a = run && s > 0, b = run && s <= 0; P(a ? 2 : 3, 11, 3, 2, "#2b2340"); P(b ? 8 : 7, 11, 3, 2, "#2b2340"); P(a ? 1 : 3, 13, 4, 1, "#5a3a2a"); P(b ? 8 : 7, 13, 4, 1, "#5a3a2a"); }
  P(2, 7, 8, 4, "#1f7a7a"); P(2, 7, 8, 1, "#2a9a9a"); P(5, 8, 1, 3, "#145555"); P(2, 10, 8, 1, "#145555");
  const arm = run && s > 0 ? 1 : 0;
  if (big) { P(1, 7, 10, 2, "#1f7a7a"); P(4, 9, 4, 1, "#145555"); P(7, 7 + arm, 4, 3, "#f0c8a0"); P(8, 7 + arm, 2, 1, "#ffe0c8"); P(9, 9 + arm, 1, 1, "#c07a6a"); P(10, 9 + arm, 2, 2, "#e8b890"); P(0, 8, 2, 3, "#e8b890"); }
  else { P(7, 8 + arm, 3, 2, "#1f7a7a"); P(10, 8 + arm, 1, 2, "#f0c8a0"); }
  P(2, 6, 8, 2, "#ff8a3d");
  P(2, 0, 8, 6, "#1f7a7a"); P(4, -1, 5, 1, "#1f7a7a"); P(3, 0, 6, 1, "#2a9a9a"); P(5, 2, 5, 4, "#f0c8a0"); P(5, 2, 5, 1, "#145555");
  const glow = p.beam > 0 ? .9 : .35 + Math.sin(time * .1) * .12;
  g.globalAlpha = glow; P(6, 2, 6, 3, x2 ? "#ff5ac8" : big ? "#ffd84a" : "#7ff5ff"); g.globalAlpha = 1;
  P(6, 3, 1, 1, big ? "#fff6c0" : "#e8ffff"); P(8, 3, 1, 1, big ? "#fff6c0" : "#e8ffff");
  if (x2) { P(1, 6, 10, 1, "#1f7a7a"); P(7, 6, 1, 1, "#c07a6a"); } P(7, 5, 2, 1, big ? "#fff" : "#c08a70");
  if (big) g.restore();
}
function drawBeam() {
  const p = player; if (!p.ray || p.beam <= 0) return;
  const r = p.ray, x = r.x - Math.floor(cam), start = p.beamDir > 0 ? x : x + r.w, end = p.beamDir > 0 ? x + r.w : x, B = p.beamBig;
  const [c1, c2, c3] = [["#3fd9ff", "#7ff5ff", "#bff8ff"], ["#ff7a1a", "#ffd84a", "#fff6c0"], ["#ff2a8a", "#ff9ae0", "#fff0ff"]][p.beamTier], cy = r.y + (r.h >> 1), k = p.beamTier + 1, j = B ? Math.round(Math.sin(time * .9) * k) : 0;
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = .16; R(x, cy - 5 * k + j, r.w, 11 * k, c1);
  g.globalAlpha = .45; R(x, cy - 2 * k, r.w, 5 * k, c1);
  g.globalAlpha = 1; R(x, cy - k, r.w, 3 * k - (B ? 1 : 0), c2); R(x, cy, r.w, k, "#fff");
  g.globalAlpha = .7; g.fillStyle = c3;
  g.beginPath(); g.arc(start, cy, (3 + (time % 2)) * k, 0, 7); g.fill();
  g.beginPath(); g.arc(end, cy, (4 + (time % 3)) * k, 0, 7); g.fill();
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}
function heart(x, y, c) { R(x + 1, y, 2, 1, c); R(x + 4, y, 2, 1, c); R(x, y + 1, 7, 2, c); R(x + 1, y + 3, 5, 1, c); R(x + 2, y + 4, 3, 1, c); R(x + 3, y + 5, 1, 1, c); }
const text = (s, x, y, c = "#f3efe6") => { g.fillStyle = "#000"; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y); };
function hud() {
  g.globalAlpha = .55; R(0, 0, W, 28, "#07051a"); g.globalAlpha = 1; R(0, 28, W, 1, "#2e2152");
  g.font = "bold 10px ui-monospace, monospace"; g.textBaseline = "top"; g.textAlign = "left";
  const n = Math.min(6, Math.max(lives, 3)); for (let i = 0; i < n; i++) heart(8 + i * 9, 5, i < lives ? "#ff5a5a" : "#3a2a4a");
  const bx = 8 + n * 9 + 6; R(bx, 5, 7, 5, "#e57fa0"); R(bx + 3, 5, 1, 5, "#b04a6a"); text(String(brains), bx + 10, 3);
  text(String(score).padStart(5, "0"), W / 2 - 12, 3, "#f2c94c");
  text("N" + (levelIdx + 1), W - 72, 3, "#cfc8e8");
  const pct = Math.min(1, player.x / (goalX * T)); R(W - 52, 6, 40, 4, "#2e2152"); R(W - 52, 6, Math.round(40 * pct), 4, "#7cc456"); R(W - 10, 3, 1, 9, "#cfc8e8"); R(W - 9, 3, 5, 4, "#d6453d");
  text(clock(levelTime), W - 40, 15, levelTime / 60 > PAR[levelIdx] ? "#ff8a7a" : "#cfc8e8");
  text("RAYO", 8, 15, "#7ff5ff"); R(36, 18, 40, 4, "#1d3a4a"); R(36, 18, Math.round(40 * (1 - player.cd / 40)), 4, player.cd ? "#3fd9ff" : "#bff8ff");
  if (player.power > 0) text(Math.max(player.tier, player.want) === 2 ? "BESTIA x2" : "BESTIA", 84, 15, Math.sin(time * .15) > 0 ? "#ffb03a" : "#ff7a1a");
  const boss = L.boss && arenaLocked && zombies.find((z) => z.type === "boss" && !z.dead);
  if (boss) { g.textAlign = "center"; text("REY ZOMBI", W / 2, 33, "#e8b830"); R(W / 2 - 60, 45, 120, 5, "#2a0a0a"); R(W / 2 - 60, 45, Math.round(120 * boss.hp / ZT.boss.hp), 5, "#e02a4a"); R(W / 2 - 60, 45, Math.round(120 * boss.hp / ZT.boss.hp), 1, "#ff8a9a"); g.textAlign = "left"; }
  if (msgT) { g.textAlign = "center"; text(msg, W / 2, 60, "#f2c94c"); g.textAlign = "left"; }
  if (banner && mode === "play") {
    const a = Math.min(1, banner / 30, (160 - banner) / 20); g.globalAlpha = a * .7; R(0, 88, W, 50, "#07051a"); g.globalAlpha = a;
    g.textAlign = "center"; g.font = "10px ui-monospace, monospace"; text(`NIVEL ${levelIdx + 1} DE ${LEVELS.length}`, W / 2, 95, "#cfc8e8");
    g.font = "bold 16px ui-monospace, monospace"; text(L.name.toUpperCase(), W / 2, 111, L.boss ? "#ff6a4a" : "#7cc456");
    g.globalAlpha = 1; g.textAlign = "left";
  }
}
function panel(title, sub, c) {
  g.fillStyle = "rgba(7,5,26,.8)"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = `bold ${title.length > 12 ? 22 : 30}px ui-monospace, monospace`;
  g.fillStyle = "#000"; g.fillText(title, W / 2 + 2, 76); g.shadowColor = c; g.shadowBlur = 14; g.fillStyle = c; g.fillText(title, W / 2, 74); g.shadowBlur = 0;
  g.fillStyle = "#f3efe6"; g.font = "11px ui-monospace, monospace";
  sub.forEach((s, i) => g.fillText(s, W / 2, 108 + i * 17)); g.textAlign = "left";
}
const titleBoxes = () => LEVELS.map((_, i) => ({ x: Math.round(W / 2 - 116 + i * 48), y: 86, w: 40, h: 40 }));
function drawTitle() {
  g.fillStyle = "rgba(7,5,26,.82)"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "bold 30px ui-monospace, monospace";
  g.fillStyle = "#000"; g.fillText("ZOMBILANDIA", W / 2 + 2, 52); g.shadowColor = "#7cc456"; g.shadowBlur = 14; g.fillStyle = "#7cc456"; g.fillText("ZOMBILANDIA", W / 2, 50); g.shadowBlur = 0;
  g.font = "11px ui-monospace, monospace"; g.fillStyle = "#cfc8e8"; g.fillText("Saltá, disparale y llegá a la bandera.", W / 2, 70);
  titleBoxes().forEach((b, i) => {
    const open = i < unlocked, on = i === sel, best = bests[i];
    R(b.x, b.y, b.w, b.h, on ? "#3b2f60" : "#1d1730"); g.strokeStyle = on ? "#f2c94c" : open ? "#4a3e6b" : "#2a2240"; g.lineWidth = on ? 2 : 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    g.font = "bold 16px ui-monospace, monospace"; g.fillStyle = open ? (i === 4 ? "#ff6a4a" : "#f3efe6") : "#4a3e6b"; g.fillText(open ? String(i + 1) : "×", b.x + b.w / 2, b.y + 22);
    if (open) for (let k = 0; k < 3; k++) star(b.x + 6 + k * 10, b.y + 29, best && best.st > k);
  });
  const L0 = LEVELS[sel], best = bests[sel];
  g.font = "bold 12px ui-monospace, monospace"; g.fillStyle = sel === 4 ? "#ff6a4a" : "#7cc456"; g.fillText(L0.name, W / 2, 146);
  g.font = "11px ui-monospace, monospace"; g.fillStyle = "#cfc8e8";
  g.fillText(best ? `Mejor: ${best.st} de 3 estrellas · ${clock(best.t)} (meta ${clock(PAR[sel] * 60)})` : `Tiempo meta ${clock(PAR[sel] * 60)}`, W / 2, 162);
  if (records[0]) { g.fillStyle = "#f2c94c"; g.fillText(`Récord: ${records[0].n} ${records[0].s}`, W / 2, 184); }
  g.fillStyle = "#f3efe6"; g.fillText(unlocked > 1 ? "◀ ▶ elegí nivel · ▲ o tocá para jugar" : "▲ o tocá para jugar", W / 2, 210);
  g.textAlign = "left";
}
function draw() {
  g.save();
  if (shake) g.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 4));
  drawBg(); drawTiles(); drawItems();
  zombies.forEach((z, i) => drawZombie(z, z.idx ?? i));
  drawPlayer(); drawBeam();
  for (const q of parts) { g.globalAlpha = Math.min(1, q.life / 20); R(q.x - cam, q.y, 2, 2, q.col); } g.globalAlpha = 1;
  g.fillStyle = grads().vig; g.fillRect(0, 0, W, H);
  hud(); g.restore();
  g.font = "8px ui-monospace, monospace"; g.textAlign = "right"; g.textBaseline = "bottom"; g.globalAlpha = .6; text(VERSION, W - 3, H - 2, "#cfc8e8"); g.globalAlpha = 1; g.textAlign = "left";
  if (mode === "title") drawTitle();
  else if (mode === "__") panel("ZOMBILANDIA", ["Saltá sobre los zombis o usá el rayo.", "Doble salto: saltá otra vez en el aire.", "5 mundos y un jefe final.", records[0] ? `Récord: ${records[0].n} ${records[0].s}` : "", "Tocá o apretá una tecla para empezar", ...(unlocked > 1 ? [`o tocá ⚡ para seguir desde el nivel ${unlocked}`] : [])], "#7cc456");
  else if (mode === "clear") {
    panel("¡NIVEL SUPERADO!", [L.name, `${lastStars[0] ? "✓" : "✗"} Tiempo ${clock(levelTime)} (meta ${clock(PAR[levelIdx] * 60)})`, `${lastStars[1] ? "✓" : "✗"} Cerebros ${gotBrains} de ${totalBrains}`, `${lastStars[2] ? "✓" : "✗"} ${damaged ? "Recibiste golpes" : "Sin golpes"}`, `Puntos: ${score}`, "Tocá para seguir"], "#f2c94c");
    for (let k = 0; k < 3; k++) { g.save(); g.translate(W / 2 - 34 + k * 24, 84); g.scale(2, 2); star(0, 0, lastStars[k]); g.restore(); }
  }
  else if (mode === "over") panel("TE COMIERON", [`Nivel ${levelIdx + 1}: ${L.name}  ·  ${score} puntos`, ...recLines(3), "", bossCheck && bossCheck.level === levelIdx ? "Tocá para volver a pelear con el jefe" : "Tocá para reintentar el nivel"], "#ff5a5a");
  else if (mode === "won") panel("¡SOBREVIVISTE!", [`Derrotaste al Rey Zombi · ${score} puntos`, "", ...recLines(5), "Tocá para volver"], "#f2c94c");
}

// ---------- Bucle (60 fps fijos) ----------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw(); musicTick(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Entrada ----------
function press(k) { // empezar, seguir o reintentar
  if (naming) return true;
  if (mode === "title") {
    if (k === "left" || k === "right") { sel = Math.max(0, Math.min(unlocked - 1, sel + (k === "left" ? -1 : 1))); beep(660, .05, "square"); return true; }
    newGame(urlLevel ? urlLevel - 1 : sel); return true;
  }
  if (mode === "over") {
    lives = 3;
    if (bossCheck && bossCheck.level === levelIdx) { // revancha: arranca en la arena, frente al jefe
      score = bossCheck.score; brains = bossCheck.brains; loadLevel(levelIdx);
      zombies = zombies.filter((z) => z.type === "boss"); banner = 0;
      Object.assign(player, { x: 159 * T, y: 12 * T, safe: { x: 159 * T, y: 12 * T } }); lockArena(); say("¡Revancha con el Rey Zombi!");
    } else { score = levelStart; loadLevel(levelIdx); }
    mode = "play"; return true;
  }
  if (mode === "clear") { bossCheck = null; loadLevel(levelIdx + 1); mode = "play"; return true; }
  if (mode === "won") { mode = "title"; loadLevel(0); return true; }
  return false;
}
const map_k = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump", x: "fire", X: "fire", f: "fire", F: "fire", j: "fire", J: "fire", Shift: "fire", z: "fire", Z: "fire" };
addEventListener("keydown", (e) => {
  if (naming) return;
  const k = map_k[e.key]; if (e.repeat) { if (k) e.preventDefault(); return; }
  audioInit();
  if (e.key === "m" || e.key === "M") { toggleMusic(); return; }
  if (mode === "title" && /^[1-5]$/.test(e.key) && +e.key <= unlocked) { newGame(+e.key - 1); return; } // elegir nivel ya desbloqueado
  if (press(k)) { e.preventDefault(); return; }
  if (k) { keys[k] = true; if (k in tap) tap[k] = true; e.preventDefault(); }
});
addEventListener("keyup", (e) => { const k = map_k[e.key]; if (k) keys[k] = false; });
addEventListener("blur", () => { keys.left = keys.right = keys.jump = keys.fire = false; });
cv.addEventListener("pointerdown", (e) => {
  audioInit();
  if (mode === "title" && !naming) { // tocar un nivel lo elige y arranca
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const i = titleBoxes().findIndex((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (i >= 0 && i < unlocked) sel = i; else if (i >= unlocked) return;
  }
  press(null);
});
const vibBtn = document.getElementById("vib"); if (vibBtn) { if (!canVibe) vibBtn.remove(); else { vibBtn.style.opacity = vibeOn ? 1 : .4; vibBtn.addEventListener("click", toggleVibe); } }
const musBtn = document.getElementById("mus"); if (musBtn) { musBtn.textContent = musicOn ? "♪" : "✕"; musBtn.addEventListener("click", toggleMusic); }
document.querySelectorAll("#pad button").forEach((b) => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); audioInit(); if (press(k)) return; keys[k] = true; if (k in tap) tap[k] = true; b.classList.add("on"); b.setPointerCapture?.(e.pointerId); };
  const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});
window.__game = {
  get state() { return { mode, level: levelIdx + 1, lives, score, brains, x: player.x, y: player.y, bossDead, arenaLocked, big: player.tier, power: player.power, w: player.w, h: player.h }; }, keys,
  debug: { load(i) { newGame(i); }, tp(col) { const r = surface(col); Object.assign(player, { x: col * T, y: (r > 0 ? r : 10) * T - 16, vx: 0, vy: 0 }); }, god() { lives = 99; }, die() { lives = 1; loseLife(); }, power() { powerUp(); }, peace() { zombies.length = 0; }, get boss() { const z = zombies.find((z) => z.type === "boss"); return z && { x: z.x, hp: z.hp, dead: z.dead }; } },
};
