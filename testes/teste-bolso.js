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
  trecho("function b64UrlParaPadrao("), trecho("function padraoParaB64Url("),
  jarvis, html.slice(iniB, fimB),
].join("\n");
eval(fonte + "\nglobalThis.B = { criarBolso, aplicarEventosBolso, snapshotBolso, lerPacoteBolso, linkBolso };");

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

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
