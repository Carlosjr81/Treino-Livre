// O Jarvis com a tela travada (app Android, ?modo=bolso). O app ouve e fala; a
// frase é entendida pelo motor do bolso (criarBolso), e o que ele anota volta
// ao treino pela mesma aplicarEventosBolso dos dois lados.
const html = require("./app").lerApp();

// Um pedaço de código do topo do arquivo, pelo começo da declaração
function trecho(inicio) {
  const i = html.indexOf(inicio);
  if (i < 0) { console.error("nao achei: " + inicio); process.exit(1); }
  if (/^function /.test(inicio)) return html.slice(i, html.indexOf("\n}\n", i) + 3);
  const resto = html.slice(i + 1);
  const m = resto.match(/\n(?=[^\s.)\]}])/);
  return html.slice(i, i + 1 + m.index + 1);
}
const iniJ = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
const marcaFim = html.indexOf('{ d: "Jarvis, finaliza o treino"');
let jarvis = html.slice(iniJ, html.indexOf("];", marcaFim) + 2);
jarvis = jarvis.replace(/const ReconhecedorVoz[\s\S]*?const VOZ_FALA = [^\n]*\n/, "const VOZ_OUVE=false, VOZ_FALA=false;\n");
jarvis = jarvis.replace(/if \(VOZ_FALA\) \{[\s\S]*?\n\}\n/, "");
const iniB = html.indexOf("// ==== BOLSO: O JARVIS COM A TELA TRAVADA");
const fimB = html.indexOf("// ==== FIM DO BOLSO ====");
if (iniB < 0 || fimB < 0) { console.error("nao achei o bloco do bolso"); process.exit(1); }
const iniEx = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(iniEx + "const EXERCICIOS = ".length, html.indexOf("\n];", iniEx) + 2));

const fonte = [
  trecho("const ehTempo = "), trecho("const segundosDe = "), trecho("const cargaDe = "), trecho("const repsDe = "),
  trecho("function ehDrop("), trecho("const fmtNum = "), trecho("function plural("), trecho("const semAcento = "),
  trecho("const nomeFalado = "), trecho("function tempoFalado("), trecho("function alvoDaSessao("),
  trecho("function b64Codificar("), "const PACOTE_ANDROID = \"x\"; const LINK_APK = \"x\";", trecho("function b64UrlParaPadrao("), trecho("function padraoParaB64Url("),
  trecho("const DESCANSO_CIENCIA = "),
  jarvis, html.slice(iniB, fimB),
].join("\n");
const memoria = {};
globalThis.localStorage = { getItem: (k) => (k in memoria ? memoria[k] : null), setItem: (k, v) => { memoria[k] = String(v); }, removeItem: (k) => { delete memoria[k]; } };
eval(fonte + "\nglobalThis.B = { comecoDoExercicio, falaProximoExercicio, criarBolso, aplicarEventosBolso, snapshotBolso, lerPacoteBolso, linkBolso, marcarIdsBolso, novosEventosBolso, eventosBolsoValidos, canalBolso, canalBolsoValido, cifrarBolso, decifrarBolso, criarRecuperacaoFc, fcDoRelogio };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = JSON.stringify(esperado), b = JSON.stringify(obtido);
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(60) + b.slice(0, 70)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + b + "\n         esperava " + a); }
}
function contem(nome, texto, pedaco) {
  const sim = String(texto || "").indexOf(pedaco) >= 0;
  if (sim) { ok++; console.log("  ok   " + nome.padEnd(60) + String(texto).slice(0, 70)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + JSON.stringify(texto) + "\n         esperava conter " + JSON.stringify(pedaco)); }
}

