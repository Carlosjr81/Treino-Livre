// Metas de corrida, esforço relativo (TRIMP de Banister) e o modelo de
// condicionamento/fadiga/forma.
//
// O que estes testes cobram, em ordem de importância:
//   1. O TRIMP bate com a fórmula publicada, calculada à mão aqui.
//   2. A forma se comporta como o modelo manda: treinar derruba, descansar
//      levanta, e o condicionamento sobe mais devagar que a fadiga.
//   3. A meta sabe a diferença entre "fez metade" e "está em dia" — que é a
//      única coisa que a meta existe para responder.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("function segundaDaSemana", "\n}\n") + "\n}\n" +
  pedaco("// ---------------- CORRIDA: AS CONTAS DO CORREDOR", "// ---------------- FIM DAS CONTAS DO CORREDOR") +
  "\nglobalThis.A = { esforcoRelativo, esforcoPorDia, condicionamentoForma, leituraForma," +
  " janelaMeta, feitoNaJanela, progressoMeta, vdotNecessario, planoProva, leituraProva," +
  " ESFORCO_B, ESFORCO_K, reservaFc, tempoPrevisto, ritmosDeTreino };"
);
const A = globalThis.A;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const bate = typeof esperado === "number" && typeof obtido === "number" && tol !== undefined
    ? Math.abs(esperado - obtido) <= tol
    : JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(46) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(46) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

const DIA = 864e5;
const HOJE = new Date("2026-10-16T10:00:00").getTime();   // uma sexta-feira
const diaDe = (n) => new Date(HOJE - n * DIA).toISOString();
const ativ = (o) => Object.assign({ tipo: "corrida", km: 10, ms: 50 * 60000, ganho: 0, fc: null }, o);

console.log("--- o TRIMP bate com a formula publicada ---");
// Banister: minutos x reserva x 0,64 x e^(1,92 x reserva)
// 60 min, FC media 150, max 190, repouso 60  ->  reserva = 90/130 = 0,6923
const r = (150 - 60) / (190 - 60);
const aMao = 60 * r * 0.64 * Math.exp(1.92 * r);
teste("reserva da FC", 0.6923, A.reservaFc(150, 190, 60), 0.0001);
teste("60 min a 150 bpm (FCmax 190, rep 60)", Math.round(aMao),
  A.esforcoRelativo(ativ({ ms: 60 * 60000, fc: { medio: 150 } }), 190, 60).valor);
teste("e vem marcado como medido pela FC", "fc",
  A.esforcoRelativo(ativ({ ms: 60 * 60000, fc: { medio: 150 } }), 190, 60).origem);

console.log("\n--- o mesmo tempo mais forte pesa mais ---");
const facil = A.esforcoRelativo(ativ({ ms: 60 * 60000, fc: { medio: 125 } }), 190, 60).valor;
const forte = A.esforcoRelativo(ativ({ ms: 60 * 60000, fc: { medio: 170 } }), 190, 60).valor;
teste("uma hora forte vale mais que uma hora facil", true, forte > facil * 2);
teste("e o dobro do tempo no mesmo ritmo vale o dobro",
  facil * 2, A.esforcoRelativo(ativ({ ms: 120 * 60000, fc: { medio: 125 } }), 190, 60).valor, 1);

console.log("\n--- sem cinta, o ritmo entra no lugar da FC ---");
const semFc = A.esforcoRelativo(ativ({ km: 10, ms: 50 * 60000 }), 190, 60, 50);
teste("ainda da um numero", true, semFc.valor > 0);
teste("e diz que foi pelo ritmo", "ritmo", semFc.origem);
// mesmo corredor, mesma distancia, 10 min mais rapido: tem de pesar mais
const rapido = A.esforcoRelativo(ativ({ km: 10, ms: 40 * 60000 }), 190, 60, 50);
const lento = A.esforcoRelativo(ativ({ km: 10, ms: 70 * 60000 }), 190, 60, 50);
teste("10 km mais rapido pesa mais que 10 km lentos", true, rapido.valor > lento.valor);
teste("caminhada pesa menos que corrida no mesmo tempo", true,
  A.esforcoRelativo(ativ({ tipo: "caminhada", km: 5, ms: 60 * 60000 }), 0, 0, 0).valor <
  A.esforcoRelativo(ativ({ tipo: "corrida", km: 10, ms: 60 * 60000 }), 0, 0, 0).valor);
