// A modalidade zumbi: o motor de intervalos, a avaliação da fuga, o plano, a
// história e a fila de falas, com relógio e sensores simulados. Cobre os
// critérios de aceite da especificação (seção 14) que não dependem de tela,
// GPS de verdade ou alto-falante — esses ficam no roteiro manual do CLAUDE.md.
const html = require("./app").lerApp();
const fs = require("fs"), path = require("path");
const ini = html.indexOf("// ---------------- ZUMBI: MOTOR");
const fim = html.indexOf("// ---------------- FIM DO MOTOR ZUMBI");
if (ini < 0 || fim < 0) { console.error("nao achei o motor zumbi no index.html"); process.exit(1); }
eval(html.slice(ini, fim).replace(/\r\n/g, "\n") +
  "\nglobalThis.Z = { NOME_ZUMBI, ZUMBI_PADRAO, kmhDeMs, msDeKmh, paceSegKm, velocidadeAlvo, paceAlvo, fmtPaceSeg, validarAmostra, velocidadeBase," +
  " calcularAlvo, criarAvaliador, planejarMissao, validarConfigZumbi, criarMotorZumbi, restaurarMotorZumbi, validarMissao, escolherCena, falaDaCena, narrar," +
  " criarFilaFalas, MISSAO_ULTIMO_SINAL, MISSOES_ZUMBI, sortearMissaoZumbi, missaoZumbiPorId, MONSTROS_ZUMBI, monstroDe, missoesDoMonstro, distanciaMonstro, leituraRadar, zonaRadar, placarMissao, juntarSemDuplicar, registroZumbi, duracaoPerseguicao };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const bate = tol !== undefined ? Math.abs(obtido - esperado) <= tol : JSON.stringify(obtido) === JSON.stringify(esperado);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(62) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(62) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado) + (tol !== undefined ? " ±" + tol : "")); }
}

// ---- Simulação: relógio de 1 s, uma pessoa que responde (ou não) ao pedido ----
const cfgBase = (o) => Object.assign({ duracaoMin: 20, ambiente: "rua", atividade: "corrida", experiencia: "adaptativa", fonte: "gps",
  aumentoPct: 10, tetoKmh: 16, semente: 7 }, o || {});
function simular(o) {
  const cfg = cfgBase(o.cfg);
  const plano = Z.planejarMissao(cfg);
  const m = Z.criarMotorZumbi(cfg, plano);
  const fatos = {}, usadas = [], falas = [], eventos = [];
  const base = o.base || (cfg.atividade === "caminhada" ? Z.msDeKmh(5) : Z.msDeKmh(10));
  const missao = o.missao || Z.MISSAO_ULTIMO_SINAL;
  const narrarTudo = (evs) => evs.forEach((e) => { eventos.push(e); const f = Z.narrar(missao, e, fatos, usadas); if (f) falas.push(f); });
  narrarTudo(m.iniciar());
  let passo = 0;
  while (m.s.fase !== "finalizada" && passo < 4000) {
    passo++;
    if (o.acao) o.acao(m, passo);
    const p = m.perseguicaoAtual();
    let v = base;
    // responde: no esforço, sobe até um pouco acima do alvo
    if (p && p.alvo && (m.s.fase === "transicao" || m.s.fase === "perseguicao") && o.responde !== false) v = p.alvo * 1.03;
    if (o.mais && p && (m.s.fase === "perseguicao")) v = base * 1.6;
    const leitura = o.leitura ? o.leitura(v, m, passo) : { valor: v, origem: cfg.fonte === "guiado" ? null : cfg.fonte, qualidade: 0.9 };
    if (leitura && cfg.fonte !== "guiado") m.amostra(leitura);
    narrarTudo(m.avancar(1000));
  }
  return { m: m, falas: falas, eventos: eventos, fatos: fatos, r: m.resumo(), plano: plano, cfg: cfg };
}

