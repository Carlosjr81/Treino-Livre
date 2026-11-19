// Grava a narração do Reels com a SUA voz clonada (ElevenLabs) e a do Jarvis,
// uma fala por arquivo: audio/<cena>-<n>.mp3. Depois, o gerar.js refaz o vídeo
// no ritmo dessas gravações e põe o áudio (sem música).
//
// ElevenLabs (a sua voz clonada, em Voices › a sua › copiar o id):
//   ELEVENLABS_API_KEY=... VOZ_DONO=<id da sua voz> VOZ_JARVIS=<id de uma voz masculina> node divulgacao/reels-ciencia/dublar.js
// OpenAI (só para testar o tempo, sem a sua voz):
//   OPENAI_API_KEY=sk-... node divulgacao/reels-ciencia/dublar.js
// No Windows (PowerShell): $env:ELEVENLABS_API_KEY="..."; $env:VOZ_DONO="..."; node divulgacao/reels-ciencia/dublar.js
//
// Só grava o que falta: apague o .mp3 de uma fala para gravar de novo.
// A sessão do Claude na nuvem não alcança esses serviços: rode no seu computador.
const fs = require("fs");
const path = require("path");
const R = require("./roteiro.js");
const ELEVEN = process.env.ELEVENLABS_API_KEY, OPENAI = process.env.OPENAI_API_KEY;
if (!ELEVEN && !OPENAI) { console.error("Defina ELEVENLABS_API_KEY (com VOZ_DONO e VOZ_JARVIS) ou OPENAI_API_KEY."); process.exit(1); }
if (ELEVEN && !process.env.VOZ_DONO) { console.error("Defina VOZ_DONO: o id da sua voz clonada no ElevenLabs."); process.exit(1); }
const PASTA = path.join(__dirname, "audio");
fs.mkdirSync(PASTA, { recursive: true });

// o jeito de cada fala: o dono animado e próximo; o Jarvis firme e curto
const DIRECAO = {
  dono: "Fale como um criador de conteúdo de academia no Instagram: animado, próximo, ritmo rápido, sorrindo na voz, sotaque brasileiro.",
  pessoa: "Fale como quem dá um comando ao assistente no meio da série, um pouco ofegante.",
  jarvis: "Fale como um assistente de inteligência artificial: calmo, seguro, preciso, levemente robótico.",
};

async function falaEleven(texto, voz, quem) {
  const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voz + "?output_format=mp3_44100_128", {
    method: "POST", headers: { "xi-api-key": ELEVEN, "content-type": "application/json" },
    body: JSON.stringify({ text: texto, model_id: process.env.MODELO || "eleven_multilingual_v2", language_code: "pt",
      voice_settings: quem === "jarvis" ? { stability: 0.75, similarity_boost: 0.8, style: 0.1 } : { stability: 0.38, similarity_boost: 0.9, style: 0.55, use_speaker_boost: true } }),
  });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}
async function falaOpenai(texto, quem) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { authorization: "Bearer " + OPENAI, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: quem === "jarvis" ? "onyx" : "ash", input: texto, instructions: DIRECAO[quem], response_format: "mp3" }),
  });
  if (!r.ok) throw new Error("OpenAI " + r.status + ": " + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}

(async () => {
  for (const c of R.cenas) {
    for (let i = 0; i < c.falas.length; i++) {
      const f = c.falas[i];
      const arq = path.join(PASTA, c.id + "-" + (i + 1) + ".mp3");
      if (fs.existsSync(arq)) continue;
      const texto = String(f.dito || f.texto).replace(/\*/g, "");
      const quem = f.quem === "jarvis" ? "jarvis" : f.fala === "pessoa" ? "pessoa" : "dono";
      const voz = quem === "jarvis" ? process.env.VOZ_JARVIS || process.env.VOZ_DONO : process.env.VOZ_DONO;
      const mp3 = ELEVEN ? await falaEleven(texto, voz, quem) : await falaOpenai(texto, quem);
      fs.writeFileSync(arq, mp3);
      console.log("ok " + path.basename(arq) + "  " + texto);
    }
  }
  console.log("\nPronto. Agora: node divulgacao/reels-ciencia/gerar.js");
})().catch((e) => { console.error(e.message); process.exit(1); });
