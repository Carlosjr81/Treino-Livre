package br.com.treinolivre.relogio

import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import java.net.Inet4Address

// A tela de atualizar, no relógio (pedido do dono, 2026-11-13b: "atualizar só
// com cliques"). Abre sozinha quando o celular vai instalar a versão nova
// (treinolivre://relogio-atualizar) ou pelo ⬆ Atualizar da tela do treino.
//
// O relógio só aceita app de fora da loja pela Depuração por Wi-Fi. Então esta
// tela: liga o Wi-Fi do relógio (ele fica desligado enquanto o Bluetooth basta),
// liga a Depuração ADB e a por Wi-Fi ela mesma (com a permissão
// WRITE_SECURE_SETTINGS, que o celular dá pelo ADB ao instalar), e manda ao
// celular o endereço do relógio no Wi-Fi e a porta. O celular instala.
//
// O painel (2026-11-20j, pedido do dono: "o relógio travou nesta tela;
// centralizar a informação e colocar avanço de status em percentual com
// dashboard"): um anel na borda com a porcentagem no meio, a etapa e a lista
// do que já foi feito. Os primeiros 15% são do relógio (Wi-Fi, depuração,
// porta); o resto vem do celular ("/treino/progresso": "pct|etapa|texto").
// E nunca fica parada calada: sem notícia do celular, diz o que fazer.
class PreparaAtualizacao : ComponentActivity() {
    private val linha = Handler(Looper.getMainLooper())
    private lateinit var anel: AnelAtualizacao
    private lateinit var pctTexto: TextView
    private lateinit var etapaTexto: TextView
    private lateinit var listaTexto: TextView
    private lateinit var abrir: Button
    private lateinit var deNovo: Button
    private var ultimoIp = ""
    @Volatile private var procurando = false
    private var procurouEm = 0L
    private var temWifi = false
    private var temDepuracao = false
    private var temPorta = false
    private var pct = 0
    private var etapaCelular = ""
    private var notiCelularEm = 0L
    private val abertoEm = SystemClock.elapsedRealtime()

