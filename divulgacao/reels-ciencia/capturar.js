// Captura as telas REAIS do app para o Reels "o treino que se ajusta pela
// ciência": abre o index.html do repositório no Chromium (Playwright), com
// dados de exemplo (nenhum dado de pessoa real), faz os toques de cada cena e
// guarda a imagem em telas/<cena>.png (390×844 a 3×: 1170×2532).
//
//   node divulgacao/reels-ciencia/capturar.js          todas
//   node divulgacao/reels-ciencia/capturar.js tempo    só uma
//
// Usa o mesmo caminho do testes/navegador.js: React, ReactDOM e Babel do npm.
const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");

const RAIZ = path.join(__dirname, "..", "..");
const SAIDA = path.join(__dirname, "telas");
const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const versao = (re) => (html.match(re) || [])[1];
const LIBS = [
  { nome: "react.production.min.js", pacote: "react", versao: versao(/react\/([\d.]+)\/umd\/react\.production/), dentro: "package/umd/react.production.min.js" },
  { nome: "react-dom.production.min.js", pacote: "react-dom", versao: versao(/react-dom\/([\d.]+)\/umd/), dentro: "package/umd/react-dom.production.min.js" },
  { nome: "babel.min.js", pacote: "@babel/standalone", versao: versao(/babel-standalone\/([\d.]+)\//), dentro: "package/babel.min.js" },
];
async function doNpm(lib) {
  const cache = path.join(os.tmpdir(), "treinolivre-" + lib.pacote.replace(/\W/g, "_") + "-" + lib.versao + ".js");
  if (fs.existsSync(cache)) return fs.readFileSync(cache);
  const base = lib.pacote.split("/").pop();
  const r = await fetch("https://registry.npmjs.org/" + lib.pacote + "/-/" + base + "-" + lib.versao + ".tgz");
  const tar = zlib.gunzipSync(Buffer.from(await r.arrayBuffer()));
  let off = 0;
  while (off + 512 <= tar.length) {
    const nome = tar.toString("utf8", off, off + 100).replace(/\0.*$/, "");
    if (!nome) break;
    const tam = parseInt(tar.toString("utf8", off + 124, off + 136).replace(/\0.*$/, "").trim(), 8) || 0;
    if (nome === lib.dentro) { const d = tar.subarray(off + 512, off + 512 + tam); fs.writeFileSync(cache, d); return d; }
    off = off + 512 + Math.ceil(tam / 512) * 512;
  }
  throw new Error("sem " + lib.dentro);
}

// ---- os dados de exemplo: um treino avançado de 4 dias, 10 semanas de histórico ----
const D = 864e5;
function dados(opc) {
  const o = opc || {};
  const agora = Date.now();
  const it = (id, series, reps) => ({ uid: id + Math.random().toString(36).slice(2, 6), exercicioId: id, series: series, reps: reps, obs: "", descanso: null, conjunto: null });
  const fichas = [
    { id: "fa", nome: "Treino A - Peito e Tríceps", programaId: "p-av", itens: [it("supino-reto", 4, 8), it("supino-inclinado", 4, 10), it("crucifixo", 3, 12), it("desenvolvimento", 4, 8), it("elevacao-lateral", 4, 12), it("triceps-corda", 4, 12), it("abdominal-supra", 3, 15)] },
    { id: "fb", nome: "Treino B - Pernas", programaId: "p-av", itens: [it("agachamento", 4, 8), it("leg-press", 4, 10), it("cadeira-extensora", 4, 12), it("mesa-flexora", 4, 12), it("stiff", 3, 10), it("elevacao-pelvica", 3, 10), it("panturrilha", 4, 15)] },
    { id: "fc", nome: "Treino C - Costas e Bíceps", programaId: "p-av", itens: [it("puxada-frente", 4, 10), it("remada-curvada", 4, 8), it("remada-baixa", 3, 10), it("rosca-direta", 4, 10), it("rosca-martelo", 3, 12)] },
  ];
  // peito e ombro parados, o resto subindo devagar
  const base = { "supino-reto": 80, "supino-inclinado": 30, crucifixo: 16, desenvolvimento: 40, "elevacao-lateral": 10, "triceps-corda": 25, "abdominal-supra": 0,
    agachamento: 100, "leg-press": 220, "cadeira-extensora": 60, "mesa-flexora": 45, stiff: 70, "elevacao-pelvica": 90, panturrilha: 80,
    "puxada-frente": 65, "remada-curvada": 60, "remada-baixa": 55, "rosca-direta": 30, "rosca-martelo": 14 };
  const parados = { "supino-reto": 1, "supino-inclinado": 1, crucifixo: 1, desenvolvimento: 1, "elevacao-lateral": 1 };
  const historico = [];
  for (let s = 0; s < 10; s++) for (let k = 0; k < 3; k++) {
    const f = fichas[k];
    const t = agora - (s * 7 + (2 - k) * 2 + 1) * D - 3600e3 * 2;
    historico.push({ id: "h" + s + k, nome: f.nome, data: new Date(t).toISOString(), duracaoMin: 112 + ((s + k) % 4) * 6,
      itens: f.itens.map((x) => ({ exercicioId: x.exercicioId, obs: "", series: Array.from({ length: x.series }, () => ({
        peso: String(Math.round((base[x.exercicioId] || 0) * (parados[x.exercicioId] ? 1 : 1 + (10 - s) * 0.012) * 2) / 2), reps: String(x.reps), feito: true })) })) });
  }
  historico.sort((a, b) => new Date(b.data) - new Date(a.data));
  const prog = { id: "p-av", nome: "Treino Avançado", ajustes: [] };
  if (o.meso) Object.assign(prog, { meso: { inicio: o.meso, ciclo: o.ciclo || 1 }, autoAjuste: o.auto !== false, diasSemana: 3 });
  return {
    entrou: true, convite: false, dicas: { voz: 1, scan: 1 }, seedV3: true, ultimoBackup: agora, meta: 3, tema: "escuro",
    programas: [prog], treinos: fichas, historico: historico, customEx: [], medidas: [], fotos: [], sessao: null,
  };
}

// ---- as cenas: dados, toques e o que fotografar ----
// rolar: texto que deve ficar no topo da tela antes da foto
// alvos: textos cuja posição na tela é guardada (telas/<cena>.json), para a
// realidade aumentada do vídeo se prender ao elemento de verdade
const CENAS = [
  { id: "assistente", dados: dados(), passos: [["clicar", "Fichas"], ["clicar", "Montar treino pra mim (assistente)"], ["clicar", "4"], ["clicar", "Interm."]],
    alvos: ["💪 Músculo", "4", "Interm.", "Como fica:", "Manter sempre se ajustando pelo meu histórico"] },
  { id: "montado", dados: { ...dados(), programas: [], treinos: [], historico: [] }, passos: [["clicar", "Fichas"], ["clicar", "Montar treino pra mim (assistente)"], ["clicar", "4"], ["clicar", "Interm."], ["clicar", "⚡ Montar meu treino"], ["clicar", "OK"], ["topo"]],
    alvos: ["Ajuste automático pela ciência", "Treino A - Superior"] },
  { id: "musculos", dados: dados(), passos: [["clicar", "Histórico"], ["clicar", "Números"], ["rolar", "Quanto cada músculo trabalhou"]], alvos: ["Média de 4 semanas", "Deltoides (ombros)", "Bíceps", "Peitoral"] },
  { id: "equilibrado", dados: dados(), passos: [["clicar", "Histórico"], ["clicar", "Números"], ["rolar", "Seu treino está equilibrado?"]], alvos: ["estão treinando pouco", "O que muda"] },
  { id: "ciclo2", dados: dados({ meso: Date.now() - 36 * D, ciclo: 1 }), passos: [["esperar", 2500]], alvos: ["Ciclo 2 do", "+2 séries de Supino reto com barra"] },
  { id: "botao", dados: dados(), passos: [["clicar", "Fichas"]], alvos: ["Atualizar sozinho pela ciência"] },
  { id: "botaoLigado", dados: dados({ meso: Date.now() - 15 * D, ciclo: 1 }), passos: [["clicar", "Fichas"]], alvos: ["Atualizar sozinho pela ciência"] },
  { id: "cartaoAuto", dados: dados({ meso: Date.now() - 15 * D, ciclo: 1 }), passos: [["clicar", "Fichas"], ["clicar", "Abrir fichas ›"]], alvos: ["Próxima reanálise:"] },
  { id: "hoje", dados: dados({ meso: Date.now() - 15 * D, ciclo: 1 }), passos: [["rolar", "Seu treino de hoje"]], alvos: ["Ajustado pela ciência", "⏱ Tenho menos tempo hoje: ajustar ao meu tempo", "cerca de 2 h"] },
  { id: "treinoAjustado", dados: dados({ meso: Date.now() - 15 * D, ciclo: 1 }), passos: [["clicar", "Começar este treino"], ["rolar", "Treino ajustado pela ciência"]],
    alvos: ["O que o app ajustou para hoje:", "Séries", "Carga", "Volume de cada músculo"] },
  { id: "tempo", dados: dados(), passos: [["clicar", "⏱ Tenho menos tempo hoje: ajustar ao meu tempo"], ["clicar", "1 h"]], alvos: ["1 h", "Fica em ~", "Bi-set: Supino inclinado"] },
  { id: "tempoTreino", dados: dados(), passos: [["clicar", "⏱ Tenho menos tempo hoje: ajustar ao meu tempo"], ["clicar", "1 h"], ["clicar", "▶ Só hoje: começar assim"]],
    alvos: ["ajustado p/ 60 min", "Supino reto com barra", "Jarvis"] },
  { id: "apoio", dados: dados(), passos: [["clicar", "Quero apoiar"]], alvos: ["Doar pelo Pix", "Comprar pelo link"] },
];

(async () => {
  const so = process.argv[2];
  const playwright = require("playwright");
  const libs = {};
  for (const l of LIBS) libs[l.nome] = await doNpm(l);
  fs.mkdirSync(SAIDA, { recursive: true });
  const termosV = (html.match(/const TERMOS_USO = \{\s*versao: "([^"]+)"/) || [])[1];
  const nav = await playwright.chromium.launch();
  for (const c of CENAS) {
    if (so && c.id !== so) continue;
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, serviceWorkers: "block", hasTouch: false });
    const END = "http://localhost:8765/";
    await ctx.route("**/*", (r) => {
      const u = r.request().url().split("?")[0].split("#")[0];
      if (u === END) return r.fulfill({ status: 200, contentType: "text/html", body: html });
      const k = Object.keys(libs).find((n) => u.includes(n));
      if (k) return r.fulfill({ status: 200, contentType: "text/javascript", body: libs[k] });
      const local = u.indexOf(END) === 0 ? path.join(RAIZ, u.slice(END.length)) : null;
      if (local && /\.(webp|png|jpe?g|svg)$/.test(local) && fs.existsSync(local))
        return r.fulfill({ status: 200, contentType: "image/" + (/png$/.test(local) ? "png" : /webp$/.test(local) ? "webp" : /svg$/.test(local) ? "svg+xml" : "jpeg"), body: fs.readFileSync(local) });
      return r.abort();
    });
    const p = await ctx.newPage();
    const erros = [];
    p.on("pageerror", (e) => erros.push(e.message));
    await p.addInitScript(([d, tv]) => {
      if (sessionStorage.getItem("tl")) return;
      sessionStorage.setItem("tl", "1");
      localStorage.setItem("treinolivre:v1", JSON.stringify(d));
      localStorage.setItem("treinolivre:termos", JSON.stringify({ v: tv, em: Date.now() }));
      localStorage.setItem("treinolivre:conta", JSON.stringify({ uid: "exemplo", email: "exemplo@exemplo.com", status: "liberado", conferidoEm: Date.now() }));
      localStorage.setItem("treinolivre:prontidao", JSON.stringify({ v: "2026-11-02", em: Date.now(), sim: [] }));
      localStorage.setItem("treinolivre:apkDepois", String(Date.now() + 9e9));
    }, [c.dados, termosV]);
    await p.goto(END + "#reels");
    await p.waitForFunction(() => !document.getElementById("carregando"), null, { timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await p.mouse.click(380, 300);
    await p.waitForTimeout(600);
    for (const [acao, v] of c.passos) {
      try {
        if (acao === "esperar") await p.waitForTimeout(v);
        else if (acao === "rolar") {
          await p.locator("text=" + v).first().evaluate((el) => { const y = el.getBoundingClientRect().top + window.scrollY - 96; window.scrollTo(0, y); });
          await p.waitForTimeout(500);
        } else if (acao === "topo") { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
        } else {
          const ex = p.getByRole("button", { name: v, exact: true });
          if (await ex.count()) await ex.last().click({ timeout: 5000 });
          else await p.locator("text=" + v).last().click({ timeout: 5000 });
          await p.waitForTimeout(900);
        }
      } catch (e) { erros.push(acao + " " + v + ": " + e.message.split("\n")[0]); }
    }
    // as figuras do wger vêm da internet, que o teste bloqueia: no vídeo elas
    // apareceriam quebradas
    await p.addStyleTag({ content: "img[src*=\"wger\"]{visibility:hidden}" });
    const caixas = {};
    for (const a of c.alvos || []) {
      const l = p.getByRole("button", { name: a, exact: true });
      const loc = (await l.count()) ? l.last() : a === "Jarvis" ? p.locator("[aria-label*=\"Jarvis\"]").last() : p.locator("text=" + a).first();
      const b = await loc.boundingBox().catch(() => null);
      if (b) caixas[a] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      else erros.push("alvo sem posição: " + a);
    }
    fs.writeFileSync(path.join(SAIDA, c.id + ".json"), JSON.stringify(caixas, null, 1));
    await p.waitForTimeout(700);
    // o botão flutuante do Jarvis fica, de propósito: ele aparece no vídeo
    await p.screenshot({ path: path.join(SAIDA, c.id + ".png") });
    console.log((erros.length ? "⚠ " : "ok ") + c.id + (erros.length ? "  " + erros.join(" | ") : ""));
    await ctx.close();
  }
  await nav.close();
})().catch((e) => { console.error(e); process.exit(1); });
