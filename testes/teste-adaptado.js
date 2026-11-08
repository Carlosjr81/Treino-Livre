// O Treino Adaptado: o que cada exercício carrega, o estado diante de um
// registro de dor, a triagem que para tudo, a escala que vira alerta, o
// critério do plano (que só é mostrado, nunca aplicado) e as palavras que o
// recurso nunca pode usar. A especificação está em juridico/TREINO-ADAPTADO.md.
const html = require("./app").lerApp();
function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
const iniEx = html.indexOf("const EXERCICIOS = [");
const EXERCICIOS = eval(html.slice(iniEx + "const EXERCICIOS = ".length, html.indexOf("\n];", iniEx) + 2));
const DADOS = pedaco("// ---------------- O TREINO ADAPTADO (os dados)", "// Os Termos de Uso");
const REGRAS = pedaco("// ---------------- TREINO ADAPTADO: AS REGRAS", "// ---------------- FIM DO TREINO ADAPTADO: AS REGRAS");
eval(DADOS + REGRAS + "\nglobalThis.A = { movimentosDoExercicio, estadoExercicioAdaptado, estadoAdaptado, triagemAdaptado, perguntasDaTriagem, alertaDoRegistro," +
  " sinalDaEscala, lembreteAvaliacao, modoAdaptado, variacaoCompativel, criterioPlano, manhaPendente, relatorioAdaptado, ALERTAS_ADAPTADO, VARIACOES_ADAPTADO, REVISAO_ADAPTADO, TEXTOS_ADAPTADO };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) { ok++; console.log("  ok   " + nome.padEnd(64) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(64) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const ex = (id) => { const e = EXERCICIOS.find((x) => x.id === id); if (!e) throw new Error("sem " + id); return e; };
const exPorId = (id) => EXERCICIOS.find((x) => x.id === id) || null;
const mov = (id, r) => A.movimentosDoExercicio(ex(id))[r].movs;
const est = (id, reg) => { const e = A.estadoExercicioAdaptado(ex(id), reg); return e ? e.estado : null; };
const agora = 1800000000000;
const reg = (o) => Object.assign({ id: "r1", situacao: "ativa", criado: agora, regiao: "ombro", lado: "dir", zona: "frente", movimentos: [], avaliacao: "nao", sintomas: [] }, o);

console.log("--- o que cada exercício carrega ---");
teste("desenvolvimento: braço acima da cabeça e empurrar", ["cima", "empurrar"], mov("desenvolvimento", "ombro"));
teste("elevação lateral: levantar pelo lado", ["lado"], mov("elevacao-lateral", "ombro"));
teste("supino reto: ombro empurra", ["empurrar"], mov("supino-reto", "ombro"));
teste("supino reto: cotovelo estica e empurra", true, ["esticar", "empurrar"].every((m) => mov("supino-reto", "cotovelo").indexOf(m) >= 0));
teste("tríceps na polia: cotovelo estica, ombro nada", [["esticar"], []], [mov("triceps-polia", "cotovelo"), mov("triceps-polia", "ombro")]);
teste("prancha: apoio nas mãos e apoio do cotovelo", [["apoio"], ["apoiar"]], [mov("prancha", "ombro"), mov("prancha", "cotovelo")]);
teste("leg press: joelho agacha", ["agachar"], mov("leg-press", "joelho"));
teste("cadeira extensora: joelho estica", ["esticar"], mov(EXERCICIOS.find((e) => /extensora/.test(e.id)).id, "joelho"));
const terra = EXERCICIOS.find((e) => /terra/.test(e.id));
teste("levantamento terra: o joelho fica livre (não em dúvida)", [[], false], [mov(terra.id, "joelho"), A.movimentosDoExercicio(terra).joelho.duvida]);
const tricepsCorda = EXERCICIOS.find((e) => /triceps/.test(e.id) && /corda/i.test(e.nome));
teste("tríceps com corda não vira salto (a palavra 'corda')", [], A.movimentosDoExercicio(tricepsCorda).joelho.movs);
const corrida = EXERCICIOS.find((e) => e.cardio === "corrida");
teste("corrida na esteira: joelho corre", ["correr"], A.movimentosDoExercicio(corrida).joelho.movs);
const bike = EXERCICIOS.find((e) => e.cardio === "bike");
teste("bicicleta: joelho em dúvida (depende da pessoa)", true, A.movimentosDoExercicio(bike).joelho.duvida);
teste("exercício criado pela pessoa: em dúvida na região do grupo", true,
  A.movimentosDoExercicio({ id: "custom-1", custom: true, nome: "Máquina da academia", grupo: "pernas" }).joelho.duvida);
// nenhum exercício do catálogo fica sem resposta para a região que o grupo toca
const semResposta = EXERCICIOS.filter((e) => { const m = A.movimentosDoExercicio(e); return ["ombro", "cotovelo", "joelho"].some((r) => m[r].movs.some((x) => typeof x !== "string")); });
teste("todo movimento devolvido é um id de texto", 0, semResposta.length);

console.log("--- o estado diante de um registro ---");
const ombro = reg({ movimentos: ["cima", "lado"] });
teste("dor no braço acima da cabeça: desenvolvimento marcado", "marcado", est("desenvolvimento", ombro));
teste("dor ao levantar pelo lado: elevação lateral marcada", "marcado", est("elevacao-lateral", ombro));
teste("empurrar não foi marcado: supino fica livre", "livre", est("supino-reto", ombro));
teste("exercício de perna não toca o ombro", null, est("leg-press", ombro));
const marcado = A.estadoExercicioAdaptado(ex("desenvolvimento"), ombro);
teste("o motivo diz o movimento, não uma doença", "braço acima da cabeça", marcado.motivo);
const cot = reg({ regiao: "cotovelo", zona: "ponta", movimentos: ["apoiar", "esticar"] });
teste("ponta do cotovelo: tríceps marcado", "marcado", est("triceps-polia", cot));
teste("ponta do cotovelo: prancha marcada (apoio)", "marcado", est("prancha", cot));
const joelhoRes = reg({ regiao: "joelho", movimentos: ["subir"], avaliacao: "restricoes", restricoes: { semImpacto: true } });
teste("sem impacto: corrida barrada", "barrado", est(corrida.id, joelhoRes));
teste("sem impacto: leg press não é impacto (joelho, mas livre)", "livre", est("leg-press", joelhoRes));
teste("restrição só vale com avaliação: no modo registro, é ignorada", "livre",
  est(corrida.id, reg({ regiao: "joelho", avaliacao: "nao", restricoes: { semImpacto: true } })) === "barrado" ? "barrado" : "livre");
const naoFazer = reg({ avaliacao: "restricoes", restricoes: { naoFazer: ["supino-reto"] } });
teste("'não fazer' do profissional: barrado", "barrado", est("supino-reto", naoFazer));
const nota = A.estadoExercicioAdaptado(ex("supino-reto"), reg({ avaliacao: "restricoes", restricoes: { cargaMax: 10, amplitude: "até a altura do ombro" } }));
teste("carga máxima e amplitude viram notas, não decisões", ["carga máxima orientada: 10 kg", "amplitude orientada: até a altura do ombro"], nota.notas);
teste("o pior entre dois registros vale", "barrado",
  A.estadoAdaptado(ex("supino-reto"), [ombro, naoFazer]).estado);
teste("registro encerrado não mexe em nada", null, est("desenvolvimento", Object.assign({}, ombro, { situacao: "encerrada" })));

console.log("--- a triagem para tudo ---");
teste("deformidade depois do trauma: emergência", "emergencia", A.triagemAdaptado({ deformidade: true }, "ombro").nivel);
teste("não dá 4 passos apoiando a perna: atendimento hoje", "hoje", A.triagemAdaptado({ apoiar: true }, "joelho").nivel);
teste("quente, inchada e com febre: atendimento hoje", "hoje", A.triagemAdaptado({ febre: true }, "cotovelo").nivel);
teste("a pergunta do joelho não vale para o ombro", null, A.triagemAdaptado({ apoiar: true }, "ombro"));
teste("o mais grave vence", "emergencia", A.triagemAdaptado({ nervo: true, peito: true }, "ombro").nivel);
teste("dor de 7 parado sem nenhum 'sim': avaliação em breve", "breve", A.triagemAdaptado({}, "joelho", 7).nivel);
teste("tudo 'não' e dor baixa: sem alerta", null, A.triagemAdaptado({}, "joelho", 3));
teste("ponta do cotovelo: a pergunta dela vem primeiro", "ponta", A.perguntasDaTriagem("cotovelo", "ponta")[0].id);
const alertaHoje = reg({ alerta: { nivel: "hoje", motivo: "febre", em: agora } });
teste("alerta de hoje: até o exercício de perna sai do treino", "barrado", est("leg-press", alertaHoje));
const alertaBreve = reg({ movimentos: [], alerta: { nivel: "breve", motivo: "formigamento", em: agora } });
teste("alerta em breve: a região sai do treino", "barrado", est("supino-reto", alertaBreve));
teste("alerta em breve: o resto continua", null, est("leg-press", alertaBreve));
teste("atendido: o alerta sai", null, A.alertaDoRegistro(reg({ alerta: { nivel: "hoje", em: agora, atendidoEm: agora + 1 } })));

console.log("--- a escala de dor ---");
const sint = (tipo, valor, h, sess) => ({ tipo: tipo, valor: valor, em: agora + h * 36e5, sess: sess || "s" + h, ex: tipo === "durante" ? "supino-reto" : null });
teste("dor de 7 no exercício vira alerta em breve", "breve", A.alertaDoRegistro(reg({ sintomas: [sint("durante", 7, 0)] })).nivel);
teste("dor de 6 não vira", null, A.alertaDoRegistro(reg({ sintomas: [sint("durante", 6, 0)] })));
teste("três manhãs seguidas piorando viram alerta", "breve",
  A.alertaDoRegistro(reg({ sintomas: [sint("manha", 2, 0), sint("manha", 3, 24), sint("manha", 4, 48)] })).nivel);
teste("piorou e melhorou: não", null, A.alertaDoRegistro(reg({ sintomas: [sint("manha", 2, 0), sint("manha", 4, 24), sint("manha", 3, 48)] })));
teste("lembrete de avaliação aos 14 dias, só sem avaliação", [false, true, false],
  [A.lembreteAvaliacao(reg({}), agora + 13 * 864e5), A.lembreteAvaliacao(reg({}), agora + 14 * 864e5), A.lembreteAvaliacao(reg({ avaliacao: "restricoes" }), agora + 30 * 864e5)]);
const comSessao = reg({ sintomas: [{ tipo: "durante", valor: 2, em: agora, sess: "x", ex: "supino-reto" }] });
teste("manhã pendente: entre 6 e 36 h depois", [null, "x", null],
  [A.manhaPendente([comSessao], agora + 3 * 36e5), (A.manhaPendente([comSessao], agora + 10 * 36e5) || {}).sess, A.manhaPendente([comSessao], agora + 40 * 36e5)]);

console.log("--- o plano: o app mostra o critério, não decide ---");
const plano = { em: agora - 1, itens: [{ exercicioId: "triceps-polia", series: 3, reps: 15, carga: "5 kg" }], dorDurante: 3, dorManha: 3, progredirN: 2 };
const s2 = (v1, m1, v2, m2) => [
  { tipo: "durante", valor: v1, em: agora, sess: "a", ex: "triceps-polia" }, { tipo: "manha", valor: m1, em: agora + 20 * 36e5, sess: "a" },
  { tipo: "durante", valor: v2, em: agora + 48 * 36e5, sess: "b", ex: "triceps-polia" }, { tipo: "manha", valor: m2, em: agora + 68 * 36e5, sess: "b" }];
const rp = (s) => reg({ regiao: "cotovelo", avaliacao: "plano", plano: plano, sintomas: s });
teste("duas sessões dentro do limite: critério de progredir cumprido", { progredir: true, voltar: false, sessoes: 2 }, A.criterioPlano(rp(s2(2, 2, 3, 2))));
teste("uma sessão só: ainda não", false, A.criterioPlano(rp(s2(2, 2, 3, 2).slice(0, 2))).progredir);
teste("manhã acima do limite: o critério de voltar um passo", { progredir: false, voltar: true, sessoes: 2 }, A.criterioPlano(rp(s2(2, 2, 3, 5))));
teste("depois da decisão registrada, conta de novo do zero", 0,
  A.criterioPlano(rp(s2(2, 2, 3, 2)) && Object.assign(rp(s2(2, 2, 3, 2)), { plano: Object.assign({}, plano, { decididoEm: agora + 100 * 36e5 }) })).sessoes);
teste("o modo segue a avaliação informada", ["registro", "restricoes", "plano"],
  [A.modoAdaptado(reg({})), A.modoAdaptado(reg({ avaliacao: "restricoes" })), A.modoAdaptado(rp([]))]);

console.log("--- as trocas: só da tabela revisada ---");
teste("a tabela de trocas está vazia até a revisão", 0, Object.keys(A.VARIACOES_ADAPTADO).length);
teste("sem tabela, nenhuma troca é sugerida", null, A.variacaoCompativel(ex("desenvolvimento"), [ombro], exPorId));
A.VARIACOES_ADAPTADO["desenvolvimento"] = ["elevacao-lateral", "supino-reto", "leg-press"];
teste("com a tabela: pula a troca que também dói, e a de outro grupo", null, A.variacaoCompativel(ex("desenvolvimento"), [ombro], exPorId));
A.VARIACOES_ADAPTADO["desenvolvimento"] = ["elevacao-frontal"];
teste("com a tabela: a troca que não usa o movimento que dói", "elevacao-frontal", (A.variacaoCompativel(ex("desenvolvimento"), [ombro], exPorId) || {}).id);
teste("restrição em texto livre: nenhuma troca", null,
  A.variacaoCompativel(ex("desenvolvimento"), [Object.assign({}, ombro, { avaliacao: "restricoes", restricoes: { texto: "evitar peso" } })], exPorId));
delete A.VARIACOES_ADAPTADO["desenvolvimento"];

console.log("--- o que o recurso diz, e o que nunca diz ---");
teste("a revisão do fisioterapeuta ainda não foi gravada (a tela avisa)", "", A.REVISAO_ADAPTADO.fisioterapeuta);
const textoDoRecurso = JSON.stringify(A.TEXTOS_ADAPTADO) + JSON.stringify(A.ALERTAS_ADAPTADO) + pedaco("function TelaAdaptado", "// ---------------- FIM DA TELA DO TREINO ADAPTADO");
const proibidas = ["tratamento", "tratar ", "reabilita", "recuperar", "curar", "tendinite", "bursite", "artrose", "liberado para treinar", "prescri", "personal", "avaliação física", "garantid", "diagnóstico:"];
teste("nenhuma palavra proibida nos textos e na tela", [], proibidas.filter((p) => new RegExp("(^|[^a-z])" + normalizar(p)).test(normalizar(textoDoRecurso))));
function normalizar(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
teste("toda pergunta da triagem é de sim ou não e termina em '?'", true, A.ALERTAS_ADAPTADO.every((a) => /\?$/.test(a.pergunta)));
teste("o registro da dor não sobe ao Firebase (só a declaração)", true,
  !/contaApi\.(gravar|registrarAceite)\([^)]*sintomas/.test(html) && /de: "adaptado"/.test(html));
const rel = A.relatorioAdaptado(rp(s2(2, 2, 3, 2)), exPorId);
teste("o relatório para o profissional diz que não é laudo", true, /não é laudo nem diagnóstico/.test(rel));
teste("o relatório leva as dores e o plano", true, /manhã seguinte: 2/.test(rel) && /Tríceps/.test(rel));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