console.log("--- 3. unidades ---");
teste("6 km/h + 20% = 7,2 km/h", 7.2, Z.kmhDeMs(Z.velocidadeAlvo(Z.msDeKmh(6), 20)), 1e-9);
teste("10:00 /km com +20% de velocidade = 8:20 /km", "8:20", Z.fmtPaceSeg(Z.paceAlvo(600, 20)));
teste("o pace sai da velocidade: 10 km/h = 6:00 /km", "6:00", Z.fmtPaceSeg(Z.paceSegKm(Z.msDeKmh(10))));
teste("pace de velocidade zero nao existe", null, Z.paceSegKm(0));

console.log("--- 4. leituras que nao valem ---");
const ruins = [{ valor: NaN, qualidade: 1 }, { valor: -1, qualidade: 1 }, { valor: 9, qualidade: 1 }, { valor: 2, qualidade: 0.2 }];
teste("NaN, negativa, impossivel e de baixa qualidade", [false, false, false, false], ruins.map((a) => Z.validarAmostra(a, [])));
const hist = [2.7, 2.8, 2.75].map((v) => ({ valor: v, valida: true }));
teste("pico isolado do GPS fica fora", false, Z.validarAmostra({ valor: 6.5, qualidade: 1 }, hist));
teste("ritmo normal passa", true, Z.validarAmostra({ valor: 2.9, qualidade: 1 }, hist));
const espacadas = []; for (let t = 0; t < 30000; t += 8000) espacadas.push({ t: t, valor: 2.5, valida: true });
teste("cobertura baixa (leitura a cada 8 s) nao da base", null, Z.velocidadeBase(espacadas, 30000).base);
const boas = []; for (let t = 0; t < 30000; t += 1000) boas.push({ t: t, valor: 2.5, valida: true });
teste("leitura a cada segundo da base", 2.5, Z.velocidadeBase(boas, 30000).base, 1e-9);
const paradas = boas.map((a) => Object.assign({}, a, { valor: 0.1 }));
teste("parado (celular no suporte, quase zero) nao vira base", null, Z.velocidadeBase(paradas, 30000).base);

console.log("--- 1. as combinacoes concluem a missao ---");
[["rua", "caminhada", "gps"], ["rua", "corrida", "gps"], ["esteira", "caminhada", "declarado"], ["esteira", "corrida", "declarado"], ["rua", "alternada", "gps"]].forEach(([amb, at, f]) => {
  const x = simular({ cfg: { ambiente: amb, atividade: at, fonte: f, tetoKmh: at === "caminhada" ? 7.5 : 16 } });
  teste(amb + " / " + at + ": termina, com fugas e o fim narrado", ["finalizada", true, "fim"],
    [x.m.s.fase, x.r.fugasMedidas + x.r.fugasEstimadas > 0, x.falas[x.falas.length - 1].tipo]);
});
const cam = simular({ cfg: { atividade: "caminhada", tetoKmh: 7.5 } });
teste("caminhada nunca pede acima de 7,5 km/h", true, cam.r.persegs.every((p) => !p.alvo || Z.kmhDeMs(p.alvo) <= 7.5 + 1e-9));
teste("e a fala pede passada, nao corrida", true, cam.falas.filter((f) => f.tipo === "transicao").every((f) => /passada/.test(f.texto) && !/corr/.test(f.texto)));
const alt = simular({ cfg: { atividade: "alternada" } });
teste("alternada: o esforco fala de corrida", true, alt.falas.filter((f) => f.tipo === "transicao").every((f) => /gradualmente/.test(f.texto)));

console.log("--- 2. o alvo congela antes do aviso ---");
const mais = simular({ mais: true });
const p0 = mais.r.persegs.find((p) => p.alvo);
teste("alvo = base de antes do aviso + 10%", Z.velocidadeAlvo(Z.msDeKmh(10), 10), p0.alvo, 0.01);
teste("acelerar 60% nao eleva o alvo da mesma perseguicao", true, mais.r.persegs.filter((p) => p.alvo).every((p) => Math.abs(p.alvo - p0.alvo) < 0.01));

