// O perfil de elevação e a rota colorida pelo ritmo.
//
// O que estes testes cobram:
//   1. O eixo do perfil é a DISTÂNCIA, não a contagem de pontos. Parado num
//      semáforo o GPS cospe dezenas de pontos no mesmo lugar, e um eixo por
//      ponto desenharia um platô enorme onde não houve caminho nenhum.
//   2. As faixas de cor saem do próprio percurso. 6:00/km é passeio para um
//      corredor e tiro para outro: faixa fixa deixaria um mapa de uma cor só.
//   3. Nada de inventar ritmo onde o GPS não mediu tempo.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("// ---------------- PERCURSO NA RUA (GPS)", "// ---------------- FIM DAS CONTAS DO PERCURSO") +
  "\nglobalThis.A = { perfilElevacao, trechosPorRitmo, CORES_RITMO, distanciaM, ROTA_CORDA_M };"
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

// Uma reta na Avenida Paulista, indo para o leste. 1 grau de longitude por ali
// vale uns 92,6 km; 0,0001 grau e uns 9,3 m.
const LAT = -23.5614, LNG0 = -46.6558;
function reta(n, opc) {
  const o = opc || {};
  const passoM = o.passoM || 15;        // metros entre pontos
  const msPorM = o.msPorM || 360;       // 6:00/km = 360 ms por metro
  const pts = [];
  let t = 1700000000000, lng = LNG0;
  // 1 grau de longitude nesta latitude: 111320 x cos(23,5614 graus) = 102054 m.
  // Com um valor chutado, "passos de 15 m" nao eram de 15 m e a conferencia da
  // distancia reprovava o codigo por culpa do gerador.
  const grausPorM = 1 / (111320 * Math.cos((LAT * Math.PI) / 180));
  for (let i = 0; i < n; i++) {
    pts.push({ lat: LAT, lng: lng, t: t, seg: 0, acc: 5, alt: o.alt ? o.alt(i, n) : null });
    lng += passoM * grausPorM;
    t += passoM * (typeof msPorM === "function" ? msPorM(i, n) : msPorM);
  }
  return pts;
}

console.log("--- o perfil de elevacao ---");
const subindo = reta(60, { alt: (i) => 700 + i * 2 });     // sobe 2 m por ponto
const pe = A.perfilElevacao(subindo);
teste("sai um perfil", true, !!pe);
teste("o minimo e o primeiro ponto", 700, pe.min);
teste("o maximo e o ultimo", 818, pe.max);
teste("a amplitude e a diferenca", 118, pe.amplitude);
teste("comeca em distancia zero", 0, pe.pontos[0].m);
teste("e termina na distancia total", pe.metros, pe.pontos[pe.pontos.length - 1].m, 0.01);
teste("a distancia bate com 59 passos de 15 m", 885, pe.metros, 12);

console.log("\n--- parado no semaforo nao vira plato ---");
// 20 pontos no MESMO lugar (o tremor do GPS parado), depois 40 andando
const parado = [];
let t0 = 1700000000000;
for (let i = 0; i < 20; i++) parado.push({ lat: LAT, lng: LNG0, t: t0 + i * 1000, seg: 0, acc: 5, alt: 700 });
const depois = reta(40, { alt: (i) => 700 + i * 3 });
depois.forEach((p, i) => parado.push(Object.assign({}, p, { t: t0 + 20000 + i * 5400 })));
const pp = A.perfilElevacao(parado);
// os 20 pontos parados ocupam 0 m, entao quase todo o grafico e o trecho andado
const naPrimeiraMetade = pp.pontos.filter((p) => p.m < pp.metros / 2).length;
teste("metade do grafico cobre metade do caminho", true, naPrimeiraMetade > pp.pontos.length * 0.4 && naPrimeiraMetade < pp.pontos.length * 0.6);
teste("e a altitude sobe de verdade", true, pp.max > pp.min + 100);

console.log("\n--- sem altitude, sem perfil ---");
teste("GPS sem altimetro nao inventa morro", null, A.perfilElevacao(reta(40)));
teste("um ponto so nao e perfil", null, A.perfilElevacao([{ lat: LAT, lng: LNG0, t: 1, seg: 0, alt: 700 }]));
teste("lista vazia", null, A.perfilElevacao([]));
teste("nao quebra com nulo", null, A.perfilElevacao(null));

