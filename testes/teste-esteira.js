// A esteira por Bluetooth (FTMS): ler o pacote de dados e montar os comandos.
//
// Este é o tipo de código que não dá para "testar olhando": são bits. Ler um
// campo na ordem errada não dá erro — dá número errado, que é pior, porque
// aparece na tela com cara de verdade. Então cada caso aqui é um pacote montado
// byte a byte a partir da especificação (Fitness Machine Service 1.0, tabelas
// 4.5 e 4.15), e a conta é conferida à mão.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
// `ESTEIRA_DISPONIVEL` é decidido no instante em que o bloco é avaliado, então
// o navegador de mentira precisa existir ANTES do eval — senão o módulo nasce
// achando que esta máquina não tem Bluetooth e recusa tudo.
//
// E tem de ser por `defineProperty`: o Node já traz um `navigator` próprio, que
// é só de leitura. Atribuir por cima não dá erro — não faz nada, que é pior.
function porNavigator(bt) {
  Object.defineProperty(globalThis, "navigator", { value: { bluetooth: bt }, configurable: true, writable: true });
}
porNavigator({ requestDevice: () => Promise.reject(new Error("ninguem pediu")) });

eval(
  pedaco("// ---------------- ESTEIRA POR BLUETOOTH (FTMS)", "// ---------------- FIM DO MOTOR DA ESTEIRA") +
  "\nglobalThis.A = { lerDadosEsteira, lerFaixaVelocidade, lerFaixaInclinacao, lerRespostaControle," +
  " bytesVelocidade, bytesInclinacao, velocidadePermitida, ESTEIRA_TETO_PADRAO," +
  " FTMS_VELOCIDADE, FTMS_INCLINACAO, FTMS_RESPOSTA };"
);
const A = globalThis.A;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(48) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(48) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

// monta um DataView a partir de uma lista de bytes
const dv = (bytes) => new DataView(new Uint8Array(bytes).buffer);
const u16 = (n) => [n & 0xff, (n >> 8) & 0xff];
const s16 = (n) => u16(n < 0 ? n + 0x10000 : n);
const u24 = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];

console.log("--- o pacote mais simples: so a velocidade ---");
// flags = 0 (More Data em 0 quer dizer que a velocidade VEIO), vel = 9,50 km/h
teste("9,50 km/h", { vel: 9.5 }, A.lerDadosEsteira(dv([].concat(u16(0), u16(950)))));
teste("parada", { vel: 0 }, A.lerDadosEsteira(dv([].concat(u16(0), u16(0)))));
teste("18,00 km/h", { vel: 18 }, A.lerDadosEsteira(dv([].concat(u16(0), u16(1800)))));

console.log("\n--- a flag 0 e invertida na especificacao ---");
// More Data ligada = a velocidade NAO veio neste pacote
teste("More Data ligada: sem velocidade", {}, A.lerDadosEsteira(dv([].concat(u16(0x0001)))));
// e o campo seguinte tem de ser lido do lugar certo mesmo sem a velocidade
// flags = More Data (bit 0) + Total Distance (bit 2) = 0x0005
teste("e o proximo campo nao escorrega", { metros: 1234 },
  A.lerDadosEsteira(dv([].concat(u16(0x0005), u24(1234)))));

console.log("\n--- um pacote de verdade, com varios campos ---");
// flags: vel(0 ligado=ausente? nao) + media(1) + distancia(2) + inclinacao(3) + bpm(8) + tempo(10)
// 0b0000010100001110 = bits 1,2,3,8,10 => 0x050E
const pacote = [].concat(
  u16(0x050e),
  u16(1050),      // vel 10,50 km/h (bit 0 em 0 = presente)
  u16(980),       // media 9,80
  u24(3420),      // 3420 m
  s16(25),        // inclinacao 2,5 %
  s16(14),        // rampa 1,4 graus
  [142],          // 142 bpm
  u16(1265)       // 1265 s
);
teste("todos os campos na ordem certa",
  { vel: 10.5, velMedia: 9.8, metros: 3420, incl: 2.5, rampa: 1.4, bpm: 142, segundos: 1265 },
  A.lerDadosEsteira(dv(pacote)));

