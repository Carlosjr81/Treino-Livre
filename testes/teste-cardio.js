// A esteira: a conta de distancia, ritmo e gasto, a meta da semana e o que
// a ficha sugere. Os numeros esperados foram feitos a mao pela equacao do ACSM.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f).replace(/\r\n/g, "\n");
}
const ini = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(ini + "const EXERCICIOS = ".length, html.indexOf("\n];", ini) + 2));
const exPorId = (id) => EXERCICIOS.find((e) => e.id === id);
const leitores = pedaco("const ehAquecimento", "// ---------- ESTATÍSTICAS DE UM TREINO");
const sugestao = pedaco("function ultimaExecucao", "// ---------- RECUPERAÇÃO POR GRUPO MUSCULAR");
eval(leitores + sugestao +
  "\nglobalThis.API = { medirCardio, resumoCardio, cardioDaSemana, fmtRitmo, textoCardio, falaCardio, ehCardio, montarSeries, sugerirCarga, copiaCardio, destaquesCardio };");
const A = globalThis.API;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = JSON.stringify(esperado), b = JSON.stringify(obtido);
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(46) + b); }
  else { mal++; console.log("  X    " + nome.padEnd(46) + b + ", esperava " + a); }
}
const r1 = (n) => Math.round(n * 10) / 10;

console.log("--- a conta de uma serie ---");
// 6 km/h plano, caminhando: v = 100 m/min, VO2 = 10 + 3,5 = 13,5 -> 3,9 MET
const cam = A.medirCardio({ segundos: "1800", vel: "6", incl: "0" }, 75, false);
teste("caminhada 30 min a 6 km/h: distancia", 3, r1(cam.km));
teste("caminhada: MET", 3.9, r1(cam.met));
teste("caminhada: kcal com 75 kg", 152, Math.round(cam.kcal));
teste("caminhada: ritmo", "10:00 /km", A.fmtRitmo(cam.ritmo));
// 10 km/h com 1%: v = 166,7, VO2 = 33,3 + 1,5 + 3,5 = 38,3 -> 10,95 MET
const cor = A.medirCardio({ segundos: "1200", vel: "10", incl: "1" }, 80, true);
teste("corrida 20 min a 10 km/h, 1%: MET", 11, r1(cor.met));
teste("corrida: distancia", 3.3, r1(cor.km));
teste("corrida: ritmo", "6:00 /km", A.fmtRitmo(cor.ritmo));
// 5 km/h com 10%: v = 83,3, VO2 = 8,3 + 15 + 3,5 = 26,8 -> 7,7 MET: a inclinacao
// faz da caminhada um treino vigoroso
const inc = A.medirCardio({ segundos: "1200", vel: "5", incl: "10" }, 75, false);
teste("caminhada inclinada 10%: MET", 7.7, r1(inc.met));
// acima de 7 km/h e corrida, mesmo no exercicio de caminhada
teste("8 km/h na caminhada conta como corrida", true, A.medirCardio({ segundos: "60", vel: "8" }, 75, false).corre);
teste("6,5 km/h na corrida conta como corrida", true, A.medirCardio({ segundos: "60", vel: "6.5" }, 75, true).corre);
teste("6,5 km/h na caminhada conta como caminhada", false, A.medirCardio({ segundos: "60", vel: "6.5" }, 75, false).corre);
teste("velocidade com virgula", 6.5, A.medirCardio({ segundos: "60", vel: "6,5" }).vel);
teste("sem peso usa 75 kg", Math.round(cam.kcal), Math.round(A.medirCardio({ segundos: "1800", vel: "6", incl: "0" }, null, false).kcal));
teste("ritmo de 9 km/h", "6:40 /km", A.fmtRitmo(60 / 9));
teste("texto da serie", "30 min a 6 km/h, 5% (3 km)", A.textoCardio({ segundos: "1800", vel: "6", incl: "5" }));

console.log("--- o que e serie de esteira ---");
teste("com velocidade e esteira", true, A.ehCardio({ segundos: "600", vel: "6" }));
teste("prancha nao e esteira", false, A.ehCardio({ segundos: "60" }));
teste("musculacao nao e esteira", false, A.ehCardio({ peso: "80", reps: "10" }));

