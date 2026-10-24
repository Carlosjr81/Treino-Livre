// Testa o interpretador do Jarvis fora do navegador.
const fs = require("fs");

const semAcento = (s) => String(s || "").toLowerCase()
  .replace(/[áàâã]/g, "a").replace(/[éê]/g, "e").replace(/í/g, "i")
  .replace(/[óôõ]/g, "o").replace(/ú/g, "u").replace(/ç/g, "c");

// Lista real de exercícios do app
const html = require("./app").lerApp();
const ini = html.indexOf("const EXERCICIOS = [");
const fim = html.indexOf("\n];", ini);
const EXERCICIOS = eval(html.slice(ini + "const EXERCICIOS = ".length, fim + 2));

// O cerebro vem direto do index.html, nao de uma copia: uma copia so prova
// que a versao de ontem funcionava.
const iniJ = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
// O recorte acaba na ultima lista de dados do Jarvis. Dali para a frente vem
// componente React com JSX, que o Node nao compila — e que nao e o que este
// teste exercita.
const marcaFim = html.indexOf('{ d: "Jarvis, finaliza o treino"');
const fimJ = marcaFim < 0 ? -1 : html.indexOf("];", marcaFim) + 2;
if (iniJ < 0 || fimJ < 0) { console.error("nao achei o bloco do Jarvis no index.html"); process.exit(1); }
let src = html.slice(iniJ, fimJ).replace(/\r\n/g, "\n");
// Tira o que só existe no navegador
src = src.replace(/const ReconhecedorVoz[\s\S]*?const VOZ_FALA = [^\n]*\n/, "const VOZ_OUVE=false, VOZ_FALA=false;\n");
src = src.replace(/if \(VOZ_FALA\) \{[\s\S]*?\n\}\n/, "");
eval(src + "\nglobalThis.API = { normalizarFala, depoisDeJarvis, interpretarVoz, acharExercicio, numerosPorExtenso, pareceJarvis };");
const A = globalThis.API;

let ok = 0, falhou = 0;
function t(frase, esperado, ctx) {
  const norm = A.normalizarFala(frase);
  const depois = A.depoisDeJarvis(norm);
  const corpo = depois === null ? norm : depois;
  const c = A.interpretarVoz(corpo, ctx || {}) || {};
  const erros = [];
  Object.keys(esperado).forEach((k) => {
    if (k === "ex") {
      const ex = A.acharExercicio(c.frase || corpo, EXERCICIOS, (ctx && ctx.cand) || []);
      const id = ex ? ex.id : null;
      if (id !== esperado.ex) erros.push("ex=" + id + " (esperava " + esperado.ex + ")");
      return;
    }
    if (k === "jarvis") {
      if ((depois !== null) !== esperado.jarvis) erros.push("ativacao=" + (depois !== null));
      return;
    }
    if (String(c[k]) !== String(esperado[k])) erros.push(k + "=" + c[k] + " (esperava " + esperado[k] + ")");
  });
  if (erros.length) { falhou++; console.log("  X  \"" + frase + "\"\n       norm: " + norm + "\n       " + erros.join(" | ")); }
  else ok++;
}

console.log("--- ativacao ---");
t("Jarvis, anote 80 por 10", { jarvis: true, tipo: "anotar", peso: 80, reps: 10 });
t("jarves anota 80 por 10", { jarvis: true, tipo: "anotar", peso: 80, reps: 10 });
t("Charles, descanso de 2 minutos", { jarvis: true, tipo: "descanso", segundos: 120 });
t("anote 80 por 10", { jarvis: false, tipo: "anotar" });

console.log("--- descanso ---");
t("Jarvis, descanso de 2 minutos", { tipo: "descanso", segundos: 120 });
t("Jarvis, descanso de 90 segundos", { tipo: "descanso", segundos: 90 });
t("Jarvis, descanso de um minuto e meio", { tipo: "descanso", segundos: 90 });
t("Jarvis, descansa 45 segundos", { tipo: "descanso", segundos: 45 });
t("Jarvis, descanso de 3", { tipo: "descanso", segundos: 180 });
t("Jarvis, descanso", { tipo: "descanso", segundos: "null" });
t("Jarvis, pula o descanso", { tipo: "pularDescanso" });
t("Jarvis, cancela o descanso", { tipo: "pularDescanso" });
t("Jarvis, mais 30 segundos", { tipo: "esticarDescanso", segundos: 30 }, { descansando: true });
t("Jarvis, cronometro de 2 minutos", { tipo: "descanso", segundos: 120 });

