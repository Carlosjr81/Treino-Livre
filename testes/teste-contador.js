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
eval(src + "\nglobalThis.API = { criarContador, anguloEntre, EYES_SINAIS, caloriasEstimadas, perfilDoEx };");
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
  // dx desloca o corpo inteiro de lado: e a pessoa andando no quadro
  // zoom encolhe o corpo em volta do centro da tela: e a pessoa se afastando
  const z = o.zoom || 1;
  const pt = (x, y) => ({ x: 0.5 + (x - 0.5) * z + (o.dx || 0) + ruido(), y: 0.5 + (y - 0.5) * z + ruido(), z: 0, visibility: 0.9 });
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

console.log("\n--- calibracao: posicionar-se nao e repeticao ---");
// sentar conta na hora, mas sai assim que a serie de verdade mostra o padrao
// Cada cena e uma lista de trechos: { ms, joelho: fn(fracao) ou numero, cot, dx }
function cena(trechos, opc) {
  semear();
  const cont = A.criarContador(Object.assign({ preferidos: ["joelho-e", "joelho-d"] }, opc || {}));
  let t = 0;
  const passo = 1000 / 30;
  trechos.forEach((tr) => {
    const q = Math.round(tr.ms / passo);
    for (let i = 0; i < q; i++) {
      const f = i / q;
      const val = (v, padrao) => (typeof v === "function" ? v(f) : v === undefined ? padrao : v);
      cont.processar(corpo({ joelho: val(tr.joelho, FUNDO), cotovelo: val(tr.cot, 170), dx: val(tr.dx, 0), zoom: val(tr.zoom, 1), ruido: 0.004 }), t);
      t += passo;
    }
  });
  return cont.estado();
}
const reps = (n, ms) => ({ ms: n * (ms || 2000), joelho: (f) => 125 - 45 * Math.cos(f * n * 2 * Math.PI) });
const quieto = (ms) => ({ ms: ms });
// sentar na maquina: o joelho vai de 170 a 80 de uma vez, numa descida so
const sentar = { ms: 1500, joelho: (f) => 170 - 90 * f };
teste("sentar na maquina e depois 10 repeticoes", 10,
  cena([{ ms: 1000, joelho: 170 }, sentar, quieto(2500), reps(10), quieto(2000)]).total);
// andar: o corpo atravessa o quadro, pernas e bracos balancando no passo
const andar = { ms: 6000, dx: (f) => -0.3 + 0.6 * f, joelho: (f) => 150 + 25 * Math.sin(f * 12 * 2 * Math.PI),
  cot: (f) => 140 + 35 * Math.sin(f * 12 * 2 * Math.PI) };
teste("andar ate o aparelho (6 s) nao fica na conta", 0, cena([andar, quieto(11000)]).total);
// o caso comum: apoia o celular e anda ate a maquina, ficando menor na imagem
const afastar = { ms: 6000, zoom: (f) => 1.3 - 0.6 * f, joelho: (f) => 150 + 25 * Math.sin(f * 12 * 2 * Math.PI),
  cot: (f) => 140 + 35 * Math.sin(f * 12 * 2 * Math.PI) };
teste("andar para longe do celular (6 s) nao fica na conta", 0, cena([afastar, quieto(11000)], {}).total);
// e a prova contraria: no stiff visto de frente o tronco encolhe na imagem a
// cada repeticao, mas volta. Isso e exercicio, e tem de contar.
const stiff = (n) => ({ ms: n * 2500, zoom: (f) => 1 - 0.25 * (1 - Math.cos(f * n * 2 * Math.PI)) / 2,
  joelho: (f) => 125 - 45 * Math.cos(f * n * 2 * Math.PI) });
teste("tronco que encolhe e volta (stiff de frente) conta", 8, cena([quieto(1500), stiff(8), quieto(2000)], {}).total);
teste("andar e depois 8 repeticoes", 8, cena([andar, quieto(2500), reps(8), quieto(2000)]).total);
// ajeitar-se: tres movimentos de tamanho e ritmo diferentes
const ajeitar = [
  { ms: 1200, joelho: (f) => 125 - 45 * Math.cos(f * 2 * Math.PI) },
  quieto(3000),
  { ms: 700, joelho: (f) => 100 - 20 * Math.cos(f * 2 * Math.PI) },
  quieto(6500),
  { ms: 2500, joelho: (f) => 115 - 35 * Math.cos(f * 2 * Math.PI) },
];
teste("ajeitar-se tres vezes, sem ritmo, sai da conta", 0, cena(ajeitar.concat([quieto(11000)])).total);
// mexer na pegada no meio da serie: movimento pequeno depois de uma pausa
const pegada = { ms: 1500, joelho: (f) => FUNDO + 12 - 12 * Math.cos(f * 2 * Math.PI) };
teste("mexer na pegada depois de 6 repeticoes nao conta", 6,
  cena([quieto(1500), reps(6), quieto(5000), pegada, quieto(2000)]).total);
