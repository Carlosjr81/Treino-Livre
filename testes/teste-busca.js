// A busca de exercícios: quem procura pensa no músculo, no apelido da academia
// ou no aparelho, não no nome do catálogo. O caso que deu origem: "ombros" não
// trazia o desenvolvimento no Smith. E o outro lado, que importa tanto quanto:
// a busca tem de continuar precisa — "ombro" não pode trazer o supino.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const ini = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(ini + "const EXERCICIOS = ".length, html.indexOf("\n];", ini) + 2));
eval(pedaco("const semAcento =", "\n\n") + "\n" +
  pedaco("const APELIDOS_EXERCICIO = [", "\n];") + "\n];\n" +
  pedaco("// ---- A busca de exercícios ----", "// ---- fim da busca de exercícios") +
  "\nglobalThis.B = { buscarExercicios };");

let ok = 0, mal = 0;
function teste(nome, cond, extra) {
  if (cond) { ok++; console.log("  ok   " + nome); }
  else { mal++; console.log("  X    " + nome + (extra ? "  -> " + extra : "")); }
}
const ids = (txt) => B.buscarExercicios(EXERCICIOS, txt).map((e) => e.id);
const tem = (txt, id) => ids(txt).includes(id);
const grupoDe = (id) => EXERCICIOS.find((e) => e.id === id).grupo;

console.log("--- o caso do dono ---");
teste("'ombros' traz o desenvolvimento no Smith", tem("ombros", "desenvolvimento-smith"));
teste("'ombro' (singular) também", tem("ombro", "desenvolvimento-smith"));
teste("'Ombros' com maiúscula também", tem("Ombros", "desenvolvimento-smith"));
teste("'omb' enquanto digita já traz", tem("omb", "desenvolvimento-smith"));
teste("'ombro' traz todo exercício do grupo ombros",
  EXERCICIOS.filter((e) => e.grupo === "ombros").every((e) => tem("ombro", e.id)));

console.log("\n--- precisa ---");
teste("'ombro' NÃO traz o supino (ombro é secundário ali)", !tem("ombro", "supino-reto"));
teste("'ombro' só traz exercício de ombro (grupo ou músculo principal)",
  ids("ombro").every((id) => { const e = EXERCICIOS.find((x) => x.id === id);
    return e.grupo === "ombros" || ((e.musc && e.musc.p) || []).includes("ombros") || /ombro/i.test(e.nome); }),
  ids("ombro").filter((id) => grupoDe(id) !== "ombros").join(","));
teste("'ombro smith': só os de ombro no Smith", ids("ombro smith").length > 0 &&
  ids("ombro smith").every((id) => grupoDe(id) === "ombros"), ids("ombro smith").join(","));
teste("'ombro smith' traz o desenvolvimento no Smith", tem("ombro smith", "desenvolvimento-smith"));
teste("'peito halter' não traz exercício de perna", ids("peito halter").every((id) => grupoDe(id) !== "pernas") && ids("peito halter").includes("supino-halteres"),
  ids("peito halter").join(","));
teste("palavra que não existe não traz nada", ids("xyzabc").length === 0);
teste("'tríceps' com acento traz tríceps na polia", tem("tríceps", "triceps-polia"));

console.log("\n--- a ordem: quem tem a palavra no nome vem primeiro ---");
teste("'desenvolvimento': o 1º tem 'Desenvolvimento' no nome", /^desenvolvimento/i.test(B.buscarExercicios(EXERCICIOS, "desenvolvimento")[0].nome));
teste("'ombro': quem tem ombro no nome não fica atrás de quem não tem",
  (() => { const l = B.buscarExercicios(EXERCICIOS, "ombro"); const i = l.findIndex((e) => !/ombro/i.test(e.nome));
    return i < 0 || l.slice(i).every((e) => !/ombro/i.test(e.nome)); })());
teste("'supino' primeiro é um supino", /^supino/i.test(B.buscarExercicios(EXERCICIOS, "supino")[0].nome));

console.log("\n--- o jeito da academia ---");
teste("'perna' traz o leg press", tem("perna", "leg-press"));
teste("'perna' traz também glúteo (dia de perna)", tem("perna", "ponte-gluteo"));
teste("'perna': o de perna vem antes do de glúteo",
  ids("perna").indexOf("leg-press") < ids("perna").indexOf("ponte-gluteo"));
teste("'braço' traz rosca e tríceps", tem("braço", "rosca-direta") && tem("braço", "triceps-polia"));
teste("'barriga' traz a prancha", tem("barriga", "prancha"));
teste("'bumbum' traz a elevação pélvica com halter", tem("bumbum", "elevacao-pelvica-halter"));
teste("'posterior' traz a mesa flexora", tem("posterior", "mesa-flexora"));
teste("'gêmeos' traz a panturrilha", tem("gêmeos", "panturrilha"));
teste("'voador' (apelido) traz o peck deck", tem("voador", "peck-deck"));
teste("'halteres' traz exercício com halter", ids("halteres").length > 5);
teste("'aeróbico' traz a esteira", tem("aeróbico", "esteira-corrida"));
teste("'trapézio' traz o encolhimento", tem("trapézio", "encolhimento"));

console.log("\n--- texto vazio ---");
teste("sem texto: a lista inteira", ids("").length === EXERCICIOS.length);
teste("só palavras vazias ('de'): nada", ids("de").length === 0);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
