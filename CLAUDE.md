# Treino Livre

App de registro de treinos de academia, em português, gratuito e sem cadastro.
Publicado em https://carlosjr81.github.io/Treino-Livre/ (GitHub Pages).

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

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | O app inteiro: HTML, CSS e um `<script type="text/babel">` com todo o React |
| `sw.js` | Service worker: modo offline. Cache `treinolivre-vN` |
| `manifest.json` | Instalação como app (PWA), atalhos do ícone |
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
8. **Dados** — `GRUPOS`, `MUSCULOS`, `EXERCICIOS` (204),
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
- Hoje: 172 dos 204 exercícios com imagem.

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
- **Wake Lock durante o descanso** — sem isso o navegador suspende o áudio com o
  celular no bolso e o aviso de fim nunca toca.

## Navegação e telas

Quatro abas na barra inferior (`Início`, `Exercícios`, `Fichas`, `Histórico`) e
telas internas roteadas pela mesma variável `aba`: `assistente`, `novoExercicio`,
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