// A contagem aparece desde a primeira: esperar o padrao para mostrar o numero
// fazia parecer que a contagem nao tinha comecado.
teste("a primeira repeticao ja conta", 1, cena([quieto(1500), reps(1), quieto(500)]).total);
teste("duas repeticoes contam duas", 2, cena([quieto(1500), reps(2), quieto(500)]).total);
// e o que contou e nao se confirmou sai depois
teste("movimento solto conta e e descontado em 10 s", 0, cena([quieto(1500), reps(1), quieto(11000)]).total);

console.log("\n--- sentado, pernas atras do banco (puxada alta) ---");
// O caso do treino real: puxada sentado, o banco e a almofada escondem as
// pernas. O modelo inventa joelho e tornozelo com visibilidade de 0,5 a 0,6,
// tremendo muito, e o tronco inclina para tras a cada puxada (o ombro desce na
// imagem). O rodape dizia "lendo altura do quadril" e a conta nao andava.
function puxada(opc) {
  const o = opc || {};
  semear();
  const cont = A.criarContador({ preferidos: ["cotovelo-e", "cotovelo-d"], tronco: o.tronco });
  const ruido = (k) => (sorte() - 0.5) * k;
  let t = 0;
  const passo = 1000 / 30;
  const quadro = (f) => {
    // f: 0 = bracos em cima (barra la no alto), 1 = barra no peito
    const l = [];
    for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.3, visibility: 0.9 };
    const p = (x, y, v) => ({ x: x + ruido(0.006), y: y + ruido(0.006), z: 0, visibility: v === undefined ? 0.9 : v });
    const oy = 0.36 + 0.05 * f;              // o tronco inclina: o ombro desce
    l[0] = p(0.5, oy - 0.1);
    l[11] = p(0.41, oy); l[12] = p(0.59, oy);
    l[23] = p(0.44, 0.66); l[24] = p(0.56, 0.66);
    // cotovelo: em cima, acima e ao lado do ombro; embaixo, ao lado das costelas
    const cy = oy - 0.13 + 0.25 * f, cxo = 0.1 + 0.04 * f;
    l[13] = p(0.41 - cxo, cy); l[14] = p(0.59 + cxo, cy);
    // punho: segura a barra, que desce do alto ate o peito
    const by = 0.08 + 0.26 * f;
    l[15] = p(0.31, by); l[16] = p(0.69, by);
    // pernas inventadas: escondidas, tremendo muito
    for (let i = 25; i <= 32; i++) {
      const lado = i % 2 ? -1 : 1;
      l[i] = { x: 0.5 + lado * 0.08 + ruido(0.12), y: 0.8 + ruido(0.15), z: 0, visibility: 0.56 };
    }
    return l;
  };
  for (let i = 0; i < 60; i++) { cont.processar(quadro(0), t); t += passo; }
  const n = o.reps || 10;
  for (let r = 0; r < n; r++) {
    const q = Math.round(2400 / passo);
    for (let i = 0; i < q; i++) { cont.processar(quadro((1 - Math.cos((i / q) * 2 * Math.PI)) / 2), t); t += passo; }
  }
  for (let i = 0; i < 60; i++) { cont.processar(quadro(0), t); t += passo; }
  return cont.estado();
}
const pu = puxada({ tronco: true });
teste("puxada sentado, 10 repeticoes", 10, pu.total);
teste("e le o cotovelo, nao o quadril", true, /^cotovelo/.test(pu.sinal || ""));
const pa = puxada({});
teste("sem saber que e sentado, tambem conta 10", 10, pa.total);
teste("e tambem nao le perna escondida", true, !/joelho|quadril|pe-|abertura-pes/.test(pa.sinal || ""));

