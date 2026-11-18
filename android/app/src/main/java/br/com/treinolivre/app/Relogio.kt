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
    // o relógio treinou sem o celular (2026-11-17b): ele manda o que anotou, e
    // o celular confirma o que guardou (e se o Jarvis está ligado)
    const val SEM_CELULAR = "/treino/sem-celular"
    const val SEM_CELULAR_OK = "/treino/sem-celular-ok"
    // a atualização com um toque (2026-11-13b): o relógio diz a versão dele e
    // ouve a do celular; pede para ser atualizado mandando o endereço no Wi-Fi
    const val VERSAO = "/treino/versao"
    const val CELULAR = "/treino/celular"
    const val ATUALIZAR = "/treino/atualizar"
    const val TELA_ATUALIZAR = "treinolivre://relogio-atualizar"
    // o endereço do relógio no Wi-Fi, que ele mesmo mandou (o instalador usa)
    @Volatile var dicaHost: String? = null
    @Volatile var dicaEm = 0L
    // as portas abertas que o relógio achou nele mesmo (2026-11-18b)
    const val PORTAS = "/treino/portas"
    @Volatile var dicaPortas: List<Int> = emptyList()

    fun versaoDoCelular(contexto: Context): Long = try {
        val i = contexto.packageManager.getPackageInfo(contexto.packageName, 0)
        if (android.os.Build.VERSION.SDK_INT >= 28) i.longVersionCode else @Suppress("DEPRECATION") i.versionCode.toLong()
    } catch (e: Exception) { 0L }

    // O relógio pediu para ser atualizado: abre o instalador no modo automático.
    // O Android só deixa um serviço abrir tela com "Aparecer sobre outros apps";
    // sem ela, uma notificação que abre com um toque.
    fun abrirAtualizacao(contexto: Context) {
        val uri = android.net.Uri.parse("treinolivre://instalar-relogio?auto=1")
        val abrir = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
            .setPackage(contexto.packageName)
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (android.os.Build.VERSION.SDK_INT >= 23 && android.provider.Settings.canDrawOverlays(contexto)) {
            try { contexto.startActivity(abrir); return } catch (e: Exception) { }
        }
        try {
            val nm = contexto.getSystemService(android.app.NotificationManager::class.java) ?: return
            nm.createNotificationChannel(android.app.NotificationChannel("relogio-atualizar", "Atualizar o relógio", android.app.NotificationManager.IMPORTANCE_HIGH))
            val pi = android.app.PendingIntent.getActivity(contexto, 77, abrir,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
            val n = androidx.core.app.NotificationCompat.Builder(contexto, "relogio-atualizar")
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle("⌚ Atualizar o app do relógio")
                .setContentText("Toque aqui: o celular instala sozinho.")
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()
            nm.notify(77, n)
        } catch (e: Exception) { }
    }

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

    // Pedido do dono: "sempre que estiver usando o app no celular, ele já abre
    // também automaticamente no relógio". O treino começou (o Jarvis 🔒 ligou):
    // a tela do Treino Livre abre em todo relógio conectado que tem o app.
    // Sem relógio, ou sem o app nele, não acontece nada.
    fun abrirNoRelogio(contexto: Context, endereco: String = "treinolivre://relogio-tela") {
        try {
            val intencao = android.content.Intent(android.content.Intent.ACTION_VIEW)
                .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
                .setData(android.net.Uri.parse(endereco))
            androidx.wear.remote.interactions.RemoteActivityHelper(contexto, java.util.concurrent.Executors.newSingleThreadExecutor())
                .startRemoteActivity(intencao, null)
        } catch (e: Exception) { }
    }

    fun desligado(contexto: Context, semJarvis: Boolean = false) =
        publicar(contexto, JSONObject().put("v", 1).put("ativo", false).apply { if (semJarvis) put("semJarvis", true) }.toString())
}

// Os toques do relógio chegam aqui (o Google Play Services acorda o app) e vão
// para o Jarvis da tela travada. Sem ele ligado não há treino para mexer, e o
// relógio diz como começar.
class OuvinteRelogio : WearableListenerService() {
    override fun onMessageReceived(m: MessageEvent) {
        val contexto = applicationContext
        if (m.path == Relogio.VERSAO) {
            // guarda a versão do relógio (o site mostra se há versão nova) e
            // responde com a do celular: o relógio oferece o ⬆ Atualizar
            val v = String(m.data, Charsets.UTF_8).trim().toLongOrNull() ?: 0L
            contexto.getSharedPreferences("relogio", Context.MODE_PRIVATE).edit().putLong("versao", v).putLong("em", System.currentTimeMillis()).apply()
            val meu = if (InstaladorRelogio.ATUALIZA_PELO_WIFI) Relogio.versaoDoCelular(contexto) else 0L
            try { Wearable.getMessageClient(contexto).sendMessage(m.sourceNodeId, Relogio.CELULAR, meu.toString().toByteArray(Charsets.UTF_8)) } catch (e: Exception) { }
            return
        }
        if (m.path == Relogio.PORTAS) {
            val t = String(m.data, Charsets.UTF_8).trim()
            val ip = t.substringBefore("|")
            val ps = t.substringAfter("|", "").split(",").mapNotNull { it.trim().toIntOrNull() }.filter { it in 1..65535 }
            if (ip.isNotEmpty() && ps.isNotEmpty()) { Relogio.dicaHost = ip; Relogio.dicaPortas = ps; Relogio.dicaEm = System.currentTimeMillis() }
            return
        }
        if (m.path == Relogio.ATUALIZAR) {
            val ip = String(m.data, Charsets.UTF_8).trim()
            if (ip.isNotEmpty()) { Relogio.dicaHost = ip; Relogio.dicaEm = System.currentTimeMillis() }
            // o instalador já aberto pega o endereço sozinho; senão, abre
            if (!InstaladorRelogio.aberto) Relogio.abrirAtualizacao(contexto)
            return
        }
        if (m.path == Relogio.SEM_CELULAR) {
            val j = try { JSONObject(String(m.data, Charsets.UTF_8)) } catch (e: Exception) { return }
            val ev = j.optJSONArray("ev") ?: org.json.JSONArray()
            val no = m.sourceNodeId
            Handler(Looper.getMainLooper()).post {
                val n = BolsoService.guardarDoRelogio(contexto, ev, j.optInt("foco", -1), j.optLong("da", 0L))
                val s = BolsoService.instancia
                if (s != null) s.incorporarRelogio() else if (n > 0) BolsoService.avisarRelogio(contexto, n)
                val ks = org.json.JSONArray()
                for (i in 0 until ev.length()) ev.optJSONObject(i)?.optString("k")?.let { if (it.isNotEmpty()) ks.put(it) }
                val ok = JSONObject().put("ks", ks).put("ativo", s != null).toString().toByteArray(Charsets.UTF_8)
                try { Wearable.getMessageClient(contexto).sendMessage(no, Relogio.SEM_CELULAR_OK, ok) } catch (e: Exception) { }
            }
            return
        }
        if (m.path != Relogio.ACAO) return
        val texto = String(m.data, Charsets.UTF_8)
        Handler(Looper.getMainLooper()).post {
            val s = BolsoService.instancia
            // sem o Jarvis ligado: o celular religou sem o treino (a bateria tinha
            // acabado). O relógio pode seguir com a cópia dele (semJarvis);
            // o Finalizar treino desliga sem essa marca.
            if (s != null) s.acaoRelogio(texto) else Relogio.desligado(contexto, true)
        }
    }
}