console.log("\n--- inclinacao negativa (descida) ---");
teste("-3,0 %", { vel: 6, incl: -3, rampa: -1.7 },
  A.lerDadosEsteira(dv([].concat(u16(0x0008), u16(600), s16(-30), s16(-17)))));

console.log("\n--- pacote curto nao pode inventar numero ---");
// flags dizem que tem distancia, mas os bytes acabaram
teste("campo prometido que nao veio e ignorado", { vel: 6 },
  A.lerDadosEsteira(dv([].concat(u16(0x0004), u16(600), [0x01]))));
teste("pacote vazio", null, A.lerDadosEsteira(dv([])));
teste("so um byte", null, A.lerDadosEsteira(dv([0x00])));
teste("nulo nao quebra", null, A.lerDadosEsteira(null));

console.log("\n--- as faixas que a maquina aceita ---");
teste("velocidade de 0,5 a 20 km/h, passo 0,1",
  { min: 0.5, max: 20, passo: 0.1 },
  A.lerFaixaVelocidade(dv([].concat(u16(50), u16(2000), u16(10)))));
teste("inclinacao de -3 a 15 %, passo 0,5",
  { min: -3, max: 15, passo: 0.5 },
  A.lerFaixaInclinacao(dv([].concat(s16(-30), s16(150), u16(5)))));
teste("faixa curta demais nao vira faixa", null, A.lerFaixaVelocidade(dv([1, 2])));

console.log("\n--- a resposta do ponto de controle ---");
teste("sucesso", { op: 0x02, ok: true, codigo: 1, motivo: null }, A.lerRespostaControle(dv([0x80, 0x02, 0x01])));
teste("nao permitido diz o porque", "a esteira não está no modo que aceita comando do app",
  A.lerRespostaControle(dv([0x80, 0x02, 0x05])).motivo);
teste("valor invalido", "valor fora do que a esteira aceita",
  A.lerRespostaControle(dv([0x80, 0x02, 0x03])).motivo);
teste("codigo desconhecido ainda diz algo", "a esteira recusou",
  A.lerRespostaControle(dv([0x80, 0x02, 0x77])).motivo);
teste("pacote que nao e resposta", null, A.lerRespostaControle(dv([0x01, 0x02, 0x03])));

console.log("\n--- montar os comandos ---");
// 12,5 km/h = 1250 centesimos = 0x04E2 -> little endian E2 04
teste("12,5 km/h vira [0x02, 0xE2, 0x04]", [0x02, 0xe2, 0x04], Array.from(A.bytesVelocidade(12.5)));
teste("0 km/h", [0x02, 0x00, 0x00], Array.from(A.bytesVelocidade(0)));
teste("negativo nao vira comando negativo", [0x02, 0x00, 0x00], Array.from(A.bytesVelocidade(-5)));
// 7,5 % = 75 decimos = 0x4B
teste("inclinacao 7,5 %", [0x03, 0x4b, 0x00], Array.from(A.bytesInclinacao(7.5)));
// -2 % = -20 decimos = 0xFFEC
teste("inclinacao -2 %", [0x03, 0xec, 0xff], Array.from(A.bytesInclinacao(-2)));

console.log("\n--- e a volta: o que foi montado se le de novo igual ---");
[0.5, 3.2, 8, 12.5, 18.9].forEach((v) => {
  const b = A.bytesVelocidade(v);
  const lido = new DataView(new Uint8Array([b[1], b[2]]).buffer).getUint16(0, true) / 100;
  teste("ida e volta de " + v + " km/h", v, lido);
});