console.log("\n--- o numero de pontos do grafico tem teto ---");
const longo = reta(900, { alt: (i) => 700 + Math.sin(i / 20) * 30 });
teste("reamostrado no teto pedido", 120, A.perfilElevacao(longo).pontos.length);
teste("e da para pedir menos", 40, A.perfilElevacao(longo, 40).pontos.length);

console.log("\n--- a rota colorida pelo ritmo ---");
// primeira metade a 6:00/km, segunda a 4:00/km (240 ms por metro)
const variado = reta(120, { msPorM: (i, n) => (i < n / 2 ? 360 : 240) });
const tr = A.trechosPorRitmo(variado);
teste("saiu trecho", true, tr.trechos.length > 10);
teste("cada trecho tem as duas pontas", true, tr.trechos.every((x) => x.de.length === 2 && x.ate.length === 2));
teste("nenhum trecho menor que a corda", true, tr.trechos.every((x) => x.m >= A.ROTA_CORDA_M));
teste("cinco faixas de cor", 5, tr.faixas.length);
const rapidos = tr.trechos.filter((x) => x.ritmo < 5);
const lentos = tr.trechos.filter((x) => x.ritmo > 5);
teste("os dois ritmos apareceram", true, rapidos.length > 3 && lentos.length > 3);
teste("os rapidos ficam nas faixas de cima", true, Math.max.apply(null, rapidos.map((x) => x.faixa)) <= 1);
// Com dois ritmos no percurso, duas cores é o certo — exigir as cinco seria
// pedir ao mapa que inventasse variação que não houve. O que importa é a
// separação: todo trecho lento mais abaixo que todo trecho rápido.
teste("todo lento fica abaixo de todo rapido", true,
  Math.min.apply(null, lentos.map((x) => x.faixa)) > Math.max.apply(null, rapidos.map((x) => x.faixa)));

console.log("\n--- as faixas saem do proprio percurso ---");
// um percurso inteiro a 6:00/km nao pode sair todo da mesma cor
const uniforme = A.trechosPorRitmo(reta(120, { msPorM: (i) => 360 + (i % 7) * 12 }));
const faixasUsadas = new Set(uniforme.trechos.map((x) => x.faixa));
teste("um percurso de ritmo parecido ainda usa varias cores", true, faixasUsadas.size >= 3);
// A propriedade que importa: a cor nao depende de quao rapido a pessoa e. O
// mesmo percurso, corrido a metade da velocidade, tem de sair com exatamente o
// mesmo desenho de cores — senao o corredor lento veria um mapa de uma cor so.
const perfil = (i, n) => (i < n / 2 ? 360 : 300);
const rapidao = A.trechosPorRitmo(reta(120, { msPorM: perfil }));
const devagar = A.trechosPorRitmo(reta(120, { msPorM: (i, n) => perfil(i, n) * 2 }));
teste("a cor nao depende de quao rapido a pessoa e",
  rapidao.trechos.map((x) => x.faixa), devagar.trechos.map((x) => x.faixa));
teste("e o lento e de verdade mais lento", true,
  devagar.trechos[0].ritmo > rapidao.trechos[0].ritmo * 1.9);

console.log("\n--- nada de ritmo inventado ---");
teste("sem pontos, sem trecho", 0, A.trechosPorRitmo([]).trechos.length);
teste("nem com um ponto so", 0, A.trechosPorRitmo([{ lat: LAT, lng: LNG0, t: 1, seg: 0 }]).trechos.length);
// dois segmentos separados nao se ligam por uma linha reta inventada
const doisSegs = reta(40).concat(reta(40).map((p) => Object.assign({}, p, { seg: 1, lng: p.lng + 0.01 })));
const ts = A.trechosPorRitmo(doisSegs);
teste("trecho nao atravessa a emenda de dois segmentos", true,
  ts.trechos.every((x) => Math.abs(x.de[1] - x.ate[1]) < 0.005));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
