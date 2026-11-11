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
        caixa.addView(texto(14f, CINZA, t = "O app acha o relógio no Wi-Fi, baixa e instala. Você só digita o código de 6 números que o relógio mostra (uma vez só)."), lp(6))

        val c1 = cartao()
        c1.addView(texto(15f, negrito = true, t = "1. Uma vez só: o modo de desenvolvedor"))
        c1.addView(texto(14f, t = "No relógio: Configurações → Sobre o relógio → Informações do software → toque 5 vezes em Versão do software."), lp(6))
        caixa.addView(c1, lp(16))

        val c2 = cartao()
        c2.addView(texto(15f, negrito = true, t = "2. No relógio, abra a Depuração por Wi-Fi"))
        c2.addView(texto(14f, t = "Configurações → Opções do desenvolvedor → ligue Depuração ADB e Depuração por Wi-Fi → toque em Parear novo dispositivo. Relógio e celular no mesmo Wi-Fi."), lp(6))
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
        botaoJa = botaoCheio("Já pareei antes: instalar ou atualizar", Color.parseColor("#2A2A33"))
        botaoJa.setOnClickListener { instalar(false) }
        c3.addView(botaoJa, lp(8))
        botaoJa.visibility = if (getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("pareado", false)) View.VISIBLE else View.GONE
        caixa.addView(c3, lp(10))

        manual = cartao().apply { visibility = View.GONE }
        manual.addView(texto(14f, t = "Não achou o relógio? Digite o endereço e a porta que aparecem embaixo do código, na tela do relógio (por exemplo 192.168.0.12:37123)."))
        endereco = EditText(this).apply {
            hint = "endereço:porta"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setTextColor(Color.WHITE); setHintTextColor(CINZA)
        }
        manual.addView(endereco, lp(6))
        caixa.addView(manual, lp(10))

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
            if (comCodigo && hp != null) {
                log("🔐 Pareando com o relógio…")
                val ok = try { adb.pair(hp, pp, cod) } catch (e: Exception) { log("⚠ O pareamento falhou: " + (e.message ?: e.javaClass.simpleName)); false }
                if (!ok) { log("Confira o código (ele muda a cada vez que a tela abre) e tente de novo."); return "erro" }
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("pareado", true).apply()
                linha.post { botaoJa.visibility = View.VISIBLE }
                log("✓ Pareado. O relógio vai lembrar deste celular.")
            }
            // a porta de conectar é outra; espera o anúncio dela por até 15 s
            val host = hostCon ?: hp
            var espera = 0
            while ((hostCon == null || portaCon <= 0) && espera < 30) { Thread.sleep(500); espera++ }
            val hc = hostCon ?: host
            if (hc == null || portaCon <= 0) {
                log("⚠ Não achei a conexão do relógio. Deixe a Depuração por Wi-Fi ligada (a tela do relógio pode ficar na Depuração por Wi-Fi) e tente de novo.")
                return "erro"
            }
            log("🔗 Conectando ao relógio…")
            val conectou = try { adb.connect(hc, portaCon) } catch (e: Exception) { log("⚠ A conexão falhou: " + (e.message ?: e.javaClass.simpleName)); false }
            if (!conectou) { if (!comCodigo) log("Se nunca pareou com este celular, use o código."); return "erro" }
            log("⬇ Baixando o app do relógio…")
            val bytes = baixar() ?: run { log("⚠ Não consegui baixar o app do relógio. Confira a internet."); return "erro" }
            log("📲 Instalando no relógio (" + (bytes.size / 1024) + " KB)…")
            val stream = adb.openStream("exec:cmd package install -r -S " + bytes.size)
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
        }
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
            val uri = Uri.parse(Site.ENDERECO + "?app=android" + (if (resultado.isNotEmpty()) "#relogio=$resultado" else ""))
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
