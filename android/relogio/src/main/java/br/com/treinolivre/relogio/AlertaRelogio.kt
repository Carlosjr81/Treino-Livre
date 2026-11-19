package br.com.treinolivre.relogio

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

// O celular avisa o fim do descanso ("fim") e os 10 s antes ("dez"): o relógio
// vibra no pulso, com a tela apagada ou com o app fechado. O celular continua
// falando e apitando como sempre.
class AlertaRelogio : WearableListenerService() {
    override fun onMessageReceived(m: MessageEvent) {
        // O celular pergunta a versão (2026-11-18e: o celular atualizou e quer
        // saber se o relógio também precisa), sem abrir tela nenhuma.
        if (m.path == "/treino/qual-versao") {
            val v = try { packageManager.getPackageInfo(packageName, 0).longVersionCode } catch (e: Exception) { 0L }
            try { com.google.android.gms.wearable.Wearable.getMessageClient(this).sendMessage(m.sourceNodeId, "/treino/versao", v.toString().toByteArray(Charsets.UTF_8)) } catch (e: Exception) { }
            return
        }
        // o "Testar a conexão" do celular (2026-11-19b): responder já prova os
        // dois sentidos, celular → relógio e relógio → celular
        if (m.path == "/treino/ping") {
            val v = try { packageManager.getPackageInfo(packageName, 0).longVersionCode } catch (e: Exception) { 0L }
            try { com.google.android.gms.wearable.Wearable.getMessageClient(this).sendMessage(m.sourceNodeId, "/treino/pong", ((android.os.Build.MODEL ?: "") + "|" + v).toByteArray(Charsets.UTF_8)) } catch (e: Exception) { }
            return
        }
        if (m.path != "/treino/alerta") return
        val tipo = String(m.data, Charsets.UTF_8)
        val padrao = if (tipo == "fim") longArrayOf(0, 450, 180, 450, 180, 700) else longArrayOf(0, 160)
        vibrar(this, padrao)
    }

    companion object {
        fun vibrar(c: Context, padrao: LongArray) {
            try {
                val v: Vibrator = if (Build.VERSION.SDK_INT >= 31)
                    (c.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
                else @Suppress("DEPRECATION") (c.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
                v.vibrate(VibrationEffect.createWaveform(padrao, -1))
            } catch (e: Exception) { }
        }
    }
}
