package br.com.treinolivre.app

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.json.JSONObject

// O "Sincronizar" do site: treinolivre://saude?d=<os treinos do app>.
// Pede a permissão (só na primeira vez), grava os treinos, lê o Health Connect
// e volta para o site com tudo no link (#saude=). Qualquer falha também volta,
// com o motivo: o site diz o que fazer, em vez de a tela simplesmente sumir.
class SaudeActivity : ComponentActivity() {
    private var treinos: List<TreinoDoSite> = emptyList()

    private val pedirPermissao = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
        lifecycleScope.launch { continuar() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(Color.parseColor("#16161D"))
            addView(ProgressBar(this@SaudeActivity))
            addView(TextView(this@SaudeActivity).apply {
                text = "Lendo o Health Connect…"
                setTextColor(Color.WHITE)
                textSize = 16f
                gravity = Gravity.CENTER
                setPadding(0, 24, 0, 0)
            })
        })
        if (savedInstanceState != null) return
        treinos = LeitorSaude.lerPedido(intent?.data?.getQueryParameter("d"))

        when (HealthConnectClient.getSdkStatus(this, LeitorSaude.PACOTE_HC)) {
            HealthConnectClient.SDK_AVAILABLE -> lifecycleScope.launch {
                val dadas = try {
                    HealthConnectClient.getOrCreate(this@SaudeActivity).permissionController.getGrantedPermissions()
                } catch (e: Exception) { emptySet() }
                if (dadas.containsAll(LeitorSaude.TODAS)) continuar()
                else pedirPermissao.launch(LeitorSaude.TODAS)
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> { voltarComErro("atualizar"); abrirLoja() }
            else -> { voltarComErro("indisponivel"); if (android.os.Build.VERSION.SDK_INT < 34) abrirLoja() }
        }
    }

    private suspend fun continuar() {
        try {
            val client = HealthConnectClient.getOrCreate(this)
            val dadas = client.permissionController.getGrantedPermissions()
            if (dadas.intersect(LeitorSaude.TODAS).isEmpty()) { voltarComErro("sem-permissao"); return }
            val json = LeitorSaude.ler(client, dadas, treinos, packageName)
            getSharedPreferences("saude", MODE_PRIVATE).edit().putLong("ultima", System.currentTimeMillis()).apply()
            voltar(json)
        } catch (e: Exception) {
            voltarComErro("falhou")
        }
    }

    private fun voltarComErro(motivo: String) {
        voltar(JSONObject().put("v", 1).put("em", System.currentTimeMillis()).put("erro", motivo))
    }

    // Volta para o site numa tarefa nova: o site recarrega com o link e lê tudo
    private fun voltar(json: JSONObject) {
        startActivity(
            Intent(this, AberturaActivity::class.java)
                .setData(Site.endereco(Site.codificar(json.toString())))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        )
        finish()
    }

    private fun abrirLoja() {
        try {
            startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=${LeitorSaude.PACOTE_HC}&url=healthconnect%3A%2F%2Fonboarding"))
                    .setPackage("com.android.vending")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (e: Exception) { }
    }
}
