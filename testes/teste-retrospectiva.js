// A retrospectiva do ano (retrospectivaAno) e o que vai escrito na foto com os
// números (infoFotoDoTreino, infoFotoDoAno). As cenas são as do resumo animado,
// que a tela e o vídeo já desenham: aqui, as contas.
const html = require("./app").lerApp();
function trecho(inicio) {
  const i = html.indexOf(inicio);
  if (i < 0) { console.error("nao achei: " + inicio); process.exit(1); }
  if (/^function /.test(inicio)) return html.slice(i, html.indexOf("\n}\n", i) + 3);
  const resto = html.slice(i + 1);
  const m = resto.match(/\n(?=[^\s.)\]}])/);
  return html.slice(i, i + 1 + m.index + 1);
}
const fonte = [
  trecho("const ehAquecimento = "), trecho("const serieConta = "), trecho("const ehTempo = "), trecho("const temValor = "),
  trecho("const ehCardio = "), trecho("const numDe = "), trecho("const segundosDe = "), trecho("const cargaDe = "), trecho("const repsDe = "),
  trecho("function plural("), trecho("const num1 = "), trecho("const num1v = "), trecho("const fmtNum = "), trecho("function fmtRitmo("),
  trecho("function diaLocal("), trecho("const GRUPOS = ["),
  "function medirCardio(s) { return { km: numDe(s.km) }; }",
  // o recorde de verdade é coberto em outro lugar: aqui, um por treino com carga acima da anterior
  "function calcularRecordes(h) { const o = {}, mx = {}; h.slice().sort((a,b)=>new Date(a.data)-new Date(b.data)).forEach((x) => { o[x.id] = {}; (x.itens||[]).forEach((it) => { const c = Math.max(0, ...(it.series||[]).map(cargaDe)); if (mx[it.exercicioId] && c > mx[it.exercicioId]) o[x.id][it.exercicioId] = { peso: true }; mx[it.exercicioId] = Math.max(mx[it.exercicioId]||0, c); }); }); return o; }",
  html.slice(html.indexOf("// ---- A RETROSPECTIVA DO ANO"), html.indexOf("// As cenas da retrospectiva")),
  trecho("function anoDaRetrospectiva("),
  trecho("const DIAS_RESUMO = "), trecho("const MESES_RESUMO = "),
  trecho("function infoFotoDoTreino("), trecho("function infoFotoDoAno("),
].join("\n");
eval(fonte + "\nglobalThis.R = { retrospectivaAno, anoDaRetrospectiva, infoFotoDoTreino, infoFotoDoAno };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const EX = { "supino-reto": { nome: "Supino reto", grupo: "peito" }, "agachamento": { nome: "Agachamento", grupo: "pernas" }, "esteira-corrida": { nome: "Corrida na esteira", grupo: "cardio" } };
const ep = (id) => EX[id] || null;
const H = [];
const dia = (m, d, h) => new Date(2026, m, d, h || 18).toISOString();
// março: segunda 2, terça 3, quarta 4 (três dias seguidos), e mais dois treinos
[[2, 2], [2, 3], [2, 4], [2, 9], [5, 1], [10, 20]].forEach(([m, d], k) => {
  H.push({ id: "t" + k, nome: "Treino", data: dia(m, d), duracaoMin: 60, itens: [
    { exercicioId: "supino-reto", series: [{ peso: String(60 + k * 2), reps: "10" }, { peso: "40", reps: "10", aquec: true }] },
    { exercicioId: "agachamento", series: [{ peso: "80", reps: "8" }] },
  ] });
});
H.push({ id: "c1", nome: "Corrida", data: dia(4, 5, 7), duracaoMin: 30, itens: [{ exercicioId: "esteira-corrida", series: [{ segundos: "1800", mod: "corrida", km: "5" }] }] });
H.push({ id: "v1", nome: "Treino velho", data: new Date(2025, 11, 30).toISOString(), duracaoMin: 60, itens: [{ exercicioId: "supino-reto", series: [{ peso: "100", reps: "5" }] }] });
const r = R.retrospectivaAno(H, 2026, ep);
teste("só o ano pedido conta", 7, r.treinos);
teste("as horas (com o teto de 300 min por treino)", 390, r.minutos);
teste("os dias treinados", 7, r.dias);
teste("a maior sequência (2, 3 e 4 de março)", 3, r.sequencia);
teste("o volume conta o aquecimento, como no resumo", 6 * 400 + 2 * (60 + 62 + 64 + 66 + 68 + 70) * 10 / 2 + 6 * 640, r.volume);
teste("as séries não contam o aquecimento nem o aeróbico", 12, r.series);
teste("os km do aeróbico", 5, r.km);
teste("o exercício favorito", { nome: "Supino reto", vezes: 6 }, r.favorito);
teste("o mês mais forte é março", { mes: 2, treinos: 4 }, r.mes);
teste("o grupo que mais treinou", ["peito", "pernas"], r.grupos.map((g) => g.id));
teste("a maior carga do ano, e as seguintes", ["Agachamento · 80 kg", "Supino reto · 70 kg"], r.cargas);
teste("os recordes batidos no ano (a carga velha de dezembro não é deste ano)", 0, r.recordes);
teste("com menos de 3 treinos no ano, não há retrospectiva", null, R.retrospectivaAno(H, 2025, ep));
teste("em dezembro é o ano de agora", 2026, R.anoDaRetrospectiva(new Date(2026, 11, 20).getTime()));
teste("na primeira quinzena de janeiro, o que acabou", 2026, R.anoDaRetrospectiva(new Date(2027, 0, 10).getTime()));
teste("depois, o ano novo", 2027, R.anoDaRetrospectiva(new Date(2027, 0, 20).getTime()));
const fa = R.infoFotoDoAno(r);
teste("a foto do ano leva treinos, horas, toneladas e km", ["Treinos", "Horas", "Toneladas", "Km"], fa.itens.map((x) => x.rot));

console.log("\n--- a foto com os números do treino ---");
const d = { nome: "Treino A", data: new Date(2026, 10, 21), duracao: 55, forca: { volume: 12500, series: 18, recordes: ["Supino"] }, cardio: null, coracao: { medio: 132 } };
const fi = R.infoFotoDoTreino(d);
teste("o recorde vem primeiro, depois o volume em toneladas", [["Recorde", "1 🏆"], ["Volume", "12,5 t"], ["Séries", "18"], ["Tempo", "55 min"]], fi.itens.map((x) => [x.rot, x.val]));
teste("o carimbo diz o recorde", "Recorde quebrado!", fi.selo);
teste("o dia por extenso", "sábado, 21 de novembro", fi.dia);
const fc = R.infoFotoDoTreino({ nome: "Corrida", data: new Date(2026, 10, 21), duracao: 30, forca: null, cardio: { km: 5.02, ritmo: 5.6, kcal: 320, perfil: "rua-corrida", trechos: [[[0, 0], [0, 1]]] } });
teste("a corrida leva distância, ritmo, tempo e gasto", ["Distância", "Ritmo", "Tempo", "Gasto"], fc.itens.map((x) => x.rot));
teste("e o traçado do percurso", 1, fc.trechos.length);
teste("nenhum texto promete resultado nem fala em personal", false, /personal|prescri|liberad/i.test(html.slice(html.indexOf("// ---- A RETROSPECTIVA DO ANO"), html.indexOf("// ---- AS REAÇÕES DOS AMIGOS NO RESUMO"))));
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
