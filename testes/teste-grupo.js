// O desafio entre amigos em grupo: os meus números (numerosDoGrupo), o que
// chega dos outros (lerMembroGrupo), o ranking, a frase do líder e o link.
const html = require("./app").lerApp();

function trecho(inicio) {
  const i = html.indexOf(inicio);
  if (i < 0) { console.error("nao achei: " + inicio); process.exit(1); }
  if (/^function /.test(inicio)) return html.slice(i, html.indexOf("\n}\n", i) + 3);
  const resto = html.slice(i + 1);
  const m = resto.match(/\n(?=[^\s.)\]}])/);
  return html.slice(i, i + 1 + m.index + 1);
}
const ini = html.indexOf("// ==== GRUPO: DESAFIO ENTRE AMIGOS ====");
const fim = html.indexOf("// ==== FIM DO GRUPO ====");
if (ini < 0 || fim < 0) { console.error("nao achei o bloco do grupo"); process.exit(1); }

const fonte = [
  trecho("const LINK_APP = "), trecho("function b64Codificar("), trecho("function b64Decodificar("),
  trecho("function b64UrlParaPadrao("), trecho("function padraoParaB64Url("),
  trecho("const ehAquecimento = "), trecho("const serieConta = "), trecho("const ehTempo = "), trecho("const temValor = "),
  trecho("const ehCardio = "), trecho("const numDe = "), trecho("const segundosDe = "), trecho("const cargaDe = "), trecho("const repsDe = "),
  trecho("function plural("), trecho("const num1 = "), trecho("function segundaDaSemana("),
  trecho("const DESAFIO_LETRAS = "), trecho("function lerCodigoSala("),
  // a conta do aeróbico é coberta pelo teste-cardio; aqui só o km digitado
  "function medirCardio(s) { return { km: numDe(s.km) || numDe(s.vel) * numDe(s.segundos) / 3600 }; }",
  "const GRUPO_POR_EXERCICIO = { \"supino-reto\": \"peito\", agachamento: \"pernas\" };",
  html.slice(ini, fim),
].join("\n");
eval(fonte + "\nglobalThis.G = { falasFantasmaGrupo, falasAoVivoGrupo, textoCardioGrupo, metricasDoFoco, tipoCardioGrupo, minhasPosicoesGrupo, totaisGrupo, eventosGrupo, aplicarMembrosGrupo, falaGrupo, numerosDoGrupo, lerMembroGrupo, rankingGrupo, fraseGrupo, linkGrupo, lerPacoteGrupo, fmtMetricaGrupo, juntarGrupoRecebido, b64Decodificar };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = String(JSON.stringify(esperado)), b = String(JSON.stringify(obtido));
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(60) + b.slice(0, 70)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + b + "\n         esperava " + a); }
}
function contem(nome, texto, pedaco) {
  const sim = String(texto || "").indexOf(pedaco) >= 0;
  if (sim) { ok++; console.log("  ok   " + nome.padEnd(60) + String(texto).slice(0, 70)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + JSON.stringify(texto) + "\n         esperava conter " + JSON.stringify(pedaco)); }
}

// quinta-feira, 22/10/2026, 20h (hora local)
const agora = new Date(2026, 9, 22, 20, 0).getTime();
const dia = (d, h) => new Date(2026, 9, d, h || 10).toISOString();
const forca = (data, peso, reps, min) => ({ nome: "Peito", data, duracaoMin: min, itens: [{ series: [{ peso: String(peso), reps: String(reps) }, { peso: "20", reps: "10", aquec: true }] }] });
const corrida = (data, km, min) => ({ nome: "Corrida", data, duracaoMin: min, itens: [{ series: [{ segundos: min * 60, mod: "rua-corrida", km }] }] });
const hist = [
  forca(dia(13), 100, 10, 60),            // semana passada
  forca(dia(20), 80, 10, 50),             // segunda
  corrida(dia(21), 5.25, 30),             // terça
  forca(dia(22, 8), 50, 10, 400),         // hoje (teto de 300 min)
  forca(dia(23), 80, 10, 50),             // amanhã: ainda não aconteceu
];

