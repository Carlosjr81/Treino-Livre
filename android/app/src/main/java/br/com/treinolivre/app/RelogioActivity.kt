package br.com.treinolivre.app

import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.Wearable
import com.google.androidbrowserhelper.trusted.TwaLauncher

// O "✓ Conferir o relógio" do assistente de instalação: treinolivre://relogio.
// Pergunta ao Google Play Services se há relógio conectado e se o app do
// Treino Livre está nele (a capacidade "treino_livre_relogio", declarada no
// app do relógio), e volta ao site com #relogio=<resultado>:
//   pronto      o app está no relógio
//   falta       há relógio conectado, sem o app
//   semrelogio  nenhum relógio conectado ao celular
//   erro        o Google Play Services não respondeu
// Um app antigo, sem esta tela, faz o Chrome baixar o app novo: é o
// browser_fallback_url do link.
class RelogioActivity : ComponentActivity() {
    private var lancador: TwaLauncher? = null
    private var foi = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION") overridePendingTransition(0, 0)
        if (savedInstanceState != null) return
        Handler(Looper.getMainLooper()).postDelayed({ voltar("erro") }, 8000L)
        try {
            Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
                if (nos.isEmpty()) { voltar("semrelogio"); return@addOnSuccessListener }
                Wearable.getCapabilityClient(this)
                    .getCapability("treino_livre_relogio", CapabilityClient.FILTER_REACHABLE)
                    .addOnSuccessListener { cap ->
                        if (cap.nodes.isNotEmpty()) Relogio.abrirNoRelogio(applicationContext)
                        voltar(if (cap.nodes.isNotEmpty()) "pronto" else "falta")
                    }
                    .addOnFailureListener { voltar("falta") }
            }.addOnFailureListener { voltar("erro") }
        } catch (e: Exception) { voltar("erro") }
    }

    private fun voltar(resultado: String) {
        if (foi) return
        foi = true
        BolsoService.diario(this, "relógio conferido: " + resultado)
        try {
            val uri = Uri.parse(Site.ENDERECO + "?app=android#relogio=" + resultado)
            Site.abrir(this, uri, { lancador = it }) { finish() }
        } catch (e: Exception) { finish() }
    }

    override fun onDestroy() {
        lancador?.destroy()
        super.onDestroy()
    }
}
