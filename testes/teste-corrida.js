// As contas do corredor: melhores esforços, VDOT de Daniels contra a tabela
// publicada, ritmos de treino, relevo, zonas de frequência cardíaca, passos
// pelo acelerômetro e o painel com recordes e carga.
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
  "\nglobalThis.A = { melhoresEsforcos, esforcosDeSerie, vdotDe, tempoPrevisto, ritmosDeTreino, fatorInclinacao, distanciaPlana," +
  " fcMaxima, zonaDaFc, tempoNasZonas, criarContadorPassos, analiseCorrida, atividadesDeCorrida, recordesNovos, painelCorredor, tipoCorrida, leituraCarga };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const bate = tol !== undefined ? Math.abs(obtido - esperado) <= tol : JSON.stringify(obtido) === JSON.stringify(esperado);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(54) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(54) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado) + (tol !== undefined ? " ±" + tol : "")); }
}
const seg = (h, m, s) => ((h * 60 + m) * 60 + s) * 1000;

console.log("--- VDOT contra a tabela de Daniels ---");
// VDOT 50: 5 km em 19:57, 10 km em 41:21, meia em 1:31:35, maratona em 3:10:49
teste("5 km em 19:57 da VDOT 50", 50, A.vdotDe(5000, seg(0, 19, 57)), 0.4);
teste("maratona em 3:10:49 da VDOT 50", 50, A.vdotDe(42195, seg(3, 10, 49)), 0.4);
teste("VDOT 50 preve 10 km em 41:21 (s)", seg(0, 41, 21) / 1000, A.tempoPrevisto(50, 10000) / 1000, 15);
teste("VDOT 50 preve a meia em 1:31:35 (s)", seg(1, 31, 35) / 1000, A.tempoPrevisto(50, 21097) / 1000, 40);
teste("VDOT 40 preve 5 km em 24:08 (s)", seg(0, 24, 8) / 1000, A.tempoPrevisto(40, 5000) / 1000, 15);
const rt = A.ritmosDeTreino(50);
// tabela de Daniels para VDOT 50: limiar 4:15/km, intervalado 3:55/km, maratona 4:31/km
teste("limiar a VDOT 50 (min/km)", 4.25, rt.limiar, 0.1);
teste("intervalado a VDOT 50 (min/km)", 3.92, rt.intervalado, 0.1);
teste("maratona a VDOT 50 (min/km)", 4.52, rt.maratona, 0.05);
teste("facil mais lento que maratona", true, rt.facil[0] > rt.maratona && rt.facil[1] > rt.facil[0]);
teste("corrida curta demais nao da VDOT", 0, A.vdotDe(800, 150000));

console.log("--- relevo e coracao ---");
teste("plano vale 1", 1, A.fatorInclinacao(0), 0.001);
teste("10% de subida custa uns 66% a mais", 1.66, A.fatorInclinacao(0.1), 0.03);
teste("10 km com 100 m de sobe e desce", 10260, A.distanciaPlana(10000, 100, 100), 1);
teste("descida nao devolve mais de 15%", 8500, A.distanciaPlana(10000, 0, 2000), 1);
teste("FC maxima aos 40 anos (Tanaka)", 180, A.fcMaxima(40));
teste("150 bpm com maxima 180 e Z4", 3, A.zonaDaFc(150, 180));
// um buraco de 10 s entre amostras (a cinta perdeu o sinal) conta no maximo 5
teste("tempo nas zonas, buraco limitado a 5 s", [0, 0, 6000, 5000, 0], A.tempoNasZonas([[0, 120], [1000, 130], [11000, 130], [16000, 150]], 180));

console.log("--- passos pelo acelerometro ---");
let semente = 3;
const sorte = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
function balanco(hz, amp, ruido, s) {
  const c = A.criarContadorPassos();
  for (let t = 0; t < s * 1000; t += 1000 / 60) {
    const g = 9.8 + amp * Math.sin(2 * Math.PI * hz * (t / 1000)) + (sorte() - 0.5) * 2 * ruido;
    c.processar(0.3, g, 0.5, t);
  }
  return c;
}
teste("correndo a 168 passos/min, 60 s", 168, balanco(2.8, 5, 0.6, 60).passos, 4);
teste("caminhando a 108 passos/min, 60 s", 108, balanco(1.8, 2.5, 0.3, 60).passos, 4);
teste("cadencia dos ultimos 30 s", 168, balanco(2.8, 5, 0.6, 60).cadencia(60000), 6);
teste("celulas paradas tremendo nao andam", 0, balanco(1, 0, 0.3, 60).passos, 2);

