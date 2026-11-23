// Personajes y zombis dibujados con formas suaves, degradados y contorno. No dependen del juego:
// reciben un contexto ya trasladado al centro-arriba del sprite (x=0 es el centro, y=0 la cabeza) y mirando a la derecha.
const OL = "rgba(14,8,28,.6)";
function rr2(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function fillStroke(g, fill, lw = .5) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); }

function heroArt(g, o) {
  const { ice, tier, run, air, s, t } = o, big = tier > 0, x2 = tier === 2;
  const C = ice
    ? { coat: "#3a6ab8", coatL: "#8fb4f0", coatD: "#24488a", tail: ["#f4f8ff", "#b8cce8"], legs: "#2a2a4a", legsL: "#44446e", boots: "#d0e0f0", hood: "#dfe9fb", hoodL: "#ffffff", hoodD: "#9fb4d8", eyes: ["#9ad0ff", "#3a7aff", "#7a5aff"], belt: "#6a8ad8" }
    : { coat: "#1f7a7a", coatL: "#35b0aa", coatD: "#115050", tail: ["#ffa04a", "#e2572a"], legs: "#2b2340", legsL: "#463a66", boots: "#6a4630", hood: "#1a7470", hoodL: "#2f9e98", hoodD: "#0e4a48", eyes: ["#7ff5ff", "#ffd84a", "#ff5ac8"], belt: "#ff8a3d" };
  g.lineCap = "round"; g.lineJoin = "round";
  const len = 4 + Math.min(5, Math.abs(o.vx) * 2.5) + (air ? 2 : 0);
  // bufanda (Chispa) o trenza (Escarcha) que flamea
  const pts = [];
  for (let k = 0; k <= 8; k++) { const tt = k / 8; pts.push(ice ? [-3.4 - tt * len * .5, 3.8 + tt * (5 + len * .25) + Math.sin(t * .3 - tt * 4) * tt * 1.2] : [-3.2 - tt * len, 7.2 + Math.sin(t * .3 - tt * 3.5) * tt * 1.8 - (air ? tt * 1.5 : 0)]); }
  const tail = (w, c) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.lineWidth = w; g.strokeStyle = c; g.stroke(); };
  const tg = g.createLinearGradient(pts[0][0], pts[0][1], pts[8][0], pts[8][1]); tg.addColorStop(0, C.tail[0]); tg.addColorStop(1, C.tail[1]);
  tail(ice ? 2.6 : 3, OL); tail(ice ? 1.8 : 2.2, tg);
  // brazo de atrás
  const swing = air ? .7 : run ? s * .9 : .05;
  g.save(); g.translate(-2.8, 8.2); g.rotate(swing); rr2(g, -.9, -.9, 1.9, 4.2, .9); fillStroke(g, C.coatD); g.restore();
  // piernas
  const leg = (hx, ang, back) => {
    g.save(); g.translate(hx, 10.6); g.rotate(ang);
    rr2(g, -1.5, 0, 3, 3.5, 1.1); fillStroke(g, back ? C.legs : vgrad(g, 0, 4, [[0, C.legsL], [1, C.legs]]));
    rr2(g, -1.7, 2.9, 4.4, 2, 1); fillStroke(g, vgrad(g, 2.9, 4.9, [[0, lerpHex(C.boots, "#ffffff", .25)], [1, C.boots]]));
    g.restore();
  };
  leg(-1.7, air ? -.5 : run ? -s * .75 : -.1, true); leg(1.7, air ? .45 : run ? s * .75 : .1, false);
  // torso
  const tw = big ? 9.8 : 8.4;
  rr2(g, -tw / 2, 6.3, tw, 5, 2); fillStroke(g, vgrad(g, 6.3, 11.3, [[0, C.coatL], [.45, C.coat], [1, C.coatD]]));
  g.fillStyle = C.belt; g.fillRect(-tw / 2 + .4, 10.1, tw - .8, .9);
  g.fillStyle = "rgba(255,255,255,.22)"; rr2(g, -tw / 2 + .8, 6.9, 1.6, 3, .8); g.fill();
  if (big) { g.fillStyle = "rgba(0,0,0,.18)"; rr2(g, -.4, 7, .8, 3.5, .4); g.fill(); }
  // brazo de adelante (con el puño)
  g.save(); g.translate(tw / 2 - 1.2, 8.1); g.rotate(air ? -.5 : run ? -s * .85 : -.12);
  const aw = big ? 2.8 : 1.9; rr2(g, -.9, -aw / 2, 4.2, aw, aw / 2); fillStroke(g, vgrad(g, -aw / 2, aw / 2, [[0, C.coatL], [1, C.coatD]]));
  g.beginPath(); g.arc(3.9, 0, big ? 1.5 : 1, 0, 7); fillStroke(g, "#f0c8a0", .4); g.restore();
  // cuello / bufanda
  rr2(g, -3.9, 5.2, 7.8, 2.4, 1.2); fillStroke(g, ice ? vgrad(g, 5.2, 7.6, [[0, "#ffffff"], [1, "#cfdcf2"]]) : vgrad(g, 5.2, 7.6, [[0, "#ffb060"], [1, "#e0662a"]]));
  // capucha
  if (!ice) { g.beginPath(); g.moveTo(-3.2, 1.2); g.lineTo(-5.6, -.9); g.lineTo(-1.8, -1.2); g.closePath(); fillStroke(g, C.hoodD); }
  const hg = g.createRadialGradient(-1, 1, .5, 0, 3, 5.2); hg.addColorStop(0, C.hoodL); hg.addColorStop(1, ice ? C.hoodD : C.hood);
  g.beginPath(); g.arc(0, 3, 4.7, 0, 7); fillStroke(g, hg);
  // cara
  g.beginPath(); g.ellipse(2, 3.7, 2.6, 2.3, 0, 0, 7); g.fillStyle = vgrad(g, 1, 6, [[0, "#d9a27c"], [1, "#b57a58"]]); g.fill();
  if (ice) { g.beginPath(); g.ellipse(1.9, 3.6, 3.2, 2.8, 0, 0, 7); g.lineWidth = 1; g.strokeStyle = "#ffffff"; g.stroke(); g.beginPath(); g.moveTo(-1.5, 1); g.quadraticCurveTo(-3.6, 4, -2.6, 7); g.lineWidth = 1.3; g.strokeStyle = C.hood; g.stroke(); g.beginPath(); g.arc(3.9, -.8, .6, 0, 7); g.fillStyle = "#9ad0ff"; g.fill(); }
  // ojos brillantes
  const glow = o.beam > 0 ? .85 : .3 + Math.sin(t * .1) * .08;
  g.globalAlpha = glow; g.beginPath(); g.ellipse(2.6, 3.2, 2.2, 1.2, 0, 0, 7); g.fillStyle = C.eyes[tier]; g.fill(); g.globalAlpha = 1;
  g.fillStyle = big ? "#fff6c0" : "#effffe"; g.beginPath(); g.ellipse(1.7, 3.2, .62, .85, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(3.6, 3.2, .62, .85, 0, 0, 7); g.fill();
  g.strokeStyle = "#7a4a3a"; g.lineWidth = .4; g.beginPath(); g.arc(3.1, 4.7, 1, .3, 2.7); g.stroke();
  if (x2) { g.fillStyle = "#fff"; g.fillRect(2.4, 5, .5, .8); g.fillRect(3.5, 5, .5, .8); }
}

function zombieArt(g, o) {
  const { type, s, t, i, ground } = o;
  let sk, skd, sh, shd;
  const SK = [["#8cd062", "#4f8a35"], ["#9ab8a8", "#5f7a6c"], ["#b4c470", "#78883e"]], SH = ["#6a4f8a", "#7a3a3a", "#3a5a7a"];
  if (type === "runner") { sk = "#d6b484"; skd = "#98724a"; sh = "#b03030"; }
  else if (type === "jumper") { sk = "#b898d8"; skd = "#76589a"; sh = "#2a5a44"; }
  else if (type === "spitter") { sk = "#c4cc5a"; skd = "#8a9430"; sh = "#6a5430"; }
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
