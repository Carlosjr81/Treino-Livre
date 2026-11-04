/* Treino Livre em inglês (en-US). Só é baixado por quem escolheu inglês em
   Ajustes › Idioma: quem usa em português não paga nada por ele.

   Como funciona: o app continua escrito em português, e este arquivo troca o
   texto que aparece na tela, nó por nó, por um dicionário (TEXTOS_EN), por
   moldes para os textos com número (MOLDES_EN) e pelo nome em inglês de cada
   exercício (o campo `en` do catálogo). Um MutationObserver traduz o que o
   React desenha na hora em que desenha, antes de a tela ser pintada.

   O que NÃO é traduzido, de propósito: o que a pessoa escreveu (nomes de
   fichas, observações), o texto jurídico dos Termos (vale o português, e a
   tela diz isso) e a voz do Jarvis (fala e ouve em português).
   Texto sem tradução continua em português: nunca vira meia frase. */
var TEXTOS_EN = {
  // --- Termos (os cartões e as caixas; o texto jurídico fica em português) ---
  "Grátis, com acesso liberado": "Free, with approved access",
  "O app é gratuito. A conta precisa da liberação do criador do app, que pode pôr prazo ou bloquear quem descumprir estas regras. Se um dia houver plano pago, você é avisado antes, e nada é cobrado sem o seu aceite.": "The app is free. Your account needs to be approved by the app's creator, who may set a time limit or block anyone who breaks these rules. If a paid plan ever exists, you will be told first, and nothing is charged without your consent.",
  "Saúde em primeiro lugar": "Health comes first",
  "Antes de usar, você responde 7 perguntas de saúde. Consulte um médico antes de começar ou mudar o seu treino. Sentiu dor no peito, tontura ou falta de ar, pare na hora e ligue 192.": "Before using the app, you answer 7 health questions. See a doctor before starting or changing your workouts. If you feel chest pain, dizziness or shortness of breath, stop right away and call emergency services (192 in Brazil).",
  "Uma ferramenta, não um profissional": "A tool, not a professional",
  "O app registra e organiza o seu treino. As sugestões são automáticas, feitas com auxílio de IA a partir de estudos: informação educativa, não prescrição. Não substituem o médico nem o profissional de Educação Física.": "The app records and organizes your workouts. Suggestions are automatic, made with the help of AI based on studies: educational information, not a prescription. They do not replace a doctor or a fitness professional.",
  "Os seus treinos são seus": "Your workouts are yours",
  "Eles ficam no seu celular, não num servidor. Faça backup: se o aparelho se perder, o app não tem como recuperar.": "They stay on your phone, not on a server. Make backups: if the phone is lost, the app has no way to recover them.",
  "Atenção na rua e na esteira": "Stay alert outdoors and on the treadmill",
  "Na rua, o trânsito vem antes do app. Na esteira conectada, você define a velocidade máxima, e o botão de parar da máquina é sempre seu.": "Outdoors, traffic comes before the app. On a connected treadmill, you set the top speed, and the machine's stop button is always yours.",
  "Respeito": "Respect",
  "Nada de conta falsa, apelido ofensivo ou usar os desafios para incomodar alguém.": "No fake accounts, offensive nicknames or using challenges to bother anyone.",
  "O app tem dono": "The app has an owner",
  "Usar é livre. Copiar, revender ou tentar burlar a liberação, não.": "Using it is free. Copying, reselling or trying to bypass the approval is not.",
  "Termos novos, aceite novo": "New terms, new consent",
  "Se estas regras mudarem, o app mostra a versão nova e pede o seu aceite outra vez.": "If these rules change, the app shows the new version and asks for your consent again.",
  "Li e aceito os Termos de Uso e a Política de Privacidade, e tenho 18 anos ou mais.": "I have read and accept the Terms of Use and the Privacy Policy, and I am 18 or older.",
  "Entendo que o app é uma ferramenta de registro e informação, que não oferece atendimento de médico nem de profissional de Educação Física, que as sugestões não substituem esses profissionais, e vou consultar um médico antes de começar ou mudar o meu treino.": "I understand that the app is a tool for recording and information, that it does not offer the services of a doctor or a fitness professional, that its suggestions do not replace these professionals, and that I will see a doctor before starting or changing my workouts.",
  "Termos de Uso": "Terms of Use",
  "Política de Privacidade": "Privacy Policy",

  // --- O questionário de saúde (PAR-Q) ---
  "Algum médico já disse que você tem um problema no coração e que só deve fazer atividade física recomendada por um médico?": "Has a doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
  "Você sente dor no peito quando faz atividade física?": "Do you feel pain in your chest when you do physical activity?",
  "No último mês, você sentiu dor no peito sem estar fazendo atividade física?": "In the past month, have you had chest pain when you were not doing physical activity?",
  "Você já perdeu o equilíbrio por causa de tontura, ou já desmaiou?": "Do you lose your balance because of dizziness, or have you ever lost consciousness?",
  "Você tem algum problema nos ossos ou nas articulações (coluna, joelho, quadril, ombro) que poderia piorar com a atividade física?": "Do you have a bone or joint problem (back, knee, hip, shoulder) that could be made worse by physical activity?",
  "Algum médico receita remédio para a sua pressão ou para o seu coração?": "Is a doctor currently prescribing medication for your blood pressure or heart condition?",
  "Você está grávida, teve parto ou cirurgia recente, ou sabe de qualquer outro motivo pelo qual não deveria fazer atividade física?": "Are you pregnant, have you recently given birth or had surgery, or do you know of any other reason why you should not do physical activity?",
  "Baseado no PAR-Q (Questionário de Prontidão para Atividade Física), usado no mundo todo como triagem antes de começar a se exercitar. Não é um exame nem um diagnóstico.": "Based on the PAR-Q (Physical Activity Readiness Questionnaire), used worldwide as a screening before starting to exercise. It is not a medical exam or a diagnosis.",
  "Converse com um médico antes de começar ou aumentar a atividade física, e leve a ele as perguntas que tiveram sim. Até lá, prefira atividades leves, como caminhar, e pare se sentir qualquer desconforto.": "Talk to a doctor before starting or increasing physical activity, and bring the questions you answered yes. Until then, prefer light activities such as walking, and stop if you feel any discomfort.",
  "Você pode começar a se exercitar, de forma gradual: comece leve e aumente aos poucos. Mesmo assim, consultar um médico antes é sempre o mais seguro. Se a sua saúde mudar, refaça este questionário.": "You can start exercising gradually: start light and increase little by little. Even so, seeing a doctor first is always the safest choice. If your health changes, take this questionnaire again.",
  "Respondi com sinceridade e não tive nenhuma resposta sim. Se a minha saúde mudar, vou refazer o questionário e procurar um médico.": "I answered honestly and had no yes answers. If my health changes, I will take the questionnaire again and see a doctor.",
  "Tive alguma resposta sim e já tenho a liberação do meu médico para fazer atividade física.": "I had a yes answer and my doctor has already cleared me for physical activity.",
  "Tive alguma resposta sim e vou consultar um médico antes de começar ou mudar o meu treino. Se eu treinar antes disso, é por minha conta e risco.": "I had a yes answer and I will see a doctor before starting or changing my workouts. If I train before that, it is at my own risk.",
  "Sim": "Yes",
  "Não": "No",

  // --- O socorro ---
  "Pare o exercício agora.": "Stop exercising now.",
  "Sente-se ou deite-se num lugar seguro e chame alguém que esteja por perto.": "Sit or lie down somewhere safe and call someone nearby.",
  "Dor ou aperto no peito, falta de ar forte, desmaio, fala enrolada ou fraqueza de um lado do corpo: ligue já para o SAMU, no 192.": "Chest pain or tightness, severe shortness of breath, fainting, slurred speech or weakness on one side of the body: call emergency services now (SAMU, 192 in Brazil; 911 in the US).",
  "Tontura ou mal-estar que não passa em poucos minutos: procure atendimento médico.": "Dizziness or feeling unwell that does not pass in a few minutes: get medical care.",
  "Não volte a treinar hoje sem falar com um médico.": "Do not train again today without talking to a doctor.",

  // --- O aviso de saúde ---
  "Sugestão automática e educativa, feita com auxílio de inteligência artificial a partir de estudos científicos. Não é prescrição de treino nem substitui o médico ou o profissional de Educação Física. Consulte um médico antes de começar ou mudar o seu treino.": "Automatic, educational suggestion, made with the help of artificial intelligence based on scientific studies. It is not a workout prescription and does not replace a doctor or a fitness professional. See a doctor before starting or changing your workouts.",
  "As análises, sugestões, ajustes e treinos prontos deste app são gerados automaticamente, com o auxílio de inteligência artificial, a partir de estudos científicos publicados sobre treinamento físico. As correções da câmera e os números de esforço, ritmo e calorias são estimativas.": "The analyses, suggestions, adjustments and ready-made workouts in this app are generated automatically, with the help of artificial intelligence, based on published scientific studies on physical training. The camera's corrections and the effort, pace and calorie numbers are estimates.",
  "São informações gerais e educativas. Não são prescrição de exercício, não substituem a consulta médica nem o acompanhamento de um profissional de Educação Física, e não levam em conta a sua saúde, as suas lesões, os seus remédios ou as suas limitações.": "This is general, educational information. It is not an exercise prescription, it does not replace a medical consultation or the guidance of a fitness professional, and it does not take into account your health, injuries, medication or limitations.",
  "Antes de começar ou mudar os seus treinos, consulte um médico. Se puder, treine com a orientação de um profissional de Educação Física.": "Before starting or changing your workouts, see a doctor. If you can, train with the guidance of a fitness professional.",
  "Pare na hora e procure ajuda se sentir dor no peito, dor forte, tontura, falta de ar ou mal-estar. Quem decide se e como treinar é você, sob a sua responsabilidade.": "Stop right away and get help if you feel chest pain, severe pain, dizziness, shortness of breath or feeling unwell. You decide whether and how to train, under your own responsibility.",

  // --- Músculos ---
  "Peitoral": "Chest", "Deltoides (ombros)": "Deltoids (shoulders)", "Antebraços": "Forearms", "Oblíquos": "Obliques", "Dorsais": "Lats",
  "Trapézio": "Traps", "Lombar": "Lower back", "Quadríceps": "Quads", "Posteriores de coxa": "Hamstrings", "Adutores": "Adductors", "Panturrilhas": "Calves",
  "Peito": "Chest", "Costas": "Back", "Pernas": "Legs", "Ombros": "Shoulders", "Bíceps": "Biceps", "Tríceps": "Triceps", "Abdômen": "Abs", "Glúteos": "Glutes",
  "Panturrilha": "Calves", "Antebraço": "Forearm", "Aeróbico": "Cardio", "Funcional": "Functional", "Mini band": "Mini band", "Corpo todo": "Full body",
  // --- Navegação e cabeçalho ---
  "Início": "Home", "Exercícios": "Exercises", "Fichas": "Workouts", "Histórico": "History", "Ajustes": "Settings",
  "Abrir a ajuda e as dicas": "Open help and tips", "Ajuda e dicas": "Help and tips", "Mudar para o tema claro": "Switch to light theme",
  "Mudar para tema claro": "Switch to light theme", "Mudar para o tema escuro": "Switch to dark theme", "Mudar para tema escuro": "Switch to dark theme",
  "Abrir os ajustes": "Open settings", "Navegação principal": "Main navigation", "arraste p/ mover": "drag to move",
  "O que posso dizer ao Jarvis": "What I can say to Jarvis", "Comandos de voz": "Voice commands",
  "Ligar o Jarvis (comandos por voz)": "Turn on Jarvis (voice commands)", "Ligar o Jarvis. Arraste para mover.": "Turn on Jarvis. Drag to move.",
  "Voltar": "Back", "Fechar": "Close", "Cancelar": "Cancel", "Salvar": "Save", "Confirmar": "Confirm", "Excluir": "Delete", "Editar": "Edit",
  "Renomear": "Rename", "Duplicar": "Duplicate", "Enviar": "Send", "Pronto": "Ready", "Agora não": "Not now", "Continuar": "Continue", "Entendi": "Got it",
  "OK": "OK", "Ok": "OK", "Sair": "Exit", "Mostrar": "Show", "Esconder": "Hide", "Buscar": "Search", "Carregando…": "Loading…", "Carregando...": "Loading...",
  "Abrindo o Treino Livre…": "Opening Treino Livre…", "Abrindo o Treino Livre...": "Opening Treino Livre...",

  // --- Tela inicial ---
  "⚠ Faça um backup": "⚠ Make a backup",
  "Seu treino de hoje": "Today's workout", "Começar este treino": "Start this workout",
  "Um treino de iniciante, pronto para usar. Quer outro objetivo ou mais dias?": "A beginner workout, ready to use. Want a different goal or more days?",
  "Monte o seu": "Build your own", "— são 3 perguntas.": "— it's 3 questions.", "Escolher outra ficha": "Choose another workout",
  "Primeira vez por aqui": "First time here", "Anotar o treino sem parar o treino": "Log your workout without stopping your workout",
  "Dite em vez de digitar.": "Speak instead of typing.", "“Jarvis, anote 80 por 10” e a série está registrada.": "“Jarvis, anote 80 por 10” (Portuguese voice commands) and the set is logged.",
  "Ou deixe a câmera contar.": "Or let the camera count.", "Ela conta em voz alta, corrige a forma e registra sozinha.": "It counts out loud, corrects your form and logs the set by itself.",
  "Funciona sem internet.": "Works offline.", "Os seus treinos ficam no seu aparelho. Sem anúncio.": "Your workouts stay on your device. No ads.",
  "Ficou com dúvida?": "Have a question?", "O ? no topo de qualquer tela tem o passo a passo de tudo e o que fazer quando algo não funciona.": "The ? at the top of any screen has step-by-step help for everything and what to do when something doesn't work.",
  "O treino de hoje já está escolhido logo acima — é só tocar em Começar.": "Today's workout is already chosen above — just tap Start.",
  "Prefiro um treino montado para mim": "I'd rather have a workout built for me", "Quero testar os comandos de voz antes": "I want to try the voice commands first",
  "Ver o guia rápido do app": "See the app's quick guide", "Instalar na tela inicial": "Install on the home screen",
  "Abre em tela cheia, direto do ícone, e funciona na academia mesmo sem internet. Seus treinos também ficam mais seguros do que numa aba perdida.": "Opens full screen, straight from the icon, and works at the gym even without internet. Your workouts are also safer than in a lost browser tab.",
  "Baixar o app": "Get the app", "Outros jeitos de treinar": "Other ways to train", "Montar pra mim": "Build it for me", "responda 3 perguntas": "answer 3 questions",
  "Treino livre": "Free workout", "escolha na hora": "choose on the spot", "Funcional": "Functional", "em casa, a câmera conta": "at home, the camera counts",
  "Em casa com mini band": "At home with a mini band", "corpo todo, a câmera conta": "full body, the camera counts", "Corrida na rua": "Outdoor run",
  "GPS, mapa e ritmo": "GPS, map and pace", "Esteira e aparelhos": "Treadmill and machines", "esteira, bike, elíptico, remo": "treadmill, bike, elliptical, rower",
  "Intervalado": "Intervals", "o ritmo que varia": "pace that varies", "Desafio": "Challenge", "corra contra amigos": "race your friends",
  "fuja dos monstros correndo": "run away from monsters",
  "Depois do primeiro treino, aparecem aqui seu nível, sua sequência e o que já dá para treinar hoje. Tudo fica guardado só no seu aparelho.": "After your first workout, your level, your streak and what you can train today show up here. Everything is stored only on your device.",
  "O que treinar hoje": "What to train today", "Quanto tempo faz desde a última vez que você treinou cada grupo.": "How long it has been since you last trained each muscle group.",
  "nunca treinado": "never trained", "hoje": "today", "ontem": "yesterday", "Descansando": "Resting",
  "Quem faz este app": "Who makes this app",
  "O Treino Livre é feito por uma pessoa só, de graça, sem anúncio e sem vender seus dados: os seus treinos ficam no seu celular. Se ele está te ajudando, seguir lá é o que dá motivo para continuar.": "Treino Livre is made by a single person, for free, with no ads and without selling your data: your workouts stay on your phone. If it's helping you, following there is what keeps it going.",
  "Seguir @": "Follow @", "no Instagram": "on Instagram", "Nível": "Level", "dias": "days", "ver progresso": "see progress", "Último treino": "Last workout",
  "min": "min", "de volume": "volume", "séries": "sets", "treinos": "workouts", "pontos": "points",
  "Você já tem 10 treinos registrados e nenhum backup. Se limpar os dados do navegador ou trocar de celular, tudo isso se perde.": "You already have 10 workouts logged and no backup. If you clear the browser data or switch phones, all of it is lost.",
  "Baixar backup agora": "Download backup now",
  "Ver seu progresso.": "See your progress.", "treinos nesta semana": "workouts this week",

  // --- Níveis ---
  "Iniciante": "Beginner", "Frequentador": "Regular", "Ritmo firme": "Steady pace",

  // --- Ajuda ---
  "Como usar cada parte do app, os atalhos e o que fazer quando algo não funciona.": "How to use each part of the app, the shortcuts and what to do when something doesn't work.",
  "Você sabia?": "Did you know?", "Outra dica": "Another tip",
  "Cada exercício descansa o tempo que os estudos indicam: 3 minutos no agachamento, 1 minuto e 15 na rosca. Está em Ajustes → Preferências.": "Each exercise rests as long as studies recommend: 3 minutes on squats, 1 minute 15 on curls. It's in Settings → Preferences.",
  "Primeiros passos": "Getting started", "No treino": "During the workout", "Fichas e exercícios": "Workouts and exercises", "Jarvis (voz)": "Jarvis (voice)",
  "Câmera conta": "Camera counting", "Esteira, rua e aparelhos": "Treadmill, outdoors and machines", "Evolução e saúde": "Progress and health",
  "Conta e dados": "Account and data", "Resolver problemas": "Troubleshooting", "Fazer o primeiro treino": "Do your first workout",
  "Três toques: começar, anotar a série, finalizar.": "Three taps: start, log the set, finish.", "Montar um treino pra mim": "Build a workout for me",
  "Responda 3 perguntas e o app monta as fichas.": "Answer 3 questions and the app builds the workouts.", "Os jeitos de treinar": "Ways to train",
  "Academia, em casa, rua, esteira, desafio com amigos e até fuga de monstros.": "Gym, home, outdoors, treadmill, challenges with friends and even escaping monsters.",
  "Instalar o app no celular": "Install the app on your phone", "Abre pelo ícone, em tela cheia e sem internet.": "Opens from the icon, full screen and offline.",
  "Atalhos e gestos escondidos": "Hidden shortcuts and gestures", "Conectar aparelhos": "Connect devices", "Escola do Jarvis": "Jarvis school",
  "Não achou? Fale com o criador no Instagram": "Didn't find it? Talk to the creator on Instagram", "Conte a versão do app:": "Mention the app version:",
  "Conte a versão do app": "Mention the app version", "Fechar a ajuda": "Close help", "Buscar: backup, câmera, música…": "Search: backup, camera, music…", "Buscar na ajuda": "Search help",

  // --- Ajustes ---
  "Conta": "Account", "Preferências": "Preferences", "Jarvis": "Jarvis", "Aparelhos": "Devices", "Backup": "Backup", "Este app": "This app", "Termos": "Terms",
  "Sua conta": "Your account", "Trocar minha senha": "Change my password", "Sair da conta": "Sign out", "Apagar minha conta": "Delete my account",
  "Idioma": "Language", "Tema": "Theme", "Escuro": "Dark", "Claro": "Light", "Som do cronômetro": "Timer sound", "Ligado": "On", "Desligado": "Off",
  "Descanso entre as séries": "Rest between sets", "Pela ciência": "By science", "cada exercício com o seu": "each exercise has its own",
  "Igual para todos": "Same for all", "um tempo só": "a single time", "Básicos pesados com barra": "Heavy barbell compound lifts",
  "vários músculos": "multiple muscles", "isolados grandes": "large isolation", "braço e panturrilha": "arms and calves", "abdômen e prancha": "abs and plank",
  "funcional": "functional", "O descanso que você escrever numa ficha vale mais.": "A rest time you write in a workout takes priority.",
  "Ver cada tipo e os estudos": "See each type and the studies", "Meta semanal": "Weekly goal", "Jarvis — comandos por voz": "Jarvis — voice commands",
  "Diga": "Say", "“Jarvis, anote 80 por 10”": "“Jarvis, anote 80 por 10”",
  "e ele preenche a série, marca o ✓ e começa o descanso. Treino inteiro sem tocar no celular.": "and it fills in the set, ticks the ✓ and starts the rest. A whole workout without touching your phone (voice commands are in Portuguese).",
  "Ligar o Jarvis agora": "Turn on Jarvis now", "Ajustes da voz (como ouve, voz, velocidade, barra)": "Voice settings (listening, voice, speed, bar)",
  "Lembrete de treino": "Workout reminder", "Um empurrão nos dias que você escolher.": "A nudge on the days you choose.",
  "O passo a passo do app Android, relógio e anel, cinta, esteira, óculos Ray-Ban Meta e fone.": "Step by step for the Android app, watch and ring, chest strap, treadmill, Ray-Ban Meta glasses and headphones.",
  "Ver o passo a passo": "See the step by step", "Abre em tela cheia, direto do ícone, e funciona sem internet.": "Opens full screen, straight from the icon, and works offline.",
  "Seus dados (backup)": "Your data (backup)", "Seus treinos ficam salvos": "Your workouts are saved", "somente neste aparelho": "only on this device",
  ". Limpar os dados do site, trocar de celular ou desinstalar sem backup apaga tudo — e não há como recuperar.": ". Clearing site data, switching phones or uninstalling without a backup erases everything — and there's no way to recover it.",
  "Baixar backup (arquivo)": "Download backup (file)", "Restaurar de arquivo": "Restore from file", "Copiar texto": "Copy text", "Colar texto de backup": "Paste backup text",
  "Você ainda não fez nenhum backup.": "You haven't made a backup yet.", "Guarde o arquivo no Google Drive, no e-mail ou numa conversa sua no WhatsApp.": "Keep the file in Google Drive, in your e-mail or in one of your WhatsApp chats.",
  "Vim de outro app": "I came from another app", "Já treinava com o": "Already trained with", "ou o": "or",
  "? Exporte o CSV lá e traga para cá. Recorde, evolução e sugestão de carga saem do histórico — sem ele, o app começa do zero com quem já tem anos de treino.": "? Export the CSV there and bring it here. Records, progress and load suggestions come from your history — without it, the app starts from zero for someone with years of training.",
  "Escolher o arquivo CSV": "Choose the CSV file",
  "No Strong: Perfil → ⚙ → Export Workouts. No Hevy: Perfil → ⚙ → Export & Import Data. No FitNotes: Menu → Export → CSV. O arquivo é lido aqui no aparelho e não sai dele.": "In Strong: Profile → ⚙ → Export Workouts. In Hevy: Profile → ⚙ → Export & Import Data. In FitNotes: Menu → Export → CSV. The file is read here on the device and never leaves it.",
  "treinos feitos": "workouts done", "Versão": "Version", "Buscar atualização": "Check for updates",
  "Limpa o que ficou guardado no aparelho e recarrega. Seus treinos não são afetados.": "Clears what is cached on the device and reloads. Your workouts are not affected.",
  "O que este aparelho suporta": "What this device supports", "Aviso de saúde.": "Health notice.", "Ler os Termos de Uso": "Read the Terms of Use",
  "Questionário de saúde (PAR-Q):": "Health questionnaire (PAR-Q):", "Vale por 12 meses. A sua saúde mudou? Refaça.": "Valid for 12 months. Has your health changed? Take it again.",
  "Refazer o questionário de saúde": "Retake the health questionnaire", "Créditos": "Credits", "App desenvolvido por Carlos Jr": "App developed by Carlos Jr",
  "Instagram:": "Instagram:", "Imagens de demonstração dos exercícios: banco de dados aberto": "Exercise demonstration images: open database",
  "e sua comunidade de colaboradores, sob a licença": "and its community of contributors, under the license",
  ". Textos, dicas e mapa muscular: conteúdo original do app.": ". Texts, tips and muscle map: original app content.",
  "© 2026 Carlos Jr. Todos os direitos reservados. O app é gratuito para usar; o código, os textos, as histórias e a marca Treino Livre não podem ser copiados nem usados em outro app sem autorização.": "© 2026 Carlos Jr. All rights reserved. The app is free to use; the code, texts, stories and the Treino Livre brand may not be copied or used in another app without permission.",
  "Desligar o som": "Turn off sound", "Ligar o som": "Turn on sound", "Diminuir a meta semanal": "Lower the weekly goal", "Aumentar a meta semanal": "Raise the weekly goal",
  "Ligar o lembrete": "Turn on reminder", "Desligar o lembrete": "Turn off reminder",

  // --- Exercícios ---
  "Filtrar por equipamento": "Filter by equipment",
  "Toque no que você tem disponível. Serve para treinar em casa ou quando o aparelho está ocupado.": "Tap what you have available. Useful for training at home or when a machine is taken.",
  "Peso corporal": "Bodyweight", "exerc.": "ex.", "Halteres": "Dumbbells", "Barra": "Barbell", "Máquina": "Machine", "Polia e cabo": "Cable and pulley",
  "Kettlebell e elástico": "Kettlebell and band", "Mini band": "Mini band", "Aeróbico": "Cardio", "+ Criar exercício próprio": "+ Create your own exercise",
  "Buscar: nome, músculo ou aparelho...": "Search: name, muscle or machine...", "Buscar exercício por nome ou equipamento": "Search exercise by name or equipment",
  "Halter": "Dumbbell", "Polia": "Cable", "Smith": "Smith machine", "Elástico": "Band", "Esteira": "Treadmill", "Bicicleta": "Bike", "Banco": "Bench",
  "Barra fixa": "Pull-up bar", "Barra W": "EZ bar", "Kettlebell": "Kettlebell", "Anilha": "Plate", "Caneleira": "Ankle weight", "Paralelas": "Parallel bars",
  "Como fazer": "How to do it", "Dica": "Tip", "Músculos": "Muscles", "Principal": "Main", "Ajudam": "Assisting", "Ver vídeo no YouTube": "Watch on YouTube",
  "Minha evolução": "My progress", "Adicionar à ficha": "Add to workout",

  // --- Fichas ---
  "Meus treinos": "My programs", "Novo treino": "New program", "Montar treino pra mim (assistente)": "Build a program for me (assistant)",
  "Treino livre (montar na hora)": "Free workout (build on the spot)", "Em uso: é dele o treino de hoje": "In use: today's workout comes from here",
  "Treino Avançado": "Advanced program", "Treino Avançado ajustado": "Advanced program (adjusted)", "Treino para iniciantes": "Beginner program", "Iniciante": "Beginner",
  "Abrir fichas": "Open workouts", "Nenhuma ficha ainda: abra e toque em + Nova ficha.": "No workouts yet: open it and tap + New workout.",
  "+ Nova ficha": "+ New workout", "Nova ficha": "New workout", "Treinar": "Train", "Ordem": "Order", "Levar para outro treino": "Move to another program",
  "Mudar a ordem": "Change the order", "Copiar": "Copy", "Salvar ficha": "Save workout", "Nome da ficha": "Workout name",
  "Pernas e Costas": "Legs & Back", "Peito e Tríceps": "Chest & Triceps", "Pernas e Bíceps": "Legs & Biceps", "Pernas e Ombros": "Legs & Shoulders",
  "Bíceps e Tríceps": "Biceps & Triceps", "Peito e Ombros": "Chest & Shoulders", "Costas e Bíceps": "Back & Biceps", "Corpo inteiro": "Full body",
  "Superiores": "Upper body", "Inferiores": "Lower body",

  // --- Histórico ---
  "Treinos": "Workouts", "Números": "Stats", "Corpo": "Body", "Saúde": "Health",
  "Nova medição": "New measurement",
  "Preencha só o que quiser acompanhar. Medidas de fita em centímetros, sempre no mesmo ponto e de manhã, para comparar direito.": "Fill in only what you want to track. Tape measurements in centimeters, always at the same spot and in the morning, to compare properly.",
  "Data": "Date", "Já vinha medindo antes de usar o app? Escolha o dia e registre as pesagens antigas: o gráfico se ajusta.": "Were you measuring before using the app? Choose the day and log the old weigh-ins: the chart adjusts.",
  "Peso": "Weight", "Cintura": "Waist", "Braço": "Arm", "Coxa": "Thigh", "Quadril": "Hips", "Registrar medição de hoje": "Log today's measurement",
  "Registrar medição": "Log measurement", "Fotos de progresso": "Progress photos",
  "Sempre no mesmo lugar, na mesma luz e de manhã. É o registro que mostra mudança quando a balança não mostra. As fotos ficam neste aparelho e entram no backup em arquivo.": "Always in the same place, the same light and in the morning. It's the record that shows change when the scale doesn't. Photos stay on this device and go into the file backup.",
  "Adicionar foto de hoje": "Add today's photo",
  "Registre seu peso e suas medidas de tempo em tempo para ver a evolução ao lado do que você levanta.": "Log your weight and measurements from time to time to see your progress next to what you lift.",
  "Data da medição": "Measurement date", "Peso em kg": "Weight in kg", "Cintura em cm": "Waist in cm", "Peito em cm": "Chest in cm", "Braço em cm": "Arm in cm",
  "Coxa em cm": "Thigh in cm", "Quadril em cm": "Hips in cm",
  "Você ganha pontos treinando, movendo peso, mantendo a sequência e batendo recordes.": "You earn points by training, moving weight, keeping your streak and breaking records.",
  "Meta da semana": "This week's goal", "meta:": "goal:", "por semana": "per week", "Conquistas": "Achievements", "Primeiro treino": "First workout",
  "4 semanas ativas": "4 active weeks", "1 tonelada": "1 ton", "10 toneladas": "10 tons", "60 kg numa série": "60 kg in one set", "Fim de semana": "Weekend",
  "Ver todas as 33 conquistas": "See all 33 achievements", "Story": "Story", "Desafio entre amigos": "Challenge with friends",
  "Painel do corredor: pace, recordes, VO2máx e previsão de prova": "Runner dashboard: pace, records, VO2max and race prediction",
  "Quanto cada músculo trabalhou": "How much each muscle worked",
  "Quantas séries cada músculo recebeu por semana. O ideal para crescer é de": "How many sets each muscle got per week. The ideal range for growth is",
  ". Conta também o músculo que só ajuda: no supino, o peito recebe 1 série e o tríceps e o ombro recebem meia cada.": ". It also counts the muscles that only assist: on the bench press, the chest gets 1 set and the triceps and shoulders get half each.",
  "De onde vem essa conta?": "Where does this number come from?", "Esta semana": "This week", "Média de 4 semanas": "4-week average",
  "O que olhar na sua divisão": "What to look at in your split", "abaixo da faixa": "below the range", "acima da faixa": "above the range", "na faixa": "in range",
  "Mostrar todos os 15 músculos": "Show all 15 muscles",
  "Parte cheia da barra: o exercício treina aquele músculo. Parte listrada: o músculo só ajudou. A faixa verde clara é o ideal (": "Solid part of the bar: the exercise trains that muscle. Striped part: the muscle only assisted. The light green band is the ideal (",
  "). Aquecimento e drop não contam. É um guia, não uma regra: vale a média das semanas e como você se sente.": "). Warm-ups and drops don't count. It's a guide, not a rule: what matters is the weekly average and how you feel.",
  "Seu treino está equilibrado?": "Is your training balanced?", "Você está na semana": "You are in week", "de": "of",
  "Semana normal: as séries da ficha. Pare quando ainda daria para fazer umas 2 repetições.": "Normal week: the sets in the workout. Stop when you could still do about 2 more reps.",
  "Não precisa criar outro toda semana.": "No need to create another one every week.",
  "Ouvir a análise e o ajuste": "Listen to the analysis and adjustment (Portuguese)", "Ouvir por que muda (o estudo)": "Listen to why it changes (Portuguese)",
  "Ver a análise das últimas semanas": "See the analysis of recent weeks", "Ler o aviso completo": "Read the full notice",
  "Séries desta semana por grupo (só as diretas)": "This week's sets per group (direct only)",
  "Contadas pelo grupo do exercício, sem o indireto. A conta por músculo, acima, é a mais completa.": "Counted by the exercise's group, without indirect work. The per-muscle count above is more complete.",
  "não treinou": "not trained", "A zona verde clara marca a faixa recomendada. Séries de aquecimento não entram na conta.": "The light green zone marks the recommended range. Warm-up sets are not counted.",
  "Seus números": "Your stats", "Horas": "Hours", "Séries": "Sets", "Repetições": "Reps", "Volume total": "Total volume", "Sequência": "Streak",
  "Média/semana": "Average/week", "Você já moveu": "You have moved", "Tonelagem por semana": "Tonnage per week", "Últimas 8 semanas · média de": "Last 8 weeks · average of",
  "Músculos": "Muscles", "Volume": "Volume", "Esquecidos": "Forgotten", "7 dias": "7 days", "30 dias": "30 days", "Sempre": "All time",
  "Os últimos 12 meses": "The last 12 months", "de treino": "of training", "menos": "less", "mais": "more", "Evolução do treino": "Workout progress",
  "Carga máx.": "Max load", "1RM estim.": "Est. 1RM", "início": "start", "último": "latest", "recorde": "record", "indireto": "indirect", "sem treino": "no workout",
  "Mês anterior": "Previous month", "Mês seguinte": "Next month",
  "Conclua seu primeiro treino": "Complete your first workout", "Conclua 5 treinos": "Complete 5 workouts", "Conclua 10 treinos": "Complete 10 workouts",
  "Treine em 4 semanas diferentes": "Train in 4 different weeks", "Mova 1.000 kg no total": "Move 1,000 kg in total", "Mova 10.000 kg no total": "Move 10,000 kg in total",
  "Levante 60 kg em uma série": "Lift 60 kg in one set", "Treine num sábado ou domingo": "Train on a Saturday or Sunday",
  "Neste aparelho": "On this device",
  "Passos, sono e os dados do relógio ficam no celular. No Android, o app do Treino Livre lê o Health Connect (Samsung Health, Google Fit, relógios e anéis) e mostra tudo aqui.": "Steps, sleep and watch data stay on the phone. On Android, the Treino Livre app reads Health Connect (Samsung Health, Google Fit, watches and rings) and shows everything here.",
  "Batimento ao vivo": "Live heart rate", "Conectar cinta ou relógio": "Connect chest strap or watch",
  "Este navegador não fala Bluetooth (o iPhone não deixa). No Chrome do Android ou do computador, a cinta e os relógios que transmitem o batimento conectam aqui.": "This browser doesn't support Bluetooth (the iPhone doesn't allow it). In Chrome on Android or a computer, chest straps and watches that broadcast heart rate connect here.",
  "Como ligar a cinta ou o relógio": "How to connect the strap or watch", "Do Treino Livre": "From Treino Livre", "em 7 dias": "in 7 days",
  "volume": "volume", "reps": "reps", "distância": "distance", "kcal": "kcal", "carga máx.": "max load", "densidade": "density",
  "de volume vs. treino anterior": "volume vs. previous workout", "Resumo animado": "Animated summary", "Ver séries de cada exercício": "See each exercise's sets",
  "Desafiar amigos:": "Challenge friends:", "em": "in", "Corrigir": "Edit", "Virar ficha": "Make it a workout",
  "Excluir este treino do histórico": "Delete this workout from history",

  // --- O treino ---
  "Treino": "Workout", "Voltar (o treino continua salvo)": "Back (the workout stays saved)", "Treinando agora": "Training now",
  "Como anotar o seu treino": "How to log your workout",
  "Digite o peso que você vai usar. As repetições já vêm sugeridas — mude se quiser.": "Type the weight you'll use. Reps are already suggested — change them if you want.",
  "Fez a série? Toque no ✓. O descanso começa sozinho e avisa quando acabar.": "Done with the set? Tap the ✓. The rest timer starts by itself and tells you when it ends.",
  "Terminou tudo? Toque em Finalizar treino, lá no fim da lista.": "All done? Tap Finish workout, at the end of the list.",
  "Não sabe fazer um exercício? Toque em": "Don't know how to do an exercise? Tap", "ver execução": "see how", "embaixo do nome. Aparelho ocupado? O": "under its name. Machine taken? The",
  "troca por outro parecido.": "swaps it for a similar one.", "Descanso entre séries": "Rest between sets",
  "Pela ciência: cada exercício com o seu tempo (3:00 nos básicos pesados, 1:15 na rosca). Mude no ⏱ de cada um.": "By science: each exercise with its own time (3:00 on heavy compound lifts, 1:15 on curls). Change it with each one's ⏱.",
  "Mudar a ordem dos exercícios": "Change the exercise order", "Contar pela câmera (Eyes Scan)": "Count with the camera (Eyes Scan)",
  "descanso": "rest", "(recomendado)": "(recommended)", "Peso (kg)": "Weight (kg)", "Reps": "Reps", "+ Adicionar série": "+ Add set", "Drop": "Drop",
  "abrir": "open", "fechar": "close", "+ Adicionar exercício": "+ Add exercise", "Finalizar treino": "Finish workout", "Passando mal? Toque aqui": "Feeling unwell? Tap here",
  "Descartar": "Discard", "Progresso do treino": "Workout progress", "Desligar o som do cronômetro": "Turn off timer sound", "Desligar som": "Sound off",
  "Ligar o som do cronômetro": "Turn on timer sound", "Ligar som": "Sound on", "Trocar por outro exercício": "Swap for another exercise",
  "Remover este exercício do treino": "Remove this exercise from the workout", "Marcar como aquecimento": "Mark as warm-up",
  "Drop set: sem descanso, uns 20% a menos de peso": "Drop set: no rest, about 20% less weight", "Remover a última série": "Remove the last set",
  "Obs.: altura do banco, altura da polia, pegada...": "Notes: bench height, pulley height, grip...", "feito": "done", "Minutos": "Minutes", "Segundos": "Seconds",
  "Velocidade": "Speed", "Inclinação": "Incline", "Descanso": "Rest", "Pular": "Skip", "Pular descanso": "Skip rest", "aquecimento": "warm-up",
  "Finalizar": "Finish", "Continuar treinando": "Keep training", "Treino concluído!": "Workout complete!", "Treino concluído": "Workout complete",
  "Recorde!": "Record!", "Novo recorde!": "New record!", "Ver resumo animado": "See animated summary", "Compartilhar no story": "Share to story",
  "Reabrir treino": "Reopen workout", "Salvar na ficha": "Save to workout", "Só hoje": "Just today", "Salvar como ficha": "Save as workout",
  "Ligar para o SAMU (192)": "Call emergency services (SAMU 192, Brazil)",
  // --- Entrar e criar conta ---
  "Crie a sua conta grátis": "Create your free account",
  "Leva 30 segundos. Depois é só esperar a liberação do criador do app.": "It takes 30 seconds. Then just wait for the app's creator to approve it.",
  "Fichas e cargas": "Workouts and loads", "Treino por voz": "Voice logging", "Conta repetições": "Counts reps", "Seu nome": "Your name", "E-mail": "E-mail",
  "Crie uma senha": "Create a password", "Ler os termos": "Read the terms",
  "Grátis, com acesso liberado pelo criador · sugestões feitas com IA, que não substituem o médico · os treinos ficam no seu celular.": "Free, with access approved by the creator · AI-made suggestions that don't replace a doctor · your workouts stay on your phone.",
  "Criar minha conta": "Create my account", "Já tem conta?": "Already have an account?", "Entrar": "Sign in",
  "A conta guarda só o seu nome, o e-mail e quando você entra. Os seus treinos continuam no seu celular.": "The account only stores your name, e-mail and when you sign in. Your workouts stay on your phone.",
  "Privacidade": "Privacy", "Como você quer ser chamado": "What should we call you", "seuemail@gmail.com": "youremail@gmail.com",
  "Pelo menos 6 caracteres": "At least 6 characters", "Mostrar a senha": "Show password", "Esconder a senha": "Hide password",
  "Bem-vindo de volta": "Welcome back", "Entre com o e-mail e a senha da sua conta.": "Sign in with your account's e-mail and password.", "Senha": "Password",
  "Primeira vez aqui?": "First time here?", "Criar conta": "Create account", "Esqueci a senha": "I forgot my password", "Entrar com o Google": "Sign in with Google",
  "Criar uma senha nova": "Create a new password", "Pronto,": "All set,", "Aguardando a liberação": "Waiting for approval",

  // --- Termos e questionário (as telas) ---
  "Antes de começar, o combinado": "Before you start, the deal", "Os termos de uso mudaram": "The terms of use have changed",
  "As regras do Treino Livre em 1 minuto. Para entrar, é preciso aceitar.": "Treino Livre's rules in 1 minute. To get in, you need to accept them.",
  "Ler os termos completos": "Read the full terms", "Aceito e quero treinar": "I accept and want to train", "Marque as duas caixas para continuar.": "Check both boxes to continue.",
  "Não aceito: sair": "I don't accept: exit", "O resumo, em 1 minuto": "The summary, in 1 minute",
  "Antes de treinar: 7 perguntas de saúde": "Before training: 7 health questions", "Pergunta": "Question",
  "As respostas ficam só no seu celular. O app guarda com a sua conta apenas a frase que você marcar no fim, com a data.": "Your answers stay only on your phone. The app stores with your account only the statement you check at the end, with the date.",
  "Próxima": "Next", "Anterior": "Previous", "Concluir": "Finish", "Refazer": "Redo",

  // --- Socorro ---
  "Passando mal?": "Feeling unwell?", "Passando mal": "Feeling unwell", "Ligar para o": "Call", "Estou bem, fechar": "I'm fine, close",
  "O app não chama ninguém sozinho. Em caso de dúvida, ligue: o atendente do": "The app doesn't call anyone by itself. If in doubt, call: the dispatcher at",
  "orienta o que fazer.": "will tell you what to do.",

  // --- Treino e números ---
  "Marque pelo menos uma série com ✓ antes de finalizar o treino.": "Check at least one set with ✓ before finishing the workout.",
  "Seu treino está equilibrado?": "Is your training balanced?", "O seu treino ajustado já está pronto: \"": "Your adjusted program is ready: \"",
  "A cada semana o app muda sozinho a quantidade de séries, e a cada treino as repetições do dia (pesado, moderado ou leve). Os exercícios ficam os mesmos durante as": "Each week the app changes the number of sets by itself, and each workout the reps of the day (heavy, moderate or light). The exercises stay the same for the",
  "semanas, para dar para ver a carga subindo.": "weeks, so you can see the load going up.", "No fim do ciclo, na semana": "At the end of the cycle, in week",
  "(a de descanso), volte aqui: com as semanas novas no histórico, o app vê se ainda falta equilibrar algum músculo.": "(the rest week), come back here: with the new weeks in your history, the app checks whether any muscle still needs balancing.",
  "janeiro": "January", "fevereiro": "February", "março": "March", "abril": "April", "maio": "May", "junho": "June", "julho": "July", "agosto": "August", "setembro": "September", "outubro": "October", "novembro": "November", "dezembro": "December",
  "jan": "Jan", "fev": "Feb", "mar": "Mar", "abr": "Apr", "mai": "May", "jun": "Jun", "jul": "Jul", "ago": "Aug", "set": "Sep", "out": "Oct", "nov": "Nov", "dez": "Dec",
  "Volume": "Volume", "Story": "Story",
  "Direto": "Direct", "Indireto": "Indirect", "INÍCIO": "START", "FORÇA": "EFFORT", "Desenhos:": "Drawings:", "· Licença": "· License",
  "· animação e mapa: Treino Livre": "· animation and map: Treino Livre", "Músculos trabalhados": "Muscles worked", "Trabalha direto": "Works directly",
  "Auxilia (indireto)": "Assists (indirect)", "Frente": "Front", "Execução": "How to do it", "Ver demonstração em vídeo": "Watch video demonstration",
};

