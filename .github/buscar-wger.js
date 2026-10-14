// TEMPORÁRIO: para cada exercício do catálogo sem figura, lista os nomes do
// wger (inglês) que mais se parecem, com o endereço da imagem principal.
// A escolha final é feita à mão: imagem errada ensina o movimento errado.
const fs = require("fs");

async function tudo(url) {
  const out = [];
  while (url) {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(url + " -> " + r.status);
    const j = await r.json();
    out.push(...j.results);
    url = j.next;
  }
  return out;
}

const palavras = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1);

(async () => {
  const h = fs.readFileSync("index.html", "utf8");
  const a = h.indexOf("const EXERCICIOS = [");
  const b = h.indexOf("\n];", a);
  const EX = eval(h.slice(a + "const EXERCICIOS = ".length, b + 2));
  const ini = h.indexOf("const IMAGENS_WGER = ");
  const IMG = JSON.parse(h.slice(ini + "const IMAGENS_WGER = ".length, h.indexOf(";\n", ini)));
  const faltam = EX.filter((e) => !IMG[e.id] && !e.func);

  const imagens = await tudo("https://wger.de/api/v2/exerciseimage/?limit=500");
  const nomes = await tudo("https://wger.de/api/v2/exercise-translation/?language=2&limit=500");
  const imgPor = {};
  imagens.forEach((i) => { if (!imgPor[i.exercise] || i.is_main) imgPor[i.exercise] = i.image; });
  const comImg = nomes.filter((n) => imgPor[n.exercise]);
  console.log("imagens:", imagens.length, "nomes:", nomes.length, "com imagem:", comImg.length, "faltam:", faltam.length);

  for (const e of faltam) {
    const alvo = new Set(palavras(e.en));
    const cands = comImg.map((n) => {
      const w = new Set(palavras(n.name));
      let comum = 0; alvo.forEach((x) => { if (w.has(x)) comum++; });
      return { n, nota: comum / Math.max(alvo.size, w.size) };
    }).filter((c) => c.nota > 0).sort((x, y) => y.nota - x.nota).slice(0, 6);
    console.log("\n### " + e.id + " | " + e.en);
    cands.forEach((c) => console.log("  " + c.nota.toFixed(2) + " | " + c.n.name + " | ex " + c.n.exercise + " | " + imgPor[c.n.exercise]));
  }
})().catch((e) => { console.error(e); process.exit(1); });
