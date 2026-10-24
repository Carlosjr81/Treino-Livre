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
  trecho("const ehCardio = "), trecho("const numDe = "), trecho("const cargaDe = "), trecho("const repsDe = "),
  trecho("function plural("), trecho("const num1 = "), trecho("function segundaDaSemana("),
  trecho("const DESAFIO_LETRAS = "), trecho("function lerCodigoSala("),
  // a conta do aeróbico é coberta pelo teste-cardio; aqui só o km digitado
  "function medirCardio(s) { return { km: numDe(s.km) }; }",
  html.slice(ini, fim),
  trecho("function juntarGrupoRecebido("),
].join("\n");
eval(fonte + "\nglobalThis.G = { numerosDoGrupo, lerMembroGrupo, rankingGrupo, fraseGrupo, linkGrupo, lerPacoteGrupo, fmtMetricaGrupo, juntarGrupoRecebido, b64Decodificar };");

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

// quarta-feira, 22/10/2026, 20h (hora local)
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
teste("id esquisito fica de fora", ["ok12"], Object.keys(G.lerPacoteGrupo(mal1, G.b64Decodificar).membros));

console.log("\n[6] Juntar o grupo recebido");
const lista = [{ codigo: "ZZZZZ1", nome: "Outro", membros: {} }, { codigo: "ABCDE2", nome: "Meu nome", dono: true, membros: { ana001: { n: "Ana", ts: 9 } } }];
const junta = G.juntarGrupoRecebido(lista, pac);
teste("o recebido fica por último", ["ZZZZZ1", "ABCDE2"], junta.map((x) => x.codigo));
teste("quem criou mantém o nome", "Meu nome", junta[1].nome);
teste("o que já se sabia vence o link (é mais novo)", 9, junta[1].membros.ana001.ts);
teste("membro novo do link entra", true, !!junta[1].membros.carl01);
teste("grupo novo entra com o nome do link", "Galera do treino", G.juntarGrupoRecebido([], pac)[0].nome);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
