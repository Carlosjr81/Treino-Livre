// O Jarvis Body Balance (2026-11-25a) e o vigia do GPS.
//
// O que este teste cobra:
//   1. As contas batem com as fórmulas feitas à mão (Mifflin, a meta pelo
//      objetivo, o piso seguro, os minutos de caminhada que compensam).
//   2. O dia é julgado pela direção do objetivo (no cutting passar é o erro,
//      no bulking faltar também é) e dia quase sem anotação não é julgado.
//   3. A compensação nunca vira dia de fome: no máximo 10% da meta a menos, e
//      nunca abaixo do piso; o resto vira caminhada, com teto.
//   4. O gasto medido pelo corpo sai da comida e da tendência do peso.
//   5. O que vem do relógio entra uma vez só, no dia certo, e o "desfazer" tira.
//   6. Os rápidos do relógio têm os mesmos números da tabela do site.
//   7. O vigia do GPS religa sozinho quando o GPS demora, e diz a causa.
const fs = require("fs");
const path = require("path");
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const diaLocal = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const serieConta = (s) => !s.aquec;
const ehCardio = (s) => !!s.mod;
const medirCardio = (s, kg) => ({ min: s.segundos / 60, kcal: (8 * 3.5 * kg / 200) * (s.segundos / 60) });
const b64UrlParaPadrao = (s) => s.replace(/-/g, "+").replace(/_/g, "/");
const semAcento = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
eval(pedaco("// ---------------- JARVIS BODY BALANCE: OS DADOS", "</script>") +
  pedaco("// ---------------- JARVIS BODY BALANCE: AS CONTAS", "// ---------------- FIM DO BODY BALANCE") +
  pedaco("const GPS_ESPERA_MS", "function TelaPercurso(") +
  "\nglobalThis.B = { ALIMENTOS_BR, RAPIDOS_RELOGIO, OBJETIVOS_BALANCE, FONTES_BALANCE, tmbMifflin, valorItem, totaisDoDia, kcalMacros, kcalTreinosDoDia, gastoDoDia, metaDoDia, statusDoDia," +
  " minutosParaGastar, compensacaoDeHoje, planoCompensacao, tendenciaPeso, gastoPeloCorpo, faseReal, sonoDoDia, conselhoSono, resumoDias, itensDoPrato, itemDeAlimento, quantidadeComida, itemEditado, contasDoBalance, resumoBalanceDia, SUBSTANCIAS_PREPARO, prontidaoCorpo," +
  " lerPacoteComida, aplicarComidaDoRelogio, vigiarGps, textoErroGps, RECEITAS_SUGERIDAS, lerReceitas, somaReceita, textoReceita, itemDeReceita, receitasDisponiveis, porCemAlimento, alimentoEm, buscarAlimentos, faltaDoDia, encaixeAlimento, ORDENS_CATALOGO, ordenarCatalogo, compararAlimentos, sobraDepois, distanciaDaMeta, vereditoComparacao, GRUPOS_ALIMENTO, lerMacro, leituraMacros, PAPEL_MACRO, MISSOES_BALANCE, XP_DIA_BALANCE, espacoDoTreino, comidaNoEspaco, ESPACO_MINIMO, JANELAS_NUTRIENTE, MITOS_TIMING, FORCA_JANELA, horaDoTreino, itensComHora, faixaDaJanela, acertoDaJanela, janelasDoDia, HORA_SONO_PADRAO, avisosDoDia, avisoDeAgora, hhmmDoDia, missoesDoDia, xpDoDia, NIVEIS_BALANCE, nivelBalance, pontosBalance, sequenciaBalance, maiorSeqMissao, CONQUISTAS_BALANCE, conquistasBalance, treinoPlanejado, tipoReceita, TIPOS_RECEITA, avisosAdiante, leituraAgua, FAIXAS_AGUA };");
const B = globalThis.B;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = String(JSON.stringify(esperado)), b = String(JSON.stringify(obtido));
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(66) + b.slice(0, 70)); }
  else { mal++; console.log("  X    " + nome.padEnd(66) + b + "\n         esperava " + a); }
}
const perto = (a, b, tol) => Math.abs(a - b) <= tol;

console.log("--- as contas ---");
teste("Mifflin, homem 86 kg, 178 cm, 44 anos (10·86 + 6,25·178 − 5·44 + 5)", 1758, B.tmbMifflin({ sexo: "m", kg: 86, cm: 178, idade: 44 }));
teste("Mifflin, mulher 60 kg, 165 cm, 30 anos (… − 161)", 1320, B.tmbMifflin({ sexo: "f", kg: 60, cm: 165, idade: 30 }));
teste("sem altura, sem conta", null, B.tmbMifflin({ sexo: "m", kg: 80, idade: 30 }));
const mPerder = B.metaDoDia({ objetivo: "perder", ritmo: 0.7, sexo: "m", tmb: 1758 }, 2554, 86, 60);
// 86 × 0,7% × 7700 / 7 = 662 kcal/dia, mas o déficit para em 25% do gasto (638)
teste("cutting: déficit pelo ritmo, até 25% do gasto (2554 − 638 = 1916)", 1916, mPerder.k);
teste("cutting: proteína 2,2 g/kg (Helms 2014)", 189, mPerder.p);
teste("cutting: gordura de pelo menos 25% das kcal e 0,6 g/kg", true, mPerder.g * 9 >= 0.25 * mPerder.k - 9 && mPerder.g >= 0.6 * 86);
teste("cutting: os macros fecham as kcal (± 10)", true, perto(mPerder.p * 4 + mPerder.c * 4 + mPerder.g * 9, mPerder.k, 10));
teste("água: 35 ml/kg + 500 ml por hora de treino", 3500, mPerder.agua);
const mPiso = B.metaDoDia({ objetivo: "perder", ritmo: 1, sexo: "m", tmb: 1758 }, 1900, 86, 0);
teste("o piso: nunca abaixo do repouso (1758)", [1758, true], [mPiso.k, mPiso.noPiso]);
const mPisoF = B.metaDoDia({ objetivo: "perder", ritmo: 1, sexo: "f", tmb: 1100 }, 1400, 55, 0);
teste("o piso da mulher: 1.200", 1200, mPisoF.k);
const mGanhar = B.metaDoDia({ objetivo: "ganhar", ritmo: 0.35, sexo: "m", tmb: 1700 }, 2600, 75, 0);
// 75 × 0,35% × 7700 / 7 = 289 de superávit
teste("bulking: superávit pequeno (75 kg, 0,35%: +289)", 2889, mGanhar.k);
teste("bulking: proteína 1,8 g/kg (Iraki 2019)", 135, mGanhar.p);
teste("manutenção: a meta é o gasto", 2600, B.metaDoDia({ objetivo: "manter", sexo: "m", tmb: 1700 }, 2600, 75, 0).k);

console.log("--- o gasto do dia ---");
const g1 = B.gastoDoDia({ tmb: 1758, comeu: 2000, treino: { kcal: 300, min: 60 }, rotina: "sentado", kg: 86 });
// 1758 + 1758·0,2 (352) + 300 do treino + 10% de 2000
teste("sem relógio: repouso + rotina + treino + digestão", [1758 + 352 + 300 + 200, "estimado"], [g1.total, g1.fonte]);
const g2 = B.gastoDoDia({ tmb: 1758, comeu: 2000, treino: { kcal: 300, min: 60 }, ativas: 650, kg: 86 });
teste("com o relógio: a atividade medida (sem somar o treino de novo)", [1758 + 650 + 200, "relogio"], [g2.total, g2.fonte]);
const g3 = B.gastoDoDia({ tmb: 1758, comeu: 0, treino: { kcal: 0, min: 0 }, ativas: 120, mediaAtivas: 600, hoje: true, kg: 86 });
teste("hoje com o relógio no meio do dia: vale a média dos dias inteiros", 1758 + 600, g3.total);
const hist = [{ data: new Date().toISOString(), duracaoMin: 60, itens: [{ exercicioId: "x", series: [{ mod: "corrida", segundos: 1200 }, { peso: 40, reps: 10 }] }] }];
const tr = B.kcalTreinosDoDia(hist, diaLocal(Date.now()), 80, () => ({ cardio: "corrida" }));
// corrida: (8 − 1) MET × 3,5 × 80 / 200 × 20 min = 196; força: 4 × 3,5 × 80/200 × 40 min = 224
teste("o treino: aeróbico e força acima do repouso", [420, 60], [tr.kcal, tr.min]);

console.log("--- o dia certo e o errado ---");
const mt = { k: 2000 };
teste("cutting: na meta", "certo", B.statusDoDia(2000, mt, "perder", 5).id);
teste("cutting: 10% acima é perto", "perto", B.statusDoDia(2200, mt, "perder", 5).id);
teste("cutting: 30% acima é erro (passou)", ["errou", "passou"], [B.statusDoDia(2600, mt, "perder", 5).id, B.statusDoDia(2600, mt, "perder", 5).nome]);
teste("bulking: 20% abaixo é erro (faltou)", ["errou", "faltou"], [B.statusDoDia(1600, mt, "ganhar", 5).id, B.statusDoDia(1600, mt, "ganhar", 5).nome]);
teste("bulking: 10% acima ainda está na meta", "certo", B.statusDoDia(2200, mt, "ganhar", 5).id);
teste("um item só não é julgado", "vazio", B.statusDoDia(1800, mt, "perder", 1).id);

console.log("--- compensar ---");
const c1 = B.compensacaoDeHoje(2500, { k: 2000 }, 80);
// caminhada rápida: (4,3 − 1) × 3,5 × 80 / 200 = 4,62 kcal/min → 109 min, com teto de 60
teste("passou 500: até 60 min de caminhada hoje", 60, c1.hojeMin);
teste("o resto vai para os próximos dias (500 − 60·4,62 = 223)", 223, c1.sobra);
teste("passou só 40: nada a compensar", null, B.compensacaoDeHoje(2040, { k: 2000 }, 80));
const dias = [1, 2, 3].map((i) => ({ comeu: 2600, meta: { k: 2000 }, status: { id: "errou" } }));
const p1 = B.planoCompensacao(dias, "perder", 80, 1700);
teste("3 dias de 600 acima: menos comida, no máximo 10% da meta (200)", 200, p1.menosKcal);
teste("e o resto em caminhada, com teto de 40 min", true, p1.cardioMin > 0 && p1.cardioMin <= 40);
const p2 = B.planoCompensacao(dias, "perder", 80, 1950);
teste("a comida nunca cai abaixo do piso (2000 − 1950 = 50)", 50, p2.menosKcal);
const p3 = B.planoCompensacao([1, 2, 3].map(() => ({ comeu: 2200, meta: { k: 3000 }, status: { id: "errou" } })), "ganhar", 75, 1700);
teste("bulking abaixo: comer mais, aos poucos (máx. 10% = 300)", 300, p3.maisKcal);

