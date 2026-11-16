// O tempo estimado do treino: a ficha diz "cerca de X min" antes de começar,
// e o treino em andamento diz quanto falta. Errar para menos faz a pessoa
// chegar atrasada no trabalho; para mais, desistir de um treino que cabia.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const iniEx = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(iniEx + "const EXERCICIOS = ".length, html.indexOf("\n];", iniEx) + 2));
eval("const DESCANSO_AQUECIMENTO = 60;\n" +
  pedaco("const DESCANSO_CIENCIA = {", "\n};\n") + "\n};\n" +
  pedaco("const MUSC_GRANDES_DESCANSO", "// ---------------- FIM DO DESCANSO PELA CIÊNCIA") +
  pedaco("// ---------------- TEMPO ESTIMADO DO TREINO", "// ---------------- FIM DO TEMPO ESTIMADO") +
  "\nglobalThis.T = { estimarTempoFicha, estimarRestanteSessao, textoTempoFicha, textoMinutos, repsMedias, segundosDasSeries };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const porId = (id) => EXERCICIOS.find((e) => e.id === id) || null;
const item = (id, series, reps, extra) => Object.assign({ exercicioId: id, series, reps }, extra || {});
const ficha = (nome, itens) => ({ id: "f", nome, itens });

console.log("--- a conta ---");
teste("repetições em faixa viram a média", [10, 12, 10, 10], [T.repsMedias("8-12", 10), T.repsMedias("12", 10), T.repsMedias("", 10), T.repsMedias("até a falha", 10)]);
const tipica = ficha("Treino A", [
  item("supino-reto", 4, "8-12"), item("supino-halteres", 3, "10"), item("crucifixo", 3, "12"),
  item("elevacao-lateral", 3, "12"), item("triceps-corda", 3, "12"), item("triceps-frances", 3, "12"),
].filter((it) => porId(it.exercicioId)));
const e1 = T.estimarTempoFicha(tipica, porId, [], 90, "ciencia");
console.log("  (ficha típica: " + e1.conta + " min)");
teste("ficha de 6 exercícios fica entre 40 e 75 min", true, e1.conta >= 40 && e1.conta <= 75);
teste("sem histórico, vale a conta (arredondada de 5 em 5)", [null, 0, true], [e1.real, e1.vezes, e1.min % 5 === 0]);
const curta = T.estimarTempoFicha(ficha("X", [item("rosca-direta", 3, "12")]), porId, [], 90, "ciencia");
teste("um exercício de 3 séries: uns 5 a 10 min", true, curta.conta >= 4 && curta.conta <= 10);
const maisSeries = T.estimarTempoFicha(ficha("X", [item("rosca-direta", 5, "12")]), porId, [], 90, "ciencia");
teste("mais séries, mais tempo", true, maisSeries.conta > curta.conta);
const fixo60 = T.estimarTempoFicha(tipica, porId, [], 60, "fixo").conta;
const fixo180 = T.estimarTempoFicha(tipica, porId, [], 180, "fixo").conta;
teste("descanso geral maior (modo fixo) alonga o treino", true, fixo180 > fixo60 + 15);
const fichaDesc = ficha("X", [item("rosca-direta", 3, "12", { descanso: 300 })]);
teste("o descanso escrito na ficha vence", true, T.estimarTempoFicha(fichaDesc, porId, [], 90, "ciencia").conta > curta.conta + 5);
const esteira = T.estimarTempoFicha(ficha("X", [item("esteira-corrida", 1, "30")]), porId, [], 90, "ciencia");
teste("aeróbico: os minutos da ficha", 30, esteira.conta);
const biset = ficha("X", [item("rosca-direta", 3, "12", { conjunto: "c1" }), item("triceps-corda", 3, "12", { conjunto: "c1" })].filter((it) => porId(it.exercicioId)));
const separado = ficha("X", [item("rosca-direta", 3, "12"), item("triceps-corda", 3, "12")].filter((it) => porId(it.exercicioId)));
teste("bi-set é mais rápido que os dois separados", true,
  T.estimarTempoFicha(biset, porId, [], 90, "ciencia").conta < T.estimarTempoFicha(separado, porId, [], 90, "ciencia").conta);
const comDrop = T.estimarTempoFicha(ficha("X", [item("rosca-direta", 3, "12", { drops: 1 })]), porId, [], 90, "ciencia");
teste("drop acrescenta pouco (sem descanso)", true, comDrop.conta >= curta.conta && comDrop.conta <= curta.conta + 1);
teste("ficha vazia não tem estimativa", null, T.estimarTempoFicha(ficha("X", []), porId, [], 90, "ciencia"));
teste("exercício que não existe não derruba a conta", true, T.estimarTempoFicha(ficha("X", [item("nao-existe", 3, "10")]), porId, [], 90, "ciencia").conta > 0);

console.log("--- o relógio de verdade vence ---");
const hist = [
  { nome: "Treino A", duracaoMin: 70 }, { nome: "Outro", duracaoMin: 20 }, { nome: "Treino A", duracaoMin: 62 },
  { nome: "Treino A", duracaoMin: 80 }, { nome: "Treino A", duracaoMin: 10 },
];
const e2 = T.estimarTempoFicha(tipica, porId, hist, 90, "ciencia");
teste("mediana das 3 últimas da mesma ficha", [70, 3, 70], [e2.real, e2.vezes, e2.min]);
teste("sessão esquecida aberta (mais de 300 min) não entra", 1,
  T.estimarTempoFicha(tipica, porId, [{ nome: "Treino A", duracaoMin: 400 }, { nome: "Treino A", duracaoMin: 55 }], 90, "ciencia").vezes);
teste("o texto diz de onde veio", "cerca de 1 h 10 (pelas suas últimas 3 vezes)", T.textoTempoFicha(e2));
teste("uma vez só", "cerca de 55 min (pela última vez)", T.textoTempoFicha(T.estimarTempoFicha(tipica, porId, [{ nome: "Treino A", duracaoMin: 54 }], 90, "ciencia")));
teste("hora e minutos", ["45 min", "1 h", "1 h 05", "1 h 30"], [T.textoMinutos(45), T.textoMinutos(60), T.textoMinutos(65), T.textoMinutos(90)]);

console.log("--- no meio do treino ---");
const sessao = { itens: [
  { exercicioId: "rosca-direta", reps: "12", series: [{ peso: "10", reps: "12", feito: true }, { peso: "10", reps: "12", feito: false }, { peso: "10", reps: "12", feito: false }] },
  { exercicioId: "triceps-corda", reps: "12", series: [{ peso: "20", reps: "12", feito: false }, { peso: "20", reps: "12", feito: false }] },
].filter((it) => porId(it.exercicioId)) };
const falta = T.estimarRestanteSessao(sessao, porId, 90, "ciencia");
teste("faltando 4 séries: uns 5 a 10 min", true, falta >= 5 && falta <= 10);
const tudoFeito = JSON.parse(JSON.stringify(sessao)); tudoFeito.itens.forEach((it) => it.series.forEach((s) => { s.feito = true; }));
teste("tudo feito: falta zero", 0, T.estimarRestanteSessao(tudoFeito, porId, 90, "ciencia"));
const pulado = JSON.parse(JSON.stringify(sessao)); pulado.itens[1].pulado = true;
teste("exercício pulado (Treino Adaptado) não conta", true, T.estimarRestanteSessao(pulado, porId, 90, "ciencia") < falta);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
