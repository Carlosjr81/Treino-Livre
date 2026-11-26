# O vídeo de divulgação — roteiro da fala

Arquivo: **`divulgacao/treino-livre-video.mp4`** · 1080×1920 · 57,8 s · 30 fps ·
H.264 · **sem áudio nenhum**.
Capa (o primeiro quadro, para o Reels): `divulgacao/treino-livre-video-capa.jpg`.

O vídeo já tem a legenda na tela, palavra por palavra, no tempo da fala. A voz
é para gravar por cima: **fale no ritmo da legenda** e cada frase cai no lugar.
Se você falar mais rápido ou mais devagar, tudo bem — a legenda continua
fazendo sentido sozinha, porque ela é a mesma frase.

Para refazer o vídeo depois de mexer no roteiro:

```bash
node ferramentas/video-divulgacao.js
```

O texto das falas e as cenas ficam em `ferramentas/video-divulgacao.html`
(a lista `CENAS`, lá no começo). Mudou a fala, mudou a legenda: é o mesmo campo.

---

## A fala, com o tempo de cada trecho

Os tempos exatos, prontos para gravar, estão em **`treino-livre-video.txt`**
(a tabela para ler), **`treino-livre-video.srt`** (a legenda com timecode, que
CapCut, Premiere e o YouTube abrem) e **`treino-livre-video.csv`** (início, fim
e duração de cada frase, para gerar a voz num programa). Os três saem de
`node ferramentas/video-legendas.js`, com os tempos tirados do próprio vídeo.

| # | Começa | Até | O que você fala |
|---|---|---|---|
| 1 | 0:00,2 | 0:03,5 | Você treina pesado há meses. E o espelho não muda. |
| 2 | 0:03,8 | 0:06,4 | O problema quase nunca é o treino. |
| 3 | 0:06,7 | 0:09,0 | Treino Livre. |
| 4 | 0:09,3 | 0:14,2 | Aqui você vê o que entra e o que sai. No mesmo lugar, todo dia. |
| 5 | 0:14,5 | 0:18,6 | E diz o que você está fazendo de verdade: cutting, bulking ou manutenção. |
| 6 | 0:18,9 | 0:22,8 | Foto do prato, porção caseira, ou os gramas da balança. |
| 7 | 0:23,1 | 0:26,8 | Na dúvida entre dois alimentos, ele mostra o que a troca muda. |
| 8 | 0:27,1 | 0:31,6 | No treino, a carga de cada série vem do seu histórico. Sobe quando você fecha. |
| 9 | 0:31,9 | 0:35,5 | Apoie o celular e a câmera conta as repetições. |
| 10 | 0:35,8 | 0:39,9 | Esteira, bicicleta ou rua, com mapa, ritmo e os números de quem corre. |
| 11 | 0:40,2 | 0:44,1 | No pulso, você marca a série e vê o descanso. |
| 12 | 0:44,4 | 0:47,4 | E dá para anotar falando, sem tocar no celular. |
| 13 | 0:47,7 | 0:52,1 | No fim, o treino vira números. E os números viram o seu resultado. |
| 14 | 0:52,4 | 0:55,2 | Qual você quer dominar primeiro? |

---

## A legenda para o post (copie e cole)

> Você treina pesado há meses e o espelho não muda. Quase nunca é o treino.
>
> O Treino Livre junta num app só o que você come, o que você gasta, a
> musculação, o aeróbico e o que o seu relógio mede — e mostra tudo em números
> que você acompanha semana a semana.
>
> 🔥 Body Balance: o que entra e o que sai, todo dia
> 🏋 A carga de cada série vinda do seu histórico
> 👁 A câmera contando as repetições
> 🏃 Rua, esteira e bicicleta com mapa e ritmo
> ⌚ Série, descanso, água e comida no relógio
> 🎙 Anotar falando, sem tocar no celular
>
> **Qual você quer dominar primeiro? 1 Calorias · 2 Treino · 3 Cardio**
> Comenta o número aqui embaixo 👇
>
> Link na bio. Ferramenta de registro e informação geral: não substitui médico
> nem profissional de Educação Física.
>
> #treinolivre #academia #musculacao #hipertrofia #dieta #cutting #bulking
> #treino #cardio #appdetreino

---

## Postar no Reels

- **Grave a voz antes de postar, ou escolha uma música dentro do Instagram.**
  O arquivo não tem áudio nenhum, de propósito. Reels mudo o Instagram aceita,
  mas entrega pior — e quem assiste com o som ligado estranha o silêncio.
- **Nada importante encosta na interface do Reels.** O nome do perfil, a
  legenda do post e os botões de curtir, comentar e compartilhar cobrem a faixa
  de baixo da tela e uma coluna à direita. Por isso a legenda falada termina
  acima disso, o crédito foi para o topo e o aviso de saúde do fim também. Se
  você mexer no layout, confira com a zona segura antes de postar
  (o script do scratchpad desenha as faixas por cima dos quadros).
- A **capa** (`treino-livre-video-capa.jpg`) é o primeiro quadro, que já traz o
  gancho escrito: o Reels mostra essa imagem antes de tocar.
- **Comente o primeiro comentário você mesmo** com "1, 2 ou 3?" para puxar a
  enquete — é o que faz a pergunta do fim virar comentário de verdade.

## As regras que o vídeo respeita (e que uma versão nova dele precisa respeitar)

- **Nenhum número inventado**: não há contagem de usuários, depoimento,
  "últimas vagas" nem promessa de resultado. Número inventado para empurrar
  venda é propaganda enganosa (CDC, art. 37), e é a mesma regra do contador da
  tela de apoio e da vitrine dos planos.
- Os números que aparecem são **exemplos de tela**, do tamanho do que o app
  mostra de verdade — não "o resultado de alguém".
- **Nunca escrever** personal, prescrição, avaliação física, plano alimentar,
  dieta, liberado para treinar, nem nada sobre a formação do criador
  (ver *A defesa legal* no `CLAUDE.md`).
- O fecho leva o aviso: ferramenta de registro e informação geral, não
  substitui médico nem profissional de Educação Física.
- **Sem áudio**, de propósito: o arquivo não tem trilha nenhuma, então a voz
  que você gravar por cima entra limpa.