console.log("\n--- deitado no banco (supino inclinado, visto de lado) ---");
// Pedido do dono: "nenhuma posição consegue enxergar a contagem" no supino
// inclinado com barra. O tronco fica a uns 45 graus, a camera ve de lado: um
// braco aparece, o outro fica atras do corpo (visibilidade baixa), e as pernas
// somem atras do banco. O sinal que vale e o cotovelo do lado de ca.
function supinoInclinado(opc) {
  const o = opc || {};
  semear();
  const cont = A.criarContador({ preferidos: ["cotovelo-e", "cotovelo-d"], tronco: true });
  const ruido = (k) => (sorte() - 0.5) * k;
  let t = 0;
  const passo = 1000 / 30;
  const inc = (o.graus || 45) * Math.PI / 180;     // inclinacao do encosto, a partir da vertical
  const quadril = { x: 0.62, y: 0.62 };
  const ombro = { x: quadril.x - 0.24 * Math.sin(inc), y: quadril.y - 0.24 * Math.cos(inc) };
  const quadro = (f) => {
    // f: 0 = barra no peito, 1 = bracos estendidos (a barra sobe na vertical)
    const l = [];
    for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.9 };
    const p = (x, y, v) => ({ x: x + ruido(0.006), y: y + ruido(0.006), z: 0, visibility: v === undefined ? 0.9 : v });
    const mao = { x: ombro.x + 0.02 * (1 - f), y: ombro.y - 0.07 - 0.16 * f };
    // em baixo o cotovelo desce abaixo da linha do banco; em cima, fica no meio do braco reto
    const cot = { x: ombro.x + 0.07 * (1 - f) + 0.01 * f, y: ombro.y + 0.08 * (1 - f) - 0.115 * f };
    l[0] = p(ombro.x - 0.06 * Math.sin(inc), ombro.y - 0.06 * Math.cos(inc) - 0.02);
    l[11] = p(ombro.x, ombro.y); l[12] = p(ombro.x + 0.01, ombro.y + 0.005, 0.45);
    l[13] = p(cot.x, cot.y); l[14] = p(cot.x + 0.01, cot.y, 0.4);
    l[15] = p(mao.x, mao.y); l[16] = p(mao.x + 0.01, mao.y, 0.4);
    l[23] = p(quadril.x, quadril.y); l[24] = p(quadril.x + 0.01, quadril.y, 0.5);
    for (let i = 25; i <= 32; i++) l[i] = { x: 0.7 + ruido(0.12), y: 0.85 + ruido(0.15), z: 0, visibility: 0.56 };
    return l;
  };
  for (let i = 0; i < 60; i++) { cont.processar(quadro(1), t); t += passo; }
  const n = o.reps || 10;
  for (let r = 0; r < n; r++) {
    const q = Math.round(2600 / passo);
    for (let i = 0; i < q; i++) { cont.processar(quadro((1 + Math.cos((i / q) * 2 * Math.PI)) / 2), t); t += passo; }
  }
  for (let i = 0; i < 60; i++) { cont.processar(quadro(1), t); t += passo; }
  return cont.estado();
}
const si = supinoInclinado({});
teste("supino inclinado a 45 graus, 10 repeticoes", 10, si.total);
teste("e le o cotovelo", true, /^cotovelo/.test(si.sinal || ""));
const sr = supinoInclinado({ graus: 75 });
teste("quase deitado (supino reto, 75 graus), 10 repeticoes", 10, sr.total);

