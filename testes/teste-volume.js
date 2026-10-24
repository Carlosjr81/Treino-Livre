// As séries por músculo, com o indireto (séries fracionadas: a série em que o
// músculo é o principal vale 1, a série em que ele ajuda vale ½).
//
// O que este teste cobra, em ordem de importância:
//   1. A régua: supino = 1 de peito, ½ de tríceps e ½ de ombro.
//   2. O abdômen que só trabalha de carona aparece, e é dito como tal.
//   3. Aquecimento, drop e aeróbico não entram.
//   4. A média das semanas divide só pelas semanas desde o primeiro treino.
//   5. Os alertas: músculo acima da faixa por causa do indireto, e o par
//      desequilibrado (empurrar × puxar).
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
eval(
  pedaco("const ehTempo = ", "\n") + "\n" + pedaco("const temValor = ", "\n") + "\n" + pedaco("const ehCardio = ", "\n") + "\n" +
  pedaco("const ehAquecimento = ", "\n") + "\n" + pedaco("const serieConta = ", "\n") + "\n" + funcao("ehDrop") + funcao("segundaDaSemana") +
  pedaco("const GRUPOS = [", "\n];") + "\n];\n" + pedaco("const MUSCULOS = {", "\n};") + "\n};\n" +
  pedaco("const FAIXA_SERIES = ", "\n") + "\n" +
  pedaco("// ---------------- VOLUME FRACIONADO", "// ---------------- FIM DO VOLUME FRACIONADO") +
  "\nglobalThis.V = { volumeFracionadoTreino, volumeFracionadoPeriodo, alertasVolume, leituraVolume, textoComposicao, musculosDoEx };"
);
const V = globalThis.V;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = String(JSON.stringify(esperado)), b = String(JSON.stringify(obtido));
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(60) + b.slice(0, 80)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + b + "\n         esperava " + a); }
}
function contem(nome, texto, p) {
  const sim = String(texto || "").indexOf(p) >= 0;
  if (sim) { ok++; console.log("  ok   " + nome.padEnd(60) + String(texto).slice(0, 80)); }
  else { mal++; console.log("  X    " + nome.padEnd(60) + JSON.stringify(texto) + "\n         esperava conter " + JSON.stringify(p)); }
}

const EX = {
  supino: { id: "supino", grupo: "peito", musc: { p: ["peito"], s: ["triceps", "ombros"] } },
  agacho: { id: "agacho", grupo: "pernas", musc: { p: ["quadriceps", "gluteos"], s: ["posteriores", "abdomen", "lombar"] } },
  remada: { id: "remada", grupo: "costas", musc: { p: ["dorsal"], s: ["biceps", "trapezio"] } },
  triceps: { id: "triceps", grupo: "triceps", musc: { p: ["triceps"], s: [] } },
  velho: { id: "velho", grupo: "biceps" },                       // sem musc: conta para o músculo do grupo
  esteira: { id: "esteira", grupo: "pernas", cardio: "corrida", musc: { p: ["quadriceps"], s: [] } },
};
const exPorId = (id) => EX[id];
const s = (n, extra) => Array.from({ length: n }, () => Object.assign({ peso: 50, reps: 10 }, extra || {}));
const treino = (data, itens) => ({ id: data, data: data, itens: itens.map(([id, series]) => ({ exercicioId: id, series: series })) });
const porId = (lista) => { const o = {}; lista.forEach((x) => { o[x.id] = x; }); return o; };

console.log("--- 1. a régua: principal 1, ajudante ½ ---");
const t1 = V.volumeFracionadoTreino(treino("2026-10-20T10:00:00", [["supino", s(4)]]), exPorId);
const m1 = porId(t1);
teste("4 séries de supino: peito 4", 4, m1.peito.total);
teste("tríceps 4 indiretas = 2", [0, 4, 2], [m1.triceps.direto, m1.triceps.indireto, m1.triceps.total]);
teste("ombro 4 indiretas = 2", 2, m1.ombros.total);
teste("só os músculos que trabalharam", ["ombros", "peito", "triceps"], t1.map((x) => x.id).sort());

