// A leitura do historico por exercicio, e o jeito de falar uma duracao.
const fs = require("fs");
const html = require("./app").lerApp();

// as funcoes de leitura de serie vivem antes do app; pega as duas faixas
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f).replace(/\r\n/g, "\n");
}
const leitores = pedaco("const ehAquecimento", "// ---------- ESTATÍSTICAS DE UM TREINO");
const um = pedaco("function est1RM", "function volumeItem");
const evol = pedaco("function seriesDoExercicio", "function GraficoEvolucaoEx");
const dur = pedaco("function textoDuracao", "function narrarVoz");
eval(leitores + um + evol + dur +
  "\nglobalThis.API = { seriesDoExercicio, textoDuracao };");
const A = globalThis.API;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = JSON.stringify(esperado), b = JSON.stringify(obtido);
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(40) + b); }
  else { mal++; console.log("  X    " + nome.padEnd(40) + b + ", esperava " + a); }
}

console.log("--- como se fala uma duracao ---");
teste("45 segundos", "45 segundos", A.textoDuracao(45));
teste("60 vira 1 minuto", "1 minuto", A.textoDuracao(60));
teste("90 vira minuto e meio", "1 minuto e meio", A.textoDuracao(90));
teste("120 vira 2 minutos", "2 minutos", A.textoDuracao(120));
teste("75 vira 1 min e 15", "1 minuto e 15 segundos", A.textoDuracao(75));

const treino = (data, series) => ({
  id: String(data), nome: "Treino", data: new Date(data).toISOString(), duracaoMin: 50,
  itens: [{ exercicioId: "supino", obs: "", series: series }],
});

console.log("\n--- um ponto por treino ---");
const h = [
  treino("2026-01-10", [{ peso: "40", reps: "10" }, { peso: "45", reps: "8" }]),
  treino("2026-01-17", [{ peso: "50", reps: "10" }, { peso: "50", reps: "9" }]),
];
const p = A.seriesDoExercicio(h, "supino");
teste("dois treinos, dois pontos", 2, p.length);
teste("a carga do ponto e a MAIOR da sessao", [45, 50], p.map((x) => x.cargaMax));
teste("em ordem do mais antigo para o mais novo", true, p[0].data < p[1].data);
teste("volume somado", [40 * 10 + 45 * 8, 50 * 10 + 50 * 9], p.map((x) => x.volume));
teste("as series aparecem escritas", ["40×10", "45×8"], p[0].feitas);

console.log("\n--- aquecimento nao conta como progressao ---");
const comAquec = [treino("2026-02-01", [
  { peso: "100", reps: "5", aquec: true },   // carga alta, mas e aquecimento
  { peso: "60", reps: "10" },
])];
const q = A.seriesDoExercicio(comAquec, "supino");
teste("a carga do aquecimento e ignorada", 60, q[0].cargaMax);
teste("e ele nao entra na contagem de series", 1, q[0].series);

console.log("\n--- isometria entra por tempo, nao por carga ---");
const prancha = [treino("2026-02-05", [{ segundos: "45" }, { segundos: "60" }])];
const r = A.seriesDoExercicio(prancha, "supino");
teste("soma os segundos", 105, r[0].segundos);
teste("sem carga nenhuma", 0, r[0].cargaMax);
teste("escrito em segundos", ["45s", "60s"], r[0].feitas);

console.log("\n--- quem nunca fez o exercicio ---");
teste("historico vazio", 0, A.seriesDoExercicio([], "supino").length);
teste("outro exercicio no historico", 0, A.seriesDoExercicio(h, "agacho").length);
teste("treino so com aquecimento nao vira ponto", 0,
  A.seriesDoExercicio([treino("2026-03-01", [{ peso: "50", reps: "5", aquec: true }])], "supino").length);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
