// Gera o roteiro das falas do Monster, Run! a partir do próprio index.html:
// vozes/roteiro.json (o que o gerar-vozes.js lê) e vozes/roteiro.csv (para abrir
// numa planilha). Rode depois de mexer em qualquer história:
//   node vozes/exportar-roteiro.js
// O teste-zumbi.js reprova se o roteiro estiver desatualizado.
const fs = require("fs");
const path = require("path");
const html = require("../testes/app").lerApp();
const ini = html.indexOf("// ---------------- ZUMBI: MOTOR");
const fim = html.indexOf("// ---------------- FIM DO MOTOR ZUMBI");
eval(html.slice(ini, fim).replace(/\r\n/g, "\n") + "\nglobalThis.R = roteiroDeVozes();");
const AQUI = __dirname;
fs.writeFileSync(path.join(AQUI, "roteiro.json"), JSON.stringify(R, null, 1) + "\n");
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const csv = ["arquivo;voz;emocao;direcao;marca;texto;historias"].concat(R.map((l) =>
  [l.id + ".mp3", l.genero === "f" ? "feminina" : "masculina", l.emocao, q(l.direcao), l.tag, q(l.texto), q(l.missoes.join(", "))].join(";")));
fs.writeFileSync(path.join(AQUI, "roteiro.csv"), "﻿" + csv.join("\n") + "\n");
const chars = R.reduce((a, l) => a + l.texto.length, 0);
console.log(R.length + " falas, " + chars + " caracteres (" + R.filter((l) => l.genero === "f").length + " na voz feminina, " +
  R.filter((l) => l.genero === "m").length + " na masculina)");