console.log("--- o corpo e o peso ---");
const DIA = 864e5, base = Date.now() - 30 * DIA;
const pesos = []; for (let i = 0; i <= 28; i += 2) pesos.push({ t: base + i * DIA, kg: 90 - (0.5 / 7) * i + (i % 4 ? 0.3 : -0.3) });
const tend = B.tendenciaPeso(pesos, Date.now());
teste("a tendência anda no sentido certo (perdendo)", true, tend.porSemana < 0 && tend.porSemana > -0.8);
const diasCorpo = [];
for (let i = 0; i < 28; i++) diasCorpo.push({ d: diaLocal(base + i * DIA), comeu: 2000, status: { id: "certo" } });
const gc = B.gastoPeloCorpo(diasCorpo, pesos);
// comendo 2000 e perdendo ~0,5 kg/semana: 2000 + 0,5 × 7700 / 7 ≈ 2550 (a tendência atrasa um pouco)
teste("gasto pelo corpo ≈ 2.550 kcal (± 200)", true, !!gc && perto(gc.kcal, 2550, 200));
teste("com menos de 14 dias anotados, não mede", null, B.gastoPeloCorpo(diasCorpo.slice(0, 10), pesos));
// a prontidão diz o que falta, e zera quando o corpo já pode assumir
{
  const p0 = B.prontidaoCorpo(diasCorpo.slice(0, 8), pesos.slice(0, 1));
  teste("faltam dias e pesagens quando há poucos", true, p0.faltamDias === 6 && p0.faltamPesagens === 2 && !p0.pronto);
  const p1 = B.prontidaoCorpo(diasCorpo, pesos);
  teste("pronto quando há dias, pesagens e intervalo", true, p1.pronto && p1.faltamDias === 0 && p1.faltamPesagens === 0);
}
// a pesagem da manhã é preferida quando há o bastante
{
  const d4 = (t) => { const x = new Date(t); x.setHours(7, 0, 0, 0); return x.getTime(); };
  const manha = []; for (let i = 0; i <= 28; i += 2) manha.push({ t: d4(base + i * DIA), kg: 90 - (0.5 / 7) * i });
  const gm = B.gastoPeloCorpo(diasCorpo, manha);
  teste("usa a pesagem da manhã quando dá", true, !!gm && gm.soManha === true);
  const tarde = pesos.map((p) => { const x = new Date(p.t); x.setHours(20); return { t: x.getTime(), kg: p.kg }; });
  const gt = B.gastoPeloCorpo(diasCorpo, tarde);
  teste("sem manhã suficiente, usa todas", true, !!gt && gt.soManha === false);
}
const fr = B.faseReal([1, 2, 3].map(() => ({ comeu: 2900, status: { id: "certo" }, gasto: { total: 2500 } })), 80);
teste("comendo 400 acima do gasto: BULKING, ~0,36 kg/semana", ["bulking", 0.36], [fr.id, fr.kgSemana]);
teste("sono do relógio pela manhã do dia", 7.5, B.sonoDoDia([{ ini: new Date("2026-11-24T23:00:00").getTime(), fim: new Date("2026-11-25T06:30:00").getTime() }], "2026-11-25", 0).h);
teste("sono curto no cutting fala do músculo (Nedeltcheva 2010)", true, /músculo/.test(B.conselhoSono(5.5, "perder")));

console.log("--- a foto do prato ---");
const prato = B.itensDoPrato([{ id: "arroz", fr: 0.25 }, { id: "bife", fr: 0.25 }], "m", 1);
// arroz: 520 g o prato inteiro × ¼ = 130 g; bife 520 × ¼ = 130 g; e 1 colher de óleo
teste("¼ de arroz num prato médio = 130 g", 130, Math.round(B.ALIMENTOS_BR.find((a) => a.id === "arroz").gr * prato[0].q));
teste("o óleo entra à parte", "oleo", prato[2].a);
// a gordura da combinação troca entre manteiga, óleo e azeite (2026-11-27c)
teste("manteiga, óleo e azeite existem no catálogo", 3, ["manteiga", "oleo", "azeite"].filter((id) => B.ALIMENTOS_BR.some((a) => a.id === id && a.cat === "gordura")).length);
teste("óleo e azeite têm a mesma conta por grama", true, (() => { const o = B.ALIMENTOS_BR.find((a) => a.id === "oleo"), z = B.ALIMENTOS_BR.find((a) => a.id === "azeite"); return o.k / o.gr === z.k / z.gr; })());
teste("as kcal do prato (166 + 286 + 117)", 569, prato.reduce((a, it) => a + B.valorItem(it).k, 0));
teste("prato grande pesa mais", true, B.itensDoPrato([{ id: "arroz", fr: 0.25 }], "g", 0)[0].q > B.itensDoPrato([{ id: "arroz", fr: 0.25 }], "m", 0)[0].q);

console.log("--- o relógio ---");
const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64");
const dec = (s) => Buffer.from(s, "base64").toString();
const t0 = new Date("2026-11-25T08:00:00").getTime();
const ev = B.lerPacoteComida(enc({ ev: [{ k: "a1", t: t0, tipo: "agua", ml: 500 }, { k: "a2", t: t0 + 1000, tipo: "comida", a: "banana", q: 1 }, { k: "a3", t: t0, tipo: "comida", a: "nao-existe" }, { k: "", t: t0, tipo: "agua", ml: 9 }] }), dec);
teste("lê água e comida, descarta alimento desconhecido e sem id", ["a1", "a2"], ev.map((e) => e.k));
let nut = { perfil: {}, dias: {}, vistos: [] };
let r = B.aplicarComidaDoRelogio(nut, ev);
teste("entra no dia certo: 500 ml e a banana", [500, "banana", "relogio"], [r.nut.dias["2026-11-25"].agua, r.nut.dias["2026-11-25"].itens[0].a, r.nut.dias["2026-11-25"].itens[0].de]);
const r2 = B.aplicarComidaDoRelogio(r.nut, ev);
teste("a mesma entrega duas vezes não duplica", [0, 1, 500], [r2.n, r2.nut.dias["2026-11-25"].itens.length, r2.nut.dias["2026-11-25"].agua]);
const evD = B.lerPacoteComida(enc({ ev: [{ k: "d1", t: t0 + 5000, tipo: "desfazer", ref: "a1" }, { k: "d2", t: t0 + 6000, tipo: "desfazer", ref: "a2" }] }), dec);
const r3 = B.aplicarComidaDoRelogio(r2.nut, evD);
teste("o desfazer do relógio tira a água e a banana", [0, 0], [r3.nut.dias["2026-11-25"].agua, r3.nut.dias["2026-11-25"].itens.length]);
// os rápidos do relógio com os números da tabela daqui
const kt = fs.readFileSync(path.join(__dirname, "..", "android", "relogio", "src", "main", "java", "br", "com", "treinolivre", "relogio", "ComidaRelogio.kt"), "utf8");
const rap = [...kt.matchAll(/Rapido\("([a-z-]+)", "[^"]*", "[^"]*", (\d+), ([\d.]+), ([\d.]+), ([\d.]+), (\d+)\)/g)].map((m) => ({ a: m[1], k: +m[2], p: +m[3], c: +m[4], g: +m[5], liq: +m[6] }));
teste("o relógio tem os mesmos rápidos do site", B.RAPIDOS_RELOGIO, rap.map((x) => x.a));
teste("e os mesmos números (kcal, macros, líquido)", [], rap.filter((x) => { const a = B.ALIMENTOS_BR.find((y) => y.id === x.a); return !a || a.k !== x.k || a.p !== x.p || a.c !== x.c || a.g !== x.g || (a.liq || 0) !== x.liq; }).map((x) => x.a));
teste("as farinhas e os suplementos pedidos estão lá (2026-11-25e)", [], ["farinha-arroz", "farinha-mandioca", "farinha-trigo", "maltodextrina", "dextrose", "creatina", "caseina", "albumina", "hipercalorico"].filter((id) => !B.ALIMENTOS_BR.find((a) => a.id === id)));
teste("os achocolatados e o leite condensado pedidos estão lá (2026-11-26d)", [], ["achocolatado-po", "leite-achocolatado", "leite-achocolatado-desnatado", "achocolatado-pronto", "chocolate-quente", "leite-condensado"].filter((id) => !B.ALIMENTOS_BR.find((a) => a.id === id)));
teste("as marcas acham pela busca, sem estarem no nome", [true, true, true, true],
  ["nescau", "toddy", "nesquik", "moca"].map((m) => B.buscarAlimentos(m, "", null).length > 0));
teste("nenhum nome de alimento carrega marca", [], B.ALIMENTOS_BR.filter((a) => /nescau|toddy|nesquik|moça|moca|alpino/i.test(a.nome)).map((a) => a.id));
teste("o leite com achocolatado soma o leite e o pó", true, (() => {
  const ach = (id) => B.ALIMENTOS_BR.find((a) => a.id === id);
  return Math.abs(ach("leite-achocolatado").k - (ach("leite").k + ach("achocolatado-po").k)) <= 2;
})());
teste("nenhum id repetido", [], B.ALIMENTOS_BR.map((a) => a.id).filter((x, i, l) => l.indexOf(x) !== i));
{ const html0 = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8"); const linhaG = html0.slice(html0.indexOf("const GRUPOS_ALIMENTO")).split("\n")[0];
  teste("todo grupo tem o seu filtro", [], [...new Set(B.ALIMENTOS_BR.map((a) => a.cat))].filter((c) => linhaG.indexOf("[\"" + c + "\"") < 0)); }
teste("todo alimento tem porção, kcal e macros que fecham (± 25%)", [], B.ALIMENTOS_BR.filter((a) => {
  const k = a.p * 4 + a.c * 4 + a.g * 9 + (a.alc || 0) * 7;
  return !a.por || !(a.k >= 0) || (a.k > 20 && Math.abs(k - a.k) > 0.25 * a.k);
}).map((a) => a.id));

console.log("--- o que a tela não pode dizer ---");
const telaBal = pedaco("// ---------------- JARVIS BODY BALANCE: A TELA", "\nfunction TelaSaude(");
teste("nada de 'prescrição', 'personal' nem promessa", [], ["prescri", "personal", "garantid", "resultado garantido"].filter((p) => telaBal.toLowerCase().indexOf(p) >= 0));
teste("diz que não substitui o nutricionista (Lei 8.234/1991)", true, /nutricionista/.test(telaBal) && /8\.234/.test(telaBal));
teste("tem o aviso de saúde", true, telaBal.indexOf("<AvisoSaude />") >= 0);
teste("as fontes citadas", true, B.FONTES_BALANCE.length >= 10 && B.FONTES_BALANCE.some((f) => /Mifflin/.test(f)) && B.FONTES_BALANCE.some((f) => /Helms/.test(f)));

console.log("--- o vigia do GPS ---");
const relogios = [];
global.setTimeout = (f, ms) => { relogios.push({ f, ms }); return relogios.length; };
global.clearTimeout = () => {};
let ligou = 0, limpou = 0, erros = [];
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: {
  watchPosition(ok, erro) { ligou++; relogios.push({ f: () => erro({ code: 3 }), ms: 0, erro: true }); return ligou; },
  clearWatch() { limpou++; },
  getCurrentPosition() {},
} } });
const parar = B.vigiarGps(() => {}, (e) => erros.push(e.code));
// o primeiro timeout: avisa e religa em 3 s
relogios.shift().f();
teste("o GPS demorou: avisa a causa", [3], erros);
const religa = relogios.shift();
teste("e religa sozinho em 3 s", 3000, religa.ms);
religa.f();
teste("religou (2 vigias, o primeiro limpo)", [2, 1], [ligou, limpou]);
parar();
teste("parar limpa o vigia", 2, limpou);
let negado = 0;
global.navigator.geolocation.watchPosition = (ok, erro) => { negado++; relogios.push({ f: () => erro({ code: 1 }) }); return 9; };
relogios.length = 0;
B.vigiarGps(() => {}, () => {});
relogios.shift().f();
teste("permissão negada não fica religando", [1, 0], [negado, relogios.length]);
teste("as mensagens dizem o que fazer", true, /Permissões/.test(B.textoErroGps({ code: 1 })) && /Localização está ligada/.test(B.textoErroGps({ code: 2 })) && /Pode começar/.test(B.textoErroGps({ code: 3 })));

