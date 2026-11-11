package br.com.treinolivre.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.wear.remote.interactions.RemoteActivityHelper
import java.util.concurrent.Executors

// O "Instalar no relógio agora" na versão da Play Store: a loja proíbe app que
// instala outro app por fora dela, e nem precisa — o app do relógio está na
// mesma ficha da loja. Então o botão abre a página do Treino Livre na Play
// Store do relógio, onde é um toque em Instalar.
// (A versão direta, do GitHub, instala pelo Wi-Fi: src/direto.)
class InstaladorRelogio : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            val loja = Intent(Intent.ACTION_VIEW)
                .addCategory(Intent.CATEGORY_BROWSABLE)
                .setData(Uri.parse("market://details?id=" + packageName))
            RemoteActivityHelper(applicationContext, Executors.newSingleThreadExecutor()).startRemoteActivity(loja, null)
            Toast.makeText(applicationContext, "⌚ Olhe o relógio: a Play Store abriu nele. Toque em Instalar.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(applicationContext, "Abra a Play Store no relógio e procure Treino Livre.", Toast.LENGTH_LONG).show()
        }
        finish()
    }
}
