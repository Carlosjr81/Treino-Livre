// Abre o app num navegador de verdade (Chromium, pelo Playwright) e diz se a
// tela desenhou sem erro. É a conferida que o rodar.js e o verificar.js não
// fazem: eles provam que a lógica não quebrou e que o JSX compila, não que o
// componente desenha (ver "Mexeu em componente, abra a tela" no CLAUDE.md).
//
// Mora no repositório de propósito. Até a versão 2026-10-25 ela existia só como
// scripts soltos dentro de uma sessão do Claude; trocar de conta ou de máquina
// a perderia. Qualquer Claude que abra o projeto acha esta aqui.
//
// Uso:
//   node testes/navegador.js                       abre a tela inicial
//   node testes/navegador.js --dados dados.json    com um registro no armazenamento
//   node testes/navegador.js --clicar "Histórico" --clicar "Números"
//   node testes/navegador.js --foto tela.png       guarda a imagem da tela
//   node testes/navegador.js --altura 700          celular mais baixo
//   node testes/navegador.js --preencher "E-mail=ana@x.com"   digita no campo com esse rótulo
//   node testes/navegador.js --antes falso.js      roda um script antes do app (ex.: uma voz de mentira)
//   node testes/navegador.js --mostrar "window.__falado"   imprime o valor no fim
//
// Não precisa de CDN: React, ReactDOM e Babel vêm do npm (registry.npmjs.org,
// que a sessão do Claude na nuvem alcança), guardados numa pasta temporária.
// Fora da nuvem, se o Playwright não estiver instalado: npx playwright install
// chromium && npm i -g playwright.
const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");

const RAIZ = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");

const args = process.argv.slice(2);
const opcao = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : null; };
// --clicar e --preencher "Rótulo=valor" rodam na ordem em que foram escritos
const passos = [];
args.forEach((a, i) => {
  if (a === "--clicar" && args[i + 1]) passos.push({ clicar: args[i + 1] });
  if (a === "--preencher" && args[i + 1]) { const k = args[i + 1].indexOf("="); passos.push({ campo: args[i + 1].slice(0, k), valor: args[i + 1].slice(k + 1) }); }
});

// as versões são as do próprio index.html: atualizou a biblioteca lá, vale aqui
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
  if (!r.ok) throw new Error("npm respondeu " + r.status + " para " + lib.pacote);
  const tar = zlib.gunzipSync(Buffer.from(await r.arrayBuffer()));
  let off = 0;
  while (off + 512 <= tar.length) {
    const nome = tar.toString("utf8", off, off + 100).replace(/\0.*$/, "");
    if (!nome) break;
    const tam = parseInt(tar.toString("utf8", off + 124, off + 136).replace(/\0.*$/, "").trim(), 8) || 0;
    if (nome === lib.dentro) {
      const dados = tar.subarray(off + 512, off + 512 + tam);
      try { fs.writeFileSync(cache, dados); } catch (e) {}
      return dados;
    }
    off = off + 512 + Math.ceil(tam / 512) * 512;
  }
  throw new Error(lib.dentro + " não está no pacote " + lib.pacote);
}

(async () => {
  let playwright;
  try { playwright = require("playwright"); } catch (e) {
    console.log("Playwright não encontrado. Instale com: npm i -g playwright && npx playwright install chromium");
    process.exit(2);
  }
  const libs = {};
  for (const l of LIBS) libs[l.nome] = await doNpm(l);

  const nav = await playwright.chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: parseInt(opcao("--altura")) || 844 }, serviceWorkers: "block" });
  const ENDERECO = "http://localhost:8765/";
  await ctx.route("**/*", (r) => {
    const u = r.request().url();
    if (u.split("?")[0].split("#")[0] === ENDERECO) return r.fulfill({ status: 200, contentType: "text/html", body: html });
    const k = Object.keys(libs).find((n) => u.includes(n));
    if (k) return r.fulfill({ status: 200, contentType: "text/javascript", body: libs[k] });
    // o resto (vídeo da abertura, imagens, mapa, contador de visitas) fica de
    // fora: a tela tem de desenhar sem eles, como num celular sem rede
    return r.abort();
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));

  // a portaria só aparece para quem nunca entrou; sem --dados, entra direto
  const arq = opcao("--dados");
  const dados = arq ? JSON.parse(fs.readFileSync(arq, "utf8")) : { entrou: true };
  await p.addInitScript((d) => {
    if (sessionStorage.getItem("tl-teste")) return;
    sessionStorage.setItem("tl-teste", "1");
    localStorage.setItem("treinolivre:v1", JSON.stringify(d));
  }, dados);

  // --antes pode vir mais de uma vez: rodam na ordem
  for (let i = 0; i < args.length; i++) if (args[i] === "--antes" && args[i + 1]) await p.addInitScript({ content: fs.readFileSync(args[i + 1], "utf8") });
  await p.goto(ENDERECO + "#teste");
  // o Babel compila o app no navegador: leva uns segundos
  await p.waitForFunction(() => !document.getElementById("carregando"), null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.mouse.click(380, 300); // pula a abertura, se ela estiver na frente
  await p.waitForTimeout(500);
  for (const ps of passos) {
    if (ps.campo) {
      try { await p.getByLabel(ps.campo, { exact: true }).first().fill(ps.valor, { timeout: 5000 }); }
      catch (e) { erros.push("não achei o campo: " + ps.campo); }
      continue;
    }
    const c = ps.clicar;
    try {
      // o botão com exatamente esse nome vence; senão, o último texto que contém
      const exato = p.getByRole("button", { name: c, exact: true });
      if (await exato.count()) await exato.last().click({ timeout: 5000 });
      else await p.locator("text=" + c).last().click({ timeout: 5000 });
      await p.waitForTimeout(800);
    } catch (e) { erros.push("não achei para clicar: " + c); }
  }
  const mostrar = opcao("--mostrar");
  if (mostrar) { await p.waitForTimeout(1500); console.log(mostrar + " = " + JSON.stringify(await p.evaluate(mostrar)).slice(0, 2000)); }
  const foto = opcao("--foto");
  if (foto) await p.screenshot({ path: foto });
  const texto = (await p.locator("body").innerText()).replace(/\s*\n\s*/g, " / ");
  console.log("Tela: " + texto.slice(0, 600));
  if (foto) console.log("Imagem guardada em " + foto);
  await nav.close();
  if (erros.length) { console.log("\nERROS:\n- " + erros.join("\n- ")); process.exit(1); }
  console.log("\nok: a tela desenhou sem erro.");
})().catch((e) => { console.log("falhou: " + e.message); process.exit(1); });
