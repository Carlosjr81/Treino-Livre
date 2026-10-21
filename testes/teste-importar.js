// Trazer o histórico de outro app (Strong, Hevy, FitNotes).
//
// Esta é a suíte mais importante das três do openGym, porque o que ela cobre
// é um caminho sem volta: o arquivo entra no histórico de alguém, e um peso
// lido errado vira um recorde que nunca aconteceu — e daí em diante a
// sugestão de carga, a evolução e o nível saem todos errados a partir dele.
//
// O que ela cobra, em ordem:
//   1. Que a UNIDADE não seja adivinhada. 225 libras são 102 kg; lidas como
//      quilos viram um supino de 225 kg que ninguém fez.
//   2. Que a data não ande um dia. `new Date("2026-03-14")` é meia-noite em
//      UTC, que no Brasil é dia 13 às 21h.
//   3. Que o CSV seja lido como CSV: nome de exercício com vírgula dentro de
//      aspas desloca TODAS as colunas da linha num `split(",")`.
//   4. Que reimportar o mesmo arquivo não duplique nada.
//   5. Que os três formatos e suas variantes sejam reconhecidos pelo NOME da
//      coluna, porque a posição muda entre versões e plataformas.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("const semAcento = (s) =>", "const PALAVRAS_VAZIAS_BUSCA") +
  pedaco("function plural(n, singular, pluralTxt)", "function linhasStoryTreino") +
  pedaco("// ---- Trazer o histórico de outro app ----", "// ---------------- FIM DAS CONTAS DA IMPORTAÇÃO") +
  "\nglobalThis.I = { interpretarCsvTreinos, lerCsv, separadorCsv, numeroCsv, dataDoCsv, duracaoDoCsv, idDeImportacao, acharExercicioImportado, grupoPalpiteImport, LB_EM_KG, semAcento };"
);
const I = globalThis.I;
const semAcento = I.semAcento;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(52) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(52) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

// um catálogo de mentira: o que não estiver aqui é "não reconhecido"
const CAT = { "bench press": "supino", "squat": "agacho", "plank": "prancha",
  "barbell row": "remada", "deadlift": "terra", "rosca, direta": "rosca" };
const acharId = (n) => CAT[String(n).toLowerCase().trim()] || null;

const CSV_STRONG = [
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE",
  "2026-03-14 18:51:52,Push Day,1h 2min,Bench Press,1,60,10,0,0,,,",
  "2026-03-14 18:51:52,Push Day,1h 2min,Bench Press,2,65,8,0,0,,,",
  "2026-03-14 18:51:52,Push Day,1h 2min,Plank,1,0,0,0,60,,,",
  "2026-03-16 19:00:00,Pull Day,45m,Deadlift,1,100,5,0,0,,,",
].join("\n");

const CSV_HEVY = [
  "title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe",
  "Manha,2026-03-14 06:00:00,2026-03-14 07:00:00,,Squat,,,1,warmup,40,10,,,",
  "Manha,2026-03-14 06:00:00,2026-03-14 07:00:00,,Squat,,,2,normal,80,5,,,",
].join("\n");

const CSV_FITNOTES = [
  "Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time",
  "2026-03-14,Barbell Row,Back,70,kg,8,,,",
  "2026-03-14,Barbell Row,Back,75,kg,6,,,",
].join("\n");

console.log("--- 1. a unidade, que e o que nao pode errar ---");
{
  // FitNotes do iPhone traz as DUAS colunas de peso, e vale a preenchida.
  const iphone = [
    "Date,Exercise,Category,Weight (kg),Weight (lbs),Reps,Distance,Distance Unit,Time,Notes,Kind",
    "2026-03-14,Bench Press,Chest,,225,5,,,,,",
  ].join("\n");
  const r = I.interpretarCsvTreinos(iphone, acharId, {});
  teste("225 libras viram 102,1 kg", 102.1, r.treinos[0].itens[0].series[0].peso);

  // Strong antigo: separador `;` e coluna de unidade
  const velho = [
    "Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps",
    "2026-03-14 18:00:00;A;Bench Press;1;135;lbs;5",
  ].join("\n");
  const v = I.interpretarCsvTreinos(velho, acharId, {});
  teste("separador ponto-e-virgula e lido", 1, v.treinos.length);
  teste("135 lbs viram 61,2 kg", 61.2, v.treinos[0].itens[0].series[0].peso);

  // Strong moderno NÃO diz a unidade: tem de avisar, e obedecer a escolha
  const emKg = I.interpretarCsvTreinos(CSV_STRONG, acharId, {});
  teste("sem coluna de unidade, avisa", true, emKg.temPesoSemUnidade);
  teste("e le como kg por padrao", 60, emKg.treinos[0].itens[0].series[0].peso);
  const emLb = I.interpretarCsvTreinos(CSV_STRONG, acharId, { unidade: "lb" });
  teste("escolhendo libras, converte", 27.2, emLb.treinos[0].itens[0].series[0].peso);

  // Hevy diz a unidade no nome da coluna: a escolha da tela NÃO manda nele
  const hevyLb = I.interpretarCsvTreinos(CSV_HEVY, acharId, { unidade: "lb" });
  teste("weight_kg vence a escolha da tela", 40, hevyLb.treinos[0].itens[0].series[0].peso);
}

