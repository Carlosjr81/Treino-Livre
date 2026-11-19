# Reels: o treino que se ajusta pela ciência (versão 2026-11-20b)

Um Reels de ~80 s, 1080×1920, **sem música** (ela entra na edição), feito com as
**telas reais do app**, camadas de **realidade aumentada** presas aos botões de
verdade, legenda palavra por palavra e o **Jarvis** como co-apresentador: é ele
quem diz as fontes dos estudos e responde ao "Jarvis, anota 80 por 10".

## As cenas

| # | Cena | O que aparece | O que é dito |
|---|---|---|---|
| 1 | **Gancho** | "SUA FICHA PODE ESTAR TE SABOTANDO" batendo na tela, tremor, zoom em "4 músculos estão treinando pouco", meme | "Você treina há meses e não cresce? O problema pode ser a sua ficha." |
| 2 | Monta o treino | o assistente real, toques em Músculo, 4 dias, Intermediário; os três chips voando | "Eu criei o Treino Livre: um app grátis que monta o seu treino pela ciência. Três perguntas…" |
| 3 | A literatura | semana com 2 dias acesos por músculo, a régua 10–20 séries enchendo, o corpo com peito = 1 e tríceps/ombro = ½ | volume, frequência, séries fracionadas; **Jarvis**: Schoenfeld 2016, Pelland 2024 |
| 4 | O ciclo | 5 barras crescendo (base, sobe, sobe, pico, recupera) | ciclo de 5 semanas; **Jarvis**: Bell 2023 |
| 5 | Os ajustes | o aviso real "Ciclo 2", cartões ↑ +2 / ↓ −2 / ✓ mantém, meme | carga parou, caiu, evoluindo |
| 6 | O botão | toque no interruptor real, o selo "LIGADO", o quadro "O que o app ajustou para hoje" | "Liga este botão: Atualizar sozinho pela ciência…" |
| 7 | Ajuste por tempo | "cerca de 2 h", toque em Tenho menos tempo, 1 h, o relógio de 1h58 a 58 min, os bi-sets, meme | "Só tem 1 hora hoje?…"; **Jarvis**: Iversen 2021 |
| 8 | Jarvis | ondas no botão do Jarvis, balões da fala e da resposta | "Jarvis, anota 80 por 10." / "Supino: 80 por 10…" |
| 9 | Apoio | toques em Comprar pelo link e Doar pelo Pix, as lojas e o Pix, o cartão final com o logo e o aviso de saúde | "grátis, sem mensalidade e sem propaganda… link na bio… consulte um médico" |

O texto está em `roteiro.js` (as falas, as telas, os toques e a realidade
aumentada de cada cena). Mudou uma fala, rode `gerar.js` de novo.

## Pôr a sua voz (no seu computador)

1. No ElevenLabs, em **Voices**, copie o id da **sua voz clonada** (se ainda não
   tem: *Add a new voice › Instant Voice Clone*, com 1 a 3 minutos de áudio seu
   falando, sem música). Para o Jarvis, escolha uma voz masculina calma.
2. Rode (PowerShell):
   ```
   $env:ELEVENLABS_API_KEY="..."; $env:VOZ_DONO="<id da sua voz>"; $env:VOZ_JARVIS="<id da voz do Jarvis>"
   node divulgacao/reels-ciencia/dublar.js
   ```
   Sai uma gravação por fala em `audio/`. Ouça; a que não gostar, apague o
   `.mp3` e rode de novo (só grava o que falta).
3. Faça o `git push` da pasta `audio/` e peça ao Claude "gere o Reels com a minha
   voz", ou rode você mesmo:
   ```
   node divulgacao/reels-ciencia/capturar.js   (só se o app mudou)
   node divulgacao/reels-ciencia/gerar.js
   ```
   O vídeo se refaz no tempo exato de cada gravação: `saida/reels-treino-livre.mp4`,
   já com a voz, e `saida/legenda.srt` para quem quiser editar no CapCut.

## Os memes (do seu Drive)

Ponha o arquivo em `memes/` com estes nomes (jpg, png ou webp) e gere de novo.
Sem o arquivo, entra uma figurinha desenhada no lugar, com o mesmo texto.

| Arquivo | Quando aparece | Texto por cima |
|---|---|---|
| `memes/gancho.jpg` | no gancho, logo depois do título | EU DESCOBRINDO QUE / TREINAVA PEITO 1× POR SEMANA |
| `memes/stonks.jpg` | "Carga parou? Mais duas séries." | MEU SUPINO / DEPOIS DE +2 SÉRIES |
| `memes/correria.jpg` | "Só tem 1 hora hoje?" | EU SAINDO DO TRABALHO / ÀS 19H PRA TREINAR |
| `memes/obrigado.jpg` | "grátis, sem mensalidade e sem propaganda" | SEM MENSALIDADE / E SEM PROPAGANDA |

Use só meme que você pode usar (do seu Drive, feito por você ou de banco livre):
o vídeo vai para o perfil, e imagem de outra pessoa ou de filme pode render
denúncia.

## Legenda do post (para colar)

> Você treina há meses e não cresce? 👀 O problema pode ser a sua ficha.
>
> O Treino Livre monta o seu treino pela ciência: cada músculo 2× por semana, de 10 a 20 séries por semana, num ciclo de 5 semanas. E agora ele se atualiza sozinho: a cada ciclo olha o seu histórico e ajusta as séries. Dia corrido? "Tenho menos tempo hoje" redesenha o treino para caber em 1 hora. 🔁⏱
>
> É grátis, sem mensalidade e sem propaganda. Para continuar assim, apoie comprando pelos meus links ou com um Pix 💛 (link na bio).
>
> Sugestão automática e educativa, baseada em estudos. Não substitui o profissional de Educação Física. Consulte um médico antes de começar.
>
> #treino #academia #hipertrofia #musculacao #treinolivre #fitness #ciencia

## As regras de linguagem

O texto segue o `juridico/BASE-LEGAL.md` (item 6): nada de "personal",
"prescrição", "garantido" ou promessa de resultado; "sugestão automática" e
"consulte um médico" no fim, falado e escrito.