console.log("\n[1] Os meus números");
const n = G.numerosDoGrupo(hist, agora);
teste("treinos no total (o de amanhã não conta)", 4, n.tt);
teste("treinos na semana (segunda a hoje)", 3, n.ts);
teste("volume da semana, sem aquecimento", 1300, n.vs);
teste("volume total", 2300, n.vt);
teste("minutos da semana, com o teto de 300", 380, n.ms);
teste("km da semana", 5.3, n.ks);
teste("sequência: segunda, terça e hoje", 3, n.sq);
teste("a semana é a de segunda", new Date(2026, 9, 19).getTime(), n.sem);
teste("último treino", "Peito", n.ul.n);
teste("sequência que acaba ontem ainda vale hoje", 2, G.numerosDoGrupo(hist.slice(0, 3), agora).sq);
teste("histórico vazio", { tt: 0, sq: 0, ts: 0 }, (({ tt, sq, ts }) => ({ tt, sq, ts }))(G.numerosDoGrupo([], agora)));

console.log("\n[2] O que chega dos outros");
teste("sem nome não entra", null, G.lerMembroGrupo({ tt: 3 }));
teste("lixo não entra", null, G.lerMembroGrupo("oi"));
const lido = G.lerMembroGrupo({ n: "  Ana  ", tt: "12", ts: -4, vs: 1e12, ks: 3.14159, ul: { d: 5, n: "Perna" }, extra: "<script>" });
teste("nome aparado", "Ana", lido.n);
teste("número em texto vira número", 12, lido.tt);
teste("negativo vira zero", 0, lido.ts);
teste("absurdo é limitado", 1e8, lido.vs);
teste("km com uma casa", 3.1, lido.ks);
teste("campo estranho fica de fora", undefined, lido.extra);
teste("último treino", "Perna", lido.ul.n);

console.log("\n[3] O ranking");
const sem = new Date(2026, 9, 19).getTime();
const membros = {
  eu: { n: "Carlos", ts: 3, tt: 50, sq: 3, sem },
  ana: { n: "Ana", ts: 4, tt: 20, sq: 1, sem },
  bia: { n: "Bia", ts: 3, tt: 80, sq: 9, sem },
  rui: { n: "Rui", ts: 6, tt: 90, sq: 0, sem: sem - 7 * 86400000 },  // número da semana passada
};
const r = G.rankingGrupo(membros, "ts", agora);
teste("ordem: Ana, Bia e eu empatados (desempate pelo total), Rui zerado", ["ana", "bia", "eu", "rui"], r.map((x) => x.id));
teste("posições com empate", [1, 2, 2, 4], r.map((x) => x.pos));
teste("semana passada vale zero na semana nova", 0, r[3].valor);
teste("sequência não depende da semana", ["bia", "eu", "ana", "rui"], G.rankingGrupo(membros, "sq", agora).map((x) => x.id));
teste("métrica desconhecida cai na primeira", 4, G.rankingGrupo(membros, "xx", agora)[0].valor);

console.log("\n[4] A frase do líder");
contem("outro lidera", G.fraseGrupo(r, "eu", "ts"), "Ana lidera com 4 treinos");
contem("quanto falta e a posição", G.fraseGrupo(r, "eu", "ts"), "Você está a 1 treino da liderança (2º)");
contem("eu lidero", G.fraseGrupo(r, "ana", "ts"), "Você lidera com 4 treinos. Bia vem atrás, a 1 treino.");
const emp = G.rankingGrupo({ eu: { n: "Eu", ts: 2, sem }, ana: { n: "Ana", ts: 2, sem } }, "ts", agora);
contem("liderança dividida", G.fraseGrupo(emp, "eu", "ts"), "divide a liderança com Ana");
contem("ninguém pontuou", G.fraseGrupo(G.rankingGrupo({ eu: { n: "Eu", ts: 0, sem } }, "ts", agora), "eu", "ts"), "Ninguém pontuou");
teste("lista vazia", "", G.fraseGrupo([], "eu", "ts"));
teste("volume em toneladas", "2,5 t", G.fmtMetricaGrupo("vs", 2500));
teste("sequência no singular", "1 dia seguido", G.fmtMetricaGrupo("sq", 1));

