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
  "\nglobalThis.A = { paraFirestore, deFirestore, aparelhoDe, liberadoSemRede, ordenarContas, resumoContas, filtrarContas, erroDeConta, ehEmailDono, sugerirEmail, FIREBASE_ACESSO, EMAIL_DONO, situacaoConta, prazoAte, recadoNovo, csvContas, filtroConta, csvAceites, ordenarAceites };");

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

console.log("\n--- prazo, recado, filtros e a planilha ---");
{
  const ag = Date.parse("2026-10-28T12:00:00");
  teste("liberado sem prazo é liberado", "liberado", A.situacaoConta({ status: "liberado" }, ag));
  teste("liberado com prazo vencido é vencido", "vencido", A.situacaoConta({ status: "liberado", ate: ag - 1 }, ag));
  teste("bloqueado continua bloqueado mesmo com prazo", "bloqueado", A.situacaoConta({ status: "bloqueado", ate: ag + 864e5 }, ag));
  teste("sem prazo: zero", 0, A.prazoAte(0, ag));
  teste("30 dias vale até o fim do dia", "27/11/2026 23:59", new Date(A.prazoAte(30, ag)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", ""));
  teste("sem rede: liberado com prazo vencido não entra", false, A.liberadoSemRede({ status: "liberado", conferidoEm: ag, ate: ag - 1 }, ag));
  teste("recado novo aparece", true, A.recadoNovo({ aviso: "Oi", avisoEm: 10, avisoVisto: 5 }));
  teste("recado visto não volta", false, A.recadoNovo({ aviso: "Oi", avisoEm: 10, avisoVisto: 10 }));
  const cs = [
    { uid: "on", status: "liberado", ultimoAcesso: ag - 60000 },
    { uid: "sumido", status: "liberado", ultimoAcesso: ag - 40 * 864e5 },
    { uid: "nunca", status: "liberado" },
    { uid: "vence", status: "liberado", ultimoAcesso: ag - 864e5, ate: ag + 3 * 864e5 },
    { uid: "venceu", status: "liberado", ultimoAcesso: ag - 864e5, ate: ag - 864e5 },
  ];
  teste("online: abriu o app nos últimos 15 min", ["on"], cs.filter((c) => A.filtroConta(c, "online", ag)).map((c) => c.uid));
  teste("sumidos: 30 dias sem abrir, ou nunca abriu", ["sumido", "nunca"], cs.filter((c) => A.filtroConta(c, "sumidos", ag)).map((c) => c.uid));
  teste("prazo: vence em 7 dias ou já venceu", ["vence", "venceu"], cs.filter((c) => A.filtroConta(c, "vencendo", ag)).map((c) => c.uid));
  teste("o vencido sobe na lista, logo depois de quem espera", ["venceu"], A.ordenarContas(cs, ag).slice(0, 1).map((c) => c.uid));
  const csv = A.csvContas([{ nome: "Ana; Souza", email: "ana@x.com", status: "liberado", criadoEm: ag, acessos: 3, nota: 'diz "oi"' }], ag);
  teste("planilha: cabeçalho com ponto e vírgula", true, csv.indexOf("Nome;E-mail;Situação") >= 0);
  teste("planilha: texto com ; e aspas não quebra a coluna", true, csv.indexOf('"Ana; Souza";ana@x.com;Liberado;28/10/2026') >= 0 && csv.indexOf('"diz ""oi"""') >= 0);
}

console.log("\n--- os termos de uso ---");
{
  eval(pedaco("const AVISO_SAUDE = {", "\nconst GUIA_CONECTAR = [") + "\nglobalThis.T = TERMOS_USO; globalThis.AVISO_SAUDE = AVISO_SAUDE;");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pagina = require("fs").readFileSync(require("path").join(__dirname, "..", "termos.html"), "utf8");
  const paragrafos = [].concat.apply([], T.secoes.map((s) => s[1]));
  const faltam = paragrafos.concat(T.secoes.map((s) => s[0]), T.resumo.map((r) => r[2])).filter((p) => pagina.indexOf(esc(p)) < 0);
  teste("o termos.html tem o mesmo texto do app", [], faltam.map((p) => p.slice(0, 40)));
  const [a, m, d] = T.versao.split("-");
  teste("o termos.html diz a versão de agora", true, pagina.indexOf("Versão de " + d + "/" + m + "/" + a) >= 0);
  teste("a saúde dos termos é o aviso de saúde do app", true, AVISO_SAUDE.completo.every((p) => paragrafos.indexOf(p) >= 0));
  teste("duas caixas de aceite: termos e saúde", [true, true], [/Termos de Uso/.test(T.caixas[0]) && /18 anos/.test(T.caixas[0]), /médico/.test(T.caixas[1])]);
  teste("o cadastro só cria a conta com as duas caixas marcadas", true, /!\(marcas\[0\] && marcas\[1\]\)/.test(html));
  teste("o app não abre sem o aceite", true, html.indexOf('if (fase === "dentro" && !aceito)') >= 0);
  teste("as regras deixam a pessoa gravar o aceite", true, /'termos', 'termosEm'/.test(require("fs").readFileSync(require("path").join(__dirname, "..", "firebase", "firestore.rules"), "utf8")));
  teste("nenhum parágrafo fala em prescrever pelo app", [], paragrafos.filter((p) => /o app prescreve|prescrição do app/i.test(p)));

  // a cópia exata da versão de agora: mudou o texto, tem de subir a versão
  const arq = require("path").join(__dirname, "..", "termos-versoes", T.versao + ".txt");
  const guardado = require("fs").existsSync(arq) ? require("fs").readFileSync(arq, "utf8") : "";
  teste("o texto de agora é o guardado em termos-versoes/<versão>.txt (mudou? suba a versão)", true, guardado === JSON.stringify(T));
}

console.log("\n--- o histórico de aceites (só o dono) ---");
{
  const regras = require("fs").readFileSync(require("path").join(__dirname, "..", "firebase", "firestore.rules"), "utf8");
  const bloco = regras.slice(regras.indexOf("match /aceites/{id}"), regras.indexOf("// qualquer outra coisa"));
  teste("só o dono lê o histórico", true, /allow get, list: if dono\(\);/.test(bloco));
  teste("ninguém altera nem apaga um aceite", true, /allow update, delete: if false;/.test(bloco));
  teste("a pessoa só registra o próprio aceite, com a hora do servidor", true,
    /conta == request\.auth\.uid/.test(bloco) && /email == request\.auth\.token\.email/.test(bloco) && /servidorEm == request\.time/.test(bloco));
  teste("o app manda a hora do servidor (REQUEST_TIME)", true, /setToServerValue: "REQUEST_TIME"/.test(html));
  const l = [
    { nome: "Ana", email: "ana@x.com", conta: "u1", termos: "2026-10-29", em: Date.parse("2026-10-29T10:00:00"), servidorEm: Date.parse("2026-10-29T10:00:02"), de: "cadastro", caixas: "a | b", hash: "abc" },
    { nome: "Bia; Souza", email: "bia@x.com", conta: "u2", termos: "2026-10-29", em: Date.parse("2026-10-29T11:00:00"), de: "novos" },
  ];
  teste("o mais novo primeiro", ["bia@x.com", "ana@x.com"], A.ordenarAceites(l).map((a) => a.email));
  const csv = A.csvAceites(l);
  teste("planilha: cabeçalho com a hora do servidor e a impressão digital", true, csv.indexOf("Registrado pelo servidor em") > 0 && csv.indexOf("SHA-256") > 0);
  teste("planilha: onde aceitou em palavras, e o ; não quebra a coluna", true, csv.indexOf('"Bia; Souza";bia@x.com;u2') > 0 && csv.indexOf("No cadastro") > 0 && csv.indexOf("Na tela de aceite (termos novos)") > 0);
}

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
