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
import android.media.AudioFocusRequest
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
        const val PREFS = "bolso"
        private const val DURACAO_MAX = 4 * 3600_000L

        @SuppressLint("StaticFieldLeak")
        @Volatile var instancia: BolsoService? = null

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
    private var foco: AudioFocusRequest? = null
    private var pararDepoisDeFalar = false
    private var inicio = 0L

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
        instancia = this
        val p = getSharedPreferences(PREFS, MODE_PRIVATE)
        val snap = intent?.getStringExtra("snap")
        if (snap != null) {
            // Cópia nova da página: o que já foi entregue (aplicar) está nela
            // depois que a página aplicar; nada mais pendente.
            p.edit().putString("snap", snap)
                .putString("aplicado", intent?.getStringExtra("aplicar") ?: "[]")
                .putString("pend", "[]").apply()
            avisouPrimeira = false
        }
        if (inicio == 0L) {
            inicio = System.currentTimeMillis()
            ligar()
        } else if (pronto) iniciarPagina()
        return START_STICKY
    }

    private fun ligar() {
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
                    if (r == "true") { pronto = true; iniciarPagina(); if (travada) ouvir() }
                    else if (++tentativas < 120) linha.postDelayed(this, 500L)
                    else android.util.Log.w("TreinoLivre", "Bolso: a página não carregou")
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
    private fun aoTravar() {
        if (travada) return
        travada = true
        if (!avisouPrimeira && pronto) {
            avisouPrimeira = true
            falar("Jarvis no bolso. Estou ouvindo.")
        } else ouvir()
    }

    private fun aoDestravar() {
        if (!travada) return
        travada = false
        pararDeOuvir()
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
    private fun ouvir() {
        if (!travada || !pronto || ouvindo || falando > 0 || pararDepoisDeFalar) return
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            android.util.Log.w("TreinoLivre", "Bolso: sem reconhecimento de voz no aparelho")
            return
        }
        val r = reconhecedor ?: SpeechRecognizer.createSpeechRecognizer(this).also {
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
        silenciarBipe()
        try {
            r.startListening(pedido)
            ouvindo = true
        } catch (e: Exception) {
            ouvindo = false
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
        try { reconhecedor?.cancel() } catch (e: Exception) { }
    }

    private fun religar(ms: Long) {
        linha.postDelayed({ ouvir() }, ms)
    }

    override fun onResults(resultados: Bundle?) {
        ouvindo = false
        erros = 0
        val alts = resultados?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (alts.isNullOrEmpty()) { religar(250L); return }
        processar(alts)
    }

    override fun onError(codigo: Int) {
        ouvindo = false
        when (codigo) {
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> religar(250L)
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                android.util.Log.w("TreinoLivre", "Bolso: sem permissão do microfone")
                falar("Não tenho permissão para usar o microfone com a tela travada.")
            }
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_CLIENT -> {
                try { reconhecedor?.destroy() } catch (e: Exception) { }
                reconhecedor = null
                religar(800L)
            }
            else -> { erros++; religar(minOf(5000L, 600L * erros)) }
        }
    }

    override fun onReadyForSpeech(p: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(v: Float) {}
    override fun onBufferReceived(b: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onPartialResults(p: Bundle?) {}
    override fun onEvent(t: Int, p: Bundle?) {}

    private fun processar(alts: List<String>) {
        val lista = JSONArray()
        alts.take(5).forEach { lista.put(it) }
        js("bolso.ouvir(" + q(lista.toString()) + "," + System.currentTimeMillis() + ")") { texto ->
            val r = try { JSONObject(texto) } catch (e: Exception) { JSONObject() }
            if (r.has("ev")) getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("pend", r.optJSONArray("ev")?.toString() ?: "[]").apply()
            if (r.has("descansoAte")) agendarDescanso(r.optLong("descansoAte", 0L))
            if (r.optBoolean("parar", false)) pararDepoisDeFalar = true
            val fala = r.optString("falar", "")
            if (fala.isNotEmpty()) falar(fala)
            else if (pararDepoisDeFalar) encerrar()
            else religar(150L)
        }
    }

    // ---- o descanso, no relógio do Android ----
    private val fimDescanso = Runnable { tocarFim() }
    private val dezSegundos = Runnable { falar("Dez segundos. Prepara.") }

    private fun agendarDescanso(ate: Long) {
        linha.removeCallbacks(fimDescanso)
        linha.removeCallbacks(dezSegundos)
        if (ate <= 0L) return
        val falta = ate - System.currentTimeMillis()
        if (falta <= 0L) { tocarFim(); return }
        linha.postDelayed(fimDescanso, falta)
        if (falta > 25_000L) linha.postDelayed(dezSegundos, falta - 10_000L)
    }

    private fun tocarFim() {
        try {
            val tom = ToneGenerator(AudioManager.STREAM_MUSIC, 90)
            tom.startTone(ToneGenerator.TONE_PROP_BEEP2, 180)
            linha.postDelayed({ tom.startTone(ToneGenerator.TONE_PROP_BEEP2, 180) }, 350L)
            linha.postDelayed({ tom.startTone(ToneGenerator.TONE_PROP_ACK, 300) }, 700L)
            linha.postDelayed({ tom.release() }, 1400L)
        } catch (e: Exception) { }
        linha.postDelayed({
            js("bolso.fimDescanso(" + System.currentTimeMillis() + ")") { texto ->
                if (texto.isNotEmpty()) falar(texto)
            }
        }, 1100L)
    }

    // ---- falar ----
    private fun ligarVoz() {
        tts = TextToSpeech(applicationContext) { st ->
            linha.post {
                val t = tts ?: return@post
                if (st != TextToSpeech.SUCCESS) return@post
                val r = t.setLanguage(Locale("pt", "BR"))
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) t.setLanguage(Locale("pt"))
                // Como a voz do GPS: a música abaixa enquanto ele fala, e volta
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
        if (falando == 0) pedirFoco()
        falando++
        val ok = t.speak(texto.take(800), TextToSpeech.QUEUE_ADD, null, "b" + System.nanoTime())
        if (ok != TextToSpeech.SUCCESS) acabouFala()
    }

    private fun acabouFala() {
        falando = maxOf(0, falando - 1)
        if (falando > 0) return
        largarFoco()
        if (pararDepoisDeFalar) { encerrar(); return }
        religar(300L)
    }

    private fun pedirFoco() {
        val am = getSystemService(AudioManager::class.java) ?: return
        val f = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build())
            .build()
        foco = f
        try { am.requestAudioFocus(f) } catch (e: Exception) { }
    }

    private fun largarFoco() {
        val am = getSystemService(AudioManager::class.java) ?: return
        foco?.let { try { am.abandonAudioFocusRequest(it) } catch (e: Exception) { } }
        foco = null
    }

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
        try { unregisterReceiver(tela) } catch (e: Exception) { }
        pararDeOuvir()
        try { reconhecedor?.destroy() } catch (e: Exception) { }
        reconhecedor = null
        try { tts?.stop(); tts?.shutdown() } catch (e: Exception) { }
        tts = null
        largarFoco()
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
