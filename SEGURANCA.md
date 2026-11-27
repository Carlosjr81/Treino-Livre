# A segurança do Treino Livre

Pedido do dono (27/11/2026): "crie dispositivos que dificultem ações
maliciosas, tentativas de acesso e cópias do sistema ou de partes dele".

## Primeiro, a verdade sobre copiar

O Treino Livre é um site. **Todo site entrega o próprio código a quem o abre**:
é assim que o navegador consegue rodá-lo. Não existe truque (ofuscar, bloquear
o botão direito, esconder o código) que impeça alguém com conhecimento de salvar
a página. Ofuscar ainda quebraria o jeito de publicar sem build, e bloquear o
botão direito atrapalha quem usa (copiar o nome de uma ficha) sem atrapalhar
quem copia.

Então a proteção tem três camadas, e cada uma faz uma coisa:

| Camada | O que protege | Quem garante |
|---|---|---|
| **A lei** | o direito de cobrar e processar quem copia | o `LICENSE` (todos os direitos reservados) e o registro no INPI |
| **O servidor** | a lista de usuários, quem tem acesso, os pagamentos, os comprovantes | as regras do Firestore e a chave da API restrita |
| **O app** | quem usa, contra golpes e cópias sem esforço | as travas descritas abaixo |

A camada do app é uma **barreira**, não um cofre: quem programa tira as travas
da própria cópia. O cofre de verdade é a do servidor. É por isso que os passos
do fim desta página, que só você pode fazer, são os mais importantes.

## O que o app já faz (versão 2026-11-27o)

1. **Só abre no endereço oficial.** Publicada em outro endereço (um espelho, um
   golpe de "Treino Livre grátis", uma cópia com o Pix trocado), a página
   mostra "Esta não é a página oficial" e leva ao `carlosjr81.github.io`. O
   endereço da cópia entra na contagem de visitas (GoatCounter) como
   `copia-<endereço>`: é assim que você descobre que alguém publicou o app.
2. **Não abre dentro de outro site** (moldura/iframe). É o golpe de pôr o app
   invisível por baixo de outra página para roubar toques. Entra na contagem
   como `moldura-<endereço>`.
3. **Só roda script dos endereços conhecidos** (a política de segurança da
   página): mesmo que alguém consiga injetar texto no app, um script de um site
   qualquer não carrega. Plugins e formulários para fora também ficam barrados.
4. **Freio de senha.** A 5ª senha errada seguida no mesmo aparelho pede 30 s de
   espera, e cada erro seguinte dobra (até 15 min). O Firebase tem o freio dele
   no servidor, por cima.
5. **Aviso no console** ("Pare!"): o golpe mais comum contra app com login é
   pedir à vítima que cole um código no console "para liberar o acesso". O
   aviso diz que é golpe, e traz o aviso de direitos autorais.
6. **Regras do servidor versão 7**: além de cada pessoa só mexer no que é dela
   (desde a versão 1), agora o tipo e o tamanho de tudo o que ela grava são
   conferidos. Antes, uma conta qualquer podia encher o banco com texto gigante
   pelo acesso direto (o código é público) e estourar a sua cota grátis.
7. **O GitHub Actions da conferida só lê o repositório**: um passo comprometido
   não consegue mudar nada.

## O que só você pode fazer (em ordem de importância)

### 1. Publicar as regras versão 7 (5 minutos)

Firebase (console.firebase.google.com) › projeto **treino-livre** › Firestore
Database › **Regras** › apague tudo, cole o arquivo `firebase/firestore.rules`
inteiro › **Publicar**. Ela já inclui a versão 6 (o comprovante do pagamento).

### 2. Restringir a chave da API ao site oficial (o mais importante contra cópias)

Sem isso, qualquer cópia do app (ou um script) usa o **seu** Firebase com a sua
chave, que é pública por natureza. Com isso, o Google recusa pedidos que não
venham do seu site.

Google Cloud (console.cloud.google.com) › escolha o projeto **treino-livre** ›
**APIs e serviços** › **Credenciais** › abra a chave "Browser key (auto created
by Firebase)":

- **Restrições de aplicativo**: "Sites" (referenciadores HTTP), e acrescente
  `https://carlosjr81.github.io/*`.
- **Restrições de API**: "Restringir chave", e marque só **Identity Toolkit
  API**, **Token Service API** e **Cloud Firestore API**.
- Salvar. Leva até 5 minutos para valer.

Depois, abra o app e entre na sua conta: se entrar, deu certo. Se aparecer erro
de chave, volte e confira o endereço (com o `/*` no fim).

### 3. Firebase › Authentication › Configurações

- **Domínios autorizados**: deixe `carlosjr81.github.io` e os dois do próprio
  Firebase (`treino-livre.firebaseapp.com`, `treino-livre.web.app`). Apague
  `localhost` se estiver lá.
- **Proteção contra enumeração de e-mails**: ligada (impede descobrir quais
  e-mails têm conta).

### 4. Verificação em duas etapas

Na conta Google que é dona do Firebase **e** no GitHub (Settings › Password and
authentication › Two-factor authentication). Quem tem a sua senha do GitHub
controla o app inteiro; quem tem a do Google controla os usuários.

### 5. GitHub › Settings do repositório

- **Branches** › Add branch ruleset (ou "protection rule") para `main`: marque
  só **bloquear force push** e **bloquear exclusão**. **Não marque "exigir pull
  request"**: a publicação pelo Claude é direto no `main`, e isso a travaria.
- **Code security**: ligue **Secret scanning** e **Push protection** (grátis em
  repositório público): o GitHub recusa um commit que traga uma senha ou chave.

### Para depois (exige mais configuração)

- **Firebase App Check** com reCAPTCHA: prova ao servidor que o pedido veio do
  app oficial, e não de uma cópia ou de um script. Exige criar uma chave do
  reCAPTCHA e só vale "aplicado" depois de semanas medindo. É o próximo degrau
  quando houver muitos usuários pagantes.
- **Registro no INPI** da marca e do programa de computador.

## Quando mexer no app

- Endereço novo do app (domínio próprio, por exemplo): acrescente em
  `ORIGENS_OFICIAIS` no `index.html`, nos referenciadores da chave (passo 2) e
  nos domínios autorizados (passo 3). Senão o app não abre no endereço novo.
- Script de um site novo (uma biblioteca de outra CDN): acrescente o endereço na
  política de segurança (`Content-Security-Policy`, no topo do `index.html`).
  O `teste-acesso.js` e o navegador mostram se algo foi barrado.
