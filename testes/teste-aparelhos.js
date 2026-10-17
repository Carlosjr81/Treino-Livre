// Os outros aparelhos do FTMS: bicicleta, elíptico, escada (as duas) e remo.
//
// O mesmo cuidado da esteira (ver teste-esteira.js): são bits, e ler um campo
// na ordem errada não dá erro — dá número errado com cara de verdade. Cada
// pacote aqui é montado byte a byte a partir da especificação (Fitness Machine
// Service 1.0, tabelas 4.6 a 4.9), e a conta é conferida à mão.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
function porNavigator(bt) {
  Object.defineProperty(globalThis, "navigator", { value: { bluetooth: bt }, configurable: true, writable: true });
}
porNavigator({ requestDevice: () => Promise.reject(new Error("ninguem pediu")) });
eval(
  pedaco("// ---------------- ESTEIRA POR BLUETOOTH (FTMS)", "// ---------------- FIM DO MOTOR DA ESTEIRA") +
  "\nglobalThis.A = { lerDadosEsteira, lerDadosBike, lerDadosEliptico, lerDadosEscada, lerDadosDegrau, lerDadosRemo," +
  " criarEsteira, aparelhoDoPerfil, nomeAparelho };"
);
const A = globalThis.A;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(56) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(56) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}
const dv = (bytes) => new DataView(new Uint8Array(bytes).buffer);
const u16 = (n) => [n & 0xff, (n >> 8) & 0xff];
const s16 = (n) => u16(n < 0 ? n + 0x10000 : n);
const u24 = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];

console.log("--- 'nao disponivel' nao e numero ---");
// esteira: vel + energia (bit 7) com os três campos marcados como ausentes
teste("esteira sem contador de kcal: nada de 65535", { vel: 6 },
  A.lerDadosEsteira(dv([].concat(u16(0x0080), u16(600), u16(0xffff), u16(0xffff), [0xff]))));
teste("esteira com kcal: entra", { vel: 6, kcal: 120, kcalHora: 400, kcalMin: 7 },
  A.lerDadosEsteira(dv([].concat(u16(0x0080), u16(600), u16(120), u16(400), [7]))));

console.log("\n--- bicicleta (0x2AD2) ---");
// flags: cadência (2) + resistência (5) + potência (6) + energia (8) + FC (9) + tempo (11)
//        = 0b0000101101100100 = 0x0B64; velocidade presente (bit 0 em 0)
teste("todos os campos na ordem",
  { vel: 28.5, cad: 85, nivel: 8, watts: 180, kcal: 95, kcalHora: 650, kcalMin: 10, bpm: 141, segundos: 900 },
  A.lerDadosBike(dv([].concat(u16(0x0b64), u16(2850), u16(170), s16(8), s16(180), u16(95), u16(650), [10], [141], u16(900)))));
teste("cadencia vem em meias rotacoes: 171 = 85,5 rpm", { cad: 85.5 },
  A.lerDadosBike(dv([].concat(u16(0x0005), u16(171)))));
teste("nivel em decimos (80) vira 8", { vel: 0, nivel: 8 },
  A.lerDadosBike(dv([].concat(u16(0x0020), u16(0), s16(80)))));
teste("distancia (bit 4) depois da cadencia media (bit 3)", { cad: 90, cadMedia: 88, metros: 5230 },
  A.lerDadosBike(dv([].concat(u16(0x001d), u16(180), u16(176), u24(5230)))));

console.log("\n--- eliptico (0x2ACE, flags de 3 bytes) ---");
// flags: distância (2) + passos/min (3) + resistência (7) + potência (8) + tempo (13)
//        = bits 2,3,7,8,13 = 0x00218C; velocidade presente
const fe = 0x00218c;
teste("os 3 bytes de flags e os campos na ordem",
  { vel: 7.2, metros: 1800, cad: 130, cadMedia: 125, nivel: 9, watts: 150, segundos: 1500 },
  A.lerDadosEliptico(dv([fe & 0xff, (fe >> 8) & 0xff, fe >> 16].concat(u16(720), u24(1800), u16(130), u16(125), s16(9), s16(150), u16(1500)))));
// bit 4 (passadas) sem uso, mas o ponteiro tem de andar: senão a subida vira passada
teste("as passadas (bit 4) nao empurram a subida", { subida: 12 },
  A.lerDadosEliptico(dv([0x31, 0x00, 0x00].concat(u16(77), u16(12), u16(3)))));

console.log("\n--- escada / stepmill (0x2AD0) ---");
// flags: andares presentes (bit 0 em 0) + degraus/min (1) + subida (3) + tempo (8) = 0x010A
teste("andares, degraus por minuto, subida e tempo", { andares: 42, cad: 64, subida: 126, segundos: 600 },
  A.lerDadosEscada(dv([].concat(u16(0x010a), u16(42), u16(64), u16(126), u16(600)))));
teste("degrau (0x2ACF): andares e passos juntos no bit 0", { andares: 10, passos: 640, cad: 70 },
  A.lerDadosDegrau(dv([].concat(u16(0x0002), u16(10), u16(640), u16(70)))));

