// O músculo que você parou de treinar.
//
// O que este teste cobra, em ordem de importância:
//   1. Que a régua seja o ritmo DA PESSOA, e não uma tabela. A prova é a
//      invariância: quem treina a cada 3 dias e quem treina a cada 10, cada
//      um no próprio ritmo, têm de sair os dois "em dia" — e os dois têm de
//      sair "parou" quando dobram o próprio intervalo três vezes.
//   2. Que "nunca treinou" não se misture com "parou": um é hábito que nunca
//      existiu, o outro é hábito perdido, e só o segundo é um alerta.
//   3. Que aeróbico não conte como treino de grupo muscular.
//   4. Que a mediana segure uma viagem de três semanas no meio do histórico.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("function diaStr(x)", "function calcularEstatisticas") +
  pedaco("const GRUPOS = [", "const MUSCULOS") +
  pedaco("// ---- O músculo que você parou de treinar ----", "// ---------------- FIM DAS CONTAS DO ESQUECIMENTO") +
  "\nglobalThis.E = { musculosEsquecidos, GRUPOS, RITMO_PADRAO_GRUPO, TETO_PAROU_DIAS };"
);
const E = globalThis.E;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(54) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(54) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

const HOJE = new Date(2026, 9, 21, 15, 30);
const atras = (n) => { const d = new Date(HOJE); d.setDate(d.getDate() - n); d.setHours(9, 0, 0, 0); return d.getTime(); };

// um catálogo de mentira, só com o que a função olha
const EX = {
  supino: { grupo: "peito" }, remada: { grupo: "costas" }, agacho: { grupo: "pernas" },
  rosca: { grupo: "biceps" }, esteira: { grupo: "pernas", cardio: "corrida" },
};
const exPorId = (id) => EX[id] || null;

// treinos nos dias indicados (contados para trás a partir de hoje)
const treinos = (exId, dias) => dias.map((d, i) => ({
  id: exId + i, nome: "t", data: atras(d), duracaoMin: 60, itens: [{ exercicioId: exId, series: [] }],
}));
const achar = (r, id) => r.filter((g) => g.id === id)[0];

console.log("--- 1. a regua e o ritmo da pessoa ---");
{
  // Quem treina peito a cada 3 dias e está há 4 sem treinar: em dia.
  // Quem treina costas a cada 10 dias e está há 11: também em dia.
  // Uma tabela fixa em "7 dias" reprovaria o segundo e aprovaria o primeiro
  // aos 6 — que para ele já é o dobro do normal.
  const h = treinos("supino", [4, 7, 10, 13, 16, 19])
    .concat(treinos("remada", [11, 21, 31, 41]));
  const r = E.musculosEsquecidos(h, exPorId, HOJE);
  teste("peito a cada 3 dias, ha 4: em dia", "emDia", achar(r, "peito").estado);
  teste("e o ritmo medido e 3", 3, achar(r, "peito").ritmo);
  teste("costas a cada 10 dias, ha 11: em dia", "emDia", achar(r, "costas").estado);
  teste("e o ritmo medido e 10", 10, achar(r, "costas").ritmo);
}

console.log("");
console.log("--- 2. e cada um some no proprio ritmo ---");
{
  // 3 dias de ritmo, 10 sem treinar = mais de 3× → parou
  const rapido = E.musculosEsquecidos(treinos("supino", [10, 13, 16, 19, 22, 25]), exPorId, HOJE);
  teste("ritmo de 3, ha 10 dias: parou", "parou", achar(rapido, "peito").estado);

  // 3 dias de ritmo, 6 sem treinar = 2× → sumindo
  const meio = E.musculosEsquecidos(treinos("supino", [6, 9, 12, 15, 18]), exPorId, HOJE);
  teste("ritmo de 3, ha 6 dias: sumindo", "sumindo", achar(meio, "peito").estado);

  // 10 dias de ritmo, 20 sem treinar = 2× → sumindo (e NAO parou)
  const lento = E.musculosEsquecidos(treinos("remada", [20, 30, 40, 50]), exPorId, HOJE);
  teste("ritmo de 10, ha 20 dias: sumindo", "sumindo", achar(lento, "costas").estado);
}

console.log("");
console.log("--- 3. o teto de tres semanas vence qualquer ritmo ---");
{
  // Ritmo de 15 dias, parado há 30: 2× o ritmo diria "sumindo", mas um mês
  // sem treinar um grupo é parar, e o teto existe para dizer isso.
  const r = E.musculosEsquecidos(treinos("remada", [30, 45, 60, 75]), exPorId, HOJE);
  teste("ritmo de 15, ha 30 dias: parou", "parou", achar(r, "costas").estado);
  teste("o teto e 21 dias", 21, E.TETO_PAROU_DIAS);
}

