// Relé local para probar sin Cloudflare (mismo protocolo que worker.js). Uso: node relay/dev.js [puerto]
const { WebSocketServer } = require("ws");
const salas = new Map();
const wss = new WebSocketServer({ port: +process.argv[2] || 8787 });
wss.on("connection", (ws, req) => {
  const u = new URL(req.url, "http://x"), m = u.pathname.match(/^\/sala\/([A-Z0-9]{4})$/), rol = u.searchParams.get("rol") === "host" ? "host" : "guest";
  if (!m) return ws.close();
  const s = salas.get(m[1]) || {};
  if ((rol === "host" && s.host) || (rol === "guest" && (!s.host || s.guest))) return ws.close(4000, "no");
  s[rol] = ws; salas.set(m[1], s);
  const otro = () => s[rol === "host" ? "guest" : "host"];
  if (rol === "guest") s.host.send(JSON.stringify({ t: "join" }));
  else if (s.guest) ws.send(JSON.stringify({ t: "join" }));
  ws.on("message", (d, bin) => { const o = otro(); if (o && o.readyState === 1) o.send(bin ? d : d.toString()); });
  ws.on("close", () => { const o = otro(); if (o && o.readyState === 1) o.send(JSON.stringify({ t: "left", who: rol })); delete s[rol]; if (!s.host && !s.guest) salas.delete(m[1]); });
});
console.log("relé local en", wss.options.port);