console.log("\n--- o limite que vale e o MENOR dos tres ---");
const faixa = { min: 0.5, max: 20, passo: 0.1 };
teste("dentro de tudo, passa", 10, A.velocidadePermitida(10, faixa, 16));
teste("o teto da pessoa corta antes do da maquina", 16, A.velocidadePermitida(19, faixa, 16));
teste("o da maquina corta quando e menor", 12, A.velocidadePermitida(19, { min: 0.5, max: 12, passo: 0.1 }, 16));
teste("abaixo do minimo sobe para o minimo", 0.5, A.velocidadePermitida(0.2, faixa, 16));
teste("sem teto escolhido, usa o padrao", A.ESTEIRA_TETO_PADRAO, A.velocidadePermitida(30, faixa, 0));
teste("sem faixa nenhuma ainda limita", A.ESTEIRA_TETO_PADRAO, A.velocidadePermitida(30, null, 0));

console.log("\n--- encaixa no degrau da maquina ---");
teste("8,37 numa esteira de passo 0,1 vira 8,4", 8.4, A.velocidadePermitida(8.37, faixa, 16));
teste("8,37 numa de passo 0,5 vira 8,5", 8.5, A.velocidadePermitida(8.37, { min: 0.5, max: 20, passo: 0.5 }, 16));
teste("numa de passo 1 vira 8", 8, A.velocidadePermitida(8.37, { min: 1, max: 20, passo: 1 }, 16));

// ---------------------------------------------------------------------------
// A CONVERSA COM A ESTEIRA
//
// Os bytes acima já estão provados. O que sobra de risco é a coreografia:
// pedir controle antes de comandar, casar cada resposta com a ordem certa, e
// não deixar a tela presa quando a esteira simplesmente ignora o comando.
//
// Não dá para pôr uma esteira na frente de um teste automatizado, então aqui
// vai uma de mentira — o mesmo molde que o projeto usa para falar com o
// Jarvis sem microfone.
function esteiraFalsa(opc) {
  const o = opc || {};
  const ouvintes = {};
  const caract = (uuid, valor) => ({
    uuid: uuid,
    _valor: valor,
    readValue() { return Promise.resolve(this._valor); },
    startNotifications() { return Promise.resolve(this); },
    addEventListener(nome, fn) { (ouvintes[uuid] = ouvintes[uuid] || []).push(fn); },
    removeEventListener() {},
    writeValueWithResponse(bytes) {
      escritas.push(Array.from(bytes));
      if (o.mudo) return Promise.resolve();         // a esteira que nunca responde
      const op = bytes[0];
      const res = o.recusa ? o.recusa : 0x01;
      setTimeout(() => responder(op, res), 1);
      return Promise.resolve();
    },
  });
  const escritas = [];
  const dvDe = (arr) => new DataView(new Uint8Array(arr).buffer);
  const controle = caract(0x2ad9, null);
  const dados = caract(0x2acd, null);
  function responder(op, res) {
    (ouvintes[0x2ad9] || []).forEach((fn) => fn({ target: { value: dvDe([0x80, op, res]) } }));
  }
  function notificar(bytes) {
    (ouvintes[0x2acd] || []).forEach((fn) => fn({ target: { value: dvDe(bytes) } }));
  }
  const servico = {
    getCharacteristic(uuid) {
      if (uuid === 0x2acd) return Promise.resolve(dados);
      if (uuid === 0x2ad4) return o.semFaixa ? Promise.reject(new Error("nao tem")) : Promise.resolve(caract(0x2ad4, dvDe([50, 0, 208, 7, 10, 0])));
      if (uuid === 0x2ad5) return Promise.reject(new Error("nao tem"));
      if (uuid === 0x2ad9) return o.semControle ? Promise.reject(new Error("nao tem")) : Promise.resolve(controle);
      return Promise.reject(new Error("nao tem"));
    },
  };
  const dev = {
    name: o.nome || "Esteira Falsa",
    gatt: { connected: true, connect: () => Promise.resolve({ getPrimaryService: () => Promise.resolve(servico) }), disconnect() { this.connected = false; } },
    addEventListener() {},
  };
  return { dev: dev, escritas: escritas, notificar: notificar, responder: responder };
}

