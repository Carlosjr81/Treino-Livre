# Continuar o Treino Livre com outra conta do Claude

Hoje o projeto é desenvolvido com a conta **corporativa** do Claude. Se um dia
essa conta acabar, o desenvolvimento continua com a sua conta **pessoal**, do
mesmo ponto, sem perder nada. Esta página diz por quê e como.

## O que é seu, e não depende de conta do Claude nenhuma

Tudo o que forma o projeto mora no **seu GitHub pessoal**
(`github.com/Carlosjr81/Treino-Livre`) e na cópia do Google Drive:

| O quê | Onde |
|---|---|
| O app inteiro (`index.html`, `sw.js`, ícones, vídeo, avatar) | repositório |
| O app Android (pasta `android/`) e o APK publicado | repositório e Releases do GitHub |
| O site no ar | GitHub Pages da sua conta |
| Os testes (`testes/`), inclusive o que abre o app no navegador | repositório |
| **Todo o contexto do projeto**: decisões, regras, o porquê de cada coisa | `CLAUDE.md` |
| As novidades para o seu ChatGPT | `divulgacao/` |
| Conferência automática e montagem do APK | GitHub Actions da sua conta |

O Claude não guarda o projeto: ele lê o repositório a cada sessão. O
`CLAUDE.md` é carregado sozinho por qualquer Claude que abrir o projeto, em
qualquer conta, e é por isso que tudo o que foi decidido nas conversas está
escrito lá.

## O que fica na conta corporativa (e não faz falta)

- **As conversas.** O histórico de chat é da conta onde ele aconteceu. O que
  importava delas já está no `CLAUDE.md`, no `divulgacao/NOVIDADES.md` e nas
  mensagens dos commits (`git log`).
- **A ligação entre o Claude corporativo e o seu GitHub.** É só uma
  autorização: na conta pessoal você faz uma igual (passo 3 abaixo).

## Quem pode mexer no projeto: a chave é o seu GitHub

Nenhuma conta do Claude, nem a corporativa nem a pessoal, mexe no projeto por
conta própria. Para alterar qualquer arquivo, o Claude precisa de uma conta do
GitHub com permissão de escrita neste repositório, e hoje (conferido em
25/10/2026) **a única é a sua, `Carlosjr81`** (administradora, sem nenhum outro
colaborador). Então quem tem a senha e o segundo fator do seu GitHub é quem
controla o Treino Livre, seja qual for a conta do Claude.

- **Ler, qualquer um lê**: o repositório é **público**, porque o GitHub Pages
  gratuito publica o site a partir de repositório público. Ver e copiar o
  código não dá poder de mudar o app de ninguém. Tornar o repositório privado
  exigiria GitHub Pro para manter o site no ar.
- **Ative a verificação em duas etapas** no GitHub (Settings › Password and
  authentication › Two-factor authentication). É o que impede alguém com a sua
  senha de entrar.
- **Limite o app do Claude a este repositório**: Settings › Applications ›
  Installed GitHub Apps › Claude › Configure › "Only select repositories" ›
  Treino-Livre.
- **Não acrescente colaboradores** (Settings do repositório › Collaborators).
  É a lista de quem pode escrever além de você.
- **Ao trocar de conta do Claude**, revogue a autorização da antiga em
  Settings › Applications › Authorized OAuth Apps. A partir daí ela não alcança
  mais o repositório, e a nova só entra porque você a conectou com o seu login.


1. **Plano.** O Claude Code (o Claude que mexe no código) precisa de um plano
   pago na conta pessoal (Pro ou Max). Confira em `claude.ai` › Configurações ›
   Plano.
2. **Entrar.** Abra `claude.ai/code` (no celular ou no computador) com a conta
   **pessoal**.
3. **Ligar o GitHub.** Em `claude.ai/connect-github`, conecte a conta
   `Carlosjr81`. Se pedir para instalar o app do Claude no GitHub, escolha o
   repositório **Treino-Livre** (página
   `github.com/apps/claude/installations/select_target`).
4. **Abrir o projeto.** Comece uma sessão com o repositório
   `Carlosjr81/Treino-Livre` selecionado. A rede padrão basta (veja a nota de
   rede no `COMECE-AQUI.md`).
5. **Primeira mensagem**, para conferir que está tudo de pé:

   > Leia o CLAUDE.md. Rode `node testes/rodar.js`, `node testes/verificar.js`
   > e `node testes/navegador.js` e me diga se o projeto está saudável.

   Se as três passarem, a conta pessoal está pronta para continuar de onde a
   corporativa parou.

**No computador**, o caminho é o do `COMECE-AQUI.md` (Drive + `preparar.ps1`),
com o Claude Code entrando na conta pessoal (`/login` no terminal, ou o
aplicativo do Claude para computador).

## Faça um ensaio agora, enquanto tem as duas

Não espere perder a corporativa para descobrir um passo travado. Uma vez,
hoje: faça os passos 1 a 5 com a conta pessoal. Se a primeira mensagem
responder que os testes passam, está garantido.

## Quando sair da conta corporativa

- No GitHub: Settings › Applications › **Installed GitHub Apps** › Claude
  (Configurações › Aplicativos, no GitHub em português). O app fica instalado na **sua** conta do GitHub e
  serve às duas contas do Claude; não precisa remover.
- No GitHub: Settings › Applications › **Authorized OAuth Apps**:
  se aparecer uma autorização ligada à empresa que você não quer mais, revogue
  ali. Isso não apaga nada do repositório.

## Duas coisas que não são do Claude, mas que também não podem se perder

- **A chave que assina o app Android.** Hoje ela vive no cache do GitHub
  Actions (o `manter-chave.yml` a mantém viva). Para ela nunca mudar, guarde-a
  como segredo `ANDROID_KEYSTORE_B64` no repositório (o passo a passo está no
  `CLAUDE.md`, em *A chave do APK*). Chave nova obriga todo mundo a
  desinstalar e instalar o app de novo.
- **Os seus próprios treinos.** Eles ficam no seu celular (no Chrome). Baixe o
  backup em arquivo de vez em quando: Ajustes › Backup.

## A identidade dos commits

Os commits feitos do computador da empresa saíram com o e-mail corporativo. O
arquivo `.mailmap` mostra todos eles como `Carlosjr81` no `git log`, sem
reescrever o histórico. Os commits novos usam o e-mail `noreply` do GitHub (é o
que o `preparar.ps1`/`preparar.sh` configura).
