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
  "\nglobalThis.H = { semRepetir, lerPacoteSaude, juntarSaude, resumoSaude, treinosParaSaude, batimentoNosTreinos, b64UrlParaPadrao, padraoParaB64Url, diaLocal, analiseCoracao, resumoCurvaFc, textoRecuperacao };");

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
teste("mais de 30 dias fica de fora; o de 2 dias com cinta ainda busca a curva do relógio", ["a", "b", "c"], vai.map((x) => x.id));
teste("enviado, com batimento e com mais de 3 dias, sem curva: não vai mais", [], H.treinosParaSaude([{ ...hist[2], data: new Date(AGORA - 5 * DIA).toISOString() }], ["c"], (id) => ex[id], AGORA).map((x) => x.id));
teste("com a curva já guardada: não vai mais", [], H.treinosParaSaude([{ ...hist[2], fcRelogio: { ini: 1, p: 15, v: [1] } }], ["c"], (id) => ex[id], AGORA).map((x) => x.id));
teste("musculação com esteira no fim é musculação", "musculacao", vai[0].tipo);
teste("só esteira é corrida", "corrida", vai[1].tipo);
teste("o já enviado vai só buscar batimento (não grava de novo)", [true, false, false], vai.map((x) => x.g));
teste("o começo é o fim menos a duração", 60 * 60000, vai[0].fim - vai[0].ini);

console.log("\n--- o batimento do relógio nos treinos ---");
const b = H.batimentoNosTreinos(hist, [{ id: "a", medio: 121.4, max: 150, amostras: 200 }, { id: "c", medio: 90, max: 100 }]);
teste("o treino sem batimento ganha o do relógio", { medio: 121, max: 150, amostras: 200, fonte: "relogio" }, b.historico[0].bpm);
teste("o treino que já tinha batimento fica com o dele", 130, b.historico[2].bpm.medio);
teste("conta quantos mudaram", 1, b.mudou);
teste("nada a mudar: a mesma lista (sem regravar)", true, H.batimentoNosTreinos(hist, []).historico === hist);

