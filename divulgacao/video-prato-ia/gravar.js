// Grava o vídeo do cenas.html quadro a quadro (1080×1920, 30 por segundo).
//
//   node divulgacao/video-prato-ia/gravar.js                 → video-mudo.mp4 (com a batida)
//   node divulgacao/video-prato-ia/gravar.js --quadros 2,9,20 → previa-<t>.png
//
// Precisa de: Node, o Playwright com o Chromium, e o ffmpeg.
// A narração com o clone de voz entra depois, pelo narrar.js.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const { chromium } = require("playwright");

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, "../..");
const FPS = 30;
const args = process.argv.slice(2);
const quadros = args.includes("--quadros") ? args[args.indexOf("--quadros") + 1].split(",").map(Number) : null;
const saida = args.includes("--saida") ? args[args.indexOf("--saida") + 1] : path.join(AQUI, "video-mudo.mp4");

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png" };
const servidor = http.createServer((req, res) => {
  const p = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(RAIZ) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

// Uma batida própria, sintetizada aqui (nada de música de terceiros):
// bumbo, palma e chimbal a 124 batidas por minuto, com um baixo simples.
function batida(segundos, arquivo) {
  const taxa = 44100, n = Math.ceil(segundos * taxa);
  const s = new Float32Array(n);
  const bpm = 124, tempo = 60 / bpm;
  const notas = [55, 55, 65.41, 49];
  for (let b = 0; b * tempo < segundos; b++) {
    const t0 = b * tempo, i0 = Math.floor(t0 * taxa);
    for (let k = 0; k < taxa * 0.35 && i0 + k < n; k++) { // bumbo
      const t = k / taxa, f = 50 + 90 * Math.exp(-t * 30);
      s[i0 + k] += 0.55 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9);
    }
    if (b % 2 === 1) for (let k = 0; k < taxa * 0.18 && i0 + k < n; k++) { // palma
      const t = k / taxa; s[i0 + k] += 0.22 * (Math.random() * 2 - 1) * Math.exp(-t * 22);
    }
    const nota = notas[Math.floor(b / 4) % notas.length]; // baixo na contratempo
    const ib = Math.floor((t0 + tempo / 2) * taxa);
    for (let k = 0; k < taxa * tempo * 0.45 && ib + k < n; k++) {
      const t = k / taxa; s[ib + k] += 0.18 * Math.sign(Math.sin(2 * Math.PI * nota * t)) * Math.exp(-t * 6);
    }
    for (const fr of [0.25, 0.75]) { // chimbal
      const ih = Math.floor((t0 + tempo * fr) * taxa);
      for (let k = 0; k < taxa * 0.04 && ih + k < n; k++) s[ih + k] += 0.07 * (Math.random() * 2 - 1) * Math.exp(-k / taxa * 90);
    }
  }
  const fadeIn = taxa * 0.5, fadeOut = taxa * 2.5;
  for (let i = 0; i < n; i++) {
    let g = 1;
    if (i < fadeIn) g = i / fadeIn;
    if (i > n - fadeOut) g = (n - i) / fadeOut;
    s[i] = Math.max(-1, Math.min(1, s[i] * g * 0.8));
  }
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(taxa, 24); buf.writeUInt32LE(taxa * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(s[i] * 32767), 44 + i * 2);
  fs.writeFileSync(arquivo, buf);
}

(async () => {
  await new Promise((ok) => servidor.listen(0, ok));
  const porta = servidor.address().port;
  const nav = await chromium.launch();
  const pag = await nav.newPage({ viewport: { width: 400, height: 700 } });
  await pag.goto("http://localhost:" + porta + "/divulgacao/video-prato-ia/cenas.html");
  await pag.evaluate(() => window.pronto);
  const dur = await pag.evaluate(() => duracao());
  const quadro = (t) => pag.evaluate((t) => { desenhar(t); return document.getElementById("tela").toDataURL("image/jpeg", 0.92).split(",")[1]; }, t);

  if (quadros) {
    for (const t of quadros) fs.writeFileSync(path.join(AQUI, "previa-" + t + ".jpg"), Buffer.from(await quadro(t), "base64"));
    console.log("prévias salvas");
  } else {
    const wav = path.join(AQUI, "batida.wav");
    batida(dur, wav);
    const ff = spawn("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
      "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", saida], { stdio: ["pipe", "ignore", "inherit"] });
    const total = Math.round(dur * FPS);
    for (let f = 0; f < total; f++) {
      const b = Buffer.from(await quadro(f / FPS), "base64");
      if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
      if (f % 150 === 0) console.log("quadro " + f + " de " + total);
    }
    ff.stdin.end();
    await new Promise((ok) => ff.on("close", ok));
    console.log("pronto: " + saida + " (" + dur.toFixed(1) + " s)");
  }
  await nav.close();
  servidor.close();
})();
