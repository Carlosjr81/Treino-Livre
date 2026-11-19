// O roteiro do Reels "o treino que se ajusta pela ciência" (2026-11-20b).
//
// Cada cena tem as falas (quem fala, o texto da legenda e, quando a pronúncia é
// outra, o "dito", que vai para a voz), as telas reais (telas/<img>.png, com a
// câmera indo até um elemento da tela), os toques, os realces e a realidade
// aumentada (ar). O tempo de tudo é dito como [fala, fração da fala]: assim, com
// a voz dublada, o vídeo se refaz no ritmo dela sem mexer em nada aqui.
//
// Na legenda, *palavra* sai em destaque (no degradê da marca).
// Linguagem: nada de "personal", "prescrição", "garantido" nem promessa de
// resultado (juridico/BASE-LEGAL.md, item 6); "consulte um médico" no fim.
// Ritmo: ~75 s, o tamanho que o Reels segura até o fim.
module.exports = {
  titulo: "Treino Livre: o treino que se ajusta pela ciência",
  cenas: [
    {
      id: "gancho",
      falas: [{ quem: "dono", texto: "Você treina há meses e *não cresce*? O problema pode ser a *sua ficha*." }],
      telas: [{ img: "equilibrado", de: [0, 0], cam: [[0, 0, null, 1.0], [0, 0.18, "estão treinando pouco", 1.3], [0, 0.85, "estão treinando pouco", 1.42]] }],
      realces: [[0, 0.2, "estão treinando pouco", 2.4]],
      ar: [
        { tipo: "titulo", em: [0, 0], ate: [0, 1], linhas: ["SUA FICHA PODE", "ESTAR TE *SABOTANDO*"] },
        { tipo: "meme", em: [0, 0.45], ate: [0, 1], arquivo: "gancho", emoji: "😱", topo: "EU DESCOBRINDO QUE", base: "TREINAVA PEITO 1× POR SEMANA" },
      ],
      tremer: [0, 0.02],
    },
    {
      id: "monta",
      falas: [
        { quem: "dono", texto: "Eu criei o *Treino Livre*: um app grátis que monta o seu treino *pela ciência*." },
        { quem: "dono", texto: "*Três perguntas*: objetivo, dias e nível." },
      ],
      telas: [{ img: "assistente", de: [0, 0], cam: [[0, 0, null, 1.0], [0, 0.7, "Como fica:", 1.25], [1, 0.05, "4", 1.35], [1, 0.9, "Interm.", 1.4]] }],
      toques: [[1, 0.2, "💪 Músculo"], [1, 0.5, "4"], [1, 0.8, "Interm."]],
      ar: [{ tipo: "chips", em: [1, 0], ate: [1, 1], itens: ["🎯 Objetivo", "📅 Dias", "📈 Nível"] }],
    },
    {
      id: "literatura",
      falas: [
        { quem: "dono", texto: "Cada músculo, *duas vezes* por semana." },
        { quem: "jarvis", texto: "Schoenfeld e colegas, 2016.", dito: "Schoenfeld e colegas, dois mil e dezesseis." },
        { quem: "dono", texto: "De *10 a 20 séries* por semana. E conta até o músculo que só ajuda: no supino, tríceps e ombro valem *meia série*.",
          dito: "De dez a vinte séries por semana. E conta até o músculo que só ajuda: no supino, tríceps e ombro valem meia série." },
        { quem: "jarvis", texto: "Pelland e colegas, 2024.", dito: "Pelland e colegas, dois mil e vinte e quatro." },
      ],
      telas: [{ img: "musculos", de: [0, 0], cam: [[0, 0, null, 1.0], [2, 0, "Deltoides (ombros)", 1.35], [2, 0.6, "Peitoral", 1.3]] }],
      realces: [[2, 0.05, "Deltoides (ombros)", 2.0]],
      ar: [
        { tipo: "frequencia", em: [0, 0.1], ate: [1, 1] },
        { tipo: "faixa", em: [2, 0], ate: [2, 0.42] },
        { tipo: "corpo", em: [2, 0.42], ate: [3, 1] },
        { tipo: "fonte", em: [1, 0], ate: [1, 1], texto: "Schoenfeld et al., 2016" },
        { tipo: "fonte", em: [3, 0], ate: [3, 1], texto: "Pelland, Schoenfeld et al., 2024" },
      ],
    },
    {
      id: "ciclo",
      falas: [
        { quem: "dono", texto: "Tudo num *ciclo de 5 semanas*: sobe aos poucos e fecha com uma semana de *recuperação*.",
          dito: "Tudo num ciclo de cinco semanas: sobe aos poucos e fecha com uma semana de recuperação." },
        { quem: "jarvis", texto: "Bell e colegas, 2023.", dito: "Bell e colegas, dois mil e vinte e três." },
      ],
      telas: [{ img: "treinoAjustado", de: [0, 0], cam: [[0, 0, null, 1.05], [0, 0.3, "O que o app ajustou para hoje:", 1.3]], escurecer: 0.55 }],
      ar: [{ tipo: "ciclo", em: [0, 0.05], ate: [1, 1] }, { tipo: "fonte", em: [1, 0], ate: [1, 1], texto: "Bell et al., 2023" }],
    },
    {
      id: "ajustes",
      falas: [
        { quem: "dono", texto: "A cada ciclo, ele olha o *seu histórico*." },
        { quem: "dono", texto: "Carga parou? *Mais duas séries*." },
        { quem: "dono", texto: "Carga caiu? *Duas a menos*." },
        { quem: "dono", texto: "Evoluindo? *Não mexe*." },
      ],
      telas: [{ img: "ciclo2", de: [0, 0], cam: [[0, 0, null, 1.0], [0, 0.6, "Ciclo 2 do", 1.3], [1, 0.2, "+2 séries de Supino reto com barra", 1.5]] }],
      caixas: { "+2 séries de Supino reto com barra": { x: 46, y: 292, w: 300, h: 48 } },
      realces: [[1, 0.25, "+2 séries de Supino reto com barra", 1.6]],
      ar: [
        { tipo: "regra", em: [1, 0], ate: [3, 1], seta: "↑", cor: "#4ADE80", titulo: "+2 séries", texto: "a carga parou", pos: 0 },
        { tipo: "regra", em: [2, 0], ate: [3, 1], seta: "↓", cor: "#F97316", titulo: "−2 séries", texto: "a carga caiu", pos: 1 },
        { tipo: "regra", em: [3, 0], ate: [3, 1], seta: "✓", cor: "#60A5FA", titulo: "mantém", texto: "está evoluindo", pos: 2 },
        { tipo: "meme", em: [1, 0.4], ate: [2, 0.05], arquivo: "stonks", emoji: "📈", topo: "MEU SUPINO", base: "DEPOIS DE +2 SÉRIES" },
      ],
    },
    {
      id: "botao",
      falas: [
        { quem: "dono", texto: "Liga este botão: *Atualizar sozinho pela ciência*." },
        { quem: "dono", texto: "E todo treino mostra *o que mudou e por quê*." },
      ],
      telas: [
        { img: "botao", de: [0, 0], cam: [[0, 0, null, 1.0], [0, 0.25, "Atualizar sozinho pela ciência", 1.7]] },
        { img: "botaoLigado", de: [0, 0.7], cam: [[0, 0.7, "Atualizar sozinho pela ciência", 1.7], [0, 1, "Atualizar sozinho pela ciência", 1.8]] },
        { img: "treinoAjustado", de: [1, 0], cam: [[1, 0, null, 1.1], [1, 0.3, "O que o app ajustou para hoje:", 1.45]] },
      ],
      caixas: { "Atualizar sozinho pela ciência": { x: 50, y: 420, w: 290, h: 64 }, "chave": { x: 52, y: 438, w: 40, h: 26 }, "O que o app ajustou para hoje:": { x: 33, y: 215, w: 324, h: 120 } },
      toques: [[0, 0.6, "chave"]],
      realces: [[1, 0.3, "O que o app ajustou para hoje:", 2.4]],
      ar: [{ tipo: "selo", em: [0, 0.75], ate: [0, 1], texto: "🔁 LIGADO" }],
    },
    {
      id: "tempo",
      falas: [
        { quem: "dono", texto: "Só tem *1 hora* hoje?", dito: "Só tem uma hora hoje?" },
        { quem: "dono", texto: "Toca em *Tenho menos tempo*, escolhe *1 hora*...", dito: "Toca em Tenho menos tempo, escolhe uma hora..." },
        { quem: "dono", texto: "...e ele redesenha: *bi-set*, *descanso mais curto*, e os exercícios grandes *ficam*." },
        { quem: "jarvis", texto: "Iversen e colegas, 2021.", dito: "Iversen e colegas, dois mil e vinte e um." },
      ],
      telas: [
        { img: "hoje", de: [0, 0], cam: [[0, 0, null, 1.0], [0, 0.25, "cerca de 2 h", 1.5], [1, 0, "⏱ Tenho menos tempo hoje: ajustar ao meu tempo", 1.5]] },
        { img: "tempo", de: [1, 0.45], cam: [[1, 0.45, null, 1.05], [1, 0.6, "1 h", 1.6], [2, 0.05, "Bi-set: Supino inclinado", 1.45]] },
      ],
      caixas: { "cerca de 2 h": { x: 35, y: 168, w: 230, h: 18 } },
      toques: [[1, 0.3, "⏱ Tenho menos tempo hoje: ajustar ao meu tempo"], [1, 0.8, "1 h"]],
      realces: [[0, 0.3, "cerca de 2 h", 1.4], [2, 0.1, "Bi-set: Supino inclinado", 2.0], [2, 0.65, "Fica em ~", 1.6]],
      ar: [
        { tipo: "relogio", em: [0, 0.1], ate: [2, 0.2], de: 118, para: 58 },
        { tipo: "meme", em: [0, 0], ate: [0, 1], arquivo: "correria", emoji: "🏃💨", topo: "EU SAINDO DO TRABALHO", base: "ÀS 19H PRA TREINAR" },
        { tipo: "fonte", em: [3, 0], ate: [3, 1], texto: "Iversen et al., 2021" },
      ],
    },
    {
      id: "jarvis",
      falas: [
        { quem: "dono", texto: "E com o *Jarvis*, nem encosta no celular." },
        { quem: "dono", texto: "Jarvis, anota 80 por 10.", dito: "Jarvis, anota oitenta por dez.", fala: "pessoa" },
        { quem: "jarvis", texto: "Supino: 80 por 10. Descanso de 3 minutos.", dito: "Supino: oitenta por dez. Descanso de três minutos." },
      ],
      telas: [{ img: "tempoTreino", de: [0, 0], cam: [[0, 0, null, 1.0], [0, 0.5, "Supino reto com barra", 1.4], [1, 0, "Jarvis", 1.55], [2, 0.4, "Supino reto com barra", 1.4]] }],
      realces: [[2, 0.1, "Supino reto com barra", 2.0]],
      ar: [{ tipo: "jarvis", em: [1, 0], ate: [2, 1] }, { tipo: "onda", em: [1, 0], ate: [2, 1], alvo: "Jarvis" }],
    },
    {
      id: "apoio",
      falas: [
        { quem: "dono", texto: "O Treino Livre é *grátis*, sem mensalidade e *sem propaganda*." },
        { quem: "dono", texto: "Ajude comprando pelo *meu link* ou com um *Pix*." },
        { quem: "dono", texto: "Link na bio: *@carlos.jr.81*. E consulte um médico antes de começar.", dito: "Link na bio: arroba carlos ponto jr ponto oitenta e um. E consulte um médico antes de começar." },
      ],
      telas: [{ img: "apoio", de: [0, 0], cam: [[0, 0, null, 1.0], [1, 0.05, "Comprar pelo link", 1.45], [1, 0.6, "Doar pelo Pix", 1.45], [2, 0, null, 1.0]] }],
      toques: [[1, 0.3, "Comprar pelo link"], [1, 0.8, "Doar pelo Pix"]],
      ar: [
        { tipo: "lojas", em: [1, 0], ate: [1, 1] },
        { tipo: "fim", em: [2, 0], ate: [2, 1] },
        { tipo: "meme", em: [0, 0.15], ate: [0, 1], arquivo: "obrigado", emoji: "🙏", topo: "SEM MENSALIDADE", base: "E SEM PROPAGANDA" },
      ],
    },
  ],
};
