# Começar a mexer neste projeto numa máquina nova

Este arquivo serve para duas leituras: a sua, e a do Claude. Se você acabou de
instalar o Claude e o Google Drive neste computador, **abra o Claude nesta
pasta e diga:**

> leia o COMECE-AQUI.md e configure esta máquina

O resto deste arquivo é o que ele vai seguir.

---

## O que já funciona só com Claude + Google Drive

Nada precisa ser instalado para **desenvolver**. Os arquivos estão aqui, o
`CLAUDE.md` ao lado carrega todo o contexto do projeto sozinho, e o `index.html`
pode ser editado na hora. Isto é o essencial, e já está pronto.

O que exige mais alguma coisa:

| Para | Precisa de |
|---|---|
| Rodar os 177 testes (`node testes/rodar.js`) | Node.js |
| Abrir o app em `localhost` para testar de verdade | Node.js |
| Publicar com `git push` | git + `gh auth login` |
| Publicar sem instalar nada | nada: a interface web do GitHub |

**Nenhum deles é obrigatório para começar.** Instale o que for usar.

---

## Antes de tudo: a pasta tem de estar no disco

O Google Drive, por padrão, guarda só os **nomes** dos arquivos e baixa sob
demanda. Isso quebra o `git` e o `node`, que leem centenas de arquivinhos de
uma vez e travam esperando download.

No Explorador de Arquivos (ou Finder), **botão direito na pasta `Projetos` →
"Disponível off-line"**. O ✓ no menu confirma.

Essa é a única configuração que **você** precisa fazer à mão, porque é um menu
do Drive e nenhum comando a alcança.

---

## Instruções para o Claude

Siga na ordem. Pare e avise em qualquer passo que falhar — não invente
alternativa nem instale coisa que não esteja aqui.

### 1. Confirmar onde está e que os arquivos são reais

```bash
ls index.html CLAUDE.md testes/rodar.js
wc -c index.html
```

O `index.html` tem ~700 KB. Se vier muito menor, ou se a leitura travar, a
pasta não está marcada como disponível off-line — peça isso ao usuário (seção
acima) e pare aqui.

### 2. Node.js — para os testes e o servidor local

```bash
node --version
```

Se não existir, instale. No Windows:

```bash
winget install OpenJS.NodeJS.LTS
```

No macOS:

```bash
brew install node
```

Depois feche e reabra o terminal (o `PATH` só muda em sessão nova) e confirme
com `node --version`. **Não há `npm install` a fazer**: o projeto não tem
dependências, de propósito.

### 3. Provar que funciona

```bash
node testes/rodar.js
```

O esperado é **177 passou / 0 falhou**. Se alguma suíte falhar, não mexa em
nada ainda: relate ao usuário qual foi e o que ela diz. A suíte roda contra o
`index.html` desta pasta, então falha aqui significa ou arquivo incompleto
(volte ao passo 1) ou mudança real no app.

### 4. git e GitHub — só se o usuário quiser publicar daqui

```bash
git --version
gh --version
gh auth status
```

Faltando, no Windows:

```bash
winget install Git.Git GitHub.cli
```

No macOS:

```bash
brew install git gh
```

Autenticar (este comando é interativo e abre o navegador — **peça ao usuário
que o rode no terminal dele**, não tente rodar por conta):

```bash
gh auth login
```

Identidade dos commits, no repositório (não global), com o e-mail `noreply`
para não expor o endereço pessoal num repositório público:

```bash
git config user.name "Carlosjr81"
```

```bash
git config user.email "Carlosjr81@users.noreply.github.com"
```

Conferir que o repositório está íntegro e alinhado com o GitHub:

```bash
git fsck --full && git status && git fetch && git log --oneline -1 origin/main
```

### 5. Relatar

Diga ao usuário, em uma linha cada: se a pasta está off-line, a versão do Node,
o resultado dos testes, e se o `git push` está disponível ou se a publicação
vai ser pela interface web.

---

## O jeito de trabalhar, uma vez configurado

```bash
git pull
```

ao **começar**, e

```bash
git push
```

ao **terminar**. Assim o GitHub é a verdade e o Drive é só conveniência — e o
problema de duas máquinas fora de sincronia deixa de existir.

**Um computador de cada vez.** O Drive sincroniza mas não resolve conflito, e o
`.git` é feito de centenas de arquivinhos: duas máquinas editando ao mesmo
tempo corrompem o repositório em vez de duplicar arquivo. Antes de trocar de
máquina, feche o editor e espere o Drive terminar de sincronizar (ícone na
bandeja).

Se um dia o Drive bagunçar o `.git`, não tente consertar — clone de novo:

```bash
gh repo clone Carlosjr81/Treino-Livre
```

---

## Publicar

Três lugares sobem de versão **em toda publicação, sem exceção** — está
explicado no `CLAUDE.md`, e existe porque um conserto já ficou horas publicado
sem chegar ao celular:

1. `VERSAO_APP` no `index.html` (formato `AAAA-MM-DD` + letra)
2. `versao.json`, com o mesmo valor
3. `CACHE` no `sw.js` (`treinolivre-vN`)

Depois, `git push` — o GitHub Pages republica sozinho em um ou dois minutos.
Sem git na máquina, a interface web do GitHub continua servindo: é como o
projeto foi publicado até aqui.

---

## Onde está o resto

O **`CLAUDE.md`** é a memória do projeto: por que não há etapa de build, como
funciona o Jarvis, o Eyes Scan, as regras da portaria, o roteiro de teste
manual. O Claude o lê sozinho ao abrir esta pasta — você não precisa pedir.

O **`testes/LEIA-ME.md`** explica as sete suítes e as armadilhas de mexer
nelas.
