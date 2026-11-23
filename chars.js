// Personajes y zombis dibujados con formas suaves, degradados y contorno. No dependen del juego:
// reciben un contexto ya trasladado al centro-arriba del sprite (x=0 es el centro, y=0 la cabeza) y mirando a la derecha.
const OL = "rgba(14,8,28,.6)";
function rr2(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function fillStroke(g, fill, lw = .5) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); }

function heroArt(g, o) {
  const { ice, tier, run, air, s, t } = o, m = tier, big = m > 0, mf = m / 5;
  const C = ice
    ? { coat: "#3a6ab8", coatL: "#8fb4f0", coatD: "#24488a", tail: ["#f4f8ff", "#b8cce8"], legs: "#2a2a4a", legsL: "#44446e", boots: "#d0e0f0", hood: "#dfe9fb", hoodL: "#ffffff", hoodD: "#9fb4d8", eyes: ["#9ad0ff", "#6ab0ff", "#3a7aff", "#5a6aff", "#7a5aff", "#c07aff"], belt: "#6a8ad8", hair: "#f4f8ff", skin: "#d4aa92", rage: "#4a78c8" }
    : { coat: "#1f7a7a", coatL: "#35b0aa", coatD: "#115050", tail: ["#ffa04a", "#e2572a"], legs: "#2b2340", legsL: "#463a66", boots: "#6a4630", hood: "#1a7470", hoodL: "#2f9e98", hoodD: "#0e4a48", eyes: ["#7ff5ff", "#a8f070", "#ffd84a", "#ff9a3a", "#ff4a4a", "#ff5ac8"], belt: "#ff8a3d", hair: "#2a1a14", skin: "#e0aa84", rage: "#e0562a" };
  const SK = [null, { c: "#c0392b", cl: "#ef6a4a", cd: "#7a1a12", tail: ["#ffd060", "#ff7a1a"] }, { c: "#8a20d8", cl: "#c060ff", cd: "#4a0e80", tail: ["#5af0ff", "#ff5ac8"] }, { c: "#c9a227", cl: "#f4d860", cd: "#7a5a10", tail: ["#fff0a0", "#e8b830"] }, { c: "#2c2c3c", cl: "#5a5a78", cd: "#14141e", tail: ["#9a9ac0", "#4a4a68"] }][o.skin | 0];
  if (SK) { C.coat = lerpHex(C.coat, SK.c, .85); C.coatL = lerpHex(C.coatL, SK.cl, .85); C.coatD = lerpHex(C.coatD, SK.cd, .85); C.hood = lerpHex(C.hood, SK.c, .8); C.hoodL = lerpHex(C.hoodL, SK.cl, .8); C.hoodD = lerpHex(C.hoodD, SK.cd, .8); C.tail = SK.tail; }
  const skT = lerpHex(C.skin, C.rage, Math.min(1, mf * 1.15)), skB = lerpHex(skT, "#000000", .3), skL = lerpHex(skT, "#ffffff", .22);
  g.lineCap = "round"; g.lineJoin = "round";
  const len = 4 + Math.min(5, Math.abs(o.vx) * 2.5) + (air ? 2 : 0);
  // bufanda (Chispa) o trenza (Escarcha) que flamea
  const pts = [];
  for (let k = 0; k <= 8; k++) { const tt = k / 8; pts.push(ice ? [-3.4 - tt * len * .5, 3.8 + tt * (5 + len * .25) + Math.sin(t * .3 - tt * 4) * tt * 1.2] : [-3.2 - tt * len, 7.2 + Math.sin(t * .3 - tt * 3.5) * tt * 1.8 - (air ? tt * 1.5 : 0)]); }
  const tail = (w, c) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.lineWidth = w; g.strokeStyle = c; g.stroke(); };
  const tg = g.createLinearGradient(pts[0][0], pts[0][1], pts[8][0], pts[8][1]); tg.addColorStop(0, C.tail[0]); tg.addColorStop(1, C.tail[1]);
  if (m < 3) { tail(ice ? 2.6 : 3, OL); tail(ice ? 1.8 : 2.2, tg); }
  const tw = 8.4 + m * 1.25, aw = 1.9 + m * .62, lw = 3 + m * .38, hipX = 1.7 + m * .3, sw = swingOf();
  function swingOf() { return air ? .7 : run ? s * .9 : .05; }
  const shX = tw / 2 - 1, shY = 7.4 + (m > 2 ? .2 : 0);
  // brazo de atrás (grueso y con músculo)
  const arm = (side, ang) => {
    g.save(); g.translate(side * shX, shY); g.rotate(ang);
    const L = 4.2 + m * .3;
    if (m === 0) { rr2(g, -.9, -.9, 1.9, 4.2, .9); fillStroke(g, C.coatD); }
    else {
      const sleeve = m < 2;
      g.save(); g.rotate(side < 0 ? 0 : 0);
      rr2(g, -aw / 2, -aw / 2, aw, L + aw * .3, aw / 2); fillStroke(g, sleeve ? vgrad(g, -aw / 2, L, [[0, C.coatL], [1, C.coatD]]) : vgrad(g, -aw / 2, L, [[0, skL], [.5, skT], [1, skB]]));
      if (!sleeve) { g.beginPath(); g.ellipse(0, L * .3, aw * .62, aw * .55, 0, 0, 7); g.fillStyle = skL; g.globalAlpha = .55; g.fill(); g.globalAlpha = 1; }
      if (m >= 4) { g.strokeStyle = "rgba(120,20,10,.55)"; g.lineWidth = .28; g.beginPath(); g.moveTo(-.4, .5); g.quadraticCurveTo(.6, L * .35, -.2, L * .7); g.stroke(); }
      g.restore();
      g.beginPath(); g.arc(0, L + aw * .3, 1 + m * .27, 0, 7); fillStroke(g, skT, .4);
    }
    g.restore();
  };
  arm(-1, swing());
  function swing() { return air ? .7 : run ? s * .9 : .05; }
  // piernas
  const leg = (hx, ang, back) => {
    g.save(); g.translate(hx, 10.6); g.rotate(ang);
    rr2(g, -lw / 2, 0, lw, 3.5, lw * .35); fillStroke(g, m >= 2 ? vgrad(g, 0, 4, [[0, skL], [1, skB]]) : back ? C.legs : vgrad(g, 0, 4, [[0, C.legsL], [1, C.legs]]));
    if (m >= 2) { rr2(g, -lw / 2 - .15, 0, lw + .3, 1.9, .8); fillStroke(g, back ? "#2a2036" : vgrad(g, 0, 2, [[0, "#4a3c66"], [1, "#2a2036"]])); }
    rr2(g, -lw / 2 - .2, 2.9, lw + 1.4, 2, 1); fillStroke(g, vgrad(g, 2.9, 4.9, [[0, lerpHex(C.boots, "#ffffff", .25)], [1, C.boots]]));
    g.restore();
  };
  leg(-hipX, air ? -.5 : run ? -s * .75 : -.1, true); leg(hipX, air ? .45 : run ? s * .75 : .1, false);
  // torso: en forma de V, con pectorales y abdominales
  const top = 6.0 - (m > 2 ? .4 : 0);
  g.beginPath(); g.moveTo(-tw / 2, top + 1.2); g.quadraticCurveTo(-tw / 2, top, -tw / 2 + 1.6, top); g.lineTo(tw / 2 - 1.6, top); g.quadraticCurveTo(tw / 2, top, tw / 2, top + 1.2);
  g.lineTo(tw / 2 - m * .28 - .4, 11.3); g.lineTo(-tw / 2 + m * .28 + .4, 11.3); g.closePath();
  fillStroke(g, m >= 2 ? vgrad(g, top, 11.3, [[0, skL], [.5, skT], [1, skB]]) : vgrad(g, top, 11.3, [[0, C.coatL], [.45, C.coat], [1, C.coatD]]));
  if (m >= 2) {
    g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(-.2, top + 1, .4, 4.6);
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * tw * .22, top + 2.1, tw * .2, 1.5, 0, 0, 7); g.fillStyle = skL; g.globalAlpha = .6; g.fill(); g.globalAlpha = 1; g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = .3; g.beginPath(); g.arc(sd * tw * .22, top + 2.5, tw * .2, .2, 2.9); g.stroke(); }
    if (m >= 3) { g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = .3; for (let r = 0; r < 3; r++) { g.beginPath(); g.moveTo(-tw * .16, top + 4.4 + r * 1.1); g.lineTo(tw * .16, top + 4.4 + r * 1.1); g.stroke(); } }
    // chaleco hecho jirones
    if (m === 2) { g.beginPath(); g.moveTo(-tw / 2 + .4, 9); for (let k = 0; k <= 6; k++) g.lineTo(-tw / 2 + .4 + k * (tw - .8) / 6, 9 + (k % 2 ? 1.3 : .2)); g.lineTo(tw / 2 - .8, 11.2); g.lineTo(-tw / 2 + .8, 11.2); g.closePath(); fillStroke(g, C.coat); }
    g.fillStyle = "#3a2a4a"; g.fillRect(-tw / 2 + m * .28 + .4, 10.3, tw - m * .56 - .8, 1.1); g.fillStyle = C.belt; g.fillRect(-1.2, 10.3, 2.4, 1.1);
  } else { g.fillStyle = C.belt; g.fillRect(-tw / 2 + .4, 10.1, tw - .8, .9); g.fillStyle = "rgba(255,255,255,.22)"; rr2(g, -tw / 2 + .8, 6.9, 1.6, 3, .8); g.fill(); }
  // brazo de adelante
  arm(1, air ? -.5 : run ? -s * .85 : -.12);
  // trapecios y cuello
  if (m >= 2) { g.beginPath(); g.moveTo(-3.2, top + .6); g.quadraticCurveTo(0, top - 1.8, 3.2, top + .6); g.lineTo(tw / 2 - 1, top + 1.1); g.lineTo(-tw / 2 + 1, top + 1.1); g.closePath(); fillStroke(g, vgrad(g, top - 1, top + 1.2, [[0, skL], [1, skT]]), .4); }
  else { rr2(g, -3.9, 5.2, 7.8, 2.4, 1.2); fillStroke(g, ice ? vgrad(g, 5.2, 7.6, [[0, "#ffffff"], [1, "#cfdcf2"]]) : vgrad(g, 5.2, 7.6, [[0, "#ffb060"], [1, "#e0662a"]])); }
  // cabeza
  const hy = 3 - (m > 1 ? .4 : 0), hr = 4.7 - m * .2;
  if (m < 3) {
    if (!ice) { g.beginPath(); g.moveTo(-3.2, 1.2); g.lineTo(-5.6, -.9); g.lineTo(-1.8, -1.2); g.closePath(); fillStroke(g, C.hoodD); }
    const hg = g.createRadialGradient(-1, 1, .5, 0, 3, 5.2); hg.addColorStop(0, C.hoodL); hg.addColorStop(1, ice ? C.hoodD : C.hood);
    g.beginPath(); g.arc(0, hy, hr, 0, 7); fillStroke(g, hg);
  } else { // la capucha se cae y se ve el pelo
    g.beginPath(); g.arc(0, hy + .3, hr - .3, 0, 7); fillStroke(g, vgrad(g, -2, 7, [[0, skL], [1, skT]]));
    g.fillStyle = C.hair; g.beginPath(); g.moveTo(-hr, hy);
    for (let k = 0; k <= 6; k++) { const a = Math.PI + k * Math.PI / 6; g.lineTo(Math.cos(a) * (hr + (k % 2 ? 1.2 : .1)), hy + Math.sin(a) * (hr + (k % 2 ? 1.2 : .1))); }
    g.lineTo(hr - .4, hy + .6); g.quadraticCurveTo(0, hy - 2.2, -hr + .4, hy + .6); g.closePath(); fillStroke(g, C.hair, .4);
  }
  // cara
  g.beginPath(); g.ellipse(2, hy + .7, 2.6 + m * .06, 2.3, 0, 0, 7); g.fillStyle = vgrad(g, 1, 6, [[0, lerpHex("#d9a27c", C.rage, mf)], [1, lerpHex("#b57a58", C.rage, mf * .7)]]); g.fill();
  if (m < 3 && ice) { g.beginPath(); g.ellipse(1.9, hy + .6, 3.2, 2.8, 0, 0, 7); g.lineWidth = 1; g.strokeStyle = "#ffffff"; g.stroke(); g.beginPath(); g.moveTo(-1.5, 1); g.quadraticCurveTo(-3.6, 4, -2.6, 7); g.lineWidth = 1.3; g.strokeStyle = C.hood; g.stroke(); }
  const glow = o.beam > 0 ? .9 : .32 + Math.sin(t * .1) * .08 + mf * .25;
  g.globalAlpha = Math.min(1, glow); g.beginPath(); g.ellipse(2.6, hy + .2, 2.2 + mf, 1.2 + mf * .4, 0, 0, 7); g.fillStyle = C.eyes[m]; g.fill(); g.globalAlpha = 1;
  g.fillStyle = big ? "#fff6c0" : "#effffe"; g.beginPath(); g.ellipse(1.7, hy + .2, .62, .8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(3.6, hy + .2, .62, .8, 0, 0, 7); g.fill();
  if (m >= 1) { g.strokeStyle = "#2a1410"; g.lineWidth = .35 + m * .08; g.beginPath(); g.moveTo(.6, hy - 1 - (m > 2 ? .3 : 0)); g.lineTo(2.8, hy - .4 + m * .1); g.moveTo(3.4, hy - .4 + m * .1); g.lineTo(4.6, hy - 1.2); g.stroke(); } // ceño fruncido
  g.strokeStyle = "#7a3a2a"; g.lineWidth = .4; g.beginPath(); if (m >= 2) { g.moveTo(2.2, hy + 2.2); g.lineTo(4, hy + 2.2); } else g.arc(3.1, hy + 1.7, 1, .3, 2.7); g.stroke();
  if (m >= 2) { g.fillStyle = "#fff"; g.fillRect(2.5, hy + 2.2, .5, .7); g.fillRect(3.4, hy + 2.2, .5, .7); }
  if (m >= 4) { g.strokeStyle = "rgba(120,20,10,.6)"; g.lineWidth = .25; g.beginPath(); g.moveTo(-.2, hy - 2.6); g.quadraticCurveTo(.4, hy - 1.6, 0, hy - .6); g.stroke(); }
}

