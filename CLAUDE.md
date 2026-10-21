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
   **Exceção única, decidida com o dono:** o ao vivo do *Desafio* passa por um
   retransmissor MQTT público e gratuito (sem conta, sem dados guardados por
   nós, sem localização). Tudo nele continua funcionando por link sem ele.
3. **Arquivos estáticos que abrem direto.** `index.html` precisa funcionar
   sozinho; nada de imports de módulos locais.
4. **Português em tudo.** Nomes de variáveis, funções, comentários e textos de
   interface são em português. Mantenha o padrão.

## Publicar: três lugares para subir a versão

**Faça isto em toda publicação, sem exceção:**

1. `VERSAO_APP` no `index.html` (formato `AAAA-MM-DD` + letra)
2. `versao.json` com o mesmo valor
3. `CACHE` no `sw.js` (`treinolivre-vN`)

**E escreva a novidade para o ChatGPT do dono** (pedido dele): toda versão
publicada ganha uma entrada no topo de **`divulgacao/NOVIDADES.md`**, com o
número da versão no título e o molde de lá (em uma frase · o que mudou · por
que importa para quem treina · como usar · ideias de vídeo · não prometer).
O ChatGPT dele lê esse arquivo no GitHub para montar os vídeos do app, e
novidade que não está lá é novidade que ninguém mostra. Mudou o que o app faz
(função nova, tela nova, o que não prometer), atualize também o retrato
completo em **`divulgacao/treino-livre-para-chatgpt.md`** e a linha "atualizado
até a versão" do topo dele. **O `verificar.js` reprova** a publicação se o
`NOVIDADES.md` não tiver a versão do `VERSAO_APP` — a regra de escrever
"depois" é a que sempre fica para trás. Linguagem de quem treina, não de
programador: nada de nome de função ali.

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

**A instalação do service worker também busca com `cache: "reload"`.** Pelo
mesmo motivo: o `c.add` comum passa pelo cache HTTP, e uma versão publicada
minutos depois da anterior guardava de novo os arquivos velhos. Aconteceu com
o avatar do Marombeiro: a pintura dos tênis foi desfeita, o texto novo chegou
ao celular e a imagem continuou pintada.

## Trabalhar de qualquer computador

O projeto não depende de uma máquina. Tudo o que é preciso para desenvolver
está **dentro do repositório** — app, documentação e testes — e o repositório
chega em qualquer computador por dois caminhos independentes: o clone do
GitHub e a cópia do Google Drive.

```
Treino-Livre/
├── index.html, sw.js, manifest.json, versao.json, ícones   ← o app publicado
├── privacidade.html     ← a política (exigida pelo Health Connect)
├── android/             ← o app Android: a porta para o Health Connect (ver *O app Android*)
├── CLAUDE.md            ← este arquivo: o contexto do projeto
├── COMECE-AQUI.md       ← como preparar uma máquina nova
├── vozes/               ← as falas gravadas do Monster, Run! e o roteiro delas
├── divulgacao/          ← o que o ChatGPT do dono lê para criar vídeos: o guia e o NOVIDADES
└── testes/              ← as 29 suítes, o servidor local e o LEIA-ME delas
```

**A pasta `testes/` fica dentro do repositório de propósito.** Um `git clone`
entrega o ambiente completo, sem depender de nenhuma nuvem. Nada ali é
carregado pelo app: o `index.html` não referencia a pasta e o `sw.js` tem uma
lista explícita do que guarda em cache.

Os testes acham o `index.html` pela posição da pasta dentro do repositório —
nenhum caminho escrito à mão, e é isso que faz funcionar com qualquer letra
de unidade e qualquer nome de usuário.

**Numa máquina nova**, o `COMECE-AQUI.md` tem o passo a passo e o
`preparar.ps1` (ou `preparar.sh`, no Mac) faz o trabalho: confere o que falta,
instala por `winget`/`brew`, define a identidade dos commits só neste
repositório e termina rodando os 1.115 testes. Não desinstala nada, não atualiza
o que já existe e não mexe em configuração global.

Duas coisas ele detecta mas não resolve, e as duas têm motivo:

- **A pasta precisa estar "Disponível off-line"** no Drive. É um menu do
  Explorador, nenhum comando o alcança. Sem isso o Drive guarda só os nomes, e
  `git` e `node` travam na primeira leitura — o script mede o tempo de ler o
  `index.html` inteiro para detectar o sintoma.
- **`gh auth login`** abre o navegador e espera alguém digitar.

Pedir "prepare esta máquina" ao Claude é o caminho esperado; ele roda o script.

### Publicar: `git push`, e nunca sem conferir

O histórico antigo é de commits "Add files via upload" — o app era publicado
enviando arquivos pela interface web do GitHub. Com o `gh` autenticado, hoje
`git push` publica e o GitHub Pages republica sozinho em um ou dois minutos.
A interface web continua valendo quando a máquina não tem git.

Isso **não** reintroduz etapa de build: continua sem Vite, sem `npm`, sem
compilação. O `git push` só move arquivos prontos, exatamente como o envio
pela web movia — ver *Restrições que moldam tudo*.

> **Antes de qualquer push, rode as duas:**
> ```bash
> node testes/rodar.js
> ```
> ```bash
> node testes/verificar.js
> ```
> Se alguma reprovar, **não publique**. Conserte ou pergunte.

**Isto vale também — e principalmente — quando o pedido vem do celular.** Lá
não há como abrir o app em `localhost` antes de publicar, e quem recebe uma
publicação quebrada é gente no meio de um treino. Em sessão na nuvem, onde o
hook de `pre-push` pode não estar ligado, rodar as duas é responsabilidade de
quem publica.

#### As duas conferidas, e o que cada uma pega

`rodar.js` são 1.171 checagens e prova que a **lógica** não quebrou: o
interpretador de voz, a contagem de repetições, a postura, o enquadramento.

`verificar.js` prova que o app ainda **abre** — que é outra coisa, e é a que
deixa todo mundo na mão. Cada checagem dele é um jeito real de derrubar o
Treino Livre:

| O que ele confere | O que acontecia sem isso |
|---|---|
| O JSX compila (com o Babel de verdade, da CDN ou, se ela não estiver ao alcance, do npm) | erro de sintaxe → tela branca para todos |
| Os hashes SRI batem com os arquivos reais da CDN | hash errado → o navegador recusa o React → nada carrega |
| As três versões estão sincronizadas **e subiram** quando o app mudou | o conserto nunca chega ao celular de ninguém |
| Os endereços do `sw.js` batem com os do `index.html` | o cache guarda um endereço que ninguém pede |
| Todo arquivo da lista do `sw.js` existe | o modo offline instala quebrado |

**A rede da sessão na nuvem é limitada a uma lista**, e `cdnjs.cloudflare.com`
não está nela — `registry.npmjs.org` está. Por isso o verificador pega o Babel
no npm quando a CDN não responde: a conferida do JSX, que é a mais importante,
funciona no celular sem configurar nada. A dos hashes exige a CDN de verdade e
vira aviso ali; quem a faz nesse caso é o GitHub Actions, que tem rede aberta.

O que depende de rede vira **aviso** quando não há rede, não erro: travar a
publicação por falta de internet seria trocar um problema por outro.

`prova-verificador.js` quebra o app de cinco jeitos de propósito e cobra que
o `verificar.js` reprove cada um. **Rode-o sempre que mexer no verificador** —
rede de proteção que nunca reprovou nada não é rede de proteção.

#### As três travas, e por que são três

1. **O hook de `pre-push`** (`testes/hooks/pre-push`) roda as duas conferidas
   e cancela o push se alguma reprovar. Hook do git não viaja no clone, então
   ele mora no repositório e o `preparar.ps1`/`preparar.sh` aponta o git para
   lá (`core.hooksPath`). Pular exige `--no-verify`, de propósito.
2. **A regra acima**, que é a que alcança sessão na nuvem e celular, onde o
   hook pode não estar ligado.
3. **O GitHub Actions** (`.github/workflows/conferir.yml`) roda tudo de novo
   do lado do GitHub. É a única das três que **dá para ver do celular**: o ✓
   ou o ✗ aparece no app do GitHub. Ela não publica nada e não é etapa de
   build — se for apagada, o app continua publicando igual, só se perde o
   aviso.

São três porque cada uma falha de um jeito: o hook não existe em clone novo,
a regra depende de alguém segui-la, e o Actions só avisa depois que já foi.

#### Se publicar algo quebrado

```bash
git revert --no-edit HEAD && git push
```

Volta ao estado anterior e o Pages republica em um ou dois minutos. **Reverter
primeiro, investigar depois**: enquanto se investiga, tem gente treinando com
o app quebrado na mão.

### A regra que o Drive impõe

**Um computador de cada vez.** O Drive sincroniza, não resolve conflito: duas
máquinas editando o mesmo arquivo viram duas cópias ("index (1).html"), e no
`.git` — que é feito de centenas de arquivinhos — isso corrompe o repositório
em vez de duplicar nada. Antes de trocar de máquina, feche o editor e confira
na bandeja que o Drive terminou de sincronizar.

O jeito de nunca precisar pensar nisso é **dar `git push` ao terminar e `git
pull` ao começar**, em qualquer máquina. Aí o Drive vira conveniência, e o
GitHub vira a verdade.

**Se um dia o Drive bagunçar o `.git`**, não tente consertar: clone de novo do
GitHub e siga daí.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | O app inteiro: HTML, CSS e um `<script type="text/babel">` com todo o React |
| `sw.js` | Service worker: modo offline. Cache `treinolivre-vN` (hoje v90) |
| `manifest.json` | Instalação como app (PWA), atalhos do ícone |
| `versao.json` | Só `{"versao":"…"}`. É como o app descobre que saiu versão nova |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Ícones gerados por script (gradiente da marca + halter) |
| `marombeiro-corpo.webp`, `-braco.webp`, `-cabeca.webp`, `-inteiro.webp`, `marombeiro-rosto.jpg` | O avatar animado do dono na "Fuga do Marombeiro" (ver *Monster, Run!*) |

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
8. **Dados** — `GRUPOS`, `MUSCULOS`, `EXERCICIOS` (274, dos quais 14 funcionais e 19 aeróbicos),
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
  botaoVoz:  { lado: "dir", y: 76 } | null,     // onde a pessoa pôs o botão do Jarvis
  voz.narrar: true,                             // avisos do treino falados
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

Exigir configuração por exercício é inviável: são 274 no catálogo mais as
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

### Calibração: se posicionar não é repetição

Sentar na máquina, pegar a barra, ajeitar o banco, andar até o aparelho: tudo
isso é uma ida e volta, e o contador contava — às vezes antes de a série
começar. **Movimento de se posicionar não tem ritmo; exercício tem.** Então:

1. **Toda repetição conta na hora, e a calibração trabalha descontando.** A
   primeira versão só mostrava o número quando via o padrão — ele aparecia já no
   3, e quem treinava achava que a contagem não tinha começado. Isso foi
   reprovado pelo dono: **o número tem de aparecer no 1.** Hoje as primeiras
   ficam "em conferência" até o movimento se repetir igual: três seguidas (duas
   no funcional, que tem forma conhecida) com amplitude parecida (a menor com
   pelo menos 60% da maior — 30% para a primeira de todas, medida com a régua
   ainda aprendendo), ritmo parecido (o intervalo mais longo até 1,8× o mais
   curto) e nenhum intervalo acima de 8 s. Aí o padrão trava. Enquanto não
   trava, sai da conta (`aceitar` devolve `{ contar, retirar }`):
   - a mais antiga, quando a janela de três não fecha o padrão;
   - todas, quando passam 8 s até a seguinte, ou 10 s sem nenhuma (`SOLTA_MS`);
   - todas, quando a pessoa anda (ver o item 4).

   **O desconto é avisado**, senão o número que desce parece defeito: dois
   toques graves, a frase "↩ Descontei um movimento: não era repetição do
   exercício." na tela e, com a contagem em voz alta, "Descontei. N."
   (`aoRetirar`). Se o desconto põe a conta abaixo da meta, o fechamento
   automático da série é cancelado.
2. **A amplitude comparada é a da janela de 4 s** (`faixa`), não a medida pela
   histerese: esta só começa no meio da descida da primeira repetição, que saía
   menor que as outras e reprovava a calibração — o contador perdia uma.
3. **Travado, "movimento" com menos de 35% da amplitude das repetições de
   verdade não conta** (mexer na pegada). O cansaço não chega nisso: derruba a
   amplitude para uns 70%.
4. **Andar desconta o que estava em conferência e recomeça a calibração** (`deslocando`, só no modo automático — o
   skater salta de lado de propósito): de lado, o quadril atravessando mais de
   0,6 tronco em 1,5 s; para longe ou para perto do celular, o corpo mudando de
   tamanho **sempre no mesmo sentido** por 3 s, somando mais de 20%. O sentido
   único é o que separa andar de um stiff visto de frente, em que o tronco também
   encolhe na imagem, mas volta.
5. **`zerar()` esquece também a janela**: a amplitude do movimento de se
   posicionar virava a régua da série.
6. **O grupo muscular pesa mais**: o sinal que ele indica ganha se mexer pelo
   menos metade do que mais se mexe (era 80%).
7. **Trocar de sinal durante a calibração não zera nada.** Zerar a histerese no
   meio da primeira repetição a perdia — foi assim que a primeira versão desta
   calibração passou a contar uma a menos em toda série.

Na tela, enquanto a pessoa anda, o rodapé diz "🎯 Andando: a contagem espera
você parar no lugar do exercício".

`teste-contador.js` tem as cenas: sentar e depois 10 repetições, andar de lado e
para longe, ajeitar-se três vezes sem ritmo, mexer na pegada no meio da série, e
a prova contrária do stiff de frente — que **tem** de contar. A versão anterior
reprovava cinco delas.

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

### Enquadramento antes de contar (`avaliarEnquadramento`)

**Com a câmera de trás — que é a melhor das duas — a pessoa não vê a tela.** Ela
apoia o celular, anda para trás e não tem como saber se está no quadro. Antes
disto existir, o jeito de descobrir era fazer a série inteira e ver que não
contou nada.

Então a contagem só começa depois do enquadramento confirmado, e até lá a **voz**
guia: esquerda, direita, aproxime, afaste. Quem usa a câmera da frente vê também
a seta grande e a moldura verde da confirmação.

- **Esquerda e direita são da pessoa, não da imagem.** A câmera vê quem está de
  frente para ela com os lados trocados de sentido: a mão esquerda dela aparece
  do lado direito do quadro. "O corpo precisa ir para a direita da imagem"
  significa "ande para a sua esquerda" — e inverter esse sinal manda a pessoa
  para fora do quadro em vez de para dentro. É o que `teste-enquadramento.js`
  cobra antes de qualquer outra coisa.
- **A seta na tela usa o sentido oposto da voz quando a câmera é a da frente**,
  porque a imagem aparece espelhada. Mesma informação, dois sistemas de
  coordenadas.
- **A medida é dos ombros aos pés**, e acima dos ombros ainda tem cabeça: por
  isso a folga de cima é maior que a de baixo, e o nariz confirma quando dá para
  vê-lo. Num corpo em pé, ombros-a-pés dá cerca de 0,82 da altura total — a
  faixa aceita (0,45 a 0,80) sai daí.
- **Um segundo e meio parado no lugar certo** antes de liberar: sem essa espera,
  passar andando pelo quadro já começaria a contagem.
- **A referência do contador recomeça na confirmação.** O que ele mediu enquanto
  a pessoa andava para se posicionar não é repetição de nada.

Duas saídas, e as duas são obrigatórias:

1. **"Já estou na posição"**, à mão, bem no meio da tela. Quem sabe onde se põe
   não devia esperar aval de ninguém.
2. **Depois de 12 segundos sem confirmar, libera sozinho** e avisa por voz.
   Exercício sentado não mostra os pés e máquina encostada na parede não mostra
   o corpo inteiro — sem esta saída o enquadramento viraria uma porta trancada
   justamente nos exercícios mais comuns da academia.

### Sentado, com as pernas atrás do banco (`EYES_GRUPOS_TRONCO`)

Num treino real de puxada alta, o rodapé dizia "lendo altura do quadril" e a
conta empacava no 1. Eram três defeitos somados, e os três valem para supino
máquina, remada, rosca e desenvolvimento:

1. **O enquadramento esperava os pés.** Nos grupos peito, costas, ombros,
   bíceps e tríceps (fora do funcional, `eyesSoTronco`), ele mede **do quadril
   para cima** (`enquadrarTronco`): ombros, cotovelos e quadril bastam, e o
   tronco precisa ocupar de 15% a 55% da tela. Os 12 s continuam como saída.
2. **O contador lia perna inventada e a altura do quadril.** Perna escondida
   o modelo inventa com visibilidade perto de 0,55 — passa no `visivel` e treme
   o bastante para virar "o que mais se mexe". No automático, sinal de perna só
   vale com a perna bem vista (`EYES_PONTOS_PERNA`, `visivelBem`); a altura do
   quadril saiu do automático (é posição dividida pelo tronco, e na puxada o
   tronco encurta na imagem a cada repetição); e nesses grupos só concorrem os
   sinais do braço (`EYES_SINAIS_TRONCO`).
3. **A última repetição de braço estendido nunca contava.** A histerese só
   contava na volta para "baixo". Puxada, supino e remada descansam com o
   cotovelo aberto, em "cima": cada repetição só entrava na descida da
   seguinte, e a última ficava de fora. Hoje o automático aprende **de que lado
   o movimento descansa** (`polo`: o lado que o sinal deixa ao começar) e conta
   na volta para lá. O funcional continua fixo em "baixo", como o perfil espera.

Contar meio ciclo antes tirou a folga de um caso: andando para longe do
celular, três passadas travavam o padrão antes de o deslocamento ser visto
(ele precisa de uns 3 s). Por isso **andar desconta também o padrão que travou
há menos de 3,5 s** (`m.desde`).

`teste-contador.js` tem a puxada sintética (tronco inclinando, pernas
inventadas tremendo, com e sem saber que é sentado) e `teste-enquadramento.js`
o enquadramento sentado.

**Deitado ou inclinado no banco (supino, supino inclinado).** Relato do dono:
"não está me enxergando, pede para ir a 2 metros, e nenhuma posição consegue
contar". Medido com o **modelo de verdade** (pose_landmarker lite e full,
rodando no Chromium, a foto real do Marombeiro girada a 0°, 45° e 70°, com
barra e anilhas na frente do peito, banco escondendo o quadril, e longe): o
detector viu a pessoa em **todos** os casos. O defeito era o enquadramento,
que pensava em gente sentada ereta: media o tronco só na vertical (inclinado,
encolhe — "aproxime" para sempre) e centralizava só na horizontal (o meio do
tronco inclinado cai de lado — "vá para a sua direita", com a pessoa deitada).
Hoje `enquadrarTronco` mede o tronco na diagonal (`aspecto`, a largura ÷
altura do vídeo), centraliza nos dois eixos com folga (0,3–0,7 e 0,18–0,82),
corta em qualquer borda e manda **virar o celular** em vez de andar. E o "Não
estou te vendo" dos grupos de tronco diz o que serve no banco: celular de lado,
na altura do banco, a uns 1,5 m, do quadril para cima. A contagem já servia
(ângulo do cotovelo não depende de posição): `teste-contador.js` tem o supino
inclinado visto de lado (a 45° e a 75°, um braço escondido, pernas
inventadas) contando 10 de 10, e `teste-enquadramento.js` os casos deitados
— três deles reprovavam a versão anterior.

**Sentado na máquina, de frente (supino declinado na alavanca).** Relato do
dono, com foto da máquina: não contava, e ele desconfiou do ângulo diagonal
encurtando o movimento. A conta não confirmou isso (de frente, na diagonal ou
de lado, o cotovelo varia 57 a 80 graus na imagem). Eram dois defeitos, e o
`teste-contador.js` reproduz os dois com o boneco sentado de frente:

1. **O quadril escondido virava "você está andando".** Atrás do assento e das
   pegadas o modelo inventa o quadril (visibilidade ~0,57) e ele treme; o
   `deslocando` lia o tremor como deslocamento e descontava a série: 3 ou 4
   de 10. Hoje, sem o quadril bem visto (`visivelBem`), a régua do andar são
   os ombros (o meio deles, e a largura como tamanho; o limite de lado vira
   0,8 largura), e `escalaTorso` usa 1,3 × a largura dos ombros quando ela
   aparece (de frente; acima de 0,06).
2. **O antebraço apontado para a lente vira um ponto na imagem**, e o ângulo
   do cotovelo pulava na posição de partida: um falso começo que a calibração
   descontava levando junto a 1ª repetição (9 de 10). Os oito ângulos do
   contador agora saem dos **pontos do mundo, em 3D** (`anguloDe`, com
   `lm.mundo` posto pelo scanner a partir de `worldLandmarks`); sem eles
   (os testes antigos), continua o plano. Medido no modelo real antes de
   adotar: o tremor do ângulo em 3D é o mesmo do plano (1 a 3 graus) e o valor
   não muda com a foto girada (114° e 113°, contra 70° e 61° no plano). A
   visibilidade continua sendo a da imagem.

Achado ao mexer nisto: **o botão de contar pela câmera só aparecia com o Jarvis
ligado.** Ele vivia dentro da condição `ehAlvo`, que exigia `vozAtiva` — então
quem nunca ligou a voz nunca soube que o Eyes Scan existia. Hoje "é a vez deste
exercício" (`ehVez`) e "a voz está ouvindo" (`ehAlvo`) são coisas separadas.

### Um lado de cada vez (`espelhoDe`, `aoTrocarLado`)

Relato do dono, no tríceps unilateral na polia: o primeiro braço contava
certo, o segundo não contava nada. Eram dois defeitos:

1. **O sinal travava no primeiro braço.** O contador escolhe o que mais se
   mexe e, depois da primeira repetição, não troca mais (trocar no meio da
   série perderia a conta). No segundo braço ele continuava olhando o
   cotovelo parado. Hoje, com a conta já andando, ele passa para o **espelho**
   do sinal (`cotovelo-d` ↔ `cotovelo-e`, `espelhoDe`) quando o lado contado
   ficou parado no último segundo e meio (`recenteDe` < metade do `minAmp`)
   e o espelho se mexeu ao menos `minAmp`. A janela de 4 s não serve aqui: ela
   ainda lembra o braço que acabou de parar. **A conta continua; a régua
   recomeça** (`recalibrar`), e o lado novo passa pela calibração como o
   primeiro — é o que impede o giro do corpo na troca de virar repetição. O
   que o lado que parou ainda tinha **em conferência** sai da conta na troca:
   é o outro braço coçando o rosto no meio da série, não o segundo lado.
2. **A série fechava no fim do primeiro braço.** Com 12 na ficha, o
   fechamento automático registrava 12 e desligava a câmera. Nos exercícios
   com "unilateral" no nome ou no id (`uni`, no `ScannerEyes`), a meta é
   **por lado**: a câmera conta até o dobro, diz "12. Troca de lado." na
   metade, e registra o número de um lado (`porLado`: metade do total,
   depois que a troca aconteceu).