console.log("\n[5] O link (#grupo=)");
const link = G.linkGrupo({ codigo: "ABCDE2", nome: "Galera do treino", membros: { carl01: { n: "Carlos", ts: 3, sem }, ana001: { n: "Ana", ts: 4, sem } } });
contem("endereço do app", link, "https://carlosjr81.github.io/Treino-Livre/#grupo=");
teste("sem caracteres que quebram o link", false, /[+/=]/.test(link.split("#grupo=")[1]));
const pac = G.lerPacoteGrupo(link.split("#grupo=")[1], G.b64Decodificar);
teste("código volta", "ABCDE2", pac.codigo);
teste("nome volta", "Galera do treino", pac.nome);
teste("membros voltam", ["carl01", "ana001"], Object.keys(pac.membros));
teste("números voltam", 4, pac.membros.ana001.ts);
teste("código inválido não abre", null, G.lerPacoteGrupo(Buffer.from(JSON.stringify({ c: "OI", m: [] })).toString("base64"), G.b64Decodificar));
teste("lixo não abre", null, G.lerPacoteGrupo("%%%", G.b64Decodificar));
const mal1 = Buffer.from(JSON.stringify({ c: "ABCDE2", m: [{ i: "../x", n: "Hack" }, { i: "ok12", n: "Bom" }] })).toString("base64");
const mal2 = Buffer.from(JSON.stringify({ c: "ABCDE2", m: [{ i: "sala", n: "Galera" }] })).toString("base64");
teste("\"sala\" é o nome do desafio, não gente", [], Object.keys(G.lerPacoteGrupo(mal2, G.b64Decodificar).membros));
teste("id esquisito fica de fora", ["ok12"], Object.keys(G.lerPacoteGrupo(mal1, G.b64Decodificar).membros));

console.log("\n[6] Juntar o grupo recebido");
const lista = [{ codigo: "ZZZZZ1", nome: "Outro", membros: {} }, { codigo: "ABCDE2", nome: "Meu nome", dono: true, membros: { ana001: { n: "Ana", ts: 9 } } }];
const junta = G.juntarGrupoRecebido(lista, pac);
teste("o recebido fica por último", ["ZZZZZ1", "ABCDE2"], junta.map((x) => x.codigo));
teste("quem criou mantém o nome", "Meu nome", junta[1].nome);
teste("o que já se sabia vence o link (é mais novo)", 9, junta[1].membros.ana001.ts);
teste("membro novo do link entra", true, !!junta[1].membros.carl01);
teste("grupo novo entra com o nome do link", "Galera do treino", G.juntarGrupoRecebido([], pac)[0].nome);

console.log("\n[7] Os números a mais");
const sup = (data, peso) => ({ nome: "Peito", data, duracaoMin: 40, itens: [{ exercicioId: "supino-reto", series: [{ peso: String(peso), reps: "8" }, { peso: String(peso), reps: "8" }] }] });
const h2 = [sup(dia(12), 60), sup(dia(14), 70), sup(dia(20), 70), sup(dia(21), 75), sup(dia(22, 9), 80)];
const n2 = G.numerosDoGrupo(h2, agora);
teste("recordes na semana (75 e 80 passaram de 70)", 2, n2.pr);
teste("séries na semana", 6, n2.se);
teste("treinos da semana passada", 2, n2.sa);
teste("dias da semana: terça, quarta e quinta (bits 1, 2 e 3)", 14, n2.ds);
teste("dias treinados", 3, n2.dd);
teste("grupo que mais treinou", "peito", n2.gs);
teste("último treino com minutos e volume", { min: 40, v: 1280 }, { min: n2.ul.min, v: n2.ul.v });
teste("o primeiro registro não é recorde", 0, G.numerosDoGrupo([sup(dia(20), 50)], agora).pr);
const lm = G.lerMembroGrupo({ n: "Bia", ds: 999, gs: "<x>", se: 12, ul: { d: 1, n: "A", min: 9999 } });
teste("dias fora da semana são cortados", 127, lm.ds);
teste("grupo esquisito fica de fora", undefined, lm.gs);
teste("minutos do último limitados", 300, lm.ul.min);

