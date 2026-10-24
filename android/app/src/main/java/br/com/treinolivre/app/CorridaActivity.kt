package br.com.treinolivre.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.androidbrowserhelper.trusted.TwaLauncher
import org.json.JSONObject

// O desafio de corrida com a tela travada: treinolivre://corrida.
//   ?d=<a corrida>        o Largar da página: liga o CorridaService
//   ?acao=pausar|retomar|encerrar|parar|kmh&v=   os botões da página
//   ?ver=1                a notificação: abre a página nesta corrida (#corridaApp=)
// Sem tela, como o bolso: a página chama a cada toque, e não pode piscar.
class CorridaActivity : ComponentActivity() {
    private var cfg: String? = null
    private var lancador: TwaLauncher? = null

    private val pedir = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { seguir() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION") overridePendingTransition(0, 0)
        if (savedInstanceState != null) return
        val dados = intent?.data
        val acao = dados?.getQueryParameter("acao")
        when {
            dados?.getQueryParameter("ver") == "1" -> ver()
            acao != null -> {
                if (CorridaService.instancia != null) {
                    try {
                        startService(Intent(this, CorridaService::class.java).setAction(acao).putExtra("v", dados?.getQueryParameter("v")))
                    } catch (e: Exception) { }
                }
                sair()
            }
            else -> {
                cfg = try { Site.decodificar(dados?.getQueryParameter("d").orEmpty()) } catch (e: Exception) { null }
                val ok = try { cfg != null && JSONObject(cfg!!).has("c") } catch (e: Exception) { false }
                if (!ok) { finish(); return }
                val faltam = permissoes().filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
                if (faltam.isEmpty()) seguir() else pedir.launch(faltam.toTypedArray())
            }
        }
    }

    private fun permissoes(): List<String> {
        val l = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) l.add(Manifest.permission.POST_NOTIFICATIONS)
        return l
    }

    private fun seguir() {
        // O serviço da corrida é do tipo "localização" (é o que o Android deixa
        // rodar com a tela travada medindo o GPS): sem a permissão, ele não liga.
        val local = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!local) {
            Toast.makeText(applicationContext, "Sem a permissão de localização, a corrida não segue com a tela travada. Deixe a tela ligada.", Toast.LENGTH_LONG).show()
            sair()
            return
        }
        try {
            ContextCompat.startForegroundService(this, Intent(this, CorridaService::class.java).putExtra("cfg", cfg))
        } catch (e: Exception) {
            Toast.makeText(applicationContext, "Não consegui ligar a corrida com a tela travada.", Toast.LENGTH_LONG).show()
            sair()
            return
        }
        Toast.makeText(applicationContext, "🔒 Pode travar a tela: o app segue com a corrida.", Toast.LENGTH_SHORT).show()
        // o serviço de localização precisa ser ligado com o app à vista
        Handler(Looper.getMainLooper()).postDelayed({ sair() }, 600L)
    }

    private fun sair() {
        if (!isTaskRoot) {
            finish()
            @Suppress("DEPRECATION") overridePendingTransition(0, 0)
            return
        }
        try { Site.abrir(this, Site.endereco(), { lancador = it }) { finish() } } catch (e: Exception) { finish() }
    }

    // A notificação: a página volta para esta corrida, mesmo que o Chrome a
    // tenha fechado enquanto a tela estava travada
    private fun ver() {
        val estado = CorridaService.lerEstado(this)
        if (estado.isNullOrEmpty()) { sair(); return }
        try {
            val uri = Uri.parse(Site.endereco().toString() + "#corridaApp=" + Site.codificar(estado))
            Site.abrir(this, uri, { lancador = it }) { finish() }
        } catch (e: Exception) { finish() }
    }

    override fun onDestroy() {
        lancador?.destroy()
        super.onDestroy()
    }
}