function zombieArt(g, o) {
  const { type, s, t, i, ground } = o;
  let sk, skd, sh, shd;
  const SK = [["#8cd062", "#4f8a35"], ["#9ab8a8", "#5f7a6c"], ["#b4c470", "#78883e"]], SH = ["#6a4f8a", "#7a3a3a", "#3a5a7a"];
  if (type === "runner") { sk = "#d6b484"; skd = "#98724a"; sh = "#b03030"; }
  else if (type === "jumper") { sk = "#b898d8"; skd = "#76589a"; sh = "#2a5a44"; }
  else if (type === "spitter") { sk = "#c4cc5a"; skd = "#8a9430"; sh = "#6a5430"; }
  else if (type === "exploder") { sk = "#c8d070"; skd = "#8a9438"; sh = (o.fuse | 0) && (o.t >> 2) % 2 ? "#ffd0c0" : "#7a1a1a"; }
  else { [sk, skd] = SK[i % 3]; sh = SH[(i >> 1) % 3]; }
  shd = lerpHex(sh, "#000000", .4);
  g.lineCap = "round"; g.lineJoin = "round";
  const crouch = type === "jumper" && ground && o.tt % 90 > 70 ? 2 : 0, lean = type === "runner" ? 1.4 : 0;
  g.translate(0, crouch);
  // piernas
  const L = (hx, ang) => { g.save(); g.translate(hx, 10.6); g.rotate(ang); rr2(g, -1.5, 0, 3, 3.6 - crouch, 1.1); fillStroke(g, vgrad(g, 0, 4, [[0, "#4a4060"], [1, "#2a2438"]])); rr2(g, -1.8, 3 - crouch, 4, 1.6, .8); fillStroke(g, "#1c1824"); g.restore(); };
  L(-2, s > 0 ? -.5 : .45); L(2, s > 0 ? .45 : -.5);
  // brazo de atrás
  g.save(); g.translate(-2.6, 7.4); g.rotate(s > 0 ? .5 : -.2); rr2(g, -.8, 0, 1.8, 4.4, .9); fillStroke(g, sk); g.restore();
  // torso roto
  g.beginPath(); g.moveTo(-3.8, 6.4); g.quadraticCurveTo(0, 5.4, 3.8, 6.4); g.lineTo(3.9, 10.2);
  for (let k = 0; k < 5; k++) g.lineTo(3.9 - (k + 1) * 1.56, 10.2 + (k % 2 ? .9 : -.3)); g.lineTo(-3.9, 10.2); g.closePath();
  fillStroke(g, vgrad(g, 6, 11, [[0, lerpHex(sh, "#ffffff", .2)], [1, shd]]));
  g.fillStyle = skd; g.beginPath(); g.ellipse(-.6, 8.6, 1.2, 1, 0, 0, 7); g.fill(); // herida
  g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(1.2, 7.3, .5, 2.2);
  if (type === "runner") { g.fillStyle = "#f4e8d8"; rr2(g, -.8, 7, 1.6, 3.4, .6); g.fill(); }
  if (type === "spitter") { const gr = g.createRadialGradient(-.6, 8.8, .5, 0, 9, 4.6); gr.addColorStop(0, "#e8f58a"); gr.addColorStop(1, "#8a9a2a"); g.beginPath(); g.ellipse(0, 9, 4.8, 2.4, 0, 0, 7); fillStroke(g, gr); }
  if (type === "exploder") { // dinamita atada al pecho con la mecha encendida
    for (let k = 0; k < 3; k++) { rr2(g, -3.4 + k * 2.4, 6.6, 2, 5, .7); fillStroke(g, vgrad(g, 6.6, 11.6, [[0, "#ff5a4a"], [1, "#a01810"]]), .4); }
    g.fillStyle = "#222"; g.fillRect(-3.6, 8.2, 7.6, .8);
    g.strokeStyle = "#caa060"; g.lineWidth = .5; g.beginPath(); g.moveTo(0, 6.6); g.quadraticCurveTo(1.4, 4.6, 3, 5.4); g.stroke();
    const sp = (o.fuse | 0) > 0 ? 1.6 : .8 + Math.sin(t * .4) * .3; g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = "#ffd060"; g.beginPath(); g.arc(3, 5.4, sp, 0, 7); g.fill(); g.fillStyle = "rgba(255,160,40,.5)"; g.beginPath(); g.arc(3, 5.4, sp * 2.4, 0, 7); g.fill(); g.restore();
  }
  // cabeza
  g.save(); g.translate(lean, 0);
  g.beginPath(); g.ellipse(0, 2.7, 4.3, 3.9, 0, 0, 7); fillStroke(g, vgrad(g, -1, 6.5, [[0, lerpHex(sk, "#ffffff", .25)], [.6, sk], [1, skd]]));
  g.fillStyle = "#2c2018"; g.beginPath(); g.moveTo(-3.6, 1); g.quadraticCurveTo(-3, -1.8, -.2, -1.4); g.quadraticCurveTo(-1, .4, -3.6, 1); g.fill(); g.beginPath(); g.moveTo(1, -1.4); g.lineTo(2.6, -1.9); g.lineTo(2, -.2); g.fill();
  g.fillStyle = "#14090c"; g.beginPath(); g.ellipse(-1.2, 2.3, 1.2, 1.3, 0, 0, 7); g.fill(); // cuenca
  g.beginPath(); g.ellipse(2.4, 2.3, 1.3, 1.4, 0, 0, 7); g.fill();
  const eye = type === "runner" ? "#ff2a2a" : Math.sin(t * .1 + i) > 0 ? "#ff4a4a" : "#ffb030";
  g.fillStyle = eye; g.beginPath(); g.arc(2.6, 2.3, .65, 0, 7); g.fill(); g.fillStyle = "rgba(255,80,60,.35)"; g.beginPath(); g.arc(2.6, 2.3, 1.7, 0, 7); g.fill();
  g.fillStyle = "#2a1316"; rr2(g, .2, 4.4, 3.8, 1.5, .7); g.fill(); g.fillStyle = "#efe6d6"; g.fillRect(.6, 4.4, .6, .7); g.fillRect(1.9, 4.4, .6, .7); g.fillRect(3.1, 4.4, .6, .7);
  if (type === "jumper") { g.fillStyle = "#e06080"; rr2(g, 3.2, 5.2 + (Math.sin(t * .2 + i) > 0 ? .5 : 0), 1.8, .9, .45); g.fill(); }
  if (type === "spitter" && o.tt % 120 > 96) { g.fillStyle = "#1a0a0c"; g.beginPath(); g.ellipse(2.2, 5.2, 1.6, 1.3, 0, 0, 7); g.fill(); g.fillStyle = "#b6f03a"; rr2(g, 2, 6, .9, 2.4, .4); g.fill(); }
  if (type === "shielder") { g.beginPath(); g.moveTo(-4.6, 2); g.quadraticCurveTo(-4.4, -2.8, 0, -2.8); g.quadraticCurveTo(4.4, -2.8, 4.6, 2); g.closePath(); fillStroke(g, vgrad(g, -3, 2, [[0, "#9aa6b8"], [1, "#4a5466"]])); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(-2.5, -2.2, 3, .6); }
  { // accesorios según el escenario: cada mundo tiene sus propios zombis
    const th = o.theme;
    if (th === "snow") { g.fillStyle = "#4a9ad8"; g.beginPath(); g.moveTo(-4.4, 1.4); g.quadraticCurveTo(-4.2, -3.6, 0, -3.8); g.quadraticCurveTo(4.4, -3.6, 4.4, 1.4); g.closePath(); fillStroke(g, vgrad(g, -4, 1.6, [[0, "#8ad0ff"], [1, "#2a6aa8"]]), .4); g.fillStyle = "#f4faff"; g.beginPath(); g.arc(0, -4.2, 1.3, 0, 7); g.fill(); g.fillRect(-4.4, .6, 8.8, .9); g.fillStyle = "#c0382a"; rr2(g, -4, 6, 8, 1.6, .7); g.fill(); }
    else if (th === "desert") { g.strokeStyle = "#e8d8a8"; g.lineWidth = 1; for (const [y0, y1] of [[-.6, .4], [1.2, 2.2], [3.4, 3.8]]) { g.beginPath(); g.moveTo(-4.2, y0); g.lineTo(4.2, y1); g.stroke(); } g.strokeStyle = "rgba(90,60,20,.4)"; g.lineWidth = .3; g.beginPath(); g.moveTo(-4, .2); g.lineTo(4, 1); g.moveTo(-4, 2.8); g.lineTo(4, 3.4); g.stroke(); }
    else if (th === "jungle") { for (const [a, b, r] of [[-3, -1.6, .8], [-1, -2.6, .9], [1.4, -2.7, .9], [3.2, -1.4, .8]]) { g.save(); g.translate(a, b); g.rotate(a * .3); g.beginPath(); g.ellipse(0, -1, r * .8, r * 1.8, 0, 0, 7); fillStroke(g, "#3aa84a", .3); g.restore(); } g.strokeStyle = "#2a7a30"; g.lineWidth = .5; g.beginPath(); g.moveTo(-4, 5.6); g.quadraticCurveTo(0, 7.4, 4, 5.6); g.stroke(); }
    else if (th === "carnival") { const cl = ["#ff5a8a", "#ffcc33", "#5ae0ff", "#9aff6a"]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-4 + k * 2, -1.2 - (k % 2) * .9, 1.5, 0, 7); fillStroke(g, cl[k % 4], .3); } g.beginPath(); g.arc(3.4, 3.6, 1.1, 0, 7); fillStroke(g, "#ff3030", .3); }
    else if (th === "moon") { g.beginPath(); g.ellipse(0, 2.2, 5.6, 5.2, 0, 0, 7); g.fillStyle = "rgba(150,210,255,.22)"; g.fill(); g.lineWidth = .8; g.strokeStyle = "rgba(220,240,255,.85)"; g.stroke(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(-2.6, -.8, 1.3, .6, -.7, 0, 7); g.fill(); }
  }
  g.restore();
  // brazo extendido hacia adelante
  g.save(); g.translate(2.6, 7.6); g.rotate(type === "runner" ? .2 : s > 0 ? -.1 : .12);
  rr2(g, -.8, -.9, 6.8, 1.9, .9); fillStroke(g, vgrad(g, -.9, 1, [[0, lerpHex(sk, "#ffffff", .2)], [1, skd]]));
  g.beginPath(); g.arc(6.2, 0, 1.1, 0, 7); fillStroke(g, sk, .4); g.restore();
  // escudo
  if (type === "shielder") {
    if (!o.broken) { g.save(); g.translate(5.6, 8.4); rr2(g, -1.6, -5.4, 3.8, 11, 1.4); fillStroke(g, vgrad(g, -5, 6, [[0, "#c4ceda"], [.5, "#7a8496"], [1, "#4a5466"]])); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(-.9, -4.6, .7, 8.6); g.restore(); }
    else { rr2(g, 5.4, 8.5, 1.6, 3.4, .6); fillStroke(g, "#6a7486"); }
  }
}