console.log("--- anotar ---");
t("Jarvis, anote supino reto com 40 kilos de cada lado fiz 10 repeticoes", { tipo: "anotar", peso: 40, reps: 10, porLado: true, ex: "supino-reto" });
t("Jarvis, anota 80 quilos 12 repeticoes", { tipo: "anotar", peso: 80, reps: 12, porLado: false });
t("Jarvis, 100 por 8", { tipo: "anotar", peso: 100, reps: 8 });
t("Jarvis, fiz 12 repeticoes com 30 quilos", { tipo: "anotar", peso: 30, reps: 12 });
t("Jarvis, anota quarenta e cinco por dez", { tipo: "anotar", peso: 45, reps: 10 });
t("Jarvis, anota 42.5 por 8", { tipo: "anotar", peso: 42.5, reps: 8 });
t("Jarvis, anota 42,5 quilos 8 repeticoes", { tipo: "anotar", peso: 42.5, reps: 8 });
t("Jarvis, marca a serie", { tipo: "anotar", peso: "null", reps: "null" });
t("Jarvis, anota 20 por 15 de aquecimento", { tipo: "anotar", peso: 20, reps: 15, aquecimento: true });
t("Jarvis, prancha de 40 segundos", { tipo: "anotar", segundos: 40, ex: "prancha" });
t("Jarvis, anote 60 segundos", { tipo: "anotar", segundos: 60 });
t("Jarvis, levantei cento e dez por cinco", { tipo: "anotar", peso: 110, reps: 5 });
t("Jarvis, anota rosca direta 20 por 12", { tipo: "anotar", peso: 20, reps: 12, ex: "rosca-direta" });
t("Jarvis, leg press 200 por 15", { tipo: "anotar", peso: 200, reps: 15, ex: "leg-press" });

console.log("--- de cada lado sem kg ---");
t("Jarvis, anota 45 de cada lado, 8 repeticoes", { tipo: "anotar", peso: 45, reps: 8, porLado: true });
t("Jarvis, 20 de cada lado 12 repeticoes", { tipo: "anotar", peso: 20, reps: 12, porLado: true });
t("Jarvis, anota 3 series de 12", { tipo: "anotar", peso: "null", reps: "null" });
t("Jarvis, marca a serie de 12", { tipo: "anotar", reps: "null" });

console.log("--- navegacao e sessao ---");
t("Jarvis, proximo exercicio", { tipo: "proximo" });
t("Jarvis, proximo", { tipo: "proximo" });
t("Jarvis, exercicio anterior", { tipo: "anterior" });
t("Jarvis, finaliza o treino", { tipo: "finalizar" });
t("Jarvis, acabei", { tipo: "finalizar" });
t("Jarvis, comeca o treino A", { tipo: "iniciarTreino" });
t("Jarvis, mais uma serie", { tipo: "maisSerie" });
t("Jarvis, errei apaga a ultima", { tipo: "desfazer" });
t("Jarvis, adiciona leg press", { tipo: "adicionar", ex: "leg-press" });
t("Jarvis, o aparelho esta ocupado", { tipo: "trocar" });
t("Jarvis, troca o exercicio", { tipo: "trocar" });

console.log("--- consultas ---");
t("Jarvis, qual meu recorde no supino", { tipo: "recorde", ex: "supino-reto" });
t("Jarvis, quanto eu fiz da ultima vez", { tipo: "ultimaVez" });
t("Jarvis, quantas series faltam", { tipo: "situacao" });
t("Jarvis, quanto tempo de treino", { tipo: "tempo" });
t("Jarvis, ajuda", { tipo: "ajuda" });
t("Jarvis, para de ouvir", { tipo: "desligar" });

console.log("--- perguntas e ajuda ---");
t("Jarvis, quais sao os principais comandos?", { tipo: "ajuda", assunto: "null" });
t("Jarvis, o que voce faz?", { tipo: "ajuda" });
t("Jarvis, como funciona o descanso?", { tipo: "ajuda", assunto: "descanso" });
t("Jarvis, como eu anoto uma serie?", { tipo: "ajuda", assunto: "anotar" });
t("Jarvis, modo treino", { tipo: "escola" });
t("Jarvis, quero praticar os comandos", { tipo: "escola" });
t("Jarvis, quero treinar peito hoje", { tipo: "sugestaoHoje" });
t("Jarvis, qual meu recorde no supino", { tipo: "recorde", ex: "supino-reto" });
t("Jarvis, qual a sugestao de treino para hoje?", { tipo: "sugestaoHoje" });
t("Jarvis, o que eu treino hoje?", { tipo: "sugestaoHoje" });
t("Jarvis, quantas series de peito eu fiz essa semana?", { tipo: "seriesGrupo", grupo: "peito" });
t("Jarvis, ha quanto tempo eu nao treino costas?", { tipo: "recuperacaoGrupo", grupo: "costas" });
t("Jarvis, ja posso treinar perna?", { tipo: "recuperacaoGrupo", grupo: "pernas" });
t("Jarvis, quando foi meu ultimo treino?", { tipo: "ultimoTreino" });
t("Jarvis, qual meu nivel?", { tipo: "progresso" });
t("Jarvis, como estou no desafio?", { tipo: "grupoDesafio" });
t("Jarvis, quem esta ganhando o desafio dos amigos?", { tipo: "grupoDesafio" });
t("Jarvis, como esta o ranking?", { tipo: "grupoDesafio" });
t("Jarvis, quantos treinos eu fiz?", { tipo: "progresso" });
t("Jarvis, como esta minha meta?", { tipo: "progresso" });
t("Jarvis, quanto eu peso?", { tipo: "medida" });
t("Jarvis, minha cintura", { tipo: "medida" });