const exPorId = (id) => EXERCICIOS.find((e) => e.id === id);
const sessao = () => ({
  itens: [
    { uid: "u1", exercicioId: "supino-reto", descanso: 90, series: [{ peso: "80", reps: "10", feito: true }, { peso: "80", reps: "10" }, { peso: "80", reps: "10" }] },
    { uid: "u2", exercicioId: "prancha", series: [{ segundos: "30" }, { segundos: "30" }] },
    { uid: "u3", exercicioId: "rosca-direta", descanso: 60, series: [{ peso: "20", reps: "12" }] },
  ],
});
const snap = () => JSON.parse(JSON.stringify(snapshotBolso(sessao(), exPorId, { descanso: 90, barra: 20, foco: 0, recordes: { "supino-reto": { peso: 82 } } })));
const T0 = 1700000000000;

console.log("--- a copia do treino que vai ao app ---");
const s0 = snap();
teste("leva os tres exercicios", 3, s0.itens.length);
teste("leva o recorde do supino", 82, s0.itens[0].rec);
teste("sabe que a prancha e de tempo", true, s0.itens[1].tempo);
teste("leva o equipamento (a barra do 'de cada lado')", true, /barra/i.test(s0.itens[0].equip));

console.log("--- anotar com a tela travada ---");
let b = criarBolso(snap(), EXERCICIOS);
let r = b.ouvir(["Jarvis, 80 por 10"], T0);
contem("anota no supino e confirma o que entendeu", r.falar, "Anotei Supino reto");
contem("diz a carga e as repeticoes", r.falar, "80 quilos por 10");
contem("diz em que serie esta", r.falar, "Série 2 de 3");
teste("o descanso e o do supino (90 s)", T0 + 90000, r.descansoAte);
teste("vira um acontecimento para voltar ao treino", [{ t: "a", u: "u1", i: 1, p: "80", r: "10" }], b.eventos());
contem("no fim do descanso: chama e diz a proxima serie", b.fimDescanso(T0 + 90000), "série 3 de 3 de Supino");
contem("... com a referencia da anterior", (() => { const b2 = criarBolso(snap(), EXERCICIOS); b2.ouvir(["Jarvis, 80 por 10"], T0); return b2.fimDescanso(T0 + 90000); })(), "Na anterior: 80 quilos por 10");
teste("fim do descanso so uma vez", "", b.fimDescanso(T0 + 91000));

console.log("--- o proximo exercicio, dito na troca (2026-11-28o) ---");
b = criarBolso(snap(), EXERCICIOS);
b.ouvir(["Jarvis, 80 por 10"], T0);
b.ouvir(["Jarvis, 80 por 10"], T0 + 100000);
contem("acabou o supino: diz o proximo exercicio", b.fimDescanso(T0 + 200000), "Próximo exercício: Prancha isométrica. 2 séries de 30 segundos.");
teste("frase da rosca: series, repeticoes e peso", "Próximo exercício: Rosca direta. 1 série de 12 repetições, com 20 quilos.",
  falaProximoExercicio({ series: [{ peso: "20", reps: "12" }] }, "Rosca direta"));
teste("plano de volume: diz a primeira carga", "Próximo exercício: Leg press. 3 séries de 12 repetições, começando com 200 quilos. Primeiro o aquecimento.",
  falaProximoExercicio({ series: [{ peso: "100", reps: "10", aquec: true }, { peso: "200", reps: "12" }, { peso: "200", reps: "12" }, { peso: "180", reps: "12" }, { peso: "150", reps: "12", drop: true }] }, "Leg press"));
teste("sem carga: so as series e repeticoes", "Próximo exercício: Barra fixa. 3 séries de 8 repetições.",
  falaProximoExercicio({ series: [{ reps: "8" }, { reps: "8" }, { reps: "8" }] }, "Barra fixa"));
teste("aerobico: os minutos", "Próximo exercício: Esteira. 30 minutos.", falaProximoExercicio({ cardio: true, series: [{ segundos: "1800" }] }, "Esteira"));
teste("exercicio ja comecado nao e o comeco", false, comecoDoExercicio({ series: [{ reps: "8", feito: true }, { reps: "8" }] }));

