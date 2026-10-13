# Treino Livre

App de registro de treinos de academia, em português, gratuito e sem cadastro.
Publicado em https://carlosjr81.github.io/Treino-Livre/ (GitHub Pages).

## Dois scripts no `index.html`, de propósito

O arquivo tem **dois** blocos de script:

1. Um `<script>` comum com `EXERCICIOS` e `IMAGENS_WGER` — 100 KB de dados
   puros, sem uma linha de JSX.
2. O `<script type="text/babel">` com o app.

Com os dados dentro do segundo, o Babel passava de 500 KB, avisava no console
que tinha desistido de otimizar, e cobrava segundos de espera a cada abertura
num celular mediano. Compilar dado é trabalho jogado fora.

Script clássico: o `const` do topo vira ligação global e o script seguinte
enxerga igual. Continua tudo no mesmo arquivo e editável à mão.
**Dados novos vão no primeiro bloco; código vai no segundo.**

## Restrições que moldam tudo

Leia esta seção antes de propor qualquer mudança de arquitetura.

1. **Não existe etapa de build.** O histórico do repositório é de commits
   "Add files via upload": o dono publica enviando arquivos pela interface web do
   GitHub, sem `git` local e sem `npm`. Por isso React, ReactDOM e Babel vêm por
   CDN e o JSX é compilado no navegador. Introduzir Vite/esbuild/Actions quebraria
   o único fluxo de publicação em uso. Para ganhar desempenho, prefira ajustes
   sem build.
2. **Não existe backend.** Nada de contas, servidor ou banco. Todos os dados do
   usuário vivem no `localStorage` do aparelho. Qualquer recurso "social" precisa
   caber em link compartilhado (ver *Compartilhamento*) ou não entra.
3. **Arquivos estáticos que abrem direto.** `index.html` precisa funcionar
   sozinho; nada de imports de módulos locais.
4. **Português em tudo.** Nomes de variáveis, funções, comentários e textos de
   interface são em português. Mantenha o padrão.

## Publicar: três lugares para subir a versão

**Faça isto em toda publicação, sem exceção:**

1. `VERSAO_APP` no `index.html` (formato `AAAA-MM-DD` + letra)
2. `versao.json` com o mesmo valor
3. `CACHE` no `sw.js` (`treinolivre-vN`)

Por que isso virou regra: um conserto ficou publicado horas sem chegar ao
celular do dono, e o diagnóstico que ele mandou apontava para um defeito já
corrigido. Duas rodadas de depuração foram gastas num bug que não existia mais.
O `VERSAO_APP` aparece nos ajustes **e no topo do diagnóstico do Jarvis** —
qualquer relato agora diz em qual versão aconteceu.

O app busca `versao.json` 2,5 s depois de abrir e toda vez que volta do segundo
plano. Se o número diferir, mostra uma faixa com **Atualizar**, que apaga os
caches (menos `treinolivre-config`), manda o service worker se atualizar e
recarrega com `?v=<agora>`.

**O `sw.js` busca o `index.html` com `cache: "no-store"`.** Sem isso o "rede
primeiro" era servido pelo cache HTTP do próprio navegador — o GitHub Pages
manda `Cache-Control: max-age=600` — e devolvia a cópia velha achando que tinha
ido à rede. O `versao.json` nunca é interceptado pelo service worker: ele existe
para delatar a versão nova e serviria de pouco vindo do cache.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | O app inteiro: HTML, CSS e um `<script type="text/babel">` com todo o React |
| `sw.js` | Service worker: modo offline. Cache `treinolivre-vN` (hoje v14) |
| `manifest.json` | Instalação como app (PWA), atalhos do ícone |
| `versao.json` | Só `{"versao":"…"}`. É como o app descobre que saiu versão nova |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Ícones gerados por script (gradiente da marca + halter) |

## Estrutura do `index.html`

Na ordem em que aparece no arquivo:

1. `<head>` — meta tags, manifest, ícones, Open Graph, scripts de CDN com
   `integrity`/SRI, variáveis CSS de tema, animações, tela de carregamento.
2. **Armazenamento** — `store` (localStorage com queda para memória),
   `STORAGE_KEY`, `b64Codificar`/`b64Decodificar`, `novoUid`.
2b. **Fotos** — `abrirBancoFotos`, `guardarFoto`, `lerFoto`, `apagarFoto`,
   `reduzirImagem` (IndexedDB).
2c. **Leitura de série** — `ehAquecimento`, `ehTempo`, `cargaDe`, `repsDe`,
   `segundosDe`, `serieConta`.
3. **Gamificação** — `calcularEstatisticas`, `statsTreino`, `est1RM`,
   `calcularRecordes`, `volumePorGrupo`, `volumeSemanal`.
4. **Nível e engajamento** — `xpDe`, `NIVEIS`, `nivelDe`,
   `recordesPorExercicio`, `ultimaExecucao`, `sugerirCarga`,
   `recuperacaoMuscular`, `CONQUISTAS`.
5. **Story** — `gerarImagemStory` (canvas 1080×1920), `compartilharImagem`.
6. **Modelos do assistente** — `SPLITS` por dias/semana.
7. **Som e tela** — `beep` (Web Audio), `ligarTravaTela`/`desligarTravaTela`
   (Wake Lock).
7b. **Jarvis (voz)** — `criarOuvinte`, `jarvisFalar`, `normalizarFala`,
   `numerosPorExtenso`, `depoisDeJarvis`, `acharExercicio`, `interpretarVoz`,
   `responderConsulta`, `AJUDA_FALADA`, `LICOES_JARVIS`, `vozesPtBr`.
   Fica logo antes de `IMAGENS_WGER`.
8. **Dados** — `GRUPOS`, `MUSCULOS`, `EXERCICIOS` (214, dos quais 14 funcionais),
   `GRUPO_POR_EXERCICIO`, `FICHAS_PADRAO`.
9. **Estilos** — objeto `S` com estilos inline reaproveitados.
10. **Imagens** — `IMAGENS_WGER` (mapa fixo) e `ImagemExercicio`.
11. **Componentes** — mapa muscular, gráficos, telas, `TelaSessao`.
12. **`TreinoLivre`** — componente raiz com todo o estado.
13. Render, registro do service worker, GoatCounter.

## Modelo de dados

Tudo num único registro em `localStorage["treinolivre:v1"]`:

```js
{
  programas: [{ id, nome }],                    // agrupam fichas
  treinos:   [{ id, nome, programaId, itens: [{ uid, exercicioId, series, reps, obs, descanso, conjunto }] }],
  historico: [{ id, nome, data, duracaoMin, itens: [{ exercicioId, obs, series: [{ peso, reps }] }] }],
  customEx:  [{ id: "custom-…", custom: true, nome, grupo, equip, musc, passos, dica }],
  medidas:   [{ id, data, peso, cintura, peito, braco, coxa, quadril }],
  fotos:     [{ id, data }],                    // a imagem em si fica no IndexedDB
  sessao:    { treinoId, nome, inicio, itens: [{ uid, exercicioId, obs, descanso, conjunto, sugerido, series: [...] }] } | null,
  lembrete:  { ativo, hora: "18:00", dias: [1,2,3,4,5] },   // 0 = domingo
  voz:       { preferido, falar, animado, vozNome, velocidade, barra, modo,
               botaoFone, contarAlto, autoSerie },        // Jarvis e Eyes Scan
  convite:   true,                              // o convite para seguir ainda não foi respondido
  entrou:    true,                              // a portaria já foi passada
  dicas:     { voz: 1, scan: 1 },               // dicas de primeiro contato já vistas
  historico[].bpm: { medio, max, amostras } | ausente,     // monitor cardíaco
  ultimoBackup: 1725100000000,
  descanso: 90, som: true, tema: "escuro", meta: 3, seedV3: true
}
```

Hierarquia: **programa → ficha → item (exercício + séries + reps + obs)**.
Na ficha, `series` é a *quantidade* de séries (número). Na sessão e no histórico,
`series` é a *lista* de séries. Essa diferença é fácil de confundir.

Regras importantes:

- **`sessao` é persistida.** Fechar o app ou recarregar no meio do treino não
  perde nada. Não remova isso: o botão "Voltar" promete que o treino continua
  salvo. Ao carregar, uma sessão com mais de 12 horas é descartada.
- **A gravação é atrasada em 400 ms** e descarregada na hora em
  `visibilitychange`/`pagehide`. Cada tecla digitada muda o estado; escrever o
  histórico inteiro a cada tecla travava o aparelho.
