// O batimento em pedaços: o pegador da esteira só mede com as mãos nele. A
// média tem de sair do tempo medido (o buraco não vira dado), o salto
// impossível tem de ser descartado, um número solto não pode virar o pico, e
// o resultado tem de dizer quanto da série foi medido.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("// ---- Batimento em pedaços ----", "// ---- fim do batimento em pedaços") + "\nglobalThis.F = { criarLeituraFc };");
eval(pedaco("// ---- Odômetro da esteira ----", "// ---- fim do odômetro da esteira") + "\nglobalThis.O = { criarOdometroEsteira };");
eval(pedaco("// ---- Média do aparelho na série ----", "// ---- fim da média do aparelho") + "\nglobalThis.M = { criarMediaAparelho };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = JSON.stringify(esperado), b = JSON.stringify(obtido);
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(64) + b); }
  else { mal++; console.log("  X    " + nome.padEnd(64) + b + ", esperava " + a); }
}
// uma leitura por segundo, de t0 em diante
function ler(fc, lista, t0) { lista.forEach((b, k) => fc.ler(b, (t0 || 0) + k * 1000)); return fc; }

console.log("--- media pelo tempo medido ---");
{
  // 30 s com as mãos (140), 4 min sem nada, 30 s com as mãos (160)
  const fc = criar();
  ler(fc, Array(30).fill(140), 0);
  ler(fc, Array(30).fill(160), 270000);
  const r = fc.fechar(330);
  teste("o buraco de 4 min nao puxa a media (140 e 160 meio a meio)", 150, r.medio);
  teste("diz quanto foi medido: ~1 min de 330 s", 19, r.cob);
}
{
  const r = ler(criar(), Array(600).fill(150), 0).fechar(600);
  teste("serie medida inteira: cobertura 100%", 100, r.cob);
}

console.log("\n--- o que e ruido ---");
{
  const fc = criar();
  ler(fc, [140, 141, 142, 143], 0);
  teste("salto de 142 para 195 em 1 s e descartado", false, fc.ler(195, 4000));
  teste("depois de um tempo sem leitura, o valor novo vale", true, fc.ler(170, 30000));
}
{
  const fc = criar();
  teste("zero (sem as maos) nao e numero", false, fc.ler(0, 0));
  teste("acima de 225 nao e numero", false, fc.ler(250, 1000));
  teste("menos de 3 leituras nao vira media", null, ler(criar(), [140, 142], 0).fechar(60));
}

console.log("\n--- o pico ---");
{
  // um 178 solto no meio de 150s: nao e o pico do treino
  const r = ler(criar(), [150, 151, 150, 168, 151, 150, 152], 0).fechar(7);
  teste("um 168 solto no meio de 150 nao vira o pico", true, r.max < 160);
}
{
  // subindo de verdade ate 172
  const r = ler(criar(), [150, 155, 160, 165, 170, 172, 171, 169], 0).fechar(8);
  teste("pico de verdade aparece (mediana de tres)", 171, r.max);
  teste("o pico nunca e menor que a media", true, r.max >= r.medio);
}

console.log("\n--- o odometro da esteira (parar a esteira nao apaga o treino) ---");
{
  // 42 min caminhando; a esteira e parada e o painel volta a zero
  const o = O.criarOdometroEsteira();
  for (let s = 0; s <= 2520; s += 30) o.ler({ vel: 5, segundos: s, metros: Math.round(s * 5 / 3.6), kcal: Math.round(s / 10) }, s * 1000);
  const antes = o.total();
  o.ler({ vel: 0, segundos: 0, metros: 0, kcal: 0 }, 2521000);
  const depois = o.total();
  teste("o painel zerado nao apaga o tempo (42 min)", 2520, depois.seg);
  teste("nem a distancia", antes.m, depois.m);
  teste("nem as kcal", antes.kcal, depois.kcal);
  teste("e avisa que o painel reiniciou", 2521000, depois.reiniciouEm);
  o.ler({ vel: 5, segundos: 60, metros: 83, kcal: 6 }, 2581000);
  teste("religada, continua somando por cima", 2580, o.total().seg);
}
{
  // esteira que nao manda a distancia: soma pela velocidade
  const o = O.criarOdometroEsteira();
  for (let s = 0; s <= 600; s++) o.ler({ vel: 6, segundos: s }, s * 1000);
  teste("sem metros no pacote, 10 min a 6 km/h = 1000 m", 1000, o.total().m);
  teste("e diz que a distancia foi somada", false, o.total().mDoPainel);
}
{
  // a conexao some 2 min: o buraco nao vira distancia inteira
  const o = O.criarOdometroEsteira();
  o.ler({ vel: 6 }, 0); o.ler({ vel: 6 }, 120000);
  teste("lacuna de 2 min conta no maximo 5 s", 8, o.total().m);
}
{
  // o mesmo pacote lido em cada render nao soma duas vezes
  const o = O.criarOdometroEsteira(), d = { vel: 6 };
  o.ler({ vel: 6 }, 0); o.ler(d, 1000); o.ler(d, 2000); o.ler(d, 3000);
  teste("o mesmo pacote relido nao soma de novo", 2, o.total().m);
}
{
  const o = O.criarOdometroEsteira();
  o.ler({ segundos: 100 }, 0); o.ler({ segundos: 98 }, 1000);
  teste("recuo pequeno (pacote atrasado) nao e reinicio", 98, o.total().seg);
}

console.log("\n--- bicicleta, eliptico, remo: o que nao e esteira ---");
{
  // bicicleta sem relogio no painel: o tempo e o de pedal girando
  const o = O.criarOdometroEsteira();
  for (let s = 0; s <= 120; s++) o.ler({ cad: s < 60 || s > 90 ? 80 : 0, watts: 150 }, s * 1000);
  teste("sem relogio no painel, conta o tempo pedalando (watts > 0)", 120, o.total().seg);
  const o2 = O.criarOdometroEsteira();
  for (let s = 0; s <= 120; s++) o2.ler({ cad: s < 60 || s > 90 ? 80 : 0, watts: s < 60 || s > 90 ? 150 : 0 }, s * 1000);
  teste("parado do 60 ao 91 (pedal e watts em zero) nao conta", 89, o2.total().seg);
}
{
  const m = M.criarMediaAparelho();
  // 60 s a 200 W e 90 rpm, 30 s parado bebendo agua, 60 s a 100 W e 70 rpm
  for (let s = 0; s < 150; s++) {
    const p = s < 60 ? { watts: 200, cad: 90 } : s < 90 ? { watts: 0, cad: 0 } : { watts: 100, cad: 70 };
    m.ler(p, s * 1000);
  }
  teste("media de watts so do tempo em movimento", { watts: 150, cad: 80 }, m.fechar());
  const curta = M.criarMediaAparelho();
  for (let s = 0; s < 5; s++) curta.ler({ watts: 300 }, s * 1000);
  teste("menos de 10 s medidos nao vira numero", {}, curta.fechar());
  const mesmo = M.criarMediaAparelho(), d = { watts: 100 };
  mesmo.ler({ watts: 100 }, 0); for (let s = 1; s <= 30; s++) mesmo.ler(d, s * 1000);
  teste("o mesmo pacote relido nao soma de novo (so o 1o intervalo)", {}, mesmo.fechar());
}

function criar() { return F.criarLeituraFc(); }
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