console.log("--- a palavra de ativacao ---");
b = criarBolso(snap(), EXERCICIOS);
teste("sem o nome, conversa da academia nao anota", {}, b.ouvir(["80 por 10"], T0));
b.ouvir(["Jarvis, 80 por 10"], T0);
r = b.ouvir(["repete"], T0 + 5000);
contem("na janela de 15 s emenda sem o nome", r.falar, "Série 3 de 3");
teste("fora da janela, sem o nome, nada", {}, b.ouvir(["80 por 10"], T0 + 60000));
r = b.ouvir(["Jarvis"], T0 + 70000);
teste("so o nome: ele responde (no bolso nao ha tela)", "Pode falar.", r.falar);
r = b.ouvir(["quanto falta"], T0 + 75000);
contem("e a pergunta seguinte vale sem o nome", r.falar, "descanso");

console.log("--- o recorde ---");
b = criarBolso(snap(), EXERCICIOS);
r = b.ouvir(["Jarvis, 85 por 8"], T0);
contem("85 no supino passa do recorde de 82", r.falar, "Recorde no Supino");
contem("e diz quanto a mais", r.falar, "3 a mais");
r = b.ouvir(["Jarvis, 84 por 8"], T0 + 100000);
teste("84 depois de 85 nao e recorde", false, /Recorde/.test(r.falar));

console.log("--- de cada lado, isometria, e o fim do exercicio ---");
b = criarBolso(snap(), EXERCICIOS);
r = b.ouvir(["Jarvis, 30 de cada lado 10 repeticoes"], T0);
contem("30 de cada lado + barra de 20 = 80", r.falar, "dá 80");
b.ouvir(["Jarvis, 80 por 10"], T0 + 100000);
r = b.ouvir(["Jarvis, prancha 45 segundos"], T0 + 200000);
contem("a prancha anota segundos", r.falar, "45 segundos");
teste("o acontecimento da prancha leva os segundos", "45", b.eventos().slice(-1)[0].sg);
b.ouvir(["Jarvis, prancha 40 segundos"], T0 + 300000);
r = b.ouvir(["Jarvis, rosca 20 por 12"], T0 + 400000);
contem("a ultima serie do treino: treino completo", r.falar, "Treino completo");
teste("e nao abre descanso", 0, r.descansoAte);

console.log("--- desfazer, corrigir e o descanso ---");
b = criarBolso(snap(), EXERCICIOS);
b.ouvir(["Jarvis, 80 por 10"], T0);
r = b.ouvir(["Jarvis, corrige para 75"], T0 + 3000);
contem("corrige a carga da ultima", r.falar, "75 quilos");
r = b.ouvir(["Jarvis, apaga a ultima"], T0 + 6000);
contem("desfaz a ultima anotada", r.falar, "Desmarquei a série 2");
teste("os tres acontecimentos, em ordem", ["a", "c", "x"], b.eventos().map((e) => e.t));
r = b.ouvir(["Jarvis, descanso de 2 minutos"], T0 + 10000);
teste("descanso pedido: 2 minutos", T0 + 130000, r.descansoAte);
r = b.ouvir(["Jarvis, pula o descanso"], T0 + 20000);
teste("pular zera o descanso", 0, r.descansoAte);
contem("e ja diz a proxima", r.falar, "Agora: série");
r = b.ouvir(["Jarvis, finaliza o treino"], T0 + 30000);
contem("finalizar so com a tela destravada", r.falar, "destrave a tela");
r = b.ouvir(["Jarvis, para de ouvir"], T0 + 31000);
teste("desligar pede ao app para parar", true, r.parar);