console.log("\n--- sentado na maquina, quadril escondido (supino declinado sentado) ---");
// Relato do dono, com foto da maquina: no supino declinado sentado (alavanca
// de anilhas, empurra para a frente e para baixo) a camera nao contava. Ele
// desconfiou do angulo diagonal, mas a conta nao confirmou: de frente, na
// diagonal ou de lado, o cotovelo varia 57 a 80 graus na imagem. O defeito era
// outro: sentado ali, o quadril fica escondido atras do assento e das pegadas,
// o modelo inventa o ponto (visibilidade perto de 0,57) e ele treme — e o
// "voce esta andando" lia esse tremor como deslocamento, descontando e
// recomecando a calibracao. Contava 3 de 10.
function supinoDeclinado(quadrilEscondido, com3d) {
  semear();
  const cont = A.criarContador({ preferidos: ["cotovelo-e", "cotovelo-d"], tronco: true });
  const ruido = (k) => (sorte() - 0.5) * k;
  let t = 0;
  const passo = 1000 / 30;
  const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]); return v.map((c) => c / n); };
  const soma = (a, b, k) => a.map((c, i) => c + b[i] * k);
  // mundo em metros (x para a direita, y para baixo, z para longe da camera); a camera ve de frente
  const ombro = { e: [0.19, -0.45, 0], d: [-0.19, -0.45, 0] };
  const quadro = (f) => {
    // f: 0 = maos na pegada junto ao peito, 1 = bracos estendidos para a frente e para baixo
    const p3 = [];
    for (let i = 0; i < 33; i++) p3[i] = [0, -0.3, 0];
    ["e", "d"].forEach((lado) => {
      const s = lado === "e" ? 1 : -1, o = ombro[lado];
      const dirEst = norm([-0.06 * s, 0.35, -0.93]);
      const cotRep = soma(o, norm([0.55 * s, 0.35, 0.75]), 0.3);
      const maoRep = soma(cotRep, norm([-0.04 * s, -0.06, -0.99]), 0.3);
      const cotEst = soma(o, dirEst, 0.3), maoEst = soma(o, dirEst, 0.6);
      const io = lado === "e" ? 11 : 12;
      p3[io] = o;
      p3[io + 2] = cotRep.map((c, i) => c + (cotEst[i] - c) * f);
      p3[io + 4] = maoRep.map((c, i) => c + (maoEst[i] - c) * f);
      p3[lado === "e" ? 23 : 24] = [0.12 * s, 0, 0.02];
    });
    p3[0] = [0, -0.62, -0.05];
    const l = p3.map((p) => ({ x: 0.5 + p[0] * 0.6 + ruido(0.004), y: 0.55 + p[1] * 0.6 + ruido(0.004), z: 0, visibility: 0.9 }));
    for (let i = 25; i <= 32; i++) l[i] = { x: 0.5 + ruido(0.1), y: 0.9 + ruido(0.1), z: 0, visibility: 0.56 };
    if (quadrilEscondido) [23, 24].forEach((i) => { l[i] = { x: l[i].x + ruido(0.16), y: l[i].y + ruido(0.08), z: 0, visibility: 0.57 }; });
    // os pontos do mundo que o modelo tambem manda, em metros, com o tremor
    // medido no modelo de verdade (uns 2 cm)
    if (com3d) l.mundo = p3.map((p) => ({ x: p[0] + ruido(0.02), y: p[1] + ruido(0.02), z: p[2] + ruido(0.03), visibility: 0.9 }));
    return l;
  };
  for (let i = 0; i < 60; i++) { cont.processar(quadro(0), t); t += passo; }
  for (let r = 0; r < 10; r++) {
    const q = Math.round(2600 / passo);
    for (let i = 0; i < q; i++) { cont.processar(quadro((1 - Math.cos((i / q) * 2 * Math.PI)) / 2), t); t += passo; }
  }
  for (let i = 0; i < 60; i++) { cont.processar(quadro(0), t); t += passo; }
  return cont.estado();
}
// O antebraco apontado para a lente vira quase um ponto na imagem, e o angulo
// do cotovelo pula na posicao de partida: um falso comeco que a calibracao
// desconta levando junto a primeira repeticao. Em 3D o antebraco tem o
// tamanho de verdade, e o angulo nao pula.
const decV = supinoDeclinado(false, true);
teste("supino declinado sentado, de frente, quadril a vista: 10", 10, decV.total);
const decE = supinoDeclinado(true, true);
teste("o mesmo com o quadril escondido atras do assento: 10", 10, decE.total);
teste("e le o cotovelo", true, /^cotovelo/.test(decE.sinal || ""));
console.log("  (so com a imagem plana e o quadril escondido: " + supinoDeclinado(true, false).total + " de 10)");

