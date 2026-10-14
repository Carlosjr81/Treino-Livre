// Quebra o app de proposito e cobra que o verificador reprove.
// Rede de protecao que nunca reprovou nada nao e rede de protecao.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

// a raiz do repositorio, a partir desta pasta: nada de caminho escrito a mao
const ORIG = path.join(__dirname, "..");
const BASE = path.join(os.tmpdir(), "tl-prova-" + Date.now());

const CASOS = [
  {
    nome: "erro de sintaxe no JSX",
    espera: /NÃO compila|nao compila/i,
    quebra(d) {
      const f = path.join(d, "index.html");
      let h = fs.readFileSync(f, "utf8");
      // tira uma chave de fechamento de uma funcao do app
      const alvo = "function TreinoLivre() {";
      h = h.replace(alvo, "function TreinoLivre() { if (true {");
      fs.writeFileSync(f, h);
    },
  },
  {
    nome: "hash SRI errado",
    espera: /HASH NÃO CONFERE/,
    quebra(d) {
      const f = path.join(d, "index.html");
      let h = fs.readFileSync(f, "utf8");
      h = h.replace(
        /integrity="sha384-tMH8h3BGESGckSAVGZ82T9n90ztNXxvdwvdM6UoR56cYcf\+0iGXBliJ29D\+wZ\/x8"/,
        'integrity="sha384-AAAAh3BGESGckSAVGZ82T9n90ztNXxvdwvdM6UoR56cYcf+0iGXBliJ29D+wZ/x8"'
      );
      fs.writeFileSync(f, h);
    },
  },
  {
    nome: "versao.json fora de sincronia",
    espera: /versao\.json diz/,
    quebra(d) {
      fs.writeFileSync(path.join(d, "versao.json"), '{"versao":"2026-01-01a"}');
    },
  },
  {
    nome: "endereco do sw.js diferente do index.html",
    espera: /mas o index\.html não pede esse endereço/,
    quebra(d) {
      const f = path.join(d, "sw.js");
      let s = fs.readFileSync(f, "utf8");
      s = s.replace("react.production.min.js?v=3", "react.production.min.js?v=9");
      fs.writeFileSync(f, s);
    },
  },
  {
    nome: "arquivo do cache que nao existe",
    espera: /que não existe na pasta/,
    quebra(d) {
      const f = path.join(d, "sw.js");
      let s = fs.readFileSync(f, "utf8");
      s = s.replace('"./manifest.json",', '"./manifest.json",\n  "./icone-que-nao-existe.png",');
      fs.writeFileSync(f, s);
    },
  },
];

// So os arquivos: `testes/` tem a pasta hooks/ dentro, e copyFileSync num
// diretorio levanta EISDIR. A copia nao precisa das subpastas — o verificador
// le o index.html, o sw.js, o versao.json e o proprio testes/app.js.
function copiarArquivosDe(origem, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const f of fs.readdirSync(origem)) {
    const p = path.join(origem, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(destino, f));
  }
}

function copiar(dest) {
  copiarArquivosDe(ORIG, dest);
  copiarArquivosDe(path.join(ORIG, "testes"), path.join(dest, "testes"));
}

let ok = 0, mal = 0;
for (const c of CASOS) {
  const d = path.join(BASE, c.nome.replace(/[^a-z]/gi, "-"));
  copiar(d);
  c.quebra(d);
  let saida = "", codigo = 0;
  try {
    saida = execFileSync(process.execPath, [path.join(d, "testes", "verificar.js")], {
      encoding: "utf8", cwd: d, stdio: ["ignore", "pipe", "pipe"], timeout: 180000,
    });
  } catch (e) {
    saida = (e.stdout || "") + (e.stderr || "");
    codigo = e.status === undefined ? -1 : e.status;
  }
  const pegou = c.espera.test(saida);
  const reprovou = codigo !== 0;
  if (pegou && reprovou) { ok++; console.log("  ok   pegou: " + c.nome); }
  else {
    mal++;
    console.log("  X    DEIXOU PASSAR: " + c.nome + "   (saiu com " + codigo + ")");
    console.log(saida.split("\n").filter((l) => /ERRO|aviso/.test(l)).map((l) => "         " + l).join("\n"));
  }
}

fs.rmSync(BASE, { recursive: true, force: true });
console.log("\n" + ok + " pegou / " + mal + " deixou passar");
process.exit(mal ? 1 : 0);
