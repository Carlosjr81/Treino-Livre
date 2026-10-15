// Roda as treze suites e devolve um resumo.
//
//   node rodar.js
//
// Vale rodar antes e depois de qualquer mexida no app. Os testes nao abrem
// navegador: eles recortam as funcoes do proprio index.html e exercitam com
// corpo sintetico e frases escritas. Nao substituem o roteiro manual do
// CLAUDE.md — provam que a logica nao quebrou, nao que a tela funciona.
const { execFileSync } = require("child_process");
const path = require("path");
const { caminhoDoApp } = require("./app");

const SUITES = [
  ["teste-parser", "o interpretador de voz do Jarvis"],
  ["teste-contador", "a contagem de repeticoes pela camera"],
  ["teste-tecnico", "os comentarios do tecnico, e o silencio dele"],
  ["teste-funcional", "os movimentos funcionais e o modo alternado"],
  ["teste-postura", "a correcao de postura (e o que ela NAO pode falar)"],
  ["teste-enquadramento", "pôr a pessoa no quadro, e o sentido esquerda/direita"],
  ["teste-evolucao", "a leitura do historico por exercicio"],
  ["teste-cardio", "o aerobico: distancia, ritmo, gasto e a meta da semana"],
  ["teste-alvo", "onde cai a proxima frase do Jarvis, e o bi-set"],
  ["teste-rota", "o percurso na rua: GPS, distancia, parciais e o filtro"],
  ["teste-corrida", "o corredor: recordes, VDOT, ritmos, relevo, passos e carga"],
  ["teste-zumbi", "a modalidade zumbi: perseguicao, plano, historia e falas"],
  ["teste-intervalado", "o intervalado: modelos, alvos, relogio dos blocos e resumo"],
];

console.log("app: " + caminhoDoApp() + "\n");

let totalOk = 0, totalMal = 0, quebrados = 0;
for (const [nome, oque] of SUITES) {
  let saida = "", erro = false;
  try {
    saida = execFileSync(process.execPath, [path.join(__dirname, nome + ".js")], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    saida = (e.stdout || "") + (e.stderr || "");
    erro = true;
  }
  const m = saida.match(/(\d+) passou \/ (\d+) falhou/);
  if (!m) {
    quebrados++;
    console.log("  !!  " + nome.padEnd(22) + "nao rodou");
    console.log(saida.split("\n").slice(-6).map((l) => "        " + l).join("\n"));
    continue;
  }
  const ok = +m[1], mal = +m[2];
  totalOk += ok; totalMal += mal;
  console.log(
    (mal ? "  X   " : "  ok  ") + nome.padEnd(22) +
    String(ok + "/" + (ok + mal)).padEnd(8) + oque
  );
  if (mal) console.log(saida.split("\n").filter((l) => /^\s+X/.test(l)).map((l) => "      " + l.trim()).join("\n"));
  void erro;
}

console.log("\n" + totalOk + " passou / " + totalMal + " falhou" +
  (quebrados ? "  (" + quebrados + " suite(s) nem rodaram)" : ""));
process.exit(totalMal || quebrados ? 1 : 0);
