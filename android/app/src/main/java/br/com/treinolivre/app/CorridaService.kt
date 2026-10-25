package br.com.treinolivre.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

// O desafio de corrida com a tela travada. Com a tela travada o Chrome
// suspende a página: o GPS, a conexão com os amigos e a voz param, e os outros
// veem a pessoa parada ("ainda em 0:16"). Aqui quem corre é o app:
//   - o GPS é o do Android (LocationManager), num serviço do tipo localização;
//   - as contas, a conexão com a sala e o que a voz diz são do próprio site,
//     aberto escondido com ?modo=corrida (criarCorridaApp) — o mesmo motor da
//     página, e não um segundo para manter;
//   - o relógio é o daqui: a cada segundo, corrida.tick(). Os relógios da
//     página escondida podem atrasar com a tela travada;
//   - a voz é o TextToSpeech, sem pedir o foco do áudio (a música segue).
// A página visível vira espelho: lê do retransmissor o que este serviço
// publica em nome dela. A notificação mostra a posição e quem está perto, e um
// toque nela abre a página nesta corrida (CorridaActivity ?ver=1).
class CorridaService : Service() {
    companion object {
        const val CANAL = "corrida"
        const val CANAL_FIM = "corrida-fim"
        const val ID = 4811
        const val ID_FIM = 4812
        const val PARAR = "parar"
        const val PAUSAR = "pausar"
        const val RETOMAR = "retomar"
        const val ENCERRAR = "encerrar"
        const val KMH = "kmh"
        const val PREFS = "corrida"
        const val DURACAO_MAX = 5L * 3600 * 1000
        @Volatile var instancia: CorridaService? = null
        fun lerEstado(c: Context): String? = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("estado", null)
    }

    private val linha = Handler(Looper.getMainLooper())
    private var web: WebView? = null
    private var pronto = false
    private var cfg: String? = null
    private var tts: TextToSpeech? = null
    private var ttsPronto = false
    private var trava: PowerManager.WakeLock? = null
    private var gpsLigado = false
    private var fimEm = 0L
    private var ticks = 0
    private var titulo = "🏁 Desafio"
    private var texto = "Preparando a corrida…"

    private val ouvinte = object : LocationListener {
        override fun onLocationChanged(l: Location) {
            if (!pronto) return
            web?.evaluateJavascript("corrida.gps(" + l.latitude + "," + l.longitude + "," + (if (l.hasAccuracy()) l.accuracy else 20f) + "," + System.currentTimeMillis() + ")", null)
        }
        @Deprecated("API antiga") override fun onStatusChanged(p: String?, s: Int, e: Bundle?) {}
        override fun onProviderEnabled(p: String) {}
        override fun onProviderDisabled(p: String) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel(CANAL, "Desafio com a tela travada", NotificationManager.IMPORTANCE_LOW))
            nm.createNotificationChannel(NotificationChannel(CANAL_FIM, "Chegada do desafio", NotificationManager.IMPORTANCE_HIGH))
            startForeground(ID, aviso(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } catch (e: Exception) {
            android.util.Log.w("TreinoLivre", "Corrida: não ligou (" + e.message + ")")
            stopSelf()
            return START_NOT_STICKY
        }
        // Sem intent e sem corrida rodando é o sistema religando um serviço que
        // morreu: só deixaria uma notificação parada.
        if (intent == null && web == null) { encerrar(); return START_NOT_STICKY }
        instancia = this
        when (intent?.action) {
            PARAR -> { encerrar(); return START_NOT_STICKY }
            PAUSAR -> { js("corrida.pausar()"); return START_STICKY }
            RETOMAR -> { js("corrida.retomar()"); return START_STICKY }
            ENCERRAR -> { js("corrida.encerrar()"); return START_STICKY }
            KMH -> { val v = intent?.getStringExtra("v")?.toDoubleOrNull(); if (v != null) js("corrida.kmh($v)"); return START_STICKY }
        }
        val novo = intent?.getStringExtra("cfg")
        if (novo != null) {
            cfg = novo
            fimEm = 0L
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove("estado").apply()
            if (web == null) ligar() else if (pronto) iniciarCorrida()
        }
        return START_STICKY
    }

    private fun ligar() {
        val pm = getSystemService(PowerManager::class.java)
        // Com a tela travada a CPU dorme: o relógio da corrida pararia
        trava = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TreinoLivre:corrida").apply { acquire(DURACAO_MAX) }
        linha.postDelayed({ encerrar() }, DURACAO_MAX)
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
        w.layout(0, 0, 360, 640)
        w.loadUrl(Site.ENDERECO + "?modo=corrida")
        var tentativas = 0
        val conferir = object : Runnable {
            override fun run() {
                val atual = web ?: return
                atual.evaluateJavascript("typeof window.corrida==='object'") { r ->
                    if (r == "true") { pronto = true; iniciarCorrida(); linha.post(relogio) }
                    else if (++tentativas < 120) linha.postDelayed(this, 500L)
                    else { texto = "Não consegui carregar a corrida (sem internet?). Deixe a tela ligada."; atualizar(); }
                }
            }
        }
        linha.postDelayed(conferir, 800L)
    }

    private fun iniciarCorrida() {
        val c = cfg ?: return
        js("corrida.iniciar(" + JSONObject.quote(c) + ")")
        val esteira = try { JSONObject(c).optString("am") == "esteira" } catch (e: Exception) { false }
        if (esteira) desligarGps() else ligarGps()
    }