teste("atividade de duracao zero nao vira esforco", 0,
  A.esforcoRelativo(ativ({ ms: 0 }), 190, 60).valor);

console.log("\n--- esforco por dia ---");
const umaSemana = [ativ({ data: diaDe(6) }), ativ({ data: diaDe(6) }), ativ({ data: diaDe(2) })];
const dias = A.esforcoPorDia(umaSemana, HOJE, 190, 60, 50);
teste("um ponto por dia, do primeiro ate hoje", 7, dias.length);
teste("dois treinos no mesmo dia somam", true, dias[0].esforco > 0 && dias[0].esforco === 2 * dias[4].esforco);
teste("dia sem treino e zero, nao buraco", 0, dias[1].esforco);
teste("sem atividade nenhuma, lista vazia", 0, A.esforcoPorDia([], HOJE, 190, 60, 50).length);

console.log("\n--- condicionamento, fadiga e forma ---");
// 8 semanas correndo todo dia: o condicionamento sobe e a fadiga sobe mais
const todoDia = [];
for (let d = 56; d >= 0; d--) todoDia.push(ativ({ data: diaDe(d), fc: { medio: 150 } }));
const cf = A.condicionamentoForma(todoDia, HOJE, 190, 60, 50);
teste("treinando todo dia, a fadiga passa o condicionamento", true, cf.fadiga > cf.condicionamento);
teste("e a forma fica negativa", true, cf.forma < 0);
teste("os dois sao positivos depois de 8 semanas", true, cf.condicionamento > 0 && cf.fadiga > 0);

// as mesmas 8 semanas, e depois 14 dias parado: a fadiga cai bem mais rapido
const comFolga = [];
for (let d = 70; d >= 14; d--) comFolga.push(ativ({ data: diaDe(d), fc: { medio: 150 } }));
const cf2 = A.condicionamentoForma(comFolga, HOJE, 190, 60, 50);
teste("duas semanas parado deixam a forma positiva", true, cf2.forma > 0);
teste("a fadiga quase sumiu", true, cf2.fadiga < cf.fadiga / 3);
teste("o condicionamento resistiu mais que a fadiga", true,
  cf2.condicionamento / cf.condicionamento > cf2.fadiga / cf.fadiga);

console.log("\n--- a leitura em palavras ---");
teste("historico curto nao arrisca leitura", true, /juntando histórico/.test(A.leituraForma({ dias: 5, forma: 0 }).texto));
teste("fadiga alta demais avisa", "var(--perigo)", A.leituraForma({ dias: 40, forma: -50 }).cor);
teste("equilibrio e verde", "var(--ok)", A.leituraForma({ dias: 40, forma: 0 }).cor);
teste("forma alta demais nao e elogio", "var(--cinza)", A.leituraForma({ dias: 40, forma: 60 }).cor);

console.log("\n--- a janela do periodo ---");
const js = A.janelaMeta("semana", HOJE);
teste("semana comeca na segunda", 1, new Date(js.ini).getDay());
teste("semana tem 7 dias", 7, js.diasTotais);
teste("na sexta, 4 dias ja passaram", 4, js.diasPassados);
teste("e hoje ainda conta como restante", 3, js.diasRestantes);
const jm = A.janelaMeta("mes", HOJE);
teste("mes comeca no dia 1", 1, new Date(jm.ini).getDate());
teste("outubro tem 31 dias", 31, jm.diasTotais);
const ja = A.janelaMeta("ano", HOJE);
teste("ano comeca em janeiro", 0, new Date(ja.ini).getMonth());
teste("2026 tem 365 dias", 365, ja.diasTotais);

