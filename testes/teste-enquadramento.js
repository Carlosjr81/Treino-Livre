// O guia de enquadramento. O que importa aqui e o SENTIDO da instrucao:
// mandar para o lado errado tira a pessoa do quadro em vez de pôr dentro.
const fs = require("fs");
const html = require("./app").lerApp();
const ini = html.indexOf("// ---------------- JARVIS EYES SCAN");
const fim = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
let src = html.slice(ini, fim).replace(/\r\n/g, "\n");
src = src.replace(/let eyesDetector[\s\S]*?^}/m, "");
src = src.replace(/const EYES_LIB[\s\S]*?pose_landmarker_lite\.task";/, "");
eval(src + "\nglobalThis.API = { avaliarEnquadramento };");
const A = globalThis.API;

// cx = centro do corpo na imagem (0 = esquerda da imagem), altura = fracao da tela
function corpo(cx, altura, vis) {
  const v = vis === undefined ? 0.95 : vis;
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.9 };
  const topo = (1 - altura) / 2, base = topo + altura;
  const por = (i, dx, f) => { l[i] = { x: cx + dx, y: topo + altura * f, visibility: v }; };
  // o nariz fica acima dos ombros, como num corpo de verdade: e ele que denuncia
  // cabeca cortada quando os ombros ainda aparecem
  l[0] = { x: cx, y: topo - altura * 0.13, visibility: v };
  por(11, -0.07, 0); por(12, 0.07, 0);
  por(23, -0.05, 0.45); por(24, 0.05, 0.45);
  por(25, -0.05, 0.72); por(26, 0.05, 0.72);
  por(27, -0.05, 1); por(28, 0.05, 1);
  return l;
}

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (esperado === obtido) { ok++; console.log("  ok   " + nome.padEnd(38) + obtido); }
  else { mal++; console.log("  X    " + nome.padEnd(38) + obtido + ", esperava " + esperado); }
}
const chave = (l) => A.avaliarEnquadramento(l).chave;

console.log("--- o que ele manda fazer ---");
teste("no centro, tamanho bom", "ok", chave(corpo(0.5, 0.75)));
teste("corpo na esquerda da imagem", "esq", chave(corpo(0.25, 0.75)));
teste("corpo na direita da imagem", "dir", chave(corpo(0.78, 0.75)));
teste("longe demais", "aproxime", chave(corpo(0.5, 0.35)));
teste("perto demais", "afaste", chave(corpo(0.5, 0.96)));
teste("longe, mas nao tanto", "aproxime", chave(corpo(0.5, 0.43)));
teste("pontos mal vistos", "corpo", chave(corpo(0.5, 0.75, 0.2)));
teste("sem leitura nenhuma", "corpo", chave(null));

console.log("\n--- o sentido, que e o que nao pode inverter ---");
// A camera ve quem esta de frente espelhado em significado: a mao esquerda da
// pessoa aparece na direita da imagem. Corpo na esquerda da imagem precisa ir
// para a direita da imagem, ou seja: a pessoa anda para a ESQUERDA dela.
const esq = A.avaliarEnquadramento(corpo(0.25, 0.75));
const dir = A.avaliarEnquadramento(corpo(0.78, 0.75));
teste("corpo na esquerda da imagem fala", true, /sua esquerda/.test(esq.fala));
teste("corpo na direita da imagem fala", true, /sua direita/.test(dir.fala));
teste("e a seta pede mais x", "maisX", esq.seta);
teste("e a seta pede menos x", "menosX", dir.seta);

console.log("\n--- cortado no quadro vence o resto ---");
const cortado = corpo(0.5, 0.75);
cortado[27].y = 0.995; cortado[28].y = 0.995;
teste("pes na borda de baixo", "afaste", chave(cortado));
const cortadoCima = corpo(0.5, 0.75);
cortadoCima[11].y = 0.02; cortadoCima[12].y = 0.02; cortadoCima[0].y = -0.06;
teste("ombros na borda de cima", "afaste", chave(cortadoCima));

console.log("\n--- a faixa que e aceita ---");
[0.40, 0.5, 0.6].forEach((cx) => teste("centro em " + cx, "ok", chave(corpo(cx, 0.7))));
[0.5, 0.62, 0.74].forEach((a) => teste("altura " + a, "ok", chave(corpo(0.5, a))));
// Dos ombros aos pes ocupando 90% da tela significa cabeca cortada: acima dos
// ombros ainda tem cabeca, e ela nao cabe em 5%.
teste("ombros a pes em 85% da tela", "afaste", chave(corpo(0.5, 0.85)));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
