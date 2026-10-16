// O desafio entre pessoas: a régua do mesmo tempo de prova, a classificação,
// a diferença em segundos, a previsão de ultrapassagem, quem passou quem, a
// trilha em texto curto, o link, o código da sala e os pacotes MQTT.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f).replace(/\r\n/g, "\n");
}
eval(pedaco("const LINK_APP", "\n") + "\n" +
  pedaco("const num1 =", "\n") + "\n" +
  pedaco("function b64Codificar", "\n}\n") + "\n}\n" +
  pedaco("function b64Decodificar", "\n}\n") + "\n}\n" +
  pedaco("// ---------------- DESAFIO: MOTOR", "// ---------------- FIM DO MOTOR DESAFIO") +
  "\nglobalThis.D = { distanciaNaTrilha, tempoNaDistancia, velocidadeNaTrilha, estadoNoTempo, classificarDesafio, previsaoUltrapassagem, eventosDesafio," +
  " codificarTrilha, decodificarTrilha, novoCodigoSala, lerCodigoSala, linkDesafio, lerLinkDesafio, mqttConectar, mqttAssinar, mqttPublicar, mqttLer, mqttTamanho," +
  " mensagemDesafio, participanteDaMensagem, nomeMetaDesafio, LINK_APP };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const bate = tol !== undefined ? Math.abs(obtido - esperado) <= tol : JSON.stringify(obtido) === JSON.stringify(esperado);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado) + (tol !== undefined ? " ±" + tol : "")); }
}
// trilha de quem corre a v m/s constante, amostra a cada 5 s, até tFim
function constante(v, tFim, atraso) {
  const tr = [[0, 0]];
  for (let t = 5000; t <= tFim; t += 5000) tr.push([t, Math.max(0, (t - (atraso || 0)) / 1000) * v]);
  return tr;
}
// trilha que muda de velocidade aos tTroca ms
function troca(v1, v2, tTroca, tFim) {
  const tr = [[0, 0]];
  for (let t = 5000; t <= tFim; t += 5000) tr.push([t, t <= tTroca ? (t / 1000) * v1 : (tTroca / 1000) * v1 + ((t - tTroca) / 1000) * v2]);
  return tr;
}
const META5K = { tipo: "distancia", alvo: 5000 };
const META30 = { tipo: "tempo", alvo: 30 * 60000 };

console.log("--- a trilha ---");
const tr3 = constante(3, 600000);
teste("aos 100 s a 3 m/s: 300 m", 300, D.distanciaNaTrilha(tr3, 100000), 0.01);
teste("entre amostras interpola (aos 102,5 s)", 307.5, D.distanciaNaTrilha(tr3, 102500), 0.01);
teste("passou dos 1000 m aos 333,3 s", 333333, D.tempoNaDistancia(tr3, 1000), 1);
teste("velocidade de agora: 3 m/s", 3, D.velocidadeNaTrilha(tr3, 300000), 0.001);
const acelera = troca(3, 4, 300000, 600000);
teste("acelerou de 3 para 4 m/s: a de agora ja e 4", 4, D.velocidadeNaTrilha(acelera, 400000), 0.001);

console.log("\n--- a mesma regua: o tempo de prova de cada um ---");
// Ana corre a 3,2 m/s; Bia a 3 m/s, mas largou uma hora depois, em outra
// cidade. Aos 10 min da prova de cada uma, Ana andou 1920 m e Bia 1800 m.
const agora = 1e12;
const ana = { id: "ana", nome: "Ana", trilha: constante(3.2, 1800000), fim: null, aoVivo: false };
const bia = { id: "bia", nome: "Bia", eu: true, trilha: constante(3, 600000), fim: null, aoVivo: true, ts: agora };
const c10 = D.classificarDesafio([bia, ana], 600000, META5K, agora);
teste("aos 10 min: Ana em 1o, Bia em 2o", ["ana", "bia"], c10.map((l) => l.p.id));
teste("Bia 120 m atras", 120, c10[1].atrasLiderM, 0.5);
// Ana passou pelos 1800 m aos 562,5 s: 37,5 s antes dos 600 s de Bia
teste("e 38 s atras (quando Ana passou por onde Bia esta)", 38, c10[1].atrasLiderS, 1);
// Bia ao vivo, ultima leitura aos 600 s; aos 603 s estima pelo ritmo
const proj = D.estadoNoTempo(bia, 603000, META5K, agora);
teste("ao vivo, 3 s depois da leitura: estima +9 m", 1809, proj.d, 0.5);
const parada = D.estadoNoTempo(Object.assign({}, bia, { aoVivo: false }), 700000, META5K, agora);
teste("sem estar ao vivo, nao inventa: 'ainda nao chegou'", [1800, true], [Math.round(parada.d), parada.aindaNao]);