console.log("\n[8] Você em cada ranking e os totais");
const ps = G.minhasPosicoesGrupo(membros, "eu", agora);
teste("uma linha por régua", 14, ps.length);
teste("treinos: 2º, falta 1 para a Ana", { pos: 2, alvo: { n: "Ana", falta: 1 } }, { pos: ps[0].pos, alvo: ps[0].alvo });
const psq = ps.find((x) => x.met.id === "sq");
teste("sequência: alvo é quem está logo acima (Bia, 6)", { n: "Bia", falta: 6 }, psq.alvo);
teste("quem não está no grupo não tem posição", [], G.minhasPosicoesGrupo(membros, "zzz", agora));
const tot = G.totaisGrupo(membros, agora);
teste("totais só da semana (Rui é da passada)", { ts: 10, ativos: 3, pessoas: 4 }, { ts: tot.ts, ativos: tot.ativos, pessoas: tot.pessoas });

console.log("\n[9] O mural");
const A = { eu: { n: "Carlos", ts: 3, tt: 10, sq: 2, sem }, ana1: { n: "Ana", ts: 2, tt: 8, sq: 4, pr: 0, sem } };
const D = { eu: A.eu, ana1: { n: "Ana", ts: 4, tt: 9, sq: 5, pr: 1, sem, ul: { d: agora, n: "Perna", min: 50, v: 6200, km: 0 } }, bia1: { n: "Bia", ts: 1, tt: 1, sem } };
const ev = G.eventosGrupo(A, D, "eu", agora);
const txts = ev.map((e) => e.txt);
contem("quem entrou", txts.join("|"), "Bia entrou no desafio");
contem("quem treinou, com os números", txts.join("|"), "Ana treinou: Perna · 50 min · 6,2 t");
contem("recorde", txts.join("|"), "Ana bateu um recorde de carga");
contem("marco da sequência", txts.join("|"), "Ana chegou a 5 dias seguidos");
contem("quem me passou", txts.join("|"), "Ana passou você em treinos na semana (4 a 3)");
contem("nova líder", txts.join("|"), "Ana assumiu a liderança");
teste("o que mexe comigo vem marcado", 2, ev.filter((e) => e.eu).length);
const ev2 = G.eventosGrupo(D, Object.assign({}, D, { eu: { n: "Carlos", ts: 5, tt: 12, sq: 3, sem } }), "eu", agora).map((e) => e.txt).join("|");
contem("eu passei", ev2, "Você passou Ana em treinos na semana (5 a 4)");
contem("eu assumi", ev2, "Você assumiu a liderança");
contem("vários treinos de uma vez", G.eventosGrupo(A, Object.assign({}, A, { ana1: Object.assign({}, D.ana1, { tt: 11 }) }), "eu", agora).map((e) => e.txt).join("|"), "Ana treinou 3 vezes; o último: Perna");
teste("nada mudou, nada no mural", [], G.eventosGrupo(D, D, "eu", agora));
teste("virada de semana não é ultrapassagem", 0, G.eventosGrupo(
  { eu: { n: "C", ts: 5, tt: 5, sem: sem - 7 * 86400000 }, ana1: { n: "A", ts: 1, tt: 5, sem: sem - 7 * 86400000 } },
  { eu: { n: "C", ts: 5, tt: 5, sem: sem - 7 * 86400000 }, ana1: { n: "A", ts: 0, tt: 5, sem } }, "eu", agora).length);
