package br.com.treinolivre.relogio

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

// Relato do dono (2026-11-12b): com a tela do relógio apagada, o app ia para o
// segundo plano e voltava o mostrador. O modo ambiente só segura o app com a
// "tela sempre ligada" do relógio ativa. Com o treino aberto, o relógio passa a
// ter uma ATIVIDADE EM ANDAMENTO (Ongoing Activity, a mesma do app de
// exercícios): o Wear OS volta para o Treino Livre ao acender a tela, e o ícone
// fica no mostrador para voltar num toque. Acaba sozinha quando o treino acaba.
class TreinoNoPulso : Service(), DataClient.OnDataChangedListener {
    private val linha = Handler(Looper.getMainLooper())
    private val limite = Runnable { stopSelf() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CANAL, "Treino em andamento", NotificationManager.IMPORTANCE_LOW))
        val abrir = PendingIntent.getActivity(this, 0,
            Intent(this, TelaRelogio::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val nb = NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Treino Livre")
            .setContentText("Treino em andamento")
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(abrir)
        val status = Status.Builder().addTemplate("Treino em andamento").build()
        OngoingActivity.Builder(applicationContext, ID, nb)
            .setStaticIcon(R.mipmap.ic_launcher)
            .setTouchIntent(abrir)
            .setStatus(status)
            .build()
            .apply(applicationContext)
        try {
            ServiceCompat.startForeground(this, ID, nb.build(),
                if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0)
        } catch (e: Exception) { stopSelf(); return }
        Wearable.getDataClient(this).addListener(this)
        linha.postDelayed(limite, 4 * 60 * 60 * 1000L)   // esquecido ligado: 4 h
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

    // o celular disse que o treino acabou: a atividade em andamento acaba junto
    override fun onDataChanged(eventos: DataEventBuffer) {
        for (ev in eventos) {
            if (ev.type != DataEvent.TYPE_CHANGED || ev.dataItem.uri.path != "/treino/estado") continue
            val j = try { JSONObject(DataMapItem.fromDataItem(ev.dataItem).dataMap.getString("json") ?: "") } catch (e: Exception) { null } ?: continue
            if (!j.optBoolean("ativo", false)) linha.post { stopSelf() }
        }
    }

    override fun onDestroy() {
        ligado = false
        linha.removeCallbacks(limite)
        try { Wearable.getDataClient(this).removeListener(this) } catch (e: Exception) { }
        super.onDestroy()
    }

    companion object {
        private const val CANAL = "treino"
        private const val ID = 7
        var ligado = false
            private set

        fun ligar(c: Context) {
            if (ligado) return
            try { c.startForegroundService(Intent(c, TreinoNoPulso::class.java)); ligado = true } catch (e: Exception) { }
        }

        fun desligar(c: Context) {
            ligado = false
            try { c.stopService(Intent(c, TreinoNoPulso::class.java)) } catch (e: Exception) { }
        }
    }
}
