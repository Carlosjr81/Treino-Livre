// Testa o contador nos movimentos funcionais. O caso critico e o ALTERNADO:
// soco, chute e afundo trocam de lado a cada repeticao, e contar um lado so
// daria metade da serie.
const fs = require("fs");

const html = require("./app").lerApp();
const ini = html.indexOf("// ---------------- JARVIS EYES SCAN");
const fim = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
let src = html.slice(ini, fim).replace(/\r\n/g, "\n");
src = src.replace(/let eyesDetector[\s\S]*?^}/m, "");
src = src.replace(/const EYES_LIB[\s\S]*?pose_landmarker_lite\.task";/, "");
eval(src + "\nglobalThis.API = { criarContador, criarTecnico, MOV_FUNCIONAIS, EYES_SINAIS_POS, escalaTorso, adivinharMovimento };");
const A = globalThis.API;

// ---- um corpo falso, em coordenadas de imagem (y cresce para baixo) ----
// tronco de 0,25 na imagem: e a escala que normaliza tudo
function corpo(c) {
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.9 };
  const qy = 0.55 - (c.pulo || 0);        // quadril sobe quando pula
  const oy = qy - 0.25;                   // ombros, 0,25 acima
  l[11] = { x: 0.44, y: oy, visibility: 0.9 };          // ombro E
  l[12] = { x: 0.56, y: oy, visibility: 0.9 };          // ombro D
  l[23] = { x: 0.46, y: qy, visibility: 0.9 };          // quadril E
  l[24] = { x: 0.54, y: qy, visibility: 0.9 };          // quadril D
  // joelhos: sobem conforme joelhoE / joelhoD (0 = em baixo, 1 = na altura do quadril)
  l[25] = { x: 0.46 - (c.abrePes || 0) / 2, y: qy + 0.22 - 0.20 * (c.joelhoE || 0), visibility: 0.9 };
  l[26] = { x: 0.54 + (c.abrePes || 0) / 2, y: qy + 0.22 - 0.20 * (c.joelhoD || 0), visibility: 0.9 };
  l[27] = { x: 0.46 - (c.abrePes || 0), y: qy + 0.44 - 0.34 * (c.peE || 0), visibility: 0.9 };
  l[28] = { x: 0.54 + (c.abrePes || 0), y: qy + 0.44 - 0.34 * (c.peD || 0), visibility: 0.9 };
  // cotovelos e punhos: alcance do braco (soco) e altura da mao (polichinelo)
  const alcE = 0.10 + 0.14 * (c.socoE || 0);
  const alcD = 0.10 + 0.14 * (c.socoD || 0);
  l[13] = { x: 0.40, y: oy + 0.12, visibility: 0.9 };
  l[14] = { x: 0.60, y: oy + 0.12, visibility: 0.9 };
  l[15] = { x: 0.44 - alcE - (c.abreMaos || 0), y: oy + 0.20 - 0.46 * (c.maoE || 0), visibility: 0.9 };
  l[16] = { x: 0.56 + alcD + (c.abreMaos || 0), y: oy + 0.20 - 0.46 * (c.maoD || 0), visibility: 0.9 };
  return l;
}

// Roda um movimento por N ciclos. "faseP" desloca a fase do lado direito:
// 0,5 = alternado de verdade (um sobe enquanto o outro desce).
function rodar(perfilId, ciclos, msPorCiclo, aplicar, alternar) {
  const perfil = A.MOV_FUNCIONAIS[perfilId];
  const cont = A.criarContador({ perfil: perfil });
  const fps = 30, passo = 1000 / fps;
  let t = 0;
  for (let i = 0; i < fps * 2; i++) { cont.processar(corpo(aplicar(0, 0)), t); t += passo; }
  const quadros = Math.round(msPorCiclo / passo);
  for (let c = 0; c < ciclos; c++) {
    for (let i = 0; i < quadros; i++) {
      const f = i / quadros;
      const a = (1 - Math.cos(2 * Math.PI * f)) / 2;                       // 0..1..0
      const b = alternar ? (1 - Math.cos(2 * Math.PI * (f + 0.5))) / 2 : a; // defasado
      cont.processar(corpo(aplicar(a, b)), t);
      t += passo;
    }
  }
  for (let i = 0; i < fps * 2; i++) { cont.processar(corpo(aplicar(0, 0)), t); t += passo; }
  return cont.estado();
}

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const d = Math.abs(obtido - esperado);
  if (d <= (tol || 0)) { ok++; console.log("  ok   " + nome.padEnd(34) + obtido); }
  else { mal++; console.log("  X    " + nome.padEnd(34) + "contou " + obtido + ", esperava " + esperado); }
}

