package br.com.treinolivre.app

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.core.types.RegistrationState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

// O 👓 do Eyes Scan: treinolivre://oculos?k=<chave>.
// Prepara o que só uma tela consegue pedir — o Bluetooth do Android, o
// registro do Treino Livre no app Meta AI e a câmera dos óculos — e entrega
// o resto ao OculosService, que segue rodando com o site de volta na frente.
// A tela some sozinha: o Eyes Scan continua aberto atrás dela, esperando.
class OculosActivity : ComponentActivity() {
    private var chave = ""

    private val pedirBluetooth = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        lifecycleScope.launch { seguir() }
    }
    private val pedirCamera = registerForActivityResult(Wearables.RequestPermissionContract()) { resultado ->
        val status = resultado.getOrDefault(PermissionStatus.Denied)
        if (status == PermissionStatus.Granted) ligarServico()
        else { Oculos.estado = "sem-permissao"; finish() }
    }

    private lateinit var texto: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        texto = TextView(this).apply {
            text = "Ligando os óculos…"
            setTextColor(Color.WHITE)
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(Color.parseColor("#16161D"))
            addView(ProgressBar(this@OculosActivity))
            addView(texto)
        })
        if (savedInstanceState != null) return
        chave = intent?.data?.getQueryParameter("k").orEmpty().take(64)
        if (chave.length < 16) { finish(); return }
        Oculos.estado = "iniciando"

        val faltam = permissoesBluetooth().filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (faltam.isNotEmpty()) pedirBluetooth.launch(faltam.toTypedArray())
        else lifecycleScope.launch { seguir() }
    }

    private fun permissoesBluetooth(): List<String> =
        if (Build.VERSION.SDK_INT >= 31) listOf(Manifest.permission.BLUETOOTH_CONNECT) else emptyList()

    private suspend fun seguir() {
        if (!Oculos.iniciar(applicationContext)) { Oculos.estado = "erro"; finish(); return }

        // 1. o Treino Livre registrado no app Meta AI (uma vez só)
        val atual = Wearables.registrationState.first()
        if (atual != RegistrationState.REGISTERED) {
            Oculos.estado = "registrando"
            texto.text = "Confirme o Treino Livre no app Meta AI e volte para cá."
            Wearables.startRegistration(this)
            val ok = withTimeoutOrNull(120_000L) {
                Wearables.registrationState.first { it == RegistrationState.REGISTERED }
            }
            if (ok == null) { Oculos.estado = "erro"; finish(); return }
        }

        // 2. a câmera dos óculos liberada para o Treino Livre
        texto.text = "Conferindo a câmera dos óculos…"
        var liberada = false
        Wearables.checkPermissionStatus(Permission.CAMERA)
            .onSuccess { status -> liberada = status == PermissionStatus.Granted }
            .onFailure { _, _ -> liberada = false }
        if (liberada) ligarServico()
        else {
            Oculos.estado = "permissao"
            pedirCamera.launch(Permission.CAMERA)
        }
    }

    private fun ligarServico() {
        OculosService.ligar(this, chave)
        finish()
    }
}