- **O backup exportado não leva `sessao`** de propósito.
- **`uid` nos itens** existe para o React ter chave estável. Sem ele, remover um
  exercício do meio da lista desloca os campos de peso/reps dos seguintes.
- **`conjunto`** liga itens *vizinhos* num bi-set/tri-set. É um id compartilhado;
  itens separados na lista com o mesmo id não formam conjunto, porque a checagem
  olha só o vizinho de cima e o de baixo.
- **`descanso` no item** vence o descanso geral. `null` significa "usa o geral".
  O valor ajustado durante o treino volta para a ficha ao finalizar, junto das obs.
- **Uma série tem dois formatos.** `{ peso, reps }` no geral e `{ segundos }` na
  isometria (exercício com `tempo: true`). Use os leitores `ehTempo`, `cargaDe`,
  `repsDe` e `segundosDe` em vez de ler `s.peso` direto — foi assim que a prancha
  deixou de ser gravada como "0 kg × 12".
- **`aquec: true`** marca série de aquecimento. Ela fica registrada, mas
  `serieConta` a exclui de volume, carga máxima, recordes e séries semanais.
- **As fotos não cabem no `localStorage`.** Ficam no IndexedDB
  (`treinolivre-fotos`), e o registro principal guarda só a lista de datas.
  O backup **em arquivo** leva as imagens em base64 (`fotosDados`); o backup em
  texto não leva, de propósito.

## Jarvis Eyes Scan (contar repetição pela câmera)

Apoia o celular, o app enxerga o corpo e conta as repetições sozinho. No fim
da série o número vai para a ficha — pelo **mesmo** `anotarPorVoz` do botão ✓ e
do comando falado. O scanner não grava nada por conta própria: assim descanso,
recorde e celebração saem de graça e não existe um segundo lugar onde uma série
possa ser gravada errado.

### Como fica barato

A biblioteca de visão e o modelo somam ~8 MB. São carregados **só quando a tela
é aberta pela primeira vez** (`carregarEyes`, `import()` dinâmico) e guardados
pelo service worker. Quem nunca usar o scanner não paga nada por ele: o app
continua abrindo com o mesmo meio mega.

Tudo roda no aparelho (MediaPipe, 33 pontos, GPU). **Nenhuma imagem sai do
celular** — não há servidor para onde mandar, e não haveria mesmo que houvesse.

### Como a repetição é contada

Exigir configuração por exercício é inviável: são 214 no catálogo mais as
máquinas que o dono fotografa e que não estão em catálogo nenhum. Então:

1. `criarContador` mede **oito ângulos** ao mesmo tempo (cotovelos, joelhos,
   quadris, ombros) e aprende o mínimo e o máximo de cada um. As bordas cedem
   devagar — um quadro ruim não pode redefinir a amplitude.
2. Fica com **o que mais se mexe**. Entre sinais parecidos (dentro de 20%), o
   grupo muscular do exercício desempata (`EYES_PREFERENCIA`).
3. **Troca de sinal só antes da primeira repetição.** Trocar no meio da série
   zeraria a referência e perderia a conta.
4. Conta a ida e volta com **histerese** (sobe acima de 0,72, desce abaixo de
   0,28) e tempo mínimo de 550 ms. Sem isso o tremor do modelo no meio do
   caminho contaria dez repetições numa.
5. Amplitude abaixo de 22° é gente parada enquanto o modelo treme: não conta.

### Movimento funcional: ângulo não basta

Exercício de máquina é sempre um ângulo que abre e fecha. Funcional não: salto
é a **altura do quadril**, polichinelo é a **abertura** dos pés e das mãos, soco
é o **alcance** do braço. Por isso existem os onze sinais de posição
(`EYES_SINAIS_POS`), todos divididos pelo comprimento do tronco (`escalaTorso`) e
multiplicados por 100 — assim o número não muda com a distância da câmera e fica
na mesma escala dos ângulos, com os mesmos limiares.

E, diferente de máquina, movimento funcional **tem nome e forma conhecidos**. Daí
`MOV_FUNCIONAIS`, com doze perfis, em três modos:

| modo | quando | exemplo |
|---|---|---|
| `par` (alternado) | o movimento troca de lado a cada repetição | soco, chute, afundo alternado, joelho alto |
| `sinais` | o movimento é conhecido e já diz onde olhar | polichinelo, burpee, agachamento com salto |
| automático | não há perfil: máquina qualquer ou aparelho fotografado | os 200 de máquina |

**O alternado é o caso que não dá para errar.** Soco e chute trocam de lado a cada
repetição; com um contador só, uma série de 20 socos viraria 10. Então cada lado
tem a sua máquina de estados e os dois se somam. O campo `func` do exercício é o
que liga um ao outro — e é só o que precisa ser preenchido ao criar um movimento
funcional novo.

Coberto por `teste-funcional.js`, que vale a pena rodar antes de mexer no
contador: corpo sintético em coordenadas de imagem, ciclos defasados em meia fase
para os alternados, e a checagem de que **o modo automático não quebrou**.

### O que o contador mede além de contar

- **Ritmo** (`ritmo`, segundos por repetição) e **tempo sob tensão** (`tut`). Saem
  de graça: a duração de cada repetição já era medida para o técnico saber quando
  a pessoa estava acelerando. Repetição de 1 s e de 4 s treinam coisas diferentes,
  e até aqui não havia como saber sem filmar a série.
- **Equilíbrio entre lados** (`lados`), só no alternado. O desequilíbrio que
  ninguém percebe sozinho, porque o lado forte compensa sem avisar. Diferença
  maior que 2 aparece marcada no rodapé.

Testado com movimento sintético (`teste-contador.js`): 3, 10 e 20 repetições,
ritmo de 1,2 s e de 4 s, ruído pesado, e **20 segundos parado tremendo contam
zero**. Vale refazer esse teste antes de mexer no contador — não dá para fazer
agachamento na frente do navegador.

### O técnico (`criarTecnico`)

Contar é informação; corrigir é o que faz valer a pena apoiar o celular. Cada
repetição é medida — **amplitude percorrida** e **duração** — e comparada com
as anteriores. Daí saem as frases: "essa foi mais completa", "desce mais um
pouco", "controla a descida", "continue assim".

As regras valem mais que as frases:

- **Correção vem antes de elogio.** Quem está encurtando o movimento precisa
  saber disso antes de ouvir que foi bem.
- **No máximo um comentário a cada três repetições**, e nunca a mesma frase
  duas vezes seguidas. Um parceiro de treino que comenta tudo vira ruído — e
  ainda atropela a contagem.
- **A penúltima fala sempre** ("Última. Segura."): é a informação que muda o
  que a pessoa vai fazer agora.
- A comparação só começa na **segunda** repetição: elogiar a primeira por ser a
  melhor de todas é bobagem.

A frase é dita **em fila** (`jarvisFalar(..., { fila: true })`), depois do
número. Sem isso o `speechSynthesis.cancel()` do comentário cortava o número no
meio — "sete" virava "se-". E aparece **na tela** também, em verde para elogio
e vermelho para correção: com o som desligado a correção continua chegando.

Testado em `teste-tecnico.js` com séries sintéticas de amplitude crescente,
amplitude caindo (cansaço) e aceleração no fim. O teste também cobra o
silêncio: no máximo 5 comentários em 12 repetições, e nunca dois seguidos.

### A correção de postura (`criarPostura`)

**Esta é a parte do app com mais regras de contenção, e é de propósito.**
Contar errado custa uma repetição; corrigir errado custa a confiança. Quem
ouve "joelho para dentro" fazendo o movimento certo aprende a ignorar o app —
e aí a correção boa também deixa de valer. Por isso:

1. **Só mede na vista que permite ver aquilo.** `vistaDe` separa frente de
   perfil pela razão entre a largura dos ombros e o comprimento do tronco
   (>70 é frente, <45 é perfil, no meio não se afirma nada). Valgo de joelho
   não existe de perfil; quadril fora da linha não existe de frente. A tela diz
   qual vista o exercício pede, senão a checagem simplesmente nunca rodaria.
2. **Só fala na segunda repetição seguida com a mesma falha.** Uma repetição
   ruim é uma repetição ruim; duas são um padrão.
3. **Só com os pontos bem visíveis** (`visibility > 0.65`). O modelo inventa a
   posição de ponto escondido, e ponto inventado vira correção inventada.
4. **São dois defeitos, não doze** — os dois que aparecem em quase todo mundo e
   que dá para ver com confiança numa câmera de celular:
   - **valgo** (joelho caindo para dentro): distância do joelho até a reta
     quadril–tornozelo, medida na direção do meio do corpo.
   - **quadril fora da linha** na prancha e na flexão: distância do quadril até
     a reta ombro–tornozelo, com sinal (caindo ou empinado).