console.log("\n--- a prova de distancia: quem cruzou a linha vem primeiro ---");
const cai = { id: "cai", nome: "Caio", trilha: constante(4, 1250000), fim: { ms: 1250000, m: 5000 }, aoVivo: false };
const duda = { id: "duda", nome: "Duda", trilha: constante(3.5, 1500000), fim: { ms: 1428571, m: 5000 }, aoVivo: false };
const c22 = D.classificarDesafio([duda, cai, Object.assign({}, bia, { trilha: constante(3, 1400000) })], 1400000, META5K, agora);
teste("aos 23:20: Caio terminou (1o), Duda 4900 m, Bia 4200 m", ["cai", "duda", "bia"], c22.map((l) => l.p.id));
teste("Caio aparece como terminado, com 5000 m", [true, 5000], [c22[0].terminou, c22[0].d]);
const cFim = D.classificarDesafio([duda, cai], 1e9, META5K, agora);
teste("no fim, pelo tempo: Caio 20:50 na frente de Duda", [1, 2, 179], [cFim[0].pos, cFim[1].pos, cFim[1].atrasLiderS]);

console.log("\n--- a prova de tempo: so a distancia importa ---");
const e30 = { id: "e", nome: "Edu", trilha: constante(2.8, 1800000), fim: { ms: 1800000, m: 5040 }, aoVivo: false };
const f30 = { id: "f", nome: "Fê", trilha: constante(3.1, 1800000), fim: { ms: 1800000, m: 5580 }, aoVivo: false };
const ct = D.classificarDesafio([e30, f30], 1800000, META30, agora);
teste("30 min: Fê 5580 m na frente de Edu 5040 m", ["f", "e", 540], [ct[0].p.id, ct[1].p.id, Math.round(ct[1].atrasLiderM)]);

