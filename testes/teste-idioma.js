// O app em inglês (idioma-en.js): o dicionário, os moldes com número e nome,
// e a regra que mais importa: texto sem tradução fica inteiro em português,
// nunca vira meia frase. A tela de verdade é conferida no navegador:
//   node testes/navegador.js --antes ingles.js   (localStorage treinolivre:idioma = "en")
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const html = require("./app").lerApp();

const i = html.indexOf("const EXERCICIOS = [");
const f = html.indexOf("\n];", i);
const EXERCICIOS = vm.runInNewContext(html.slice(i + "const EXERCICIOS = ".length, f + 2));
const janela = { EXERCICIOS: EXERCICIOS };
janela.window = janela;
janela.document = { body: null, addEventListener() {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "idioma-en.js"), "utf8"), janela);
const tr = janela.traduzirTexto;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

console.log("--- o dicionário ---");
teste("a barra de baixo", ["Home", "Exercises", "Workouts", "History"], ["Início", "Exercícios", "Fichas", "Histórico"].map(tr));
teste("o emoji e a seta em volta ficam", "▾ Choose another workout (5)", tr("▾ Escolher outra ficha (5)"));
teste("o espaço em volta fica", " Finish workout ", tr(" Finalizar treino "));
teste("o nome do exercício vem do catálogo (en)", true, tr("Cadeira extensora") !== "Cadeira extensora" && /[a-z]/i.test(tr("Cadeira extensora")));
teste("a pergunta 2 do PAR-Q", "Do you feel pain in your chest when you do physical activity?", tr("Você sente dor no peito quando faz atividade física?"));
teste("as caixas do aceite", true, /^I have read and accept/.test(tr("Li e aceito os Termos de Uso e a Política de Privacidade, e tenho 18 anos ou mais.")));

console.log("\n--- os moldes ---");
teste("contagem com plural", ["1 exercise", "8 exercises", "3 sets"], [tr("1 exercício"), tr("8 exercícios"), tr("3 séries")]);
teste("o dia da semana", "· Today is Wednesday.", tr("· Hoje é quarta."));
teste("há quanto tempo", "7 days ago", tr("há 7 dias"));
teste("a data curta", "Wed, Oct 28", tr("qua., 28 de out."));
teste("lista com vírgula, tudo traduzido", "Back, Ready, never trained", tr("Costas, Pronto, nunca treinado"));
teste("o rótulo com o exercício dentro", true, /^Complete set 2 of [A-Z]/.test(tr("Concluir a série 2 de Cadeira extensora")));
teste("exercício da pessoa fica com o nome dela", "Remove Minha remada da máquina 3 from the workout", tr("Remover Minha remada da máquina 3 do treino"));
teste("a ficha do programa de exemplo", "Wednesday - Legs & Biceps", tr("Quarta - Pernas e Bíceps"));
teste("frases: cada uma traduzida", "See your progress. Level 3, Regular. 0 of 3 workouts this week.", tr("Ver seu progresso. Nível 3, Frequentador. 0 de 3 treinos nesta semana."));

console.log("\n--- nunca meia frase ---");
teste("texto desconhecido fica inteiro", "Isto não existe no dicionário", tr("Isto não existe no dicionário"));
teste("lista com um pedaço desconhecido fica inteira", "Costas, Algo novo", tr("Costas, Algo novo"));
teste("frase com uma desconhecida fica inteira", "Funciona sem internet. Isto é novo.", tr("Funciona sem internet. Isto é novo."));
teste("o 'Abrir' só com o resto traduzido", "Abrir o cronômetro grande", tr("Abrir o cronômetro grande"));
teste("número sozinho não muda", "120", tr("120"));
teste("o que está em inglês não muda", "Finish workout", tr("Finish workout"));

console.log("\n--- o dicionário em si ---");
const fonte = fs.readFileSync(path.join(__dirname, "..", "idioma-en.js"), "utf8");
const vazias = Object.keys(janela.TEXTOS_EN).filter((k) => !String(janela.TEXTOS_EN[k]).trim());
teste("nenhuma tradução vazia", [], vazias);
teste("o app só baixa o dicionário em inglês", true, /IDIOMA === "en"\) \{[^}]*idioma-en\.js/.test(html));
teste("o sw.js guarda o dicionário (offline)", true, /"\.\/idioma-en\.js"/.test(fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8")));
teste("o texto jurídico dos termos não é traduzido", true, /TERMOS_USO\.secoes\.map\(\(s\) => \(\s*<div key=\{s\[0\]\} translate="no"/.test(html));
teste("o dicionário não tem código", false, /\b(eval|Function|import)\s*\(/.test(fonte.replace(/new Function/g, "")));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
