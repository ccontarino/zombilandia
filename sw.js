// Service worker: guarda lo que se visita y lo sirve si no hay internet. Primero busca en la red, para que las actualizaciones lleguen al toque.
const CACHE = "zombilandia-" + (new URL(self.location).searchParams.get("v") || "0");
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((ch) => ch.put(r, c)); } return res; }).catch(() => caches.match(r, { ignoreSearch: false }).then((m) => m || caches.match(r, { ignoreSearch: true }))));
});
