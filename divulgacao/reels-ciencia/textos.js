// Os textos do Reels para a edição: a narração completa (para gravar), a
// legenda (.srt) e as palavras de reforço (o que aparece escrito na tela), com
// os tempos do vídeo da prévia. Com a voz gravada em audio/, os tempos são os
// das gravações (o mesmo cálculo do gerar.js).
//   node divulgacao/reels-ciencia/textos.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const R = require("./roteiro.js");
const AQUI = __dirname;
const SAIDA = path.join(AQUI, "textos");
fs.mkdirSync(SAIDA, { recursive: true });

const limpa = (s) => String(s).replace(/\*/g, "");
const dur = (arq) => { try { return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]).toString()) || 0; } catch (e) { return 0; } };
const cenas = [];
let t = 0.15;
R.cenas.forEach((c, ci) => {
  const cena = { ...c, falas: [], t0: t };
  c.falas.forEach((f, fi) => {
    const arq = path.join(AQUI, "audio", c.id + "-" + (fi + 1) + ".mp3");
    const d = (fs.existsSync(arq) && dur(arq)) || limpa(f.dito || f.texto).split(/\s+/).length / (f.quem === "jarvis" ? 2.8 : 3.0) + 0.25;
    cena.falas.push({ ...f, t0: t, dur: d, n: fi + 1 });
    t += d + (fi < c.falas.length - 1 ? 0.18 : 0);
  });
  t += ci < R.cenas.length - 1 ? 0.35 : 2.2;
  cena.t1 = t;
  cenas.push(cena);
});
const em = (c, m) => { const f = c.falas[Math.min(m[0], c.falas.length - 1)]; return f.t0 + m[1] * f.dur; };
const mmss = (s) => { const m = Math.floor(s / 60), x = s - m * 60; return m + ":" + x.toFixed(1).padStart(4, "0"); };
const srtT = (s) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23).replace(".", ",");
const QUEM = { dono: "VOCÊ", jarvis: "JARVIS", pessoa: "VOCÊ (dando o comando)" };
const NOMES = { gancho: "1. Gancho", monta: "2. O app monta o treino", literatura: "3. A literatura", ciclo: "4. O ciclo de 5 semanas", ajustes: "5. Os ajustes pelo histórico",
  botao: "6. O botão: atualizar sozinho", tempo: "7. Ajuste por tempo", jarvis: "8. O Jarvis", apoio: "9. Apoie o Treino Livre" };

// palavras de reforço: as palavras em destaque da fala e os textos da realidade aumentada
function reforcos(c) {
  const r = [];
  c.falas.forEach((f) => { (f.texto.match(/\*([^*]+)\*/g) || []).forEach((m) => r.push({ t: f.t0 + f.dur * (f.texto.indexOf(m) / f.texto.length), texto: m.replace(/\*/g, "").toUpperCase(), tipo: "palavra da fala" })); });
  (c.ar || []).forEach((a) => {
    const t0 = em(c, a.em);
    if (a.tipo === "titulo") r.push({ t: t0, texto: a.linhas.map(limpa).join(" "), tipo: "título" });
    if (a.tipo === "meme") r.push({ t: t0, texto: a.topo + " / " + a.base, tipo: "meme (" + a.arquivo + ")" });
    if (a.tipo === "chips") a.itens.forEach((x, i) => r.push({ t: t0 + i * 0.45, texto: x, tipo: "selo" }));
    if (a.tipo === "regra") r.push({ t: t0, texto: a.seta + " " + a.titulo + ": " + a.texto, tipo: "cartão" });
    if (a.tipo === "selo") r.push({ t: t0, texto: a.texto, tipo: "selo" });
    if (a.tipo === "fonte") r.push({ t: t0, texto: "📚 " + a.texto, tipo: "fonte do estudo" });
    if (a.tipo === "frequencia") r.push({ t: t0, texto: "📅 CADA MÚSCULO 2× POR SEMANA", tipo: "quadro" });
    if (a.tipo === "faixa") r.push({ t: t0, texto: "📊 10 A 20 SÉRIES POR SEMANA, POR MÚSCULO", tipo: "quadro" });
    if (a.tipo === "corpo") r.push({ t: t0, texto: "SUPINO: PEITO = 1 SÉRIE · TRÍCEPS E OMBRO = ½", tipo: "quadro" });
    if (a.tipo === "ciclo") r.push({ t: t0, texto: "🔄 CICLO DE 5 SEMANAS: BASE · SOBE · SOBE · PICO · RECUPERA", tipo: "quadro" });
    if (a.tipo === "relogio") r.push({ t: t0, texto: "⏱ 1H58 → 58 MIN", tipo: "relógio" });
    if (a.tipo === "lojas") r.push({ t: t0, texto: "🛍 MERCADO LIVRE · SHOPEE · SHEIN · 💠 PIX", tipo: "selos" });
    if (a.tipo === "jarvis") r.push({ t: c.falas[1].t0, texto: "“Jarvis, anota 80 por 10.” → Supino: 80 kg × 10 ✓ · Descanso de 3 min", tipo: "balões" });
    if (a.tipo === "fim") r.push({ t: t0, texto: "@carlos.jr.81 · Grátis · sem mensalidade · sem propaganda · 💛 Ajude: compras pelo link ou Pix", tipo: "cartão final" },
      { t: t0, texto: "Sugestão automática e educativa, baseada em estudos. Não substitui o profissional de Educação Física. Consulte um médico antes de começar.", tipo: "aviso (obrigatório)" });
  });
  return r.sort((a, b) => a.t - b.t);
}