`teste-contador.js` tem os dois braços parado no lugar, girando o corpo com
um passo, trocando em 1,5 s, e a prova contrária do braço que coça o rosto.

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
- **Botões fantasma** (`usarFantasma`, pedido do dono): depois do enquadramento,
  3,5 s sem toque deixam ✕, câmera, contar alto, auto e o quadro de calorias
  translúcidos (0,3) — o vídeo é o que importa ali. **O primeiro toque só os
  acende; o segundo age.** De quebra, um esbarrão no ✕ não fecha mais a
  câmera no meio da série. O toque é lido no `onPointerDownCapture` do
  contêiner, antes do clique: o React re-renderiza entre os dois, e o botão
  acharia que já estava aceso. **Não viram fantasma, de propósito**: "Já estou
  na posição" (antes do enquadramento a tela guia), "Registrando em…" (4 s não
  cabem dois toques), o palpite do movimento (aparece sempre) e o contador (é
  o que se lê de longe). Botão novo por cima do vídeo: envolva a ação em
  `fant.agir` e espalhe `fant.estilo`.
- **"Não estou te vendo" só depois do enquadramento**, e sem pegar toque: antes
  ele caía em cima do "Já estou na posição" e engolia o toque justamente de
  quem não estava sendo visto.
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

A marca do app em movimento, em três atos e pouco menos de quatro segundos:

1. A **silhueta azul pontilhada** monta a pose. Ela é o contorno da imagem da
   marca, traçado direto dela (`SILHUETA_ABERTURA`) — nenhum desenho à mão. Por
   isso o esqueleto foi encaixado ponto a ponto nela: a varredura troca um pelo
   outro sem a figura pular.
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
- **O guia do primeiro treino** (`primeiroTreino`) vem antes de tudo: três
  passos numerados — digite o peso, toque no ✓ (o descanso começa sozinho),
  Finalizar treino no fim — e onde ver a execução e trocar o aparelho. Aparece
  só no primeiro treino e some na primeira série marcada. Enquanto ele está na
  tela, a dica da voz espera: antes, a primeira coisa que o app ensinava era
  ditar para o Jarvis, sem ninguém ter dito que bastava digitar e tocar no ✓.

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

**Ela fica na entrada, antes de qualquer tela — decisão do dono.** Chegou a
ir para depois do primeiro treino (para quem chega não desistir) e voltou, a
pedido dele: o perfil no Instagram é o que sustenta o app, e é o pedido no
primeiro contato que traz seguidores. **Não mude de novo sem falar com ele.**
O que ficou da ida e volta: "Seguir e baixar o app" é o botão principal, e o
entrar virou um link discreto, "Já sigo — entrar no app →". Discreto, nunca
escondido (ver o looping abaixo). O rodapé "seus treinos continuam salvos" só
aparece com treino no histórico: as fichas que vêm prontas não contam.

A tela que pede para seguir. **Ela não verifica nada, e isso éA tela que pede para seguir. **Ela não verifica nada, e isso é
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

## Gravar não pode falhar calado

`store.set` devolve se gravou. **Antes ele engolia a falha**: quando o
`localStorage` recusa a escrita — cota cheia, janela anônima, armazenamento
bloqueado, navegador embutido — o app guardava na memória e seguia se
comportando como se tivesse salvado. Marcava a série, mostrava o histórico,
comemorava o recorde. A pessoa só descobria ao reabrir, com tudo perdido e sem
nunca ter visto um aviso.

Num app em que os dados vivem só no aparelho, esse é o pior defeito possível.
Hoje a falha vira uma **faixa vermelha fixa no topo, sem botão de fechar**, cujo
único caminho é baixar o backup. Quem está treinando sem saber que nada está
sendo salvo precisa tropeçar nisso.

A checagem vale nos dois caminhos de gravação: o respiro de 400 ms e a descarga
de emergência do `pagehide`.

## Os últimos 12 meses (`MapaDoAno`, `contarAnoDeTreino`)

Um quadradinho por dia, um ano inteiro de uma vez, em Histórico › Números.
O `CalendarioTreinos` logo abaixo mostra **um mês por vez** e responde "em
que dias treinei neste mês". Este responde a outra pergunta, que é a que faz
alguém mudar de hábito: **eu sou constante, e quando foi que eu parei?** A
falha de três semanas em julho não aparece em calendário de mês nenhum — é
preciso ter o ano à vista para ela saltar.

**A ideia veio do openGym; o código não.** Aquele projeto é AGPL-3.0, que é
copyleft forte: copiar um trecho obrigaria o Treino Livre inteiro a virar
AGPL. Função e ideia não têm dono; código tem. Se um dia alguém for buscar
mais coisa de lá, a regra é a mesma — ler, entender, escrever aqui.

- **A régua é o tempo, não o volume.** Volume é a unidade da musculação e
  vale zero no aeróbico: 40 minutos de corrida apareceriam como dia vazio.
  Minuto vale igual nos dois, e o `duracaoMin` já tem teto de 300 — uma
  sessão esquecida aberta não estica a escala do ano inteiro. Treino sem
  `duracaoMin` (histórico antigo, aula interrompida) conta como 1 minuto:
  sem esse piso o mapa diria que não houve treino num dia em que houve.
- **As faixas saem dos quantis de quem treina, não de uma tabela fixa.** É a
  mesma regra do mapa do percurso pintado por ritmo, e pelo mesmo motivo: 25
  minutos é dia cheio para quem faz funcional e é aquecimento para quem faz
  musculação. Com corte fixo, o mapa de um sairia todo claro e o do outro
  todo escuro. `teste-ano.js` prova isso pela invariância — a mesma rotina
  feita em dez vezes o tempo sai com **exatamente** o mesmo desenho.
- **A conta é um bloco puro** (`contarAnoDeTreino`, entre marcadores), e
  recebe `agora` por parâmetro em vez de ler o relógio: sem isso o teste
  passaria em outubro e reprovaria em novembro. O componente só desenha.
- Abre rolado até o fim: o que interessa é como está agora, não janeiro.

Coberto por `teste-ano.js` (32 checagens).

## O músculo que você parou de treinar (`musculosEsquecidos`)

Segundo modo do cartão de músculos, em Histórico › Números.
`recuperacaoMuscular` responde "o que posso treinar HOJE": tudo com dois
dias ou mais sai como "pronto". Certo, e inútil para um grupo que não é
tocado há dois meses — ele aparece como pronto, igual ao de anteontem, e
some no meio da lista. A pergunta que faltava é **o que eu parei de
treinar?** Ideia do openGym ("detrained"); código daqui, pelo mesmo motivo
de licença da seção acima.

- **A régua é o ritmo da própria pessoa.** Quem treina seis vezes por
  semana volta a cada grupo a cada 3 ou 4 dias; quem treina duas, a cada 7
  ou 10. Um corte fixo em 14 dias chamaria o primeiro de relapso e daria
  alta ao segundo. Cada grupo é comparado com o **intervalo mediano daquela
  pessoa naquele grupo** — mediana, e não média, porque uma viagem de três
  semanas no meio do ano não pode virar o normal dela. 1,6× ainda é a vida
  acontecendo; 3× já é outra rotina. Com menos de três sessões não há ritmo
  para medir, e aí vale uma semana.
- **Três semanas é parar, em qualquer ritmo** (`TETO_PAROU_DIAS`): o teto
  existe para quem treinava um grupo a cada 15 dias não ouvir que está tudo
  bem aos 40.
- **"Nunca treinou" não se mistura com "parou"**, e vem por último: um é
  hábito que nunca existiu, o outro é hábito perdido, e só o segundo é
  alerta.
- Aeróbico não conta como treino de grupo, como no `seriesSemanaisPorGrupo`.
- Cada linha é um botão que abre a lista daquele grupo (`onAbrirGrupo`, o
  mesmo da tela inicial): sem isso seria um relatório, não um caminho.

**Dois modos no cartão, não três:** "o que treinar hoje" já é a
`OQueTreinarHoje` da tela inicial, e repetir aqui seria o mesmo cartão duas
vezes. Estes dois respondem perguntas diferentes — para onde o esforço foi,
e o que ficou de fora.

Coberto por `teste-esquecidos.js` (28 checagens).

## O antes e depois das fotos (`AntesDepois`, `textoIntervalo`, `pesoPerto`)

Botão **⇆ Antes e depois** no cartão de fotos, a partir de duas fotos.
Duas imagens lado a lado quase não dizem nada — o corpo muda devagar e a
memória de como a pessoa estava em março é péssima. Sobrepostas, com a
divisória correndo entre elas, a mudança aparece. Ideia do openGym.

- **O que faz valer são os dois números embaixo**, não a imagem: quanto
  tempo passou e quanto a balança mudou. Sem isso são duas fotos.
- **`textoIntervalo` sai das duas datas, não da diferença em milissegundos.**
  Mês não tem duração fixa, e dividir por 30 erra uma semana por semestre.
  O corte entre "dias" e "meses" é por mês de calendário: com "menos de 60
  dias vira dias", 15 de janeiro a 15 de março — dois meses cravados, e 59
  dias — saía como "59 dias". 31/ago a 30/out não vira "2 meses".
- **`pesoPerto` tem janela de 14 dias.** Ninguém se pesa no dia da foto;
  pegar a pesagem de dois meses depois e chamá-la de "o peso da foto" seria
  inventar um resultado que não aconteceu ali.
- `objectFit: contain`, não `cover`: recortar duas fotos de proporções
  diferentes em quadrados iguais muda o corpo de tamanho entre uma e outra,
  e aí a comparação mostra uma mudança que não houve.

Coberto por `teste-fotos.js` (24 checagens).

## Trazer o histórico de outro app (`interpretarCsvTreinos`)

Cartão **Vim de outro app** em Ajustes, junto do backup. Quem já treina há
dois anos tem dois anos de histórico em outro aplicativo, e recorde,
evolução, sugestão de carga e nível saem todos do histórico: sem importar,
o Treino Livre é um caderno em branco para quem já escreveu um caderno
inteiro. Ideia do openGym; código daqui.

**Mapeia por NOME de coluna, nunca por posição** (`COLUNAS_IMPORT`,
`PESOS_IMPORT`). Os três formatos têm variantes, e a posição muda entre
elas:

| App | Cabeçalho | O que complica |
|---|---|---|
| Strong | `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,…` | **não diz a unidade**; versão antiga usa `;` e tem coluna de unidade |
| Hevy | `title,start_time,…,exercise_title,set_index,set_type,weight_kg\|weight_lbs,…` | a unidade está no nome da coluna — o melhor dos três |
| FitNotes | Android `…,Weight,Weight Unit,Reps,…` · iPhone `…,Weight (kg),Weight (lbs),…` | no iPhone as **duas** colunas de peso existem, e vale a preenchida |

Por isso o peso é uma **lista** de colunas candidatas, cada uma com a
unidade que o próprio nome revela. A ordem de quem manda: o nome da coluna,
depois a coluna de unidade da linha, e só então a escolha da tela.

As decisões que protegem o histórico de quem importa:

1. **A unidade não é adivinhada.** 225 libras são 102 kg; lidas como quilos
   viram um supino de 225 kg que ninguém fez — e a partir dele a sugestão de
   carga passa a mandar o dobro. Sem coluna de unidade, a tela **pergunta**.
2. **Casar nome de exercício é estrito** (`acharExercicioImportado`): só
   nome igual, sem acento, sem caixa e sem o que está entre parênteses, ao
   nome daqui ou ao nome em inglês do wger. Um palpite errado é pior que um
   "não reconhecido": junta o histórico de duas máquinas num exercício só, e
   ninguém descobre. O que não casa vira exercício da pessoa, com o nome
   original.
3. **O grupo do exercício novo é escolhido na tela**, com palpite
   (`grupoPalpiteImport`). A busca do app exige que todas as palavras casem,
   e nome de máquina ("Hammer Strength Iso Row") nunca casa inteiro — então,
   sem resultado, **vale a palavra**: quase todo nome traz o movimento
   dentro (row, press, curl, fly, pulldown). **Palavra de equipamento e de
   marca não vota** (`PALAVRAS_SEM_GRUPO_IMPORT`) — é a mesma lição do
   `PALAVRAS_DE_APARELHO` do Jarvis: "machine" casa com dezenas de
   exercícios, a maioria de perna, e punha toda máquina em Pernas. Sem
   sinal nenhum a linha sai marcada **⚠ confira o grupo**, em vez de chutar
   calado — o grupo decide o mapa muscular, as séries da semana e o
   "parou de treinar".
4. **A data não pode andar um dia.** `new Date("2026-03-14")` é meia-noite
   em UTC, que no Brasil é dia 13 às 21h: o treino muda de dia sozinho. As
   partes são montadas à mão, na hora local.
5. **É CSV de verdade** (`lerCsv`, RFC 4180): nome de exercício com vírgula
   dentro de aspas desloca TODAS as colunas da linha num `split(",")`.
   `numeroCsv` separa "82,5" (oitenta e dois e meio) de "1,234.5" (mil
   duzentos e trinta e quatro e meio).
6. **Reimportar não duplica**: o id do treino sai do conteúdo
   (`idDeImportacao`, `imp-…`), então o mesmo arquivo chega com os mesmos
   ids das duas vezes.
7. **Dá para desfazer**, e por isso não há aviso de "não tem volta": aviso
   não conserta dado nenhum. O desfazer usa **o que aquela importação
   acrescentou**, e não o que o arquivo continha — achado no navegador:
   com dois arquivos que se cruzam, desfazer o segundo levava junto os
   treinos do primeiro.

Coberto por `teste-importar.js` (80 checagens).

## Evolução por exercício (`EvolucaoExercicio`)

"Estou melhorando no supino?" é a pergunta que faz alguém abrir um app de treino
num sábado à tarde. O dado sempre esteve no histórico — a única forma de ver era
rolar treino por treino.

Entrada pelo botão **📈 Minha evolução** no detalhe do exercício, que diz em
quantos treinos ele já apareceu e fica desligado quando ainda não apareceu em
nenhum: botão que promete o que não tem é pior que botão que falta.

- **Uma sessão vira um ponto**, e a carga do ponto é a **maior daquela sessão**,
  não a média. Progressão de força se lê pelo topo; a média despenca só porque a
  pessoa fez uma série leve no fim.
- Três leituras no mesmo gráfico: carga máxima, volume e repetições.
- **Aquecimento não entra** (`serieConta`), nem no ponto nem na contagem de
  séries. Uma série de aquecimento pesada inventaria um recorde.
- **Isometria entra por tempo**, não por carga: a prancha mostra segundos.
- O 1RM estimado aparece como referência e o texto diz que é referência —
  ninguém precisa testar uma repetição máxima para saber que está progredindo.

Coberto por `teste-evolucao.js`.

## Aeróbico (esteira, bicicleta, elíptico, escada, remo, rua, piscina)

19 exercícios com `cardio`, o **perfil** da modalidade. `PERFIS_CARDIO` diz, para
cada perfil, os campos que aparecem na série — **os números que o painel daquele
aparelho mostra** — e a frase de exemplo para o Jarvis:

| Perfil | Campos | Conta do gasto |
|---|---|---|
| `caminhada`, `corrida` (esteira) | km/h, inclinação | ACSM caminhada/corrida |
| `rua-caminhada`, `rua-corrida` | km | ACSM, com a velocidade saindo de km ÷ tempo |
| `trilha` | km | Compendium (6 MET) |
| `bike-rua` | km | Compendium pela velocidade média |
| `bike` (vertical, horizontal, spinning, air bike) | watts, nível | ACSM do cicloergômetro |
| `bike-braco` | watts | ACSM do ergômetro de braço |
| `eliptico` | nível, passos/min | Compendium (5 MET) — não há equação com o painel |
| `escada` (stepmill, escadaria) | nível, degraus/min | ACSM do step, degrau de 20 cm |
| `remo`, `ski` | watts, remadas/min | Compendium pelos watts |
| `corda` | saltos/min | Compendium pela cadência |
| `natacao` | metros | Compendium pelo ritmo por 100 m |

**Sem o número do painel, vale a média do Compendium** para o aparelho, e a tela
diz isso (`estimado`). Ninguém fica sem diagnóstico por não ter anotado os watts.

**A série grava o perfil** (`mod`): `{ segundos, mod, watts, nivel }`. É o que faz
uma série de elíptico só com o tempo continuar sendo aeróbica — sem ele, ela seria
lida como isometria. A esteira de antes do `mod` (só `vel` e `incl`) continua
reconhecida. **Copiar série passa sempre por `copiaCardio`**: copiar campo a campo já
apagou a velocidade da esteira no histórico uma vez.

O painel (`destaquesCardio`) mostra a régua de cada modalidade: min/km de quem
anda e corre, km/h de quem pedala na rua, min/100 m de quem nada, min/500 m do
remo (a fórmula do Concept2, que sai dos watts), watts ou cadência nos aparelhos
que não andam. `DICA_CARDIO` tem a dica de cada um.

Pela voz, "pedalei 30 minutos a 120 watts", "nadei mil metros em 25 minutos",
"elíptico 30 minutos nível 8". Sem o nome do aparelho e sem aeróbico na ficha,
`aerobicoDaFrase` deduz pelo verbo e pelos números (watts é bicicleta, metros é
piscina). "Aeróbico" é também um filtro na lista de exercícios
(`FAMILIAS_EQUIP`), que olha o `cardio` em vez do equipamento.

**Achado ao testar no navegador, e que nenhuma suíte pegaria:** um renomear
global de `ehEsteira` apanhou também `ehEsteiraPerfil`, e a tela do treino caía
com "is not defined". O `verificar.js` prova que o JSX compila, não que o
componente desenha. Mexeu em componente, abra a tela.

### Esteira (caminhada e corrida)

Três exercícios: `esteira-caminhada`, `esteira-inclinada` e `esteira-corrida`.
O campo `cardio` ("caminhada" ou "corrida") é o que os diferencia de musculação,
e `padrao` (`{ min, vel, incl }`) é o que entra na primeira vez.

**A série é uma série de tempo com dois campos a mais:** `{ segundos, vel, incl }`
— velocidade em km/h e inclinação em %, os dois números que o painel da esteira
mostra. Por continuar sendo de tempo, tudo o que já sabia lidar com a prancha
funciona sem saber que esteira existe. `ehCardio(s)` é o que olha os campos a
mais. **Todo lugar que copia uma série precisa levar `vel` e `incl` junto** —
o `finalizarSessao` gravava só `{ segundos }` e teria apagado a velocidade de
todo treino de esteira no histórico.

- **Distância e ritmo saem de tempo × velocidade.** A pessoa não digita distância:
  o painel da esteira já diz a velocidade, e é ela que se ajusta durante o treino.
  Pela voz dá para ditar distância ("andei 3 km em 30 minutos") e a velocidade sai
  da conta.
- **Gasto pela equação do ACSM** (`medirCardio`), a referência dos
  fisiologistas: caminhando, VO2 = 0,1·v + 1,8·v·i + 3,5; correndo, 0,2·v +
  0,9·v·i + 3,5. Correr gasta o dobro por metro na horizontal, então errar o tipo
  dobra o número: acima de 7 km/h é corrida sempre; entre 6 e 7, vale o exercício
  escolhido. O peso é o da última pesagem (`pesoCorporal`), ou 75 kg com o aviso
  dizendo isso.
- **Intensidade pela OMS** (`intensidadeCardio`): abaixo de 3 MET é leve e não
  conta para a meta; de 3 a 6, moderada; acima de 6, vigorosa, que vale em dobro.
  A meta da semana é 150 min (`META_CARDIO_SEMANA`, `cardioDaSemana`).
- **Várias séries são um intervalado** (5 min andando, 2 correndo...): a
  intensidade é a média pesada pelo tempo (`resumoCardio`).
- **Na ficha, "repetições" viram minutos.** Velocidade e inclinação vêm da última
  vez (`sugerirCarga`); a esteira **não sobe sozinha** — ali quem decide se é dia
  de forçar é o fôlego.
- **Esteira não é treino de perna** para `seriesSemanaisPorGrupo` e
  `recuperacaoMuscular`: 30 minutos de caminhada não são 1 série de quadríceps,
  nem deixam a perna "descansando" no dia seguinte.
- **No fim do treino** aparece "🏃 Esteira: 3,3 km em 20 min · ~327 kcal", e não
  "1200s de isometria". Ficar mais tempo na esteira não dispara a festa de
  recorde da prancha ("você segurou mais 600 segundos"): o maior tempo fica no
  selo "mais longo".

`PainelCardio`, dentro do cartão do exercício no treino, é o diagnóstico: distância,
ritmo (min/km), calorias, intensidade com a explicação, os minutos da semana na
conta da OMS, a comparação com a última vez e uma dica quando cabe (1% de
inclinação na corrida compensa a falta de vento; caminhada inclinada gasta perto
de uma corrida leve com menos impacto).

Voz: "Jarvis, corri 20 minutos a 9 por hora", "30 minutos velocidade 6
inclinação 5", "caminhada de meia hora a 5,5". `cardioDito` vem **antes** da
série comum — "a 9 por hora" seria lido como 9 quilos —, e uma frase de esteira
sem o nome do exercício vai para a esteira da ficha, ou cria uma.

Coberto por `teste-cardio.js`, com os números da equação feitos à mão.

### A voz fala as estatísticas (`relatoCardio`)

Quem anda na esteira de fone, olhando para a frente, não vê o painel do app.
Então os números que a tela mostra também são ditos:

- **Ao marcar a série** (✓, fim do cronômetro ou ditada): "Série 1 de 2
  anotada. 3 quilômetros em 30 minutos, ritmo de 10 minutos por quilômetro,
  cerca de 152 calorias, intensidade moderada. Na semana, 90 de 150 minutos da
  meta." — a semana já soma o que foi feito hoje. Ditada ao Jarvis, a
  confirmação ganha o ritmo e a intensidade.
