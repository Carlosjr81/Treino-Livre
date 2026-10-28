package br.com.treinolivre.app

import android.annotation.SuppressLint
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

// O Jarvis com a tela travada (🔒 na tela do treino).
//
// Com a tela travada o Chrome suspende a página: o microfone, a voz e o relógio
// dela param. Este serviço em primeiro plano, com o microfone, faz o que a
// página não consegue: ouve (SpeechRecognizer do Android), fala (TextToSpeech)
// e conta o descanso (no relógio do Android). Quem ENTENDE a frase é o próprio
// site, aberto aqui num navegador escondido com ?modo=bolso: o mesmo
// interpretador do Jarvis de sempre, sem um segundo cérebro para manter.
//
// O que ele anota fica guardado ("pend") até voltar ao treino de verdade pelo
// link #bolso= (BolsoActivity): ao destravar, uma notificação leva até lá.
//
// Ouve só com a tela travada ou apagada. Destravada, quem ouve é o Jarvis da
// página — dois microfones abertos brigariam.
class BolsoService : Service(), RecognitionListener {
    companion object {
        private const val CANAL = "bolso"
        private const val CANAL_VOLTA = "bolso-volta"
        private const val ID = 2
        private const val ID_VOLTA = 3
        const val PARAR = "br.com.treinolivre.app.BOLSO_PARAR"
        const val OCIOSO_MS = 40 * 60_000L
        const val PREFS = "bolso"
        private const val DURACAO_MAX = 4 * 3600_000L

        @SuppressLint("StaticFieldLeak")
        @Volatile var instancia: BolsoService? = null

        // O diário do serviço: com a tela travada não há tela para ver o que deu
        // errado. Vai junto na volta (#bolso=) e aparece no diagnóstico do Jarvis.
        fun diario(contexto: Context, msg: String) {
            android.util.Log.i("TreinoLivre", "Bolso: " + msg)
            val p = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val lista = try { JSONArray(p.getString("diario", "[]")) } catch (e: Exception) { JSONArray() }
            val hora = java.text.SimpleDateFormat("HH:mm:ss", Locale.US).format(java.util.Date())
            val nova = JSONArray()
            val ini = maxOf(0, lista.length() - 39)
            for (i in ini until lista.length()) nova.put(lista.get(i))
            nova.put(hora + "  " + msg.take(150))
            p.edit().putString("diario", nova.toString()).apply()
        }
        fun lerDiario(contexto: Context): JSONArray =
            try { JSONArray(contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("diario", "[]")) } catch (e: Exception) { JSONArray() }

        // O que foi anotado com a tela travada e ainda não voltou ao treino.
        // Tudo roda na linha principal: ler e zerar aqui é atômico.
        fun tirarPendentes(contexto: Context): JSONArray {
            val p = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val pend = try { JSONArray(p.getString("pend", "[]")) } catch (e: Exception) { JSONArray() }
            if (pend.length() == 0) return pend
            val aplicado = try { JSONArray(p.getString("aplicado", "[]")) } catch (e: Exception) { JSONArray() }
            for (i in 0 until pend.length()) aplicado.put(pend.get(i))
            p.edit().putString("pend", "[]").putString("aplicado", aplicado.toString()).apply()
            instancia?.entregue()
            (contexto.getSystemService(NotificationManager::class.java)).cancel(ID_VOLTA)
            return pend
        }
    }

    private val linha = Handler(Looper.getMainLooper())
    private var web: WebView? = null
    private var pronto = false
    private var tts: TextToSpeech? = null
    private var ttsPronto = false
    private var falando = 0
    private var reconhecedor: SpeechRecognizer? = null
    private var ouvindo = false
    private var travada = false
    private var avisouPrimeira = false
    private var erros = 0
    private var trava: PowerManager.WakeLock? = null
    private var pararDepoisDeFalar = false
    private var inicio = 0L
    // a frase do fim do descanso que veio da página (vale se a página escondida não carregou)
    private var fimFalaFixa = ""
    // O reconhecedor do Google pode recusar ouvir para um app com a tela
    // travada; aí vale o do próprio aparelho (Android 12+), se houver.
    private var noAparelho = false
    private var recusas = 0
    private fun anotar(msg: String) = diario(this, msg)

