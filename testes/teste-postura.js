// Postura e deteccao de movimento, com corpos sinteticos.
// A regra mais importante deste arquivo e a NEGATIVA: movimento certo nao pode
// gerar correcao. Falso alarme de postura e pior que silencio.
const fs = require("fs");

const html = require("./app").lerApp();
const ini = html.indexOf("// ---------------- JARVIS EYES SCAN");
const fim = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
let src = html.slice(ini, fim).replace(/\r\n/g, "\n");
src = src.replace(/let eyesDetector[\s\S]*?^}/m, "");
src = src.replace(/const EYES_LIB[\s\S]*?pose_landmarker_lite\.task";/, "");
eval(src + "\nglobalThis.API = { criarContador, criarPostura, adivinharMovimento, vistaDe, MOV_FUNCIONAIS };");
const A = globalThis.API;

let ok = 0, mal = 0;
function teste(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  ok   " + nome); }
  else { mal++; console.log("  X    " + nome + (detalhe ? "  (" + detalhe + ")" : "")); }
}

// ---- corpo de frente: agachamento, com ou sem joelho caindo para dentro ----
// agacha = 0 em pe, 1 no fundo. valgo = quanto o joelho cai para dentro.
function deFrente(agacha, valgo) {
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.95 };
  const qy = 0.50 + 0.10 * agacha;
  const oy = qy - 0.25;                       // tronco de 0,25
  l[11] = { x: 0.38, y: oy, visibility: 0.95 };
  l[12] = { x: 0.62, y: oy, visibility: 0.95 };   // ombros largos = vista de frente
  l[23] = { x: 0.44, y: qy, visibility: 0.95 };
  l[24] = { x: 0.56, y: qy, visibility: 0.95 };
  // tornozelos fixos no chao, joelhos no meio do caminho
  const tEy = 0.90, tDy = 0.90;
  l[27] = { x: 0.43, y: tEy, visibility: 0.95 };
  l[28] = { x: 0.57, y: tDy, visibility: 0.95 };
  const jy = qy + (tEy - qy) * 0.5;
  // sem valgo o joelho fica na reta quadril-tornozelo; o valgo puxa para o meio
  const retaE = 0.44 + (0.43 - 0.44) * 0.5;
  const retaD = 0.56 + (0.57 - 0.56) * 0.5;
  l[25] = { x: retaE + valgo, y: jy, visibility: 0.95 };   // E esta a esquerda do meio: medial = +x
  l[26] = { x: retaD - valgo, y: jy, visibility: 0.95 };
  return l;
}

// ---- corpo de perfil: prancha/flexao, com o quadril na linha ou fora dela ----
// desvio > 0 derruba o quadril; < 0 empina.
function dePerfil(desvio) {
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.95 };
  const oX = 0.20, oY = 0.50;
  const tX = 0.85, tY = 0.56;
  l[11] = { x: oX, y: oY, visibility: 0.95 };
  l[12] = { x: oX + 0.01, y: oY, visibility: 0.95 };   // ombros juntos = vista de perfil
  const f = 0.5;
  const qX = oX + (tX - oX) * f;
  const qY = oY + (tY - oY) * f + desvio;
  l[23] = { x: qX, y: qY, visibility: 0.95 };
  l[24] = { x: qX + 0.01, y: qY, visibility: 0.95 };
  l[27] = { x: tX, y: tY, visibility: 0.95 };
  l[28] = { x: tX, y: tY + 0.01, visibility: 0.95 };
  l[25] = { x: (qX + tX) / 2, y: (qY + tY) / 2, visibility: 0.95 };
  l[26] = { x: (qX + tX) / 2, y: (qY + tY) / 2, visibility: 0.95 };
  return l;
}

console.log("--- a vista e reconhecida ---");
teste("de frente", A.vistaDe(deFrente(0, 0)) === "frente", A.vistaDe(deFrente(0, 0)));
teste("de perfil", A.vistaDe(dePerfil(0)) === "perfil", A.vistaDe(dePerfil(0)));

