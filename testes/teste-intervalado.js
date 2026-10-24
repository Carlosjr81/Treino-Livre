// O treino intervalado (o ritmo que varia): os modelos, os alvos de cada
// intensidade, o relógio dos blocos, pausa, pular, estender e o resumo.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f).replace(/\r\n/g, "\n");
}
const ini = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(ini + "const EXERCICIOS = ".length, html.indexOf("\n];", ini) + 2));
const exPorId = (id) => EXERCICIOS.find((e) => e.id === id);
eval(pedaco("const ehAquecimento", "// ---------- ESTATÍSTICAS DE UM TREINO") +
  pedaco("function segundaDaSemana", "\n}\n") + "\n}\n" +
  pedaco("// ---------------- PERCURSO NA RUA (GPS)", "// ---------------- FIM DAS CONTAS DO CORREDOR") +
  pedaco("function aleatorioComSemente", "// ---- O plano: blocos") +
  pedaco("// ---------------- INTERVALADO: CONTAS", "// ---------------- FIM DAS CONTAS DO INTERVALADO") +
  "\nglobalThis.I = { MODELOS_INTERVALO, montarIntervalado, alvoDoNivel, confortoDoHistorico, comparaRitmo, criarSessaoIntervalado, consistenciaEsforcos, ritmosDeTreino };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const bate = tol !== undefined ? Math.abs(obtido - esperado) <= tol : JSON.stringify(obtido) === JSON.stringify(esperado);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(58) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(58) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado) + (tol !== undefined ? " ±" + tol : "")); }
}

console.log("--- os modelos ---");
I.MODELOS_INTERVALO.forEach((m) => {
  ["corrida", "caminhada"].forEach((at) => {
    const p = I.montarIntervalado({ modelo: m.id, atividade: at, semente: 4 });
    const soma = p.blocos.reduce((a, b) => a + b.dur, 0);
    const contiguo = p.blocos.every((b, i) => i === 0 || b.ini === p.blocos[i - 1].ini + p.blocos[i - 1].dur);
    teste(m.nome + " (" + at + "): monta, soma e tem esforco", [true, true, true], [!p.erro, soma === p.total && contiguo, p.blocos.some((b) => b.fase === "esforco")]);
  });
});
const cc = I.montarIntervalado({ modelo: "corre-caminha", atividade: "corrida" });
teste("corre-caminha: 8 vezes 1 min correndo e 2 caminhando", [8, 60000, 120000], [cc.blocos.filter((b) => b.nivel === "leve").length, cc.blocos.find((b) => b.nivel === "leve").dur, cc.blocos.find((b) => b.fase === "recuperacao").dur]);
const jp = I.montarIntervalado({ modelo: "japones", atividade: "caminhada" });
teste("japones: 5 vezes 3 rapidos e 3 devagar", [5, 180000], [jp.blocos.filter((b) => b.nivel === "caminhada-rapida").length, jp.blocos.find((b) => b.nivel === "caminhada-rapida").dur]);
const tirosCam = I.montarIntervalado({ modelo: "tiros", atividade: "caminhada" });
teste("na caminhada nenhum bloco pede corrida", true, tirosCam.blocos.every((b) => b.nivel === "caminhada" || b.nivel === "caminhada-rapida"));
const f1 = I.montarIntervalado({ modelo: "fartlek", semente: 9 }), f2 = I.montarIntervalado({ modelo: "fartlek", semente: 9 }), f3 = I.montarIntervalado({ modelo: "fartlek", semente: 10 });
teste("fartlek: mesma semente, mesmo treino; outra, outro", [true, false], [JSON.stringify(f1) === JSON.stringify(f2), JSON.stringify(f1) === JSON.stringify(f3)]);
teste("personalizado sem esforco e recusado", true, !!I.montarIntervalado({ modelo: "personalizado", blocos: [{ nivel: "leve", seg: 60 }] }).erro);
teste("bloco de 5 s e recusado", true, !!I.montarIntervalado({ modelo: "personalizado", blocos: [{ nivel: "forte", seg: 5 }] }).erro);
teste("repeticoes mudam o tamanho", true, I.montarIntervalado({ modelo: "tiros", reps: 8 }).total > I.montarIntervalado({ modelo: "tiros", reps: 4 }).total);