console.log("\n--- o progresso da meta ---");
const semana = [
  ativ({ data: diaDe(4), km: 8, ms: 48 * 60000, ganho: 40 }),   // segunda
  ativ({ data: diaDe(2), km: 6, ms: 36 * 60000, ganho: 30 }),   // quarta
];
const p = A.progressoMeta({ periodo: "semana", km: 30, atividades: 4 }, semana, HOJE);
teste("so as medidas com alvo aparecem", ["km", "atividades"], p.linhas.map((l) => l.id));
const lkm = p.linhas[0];
teste("somou os quilometros da semana", 14, lkm.feito, 0.01);
teste("a fracao esta certa", 0.4667, lkm.pct, 0.001);
teste("falta o resto", 16, lkm.falta, 0.01);
teste("dividido pelos dias que sobram", 5.333, lkm.porDia, 0.01);
// 14 km em 4 dias -> 3,5/dia -> 24,5 na semana inteira
teste("projeta onde a semana fecha no ritmo de ate aqui", 24.5, lkm.projecao, 0.01);
// em dia na sexta seria 30 x 4/7 = 17,14; fez 14
teste("14 de 30 na sexta NAO e estar em dia", false, lkm.emDia);
teste("nem cumprida", false, lkm.cumprida);

const p2 = A.progressoMeta({ periodo: "semana", km: 20 }, semana, HOJE);
teste("14 de 20 na sexta ja e estar em dia", true, p2.linhas[0].emDia);
const p3 = A.progressoMeta({ periodo: "semana", km: 10 }, semana, HOJE);
teste("passou do alvo: cumprida", true, p3.linhas[0].cumprida);
teste("e a fracao nao passa de 1", 1, p3.linhas[0].pct);
teste("meta sem alvo nenhum nao gera linha", 0, A.progressoMeta({ periodo: "semana" }, semana, HOJE).linhas.length);
teste("o tempo entra em minutos", 84, A.progressoMeta({ periodo: "semana", minutos: 100 }, semana, HOJE).linhas[0].feito, 0.01);
teste("a subida soma o ganho", 70, A.progressoMeta({ periodo: "semana", subida: 200 }, semana, HOJE).linhas[0].feito, 0.01);
teste("atividade de outra semana fica de fora", 14,
  A.progressoMeta({ periodo: "semana", km: 30 }, semana.concat([ativ({ data: diaDe(20), km: 99 })]), HOJE).linhas[0].feito, 0.01);

console.log("\n--- a prova que se esta treinando para ---");
// VDOT 50 corre 5 km em 19:57 (tabela publicada, conferida no teste-corrida)
const alvo5k = 19 * 60000 + 57000;
teste("o VDOT necessario para 5 km em 19:57 e 50", 50, A.vdotNecessario(5000, alvo5k), 0.3);
const prova = { nome: "5k do parque", m: 5000, data: "2026-12-11", alvoMs: alvo5k };
const pp = A.planoProva(prova, 50, HOJE);
teste("conta os dias que faltam", 56, pp.dias);
teste("e as semanas", 8, pp.semanas);
teste("o ritmo alvo em min/km", 3.99, pp.ritmoAlvo, 0.01);
teste("quem ja tem o VDOT ouve que da", "ja", pp.viavel);
teste("e a diferenca para o previsto e ~zero", 0, pp.diferencaMs, 2000);
const longe = A.planoProva(prova, 42, HOJE);
teste("VDOT 42 para 8 semanas: dificil", "dificil", longe.viavel);
teste("e o app diz quanto falta de VDOT", 8, longe.faltaVdot, 0.4);
const perto = A.planoProva(prova, 47, HOJE);
teste("VDOT 47 em 8 semanas: da para buscar", "da", perto.viavel);
teste("prova sem data nao vira plano", null, A.planoProva({ m: 5000, alvoMs: alvo5k }, 50, HOJE));
teste("prova sem alvo conta so os dias", undefined, A.planoProva({ m: 5000, data: "2026-12-11" }, 50, HOJE).alvoMs);
const passada = A.planoProva({ m: 5000, data: "2026-09-01", alvoMs: alvo5k }, 50, HOJE);
teste("data que ja passou e marcada", true, passada.passou);
teste("e a leitura diz para marcar a proxima", true, /próxima/.test(A.leituraProva(passada).texto));
teste("sem corrida registrada, nao finge saber", true, /1,5 km/.test(A.leituraProva({ m: 5000, alvoMs: 1 }).texto));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
