// Gera as falas do Monster, Run! com uma IA de voz que tem emoção, e grava cada
// uma em vozes/<arquivo>.mp3. No fim refaz o vozes/indice.json, que é como o
// app sabe quais falas têm gravação. Precisa de Node 18 ou mais novo.
//
// OpenAI (gpt-4o-mini-tts: barato, segue a instrução de emoção):
//   OPENAI_API_KEY=sk-... node vozes/gerar-vozes.js
// ElevenLabs (eleven_v3: o mais expressivo; escolha uma voz feminina e uma masculina):
//   ELEVENLABS_API_KEY=... VOZ_F=<id da voz> VOZ_M=<id da voz> node vozes/gerar-vozes.js
//
// Opções:
//   --so=fuga-do-marombeiro   só as falas de uma história (bom para testar)
//   --limite=10               no máximo N falas nesta rodada
//   --refazer                 grava de novo mesmo o que já existe
//   --indice                  não gera nada, só refaz o indice.json
// No Windows (PowerShell):  $env:OPENAI_API_KEY="sk-..."; node vozes/gerar-vozes.js
const fs = require("fs");
const path = require("path");
const AQUI = __dirname;
const arg = (n) => { const a = process.argv.find((x) => x.startsWith("--" + n)); return a ? (a.split("=")[1] || true) : null; };
const roteiro = JSON.parse(fs.readFileSync(path.join(AQUI, "roteiro.json"), "utf8"));
const arquivo = (l) => path.join(AQUI, l.id + ".mp3");

function refazerIndice() {
  const ids = roteiro.filter((l) => fs.existsSync(arquivo(l)) && fs.statSync(arquivo(l)).size > 1000).map((l) => l.id);
  fs.writeFileSync(path.join(AQUI, "indice.json"), JSON.stringify({ ids: ids }) + "\n");
  console.log("indice.json: " + ids.length + " de " + roteiro.length + " falas gravadas");
}
if (arg("indice")) { refazerIndice(); process.exit(0); }

const OPENAI = process.env.OPENAI_API_KEY, ELEVEN = process.env.ELEVENLABS_API_KEY;
if (!OPENAI && !ELEVEN) {
  console.error("Falta a chave: defina OPENAI_API_KEY ou ELEVENLABS_API_KEY (veja vozes/LEIA-ME.md).");
  process.exit(1);
}
if (ELEVEN && !OPENAI && (!process.env.VOZ_F || !process.env.VOZ_M)) {
  console.error("No ElevenLabs, defina também VOZ_F e VOZ_M (o id de uma voz feminina e de uma masculina, na Voice Library).");
  process.exit(1);
}

async function gerarOpenAI(l) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: "Bearer " + OPENAI, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.MODELO || "gpt-4o-mini-tts",
      voice: l.genero === "f" ? process.env.VOZ_F || "coral" : process.env.VOZ_M || "ash",
      input: l.texto,
      instructions: "Fale em português do Brasil, com sotaque brasileiro natural, como narrador de uma aventura de corrida. Emoção: " + l.direcao + ".",
      response_format: "mp3",
    }),
  });
  if (!r.ok) throw new Error("OpenAI " + r.status + ": " + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}
async function gerarEleven(l) {
  const voz = l.genero === "f" ? process.env.VOZ_F : process.env.VOZ_M;
  const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voz + "?output_format=mp3_44100_64", {
    method: "POST",
    headers: { "xi-api-key": ELEVEN, "Content-Type": "application/json" },
    body: JSON.stringify({ text: (l.tag ? l.tag + " " : "") + l.texto, model_id: process.env.MODELO || "eleven_v3", language_code: "pt" }),
  });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}
const gerar = OPENAI ? gerarOpenAI : gerarEleven;

(async () => {
  let fila = roteiro.filter((l) => !arg("so") || l.missoes.indexOf(arg("so")) >= 0);
  if (!arg("refazer")) fila = fila.filter((l) => !fs.existsSync(arquivo(l)));
  if (arg("limite")) fila = fila.slice(0, +arg("limite"));
  console.log((OPENAI ? "OpenAI" : "ElevenLabs") + ": " + fila.length + " falas para gerar");
  let feitas = 0, erros = 0;
  const trabalhador = async () => {
    while (fila.length) {
      const l = fila.shift();
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
          fs.writeFileSync(arquivo(l), await gerar(l));
          feitas++;
          console.log("  ok  " + l.id + "  [" + l.emocao + "]  " + l.texto.slice(0, 60));
          break;
        } catch (e) {
          if (tentativa === 3) { erros++; console.log("  X   " + l.id + "  " + e.message); }
          else await new Promise((r) => setTimeout(r, 2000 * tentativa));
        }
      }
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
  console.log(feitas + " geradas, " + erros + " com erro");
  refazerIndice();
  console.log("Agora publique a pasta vozes/ (git push ou envio pelo site do GitHub).");
})();