console.log("--- as antigas continuam ---");
t("Jarvis, quantas series faltam", { tipo: "situacao" });
t("Jarvis, quanto tempo de treino", { tipo: "tempo" });
t("Jarvis, comeca o treino de quarta", { tipo: "iniciarTreino" });
t("Jarvis, anote 80 por 10", { tipo: "anotar", peso: 80, reps: 10 });
t("Jarvis, descanso de 2 minutos", { tipo: "descanso", segundos: 120 });

console.log("--- nao e comando (nao pode virar anotacao) ---");
["bom dia pessoal", "voce viu o jogo ontem", "ta pesado hoje hein", "vamos almocar depois"].forEach((frase) => {
  const n = A.normalizarFala(frase);
  const c = A.interpretarVoz(n, {});
  if (c) { falhou++; console.log("  X  \"" + frase + "\" virou " + c.tipo); } else ok++;
});

console.log("--- exercicios por apelido ---");
[["agacho", "agachamento"], ["supino", "supino-reto"], ["extensora", "cadeira-extensora"],
 ["puxada frente", "puxada-frente"], ["triceps corda", "triceps-corda"], ["elevacao lateral", "elevacao-lateral"],
 ["rosca martelo", "rosca-martelo"], ["mesa flexora", "mesa-flexora"], ["remada baixa", "remada-baixa"],
 ["desenvolvimento com halteres", "desenvolvimento"], ["levantamento terra", "levantamento-terra"],
 ["cadeira adutora", "cadeira-adutora"], ["panturrilha", "panturrilha"], ["crucifixo", "crucifixo"]].forEach((p) => {
  const ex = A.acharExercicio(A.normalizarFala(p[0]), EXERCICIOS, []);
  const id = ex ? ex.id : null;
  if (id !== p[1]) { falhou++; console.log("  X  \"" + p[0] + "\" -> " + id + " (esperava " + p[1] + ")"); } else ok++;
});

console.log("--- o reconhecedor estraga a palavra que diferencia ---");
// Treino real: "cadeira extensora" chegou mal ouvida, so "cadeira" casou, e a
// serie foi parar na cadeira abdutora. Na ficha estavam as duas.
const fichaCadeiras = { cand: ["cadeira-extensora", "abducao", "cadeira-adutora", "leg-press"] };
t("Jarvis, cadeira estensora 40 por 12", { tipo: "anotar", ex: "cadeira-extensora" }, fichaCadeiras);
t("Jarvis, cadeira extensão 40 por 12", { tipo: "anotar", ex: "cadeira-extensora" }, fichaCadeiras);
t("Jarvis, cadeira extensor 40 por 12", { tipo: "anotar", ex: "cadeira-extensora" }, fichaCadeiras);
t("Jarvis, cadeira x tensora 40 por 12", { tipo: "anotar", ex: "cadeira-extensora" }, fichaCadeiras);
// So "cadeira" nao diz qual: fica com o exercicio da vez, nao chuta outro
t("Jarvis, cadeira 40 por 12", { tipo: "anotar", ex: null }, fichaCadeiras);
// A palavra exata ganha da parecida: adutora e abdutora estao a uma letra
t("Jarvis, cadeira adutora 40 por 12", { tipo: "anotar", ex: "cadeira-adutora" }, fichaCadeiras);
t("Jarvis, cadeira abdutora 40 por 12", { tipo: "anotar", ex: "abducao" }, fichaCadeiras);
t("Jarvis, abdutora 40 por 12", { tipo: "anotar", ex: "abducao" });
t("Jarvis, adutora 40 por 12", { tipo: "anotar", ex: "cadeira-adutora" });

console.log("--- diagnostico de 14/10: acabei a serie nao e acabei o treino ---");
t("Jarvis você tá errando o exercício tô fazendo o cabelo extensora Acabei de fazer a quarta série com 108 kg 12 repetições anota aí",
  { jarvis: true, tipo: "anotar", peso: 108, reps: 12, ex: "cadeira-extensora" });
