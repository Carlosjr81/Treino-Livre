# Vídeo: leia o prato com uma foto

Vídeo de divulgação (1080×1920, ~60 s, vertical para Reels e Story) que mostra
a leitura do prato pela IA, passo a passo, com a foto real do almoço do dono.

| Arquivo | O que é |
|---|---|
| `roteiro.json` | As cenas, o tempo de cada uma, a fala (o que a voz diz) e a legenda (o que aparece escrito, quando difere), e os itens do prato com os números da tabela do app |
| `cenas.html` | As animações, desenhadas num canvas, cada quadro em função do tempo. Aberto no navegador (por um servidor), toca sozinho |
| `gravar.js` | Grava o `video-mudo.mp4`: as cenas, a legenda e uma batida própria (sintetizada aqui, sem música de terceiros) |
| `narrar.js` | Põe a narração: com o clone de voz da ElevenLabs, ou com gravações suas |
| `prato.jpg` | A foto do almoço que a IA leu |

## Como fazer o vídeo narrado com o seu clone de voz

No computador (a sessão do Claude na nuvem não alcança a ElevenLabs):

```bash
node divulgacao/video-prato-ia/gravar.js
ELEVENLABS_API_KEY=sua_chave node divulgacao/video-prato-ia/narrar.js --vozes
ELEVENLABS_API_KEY=sua_chave VOZ=id_do_clone node divulgacao/video-prato-ia/narrar.js
```

O segundo comando lista as suas vozes e marca os clones com ★. O terceiro gera
uma fala por cena (pasta `falas/`), encaixa cada uma no começo da cena dela,
abaixa a batida enquanto a voz fala e grava o `video-narrado.mp4`. Falas já
geradas não são pedidas de novo: para refazer uma, apague o arquivo dela.

**Sem a ElevenLabs**: grave você mesmo cada fala (o texto está no
`roteiro.json`, campo `fala`), salve como `gancho.mp3`, `problema.mp3`, ...
(o nome é o `id` da cena) numa pasta e rode
`node divulgacao/video-prato-ia/narrar.js --gravacoes pasta`.

## Regras do texto

As mesmas da divulgação: sem "grátis", sem promessa de resultado, sem
"personal" nem "dieta prescrita". A dica do óleo e do molho fica: a foto erra
para menos justamente na gordura, e o vídeo não pode vender a IA como perfeita.
