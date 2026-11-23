// O treino extra (fora da ficha): para a semana em que tudo já foi treinado.
//
// O que este teste cobra, em ordem de importância:
//   1. Nunca entra músculo da próxima ficha (é amanhã), nem os grandes da
//      seguinte: o extra não pode atrapalhar a semana que vem.
//   2. Nunca entra músculo treinado há pouco (3 dias os grandes, 2 os pequenos)
//      nem o que já passou de 20 séries na semana.
//   3. Nenhum exercício tem como principal um músculo que ficou de fora.
//   4. É leve: 3 séries, longe da falha, cabe no tempo, no máximo 4 músculos.
//   5. Nada descansado: vira caminhada leve.
//   6. O treino de hoje não muda por causa do extra.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
function funcao(nome) {
  const i = html.indexOf("function " + nome + "(");
  if (i < 0) { console.error("nao achei: " + nome); process.exit(1); }
  return html.slice(i, html.indexOf("\n}\n", i) + 3);
}
const iniEx = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(iniEx + "const EXERCICIOS = ".length, html.indexOf("\n];", iniEx) + 2));
eval(
  pedaco("const ehTempo = ", "\n") + "\n" + pedaco("const temValor = ", "\n") + "\n" + pedaco("const ehCardio = ", "\n") + "\n" +
  pedaco("const ehAquecimento = ", "\n") + "\n" + pedaco("const serieConta = ", "\n") + "\n" + funcao("ehDrop") + funcao("segundaDaSemana") +
  pedaco("const GRUPOS = [", "\n];") + "\n];\n" + pedaco("const MUSCULOS = {", "\n};") + "\n};\n" +
  pedaco("const FAIXA_SERIES = ", "\n") + "\n" + pedaco("const AVISO_SAUDE = {", "\n};") + "\n};\n" +
  funcao("plural") + pedaco("// ---------------- VOLUME FRACIONADO", "// ---------------- FIM DO PLANO DE AJUSTE") +
  "const DESCANSO_AQUECIMENTO = 60;\n" + pedaco("const DESCANSO_CIENCIA = {", "\n};\n") + "\n};\n" +
  pedaco("const MUSC_GRANDES_DESCANSO", "// ---------------- FIM DO DESCANSO PELA CIÊNCIA") +
  pedaco("// ---------------- TEMPO ESTIMADO DO TREINO", "// ---------------- FIM DO AJUSTE AO TEMPO") +
  "const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n" +
  pedaco("const DIAS_FICHA = ", "\n") + "\n" + funcao("fichaDeHoje") +
  "\nglobalThis.X = { treinoExtra, nomeTreinoExtra, musculosDoEx, fichaDeHoje, estimarTempoFicha };"
);
const X = globalThis.X;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = String(JSON.stringify(esperado)), b = String(JSON.stringify(obtido));
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(62) + b.slice(0, 80)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + b + "\n         esperava " + a); }
}
const porId = (id) => EXERCICIOS.find((e) => e.id === id) || null;
const DIA = 864e5;
// quarta-feira, 18h: o meio de uma semana
const agora = new Date(2026, 10, 25, 18, 0).getTime();
const serie = (n) => Array.from({ length: n }, () => ({ peso: 40, reps: 10 }));
const treino = (nome, diasAtras, ids) => ({ id: nome + diasAtras, nome: nome, data: new Date(agora - diasAtras * DIA).toISOString(),
  itens: ids.map((id) => ({ exercicioId: id, series: serie(4) })) });
const fichaDe = (id, nome, ids) => ({ id: id, nome: nome, programaId: "p", itens: ids.map((x) => ({ exercicioId: x, series: 4, reps: "10" })) });
const A = fichaDe("a", "A - Peito e Tríceps", ["supino-reto", "supino-halteres", "triceps-corda"]);
const B = fichaDe("b", "B - Costas e Bíceps", ["puxada-frente", "remada-baixa", "rosca-direta"]);
const C = fichaDe("c", "C - Pernas", ["leg-press", "cadeira-extensora", "mesa-flexora"]);
[A, B, C].forEach((f) => f.itens.forEach((it) => { if (!porId(it.exercicioId)) { console.error("sem exercício " + it.exercicioId); process.exit(1); } }));
// a semana toda feita: C ontem, B anteontem, A há 3 dias. Amanhã é A de novo.
const hist = [treino("C - Pernas", 1, ["leg-press", "cadeira-extensora", "mesa-flexora"]),
  treino("B - Costas e Bíceps", 2, ["puxada-frente", "remada-baixa", "rosca-direta"]),
  treino("A - Peito e Tríceps", 3, ["supino-reto", "supino-halteres", "triceps-corda"])];
