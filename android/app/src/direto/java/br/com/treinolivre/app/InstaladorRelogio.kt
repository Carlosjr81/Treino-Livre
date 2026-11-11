package br.com.treinolivre.app

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.google.androidbrowserhelper.trusted.TwaLauncher
import io.github.muntashirakon.adb.AbsAdbConnectionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import java.io.File
import java.math.BigInteger
import java.net.HttpURLConnection
import java.net.NetworkInterface
import java.net.URL
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.cert.Certificate
import java.security.cert.CertificateFactory
import java.security.spec.PKCS8EncodedKeySpec
import java.util.Collections
import java.util.Date

// O instalador do app do relógio, dentro do app do celular: treinolivre://instalar-relogio.
// Pedido do dono: "automatizar ao máximo". O relógio só aceita app de fora da
// loja pela depuração (ADB) por Wi-Fi; antes era preciso um instalador da Play
// Store, endereço, porta e o arquivo. Agora o app acha o relógio no Wi-Fi
// sozinho (mDNS: _adb-tls-pairing e _adb-tls-connect, os anúncios da
// "Depuração por Wi-Fi"), baixa o app do relógio da última versão e instala.
// A pessoa só digita o código de 6 números que o relógio mostra, uma vez:
// depois o relógio lembra do celular, e atualizar é um toque.
//
// O pareamento e a conexão são da libadb-android (Apache-2.0), que usa a
// spake2-java (LGPL-3.0, sem modificação) no pareamento: exceção decidida com
// o dono em 2026-11-11 (ver LICENSE e CLAUDE.md).
class InstaladorRelogio : ComponentActivity() {
    companion object {
        const val APK = "https://github.com/carlosjr81/Treino-Livre/releases/latest/download/treino-livre-relogio.apk"
        private const val PAREAR = "_adb-tls-pairing._tcp."
        private const val CONECTAR = "_adb-tls-connect._tcp."
        private const val PREFS = "instalador"
    }

    private val linha = Handler(Looper.getMainLooper())
    private var nsd: NsdManager? = null
    private val buscas = mutableListOf<NsdManager.DiscoveryListener>()
    private val fila = ArrayDeque<NsdServiceInfo>()
    private var resolvendo = false
    @Volatile private var hostPar: String? = null
    @Volatile private var portaPar = 0
    @Volatile private var hostCon: String? = null
    @Volatile private var portaCon = 0
    private var trabalhando = false
    private var lancador: TwaLauncher? = null

    private lateinit var achado: TextView
    private lateinit var codigo: EditText
    private lateinit var botao: Button
    private lateinit var botaoJa: Button
    private lateinit var manual: LinearLayout
    private lateinit var endereco: EditText
    private lateinit var enderecoCon: EditText
    // a rede Wi-Fi a que o processo foi preso para falar com o relógio (solta no fim)
    private var presoAoWifi = false
    private lateinit var registro: TextView
    private lateinit var voltar: Button

