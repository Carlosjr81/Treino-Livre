package br.com.treinolivre.app

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import android.net.Uri
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.annotation.SuppressLint
import android.content.Intent
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.core.types.RegistrationState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

// O 👓 do Eyes Scan: treinolivre://oculos?k=<chave>.
// Prepara o que só uma tela consegue pedir — o Bluetooth do Android, o
// registro do Treino Livre no app Meta AI e a câmera dos óculos — e entrega
// o resto ao OculosService, que segue rodando com o site de volta na frente.
// A tela some sozinha: o Eyes Scan continua aberto atrás dela, esperando.
class OculosActivity : ComponentActivity() {
    private var chave = ""

    private val pedirBluetooth = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        lifecycleScope.launch { seguir() }
    }
    // O Meta AI pode devolver a resposta antes de a pessoa tocar em "Permitir"
    // (quando ele abre em tarefa própria). Antes de desistir, confere de novo,
    // algumas vezes, a permissão de verdade.
    private val pedirCamera = registerForActivityResult(Wearables.RequestPermissionContract()) { resultado ->
        val status = resultado.getOrDefault(PermissionStatus.Denied)
        if (status == PermissionStatus.Granted) { ligarServico(); return@registerForActivityResult }
        lifecycleScope.launch {
            repeat(10) {
                kotlinx.coroutines.delay(1500L)
                var ok = false
                Wearables.checkPermissionStatus(Permission.CAMERA)
                    .onSuccess { st -> ok = st == PermissionStatus.Granted }
                    .onFailure { _, _ -> ok = false }
                if (ok) { ligarServico(); return@launch }
            }
            Oculos.estado = "sem-permissao"
            aviso("Óculos: a câmera dos óculos não foi liberada no Meta AI.")
            finish()
        }
    }

    private lateinit var texto: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        texto = TextView(this).apply {
            text = "Ligando os óculos…"
            setTextColor(Color.WHITE)
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(Color.parseColor("#16161D"))
            addView(ProgressBar(this@OculosActivity))
            addView(texto)
        })
        if (savedInstanceState != null) return
        chave = intent?.data?.getQueryParameter("k").orEmpty().take(64)
        if (chave.length < 16) { finish(); return }
        Oculos.estado = "iniciando"

        val faltam = permissoesBluetooth().filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (faltam.isNotEmpty()) pedirBluetooth.launch(faltam.toTypedArray())
        else lifecycleScope.launch { seguir() }
    }

    private fun permissoesBluetooth(): List<String> =
        if (Build.VERSION.SDK_INT >= 31) listOf(Manifest.permission.BLUETOOTH_CONNECT) else emptyList()

    private fun aviso(msg: String) = Toast.makeText(applicationContext, msg, Toast.LENGTH_LONG).show()

    private suspend fun seguir() {
        try { seguirPassos() } catch (e: Exception) {
            Oculos.estado = "erro"
            aviso("Óculos: " + (e.message ?: e.javaClass.simpleName))
            finish()
        }
    }

    private suspend fun seguirPassos() {
        if (permissoesBluetooth().any { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }) {
            aviso("Óculos: sem a permissão de dispositivos próximos (Bluetooth), não dá para falar com os óculos.")
            Oculos.estado = "erro"; finish(); return
        }
        if (!Oculos.iniciar(applicationContext)) { aviso("Óculos: o kit da Meta não iniciou."); Oculos.estado = "erro"; finish(); return }

        // 1. o Treino Livre registrado no app Meta AI (uma vez só)
        val atual = Wearables.registrationState.first()
        if (atual != RegistrationState.REGISTERED) {
            Oculos.estado = "registrando"
            texto.text = "Confirme o Treino Livre no app Meta AI e volte para cá."
            Wearables.startRegistration(this)
            val ok = withTimeoutOrNull(120_000L) {
                Wearables.registrationState.first { it == RegistrationState.REGISTERED }
            }
            if (ok == null) { aviso("Óculos: o Treino Livre não foi confirmado no app Meta AI."); Oculos.estado = "erro"; finish(); return }
            aviso("Óculos: Treino Livre confirmado no Meta AI ✓")
        }

        // 2. a câmera dos óculos liberada para o Treino Livre
        texto.text = "Conferindo a câmera dos óculos…"
        var liberada = false
        Wearables.checkPermissionStatus(Permission.CAMERA)
            .onSuccess { status -> liberada = status == PermissionStatus.Granted }
            .onFailure { _, _ -> liberada = false }
        if (liberada) ligarServico()
        else {
            Oculos.estado = "permissao"
            pedirCamera.launch(Permission.CAMERA)
        }
    }

    private fun ligarServico() {
        OculosService.ligar(this, chave)
        abrirScanner()
    }

    // ---- o Eyes Scan dentro do app ----
    // O Chrome barrou os dois caminhos entre o app e a página aberta nele (a
    // rede local e o canal de mensagens). Aqui a página do scanner roda num
    // navegador do próprio app, e o quadro passa pela ponte `OculosNativo`.
    private var web: WebView? = null
    private var lancadorVolta: com.google.androidbrowserhelper.trusted.TwaLauncher? = null
    private var cobertura: android.view.View? = null

    // ---- a voz ----
    // O WebView não tem a voz do navegador, e a contagem em voz alta saía só
    // no bipe. A página fala pela ponte (falar/calar) e a voz do Android toca
    // no som do aparelho — com os óculos pareados, nos alto-falantes deles.
    // Cada fala devolve o fim à página (__fimFalaOculos), porque a fila do
    // técnico e a contagem esperam uma frase acabar para dizer a seguinte.
    private var tts: TextToSpeech? = null
    private var ttsPronto = false
    private var ttsFalhou = false
    private val ttsEspera = mutableListOf<Triple<String, String, FloatArray>>()

    private fun avisarFimFala(id: String, erro: Boolean) {
        if (!Regex("^f\\d{1,9}$").matches(id)) return
        runOnUiThread { web?.evaluateJavascript("window.__fimFalaOculos&&window.__fimFalaOculos('" + id + "'," + erro + ")", null) }
    }

    private fun ligarVoz() {
        if (tts != null) return
        tts = TextToSpeech(applicationContext) { st ->
            runOnUiThread {
                val t = tts
                if (st != TextToSpeech.SUCCESS || t == null) {
                    ttsFalhou = true
                    ttsEspera.forEach { avisarFimFala(it.first, true) }
                    ttsEspera.clear()
                    return@runOnUiThread
                }
                val r = t.setLanguage(Locale("pt", "BR"))
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) t.setLanguage(Locale("pt"))
                t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(id: String?) {}
                    override fun onDone(id: String?) = avisarFimFala(id ?: "", false)
                    @Deprecated("API antiga") override fun onError(id: String?) = avisarFimFala(id ?: "", true)
                    override fun onError(id: String?, codigo: Int) = avisarFimFala(id ?: "", true)
                    override fun onStop(id: String?, interrompida: Boolean) = avisarFimFala(id ?: "", true)
                })
                ttsPronto = true
                ttsEspera.forEach { dizer(it.first, it.second, it.third[0], it.third[1]) }
                ttsEspera.clear()
            }
        }
    }

    private fun dizer(id: String, texto: String, vel: Float, tom: Float) {
        val t = tts ?: return avisarFimFala(id, true)
        t.setSpeechRate(vel.coerceIn(0.5f, 2.5f))
        t.setPitch(tom.coerceIn(0.5f, 2f))
        val ok = t.speak(texto.take(600), TextToSpeech.QUEUE_ADD, null, id)
        if (ok != TextToSpeech.SUCCESS) avisarFimFala(id, true)
    }

    private fun tirarEspera() {
        val c = cobertura ?: return
        cobertura = null
        c.animate().alpha(0f).setDuration(200L).withEndAction { (c.parent as? android.view.ViewGroup)?.removeView(c) }.start()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun abrirScanner() {
        if (web != null) return
        Oculos.coresInvertidas = getSharedPreferences("oculos", MODE_PRIVATE).getBoolean("cores_invertidas", false)
        ligarVoz()
        aviso("Óculos: abrindo o Eyes Scan")
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val p = intent?.data
        val campos = listOf("ex", "nome", "grupo", "func", "reps", "peso", "serie", "total", "esp", "contar", "auto")
        val q = StringBuilder("modo=oculos")
        for (c in campos) {
            val v = p?.getQueryParameter(c)
            if (!v.isNullOrEmpty()) q.append("&").append(c).append("=").append(Uri.encode(v))
        }
        val w = WebView(this)
        web = w
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.setBackgroundColor(Color.BLACK)
        w.webViewClient = WebViewClient()
        w.webChromeClient = WebChromeClient()
        w.addJavascriptInterface(Ponte(), "OculosNativo")
        // A página carrega (tela de carregamento do site, vídeo vazio) por baixo
        // de uma tela preta daqui; ela sai quando a imagem dos óculos está na
        // tela (`pronto()`), ou em 30 s, para um erro da página ficar visível.
        val raiz = android.widget.FrameLayout(this)
        raiz.addView(w)
        val espera = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.BLACK)
            addView(ProgressBar(this@OculosActivity))
            addView(TextView(this@OculosActivity).apply {
                text = "👓 Ligando os óculos…"
                setTextColor(Color.WHITE)
                textSize = 17f
                gravity = Gravity.CENTER
                setPadding(0, 28, 0, 0)
            })
        }
        cobertura = espera
        raiz.addView(espera)
        setContentView(raiz)
        android.os.Handler(mainLooper).postDelayed({ tirarEspera() }, 30_000L)
        w.loadUrl(Site.ENDERECO + "?" + q)
        // Na primeira vez, o reconhecimento (8 MB) ainda baixa antes de pedir o
        // primeiro quadro: sem isto, o serviço acharia que ninguém quer a imagem.
        val batida = android.os.Handler(mainLooper)
        val bater = object : Runnable {
            override fun run() {
                if (web == null) return
                Oculos.ultimoPedido = System.currentTimeMillis()
                batida.postDelayed(this, 5000L)
            }
        }
        batida.post(bater)
    }

    inner class Ponte {
        @Volatile private var ultimo = -1L

        // O quadro mais novo, em base64; vazio se não chegou outro desde a última vez.
        @JavascriptInterface fun quadro(): String {
            Oculos.ultimoPedido = System.currentTimeMillis()
            val n = Oculos.numero
            val q = Oculos.quadro ?: return ""
            if (n == ultimo) return ""
            ultimo = n
            return android.util.Base64.encodeToString(q, android.util.Base64.NO_WRAP)
        }

        @JavascriptInterface fun estado(): String = Oculos.estado

        // A voz: a página chama como chamaria o speechSynthesis do navegador
        @JavascriptInterface fun falar(id: String, texto: String, velocidade: Double, tom: Double) {
            runOnUiThread {
                when {
                    ttsFalhou -> avisarFimFala(id, true)
                    !ttsPronto -> ttsEspera.add(Triple(id, texto, floatArrayOf(velocidade.toFloat(), tom.toFloat())))
                    else -> dizer(id, texto, velocidade.toFloat(), tom.toFloat())
                }
            }
        }

        @JavascriptInterface fun calar() {
            runOnUiThread {
                ttsEspera.forEach { avisarFimFala(it.first, true) }
                ttsEspera.clear()
                tts?.stop()
            }
        }

        // 🎨: troca as cores (U e V) e guarda a escolha para as próximas vezes
        @JavascriptInterface fun trocarCores(): Boolean {
            Oculos.coresInvertidas = !Oculos.coresInvertidas
            getSharedPreferences("oculos", MODE_PRIVATE).edit().putBoolean("cores_invertidas", Oculos.coresInvertidas).apply()
            return Oculos.coresInvertidas
        }

        // A imagem dos óculos chegou à tela da página: sai a tela de espera
        @JavascriptInterface fun pronto() {
            runOnUiThread { tirarEspera() }
        }

        // A série contada volta ao treino, no link (#oculosSerie=)
        @JavascriptInterface fun registrar(json: String) {
            runOnUiThread {
                pararOculos()
                // Reabre a MESMA página do treino, com a sessão do app: para o
                // Chrome é o mesmo endereço com outro fragmento (#oculosSerie=),
                // e ele não recarrega. Fechar a tarefa e abrir de novo remontava
                // o site inteiro — segundos de tela de carregamento.
                val uri = Uri.parse(Site.ENDERECO + "?app=android#oculosSerie=" + Site.codificar(json))
                Site.abrir(this@OculosActivity, uri, { lancadorVolta = it }) { finish() }
            }
        }

        @JavascriptInterface fun fechar() {
            runOnUiThread { pararOculos(); finish() }
        }
    }

    private fun pararOculos() {
        try {
            startService(Intent(this, OculosService::class.java).setAction(OculosService.PARAR))
        } catch (e: Exception) { }
    }

    @Deprecated("o voltar do sistema fecha a câmera dos óculos")
    override fun onBackPressed() {
        if (web != null) pararOculos()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        lancadorVolta?.destroy()
        web?.destroy()
        web = null
        super.onDestroy()
    }
}