var DIAS_EN = { domingo: "Sunday", segunda: "Monday", "terça": "Tuesday", terca: "Tuesday", quarta: "Wednesday", quinta: "Thursday", sexta: "Friday", "sábado": "Saturday", sabado: "Saturday" };
var MESES_EN = { janeiro: "January", fevereiro: "February", "março": "March", abril: "April", maio: "May", junho: "June", julho: "July", agosto: "August", setembro: "September", outubro: "October", novembro: "November", dezembro: "December" };
var MESES_CURTOS_EN = { jan: "Jan", fev: "Feb", mar: "Mar", abr: "Apr", mai: "May", jun: "Jun", jul: "Jul", ago: "Aug", set: "Sep", out: "Oct", nov: "Nov", dez: "Dec" };
function diaEn(d) { var k = String(d).toLowerCase().replace(/-feira$/, ""); return DIAS_EN[k] || null; }
function pl(n, um, varios) { return (String(n) === "1" ? um : varios); }
// Partes: só vale se TODAS as partes tiverem tradução (nunca meia frase)
function partes(t, sep, tr) {
  var p = t.split(sep);
  if (p.length < 2) return null;
  var r = [];
  for (var i = 0; i < p.length; i++) {
    var x = p[i].trim();
    if (!x) { r.push(""); continue; }
    if (!/[A-Za-zÀ-ÿ]/.test(x)) { r.push(x); continue; }
    var y = tr(x);
    if (y == null) return null;
    r.push(y);
  }
  return r.join(typeof sep === "string" ? sep : sep.source.replace(/\\s\*|\\/g, "") + " ");
}
var MOLDES_EN = [
  // contagens
  [/^(\d+) exercícios?$/, function (m) { return m[1] + pl(m[1], " exercise", " exercises"); }],
  [/^exercícios?$/, function (m) { return m[0] === "exercício" ? "exercise" : "exercises"; }],
  [/^(\d+) séries?$/, function (m) { return m[1] + pl(m[1], " set", " sets"); }],
  [/^(\d+) treinos?$/, function (m) { return m[1] + pl(m[1], " workout", " workouts"); }],
  [/^(\d+) repetições$|^(\d+) repetição$/, function (m) { var n = m[1] || m[2]; return n + pl(n, " rep", " reps"); }],
  [/^(\d+) dias?$/, function (m) { return m[1] + pl(m[1], " day", " days"); }],
  [/^(\d+) semanas?$/, function (m) { return m[1] + pl(m[1], " week", " weeks"); }],
  [/^(\d+) min(utos)?$/, function (m) { return m[1] + " min"; }],
  [/^(\d+) de (\d+) feitas?$/, function (m) { return m[1] + " of " + m[2] + " done"; }],
  [/^(\d+) de (\d+)$/, function (m) { return m[1] + " of " + m[2]; }],
  [/^Série (\d+) de (\d+)$/, function (m) { return "Set " + m[1] + " of " + m[2]; }],
  [/^Série (\d+)$/, function (m) { return "Set " + m[1]; }],
  [/^Nível (\d+)$/, function (m) { return "Level " + m[1]; }],
  [/^cerca de (\d+) min$/, function (m) { return "about " + m[1] + " min"; }],
  [/^há (\d+) dias?$/, function (m) { return m[1] + pl(m[1], " day ago", " days ago"); }],
  [/^há (\d+) semanas?$/, function (m) { return m[1] + pl(m[1], " week ago", " weeks ago"); }],
  [/^há (\d+) meses$|^há 1 mês$/, function (m) { return (m[1] || "1") + pl(m[1] || "1", " month ago", " months ago"); }],
  [/^há (\d+) h$/, function (m) { return m[1] + " h ago"; }],
  [/^há (\d+) min$/, function (m) { return m[1] + " min ago"; }],
  [/^(.+), (\d+) exercícios$/, function (m, tr) { var a = tr(m[1]); return a == null ? null : a + ", " + m[2] + " exercises"; }],
  [/^(\d+) (cadastros? esperando a sua liberação)$/, function (m) { return m[1] + pl(m[1], " sign-up waiting for your approval", " sign-ups waiting for your approval"); }],
  // dias e datas
  [/^Hoje é (\S+)$/, function (m) { var d = diaEn(m[1]); return d ? "Today is " + d : null; }],
  [/^(domingo|segunda|terça|quarta|quinta|sexta|sábado)(-feira)?$/i, function (m) { return diaEn(m[1]); }],
  [/^(domingo|segunda|terça|quarta|quinta|sexta|sábado)(-feira)?, (\d{1,2}) de (\w+)(?: de (\d{4}))?$/i, function (m) {
    var d = diaEn(m[1]), mm = MESES_EN[m[4].toLowerCase()]; return d && mm ? d + ", " + mm + " " + m[3] + (m[5] ? ", " + m[5] : "") : null; }],
  [/^(\d{1,2}) de (\w+)(?: de (\d{4}))?$/, function (m) { var mm = MESES_EN[m[2].toLowerCase()]; return mm ? mm + " " + m[1] + (m[3] ? ", " + m[3] : "") : null; }],
  [/^(\d{1,2}) de (\w{3})\.?$/, function (m) { var mm = MESES_CURTOS_EN[m[2].toLowerCase()]; return mm ? mm + " " + m[1] : null; }],
  [/^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo) - (.+)$/, function (m, tr) { var r = tr(m[2]); return r == null ? null : diaEn(m[1]) + " - " + r; }],
  [/^([A-E]) - (.+)$/, function (m, tr) { var r = tr(m[2]); return r == null ? null : m[1] + " - " + r; }],
  [/^(.+) e (.+)$/, function (m, tr) { if (m[1].length > 30 || m[2].length > 30) return null; var a = tr(m[1]), b = tr(m[2]); return a == null || b == null ? null : a + " & " + b; }],
  // frases compostas: cada pedaço precisa ter tradução
  [/ · /, function (m, tr) { return partes(m.input, " · ", tr); }],
  [/, /, function (m, tr) { return partes(m.input, ", ", tr); }],
  [/[.!?] [A-ZÀ-Ú0-9]/, function (m, tr) {
    var p = m.input.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g); if (!p || p.length < 2) return null;
    var r = "";
    for (var i = 0; i < p.length; i++) { var x = tr(p[i].trim()); if (x == null) return null; r += (i ? " " : "") + x; }
    return r;
  }],
];
// Frases com um nome dentro (exercício, ficha): o nome é traduzido quando
// tem tradução e fica como está quando é da pessoa
function nomeEn(x, tr) { var r = tr(x); return r == null ? x : r; }
var DIAS_CURTOS_EN = { "dom.": "Sun", "seg.": "Mon", "ter.": "Tue", "qua.": "Wed", "qui.": "Thu", "sex.": "Fri", "sáb.": "Sat" };
[
  [/^Contar as repetições de (.+) pela câmera$/, "Count the reps of $1 with the camera"],
  [/^Ver como executar (.+)$/, "See how to do $1"],
  [/^Mudar a posição de (.+)$/, "Move $1"],
  [/^Trocar (.+) por outro$/, "Swap $1 for another"],
  [/^Remover (.+) do treino$/, "Remove $1 from the workout"],
  [/^Diminuir o descanso de (.+)$/, "Shorten the rest for $1"],
  [/^Aumentar o descanso de (.+)$/, "Lengthen the rest for $1"],
  [/^Marcar a série (\d+) de (.+) como aquecimento$/, "Mark set $1 of $2 as warm-up"],
  [/^Peso em quilos da série (\d+) de (.+)$/, "Weight in kilos for set $1 of $2"],
  [/^Repetições da série (\d+) de (.+)$/, "Reps for set $1 of $2"],
  [/^Concluir a série (\d+) de (.+)$/, "Complete set $1 of $2"],
  [/^Adicionar uma série em (.+)$/, "Add a set to $1"],
  [/^Acrescentar um drop set em (.+)$/, "Add a drop set to $1"],
  [/^Remover a última série de (.+)$/, "Remove the last set of $1"],
  [/^Observação sobre (.+): altura do banco, pegada, etc\.$/, "Notes on $1: bench height, grip, etc."],
  [/^Abrir (.+)$/, "Open $1", true],
  [/^Animação do movimento: (.+)$/, "Movement animation: $1"],
  [/^Excluir do histórico o treino (.+)$/, "Delete workout $1 from history"],
  [/^Desafiar amigos com o treino (.+)$/, "Challenge friends with workout $1"],
  [/^Corrigir o treino (.+)$/, "Edit workout $1"],
  [/^Transformar o treino (.+) numa ficha$/, "Turn workout $1 into a template"],
  [/^Duplicar o treino (.+)$/, "Duplicate program $1"],
  [/^Enviar o treino (.+) por link$/, "Send program $1 by link"],
  [/^(\d+) fichas?: (.+)$/, "$1 workout(s): $2"],
  [/^Faltam ([\d.]+) pontos para (.+)$/, "$1 points to go until $2"],
  [/^Faltam (\d+) treinos? até domingo\.?$/, "$1 workout(s) to go until Sunday."],
  [/^(\d+) de (\d+) treinos?$/, "$1 of $2 workouts"],
  [/^(\d+) de (\d+) treinos? nesta semana$/, "$1 of $2 workouts this week"],
  [/^Progresso para o próximo nível: (\d+)%$/, "Progress to the next level: $1%"],
  [/^o mesmo que (.+) elefantes?$/, "the same as $1 elephant(s)"],
  [/^Ver todas as (\d+) conquistas$/, "See all $1 achievements"],
  [/^Mostrar todos os (\d+) músculos$/, "Show all $1 muscles"],
  [/^(\d+) dias? de treino$/, "$1 training day(s)"],
  [/^Você aceitou em (\S+) \(versão de (\S+)\)\.?$/, "You accepted on $1 (version of $2)."],
  [/^respondido em (\S+), sem nenhuma resposta sim\.?$/, "answered on $1, with no yes answers."],
  [/^respondido em (\S+), com resposta sim\.?$/, "answered on $1, with a yes answer."],
  [/^(.+), (\d+) exercícios$/, "$1, $2 exercises"],
  [/^([\d,]+) diretas$/, "$1 direct"],
  [/^só indireto: ([\d,]+) × ½$/, "indirect only: $1 × ½"],
  [/^([+-]?\d+%) de volume vs\. treino anterior$/, "$1 volume vs. previous workout"],
  [/^(.+) (\d+%)$/, "$1 $2", true],
  [/^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})$/, "$1 $2", true],
  [/^(.+): nenhuma série direta, mas ([\d,]+) indiretas valem ~([\d,]+) séries\. Se quiser que ele cresça, faltam séries diretas\.$/, "$1: no direct sets, but $2 indirect sets count as ~$3 sets. If you want it to grow, it needs direct sets.", true],
].forEach(function (p) {
  MOLDES_EN.unshift([p[0], function (m, tr) {
    var falhou = false;
    var s = p[1].replace(/\$(\d)/g, function (_, i) { var v = m[+i]; if (/^[\d.,%\/]+$/.test(v)) return v; var y = tr(v); if (y == null && p[2]) falhou = true; return y == null ? v : y; });
    return falhou ? null : s;
  }]);
});
MOLDES_EN.push([/^(dom|seg|ter|qua|qui|sex|sáb)\., (\d{1,2}) de (\w{3})\.?$/, function (m) {
  var d = DIAS_CURTOS_EN[m[1] + "."], mm = MESES_CURTOS_EN[m[3].toLowerCase()]; return d && mm ? d + ", " + mm + " " + m[2] : null; }]);
