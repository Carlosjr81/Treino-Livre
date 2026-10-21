// A saúde que vem do Health Connect (o app Android). O pacote chega por link,
// então tudo é dado de fora: o teste cobra que lixo não entra, que um erro não
// apaga o que já estava na tela, e que o mesmo treino não vai duas vezes.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const PACOTE_ANDROID = "br.com.treinolivre.app", LINK_APK = "https://github.com/carlosjr81/Treino-Livre/releases/latest/download/treino-livre.apk";
eval(pedaco("// ---- SAÚDE: o que vem do Health Connect", "// ---- fim da saúde").replace(/^const (LINK_APK|PACOTE_ANDROID) .*$/gm, "") +
  "\nglobalThis.H = { semRepetir, lerPacoteSaude, juntarSaude, resumoSaude, treinosParaSaude, batimentoNosTreinos, b64UrlParaPadrao, padraoParaB64Url, diaLocal };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
// o mesmo par que o app usa (UTF-8 em base64)
const cod = (s) => Buffer.from(s, "utf8").toString("base64");
const dec = (s) => Buffer.from(s, "base64").toString("utf8");
const link = (obj) => H.padraoParaB64Url(cod(JSON.stringify(obj)));

const AGORA = new Date(2026, 9, 21, 15, 0).getTime();   // quarta, 21/10/2026, 15h
const DIA = 86400000;
const d = (i) => H.diaLocal(AGORA - i * DIA);

console.log("--- o link ---");
const bruto = cod(JSON.stringify({ v: 1, x: "çã??>>" }));
teste("base64url volta ao padrão", bruto, H.b64UrlParaPadrao(H.padraoParaB64Url(bruto)));
teste("base64url não tem + / =", false, /[+/=]/.test(H.padraoParaB64Url(bruto)));

console.log("\n--- o pacote ---");
teste("lixo não é pacote", null, H.lerPacoteSaude("%%%", dec));
teste("versão desconhecida não é pacote", null, H.lerPacoteSaude(link({ v: 2 }), dec));
const pac = H.lerPacoteSaude(link({
  v: 1, em: AGORA,
  dias: [
    { d: d(1), passos: 9500, m: 7100, kcal: 380, fc: 72, fcMin: 51, fcMax: 141 },
    { d: d(0), passos: 4200, m: 3000, kcal: 150, fc: 70, fcMin: 55, fcMax: 120 },
    { d: "ontem", passos: 1 },
    { d: d(2), passos: -5, fc: 900 },
  ],
  sono: [{ ini: AGORA - 15 * 3600000, fim: AGORA - 8 * 3600000 }, { ini: AGORA, fim: AGORA - 1 }],
  peso: [{ t: AGORA - 40 * DIA, kg: 84 }, { t: AGORA - DIA, kg: 81.5 }, { t: AGORA, kg: 5000 }],
  repouso: [{ t: AGORA - DIA, bpm: 58 }],
  spo2: [{ t: AGORA - 2 * DIA, pct: 95 }, { t: AGORA - DIA, pct: 97 }, { t: AGORA, pct: 40 }],
  vfc: [{ t: AGORA - 20 * DIA, ms: 90 }, { t: AGORA - 2 * DIA, ms: 60 }, { t: AGORA - DIA, ms: 40 }],
  atividades: [{ ini: AGORA - 5 * 3600000, fim: AGORA - 4 * 3600000, tipo: "corrida", nome: "Corrida", app: "com.sec.android.app.shealth", lixo: "<script>" }],
  enviados: ["t1"],
  fcTreinos: [{ id: "t2", medio: 128, max: 166, amostras: 300 }, { id: "t3", medio: 0, max: 0 }],
  codigo: "alert(1)",
}), dec);
teste("dia com data torta fica de fora", [d(1), d(0), d(2)], pac.dias.map((x) => x.d));
teste("número impossível vira vazio", [null, null], [pac.dias[2].passos, pac.dias[2].fc]);
teste("sono ao contrário fica de fora", 1, pac.sono.length);
teste("peso impossível fica de fora", 2, pac.peso.length);
teste("atividade: só os campos conhecidos", ["ini", "fim", "tipo", "nome", "app"], Object.keys(pac.atividades[0]));
teste("campo desconhecido não entra", undefined, pac.codigo);
teste("batimento do treino sem número fica de fora", ["t2"], pac.fcTreinos.map((x) => x.id));

console.log("\n--- juntar ---");
const antes = { em: 1, dias: [{ d: d(5), passos: 1 }], enviados: ["t0"] };
const junto = H.juntarSaude(antes, pac);
teste("a lista do que já foi enviado só cresce", ["t0", "t1"], junto.enviados);
teste("os números novos substituem os velhos", 3, junto.dias.length);
const comErro = H.juntarSaude(junto, { em: 2, erro: "sem-permissao", enviados: [] });
teste("um erro não apaga o que estava na tela", [3, "sem-permissao", ["t0", "t1"]], [comErro.dias.length, comErro.erro, comErro.enviados]);
teste("a próxima leitura boa limpa o erro", null, H.juntarSaude(comErro, pac).erro);

console.log("\n--- o resumo ---");
const r = H.resumoSaude(junto, AGORA);
teste("passos e km de hoje", [4200, 3], [r.passosHoje, r.kmHoje]);
teste("sete dias, o último é hoje", [7, d(0), 4200], [r.semana.length, r.semana[6].d, r.semana[6].passos]);
teste("média só dos dias com passos", 6850, r.mediaPassos);
teste("a noite conta no dia em que a pessoa acordou: 7 h", 420, r.ultimaNoite);
teste("peso: o último, e a diferença de um mês atrás", { kg: 81.5, dif: -2.5 }, { kg: r.peso.kg, dif: r.peso.dif });
teste("batimento de hoje", { med: 70, min: 55, max: 120 }, r.fcHoje);
teste("repouso", 58, r.repouso);
teste("oxigenação impossível fica de fora; a última e a média", { ultima: 97, t: AGORA - DIA, media: 96 }, r.spo2);
teste("VFC: a média é só da semana", { ultima: 40, t: AGORA - DIA, media: 50 }, r.vfc);
teste("sem leitura nenhuma, sem resumo", null, H.resumoSaude(null, AGORA));
const soPeso = H.resumoSaude({ dias: [], peso: [{ t: AGORA, kg: 80 }] }, AGORA);
teste("um peso só: sem diferença inventada", null, soPeso.peso.dif);

const M = 60000;
const dup = H.semRepetir([
  { ini: AGORA - 60 * M, fim: AGORA - 49 * M, app: "com.sec.android.app.shealth" },
  { ini: AGORA - 59 * M, fim: AGORA - 48 * M, app: "com.google.android.apps.fitness" },
  { ini: AGORA - 300 * M, fim: AGORA - 278 * M, app: "com.sec.android.app.shealth" },
  { ini: AGORA - 301 * M, fim: AGORA - 245 * M, app: "com.google.android.apps.fitness" },
]);
teste("a mesma caminhada em dois apps vira uma; durações bem diferentes ficam", 3, dup.length);

console.log("\n--- o que vai para o Health Connect ---");
const ex = { esteira: { cardio: "corrida" }, bike: { cardio: "bike" }, supino: {} };
const hist = [
  { id: "a", nome: "Peito", data: new Date(AGORA - 2 * 3600000).toISOString(), duracaoMin: 60, itens: [{ exercicioId: "supino" }, { exercicioId: "esteira" }] },
  { id: "b", nome: "Corrida", data: new Date(AGORA - DIA).toISOString(), duracaoMin: 30, itens: [{ exercicioId: "esteira" }] },
  { id: "c", nome: "Bike", data: new Date(AGORA - 2 * DIA).toISOString(), duracaoMin: 40, itens: [{ exercicioId: "bike" }], bpm: { medio: 130, max: 160 } },
  { id: "velho", nome: "X", data: new Date(AGORA - 40 * DIA).toISOString(), duracaoMin: 40, itens: [] },
];
const vai = H.treinosParaSaude(hist, ["b", "c"], (id) => ex[id], AGORA);
teste("mais de 30 dias fica de fora; enviado e com batimento também", ["a", "b"], vai.map((x) => x.id));
teste("musculação com esteira no fim é musculação", "musculacao", vai[0].tipo);
teste("só esteira é corrida", "corrida", vai[1].tipo);
teste("o já enviado vai só buscar batimento (não grava de novo)", [true, false], vai.map((x) => x.g));
teste("o começo é o fim menos a duração", 60 * 60000, vai[0].fim - vai[0].ini);

console.log("\n--- o batimento do relógio nos treinos ---");
const b = H.batimentoNosTreinos(hist, [{ id: "a", medio: 121.4, max: 150, amostras: 200 }, { id: "c", medio: 90, max: 100 }]);
teste("o treino sem batimento ganha o do relógio", { medio: 121, max: 150, amostras: 200, fonte: "relogio" }, b.historico[0].bpm);
teste("o treino que já tinha batimento fica com o dele", 130, b.historico[2].bpm.medio);
teste("conta quantos mudaram", 1, b.mudou);
teste("nada a mudar: a mesma lista (sem regravar)", true, H.batimentoNosTreinos(hist, []).historico === hist);

console.log("\n--- os óculos Meta ---");
eval(pedaco("// ---- ÓCULOS META", "// ---- fim dos óculos").replace(/^const /gm, "var ") + "\nglobalThis.O = { novaChaveOculos, linkOculos, enderecoOculos, ESTADOS_OCULOS };");
const ch = O.novaChaveOculos();
teste("a chave: 24 letras hexadecimais, sorteada a cada vez", [true, false], [/^[0-9a-f]{24}$/.test(ch), ch === O.novaChaveOculos()]);
teste("o link abre o app pelo esquema treinolivre://oculos, com a chave", true, O.linkOculos(ch).startsWith("intent://oculos?k=" + ch + "#Intent;scheme=treinolivre;package=br.com.treinolivre.app;"));
teste("sem o app, o Chrome baixa o APK", true, O.linkOculos(ch).includes("S.browser_fallback_url=" + encodeURIComponent("https://github.com/carlosjr81/Treino-Livre/releases/latest/download/treino-livre.apk")));
teste("o quadro vem só do próprio aparelho (127.0.0.1)", "http://127.0.0.1:47890/quadro.jpg?k=" + ch, O.enderecoOculos("/quadro.jpg", ch));
teste("todo estado que o app manda tem frase", true, ["iniciando", "registrando", "permissao", "procurando", "conectando", "transmitindo", "sem-oculos", "sem-permissao", "erro"].every((e) => !!O.ESTADOS_OCULOS[e]));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
