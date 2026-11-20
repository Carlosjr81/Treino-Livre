# Treino Livre nos aparelhos Xiaomi: o que funciona (avaliação de 2026-11-20)

Pedido do dono: "faça uma avaliação para eu colocar o app nos modelos Xiaomi,
relógios e celulares, todos eles. Vou testar num smartwatch Xiaomi verde e num
Xiaomi 13T Pro."

## A resposta curta

| | Instala o app do Treino Livre no pulso? | Batimento ao vivo no treino | Passos, sono, batimento do dia |
|---|---|---|---|
| **Xiaomi Watch 2 e Watch 2 Pro** (Wear OS, têm Play Store) | ✅ Sim, o mesmo app do Galaxy Watch | ✅ Pelo app no pulso | ✅ Conexão Saúde |
| **Xiaomi Watch S1, S2, S3, S4, S4 Sport, S5** (HyperOS / Vela) | ❌ Não | ⚠️ Só nos que transmitem (o **Watch S4 41 mm** transmite) | ✅ Mi Fitness → Conexão Saúde |
| **Redmi Watch 3, 4, 5, 5 Active / Lite** | ❌ Não | ⚠️ Confira no relógio se há "Transmissão de frequência cardíaca" | ✅ Mi Fitness → Conexão Saúde |
| **Xiaomi Smart Band 7, 8, 9 (e Pro)** | ❌ Não | ❌ A 9 e a 9 Pro não transmitem | ✅ Mi Fitness → Conexão Saúde |
| **Xiaomi Smart Band 10 e 10 Pro** | ❌ Não | ✅ Transmitem | ✅ Mi Fitness → Conexão Saúde |

**Como saber qual é o seu relógio:** se ele tem a **Play Store** (e o
Google Assistente), é Wear OS: Xiaomi Watch 2 ou 2 Pro. Sem Play Store, é
HyperOS. O "verde" pode ser vários (Watch 2 Pro, Watch S3/S4 e Redmi Watch têm
pulseira ou aro verde): olhe o nome em Configurações › Sobre.

## Por que o Watch S, o Redmi Watch e a Smart Band não instalam o app

O app do relógio do Treino Livre é um app **Wear OS** (Android no pulso). Os
relógios Xiaomi sem Play Store rodam o **Xiaomi Vela** (o HyperOS dos
relógios), um sistema leve, com outro tipo de app: o "quick app", escrito em
JavaScript com o kit da Xiaomi, num pacote `.rpk`. Não dá para instalar um APK
ali, nem por modo de desenvolvedor.

O que a documentação da Xiaomi mostra (iot.mi.com/vela/quickapp):
- Existe um caminho para apps de terceiros, com uma API de conversa entre o
  relógio e o celular (`system.interconnect`), e o app do celular e o do
  relógio têm de ser assinados com o **mesmo certificado**.
- Mas **não é aberto a qualquer um**: o Mi Fitness instala apps de terceiros
  por um menu de depuração, a distribuição e o guia completo são liberados
  pela equipe da Xiaomi por contato comercial, e a depuração no aparelho foi
  anunciada só para o Watch S4.

**Então, para ter o Treino Livre no pulso desses relógios**, seria um segundo
app do relógio, do zero, em JavaScript para o Vela (o exercício, o ✓ e o
descanso), mais a parte do celular falando com ele pelo canal da Xiaomi, e uma
parceria com a Xiaomi para publicar. É um projeto grande e depende da Xiaomi
aceitar. Se quiser seguir esse caminho, o primeiro passo é o contato com a
Xiaomi (o e-mail está no FAQ do Vela).

## O que já funciona com esses relógios, sem app no pulso

1. **Passos, sono, batimento do dia e peso**: no Mi Fitness, Perfil ›
   Conexão Saúde (o nome pode ser "Apps de terceiros"), ligue o que quer
   mandar. O Mi Fitness grava quando o relógio sincroniza com o celular (não é
   em tempo real), e o Treino Livre lê em Histórico › ❤ Saúde › Sincronizar.