// 1. a narração completa
const md = ["# Narração do Reels: o treino que se ajusta pela ciência", "",
  "Duração total: **" + mmss(t) + "** (tempos " + (fs.existsSync(path.join(AQUI, "audio")) && fs.readdirSync(path.join(AQUI, "audio")).some((f) => f.endsWith(".mp3")) ? "das gravações" : "estimados: com a sua voz, mudam") + "). Sem música.",
  "", "Grave **a coluna \"Fale assim\"**, uma fala por arquivo (nomes `<cena>-<n>.mp3`, como na tabela). As falas do JARVIS são de outra voz (calma, de assistente). As palavras em **negrito** são as de ênfase.", ""];
cenas.forEach((c) => {
  md.push("## " + NOMES[c.id] + "  (" + mmss(c.t0) + " – " + mmss(c.t1) + ")", "");
  c.falas.forEach((f) => {
    const quem = f.quem === "jarvis" ? "jarvis" : f.fala === "pessoa" ? "pessoa" : "dono";
    md.push("**" + c.id + "-" + f.n + ".mp3** · " + mmss(f.t0) + " · " + QUEM[quem], "",
      "> " + f.texto.replace(/\*([^*]+)\*/g, "**$1**"), "");
    if (f.dito) md.push("Fale assim: _" + f.dito + "_", "");
  });
  const rf = reforcos(c);
  if (rf.length) { md.push("Palavras de reforço na tela:", ""); rf.forEach((x) => md.push("- " + mmss(x.t) + " · " + x.texto + " _(" + x.tipo + ")_")); md.push(""); }
});
md.push("## Texto corrido (para ler de uma vez)", "");
cenas.forEach((c) => c.falas.forEach((f) => md.push((f.quem === "jarvis" ? "JARVIS: " : "") + limpa(f.dito || f.texto))));
fs.writeFileSync(path.join(SAIDA, "narracao.md"), md.join("\n") + "\n");

// 2. a legenda: uma linha a cada frase curta (até ~5 palavras), como no vídeo
const srt = []; let n = 1;
cenas.forEach((c) => c.falas.forEach((f) => {
  const pal = limpa(f.texto).split(/\s+/);
  const grupos = []; let g = [];
  pal.forEach((w, i) => { g.push(w); if (g.length >= 5 || (/[.,!?:]$/.test(w) && g.length >= 2) || i === pal.length - 1) { grupos.push(g); g = []; } });
  const tot = pal.join(" ").length; let acc = 0;
  grupos.forEach((gr) => { const a = f.t0 + f.dur * (acc / tot); acc += gr.join(" ").length + 1; const b = f.t0 + f.dur * Math.min(1, acc / tot);
    srt.push(n++, srtT(a) + " --> " + srtT(b), (f.quem === "jarvis" ? "🎙 " : "") + gr.join(" "), ""); });
}));
fs.writeFileSync(path.join(SAIDA, "legenda.srt"), srt.join("\n"));

// 3. as palavras de reforço numa planilha (CapCut, Premiere, planilha do celular)
const csv = ["inicio;fim;cena;tipo;texto"];
cenas.forEach((c) => reforcos(c).forEach((x, i, l) => csv.push([x.t.toFixed(2), Math.min(c.t1, x.t + 2.5).toFixed(2), NOMES[c.id], x.tipo, '"' + x.texto.replace(/"/g, '""') + '"'].join(";"))));
fs.writeFileSync(path.join(SAIDA, "reforcos.csv"), "﻿" + csv.join("\n") + "\n");

// 4. a narração em texto puro, só o que se fala (teleprompter)
fs.writeFileSync(path.join(SAIDA, "narracao-para-gravar.txt"), cenas.map((c) => NOMES[c.id].toUpperCase() + "\n" + c.falas.map((f) =>
  "[" + c.id + "-" + f.n + "] " + (f.quem === "jarvis" ? "(JARVIS) " : "") + limpa(f.dito || f.texto)).join("\n")).join("\n\n") + "\n");
console.log("ok: " + SAIDA + " (" + mmss(t) + ")");
