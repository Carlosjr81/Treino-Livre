// Treino Livre - Service Worker (modo offline)
const CACHE = "treinolivre-v3";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  // O "?v=3" precisa bater exatamente com o endereço usado no index.html,
  // senão o que é guardado aqui nunca é encontrado depois.
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js?v=3",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js?v=3",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js?v=3",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    // addAll é tudo-ou-nada: se uma única URL falhar nada é guardado.
    // Guardando um a um, uma falha isolada não derruba o cache inteiro.
    caches.open(CACHE).then((c) =>
      Promise.all(ARQUIVOS.map((u) => c.add(u).catch(() => {})))
    )
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
  // Só mexemos em http/https (extensões do navegador não podem ser guardadas)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  // Contador de visitas: nunca interceptar (precisa chegar ao servidor para contar)
  if (url.hostname.indexOf("goatcounter") !== -1 || url.hostname === "gc.zgo.at") return;
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
    // Bibliotecas, ícones e imagens dos exercícios: cache primeiro (rápido e funciona offline)
    e.respondWith(
      caches.match(e.request).then((r) => {
        if (r) return r;
        return fetch(e.request)
          .then((res) => {
            const cp = res.clone();
            if (res.ok || res.type === "opaque") {
              caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {});
            }
            return res;
          })
          .catch(() => Response.error());
      })
    );
  }
});