console.log("\n--- um braco de cada vez (triceps unilateral na polia) ---");
// Relato do dono: o primeiro braco contava certo e o segundo nao contava
// nada. O contador escolhia o cotovelo que mais se mexia e travava nele na
// primeira repeticao; trocando de braco, o cotovelo que se mexia passava a ser
// o outro, e ele continuava olhando o braco parado. Aqui: 10 com o direito,
// uma troca (parado, ou girando o corpo para o outro lado da polia), 10 com o
// esquerdo. A conta tem de chegar a 20.
function unilateral(opc) {
  const o = opc || {};
  semear();
  const cont = A.criarContador({ preferidos: ["cotovelo-e", "cotovelo-d"], tronco: true });
  const ruido = (k) => (sorte() - 0.5) * k;
  let t = 0;
  const passo = 1000 / 30;
  // cE, cD: angulo de cada cotovelo; cx: o meio do corpo; w: meia largura dos ombros
  const quadro = (cE, cD, cx, w) => {
    const l = [];
    for (let i = 0; i < 33; i++) l[i] = { x: cx, y: 0.3, visibility: 0.9 };
    const p = (x, y) => ({ x: x + ruido(0.006), y: y + ruido(0.006), z: 0, visibility: 0.9 });
    l[0] = p(cx, 0.2);
    l[11] = p(cx - w, 0.3); l[12] = p(cx + w, 0.3);
    l[23] = p(cx - w * 0.7, 0.58); l[24] = p(cx + w * 0.7, 0.58);
    [[13, 15, -1, cE], [14, 16, 1, cD]].forEach(([ic, im, lado, c]) => {
      const ac = Math.PI - (c * Math.PI) / 180;
      const ex = cx + lado * (w + 0.02);
      l[ic] = p(ex, 0.44);
      l[im] = p(ex - lado * 0.15 * Math.sin(ac), 0.44 + 0.15 * Math.cos(ac));
    });
    for (let i = 25; i <= 32; i++) l[i] = p(cx + (i % 2 ? -0.05 : 0.05), 0.75 + 0.03 * (i - 25));
    return l;
  };
  const PARADO = 160;
  // a polia puxa a mao para cima: o cotovelo vai de 60 graus (em cima) a 170 (estendido)
  const rep = (i, q) => 115 - 55 * Math.cos((i / q) * 2 * Math.PI);
  for (let i = 0; i < 60; i++) { cont.processar(quadro(PARADO, 60, 0.45, 0.09), t); t += passo; }
  for (let r = 0; r < 10; r++) {
    const q = Math.round(2200 / passo);
    for (let i = 0; i < q; i++) { cont.processar(quadro(PARADO, rep(i, q), 0.45, 0.09), t); t += passo; }
    // no meio da serie, um respiro: o braco que trabalha para la em cima e o
    // outro coca o rosto (sobe e desce uma vez). Isso nao e o outro lado.
    if (o.coca && r === 4) {
      const q2 = Math.round(3000 / passo);
      for (let i = 0; i < q2; i++) {
        const f = i / q2;
        cont.processar(quadro(PARADO - 110 * Math.sin(Math.min(1, f * 1.6) * Math.PI), 60, 0.45, 0.09), t); t += passo;
      }
    }
  }
  if (o.soUmLado) { for (let i = 0; i < 400; i++) { cont.processar(quadro(PARADO, 60, 0.45, 0.09), t); t += passo; } return cont.estado(); }
  // a troca: solta a pegada, gira o corpo (os ombros se estreitam e alargam) e da um passo
  const troca = Math.round((o.trocaMs || 4000) / passo);
  for (let i = 0; i < troca; i++) {
    const f = i / troca;
    const w = o.gira ? 0.09 * Math.max(0.15, Math.abs(Math.cos(f * Math.PI))) : 0.09;
    const cx = o.gira ? 0.45 + 0.1 * f : 0.45;
    // o braco direito desce a pegada e para; o esquerdo sobe ate a polia
    cont.processar(quadro(PARADO + (60 - PARADO) * Math.min(1, f * 1.5), 60 + (PARADO - 60) * Math.min(1, f * 2), cx, w), t);
    t += passo;
  }
  const cx2 = o.gira ? 0.55 : 0.45;
  for (let r = 0; r < 10; r++) {
    const q = Math.round(2200 / passo);
    for (let i = 0; i < q; i++) { cont.processar(quadro(rep(i, q), PARADO, cx2, 0.09), t); t += passo; }
  }
  for (let i = 0; i < 60; i++) { cont.processar(quadro(60, PARADO, cx2, 0.09), t); t += passo; }
  return cont.estado();
}
const u1 = unilateral({});
teste("triceps unilateral, 10 de cada braco, parado no lugar: 20", 20, u1.total);
teste("e termina lendo o cotovelo esquerdo", "cotovelo-e", u1.sinal);
const u2 = unilateral({ gira: true });
teste("girando o corpo e dando um passo na troca: 20", 20, u2.total);
const u3 = unilateral({ trocaMs: 1500 });
teste("trocando depressa (1,5 s): 20", 20, u3.total);
const u4 = unilateral({ coca: true, soUmLado: true });
teste("o outro braco coca o rosto no meio da serie: continua 10", 10, u4.total);