function batArt(g, o) {
  const up = Math.sin(o.t * .4 + o.i) > 0, fl = up ? -1 : 1;
  g.lineJoin = "round";
  for (const sd of [-1, 1]) { // alas con membrana
    g.save(); g.scale(sd, 1);
    g.beginPath(); g.moveTo(1.2, 4); g.quadraticCurveTo(4 + 1, 4 + fl * 5, 9, 4 + fl * 3.2); g.quadraticCurveTo(8, 4 + fl * 1.5, 7.4, 5.2 + fl * 1.2); g.quadraticCurveTo(6, 5.8 + fl * .4, 5.2, 6.2); g.quadraticCurveTo(4, 6, 3.2, 6.8); g.quadraticCurveTo(2.4, 6.2, 1.2, 6.6); g.closePath();
    fillStroke(g, vgrad(g, 0, 9, [[0, "#6a3a80"], [1, "#2e1a3a"]]));
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = .4; g.beginPath(); g.moveTo(1.6, 4.4); g.lineTo(8.2, 4 + fl * 3); g.moveTo(1.8, 5); g.lineTo(5.4, 6); g.stroke();
    g.restore();
  }
  g.beginPath(); g.ellipse(0, 4.6, 2.5, 3.2, 0, 0, 7); fillStroke(g, vgrad(g, 1, 8, [[0, "#6a3a80"], [1, "#3a2048"]]));
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 1, 1.8); g.lineTo(sd * 2.4, -.4); g.lineTo(sd * 2.6, 2.2); g.closePath(); fillStroke(g, "#4a2a5a"); g.fillStyle = "#ff3030"; g.beginPath(); g.arc(sd * 1.1, 3.3, .6, 0, 7); g.fill(); }
  g.fillStyle = "rgba(255,50,50,.3)"; g.beginPath(); g.arc(-1.1, 3.3, 1.6, 0, 7); g.arc(1.1, 3.3, 1.6, 0, 7); g.fill();
  g.fillStyle = "#f2ead8"; g.fillRect(-.8, 5.8, .5, 1); g.fillRect(.3, 5.8, .5, 1);
}

