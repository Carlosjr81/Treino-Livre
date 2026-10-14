// Acha o index.html do app, em qualquer computador.
//
// Antes cada teste trazia o caminho escrito à mão ("G:/Meu Drive/..."). Isso
// amarrava a suíte a uma máquina: letra de unidade, nome de usuário e idioma
// da pasta mudam de um computador para outro, e o teste morria na primeira
// linha sem dizer por quê.
//
// Aqui o caminho sai da posição deste arquivo. Esta pasta vive dentro do
// repositório, então a relação com o `index.html` é a única coisa que não muda:
// seja num clone do GitHub, seja na cópia do Google Drive.
const fs = require("fs");
const path = require("path");

// Se um dia as pastas forem separadas, esta variável resolve sem editar
// teste nenhum:  TREINO_HTML="D:/outro/lugar/index.html" node rodar.js
const CANDIDATOS = [
  process.env.TREINO_HTML,
  path.join(__dirname, "..", "index.html"),          // testes/ dentro do repositório
  path.join(__dirname, "..", "Treino-Livre", "index.html"), // pasta irmã (arranjo antigo)
  path.join(__dirname, "index.html"),
].filter(Boolean);

function caminhoDoApp() {
  for (const c of CANDIDATOS) if (fs.existsSync(c)) return c;
  console.error(
    "Não achei o index.html do app. Procurei em:\n  " +
      CANDIDATOS.join("\n  ") +
      "\n\nSe a pasta do app estiver em outro lugar, rode assim:\n" +
      '  TREINO_HTML="/caminho/para/index.html" node ' +
      path.basename(process.argv[1] || "rodar.js")
  );
  process.exit(1);
}

function lerApp() {
  return fs.readFileSync(caminhoDoApp(), "utf8");
}

module.exports = { caminhoDoApp, lerApp };