console.log("--- a volta para o treino ---");
b = criarBolso(snap(), EXERCICIOS);
b.ouvir(["Jarvis, 80 por 10"], T0);
b.ouvir(["Jarvis, observação banco na altura 4"], T0 + 1000);
let itens = aplicarEventosBolso(sessao().itens, b.eventos());
teste("a serie anotada entra no treino", { peso: "80", reps: "10", feito: true }, itens[0].series[1]);
teste("a observacao entra no exercicio", "banco na altura 4", itens[0].obs);
const marcada = sessao();
marcada.itens[0].series[1].feito = true;
itens = aplicarEventosBolso(marcada.itens, [{ t: "a", u: "u1", i: 1, p: "82", r: "8" }]);
teste("serie ja marcada na tela: vai para a proxima por fazer", { peso: "82", reps: "8", feito: true }, itens[0].series[2]);
teste("... e a marcada a mao continua como estava", { peso: "80", reps: "10", feito: true }, itens[0].series[1]);
itens = aplicarEventosBolso(sessao().itens, [{ t: "a", u: "u3", i: 0, p: "20", r: "12" }, { t: "a", u: "u3", i: 1, p: "20", r: "10" }]);
teste("anotar alem do combinado cria a serie", 2, itens[2].series.length);
teste("exercicio que saiu do treino e ignorado", 3, aplicarEventosBolso(sessao().itens, [{ t: "a", u: "zz", i: 0, r: "5" }]).length);

console.log("--- o pacote que volta pelo link ---");
const cod = (o) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dec = (s) => Buffer.from(s, "base64").toString("utf8");
const pac = lerPacoteBolso(cod({ ev: [{ t: "a", u: "u1", i: 1, p: "80", r: "10" }, { t: "z", u: "u1" }, { t: "a", u: "u1", p: "<script>" }] }), dec);
teste("so o que e acontecimento valido passa", 1, pac.ev.length);
teste("pacote quebrado nao derruba", null, lerPacoteBolso("%%%", dec));

console.log("--- o relogio (Galaxy Watch) ---");
b = criarBolso(snap(), EXERCICIOS);
let pn = b.painel(T0);
teste("o painel mostra o exercicio da vez e a serie", ["Supino reto com barra", 2, 3], [pn.ex, pn.n, pn.de].map((x, k) => k === 0 ? (x || "").slice(0, 21) : x));
teste("... com a carga e as repeticoes combinadas (o + do relogio anda de 1 kg)", [80, 10, 1], [pn.peso, pn.reps, pn.passo]);
teste("... a anterior e o proximo", ["80 kg × 10", true], [pn.ant, !!pn.prox]);
teste("... e os minutos que faltam do treino", true, pn.falta > 0 && pn.falta < 60);
r = b.acao({ a: "feito", ei: 0, p: 82.5, r: 8 }, T0);
teste("feito no relogio anota a carga ajustada", { t: "a", u: "u1", i: 1, p: "82.5", r: "8" }, b.eventos()[0]);
teste("... e comeca o descanso do exercicio", T0 + 90000, r.descansoAte);
contem("... e e recorde (82 era o melhor)", r.falar, "Recorde");
teste("o painel diz o descanso correndo", T0 + 90000, b.painel(T0 + 1000).descansoAte);
r = b.acao({ a: "mais" }, T0 + 1000);
teste("+30 s no relogio", T0 + 120000, r.descansoAte);
r = b.acao({ a: "menos" }, T0 + 2000);
teste("-15 s no relogio", T0 + 105000, r.descansoAte);
r = b.acao({ a: "pular" }, T0 + 3000);
teste("pular o descanso pelo relogio", 0, r.descansoAte);
r = b.acao({ a: "desfazer" }, T0 + 4000);
teste("desfazer pelo relogio", ["a", "x"], b.eventos().map((e) => e.t));
b.acao({ a: "proximo" }, T0 + 5000);
pn = b.painel(T0 + 5000);
teste("proximo: a prancha, que e de tempo", [true, 30], [pn.tempo, pn.seg]);
b.acao({ a: "feito", ei: 1, sg: 45 }, T0 + 6000);
teste("feito na prancha anota os segundos", "45", b.eventos().pop().sg);
teste("valor absurdo do relogio e ignorado (sem carga nova, repeticao combinada)", [null, "10"], (() => { const bb = criarBolso(snap(), EXERCICIOS); bb.acao({ a: "feito", ei: 0, p: -5, r: 99999 }, T0); const e = bb.eventos()[0]; return [e.p, e.r]; })());
teste("acao desconhecida nao faz nada", {}, b.acao({ a: "explodir" }, T0));
const sp = snap(); sp.itens[0].pulado = true;
teste("exercicio pulado nao e a vez do relogio", "u2", criarBolso(sp, EXERCICIOS).painel(T0).uid);
const sf = snap(); sf.itens.forEach((it) => it.series.forEach((s) => { s.feito = true; }));
teste("tudo feito: o relogio mostra o fim", true, criarBolso(sf, EXERCICIOS).painel(T0).fim);


