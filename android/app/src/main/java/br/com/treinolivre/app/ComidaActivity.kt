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

    // A entrega na hora (2026-11-26j). Antes, o que era marcado no relógio
    // ficava aqui até a pessoa tocar na notificação ou reabrir o app — podia
    // levar horas. Agora, com a aba do Treino Livre na tela, o app leva
    // sozinho; sem a permissão "Aparecer sobre outros apps" continua a
    // notificação de sempre.
    //
    // Os ids já levados ficam guardados à parte da fila ("ent"): a fila só sai
    // quando a página devolve os "vistos", e sem essa marca a mesma anotação
    // seria entregue de novo a cada navegação — a própria entrega é uma
    // navegação. Entregar duas vezes não duplica nada no site (os "vistos" do
    // registro barram), mas abriria a tela sem parar.
    private fun entregues(c: Context): MutableList<String> {
        val l = mutableListOf<String>()
        try { val a = JSONArray(prefs(c).getString("ent", "[]")); for (i in 0 until a.length()) l.add(a.optString(i)) } catch (e: Exception) { }
        return l
    }
    fun temNovos(c: Context): Boolean {
        val ent = HashSet(entregues(c))
        val p = pendentes(c)
        for (i in 0 until p.length()) { val k = p.optJSONObject(i)?.optString("k") ?: continue; if (k.isNotEmpty() && !ent.contains(k)) return true }
        return false
    }
    private fun marcarEntregues(c: Context) {
        val p = pendentes(c)
        val l = entregues(c)
        val tem = HashSet(l)
        for (i in 0 until p.length()) p.optJSONObject(i)?.optString("k")?.let { if (it.isNotEmpty() && tem.add(it)) l.add(it) }
        val a = JSONArray()
        l.takeLast(300).forEach { a.put(it) }
        prefs(c).edit().putString("ent", a.toString()).apply()
    }

    fun entregarSePuder(c: Context) {
        if (!temNovos(c)) return
        if (!Canal.aVista) { avisar(c); return }
        if (Build.VERSION.SDK_INT >= 23 && !android.provider.Settings.canDrawOverlays(c)) { avisar(c); return }
        try {
            c.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("treinolivre://comida?entregar=1"))
                .setPackage(c.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) { avisar(c) }
    }

    // o pedaço do link: "comida=<base64>" (vazio sem nada a levar)
    fun fragmento(c: Context): String {
        val p = pendentes(c)
        if (p.length() == 0) return ""
        marcarEntregues(c)
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
            val tp = e.optString("tipo")
            // o shake conta como alimento no aviso: é um item no dia, como os outros
            if (tp == "agua") agua += e.optInt("ml") else if (tp == "comida" || tp == "shake") nomes.add(if (tp == "shake") "shake" else e.optString("a"))
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
                // os avisos das janelas dos nutrientes (2026-11-26m) vêm no
                // mesmo pacote: o Chrome só abre outro app com um toque, e
                // este já é o toque. Aqui eles viram alarme.
                Janelas.agendar(applicationContext, json)
            } catch (e: Exception) { }
            // A volta traz o que o relógio marcou (2026-11-26j). A página já
            // está pedindo a sincronia a cada toque na tela do Balance: se
            // houver fila aqui, ela vai junto, e a anotação do pulso entra sem
            // a pessoa tocar em notificação nenhuma. Sem fila, nada muda.
            val volta = Comida.fragmento(this)
            if (volta.isNotEmpty()) {
                try {
                    Site.abrir(this, Site.comFragmento(this, volta), { lancador = it }) { finish() }
                    return
                } catch (e: Exception) { }
            }
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