console.log("\n--- quando um alcanca o outro ---");
// Eu (Gil) a 40 m de Hugo; Hugo a 3 m/s, eu acelerei para 3,5: 80 s para alcançar
const hugo = { id: "h", nome: "Hugo", trilha: constante(3, 900000, 0), fim: null, aoVivo: false };
const gilTr = troca(3, 3.5, 300000, 600000).map((p) => [p[0], Math.max(0, p[1] - 40)]);
gilTr[0] = [0, 0];
const gil = { id: "g", nome: "Gil", eu: true, trilha: gilTr, fim: null, aoVivo: false };
const cg = D.classificarDesafio([gil, hugo], 600000, META5K, agora);
const eu = cg.find((l) => l.p.id === "g"), ho = cg.find((l) => l.p.id === "h");
const pr = D.previsaoUltrapassagem(eu, ho, 600000, META5K);
// aos 600 s eu ganhei 0,5 m/s × 300 s = 150 m: já passei. Recalcula aos 350 s, ainda atrás
const c350 = D.classificarDesafio([gil, hugo], 350000, META5K, agora);
const eu350 = c350.find((l) => l.p.id === "g"), ho350 = c350.find((l) => l.p.id === "h");
const p350 = D.previsaoUltrapassagem(eu350, ho350, 350000, META5K);
teste("aos 350 s: 15 m atras e 0,5 m/s mais rapido: alcanca em 30 s", ["alcanca", 30, true], [p350.tipo, Math.round(p350.s), p350.viavel]);
teste("aos 600 s ja passou: agora e ele que nao alcanca (afasta)", "afasta", D.previsaoUltrapassagem(ho, eu, 600000, META5K).tipo === "afasta" ? "afasta" : D.previsaoUltrapassagem(ho, eu, 600000, META5K).tipo);
teste("e para mim, ele nao me alcanca: 'afasta'", "afasta", pr.tipo);
// o outro acelerou: ele chega em mim
const ivo = { id: "i", nome: "Ivo", trilha: troca(2.8, 3.6, 300000, 600000).map((p) => [p[0], p[1]]), fim: null, aoVivo: false };
const jo = { id: "j", nome: "Jô", eu: true, trilha: constante(3.2, 600000).map((p) => [p[0], p[1] + (p[0] ? 0 : 0)]), fim: null, aoVivo: false };
const cj = D.classificarDesafio([jo, ivo], 320000, META5K, agora);
const pj = D.previsaoUltrapassagem(cj.find((l) => l.p.id === "j"), cj.find((l) => l.p.id === "i"), 320000, META5K);
teste("Ivo acelerou para 3,6 atras de mim a 3,2: 'chega'", "chega", pj.tipo);
// perto da chegada, a ultrapassagem nao cabe: 100 m atras, 0,5 m/s mais rapido
// (200 s), a 270 m da linha
const pk = D.previsaoUltrapassagem({ d: 4730, v: 3.5, terminou: false }, { d: 4830, v: 3, terminou: false }, 1600000, META5K);
teste("100 m atras perto da chegada: alcancaria, mas depois da linha", ["alcanca", false], [pk.tipo, pk.viavel]);
// ninguém alcança: quanto precisa
const pm = D.previsaoUltrapassagem({ d: 1000, v: 3, terminou: false }, { d: 1060, v: 3, terminou: false }, 400000, META5K);
teste("60 m atras no mesmo ritmo: para alcancar em 1 min, 14,4 km/h", 14.4, pm.kmhEm1Min, 0.01);
teste("e para alcancar ate a chegada, 11,0 km/h", 10.96, pm.kmhAteChegada, 0.01);

console.log("\n--- quem passou quem ---");
const antes = [{ p: { id: "a" }, pos: 1 }, { p: { id: "eu" }, pos: 2 }, { p: { id: "c" }, pos: 3 }];
const depois = [{ p: { id: "eu" }, pos: 1 }, { p: { id: "a" }, pos: 2 }, { p: { id: "c" }, pos: 3 }];
teste("passei a lideranca", ["passei", "lider"], D.eventosDesafio(antes, depois, "eu").map((e) => e.tipo));
const depois2 = [{ p: { id: "a" }, pos: 1 }, { p: { id: "c" }, pos: 2 }, { p: { id: "eu" }, pos: 3 }];
teste("o C me passou", [["passou", "c"]], D.eventosDesafio(antes, depois2, "eu").map((e) => [e.tipo, e.quem.id]));
teste("nada mudou: nenhum evento", [], D.eventosDesafio(antes, antes, "eu"));

console.log("\n--- a trilha em texto curto ---");
const longa = constante(2.9, 3600000);
const cod = D.codificarTrilha(longa, 10000);
const volta = D.decodificarTrilha(cod);
teste("uma hora de corrida cabe em menos de 2 KB", true, cod.length < 2000);
teste("volta com o mesmo fim", [3600000, 10440], volta[volta.length - 1]);
teste("e a mesma distancia no meio (erro < 1 m)", 2900, D.distanciaNaTrilha(volta, 1000000), 1);
teste("texto estranho nao quebra", [], D.decodificarTrilha("lixo"));

