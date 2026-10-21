# Suíte de testes do Treino Livre

Esta pasta vive **dentro do repositório**, de propósito: um `git clone` entrega
o projeto completo — app e testes — em qualquer computador, sem depender de
nenhuma sincronização de nuvem.

Os testes acham o `index.html` sozinhos, pela posição desta pasta em relação à
raiz do repositório. Nenhum caminho está escrito à mão, e é isso que permite
abrir o projeto em qualquer máquina, com qualquer letra de unidade.

Nada aqui é carregado pelo app: o `index.html` não referencia esta pasta, e o
`sw.js` tem uma lista explícita do que guarda em cache. O GitHub Pages serve
estes arquivos, e ninguém os pede.

## Os comandos

```bash
node testes/rodar.js
```

As 29 suítes (1.171 checagens) contra o `index.html` da raiz. Prova que a
**lógica** não quebrou. Vale rodar **antes e depois** de qualquer mexida.

```bash
node testes/verificar.js
```

A conferida de publicação — prova que o app ainda **abre**, que é outra coisa.
Cada checagem corresponde a um jeito real de derrubar o Treino Livre:

| Confere | Sem isso |
|---|---|
| o JSX compila (Babel de verdade, da CDN ou do npm) | erro de sintaxe → tela branca para todos |
| os hashes SRI batem com os arquivos reais | hash errado → o navegador recusa o React |
| as três versões sincronizadas **e subidas** | o conserto não chega ao celular de ninguém |
| os endereços do `sw.js` batem com os do `index.html` | o cache guarda endereço que ninguém pede |
| todo arquivo da lista do `sw.js` existe | o modo offline instala quebrado |

O que depende de rede vira **aviso** sem rede, não erro: travar a publicação
por falta de internet seria trocar um problema por outro.

```bash
node testes/prova-verificador.js
```

Quebra o app de cinco jeitos de propósito e cobra que o `verificar.js` reprove
cada um. **Rode sempre que mexer no verificador.** Rede de proteção que nunca
reprovou nada não é rede de proteção. Demora mais que as outras (copia o
projeto cinco vezes e roda a conferida inteira em cada cópia), por isso fica
fora do `rodar.js`.

O hook de `pre-push` (`hooks/pre-push`) roda `rodar.js` e `verificar.js` antes
de todo push e cancela se alguma reprovar. Ele é ligado pelo `preparar.ps1` /
`preparar.sh`, que apontam `core.hooksPath` para `testes/hooks` — hook do git
não viaja dentro do clone.

```bash
node testes/servir.js
```

Sobe o app em `http://localhost:8765`. Abrir o `index.html` direto no navegador
não serve: em `file://` o `localStorage` fica bloqueado e o service worker não
registra — justo onde moram os dados e o modo offline.

Precisa de Node.js. Nenhuma dependência: não há `package.json`, não há
`npm install`, e isso é de propósito — ver *Restrições que moldam tudo* no
`CLAUDE.md`.

## O que cada suíte cobre

| Suíte | O que prova |
|---|---|
| `teste-parser` | o interpretador de voz: 91 frases viram (ou não viram) comandos |
| `teste-contador` | a contagem de repetições, com corpo sintético |
| `teste-ficha` | a ficha muda com o treino (trocar, tirar, acrescentar, reordenar) e o treino que vira ficha |
| `teste-tecnico` | os comentários do técnico — **e o silêncio dele** |
| `teste-funcional` | os movimentos funcionais e o modo alternado |
| `teste-postura` | a correção de postura, principalmente o que ela **não** pode falar |
| `teste-enquadramento` | pôr a pessoa no quadro, e o sentido esquerda/direita |
| `teste-evolucao` | a leitura do histórico por exercício |
| `teste-cardio` | o aeróbico: esteira, bicicleta, remo, escada, natação, rua — distância, ritmo, gasto (ACSM e Compendium) e a meta da semana da OMS |
| `teste-alvo` | onde cai a próxima frase do Jarvis, e a alternância do bi-set |
| `teste-rota` | o percurso na rua: filtro do GPS, distância em cordas, parciais, subida, pausa e tela apagada |

Eles **não substituem** o roteiro manual do `CLAUDE.md`. Provam que a lógica
não quebrou; não provam que a tela funciona. Câmera, microfone e service
worker continuam exigindo um aparelho de verdade.

## Coisas que já custaram caro aqui

- **Nenhum teste lê cópia do código.** Todos recortam as funções direto do
  `index.html`, por marcadores de seção. O `teste-parser` lia um
  `jarvis-cerebro.txt` e o `teste-contador` um `eyes-cerebro.txt`, os dois de
  outubro: 99 checagens verdes provando que a versão congelada funcionava. O
  defeito só apareceu quando foram repontados para o código vivo.
- **O recorte para antes do primeiro componente React.** Node não compila JSX.
  Se o marcador não for achado, o teste aborta com mensagem — recorte vazio que
  roda é pior que teste que não roda.
- **O corpo sintético precisa ter proporção de gente em pé** (tronco de ~0,25
  da tela). Os sinais de posição do contador são divididos pela escala do
  tronco e multiplicados por 100: com tronco curto, o tremor de 0,004 vira 4
  pontos de "movimento" e o contador conta gente parada. A versão antiga punha
  os dois ombros no mesmo ponto e as duas pernas no mesmo objeto — tronco de
  largura zero não é um corpo.
- **O corpo sintético não pode se teletransportar.** O descanso tem de começar
  no mesmo ponto onde o ciclo começa. Se descansa em pé e o ciclo começa
  agachado, o primeiro quadro da série é uma descida inteira de uma vez — e o
  contador conta, com razão.
- **O ruído é semeado**, não `Math.random`. Com sorteio livre o teste falhava
  uma vez a cada trinta execuções, e teste que falha às vezes é teste que se
  aprende a ignorar.

## Se o app estiver em outro lugar

```bash
TREINO_HTML="/caminho/para/index.html" node rodar.js
```
