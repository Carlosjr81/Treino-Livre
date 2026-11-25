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
  trecho("function diaLocal("), trecho("const fmtNum = "), trecho("function cargaDeload("),
  "function medirCardio(s) { return { km: numDe(s.km) }; }",
  entre("// ---- A CALCULADORA DE ANILHAS (2026-11-22b", "\n// Monta as séries de um exercício"),
  entre("// ---- A MEDALHA DO MÊS (2026-11-22b", "// ---- A RETROSPECTIVA DO ANO"),
].join("\n");
eval(fonte + "\nglobalThis.M = { faixaReps, fadigaDoExercicio, planoDeSeries, textoPlano, anilhasPara, falaAnilhas, sugerirCarga, cargaParaReps, cargaDeload, desafioDoMes, medalhasDoAno, sequenciaComFolga };");

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

console.log("\n--- as repetições que não fecharam (2026-11-25b) ---");
const hs = (series, extra) => [Object.assign({ data: "2026-11-25T18:00:00", itens: [{ exercicioId: "supino", series: series.map(([p, r, rir]) => Object.assign({ peso: String(p), reps: String(r), feito: true }, rir === undefined ? {} : { rir })) }] }, extra || {})];
teste("o caso do dono: 100 × 4 com meta de 12 não volta a pedir 100", [75, true, false], (() => { const r = M.sugerirCarga(hs([[100, 4], [100, 4], [100, 3]]), "supino", 12); return [r.peso, r.baixou, r.subiu]; })());
teste("a fala sabe o que aconteceu: 4 de 12 com 100", [4, 12, 100], (() => { const r = M.sugerirCarga(hs([[100, 4], [100, 3]]), "supino", 12); return [r.repsFeitas, r.alvo, r.anterior]; })());
teste("faltaram 2 (10 de 12): fica a carga, para completar", [100, false], (() => { const r = M.sugerirCarga(hs([[100, 10], [100, 9], [100, 8]]), "supino", 12); return [r.peso, !!r.baixou]; })());
teste("faltaram 3 (9 de 12): desce", true, M.sugerirCarga(hs([[100, 9], [100, 8]]), "supino", 12).baixou);
teste("a reserva marcada entra na conta (com 3 sobrando, mais carga)", true, M.sugerirCarga(hs([[100, 4, 3]]), "supino", 12).peso > M.sugerirCarga(hs([[100, 4, 0]]), "supino", 12).peso);
teste("semana de reserva 3 pede menos que a de reserva 1", true, M.sugerirCarga(hs([[40, 5]]), "supino", 12, 3).peso < M.sugerirCarga(hs([[40, 5]]), "supino", 12, 1).peso);
teste("nunca sobe acima do que foi usado", true, M.sugerirCarga(hs([[20, 9]]), "supino", 12, 0).peso <= 20);
teste("carga leve no degrau de 1 kg", 0, M.sugerirCarga(hs([[18, 5]]), "supino", 15).peso % 1);
teste("a série mais forte manda, não a mais cansada", 75, M.sugerirCarga(hs([[100, 5], [100, 3], [90, 4]]), "supino", 12).peso);
teste("a semana leve do ciclo não vira a régua", [100, true], (() => { const h = [...hs([[90, 12], [90, 12]], { ciclo: { s: 5 } })].concat(hs([[100, 12], [100, 12]]).map((x) => Object.assign({}, x, { data: "2026-11-18T18:00:00" }))); const r = M.sugerirCarga(h, "supino", 12); return [r.anterior, r.subiu]; })());
teste("só houve a semana leve: vale ela", 90, M.sugerirCarga(hs([[90, 12]], { ciclo: { s: 5 } }), "supino", 12).anterior);
teste("a carga da semana leve: uns 10% a menos, no degrau", [90, 40, 35], [M.cargaDeload(100), M.cargaDeload(45), M.cargaDeload(40)]);
teste("1RM 113 para 12 com 2 sobrando: 75 kg", 75, M.cargaParaReps(113.33, 12, 2));

