// A tela inicial escolhe o treino de hoje: a ficha com o dia no nome, senão a
// que vem depois da última feita, senão a primeira. É a resposta a "o que eu
// faço hoje?" — errar aqui manda a pessoa treinar perna dois dias seguidos.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("const semAcento =", "\n\n") + "\n" +
  pedaco("// ---- O treino de hoje ----", "// ---- fim do treino de hoje") + "\nglobalThis.H = { fichaDeHoje };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(60) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const it = [{ exercicioId: "x" }];
const prog = [{ id: "p1", nome: "Avançado" }, { id: "p2", nome: "ABC" }];
const semana = ["Segunda - Pernas", "Terça - Peito", "Quarta - Costas", "Quinta - Ombros", "Sexta - Pernas", "Sábado - Braços"]
  .map((n, i) => ({ id: "s" + i, nome: n, programaId: "p1", itens: it }));
const abc = ["Treino A", "Treino B", "Treino C"].map((n, i) => ({ id: "a" + i, nome: n, programaId: "p2", itens: it }));
// 16/10/2026 é sexta; 13/10 é terça; 17/10 é sábado; 18/10 é domingo
const dia = (d) => new Date(2026, 9, d, 10, 0);

console.log("--- o dia no nome ---");
teste("sexta: a ficha da sexta", ["Sexta - Pernas", "Hoje é sexta."], (() => { const r = H.fichaDeHoje(prog, semana, [], dia(16)); return [r.ficha.nome, r.motivo]; })());
teste("terça, com acento no nome", "Terça - Peito", H.fichaDeHoje(prog, semana, [], dia(13)).ficha.nome);
teste("sábado, com acento no nome", ["Sábado - Braços", "Hoje é sábado."], (() => { const r = H.fichaDeHoje(prog, semana, [], dia(17)); return [r.ficha.nome, r.motivo]; })());
teste("domingo, sem ficha do dia: a primeira", "Segunda - Pernas", H.fichaDeHoje(prog, semana, [], dia(18)).ficha.nome);
// "Segundo treino" não é "segunda": a palavra tem de ser inteira
teste("'Segundo treino' não casa com segunda-feira", "A", H.fichaDeHoje([{ id: "p", nome: "x" }], [{ id: "1", nome: "A", programaId: "p", itens: it }, { id: "2", nome: "Segundo treino", programaId: "p", itens: it }], [], dia(12)).ficha.nome);

console.log("\n--- a vez da próxima (A, B, C) ---");
teste("sem histórico: a primeira, 'uma boa para começar'", ["Treino A", "Uma boa para começar."], (() => { const r = H.fichaDeHoje([prog[1]], abc, [], dia(16)); return [r.ficha.nome, r.motivo]; })());
teste("fez a A: agora a B", "Treino B", H.fichaDeHoje([prog[1]], abc, [{ nome: "Treino A" }], dia(16)).ficha.nome);
teste("fez a C: volta para a A", "Treino A", H.fichaDeHoje([prog[1]], abc, [{ nome: "Treino C" }], dia(16)).ficha.nome);
teste("o último foi uma corrida (não é ficha): a primeira", "Treino A", H.fichaDeHoje([prog[1]], abc, [{ nome: "Corrida na rua" }], dia(16)).ficha.nome);

console.log("\n--- casos de borda ---");
teste("ficha vazia não é sugerida", "Treino B", H.fichaDeHoje([prog[1]], [Object.assign({}, abc[0], { itens: [] }), abc[1]], [], dia(16)).ficha.nome);
teste("sem ficha nenhuma: nada", null, H.fichaDeHoje([], [], [], dia(16)));
teste("o dia vence a sequência", "Sexta - Pernas", H.fichaDeHoje(prog, semana.concat(abc), [{ nome: "Treino A" }], dia(16)).ficha.nome);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