    private val ROSA = Color.parseColor("#E1306C")
    private val CINZA = Color.parseColor("#9A9AA5")
    private val CARTAO = Color.parseColor("#17171D")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#0B0B0F")
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val caixa = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(22), dp(18), dp(28))
        }
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false, t: String = "") = TextView(this).apply {
            textSize = tam; setTextColor(cor); text = t
            setLineSpacing(0f, 1.2f)
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        fun cartao() = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(14))
            background = GradientDrawable().apply { cornerRadius = dp(14).toFloat(); setColor(CARTAO) }
        }
        fun lp(topo: Int = 10) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(topo) }
        fun botaoCheio(rotulo: String, cor: Int) = Button(this).apply {
            text = rotulo; isAllCaps = false; textSize = 16f; setTextColor(Color.WHITE)
            background = GradientDrawable().apply { cornerRadius = dp(26).toFloat(); setColor(cor) }
            minHeight = dp(52)
        }

        caixa.addView(texto(22f, negrito = true, t = "⌚ Instalar o app no relógio"))
        val versao = try { packageManager.getPackageInfo(packageName, 0).versionName } catch (e: Exception) { "?" }
        caixa.addView(texto(12f, CINZA, t = "App do celular: versão " + versao))
        caixa.addView(texto(14f, CINZA, t = "O app acha o relógio no Wi-Fi, baixa e instala. Você só digita o código de 6 números que o relógio mostra (uma vez só)."), lp(6))

        val c1 = cartao()
        c1.addView(texto(15f, negrito = true, t = "1. Uma vez só: o modo de desenvolvedor"))
        c1.addView(texto(14f, t = "No relógio: Configurações → Sobre o relógio → Informações do software → toque 5 vezes em Versão do software. Deu certo se aparecer \"Opções do desenvolvedor\" no fim das Configurações."), lp(6))
        caixa.addView(c1, lp(16))

        val c2 = cartao()
        c2.addView(texto(15f, negrito = true, t = "2. No relógio, abra a Depuração por Wi-Fi"))
        c2.addView(texto(14f, t = "Configurações → Opções do desenvolvedor → ligue Depuração ADB e Depuração por Wi-Fi (Permitir) → toque no nome Depuração por Wi-Fi → Parear novo dispositivo. Deixe essa tela aberta e acesa."), lp(6))
        c2.addView(texto(14f, CINZA, t = "Relógio e celular na mesma rede. Na academia ou no trabalho, use o Roteador Wi-Fi do celular (Configurações → Conexões → Roteador Wi-Fi e Ancoragem) e conecte o relógio nele."), lp(6))
        achado = texto(14f, CINZA, t = "🔎 Procurando o relógio no Wi-Fi…")
        c2.addView(achado, lp(10))
        caixa.addView(c2, lp(10))

        val c3 = cartao()
        c3.addView(texto(15f, negrito = true, t = "3. Digite o código que o relógio mostra"))
        codigo = EditText(this).apply {
            hint = "6 números"
            inputType = InputType.TYPE_CLASS_NUMBER
            textSize = 26f; gravity = Gravity.CENTER; letterSpacing = 0.3f
            setTextColor(Color.WHITE); setHintTextColor(CINZA)
            filters = arrayOf(android.text.InputFilter.LengthFilter(6))
        }
        c3.addView(codigo, lp(6))
        botao = botaoCheio("⌚ Parear e instalar", ROSA)
        botao.setOnClickListener { instalar(true) }
        c3.addView(botao, lp(8))
        val jaPareado = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("pareado", false)
        botaoJa = botaoCheio("Já pareei antes: instalar ou atualizar", if (jaPareado) ROSA else Color.parseColor("#2A2A33"))
        botaoJa.setOnClickListener { instalar(false) }
        botaoJa.visibility = if (jaPareado) View.VISIBLE else View.GONE
        if (jaPareado) {
            // Já pareado (relato do dono, 2026-11-11h): atualizar não pede código
            // nem endereço; o app acha a porta nova do relógio sozinho.
            botao.setBackgroundColor(Color.TRANSPARENT)
            botao.background = GradientDrawable().apply { cornerRadius = dp(26).toFloat(); setColor(Color.parseColor("#2A2A33")) }
            c3.addView(texto(14f, Color.parseColor("#4CD137"), t = "✓ Este celular já está pareado com o relógio. Para atualizar, basta a Depuração por Wi-Fi ligada no relógio (não precisa abrir o código): toque no botão abaixo."), 1, lp(6))
            c3.addView(botaoJa, 2, lp(8))
        } else c3.addView(botaoJa, lp(8))
        caixa.addView(c3, lp(10))

        manual = cartao().apply { visibility = View.GONE }
        manual.addView(texto(14f, t = "Não achou o relógio? Digite o endereço e a porta que aparecem embaixo do código, na tela do relógio (por exemplo 192.168.0.12:37123)."))
        endereco = EditText(this).apply {
            hint = "endereço:porta"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setTextColor(Color.WHITE); setHintTextColor(CINZA)
        }
        manual.addView(endereco, lp(6))
        manual.addView(texto(14f, t = "Depois de parear, feche o código no relógio: a tela da Depuração por Wi-Fi mostra outro Endereço IP e porta (a porta é diferente). Se o app pedir, digite aqui:"), lp(12))
        enderecoCon = EditText(this).apply {
            hint = "endereço:porta para conectar"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setTextColor(Color.WHITE); setHintTextColor(CINZA)
        }
        manual.addView(enderecoCon, lp(6))
        caixa.addView(manual, lp(10))
        if (getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("pareado", false)) manual.visibility = View.VISIBLE

        val ajuda = cartao()
        ajuda.addView(texto(15f, negrito = true, t = "🆘 Se aparecer uma mensagem de erro"))
        listOf(
            "\"não conseguiu chegar ao relógio\", ECONNABORTED, Host unreachable: a rede bloqueia ou o Wi-Fi do relógio dormiu. Use o Roteador Wi-Fi do celular, acenda a tela do relógio e tente de novo.",
            "\"O pareamento falhou\": o código venceu. Abra de novo Parear novo dispositivo no relógio e use o código e o endereço novos.",
            "\"O relógio recusou este celular\": pareie de novo com o código.",
            "\"Não achei o relógio\": a Depuração por Wi-Fi desligou sozinha. Ligue de novo no relógio.",
            "\"Permitir depuração?\" no relógio: toque em Permitir (Sempre permitir).",
        ).forEach { ajuda.addView(texto(13f, CINZA, t = "• " + it), lp(6)) }
        caixa.addView(ajuda, lp(14))

        registro = texto(14f, t = "")
        caixa.addView(registro, lp(14))
        voltar = botaoCheio("Voltar ao Treino Livre", Color.parseColor("#2A2A33"))
        voltar.setOnClickListener { voltarAoSite("") }
        caixa.addView(voltar, lp(14))

        setContentView(ScrollView(this).apply { setBackgroundColor(Color.parseColor("#0B0B0F")); addView(caixa) })
        buscar()
        // em 25 s sem achar, oferece digitar o endereço
        linha.postDelayed({ if (hostPar == null && hostCon == null) manual.visibility = View.VISIBLE }, 25_000L)
    }

    // ---- achar o relógio no Wi-Fi ----
    private fun meusEnderecos(): Set<String> = try {
        Collections.list(NetworkInterface.getNetworkInterfaces()).flatMap { Collections.list(it.inetAddresses) }.mapNotNull { it.hostAddress }.toSet()
    } catch (e: Exception) { emptySet() }

    private fun buscar() {
        val m = getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        nsd = m
        listOf(PAREAR, CONECTAR).forEach { tipo ->
            val ouvinte = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(t: String?) {}
                override fun onDiscoveryStopped(t: String?) {}
                override fun onStartDiscoveryFailed(t: String?, e: Int) {}
                override fun onStopDiscoveryFailed(t: String?, e: Int) {}
                override fun onServiceLost(s: NsdServiceInfo?) {}
                override fun onServiceFound(s: NsdServiceInfo?) { if (s != null) linha.post { fila.addLast(s); resolver() } }
            }
            try { m.discoverServices(tipo, NsdManager.PROTOCOL_DNS_SD, ouvinte); buscas.add(ouvinte) } catch (e: Exception) { }
        }
    }

    // O NsdManager resolve um de cada vez
    @Suppress("DEPRECATION")
    private fun resolver() {
        val m = nsd ?: return
        if (resolvendo) return
        val s = fila.removeFirstOrNull() ?: return
        resolvendo = true
        try {
            m.resolveService(s, object : NsdManager.ResolveListener {
                override fun onResolveFailed(info: NsdServiceInfo?, e: Int) { linha.post { resolvendo = false; resolver() } }
                override fun onServiceResolved(info: NsdServiceInfo?) {
                    linha.post {
                        resolvendo = false
                        val h = info?.host?.hostAddress
                        // o próprio celular também pode estar anunciando: fica de fora
                        if (info != null && h != null && h !in meusEnderecos() && h.indexOf(':') < 0) {
                            val tipo = info.serviceType ?: ""
                            if (tipo.contains("pairing")) { hostPar = h; portaPar = info.port }
                            else { hostCon = h; portaCon = info.port }
                            achado.text = "✓ Achei o relógio (" + h + ")" + (if (hostPar != null) ": digite o código." else ".")
                            achado.setTextColor(Color.parseColor("#4CD137"))
                        }
                        resolver()
                    }
                }
            })
        } catch (e: Exception) { resolvendo = false }
    }

    private fun pararBusca() {
        val m = nsd ?: return
        buscas.forEach { try { m.stopServiceDiscovery(it) } catch (e: Exception) { } }
        buscas.clear()
    }

    // ---- parear, conectar, baixar e instalar ----
    private fun log(t: String) = linha.post { registro.text = if (registro.text.isEmpty()) t else registro.text.toString() + "\n" + t }

    private fun instalar(comCodigo: Boolean) {
        if (trabalhando) return
        val cod = codigo.text.toString().trim()
        if (comCodigo && cod.length != 6) { log("⚠ Digite os 6 números que aparecem na tela do relógio."); return }
        // o endereço digitado vence o achado (é o do pareamento)
        val dig = endereco.text.toString().trim()
        var hp = hostPar; var pp = portaPar
        if (dig.contains(":")) { hp = dig.substringBeforeLast(":"); pp = dig.substringAfterLast(":").toIntOrNull() ?: 0 }
        if (comCodigo && (hp == null || pp <= 0)) {
            log("⚠ Ainda não achei o relógio. Confira se a tela Parear novo dispositivo está aberta no relógio, e o mesmo Wi-Fi.")
            manual.visibility = View.VISIBLE
            return
        }
        trabalhando = true
        botao.isEnabled = false; botaoJa.isEnabled = false
        (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)?.hideSoftInputFromWindow(codigo.windowToken, 0)
        registro.text = ""
        lifecycleScope.launch {
            val r = withContext(Dispatchers.IO) { trabalhar(comCodigo, hp, pp, cod) }
            trabalhando = false
            botao.isEnabled = true; botaoJa.isEnabled = true
            if (r == "ok") {
                log("✅ Pronto! O Treino Livre está no relógio.")
                Relogio.abrirNoRelogio(applicationContext)
                linha.postDelayed({ voltarAoSite("pronto") }, 2500L)
            }
        }
    }

    private fun trabalhar(comCodigo: Boolean, hp: String?, pp: Int, cod: String): String {
        val adb = try { Adb(this) } catch (e: Exception) { log("⚠ Não consegui preparar a chave: " + e.message); return "erro" }
        try {
            // Baixa antes de prender ao Wi-Fi: o Wi-Fi da academia ou da empresa
            // pode não ter internet, e preso a ele o download não sairia.
            log("⬇ Baixando o app do relógio…")
            val bytes = baixar() ?: run { log("⚠ Não consegui baixar o app do relógio. Confira a internet."); return "erro" }
            log("✓ Baixado (" + (bytes.size / 1024) + " KB).")
            val digCon0 = enderecoCon.text.toString().trim().let { if (it.contains(":")) it.substringBeforeLast(":") else "" }
            val alvo = hp ?: digCon0.ifEmpty { null } ?: hostCon
                ?: getSharedPreferences(PREFS, MODE_PRIVATE).getString("ultimoHost", null)?.ifEmpty { null }
            if (!prenderAoWifi(alvo)) return "erro"
            if (comCodigo && hp != null) {
                log("🔐 Pareando com o relógio…")
                val ok = try { comPrazo(25_000L) { adb.pair(hp, pp, cod) } } catch (e: Exception) {
                    val msg = e.message ?: e.javaClass.simpleName
                    log("⚠ O pareamento falhou: " + msg)
                    if (msg.contains("connect") || msg.contains("ECONN") || msg.contains("abort") || msg.contains("não respondeu") || msg.contains("ETIMEDOUT") || msg.contains("EHOSTUNREACH") || msg.contains("ENETUNREACH")) explicarRede(hp)
                    false
                }
                if (!ok) {
                    log("Confira: o endereço tem de ser o da janela do código (Parear novo dispositivo), e o código muda a cada vez que essa janela abre.")
                    if (getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("pareado", false))
                        log("➡ Este celular já pareou com o relógio antes: não precisa de código. Feche o código no relógio, digite no segundo campo o endereço da tela Depuração por Wi-Fi e toque em \"Já pareei antes\".")
                    return "erro"
                }
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("pareado", true).putString("ultimoHost", hp).apply()
                linha.post { botaoJa.visibility = View.VISIBLE }
                log("✓ Pareado. O relógio vai lembrar deste celular.")
            }
            // A porta de conectar é outra, e MUDA cada vez que a Depuração por
            // Wi-Fi é ligada (relato do dono: "o Já pareei antes pede tudo de
            // novo"). Ordem: o digitado, o anunciado na rede, o último que deu
            // certo e, por fim, procurar a porta nova no endereço do relógio.
            val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
            val candidatos = LinkedHashSet<Pair<String, Int>>()
            val digCon = enderecoCon.text.toString().trim()
            if (digCon.contains(":")) {
                val p = digCon.substringAfterLast(":").toIntOrNull() ?: 0
                if (p > 0) candidatos.add(digCon.substringBeforeLast(":") to p)
            }
            var espera = 0
            val limite = if (comCodigo) 16 else 6
            while ((hostCon == null || portaCon <= 0) && espera < limite) { Thread.sleep(500); espera++ }
            if (hostCon != null && portaCon > 0) candidatos.add(hostCon!! to portaCon)
            val salvo = prefs.getString("ultimoCon", "") ?: ""
            if (salvo.contains(":")) {
                val p = salvo.substringAfterLast(":").toIntOrNull() ?: 0
                if (p > 0) candidatos.add(salvo.substringBeforeLast(":") to p)
            }
            // os endereços em que o relógio pode estar, para procurar a porta
            val hosts = LinkedHashSet<String>()
            if (digCon.isNotEmpty()) hosts.add(digCon.substringBefore(":"))
            hostCon?.let { hosts.add(it) }
            hp?.let { hosts.add(it) }
            prefs.getString("ultimoHost", null)?.let { if (it.isNotEmpty()) hosts.add(it) }

            var con: AbsAdbConnectionManager? = null
            var ultimoErro = ""
            var recusou = false
            val tentar = { h: String, p: Int ->
                val a = if (con == null && ultimoErro.isEmpty()) adb else Adb(this)
                log("🔗 Conectando ao relógio (" + h + ":" + p + ")…")
                val ok = try { comPrazo(15_000L) { a.connect(h, p) } } catch (e: Exception) {
                    val msg = e.message ?: e.javaClass.simpleName
                    ultimoErro = msg + (if (msg.contains("não respondeu")) "" else motivoDaConexao(a))
                    if (msg.contains("Connection failed") || e.javaClass.simpleName.contains("Pairing") || e.javaClass.simpleName.contains("Authentication")) recusou = true
                    false
                }
                if (ok) { con = a; prefs.edit().putString("ultimoCon", h + ":" + p).putString("ultimoHost", h).apply() }
                else { if (ultimoErro.isEmpty()) ultimoErro = "não conectou"; if (a !== adb) try { a.close() } catch (e: Exception) { } }
                ok
            }
            for ((h, p) in candidatos) { if (tentar(h, p)) break }
            if (con == null) {
                for (h in hosts) {
                    val portas = acharPortas(h)
                    for (p in portas) { if (candidatos.contains(h to p)) continue; if (tentar(h, p)) break }
                    if (con != null) break
                }
            }
            val c = con
            if (c == null) {
                if (ultimoErro.isNotEmpty()) log("⚠ A conexão falhou: " + ultimoErro)
                when {
                    recusou -> log("➡ O relógio recusou este celular: o pareamento não valeu. Abra Parear novo dispositivo no relógio, ponha o código e o endereço DESSA janela no primeiro campo, e toque em Parear e instalar.")
                    hosts.isEmpty() -> log("➡ Ainda não sei o endereço do relógio. Na tela da Depuração por Wi-Fi do relógio aparece o Endereço IP e porta: digite no segundo campo e toque de novo.")
                    else -> log("➡ Não achei o relógio. Confira no relógio: Depuração por Wi-Fi LIGADA (ela desliga sozinha quando o relógio sai do Wi-Fi ou reinicia), e relógio e celular no mesmo Wi-Fi. Se continuar, digite no segundo campo o Endereço IP e porta que a tela da Depuração por Wi-Fi mostra.")
                }
                linha.post { manual.visibility = View.VISIBLE }
                return "erro"
            }
            log("📲 Instalando no relógio…")
            val stream = c.openStream("exec:cmd package install -r -S " + bytes.size)
            val saida = stream.openOutputStream()
            var i = 0
            while (i < bytes.size) { val n = minOf(32 * 1024, bytes.size - i); saida.write(bytes, i, n); i += n }
            saida.flush()
            val resposta = StringBuilder()
            val entrada = stream.openInputStream()
            val buf = ByteArray(1024)
            while (true) {
                val n = try { entrada.read(buf) } catch (e: Exception) { -1 }
                if (n <= 0) break
                resposta.append(String(buf, 0, n))
                if (resposta.contains("Success") || resposta.contains("Failure")) break
            }
            try { stream.close() } catch (e: Exception) { }
            val txt = resposta.toString().trim()
            BolsoService.diario(this, "instalador do relógio: " + txt.take(120))
            if (txt.contains("Success")) return "ok"
            log("⚠ O relógio recusou: " + txt.take(200))
            if (txt.contains("UPDATE_INCOMPATIBLE")) log("O app que está no relógio foi assinado com outra chave: desinstale o Treino Livre do relógio e tente de novo.")
            return "erro"
        } catch (e: Exception) {
            log("⚠ " + (e.message ?: e.javaClass.simpleName))
            return "erro"
        } finally {
            try { adb.close() } catch (e: Exception) { }
            soltarDoWifi()
        }
    }

    // Procura as portas abertas do relógio. A da Depuração por Wi-Fi é sorteada
    // pelo relógio entre 30000 e 49999 a cada vez que ela é ligada (nas telas do
    // dono: 38329, 39165, 40149). Na rede local, porta fechada responde na
    // hora; 256 de cada vez, a faixa inteira leva poucos segundos.
    private fun acharPortas(host: String): List<Int> {
        log("🔎 Procurando o relógio em " + host + " (a porta muda a cada vez)…")
        val abertas = java.util.concurrent.ConcurrentLinkedQueue<Int>()
        val pool = java.util.concurrent.Executors.newFixedThreadPool(256)
        try {
            val tarefas = (30000..49999).map { p ->
                pool.submit {
                    try { java.net.Socket().use { s -> s.connect(java.net.InetSocketAddress(host, p), 600) }; abertas.add(p) } catch (e: Exception) { }
                }
            }
            val fim = System.currentTimeMillis() + 60_000L
            for (t in tarefas) {
                val resta = fim - System.currentTimeMillis()
                if (resta <= 0) break
                try { t.get(resta, java.util.concurrent.TimeUnit.MILLISECONDS) } catch (e: Exception) { }
            }
        } finally { pool.shutdownNow() }
        val l = abertas.toList().sorted()
        if (l.isNotEmpty()) log("✓ Achei o relógio na porta " + l.joinToString(", ") + ".")
        return l
    }

    // ---- a rede ----
    // Relato do dono (Galaxy, 2026-11-11d): "connect failed: ECONNABORTED". O
    // celular não alcançava o relógio: com o Wi-Fi sem internet (o da empresa,
    // o da academia), o Galaxy manda tudo pelos dados móveis ("Mudar para dados
    // móveis"), e por lá um endereço da rede local não existe. Então, achando o
    // Wi-Fi, o app prende a conversa com o relógio a ele. No roteador do
    // próprio celular (ponto de acesso) não há Wi-Fi como cliente, e o caminho
    // já é direto: não prende nada.
    private fun redeWifi(): android.net.Network? {
        val cm = getSystemService(android.net.ConnectivityManager::class.java) ?: return null
        @Suppress("DEPRECATION")
        return cm.allNetworks.firstOrNull { n ->
            val c = cm.getNetworkCapabilities(n)
            c != null && c.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)
        }
    }

    private fun meuIpWifi(): String? {
        val cm = getSystemService(android.net.ConnectivityManager::class.java) ?: return null
        val w = redeWifi() ?: return null
        return cm.getLinkProperties(w)?.linkAddresses?.firstOrNull { it.address is java.net.Inet4Address }?.let { it.address.hostAddress + "/" + it.prefixLength }
    }

    // Devolve false quando o relógio está, com certeza, em outra rede: tentar
    // seria esperar à toa (o celular não tem caminho até ele).
    private fun prenderAoWifi(host: String?): Boolean {
        val cm = getSystemService(android.net.ConnectivityManager::class.java) ?: return true
        val w = redeWifi()
        if (w == null) {
            log("ℹ O celular não está num Wi-Fi. Se o relógio estiver no roteador do celular (ponto de acesso), tudo bem; senão, conecte os dois no mesmo Wi-Fi.")
            return true
        }
        val meu = meuIpWifi()
        if (host != null && noRoteadorDoCelular(host)) {
            log("📶 O relógio está no roteador do celular: caminho direto.")
            return true
        }
        if (meu != null && host != null && !mesmaRede(meu, host)) {
            val ip = meu.substringBefore("/")
            log("🚫 O celular e o relógio estão em redes DIFERENTES:")
            log("• celular: " + ip + "   • relógio: " + host)
            log("Os números do começo precisam ser iguais (" + ip.substringBeforeLast(".") + ".…). Assim o celular não tem como chegar ao relógio.")
            log("➡ No relógio: Configurações → Conexões → Wi-Fi, e escolha o MESMO Wi-Fi do celular (ou ligue o Roteador Wi-Fi do celular e conecte o relógio nele).")
            log("➡ Depois, a Depuração por Wi-Fi do relógio mostra um endereço novo: confira que começa com " + ip.substringBeforeLast(".") + ", digite no segundo campo e toque em \"Já pareei antes\". Não precisa de código.")
            log("Se o relógio não está em Wi-Fi nenhum (só no 4G ou no Bluetooth), a Depuração por Wi-Fi não funciona: ele precisa de Wi-Fi.")
            linha.post { manual.visibility = View.VISIBLE }
            return false
        }
        presoAoWifi = cm.bindProcessToNetwork(w)
        if (presoAoWifi) log("📶 Falando com o relógio pelo Wi-Fi (" + (meu ?: "Wi-Fi") + ").")
        return true
    }

    // O roteador do celular (ponto de acesso) é uma interface do próprio celular
    // que não é o Wi-Fi em que ele está conectado como cliente: se o relógio está
    // numa delas, não se prende a nada.
    private fun noRoteadorDoCelular(host: String): Boolean = try {
        val wifi = meuIpWifi()?.substringBefore("/")
        Collections.list(NetworkInterface.getNetworkInterfaces()).any { ni ->
            ni.interfaceAddresses.any { ia ->
                val a = ia.address
                a is java.net.Inet4Address && a.hostAddress != wifi && !a.isLoopbackAddress &&
                    mesmaRede(a.hostAddress + "/" + ia.networkPrefixLength, host)
            }
        }
    } catch (e: Exception) { false }

    // O motivo de verdade de um "Connection failed": a biblioteca guarda o erro
    // num campo privado e só devolve a frase genérica.
    private fun motivoDaConexao(adb: AbsAdbConnectionManager): String = try {
        val con = adb.adbConnection ?: return ""
        val f = con.javaClass.getDeclaredField("mConnectionException")
        f.isAccessible = true
        val e = f.get(con) as? Throwable
        if (e == null) "" else " (" + e.javaClass.simpleName + ": " + (e.message ?: "") + (e.cause?.let { " / " + (it.message ?: it.javaClass.simpleName) } ?: "") + ")"
    } catch (e: Exception) { "" }

    // Roda a chamada da biblioteca com prazo: sem ele, uma rede que segura a
    // conexão deixava a tela em "Pareando…" para sempre.
    private fun <T> comPrazo(ms: Long, f: () -> T): T {
        val fila = java.util.concurrent.Executors.newSingleThreadExecutor()
        try {
            return fila.submit<T> { f() }.get(ms, java.util.concurrent.TimeUnit.MILLISECONDS)
        } catch (e: java.util.concurrent.TimeoutException) {
            throw java.io.IOException("o relógio não respondeu em " + (ms / 1000) + " s")
        } catch (e: java.util.concurrent.ExecutionException) {
            throw (e.cause as? Exception) ?: e
        } finally { fila.shutdownNow() }
    }

    private fun soltarDoWifi() {
        if (!presoAoWifi) return
        presoAoWifi = false
        try { getSystemService(android.net.ConnectivityManager::class.java)?.bindProcessToNetwork(null) } catch (e: Exception) { }
    }

    private fun mesmaRede(meu: String, host: String): Boolean = try {
        val ip = meu.substringBefore("/"); val pre = meu.substringAfter("/").toInt()
        val a = java.net.InetAddress.getByName(ip).address; val b = java.net.InetAddress.getByName(host).address
        var ok = a.size == b.size
        var bits = pre; var i = 0
        while (ok && bits > 0 && i < a.size) {
            val m = if (bits >= 8) 0xFF else (0xFF shl (8 - bits)) and 0xFF
            if ((a[i].toInt() and m) != (b[i].toInt() and m)) ok = false
            bits -= 8; i++
        }
        ok
    } catch (e: Exception) { true }

    private fun explicarRede(host: String?) {
        log("📵 O celular não conseguiu chegar ao relógio (" + (host ?: "") + "). Quase sempre é a rede:")
        log("• Wi-Fi de empresa, condomínio ou academia costuma bloquear um aparelho de falar com o outro.")
        log("• Saída garantida: ligue o Roteador Wi-Fi do celular (Configurações → Conexões → Roteador Wi-Fi), conecte o relógio nele (no relógio: Configurações → Conexões → Wi-Fi) e abra o Parear de novo. Com os dados móveis ligados, o download sai pelo próprio celular.")
        log("• Desligue VPN e o \"Wi-Fi seguro\" do Samsung, se estiverem ligados: eles desviam a conexão.")
        log("• No relógio, se a janela do código fechou, abra de novo: o código e a porta mudam.")
    }

    private fun baixar(): ByteArray? = try {
        var url = URL(APK)
        var con: HttpURLConnection
        var saltos = 0
        while (true) {
            con = url.openConnection() as HttpURLConnection
            con.instanceFollowRedirects = false
            con.connectTimeout = 15000; con.readTimeout = 30000
            val cod = con.responseCode
            if (cod in 300..399 && saltos < 6) { url = URL(url, con.getHeaderField("Location")); con.disconnect(); saltos++; continue }
            break
        }
        if (con.responseCode != 200) null else con.inputStream.use { it.readBytes() }
    } catch (e: Exception) { null }

    private fun voltarAoSite(resultado: String) {
        pararBusca()
        try {
            val uri = Site.comFragmento(this, if (resultado.isNotEmpty()) "relogio=$resultado" else "")
            Site.abrir(this, uri, { lancador = it }) { finish() }
        } catch (e: Exception) { finish() }
    }

    override fun onDestroy() {
        pararBusca()
        lancador?.destroy()
        super.onDestroy()
    }

    // A chave deste celular para o ADB do relógio: criada uma vez e guardada nos
    // arquivos do app. O relógio guarda a parte pública ao parear.
    private class Adb(contexto: Context) : AbsAdbConnectionManager() {
        private val chave: PrivateKey
        private val certificado: Certificate

        init {
            setApi(30)
            setTimeout(20, java.util.concurrent.TimeUnit.SECONDS)
            val pasta = contexto.filesDir
            val fChave = File(pasta, "adb.chave")
            val fCert = File(pasta, "adb.cert")
            if (fChave.exists() && fCert.exists()) {
                chave = KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(fChave.readBytes()))
                certificado = CertificateFactory.getInstance("X.509").generateCertificate(fCert.inputStream())
            } else {
                val gerador = KeyPairGenerator.getInstance("RSA")
                gerador.initialize(2048)
                val par = gerador.generateKeyPair()
                val nome = X500Name("CN=Treino Livre")
                val agora = System.currentTimeMillis()
                val construtor = JcaX509v3CertificateBuilder(nome, BigInteger.valueOf(agora), Date(agora - 86_400_000L),
                    Date(agora + 3650L * 86_400_000L), nome, par.public)
                val assinante = JcaContentSignerBuilder("SHA256withRSA").build(par.private)
                val c = JcaX509CertificateConverter().getCertificate(construtor.build(assinante))
                chave = par.private
                certificado = c
                fChave.writeBytes(par.private.encoded)
                fCert.writeBytes(c.encoded)
            }
        }

        override fun getPrivateKey(): PrivateKey = chave
        override fun getCertificate(): Certificate = certificado
        override fun getDeviceName(): String = "Treino Livre"
    }
}