const hoje = X.fichaDeHoje([{ id: "p", nome: "P" }], [A, B, C], hist, new Date(agora));
teste("a próxima ficha é a A", "a", hoje.ficha.id);
const plano = X.treinoExtra({ historico: hist, exPorId: porId, catalogo: EXERCICIOS, proximas: [A, B], usados: {}, agora: agora, minutos: 45, geral: 90, modo: "ciencia" });
console.log("  (" + X.nomeTreinoExtra(plano) + ": " + plano.itens.map((i) => i.exercicioId + " " + i.series + "x" + i.reps).join(", ") + ")");
const musc = plano.musculos.map((m) => m.id);
teste("monta um treino", true, plano.itens.length >= 2 && !plano.descansar);
const proibidos = ["peito", "triceps", "dorsal", "quadriceps", "posteriores"];
teste("nada da próxima ficha (A) nem os grandes da seguinte (B), nem perna de ontem", [], musc.filter((m) => proibidos.indexOf(m) >= 0));
teste("nenhum exercício tem como principal um músculo de fora", [], plano.itens.filter((it) => X.musculosDoEx(porId(it.exercicioId)).p.some((m) => plano.fora.some((f) => f.id === m))).map((i) => i.exercicioId));
teste("os de fora dizem por quê", true, plano.fora.every((f) => f.motivo.length > 5) && plano.fora.some((f) => /próxima ficha/.test(f.motivo)));
teste("3 séries, 10-12, longe da falha", true, plano.itens.every((it) => it.series <= 3 && (it.reps === "10-12" || it.reps === 30) && /2 repetições sobrando/.test(it.obs)));
teste("no máximo 4 músculos", true, plano.musculos.length <= 4);
teste("cabe nos 45 min", true, plano.cabe && plano.depois <= 50);
teste("o nome diz os músculos", true, /^Treino extra · /.test(X.nomeTreinoExtra(plano)) && X.nomeTreinoExtra(plano).length > 16);
const p30 = X.treinoExtra({ historico: hist, exPorId: porId, catalogo: EXERCICIOS, proximas: [A, B], usados: {}, agora: agora, minutos: 30, geral: 90, modo: "ciencia" });
teste("menos tempo, menos séries", true, p30.itens.reduce((a, i) => a + i.series, 0) <= plano.itens.reduce((a, i) => a + i.series, 0));

console.log("--- descanso e semana ---");
// ombro treinado hoje de manhã: fica de fora
const hist2 = [treino("Ombro", 0.3, ["elevacao-lateral"])].concat(hist);
const p2 = X.treinoExtra({ historico: hist2, exPorId: porId, catalogo: EXERCICIOS, proximas: [A, B], usados: {}, agora: agora, minutos: 45, geral: 90, modo: "ciencia" });
teste("ombro treinado há poucas horas fica de fora", true, p2.musculos.every((m) => m.id !== "ombros") && p2.fora.some((f) => f.id === "ombros" && /treinado há/.test(f.motivo)));
// glúteo com 24 séries na semana: passou da faixa
const glut = [];
for (let k = 0; k < 6; k++) glut.push(treino("Glúteo", 2.5 + k * 0.05, ["elevacao-pelvica"]));
const p3 = X.treinoExtra({ historico: glut.concat(hist), exPorId: porId, catalogo: EXERCICIOS, proximas: [A, B], usados: {}, agora: agora, minutos: 45, geral: 90, modo: "ciencia" });
teste("músculo acima de 20 séries na semana fica de fora", true, p3.musculos.every((m) => m.id !== "gluteos") && p3.fora.some((f) => f.id === "gluteos"));
// o que a pessoa já conhece vem primeiro
const pc = X.treinoExtra({ historico: hist, exPorId: porId, catalogo: EXERCICIOS, proximas: [A, B], usados: { "rosca-martelo": 10 }, agora: agora, minutos: 60, geral: 90, modo: "ciencia" });
teste("o exercício que já está nas fichas tem a preferência", true, pc.musculos.every((m) => m.id !== "biceps") || pc.itens.some((i) => i.exercicioId === "rosca-martelo"));

console.log("--- nada descansado ---");
// tudo treinado hoje: só sobra a caminhada
const tudo = EXERCICIOS.filter((e) => !e.cardio && !e.func && e.musc).map((e) => e.id);
const p4 = X.treinoExtra({ historico: [treino("Tudo", 0.2, tudo)], exPorId: porId, catalogo: EXERCICIOS, proximas: [A, B], usados: {}, agora: agora, minutos: 45, geral: 90, modo: "ciencia" });
teste("vira caminhada leve", [true, "esteira-caminhada", 25], [p4.descansar, p4.itens[0] && p4.itens[0].exercicioId, p4.itens[0] && p4.itens[0].reps]);
teste("o nome diz caminhada", "Treino extra · caminhada leve", X.nomeTreinoExtra(p4));
teste("sem histórico e sem fichas, ainda monta", true, X.treinoExtra({ historico: [], exPorId: porId, catalogo: EXERCICIOS, proximas: [], usados: {}, agora: agora, minutos: 45, geral: 90, modo: "ciencia" }).itens.length >= 2);

console.log("--- o treino de hoje não muda ---");
const comExtra = [{ id: "x", nome: "Treino extra · Ombros", data: new Date(agora - 0.1 * DIA).toISOString(), extra: true, itens: [] }].concat(hist);
teste("depois do extra, o treino de hoje continua o A", "a", X.fichaDeHoje([{ id: "p", nome: "P" }], [A, B, C], comExtra, new Date(agora)).ficha.id);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
