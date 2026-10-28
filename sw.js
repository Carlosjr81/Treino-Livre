// Treino Livre - Service Worker (modo offline)
const CACHE = "treinolivre-v144";
const CACHE_VOZ = "treinolivre-voz";
// As falas gravadas do Monster, Run! (vozes/*.mp3): baixadas quando a história
// começa e guardadas fora do cache da versão, para não sumirem a cada atualização.
const CACHE_FALAS = "treinolivre-falas";
// A vinheta de abertura (2 MB) num cache só dela, preservado entre versões:
// guardá-la no cache da versão a baixaria de novo a cada atualização do app.
const CACHE_MIDIA = "treinolivre-midia";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./marombeiro-corpo.webp",
  "./marombeiro-braco.webp",
  "./marombeiro-cabeca.webp",
  "./marombeiro-inteiro.webp",
  "./marombeiro-rosto.jpg",
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
      // cache: "reload" passa por cima do cache HTTP do navegador (o GitHub Pages
      // manda max-age=600). Sem isso, uma versão publicada minutos depois da
      // anterior guardava de novo os arquivos velhos: foi assim que o avatar do
      // Marombeiro continuou com os tênis pintados depois de a pintura ser desfeita.
      Promise.all(ARQUIVOS.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      // "treinolivre-config" guarda a configuracao do lembrete e precisa sobreviver
      // a troca de versao, senao o aviso morre a cada atualizacao do app.
      // "treinolivre-voz" guarda a voz do narrador do story (uns 90 MB): apagá-la a
      // cada versão obrigaria a pessoa a baixar tudo de novo.
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== "treinolivre-config" && k !== CACHE_VOZ && k !== CACHE_FALAS && k !== CACHE_MIDIA).map((k) => caches.delete(k))))
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
  // O arquivo da versao nunca e interceptado: ele existe para delatar que ha
  // versao nova, e serviria de pouco vindo do cache.
  if (url.pathname.indexOf("versao.json") >= 0) return;
  // A vinheta: do cache próprio, e na falta, da rede inteira (sem o pedaço
  // que o vídeo pede), guardada para as próximas aberturas.
  if (/\/abertura-v\d+\.mp4$/.test(url.pathname)) {
    const chave = url.origin + url.pathname;
    e.respondWith(caches.open(CACHE_MIDIA).then((c) => c.match(chave).then((r) => r || fetch(chave).then((resp) => {
      if (resp.ok && resp.status === 200) c.put(chave, resp.clone()).catch(() => {});
      return resp;
    }))));
    return;
  }
  // Os pedaços do mapa e a busca de endereço do percurso não entram no cache:
  // cada lugar do mapa é um arquivo, e guardar todos encheria o celular. O
  // navegador já guarda os recentes no cache dele, que se limpa sozinho.
  if (url.hostname === "tile.openstreetmap.org" || url.hostname === "nominatim.openstreetmap.org") return;
  // As contas (login, chave e o status liberado/bloqueado) nunca vêm do cache:
  // um bloqueio guardado como "liberado" deixaria a pessoa entrando para sempre.
  if (url.hostname === "identitytoolkit.googleapis.com" || url.hostname === "securetoken.googleapis.com" || url.hostname === "firestore.googleapis.com") return;
  // O reconhecimento de movimento (biblioteca, WASM e modelo) sao uns 8 MB.
  // Guardados aqui, sao baixados uma vez so e o Eyes Scan passa a funcionar
  // offline, como o resto do app.
  const ehVisao = url.hostname === "storage.googleapis.com" ||
    (url.hostname === "cdn.jsdelivr.net" && url.pathname.indexOf("tasks-vision") >= 0);
  const ehApp = e.request.mode === "navigate" || url.pathname.endsWith("index.html");
  // A voz do narrador do story (modelo, espeak, onnxruntime) e o montador de
  // MP4 moram num cache só deles. Os arquivos grandes quem guarda é o app, que
  // mostra o progresso; aqui só se serve do cache e guarda os pequenos (os
  // scripts), para nada disso ir parar no cache da versão, que é apagado.
  const ehVoz = url.hostname === "huggingface.co" || (url.hostname === "cdn.jsdelivr.net" &&
    /onnxruntime-web@|piper-wasm@|mp4-muxer@/.test(url.pathname));
  // O índice das falas gravadas vem sempre da rede (lista nova = gravações novas);
  // cada .mp3 vem do cache quando já foi baixado.
  if (url.pathname.indexOf("/vozes/") >= 0 && url.pathname.endsWith(".mp3")) {
    e.respondWith(caches.open(CACHE_FALAS).then((c) => c.match(e.request.url).then((r) => r || fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request.url, res.clone()).catch(() => {});
      return res;
    }))));
    return;
  }
  if (url.pathname.endsWith("/vozes/indice.json")) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then((res) => {
      if (res.ok) caches.open(CACHE_FALAS).then((c) => c.put(e.request.url, res.clone())).catch(() => {});
      return res;
    }).catch(() => caches.open(CACHE_FALAS).then((c) => c.match(e.request.url)).then((r) => r || new Response('{"ids":[]}'))));
    return;
  }
  if (ehVoz) {
    e.respondWith(
      caches.open(CACHE_VOZ).then((c) => c.match(e.request.url).then((r) => r || fetch(e.request).then((res) => {
        const tam = +(res.headers.get("Content-Length") || 0);
        if (res.ok && /\.js$/.test(url.pathname) && tam < 2000000) c.put(e.request.url, res.clone()).catch(() => {});
        return res;
      })))
    );
    return;
  }

  if (ehApp) {
    // App: tenta a rede primeiro (para receber atualizações), cai no cache se estiver offline
    e.respondWith(
      // "no-store": sem isto o fetch daqui e servido pelo cache HTTP do proprio
      // navegador (o GitHub Pages manda Cache-Control: max-age=600), e o
      // "rede primeiro" devolve a copia velha. Ja aconteceu: o conserto estava
      // publicado havia horas e o celular seguia rodando a versao anterior.
      fetch(new Request(e.request.url, { cache: "no-store" }))
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

// ---------------- LEMBRETE DE TREINO ----------------
// O app guarda a configuracao num cache que o service worker consegue ler.
// No Android com o app instalado, o sistema acorda o worker de tempos em tempos
// (periodicSync) e entao o lembrete chega mesmo com o app fechado. Onde nao ha
// suporte, o aviso so aparece quando o app e aberto -- e isso e o esperado.
const CACHE_CONFIG = "treinolivre-config";

async function verificarLembrete() {
  try {
    const c = await caches.open(CACHE_CONFIG);
    const r = await c.match("/config-lembrete");
    if (!r) return;
    const cfg = await r.json();
    if (!cfg || !cfg.ativo || !Array.isArray(cfg.dias)) return;

    const agora = new Date();
    if (cfg.dias.indexOf(agora.getDay()) < 0) return;

    const partes = String(cfg.hora || "18:00").split(":");
    const alvo = new Date();
    alvo.setHours(parseInt(partes[0]) || 18, parseInt(partes[1]) || 0, 0, 0);
    if (agora < alvo) return;

    const hoje = agora.toDateString();
    // ja treinou hoje? entao nao insiste
    if (cfg.ultimoTreino && new Date(cfg.ultimoTreino).toDateString() === hoje) return;
    // ja avisou hoje?
    const marca = await c.match("/lembrete-enviado");
    if (marca && (await marca.text()) === hoje) return;
    await c.put("/lembrete-enviado", new Response(hoje));

    await self.registration.showNotification("Hora do treino!", {
      body: "Seus musculos ja descansaram. Escolhe uma ficha e vamos.",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "treino-livre-lembrete",
      data: { url: "./" },
    });
  } catch (e) {}
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "lembrete-treino") e.waitUntil(verificarLembrete());
});

// Tocar no aviso abre o app que ja estiver aberto, em vez de uma aba nova
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.indexOf(self.registration.scope) === 0 && "focus" in cliente) return cliente.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
