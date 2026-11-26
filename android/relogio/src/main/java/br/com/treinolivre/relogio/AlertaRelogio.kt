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
        // o celular recebeu o que o relógio anotou de comida e água: sai da fila
        if (m.path == ComidaPulso.OK) {
            val ks = try { org.json.JSONObject(String(m.data, Charsets.UTF_8)).optJSONArray("ks") } catch (e: Exception) { null }
            if (ks != null) ComidaPulso.confirmar(this, ks)
            return
        }
        // A janela de um nutriente abriu (2026-11-26m). O celular manda
        // "título|corpo" já pronto: o relógio vibra duas vezes (não é urgência
        // como o fim do descanso) e mostra uma notificação própria do Wear,
        // que o mostrador já sabe exibir. Nada é decidido aqui.
        if (m.path == "/treino/janela") {
            val txt = String(m.data, Charsets.UTF_8).split("|")
            vibrar(this, longArrayOf(0, 140, 140, 140))
            avisarJanela(this, txt.getOrElse(0) { "Treino Livre" }, txt.getOrElse(1) { "" })
            return
        }
        if (m.path != "/treino/alerta") return
        val tipo = String(m.data, Charsets.UTF_8)
        val padrao = if (tipo == "fim") longArrayOf(0, 450, 180, 450, 180, 700) else longArrayOf(0, 160)
        vibrar(this, padrao)
    }

    companion object {
        private const val CANAL_JANELA = "janelas"
        private const val NOTA_JANELA = 861
        fun avisarJanela(c: Context, titulo: String, corpo: String) {
            try {
                val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(
                    android.app.NotificationChannel(CANAL_JANELA, "Janelas dos nutrientes", android.app.NotificationManager.IMPORTANCE_DEFAULT))
                val i = android.content.Intent(c, ComidaRelogio::class.java).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                val pi = android.app.PendingIntent.getActivity(c, NOTA_JANELA, i,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
                val n = androidx.core.app.NotificationCompat.Builder(c, CANAL_JANELA)
                    .setSmallIcon(android.R.drawable.ic_menu_today)
                    .setContentTitle(titulo)
                    .setContentText(corpo)
                    .setStyle(androidx.core.app.NotificationCompat.BigTextStyle().bigText(corpo))
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .build()
                nm.notify(NOTA_JANELA, n)
            } catch (e: Exception) { }
        }

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