// ---------- Zombis grandes y jefes ----------
function ellipseFill(g, x, y, rx, ry, fill, lw = .5) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); fillStroke(g, fill, lw); }
function eyeGlow(g, x, y, r, col) { g.fillStyle = col; g.globalAlpha = .35; g.beginPath(); g.arc(x, y, r * 2.2, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

function bruteArt(g, o) {
  const { s } = o; g.lineCap = g.lineJoin = "round";
  const sk = "#7a9a6a", skd = "#4f6a44";
  for (const [x, sw] of [[-5.5, s > 0 ? -1 : 0], [1.4, s > 0 ? 0 : -1]]) { rr2(g, x, 14.5 + sw, 4.2, 5.5 - sw, 1.4); fillStroke(g, vgrad(g, 14, 20, [[0, "#3a3446"], [1, "#1c1824"]])); }
  rr2(g, -10, 7.5, 3.6, 7.5, 1.6); fillStroke(g, skd);
  rr2(g, -7.8, 6, 15.6, 10, 3.2); fillStroke(g, vgrad(g, 6, 16, [[0, "#7a7a92"], [.3, "#5a5a70"], [1, "#32323f"]]));
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = .4; g.beginPath(); g.moveTo(-5, 7); g.lineTo(-5, 15); g.moveTo(5, 7); g.lineTo(5, 15); g.stroke();
  ellipseFill(g, 0, 12, 3.4, 2.5, vgrad(g, 9, 14.5, [[0, sk], [1, skd]])); g.fillStyle = "#c0b8a8"; g.fillRect(-7, 14, 14, 1);
  const ay = 8 + (s > 0 ? 0 : 1);
  g.save(); g.translate(5, ay); g.rotate(s > 0 ? -.1 : .12); rr2(g, 0, -2, 8.5, 4.4, 2.2); fillStroke(g, vgrad(g, -2, 2.4, [[0, "#9ab88a"], [1, skd]]));
  ellipseFill(g, 9.4, .2, 3, 2.8, vgrad(g, -3, 3, [[0, "#8aa87a"], [1, skd]])); g.fillStyle = "rgba(0,0,0,.25)"; for (const k of [-1, 0, 1]) g.fillRect(10.6, k * 1.4 - .2, .4, 1); g.restore();
  ellipseFill(g, 5.8, 7.2, 3.4, 2.4, vgrad(g, 5, 9, [[0, "#8a8aa2"], [1, "#4a4a5c"]]));
  ellipseFill(g, 0, 3.4, 4.3, 3.8, vgrad(g, 0, 7, [[0, "#9ab88a"], [1, skd]]));
  g.fillStyle = "#d8d0c0"; g.fillRect(-3.4, 1.1, 6.8, .9);
  eyeGlow(g, 1, 3.1, .7, "#ff3030"); eyeGlow(g, 3, 3.1, .7, "#ff3030");
  rr2(g, -1.4, 5.1, 5, 1.5, .7); g.fillStyle = "#1a0c0c"; g.fill(); g.fillStyle = "#eee"; g.fillRect(-.9, 5.1, .7, .8); g.fillRect(.6, 5.1, .7, .8); g.fillRect(2.1, 5.1, .7, .8);
}

function bossArt(g, o) {
  const { s, t } = o; g.lineCap = g.lineJoin = "round";
  // capa
  g.beginPath(); g.moveTo(-9, 12); g.lineTo(9, 12);
  for (let k = 0; k <= 6; k++) g.lineTo(13 - k * 26 / 6, 34 + Math.sin(t * .1 + k) * 1.2 + (k % 2 ? 1.2 : 0));
  g.closePath(); fillStroke(g, vgrad(g, 12, 36, [[0, "#7a2a8a"], [1, "#3a1048"]]));
  for (const [x, sw] of [[-8, s > 0 ? -1 : 0], [2, s > 0 ? 0 : -1]]) { rr2(g, x, 28 + sw, 6, 8 - sw, 2); fillStroke(g, vgrad(g, 28, 36, [[0, "#4a4258"], [1, "#1c1824"]])); }
  rr2(g, -14, 14, 5, 10, 2.4); fillStroke(g, "#5a7a3a");
  rr2(g, -9.5, 12, 19, 17, 4); fillStroke(g, vgrad(g, 12, 29, [[0, "#5a7a5a"], [.3, "#3a5a3a"], [1, "#1f321f"]]));
  g.strokeStyle = "rgba(186,214,150,.55)"; g.lineWidth = .5; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-5, 15 + k * 3.6); g.quadraticCurveTo(0, 16.4 + k * 3.6, 5, 15 + k * 3.6); g.stroke(); }
  rr2(g, -9.5, 25.6, 19, 2.8, 1); fillStroke(g, vgrad(g, 25.6, 28.4, [[0, "#f0c840"], [1, "#a07818"]])); ellipseFill(g, 0, 27, 1.8, 1.5, "#e02a4a");
  const ay = 14 + (s > 0 ? 0 : 1);
  rr2(g, 8, ay - 1, 11, 5.6, 2.8); fillStroke(g, vgrad(g, ay - 1, ay + 4.6, [[0, "#a8cc72"], [1, "#5a7a3a"]]));
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(18.4, ay - .4 + k * 2); g.lineTo(23, ay + .2 + k * 2); g.lineTo(18.4, ay + 1.2 + k * 2); g.closePath(); fillStroke(g, "#ece4d0", .35); }
  rr2(g, -7.4, 1, 14.8, 12.4, 4.4); fillStroke(g, vgrad(g, 1, 13.4, [[0, "#a8cc72"], [1, "#5a7a3a"]]));
  g.strokeStyle = "#1c2a10"; g.lineWidth = .9; g.beginPath(); g.moveTo(-5.4, 3.6); g.lineTo(-1.2, 5); g.moveTo(5.4, 3.6); g.lineTo(1.2, 5); g.stroke();
  const pu = .6 + Math.sin(t * .2) * .3; g.globalAlpha = .4 * pu; g.fillStyle = "#ff2a2a"; g.beginPath(); g.ellipse(0, 5.6, 7, 3, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  eyeGlow(g, -2.8, 6, 1.1, "#ffdada"); eyeGlow(g, 3, 6, 1.1, "#ffdada");
  g.fillStyle = "#1a0606"; g.beginPath(); g.moveTo(-4, 9.4); g.lineTo(4, 9.4); g.lineTo(3.4, 12.4); g.lineTo(-3.4, 12.4); g.closePath(); g.fill();
  g.fillStyle = "#f2ead8"; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-3.8 + k * 1.9, 9.4); g.lineTo(-2.9 + k * 1.9, 11); g.lineTo(-2 + k * 1.9, 9.4); g.fill(); }
  // corona
  g.beginPath(); g.moveTo(-7.4, 0); g.lineTo(-7.4, -7.6); g.lineTo(-3.6, -3); g.lineTo(0, -8.6); g.lineTo(3.6, -3); g.lineTo(7.4, -7.6); g.lineTo(7.4, 0); g.closePath();
  fillStroke(g, vgrad(g, -8, 0, [[0, "#fff0a0"], [.4, "#e8b830"], [1, "#a07818"]]));
  ellipseFill(g, -3, -1.6, 1.1, 1.1, "#e02a4a", .3); ellipseFill(g, 3, -1.6, 1.1, 1.1, "#2a8ae0", .3);
}

