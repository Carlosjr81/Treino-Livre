// O modo espelho: a câmera do celular apontada para o espelho da academia.
//
// O que este teste cobra, em ordem de importância:
//   1. O SENTIDO. De frente para a câmera, "o corpo tem de ir para a direita
//      da imagem" é "ande para a sua esquerda". No espelho a pessoa está de
//      costas para a câmera, e é o contrário. Inverter errado manda alguém
//      para fora do quadro — que é justamente o que o enquadramento existe
//      para evitar.
//   2. Que a seta NÃO inverta junto: ela é em coordenada de imagem, e a
//      posição no quadro não muda com o espelho.
//   3. Que só o que fala de lado seja mexido.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("// ---- O espelho da academia ----", "// ---------------- FIM DAS CONTAS DO ESPELHO") +
  "\nglobalThis.E = { trocarLados, guiaNoEspelho, ladosNoEspelho };"
);
const E = globalThis.E;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(50) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(50) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

console.log("--- o sentido, que e o que nao pode errar ---");
// O que o enquadramento devolve hoje quando o corpo precisa ir para a direita
// da imagem: a pessoa esta de FRENTE, entao ela anda para a esquerda dela.
const deFrente = { chave: "esq", texto: "Vá para a sua esquerda", fala: "Ande para a sua esquerda.", seta: "maisX" };
const noEspelho = E.guiaNoEspelho(deFrente);
teste("de frente: ande para a sua esquerda", "Vá para a sua esquerda", deFrente.texto);
teste("no espelho: ande para a sua DIREITA", "Vá para a sua direita", noEspelho.texto);
teste("e a fala acompanha", "Ande para a sua direita.", noEspelho.fala);
teste("a chave inverte junto", "dir", noEspelho.chave);

console.log("\n--- a seta NAO inverte ---");
// A seta aponta para onde o corpo anda NA IMAGEM. O espelho reflete a
// profundidade, nao a largura: quem anda para a direita da sala aparece
// andando para a direita do quadro, com espelho ou sem.
teste("a seta continua a mesma", "maisX", noEspelho.seta);
teste("no outro sentido tambem", "menosX",
  E.guiaNoEspelho({ chave: "dir", texto: "Vá para a sua direita", fala: "Ande para a sua direita.", seta: "menosX" }).seta);

console.log("\n--- inverter duas vezes volta ao comeco ---");
teste("ida e volta", deFrente, E.guiaNoEspelho(E.guiaNoEspelho(deFrente)));

console.log("\n--- so o que fala de lado e mexido ---");
const afaste = { chave: "afaste", texto: "Afaste-se", fala: "Você está cortado. Dê uns passos para trás.", seta: "afasta" };
teste("afaste-se passa intacto", afaste, E.guiaNoEspelho(afaste));
const aproxime = { chave: "aproxima", texto: "Aproxime-se", fala: "Dê uns passos para a frente.", seta: "aproxima" };
teste("aproxime-se passa intacto", aproxime, E.guiaNoEspelho(aproxime));
const semCorpo = { chave: "corpo", texto: "Não estou te vendo", fala: "Não estou te vendo." };
teste("sem corpo passa intacto", semCorpo, E.guiaNoEspelho(semCorpo));
teste("nulo nao quebra", null, E.guiaNoEspelho(null));

console.log("\n--- os nomes dos lados ---");
teste("cotovelo esquerdo vira direito", "cotovelo direito", E.trocarLados("cotovelo esquerdo"));
teste("joelho direito vira esquerdo", "joelho esquerdo", E.trocarLados("joelho direito"));
teste("braco esquerdo", "braço direito", E.trocarLados("braço esquerdo"));
teste("perna esquerda (feminino)", "perna direita", E.trocarLados("perna esquerda"));
teste("mantem a maiuscula", "Direita", E.trocarLados("Esquerda"));
teste("troca os dois na mesma frase", "direito + esquerdo", E.trocarLados("esquerdo + direito"));

console.log("\n--- nao mexe no que so PARECE lado ---");
// "Direita" dentro de outra palavra nao pode ser trocado
teste("direitos nao e lado", "direitos autorais", E.trocarLados("direitos autorais"));
teste("sem lado nenhum", "flexão de braço", E.trocarLados("flexão de braço"));
teste("texto vazio", "", E.trocarLados(""));
teste("nulo vira vazio", "", E.trocarLados(null));

console.log("\n--- o equilibrio entre os lados troca de nome ---");
// No alternado a contagem soma os dois lados: o TOTAL nao muda, mas qual
// deles foi o mais forte, sim.
teste("os dois numeros trocam de lugar", [4, 7], E.ladosNoEspelho([7, 4]));
teste("e a soma continua a mesma", 11, E.ladosNoEspelho([7, 4]).reduce((a, b) => a + b, 0));
teste("duas vezes volta ao comeco", [7, 4], E.ladosNoEspelho(E.ladosNoEspelho([7, 4])));
teste("nulo passa", null, E.ladosNoEspelho(null));
teste("formato inesperado passa intacto", [1, 2, 3], E.ladosNoEspelho([1, 2, 3]));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