async function conversa() {
  console.log("\n--- a conversa com a esteira ---");
  const falsa = esteiraFalsa();
  porNavigator({ requestDevice: () => Promise.resolve(falsa.dev) });

  const lidos = [];
  const estados = [];
  const e = criarEsteira({ aoDado: (d) => lidos.push(d), aoEstado: (s) => estados.push(s) });

  const info = await e.procurar();
  teste("conectou e leu o nome", "Esteira Falsa", info.nome);
  teste("leu a faixa de velocidade da maquina", { min: 0.5, max: 20, passo: 0.1 }, info.faixaVel);
  teste("e sabe que da para comandar", true, info.podeComandar);
  teste("avisou os estados na ordem", ["procurando", "ligado"], estados);

  falsa.notificar([0, 0, 0xb6, 0x04]);   // 12,06 km/h
  teste("a notificacao da esteira chega lida", 12.06, lidos.length ? lidos[0].vel : null);

  teste("antes de pedir controle, nao comanda", false, e.comanda());
  await e.pedirControle();
  teste("depois de pedir, comanda", true, e.comanda());
  teste("e a primeira ordem foi pedir controle", [0x00], falsa.escritas[0]);

  const v = await e.definirVelocidade(12.5, 16);
  teste("mandou 12,5 km/h", 12.5, v);
  teste("nos bytes certos", [0x02, 0xe2, 0x04], falsa.escritas[1]);

  const cortada = await e.definirVelocidade(30, 14);
  teste("o teto da pessoa corta a ordem ANTES de sair", 14, cortada);
  teste("e e 14 que vai nos bytes", [0x02, 0x78, 0x05], falsa.escritas[2]);

  await e.parar();
  teste("parar manda o 0x08 com o parametro de parar", [0x08, 0x01], falsa.escritas[3]);

  // --- a esteira que recusa ---
  const recusa = esteiraFalsa({ recusa: 0x05 });
  porNavigator({ requestDevice: () => Promise.resolve(recusa.dev) });
  const e2 = criarEsteira({});
  await e2.procurar();
  let erro = null;
  try { await e2.pedirControle(); } catch (x) { erro = x.message; }
  teste("recusa vira mensagem util", "a esteira não está no modo que aceita comando do app", erro);

  // --- a esteira que ignora o comando ---
  const muda = esteiraFalsa({ mudo: true });
  porNavigator({ requestDevice: () => Promise.resolve(muda.dev) });
  const e3 = criarEsteira({});
  await e3.procurar();
  const t0 = Date.now();
  let erro3 = null;
  try { await e3.pedirControle(); } catch (x) { erro3 = x.message; }
  teste("esteira muda nao deixa a tela presa", "a esteira não respondeu", erro3);
  teste("e desiste em menos de 6 s", true, Date.now() - t0 < 6000);

  // --- a esteira que so conta, sem aceitar comando ---
  const soLe = esteiraFalsa({ semControle: true });
  porNavigator({ requestDevice: () => Promise.resolve(soLe.dev) });
  const e4 = criarEsteira({});
  const info4 = await e4.procurar();
  teste("esteira que so conta ainda conecta", true, e4.ligada());
  teste("e diz que nao comanda", false, info4.podeComandar);
  let erro4 = null;
  try { await e4.definirVelocidade(10, 16); } catch (x) { erro4 = x.message; }
  teste("comandar ali da erro claro", "sem controle da esteira", erro4);
}

conversa().then(() => {
  console.log("\n" + ok + " passou / " + mal + " falhou");
  process.exit(mal ? 1 : 0);
}).catch((e) => {
  console.log("  X    a conversa quebrou: " + e.message);
  console.log("\n" + ok + " passou / " + (mal + 1) + " falhou");
  process.exit(1);
});