    private val tela = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) {
            when (i?.action) {
                Intent.ACTION_SCREEN_OFF -> aoTravar()
                Intent.ACTION_USER_PRESENT -> aoDestravar()
                Intent.ACTION_SCREEN_ON -> {
                    val km = getSystemService(KeyguardManager::class.java)
                    if (km == null || !km.isKeyguardLocked) aoDestravar()
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel(CANAL, "Jarvis com a tela travada", NotificationManager.IMPORTANCE_LOW))
            nm.createNotificationChannel(NotificationChannel(CANAL_VOLTA, "Séries anotadas com a tela travada", NotificationManager.IMPORTANCE_HIGH))
            startForeground(ID, aviso(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } catch (e: Exception) {
            android.util.Log.w("TreinoLivre", "Bolso: não ligou (" + e.message + ")")
            stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action == PARAR) { encerrar(); return START_NOT_STICKY }
        // Sem intent é o sistema religando um serviço que morreu, não a página
        // pedindo: com o app fechado, o Jarvis não pode voltar a falar sozinho.
        if (intent == null) { encerrar(); return START_NOT_STICKY }
        instancia = this
        usadoEm = System.currentTimeMillis()
        val p = getSharedPreferences(PREFS, MODE_PRIVATE)
        val snap = intent?.getStringExtra("snap")
        if (snap != null) {
            // Cópia nova da página: o que já foi entregue (aplicar) está nela
            // depois que a página aplicar; nada mais pendente.
            p.edit().putString("snap", snap)
                .putString("aplicado", intent?.getStringExtra("aplicar") ?: "[]")
                .putString("pend", "[]").apply()
        }
        if (inicio == 0L) {
            inicio = System.currentTimeMillis()
            ligar()
        } else if (pronto && snap != null) iniciarPagina()
        // O ✓ da página: a confirmação é falada daqui (a página fica quieta), e o
        // fim do descanso também — é o que funciona com a tela travada.
        if (snap != null) {
            fimFalaFixa = intent?.getStringExtra("fimFala") ?: ""
            ouvirComMusica = intent?.getStringExtra("musica") == "1"
            val ate = try { JSONObject(snap).optLong("descansoAte", 0L) } catch (e: Exception) { 0L }
            agendarDescanso(ate)
            val agora = intent?.getStringExtra("falar")
            if (!agora.isNullOrEmpty()) falar(agora)
            val c = intent?.getStringExtra("crono")
            if (!c.isNullOrEmpty()) try { receberCrono(JSONObject(c)) } catch (e: Exception) { }
        }
        linha.removeCallbacks(ocioso)
        linha.postDelayed(ocioso, 60_000L)
        return START_NOT_STICKY
    }

    // Fechar o app (tirar da lista de recentes) desliga o Jarvis. Relato do
    // dono: "fechei o app e o Jarvis continua falando". Travar a tela não tira
    // o app da lista, então o uso com o celular no bolso continua igual.
    override fun onTaskRemoved(rootIntent: Intent?) {
        anotar("app fechado: Jarvis desligado")
        encerrar()
        super.onTaskRemoved(rootIntent)
    }

    // Esquecido ligado: sem ✓, sem fala ouvida e sem descanso ou ▶ pela frente
    // há mais de 40 minutos, o treino acabou. Desliga em vez de seguir ouvindo
    // e falando a tarde inteira.
    private var usadoEm = 0L
    private var descansoAte = 0L
    private val ocioso = object : Runnable {
        override fun run() {
            val agora = System.currentTimeMillis()
            if (crono == null && descansoAte < agora && agora - usadoEm > OCIOSO_MS) {
                anotar("40 min sem uso: Jarvis desligado")
                encerrar()
                return
            }
            linha.postDelayed(this, 60_000L)
        }
    }

    private fun ligar() {
        anotar("ligado (app de 2026-10-28o: a música manda no microfone)")
        linha.post(olheiro)
        try { getSystemService(AudioManager::class.java)?.registerAudioPlaybackCallback(espiaoSom, linha) } catch (e: Exception) { }
        val pm = getSystemService(PowerManager::class.java)
        // Com a tela travada a CPU dorme, e o fim do descanso chegaria atrasado.
        trava = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TreinoLivre:bolso").apply { acquire(DURACAO_MAX) }
        linha.postDelayed({ encerrar() }, DURACAO_MAX)
        val filtro = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        androidx.core.content.ContextCompat.registerReceiver(this, tela, filtro, androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED)
        ligarVoz()
        abrirPagina()
    }

    // ---- a página escondida ----
    @SuppressLint("SetJavaScriptEnabled")
    private fun abrirPagina() {
        val w = WebView(applicationContext)
        web = w
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.webViewClient = WebViewClient()
        // Sem janela, a página teria tamanho zero: um tamanho qualquer basta
        w.layout(0, 0, 360, 640)
        w.loadUrl(Site.ENDERECO + "?modo=bolso")
        var tentativas = 0
        val conferir = object : Runnable {
            override fun run() {
                val atual = web ?: return
                atual.evaluateJavascript("typeof window.bolso==='object'") { r ->
                    if (r == "true") { pronto = true; anotar("página escondida pronta"); iniciarPagina(); if (travada) ouvir() }
                    else if (++tentativas < 120) linha.postDelayed(this, 500L)
                    else anotar("ERRO: a página escondida não carregou em 60 s (sem internet?)")
                }
            }
        }
        linha.postDelayed(conferir, 800L)
    }

    private fun iniciarPagina() {
        val p = getSharedPreferences(PREFS, MODE_PRIVATE)
        val snap = p.getString("snap", null) ?: return
        val aplicado = try { JSONArray(p.getString("aplicado", "[]")) } catch (e: Exception) { JSONArray() }
        val pend = try { JSONArray(p.getString("pend", "[]")) } catch (e: Exception) { JSONArray() }
        // O que ainda vai voltar também já aconteceu: entra na cópia e fica pendente
        val tudo = JSONArray()
        for (i in 0 until aplicado.length()) tudo.put(aplicado.get(i))
        for (i in 0 until pend.length()) tudo.put(pend.get(i))
        js("bolso.iniciar(" + q(snap) + "," + q(tudo.toString()) + "," + q(pend.toString()) + ")") { }
    }

    private fun entregue() { if (pronto) js("bolso.entregue()") { } }

    private fun q(s: String): String = JSONObject.quote(s)

    // evaluateJavascript devolve o resultado como JSON; uma string vem entre aspas
    private fun js(codigo: String, depois: (String) -> Unit) {
        val w = web ?: return
        w.evaluateJavascript(codigo) { r ->
            val texto = try { if (r == null || r == "null") "" else JSONArray("[$r]").optString(0, "") } catch (e: Exception) { "" }
            depois(texto)
        }
    }

    // ---- a tela ----
    // Conferido de verdade, e não só pelos avisos do sistema: num Galaxy o
    // aviso de desbloqueio pode não chegar, e o serviço seguia ouvindo com a
    // tela livre, brigando pelo microfone com o Jarvis da página (que só ouvia
    // silêncio).
    private fun telaLivre(): Boolean {
        val pm = getSystemService(PowerManager::class.java)
        val km = getSystemService(KeyguardManager::class.java)
        return (pm?.isInteractive ?: false) && !(km?.isKeyguardLocked ?: true)
    }
    private val vigia = object : Runnable {
        override fun run() {
            if (travada && telaLivre()) aoDestravar()
            olharMusica()
            if (travada && gravando && saida == null && musicaTocando()) pararGravador()
            if (travada) linha.postDelayed(this, 2000L)
        }
    }

    private fun aoTravar() {
        if (travada) return
        travada = true
        olharMusica()
        anotar("tela travada" + (if (pronto) "" else " (a página escondida ainda carregando)"))
        linha.removeCallbacks(vigia)
        linha.postDelayed(vigia, 2000L)
        if (!avisouPrimeira) {
            avisouPrimeira = true
            falar("Jarvis no bolso. Estou ouvindo.")
        } else linha.postDelayed({ ouvir() }, 2000L) // tempo de ver a música antes de qualquer microfone
    }

    private fun aoDestravar() {
        if (!travada) return
        travada = false
        anotar("tela destravada: o microfone fica com a página")
        linha.removeCallbacks(vigia)
        pararDeOuvir()
        pararGravador()
        val pend = try { JSONArray(getSharedPreferences(PREFS, MODE_PRIVATE).getString("pend", "[]")) } catch (e: Exception) { JSONArray() }
        if (pend.length() > 0) avisarVolta(pend.length())
    }

    // Destravou com séries anotadas: a notificação leva ao treino (o Android não
    // deixa um serviço abrir uma tela sozinho; o toque é da pessoa).
    private fun avisarVolta(n: Int) {
        val abrir = PendingIntent.getActivity(
            this, 1, Intent(this, BolsoActivity::class.java).setData(Uri.parse("treinolivre://bolso?entregar=1")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val texto = if (n == 1) "1 anotação feita com a tela travada" else "$n anotações feitas com a tela travada"
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(ID_VOLTA, Notification.Builder(this, CANAL_VOLTA)
            .setContentTitle("Toque para levar ao treino")
            .setContentText(texto)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(abrir)
            .setAutoCancel(true)
            .build())
    }

    // ---- ouvir ----
    // **A música parava e cortava a cada poucos segundos.** O reconhecedor do
    // Google, a cada vez que começa a ouvir, pega o microfone e o foco do áudio:
    // o tocador pausa e volta. Sem ninguém falando ele fecha em segundos e
    // recomeça — a música picotava o tempo todo com a tela travada.
    //
    // No Android 13+ (fonteExterna) quem grava é o próprio app (AudioRecord, que
    // não mexe no foco nem no Bluetooth do fone), e o reconhecedor só é chamado
    // quando o som passa do ruído de fundo: recebe esse áudio por um cano
    // (EXTRA_AUDIO_SOURCE), com meio segundo de antes para não perder o "Jarvis".
    // No silêncio, ninguém abre e fecha nada. Se o reconhecedor não aceitar o
    // áudio de fora, volta ao jeito antigo e o diário diz.
    @Volatile private var fonteExterna = android.os.Build.VERSION.SDK_INT >= 33
    private var recusasFonte = 0
    @Volatile private var gravando = false
    private var gravador: Thread? = null
    @Volatile private var saida: java.io.OutputStream? = null
    private var leitura: android.os.ParcelFileDescriptor? = null
    @Volatile private var sessaoDesde = 0L
    private val antes = ArrayDeque<ByteArray>()

    @SuppressLint("MissingPermission")
    private fun ligarGravador() {
        if (gravando) return
        gravando = true
        val g = Thread {
            val taxa = 16000
            val min = android.media.AudioRecord.getMinBufferSize(taxa, android.media.AudioFormat.CHANNEL_IN_MONO, android.media.AudioFormat.ENCODING_PCM_16BIT)
            val rec = try {
                android.media.AudioRecord(android.media.MediaRecorder.AudioSource.VOICE_RECOGNITION, taxa,
                    android.media.AudioFormat.CHANNEL_IN_MONO, android.media.AudioFormat.ENCODING_PCM_16BIT, maxOf(min, 3200) * 4)
            } catch (e: Exception) { null }
            if (rec == null || rec.state != android.media.AudioRecord.STATE_INITIALIZED) {
                linha.post { anotar("ERRO: o app não conseguiu gravar; voltando ao microfone do reconhecedor"); fonteExterna = false; gravando = false; ouvir() }
                try { rec?.release() } catch (e: Exception) { }
                return@Thread
            }
            try { rec.startRecording() } catch (e: Exception) { }
            linha.post { anotar("gravando pelo app (a música não é tocada)") }
            val quadro = ByteArray(640) // 20 ms
            var piso = 0.0
            var acima = 0
            while (gravando) {
                val n = rec.read(quadro, 0, quadro.size)
                if (n <= 0) continue
                val c = quadro.copyOf(n)
                val s = saida
                if (s != null) {
                    try { s.write(c) } catch (e: Exception) { saida = null }
                    if (System.currentTimeMillis() - sessaoDesde > 12_000L) linha.post { fecharSaida() }
                    continue
                }
                var soma = 0.0
                var i = 0
                while (i + 1 < n) {
                    val v = ((c[i + 1].toInt() shl 8) or (c[i].toInt() and 0xFF)).toShort().toDouble()
                    soma += v * v
                    i += 2
                }
                val rms = Math.sqrt(soma / maxOf(1, n / 2))
                // o ruído de fundo da academia é a régua: só a voz por cima dele abre
                piso = if (piso == 0.0) rms else if (rms < piso * 2) piso * 0.98 + rms * 0.02 else piso * 0.999 + rms * 0.001
                synchronized(antes) {
                    antes.addLast(c)
                    while (antes.size > 25) antes.removeFirst()
                }
                if (rms > maxOf(piso * 2.5, 350.0)) {
                    if (++acima >= 3) { acima = 0; linha.post { abrirSessao() } }
                } else acima = 0
            }
            try { rec.stop() } catch (e: Exception) { }
            rec.release()
        }
        gravador = g
        g.start()
    }

    private fun pararGravador() {
        gravando = false
        fecharSaida()
        gravador = null
    }

    private fun fecharSaida() {
        val s = saida
        saida = null
        try { s?.close() } catch (e: Exception) { }
        try { leitura?.close() } catch (e: Exception) { }
        leitura = null
    }

    // **A música de outro app vence o microfone.** Relato do dono, com a tela
    // travada: a música parava ao pôr o celular no bolso (o roçar no tecido
    // passa do ruído de fundo e abria o reconhecedor), voltava quando o Jarvis
    // falava e parava de novo quando ele terminava. O reconhecedor do Google
    // pede o foco do áudio a cada sessão, mesmo recebendo o áudio pelo cano, e
    // isso não se desliga de fora. Então, com música tocando, o reconhecedor
    // não abre: o Jarvis continua falando (o ✓, o fim do descanso), e ouvir
    // fica para quando a música parar ou a tela destravar. Quem prefere ouvir
    // mesmo assim liga "Ouvir com música" no cartão (mu=1), sabendo que ela
    // pausa a cada comando.
    //
    // **A música é lembrada por 1 minuto** (musicaVistaEm). Segundo relato do
    // dono: "só toca música quando o Jarvis fala". O Jarvis acabava de falar,
    // religava o microfone em 0,3 s, e a música (que o reconhecedor tinha
    // pausado) ainda não tinha voltado: o isMusicActive dava falso, o
    // reconhecedor abria e a pausava de novo — e, pausada, ela nunca mais
    // aparecia como tocando. Hoje a música vista no último minuto conta como
    // tocando; e como o reconhecedor não abre nesse tempo, quem a mantém vista é
    // o próprio tocador. Só um minuto inteiro em silêncio (a pessoa pausou)
    // devolve o ouvido. A voz do Jarvis e os bipes saem no canal da música: o
    // que toca durante a fala e até 1,5 s depois não conta (somProprioAte).
    @Volatile private var ouvirComMusica = false
    private var calouPelaMusica = false
    private var musicaVistaEm = 0L
    private var somProprioAte = 0L
    // Dois jeitos de ver a música, e basta um: o isMusicActive (o canal da
    // música tocando) e a lista de tocadores do aparelho com uso de mídia (o
    // Spotify aparece ali mesmo quando o som vai para os óculos). O teste do
    // dono provou que só o primeiro não bastava: com o Jarvis desligado a
    // música seguia, com ele ligado parava ao travar a tela.
    private fun haMusica(): Boolean {
        val am = getSystemService(AudioManager::class.java) ?: return false
        if (try { am.isMusicActive } catch (e: Exception) { false }) return true
        return try {
            am.activePlaybackConfigurations.any {
                val u = it.audioAttributes.usage
                u == AudioAttributes.USAGE_MEDIA || u == AudioAttributes.USAGE_GAME
            }
        } catch (e: Exception) { false }
    }
    private fun olharMusica() {
        if (falando > 0 || System.currentTimeMillis() < somProprioAte) return
        val ativa = haMusica()
        if (ativa) {
            if (musicaVistaEm == 0L) anotar("vi música tocando")
            musicaVistaEm = System.currentTimeMillis()
        }
    }
    // **O diário anota quando a música para, e o que o Jarvis fazia naquela
    // hora.** Três consertos seguidos não acabaram com o "a música para com a
    // tela travada", e sem saber quem a para cada conserto é palpite. Se ela
    // para com o microfone e o reconhecedor desligados e o Jarvis calado, o
    // culpado não é este serviço (é o Chrome, o fone ou o próprio tocador).
    private var midiaAntes = false
    private val espiaoSom = object : AudioManager.AudioPlaybackCallback() {
        override fun onPlaybackConfigChanged(lista: MutableList<android.media.AudioPlaybackConfiguration>?) {
            val usos = lista?.map { it.audioAttributes.usage } ?: emptyList()
            val midia = usos.any { it == AudioAttributes.USAGE_MEDIA || it == AudioAttributes.USAGE_GAME || it == AudioAttributes.USAGE_UNKNOWN }
            if (midia == midiaAntes) return
            midiaAntes = midia
            if (falando > 0 || System.currentTimeMillis() < somProprioAte) return
            anotar((if (midia) "♪ música tocou" else "♪ música PAROU") + " · " + situacaoAgora())
        }
    }
    private fun situacaoAgora(): String =
        (if (telaLivre()) "tela livre" else "tela travada") +
        ", microfone do app " + (if (gravando) "ligado" else "desligado") +
        ", reconhecedor " + (if (ouvindo) "aberto" else "fechado") +
        (if (falando > 0) ", falando" else "") +
        (if (ouvirComMusica) ", ouvir com música LIGADO" else "")

    // A música é olhada a cada segundo desde que o serviço liga, e não só com a
    // tela travada: quem trava a tela logo depois do ✓ trava com o Jarvis
    // falando, quando a música não pode ser vista (a voz dele sai no mesmo
    // canal). Sem o que foi visto antes, o microfone ligava e a música parava.
    private val olheiro = object : Runnable {
        override fun run() {
            olharMusica()
            linha.postDelayed(this, 1000L)
        }
    }
    private fun musicaTocando(): Boolean {
        if (ouvirComMusica || falando > 0) return false
        olharMusica()
        val ativa = System.currentTimeMillis() - musicaVistaEm < 60_000L
        if (ativa && !calouPelaMusica) { calouPelaMusica = true; anotar("música tocando: não abro o reconhecedor para não parar a música (falar continua)") }
        if (!ativa && calouPelaMusica) { calouPelaMusica = false; anotar("música parada há 1 minuto: voltei a ouvir") }
        return ativa
    }

    // Alguém falou: o reconhecedor recebe o meio segundo de antes e o que vier
    private fun abrirSessao() {
        if (!travada || ouvindo || falando > 0 || pararDepoisDeFalar || saida != null) return
        if (telaLivre()) { aoDestravar(); return }
        if (musicaTocando()) { synchronized(antes) { antes.clear() }; return }
        val cano = try { android.os.ParcelFileDescriptor.createPipe() } catch (e: Exception) { return }
        val out = android.os.ParcelFileDescriptor.AutoCloseOutputStream(cano[1])
        try { synchronized(antes) { antes.forEach { out.write(it) }; antes.clear() } } catch (e: Exception) { }
        leitura = cano[0]
        sessaoDesde = System.currentTimeMillis()
        saida = out
        iniciarReconhecedor(cano[0])
    }

    private fun ouvir() {
        if (!travada || ouvindo || falando > 0 || pararDepoisDeFalar) return
        if (telaLivre()) { aoDestravar(); return }
        // Com música, nem o microfone do app: em alguns fones Bluetooth gravar
        // já troca o fone para o modo de ligação, e a música para.
        if (musicaTocando()) { pararGravador(); linha.removeCallbacks(reOuvir); linha.postDelayed(reOuvir, 3000L); return }
        if (fonteExterna) { ligarGravador(); return }
        iniciarReconhecedor(null)
    }

    private fun iniciarReconhecedor(fonte: android.os.ParcelFileDescriptor?) {
        if (!noAparelho && !SpeechRecognizer.isRecognitionAvailable(this)) {
            anotar("ERRO: o aparelho não tem reconhecimento de voz")
            return
        }
        val r = reconhecedor ?: (if (noAparelho && android.os.Build.VERSION.SDK_INT >= 31)
            SpeechRecognizer.createOnDeviceSpeechRecognizer(this) else SpeechRecognizer.createSpeechRecognizer(this)).also {
            it.setRecognitionListener(this)
            reconhecedor = it
        }
        val pedido = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
            .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
            .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
        if (fonte != null && android.os.Build.VERSION.SDK_INT >= 33) {
            pedido.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, fonte)
                .putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT, 1)
                .putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING, android.media.AudioFormat.ENCODING_PCM_16BIT)
                .putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE, 16000)
        } else silenciarBipe()
        try {
            r.startListening(pedido)
            ouvindo = true
        } catch (e: Exception) {
            ouvindo = false
            fecharSaida()
            linha.postDelayed({ ouvir() }, 2000L)
        }
    }

    // O reconhecedor apita a cada vez que começa a ouvir. No bolso, entre uma
    // série e outra, isso vira um bipe a cada poucos segundos: o som de aviso
    // fica mudo por um instante enquanto ele liga. A voz e a música não mexem.
    private fun silenciarBipe() {
        val am = getSystemService(AudioManager::class.java) ?: return
        val canais = intArrayOf(AudioManager.STREAM_NOTIFICATION, AudioManager.STREAM_SYSTEM)
        try { canais.forEach { am.adjustStreamVolume(it, AudioManager.ADJUST_MUTE, 0) } } catch (e: Exception) { }
        linha.postDelayed({
            try { canais.forEach { am.adjustStreamVolume(it, AudioManager.ADJUST_UNMUTE, 0) } } catch (e: Exception) { }
        }, 700L)
    }

    private fun pararDeOuvir() {
        ouvindo = false
        fecharSaida()
        try { reconhecedor?.cancel() } catch (e: Exception) { }
    }

    private val reOuvir = Runnable { ouvir() }

    private fun religar(ms: Long) {
        linha.postDelayed({ ouvir() }, ms)
    }

    override fun onResults(resultados: Bundle?) {
        ouvindo = false
        fecharSaida()
        recusasFonte = 0
        erros = 0
        recusas = 0
        val alts = resultados?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (alts.isNullOrEmpty()) { religar(250L); return }
        anotar("ouvi: \"" + alts[0] + "\"" + (if (noAparelho) " (reconhecedor do aparelho)" else ""))
        if (!pronto) { anotar("ERRO: a página escondida não carregou; não sei entender a frase"); religar(300L); return }
        processar(alts)
    }

    override fun onError(codigo: Int) {
        ouvindo = false
        fecharSaida()
        if (!travada) return
        // O reconhecedor não aceitou o áudio gravado pelo app: o jeito antigo
        if (fonteExterna && codigo != SpeechRecognizer.ERROR_NO_MATCH && codigo != SpeechRecognizer.ERROR_SPEECH_TIMEOUT &&
            codigo != SpeechRecognizer.ERROR_NETWORK && codigo != SpeechRecognizer.ERROR_NETWORK_TIMEOUT) {
            if (++recusasFonte >= 2) {
                fonteExterna = false
                pararGravador()
                anotar("o reconhecedor não aceitou o áudio do app (erro $codigo): voltando ao microfone dele")
                religar(500L)
                return
            }
        }
        if (fonteExterna && (codigo == SpeechRecognizer.ERROR_NO_MATCH || codigo == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)) return
        val nome = when (codigo) {
            SpeechRecognizer.ERROR_NO_MATCH -> "não entendeu"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "silêncio"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "sem permissão"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "reconhecedor ocupado"
            SpeechRecognizer.ERROR_CLIENT -> "erro do cliente"
            SpeechRecognizer.ERROR_AUDIO -> "erro de áudio"
            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "sem internet"
            SpeechRecognizer.ERROR_SERVER -> "erro do servidor"
            else -> "erro $codigo"
        }
        when (codigo) {
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> { recusas = 0; religar(250L) }
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS, SpeechRecognizer.ERROR_AUDIO, SpeechRecognizer.ERROR_CLIENT,
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {
                recusas++
                anotar("reconhecedor: $nome" + (if (noAparelho) " (do aparelho)" else " (do Google)"))
                try { reconhecedor?.destroy() } catch (e: Exception) { }
                reconhecedor = null
                // Recusou três vezes seguidas com a tela travada: troca de reconhecedor
                if (recusas >= 3) {
                    recusas = 0
                    val podeAparelho = android.os.Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
                    if (!noAparelho && podeAparelho) {
                        noAparelho = true
                        anotar("trocando para o reconhecedor do próprio aparelho")
                    } else if (noAparelho) {
                        noAparelho = false
                        anotar("voltando para o reconhecedor do Google")
                        erros++
                    } else erros++
                }
                religar(minOf(8000L, 800L + 1200L * erros))
            }
            else -> {
                erros++
                anotar("reconhecedor: $nome")
                if (codigo == 13 && noAparelho) { noAparelho = false; anotar("o reconhecedor do aparelho não tem português: voltando ao do Google") }
                religar(minOf(5000L, 600L * erros))
            }
        }
    }

    private var avisouOuvindo = false
    override fun onReadyForSpeech(p: Bundle?) {
        if (!avisouOuvindo) { avisouOuvindo = true; anotar("microfone aberto com a tela travada" + (if (noAparelho) " (reconhecedor do aparelho)" else "")) }
    }
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(v: Float) {}
    override fun onBufferReceived(b: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onPartialResults(p: Bundle?) {}
    override fun onEvent(t: Int, p: Bundle?) {}

    private fun processar(alts: List<String>) {
        usadoEm = System.currentTimeMillis()
        val lista = JSONArray()
        alts.take(5).forEach { lista.put(it) }
        js("bolso.ouvir(" + q(lista.toString()) + "," + System.currentTimeMillis() + ")") { texto ->
            val r = try { JSONObject(texto) } catch (e: Exception) { JSONObject() }
            if (r.has("ev")) getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("pend", r.optJSONArray("ev")?.toString() ?: "[]").apply()
            if (r.has("descansoAte")) agendarDescanso(r.optLong("descansoAte", 0L))
            if (r.optBoolean("parar", false)) pararDepoisDeFalar = true
            val fala = r.optString("falar", "")
            anotar(if (fala.isNotEmpty()) "respondi: " + fala.take(90) else "ignorei (sem o nome Jarvis)")
            if (fala.isNotEmpty()) falar(fala)
            else if (pararDepoisDeFalar) encerrar()
            else religar(150L)
        }
    }

    // ---- o descanso, no relógio do Android ----
    private val fimDescanso = Runnable { tocarFim() }
    private val dezSegundos = Runnable { falar("Dez segundos. Prepara.") }

    private fun agendarDescanso(ate: Long) {
        descansoAte = ate
        linha.removeCallbacks(fimDescanso)
        linha.removeCallbacks(dezSegundos)
        if (ate <= 0L) return
        val falta = ate - System.currentTimeMillis()
        if (falta <= 0L) { tocarFim(); return }
        linha.postDelayed(fimDescanso, falta)
        if (falta > 25_000L) linha.postDelayed(dezSegundos, falta - 10_000L)
    }

    private fun tocarFim() {
        somProprioAte = System.currentTimeMillis() + 2500L
        try {
            val tom = ToneGenerator(AudioManager.STREAM_MUSIC, 90)
            tom.startTone(ToneGenerator.TONE_PROP_BEEP2, 180)
            linha.postDelayed({ tom.startTone(ToneGenerator.TONE_PROP_BEEP2, 180) }, 350L)
            linha.postDelayed({ tom.startTone(ToneGenerator.TONE_PROP_ACK, 300) }, 700L)
            linha.postDelayed({ tom.release() }, 1400L)
        } catch (e: Exception) { }
        linha.postDelayed({
            val reserva = fimFalaFixa.ifEmpty { "Descanso acabou." }
            if (!pronto) { falar(reserva); return@postDelayed }
            js("bolso.fimDescanso(" + System.currentTimeMillis() + ")") { texto ->
                falar(texto.ifEmpty { reserva })
            }
        }, 1100L)
    }

    // ---- o ▶ da esteira ----
    // Com a tela travada a página dorme, e os avisos do ▶ (cada km, o último
    // minuto, o boletim de tempo em tempo e o fim) sumiam. A página manda o
    // começo, a duração, a velocidade e as calorias por minuto, e a conta e a
    // fala são feitas aqui, no relógio do Android.
    private var crono: JSONObject? = null
    private var cronoKm = 0
    private var cronoBol = 0
    private var cronoUltimo = false
    private var cronoFalouEm = 0L
    private val cronoTick = object : Runnable {
        override fun run() {
            tickCrono()
            if (crono != null) linha.postDelayed(this, 1000L)
        }
    }

    private fun receberCrono(j: JSONObject) {
        linha.removeCallbacks(cronoTick)
        if (j.optInt("parar", 0) == 1) { crono = null; anotar("▶ parado"); return }
        crono = j
        cronoKm = 0; cronoBol = 0; cronoUltimo = false; cronoFalouEm = System.currentTimeMillis()
        anotar("▶ da esteira: " + j.optInt("total") + " s a " + j.optDouble("kmh", 0.0) + " km/h")
        linha.postDelayed(cronoTick, 1000L)
    }

    private fun falarCrono(texto: String) { cronoFalouEm = System.currentTimeMillis(); falar(texto) }

    private fun tickCrono() {
        val c = crono ?: return
        val total = c.optInt("total", 0)
        val kmh = c.optDouble("kmh", 0.0)
        val feito = ((System.currentTimeMillis() - c.optLong("ini", 0L)) / 1000L).toInt()
        val resta = total - feito
        val km = kmh * feito / 3600.0
        val kcal = c.optDouble("kcalMin", 0.0) * feito / 60.0
        if (resta <= 0) {
            crono = null
            somProprioAte = System.currentTimeMillis() + 2000L
            try {
                val tom = ToneGenerator(AudioManager.STREAM_MUSIC, 90)
                tom.startTone(ToneGenerator.TONE_PROP_BEEP2, 200)
                linha.postDelayed({ tom.startTone(ToneGenerator.TONE_PROP_ACK, 300) }, 300L)
                linha.postDelayed({ tom.release() }, 1000L)
            } catch (e: Exception) { }
            falarCrono("Meta de " + dur(total) + " cumprida." + (if (km >= 0.05) " " + num1(km) + " quilômetros." else "") +
                (if (kcal >= 1) " Cerca de " + Math.round(kcal) + " calorias." else ""))
            return
        }
        val kmInteiro = km.toInt()
        val iv = c.optInt("iv", 0)
        val dm = c.optInt("dm", 0)
        val calado = System.currentTimeMillis() - cronoFalouEm > 15000L
        // por distância: a marca (500 m, 1 km, 2 km) no lugar do aviso do km
        val marca = if (dm > 0) (km * 1000 / dm).toInt() else 0
        if (dm > 0 && marca > cronoBol && resta > 30) {
            val passos = marca - cronoBol
            cronoBol = marca
            val trechoM = dm * passos
            val trechoSeg = if (kmh > 0) Math.round(trechoM / (kmh / 3.6)).toInt() else 0
            val nome = if (trechoM == 1000) "Este quilômetro" else if (trechoM > 1000) "Estes " + num1(trechoM / 1000.0) + " quilômetros" else "Estes $trechoM metros"
            val p = mutableListOf(falaDist(marca * dm / 1000.0) + ".", "$nome em " + dur(trechoSeg) + ".", "Tempo total, " + dur(if (feito >= 60) Math.round(feito / 60.0).toInt() * 60 else feito) + ".")
            if (kmh > 0) p.add("Velocidade " + num1(kmh) + " por hora" + (if (c.optInt("ritmo", 0) == 1) ", ritmo de " + ritmo(60.0 / kmh) else "") + ".")
            if (kcal >= 1) p.add("Cerca de " + Math.round(kcal) + " calorias.")
            p.add("Faltam " + dur(if (resta >= 120) Math.round(resta / 60.0).toInt() * 60 else resta) + ".")
            falarCrono(p.joinToString(" "))
        } else if (dm == 0 && kmInteiro > cronoKm && resta > 30) {
            cronoKm = kmInteiro
            falarCrono(kmInteiro.toString() + (if (kmInteiro == 1) " quilômetro." else " quilômetros.") + " Faltam " + dur(Math.round(resta / 60.0).toInt() * 60) + ".")
        } else if (total >= 300 && resta <= 60 && !cronoUltimo) {
            cronoUltimo = true
            falarCrono("Último minuto.")
        } else if (dm == 0 && iv > 0 && resta > 30 && feito / iv > cronoBol && calado) {
            cronoBol = feito / iv
            val p = mutableListOf(dur(if (feito >= 60) Math.round(feito / 60.0).toInt() * 60 else feito) + ".")
            if (km >= 0.05) p.add(falaDist(km) + ".")
            if (kmh > 0) p.add("Velocidade " + num1(kmh) + " por hora" + (if (c.optInt("ritmo", 0) == 1) ", ritmo de " + ritmo(60.0 / kmh) else "") + ".")
            val incl = c.optDouble("incl", 0.0)
            if (incl > 0) p.add("Inclinação " + num1(incl) + " por cento.")
            if (kcal >= 1) p.add("Cerca de " + Math.round(kcal) + " calorias.")
            p.add("Faltam " + dur(if (resta >= 120) Math.round(resta / 60.0).toInt() * 60 else resta) + ".")
            falarCrono(p.joinToString(" "))
        }
    }

    // "90 segundos" se escreve; "um minuto e meio" se fala (o textoDuracao do site)
    private fun dur(seg: Int): String {
        val s = maxOf(0, seg)
        if (s < 60) return s.toString() + (if (s == 1) " segundo" else " segundos")
        val m = s / 60
        val r = s % 60
        val base = m.toString() + (if (m == 1) " minuto" else " minutos")
        return when { r == 0 -> base; r == 30 -> "$base e meio"; else -> "$base e $r segundos" }
    }
    private fun falaDist(km: Double): String =
        if (km < 1) (Math.round(km * 100) * 10).toString() + " metros"
        else num1(km) + (if (Math.abs(km - 1) < 0.05) " quilômetro" else " quilômetros")
    private fun num1(v: Double): String {
        val r = Math.round(v * 10) / 10.0
        return if (r == Math.floor(r)) r.toLong().toString() else r.toString().replace('.', ',')
    }
    private fun ritmo(minKm: Double): String {
        var m = minKm.toInt()
        var s = Math.round((minKm - m) * 60).toInt()
        if (s == 60) { m++; s = 0 }
        return m.toString() + (if (m == 1) " minuto" else " minutos") + (if (s > 0) " e $s" else "") + " por quilômetro"
    }

    // ---- falar ----
    private fun ligarVoz() {
        tts = TextToSpeech(applicationContext) { st ->
            linha.post {
                val t = tts ?: return@post
                if (st != TextToSpeech.SUCCESS) return@post
                val r = t.setLanguage(Locale("pt", "BR"))
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) t.setLanguage(Locale("pt"))
                t.setAudioAttributes(AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build())
                t.setSpeechRate(1.08f)
                t.setPitch(1.12f)
                t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(id: String?) {}
                    override fun onDone(id: String?) { linha.post { acabouFala() } }
                    @Deprecated("API antiga") override fun onError(id: String?) { linha.post { acabouFala() } }
                    override fun onError(id: String?, codigo: Int) { linha.post { acabouFala() } }
                })
                ttsPronto = true
            }
        }
    }

    private fun falar(texto: String) {
        val t = tts
        if (t == null || !ttsPronto) { linha.postDelayed({ if (ttsPronto) falar(texto) }, 600L); return }
        pararDeOuvir()
        falando++
        val ok = t.speak(texto.take(800), TextToSpeech.QUEUE_ADD, null, "b" + System.nanoTime())
        if (ok != TextToSpeech.SUCCESS) acabouFala()
    }

    private fun acabouFala() {
        falando = maxOf(0, falando - 1)
        somProprioAte = System.currentTimeMillis() + 1500L
        if (falando > 0) return
        if (pararDepoisDeFalar) { encerrar(); return }
        religar(2000L) // a música pausada por alguém volta devagar: espera para vê-la
    }

    // A voz NÃO pede o foco do áudio (pedido do dono: "não mexa com a música do
    // fone e dos óculos"). Com o foco, o tocador de música abaixava ou parava a
    // cada frase; sem ele, a voz entra por cima da música, e a música segue.

    // ---- fim ----
    private fun aviso(): Notification {
        val desligar = PendingIntent.getService(
            this, 0, Intent(this, BolsoService::class.java).setAction(PARAR),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val abrir = PendingIntent.getActivity(
            this, 2, Intent(this, BolsoActivity::class.java).setData(Uri.parse("treinolivre://bolso?entregar=1")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return Notification.Builder(this, CANAL)
            .setContentTitle("🔒 Jarvis ouvindo com a tela travada")
            .setContentText("Diga \"Jarvis, 80 por 10\". Toque para levar as séries ao treino.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(abrir)
            .addAction(Notification.Action.Builder(null, "Desligar", desligar).build())
            .build()
    }

    private fun encerrar() {
        linha.removeCallbacksAndMessages(null)
        try { getSystemService(AudioManager::class.java)?.unregisterAudioPlaybackCallback(espiaoSom) } catch (e: Exception) { }
        try { unregisterReceiver(tela) } catch (e: Exception) { }
        pararDeOuvir()
        try { reconhecedor?.destroy() } catch (e: Exception) { }
        reconhecedor = null
        try { tts?.stop(); tts?.shutdown() } catch (e: Exception) { }
        tts = null
        pararGravador()
        web?.destroy()
        web = null
        try { trava?.let { if (it.isHeld) it.release() } } catch (e: Exception) { }
        instancia = null
        // O que ficou pendente continua guardado: o "Trazer" da tela do treino leva
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        if (instancia === this) encerrar()
        super.onDestroy()
    }
}
