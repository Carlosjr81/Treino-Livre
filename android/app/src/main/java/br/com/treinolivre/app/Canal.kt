package br.com.treinolivre.app

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsCallback
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsService
import androidx.browser.customtabs.CustomTabsServiceConnection
import androidx.browser.customtabs.CustomTabsSession
import androidx.browser.trusted.TrustedWebActivityIntentBuilder

// O canal de mensagens entre o app e a página (postMessage do TWA, Chrome 115+).
//
// Por que existe: a imagem dos óculos ia da parte nativa para a página por
// http://127.0.0.1, e no celular do dono o Chrome barrou esse caminho sem
// perguntar nada ("rede local"). O canal do próprio TWA não passa pela rede:
// é o Chrome entregando a mensagem à página que ele mesmo abriu para nós.
//
// Por isso o app abre o site com uma sessão sua (e não pelo TwaLauncher): é a
// sessão que carrega o canal. Sem o Chrome, ou se a ligação demorar, o Site
// cai no TwaLauncher de sempre — o app abre igual, só sem o canal.
object Canal {
    val ORIGEM: Uri = Uri.parse("https://carlosjr81.github.io")

    @Volatile var sessao: CustomTabsSession? = null
    @Volatile var pronto = false
    @Volatile var aoMensagem: ((String) -> Unit)? = null
    private var conexao: CustomTabsServiceConnection? = null
    private val principal = Handler(Looper.getMainLooper())
    @Volatile private var contexto: Context? = null
    // Diagnóstico do canal só no log: na tela ele aparecia por cima da vinheta
    // de abertura, e o canal nem é mais o caminho dos óculos.
    private fun aviso(msg: String) {
        android.util.Log.i("TreinoLivre", "Canal: " + msg)
    }

    private val retorno = object : CustomTabsCallback() {
        override fun onNavigationEvent(navigationEvent: Int, extras: Bundle?) {
            // a cada página carregada, um canal novo (a página velha levou o dela)
            if (navigationEvent != NAVIGATION_FINISHED) return
            pronto = false
            val ok = try { sessao?.requestPostMessageChannel(ORIGEM, ORIGEM, Bundle()) ?: false } catch (e: Exception) { false }
            if (!ok) aviso("o Chrome recusou o pedido do canal")
        }

        override fun onRelationshipValidationResult(relation: Int, requestedOrigin: Uri, result: Boolean, extras: Bundle?) {
            if (!result) aviso("o Chrome ainda não confirmou o app como do site (pode levar até 1 h)")
        }

        override fun onMessageChannelReady(extras: Bundle?) {
            pronto = true
            // a primeira mensagem entrega a porta à página
            val r = try { sessao?.postMessage("ola", null) ?: -1 } catch (e: Exception) { -1 }
            aviso(if (r == CustomTabsService.RESULT_SUCCESS) "ligado ✓" else "aberto, mas a página não recebeu ($r)")
        }

        override fun onPostMessage(message: String, extras: Bundle?) {
            aoMensagem?.invoke(message)
        }
    }

    fun enviar(mensagem: String): Boolean {
        val s = sessao ?: return false
        if (!pronto) return false
        return try { s.postMessage(mensagem, null) == CustomTabsService.RESULT_SUCCESS } catch (e: Exception) { false }
    }

    // Abre o site com a sessão do canal. Devolve false se não deu para tentar
    // (aí quem chamou usa o caminho antigo).
    fun abrir(activity: Activity, pacote: String, uri: Uri, cores: CustomTabColorSchemeParams, depois: () -> Unit, senao: () -> Unit): Boolean {
        contexto = activity.applicationContext
        val pronta = sessao
        if (pronta != null) { lancar(activity, pronta, uri, cores, depois, senao); return true }
        var resolvido = false
        val desistir = Runnable { if (!resolvido) { resolvido = true; aviso("o Chrome demorou; abrindo sem o canal"); senao() } }
        val conn = object : CustomTabsServiceConnection() {
            override fun onCustomTabsServiceConnected(name: ComponentName, client: CustomTabsClient) {
                if (resolvido) return
                try {
                    client.warmup(0L)
                    val s = client.newSession(retorno)
                    if (s == null) { resolvido = true; principal.removeCallbacks(desistir); senao(); return }
                    sessao = s
                    try { s.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGEM, null) } catch (e: Exception) { }
                    resolvido = true
                    principal.removeCallbacks(desistir)
                    lancar(activity, s, uri, cores, depois, senao)
                } catch (e: Exception) {
                    if (!resolvido) { resolvido = true; principal.removeCallbacks(desistir); senao() }
                }
            }

            override fun onServiceDisconnected(name: ComponentName) {
                sessao = null
                pronto = false
                conexao = null
            }
        }
        val ligou = try {
            CustomTabsClient.bindCustomTabsService(activity.applicationContext, pacote, conn)
        } catch (e: Exception) { false }
        if (!ligou) return false
        conexao = conn
        principal.postDelayed(desistir, 3000L)
        return true
    }

    private fun lancar(activity: Activity, s: CustomTabsSession, uri: Uri, cores: CustomTabColorSchemeParams, depois: () -> Unit, senao: () -> Unit) {
        try {
            TrustedWebActivityIntentBuilder(uri)
                .setDefaultColorSchemeParams(cores)
                .build(s)
                .launchTrustedWebActivity(activity)
            depois()
        } catch (e: Exception) {
            senao()
        }
    }

    @Suppress("unused")
    fun desligar(contexto: Context) {
        val c = conexao ?: return
        try { contexto.applicationContext.unbindService(c) } catch (e: Exception) { }
        conexao = null
        sessao = null
        pronto = false
    }
}