console.log("");
console.log("--- 2. a data nao pode andar um dia ---");
{
  const r = I.interpretarCsvTreinos(CSV_FITNOTES, acharId, {});
  const d = new Date(r.treinos[0].data);
  teste("14 de marco continua dia 14", 14, d.getDate());
  teste("e marco continua marco", 3, d.getMonth() + 1);
  teste("e 2026", 2026, d.getFullYear());

  teste("dd/mm/aaaa e lido como dia primeiro", 5,
    new Date(I.dataDoCsv("05/03/2026")).getDate());
  teste("e o mes e marco, nao maio", 3,
    new Date(I.dataDoCsv("05/03/2026")).getMonth() + 1);
  teste("data vazia nao vira 1970", null, I.dataDoCsv(""));
  teste("texto que nao e data", null, I.dataDoCsv("sem data"));
}

console.log("");
console.log("--- 3. CSV e CSV: virgula dentro de aspas ---");
{
  const comVirgula = [
    "Date,Exercise Name,Set Order,Weight,Reps",
    '2026-03-14 10:00:00,"Rosca, direta",1,20,12',
  ].join("\n");
  const r = I.interpretarCsvTreinos(comVirgula, acharId, {});
  const it = r.treinos[0].itens[0];
  teste("o nome com virgula fica inteiro", "Rosca, direta", it.nomeOriginal);
  teste("e as colunas nao deslocam: 20 kg", 20, it.series[0].peso);
  teste("e 12 reps", 12, it.series[0].reps);
  teste("e o exercicio foi reconhecido", "rosca", it.exercicioId);

  // aspas dobradas dentro do campo
  const l = I.lerCsv('a,"diz ""oi""",c', ",");
  teste("aspas dobradas viram uma", ["a", 'diz "oi"', "c"], l[0]);
}

console.log("");
console.log("--- 4. reimportar nao duplica ---");
{
  const a = I.interpretarCsvTreinos(CSV_STRONG, acharId, {});
  const b = I.interpretarCsvTreinos(CSV_STRONG, acharId, {});
  teste("os ids sao os mesmos nas duas leituras",
    a.treinos.map((t) => t.id), b.treinos.map((t) => t.id));
  teste("e comecam com imp-", true, a.treinos.every((t) => t.id.indexOf("imp-") === 0));
  // treinos diferentes não podem colidir
  teste("dois treinos, dois ids", 2, new Set(a.treinos.map((t) => t.id)).size);
}

console.log("");
console.log("--- 5. os tres formatos, pelo nome da coluna ---");
{
  teste("Strong", "Strong", I.interpretarCsvTreinos(CSV_STRONG, acharId, {}).formato);
  teste("Hevy", "Hevy", I.interpretarCsvTreinos(CSV_HEVY, acharId, {}).formato);
  teste("FitNotes", "FitNotes", I.interpretarCsvTreinos(CSV_FITNOTES, acharId, {}).formato);
  // colunas fora de ordem continuam sendo achadas: é o ponto de mapear por nome
  const trocado = [
    "Reps,Exercise Name,Weight,Date,Set Order",
    "10,Bench Press,60,2026-03-14 18:00:00,1",
  ].join("\n");
  const r = I.interpretarCsvTreinos(trocado, acharId, {});
  teste("colunas em outra ordem funcionam", 60, r.treinos[0].itens[0].series[0].peso);
  teste("e as reps tambem", 10, r.treinos[0].itens[0].series[0].reps);
}

