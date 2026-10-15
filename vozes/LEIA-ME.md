# Vozes gravadas do Monster, Run!

A voz do aparelho (a síntese do navegador) lê tudo no mesmo tom. Para as
histórias terem **voz com emoção de verdade** (sussurrar no suspense, gritar
"agora!", ofegar na perseguição, comemorar a fuga), cada fala pode ser gravada
uma vez por uma IA de voz e publicada aqui. O app toca a gravação quando ela
existe e, quando não existe, cai na voz do aparelho, com entonação por emoção.

## O que tem nesta pasta

| Arquivo | O que é |
|---|---|
| `roteiro.json` / `roteiro.csv` | Todas as falas que podem ser gravadas (597), cada uma com o nome do arquivo, a voz (feminina ou masculina, a do narrador da história), a emoção, a direção para a IA e o texto. O `.csv` abre no Excel/Planilhas. |
| `indice.json` | A lista das falas que já têm gravação. É como o app sabe o que tocar. |
| `gerar-vozes.js` | Gera os `.mp3` com OpenAI ou ElevenLabs e refaz o `indice.json`. |
| `exportar-roteiro.js` | Refaz o roteiro a partir do `index.html`, depois de mexer numa história. |
| `<voz>-<código>.mp3` | As gravações (quando existirem). |

## Como gerar (uma vez só)

Precisa de um computador com Node 18+ e de uma chave de API. **A sessão do Claude
na nuvem não alcança esses serviços**, então isto roda na sua máquina (ou peça
ao Claude no seu computador: "gere as vozes do Monster, Run!").

**Opção 1 — OpenAI** (mais barata: as 597 falas custam por volta de US$ 1):
```bash
OPENAI_API_KEY=sk-... node vozes/gerar-vozes.js --so=fuga-do-marombeiro   # teste com uma história
OPENAI_API_KEY=sk-... node vozes/gerar-vozes.js                           # todas
```
Vozes padrão: `coral` (feminina) e `ash` (masculina). Para trocar: `VOZ_F=nova VOZ_M=onyx`.

**Opção 2 — ElevenLabs** (a mais expressiva; ~55 mil caracteres, cabe no plano Creator):
```bash
ELEVENLABS_API_KEY=... VOZ_F=<id> VOZ_M=<id> node vozes/gerar-vozes.js
```
Escolha na *Voice Library* uma voz feminina e uma masculina em português do
Brasil e copie os ids. O modelo `eleven_v3` entende as marcas de emoção que o
roteiro já traz (`[whispers]`, `[shouting]`, `[out of breath]`, `[laughs]`...).

No Windows (PowerShell): `$env:OPENAI_API_KEY="sk-..."; node vozes/gerar-vozes.js`.

Depois, **publique a pasta** (`git push`, ou arraste os `.mp3` e o `indice.json`
para a pasta `vozes/` no site do GitHub). Não precisa subir a versão do app: o
`indice.json` é sempre buscado na rede, e as gravações são baixadas quando a
história começa e guardadas no aparelho (funcionam sem internet depois).

## Quando mudar uma história

O nome do arquivo sai do texto da fala. Mudou a frase, muda o arquivo: rode
`node vozes/exportar-roteiro.js`, depois `gerar-vozes.js` (ele só gera o que
falta). A fala nova sai na voz do aparelho até ser gravada.

## O que continua na voz do aparelho

- A frase do ritmo-alvo ("Alvo: 10,4 quilômetros por hora"): muda a cada
  perseguição, então é dita pela voz do aparelho logo depois da gravação.
- O Jarvis da academia e as falas do treino comum.
