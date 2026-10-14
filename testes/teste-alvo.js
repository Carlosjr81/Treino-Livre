// Onde cai a proxima frase do Jarvis, e de que serie fala o "Proxima:" do fim
// do descanso. Nasceu de um treino real: a pessoa pulou o hack, foi para a
// flexora, e a cada serie ouvia "proxima: agachamento no hack".
const html = require("./app").lerApp();
const i = html.indexOf("function alvoDaSessao"), f = html.indexOf("// ---------- RECUPERAÇÃO POR GRUPO MUSCULAR", i);
if (i < 0 || f < 0) { console.error("nao achei alvoDaSessao"); process.exit(1); }
eval(html.slice(i, f).replace(/\r\n/g, "\n") + "\nglobalThis.alvoDaSessao = alvoDaSessao;");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const a = JSON.stringify(esperado), b = JSON.stringify(obtido);
  if (a === b) { ok++; console.log("  ok   " + nome.padEnd(52) + b); }
  else { mal++; console.log("  X    " + nome.padEnd(52) + b + ", esperava " + a); }
}
const ex = (id, feitas, total, conjunto) => ({
  exercicioId: id, conjunto: conjunto || null,
  series: Array.from({ length: total }, (_, k) => ({ peso: "40", reps: "12", feito: k < feitas })),
});

console.log("--- o caso do treino real ---");
// ficha: extensora, hack, flexora, adutora. Fez a extensora, pulou o hack.
const ficha = () => [ex("cadeira-extensora", 3, 3), ex("agachamento-hack", 0, 3), ex("mesa-flexora", 1, 3), ex("cadeira-adutora", 0, 3)];
teste("marcou a flexora: a proxima e a flexora", { ei: 2, si: 1 }, alvoDaSessao(ficha(), 2));
const f2 = ficha(); f2[2] = ex("mesa-flexora", 3, 3);
teste("acabou a flexora: vem a adutora, nao o hack", { ei: 3, si: 0 }, alvoDaSessao(f2, 2));
const f3 = ficha(); f3[2] = ex("mesa-flexora", 3, 3); f3[3] = ex("cadeira-adutora", 3, 3);
teste("acabou o resto: ai sim volta no hack que ficou", { ei: 1, si: 0 }, alvoDaSessao(f3, 3));

console.log("--- sem foco, como era antes ---");
teste("comeco do treino: o primeiro pendente", { ei: 1, si: 0 }, alvoDaSessao(ficha(), null));
const tudo = [ex("supino-reto", 3, 3), ex("crucifixo", 3, 3)];
teste("tudo feito: serie a mais no ultimo", { ei: 1, si: 3 }, alvoDaSessao(tudo, null));
teste("tudo feito, com foco: serie a mais no foco", { ei: 0, si: 3 }, alvoDaSessao(tudo, 0));
teste("sessao vazia", null, alvoDaSessao([], null));

console.log("--- bi-set: alterna entre os dois ---");
const bi = (a, b) => [ex("supino-reto", 3, 3), ex("rosca-direta", a, 3, "x"), ex("triceps-corda", b, 3, "x"), ex("abdominal-supra", 0, 3)];
teste("fez a 1 da rosca: a vez e do triceps", { ei: 2, si: 0 }, alvoDaSessao(bi(1, 0), 1));
teste("fez a 1 do triceps: volta na rosca", { ei: 1, si: 1 }, alvoDaSessao(bi(1, 1), 2));
teste("conjunto acabou: segue para o proximo", { ei: 3, si: 0 }, alvoDaSessao(bi(3, 3), 2));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
