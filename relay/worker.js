// Relé de Zombilandia: junta a dos jugadores en una sala y le pasa a cada uno lo que manda el otro.
// No entiende el juego: solo reenvía mensajes. Cada sala es un Durable Object (uno por código de 4 letras).
const PERMITIDOS = ["https://ccontarino.github.io", "http://localhost", "http://127.0.0.1"];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/sala\/([A-Z0-9]{4})$/);
    if (!m) return new Response("Zombilandia relé", { status: 200 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("Se necesita WebSocket", { status: 426 });
    const origen = req.headers.get("Origin") || "";
    if (!PERMITIDOS.some((o) => origen === o || origen.startsWith(o + ":"))) return new Response("Origen no permitido", { status: 403 });
    return env.SALA.get(env.SALA.idFromName(m[1])).fetch(req);
  },
};

export class Sala {
  constructor(state) { this.state = state; }
  rol(ws) { return this.state.getTags(ws)[0]; }
  async fetch(req) {
    const rol = new URL(req.url).searchParams.get("rol") === "host" ? "host" : "guest";
    const socks = this.state.getWebSockets();
    const host = socks.find((s) => this.rol(s) === "host"), guest = socks.find((s) => this.rol(s) === "guest");
    if (rol === "host" && host) return new Response("La sala ya existe", { status: 409 });
    if (rol === "guest" && !host) return new Response("La sala no existe", { status: 404 });
    if (rol === "guest" && guest) return new Response("La sala está llena", { status: 409 });
    const par = new WebSocketPair(), [cliente, servidor] = Object.values(par);
    this.state.acceptWebSocket(servidor, [rol]);
    if (rol === "guest") host.send(JSON.stringify({ t: "join" }));
    else if (guest) servidor.send(JSON.stringify({ t: "join" })); // el anfitrión volvió y el invitado sigue ahí
    return new Response(null, { status: 101, webSocket: cliente });
  }
  webSocketMessage(ws, msg) {
    for (const s of this.state.getWebSockets()) if (s !== ws) { try { s.send(msg); } catch {} }
  }
  webSocketClose(ws) {
    for (const s of this.state.getWebSockets()) if (s !== ws) { try { s.send(JSON.stringify({ t: "left", who: this.rol(ws) })); } catch {} }
    try { ws.close(); } catch {}
  }
  webSocketError(ws) { this.webSocketClose(ws); }
}
