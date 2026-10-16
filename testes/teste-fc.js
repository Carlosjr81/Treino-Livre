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

function criar() { return F.criarLeituraFc(); }
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
