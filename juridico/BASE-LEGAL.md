# Treino Livre — base legal e defesas (saúde, profissão e dados)

> **Não é parecer jurídico.** É o levantamento feito com o Claude (IA) em
> 02/11/2026 para o dono do app. Serve para organizar a conversa com um advogado, que é
> quem pode dar a palavra final. Leis mudam: confira a versão em vigor.

## 1. O risco, em uma frase

O app sugere, ajusta e monta treinos automaticamente. A lei reserva a
**orientação de exercício** ao profissional de Educação Física registrado no
CREF, e o **diagnóstico e o tratamento** ao médico. O risco é o app (ou o
dono) ser visto como alguém que exerce essas profissões sem ser habilitado, ou
responder por um dano a quem treinou seguindo uma sugestão.

## 2. As leis que importam

| Lei | O que diz | O que pesa para o app |
|---|---|---|
| **Lei 9.696/1998** (Educação Física), alterada pela Lei 14.386/2022 | as atividades de Educação Física e o título de profissional são de quem tem registro no CREF; o art. 3º lista coordenar, planejar, programar, supervisionar, dinamizar, dirigir, organizar, avaliar e executar trabalhos, programas e planos na área | quem se apresenta como profissional, faz avaliação física ou monta treino individual para alguém pode ser enquadrado. A lei não detalha o que é "atividade de Educação Física", e a abrangência é disputada nos tribunais |
| **Resolução CONFEF nº 542/2024** | trata do atendimento remoto; chama de "teleaula" a prescrição e o acompanhamento de exercício à distância, inclusive por aplicativo, sempre por profissional habilitado | é a leitura do conselho: um app que **prescreve** como se fosse profissional entra no radar do CREF. Resolução de conselho obriga os inscritos; a quem não é inscrito, a autuação passa por esse entendimento e é discutível |
| **Decreto-Lei 3.688/1941, art. 47** (contravenção) | exercer profissão sem preencher as condições legais | é por aqui que costuma vir a denúncia de "exercício ilegal da profissão" de Educação Física |
| **Lei 12.842/2013** (Ato Médico), art. 4º | diagnóstico de doença e prescrição terapêutica são privativos do médico | o app não pode diagnosticar nem dizer que alguém "pode" treinar por razões de saúde |
| **Código Penal, art. 282** | exercício ilegal da medicina, ainda que de graça | mesmo ponto: nada de diagnóstico, liberação médica ou tratamento |
| **Código de Defesa do Consumidor (Lei 8.078/1990)** | arts. 6º, III, 8º e 9º: informação clara e ostensiva sobre riscos à saúde; arts. 12 e 14: o fornecedor responde pelo dano causado por informação insuficiente; art. 37: publicidade enganosa; art. 49: arrependimento em 7 dias na compra fora da loja; art. 51, I: cláusula que exclui responsabilidade é nula | os avisos têm de ser **claros e à vista**, não escondidos; não se promete resultado; a cláusula de responsabilidade dos termos não pode "isentar tudo" (e não isenta: ela ressalva o CDC) |
| **LGPD (Lei 13.709/2018)** | dado de saúde é **sensível** (art. 5º, II); tratamento só com consentimento específico e destacado ou numa das hipóteses do art. 11, como o exercício de direitos em processo (art. 11, II, "d"); direitos do titular (art. 18); dados de criança e adolescente (art. 14) | os dados de saúde ficam no aparelho; o servidor guarda só o acesso e as declarações que servem de prova; o app é só para maiores de 18 |
| **Marco Civil da Internet (Lei 12.965/2014)** | arts. 7º e 8º: termos claros; art. 15: guarda de registros de acesso por 6 meses para **pessoa jurídica** com fins econômicos | como pessoa física, não há obrigação do art. 15 hoje; virando empresa (MEI/CNPJ) com o app pago, passa a haver |
| **Decreto 7.962/2013** (comércio eletrônico) | quem vende pela internet mostra nome, CPF ou CNPJ, endereço e contato, e garante o arrependimento | **vale no dia em que a cobrança for ligada** (ver o item 5) |

