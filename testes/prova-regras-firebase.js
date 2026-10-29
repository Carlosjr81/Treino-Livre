// Prova as regras (firebase/firestore.rules, versão 4) no Firebase DE VERDADE, com uma
// conta descartável que é apagada no fim. Rode depois de publicar regras novas:
//   node testes/prova-regras-firebase.js
// Deixa um registro "Teste regras" no histórico de aceites (ninguém apaga pelo app; é a regra).
const KEY = "AIzaSyAVDR8x4atODWVJdUoHIO3cm3VKovCD0Wo", P = "treino-livre";
const DOCS = "https://firestore.googleapis.com/v1/projects/" + P + "/databases/(default)/documents";
const j = async (url, op) => { const r = await fetch(url, op); let b = null; try { b = await r.json(); } catch (e) {} return { s: r.status, b }; };
const auth = (fn, corpo) => j("https://identitytoolkit.googleapis.com/v1/accounts:" + fn + "?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
const campos = (o) => { const f = {}; for (const k in o) f[k] = typeof o[k] === "number" ? { integerValue: String(o[k]) } : { stringValue: o[k] }; return f; };
(async () => {
  const email = "teste-regras-" + Date.now() + "@exemplo-treinolivre.com";
  const c = await auth("signUp", { email, password: "Teste12345!", returnSecureToken: true });
  if (c.s !== 200) { console.log("criar conta falhou", c.s, JSON.stringify(c.b)); return; }
  const tok = c.b.idToken, uid = c.b.localId, H = { Authorization: "Bearer " + tok, "Content-Type": "application/json" };
  const res = [];
  const prova = (nome, esperado, s) => res.push((esperado === (s === 200) ? "OK  " : "FALHOU ") + nome + " (HTTP " + s + ")");
  try {
    const em = Date.now(), id = uid + "_" + em;
    const reg = { conta: uid, email, nome: "Teste regras", termos: "2026-10-29", em, de: "tela", caixas: "a | b", hash: "x", aparelho: "teste", versaoApp: "teste", navegador: "teste" };
    const commit = (nomeDoc, dados, transf) => j(DOCS + ":commit", { method: "POST", headers: H, body: JSON.stringify({ writes: [Object.assign({
      update: { name: "projects/" + P + "/databases/(default)/documents/aceites/" + nomeDoc, fields: campos(dados) }, currentDocument: { exists: false } },
      transf === false ? {} : { updateTransforms: [{ fieldPath: "servidorEm", setToServerValue: "REQUEST_TIME" }] })] }) });
    prova("a pessoa registra o próprio aceite com a hora do servidor", true, (await commit(id, reg)).s);
    prova("sem a hora do servidor é recusado", false, (await commit(uid + "_" + (em + 1), Object.assign({}, reg, { em: em + 1 }), false)).s);
    prova("aceite em nome de outra conta é recusado", false, (await commit("outro_" + em, Object.assign({}, reg, { conta: "outro" }))).s);
    prova("a pessoa NÃO lê o próprio aceite", false, (await j(DOCS + "/aceites/" + id, { headers: H })).s);
    prova("a pessoa NÃO lista o histórico", false, (await j(DOCS + "/aceites", { headers: H })).s);
    prova("a pessoa NÃO altera o aceite", false, (await j(DOCS + "/aceites/" + id + "?updateMask.fieldPaths=nome", { method: "PATCH", headers: H, body: JSON.stringify({ fields: campos({ nome: "mudado" }) }) })).s);
    prova("a pessoa NÃO apaga o aceite", false, (await j(DOCS + "/aceites/" + id, { method: "DELETE", headers: H })).s);
    // a conta (usuarios/) com o aceite: v3
    prova("cadastro pendente continua funcionando", true, (await j(DOCS + "/usuarios/" + uid + "?currentDocument.exists=false", { method: "PATCH", headers: H, body: JSON.stringify({ fields: campos({ email, nome: "Teste regras", status: "pendente", criadoEm: em, ultimoAcesso: em, acessos: 1, aparelho: "teste", versao: "teste" }) }) })).s);
    prova("a conta grava termos e termosEm", true, (await j(DOCS + "/usuarios/" + uid + "?updateMask.fieldPaths=termos&updateMask.fieldPaths=termosEm", { method: "PATCH", headers: H, body: JSON.stringify({ fields: campos({ termos: "2026-10-29", termosEm: em }) }) })).s);
    prova("a pessoa NÃO se libera sozinha", false, (await j(DOCS + "/usuarios/" + uid + "?updateMask.fieldPaths=status", { method: "PATCH", headers: H, body: JSON.stringify({ fields: campos({ status: "liberado" }) }) })).s);
  } finally {
    await j(DOCS + "/usuarios/" + uid, { method: "DELETE", headers: H });
    const d = await auth("delete", { idToken: tok });
    res.push("conta descartável apagada: " + (d.s === 200 ? "sim" : "NÃO (" + d.s + ")"));
    console.log(res.join("\n"));
  }
})();