5. **Postura vence o técnico** na fila de comentários: amplitude curta custa
   resultado, joelho caindo custa joelho.

`POSTURA_POR_MOV` e `POSTURA_POR_GRUPO` dizem o que pode ser checado em quê.
Fora dessa lista não se mede nada — quadril fora da linha é defeito na prancha
e é o movimento certo no afundo.

`teste-postura.js` existe principalmente para a prova **negativa**: oito
agachamentos na linha, oito flexões retas, ruído do modelo e joelho levemente
fora não podem gerar correção nenhuma. Depois vem a positiva. Se um dia esses
limiares forem afrouxados, é esse teste que vai avisar.

### "O que estou fazendo?" (`adivinharMovimento`, modo livre)

Escolher o exercício antes de começar era o último passo de configuração que
sobrava no funcional. Como cada perfil já diz em que sinais olhar, dá para
virar a pergunta: medir tudo por 5 segundos (três ou quatro repetições) e ver
de qual perfil aquilo mais se parece.

A nota é **quantas vezes a amplitude passou do mínimo que aquele movimento
exige**. Dividir pelo `minAmp` é o que põe soco (14) e burpee (26) na mesma
régua — sem isso o movimento de amplitude grande ganharia sempre. No modo
alternado vale o **menor** dos dois lados: um braço só se mexendo é outra coisa.

**O palpite nunca é aplicado calado.** Aparece escrito, com o nome do movimento
e um botão de trocar à mão — e quando o primeiro não se destaca do segundo em
30% (`seguro: false`), ele é anunciado como "Parece X", não como "X". Adivinhar
e contar escondido seria pior que não adivinhar nada.

Quando o movimento é escolhido (adivinhado ou trocado), `montarContador` refaz o
contador com o perfil certo e **a conta recomeça do zero**: somar o que foi
contado com o perfil errado daria um número que não existiu. É por isso que
montar o contador é uma função e não código solto dentro do efeito.

### A janela corrida de 4 segundos

**O defeito mais caro deste módulo, achado pelo teste do técnico.** A
normalização usava bordas que cediam 0,02° por quadro. Quando a amplitude caía
de 90° para 60° — que é exatamente o que o cansaço faz — levava 45 segundos
para acompanhar, e nesse meio tempo **o contador simplesmente parava de
contar**. Justo nas últimas repetições, as que mais custam. Contava 4 de 8.

Hoje o mínimo e o máximo saem de uma **janela corrida de 4 segundos**
(`JANELA_MS`), que acompanha por construção. Quatro segundos cobrem duas
repetições no ritmo normal e uma bem lenta: menos que isso e uma repetição de
4 s se normalizaria contra si mesma; mais que isso e volta a demorar para
perceber a amplitude caindo. Os valores entram suavizados (0,4), senão um
quadro ruim do modelo estica a janela inteira por quatro segundos.

### Na tela

- Esqueleto verde sobre o vídeo, só tronco e membros (o rosto tem 11 pontos que
  não dizem nada sobre agachamento e poluem a imagem).
- Contador grande no canto, calorias estimadas e batimento quando há monitor.
- **Conta em voz alta** a cada repetição, e diz "completou" na última. O botão
  de liga e desliga fica **no próprio scanner**, não nos ajustes: em academia
  cheia a decisão muda na hora. Guardado em `voz.contarAlto`.
- **A série fecha sozinha.** Bateu o número combinado, ela está feita: insistir
  num toque depois disso é pedir para a pessoa interromper o treino para
  confirmar o óbvio. Fecha em 4 segundos, com bipe por segundo, e dá para
  cancelar — quem quer fazer duas a mais também tem razão. Botão `⏱ auto` no
  próprio scanner, guardado em `voz.autoSerie`.
- `−` e `+` corrigem a conta antes de registrar, e **cancelam o fechamento
  automático desta série**: mexer na conta à mão é dizer "ainda não acabei".
- **Ao fechar, as trilhas da câmera são encerradas** (`getTracks().forEach(stop)`).
  Sem isso a luz da câmera fica acesa depois de sair da tela — e com razão a
  pessoa desinstala o app.

## Treino funcional e aulas em circuito

Botão `⚡ Treino funcional` na tela inicial (fora do `temFichas`: funcional não
depende de ter ficha montada — é o caminho mais curto entre abrir o app e estar
suando). Abre a aba `funcional`, que tem três coisas, nesta ordem:

1. **Aulas guiadas** — o player conduz pelo relógio.
2. **Circuitos para contar na câmera** — viram uma sessão normal.
3. **A lista dos 14 movimentos funcionais**, para montar na mão.

A ordem não é por acaso: quem abre esta tela quer treinar agora, e escolher 4
movimentos numa lista de 14 é configuração.

### Os exercícios

Dez movimentos novos no catálogo (polichinelo, burpee, agachamento com salto,
salto vertical, afundo alternado, joelhos altos, socos no ar, chute frontal,
skater, abdominal remador), mais `flexao`, `escalador`, `afundo` e
`afundo-reverso`, que já existiam e ganharam `func`. Eles entram na busca, no
mapa muscular e nas fichas como qualquer outro — a única diferença é o `func`.

`SUGESTAO_FUNCIONAL` diz quantas séries e repetições cada um pede. Não é
enfeite: burpee de 10 é série dura e polichinelo de 10 é respirar fundo; sem
isso o app sugeriria 3×12 para tudo, errado nos dois sentidos.

### Os bonecos (`POSES_FUNCIONAIS`)

**Nenhum destes movimentos tem figura no acervo do wger**, e sem imagem a aula
guiada não funciona: a pessoa precisa saber o que fazer antes de começar, não
depois de ler. Então são desenhados em SVG aqui mesmo — esqueleto de onze pontos
numa tela de 120×160, duas poses por movimento, e o CSS alterna a opacidade das
duas. Um boneco que faz o movimento ensina mais que uma foto parada, e não custa
nem rede nem licença.

Cada pose é `pose({ ... })` sobre `POSE_BASE` — só o que muda é escrito. A
animação é de CSS, e não `requestAnimationFrame`, porque CSS continua rodando
com a tela em economia de energia e numa aula a tela fica minutos parada.
`@media (prefers-reduced-motion)` congela as duas poses.

O boneco também substitui a figura no `ImagemExercicio` e na
`MiniaturaExercicio` quando o exercício tem `func` e não tem imagem — assim o
catálogo fica coerente sem exceção.

### A aula (`AULAS`, `PlayerAula`)

Uma ficha diz o que fazer; uma aula **conduz**. A diferença é o relógio: ninguém
decide quando trocar de exercício — a voz avisa, a figura mostra, e a pessoa só
precisa se mexer.

- `montarRoteiro` estica a aula no tempo antes de começar (preparo, exercício,
  descanso, exercício...). É o que permite dizer "depois: burpee" sem adivinhar.
- Anuncia cada bloco, apita nos três últimos segundos, elogia na metade e avisa
  "últimos dez". As frases de `FRASES_AULA` variam de propósito: ouvir "continue
  assim" pela décima vez faz a voz virar paisagem.
- Trava a tela (`ligarTravaTela`) enquanto roda. O celular fica apoiado longe, e
  ninguém vai atravessar a sala para acordá-lo a cada bloco.
- Pausar é obrigatório: toca o telefone, cai o halter, a vida acontece.
- Ao terminar, vira um registro de histórico comum, com as séries no formato
  `{ segundos }` — `ehTempo` olha a **série**, não o exercício, então isso
  funciona para qualquer movimento sem marcar nada de especial no catálogo.

### `guardarTreino`, e por que a aula não tem código próprio de resumo

A cauda de `finalizarSessao` (resumo, recordes, conquistas, nível, fala do
fechamento) virou `guardarTreino(registro, evento)`. A aula não tem ficha nem
sessão, mas o que acontece depois é exatamente o mesmo — e duplicar aquilo era
garantir que um dos dois caminhos ficaria para trás.

### A voz conduz a aula (`CONTROLE_AULA`)

Durante a aula as mãos estão ocupadas e o celular está longe: é exatamente a
situação em que a voz vale mais. "Jarvis, pausa", "continua", "pula", "quanto
falta", "sair da aula". E "Jarvis, começa a aula queima" abre o player direto.

Duas decisões aqui:

- **A aula responde antes do interpretador geral.** Durante a aula o vocabulário
  muda de sentido: "pausa" é pausar a aula e não começar um descanso; "pula" é
  pular o bloco e não trocar de exercício.
