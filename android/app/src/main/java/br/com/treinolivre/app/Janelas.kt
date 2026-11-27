package br.com.treinolivre.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

// Os avisos das janelas dos nutrientes (2026-11-26m, pedido do dono: "crie
// notificações para lembrar das melhores janelas; no celular e no relógio").
//
// **Por que o alarme mora aqui e não no site.** Uma página web não agenda
// nada: o service worker só acorda quando o sistema resolve (periodicSync,
// de hora em hora no melhor caso), e com o Chrome fechado nem isso. O
// AlarmManager é o único caminho em que o aviso chega na hora. Por isso o
// plano do dia é calculado no site — que é quem sabe as contas do Balance e
// a hora do treino — e vem para cá PRONTO, no mesmo pacote que já sai a cada
// anotação (treinolivre://comida?d=, campo "jan"). Aqui não se decide nada:
// só se agenda, mostra e manda ao relógio.
//
// `setAndAllowWhileIdle` e não `setExact`: o exato precisa da permissão
// SCHEDULE_EXACT_ALARM no Android 12+, e alguns minutos de folga não mudam
// nada numa janela de 40 minutos. Pedir uma permissão a mais por isso seria
// cobrar caro por nada.
object Janelas {
    const val ACAO = "br.com.treinolivre.app.JANELA"
    const val NO_RELOGIO = "/treino/janela"
    private const val CANAL = "janelas"
    private const val NOTA_BASE = 820
    // os ids possíveis, na ordem: o código do alarme sai daqui (estável entre
    // um dia e outro, então reagendar substitui em vez de acumular)
    // e os da insulina (2026-11-27m): os 4 lembretes da pessoa, a conferência
    // "já comeu?" e a noite com a basal ou a NPH
    private val IDS = listOf("preTreino", "posTreino", "proteina", "noite", "cafeina", "creatina",
        "ins0", "ins1", "ins2", "ins3", "insConf", "insNoite")

    private fun prefs(c: Context) = c.getSharedPreferences("janelas", Context.MODE_PRIVATE)

    // Os dias adiante (2026-11-27g): hoje e mais 6, cada dia com o seu código
    // (dia * 20 + o id; eram 10 até chegarem os 12 ids). Hoje (dia 0) tem o
    // mesmo código de antes.
    const val DIAS = 7

    private fun alarme(c: Context, id: String, titulo: String, corpo: String, dia: Int = 0): PendingIntent {
        val i = Intent(c, JanelaReceiver::class.java).setAction(ACAO)
            .putExtra("id", id).putExtra("t", titulo).putExtra("c", corpo)
        return PendingIntent.getBroadcast(c, NOTA_BASE + dia * 20 + IDS.indexOf(id).coerceAtLeast(0), i,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    // "AAAA-MM-DD" → o começo daquele dia, na hora do celular
    private fun inicioDoDia(d: String): Calendar? = try {
        val p = d.split("-").map { it.toInt() }
        Calendar.getInstance().apply { clear(); set(p[0], p[1] - 1, p[2], 0, 0, 0) }
    } catch (e: Exception) { null }

    // Agendado de novo quando o celular liga: reiniciar apaga todo alarme do
    // Android, e sem isto os avisos sumiriam até a pessoa abrir o Balance.
    fun reagendar(c: Context) {
        val e = prefs(c).getString("plano", null) ?: return
        agendar(c, e)
    }

    // O plano que veio do site. Cancela os de antes e agenda os de hoje que
    // ainda não passaram. Lista vazia (avisos desligados) só cancela.
    fun agendar(c: Context, estado: String) {
        try {
            val j = JSONObject(estado)
            val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            // cancela também os códigos do jeito antigo (dia * 10), de quem atualizou o app com avisos agendados
            for (dia in 0 until DIAS) IDS.forEach { id -> try { am.cancel(alarme(c, id, "", "", dia)) } catch (e: Exception) { } }
            for (k in 0 until DIAS * 10) try {
                am.cancel(PendingIntent.getBroadcast(c, NOTA_BASE + k, Intent(c, JanelaReceiver::class.java).setAction(ACAO),
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE) ?: continue)
            } catch (e: Exception) { }
            // hoje ("jan", com o que foi anotado) e os próximos dias ("jan7",
            // pelo horário de sempre), cada um na data dele
            val dias = mutableListOf<Pair<String, JSONArray>>()
            dias.add(Pair(j.optString("d"), j.optJSONArray("jan") ?: JSONArray()))
            val adiante = j.optJSONArray("jan7") ?: JSONArray()
            for (i in 0 until adiante.length()) {
                val x = adiante.optJSONObject(i) ?: continue
                dias.add(Pair(x.optString("d"), x.optJSONArray("a") ?: JSONArray()))
            }
            val agora = System.currentTimeMillis()
            val hoje = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }
            var n = 0
            for ((d, av) in dias) {
                val base = inicioDoDia(d) ?: continue
                val offset = Math.round((base.timeInMillis - hoje.timeInMillis) / 86_400_000.0).toInt()
                if (offset < 0 || offset >= DIAS) continue
                for (i in 0 until av.length()) {
                    val a = av.optJSONObject(i) ?: continue
                    val id = a.optString("id")
                    val em = a.optInt("em", -1)
                    if (id.isEmpty() || em < 0) continue
                    val quando = (base.clone() as Calendar).apply { add(Calendar.MINUTE, em) }
                    if (quando.timeInMillis <= agora) continue
                    val pi = alarme(c, id, a.optString("t"), a.optString("c"), offset)
                    if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando.timeInMillis, pi)
                    else am.set(AlarmManager.RTC_WAKEUP, quando.timeInMillis, pi)
                    n++
                }
            }
            prefs(c).edit().putInt("agendados", n).putString("dia", j.optString("d")).putString("plano", estado).apply()
        } catch (e: Exception) { }
    }

