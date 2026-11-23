"use strict";
// Partida online entre dos aparatos. Un relé simple (relay/, en Cloudflare) junta a los dos y le pasa a cada uno lo que manda el otro.
// El anfitrión corre TODO el juego y manda el estado unas 20 veces por segundo; el invitado manda sus botones y dibuja lo que le llega.
// Comparte las variables de game.js (mode, players, zombies, map...), que se carga antes.
const DEFAULT_RELAY = "wss://zombilandia.ccontarino.workers.dev"; // dirección del relé, por ejemplo "wss://zombilandia-relay.TU-USUARIO.workers.dev"
(() => {
  const qp = new URLSearchParams(location.search), RELAY = qp.get("relay") || DEFAULT_RELAY;
  const $ = (id) => document.getElementById(id), ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const r1 = (v) => Math.round(v * 10) / 10;
  let ws = null, code = "", opened = false, retry = 0, closing = false, lastRx = 0, tickN = 0, rtt = 0, lastSig = -1, note = "", gotSnap = false;
  let sentMap = "", sentGot = [], sentLen = 0, lvlDirty = true, lastMeta = "", wake = null;
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  net.send = send;

  // ---------- Empaquetado compacto de lo que se dibuja ----------
  const PK = ["x", "y", "vx", "vy", "face", "tier", "step", "inv", "dead", "beam", "beamDir", "beamTier", "beamBig", "shield", "hero", "power", "cd", "ground", "springT", "want"];
  const ZK = ["uid", "idx", "type", "x", "y", "vx", "step", "dead", "flash", "frozen", "face", "hp", "glass", "ground", "broken", "off", "t"];
  const val = (v) => (typeof v === "boolean" ? +v : typeof v === "number" ? r1(v) : v ?? 0);
  const packP = (p) => { const a = PK.map((k) => val(p[k])); a.push(p.ray ? [Math.round(p.ray.x), Math.round(p.ray.y), Math.round(p.ray.w), p.ray.h] : 0); return a; };
  const packZ = (z) => ZK.map((k) => val(z[k]));
  const OWN = new Set(["x", "y", "vx", "vy", "face", "step", "ground", "springT"]);
  function unpackP(q, a, own) {
    const pred = own && mode === "play" && !a[PK.indexOf("dead")] && !q.dead && q.x !== undefined && q.synced;
    PK.forEach((k, i) => { if (k !== "x" && k !== "y" && !(pred && OWN.has(k))) q[k] = a[i]; });
    q.tx = a[0]; q.ty = a[1]; q.pred = !!pred;
    if (pred) { // reconciliación: comparo con dónde estaría el servidor ahora (un viaje de ida y vuelta después)
      const d = Math.max(2, Math.min(14, rtt / 16.7)), svx = a[2], svy = a[3], gr = a[PK.indexOf("ground")];
      const ex = a[0] + svx * d, ey = a[1] + (gr ? 0 : svy * d + .14 * d * d);
      if (Math.abs(ex - q.x) > 48 || Math.abs(ey - q.y) > 48) { q.x = a[0]; q.y = a[1]; q.vx = svx; q.vy = svy; q.cx = q.cy = 0; }
      else { // corrección suave: zona muerta (el wifi hace temblar el cálculo) y se aplica de a poco en los ticks siguientes
        const ax = ex - q.x, ay = ey - q.y;
        q.cx = Math.abs(ax) < 5 ? 0 : (ax - Math.sign(ax) * 5) * .5; q.cy = Math.abs(ay) < 10 ? 0 : (ay - Math.sign(ay) * 10) * .5;
      }
    } else {
      if (q.x === undefined || Math.abs(q.x - q.tx) > 48 || Math.abs(q.y - q.ty) > 48) { q.x = q.tx; q.y = q.ty; }
      if (own && mode === "play" && !a[PK.indexOf("dead")]) q.synced = true;
      else if (own) q.synced = false;
    }
    const t = TIERS[q.tier] || TIERS[0]; q.w = t.w; q.h = t.h; q.big = q.tier > 0;
    const r = a[PK.length]; q.ray = r ? { x: r[0], y: r[1], w: r[2], h: r[3] } : null;
  }
  function unpackZ(a, old) {
    const z = old || {}; ZK.forEach((k, i) => { if (k !== "x" && k !== "y") z[k] = a[i]; });
    z.tx = a[3]; z.ty = a[4]; const k = ZT[z.type] || ZT.walker; z.w = k.w; z.h = k.h;
    if (z.x === undefined || Math.abs(z.x - z.tx) > 48 || Math.abs(z.y - z.ty) > 48) { z.x = z.tx; z.y = z.ty; }
    return z;
  }
  const flatMap = () => map.map((r) => r.join("")).join("");

  // ---------- Anfitrión ----------
  const wrap = (name, fn) => { const o = globalThis[name]; globalThis[name] = function (...a) { const r = o.apply(this, a); fn(); return r; }; };
  wrap("loadLevel", () => { lvlDirty = true; });
  wrap("shiftWorld", () => { lvlDirty = true; });
  function themeName() { return Object.keys(THEMES).find((k) => THEMES[k] === TH) || "cemetery"; }
  function lvlMsg() {
    return { t: "lvl", name: L.name, th: themeName(), custom: !!L.custom, idx: levelIdx, en: endless ? 1 : 0, goal: goalX, arena, dist: distOff, tb: totalBrains, deco,
      map: map.map((r) => r.join("")), items: items.map((it) => [it.x, it.y, it.kind || "", it.got ? 1 : 0]), mv: movers.map((m) => [m.w, m.x0, m.y0]) };
  }
  function sendSnap() {
    if (lvlDirty) { send(lvlMsg()); lvlDirty = false; sentMap = flatMap(); sentGot = items.map((i) => (i.got ? 1 : 0)); sentLen = items.length; lastMeta = ""; }
    const near = (z) => players.some((q) => Math.abs(q.x - z.x) < 400);
    const o = { t: "s", p: players.map(packP), z: zombies.filter((z) => !(z.dead > 60) && near(z)).map(packZ),
      sh: shots.map((s) => [Math.round(s.x), Math.round(s.y), s.r, s.col, s.kind || ""]), mv: movers.map((m) => [r1(m.x), r1(m.y)]),
      fl: falling.map((f) => [Math.round(f.x), Math.round(f.y)]), cr: Object.keys(crumble), lt: levelTime, bn: banner, sk: shake };
    const got = items.map((i) => (i.got ? 1 : 0)), ig = [];
    for (let i = 0; i < sentLen; i++) if (got[i] !== sentGot[i]) ig.push(i);
    if (ig.length) o.ig = ig;
    if (items.length > sentLen) o.inw = items.slice(sentLen).map((it) => [it.x, it.y, it.kind || "", it.got ? 1 : 0]);
    sentGot = got; sentLen = items.length;
    const fm = flatMap(), md = [];
    for (let i = 0; i < fm.length; i++) if (fm[i] !== sentMap[i]) md.push([i, fm[i]]);
    if (md.length > 250) o.mf = fm; else if (md.length) o.md = md;
    sentMap = fm;
    const meta = JSON.stringify({ m: mode, sc: score, li: lives, br: brains, gb: gotBrains, dm: damaged ? 1 : 0, ls: lastStars.map(Number), bd: bossDead ? 1 : 0, al: arenaLocked ? 1 : 0,
      eb: endBest, ss: shopSel, sm: shopMsgT > 0 ? shopMsg : "", up: upgrades.longRay ? 1 : 0, bc: bossCheck && bossCheck.level === levelIdx ? 1 : 0, d: distOff });
    if (meta !== lastMeta) { o.meta = JSON.parse(meta); lastMeta = meta; }
    if (net.rec && net.rec.length) o.ev = net.rec.splice(0, 60);
    send(o);
  }
  function hostStep() {
    net.paused = mode === "play" && players.length > 1 && !net.peer;
    if (net.peer && performance.now() - lastRx > 8000) peerGone("Sin señal del invitado");
    if (net.peer && tickN % (mode === "play" ? 2 : 6) === 0) sendSnap();
  }
  function peerGone(why) {
    net.peer = false; net.rec = null; keys2.left = keys2.right = keys2.jump = keys2.fire = false; note = why || "";
  }
  function peerJoin() {
    net.peer = true; net.rec = []; lvlDirty = true; lastRx = performance.now(); note = "";
    nPlayers = 2;
    if (players.length === 1) { // se sumó con la partida empezada
      const a = players[0], q = mkPlayer(1, null); q.x = a.x - 14; q.y = a.y; q.safe = { x: q.x, y: q.y }; players.push(q);
    }
    showOn(false);
  }
  function hostMsg(m) {
    if (!net.peer && m.t !== "left" && m.t !== "join") peerJoin(); // el invitado volvió (por ejemplo, tras salir un rato de la pestaña)
    switch (m.t) {
      case "join": peerJoin(); break;
      case "left": if (m.who === "guest") peerGone("El invitado se desconectó"); break;
      case "hi": lvlDirty = true; break;
      case "i":
        keys2.left = !!m.l; keys2.right = !!m.r; keys2.jump = !!m.j; keys2.fire = !!m.f; if (m.tj) tap2.jump = true; if (m.tf) tap2.fire = true; break;
      case "p": if (net.peer && !net.paused) press(m.k); break;
      case "shop": if (net.peer && mode === "shop" && SHOP[m.i]) { shopSel = m.i; shopAct(m.i); } break;
      case "ping": send({ t: "pong", ts: m.ts }); break;
    }
  }

  // ---------- Invitado ----------
  function applyLvl(m) {
    L = { name: m.name, theme: m.th, custom: m.custom }; TH = THEMES[m.th]; cache = {};
    levelIdx = m.idx; endless = !!m.en; goalX = m.goal; arena = m.arena; distOff = m.dist; totalBrains = m.tb; deco = m.deco;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) map[y][x] = m.map[y][x];
    items = m.items.map(([x, y, k, g]) => ({ x, y, w: 8, h: 8, got: !!g, kind: k || undefined }));
    for (const q of players) q.synced = false;
    movers = m.mv.map(([w, x0, y0]) => ({ x0, y0, x: x0, y: y0, tx: x0, ty: y0, w, h: 8, dx: 0, dy: 0, sp: 0, t: 0, vx: 0, vy: 0 }));
    zombies = []; shots = []; parts = []; falling = []; crumble = {}; regrow = [];
  }
  function applySnap(m) {
    gotSnap = true; note = "";
    m.p.forEach((a, i) => { const q = players[i] || (players[i] = mkPlayer(i, null)); unpackP(q, a, i === 1); });
    const old = new Map(zombies.map((z) => [z.uid, z]));
    zombies = m.z.map((a) => unpackZ(a, old.get(a[0])));
    shots = m.sh.map(([x, y, r, col, kind]) => ({ x, y, r, col, kind: kind || undefined }));
    m.mv.forEach(([x, y], i) => { const o = movers[i]; if (o) { if (o.tx !== undefined) { o.vx = (x - o.tx) / 2; o.vy = (y - o.ty) / 2; } o.tx = x; o.ty = y; } });
    falling = m.fl.map(([x, y]) => ({ x, y, vy: 0 })); crumble = {}; for (const k of m.cr) crumble[k] = 1;
    levelTime = m.lt; banner = m.bn; if (m.sk > shake) shake = m.sk;
    if (m.ig) for (const i of m.ig) if (items[i]) items[i].got = true;
    if (m.inw) for (const [x, y, k, g] of m.inw) items.push({ x, y, w: 8, h: 8, got: !!g, kind: k || undefined });
    if (m.mf) for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) map[y][x] = m.mf[y * COLS + x];
    if (m.md) for (const [i, ch] of m.md) map[Math.floor(i / COLS)][i % COLS] = ch;
    if (m.meta) {
      const a = m.meta; mode = a.m; score = a.sc; lives = a.li; brains = a.br; gotBrains = a.gb; damaged = !!a.dm; lastStars = a.ls.map(Boolean); bossDead = !!a.bd; arenaLocked = !!a.al;
      endBest = a.eb; shopSel = a.ss; shopMsg = a.sm; shopMsgT = a.sm ? 2 : 0; upgrades = a.up ? { longRay: true } : {}; bossCheck = a.bc ? { level: levelIdx } : null; distOff = a.d;
    }
    if (m.ev) for (const e of m.ev) {
      if (e[0] === 0) beep(e[1], e[2], e[3], e[4], e[5]);
      else if (e[0] === 1) burst(e[1], e[2], e[3], e[4], e[5]);
      else if (e[0] === 2) say(e[1]);
      else if (e[0] === 3 && e[2] === 1) { pi = 1; vibe(e[1]); }
    }
  }
  function guestMsg(m) {
    if (m.t === "lvl") applyLvl(m);
    else if (m.t === "s") applySnap(m);
    else if (m.t === "pong") { const v = performance.now() - m.ts; rtt = Math.round(rtt ? rtt * .7 + v * .3 : v); }
    else if (m.t === "left" && m.who === "host") note = "El anfitrión se desconectó. Esperando que vuelva…";
  }
  function guestStep() {
    time++;
    const k = keys, sig = (k.left ? 1 : 0) + (k.right ? 2 : 0) + (k.jump ? 4 : 0) + (k.fire ? 8 : 0), tj = tap.jump, tf = tap.fire; tap.jump = tap.fire = false;
    if (mode === "play" && (sig !== lastSig || tj || tf || tickN % 30 === 0)) { send({ t: "i", l: +k.left, r: +k.right, j: +k.jump, f: +k.fire, tj: +tj, tf: +tf }); lastSig = sig; }
    else if (mode !== "play" && tickN % 30 === 0) send({ t: "i", l: 0, r: 0, j: 0, f: 0 }); // señal de vida
    if (tickN % 30 === 0) send({ t: "ping", ts: performance.now() });
    if (mode === "play") { // extrapolación: avanzo el destino con la velocidad conocida para que no se vea atrasado entre paquetes
      for (const q of players) if (q.tx !== undefined && !q.pred && !q.dead) { q.tx += q.vx; if (!q.ground) { q.vy = Math.min(q.vy + .28, 6.5); q.ty += q.vy; } }
      for (const z of zombies) if (z.tx !== undefined && !z.dead && !z.frozen) z.tx += z.vx;
      for (const m of movers) if (m.tx !== undefined) { m.tx += m.vx; m.ty += m.vy; }
    }
    for (const q of players) if (q.tx !== undefined && !(q.pred && mode === "play")) { q.x += (q.tx - q.x) * .4; q.y += (q.ty - q.y) * .4; }
    for (const z of zombies) if (z.tx !== undefined) { z.x += (z.tx - z.x) * .4; z.y += (z.ty - z.y) * .4; }
    for (const m of movers) if (m.tx !== undefined) { m.x += (m.tx - m.x) * .4; m.y += (m.ty - m.y) * .4; }
    const me1 = players[1];
    if (me1 && me1.pred && mode === "play") { // predicción: muevo mi personaje ya, sin esperar al anfitrión
      pi = 1; player = me1; K = keys; TP = { jump: tj, fire: false }; net.quiet = true;
      if (me1.cx) { const c = me1.cx * .12; me1.x += c; me1.cx -= c; } if (me1.cy) { const c = me1.cy * .12; me1.y += c; me1.cy -= c; }
      try { movePlayer(me1); } finally { net.quiet = false; K = keys; TP = tap; }
      if (me1.ground && Math.abs(me1.vx) > .3) me1.step += Math.abs(me1.vx) * .12;
      if (keys.left) me1.face = -1; else if (keys.right) me1.face = 1;
    }
    for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += .15; q.life--; }
    parts = parts.filter((q) => q.life > 0);
    if (shake) shake--; if (msgT) msgT--; if (shopMsgT) shopMsgT--;
    const p = players[1]; if (p && p.x !== undefined) cam = Math.max(0, Math.min(COLS * T - W, p.x - W / 2 + 20));
    if (gotSnap && performance.now() - lastRx > 3500) note = "Sin señal del anfitrión…"; else if (gotSnap && note.startsWith("Sin señal")) note = "";
  }
  setInterval(() => { if (net.role === "guest") send({ t: "ka" }); }, 1000); // señal de vida aunque la pestaña esté en segundo plano
  net.step = () => {
    if (!net.role) return;
    tickN++;
    if (net.role === "guest") guestStep(); else hostStep();
  };

  // ---------- Entradas del jugador ----------
  net.press = (k) => {
    if (net.role === "guest") {
      if (mode === "play") return false;
      if (["clear", "shop", "over", "won"].includes(mode)) send({ t: "p", k });
      return true;
    }
    if (net.role === "host" && net.paused) { // el invitado no está: tocar sigue la partida solo
      players.length = 1; nPlayers = 1; net.paused = false; note = ""; return true;
    }
    return false;
  };

  // ---------- Conexión ----------
  function connect(role, c) {
    code = c; closing = false; opened = false; net.role = role;
    if (role === "guest") { nPlayers = 2; if (players.length < 2) players.push(mkPlayer(1, null)); }
    let sock;
    try { sock = new WebSocket(`${RELAY.replace(/\/$/, "")}/sala/${c}?rol=${role}`); } catch { fail("No se pudo conectar."); return; }
    ws = sock;
    sock.onopen = () => {
      opened = true; retry = 0; lastRx = performance.now(); note = ""; lock();
      if (role === "guest") { net.peer = true; nPlayers = 2; if (!gotSnap) { mode = "title"; loadLevel(0); } send({ t: "hi" }); setMsg(`Conectado a la sala ${c}. Esperando al anfitrión…`); showOn(false); }
      else { $("onMenu").hidden = true; $("onSala").hidden = false; $("onCode").textContent = c; $("onLink").value = shareLink(c); setMsg("Mandale el link a tu amigo y esperá a que entre."); }
    };
    sock.onmessage = (e) => { lastRx = performance.now(); let m; try { m = JSON.parse(e.data); } catch { return; } if (role === "host") hostMsg(m); else guestMsg(m); };
    sock.onclose = () => {
      if (ws !== sock) return; ws = null;
      if (closing) return;
      if (!opened && retry === 0) return fail(role === "guest" ? "No existe esa sala, o ya está llena." : "No se pudo crear la sala. Probá de nuevo.");
      if (role === "host") peerGone("Reconectando…");
      if (retry++ < 15) { note = "Reconectando…"; setTimeout(() => { if (net.role === role && !ws && !closing) connect(role, code); }, 1500); }
      else { leave(); fail("Se cortó la conexión."); $("onLeave").hidden = true; }
    };
    sock.onerror = () => {};
  }
  function fail(msg) { net.role = null; net.peer = false; ws = null; showOn(true); $("onMenu").hidden = false; $("onSala").hidden = true; setMsg(msg); }
  function leave() { net.joining = false;
    closing = true; const was = net.role; try { ws?.close(); } catch {} ws = null;
    net.role = null; net.peer = false; net.paused = false; net.rec = null; note = ""; gotSnap = false;
    for (const k of ["left", "right", "jump", "fire"]) keys2[k] = false;
    if (players.length > 1) players.length = 1; nPlayers = 1;
    if (was === "guest") { mode = "title"; loadLevel(0); }
    try { wake?.release(); } catch {} wake = null;
  }
  async function lock() { try { wake = await navigator.wakeLock?.request("screen"); } catch {} }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !net.role) return;
    lock(); lastRx = performance.now();
    if (!ws || ws.readyState > 1) { retry = 0; connect(net.role, code); }
  });

  // ---------- Pantalla de salas ----------
  const shareLink = (c) => `${location.origin}${location.pathname}?sala=${c}${qp.get("relay") ? "&relay=" + encodeURIComponent(qp.get("relay")) : ""}`;
  function setMsg(t) { const e = $("onMsg"); if (e) e.textContent = t; }
  function showOn(v) { const d = $("on"); if (d) d.hidden = !v; }
  function openOn() {
    showOn(true); const conectado = !!net.role;
    $("onMenu").hidden = conectado; $("onSala").hidden = !(conectado && net.role === "host"); $("onLeave").hidden = !conectado;
    if (conectado && net.role === "host") { $("onCode").textContent = code; $("onLink").value = shareLink(code); }
    setMsg(!RELAY ? "Las partidas online todavía no están configuradas." : conectado ? (net.peer ? "Conectados." : "Esperando al otro jugador…") : "Jugá con un amigo en otro celu.");
  }
  function buildUI() {
    const b = $("online"); if (b) b.addEventListener("click", openOn);
    $("onClose").onclick = () => showOn(false);
    $("onLeave").onclick = () => { leave(); showOn(false); };
    $("onCrear").onclick = () => {
      if (!RELAY) return setMsg("Las partidas online todavía no están configuradas.");
      let c = ""; for (let i = 0; i < 4; i++) c += ABC[Math.floor(Math.random() * ABC.length)];
      setMsg("Creando sala…"); connect("host", c);
    };
    $("onUnir").onclick = () => {
      const c = $("onCod").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!RELAY) return setMsg("Las partidas online todavía no están configuradas.");
      if (c.length !== 4) return setMsg("El código tiene 4 letras o números.");
      setMsg("Conectando…"); connect("guest", c);
    };
    $("onCopy").onclick = async () => { try { await navigator.clipboard.writeText($("onLink").value); setMsg("Link copiado."); } catch { $("onLink").select(); setMsg("Copialo a mano."); } };
    const sh = $("onShare"); if (navigator.share) { sh.hidden = false; sh.onclick = () => navigator.share({ title: "Zombilandia", text: "Vení a jugar Zombilandia conmigo:", url: $("onLink").value }).catch(() => {}); }
    const s = (qp.get("sala") || "").toUpperCase();
    if (/^[A-Z0-9]{4}$/.test(s)) net.joining = true;
    if (/^[A-Z0-9]{4}$/.test(s)) { showOn(true); $("onMenu").hidden = true; $("onLeave").hidden = true; if (!RELAY) { $("onMenu").hidden = false; setMsg("Las partidas online todavía no están configuradas."); } else { setMsg(`Entrando a la sala ${s}…`); connect("guest", s); } }
  }
  net.lobby = () => panel("ONLINE", net.role ? [`Sala ${code}`, "", "Conectado.", "Esperando que el anfitrión", "elija el nivel…"] : ["", "Conectando a la sala…", "", "El anfitrión elige el nivel."], "#7cc456");
  net.draw = () => {
    if (!net.role) return;
    g.textBaseline = "bottom"; g.font = "8px ui-monospace, monospace"; g.textAlign = "left";
    text(net.role === "guest" ? `online${rtt ? " · " + rtt + " ms" : ""}` : net.peer ? "online · 2 jugadores" : "online · solo vos", 3, H - 2, net.peer ? "#7cc456" : "#f2c94c");
    if (net.role === "host" && net.peer && mode === "title") { g.textAlign = "center"; g.font = "bold 11px ui-monospace, monospace"; text("¡Tu amigo está conectado! Elegí el nivel", W / 2, 232, "#7cc456"); }
    if (net.paused) panel("PAUSA", ["Se desconectó el invitado.", "Esperando que vuelva…", "", "Tocá para seguir solo"], "#f2c94c");
    else if (note) { g.textAlign = "center"; g.font = "bold 10px ui-monospace, monospace"; g.globalAlpha = .85; R(0, 96, W, 22, "#07051a"); g.globalAlpha = 1; text(note, W / 2, 112, "#f2c94c"); }
    g.textAlign = "left"; g.textBaseline = "alphabetic";
  };
  buildUI();
})();
