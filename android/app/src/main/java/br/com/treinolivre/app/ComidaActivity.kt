package br.com.treinolivre.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.core.app.NotificationCompat
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.androidbrowserhelper.trusted.TwaLauncher
import org.json.JSONArray
import org.json.JSONObject

// O Jarvis Body Balance no relógio (2026-11-25a). O relógio marca comida e
// água (/treino/comida); o celular guarda a fila aqui, confirma ao relógio
// (/treino/comida-ok), avisa numa notificação e leva ao site pelo link
// #comida= (a abertura do app também leva). A fila só sai daqui quando a
// página diz que viu (os "vistos" do estado que ela manda de volta): entregar
// duas vezes não duplica nada, perder sim.
object Comida {
    const val ADD = "/treino/comida"
    const val OK = "/treino/comida-ok"
    const val ESTADO = "/treino/comida-estado"
    private const val CANAL = "comida"
    private const val NOTA = 79

    private fun prefs(c: Context) = c.getSharedPreferences("comida", Context.MODE_PRIVATE)
    fun pendentes(c: Context): JSONArray = try { JSONArray(prefs(c).getString("pend", "[]")) } catch (e: Exception) { JSONArray() }

    // junta o que chegou, sem repetir o mesmo id; devolve os ids recebidos
    fun guardar(c: Context, ev: JSONArray): JSONArray {
        val atual = pendentes(c)
        val tem = HashSet<String>()
        for (i in 0 until atual.length()) atual.optJSONObject(i)?.optString("k")?.let { tem.add(it) }
        val ks = JSONArray()
        for (i in 0 until ev.length()) {
            val e = ev.optJSONObject(i) ?: continue
            val k = e.optString("k")
            if (k.isEmpty()) continue
            ks.put(k)
            if (tem.add(k)) atual.put(e)
        }
        val corte = JSONArray()
        for (i in maxOf(0, atual.length() - 300) until atual.length()) corte.put(atual.get(i))
        prefs(c).edit().putString("pend", corte.toString()).apply()
        return ks
    }

    fun limpar(c: Context, vistos: JSONArray?) {
        if (vistos == null || vistos.length() == 0) return
        val set = HashSet<String>()
        for (i in 0 until vistos.length()) set.add(vistos.optString(i))
        val atual = pendentes(c)
        val n = JSONArray()
        for (i in 0 until atual.length()) { val e = atual.optJSONObject(i); if (e != null && !set.contains(e.optString("k"))) n.put(e) }
        prefs(c).edit().putString("pend", n.toString()).apply()
        if (n.length() == 0) try { (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTA) } catch (e: Exception) { }
    }

    // o pedaço do link: "comida=<base64>" (vazio sem nada a levar)
    fun fragmento(c: Context): String {
        val p = pendentes(c)
        if (p.length() == 0) return ""
        return "comida=" + Site.codificar(JSONObject().put("ev", p).toString())
    }

    fun publicarEstado(c: Context, json: String) {
        try {
            val pedido = PutDataMapRequest.create(ESTADO).apply {
                dataMap.putString("json", json)
                dataMap.putLong("t", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(c).putDataItem(pedido).addOnFailureListener { }
        } catch (e: Exception) { }
    }

    // "⌚ Do relógio: 💧 +500 ml · Banana. Toque para levar ao app"
    fun avisar(c: Context) {
        val p = pendentes(c)
        if (p.length() == 0) return
        var agua = 0
        val nomes = mutableListOf<String>()
        for (i in 0 until p.length()) {
            val e = p.optJSONObject(i) ?: continue
            if (e.optString("tipo") == "agua") agua += e.optInt("ml") else if (e.optString("tipo") == "comida") nomes.add(e.optString("a"))
        }
        val partes = mutableListOf<String>()
        if (agua > 0) partes.add("💧 +$agua ml")
        if (nomes.isNotEmpty()) partes.add(nomes.size.toString() + (if (nomes.size == 1) " alimento" else " alimentos"))
        try {
            val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel(CANAL, "Comida e água do relógio", NotificationManager.IMPORTANCE_DEFAULT))
            val i = Intent(Intent.ACTION_VIEW, Uri.parse("treinolivre://comida?entregar=1")).setPackage(c.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val pi = PendingIntent.getActivity(c, NOTA, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val n = NotificationCompat.Builder(c, CANAL)
                .setSmallIcon(android.R.drawable.ic_menu_today)
                .setContentTitle("⌚ Do relógio: " + partes.joinToString(" · "))
                .setContentText("Toque para levar ao Jarvis Body Balance.")
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()
            nm.notify(NOTA, n)
        } catch (e: Exception) { }
    }
}

// treinolivre://comida
//   ?d=<estado>   a página manda o de hoje (meta, o que entrou, água, favoritos)
//                 ao relógio; os "vistos" tiram da fila o que a página já tem
//   ?entregar=1   a notificação: leva a fila ao site (#comida=)
class ComidaActivity : ComponentActivity() {
    private var lancador: TwaLauncher? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION") overridePendingTransition(0, 0)
        if (savedInstanceState != null) return
        val dados = intent?.data
        val d = dados?.getQueryParameter("d")
        if (!d.isNullOrEmpty()) {
            try {
                val json = Site.decodificar(d)
                val j = JSONObject(json)
                Comida.limpar(this, j.optJSONArray("vistos"))
                Comida.publicarEstado(applicationContext, json)
            } catch (e: Exception) { }
            sair()
            return
        }
        val frag = Comida.fragmento(this)
        if (frag.isEmpty()) { sair(); return }
        try {
            Site.abrir(this, Site.comFragmento(this, frag), { lancador = it }) { finish() }
        } catch (e: Exception) { sair() }
    }

    private fun sair() {
        finish()
        @Suppress("DEPRECATION") overridePendingTransition(0, 0)
    }

    override fun onDestroy() {
        lancador?.destroy()
        super.onDestroy()
    }
}
