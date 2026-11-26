// Monta o vídeo de divulgação do Treino Livre (1080x1920, sem áudio).
//
// Pedido do dono (2026-11-26): um vídeo para o Instagram, sem narração
// falada (ele grava a voz depois), com a legenda acompanhando como se
// alguém estivesse falando, a identidade visual do app, a logo de intro,
// um gancho no começo e uma enquete no fim.
//
// Como funciona: o `video-divulgacao.html` desenha cada quadro num canvas
// de 1080x1920 (tudo é função do tempo, então o quadro de cada instante
// sai igual em qualquer máquina); aqui, o Chromium pede quadro a quadro e
// os JPEGs vão direto para o stdin do ffmpeg, que fecha o MP4 em H.264.
// Nenhum quadro toca o disco.
//
//   node ferramentas/video-divulgacao.js [saida.mp4] [--fps 30] [--escala 1]
//
// Mexeu no roteiro ou nas cenas? É só o HTML; este arquivo não muda.

const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const args = process.argv.slice(2);
function opt(nome, padrao) {
  const i = args.indexOf("--" + nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
}
const SAIDA = args.find((a) => !a.startsWith("--") && !/^\d+(\.\d+)?$/.test(a)) || path.join(RAIZ, "divulgacao", "treino-livre-video.mp4");
const FPS = Math.max(10, Math.min(60, +opt("fps", 30)));
const ESCALA = Math.max(0.25, Math.min(1, +opt("escala", 1)));

const TIPOS = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".js": "text/javascript; charset=utf-8" };

function servir() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
      const arq = path.join(RAIZ, rel);
      if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
        res.writeHead(404); res.end("nao achei"); return;
      }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] || "application/octet-stream" });
      fs.createReadStream(arq).pipe(res);
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}

(async () => {
  const servidor = await servir();
  const porta = servidor.address().port;
  const navegador = await chromium.launch({ args: ["--no-sandbox", "--font-render-hinting=none"] });
  const pagina = await navegador.newPage({ viewport: { width: 400, height: 700 } });
  pagina.on("pageerror", (e) => console.error("ERRO NA PÁGINA:", e.message));
  await pagina.goto("http://127.0.0.1:" + porta + "/ferramentas/video-divulgacao.html");
  await pagina.waitForFunction("window.pronto === true", null, { timeout: 60000 });
  const dur = await pagina.evaluate("window.DURACAO");
  const total = Math.round((dur / 1000) * FPS);
  const larg = Math.round(1080 * ESCALA / 2) * 2, alt = Math.round(1920 * ESCALA / 2) * 2;
  console.log("Duração: " + (dur / 1000).toFixed(1) + " s · " + total + " quadros a " + FPS + " fps · " + larg + "x" + alt);

  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-vf", "scale=" + larg + ":" + alt + ":flags=lanczos",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), SAIDA]);
  let erroFf = "";
  ff.stderr.on("data", (d) => { erroFf += d.toString(); });
  const fim = new Promise((ok, falha) => {
    ff.on("close", (code) => (code === 0 ? ok() : falha(new Error("ffmpeg saiu com " + code + "\n" + erroFf.slice(-1800)))));
  });

  const t0 = Date.now();
  for (let q = 0; q < total; q++) {
    const ms = (q / FPS) * 1000;
    const b64 = await pagina.evaluate((t) => window.quadroJpeg(t), ms);
    const buf = Buffer.from(b64, "base64");
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (q % 60 === 0 || q === total - 1) {
      const pct = Math.round(((q + 1) / total) * 100);
      const seg = (Date.now() - t0) / 1000;
      process.stdout.write("\r  " + String(pct).padStart(3) + "%  quadro " + (q + 1) + "/" + total + "  (" + seg.toFixed(0) + " s)   ");
    }
  }
  ff.stdin.end();
  await fim;
  process.stdout.write("\n");
  await navegador.close();
  servidor.close();
  const kb = Math.round(fs.statSync(SAIDA).size / 1024);
  console.log("Pronto: " + SAIDA + " (" + (kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : kb + " KB") + ", sem áudio)");
})().catch((e) => { console.error(e); process.exit(1); });