console.log("--- intervalado e intensidade ---");
// 10 min a 5 km/h + 5 min a 10 km/h: o MET e a media pesada pelo tempo
const iv = A.resumoCardio([
  { segundos: "600", vel: "5", incl: "0", feito: true },
  { segundos: "300", vel: "10", incl: "0", feito: true },
  { segundos: "300", vel: "10", incl: "0", feito: true, aquec: true },
], 75, false);
teste("intervalado: aquecimento fica de fora", 15, Math.round(iv.min));
teste("intervalado: distancia", 1.7, r1(iv.km));
teste("intervalado: velocidade media", 6.7, r1(iv.vel));
teste("intervalado: intensidade", "moderada", iv.intensidade);
teste("3 km/h e leve", "leve", A.resumoCardio([{ segundos: "1200", vel: "3", incl: "0" }], 75).intensidade);
teste("caminhada inclinada e vigorosa", "vigorosa", A.resumoCardio([{ segundos: "1200", vel: "5", incl: "10" }], 75).intensidade);

console.log("--- a meta da semana (OMS: 150 min, vigoroso vale dobro) ---");
const agora = Date.now();
const hist = [
  { data: new Date(agora - 3600e3).toISOString(), itens: [
    { exercicioId: "esteira-caminhada", series: [{ segundos: "1800", vel: "6", incl: "0" }] },   // moderado 30
    { exercicioId: "esteira-corrida", series: [{ segundos: "1200", vel: "10", incl: "1" }] },    // vigoroso 20
    { exercicioId: "esteira-caminhada", series: [{ segundos: "1200", vel: "3", incl: "0" }] },   // leve: nao conta
    { exercicioId: "supino-reto", series: [{ peso: "80", reps: "10" }] },
  ] },
  { data: new Date(agora - 20 * 86400e3).toISOString(), itens: [
    { exercicioId: "esteira-corrida", series: [{ segundos: "3600", vel: "10", incl: "1" }] },    // fora da semana
  ] },
];
const sem = A.cardioDaSemana(hist, exPorId, agora - 7 * 86400e3, 75);
teste("moderado", 30, Math.round(sem.moderado));
teste("vigoroso", 20, Math.round(sem.vigoroso));
teste("equivalente (30 + 2x20)", 70, Math.round(sem.equivalente));

console.log("--- a ficha e a ultima vez ---");
const est = exPorId("esteira-caminhada");
teste("sem historico: padrao do exercicio", [{ segundos: "1800", mod: "caminhada", vel: "5.5", incl: "1", feito: false }], A.montarSeries(est, 1, null, null));
teste("minutos da ficha mandam no tempo", "1200", A.montarSeries(est, 1, 20, null)[0].segundos);
const histEst = [{ data: new Date().toISOString(), itens: [{ exercicioId: "esteira-caminhada", series: [{ segundos: "2400", vel: "6.2", incl: "3" }] }] }];
const sug = A.sugerirCarga(histEst, "esteira-caminhada", 12);
teste("sugestao repete velocidade e inclinacao", [true, "6.2", "3", false], [sug.cardio, sug.vel, sug.incl, sug.subiu]);
const mont = A.montarSeries(est, 1, null, sug)[0];
teste("sem minutos na ficha, repete o tempo", ["2400", "6.2", "3"], [mont.segundos, mont.vel, mont.incl]);
teste("dois blocos de intervalado", 2, A.montarSeries(est, 2, 5, sug).length);
teste("prancha continua igual", [{ segundos: "30", feito: false }], A.montarSeries(exPorId("prancha"), 1, 12, null));

