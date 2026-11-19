// Monta o Reels a partir do roteiro.js e das telas reais (telas/, feitas pelo
// capturar.js): uma página 1080×1920 desenha cada quadro (o celular em 3D, a
// câmera indo até o elemento da tela, os toques, a realidade aumentada, a
// legenda palavra por palavra) e o Chromium a fotografa 30 vezes por segundo.
//
//   node divulgacao/reels-ciencia/gerar.js            o vídeo inteiro
//   node divulgacao/reels-ciencia/gerar.js --ate 12   só os primeiros 12 s (prévia)
//   node divulgacao/reels-ciencia/gerar.js --quadro 5 uma imagem do segundo 5
//
// Com a voz dublada em audio/ (dublar.js), cada fala dura o que a gravação
// dura e o áudio entra no vídeo. Sem ela, o tempo é estimado e o vídeo sai mudo
// (a legenda já conta a história). Sem música: ela entra na edição.
// Os memes: memes/<nome>.jpg|png|webp (ver LEIA-ME.md); sem o arquivo, entra
// uma figurinha desenhada aqui.
const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const AQUI = __dirname;
const RAIZ = path.join(AQUI, "..", "..");
const R = require("./roteiro.js");
const FPS = 30, W = 1080, H = 1920;
const args = process.argv.slice(2);
const opc = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

// ---- o tempo de cada fala: o da gravação, ou a estimativa ----
function duracaoAudio(arq) {
  try { return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]).toString()) || 0; } catch (e) { return 0; }
}
const limpa = (s) => String(s).replace(/\*/g, "");
const cenas = [];
let t = 0.15;
R.cenas.forEach((c, ci) => {
  const cena = { ...c, t0: t, falas: [] };
  c.falas.forEach((f, fi) => {
    const arq = path.join(AQUI, "audio", c.id + "-" + (fi + 1) + ".mp3");
    const palavras = limpa(f.dito || f.texto).split(/\s+/).length;
    const est = palavras / (f.quem === "jarvis" ? 2.8 : 3.0) + 0.25;
    const real = fs.existsSync(arq) ? duracaoAudio(arq) : 0;
    const dur = real || est;
    cena.falas.push({ ...f, t0: t, dur: dur, audio: real ? arq : null });
    t += dur + (fi < c.falas.length - 1 ? 0.18 : 0);
  });
  t += ci < R.cenas.length - 1 ? 0.35 : 2.2;
  cena.t1 = t;
  cenas.push(cena);
});
const TOTAL = t;
const em = (cena, m) => { const f = cena.falas[Math.min(m[0], cena.falas.length - 1)]; return f.t0 + m[1] * f.dur; };

// ---- o que a página recebe ----
const caixasDe = (img) => { try { return JSON.parse(fs.readFileSync(path.join(AQUI, "telas", img + ".json"), "utf8")); } catch (e) { return {}; } };
function memeArquivo(nome) {
  for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
    const a = path.join(AQUI, "memes", nome + "." + ext);
    if (fs.existsSync(a)) return "data:image/" + (ext === "jpg" ? "jpeg" : ext) + ";base64," + fs.readFileSync(a).toString("base64");
  }
  return null;
}
const dadosPagina = {
  total: TOTAL,
  cenas: cenas.map((c) => {
    const box = (img) => Object.assign({}, caixasDe(img), c.caixas || {});
    return {
      id: c.id, t0: c.t0, t1: c.t1, tremer: c.tremer ? em(c, c.tremer) : null,
      falas: c.falas.map((f) => ({ t0: f.t0, dur: f.dur, texto: f.texto, quem: f.quem, fala: f.fala || null })),
      telas: c.telas.map((tl) => ({ img: tl.img, de: em(c, tl.de), escurecer: tl.escurecer || 0, caixas: box(tl.img),
        cam: tl.cam.map((k) => ({ t: em(c, [k[0], k[1]]), alvo: k[2], zoom: k[3] })) })),
      toques: (c.toques || []).map((k) => ({ t: em(c, [k[0], k[1]]), alvo: k[2] })),
      realces: (c.realces || []).map((k) => ({ t: em(c, [k[0], k[1]]), alvo: k[2], dur: k[3] })),
      ar: (c.ar || []).map((a) => ({ ...a, em: em(c, a.em), ate: c.falas[Math.min(a.ate[0], c.falas.length - 1)].t0 + a.ate[1] * c.falas[Math.min(a.ate[0], c.falas.length - 1)].dur,
        img: a.tipo === "meme" ? memeArquivo(a.arquivo) : undefined })),
    };
  }),
};

