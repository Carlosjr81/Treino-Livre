package br.com.treinolivre.app

import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.trusted.TrustedWebActivityIntentBuilder
import com.google.androidbrowserhelper.trusted.TwaLauncher

// O app é o site. Ele abre no Chrome como tela cheia (Trusted Web Activity), e
// não numa WebView, por três motivos: os dados de quem já usa o Treino Livre
// estão no Chrome e continuam lá; o Bluetooth da esteira e da cinta e o
// reconhecimento de voz só existem no Chrome; e uma atualização do site chega
// sem atualizar o APK.
object Site {
    const val ENDERECO = "https://carlosjr81.github.io/Treino-Livre/"
    const val CHROME = "com.android.chrome"

    fun endereco(pacoteSaude: String? = null): Uri {
        // bolso=2: este app fala com a tela travada (BolsoService). A página só
        // chama treinolivre://bolso a cada ✓ quando sabe disso.
        // corrida=1: e conduz o desafio de corrida com a tela travada (CorridaService).
        val base = "$ENDERECO?app=android&bolso=2&corrida=1"
        return Uri.parse(if (pacoteSaude == null) base else "$base#saude=$pacoteSaude")
    }

    // O JSON vai no link em base64 (UTF-8, sem quebras, no alfabeto de URL)
    fun codificar(json: String): String =
        Base64.encodeToString(json.toByteArray(Charsets.UTF_8), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    fun decodificar(texto: String): String =
        String(Base64.decode(texto, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING), Charsets.UTF_8)

    // O Chrome, de propósito, mesmo quando outro navegador é o padrão: é nele
    // que estão os treinos de quem já usava o site.
    private fun provedor(activity: Activity): String? = try {
        activity.packageManager.getPackageInfo(CHROME, 0)
        CHROME
    } catch (e: PackageManager.NameNotFoundException) {
        null
    }

    // Abre com a sessão do canal (Canal.kt), que é o que leva a imagem dos
    // óculos até a página. Se não der, o TwaLauncher de sempre: o app abre
    // igual, só sem o canal.
    fun abrir(activity: Activity, uri: Uri, guardar: (TwaLauncher) -> Unit, depois: () -> Unit) {
        val cor = Color.parseColor("#0B0B0F")
        val cores = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(cor)
            .setNavigationBarColor(cor)
            .build()
        val pacote = provedor(activity)
        val antigo = {
            val pedido = TrustedWebActivityIntentBuilder(uri).setDefaultColorSchemeParams(cores)
            val lancador = TwaLauncher(activity, pacote)
            guardar(lancador)
            lancador.launch(pedido, null, null) { depois() }
        }
        if (pacote == null || !Canal.abrir(activity, pacote, uri, cores, depois) { antigo() }) antigo()
    }
}
