// O percurso na rua: distancia, tempo em movimento, parciais, subida e o
// filtro do GPS, com corridas simuladas em coordenadas de verdade.
const html = require("./app").lerApp();
const ini = html.indexOf("// ---------------- PERCURSO NA RUA (GPS)");
const fim = html.indexOf("// ---------------- FIM DAS CONTAS DO PERCURSO");
if (ini < 0 || fim < 0) { console.error("nao achei as contas do percurso no index.html"); process.exit(1); }
eval(html.slice(ini, fim).replace(/\r\n/g, "\n") +
  "\nglobalThis.A = { distanciaM, aceitarPonto, tempoEntre, resumoRota, ritmoRecente, fmtTempoRota, enderecoDe, compactarRota, expandirRota, trechosRota, MODALIDADES_ROTA };");

let ok = 0, mal = 0;
function teste(nome, esperado, obtido, tol) {
  const bate = tol !== undefined ? Math.abs(obtido - esperado) <= tol : JSON.stringify(obtido) === JSON.stringify(esperado);
  if (bate) { ok++; console.log("  ok   " + nome.padEnd(52) + JSON.stringify(obtido)); }
  else { mal++; console.log("  X    " + nome.padEnd(52) + JSON.stringify(obtido) + ", esperava " + JSON.stringify(esperado) + (tol !== undefined ? " ±" + tol : "")); }
}

// ---- GPS de mentira, sempre o mesmo sorteio ----
let semente = 7;
const sorte = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
const LAT0 = -23.5614, LNG0 = -46.6559;                 // Avenida Paulista
const M_LAT = 111320, M_LNG = 111320 * Math.cos(LAT0 * Math.PI / 180);
const ponto = (lesteM, norteM, t, o) => {
  const ruido = (o && o.ruido) || 3;
  return {
    lat: LAT0 + (norteM + (sorte() - 0.5) * 2 * ruido) / M_LAT,
    lng: LNG0 + (lesteM + (sorte() - 0.5) * 2 * ruido) / M_LNG,
    t: t, acc: (o && o.acc) || 8, alt: o && o.alt !== undefined ? o.alt : null,
  };
};
// O mesmo caminho do componente: filtro, trecho e reancoragem depois de 8 saltos
function gravar(leituras, velMax) {
  const lista = [];
  let seg = 0, saltos = 0;
  leituras.forEach((l) => {
    if (l.pausa) { seg++; return; }
    const p = Object.assign({ seg: seg }, l);
    const ult = lista.length && lista[lista.length - 1].seg === seg ? lista[lista.length - 1] : null;
    const v = A.aceitarPonto(ult, p, velMax || 30);
    if (v === "substitui") lista.pop();
    else if (v === "salto") { if (++saltos < 8) return; seg++; p.seg = seg; }
    else if (v !== "ok") return;
    saltos = 0;
    lista.push(p);
  });
  return lista;
}
// corrida em linha reta para o leste: kmh, segundos, uma leitura por segundo
function correr(kmh, seg, t0, x0, o) {
  const r = [];
  for (let s = 0; s < seg; s++) r.push(ponto(x0 + (kmh / 3.6) * s, 0, t0 + s * 1000, o));
  return r;
}

console.log("--- a conta da distancia ---");
teste("1000 m para o norte", 1000, A.distanciaM({ lat: LAT0, lng: LNG0 }, { lat: LAT0 + 1000 / M_LAT, lng: LNG0 }), 2);

console.log("--- corrida de 3 km a 10 km/h (6:00 /km) ---");
semente = 7;
const corrida = gravar(correr(10, 1080, 0, 0));
const r1 = A.resumoRota(corrida);
teste("distancia", 3, r1.km, 0.08);
teste("tempo em movimento (s)", 1080, r1.ms / 1000, 5);
teste("ritmo medio (min/km)", 6, r1.ritmo, 0.2);
teste("tres parciais", 3, r1.splits.length);
teste("cada parcial perto de 6:00", true, r1.splits.every((s) => Math.abs(s.ms / 1000 - 360) < 20));
teste("ritmo dos ultimos 30 s", 6, A.ritmoRecente(corrida), 0.4);