console.log("--- 5. plano: cabe, descansa, e missao curta tem menos ---");
const ns = {};
[10, 20, 30, 45].forEach((d) => {
  const pl = Z.planejarMissao(cfgBase({ duracaoMin: d }));
  ns[d] = pl.blocos.filter((b) => b.tipo === "perseguicao").length;
  const recOk = pl.blocos.every((b, i) => b.tipo !== "perseguicao" || (pl.blocos[i + 1].tipo === "recuperacao" && pl.blocos[i + 1].dur >= Z.ZUMBI_PADRAO.recupMinMs));
  const esforco = pl.blocos.filter((b) => b.tipo === "perseguicao").reduce((a, b) => a + b.dur, 0);
  teste(d + " min: soma exata, recuperacao minima e orcamento", [d * 60000, true, true], [pl.total, recOk, esforco <= d * 60000 * 0.35]);
});
teste("10 min tem menos perseguicoes que 45", true, ns[10] < ns[45] && ns[45] <= Z.ZUMBI_PADRAO.maxPerseguicoes);
teste("a mesma semente da o mesmo plano", JSON.stringify(Z.planejarMissao(cfgBase({ semente: 3 }))), JSON.stringify(Z.planejarMissao(cfgBase({ semente: 3 }))));
teste("intervalos que nao cabem sao recusados", true, !!Z.planejarMissao(cfgBase({ experiencia: "intervalos", duracaoMin: 10, blocos: [{ tipo: "forte", seg: 120 }, { tipo: "leve", seg: 120 }], repeticoes: 5 })).erro);
teste("recuperacao curta demais e recusada", true, /recupera/.test(Z.planejarMissao(cfgBase({ experiencia: "intervalos", blocos: [{ tipo: "forte", seg: 90 }, { tipo: "leve", seg: 30 }], repeticoes: 2 })).erro));
const pi = Z.planejarMissao(cfgBase({ experiencia: "intervalos", blocos: [{ tipo: "forte", seg: 90 }, { tipo: "leve", seg: 120 }], repeticoes: 3 }));
teste("intervalos validos: 3 fortes, nenhum esforco escondido", [3, 20 * 60000], [pi.blocos.filter((b) => b.tipo === "forte").length, pi.total]);
const hi = Z.planejarMissao(cfgBase({ experiencia: "historia" }));
teste("somente historia nao tem esforco", 0, hi.blocos.filter((b) => b.tipo === "perseguicao" || b.tipo === "forte").length);
teste("config impossivel: GPS na esteira", true, Z.validarConfigZumbi(cfgBase({ ambiente: "esteira", fonte: "gps" })).length > 0);
teste("config impossivel: caminhada com teto de corrida", true, Z.validarConfigZumbi(cfgBase({ atividade: "caminhada", tetoKmh: 12 })).length > 0);
teste("config valida passa", [], Z.validarConfigZumbi(cfgBase()));

console.log("--- 6. os resultados nao se misturam ---");
teste("GPS: fuga medida", true, simular({}).r.fugasMedidas > 0);
const est = simular({ cfg: { ambiente: "esteira", fonte: "passos", passada: 1.1 }, leitura: (v) => ({ valor: v, origem: "passos", qualidade: 0.8 }) });
teste("passos: fuga estimada, nunca medida", [true, 0], [est.r.fugasEstimadas > 0, est.r.fugasMedidas]);
const gui = simular({ cfg: { fonte: "guiado" } });
teste("guiado: so desfechos guiados, nada medido", [true, 0, 0], [gui.r.guiadas > 0, gui.r.fugasMedidas, gui.r.fugasEstimadas]);
const lento = simular({ responde: false });
teste("quem nao acelera: desfecho alternativo, sem fuga", [true, 0], [lento.r.desfechos > 0, lento.r.fugasMedidas]);
const canc = simular({ acao: (m) => { if (m.s.fase === "perseguicao") m.cancelarDesafio(); } });
teste("cancelar: cancelada, sem fuga nem derrota", [true, 0, 0], [canc.r.canceladas > 0, canc.r.fugasMedidas, canc.r.desfechos]);
const perdido = simular({ leitura: (v, m) => (m.s.fase === "perseguicao" ? null : { valor: v, origem: "gps", qualidade: 0.9 }) });
teste("GPS perdido no desafio: nao avaliada, nunca derrota", [true, 0], [perdido.r.naoAvaliadas > 0, perdido.r.desfechos]);
teste("sem leitura nao soma tempo no alvo", 0, perdido.r.noAlvoMs);