const ap = G.aplicarMembrosGrupo({ codigo: "ABCDE2", membros: A, feed: [{ em: 1, ico: "x", txt: "velho" }] }, { ana1: D.ana1 }, "eu", agora);
teste("o mural guarda o novo na frente", "velho", ap.g.feed[ap.g.feed.length - 1].txt);
teste("e com a hora", agora, ap.g.feed[0].em);

console.log("\n[10] O Jarvis");
contem("posição e quanto falta", G.falaGrupo({ nome: "Galera", membros }, "eu", agora), "você está em 2º de 4 em treinos na semana, com 3. Para passar Ana, falta 1 treino.");
contem("liderando em outras réguas", G.falaGrupo({ nome: "Galera", membros }, "bia", agora), "Você também lidera em");
contem("sozinho", G.falaGrupo({ nome: "G", membros: { eu: membros.eu } }, "eu", agora), "só tem você");
contem("sem apelido", G.falaGrupo({ nome: "G", membros: {} }, "eu", agora), "ainda não entrou");

console.log("\n[11] Corrida e caminhada");
const rua = (data, km, min, mod) => ({ nome: "Corrida na rua", data, duracaoMin: min, rota: mod === "rua-corrida" ? { km } : undefined,
  itens: [{ exercicioId: "corrida-rua", series: [{ segundos: String(min * 60), mod: mod || "rua-corrida", km: String(km) }] }] });
const est = (data, kmh, min) => ({ nome: "Esteira", data, duracaoMin: min, itens: [{ exercicioId: "esteira-corrida", series: [{ segundos: String(min * 60), mod: "corrida", vel: String(kmh) }] }] });
const hc = [rua(dia(20), 5, 30), est(dia(21), 10, 30), rua(dia(22, 9), 3, 30, "rua-caminhada"), rua(dia(13), 20, 120)];
const nc = G.numerosDoGrupo(hc, agora);
teste("km na semana (rua + esteira)", 13, nc.ks);
teste("km na rua", 8, nc.kr);
teste("km na esteira", 5, nc.ke);
teste("minutos de aeróbico", 90, nc.mc);
teste("maior distância da semana", 5, nc.lg);
teste("melhor ritmo: 6:00 /km (a esteira a 10 km/h e a rua a 6:00 empatam)", 360, nc.rp);
teste("última atividade: a caminhada de hoje", { t: "rua-caminhada", km: 3, s: 1800 }, { t: nc.uc.t, km: nc.uc.km, s: nc.uc.s });
teste("o tipo da série: esteira a 12 km/h é corrida", "esteira-corrida", G.tipoCardioGrupo({ vel: "12" }, {}));
teste("bicicleta na rua", "rua-bike", G.tipoCardioGrupo({ mod: "bike-rua" }, {}));
teste("elíptico é aparelho", "aparelho", G.tipoCardioGrupo({ mod: "eliptico" }, {}));
contem("a frase da corrida", G.textoCardioGrupo({ t: "rua-corrida", km: 5.2, s: 1710 }), "correu 5,2 km na rua em 28:30 (5:29 /km)");
contem("o aparelho tem nome", G.textoCardioGrupo({ t: "aparelho", nm: "Elíptico", km: 0, s: 1200 }), "fez Elíptico por 20:00");
teste("ritmo vira texto", "5:29 /km", G.fmtMetricaGrupo("rp", 329));
teste("o foco corrida põe as réguas de km primeiro", ["ks", "kr", "ke"], G.metricasDoFoco("corrida").slice(0, 3).map((x) => x.id));
const mr = { eu: { n: "Eu", rp: 330, sem }, ana1: { n: "Ana", rp: 300, sem }, bia1: { n: "Bia", rp: 0, sem } };
teste("ritmo: o menor ganha, e sem atividade vai por último", ["ana1", "eu", "bia1"], G.rankingGrupo(mr, "rp", agora).map((x) => x.id));
const pr2 = G.minhasPosicoesGrupo(mr, "eu", agora).find((x) => x.met.id === "rp");
teste("quanto falta no ritmo", { n: "Ana", falta: 30 }, pr2.alvo);
contem("a frase do ritmo", G.fraseGrupo(G.rankingGrupo(mr, "rp", agora), "eu", "rp"), "Você está a 30 s/km da liderança");
teste("quem não tem ritmo não tem alvo", null, G.minhasPosicoesGrupo(mr, "bia1", agora).find((x) => x.met.id === "rp").alvo);

