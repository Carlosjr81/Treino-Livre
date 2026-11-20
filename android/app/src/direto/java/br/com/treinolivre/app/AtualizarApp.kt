package br.com.treinolivre.app

import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageInstaller
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import java.net.HttpURLConnection
import java.net.URL

// O celular se atualiza sozinho (2026-11-20k, relato do dono: o site dizia
// "há o 143: atualizar", ele baixava e continuava no 141). O APK publicado
// estava certo; o que falhava era o caminho pela pasta Downloads, cheia de
// "treino-livre (1).apk", "(2)…" com o mesmo nome, e o aberto era um velho.
// Aqui o app baixa a última versão para dentro dele (com a porcentagem),
// confere que é mais nova, e entrega ao instalador do Android pelo
// PackageInstaller: um toque em Atualizar e pronto. Só na versão direta (a da
// loja se atualiza pela Play Store, e a loja proíbe instalar por fora dela).
class AtualizarApp : ComponentActivity() {
    companion object {
        const val APK = "https://github.com/carlosjr81/Treino-Livre/releases/latest/download/treino-livre.apk"
        const val STATUS = "br.com.treinolivre.app.STATUS_ATUALIZAR"
    }

    private val linha = Handler(Looper.getMainLooper())
    private lateinit var pct: TextView
    private lateinit var barra: ProgressBar
    private lateinit var estado: TextView
    private lateinit var detalhe: TextView
    private lateinit var botao: Button
    private var trabalhando = false
    private var pediuPermissao = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#0B0B0F")
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false, t: String = "") = TextView(this).apply {
            textSize = tam; setTextColor(cor); text = t; gravity = Gravity.CENTER
            setLineSpacing(0f, 1.2f)
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        val caixa = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(24), dp(24), dp(24))
            setBackgroundColor(Color.parseColor("#0B0B0F"))
        }
        val vi = try { packageManager.getPackageInfo(packageName, 0) } catch (e: Exception) { null }
        caixa.addView(texto(20f, negrito = true, t = "⬇ Atualizar o Treino Livre"))
        caixa.addView(texto(13f, Color.parseColor("#9A9AA5"), t = "Este celular: versão " + (vi?.versionName ?: "?")))
        pct = texto(56f, negrito = true, t = "0%").apply { setPadding(0, dp(18), 0, dp(4)) }
        caixa.addView(pct)
        barra = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100; progress = 0; scaleY = 2.4f
            progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#E1306C"))
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#2A2A33"))
        }
        caixa.addView(barra, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        estado = texto(17f, negrito = true, t = "Procurando a versão nova…").apply { setPadding(0, dp(16), 0, 0) }
        caixa.addView(estado)
        detalhe = texto(14f, Color.parseColor("#9A9AA5")).apply { setPadding(0, dp(8), 0, 0) }
        caixa.addView(detalhe)
        botao = Button(this).apply {
            isAllCaps = false; textSize = 16f; setTextColor(Color.WHITE); stateListAnimator = null
            background = GradientDrawable().apply { cornerRadius = dp(26).toFloat(); setColor(Color.parseColor("#E1306C")) }
            minHeight = dp(52); visibility = View.GONE
            Acao.vivo(this)
        }
        caixa.addView(botao, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(20) })
        setContentView(caixa)
        if (intent?.action == STATUS) tratarStatus(intent) else comecar()
    }

    override fun onNewIntent(i: Intent) {
        super.onNewIntent(i)
        if (i.action == STATUS) tratarStatus(i)
    }

    override fun onResume() {
        super.onResume()
        // voltou da tela "Instalar apps desconhecidos": segue sozinho
        if (pediuPermissao && packageManager.canRequestPackageInstalls()) { pediuPermissao = false; comecar() }
    }

    private fun mostrar(p: Int, e: String, det: String = "", cor: Int = Color.WHITE) = linha.post {
        pct.text = "$p%"; pct.setTextColor(cor)
        if (Build.VERSION.SDK_INT >= 24) barra.setProgress(p, true) else barra.progress = p
        estado.text = e; detalhe.text = det
    }

    private fun botao(rotulo: String, acao: () -> Unit) = linha.post {
        botao.text = rotulo; botao.visibility = View.VISIBLE; botao.setOnClickListener { botao.visibility = View.GONE; acao() }
    }

    private fun comecar() {
        if (trabalhando) return
        if (!packageManager.canRequestPackageInstalls()) {
            mostrar(0, "🔐 Falta uma permissão, uma vez só", "O Android pede que você deixe o Treino Livre instalar a versão nova dele. Na tela que abrir, ligue \"Permitir desta fonte\" e volte.")
            botao("Abrir a permissão") {
                pediuPermissao = true
                try { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + packageName))) }
                catch (e: Exception) { startActivity(Intent(Settings.ACTION_SETTINGS)) }
            }
            return
        }
        trabalhando = true
        Thread { trabalhar() }.start()
    }

    private fun trabalhar() {
        try {
            mostrar(1, "Procurando a versão nova…")
            // segue o endereço "latest" até o arquivo, e lê o número da versão
            // no caminho (…/download/android-143/…)
            var url = URL(APK)
            var con: HttpURLConnection
            var saltos = 0
            var numero = 0
            while (true) {
                con = url.openConnection() as HttpURLConnection
                con.instanceFollowRedirects = false
                con.connectTimeout = 15000; con.readTimeout = 30000
                val c = con.responseCode
                if (c in 300..399 && saltos < 6) {
                    val prox = con.getHeaderField("Location")
                    Regex("android-(\\d+)").find(prox ?: "")?.let { numero = it.groupValues[1].toInt() }
                    url = URL(url, prox); con.disconnect(); saltos++; continue
                }
                break
            }
            val meu = try { packageManager.getPackageInfo(packageName, 0).longVersionCode } catch (e: Throwable) { 0L }
            if (numero > 0 && numero <= meu) {
                con.disconnect()
                mostrar(100, "✅ Você já está na versão mais nova (" + meu + ")", "Não há nada para atualizar.", Color.parseColor("#4CD137"))
                botao("Voltar ao Treino Livre") { finish() }
                return
            }
            if (con.responseCode != 200) throw java.io.IOException("o servidor respondeu " + con.responseCode)
            val total = con.contentLengthLong
            val arquivo = java.io.File(cacheDir, "atualizar.apk")
            var lido = 0L
            con.inputStream.use { ent ->
                arquivo.outputStream().use { sai ->
                    val buf = ByteArray(64 * 1024)
                    var ult = -1
                    while (true) {
                        val n = ent.read(buf); if (n < 0) break
                        sai.write(buf, 0, n); lido += n
                        if (total > 0) {
                            val p = (lido * 90 / total).toInt()
                            if (p != ult) { ult = p; mostrar(p, "⬇ Baixando a versão " + (if (numero > 0) numero.toString() else "nova") + "…", (lido / 1048576).toString() + " de " + (total / 1048576) + " MB") }
                        }
                    }
                }
            }
            if (total > 0 && lido != total) throw java.io.IOException("o download parou no meio (" + (lido / 1048576) + " de " + (total / 1048576) + " MB)")
            mostrar(92, "📲 Preparando a instalação…")
            val pi = packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            params.setAppPackageName(packageName)
            if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            val id = pi.createSession(params)
            pi.openSession(id).use { s ->
                s.openWrite("treino-livre.apk", 0, arquivo.length()).use { sai -> arquivo.inputStream().use { it.copyTo(sai) }; s.fsync(sai) }
                val volta = Intent(this, AtualizarApp::class.java).setAction(STATUS)
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                s.commit(PendingIntent.getActivity(this, 0, volta, flags).intentSender)
            }
            mostrar(96, "📲 Toque em Atualizar na janela do Android", "Depois o app fecha e abre na versão nova: é só abrir de novo pelo ícone.")
        } catch (e: Exception) {
            trabalhando = false
            mostrar(pctAtual(), "⚠ Não deu certo desta vez", (e.message ?: e.javaClass.simpleName) + "\n\nConfira a internet e tente de novo.", Color.parseColor("#FFB020"))
            botao("🔁 Tentar de novo") { comecar() }
        }
    }

    private fun pctAtual() = pct.text.toString().removeSuffix("%").toIntOrNull() ?: 0

    private fun tratarStatus(i: Intent) {
        val st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)
        when (st) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val pedir = i.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                if (pedir != null) try { startActivity(pedir) } catch (e: Exception) { }
                mostrar(97, "📲 Toque em Atualizar na janela do Android")
            }
            PackageInstaller.STATUS_SUCCESS -> {
                mostrar(100, "✅ Atualizado!", "Abra o Treino Livre pelo ícone.", Color.parseColor("#4CD137"))
            }
            else -> {
                trabalhando = false
                val msg = i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""
                val porque = when (st) {
                    PackageInstaller.STATUS_FAILURE_ABORTED -> "A instalação foi cancelada."
                    PackageInstaller.STATUS_FAILURE_CONFLICT -> "O app instalado foi assinado com outra chave. Desinstale o Treino Livre (os treinos ficam no Chrome) e instale o novo."
                    PackageInstaller.STATUS_FAILURE_STORAGE -> "Falta espaço no celular (o app tem uns 60 MB)."
                    PackageInstaller.STATUS_FAILURE_BLOCKED -> "O Android bloqueou a instalação (Play Protect ou permissão)."
                    else -> "O Android não instalou."
                }
                mostrar(pctAtual(), "⚠ " + porque, msg, Color.parseColor("#FFB020"))
                botao("🔁 Tentar de novo") { comecar() }
            }
        }
    }
}