console.log("\n--- 2. o abdômen de carona ---");
const t2 = porId(V.volumeFracionadoTreino(treino("2026-10-20T10:00:00", [["agacho", s(4)], ["supino", s(3)]]), exPorId));
teste("agachamento: quadríceps e glúteo 1 cada", [4, 4], [t2.quadriceps.total, t2.gluteos.total]);
teste("abdômen: 0 direta, 4 indiretas = 2", [0, 4, 2], [t2.abdomen.direto, t2.abdomen.indireto, t2.abdomen.total]);
contem("a composição diz que é só indireto", V.textoComposicao(t2.abdomen), "só indireto: 4 × ½");
contem("e no misto diz as duas partes", V.textoComposicao({ direto: 8, indireto: 9 }), "8 diretas + 9 × ½ indiretas");

console.log("\n--- 3. o que não entra ---");
const t3 = porId(V.volumeFracionadoTreino(treino("2026-10-20T10:00:00", [
  ["supino", s(2).concat([{ peso: 30, reps: 10, aquec: true }, { peso: 40, reps: 8, drop: true }])],
  ["esteira", [{ segundos: 1200, mod: "corrida", vel: 10 }]],
  ["velho", s(3)],
]), exPorId));
teste("aquecimento e drop fora: peito 2", 2, t3.peito.total);
teste("aeróbico não vira série de quadríceps", undefined, t3.quadriceps);
teste("exercício sem musc conta para o músculo do grupo", 3, t3.biceps.total);
teste("músculo do ajudante não repete o principal", { p: ["peito"], s: ["ombros"] }, V.musculosDoEx({ grupo: "peito", musc: { p: ["peito"], s: ["peito", "ombros", "naoexiste"] } }));

console.log("\n--- 4. a semana e a média das semanas ---");
const agora = new Date("2026-10-24T12:00:00").getTime();   // sábado
const hist = [
  treino("2026-10-21T10:00:00", [["supino", s(4)]]),         // esta semana
  treino("2026-10-14T10:00:00", [["supino", s(4)], ["triceps", s(3)]]),   // semana passada
  treino("2026-10-07T10:00:00", [["supino", s(4)], ["triceps", s(3)]]),   // retrasada
];
const sem = porId(V.volumeFracionadoPeriodo(hist, exPorId, agora, 0).lista);
teste("esta semana: peito 4", 4, sem.peito.total);
const med = V.volumeFracionadoPeriodo(hist, exPorId, agora, 4);
teste("a média divide só pelas semanas desde o primeiro treino (2)", 2, med.semanas);
const mm = porId(med.lista);
teste("média do peito por semana: 4", 4, mm.peito.total);
teste("média do tríceps: 3 diretas + 4 × ½ = 5", 5, mm.triceps.total);
teste("sem histórico antes desta semana, média vazia", 0, V.volumeFracionadoPeriodo([hist[0]], exPorId, agora, 4).semanas);

console.log("\n--- 5. os alertas da divisão ---");
// tríceps: 14 diretas + 16 indiretas (16 × ½ = 8) = 22, acima da faixa só por causa do supino
const muito = porId(V.volumeFracionadoTreino(treino("2026-10-20T10:00:00", [["triceps", s(14)], ["supino", s(16)]]), exPorId));
teste("tríceps 22 = acima da faixa", "alto", V.leituraVolume(muito.triceps.total).id);
const al = V.alertasVolume(Object.keys(muito).map((k) => muito[k]).concat([]));
const tri = al.find((x) => x.musculo === "triceps") || {};
contem("o alerta diz que o indireto basta para cortar diretas", tri.txt, "dá para tirar séries diretas");
const empurra = V.volumeFracionadoTreino(treino("2026-10-20T10:00:00", [["supino", s(12)], ["remada", s(3)]]), exPorId);
const par = V.alertasVolume(empurra).find((x) => x.tipo === "par") || {};
contem("peito 12 contra dorsal 3: falta puxar", par.txt, "Empurrar × puxar");
const carona = V.alertasVolume(V.volumeFracionadoTreino(treino("2026-10-20T10:00:00", [["agacho", s(6)]]), exPorId)).find((x) => x.musculo === "abdomen") || {};
contem("abdômen só de carona vira aviso", carona.txt, "nenhuma série direta, mas 6 indiretas valem ~3 séries");
teste("faixa: 0, 5, 15", ["zero", "baixo", "faixa"], [0, 5, 15].map((n) => V.leituraVolume(n).id));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
