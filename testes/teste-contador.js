// Testa o contador de repeticoes com movimento sintetico, fora do navegador.
// Nao da para fazer agachamento na frente do painel: o jeito de saber se a
// contagem e confiavel e simular o corpo em movimento.
//
// O cerebro vem direto do index.html, e nao de uma copia congelada: uma copia
// so prova que a versao de ontem funcionava. E o mesmo recorte do teste-tecnico.
const html = require("./app").lerApp();
const ini = html.indexOf("// ---------------- JARVIS EYES SCAN");
const fim = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
if (ini < 0 || fim < 0) { console.error("nao achei o bloco do Eyes Scan no index.html"); process.exit(1); }
let src = html.slice(ini, fim).replace(/\r\n/g, "\n");
// Tira o que so existe no navegador (import dinamico)
src = src.replace(/let eyesDetector[\s\S]*?^}/m, "");
src = src.replace(/const EYES_LIB[\s\S]*?pose_landmarker_lite\.task";/, "");
eval(src + "\nglobalThis.API = { criarContador, anguloEntre, EYES_SINAIS, caloriasEstimadas };");
const A = globalThis.API;

// ---- ruido sorteado, mas sempre o mesmo sorteio ----
// Gerador linear simples. `semear()` volta ao inicio, e cada serie comeca
// do mesmo ponto: duas execucoes do teste dao exatamente o mesmo resultado.
let SEMENTE = 20261014;
const semear = () => { SEMENTE = 20261014; };
function sorte() {
  SEMENTE = (SEMENTE * 1103515245 + 12345) & 0x7fffffff;
  return SEMENTE / 0x7fffffff;
}

// ---- monta um corpo falso com o joelho num angulo dado ----
// Proporcao de gente em pe: tronco de 0,25 da tela (ombro 0,30 a quadril
// 0,55), coxa e perna de 0,18. Os sinais de posicao do contador dividem tudo
// pela escala do tronco, entao tronco curto demais transforma tremor em
// movimento — e um corpo mal proporcionado reprova o contador por engano.
function corpo(opc) {
  const o = opc || {};
  const ruido = () => (o.ruido ? (sorte() - 0.5) * o.ruido : 0);
  const pt = (x, y) => ({ x: x + ruido(), y: y + ruido(), z: 0, visibility: 0.9 });
  const COXA = 0.18, PERNA = 0.18, QX = 0.5, QY = 0.55;
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = pt(QX, 0.3);

  // tronco
  l[11] = pt(QX - 0.09, 0.30); l[12] = pt(QX + 0.09, 0.30);   // ombros
  l[23] = pt(QX - 0.06, QY);   l[24] = pt(QX + 0.06, QY);     // quadris

  // pernas: joelho logo abaixo do quadril, tornozelo no angulo pedido
  const g = ((o.joelho === undefined ? 170 : o.joelho) * Math.PI) / 180;
  const a = Math.PI - g;
  const JY = QY + COXA;
  const TX = QX + PERNA * Math.sin(a), TY = JY + PERNA * Math.cos(a);
  l[25] = pt(QX - 0.06, JY); l[26] = pt(QX + 0.06, JY);       // joelhos
  l[27] = pt(TX - 0.06, TY); l[28] = pt(TX + 0.06, TY);       // tornozelos
  l[29] = pt(TX - 0.06, TY + 0.02); l[30] = pt(TX + 0.06, TY + 0.02);
  l[31] = pt(TX - 0.06, TY + 0.04); l[32] = pt(TX + 0.06, TY + 0.04);

  // bracos ao lado do corpo, so com tremor
  const c = ((o.cotovelo === undefined ? 170 : o.cotovelo) * Math.PI) / 180;
  const ac = Math.PI - c;
  l[13] = pt(QX - 0.12, 0.42); l[14] = pt(QX + 0.12, 0.42);   // cotovelos
  const PX = 0.15 * Math.sin(ac), PY = 0.15 * Math.cos(ac);
  l[15] = pt(QX - 0.12 + PX, 0.42 + PY); l[16] = pt(QX + 0.12 + PX, 0.42 + PY);
  return l;
}
// confere se o angulo sintetico bate com o que a funcao calcula
const c0 = corpo({ joelho: 90 });
const medido = A.anguloEntre(c0[23], c0[25], c0[27]);
console.log("角 sanidade: pedi 90, medi " + Math.round(medido) + (Math.abs(medido - 90) < 2 ? "  ok" : "  *** ERRADO ***"));

// ---- simula uma serie ----
// 30 quadros por segundo, repeticao de ~2s (1s descendo, 1s subindo)
// O ciclo vai de 80 (embaixo) a 170 (em cima). O descanso tem de ficar no
// MESMO ponto onde o ciclo comeca, senao o primeiro quadro da serie e uma
// descida inteira de uma vez — e o contador conta, com razao.
const FUNDO = 125 - 45;

function serie(opc) {
  const o = opc || {};
  const reps = o.reps || 10;
  const msPorRep = o.msPorRep || 2000;
  const fps = 30;
  semear();
  const cont = A.criarContador({ preferidos: o.preferidos || [], minMs: 550 });
  let t = 0;
  const passo = 1000 / fps;
  // alguns segundos parado antes de comecar (a pessoa se posiciona)
  for (let i = 0; i < fps * 2; i++) {
    cont.processar(corpo({ joelho: FUNDO, ruido: o.ruido || 0.004 }), t);
    t += passo;
  }
  for (let r = 0; r < reps; r++) {
    const quadros = Math.round(msPorRep / passo);
    for (let i = 0; i < quadros; i++) {
      // cosseno: 170 em cima, 80 em baixo, uma ida e volta completa
      const fase = (i / quadros) * 2 * Math.PI;
      const j = 125 - 45 * Math.cos(fase);
      cont.processar(corpo({ joelho: j, ruido: o.ruido || 0.004 }), t);
      t += passo;
    }
  }
  // parado de novo no fim
  for (let i = 0; i < fps * 2; i++) {
    cont.processar(corpo({ joelho: FUNDO, ruido: o.ruido || 0.004 }), t);
    t += passo;
  }
  return cont.estado();
}

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (obtido === esperado) { ok++; console.log("  ok   " + nome + ": " + obtido); }
  else { mal++; console.log("  X    " + nome + ": contou " + obtido + ", esperava " + esperado); }
}

