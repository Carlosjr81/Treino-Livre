# Treino Adaptado: especificação, fontes e o que espera revisão

Pedido do dono (2026-11-08): "um mapa corporal para registrar ombro, cotovelo
ou joelho [...] sinais de alerta e critérios de encaminhamento com revisão de
um fisioterapeuta [...] quando houver um plano definido pelo fisioterapeuta,
registrar exercícios, carga, amplitude e critérios de progressão". A
especificação completa foi escrita num documento compartilhado do Claude e
aprovada pelo dono ("está autorizado"). Este arquivo é a cópia que fica no
repositório, porque decisão que só existe numa conversa não existe.

**Publicado na versão 2026-11-08a. A revisão do fisioterapeuta ainda NÃO foi
feita.** Por isso:

- `REVISAO_ADAPTADO` (no `index.html`) está vazio, e a tela diz "em revisão
  por um fisioterapeuta";
- `VARIACOES_ADAPTADO` está vazia: o app **não sugere troca nenhuma**, só
  marca, pula e avisa;
- os sinais de alerta "sem fonte nesta versão" estão no ar como rascunho
  conservador (eles só mandam procurar atendimento).

Quando a revisão acontecer: grave nome, CREFITO e data em
`REVISAO_ADAPTADO`, ajuste o que ele pedir, preencha `VARIACOES_ADAPTADO`
com os pares que ele assinar, e suba `VERSAO_ADAPTADO`.

## O que o recurso é, e o que não é

O Treino Adaptado deixa quem treina com dor no ombro, no cotovelo ou no
joelho continuar treinando o resto do corpo. Ele **registra** onde dói,
**marca** os exercícios que provocam sintomas, **para tudo** diante de um
sinal de alerta e, com um plano do fisioterapeuta, **registra** o plano,
anota a dor durante o exercício e na manhã seguinte, e conta as repetições
pela câmera.

Nunca: diz o que a pessoa tem; monta protocolo de reabilitação; decide
progredir ou voltar ao treino completo (com plano, quem decide são os
critérios do plano; sem plano, nada progride no exercício doloroso); usa
"tratamento", "recuperar", "reabilitação" (como coisa que o app faz),
"prescrição", "liberado para treinar" ou promessa de melhora.

Diagnosticar é ato do médico (Lei 12.842/2013); montar a reabilitação é do
fisioterapeuta (Decreto-Lei 938/1969, normas do COFFITO); orientar exercício
é do profissional de Educação Física (Lei 9.696/1998). Ver `BASE-LEGAL.md`.

## As fontes (F1 a F9)

Na sessão em que isto foi escrito, doi.org, PubMed e Crossref estavam fora da
rede: os dados vieram das páginas das revistas e de resumos. **Nenhum texto
integral foi lido**; a revisão confere população, números e graduação.

