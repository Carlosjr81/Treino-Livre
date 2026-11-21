// O iPhone.
//
// O Safari é o navegador mais atrasado entre os que abrem o app, e no iPhone
// não há outro: todo navegador de lá usa o motor dele. Uma expressão ou função
// que o Safari de um iPhone antigo não conhece não falha só na tela em que é
// usada: o script inteiro deixa de ser lido, e o app abre em branco.
//
// O piso aqui é o iOS 15: o que só chegou depois dele fica proibido no código
// do app (index.html e idioma-en.js).
const fs = require("fs");
const path = require("path");
const html = require("./app").lerApp();
const en = fs.readFileSync(path.join(path.dirname(require("./app").caminhoDoApp()), "idioma-en.js"), "utf8");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(64) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(64) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
function achados(texto, re) {
  const linhas = texto.split("\n"), out = [];
  linhas.forEach((l, i) => { if (re.test(l)) out.push(i + 1); });
  return out;
}

console.log("\n1. O que derruba o script inteiro num iPhone antigo");
// Lookbehind numa expressão: só no iOS 16.4. Antes disso é erro de sintaxe.
teste("sem lookbehind (?<= / ?<!) no index.html", [], achados(html, /\(\?<[=!]/));
teste("sem lookbehind no idioma-en.js", [], achados(en, /\(\?<[=!]/));
// Funções que só chegaram no iOS 15.4 ou depois, sem guarda
teste("sem .findLast/.findLastIndex (iOS 15.4)", [], achados(html, /\.findLast(Index)?\(/));
teste("sem .at( de lista (iOS 15.4)", [], achados(html, /[\w\])]\.at\(-?\d/));
teste("sem Object.hasOwn (iOS 15.4)", [], achados(html, /Object\.hasOwn\(/));
teste("sem structuredClone (iOS 15.4)", [], achados(html, /structuredClone\(/));
teste("sem toSorted/toReversed/toSpliced/with (iOS 16)", [], achados(html, /\.(toSorted|toReversed|toSpliced)\(/));
teste("sem requestIdleCallback (o Safari não tem)", [], achados(html, /requestIdleCallback/));

console.log("\n2. As frases continuam partidas do mesmo jeito");
const partir = (t) => String(t).replace(/([.!?])\s+/g, "$1\u0001").split("\u0001").filter(Boolean);
teste("três frases", ["Agora!", "Corra.", "Mais rápido?"], partir("Agora! Corra. Mais rápido?"));
teste("número com ponto não parte", ["São 5.770 quilos.", "Boa."], partir("São 5.770 quilos. Boa."));
teste("sem pontuação, uma frase", ["sem ponto"], partir("sem ponto"));

console.log("\n3. O vídeo com narração no iPhone");
teste("sem codificador de som, o vídeo vai pelo gravador",
  true, /semSomNoCodec = !!trilha && temGravador && !\(await codecAudio\(\)\)/.test(html));
teste("o gravador usa o som liberado pelo toque no iPhone", true, /proprio = !\(EH_IOS && audioCtx\)/.test(html));
teste("o primeiro toque libera som e voz no iPhone", true, /addEventListener\(ev, liberarSomIos/.test(html));
teste("compartilhar no iPhone manda só o arquivo", 2, (html.match(/navigator\.share\(EH_IOS \? \{ files: \[file\] \}/g) || []).length);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