function diggerArt(g, o) {
  const { s } = o; g.lineCap = g.lineJoin = "round";
  for (const [x, sw] of [[-7, s > 0 ? -1 : 0], [2, s > 0 ? 0 : -1]]) { rr2(g, x, 24 + sw, 5, 6 - sw, 1.6); fillStroke(g, vgrad(g, 24, 30, [[0, "#3a3246"], [1, "#1c1824"]])); }
  rr2(g, -9, 9.6, 18, 15.4, 3.6); fillStroke(g, vgrad(g, 9, 25, [[0, "#6a4a34"], [1, "#2e2014"]]));
  g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = .5; g.beginPath(); g.moveTo(0, 10.4); g.lineTo(0, 24); g.stroke();
  g.fillStyle = "#8a6a4a"; rr2(g, -6.4, 17, 4, 3.4, .8); g.fill(); g.fillStyle = "#5a3a24"; rr2(g, 3, 13, 3.6, 3, .8); g.fill();
  // pala
  g.strokeStyle = "#7a5a3a"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(8.4, 3); g.lineTo(8.4, 26); g.stroke(); g.strokeStyle = "#a07c52"; g.lineWidth = .5; g.beginPath(); g.moveTo(8, 3); g.lineTo(8, 26); g.stroke();
  g.beginPath(); g.moveTo(5, 25); g.quadraticCurveTo(8.4, 23.4, 12, 25); g.lineTo(11, 30); g.lineTo(6, 30); g.closePath(); fillStroke(g, vgrad(g, 24, 30, [[0, "#c8d2e0"], [1, "#6a7488"]]));
  rr2(g, 3.6, 13.4, 6.4, 3, 1.5); fillStroke(g, "#6a4a34"); ellipseFill(g, 8.4, 15, 1.5, 1.5, "#9aa094", .4);
  ellipseFill(g, 0, 6, 6, 5.2, vgrad(g, 1, 11, [[0, "#b4baae"], [1, "#6a7064"]]));
  eyeGlow(g, -1.6, 5.4, .8, "#ffd040"); eyeGlow(g, 2.8, 5.4, .8, "#ffd040");
  g.strokeStyle = "#2a1a1a"; g.lineWidth = .5; g.beginPath(); g.moveTo(-2, 8.6); g.lineTo(3, 8.6); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-1.5 + k * 1.4, 8.1); g.lineTo(-1.5 + k * 1.4, 9.1); g.stroke(); }
  rr2(g, -8.4, .4, 16.8, 2.2, 1.1); fillStroke(g, "#141018"); rr2(g, -5.4, -7, 10.8, 8, 1.6); fillStroke(g, vgrad(g, -7, 1, [[0, "#2a2434"], [1, "#0c0a10"]])); g.fillStyle = "#8a1a2a"; g.fillRect(-5.2, -1.6, 10.4, 1.4);
}

