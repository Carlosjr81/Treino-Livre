# Publicar o Treino Livre na Google Play (com o app do relógio)

Pedido do dono (2026-11-11c): "automatizar ao máximo todo o trabalho para o
app funcionar no relógio". Com o app na Play Store, quem usa instala o app no
celular e, no relógio, o Treino Livre aparece em **Apps no seu celular** (ou
abre direto pelo botão do assistente): **um toque, sem modo de desenvolvedor**.
E cada versão nova chega sozinha, no celular e no relógio.

**O que já está pronto:** o GitHub Actions monta os dois pacotes da loja (AAB)
a cada versão e, quando existir a chave de serviço, manda os dois para o
**teste interno** da Play Store sozinho. O pacote da loja é a versão "loja" do
app: nela não há o instalador pelo Wi-Fi (a loja proíbe app que instala outro
app por fora dela); o mesmo botão abre a Play Store no relógio.

**O que só o dono pode fazer** (conta, pagamento e documento são pessoais):

## 1. Criar a conta de desenvolvedor (uma vez)

1. Entre em **play.google.com/console** com a conta Google que vai ser a dona
   do app. Escolha **conta pessoal** (ou de organização, se for abrir empresa:
   a de organização pede o D-U-N-S).
2. Pague a taxa única de **US$ 25** e confirme a identidade (documento com
   foto) e o telefone. A verificação leva de algumas horas a alguns dias.

## 2. Criar o app no Console

1. **Criar app** → nome **Treino Livre**, idioma **Português (Brasil)**, App,
   Gratuito.
2. Em **Configurações → Configuração avançada → Formatos**, adicione
   **Wear OS**.
3. **Assinatura**: na primeira versão o Console oferece a Assinatura de apps
   do Google Play. **Escolha usar a chave que já existe** ("Usar outra chave /
   Exportar e enviar de um keystore", ferramenta PEPK) com o `.jks` do segredo
   `ANDROID_KEYSTORE_B64`. Assim os apps da loja e os do GitHub têm a mesma
   assinatura: o relógio e o celular conversam mesmo que um venha da loja e o
   outro do GitHub, e o `assetlinks.json` (a barra de endereço) continua valendo.
   Se preferir a chave do Google, acrescente a impressão digital SHA-256 dela no
   `assetlinks.json` do repositório `carlosjr81.github.io`.

## 3. A chave de serviço (para o GitHub publicar sozinho)

1. No Console: **Usuários e permissões → Convidar usuários**, ou em
   **Configuração → Acesso à API**, crie uma **conta de serviço** no Google
   Cloud (o Console mostra o link), gere uma **chave JSON** para ela.
2. Dê a ela a permissão de **lançar versões em testes** no app Treino Livre.
3. No GitHub do repositório: **Settings → Secrets and variables → Actions →
   New repository secret**, nome **`PLAY_SERVICE_ACCOUNT_JSON`**, valor: o
   conteúdo inteiro do arquivo JSON.
4. **A primeira versão tem de ser enviada à mão** (a API só publica depois
   que o app existe na loja): baixe o artefato **pacotes-play-store** de uma
   execução do Actions "App Android" e envie o `app-loja-release.aab` em
   **Testes → Teste interno** e o `relogio-release.aab` na faixa de teste
   interno do **Wear OS**. Daí em diante, cada versão vai sozinha.

## 4. Testar e publicar

- **Teste interno** (até 100 pessoas, liberado na hora): em **Testadores**,
  ponha o seu e-mail e os de quem for testar e mande o link de participação.
- **Para abrir para todo mundo**, conta pessoal criada depois de novembro de
  2023 precisa antes de um **teste fechado com 12 pessoas por 14 dias
  seguidos**. Só depois disso o Console libera a produção.
- O que o Console vai pedir antes da revisão (os textos estão em
  `loja/ficha-da-loja.md`): ficha da loja, ícone 512×512 (`icon-512.png`),
  gráfico de destaque 1024×500, capturas do celular e do relógio, a política de
  privacidade (`https://carlosjr81.github.io/Treino-Livre/privacidade.html`),
  classificação de conteúdo, público-alvo (18+), segurança dos dados, e as
  **declarações de permissão**: Health Connect (cada tipo de dado lido e
  gravado, e por quê), serviços em primeiro plano (microfone: o Jarvis com a
  tela travada; localização: a corrida do desafio; dispositivo conectado: os
  óculos) com um vídeo curto de cada.
- Quando a revisão pedir `targetSdk` mais novo, me peça: é uma linha no
  `android/app/build.gradle.kts` e no do relógio, e eu confiro o resto.

Depois que o app estiver na loja, a variável **`PLAY_STATUS`** do repositório
(Settings → Variables) pode virar `completed`, para as versões irem direto ao
teste interno em vez de ficarem como rascunho.