2. **Batimento ao vivo no treino**, nos que transmitem: no relógio, nos ajustes
   de exercício, ligue **Transmissão de frequência cardíaca** e conecte em
   Histórico › ❤ Saúde › Conectar cinta ou relógio (é o mesmo caminho da cinta
   peitoral). A média e o pico entram no treino.
3. **Marcar as séries sem tocar no celular**: o 🔒 Jarvis com a tela travada
   (voz no fone).

## Os celulares Xiaomi, Redmi e POCO

Todos os com os serviços do Google (os vendidos no Brasil) rodam o app
Android do Treino Livre inteiro: site, Jarvis, Conexão Saúde, esteira e cinta
por Bluetooth, e o app do relógio Wear OS (Galaxy Watch, Pixel Watch, Xiaomi
Watch 2...). **O que muda é a bateria**: o HyperOS fecha apps em segundo plano
mais do que a Samsung. Uma vez só, libere:

- **Início automático**: Segurança › Apps › Permissões › Início automático ›
  Treino Livre ligado.
- **Bateria sem restrições**: Configurações › Apps › Treino Livre › Economia de
  bateria › Sem restrições.
- O mesmo para o app que liga o relógio (Galaxy Wearable com o plugin do
  relógio e o Samsung Accessory Service, ou o Mi Fitness) e para o Google Play
  Services.
- Para o Jarvis com a tela travada: nos recentes, segure o Treino Livre e toque
  no cadeado (o HyperOS não fecha app trancado).

Já validado: Redmi Note 13 Pro+ com Galaxy Watch 6 (19/11/2026), depois de
liberar esses apps. O app mostra o passo a passo sozinho: o teste "Testar a
conexão com o relógio" diz onde a conexão para e abre a bateria de cada app.

Não funciona: celular Xiaomi **da China** (sem os serviços do Google): não
liga relógio Wear OS nem tem Conexão Saúde do Google.

## O teste do dono: Xiaomi 13T Pro + relógio Xiaomi verde

**No 13T Pro** (HyperOS, com os serviços do Google):
1. Instale o app Android do Treino Livre (o link em Ajustes), abra pelo ícone.
2. Faça as liberações acima (Início automático, bateria, cadeado nos recentes).
3. Treino de teste: o ✓ fala, trave a tela e diga "Jarvis, 80 por 10".
4. Histórico › ❤ Saúde › Sincronizar: a Conexão Saúde pede a permissão.

**Se o relógio for Xiaomi Watch 2 / 2 Pro (tem Play Store):**
1. Ajustes › ⌚ Instalar o app no relógio › escolha **Xiaomi Watch 2 / 2 Pro**
   e siga os passos (modo de desenvolvedor: 7 toques em Número da versão).
2. Libere também o Mi Fitness (Início automático e bateria).
3. Comece o treino no celular: o relógio abre sozinho. Marque uma série no
   pulso e veja se entra no celular. Toque num lugar vazio da tela: a hora.
4. Se ficar em "Procurando o celular": o "🔎 Testar a conexão" no celular.

**Se for Watch S, Redmi Watch ou Smart Band (sem Play Store):**
1. No Mi Fitness, ligue a Conexão Saúde; no Treino Livre, Sincronizar.
2. Procure "Transmissão de frequência cardíaca" no relógio; se houver, conecte
   como uma cinta e faça uma série: o batimento aparece no treino.
3. O app no pulso não vai aparecer: é o limite do sistema da Xiaomi.

Me diga o que apareceu em cada passo (ou mande prints): é isso que fecha esta
avaliação, como fechou a do Redmi Note 13 Pro+.

## Fontes

- Xiaomi Watch 2 Pro, Wear OS e apps de terceiros pela Play Store: mi.com/global/product/xiaomi-watch-2-pro
- Xiaomi Vela, apps de terceiros (quick app), interconnect e o mesmo certificado: iot.mi.com/vela/quickapp/en/guide e /guide/other/faq.html
- Watch S4 41 mm transmite o batimento por Bluetooth: mi.com/global/product/xiaomi-watch-s4-41mm
- Smart Band 9 e 9 Pro sem transmissão de batimento, a 10 com: the5krunner.com/specs/xiaomi
- Mi Fitness grava na Conexão Saúde quando sincroniza: support.google.com/googlehealth/answer/14236613
