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
import org.json.JSONArray
import org.json.JSONObject

// O 🔒 da tela do treino: treinolivre://bolso.
//   ?d=<cópia do treino>  liga o Jarvis da tela travada (ou atualiza a cópia:
//                         é também o "Trazer" — o que ele anotou volta antes)
//   ?entregar=1           a notificação: leva ao treino o que foi anotado
//   ?parar=1              desliga, e leva junto o que ficou
// O que volta vai no link #bolso=, como a saúde volta por #saude=.
class BolsoActivity : ComponentActivity() {
    private var snap: String? = null
    private var lancador: TwaLauncher? = null

    private val pedir = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { seguirLigar() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Sem tela: a cada ✓ do treino ela passa por aqui, e não pode piscar.
        @Suppress("DEPRECATION") overridePendingTransition(0, 0)
        if (savedInstanceState != null) return
        val dados = intent?.data
        when {
            dados?.getQueryParameter("parar") == "1" -> {
                val pend = BolsoService.tirarPendentes(this)
                if (BolsoService.instancia != null) {
                    try { startService(Intent(this, BolsoService::class.java).setAction(BolsoService.PARAR)) } catch (e: Exception) { }
                }
                voltar(pend, true)
            }
            dados?.getQueryParameter("entregar") == "1" -> voltar(BolsoService.tirarPendentes(this), false)
            else -> {
                snap = try { Site.decodificar(dados?.getQueryParameter("d").orEmpty()) } catch (e: Exception) { null }
                val ok = try { snap != null && JSONObject(snap!!).has("itens") } catch (e: Exception) { false }
                if (!ok) { finish(); return }
                val faltam = permissoes().filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
                if (faltam.isEmpty()) seguirLigar() else pedir.launch(faltam.toTypedArray())
            }
        }
    }

    private fun permissoes(): List<String> {
        val l = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33) l.add(Manifest.permission.POST_NOTIFICATIONS)
        return l
    }

    private fun seguirLigar() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(applicationContext, "Sem a permissão do microfone, o Jarvis não ouve com a tela travada.", Toast.LENGTH_LONG).show()
            voltar(JSONArray(), true)
            return
        }
        // O que ele anotou e a página ainda não tem volta agora; a cópia nova
        // segue com isso aplicado (a página vai aplicar o mesmo).
        val pend = BolsoService.tirarPendentes(this)
        val primeira = BolsoService.instancia == null
        val dados = intent?.data
        try {
            ContextCompat.startForegroundService(this, Intent(this, BolsoService::class.java)
                .putExtra("snap", snap)
                .putExtra("aplicar", pend.toString())
                .putExtra("falar", dados?.getQueryParameter("f"))
                .putExtra("fimFala", dados?.getQueryParameter("ff"))
                .putExtra("crono", dados?.getQueryParameter("c"))
                .putExtra("musica", dados?.getQueryParameter("mu") ?: "0"))
        } catch (e: Exception) {
            Toast.makeText(applicationContext, "Não consegui ligar o Jarvis da tela travada.", Toast.LENGTH_LONG).show()
            voltar(JSONArray(), true)
            return
        }
        if (!primeira) { voltar(pend, false); return }
        Toast.makeText(applicationContext, "🔒 O Jarvis fala com a tela travada.", Toast.LENGTH_SHORT).show()
        // O microfone em segundo plano só vale para serviço ligado com o app à
        // vista: na primeira vez, um instante antes de sair.
        Handler(Looper.getMainLooper()).postDelayed({ voltar(pend, false) }, 700L)
    }

    // Reabre a mesma página do treino com #bolso= (o Chrome só troca o fragmento)
    private fun voltar(eventos: JSONArray, fim: Boolean) {
        val trazer = intent?.data?.getQueryParameter("t") == "1"
        if (eventos.length() == 0 && !fim && !trazer && !isTaskRoot) {
            finish()
            @Suppress("DEPRECATION") overridePendingTransition(0, 0)
            return
        }
        try {
            val pacote = JSONObject().put("ev", eventos).put("dg", BolsoService.lerDiario(this))
            if (fim) pacote.put("fim", 1)
            val uri = Uri.parse(Site.ENDERECO + "?app=android#bolso=" + Site.codificar(pacote.toString()))
            Site.abrir(this, uri, { lancador = it }) { finish() }
        } catch (e: Exception) { finish() }
    }

    override fun onDestroy() {
        lancador?.destroy()
        super.onDestroy()
    }
}
