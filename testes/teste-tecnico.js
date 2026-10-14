// Testa o tecnico: ele precisa reconhecer amplitude melhorando, caindo e
// repeticao rapida demais — e, principalmente, precisa saber ficar calado.
const fs = require("fs");
const PASTA = __dirname + "/";

// pega o cerebro direto do app, para testar o que esta publicado
const html = require("./app").lerApp();
const ini = html.indexOf("// ---------------- JARVIS EYES SCAN");
const fim = html.indexOf("// ---------------- JARVIS: O ASSISTENTE DE VOZ");
let src = html.slice(ini, fim).replace(/\r\n/g, "\n");
src = src.replace(/let eyesDetector[\s\S]*?^}/m, "");
src = src.replace(/const EYES_LIB[\s\S]*?pose_landmarker_lite\.task";/, "");
eval(src + "\nglobalThis.API = { criarContador, criarTecnico, FRASES_TECNICO };");
const A = globalThis.API;

// ---- corpo falso, com o joelho no angulo pedido ----
function corpo(joelho) {
  const a = ((180 - joelho) * Math.PI) / 180;
  const l = [];
  for (let i = 0; i < 33; i++) l[i] = { x: 0.5, y: 0.5, visibility: 0.9 };
  l[25] = { x: 0.5, y: 0.6, visibility: 0.9 };
  l[23] = { x: 0.5, y: 0.4, visibility: 0.9 };
  l[27] = { x: 0.5 + Math.sin(a) * 0.2, y: 0.6 + Math.cos(a) * 0.2, visibility: 0.9 };
  l[26] = l[25]; l[24] = l[23]; l[28] = l[27];
  l[13] = { x: 0.3, y: 0.45, visibility: 0.9 };
  l[11] = { x: 0.3, y: 0.3, visibility: 0.9 };
  l[15] = { x: 0.3, y: 0.6, visibility: 0.9 };
  l[14] = l[13]; l[12] = l[11]; l[16] = l[15];
  return l;
}

// Executa uma serie em que cada repeticao tem a sua propria amplitude e duracao
function serie(reps, alvo) {
  const falas = [];
  const tec = A.criarTecnico();
  const cont = A.criarContador({
    preferidos: ["joelho-e", "joelho-d"],
    aoContar: (n, q) => {
      const f = tec.comentar(n, q, alvo);
      falas.push({ n: n, q: q, frase: f });
    },
  });
  let t = 0;
  const passo = 1000 / 30;
  for (let i = 0; i < 60; i++) { cont.processar(corpo(172), t); t += passo; }   // parado
  reps.forEach((r) => {
    const quadros = Math.round(r.ms / passo);
    const meio = (170 + (170 - r.amp)) / 2;
    for (let i = 0; i < quadros; i++) {
      const fase = (i / quadros) * 2 * Math.PI;
      cont.processar(corpo(meio - (r.amp / 2) * Math.cos(fase)), t);
      t += passo;
    }
  });
  for (let i = 0; i < 45; i++) { cont.processar(corpo(172), t); t += passo; }
  return falas;
}

function mostrar(titulo, falas) {
  console.log("\n--- " + titulo + " ---");
  falas.forEach((f) => {
    const q = f.q || {};
    const marcas = [q.melhor ? "melhor" : "", q.caindo ? "caindo" : "", q.rapida ? "rapida" : "", q.constante ? "constante" : ""].filter(Boolean).join(",");
    console.log("  " + String(f.n).padStart(2) + "  amp=" + String(q.amplitude || "-").padStart(3) +
      " dur=" + String(q.duracao || "-").padStart(4) + "  [" + marcas.padEnd(18) + "]  " + (f.frase || ""));
  });
  return falas;
}

let ok = 0, mal = 0;
const confere = (nome, cond) => { if (cond) { ok++; } else { mal++; console.log("  X  " + nome); } };

// 1. amplitude crescendo: tem de elogiar em algum momento
const a = mostrar("amplitude crescendo", serie(
  [{ amp: 60, ms: 2000 }, { amp: 66, ms: 2000 }, { amp: 72, ms: 2000 }, { amp: 78, ms: 2000 },
   { amp: 84, ms: 2000 }, { amp: 90, ms: 2000 }, { amp: 96, ms: 2000 }, { amp: 100, ms: 2000 }], 12));
confere("elogiou a amplitude", a.some((f) => /completa|melhor|Assim mesmo|melhor executada/i.test(f.frase || "")));

// 2. amplitude caindo (cansaco): tem de corrigir
const b = mostrar("amplitude caindo", serie(
  [{ amp: 95, ms: 2000 }, { amp: 94, ms: 2000 }, { amp: 92, ms: 2000 }, { amp: 90, ms: 2000 },
   { amp: 62, ms: 2000 }, { amp: 55, ms: 2000 }, { amp: 50, ms: 2000 }, { amp: 48, ms: 2000 }], 12));
confere("mandou abrir o movimento", b.some((f) => /desce|amplitude|completa|encurtando/i.test(f.frase || "")));

// 3. repeticao rapida demais: tem de pedir controle
const c = mostrar("acelerando no fim", serie(
  [{ amp: 90, ms: 2400 }, { amp: 90, ms: 2400 }, { amp: 90, ms: 2400 }, { amp: 90, ms: 2300 },
   { amp: 88, ms: 1100 }, { amp: 88, ms: 1000 }, { amp: 88, ms: 1000 }, { amp: 88, ms: 1000 }], 12));
confere("pediu controle no ritmo", c.some((f) => /controla|devagar|segura a volta/i.test(f.frase || "")));

// 4. nao pode tagarelar
const d = mostrar("serie constante de 12", serie(
  Array.from({ length: 12 }, () => ({ amp: 90, ms: 2000 })), 12));
const comFrase = d.filter((f) => f.frase).length;
confere("falou pouco (<=5 em 12)", comFrase <= 5);
console.log("  comentarios em 12 repeticoes: " + comFrase);
confere("avisou a ultima", d.some((f) => /ltima/i.test(f.frase || "")));
confere("nao comentou duas seguidas", !d.some((f, i) => i > 0 && f.frase && d[i - 1].frase && !/ltima/i.test(f.frase)));

console.log("\n" + ok + " passou / " + mal + " falhou");
process.exit(mal ? 1 : 0);