    fun mostrar(c: Context, id: String, titulo: String, corpo: String) {
        try {
            val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(
                NotificationChannel(CANAL, "Janelas dos nutrientes", NotificationManager.IMPORTANCE_DEFAULT))
            val i = Intent(Intent.ACTION_VIEW, Uri.parse("treinolivre://comida?entregar=1"))
                .setPackage(c.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val pi = PendingIntent.getActivity(c, NOTA_BASE + 99, i,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val n = androidx.core.app.NotificationCompat.Builder(c, CANAL)
                .setSmallIcon(android.R.drawable.ic_menu_today)
                .setContentTitle(titulo)
                .setContentText(corpo)
                .setStyle(androidx.core.app.NotificationCompat.BigTextStyle().bigText(corpo))
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()
            nm.notify(NOTA_BASE + IDS.indexOf(id).coerceAtLeast(0), n)
        } catch (e: Exception) { }
    }

    // O mesmo aviso no pulso: o relógio vibra e mostra (AlertaRelogio).
    // Sem relógio, falha calado, como todo o resto do Relogio.
    fun avisarRelogio(c: Context, titulo: String, corpo: String) {
        try {
            val dados = (titulo + "|" + corpo).toByteArray(Charsets.UTF_8)
            com.google.android.gms.wearable.Wearable.getNodeClient(c).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no ->
                    com.google.android.gms.wearable.Wearable.getMessageClient(c)
                        .sendMessage(no.id, NO_RELOGIO, dados).addOnFailureListener { }
                }
            }.addOnFailureListener { }
        } catch (e: Exception) { }
    }
}

// O celular ligou (ou o app foi atualizado): os alarmes do Android não
// sobrevivem a isso, então o último plano guardado é agendado de novo.
class JanelasAoLigar : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val a = i.action ?: return
        if (a == Intent.ACTION_BOOT_COMPLETED || a == Intent.ACTION_MY_PACKAGE_REPLACED || a == "android.intent.action.QUICKBOOT_POWERON") Janelas.reagendar(c)
    }
}

class JanelaReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        if (i.action != Janelas.ACAO) return
        val id = i.getStringExtra("id") ?: return
        val t = i.getStringExtra("t") ?: return
        val corpo = i.getStringExtra("c") ?: ""
        // nunca no meio de um treino: com o Jarvis do treino ligado, cala — menos
        // os da insulina, que são segurança (o "já comeu?" vale mais no treino)
        if (BolsoService.instancia != null && !id.startsWith("ins")) return
        Janelas.mostrar(c, id, t, corpo)
        Janelas.avisarRelogio(c.applicationContext, t, corpo)
    }
}