## 3. O que o app já fazia antes de 02/11/2026

- O **aviso de saúde** (`AVISO_SAUDE`) em toda tela que sugere, ajusta ou monta
  treino, nos áudios, nos Ajustes e na política de privacidade: automático, com
  IA, educativo, **não é prescrição**, não substitui médico nem profissional,
  pare se sentir dor no peito.
- Os **Termos de Uso** com aceite obrigatório (duas caixas), versão, impressão
  digital SHA-256 do texto, cópia exata em `termos-versoes/` e o **histórico de
  aceites** no Firestore com a hora do servidor, que só o dono lê e ninguém
  altera. É a prova de que a pessoa leu e aceitou.
- Os termos já diziam: o app não promete resultado; quem decide treinar é a
  pessoa; menores e pessoas com doença precisam do médico; na rua e na esteira,
  a segurança vem antes.

## 4. O que foi acrescentado em 02/11/2026 (versão 2026-11-02a)

1. **"Ferramenta, não profissional", com as leis citadas.** Os termos (versão
   2026-11-02) dizem que o Treino Livre é uma ferramenta de registro,
   organização e informação geral; que não faz avaliação física, diagnóstico,
   prescrição individual nem acompanhamento; que **não oferece atendimento de
   médico nem de profissional de Educação Física** (versão 2026-11-02b: sem
   frase sobre a formação do criador, a pedido dele); e mandam
   procurar esses profissionais (Leis 9.696/1998 e 12.842/2013). A caixa de
   aceite repete isso.
2. **Só maiores de 18 anos.** Saiu a brecha "de 13 a 17 com autorização dos
   pais": o app não tem como conferir a autorização, e dado de adolescente pede
   cuidado especial (LGPD, art. 14).
3. **O questionário de prontidão (PAR-Q)** antes de usar o app: as 7
   perguntas de triagem usadas no mundo todo antes de se exercitar. Resposta
   sim manda ao médico; a pessoa escolhe entre "já tenho a liberação do meu
   médico" e "vou consultar um médico; se treinar antes, é por minha conta e
   risco". Volta a cada 12 meses e pode ser refeito em Ajustes.
   - **A prova:** a declaração marcada vai para o histórico de aceites (o
     mesmo cofre dos termos: hora do servidor, ninguém altera), com a
     impressão digital do questionário. Aparece no painel como "No
     questionário de saúde (PAR-Q)".
   - **A privacidade:** as respostas ficam só no aparelho. Sobe só a frase
     marcada, que a política de privacidade trata como dado sensível (LGPD,
     art. 11, II, "d").
4. **O socorro.** Botão "🆘 Passando mal? Toque aqui" no treino, e o Jarvis
   atende "estou passando mal", "dor no peito", "falta de ar", "socorro":
   mostra o que fazer e o botão de ligar para o **SAMU 192** (também com a tela
   travada, no app Android, o Jarvis fala o que fazer). Mostra o cuidado que um serviço sério tem.
5. **A câmera diz que é automática**: "Contagem e dicas automáticas: podem errar
   e não substituem um profissional de Educação Física".
6. **A política de privacidade** ganhou o questionário, "só maiores de 18" e os
   direitos do titular (LGPD, art. 18), com a ANPD.
7. **A divulgação** (`divulgacao/treino-livre-para-chatgpt.md`) ganhou as
   regras de linguagem para os vídeos (item 6 abaixo).

## 4b. O Treino Adaptado (2026-11-08a)

Treinar com dor no ombro, no cotovelo ou no joelho. A especificação, as fontes
e o checklist estão em `juridico/TREINO-ADAPTADO.md`. O que protege:

- **Registro, não diagnóstico** (Lei 12.842/2013): a localização da dor é só
  registro; nenhuma tela diz o que a pessoa tem.
- **Não monta reabilitação** (Decreto-Lei 938/1969, COFFITO): sem plano, o app
  só marca e pula; com plano, só registra o que o fisioterapeuta orientou e
  mostra se o critério do plano foi cumprido. A pessoa decide.
