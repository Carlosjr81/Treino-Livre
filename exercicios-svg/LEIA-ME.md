# Desenhos dos exercícios (o movimento animado)

Cada exercício tem duas posições: `<id>-a.svg` (início) e `<id>-b.svg` (fim, a
de força). O app as alterna em `MovimentoAnimado` e acende os músculos no mapa ao
lado. Quais exercícios usam qual par está em `POSES_EXERCICIO`, no `index.html`.

**Origem e licença:** projeto aberto Everkinetic
(https://github.com/everkinetic/data, commit 446bb9a), arquivos
`dist/svg/<id>-relaxation.svg` e `<id>-tension.svg`, sob a licença
**Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional (CC BY-SA 4.0)**,
https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br.

Alteração feita: só os números dos caminhos arredondados para uma casa decimal e
os espaços tirados (o desenho não muda). Estes arquivos continuam sob a CC BY-SA
4.0; o resto do Treino Livre não (ver o LICENSE na raiz). O crédito aparece
embaixo de cada animação e em Ajustes › Créditos.

Para acrescentar um exercício: escolha o par no `dist/exercises.json` do
Everkinetic **conferindo pelo título e pela imagem** (figura errada ensina o
movimento errado), copie os dois arquivos com os nomes `-a`/`-b` e ponha a linha
em `POSES_EXERCICIO`. O `teste-poses.js` confere que os arquivos existem.