- **Durante o cronômetro**: cada quilômetro ("2 quilômetros. Faltam 10
  minutos."), a metade com a distância até ali, e "Último minuto". O aviso de
  prancha ("faltam 10 segundos") não serve aqui.
- **Os avisos do cronômetro não dependem mais do microfone**: saem por
  `falarRef` (Jarvis ouvindo → resposta dele; senão → `narrarVoz`). Antes, a
  "metade" da prancha só era dita com o Jarvis ligado.

`falaRitmo` é para ritmo o que `textoDuracao` é para tempo: "10:30 /km" se
escreve, "10 minutos e 30 por quilômetro" se fala. Coberto em `teste-cardio.js`.

### Resumo animado (`ResumoAnimado`, `BotaoResumoAnimado`)

Os números de **qualquer treino** contados no estilo da abertura: fundo `#060606`, a
**linha verde de leitura descendo e revelando cada cena** (o recorte e a linha
usam a mesma duração e a mesma curva da régua da abertura — é isso que faz a
linha parecer escrever a cena), números no degradê da marca subindo do zero,
barras de progresso de story no topo e, no fim, **o halter da abertura entrando
de frente** com o nome do app. Mesma identidade, para o resumo parecer do
Treino Livre e não um relatório.

- **Cenas** (`cenasResumo`), nesta ordem, e cena sem número para mostrar não
  entra (treino só de esteira não tem volume; treino só de força não tem
  distância):
  - abertura: nome do treino, dia, exercícios e duração;
  - **força**: volume (em toneladas a partir de 10 t, com a equivalência do
    app: "o mesmo que 5,8 carros populares"), séries com repetições e carga
    máxima, **músculos trabalhados** em barras por séries (a régua do
    `seriesSemanaisPorGrupo`, que conta também exercício sem carga), recordes
    pessoais com os nomes (`calcularRecordes`) e a comparação de volume com o
    treino anterior de mesmo nome (`compararAnterior`);
  - **aeróbico** (no treino misto o rótulo diz "Aeróbico ·"): distância ou tempo,
    ritmo (km/h na bicicleta; inclinação e subida quando houver), gasto com a
    régua de intensidade da OMS, anel da meta da semana, **o traçado da rua**
    (pontilhado azul da silhueta, coberto pelo verde que se desenha) e a
    comparação com a última vez;
  - **nível** (`nivelDe`, contando os treinos até aquele dia), total de
    treinos e a sequência — só num treino de hoje, porque ela é contada até
    hoje;
  - o fecho com o halter.
- **Cada cena é falada, e só sai quando a fala acaba.** A primeira versão
  usava um relógio fixo por cena, estimado pelo número de palavras, e a voz de
  cada aparelho tem o seu ritmo: no celular do dono a cena seguinte cortava a
  frase no meio. Hoje `jarvisFalar` aceita `aoTerminar`, a cena espera o fim
  da fala mais um respiro de 0,7 s (e nunca menos de 2,6 s, o tempo da
  animação), e o relógio virou só rede de segurança — o dobro do estimado —
  para navegador em que o `onend` não chega. `jarvisFalaAtual` segura a fala
  no ar: no Chrome, fala sem referência é recolhida pela memória e o `onend`
  some. Com 🔇, volta o relógio (`ms`). Toque avança (cortando a fala da cena
  que sai); no terço esquerdo, volta.
- **As contas são as do resto do app** (`dadosResumo` usa `calcularRecordes`,
  `compararAnterior`, `resumoCardio`, `cardioDaSemana`, `nivelDe`): o resumo
  nunca pode dizer um número diferente da ficha ou do histórico. O histórico que
  entra pode ou não conter o próprio treino: ele é tirado e recolocado.
  A semana é a **do treino**, não a de hoje — revisto no histórico, ele fala da
  semana em que aconteceu.
- **Entradas**: **"▶ Ver resumo animado" no resumo do fim do treino** (o botão
  principal dali; o do story passou a ser o secundário), o cartão de qualquer
  treino no histórico, o painel da esteira (com série feita) e o fim do
  percurso na rua (antes de salvar). O do fim do treino abre no componente
  raiz (`resumoAnim`), porque o modal que tem o botão fecha ao tocar.
- `prefers-reduced-motion`: sem varredura, números já no valor final.

### O resumo vira vídeo para o story (`GerarStoryResumo`)

O 📸 no topo do resumo (e o botão "Compartilhar no story" na última cena) gera
um **vídeo 1080×1920, narrado**, com as mesmas cenas, mostra o vídeo com som
para conferir, e abre a janela de compartilhar do celular — no Instagram, é
escolher Story.

**A primeira versão falhou no Instagram, dos dois jeitos que o dono relatou:**
o vídeo não rodava inteiro e a narração não ia junto.

1. **Não rodava inteiro** porque o `MediaRecorder` do Chrome grava MP4
   **fragmentado** (pedaços de meio segundo, `moof`, sem a duração no
   cabeçalho), e o Instagram lê o começo e para. Hoje cada quadro é desenhado
   no seu tempo exato, codificado pelo `VideoEncoder` (WebCodecs) e montado
   pelo **mp4-muxer** (`fastStart: "in-memory"`): um MP4 comum, `moov` antes
   do `mdat`, 30 quadros por segundo cravados (`montarMp4`). De quebra, sai
   mais rápido que o tempo real.
2. **A voz do navegador não passa por nada que dê para gravar** — não existe
   jeito de capturar o `speechSynthesis`. Então a narração é feita **por uma
   voz neural em português rodando no aparelho**: Piper, voz `pt_BR-faber-medium`
   (fonemas pelo espeak-ng em WASM, `@diffusionstudio/piper-wasm`; a voz pelo
   `onnxruntime-web` 1.18). **Não é a mesma voz do Jarvis** na tela — é a única
   que dá para pôr dentro de um arquivo sem servidor.

O que decide como isso funciona:

- **São uns 90 MB, baixados uma vez** (modelo 63 MB, espeak 18 MB, onnxruntime
  10 MB), e só para quem escolhe "Com a narração" — a tela pergunta antes, e diz
  o tamanho. Ficam no cache **`treinolivre-voz`**, que o `activate` do `sw.js`
  preserva: apagar a cada versão do app obrigaria a baixar tudo de novo. Os
  arquivos grandes quem guarda é o app (`baixarVoz`, que mostra o progresso); o
  service worker só serve desse cache e guarda os scripts pequenos. Com a voz já
  guardada, o 📸 começa direto, com narração.
- **Versões presas e SRI** nos três scripts (onnxruntime, phonemize, mp4-muxer),
  do jsDelivr, que serve o arquivo do npm byte a byte. O modelo vem da revisão
  `v1.0.0` do `rhasspy/piper-voices` no Hugging Face.
- **Os números dos fonemas são montados aqui**, pela `phoneme_id_map` do
  próprio modelo (`^`, cada fonema seguido de `_`, `$`). Os que o espeak devolve
  seguem a tabela das vozes novas: num modelo com outra tabela o onnxruntime
  para com "Gather ... indices" — foi o que aconteceu no primeiro teste.
- **Uma thread só** (`numThreads = 1`): o GitHub Pages não manda os cabeçalhos
  de isolamento, e sem eles não há SharedArrayBuffer.
- **Cada cena dura a sua frase** (`videoDuracoes(cenas, falasMs)`): entra 0,25 s
  depois da cena e sai 0,45 s depois da frase. **O story tem 60 s**: passou de
  58,5 s, a narração é refeita mais ligeira, na medida do que sobra
  (`STORY_MAX_MS`), até o limite de 0,72 do ritmo normal, abaixo do qual a voz
  embola.
- `textoParaVozNeural`: "5.770" vira "5770" (senão o espeak lê "5 ponto 770").
- **H.264 + AAC** quando o aparelho tem (é o que o Instagram toca em qualquer
  lugar); VP9 e Opus dentro do MP4 só onde não há.
- **Sem WebCodecs** (iPhone antes do iOS 16.4) volta o `MediaRecorder`, agora sem
  fatias e com a narração tocada no próprio fluxo de áudio. Sem nenhum dos dois,
  sai a imagem (`imagemResumo`). **A voz não carregou** (sem internet, sem
  espaço): o vídeo sai sem narração, e a tela diz isso.
- **Compartilhar é um segundo toque, de propósito.** O navegador só abre a
  janela de compartilhar logo depois de um toque, e montar o vídeo leva mais
  que isso. Sem a janela (computador), o vídeo é baixado.
- Enquanto gera, a apresentação para: nem fala nem avança por baixo.

Testado no Chromium (que não tem H.264 nem AAC: saiu VP9 + Opus), com a voz
`pt-br-edresson-low` no lugar da faber (o Hugging Face não responde na sessão
da nuvem): MP4 de 57,9 s, `moov` antes do `mdat`, nenhum `moof`, a trilha de
áudio com as falas de 0,6 s a 56,5 s, e os quadros conferidos pelo ffmpeg.
**No celular é que se confere a faber, o H.264 e o AAC** (item 33z).

**O mapa por cima de tudo.** O Leaflet põe as camadas em z-index 400 a 1000, e o
mapa ao vivo do percurso aparecia **por cima** do resumo. O `div` do mapa leva
`isolation: isolate` e `zIndex: 0` — vale para o `ModalRota` também, e para
qualquer janela que um dia se abra sobre um mapa.

## Percurso na rua (GPS e mapa)

Caminhada, corrida, pedalada e trilha com o GPS do celular, no mapa do
OpenStreetMap — nome de rua, prédio, bairro e cidade, sem chave e sem conta.
Entrada pelo botão **🗺 Caminhada ou corrida na rua (GPS)** na tela inicial
(fora do `temFichas`, como o funcional), aba `percurso`, `TelaPercurso`.

- **O mapa (Leaflet 1.9.4, do unpkg, com SRI) só carrega quando a tela abre**
  (`carregarMapa`), como o Eyes Scan. Fica no cache do service worker; **os
  pedaços do mapa e a busca de endereço não** — o `sw.js` deixa
  `tile.openstreetmap.org` e `nominatim.openstreetmap.org` passarem direto, senão
  cada lugar visitado viraria um arquivo guardado para sempre.
- **Endereço pelo Nominatim** (`buscarEndereco`, `enderecoDe`): a regra deles é
  no máximo um pedido por segundo; aqui é um no começo, um no fim e um a cada
  400 m. Daí saem "Saída", "Chegada", as ruas e os bairros por onde passou.
- **O filtro do GPS** (`aceitarPonto`): precisão pior que 35 m fica fora; ponto
  a menos de 4 m do anterior é tremor de quem está parado; velocidade
  impossível para a modalidade, **descontada a incerteza dos dois pontos**, é
  salto. Oito saltos seguidos querem dizer que o errado era o ponto de antes, e o
  trecho recomeça dali. **Ponto muito mais preciso que o anterior toma o lugar
  dele** ("substitui"): o GPS acha a pessoa com ±30 m e melhora para ±8 m, e ligar
  os dois inventava dezenas de metros.
- **A distância é medida em cordas de 12 m** (`ROTA_CORDA_M`), não ponto a ponto.
  Somar ponto a ponto mede o zigue-zague do erro do GPS como caminho: numa
  corrida simulada de 3 km, dava 3,6. É o defeito mais caro deste módulo, e foi
  o teste que o achou.
- **O tempo é o tempo em movimento** (`tempoEntre`): mais de 15 s parado conta
  15 s — a pausa automática do semáforo. Mais de 15 s **andando** (a tela apagou
  e o GPS sumiu) conta inteiro e vira `lacunaMs`.
- **Com a tela apagada o navegador para o GPS**, e uma página web não contorna
  isso. A tela fica ligada (`ligarTravaTela`), o **modo bolso** deixa ela preta
  (OLED apagado gasta quase nada), e quando acontece a tela avisa e o resumo diz
  quanto tempo entrou em linha reta. **Não prometa gravação com a tela
  bloqueada**: só um app nativo faz isso.
- **A rota vai para o IndexedDB** (`guardarRota`, chave `rota-<id>`, a loja das
  fotos), no formato de linha do Google Maps (`compactarRota`): uma hora cabe em
  uns 20 KB. O resumo (km, tempo, ritmo, parciais, subida, ruas, bairros) vai em
  `historico[].rota`, e a série entra como aeróbico comum (`{ segundos, mod, km }`)
  — assim meta da semana, calorias e evolução funcionam sem saber de GPS. A rota
  é gravada **antes** do registro. O backup em arquivo leva as rotas
  (`rotasDados`).
- A voz avisa cada km com a parcial, e "Jarvis, pausa / continua / como estou /
  encerra" conduzem pelo mesmo `CONTROLE_AULA` da aula guiada.
- No histórico, **🗺 Ver percurso no mapa** (`ModalRota`).

`teste-rota.js` simula corridas em coordenadas da Avenida Paulista com ruído:
3 km a 6:00/km, semáforo de 60 s, salto de um quarteirão, ponto impreciso,
começo impreciso, pausa, 3 minutos de tela apagada, morro e plano tremendo.

## O corredor (`TelaCorredor`, `AnaliseCorrida`, aba `corredor`)

Pedido do dono: "coloque o máximo de dados que os corredores usam". Ele conhecia
só o pace. Então cada número vem com uma frase que diz o que ele é
(`GLOSSARIO_CORRIDA`, no botão "O que é cada número?"): número sem explicação
não atrai ninguém.

**As contas** ficam num bloco puro, entre `CORRIDA: AS CONTAS DO CORREDOR` e o
fim dele, cobertas por `teste-corrida.js` (39 checagens):

| Número | De onde sai |
|---|---|
| Melhores esforços (400 m, 1 km, milha, 5 km, 10 km, meia, maratona) | janela corrida sobre o percurso (`melhoresEsforcos`), nas mesmas cordas de 12 m e no mesmo tempo em movimento do `resumoRota`; na esteira, do ritmo médio da série (`esforcosDeSerie`) |
| VO2máx estimado (VDOT) | Daniels & Gilbert (`vdotDe`), o melhor esforço de 1,5 km para cima das últimas 8 semanas. O teste confere contra a tabela publicada (VDOT 50 = 5 km em 19:57) |
| Previsão de prova | o tempo que o VDOT prevê (`tempoPrevisto`, busca binária) |
| Ritmos de treino | fácil, maratona, limiar, intervalado e repetição (`ritmosDeTreino`) |
| Ritmo ajustado ao relevo (GAP) | custo de Minetti (2002): cada metro subido vale uns 6,6 m de plano, cada metro descido devolve uns 4 (`distanciaPlana`). Na esteira, a inclinação vira o "pace equivalente no plano" (`fatorInclinacao`) |
| Cadência e passada | o acelerômetro (`devicemotion`), um passo por subida acima da média recente, com histerese e no máximo um a cada 240 ms (`criarContadorPassos`). Só conta com a corrida rodando. **O iPhone exige pedir permissão num toque**: é pedida no "Começar" |
| FC média, máxima e zonas | a cinta Bluetooth que já existia, amostrada a cada segundo no percurso. FC máxima por Tanaka (208 − 0,7 × idade); a idade fica em `corredor.idade` (persistida e no backup). Buraco de sinal conta no máximo 5 s |
| Split negativo | a segunda metade mais rápida que a primeira (`metades`) |
| Carga | km dos últimos 7 dias ÷ média semanal das últimas 4 (aguda:crônica, faixa ideal 0,8–1,3) e o aumento contra a semana anterior (regra dos 10%) |

- **Corrida e caminhada têm recordes separados** (`tipoCorrida`): o 5 km
  caminhado não compete com o corrido. Caminhada não dá VDOT: ela não mostra o
  limite de ninguém. Pedalada fica de fora de tudo isso.
- **A primeira vez numa distância é estreia, não recorde** (`recordesNovos`).
- O percurso guarda a análise em `historico[].rota` (`esforcos`, `gap`,
  `melhorKm`, `metades`, `passos`, `cadencia`, `passada`, `fc`, `vdot`,
  `decorridoMs`). Percurso antigo, sem esses campos, continua abrindo; a
  análise só aparece nos novos.
- A voz do km ganha a cadência e o batimento.
- **Entradas do painel**: Histórico › Números, a tela de preparo do percurso e
  o painel da esteira dentro do treino. Não na tela inicial (regra dela).
- O resumo animado ganhou a cena "Recordes de corrida" quando o treino bateu
  algum.

## Metas, esforço relativo e forma (`CartaoMetas`, `CartaoForma`)

Pedido do dono: um lugar para estabelecer meta na corrida e na caminhada, e
os parâmetros que Garmin e Strava usam e que ainda faltavam aqui.

Tudo mora em `corredor` — que já era o perfil do corredor e já é persistido,
carregado e levado no backup. Um campo em vez de cinco pontos de integração
novos. **Em troca, os quatro carregadores precisaram de conserto**: eles
remontavam o objeto à mão (`{ idade: ... }`) e descartavam todo o resto, então
uma meta seria gravada e sumiria na recarga seguinte, calada. Hoje existe
`lerCorredor`, e campo novo entra num lugar só.

### As metas

**Correr sem meta é o que a maioria faz, e está certo.** Por isso o cartão
fechado é uma linha só: quem não treina para nada não vê barra de progresso
nenhuma. Ele cresce quando alguém pede.

- Quatro medidas (`MEDIDAS_META`: distância, tempo, subida, atividades) em
  três períodos (`PERIODOS_META`: semana, mês, ano). **Medida sem alvo não
  aparece** — meta que não foi pedida é enfeite.
- O que a meta existe para responder não é "quanto já fiz", é **"estou em
  dia?"**. Daí `emDia` (ter feito a fatia do período que já passou), `porDia`
  (quanto falta por dia restante) e `projecao` (onde o período fecha no ritmo
  de até aqui). Número que já é a decisão, em vez de número que exige fazer a
  conta de cabeça na rua.
- **O dia de hoje conta como dia restante**: ainda dá para correr hoje.

### A prova alvo

A meta que muda o treino inteiro, e a única que o app pode responder com
honestidade: ele já sabe estimar o VDOT de quem corre e já sabe prever tempo a
partir dele. `planoProva` compara o tempo desejado com o que o condicionamento
de hoje prevê, diz de quantos pontos de VDOT é a diferença e se o prazo
comporta (`viavel`: `ja` / `da` / `dificil`, pela régua de ~1 ponto de VDOT a
cada 2 semanas, que já é otimista).

- **A contagem de dias é de meia-noite a meia-noite.** Medindo de "agora" até
  o meio-dia da prova, ela mudava conforme a hora em que a tela fosse aberta:
  56 dias de manhã e 57 à noite, para a mesma prova.
- **O rascunho é guardado mesmo incompleto.** Antes só virava prova quando já
  tinha data, e quem preenchia de cima para baixo — nome, distância, data —
  via o nome sumir ao chegar na data. Quem decide se o rascunho já é uma prova
  é `planoProva`, que devolve `null` sem data.

### Esforço relativo (TRIMP)

Quilômetro é quanto, não é quão duro: dez quilômetros arrastados e dez em
ritmo de prova somam igual em qualquer total de distância. O esforço relativo
é o tempo pesado pela intensidade.

- **Com cinta**, é o TRIMP de Banister, a fórmula publicada:
  `minutos × reserva × 0,64 × e^(1,92 × reserva)`. O `0,64` é só escala e não
  muda a comparação entre dois treinos — mas o número leva o nome de Banister,
  e número que leva nome tem de bater com a tabela.
- **Sem cinta**, o ritmo entra no lugar da FC, com o ritmo de limiar do próprio
  corredor como régua (no limiar a pessoa está perto de 88% da reserva). O
  número vem marcado como estimado, e a tela diz isso: é o que o próprio Strava
  faz, e vale dizer em vez de fingir precisão que não existe.
- `corredor.fcRepouso` afina a conta. Sem ela, 60 — que é a média e não é
  ninguém.

### Condicionamento, fadiga e forma

O gráfico de Fitness & Freshness do Strava, que vem do modelo de
impulso-resposta de Banister: duas médias móveis exponenciais do esforço
diário, uma de 42 dias (o condicionamento que levou meses para construir) e
uma de 7 (o cansaço de ontem). A forma é a diferença.

**Forma negativa quer dizer cansado — que é onde se treina.** O erro clássico
é achar que forma alta é bom sempre: forma alta por um mês é sedentarismo com
outro nome, e `leituraForma` diz isso em vez de elogiar.

Coberto por `teste-metas.js` (61 checagens), com o TRIMP conferido contra a
fórmula calculada à mão no próprio teste.

## O percurso desenhado (`PerfilElevacao`, `LegendaRitmo`, `pintarRotaPorRitmo`)

O mapa já ficava na tela de fim. O que faltava era o que esses apps mostram em
volta dele.

- **A rota colorida pelo ritmo**, a assinatura do mapa do Strava: diz num
  relance onde foi a subida e onde a pessoa abriu — coisa que a lista de
  parciais só conta quilômetro a quilômetro. **As faixas saem dos quantis do
  próprio percurso**, não de uma tabela fixa: 6:00/km é passeio para um e tiro
  para outro, e o mapa tem de ser legível para os dois. O teste prova a
  invariância: o mesmo percurso corrido na metade da velocidade sai com
  exatamente o mesmo desenho de cores.
- **O ritmo de cada trecho é medido em cordas** (`ROTA_CORDA_M`), como a
  distância. Ponto a ponto, o erro do GPS vira velocidade que ninguém fez.
- **Legenda sempre junto.** Mapa colorido sem legenda é enfeite: ninguém
  adivinha se o vermelho é rápido ou devagar.
- **O perfil de elevação** sai do mesmo `alt` do GPS que já alimentava a
  subida. **O eixo é a distância percorrida, não o número do ponto**: parado
  num semáforo o GPS cospe dezenas de pontos no mesmo lugar, e um eixo por
  ponto desenharia um platô enorme onde não houve caminho nenhum. Terreno com
  menos de 3 m de amplitude não vira gráfico.
- Os dois valem **na tela de fim e no mapa do histórico** (`ModalRota`): quem
  olha o percurso uma semana depois quer a mesma leitura.

Coberto por `teste-mapa.js` (28 checagens).

## Monster, Run! (`TelaZumbi`, aba `zumbi`)

Treino intervalado com história, pedido pelo dono a partir de uma especificação
própria ("Missão Zumbi"). A pessoa ouve a aventura, uma ameaça se aproxima, ela
acelera **dentro dos limites que ela escolheu**, escapa (ou não) e recupera.
Funciona na rua e na esteira, caminhando, correndo ou alternando.

**O nome.** Primeiro foi "Zombies, Run!", que é marca registrada da Six to Start
(o app de referência); o dono trocou para **"Monster, Run!"**. O nome mora numa
constante só, `NOME_ZUMBI`: trocar é uma linha. Os identificadores internos
(`zumbi`, `TelaZumbi`, `h.zumbi`) ficaram, de propósito: renomear o campo
do histórico deixaria os treinos já gravados sem cartão. Nada além do
nome vem de lá — código, regras, números, missão, personagens e sons são deste
app; só a ideia da mecânica veio da documentação pública deles.

### Separado em camadas
- **Motor** (`ZUMBI: MOTOR` até `FIM DO MOTOR ZUMBI`): lógica pura, sem tela,
  som nem sensor, coberta por `teste-zumbi.js` (111 checagens, relógio e sensores
  simulados). Unidades, base, alvo, avaliação, plano, estados, missão, validador,
  fila de falas e o registro do histórico.
- **Som** (`criarPaisagemZumbi`): vento, chuva, estática, passos, gemido e
  respiração sintetizados no aparelho (Web Audio), em canais separados de
  ambiente e ameaça, com limitador; a voz é o `speechSynthesis`.
- **Telas** (`TelaZumbi`): configuração, prévia do plano, sessão, resumo.
- **Abertura** (`AberturaZumbi`, `ZumbiDesenho`): toda vez que a modalidade é
  acionada, um zumbi de desenho (desenhado aqui, em SVG) corre do fundo da rua
  na direção da tela e "alcança" quem olha: a tela pisca, treme e ficam as
  garras com o nome. Uns 3,9 s; um toque pula; movimento reduzido mostra só o fim.

### As regras que importam
- **Tudo por dentro em m/s e em tempo ATIVO** (`s.tAtivo`): o relógio só anda
  fora da pausa. Um salto do relógio maior que 2 s (o app ficou suspenso) não
  vira tempo, e na tela um intervalo de mais de 5 s pausa a sessão com aviso.
- **Pace é o inverso da velocidade**: +20% de velocidade é pace ÷ 1,2, nunca
  pace − 20% (6 km/h → 7,2 km/h; 10:00 → 8:20). O teste cobra isso.
- **A base é a média pelo tempo dos 30 s antes do aviso**, só com leitura
  válida, exigindo 80% de cobertura; cada leitura vale até a seguinte, no
  máximo 5 s — lacuna não vira dado. **Ela congela antes do aviso**: acelerar
  não sobe o alvo. Teto absoluto (o da pessoa; na caminhada, 7,5 km/h no
  máximo, para nunca pedir corrida) e teto relativo ao ritmo confortável da
  sessão (+25%), para as fugas não virarem uma escada. Sem margem, não manda
  acelerar.
- **Avaliação** (`criarAvaliador`): aviso de 10 s, adaptação de 15 s (25 na
  esteira), e então 30 s acumulados no alvo dentro de 60 s, com histerese. Abaixo
  do alvo a soma para mas não zera. Sem leitura por 10 s, **suspensa**; 20 s
  suspensa, **não avaliada** — nunca derrota. Todos esses números são ajustes
  do produto (`ZUMBI_PADRAO`), e a tela diz que não são prescrição.
- **Resultados que não se misturam**: fuga medida (GPS), estimada (passos),
  declarada (velocidade digitada na esteira), simulada (demonstração), guiada
  (nada medido), alcançado (desfecho alternativo), cancelada, não avaliada,
  adiada, sem margem.
- **Fontes**: rua = GPS (velocidade nativa se a precisão deixa, senão distância
  ÷ tempo de 5 a 15 s; leitura velha não vale). Esteira = velocidade informada
  (botões + e −), passos × passada calibrada na rua (sem passo, não há
  estimativa: celular parado no suporte não vira velocidade) ou guiado.
  **GPS na esteira é recusado** pelo validador de configuração.
- **Plano** (`planejarMissao`): cabe exatamente na duração escolhida (que já
  inclui aquecimento e desaquecimento); recuperação mínima de 90 s depois de
  cada esforço; no máximo 35% do miolo em esforço; missão curta tem menos
  perseguições; a folga é repartida ao acaso com semente. Intervalos
  programados: editáveis, ordenáveis e repetíveis; nunca ganham esforço
  escondido; bloco forte curto demais ou recuperação curta demais é recusado
  com a mensagem do porquê.
- **Eventos com id estável** (`b3:aviso`, `b3:fugiu`) processados uma vez só.
  **Checkpoint a cada 5 s** em `localStorage["treinolivre:zumbi"]`; ao abrir a
  modalidade de novo, a missão volta **pausada**, a perseguição que estava no
  ar vira "não avaliada (interrompida)", e retomar não repete fala nem
  recompensa.
- **Pausa de segurança** (o botão grande, sempre visível): congela tudo, cancela
  a perseguição em curso sem penalidade e garante 60 s leves na volta.
  Cancelar desafio, reduzir intensidade (−5 pontos), repetir instrução e
  recuperar mais (+60 s, tirados do último trecho leve) também estão sempre ali.
- **Falas** (`criarFilaFalas`): uma de cada vez, por prioridade, e a vencida é
  descartada — "acelere" não é dito quando a sessão já está em recuperação. A
  voz abaixa o ambiente enquanto fala (ducking). Vibração no aviso, na
  aceleração e na fuga; a última fala fica escrita na tela.
- **Histórico**: um treino com id da sessão (`juntarSemDuplicar`), série aeróbica
  comum (meta da semana e painel do corredor enxergam), e `historico[].zumbi`
  com o resumo, os blocos, cada perseguição e a velocidade em médias de 10 s
  com `null` onde não houve leitura (`GraficoZumbi` deixa a lacuna em branco).
  **Distância só com GPS; velocidade da esteira só se foi informada; o guiado
  não grava velocidade nem distância.** A demonstração nunca é salva.

### A missão "Último Sinal" (`MISSAO_ULTIMO_SINAL`)
Lia Ventura, operadora da Estação Farol, guia a pessoa para buscar a bateria
do rádio na Garagem Norte e religar a antena com o Bento. Fatos persistentes
(`bateria`, `sinal`, `farol`) impedem contradição: sem nenhuma fuga, ou
pulando todos os desafios, a história fecha por outro caminho (a distração dos
sobreviventes, a bateria deixada no caminho) e o fim não finge sinal
restaurado. **Nenhuma fala dá ordem de navegação real** — a fuga é no ritmo,
nunca na direção — e o teste procura "atravesse", "entre", "vire".

### As seis histórias, e a aleatória
Além do "Último Sinal" há cinco: **💉 Remédio da Vila** (a caixa de remédio, o
gelo, o posto), **🚂 Trem da Meia-Noite** (a chave, o desvio, o trem),
**🌱 Sementes de Amanhã** (as sementes, a água, a estufa), **🐕 Resgate do
Pipoca** (a pista, o cachorro, o lar) e **💡 Luz no Hospital** (o galão, a
peça, a luz). As cinco saem de `montarMissaoZumbi(spec)` sobre
`cenasComunsZumbi(narrador)`: o que muda de uma para outra é o narrador, os
três fatos e as falas — a mecânica e as reservas são as mesmas, e por isso as
regras de coerência valem para todas sem repetir código.

A configuração mostra as seis em cartões, mais **🎲 Aleatória** (o padrão):
sorteia no "Começar" e **nunca repete a última** (`sortearMissaoZumbi`, a
última em `localStorage["treinolivre:zumbi-ultima"]`). A história sorteada vai
no checkpoint (`meta.missao`): retomar uma missão interrompida não troca de
história no meio. `missaoZumbiPorId` cai no Último Sinal quando o id não
existe mais. O `teste-zumbi.js` roda **as seis** pelos três caminhos (todas as
fugas, nenhuma, pulando todas) e procura ordem de navegação em cada uma.

### Os cinco monstros (`MONSTROS_ZUMBI`)
Com o nome "Monster, Run!", o zumbi virou um monstro entre cinco, cada um com
duas histórias ou mais:

| Monstro | Histórias | Como persegue | Som da ameaça (`SOM_MONSTRO`) |
|---|---|---|---|
| 🧟 Zumbis | as seis acima | em grupo, lento | gemido grave e passos arrastados |
| 🐺 Lobisomem | 🌕 Lua Cheia na Serra, 🪙 Rastro de Prata | um só, fareja | uivo que sobe e cai, passos curtos e rápidos |
| 🦇 Vampiros | 🌅 Antes do Amanhecer, 🎭 Baile no Casarão | voam, evitam a luz | asas (ruído agudo batendo rápido), sem passos |
| 🗿 Golem de pedra | ⛰️ O Guardião da Pedreira, 🕰️ Passos de Pedra | pesado, faz o chão tremer | ronco muito grave e pisadas lentas |
| 🐙 Criatura do mar | 🌊 Maré Alta, 🐋 O Canto da Baía | perde força longe da água | ondas e ronco grave, sem passos |

- **A história diz qual é o monstro** (campo `monstro`; sem ele, zumbi).
  `montarMissaoZumbi` troca, nas cenas comuns, só as frases que falam "dele"
  (`frases` do monstro: aviso, perseguição, desfecho, adiada). "Eles são
  lentos" num lobisomem seria erro de história, e o teste cobra isso.
- **Na configuração**, chips de monstro filtram as histórias, e a "Aleatória"
  sorteia dentro do filtro (`sortearMissaoZumbi(ultima, rnd, monstro)`).
  Trocar de monstro com uma história de outro escolhida volta para a aleatória.
- **A prévia do som** toca o monstro da história escolhida (ou o do filtro), e
  a fala dela é a do aviso daquele monstro. Na sessão, o título e a barra da
  ameaça mostram o ícone do monstro; no histórico, o cartão também.
- **A abertura continua sendo o zumbi**: é a marca da modalidade, e roda antes
  de a pessoa escolher monstro.
- Para um monstro novo: uma entrada em `MONSTROS_ZUMBI` (frases), uma em
  `SOM_MONSTRO` (números do som) e duas histórias com `monstro`.

### Paródias de filmes e séries (`grupo: "cinema"`)
O dono pediu histórias do Capitão Pátria (The Boys) e de outros filmes e
séries, e depois pediu **nomes parecidos com os originais**, para quem lê já
reconhecer a paródia. A regra que ficou: **nome de paródia sempre, nome exato
do original nunca**. O `teste-zumbi.js` procura no `index.html` os nomes
originais (The Boys, Capitão Pátria, Homelander, Vought, Jurassic, Nostromo,
Ripley, Skynet, Stranger Things, Hawkins, Demogorgon, Sarah Connor, Kyle Reese,
Amity, Brody, Hammond, Alan Grant, Joyce, Eleven) e reprova se algum aparecer —
inclusive em comentário.

| Monstro | História | Paródia de |
|---|---|---|
| 🦸 Capitão Pátio | 🦸 O Herói da Nação, 🎙️ Ao Vivo | The Boys: o herói da Vôti que deixou o voo 37 cair, sorri para a câmera e toma leite |
| 🦈 Tubarão da Amizade | 🏖️ Verão na Praia da Amizade | Tubarão: o delegado Brodi, o prefeito, "vamos precisar de um barco maior" |
| 👽 Alien do Nostrômulo | 🛸 O Nono Passageiro | Alien: a tenente Ripla, o tripulante Keine, o gato Jonas, o detector de movimento |
| 🌀 Demogorgão | 🔦 Coisas Estranhíssimas | Stranger Things: Hókins, Dona Djóice, o Wilinho, a Onzi e as luzes do alfabeto |
| 🤖 Exterminador T-80 | 🤖 O Exterminador T-80 | O Exterminador do Futuro: a Céu-Net, Kaio Reis, Sara Conrado, "eu volto" |
| 🦖 T-Rex do Juráxico | 🦖 Parque Juráxico | Jurassic Park: o doutor Alan Grana, o Seu Hamundo que não poupou despesas, o copo tremendo |

Os monstros de cinema ficam num grupo à parte na configuração e têm uma
história cada (os clássicos têm pelo menos duas).

### O especial do criador: Fuga do Marombeiro (`grupo: "especial"`)
**O Marombeiro é o dono do app, Carlos Jr - O Zeus, com a foto dele, a pedido dele,
para divulgar o perfil.** Você faltou ao treino de perna, ele descobriu, e só
para quando vir o treino registrado no Treino Livre. O Jarvis narra. O fim
completo convida a seguir o Instagram.

- **O avatar é a foto dele, animada, sem fundo.** A pedido do dono, a foto
  estática com o fundo da arte virou um avatar em **três camadas do mesmo
  tamanho** (`marombeiro-corpo.webp`, `-braco.webp`, `-cabeca.webp`, 460 px,
  uns 70 KB juntas): o corpo respira, o braço do bíceps bombeia girando no ombro
  e a cabeça balança no pescoço; correndo, tudo sobe e desce no passo, com a
  sombra acompanhando (`AvatarMarombeiro`, CSS `mbRespira`, `mbBombeia`,
  `mbCabeca`, `mbCorre`). **Nada é redesenhado**: rosto, cabelo, barba e
  óculos são os da foto. O ombro e o pescoço ficam nas duas camadas vizinhas,
  para girar alguns graus não abrir buraco. Os pivôs (em % da imagem) estão em
  `AVATAR_MAROMBEIRO`.
- **Como as camadas foram feitas**: a foto que o dono mandou já veio sem fundo
  (893×1726, pose de bíceps). Os tênis são os da foto: a pintura no esquema "Bred Toe"
  foi testada e desfeita a pedido dele. O MediaPipe (`selfie_multiclass`) separou
  cabelo, rosto e óculos (a cabeça); o braço é um polígono acima da axila.
  Para refazer com outra foto, o roteiro está descrito no histórico desta
  sessão: segmentar, cortar na altura do fim da barba, exportar WebP com alfa.
- Onde aparece: avatar no cartão da história (o rosto, `marombeiro-rosto.jpg`),
  o **banner** com ele posando sobre o fundo verde e "Seguir @carlos.jr.81", a
  **abertura** (`AberturaMarombeiro`: ele vem correndo com linhas de velocidade
  girando atrás, a tela treme, ele para e posa, e entra "HOJE É DIA DE
  PERNA!"; um toque pula), o rosto no radar ao vivo, o fim do resumo animado
  e o **vídeo do story** (`videoAvatar` desenha as mesmas camadas com os mesmos
  movimentos no canvas). Tudo na lista do `sw.js`: funciona sem internet.
- O som é grunhido e passos firmes; o radar se chama "Cheiro de whey".
- Monstro com `foto`/`fotoCorpo`/`instagram` ganha tudo isso de graça: é o
  caminho para outro especial com foto.

### O resumo animado da missão (`monstroResumo`)
Ao terminar, o fim da missão tem **"▶ Ver resumo animado da missão"** como botão
principal (e o cartão do histórico tem o de sempre). O resumo é o mesmo
`ResumoAnimado` dos outros treinos, com três cenas a mais, que também são
desenhadas no vídeo do story:

1. **Abertura** com o nome da modalidade, a história e o monstro.
2. **Perseguições** (`perseguicoes`): "2/3 fugas" e a linha do tempo de cada uma
   (✅ fuga a 10,4 km/h, 💀 alcançado, ✋ cancelada...), e o tempo no ritmo.
3. **O mais perto que chegou** (`radar`): o número desce de 300 até a distância
   e o monstro anda no radar até lá. Vem de `zumbi.maisPerto`, que o radar ao
   vivo mede e o registro guarda (missão antiga não tem: a cena não entra).
4. Os números aeróbicos de sempre (tempo ou distância, gasto, semana).
5. **Como terminou** (`historia`): a fala final da história, escolhida pelos
   fatos guardados (`escolherCena(missao, "fim", fatos)`), narrada de novo.
6. Nível e o fecho "Você sobreviveu. Até a próxima missão."

Sem testes de tela para o resumo; `monstroResumo` é coberto em
`teste-zumbi.js` (9d).

### O radar da perseguição (`RadarMonstro`)
Para quem corre na esteira ou com a tela à vista. Tudo sai do motor, sem regra
nova: a **distância em metros** é a ameaça convertida (`distanciaMonstro`:
280 m longe, 15 m encostando, sempre dentro do radar de 300 m durante a
perseguição, para não parecer que acabou antes de a fuga valer), e a tela a
move no máximo 5 m/s — a ameaça do motor muda depressa, e "ficando para trás a
30 m/s" não parece perseguição.

- Radar circular com varredura, anéis de 100/200/300 m, faixa vermelha dos
  60 m e o ícone do monstro na distância certa, atrás de você.
- Zonas (`ZONAS_RADAR`): no seu calcanhar (≤60 m, o painel pulsa), perto,
  à vista, fora do alcance.
- Tendência (`leituraRadar`, janela de 4 s): ficando para trás, chegando,
  mesma distância, e "alcança em ~N s se nada mudar" — escondido no aviso, em
  que ainda não é hora de acelerar.
- Ele × você em km/h, o prazo da fuga e a barra "18 de 30 s no ritmo".
- Na esteira, a velocidade para pôr no painel, e quanto subir.
- Placar (`placarMissao`, do estado do motor): fugas, sequência (e a melhor),
  o mais perto que ele chegou e os km.
- **Bipes do detector**: mais rápidos quanto mais perto. Ligados de saída no
  alienígena; um botão liga nos outros.
- O nome do radar muda com o monstro (`radar`): Faro, Céu, Sismógrafo, Sonar,
  Escuta, Detector de movimento, Luzes, Varredura, Tremor.
- O rodapé diz que distância e monstro são ficção e que ritmo e km são reais.

### Acrescentar uma missão
É dado, não código: um objeto como `MISSAO_ULTIMO_SINAL` (id, versão, nome,
fatos, cenas). Cada cena tem `evento` (um de `EVENTOS_ZUMBI`), `falas`
(`caminhada` e `corrida`, ou `todas`; `{alvo}` vira a velocidade), e
opcionalmente `requer`, `semFatos`, `define`, `repetivel`, `proximas`.
`validarMissao` recusa código dentro do objeto, fato não declarado, referência
quebrada e evento essencial sem cena de reserva (sem `requer`). Rode-o no
teste antes de pôr a missão nova na tela.

### A voz com emoção, e as vozes gravadas (pasta `vozes/`)
O dono reclamou, com razão: a voz do aparelho é robótica, e uma perseguição
lida como extrato bancário não assusta ninguém. Duas camadas:

1. **Toda fala tem uma emoção** (`emocaoDaFala`, `EMOCOES_FALA`): mistério no
   ambiente e na abertura, tensão no aviso, urgência no "agora!", incentivo
   ofegante na perseguição, alívio na fuga, drama no desfecho, calma na
   recuperação, vitória no fim completo, humor em tudo do Marombeiro. Na voz do
   aparelho isso vira ritmo, tom e **pausa entre as frases** (`falarComEmocao`
   fala frase por frase: é a pausa que mais tira o jeito de robô). A voz é a
   melhor do aparelho (`notaVoz`: "Natural"/"Neural"/"Online" primeiro, Google
   depois) e segue o narrador: feminina ou masculina (`VOZ_DA_MISSAO`,
   `vozPorGenero`), a não ser que a pessoa tenha escolhido uma voz nos ajustes.
2. **A voz de verdade é gravada por uma IA de voz**, uma vez, e publicada em
   `vozes/`. O app busca `vozes/indice.json` e, para cada fala com gravação,
   toca o `.mp3` (`audioNarracao`, que o `calarJarvis` também cala); sem
   gravação, ou se o arquivo falhar, cai na voz do aparelho. O nome do arquivo
   é um hash do texto e da voz (`idDaFala`): mudou a frase, muda o arquivo. A
   frase do ritmo-alvo muda a cada perseguição e fica fora da gravação
   (`separarAlvo`): é dita pela voz do aparelho logo depois.
   - `vozes/roteiro.json`/`.csv` (597 falas, ~55 mil caracteres), gerado por
     `node vozes/exportar-roteiro.js` a partir do próprio `index.html`. **O
     teste reprova se o roteiro estiver desatualizado**: mexeu numa história,
     rode o exportador.
   - `vozes/gerar-vozes.js` gera os `.mp3` com OpenAI (`gpt-4o-mini-tts`, com a
     direção de emoção como instrução; ~US$ 1 tudo) ou ElevenLabs (`eleven_v3`,
     com as marcas `[whispers]`, `[shouting]`...). **A sessão na nuvem não
     alcança esses serviços**: roda na máquina do dono, com a chave dele. O
     passo a passo está em `vozes/LEIA-ME.md`.
   - O `sw.js` guarda as gravações num cache próprio (`treinolivre-falas`,
     preservado entre versões) e busca o `indice.json` sempre na rede. As
     falas da história são baixadas quando ela começa: depois, sem internet.
   - **Hoje nenhuma fala está gravada** (`indice.json` vazio): até o dono gerar,
     tudo sai na voz do aparelho, com a entonação por emoção.

Os efeitos continuam sintetizados no aparelho (`ZUMBI_AUDIO_MANIFESTO`).

### O que a web não alcança aqui
Tela bloqueada e app em segundo plano: o navegador pode parar o GPS, o relógio
e a voz. A tela pede para ficar ligada, a trava de tela fica ativa, e a volta de
uma suspensão pausa a sessão em vez de inventar tempo. Chamada telefônica e
fone desconectado não têm aviso confiável numa página web. **Não está validado
em aparelho**: GPS de verdade, esteira física, celular bloqueado, Bluetooth.

## Intervalado (`TelaIntervalado`, aba `intervalado`)

"Caminhada e corrida em que o ritmo varia" — o dono não sabia o nome; é o
**treino intervalado**. Botão **⏱ Intervalado** na tela inicial e no preparo do
percurso. Rua (GPS mostra se está no ritmo) ou esteira.

**Na esteira há dois caminhos hoje.** Sem conexão, o app diz a velocidade e quem
ajusta é a pessoa. **Com a esteira conectada por Bluetooth, o app acerta a
velocidade de cada bloco sozinho** — ver *A esteira por Bluetooth*. Esta linha
já afirmou que "uma página não fala com a esteira"; fala, quando a esteira expõe
o padrão FTMS.

Modelos (`MODELOS_INTERVALO`), cada um com a explicação na tela:

| Modelo | Para quem | Forma |
|---|---|---|
| 🐢 Corre-caminha | quem está começando a correr | 1 min correndo leve, 2 andando, ×8 |
| 🚶 Japonês (Nemoto, 2007) | caminhada | 3 min rápido, 3 devagar, ×5 |
| 🎯 Tiros | ganhar velocidade | 2 min forte, 2 leve, ×6 |
| 🎲 Fartlek | variar sem pensar | blocos sorteados com semente (`serieFartlek`) |
| 🔺 Pirâmide | variar o estímulo | forte de 1-2-3-2-1 min, com recuperação |
| 📈 Progressivo | terminar mais forte | moderado, forte, muito forte, sem parar |
| ✏️ Personalizado | quem já sabe o que quer | blocos montados à mão |

- **Intensidade em níveis** (`NIVEIS_INTERVALO`), cada um com a escala de
  esforço (RPE) e o que se sente ("dá para conversar", "só palavras soltas"):
  é o que vale quando não há número nenhum.
- **O alvo de cada nível** (`alvoDoNivel`): os ritmos de Daniels quando há VDOT
  (corrida); senão o ritmo confortável das últimas atividades
  (`confortoDoHistorico`, mediana) com um fator por nível; senão só a escala.
  **Caminhada rápida nunca passa de 7 km/h** — acima disso é corrida.
- **Na caminhada nenhum bloco pede corrida**: o esforço vira caminhada rápida.
- **"Esforço" é relativo à série**, não ao nível absoluto: no corre-caminha, a
  corrida leve é o esforço porque o resto é caminhada.
- **O relógio é o do tempo ativo** (`criarSessaoIntervalado`), como no motor
  zumbi: pausa congela, salto maior que 2 s não conta. Bipe e vibração no 3-2-1
  antes de cada troca, voz anunciando o bloco seguinte e a metade dos esforços
  longos. ⏭ Pular e +30 s.
- **O resumo conta o tempo feito, não o planejado.** Achado no navegador:
  encerrar no meio gravava também os blocos que nem começaram. Na esteira cada
  bloco feito vira uma série `{ segundos, mod, vel }`; na rua, uma série com o
  km do GPS. O registro leva `intervalado` (blocos, alvos, constância), que o
  histórico mostra em faixa (`CartaoIntervalado`).
- **Constância** (`consistenciaEsforcos`): quanto os esforços variaram entre si.
  Só entram esforços com 60% de leitura — bloco sem GPS não inventa velocidade.

Coberto por `teste-intervalado.js` (38 checagens).

## Desafio (`TelaDesafio`, aba `desafio`)

Pedido do dono: pessoas se desafiando a correr a mesma distância ou o mesmo
tempo, **juntas ou em lugares separados, ao mesmo tempo ou em dias
diferentes**, vendo ao vivo quem está na frente, a posição de todos e em
quanto tempo um alcança o outro quando acelera. Botão **🏁 Desafio** na tela
inicial e no preparo do percurso.

### A régua: o tempo de prova de cada um

O que põe todo mundo na mesma conta é o **tempo de prova**: a posição é sempre
"aos 12:30 da sua corrida, quanto cada um tinha andado aos 12:30 da dele".
Largar junto, largar uma hora depois em outra cidade ou correr amanhã contra o
resultado de hoje é **a mesma comparação**, e ninguém precisa sincronizar
relógio. É também o que torna justo quem pausa: o relógio de cada um só anda
fora da pausa.

Cada pessoa é uma **trilha** `[[ms de prova, metros], ...]`, uma amostra a cada
5 s. Tudo sai dela (bloco `DESAFIO: MOTOR`, puro, coberto por
`teste-desafio.js`, 46 checagens):

| Conta | Função | Regra |
|---|---|---|
| metros num tempo de prova | `distanciaNaTrilha` | interpola entre amostras; depois da última, fica nela |
| velocidade de agora | `velocidadeNaTrilha` | últimos **15 s**. Com 30 s, quem subia a esteira de 9 para 16 km/h esperava meio minuto para a previsão perceber |
| a pessoa num tempo de prova | `estadoNoTempo` | ao vivo e com leitura fresca: estima pelo ritmo de agora, no máximo 20 s. Mais que isso, ou sem estar ao vivo: **"ainda não chegou"** a esse tempo (largou depois, parou, perdeu o sinal) — nunca inventa |
| classificação | `classificarDesafio` | distância: quem cruzou a linha vem primeiro, pelo tempo; os outros por metros. Tempo: só metros |
| diferença em segundos | `diferencaSegundos` | há quanto tempo de prova o da frente passou onde o de trás está — exato, da trilha, sem supor ritmo |
| ultrapassagem | `previsaoUltrapassagem` | diferença ÷ (minha velocidade − a dele). `alcanca` (eu chego nele) ou `chega` (ele chega em mim), e `viavel` diz se acontece antes da linha ou do fim do tempo. Ninguém alcançando: a velocidade para alcançar em 1 min e até a chegada |
| quem passou quem | `eventosDesafio` | só a vizinhança de quem usa o app |

### Como os celulares se enxergam: o retransmissor

**É a única exceção à regra "sem servidor", decidida com o dono.** Celulares em
cidades diferentes só se veem ao vivo por um intermediário. Usamos
retransmissores **MQTT públicos e gratuitos, sem conta e sem chave**
(`DESAFIO_BROKERS`: EMQX, HiveMQ, Mosquitto), por WebSocket.

- **Passa só apelido, distância, tempo e a trilha** (`mensagemDesafio`) —
  **nunca a localização**; o teste confere que não há `lat`/`lng` na mensagem.
  A tela de configuração diz isso, e que quem tem o código vê esses números.
- **O MQTT é escrito aqui** (`mqttConectar`, `mqttAssinar`, `mqttPublicar`,
  `mqttLer`): só o pedaço do 3.1.1 que usamos (conectar, assinar, publicar
  QoS 0, ping). Uma biblioteca seriam 80 KB no meio mega do app, e mais um SRI.
  `mqttLer` junta pacote partido entre dois quadros do WebSocket — o teste
  cobra isso.
- **Cada pessoa publica num tópico com `retain`**
  (`treinolivre/desafio/v1/<CÓDIGO>/<id>`): a mensagem fica guardada no
  retransmissor, e quem entra depois — ou corre no dia seguinte — recebe a
  trilha de quem já correu. A meta da sala vai em `.../<CÓDIGO>/sala`, para quem
  entra só com o código.
- **O código da sala** (`novoCodigoSala`) são cinco letras sem as que se
  confundem ditadas (O/0, I/1) e, no fim, **o número do retransmissor**: quem
  digita o código cai no mesmo retransmissor de quem criou.
- **Reconecta sozinho** (o 4G cai no meio da corrida) e publica de novo ao
  voltar. Sem conexão nenhuma, a corrida continua contando, e o resultado vai
  num link no fim.
- **O retransmissor público pode sair do ar** — é serviço de terceiro. Trocar
  é uma linha em `DESAFIO_BROKERS` (e o número no código de sala novo).
- Para testar sem internet: `localStorage["treinolivre:desafio-broker"] =
  "ws://localhost:8888"` desvia todas as salas para um retransmissor local
  (aedes + ws, uns 10 linhas). **A sessão na nuvem não alcança os públicos.**

### O link (`#corrida=`), que funciona sem retransmissor nenhum

`linkDesafio` leva a sala (código, meta, atividade) e as trilhas de **quem já
terminou**, em texto curto (`codificarTrilha`: uma amostra a cada 10 s, metros
desde a anterior em base 36 — uma hora de corrida em menos de 2 KB). Quem abre
o link cai na sala, corre na hora contra esses resultados (👻) e, se houver
conexão, entra também ao vivo. `#desafio=` já existia e é outra coisa (comparar
estatísticas gerais com um amigo): não confundir.

### Na tela

- **Configurar**: apelido (guardado em `corredor.apelido`, vai no backup),
  distância (1, 3, 5, 10 km, meia) ou tempo (10 a 60 min), corrida ou
  caminhada, rua (GPS, o mesmo filtro e as mesmas cordas de 12 m do percurso)
  ou esteira (velocidade no − e +). **🧪 Simulação**: dois corredores de
  mentira, relógio 10× mais rápido, nada é salvo nem publicado — é como se
  conhece o modo sem ter amigo à mão.
- **Sala**: o código grande, convidar (link pelo `navigator.share`), quem está
  (📡 ao vivo, 👻 resultado), o estado da conexão, e **Largar** com 3-2-1.
- **Corrida**: posição grande, km, tempo e ritmo; **a pista com uma raia por
  corredor** (lado a lado, numa raia só os pontos se escondiam um atrás do
  outro); a lista com metros e segundos à frente/atrás; o cartão de
  ultrapassagem; na esteira, a minha velocidade é a do painel (a trilha demora
  a perceber a subida).
- **Voz** (`narrar`, fila de falas): "Você passou a Ana! Agora em 1º", "Bia te
  passou", "Nesse ritmo, você alcança a Ana em 1 minuto e 7 segundos", "Bia
  está chegando: te alcança em 40 segundos. Acelere!" (no máximo uma vez por
  minuto por pessoa), a situação a cada km (ou 5 min), últimos 200 m / último
  minuto, e a chegada. **A troca de posição só é dita depois de durar 2 s, e
  nos primeiros 15 s não é dita**: lado a lado na largada a ordem troca a cada
  metro. "Jarvis, como estou / pausa / continua / encerra" pelo `CONTROLE_AULA`.
- **Fim**: classificação (quem ainda corre continua chegando), salvar no
  histórico (série aeróbica comum + `historico[].desafio`, que o
  `CartaoDesafio` mostra), mandar o resultado por link, correr de novo.

**Não está validado em aparelho**: dois celulares de verdade em redes móveis,
e os três retransmissores públicos (a sessão na nuvem não os alcança). Foi
testado com um retransmissor local e dois navegadores: sala por código,
largada, ultrapassagem narrada, previsão, link com fantasma, simulação até a
chegada, e o registro no histórico.

## A esteira por Bluetooth (FTMS)

Pedido do dono: conectar o app à esteira, de um jeito fácil, e deixar o
intervalado conduzir a velocidade sem as mãos.

**Funciona pelo padrão aberto das máquinas de academia**: Fitness Machine
Service, `0x1826`, publicado pelo Bluetooth SIG — o mesmo caminho do Zwift e do
Kinomap. Nada aqui é engenharia reversa, e os bytes saem da especificação.

| O que | Onde |
|---|---|
| velocidade, inclinação, distância, tempo, bpm | `0x2ACD`, notificado ~1×/s |
| o que a máquina aceita de velocidade | `0x2AD4` (min, max, passo) |
| mandar velocidade / inclinação | `0x2AD9`, op `0x02` / `0x03` |
| parar | `0x2AD9`, op `0x08` com parâmetro `0x01` |

### A varredura é do navegador, e tem de ser

**Uma página não pode listar os aparelhos por perto**, e isso é de propósito:
seria um rastreador pronto. Quem lista é o navegador, na janela dele. O que dá
para fazer — e é o que muda a experiência — é **filtrar pelo serviço `0x1826`**,
para que só apareça máquina de academia e não o fone nem a TV do vizinho.
**E nunca reconecta sozinha. Esta é a decisão de segurança central do módulo,**
e veio do dono: academia tem uma bateria de esteiras iguais. A de ontem pode
ter outra pessoa correndo nela hoje — e o app não teria como saber. Ele veria
um aparelho conhecido, conectaria, e comandaria a velocidade de um estranho.

Por isso:

- **Não existe `reconectar()`.** Conexão é sempre um ato deliberado, no
  momento. Se um dia alguém for tentado a acrescentar: a pergunta é como o app
  saberia que a esteira conhecida é a que está na frente da pessoa. Não saberia.
- **Ao sair, o app devolve a permissão** (`device.forget()`), em vez de
  guardá-la para depois. O toque a mais na próxima vez é o preço, e é barato.
- **Conectar não é o mesmo que poder comandar.** Depois de conectar, a tela
  pede a confirmação: *"mude a velocidade no painel; se o número aqui mudar, é
  a sua"*. Só então o controle é pedido. Numa academia com dez máquinas iguais
  o nome no Bluetooth não distingue nada; o painel, sim.
- Se a esteira já estiver **andando** no instante da conexão, a tela avisa: é
  o sinal mais forte de que tem alguém nela.

### As regras de segurança, e por que cada uma existe

Mudar a velocidade de uma esteira com alguém em cima não é como mudar um campo
de formulário. Quem está correndo não consegue ler a tela, discutir nem recuar.

1. **O teto é da pessoa, não da máquina.** Antes de começar ela diz a velocidade
   máxima que aguenta, e `velocidadePermitida` toma **o menor** entre esse teto,
   o máximo da esteira e um padrão — nessa ordem. Nenhum treino passa disso.
2. **O app não liga nem desliga a esteira.** Quem começa e para é a pessoa, no
   painel. O app só muda a velocidade de uma esteira que já está andando.
3. **A troca vem anunciada duas vezes.** Onze segundos antes, a voz diz o que
   vem: *"Em 11 segundos, a esteira acelera para 12,3 por hora"*
   (`falaTrocaEsteira`, `AVISO_TROCA_MS`). A frase diz o **sentido antes do
   número** — "acelera" chega ao ouvido antes de "doze", e é o sentido que muda
   o que o corpo faz. Depois vem a contagem regressiva falada, 3-2-1, que só
   existe quando o app comanda: na rua o bipe basta, porque ali a troca é de
   esforço; na esteira a correia vai mudar debaixo do pé.
4. **A tela diz o que foi pedido.** Sem isso, uma esteira que recusa o comando
   calada deixaria a pessoa correndo no ritmo errado achando que o app cuidava.
5. **⏹ PARAR A ESTEIRA é um botão separado do Encerrar.** Na hora do aperto
   ninguém procura o botão certo. (O botão vermelho da própria esteira continua
   sendo o caminho mais rápido — este é o que está na mão.)
6. **No fim, desacelera para caminhada** (`VEL_DESAQUECIMENTO`) em vez de parar:
   largar alguém em 14 km/h é ruim, parar de repente com a pessoa correndo é pior.
7. **A velocidade encaixa no degrau da máquina.** Pedir 8,37 numa esteira de
   passo 0,1 é pedir algo que ela arredonda sozinha — e aí a tela mostra um
   número e a esteira faz outro.

### A história manda na correia (Monster Run)

O Monster Run na esteira ganhou as duas pontas: a esteira vira **fonte de
movimento** (`fonte: "esteira"` — a melhor leitura possível ali, melhor que
estimar por passos) e vira **a correia que a história conduz**.

- O comando segue a **fase**, não o evento narrativo (`kmhDaFaseZumbi`). Evento
  é quando a história tem algo a dizer; fase é o que está acontecendo com o
  corpo, e entre um e outro cabem trocas sem fala nenhuma.
- **A fase de aviso NÃO acelera.** Ali a história está dizendo que a ameaça
  vem; quem acelera antes da hora chega cansado na perseguição. A correia muda
  na transição, e a voz anuncia o ritmo durante o aviso.
- O alvo da perseguição já era calculado pelo motor (em m/s): o que mudou é
  que agora ele vira velocidade de verdade em vez de um número para a pessoa
  perseguir no painel.

### Métodos que só existem com a esteira comandada (`MODELOS_ESTEIRA`)

Os modelos do intervalado falam em **nível** ("forte", "leve") porque quem
ajusta a esteira é a pessoa, e pedir "11,3 km/h" a quem está correndo e precisa
achar o botão é pedir demais. Com o app comandando, a conta inverte: velocidade
exata deixa de ser incômodo e vira o próprio treino.

**O critério para entrar aqui é ser desconfortável ou impossível de fazer à
mão** — não "mais um modelo":

| Método | O que é |
|---|---|
| 🪜 Rampa | +0,5 km/h a cada minuto, sem teto, até você não segurar. É o teste incremental de laboratório, e só dá para fazer sozinho se a máquina obedecer ao relógio |
| 🌊 Onda | sobe e desce de meio em meio minuto, sem parar. Meio minuto é curto demais para alguém ficar mexendo no painel |
| 📶 Escada de velocidade | um minuto por degrau, subindo e descendo. Na pirâmide cresce o TEMPO; aqui cresce a VELOCIDADE |
| 🎰 Surpresa | o app muda quando quer, dentro do seu teto. Treina o que ritmo combinado não treina — e avisa por voz antes, sempre |

- Os blocos carregam **`dkmh`**: quanto a velocidade fica acima (ou abaixo) do
  ritmo confortável da pessoa. `alvoDoBloco` resolve isso; `alvoDoNivel`
  continua valendo para todo o resto.
- **Sem histórico não há velocidade para pedir.** Sem ritmo confortável medido,
  `alvoDoBloco` devolve `null` em vez de chutar um número para mandar a uma
  máquina.
- Eles **só aparecem na lista quando a esteira aceita comando**, e se ela sair
  de cena o app volta sozinho para um modelo que funciona sem ela. Oferecer uma
  rampa automática a quem vai ter de girar o botão a cada minuto é oferecer
  frustração.

### No treino comum de esteira, só leitura (`ConexaoEsteiraSessao`)

Pedido do dono: "deixa bem fácil, bem sugestivo". Até aqui a conexão só existia
no intervalado e no Monster Run, e quem começava "Corrida na esteira" pelo
atalho da tela inicial digitava velocidade e inclinação à mão sem saber que a
máquina podia dizê-las. Hoje o cartão de todo exercício de esteira abre com um
botão grande **📶 Conectar a esteira**, e a escolha da esteira na tela inicial
já avisa que ele existe.

- **Aqui a esteira é lida, nunca comandada.** `confirmar(true)` (o `soLer`)
  confirma sem pedir o controle: ninguém combinou, num treino comum, que o app
  mexeria na correia. O teste no navegador confere que nenhum byte é escrito.
- As regras de sempre continuam: conexão por toque, conferência no painel
  ("mude a velocidade; se o número mudar, é a sua"), aviso se ela já estiver
  andando, e nada de reconectar sozinha.
- **Só depois da confirmação** velocidade e inclinação da série pendente
  passam a seguir o painel (a do exercício da vez, senão a primeira de esteira
  com série por fazer). Grava só quando o número muda.
- **"✓ Anotar a série: 15 min · 2,6 km"** aparece depois de um minuto: grava o
  tempo da esteira e a velocidade **média** (a de agora mentiria sobre quem
  variou o ritmo) e marca. São dois passos (`anotarEsteira` + efeito) porque o
  `marcarSerie` lê a sessão do render: gravar e marcar juntos apagaria os números.
- No iPhone, em vez do botão, uma linha dizendo que a Apple não libera e que é
  só digitar o painel.
- **Achado no primeiro treino real com a esteira**: o dono anotou a 1ª série
  pela esteira, pôs 40 min na mesma linha e apertou ▶ — e a velocidade parou
  de acompanhar, porque só série pendente era seguida. Hoje **a série com o
  cronômetro rodando vem antes de tudo** (`serieDaEsteira`), e ▶ numa série já
  marcada a devolve a pendente: o fim do cronômetro chama `marcarSerie`, que
  **alterna**, e desmarcaria o treino de 40 min.
- **Cada anotação conta desde a anterior** (`baseEst`): o tempo e a distância
  do painel só crescem, e a 2ª série levaria os minutos da 1ª. Série marcada por
  outro caminho (✓, fim do cronômetro) também move a régua; painel zerado
  (esteira parada e religada) zera a régua. Sem série pendente, "Anotar" cria
  uma série nova no exercício de esteira.

### Tudo o que a esteira mede fica gravado

Pedido do dono: "aproveite o máximo de dados que a esteira tem, inclusive o
batimento". Na série que fecha (pelo "Anotar", pelo ✓ ou pelo fim do ▶),
entra o que a máquina mediu **desde a série anterior** (`extrasEsteira`,
`moverRegua`):

| Campo da série | De onde vem |
|---|---|
| `km` | os metros do painel — a distância exata, que vence a conta tempo × velocidade |
| `kcal` | as calorias que o painel marcou (o app continua mostrando a sua conta pelo ACSM, com o peso da pessoa; as duas aparecem) |
| `subida` | o ganho de elevação do painel, em metros |
| `bpm`, `bpmMax` | média e pico do batimento naquela série |

- **O batimento vem de dois lugares da esteira**: o campo de FC do FTMS
  (pegador com sensor) e o **serviço padrão de batimento** que muita esteira
  expõe ao lado (`sensorFc`, o mesmo 0x2A37 da cinta). **Zero é "sem as mãos
  no pegador"**, não um número: é descartado.
- **O batimento da esteira vale como o da cinta** (`onBpmEsteira` →
  `aoBpmEsteira` no raiz): aparece no treino e a média e o máximo vão para
  `historico[].bpm`. Com a cinta do app ligada, ela manda — duas fontes
  somadas dariam uma média de ninguém.
- **O que foi medido não se copia** (`moldeCardio`, coberto em
  `teste-cardio.js`): a sugestão da próxima vez e o "+ série" levam
  velocidade e inclinação, nunca km, kcal, bpm e subida. O km copiado venceria
  a conta da série nova, que nasceria com os quilômetros da antiga. Na rua o km
  é o que a pessoa digita, e fica.
- Onde aparece: o cartão da conexão (bpm, kcal, subida ao vivo), o
  `PainelCardio` ("❤ 153 bpm médio · máx 170", "90 kcal no painel da
  esteira"), o texto da série (`textoCardio`) e o cartão do histórico, que
  num treino de esteira mostrava "0 reps" e agora mostra distância, kcal,
  batimento e subida.

### Parar a esteira não pode apagar o treino (`criarOdometroEsteira`)

Achado no treino real do dono: 40 min programados no ▶, 42 caminhados, e ele
parou a esteira sem mexer no app. O fim do cronômetro já tinha marcado a série
com os 40 **planejados**, e o painel, ao parar, voltou a zero: tempo,
distância e batimento reais sumiram. Daí:

- **O odômetro** soma o painel por cima de cada reinício: quando tempo,
  metros, kcal ou subida *caem* (mais que uma folga pequena, para pacote
  atrasado não parecer reinício), o que havia vira saldo. Esteira que não
  manda distância tem os metros somados pela velocidade, com lacuna de no
  máximo 5 s (conexão que some não vira quilômetros), e o cartão diz
  "somada pela velocidade".
- **Um treino só, não dois** (`esteiraConduz`, `serieConduzida`). O dono
  desconfiou, com razão: o cartão contava o tempo do painel e, embaixo, o ▶
  da série contava os 40 minutos por conta própria — dois relógios para a
  mesma caminhada, e o de baixo era o gravado. Hoje, com a esteira confirmada
  e ligada, **a série é a da esteira**: no lugar dos minutos aparece o tempo
  dela desde a última anotação ("0:48 / 40 min"), os minutos da ficha viram
  meta, **o ▶ some** das séries de esteira, e um ▶ que já estava rodando é
  cancelado na confirmação. O cartão mostra "tempo da série" e "distância da
  série" — os mesmos números de baixo —, não o total do painel. A voz que o ▶
  dava (cada km, a metade, a meta) passou a seguir a esteira. Sem esteira
  conectada, o ▶ continua sendo o relógio.
- **Passar da meta não fecha a série**: a voz diz "Meta cumprida. Pode
  continuar". Quem decide quando acabou é a esteira parando.
  (`seguirEsteiraRef` ainda cobre o fim de um ▶, por segurança.)
- **Parar a esteira anota a série sozinha**, com o tempo real: o painel
  zerado, a conexão caindo (com a tela à vista), 15 s parado (0 km/h; nos
  outros aparelhos, pedal, passada e watts em zero), 15 s sem pacote nenhum
  com a tela à vista há mais de 5 s (a máquina parou de falar sem derrubar a
  conexão — `em`, a hora de cada pacote) ou o Desconectar. Sempre com pelo
  menos 1 minuto desde a anotação anterior.
- **Esteira desligada no botão** derruba o Bluetooth (`gattserverdisconnected`
  → `ligada: false`): conta como parada, e a série é anotada com o último
  pacote. Conferido no navegador.
- **Tela apagada não é esteira desligada** (`quedaBloqueio`, `telaApagou`).
  O Chrome do Android corta o Bluetooth da página que some da vista, e isso
  era lido como parada: a série fechava ("série anotada") com o dono ainda
  caminhando, e o resto virava outra série. Hoje a queda com a página
  escondida, ou nos 5 s depois de ela voltar, deixa a série **aberta e
  pausada**: o tempo fica congelado na linha da série, o ▶ não volta, a voz e
  o cartão dizem "nada se perdeu, reconecte" (o botão vira "Reconectar a
  esteira"), e há "Já terminei: anotar a série até aqui". Reconectada e
  confirmada (a confirmação continua obrigatória), a mesma série segue de
  onde estava, com o tempo de tela apagada junto — o painel não parou.
  `confirmouEst` lembra que a série é da esteira entre a queda e a nova
  confirmação (o `confirmada` da conexão nova começa falso). Conferido no
  navegador: 1:47, tela apagada, 2 min depois reconecta → 3:47, e uma série
  só de 247 s ao parar; e finalizar sem reconectar grava os 107 s.
- **"Finalizar treino" com a esteira andando** (`finalizar`, `finalizarPend`):
  anota a série aberta primeiro e só fecha o treino quando ela aparece feita
  na sessão — o `onFinalizar` do raiz lê a sessão dele, e chamar no mesmo
  instante gravaria sem a série.
- **O app fechado no meio da caminhada** (memória, bateria, recarga, sair da
  tela do treino — a conexão vive na `TelaSessao`): a cada 10 s vai um
  rascunho para `sessao.esteiraParcial` (tempo, km, kcal, subida, batimento e
  onde o painel estava). Ao reabrir o treino, ele vira a série, com um aviso
  verde "Recuperei a série". A régua recomeça **de onde o painel estava**
  (`painel`), senão a esteira, que continuou contando, levaria o tempo já
  recuperado de novo para a série seguinte; painel zerado nesse meio tempo
  (`reguaVelha`) volta a régua para zero. Anotar limpa o rascunho
  (`moverRegua`).
- Se a série já tinha sido marcada pelo ▶, o efeito das séries feitas troca o
  tempo planejado pelo medido (acima de 1 min) e recalcula a velocidade média.
- **O cartão mostra tudo o que a esteira manda**: ritmo, velocidade média,
  batimento (fresco, ou "— segure o pegador"), kcal, subida, MET, potência, e a
  linha "Nesta série" com tempo, km e ❤ média/pico/quanto foi medido. O
  quadro do batimento exige `d.bpm > 0`: o zero do pegador apaga o número mas
  deixa `bpmEm`, e o quadro mostrava vazio.

Coberto em `teste-fc.js` (reinício, distância pela velocidade, lacuna, pacote
relido) e conferido no navegador com a esteira falsa: 1 min programado, 85 s
andados, esteira parada → série com 85 s, km e batimento.

### O batimento em pedaços (`criarLeituraFc`, coberto por `teste-fc.js`)

Pedido do dono: "nem sempre estarei com as mãos onde capta o batimento".
Ninguém corre segurando o pegador, então o que chega são trechos. As regras:

- **Só leitura nova conta** (`bpmEm`, a hora em que o batimento chegou).
  Juntar os pacotes deixa o último número parado no objeto; somado a cada
  pacote, com as mãos fora do pegador, a média congelaria nele.
- **Cada leitura vale até a seguinte, no máximo 3 s.** A média é pelo tempo
  medido: quatro minutos sem as mãos não puxam a média nem a inventam.
- **Salto de mais de 20 bpm por segundo é ruído** do pegador mal tocado.
- **O pico é a maior mediana de três leituras seguidas**: um número solto não
  vira o recorde do treino.
- **A série guarda `bpmCob`**, a parte do tempo que foi medida, e a tela diz
  "medido em 40% do tempo" abaixo de 90%. No resumo de várias séries, cada
  média pesa pelo tempo medido nela.

### Sem esteira conectada (a maioria das academias)

Nem toda esteira tem FTMS, e o dono lembrou disso. Dois caminhos, nenhum
depende da máquina:

- **Passos e cadência pelo celular** enquanto o ▶ de uma série de esteira roda
  (`passosEst`, o mesmo `criarContadorPassos` do percurso). O toque no ▶ é o
  gesto que o iPhone exige para liberar o acelerômetro. **Celular parado no
  suporte não balança**: abaixo de 40 passos/min, ou com menos de 30 passos, ou
  em menos de meio minuto, nada é gravado — melhor do que um zero. Ficam
  `passos` e `cad` na série; o painel mostra "👣 2.410 passos · 159 por minuto".
- **"📟 Confira no painel da esteira"**: depois de marcar uma série sem
  conexão, uma linha opcional pede a distância e as kcal do painel. Quem muda a
  velocidade no meio da série erra a conta tempo × velocidade; a distância do
  painel corrige, porque o `km` digitado vence a conta (`medirCardio`).
- `cad` de esteira também é medida: o `moldeCardio` não a copia para a
  série seguinte (na escada, onde a cadência é o número do painel, copia).
- **Achado no teste**: o painel dividia os passos pelo minuto planejado da
  série, e não pelo tempo em que foram contados (91/min em vez de 159). Mostra
  a cadência gravada.

### Bicicleta, elíptico, escada e remo (o mesmo controle da esteira)

Pedido do dono: "replique esse controle da esteira para todos os outros
equipamentos". O FTMS é um serviço só (`0x1826`) com uma característica de
dados por aparelho, e cada uma tem o seu pacote — escrito byte a byte pela
especificação, como o da esteira:

| Aparelho | Característica | Leitor | O que vem |
|---|---|---|---|
| esteira | `0x2ACD` | `lerDadosEsteira` | velocidade, inclinação, distância, tempo, kcal, bpm |
| bicicleta | `0x2AD2` | `lerDadosBike` | velocidade, rpm (meias rotações), carga, watts, distância |
| elíptico | `0x2ACE` (flags de **3** bytes) | `lerDadosEliptico` | passos/min, nível, watts, inclinação, distância |
| escada (stepmill) | `0x2AD0` | `lerDadosEscada` | degraus/min, andares, subida |
| escada (degrau) | `0x2ACF` | `lerDadosDegrau` | andares, degraus, degraus/min |
| remo (e SkiErg) | `0x2AD1` | `lerDadosRemo` | remadas/min (meias), watts, distância, ritmo por 500 m |

- **Todos saem com os mesmos nomes** (`watts`, `cad`, `nivel`, `metros`,
  `segundos`...): o resto do app não sabe de que aparelho veio o número.
- **O perfil do exercício diz o aparelho** (`FTMS_DO_PERFIL`,
  `aparelhoDoEx`), e a conexão (`procurar(pedido)`) só aceita a
  característica dele: tocar numa bicicleta quando se pediu o elíptico é
  recusado com "este aparelho não é um elíptico", e a permissão é devolvida.
  Sem pedido (intervalado, Monster Run), continua sendo a esteira.
  **Comando, só na esteira**: nos outros o ponto de controle nem é aberto.
- **A escadaria de prédio** usa a conta da escada mas não tem Bluetooth
  (`semBluetooth: true` no exercício): nada de "Conectar a escada" ali.
- **Nível sem unidade**: cada fabricante escolhe a escala (8 ou 80 para o
  mesmo nível 8 do painel); acima de 40 é décimo (`nivelFtms`).
- **"Não disponível" não é número**: a especificação marca com 0xFFFF/0xFF, e
  lido como número uma esteira sem contador gravava **65.535 kcal** na série
  (e o odômetro somava isso como reinício). `energiaFtms` descarta. Esse
  defeito valia para a esteira desde o começo.
- Na série, **o que segue o painel ao vivo** é velocidade e inclinação na
  esteira e o nível nos outros; **watts e cadência entram no fim como média**
  (`criarMediaAparelho`): pelo tempo, só do tempo em movimento (zero é parado,
  não esforço), e menos de 10 s medidos não vira número. No ✓ o medido vence a
  sugestão da ficha.
- **O odômetro conta o tempo de quem se mexe** quando o painel não manda
  relógio (muita bicicleta não manda): velocidade, rpm ou watts acima de zero.
- Tudo o resto é o da esteira, sem código novo: um relógio só, a série fecha
  ao parar, a tela apagada não fecha nada, o rascunho de 10 s, finalizar
  anotando, o batimento em pedaços. O cartão (`ConexaoEsteiraSessao`, com
  `CARTAO_APARELHO`) diz o nome certo, o jeito de confirmar de cada um
  ("pedale ou mude a carga: se os números mudarem junto, é a sua") e mostra
  os números daquele painel. **Uma conexão por vez**: com a bicicleta
  conectada, o cartão da esteira diz isso em vez de mostrar números que não
  são dela (`outro`).
- **Entrada**: o azulejo da tela inicial virou **"Esteira e aparelhos"**, com
  as opções da esteira e, abaixo, bicicleta, spinning, elíptico, escada, remo
  e SkiErg (`iniciarEsteira` serve a todos). O guia do primeiro treino cita o
  aparelho certo.

Coberto por `teste-aparelhos.js` (26 checagens: os cinco pacotes, o 0xFFFF, a
escolha na conexão, a recusa do aparelho errado, pacote torto) e pelo
`teste-fc.js` (a média e o tempo de quem pedala). Conferido no navegador com
uma bicicleta falsa: 40 s a 200 W/90 rpm, 40 s a 120 W/70 rpm, parou de
pedalar → série de 83 s com 160 W, 80 rpm, nível 8.

### A varredura de erros (revisão independente + simulação)

Pedido do dono: "faça uma varredura de possíveis erros, simule e corrija".
Um revisor leu o fluxo inteiro só procurando defeito, e cada achado foi
simulado no navegador antes e depois do conserto:

1. **A esteira de um estranho entrava na série.** Conectada por engano e
   desconectada, ela anotava os 30 min dele como seus; e a conexão seguinte
   começava com esse tempo no odômetro. Hoje o odômetro só lê máquina
   **confirmada**, desconectar só anota máquina confirmada, e `confirmouEst`
   só sobrevive à queda da tela apagada.
2. **Desconectar contava a série duas vezes**: a régua não andava (o efeito
   das séries feitas saía cedo sem o `dado`), e o rascunho velho virava um
   falso "Recuperei a série" na volta. `anotarDaEsteira` move a régua na hora.
3. **Remover um exercício deslocava as séries**: a medição caía no exercício
   de baixo, até num de força. As chaves agora são o `uid` do item, no efeito
   e no rascunho.
4. **Um ✓ numa série que a máquina não conduzia** (remarcar uma feita,
   marcar uma digitada) levava o tempo em curso. Só a série conduzida no
   render anterior (`conduzidaAntes`) recebe o que a máquina mediu.
5. **Depois da última série planejada**, quem continuava andando ficava sem
   rascunho e sem voz. Hoje a máquina conduz uma série "a criar" (`serieAlem`),
   que o rascunho guarda e a recuperação cria.
6. **Os números da conexão anterior** apareciam na nova (batimento velho,
   distância congelada): `conectar` começa com `dado: null`.
7. **A máquina que para de mandar** sem derrubar a conexão nunca fechava a
   série: ver a regra dos 15 s sem pacote, acima.
8. **Uma gravação apagava a outra** quando chegavam juntas (o efeito que
   segue o painel escrevia a sessão inteira de uma cópia velha): é funcional
   agora, e não mexe em série já feita.

### O que pode dar errado, e o que o app faz

- **A esteira manda os números em pacotes alternados.** O padrão divide o que
  não cabe num pacote ("more data"), e muita esteira alterna dois: um com
  velocidade e tempo, outro só com distância. O gancho (`usarEsteira`)
  **junta** cada pacote no anterior. Substituindo, metade dos números sumia a
  cada meio segundo, o cartão mudava de altura e **a tela inteira tremia** —
  achado no celular do dono, no primeiro treino real. Medido no navegador: a
  altura do cartão alternava 782/770 px a cada pacote, e fica fixa juntando.
- **A esteira só conta e não aceita comando.** É comum, e continua valendo: a
  velocidade e a distância entram sozinhas, sem digitar. A tela diz isso.
- **A esteira recusa** (`Control Not Permitted` etc.): vira frase em português
  (`MOTIVO_FTMS`), não código de erro.
- **A esteira ignora o comando**: toda ordem tem prazo de 4 s. Sem isso a tela
  ficaria presa em "mandando…" para sempre.
- **A conexão cai**: o estado volta para desconectado e a tela avisa.
- **Recusa no meio do treino não derruba o treino.** Vira aviso; a pessoa ajusta
  no painel como sempre fez.

### O que não funciona, e não é escolha nossa

**No iPhone não funciona.** O Web Bluetooth existe no Chrome do Android e do
computador; a Apple não o oferece a nenhum site e disse que não pretende. É a
mesma limitação da cinta cardíaca. **A tela diz isso em vez de mostrar um botão
que não vai funcionar.**

**Nem toda esteira expõe FTMS.** Muita máquina de academia grande usa protocolo
próprio e só conversa com o app da marca. O jeito de descobrir é a esteira
anunciar o `0x1826` — e o filtro da busca já faz essa prova: se ela não aparece
na lista, não é compatível.

### Como isso foi testado sem uma esteira

`teste-esteira.js` (88 checagens) tem três partes. A primeira monta pacotes
**byte a byte a partir da especificação** e confere a leitura: é código de bits,
em que ler um campo na ordem errada não dá erro — dá número errado, que é pior,
porque aparece na tela com cara de verdade.

A segunda é uma **esteira de mentira** (`esteiraFalsa`), o mesmo molde que o
projeto usa para falar com o Jarvis sem microfone. Ela prova a coreografia que
é o risco real: pedir controle antes de comandar, casar cada resposta com a
ordem certa, e os três casos ruins — a que recusa, a que não responde e a que
só conta.

A terceira cobre os métodos de velocidade: que a rampa **só sobe**, que a onda
alterna sempre, que a escada é simétrica, que a surpresa com a mesma semente dá
o mesmo treino, e que a frase do aviso diz o sentido certo nos quatro casos
(acelera, reduz, vai para, segue em).

No navegador, a mesma esteira falsa foi injetada no lugar do `requestDevice` e o
treino rodou inteiro: conectar, pedir controle, `[0x02, 0x66, 0x03]` = 8,70 km/h
no primeiro bloco, `[0x02, 0x4C, 0x04]` = 11,00 no seguinte, e `[0x08, 0x01]` no
botão de parar. **O que só aparece assim**: a voz mandava "ajuste a esteira para
8,7" logo depois de o app ter ajustado. `textoAlvoFala` agora sabe se o app
comandou — e a diferença entre as duas frases é a diferença entre uma ferramenta
que cuida e uma que dá ordem.

## O espelho da academia (`guiaNoEspelho`, botão 🪞 no scanner)

Em academia cheia quase nunca há onde apoiar o celular de frente para quem
treina — **mas sempre há um espelho**. Apoiar o celular apontado para ele
resolve: a câmera vê o corpo inteiro, de longe, de qualquer canto da sala.

**Duas coisas mudam, e as duas vêm da mesma geometria.** No uso normal a
pessoa está de FRENTE para a câmera; no espelho ela está de COSTAS (ela olha
o espelho, e a câmera olha o reflexo dela).

1. **O lado dela passa a coincidir com o lado da imagem.** De frente, a mão
   esquerda aparece à direita do quadro, e por isso "o corpo tem de ir para a
   direita da imagem" vira *"ande para a sua esquerda"*. De costas é o
   contrário — e inverter errado manda a pessoa para fora do quadro, que é
   justamente o que o enquadramento existe para evitar.
2. **Os nomes de esquerda e direita saem trocados.** O reflexo é um corpo de
   verdade para o modelo de pose, e ele nomeia os lados pelo que vê: o que ele
   chama de ombro esquerdo é o ombro **direito** de quem está ali. Isso não
   muda a contagem (no alternado os dois lados são somados), mas muda o que a
   tela diz — e dizer "braço esquerdo" apontando para o direito é pior que
   não dizer nada.

**O que NÃO muda: a posição do corpo no quadro.** O espelho reflete a
profundidade, não a largura — quem anda para a direita da sala aparece andando
para a direita do quadro, com ou sem espelho. Por isso a **seta continua
saindo do mesmo cálculo**, e `guiaNoEspelho` devolve `seta` intacta. Inverter
a seta junto com o texto seria o erro fácil aqui.

- A escolha fica em `voz.espelho`: quem treina no espelho treina sempre no
  espelho, e reativar a cada série cansa.
- A dica ("sem espaço para apoiar o celular? aponte para o espelho") aparece
  só enquanto a pessoa se posiciona, e só com o modo desligado. Sem ela
  ninguém descobre o botão — e o modo serve justamente a quem não conseguiu
  apoiar o celular de frente.
- **Limite conhecido:** com outras pessoas no reflexo, o modelo segue um
  corpo só. A tela diz para preferir um pedaço do espelho sem gente atrás.

Coberto por `teste-espelho.js` (26 checagens), que cobra o sentido antes de
qualquer outra coisa.

## O que este aparelho suporta (`recursosDoAparelho`, Ajustes › Este app)

"O Jarvis não funciona no meu celular" é um sintoma com seis causas, e nenhuma
aparecia em lugar nenhum. As bandeiras já existiam espalhadas pelo arquivo
(`VOZ_OUVE`, `CARDIO_DISPONIVEL`, `ESTEIRA_DISPONIVEL`, `AVISO_DISPONIVEL`…),
cada uma escondendo um botão em silêncio — e quem ficava sem o recurso
concluía que o app estava quebrado.

- **A coluna que importa não é o nome da API: é o que se perde sem ela.** Uma
  lista de "Web Bluetooth: não" não ajuda ninguém; "a cinta e a esteira não
  vão conectar" ajuda. E a explicação só aparece no que **falta**: repetir o
  que funciona é encher a tela de texto que ninguém lê.
- **Gravar é o único que não dá para saber olhando: tem de tentar escrever.**
  Em janela anônima e em navegador embutido o `localStorage` existe e a
  escrita é recusada — que é exatamente o caso que derruba o app. Por isso é
  o único marcado como `grave`, e a leitura dele vence a de todos os outros.
- Recebe o ambiente por parâmetro em vez de ler o `window` direto. É o que
  permite ao teste simular um WebView, um iPhone e o navegador do Instagram
  sem ter os três na mão — e foi assim que a decisão sobre o app nativo
  (abaixo) deixou de ser palpite.
- Só mede quando a pessoa abre o cartão: a checagem de gravação escreve de
  verdade no armazenamento.

Coberto por `teste-recursos.js` (31 checagens).

## Óculos inteligentes e app nativo: o que foi apurado e decidido

Pedido do dono: usar os Ray-Ban Meta olhando para um espelho, com a câmera
dos óculos contando as repetições. **Não dá, e o motivo não é preguiça de
implementar.** Fica registrado aqui para não se refazer a pesquisa:

1. **A câmera dos óculos é exclusiva do SDK nativo.** O *Meta Wearables Device
   Access Toolkit* dá vídeo ao vivo — para app **iOS/Android** em Swift ou
   Kotlin. A plataforma de *Web Apps* da Meta recebe posição do aparelho,
   localização, movimento do Neural Band e entrada de texto. **Câmera e
   microfone não.**
2. **E os Web Apps nem rodam no Ray-Ban Meta comum**: são do Ray-Ban
   **Display**, o modelo com tela.
3. **A Meta ainda não abriu a publicação** de apps que usam o toolkit. Mesmo
   construindo, não haveria como distribuir.

**E transformar o Treino Livre num app nativo não resolveria.** A escolha da
embalagem decide tudo:

| | TWA | WebView |
|---|---|---|
| Histórico de quem já usa | preservado (compartilha o armazenamento do Chrome) | **perdido** (armazenamento separado) |
| Ponte para código nativo | não tem | tem — é o que os óculos exigiriam |

Ou seja: **a única embalagem que alcança os óculos é a que apaga o histórico
de todo mundo** — e num app em que os dados vivem só no aparelho, esse é o
pior risco que existe. Pior ainda: o WebView não é o Chrome, e justamente os
recursos centrais deste app são os que ele não garante (reconhecimento de
fala, que é serviço do navegador e não do Chromium; e Web Bluetooth, de que
dependem a cinta e a esteira).

**O que os óculos JÁ fazem hoje, de graça:** eles pareiam como fone Bluetooth
comum. O Jarvis fala no ouvido e o microfone deles ouve os comandos. Os óculos
podem ser a boca e os ouvidos; não podem ser os olhos.

**Se um dia a Meta abrir a publicação**, o formato certo não é transformar
este app: é um app nativo **separado** que só pega o vídeo dos óculos, roda o
MediaPipe ali e entrega os pontos do corpo — como a cinta cardíaca faz hoje.
O app web continua sendo o app; o nativo vira um sensor.

## Monitor cardíaco, e o que a web não alcança

**Funciona:** qualquer monitor que exponha o serviço padrão de frequência
cardíaca do Bluetooth (0x180D) — cintas peitorais Polar, Garmin, Wahoo e
sensores de braço. E, pelo mesmo caminho, a esteira que expõe o `0x1826`
(ver *A esteira por Bluetooth*). O navegador fala direto com o aparelho, sem app no meio e
sem servidor. A pessoa escolhe o dispositivo na janela do próprio navegador.
O batimento aparece no treino e a média e o máximo entram no registro (`bpm`).

**Pelo site, não funciona:** ler o Google Fit, o Health Connect ou o Apple
Health. São APIs de sistema operacional. **No Android, o app Android faz isso**
(ver *O app Android e o Health Connect*). No iPhone continua impossível: a
Apple não abre o Apple Saúde para site nenhum, e não há app nativo para iOS.

Os relógios que **transmitem** o batimento (Garmin, Polar, Coros, Amazfit,
Xiaomi, Huawei, cada um com o seu "transmitir FC" nos ajustes) conectam pelo
mesmo 0x180D da cinta e dão o número ao vivo. O Galaxy Watch e os anéis
(Galaxy Ring, Oura) não transmitem: os números deles chegam pelo Health
Connect, depois que o app da marca sincroniza.

## O app Android e o Health Connect (pasta `android/`, aba ❤ Saúde)

Pedido do dono: usar os dados do Samsung Health, do Google Fit, do relógio e
do anel. **Em português o Health Connect se chama "Conexão Saúde"** nas
Configurações do celular — buscar "Health Connect" não acha nada, e foi onde o
dono travou. Todo texto da tela que manda a pessoa até lá diz os dois nomes. Todos depositam no **Health Connect**, a central de saúde do Android,
e só um app instalado lê de lá. Então existe um APK — e ele **é o próprio
site**, aberto no Chrome em tela cheia (Trusted Web Activity), com uma parte
nativa pequena que só fala com o Health Connect.

**Por que TWA e não WebView**, e não mude isso sem pesar os três:
1. **Os dados de quem já usa estão no Chrome.** O TWA abre no Chrome (forçado
   em `Site.kt`, mesmo com outro navegador padrão) e enxerga o mesmo
   `localStorage`. Uma WebView começaria vazia: todo mundo perderia o histórico.
2. **Bluetooth da esteira e da cinta e o reconhecimento de voz** só existem no
   Chrome. A WebView não tem Web Bluetooth.
3. **O site continua sendo o app.** Publicar o `index.html` atualiza o app
   instalado; o APK só muda quando a parte nativa muda.

**O caminho dos dados** (sem servidor nenhum, como o resto):
- **Ida**: o botão 🔄 Sincronizar chama `intent://saude?d=…#Intent;scheme=treinolivre;package=br.com.treinolivre.app`.
  O `d` leva os treinos dos últimos 30 dias que ainda têm o que fazer lá
  (`treinosParaSaude`): ser gravados (`g`) ou buscar o batimento do relógio.
  **Tem de ser um toque**: o Chrome não abre outro app sem gesto.
- **Lá**: `SaudeActivity` pede a permissão (só na primeira vez), grava os
  treinos como `ExerciseSessionRecord` (`clientRecordId` = "treinolivre-" + id:
  mandar de novo substitui, não duplica) e `LeitorSaude.ler` junta 30 dias
  por dia (passos, distância, kcal ativas, batimento), sono, peso (120 dias),
  repouso, oxigenação (SpO2), VFC, atividades dos outros apps e o batimento **dentro da janela de cada
  treino** (`fcTreinos`). Cada parte só roda com a sua permissão.
- **Volta**: abre o site com `?app=android#saude=<base64url>`, numa tarefa
  nova (`CLEAR_TASK`): a página recarrega e lê o hash, como `#ficha=`.
  `lerPacoteSaude` confere campo a campo (é dado vindo de link);
  `juntarSaude` guarda em `saude` (persistido, **fora do backup**: é cópia);
  `batimentoNosTreinos` põe o batimento do relógio nos treinos **sem** `bpm`
  — o medido ao vivo (cinta, esteira) vale mais.
- **Ao abrir pelo ícone** (`AberturaActivity`): com a leitura já permitida,
  passa no Health Connect antes de abrir o site (no máximo 4 s, e no máximo uma
  vez a cada 10 min) e manda o pacote com `s: 1` (`silencioso`): sem aviso e
  sem trocar de aba. Só roda com o app fechado: aberto, o ícone traz a tarefa
  de volta e o treino em andamento não recarrega.
- **Erros voltam pelo mesmo link** (`erro`: `indisponivel`, `atualizar`,
  `sem-permissao`, `falhou`), e o site diz o que fazer (`ERROS_SAUDE`). Um
  erro não apaga o que já estava na tela.

**A tela** (`TelaSaude`, Histórico › ❤ Saúde): **em todo Android**, Sincronizar
e a hora da última leitura. Achado no celular do dono: o ícone que o Chrome
criou (o PWA) e o do APK são iguais, e ele abria o antigo, onde só havia o link
do APK. O botão chama `treinolivre://saude` de qualquer lugar; sem o app, o
Chrome cai no APK. Fora do app e sem dados ainda, o link do APK fica embaixo;
iPhone e computador, a explicação. Depois o batimento ao vivo (a cinta ou o
relógio que transmite), passos com anel e barras da semana (meta 8.000,
`META_PASSOS`), frequência cardíaca, sono (barras com a linha de 7 h), peso,
as atividades dos outros apps (`nomeAppSaude`; `semRepetir` junta a mesma caminhada gravada pelo Samsung Health e pelo Google Fit) e os números do próprio Treino
Livre, que valem em qualquer aparelho. **O peso do Health Connect entra no
`pesoCorporal`** quando é mais novo que a última pesagem daqui.

**O APK é montado pelo GitHub Actions** (`.github/workflows/android.yml`) a
cada push que mexe em `android/`, e só o do `main` vira versão (Release)
— é ela que `LINK_APK` baixa (`releases/latest/download/treino-livre.apk`).
**A sessão na nuvem não monta o APK**: `dl.google.com` (onde ficam o Android
SDK e as bibliotecas do Google) está fora da lista de rede dela. Compilar é
pelo Actions, e os erros se leem no log do job.

**A chave do APK.** Sem o segredo `ANDROID_KEYSTORE_B64` (o `.jks` em
base64) e `ANDROID_KEYSTORE_PASS` no repositório, o Actions gera uma chave e
a guarda no cache, que some depois de 7 dias sem uso. Chave nova obriga a
desinstalar o app antes de instalar a versão nova (os treinos ficam no
Chrome e não se perdem; as permissões do Health Connect sim). Para fixar:
`keytool -genkeypair -keystore treinolivre.jks -alias treinolivre -keyalg RSA -validity 10000`,
e o `base64` dele em Settings › Secrets › Actions. **Nunca suba o `.jks`.**

**A barra de endereço.** Sem o `assetlinks.json` na raiz do domínio
(`carlosjr81.github.io/.well-known/`, que é **outro repositório**,
`carlosjr81.github.io`), o Chrome abre o app com uma barra de endereço e um ✕
que fecha tudo. O conteúdo desse repositório está pronto em `dominio/` (com a
impressão digital da chave atual, o `.nojekyll` sem o qual o Pages esconde o
`.well-known`, e um `index.html` que leva ao app). A sessão na nuvem não
consegue **criar** repositório na conta do dono (403): ele cria o
`carlosjr81.github.io`, público, e os arquivos de `dominio/` vão para lá.
**A chave não pode mudar**: o `manter-chave.yml` lê o cache duas vezes por
semana para ele não expirar; o definitivo é o segredo `ANDROID_KEYSTORE_B64`.

**Validado no celular do dono (Galaxy + Watch8, 21/10/2026)**: permissão,
leitura (passos, distância, kcal, batimento, repouso, SpO2, sono, peso,
atividades), gravação de 6 treinos e batimento do relógio em 4 deles, e a
volta para o site no meio de um treino em andamento (ele continua lá).
**Não validado**: VFC (o relógio dele não mandou nenhuma). Coberto por
`teste-saude.js` só o lado do site (o pacote, o resumo, o batimento nos treinos).

## Os óculos Ray-Ban Meta no Eyes Scan (👓, app Android)

Pedido do dono: usar a câmera dos óculos no Eyes Scan. **A câmera dos óculos
vê o que a pessoa vê, não a pessoa** — sozinha, ela não enxerga joelho,
quadril nem postura de quem os usa. O que faz valer é o **espelho da
academia**: olhando para ele, os óculos veem o corpo inteiro, e o modo 🪞 do
scanner já sabe ler o reflexo. Serve também para o personal ver o aluno.

**O caminho** (nada passa por servidor):
1. O 👓 do scanner (só no Android) sorteia uma chave (`novaChaveOculos`) e
   chama `treinolivre://oculos?k=<chave>` (`linkOculos`). Precisa de toque: o
   Chrome não abre outro app sem gesto. Sem o APK, o Chrome baixa o APK.
2. `OculosActivity` pede o Bluetooth do Android, registra o Treino Livre no
   app **Meta AI** (`Wearables.startRegistration`, uma vez) e a câmera dos
   óculos (`Wearables.RequestPermissionContract`), e passa ao `OculosService`.
   A tela some e o scanner volta para a frente, esperando.
3. `OculosService` (serviço em primeiro plano, `connectedDevice`) abre a
   sessão (`Wearables.createSession(AutoDeviceSelector())`), a câmera
   (`addCamera`, 504×896 a 15 quadros) e serve o quadro mais novo em
   **`http://127.0.0.1:47890/quadro.jpg?k=<chave>`**. Sem a chave, 403; o CORS
   é só do site do Treino Livre. Para sozinho quando ninguém pede quadro por
   20 s (o scanner fechou) ou pelo "Parar" da notificação.
4. A página (`abrirFluxoOculos`) desenha cada quadro num canvas e faz dele um
   vídeo (`captureStream`). **Para o resto do Eyes Scan é uma câmera como
   outra qualquer**: contagem, calibração, postura, espelho e enquadramento não
   sabem de onde a imagem veio. Fechar o scanner manda `/parar`.

**Decisões que parecem estranhas:**
- **A cor é descoberta no aparelho** (`CoresYuv`). A Meta não documenta o
  arranjo YUV do quadro decodificado, e a primeira versão mandava só o brilho
  (Y): no primeiro teste que deu certo, a imagem saiu em preto e branco. Hoje
  os primeiros quadros votam: intercalado ou em planos (em planos, bytes
  vizinhos quase não diferem; intercalados, U e V se alternam) e a ordem (o V
  costuma ficar acima do U em cena com gente e luz quente). Seis votos iguais
  decidem; cena cinza não vota; até lá sai o brilho. A lógica foi conferida
  numa cópia em JavaScript com os quatro arranjos (I420, YV12, NV12, NV21).
- **O kit roda em modo de desenvolvedor**: `APPLICATION_ID` e `CLIENT_TOKEN`
  "0" no manifesto, e a pessoa liga o modo de desenvolvedor no app Meta AI.
  Publicar para todo mundo exige registrar o app no Wearables Developer Center,
  e a Meta diz que a câmera ainda não vale para publicação em produção.
- **O Chrome pede a permissão de rede local** ("acessar outros apps e serviços
  deste aparelho") na primeira vez: é o 127.0.0.1. A tela de espera avisa.
- **O app Android passou a exigir Android 10** (`minSdk 29`), o mínimo do kit
  da Meta. Quem tem Android 8 ou 9 continua com tudo pelo navegador.

**Primeiro teste no celular do dono (21/10/2026): parou em "Ligando a
conexão"** — a página nunca recebeu resposta do app. Os suspeitos: a
permissão de rede local do Chrome (no Chromium de teste ela vem negada por
padrão, e com ela negada o `fetch` ao 127.0.0.1 falha com "Failed to
fetch"), ou o serviço caindo ao abrir a porta (ela abria na linha principal
do Android; hoje abre numa linha própria, e uma falha vira aviso). Desde
então a espera mostra um **diagnóstico** (o app respondeu? o último erro, e a
permissão de rede local do Chrome, `permissaoRedeLocal`), tem **🔁 Tentar de
novo**, e o app mostra um aviso (Toast) a cada passo: serviço ligado,
procurando, conectando, imagem chegando, ou o motivo da falha. **Se for a
permissão de rede local e o Chrome não a oferecer dentro do app**, o caminho
seguinte é o canal de mensagens do próprio TWA (postMessage do Custom Tabs),
que não passa pela rede.

**O resultado do diagnóstico, e a troca de caminho.** No celular do dono os
óculos **bipavam** (a parte nativa ligava a câmera) e a página mostrava
"Failed to fetch" com a rede local "ainda não perguntada": dentro do app, o
Chrome barra o 127.0.0.1 **sem perguntar**. Por isso a imagem passou a ir pelo
**canal de mensagens do TWA** (`Canal.kt`, postMessage do Custom Tabs, Chrome
115+), que não é rede:
- O app abre o site com uma sessão sua (`CustomTabsClient` →
  `newSession` → `TrustedWebActivityIntentBuilder(...).build(sessao)`), e não
  mais pelo `TwaLauncher`. A cada página carregada (`NAVIGATION_FINISHED`) ele
  pede o canal (`requestPostMessageChannel`) e, pronto, manda "ola": é essa
  mensagem que entrega a porta à página. **Se a ligação com o Chrome falhar ou
  passar de 3 s, cai no `TwaLauncher` de sempre** — o app abre igual, sem o canal.
- O assetlinks do domínio ganhou `delegate_permission/common.use_as_origin`
  (é o que deixa o app falar como `https://carlosjr81.github.io`), e o
  manifesto declara o `PostMessageService`.
- **O ouvido do canal fica no primeiro script** (`CANAL_APP`), a única
  exceção ao "só dados ali": a porta chega quando a página termina de
  carregar, antes de o Babel acabar de compilar o app, e se perderia.
- **A origem da mensagem não é confiável como filtro.** Enquanto a validação
  do `use_as_origin` não chega ao aparelho (o Chrome guarda o assetlinks por
  até uma hora), a mensagem do app vem com a origem vazia, "null" ou
  `android-app://`. O primeiro filtro (só a origem do site) descartava a porta
  calado: no celular do dono, "Canal do app: não" com os óculos bipando. Hoje
  vale também a mensagem "ola" e as origens do app, o diagnóstico conta as
  mensagens vistas e de onde vieram, e o app avisa (Toast) cada etapa do
  canal: recusado, não confirmado, demorou, ligado.
- Protocolo: app → página `Q:<jpeg em base64>` (no máximo ~12 por segundo, a
  câmera em 360×640) e `E:<estado>`; página → app `vivo` a cada 5 s e
  `parar` ao fechar o scanner. O 127.0.0.1 continua como reserva.
- Testado no navegador fingindo o app (uma `MessageChannel` entregue à
  página): os quadros viram o vídeo sem nenhum pedido de rede, e o ✕ manda
  `parar`.

**E o canal também não chegou** ("mensagens vistas: 0", aberto pelo app).
O Chrome do celular do dono não entregou nem a rede local nem o canal do
TWA. Daí a solução que não depende do Chrome: **o Eyes Scan dos óculos roda
dentro do app**.
- O 👓 do site manda ao app os dados da série (`linkOculos(chave, extra)`:
  exercício, nome, grupo, repetições, peso, série, espelho, contar alto, auto)
  e **fecha o scanner do site**.
- `OculosActivity`, depois das permissões, abre a mesma página num navegador
  do próprio app (WebView) com `?modo=oculos`. O site, nesse modo
  (`MODO_OCULOS`), desenha só `TelaOculosNativa`: o `ScannerEyes` com
  `fonteOculos`, sem portaria, abertura nem treinos (o WebView não enxerga os
  dados do Chrome, e não precisa).
- O quadro passa pela ponte `window.OculosNativo` (`addJavascriptInterface`):
  `quadro()` devolve o JPEG mais novo em base64 (vazio se não há outro),
  `estado()`, `registrar(json)` e `fechar()`. Nenhuma rede.
- **Registrar** volta ao app de verdade pelo link `#oculosSerie=` (como a
  saúde volta por `#saude=`); o site guarda a série em
  `localStorage["treinolivre:oculosSerie"]`, abre o treino, e a `TelaSessao`
  a registra pelo mesmo `registrarDoScanner` do scanner (descanso, recorde e
  voz incluídos). Pendência com mais de 10 min é descartada.
- **`OculosActivity` mora na mesma tarefa do app** (sem `taskAffinity=""`).
  No celular do dono, com ela numa tarefa à parte, a volta do Meta AI (registro
  e permissão da câmera) caía no treino do Chrome e a tela dos óculos ficava
  escondida atrás — "autorizei e voltou para o treino". E a resposta "negado"
  do Meta AI não é final: ele pode devolvê-la antes do toque em Permitir, então
  o app confere a permissão de novo por 15 s antes de desistir.
- **Lento no primeiro teste.** A página pedia quadro a cada 66 ms depois de
  desenhar o anterior, o vídeo do canvas saía a 15 por segundo e os óculos
  mandavam 15 em JPEG 70. Hoje: pergunta a cada 25 ms (sem quadro novo a ponte
  devolve vazio), o base64 é decodificado pelo navegador (`fetch` de um
  `data:`), o canvas sai a 30, e os óculos mandam 24 por segundo, 360×640, JPEG 60.
- **Com os óculos, o "andando" fica desligado** (`semAndar` no
  `criarContador`). A câmera vai na cabeça: cada olhada para o lado move o
  corpo inteiro na imagem, e o `deslocando` pausava a contagem com "🎯
  Andando" (visto no celular do dono, já com a imagem colorida).
- No WebView não há voz do navegador: a contagem em voz alta vira só o bipe.
- O app avisa a página que está vivo a cada 5 s enquanto ela carrega o
  reconhecimento (8 MB na primeira vez), senão o serviço desligaria os óculos.
- Canal do TWA e 127.0.0.1 continuam no código, sem uso no caminho principal.
- Testado no navegador com a ponte de mentira: a imagem chega, Registrar
  devolve a série pela ponte, e a volta com `#oculosSerie=` marca a série,
  começa o descanso e fala a confirmação.

**Funcionou no celular do dono (Galaxy + Ray-Ban Meta, 22/10/2026)**, depois
de pôr a tela dos óculos na mesma tarefa do app: imagem chegando, esqueleto e
enquadramento. Faltava a cor.

**Testado só no navegador**, com óculos de mentira (um servidor local que
manda quadros): os quadros viram o vídeo do scanner, o ✕ fecha e manda
`/parar`, e nada mais é pedido depois. O teste não pode usar o `intent://`
de verdade: no Chromium de computador ele abre uma janela que trava os
cliques. **Nada do lado nativo dos óculos foi visto num aparelho.**
`teste-saude.js` cobre a chave, o link e o endereço.

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
- Hoje: 177 dos 274 exercícios com imagem do wger. Os 12 movimentos funcionais
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
- **Busca de exercícios** (`buscarExercicios`, coberta por `teste-busca.js`) — as
  três buscas (aba Exercícios, editor de ficha e "adicionar" no treino) usam a
  mesma função. Pedido do dono, no meio de um treino: "ombros" não trazia o
  desenvolvimento no Smith, porque só o nome era olhado. Hoje cada palavra pode
  casar com o nome (12 se for a primeira palavra, 10 no resto), o apelido de
  `APELIDOS_EXERCICIO` (8), o grupo ou o músculo **principal** pelos
  `CONCEITOS_BUSCA` ("braço", "barriga", "bumbum", "posterior", "gêmeos",
  "aeróbico"...) (6), o equipamento ou o nome em inglês (4). **Precisa**: todas
  as palavras têm de casar ("ombro smith" traz só ombro no Smith), e músculo
  secundário não conta — o supino trabalha ombro, mas quem busca "ombro" não
  quer o supino. A exceção é glúteo em "perna", com nota 2, depois dos de
  perna. Prefixo vale ("omb" já acha) e plural é singular. Conceito novo entra
  em `CONCEITOS_BUSCA`, não num `if` na tela.
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
- **O alvo segue o exercício em que a pessoa está** (`alvoDaSessao`, com o foco
  `focoEi`). É o que permite dizer só "Jarvis, 80 por 10". Enquanto o exercício
  do foco tem série pendente, é ele; acabou, o próximo da lista **depois** dele;
  só então os que ficaram para trás. No bi-set, a vez é do parceiro com menos
  séries feitas. **O foco muda em qualquer toque na série** (`upSerie`), não só
  pela voz: antes era a primeira série pendente da ficha inteira, e quem pulava o
  hack e marcava a flexora no ✓ ouvia "próxima: agachamento no hack" a cada
  série — e o que ditasse sem dizer o aparelho iria parar no hack. Coberto por
  `teste-alvo.js`. O cartão alvo ganha anel rosa e uma
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

### Falar não é ouvir (`narrarVoz`, campo `voz.narrar`)

**Quem treina com o celular no bolso e fone bluetooth não vê frase nenhuma na
tela.** Até aqui, metade das confirmações do app só existia escrita — e a outra
metade só saía com o microfone ligado, porque estava amarrada a `vozAtiva`.

São duas coisas diferentes: `voz.falar` é ele **falar**, `vozAtiva` é ele
**ouvir**. `narrarVoz` fala sem depender do microfone, e `voz.narrar` liga os
avisos do treino:

- **Série anotada** — "Série 2 de 3 anotada. Descanso de um minuto e meio."
- **Fim do descanso** — "Descanso fechado. Próxima: série 1 de agachamento sumô."
- O recorde, quando acontece.

`textoDuracao` existe para isso: "90 segundos" é como se escreve, "um minuto e
meio" é como se fala.

Fica separado de `contarAlto` (a contagem do scanner) de propósito: em academia
cheia a pessoa pode querer um e não o outro.

**Com a tela apagada, o Android cala a síntese de voz da página, mas o som
continua** — os bipes dos últimos segundos chegavam e a frase do fim do
descanso, não. Então, com a tela apagada, a frase fica guardada
(`falaPendente`) e é dita quando a tela acende (até 3 minutos depois), e o que
avisa na hora é a `melodia(TOQUE_VOLTA)`: três notas subindo, duas vezes,
repetidas 15 s depois se a pessoa não voltou. **As notas são agendadas no relógio
do Web Audio**, e não em `setTimeout`: com a tela apagada o navegador atrasa todo
timer para no mínimo um segundo, e a melodia sairia picotada.

**E a notificação** (`avisarEmSegundoPlano`) cobre o que a voz não cobre. **No
Android ela só sai pelo service worker** (`registration.showNotification`):
`new Notification()` lança "Illegal constructor" lá, e o erro era engolido — o
aviso nunca chegava justamente no aparelho em que mais importa. Quem perdeu o
aviso com a tela apagada e nunca respondeu à permissão vê, na faixa do descanso,
o botão "🔔 Ativar aviso": é o momento em que a pergunta faz sentido.
 com a
tela apagada ou o app atrás de outro, o navegador pode engolir o áudio. Ela só
dispara quando o app **não** está na frente, senão vira aviso duplicado, e a
permissão é pedida nos ajustes por quem foi procurar isso — e não numa janela no
meio do treino de quem está levantando peso.

### O botão flutuante sai da frente (`PainelJarvis`, campo `botaoVoz`)

A queixa era sempre a mesma: o botão cobre o ✕ do exercício, o ✓ da série, o
número do descanso. Duas respostas, porque o problema tem duas metades:

- **Ler o que está atrás**: parado e sem ouvir por 4 segundos, ele fica
  translúcido (0,34) e encolhe. Um toque o traz de volta inteiro — **e só
  isso**: translúcido, o primeiro toque acende e o segundo liga o microfone
  (`acordou` no `inicioRef`). É o combinado dos botões fantasma (ver Eyes Scan).
- **Clicar no que está atrás**: arrastar o botão para outro lugar. A posição é
  guardada em `botaoVoz` (`{ lado, y }`) — quem o tirou da frente uma vez não
  quer encontrá-lo de volta no caminho na próxima abertura. Ao soltar, ele
  **encosta na borda mais perto**: largado no meio da tela voltaria a cobrir
  conteúdo, que é o problema que se está resolvendo.

O rótulo embaixo diz **"arraste p/ mover"** enquanto o botão nunca foi movido, e
volta a dizer "Jarvis" depois. Capacidade que ninguém descobre não existe.

**Dois defeitos de gesto, os dois achados testando:**

1. **Capturar o ponteiro no `pointerdown` engolia o toque.** Com a captura na
   caixa, o navegador manda o clique para o ancestral comum e não para o botão —
   o microfone deixava de ligar. Mas capturar só no primeiro movimento perde o
   arrasto rápido, que sai de cima do botão antes do primeiro `pointermove`.
   A saída é capturar desde o `pointerdown` **e resolver o toque no `pointerup`**,
   deixando o `onClick` só para o teclado.
2. **A marca de "foi arrasto" tinha prazo de 60 ms.** O clique que chegasse
   depois disso passava, e arrastar o botão ligava o microfone junto, toda vez.
   Hoje a marca fica de pé até o próximo `pointerdown`, e o `onFocus` a limpa
   para o teclado continuar funcionando.

O ícone é SVG (`IconeMicrofone`), não emoji: emoji muda de desenho em cada
aparelho e nunca combina com o resto da interface.

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
- **O nome dele vira James, Travis, Charlie, Jorge e "jogos".** Todos colhidos
  de diagnósticos — "jorge" fica de fora da distância de edição, então entra na
  lista `APELIDOS_JARVIS`.
- **"Acabei de fazer a quarta série com 108 kg, 12 repetições, anota aí" era lido
  como finalizar o treino**, por causa do "acabei". Só não encerrou o treino no
  meio porque o nome tinha chegado como "Jorge". Frase que fala de série, ou que
  tem número com kg, repetições ou "por" (`ditaSerie`), nunca finaliza.
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
hoje** e só depois nos 274: quem fala "supino" no meio do treino quer o supino
que está na ficha. Na pontuação, quem acerta mais palavras do nome ganha de quem
acerta uma só — sem isso "rosca direta" perdia para "Rosca 21".

**O reconhecedor estraga justamente a palavra que diferencia.** Num treino real,
"cadeira extensora" chegou como "cadeira estensora": só "cadeira" casou, e a série
foi parar na **cadeira abdutora**, que ganhava o empate por ter o nome mais curto.
Daí três regras:

- `PALAVRAS_DE_APARELHO` ("cadeira", "mesa") dizem o tipo de aparelho e não qual
  é: **sozinhas não escolhem exercício**. Sem outro sinal, a série vai para o
  exercício da vez.
- `quaseIgual` aceita a palavra estragada ("estensora", "extensão", "x tensora")
  valendo metade, e **a exata sempre ganha da parecida** — "adutora" e "abdutora"
  estão a uma letra uma da outra.
- **Dentro da ficha só vale palavra exata.** Com só a abdutora na ficha,
  "adutora" casaria com ela por parecença em vez de buscar a adutora no catálogo.

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
- **Histórico › ❤ Saúde** — o Health Connect (app Android) e o batimento ao vivo.
- **Ajustes** (engrenagem no cabeçalho) — tema, som, descanso padrão, meta,
  lembrete, backup e créditos. Os ajustes finos do Jarvis (como ouve, fone,
  jeito de falar, voz, velocidade, barra) ficam fechados atrás de "⚙ Ajustes da
  voz" (`vozAberta`): eram dois terços da página e empurravam o backup para
  longe da vista.

### O treino de hoje (`fichaDeHoje`), e os outros jeitos em grade

Pedido do dono: "facilite tudo para as pessoas não ficarem com dúvidas e
desistirem". Olhando a tela de quem chega, o defeito era claro: cartão de
instalar, boas-vindas, **seis fichas do mesmo tamanho** e **sete botões
coloridos um embaixo do outro**. Ninguém dizia o que fazer primeiro.

- **O app escolhe a ficha e diz por quê** (`fichaDeHoje`, coberto por
  `teste-inicio.js`): a que tem o dia de hoje no nome ("Sexta - Pernas"), senão
  a que vem depois da última feita no mesmo programa (A → B → C → A), senão a
  primeira. Um botão grande, "▶ Começar este treino", com o número de
  exercícios e o tempo aproximado. As outras fichas ficam atrás de "Escolher
  outra ficha", a um toque.
- **Quem instala hoje encontra um programa de iniciante** (`FICHAS_INICIANTE`,
  `prog-iniciante`): três fichas de cinco exercícios de máquina, A/B/C. As
  `FICHAS_PADRAO` (o avançado de seis dias) continuam só para quem já as tinha:
  trocar a ficha de quem treina com ela seria mexer no treino de alguém sem
  pedir. "Aparelho novo" é não haver nada gravado em `treinolivre:v1` (`novo`
  na carga). Embaixo do botão, para quem nunca treinou: "Quer outro objetivo ou
  mais dias? Monte o seu — são 3 perguntas" (o assistente).
- **Ordem da tela**: o treino de hoje primeiro, depois as boas-vindas, depois o
  instalar. A primeira coisa da tela é o que fazer; a explicação vem em seguida.
- **Os outros jeitos de treinar** (assistente, livre, funcional, rua, esteira,
  intervalado, desafio, Monster Run) viraram uma **grade de dois**, cada um com
  uma linha dizendo para que serve. Modo novo entra no vetor `jeitos`, não
  como mais um botão solto.
- **🏃 Esteira** (pedido do dono: "senti falta da esteira"): a esteira era só um
  exercício dentro das fichas, e quem ia à academia só para correr não achava
  por onde começar. O azulejo abre a escolha — correr, caminhar, caminhada
  inclinada — e `iniciarEsteira` começa uma sessão comum com aquele exercício
  só (os minutos vêm do `padrao`, velocidade e inclinação da última vez). O guia
  do primeiro treino troca "digite o peso" por minutos, velocidade e ▶
  quando o treino é só de tempo (`soTempo`).
- **O histórico vazio tem botão** ("▶ Fazer meu primeiro treino"): tela vazia
  sem caminho é tela onde a pessoa desiste.

## Treino em andamento

- **Só o exercício da vez fica aberto** (o `alvo`, e o parceiro dele no bi-set).
  Os outros viram uma linha com o nome e "3 séries", "2 de 3 feitas" ou "✓
  feito". Acabou um, abre o seguinte sozinho, porque o alvo anda. Tocar numa
  linha abre o cartão **e muda o foco** (`setFocoEi`): abrir um exercício é
  dizer que é ele agora, e a voz passa a anotar ali. Quem abriu à mão fecha no
  ▴ (`abertos`). Antes eram treze cartões com três séries cada, tudo aberto.

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
- **A ficha muda com o treino** (`mudancasNaFicha`, coberto por
  `teste-ficha.js`). Pedido do dono, ao reorganizar a ficha avançada: trocar
  os exercícios no próprio treino e que a troca fique na ficha. Antes só obs e
  descanso voltavam; o exercício trocado voltava a ser o antigo na vez
  seguinte. Hoje, ao finalizar com a lista diferente da ficha (trocou, tirou,
  acrescentou ou mudou a ordem), o app pergunta, listando o que mudou:
  **Salvar na ficha** ou **Só hoje**. Para saber o que mudou, a sessão guarda
  `origem` (a posição na ficha) e `trocadoDe` (o exercício de antes do ⇄).
  Item que veio da ficha mantém séries e repetições de lá: série a mais feita
  hoje não vira regra sem pedir. Bi-set que ficou sem vizinho é desfeito. O
  modal ganhou `labelNao`/`onNao` para isso; tocar fora dele não finaliza.
- **O treino vira ficha** (`fichaDoTreino`, `virarFicha`, coberto por
  `teste-ficha.js`). Pedido do dono: a ficha da semana estava montada nos
  treinos livres dos últimos dias, sem jeito de guardá-los. Dois caminhos:
  **📋 Virar ficha** em cada treino do histórico (menos rua, Monster Run,
  desafio e intervalado), e a pergunta ao **finalizar um treino livre** com
  dois exercícios ou mais ("Salvar como ficha" ou "Agora não"; a frase da
  ficha salva entra no resumo, por `nota` no `guardarTreino`). A ficha leva
  as séries que valeram (aquecimento fora) e as repetições que mais
  apareceram; o nome sugerido são os dois grupos com mais séries ("Treino de
  Peito e Tríceps"); o programa sugerido é o da ficha treinada por último. O
  modal ganhou `escolha` (um seletor, lido por `escolhaRef`).
  **Um nome só, para o treino e a ficha** (pedido do dono): o campo é "Nome do
  treino e da ficha", e salvar renomeia também o registro do histórico (ou dá
  o nome ao treino que está sendo finalizado). Não é cosmético: `fichaDeHoje`
  casa o histórico com as fichas **pelo nome**, e um "Treino livre (quinta)"
  nunca contaria como a ficha feita. No treino livre, o nome no cabeçalho é
  tocável ("✎ dar nome", `editandoNome`); no treino de ficha não, pelo mesmo
  motivo. Nome dado à mão vence a sugestão pelos grupos.
  **Achado no navegador**: a ficha nova sumia ao finalizar, porque o
  `finalizarSessao` regravava `treinos` a partir da cópia do render, que
  ainda não a tinha. Gravação que pode vir logo depois de outra é funcional
  (`setTreinos((prev) => ...)`).
- **Levar a ficha para outro treino** (`levarFicha`, botão "📂 Levar para
  outro treino" em cada ficha). Pedido do dono: pôr a ficha nascida do treino
  livre no Avançado, ou num treino que ainda vai criar. **Copiar** deixa nos
  dois (cópia com `clonarItens`, bi-set próprio: mudar uma não muda a outra);
  **Mover** só troca o `programaId`. "+ Criar um treino novo…" pede o nome na
  hora (`pedirTreinoNovo`), e o mesmo vale no "virar ficha", que antes só
  sabia criar um "Meus treinos" sem nome escolhido. Depois de levar, a tela
  abre o treino de destino.
- **A ordem das fichas no treino** (`moverFicha`, ▲ ▼ em cada ficha, coberto
  por `teste-ficha.js`). A ordem é a de `treinos` filtrada pelo programa, e é
  a que `fichaDeHoje` segue (A → B → C): mudar a ordem muda a sugestão da
  tela inicial, e a tela diz isso. A troca é com a vizinha do **mesmo**
  programa — a vizinha na lista inteira pode ser de outro treino, e a seta não
  faria nada visível. As fichas ganharam número (1., 2., 3.).
- **↕ Ordem dos exercícios** (`moverPara`, `limparConjuntos`, coberto por
  `teste-ficha.js`). Pedido do dono: as setas pequenas no meio dos cartões do
  editor ninguém achava. Hoje há **↕ Ordem** em cada ficha da lista e **↕ Mudar
  a ordem** no editor: a lista vira uma linha por exercício, com ▲ ▼ grandes e
  a posição para escolher (o último vai ao topo num toque). Bi-set que ficou
  sem vizinho perde a marca.
- **📋 Copiar exercícios para outra ficha** (`copiarItensPara`, coberto por
  `teste-ficha.js`). No editor, **📋 Copiar** marca exercícios e os manda para
  o fim de outra ficha (de qualquer treino) ou de uma nova no mesmo treino. Cada
  cópia ganha uid e bi-set próprios; bi-set com só um lado marcado vira solto; o
  exercício que o destino já tem não entra de novo, e o aviso diz quais. O
  `salvarTreino` virou funcional: copiar e depois salvar a ficha aberta não pode
  desfazer a cópia.
- **⇄ Trocar no editor de ficha**: o exercício novo entra no mesmo lugar, com
  as séries, repetições, descanso e bi-set do antigo; sem busca, a lista
  mostra o mesmo grupo. Antes era tirar e acrescentar, e o novo ia para o fim.

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

A suíte vive em `testes/`, **dentro do repositório** (ver *Trabalhar de
qualquer computador*). Ela recorta as funções do próprio `index.html`:

```bash
node testes/rodar.js      # as 29 suítes (1.171 checagens)
node testes/verificar.js  # a conferida de publicação
node testes/servir.js     # sobe o app em http://localhost:8765
```

Rode antes e depois de mexer no app. **Elas não substituem o roteiro manual
abaixo**: provam que a lógica não quebrou, não que a tela funciona. Câmera,
microfone e service worker exigem aparelho de verdade.

O `file://` não serve: o preview vira `data:` e o `localStorage` fica
bloqueado. Por isso o `servir.js` — o registro do service worker aceita
`localhost` além de `https:`.

**`lerApp()` normaliza o arquivo para LF, e isso não é detalhe.** O
`index.html` é CRLF na cópia do Windows e LF na do Linux, porque o git
converte na saída. As suítes recortam o código por marcadores de texto, e um
marcador que termine em `\n}\n` nunca casa num arquivo CRLF. O resultado era
o pior dos mundos: `teste-corrida` e `teste-intervalado` passavam no Linux do
CI — que ficava verde — e **não rodavam** na máquina de quem desenvolve, onde
o hook de pre-push exige que rodem. Normalizar num lugar só faz toda suíte ver
os mesmos bytes em qualquer computador.

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
33w. **O teste da rua.** Caminhar 1 km com o percurso: o mapa segue, a rua e o
     bairro aparecem, a voz avisa o km, a distância bate com a de outro app
     (diferença de poucos por cento), e o percurso abre no histórico.
33. Abrir o Eyes Scan, fazer 10 repetições de verdade e conferir a contagem.
33é. Abrir o 🧟 Monster, Run!: a abertura do zumbi passa (e de novo a cada vez
     que se abre). Fazer uma missão de 10 min na rua com o GPS: a voz conta a
     história, avisa a ameaça, pede o ritmo-alvo, conta a fuga e manda
     recuperar; a pausa de segurança congela tudo; no fim, o gráfico com a
     perseguição marcada vai para o histórico uma vez só. Repetir na esteira
     com a velocidade informada e com o celular parado no suporte (estimativa
     por passos não pode aparecer).
33ü. **O desafio entre dois celulares.** Um cria a sala (esteira, 1 km) e manda
     o convite; o outro abre o link. Os dois largam: cada um vê o outro na
     pista, a posição troca quando um acelera, e a voz diz quem passou quem e
     em quanto tempo alcança. Depois, um terceiro abre o link do resultado num
     outro dia: o 👻 aparece e a comparação é pelo mesmo tempo de prova.
33è. ⏱ Intervalado na esteira, modelo corre-caminha: a voz anuncia cada bloco
     com a velocidade para pôr no painel, o 3-2-1 apita antes da troca, e ao
     encerrar no meio o histórico guarda só os blocos feitos. No Monster, Run!,
     escolher "Aleatória" duas vezes: as histórias não podem se repetir. Filtrar
     🐺 Lobisomem e tocar "Ouvir uma prévia": tem de soar o uivo, não o gemido.
33ê. **O radar na esteira.** Missão de 20 min com 🦸 O Herói da Nação, tela
     ligada: no aviso o monstro aparece no radar; acelerando, a distância sobe
     e "ficando para trás" fica verde; diminuindo, ele chega, o painel pulsa
     vermelho abaixo de 60 m. A velocidade para a esteira aparece, e o placar
     conta a fuga. No 👽 Alien do Nostrômulo, os bipes aceleram quando ele chega perto.
33ô. **O Marombeiro.** Filtrar ⭐ Marombeiro: o banner com a foto e "Seguir"
     aparece e abre o Instagram. Começar a Fuga do Marombeiro: a foto vem
     correndo na tela com "HOJE É DIA DE PERNA!", o rosto aparece no radar, e no
     fim o "▶ Ver resumo animado da missão" mostra perseguições, o mais perto
     que ele chegou e a foto com o @ no final. Gerar o vídeo do story e conferir
     que a foto entrou no vídeo.
33ç. Correr 2 km na rua com o celular no braço e a idade preenchida no painel:
     a cadência aparece ao vivo e a voz do km a fala; no fim, a análise mostra
     pace, ajustado ao relevo, melhor km, cadência, passada, melhores esforços e,
     com cinta, as zonas. No painel do corredor: volume, carga, VO2máx,
     previsões e recordes. No iPhone, o "Começar" pede o sensor de movimento.
33x. Na esteira, de fone e com o microfone **desligado**: marcar a série tem de
     dizer distância, ritmo, calorias, intensidade e a meta da semana; com o
     cronômetro rodando, ele avisa cada km e a metade.
33y. Finalizar um treino de musculação com esteira no fim e tocar em "▶ Ver
     resumo animado": volume, séries, músculos, recordes, comparação, a parte
     aeróbica e o nível, nessa ordem. Depois abrir o "▶ Resumo animado" no
     painel da esteira, no fim do percurso e no histórico: a linha verde revela cada cena, cada cena é falada, e o mapa
     do percurso **não** aparece por cima do resumo.
33æ. Assistir ao resumo animado inteiro **com a voz ligada**, sem tocar: toda
     frase tem de ser dita até o fim antes de a cena trocar.
33z. No resumo animado, tocar no 📸 e escolher "Com a narração": a voz baixa
     uma vez (90 MB, no Wi-Fi), o vídeo fica pronto, o ▶ da prévia toca **com a
     narração**, "Compartilhar" abre a janela do celular, e **no story o vídeo
     roda até o halter do fim, com som**. Na segunda vez, o 📸 começa direto,
     sem baixar nada.
33v. **O teste da calibração.** Abrir o scanner, confirmar o enquadramento, andar
     até a máquina e sentar, ajeitar o banco: nada pode contar. Depois fazer 10
     repetições: o número aparece **já na 1ª** e termina em 10. Um movimento
     solto (levantar e mexer no banco) conta e, em 10 s, é descontado com aviso.
33l. Zerar `dicas` e `historico`, abrir: o painel de boas-vindas tem de
     aparecer, e sumir sozinho depois do primeiro treino concluído.
33m. Dentro do treino, dispensar a dica da voz: a da câmera entra no lugar.
     Dispensar a segunda: nenhuma das duas volta, nem depois de recarregar.
33i. **O teste do looping.** Apagar `entrou`, abrir o app, tocar em "Seguir e
     baixar", voltar e recarregar: tem de entrar direto, sem portaria. Se a
     portaria voltar, o looping voltou.
33j. Abrir o app num iPhone e conferir que o cartão "Baixar o app" aparece e
     explica o caminho do botão de compartilhar.
33n. Abrir o Eyes Scan com a câmera de trás, de costas para o celular: a voz
     tem de guiar até confirmar, e o bipe avisa o enquadramento.
33o. **O teste do sentido.** Ficar na beirada esquerda do quadro: ele tem de
     mandar andar para a SUA esquerda, e seguir a instrução tem de pôr a pessoa
     dentro do quadro. Repetir com a câmera da frente e conferir a seta.
33q. Arrastar o botão do Jarvis para o outro lado da tela: ele encosta na borda,
     fica lá depois de recarregar, e **não pode ligar o microfone no caminho**.
33s. **Com o microfone DESLIGADO**, marcar uma série: ele tem de falar "série 1
     de 3 anotada, descanso de ...". E, no fim do descanso, dizer o que vem.
     Esse é o caminho de quem treina de fone, com o celular no bolso.
33t. Abrir um exercício já treinado e tocar em "Minha evolução": a linha sobe,
     e as séries de aquecimento não podem aparecer no recorde.
33u. Simular falha de gravação (`Storage.prototype.setItem` lançando) e mexer em
     qualquer coisa: a faixa vermelha tem de aparecer e não sair mais.
33r. Tocar no botão sem arrastar: o microfone liga. Esperar 4 s sem usar: ele
     fica translúcido e dá para ler o que está atrás.
33p. Abrir o scanner num exercício sentado: depois de 12 s ele libera sozinho
     e avisa. Nunca pode ficar preso.
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

## A cor significa alguma coisa

O app tinha um sistema de cores pela metade: as variáveis de tema certas
existiam (`--marca`, `--ok`, `--perigo`, `--cinza`, nos dois temas) e boa
parte da interface passava por fora delas. O resultado media-se: **três
verdes** (`#7CFF3C`, `#4CD137`, `#8FBF96`), **três vermelhos** e **dois
rosas** para os mesmos significados, e sete atalhos irmãos em seis cores.

Não era questão de gosto. Era o mesmo significado pintado de cores
diferentes conforme o lugar — e é isso que faz uma tela parecer amadora.
As regras, em ordem:

1. **A marca é o que se toca.** `--marca` fica para a ação principal e para
   link. Uma ação principal em destaque **por tela**: a inicial tinha dois
   botões de degradê disputando ("Baixar backup agora" e "Começar este
   treino"), e dois primários é nenhum primário.
2. **Número é neutro** (`--texto`). Quando todo dado sai na cor de destaque,
   a cor deixa de dirigir o olho e vira textura — era o caso dos oito blocos
   de "Seus números" e do `0/15` da tela do treino. O tamanho já dá a
   hierarquia, e o rótulo embaixo já diz o que o número é.
3. **Verde é resultado** (`--ok`): feito, deu certo, conectado. Gastar verde
   numa oferta ("👁 Contar pela câmera") é não ter verde quando a série
   fechar de verdade.
4. **Vermelho é aviso ou destruição** (`--perigo`). **Estado normal nunca é
   vermelho**: a cinta desconectada é o normal de quase todo mundo, e pintar
   isso de vermelho gasta o alarme — quando algo quebrar de verdade, o
   vermelho já não vai querer dizer nada. Exceção mantida de propósito: o
   batimento em `#ED4956`, porque coração vermelho é convenção universal e
   ali a cor diz mesmo o que o número é.
5. **Item irmão tem a cor do irmão.** O comentário sobre os atalhos da tela
   inicial já dizia a lição ("sete botões coloridos era uma parede") e ela
   tinha sido aplicada ao **tamanho**; a cor ficou para trás. O emoji já
   distingue um do outro.
6. **Barra de progresso tem uma cor só.** Havia um segundo degradê, de cinco
   cores, usado como preenchimento: barra que muda de cor ao longo do
   comprimento não informa nada, porque o comprimento já é a informação.

**O que NÃO passa por variável de tema, e é de propósito:** cor sobre vídeo,
mapa ou canvas — o esqueleto do Eyes Scan, os anéis do radar, os marcadores
do Leaflet, o texto do vídeo do story. Ali a cor fixa e berrante é
obrigatória: ela precisa contrastar com uma imagem qualquer, e `var(--x)`
não alcança canvas. Antes de trocar uma cor fixa por variável, veja em que
contexto ela desenha.

A passada foi **dirigida às telas de mais uso**, não exaustiva: ainda há
`#E1306C` literal espalhado pelo arquivo. Ao mexer num deles, aplique as
regras acima em vez de repetir o literal.

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

### Editar um arquivo de 700 KB sem estragá-lo

O `index.html` é grande demais para ser reescrito inteiro a cada mexida, e tem
acentos e emoji em quase toda tela. Três coisas já custaram uma restauração de
backup:

- **Use Node para editar, não Python.** Um `write()` em Python com emoji
  (pares substitutos) levanta `UnicodeEncodeError` **depois** de truncar o
  arquivo — o `index.html` já ficou com 0 byte assim. Em Node, escreva o emoji
  como `\u{1F4C8}` e não literal.
- **Não escreva script de edição com heredoc do Bash.** O `cat << EOF` come as
  barras invertidas, e um `\s` de expressão regular chega do outro lado como
  `s`. Grave o script com a ferramenta de escrita de arquivo.
- **Toda troca deve ser única e conferida.** O padrão aqui é uma função
  `troca(alvo, novo, rótulo)` que aborta se o alvo não existe **ou se aparece
  mais de uma vez**. Substituição silenciosa no arquivo errado só aparece
  horas depois.

E o arquivo hoje é **LF**. Confira com `grep -c $'\r$' index.html` (tem de dar 0)
antes de publicar: edição que mistura finais de linha transforma o diff em lixo.

## Coisas que parecem bug e não são

- `TEMA_APP` é uma global atribuída durante o render de `TreinoLivre`. É impuro,
  mas determinístico e idempotente aqui. Trocar por Context exigiria mexer em
  ~13 pontos de chamada por benefício invisível.
- `duracaoMin` conta tempo de relógio e tem teto de 300 min, para uma sessão
  esquecida aberta não distorcer as médias.
- O componente raiz tem ~600 linhas e muitos `useState`. Uma reescrita com
  `useReducer` é tentadora, mas sem testes automatizados e com o histórico dos
  usuários vivendo só no aparelho, o risco de perda de dados não compensa.
