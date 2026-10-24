// Roda as 29 suites e devolve um resumo.
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
  ["teste-mapa", "o perfil de elevacao e a rota colorida pelo ritmo"],
  ["teste-corrida", "o corredor: recordes, VDOT, ritmos, relevo, passos e carga"],
  ["teste-metas", "metas, esforco relativo e a forma (condicionamento x fadiga)"],
  ["teste-zumbi", "a modalidade zumbi: perseguicao, plano, historia e falas"],
  ["teste-intervalado", "o intervalado: modelos, alvos, relogio dos blocos e resumo"],
  ["teste-esteira", "a esteira por bluetooth: pacote FTMS, comandos e a conversa"],
  ["teste-aparelhos", "bicicleta, eliptico, escada e remo: o pacote de cada um e a escolha na conexao"],
  ["teste-inicio", "a tela inicial: qual e o treino de hoje"],
  ["teste-fc", "o batimento em pedacos: media pelo tempo medido, ruido e pico"],
  ["teste-busca", "a busca de exercicios: musculo, apelido e aparelho, sem perder a precisao"],
  ["teste-desafio", "o desafio: mesma regua de tempo, posicoes, ultrapassagem e MQTT"],
  ["teste-ficha", "a ficha muda com o treino, e o treino livre que vira ficha"],
  ["teste-recursos", "o que este aparelho suporta, e o que se perde sem cada coisa"],
  ["teste-espelho", "o modo espelho: o sentido, os nomes dos lados e a seta"],
  ["teste-ano", "o mapa dos 12 meses: dia treinado, a regua da pessoa e a sequencia"],
  ["teste-esquecidos", "o musculo que voce parou de treinar, na regua do seu ritmo"],
  ["teste-fotos", "o antes e depois: o tempo entre as fotos e o peso de cada uma"],
  ["teste-importar", "trazer o historico do Strong, Hevy e FitNotes"],
  ["teste-saude", "a saude do Health Connect: o pacote, o resumo e o batimento nos treinos"],
  ["teste-bolso", "o Jarvis com a tela travada: anotar, descanso e a volta ao treino"],
  ["teste-grupo", "o desafio entre amigos em grupo: números, ranking e o link"],
  ["teste-corrida-app", "a corrida do desafio conduzida pelo app (tela travada) e a voz com os nomes"],
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
  // A ÚLTIMA ocorrência, não a primeira. Uma suíte que imprima um placar no
  // meio — e já houve — fazia o total sair menor sem ninguém notar: 38 de 57
  // contadas, e nada vermelho na tela para denunciar.
  const todas = saida.match(/(\d+) passou \/ (\d+) falhou/g);
  const m = todas && todas.length ? todas[todas.length - 1].match(/(\d+) passou \/ (\d+) falhou/) : null;
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
