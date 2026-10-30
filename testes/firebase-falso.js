// Um Firebase de mentira para testar o login no navegador, sem o projeto de
// verdade. Uso: node testes/navegador.js --antes testes/firebase-falso.js ...
// Imita as quatro chamadas REST que o app faz (entrar, criar, renovar a chave,
// ler e gravar o documento) e as regras de firebase/firestore.rules: lista só
// para o dono confirmado, status só o dono muda, cadastro sempre "pendente".
// O estado mora em localStorage["fb-falso"]; o ponto de partida pode vir em
// window.__fbInicial (por um --antes anterior). O link de confirmação de
// e-mail é "clicado" na hora em que é mandado.
(function () {
  localStorage.setItem("treinolivre:firebase-teste", JSON.stringify({ apiKey: "falsa", projectId: "falso" }));
  const DONO = "carlos.jr.81@hotmail.com";
  const ler = () => JSON.parse(localStorage.getItem("fb-falso") || "null") || window.__fbInicial || { contas: {}, docs: {} };
  const gravar = (e) => localStorage.setItem("fb-falso", JSON.stringify(e));
  window.__fb = ler;
  const resp = (status, corpo) => new Response(JSON.stringify(corpo), { status: status, headers: { "Content-Type": "application/json" } });
  const erro = (status, msg) => resp(status, { error: { message: msg, status: msg } });
  const quem = (e, init) => {
    const h = (init && init.headers) || {};
    const t = String(h.Authorization || h.authorization || "").replace("Bearer ", "");
    const uid = t.indexOf("tok:") === 0 ? t.slice(4) : null;
    const conta = uid && Object.values(e.contas).find((c) => c.uid === uid);
    return conta ? { uid: uid, email: conta.email, verificado: !!conta.verificado } : null;
  };
  const sessao = (c) => ({ idToken: "tok:" + c.uid, refreshToken: "ref:" + c.uid, localId: c.uid, email: c.email, expiresIn: "3600" });
  const daDoc = (o) => {
    const fields = {};
    Object.keys(o).forEach((k) => { const v = o[k]; fields[k] = typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === "boolean" ? { booleanValue: v } : v === null ? { nullValue: null } : { stringValue: String(v) }; });
    return fields;
  };
  const deCampos = (f) => { const o = {}; Object.keys(f || {}).forEach((k) => { const x = f[k]; o[k] = "integerValue" in x ? +x.integerValue : "doubleValue" in x ? +x.doubleValue : "booleanValue" in x ? !!x.booleanValue : "stringValue" in x ? x.stringValue : null; }); return o; };
  const original = window.fetch;
  window.fetch = async function (url, init) {
    const u = String(url);
    if (!/googleapis\.com/.test(u)) return original.apply(this, arguments);
    const e = ler();
    const corpo = init && init.body && /json/.test(JSON.stringify(init.headers || {})) ? JSON.parse(init.body) : null;
    if (/accounts:signUp/.test(u)) {
      if (e.contas[corpo.email]) return erro(400, "EMAIL_EXISTS");
      if (String(corpo.password).length < 6) return erro(400, "WEAK_PASSWORD : Password should be at least 6 characters");
      const c = { uid: "u" + Object.keys(e.contas).length + Math.random().toString(36).slice(2, 6), email: corpo.email, senha: corpo.password, verificado: false };
      e.contas[corpo.email] = c; gravar(e);
      return resp(200, sessao(c));
    }
    if (/accounts:signInWithPassword/.test(u)) {
      const c = e.contas[corpo.email];
      if (!c || c.senha !== corpo.password) return erro(400, "INVALID_LOGIN_CREDENTIALS");
      return resp(200, sessao(c));
    }
    if (/accounts:sendOobCode/.test(u)) {
      if (corpo.requestType === "PASSWORD_RESET") { e.links = (e.links || []).concat([corpo.email]); gravar(e); }
      if (corpo.requestType === "VERIFY_EMAIL") {
        const uid = String(corpo.idToken).slice(4);
        const c = Object.values(e.contas).find((x) => x.uid === uid);
        if (c) { c.verificado = true; gravar(e); }
      }
      return resp(200, {});
    }
    if (/accounts:delete/.test(u)) {
      const uid = String(corpo.idToken).slice(4);
      Object.keys(e.contas).forEach((k) => { if (e.contas[k].uid === uid) delete e.contas[k]; });
      gravar(e);
      return resp(200, {});
    }
    if (/accounts:lookup/.test(u)) {
      const uid = String(corpo.idToken).slice(4);
      const c = Object.values(e.contas).find((x) => x.uid === uid);
      return c ? resp(200, { users: [{ localId: uid, email: c.email, emailVerified: !!c.verificado }] }) : erro(400, "INVALID_ID_TOKEN");
    }
    if (/securetoken/.test(u)) {
      const uid = decodeURIComponent(String(init.body).split("refresh_token=")[1] || "").slice(4);
      const c = Object.values(e.contas).find((x) => x.uid === uid);
      return c ? resp(200, { id_token: "tok:" + uid, refresh_token: "ref:" + uid, user_id: uid, expires_in: "3600" }) : erro(400, "INVALID_REFRESH_TOKEN");
    }
    if (/firestore/.test(u)) {
      const eu = quem(e, init);
      if (!eu) return erro(403, "PERMISSION_DENIED");
      const dono = eu.email === DONO && eu.verificado;
      e.aceites = e.aceites || {};
      e.pagamentos = e.pagamentos || {};
      const colecoes = { aceites: e.aceites, pagamentos: e.pagamentos, usuarios: e.docs };
      // As gravações em lote (tudo ou nada), com as regras de cada coleção:
      // aceites e pagamentos a pessoa só cria (com a hora do servidor); a conta
      // dela só nos campos de sempre; o dono, tudo.
      if (/documents:commit/.test(u)) {
        const feitos = [];
        for (const w of corpo.writes) {
          const cam = w.update.name.split("/documents/")[1];
          const col = cam.split("/")[0], id = cam.split("/")[1];
          const loja = colecoes[col];
          if (!loja) return erro(403, "PERMISSION_DENIED");
          const novo = deCampos(w.update.fields);
          const existe = !!loja[id];
          const servidor = (w.updateTransforms || []).some((t) => t.fieldPath === "servidorEm" && t.setToServerValue === "REQUEST_TIME");
          if (w.currentDocument && w.currentDocument.exists === false && existe) return erro(409, "ALREADY_EXISTS");
          if (w.currentDocument && w.currentDocument.exists === true && !existe) return erro(404, "NOT_FOUND");
          if (!dono) {
            const pode = col === "aceites" ? ["conta", "email", "nome", "termos", "em", "de", "caixas", "hash", "aparelho", "versaoApp", "navegador"]
              : col === "pagamentos" ? ["conta", "email", "nome", "plano", "planoNome", "valor", "dias", "metodo", "txid", "nota", "condicoes", "status", "em", "aparelho", "versaoApp"]
              : ["ultimoAcesso", "acessos", "aparelho", "versao", "avisoVisto", "termos", "termosEm"];
            if (Object.keys(novo).some((k) => pode.indexOf(k) < 0)) return erro(403, "PERMISSION_DENIED");
            if (col === "usuarios") { if (id !== eu.uid || !existe) return erro(403, "PERMISSION_DENIED"); }
            else if (existe || !servidor || novo.conta !== eu.uid || novo.email !== eu.email || id.indexOf(eu.uid + "_") !== 0 ||
              (col === "pagamentos" && novo.status !== "informado")) return erro(403, "PERMISSION_DENIED");
          }
          feitos.push([loja, id, Object.assign(w.updateMask || existe ? Object.assign({}, loja[id] || {}) : {}, novo, servidor ? { servidorEm: Date.now() } : {})]);
        }
        feitos.forEach((f) => { f[0][f[1]] = f[2]; });
        gravar(e);
        return resp(200, { writeResults: feitos.map(() => ({})) });
      }
      // a consulta dos próprios pagamentos (as regras só deixam pedir os seus)
      if (/documents:runQuery/.test(u)) {
        const f = corpo.structuredQuery.where.fieldFilter;
        const valor = f.value.stringValue;
        if (!dono && (f.field.fieldPath !== "conta" || valor !== eu.uid)) return erro(403, "PERMISSION_DENIED");
        return resp(200, Object.keys(e.pagamentos).filter((id) => e.pagamentos[id][f.field.fieldPath] === valor)
          .map((id) => ({ document: { name: "x/documents/pagamentos/" + id, fields: daDoc(e.pagamentos[id]) } })));
      }
      const cam = u.split("/documents/")[1].split("?")[0];
      if (cam === "aceites" || cam.indexOf("aceites/") === 0 || cam === "pagamentos" || cam.indexOf("pagamentos/") === 0) {
        const col = cam.split("/")[0];
        if (!dono) return erro(403, "PERMISSION_DENIED");
        return resp(200, { documents: Object.keys(colecoes[col]).map((id) => ({ name: "x/documents/" + col + "/" + id, fields: daDoc(colecoes[col][id]) })) });
      }
      const caminho = u.split("/documents/")[1].split("?")[0];
      const metodo = (init && init.method) || "GET";
      if (caminho === "usuarios") {
        if (!dono) return erro(403, "PERMISSION_DENIED");
        return resp(200, { documents: Object.keys(e.docs).map((uid) => ({ name: "x/documents/usuarios/" + uid, fields: daDoc(e.docs[uid]) })) });
      }
      if (caminho === "config/acesso") {
        if (metodo === "GET") return e.config ? resp(200, { name: "x/documents/config/acesso", fields: daDoc(e.config) }) : erro(404, "NOT_FOUND");
        if (!dono) return erro(403, "PERMISSION_DENIED");
        e.config = Object.assign({}, e.config || {}, deCampos(JSON.parse(init.body).fields)); gravar(e);
        return resp(200, { name: "x/documents/config/acesso", fields: daDoc(e.config) });
      }
      const uid = caminho.split("/")[1];
      if (!dono && eu.uid !== uid) return erro(403, "PERMISSION_DENIED");
      if (metodo === "DELETE") { delete e.docs[uid]; gravar(e); return resp(200, {}); }
      if (metodo === "GET") return e.docs[uid] ? resp(200, { name: "x/documents/usuarios/" + uid, fields: daDoc(e.docs[uid]) }) : erro(404, "NOT_FOUND");
      const novo = deCampos(JSON.parse(init.body).fields);
      const existe = !!e.docs[uid];
      if (/exists=false/.test(u) && existe) return erro(409, "ALREADY_EXISTS");
      if (/exists=true/.test(u) && !existe) return erro(404, "NOT_FOUND");
      if (!dono) {
        const auto = !!(e.config && e.config.auto);
        if (!existe && (!(novo.status === "pendente" || (novo.status === "liberado" && auto)) || novo.email !== eu.email)) return erro(403, "PERMISSION_DENIED");
        if (existe && Object.keys(novo).some((k) => ["ultimoAcesso", "acessos", "aparelho", "versao", "avisoVisto", "termos", "termosEm"].indexOf(k) < 0)) return erro(403, "PERMISSION_DENIED");
      }
      e.docs[uid] = Object.assign({}, e.docs[uid] || {}, novo); gravar(e);
      return resp(200, { name: "x/documents/usuarios/" + uid, fields: daDoc(e.docs[uid]) });
    }
    return erro(404, "NOT_FOUND");
  };
})();
