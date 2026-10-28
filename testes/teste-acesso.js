// O login com aprovação: o formato do Firestore, quem entra sem rede, a ordem
// do painel e as mensagens de erro. A conversa de verdade com o Firebase é
// conferida no navegador, com um Firebase de mentira (ver o LEIA-ME).
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const plural = (n, s, p) => (n === 1 ? s : p);
eval(pedaco("// ---------------- ACESSO: AS CONTAS", "// ---------------- FIM DAS CONTAS") +
  "\nglobalThis.A = { paraFirestore, deFirestore, aparelhoDe, liberadoSemRede, ordenarContas, resumoContas, filtrarContas, erroDeConta, ehEmailDono, sugerirEmail, FIREBASE_ACESSO, EMAIL_DONO };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

console.log("--- o porteiro só liga com o projeto configurado ---");
teste("o login está ligado no projeto do dono", ["treino-livre", true], [A.FIREBASE_ACESSO.projectId, /^AIza/.test(A.FIREBASE_ACESSO.apiKey)]);
teste("o dono é o e-mail do Carlos", "carlos.jr.81@hotmail.com", A.EMAIL_DONO);
teste("maiúscula e espaço não mudam quem é o dono", true, A.ehEmailDono("  Carlos.Jr.81@Hotmail.com "));
teste("outro e-mail não é dono", false, A.ehEmailDono("carlos.jr.81@hotmail.com.br"));

console.log("\n--- o formato do Firestore ---");
const doc = A.paraFirestore({ email: "a@b.com", acessos: 3, status: "pendente", nada: null });
teste("número inteiro vai como integerValue (texto)", { integerValue: "3" }, doc.fields.acessos);
teste("ida e volta", { email: "a@b.com", acessos: 3, status: "pendente", nada: null, uid: "u1" },
  A.deFirestore(Object.assign({ name: "projects/p/databases/(default)/documents/usuarios/u1" }, doc)));
teste("documento vazio não é conta", null, A.deFirestore({}));

console.log("\n--- sem internet ---");
const agora = Date.parse("2026-10-28T12:00:00Z");
teste("liberado conferido ontem: entra", true, A.liberadoSemRede({ status: "liberado", conferidoEm: agora - 864e5 }, agora));
teste("liberado conferido há 8 dias: precisa conferir", false, A.liberadoSemRede({ status: "liberado", conferidoEm: agora - 8 * 864e5 }, agora));
teste("aguardando nunca entra sem conferir", false, A.liberadoSemRede({ status: "pendente", conferidoEm: agora }, agora));
teste("bloqueado nunca entra", false, A.liberadoSemRede({ status: "bloqueado", conferidoEm: agora }, agora));
teste("sem nada guardado, não entra", false, A.liberadoSemRede(null, agora));

console.log("\n--- o painel ---");
const contas = [
  { uid: "a", nome: "Ana", email: "ana@x.com", status: "liberado", ultimoAcesso: agora - 3600000, criadoEm: agora - 9e8 },
  { uid: "b", nome: "Bia", email: "bia@x.com", status: "pendente", criadoEm: agora - 1000 },
  { uid: "c", nome: "Caio", email: "caio@x.com", status: "bloqueado", ultimoAcesso: agora - 100 },
  { uid: "d", nome: "Duda", email: "duda@x.com", status: "liberado", ultimoAcesso: agora - 60000, criadoEm: agora - 9e8 },
  { uid: "e", nome: "Edu", email: "edu@x.com", status: "pendente", criadoEm: agora - 5000 },
];
teste("quem espera em cima (o mais novo primeiro), bloqueados no fim", ["b", "e", "d", "a", "c"], A.ordenarContas(contas).map((c) => c.uid));
const r = A.resumoContas(contas, agora);
teste("as contas do topo do painel", [5, 2, 2, 1], [r.total, r.pendente, r.liberado, r.bloqueado]);
teste("filtro: só quem espera", ["b", "e"], A.filtrarContas(contas, "pendente", "").map((c) => c.uid));
teste("busca por nome ou e-mail, sem caixa", ["d"], A.filtrarContas(contas, "todos", "DUDA").map((c) => c.uid));

console.log("\n--- o aparelho e os erros ---");
teste("Android pelo app", "Android · app", A.aparelhoDe("Mozilla/5.0 (Linux; Android 14)", true));
teste("iPhone pelo navegador", "iPhone · navegador", A.aparelhoDe("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)", false));
teste("computador", "Computador · navegador", A.aparelhoDe("Mozilla/5.0 (Windows NT 10.0)", false));
teste("e-mail já cadastrado", "Já existe uma conta com este e-mail. Toque em Entrar.", A.erroDeConta("EMAIL_EXISTS"));
teste("senha fraca (o Firebase manda com explicação)", "A senha precisa de pelo menos 6 caracteres.", A.erroDeConta("WEAK_PASSWORD : Password should be at least 6 characters"));
teste("erro desconhecido diz o código", true, /XPTO/.test(A.erroDeConta("XPTO")));

console.log("\n--- o e-mail digitado errado ---");
teste("gmial vira gmail", "ana@gmail.com", A.sugerirEmail("ana@gmial.com"));
teste("hotmal.com vira hotmail.com", "ana@hotmail.com", A.sugerirEmail("Ana@Hotmal.com"));
teste("gmail.co vira gmail.com", "ana@gmail.com", A.sugerirEmail("ana@gmail.co"));
teste("e-mail certo: nada a sugerir", null, A.sugerirEmail("ana@gmail.com"));
teste("domínio da empresa: não inventa", null, A.sugerirEmail("ana@globalpack.com.br"));
teste("ainda digitando: não sugere", null, A.sugerirEmail("ana@gm"));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