console.log("");
console.log("--- 6. a forma do treino ---");
{
  const r = I.interpretarCsvTreinos(CSV_STRONG, acharId, {});
  teste("dois treinos", 2, r.treinos.length);
  teste("em ordem de data", true, r.treinos[0].data < r.treinos[1].data);
  teste("o primeiro tem dois exercicios", 2, r.treinos[0].itens.length);
  teste("o supino junta as duas series num item", 2, r.treinos[0].itens[0].series.length);
  teste("o nome do treino vem do arquivo", "Push Day", r.treinos[0].nome);
  teste("a duracao 1h 2min vira 62 min", 62, r.treinos[0].duracaoMin);
  teste("45m vira 45", 45, r.treinos[1].duracaoMin);
  teste("quatro series no total", 4, r.series);

  // prancha: só segundos, e tem de virar série de tempo — não "0 kg x 0"
  const prancha = r.treinos[0].itens[1].series[0];
  teste("a prancha vira serie de tempo", { segundos: 60 }, prancha);
}

console.log("");
console.log("--- 7. aquecimento ---");
{
  const hv = I.interpretarCsvTreinos(CSV_HEVY, acharId, {});
  teste("Hevy: set_type warmup marca aquecimento", true, hv.treinos[0].itens[0].series[0].aquec === true);
  teste("e a serie normal nao", undefined, hv.treinos[0].itens[0].series[1].aquec);

  const st = [
    "Date,Exercise Name,Set Order,Weight,Reps",
    "2026-03-14 10:00:00,Squat,W,40,10",
    "2026-03-14 10:00:00,Squat,1,100,5",
  ].join("\n");
  const r = I.interpretarCsvTreinos(st, acharId, {});
  teste("Strong: Set Order W marca aquecimento", true, r.treinos[0].itens[0].series[0].aquec === true);
  teste("e a serie 1 nao", undefined, r.treinos[0].itens[0].series[1].aquec);
}

console.log("");
console.log("--- 8. o que nao foi reconhecido aparece, nao some ---");
{
  const r = I.interpretarCsvTreinos([
    "Date,Exercise Name,Set Order,Weight,Reps",
    "2026-03-14 10:00:00,Bench Press,1,60,10",
    "2026-03-14 10:00:00,Maquina Esquisita,1,50,12",
    "2026-03-14 10:00:00,Maquina Esquisita,2,50,10",
  ].join("\n"), acharId, {});
  teste("um nao reconhecido", 1, r.naoReconhecidos.length);
  teste("com o nome original", "Maquina Esquisita", r.naoReconhecidos[0].nome);
  teste("e quantas series ele tem", 2, r.naoReconhecidos[0].series);
  teste("o reconhecido tem id", "supino", r.treinos[0].itens[0].exercicioId);
  teste("o outro fica com id nulo, nao sumido", null, r.treinos[0].itens[1].exercicioId);
  teste("e as series dele estao la", 2, r.treinos[0].itens[1].series.length);
}

console.log("");
console.log("--- 9. numeros ---");
{
  teste("82,5 em portugues", 82.5, I.numeroCsv("82,5"));
  teste("82.5 em ingles", 82.5, I.numeroCsv("82.5"));
  teste("1,234.5 e mil duzentos", 1234.5, I.numeroCsv("1,234.5"));
  teste("1.234,5 tambem", 1234.5, I.numeroCsv("1.234,5"));
  teste("com unidade colada", 60, I.numeroCsv("60kg"));
  teste("vazio e zero", 0, I.numeroCsv(""));
  teste("texto e zero", 0, I.numeroCsv("-"));
}

console.log("");
console.log("--- 10. arquivo ruim nao quebra ---");
{
  teste("vazio", true, !!I.interpretarCsvTreinos("", acharId, {}).erro);
  teste("so cabecalho", true, !!I.interpretarCsvTreinos("Date,Exercise Name", acharId, {}).erro);
  teste("sem coluna de exercicio", true,
    !!I.interpretarCsvTreinos("Date,Foo\n2026-03-14,1", acharId, {}).erro);
  // linhas de zeros são casas vazias do Strong, não séries
  const r = I.interpretarCsvTreinos([
    "Date,Exercise Name,Set Order,Weight,Reps,Seconds",
    "2026-03-14 10:00:00,Bench Press,1,60,10,0",
    "2026-03-14 10:00:00,Bench Press,2,0,0,0",
  ].join("\n"), acharId, {});
  teste("linha sem numero nenhum e ignorada", 1, r.series);
  teste("e o aviso diz isso", true, r.avisos.some((a) => a.indexOf("ignorada") >= 0));
}

