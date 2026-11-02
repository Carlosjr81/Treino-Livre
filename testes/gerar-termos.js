// Gera o termos.html a partir do TERMOS_USO do index.html, e guarda a cópia
// exata da versão em termos-versoes/<versão>.txt (só se ainda não existir:
// esses arquivos são prova do que cada pessoa aceitou e nunca mudam).
//
//   node testes/gerar-termos.js
//
// Mudou o texto dos termos? Suba TERMOS_USO.versao antes de rodar.
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..");
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("não achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("const AVISO_SAUDE = {", "\nconst GUIA_CONECTAR = [") + "\nglobalThis.T = TERMOS_USO;");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const [a, m, d] = T.versao.split("-");
const linhas = [];
linhas.push(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Treino Livre — Termos de Uso</title>
<style>
  :root { --fundo: #FFFFFF; --texto: #16161D; --cinza: #5A5A66; --marca: #E1306C; --borda: #E4E4EA; }
  @media (prefers-color-scheme: dark) { :root { --fundo: #0B0B0F; --texto: #F2F2F5; --cinza: #A0A0AE; --borda: #2A2A33; } }
  body { margin: 0; background: var(--fundo); color: var(--texto); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 28px 0 6px; color: var(--marca); }
  .sub { color: var(--cinza); margin: 0 0 20px; }
  .resumo { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
  .resumo div { border: 1px solid var(--borda); border-radius: 14px; padding: 12px; }
  .resumo b { display: block; margin: 4px 0 2px; }
  .resumo span { color: var(--cinza); font-size: 14px; }
  .e { font-size: 26px; }
  a { color: var(--marca); }
</style>
</head>
<body>
<main>
  <!-- Gerado por testes/gerar-termos.js a partir de TERMOS_USO, no index.html: mude o texto lá. O teste-acesso.js confere que os dois batem. -->
  <h1>Termos de Uso do Treino Livre</h1>
  <p class="sub">Vale para o site e para o app Android. Versão de ${d}/${m}/${a}.</p>

  <h2>O resumo, em 1 minuto</h2>
  <div class="resumo">`);
T.resumo.forEach((r) => linhas.push(`    <div><span class="e">${r[0]}</span><b>${esc(r[1])}</b><span>${esc(r[2])}</span></div>`));
linhas.push("  </div>\n");
T.secoes.forEach((s) => {
  linhas.push(`  <h2>${esc(s[0])}</h2>`);
  s[1].forEach((p) => linhas.push(`  <p>${esc(p)}</p>`));
  linhas.push("");
});
linhas.push(`  <h2>As caixas de aceite</h2>`);
T.caixas.forEach((c) => linhas.push(`  <p>☐ ${esc(c)}</p>`));
linhas.push(`
  <p><a href="privacidade.html">Política de Privacidade</a> · <a href="./">← Voltar ao Treino Livre</a></p>
</main>
</body>
</html>
`);
fs.writeFileSync(path.join(RAIZ, "termos.html"), linhas.join("\n"));
const arq = path.join(RAIZ, "termos-versoes", T.versao + ".txt");
if (!fs.existsSync(arq)) { fs.writeFileSync(arq, JSON.stringify(T)); console.log("criado " + path.relative(RAIZ, arq)); }
else if (fs.readFileSync(arq, "utf8") !== JSON.stringify(T)) {
  console.error("ATENÇÃO: o texto mudou mas a versão não. Suba TERMOS_USO.versao: " + path.relative(RAIZ, arq) + " nunca é reescrito.");
  process.exit(1);
}
console.log("termos.html gerado (versão " + T.versao + ")");
