"use strict";
// Zombilandia: platformer de zombies en canvas, sin librerías. Personajes y arte propios (rects de píxel).
// 5 niveles: cementerio, ciudad en ruinas, pantano tóxico, laboratorio y la guarida del Rey Zombi (jefe final).
const VERSION = "v50"; // subir en cada publicación (también en index.html)
// ---------- Métricas de uso (Umami, anónimas, sin cookies) ----------
// Pegá acá el "Website ID" de tu sitio en Umami; vacío = no se manda nada. Respeta "No rastrear" del navegador y solo cuenta en el sitio publicado.
const UMAMI = { id: "", src: "https://cloud.umami.is/script.js", domains: "ccontarino.github.io" };
if (UMAMI.id) { const s = document.createElement("script"); s.defer = true; s.src = UMAMI.src; s.dataset.websiteId = UMAMI.id; s.dataset.domains = UMAMI.domains; s.dataset.doNotTrack = "true"; document.head.appendChild(s); }
const track = (name, data) => { try { if (window.umami && net.role !== "guest") window.umami.track(name, data); } catch {} };
const T = 16, H = 240, ROWS = 15, COLS = 215;
let W = 480, cache = {};
const cv = document.getElementById("c"); let g = cv.getContext("2d"); const MAINCTX = g; let SC = 1;
function fit() { // en celu vertical el mundo se ve más angosto, así los sprites quedan grandes
  W = innerWidth < innerHeight ? 300 : 480; const css = Math.min(innerWidth, (innerHeight - 24) * W / H); SC = Math.max(2, Math.min(4, Math.round(css * (devicePixelRatio || 1) / W))); cv.width = W * SC; cv.height = H * SC; cv.style.aspectRatio = W + " / " + H; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; cache = {};
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
const S = (s) => s.split(" ").map((t) => [parseInt(t), { w: "walker", k: "exploder", r: "runner", j: "jumper", b: "brute", B: "boss", v: "bat", s: "spitter", e: "shielder", G: "digger", F: "fireman", T: "toad", X: "doctor" }[t.slice(-1)]]);
const solid = (tx, ty) => { if (tx < 0 || tx >= COLS) return true; if (ty < 0 || ty >= ROWS) return false; const c = map[ty][tx]; return c === "#" || c === "=" || c === "?" || c === "S" || c === "O" || c === "u" || c === "^" || c === "F"; };
function surface(col) { let r = ROWS - 1; if (!solid(col, r)) return -1; while (r > 0 && solid(col, r - 1)) r--; return r; }

const THEMES = {
  cemetery: { sky: ["#07051a", "#22163f", "#4b2747", "#5e2f40"], stars: 1, moon: "#f4ecc8", cloud: "#2e2152", hill: "#1e1538", mid: "town", near: "graves", fog: "#aa96d2",
    grass: ["#7cc456", "#4f8a35", "#2f5a22"], dirt: ["#4a3326", "#3a281f", "#2d1f18", "#5a4234"], plat: ["#7a3f2e", "#b0644a", "#4a2219"], deco: ["tomb", "cross", "bones", "weed", "weed"], liquid: ["#7aff4a", "#2a8a1a"] },
  city: { sky: ["#140a14", "#3e1c24", "#8e3e26", "#c8703a"], stars: 0, moon: "#ffb070", cloud: "#4a2226", hill: "#2a1620", mid: "city", near: "rubble", fog: "#c87850", ambient: "ash",
    grass: ["#a4a4b0", "#6e6e7a", "#3e3e48"], dirt: ["#55555f", "#44444e", "#2a2a32", "#6a6a74"], plat: ["#a8541e", "#e8964a", "#5a2810"], deco: ["cone", "barrel", "rubble", "rubble", "sign"], liquid: ["#c6ff3a", "#5a9a10"] },
  swamp: { sky: ["#030a08", "#0c2a1e", "#1e4a2e", "#3a5a2a"], stars: 1, moon: "#d8f0a0", cloud: "#123222", hill: "#0a2016", mid: "swamp", near: "reeds", fog: "#78c878", ambient: "fireflies",
    grass: ["#8acb4a", "#4a7a2a", "#2a4a1a"], dirt: ["#3a2e1e", "#2e2416", "#22190f", "#4a3a26"], plat: ["#6a4a2a", "#8a6a3a", "#3a2614"], deco: ["mushroom", "reeds", "reeds", "bones", "weed"], liquid: ["#7aff4a", "#2a8a1a"] },
  lab: { indoor: 1, sky: ["#0a0e18", "#121a2a", "#1a2436", "#1e2a3e"], fog: "#50b4ff", ambient: "drips",
    grass: ["#9aaabb", "#5a6676", "#2e3644"], dirt: ["#3a4454", "#2e3644", "#222a36", "#4a5666"], plat: ["#6a7686", "#9aaabb", "#3a4454"], deco: ["crate", "barrel", "tank", "crate"], liquid: ["#c6ff3a", "#5a9a10"] },
  lair: { sky: ["#0a0204", "#2a0608", "#6a1410", "#a02a10"], stars: 0, moon: "#ff6a3a", cloud: "#3a0a0a", hill: "#1a0606", mid: "castle", near: "fence", fog: "#ff5a28", ambient: "embers",
    grass: ["#8a6a70", "#5a4a52", "#3a2e34"], dirt: ["#4a3a42", "#3a2e34", "#2a2026", "#5a4a52"], plat: ["#5a4a52", "#7a6a70", "#2a2026"], deco: ["skull", "torch", "bones", "skull", "torch"], liquid: ["#ffcc33", "#ff5a10"] },
  snow: { sky: ["#0a1230", "#1c2c58", "#44629a", "#9ab8d8"], stars: 1, moon: "#e8f4ff", cloud: "#5a6c98", hill: "#34466e", mid: "peaks", near: "pines", fog: "#c8e0ff", ambient: "snow",
    grass: ["#f4faff", "#c8dcf0", "#8aa6c8"], dirt: ["#4a5a7a", "#3a4866", "#2a3450", "#62749a"], plat: ["#7ac8f0", "#c8f0ff", "#2a6a9a"], deco: ["pine", "snowman", "pine", "rock", "pine"], liquid: ["#9ae8ff", "#2a6aa0"] },
  desert: { sky: ["#2a1030", "#7a2a48", "#d0603a", "#ffb050"], stars: 0, moon: "#fff0b0", cloud: "#a04a48", hill: "#7a3040", mid: "dunes", near: "cacti", fog: "#ffc880", ambient: "sand",
    grass: ["#f0d890", "#d0a860", "#9a7038"], dirt: ["#b07a48", "#8a5a34", "#6a4026", "#c89058"], plat: ["#c08a50", "#e8b070", "#6a4020"], deco: ["cactus", "bones", "skull", "cactus", "rock"], liquid: ["#e8b860", "#8a5018"] },
  jungle: { sky: ["#021410", "#073a2a", "#146a40", "#3a9a4a"], stars: 0, moon: "#d0ffa0", cloud: "#0a3a28", hill: "#06281c", mid: "jungle", near: "ferns", fog: "#60d890", ambient: "spores",
    grass: ["#5adc50", "#2a9a3a", "#146a28"], dirt: ["#3a2a1a", "#2e2014", "#22160c", "#4e3a24"], plat: ["#7a5a32", "#a07a46", "#3a2410"], deco: ["fern", "flower", "fern", "mushroom", "weed"], liquid: ["#d070ff", "#6a2aa8"] },
  carnival: { sky: ["#14062a", "#3a0c58", "#8a1c78", "#e05a90"], stars: 1, moon: "#ffe8f8", cloud: "#6a2a7a", hill: "#2a0a40", mid: "ferris", near: "lights", fog: "#ff8ad8", ambient: "confetti",
    grass: ["#ff8ac8", "#d04a98", "#8a2468"], dirt: ["#5a2a6a", "#46205a", "#321442", "#703a82"], plat: ["#ffcc33", "#ff8a3a", "#a02a40"], deco: ["balloon", "lamp", "balloon", "lamp"], liquid: ["#ff7ad8", "#a02a98"] },
  moon: { sky: ["#000008", "#04041a", "#0a0a30", "#16183e"], stars: 1, moon: "#6ab4ff", cloud: "#10122c", hill: "#181a36", mid: "lunar", near: "rocks", fog: "#7a86c8", ambient: "stardust",
    grass: ["#c8ccd8", "#9094a8", "#5a5e74"], dirt: ["#5a5e72", "#484c60", "#34384a", "#70748a"], plat: ["#8a96b0", "#bcc8e0", "#3a4458"], deco: ["antenna", "rock", "rock", "crate", "antenna"], liquid: ["#9aff4a", "#3a9a1a"] },
};

const LEVELS = [
  { name: "El cementerio", theme: "cemetery", build() {
    fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[30, 32], [52, 54], [74, 77], [96, 98], [118, 122], [140, 142]]) fill(a, b, 13, 14, " ");
    plat(12, 9, 4); coins(12, 8, 4); plat(22, 10, 3, "?"); coins(22, 9, 3); plat(36, 9, 5); coins(36, 8, 5); plat(44, 7, 3); coins(44, 6, 3);
    plat(58, 10, 4); plat(63, 8, 4); coins(63, 7, 4); plat(70, 10, 3); plat(82, 9, 6); coins(82, 8, 6); plat(92, 10, 2); plat(100, 9, 3, "?"); coins(100, 8, 3);
    plat(108, 10, 4); plat(113, 8, 4); coins(113, 7, 4); plat(126, 9, 3, "F"); plat(131, 7, 3); coins(131, 6, 3); plat(146, 10, 5); coins(146, 9, 5);
    plat(156, 9, 3, "F"); plat(160, 7, 3); plat(164, 5, 3); coins(164, 4, 3);
    for (let i = 0; i < 6; i++) fill(172 + i, 172 + i, 12 - i, 12, "#");
    set(23, 10, "S"); set(101, 9, "O");
    return { arena: { wall: 188, lock: 192 }, movers: [[118, 11, 2, 3, 0, .02]], goal: 211, spawns: S("205G 18w 27w 40w 47w 60w 66w 85w 90w 104w 110r 115w 128w 134w 148r 152w 158w 166r 170w 35v 78v 124v 160v") };
  } },
  { name: "Ciudad en ruinas", theme: "city", build() {
    const B = [[0, 15, 13], [18, 27, 11], [30, 37, 9], [40, 47, 10], [51, 58, 12], [61, 66, 8], [69, 78, 11], [82, 88, 10], [92, 100, 12], [104, 110, 9], [113, 120, 7], [123, 132, 10], [136, 141, 12], [145, 152, 9], [155, 160, 11], [163, 170, 8], [173, 214, 12]];
    for (const [a, b, t] of B) fill(a, b, t, 14, "#");
    for (let i = 0; i < B.length - 1; i++) { const [, b1, t1] = B[i], [a2, , t2] = B[i + 1]; arc(b1, Math.min(t1, t2) - 2, a2 - b1 + 1); }
    set(57, 11, "^"); set(159, 10, "^"); set(26, 10, "^");
    plat(21, 6, 3, "?"); plat(72, 7, 3, "?"); plat(126, 6, 2, "?"); plat(43, 6, 3); coins(43, 5, 3); plat(85, 6, 3); coins(85, 5, 3); plat(147, 5, 4); coins(147, 4, 4);
    set(73, 7, "S"); set(127, 6, "O");
    return { arena: { wall: 188, lock: 192 }, movers: [[89, 8, 3, 4, 0, .015], [133, 10, 2, 0, 3, .02]], goal: 211, spawns: S("205F 56k 100k 142k 22w 34w 44r 54w 63j 73r 76w 85w 96r 107w 116j 127r 130w 148b 158r 166w 178r 181w 47e 100s 140v 168e") };
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
    fill(78, 85, 11, 13, "W"); fill(78, 85, 14, 14, "#"); fill(76, 77, 11, 12, "#"); fill(86, 87, 11, 12, "#"); // laguna para nadar
    set(103, 8, "S"); set(173, 9, "O");
    return { arena: { wall: 188, lock: 192 }, movers: [[50, 10, 2, 5, 0, .02]], goal: 211, spawns: S("205T 52k 108k 150k 10w 22j 35w 46j 60w 62j 74r 89j 92w 104j 119w 121j 131b 148j 160r 163j 172w 38s 64v 93s 140v 150s") };
  } },
  { name: "El laboratorio", theme: "lab", build() {
    fill(0, COLS - 1, 0, 1, "#"); fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[34, 38], [70, 75], [110, 116], [150, 155]]) fill(a, b, 13, 14, "~");
    for (const [a, b] of [[20, 23], [56, 59], [90, 93], [128, 131], [168, 170]]) { fill(a, b, 12, 12, "x"); arc(a - 1, 9, b - a + 3); }
    fill(44, 45, 2, 9, "#"); fill(100, 101, 2, 9, "#"); fill(140, 141, 2, 8, "#");
    fill(62, 63, 10, 12, "#"); fill(120, 121, 9, 12, "#"); set(117, 12, "^"); set(60, 12, "^");
    plat(35, 10, 3); coins(35, 9, 3); plat(71, 10, 4); coins(71, 9, 4); plat(111, 10, 2); plat(114, 8, 2); coins(114, 7, 2); plat(151, 10, 4); coins(151, 9, 4);
    plat(26, 8, 3, "?"); plat(80, 8, 3, "?"); plat(160, 8, 3, "?"); plat(50, 9, 3, "F"); coins(50, 8, 3);
    set(81, 8, "S"); set(27, 8, "O");
    return { arena: { wall: 188, lock: 192 }, movers: [[64, 12, 2, 0, 4, .02], [112, 11, 2, 0, 3, .025]], goal: 211, spawns: S("205X 60k 118k 160k 16w 28r 48b 66w 78r 86j 96w 105b 124r 133w 146b 158r 163j 175b 180r 40e 74v 118s 160e 172v") };
  } },
  { name: "La guarida del Rey Zombi", theme: "lair", boss: true, build() {
    fill(0, COLS - 1, 13, 14, "#");
    for (const [a, b] of [[18, 22], [34, 39], [52, 56], [68, 74], [90, 95], [108, 114], [126, 131], [144, 150]]) {
      fill(a, b, 13, 14, "~"); const n = b - a + 1;
      if (n > 5) { const m = a + Math.floor(n / 2) - 1; plat(m, 10, 2); coins(m, 9, 2); } else arc(a - 1, 11, n + 2);
    }
    for (const [a, b] of [[44, 46], [60, 62], [100, 102], [136, 138]]) fill(a, b, 12, 12, "x");
    fill(80, 83, 9, 12, "#"); set(77, 12, "^"); fill(118, 121, 8, 12, "#"); set(116, 12, "^");
    plat(26, 9, 4, "F"); coins(26, 8, 4); plat(58, 9, 3, "?"); plat(84, 6, 4); coins(84, 5, 4); plat(96, 9, 3, "?"); plat(122, 6, 3); coins(122, 5, 3); plat(138, 8, 4, "F"); coins(138, 7, 4);
    plat(165, 9, 3); plat(176, 9, 3, "?");
    set(59, 9, "S"); set(177, 9, "S"); set(97, 9, "O");
    return { arena: { wall: 155, lock: 161 }, movers: [[90, 10, 2, 4, 0, .02], [108, 10, 2, 5, 0, .018], [144, 9, 2, 5, 0, .022]], goal: 186, spawns: S("12w 25r 30j 42b 48r 59w 64j 75w 87r 98b 104j 124r 134b 141j 154r 178B 20v 50e 70v 133s 139e 146v") };
  } },
];