console.log("--- alternados: cada ciclo tem DUAS repeticoes (um lado e outro) ---");
teste("socos no ar, 10 ciclos = 20", 20,
  rodar("socos-ar", 10, 900, (a, b) => ({ socoE: a, socoD: b }), true).total, 1);
teste("chute frontal, 8 ciclos = 16", 16,
  rodar("chute-frontal", 8, 1400, (a, b) => ({ peE: a, peD: b }), true).total, 1);
teste("joelhos altos, 12 ciclos = 24", 24,
  rodar("joelhos-altos", 12, 700, (a, b) => ({ joelhoE: a, joelhoD: b }), true).total, 1);
teste("escalador, 10 ciclos = 20", 20,
  rodar("escalador", 10, 700, (a, b) => ({ joelhoE: a, joelhoD: b }), true).total, 1);

console.log("\n--- simples: um ciclo, uma repeticao ---");
teste("polichinelo, 15", 15,
  rodar("polichinelo", 15, 800, (a) => ({ abrePes: a * 0.10, maoE: a, maoD: a, abreMaos: a * 0.05 })).total, 1);
teste("salto vertical, 8", 8,
  rodar("salto-vertical", 8, 1000, (a) => ({ pulo: a * 0.10 })).total, 1);
teste("agachamento com salto, 10", 10,
  rodar("agachamento-salto", 10, 1600, (a) => ({ pulo: a * 0.09, joelhoE: 0, joelhoD: 0 })).total, 1);
teste("burpee, 6", 6,
  rodar("burpee", 6, 2600, (a) => ({ pulo: a * 0.13 })).total, 1);

console.log("\n--- parado nao pode contar ---");
const parado = A.criarContador({ perfil: A.MOV_FUNCIONAIS["socos-ar"] });
let t = 0;
for (let i = 0; i < 30 * 20; i++) {
  parado.processar(corpo({ socoE: 0.02 * Math.random(), socoD: 0.02 * Math.random() }), t);
  t += 33;
}
teste("20s parado tremendo", 0, parado.estado().total, 0);

console.log("\n--- o modo automatico (maquina sem perfil) nao pode ter quebrado ---");
const auto = A.criarContador({ preferidos: ["joelho-e", "joelho-d"] });
t = 0;
for (let i = 0; i < 30 * 2; i++) { auto.processar(corpo({ joelhoE: 0, joelhoD: 0 }), t); t += 33; }
for (let c = 0; c < 10; c++) {
  for (let i = 0; i < 60; i++) {
    const a = (1 - Math.cos((2 * Math.PI * i) / 60)) / 2;
    auto.processar(corpo({ joelhoE: a, joelhoD: a }), t); t += 33;
  }
}
for (let i = 0; i < 60; i++) { auto.processar(corpo({ joelhoE: 0, joelhoD: 0 }), t); t += 33; }
teste("automatico, 10 repeticoes", 10, auto.estado().total, 1);

