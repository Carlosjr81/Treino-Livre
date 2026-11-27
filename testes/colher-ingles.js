// Abre o app em inglês e junta o que continuou em português na tela.
// Uso (com o porteiro ligado, entrando como o dono):
//   node testes/navegador.js --antes testes/firebase-falso.js --antes testes/entrar-dono.js \
//     --antes testes/colher-ingles.js --clicar Balance ... --mostrar "JSON.stringify(window.__faltaIngles())"
// Cada texto que sobra é uma tradução a pôr em TEXTOS_EN (ou um molde, se tem número).
(function () {
  localStorage.setItem("treinolivre:idioma", "en");
  var visto = new Set();
  var PT = /[ãõçáéíóúâêôà]|\b(de|do|da|dos|das|para|com|não|você|seu|sua|que|em|os|as|um|uma|no|na|ao|é|ou|mais|até|dia|treino|hoje)\b/i;
  function juntar() {
    if (!document.body) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.nodeName) || (p.closest && p.closest('[translate="no"],.notranslate'))) continue;
      var t = n.nodeValue.trim();
      if (t.length > 1 && /[A-Za-zÀ-ÿ]/.test(t) && PT.test(t)) visto.add(t);
    }
    document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(function (el) {
      ["placeholder", "aria-label", "title"].forEach(function (a) { var v = el.getAttribute(a); if (v && PT.test(v)) visto.add(v); });
    });
  }
  // junta a cada meio segundo: o que apareceu entre um clique e outro também entra
  setInterval(juntar, 500);
  window.__faltaIngles = function () { juntar(); return Array.from(visto).sort(); };
})();