console.log("\n--- contagem ---");
teste("10 repeticoes normais", 10, serie({ reps: 10 }).total);
teste("3 repeticoes", 3, serie({ reps: 3 }).total);
teste("20 repeticoes", 20, serie({ reps: 20 }).total);
teste("repeticao rapida (1,2s)", 12, serie({ reps: 12, msPorRep: 1200 }).total);
teste("repeticao lenta (4s)", 8, serie({ reps: 8, msPorRep: 4000 }).total);
teste("com muito ruido", 10, serie({ reps: 10, ruido: 0.02 }).total);

console.log("\n--- escolha do sinal ---");
const e = serie({ reps: 10, preferidos: ["joelho-e", "joelho-d"] });
console.log("  sinal escolhido: " + e.sinal + " (" + e.nomeSinal + ")" + (/joelho/.test(e.sinal) ? "  ok" : "  *** devia ser o joelho ***"));
if (/joelho/.test(e.sinal)) ok++; else mal++;

console.log("\n--- parado nao pode contar ---");
semear();
const parado = A.criarContador({});
let t = 0;
for (let i = 0; i < 30 * 20; i++) { parado.processar(corpo({ joelho: 170, ruido: 0.01 }), t); t += 33; }
teste("20s parado tremendo", 0, parado.estado().total);

console.log("\n--- calorias ---");
console.log("  30 min, 80 kg: " + A.caloriasEstimadas(1800, 80) + " kcal");

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