console.log("\n[12] O mural da corrida e o ao vivo");
const C1 = { eu: { n: "Carlos", ks: 5, tt: 3, sem }, ana1: { n: "Ana", ks: 4, tt: 3, sem } };
const C2 = { eu: C1.eu, ana1: { n: "Ana", ks: 9.2, tt: 4, sem, ul: { d: agora, n: "Corrida na rua" }, uc: { d: agora, t: "rua-corrida", km: 5.2, s: 1710 } } };
const evc = G.eventosGrupo(C1, C2, "eu", agora, "ks").map((e) => e.txt).join("|");
contem("a corrida no mural", evc, "Ana correu 5,2 km na rua em 28:30 (5:29 /km)");
teste("e não repete como treino", false, /Ana treinou/.test(evc));
contem("passou em km", evc, "Ana passou você em km na semana (9,2 km a 5 km)");
const C3 = { eu: C1.eu, ana1: Object.assign({}, C1.ana1, { ag: { t: "esteira-corrida", km: 1.2, s: 400, em: agora - 3000 } }) };
contem("começou agora", G.eventosGrupo(C1, C3, "eu", agora, "ks").map((e) => e.txt).join("|"), "Ana começou agora: correndo na esteira");
const lidoAg = G.lerMembroGrupo({ n: "Ana", ag: { t: "rua-corrida", km: 2, s: 600, em: 5 }, uc: { t: "x", d: 1 } });
teste("ao vivo lido", "rua-corrida", lidoAg.ag.t);
teste("tipo desconhecido fica de fora", undefined, lidoAg.uc);

const viv = { frente: {}, perto: {}, vivo: {} };
const VM = { eu: { n: "Carlos", ks: 4, sem }, ana1: { n: "Ana", ks: 5, sem }, bia1: { n: "Bia", ks: 2, sem, ag: { t: "rua-corrida", km: 1.5, s: 500, em: agora - 2000 } } };
const f0 = G.falasAoVivoGrupo(viv, VM, "eu", 0, agora).join(" ");
contem("quem mais está correndo", f0, "Bia também está correndo na rua agora, com 1,5 quilômetros.");
teste("no começo não anuncia ultrapassagem", false, /passou/.test(f0));
const f1 = G.falasAoVivoGrupo(viv, VM, "eu", 0.6, agora).join(" ");
contem("falta pouco", f1, "Faltam 400 metros para passar Ana");
teste("e diz uma vez só", "", G.falasAoVivoGrupo(viv, VM, "eu", 0.7, agora).join(" "));
contem("passou", G.falasAoVivoGrupo(viv, VM, "eu", 1.1, agora).join(" "), "Você passou Ana nos quilômetros da semana!");
teste("o tremor do GPS não troca de novo", "", G.falasAoVivoGrupo(viv, VM, "eu", 0.99, agora).join(" "));
const VM2 = Object.assign({}, VM, { bia1: Object.assign({}, VM.bia1, { ag: Object.assign({}, VM.bia1.ag, { km: 4 }) }) });
contem("quem corre junto e me passa", G.falasAoVivoGrupo(viv, VM2, "eu", 1.5, agora).join(" "), "Bia passou você nos quilômetros da semana. Acelera!");
teste("ao vivo velho não vale", "", G.falasAoVivoGrupo({ frente: {}, perto: {}, vivo: {} }, { eu: VM.eu, bia1: Object.assign({}, VM.bia1, { ag: { t: "rua-corrida", km: 1, em: agora - 300000 } }) }, "eu", 0, agora).join(" "));
contem("o Jarvis fala dos km e de quem corre agora", G.falaGrupo({ nome: "Galera", foco: "corrida", membros: VM }, "eu", agora), "em km na semana, com 4 quilômetros. Para passar Ana, falta 1 quilômetros. Agora: Bia está correndo na rua.");
const lkc = G.lerPacoteGrupo(G.linkGrupo({ codigo: "ABCDE2", nome: "Corrida", foco: "corrida", membros: {} }).split("#grupo=")[1], G.b64Decodificar);
teste("o foco viaja no link", "corrida", lkc.foco);
teste("e entra no grupo recebido", "corrida", G.juntarGrupoRecebido([], lkc)[0].foco);

