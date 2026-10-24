// A corrida do desafio conduzida pelo app Android (tela travada no bolso):
// o motor que roda escondido (criarCorridaApp), a voz com o nome de cada um
// (narrarDesafio, falaLargada, falaChegada), e o pacote que volta à página.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
function funcao(nome) {
  const i = html.indexOf("function " + nome + "(");
  if (i < 0) { console.error("nao achei: " + nome); process.exit(1); }
  return html.slice(i, html.indexOf("\n}\n", i) + 3);
}
eval(pedaco("const LINK_APP", "\n") + "\n" + pedaco("const LINK_APK", "\n") + "\n" + pedaco("const PACOTE_ANDROID", "\n") + "\n" +
  pedaco("const num1 =", "\n") + "\n" +
  funcao("b64Codificar") + funcao("b64Decodificar") + funcao("b64UrlParaPadrao") + funcao("padraoParaB64Url") + funcao("textoDuracao") + funcao("plural") + funcao("falaRitmo") +
  pedaco("const BOLETIM_PADRAO", "\nfunction narrarVoz") +
  pedaco("// ---------------- PERCURSO NA RUA (GPS)", "// ---------------- FIM DAS CONTAS DO PERCURSO") +
  pedaco("// ---------------- DESAFIO: MOTOR", "// ---------------- FIM DO MOTOR DESAFIO") +
  "\nglobalThis.C = { criarCorridaApp, narrarDesafio, novoNarradorDesafio, falaLargada, falaChegada, situacaoDesafio, nomesDesafio, iniciaisDe, corDoParticipante," +
  " classificarDesafio, lerPacoteCorrida, regraBoletimDesafio, linkCorrida, mensagemDesafio, codificarTrilha };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = String(JSON.stringify(esperado)), b = String(JSON.stringify(obtido));
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(62) + b.slice(0, 80)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + b + "\n         esperava " + a); }
}
function contem(nome, texto, pedacoTxt) {
  const sim = String(texto || "").indexOf(pedacoTxt) >= 0;
  if (sim) { ok++; console.log("  ok   " + nome.padEnd(62) + String(texto).slice(0, 80)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(texto) + "\n         esperava conter " + JSON.stringify(pedacoTxt)); }
}
const META3K = { tipo: "distancia", alvo: 3000 };

console.log("--- os nomes ---");
teste("iniciais de dois nomes", "AP", C.iniciaisDe("Ana Paula"));
teste("iniciais de um nome", "BI", C.iniciaisDe("bia"));
teste("uma letra só", "B", C.iniciaisDe("B"));
teste("a mesma pessoa tem sempre a mesma cor", C.corDoParticipante("p123"), C.corDoParticipante("p123"));
teste("dois nomes", "Ana e Bia", C.nomesDesafio(["Ana", "Bia"]));
teste("três nomes", "Ana, Bia e Rui", C.nomesDesafio(["Ana", "Bia", "Rui"]));
teste("largada com os nomes", "Valendo! Desafio de 3 km com Ana e Bia.", C.falaLargada(META3K, ["Ana", "Bia"]));
contem("largada sozinho", C.falaLargada(META3K, []), "Por enquanto só você");

console.log("\n--- a corrida no app (esteira, relógio de mentira) ---");
let relogio = 1000000;
const publicado = [];
let aoPart = null;
const salaFalsa = { publicar: (m) => publicado.push(m), fechar() {}, manter() { this.mantida = (this.mantida || 0) + 1; } };
const motor = C.criarCorridaApp({ codigo: "ABCDE1", broker: 1, meta: META3K, atividade: "corrida", ambiente: "esteira", nome: "Carlos", id: "peu", kmh: 12, comeca: relogio + 3000 },
  { agora: () => relogio, conectar: (o) => { aoPart = o.aoParticipante; return salaFalsa; } });
// Ana e Bia na sala, correndo ao vivo: Ana a 10,8 km/h, Bia a 13,5 km/h
const trilhaDe = (v, t) => { const dist = typeof v === "function" ? v : (x) => (x / 1000) * v; const tr = [[0, 0]]; for (let x = 5000; x <= t; x += 5000) tr.push([x, dist(x)]); return tr; };
// Bia começa devagar e acelera aos 5 min: passa o Carlos
const bia = (x) => (x <= 300000 ? (x / 1000) * 3.1 : 930 + ((x - 300000) / 1000) * 4);
const anuncia = (id, nome, v, t, fim0) => { const dd = typeof v === "function" ? v(t) : (t / 1000) * v; const dist = typeof v === "function" ? v : (x) => (x / 1000) * v;
  let cruzou = 0; while (dist(cruzou) < 3000 && cruzou < t) cruzou += 500;
  const fim = fim0 || (dd >= 3000 ? { ms: cruzou, m: 3000 } : null); return aoPart(id, C.mensagemDesafio({ nome: nome, atividade: "corrida", st: fim ? "fim" : "correndo", t: t, d: typeof v === "function" ? v(t) : (t / 1000) * v,
  trilha: trilhaDe(v, t), fim: fim || null, dt: "x" })); };