// Roda N repeticoes de um corpo e conta quantas correcoes sairam
function repeticoes(ex, n, corpoNo) {
  const p = A.criarPostura(ex);
  const frases = [];
  for (let r = 1; r <= n; r++) {
    for (let k = 0; k < 12; k++) p.medir(corpoNo(r, k / 11));
    const f = p.fecharRepeticao(r);
    if (f) frases.push(r + ": " + f);
  }
  return frases;
}

const exAgacha = { id: "agachamento-salto", func: "agachamento-salto", grupo: "pernas" };
const exFlexao = { id: "flexao", func: "flexao", grupo: "peito" };
const exBiceps = { id: "rosca", grupo: "biceps" };

console.log("\n--- movimento certo NAO pode virar correcao ---");
teste("8 agachamentos na linha: nenhuma correcao",
  repeticoes(exAgacha, 8, (r, f) => deFrente(f, 0)).length === 0,
  JSON.stringify(repeticoes(exAgacha, 8, (r, f) => deFrente(f, 0))));
teste("8 flexoes com o corpo reto: nenhuma correcao",
  repeticoes(exFlexao, 8, () => dePerfil(0)).length === 0,
  JSON.stringify(repeticoes(exFlexao, 8, () => dePerfil(0))));
teste("desvio pequeno (ruido do modelo) nao conta",
  repeticoes(exFlexao, 8, (r, f) => dePerfil(0.012 * Math.sin(f * 6))).length === 0);
teste("joelho levemente fora da reta nao conta",
  repeticoes(exAgacha, 8, (r, f) => deFrente(f, 0.008)).length === 0);

console.log("\n--- o defeito de verdade aparece ---");
const valgo = repeticoes(exAgacha, 8, (r, f) => deFrente(f, 0.045));
teste("joelho caindo para dentro e apontado", valgo.length >= 1, JSON.stringify(valgo));
teste("e a frase fala de joelho", /[Jj]oelho/.test(valgo[0] || ""), valgo[0]);
const caido = repeticoes(exFlexao, 8, () => dePerfil(0.05));
teste("quadril caindo e apontado", caido.length >= 1, JSON.stringify(caido));
teste("e a frase fala de quadril", /[Qq]uadril/.test(caido[0] || ""), caido[0]);
const alto = repeticoes(exFlexao, 8, () => dePerfil(-0.06));
teste("quadril empinado e apontado", alto.length >= 1, JSON.stringify(alto));

console.log("\n--- uma repeticao ruim sozinha nao vira sermao ---");
teste("so a 3a repeticao fora da linha: cala",
  repeticoes(exFlexao, 8, (r) => dePerfil(r === 3 ? 0.06 : 0)).length === 0);
teste("nao repete a cada repeticao (8 erradas rendem no maximo 3 frases)",
  caido.length <= 3, "saiu " + caido.length);

console.log("\n--- a vista errada nao mede ---");
teste("valgo nao e medido de perfil",
  repeticoes(exAgacha, 8, () => dePerfil(0.08)).length === 0);
teste("quadril nao e medido de frente",
  repeticoes(exFlexao, 8, (r, f) => deFrente(f, 0.05)).length === 0);
teste("exercicio sem checagem fica quieto",
  !A.criarPostura(exBiceps).ativo && repeticoes(exBiceps, 8, (r, f) => deFrente(f, 0.06)).length === 0);
teste("ponto mal visto nao gera correcao", (() => {
  const p = A.criarPostura(exAgacha);
  for (let r = 1; r <= 8; r++) {
    for (let k = 0; k < 12; k++) {
      const l = deFrente(k / 11, 0.05);
      l[25].visibility = 0.3; l[26].visibility = 0.3;
      p.medir(l);
    }
    if (p.fecharRepeticao(r)) return false;
  }
  return true;
})());