// ---------- Estado ----------
const keys = { left: false, right: false, jump: false, fire: false }, tap = { jump: false, fire: false }; // tap: toques rápidos que no deben perderse
// Dos jugadores: inputs[0] son los botones de este aparato; inputs[1] los del compañero (llegan por la red).
const keys2 = { left: false, right: false, jump: false, fire: false }, tap2 = { jump: false, fire: false };
const inputs = [keys, keys2], taps = [tap, tap2];
let players = [], pi = 0, K = keys, TP = tap, nPlayers = 1;
const net = { role: null, peer: false, paused: false, rec: null, quiet: false, step() {}, press() { return false; } }; // lo completa net.js
const me = () => (net.role === "guest" ? 1 : 0);
const ctx = (i) => { pi = i; player = players[i]; K = inputs[i]; TP = taps[i]; }; // "player" es el jugador que se está procesando
// Niveles 6-10: escenarios nuevos (nieve, desierto, selva, parque de diversiones y luna), cada uno con su propio terreno y mecánica
const land = (segs) => { for (const [a, b, t] of segs) fill(a, b, t, 14, "#"); }; // tramos de suelo [desde, hasta, fila de la superficie]
const gaps = (segs, ch = "~") => { for (let k = 0; k < segs.length - 1; k++) { const a = segs[k][1] + 1, b = segs[k + 1][0] - 1; if (b >= a) fill(a, b, 13, 14, ch); } };
LEVELS.push(
  { name: "Montaña nevada", theme: "snow", hard: true, build() { // sube y baja por la montaña; el hielo patina
    const T = [[0, 14, 13], [15, 22, 12], [23, 29, 11], [30, 36, 10], [37, 43, 9], [44, 51, 8], [56, 62, 9], [63, 68, 10], [69, 74, 11], [75, 79, 12], [84, 92, 12], [93, 97, 11], [98, 102, 10], [103, 108, 9], [109, 114, 8], [119, 125, 9], [126, 131, 10], [132, 137, 11], [138, 143, 12], [148, 156, 12], [157, 160, 11], [161, 164, 10], [165, 168, 11], [169, 172, 12], [173, 214, 13]];
    land(T); gaps(T);
    plat(45, 5, 3, "?"); coins(45, 4, 3); plat(100, 7, 3, "?"); plat(150, 9, 3, "?"); plat(33, 7, 3); coins(33, 6, 3); plat(58, 6, 3); coins(58, 5, 3); plat(111, 5, 3); coins(111, 4, 3); plat(128, 7, 3); coins(128, 6, 3);
    set(46, 5, "S"); set(101, 7, "O"); set(151, 9, "S"); set(66, 9, "x"); set(135, 10, "x"); set(160, 10, "x");
    return { arena: { wall: 188, lock: 192 }, movers: [], goal: 211, spawns: S("205G 8w 12r 18w 26j 33w 40r 47w 49k 58j 61w 66r 72w 77r 86w 90r 95k 100j 106w 111r 122j 128w 134r 140k 150w 154r 159w 163j 167r 176w 180r 20v 55v 105v 140v 70s 124s 38e 100e") };
  } },
  { name: "Desierto de huesos", theme: "desert", hard: true, build() { // dunas, arenas movedizas y dos pirámides escalonadas
    fill(0, COLS - 1, 13, 14, "#");
    for (let x = 0; x < 165; x++) { const d = Math.round(Math.sin(x / 6) * 1.1 + Math.sin(x / 2.7)); if (d > 0 && x > 4) fill(x, x, 12, 12, "#"); } // ondulaciones de la duna
    const pyr = (c0, c1, top) => { for (let x = c0; x <= c1; x++) { const k = Math.min(x - c0, c1 - x), h = Math.min(13 - top, 1 + Math.floor(k / 2)); fill(x, x, 13 - h, 13, "#"); } };
    pyr(66, 90, 6); pyr(124, 146, 7);
    for (const [a, b] of [[28, 31], [52, 55], [104, 107], [112, 115], [152, 155], [168, 171]]) { fill(a, b, 13, 14, "~"); fill(a, b, 12, 12, " "); }
    for (const c of [40, 46, 96, 120, 160]) set(c, surface(c) - 1, "x");
    plat(14, 9, 3, "?"); coins(14, 8, 3); plat(34, 8, 4); coins(34, 7, 4); plat(58, 8, 3); coins(58, 7, 3); plat(78, 3, 4, "?"); coins(78, 2, 4); plat(98, 9, 3, "?"); plat(108, 9, 3); coins(108, 8, 3); plat(136, 3, 4); coins(136, 2, 4); plat(156, 8, 3, "?"); plat(163, 7, 3); coins(163, 6, 3);
    set(15, 9, "S"); set(99, 9, "O"); set(157, 8, "S");
    return { arena: { wall: 188, lock: 192 }, movers: [], goal: 211, spawns: S("205F 10w 17r 24j 35w 46r 50k 60w 63j 70r 80w 88r 95j 108w 112k 125r 130w 136j 144r 158w 164k 175r 180w 20v 56v 92v 148v 40s 116s 84e 160e") };
  } },
  { name: "Selva podrida", theme: "jungle", hard: true, build() { // islas de tierra sobre veneno, un río para nadar y copas de árboles
    const T = [[0, 10, 13], [14, 21, 12], [25, 30, 13], [34, 40, 11], [44, 49, 12], [53, 60, 13], [64, 69, 11], [73, 79, 11], [93, 99, 11], [103, 108, 12], [112, 117, 13], [121, 126, 12], [130, 134, 11], [138, 145, 12], [149, 156, 13], [160, 164, 12], [168, 172, 13], [176, 214, 13]];
    land(T); gaps(T);
    fill(80, 92, 12, 13, "W"); fill(80, 92, 14, 14, "#"); fill(80, 92, 11, 11, " "); // río
    plat(16, 8, 3, "?"); plat(26, 9, 4); coins(26, 8, 4); plat(36, 6, 3); coins(36, 5, 3); plat(46, 9, 3, "?"); plat(55, 7, 4); coins(55, 6, 4); plat(66, 7, 3); plat(82, 9, 3); coins(82, 8, 3); plat(104, 8, 3, "?"); plat(114, 9, 4); coins(114, 8, 4); plat(131, 7, 3); coins(131, 6, 3); plat(150, 9, 3, "?"); plat(161, 8, 3); coins(161, 7, 3);
    set(17, 8, "S"); set(47, 9, "O"); set(105, 8, "S"); set(151, 9, "S");
    return { arena: { wall: 188, lock: 192 }, movers: [], goal: 211, spawns: S("205T 4w 8r 16w 19j 27w 36j 41w 46r 55w 58j 66r 75k 96w 105j 114w 119r 123w 132j 140r 143k 151w 158j 162r 170w 178r 20v 48v 108v 140v 38s 118s 96e 156e") };
  } },
  { name: "Parque de diversiones", theme: "carnival", hard: true, build() { // huecos enormes que se cruzan en plataformas móviles y resortes
    const T = [[0, 20, 13], [27, 38, 13], [45, 56, 12], [63, 72, 13], [79, 90, 12], [97, 106, 13], [113, 124, 12], [131, 140, 13], [147, 214, 13]];
    land(T); gaps(T);
    set(32, 12, "^"); set(50, 11, "^"); set(68, 12, "^"); set(84, 11, "^"); set(101, 12, "^"); set(118, 11, "^"); set(135, 12, "^");
    plat(30, 9, 3, "?"); plat(35, 6, 3); coins(35, 5, 3); plat(48, 7, 4); coins(48, 6, 4); plat(66, 9, 3, "?"); plat(70, 6, 3); coins(70, 5, 3); plat(82, 7, 4); coins(82, 6, 4); plat(100, 9, 3, "?"); plat(116, 7, 3); coins(116, 6, 3); plat(133, 6, 4); coins(133, 5, 4); plat(150, 9, 3, "?");
    set(31, 9, "S"); set(67, 9, "O"); set(101, 9, "S"); set(151, 9, "S"); set(6, 12, "x"); set(60 + 10, 12, "x");
    const mv = [[21, 12, 2, 4, 0, .02], [39, 12, 2, 4, 0, .02], [57, 11, 2, 4, 0, .022], [73, 11, 2, 4, 0, .02], [91, 12, 2, 4, 0, .022], [107, 11, 2, 4, 0, .02], [125, 12, 2, 4, 0, .024], [141, 12, 2, 4, 0, .02]];
    return { arena: { wall: 188, lock: 192 }, movers: mv, goal: 211, spawns: S("205X 6w 12r 18j 30w 35r 48j 54w 66r 70k 82w 86j 100r 104w 116j 120k 134w 150r 156j 162w 168k 174r 14v 50v 84v 118v 32s 110s 66e 136e") };
  } },
  { name: "Luna zombi", theme: "moon", boss: true, hard: true, build() { // baja gravedad: los saltos son enormes y los cráteres, anchos
    const T = [[0, 12, 13], [19, 28, 12], [34, 42, 11], [48, 53, 13], [59, 70, 10], [76, 83, 12], [89, 97, 9], [103, 110, 12], [116, 122, 13], [128, 137, 11], [143, 150, 12], [155, 214, 13]];
    land(T); gaps(T);
    plat(15, 9, 3); coins(15, 8, 3); plat(30, 7, 3); coins(30, 6, 3); plat(55, 6, 3); coins(55, 5, 3); plat(72, 5, 3); coins(72, 4, 3); plat(85, 7, 3); plat(99, 5, 3); coins(99, 4, 3); plat(124, 7, 3); coins(124, 6, 3); plat(139, 8, 3);
    plat(24, 9, 3, "?"); plat(63, 6, 3, "?"); plat(91, 5, 3, "?"); plat(130, 8, 3, "?"); plat(166, 9, 3); plat(174, 9, 3, "?");
    set(25, 9, "O"); set(64, 6, "S"); set(92, 5, "S"); set(131, 8, "O"); set(175, 9, "S"); set(38, 10, "x"); set(66, 9, "x"); set(106, 11, "x");
    return { arena: { wall: 155, lock: 161 }, movers: [[43, 10, 2, 3, 0, .02], [112, 11, 2, 3, 0, .02]], goal: 186, spawns: S("178B 5w 10r 22j 26w 36r 40j 62w 66b 70r 78j 82w 92b 96r 105j 110w 118r 130b 134r 146j 150w 20v 64v 100v 126v 30s 98s 72k 114k 146e 38e") };
  } }
);
const NL = LEVELS.length; // el modo infinito es el casillero NL; los niveles propios usan NL+1
const ZT = {
  walker: { w: 12, h: 14, hp: 1, speed: .4, pts: 100 },
  runner: { w: 12, h: 14, hp: 1, speed: 1.0, pts: 150 },
  jumper: { w: 12, h: 14, hp: 1, speed: .5, pts: 150 },
  brute: { w: 16, h: 20, hp: 3, speed: .28, pts: 300 },
  boss: { w: 28, h: 36, hp: 12, speed: .55, pts: 2000, boss: "REY ZOMBI" },
  digger: { w: 22, h: 30, hp: 8, speed: .45, pts: 1000, boss: "EL ENTERRADOR" },  // tira lápidas
  fireman: { w: 22, h: 30, hp: 9, speed: .6, pts: 1200, boss: "BOMBERO ZOMBI" },  // chorros de fuego, mantiene distancia
  toad: { w: 30, h: 20, hp: 10, speed: 0, pts: 1400, boss: "RANA TÓXICA" },       // saltos grandes y burbujas de ácido al caer
  doctor: { w: 18, h: 28, hp: 10, speed: .35, pts: 1600, boss: "DOCTOR ZOMBI" },  // vidrio protector y clones
  exploder: { w: 12, h: 14, hp: 1, speed: .6, pts: 250 }, // bomba zombi: corre hacia vos, prende la mecha y explota
  bat: { w: 12, h: 8, hp: 1, speed: .7, pts: 120 },       // murciélago zombi: vuela en onda y baja hacia vos
  spitter: { w: 12, h: 14, hp: 2, speed: .2, pts: 200 },  // escupidor: tira ácido en arco desde lejos
  shielder: { w: 12, h: 14, hp: 1, speed: .35, pts: 200 }, // escudero: el rayo no lo pasa de frente (salvo bestia x2)
};
const isBoss = (z) => !!ZT[z.type].boss;
// Personajes: 0 = Chispa (rayo de plasma), 1 = Escarcha (rayo de hielo que congela)
const HEROES = [{ name: "CHISPA", power: "rayo de plasma" }, { name: "ESCARCHA", power: "rayo de hielo: congela" }];
let hero = 0; try { hero = +localStorage.getItem("zombilandia-heroe") === 1 ? 1 : 0; } catch {}
const setHero = (h) => { hero = h; try { localStorage.setItem("zombilandia-heroe", h); } catch {} };
const BOSS_NAME = { boss: "el Rey Zombi", digger: "el Enterrador", fireman: "el Bombero zombi", toad: "la Rana tóxica", doctor: "el Doctor zombi" };
const deA = (n) => n.startsWith("el ") ? "al " + n.slice(3) : "a " + n; // "a el" se dice "al"
let arena = null, bossCheck = null; // punto de control en la arena del jefe: si perdés ahí, volvés directo al jefe
let mode = "title", levelIdx = 0, L, TH, goalX = 184, levelStart = 0, banner = 0, bossDead = false, arenaLocked = false, deco = [];
let movers = [], crumble = {}, falling = [], regrow = [], shots = [], player, zombies, items, parts, cam = 0, score = 0, lives = 3, brains = 0, time = 0, msg = "", msgT = 0, shake = 0, unlocked = 1;
try { unlocked = Math.max(1, Math.min(LEVELS.length, +localStorage.getItem("zombilandia-nivel") || 1)); } catch {}
const urlLevel = (() => { const n = +new URLSearchParams(location.search).get("nivel") || 0; return n ? Math.max(1, Math.min(LEVELS.length, n)) : 0; })();
if (urlLevel) unlocked = Math.max(unlocked, urlLevel);

