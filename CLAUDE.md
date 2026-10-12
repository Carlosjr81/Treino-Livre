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
| `sw.js` | Service worker: modo offline. Cache `treinolivre-vN` (hoje v8) |
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
7b. **Jarvis (voz)** — `criarOuvinte`, `jarvisFalar`, `normalizarFala`,
   `numerosPorExtenso`, `depoisDeJarvis`, `acharExercicio`, `interpretarVoz`,
   `responderConsulta`, `AJUDA_FALADA`, `LICOES_JARVIS`, `vozesPtBr`.
   Fica logo antes de `IMAGENS_WGER`.
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
  voz:       { preferido, falar, animado, vozNome, velocidade, barra, modo },  // Jarvis
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

### Vocabulário

`APELIDOS_EXERCICIO` traduz o jeito da academia ("agacho", "extensora", "leg")
para o id. `acharExercicio` procura **primeiro entre os exercícios do treino de
hoje** e só depois nos 204: quem fala "supino" no meio do treino quer o supino
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
telas internas roteadas pela mesma variável `aba`: `assistente`, `novoExercicio`,
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
24. "Jarvis, modo treino": percorrer as 9 lições dizendo a frase de cada uma.
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