console.log("\n--- o codigo da sala e o link ---");
let s = 0;
const cod1 = D.novoCodigoSala(() => (s = (s * 7 + 3) % 11) / 11, 2);
teste("codigo: 5 letras e o retransmissor no fim", [6, "2"], [cod1.length, cod1[5]]);
teste("le o codigo digitado com espaco e minuscula", { codigo: cod1, broker: 2 }, D.lerCodigoSala(cod1.slice(0, 3).toLowerCase() + " " + cod1.slice(3)));
teste("codigo com O e 0 (que se confundem) e recusado", null, D.lerCodigoSala("ABO0C1"));
const sala = { codigo: "KQ7MZ1", meta: META5K, atividade: "corrida" };
const lk = D.linkDesafio(sala, [cai, Object.assign({}, bia, { fim: null })]);
const lido = D.lerLinkDesafio(lk.split("#corrida=")[1]);
teste("o link leva a sala e a meta", ["KQ7MZ1", "distancia", 5000], [lido.codigo, lido.meta.tipo, lido.meta.alvo]);
teste("e so quem terminou vai como resultado", ["cai"], lido.fantasmas.map((f) => f.id));
teste("o fantasma volta com o tempo de chegada", 1250000, lido.fantasmas[0].fim.ms);
teste("link quebrado nao derruba", null, D.lerLinkDesafio("xx"));
teste("nome da meta", ["5 km", "meia maratona", "30 min"], [D.nomeMetaDesafio(META5K), D.nomeMetaDesafio({ tipo: "distancia", alvo: 21097 }), D.nomeMetaDesafio(META30)]);

console.log("\n--- a mensagem ao vivo ---");
const msg = D.mensagemDesafio({ nome: "Bia", atividade: "corrida", st: "correndo", t: 61000, d: 183, trilha: constante(3, 60000) });
const de = D.participanteDaMensagem("bia", JSON.parse(JSON.stringify(msg)));
teste("a trilha chega e ganha o ponto de agora", [61000, 183], de.trilha[de.trilha.length - 1]);
teste("sem localizacao na mensagem", false, /lat|lng|lon/.test(JSON.stringify(msg)));

console.log("\n--- os pacotes MQTT ---");
teste("tamanho variavel: 127, 128, 16383", [[127], [128, 1], [255, 127]], [D.mqttTamanho(127), D.mqttTamanho(128), D.mqttTamanho(16383)]);
const con = D.mqttConectar("abc", 45);
teste("CONNECT: cabecalho, MQTT nivel 4, sessao limpa, 45 s", [0x10, 15, 0, 4, 77, 81, 84, 84, 4, 2, 0, 45, 0, 3], Array.from(con.slice(0, 14)));
const sub = D.mqttAssinar(1, "a/+");
teste("SUBSCRIBE com QoS 0", [0x82, 8, 0, 1, 0, 3, 97, 47, 43, 0], Array.from(sub));
const pub = D.mqttPublicar("t/x", "{\"a\":\"ç\"}", true);
const lidos = D.mqttLer(pub);
teste("PUBLISH guardado volta lido (com acento)", [3, "t/x", "{\"a\":\"ç\"}", true], [lidos.pacotes[0].tipo, lidos.pacotes[0].topico, lidos.pacotes[0].texto, lidos.pacotes[0].reter]);
// mensagem grande (trilha de 1 h) passa de 128 bytes: tamanho em 2 bytes
const grande = D.mqttPublicar("t/x", "x".repeat(3000), false);
teste("mensagem de 3 KB volta inteira", 3000, D.mqttLer(grande).pacotes[0].texto.length);
// o WebSocket entrega pedaços: metade agora, metade depois
const juntos = new Uint8Array(pub.length + grande.length);
juntos.set(pub); juntos.set(grande, pub.length);
const meio = D.mqttLer(juntos.slice(0, pub.length + 40));
teste("pacote partido: le o inteiro e guarda o resto", [1, 40], [meio.pacotes.length, meio.resto.length]);
const resto = new Uint8Array(meio.resto.length + juntos.length - pub.length - 40);
resto.set(meio.resto); resto.set(juntos.slice(pub.length + 40), meio.resto.length);
teste("e completa com o pedaço seguinte", [1, 3000, 0], [D.mqttLer(resto).pacotes.length, D.mqttLer(resto).pacotes[0].texto.length, D.mqttLer(resto).resto.length]);
teste("CONNACK aceito", [2, 0], [D.mqttLer(new Uint8Array([0x20, 2, 0, 0])).pacotes[0].tipo, D.mqttLer(new Uint8Array([0x20, 2, 0, 0])).pacotes[0].rc]);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