| Id | Fonte | Tipo | População | O que sustenta | Limite |
|---|---|---|---|---|---|
| F1 | Bayer, Magnusson, Kjaer. Early versus Delayed Rehabilitation after Acute Muscle Injury. NEJM 2017;377:1300-1301. doi:10.1056/NEJMc1708134 | Ensaio randomizado (carta) | 50 atletas amadores com lesão muscular aguda de coxa ou panturrilha, confirmada por imagem; reabilitação aos 2 ou 9 dias | Repouso longo não é a regra | Só músculo de coxa e panturrilha diagnosticado |
| F2 | Desmeules e colegas. Rotator Cuff Tendinopathy Diagnosis, Nonsurgical Medical Care, and Rehabilitation: A Clinical Practice Guideline. JOSPT 2025;55(4):235-274. doi:10.2519/jospt.2025.13182 | Diretriz | Adultos com dor no ombro e suspeita de tendinopatia do manguito | Exercício ativo primeiro; diagnóstico diferencial antes | A suspeita é do profissional |
| F3 | Lucado e colegas. Lateral Elbow Pain and Muscle Function Impairments: Clinical Practice Guidelines. JOSPT 2022;52(12):CPG1-CPG111. doi:10.2519/jospt.2022.0302 | Diretriz (literatura até nov/2021) | Adultos com tendinopatia lateral do cotovelo | Fortalecer os extensores do punho; o PRTEE | **É a face lateral, não a ponta do cotovelo** |
| F4 | Neal e colegas. Best practice guide for patellofemoral pain [...]. BJSM 2024;58(24):1486-1495. doi:10.1136/bjsports-2024-108110 | Guia de boa prática | Dor patelofemoral | Exercício de joelho e de quadril e joelho | Não vale para trauma, menisco, ligamento |
| F5 | Nelligan e colegas. Effects of a Self-directed Web-Based Strengthening Exercise and Physical Activity Program [...] Knee Osteoarthritis. JAMA Intern Med 2021;181(6):776-785. doi:10.1001/jamainternmed.2021.0991 | Ensaio randomizado | 206 adultos com artrose de joelho, Austrália | Programa entregue por site e mensagens melhorou dor e função em 24 semanas: o precedente para o app registrar e lembrar um programa | O programa foi definido pelos pesquisadores |
| F6 | Silbernagel e colegas. Continued sports activity, using a pain-monitoring model [...] Achilles tendinopathy. Am J Sports Med 2007;35(6):897-906 | Ensaio randomizado | 38 pacientes com tendinopatia do Aquiles | O modelo de monitorar a dor (0 a 10, durante e no dia seguinte) | A faixa aceitável vem do plano profissional |
| F7 | Stiell e colegas, JAMA 1996;275(8):611-615; Bachmann e colegas, Ann Intern Med 2004;140(2):121-124 | Regra de decisão + revisão | Adultos no pronto-socorro após trauma agudo do joelho | Não dar 4 passos apoiando a perna indica investigar | No app vira só "procure atendimento" |
| F8 | Margaretten e colegas. Does this adult patient have septic arthritis? JAMA 2007;297(13):1478-1488 | Revisão sistemática | 14 estudos, 6.242 adultos com artrite de uma articulação | Quente e inchada pode ser infecção; febre é pouco sensível | Confirmar exige punção |
| F9 | Revisão sobre bursite do olécrano, J Shoulder Elbow Surg 2016 (PMID 26577126) | Revisão | Casos de bursite do olécrano | Na séptica: calor 84%, vermelhidão 83%, febre 38% | Autores e números a conferir |

Nenhuma das cinco fontes de partida trata da **ponta do cotovelo**: ali o app
só tem o alerta (F9) e o registro.

## O registro (`treinolivre:adaptado`, só no aparelho)

```js
{ v: 1, aceite: { em, v, reg }, registros: [{
  id, situacao: "ativa" | "encerrada", criado, encerradoEm,
  regiao: "ombro" | "cotovelo" | "joelho", lado: "dir" | "esq" | "ambos", zona,
  inicio: "AAAA-MM-DD", trauma, movimentos: [...], dorRepouso,
  triagem: { sims, em }, alerta: { nivel, motivo, em, atendidoEm },
  avaliacao: "nao" | "semRestricao" | "restricoes" | "plano",
  restricoes: { semImpacto, semApoio, semAcima, naoLado, semCarga, cargaMax, amplitude, naoFazer: [ids], texto, prof },
  plano: { prof, crefito, data, itens: [{ exercicioId, series, reps, carga, amplitude, ritmo }], dias,
           dorDurante, dorManha, progredirN, progredirAcao, voltarAcao, completo, proxima, em, decididoEm },
  sintomas: [{ tipo: "durante" | "manha", valor, em, sess, ex }], decisoes: [{ em, texto }] }] }
```

Vai no backup em arquivo, não no texto copiável e **nunca no Firebase**. Para
o Firebase sobe só a declaração do aceite (`aceites/`, `de: "adaptado"`), sem
mudar as regras.

## A lógica (funções puras, `teste-adaptado.js`)

Sempre nesta ordem: **alerta** (para tudo), **modo**, **cada exercício**.

- `triagemAdaptado`: o "sim" mais grave entre `ALERTAS_ADAPTADO`; dor de 7 ou
  mais parado vira "em breve". Níveis: emergência (SAMU, para tudo), hoje
  (atendimento no dia, para tudo), em breve (avaliação, para só a região).
- `alertaDoRegistro`: o alerta da triagem ainda não atendido, ou o da escala
  (`sinalDaEscala`: 7 ou mais, ou três manhãs seguidas piorando). "Já fui
  atendido" é uma declaração com caixa de marcar, gravada com data.
- `modoAdaptado`: registro (sem avaliação ou sem restrição), restrições,
  plano.
- `movimentosDoExercicio`: o que cada exercício carrega por região, por
  regras de nome (`REGRAS_MOV_ADAPTADO`, a primeira que fala de uma região
  vence), depois o grupo; exercício criado pela pessoa e região tocada sem
  movimento conhecido ficam "em dúvida". **Esta tabela também passa pela
  revisão.**
- `estadoExercicioAdaptado`: livre, marcado (carrega um movimento que dói),
  barrado (fere uma restrição orientada, ou há alerta), em dúvida. Carga
  máxima, amplitude e texto livre viram notas, não decisões.
- No treino: o barrado já vem pulado (`pulado` no item, que o
  `alvoDaSessao` pula), o marcado tem "Pular hoje", e a carga não sobe
  sozinha em nenhum dos dois.
- `variacaoCompativel`: só da `VARIACOES_ADAPTADO` revisada, do mesmo grupo,
  sem movimento que dói e cumprindo as restrições; texto livre bloqueia.
- `criterioPlano`: mostra se o critério do plano foi cumprido (N sessões
  dentro da dor combinada; uma sessão acima = voltar um passo). O app não
  aplica: a pessoa confirma "Seguir o plano e ajustar" e edita o plano.
- `manhaPendente`: a pergunta da manhã seguinte, entre 6 e 36 h depois.
- `relatorioAdaptado`: o resumo em texto para levar à consulta ("não é laudo
  nem diagnóstico").

## A câmera no plano

A sessão do plano é uma sessão comum (`sessao.adaptado`), e o Eyes Scan conta
as repetições com `semCorrecao`: o técnico e a correção de postura ficam
desligados (corrigir exercício de reabilitação é do fisioterapeuta). **A
amplitude ainda não é medida**: a especificação pede medir a precisão da
câmera em cada exercício antes; até lá o limite de amplitude do plano só
aparece escrito.

## O que ficou de fora desta versão

- O Jarvis aceitar "dor 3" (a escala é por toque).
- O resumo para o profissional é em texto (.txt), não PDF.
- O ponto exato é a zona (frente, lado de fora...), sem coordenada no desenho.
- Lombar, punho e tornozelo.

## Checklist da revisão do fisioterapeuta

- [ ] Fontes F1 a F9 no texto integral
- [ ] Cada sinal de alerta, o nível e a fonte (os "sem fonte nesta versão")
- [ ] Os cortes: dor 7, três manhãs piorando, lembrete aos 14 dias
- [ ] As listas de movimentos por região e a `REGRAS_MOV_ADAPTADO`
- [ ] A `VARIACOES_ADAPTADO` (ou mantê-la vazia)
- [ ] A ponta do cotovelo além do alerta
- [ ] A forma dos critérios do plano
- [ ] A câmera sem correção no plano, e se a amplitude pode virar aviso
- [ ] Todos os textos (`TEXTOS_ADAPTADO`, `ALERTAS_ADAPTADO`)
- [ ] Nome, CREFITO e data em `REVISAO_ADAPTADO`

E o advogado: os limites legais, a privacidade e o enquadramento na ANVISA
(software que diagnostica ou indica tratamento pode virar dispositivo médico;
este só registra e organiza).
