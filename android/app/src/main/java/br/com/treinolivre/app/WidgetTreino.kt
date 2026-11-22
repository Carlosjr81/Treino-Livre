package br.com.treinolivre.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

// O widget da tela inicial (2026-11-22b, pedido do dono): no visual do resumo
// animado, o treino de agora (séries e descanso) ou um convite para treinar,
// com a nota do corpo quando o relógio mandou. Os dados são o último painel
// que o Jarvis do bolso publicou para o relógio (Relogio.publicar guarda uma
// cópia). Um toque abre o app.
class WidgetTreino : AppWidgetProvider() {
    override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) { desenhar(c, m, ids) }

    companion object {
        fun guardar(c: Context, json: String) {
            try {
                val j = JSONObject(json)
                j.remove("copia")
                j.put("recebido", System.currentTimeMillis())
                c.getSharedPreferences("widget", Context.MODE_PRIVATE).edit().putString("painel", j.toString()).apply()
            } catch (e: Exception) { }
            atualizar(c)
        }
        fun atualizar(c: Context) {
            try {
                val m = AppWidgetManager.getInstance(c)
                val ids = m.getAppWidgetIds(ComponentName(c, WidgetTreino::class.java))
                if (ids.isNotEmpty()) desenhar(c, m, ids)
            } catch (e: Exception) { }
        }
        private fun linhas(c: Context): Pair<String, String> {
            val j = try { c.getSharedPreferences("widget", Context.MODE_PRIVATE).getString("painel", null)?.let { JSONObject(it) } } catch (e: Exception) { null }
            val agora = System.currentTimeMillis()
            val cp = j?.optJSONArray("cp")
            val corpo = if (cp != null && cp.length() == 2) "🌅 Corpo " + cp.optInt(0) + " · " + cp.optString(1) else null
            if (j == null || !j.optBoolean("ativo") || j.optBoolean("carregando") || agora - j.optLong("recebido", 0L) > 4 * 3600_000L)
                return "Bora treinar? 💪" to (corpo ?: "Toque para começar")
            if (j.optBoolean("fim")) return "Treino completo! 🎉" to "Toque para finalizar"
            val ate = j.optLong("descansoAte", 0L)
            val l2 = if (ate > agora) "⏱ descanso até " + java.text.SimpleDateFormat("HH:mm", java.util.Locale("pt", "BR")).format(java.util.Date(ate)) else j.optString("ex")
            return (j.optInt("feitas").toString() + " de " + j.optInt("total") + " séries") to l2
        }
        private fun desenhar(c: Context, m: AppWidgetManager, ids: IntArray) {
            val (l1, l2) = linhas(c)
            val abrir = PendingIntent.getActivity(c, 0, Intent(c, AberturaActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            ids.forEach { id ->
                val v = RemoteViews(c.packageName, R.layout.widget_treino)
                v.setTextViewText(R.id.widget_linha1, l1)
                v.setTextViewText(R.id.widget_linha2, l2)
                v.setOnClickPendingIntent(R.id.widget_raiz, abrir)
                v.setOnClickPendingIntent(R.id.widget_botao, abrir)
                m.updateAppWidget(id, v)
            }
        }
    }
}