// ---- encolhimento de ombros (trapezio) ----
// Relato do dono, com os oculos no espelho: a serie inteira e nada contou. O
// ombro sobe uns 5 cm e nenhum angulo muda; o automatico pedia 22 e o
// movimento da uns 14 na regua da largura dos ombros.
console.log("\n--- encolhimento de ombros ---");
const P_ENC = A.perfilDoEx({ id: "encolhimento-halteres", nome: "Encolhimento com halteres", grupo: "ombros" });
teste("o encolhimento tem perfil proprio", true, !!(P_ENC && P_ENC.sinais && P_ENC.sinais[0] === "ombros-subindo"));
teste("exercicio criado pelo dono com o nome tambem", true, A.perfilDoEx({ id: "custom-1", nome: "Encolhimento na máquina da Hammer" }) === P_ENC);
teste("rosca nao ganha perfil", null, A.perfilDoEx({ id: "rosca-direta", nome: "Rosca direta", grupo: "biceps" }));
teste("funcional continua com o dele", true, A.perfilDoEx({ id: "polichinelo", func: "polichinelo" }) !== P_ENC && !!A.perfilDoEx({ id: "polichinelo", func: "polichinelo" }));
// sobe = quanto os ombros (e os bracos junto) sobem; a cabeca fica
function encolhendo(sobe, ruido) {
  const l = corpo({ ruido: ruido });
  const r = () => (sorte() - 0.5) * ruido;
  l[0] = { x: 0.5 + r(), y: 0.215 + r(), z: 0, visibility: 0.9 };
  l[7] = { x: 0.465 + r(), y: 0.2 + r(), z: 0, visibility: 0.9 };
  l[8] = { x: 0.535 + r(), y: 0.2 + r(), z: 0, visibility: 0.9 };
  [11, 12, 13, 14, 15, 16].forEach((i) => { l[i] = { ...l[i], y: l[i].y - sobe }; });
  return l;
}
function serieEnc(trechos, ruido) {
  semear();
  const cont = A.criarContador({ perfil: P_ENC, semAndar: true, preferidos: [] });
  let t = 0;
  trechos.forEach((tr) => {
    const n = Math.round(tr.ms / (1000 / 30));
    for (let i = 0; i < n; i++) { cont.processar(encolhendo(tr.sobe(i / n), ruido || 0.004), t); t += 1000 / 30; }
  });
  return cont.estado();
}
const encs = (n, alto, ms) => ({ ms: n * (ms || 2000), sobe: (f) => alto * (1 - Math.cos(f * n * 2 * Math.PI)) / 2 });
const paradoEnc = (ms) => ({ ms: ms, sobe: () => 0 });
const respira = (ms) => ({ ms: ms, sobe: (f) => 0.002 * (1 - Math.cos(f * (ms / 4000) * 2 * Math.PI)) });
const e1 = serieEnc([paradoEnc(2000), encs(10, 0.025), paradoEnc(2000)]);
teste("10 encolhimentos (5 cm): 10", 10, e1.total);
teste("e le a subida dos ombros", "ombros-subindo", e1.sinal);
teste("10 encolhimentos curtos (3 cm): 10", 10, serieEnc([paradoEnc(2000), encs(10, 0.015), paradoEnc(2000)]).total);
teste("12 encolhimentos segurando 1 s em cima (3 s cada): 12", 12, serieEnc([paradoEnc(2000), encs(12, 0.025, 3000), paradoEnc(2000)]).total);
teste("10 encolhimentos com muito ruido: 10", 10, serieEnc([paradoEnc(2000), encs(10, 0.025), paradoEnc(2000)], 0.008).total);
teste("20 s parado respirando e tremendo: 0", 0, serieEnc([respira(20000)]).total);
teste("o tecnico pede para subir, nunca para descer", true, P_ENC.frases.caindo.every((f) => !/desce/i.test(f)));

console.log("\n--- calorias ---");
console.log("  30 min, 80 kg: " + A.caloriasEstimadas(1800, 80) + " kcal");

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