console.log("\n--- a curva do relógio e o coração no treino ---");
{
  // um treino de 30 min que acabou em FIM; a curva vai 3 min além, em blocos de 15 s
  const FIM = AGORA - DIA, INI = FIM - 30 * 60000, P = 15;
  const n = Math.floor((FIM + 180000 - INI) / 1000 / P) + 1;
  const v = [];
  for (let k = 0; k < n; k++) {
    const t = INI + k * P * 1000;
    let b = t <= FIM ? 100 + Math.round(60 * (t - INI) / (FIM - INI)) : 160 - Math.round((t - FIM) / 1000 / 2);
    if (k % 7 === 3 && t < FIM) b = 0;          // buracos de medida
    v.push(b);
  }
  const pacote = Buffer.from(JSON.stringify({ v: 1, em: AGORA, fcTreinos: [
    { id: "z", c: { ini: INI, p: P, v: v.join(",") } },
    { id: "lixo", c: { ini: INI, p: P, v: "999,abc,10" } },
    { id: "pouco", medio: 120, max: 140, c: { ini: INI, p: P, v: "0,0,120" } },
  ] })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const lido = H.lerPacoteSaude(pacote, (x) => Buffer.from(x, "base64").toString("utf8"));
  teste("a curva chega (só os números de batimento possíveis)", [true, n], [!!lido.fcTreinos[0].curva, lido.fcTreinos[0].curva.v.length]);
  teste("curva de lixo sem média não entra; com média, entra sem a curva curta", ["z", "pouco"], lido.fcTreinos.map((x) => x.id));
  teste("menos de 3 medidas não vira curva", null, lido.fcTreinos[1].curva);
  const reg = { id: "z", nome: "Pernas", data: new Date(FIM).toISOString(), duracaoMin: 30, itens: [
    { exercicioId: "agacho", series: [{ peso: 80, reps: 10, t: FIM - 3 * 60000 }, { peso: 80, reps: 10, t: FIM - 60000 }] },
    { exercicioId: "rosca", series: [{ peso: 10, reps: 12, t: INI + 5 * 60000 }] },
  ] };
  const b2 = H.batimentoNosTreinos([reg, { ...reg, id: "cinta", bpm: { medio: 99, max: 120 } }], [{ id: "z", curva: lido.fcTreinos[0].curva }, { id: "cinta", curva: lido.fcTreinos[0].curva }]);
  teste("sem média do relógio, a média sai da curva (só o tempo do treino)", true, b2.historico[0].bpm.medio > 120 && b2.historico[0].bpm.medio < 140 && b2.historico[0].bpm.fonte === "relogio");
  teste("com a cinta, o batimento dela fica e a curva entra junto", [99, true], [b2.historico[1].bpm.medio, !!b2.historico[1].fcRelogio]);
  const zonas = [{ de: 0.5 }, { de: 0.6 }, { de: 0.7 }, { de: 0.8 }, { de: 0.9 }];
  const an = H.analiseCoracao(b2.historico[0], 180, 60, zonas, (id) => id);
  teste("médio, pico e mínimo do tempo do treino", [true, 160, true], [an.medio > 120 && an.medio < 140, an.max, an.min <= 101]);
  teste("o tempo nas zonas soma o que foi medido", true, Math.abs(an.zonas.reduce((a, b) => a + b, 0) - Math.round(an.pontos.length * 15 / 60)) <= 2);
  teste("a cobertura conta os buracos", true, an.cobertura > 0.8 && an.cobertura < 0.9);
  teste("a recuperação: do pico do fim ao 1 minuto depois", true, !!an.recuperacao && an.recuperacao.queda >= 20 && an.recuperacao.queda <= 40);
  teste("o exercício do fim puxou mais o coração que o do começo", ["agacho", "rosca"], an.exercicios.map((e) => e.id));
  teste("a deriva do treino de 30 min sobe", true, an.deriva > 5);
  teste("TRIMP positivo", true, an.trimp > 0);
  teste("sem a idade, FC máxima estimada e nunca abaixo do pico", [true, true], (() => { const a = H.analiseCoracao(b2.historico[0], 0, 0, zonas); return [a.estimada, a.fcMax >= 160]; })());
  teste("treino sem curva: nada a analisar", null, H.analiseCoracao(reg, 180, 60, zonas));
  const pv = Buffer.from(JSON.stringify({ v: 1, em: AGORA, resp: [{ t: AGORA - DIA, rpm: 14.2 }, { t: AGORA, rpm: 900 }], vo2: [{ t: AGORA - DIA, ml: 44.6 }],
    fcTreinos: [{ id: "so-vitais", x: { resp: 27.4, respMax: 36, spo2: 96.5, spo2Min: 140, passos: 1830, kcal: 412, lixo: 5 } }] })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const lv = H.lerPacoteSaude(pv, (x) => Buffer.from(x, "base64").toString("utf8"));
  teste("a respiração e o VO2máx do dia a dia (sem número impossível)", [[14.2], [44.6]], [lv.resp.map((x) => x.rpm), lv.vo2.map((x) => x.ml)]);
  teste("o treino só com o que o relógio mediu (respiração, oxigênio...) entra", { resp: 27.4, respMax: 36, spo2: 96.5, passos: 1830, kcal: 412 }, lv.fcTreinos[0].extras);
  const bv = H.batimentoNosTreinos([{ id: "so-vitais", data: new Date(AGORA).toISOString(), itens: [] }], lv.fcTreinos);
  teste("e vai para o registro, sem inventar batimento", [true, false], [!!bv.historico[0].vitaisRelogio, !!bv.historico[0].bpm]);
  teste("a frase da recuperação", "desceu 25 bpm em 1 minuto: uma recuperação rápida", H.textoRecuperacao({ queda: 25 }));
}

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