console.log("--- 7. pausa, interrupcao e restauracao ---");
const cfgP = cfgBase();
const mp = Z.criarMotorZumbi(cfgP, Z.planejarMissao(cfgP));
mp.iniciar();
for (let i = 0; i < 100; i++) { mp.amostra({ valor: 2.78, origem: "gps", qualidade: 0.9 }); mp.avancar(1000); }
mp.pausar();
for (let i = 0; i < 300; i++) mp.avancar(1000);
teste("5 min em pausa nao contam tempo ativo", 100000, mp.s.tAtivo);
mp.retomar();
mp.avancar(600000);
teste("o app suspenso 10 min volta somando no maximo 2 s", 102000, mp.s.tAtivo);
// restauracao no meio de uma perseguicao
const cfgR = cfgBase();
const mr = Z.criarMotorZumbi(cfgR, Z.planejarMissao(cfgR));
const evR = mr.iniciar();
let noMeio = false;
for (let i = 0; i < 2000 && !noMeio; i++) { mr.amostra({ valor: 2.78, origem: "gps", qualidade: 0.9 }); evR.push(...mr.avancar(1000)); noMeio = mr.s.fase === "perseguicao"; }
const cp = mr.checkpoint();
const mr2 = Z.restaurarMotorZumbi(cp);
teste("restaurado volta em pausa", true, mr2.s.pausado);
teste("a perseguicao interrompida fica nao avaliada", "nao-avaliada", Object.values(mr2.s.persegs).find((p) => p.motivo === "interrompida").resultado);
const depois = mr2.retomar();
for (let i = 0; i < 5; i++) depois.push(...mr2.avancar(1000));
teste("retomar nao repete os eventos ja processados", false, depois.some((e) => evR.some((x) => x.id === e.id)));
teste("nem dispara uma rajada de falas atrasadas", true, depois.length <= 3);
const seg = Z.criarMotorZumbi(cfgR, Z.planejarMissao(cfgR));
seg.iniciar();
let feito = false;
for (let i = 0; i < 3000 && seg.s.fase !== "finalizada"; i++) {
  seg.amostra({ valor: 2.78, origem: "gps", qualidade: 0.9 });
  if (!feito && seg.s.fase === "perseguicao") { seg.pausar(true); feito = true; seg.retomar(); }
  seg.avancar(1000);
}
const ps = seg.resumo().persegs;
teste("pausa de seguranca cancela sem penalidade", true, ps.some((p) => p.resultado === "cancelada"));

console.log("--- 8. ameaca e falas ---");
const mA = Z.criarMotorZumbi(cfgP, Z.planejarMissao(cfgP));
mA.iniciar();
let maxLento = 0, minRapido = 1;
for (let i = 0; i < 3000 && mA.s.fase !== "finalizada"; i++) {
  const p = mA.perseguicaoAtual();
  const primeira = p && p.id === mA.blocos.find((b) => b.tipo === "perseguicao").id;
  let v = 2.78;
  if (p && p.alvo && !primeira && mA.s.fase === "perseguicao") v = p.alvo * 1.04;
  mA.amostra({ valor: v, origem: "gps", qualidade: 0.9 });
  mA.avancar(1000);
  if (mA.s.fase === "perseguicao") { if (primeira) maxLento = Math.max(maxLento, mA.ameaca()); else minRapido = Math.min(minRapido, mA.ameaca()); }
}
teste("parado no ritmo: a ameaca chega perto", true, maxLento > 0.8);
teste("no alvo: a ameaca se afasta", true, minRapido < 0.3);
const ditas = [];
let concorrentes = 0, ativos = 0;
let fase = "aviso";
const fila = Z.criarFilaFalas((t, fim) => { ativos++; concorrentes = Math.max(concorrentes, ativos); ditas.push(t); setImmediate(() => { ativos--; fim(); }); });
fila.por({ texto: "Detectei movimento.", prioridade: 3 }, () => true);
fila.por({ texto: "Acelere agora.", prioridade: 3 }, () => fase === "aviso");
fila.por({ texto: "O vento muda.", prioridade: 0 }, () => true);
fase = "recuperacao";
setImmediate(() => setImmediate(() => setImmediate(() => {
  teste("nunca duas falas ao mesmo tempo", 1, concorrentes);
  teste("o 'acelere' vencido nao e dito na recuperacao", false, ditas.indexOf("Acelere agora.") >= 0);
  final();
})));

