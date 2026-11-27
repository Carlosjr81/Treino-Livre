// Põe a narração no vídeo: com o seu clone de voz da ElevenLabs, ou com
// gravações suas (um arquivo por cena).
//
//   1) Ver o id do seu clone:
//        ELEVENLABS_API_KEY=sua_chave node divulgacao/video-prato-ia/narrar.js --vozes
//   2) Gerar e juntar:
//        ELEVENLABS_API_KEY=sua_chave VOZ=id_do_clone node divulgacao/video-prato-ia/narrar.js
//   Ou, com as suas gravações (gancho.mp3, problema.mp3, ... numa pasta):
//        node divulgacao/video-prato-ia/narrar.js --gravacoes pasta
//
// Precisa do ffmpeg e do video-mudo.mp4 (sai do gravar.js).
// Cada fala entra no começo da cena dela; a que passar do tempo da cena é
// acelerada um pouco (até 1,2×). A batida abaixa enquanto a voz fala.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const AQUI = __dirname;
const R = JSON.parse(fs.readFileSync(path.join(AQUI, "roteiro.json"), "utf8"));
const CHAVE = process.env.ELEVENLABS_API_KEY;
const args = process.argv.slice(2);
const pastaGravacoes = args.includes("--gravacoes") ? path.resolve(args[args.indexOf("--gravacoes") + 1]) : null;
const PASTA = path.join(AQUI, "falas");
fs.mkdirSync(PASTA, { recursive: true });

const duracao = (arq) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]).toString());

async function listarVozes() {
  const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": CHAVE } });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text()).slice(0, 200));
  const { voices } = await r.json();
  for (const v of voices) console.log((v.category === "cloned" ? "★ CLONE  " : "         ") + v.voice_id + "  " + v.name);
  console.log("\nUse o id marcado com ★ em VOZ=...");
}

async function gerarFala(cena, arq) {
  const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + process.env.VOZ + "?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": CHAVE, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: cena.fala,
      model_id: process.env.MODELO || "eleven_multilingual_v2",
      language_code: "pt",
      // Mais estilo e menos estabilidade: a fala sai com energia de vídeo.
      voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.55, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text()).slice(0, 200));
  fs.writeFileSync(arq, Buffer.from(await r.arrayBuffer()));
}

(async () => {
  if (args.includes("--vozes")) {
    if (!CHAVE) throw new Error("Defina ELEVENLABS_API_KEY.");
    return listarVozes();
  }
  if (!pastaGravacoes && (!CHAVE || !process.env.VOZ)) {
    console.error("Defina ELEVENLABS_API_KEY e VOZ (o id do seu clone; veja com --vozes), ou use --gravacoes pasta.");
    process.exit(1);
  }
  const video = path.join(AQUI, "video-mudo.mp4");
  if (!fs.existsSync(video)) throw new Error("Falta o video-mudo.mp4: rode antes o gravar.js.");

  const entradas = [], filtros = [], rotulos = [];
  let ini = 0;
  for (const cena of R.cenas) {
    let arq = path.join(PASTA, cena.id + ".mp3");
    if (pastaGravacoes) {
      const achado = fs.readdirSync(pastaGravacoes).find((f) => path.parse(f).name === cena.id);
      if (!achado) { console.log("sem gravação para " + cena.id + ": a cena fica só com a batida"); ini += cena.dur; continue; }
      arq = path.join(pastaGravacoes, achado);
    } else if (!fs.existsSync(arq)) {
      console.log("gerando: " + cena.id);
      await gerarFala(cena, arq);
    }
    const d = duracao(arq), cabe = cena.dur - 0.35;
    const ritmo = d > cabe ? Math.min(1.2, d / cabe) : 1;
    if (d / 1.2 > cabe) console.log("⚠ " + cena.id + ": a fala (" + d.toFixed(1) + " s) é longa para a cena (" + cena.dur + " s) e vai invadir a seguinte");
    const n = entradas.length / 2 + 2; // 0 é o vídeo, 1 a batida
    entradas.push("-i", arq);
    const atraso = Math.round((ini + 0.2) * 1000);
    filtros.push("[" + n + ":a]atempo=" + ritmo.toFixed(3) + ",adelay=" + atraso + "|" + atraso + ",apad[v" + n + "]");
    rotulos.push("[v" + n + "]");
    ini += cena.dur;
  }
  if (!rotulos.length) throw new Error("Nenhuma fala.");
  const saida = path.join(AQUI, "video-narrado.mp4");
  const filtro = filtros.join(";") + ";" +
    rotulos.join("") + "amix=inputs=" + rotulos.length + ":normalize=0,volume=1.6,asplit=2[voz][chave];" +
    "[1:a]volume=0.55[bat];[bat][chave]sidechaincompress=threshold=0.02:ratio=10:attack=20:release=400[batAbaixada];" +
    "[voz][batAbaixada]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]";
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-i", video, ...entradas,
    "-filter_complex", filtro, "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(duracao(video)), "-movflags", "+faststart", saida], { stdio: "inherit" });
  console.log("pronto: " + saida);
})().catch((e) => { console.error(e.message); process.exit(1); });