anuncia("pana", "Ana", 3, 0); anuncia("pbia", "Bia", bia, 0);
let r = motor.tick();
teste("antes da largada, espera", 3, r.espera);
teste("e já publica que está na sala", "esperando", publicado[publicado.length - 1].st);
relogio += 3000;
r = motor.tick();
contem("na largada, os nomes de quem está na sala", r.falas.map((f) => f.texto).join(" | "), "Valendo! Desafio de 3 km com Ana e Bia.");
const todasFalas = [];
for (let s = 1; s <= 1000 && !r.fim; s++) {
  relogio += 1000;
  if (s % 5 === 0) { anuncia("pana", "Ana", 3, s * 1000); anuncia("pbia", "Bia", bia, s * 1000); }
  r = motor.tick();
  r.falas.forEach((f) => todasFalas.push(f.texto));
}
const ditas = todasFalas.join(" | ");
contem("no 1º km, a situação com o nome de cada um", ditas, "1 quilômetro em 5 minutos.");
contem("quem está atrás, pelo nome", ditas, "Ana ");
contem("quem passou, pelo nome", ditas, "Bia te passou");
contem("chegou", ditas, "Chegada! 3 km em 15 minutos");
teste("o km não vem depois da chegada", false, /Chegada![^|]*\| 3 quilômetros/.test(ditas));
contem("quem já tinha chegado, com o tempo", ditas, "Bia em ");
contem("e a posição no fim", ditas, "Você chegou em 2º de 3.");
teste("a corrida terminou nos 3 km", 3000, Math.round(motor.e.d));
teste("no tempo da esteira a 12 km/h", 900000, Math.round(motor.e.t));
teste("a última mensagem diz que acabou", "fim", publicado[publicado.length - 1].st);
teste("o retransmissor foi mantido pelo relógio do app", true, salaFalsa.mantida > 100);

console.log("\n--- pausar e encerrar ---");
relogio = 5000000;
const m2 = C.criarCorridaApp({ codigo: "ABCDE1", broker: 1, meta: META3K, atividade: "corrida", ambiente: "esteira", nome: "Carlos", id: "peu", kmh: 10, comeca: relogio },
  { agora: () => relogio, conectar: () => salaFalsa });
m2.tick();
for (let s = 0; s < 60; s++) { relogio += 1000; m2.tick(); }
m2.pausar();
for (let s = 0; s < 60; s++) { relogio += 1000; m2.tick(); }
teste("pausado, o tempo não anda", 60000, Math.round(m2.e.t));
m2.retomar();
for (let s = 0; s < 30; s++) { relogio += 1000; m2.tick(); }
teste("retomado, anda de novo", 90000, Math.round(m2.e.t));
teste("o app dormiu 30 s: conta no máximo 10", 100000, (relogio += 30000, m2.tick(), Math.round(m2.e.t)));
m2.encerrar();
r = m2.tick();
teste("encerrar devolve encerrado", true, r.encerrado);

console.log("\n--- a rua, com o GPS do Android ---");
relogio = 9000000;
const m3 = C.criarCorridaApp({ codigo: "ABCDE1", broker: 1, meta: { tipo: "distancia", alvo: 1000 }, atividade: "corrida", ambiente: "rua", nome: "Carlos", id: "peu", comeca: relogio },
  { agora: () => relogio, conectar: () => salaFalsa });
m3.tick();
// Avenida Paulista, 3 m/s para o leste
for (let s = 1; s <= 400 && !m3.e.fim; s++) {
  relogio += 1000;
  m3.gps(-23.5617, -46.6560 + (s * 3) / 102000, 5, relogio);
  m3.tick();
}
teste("1 km pelo GPS do Android", true, m3.e.fim && m3.e.d === 1000);
teste("perto de 5:33 (3 m/s)", true, Math.abs(m3.e.fim.ms - 333000) < 15000);

console.log("\n--- o pacote que volta à página ---");
const est = motor.estado();
const pac = C.lerPacoteCorrida(padraoParaB64Url(b64Codificar(JSON.stringify(est))), b64Decodificar);
teste("sala", "ABCDE1", pac.codigo);
teste("meta", META3K, pac.meta);
teste("nome", "Carlos", pac.nome);
teste("terminou", true, !!pac.fim && pac.fim.m === 3000);
teste("a trilha volta", true, pac.trilha.length > 100);
teste("lixo não abre", null, C.lerPacoteCorrida("%%%", b64Decodificar));
contem("o link chama o app", C.linkCorrida({ acao: "pausar" }), "intent://corrida?acao=pausar#Intent;scheme=treinolivre;package=br.com.treinolivre.app");