- **`CONTROLE_AULA` é um ponteiro de módulo**, trocado quando o player entra e
  sai. O player está quatro níveis abaixo de quem recebe a fala, e descer
  callbacks por toda a árvore custaria mais do que rende. É o mesmo arranjo de
  `TEMA_APP`, e pelo mesmo motivo: existe no máximo uma aula por vez.

Começar a aula também **liga o microfone** se a voz for a preferida — é o gesto
que o navegador exige, e sem microfone não dá para dizer "pausa" com as mãos no
chão.

## A abertura (`Abertura`)

A marca do app em movimento, em três atos e menos de três segundos:

1. A **silhueta azul pontilhada** monta a pose de fisiculturista.
2. Uma **linha de leitura desce** por ela e, onde a linha passa, a silhueta vira
   o **esqueleto verde** — o mesmo, traço por traço, que aparece sobre o vídeo
   quando a câmera conta as repetições.
3. O **halter entra de frente, bate, e a tela racha**. O que fica é o halter com
   o nome do app.

O ato 2 é o único truque que vale explicar: são **duas máscaras com a mesma
régua correndo dentro** — uma apaga a silhueta de cima para baixo, a outra
revela o esqueleto no mesmo passo. É isso que faz a linha parecer *transformar*
o corpo, em vez de passar por cima dele. Um cross-fade não teria esse efeito.

Não é enfeite: é a promessa do produto dita em dois segundos, antes de qualquer
texto. E é vetor nos mesmos onze pontos dos bonecos funcionais — nenhum arquivo
novo, nada para baixar, funciona offline.

**Um toque pula**, e `prefers-reduced-motion` mostra direto o quadro final. A
abertura roda uma vez por carregamento e não é guardada: é a marca do app, não
um aviso a ser dispensado.

## Primeiro contato (`BemVindo`, `DicaInicial`, campo `dicas`)

O app tem duas coisas que **ninguém descobre sozinho**: que dá para ditar em vez
de digitar, e que a câmera conta as repetições. As duas estavam atrás de um botão
pequeno, e quem não sabia que existiam não ia procurar.

- **`BemVindo`** aparece na tela inicial só enquanto o histórico está vazio, e
  some sozinho depois do primeiro treino. A regra de não acrescentar cartão na
  tela inicial continua valendo: este não fica. Quem chega não sabe o que o app
  faz, e a lista de fichas sozinha não conta — ela parece uma agenda.
- **`DicaInicial`** mostra, dentro do treino, uma dica de cada vez: primeiro a da
  voz (que é quando digitar incomoda), e só depois da primeira a da câmera.

As regras são o que separa isso de propaganda dentro do app:

1. **Uma de cada vez**, nunca duas na mesma tela.
2. **Some para sempre** ao ser usada ou dispensada (`dicas`, persistido).
3. **Nunca durante o descanso**: ali a tela já tem cronômetro e a pessoa está
   contando os segundos.
4. A da câmera exige uma série de verdade para contar (`alvo`), e a da voz exige
   `VOZ_OUVE` — oferecer o que não funciona naquele navegador cansa.

## Crédito ao autor

`INSTAGRAM` e `LINK_INSTAGRAM` são constantes porque o @ aparece em cinco
lugares, e um @ errado num story já publicado não tem como ser corrigido.

- **Na imagem do story**, em 52px branco. O story é a única peça deste app que
  vai parar no feed de gente que nunca ouviu falar dele.
- **No texto de todo link compartilhado** (ficha, programa, desafio): quem
  recebe descobre o app e quem o fez no mesmo instante.
- **No convite da tela inicial**, uma vez, depois do terceiro treino, e some
  para sempre quando respondido (`convite`, persistido). Antes disso é pedir a
  alguém que ainda não sabe se o app presta; depois é insistência.
- No rodapé de créditos, que já existia.

### A portaria (`Portaria`, campo `entrou`)

A tela que pede para seguir antes de entrar. **Ela não verifica nada, e isso é
uma decisão tomada com o dono, não um descuido:** saber se alguém segue uma
conta exige servidor e uma API que o Instagram não oferece nem ao dono do
perfil. O que existe é o pedido feito na cara limpa, no único lugar por onde
todo mundo passa.

**O looping que ela causou, e que não pode voltar.** Quem vinha do link na bio
caía na portaria, tocava em "seguir", era levado para fora do navegador, voltava
pelo mesmo link — e caía na portaria de novo. E de novo. O único jeito de sair
era desistir do app. A liberação só era gravada quando a pessoa chegava ao botão
de entrar, e ela nunca chegava lá.

Daí as regras, todas nascidas de gente que não conseguiu entrar:

1. **Tocar em "seguir" já libera, antes de sair da tela**, e a gravação é
   imediata e direta no armazenamento (`liberarPortaria`) — não pelo respiro de
   400 ms, que a navegação não espera.
2. **O botão de entrar aparece desde o primeiro segundo.** Ele já ficou escondido
   atrás de um prazo de 14 s e de um toque no botão de seguir; as duas coisas
   pareciam uma porta sem maçaneta.
3. **No navegador embutido do Instagram não há portaria nenhuma.** Ali os dados
   salvos somem sozinhos, então nada do que a pessoa responder vai ser lembrado —
   e ela voltaria para a mesma tela na próxima vez. O que importa naquele
   contexto é tirá-la de lá, e é só isso que a tela diz, com o link para copiar.
4. **"Seguir e baixar" faz as duas coisas**: dispara a instalação e abre o perfil.
   Instalado, o app passa a abrir pelo ícone, e o Instagram deixa de ser a única
   porta de entrada — que é o que fechava o ciclo.

Achado ao testar isso: **`avisar` atropelava a ficha recebida.** O aviso do
microfone — que chega sozinho para quem deixou a voz ligada — trocava a
pergunta da ficha pelo aviso, e a ficha se perdia sem ninguém saber. Hoje
`avisar` nunca substitui um modal que está esperando resposta (`onSim`).

### Baixar o app (`baixarApp`, `ComoInstalar`, `JA_INSTALADO`)

"Baixar" um PWA não é baixar nada: é adicionar à tela de início. O Chrome oferece
isso num diálogo (`beforeinstallprompt`); **o iPhone nunca oferece**, e sem
instrução ninguém adivinha que está escondido no botão de compartilhar.

Antes, o cartão de instalar só aparecia quando o navegador se manifestava — ou
seja, **nunca no iPhone**, e a pessoa concluía que o app não podia ser instalado.
Hoje o cartão aparece sempre (menos para quem já está em `standalone`), e
`baixarApp` leva ao diálogo quando ele existe e ao passo a passo quando não
existe. O passo a passo é por plataforma: navegador embutido, iPhone, Android e
computador têm caminhos diferentes, e um texto genérico não ajuda nenhum deles.

## Monitor cardíaco, e o que a web não alcança

**Funciona:** qualquer monitor que exponha o serviço padrão de frequência
cardíaca do Bluetooth (0x180D) — cintas peitorais Polar, Garmin, Wahoo e
sensores de braço. O navegador fala direto com o aparelho, sem app no meio e
sem servidor. A pessoa escolhe o dispositivo na janela do próprio navegador.
O batimento aparece no treino e a média e o máximo entram no registro (`bpm`).

**Não funciona, e não é limitação do aparelho:** ler o Google Fit, o Health
Connect ou o Apple Health. São APIs de sistema operacional, só alcançáveis por
um aplicativo instalado pela loja. A API REST do Google Fit, que permitiria
algo parecido, foi descontinuada pelo próprio Google. Anéis inteligentes, no
geral, também não expõem o serviço padrão — guardam os dados para o app da
marca. **Não prometa isso na interface.** O caminho real seria empacotar o PWA
num aplicativo nativo (TWA + Health Connect no Android), que é outro projeto.

## Foto do aparelho (exercício do usuário)

Academia tem três máquinas de remada que não estão em catálogo nenhum, e o
dono precisa registrar as três separadamente. A resposta é ele fotografar o
aparelho: nenhuma figura de banco de dados identifica *aquela* máquina.

- A foto vai para a **mesma loja do IndexedDB das fotos de progresso**, com
  chave `exfoto-<id>`. Abrir um segundo banco obrigaria a subir a versão do
  IndexedDB que já está no aparelho de todo mundo, sem necessidade.
- `customEx[].foto` é só um booleano. A imagem nunca entra no `localStorage`.
- Reduzida para **720px e qualidade 0,72** (a de progresso é 1080 e 0,82): a
  foto só precisa ser reconhecível de relance e vão ser dezenas delas.
