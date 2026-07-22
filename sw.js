// Treino Livre - Service Worker (modo offline)
const CACHE = "treinolivre-v1";
const ARQUIVOS = [
  "./",
  "./index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const ehApp = e.request.mode === "navigate" || url.pathname.endsWith("index.html");

  if (ehApp) {
    // App: tenta a rede primeiro (para receber atualizações), cai no cache se estiver offline
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((r) => r || caches.match("./index.html"))
        )
    );
  } else {
    // Bibliotecas e imagens: cache primeiro (rápido e funciona offline)
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request).then((res) => {
            const cp = res.clone();
            if (res.ok || res.type === "opaque") {
              caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {});
            }
            return res;
          })
      )
    );
  }
});
