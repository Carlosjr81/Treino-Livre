# Começar a mexer neste projeto numa máquina nova

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
configuração global.** Só acrescenta o que falta, e termina rodando os 177
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
| **Os 177 testes** | roda e mostra o resultado |

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
| Rodar os 177 testes | Node.js |
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

## Os dois comandos do dia a dia

```bash
node testes/rodar.js
```

As sete suítes, 177 checagens, contra o `index.html` desta pasta. Rode antes e
depois de mexer no app.

```bash
node testes/servir.js
```

Abre o app em `http://localhost:8765`. Abrir o `index.html` direto no navegador
não serve: em `file://` o `localStorage` fica bloqueado e o service worker não
registra — justo onde moram os dados e o modo offline.

---

## Onde está o resto

O **`CLAUDE.md`** é a memória do projeto: por que não há etapa de build, como
funcionam o Jarvis e o Eyes Scan, as regras da portaria, o roteiro de teste
manual. O Claude o lê sozinho ao abrir esta pasta — você não precisa pedir.

O **`testes/LEIA-ME.md`** explica as sete suítes e as armadilhas de mexer
nelas.