// ---------------- deteccao do movimento ----------------
// Usa o mesmo corpo falso do teste-funcional, com o contador em modo automatico
// recolhendo as faixas.
function corpo(c) {
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.9 };
  const qy = 0.55 - (c.pulo || 0);
  const oy = qy - 0.25;
  l[11] = { x: 0.44, y: oy, visibility: 0.9 };
  l[12] = { x: 0.56, y: oy, visibility: 0.9 };
  l[23] = { x: 0.46, y: qy, visibility: 0.9 };
  l[24] = { x: 0.54, y: qy, visibility: 0.9 };
  l[25] = { x: 0.46 - (c.abrePes || 0) / 2, y: qy + 0.22 - 0.20 * (c.joelhoE || 0), visibility: 0.9 };
  l[26] = { x: 0.54 + (c.abrePes || 0) / 2, y: qy + 0.22 - 0.20 * (c.joelhoD || 0), visibility: 0.9 };
  l[27] = { x: 0.46 - (c.abrePes || 0), y: qy + 0.44 - 0.34 * (c.peE || 0), visibility: 0.9 };
  l[28] = { x: 0.54 + (c.abrePes || 0), y: qy + 0.44 - 0.34 * (c.peD || 0), visibility: 0.9 };
  const alcE = 0.10 + 0.14 * (c.socoE || 0);
  const alcD = 0.10 + 0.14 * (c.socoD || 0);
  l[13] = { x: 0.40, y: oy + 0.12, visibility: 0.9 };
  l[14] = { x: 0.60, y: oy + 0.12, visibility: 0.9 };
  l[15] = { x: 0.44 - alcE - (c.abreMaos || 0), y: oy + 0.20 - 0.46 * (c.maoE || 0), visibility: 0.9 };
  l[16] = { x: 0.56 + alcD + (c.abreMaos || 0), y: oy + 0.20 - 0.46 * (c.maoD || 0), visibility: 0.9 };
  return l;
}

function detectar(ciclos, msPorCiclo, aplicar, alternar) {
  const c = A.criarContador({});
  const fps = 30, passo = 1000 / fps;
  let t = 0;
  const quadros = Math.round(msPorCiclo / passo);
  for (let v = 0; v < ciclos; v++) {
    for (let i = 0; i < quadros; i++) {
      const f = i / quadros;
      const a = (1 - Math.cos(2 * Math.PI * f)) / 2;
      const b = alternar ? (1 - Math.cos(2 * Math.PI * (f + 0.5))) / 2 : a;
      c.processar(corpo(aplicar(a, b)), t);
      t += passo;
    }
  }
  return A.adivinharMovimento(c.faixas());
}

console.log("\n--- o que estou fazendo? ---");
const dPoli = detectar(6, 800, (a) => ({ abrePes: a * 0.10, maoE: a, maoD: a, abreMaos: a * 0.05 }));
teste("polichinelo", dPoli && dPoli.id === "polichinelo", dPoli && dPoli.id);
const dSoco = detectar(8, 900, (a, b) => ({ socoE: a, socoD: b }), true);
teste("socos no ar", dSoco && dSoco.id === "socos-ar", dSoco && dSoco.id);
const dJoelho = detectar(8, 700, (a, b) => ({ joelhoE: a, joelhoD: b }), true);
teste("joelhos altos ou escalador", dJoelho && /joelhos-altos|escalador/.test(dJoelho.id), dJoelho && dJoelho.id);
const dChute = detectar(6, 1400, (a, b) => ({ peE: a, peD: b }), true);
teste("chute ou skater (os dois sao perna no ar)", dChute && /chute-frontal|skater/.test(dChute.id), dChute && dChute.id);

console.log("\n--- parado nao gera palpite ---");
const parado = (() => {
  const c = A.criarContador({});
  let t = 0;
  for (let i = 0; i < 30 * 8; i++) { c.processar(corpo({ socoE: 0.01 * Math.random() }), t); t += 33; }
  return A.adivinharMovimento(c.faixas());
})();
teste("8s parado tremendo: sem palpite", parado === null, JSON.stringify(parado));

console.log("\n--- quando ele nao tem certeza, ele diz ---");
teste("o palpite traz nota e grau de certeza",
  dSoco && typeof dSoco.seguro === "boolean" && dSoco.nota > 0,
  JSON.stringify(dSoco));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
