# Login, aprovação e painel de usuários (Firebase)

O Treino Livre tem login com aprovação: quem se cadastra fica **aguardando**
até o dono liberar, e só o dono (`carlos.jr.81@hotmail.com`, com o e-mail
confirmado) vê o **👥 Painel de usuários** em Ajustes. Lá aparecem todas as
contas, quando cada uma entrou, quantas vezes, de qual aparelho e em qual
versão, com os botões **Liberar**, **Bloquear** e **Desbloquear**.

O servidor é o **Firebase** (Google), no plano gratuito. Ele guarda **só** a
conta: nome, e-mail, status e os acessos. Os treinos continuam no celular de
cada pessoa.

**Enquanto o projeto do Firebase não existir, o login fica desligado** e o app
abre como sempre. Ele liga quando a chave do projeto entra no `index.html`
(`FIREBASE_ACESSO`).

## O que o dono faz uma vez (uns 10 minutos)

1. Abra **console.firebase.google.com** com a sua conta Google e toque em
   **Criar um projeto**. Nome: `treino-livre`. O Google Analytics pode ficar
   **desativado**. Toque em **Criar projeto**.
2. No menu da esquerda: **Criação › Authentication › Vamos começar**. Em
   **Método de login**, escolha **E-mail/senha**, ative a primeira chave e
   toque em **Salvar**.
3. Ainda em Authentication: **Configurações › Domínios autorizados › Adicionar
   domínio** › `carlosjr81.github.io`.
4. (Opcional) **Authentication › Modelos**: troque o idioma dos e-mails para
   **Português (Brasil)**.
5. No menu: **Criação › Firestore Database › Criar banco de dados**. Local:
   **southamerica-east1 (São Paulo)**. Modo: **produção**. Toque em **Criar**.
6. No Firestore, aba **Regras**: apague o que estiver lá, cole o arquivo
   **`firebase/firestore.rules`** inteiro e toque em **Publicar**.
7. Na engrenagem ao lado de "Visão geral do projeto": **Configurações do
   projeto › Geral › Seus apps** › o ícone **`</>`** (Web). Apelido:
   `Treino Livre`. **Não** marque o Hosting. Toque em **Registrar app**.
8. Aparece um bloco com `firebaseConfig`. Mande ao Claude **só** estas duas
   linhas: `apiKey` e `projectId`. Elas são públicas (identificam o projeto,
   não dão acesso a nada: quem protege são as regras do passo 6) e entram no
   `index.html`.

## Regras novas (versão 2, 28/10/2026)

A gestão completa do painel (aprovação automática, recado visto, a pessoa
apagar a própria conta) precisa das regras novas. **Publique de novo**:
Firestore Database › Regras › apague tudo › cole o `firebase/firestore.rules`
inteiro › **Publicar**. Sem isso, o painel funciona como antes e a aprovação
automática mostra um aviso.

## Assim que o Claude publicar com a chave

**A partir desse momento, todo mundo que abrir o app cai na tela de login**,
inclusive você. Faça logo:

1. Abra o app › **Criar conta** com `carlos.jr.81@hotmail.com`.
2. Chega um e-mail de confirmação (confira o spam). Toque no link.
3. Volte ao app › **Já confirmei**. Você entra direto, já liberado.
4. **Ajustes › 👑 Sua conta › 👥 Painel de usuários**: quem se cadastrar
   aparece em "Aguardando", no topo.

Se alguém tiver criado uma conta com o seu e-mail antes de você, toque em
**Entrar › Esqueci a senha**: o link chega na sua caixa, e a conta passa a ser
sua. Sem confirmar o e-mail, ninguém passa por dono.

## O que o painel faz

- Os números do topo (contas, aguardando, online agora, entraram hoje,
  ativas em 7 dias, sumidas há 30 dias): um toque filtra a lista.
- **Aprovação automática**: ligada, quem se cadastra já entra.
- **Liberar** com prazo (sem prazo, 7, 30, 90 dias ou 1 ano) e **Renovar**
  quando vence; **Bloquear** com motivo (a pessoa vê).
- **⋯ Mais opções** em cada conta: mudar o prazo, mandar recado (aparece uma
  vez quando a pessoa abre o app), nota só sua, resetar a senha (link no
  e-mail dela) e remover da lista.
- **Liberar todos que aguardam** e **Baixar a lista** em planilha.

## O que cada pessoa vê

- **Primeira vez**: Entrar / Criar conta (nome, e-mail e senha).
- **Depois de criar**: "Cadastro enviado. O criador do app precisa liberar."
- **Liberada**: o app de sempre. Sem internet, continua entrando por 7 dias.
- **Bloqueada**: "Acesso bloqueado", com o seu Instagram. Quem estiver com o
  app aberto é barrado na próxima volta ao app (no máximo em 15 minutos).

## Limites que valem saber

- O plano gratuito do Firebase aguenta 50 mil leituras e 20 mil gravações por
  dia. Cada abertura do app usa 1 de cada: sobra muito.
- O código do app é público e roda no celular de quem usa: alguém que entende
  de programação consegue pular a tela de login **na cópia dele**. O que as
  regras garantem de verdade é a lista de usuários e a aprovação: ninguém além
  de você lê ou muda o status de uma conta.
- Para apagar uma conta de vez (por pedido da pessoa, LGPD): Firebase ›
  Authentication › Usuários › ⋮ › Excluir, e Firestore › `usuarios` › o
  documento dela › Excluir.