- **Sinais de alerta param o treino** e mandam procurar atendimento (SAMU na
  emergência). Aceite próprio, com caixa, registrado em `aceites/`.
- **Os dados de dor ficam no aparelho** (dado sensível, LGPD art. 11).
- **Pendente:** a revisão das regras e dos textos por um fisioterapeuta
  (a tela diz "em revisão" até lá), e o advogado conferir o enquadramento
  na ANVISA (software como dispositivo médico; este só registra e organiza).

## 5. O que o app não resolve sozinho (com o advogado)

- **Revisão dos Termos e da Política por um advogado.** O texto foi escrito sem
  um; é o passo que mais protege.
- **Formalizar o negócio (MEI ou empresa)** antes de cobrar: separa o seu
  patrimônio pessoal do app e é exigido para emitir nota.
- **Ligar a cobrança** pede, além disso, o que o Decreto 7.962/2013 manda
  mostrar (nome, CPF ou CNPJ, endereço e contato) e o arrependimento em 7 dias
  (já está nas condições de assinatura).
- **Um e-mail de contato** para os pedidos da LGPD. Hoje o contato é o
  Instagram, que serve, mas um e-mail é o canal que a ANPD espera ver.
- **Seguro de responsabilidade civil** profissional/produto, se o app crescer.
- **Um profissional de Educação Física como responsável técnico** dos treinos
  prontos (o programa de iniciante, a mini band, as aulas, o ajuste): é a
  defesa mais forte contra o CREF, porque aí os modelos passam a ter assinatura
  de quem pode assinar. O nome dele entraria nos termos e nas telas.
- **Registro da marca e do programa no INPI**, já anotado no `CLAUDE.md`.

## 6. Como falar do app (na tela e nos vídeos)

**Nunca:**
- "personal", "personal trainer", "seu treinador", "professor", "consultoria";
- "prescrição", "prescrevo", "treino receitado", "avaliação física",
  "diagnóstico", "liberado para treinar";
- "garantido", "resultado em X dias", "perca X kg", antes e depois prometendo
  resultado;
- apresentar o criador como profissional de Educação Física, nutricionista
  ou médico;
- dieta, cardápio ou suplemento recomendado (é atividade do nutricionista,
  Lei 8.234/1991).

**Sempre:**
- "ferramenta para registrar e organizar o seu treino", "sugestão automática",
  "informação educativa baseada em estudos";
- "consulte um médico antes de começar" em todo vídeo que mostra sugestão ou
  treino pronto;
- "procure um profissional de Educação Física para montar e acompanhar o seu
  treino".

## 7. Se chegar uma denúncia ou notificação

1. Não responda no impulso; guarde a notificação e procure um advogado.
2. A defesa tem três provas, todas no Painel de usuários do app:
   - **📜 Histórico de aceites dos termos**: quem aceitou, quando (hora do
     Google), qual versão e a impressão digital do texto, conferível com
     `sha256sum termos-versoes/<versão>.txt`;
   - **o registro do questionário de saúde** de cada pessoa ("No questionário
     de saúde (PAR-Q)"), com a declaração marcada;
   - **a planilha** desses registros (o botão de baixar do histórico).
3. O texto exato de cada versão dos termos está em `termos-versoes/`, e o do
   questionário no `index.html` (`PRONTIDAO`, com a versão), no histórico do
   GitHub.

## Fontes consultadas

- Lei 9.696/1998: https://www.planalto.gov.br/ccivil_03/leis/l9696.htm
- Lei 14.386/2022: https://www2.camara.leg.br/legin/fed/lei/2022/lei-14386-27-junho-2022-792898-normaatualizada-pl.pdf
- Resolução CONFEF nº 542/2024: https://www.normasbrasil.com.br/norma/resolucao-542-2024_463073.html
- Debate sobre a abrangência da Lei 9.696 e o art. 47 da LCP:
  https://jus.com.br/artigos/19230 e https://www.conjur.com.br/wp-content/uploads/2023/09/clique-aqui-ler-parecer-professor.pdf
- PAR-Q em português (USP): https://cepe.usp.br/wp-content/uploads/PARQ-site-CEPE-1.pdf