let zuid = 0;
// ---------- Ajustes: dificultad, botones, gráficos ----------
const CFG = { diff: 1, pad: 1, gfx: "auto" };
try { Object.assign(CFG, JSON.parse(localStorage.getItem("zombilandia-ajustes") || "{}")); } catch {}
const saveCfg = () => { try { localStorage.setItem("zombilandia-ajustes", JSON.stringify(CFG)); } catch {} };
const DSP = [.8, 1, 1.25], DLIVES = [5, 3, 2];
let paused = false, fxLvl = 2; // fxLvl: 2 todo, 1 sin bloom, 0 mínimo
function makeZombie(x, y, type, i) {
  const k = ZT[type];
  return { x, y, w: k.w, h: k.h, type, hp: k.hp, vx: (i % 2 ? 1 : -1) * k.speed * DSP[CFG.diff] * (L && L.hard ? 1.12 : 1) * (.85 + rnd(i) * .3), vy: 0, dead: 0, step: i, t: i * 17, flash: 0, shot: -1, idx: i, uid: ++zuid };
}
function addDeco(x0, x1, seed) {
  for (let x = Math.max(1, x0); x < Math.min(x1, COLS - 1); x++) {
    const r = surface(x); if (r < 3 || map[r][x] !== "#" || map[r - 1][x] !== " " || map[r - 2][x] === "#") continue;
    if (map[r][x - 1] === "^" || map[r][x + 1] === "^" || map[r - 1][x - 1] === "^" || map[r - 1][x + 1] === "^" || map[r - 1][x - 1] === "x" || map[r - 1][x + 1] === "x") continue;
    const q = rnd(x * 3.1 + seed * 13); if (q < .36) deco.push([x, r - 1, TH.deco[Math.floor(rnd(x + seed) * TH.deco.length)]]);
  }
}
// ---------- Logros y trajes ----------
const ACH = [
  { id: "primera", name: "Primera sangre", desc: "Derrotá a tu primer zombi" },
  { id: "cazador", name: "Cazador", desc: "Derrotá 50 zombis (entre todas las partidas)", skin: 1 },
  { id: "rey", name: "Cae el jefe", desc: "Derrotá a un jefe", skin: 3 },
  { id: "perfecto", name: "Perfecto", desc: "Pasá un nivel con las 3 estrellas", skin: 2 },
  { id: "sin_golpes", name: "Intocable", desc: "Pasá un nivel sin recibir golpes" },
  { id: "cerebros", name: "Coleccionista", desc: "Juntá todos los cerebros de un nivel" },
  { id: "bestia3", name: "Rabia", desc: "Llegá a bestia nivel 3" },
  { id: "titan", name: "Titán", desc: "Llegá a bestia nivel 5", skin: 4 },
  { id: "maraton", name: "Maratonista", desc: "Corré 500 metros en el modo infinito" },
  { id: "amigos", name: "Mejor acompañado", desc: "Pasá un nivel jugando online" },
];
const SKINS = ["Clásico", "Fuego", "Neón", "Dorado", "Sombra"];
let ach = {}, stats = { kills: 0 }, toasts = [];
try { ach = JSON.parse(localStorage.getItem("zombilandia-logros") || "{}"); stats = Object.assign(stats, JSON.parse(localStorage.getItem("zombilandia-stats") || "{}")); } catch {}
const skinOpen = (s) => s === 0 || !!ach[ACH.find((a) => a.skin === s)?.id];
if (!skinOpen(CFG.skin || 0)) CFG.skin = 0;
function unlock(id) {
  if (ach[id] || net.role === "guest") return; ach[id] = 1; track("logro", { id }); try { localStorage.setItem("zombilandia-logros", JSON.stringify(ach)); } catch {}
  const a = ACH.find((x) => x.id === id); toasts.push({ t: 240, txt: a.name, sub: a.skin ? "¡Traje " + SKINS[a.skin] + " desbloqueado!" : a.desc }); beep(880, .1, "triangle", 1320); beep(1320, .15, "triangle", 1760, .1);
}
const addKill = () => { stats.kills++; unlock("primera"); if (stats.kills >= 50) unlock("cazador"); if (stats.kills % 5 === 0) try { localStorage.setItem("zombilandia-stats", JSON.stringify(stats)); } catch {} };
function mkPlayer(i, k) {
  const keep = k?.keep || 0, x = 40 + i * 14;
  return { x, y: 150, vx: 0, vy: 0, w: 10, h: 14, face: 1, ground: false, coyote: 0, jumps: 0, cd: 0, beam: 0, beamDir: 1, ray: null, firePrev: false, shot: 0, inv: 0, dead: 0, step: 0, springT: 0, big: false, tier: 0, want: keep, growing: keep > 0, power: keep > 0 ? 1 : 0, beamBig: false, beamTier: 0, shield: !!k?.shield, hero: i === 0 ? hero : 1 - hero, skin: i === 0 ? (CFG.skin || 0) : (net.gskin || 0), safe: { x, y: 150 } };
}
function loadLevel(i) {
  endless = false;
  const keeps = players.map((p) => ({ keep: Math.max(p.tier, p.want), shield: !!p.shield })); // el modo bestia y el escudo pasan al nivel siguiente
  const custom = typeof i === "object"; // un nivel hecho en el editor
  levelIdx = custom ? NL + 1 : i; L = custom ? i : LEVELS[i]; TH = THEMES[L.theme]; cache = {};
  for (const row of map) row.fill(" ");
  const info = L.build(); goalX = info.goal; arena = info.arena;
  movers = (info.movers || []).map(([c, r, w, dx, dy, sp], k) => ({ x0: c * T, y0: r * T, x: c * T, y: r * T, w: w * T, h: 8, dx: dx * T, dy: dy * T, sp, t: k * 1.7, vx: 0, vy: 0 }));
  crumble = {}; falling = []; regrow = [];
  players = Array.from({ length: nPlayers }, (_, i) => mkPlayer(i, keeps[i])); ctx(0);
  zombies = [];
  info.spawns.forEach(([col, type], n) => {
    const r = surface(col), k = ZT[type], x = col * T + (T - k.w) / 2;
    if (type === "bat") { const z = makeZombie(x, (r > 0 ? r - 5 : 8) * T, type, n); z.bx = z.x; z.by = z.y; z.off = 0; zombies.push(z); }
    else if (r > 0) zombies.push(makeZombie(x, r * T - k.h, type, n));
  });
  items = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === "c") items.push({ x: x * T + 4, y: y * T + 4, w: 8, h: 8, got: false });
  totalBrains = items.length + map.reduce((n, row) => n + row.filter((c) => c === "?").length, 0); gotBrains = 0; levelTime = 0; damaged = false;
  deco = []; addDeco(4, goalX - 3, levelIdx);
  parts = []; shots = []; cam = 0; shake = 0; msg = ""; msgT = 0; banner = 160; bossDead = false; arenaLocked = false; levelStart = score;
  if (!custom && i + 1 > unlocked) { unlocked = i + 1; try { localStorage.setItem("zombilandia-nivel", unlocked); } catch {} }
}
function lockArena() { arenaLocked = true; fill(arena.wall, arena.wall + 1, 2, surface(arena.wall) - 1, "#"); shake = 20; beep(90, .8, "sawtooth", 40); }
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
const PAR = [80, 95, 100, 110, 120, 110, 120, 125, 135, 150]; // segundos
let levelTime = 0, damaged = false, gotBrains = 0, totalBrains = 0, lastStars = [false, false, false], bests = {}, sel = unlocked - 1;
try { bests = JSON.parse(localStorage.getItem("zombilandia-estrellas") || "{}"); } catch {}
const clock = (f) => { const s = Math.floor(f / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function finishLevel() {
  lastStars = [levelTime / 60 <= PAR[levelIdx], gotBrains >= totalBrains, !damaged];
  if (lastStars.every(Boolean)) unlock("perfecto"); if (lastStars[2]) unlock("sin_golpes"); if (lastStars[1]) unlock("cerebros"); if (net.peer) unlock("amigos");
  track("nivel_superado", { nivel: levelIdx + 1, estrellas: lastStars.filter(Boolean).length, segundos: Math.round(levelTime / 60), vidas: lives, online: net.peer ? 1 : 0 });
  const n = lastStars.filter(Boolean).length, b = bests[levelIdx] || { st: 0, t: Infinity };
  bests[levelIdx] = { st: Math.max(b.st, n), t: Math.min(b.t, levelTime) };
  try { localStorage.setItem("zombilandia-estrellas", JSON.stringify(bests)); } catch {}
}
function star(x, y, on) { const c = on ? "#f2c94c" : "#3a2f50"; R(x + 3, y, 1, 2, c); R(x, y + 2, 7, 1, c); R(x + 1, y + 3, 5, 1, c); R(x + 2, y + 4, 3, 1, c); R(x + 1, y + 5, 2, 1, c); R(x + 4, y + 5, 2, 1, c); }
// ---------- Tienda ----------
// Entre niveles: los cerebros son la moneda.
let upgrades = {}, shopSel = 0, shopMsg = "", shopMsgT = 0;
const SHOP = [
  { name: "Vida extra", price: 30, ok: () => lives < 9, buy: () => { lives++; } },
  { name: "Escudo", price: 25, ok: () => players.some((p) => !p.shield), buy: () => { for (const p of players) p.shield = true; } },
  { name: "Jeringa (modo bestia)", price: 50, ok: () => players.some((p) => Math.max(p.tier, p.want) < MAXT), buy: () => { for (const p of players) p.want = Math.min(MAXT, Math.max(p.tier, p.want) + 1); } },
  { name: "Rayo largo, para siempre", price: 80, ok: () => !upgrades.longRay, buy: () => { upgrades.longRay = true; } },
  { name: "Seguir al próximo nivel", price: 0 },
];
function shopAct(i) {
  const it = SHOP[i];
  if (!it.price) { loadLevel(levelIdx + 1); mode = "play"; return; }
  if (!it.ok()) { shopMsg = "Ya lo tenés"; beep(160, .12, "square"); }
  else if (brains < it.price) { shopMsg = `Te faltan ${it.price - brains} cerebros`; beep(160, .12, "square"); }
  else { brains -= it.price; it.buy(); shopMsg = `¡Compraste: ${it.name}!`; [660, 880, 1320].forEach((f, k) => beep(f, .08, "triangle", 0, k * .06)); vibe(30); }
  shopMsgT = 120;
}
const shopRow = (i) => ({ x: 24, y: 78 + i * 25, w: W - 48, h: 22 });
function drawShop() {
  g.fillStyle = "rgba(7,5,26,.9)"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "bold 22px ui-monospace, monospace"; g.fillStyle = "#f2c94c"; g.fillText("TIENDA", W / 2, 40);
  g.font = "11px ui-monospace, monospace"; g.fillStyle = "#cfc8e8"; g.fillText(`Tenés ${brains} cerebros para gastar`, W / 2, 60);
  SHOP.forEach((it, i) => {
    const r = shopRow(i), on = i === shopSel, can = !it.price || (it.ok() && brains >= it.price);
    R(r.x, r.y, r.w, r.h, on ? "#3b2f60" : "#1d1730"); g.strokeStyle = on ? "#f2c94c" : "#2e2152"; g.lineWidth = 1; g.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
    g.textAlign = "left"; g.font = `${on ? "bold " : ""}11px ui-monospace, monospace`; g.fillStyle = !it.price ? "#7cc456" : can ? "#f3efe6" : "#6d6496"; g.fillText(it.name, r.x + 8, r.y + 15);
    if (it.price) { g.textAlign = "right"; g.fillStyle = can ? "#f2c94c" : "#6d6496"; g.fillText(it.ok() ? `${it.price}` : "listo", r.x + r.w - 20, r.y + 15); R(r.x + r.w - 15, r.y + 7, 7, 5, can ? "#e57fa0" : "#4a3e6b"); }
  });
  g.textAlign = "center"; g.font = "11px ui-monospace, monospace";
  if (shopMsgT) { g.fillStyle = "#f2c94c"; g.fillText(shopMsg, W / 2, 218); }
  g.fillStyle = "#cfc8e8"; g.fillText("◀ ▶ elegí · ▲ o tocá para comprar", W / 2, 234); g.textAlign = "left";
}
// ---------- Modo infinito ----------
// Tramos armados a mano que se encadenan al azar y se ponen más difíciles. Cuando avanzás, el mundo se corre
// 100 columnas hacia atrás y se genera lo que sigue, así nunca se termina.
const ENDLESS = { name: "Modo infinito" }, ENDLESS_THEMES = ["cemetery", "city", "swamp", "lair"];
let endless = false, distOff = 0, genX = 0, endBest = 0;
try { endBest = +localStorage.getItem("zombilandia-infinito") || 0; } catch {}
const meters = () => Math.max(0, Math.floor(distOff + Math.max(...players.map((p) => p.x)) / T) - 2);
function spawnAt(col, type) {
  const r = surface(col), k = ZT[type], x = col * T + (T - k.w) / 2, n = distOff + col;
  if (type === "bat") { const z = makeZombie(x, (r > 0 ? r - 5 : 8) * T, type, n); z.bx = z.x; z.by = z.y; z.off = 0; zombies.push(z); }
  else if (r > 0 && map[r - 1][col] === " ") zombies.push(makeZombie(x, r * T - k.h, type, n));
}
function genChunk(x) {
  const d = Math.min(1, (distOff + x) / 2500), rr = Math.random, len = 10 + Math.floor(rr() * 6), kind = Math.floor(rr() * 7);
  fill(x, x + len - 1, 13, 14, "#");
  if (kind === 0) arc(x + 2, 10, len - 4);
  else if (kind === 1) { const gw = 2 + Math.floor(rr() * (2 + d * 2)); fill(x + 4, x + 3 + gw, 13, 14, rr() > .5 ? "~" : " "); arc(x + 3, 10, gw + 2); }
  else if (kind === 2) { plat(x + 3, 10, 3); plat(x + 7, 8, 3, rr() > .5 ? "?" : "="); coins(x + 7, 7, 3); }
  else if (kind === 3) { const sw = 3 + Math.floor(d * 2); fill(x + 4, x + 3 + sw, 12, 12, "x"); arc(x + 3, 9, sw + 2); }
  else if (kind === 4) { set(x + 3, 12, "^"); fill(x + 6, x + 8, 9, 12, "#"); plat(x + 6, 6, 4); coins(x + 6, 5, 4); }
  else if (kind === 5) { plat(x + 2, 10, 4, rr() > .5 ? "F" : "="); coins(x + 2, 9, 4); plat(x + 8, 9, 3); }
  else { fill(x + 3, x + 5, 12, 12, "#"); set(x + 4, 11, "#"); coins(x + 3, 10, 3); }
  if (rr() < .07) set(x + len - 3, 9, rr() > .5 ? "S" : "O");
  const pool = ["walker", "walker", "runner", "jumper", "bat", "spitter", "shielder", "brute"].slice(0, 3 + Math.floor(d * 5));
  const n = 1 + Math.floor(rr() * (1 + d * 3));
  for (let k = 0; k < n; k++) spawnAt(x + 1 + Math.floor(rr() * (len - 2)), pool[Math.floor(rr() * pool.length)]);
  return len;
}
function generate() {
  while (genX + 16 <= COLS) {
    const x0 = genX; genX += genChunk(genX);
    for (let y = 0; y < ROWS; y++) for (let x = x0; x < genX; x++) if (map[y][x] === "c") items.push({ x: x * T + 4, y: y * T + 4, w: 8, h: 8, got: false });
    addDeco(x0, genX, distOff);
  }
}
function startEndless() {
  loadLevel(0);
  endless = true; L = ENDLESS; levelIdx = NL; TH = THEMES.cemetery; cache = {}; distOff = 0; arena = null; goalX = 1e9;
  for (const row of map) row.fill(" ");
  zombies = []; items = []; movers = []; deco = []; fill(0, 19, 13, 14, "#"); genX = 20; generate(); addDeco(4, 19, 0);
  banner = 160; levelStart = 0;
}
function shiftWorld() {
  const S = 100, dx = S * T;
  for (const row of map) { row.splice(0, S); for (let k = 0; k < S; k++) row.push(" "); }
  distOff += S; genX -= S; cam -= dx;
  for (const p of players) { p.x -= dx; p.safe.x -= dx; p.onMover = null; }
  zombies = zombies.filter((z) => { z.x -= dx; if (z.bx !== undefined) z.bx -= dx; return z.x > -80; });
  items = items.filter((it) => (it.x -= dx) > -20); shots = []; for (const q of parts) q.x -= dx;
  movers = []; falling = []; regrow = []; crumble = {};
  deco = deco.map(([x, y, k]) => [x - S, y, k]).filter((q) => q[0] >= 0);
  const th = THEMES[ENDLESS_THEMES[Math.floor(distOff / 400) % ENDLESS_THEMES.length]];
  if (th !== TH) { TH = th; cache = {}; say(`${meters()} metros: ¡cambia el mundo!`); }
  generate();
}
function newGame(i) { track("nivel_inicio", { nivel: i === NL ? "infinito" : i + 1, dificultad: ["facil", "normal", "dificil"][CFG.diff], online: net.peer ? 1 : 0, heroe: hero }); runId = Date.now(); upgrades = {}; players = []; nPlayers = net.peer ? 2 : 1; score = 0; lives = DLIVES[CFG.diff]; brains = 0; if (i === NL) startEndless(); else loadLevel(i); mode = "play"; }
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
      if (players.includes(o) && map[ty][x] === "^") { // resorte
        o.vy = -8.3; o.jumps = 1; o.springT = 10; beep(260, .25, "triangle", 900); burst(o.x + 5, o.y + 14, "#ffd060", 6); return;
      }
      o.ground = true;
    } else {
      o.y = (ty + 1) * T;
      const blk = map[ty][x];
      if (players.includes(o) && net.role !== "guest" && (blk === "?" || blk === "S" || blk === "O")) {
        const kind = { "?": "brain", S: "syringe", O: "shield" }[blk]; map[ty][x] = "u";
        items.push({ x: x * T + 4, y: ty * T - 10, w: 8, h: 8, got: false, kind });
        beep(kind === "brain" ? 520 : 700, .08, "square"); burst(x * T + 8, ty * T, { brain: "#f2c94c", syringe: "#ff5a3a", shield: "#7fd8ff" }[kind], kind === "brain" ? 5 : 10);
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
  if (net.quiet) return;
  if (net.rec) net.rec.push([0, f, d, type, f2, delay]);
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
  const want = !musicOn || mode === "over" ? null : mode === "title" ? TITLE_SONG : arenaLocked && !bossDead ? BOSS_SONG : SONGS[levelIdx % SONGS.length];
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
const say = (t) => { msg = t; msgT = 120; if (net.rec) net.rec.push([2, t]); };
function burst(x, y, col, n = 8, sp = 3) { if (net.quiet) return; if (net.rec) net.rec.push([1, Math.round(x), Math.round(y), col, n, sp]); for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * sp, vy: -Math.random() * sp - .5, life: 30 + Math.random() * 20, col }); }
// Jeringa: modo bestia. Más grande y musculoso, corre más rápido y el rayo pega más fuerte.
// Una segunda jeringa da el modo bestia x2 (el doble de grande). Cada golpe te baja un nivel de poder en vez de sacarte una vida;
// perder una vida te deja normal. Se mantiene entre niveles.
const MAXT = 5; // niveles del modo bestia
const TIERS = [{ w: 10, h: 14 }, { w: 12, h: 18 }, { w: 14, h: 22 }, { w: 16, h: 26 }, { w: 18, h: 30 }, { w: 20, h: 34 }].map((t) => ({ ...t, sc: t.h / 14 }));
const BCOL = ["#ff7a2a", "#ff7a2a", "#ff5a2a", "#ff3a3a", "#ff2a8a", "#c03aff"];
const TIER = { acc: [1, 1.1, 1.2, 1.3, 1.4, 1.5], max: [1.9, 2.4, 2.6, 2.8, 3.0, 3.2], beam: [14, 18, 20, 22, 24, 26], cd: [40, 18, 15, 12, 10, 8], eye: [4, 5, 6, 7, 8, 9], reach: [160, 250, 310, 370, 430, 500], th: [3, 6, 8, 10, 12, 14], dmg: [1, 3, 4, 5, 6, 8] };
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
const vibe = (p) => { if (net.rec) net.rec.push([3, p, pi]); if (vibeOn && canVibe && (!net.peer || pi === me())) try { navigator.vibrate(p); } catch {} };
function toggleVibe() { vibeOn = !vibeOn; try { localStorage.setItem("zombilandia-vibra", vibeOn ? "1" : "0"); } catch {} const b = document.getElementById("vib"); if (b) b.style.opacity = vibeOn ? 1 : .4; vibe(40); }
function powerUp() {
  vibe([30, 40, 60]);
  const p = player; p.want = Math.min(MAXT, Math.max(p.tier, p.want) + 1); p.growing = true; p.power = 1;
  say(p.want === MAXT ? "¡BESTIA MÁXIMA!" : p.want === 1 ? "¡MODO BESTIA!" : `¡BESTIA NIVEL ${p.want}!`); shake = 4 + p.want * 3;
  [196, 262, 330, 392, 523, 659].forEach((f, i) => beep(f / (1 + p.want * .35), .12, "square", 0, i * .06)); if (p.want > 1) beep(80 / p.want, .8, "sawtooth", 110);
}
function tryGrow() { // crece de a un nivel, solo si hay lugar (por ejemplo, no debajo de un techo bajo)
  const p = player;
  if (p.tier >= p.want) { p.growing = false; return; }
  if (!fits(p.tier + 1)) return;
  setTier(p.tier + 1); if (p.tier >= 3) unlock("bestia3"); if (p.tier >= 5) unlock("titan"); burst(p.x + p.w / 2, p.y + p.h / 2, BCOL[p.tier], 16 + p.tier * 6, 4 + p.tier);
  if (p.tier >= p.want) p.growing = false;
}
function shrink(to = 0) {
  const p = player; if (p.tier > to) setTier(to);
  Object.assign(p, { want: to, growing: false, power: to > 0 ? 1 : 0 }); beep(500, .3, "triangle", 150);
}
function gameOver() { track("game_over", { nivel: endless ? "infinito" : levelIdx + 1, puntos: score, jefe: bossCheck && bossCheck.level === levelIdx ? 1 : 0 });  if (endless && meters() >= 500) unlock("maraton"); if (endless && meters() > endBest) { endBest = meters(); try { localStorage.setItem("zombilandia-infinito", endBest); } catch {} } mode = "over"; for (const q of players) q.dead = 1; beep(200, .6, "sawtooth", 40); recordScore(); }
function hurt(src) {
  if (player.inv <= 0 && !player.dead) vibe(70);
  const p = player; if (p.inv > 0 || p.dead) return;
  damaged = true;
  if (p.shield) { // el escudo se rompe primero
    p.shield = false; p.inv = 70; p.vy = -3.5; p.vx = src ? (Math.sign(p.x - src.x) || -p.face) * 2.5 : -p.face * 2;
    burst(p.x + p.w / 2, p.y + p.h / 2, "#bfefff", 16, 4); beep(900, .25, "triangle", 200); say("¡Se rompió el escudo!"); return;
  }
  const lvl = Math.max(p.tier, p.want);
  if (lvl > 0) { shrink(lvl - 1); shake = 8; p.inv = 100; p.vy = -4; p.vx = src ? (Math.sign(p.x - src.x) || -p.face) * 3 : -p.face * 2; say(lvl === 1 ? "¡Perdiste el poder!" : `¡Bajaste a bestia ${lvl - 1}!`); return; }
  lives--; shake = 8; beep(180, .25, "sawtooth", 60);
  if (lives <= 0) return gameOver();
  p.inv = 100; p.vy = -4.5; p.vx = src ? (Math.sign(p.x + p.w / 2 - src.x - src.w / 2) || -p.face) * (src.type && ZT[src.type]?.boss ? 4 : 2.5) : -p.face * 2;
}
function loseLife(col = "#fff") {
  const p = player; vibe([60, 40, 140]); damaged = true; shrink(); p.shield = false; lives--; shake = 10; beep(150, .4, "sawtooth", 50); burst(p.x + 5, p.y + 8, col, 14);
  if (lives <= 0) return gameOver();
  Object.assign(p, { x: p.safe.x, y: p.safe.y - 2, vx: 0, vy: 0, inv: 90 });
}
function damage(z, n) {
  if (z.type === "doctor" && z.glass > 0) { // el vidrio protege al doctor: primero hay que romperlo
    z.glass -= n; z.flash = 8; beep(1400, .08, "square", 900); burst(z.x + 9, z.y + 10, "#cfefff", 8);
    if (z.glass <= 0) { z.glass = 0; z.glassT = 480; burst(z.x + 9, z.y + 10, "#cfefff", 24, 5); beep(1800, .3, "sawtooth", 200); say("¡Rompiste el vidrio!"); }
    return;
  }
  z.hp -= n; z.flash = 12; burst(z.x + z.w / 2, z.y + z.h / 2, "#bff8ff", 5);
  if (z.hp > 0) { beep(320, .08, "square", 160); if (isBoss(z)) shake = 4; return; }
  z.dead = 1; addKill(); if (isBoss(z)) unlock("rey"); score += ZT[z.type].pts; burst(z.x + z.w / 2, z.y + z.h / 2, "#7fbf5a", isBoss(z) ? 50 : 10, isBoss(z) ? 6 : 3); beep(220, .15, "square", 90);
  if (isBoss(z)) { track("jefe_derrotado", { jefe: z.type, nivel: levelIdx + 1 }); bossDead = true; shake = 40; say(`¡Derrotaste ${deA(BOSS_NAME[z.type])}!`); vibe([80, 60, 160]); fanfare(); for (const m of zombies) if (!m.dead) { m.dead = 1; burst(m.x + 6, m.y + 6, "#7fbf5a", 8); } }
}
// Jefes intermedios: cada uno con su forma de atacar
function bossAI(z, p, dx) {
  const dir = Math.sign(dx) || 1, angry = z.hp <= ZT[z.type].hp / 2;
  if (z.type === "digger") { // camina hacia vos y tira lápidas en arco
    z.vx = Math.abs(dx) > 20 ? dir * (angry ? .7 : .45) : 0;
    if (z.t % (angry ? 100 : 150) === 0) { shots.push({ x: z.x + 11, y: z.y + 4, vx: Math.max(-3.5, Math.min(3.5, dx / 50)), vy: -4.4, g: .18, r: 5, col: "#8a8a9a", kind: "tomb", life: 300 }); beep(200, .2, "square", 90); }
    if (z.ground && z.t % 230 === 0) z.vy = -5.5;
  } else if (z.type === "fireman") { // se mantiene a distancia y tira chorros de fuego
    const want = 130; z.vx = Math.abs(dx) < want - 20 ? -dir * .7 : Math.abs(dx) > want + 40 ? dir * .7 : 0; z.face = dir;
    const c = z.t % (angry ? 150 : 200);
    if (c > 120 && z.t % 3 === 0) shots.push({ x: z.x + (dir > 0 ? 22 : 0), y: z.y + 14, vx: dir * (3.6 + Math.random()), vy: -.8 - Math.random() * .8, g: .05, r: 3, col: Math.random() > .5 ? "#ff8a2a" : "#ffd060", kind: "fire", life: 55 });
    if (c === 121) beep(120, .6, "sawtooth", 300);
    if (z.ground && z.t % 170 === 0) z.vy = -5;
  } else if (z.type === "toad") { // saltos grandes hacia vos; al caer escupe burbujas
    if (z.ground) { z.vx = 0; if (z.t % (angry ? 65 : 90) === 0) { z.vy = -6.6; z.vx = dir * 2.2; beep(160, .25, "sine", 320); } }
  } else if (z.type === "doctor") { // se aleja, se protege con vidrio y crea clones
    z.vx = Math.abs(dx) < 140 ? -dir * .5 : Math.abs(dx) > 220 ? dir * .4 : 0; z.face = dir;
    if (z.glass === undefined) z.glass = 3;
    if (z.glass === 0 && --z.glassT <= 0) { z.glass = 3; beep(900, .3, "triangle", 1400); say("El doctor rearmó el vidrio"); }
    if (z.t % (angry ? 160 : 220) === 0 && zombies.filter((m) => m.minion && !m.dead).length < 3) { const m = makeZombie(z.x + 4, z.y + 10, "walker", z.t); m.minion = true; m.clone = true; zombies.push(m); beep(500, .3, "sine", 1000); burst(z.x + 9, z.y + 14, "#7affd0", 10); }
  }
}
function touchZombie(z) { // pisar al zombi lo daña; tocarlo de costado te daña a vos (a cada jugador por separado)
  for (let i = 0; i < players.length && !z.dead; i++) {
    const p = players[i]; if (p.dead || !hit(p, z)) continue;
    ctx(i);
    if (p.vy > 0.5 && p.y + p.h - z.y < (z.type === "bat" ? 8 : 10)) { damage(z, 1 + p.tier); p.vy = K.jump ? -5.8 : -3.8; p.jumps = 1; }
    else hurt(z);
  }
}
function updateZombie(z) {
  if (z.dead) { z.dead++; return; }
  let p = players[0]; for (const q of players) if (!q.dead && Math.abs(q.x - z.x) < Math.abs(p.x - z.x)) p = q; // va hacia el jugador más cercano
  const dx = p.x - z.x, boss = isBoss(z);
  if (boss ? !arenaLocked : Math.abs(dx) > 280) return; // solo se mueven cerca (el jefe, cuando se cierra la arena)
  z.t++; if (z.flash) z.flash--;
  if (z.frozen > 0) { // congelado: solo cae, no ataca; al final se descongela
    if (--z.frozen === 0) { burst(z.x + z.w / 2, z.y + z.h / 2, "#cfe8ff", 8); beep(700, .1, "triangle", 300); }
    z.vy = Math.min(z.vy + .28, 7); collideY(z);
    if (z.y > ROWS * T + 30 || touching(z, "~", 4)) { z.dead = 1; }
    return;
  }
  if (z.type === "exploder") {
    if (z.fuse) {
      z.vx = 0; if (z.fuse % 8 === 0) beep(900 + (45 - z.fuse) * 12, .05, "square", 0);
      if (--z.fuse === 0) { // explota: lastima a quien esté cerca, incluso a otros zombis
        z.dead = 1; shake = 16; vibe([60, 40, 120]); burst(z.x + 6, z.y + 7, "#ff9a30", 26, 5); burst(z.x + 6, z.y + 7, "#ffe080", 14, 3); beep(70, .5, "sawtooth", 40);
        for (let i = 0; i < players.length; i++) { const q = players[i]; if (!q.dead && Math.hypot(q.x + q.w / 2 - z.x - 6, q.y + q.h / 2 - z.y - 7) < 36) { ctx(i); hurt(z); } } ctx(0);
        for (const m of zombies) if (m !== z && !m.dead && Math.hypot(m.x - z.x, m.y - z.y) < 40) damage(m, 2);
        return;
      }
    } else if (Math.abs(dx) < 26 && Math.abs(p.y - z.y) < 30) { z.fuse = 45; beep(1200, .08, "square", 0); }
    else if (Math.abs(dx) < 170 && Math.abs(p.y - z.y) < 40) z.vx = (Math.sign(dx) || 1) * 1.1;
  }
  if (z.type === "runner" && Math.abs(dx) < 150 && Math.abs(p.y - z.y) < 40) z.vx = (Math.sign(dx) || 1) * 1.3;
  if (z.type === "jumper" && z.ground && z.t % 90 === 0) { z.vy = -4.8; z.vx = Math.abs(dx) < 160 ? Math.sign(dx) * .8 : z.vx; }
  if (z.type === "bat") { // vuela: no usa gravedad ni choca con el piso
    const near = Math.abs(dx) < 150 && p.y > z.by - 30;
    z.vx = near ? Math.sign(dx) * 1.1 || z.vx : Math.abs(z.x - z.bx) > 56 ? -Math.sign(z.x - z.bx) * .7 : z.vx;
    z.x += z.vx; z.off += ((near ? Math.min(70, p.y - z.by) : 0) - z.off) * .03; z.y = z.by + z.off + Math.sin(z.t * .08) * 10; z.step += .1;
    touchZombie(z);
    return;
  }
  if (z.type === "spitter" && Math.abs(dx) < 230 && z.t % 120 === 0) {
    shots.push({ x: z.x + 6, y: z.y + 5, vx: Math.max(-3.2, Math.min(3.2, dx / 55)), vy: -3.6, g: .15, r: 3, col: "#b6f03a", life: 240 }); beep(240, .15, "sawtooth", 120);
  }
  if (z.type === "shielder" && Math.abs(dx) < 170 && z.ground) z.vx = (Math.sign(dx) || 1) * .45;
  if (boss && z.type !== "boss") bossAI(z, p, dx);
  if (z.type === "boss") {
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
  if (boss && z.ground && !z.wasG && vyb > 3) { shake = 12; vibe(90); burst(z.x + z.w / 2, z.y + z.h, "#8a6a60", 12); if (z.type === "toad") for (const v of [-2.2, 0, 2.2]) shots.push({ x: z.x + 15, y: z.y + 4, vx: v, vy: -3.4, g: .15, r: 4, col: "#b6f03a", life: 200 }); beep(70, .3, "sawtooth", 40); }
  z.wasG = z.ground;
  if (z.y > ROWS * T + 30 || touching(z, "~", 4)) { z.dead = 1; burst(z.x + 6, z.y + 6, TH.liquid?.[0] || "#7fbf5a", 6); return; }
  touchZombie(z);
}
function movePlayer(p0) { // movimiento puro del jugador (ctx ya fijó K y TP); el invitado también lo corre para predecir su propio personaje
  if (p0.onMover) { p0.x += p0.onMover.vx; p0.y = p0.onMover.y - p0.h; }
  const wet = tileAt(p0.x + p0.w / 2, p0.y + p0.h / 2) === "W"; // nadando
  if (wet && !p0.wet) { burst(p0.x + 5, p0.y + 4, "#9ad7ff", 10); beep(300, .2, "sine", 120); }
  p0.wet = wet;
  const p = p0, acc = (p.ground ? 0.35 : 0.22) * TIER.acc[p.tier] * (wet ? .6 : 1), max = TIER.max[p.tier] * (wet ? .65 : 1);
  if (p.growing && net.role !== "guest") tryGrow();
  if (K.left) { p.vx -= acc; p.face = -1; } else if (K.right) { p.vx += acc; p.face = 1; } else p.vx *= p.ground ? (L.theme === "snow" ? 0.95 : 0.78) : 0.95; // en la nieve patina
  p.vx = Math.max(-max, Math.min(max, p.vx));
  p.coyote = p.ground ? 6 : p.coyote - 1;
  if (p.ground) p.jumps = 0; else if (p.coyote <= 0 && p.jumps === 0) p.jumps = 1; // si se cae de un borde, queda el salto de aire
  const wantJump = K.jump || TP.jump; TP.jump = false;
  if (wet) { p.jumps = 0; if (wantJump && !p.jumped) { p.vy = -3.3; p.jumped = true; burst(p.x + 5, p.y + 10, "#cfefff", 3); beep(400, .06, "sine", 600); } }
  else if (wantJump && !p.jumped) {
    if (p.coyote > 0) { p.vy = -5.1; p.jumped = true; p.coyote = 0; p.jumps = 1; beep(330, .12, "square", 660); }
    else if (p.jumps < 2) { p.vy = -4.9; p.jumped = true; p.jumps = 2; burst(p.x + 5, p.y + 14, "#9ad7ff", 8); beep(520, .12, "square", 980); } // doble salto
  }
  if (!K.jump) { p.jumped = false; if (p.vy < -2 && !p.springT) p.vy += 0.35; } // salto variable
  if (p.springT) p.springT--;
  p.vy = wet ? Math.min(p.vy + 0.1, 1.4) : Math.min(p.vy + (L.theme === "moon" ? 0.17 : 0.28), 6.5);
  const vyb = p.vy, pb = p.y + p.h; collideX(p); collideY(p);
  p.onMover = null;
  const ices = zombies.filter((z) => z.frozen > 0 && !z.dead).map((z) => ({ x: z.x, y: z.y, w: z.w, vx: 0, vy: 0, ice: true }));
  if (p.vy >= 0) for (const m of [...movers, ...ices]) if (p.x + p.w > m.x + 1 && p.x < m.x + m.w - 1 && pb <= m.y + 4 && p.y + p.h >= m.y) { p.y = m.y - p.h; p.vy = 0; p.ground = true; p.onMover = m.ice ? null : m; break; }
  if (p.ground && !p.onMover) for (const xx of [p.x + 1, p.x + p.w - 1]) { // plataformas que se derrumban
    const tx = Math.floor(xx / T), ty = Math.floor((p.y + p.h + 2) / T), k = tx + "," + ty;
    if (map[ty]?.[tx] === "F" && !(k in crumble) && net.role !== "guest") { crumble[k] = 28; beep(180, .1, "square", 120); }
  }
  if (p.ground && !p.wasG && vyb > 2.5) burst(p.x + 5, p.y + 14, "#9a8a7a", 6); // polvo al caer
  if (p.ground && Math.abs(p.vx) > 1.5 && time % 9 === 0) burst(p.x + 5, p.y + 14, "#6a5a4a", 1);
  p.wasG = p.ground;
  if (p.x < 0) p.x = 0;
  if (p.ground && time % 15 === 0 && !touching(p, "x", 0) && solid(Math.floor((p.x + 1) / T), Math.floor((p.y + p.h + 2) / T)) && solid(Math.floor((p.x + p.w - 1) / T), Math.floor((p.y + p.h + 2) / T))) p.safe = { x: p.x, y: p.y };
}
function stepPlayer(i) {
  ctx(i);
  const p = player, wasG = p.ground, pvy = p.vy;
  movePlayer(p);
  if (p.ground && !wasG && pvy > 2.2) burst(p.x + p.w / 2, p.y + p.h, "#c8b8a0", 6 + Math.min(8, pvy | 0), 1.6); // polvo al aterrizar
  else if (p.ground && Math.abs(p.vx) > 1.6 && time % 7 === 0) burst(p.x + p.w / 2 - p.face * 4, p.y + p.h, "#b8a890", 2, .8);
  // rayo láser de ojos: se dispara al apretar, con recarga
  if (p.cd > 0) p.cd--;
  if ((TP.fire || K.fire && !p.firePrev) && p.cd <= 0) {
    const t = p.tier; p.beamTier = t; p.beamBig = t > 0; p.beam = TIER.beam[t]; p.cd = TIER.cd[t]; p.beamDir = p.face; p.shot++; shake = [3, 5, 7, 9, 11, 13][t]; if (t) vibe(20 + 10 * t);
    beep([140, 100, 85, 70, 60, 50][t], [.25, .35, .4, .45, .5, .55][t], "sawtooth", [900, 700, 600, 500, 420, 360][t]); if (t) beep(60 / t, .4, "square", 30);
  }
  p.firePrev = K.fire; TP.fire = false;
  if (p.beam > 0) {
    p.beam--;
    const d = p.beamDir, x0 = d > 0 ? p.x + p.w : p.x, y = p.y + TIER.eye[p.tier], reach = TIER.reach[p.beamTier] + (upgrades.longRay ? 90 : 0), th = TIER.th[p.beamTier]; let len = 0;
    while (len < reach && !solid(Math.floor((x0 + d * len) / T), Math.floor(y / T))) len += 2;
    p.ray = { x: d > 0 ? x0 : x0 - len, y: y - (th >> 1), w: len, h: th };
    if (time % 2 === 0) burst(x0 + d * len, y, p.hero === 1 ? "#e8f6ff" : ["#bff8ff", "#ffd84a", "#ffb04a", "#ff7a4a", "#ff6aa0", "#ff9ae8"][p.beamTier], 2 + p.beamTier * 2);
    const zone = { x: p.ray.x, y: p.ray.y, w: p.ray.w, h: p.ray.h + [0, 6, 10, 14, 18, 22][p.beamTier] }; // de grande el rayo también alcanza a los zombis chicos
    p.zone = zone;
    for (const z of zombies) if (!z.dead && z.shot !== p.shot && hit(zone, z)) {
      z.shot = p.shot;
      if (z.type === "shielder" && !z.broken && d === -(Math.sign(z.vx) || 1)) { // de frente, el escudo frena el rayo
        if (p.beamTier < 2) { burst(z.x + (d > 0 ? 0 : 12), z.y + 7, "#e8eef5", 8); beep(1200, .06, "square"); continue; }
        z.broken = true; burst(z.x + 6, z.y + 7, "#9aa4b4", 12);
      }
      if (p.hero === 1 && !isBoss(z) && !z.frozen && p.beamTier === 0 && z.type !== "bat") { // hielo: primero congela
        z.frozen = 240; z.vx = z.vx || .4; burst(z.x + z.w / 2, z.y + z.h / 2, "#cfe8ff", 10); beep(1500, .15, "triangle", 2400); continue;
      }
      if (z.frozen) { z.frozen = 0; burst(z.x + z.w / 2, z.y + z.h / 2, "#e8f6ff", 16, 4); beep(1800, .12, "square", 400); } // se rompe en pedazos
      damage(z, TIER.dmg[p.beamTier]);
    }
  } else { p.ray = null; p.zone = null; }
  if (p.ground && Math.abs(p.vx) > .3) p.step += Math.abs(p.vx) * .12;
  if (p.inv > 0) p.inv--;
  if (touching(p, "x", 2)) { if (p.vy >= 0) p.vy = -4.5; hurt(null); }
  if (p.y > ROWS * T + 20) loseLife();
  else if (touching(p, "~", 4)) loseLife(TH.liquid[0]);
}
function update() {
  time++;
  if (banner) banner--;
  if (shopMsgT) shopMsgT--;
  if (mode === "edit") { edCam = Math.max(0, Math.min(EDW * T - W + 32, edCam + (keys.right ? 5 : 0) - (keys.left ? 5 : 0))); return; }
  if (mode !== "play") return;
  levelTime++;
  for (const m of movers) { // plataformas móviles: van y vienen
    m.t += m.sp; const k = (1 - Math.cos(m.t)) / 2, nx = m.x0 + m.dx * k, ny = m.y0 + m.dy * k; m.vx = nx - m.x; m.vy = ny - m.y; m.x = nx; m.y = ny;
  }
  for (let i = 0; i < players.length; i++) { stepPlayer(i); if (mode !== "play") { ctx(0); return; } }
  if (mode !== "play") return;
  for (const k in crumble) if (--crumble[k] <= 0) { // plataformas que se derrumban (una vez por cuadro, no por jugador)
    const [tx, ty] = k.split(",").map(Number); map[ty][tx] = " "; delete crumble[k];
    falling.push({ x: tx * T, y: ty * T, vy: 0 }); regrow.push({ tx, ty, t: 300 }); burst(tx * T + 8, ty * T + 8, TH.plat[0], 6);
  }
  for (const f of falling) { f.vy += .3; f.y += f.vy; }
  falling = falling.filter((f) => f.y < H + 20);
  for (const r of regrow) if (--r.t <= 0 && !players.some((q) => hit(q, { x: r.tx * T, y: r.ty * T, w: T, h: T }))) map[r.ty][r.tx] = "F";
  regrow = regrow.filter((r) => r.t > 0 || map[r.ty][r.tx] !== "F");
  if (arena && !arenaLocked && players.some((q) => q.x > arena.lock * T)) { // se cierra la arena del jefe
    const lead = players.reduce((a, b) => (b.x > a.x ? b : a));
    for (const q of players) if (q.x < arena.wall * T + 6) { q.x = lead.x - 12; q.y = lead.y; q.vx = q.vy = 0; q.inv = 60; q.safe = { x: q.x, y: q.y }; } // el compañero que quedó afuera entra
    const b = zombies.find(isBoss); lockArena(); say(`¡Apareció ${b ? BOSS_NAME[b.type] : "el jefe"}!`); bossCheck = { score, brains, level: levelIdx };
  }
  if (players.length > 1) { // si uno se queda muy atrás, el otro lo trae
    const lead = players.reduce((a, b) => (b.x > a.x ? b : a));
    for (const q of players) {
      q.far = lead.x - q.x > 360 && !q.dead ? (q.far || 0) + 1 : 0;
      if (q.far > 150) { q.far = 0; q.x = lead.x - 14; q.y = lead.y; q.vx = q.vy = 0; q.inv = 60; q.onMover = null; burst(q.x + 5, q.y + 7, "#9ad7ff", 14); beep(700, .2, "triangle", 1200); }
    }
  }
  for (let i = 0; i < zombies.length; i++) updateZombie(zombies[i]);
  for (const s of shots) { // ácido de los escupidores
    s.vy += s.g; s.x += s.vx; s.y += s.vy; s.life--;
    const box = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
    if (solid(Math.floor(s.x / T), Math.floor(s.y / T)) || s.y > ROWS * T) { s.life = 0; burst(s.x, s.y, s.col, 5); }
    else if (players.some((q) => q.zone && hit(box, q.zone))) { s.life = 0; burst(s.x, s.y, "#bff8ff", 5); }
    else { const k = players.findIndex((q) => !q.dead && hit(box, q)); if (k >= 0) { s.life = 0; burst(s.x, s.y, s.col, 6); ctx(k); hurt({ x: s.x, w: 0, type: "shot" }); } }
    if (s.life <= 0 && s.kind === "tomb") burst(s.x, s.y, "#8a8a9a", 8);
  }
  shots = shots.filter((s) => s.life > 0);
  if (mode !== "play") return;
  for (let k = 0; k < players.length; k++) {
    ctx(k); const p = player;
    for (const it of items) if (!it.got && hit(p, it)) {
      it.got = true;
      if (it.kind === "syringe") powerUp();
      else if (it.kind === "shield") { p.shield = true; say("¡Escudo!"); beep(440, .3, "triangle", 880); vibe(40); }
      else { brains++; gotBrains++; score += 10; beep(880, .08, "triangle", 1320); }
    }
  }
  if (players.some((q) => q.x > goalX * T) && (!arena || bossDead)) {
    score += lives * 100 + 500; fanfare();
    if (L.custom) { mode = "cwin"; recordScore(); } else { finishLevel(); mode = levelIdx === LEVELS.length - 1 ? "won" : "clear"; }
    if (mode === "won") { recordScore(); track("juego_terminado", { puntos: score }); }
  }
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += .15; q.life--; }
  parts = parts.filter((q) => q.life > 0);
  if (endless && players.some((q) => q.x > 140 * T)) shiftWorld();
  cam = Math.max(0, Math.min(COLS * T - W, players[0].x - W / 2 + 20));
  if (shake) shake--;
  if (msgT) msgT--;
  ctx(0);
}

// ---------- Dibujo ----------
const R = (x, y, w, h, c) => { g.fillStyle = c; const x0 = Math.round(x * SC) / SC, y0 = Math.round(y * SC) / SC; g.fillRect(x0, y0, Math.round((x + w) * SC) / SC - x0, Math.round((y + h) * SC) / SC - y0); };
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
Object.assign(MID, {
  peaks() {
    layer(.3, 170, (x, i) => {
      const h = 80 + Math.round(rnd(i) * 60), w = 120 + Math.round(rnd(i + 3) * 50), b = 212, px = x + w * .45;
      g.fillStyle = "#26345a"; g.beginPath(); g.moveTo(x, b); g.lineTo(px, b - h); g.lineTo(x + w * .62, b - h + 12); g.lineTo(x + w, b); g.fill();
      g.fillStyle = "#1a2444"; g.beginPath(); g.moveTo(px, b - h); g.lineTo(x + w * .62, b - h + 12); g.lineTo(x + w, b); g.lineTo(x + w * .55, b); g.fill();
      g.fillStyle = "#e4eeff"; g.beginPath(); g.moveTo(px, b - h); g.lineTo(px - 14, b - h + 24); g.lineTo(px - 6, b - h + 20); g.lineTo(px + 2, b - h + 30); g.lineTo(px + 10, b - h + 18); g.lineTo(x + w * .62, b - h + 12); g.fill();
    });
  },
  dunes() {
    const sx = Math.round(W * .72 - cam * .03); glow(sx, 120, 90, "#ffd070", .5); g.fillStyle = "#ffe8a0"; g.beginPath(); g.arc(sx, 120, 24, 0, 7); g.fill();
    layer(.22, 280, (x, i) => { const w = 110 + Math.round(rnd(i) * 40), h = 60 + Math.round(rnd(i + 1) * 30); g.fillStyle = "#7a2a3a"; g.beginPath(); g.moveTo(x, 205); g.lineTo(x + w / 2, 205 - h); g.lineTo(x + w, 205); g.fill(); g.fillStyle = "#5a1c2c"; g.beginPath(); g.moveTo(x + w / 2, 205 - h); g.lineTo(x + w, 205); g.lineTo(x + w * .55, 205); g.fill(); });
    layer(.4, 150, (x, i) => { g.fillStyle = "#5a2030"; g.beginPath(); g.ellipse(x + 60, 214, 100, 26 + rnd(i) * 16, 0, Math.PI, 0); g.fill(); });
  },
  jungle() {
    layer(.3, 96, (x, i) => {
      const col = "#04180f", tx = x + Math.round(rnd(i) * 40), th = 90 + Math.round(rnd(i + 2) * 50), b = 212;
      R(tx, b - th, 9, th, col); g.fillStyle = col; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(tx + 4 + (k - 2.5) * 12, b - th + (k % 3) * 6, 18, 12, 0, 0, 7); g.fill(); }
      for (let k = 0; k < 6; k++) R(tx - 22 + k * 9 + Math.round(Math.sin(time * .03 + k + i) * 1.5), b - th + 8, 1, 22 + ((k * 11 + i) % 26), "#0a2a1a");
    });
  },
  ferris() {
    const cx = Math.round(W * .5 - cam * .08), cy = 118, r = 62, a0 = time * .004;
    g.strokeStyle = "#2a0c3e"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, r * .55, 0, 7); g.stroke();
    for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4, bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r; g.beginPath(); g.moveTo(cx, cy); g.lineTo(bx, by); g.stroke(); R(bx - 5, by, 10, 8, k % 2 ? "#6a1a5a" : "#8a2a3a"); R(bx - 5, by, 10, 2, "#2a0c3e"); }
    g.beginPath(); g.moveTo(cx - 26, 212); g.lineTo(cx, cy); g.lineTo(cx + 26, 212); g.stroke();
    layer(.35, 200, (x, i) => { g.fillStyle = "#240a38"; g.beginPath(); g.moveTo(x, 205); g.lineTo(x + 20, 160); g.lineTo(x + 44, 205); g.fill(); R(x + 6, 188, 32, 17, "#240a38"); R(x + 20, 150, 1, 10, "#240a38"); R(x + 21, 150, 8, 5, i % 2 ? "#ff5a8a" : "#ffcc33"); });
  },
  lunar() {
    layer(.25, 200, (x, i) => { const w = 70 + Math.round(rnd(i) * 50), h = 20 + Math.round(rnd(i + 1) * 20); g.fillStyle = "#0e1028"; g.beginPath(); g.ellipse(x + w / 2, 210, w, h, 0, Math.PI, 0); g.fill(); });
    layer(.4, 300, (x, i) => { if (rnd(i + 4) > .35) { g.fillStyle = "#121438"; g.beginPath(); g.ellipse(x + 30, 206, 24, 22, 0, Math.PI, 0); g.fill(); R(x + 6, 206, 48, 6, "#121438"); R(x + 28, 168, 1, 14, "#121438"); R(x + 26, 166, 5, 3, Math.sin(time * .08 + i) > 0 ? "#ff4a4a" : "#5a1a1a"); } });
  },
});
Object.assign(NEAR, {
  pines() {
    layer(.6, 60, (x, i) => {
      const col = "#0a1426", h = 40 + Math.round(rnd(i) * 40), b = 214, cx = x + 10 + Math.round(rnd(i + 3) * 20);
      g.fillStyle = col; for (let k = 0; k < 4; k++) { const y0 = b - h + k * (h / 4.5), w = 8 + k * 5; g.beginPath(); g.moveTo(cx, y0 - 6); g.lineTo(cx + w, y0 + h / 4.2); g.lineTo(cx - w, y0 + h / 4.2); g.fill(); } R(cx - 1, b - 8, 3, 8, col);
    });
  },
  cacti() {
    layer(.6, 90, (x, i) => {
      const col = "#2a0c1c", h = 30 + Math.round(rnd(i) * 26), cx = x + 20 + Math.round(rnd(i + 2) * 30), b = 214;
      if (rnd(i + 5) > .3) { R(cx, b - h, 6, h, col); R(cx - 8, b - h * .6, 4, 10, col); R(cx - 8, b - h * .6 + 8, 12, 3, col); R(cx + 10, b - h * .75, 4, 10, col); R(cx + 5, b - h * .75 + 8, 9, 3, col); }
      R(x + 60, 208, 14, 6, col); R(x + 62, 204, 10, 4, col);
    });
  },
  ferns() {
    layer(.65, 56, (x, i) => {
      for (let k = 0; k < 3; k++) { const bx = x + k * 14 + 4, h = 18 + Math.round(rnd(i * 3 + k) * 18); g.strokeStyle = "#021008"; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, 214); g.quadraticCurveTo(bx + Math.sin(time * .03 + k + i) * 2 + (k - 1) * 8, 214 - h * .6, bx + (k - 1) * 14, 214 - h); g.stroke(); }
    });
  },
  lights() {
    layer(.6, 110, (x, i) => {
      const col = "#12031e"; R(x, 150, 2, 64, col); R(x + 108, 150, 2, 64, col);
      g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1, 152); g.quadraticCurveTo(x + 55, 172, x + 109, 152); g.stroke();
      for (let k = 0; k < 7; k++) { const t = (k + .5) / 7, bx = x + 1 + t * 108, by = 152 + Math.sin(t * Math.PI) * 14, on = Math.sin(time * .1 + k + i) > -.5; glow(bx, by + 2, 7, ["#ff5a8a", "#ffcc33", "#5ae0ff"][k % 3], on ? .55 : .12); }
      R(x + 40, 196, 30, 18, col); R(x + 44, 188, 22, 8, col);
    });
  },
  rocks() {
    layer(.6, 120, (x, i) => { const col = "#0a0b22", w = 20 + Math.round(rnd(i) * 26); g.fillStyle = col; g.beginPath(); g.ellipse(x + 40, 214, w, 12 + rnd(i + 1) * 10, 0, Math.PI, 0); g.fill(); if (rnd(i + 3) > .6) { R(x + 90, 176, 1, 38, col); R(x + 84, 174, 13, 3, col); R(x + 92, 168, 1, 7, col); } });
  },
});
Object.assign(AMB, {
  snow() { for (let i = 0; i < 60; i++) { const y = (rnd(i + 3) * H + time * (.5 + rnd(i) * .6)) % H, x = ((rnd(i) * W + Math.sin(time * .02 + i) * 14 - cam * .5 - time * .15) % W + W) % W; g.globalAlpha = .55 + rnd(i + 9) * .4; R(x, y, 1 + (i % 3 === 0), 1 + (i % 3 === 0), "#f4faff"); } g.globalAlpha = 1; },
  sand() { for (let i = 0; i < 40; i++) { const y = 20 + rnd(i + 3) * 190, x = ((rnd(i) * W * 1.5 - time * (1.2 + rnd(i + 1) * 1.4) - cam * .4) % W + W) % W; g.globalAlpha = .22 + rnd(i + 5) * .2; R(x, y, 6 + (i % 5) * 3, 1, "#ffe0a0"); } g.globalAlpha = 1; },
  spores() { for (let i = 0; i < 34; i++) { const x = ((rnd(i) * W * 2 - cam * .7 + Math.sin(time * .01 + i) * 20) % W + W) % W, y = 40 + ((rnd(i + 1) * 170 - time * (.15 + rnd(i + 4) * .25)) % 170 + 170) % 170, a = (Math.sin(time * .05 + i * 3) + 1) / 2; glow(x, y, 6, i % 3 ? "#9aff6a" : "#ff9ae8", a * .5); R(x, y, 1, 1, "#f0ffd0"); } },
  confetti() { for (let i = 0; i < 46; i++) { const y = (rnd(i + 3) * H + time * (.4 + rnd(i) * .5)) % H, x = ((rnd(i) * W + Math.sin(time * .04 + i) * 10 - cam * .4) % W + W) % W; g.globalAlpha = .8; R(x, y, 2, 2, ["#ff5a8a", "#ffcc33", "#5ae0ff", "#9aff6a"][i % 4]); } g.globalAlpha = 1; },
  stardust() { for (let i = 0; i < 30; i++) { const x = ((rnd(i) * W - cam * .5) % W + W) % W, y = 30 + rnd(i + 1) * 170, a = (Math.sin(time * .06 + i * 2) + 1) / 2; g.globalAlpha = a * .8; R(x, y, 1, 1, "#cfe0ff"); } g.globalAlpha = 1; },
});
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
  const c = tex("d" + k, T, T + 4, (cx) => { cx.translate(0, 4); decoArt(cx, k, T, L.theme); });
  g.drawImage(c, x, y - 4, T, T + 4);
  if (k === "torch") { // llama animada con resplandor
    const fl = Math.sin(time * .4 + x) * .5, cx = x + 8, cy = y + 3;
    glow(cx, cy, 20, "#ff8a1a", .4 + fl * .12);
    g.save(); g.translate(cx, cy + 3);
    g.beginPath(); g.moveTo(-2.6, 0); g.quadraticCurveTo(-3.2, -3.6 - fl, 0, -7 - fl * 2); g.quadraticCurveTo(3.2, -3.6, 2.6, 0); g.closePath(); g.fillStyle = vgrad(g, -7, 0, [[0, "#ffd060"], [1, "#ff6a10"]]); g.fill();
    g.beginPath(); g.moveTo(-1.2, 0); g.quadraticCurveTo(-1.4, -2, 0, -4 - fl); g.quadraticCurveTo(1.4, -2, 1.2, 0); g.closePath(); g.fillStyle = "#fff0b0"; g.fill(); g.restore();
  } else if (k === "lamp") glow(x + 8, y + 3, 14, "#ffd060", .45 + Math.sin(time * .1 + x) * .1);
  else if (k === "antenna") glow(x + 8, y + 2, 7, "#ff4040", Math.sin(time * .1 + x) > 0 ? .6 : .1);
  else if (k === "mushroom") glow(x + 8, y + 8, 14, "#c07aff", .25 + Math.sin(time * .05 + x) * .1);
  else if (k === "tank") { glow(x + 8, y + 10, 12, "#c6ff3a", .22 + Math.sin(time * .1 + x) * .08); const bt = (time + x * 3) % 50; g.globalAlpha = .7; R(x + 7 + (x % 3), y + 14 - bt * .2, 1, 1, "#e8ffa0"); g.globalAlpha = 1; }
}
function drawGroundOld(px, py, x, y, r) {
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
function drawPlatOld(px, py, x, y, r) {
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
// ---------- Texturas suaves (ver art.js) ----------
const TEX = {};
function tex(key, w, h, fn) {
  const k = key + "|" + SC + "|" + L.theme;
  let c = TEX[k]; if (c) return c;
  const [cc, x] = mk(w * SC, h * SC); x.scale(SC, SC); x.imageSmoothingEnabled = true; fn(x); return (TEX[k] = cc);
}
function drawGround(px, py, x, y, r) {
  const th = L.theme, top = map[y - 1]?.[x] !== "#", bottom = map[y + 1]?.[x] !== "#" && y < ROWS - 1, v = (r * 4) | 0, d = TH.dirt, gs = TH.grass;
  let c, oy = 0, h = T;
  if (th === "city") {
    if (top) c = tex("ct" + v, T, T, (x) => { dirtArt(x, T, v, d); const gr = x.createLinearGradient(0, 0, 0, 4); gr.addColorStop(0, gs[0]); gr.addColorStop(.6, gs[1]); gr.addColorStop(1, gs[2]); x.fillStyle = gr; x.fillRect(0, 0, T, 4); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, 0, T, .7); x.fillStyle = "rgba(0,0,0,.3)"; x.fillRect(0, 4, T, 1); });
    else { const lit = [r > .82, r > .93]; c = tex("cf" + (+lit[0]) + (+lit[1]) + v, T, T, (x) => facadeArt(x, T, v, d, lit)); }
  } else if (th === "lab") {
    const ts = top && y > 1, bs = bottom; c = tex("lb" + (+ts) + (+bs) + v, T, T, (x) => panelArt(x, T, v, d, ts, bs));
  } else if (th === "lair") {
    const lava = r > .7; c = tex("lr" + (+top) + (+lava) + v, T, T, (x) => lairStoneArt(x, T, v, [d[1], d[3], d[2]], top, lava));
  } else if (top) { oy = 6; h = T + 6; c = tex("gt" + v, T, T + 6, (x) => { x.translate(0, 6); dirtArt(x, T, v, d); grassArt(x, T, v, gs, 0, th === "swamp" || th === "jungle"); }); }
  else c = tex("gf" + v, T, T, (x) => dirtArt(x, T, v + 4, [d[1], d[2], d[2], d[3]]));
  g.drawImage(c, px, py - oy, T, h);
}
function drawPlat(px, py, x, y, r) {
  const th = L.theme, v = (r * 4) | 0, P = TH.plat;
  let c;
  if (th === "city") c = tex("pc", T, T, (x) => girderArt(x, T, 0, P));
  else if (th === "swamp" || th === "jungle") { const l = map[y]?.[x - 1] !== "=", rt = map[y]?.[x + 1] !== "="; c = tex("ps" + (+l) + (+rt) + v, T, T, (x) => plankArt(x, T, v, P, true, l, rt)); }
  else if (th === "lab" || th === "moon") c = tex("pl", T, T, (x) => gratingArt(x, T, 0, P));
  else if (th === "lair") { const lava = r > .6; c = tex("pr" + (+lava) + v, T, T, (x) => lairStoneArt(x, T, v, P, true, lava)); }
  else c = tex("pm" + v, T, T, (x) => brickArt(x, T, v, P, "#2a120c", .22));
  g.drawImage(c, px, py, T, T);
}
function drawQuestion(px, py, shine) { g.drawImage(tex("q" + (+shine), T, T, (x) => questionArt(x, T, shine)), px, py, T, T); }
function drawLiquid(px, py, x, y, r) {
  const [l1, l2] = TH.liquid, lava = L.theme === "lair", top = map[y - 1]?.[x] !== "~";
  if (top) {
    const wv = (xx) => Math.sin(time * (lava ? .05 : .09) + (x * T + xx) * .22) * 1.3 + Math.sin(time * .04 + (x * T + xx) * .11) * .8;
    g.beginPath(); g.moveTo(px, py + 20); g.lineTo(px, py + 3 + wv(0)); for (let k = 2; k <= T; k += 2) g.lineTo(px + k, py + 3 + wv(k)); g.lineTo(px + T, py + 20); g.closePath();
    g.fillStyle = vgrad(g, py + 2, py + 18, [[0, lerpHex(l1, "#ffffff", lava ? .1 : .25)], [.25, l1], [1, l2]]); g.fill();
    g.beginPath(); for (let k = 0; k <= T; k += 2) { const yy = py + 3 + wv(k); k ? g.lineTo(px + k, yy) : g.moveTo(px, yy); } g.strokeStyle = lava ? "rgba(255,240,160,.9)" : "rgba(255,255,255,.7)"; g.lineWidth = .8; g.stroke();
    if (lava) glow(px + 8, py + 1, 20, "#ff7a20", .35 + Math.sin(time * .06 + x) * .1);
    else { g.globalAlpha = .3; g.fillStyle = l1; g.fillRect(px, py - 2, T, 4); g.globalAlpha = 1; }
    const bt = (time + x * 13) % 70; if (bt < 30) { g.globalAlpha = .85 - bt / 40; g.beginPath(); g.arc(px + 4 + (x % 3) * 4, py + 14 - bt * .35, 1 + (bt % 5) * .08, 0, 7); g.strokeStyle = lava ? "#fff0a0" : "#e8fbff"; g.lineWidth = .5; g.stroke(); g.globalAlpha = 1; }
  } else {
    g.fillStyle = vgrad(g, py, py + T, [[0, l2], [1, lerpHex(l2, "#000000", .3)]]); g.fillRect(px, py, T + .5, T + .5);
    g.strokeStyle = lava ? "rgba(255,210,90,.45)" : "rgba(255,255,255,.12)"; g.lineWidth = .6; g.beginPath(); const o = (r * 6) | 0; g.moveTo(px + 1, py + 5 + o); g.quadraticCurveTo(px + 6, py + 3 + o, px + 12, py + 6 + o); g.stroke();
  }
}
function drawTiles() {
  const ox = Math.floor(cam), x0 = Math.max(0, Math.floor(cam / T)), x1 = Math.min(COLS - 1, x0 + Math.ceil(W / T) + 1);
  for (const [x, y, k] of deco) if (x >= x0 - 1 && x <= x1) drawDeco(x * T - ox, y * T, k);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const c = map[y][x]; if (c === " " || c === "c") continue;
    const px = x * T - ox, py = y * T, r = rnd(x * 7 + y);
    if (c === "#") drawGround(px, py, x, y, r);
    else if (c === "=") drawPlat(px, py, x, y, r);
    else if (c === "?" || c === "S" || c === "O") {
      const shine = (Math.floor(time / 8) + x) % 7 === 0;
      drawQuestion(px, py, shine);
    } else if (c === "F") { // plataforma que se derrumba: rajada, y tiembla antes de caer
      const j = crumble[x + "," + y] ? Math.round(Math.sin(time * 1.7 + x) * 1.5) : 0;
      drawPlat(px + j, py, x, y, r); R(px + j + 4, py + 2, 1, 5, "#00000088"); R(px + j + 5, py + 6, 1, 4, "#00000088"); R(px + j + 11, py + 4, 1, 6, "#00000088");
    } else if (c === "u") g.drawImage(tex("u", T, T, (x) => { rrect(x, .5, .5, T - 1, T - 1, 2.5); x.fillStyle = "#2c2218"; x.fill(); rrect(x, 1.2, 1.2, T - 2.4, T - 2.4, 2); const gr = x.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, "#8a7860"); gr.addColorStop(.3, "#6b5a45"); gr.addColorStop(1, "#4a3c30"); x.fillStyle = gr; x.fill(); }), px, py, T, T);
    else if (c === "~") drawLiquid(px, py, x, y, r);
    else if (c === "x") {
      R(px, py + 13, T, 3, "#3a3a44");
      for (let k = 0; k < 4; k++) { R(px + k * 4 + 1, py + 9, 2, 4, "#b8c0cc"); R(px + k * 4 + 1, py + 7, 1, 2, L.theme === "lair" ? "#ff6a4a" : "#e8eef5"); R(px + k * 4 + 2, py + 9, 1, 4, "#7a8290"); }
    } else if (c === "^") {
      const cmp = player.springT > 0 && Math.abs(player.x + 5 - (x * T + 8)) < 14 ? 4 : 0;
      R(px + 1, py + 13, 14, 3, "#5a5a66"); for (let k = 0; k < 3; k++) R(px + 3 + (k % 2) * 2, py + 7 + cmp + k * (cmp ? 2 : 2), 8, 1, "#c0c8d0");
      R(px + 1, py + 4 + cmp, 14, 3, "#e0402a"); R(px + 1, py + 4 + cmp, 14, 1, "#ff8a6a");
    }
  }
  if (!arena || bossDead) { // bandera
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
    if (it.kind === "shield") {
      g.globalAlpha = .25 + Math.sin(time * .2) * .1; g.fillStyle = "#7fd8ff"; g.beginPath(); g.arc(x + 4, y + 4, 8, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = "#bfefff"; g.lineWidth = 1.5; g.beginPath(); g.arc(x + 4, y + 4, 6, 0, 7); g.stroke(); R(x + 1, y + 1, 2, 2, "#fff"); continue;
    }
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
  else if (z.type === "spitter") { sk = "#b8c050"; skd = "#8a9030"; sh = "#5a4a2a"; }
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
  if (z.type === "spitter") { // panza hinchada y boca abierta antes de escupir
    R(x + 1, y + 8, 10, 4, "#c8d060"); R(x + 3, y + 9, 2, 1, "#e8f080");
    if (z.t % 120 > 96) { R(hx + (f > 0 ? 6 : 2), y + 4, 4, 3, "#1a1010"); R(hx + (f > 0 ? 7 : 3), y + 7, 1, 2, "#b6f03a"); }
  }
  if (z.type === "shielder") {
    if (!z.broken) { const sx = f > 0 ? x + 11 : x - 3; R(sx, y + 3, 4, 11, "#6a7486"); R(sx + 1, y + 4, 2, 9, "#9aa4b4"); R(sx + 1, y + 4, 2, 1, "#e8eef5"); R(sx + 1, y + 8, 2, 1, "#4a5466"); }
    else R(f > 0 ? x + 11 : x - 1, y + 9, 2, 3, "#6a7486");
    R(hx + 2, y - 1, 8, 2, "#4a5466"); // casco
  }
}
function drawBat(z, x, y, i) {
  const up = Math.sin(time * .4 + i) > 0, c = "#4a2a5a", d = "#2e1a3a";
  if (up) { R(x - 1, y - 2, 5, 2, d); R(x + 8, y - 2, 5, 2, d); R(x + 1, y, 3, 2, c); R(x + 8, y, 3, 2, c); }
  else { R(x - 1, y + 4, 5, 2, d); R(x + 8, y + 4, 5, 2, d); R(x + 1, y + 2, 3, 2, c); R(x + 8, y + 2, 3, 2, c); }
  R(x + 4, y + 1, 4, 6, c); R(x + 4, y, 1, 1, c); R(x + 7, y, 1, 1, c); R(x + 4, y + 2, 1, 1, "#ff3030"); R(x + 7, y + 2, 1, 1, "#ff3030"); R(x + 5, y + 5, 2, 1, "#e8e0d0"); R(x + 5, y + 6, 1, 2, "#7fbf5a");
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
function drawDigger(z, x, y, f, s) {
  const sk = "#9aa094", P = (dx, dy, w, h, c) => R(f > 0 ? x + dx : x + z.w - dx - w, y + dy, w, h, c);
  P(4, 24, 5, s > 0 ? 5 : 6, "#2a2434"); P(13, 24, 5, s > 0 ? 6 : 5, "#2a2434");
  P(2, 10, 18, 15, "#3a2a20"); P(2, 10, 18, 2, "#5a4030"); P(9, 12, 2, 10, "#2a1a10"); P(6, 22, 10, 3, "#3a2a20");
  P(16, 6, 2, 20, "#7a5a3a"); P(14, 24, 7, 5, "#8a96a8"); P(15, 25, 5, 1, "#c0c8d0"); // pala
  P(13, 13, 5, 3, sk);
  P(5, 2, 12, 9, sk); P(5, 9, 12, 2, "#7a8074"); P(12, 4, 3, 2, "#1a1010"); P(13, 4, 1, 1, "#ffd040"); P(7, 4, 3, 2, "#1a1010"); P(8, 4, 1, 1, "#ffd040"); P(8, 8, 7, 1, "#2a1a1a");
  P(3, 1, 16, 2, "#141018"); P(6, -7, 10, 8, "#141018"); P(6, -2, 10, 1, "#6a1a2a"); // galera
}
function drawFireman(z, x, y, f, s) {
  const sk = "#8ab05a", P = (dx, dy, w, h, c) => R(f > 0 ? x + dx : x + z.w - dx - w, y + dy, w, h, c);
  P(0, 11, 5, 13, "#7a8090"); P(1, 12, 3, 1, "#c0c8d0"); // tanque
  P(5, 24, 5, s > 0 ? 5 : 6, "#2a2434"); P(13, 24, 5, s > 0 ? 6 : 5, "#2a2434");
  P(4, 10, 15, 15, "#b02a1a"); P(4, 17, 15, 2, "#f2d040"); P(4, 22, 15, 1, "#f2d040"); P(11, 10, 1, 15, "#7a1a10");
  P(16, 14, 6, 3, "#b02a1a"); P(20, 13, 4, 5, "#2a2a2a"); P(23, 14, 2, 3, "#5a5a5a"); // manguera
  P(6, 2, 11, 9, sk); P(6, 9, 11, 2, "#5a7a3a"); P(12, 4, 3, 2, "#1a1010"); P(13, 4, 1, 1, "#ff3030"); P(8, 7, 6, 1, "#2a1a1a");
  P(4, -2, 15, 4, "#c02a1a"); P(8, -4, 7, 2, "#c02a1a"); P(10, -3, 3, 3, "#f2c94c"); P(2, 1, 19, 1, "#8a1a10"); // casco
}
function drawToad(z, x, y, f) {
  const air = !z.ground, c = "#5a9a3a", d = "#3a6a2a";
  if (air) { R(x, y + 14, 6, 6, d); R(x + 24, y + 14, 6, 6, d); } else { R(x - 2, y + 15, 9, 5, d); R(x + 23, y + 15, 9, 5, d); }
  R(x + 2, y + 6, 26, 12, c); R(x + 5, y + 4, 20, 3, c); R(x + 4, y + 15, 22, 3, "#c8d080");
  for (const [a, b] of [[8, 8], [18, 7], [13, 11], [22, 11]]) R(x + a, y + b, 3, 2, "#8a3aa8");
  R(x + 4, y, 7, 6, c); R(x + 19, y, 7, 6, c); R(x + 5, y + 1, 5, 4, "#f0f0d0"); R(x + 20, y + 1, 5, 4, "#f0f0d0"); R(x + 7, y + 2, 2, 2, "#e02020"); R(x + 22, y + 2, 2, 2, "#e02020");
  R(x + 5, y + 12, 20, 2, "#2a1a1a"); if (z.t % 90 > 80 && z.ground) R(x + 13, y + 13, 4, 3, "#e06080");
}
function drawDoctor(z, x, y, f, s) {
  const sk = "#9ac08a", P = (dx, dy, w, h, c) => R(f > 0 ? x + dx : x + z.w - dx - w, y + dy, w, h, c);
  P(4, 22, 4, s > 0 ? 5 : 6, "#2a2434"); P(10, 22, 4, s > 0 ? 6 : 5, "#2a2434");
  P(2, 10, 14, 14, "#e8eef5"); P(2, 10, 14, 1, "#ffffff"); P(8, 11, 1, 13, "#b8c0cc"); P(10, 13, 3, 2, "#5a8ad0"); P(14, 14, 4, 3, "#8a3aa8");
  P(4, 2, 10, 9, sk); P(4, 9, 10, 2, "#6a906a"); P(4, 3, 10, 3, "#3a3a44"); P(5, 4, 3, 1, "#7affd0"); P(10, 4, 3, 1, "#7affd0"); P(6, 8, 6, 1, "#2a1a1a"); P(4, 0, 10, 2, "#c8c8c8");
  if (z.glass > 0) { // vidrio protector
    g.save(); g.globalAlpha = .18 + z.glass * .06; g.fillStyle = "#bfefff"; g.fillRect(x - 5, y - 6, z.w + 10, z.h + 8); g.globalAlpha = .8; g.strokeStyle = "#e8faff"; g.lineWidth = 1; g.strokeRect(x - 4.5, y - 5.5, z.w + 9, z.h + 7);
    if (z.glass < 3) { g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 6, y + 9); g.lineTo(x + 3, y + 16); if (z.glass < 2) { g.moveTo(x + 20, y - 4); g.lineTo(x + 12, y + 6); } g.stroke(); }
    g.restore();
  }
}
function drawGlass(z, x, y) {
  if (!(z.glass > 0)) return;
  g.save(); g.globalAlpha = .18 + z.glass * .06; g.fillStyle = "#bfefff"; g.fillRect(x - 5, y - 6, z.w + 10, z.h + 8); g.globalAlpha = .8; g.strokeStyle = "#e8faff"; g.lineWidth = 1; g.strokeRect(x - 4.5, y - 5.5, z.w + 9, z.h + 7);
  if (z.glass < 3) { g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 6, y + 9); g.lineTo(x + 3, y + 16); if (z.glass < 2) { g.moveTo(x + 20, y - 4); g.lineTo(x + 12, y + 6); } g.stroke(); }
  g.restore();
}
function drawZombie(z, i) {
  const x = Math.round(z.x - cam), y = Math.round(z.y);
  if (x < -40 || x > W + 40) return;
  if (z.dead) {
    if (z.dead > 60) return;
    g.globalAlpha = 1 - z.dead / 60; R(x - 2, y + z.h - 3, z.w + 4, 3, isBoss(z) ? "#5a1a6a" : "#3f7a2a"); R(x + 8, y + z.h - 2, 3, 1, "#ddd"); g.globalAlpha = 1; return;
  }
  const f = z.vx > 0 ? 1 : -1, s = Math.sin(z.step * 4), bob = z.ground && s > 0 ? 1 : 0;
  if (z.flash && (z.flash >> 1) % 2) g.globalAlpha = .35;
  const BIG = { brute: bruteArt, boss: bossArt, digger: diggerArt, fireman: firemanArt, toad: toadArt, doctor: doctorArt };
  if (BIG[z.type]) {
    const ff = ["digger", "fireman", "doctor"].includes(z.type) ? z.face || f : f;
    g.save(); g.translate(x + z.w / 2, y + (z.type === "toad" ? 0 : bob)); g.scale(ff, 1); BIG[z.type](g, { s, t: time, tt: z.t, ground: z.ground }); g.restore();
    if (z.type === "doctor") drawGlass(z, x, y + bob);
    if (z.type === "brute" && z.hp < ZT.brute.hp) for (let k = 0; k < ZT.brute.hp; k++) R(x + 2 + k * 5, y - 5, 4, 2, k < z.hp ? "#ff5a5a" : "#3a2a2a");
  }
  else if (z.type === "bat") { g.save(); g.translate(x + z.w / 2, y); batArt(g, { t: time, i }); g.restore(); }
  else { g.save(); g.translate(x + z.w / 2, y + bob); g.scale(f, 1); zombieArt(g, { type: z.type, s, t: time, i, ground: z.ground, tt: z.t, broken: z.broken, fuse: z.fuse | 0 }); g.restore(); }
  g.globalAlpha = 1;
  if (z.frozen > 0) { // bloque de hielo
    const blink = z.frozen < 60 && (z.frozen >> 3) % 2;
    g.globalAlpha = blink ? .25 : .5; R(x - 2, y - 2, z.w + 4, z.h + 3, "#bfe0ff"); g.globalAlpha = .9;
    R(x - 2, y - 2, z.w + 4, 1, "#ffffff"); R(x - 2, y - 2, 1, z.h + 3, "#ffffff"); R(x + 2, y + 2, 2, 1, "#ffffff"); g.globalAlpha = 1;
  }
}
function drawPlayer(p) {
  if (p.dead) return;
  if (p.inv > 0 && Math.floor(p.inv / 4) % 2) return;
  const f = p.face, big = p.tier > 0, x2 = p.tier >= 3, sc = p.h / 15.4 < 1 ? 1 : p.h / 15.4, air = !p.ground, run = !air && Math.abs(p.vx) > .3;
  const cx = p.x - cam + p.w / 2, ty = p.y + p.h - 15.4 * sc;
  if (big) {
    glow(cx, p.y + p.h / 2, 16 * sc, BCOL[p.tier], .35 + p.tier * .04 + Math.sin(time * .25) * .1);
    if (x2) for (let k = 0; k < 3; k++) { const a = time * .15 + k * 2.1; glow(cx + Math.cos(a) * 11, p.y + p.h / 2 + Math.sin(a) * 11, 4, "#ffd0f0", .8); }
  }
  g.save(); g.translate(cx, ty); g.scale(f * sc, sc);
  heroArt(g, { skin: p.skin || 0, ice: p.hero === 1, tier: p.tier, run, air, s: Math.sin(p.step * 3), t: time, vx: p.vx, beam: p.beam });
  g.restore();
}
function drawWater() { // el agua se dibuja encima del personaje para que se vea sumergido
  const ox = Math.floor(cam), x0 = Math.max(0, Math.floor(cam / T)), x1 = Math.min(COLS - 1, x0 + Math.ceil(W / T) + 1);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) if (map[y][x] === "W") {
    const px = x * T - ox, py = y * T, top = map[y - 1]?.[x] !== "W";
    g.fillStyle = vgrad(g, py, py + T, [[0, "rgba(60,150,190,.4)"], [1, "rgba(20,80,120,.55)"]]); g.fillRect(px, py, T + .5, T + .5);
    if (top) { g.beginPath(); for (let k = 0; k <= T; k += 2) { const yy = py + Math.sin(time * .08 + (x * T + k) * .25) * 1.1; k ? g.lineTo(px + k, yy) : g.moveTo(px, yy); } g.strokeStyle = "rgba(190,235,255,.85)"; g.lineWidth = .9; g.stroke(); }
    const bt = (time + x * 11 + y * 7) % 90; if (bt < 30) { g.globalAlpha = .8 - bt / 40; g.beginPath(); g.arc(px + 5 + (x % 3) * 3, py + 12 - bt * .3, 1, 0, 7); g.strokeStyle = "#cfefff"; g.lineWidth = .5; g.stroke(); g.globalAlpha = 1; }
  }
}
function drawShield(p) {
  if (!p.shield || p.dead) return;
  const cx = p.x + p.w / 2 - cam, cy = p.y + p.h / 2, r = Math.max(p.w, p.h) * .75 + 3 + Math.sin(time * .15);
  g.globalAlpha = .16; g.fillStyle = "#7fd8ff"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.globalAlpha = .7; g.strokeStyle = "#bfefff"; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.globalAlpha = .9; R(cx - r * .5, cy - r * .6, 2, 2, "#fff"); g.globalAlpha = 1;
}
function drawBeam(p) {
  if (!p.ray || p.beam <= 0) return;
  const r = p.ray, x = r.x - Math.floor(cam), start = p.beamDir > 0 ? x : x + r.w, end = p.beamDir > 0 ? x + r.w : x, B = p.beamBig;
  const PAL = p.hero === 1
    ? [["#3a7aff", "#9ad0ff", "#f0faff"], ["#2a5aff", "#bfe0ff", "#ffffff"], ["#3a5aff", "#cfe0ff", "#ffffff"], ["#5a5aff", "#cfc8ff", "#ffffff"], ["#7a5aff", "#d8c8ff", "#ffffff"], ["#a05aff", "#ecc8ff", "#ffffff"]]
    : [["#3fd9ff", "#7ff5ff", "#bff8ff"], ["#ff9a1a", "#ffe04a", "#fff6c0"], ["#ff7a1a", "#ffd84a", "#fff6c0"], ["#ff4a2a", "#ffa84a", "#fff0c0"], ["#ff2a5a", "#ff9ab0", "#fff0f4"], ["#ff2aa8", "#ff9ae8", "#fff0ff"]];
  const [c1, c2, c3] = PAL[p.beamTier], cy = r.y + (r.h >> 1), k = 1 + p.beamTier * .8, j = B ? Math.round(Math.sin(time * .9) * k) : 0;
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
  { const hg = g.createLinearGradient(0, 0, 0, 29); hg.addColorStop(0, "rgba(7,5,26,.85)"); hg.addColorStop(1, "rgba(7,5,26,.35)"); g.fillStyle = hg; g.fillRect(0, 0, W, 29); const ln = g.createLinearGradient(0, 0, W, 0); ln.addColorStop(0, "rgba(124,196,86,0)"); ln.addColorStop(.5, "rgba(124,196,86,.55)"); ln.addColorStop(1, "rgba(124,196,86,0)"); g.fillStyle = ln; g.fillRect(0, 28, W, 1); }
  g.font = "bold 10px ui-monospace, monospace"; g.textBaseline = "top"; g.textAlign = "left";
  let n = Math.min(6, Math.max(lives, 3)); for (let i = 0; i < n; i++) heart(8 + i * 9, 5, i < lives ? "#ff5a5a" : "#3a2a4a");
  if (player.shield) { g.strokeStyle = "#bfefff"; g.lineWidth = 1; g.beginPath(); g.arc(8 + n * 9 + 4, 8, 3.5, 0, 7); g.stroke(); n++; }
  const bx = 8 + n * 9 + 6; R(bx, 5, 7, 5, "#e57fa0"); R(bx + 3, 5, 1, 5, "#b04a6a"); text(String(brains), bx + 10, 3);
  text(String(score).padStart(5, "0"), W / 2 - 12, 3, "#f2c94c");
  if (endless) { g.textAlign = "right"; text(`${meters()} m`, W - 8, 3, "#7cc456"); g.textAlign = "left"; }
  else {
    text("N" + (levelIdx + 1), W - 72, 3, "#cfc8e8");
    const pct = Math.min(1, player.x / (goalX * T)); rr(W - 52, 6, 40, 4, 2, "#2e2152"); rr(W - 52, 6, Math.max(2, Math.round(40 * pct)), 4, 2, "#7cc456"); R(W - 10, 3, 1, 9, "#cfc8e8"); R(W - 9, 3, 5, 4, "#d6453d");
  }
  text(clock(levelTime), W - 40, 15, levelTime / 60 > PAR[levelIdx] ? "#ff8a7a" : "#cfc8e8");
  text("RAYO", 8, 15, "#7ff5ff"); rr(36, 18, 40, 4, 2, "#12303c"); rr(36, 18, Math.max(2, Math.round(40 * (1 - player.cd / 40))), 4, 2, player.cd ? "#3fd9ff" : "#bff8ff");
  if (player.power > 0) text(Math.max(player.tier, player.want) > 1 ? "BESTIA " + Math.max(player.tier, player.want) : "BESTIA", 84, 15, Math.sin(time * .15) > 0 ? "#ffb03a" : "#ff7a1a");
  const boss = arenaLocked && zombies.find((z) => isBoss(z) && !z.dead);
  if (boss) {
    const k = ZT[boss.type]; g.textAlign = "center"; text(k.boss, W / 2, 33, "#e8b830"); rr(W / 2 - 60, 45, 120, 5, 2.5, "#2a0a0a"); rr(W / 2 - 60, 45, Math.max(2, Math.round(120 * boss.hp / k.hp)), 5, 2.5, "#e02a4a"); R(W / 2 - 60, 45, Math.round(120 * boss.hp / k.hp), 1, "#ff8a9a");
    if (boss.glass > 0) for (let j = 0; j < 3; j++) R(W / 2 - 60 + j * 14, 52, 12, 3, j < boss.glass ? "#bfefff" : "#2a3a4a");
    g.textAlign = "left";
  }
  if (msgT) { g.textAlign = "center"; text(msg, W / 2, 60, "#f2c94c"); g.textAlign = "left"; }
  if (toasts.length) {
    const tt = toasts[0]; tt.t--; const a = Math.min(1, tt.t / 20, (240 - tt.t) / 14), y = 34 - (1 - a) * 12;
    g.globalAlpha = a; rr(W / 2 - 110, y, 220, 30, 8, "rgba(40,28,8,.88)"); g.strokeStyle = "#f2c94c"; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(W / 2 - 109.5, y + .5, 219, 29, 8) : g.rect(W / 2 - 109.5, y + .5, 219, 29); g.stroke();
    g.textAlign = "center"; g.textBaseline = "top"; g.font = "bold 10px ui-monospace, monospace"; text("🏆 " + tt.txt, W / 2, y + 5, "#f2c94c"); g.font = "9px ui-monospace, monospace"; text(tt.sub, W / 2, y + 18, "#cfc8e8"); g.textAlign = "left"; g.globalAlpha = 1;
    if (tt.t <= 0) toasts.shift();
  }
  if (banner && mode === "play") {
    const a = Math.min(1, banner / 30, (160 - banner) / 20); { const bg = g.createLinearGradient(0, 80, 0, 146); bg.addColorStop(0, "rgba(7,5,26,0)"); bg.addColorStop(.25, "rgba(7,5,26,.8)"); bg.addColorStop(.75, "rgba(7,5,26,.8)"); bg.addColorStop(1, "rgba(7,5,26,0)"); g.globalAlpha = a; g.fillStyle = bg; g.fillRect(0, 80, W, 66); } g.globalAlpha = a * .0; g.globalAlpha = a;
    g.textAlign = "center"; g.font = "10px ui-monospace, monospace"; text(endless ? `RÉCORD: ${endBest} METROS` : `NIVEL ${levelIdx + 1} DE ${LEVELS.length}`, W / 2, 95, "#cfc8e8");
    g.font = "bold 16px ui-monospace, monospace"; text(L.name.toUpperCase(), W / 2, 111, L.boss ? "#ff6a4a" : "#7cc456");
    g.globalAlpha = 1; g.textAlign = "left";
  }
}
function panel(title, sub, c) {
  g.fillStyle = "rgba(7,5,26,.72)"; g.fillRect(0, 0, W, H);
  { const pw = Math.min(W - 24, 330), px = W / 2 - pw / 2; rr(px, 40, pw, 130 + Math.max(0, sub.length - 5) * 17, 10, "rgba(24,16,52,.6)"); g.strokeStyle = hexA(c.length === 7 ? c : "#7cc456", .55); g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(px + .5, 40.5, pw - 1, 129 + Math.max(0, sub.length - 5) * 17, 10) : g.rect(px + .5, 40.5, pw - 1, 129); g.stroke(); glow(W / 2, 72, 90, c.length === 7 ? c : "#7cc456", .12); }
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = `bold ${title.length > 12 ? 22 : 30}px ui-monospace, monospace`;
  g.fillStyle = "#000"; g.fillText(title, W / 2 + 2, 76); g.shadowColor = c; g.shadowBlur = 14; g.fillStyle = c; g.fillText(title, W / 2, 74); g.shadowBlur = 0;
  g.fillStyle = "#f3efe6"; g.font = "11px ui-monospace, monospace";
  sub.forEach((s, i) => g.fillText(s, W / 2, 108 + i * 17)); g.textAlign = "left";
}
const titleBoxes = () => [...LEVELS, ENDLESS].map((_, i) => { const row = i < 5 ? 0 : 1, n = row ? NL - 4 : 5, c = row ? i - 5 : i; return { x: Math.round(W / 2 - (n * 48 - 8) / 2 + c * 48), y: 76 + row * 32, w: 40, h: 28 }; });
const titleOpen = (i) => i === NL || i < unlocked;
function drawTitle() {
  g.fillStyle = "rgba(7,5,26,.82)"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "bold 30px ui-monospace, monospace";
  g.fillStyle = "#000"; g.fillText("ZOMBILANDIA", W / 2 + 2, 52); g.shadowColor = "#7cc456"; g.shadowBlur = 14; g.fillStyle = "#7cc456"; g.fillText("ZOMBILANDIA", W / 2, 50); g.shadowBlur = 0;
  g.font = "11px ui-monospace, monospace"; g.fillStyle = "#cfc8e8"; g.fillText("Saltá, disparale y llegá a la bandera.", W / 2, 70);
  titleBoxes().forEach((b, i) => {
    const open = titleOpen(i), on = i === sel, best = bests[i];
    rr(b.x, b.y, b.w, b.h, 5, on ? "#3b2f60" : "#1d1730"); g.strokeStyle = on ? "#f2c94c" : open ? "#4a3e6b" : "#2a2240"; g.lineWidth = on ? 2 : 1; g.beginPath(); g.roundRect ? g.roundRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1, 5) : g.rect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); g.stroke(); if (on) glow(b.x + b.w / 2, b.y + b.h / 2, 34, "#f2c94c", .35);
    g.font = "bold 16px ui-monospace, monospace"; g.fillStyle = open ? (LEVELS[i] && LEVELS[i].boss ? "#ff6a4a" : i > 4 && i < NL ? "#ffb03a" : "#f3efe6") : "#4a3e6b"; g.fillText(i === NL ? "∞" : open ? String(i + 1) : "×", b.x + b.w / 2, b.y + 14);
    if (open && i < NL) for (let k = 0; k < 3; k++) star(b.x + 6 + k * 10, b.y + 19, best && best.st > k);
    if (i === NL) { g.font = "9px ui-monospace, monospace"; g.fillStyle = "#7cc456"; g.fillText(endBest ? `${endBest}m` : "nuevo", b.x + b.w / 2, b.y + 25); }
  });
  const L0 = sel === NL ? ENDLESS : LEVELS[sel], best = bests[sel];
  g.font = "bold 12px ui-monospace, monospace"; g.fillStyle = L0.boss ? "#ff6a4a" : "#7cc456"; g.fillText(L0.name, W / 2, 152);
  g.font = "11px ui-monospace, monospace"; g.fillStyle = "#cfc8e8";
  if (sel === NL) g.fillText(`Corré todo lo que puedas · récord ${endBest} m`, W / 2, 162);
  else g.fillText(best ? `Mejor: ${best.st} de 3 estrellas · ${clock(best.t)} (meta ${clock(PAR[sel] * 60)})` : `Tiempo meta ${clock(PAR[sel] * 60)}`, W / 2, 162);
  if (records[0]) { g.fillStyle = "#f2c94c"; g.fillText(`Récord: ${records[0].n} ${records[0].s}`, W / 2, 180); }
  g.fillStyle = hero === 1 ? "#9ad0ff" : "#7ff5ff"; g.font = "bold 11px ui-monospace, monospace"; g.fillText(`${HEROES[hero].name} · ${HEROES[hero].power}`, W / 2, 196); g.font = "11px ui-monospace, monospace";
  g.fillStyle = "#f3efe6"; g.fillText("◀ ▶ nivel · ⚡ personaje · ▲ jugar", W / 2, 214);
  g.textAlign = "left";
}
// ---------- Editor de niveles ----------
// Se dibuja sobre una grilla de 120 columnas, se prueba al instante y se comparte por link:
// el nivel viaja comprimido dentro de la dirección (#nivel=...), sin servidor.
const EDW = 120, ED_TILES = " #=?SOcx^F~W";
const TOOLS = [
  { k: "#", n: "Suelo" }, { k: "=", n: "Plataforma" }, { k: "?", n: "Bloque ?" }, { k: "c", n: "Cerebro" }, { k: "S", n: "Jeringa" }, { k: "O", n: "Escudo" },
  { k: "x", n: "Pinches" }, { k: "^", n: "Resorte" }, { k: "F", n: "Se cae" }, { k: "~", n: "Líquido" }, { k: "W", n: "Agua" },
  { z: "walker", n: "Zombi" }, { z: "runner", n: "Corredor" }, { z: "jumper", n: "Saltarín" }, { z: "brute", n: "Grandote" }, { z: "bat", n: "Murciélago" },
  { z: "spitter", n: "Escupidor" }, { z: "shielder", n: "Escudero" }, { k: " ", n: "Borrar" },
];
const blankLevel = () => ({ theme: "cemetery", rows: Array.from({ length: ROWS }, (_, y) => (y >= 13 ? "#" : " ").repeat(EDW)), spawns: {} });
let edData = blankLevel(), edTool = 0, edCam = 0, painting = false, shared = null, customFrom = "editor";
try { const s = JSON.parse(localStorage.getItem("zombilandia-editor") || "null"); if (s && s.rows?.length === ROWS) edData = s; } catch {}
function saveEd() { edData.rows = map.map((r) => r.slice(0, EDW).join("")); try { localStorage.setItem("zombilandia-editor", JSON.stringify(edData)); } catch {} }
function CUSTOM(d) {
  return { name: "Tu nivel", theme: d.theme, custom: true, data: d, build() {
    d.rows.forEach((row, y) => { for (let x = 0; x < EDW; x++) map[y][x] = ED_TILES.includes(row[x]) ? row[x] : " "; });
    fill(EDW, COLS - 1, 13, 14, "#");
    return { goal: EDW - 4, spawns: Object.entries(d.spawns).map(([c, t]) => [+c, t]).filter(([c, t]) => ZT[t] && !ZT[t].boss) };
  } };
}
function runCustom(d, from) { customFrom = from; runId = Date.now(); upgrades = {}; players = []; nPlayers = net.peer ? 2 : 1; score = 0; lives = DLIVES[CFG.diff]; brains = 0; bossCheck = null; loadLevel(CUSTOM(d)); mode = "play"; showEd(false); }
function enterEditor(d) {
  if (d !== edData) { edData = JSON.parse(JSON.stringify(d)); }
  mode = "edit"; L = { name: "Editor", theme: edData.theme }; TH = THEMES[edData.theme]; cache = {};
  for (const row of map) row.fill(" ");
  edData.rows.forEach((row, y) => { for (let x = 0; x < EDW; x++) map[y][x] = row[x] || " "; });
  zombies = []; items = []; deco = []; movers = []; shots = []; parts = []; arena = null; goalX = EDW - 4; edCam = Math.min(edCam, EDW * T); banner = 0; msgT = 0;
  saveEd(); showEd(true);
}
function showEd(on) {
  document.body.classList.toggle("editing", on);
  if (on) document.querySelectorAll("#edTools button").forEach((b, i) => b.classList.toggle("on", i === edTool));
  const th = document.getElementById("edTheme"); if (th) th.textContent = "Tema: " + { cemetery: "cementerio", city: "ciudad", swamp: "pantano", lab: "laboratorio", lair: "guarida", snow: "nieve", desert: "desierto", jungle: "selva", carnival: "parque", moon: "luna" }[edData.theme];
}
function edPaint(e, first) {
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W + edCam, y = (e.clientY - r.top) / r.height * H;
  const col = Math.floor(x / T), row = Math.floor(y / T), t = TOOLS[edTool];
  if (col < 0 || col >= EDW || row < 2 || row >= ROWS) return;
  if (t.z) { if (first) { if (edData.spawns[col] === t.z) delete edData.spawns[col]; else edData.spawns[col] = t.z; beep(500, .05, "square"); } }
  else { if (map[row][col] !== t.k) { map[row][col] = t.k; if (t.k === " " && first) delete edData.spawns[col]; } }
  saveEd();
}
function drawEditor() {
  cam = edCam; drawBg(); drawTiles();
  const ox = Math.floor(cam);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < EDW; x++) if (map[y][x] === "c") { const px = x * T - ox + 4, py = y * T + 4; R(px, py + 1, 8, 5, "#e57fa0"); R(px + 1, py, 6, 8, "#e57fa0"); R(px + 4, py + 1, 1, 5, "#b04a6a"); }
  drawWater();
  for (const [c, type] of Object.entries(edData.spawns)) { // zombis de muestra
    const k = ZT[type]; if (!k) continue; const r = surface(+c), z = makeZombie(+c * T + (T - k.w) / 2, type === "bat" ? ((r > 0 ? r : 13) - 5) * T : (r > 0 ? r : 13) * T - k.h, type, +c); z.ground = true; drawZombie(z, +c);
  }
  g.globalAlpha = .12; for (let x = Math.floor(cam / T); x * T - ox < W; x++) R(x * T - ox, 32, 1, H - 32, "#ffffff"); for (let y = 2; y < ROWS; y++) R(0, y * T, W, 1, "#ffffff"); g.globalAlpha = 1;
  g.globalAlpha = .4; R(EDW * T - ox, 0, W, H, "#000"); g.globalAlpha = 1;
  const sx = 2 * T - ox; R(sx, 13 * T - 16, 10, 14, "#1f7a7a"); R(sx + 4, 13 * T - 13, 5, 4, "#f0c8a0"); // dónde arranca el héroe
  g.globalAlpha = .85; R(0, 0, W, 30, "#07051a"); g.globalAlpha = 1;
  g.font = "bold 11px ui-monospace, monospace"; g.textBaseline = "top"; g.textAlign = "left";
  text(`EDITOR · ${TOOLS[edTool].n}`, 8, 5, "#f2c94c"); g.font = "10px ui-monospace, monospace"; text(`columna ${Math.floor((edCam + W / 2) / T)} de ${EDW} · ◀ ▶ mover`, 8, 18, "#cfc8e8");
}
async function packLevel(d) {
  const json = JSON.stringify({ v: 1, t: d.theme, r: d.rows, s: d.spawns });
  const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
  let b = ""; new Uint8Array(buf).forEach((c) => { b += String.fromCharCode(c); });
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unpackLevel(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/")), bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const o = JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text());
  if (!THEMES[o.t] || !Array.isArray(o.r) || o.r.length !== ROWS) throw new Error("nivel inválido");
  const rows = o.r.map((r) => [...String(r).slice(0, EDW).padEnd(EDW, " ")].map((c) => (ED_TILES.includes(c) ? c : " ")).join(""));
  const spawns = {}; for (const [c, t] of Object.entries(o.s || {})) if (ZT[t] && !ZT[t].boss && +c >= 0 && +c < EDW) spawns[+c] = t;
  return { theme: o.t, rows, spawns };
}
async function shareLevel() {
  saveEd();
  const link = location.origin + location.pathname + "#nivel=" + (await packLevel(edData));
  const box = document.getElementById("sh"), inp = document.getElementById("shIn");
  inp.value = link; box.hidden = false; naming = true;
  document.getElementById("shCopy").onclick = async () => { try { await navigator.clipboard.writeText(link); document.getElementById("shCopy").textContent = "¡Copiado!"; } catch { inp.select(); } };
  const nb = document.getElementById("shShare"); nb.hidden = !navigator.share; nb.onclick = () => navigator.share({ title: "Mi nivel de Zombilandia", url: link }).catch(() => {});
  document.getElementById("shClose").onclick = () => { box.hidden = true; document.getElementById("shCopy").textContent = "Copiar"; setTimeout(() => { naming = false; }, 200); };
}
function buildEdUI() {
  const tools = document.getElementById("edTools"); if (!tools) return;
  TOOLS.forEach((t, i) => { const b = document.createElement("button"); b.textContent = t.n; b.onclick = () => { edTool = i; showEd(true); }; tools.appendChild(b); });
  document.getElementById("edTheme").onclick = () => { const ks = Object.keys(THEMES); edData.theme = ks[(ks.indexOf(edData.theme) + 1) % ks.length]; saveEd(); enterEditor(edData); };
  document.getElementById("edPlay").onclick = () => { saveEd(); runCustom(edData, "editor"); };
  document.getElementById("edShare").onclick = () => shareLevel();
  document.getElementById("edClear").onclick = () => { if (confirm("¿Borrar todo el nivel?")) { edData = blankLevel(); enterEditor(edData); } };
  document.getElementById("edExit").onclick = () => { saveEd(); showEd(false); mode = "title"; loadLevel(0); };
  const eb = document.getElementById("edit"); if (eb) eb.onclick = () => { if (mode === "title" && !net.role) enterEditor(edData); };
}
// ---------- Motor gráfico: fondo con profundidad de campo, bloom, gradación de color y rayos de luz ----------
let bgC, bgG, b1, b1g, b2, b2g, b3, b3g, fxKey = "";
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext("2d")]; };
function fxSize() {
  fxKey = W + "x" + SC;
  [bgC, bgG] = mk(W * SC / 2, H * SC / 2); [b1, b1g] = mk(W * SC / 4, H * SC / 4); [b2, b2g] = mk(W * SC / 4, H * SC / 4); [b3, b3g] = mk(W * SC / 10, H * SC / 10);
  for (const x of [bgG, b1g, b2g, b3g]) { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; }
}
function drawBgSoft() { // el fondo se dibuja a media resolución y se estira suave: se ve desenfocado, como si estuviera lejos
  if (fxKey !== W + "x" + SC) fxSize();
  const main = g; g = bgG; g.setTransform(SC / 2, 0, 0, SC / 2, 0, 0); drawBg(); g = main;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bgC, 0, 0, cv.width, cv.height); g.restore();
}
const GRADE = { cemetery: ["#5a6cc0", .2], city: ["#c08a5a", .16], swamp: ["#5ac078", .2], lab: ["#5ab8c8", .16], lair: ["#d04a20", .24], snow: ["#8ab8ff", .18], desert: ["#ffb060", .2], jungle: ["#50d890", .2], carnival: ["#d070ff", .2], moon: ["#8aa0ff", .16] };
function postFX() {
  const dw = cv.width, dh = cv.height;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  // bloom: me quedo con lo más brillante (elevando al cuadrado), lo desenfoco y lo sumo
  b1g.globalCompositeOperation = "source-over"; b1g.drawImage(cv, 0, 0, b1.width, b1.height);
  b2g.globalCompositeOperation = "source-over"; b2g.drawImage(b1, 0, 0); b2g.globalCompositeOperation = "multiply"; b2g.drawImage(b1, 0, 0); b2g.drawImage(b2, 0, 0);
  b3g.drawImage(b2, 0, 0, b3.width, b3.height);
  g.globalCompositeOperation = "lighter"; g.globalAlpha = .5; g.drawImage(b3, 0, 0, dw, dh); g.globalAlpha = .25; g.drawImage(b2, 0, 0, dw, dh);
  // gradación de color según el mundo
  const [col, a] = GRADE[L?.theme] || GRADE.cemetery;
  g.globalCompositeOperation = "soft-light"; g.globalAlpha = a * 2.2; g.fillStyle = col; g.fillRect(0, 0, dw, dh);
  g.restore();
}
function godRays() { // haces de luz de la luna
  if (!TH.moon || TH.indoor) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const a = .045 + .02 * Math.sin(time * .01 + i * 1.7), x0 = W - 70, y0 = 46, ang = 1.9 + i * .22 + Math.sin(time * .004 + i) * .03, len = 260, wd = 28 + i * 10;
    const gr = g.createLinearGradient(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); gr.addColorStop(0, hexA(TH.moon, a)); gr.addColorStop(1, hexA(TH.moon, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(ang - .09) * len, y0 + Math.sin(ang - .09) * len); g.lineTo(x0 + Math.cos(ang + .09) * len, y0 + Math.sin(ang + .09) * len); g.fill();
  }
  g.restore();
}
// ---------- Efectos modernos: luces, sombras, partículas de ambiente, HUD de vidrio ----------
const glowCache = {};
function glow(x, y, r, col, a = .5) { // resplandor aditivo (la luz se suma sobre la escena)
  if (typeof col !== "string" || !/^#[0-9a-f]{6}$/i.test(col)) return;
  let c = glowCache[col];
  if (!c) { c = document.createElement("canvas"); c.width = c.height = 64; const k = c.getContext("2d"), gr = k.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(.4, hexA(col, .35)); gr.addColorStop(1, hexA(col, 0)); k.fillStyle = gr; k.fillRect(0, 0, 64, 64); glowCache[col] = c; }
  g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = a; g.drawImage(c, x - r, y - r, r * 2, r * 2); g.restore();
}
function rr(x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); }
function shadowOf(e) { if (!e.ground || e.dead) return; g.globalAlpha = .28; g.fillStyle = "#000"; g.beginPath(); g.ellipse(Math.round(e.x - cam + e.w / 2), Math.round(e.y + e.h) + 1, e.w * .55, 2, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
const MOTE = { cemetery: ["#b8ff9a", 1], city: ["#c8c0b0", 0], swamp: ["#9aff6a", 1], lab: ["#7ff5ff", 1], lair: ["#ff8a3a", 2] };
function drawMotes() { // luciérnagas, polvo o brasas flotando con parallax
  const [col, kind] = MOTE[L.theme] || MOTE.cemetery;
  for (let i = 0; i < 26; i++) {
    const sp = .25 + (i % 5) * .12, ox = i * 73.7, oy = (i * 41.3) % 150;
    let x = ((ox - cam * sp * 1.4 + time * (kind === 2 ? .1 : .18) * (i % 2 ? 1 : -1)) % (W + 20) + W + 20) % (W + 20) - 10;
    let y = 40 + oy + Math.sin(time * .02 + i) * 8 - (kind === 2 ? (time * .3 + i * 20) % 120 : 0);
    if (y < 30) y += 120;
    const a = (kind === 1 ? .35 + .35 * Math.sin(time * .05 + i * 2) : .35);
    glow(x, y, kind === 0 ? 3 : 5, col, Math.max(0, a) * .8);
    if (kind !== 0) { g.globalAlpha = Math.max(0, a); R(x, y, 1, 1, "#fff"); g.globalAlpha = 1; }
  }
}
function drawLights() { // se llama después de dibujar todo, antes de la viñeta
  for (const it of items) if (!it.got) glow(it.x - cam + 4, it.y + 4, 13, it.kind ? "#ffd860" : "#ff7aa8", .45 + .15 * Math.sin(time * .08 + it.x));
  for (const s of shots) if (s.kind !== "tomb") glow(s.x - cam, s.y, (s.r || 3) * 4.5, s.kind === "fire" ? "#ff7a1a" : s.col, .6);
  for (const p of players) {
    if (p.dead) continue;
    if (p.ray) glow(p.ray.x - cam + p.ray.w / 2, p.ray.y + p.ray.h / 2, Math.max(10, p.ray.h * 3), p.hero === 1 ? "#7fb8ff" : "#7ff5ff", .5);
    if (p.power > 0) glow(p.x - cam + p.w / 2, p.y + p.h / 2, 22 + p.tier * 6, BCOL[p.tier], .35 + .1 * Math.sin(time * .2));
    glow(p.x - cam + p.w / 2, p.y + p.h * .35, 8, p.hero === 1 ? "#9ad0ff" : "#7ff5ff", .18);
  }
  for (const z of zombies) if (!z.dead && z.type && isBoss(z)) glow(z.x - cam + z.w / 2, z.y + z.h * .3, 26, "#ff3a2a", .22);
  for (const q of parts) glow(q.x - cam, q.y, 5, q.col, Math.min(.6, q.life / 40));
}
function draw() {
  if (mode === "edit") { drawEditor(); return; }
  player = players[me()] || players[0];
  g.save();
  if (shake) g.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 4));
  drawBgSoft(); if (fxLvl > 0) godRays(); if (fxLvl > 0) drawMotes(); drawTiles(); drawItems();
  for (const z of zombies) shadowOf(z); for (const q of players) shadowOf(q);
  for (const f of falling) drawPlat(f.x - cam, f.y, -9, 0, .3);
  for (const m of movers) { // plataformas móviles
    const x = Math.round(m.x - cam), y = Math.round(m.y), [p0, p1, p2] = TH.plat;
    if (L.theme === "city" || L.theme === "lab") { R(x + 3, 30, 1, y - 30, "#5a5a66"); R(x + m.w - 4, 30, 1, y - 30, "#5a5a66"); }
    if (L.theme === "lair") { for (let k = 30; k < y; k += 4) { R(x + 3, k, 1, 2, "#6a5a5a"); R(x + m.w - 4, k + 2, 1, 2, "#6a5a5a"); } }
    R(x, y, m.w, m.h, p0); R(x, y, m.w, 2, p1); R(x, y + m.h - 2, m.w, 2, p2); for (let k = 4; k < m.w; k += 8) R(x + k, y + 3, 2, 2, p2);
  }
  zombies.forEach((z, i) => drawZombie(z, z.idx ?? i));
  for (const s of shots) {
    const x = s.x - cam;
    if (s.kind === "tomb") { R(x - 5, s.y - 6, 10, 12, "#7a7a8a"); R(x - 4, s.y - 7, 8, 1, "#7a7a8a"); R(x - 2, s.y - 3, 4, 1, "#4a4a5a"); R(x - 5, s.y - 6, 1, 12, "#9a9aaa"); continue; }
    if (s.kind === "fire") { g.globalAlpha = .35; R(x - 4, s.y - 4, 8, 8, "#ff5a10"); g.globalAlpha = 1; R(x - 2, s.y - 2, 4, 4, s.col); R(x - 1, s.y - 1, 2, 2, "#fff0a0"); continue; }
    g.globalAlpha = .3; g.fillStyle = s.col; g.beginPath(); g.arc(x, s.y, s.r + 3, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(x, s.y, s.r, 0, 7); g.fill(); R(x - 1, s.y - 2, 1, 1, "#f0ffc0"); }
  for (const q of players) { drawPlayer(q); drawShield(q); drawBeam(q); } drawWater();
  for (const q of parts) { const a = Math.min(1, q.life / 20); g.globalAlpha = a; g.fillStyle = q.col; g.beginPath(); g.arc(q.x - cam, q.y, 1 + a * .9, 0, 7); g.fill(); } g.globalAlpha = 1;
  if (fxLvl > 0) drawLights(); if (fxLvl > 1) postFX();
  g.fillStyle = grads().vig; g.fillRect(0, 0, W, H);
  hud(); g.restore();
  g.font = "8px ui-monospace, monospace"; g.textAlign = "right"; g.textBaseline = "bottom"; g.globalAlpha = .6; text(VERSION, W - 3, H - 2, "#cfc8e8"); g.globalAlpha = 1; g.textAlign = "left";
  if (mode === "title") { if (net.role === "guest" || net.joining) net.lobby(); else drawTitle(); }
  else if (mode === "__") panel("ZOMBILANDIA", ["Saltá sobre los zombis o usá el rayo.", "Doble salto: saltá otra vez en el aire.", "10 niveles, jefes y modo infinito.", records[0] ? `Récord: ${records[0].n} ${records[0].s}` : "", "Tocá o apretá una tecla para empezar", ...(unlocked > 1 ? [`o tocá ⚡ para seguir desde el nivel ${unlocked}`] : [])], "#7cc456");
  else if (mode === "shop") drawShop();
  else if (mode === "clear") {
    panel("¡NIVEL SUPERADO!", [L.name, `${lastStars[0] ? "✓" : "✗"} Tiempo ${clock(levelTime)} (meta ${clock(PAR[levelIdx] * 60)})`, `${lastStars[1] ? "✓" : "✗"} Cerebros ${gotBrains} de ${totalBrains}`, `${lastStars[2] ? "✓" : "✗"} ${damaged ? "Recibiste golpes" : "Sin golpes"}`, `Puntos: ${score}`, "Tocá para seguir"], "#f2c94c");
    for (let k = 0; k < 3; k++) { g.save(); g.translate(W / 2 - 34 + k * 24, 84); g.scale(2, 2); star(0, 0, lastStars[k]); g.restore(); }
  }
  else if (mode === "over" && endless) panel("TE COMIERON", [`Llegaste a ${meters()} metros · ${score} puntos`, `Récord del modo infinito: ${endBest} metros`, ...recLines(3), "", "Tocá para correr de nuevo"], "#ff5a5a");
  else if (mode === "over") panel("TE COMIERON", [`Nivel ${levelIdx + 1}: ${L.name}  ·  ${score} puntos`, ...recLines(3), "", bossCheck && bossCheck.level === levelIdx ? "Tocá para volver a pelear con el jefe" : "Tocá para reintentar el nivel"], "#ff5a5a");
  else if (mode === "cwin") panel("¡LO PASASTE!", [`Tu nivel en ${clock(levelTime)} · ${score} puntos`, "", customFrom === "link" ? "Tocá para abrirlo en el editor" : "Tocá para volver al editor"], "#f2c94c");
  else if (mode === "linkintro") panel("NIVEL COMPARTIDO", ["Alguien te mandó un nivel hecho", "en el editor de Zombilandia.", "", "Tocá para jugarlo"], "#7cc456");
  else if (mode === "won") panel("¡SOBREVIVISTE!", [`Derrotaste al Rey Zombi · ${score} puntos`, "", ...recLines(5), "Tocá para volver"], "#f2c94c");
  net.draw?.();
}

// ---------- Bucle (60 fps fijos) ----------
let last = performance.now(), acc = 0;
let perfEma = 16.7, perfBad = 0;
function frame(now) {
  const dt = now - last; acc += Math.min(100, dt); last = now;
  if (CFG.gfx === "auto") { // si el celu se traba, bajo los efectos de a poco
    perfEma += (Math.min(100, dt) - perfEma) * .05;
    if (perfEma > 27 && fxLvl > 0 && ++perfBad > 120) { fxLvl--; perfBad = 0; perfEma = 16.7; }
    if (perfEma <= 27) perfBad = 0;
  } else fxLvl = CFG.gfx === "alto" ? 2 : 0;
  while (acc >= 1000 / 60) { if (!net.paused && !paused && net.role !== "guest") update(); net.step(); acc -= 1000 / 60; }
  g.setTransform(SC, 0, 0, SC, 0, 0); draw(); musicTick(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Entrada ----------
function toMenu() { // volver a la pantalla de niveles desde una partida
  if (mode === "title" || mode === "linkintro" || naming || document.body.classList.contains("editing")) return;
  if (net.role === "guest") { document.getElementById("online")?.click(); return; } // el invitado no maneja el menú: abre el panel online (con "Salir")
  sel = Math.min(Math.max(levelIdx, 0), unlocked - 1); if (endless) sel = NL;
  mode = "title"; loadLevel(0); beep(300, .1, "triangle", 200);
}
function press(k) { // empezar, seguir o reintentar
  if (naming) return true;
  if (net.role && net.press(k)) return true;
  if (mode === "title") {
    if (k === "left" || k === "right") { const av = [...Array(unlocked).keys(), NL], j = av.indexOf(sel); sel = av[Math.max(0, Math.min(av.length - 1, (j < 0 ? 0 : j) + (k === "left" ? -1 : 1)))]; beep(660, .05, "square"); return true; }
    if (k === "fire") { setHero(1 - hero); beep(hero ? 1500 : 900, .12, "triangle", hero ? 2400 : 1400); return true; }
    newGame(urlLevel ? urlLevel - 1 : sel); return true;
  }
  if (mode === "over") {
    lives = DLIVES[CFG.diff];
    if (bossCheck && bossCheck.level === levelIdx) { // revancha: arranca en la arena, frente al jefe
      score = bossCheck.score; brains = bossCheck.brains; loadLevel(levelIdx);
      zombies = zombies.filter(isBoss); banner = 0;
      const rx = (arena.wall + 4) * T, ry = surface(arena.wall + 4) * T - 16;
      players.forEach((q, i) => Object.assign(q, { x: rx + i * 14, y: ry, safe: { x: rx + i * 14, y: ry } })); lockArena(); say(`¡Revancha con ${BOSS_NAME[zombies[0].type]}!`);
    } else if (endless) { newGame(NL); return true; } else if (L.custom) { runCustom(L.data, customFrom); return true; } else { score = levelStart; loadLevel(levelIdx); }
    mode = "play"; return true;
  }
  if (mode === "clear") { bossCheck = null; mode = "shop"; shopSel = 0; shopMsgT = 0; return true; }
  if (mode === "shop") {
    if (k === "left" || k === "right") { shopSel = (shopSel + (k === "left" ? -1 : 1) + SHOP.length) % SHOP.length; beep(660, .04, "square"); return true; }
    shopAct(shopSel); return true;
  }
  if (mode === "won") { mode = "title"; loadLevel(0); return true; }
  if (mode === "cwin") { enterEditor(L.data); return true; }
  if (mode === "linkintro") { runCustom(shared, "link"); return true; }
  if (mode === "edit") return false; // en el editor, ◀ ▶ mueven la vista
  return false;
}
const map_k = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump", x: "fire", X: "fire", f: "fire", F: "fire", j: "fire", J: "fire", Shift: "fire", z: "fire", Z: "fire" };
addEventListener("keydown", (e) => {
  if (e.target?.tagName === "INPUT") return;
  if (naming) return;
  const k = map_k[e.key]; if (e.repeat) { if (k) e.preventDefault(); return; }
  audioInit();
  if (e.key === "Escape") { toMenu(); return; }
  if (e.key === "m" || e.key === "M") { toggleMusic(); return; }
  if (mode === "title" && net.role !== "guest" && (e.key === "c" || e.key === "C")) { setHero(1 - hero); return; }
  if (mode === "title" && !net.role && (e.key === "e" || e.key === "E")) { enterEditor(edData); return; }
  if (mode === "shop" && net.role !== "guest" && (e.key === "ArrowDown" || e.key === "s" || e.key === "S")) { shopSel = (shopSel + 1) % SHOP.length; return; }
  if (mode === "shop" && net.role !== "guest" && e.key === "ArrowUp") { shopSel = (shopSel - 1 + SHOP.length) % SHOP.length; return; }
  if (mode === "title" && net.role !== "guest" && /^[0-9i]$/.test(e.key) && (e.key === "i" || (+e.key || 10) <= unlocked)) { newGame(e.key === "i" ? NL : (+e.key || 10) - 1); return; } // elegir nivel ya desbloqueado
  if (press(k)) { e.preventDefault(); return; }
  if (k) { keys[k] = true; if (k in tap) tap[k] = true; e.preventDefault(); }
});
addEventListener("keyup", (e) => { const k = map_k[e.key]; if (k) keys[k] = false; });
addEventListener("blur", () => { keys.left = keys.right = keys.jump = keys.fire = false; });
cv.addEventListener("pointermove", (e) => { if (mode === "edit" && painting) edPaint(e, false); });
addEventListener("pointerup", () => { painting = false; });
cv.addEventListener("pointerdown", (e) => {
  if (mode === "edit") { painting = true; cv.setPointerCapture?.(e.pointerId); edPaint(e, true); return; }
  audioInit();
  if (mode === "shop") { // tocar un renglón lo compra
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const i = SHOP.findIndex((_, j) => { const b = shopRow(j); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; });
    if (i >= 0) { if (net.role === "guest") net.send({ t: "shop", i }); else { shopSel = i; shopAct(i); } } return;
  }
  if (mode === "title" && !naming && (net.role === "guest" || net.joining)) return;
  if (mode === "title" && !naming) { // tocar un nivel lo elige y arranca
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const i = titleBoxes().findIndex((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (i >= 0 && titleOpen(i)) sel = i; else if (i >= 0) return;
  }
  press(null);
});
const menuBtn = document.getElementById("menu"); if (menuBtn) menuBtn.addEventListener("click", toMenu);
const vibBtn = document.getElementById("vib"); if (vibBtn) { if (!canVibe) vibBtn.remove(); else { vibBtn.style.opacity = vibeOn ? 1 : .4; vibBtn.addEventListener("click", toggleVibe); } }
const musBtn = document.getElementById("mus"); if (musBtn) { musBtn.textContent = musicOn ? "♪" : "✕"; musBtn.addEventListener("click", toggleMusic); }
document.querySelectorAll("#pad button").forEach((b) => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); audioInit(); if (press(k)) return; keys[k] = true; if (k in tap) tap[k] = true; b.classList.add("on"); b.setPointerCapture?.(e.pointerId); };
  const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});
buildEdUI();

// ---------- Menú de ajustes ----------
function applyPad() { document.documentElement.style.setProperty("--pad", ["60px", "76px", "92px"][CFG.pad]); }
function exportProgress() {
  const o = {}; for (const k of ["nivel", "infinito", "estrellas", "heroe", "nombre", "records", "musica", "ajustes"]) { try { const v = localStorage.getItem("zombilandia-" + k); if (v !== null) o[k] = v; } catch {} }
  return "ZB1." + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function importProgress(s) {
  try { const o = JSON.parse(decodeURIComponent(escape(atob(s.trim().replace(/^ZB1\./, ""))))); for (const k in o) localStorage.setItem("zombilandia-" + k, o[k]); return true; } catch { return false; }
}
function setupCfg() {
  const box = document.getElementById("cfg"); if (!box) return;
  const sync = () => box.querySelectorAll(".seg").forEach((s) => { const k = s.dataset.k, cur = k === "mus" ? (musicOn ? "1" : "0") : String(CFG[k]); s.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === cur)); });
  const open = (on) => { box.hidden = !on; if (on) { sync(); buildSkin(); buildAch(); if (!net.role && mode === "play") paused = true; } else paused = false; };
  const skRow = document.getElementById("cfgSkin"), achBox = document.getElementById("cfgAch");
  const buildSkin = () => { if (!skRow) return; skRow.innerHTML = ""; SKINS.forEach((n, i) => { const b = document.createElement("button"); b.dataset.v = i; b.textContent = skinOpen(i) ? n : "🔒"; b.disabled = !skinOpen(i); b.title = skinOpen(i) ? n : "Se desbloquea con un logro"; b.classList.toggle("on", (CFG.skin || 0) === i); b.onclick = () => { CFG.skin = i; saveCfg(); if (players[0]) players[0].skin = i; buildSkin(); }; skRow.appendChild(b); }); };
  const buildAch = () => { if (!achBox) return; achBox.innerHTML = ACH.map((a) => ach[a.id] ? `<div class="ok">✓ ${a.name} <small>${a.desc}${a.skin ? " · traje " + SKINS[a.skin] : ""}</small></div>` : `<div>· ${a.name} <small>${a.desc}</small></div>`).join(""); };
  document.getElementById("cfgBtn")?.addEventListener("click", () => open(box.hidden));
  document.getElementById("cfgClose").onclick = () => open(false);
  document.getElementById("cfgMenu").onclick = () => { open(false); toMenu(); };
  box.querySelectorAll(".seg button").forEach((b) => b.onclick = () => {
    const k = b.parentElement.dataset.k, v = b.dataset.v;
    if (k === "mus") { if ((v === "1") !== musicOn) toggleMusic(); } else { CFG[k] = k === "gfx" ? v : +v; if (k === "gfx" && v === "auto") fxLvl = 2; saveCfg(); if (k === "pad") applyPad(); }
    sync();
  });
  const code = document.getElementById("cfgCode"), msg = document.getElementById("cfgMsg");
  document.getElementById("cfgExp").onclick = async () => { code.value = exportProgress(); try { await navigator.clipboard.writeText(code.value); msg.textContent = "Código copiado. Pegalo en el otro dispositivo."; } catch { code.select(); msg.textContent = "Copialo a mano."; } };
  document.getElementById("cfgImp").onclick = () => { if (importProgress(code.value)) { msg.textContent = "¡Progreso cargado!"; setTimeout(() => location.reload(), 600); } else msg.textContent = "Ese código no sirve."; };
  addEventListener("keydown", (e) => { if (e.target?.tagName === "INPUT") return; if (e.key === "p" || e.key === "P") open(box.hidden); });
  applyPad();
}
setupCfg();
if (location.hash.startsWith("#nivel=")) unpackLevel(location.hash.slice(7)).then((d) => { shared = d; loadLevel(CUSTOM(d)); mode = "linkintro"; }).catch(() => {});
window.__game = {
  get state() { const p = players[0]; return { mode, level: levelIdx + 1, lives, score, brains, x: p.x, y: p.y, bossDead, arenaLocked, big: p.tier, power: p.power, w: p.w, h: p.h, n: players.length }; }, keys, keys2, players: () => players, net,
  debug: { load(i) { newGame(i); }, tp(col) { const r = surface(col); Object.assign(players[0], { x: col * T, y: (r > 0 ? r : 10) * T - 16, vx: 0, vy: 0 }); }, god() { lives = 99; }, die() { lives = 1; ctx(0); loseLife(); }, power() { ctx(0); powerUp(); }, peace() { zombies.length = 0; }, get boss() { const z = zombies.find(isBoss); return z && { x: z.x, hp: z.hp, dead: z.dead }; } },
};
