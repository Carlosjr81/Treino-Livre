# Começar a mexer neste projeto num aparelho novo

Dois caminhos, conforme o aparelho:

- **Computador** — Claude + Google Drive, e o resto se instala sozinho. É o de
  baixo nesta página.
- **Celular** — Claude no navegador, trabalhando direto no GitHub. Não precisa
  instalar nada. É a seção logo abaixo.

---

## No celular

Abra **`claude.ai/code`** no navegador do celular, entre na sua conta e conecte
a conta do GitHub. A sessão trabalha num clone do repositório na nuvem: lê,
edita, roda os 361 testes e publica.

**Não precisa do Google Drive no celular.** O Drive é a conveniência de quem
está num computador; no celular o GitHub é o caminho, e é por isso que tudo —
app, documentação e testes — mora no repositório.

### Sempre, antes de publicar do celular

Peça ao Claude, ou confira que ele fez:

```bash
node testes/rodar.js
```

```bash
node testes/verificar.js
```

A primeira prova que a **lógica** não quebrou. A segunda prova que o app ainda
**abre** — JSX compilando, hashes das bibliotecas conferindo, as três versões
sincronizadas. Essa regra está escrita no `CLAUDE.md`, então o Claude já a
conhece ao abrir o projeto; a lembrança aqui é para você poder cobrar.

Isso importa mais no celular do que no computador: lá não dá para abrir o app
em `localhost` antes de publicar, e quem recebe uma publicação quebrada é gente
no meio de um treino.

#### Uma nota sobre a rede da sessão na nuvem

A sessão na nuvem só alcança uma lista de domínios. O `registry.npmjs.org` está
nela; a `cdnjs.cloudflare.com` — de onde o app carrega React e Babel — **não**.
O `verificar.js` já contorna isso: quando a CDN não responde, ele pega o Babel
no npm e compila o JSX do mesmo jeito. **Essa conferida funciona no celular sem
você configurar nada.**

A única que não dá para fazer dali é conferir os *hashes* das bibliotecas, que
exige baixar o arquivo da própria CDN. Ela vira aviso, e **o GitHub Actions a
faz por você** — o servidor dele tem internet aberta, e o resultado aparece
como ✓ ou ✗ no app do GitHub.

Se quiser a conferida completa também no celular, dá para liberar o domínio uma
vez: no seletor de ambiente da sessão na nuvem, escolha **Custom** em acesso de
rede, marque *incluir a lista padrão* e acrescente uma linha:

```text
cdnjs.cloudflare.com
```

É opcional. Sem isso nada fica desprotegido — só muda quem faz a checagem.

### Depois de publicar, você tem duas confirmações

1. **O ✓ no app do GitHub.** O GitHub roda os testes de novo do lado dele
   (`.github/workflows/conferir.yml`) e marca o commit. Se vier ✗, não espere:
   peça ao Claude para reverter.
2. **O próprio app, no mesmo celular.** Abra
   `https://carlosjr81.github.io/Treino-Livre/` um ou dois minutos depois.

Essa segunda é um ganho de verdade: **metade do roteiro de teste do projeto só
funciona em celular** — a câmera do Eyes Scan, o microfone do Jarvis, o
enquadramento de costas para o aparelho, o bipe do Android. Pelo computador
você mexe e precisa ir até o celular testar. Pelo celular, o ciclo fecha no
mesmo aparelho.

### Se algo quebrar

Peça: **"reverta o último commit e publique"**. São dois comandos e o app volta
ao ar em um ou dois minutos. Reverter primeiro, investigar depois.

### O que é pior no celular

Ler diff grande e revisar código em tela pequena. Na prática o celular é melhor
para **ajustar e testar** — mudar um texto, corrigir um limiar, ver se o Jarvis
entende uma frase — do que para construir recurso novo.

---

## No computador

Você acabou de instalar o Claude e o Google Drive. Faltam duas coisas, e a
segunda é automática.

---

## 1. A única coisa que você precisa fazer à mão

No Explorador de Arquivos, **botão direito na pasta `Projetos` → "Disponível
off-line"**. O ✓ no menu confirma.

Sem isso o Google Drive guarda só os **nomes** dos arquivos e baixa cada um sob
demanda — e aí o `git` e o `node`, que leem centenas de arquivinhos de uma vez,
travam esperando. É um menu do Drive: nenhum comando o alcança, por isso só
você pode fazer.

## 2. O resto

Abra o Claude nesta pasta e diga:

> prepare esta máquina

Ele vai rodar o script abaixo, que confere o que falta e instala. Se preferir
fazer você mesmo, é um comando só:

```bash
powershell -ExecutionPolicy Bypass -File preparar.ps1
```

No Mac ou Linux:

```bash
bash preparar.sh
```

O script **não desinstala nada, não atualiza o que já existe e não mexe em
configuração global.** Só acrescenta o que falta, e termina rodando os 361
testes para provar que funcionou.

Depois de instalar alguma coisa, **feche e reabra o terminal** e rode de novo:
no Windows o `PATH` só muda em sessão nova.

---

## O que o script cuida

| | |
|---|---|
| **Arquivos no disco** | lê o `index.html` inteiro e mede o tempo — é assim que se descobre que a pasta não está off-line |
| **Node.js** | para os testes e o servidor local. Instala por `winget` (Windows) ou `brew` (Mac) |
| **git e GitHub CLI** | para publicar daqui com `git push` |
| **Identidade dos commits** | define só neste repositório, com o e-mail `noreply` para não expor seu endereço pessoal |
| **Os 361 testes** | roda e mostra o resultado |

Duas coisas ele **detecta mas não resolve**, e avisa:

- a pasta não estar disponível off-line (é o menu do item 1);
- `gh auth login`, que abre o navegador e espera você digitar.

---

## O que já funciona sem instalar nada

**Desenvolver.** Os arquivos estão aqui, o `CLAUDE.md` ao lado carrega todo o
contexto do projeto sozinho, e o `index.html` pode ser editado na hora. Node e
git são para testar e publicar — não para trabalhar.

| Para | Precisa de |
|---|---|
| Editar o app com o Claude | nada além do Drive |
| Rodar os 361 testes | Node.js |
| Abrir o app em `localhost` | Node.js |
| Publicar com `git push` | git + `gh auth login` |
| Publicar sem instalar nada | nada: a interface web do GitHub |

---

## O jeito de trabalhar

```bash
git pull
```

ao **começar**, e

```bash
git push
```

ao **terminar**. Assim o GitHub é a verdade e o Drive é só conveniência.

**Um computador de cada vez.** O Drive sincroniza mas não resolve conflito, e o
`.git` é feito de centenas de arquivinhos: duas máquinas editando ao mesmo
tempo corrompem o repositório em vez de duplicar arquivo. Antes de trocar de
máquina, feche o editor e espere o ícone do Drive na bandeja parar de girar.

Se um dia o Drive bagunçar o `.git`, não tente consertar — clone de novo:

```bash
gh repo clone Carlosjr81/Treino-Livre
```

---

## Publicar

Três lugares sobem de versão **em toda publicação, sem exceção**. A regra
existe porque um conserto já ficou horas publicado sem chegar ao celular, e
duas rodadas de depuração foram gastas num bug que já não existia:

1. `VERSAO_APP` no `index.html` (formato `AAAA-MM-DD` + letra)
2. `versao.json`, com o mesmo valor
3. `CACHE` no `sw.js` (`treinolivre-vN`)

Depois, `git push` — o GitHub Pages republica sozinho em um ou dois minutos.
Sem git na máquina, a interface web do GitHub continua servindo: é como o
projeto foi publicado até aqui.

---

## Os comandos do dia a dia

```bash
node testes/rodar.js
```

As onze suítes, 361 checagens. Prova que a **lógica** não quebrou. Rode antes e
depois de mexer no app.

```bash
node testes/verificar.js
```

A conferida de publicação. Prova que o app ainda **abre**: o JSX compila, os
hashes das bibliotecas batem com os arquivos reais da CDN, as três versões
estão sincronizadas e subiram, e o `sw.js` não guarda endereço que ninguém
pede. No computador o hook de `pre-push` roda isso sozinho e cancela o push se
reprovar — você não precisa lembrar.

```bash
node testes/servir.js
```

Abre o app em `http://localhost:8765`. Abrir o `index.html` direto no navegador
não serve: em `file://` o `localStorage` fica bloqueado e o service worker não
registra — justo onde moram os dados e o modo offline.

### Se publicar algo quebrado

```bash
git revert --no-edit HEAD && git push
```

Volta ao estado anterior e o Pages republica em um ou dois minutos. Reverter
primeiro, investigar depois.

---

## Onde está o resto

O **`CLAUDE.md`** é a memória do projeto: por que não há etapa de build, como
funcionam o Jarvis e o Eyes Scan, as regras da portaria, o roteiro de teste
manual. O Claude o lê sozinho ao abrir esta pasta — você não precisa pedir.

O **`testes/LEIA-ME.md`** explica as onze suítes e as armadilhas de mexer
nelas.