console.log("--- os alvos ---");
const rt = I.ritmosDeTreino(50);
teste("com VDOT 50, o forte e o limiar de Daniels (4:15/km)", 4.25, 60 / I.alvoDoNivel("forte", { ritmos: rt, atividade: "corrida" }).kmh, 0.1);
teste("sem VDOT, o forte e o confortavel +20%", 12, I.alvoDoNivel("forte", { confortoKmh: 10, atividade: "corrida" }).kmh);
teste("caminhada rapida nunca passa de 7 km/h", 7, I.alvoDoNivel("caminhada-rapida", { confortoKmh: 6.5, atividade: "caminhada" }).kmh);
teste("sem referencia nenhuma, so a escala de esforco", null, I.alvoDoNivel("forte", {}));
teste("comparar o ritmo, com folga de 4%", ["abaixo", "no ritmo", "acima", null], [I.comparaRitmo(10, { kmh: 12 }), I.comparaRitmo(11.8, { kmh: 12 }), I.comparaRitmo(13, { kmh: 12 }), I.comparaRitmo(0, { kmh: 12 })]);
const h = [5, 5.5, 6].map((k, i) => ({ id: "c" + i, data: new Date(2026, 9, 1 + i).toISOString(), itens: [{ exercicioId: "esteira-caminhada", series: [{ segundos: "1800", mod: "caminhada", vel: String(k) }] }] }));
teste("o confortavel da caminhada vem do historico (mediana)", 5.5, I.confortoDoHistorico(h, exPorId, "caminhada"), 0.01);

console.log("--- o relogio dos blocos ---");
const plano = I.montarIntervalado({ modelo: "tiros", reps: 2 });
const s = I.criarSessaoIntervalado(plano);
const evs = s.iniciar();
for (let t = 0; t < plano.total + 5000; t += 500) { if (s.blocoAtual()) s.amostra(s.blocoAtual().fase === "esforco" ? 12 : 9); evs.push(...s.avancar(500)); }
const blocosEv = evs.filter((e) => e.tipo === "bloco");
teste("um aviso por bloco, na ordem", plano.blocos.map((b) => b.id), blocosEv.map((e) => e.bloco.id));
teste("contagem 3-2-1 antes de cada troca (nao no fim)", (plano.blocos.length - 1) * 3, evs.filter((e) => e.tipo === "conta").length);
teste("fim uma vez so", 1, evs.filter((e) => e.tipo === "fim").length);
const res = s.resumo();
teste("velocidade media dos esforcos", 12, res.find((b) => b.fase === "esforco").kmh, 0.1);
teste("consistencia de tiros iguais e quase zero", 0, I.consistenciaEsforcos(res).variacao, 0.01);
const s2 = I.criarSessaoIntervalado(plano);
s2.iniciar();
s2.avancar(1000); s2.pausar();
for (let i = 0; i < 100; i++) s2.avancar(1000);
teste("pausa nao conta tempo", 1000, s2.s.tAtivo);
s2.retomar(); s2.avancar(9999999);
teste("salto do relogio soma no maximo 2 s", 3000, s2.s.tAtivo);
const s4 = I.criarSessaoIntervalado(plano);
s4.iniciar();
const ev4 = s4.avancar(150000, true);
teste("saiu do app 2:30: o treino anda os 2:30", 150000, s4.s.tAtivo);
teste("e cada troca no caminho fica registrada", plano.blocos.filter((b) => b.ini <= 150000).length - 1, ev4.filter((e) => e.tipo === "bloco").length);
const antes = s2.total();
s2.estender(30000);
teste("+30 s alonga o treino em 30 s", antes + 30000, s2.total());
const b0 = s2.blocoAtual().id;
s2.pular();
teste("pular vai para o proximo bloco", true, s2.blocoAtual().id !== b0 && s2.resumo().find((b) => b.id === b0).pulado);
const s3 = I.criarSessaoIntervalado(plano);
s3.iniciar();
for (let t = 0; t < 120000; t += 1000) { s3.amostra(t > 60000 ? null : 10); s3.avancar(1000); }
teste("sem leitura, o bloco nao inventa velocidade", 10, s3.resumo()[0].kmh);
teste("e a cobertura mostra o buraco", true, s3.resumo()[0].cobertura < 0.6);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
