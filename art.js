// Texturas dibujadas con formas suaves (no píxeles): se generan una vez y se reutilizan.
// Cada función recibe un contexto 2D ya escalado y la paleta; no usa nada del juego.
const rngA = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const lerpHex = (a, b, t) => {
  const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0")).join("");
};
const rgbaA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
function wrap9(T, fn) { for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) { fn(dx, dy); } } // para que las texturas encajen sin costuras
function rrect(x, X, Y, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }

// Tierra / piedra con granulado, guijarros y grietas
function dirtArt(x, T, v, d, opts = {}) {
  const r = rngA(1000 + v * 77), h = opts.h || T, [d1, d2, d3, d4] = d;
  const lg = x.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, lerpHex(d1, d2, .2)); lg.addColorStop(1, lerpHex(d2, d3, .55));
  x.fillStyle = lg; x.fillRect(0, 0, T, h);
  // manchas grandes de tono
  for (let i = 0; i < 5; i++) { const px = r() * T, py = r() * h, rad = 4 + r() * 5, c = r() > .5 ? d4 : d3; wrap9(T, (dx, dy) => { const gr = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad); gr.addColorStop(0, rgbaA(c, .28)); gr.addColorStop(1, rgbaA(c, 0)); x.fillStyle = gr; x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2); }); }
  // granulado
  for (let i = 0; i < 46; i++) { const px = r() * T, py = r() * h, rad = .3 + r() * .8, c = r() > .55 ? d4 : d3; x.fillStyle = rgbaA(c, .35 + r() * .4); wrap9(T, (dx, dy) => { x.beginPath(); x.arc(px + dx, py + dy, rad, 0, 7); x.fill(); }); }
  // guijarros con luz y sombra
  for (let i = 0; i < 2; i++) {
    if (r() > .55) continue;
    const px = 2 + r() * (T - 4), py = 3 + r() * (h - 6), w = 1.2 + r() * 1.6, hh = w * (.6 + r() * .3), base = lerpHex(d4, "#8a7a6a", .5);
    wrap9(T, (dx, dy) => {
      x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.ellipse(px + dx + .4, py + dy + .7, w, hh, 0, 0, 7); x.fill();
      const gr = x.createRadialGradient(px + dx - w * .3, py + dy - hh * .4, .2, px + dx, py + dy, w); gr.addColorStop(0, lerpHex(base, "#ffffff", .25)); gr.addColorStop(1, lerpHex(base, "#000000", .35));
      x.fillStyle = gr; x.beginPath(); x.ellipse(px + dx, py + dy, w, hh, 0, 0, 7); x.fill();
    });
  }
  // grietas finas
  if (v % 2 === 0) { x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = .5; const sx = r() * T, sy = r() * h * .6 + 2; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + 2 + r() * 2, sy + 2 + r()); x.lineTo(sx + 1 + r() * 3, sy + 5 + r() * 2); x.stroke(); }
}
// Capa de pasto con briznas curvas y sombra proyectada sobre la tierra
function grassArt(x, T, v, gs, oy, swamp) {
  const r = rngA(500 + v * 31), [g1, g2, g3] = gs;
  const sh = x.createLinearGradient(0, oy + 3, 0, oy + 10); sh.addColorStop(0, "rgba(0,0,0,.45)"); sh.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = sh; x.fillRect(0, oy + 3, T, 7);
  const body = x.createLinearGradient(0, oy - 1, 0, oy + 5); body.addColorStop(0, g1); body.addColorStop(.55, g2); body.addColorStop(1, g3);
  x.fillStyle = body; x.beginPath(); x.moveTo(0, oy - 1); x.lineTo(T, oy - 1); x.lineTo(T, oy + 3.5);
  for (let xx = T; xx >= 0; xx -= 1) x.lineTo(xx, oy + 3.4 + Math.sin(xx / T * 6.2832 * 2 + v) * 1.1 + (r() - .5) * .5);
  x.closePath(); x.fill();
  // flecos que cuelgan
  for (let i = 0; i < 4; i++) { const px = r() * T, len = (swamp ? 3 : 1.5) + r() * 2.2; x.fillStyle = g3; wrap9(T, (dx) => { x.beginPath(); x.moveTo(px + dx - .8, oy + 3.2); x.quadraticCurveTo(px + dx, oy + 3.5 + len, px + dx + .8, oy + 3.2); x.fill(); }); }
  // briznas
  for (let i = 0; i < 12; i++) {
    const px = (i + r() * .8) * T / 12, hgt = 2.5 + r() * 3.5, lean = (r() - .5) * 2.4, c = [g1, g2, lerpHex(g1, "#ffffff", .25)][(r() * 3) | 0];
    wrap9(T, (dx) => { x.fillStyle = c; x.beginPath(); x.moveTo(px + dx - .9, oy + .5); x.quadraticCurveTo(px + dx + lean * .3, oy - hgt * .6, px + dx + lean, oy - hgt); x.quadraticCurveTo(px + dx + lean * .5 + .2, oy - hgt * .5, px + dx + .9, oy + .5); x.fill(); });
  }
  x.fillStyle = "rgba(255,255,255,.28)"; x.fillRect(0, oy - .6, T, .7); // brillo del filo
}
// Ladrillos con bisel, argamasa y variación de tono
function brickArt(x, T, v, pal, mortar, bevel) {
  const r = rngA(900 + v * 13), [p0, p1, p2] = pal;
  x.fillStyle = mortar; x.fillRect(0, 0, T, T);
  const rows = 2, bh = T / rows;
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * (T / 4), bw = T / 2;
    for (let i = -1; i < 3; i++) {
      const bx = i * bw + off - (j % 2 ? 0 : 0), by = j * bh, t = (r() - .5) * .3, c = lerpHex(p0, t > 0 ? p1 : p2, Math.abs(t));
      rrect(x, bx + .5, by + .5, bw - 1, bh - 1, .8); const gr = x.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, lerpHex(c, "#ffffff", bevel)); gr.addColorStop(.25, c); gr.addColorStop(1, lerpHex(c, "#000000", .3)); x.fillStyle = gr; x.fill();
      for (let k = 0; k < 4; k++) { x.fillStyle = `rgba(0,0,0,${.08 + r() * .12})`; x.fillRect(bx + 1 + r() * (bw - 3), by + 1 + r() * (bh - 3), .6 + r() * 1.2, .5); }
    }
  }
  const sd = x.createLinearGradient(0, T - 3, 0, T); sd.addColorStop(0, "rgba(0,0,0,0)"); sd.addColorStop(1, "rgba(0,0,0,.35)"); x.fillStyle = sd; x.fillRect(0, T - 3, T, 3);
}
// Panel metálico con tornillos
function panelArt(x, T, v, pal, stripeTop, stripeBot) {
  const [d1, d2, d3, d4] = pal;
  const gr = x.createLinearGradient(0, 0, T, T); gr.addColorStop(0, lerpHex(d4, d2, .3)); gr.addColorStop(.5, d2); gr.addColorStop(1, d3); x.fillStyle = gr; x.fillRect(0, 0, T, T);
  rrect(x, 1, 1, T - 2, T - 2, 1.5); x.strokeStyle = "rgba(0,0,0,.45)"; x.lineWidth = 1; x.stroke();
  rrect(x, 1.8, 1.8, T - 3.6, T - 3.6, 1); const g2 = x.createLinearGradient(0, 0, 0, T); g2.addColorStop(0, "rgba(255,255,255,.12)"); g2.addColorStop(1, "rgba(0,0,0,.18)"); x.fillStyle = g2; x.fill();
  for (const [a, b] of [[3.2, 3.2], [T - 3.2, 3.2], [3.2, T - 3.2], [T - 3.2, T - 3.2]]) { const rg = x.createRadialGradient(a - .3, b - .3, .1, a, b, 1.3); rg.addColorStop(0, "#d0d8e0"); rg.addColorStop(1, "#3a4452"); x.fillStyle = rg; x.beginPath(); x.arc(a, b, 1.2, 0, 7); x.fill(); }
  const rr = rngA(300 + v); x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = .5; for (let i = 0; i < 3; i++) { const yy = 5 + rr() * (T - 10); x.beginPath(); x.moveTo(5, yy); x.lineTo(T - 5, yy); x.stroke(); }
  const stripe = (y0) => { for (let k = -2; k < T / 4 + 2; k++) { x.fillStyle = k % 2 ? "#161616" : "#f2c94c"; x.beginPath(); x.moveTo(k * 4, y0 + 3); x.lineTo(k * 4 + 3, y0); x.lineTo(k * 4 + 7, y0); x.lineTo(k * 4 + 4, y0 + 3); x.fill(); } };
  x.save(); x.beginPath(); x.rect(0, 0, T, T); x.clip(); if (stripeTop) stripe(0); if (stripeBot) stripe(T - 3); x.restore();
}
// Fachada de edificio con ventanas
function facadeArt(x, T, v, pal, lit) {
  const [d1, d2, d3, d4] = pal;
  const gr = x.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, lerpHex(d2, d4, .25)); gr.addColorStop(1, d1); x.fillStyle = gr; x.fillRect(0, 0, T, T);
  const rr = rngA(77 + v); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(0,0,0,${.06 + rr() * .1})`; x.fillRect(rr() * T, rr() * T, 1 + rr() * 2, .5); }
  for (let k = 0; k < 2; k++) {
    const wx = 2.5 + k * 6.5, wy = 3.5, on = lit[k];
    rrect(x, wx - .6, wy - .6, 5.2, 8.2, 1); x.fillStyle = "rgba(0,0,0,.5)"; x.fill();
    rrect(x, wx, wy, 4, 7, .8); const w = x.createLinearGradient(0, wy, 0, wy + 7);
    if (on) { w.addColorStop(0, "#ffd890"); w.addColorStop(1, "#ff9a40"); } else { w.addColorStop(0, "#26303f"); w.addColorStop(1, "#10141c"); }
    x.fillStyle = w; x.fill();
    if (!on) { x.fillStyle = "rgba(180,210,255,.2)"; x.beginPath(); x.moveTo(wx, wy + 1); x.lineTo(wx + 2.5, wy); x.lineTo(wx + 1, wy + 6); x.lineTo(wx, wy + 6); x.fill(); }
    x.fillStyle = "rgba(0,0,0,.4)"; x.fillRect(wx + 1.9, wy, .3, 7);
  }
  x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0, T - 1, T, 1);
}
// Tablones de madera
function plankArt(x, T, v, pal, mossy, leftEnd, rightEnd) {
  const [p0, p1, p2] = pal, r = rngA(41 + v);
  const gr = x.createLinearGradient(0, 2, 0, 13); gr.addColorStop(0, p1); gr.addColorStop(.2, p0); gr.addColorStop(1, p2); x.fillStyle = gr; x.fillRect(0, 2, T, 11);
  x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = .6; for (let i = 0; i < 5; i++) { const yy = 4 + i * 2.2 + r(); x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(T * .3, yy + (r() - .5) * 1.2, T * .7, yy + (r() - .5) * 1.2, T, yy); x.stroke(); }
  x.fillStyle = "rgba(255,255,255,.2)"; x.fillRect(0, 2, T, .8);
  const dk = x.createLinearGradient(0, 11, 0, 15); dk.addColorStop(0, "rgba(0,0,0,.3)"); dk.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = dk; x.fillRect(0, 11, T, 4);
  for (const nx of [3, 13]) { const rg = x.createRadialGradient(nx - .2, 7.5, .1, nx, 7.7, 1); rg.addColorStop(0, "#c8c0b0"); rg.addColorStop(1, "#2a2218"); x.fillStyle = rg; x.beginPath(); x.arc(nx, 7.7, 1, 0, 7); x.fill(); }
  if (mossy) for (let i = 0; i < 5; i++) { const px = r() * T; x.fillStyle = "rgba(106,168,58,.85)"; x.beginPath(); x.ellipse(px, 2.2, 1.5 + r() * 2, .9, 0, 0, 7); x.fill(); }
  if (leftEnd) { x.fillStyle = "#b08a5a"; rrect(x, 0, 2, 3, 11, 1); x.fill(); }
  if (rightEnd) { x.fillStyle = "#b08a5a"; rrect(x, T - 3, 2, 3, 11, 1); x.fill(); }
}
// Viga de acero con cruces
function girderArt(x, T, v, pal) {
  const [p0, p1, p2] = pal;
  const top = x.createLinearGradient(0, 0, 0, 4); top.addColorStop(0, lerpHex(p1, "#ffffff", .3)); top.addColorStop(1, p1); x.fillStyle = top; rrect(x, 0, 0, T, 3.6, 1); x.fill();
  const bot = x.createLinearGradient(0, 12, 0, 16); bot.addColorStop(0, p0); bot.addColorStop(1, p2); x.fillStyle = bot; rrect(x, 0, 12.4, T, 3.6, 1); x.fill();
  x.strokeStyle = p0; x.lineWidth = 1.5; x.beginPath(); x.moveTo(1, 3.5); x.lineTo(8, 12.5); x.lineTo(15, 3.5); x.stroke(); x.strokeStyle = "rgba(255,255,255,.25)"; x.lineWidth = .5; x.beginPath(); x.moveTo(1, 3.2); x.lineTo(8, 12.2); x.lineTo(15, 3.2); x.stroke();
  for (const [a, b] of [[1.5, 1.8], [T - 1.5, 1.8], [1.5, 14.2], [T - 1.5, 14.2]]) { x.fillStyle = "#2a1408"; x.beginPath(); x.arc(a, b, .8, 0, 7); x.fill(); }
}
// Rejilla de laboratorio
function gratingArt(x, T, v, pal) {
  const [p0, p1, p2] = pal;
  const top = x.createLinearGradient(0, 0, 0, 5); top.addColorStop(0, lerpHex(p1, "#ffffff", .25)); top.addColorStop(1, p1); x.fillStyle = top; rrect(x, 0, 0, T, 5, 1); x.fill();
  x.fillStyle = p2; x.fillRect(0, 5, T, 2.5);
  for (let k = 0; k < 4; k++) { x.fillStyle = "rgba(0,0,0,.55)"; rrect(x, 1.4 + k * 4, 1.2, 2, 2.6, .8); x.fill(); }
  x.fillStyle = "rgba(255,255,255,.25)"; x.fillRect(0, 0, T, .7);
  const sd = x.createLinearGradient(0, 7.5, 0, 11); sd.addColorStop(0, "rgba(0,0,0,.35)"); sd.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = sd; x.fillRect(0, 7.5, T, 3.5);
}
// Piedra de la guarida con vetas de lava
function lairStoneArt(x, T, v, pal, top, lava) {
  const [p0, p1, p2] = pal;
  brickArt(x, T, v, [p0, p1, p2], "#1a1216", .16);
  if (lava) { const r = rngA(8 + v); x.strokeStyle = "#ff5a10"; x.lineWidth = .9; x.shadowColor = "#ff7a20"; x.shadowBlur = 3; x.beginPath(); const sx = 3 + r() * 10; x.moveTo(sx, 1); x.lineTo(sx + (r() - .5) * 4, 6); x.lineTo(sx + (r() - .5) * 5, 12); x.stroke(); x.shadowBlur = 0; }
  if (top) { const g = x.createLinearGradient(0, 0, 0, 4); g.addColorStop(0, lerpHex(p1, "#ffffff", .25)); g.addColorStop(1, rgbaA(p1, 0)); x.fillStyle = g; x.fillRect(0, 0, T, 4); }
}
// Bloque "?" dorado con relieve
function questionArt(x, T, shine) {
  const gr = x.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, shine ? "#fff0a0" : "#ffd75a"); gr.addColorStop(.5, "#f2b632"); gr.addColorStop(1, "#c27a10");
  rrect(x, .5, .5, T - 1, T - 1, 2.5); x.fillStyle = "#7a4408"; x.fill();
  rrect(x, 1.2, 1.2, T - 2.4, T - 2.4, 2); x.fillStyle = gr; x.fill();
  const hi = x.createLinearGradient(0, 1, 0, 7); hi.addColorStop(0, "rgba(255,255,255,.55)"); hi.addColorStop(1, "rgba(255,255,255,0)"); rrect(x, 1.8, 1.6, T - 3.6, 6, 1.6); x.fillStyle = hi; x.fill();
  for (const [a, b] of [[3, 3], [T - 3, 3], [3, T - 3], [T - 3, T - 3]]) { const rg = x.createRadialGradient(a - .2, b - .2, .1, a, b, 1); rg.addColorStop(0, "#fff0b0"); rg.addColorStop(1, "#9a5a10"); x.fillStyle = rg; x.beginPath(); x.arc(a, b, .9, 0, 7); x.fill(); }
  x.font = "bold 11px ui-monospace, monospace"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "rgba(90,40,0,.6)"; x.fillText("?", T / 2 + .6, T / 2 + 1.1); x.fillStyle = "#5a2a00"; x.fillText("?", T / 2, T / 2 + .4); x.fillStyle = "rgba(255,240,170,.5)"; x.fillText("?", T / 2 - .4, T / 2 - .2);
}

// ---------- Decoraciones (16x16, con un poco de margen arriba) ----------
function decoArt(x, k, T, theme) {
  x.lineCap = x.lineJoin = "round";
  const sh = (cx, w) => { x.fillStyle = "rgba(0,0,0,.3)"; x.beginPath(); x.ellipse(cx, 15.6, w, 1.1, 0, 0, 7); x.fill(); };
  const out = "rgba(10,6,20,.55)";
  const fs = (f, lw = .5) => { x.fillStyle = f; x.fill(); x.lineWidth = lw; x.strokeStyle = out; x.stroke(); };
  const vg = (y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  if (k === "tomb") {
    sh(8, 6); x.beginPath(); x.moveTo(3, 16); x.lineTo(3, 6.4); x.quadraticCurveTo(3, 1.6, 8, 1.6); x.quadraticCurveTo(13, 1.6, 13, 6.4); x.lineTo(13, 16); x.closePath(); fs(vg(1, 16, "#8a869e", "#4a465c"));
    x.strokeStyle = "rgba(255,255,255,.3)"; x.lineWidth = .6; x.beginPath(); x.moveTo(4, 14); x.lineTo(4, 6.4); x.quadraticCurveTo(4, 2.8, 8, 2.6); x.stroke();
    x.strokeStyle = "#2e2a3e"; x.lineWidth = .7; x.beginPath(); x.moveTo(8, 4.6); x.lineTo(8, 9.6); x.moveTo(6, 6.2); x.lineTo(10, 6.2); x.stroke(); x.lineWidth = .4; x.beginPath(); x.moveTo(9.6, 11); x.lineTo(10.6, 13); x.lineTo(9.8, 15); x.stroke();
    x.fillStyle = "#4f7a3a"; x.beginPath(); x.ellipse(5.4, 15.4, 2.4, 1, 0, 0, 7); x.ellipse(11.4, 15.2, 1.6, .8, 0, 0, 7); x.fill();
  } else if (k === "cross") {
    sh(8, 4); x.save(); x.translate(8, 16); x.rotate(.08); x.beginPath(); x.rect(-1, -13, 2, 13); fs(vg(-13, 0, "#7a5a40", "#3a2a1c")); x.beginPath(); x.rect(-4.2, -9.6, 8.4, 2); fs(vg(-9.6, -7.6, "#8a6a4a", "#4a3624")); x.restore();
  } else if (k === "bones") {
    sh(8, 6); for (const [a, b, c, d] of [[3, 14.4, 11, 14.8], [4, 12.6, 10, 15.4]]) { x.strokeStyle = "#e8e0d0"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); x.fillStyle = "#e8e0d0"; x.beginPath(); x.arc(a, b, 1.1, 0, 7); x.arc(c, d, 1.1, 0, 7); x.fill(); }
    x.beginPath(); x.ellipse(11.4, 11.6, 3, 2.6, 0, 0, 7); fs(vg(9, 14, "#f4eee0", "#b8b0a0")); x.fillStyle = "#1a1418"; x.beginPath(); x.arc(10.4, 11.4, .8, 0, 7); x.arc(12.6, 11.4, .8, 0, 7); x.fill();
  } else if (k === "cone") {
    sh(8, 5.4); x.beginPath(); x.rect(2.8, 14.4, 10.4, 1.7); fs("#9a4a10"); x.beginPath(); x.moveTo(5, 14.6); x.lineTo(7, 3.6); x.quadraticCurveTo(8, 2.8, 9, 3.6); x.lineTo(11, 14.6); x.closePath(); fs(vg(3, 15, "#ff9a3a", "#d85a10"));
    x.fillStyle = "#f4f4f0"; x.beginPath(); x.moveTo(6.2, 8.6); x.lineTo(9.8, 8.6); x.lineTo(10.2, 10.6); x.lineTo(5.8, 10.6); x.closePath(); x.fill(); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(6.4, 4.4, .8, 8);
  } else if (k === "barrel") {
    const lab = theme === "lab", c1 = lab ? "#f0cc40" : "#3a8ab0", c2 = lab ? "#a07c10" : "#1a4a68";
    sh(8, 5.6); x.beginPath(); x.moveTo(3.2, 5.4); x.quadraticCurveTo(8, 3.8, 12.8, 5.4); x.lineTo(12.8, 14.6); x.quadraticCurveTo(8, 16.2, 3.2, 14.6); x.closePath();
    const gr = x.createLinearGradient(3, 0, 13, 0); gr.addColorStop(0, c2); gr.addColorStop(.35, c1); gr.addColorStop(1, c2); fs(gr);
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(3.2, 7.4, 9.6, .8); x.fillRect(3.2, 12.4, 9.6, .8); x.beginPath(); x.ellipse(8, 5.4, 4.8, 1.5, 0, 0, 7); fs(vg(4, 7, lerpHex(c1, "#ffffff", .3), c1));
    if (lab) { x.fillStyle = "#1a1a1a"; x.beginPath(); x.moveTo(8, 8.6); x.lineTo(10.2, 11.8); x.lineTo(5.8, 11.8); x.closePath(); x.fill(); x.fillStyle = "#f2c94c"; x.fillRect(7.6, 9.8, .8, 1.2); }
  } else if (k === "rubble") {
    sh(8, 7); x.strokeStyle = "#8a5030"; x.lineWidth = .7; x.beginPath(); x.moveTo(11.6, 12); x.lineTo(12.6, 6); x.stroke();
    for (const [a, b, w, h, c] of [[5, 13.4, 4.6, 2.6, "#4a4a52"], [10, 14, 4, 2, "#5a5a64"], [7.6, 11, 3.2, 2.2, "#6e6e7a"], [3.6, 14.4, 2.6, 1.6, "#3a3a44"]]) { x.beginPath(); x.ellipse(a, b, w, h, 0, 0, 7); fs(vg(b - h, b + h, lerpHex(c, "#ffffff", .2), c), .4); }
  } else if (k === "sign") {
    sh(8, 3); x.fillStyle = "#6a6a74"; x.fillRect(7.4, 6, 1.2, 10); rr2x(x, 2.6, 1, 10.8, 6.8, 1.4); fs(vg(1, 8, "#f4c840", "#c08a10")); x.strokeStyle = "#2a2a2a"; x.lineWidth = 1; x.beginPath(); x.moveTo(5, 4.4); x.lineTo(10, 4.4); x.moveTo(8.4, 2.8); x.lineTo(10, 4.4); x.lineTo(8.4, 6); x.stroke();
  } else if (k === "mushroom") {
    sh(8, 5); x.beginPath(); x.rect(6.4, 10.4, 3.2, 5.4); fs(vg(10, 16, "#f0e8d0", "#b8ae90"), .4); x.beginPath(); x.moveTo(2.6, 10.6); x.quadraticCurveTo(2.6, 3.4, 8, 3.4); x.quadraticCurveTo(13.4, 3.4, 13.4, 10.6); x.quadraticCurveTo(8, 12, 2.6, 10.6); x.closePath(); fs(vg(3, 12, "#c860f0", "#6a2a90"));
    x.fillStyle = "#f0d8ff"; for (const [a, b, r] of [[5.4, 7, .9], [9.6, 6, .8], [8, 9, .7], [11.4, 8.6, .6]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
  } else if (k === "reeds") {
    sh(8, 6); for (const [a, b, h, lean] of [[4.4, 15.6, 12, -.6], [8.6, 15.6, 9.4, .4], [12, 15.6, 6.6, .8]]) { x.strokeStyle = "#4a7a2a"; x.lineWidth = .9; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(a + lean * .5, b - h * .6, a + lean, b - h); x.stroke(); x.beginPath(); x.ellipse(a + lean, b - h + .6, .9, 2, lean * .15, 0, 7); fs("#6a4a2a", .3); }
  } else if (k === "crate") {
    sh(8, 6.4); x.beginPath(); x.rect(2.4, 5.6, 11.2, 10.4); fs(vg(5, 16, "#9a7448", "#5a3e22")); x.strokeStyle = "#3a2614"; x.lineWidth = .8; x.beginPath(); x.moveTo(2.6, 5.8); x.lineTo(13.4, 15.8); x.moveTo(13.4, 5.8); x.lineTo(2.6, 15.8); x.stroke(); x.strokeStyle = "rgba(255,255,255,.25)"; x.lineWidth = .5; x.beginPath(); x.moveTo(2.8, 6); x.lineTo(13.2, 6); x.stroke();
  } else if (k === "tank") {
    sh(8, 5); x.beginPath(); rr2x(x, 4.4, 4.6, 7.2, 11, 2.4); fs(vg(4, 16, "rgba(140,220,200,.55)", "rgba(40,110,90,.7)")); x.fillStyle = "#5a6676"; rr2x(x, 3.6, 2.6, 8.8, 2.4, 1); x.fill(); x.strokeStyle = out; x.lineWidth = .4; x.stroke(); rr2x(x, 3.6, 15, 8.8, 1.4, .6); x.fill(); x.stroke();
    x.fillStyle = "rgba(255,255,255,.45)"; x.fillRect(5.2, 6, .8, 7.6);
  } else if (k === "skull") {
    sh(8, 4.4); x.beginPath(); x.ellipse(8, 11.4, 3.6, 3.2, 0, 0, 7); fs(vg(8, 15, "#f6f0e2", "#b8b0a0")); x.beginPath(); rr2x(x, 5.8, 13.6, 4.4, 2.2, .8); fs("#e8e0d0", .4); x.fillStyle = "#1a1418"; x.beginPath(); x.ellipse(6.6, 11.4, .9, 1.1, 0, 0, 7); x.ellipse(9.4, 11.4, .9, 1.1, 0, 0, 7); x.moveTo(8, 12.8); x.lineTo(7.4, 13.8); x.lineTo(8.6, 13.8); x.fill();
  } else if (k === "torch") {
    x.beginPath(); rr2x(x, 7, 6.6, 2, 9.4, .8); fs(vg(6, 16, "#7a5a3a", "#3a2614"), .4); x.beginPath(); rr2x(x, 5.6, 5.4, 4.8, 2, .9); fs("#6a6a74", .4);
  } else if (k === "pine") {
    sh(8, 5); x.beginPath(); x.rect(7, 12, 2, 4); fs("#5a3a22", .4);
    for (const [y0, w] of [[8, 6], [4.6, 5], [1.4, 3.6]]) { x.beginPath(); x.moveTo(8, y0 - 1.6); x.lineTo(8 + w, y0 + 5); x.lineTo(8 - w, y0 + 5); x.closePath(); fs(vg(y0 - 2, y0 + 5, "#3a8a6a", "#1a4a3a")); x.fillStyle = "#f4faff"; x.beginPath(); x.moveTo(8, y0 - 1.6); x.lineTo(8 + w * .55, y0 + 1.6); x.lineTo(8 - w * .55, y0 + 1.6); x.closePath(); x.fill(); }
  } else if (k === "snowman") {
    sh(8, 5); x.beginPath(); x.arc(8, 12, 3.8, 0, 7); fs(vg(8, 16, "#ffffff", "#b8cce4")); x.beginPath(); x.arc(8, 6.8, 2.8, 0, 7); fs(vg(4, 10, "#ffffff", "#c8d8ee"));
    x.fillStyle = "#1a1a2a"; x.beginPath(); x.arc(7, 6.2, .5, 0, 7); x.arc(9, 6.2, .5, 0, 7); x.fill(); x.fillStyle = "#ff8a2a"; x.beginPath(); x.moveTo(8, 7); x.lineTo(11, 7.6); x.lineTo(8, 8); x.fill(); x.fillStyle = "#c0302a"; x.fillRect(5.4, 8.6, 5.2, 1.2); x.fillStyle = "#1a1a2a"; x.fillRect(6, 3.2, 4, 1.4); x.fillRect(6.8, 1.6, 2.4, 1.8);
  } else if (k === "cactus") {
    sh(8, 5); x.beginPath(); rr2x(x, 6.2, 3, 3.6, 13, 1.8); fs(vg(3, 16, "#5ab060", "#2a6a34")); x.beginPath(); rr2x(x, 2.4, 7, 2.2, 5, 1.1); fs("#4a9a50", .4); x.beginPath(); rr2x(x, 2.4, 10.4, 4.6, 2, 1); fs("#4a9a50", .4); x.beginPath(); rr2x(x, 11.4, 5, 2.2, 5, 1.1); fs("#4a9a50", .4); x.beginPath(); rr2x(x, 9, 8.6, 4.6, 2, 1); fs("#4a9a50", .4);
    x.fillStyle = "#ff7ab0"; x.beginPath(); x.arc(8, 3, 1.1, 0, 7); x.fill();
  } else if (k === "fern") {
    sh(8, 6); for (const [lean, h, c] of [[-5, 11, "#2a8a3a"], [5, 10, "#3aa84a"], [-2, 13, "#4ac060"], [2, 9, "#2a8a3a"]]) { x.strokeStyle = c; x.lineWidth = 1.2; x.beginPath(); x.moveTo(8, 16); x.quadraticCurveTo(8 + lean * .3, 16 - h * .7, 8 + lean, 16 - h); x.stroke(); }
  } else if (k === "flower") {
    sh(8, 4); x.strokeStyle = "#2a8a3a"; x.lineWidth = 1; x.beginPath(); x.moveTo(8, 16); x.quadraticCurveTo(9, 11, 8, 7); x.stroke(); x.beginPath(); x.ellipse(5.6, 12.4, 2.4, 1, -.5, 0, 7); x.fillStyle = "#3aa84a"; x.fill();
    for (let i = 0; i < 6; i++) { const a = i * 1.047; x.beginPath(); x.ellipse(8 + Math.cos(a) * 2.6, 5.4 + Math.sin(a) * 2.6, 2, 1.4, a, 0, 7); fs("#ff7ac0", .3); } x.fillStyle = "#ffe060"; x.beginPath(); x.arc(8, 5.4, 1.5, 0, 7); x.fill();
  } else if (k === "balloon") {
    sh(8, 3); x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = .5; x.beginPath(); x.moveTo(8, 10.4); x.quadraticCurveTo(6, 13, 8, 16); x.stroke(); x.beginPath(); x.ellipse(8, 6, 4.2, 5, 0, 0, 7); fs(vg(1, 11, "#ff7a9a", "#c02a5a")); x.beginPath(); x.moveTo(7.2, 11); x.lineTo(8.8, 11); x.lineTo(8, 10.2); x.fill(); x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.ellipse(6.4, 4, 1, 1.8, -.4, 0, 7); x.fill();
  } else if (k === "lamp") {
    sh(8, 3); x.beginPath(); rr2x(x, 7.2, 4, 1.6, 12, .6); fs("#3a2a4a", .4); x.beginPath(); rr2x(x, 5, 1.6, 6, 3.4, 1.4); fs(vg(1, 5, "#fff0a0", "#ffb030"), .4);
  } else if (k === "antenna") {
    sh(8, 4); x.beginPath(); x.rect(7.4, 5, 1.2, 11); fs("#9aa4bc", .3); x.beginPath(); x.ellipse(8, 5.4, 4.6, 1.8, -.3, 0, 7); fs(vg(3, 8, "#e8eef8", "#8a96b0")); x.fillStyle = "#ff4a4a"; x.beginPath(); x.arc(8, 3.4, .9, 0, 7); x.fill();
  } else if (k === "rock") {
    sh(8, 6); x.beginPath(); x.moveTo(2.6, 15.6); x.quadraticCurveTo(2.2, 9, 6.4, 8); x.quadraticCurveTo(9, 6.6, 11, 9); x.quadraticCurveTo(14, 10.6, 13.6, 15.6); x.closePath(); fs(vg(7, 16, "#9aa0b0", "#4a4e60")); x.fillStyle = "rgba(255,255,255,.3)"; x.beginPath(); x.ellipse(6.4, 10, 1.6, .8, -.4, 0, 7); x.fill();
  } else { // pasto suelto
    for (let i = 0; i < 7; i++) { const a = 3.4 + i * 1.5, h = 4 + (i * 37 % 5), lean = ((i * 53 % 7) - 3) * .5; x.fillStyle = i % 2 ? "#4f8a35" : "#3f6a2a"; x.beginPath(); x.moveTo(a - .8, 16); x.quadraticCurveTo(a + lean * .3, 16 - h * .6, a + lean, 16 - h); x.quadraticCurveTo(a + lean * .5 + .2, 16 - h * .5, a + .8, 16); x.fill(); }
  }
}
function rr2x(x, X, Y, w, h, r) { x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }
