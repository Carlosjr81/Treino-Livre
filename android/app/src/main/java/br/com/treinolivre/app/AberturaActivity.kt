package br.com.treinolivre.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.lifecycle.lifecycleScope
import com.google.androidbrowserhelper.trusted.TwaLauncher
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

// O ícone do app. Com a leitura já permitida, passa no Health Connect antes de
// abrir o site — é o que faz os passos e o sono estarem lá sem ninguém tocar em
// "Sincronizar". Demorou mais que 4 s, abre sem: ninguém espera o app abrir.
// Só roda quando o app abre do zero: com ele aberto, o ícone volta para onde a
// pessoa estava (o Android traz a tarefa de volta), e o treino não recarrega.
class AberturaActivity : ComponentActivity() {
    private var lancador: TwaLauncher? = null
    private var abriu = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState != null) return
        val pedido = intent?.data
        if (pedido != null && pedido.scheme == "https") {
            abrir(pedido)
            return
        }
        lifecycleScope.launch {
            val pacote = withTimeoutOrNull(4000L) { leituraAutomatica() }
            abrir(Site.endereco(pacote))
        }
    }

    private suspend fun leituraAutomatica(): String? {
        return try {
            if (HealthConnectClient.getSdkStatus(this, LeitorSaude.PACOTE_HC) != HealthConnectClient.SDK_AVAILABLE) return null
            val prefs = getSharedPreferences("saude", MODE_PRIVATE)
            if (System.currentTimeMillis() - prefs.getLong("ultima", 0L) < 10 * 60 * 1000L) return null
            val client = HealthConnectClient.getOrCreate(this)
            val dadas = client.permissionController.getGrantedPermissions()
            if (dadas.intersect(LeitorSaude.LEITURA).isEmpty()) return null
            val json = LeitorSaude.ler(client, dadas, emptyList(), packageName).put("s", 1)
            prefs.edit().putLong("ultima", System.currentTimeMillis()).apply()
            Site.codificar(json.toString())
        } catch (e: Exception) {
            null
        }
    }

    private fun abrir(uri: android.net.Uri) {
        lancador = Site.abrir(this, uri) { abriu = true }
    }

    // A pessoa voltou do site para cá (botão voltar): o app fecha
    override fun onRestart() {
        super.onRestart()
        if (abriu) finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        lancador?.destroy()
    }
}