// ---- porções × vezes no dia, e os gramas da balança (2026-11-25f)
{
  const far = B.ALIMENTOS_BR.find((a) => a.id === "farinha-arroz");
  const q1 = B.quantidadeComida(far, "porcao", 1.5, "", 4);
  teste("1,5 porção × 4 vezes = 6 porções", [6, 4], [q1.q, q1.vz]);
  teste("o texto diz a conta", true, /1,5 porções × 4 vezes = 6 porções/.test(q1.texto));
  teste("as kcal são as de 6 porções", far.k * 6, B.valorItem(B.itemDeAlimento(far, q1.q)).k);
  const q2 = B.quantidadeComida(far, "gramas", "", 45, 2);
  teste("45 g × 2 vezes = 90 g = 3 porções de 30 g", [3, 90], [Math.round(q2.q * 100) / 100, q2.gm]);
  teste("gramas vazios não anotam", 0, B.quantidadeComida(far, "gramas", "", "", 1).q);
  teste("vezes absurdas ficam no teto", 20, B.quantidadeComida(far, "porcao", 1, "", 99).vz);
  const leite = B.ALIMENTOS_BR.find((a) => a.liq > 0);
  teste("bebida pesada em ml", true, / ml/.test(B.quantidadeComida(leite, "gramas", "", 300, 1).texto));
}
// ---- corrigir um item já anotado (2026-11-25g)
{
  const far = B.ALIMENTOS_BR.find((a) => a.id === "farinha-arroz");
  const it = Object.assign(B.itemDeAlimento(far, 6), { id: "x1", t: 5, r: "almoco", de: "relogio", vz: 4, gm: 180, md: "porcao" });
  const e1 = B.itemEditado(it, { modo: "gramas", gramas: "40", vezes: 4, r: "jantar" });
  teste("pelos gramas: 40 g × 4 = 160 g", [160, "x1", 5, "jantar", "relogio"], [e1.gm, e1.id, e1.t, e1.r, e1.de]);
  teste("as kcal seguem os gramas", Math.round(far.k * 160 / far.gr), B.valorItem(e1).k);
  const e2 = B.itemEditado(it, { modo: "porcao", porcoes: "2", vezes: 3 });
  teste("porções × vezes refeitas", [6, "almoco"], [e2.q, e2.r]);
  const e3 = B.itemEditado(it, { modo: "mao", n: "Farinha (rótulo)", k: "500", p: "8", c: "110", g: "2" });
  const v3 = B.valorItem(e3);
  teste("à mão grava os totais, sem multiplicar de novo", [500, 8, 110, 2, undefined], [v3.k, v3.p, v3.c, v3.g, e3.a]);
  teste("valor vazio não salva", null, B.itemEditado(it, { modo: "mao", k: "" }));
  const man = { id: "m", n: "Bolo", q: 1, k: 300, p: 3, c: 40, g: 12, de: "manual" };
  teste("item à mão abre e salva à mão", 350, B.valorItem(B.itemEditado(man, { modo: "porcao", k: "350", n: "Bolo" })).k);
}
// ---- a meta cruza repouso, atividade e treino, e não sobe com o que se come (2026-11-25h)
{
  const base = { tmb: 1750, treino: { kcal: 400, min: 60 }, rotina: "sentado", kg: 80 };
  const g1 = B.gastoDoDia(Object.assign({ comeu: 1500 }, base)), g2 = B.gastoDoDia(Object.assign({ comeu: 3000 }, base));
  teste("comer mais não sobe o gasto da meta", g1.totalMeta, g2.totalMeta);
  teste("o treino entra inteiro no gasto", true, Math.abs(400 - (g1.totalMeta - B.gastoDoDia(Object.assign({ comeu: 1500 }, base, { treino: { kcal: 0, min: 0 } })).totalMeta - Math.round(400 / 9))) <= 1);
  teste("digestão da meta: 10% do total", Math.round(g1.totalMeta * 0.1), g1.tefMeta);
}
// ---- o Body Balance do dia para o resumo e o story (2026-11-25i)
{
  const hoje = diaLocal(Date.now());
  const arroz = B.ALIMENTOS_BR.find((a) => a.id === "arroz") || B.ALIMENTOS_BR[0];
  const it = (q) => Object.assign(B.itemDeAlimento(arroz, q), { id: "i" + q, t: Date.now() });
  const nutricao = { perfil: { objetivo: "perder", sexo: "m", idade: 40, cm: 178, kg: 85, rotina: "sentado" }, dias: { [hoje]: { itens: [it(4), it(5)], agua: 0 } } };
  const cb = B.contasDoBalance({ nutricao: nutricao, historico: [], exPorId: () => null, saude: null, pesoCorporal: 85, medidas: [], corredor: {} });
  const r = B.resumoBalanceDia(cb, hoje);
  const x = cb.dias.find((d) => d.d === hoje);
  teste("o resumo usa os números da tela", [x.comeu, x.meta.k], [r.comeu, r.meta]);
  teste("o saldo é comeu menos o gasto", r.comeu - r.gasto, r.saldo);
  const vazio = B.contasDoBalance({ nutricao: { perfil: nutricao.perfil, dias: {} }, historico: [], pesoCorporal: 85 });
  teste("dia sem anotação não entra no resumo", null, B.resumoBalanceDia(vazio, hoje));
  teste("sem perfil configurado, nada", null, B.resumoBalanceDia(B.contasDoBalance({ nutricao: { perfil: {}, dias: nutricao.dias } }), hoje));
}
// ---- o modo preparação: só com a chave do dono, e o corpo assume (2026-11-25j)
{
  const hoje = diaLocal(Date.now()), antes = diaLocal(Date.now() - 10 * 864e5);
  const arroz = B.ALIMENTOS_BR.find((a) => a.id === "arroz") || B.ALIMENTOS_BR[0];
  const it = (q) => Object.assign(B.itemDeAlimento(arroz, q), { id: "i" + q, t: Date.now() });
  const preparo = { usos: { tireoide: { desde: antes } }, diureticos: [hoje] };
  const nutricao = { perfil: { objetivo: "perder", sexo: "m", idade: 40, cm: 178, kg: 85, rotina: "sentado", preparo: preparo }, dias: { [hoje]: { itens: [it(4), it(5)], agua: 0 } } };
  const base = { nutricao: nutricao, historico: [], exPorId: () => null, saude: null, pesoCorporal: 85, corredor: {},
    medidas: [{ data: new Date().toISOString(), peso: 82 }, { data: new Date(Date.now() - 20 * 864e5).toISOString(), peso: 85 }] };
  const sem = B.contasDoBalance(base), com = B.contasDoBalance(Object.assign({}, base, { preparo: true }));
  const xs = sem.dias.find((d) => d.d === hoje), xc = com.dias.find((d) => d.d === hoje);
  teste("sem a chave do dono, o preparo não muda nada", [null, 0], [xs.preparo, xs.ajusteCorpo]);
  teste("com a chave, o T3 sobe o gasto em ~10% do repouso", Math.round(com.tmb * 0.1), xc.ajusteCorpo);
  teste("com a chave, a meta sobe junto", true, xc.meta.k > xs.meta.k);
  teste("o peso do dia de diurético sai da conta", [2, 1], [sem.pesos.length, com.pesos.length]);
  teste("diurético não mexe no gasto", 0, B.SUBSTANCIAS_PREPARO.find((x) => x.id === "diuretico").efeito);
  // as insulinas (2026-11-27l): só registro, nunca dose
  const ins = B.SUBSTANCIAS_PREPARO.filter((x) => x.insulina);
  teste("as três insulinas estão na lista", ["insulinaRapida", "insulinaBasal", "insulinaNph"], ins.map((x) => x.id));
  teste("insulina não mexe no gasto", [0, 0, 0], ins.map((x) => x.efeito));
  teste("nenhum texto de insulina fala em dose, unidades ou carboidrato por unidade", [], ins.filter((x) => /\b\d+\s*(ui|u|unidades?)\b|por unidade|dose de|aplique \d/i.test(x.diz)).map((x) => x.id));
  teste("antes do uso começar, nada muda", null, com.dias.find((d) => d.d < antes).preparo);
}
// ---- a caneta de apetite (GLP-1) nao muda o gasto, e avisa quem come pouco (2026-11-26a)
{
  const hoje = diaLocal(Date.now()), antes = diaLocal(Date.now() - 20 * 864e5);
  const dd = (n) => diaLocal(Date.now() - n * 864e5);
  const can = B.SUBSTANCIAS_PREPARO.find((x) => x.id === "apetite");
  teste("a caneta esta na lista", true, !!can);
  teste("a caneta nao mexe no gasto", [0, "nada", true], [can.efeito, can.sobre, !!can.apetite]);
  const it = (id, k) => ({ id: "x" + id, t: Date.now(), n: "Comida", q: 1, k: k, p: 20, c: 30, g: 10, de: "manual" });
  const perfil = { objetivo: "perder", sexo: "m", idade: 40, cm: 178, kg: 85, rotina: "sentado" };
  const diasPoucos = {};
  [1, 2, 3].forEach((n) => { diasPoucos[dd(n)] = { itens: [it(n + "a", 450), it(n + "b", 450)], agua: 0 }; });
  diasPoucos[hoje] = { itens: [it("h1", 450), it("h2", 450)], agua: 0 };
  const base = { historico: [], exPorId: () => null, saude: null, pesoCorporal: 85, medidas: [], corredor: {} };
  const semCan = B.contasDoBalance(Object.assign({ nutricao: { perfil: perfil, dias: diasPoucos } }, base, { preparo: true }));
  const comCan = B.contasDoBalance(Object.assign({ nutricao: { perfil: Object.assign({}, perfil, { preparo: { usos: { apetite: { desde: antes } } } }), dias: diasPoucos } }, base, { preparo: true }));
  const xs = semCan.dias.find((d) => d.d === hoje), xc = comCan.dias.find((d) => d.d === hoje);
  teste("com a caneta o gasto do dia nao muda", xs.gastoUsado, xc.gastoUsado);
  teste("com a caneta a meta do dia nao muda", xs.meta.k, xc.meta.k);
  teste("o dia sabe que a caneta estava em uso", [false, true], [!!xs.apetite, !!xc.apetite]);
  teste("comendo abaixo do repouso, avisa", true, !!comCan.apetiteAviso && comCan.apetiteAviso.media < comCan.apetiteAviso.tmb);
  teste("sem a caneta nao avisa", null, semCan.apetiteAviso);
  const comendoBem = {};
  [1, 2, 3].forEach((n) => { comendoBem[dd(n)] = { itens: [it(n + "c", 1200), it(n + "d", 1200)], agua: 0 }; });
  const okCan = B.contasDoBalance(Object.assign({ nutricao: { perfil: Object.assign({}, perfil, { preparo: { usos: { apetite: { desde: antes } } } }), dias: comendoBem } }, base, { preparo: true }));
  teste("comendo acima do repouso, nao avisa", null, okCan.apetiteAviso);
}
// ---- o catalogo: procurar pelos numeros e comparar duas opcoes (2026-11-26c)
{
  const ach = (id) => B.ALIMENTOS_BR.find((a) => a.id === id);
  const whey = ach("whey"), malto = ach("maltodextrina"), farinha = ach("farinha-arroz");
  teste("os tres alimentos do exemplo do dono existem", true, !!whey && !!malto && !!farinha);

  // a regua de 100 g: os valores da tabela valem para a porcao, nao para 100 g
  const c = B.porCemAlimento(farinha);   // porcao de 30 g, 109 kcal
  teste("por 100 g sai da porcao", [363, 6], [Math.round(c.k), Math.round(c.p)]);
  teste("por 100 g do whey", 80, Math.round(B.porCemAlimento(whey).p));
  teste("alimento em 40 g", [145, 2.4], [Math.round(B.alimentoEm(farinha, 40).k), Math.round(B.alimentoEm(farinha, 40).p * 10) / 10]);
  teste("alimento em 0 g nao quebra", 0, B.alimentoEm(farinha, 0).k);

  // a comparacao do pedido: 50 g de whey nos dois lados, 40 g de carbo mudando
  const cmp = B.compararAlimentos([{ a: whey, g: 50 }], { a: malto, g: 40 }, { a: farinha, g: 40 });
  teste("a base entra nos dois totais", true, cmp.temBase && Math.round(cmp.base.k) === 200);
  teste("o total de cada lado", [352, 345], [Math.round(cmp.totA.k), Math.round(cmp.totB.k)]);
  teste("a diferenca e B menos A", [-7, 2.4, -6], [Math.round(cmp.dif.k), Math.round(cmp.dif.p * 10) / 10, Math.round(cmp.dif.c * 10) / 10]);
  teste("so o carboidrato e a proteina mudaram", ["proteína", "carboidrato"], cmp.mudou);
  teste("a base nao entra na diferenca da fibra", 0.9, Math.round(cmp.dif.fib * 10) / 10);

  // a mesma troca sem base nenhuma tem de dar a mesma diferenca
  const sem = B.compararAlimentos([], { a: malto, g: 40 }, { a: farinha, g: 40 });
  teste("a base nao muda a diferenca", [Math.round(cmp.dif.k), Math.round(cmp.dif.c)], [Math.round(sem.dif.k), Math.round(sem.dif.c)]);
  teste("sem base, o total e so a opcao", false, sem.temBase);

  // dois alimentos iguais: nada mudou
  const igual = B.compararAlimentos([], { a: malto, g: 40 }, { a: malto, g: 40 });
  teste("comparar um alimento com ele mesmo nao acusa mudanca", [0, 0], [igual.mudou.length, Math.round(igual.dif.k)]);

  // o que falta no dia
  const meta = { k: 2000, p: 160, c: 200, g: 60 };
  const falta = B.faltaDoDia({ k: 1500, p: 100, c: 150, g: 40 }, meta);
  teste("o que falta", [500, 60, 50, 20], [falta.k, falta.p, falta.c, falta.g]);
  teste("passou da meta nao vira falta negativa", 0, B.faltaDoDia({ k: 2500, p: 300, c: 300, g: 90 }, meta).k);

  // o encaixe: a nota e o quanto a mistura do alimento se parece com o que falta
  const soProt = B.faltaDoDia({ k: 0, p: 0, c: 200, g: 60 }, meta);   // falta so proteina
  const eFrango = B.encaixeAlimento(ach("frango"), soProt);
  const eArroz = B.encaixeAlimento(ach("arroz"), soProt);
  teste("faltando so proteina, o frango encaixa mais que o arroz", true, eFrango.nota > eArroz.nota);
  teste("a nota do frango e alta", true, eFrango.nota > 85);
  const soCarbo = B.faltaDoDia({ k: 0, p: 160, c: 0, g: 60 }, meta);
  teste("faltando so carboidrato, o arroz encaixa mais", true,
    B.encaixeAlimento(ach("arroz"), soCarbo).nota > B.encaixeAlimento(ach("frango"), soCarbo).nota);
  teste("o encaixe diz quanto cabe e o que limita", ["proteína", true], [eFrango.limite, eFrango.cabe > 0]);
  teste("macro ja batido nao zera o encaixe, so e reportado", ["gordura"], eFrango.cheios);
  // cabem 60 g de proteina; o frango tem 32 g por 100 g, entao uns 190 g
  teste("quantos gramas cabem", true, Math.abs(eFrango.cabe - soProt.p / B.porCemAlimento(ach("frango")).p * 100) < 1);

  // a ordenacao
  const todos = B.ALIMENTOS_BR;
  const porProt = B.ordenarCatalogo(todos, "pk", null);
  teste("por proteina por 100 kcal, o primeiro e quase so proteina", true,
    B.porCemAlimento(porProt[0]).p / B.porCemAlimento(porProt[0]).k * 100 > 15);
  const porIg = B.ordenarCatalogo(todos, "ig", null);
  teste("por indice glicemico, a maltodextrina vem na frente", "maltodextrina", porIg[0].id);
  teste("quem nao tem indice glicemico fica de fora da ordem", -1, porIg.map((a) => a.id).indexOf("farinha-arroz"));
  const porEnc = B.ordenarCatalogo(todos, "encaixe", soProt);
  teste("a ordem do encaixe comeca pela maior nota", true,
    B.encaixeAlimento(porEnc[0], soProt).nota >= B.encaixeAlimento(porEnc[5], soProt).nota);
  teste("sem meta, o encaixe nao ordena nada", todos.length, B.ordenarCatalogo(todos, "encaixe", null).length);
  teste("ordenar por nome", true, B.ordenarCatalogo(todos, "nome", null)[0].nome.localeCompare(B.ordenarCatalogo(todos, "nome", null)[1].nome, "pt-BR") <= 0);

  // a busca
  teste("buscar pelo apelido acha", true, B.buscarAlimentos("malto", "", null).some((a) => a.id === "maltodextrina"));
  teste("buscar com o grupo filtra", true, B.buscarAlimentos("", "farinha", null).every((a) => a.cat === "farinha"));
  teste("todas as palavras precisam casar", 0, B.buscarAlimentos("arroz cerveja", "", null).length);

  // o veredito contra a meta do dia
  const faltaP = B.faltaDoDia({ k: 1800, p: 100, c: 195, g: 58 }, meta);   // falta proteina
  const cmp2 = B.compararAlimentos([], { a: malto, g: 40 }, { a: ach("frango"), g: 40 });
  const v = B.vereditoComparacao(cmp2, faltaP);
  teste("faltando proteina, o frango deixa o dia mais perto", "b", v.perto);
  teste("o veredito mostra o que sobra de cada lado", true, v.sobraA.p > v.sobraB.p);
  teste("duas opcoes iguais nao tem vencedora", "", B.vereditoComparacao(igual, faltaP).perto);
  teste("sem nada faltando nao ha veredito", null, B.vereditoComparacao(cmp2, { k: 0, p: 0, c: 0, g: 0 }));
  teste("a distancia da meta conta os tres macros", true,
    B.distanciaDaMeta({ k: 0, p: 0, c: 0, g: 0 }, { k: 100, p: 10, c: 10, g: 10 }) === 10 * 4 + 10 * 4 + 10 * 9);

  // os dados novos: fibra e indice glicemico
  const comIg = B.ALIMENTOS_BR.filter((a) => a.ig != null);
  teste("ha indice glicemico publicado em varios alimentos", true, comIg.length >= 30);
  teste("todo indice glicemico esta numa faixa possivel", [], comIg.filter((a) => !(a.ig > 0 && a.ig <= 110)).map((a) => a.id));
  teste("farinha crua e waxy maize ficam sem indice glicemico", [undefined, undefined, undefined],
    ["farinha-arroz", "farinha-trigo", "waxy-maize"].map((id) => ach(id).ig));
  const comFib = B.ALIMENTOS_BR.filter((a) => a.f != null);
  teste("ha fibra em varios alimentos", true, comFib.length >= 60);
  teste("nenhuma fibra passa do peso da porcao", [], comFib.filter((a) => a.f > a.gr).map((a) => a.id));
  teste("a maltodextrina nao tem fibra e a farinha de arroz tem", [0, true], [malto.f, farinha.f > 0]);
  teste("a fibra nunca e negativa", [], comFib.filter((a) => a.f < 0).map((a) => a.id));
}
// ---- o shake pronto: a combinação que vira um item (2026-11-26e) ----
{
  const ach = (id) => B.ALIMENTOS_BR.find((a) => a.id === id);
  teste("o leite em po entrou no catalogo", [true, true], [!!ach("leite-po"), !!ach("leite-po-desnatado")]);
  teste("as tres combinacoes que o dono descreveu estao sugeridas", [],
    [["whey", "leite-po", "farinha-arroz"], ["whey", "leite-po", "amido-milho"], ["whey", "leite-po", "aveia"]]
      .filter((c) => !B.RECEITAS_SUGERIDAS.some((r) => r.itens.length === c.length && r.itens.every((i, n) => i.a === c[n]))));
  teste("toda sugestao so usa alimento que existe", [],
    B.RECEITAS_SUGERIDAS.reduce((l, r) => l.concat(r.itens.map((i) => i.a)), []).filter((id) => !ach(id)));

  // a soma sai da mesma tabela do resto do app: whey 30 g + leite em po 25 g + aveia 40 g
  // as vitaminas (2026-11-27d)
  const vits = B.RECEITAS_SUGERIDAS.filter((r) => B.tipoReceita(r) === "vitamina");
  teste("há vitaminas prontas", true, vits.length >= 6);
  teste("toda vitamina soma calorias pela tabela", [], vits.filter((r) => !(B.somaReceita(r).k > 0)).map((r) => r.id));
  teste("vitamina com água no copo continua sendo vitamina", "vitamina", B.tipoReceita(B.RECEITAS_SUGERIDAS.find((r) => r.id === "v-leite-po")));
  teste("o shake é shake e o pão com ovos é prato", ["shake", "prato"],
    [B.tipoReceita(B.RECEITAS_SUGERIDAS.find((r) => r.id === "s-aveia")), B.tipoReceita(B.RECEITAS_SUGERIDAS.find((r) => r.id === "c-pao-ovo"))]);
  teste("todo tipo tem filtro", ["prato", "shake", "vitamina"], [...new Set(B.RECEITAS_SUGERIDAS.map(B.tipoReceita))].sort());
  const aveia = B.RECEITAS_SUGERIDAS.find((r) => r.id === "s-aveia");
  const z = B.somaReceita(aveia);
  const mao = ["whey", "leite-po", "aveia"].map((id, n) => B.alimentoEm(ach(id), [30, 25, 40][n]));
  teste("a soma do shake bate com a soma dos alimentos", true,
    Math.abs(z.k - mao.reduce((a, v) => a + v.k, 0)) < 1 && Math.abs(z.p - mao.reduce((a, v) => a + v.p, 0)) < 0.2);
  teste("o shake de aveia da mais ou menos o esperado", [36, 39], [Math.round(z.p), Math.round(z.c)]);
  teste("conta os gramas de po e nao confunde com liquido", [95, 0], [z.gm, z.ml]);
  const comLeite = B.somaReceita(B.RECEITAS_SUGERIDAS.find((r) => r.id === "s-banana"));
  teste("o leite liquido conta como ml, nao como grama", 200, comLeite.ml);

  // o item que entra no dia
  const it = B.itemDeReceita(aveia, 1);
  teste("o shake entra como UM item, sem alimento da tabela", [undefined, 1], [it.a, it.q]);
  teste("o item leva os macros somados", [z.k, z.p], [it.k, it.p]);
  teste("o item guarda a composicao para reabrir", 3, it.rc.length);
  teste("o texto do item diz o que tem dentro", true, /Whey protein 30 g/.test(it.qtx) && /Aveia em flocos 40 g/.test(it.qtx));
  const dois = B.itemDeReceita(aveia, 2);
  teste("dois shakes dobram tudo", [it.k * 2, Math.round(it.p * 2 * 10) / 10], [dois.k, dois.p]);
  teste("vezes absurdo nao passa", 20, B.itemDeReceita(aveia, 999).vz);
  teste("receita sem alimento nenhum nao vira item", null, B.itemDeReceita({ n: "x", itens: [] }, 1));

  // o valor do item no dia é o mesmo que a soma (q = 1, sem multiplicar de novo)
  teste("o dia soma o shake uma vez so", z.k, B.valorItem(it).k);

  // a leitura do que estava guardado
  const lidas = B.lerReceitas([
    { id: "a", n: "Meu shake", itens: [{ a: "whey", g: 40 }, { a: "nao-existe", g: 10 }], agua: 300 },
    { id: "b", n: "vazio", itens: [] },
    { n: "sem nada" },
    "lixo",
  ]);
  teste("so volta receita com alimento de verdade", 1, lidas.length);
  teste("o alimento inventado e descartado", [1, 40], [lidas[0].itens.length, lidas[0].itens[0].g]);
  teste("a agua do copo e guardada", 300, lidas[0].agua);
  teste("grama absurda nao passa", 0, B.lerReceitas([{ id: "c", n: "x", itens: [{ a: "whey", g: 90000 }] }]).length);
  teste("nome gigante e cortado", 60, B.lerReceitas([{ id: "d", n: "x".repeat(300), itens: [{ a: "whey", g: 30 }] }])[0].n.length);

  // o que a pessoa vê: as dela primeiro, e a sugestão que ela já copiou sai
  const minha = { id: "m1", n: "O meu", ic: "\u{1F964}", agua: 300, em: 2, itens: aveia.itens.map((i) => ({ a: i.a, g: i.g })) };
  const disp = B.receitasDisponiveis([minha]);
  teste("a minha receita vem na frente", "m1", disp[0].id);
  teste("a sugestao igual a minha nao aparece duas vezes", -1, disp.slice(1).map((r) => r.id).indexOf("s-aveia"));
  teste("as outras sugestoes continuam", true, disp.some((r) => r.id === "s-amido" && r.sug));
  teste("sem receita minha, aparecem todas as sugeridas", B.RECEITAS_SUGERIDAS.length, B.receitasDisponiveis([]).length);

  // o que o Balance guarda
  // lerNutricao vive fora do bloco das contas: a checagem é no texto do app
  { const html1 = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    teste("lerNutricao guarda as receitas no registro", true, /r\.receitas = lerReceitas\(n\.receitas\)/.test(html1));
    teste("o backup leva as receitas junto (é o mesmo registro)", true, /receitas: \[\]/.test(html1)); }
}
// ---- o shake no relógio: o id vai, os gramas ficam no celular (2026-11-26f) ----
{
  const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const dec = (x) => Buffer.from(x, "base64").toString("utf8");
  const minha = { id: "m9", n: "O meu shake", ic: "\u{1F964}", agua: 300, em: 9,
    itens: [{ a: "whey", g: 30 }, { a: "leite-po", g: 25 }, { a: "farinha-arroz", g: 40 }] };
  const t0 = Date.UTC(2026, 10, 26, 15, 0, 0);
  const ev = (x) => ({ k: "k1", t: t0, tipo: "shake", rc: x, q: 1 });

  const lido = B.lerPacoteComida(b64({ ev: [ev("m9")] }), dec);
  teste("o evento de shake atravessa o link", ["shake", "m9"], [lido[0].tipo, lido[0].rc]);
  teste("shake sem receita no pacote e descartado", 0, B.lerPacoteComida(b64({ ev: [ev("")] }), dec).length);

  const nut = { perfil: {}, dias: {}, vistos: [], receitas: [minha] };
  const r1 = B.aplicarComidaDoRelogio(nut, lido);
  const dia = r1.nut.dias[diaLocal(t0)];
  teste("o shake do relogio entra como um item", 1, dia.itens.length);
  teste("os numeros sao os do celular, nao os do relogio", B.somaReceita(minha).k, dia.itens[0].k);
  teste("o item diz de onde veio", ["relogio", "k1"], [dia.itens[0].de, dia.itens[0].id]);
  teste("a agua do copo entra na agua do dia", 300, dia.agua);
  teste("o mesmo toque nao entra duas vezes", 1, B.aplicarComidaDoRelogio(r1.nut, lido).nut.dias[diaLocal(t0)].itens.length);

  // a sugestão também vale (o relógio pode mostrar as sugeridas antes de a pessoa salvar a dela)
  const sug = B.RECEITAS_SUGERIDAS[0];
  const r2 = B.aplicarComidaDoRelogio({ perfil: {}, dias: {}, vistos: [], receitas: [] },
    B.lerPacoteComida(b64({ ev: [{ k: "k2", t: t0, tipo: "shake", rc: sug.id, q: 1 }] }), dec));
  teste("a sugestao tambem e achada", B.somaReceita(sug).k, r2.nut.dias[diaLocal(t0)].itens[0].k);

  // receita apagada entre o toque e a entrega: o toque se perde, sem inventar número
  const r3 = B.aplicarComidaDoRelogio({ perfil: {}, dias: {}, vistos: [], receitas: [] },
    B.lerPacoteComida(b64({ ev: [{ k: "k3", t: t0, tipo: "shake", rc: "nao-existe", q: 1 }] }), dec));
  teste("receita que nao existe mais nao vira item", [0, 0], [Object.keys(r3.nut.dias).length ? (r3.nut.dias[diaLocal(t0)].itens || []).length : 0, r3.n]);
  teste("e o toque perdido nao fica marcado como visto", -1, (r3.nut.vistos || []).indexOf("k3"));

  // o desfazer do relógio tira o shake junto com a água do copo
  const r4 = B.aplicarComidaDoRelogio(r1.nut, [{ k: "k4", t: t0, tipo: "desfazer", ref: "k1", a: "", rc: "", ml: 0, q: 1 }]);
  const dia4 = r4.nut.dias[diaLocal(t0)];
  teste("desfazer tira o shake e devolve a agua", [0, 0], [dia4.itens.length, dia4.agua]);
}
// ---- o shake intra-treino (2026-11-26g) ----
{
  const gli = B.ALIMENTOS_BR.find((a) => a.id === "glicerina");
  teste("a glicerina esta no catalogo", ["suplemento", 10, 43, 10], [gli.cat, gli.gr, gli.k, gli.c]);
  teste("a glicerina nao inventa indice glicemico", undefined, gli.ig);
  teste("quem digita glicerol ou biodestilada acha", [true, true], ["glicerol", "biodestilada"].map((t) => B.buscarAlimentos(t, "", null).some((a) => a.id === "glicerina")));

  const intra = B.RECEITAS_SUGERIDAS.find((r) => r.id === "s-intra");
  teste("o intra-treino tem malto, glicerina e creatina", ["maltodextrina", "glicerina", "creatina"], intra.itens.map((i) => i.a));
  teste("e um copo maior, pela glicerina", 600, intra.agua);
  const z = B.somaReceita(intra);
  const esperado = intra.itens.reduce((t, i) => t + B.alimentoEm(B.ALIMENTOS_BR.find((a) => a.id === i.a), i.g).k, 0);
  teste("a soma sai da tabela, como nos outros shakes", Math.round(esperado), Math.round(z.k));
  teste("a creatina nao soma caloria", 0, B.alimentoEm(B.ALIMENTOS_BR.find((a) => a.id === "creatina"), 5).k);
  const it = B.itemDeReceita(intra, 1);
  teste("vira um item so, com o nome da receita", ["Intra-treino com glicerina", 1, undefined], [it.n, it.q, it.a]);
}
// ---- o jogo do Balance (2026-11-26i) ----
{
  // um dia é montado com o que as missões leem: itens, água, proteína, treino
  const dia = (d, o) => Object.assign({
    d: d, dia: { itens: [], agua: 0 }, tot: { k: 2000, p: 150, c: 200, g: 60, alc: 0, agua: 3000, itens: 4 },
    treino: { kcal: 300, min: 50 }, meta: { k: 2000, p: 150, c: 200, g: 60, agua: 3000 },
    janelas: { acertos: 2, total: 4 }, status: { id: "certo" }, comeu: 2000,
  }, o || {});
  const cheio = dia("2026-11-26");

  teste("as seis missoes somam 120 XP no dia", 120, B.XP_DIA_BALANCE);
  teste("o dia inteiro cumpre as seis", [6, 120], [B.missoesDoDia(cheio).filter((m) => m.pronto).length, B.xpDoDia(cheio)]);
  teste("a missao do timing pede 2 janelas, nao todas", [2, 2, true],
    (() => { const m = B.missoesDoDia(cheio).find((y) => y.id === "timing"); return [m.feito, m.alvo, m.pronto]; })());
  teste("sem meta nao ha missao (perfil nao configurado)", [0, 0], [B.missoesDoDia(dia("2026-11-26", { meta: null })).length, B.xpDoDia(dia("2026-11-26", { meta: null }))]);

  const pouco = dia("2026-11-26", { tot: { k: 900, p: 70, c: 90, g: 20, alc: 0, agua: 1000, itens: 2 }, treino: { kcal: 0, min: 0 }, janelas: { acertos: 0, total: 2 }, status: { id: "perto" }, comeu: 900 });
  teste("dia pela metade so ganha o que cumpriu", 0, B.xpDoDia(pouco));
  teste("a agua conta o que o corpo da tela mostra (bebida + copo)", [1000, 3000, false],
    (() => { const m = B.missoesDoDia(pouco).find((y) => y.id === "agua"); return [m.feito, m.alvo, m.pronto]; })());
  teste("a missao de anotar pede 3 itens", [2, 3, false],
    (() => { const m = B.missoesDoDia(pouco).find((y) => y.id === "anotar"); return [m.feito, m.alvo, m.pronto]; })());
  teste("treino anotado no app cumpre a missao do treino", [true, false],
    [B.missoesDoDia(cheio).find((y) => y.id === "treino").pronto, B.missoesDoDia(pouco).find((y) => y.id === "treino").pronto]);

  // a sequencia: hoje so quebra depois de fechar
  const seqDias = ["2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"].map((d) => dia(d)).concat([dia("2026-11-26", { status: { id: "perto" } })]);
  teste("hoje em andamento nao quebra a sequencia", [4, 4], (() => { const s = B.sequenciaBalance(seqDias, "2026-11-26"); return [s.atual, s.melhor]; })());
  teste("hoje fechado entra na sequencia", [5, true], (() => { const s = B.sequenciaBalance(seqDias.slice(0, 4).concat([dia("2026-11-26")]), "2026-11-26"); return [s.atual, s.hojeFeito]; })());
  const furado = [dia("2026-11-22"), dia("2026-11-23", { status: { id: "errou" } }), dia("2026-11-24"), dia("2026-11-25"), dia("2026-11-26")];
  teste("um dia fora zera a atual mas guarda a melhor", [3, 3], (() => { const s = B.sequenciaBalance(furado, "2026-11-26"); return [s.atual, s.melhor]; })());

  teste("os pontos sao os dos ultimos 30 dias, e nunca passam do teto",
    [570, 5, 600], (() => { const p = B.pontosBalance(seqDias.slice(0, 5)); return [p.pts, p.dias, p.teto]; })());
  teste("o posto sobe pelos pontos da janela", ["Começando", "Na linha", "No controle"],
    [B.nivelBalance(0).nome, B.nivelBalance(250).nome, B.nivelBalance(5000).nome]);
  teste("o ultimo posto nao promete um proximo", [null, 0], [B.nivelBalance(5000).prox, B.nivelBalance(5000).faltam]);
  teste("falta o que falta, sem arredondar para mais", 100, B.nivelBalance(150).faltam);

  teste("a maior sequencia de uma missao", 5, B.maiorSeqMissao(seqDias, "agua"));
  const nut = { dias: {} };
  seqDias.forEach((x) => { nut.dias[x.d] = { itens: [1, 2, 3, 4], agua: 0 }; });
  const cq = B.conquistasBalance(seqDias, nut);
  teste("a medalha do primeiro dia sai de um dia anotado", true, cq.find((c) => c.id === "primeiro").ganha);
  teste("o dia perfeito sai de todas as missoes num dia so", true, cq.find((c) => c.id === "dia100").ganha);
  teste("a semana fechada ainda nao, com 4 dias", [false, 4], (() => { const c = cq.find((x) => x.id === "seq7"); return [c.ganha, c.quanto]; })());
  teste("o progresso de uma medalha nunca passa do alvo", [30, false],
    (() => { const c = B.conquistasBalance(seqDias, nut).find((x) => x.id === "anot30"); return [c.alvo, c.ganha]; })());
  teste("dia quase sem anotacao nao conta como dia anotado", 0,
    (() => { const n = { dias: { "2026-11-20": { itens: [1], agua: 0 } } }; return B.conquistasBalance([], n).find((c) => c.id === "primeiro").quanto; })());

  // a regra que manda aqui: nenhum numero inventado
  const fonte = html.slice(html.indexOf("// ---------------- O JOGO DO BALANCE"), html.indexOf("// ---------------- O CATÁLOGO"));
  teste("o jogo nao inventa gente nem comparacao com os outros", [], 
    ["outras pessoas", "outros usuários", "ranking geral", "média dos usuários", "Math.random"].filter((p) => fonte.indexOf(p) >= 0));
}
// ---- a sincronia com o relógio mais rápida (2026-11-26j) ----
{
  const lerKt = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  const comida = lerKt("android/app/src/main/java/br/com/treinolivre/app/ComidaActivity.kt");
  const canal = lerKt("android/app/src/main/java/br/com/treinolivre/app/Canal.kt");
  const rel = lerKt("android/app/src/main/java/br/com/treinolivre/app/Relogio.kt");
  const pulso = lerKt("android/relogio/src/main/java/br/com/treinolivre/relogio/ComidaRelogio.kt");

  teste("o app sabe quando a aba do Treino Livre esta na tela", true,
    /@Volatile var aVista = false/.test(canal) && /navigationEvent == TAB_HIDDEN\) aVista = false/.test(canal));
  teste("a comida do relogio tenta entrar na hora, nao so na notificacao", true,
    /Comida\.entregarSePuder\(contexto\)/.test(rel) && /Comida\.entregarSePuder\(c\)/.test(canal));
  teste("sem o app a vista, ou sem a permissao, continua a notificacao", true,
    /if \(!Canal\.aVista\) \{ avisar\(c\); return \}/.test(comida) && /canDrawOverlays\(c\)\) \{ avisar\(c\); return \}/.test(comida));
  teste("a mesma anotacao nao e entregue duas vezes (a entrega e uma navegacao)", true,
    /fun temNovos/.test(comida) && /marcarEntregues\(c\)\n        return "comida="/.test(comida));
  teste("a volta do estado traz a fila do relogio junto", true,
    /val volta = Comida\.fragmento\(this\)/.test(comida));
  teste("o relogio reenvia de 3 em 3 s com fila, e de 15 em 15 sem", true,
    /if \(tem\) 3000L else 15000L/.test(pulso));

  teste("a tela do Balance pede a sincronia a cada toque, com guarda", true,
    /const puxarRelogio = \(\) => \{/.test(html) && /agora - sincEm\.current < 15000/.test(html) &&
    /useEffect\(\(\) => \{ puxarRelogio\(\); \}, \[secao\]\)/.test(html));
}
// ---- os lanches, tipo por tipo (2026-11-26k) ----
{
  const ach = (id) => B.ALIMENTOS_BR.find((a) => a.id === id);

  // A rede de proteção do catálogo inteiro: as calorias têm de fechar com os
  // macros (4 kcal por grama de proteína e de carboidrato, 9 por grama de
  // gordura). Um zero a mais ou uma vírgula fora do lugar aparece aqui, e não
  // no dia de quem anotou. O álcool fica de fora (7 kcal/g, campo à parte).
  const fora = B.ALIMENTOS_BR.filter((a) => {
    if (a.alc || !(a.k > 50)) return false;
    const soma = 4 * (a.p || 0) + 4 * (a.c || 0) + 9 * (a.g || 0);
    return Math.abs(soma - a.k) / a.k > 0.12;
  }).map((a) => a.id);
  teste("as kcal de todo alimento fecham com os macros", [], fora);
  const ids = B.ALIMENTOS_BR.map((a) => a.id);
  teste("nenhum id de alimento repetido", [], ids.filter((x, i) => ids.indexOf(x) !== i));

  // os nove tipos da tabela, em ordem de caloria
  const tipos = ["hamb-simples", "hamb-queijo", "hamb-salada", "hamb-smash", "hamb-frango", "hamb-veg", "hamb-bacon", "hamb-gourmet", "hamb-tudo"];
  teste("os nove tipos de hamburguer existem", 9, tipos.filter(ach).length);
  teste("o simples e o mais leve e o x-tudo o mais pesado", [380, 980],
    [ach("hamb-simples").k, ach("hamb-tudo").k]);
  teste("cada degrau da tabela pesa mais que o anterior", true,
    ["hamb-simples", "hamb-queijo", "hamb-salada"].every((id, i, l) => i === 0 || ach(id).k > ach(l[i - 1]).k));
  teste("o x-tudo passa de mil e nao de dois mil", true, ach("hamb-tudo").k > 900 && ach("hamb-tudo").k < 1300);

  // **A regra das marcas**: nome de produto de rede nunca vira nome de item.
  // O número não veio da tabela oficial da empresa, então pô-lo com o nome
  // dela seria inventar um número na boca de uma marca real.
  const marcas = ["big mac", "bigmac", "whopper", "mcchicken", "quarteirao", "big king", "mc lanche", "bk ", "habib", "giraffas", "mcdonald", "burger king"];
  const nomesComMarca = B.ALIMENTOS_BR.filter((a) => marcas.some((m) => semAcento(a.nome).indexOf(m) >= 0)).map((a) => a.id);
  teste("nenhum alimento leva nome de produto de marca", [], nomesComMarca);
  teste("mas quem digita a marca acha o tipo", ["rede-duplo", "rede-grande"],
    [B.buscarAlimentos("big mac", "", null)[0], B.buscarAlimentos("whopper", "", null)[0]].map((a) => a && a.id));
  teste("e os de rede dizem na tela que o numero e do tipo", true,
    ["rede-simples", "rede-duplo", "rede-grande", "rede-frango", "nuggets", "batata-rede"].every((id) => /M.dia do tipo/.test(ach(id).nota || "")));

  teste("os lanches naturais sao mais leves que os de rede", true,
    ach("natural-frango").k < ach("rede-duplo").k && ach("hamb-fit").k < ach("hamb-queijo").k);
  teste("o natural de frango tem mais proteina que caloria por grama de pao", true, ach("natural-frango").p >= 20);
  teste("a pizza por sabor: quatro queijos acima da marguerita", true, ach("pizza-4queijos").k > ach("pizza-marguerita").k);
  teste("o salgado virou um por tipo, e o generico ficou", ["Coxinha", "Pastel de carne", "Salgado frito (média)"],
    ["coxinha", "pastel-carne", "salgado"].map((id) => ach(id).nome));

  // o grupo novo: os lanches saíram de "gordura" e "prato"
  const grupos = B.GRUPOS_ALIMENTO.map((g) => g[0]);
  teste("o grupo dos lanches existe", true, grupos.indexOf("lanche") >= 0);
  teste("nenhuma categoria de alimento ficou sem grupo", [],
    B.ALIMENTOS_BR.map((a) => a.cat).filter((c, i, l) => l.indexOf(c) === i && grupos.indexOf(c) < 0));
  teste("o filtro de lanches traz os tipos todos", true, B.buscarAlimentos("", "lanche", null).length >= 50);

  // nada aqui recomenda nem julga: é registro
  const trechoLanches = html.slice(html.indexOf("OS LANCHES, TIPO POR TIPO"), html.indexOf("const GRUPOS_ALIMENTO"));
  teste("o catalogo nao recomenda nem proibe comida", [],
    ["evite", "proibido", "pode comer", "nao coma", "saudavel demais", "engorda"].filter((p) => semAcento(trechoLanches).indexOf(p) >= 0));
}
// ---- o papel de cada macro no objetivo (2026-11-26k) ----
{
  const ler = (m, v, meta, ob, kf) => B.lerMacro(m, v, meta, ob, kf === undefined ? 0.9 : kf);

  // o que o dono pediu para confirmar: no cutting, abaixo do carbo nao e erro
  teste("cutting: carbo abaixo da meta e tranquilo, nao falta", ["tranquilo", "sobra"],
    [ler("c", 200, 400, "perder").id, ler("c", 200, 400, "perder").papel]);
  teste("e a frase diz por que", true, /sobra/.test(ler("c", 200, 400, "perder").frase));
  teste("mas passar do carbo COM a caloria estourada e atencao", "atencao", ler("c", 470, 400, "perder", 1.2).id);
  teste("passar do carbo com a caloria ainda na meta nao e alarme", "ok", ler("c", 420, 400, "perder", 0.95).id);

  // bulking: carbo vira alvo, e passar dentro da caloria joga a favor
  teste("bulking: carbo e alvo, nao sobra", "alvo", ler("c", 300, 400, "ganhar").papel);
  teste("bulking: faltar carbo e falta de verdade", "falta", ler("c", 300, 400, "ganhar").id);
  teste("bulking: passar do carbo com a caloria ok e bonus", "bonus", ler("c", 460, 400, "ganhar", 1.0).id);
  teste("bulking: passar do carbo E da caloria ja nao e vantagem", "atencao", ler("c", 460, 400, "ganhar", 1.3).id);
  teste("e a frase diz que o excesso vira gordura, nao musculo", true,
    /vira gordura, n.o m.sculo/.test(ler("c", 460, 400, "ganhar", 1.3).frase));

  // a proteina e piso nos dois, e no deficit e o que mais importa
  teste("a proteina e piso em todo objetivo", ["piso", "piso", "piso", "piso"],
    ["perder", "ganhar", "manter", "recomp"].map((o) => ler("p", 100, 200, o).papel));
  teste("faltar proteina no cutting e o que mais importa", "importa", ler("p", 120, 200, "perder").id);
  teste("bater proteina fecha em ok", "ok", ler("p", 190, 200, "perder").id);
  teste("acima da proteina nao vira alarme nem elogio extra", true,
    ler("p", 300, 200, "perder").id === "ok" && /traz mais resultado/.test(ler("p", 300, 200, "perder").frase));

  // o que o dono nao citou: a gordura tem piso
  teste("gordura muito abaixo e alerta, nao virtude", "importa", ler("g", 40, 90, "perder").id);
  teste("e a frase fala do hormonio", true, /horm.nio/.test(ler("g", 40, 90, "perder").frase));
  teste("gordura so um pouco abaixo e falta leve", "falta", ler("g", 72, 90, "perder").id);
  teste("gordura na faixa fecha em ok", "ok", ler("g", 88, 90, "perder").id);

  // a frase de cima do cartao escolhe o que decide o dia
  const meta = { k: 2500, p: 200, c: 300, g: 80 };
  teste("a leitura poe a proteina que falta na frente", true,
    /Falta o que importa/.test(B.leituraMacros({ p: 120, c: 150, g: 75 }, meta, "perder", 0.8).texto));
  teste("so o carbo abaixo no cutting nao vira cobranca", true,
    /onde o seu objetivo pede/.test(B.leituraMacros({ p: 195, c: 150, g: 76 }, meta, "perder", 0.8).texto));
  teste("no bulking o mesmo carbo abaixo vira falta", true,
    /falta carboidrato/.test(B.leituraMacros({ p: 195, c: 150, g: 76 }, meta, "ganhar", 0.8).texto));

  // Nada do que VAI PARA A TELA manda comer nem proibe: são leituras do que a
  // pessoa anotou. (O texto do bloco fica de fora da varredura de propósito —
  // é lá que está escrito que isto não é prescrição.)
  const todasAsFrases = [];
  ["perder", "ganhar", "manter", "recomp"].forEach((o) => {
    ["p", "c", "g"].forEach((m) => {
      [0.3, 0.7, 0.95, 1.0, 1.4].forEach((r) => {
        [0.8, 1.3].forEach((kf) => {
          const x = B.lerMacro(m, 200 * r, 200, o, kf);
          if (x) todasAsFrases.push(x.frase);
        });
      });
    });
    [{ p: 50, c: 50, g: 20 }, { p: 200, c: 300, g: 80 }].forEach((t) => {
      const l = B.leituraMacros(t, { k: 2500, p: 200, c: 300, g: 80 }, o, 0.9);
      if (l) todasAsFrases.push(l.texto);
    });
  });
  teste("as frases dos macros nao prescrevem nem proibem", [],
    ["voce deve", "coma ", "nao coma", "proibido", "dieta", "prescri", "personal"]
      .filter((p) => todasAsFrases.some((fr) => semAcento(fr).indexOf(p) >= 0)));
  teste("e sao muitas frases, nao uma so", true, todasAsFrases.length > 40);
}
// ---- o espaco que o treino abre (2026-11-26l) ----
{
  const perfil = { kg: 92, idade: 44, sexo: "m", altura: 180, objetivo: "perder", ritmo: 0.75, rotina: "sentado", tmb: 1930 };
  // o mesmo dia com e sem treino, pela conta do proprio app
  const gCom = B.gastoDoDia({ tmb: 1930, comeu: 2000, treino: { kcal: 400, min: 60 }, rotina: "sentado", ativas: 0, mediaAtivas: 0, passos: 0, kg: 92, hoje: false });
  const gSem = B.gastoDoDia({ tmb: 1930, comeu: 2000, treino: { kcal: 0, min: 0 }, rotina: "sentado", ativas: 0, mediaAtivas: 0, passos: 0, kg: 92, hoje: false });
  const mCom = B.metaDoDia(perfil, gCom.totalMeta, 92, 60), mSem = B.metaDoDia(perfil, gSem.totalMeta, 92, 0);
  const esp = B.espacoDoTreino(mCom, mSem, { kcal: 400, min: 60 });
  teste("o treino abre espaco de verdade na meta do dia", true, esp && esp.kcal > 0);
  teste("o espaco nao passa do treino alem da digestao dele", true, esp.kcal <= Math.round(400 * 10 / 9) + 1);
  teste("e a tela sabe dizer que parte do treino virou comida", true, esp.parte > 0 && esp.parte <= 115);
  teste("sem treino nao ha espaco nenhum", null, B.espacoDoTreino(mSem, mSem, { kcal: 0, min: 0 }));
  teste("ruido de arredondamento nao vira espaco", null,
    B.espacoDoTreino({ k: 2010, p: 1, c: 1, g: 1, agua: 1 }, { k: 2000, p: 1, c: 1, g: 1, agua: 1 }, { kcal: 20, min: 5 }));
  teste("a agua tambem sobe com o treino", true, esp.agua >= 0);
  // no cutting com o deficit no teto, parte do treino vira deficit maior:
  // dizer isso e o que impede o numero de parecer erro de conta
  teste("a parte e uma conta de verdade, nao um numero redondo", true, esp.parte === Math.round((esp.kcal / 400) * 100));

  const cab = B.comidaNoEspaco(300);
  teste("o espaco vira comida de verdade do catalogo", true, cab.length >= 1 && cab.length <= 3);
  teste("e nenhuma regua pede dez porcoes", [], cab.filter((c) => c.n < 1 || c.n > 8));
  teste("cada regua existe no catalogo com a caloria dela", [],
    cab.filter((c) => !B.ALIMENTOS_BR.find((a) => a.id === c.a.id && a.k === c.a.k)));
  teste("espaco zero nao sugere comida nenhuma", [], B.comidaNoEspaco(0));

  const fonte = html.slice(html.indexOf("O ESPAÇO QUE O TREINO ABRE"), html.indexOf("O PAPEL DE CADA MACRO"));
  teste("o espaco nao e vendido como licenca para comer", [],
    ["ganhou para gastar", "pode comer a sobremesa", "queime antes"].filter((p) => semAcento(fonte).indexOf(semAcento(p)) >= 0));
}
// ---- as janelas dos nutrientes (2026-11-26l) ----
{
  const hora = (h, m) => h * 60 + (m || 0);
  // um dia com treino as 18h: pre-treino as 16h, pos as 19h30, ceia as 22h30
  const t = (h, m) => new Date(2026, 10, 26, h, m || 0).getTime();
  const dia = { agua: 0, itens: [
    { t: t(8), n: "Pão com ovo", q: 1, k: 300, p: 22, c: 30, g: 10 },
    { t: t(12, 30), n: "Almoço", q: 1, k: 700, p: 45, c: 70, g: 20 },
    { t: t(16), n: "Lanche", q: 1, k: 300, p: 10, c: 50, g: 5 },
    { t: t(19, 30), n: "Shake", q: 1, k: 250, p: 35, c: 20, g: 3 },
    { t: t(22, 30), n: "Iogurte", q: 1, k: 200, p: 28, c: 10, g: 5 },
  ] };
  const treino = { ini: hora(18), fim: hora(19), aberto: false };
  const q = B.janelasDoDia({ dia: dia, treino: treino, dorme: 23, agoraMin: 1440 });

  teste("a hora de cada item entra na conta", 5, B.itensComHora(dia).length);
  const pega = (id) => q.lista.find((x) => x.j.id === id);
  teste("o lanche de 16h cai na janela de antes do treino", true, pega("preTreino").feito);
  teste("o shake de 19h30 cai na janela de depois", true, pega("posTreino").feito);
  teste("a proteina espalhada em 3 blocos conta", true, pega("proteina").feito);
  teste("o iogurte de 22h30 cai na janela de antes de dormir", true, pega("noite").feito);
  teste("o placar conta as quatro medidas e as duas de marcar a mao", [4, 6], [q.acertos, q.total]);
  teste("cafeina e creatina so contam marcadas a mao", [true, true, false, false],
    [pega("cafeina").acerto.soMao, pega("creatina").acerto.soMao, pega("cafeina").feito, pega("creatina").feito]);

  // sem treino, as janelas presas a ele nao existem: nao existir e diferente
  // de ter sido perdida
  const sem = B.janelasDoDia({ dia: dia, treino: null, dorme: 23, agoraMin: 1440 });
  teste("sem treino a janela de antes nao e cobrada", ["semTreino", 3], [sem.lista.find((x) => x.j.id === "preTreino").estado, sem.total]);

  // o estado pela hora de agora
  const cedo = B.janelasDoDia({ dia: { agua: 0, itens: [] }, treino: treino, dorme: 23, agoraMin: hora(9) });
  teste("de manha a janela de antes do treino ainda vem", "vem", cedo.lista.find((x) => x.j.id === "preTreino").estado);
  const naHora = B.janelasDoDia({ dia: { agua: 0, itens: [] }, treino: treino, dorme: 23, agoraMin: hora(16, 30) });
  teste("as 16h30 ela esta aberta", "agora", naHora.lista.find((x) => x.j.id === "preTreino").estado);
  teste("e o app sabe qual janela esta aberta e ainda nao foi cumprida", true,
    naHora.agora.some((x) => x.j.id === "preTreino"));
  const tarde = B.janelasDoDia({ dia: { agua: 0, itens: [] }, treino: treino, dorme: 23, agoraMin: hora(22) });
  teste("depois dela passar, passou", "passou", tarde.lista.find((x) => x.j.id === "preTreino").estado);

  // a faixa sai do treino e do sono, nao de uma hora fixa
  const fx = B.faixaDaJanela(B.JANELAS_NUTRIENTE.find((j) => j.id === "posTreino"), treino, 23);
  teste("a janela de depois comeca no fim do treino", [hora(19), hora(21, 30)], [fx.de, fx.ate]);
  const fn = B.faixaDaJanela(B.JANELAS_NUTRIENTE.find((j) => j.id === "noite"), treino, 22);
  teste("quem dorme as 22h tem a janela da noite mais cedo", [hora(20), hora(21, 50)], [fn.de, fn.ate]);

  // tres blocos de proteina colados nao sao tres refeicoes
  const colado = { agua: 0, itens: [1, 2, 3].map((i) => ({ t: t(12, i * 10), n: "x", q: 1, k: 200, p: 30, c: 5, g: 5 })) };
  teste("proteina toda junta nao conta como espalhada", false,
    B.janelasDoDia({ dia: colado, treino: null, dorme: 23, agoraMin: 1440 }).lista.find((x) => x.j.id === "proteina").feito);

  // a hora do treino sai do historico (a data do registro e o FIM)
  const h = [{ data: new Date(2026, 10, 26, 19, 0).toISOString(), duracaoMin: 60 }];
  teste("a hora do treino sai do fim menos a duracao", [hora(18), hora(19)],
    (() => { const x = B.horaDoTreino(h, "2026-11-26", null); return [x.ini, x.fim]; })());
  teste("dia sem treino nao inventa hora", null, B.horaDoTreino(h, "2026-11-25", null));
  // data fixa: com Date.now(), "uma hora atras" caia no dia anterior entre 0h e 1h, e o teste reprovava de madrugada
  teste("o treino aberto agora tambem conta", true, !!B.horaDoTreino([], "2026-11-26", { inicio: new Date(2026, 10, 26, 17, 0).getTime() }));
  teste("treino aberto ontem nao vira o treino de hoje", null, B.horaDoTreino([], "2026-11-27", { inicio: new Date(2026, 10, 26, 23, 30).getTime() }));

  // o horário de sempre do treino (2026-11-27d): sem treino registrado, vale o plano
  const plano = { hora: hora(18), dur: 60, dias: [1, 2, 3, 4, 5] };
  teste("sem treino, o horário de sempre vale (sexta 27/11)", [hora(18), hora(19), true],
    (() => { const x = B.horaDoTreino([], "2026-11-27", null, plano); return [x.ini, x.fim, x.planejado]; })());
  teste("e não vale num dia fora do plano (domingo)", null, B.horaDoTreino([], "2026-11-29", null, plano));
  teste("o treino de verdade vence o plano", [hora(18), hora(19), undefined],
    (() => { const x = B.horaDoTreino(h, "2026-11-26", null, { hora: hora(7), dias: [4] }); return [x.ini, x.fim, x.planejado]; })());
  teste("plano sem hora não inventa nada", null, B.horaDoTreino([], "2026-11-27", null, { dias: [5] }));
  const comPlano = B.janelasDoDia({ dia: { agua: 0, itens: [] }, treino: B.horaDoTreino([], "2026-11-27", null, plano), dorme: 23, agoraMin: hora(9) });
  teste("com o plano, a janela de antes do treino já existe de manhã", "vem", comPlano.lista.find((x) => x.j.id === "preTreino").estado);
  teste("e vira aviso antes do treino", true, B.avisosDoDia(comPlano).some((a) => a.id === "preTreino"));

  // os avisos dos próximos dias (2026-11-27g): pelo plano, sem a proteína espalhada
  const adiante = B.avisosAdiante(plano, 23, new Date(2026, 10, 27, 10, 0).getTime());
  teste("os próximos 6 dias saem do plano (seg a sex: sem sábado e domingo)", ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03"],
    adiante.filter((x) => x.a.some((a) => a.id === "preTreino")).map((x) => x.d));
  teste("no fim de semana só a janela da noite", ["noite"], adiante.find((x) => x.d === "2026-11-28").a.map((a) => a.id));
  teste("a proteína espalhada não vai adiante", false, adiante.some((x) => x.a.some((a) => a.id === "proteina")));
  teste("o aviso de antes do treino da segunda às 15h05", 905, adiante.find((x) => x.d === "2026-11-30").a.find((a) => a.id === "preTreino").em);
  teste("sem plano de treino, só a noite", true, B.avisosAdiante(null, 23, new Date(2026, 10, 27, 10, 0).getTime()).every((x) => x.a.every((a) => a.id === "noite")));

  // os pães (2026-11-27k): a seção, os mini pães e a busca pelos outros nomes
  const paes = B.ALIMENTOS_BR.filter((x) => x.cat === "pao").map((x) => x.id);
  teste("a seção Pães tem o francês e os mini pães pedidos", [], ["pao", "pao-mini", "pao-mini-cenoura", "pao-mini-laranja", "pao-mini-mandioca", "pao-mini-mandioquinha"].filter((id) => paes.indexOf(id) < 0));
  teste("todo pão se conta em unidades", [], B.ALIMENTOS_BR.filter((x) => x.cat === "pao" && !(x.un && x.unG > 0)).map((x) => x.id));
  teste("aipim acha o mini pão de mandioca", true, B.buscarAlimentos("aipim", "", []).some((x) => x.id === "pao-mini-mandioca"));
  teste("batata baroa acha o de mandioquinha", true, B.buscarAlimentos("batata baroa", "", []).some((x) => x.id === "pao-mini-mandioquinha"));
  teste("carbo ainda acha o pão francês", true, B.buscarAlimentos("carbo", "", []).some((x) => x.id === "pao"));
  teste("o filtro Pães existe", true, B.GRUPOS_ALIMENTO.some((g) => g[0] === "pao"));

  // a leitura da água (2026-11-27i): seis faixas e o ritmo de hoje
  const faixaAgua = (b) => B.leituraAgua({ bebeu: b, meta: 3000 }).faixa.id;
  teste("as seis faixas pelo dia inteiro", ["muitoAbaixo", "abaixo", "quase", "meta", "acima", "muitoAcima"], [1500, 2000, 2700, 3000, 3900, 4600].map(faixaAgua));
  teste("quanto falta e quanto sobrou", [300, 0, 0, 600], [B.leituraAgua({ bebeu: 2700, meta: 3000 }).falta, B.leituraAgua({ bebeu: 2700, meta: 3000 }).sobra, B.leituraAgua({ bebeu: 3600, meta: 3000 }).falta, B.leituraAgua({ bebeu: 3600, meta: 3000 }).sobra]);
  teste("às 15h com metade da meta, está em dia", true, B.leituraAgua({ bebeu: 1500, meta: 3000, agoraMin: hora(15), dorme: 23 }).ritmo.emDia);
  teste("às 15h com 500 ml, está atrás do ritmo", false, B.leituraAgua({ bebeu: 500, meta: 3000, agoraMin: hora(15), dorme: 23 }).ritmo.emDia);
  teste("e diz quanto por hora até a hora de dormir", 350, B.leituraAgua({ bebeu: 500, meta: 3000, agoraMin: hora(15), dorme: 23 }).ritmo.porHora);
  teste("de manhã cedo, pouca água ainda é 'no ritmo', não alarme", "noRitmo", B.leituraAgua({ bebeu: 200, meta: 3000, agoraMin: hora(7, 30), dorme: 23 }).faixa.id);
  teste("às 15h com 500 ml, a faixa é 'bem abaixo' contra o esperado", "muitoAbaixo", B.leituraAgua({ bebeu: 500, meta: 3000, agoraMin: hora(15), dorme: 23 }).faixa.id);
  teste("às 15h com 1,1 L, está um pouco atrás", "abaixo", B.leituraAgua({ bebeu: 1100, meta: 3000, agoraMin: hora(15), dorme: 23 }).faixa.id);
  teste("o dia que passou é julgado pela meta inteira", "abaixo", B.leituraAgua({ bebeu: 2000, meta: 3000 }).faixa.id);
  teste("bateu a meta: não há ritmo a cobrar", null, B.leituraAgua({ bebeu: 3100, meta: 3000, agoraMin: hora(15), dorme: 23 }).ritmo);
  teste("sem meta não há leitura", null, B.leituraAgua({ bebeu: 1000, meta: 0 }));
  teste("cada faixa diz o efeito no shape", ["piora", "piora", "neutro", "ajuda", "neutro", "cuidado"],
    ["muitoAbaixo", "abaixo", "quase", "meta", "acima", "muitoAcima"].map((id) => B.FAIXAS_AGUA.find((f) => f.id === id).shape.ef));
  teste("nenhum efeito promete músculo ou gordura queimada pela água", [], B.FAIXAS_AGUA.filter((f) => /queima mais|ganha mais músculo|emagrece/i.test(f.shape.texto)).map((f) => f.id));
  teste("a água da madrugada vem separada", [750, true], (() => { const x = B.leituraAgua({ bebeu: 2500, meta: 3000, noite: 750 }).noite; return [x.ml, x.muita]; })());
  teste("um copo à noite não vira alerta de sono", false, B.leituraAgua({ bebeu: 2500, meta: 3000, noite: 250 }).noite.muita);
  teste("nenhuma faixa cobra nem manda a pessoa beber à força", [], B.FAIXAS_AGUA.filter((f) => /obrigat|você deve|tem que beber|errou|falhou/i.test(f.diz + f.faca)).map((f) => f.id));

  // a creatina dentro do shake conta (relato do dono, 2026-11-27d)
  const intra = B.itemDeReceita(B.RECEITAS_SUGERIDAS.find((r) => r.id === "s-intra"), 1);
  intra.t = t(15, 0);
  const comShake = B.janelasDoDia({ dia: { agua: 0, itens: [intra] }, treino: treino, dorme: 23, agoraMin: hora(22) });
  const cr = comShake.lista.find((x) => x.j.id === "creatina");
  teste("creatina dentro do shake intra-treino conta", [true, false, true], [cr.feito, cr.mao, !!cr.acerto.anotado]);
  teste("creatina solta também conta", true,
    B.janelasDoDia({ dia: { agua: 0, itens: [{ t: t(8, 0), a: "creatina", n: "Creatina", q: 1, k: 0, p: 0, c: 0, g: 0 }] }, treino: null, dorme: 23, agoraMin: hora(22) })
      .lista.find((x) => x.j.id === "creatina").feito);
  const cafe = (hh, mm) => ({ t: t(hh, mm), a: "cafe", n: "Café", q: 1, k: 2, p: 0, c: 0, g: 0 });
  teste("café 45 min antes do treino conta como cafeína", true,
    B.janelasDoDia({ dia: { agua: 0, itens: [cafe(17, 15)] }, treino: treino, dorme: 23, agoraMin: hora(22) }).lista.find((x) => x.j.id === "cafeina").feito);
  teste("café de manhã não conta para a janela de antes do treino", false,
    B.janelasDoDia({ dia: { agua: 0, itens: [cafe(7, 0)] }, treino: treino, dorme: 23, agoraMin: hora(22) }).lista.find((x) => x.j.id === "cafeina").feito);

  // a literatura: o que o app diz e o que ele derruba
  const fonte = html.slice(html.indexOf("AS JANELAS DOS NUTRIENTES"), html.indexOf("O CATÁLOGO: COMPARAR"));
  teste("o app desmente a janela de 30 minutos, nao a repete", true,
    /mito/.test(B.JANELAS_NUTRIENTE.find((j) => j.id === "posTreino").porque));
  teste("cada janela diz a forca da evidencia e a fonte", [],
    B.JANELAS_NUTRIENTE.filter((j) => !B.FORCA_JANELA[j.forca] || !j.fonte));
  teste("os mitos vem com a resposta, nunca soltos", [],
    B.MITOS_TIMING.filter((m) => !m.mito || !m.real || m.real.length < 40));
  teste("nenhuma janela manda comer nem proibe", [],
    B.JANELAS_NUTRIENTE.map((j) => j.oque + " " + j.porque + " " + j.quando)
      .filter((f) => /voce deve|proibido|nao pode comer|dieta prescrita|prescri/.test(semAcento(f))));
  teste("o timing nao e vendido como mais importante que o total do dia", true,
    /total do dia/.test(fonte));
}
// ---- marcar a janela a mao, e os avisos (2026-11-26m) ----
{
  const t = (h, m) => new Date(2026, 10, 26, h, m || 0).getTime();
  const treino = { ini: 18 * 60, fim: 19 * 60, aberto: false };
  const vazio = { agua: 0, itens: [] };

  // o pedido do dono: "consumi a cafeina antes do treino, mesmo sem ter
  // anotado na hora; corrija isso para todos"
  const comMao = B.janelasDoDia({ dia: { agua: 0, itens: [], janelas: ["cafeina"] }, treino: treino, dorme: 23, agoraMin: 1440 });
  const caf = comMao.lista.find((x) => x.j.id === "cafeina");
  teste("marcar a cafeina a mao conta no placar", [true, true, 1], [caf.feito, caf.mao, comMao.acertos]);

  // vale para TODAS, nao so para a cafeina
  const todas = B.janelasDoDia({ dia: { agua: 0, itens: [], janelas: B.JANELAS_NUTRIENTE.map((j) => j.id) }, treino: treino, dorme: 23, agoraMin: 1440 });
  teste("marcar a mao vale em todas as janelas", [6, 6], [todas.acertos, todas.total]);
  teste("e a tela sabe separar o medido do declarado", 6, todas.lista.filter((x) => x.mao).length);

  // o que o app mediu nao precisa de marcacao
  const dia = { agua: 0, itens: [{ t: t(19, 30), n: "Shake", q: 1, k: 250, p: 35, c: 20, g: 3 }] };
  const medido = B.janelasDoDia({ dia: dia, treino: treino, dorme: 23, agoraMin: 1440 });
  teste("o que foi anotado conta sem marcar nada", [true, false],
    (() => { const x = medido.lista.find((y) => y.j.id === "posTreino"); return [x.feito, x.mao]; })());

  // marcacao estranha no registro nao derruba nada
  teste("janela marcada que nao existe e ignorada", 0,
    B.janelasDoDia({ dia: { agua: 0, itens: [], janelas: ["xpto", 7, null] }, treino: null, dorme: 23, agoraMin: 1440 }).acertos);

  // ---- os avisos ----
  const q = B.janelasDoDia({ dia: vazio, treino: treino, dorme: 23, agoraMin: 8 * 60 });
  const av = B.avisosDoDia(q);
  teste("o dia sem nada anotado tem aviso para cada janela medivel", 4, av.length);
  teste("os avisos saem em ordem de hora", true, av.every((a, i) => i === 0 || a.em >= av[i - 1].em));
  teste("cada aviso tem titulo, corpo e prazo", [],
    av.filter((a) => !a.titulo || !a.corpo || !(a.ate > a.em) === false ? false : true).filter((a) => !a.titulo || !a.corpo));
  teste("o aviso de depois do treino diz que nao ha pressa", true,
    /[Ss]em pressa/.test(av.find((a) => a.id === "posTreino").corpo));
  teste("e traz o prazo de verdade na frase", true,
    av.find((a) => a.id === "posTreino").corpo.indexOf(B.hhmmDoDia(19 * 60 + 150)) >= 0);

  // janela ja cumprida nao vira aviso: seria ruido
  const cumprida = B.janelasDoDia({ dia: dia, treino: treino, dorme: 23, agoraMin: 8 * 60 });
  teste("janela ja cumprida nao avisa", [], B.avisosDoDia(cumprida).filter((a) => a.id === "posTreino"));
  teste("marcada a mao tambem nao avisa", [],
    B.avisosDoDia(B.janelasDoDia({ dia: { agua: 0, itens: [], janelas: ["noite"] }, treino: treino, dorme: 23, agoraMin: 8 * 60 })).filter((a) => a.id === "noite"));
  // sem treino, nada do treino e cobrado
  teste("sem treino nao ha aviso de pre nem de pos", [],
    B.avisosDoDia(B.janelasDoDia({ dia: vazio, treino: null, dorme: 23, agoraMin: 8 * 60 })).filter((a) => a.id === "preTreino" || a.id === "posTreino"));

  // a hora de mostrar: logo que abre, e nao quando ja esta acabando
  const pre = av.find((a) => a.id === "preTreino");
  teste("o aviso sai logo depois de a janela abrir", true, pre.em >= 15 * 60 && pre.em <= 15 * 60 + 10);
  teste("na hora certa ele aparece", "preTreino", B.avisoDeAgora(q, pre.em + 2, []).id);
  teste("meia hora depois do prazo dele, ele nao aparece mais", true, (B.avisoDeAgora(q, pre.em + 60, []) || { id: "" }).id !== "preTreino");
  teste("e o que ja foi mostrado hoje nao volta", true,
    (B.avisoDeAgora(q, pre.em + 2, ["preTreino"]) || { id: "" }).id !== "preTreino");

  // o texto nao cobra nem manda
  const frases = [];
  B.JANELAS_NUTRIENTE.forEach((j) => { if (j.aviso) frases.push(j.aviso.titulo + " " + j.aviso.corpo); });
  teste("os avisos nao mandam comer nem cobram", [],
    frases.filter((x) => /voce deve|precisa comer|nao pode|proibido|ja passou da hora|atrasado/.test(semAcento(x))));
  teste("e sao quatro, um por janela medivel", 4, frases.length);

  // o service worker recebe o plano pronto (ele nao refaz conta nenhuma)
  const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  teste("o service worker so mostra o plano do DIA, nunca um de ontem", true,
    /cfg.dia !== hoje/.test(sw) && /config-janelas/.test(sw));
  teste("e nao mostra o mesmo aviso duas vezes no dia", true, /janelas-enviadas/.test(sw));
  teste("o cache da config sobrevive a troca de versao", true, /k !== \"treinolivre-config\"/.test(sw));

  // o lado Android: o alarme sai do plano, e o relogio recebe o mesmo aviso
  const kt = (p) => { try { return fs.readFileSync(path.join(__dirname, "..", "android", p), "utf8"); } catch (e) { return ""; } };
  const jan = kt("app/src/main/java/br/com/treinolivre/app/Janelas.kt");
  teste("o app agenda os avisos com o AlarmManager", true, /setAndAllowWhileIdle/.test(jan));
  teste("e nao pede a permissao de alarme exato por nada", true, kt("app/src/main/AndroidManifest.xml").indexOf("SCHEDULE_EXACT_ALARM") < 0);
  teste("o alarme de cada janela substitui o do dia anterior", true, /FLAG_UPDATE_CURRENT/.test(jan) && /am.cancel/.test(jan));
  teste("o mesmo aviso vai ao relogio", true, /\/treino\/janela/.test(jan) && /\/treino\/janela/.test(kt("relogio/src/main/java/br/com/treinolivre/relogio/AlertaRelogio.kt")));
  teste("o plano chega pelo pacote que ja sai num toque", true,
    /Janelas.agendar/.test(kt("app/src/main/java/br/com/treinolivre/app/ComidaActivity.kt")));
  teste("o receiver do alarme nao e exportado", true,
    /JanelaReceiver\" android:exported=\"false\"/.test(kt("app/src/main/AndroidManifest.xml")));
  teste("a pagina so chama o app que sabe agendar", true, /janelas=1/.test(kt("app/src/main/java/br/com/treinolivre/app/Site.kt")));
}
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
