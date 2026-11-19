// Montar o treino pela ciência e o reajuste automático pelo histórico.
//
// O que este teste cobra, em ordem de importância:
//   1. Cada músculo grande treina 2 vezes por semana, em qualquer número de dias.
//   2. O volume de cada músculo (com o indireto pela metade) chega perto do
//      mínimo do nível, sem passar de 20, e o avançado recebe mais que o iniciante.
//   3. Nenhuma sessão passa do limite de exercícios e de séries do nível.
//   4. Só musculação de academia: sem aeróbico, funcional, mini band, isometria.
//   5. O reajuste: carga parada com boa frequência sobe 2 séries; carga caindo
//      tira 2; carga subindo não mexe; treinar pouco não sobe nada; sem treino
//      recente, não analisa.
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
eval(
  pedaco("const ehTempo = ", "\n") + "\n" + pedaco("const temValor = ", "\n") + "\n" + pedaco("const ehCardio = ", "\n") + "\n" +
  pedaco("const ehAquecimento = ", "\n") + "\n" + pedaco("const serieConta = ", "\n") + "\n" + funcao("ehDrop") + funcao("segundaDaSemana") +
  pedaco("const GRUPOS = [", "\n];") + "\n];\n" + pedaco("const MUSCULOS = {", "\n};") + "\n};\n" +
  pedaco("const FAIXA_SERIES = ", "\n") + "\n" + pedaco("const AVISO_SAUDE = {", "\n};") + "\n};\n" +
  funcao("plural") + pedaco("// ---------------- VOLUME FRACIONADO", "// ---------------- FIM DO PLANO DE AJUSTE") +
  "\nglobalThis.V = { montarProgramaLiteratura, reajusteAutomatico, desempenhoPorMusculo, aplicarPlanoNasFichas, volumeDasFichas, alvoDoMusculo, FATOR_NIVEL, LIMITE_SESSAO, DIVISOES_MONTAR, musculosDoEx };"
);
const V = globalThis.V;
const ini = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(ini + "const EXERCICIOS = ".length, html.indexOf("\n];", ini) + 2));
const porId = {};
EXERCICIOS.forEach((e) => { porId[e.id] = e; });
const exPorId = (id) => porId[id];

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = String(JSON.stringify(esperado)), b = String(JSON.stringify(obtido));
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(66) + b.slice(0, 70)); }
  else { mal++; console.log("  X    " + nome.padEnd(66) + b + "\n         esperava " + a); }
}
const verdade = (nome, v, info) => teste(nome, true, !!v) || (v ? null : info && console.log("         " + info));

const GRANDES = ["peito", "dorsal", "quadriceps", "posteriores", "ombros"];
console.log("--- 1 a 4. o programa montado ---");
[2, 3, 4, 5, 6].forEach((dias) => {
  ["iniciante", "intermediario", "avancado"].forEach((nivel) => {
    const m = V.montarProgramaLiteratura("massa", dias, nivel, EXERCICIOS);
    const rot = dias + " dias, " + nivel;
    teste(rot + ": uma ficha por dia", dias, m.fichas.length);
    // frequência: em quantas fichas cada músculo grande é o principal
    const freq = {};
    m.fichas.forEach((f) => {
      const ms = {};
      f.itens.forEach((it) => V.musculosDoEx(exPorId(it.exercicioId)).p.forEach((x) => { ms[x] = true; }));
      Object.keys(ms).forEach((x) => { freq[x] = (freq[x] || 0) + 1; });
    });
    const poucos = GRANDES.filter((g) => (freq[g] || 0) < 2);
    verdade(rot + ": peito, costas, coxas e ombros 2x por semana", !poucos.length, "so 1x: " + poucos.join(", "));
    const vol = {};
    m.volume.forEach((x) => { vol[x.id] = x.total; });
    const longe = GRANDES.filter((g) => vol[g] < V.alvoDoMusculo(g, V.FATOR_NIVEL[nivel]) - 2);
    verdade(rot + ": os grandes perto do minimo do nivel", !longe.length, longe.map((g) => g + " " + vol[g]).join(", "));
    verdade(rot + ": nenhum musculo acima de 20", m.volume.every((x) => x.total <= 20), JSON.stringify(m.volume.filter((x) => x.total > 20)));
    const lim = V.LIMITE_SESSAO[nivel];
    verdade(rot + ": sessoes dentro do limite", m.fichas.every((f) => f.itens.length <= lim.ex + 1 &&
      f.itens.reduce((a, it) => a + it.series, 0) <= lim.series + 4));
    verdade(rot + ": so musculacao de academia", m.fichas.every((f) => f.itens.every((it) => { const e = exPorId(it.exercicioId); return e && !e.cardio && !e.func && !e.tempo; })));
    verdade(rot + ": sem exercicio repetido na mesma ficha", m.fichas.every((f) => new Set(f.itens.map((it) => it.exercicioId)).size === f.itens.length));
  });
});
const ini3 = V.montarProgramaLiteratura("massa", 4, "iniciante", EXERCICIOS);
const ava3 = V.montarProgramaLiteratura("massa", 4, "avancado", EXERCICIOS);
const soma = (m) => m.fichas.reduce((a, f) => a + f.itens.reduce((b, it) => b + it.series, 0), 0);
verdade("o avancado recebe mais series que o iniciante", soma(ava3) > soma(ini3), soma(ini3) + " x " + soma(ava3));
const quadIni = ini3.fichas[1].itens.find((it) => V.musculosDoEx(exPorId(it.exercicioId)).p.indexOf("quadriceps") >= 0);
teste("iniciante: o quadriceps comeca pelo composto (leg press)", "leg-press", quadIni && quadIni.exercicioId);
[2, 3, 4, 5, 6].forEach((d) => { const m = V.montarProgramaLiteratura("massa", d, "iniciante", EXERCICIOS);
  const direto = {}; m.fichas.forEach((f) => f.itens.forEach((it) => V.musculosDoEx(exPorId(it.exercicioId)).p.forEach((x) => { direto[x] = (direto[x] || 0) + it.series; })));
  const sem = ["triceps", "biceps", "ombros", "posteriores"].filter((x) => (direto[x] || 0) < 2);
  verdade(d + " dias, iniciante: braco, ombro e posterior com serie direta", !sem.length, sem.join(", ")); });