console.log("\n--- o plano de volume série por série (2026-11-25c) ---");
teste("a faixa: 8-12, e 12 é 10 a 12", [{ lo: 8, hi: 12 }, { lo: 10, hi: 12 }, null], [M.faixaReps("8-12"), M.faixaReps("12"), M.faixaReps("")]);
const sessoes = (...vezes) => vezes.map((ser, k) => ({ data: "2026-11-" + (20 - k) + "T18:00:00", itens: [{ exercicioId: "supino", series: ser.map(([p, r]) => ({ peso: String(p), reps: String(r), feito: true })) }] }));
teste("sem histórico: uns 2,5% por série", [1, 0.975, 0.95], M.fadigaDoExercicio([], "supino", 3).map((x) => Math.round(x * 1000) / 1000));
const hCai = sessoes([[100, 12], [100, 9], [100, 7]], [[100, 12], [100, 10], [100, 7]]);
const fCai = M.fadigaDoExercicio(hCai, "supino", 3);
teste("o cansaço sai do histórico (12, 9-10, 7)", true, fCai[1] < 0.95 && fCai[2] < fCai[1]);
teste("nunca sobe de uma série para a outra", true, M.fadigaDoExercicio(sessoes([[50, 8], [50, 12]]), "supino", 3).every((x, i, a) => !i || x <= a[i - 1]));
const p1 = M.planoDeSeries([], "supino", "12", 3, 100, 2);
console.log("     plano sem histórico: " + M.textoPlano(p1));
teste("a primeira no topo da faixa com a carga sugerida", [100, 12], [p1[0].peso, p1[0].reps]);
teste("toda série fica dentro da faixa (10 a 12)", true, p1.every((p) => p.reps >= 10 && p.reps <= 12));
teste("a carga nunca sobe ao longo das séries", true, p1.every((p, i) => !i || p.peso <= p1[i - 1].peso));
const p2 = M.planoDeSeries(hCai, "supino", "12", 4, 100, 2);
console.log("     plano de quem cai muito: " + M.textoPlano(p2));
teste("quem cai muito recua a carga para continuar no topo", true, p2.some((p) => p.recuo) && p2.every((p) => p.reps >= 10));
const vol = (pl) => pl.reduce((a, p) => a + p.peso * p.reps, 0);
const capDe = (pl, f) => pl.reduce((a, p, i) => { const cap = 100 * (1 + 14 / 30) * f[i]; const r = Math.max(0, Math.floor(30 * (cap / 100 - 1) - 2)); return a + 100 * r; }, 0);
teste("mais volume que repetir a carga nas 4 (com o mesmo cansaço)", true, vol(p2) > capDe(p2, M.fadigaDoExercicio(hCai, "supino", 4)));
const pf = M.planoDeSeries([], "supino", "6-8", 3, 120, 1);
teste("faixa 6-8: dentro de 6 a 8", true, pf.every((p) => p.reps >= 6 && p.reps <= 8));
teste("a série de recuo que fecha a meta dela não trava a subida", [105, true], (() => { const h = [{ data: "2026-11-25T18:00:00", itens: [{ exercicioId: "supino", series: [{ peso: "100", reps: "12", meta: 12, feito: true }, { peso: "100", reps: "10", meta: 10, feito: true }, { peso: "95", reps: "12", meta: 12, recuo: true, feito: true }] }] }]; const r = M.sugerirCarga(h, "supino", 12); return [r.peso, r.subiu]; })());
teste("faltou a meta numa série: não sobe", false, (() => { const h = [{ data: "2026-11-25T18:00:00", itens: [{ exercicioId: "supino", series: [{ peso: "100", reps: "12", meta: 12, feito: true }, { peso: "100", reps: "8", meta: 10, feito: true }] }] }]; return M.sugerirCarga(h, "supino", 12).subiu; })());

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

console.log("\n--- as frases da academia (2026-11-22c) ---");
{
  const F = eval("(" + trecho("const FRASES_MAROMBA = ").replace(/^const FRASES_MAROMBA = /, "").replace(/;\s*$/, "") + ")");
  const todas = Object.keys(F).reduce((a, k) => a.concat(F[k]), []);
  teste("tem frase em cada momento (anotou, volta, fim, aula, cobrança, fecho)", true, ["anotou", "volta", "fimEx", "aula", "cobranca", "fecho"].every((k) => F[k].length >= 5));
  teste("sem palavrão", [], todas.filter((x) => /porra|caralho|merda|foda|puta/i.test(x)));
  teste("sem remédio nem 'bomba'", [], todas.filter((x) => /bomba|anabol|hormôn|esteroid|suplement/i.test(x)));
  teste("nada que mande treinar com dor (o aviso de saúde manda parar)", [], todas.filter((x) => /\bdor\b|até cair|até vomitar|no pain/i.test(x)));
  teste("sem o nome de pessoa real (art. 18 do Código Civil)", [], todas.filter((x) => /ronnie|coleman|cariani|cutler|jorlan|waldemar|franco|toguro|bambam|arnold/i.test(x)));
  teste("nenhuma promessa de resultado", [], todas.filter((x) => /garant|em \d+ dias|vai ficar (grande|monstro)/i.test(x)));
  teste("as listas de sempre continuam e ganham as novas", true, /const ANIMO_ANOTOU = \["Boa!"[^\n]*\.concat\(/.test(html) && /const FRASES_BOLSO_VOLTA = \["Bora!"[^\n]*\.concat\(/.test(html));
}

console.log("\n--- cada bordão no seu momento (2026-11-22d) ---");
{
  eval(trecho("const FRASES_MAROMBA = ") + trecho("const sorteiaFrase = ") + trecho("function bordaoDoMomento(") + trecho("const ehTrapezio = ") + "\nglobalThis.BM = { FRASES_MAROMBA, bordaoDoMomento, ehTrapezio };");
  const F = BM.FRASES_MAROMBA;
  teste("o recorde vem com um bordão de recorde", true, F.recorde.indexOf(BM.bordaoDoMomento({ recorde: true, ultima: true })) >= 0);
  teste("a série mais pesada vem antes da última", true, F.pesada.indexOf(BM.bordaoDoMomento({ pesada: true, ultima: true })) >= 0);
  teste("a última série: 'Eu quero, eu posso'", true, F.ultima.indexOf(BM.bordaoDoMomento({ ultima: true })) >= 0);
  teste("sem momento especial, nada (vale a frase de sempre)", "", BM.bordaoDoMomento({}));
  teste("o encolhimento é trapézio", [true, false], [BM.ehTrapezio({ id: "encolhimento-halteres", nome: "Encolhimento com halteres" }), BM.ehTrapezio({ id: "supino", nome: "Supino" })]);
  teste("as frases pedidas pelo dono estão lá", true, ["Yeah baby!", "Light weight, baby!", "Baby, don't hurt me!", "Ajuda o maluco que tá doente!", "Trapézio descendente!"]
    .every((x) => JSON.stringify(F).indexOf(x) >= 0) && JSON.stringify(F).indexOf("Eu quero, eu posso") >= 0 && JSON.stringify(F).indexOf("comi pra caramba") >= 0);
}
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
