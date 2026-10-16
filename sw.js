// Offline cache: serve from cache first, refresh it in the background when online.
// Change CACHE on every update so the iPad picks up the new version.
const CACHE = "sound-detective-v13";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-512.png", "bank.json", "ph.enc", "fonts/mem8Ya6iyW-Lwqg40ZMFVZ0bf8pkAg.woff2", "fonts/mem_Ya6iyW-LwqgwarYQeL8WVQ.woff2", "fonts/wXKrE3kTposypRyd51jcAM4olXc.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Sound files go straight to the network: Safari plays audio from a service worker unreliably.
  if (new URL(e.request.url).pathname.includes("/a/")) return;
  if (e.request.mode === "navigate") {   // the page: try the network for 3 s, else the saved copy
    e.respondWith(caches.open(CACHE).then(async c => {
      const net = fetch(e.request).then(r => { if (r.ok) c.put("index.html", r.clone()); return r; });
      const late = new Promise(res => setTimeout(res, 3000)).then(() => c.match("index.html"));
      try { return await Promise.race([net, late.then(h => h || net)]); } catch (x) { return (await c.match("index.html")) || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