    private val ouvinte = MessageClient.OnMessageReceivedListener { m: MessageEvent ->
        if (m.path != "/treino/progresso") return@OnMessageReceivedListener
        val t = String(m.data, Charsets.UTF_8).split("|", limit = 3)
        val p = t.getOrNull(0)?.toIntOrNull() ?: return@OnMessageReceivedListener
        linha.post { doCelular(p, t.getOrNull(1) ?: "", t.getOrNull(2) ?: "") }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val largura = resources.displayMetrics.widthPixels
        val redonda = resources.configuration.isScreenRound
        val margem = (largura * (if (redonda) 0.17 else 0.08)).toInt()
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false, t: String = "") = TextView(this).apply {
            textSize = tam; setTextColor(cor); gravity = Gravity.CENTER; text = t
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        fun botao(rotulo: String, cheio: Boolean, acao: () -> Unit) = Button(this).apply {
            text = rotulo; isAllCaps = false; textSize = 13f
            setTypeface(typeface, Typeface.BOLD); setTextColor(Color.WHITE)
            stateListAnimator = null; minHeight = dp(36); minimumHeight = dp(36)
            setPadding(dp(10), 0, dp(10), 0)
            background = if (cheio) GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO)).apply { cornerRadius = dp(20).toFloat() }
            else GradientDrawable().apply { cornerRadius = dp(20).toFloat(); setColor(Color.parseColor("#2A2A33")) }
            visibility = View.GONE
            setOnClickListener { acao() }
        }

        anel = AnelAtualizacao(this)
        val coluna = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(margem, margem, margem, margem)
        }
        coluna.addView(texto(10f, Cores.OURO, true, "⬆ ATUALIZANDO O APP"))
        pctTexto = texto(34f, Color.WHITE, true, "0%")
        coluna.addView(pctTexto)
        etapaTexto = texto(12f, Color.WHITE, false, "Ligando o Wi-Fi…").apply { setPadding(0, dp(2), 0, dp(4)) }
        coluna.addView(etapaTexto)
        listaTexto = texto(10f, Cores.CINZA).apply { setLineSpacing(0f, 1.15f) }
        coluna.addView(listaTexto)
        abrir = botao("Abrir as opções", true) { abrirOpcoes() }
        deNovo = botao("🔁 Tentar de novo", false) { tentarDeNovo() }
        val lpB = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4) }
        coluna.addView(abrir, lpB)
        coluna.addView(deNovo, LinearLayout.LayoutParams(lpB))
        val raiz = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        raiz.addView(anel, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        raiz.addView(coluna, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(raiz)

        WifiDoRelogio.pedir(this) { ip -> mandarIp(ip) }
        temDepuracao = ligarDepuracao()
        if (!temDepuracao) abrir.visibility = View.VISIBLE
        WifiDoRelogio.ipAtual(this)?.let { mandarIp(it) }
        mostrar()
        // de tempos em tempos: manda de novo (o celular pode ter aberto depois)
        // e confere se a tela não ficou parada sem notícia
        linha.postDelayed(object : Runnable {
            override fun run() {
                if (isFinishing || isDestroyed) return
                WifiDoRelogio.ipAtual(this@PreparaAtualizacao)?.let { mandarIp(it, true) }
                if (temPermissao()) temDepuracao = ligarDepuracao()
                mostrar()
                linha.postDelayed(this, 5_000L)
            }
        }, 5_000L)
    }

    override fun onResume() {
        super.onResume()
        try { Wearable.getMessageClient(this).addListener(ouvinte) } catch (e: Exception) { }
        // voltou das opções: confere se a depuração ficou ligada
        if (!temDepuracao && depuracaoLigada()) { temDepuracao = true; abrir.visibility = View.GONE; WifiDoRelogio.ipAtual(this)?.let { mandarIp(it, true) } }
        mostrar()
    }

    override fun onPause() {
        super.onPause()
        try { Wearable.getMessageClient(this).removeListener(ouvinte) } catch (e: Exception) { }
    }

    // O que o celular conta. Pronto: o app novo toma o lugar deste e abre
    // sozinho; esta tela some com a instalação.
    private fun doCelular(p: Int, etapa: String, texto: String) {
        notiCelularEm = SystemClock.elapsedRealtime()
        etapaCelular = etapa
        if (etapa == "codigo" || etapa == "erro") {
            pctTexto.setTextColor(Cores.AMARELO)
            anel.cor(Cores.AMARELO)
        } else {
            pctTexto.setTextColor(if (etapa == "pronto") Cores.VERDE else Color.WHITE)
            anel.cor(if (etapa == "pronto") Cores.VERDE else 0)
        }
        // o relógio fica com 15%; o celular anda de 15 a 100
        val novo = if (etapa == "pronto") 100 else 15 + p * 85 / 100
        if (novo > pct || etapa == "codigo" || etapa == "erro") pct = maxOf(pct, novo)
        anel.ir(pct / 100f)
        pctTexto.text = "$pct%"
        etapaTexto.text = when (etapa) {
            "codigo" -> "🔑 Falta o código: abra Parear novo dispositivo e digite o código no celular"
            "erro" -> texto.ifEmpty { "Parou no celular: veja lá o motivo" }
            "pronto" -> "✅ Pronto! O app novo abre já"
            else -> texto
        }
        abrir.text = if (etapa == "codigo") "Abrir a Depuração" else "Abrir as opções"
        abrir.visibility = if (etapa == "codigo" || !temDepuracao) View.VISIBLE else View.GONE
        deNovo.visibility = if (etapa == "erro") View.VISIBLE else View.GONE
        if (etapa == "pronto" || etapa == "erro" || etapa == "codigo") AlertaRelogio.vibrar(this, longArrayOf(0, 120, 90, 120))
        mostrarLista()
    }

    // O que o relógio sabe sozinho (antes de o celular contar), e o tempo
    // sem notícia: nunca uma tela parada sem dizer nada.
    private fun mostrar() {
        if (etapaCelular.isEmpty() || etapaCelular == "erro") {
            val local = (if (temWifi) 5 else 0) + (if (temDepuracao) 5 else 0) + (if (temPorta) 5 else 0)
            if (etapaCelular.isEmpty() && local > pct) { pct = local; anel.ir(pct / 100f); pctTexto.text = "$pct%" }
        }
        val semNoticia = (SystemClock.elapsedRealtime() - (if (notiCelularEm > 0) notiCelularEm else abertoEm)) / 1000
        if (etapaCelular.isEmpty()) {
            etapaTexto.text = when {
                !temWifi -> "Ligando o Wi-Fi…"
                !temDepuracao -> "Toque em Abrir as opções e ligue a Depuração por Wi-Fi"
                semNoticia > 45 -> "O celular ainda não começou. Abra o Treino Livre no celular e toque em Atualizar o relógio"
                else -> "Esperando o celular começar…"
            }
            deNovo.visibility = if (semNoticia > 45) View.VISIBLE else View.GONE
        } else if (etapaCelular != "pronto" && etapaCelular != "codigo" && etapaCelular != "erro" && semNoticia > 90) {
            etapaTexto.text = "Sem notícia do celular há " + semNoticia + " s. Confira se o Treino Livre continua aberto nele"
            deNovo.visibility = View.VISIBLE
        }
        mostrarLista()
    }

    private fun mostrarLista() {
        fun m(ok: Boolean, t: String) = (if (ok) "✓ " else "○ ") + t
        val celularFez = etapaCelular == "instalar" || etapaCelular == "pronto"
        listaTexto.text = listOf(
            m(temWifi, "Wi-Fi" + (if (temWifi && ultimoIp.isNotEmpty()) " " + ultimoIp else "")),
            m(temDepuracao, "Depuração ligada"),
            m(temPorta || etapaCelular == "conectar" || celularFez, "Porta achada"),
            m(etapaCelular.isNotEmpty() && etapaCelular != "erro", "Celular trabalhando"),
            m(etapaCelular == "pronto", "Instalado"),
        ).joinToString("\n")
    }

    private fun tentarDeNovo() {
        deNovo.visibility = View.GONE
        etapaCelular = ""; notiCelularEm = 0L
        pctTexto.setTextColor(Color.WHITE); anel.cor(0)
        procurouEm = 0L
        temDepuracao = ligarDepuracao()
        WifiDoRelogio.ipAtual(this)?.let { mandarIp(it, true) }
        etapaTexto.text = "Chamando o celular de novo…"
    }

    private fun temPermissao() = checkSelfPermission("android.permission.WRITE_SECURE_SETTINGS") == PackageManager.PERMISSION_GRANTED

    private fun depuracaoLigada(): Boolean = try {
        Settings.Global.getInt(contentResolver, "adb_wifi_enabled", 0) == 1
    } catch (e: Exception) { false }

    private fun ligarDepuracao(): Boolean {
        if (!temPermissao()) return depuracaoLigada()
        return try {
            Settings.Global.putInt(contentResolver, Settings.Global.ADB_ENABLED, 1)
            Settings.Global.putInt(contentResolver, "adb_wifi_enabled", 1)
            true
        } catch (e: Exception) { depuracaoLigada() }
    }

    private fun abrirOpcoes() {
        try { startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)) }
        catch (e: Exception) { try { startActivity(Intent(Settings.ACTION_SETTINGS)) } catch (e2: Exception) { } }
    }

    private fun mandarIp(ip: String, repetir: Boolean = false) {
        if (ip == ultimoIp && !repetir) return
        ultimoIp = ip
        temWifi = true
        linha.post { mostrar() }
        val dados = ip.toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/atualizar", dados) }
        }
        procurarPortas(ip)
    }

    // A porta da Depuração por Wi-Fi é sorteada entre 30000 e 49999 a cada vez
    // que ela liga, e o relógio não a diz a app nenhum. Ele mesmo procura.
    //
    // A primeira versão batia no próprio endereço do Wi-Fi sem dizer por qual
    // rede, e o Wear OS manda isso pelo Bluetooth do celular, que aceita toda
    // conexão: o diagnóstico do dono (2026-11-20j) trouxe mais de mil portas
    // "abertas", e o celular tentou uma por uma. Hoje a busca é no próprio
    // relógio (127.0.0.1: a depuração escuta em todos os endereços dele, e o
    // pedido nem sai do aparelho) e, se der, confirmada pela rede Wi-Fi. A
    // depuração abre uma ou duas portas: mais de 6 é lista falsa e não vai.
    private fun procurarPortas(ip: String) {
        val agora = System.currentTimeMillis()
        if (procurando || agora - procurouEm < 20_000L) return
        if (!depuracaoLigada()) return
        procurando = true
        procurouEm = agora
        Thread {
            val locais = varrer("127.0.0.1", null, 30000..49999)
            val wifi = WifiDoRelogio.rede
            val confirmadas = if (wifi != null && locais.size in 1..20) varrer(ip, wifi, locais) else emptyList()
            val l = (if (confirmadas.isNotEmpty()) confirmadas else locais).sorted()
            procurando = false
            if (l.isEmpty() || l.size > 6 || isFinishing || isDestroyed) return@Thread
            val dados = (ip + "|" + l.joinToString(",")).toByteArray(Charsets.UTF_8)
            Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/portas", dados) }
            }
            linha.post { temPorta = true; mostrar() }
        }.start()
    }

    private fun varrer(host: String, rede: Network?, portas: Iterable<Int>): List<Int> {
        val abertas = java.util.concurrent.ConcurrentLinkedQueue<Int>()
        val pool = java.util.concurrent.Executors.newFixedThreadPool(64)
        try {
            portas.forEach { p ->
                pool.submit {
                    try {
                        val s = rede?.socketFactory?.createSocket() ?: java.net.Socket()
                        s.use { it.connect(java.net.InetSocketAddress(host, p), 400) }
                        abertas.add(p)
                    } catch (e: Exception) { }
                }
            }
            pool.shutdown()
            pool.awaitTermination(40, java.util.concurrent.TimeUnit.SECONDS)
        } catch (e: Exception) { } finally { pool.shutdownNow() }
        return abertas.toList()
    }
}

