package br.com.treinolivre.app

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

// O relógio (Galaxy Watch e outros com Wear OS): o app do relógio é um
// controle remoto do Jarvis da tela travada (BolsoService). Quem guarda a
// cópia do treino e conta o descanso continua sendo o celular; o relógio
// mostra o painel e manda os toques.
//
// Celular → relógio: o painel, num dado sincronizado (/treino/estado), que o
// relógio lê ao abrir e recebe a cada mudança; e os alertas (/treino/alerta:
// "fim" e "dez" do descanso), que fazem o relógio vibrar.
// Relógio → celular: os botões, numa mensagem (/treino/acao).
//
// Nada passa por servidor: é o Bluetooth entre os dois, pelo Google Play
// Services (no Galaxy, pelo app Galaxy Wearable). Sem relógio, tudo aqui
// falha calado.
object Relogio {
    const val ESTADO = "/treino/estado"
    const val ALERTA = "/treino/alerta"
    const val ACAO = "/treino/acao"

    fun publicar(contexto: Context, json: String) {
        try {
            val pedido = PutDataMapRequest.create(ESTADO).apply {
                dataMap.putString("json", json)
                // sem isto, o mesmo painel duas vezes não chega como mudança
                dataMap.putLong("t", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(contexto).putDataItem(pedido).addOnFailureListener { }
        } catch (e: Exception) { }
    }

    fun alertar(contexto: Context, tipo: String) {
        try {
            Wearable.getNodeClient(contexto).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no ->
                    Wearable.getMessageClient(contexto).sendMessage(no.id, ALERTA, tipo.toByteArray(Charsets.UTF_8)).addOnFailureListener { }
                }
            }.addOnFailureListener { }
        } catch (e: Exception) { }
    }

    fun desligado(contexto: Context) = publicar(contexto, JSONObject().put("v", 1).put("ativo", false).toString())
}

// Os toques do relógio chegam aqui (o Google Play Services acorda o app) e vão
// para o Jarvis da tela travada. Sem ele ligado não há treino para mexer, e o
// relógio diz como começar.
class OuvinteRelogio : WearableListenerService() {
    override fun onMessageReceived(m: MessageEvent) {
        if (m.path != Relogio.ACAO) return
        val texto = String(m.data, Charsets.UTF_8)
        val contexto = applicationContext
        Handler(Looper.getMainLooper()).post {
            val s = BolsoService.instancia
            if (s != null) s.acaoRelogio(texto) else Relogio.desligado(contexto)
        }
    }
}