console.log("");
console.log("--- 11. casar o nome e estrito de proposito ---");
{
  const TODOS = [
    { id: "supino", nome: "Supino reto", en: "Barbell Bench Press" },
    { id: "cross", nome: "Crossover baixo (polia baixa)", en: "Cable Crossover" },
    { id: "abdutora", nome: "Cadeira abdutora", en: "Hip Abduction" },
    { id: "adutora", nome: "Cadeira adutora", en: "Hip Adduction" },
  ];
  const achar = (n) => I.acharExercicioImportado(TODOS, n);

  teste("pelo nome em portugues", "supino", achar("Supino reto"));
  teste("sem acento e sem caixa", "supino", achar("SUPINO RETO"));
  teste("pelo nome em ingles", "supino", achar("Barbell Bench Press"));
  teste("o que esta entre parenteses nao conta", "cross", achar("Crossover baixo"));
  teste("e com os parenteses tambem casa", "cross", achar("Crossover baixo (polia baixa)"));

  // O caso que justifica a regra: "adutora" e "abdutora" estão a uma letra
  // uma da outra, e um casamento por parecença juntaria as duas máquinas.
  teste("adutora nao vira abdutora", "adutora", achar("Cadeira adutora"));
  teste("abdutora nao vira adutora", "abdutora", achar("Cadeira abdutora"));

  // melhor nao reconhecer do que reconhecer errado
  teste("nome parecido nao casa", null, achar("Supino reto com halteres"));
  teste("maquina de academia qualquer", null, achar("Hammer Strength Chest"));
  teste("vazio", null, achar(""));
  teste("so pontuacao", null, achar("---"));
  teste("lista vazia", null, I.acharExercicioImportado([], "Supino reto"));
}

console.log("");
console.log("--- 12. o grupo do exercicio que o catalogo nao tem ---");
{
  // a busca do app exige que TODAS as palavras casem, então nome de máquina
  // de academia nunca casa inteiro — é o caso real que motivou isto
  const CAT2 = [
    { id: "supino", nome: "Supino reto", grupo: "peito" },
    { id: "supinoM", nome: "Supino máquina", grupo: "peito" },
    { id: "remada", nome: "Remada curvada", grupo: "costas" },
    { id: "remadaB", nome: "Remada baixa", grupo: "costas" },
    { id: "rosca", nome: "Rosca direta", grupo: "biceps" },
    { id: "agacho", nome: "Agachamento livre", grupo: "pernas" },
  ];
  // busca de mentira com a regra do app: todas as palavras têm de casar
  const buscar = (txt) => {
    const ts = String(txt).toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (!ts.length) return [];
    return CAT2.filter((e) => ts.every((t) => e.nome.toLowerCase().indexOf(t) >= 0));
  };
  const palpite = (n) => I.grupoPalpiteImport(buscar, n, "peito");

  teste("nome que casa inteiro", { grupo: "costas", certo: true }, palpite("Remada curvada"));

  // "Hammer Strength Iso Row" não casa inteiro; "row" não existe em português,
  // mas "remada" sim — aqui o que vale é o teste da mecânica de votação
  teste("maquina: vence a palavra que casa",
    { grupo: "costas", certo: true }, palpite("Maquina Hammer Remada Iso"));
  teste("e com duas palavras de grupos diferentes, a mais votada",
    "peito", palpite("Supino Remada Supino").grupo);

  // o caso que importa: nenhum sinal. Não pode chutar calado.
  const nada = palpite("Xyz Abc Qwerty");
  teste("sem sinal nenhum: usa o padrao", "peito", nada.grupo);
  teste("mas marca que NAO foi palpite", false, nada.certo);

  teste("nome vazio nao quebra", false, palpite("").certo);
  teste("palavra de duas letras e ignorada", false, palpite("ab cd").certo);

  // Palavra de equipamento e de marca não vota: ela diz o APARELHO, não o
  // músculo. "Zyx Qwerty Machine" votava em Pernas só porque "máquina" casa
  // com dezenas de exercícios, e a maioria deles é de perna.
  const CAT3 = [
    { id: "a", nome: "Leg press máquina", grupo: "pernas" },
    { id: "b", nome: "Cadeira extensora máquina", grupo: "pernas" },
    { id: "c", nome: "Supino máquina", grupo: "peito" },
  ];
  const buscar3 = (txt) => {
    const ts = String(txt).toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (!ts.length) return [];
    return CAT3.filter((e) => ts.every((t) => semAcento(e.nome).indexOf(t) >= 0));
  };
  const semMarca = I.grupoPalpiteImport(buscar3, "Zyx Qwerty Machine", "peito");
  teste("maquina sozinha nao escolhe grupo", false, semMarca.certo);
  teste("e nao inventa pernas", "peito", semMarca.grupo);
  // mas com um sinal de verdade junto, ele vence
  teste("com sinal junto, o sinal manda", "peito",
    I.grupoPalpiteImport(buscar3, "Hammer Strength Supino Machine", "pernas").grupo);
}

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