// O anel da borda: a trilha cinza e o andamento no degradê da marca, com um
// brilho girando enquanto trabalha. Anda suave até a porcentagem nova.
class AnelAtualizacao(c: Context) : View(c) {
    private var fracao = 0f
    private var corFixa = 0
    private val trilha = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = Color.parseColor("#22222A") }
    private val arco = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val brilho = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND; color = Color.WHITE; alpha = 150 }
    private val caixa = RectF()
    private var anim: ValueAnimator? = null

    fun ir(f: Float) {
        anim?.cancel()
        anim = ValueAnimator.ofFloat(fracao, f.coerceIn(0f, 1f)).apply {
            duration = 600L; interpolator = DecelerateInterpolator()
            addUpdateListener { fracao = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    fun cor(c: Int) { corFixa = c; arco.shader = null; invalidate() }

    override fun onDraw(cv: Canvas) {
        val w = width.toFloat(); val h = height.toFloat()
        val esp = minOf(w, h) * 0.06f
        trilha.strokeWidth = esp; arco.strokeWidth = esp; brilho.strokeWidth = esp * 0.5f
        val m = esp / 2f + 2f
        if (resources.configuration.isScreenRound) caixa.set(m, m, w - m, h - m)
        else { val l = minOf(w, h) - 2 * m; caixa.set((w - l) / 2f, (h - l) / 2f, (w + l) / 2f, (h + l) / 2f) }
        cv.drawArc(caixa, 0f, 360f, false, trilha)
        if (corFixa != 0) { arco.shader = null; arco.color = corFixa }
        else arco.shader = SweepGradient(w / 2f, h / 2f, intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO, Cores.LARANJA), null)
        val varre = 360f * fracao
        if (varre > 0.5f) cv.drawArc(caixa, -90f, varre, false, arco)
        if (fracao < 1f && corFixa == 0) {
            val t = (SystemClock.uptimeMillis() % 1600L) / 1600f
            cv.drawArc(caixa, -90f + 360f * t, 18f, false, brilho)
            postInvalidateOnAnimation()
        }
    }
}

// O Wi-Fi do relógio: com o celular perto pelo Bluetooth, o Wear OS deixa o
// Wi-Fi desligado. Pedir a rede Wi-Fi faz o relógio ligá-lo enquanto o pedido
// vale (8 minutos, ou até o app ser trocado pela versão nova).
object WifiDoRelogio {
    private var pedido: ConnectivityManager.NetworkCallback? = null
    private val linha = Handler(Looper.getMainLooper())
    // a rede Wi-Fi achada: a busca de portas sai por ela, e não pelo Bluetooth
    @Volatile var rede: Network? = null

    fun pedir(c: Context, aoTer: (String) -> Unit) {
        val cm = c.applicationContext.getSystemService(ConnectivityManager::class.java) ?: return
        soltar(c)
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(n: Network) { rede = n; ipDe(cm.getLinkProperties(n))?.let { ip -> linha.post { aoTer(ip) } } }
            override fun onLinkPropertiesChanged(n: Network, lp: LinkProperties) { rede = n; ipDe(lp)?.let { ip -> linha.post { aoTer(ip) } } }
            override fun onLost(n: Network) { if (rede == n) rede = null }
        }
        try {
            cm.requestNetwork(NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build(), cb)
            pedido = cb
            linha.postDelayed({ soltar(c) }, 8 * 60_000L)
        } catch (e: Exception) { }
    }

    fun ipAtual(c: Context): String? = try {
        val cm = c.applicationContext.getSystemService(ConnectivityManager::class.java)
        @Suppress("DEPRECATION")
        cm?.allNetworks?.firstOrNull { cm.getNetworkCapabilities(it)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true }
            ?.also { if (rede == null) rede = it }
            ?.let { ipDe(cm.getLinkProperties(it)) }
    } catch (e: Exception) { null }

    private fun ipDe(lp: LinkProperties?): String? =
        lp?.linkAddresses?.firstOrNull { it.address is Inet4Address }?.address?.hostAddress

    fun soltar(c: Context) {
        val cb = pedido ?: return
        pedido = null
        try { c.applicationContext.getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(cb) } catch (e: Exception) { }
    }
}
