// Tira do próprio vídeo os tempos de cada fala, para gravar a narração.
//
// Pedido do dono (2026-11-26): "me envie o arquivo para eu gerar o áudio da
// narração com tempo marcado". Os tempos saem da lista CENAS do
// `video-divulgacao.html` — a mesma que desenha a legenda na tela —, então o
// áudio gravado por cima cai exatamente onde a palavra aparece. Mexeu no
// roteiro? Rode isto de novo e os três arquivos se refazem.
//
//   node ferramentas/video-legendas.js
//
// Sai em divulgacao/:
//   treino-livre-video.srt   a legenda com timecode (CapCut, Premiere, YouTube…)
//   treino-livre-video.txt   a tabela para ler na hora de gravar
//   treino-livre-video.csv   início, fim e duração de cada frase (para TTS)

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(__dirname, "video-divulgacao.html"), "utf8").replace(/\r\n/g, "\n");

function pedaco(de, ate) {
  const i = html.indexOf(de);
  if (i < 0) throw new Error("não achei " + de);
  const j = html.indexOf(ate, i);
  return html.slice(i, j + ate.length);
}
// a lista de cenas e a janela em que a legenda fica na tela
const CENAS = eval(pedaco("var CENAS = [", "];").replace("var CENAS =", "") + "");
const TRANS = +(/var TRANS = (\d+)/.exec(html) || [])[1] || 520;
const ENTRA = 220, SAI = 280;   // os mesmos da função legenda()

const inicio = [];
let t = 0;
CENAS.forEach((c) => { inicio.push(t); t += c.ms; });
const DURACAO = t;

function hms(ms, virgula) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const x = Math.floor(ms % 1000);
  const sep = virgula ? "," : ".";
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + sep + String(x).padStart(3, "0");
}
function curto(ms) {
  const m = Math.floor(ms / 60000), s = (ms % 60000) / 1000;
  return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ",");
}

// A janela de cada fala é a mesma em que a legenda está escrita na tela.
const falas = CENAS.map((c, i) => {
  const dur = c.ms * (c.falaAte || 1);
  const de = inicio[i] + ENTRA;
  const ate = inicio[i] + dur - SAI * 0.4;
  return { i, tipo: c.tipo, de, ate, dur: ate - de, texto: c.fala };
}).filter((f) => f.texto);

// ---- o .srt ----
const srt = falas.map((f, n) =>
  (n + 1) + "\n" + hms(f.de, true) + " --> " + hms(f.ate, true) + "\n" + f.texto + "\n").join("\n");
fs.writeFileSync(path.join(RAIZ, "divulgacao", "treino-livre-video.srt"), srt, "utf8");

// ---- a tabela para ler gravando ----
const palavras = (s) => s.split(/\s+/).filter(Boolean).length;
const linhas = [
  "A NARRAÇÃO DO VÍDEO — tempo de cada fala",
  "",
  "Vídeo: divulgacao/treino-livre-video.mp4 · " + (DURACAO / 1000).toFixed(1) + " s · sem áudio.",
  "Os tempos são os mesmos em que a legenda está escrita na tela: falando",
  "nessa janela, a voz cai em cima da palavra.",
  "",
  "A coluna 'ritmo' é quantas palavras por minuto aquela frase pede. Até umas",
  "180 dá para falar com calma; acima de 220 fica corrido — nesse caso vale",
  "mais encurtar a frase (no ferramentas/video-divulgacao.html) e gerar o",
  "vídeo e este arquivo de novo do que acelerar a voz.",
  "",
];
falas.forEach((f, n) => {
  const ppm = Math.round((palavras(f.texto) / (f.dur / 1000)) * 60);
  linhas.push(String(n + 1).padStart(2) + ". " + curto(f.de) + " → " + curto(f.ate) +
    "   (" + (f.dur / 1000).toFixed(1) + " s · " + ppm + " palavras/min)");
  linhas.push("    " + f.texto);
  linhas.push("");
});
linhas.push("Depois da última fala sobram " + ((DURACAO - falas[falas.length - 1].ate) / 1000).toFixed(1) +
  " s de enquete na tela, sem narração.");
fs.writeFileSync(path.join(RAIZ, "divulgacao", "treino-livre-video.txt"), linhas.join("\n") + "\n", "utf8");

// ---- o .csv, para quem gera a voz num programa ----
const csv = ["n;inicio_s;fim_s;duracao_s;inicio;fim;texto"]
  .concat(falas.map((f, n) => [n + 1, (f.de / 1000).toFixed(2), (f.ate / 1000).toFixed(2),
    (f.dur / 1000).toFixed(2), hms(f.de), hms(f.ate), '"' + f.texto.replace(/"/g, '""') + '"'].join(";")));
fs.writeFileSync(path.join(RAIZ, "divulgacao", "treino-livre-video.csv"), "﻿" + csv.join("\n") + "\n", "utf8");

console.log(falas.length + " falas · " + (DURACAO / 1000).toFixed(1) + " s");
falas.forEach((f, n) => console.log("  " + String(n + 1).padStart(2) + ". " + curto(f.de) + " → " + curto(f.ate) +
  "  (" + (f.dur / 1000).toFixed(1) + " s, " + Math.round((palavras(f.texto) / (f.dur / 1000)) * 60) + " ppm)  " + f.texto));
console.log("\nEscrevi em divulgacao/: treino-livre-video.srt, .txt e .csv");
