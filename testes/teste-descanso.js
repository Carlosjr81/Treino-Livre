// O descanso pela ciência: cada exercício do catálogo cai no tipo certo, e o
// descanso escrito na ficha vence sempre. Errar aqui manda alguém descansar
// 45 s no agachamento pesado, ou 3 min na rosca.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const iniEx = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(iniEx + "const EXERCICIOS = ".length, html.indexOf("\n];", iniEx) + 2));
eval(pedaco("const DESCANSO_CIENCIA = {", "\n};\n") + "\n};\n" +
  pedaco("const MUSC_GRANDES_DESCANSO", "// ---------------- FIM DO DESCANSO PELA CIÊNCIA") +
  "\nglobalThis.D = { tipoDescanso, descansoRecomendado, descansoDoItem, DESCANSO_CIENCIA };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(60) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const ex = (id) => EXERCICIOS.find((e) => e.id === id);
const tipo = (id) => D.tipoDescanso(ex(id));

console.log("--- cada tipo, nos exercícios que todo mundo faz ---");
teste("agachamento livre: básico pesado (3 min)", ["pesado", 180], [tipo("agachamento"), D.descansoRecomendado(ex("agachamento"))]);
teste("supino reto com barra: pesado", "pesado", tipo("supino-reto"));
teste("levantamento terra: pesado", "pesado", tipo("levantamento-terra"));
teste("leg press: vários músculos (2 min)", ["composto", 120], [tipo("leg-press"), D.descansoRecomendado(ex("leg-press"))]);
teste("puxada alta: vários músculos", "composto", tipo("puxada-frente"));
teste("supino com halteres: vários músculos", "composto", tipo("supino-halteres"));
teste("barra fixa: vários músculos (não é barra livre)", "composto", tipo("barra-fixa"));
teste("cadeira extensora: isolado grande (1:30)", ["isoladoGrande", 90], [tipo("cadeira-extensora"), D.descansoRecomendado(ex("cadeira-extensora"))]);
teste("crucifixo: isolado, mesmo com o ombro de ajudante", "isoladoGrande", tipo("crucifixo"));
teste("elevação lateral: isolado grande", "isoladoGrande", tipo("elevacao-lateral"));
teste("rosca direta: isolado pequeno (1:15)", ["isoladoPequeno", 75], [tipo("rosca-direta"), D.descansoRecomendado(ex("rosca-direta"))]);
teste("abdominal: core (1 min)", 60, D.descansoRecomendado(ex(EXERCICIOS.find((e) => e.grupo === "abdomen" && !e.tempo).id)));
teste("prancha: isometria (1 min)", ["isometria", 60], [tipo("prancha"), D.descansoRecomendado(ex("prancha"))]);
teste("burpee: funcional de fôlego (45 s)", ["funcional", 45], [tipo("burpee"), D.descansoRecomendado(ex("burpee"))]);
teste("flexão de braços: força, não fôlego", true, tipo("flexao") !== "funcional");
teste("esteira: aeróbico", "aerobico", tipo("esteira-corrida"));

console.log("\n--- o catálogo inteiro ---");
const semTipo = EXERCICIOS.filter((e) => !D.tipoDescanso(e)).map((e) => e.id);
teste("nenhum exercício fica sem descanso", [], semTipo);
const fora = EXERCICIOS.filter((e) => { const s = D.descansoRecomendado(e); return !(s >= 45 && s <= 180); }).map((e) => e.id);
teste("todos entre 45 s e 3 min", [], fora);
const pesadosPequenos = EXERCICIOS.filter((e) => D.tipoDescanso(e) === "pesado" && ["biceps", "triceps", "abdomen"].indexOf(e.grupo) >= 0).map((e) => e.id);
teste("braço e abdômen nunca são 'pesado'", [], pesadosPequenos);
const roscas = EXERCICIOS.filter((e) => /rosca/i.test(e.nome) && e.grupo === "biceps" && D.descansoRecomendado(e) > 90).map((e) => e.id);
teste("nenhuma rosca descansa mais de 1:30", [], roscas);
teste("todo tipo tem tempo, nome, exemplo e porquê", true, D.DESCANSO_CIENCIA.ordem.every((k) => {
  const d = D.DESCANSO_CIENCIA.tipos[k]; return d && d.seg > 0 && d.nome && d.ex && d.porque;
}));

console.log("\n--- quem manda ---");
teste("o descanso escrito na ficha vence a ciência", 45, D.descansoDoItem({ descanso: 45 }, ex("agachamento"), 90, "ciencia"));
teste("sem nada na ficha: a ciência", 180, D.descansoDoItem({}, ex("agachamento"), 90, "ciencia"));
teste("modo 'igual para todos': o geral", 90, D.descansoDoItem({}, ex("agachamento"), 90, "fixo"));
teste("exercício desconhecido: o geral", 100, D.descansoDoItem({}, null, 100, "ciencia"));
teste("exercício próprio sem músculos: isolado grande", 90, D.descansoDoItem({}, { id: "custom-x", grupo: "costas", nome: "Remada da academia" }, 60, "ciencia"));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
