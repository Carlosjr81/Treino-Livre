package br.com.treinolivre.relogio

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
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
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
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
// celular o endereço do relógio no Wi-Fi e a porta (2026-11-18b: o relógio
// procura a porta no próprio endereço, o que leva um instante ali e poupa o
// celular de procurar às cegas ou de pedir para digitar). O celular instala.
// Sem a permissão (a primeira vez), um botão abre as Opções do desenvolvedor.
class PreparaAtualizacao : ComponentActivity() {
    private val linha = Handler(Looper.getMainLooper())
    private lateinit var estado: TextView
    private lateinit var abrir: Button
    private var ultimoIp = ""
    @Volatile private var procurando = false
    private var procurouEm = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val largura = resources.displayMetrics.widthPixels
        val lado = (largura * 0.12).toInt()
        val caixa = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(lado, (largura * 0.14).toInt(), lado, (largura * 0.22).toInt())
        }
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false, t: String = "") = TextView(this).apply {
            textSize = tam; setTextColor(cor); gravity = Gravity.CENTER; text = t
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        caixa.addView(texto(18f, Cores.OURO, true, "⬆ Atualizando"))
        caixa.addView(texto(13f, Cores.CINZA, false, "o app do Treino Livre"))
        estado = texto(14f, Color.WHITE, false, "Ligando o Wi-Fi…").apply { setPadding(0, dp(10), 0, dp(10)) }
        caixa.addView(estado)
        abrir = Button(this).apply {
            text = "Abrir as opções"
            isAllCaps = false
            textSize = 15f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            stateListAnimator = null
            background = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO)).apply { cornerRadius = dp(30).toFloat() }
            minHeight = dp(48)
            visibility = android.view.View.GONE
            setOnClickListener { abrirOpcoes() }
        }
        caixa.addView(abrir, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        caixa.addView(texto(11f, Cores.CINZA, false, "Deixe o relógio perto do celular. O app novo abre sozinho no fim."))
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.BLACK); addView(caixa) })

        WifiDoRelogio.pedir(this) { ip -> mandarIp(ip) }
        val pode = ligarDepuracao()
        if (pode) estado.text = "Depuração ligada ✓\nO celular está instalando…"
        else {
            estado.text = "Toque em Abrir as opções e ligue Depuração ADB e Depuração por Wi-Fi. Depois volte aqui."
            abrir.visibility = android.view.View.VISIBLE
        }
        // o endereço pode já existir (Wi-Fi já ligado)
        WifiDoRelogio.ipAtual(this)?.let { mandarIp(it) }
        // de tempos em tempos manda de novo: o celular pode ter aberto depois
        linha.postDelayed(object : Runnable {
            override fun run() {
                if (isFinishing || isDestroyed) return
                WifiDoRelogio.ipAtual(this@PreparaAtualizacao)?.let { mandarIp(it, true) }
                if (temPermissao()) ligarDepuracao()
                linha.postDelayed(this, 15_000L)
            }
        }, 15_000L)
    }

    override fun onResume() {
        super.onResume()
        // voltou das opções: confere se a depuração ficou ligada
        if (abrir.visibility == android.view.View.VISIBLE && depuracaoLigada()) {
            estado.text = "Depuração ligada ✓\nO celular está instalando…"
            abrir.visibility = android.view.View.GONE
        }
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
        if (!repetir) linha.post { if (temPermissao() || depuracaoLigada()) estado.text = "Wi-Fi: $ip ✓\nO celular está instalando…" }
        val dados = ip.toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/atualizar", dados) }
        }
        procurarPortas(ip)
    }

    // A porta da Depuração por Wi-Fi é sorteada entre 30000 e 49999 a cada vez
    // que ela liga, e o relógio não a diz a app nenhum. Mas ele mesmo pode bater
    // em cada porta do próprio endereço: porta fechada responde na hora. As
    // abertas vão ao celular em "/treino/portas" ("ip|p1,p2"), que tenta cada
    // uma. Um caminho à parte do "/treino/atualizar", que o celular antigo lê
    // como o endereço inteiro.
    private fun procurarPortas(ip: String) {
        val agora = System.currentTimeMillis()
        if (procurando || agora - procurouEm < 20_000L) return
        if (!depuracaoLigada()) return
        procurando = true
        procurouEm = agora
        Thread {
            val abertas = java.util.concurrent.ConcurrentLinkedQueue<Int>()
            val pool = java.util.concurrent.Executors.newFixedThreadPool(96)
            try {
                (30000..49999).forEach { p ->
                    pool.submit {
                        try { java.net.Socket().use { s -> s.connect(java.net.InetSocketAddress(ip, p), 400) }; abertas.add(p) } catch (e: Exception) { }
                    }
                }
                pool.shutdown()
                pool.awaitTermination(40, java.util.concurrent.TimeUnit.SECONDS)
            } catch (e: Exception) { } finally { pool.shutdownNow() }
            val l = abertas.toList().sorted()
            procurando = false
            if (l.isEmpty() || isFinishing || isDestroyed) return@Thread
            val dados = (ip + "|" + l.joinToString(",")).toByteArray(Charsets.UTF_8)
            Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/portas", dados) }
            }
            linha.post { estado.text = "Wi-Fi: $ip ✓\nAchei a porta ✓\nO celular está instalando…" }
        }.start()
    }
}

// O Wi-Fi do relógio: com o celular perto pelo Bluetooth, o Wear OS deixa o
// Wi-Fi desligado. Pedir a rede Wi-Fi faz o relógio ligá-lo enquanto o pedido
// vale (8 minutos, ou até o app ser trocado pela versão nova).
object WifiDoRelogio {
    private var pedido: ConnectivityManager.NetworkCallback? = null
    private val linha = Handler(Looper.getMainLooper())

    fun pedir(c: Context, aoTer: (String) -> Unit) {
        val cm = c.applicationContext.getSystemService(ConnectivityManager::class.java) ?: return
        soltar(c)
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(n: Network) { ipDe(cm.getLinkProperties(n))?.let { ip -> linha.post { aoTer(ip) } } }
            override fun onLinkPropertiesChanged(n: Network, lp: LinkProperties) { ipDe(lp)?.let { ip -> linha.post { aoTer(ip) } } }
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