console.log("--- melhores esforcos no percurso ---");
const LAT0 = -23.5614, LNG0 = -46.6559, M_LNG = 111320 * Math.cos(LAT0 * Math.PI / 180);
semente = 7;
function correr(trechos) {
  // trechos: [[metros, min/km]], um ponto por segundo, ruido de 3 m
  const pts = [];
  let x = 0, t = 0;
  trechos.forEach(([m, ritmo]) => {
    const v = 1000 / (ritmo * 60);
    const fim = x + m;
    while (x < fim) {
      pts.push({ lat: LAT0 + ((sorte() - 0.5) * 6) / 111320, lng: LNG0 + (x + (sorte() - 0.5) * 6) / M_LNG, t: t, acc: 8, alt: null, seg: 0 });
      x += v; t += 1000;
    }
  });
  return pts;
}
const tiro = correr([[1000, 6], [1000, 4], [1000, 6]]);
const es = A.melhoresEsforcos(tiro);
teste("melhor 1 km e o do meio (4:00)", 240, es[1000] / 1000, 8);
teste("melhor 400 m dentro dele (1:36)", 96, es[400] / 1000, 6);
teste("sem 5 km num percurso de 3", undefined, es[5000]);
const an = A.analiseCorrida(tiro, { passos: 2700 });
teste("cadencia media da corrida", 2700 / (an.ms / 60000), an.cadencia, 1);
teste("passada media (m)", 1.11, an.passada, 0.05);
teste("primeira metade mais lenta (sem split negativo)", true, an.metades[0] > 0 && an.metades[1] > 0);
teste("esteira: 30 min a 10 km/h da 5 km em 30:00", 1800, A.esforcosDeSerie(5, 1800000)[5000] / 1000);

console.log("--- o painel do corredor ---");
const AGORA = new Date(2026, 9, 15, 12).getTime();
const d = (dias) => new Date(AGORA - dias * 864e5).toISOString();
const corr = (id, dias, km, min, extra) => Object.assign({ id: id, data: d(dias), nome: "x", itens: [{ exercicioId: "corrida-rua", series: [{ segundos: String(min * 60), mod: "rua-corrida", km: String(km) }] }] }, extra || {});
const hist = [
  corr("a", 20, 5, 30), corr("b", 13, 5, 27), corr("c", 6, 5, 25),
  corr("d", 1, 10, 55, { rota: { km: 10, ms: 55 * 60000, esforcos: { 400: 100000, 1000: 290000, 1609: 470000, 5000: 1560000, 10000: 3300000 } } }),
  { id: "e", data: d(2), nome: "y", itens: [{ exercicioId: "esteira-caminhada", series: [{ segundos: "3600", mod: "caminhada", vel: "6", incl: "0" }] }] },
];
const P = A.painelCorredor(hist, exPorId, AGORA);
teste("cinco atividades", 5, P.ativs.length);
teste("a caminhada e caminhada", "caminhada", P.ativs.find((a) => a.id === "e").tipo);
teste("recorde de 5 km corrido: 25:00", 1500, P.recordes.corrida[5000].ms / 1000);
teste("recorde de 5 km caminhado separado", 3000, P.recordes.caminhada[5000].ms / 1000);
teste("o de 10 km bateu o recorde de 5 km? nao (26:00)", [], A.recordesNovos(P.ativs, "d").filter((r) => r.m === 5000));
teste("e bateu o de 1 km (4:50 contra 5:00)", true, A.recordesNovos(P.ativs, "d").some((r) => r.m === 1000 && r.tipo === "corrida"));
teste("estreia nao e recorde", [], A.recordesNovos(P.ativs, "a"));
teste("VDOT das ultimas 8 semanas (5 km em 25:00)", A.vdotDe(5000, 1500000), P.vdot, 0.01);
teste("km da semana inclui a caminhada", true, P.totais.semana.km >= 10);
// 7 dias: 5 + 10 + 6 (a caminhada conta); 28 dias: tudo, 31 km, media de 7,75
teste("carga: 7 dias contra a media de 28", 21 / (31 / 4), P.carga.razao, 0.01);
teste("previsao de 4 provas", 4, P.previsoes.length);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
