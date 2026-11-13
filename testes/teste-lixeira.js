// A lixeira do histórico: o treino apagado sem querer volta. Errar aqui é
// duplicar um treino (recorde contado duas vezes) ou perder o que a pessoa
// quis recuperar.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(pedaco("// ---- A lixeira do histórico ----", "// ---- fim da lixeira") +
  "\nglobalThis.L = { limparLixeira, lixeiraComApagado, lixeiraSem, juntarRecuperados, treinosQueFaltam, registroDaUltimaSessao, LIXEIRA_DIAS, LIXEIRA_MAX };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const DIA = 86400000;
const agora = Date.UTC(2026, 10, 13, 12);
const reg = (id, dia, nome) => ({ id: id, nome: nome || "Treino " + id, data: new Date(Date.UTC(2026, 10, dia, 18)).toISOString(), itens: [{ exercicioId: "supino", series: [{ peso: "80", reps: "10" }] }] });

console.log("--- a lixeira guarda ---");
let lx = L.lixeiraComApagado([], reg("a", 10), agora);
teste("apagado entra na lixeira", ["a"], lx.map((x) => x.reg.id));
lx = L.lixeiraComApagado(lx, reg("b", 11), agora + 1000);
teste("o mais recente primeiro", ["b", "a"], lx.map((x) => x.reg.id));
lx = L.lixeiraComApagado(lx, reg("a", 10), agora + 2000);
teste("o mesmo treino apagado de novo não vira dois", ["a", "b"], lx.map((x) => x.reg.id));
teste("sai da lixeira", ["b"], L.lixeiraSem(lx, "a").map((x) => x.reg.id));

console.log("--- 30 dias ---");
const velho = [{ reg: reg("v", 1), em: agora - 31 * DIA }, { reg: reg("n", 2), em: agora - 29 * DIA }];
teste("mais de 30 dias some", ["n"], L.limparLixeira(velho, agora).map((x) => x.reg.id));
teste("lixo no armazenamento não quebra", [], L.limparLixeira([null, { em: 1 }, { reg: {} , em: agora }, "x"], agora));
teste("nem algo que não é lista", [], L.limparLixeira({ a: 1 }, agora));
let muitos = [];
for (let i = 0; i < 80; i++) muitos = L.lixeiraComApagado(muitos, reg("m" + i, 5), agora);
teste("no máximo " + L.LIXEIRA_MAX, L.LIXEIRA_MAX, muitos.length);

console.log("--- recuperar ---");
const hist = [reg("c", 12), reg("a", 8)];
const volta = L.juntarRecuperados(hist, [reg("b", 10)]);
teste("volta para o lugar dele pela data", ["c", "b", "a"], volta.map((h) => h.id));
teste("o que já está no histórico não duplica", ["c", "a"], L.juntarRecuperados(hist, [reg("a", 8)]).map((h) => h.id));
teste("registro torto não entra", ["c", "a"], L.juntarRecuperados(hist, [{ id: "x" }, null]).map((h) => h.id));
teste("o histórico de antes não muda", ["c", "a"], hist.map((h) => h.id));

console.log("--- um backup só acrescenta ---");
const backup = [reg("c", 12), reg("b", 10), reg("a", 8), { id: "vazio", itens: [] }];
teste("traz só os que faltam", ["b"], L.treinosQueFaltam(hist, backup).map((h) => h.id));
teste("backup sem histórico", [], L.treinosQueFaltam(hist, undefined));

console.log("--- a cópia do último treino finalizado ---");
const fim = Date.UTC(2026, 10, 12, 19, 30);
const guardada = { registroId: String(fim), sessao: { nome: "Treino A", inicio: fim - 52 * 60000, itens: [
  { exercicioId: "supino", obs: "banco 3", series: [{ peso: "60", reps: "10", feito: true, aquec: true }, { peso: "80", reps: "8", feito: true }, { peso: "80", reps: "8", feito: false }] },
  { exercicioId: "remada", series: [{ peso: "50", reps: "10", feito: false }] },
] } };
const serieDe = (s) => { const n = { peso: s.peso, reps: s.reps }; if (s.aquec) n.aquec = true; return n; };
const r = L.registroDaUltimaSessao(guardada, [reg("c", 12)], serieDe);
teste("refaz o registro com o mesmo id", String(fim), r && r.id);
teste("a data é a da finalização", new Date(fim).toISOString(), r && r.data);
teste("a duração vem do começo da sessão", 52, r && r.duracaoMin);
teste("só as séries feitas, com o aquecimento marcado", [{ peso: "60", reps: "10", aquec: true }, { peso: "80", reps: "8" }], r && r.itens[0].series);
teste("exercício sem série feita fica de fora", 1, r && r.itens.length);
teste("a observação vem junto", "banco 3", r && r.itens[0].obs);
teste("se ainda está no histórico, não é achado", null, L.registroDaUltimaSessao(guardada, [{ id: String(fim) }], serieDe));
teste("cópia vazia não inventa treino", null, L.registroDaUltimaSessao(null, [], serieDe));
teste("cópia sem série feita também não", null, L.registroDaUltimaSessao({ registroId: "5", sessao: { itens: [{ exercicioId: "x", series: [{ feito: false }] }] } }, [], serieDe));

console.log("\n" + ok + " passou / " + mal + " falhou");
if (mal) process.exit(1);
