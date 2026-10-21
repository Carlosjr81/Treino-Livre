// A ficha muda com o treino: trocar, tirar, acrescentar e reordenar exercícios
// no meio do treino e guardar a ficha assim. Errar aqui é apagar a ficha de
// alguém ou guardar uma ficha que não é a que a pessoa treinou.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("// ---- A ficha muda com o treino ----", "// ---- fim da ficha muda") + "\nglobalThis.H = { mudancasNaFicha, fichaDoTreino, moverFicha, moverPara, copiarItensPara };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const NOMES = { supino: "Supino", crucifixo: "Crucifixo", peck: "Peck deck", triceps: "Tríceps corda", esteira: "Esteira" };
const nome = (id) => NOMES[id] || id;
const ficha = [
  { uid: "f1", exercicioId: "supino", series: 4, reps: 8, obs: "banco 3", descanso: 120 },
  { uid: "f2", exercicioId: "crucifixo", series: 3, reps: 12, obs: "", conjunto: "cj1" },
  { uid: "f3", exercicioId: "triceps", series: 3, reps: 15, obs: "", conjunto: "cj1" },
];
// a sessão como o app monta ao começar a ficha
const sessaoDe = (f) => f.map((it, i) => ({
  uid: "s" + i, exercicioId: it.exercicioId, origem: i, obs: it.obs, descanso: it.descanso || null, conjunto: it.conjunto || null,
  series: Array.from({ length: it.series }, () => ({ peso: "40", reps: String(it.reps), feito: true })),
}));

console.log("--- nada mudou ---");
teste("mesma lista, mesma ordem: nada a perguntar", null, H.mudancasNaFicha(ficha, sessaoDe(ficha), nome));
const comSerieAMais = sessaoDe(ficha); comSerieAMais[0].series.push({ peso: "40", reps: "8", feito: true });
teste("uma série a mais não é mudar a ficha", null, H.mudancasNaFicha(ficha, comSerieAMais, nome));

console.log("\n--- trocar ---");
let s = sessaoDe(ficha);
s[1] = { ...s[1], exercicioId: "peck", trocadoDe: "crucifixo", obs: "", series: s[1].series.map((x) => ({ ...x, reps: "10" })) };
let r = H.mudancasNaFicha(ficha, s, nome);
teste("a frase da troca", ["⇄ Crucifixo → Peck deck"], r.linhas);
teste("o novo fica no mesmo lugar", ["supino", "peck", "triceps"], r.itens.map((x) => x.exercicioId));
teste("mantém séries e o bi-set do antigo", [3, "cj1"], [r.itens[1].series, r.itens[1].conjunto]);
teste("repetições: as do treino (do exercício novo)", 10, r.itens[1].reps);
teste("o que não mudou fica igual (obs, descanso)", { uid: "f1", exercicioId: "supino", series: 4, reps: 8, obs: "banco 3", descanso: 120, conjunto: null }, r.itens[0]);
// trocou duas vezes: crucifixo → peck → supino-inclinado
s[1] = { ...s[1], exercicioId: "inclinado", trocadoDe: "crucifixo" };
teste("trocou duas vezes: fala do primeiro para o último", ["⇄ Crucifixo → inclinado"], H.mudancasNaFicha(ficha, s, nome).linhas);
// trocou e destrocou
s[1] = { ...s[1], exercicioId: "crucifixo", trocadoDe: "crucifixo" };
teste("trocou e voltou ao mesmo: nada a perguntar", null, H.mudancasNaFicha(ficha, s, nome));

console.log("\n--- tirar e acrescentar ---");
s = sessaoDe(ficha).filter((x) => x.exercicioId !== "triceps");
r = H.mudancasNaFicha(ficha, s, nome);
teste("tirou um", ["✕ Saiu: Tríceps corda"], r.linhas);
teste("o bi-set que ficou sem par é desfeito", null, r.itens[1].conjunto);
s = sessaoDe(ficha).concat([{ uid: "novo", exercicioId: "esteira", obs: "", series: [{ segundos: "1200", mod: "corrida", vel: "9", feito: true }] }]);
r = H.mudancasNaFicha(ficha, s, nome);
teste("acrescentou um", ["+ Entrou: Esteira"], r.linhas);
teste("o acrescentado: 1 série, minutos da esteira", { exercicioId: "esteira", series: 1, reps: 20 }, (({ exercicioId, series, reps }) => ({ exercicioId, series, reps }))(r.itens[3]));
s = sessaoDe(ficha); s.push({ uid: "n2", exercicioId: "peck", obs: "", series: [{ peso: "30", reps: "12" }, { peso: "30", reps: "12" }] });
teste("acrescentado de força: séries e reps do treino", [2, 12], (() => { const x = H.mudancasNaFicha(ficha, s, nome).itens[3]; return [x.series, x.reps]; })());

console.log("\n--- reordenar ---");
s = sessaoDe(ficha); s = [s[2], s[0], s[1]];
r = H.mudancasNaFicha(ficha, s, nome);
teste("só a ordem mudou", ["↕ Nova ordem dos exercícios"], r.linhas);
teste("a ordem nova", ["triceps", "supino", "crucifixo"], r.itens.map((x) => x.exercicioId));
teste("separados, o bi-set some (só vale entre vizinhos)", [null, null, null], r.itens.map((x) => x.conjunto));

console.log("\n--- sessão antiga, sem origem ---");
s = sessaoDe(ficha).map(({ origem, ...x }) => x);
s[0] = { ...s[0], exercicioId: "peck", trocadoDe: "supino" };
r = H.mudancasNaFicha(ficha, s, nome);
teste("acha o item da ficha pelo exercício trocado", [4, 120], [r.itens[0].series, r.itens[0].descanso]);