console.log("\n--- mini band em casa ---");
// O corpo de cima so sobe o joelho na vertical: nenhum angulo muda. Aqui o
// joelho vai para a frente (de lado para a camera) e o pe fica no chao:
// dobram o quadril e o joelho, como no agachamento, no stiff e no coice.
function corpoA(c) {
  const l = corpo({});
  if (c.jE) l[25] = { x: 0.46 + 0.15 * c.jE, y: l[25].y - 0.05 * c.jE, visibility: 0.9 };
  if (c.jD) l[26] = { x: 0.54 + 0.15 * c.jD, y: l[26].y - 0.05 * c.jD, visibility: 0.9 };
  return l;
}
function rodarA(perfilId, ciclos, msPorCiclo, aplicar) {
  const cont = A.criarContador({ perfil: A.MOV_FUNCIONAIS[perfilId] });
  let tt = 0;
  for (let i = 0; i < 60; i++) { cont.processar(corpoA({}), tt); tt += 33; }
  const q = Math.round(msPorCiclo / 33);
  for (let c = 0; c < ciclos; c++) {
    for (let i = 0; i < q; i++) { cont.processar(corpoA(aplicar((1 - Math.cos((2 * Math.PI * i) / q)) / 2)), tt); tt += 33; }
  }
  return { cont: cont, tt: tt };
}
teste("abducao na parede, 12", 12,
  rodar("band-abducao-parede", 12, 1400, (a) => ({ abrePes: a * 0.08 })).total, 1);
teste("abducao na parede curta, 10", 10,
  rodar("band-abducao-parede", 10, 1400, (a) => ({ abrePes: a * 0.04 })).total, 1);
teste("caminhada lateral, 16 passos", 16,
  rodar("band-caminhada-lateral", 16, 900, (a) => ({ abrePes: a * 0.06 })).total, 1);
teste("agachamento com mini band, 10", 10,
  (() => { const x = rodarA("band-agachamento", 10, 1800, (a) => ({ jE: a, jD: a })); for (let i = 0; i < 60; i++) { x.cont.processar(corpoA({}), x.tt); x.tt += 33; } return x.cont.estado().total; })(), 1);
// polo "cima": a repeticao conta quando o joelho volta a esticar, no fim dela.
// Sem os quadros parados do fim, a ultima tem de estar contada mesmo assim.
{
  // sem os quadros parados do fim: a ultima tem de estar contada mesmo assim
  const x = rodarA("band-agachamento", 8, 1800, (a) => ({ jE: a, jD: a }));
  teste("agachamento: a ultima conta ao subir", 8, x.cont.estado().total, 1);
}
// Um lado de cada vez: 10 com a perna esquerda, uma pausa, 10 com a direita.
// O contador tem de passar para o outro lado e somar 20.
{
  let trocou = false;
  const cont = A.criarContador({ perfil: A.MOV_FUNCIONAIS["band-coice-em-pe"], aoTrocarLado: () => { trocou = true; } });
  let tt = 0;
  const lado = (k) => {
    for (let c = 0; c < 10; c++) {
      for (let i = 0; i < 36; i++) {
        const a = (1 - Math.cos((2 * Math.PI * i) / 36)) / 2;
        cont.processar(corpoA(k === "e" ? { jE: a } : { jD: a }), tt); tt += 33;
      }
    }
  };
  for (let i = 0; i < 60; i++) { cont.processar(corpoA({}), tt); tt += 33; }
  lado("e");
  for (let i = 0; i < 75; i++) { cont.processar(corpoA({}), tt); tt += 33; }
  lado("d");
  for (let i = 0; i < 60; i++) { cont.processar(corpoA({}), tt); tt += 33; }
  teste("coice: 10 de cada lado = 20", 20, cont.estado().total, 1);
  teste("coice: passou para o outro lado", 1, trocou ? 1 : 0, 0);
}
{
  const p = A.criarContador({ perfil: A.MOV_FUNCIONAIS["band-abducao-parede"] });
  let tt = 0;
  for (let i = 0; i < 30 * 20; i++) { p.processar(corpo({ abrePes: 0.004 * Math.random() }), tt); tt += 33; }
  teste("abducao: 20s parado tremendo", 0, p.estado().total, 0);
}
// O palpite do modo livre fica entre os movimentos de aula: abrir o joelho
// sentado nao pode virar "Parece concha com mini band".
{
  const pal = A.adivinharMovimento({ "afastamento-joelhos": 90 });
  teste("palpite nao escolhe mini band", 0, pal && /^band-/.test(pal.id) ? 1 : 0, 0);
}

console.log("\n--- o que ele diz que esta lendo ---");
const e = rodar("socos-ar", 6, 900, (a, b) => ({ socoE: a, socoD: b }), true);
console.log("  socos: sinal=" + e.sinal + " | alternado=" + e.alternado + " | " + e.nomeSinal);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