function firemanArt(g, o) {
  const { s, t } = o; g.lineCap = g.lineJoin = "round";
  rr2(g, -13, 10.4, 5.4, 13.6, 2.4); fillStroke(g, vgrad(g, 10, 24, [[0, "#aab4c4"], [1, "#4a5266"]])); g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(-12, 12, .9, 9);
  for (const [x, sw] of [[-7, s > 0 ? -1 : 0], [2, s > 0 ? 0 : -1]]) { rr2(g, x, 24 + sw, 5.4, 6 - sw, 1.6); fillStroke(g, vgrad(g, 24, 30, [[0, "#3a3246"], [1, "#1c1824"]])); }
  rr2(g, -8.4, 9.6, 16.8, 15.4, 3.6); fillStroke(g, vgrad(g, 9, 25, [[0, "#e04a34"], [.5, "#b02a1a"], [1, "#6a1208"]]));
  g.fillStyle = "#f2d040"; g.fillRect(-8.2, 16.6, 16.4, 1.8); g.fillRect(-8.2, 21.6, 16.4, 1.1); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(-8.2, 16.6, 16.4, .5);
  g.strokeStyle = "#2a2a2a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, 12); g.quadraticCurveTo(-3, 6, 4, 13); g.stroke();
  rr2(g, 5, 13.2, 7, 3.4, 1.7); fillStroke(g, "#b02a1a"); rr2(g, 11, 11.8, 4.6, 5.6, 1.4); fillStroke(g, "#2a2a2a"); rr2(g, 15, 13, 2.6, 3, 1); fillStroke(g, "#8a8a92");
  const fl = 1 + Math.sin(t * .5) * .25; if (o.tt % 100 > 70) { glowDot(g, 20, 14.5, 4.4 * fl, "#ffb030"); glowDot(g, 18.6, 14.5, 2.4 * fl, "#fff0a0"); } else glowDot(g, 18, 14.5, 1.6, "#ff9a30");
  ellipseFill(g, 0, 6, 5.4, 4.8, vgrad(g, 1, 11, [[0, "#a6cc72"], [1, "#5a7a3a"]]));
  eyeGlow(g, 2.6, 5.4, .8, "#ff3030"); g.strokeStyle = "#2a1a1a"; g.lineWidth = .5; g.beginPath(); g.moveTo(-1, 8.4); g.lineTo(3.2, 8.4); g.stroke();
  g.beginPath(); g.moveTo(-8, 2.4); g.quadraticCurveTo(-8, -3.4, 0, -3.8); g.quadraticCurveTo(8, -3.4, 8, 2.4); g.closePath(); fillStroke(g, vgrad(g, -4, 3, [[0, "#e24a34"], [1, "#9a1a10"]]));
  rr2(g, -9.4, 1.2, 18.8, 1.8, .9); fillStroke(g, "#7a1208"); ellipseFill(g, .6, -.6, 1.6, 1.4, "#f2c94c", .35);
}
function glowDot(g, x, y, r, col) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = .75; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }

