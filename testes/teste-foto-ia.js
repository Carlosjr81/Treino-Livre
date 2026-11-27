// A foto do resumo: os filtros feitos no aparelho e a edição pela IA, com o
// crivo do pedido escrito (2026-11-28d). O corpo e o rosto ficam como estão,
// nada de nudez, e as regras vão em toda edição.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("const FILTROS_FOTO = [", "function aplicarFiltroFoto") + pedaco("const EDICOES_FOTO_IA = [", "const MODELOS_IMAGEM_IA") +
  "\nglobalThis.P = { FILTROS_FOTO, filtroFotoPorId, EDICOES_FOTO_IA, REGRAS_EDICAO_IA, pedidoEdicaoBarrado };");
let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
teste("o primeiro filtro é a original, sem efeito", ["original", "none"], [P.FILTROS_FOTO[0].id, P.FILTROS_FOTO[0].css]);
teste("filtro que não existe volta à original", "original", P.filtroFotoPorId("xyz").id);
teste("nenhum id de filtro repetido", true, new Set(P.FILTROS_FOTO.map((f) => f.id)).size === P.FILTROS_FOTO.length);
teste("as regras barram elementos de franquia", true, /franquias existentes/.test(P.REGRAS_EDICAO_IA));
teste("as regras mandam manter rosto e corpo, sem famosos e sem nudez", true,
  /rosto/.test(P.REGRAS_EDICAO_IA) && /forma do corpo/.test(P.REGRAS_EDICAO_IA) && /real ou famosa/.test(P.REGRAS_EDICAO_IA) && /nudez/.test(P.REGRAS_EDICAO_IA));
const todos = [].concat.apply([], P.EDICOES_FOTO_IA.map((g) => g.itens));
teste("nenhuma edição pronta pede para mudar o corpo", [], todos.filter((x) => P.pedidoEdicaoBarrado(x.pede)).map((x) => x.id));
teste("nenhuma edição pronta cita marca ou personagem", [], todos.filter((x) => /marvel|dc |nike|adidas|superman|batman|homem-aranha|goku|minecraft|gta|grand theft|star wars|jedi|sabre de luz|simpson|darth|vader|creeper/i.test(x.pede)).map((x) => x.id));
teste("ambiente e item passam", "", P.pedidoEdicaoBarrado("me coloque num ringue de boxe levantando peso"));
teste("mudar o corpo não passa", true, !!P.pedidoEdicaoBarrado("me deixa mais musculoso"));
teste("emagrecer não passa", true, !!P.pedidoEdicaoBarrado("quero emagrecer na foto"));
teste("trocar o rosto não passa", true, !!P.pedidoEdicaoBarrado("troque o rosto"));
teste("nudez não passa", true, !!P.pedidoEdicaoBarrado("sem roupa") && !!P.pedidoEdicaoBarrado("pelada na praia") && !!P.pedidoEdicaoBarrado("fique nu"));
teste("laboratório não é confundido com ator", "", P.pedidoEdicaoBarrado("num laboratório antigo"));
teste("famoso pelo nome genérico não passa", true, !!P.pedidoEdicaoBarrado("coloque um jogador famoso do meu lado"));
teste("'num' não é confundido com nudez", "", P.pedidoEdicaoBarrado("num ginásio lotado"));
teste("os filtros mexem só no aparelho (nenhum chama a IA)", false, /chamarIA/.test(pedaco("function aplicarFiltroFoto", "const blobParaImagem")));
teste("a original fica guardada à parte", true, /CHAVE_FOTO_RESUMO_ORIG/.test(pedaco("async function trocarFotoResumo", "// cada cena entra")));
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
