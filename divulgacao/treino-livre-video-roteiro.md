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

| Começa | Até | O que aparece | O que você fala |
|---|---|---|---|
| 0:00 | 0:03,6 | **Gancho.** "Você treina pesado há meses / E o espelho não muda?" | "Você treina pesado há meses. E o espelho não muda." |
| 0:03,6 | 0:06,5 | "O problema quase nunca é o treino" | "O problema quase nunca é o treino." |
| 0:06,5 | 0:09,1 | **Vinheta com a logo** | "Treino Livre." |
| 0:09,1 | 0:14,3 | Os dois corpos enchendo: comeu 2.140 × gastou 2.630 | "Aqui você vê o que entra e o que sai. No mesmo lugar, todo dia." |
| 0:14,3 | 0:18,7 | A régua cutting · manutenção · bulking | "E o app diz o que você está fazendo de verdade: cutting, bulking ou manutenção." |
| 0:18,7 | 0:22,9 | Foto do prato · porção caseira · gramas da balança | "Foto do prato, porção caseira, ou os gramas da balança." |
| 0:22,9 | 0:26,9 | O catálogo comparando malto × farinha de arroz | "Na dúvida entre dois alimentos, ele mostra só o que a troca muda." |
| 0:26,9 | 0:31,7 | Supino 80 → 82,5 kg e o ciclo de 5 semanas | "No treino, a carga de cada série vem do seu histórico. Sobe quando você fecha." |
| 0:31,7 | 0:35,6 | O Eyes Scan contando as repetições | "Apoie o celular: a câmera conta as repetições e mede a amplitude." |
| 0:35,6 | 0:40,0 | O percurso se desenhando · 5,2 km · 5:29 /km · VO2máx 48 | "Esteira, bicicleta ou rua, com mapa, ritmo e os números de quem corre." |
| 0:40,0 | 0:44,2 | O relógio com o descanso e o botão FEITO | "No pulso, você marca a série, vê o descanso e anota a água." |
| 0:44,2 | 0:47,5 | "Jarvis, anota 80 por 10" | "E dá para anotar falando, sem tocar no celular." |
| 0:47,5 | 0:52,2 | A evolução de 12 semanas · 8,4 t · 196 séries · 7 recordes | "No fim, o treino vira números. E os números viram o seu resultado." |
| 0:52,2 | 0:57,8 | **A enquete** 1 Calorias · 2 Treino · 3 Cardio | "Qual você quer dominar primeiro? Comenta o número aqui embaixo." |

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