    private fun js(codigo: String, depois: ((String) -> Unit)? = null) {
        val w = web ?: return
        if (!pronto) return
        w.evaluateJavascript(codigo) { r ->
            if (depois == null) return@evaluateJavascript
            val t = try { if (r == null || r == "null") "" else JSONArray("[$r]").optString(0, "") } catch (e: Exception) { "" }
            depois(t)
        }
    }

    // ---- o relógio da corrida ----
    private val relogio = object : Runnable {
        override fun run() {
            js("corrida.tick()") { r -> processar(r) }
            if (++ticks % 5 == 0) guardarEstado()
            linha.postDelayed(this, 1000L)
        }
    }

    private fun guardarEstado() {
        js("corrida.estado()") { r -> if (r.length > 2) getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("estado", r).apply() }
    }

    private fun processar(r: String) {
        val o = try { JSONObject(r) } catch (e: Exception) { return }
        val falas = o.optJSONArray("falas")
        if (falas != null) for (i in 0 until falas.length()) {
            val t = falas.optJSONObject(i)?.optString("texto").orEmpty()
            if (t.isNotEmpty()) falar(t)
        }
        if (o.has("espera")) {
            titulo = "🏁 Largada em " + o.optInt("espera") + " s"
            texto = "Pode travar a tela e guardar no bolso."
            atualizar()
            return
        }
        val fim = o.optBoolean("fim") || o.optBoolean("encerrado")
        if (fim) {
            if (fimEm == 0L) {
                fimEm = System.currentTimeMillis()
                desligarGps()
                guardarEstado()
                // ainda publica o resultado por uns segundos, e então para
                linha.postDelayed({ terminar(o.optBoolean("fim")) }, 20000L)
            }
            return
        }
        val km = o.optDouble("km", 0.0)
        val t = o.optLong("t", 0L) / 1000
        val total = o.optInt("total", 1)
        titulo = (if (o.optBoolean("pausado")) "⏸ Pausado · " else "🏁 ") +
            (if (total > 1) o.optInt("pos", 1).toString() + "º de " + total + " · " else "") +
            String.format(Locale("pt", "BR"), "%.2f km", km) + " · " + String.format(Locale.ROOT, "%d:%02d", t / 60, t % 60)
        texto = o.optString("linha").ifEmpty { "Só você por enquanto: quem entrar na sala aparece aqui." }
        atualizar()
    }

    // ---- o GPS ----
    private fun ligarGps() {
        if (gpsLigado) return
        val ok = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!ok) { texto = "Sem a permissão de localização precisa: a distância não é medida."; atualizar(); return }
        try {
            val lm = getSystemService(LocationManager::class.java)
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, ouvinte, Looper.getMainLooper())
            gpsLigado = true
        } catch (e: SecurityException) { } catch (e: Exception) { }
    }

    private fun desligarGps() {
        if (!gpsLigado) return
        try { getSystemService(LocationManager::class.java).removeUpdates(ouvinte) } catch (e: Exception) { }
        gpsLigado = false
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
                t.setPitch(1.08f)
                ttsPronto = true
            }
        }
    }

    // Sem pedir o foco do áudio: a música do fone e dos óculos segue (pedido do dono)
    private fun falar(texto: String) {
        val t = tts
        if (t == null || !ttsPronto) { linha.postDelayed({ if (ttsPronto) falar(texto) }, 600L); return }
        t.speak(texto.take(800), TextToSpeech.QUEUE_ADD, null, "c" + System.nanoTime())
    }

    // ---- a notificação ----
    private fun abrirCorrida(): PendingIntent = PendingIntent.getActivity(
        this, 3, Intent(this, CorridaActivity::class.java).setData(Uri.parse("treinolivre://corrida?ver=1")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun aviso(): Notification {
        val parar = PendingIntent.getService(
            this, 4, Intent(this, CorridaService::class.java).setAction(ENCERRAR),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return Notification.Builder(this, CANAL)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setStyle(Notification.BigTextStyle().bigText(texto))
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(abrirCorrida())
            .addAction(Notification.Action.Builder(null, "Encerrar a corrida", parar).build())
            .build()
    }

    private fun atualizar() {
        try { getSystemService(NotificationManager::class.java).notify(ID, aviso()) } catch (e: Exception) { }
    }

    private fun terminar(chegou: Boolean) {
        guardarEstado()
        linha.postDelayed({
            try {
                val n = Notification.Builder(this, CANAL_FIM)
                    .setContentTitle(if (chegou) "🏁 Chegada! " + titulo.removePrefix("🏁 ") else "Corrida encerrada")
                    .setContentText("Toque para ver a classificação e salvar no histórico.")
                    .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                    .setAutoCancel(true)
                    .setContentIntent(abrirCorrida())
                    .build()
                getSystemService(NotificationManager::class.java).notify(ID_FIM, n)
            } catch (e: Exception) { }
            // deixa a voz terminar a frase da chegada
            linha.postDelayed({ encerrar() }, 8000L)
        }, 1500L)
    }

    private fun encerrar() {
        linha.removeCallbacksAndMessages(null)
        desligarGps()
        try { web?.evaluateJavascript("corrida.fechar()", null) } catch (e: Exception) { }
        val w = web
        web = null
        pronto = false
        linha.postDelayed({ try { w?.destroy() } catch (e: Exception) { } }, 1500L)
        try { tts?.stop(); tts?.shutdown() } catch (e: Exception) { }
        tts = null
        try { trava?.let { if (it.isHeld) it.release() } } catch (e: Exception) { }
        instancia = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        if (instancia === this) encerrar()
        super.onDestroy()
    }
}