console.log("\n[13] Academia ao vivo e horários diferentes");
const novoEst = () => ({ frente: {}, perto: {}, vivo: {}, passouTreino: {}, passouDist: {}, kmFantasma: 0 });
const AM = { eu: { n: "Carlos", vs: 3000, sem }, ana1: { n: "Ana", vs: 3200, sem, ul: { d: agora - 86400000, n: "Peito", v: 2500 },
  ag: { t: "academia", se: 6, vo: 1500, em: agora - 5000 } }, bia1: { n: "Bia", vs: 2000, sem, ul: { d: agora - 20 * 86400000, n: "Perna", v: 900 } } };
const ea = novoEst();
const a0 = G.falasAoVivoGrupo(ea, AM, "eu", 0, agora, "vs").join(" ");
contem("quem está na academia agora", a0, "Ana também está treinando na academia agora, com 6 séries.");
contem("falta pouco no volume (com o de agora dela)", G.falasAoVivoGrupo(ea, AM, "eu", 1450, agora, "vs").join(" "), "Faltam 250 quilos para passar Ana no volume da semana.");
contem("passou no volume", G.falasAoVivoGrupo(ea, AM, "eu", 1800, agora, "vs").join(" "), "Você passou Ana no volume da semana!");
const fa = novoEst();
teste("ainda não passou o último treino", "", G.falasFantasmaGrupo(fa, AM, "eu", { t: "academia", vol: 2400 }, agora).join(" "));
contem("passou o volume do último treino dela", G.falasFantasmaGrupo(fa, AM, "eu", { t: "academia", vol: 2600 }, agora).join(" "), "Você passou o volume do último treino de Ana: 2,5 toneladas.");
teste("uma vez só, e treino de 20 dias atrás não conta", "", G.falasFantasmaGrupo(fa, AM, "eu", { t: "academia", vol: 9000 }, agora).join(" "));
const CM = { eu: { n: "Carlos" }, ana1: { n: "Ana", uc: { d: agora - 2 * 86400000, t: "rua-corrida", km: 5, s: 1800 } },
  bia1: { n: "Bia", uc: { d: agora - 86400000, t: "rua-caminhada", km: 4, s: 2400 } } };
const fc = novoEst();
teste("antes do 1º km, nada", "", G.falasFantasmaGrupo(fc, CM, "eu", { t: "esteira-corrida", km: 0.9, seg: 320 }, agora).join(" "));
contem("no mesmo tempo, a corrida dela (a caminhada da Bia não entra)", G.falasFantasmaGrupo(fc, CM, "eu", { t: "esteira-corrida", km: 1.05, seg: 360 }, agora).join(" "),
  "No mesmo tempo, na última corrida de Ana, eram 1 quilômetro: você está 50 metros à frente.");
contem("atrás", G.falasFantasmaGrupo(fc, CM, "eu", { t: "esteira-corrida", km: 2, seg: 800 }, agora).join(" "), "você está 220 metros atrás.");
contem("passou a distância toda dela", G.falasFantasmaGrupo(fc, CM, "eu", { t: "rua-corrida", km: 5.1, seg: 1900 }, agora).join(" "), "Você passou os 5 quilômetros da última corrida de Ana.");
teste("pedalada não compara com corrida", "", G.falasFantasmaGrupo(novoEst(), CM, "eu", { t: "rua-bike", km: 3, seg: 600 }, agora).join(" "));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