console.log("--- os outros aparelhos ---");
const med = (s, perfil, kg) => A.medirCardio(s, kg || 75, perfil);
// bicicleta, ACSM do cicloergometro: 100 W, 75 kg -> (1,8 x 612 / 75 + 7) / 3,5 = 6,2 MET
teste("bike 100 W, 75 kg: MET", 6.2, r1(med({ segundos: "1800", mod: "bike", watts: "100" }).met));
teste("bike sem watts: media do Compendium", [6.8, true], [med({ segundos: "1800", mod: "bike", nivel: "5" }).met, med({ segundos: "1800", mod: "bike" }).estimado]);
// bicicleta de braco: (3 x 50 x 6,12 / 75 + 3,5) / 3,5 = 4,5 MET
teste("bike de braco 50 W: MET", 4.5, r1(med({ segundos: "900", mod: "bike-braco", watts: "50" }).met));
// escada, ACSM do step com degrau de 20 cm: 60/min -> (12 + 28,7 + 3,5) / 3,5 = 12,6 MET
teste("escada 60 degraus/min: MET", 12.6, r1(med({ segundos: "900", mod: "escada", cad: "60" }).met));
teste("remo 100 W: MET", 7, r1(med({ segundos: "1200", mod: "remo", watts: "100" }).met));
teste("remo 125 W: entre os pontos", 7.8, r1(med({ segundos: "1200", mod: "remo", watts: "125" }).met));
teste("remo 250 W: continua subindo", 15.5, r1(med({ segundos: "1200", mod: "remo", watts: "250" }).met));
teste("corda: 90, 110 e 130 saltos/min", [8.8, 11.8, 12.3], [90, 110, 130].map((c) => med({ segundos: "600", mod: "corda", cad: String(c) }).met));
teste("natacao 1000 m em 25 min (2:30/100 m)", 8.3, med({ segundos: "1500", mod: "natacao", m: "1000" }).met);
teste("natacao 1000 m em 30 min (3:00/100 m)", 5.8, med({ segundos: "1800", mod: "natacao", m: "1000" }).met);
teste("natacao: distancia em km", 1, med({ segundos: "1800", mod: "natacao", m: "1000" }).km);
// rua: 5 km em 25 min = 12 km/h, correndo: VO2 = 0,2 x 200 + 3,5 = 43,5 -> 12,4 MET
const rua = med({ segundos: "1500", mod: "rua-corrida", km: "5" });
teste("corrida na rua 5 km em 25 min: velocidade", 12, r1(rua.vel));
teste("corrida na rua: MET", 12.4, r1(rua.met));
teste("bike na rua 20 km em 1 h: faixa de 19 a 22 km/h", 8, med({ segundos: "3600", mod: "bike-rua", km: "20" }).met);
teste("eliptico: media do Compendium, avisada", [5, true], [med({ segundos: "1800", mod: "eliptico", nivel: "8" }).met, med({ segundos: "1800", mod: "eliptico" }).estimado]);
teste("serie de eliptico so com o tempo continua aerobica", true, A.ehCardio({ segundos: "1800", mod: "eliptico" }));
teste("copia leva todos os campos", { mod: "remo", watts: "120", cad: "24" }, A.copiaCardio({ segundos: "600", mod: "remo", watts: "120", cad: "24", feito: true }));
teste("texto da bike", "30 min · 120 W · nível 5", A.textoCardio({ segundos: "1800", mod: "bike", watts: "120", nivel: "5" }));
teste("fala da natacao", "30 minutos, 1000 metros", A.falaCardio({ segundos: "1800", mod: "natacao", m: "1000" }));
// 500 x cbrt(2,8 / 120) = 142,9 s
teste("ritmo do remo pelos watts (Concept2): 120 W", ["2:23 /500 m"], A.destaquesCardio("remo", A.resumoCardio([{ segundos: "1200", mod: "remo", watts: "120" }], 75, "remo")).slice(0, 1));
teste("ritmo da natacao por 100 m", ["1000 m", "2:30 /100 m"], A.destaquesCardio("natacao", A.resumoCardio([{ segundos: "1500", mod: "natacao", m: "1000" }], 75, "natacao")));
const bike = exPorId("bike-vertical");
teste("ficha da bike: padrao com watts e nivel", [{ segundos: "1800", mod: "bike", watts: "100", nivel: "5", feito: false }], A.montarSeries(bike, 1, null, null));
const hb = [{ data: new Date().toISOString(), itens: [{ exercicioId: "bike-vertical", series: [{ segundos: "2400", mod: "bike", watts: "140", nivel: "7" }] }] }];
teste("bike repete os watts da ultima vez", ["140", "7"], ((s) => [s.watts, s.nivel])(A.montarSeries(bike, 1, null, A.sugerirCarga(hb, "bike-vertical", 12))[0]));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