console.log("\n--- o treino livre vira ficha ---");
const livre = [
  { exercicioId: "supino", obs: "banco 3", series: [{ peso: "20", reps: "15", aquec: true }, { peso: "60", reps: "12" }, { peso: "60", reps: "10" }, { peso: "60", reps: "10" }] },
  { exercicioId: "prancha", obs: "", series: [{ segundos: "45" }, { segundos: "45" }] },
  { exercicioId: "esteira", obs: "", series: [{ segundos: "1200", mod: "corrida", vel: "9" }] },
  { exercicioId: "so-aquecimento", obs: "", series: [{ peso: "10", reps: "20", aquec: true }] },
  { exercicioId: "nada", obs: "", series: [] },
];
const f = H.fichaDoTreino(livre, (i) => "id" + i);
teste("exercício sem série feita fica de fora", ["supino", "prancha", "esteira", "so-aquecimento"], f.map((x) => x.exercicioId));
teste("aquecimento não conta série; reps = as que mais apareceram", [3, 10, "banco 3"], [f[0].series, f[0].reps, f[0].obs]);
teste("isometria: os segundos", [2, 45], [f[1].series, f[1].reps]);
teste("aeróbico: minutos", [1, 20], [f[2].series, f[2].reps]);
teste("só aquecimento: vira 1 série, não some", [1, 20], [f[3].series, f[3].reps]);
teste("item de ficha completo", { uid: "id0", exercicioId: "supino", series: 3, reps: 10, obs: "banco 3", descanso: null, conjunto: null }, f[0]);
teste("empate nas repetições: a primeira", 12, H.fichaDoTreino([{ exercicioId: "x", series: [{ reps: "12" }, { reps: "10" }] }])[0].reps);

console.log("\n--- a ordem das fichas no treino ---");
const lista = [{ id: "a", programaId: "av" }, { id: "x", programaId: "meus" }, { id: "b", programaId: "av" }, { id: "c", programaId: "av" }];
const ordem = (l, p) => l.filter((t) => t.programaId === p).map((t) => t.id).join("");
teste("descer a 1ª: troca com a 2ª do mesmo treino, pulando a de outro", "bac", ordem(H.moverFicha(lista, "a", 1), "av"));
teste("o outro treino não muda", "x", ordem(H.moverFicha(lista, "a", 1), "meus"));
teste("subir a última", "acb", ordem(H.moverFicha(lista, "c", -1), "av"));
teste("subir a primeira: nada muda", "abc", ordem(H.moverFicha(lista, "a", -1), "av"));
teste("descer a última: nada muda", "abc", ordem(H.moverFicha(lista, "c", 1), "av"));
teste("ficha sozinha no treino: nada muda", lista, H.moverFicha(lista, "x", 1));
teste("não mexe na lista original", "abc", ordem(lista, "av"));

console.log("\n--- a ordem dos exercícios na ficha ---");
const ex = ["a", "b", "c", "d"].map((x) => ({ uid: x, exercicioId: x }));
const ids = (l) => l.map((x) => x.uid).join("");
teste("o último vai para o topo, os outros descem", "dabc", ids(H.moverPara(ex, 3, 0)));
teste("o primeiro vai para o fim", "bcda", ids(H.moverPara(ex, 0, 3)));
teste("um passo para baixo é trocar com o vizinho", "bacd", ids(H.moverPara(ex, 0, 1)));
teste("posição fora da lista: nada muda", "abcd", ids(H.moverPara(ex, 0, 9)));
teste("não mexe na lista original", "abcd", ids(ex));
const bi = [{ uid: "a", conjunto: "k" }, { uid: "b", conjunto: "k" }, { uid: "c" }, { uid: "d" }];
teste("separar o bi-set apaga a marca dos dois", [null, null, null], H.moverPara(bi, 0, 3).map((x) => x.conjunto || null).slice(0, 3));
teste("o bi-set que continua junto fica", ["k", "k"], H.moverPara(bi, 3, 0).slice(1, 3).map((x) => x.conjunto));

console.log("\n--- copiar exercícios para outra ficha ---");
let n = 0; const id = () => "n" + (++n);
const dest = [{ uid: "d1", exercicioId: "supino", series: 4, reps: 8 }];
const origem = [
  { uid: "o1", exercicioId: "crucifixo", series: 3, reps: 12, obs: "banco 2", conjunto: "k" },
  { uid: "o2", exercicioId: "triceps", series: 3, reps: 15, conjunto: "k" },
  { uid: "o3", exercicioId: "supino", series: 3, reps: 10 },
  { uid: "o4", exercicioId: "peck", series: 3, reps: 12, conjunto: "z" },
];
const c = H.copiarItensPara(dest, origem, id);
teste("entram no fim; o que a ficha já tem fica de fora", ["supino", "crucifixo", "triceps", "peck"], c.itens.map((x) => x.exercicioId));
teste("conta copiados e repetidos", [3, ["supino"]], [c.copiados, c.repetidos]);
teste("cópia leva séries, reps e obs", [3, 12, "banco 2"], [c.itens[1].series, c.itens[1].reps, c.itens[1].obs]);
teste("uid novo em cada cópia", true, c.itens.slice(1).every((x) => /^n/.test(x.uid)));
teste("bi-set copiado inteiro continua junto, com id próprio", true, c.itens[1].conjunto === c.itens[2].conjunto && c.itens[1].conjunto !== "k");
teste("bi-set com um lado só vira exercício solto", null, c.itens[3].conjunto);
teste("a ficha de destino original não muda", 1, dest.length);
teste("ficha nova (vazia)", 2, H.copiarItensPara([], origem.slice(0, 2), id).copiados);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