console.log("--- parado no semaforo nao anda nem conta o tempo todo ---");
semente = 7;
const semaforo = [];
for (let s = 0; s < 60; s++) semaforo.push(ponto(500, 0, 180000 + s * 1000, { ruido: 6, acc: 12 }));
const comSemaforo = gravar(correr(10, 180, 0, 0).concat(semaforo, correr(10, 180, 240000, 500)));
const r2 = A.resumoRota(comSemaforo);
teste("60 s parado somam no maximo 15 s", 375, r2.ms / 1000, 12);
teste("e quase nada de distancia", 1, r2.km, 0.04);

console.log("--- o GPS mentindo ---");
semente = 7;
const pulo = correr(10, 60, 0, 0);
pulo[30] = ponto(400, 300, pulo[30].t);          // um quarteirao de distancia, de repente
teste("salto de um quarteirao fica fora", 1, gravar(pulo).filter((p) => p.lat > LAT0 + 200 / M_LAT).length === 0 ? 1 : 0);
teste("e a distancia nao inventa o pulo", 167, A.resumoRota(gravar(pulo)).m, 15);
const ruim = correr(10, 60, 0, 0);
ruim[20].acc = 80;
teste("ponto com precisao de 80 m fica fora", true, gravar(ruim).every((p) => p.acc < 80));
// comeco ruim: o primeiro ponto estava 60 m fora, com precisao de 60 m
semente = 7;
const torto = correr(10, 120, 0, 0);
torto[0] = ponto(-60, 40, 0, { acc: 60 });
// o primeiro ponto bom toma o lugar do ruim, sem ligar os dois
teste("comeco impreciso nao inventa distancia", 0.33, A.resumoRota(gravar([Object.assign(torto[0], { acc: 30 })].concat(torto.slice(1)))).km, 0.04);

console.log("--- pausa e tela apagada ---");
semente = 7;
const pausado = gravar(correr(10, 120, 0, 0).concat([{ pausa: true }], correr(10, 120, 600000, 1000)));
const r3 = A.resumoRota(pausado);
teste("pausa de 8 min nao conta tempo", 240, r3.ms / 1000, 4);
teste("nem liga os trechos em linha reta na distancia", 0.667, r3.km, 0.03);
teste("dois trechos no mapa", 2, A.trechosRota(pausado).length);
semente = 7;
// 3 min sem GPS andando a 10 km/h: o ponto seguinte chega 500 m adiante
const apagou = gravar(correr(10, 120, 0, 0).concat(correr(10, 120, 120000 + 180000, 333 + 500)));
const r4 = A.resumoRota(apagou);
teste("os 3 minutos sem GPS contam (estava andando)", 420, r4.ms / 1000, 5);
teste("e ficam marcados como lacuna", 180, r4.lacunaMs / 1000, 2);

console.log("--- subida ---");
semente = 7;
const morro = correr(8, 300, 0, 0).map((p, i) => Object.assign(p, { alt: 800 + i * 0.1 + (sorte() - 0.5) * 3 }));
teste("subida de 30 m", 30, A.resumoRota(gravar(morro)).ganho, 5);
const plano = correr(8, 300, 0, 0).map((p) => Object.assign(p, { alt: 800 + (sorte() - 0.5) * 4 }));
teste("plano com altitude tremendo nao inventa morro", 0, A.resumoRota(gravar(plano)).ganho, 4);

console.log("--- endereco, guardar e formatar ---");
const nom = { name: "", address: { road: "Avenida Paulista", house_number: "1578", suburb: "Bela Vista", city: "São Paulo", state: "São Paulo" } };
const e = A.enderecoDe(nom);
teste("rua e bairro", "Avenida Paulista · Bela Vista", e.curto);
teste("regiao", "Bela Vista, São Paulo", e.regiao);
teste("cidade pequena (town) e bairro de outro nome", "Centro, Holambra",
  A.enderecoDe({ address: { neighbourhood: "Centro", town: "Holambra" } }).regiao);
const volta = A.expandirRota(A.compactarRota(corrida));
teste("guardar e ler devolve a mesma distancia", r1.m, A.resumoRota(volta).m, r1.m * 0.005);
teste("guardado e pequeno (menos de 40 KB por hora)", true, JSON.stringify(A.compactarRota(corrida)).length * (3600 / 1080) < 40000);
teste("tempo formatado", "1:02:05", A.fmtTempoRota(3725000));
teste("tempo curto", "6:00", A.fmtTempoRota(360000));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
