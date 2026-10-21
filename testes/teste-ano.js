// O mapa dos últimos 12 meses.
//
// O que este teste cobra, em ordem de importância:
//   1. Que dia treinado NUNCA saia como dia vazio, e vice-versa. É a única
//      coisa que o mapa afirma; errar isso é mostrar um buraco que não houve
//      (ou esconder um que houve), que é justamente o que ele existe para
//      revelar.
//   2. Que a régua seja dos quantis de quem treina, e não uma tabela fixa.
//      A prova é a invariância: a mesma rotina feita em metade do tempo tem
//      de sair com EXATAMENTE o mesmo desenho. É a mesma regra do mapa do
//      percurso pintado por ritmo.
//   3. Que a sequência conte dias seguidos de verdade.
//   4. Que a grade comece na segunda e não invente dia no futuro.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("function diaStr(x)", "function calcularEstatisticas") +
  pedaco("// ---- O ano de treino ----", "// ---------------- FIM DAS CONTAS DO ANO") +
  "\nglobalThis.A = { contarAnoDeTreino, MESES };"
);
const A = globalThis.A;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(54) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(54) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

// Uma quarta-feira qualquer, fixa: o mapa não pode depender de quando o teste roda.
const HOJE = new Date(2026, 9, 21, 15, 30);
const diaAtras = (n) => { const d = new Date(HOJE); d.setDate(d.getDate() - n); d.setHours(9, 0, 0, 0); return d.getTime(); };
const treino = (n, min) => ({ id: "t" + n, nome: "x", data: diaAtras(n), duracaoMin: min, itens: [] });

// achatar a grade em pares dia->nivel, para olhar sem depender do formato
function porData(r) {
  const m = {};
  r.semanas.forEach((col) => col.forEach((c) => { if (c) m[diaStr(c.dia)] = c.nivel; }));
  return m;
}
function desenho(r) {
  return r.semanas.map((col) => col.map((c) => (c ? c.nivel : "-")).join("")).join("|");
}

console.log("--- 1. dia treinado e dia vazio, que e o que o mapa afirma ---");
{
  const h = [treino(0, 60), treino(3, 45), treino(10, 90)];
  const r = A.contarAnoDeTreino(h, HOJE);
  const m = porData(r);
  teste("hoje treinou: nivel > 0", true, m[diaStr(new Date(diaAtras(0)))] > 0);
  teste("3 dias atras treinou", true, m[diaStr(new Date(diaAtras(3)))] > 0);
  teste("10 dias atras treinou", true, m[diaStr(new Date(diaAtras(10)))] > 0);
  teste("1 dia atras NAO treinou", 0, m[diaStr(new Date(diaAtras(1)))]);
  teste("5 dias atras NAO treinou", 0, m[diaStr(new Date(diaAtras(5)))]);
  teste("a conta de dias bate", 3, r.dias);
  // nenhum dia pintado sem treino, em lugar nenhum da grade
  const pintadosSemTreino = Object.keys(m).filter((k) => m[k] > 0).length;
  teste("so os 3 dias tem cor", 3, pintadosSemTreino);
}

console.log("");
console.log("--- 2. treino sem duracao registrada ainda pinta o dia ---");
{
  // Histórico antigo e aula interrompida chegam sem `duracaoMin`. Sem o piso
  // de 1 minuto o dia sairia como dia vazio: o mapa diria que a pessoa não
  // treinou num dia em que ela treinou.
  const r = A.contarAnoDeTreino([{ id: "a", nome: "x", data: diaAtras(2), itens: [] }], HOJE);
  teste("sem duracaoMin, o dia conta", 1, r.dias);
  teste("e tem cor", true, porData(r)[diaStr(new Date(diaAtras(2)))] > 0);
}

console.log("");
console.log("--- 3. a regua e da pessoa: a invariancia ---");
{
  // A MESMA rotina, uma pessoa treinando o dobro do tempo da outra. Se a
  // régua fosse fixa em minutos, a de 20 min sairia toda clara e a de 40
  // toda escura. Sendo quantil, o desenho tem de ser idêntico.
  const dias = [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 25, 30];
  const mins = [20, 25, 30, 35, 40, 45, 22, 28, 33, 38, 43, 48];
  const curta = dias.map((d, i) => treino(d, mins[i]));
  const longa = dias.map((d, i) => treino(d, mins[i] * 2));
  const dobro = dias.map((d, i) => treino(d, mins[i] * 10));
  teste("metade do tempo, mesmo desenho", desenho(A.contarAnoDeTreino(curta, HOJE)), desenho(A.contarAnoDeTreino(longa, HOJE)));
  teste("dez vezes o tempo, mesmo desenho", desenho(A.contarAnoDeTreino(curta, HOJE)), desenho(A.contarAnoDeTreino(dobro, HOJE)));
  // e a escala de fato usa os quatro niveis, senao a invariancia seria trivial
  const niveis = {};
  Object.keys(porData(A.contarAnoDeTreino(curta, HOJE))).forEach((k) => { niveis[porData(A.contarAnoDeTreino(curta, HOJE))[k]] = true; });
  teste("usa mais de um nivel de cor", true, Object.keys(niveis).filter((n) => n !== "0").length > 1);
}

