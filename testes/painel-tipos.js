// Um Firebase de mentira já povoado: o dono logado e contas de todos os tipos.
const ag = Date.now(), dia = 864e5;
const DONO = "carlos.jr.81@hotmail.com";
const contas = {}, docs = {};
function por(uid, email, nome, doc) {
  contas[email] = { uid: uid, email: email, senha: "123456", verificado: true };
  docs[uid] = Object.assign({ email: email, nome: nome, status: "liberado", criadoEm: ag - 90 * dia, ultimoAcesso: ag - 2 * dia }, doc || {});
}
por("dono", DONO, "Carlos", {});
por("p1", "p1@x.com", "Ana", { pagoAte: ag + 30 * dia, plano: "mensal" });
por("p2", "p2@x.com", "Bia", { pagoAte: ag + 3 * dia, plano: "mensal" });
por("vit", "vit@x.com", "Caio", { vitalicio: true, plano: "vitalicio" });
por("cor", "cor@x.com", "Duda", { cortesia: true, cortesiaAte: 0, cortesiaMotivo: "amigo" });
por("tes", "tes@x.com", "Edu", { criadoEm: ag - 2 * dia });
por("sem", "sem@x.com", "Fê", {});
por("velho", "velho@x.com", "Gui", { pagoAte: ag - 10 * dia, plano: "mensal" });
por("esp", "esp@x.com", "Hugo", { status: "pendente" });
por("blo", "blo@x.com", "Ivo", { status: "bloqueado", motivo: "spam" });
por("venc", "venc@x.com", "Joca", { ate: ag - dia });
const config = { auto: false, cobranca: true, cobrancaDesde: ag - 90 * dia, testeDias: 7,
  planos: JSON.stringify([{ id: "mensal", nome: "Mensal", dias: 30, preco: 29.9, ativo: true }]) };
window.__fbInicial = { contas: contas, docs: docs, config: config };
localStorage.setItem("fb-falso", JSON.stringify(window.__fbInicial));
localStorage.setItem("treinolivre:conta", JSON.stringify({
  uid: "dono", email: DONO, nome: "Carlos", status: "liberado", conferidoEm: ag,
  idToken: "tok:dono", refresh: "ref:dono", expira: ag + 36e5, verificado: true,
}));
localStorage.setItem("treinolivre:prontidao", JSON.stringify({ v: "2026-11-02", em: ag, r: "nao", reg: 1 }));