function toadArt(g, o) {
  const air = !o.ground; g.lineCap = g.lineJoin = "round";
  const c1 = "#7aba52", c2 = "#3a6a2a";
  if (air) { for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 12.4, 16.8, 2.8, 4.6, sd * .25, 0, 7); fillStroke(g, c2); } }
  else { for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 11.4, 17.2, 4.8, 2.8, 0, 0, 7); fillStroke(g, c2); } }
  ellipseFill(g, 0, 11.6, 13.8, 6.6, vgrad(g, 5, 18, [[0, c1], [1, c2]]));
  g.beginPath(); g.ellipse(0, 15, 10, 3.2, 0, 0, Math.PI); g.fillStyle = "#c8d080"; g.fill();
  for (const [a, b, r] of [[-8, 8, 1.4], [-2, 7, 1.1], [4, 7.4, 1.5], [9, 9.6, 1.2], [-4, 10.6, 1]]) { ellipseFill(g, a, b, r, r * .8, "#8a3aa8", .3); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(a - .3, b - .3, r * .3, 0, 7); g.fill(); }
  for (const sd of [-1, 1]) { ellipseFill(g, sd * 6.6, 3.4, 4, 3.5, vgrad(g, 0, 7, [[0, "#9ad272"], [1, c1]])); ellipseFill(g, sd * 6.6, 3.2, 2.7, 2.5, "#f4f4d8", .3); eyeGlow(g, sd * 6.6 + 1, 3.2, 1, "#e02020"); }
  g.strokeStyle = "#1a0e0e"; g.lineWidth = .8; g.beginPath(); g.moveTo(-10, 13); g.quadraticCurveTo(0, 15.6, 10, 13); g.stroke();
  if (o.tt % 90 > 80 && o.ground) { g.beginPath(); g.ellipse(0, 14.4, 2.2, 1.7, 0, 0, 7); fillStroke(g, "#e06080", .3); }
}

