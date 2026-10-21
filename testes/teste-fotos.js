// As duas contas do "antes e depois".
//
// A imagem não tem como ser testada aqui; o que dá — e é o que pode mentir —
// são os dois números embaixo dela:
//   1. Quanto tempo passou entre as fotos. Dividir a diferença por 30 erra
//      uma semana por semestre, e "8 meses" quando foram 7 é o tipo de erro
//      que ninguém confere e todo mundo repete por aí.
//   2. Qual era o peso em cada foto. Ninguém se pesa no dia da foto, então há
//      uma janela — e pegar a pesagem de dois meses depois e chamá-la de "o
//      peso da foto" seria inventar um resultado que não aconteceu ali.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("function plural(n, singular, pluralTxt)", "function linhasStoryTreino") +
  pedaco("// ---- O antes e depois ----", "// ---------------- FIM DAS CONTAS DO ANTES E DEPOIS") +
  "\nglobalThis.F = { textoIntervalo, pesoPerto };"
);
const F = globalThis.F;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(50) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(50) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

const d = (a, m, dia) => new Date(a, m - 1, dia, 10, 0, 0).getTime();
const entre = (a, b) => F.textoIntervalo(a, b);

console.log("--- 1. os dias ---");
teste("a mesma data", "no mesmo dia", entre(d(2026, 3, 10), d(2026, 3, 10)));
teste("um dia", "1 dia", entre(d(2026, 3, 10), d(2026, 3, 11)));
teste("quarenta e quatro dias", "44 dias", entre(d(2026, 1, 1), d(2026, 2, 14)));

console.log("");
console.log("--- 2. os meses, pelas datas e nao por divisao ---");
// 15/jan a 15/mar são 59 dias. Por um corte em "menos de 60 dias vira dias",
// dois meses cravados sairiam como "59 dias" — que não é como ninguém conta.
teste("dois meses cravados", "2 meses", entre(d(2026, 1, 15), d(2026, 3, 15)));
teste("e 1/jan a 1/mar tambem", "2 meses", entre(d(2026, 1, 1), d(2026, 3, 1)));
teste("quarenta e cinco dias ja vira mes", "1 mês e 14 dias", entre(d(2026, 1, 1), d(2026, 2, 15)));
teste("dois meses e tres dias", "2 meses e 3 dias", entre(d(2026, 1, 15), d(2026, 3, 18)));
teste("um ano", "12 meses", entre(d(2025, 5, 4), d(2026, 5, 4)));
teste("um ano e meio", "18 meses", entre(d(2025, 1, 10), d(2026, 7, 10)));

console.log("");
console.log("--- 3. o fim de mes, que e onde a conta erra ---");
// 31/ago + 2 meses cairia em 31/out, depois de 30/out: tem de voltar um mês
// em vez de afirmar "2 meses" num intervalo que ainda não fechou.
teste("31/ago a 30/out nao vira 2 meses", "1 mês e 29 dias", entre(d(2025, 8, 31), d(2025, 10, 30)));
teste("31/ago a 31/out sao 2 meses", "2 meses", entre(d(2025, 8, 31), d(2025, 10, 31)));
teste("31/jan a 31/mar sao 2 meses", "2 meses", entre(d(2026, 1, 31), d(2026, 3, 31)));
// ano bissexto: 2024 teve 29 de fevereiro
teste("29/fev existe e nao quebra", "3 meses", entre(d(2024, 2, 29), d(2024, 5, 29)));

console.log("");
console.log("--- 4. a ordem nao importa ---");
teste("invertido da o mesmo", entre(d(2026, 1, 15), d(2026, 3, 18)), entre(d(2026, 3, 18), d(2026, 1, 15)));
teste("e a hora do dia nao conta", "1 dia",
  F.textoIntervalo(new Date(2026, 2, 10, 23, 50).getTime(), new Date(2026, 2, 11, 0, 10).getTime()));

console.log("");
console.log("--- 5. o peso perto da foto ---");
{
  const medidas = [
    { id: "a", data: d(2026, 1, 5), peso: 82.4 },
    { id: "b", data: d(2026, 1, 20), peso: 81.1 },
    { id: "c", data: d(2026, 6, 10), peso: 76.3 },
    { id: "d", data: d(2026, 8, 1) },            // pesagem só de medidas, sem peso
  ];
  teste("no dia exato", 82.4, F.pesoPerto(medidas, d(2026, 1, 5)));
  teste("tres dias depois pega a mais perto", 81.1, F.pesoPerto(medidas, d(2026, 1, 23)));
  teste("no meio, vence a mais proxima", 81.1, F.pesoPerto(medidas, d(2026, 1, 16)));
  // 40 dias de distância: inventar um peso aí seria dizer que a foto de
  // fevereiro mostra o corpo de 76 kg de junho
  teste("fora da janela nao inventa", null, F.pesoPerto(medidas, d(2026, 3, 20)));
  teste("medida sem peso e ignorada", null, F.pesoPerto(medidas, d(2026, 8, 1)));
  teste("janela maior alcanca", 76.3, F.pesoPerto(medidas, d(2026, 7, 1), 30));
  teste("sem medidas", null, F.pesoPerto([], d(2026, 1, 5)));
  teste("medidas ausentes nao quebram", null, F.pesoPerto(undefined, d(2026, 1, 5)));
  teste("peso zero conta como sem peso", null, F.pesoPerto([{ id: "z", data: d(2026, 1, 5), peso: 0 }], d(2026, 1, 5)));
}

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