console.log("\n--- remo (0x2AD1) ---");
// bit 0 em 0: remadas/min (meias) + contagem; distância (2) + ritmo (3) + potência (5) + tempo (11)
// = 0x082C
teste("remadas, distancia, ritmo por 500 m e potencia", { cad: 24, passos: 310, metros: 2600, ritmo500: 118, watts: 210, segundos: 620 },
  A.lerDadosRemo(dv([].concat(u16(0x082c), [48], u16(310), u24(2600), u16(118), s16(210), u16(620)))));

console.log("\n--- o perfil do exercicio diz o aparelho ---");
teste("bicicleta vertical -> bike", "bike", A.aparelhoDoPerfil("bike"));
teste("eliptico -> eliptico", "eliptico", A.aparelhoDoPerfil("eliptico"));
teste("escada -> escada", "escada", A.aparelhoDoPerfil("escada"));
teste("remo -> remo", "remo", A.aparelhoDoPerfil("remo"));
teste("caminhada -> esteira", "esteira", A.aparelhoDoPerfil("caminhada"));
teste("corda nao tem aparelho", null, A.aparelhoDoPerfil("corda"));
teste("natacao nao tem aparelho", null, A.aparelhoDoPerfil("natacao"));

// um aparelho de mentira que só tem a característica de dados do tipo dado
function aparelhoFalso(uuid) {
  const ouvintes = {};
  const caract = (u) => ({ startNotifications() { return Promise.resolve(this); },
    addEventListener(n, fn) { (ouvintes[u] = ouvintes[u] || []).push(fn); }, removeEventListener() {}, readValue() { return Promise.reject(new Error("x")); } });
  const servico = { getCharacteristic: (u) => (u === uuid ? Promise.resolve(caract(u)) : Promise.reject(new Error("nao tem"))) };
  let esqueceu = false;
  const dev = { name: "Aparelho Falso", forget() { esqueceu = true; }, addEventListener() {},
    gatt: { connected: true, connect: () => Promise.resolve({ getPrimaryService: (s) => (s === 0x1826 ? Promise.resolve(servico) : Promise.reject(new Error("nao tem"))) }), disconnect() { this.connected = false; } } };
  const notificar = (bytes) => (ouvintes[uuid] || []).forEach((fn) => fn({ target: { value: dv(bytes) } }));
  return { dev, notificar, esqueceu: () => esqueceu };
}

(async () => {
  console.log("\n--- a conexao escolhe o leitor do aparelho ---");
  {
    const f = aparelhoFalso(0x2ad2);
    porNavigator({ requestDevice: () => Promise.resolve(f.dev) });
    const chegou = [];
    const e = A.criarEsteira({ aoDado: (d) => chegou.push(d) });
    const info = await e.procurar("bike");
    teste("bicicleta conectada se apresenta como bike", "bike", info.tipo);
    teste("bicicleta nunca recebe comando", false, info.podeComandar);
    f.notificar([].concat(u16(0x0044), u16(2500), u16(160), s16(150)));
    teste("o pacote da bicicleta e lido pelo leitor da bicicleta", [{ vel: 25, cad: 80, watts: 150 }], chegou);
  }
  {
    const f = aparelhoFalso(0x2acf);
    porNavigator({ requestDevice: () => Promise.resolve(f.dev) });
    const info = await A.criarEsteira({}).procurar("escada");
    teste("escada aceita o degrau (0x2ACF) tambem", "degrau", info.tipo);
  }
  {
    const f = aparelhoFalso(0x2ad2);
    porNavigator({ requestDevice: () => Promise.resolve(f.dev) });
    let erro = null;
    try { await A.criarEsteira({}).procurar("eliptico"); } catch (x) { erro = x.message; }
    teste("bicicleta escolhida no lugar do eliptico: recusa com o nome", "este aparelho não é um elíptico", erro);
    teste("e devolve a permissao do aparelho errado", true, f.esqueceu());
  }
  {
    // quem chama sem dizer o aparelho (intervalado, monster run) continua na esteira
    const f = aparelhoFalso(0x2acd);
    porNavigator({ requestDevice: () => Promise.resolve(f.dev) });
    const info = await A.criarEsteira({}).procurar();
    teste("sem pedido, o padrao e a esteira", "esteira", info.tipo);
  }
  {
    // pacote torto (curto, cortado no meio) não pode derrubar nada
    const f = aparelhoFalso(0x2ad2);
    porNavigator({ requestDevice: () => Promise.resolve(f.dev) });
    const chegou = [];
    const e = A.criarEsteira({ aoDado: (d) => chegou.push(d) });
    await e.procurar("bike");
    let caiu = false;
    try { f.notificar([0x44]); f.notificar([].concat(u16(0x0044), [0x10])); } catch (x) { caiu = true; }
    teste("pacote curto ou cortado nao derruba", false, caiu);
  }

  console.log("\n" + ok + " passou / " + mal + " falhou");
  process.exit(mal ? 1 : 0);
})();