- `FOTOS_EX` guarda o endereço resolvido. Sem esse cache, cada render criaria
  um `objectURL` novo — vazamento garantido, já que a mesma foto aparece na
  lista, na miniatura da sessão e na demonstração. **Ao trocar a foto é
  obrigatório chamar `esquecerFotoEx`**, senão a tela mostra a imagem antiga.
- **`BotaoVariacao` é o que torna isso viável.** Cadastrar a segunda e a
  terceira máquina parecida pelo formulário inteiro é o que faz a pessoa
  desistir. A variação copia grupo, músculos, equipamento, passos e dica, e
  sugere o nome seguinte (`proximoNomeVariacao`: "Remada baixa" → "Remada
  baixa 2"). Sobra fotografar e salvar.
- O formulário leva `key={base.id}` para **remontar** a cada base: sem isso o
  React reaproveita a instância e a foto da máquina anterior fica pendurada na
  nova.
- A foto é gravada **antes** de o exercício entrar na lista. Ao contrário, uma
  falha deixaria um exercício prometendo uma imagem que não existe.
- **O backup em arquivo leva as fotos** (`fotosEx`). É o único dado do app que
  não existe em lugar nenhum além daquele aparelho.
- Ficha recebida por link chega com `foto: false`: a imagem não cabe num link,
  e marcar o contrário deixaria um exercício prometendo o que nunca vai ter.

## Imagens de demonstração

O endereço de cada figura está no objeto `IMAGENS_WGER` (id do exercício → URL em
wger.de). **Não há consulta de rede em tempo de execução.**

Antes o app chamava `https://wger.de/api/v2/exercise/search/` a cada abertura de
exercício. Esse endpoint foi removido da API e responde 404 — o resultado era que
nenhuma imagem aparecia.

Ao adicionar exercícios:

- O campo **`en` deve ser o nome exato em inglês na base wger**. É o que permite
  achar a figura.
- Para regenerar o mapa: baixe `/api/v2/exerciseimage/` e
  `/api/v2/exercise-translation/` (filtrando `language === 2`) e cruze pelo campo
  `exercise`.
- **Aceite o casamento só quando os nomes tiverem praticamente o mesmo conjunto
  de palavras.** Imagem errada ensina o movimento errado. Na dúvida, deixe sem
  figura: todo exercício tem botão de vídeo do YouTube como alternativa.
- Hoje: 172 dos 214 exercícios com imagem do wger. Os 12 movimentos funcionais
  não têm figura lá e usam o boneco desenhado (`POSES_FUNCIONAIS`), que é melhor
  para eles do que uma foto parada seria.

Os créditos ao wger e a licença CC BY-SA 4.0 ficam no rodapé e sob cada imagem.
Mantenha.

## Compartilhamento

Sem servidor, o conteúdo viaja dentro do próprio link, em base64 no hash:

| Hash | Conteúdo |
|---|---|
| `#ficha=` | uma ficha (`{v, n, i, x}`) |
| `#prog=` | um programa com todas as fichas (`{v, pn, fs, x}`) |
| `#desafio=` | números do amigo para comparar (`{nm, t, s, v, w}`) |
| `#atalho=` | atalhos do ícone do app (`livre`, `historico`) |

`b64Codificar`/`b64Decodificar` produzem exatamente o mesmo formato do antigo
`btoa(unescape(encodeURIComponent(...)))`. **Não mude a codificação**: links já
compartilhados por aí precisam continuar abrindo.

## Engajamento

- **Sugestão de carga** (`sugerirCarga`) — ao iniciar uma ficha, o peso já vem
  preenchido com o da última vez. Se todas as séries fecharam as repetições
  combinadas, sobe um passo (`PASSO_CARGA`: 1 kg abaixo de 20, 2,5 kg até 60,
  5 kg acima). É sobrecarga progressiva sem o usuário consultar nada.
- **Recorde à vista** — durante o treino, cada exercício mostra o recorde de
  carga e como foi na última vez.
- **Celebração** (`Celebracao` + `Confete`) — dispara ao bater recorde de carga
  durante a série e ao subir de nível ao fim do treino. Puro DOM/CSS, sem
  biblioteca (a CSP dos artifacts e o modo offline não permitiriam CDN extra).
- **Nível** (`nivelDe`) — pontos vêm de treinos, tonelagem, sequência e
  recordes, para não premiar só quem levanta muito nem só quem aparece sempre.
- **33 conquistas** em 5 categorias (`CATEGORIAS_CONQUISTA`).
- **Meta semanal** — anel de progresso, semana começando na segunda.
- **O que treinar hoje** (`recuperacaoMuscular`) — dias desde a última vez de
  cada grupo.
- **Séries da semana por grupo** (`seriesSemanaisPorGrupo`) — compara com a
  faixa de 10 a 20 séries (`FAIXA_SERIES`), a referência mais citada para
  hipertrofia. É um guia, e o texto na tela diz isso: não vire prescrição.
- **Fotos de progresso** — o registro que mostra mudança quando a balança não
  mostra. Reduzidas para 1080px em JPEG antes de guardar.
- **Filtro por equipamento** (`FAMILIAS_EQUIP`) — responde "só tenho halteres em
  casa". Um exercício pode cair em mais de uma família, e isso não é problema.
- **Duplicar ficha e programa** — ao copiar, os ids de `conjunto` são regerados
  para a cópia não compartilhar bi-set com o original.
- **Jarvis** — o treino inteiro sem tocar no celular. Ver a seção própria.
- **Escola do Jarvis** — praticar os comandos sem gravar nada. É o que resolve o
  problema de um assistente de voz que ninguém sabe o que dizer para ele.
- **Wake Lock durante o descanso** — sem isso o navegador suspende o áudio com o
  celular no bolso e o aviso de fim nunca toca.

## Jarvis (comandos por voz)

Digitar peso e repetição entre uma série e outra, com a mão suada, é o maior
atrito do app. O Jarvis tira isso do caminho: a pessoa fala, ele anota, marca a
série, começa o descanso e chama de volta no fim.

Roda inteiro na Web Speech API do navegador — **sem servidor e sem chave de
API**, que é o que o projeto permite. Em troca, a qualidade é a do navegador:
boa no Chrome (Android e computador), irregular no iPhone. Por isso **todos os
campos continuam digitáveis**: o Jarvis é atalho, nunca o único caminho.

### Como o comando chega até a ação

1. `criarOuvinte` entrega a frase (`SpeechRecognition`, pt-BR, contínuo).
2. `normalizarFala` tira acento e pontuação, junta sinônimos (`quilos|kg` →
   `kg`) e chama `numerosPorExtenso` (`quarenta e cinco` → `45`).
3. `depoisDeJarvis` corta tudo até o nome. Aceita variantes (`jarves`, `javis`,
   `charles`) por distância de edição — o reconhecimento erra o nome o tempo todo.
   No celular, num ginásio, sai com mais estrago do que num teste de mesa: a
   tolerância é de **duas** letras, e ele também tenta juntar duas palavras
   vizinhas, porque às vezes o nome volta partido em "jar vis".
4. `interpretarVoz` devolve `{ tipo, ... }`.
5. `tratarFala` (no componente raiz) resolve o que é global (ajuda, desligar,
   começar um treino) e manda o resto para `acoesVoz.current.executar`, que a
   `TelaSessao` pendura numa ref durante o render.

### Regras que não são óbvias

- **A palavra de ativação é obrigatória**, com uma exceção: 15 segundos depois
  de um comando *aceito*, dá para emendar o próximo sem repetir o nome. A janela
  **não** se renova em "não entendi", e fecha na primeira frase que não é
  comando — senão a conversa da academia inteira vira anotação.
- **O alvo é a primeira série não marcada** (`alvo`, na `TelaSessao`). É o que
  permite dizer só "Jarvis, 80 por 10". O cartão alvo ganha anel rosa e uma
  faixa dizendo o que falar: voz sem retorno visual é um salto no escuro.
- **"de cada lado"** vira `2 × valor + barra`, e a barra só entra em exercício
  cujo equipamento tem "barra" (e não "barra fixa"). O peso da barra é ajustável
  (`voz.barra`, padrão 20) porque academia de bairro tem barra de 10 kg. **A
  resposta sempre diz a soma em voz alta** — é assim que o erro aparece na hora.
- **A confirmação repete o que foi entendido** (exercício, carga, repetições).
  Não é enfeite: o reconhecimento erra, e ouvir o número de volta é o que
  permite corrigir antes de perder a série.
- **Enquanto o Jarvis fala, o microfone é ignorado** (`jarvisFalandoAte`). Parar
  o reconhecimento a cada resposta faria o Android apitar o treino inteiro.
### A frase chega em pedaços (o defeito mais caro até aqui)

O diagnóstico de um treino real mostrou o Android entregando **uma** frase em
vinte pedaços, cada um marcado como `isFinal`:

```
"anota" → "anota aí" → "anota aí cadeira" → "anota aí cadeira abdutora"
→ "... 90" → "... 90 kg" → "... 90 kg 12" → "... 90 kg 12 repetição"
```

Agir em cada pedaço é agir vinte vezes na mesma frase, e sempre na versão
incompleta. `acumularFrase` junta os pedaços e só entrega quando a frase para
de crescer (1,1 s sem novidade, ou o fim da sessão).

- **`mesmaFrase` compara por palavras, não por prefixo de texto.** O
  reconhecedor *revisa* o fim da frase enquanto escuta ("90 kg 12" virou "90 kg
  de repetição"), e aí o prefixo deixa de bater. A regra é: mesma frase quando
  as palavras iniciais coincidem até a penúltima.
- **Continuação do que já foi tratado é ignorada** (1,2 s após a entrega). Sem
  isso acontecia uma cascata: o pedaço seguinte chegava enquanto ele respondia,
  era lido como "falou por cima", calava a resposta e virava um comando novo —
  que fazia ele falar de novo. Uma frase virava sete anotações.
- **O prazo é curto de propósito.** Com 2,5 s, ditar "40 por 15" duas vezes
  seguidas — a coisa mais comum do treino — perdia a segunda série.
- **Pedaço que não é comando não fecha mais a janela de 15 s.** Era o que matava
  o comando inteiro: "anota" (o primeiro pedaço) não é comando, fechava a janela
  aberta pelo "Jarvis" ditado segundos antes, e a frase completa chegava depois,
  já trancada do lado de fora.

### Os dois modos de escuta (`voz.modo`)

**Este é o ponto mais importante da implementação.** No Android, `continuous =
true` não é contínuo: o sistema encerra a sessão a cada silêncio. Religar emite
o bipe de início do reconhecedor, e o que a pessoa ouve é **um bipe atrás do
outro**. Pior: cada religada corta a frase no meio, então pergunta longa
("qual a sugestão de treino para hoje?") nunca chega inteira. Comando curto às
vezes passa, o que faz o defeito parecer aleatório.

| Modo | Como funciona | Quando |
|---|---|---|
| `continuo` (padrão) | `continuous = true`, religa no `onend` | Computador e celulares que aguentam |
| `toque` | `continuous = false`, uma sessão por comando, sem religar | Android que apita ou corta frases |

O app **troca sozinho** quando detecta o sintoma: 6 encerramentos seguidos sem
nenhuma frase, em menos de 15 segundos (`aoTumulto`). A janela de tempo importa
— seis encerramentos espaçados ao longo do treino são o comportamento normal de
quem fica calado entre as séries, e trocar de modo ali seria errado. Quando
troca, aparece um aviso explicando que os bipes eram do aparelho.

Duas armadilhas na interface do modo `toque`, as duas já corrigidas:
- A sessão acaba junto com o comando, então `vozAtiva` vira `false`. Se a faixa
  de resposta dependesse de estar ouvindo, **a resposta escrita sumiria no
  mesmo instante** em que aparece.
- Pelo mesmo motivo o "?" do painel não pode depender de estar ouvindo, ou a
  ajuda some entre um comando e outro.

Trocar de modo com o microfone ligado exige reabrir a sessão: `continuous` só
pode ser definido antes de `start()`.

### Interromper e o eco da própria voz

Enquanto ele fala, o microfone ouve a voz dele voltando. Antes, **tudo** o que
chegava nessa janela era descartado — e a pergunta que a pessoa emendava na
resposta sumia sem deixar rastro. Agora `ecoDaPropriaVoz` compara o que chegou
com o que ele está dizendo (`jarvisDizendo`): se a maior parte das palavras
bate, é eco e é descartado; se não bate, é a pessoa falando por cima — ele cala
e escuta. Religar o reconhecedor também espera ele terminar de falar, senão no
Android o bipe toca por cima da própria resposta.

### Diagnóstico (`ModalDiagnosticoJarvis`)

"Ele não responde" é um sintoma com cinco causas possíveis e nenhuma aparece na
tela. `DIARIO_JARVIS` guarda as últimas 40 frases que chegaram ao microfone e o
que foi decidido com cada uma ("ignorado (conversa)", "precisa do nome dele",
"eco da própria voz", "entendido: consultar o recorde"). A tela é copiável.

**Lista vazia depois de falar é a resposta**: o problema é o microfone, não o
entendimento. Entradas: o "?" do painel e Ajustes › Jarvis.

- **O navegador encerra o reconhecimento sozinho** depois de alguns segundos de
  silêncio, mesmo com `continuous`. O `onend` religa, com freio (mais de 10
  religadas em 10 s dá um respiro de 2,5 s), e um relógio de 4 s confere, porque
  o `onend` nem sempre dispara.
- **O microfone só liga por gesto** — toque no botão flutuante ou em "Treinar"
  com `voz.preferido`. A única exceção é voltar de uma recarga no meio do treino:
  a permissão já foi dada antes e o treino está correndo.
- **`conferirRecorde` devolve a frase do recorde** em vez de falar. Ditar a série
  e comemorar são duas falas, e uma cancelaria a outra.
- **Nome falado sai sem parênteses** (`nomeFalado`): "Crossover baixo (polia
  baixa)" lido em voz alta é um trava-língua, e convida a repetir algo que o
  reconhecimento não casa.
- **Tom animado** (`voz.animado`, padrão ligado): `pitch` 1.22, ritmo um pouco
  acima e interjeições que giram sem repetir a anterior (`animo`).

### Perguntas sobre o histórico

`responderConsulta` responde **em qualquer tela**, com ou sem treino aberto —
perguntar "qual meu recorde no supino" não devia exigir um treino em andamento.
O componente raiz tenta primeiro a `TelaSessao` (que tem o contexto do exercício
da vez) e, quando ela devolve `null`, cai aqui.

| Pergunta | Tipo | De onde sai a resposta |
|---|---|---|
| "qual meu recorde no supino" | `recorde` | `recordesPorExercicio` |
| "quanto fiz da última vez" | `ultimaVez` | `ultimaExecucao` |
| "o que eu treino hoje" / "quero treinar peito" | `sugestaoHoje` | `recuperacaoMuscular` + a ficha que mais cobre os grupos |
| "já posso treinar costas" | `recuperacaoGrupo` | `recuperacaoMuscular` |
| "quantas séries de peito essa semana" | `seriesGrupo` | `seriesSemanaisPorGrupo` + `FAIXA_SERIES` |
| "quando foi meu último treino" | `ultimoTreino` | histórico + `statsTreino` |
| "qual meu nível" / "minha sequência" / "minha meta" | `progresso` | `calcularEstatisticas` + `nivelDe` |
| "quanto eu peso" / "minha cintura" | `medida` | `medidas`, comparando com a medição anterior |

Comandos de sessão acrescentados depois dos testes em treino real:

| Comando | Tipo | O que faz |
|---|---|---|
| "vai para o leg press" / "você pulou o X" | `irExercicio` | foca aquele exercício; se não estiver na ficha, entra no fim |
| "repete" / "mais uma igual" | `repetir` | anota outra série com os mesmos números da anterior |
| "quanto falta de descanso" | `tempoDescanso` | lê o cronômetro em voz alta |
| "observação: banco na altura 4" | `observacao` | guarda o texto na obs do exercício (usa `c.cru`, com acentos) |
| "corrige para 50" | `corrigir` | muda a carga da última série marcada, sem desfazer |
| "bora" (sozinho) | `boraTreinar` | começa a ficha que ele sugeriu para hoje |

`boraTreinar` só casa com a frase **inteira** ("bora", "partiu treinar"):
dentro de uma frase maior, "bora" é empolgação, não comando.

Fora dos comandos, a voz também entra em dois momentos: o **resumo falado ao
finalizar** (séries, volume, comparação com o treino anterior, recordes e
conquistas — chega enquanto a pessoa guarda a anilha, que é quando o número
significa algo) e a **isometria**, que avisa "metade" e "faltam 10 segundos" —
numa prancha a pessoa está de cara para o chão e não vê a tela.

`grupoDito` traduz como se fala ("barriga", "bumbum", "braço") para o id do
grupo. **A ordem das regras importa**: as perguntas com grupo citado vêm antes
de `tempo`, senão "quanto tempo faz que treinei peito" viraria "tempo de treino".

### Ajuda falada

"Jarvis, quais são os principais comandos?" responde **falando** (`AJUDA_FALADA`)
e abre a lista na tela. Quem pergunta está com o celular no bolso e as mãos no
ferro: uma lista na tela sozinha não serve. São quatro comandos na resposta, não
trinta — o resto fica na tela. Com assunto ("como funciona o descanso?") ele
explica só aquele, e aí não abre modal nenhum.

A detecção não é uma lista fechada de frases: quem pede ajuda pergunta de mil
jeitos, então ela procura sinais (`ajuda`, `comandos`, `o que você faz`, `como
funciona`) e depois o assunto.

### Escola do Jarvis (`EscolaJarvis`, aba `escolaVoz`)

Ler uma lista de comandos não ensina ninguém a falar com o app. Na escola a
pessoa fala de verdade, e **nada é gravado**: a frase passa pelo mesmo
`interpretarVoz` e o resultado vira texto na tela ("Entendi: 80 kg × 10"). Errar
ali é de graça.

- São 9 lições (`LICOES_JARVIS`), cada uma com `diga`, `porque`, `confere(c, ctx)`
  e `resumo(c, ctx)`. `ctx` traz `{ comNome, barra, ex }`.
- A lição 2 exige que a pessoa **não** diga o nome dele — é como se aprende a
  janela de 15 segundos.
- O raiz desvia as frases para cá antes de qualquer roteamento, pelo
  `acoesEscola.current.receber(bruto, corpo, comNome)`.
- Tem campo de texto que passa pelo mesmo interpretador: serve para iPhone,
  navegador sem reconhecimento, e para conferir se uma frase sua seria entendida.
- **O botão flutuante some nesta tela** (`escondido`): ele cobria o "Próxima
  lição". O estado do microfone aparece no cabeçalho da própria escola.

Entradas: "Jarvis, modo treino", o botão no modal de ajuda e o botão em Ajustes.

### O que os diagnósticos de treino real ensinaram

Cada linha aqui saiu de um treino de verdade, não de um teste de mesa.

- **O verbo vem conjugado de todo jeito.** "pare", "pararam", "interrompeu",
  "parou" — a lista curta de `pular o descanso` deixava tudo passar, e a frase
  caía na regra de **começar** o descanso. Fazer o contrário do pedido é o pior
  erro possível, e acontecia justamente com quem estava com pressa. Daí a
  constante `PARADA`, longa de propósito. O guarda `!/\d+\s*(min|seg)/` protege
  "descanso de 2 minutos para o supino".
- **O nome na frente aparece e some entre uma revisão e outra.** O reconhecedor
  entregou "Jarvis ir para o próximo exercício" e "ir para o próximo exercício"
  no mesmo segundo; `mesmaFrase` comparava "jarvis" com "ir", concluía que eram
  frases diferentes, e o comando era executado **duas vezes** — pulando um
  exercício. Por isso `semNomeNaFrente` tira o nome antes de comparar.
- **Pedir para ir a um exercício específico** foi tentado de quatro jeitos num
  treino só ("ir para o X", "você pulou o X", "você pulou um exercício X por
  quê") e nenhum existia. Virou `irExercicio`, que vem **depois** de
  `proximo`/`anterior` para não roubar "ir para o próximo exercício", e exige
  que a frase não tenha "série" para não roubar "mais uma série de X".
- **O nome dele vira James, Travis, Charlie.** Todos colhidos de diagnósticos.
- **Uma palavra isolada não é um pedido.** "nenhum comando mesmo" abria a ajuda
  porque bastava a palavra "comando". Agora precisa de quem pergunta junto.

### Ouvir no barulho da academia

A Web Speech API quase não dá controle sobre a captação. O único ganho real
disponível é usar as **alternativas**: o reconhecedor manda vários palpites
(`maxAlternatives = 5`) e, com música alta, o certo raramente é o primeiro.
`tratarFalaInterno` testa todos e fica com o que vira comando — preferindo o
que traz o nome dele. O diário registra quando um palpite alternativo venceu.

Fone com microfone ajuda muito (microfone perto da boca, longe da caixa de
som) e some com o problema do eco, porque a resposta sai no fone. Em Bluetooth
há um efeito colateral fora do nosso alcance: enquanto o microfone está ligado,
o Android troca para o perfil de chamada e a música perde qualidade — nesse
caso o modo "Toque e fale" é melhor. Isso está dito na ajuda do app.

### Vocabulário

`APELIDOS_EXERCICIO` traduz o jeito da academia ("agacho", "extensora", "leg")
para o id. `acharExercicio` procura **primeiro entre os exercícios do treino de
hoje** e só depois nos 214: quem fala "supino" no meio do treino quer o supino
que está na ficha. Na pontuação, quem acerta mais palavras do nome ganha de quem
acerta uma só — sem isso "rosca direta" perdia para "Rosca 21".

### Como testar sem microfone

Não dá para falar com o app num teste automatizado. O caminho usado foi montar
uma cópia do `index.html` com `SpeechRecognition` e `speechSynthesis` falsos,
expondo `window.dizer("Jarvis, anote 80 por 10")` e `window.__falado`. Assim o
fluxo inteiro — interpretação, estado, descanso, recorde e resposta falada — roda
de verdade. Vale refazer esse molde antes de mexer no interpretador.

## Navegação e telas

Quatro abas na barra inferior (`Início`, `Exercícios`, `Fichas`, `Histórico`) e
telas internas roteadas pela mesma variável `aba`: `assistente`, `funcional`, `novoExercicio`,
`escolaVoz`,
`editarTreino`, `editarHistorico`, `sessao`, `ajustes`.

**A tela inicial é enxuta de propósito.** Ela já teve 14 cartões e virou uma
parede — o que afastava justamente quem chegava pela primeira vez. Hoje ela
responde só "o que eu faço hoje": avisos, começar agora, o que treinar hoje, uma
faixa compacta de progresso e o último treino. **Resista a acrescentar cartão
aqui**; o lugar do resto é:

- **Histórico › Números** — nível, meta, conquistas, story, desafio, séries da
  semana por grupo, e os gráficos.
- **Histórico › Corpo** — medidas e fotos de progresso.
- **Ajustes** (engrenagem no cabeçalho) — tema, som, descanso padrão, meta,
  lembrete, backup e créditos.

## Treino em andamento

- **Miniatura + demonstração** — cada exercício da sessão mostra a figura ao lado
  do nome; tocar abre `ModalDemonstracao` por cima, com imagem, músculos, passos,
  dica e botão de vídeo. Antes era preciso sair do treino para consultar isso.
- **Substituir exercício** (`alternativasPara` / `substituirExercicio`) — para
  quando o aparelho está ocupado. Lista o mesmo grupo muscular, com os de mesmo
  equipamento primeiro, e exclui os que já estão no treino. As séries são
  mantidas em quantidade; a carga volta a ser sugerida a partir do histórico.
- **Bi-set e tri-set** — itens vizinhos com o mesmo `conjunto` ganham borda e
  rótulo, e o descanso só dispara depois da série do **último** do grupo.
  No editor de ficha, o botão "juntar com o de baixo" liga e desliga.
- **Descanso por exercício** — controle na própria linha do exercício, além do
  seletor no editor de ficha.

## Corpo, backup e lembretes

- **Medidas** (`TelaCorpo`) — peso e cinco circunferências, com gráfico por
  campo. É o que dá motivo para abrir o app fora do dia de treino.
- **Corrigir treino** (`TelaEditarHistorico`) — edita séries, obs, nome e
  duração de um treino já concluído. Recordes, conquistas e nível saem do
  histórico, então se ajustam sozinhos. Antes, um peso errado só tinha a saída
  de apagar o treino inteiro.
- **Backup em arquivo** — `baixarBackup` gera um `.json` via Blob e marca
  `ultimoBackup`; `restaurarDeArquivo` lê de volta por `<input type="file">`.
  O texto copiável continua existindo como alternativa. `avisoBackup` mostra um
  cartão vermelho quando há 5+ treinos e nenhum backup, ou mais de 30 dias sem.
- **Lembretes** — sem servidor não existe push de verdade. O que há é:
  (a) verificação a cada 30 s enquanto o app está aberto e (b) `periodicSync`
  no service worker, que só o Android com o app instalado atende. A configuração
  vai para o cache `treinolivre-config`, porque o service worker não enxerga o
  `localStorage`. **O `activate` do `sw.js` precisa preservar esse cache** ao
  limpar versões antigas, senão o lembrete morre a cada atualização.

## Como testar

Não há suíte automatizada. O `file://` não serve: o preview vira `data:` e o
`localStorage` fica bloqueado. Suba um servidor estático e teste em `http://localhost`
(o registro do service worker aceita `localhost` além de `https:`).

Roteiro mínimo depois de mexer no app:

1. Console sem erros e a tela inicial renderizando.
2. Iniciar uma ficha, preencher peso/reps, marcar série — o cronômetro de
   descanso começa.
3. **Recarregar a página no meio do treino** — a sessão precisa voltar inteira.
4. Adicionar e remover exercício no meio do treino, finalizar, e conferir no
   histórico se as observações foram para os exercícios certos.
5. Refazer a mesma ficha — a carga deve vir preenchida e sugerir subir.
6. Exportar e importar backup.
7. Abrir com `#ficha=` para conferir o recebimento por link.
8. Agrupar dois exercícios em bi-set e conferir que o descanso só começa depois
   do segundo.
9. Baixar o backup em arquivo e restaurá-lo.
10. Fazer uma prancha: o campo é em segundos, o ▶ conta e marca a série sozinho.
11. Marcar uma série como aquecimento (toque no número) e conferir que ela não
    entra no volume nem na carga máxima do resumo.
12. Adicionar uma foto de progresso, baixar o backup e restaurá-lo — a foto
    precisa voltar.
13. Ligar o Jarvis e dizer "Jarvis, anote 80 por 10": a série preenche, marca o
    ✓, o descanso começa e ele confirma falando o que entendeu.
14. Dizer "Jarvis, 40 de cada lado, 10 repetições" num exercício de barra — tem
    de anotar 100 kg e dizer a conta em voz alta.
15. Falar qualquer coisa sem dizer "Jarvis" depois da janela de 15 s: nada pode
    ser anotado.
16. Recarregar no meio do treino com o Jarvis ligado: ele volta ouvindo.
17. Perguntar "Jarvis, quais são os principais comandos?" — ele explica falando
    e abre a lista na tela.
18. Fora de qualquer treino, perguntar "Jarvis, qual meu recorde no supino?" e
    "Jarvis, o que eu treino hoje?" — as duas têm de ser respondidas.
19. Dizer só "Jarvis", esperar, e perguntar **sem repetir o nome**: a pergunta
    tem de ser respondida. Depois tentar "anote 80 por 10" sem o nome e fora da
    janela: não pode anotar nada.
20. Ditar no leg press e **ouvir** a confirmação: tem de sair "Leg press, 200
    quilos por 15", sem "quarenta e cinco graus" e sem engolir as repetições.
21. Num Android: ligar o Jarvis e ficar calado meio minuto. Se o aparelho
    começar a apitar, ele tem de trocar sozinho para "toque e fale" e explicar.
22. No modo toque: tocar, falar, e conferir que a resposta **continua na tela**
    depois da sessão acabar, e que o "?" continua alcançável.
23. Falar por cima dele enquanto responde: ele tem de calar e ouvir.
24. Ditar uma frase longa com o exercício no meio ("anota aí cadeira abdutora
    90 kg 12 repetições"): tem de virar **uma** série, não várias.
25. Ditar a mesma série duas vezes seguidas, com uns 3 segundos entre elas:
    precisam contar como duas.
26. "Jarvis, pare o descanso" com o cronômetro correndo: tem de **parar**, não
    começar outro. Repetir com "parou", "interrompeu" e "pararam".
27. "Jarvis, próximo exercício" **uma vez**: tem de andar **um** exercício.
28. "Jarvis, observação: banco na altura 4" — o texto precisa chegar ao campo
    de observação com acentos e maiúsculas.
29. Criar um exercício com foto do aparelho, e depois uma **variação** dele:
    o nome tem de vir sugerido, a foto **não** pode vir herdada.
30. Baixar o backup em arquivo e restaurá-lo: as fotos dos aparelhos precisam
    voltar.
31. "Jarvis, corrige para 50" depois de anotar errado: o campo muda e a série
    continua marcada.
32. "Jarvis, bora" fora de treino: começa a ficha sugerida.
33. Abrir o Eyes Scan, fazer 10 repetições de verdade e conferir a contagem.
33l. Zerar `dicas` e `historico`, abrir: o painel de boas-vindas tem de
     aparecer, e sumir sozinho depois do primeiro treino concluído.
33m. Dentro do treino, dispensar a dica da voz: a da câmera entra no lugar.
     Dispensar a segunda: nenhuma das duas volta, nem depois de recarregar.
33i. **O teste do looping.** Apagar `entrou`, abrir o app, tocar em "Seguir e
     baixar", voltar e recarregar: tem de entrar direto, sem portaria. Se a
     portaria voltar, o looping voltou.
33j. Abrir o app num iPhone e conferir que o cartão "Baixar o app" aparece e
     explica o caminho do botão de compartilhar.
33k. Ver a abertura inteira uma vez, e depois tocar no meio dela: tem de pular.
33h. Apagar `entrou` do armazenamento e abrir um link `#ficha=` **com a voz
     ligada**: passar a portaria e conferir que a pergunta da ficha aparece.
     Esse é o caminho que traz gente nova, e ele já quebrou uma vez.
33e. Agachar **bem feito** na frente da câmera: não pode sair correção
     nenhuma de postura. Esse é o teste que importa.
33f. Agachar deixando o joelho cair para dentro, de frente: na segunda
     repetição seguida ele avisa.
33g. Modo livre: começar a fazer polichinelo sem escolher nada. Em uns 5
     segundos ele tem de dizer o nome, e o botão de trocar tem de funcionar.
33a. Fazer uma série até bater o número da ficha: ela tem de **fechar sozinha**
     em 4 segundos, e o toque na faixa verde tem de cancelar isso.
33b. Socos no ar no Eyes Scan: os **dois lados** contam, e o rodapé mostra a
     divisão entre eles.
33c. Rodar uma aula inteira (a Express tem 7 min): figura certa em cada bloco,
     aviso falado da troca, e no fim o treino aparece no histórico.
33d. Durante a aula, dizer "Jarvis, pausa", "Jarvis, continua" e "Jarvis,
     quanto falta".
    Depois tocar em Registrar: a série tem de aparecer preenchida na ficha, com
    o descanso já correndo.
34. Fechar o scanner e conferir que a **luz da câmera apagou**.
35. Desligar a contagem em voz alta pelo botão do scanner e refazer: nenhum
    número pode ser falado.
36. Fazer uma série deixando a amplitude cair de propósito nas últimas
    repetições: ele tem de **continuar contando** e mandar abrir o movimento.
37. Conferir que o comentário não corta o número: ouve-se "sete" inteiro e só
    depois a frase.
38. "Jarvis, modo treino": percorrer as 9 lições dizendo a frase de cada uma.
    Todas precisam fechar com ✓, e nada pode aparecer no histórico depois.

## Convenções

- Nomes e comentários em português. Comentário só quando explica uma restrição
  que o código não mostra (por que existe, não o que faz).
- Estilos inline via objeto `S`; cores por variável CSS (`var(--texto)`), com
  `#E1306C` como cor de marca.
- Cor de grupo muscular sempre por `corGrupo(g)`, que escolhe a versão legível
  conforme o tema.
- `plural(n, singular, plural)` para concordância nos textos.
- Ao mexer no `sw.js`, suba a versão do cache (`treinolivre-vN`).
- As URLs de CDN carregam `?v=3`. Isso não é enfeite: a versão anterior do app
  guardou esses arquivos em cache como resposta opaca, e resposta opaca não passa
  na checagem de `integrity`. O endereço novo não encontra o cache velho e busca
  uma cópia verificável. Se mudar a versão de alguma biblioteca, recalcule o
  hash SRI e mantenha o mesmo endereço no `index.html` e no `sw.js`.

## Coisas que parecem bug e não são

- `TEMA_APP` é uma global atribuída durante o render de `TreinoLivre`. É impuro,
  mas determinístico e idempotente aqui. Trocar por Context exigiria mexer em
  ~13 pontos de chamada por benefício invisível.
- `duracaoMin` conta tempo de relógio e tem teto de 300 min, para uma sessão
  esquecida aberta não distorcer as médias.
- O componente raiz tem ~600 linhas e muitos `useState`. Uma reescrita com
  `useReducer` é tentadora, mas sem testes automatizados e com o histórico dos
  usuários vivendo só no aparelho, o risco de perda de dados não compensa.
