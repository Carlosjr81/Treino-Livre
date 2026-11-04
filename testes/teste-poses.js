// O movimento animado: cada exercício de POSES_EXERCICIO existe no catálogo e
// tem os dois desenhos em exercicios-svg/, e nenhum desenho ficou sobrando.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const html = require("./app").lerApp();
const PASTA = path.join(__dirname, "..", "exercicios-svg");

const i = html.indexOf("const EXERCICIOS = [");
const f = html.indexOf("\n];", i);
const EXERCICIOS = vm.runInNewContext(html.slice(i + "const EXERCICIOS = ".length, f + 2));
const ip = html.indexOf("const POSES_EXERCICIO = ");
const POSES = JSON.parse(html.slice(ip + "const POSES_EXERCICIO = ".length, html.indexOf(";\n", ip)));

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const ids = new Set(EXERCICIOS.map((e) => e.id));
teste("todo exercício com animação existe no catálogo", [], Object.keys(POSES).filter((k) => !ids.has(k)));
const pares = [...new Set(Object.values(POSES).map((v) => v.replace("~", "")))];
teste("os dois desenhos de cada par existem", [], pares.filter((p) => !fs.existsSync(path.join(PASTA, p + "-a.svg")) || !fs.existsSync(path.join(PASTA, p + "-b.svg"))));
const usados = new Set(pares.flatMap((p) => [p + "-a.svg", p + "-b.svg"]));
teste("nenhum desenho sobrando na pasta", [], fs.readdirSync(PASTA).filter((n) => n.endsWith(".svg") && !usados.has(n)));
teste("os desenhos são só desenho (sem script nem link)", [], fs.readdirSync(PASTA).filter((n) => n.endsWith(".svg") && /<script|on\w+=|href=/i.test(fs.readFileSync(path.join(PASTA, n), "utf8"))));
teste("a pasta diz a licença (CC BY-SA 4.0) e a origem", true, /CC BY-SA 4\.0/.test(fs.readFileSync(path.join(PASTA, "LEIA-ME.md"), "utf8")) && /everkinetic/.test(fs.readFileSync(path.join(PASTA, "LEIA-ME.md"), "utf8")));
teste("o crédito aparece no app", true, /everkinetic\/data/.test(html) && /Everkinetic/.test(html));
teste("pelo menos 190 exercícios animados", true, Object.keys(POSES).length >= 190);
teste("o par é um número de 4 dígitos (com ~ quando é variação parecida)", [], Object.entries(POSES).filter(([, v]) => !/^~?\d{4}$/.test(v)).map(([k]) => k));
teste("a tela avisa a variação parecida", true, /Desenho de uma variação parecida/.test(html));
teste("funcional fica com o boneco próprio", [], Object.keys(POSES).filter((k) => (EXERCICIOS.find((e) => e.id === k) || {}).func));
// todo exercício do catálogo se mexe: desenho, boneco do funcional, boneco
// do app ou o do aeróbico
const pedacoObj = (nome) => { const a = html.indexOf("const " + nome + " = {"); return vm.runInNewContext("(" + html.slice(html.indexOf("{", a), html.indexOf("};", a) + 1) + ")"); };
const BONECO = pedacoObj("BONECO_EXERCICIO"), CARDIO = pedacoObj("BONECO_CARDIO");
const chavesPoses = new Set([...html.matchAll(/^  "?([a-z0-9-]+)"?: \[\n/gm)].map((m) => m[1])
  .concat([...html.matchAll(/\[\["?(band-[a-z-]+)", "|\["(band-[a-z-]+)", "[a-z-]+", "|POSES_FUNCIONAIS\["(band-[a-z-]+)"\] = /g)].map((m) => m[1] || m[2] || m[3])));
teste("todo boneco usado existe", [], Object.values(BONECO).concat(Object.values(CARDIO)).filter((k) => !chavesPoses.has(k)));
const semNada = EXERCICIOS.filter((e) => !POSES[e.id] && !BONECO[e.id] && !(e.func && chavesPoses.has(e.func)) && !(e.cardio && CARDIO[e.cardio])).map((e) => e.id);
teste("todo exercício do catálogo se mexe", [], semNada);
console.log("  sem animação: " + semNada.join(", "));
console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