console.log("");
console.log("--- 4. sem ritmo medido, vale uma semana ---");
{
  // Duas sessões dão um vão só, que não é mediana de nada.
  const r = E.musculosEsquecidos(treinos("supino", [10, 12]), exPorId, HOJE);
  teste("duas sessoes: sem ritmo", null, achar(r, "peito").ritmo);
  teste("o padrao e 7 dias", 7, E.RITMO_PADRAO_GRUPO);

  // 10 dias sobre régua de 7 é 1,43×: ainda é a vida acontecendo, não um
  // hábito perdido. Avisar aqui seria gastar o alerta com quem só atrasou.
  teste("ha 10 dias, sem ritmo: em dia", "emDia", achar(r, "peito").estado);

  const tarde = E.musculosEsquecidos(treinos("supino", [13, 15]), exPorId, HOJE);
  teste("ha 13 dias (quase o dobro): sumindo", "sumindo", achar(tarde, "peito").estado);

  const muito = E.musculosEsquecidos(treinos("supino", [25, 27]), exPorId, HOJE);
  teste("ha 25 dias: parou", "parou", achar(muito, "peito").estado);

  const recente = E.musculosEsquecidos(treinos("supino", [3, 6]), exPorId, HOJE);
  teste("ha 3 dias, sem ritmo: em dia", "emDia", achar(recente, "peito").estado);
}

console.log("");
console.log("--- 5. nunca treinou nao e ter parado ---");
{
  const r = E.musculosEsquecidos(treinos("supino", [2, 5, 8, 11]), exPorId, HOJE);
  teste("biceps nunca treinado", "nunca", achar(r, "biceps").estado);
  teste("e sem dias", null, achar(r, "biceps").dias);
  teste("e sem vezes", 0, achar(r, "biceps").vezes);
  // e vem DEPOIS de quem parou, na ordem
  const ordem = r.map((g) => g.estado);
  const primeiroNunca = ordem.indexOf("nunca");
  const ultimoOutro = ordem.map((e, i) => (e === "nunca" ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
  teste("nunca treinado vem por ultimo", true, primeiroNunca > ultimoOutro);
}

console.log("");
console.log("--- 6. aerobico nao e treino de grupo muscular ---");
{
  // 30 min de esteira todo dia não podem dizer que a perna está em dia:
  // é a mesma regra do seriesSemanaisPorGrupo.
  const h = treinos("esteira", [0, 1, 2, 3, 4, 5]).concat(treinos("supino", [1, 4, 7]));
  const r = E.musculosEsquecidos(h, exPorId, HOJE);
  teste("perna so com esteira: nunca treinada", "nunca", achar(r, "pernas").estado);
}

console.log("");
console.log("--- 7. a mediana segura a viagem de tres semanas ---");
{
  // Ritmo de 3 dias, com um buraco de 21 no meio (férias). A média dos vãos
  // daria 6 e afrouxaria a régua; a mediana continua em 3.
  const dias = [3, 6, 9, 12, 33, 36, 39, 42];
  const r = E.musculosEsquecidos(treinos("supino", dias), exPorId, HOJE);
  teste("o ritmo continua 3, nao 6", 3, achar(r, "peito").ritmo);
  teste("e ha 3 dias: em dia", "emDia", achar(r, "peito").estado);
}

console.log("");
console.log("--- 8. dois exercicios no mesmo dia sao um dia so ---");
{
  const h = [{ id: "a", nome: "t", data: atras(5), duracaoMin: 60,
    itens: [{ exercicioId: "supino", series: [] }, { exercicioId: "supino", series: [] }] }]
    .concat(treinos("supino", [8, 11, 14]));
  const r = E.musculosEsquecidos(h, exPorId, HOJE);
  teste("4 dias distintos, nao 5", 4, achar(r, "peito").vezes);
  teste("e o ritmo e 3", 3, achar(r, "peito").ritmo);
}

console.log("");
console.log("--- 9. historico vazio nao quebra ---");
{
  const r = E.musculosEsquecidos([], exPorId, HOJE);
  teste("todos os grupos aparecem", E.GRUPOS.length, r.length);
  teste("e todos como nunca", true, r.every((g) => g.estado === "nunca"));
}

console.log("");
console.log("--- 10. treino de hoje conta zero dias ---");
{
  const r = E.musculosEsquecidos(treinos("supino", [0, 3, 6, 9]), exPorId, HOJE);
  teste("treinou hoje: 0 dias", 0, achar(r, "peito").dias);
  teste("e em dia", "emDia", achar(r, "peito").estado);
}

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