console.log("");
console.log("--- 4. dois treinos no mesmo dia somam ---");
{
  const manha = { id: "m", nome: "x", data: diaAtras(1), duracaoMin: 30, itens: [] };
  const noite = { id: "n", nome: "y", data: diaAtras(1) + 10 * 3600 * 1000, duracaoMin: 30, itens: [] };
  const r = A.contarAnoDeTreino([manha, noite, treino(5, 31)], HOJE);
  teste("dois treinos num dia sao UM dia", 2, r.dias);
  // 60 min contra 31: o dia de dois treinos tem de ser o mais forte
  const m = porData(r);
  teste("e o dia dobrado e o mais escuro", true, m[diaStr(new Date(diaAtras(1)))] > m[diaStr(new Date(diaAtras(5)))]);
}

console.log("");
console.log("--- 5. a sequencia ---");
{
  const seguidos = [0, 1, 2, 3, 4].map((n) => treino(n, 50));
  teste("5 dias seguidos", 5, A.contarAnoDeTreino(seguidos, HOJE).maior);

  const comBuraco = [0, 1, 2, 4, 5].map((n) => treino(n, 50));
  teste("buraco quebra: a maior e 3", 3, A.contarAnoDeTreino(comBuraco, HOJE).maior);

  teste("sem treino nenhum, sequencia 0", 0, A.contarAnoDeTreino([], HOJE).maior);
  teste("um treino so, sequencia 1", 1, A.contarAnoDeTreino([treino(3, 50)], HOJE).maior);

  // a maior é a maior, não a mais recente
  const antigaMaior = [20, 21, 22, 23, 24, 25, 26].map((n) => treino(n, 50)).concat([treino(0, 50), treino(1, 50)]);
  teste("vale a maior, nao a ultima", 7, A.contarAnoDeTreino(antigaMaior, HOJE).maior);
}

console.log("");
console.log("--- 6. a grade ---");
{
  const r = A.contarAnoDeTreino([treino(0, 60)], HOJE);
  // toda coluna tem 7 casas
  teste("toda semana tem 7 dias", true, r.semanas.every((c) => c.length === 7));
  teste("cabe o ano inteiro", true, r.semanas.length >= 52 && r.semanas.length <= 54);

  // a primeira casa da primeira coluna e uma segunda-feira
  const primeiro = r.semanas[0][0].dia;
  teste("a grade comeca numa segunda", 1, primeiro.getDay());

  // nada depois de hoje: o futuro entra como casa vazia, nunca como dia
  const ultima = r.semanas[r.semanas.length - 1];
  const depoisDeHoje = ultima.filter((c) => c && c.dia > HOJE).length;
  teste("nenhum dia no futuro", 0, depoisDeHoje);

  // hoje esta na grade
  teste("hoje esta no mapa", true, Object.keys(porData(r)).indexOf(diaStr(HOJE)) >= 0);
}

console.log("");
console.log("--- 7. treino velho demais fica de fora ---");
{
  const r = A.contarAnoDeTreino([treino(0, 60), treino(400, 60), treino(5000, 60)], HOJE);
  teste("so o de dentro dos 12 meses conta", 1, r.dias);
}

console.log("");
console.log("--- 8. os rotulos de mes ---");
{
  const r = A.contarAnoDeTreino([treino(0, 60)], HOJE);
  const nomes = r.rotulos.filter((x) => x);
  teste("um rotulo por coluna", true, r.rotulos.length === r.semanas.length);
  teste("12 ou 13 meses nomeados", true, nomes.length >= 12 && nomes.length <= 13);
  teste("todos sao nomes de mes", true, nomes.every((n) => A.MESES.indexOf(n) >= 0));
  // nunca o mesmo mês duas colunas seguidas
  const repetido = r.rotulos.some((n, i) => n && i > 0 && r.rotulos[i - 1] === n);
  teste("nenhum mes repetido em seguida", false, repetido);
}

console.log("");
console.log("--- 9. historico vazio nao quebra ---");
{
  const r = A.contarAnoDeTreino([], HOJE);
  teste("desenha a grade mesmo vazia", true, r.semanas.length > 50);
  teste("zero dias", 0, r.dias);
  teste("nenhuma casa com cor", 0, Object.keys(porData(r)).filter((k) => porData(r)[k] > 0).length);
}

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