console.log("\n--- a voz da página: sem sinal, chegada de outro, entrada ---");
const n = C.novoNarradorDesafio();
const agora0 = 50000000;
const eu = { id: "peu", nome: "Carlos", eu: true, trilha: trilhaDe(3, 300000), fim: null, aoVivo: true, ts: agora0 };
const ana = { id: "pana", nome: "Ana", trilha: trilhaDe(3.5, 300000), fim: null, aoVivo: true, ts: agora0 - 90000, st: "correndo" };
const linhas = C.classificarDesafio([eu, ana], 300000, META3K, agora0);
const f1 = C.narrarDesafio(n, linhas, { t: 300000, d: 900 }, META3K, "peu", agora0).map((f) => f.texto).join(" | ");
contem("quem entrou depois da largada", f1, "Ana entrou no desafio agora.");
contem("sem sinal há mais de um minuto, pelo nome", f1, "Ana está sem sinal há mais de um minuto.");
const ana2 = Object.assign({}, ana, { fim: { ms: 400000, m: 3000 }, trilha: trilhaDe(3.5, 400000).concat([[400000, 3000]]), ts: agora0 + 200000 });
const l2 = C.classificarDesafio([Object.assign({}, eu, { trilha: trilhaDe(3, 500000) }), ana2], 500000, META3K, agora0 + 200000);
contem("chegada de outro, pelo nome", C.narrarDesafio(n, l2, { t: 500000, d: 1500 }, META3K, "peu", agora0 + 200000).map((f) => f.texto).join(" | "), "Ana cruzou a chegada em 6 minutos e 40 segundos.");

console.log("\n--- o boletim falado (tempo, distância, ritmo, amigos pelo nome) ---");
teste("sem ninguém escolher: a cada minuto", { tipo: "tempo", s: 60 }, C.regraBoletimDesafio({}));
teste("boletim desligado", null, C.regraBoletimDesafio({ boletim: 0 }));
teste("voz desligada, sem boletim", null, C.regraBoletimDesafio({ falar: false }));
teste("por distância, a cada 500 m", { tipo: "distancia", m: 500 }, C.regraBoletimDesafio({ boletimPor: "distancia", boletimM: 500 }));
function correr(regra, segundos) {
  relogio = 20000000;
  let ap = null;
  const m = C.criarCorridaApp({ codigo: "ABCDE1", broker: 1, meta: META3K, atividade: "corrida", ambiente: "esteira", nome: "Carlos", id: "peu", kmh: 12, comeca: relogio, boletim: regra },
    { agora: () => relogio, conectar: (o) => { ap = o.aoParticipante; return salaFalsa; } });
  const ana = (s) => ap("pana", C.mensagemDesafio({ nome: "Ana", atividade: "corrida", st: "correndo", t: s * 1000, d: s * 3.5, trilha: trilhaDe(3.5, s * 1000), fim: null, dt: "x" }));
  ana(0); m.tick();
  const ditas = [];
  for (let s = 1; s <= segundos; s++) { relogio += 1000; if (s % 5 === 0) ana(s); m.tick().falas.forEach((f) => ditas.push(f.texto)); }
  return ditas;
}
const porTempo = correr({ tipo: "tempo", s: 60 }, 130);
const b1 = porTempo.find((f) => /^1 minuto\./.test(f)) || "";
contem("aos 60 s vem o boletim: tempo", b1, "1 minuto.");
contem("a distância", b1, "200 metros.");
contem("o meu ritmo", b1, "Ritmo de 5 minutos por quilômetro");
contem("quanto falta", b1, "Faltam 2,8 quilômetros.");
contem("onde está a amiga, pelo nome", b1, "Ana ");
contem("e o ritmo dela", b1, "Ana está a 4 minutos e 4");
teste("dois boletins em 130 s", 2, porTempo.filter((f) => /Ritmo de/.test(f)).length);
const porDist = correr({ tipo: "distancia", m: 1000 }, 320);
const km1 = porDist.filter((f) => /^1 quilômetro/.test(f));
teste("por distância: um aviso só no km (não dois)", 1, km1.length);
contem("com a parcial do trecho", km1[0], "Este quilômetro em 5 minutos");
const semRegra = correr(null, 130);
teste("sem boletim, nada de minuto em minuto", 0, semRegra.filter((f) => /Ritmo de/.test(f)).length);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
