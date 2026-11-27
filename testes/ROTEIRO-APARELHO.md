# Roteiro de teste no celular e no relógio

O que os testes automáticos não alcançam: notificação de verdade, Bluetooth,
relógio, app Android instalado. Cada bloco diz **o que fazer**, **o que tem de
acontecer** e **o que mandar ao Claude** se der diferente (de preferência com
print). Um bloco por vez, na ordem: os de cima preparam os de baixo.

Montado em 27/11/2026 para a versão **2026-11-27d** (app Android 201). Marque
o resultado na última coluna de cada bloco (✅ funcionou · ❌ deu diferente ·
⏭ não deu para testar) e anote a data.

---

## 0. Preparar (5 min)

| Passo | Tem de acontecer |
|---|---|
| Abra o Treino Livre pelo ícone do **app Android** (não pelo atalho do Chrome). | Abre normal. |
| ⚙ Ajustes › role até a versão. | Diz **2026-11-27a**. Se diz outra, toque em **Atualizar** na faixa do topo. |
| Ajustes › **App Android**. | Diz **App Android 201**. Se pedir atualizar, toque e instale. |
| No assistente do relógio (Ajustes › Conectar aparelhos › ⌚ Instalar o app no relógio), veja o topo. | Se aparecer **⬆ Atualizar o relógio** em destaque, atualize antes de seguir. |
| Configurações do celular › Apps › Treino Livre › **Aparecer sobre outros apps**: ligado. | É o que deixa o relógio entregar a comida sozinho (bloco 4). |

Resultado: versão e App Android ✅ (27/11, print do dono: 2026-11-27a · App Android 201). Relógio e permissão: ___

---

## 1. Shake e combinações (Balance, só celular)

| Passo | Tem de acontecer |
|---|---|
| Balance › Hoje › **+ Comida** › aba **🥤 Montar**. | Aparecem as sugestões (whey com farinha de arroz, amido, aveia, maltodextrina, banana, intra-treino com glicerina, pão com ovos...). |
| Escolha **Pão francês com ovos mexidos**, mude para 2 pães e 3 ovos no − e +. | As calorias mudam na hora. |
| Embaixo da manteiga, toque em **🫗 Óleo**. | As calorias sobem um pouco (332 → 341 kcal), e a quantidade continua 5 g. |
| Toque em **+ Anotar no dia**. Os textos falam em comer, não em shake ("Quantas vezes comeu?"), e o ingrediente é **Ovo mexido**. | Entra **um item só** na lista do dia, com o nome da combinação. |
| Toque no item anotado. | Abre a correção; dá para mudar ou tirar do dia. |

Mandar ao Claude se: o total não mudar com o − e +, entrarem vários itens
soltos, ou a correção não abrir.

Ensaio no navegador (27/11): a tela dizia "shake" num prato e o ingrediente era
"ovo cozido" (achado também pelo dono) — corrigido na 2026-11-27b. Anotou um
item só, 332 kcal.

Resultado: ___

---

## 2. O espaço do treino e as janelas (Balance, só celular)

Faça num dia em que você **treinou e finalizou o treino no app**.

| Passo | Tem de acontecer |
|---|---|
| Balance › Hoje, logo depois de finalizar o treino. | Cartão verde **"O treino de hoje abriu espaço"** com "+N kcal na meta" e exemplos de comida. |
| Desça até **⏱ As janelas dos nutrientes**. | Seis janelas com horário **calculado pelo seu treino** (antes, depois, proteína no dia, antes de dormir, cafeína, creatina). |
| Embaixo de "Costumo dormir às", escolha **🏋 Costumo treinar às** (sua hora), a duração e os dias. | No dia marcado, aparece "Treino previsto às …" e a janela de antes do treino já existe de manhã. |
| Anote o **Intra-treino com glicerina** (tem creatina dentro). | A janela da creatina ganha ✓ sozinha, com "anotado: Intra-treino com glicerina". |
| Na **cafeína**, toque em **✓ consumi, só não anotei**. | Ela fica marcada como "marcado por você" e o placar sobe um. |
| Anote 25 g de proteína ou mais logo depois do treino. | A janela "depois do treino" ganha ✓ sozinha. |

Mandar ao Claude se: o cartão verde não aparecer depois de um treino, os
horários não baterem com a hora do treino, ou o placar não subir.

Ensaio no navegador (27/11): o cartão verde apareceu (60 min de treino,
+326 kcal na meta), e "✓ consumi, só não anotei" levou o placar de 0/6 a 1/6
("marcado por você").

Resultado: ___

---

## 3. Avisos das janelas no celular (🔔)

| Passo | Tem de acontecer |
|---|---|
| No cartão das janelas, ligue **🔔 Avisar quando uma janela abrir** e escolha a hora em que você dorme. | O celular pede permissão de notificação (na primeira vez). Permita. |
| No Balance › Perfil, toque em **⌚ Mandar metas, favoritos e shakes ao relógio**. | Esse toque leva os horários **de hoje** ao app Android (é o que agenda o aviso com o app fechado). Anotar comida também leva. Faça no mesmo dia do teste. |
| Feche o app e espere a próxima janela abrir. | Chega **uma** notificação daquela janela, começando sem cobrar ("sem pressa..."). |
| Esteja num treino aberto quando uma janela abrir. | **Não** chega aviso durante o treino. |

Mandar ao Claude se: não chegar nada, chegar repetido, ou chegar no meio do
treino. Diga a hora da janela e a hora em que chegou (ou não chegou).

Resultado: ___

---

## 4. Comida e água pelo relógio

| Passo | Tem de acontecer |
|---|---|
| Abra o Treino Livre no relógio. | Tela dividida: **TREINO** em cima, **COMIDA & ÁGUA** embaixo. |
| Toque em COMIDA & ÁGUA. | Anel do dia, 💧 +200 e +500, **🥤 SEUS SHAKES** e os rápidos. |
| Com o app aberto no **celular** (Balance › Hoje), toque em 💧 +200 no relógio. | Em poucos segundos a água sobe no celular **sem tocar em notificação**. No relógio aparece **✓ tudo no celular**. |
| Feche o app do celular e toque num shake no relógio. | O relógio mostra **⏳ esperando o celular**; no celular chega a notificação **⌚ Do relógio**. Tocando nela, o shake entra no dia, com a água do copo. |
| Toque em ↩ Desfazer no relógio. | O item sai do dia também no celular. |

Mandar ao Claude se: a seção dos shakes estiver vazia, a anotação não chegar
ao celular, ou entrar duas vezes.

Resultado: ___

---

## 5. Aviso da janela no relógio

| Passo | Tem de acontecer |
|---|---|
| Com o bloco 3 ligado, espere uma janela abrir com o relógio no pulso. | Duas vibrações curtas e a mensagem da janela na tela do relógio. |

Mandar ao Claude se: o celular avisou e o relógio não.

Resultado: ___

---

## 6. Atualização sozinha (acontece com o tempo)

Não há o que fazer agora: só observar quando sair um app Android novo.

| O que observar | Tem de acontecer |
|---|---|
| Depois de uma publicação que mexa no app Android, deixe o celular com a tela apagada por uns 15 min. | O app do celular se atualiza sozinho (ou aparece a notificação "versão N pronta: toque para atualizar"). |
| Com a tela do celular ligada e o relógio por perto. | O relógio abre a tela de atualizar e se atualiza sem toque (só funciona se ele já foi pareado uma vez com o código de 6 números). |

Mandar ao Claude se: depois de um dia o número em Ajustes › App Android
continuar o antigo.

Resultado: ___

---

## 7. Treino: juntar, extra e tempo (menor prioridade)

| Passo | Tem de acontecer |
|---|---|
| Início › no cartão do treino de hoje, **🔗 Faltei um dia: juntar com outro treino**. Marque duas fichas e 75 min. | Monta um treino só, menor que as duas fichas somadas, e as fichas não mudam. |
| **➕ Já treinei tudo: fazer um treino extra**. | Mostra os músculos que entraram e os que ficaram de fora, com o motivo. |
| **⏱ Tenho menos tempo hoje** › 45 min › Só hoje. | O treino começa encurtado; a ficha continua igual. |

Mandar ao Claude se: alguma ficha mudar sozinha, ou o tempo prometido estiver
muito longe do real.

Ensaio no navegador (27/11): juntar "Sexta" (13) com "Quinta" (11) deu 8
exercícios e 26 séries, sem mudar ficha nenhuma; o extra deixou de fora o peito
treinado no dia e montou costas, bíceps, abdômen e lombar em ~39 min; o "menos
tempo" pôs a ficha de 1 h 59 em 1 h 30 com 4 bi-sets e descanso mais curto.

Resultado: ___