// fora de ordem (relato do dono): pulou o 1º, fez o 2º inteiro, está no 3º; o ◀ tem de voltar ao 1º
{
  const so = snap(); so.itens[1].series.forEach((s) => { s.feito = true; }); so.foco = 2;
  const bo = criarBolso(so, EXERCICIOS);
  teste("fora de ordem: comeca no 3º", 2, bo.painel(T0).ei);
  bo.acao({ a: "anterior" }, T0);
  teste("fora de ordem: o ◀ volta ao 1º, pulando o 2º ja feito", 0, bo.painel(T0).ei);
  bo.acao({ a: "proximo" }, T0);
  teste("fora de ordem: o ▶ vai ao 3º, pulando o 2º ja feito", 2, bo.painel(T0).ei);
}
console.log("--- o relogio sem notificacao (canal cifrado) ---");
const ev2 = B.marcarIdsBolso([{ t: "a", u: "u1", i: 0, p: "80", r: "10" }, { t: "x", u: "u1", i: 0 }]);
teste("cada acontecimento ganha um id", true, ev2.every((e) => typeof e.k === "string" && e.k.length > 5));
const k0 = ev2[0].k; B.marcarIdsBolso(ev2);
teste("o id nao muda na segunda vez", k0, ev2[0].k);
teste("o id passa na conferencia", 2, B.eventosBolsoValidos(ev2).length);
teste("chegou pelo canal: entra", 2, B.novosEventosBolso(ev2).length);
teste("o mesmo de novo pelo #bolso=: nao entra", 0, B.novosEventosBolso(ev2).length);
teste("o novo junto do velho: so o novo", 1, B.novosEventosBolso(ev2.concat(B.marcarIdsBolso([{ t: "a", u: "u2", i: 0 }]))).length);
teste("acontecimento sem id (app antigo) sempre entra", 1, B.novosEventosBolso([{ t: "a", u: "u1", i: 1 }]).length);
const ca = B.canalBolso();
teste("o canal: id e chave", true, B.canalBolsoValido(ca));
teste("o canal e o mesmo na segunda vez", ca, B.canalBolso());
teste("o link do bolso leva o canal", true, B.linkBolso({ v: 1, itens: [] }).indexOf("&ca=" + encodeURIComponent(ca)) > 0);
// o app nao aplica de novo o que a pagina ja tem: a copia leva os vistos
teste("a copia leva o que a pagina ja aplicou", ["abc"], B.snapshotBolso({ itens: [] }, () => ({}), { vistos: ["abc"] }).vistos);
console.log("--- o Terminei do relogio no aerobico ---");
{
  const sEst = { itens: [
    { uid: "e1", exercicioId: "esteira-caminhada", series: [{ segundos: "1200", vel: "5.5", mod: "caminhada" }] },
    { uid: "e2", exercicioId: "supino-reto", series: [{ peso: "60", reps: "10" }] },
  ] };
  const bt = criarBolso(JSON.parse(JSON.stringify(snapshotBolso(sEst, exPorId, { descanso: 90, barra: 20, foco: 0 }))), EXERCICIOS);
  teste("o painel diz que e aerobico", true, bt.painel(T0).cardio);
  const rt = bt.acao({ a: "terminar", ei: 0 }, T0);
  contem("... o Terminei anota e segue", rt.falar, "aeróbico anotado");
  teste("... sem descanso", 0, rt.descansoAte);
  teste("... vira o acontecimento f", [{ t: "f", u: "e1", i: 0 }], bt.eventos().map((e) => ({ t: e.t, u: e.u, i: e.i })));
  teste("... o painel passa ao supino", "e2", bt.painel(T0).uid);
  const ap = B.aplicarEventosBolso(sEst.itens, bt.eventos());
  teste("... sem a tela, a serie fica feita com os numeros dela", { segundos: "1200", vel: "5.5", mod: "caminhada", feito: true }, ap[0].series[0]);
  teste("... o f passa na conferencia de quem chega de fora", 1, B.eventosBolsoValidos(bt.eventos()).length);
  contem("... de novo, nao ha aerobico por terminar", bt.acao({ a: "terminar", ei: 0 }, T0).falar, "Não há aeróbico");
}
console.log("--- o relogio sem o celular (2026-11-17b) ---");
{
  const bs = criarBolso(snap(), EXERCICIOS);
  const c = bs.painel(T0).copia;
  teste("o painel leva a copia do treino", [true, c.it.length > 0, c.it[0].s.length > 0], [!!c, c.it.length === snap().itens.length, true]);
  teste("... com o uid, o descanso e as series de cada exercicio", [snap().itens[0].uid, 90], [c.it[0].u, c.it[0].d]);
  const r1 = bs.acao({ a: "feito", ei: 0, p: 80, r: 10, k: "abc123" }, T0);
  teste("o toque do relogio leva o id ate o acontecimento", "abc123", bs.eventos().slice(-1)[0].k);
  const n1 = bs.eventos().length;
  const u = snap().itens[0].uid;
  const df = bs.deFora([{ t: "a", u: u, i: 0, p: "80", r: "10", k: "abc123" }], 0, 0, T0 + 1000);
  teste("o mesmo id que volta do relogio nao entra duas vezes", [false, n1], [df.mudou, bs.eventos().length]);
  const antes = bs.painel(T0 + 2000).feitas;
  const df2 = bs.deFora([{ t: "a", u: u, r: "8", p: "80", k: "sem1" }, { t: "a", u: u, r: "6", p: "80", k: "sem2" }], 0, T0 + 90000, T0 + 2000);
  teste("o que o relogio anotou sem o celular entra no treino", [true, antes + 2], [df2.mudou, bs.painel(T0 + 2000).feitas]);
  teste("... com o descanso que corria no relogio", T0 + 90000, df2.descansoAte);
  teste("... e os ids confirmados", ["sem1", "sem2"], df2.aceitos);
  teste("... os acontecimentos passam na conferencia de quem chega de fora", 2, B.eventosBolsoValidos(bs.eventos().slice(-2)).length);
  const b2 = criarBolso(Object.assign(snap(), { vistos: ["ja1"] }), EXERCICIOS);
  teste("o id que a pagina ja aplicou tambem nao entra", false, b2.deFora([{ t: "a", u: u, r: "8", k: "ja1" }], 0, 0, T0).mudou);
}
console.log("--- a copia muda na tela do treino: o relogio segue (2026-11-20y) ---");
{
  const copia = (mexer, vistos) => { const c = snap(); mexer(c); c.vistos = vistos || []; return c; };
  let bc = criarBolso(snap(), EXERCICIOS);
  teste("antes: o relogio mostra 80 kg", 80, bc.painel(T0).peso);
  bc.trocarCopia(copia((c) => { c.itens[0].series[1].peso = "90"; c.itens[0].series[2].peso = "90"; c.itens[0].series.push({ peso: "90", reps: "10" }); }));
  teste("a carga mudada no celular chega ao relogio", 90, bc.painel(T0).peso);
  teste("a serie a mais chega ao relogio (6 + 1)", 7, bc.painel(T0).total);
  bc = criarBolso(snap(), EXERCICIOS);
  bc.ouvir(["Jarvis, 80 por 10"], T0);
  const ev = B.marcarIdsBolso(bc.eventos());
  bc.trocarCopia(copia((c) => { c.itens[0].series[2].peso = "90"; }));
  teste("o que o relogio anotou e a tela ainda nao aplicou continua", true, bc.estado()[0].series[1].feito);
  teste("... e a carga nova vale na serie seguinte", "90", bc.estado()[0].series[2].peso);
  bc.trocarCopia(copia((c) => { c.itens[0].series[1].feito = true; c.itens[0].series[2].peso = "95"; }, [ev[0].k]));
  teste("o que a tela ja aplicou nao entra duas vezes", false, !!bc.estado()[0].series[2].feito);
  const agora = Date.now();
  bc = criarBolso(snap(), EXERCICIOS);
  const rr = bc.ouvir(["Jarvis, 80 por 10"], agora);
  bc.trocarCopia(copia(() => {}));
  teste("o descanso que o app conduz continua", rr.descansoAte, bc.descansoAte());
  teste("copia torta e recusada", false, bc.trocarCopia({ itens: "x" }));
}
(async () => {
  const m = await B.cifrarBolso(ca, { ev: ev2, ts: 5 });
  // com aspas: "u1" solto aparece por acaso no base64 de vez em quando (o CI
  // reprovou assim em 2026-11-13); com aspas, só o texto aberto teria

  teste("o retransmissor so ve bytes embaralhados", false, /"u1"|"t"|"a"/.test(JSON.stringify(m)));
  const volta = await B.decifrarBolso(ca, m);
  teste("a tela do treino decifra", ev2[0].k, volta.ev[0].k);
  let recusou = false;
  try { await B.decifrarBolso("aaaaaaaaaaaaaaaa." + "B".repeat(43), m); } catch (e) { recusou = true; }
  teste("outra chave nao decifra", true, recusou);
  
console.log("--- o coração no descanso (o relógio mede quanto ele levou para voltar) ---");
{
  const bb = criarBolso(snap(), EXERCICIOS);
  bb.acao({ a: "feito", ei: 0, p: 80, r: 10, fr: 48 }, T0);
  teste("o ✓ do relógio leva os segundos de recuperação no acontecimento", 48, bb.eventos()[0].fr);
  const bz = criarBolso(snap(), EXERCICIOS);
  bz.acao({ a: "feito", ei: 0, p: 80, r: 10, fr: 9999 }, T0);
  teste("recuperação absurda fica de fora", true, bz.eventos()[0].fr === undefined);
  teste("a validação aceita o fr numérico", 1, B.eventosBolsoValidos([{ t: "a", u: "u1", i: 0, fr: 48 }]).length);
  teste("e recusa o que não é número", 0, B.eventosBolsoValidos([{ t: "a", u: "u1", i: 0, fr: "x<script>" }]).length);
  const its = aplicarEventosBolso(sessao().itens, [{ t: "a", u: "u1", i: 0, p: "80", r: "10", fr: 48 }]);
  teste("aplicado, a série guarda o fr", true, its[0].series.some((x) => x.fr === 48));
  teste("o histórico leva o fr da série", true, /if \(s\.fr > 0\) nova\.fr = s\.fr;/.test(html));
}

// ---- o coração entre as séries no celular (2026-11-22f) ----
{
  const rc = B.criarRecuperacaoFc();
  let t = 1e6;
  // aquecendo: 90 bpm por 30 s (a base)
  for (let k = 0; k < 15; k++) { rc.ler(90, t); t += 2000; }
  // a série: sobe a 150
  for (let k = 0; k < 12; k++) { rc.ler(150, t); t += 2000; }
  rc.inicio(t);
  const e0 = rc.estado(t);
  teste("o alvo é 35% do caminho (no mínimo base + 10)", true, e0.alvo >= 100 && e0.alvo <= 115);
  teste("o pico é o da série", true, e0.pk >= 140);
  let voltou = 0;
  // o descanso: desce para 95
  for (let k = 0; k < 40 && !voltou; k++) { t += 2000; if (rc.ler(95, t)) voltou = t; }
  teste("o coração volta durante o descanso", true, voltou > 0);
  const e1 = rc.estado(t);
  teste("o estado diz que voltou e em quantos segundos", true, e1.pr && e1.s >= 15 && e1.s < 80);
  const fr = rc.fim();
  teste("o fim devolve os segundos da recuperação", e1.s, fr);
  // um descanso em que não volta
  for (let k = 0; k < 12; k++) { t += 2000; rc.ler(155, t); }
  rc.inicio(t);
  for (let k = 0; k < 10; k++) { t += 2000; rc.ler(150, t); }
  teste("sem voltar, o fim devolve 0", 0, rc.fim());
  // nunca antes dos 15 s
  const r2 = B.criarRecuperacaoFc();
  let u = 0;
  for (let k = 0; k < 10; k++) { r2.ler(80, u); u += 2000; }
  for (let k = 0; k < 10; k++) { r2.ler(140, u); u += 2000; }
  r2.inicio(u);
  teste("antes de 15 s não conta", false, r2.ler(80, u + 5000));
  teste("leitura absurda é ignorada", false, r2.ler(400, u + 6000) || r2.estado(u + 6000).b === 400);
  teste("o batimento do relógio é conferido", { b: 120, alvo: 100, pk: 150, pr: true, s: 42 }, B.fcDoRelogio({ b: "120", alvo: 100, pk: 150, pr: 1, s: 42 }));
  teste("e recusa o que não é batimento", null, B.fcDoRelogio({ b: 999 }));
  teste("e recusa lixo", null, B.fcDoRelogio("<script>"));
  teste("a faixa do descanso mostra o coração", true, /Coração recuperado ✓/.test(html) && /volta a /.test(html));
  const kt = require("fs").readFileSync(require("path").join(__dirname, "..", "android/relogio/src/main/java/br/com/treinolivre/relogio/TelaRelogio.kt"), "utf8");
  teste("a faixa do descanso desenha o coração do resumo batendo", true, /function CoracaoRecuperando/.test(html) && /<CoracaoRecuperando fc=\{fcMostrar\}/.test(html) && /desenharCoracaoAnatomico\(c\);\n  c\.restore\(\);\n  \/\/ a varredura/.test(html));
  const arteKt = require("fs").readFileSync(require("path").join(__dirname, "..", "android/relogio/src/main/java/br/com/treinolivre/relogio/CoracaoArte.kt"), "utf8");
  teste("o relógio tem o mesmo coração (o corpo do resumo) batendo no tum-tum", true, /cubicTo\(-0\.85f, -0\.45f, -0\.97f, 0\.05f, -0\.72f, 0\.38f\)/.test(arteKt) && /0\.16f/.test(arteKt));
  teste("atualizar sozinho não apaga a voz nem a vinheta", true, /"treinolivre-voz", "treinolivre-midia", "treinolivre-falas"/.test(html));
  teste("o site se atualiza sozinho só fora do treino", true, /const podeAtualizarSo = !!versaoNova && !sessao && !algoVivo/.test(html));
  const autoKt = require("fs").readFileSync(require("path").join(__dirname, "..", "android/app/src/direto/java/br/com/treinolivre/app/AtualizaSozinho.kt"), "utf8");
  teste("o celular só instala de tela apagada e sem treino", true, /pm\.isInteractive\) return false/.test(autoKt) && /BolsoService\.instancia != null/.test(autoKt) && /USER_ACTION_NOT_REQUIRED/.test(autoKt));
  teste("o relógio põe o coração atrás dos dados e manda o batimento", true, /fundoFc = CoracaoArte/.test(kt) && /descansando -> if \(coracao\.prontoEm > 0\) 0\.62f else 0\.5f; else -> 0\.16f/.test(kt) && /put\("a", "fc"\)/.test(kt));
}
console.log("\n" + ok + " passou / " + mal + " falhou");
  process.exit(mal ? 1 : 0);
})();
