// A janela para seguir @carlos.jr.81 no Instagram (JanelaSeguir): quando ela
// aparece, o "Agora não" que volta em 7 dias e o fim depois da terceira vez.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("const CHAVE_SEGUIR =", "function lerAdiarSeguir") + "\nglobalThis.P = { podeConvidarSeguir, adiarSeguir, SEGUIR_PAUSA_MS };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const ag = 1800000000000;
teste("quem nunca treinou não vê (ainda não sabe se gostou)", false, P.podeConvidarSeguir({}, ag, 0));
teste("depois do primeiro treino, vê", true, P.podeConvidarSeguir({}, ag, 1));
const a1 = P.adiarSeguir({}, ag);
teste("'Agora não' volta em 7 dias", [false, true], [P.podeConvidarSeguir(a1, ag + 6 * 864e5, 5), P.podeConvidarSeguir(a1, ag + 7 * 864e5 + 1, 5)]);
const a3 = P.adiarSeguir(P.adiarSeguir(a1, ag), ag);
teste("na terceira vez, o convite se encerra", [3, true, false], [a3.vezes, a3.fim, P.podeConvidarSeguir(a3, ag + 365 * 864e5, 5)]);
teste("a janela não abre no meio do treino nem para o dono", true, /aba !== "inicio" \|\| sessao \|\| modal/.test(html) && /CONTA_ATUAL && CONTA_ATUAL\.dono\) return undefined/.test(html));
teste("o efeito da janela vem antes dos retornos do componente", true, html.indexOf("if (seguirTentado.current") < html.indexOf("  if (!carregado) {\n    return <div"));
teste("o texto diz o @ certo", true, /Siga <b>@\{INSTAGRAM\}<\/b> no Instagram/.test(html));
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
