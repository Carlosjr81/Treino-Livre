// "O que este aparelho suporta".
//
// Este teste existe por um motivo prático: a pergunta "vale a pena transformar
// o app num app nativo?" depende de quais recursos sobrevivem num WebView — e
// não dá para ter na mão um Chrome, um WebView, um iPhone e o navegador do
// Instagram ao mesmo tempo. Aqui os quatro são simulados.
const html = require("./app").lerApp();

function pedaco(de, ate) {
  const i = html.indexOf(de), f = html.indexOf(ate, i);
  if (i < 0 || f < 0) { console.error("nao achei: " + de); process.exit(1); }
  return html.slice(i, f);
}
eval(
  pedaco("// ---------------- O QUE ESTE APARELHO SUPORTA", "// ---------------- FIM DOS RECURSOS DO APARELHO") +
  "\nglobalThis.R = { recursosDoAparelho, leituraRecursos };"
);
const R = globalThis.R;

let ok = 0, mal = 0;
function teste(nome, esperado, obtido) {
  const bate = JSON.stringify(esperado) === JSON.stringify(obtido);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(52) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(52) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado)); }
}

// Um armazenamento de mentira: `falha: true` simula janela anônima e navegador
// embutido, em que o objeto existe e a escrita é recusada.
const guarda = (falha) => ({
  setItem() { if (falha) throw new Error("recusado"); },
  removeItem() {},
});

// Cada ambiente é um objeto; o que não está nele, não existe.
function ambiente(o) {
  const x = o || {};
  return {
    localStorage: guarda(x.gravarFalha),
    SpeechRecognition: x.ouvir ? function () {} : undefined,
    speechSynthesis: x.falar ? {} : undefined,
    DeviceMotionEvent: x.movimento ? function () {} : undefined,
    Notification: x.aviso ? function () {} : undefined,
    VideoEncoder: x.video ? function () {} : undefined,
    matchMedia: () => ({ matches: !!x.instalado }),
    navigator: {
      userAgent: x.ua || "Mozilla/5.0 (Linux; Android 14)",
      mediaDevices: x.camera ? { getUserMedia() {} } : undefined,
      bluetooth: x.bluetooth ? {} : undefined,
      geolocation: x.gps ? {} : undefined,
      wakeLock: x.tela ? {} : undefined,
      serviceWorker: x.offline ? {} : undefined,
    },
  };
}

// Os quatro ambientes que importam para a decisão.
const CHROME_ANDROID = ambiente({
  ouvir: 1, falar: 1, camera: 1, bluetooth: 1, gps: 1, movimento: 1,
  tela: 1, aviso: 1, offline: 1, video: 1,
  ua: "Mozilla/5.0 (Linux; Android 14) Chrome/130",
});
// O WebView não traz o serviço de reconhecimento de fala (ele é do navegador,
// não do Chromium) e o Web Bluetooth não é garantido.
const WEBVIEW = ambiente({
  falar: 1, camera: 1, gps: 1, movimento: 1, tela: 1, offline: 1,
  ua: "Mozilla/5.0 (Linux; Android 14; wv) Chrome/130",
});
const IPHONE = ambiente({
  ouvir: 1, falar: 1, camera: 1, gps: 1, movimento: 1, aviso: 1, offline: 1,
  ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Version/18.0 Safari",
});
const INSTAGRAM = ambiente({
  gravarFalha: 1, falar: 1, camera: 1, gps: 1, offline: 1,
  ua: "Mozilla/5.0 (Linux; Android 14) Instagram 300.0",
});

const achar = (r, id) => r.itens.find((i) => i.id === id);

console.log("--- a lista sai inteira, com o que se perde ---");
const c = R.recursosDoAparelho(CHROME_ANDROID);
teste("onze recursos", 11, c.itens.length);
teste("todos tem o que se perde escrito", true, c.itens.every((i) => i.perde && i.perde.length > 25));
teste("nenhum nome cita o nome da API", true, c.itens.every((i) => !/API|Web ?Bluetooth|getUserMedia|WakeLock/i.test(i.nome)));

console.log("\n--- Chrome do Android: tudo ---");
teste("nada faltando", 0, c.faltando);
teste("nada grave", false, c.grave);
teste("e a leitura diz isso", true, /Tudo o que o app faz funciona/.test(R.leituraRecursos(c).texto));

console.log("\n--- WebView: o que o app nativo perderia ---");
const w = R.recursosDoAparelho(WEBVIEW);
teste("sabe que e um WebView", true, w.webview);
teste("o Jarvis NAO ouve", false, achar(w, "ouvir").ok);
teste("a cinta e a esteira NAO conectam", false, achar(w, "bluetooth").ok);
teste("mas a camera funciona", true, achar(w, "camera").ok);
teste("e gravar funciona", true, achar(w, "gravar").ok);
teste("o aviso com o app fechado some", false, achar(w, "aviso").ok);
teste("quatro recursos a menos que o Chrome", 4, w.faltando - c.faltando);

console.log("\n--- iPhone: o Bluetooth nao existe ---");
const i = R.recursosDoAparelho(IPHONE);
teste("sem cinta nem esteira", false, achar(i, "bluetooth").ok);
teste("mas o Jarvis ouve", true, achar(i, "ouvir").ok);
teste("e nao e WebView", false, i.webview);

console.log("\n--- navegador do Instagram: o caso grave ---");
const g = R.recursosDoAparelho(INSTAGRAM);
teste("gravar FALHA", false, achar(g, "gravar").ok);
teste("e isso e marcado como grave", true, g.grave);
teste("reconhece o navegador embutido", true, g.embutido);
teste("a leitura manda sair de la", true, /não salva nada/.test(R.leituraRecursos(g).texto));
teste("e o grave vem antes do embutido na leitura", "var(--perigo)", R.leituraRecursos(g).cor);

console.log("\n--- gravar nao se descobre olhando, so tentando ---");
// O objeto existe e a escrita e recusada: e exatamente o caso que derruba o app
const soParece = ambiente({ gravarFalha: 1, ouvir: 1, falar: 1, camera: 1, bluetooth: 1, gps: 1, movimento: 1, tela: 1, aviso: 1, offline: 1, video: 1 });
const s = R.recursosDoAparelho(soParece);
teste("localStorage presente mas recusando e detectado", false, achar(s, "gravar").ok);
teste("e e o unico faltando", 1, s.faltando);
teste("ainda assim o veredito e grave", true, s.grave);

console.log("\n--- a leitura muda com a quantidade ---");
teste("um ou dois faltando: quase tudo funciona", true, /Quase tudo funciona/.test(R.leituraRecursos({ faltando: 2 }).texto));
teste("muitos faltando: avisa sem assustar", true, /registro do treino continua/.test(R.leituraRecursos({ faltando: 6 }).texto));

console.log("\n--- instalado na tela de inicio ---");
teste("detecta standalone", true, R.recursosDoAparelho(ambiente({ instalado: 1 })).instalado);
teste("e sabe quando nao esta", false, c.instalado);

console.log("\n--- ambiente vazio nao quebra ---");
const vazio = R.recursosDoAparelho({});
teste("devolve a lista mesmo sem nada", 11, vazio.itens.length);
teste("com tudo faltando", 11, vazio.faltando);
teste("sem user agent nao e webview", false, vazio.webview);

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