t("Jarvis, acabei a série", { tipo: "undefined" });
t("Jarvis, terminei 80 por 10", { tipo: "anotar", peso: 80, reps: 10 });
t("Jarvis, acabei o treino", { tipo: "finalizar" });
t("Jarvis, encerra o treino", { tipo: "finalizar" });
// O nome chegou como Jorge e jogos
t("Jorge anota 80 por 10", { jarvis: true, tipo: "anotar", peso: 80, reps: 10 });
t("jogos anota aí fiz a série 3 de cadeira extensora 99 kg 12 repetições", { jarvis: true, tipo: "anotar", peso: 99, reps: 12, ex: "cadeira-extensora" });

console.log("--- esteira ---");
t("Jarvis, corri 20 minutos a 9 km/h", { tipo: "anotar", cardio: true, segundos: 1200, vel: 9 });
t("Jarvis, 30 minutos a seis e meio por hora inclinação cinco", { tipo: "anotar", cardio: true, segundos: 1800, vel: 6.5, incl: 5 });
t("Jarvis, esteira 30 minutos velocidade 6 inclinação 10", { tipo: "anotar", cardio: true, segundos: 1800, vel: 6, incl: 10 });
t("Jarvis, andei 3 quilômetros em 30 minutos", { tipo: "anotar", cardio: true, segundos: 1800, vel: 6 });
t("Jarvis, caminhada de meia hora a 5,5 quilômetros por hora", { tipo: "anotar", cardio: true, segundos: 1800, vel: 5.5, ex: "esteira-caminhada" });
t("Jarvis, corrida na esteira 1 hora a 10 por hora", { tipo: "anotar", cardio: true, segundos: 3600, vel: 10, ex: "esteira-corrida" });
t("Jarvis, velocidade 8", { tipo: "anotar", cardio: true, vel: 8 });
t("Jarvis, vai para a esteira", { tipo: "irExercicio", ex: "esteira-caminhada" });
// "acabei a corrida de 20 minutos" e uma serie, nao o fim do treino
t("Jarvis, acabei a corrida de 20 minutos", { tipo: "anotar", cardio: true, segundos: 1200 });
// e a esteira nao pode roubar o que ja funcionava
t("Jarvis, descanso de 2 minutos", { tipo: "descanso", segundos: 120 });
t("Jarvis, anota 80 por 10", { tipo: "anotar", peso: 80, reps: 10, cardio: "undefined" });
t("Jarvis, 45 segundos", { tipo: "anotar", segundos: 45, cardio: "undefined" });
console.log("--- outros aparelhos ---");
t("Jarvis, pedalei 30 minutos a 120 watts nível 8", { tipo: "anotar", cardio: true, segundos: 1800, watts: 120, nivel: 8 });
t("Jarvis, nadei mil metros em 25 minutos", { tipo: "anotar", cardio: true, segundos: 1500, m: 1000 });
t("Jarvis, nadei 1.500 metros em 30 minutos", { tipo: "anotar", cardio: true, m: 1500 });
t("Jarvis, elíptico 30 minutos nível oito", { tipo: "anotar", cardio: true, segundos: 1800, nivel: 8, ex: "eliptico" });
t("Jarvis, remo 20 minutos 150 watts 24 remadas por minuto", { tipo: "anotar", cardio: true, watts: 150, cad: 24, ex: "remo-ergometro" });
t("Jarvis, escada 15 minutos 60 degraus por minuto", { tipo: "anotar", cardio: true, segundos: 900, cad: 60, ex: "escada" });
t("Jarvis, corri 5 km na rua em 25 minutos", { tipo: "anotar", cardio: true, km: 5, vel: 12 });
t("Jarvis, bicicleta 40 minutos", { tipo: "anotar", cardio: true, segundos: 2400, ex: "bike-vertical" });
t("Jarvis, vai para o elíptico", { tipo: "irExercicio", ex: "eliptico" });
// o triceps corda nao pode virar pular corda
t("Jarvis, triceps corda 30 por 12", { tipo: "anotar", peso: 30, reps: 12, ex: "triceps-corda" });

console.log("--- a camera e os oculos ---");
t("Jarvis, óculos", { tipo: "oculos" });
t("Jarvis, liga a câmera dos óculos", { tipo: "oculos" });
t("Jarvis, conta pelos óculos", { tipo: "oculos" });
t("Jarvis, câmera", { tipo: "scanner" });
t("Jarvis, conta pra mim", { tipo: "scanner" });

console.log("\n" + ok + " passou / " + falhou + " falhou");
process.exit(falhou ? 1 : 0);