function final() {
  console.log("--- 9. a historia ---");
  teste("o roteiro Ultimo Sinal e valido", { ok: true, erros: [] }, Z.validarMissao(Z.MISSAO_ULTIMO_SINAL));
  const quebrada = JSON.parse(JSON.stringify(Z.MISSAO_ULTIMO_SINAL));
  quebrada.cenas[0].proximas = ["nao-existe"];
  quebrada.cenas[1].define = ["inventado"];
  quebrada.cenas = quebrada.cenas.filter((c) => c.id !== "fim-reserva");
  const v = Z.validarMissao(quebrada);
  teste("referencia quebrada, fato inventado e fim sem reserva", [false, true, true, true], [v.ok, v.erros.some((e) => /nao-existe/.test(e)), v.erros.some((e) => /inventado/.test(e)), v.erros.some((e) => /"fim"/.test(e))]);
  const comFuncao = Object.assign({}, Z.MISSAO_ULTIMO_SINAL, { executar: function () { return 1; } });
  teste("missao com codigo e recusada", false, Z.validarMissao(comFuncao).ok);
  const tudoCancelado = simular({ acao: (m) => { if (m.s.fase === "transicao") m.cancelarDesafio(); } });
  teste("pulando todos os desafios a historia fecha coerente", ["fim-bateria", true], [tudoCancelado.falas.find((f) => f.tipo === "fim").cena, tudoCancelado.fatos.bateria === true]);
  const nenhumaFuga = simular({ responde: false });
  teste("sem nenhuma fuga, o fim nao finge sinal restaurado", true, nenhumaFuga.falas.find((f) => f.tipo === "fim").cena !== "fim-farol" || nenhumaFuga.fatos.sinal);
  const todasFugas = simular({});
  teste("com fugas, o fim e o do farol", "fim-farol", todasFugas.falas.find((f) => f.tipo === "fim").cena);
  const hist2 = simular({ cfg: { experiencia: "historia" } });
  teste("somente historia: nenhum aviso de ameaca, e a historia anda", [0, "fim-farol"], [hist2.falas.filter((f) => f.tipo === "aviso").length, hist2.falas.find((f) => f.tipo === "fim").cena]);
  const textos = Z.MISSAO_ULTIMO_SINAL.cenas.map((c) => JSON.stringify(c.falas)).join(" ");
  teste("nenhuma fala manda atravessar, entrar ou virar", false, /atravess|entre no|vire |dobre a/.test(textos));
  const amb = todasFugas.falas.filter((f) => f.tipo === "ambiente").map((f) => f.cena);
  teste("a ambientacao nao repete a mesma fala seguida", true, amb.every((c, i) => i === 0 || c !== amb[i - 1]));
  teste("cada fala dita uma vez por evento", true, todasFugas.falas.length === new Set(todasFugas.falas.map((f) => f.evento)).size);

  console.log("--- 9b. as outras historias ---");
  teste("vinte e duas historias", 22, Z.MISSOES_ZUMBI.length);
  teste("ids unicos", 22, new Set(Z.MISSOES_ZUMBI.map((m) => m.id)).size);
  const classicos = Object.keys(Z.MONSTROS_ZUMBI).filter((k) => !Z.MONSTROS_ZUMBI[k].grupo);
  teste("doze monstros; os classicos com 2+ historias, os outros com 1+", [12, 5, true],
    [Object.keys(Z.MONSTROS_ZUMBI).length, classicos.length,
      Object.keys(Z.MONSTROS_ZUMBI).every((k) => Z.missoesDoMonstro(k).length >= (Z.MONSTROS_ZUMBI[k].grupo ? 1 : 2))]);
  teste("parodia, nao copia: nenhum nome original no app", [],
    (html.match(/The Boys|Capit[aã]o P[aá]tria|Homelander|Vought|Jurassic|Nostromo|Ripley|Skynet|Stranger Things|Hawkins|Demogorgon|Sarah Connor|Kyle Reese|Ripley|Nostromo|Amity|Brody|Hammond|Alan Grant|Joyce|Eleven/g) || []));
  const persegue = (m, at) => m.cenas.find((c) => c.id === "perseguicao").falas[at];
  teste("so o zumbi e lento: as outras perseguicoes falam do proprio monstro", true,
    Z.MISSOES_ZUMBI.every((m) => Z.monstroDe(m).id === "zumbi" ? /lentos|arrastando/.test(persegue(m, "caminhada")) : !/lentos|eles est/i.test(persegue(m, "caminhada") + persegue(m, "corrida"))));
  let r2 = 0; const rnd2 = () => (r2 = (r2 + 0.29) % 1);
  const lobos = Array.from({ length: 10 }, () => Z.sortearMissaoZumbi("lua-cheia-na-serra", rnd2, "lobisomem"));
  teste("o sorteio por monstro fica no monstro e nao repete", [true, true],
    [lobos.every((m) => Z.monstroDe(m).id === "lobisomem"), lobos.every((m) => m.id !== "lua-cheia-na-serra")]);
  Z.MISSOES_ZUMBI.forEach((m) => {
    const v = Z.validarMissao(m);
    const todas = simular({ missao: m });
    const nenhuma = simular({ missao: m, responde: false });
    const pulando = simular({ missao: m, acao: (mm) => { if (mm.s.fase === "transicao") mm.cancelarDesafio(); } });
    const fim = (x) => x.falas.find((f) => f.tipo === "fim").cena;
    const fala = JSON.stringify(m.cenas.map((c) => c.falas));
    teste(m.nome + ": valida, fim completo com fugas, coerente sem elas", [true, "completo", true, true, false],
      [v.ok, /fim-completo|fim-farol/.test(fim(todas)) ? "completo" : fim(todas), !/fim-completo|fim-farol/.test(fim(nenhuma)) || !!nenhuma.fatos[m.fatos[1]],
        !!pulando.fatos[m.fatos[0]], /atravess|entre no|vire |dobre a/.test(fala)]);
  });
  let r = 0; const rnd = () => (r = (r + 0.37) % 1);
  const sorteios = Array.from({ length: 12 }, (_, i) => Z.sortearMissaoZumbi(i % 2 ? "trem-da-meia-noite" : "ultimo-sinal", rnd).id);
  teste("o sorteio varia e nao repete a ultima", [true, true], [new Set(sorteios).size >= 3, sorteios.every((id, i) => id !== (i % 2 ? "trem-da-meia-noite" : "ultimo-sinal"))]);
  teste("missao desconhecida cai no Ultimo Sinal", "ultimo-sinal", Z.missaoZumbiPorId("nao-existe").id);

  const mb = Z.MONSTROS_ZUMBI.marombeiro, fimMb = Z.missaoZumbiPorId("fuga-do-marombeiro").cenas.find((c) => c.id === "fim-completo").falas.todas;
  teste("o Marombeiro: as camadas existem, estao no modo offline, e o fim convida a seguir", [true, true, true],
    [[mb.foto, mb.fotoCorpo, "marombeiro-corpo.webp", "marombeiro-braco.webp", "marombeiro-cabeca.webp"].every((f) => fs.existsSync(path.join(__dirname, "..", f))),
      ["marombeiro-corpo.webp", "marombeiro-braco.webp", "marombeiro-cabeca.webp", mb.fotoCorpo, mb.foto].every((f) => fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8").indexOf("./" + f) >= 0),
      /Siga o Marombeiro no Instagram/.test(fimMb)]);

  console.log("--- 9c. o radar ---");
  teste("distancia: longe (dentro do radar), meio e encostando", [280, true, 15], [Z.distanciaMonstro(0), Z.distanciaMonstro(0.5) > 90 && Z.distanciaMonstro(0.5) < 160, Z.distanciaMonstro(1)]);
  teste("quanto mais ameaca, mais perto (sempre)", true, Array.from({ length: 20 }, (_, i) => Z.distanciaMonstro(i / 20)).every((d, i, a) => i === 0 || d < a[i - 1]));
  const fecha = Z.leituraRadar([{ t: 0, d: 100 }, { t: 2000, d: 90 }, { t: 4000, d: 80 }]);
  teste("chegando 5 m/s: alcanca em 13 s", [-5, 13], [fecha.vel, fecha.alcancaEm]);
  const abre = Z.leituraRadar([{ t: 0, d: 80 }, { t: 4000, d: 92 }]);
  teste("ficando para tras: sem previsao de alcance", [3, null], [abre.vel, abre.alcancaEm]);
  teste("zonas do radar", ["No seu calcanhar", "Perto", "À vista", "Fora do alcance"], [40, 100, 250, Infinity].map((d) => Z.zonaRadar(d).nome));
  const pl = Z.placarMissao({ tAtivo: 25000, graf: { 0: [30, 10], 1: [30, 10], 2: [30, 10] },
    persegs: { a: { blocoIni: 1, resultado: "fugiu", noAlvoMs: 30000 }, b: { blocoIni: 2, resultado: "alcancado", noAlvoMs: 10000 },
      c: { blocoIni: 3, resultado: "fugiu", noAlvoMs: 30000 }, d: { blocoIni: 4, resultado: "fugiu", noAlvoMs: 30000 }, e: { blocoIni: 5, resultado: "adiada" } } });
  teste("placar: fugas, sequencia, melhor sequencia, tempo no alvo e km", [3, 4, 2, 2, 100000, 0.08], [pl.fugas, pl.decididas, pl.sequencia, pl.melhorSeq, pl.noAlvoMs, pl.km]);

  console.log("--- 9d. o resumo animado da missao ---");
  {
    const i0 = html.indexOf("// Quem é o monstro, dito em voz alta"), i1 = html.indexOf("function dadosResumo(");
    eval("const { missaoZumbiPorId, monstroDe, escolherCena, falaDaCena } = Z;\n" + html.slice(i0, i1).replace(/\r\n/g, "\n") + "\nglobalThis.MR = monstroResumo;");
    const reg = (fatos) => ({ zumbi: { missao: "heroi-da-nacao", fatos: fatos, noAlvoMs: 60000, maisPerto: 21, cfg: { atividade: "corrida" },
      persegs: [{ resultado: "fugiu", alvo: 2.9 }, { resultado: "alcancado" }, { resultado: "adiada" }] } });
    const r = MR(reg(["gravacao", "copia", "verdade"]));
    teste("resumo: fugas, alcances, mais perto e quem", [1, 2, 1, 21, "o Capitão Pátio"], [r.fugas, r.ps.length, r.alcancado, r.maisPerto, r.quem.nome]);
    teste("resumo: o final da historia completa", [true, true], [r.completo, /^A gravação tocou/.test(r.fim)]);
    const p = MR(reg(["gravacao"]));
    teste("resumo: so o primeiro fato e missao em parte", [false, true], [p.completo, p.parcial]);
    teste("resumo: registro sem missao nao e monstro", null, MR({ itens: [] }));
  }

  console.log("--- 10. historico sem duplicar ---");
  const r1 = Z.registroZumbi("zr-1", new Date(2026, 9, 15).toISOString(), todasFugas.m, Z.MISSAO_ULTIMO_SINAL, { km: 3 });
  const h1 = Z.juntarSemDuplicar([], r1);
  const h2 = Z.juntarSemDuplicar(h1, r1);
  teste("salvar duas vezes guarda um treino", 1, h2.length);
  teste("o grafico preserva lacunas (null), nao zera", true, perdido.m && Z.registroZumbi("x", "", perdido.m, Z.MISSAO_ULTIMO_SINAL).zumbi.velocidade.some((x) => x === null));
  const rg = Z.registroZumbi("g", "", gui.m, Z.MISSAO_ULTIMO_SINAL, { km: 9 });
  teste("guiado nao inventa velocidade nem distancia", [null, undefined], [rg.zumbi.velocidade, rg.itens[0].series[0].km]);
  teste("o nome da modalidade", "Monster, Run!", Z.NOME_ZUMBI);

  console.log("\n" + ok + " passou / " + mal + " falhou");
  process.exit(mal ? 1 : 0);
}
