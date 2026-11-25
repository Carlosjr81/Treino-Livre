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
eval(pedaco("// ---------------- JARVIS BODY BALANCE: OS DADOS", "</script>") +
  pedaco("// ---------------- JARVIS BODY BALANCE: AS CONTAS", "// ---------------- FIM DO BODY BALANCE") +
  pedaco("const GPS_ESPERA_MS", "function TelaPercurso(") +
  "\nglobalThis.B = { ALIMENTOS_BR, RAPIDOS_RELOGIO, OBJETIVOS_BALANCE, FONTES_BALANCE, tmbMifflin, valorItem, totaisDoDia, kcalMacros, kcalTreinosDoDia, gastoDoDia, metaDoDia, statusDoDia," +
  " minutosParaGastar, compensacaoDeHoje, planoCompensacao, tendenciaPeso, gastoPeloCorpo, faseReal, sonoDoDia, conselhoSono, resumoDias, itensDoPrato, itemDeAlimento, quantidadeComida, itemEditado, contasDoBalance, resumoBalanceDia," +
  " lerPacoteComida, aplicarComidaDoRelogio, vigiarGps, textoErroGps };");
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
const fr = B.faseReal([1, 2, 3].map(() => ({ comeu: 2900, status: { id: "certo" }, gasto: { total: 2500 } })), 80);
teste("comendo 400 acima do gasto: BULKING, ~0,36 kg/semana", ["bulking", 0.36], [fr.id, fr.kgSemana]);
teste("sono do relógio pela manhã do dia", 7.5, B.sonoDoDia([{ ini: new Date("2026-11-24T23:00:00").getTime(), fim: new Date("2026-11-25T06:30:00").getTime() }], "2026-11-25", 0).h);
teste("sono curto no cutting fala do músculo (Nedeltcheva 2010)", true, /músculo/.test(B.conselhoSono(5.5, "perder")));

console.log("--- a foto do prato ---");
const prato = B.itensDoPrato([{ id: "arroz", fr: 0.25 }, { id: "bife", fr: 0.25 }], "m", 1);
// arroz: 520 g o prato inteiro × ¼ = 130 g; bife 520 × ¼ = 130 g; e 1 colher de óleo
teste("¼ de arroz num prato médio = 130 g", 130, Math.round(B.ALIMENTOS_BR.find((a) => a.id === "arroz").gr * prato[0].q));
teste("o óleo entra à parte", "azeite", prato[2].a);
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
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