function doctorArt(g, o) {
  const { s, t } = o; g.lineCap = g.lineJoin = "round";
  for (const [x, sw] of [[-5.4, s > 0 ? -1 : 0], [1.4, s > 0 ? 0 : -1]]) { rr2(g, x, 22 + sw, 4, 6 - sw, 1.4); fillStroke(g, vgrad(g, 22, 28, [[0, "#3a3246"], [1, "#1c1824"]])); }
  rr2(g, -7.4, 9.6, 14.8, 14.4, 3.4); fillStroke(g, vgrad(g, 9, 24, [[0, "#ffffff"], [1, "#b8c4d4"]]));
  g.strokeStyle = "rgba(90,110,140,.55)"; g.lineWidth = .5; g.beginPath(); g.moveTo(0, 10.6); g.lineTo(0, 23.6); g.stroke();
  rr2(g, 1.8, 13, 3.4, 2.4, .6); fillStroke(g, "#5a8ad0", .3); g.fillStyle = "#8a3aa8"; g.beginPath(); g.ellipse(5, 18.6, 1.7, 1.2, .4, 0, 7); g.fill();
  const ay = 12.6 + Math.sin(t * .1) * .4;
  rr2(g, 6, ay, 6, 2.6, 1.3); fillStroke(g, "#e8eef5"); rr2(g, 10.6, ay - .3, 6, 3.2, .8); fillStroke(g, "rgba(210,236,255,.8)", .35); g.fillStyle = "#6aff8a"; g.fillRect(11.4, ay + .3, 4, 2); g.strokeStyle = "#cfd8e4"; g.lineWidth = .5; g.beginPath(); g.moveTo(16.6, ay + 1.3); g.lineTo(19, ay + 1.3); g.stroke();
  ellipseFill(g, 0, 5.4, 5.2, 4.7, vgrad(g, 1, 10, [[0, "#b4d4a4"], [1, "#6a906a"]]));
  rr2(g, -4.8, 3, 9.6, 3.2, 1.6); fillStroke(g, "#2a2a34", .4); g.fillStyle = "#7affd0"; g.globalAlpha = .9; g.beginPath(); g.ellipse(-1.8, 4.6, 1.5, 1.1, 0, 0, 7); g.ellipse(2.2, 4.6, 1.5, 1.1, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = "#2a1a1a"; g.lineWidth = .5; g.beginPath(); g.moveTo(-1.6, 8.4); g.lineTo(2.6, 8.4); g.stroke();
  g.fillStyle = "#c8c8d0"; g.beginPath(); g.moveTo(-5, 1.4); g.quadraticCurveTo(-4, -2.4, 0, -2); g.quadraticCurveTo(4, -2.4, 5, 1.4); g.quadraticCurveTo(0, 0, -5, 1.4); g.fill(); g.lineWidth = .4; g.strokeStyle = OL; g.stroke();
}
