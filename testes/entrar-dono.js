// Entra como o dono no Firebase de mentira, com os termos e o questionário
// já respondidos: o app abre direto na tela inicial, como no celular dele.
// Uso: node testes/navegador.js --antes testes/firebase-falso.js --antes testes/entrar-dono.js --dados d.json ...
(function () {
  if (!localStorage.getItem("fb-falso")) {
    localStorage.setItem("fb-falso", JSON.stringify({ contas: { "carlos.jr.81@hotmail.com": { uid: "udono", email: "carlos.jr.81@hotmail.com", senha: "123456", verificado: true } },
      docs: { udono: { email: "carlos.jr.81@hotmail.com", nome: "Carlos", status: "liberado", criadoEm: Date.now() - 864e6 } } }));
  }
  localStorage.setItem("treinolivre:conta", JSON.stringify({ uid: "udono", email: "carlos.jr.81@hotmail.com", idToken: "tok:udono", refresh: "ref:udono", expira: Date.now() + 3e6, status: "liberado", conferidoEm: Date.now(), nome: "Carlos" }));
  localStorage.setItem("treinolivre:prontidao", JSON.stringify({ v: "2026-11-02", em: Date.now(), r: [false,false,false,false,false,false,false], d: "nao" }));
})();