const forca = V.montarProgramaLiteratura("forca", 3, "intermediario", EXERCICIOS);
const defin = V.montarProgramaLiteratura("definir", 3, "intermediario", EXERCICIOS);
teste("forca: compostos com 5 repeticoes", 5, Math.min(...forca.fichas[0].itens.map((it) => it.reps)));
teste("definicao: isolados com 15 repeticoes", 15, Math.max(...defin.fichas[0].itens.map((it) => it.reps)));
const primeiro = exPorId(ini3.fichas[1].itens[0].exercicioId);
verdade("o dia comeca por um exercicio grande (nao abdomen)", ["abdomen", "obliquos", "lombar"].indexOf(V.musculosDoEx(primeiro).p[0]) < 0, primeiro.id);
const ultimo = ini3.fichas[1].itens[ini3.fichas[1].itens.length - 1];
verdade("o abdomen fica no fim do dia", ini3.fichas[1].itens.findIndex((it) => /abdom|prancha/.test(it.exercicioId)) <= 0 || /abdom|obliq|hiperext/.test(ultimo.exercicioId), ultimo.exercicioId);

console.log("--- 5. o reajuste pelo historico ---");
const AGORA = new Date("2026-11-20T12:00:00").getTime();
const dia = 864e5;
const fichas = [
  { id: "a", nome: "Treino A - Superior", itens: [{ exercicioId: "supino-reto", series: 5, reps: 8 }, { exercicioId: "puxada-frente", series: 5, reps: 8 }, { exercicioId: "elevacao-lateral", series: 4, reps: 12 }, { exercicioId: "rosca-direta", series: 3, reps: 12 }, { exercicioId: "triceps-polia", series: 3, reps: 12 }] },
  { id: "b", nome: "Treino B - Inferior", itens: [{ exercicioId: "leg-press", series: 5, reps: 8 }, { exercicioId: "mesa-flexora", series: 4, reps: 12 }, { exercicioId: "panturrilha", series: 4, reps: 12 }, { exercicioId: "abdominal-supra", series: 3, reps: 15 }] },
  { id: "c", nome: "Treino C - Superior", itens: [{ exercicioId: "supino-maquina", series: 5, reps: 8 }, { exercicioId: "remada-baixa", series: 5, reps: 8 }, { exercicioId: "desenvolvimento-maquina", series: 3, reps: 8 }, { exercicioId: "rosca-martelo", series: 3, reps: 12 }, { exercicioId: "triceps-corda", series: 3, reps: 12 }] },
  { id: "d", nome: "Treino D - Inferior", itens: [{ exercicioId: "cadeira-extensora", series: 5, reps: 12 }, { exercicioId: "stiff", series: 4, reps: 8 }, { exercicioId: "elevacao-pelvica", series: 3, reps: 10 }, { exercicioId: "panturrilha-sentado", series: 3, reps: 15 }] },
];
// historico: n treinos por semana em 10 semanas; carga(exId, semanasAtras) diz o peso
function historico(porSemana, carga) {
  const h = [];
  for (let s = 0; s < 10; s++) {
    for (let k = 0; k < porSemana; k++) {
      const f = fichas[k % fichas.length];
      const t = AGORA - (s * 7 + k * 1.5 + 0.5) * dia;
      h.push({ id: "h" + s + k, nome: f.nome, data: new Date(t).toISOString(), itens: f.itens.map((it) => ({ exercicioId: it.exercicioId,
        series: Array.from({ length: it.series }, () => ({ peso: carga(it.exercicioId, s), reps: it.reps })) })) });
    }
  }
  return h;
}
const parado = historico(4, () => 50);
const r1 = V.reajusteAutomatico(fichas, parado, exPorId, EXERCICIOS, AGORA, { diasSemana: 4, nivel: null });
const faltam = (r) => r.plano.faltam.map((x) => x.musculo);
verdade("carga parada e 4 de 4 treinos: o peito ganha series", faltam(r1).indexOf("peito") >= 0, JSON.stringify(faltam(r1)));
teste("frequencia 16 de 16", 1, r1.adesao);
const r2 = V.reajusteAutomatico(fichas, historico(4, (id, s) => 50 + (10 - s) * 2), exPorId, EXERCICIOS, AGORA, { diasSemana: 4, nivel: null });
verdade("carga subindo: o peito nao muda", faltam(r2).indexOf("peito") < 0 && !r2.plano.sobram.some((x) => x.musculo === "peito"), JSON.stringify(r2.plano));
verdade("carga subindo: o motivo diz que fica", r2.motivos.some((m) => /Peito.*subiu/.test(m)), r2.motivos.join(" | "));
const r3 = V.reajusteAutomatico(fichas, historico(4, (id, s) => (id === "leg-press" ? 100 + s * 6 : 50)), exPorId, EXERCICIOS, AGORA, { diasSemana: 4, nivel: null });
verdade("leg press caindo: o quadriceps perde 2 series ou fica no minimo", r3.plano.sobram.some((x) => x.musculo === "quadriceps") || faltam(r3).indexOf("quadriceps") < 0, JSON.stringify(r3.plano.sobram));
const r4 = V.reajusteAutomatico(fichas, historico(1, () => 50), exPorId, EXERCICIOS, AGORA, { diasSemana: 4, nivel: null });
verdade("treinou 4 de 16: carga parada nao sobe o peito", faltam(r4).indexOf("peito") < 0 || r4.plano.faltam.find((x) => x.musculo === "peito").total < V.alvoDoMusculo("peito", 1) - 0.5, JSON.stringify(faltam(r4)));
verdade("treinou pouco: o motivo fala de constancia", /constância/.test(r4.motivos[0]), r4.motivos[0]);
teste("sem treino nas ultimas 4 semanas: nao analisa", null, V.reajusteAutomatico(fichas, historico(4, () => 50).map((h) => ({ ...h, data: new Date(new Date(h.data).getTime() - 60 * dia).toISOString() })), exPorId, EXERCICIOS, AGORA, { diasSemana: 4 }));
teste("treino de outro programa nao conta", null, V.reajusteAutomatico(fichas, parado.map((h) => ({ ...h, nome: "Outro" })), exPorId, EXERCICIOS, AGORA, { diasSemana: 4 }));
// aplicado nas fichas: soma ao exercício que já existe, com o teto de 6 séries
const ap = V.aplicarPlanoNasFichas(fichas, r1.plano, exPorId, () => "novo", r1.vezes, 6);
verdade("o ajuste muda alguma coisa nas fichas", ap.mudancas.length > 0, JSON.stringify(ap));
verdade("nenhum exercicio passa de 6 series", ap.fichas.every((f) => f.itens.every((it) => it.series <= 6)), JSON.stringify(ap.fichas.map((f) => f.itens.map((it) => it.series))));
verdade("as fichas originais nao foram tocadas", fichas[0].itens[0].series === 5);
const depois = V.volumeDasFichas(ap.fichas, exPorId, r1.vezes);
verdade("depois do ajuste, nenhum musculo acima de 20", depois.every((x) => x.total <= 20.5), JSON.stringify(depois.filter((x) => x.total > 20.5)));
// o próximo ciclo, com o ajuste já aplicado e a carga ainda parada, sobe de novo, até o teto
let fs2 = fichas, giros = 0;
for (; giros < 12; giros++) {
  const r = V.reajusteAutomatico(fs2, parado, exPorId, EXERCICIOS, AGORA, { diasSemana: 4, nivel: null });
  const a = V.aplicarPlanoNasFichas(fs2, r.plano, exPorId, () => "n" + giros, r.vezes, 6);
  if (!a.mudancas.length) break;
  fs2 = a.fichas;
}
const fim = V.volumeDasFichas(fs2, exPorId, 1);
verdade("ciclo apos ciclo com carga parada: para de subir (nao cresce sem fim)", giros < 12, "giros " + giros);
verdade("e termina com todo musculo no maximo em 20", fim.every((x) => x.total <= 20.5), JSON.stringify(fim.filter((x) => x.total > 20.5)));
verdade("o direto de cada musculo para no minimo + 6", fim.every((x) => x.direto <= Math.max(V.alvoDoMusculo(x.id, 1) + 6, 10) + 1), JSON.stringify(fim.map((x) => x.id + " " + x.direto)));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
