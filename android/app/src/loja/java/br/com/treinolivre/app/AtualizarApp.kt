package br.com.treinolivre.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity

// Na versão da Play Store quem atualiza o app é a loja: o botão abre a página dele.
class AtualizarApp : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + packageName))) } catch (e: Exception) { }
        finish()
    }
}