// ---- a página ----
const fonte = (n) => "file://" + n;
const PAGINA = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:I;src:url(${fonte("/usr/share/fonts/opentype/inter/Inter-Black.otf")})}
@font-face{font-family:IB;src:url(${fonte("/usr/share/fonts/opentype/inter/Inter-Bold.otf")})}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#060606;font-family:I,IB,Inter,sans-serif;color:#fff}
#palco{position:absolute;inset:0;overflow:hidden;perspective:1800px}
.blob{position:absolute;width:900px;height:900px;border-radius:50%;filter:blur(120px);opacity:.42}
.pt{position:absolute;width:6px;height:6px;border-radius:3px;background:#fff}
#cel{position:absolute;left:${(W - 628) / 2}px;top:300px;width:628px;height:1326px;border-radius:64px;background:#111;padding:14px;
 box-shadow:0 40px 120px rgba(0,0,0,.8),0 0 0 3px #2a2a2a,0 0 80px rgba(225,48,108,.25);transform-style:preserve-3d}
#tela{position:relative;width:600px;height:1298px;border-radius:50px;overflow:hidden;background:#000}
.cam{position:absolute;left:0;top:0;width:600px;height:1298px;transform-origin:0 0}
.cam img{width:600px;height:1298px;display:block}
.escuro{position:absolute;inset:0;background:#000}
.realce{position:absolute;border-radius:16px;border:5px solid #FF3D7F;box-shadow:0 0 30px #FF3D7F,inset 0 0 22px rgba(255,61,127,.45)}
.toque{position:absolute;border-radius:50%;border:6px solid #fff;background:rgba(255,255,255,.25)}
.dedo{position:absolute;font-size:96px;filter:drop-shadow(0 8px 12px rgba(0,0,0,.6))}
.onda{position:absolute;border-radius:50%;border:5px solid #38E1FF}
#flash{position:absolute;inset:0;background:#fff;pointer-events:none}
#barra{position:absolute;left:0;top:0;height:8px;background:linear-gradient(90deg,#F58529,#E1306C,#833AB4)}
#leg{position:absolute;left:40px;right:40px;top:1660px;text-align:center;font-size:60px;line-height:1.16;letter-spacing:-1px}
.w{display:inline-block;margin:0 9px;text-shadow:0 4px 0 #000,0 0 18px rgba(0,0,0,.9);-webkit-text-stroke:2px #000;paint-order:stroke fill}
.hl{background:linear-gradient(90deg,#FFB347,#FF3D7F,#B86BFF);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:0;text-shadow:none;filter:drop-shadow(0 4px 0 #000) drop-shadow(0 0 10px rgba(0,0,0,.8))}
.jv .w{color:#7CF4FF;font-family:IB}
.jv-rot{display:block;font-size:30px;color:#38E1FF;letter-spacing:4px;margin-bottom:10px;font-family:IB}
.ar{position:absolute;transform-origin:50% 50%}
.cart{background:rgba(14,14,18,.92);border:2px solid rgba(255,255,255,.14);border-radius:28px;box-shadow:0 30px 70px rgba(0,0,0,.7),0 0 40px rgba(225,48,108,.25);padding:22px 26px}
.tit{font-size:30px;letter-spacing:3px;color:#FF7AA8;font-family:IB;margin-bottom:12px}
.meme{width:430px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.8);border:6px solid #fff}
.meme .mt{font-family:I;font-size:40px;text-transform:uppercase;color:#fff;-webkit-text-stroke:3px #000;paint-order:stroke fill;text-align:center;line-height:1.05;padding:10px 12px}
</style></head><body><div id="palco"></div><script>
const D = ${JSON.stringify(dadosPagina)};
const K = 600 / 390, CW = 390, CH = 844;
const P = document.getElementById("palco");
const el = (tag, css, pai, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; (pai || P).appendChild(e); return e; };
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const io = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const oo = (x) => 1 - Math.pow(1 - x, 3);
const pop = (x) => { x = cl(x, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const fr = (t, a, d) => cl((t - a) / d, 0, 1);
// fundo: três luzes da marca passeando e partículas subindo
const blobs = ["#E1306C", "#833AB4", "#F58529"].map((c) => el("div", "background:" + c, P, "").classList.add("blob") || P.lastChild);
const pts = Array.from({ length: 46 }, (_, i) => { const e = el("div", "", P); e.className = "pt"; return e; });
// o celular
const cel = el("div", ""); cel.id = "cel";
const tela = el("div", "", cel); tela.id = "tela";
const camadas = {};
const cache = {};
D.cenas.forEach((c) => c.telas.forEach((tl) => {
  const k = c.id + ":" + tl.img + ":" + tl.de;
  const cam = el("div", "", tela); cam.className = "cam";
  el("img", "", cam).src = "telas/" + tl.img + ".png";
  const esc = el("div", "opacity:0", cam); esc.className = "escuro";
  camadas[k] = { cam, esc, tl, realces: {}, toques: {} };
}));
const flash = el("div", "opacity:0"); flash.id = "flash";
const barra = el("div", ""); barra.id = "barra";
const leg = el("div", ""); leg.id = "leg";
const caixa = (tl, alvo) => (alvo && tl.caixas[alvo]) || { x: 0, y: 0, w: CW, h: CH };
// a câmera: o ponto do alvo no meio da tela, com o zoom, sem mostrar a borda
function camera(tl, t) {
  const ks = tl.cam; let a = ks[0], b = ks[0];
  for (let i = 0; i < ks.length; i++) { if (ks[i].t <= t) { a = ks[i]; b = ks[i + 1] || ks[i]; } }
  const q = b === a ? 0 : io(fr(t, a.t, Math.max(.2, Math.min(.9, b.t - a.t))));
  const ca = caixa(tl, a.alvo), cb = caixa(tl, b.alvo);
  const px = (ca.x + ca.w / 2) * (1 - q) + (cb.x + cb.w / 2) * q, py = (ca.y + ca.h / 2) * (1 - q) + (cb.y + cb.h / 2) * q;
  const s = (a.zoom * (1 - q) + b.zoom * q) * (1 + .015 * Math.sin(t * 1.3));
  const tx = cl(CW / 2 - px * s, CW - CW * s, 0), ty = cl(CH / 2 - py * s, CH - CH * s, 0);
  return { s, tx, ty };
}
// a legenda: frases de até 5 palavras, palavra por palavra
const frases = [];
D.cenas.forEach((c) => c.falas.forEach((f) => {
  const toks = []; let hl = false;
  f.texto.split(/\\s+/).forEach((w) => { const ab = w.startsWith("*"), fe = /\\*[.,!?:;]*$/.test(w); if (ab) hl = true; toks.push({ w: w.replace(/\\*/g, ""), hl }); if (fe) hl = false; });
  const grupos = []; let g = [];
  toks.forEach((tk, i) => { g.push(tk); if (g.length >= 5 || /[.,!?:]$/.test(tk.w) && g.length >= 2 || i === toks.length - 1) { grupos.push(g); g = []; } });
  const tot = toks.reduce((s, x) => s + x.w.length + 2, 0); let acc = 0;
  grupos.forEach((gr) => { gr.forEach((tk) => { tk.t = f.t0 + (acc / tot) * f.dur * .96; acc += tk.w.length + 2; }); frases.push({ t0: gr[0].t, t1: f.t0 + (acc / tot) * f.dur, toks: gr, quem: f.quem, fala: f.fala }); });
}));
frases.forEach((fz, i) => { const prox = frases[i + 1]; fz.fim = prox && prox.t0 - fz.t1 < .5 ? prox.t0 : fz.t1 + .35; });
// a realidade aumentada
const AR = [];
D.cenas.forEach((c) => c.ar.forEach((a) => {
  const n = el("div", "opacity:0"); n.className = "ar"; const o = { a, c, n }; montarAR(o); AR.push(o);
}));
function hlTexto(s) { return s.replace(/\\*([^*]+)\\*/g, '<span class="hl">$1</span>'); }
function montarAR(o) {
  const a = o.a, n = o.n;
  if (a.tipo === "titulo") { n.style.cssText += ";left:0;right:0;top:70px;text-align:center"; a.linhas.forEach((l) => { const d = el("div", "font-size:86px;line-height:1.02;letter-spacing:-2px", n); l.split(" ").forEach((w) => { const hl = w.includes("*"); const s = el("span", "", d, w.replace(/\\*/g, "")); s.className = "w" + (hl ? " hl" : ""); }); }); }
  else if (a.tipo === "meme") { n.style.cssText += ";left:600px;top:250px"; n.innerHTML = '<div class="meme">' + (a.topo ? '<div class="mt" style="background:#111">' + a.topo + "</div>" : "") +
    (a.img ? '<img src="' + a.img + '" style="width:100%;display:block">' : '<div style="height:300px;display:flex;align-items:center;justify-content:center;font-size:190px;background:radial-gradient(circle,#ffe08a,#ff9a3c)">' + a.emoji + "</div>") +
    (a.base ? '<div class="mt" style="background:#111">' + a.base + "</div>" : "") + "</div>"; }
  else if (a.tipo === "chips") { n.style.cssText += ";left:28px;top:470px"; o.itens = a.itens.map((x) => { const d = el("div", "font-size:40px;margin-bottom:18px;padding:16px 26px;border-radius:40px;background:linear-gradient(90deg,#F58529,#E1306C,#833AB4);font-family:IB;box-shadow:0 20px 50px rgba(0,0,0,.6)", n, x); return d; }); }
  else if (a.tipo === "frequencia") { n.style.cssText += ";left:40px;top:1060px"; const c = el("div", "", n); c.className = "cart";
    el("div", "", c, "📅 CADA MÚSCULO 2× POR SEMANA").className = "tit";
    o.dias = []; [["Peito", [0, 3]], ["Costas", [1, 4]], ["Pernas", [2, 5]]].forEach(([m, ds]) => { const l = el("div", "display:flex;align-items:center;gap:10px;margin:8px 0", c); el("div", "width:130px;font-size:30px;font-family:IB", l, m);
      "STQQSSD".split("").forEach((d, i) => { const b = el("div", "width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;font-family:IB;background:#222", l, d); if (ds.indexOf(i) >= 0) o.dias.push(b); }); }); }
  else if (a.tipo === "faixa") { n.style.cssText += ";left:60px;top:1180px;width:960px"; const c = el("div", "", n); c.className = "cart"; el("div", "", c, "📊 SÉRIES POR SEMANA, POR MÚSCULO").className = "tit";
    const g = el("div", "position:relative;height:56px;border-radius:28px;background:#262626;overflow:hidden", c); el("div", "position:absolute;top:0;bottom:0;left:40%;width:40%;background:rgba(74,222,128,.35)", g);
    o.fill = el("div", "position:absolute;top:0;bottom:0;left:0;width:0;background:linear-gradient(90deg,#F58529,#E1306C)", g);
    const r = el("div", "display:flex;justify-content:space-between;font-size:28px;margin-top:10px;font-family:IB;color:#aaa", c); r.innerHTML = "<span>0</span><span style='color:#4ADE80'>10 ←— faixa que faz crescer —→ 20</span><span>25</span>"; }
  else if (a.tipo === "corpo") { n.style.cssText += ";left:560px;top:860px"; const c = el("div", "width:470px", n); c.className = "cart";
    el("div", "", c, "🏋 SUPINO CONTA ASSIM").className = "tit";
    c.innerHTML += '<svg viewBox="0 0 200 260" width="420" height="420"><g fill="#2b2b33" stroke="#555" stroke-width="2"><circle cx="100" cy="28" r="20"/><path d="M62 58 Q100 48 138 58 L146 150 Q100 162 54 150 Z"/><path d="M54 150 L70 250 L94 250 L100 170 L106 250 L130 250 L146 150 Z"/></g>' +
      '<g id="ombros"><ellipse cx="58" cy="66" rx="17" ry="14" fill="#FACC15"/><ellipse cx="142" cy="66" rx="17" ry="14" fill="#FACC15"/></g>' +
      '<g id="peito"><path d="M68 70 Q100 62 132 70 L128 104 Q100 112 72 104 Z" fill="#FF3D7F"/></g>' +
      '<g id="triceps"><path d="M34 76 L50 76 L44 132 L30 130 Z" fill="#FACC15"/><path d="M166 76 L150 76 L156 132 L170 130 Z" fill="#FACC15"/></g>' +
      '<text x="100" y="94" text-anchor="middle" font-size="22" font-family="IB" fill="#fff">1</text><text x="36" y="58" font-size="18" font-family="IB" fill="#FACC15">½</text><text x="18" y="112" font-size="18" font-family="IB" fill="#FACC15">½</text></svg>' +
      '<div style="font-size:28px;font-family:IB"><span style="color:#FF3D7F">● peito = 1 série</span><br><span style="color:#FACC15">● tríceps e ombro = ½</span></div>'; o.peito = c.querySelector("#peito"); o.am = [c.querySelector("#ombros"), c.querySelector("#triceps")]; }
  else if (a.tipo === "fonte") { n.style.cssText += ";left:0;right:0;top:1500px;display:flex;justify-content:center"; el("div", "font-size:32px;font-family:IB;padding:12px 26px;border-radius:30px;background:rgba(56,225,255,.16);border:2px solid #38E1FF;color:#BFF6FF", n, "📚 " + a.texto); }
  else if (a.tipo === "ciclo") { n.style.cssText += ";left:90px;top:620px;width:900px"; const c = el("div", "", n); c.className = "cart"; el("div", "", c, "🔄 CICLO DE 5 SEMANAS").className = "tit";
    const g = el("div", "display:flex;align-items:flex-end;gap:22px;height:420px;margin-top:10px", c); o.barras = [];
    [[.45, "Base", "#F58529"], [.65, "Sobe", "#E1306C"], [.75, "Sobe", "#E1306C"], [1, "Pico", "#FF3D7F"], [.3, "Recupera", "#38E1FF"]].forEach(([h, rot, cor], i) => {
      const col = el("div", "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%", g);
      const b = el("div", "width:100%;border-radius:18px 18px 6px 6px;background:" + cor + ";height:0", col); el("div", "font-size:28px;font-family:IB;margin-top:10px", col, rot);
      o.barras.push({ b, h }); }); }
  else if (a.tipo === "regra") { n.style.cssText += ";left:600px;top:" + (760 + a.pos * 190) + "px"; const c = el("div", "display:flex;align-items:center;gap:20px;width:450px;border-color:" + a.cor, n); c.className = "cart";
    o.seta = el("div", "font-size:84px;font-family:I;color:" + a.cor + ";width:80px;text-align:center", c, a.seta); const tx = el("div", "", c); el("div", "font-size:44px;font-family:I;color:" + a.cor, tx, a.titulo); el("div", "font-size:30px;color:#ddd;font-family:IB", tx, a.texto); }
  else if (a.tipo === "selo") { n.style.cssText += ";left:330px;top:520px"; el("div", "font-size:90px;font-family:I;color:#4ADE80;border:10px solid #4ADE80;border-radius:28px;padding:10px 34px;background:rgba(0,0,0,.6);box-shadow:0 0 60px rgba(74,222,128,.6)", n, a.texto); }
  else if (a.tipo === "relogio") { n.style.cssText += ";left:640px;top:250px"; const c = el("div", "width:400px;text-align:center", n); c.className = "cart";
    c.innerHTML = '<svg width="230" height="230" viewBox="0 0 100 100" style="display:block;margin:0 auto"><circle cx="50" cy="50" r="42" fill="none" stroke="#2a2a2a" stroke-width="10"/><circle id="anel" cx="50" cy="50" r="42" fill="none" stroke="url(#gr)" stroke-width="10" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="264" stroke-dashoffset="0"/><defs><linearGradient id="gr"><stop offset="0" stop-color="#F58529"/><stop offset="1" stop-color="#E1306C"/></linearGradient></defs></svg>' +
      '<div id="min" style="font-size:70px;font-family:I;margin-top:-152px;height:150px">1h58</div><div style="font-size:30px;font-family:IB;color:#ddd;margin-top:14px">⏱ cabe no seu tempo</div>'; o.anel = c.querySelector("#anel"); o.min = c.querySelector("#min"); }
  else if (a.tipo === "jarvis") { n.style.cssText += ";left:60px;top:700px;width:960px"; o.b1 = el("div", "margin-left:auto;width:600px;font-size:44px;font-family:IB;padding:24px 30px;border-radius:34px 34px 8px 34px;background:linear-gradient(90deg,#E1306C,#833AB4);box-shadow:0 20px 60px rgba(0,0,0,.6);opacity:0", n, "🗣 “Jarvis, anota 80 por 10.”");
    o.b2 = el("div", "margin-top:26px;width:760px;font-size:42px;font-family:IB;padding:24px 30px;border-radius:34px 34px 34px 8px;background:rgba(10,30,40,.95);border:3px solid #38E1FF;color:#BFF6FF;box-shadow:0 0 50px rgba(56,225,255,.4);opacity:0", n, "🎙 <b>JARVIS</b><br>Supino reto: 80 kg × 10 ✓<br>Descanso de 3 min ⏱"); }
  else if (a.tipo === "lojas") { n.style.cssText += ";left:28px;top:430px"; o.itens = [["Mercado Livre", "#FFE600", "#2D3277"], ["Shopee", "#EE4D2D", "#fff"], ["Shein", "#111", "#fff"], ["Pix", "#32BCAD", "#fff"]].map(([t, bg, cor]) =>
      el("div", "font-size:38px;font-family:I;margin-bottom:18px;padding:16px 28px;border-radius:24px;background:" + bg + ";color:" + cor + ";box-shadow:0 20px 50px rgba(0,0,0,.6);border:3px solid rgba(255,255,255,.25)", n, (t === "Pix" ? "💠 " : "🛍 ") + t)); }
  else if (a.tipo === "fim") { n.style.cssText += ";inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(225,48,108,.35),rgba(6,6,6,.96) 60%)";
    o.logo = el("img", "width:520px", n); o.logo.src = "logo.webp";
    el("div", "font-size:70px;font-family:I;margin-top:20px", n, "@carlos.jr.81");
    el("div", "font-size:40px;font-family:IB;color:#ddd;margin-top:16px;text-align:center", n, "Grátis · sem mensalidade · sem propaganda<br>💛 Ajude: compras pelo link ou Pix");
    el("div", "font-size:27px;font-family:IB;color:#aaa;margin:60px 70px 0;text-align:center;line-height:1.35", n, "Sugestão automática e educativa, baseada em estudos. Não substitui o profissional de Educação Física. Consulte um médico antes de começar."); }
  else if (a.tipo === "onda") { o.ondas = [0, 1, 2]; }
}
function desenharAR(o, t) {
  const a = o.a, n = o.n;
  const vis = t >= a.em && t <= a.ate + .35;
  if (!vis) { n.style.opacity = 0; return; }
  const ent = fr(t, a.em, .45), sai = fr(t, a.ate, .35), p = t - a.em;
  n.style.opacity = Math.min(cl(ent * 2, 0, 1), 1 - sai);
  const flut = "translateY(" + (Math.sin(t * 2 + a.em) * 8) + "px)";
  if (a.tipo === "titulo") { const s = pop(ent); n.style.transform = "scale(" + (0.4 + .6 * s) + ") rotate(" + (Math.sin(p * 30) * 3 * (1 - fr(t, a.em, .6))) + "deg)";
    [...n.querySelectorAll(".w")].forEach((w, i) => { const q = fr(t, a.em + i * .07, .3); w.style.transform = "translateY(" + ((1 - pop(q)) * 80) + "px) scale(" + (0.5 + .5 * pop(q)) + ")"; w.style.opacity = q > 0 ? 1 : 0; }); }
  else if (a.tipo === "meme") { const s = pop(fr(t, a.em, .4)); n.style.transform = "scale(" + (2.2 - 1.2 * s) + ") rotate(" + (8 + Math.sin(p * 5) * 3) + "deg) " + flut; n.style.opacity = Math.min(fr(t, a.em, .12), 1 - sai); }
  else if (a.tipo === "chips" || a.tipo === "lojas") { n.style.opacity = 1 - sai; o.itens.forEach((d, i) => { const q = fr(t, a.em + i * .45, .4); d.style.opacity = q; d.style.transform = "translateX(" + ((1 - pop(q)) * -300) + "px) rotate(" + (-4 + Math.sin(t * 3 + i) * 2) + "deg)"; }); }
  else if (a.tipo === "frequencia") { n.style.transform = "perspective(900px) rotateY(" + (14 * (1 - pop(ent))) + "deg) scale(" + (.7 + .3 * pop(ent)) + ") " + flut; o.dias.forEach((b, i) => { const q = fr(t, a.em + .4 + i * .18, .25); b.style.background = q > 0 ? "linear-gradient(135deg,#E1306C,#833AB4)" : "#222"; b.style.transform = "scale(" + (1 + .35 * Math.sin(q * Math.PI)) + ")"; }); }
  else if (a.tipo === "faixa") { n.style.transform = "scale(" + (.7 + .3 * pop(ent)) + ") " + flut; const v = 14 * oo(fr(t, a.em + .3, 1.4)); o.fill.style.width = (v / 25 * 100) + "%"; }
  else if (a.tipo === "corpo") { n.style.transform = "perspective(900px) rotateY(" + (-25 * (1 - pop(ent)) + Math.sin(t * 1.5) * 6) + "deg) scale(" + (.6 + .4 * pop(ent)) + ")";
    o.peito.style.opacity = .55 + .45 * Math.abs(Math.sin(t * 4)); o.am.forEach((m) => { m.style.opacity = fr(t, a.em + 1.2, .5) * (.5 + .4 * Math.abs(Math.sin(t * 4 + 1))); }); }
  else if (a.tipo === "fonte") { n.style.transform = "translateY(" + ((1 - pop(ent)) * 60) + "px)"; }
  else if (a.tipo === "ciclo") { n.style.transform = "perspective(1000px) rotateX(" + (20 * (1 - pop(ent))) + "deg) scale(" + (.6 + .4 * pop(ent)) + ") " + flut;
    const dur = Math.max(2, a.ate - a.em - 1); o.barras.forEach((b, i) => { const q = oo(fr(t, a.em + .3 + i * dur / 6, .6)); b.b.style.height = (b.h * 100 * q) + "%"; }); }
  else if (a.tipo === "regra") { n.style.transform = "translateX(" + ((1 - pop(ent)) * 500) + "px) " + flut; o.seta.style.transform = "translateY(" + (a.seta === "↑" ? -1 : a.seta === "↓" ? 1 : 0) * Math.abs(Math.sin(t * 5)) * 16 + "px) scale(" + (a.seta === "✓" ? 1 + .12 * Math.sin(t * 6) : 1) + ")"; }
  else if (a.tipo === "selo") { const s = pop(fr(t, a.em, .35)); n.style.transform = "scale(" + (3 - 2 * s) + ") rotate(-12deg)"; n.style.opacity = Math.min(fr(t, a.em, .1), 1 - sai); }
  else if (a.tipo === "relogio") { n.style.transform = "scale(" + (.5 + .5 * pop(ent)) + ") rotate(" + (Math.sin(t * 2) * 3) + "deg)";
    const q = io(fr(t, a.em + 1, Math.max(.5, a.ate - a.em - 1.2))); const m = Math.round(a.de + (a.para - a.de) * q); o.min.textContent = m >= 60 ? Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") : m + " min";
    o.anel.setAttribute("stroke-dashoffset", String(264 * (1 - m / a.de))); }
  else if (a.tipo === "jarvis") { const f = o.c.falas; const q1 = fr(t, f[1].t0, .35), q2 = fr(t, f[2].t0, .35);
    o.b1.style.opacity = q1; o.b1.style.transform = "translateY(" + (1 - pop(q1)) * 80 + "px) scale(" + (.7 + .3 * pop(q1)) + ")";
    o.b2.style.opacity = q2; o.b2.style.transform = "translateY(" + (1 - pop(q2)) * 80 + "px) scale(" + (.7 + .3 * pop(q2)) + ")"; o.b2.style.boxShadow = "0 0 " + (40 + 30 * Math.abs(Math.sin(t * 6))) + "px rgba(56,225,255,.55)"; }
  else if (a.tipo === "fim") { const s = pop(fr(t, a.em, .6)); o.logo.style.transform = "scale(" + (.3 + .7 * s) + ") rotate(" + (Math.sin(t * 2) * 3) + "deg)"; n.style.opacity = fr(t, a.em, .3); }
}
// o desenho de um quadro
let ultimoTl = null, trocaEm = 0, tlAntes = null;
function desenhar(t) {
  const cena = D.cenas.find((c) => t >= c.t0 && t < c.t1) || D.cenas[D.cenas.length - 1];
  blobs.forEach((b, i) => { b.style.left = (540 - 450 + Math.sin(t * .35 + i * 2.1) * 380) + "px"; b.style.top = (300 + i * 520 + Math.cos(t * .28 + i) * 260) + "px"; });
  pts.forEach((e, i) => { const sp = 30 + (i * 37) % 70; const y = 1960 - ((t * sp + i * 173) % 2000); e.style.left = ((i * 211) % 1080) + "px"; e.style.top = y + "px"; e.style.opacity = .08 + (i % 5) * .05; });
  barra.style.width = (t / D.total * 100) + "%";
  // entrada de cena: o celular gira e a tela pisca
  const qe = fr(t, cena.t0, .5);
  let tremor = 0; if (cena.tremer != null) tremor = (1 - fr(t, cena.tremer, .7)) * (t >= cena.tremer ? 1 : 0);
  const sx = Math.sin(t * 61) * 14 * tremor, sy = Math.cos(t * 53) * 14 * tremor;
  cel.style.transform = "translate(" + sx + "px," + (Math.sin(t * .9) * 12 + sy + (1 - oo(qe)) * 120) + "px) rotateY(" + (Math.sin(t * .6) * 8 + (1 - oo(qe)) * -35) + "deg) rotateX(" + (Math.sin(t * .45) * 4) + "deg) rotateZ(" + (Math.sin(t * .5) * 1.5) + "deg) scale(" + (.94 + .06 * oo(qe)) + ")";
  flash.style.opacity = cena === D.cenas[0] ? 0 : .5 * (1 - fr(t, cena.t0, .22));
  // as telas: a de agora entra deslizando por cima da anterior
  const ativas = cena.telas.filter((tl) => tl.de <= t + 1e-6); const tl = ativas[ativas.length - 1] || cena.telas[0];
  const chave = cena.id + ":" + tl.img + ":" + tl.de;
  if (chave !== ultimoTl) { tlAntes = ultimoTl; ultimoTl = chave; trocaEm = tl.de > cena.t0 + .05 ? tl.de : -1; }
  Object.keys(camadas).forEach((k) => { const L = camadas[k]; L.cam.style.display = k === chave || (k === tlAntes && t - trocaEm < .4) ? "block" : "none"; });
  const L = camadas[chave];
  const cm = camera(tl, t);
  const qs = trocaEm > 0 ? oo(fr(t, trocaEm, .4)) : 1;
  L.cam.style.zIndex = 2;
  L.cam.style.transform = "translateX(" + ((1 - qs) * 600) + "px) translate(" + cm.tx * K + "px," + cm.ty * K + "px) scale(" + cm.s + ")";
  if (tlAntes && camadas[tlAntes] && t - trocaEm < .4) { const A = camadas[tlAntes]; A.cam.style.zIndex = 1; A.cam.style.transform = "translateX(" + (-qs * 200) + "px) scale(" + (1 - .1 * qs) + ")"; }
  L.esc.style.opacity = tl.escurecer ? tl.escurecer * fr(t, tl.de + .6, .8) : 0;
  // realces e toques, presos ao elemento (dentro da câmera)
  cena.realces.forEach((r, i) => { if (!tl.caixas[r.alvo]) return; const id = cena.id + "r" + i; let e = L.realces[id];
    if (!e) { e = L.realces[id] = el("div", "", L.cam); e.className = "realce"; }
    const b = tl.caixas[r.alvo], q = fr(t, r.t, .35), fim = fr(t, r.t + r.dur, .3), on = t >= r.t && fim < 1;
    e.style.cssText = "left:" + (b.x - 8) * K + "px;top:" + (b.y - 8) * K + "px;width:" + (b.w + 16) * K + "px;height:" + (b.h + 16) * K + "px;opacity:" + (on ? Math.min(q, 1 - fim) : 0) +
      ";transform:scale(" + (1.3 - .3 * pop(q) + .03 * Math.sin(t * 8)) + ")"; });
  cena.toques.forEach((r, i) => { if (!tl.caixas[r.alvo]) return; const id = cena.id + "t" + i; let e = L.toques[id];
    if (!e) { e = L.toques[id] = { c: el("div", "", L.cam), d: el("div", "", L.cam, "👆") }; e.c.className = "toque"; e.d.className = "dedo"; }
    const b = tl.caixas[r.alvo], cx = (b.x + b.w / 2) * K, cy = (b.y + b.h / 2) * K;
    const qd = fr(t, r.t - .45, .45), qr = fr(t, r.t, .6), viv = t > r.t - .45 && t < r.t + .8;
    e.d.style.cssText = "left:" + (cx - 30 + (1 - oo(qd)) * 160) + "px;top:" + (cy - 6 + (1 - oo(qd)) * 220) + "px;opacity:" + (viv ? 1 : 0) + ";transform:scale(" + (t > r.t && t < r.t + .15 ? .85 : 1) + ")";
    const R0 = 30 + 110 * oo(qr); e.c.style.cssText = "left:" + (cx - R0) + "px;top:" + (cy - R0) + "px;width:" + R0 * 2 + "px;height:" + R0 * 2 + "px;opacity:" + (t >= r.t && qr < 1 ? 1 - qr : 0); });
  cena.ar.filter((a) => a.tipo === "onda").forEach((a) => { const b = tl.caixas[a.alvo]; if (!b) return; if (!L.ondas) L.ondas = [0, 1, 2].map(() => { const e = el("div", "", L.cam); e.className = "onda"; return e; });
    L.ondas.forEach((e, i) => { const q = ((t - a.em) * .8 + i / 3) % 1, R0 = 30 + 90 * q, cx = (b.x + b.w / 2) * K, cy = (b.y + b.h / 2) * K;
      e.style.cssText = "left:" + (cx - R0) + "px;top:" + (cy - R0) + "px;width:" + R0 * 2 + "px;height:" + R0 * 2 + "px;opacity:" + (t >= a.em && t <= a.ate ? (1 - q) : 0); }); });
  AR.forEach((o) => desenharAR(o, t));
  // a legenda
  const fz = frases.find((f) => t >= f.t0 && t < f.fim);
  if (!fz) leg.innerHTML = "";
  else {
    if (leg._f !== fz) { leg._f = fz; leg.className = fz.quem === "jarvis" ? "jv" : ""; leg.innerHTML = (fz.quem === "jarvis" ? '<span class="jv-rot">🎙 JARVIS</span>' : "") + fz.toks.map((k) => '<span class="w' + (k.hl ? " hl" : "") + '">' + (fz.fala === "pessoa" && k === fz.toks[0] ? "“" : "") + k.w + "</span>").join(""); }
    [...leg.querySelectorAll(".w")].forEach((w, i) => { const q = fr(t, fz.toks[i].t - .05, .22); w.style.opacity = q > 0 ? 1 : 0; w.style.transform = "translateY(" + (1 - pop(q)) * 30 + "px) scale(" + (.6 + .4 * pop(q)) + ")"; });
    leg.style.transform = "translateY(" + (fz.t0 > t - .3 ? 0 : 0) + "px)";
  }
}
window.desenhar = desenhar;
</script></body></html>`;

(async () => {
  const playwright = require("playwright");
  fs.mkdirSync(path.join(AQUI, "saida"), { recursive: true });
  const pag = path.join(AQUI, "saida", "palco.html");
  fs.writeFileSync(pag, PAGINA);
  // o palco lê as telas e o logo pelo caminho relativo
  fs.mkdirSync(path.join(AQUI, "saida", "telas"), { recursive: true });
  fs.readdirSync(path.join(AQUI, "telas")).filter((f) => f.endsWith(".png")).forEach((f) => fs.copyFileSync(path.join(AQUI, "telas", f), path.join(AQUI, "saida", "telas", f)));
  fs.copyFileSync(path.join(RAIZ, "logo-treino-livre.webp"), path.join(AQUI, "saida", "logo.webp"));
  const nav = await playwright.chromium.launch({ args: ["--allow-file-access-from-files"] });
  const p = await nav.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto("file://" + pag);
  await p.waitForFunction(() => window.desenhar && [...document.images].every((i) => i.complete));
  await p.evaluate(() => document.fonts.ready);

  const q = opc("--quadro");
  if (q != null) {
    await p.evaluate((t) => window.desenhar(t), parseFloat(q));
    const arq = path.join(AQUI, "saida", "quadro-" + q + ".png");
    await p.screenshot({ path: arq });
    console.log(arq); await nav.close(); return;
  }
  const ate = Math.min(TOTAL, parseFloat(opc("--ate")) || TOTAL);
  const nq = Math.round(ate * FPS);
  const temVoz = cenas.some((c) => c.falas.some((f) => f.audio));
  const mudo = path.join(AQUI, "saida", "reels-mudo.mp4");
  console.log("Reels: " + ate.toFixed(1) + " s, " + nq + " quadros" + (temVoz ? ", com a voz" : ", sem voz (tempo estimado)"));
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mudo], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = 0; i < nq; i++) {
    await p.evaluate((t) => window.desenhar(t), i / FPS);
    const img = await p.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log("  " + (i / FPS).toFixed(0) + " s · " + Math.round((Date.now() - t0) / 1000) + " s de trabalho");
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await nav.close();

  // a voz: cada fala no seu tempo, sem música
  const final = path.join(AQUI, "saida", "reels-treino-livre.mp4");
  const falas = [];
  cenas.forEach((c) => c.falas.forEach((f) => { if (f.audio && f.t0 < ate) falas.push(f); }));
  if (falas.length) {
    const ent = []; const filtro = [];
    falas.forEach((f, i) => { ent.push("-i", f.audio); filtro.push("[" + (i + 1) + ":a]adelay=" + Math.round(f.t0 * 1000) + "|" + Math.round(f.t0 * 1000) + "[a" + i + "]"); });
    const mix = falas.map((_, i) => "[a" + i + "]").join("") + "amix=inputs=" + falas.length + ":normalize=0,apad[voz]";
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", mudo, ...ent, "-filter_complex", filtro.join(";") + ";" + mix, "-map", "0:v", "-map", "[voz]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", final]);
    console.log("Pronto, com a voz: " + final);
  } else {
    fs.copyFileSync(mudo, final);
    console.log("Pronto, sem voz: " + final);
  }
  // a legenda em arquivo (.srt), para quem quiser editar no CapCut
  const srt = []; let n = 1;
  const hh = (s) => { const ms = Math.round(s * 1000); return new Date(ms).toISOString().slice(11, 23).replace(".", ","); };
  cenas.forEach((c) => c.falas.forEach((f) => { srt.push(n++, hh(f.t0) + " --> " + hh(f.t0 + f.dur), (f.quem === "jarvis" ? "JARVIS: " : "") + limpa(f.texto), ""); }));
  fs.writeFileSync(path.join(AQUI, "saida", "legenda.srt"), srt.join("\n"));
})().catch((e) => { console.error(e); process.exit(1); });