MOLDES_EN.push([/^(\d\d\/\d\d\/\d{4}) · sem treino$/, function (m) { return m[1] + " · no workout"; }]);

(function () {
  "use strict";
  var DIC = new Map();
  Object.keys(TEXTOS_EN).forEach(function (k) { DIC.set(k, TEXTOS_EN[k]); });
  var EX = null;
  // O dicionário entra antes do catálogo (no alto da página): o mapa só é
  // guardado quando os exercícios já existem
  function exercicios() {
    if (EX) return EX;
    if (typeof EXERCICIOS === "undefined") return new Map();
    EX = new Map();
    try {
      (typeof EXERCICIOS !== "undefined" ? EXERCICIOS : []).forEach(function (e) { if (e && e.nome && e.en) EX.set(e.nome, e.en); });
      (typeof GRUPOS_EN !== "undefined" ? Object.keys(GRUPOS_EN) : []).forEach(function (k) { if (!DIC.has(k)) DIC.set(k, GRUPOS_EN[k]); });
    } catch (e) {}
    if (CACHE) CACHE.clear(); // o que foi lido antes do catálogo é refeito
    return EX;
  }
  function inteiro(t) {
    if (DIC.has(t)) return DIC.get(t);
    var ex = exercicios().get(t);
    if (ex) return ex;
    for (var i = 0; i < MOLDES_EN.length; i++) {
      var m = MOLDES_EN[i][0].exec(t);
      if (m) { var r = MOLDES_EN[i][1](m, nucleo); if (r != null) return r; }
    }
    return null;
  }
  // "📜 Termos de Uso", "Seu nome:", "Escolher outra ficha (5)": o miolo é
  // traduzido e o que está em volta (emoji, setas, pontuação, contagem) fica
  var BORDA = /^([^A-Za-zÀ-ÿ0-9"“(]*)([\s\S]*?)([\s:!?.…›»▸▾▴→←✓✕×·]*(?:\s*\(\d+\))?[\s:!?.…›»▸▾▴→←·]*)$/;
  var CACHE = new Map();
  function nucleo(t) {
    if (CACHE.has(t)) return CACHE.get(t);
    CACHE.set(t, null); // sem volta infinita: enquanto calcula, vale "sem tradução"
    var r = inteiro(t);
    if (r == null) {
      var m = BORDA.exec(t);
      if (m && m[2] && (m[1] || m[3])) {
        // primeiro só o que vem antes (o emoji), com a pontuação do fim junto; depois os dois lados
        var sem = m[1] ? inteiro(t.slice(m[1].length)) : null;
        if (sem != null) r = m[1] + sem;
        else { var meio = inteiro(m[2]); if (meio != null) r = m[1] + meio + m[3]; }
      }
    }
    if (CACHE.size > 5000) CACHE.clear();
    CACHE.set(t, r);
    return r;
  }
  function traduzir(texto) {
    if (!texto) return null;
    var t = texto.trim();
    if (!t || !/[A-Za-zÀ-ÿ]/.test(t)) return null;
    var r = nucleo(t);
    if (r == null || r === t) return null;
    var ini = texto.match(/^\s*/)[0], fim = texto.match(/\s*$/)[0];
    return ini + r + fim;
  }
  window.traduzirTexto = function (t) { var r = traduzir(t); return r == null ? t : r; };

  var PULAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  function protegido(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (PULAR[e.nodeName] || e.isContentEditable) return true;
      if (e.getAttribute("translate") === "no" || (e.classList && e.classList.contains("notranslate"))) return true;
    }
    return false;
  }
  function textoNo(n) {
    if (!n.parentNode || protegido(n.parentNode)) return;
    var r = traduzir(n.nodeValue);
    if (r != null) n.nodeValue = r;
  }
  var ATRS = ["placeholder", "aria-label", "title", "alt"];
  function atributos(el) {
    // o campo de texto não tem o valor traduzido, mas a dica (placeholder) sim
    if (protegido(/^(INPUT|TEXTAREA)$/.test(el.nodeName) ? el.parentNode : el)) return;
    for (var i = 0; i < ATRS.length; i++) {
      var v = el.getAttribute(ATRS[i]);
      if (v) { var r = traduzir(v); if (r != null) el.setAttribute(ATRS[i], r); }
    }
    if (el.nodeName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) { var rv = traduzir(el.value); if (rv != null) el.value = rv; }
  }
  function arvore(raiz) {
    if (raiz.nodeType === 3) { textoNo(raiz); return; }
    if (raiz.nodeType !== 1 || protegido(raiz)) return;
    atributos(raiz);
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) textoNo(n);
      else if (PULAR[n.nodeName] || n.getAttribute("translate") === "no") { /* o filho é visitado e barrado em protegido */ atributos(n); }
      else atributos(n);
    }
  }
  function ligar() {
    document.documentElement.lang = "en";
    document.title = window.traduzirTexto(document.title);
    arvore(document.body);
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === "characterData") textoNo(m.target);
        else if (m.type === "attributes") atributos(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) arvore(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRS });
  }
  if (document.body) ligar(); else document.addEventListener("DOMContentLoaded", ligar);
})();
