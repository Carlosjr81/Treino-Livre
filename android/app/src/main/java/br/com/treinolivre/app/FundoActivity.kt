package br.com.treinolivre.app

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable

// O relógio ficava em "Procurando o celular…" num Redmi Note 13 Pro+ com um
// Galaxy Watch 6 (relato do dono, 2026-11-19a; no Galaxy S26 com o Watch 8
// funcionava). O relógio fala com o celular por uma mensagem que o Google Play
// Services entrega acordando o OuvinteRelogio, e o Xiaomi (MIUI/HyperOS), como
// Oppo, Realme, Vivo, Huawei e Honor, não deixa um app ser acordado por outro
// sem o "Início automático" ligado. Esta tela leva a pessoa até lá e à bateria
// sem restrição. Abre sozinha no fim da instalação do relógio nessas marcas, e
// pelo treinolivre://relogio-fundo do site.
class FundoActivity : Activity() {
    companion object {
        // as marcas que barram o app de acordar em segundo plano
        fun marca(): String = (Build.MANUFACTURER ?: "").lowercase()
        fun precisa(): Boolean {
            val m = marca()
            return listOf("xiaomi", "redmi", "poco", "oppo", "realme", "oneplus", "vivo", "iqoo", "huawei", "honor", "asus", "meizu", "tecno", "infinix").any { m.contains(it) }
        }
        fun nomeDaMarca(): String {
            val m = marca()
            return when {
                m.contains("xiaomi") || m.contains("redmi") || m.contains("poco") -> "Xiaomi, Redmi ou POCO"
                m.contains("oppo") || m.contains("realme") || m.contains("oneplus") -> "Oppo, Realme ou OnePlus"
                m.contains("vivo") || m.contains("iqoo") -> "Vivo"
                m.contains("huawei") || m.contains("honor") -> "Huawei ou Honor"
                else -> Build.MANUFACTURER ?: "este celular"
            }
        }
        fun abrir(c: Context) {
            try { c.startActivity(Intent(c, FundoActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Exception) { }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#0B0B0F")
        getSharedPreferences("relogio", MODE_PRIVATE).edit().putBoolean("fundoVisto", true).apply()
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val caixa = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(18), dp(24), dp(18), dp(28)) }
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false, t: String) = TextView(this).apply {
            textSize = tam; setTextColor(cor); text = t; setLineSpacing(0f, 1.2f)
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        fun lp(topo: Int = 12) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(topo) }
        fun botao(rotulo: String, cor: Int, acao: () -> Unit) = Button(this).apply {
            text = rotulo; isAllCaps = false; textSize = 16f; setTextColor(Color.WHITE); minHeight = dp(52)
            background = GradientDrawable().apply { cornerRadius = dp(26).toFloat(); setColor(cor) }
            setOnClickListener { acao() }
        }
        val cinza = Color.parseColor("#9A9AA5")
        val rosa = Color.parseColor("#E1306C")
        val escuro = Color.parseColor("#2A2A33")

        caixa.addView(texto(22f, negrito = true, t = "⌚ Deixe o relógio falar com o celular"))
        // 2026-11-19b: o teste que diz onde a conexão para (relato do dono, Redmi
        // + Galaxy Watch 6 em "Procurando o celular" mesmo com tudo liberado)
        caixa.addView(texto(16f, negrito = true, t = "🔎 Testar a conexão agora"), lp(16))
        caixa.addView(texto(14f, cinza, t = "Com o relógio no pulso e o app Treino Livre aberto nele."), lp(4))
        resultado = texto(15f, t = "")
        caixa.addView(botao("Testar a conexão com o relógio", rosa) { testar() }, lp(8))
        caixa.addView(resultado, lp(8))
        if (precisa()) caixa.addView(texto(15f, t = "Em celulares " + nomeDaMarca() + ", o sistema não deixa o Treino Livre acordar quando o relógio chama. Aí o relógio fica em \"Procurando o celular…\". Libere duas coisas, uma vez só:"), lp(18))
        else caixa.addView(texto(15f, t = "Se o teste falhar no Treino Livre, libere estas duas coisas (alguns celulares economizam bateria fechando o app):"), lp(18))
        caixa.addView(texto(16f, negrito = true, t = "1. Início automático"), lp(18))
        caixa.addView(texto(14f, cinza, t = "Na lista que abrir, ligue o Treino Livre. (No Xiaomi: Segurança › Apps › Permissões › Início automático.)"), lp(4))
        caixa.addView(botao("Abrir o Início automático", rosa) { abrirInicioAutomatico() }, lp(8))
        caixa.addView(texto(16f, negrito = true, t = "2. Bateria sem restrição"), lp(18))
        caixa.addView(texto(14f, cinza, t = "Em Bateria (ou Economia de bateria), escolha Sem restrições para o Treino Livre."), lp(4))
        caixa.addView(botao("Abrir a bateria do app", rosa) { abrirBateria() }, lp(8))
        caixa.addView(texto(14f, cinza, t = "Depois, abra o Treino Livre pelo ícone e comece o treino: o relógio acompanha."), lp(18))
        caixa.addView(botao("Pronto, voltar ao Treino Livre", escuro) {
            try { startActivity(Intent(this, AberturaActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Exception) { }
            finish()
        }, lp(14))
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.parseColor("#0B0B0F")); addView(caixa) })
    }

    private var resultado: TextView? = null
    private var ouvinte: MessageClient.OnMessageReceivedListener? = null
    private val linha = android.os.Handler(android.os.Looper.getMainLooper())

    private fun dizer(t: String) { runOnUiThread { resultado?.text = t } }

    // Três perguntas, na ordem em que a conexão pode parar: há relógio conectado
    // a este celular (Google Play Services e o app do relógio)? O relógio tem o
    // Treino Livre? O app do relógio responde (os dois sentidos da mensagem)?
    private fun testar() {
        dizer("⏳ Procurando o relógio…")
        try {
            Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
                if (nos.isEmpty()) {
                    dizer("✗ Nenhum relógio conectado a este celular.\n\nConfira: Bluetooth ligado, o app Galaxy Wearable (ou Wear OS / Pixel Watch) mostrando o relógio conectado, e o Google Play Services atualizado na Play Store. Celular Huawei ou Honor sem os serviços do Google não conecta relógio Wear OS.")
                    return@addOnSuccessListener
                }
                val nomes = nos.joinToString(", ") { it.displayName }
                dizer("⏳ Relógio conectado: $nomes. Chamando o Treino Livre do relógio…")
                Relogio.desligado(applicationContext)
                val o = MessageClient.OnMessageReceivedListener { m ->
                    if (m.path == "/treino/pong") {
                        linha.removeCallbacksAndMessages(null)
                        tirarOuvinte()
                        val v = String(m.data, Charsets.UTF_8).substringAfter("|", "")
                        dizer("✓ Tudo certo: o relógio ($nomes) e o celular conversam nos dois sentidos" + (if (v.isNotEmpty()) " (app do relógio $v)" else "") + ".\n\nAgora comece o treino no Treino Livre deste celular: o relógio acompanha a partir da primeira série marcada." + (if (precisa()) "\n\nSe o relógio ainda ficar em \"Procurando\" com o app fechado, libere o Início automático abaixo." else ""))
                    }
                }
                tirarOuvinte()
                ouvinte = o
                Wearable.getMessageClient(this).addListener(o)
                nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/ping", ByteArray(0)) }
                linha.postDelayed({
                    tirarOuvinte()
                    dizer("✗ O relógio ($nomes) está conectado, mas o Treino Livre dele não respondeu.\n\n• Confira se o app Treino Livre está instalado no relógio (instale de novo pelo assistente, se preciso).\n• O app do relógio precisa ser a versão nova: atualize pelo assistente.\n• Abra o Treino Livre no relógio e teste de novo.")
                }, 8000L)
            }.addOnFailureListener {
                dizer("✗ Este celular não alcança relógios (Google Play Services indisponível ou desatualizado). Atualize o Google Play Services na Play Store.")
            }
        } catch (e: Exception) {
            dizer("✗ Falhou: " + (e.message ?: e.javaClass.simpleName))
        }
    }

    private fun tirarOuvinte() {
        val o = ouvinte ?: return
        ouvinte = null
        try { Wearable.getMessageClient(this).removeListener(o) } catch (e: Exception) { }
    }

    override fun onDestroy() {
        linha.removeCallbacksAndMessages(null)
        tirarOuvinte()
        super.onDestroy()
    }

    private fun tentar(vararg intents: Intent): Boolean {
        for (i in intents) {
            try { startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return true } catch (e: Exception) { }
        }
        return false
    }

    private fun comp(pacote: String, classe: String) = Intent().setComponent(ComponentName(pacote, classe))

    private fun detalhes() = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))

    private fun abrirInicioAutomatico() {
        tentar(
            comp("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
            comp("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
            comp("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
            comp("com.oplus.safecenter", "com.oplus.safecenter.permission.startup.StartupAppListActivity"),
            comp("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
            comp("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
            comp("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
            comp("com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
            comp("com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity"),
            detalhes(),
        )
    }

    private fun abrirBateria() {
        tentar(
            Intent("miui.intent.action.HIDDEN_APPS_CONFIG_ACTIVITY").putExtra("package_name", packageName).putExtra("package_label", "Treino Livre"),
            detalhes(),
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
        )
    }
}
