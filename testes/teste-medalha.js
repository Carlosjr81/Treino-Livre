// As ideias menores de 2026-11-22b: a calculadora de anilhas, o esforço da
// série na sugestão de carga, a medalha do mês e a sequência com folga.
const html = require("./app").lerApp();
function trecho(inicio) {
  const i = html.indexOf(inicio);
  if (i < 0) { console.error("nao achei: " + inicio); process.exit(1); }
  if (/^function /.test(inicio)) return html.slice(i, html.indexOf("\n}\n", i) + 3);
  const resto = html.slice(i + 1);
  const m = resto.match(/\n(?=[^\s.)\]}])/);
  return html.slice(i, i + 1 + m.index + 1);
}
const entre = (a, b) => { const i = html.indexOf(a), f = html.indexOf(b, i); if (i < 0 || f < 0) { console.error("nao achei: " + a); process.exit(1); } return html.slice(i, f); };
const fonte = [
  trecho("const ehAquecimento = "), trecho("const serieConta = "), trecho("const ehTempo = "), trecho("const temValor = "),
  trecho("const ehCardio = "), trecho("const numDe = "), trecho("const segundosDe = "), trecho("const cargaDe = "), trecho("const repsDe = "),
  trecho("function ehDrop("), trecho("function moldeCardio("), trecho("function ultimaExecucao("), trecho("const PASSO_CARGA = "),
  trecho("function diaLocal("),
  "function medirCardio(s) { return { km: numDe(s.km) }; }",
  entre("// ---- A CALCULADORA DE ANILHAS (2026-11-22b", "\n// Monta as séries de um exercício"),
  entre("// ---- A MEDALHA DO MÊS (2026-11-22b", "// ---- A RETROSPECTIVA DO ANO"),
].join("\n");
eval(fonte + "\nglobalThis.M = { anilhasPara, falaAnilhas, sugerirCarga, desafioDoMes, medalhasDoAno, sequenciaComFolga };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
console.log("--- a calculadora de anilhas ---");
teste("100 kg com barra de 20: 25 + 15 de cada lado", [25, 15], M.anilhasPara(100, 20).lado);
teste("82,5 kg: 25 + 5 + 1,25", [25, 5, 1.25], M.anilhasPara(82.5, 20).lado);
teste("só a barra", [], M.anilhasPara(20, 20).lado);
teste("menos que a barra é avisado", true, M.anilhasPara(15, 20).abaixo);
teste("o que não fecha vira sobra, nunca arredondado calado", 1, M.anilhasPara(61, 20).sobra);
teste("barra de 10: 25 de cada lado para 60", [25], M.anilhasPara(60, 10).lado);
teste("a fala diz as anilhas de cada lado", "Para 100 quilos com a barra de 20: de cada lado, 25 e 15.", M.falaAnilhas(100, 20));

console.log("\n--- o esforço da série na sugestão de carga ---");
const hist = (rirs) => [{ data: "2026-11-20T18:00:00", itens: [{ exercicioId: "supino", series: rirs.map((r) => Object.assign({ peso: "60", reps: "10", feito: true }, r === null ? {} : { rir: r })) }] }];
teste("sem esforço marcado: sobe um passo (a regra de sempre)", [65, true], (() => { const r = M.sugerirCarga(hist([null, null, null]), "supino", 10); return [r.peso, r.subiu]; })());
teste("todas com 3 ou mais sobrando: sobe dois passos", [70, true, true], (() => { const r = M.sugerirCarga(hist([3, 4, 3]), "supino", 10); return [r.peso, r.subiu, r.folga]; })());
teste("alguma no limite (0): fica, para consolidar", [60, false, true], (() => { const r = M.sugerirCarga(hist([2, 1, 0]), "supino", 10); return [r.peso, r.subiu, r.noLimite]; })());
teste("esforço em parte das séries: a regra de sempre", 65, M.sugerirCarga(hist([3, null, 3]), "supino", 10).peso);

console.log("\n--- a medalha do mês ---");
const ag = new Date(2026, 10, 20, 12).getTime();
const treino = (d, km) => ({ data: new Date(2026, 10, d, 18).toISOString(), itens: km ? [{ exercicioId: "corrida", series: [{ segundos: "1800", mod: "rua-corrida", km: String(km) }] }] : [{ exercicioId: "supino", series: [{ peso: "60", reps: "10" }] }] });
const h12 = [];
for (let d = 1; d <= 12; d++) h12.push(treino(d));
const r12 = M.desafioDoMes(h12, ag);
teste("quem treina academia: 12 treinos no mês", ["treinos", 12, 12, true], [r12.tipo, r12.alvo, r12.feito, r12.ganhou]);
const r5 = M.desafioDoMes(h12.slice(0, 5), ag);
teste("faltando: quanto falta e os dias que restam", [7, 11, false], [r5.falta, r5.restam, r5.ganhou]);
const corredor = [];
for (let d = 1; d <= 30; d++) corredor.push({ data: new Date(2026, 9, d, 7).toISOString(), itens: [{ exercicioId: "corrida", series: [{ segundos: "1800", mod: "rua-corrida", km: "5" }] }] });
for (let d = 1; d <= 7; d++) corredor.push(treino(d, 5));
const rc = M.desafioDoMes(corredor, ag);
teste("quem mais corre: 30 km no mês", ["km", 30, 35, true], [rc.tipo, rc.alvo, rc.feito, rc.ganhou]);
teste("as medalhas do ano contam os meses ganhos", 2, M.medalhasDoAno(corredor, ag).length);

console.log("\n--- a sequência com folga ---");
// sábado 21/11/2026; treinos de seg 9 a sex 20, menos quarta 18 (a folga dessa semana)
const dias = [9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20].map((d) => ({ data: new Date(2026, 10, d, 18).toISOString() }));
const sab = new Date(2026, 10, 21, 10).getTime();
const sq = M.sequenciaComFolga(dias, sab);
teste("uma falta na semana não quebra (a folga), e hoje ainda não conta", [12, true], [sq.dias, sq.folgaUsada]);
const duas = dias.filter((x) => new Date(x.data).getDate() !== 17);
teste("duas faltas na mesma semana quebram", 2, M.sequenciaComFolga(duas, sab).dias);
teste("sem treino, sequência zero", 0, M.sequenciaComFolga([], sab).dias);
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
