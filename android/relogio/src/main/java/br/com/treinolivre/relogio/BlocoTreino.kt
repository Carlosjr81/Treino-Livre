package br.com.treinolivre.relogio

import android.content.Context
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject

// O bloco do Treino Livre no relógio (2026-11-22b, pedido do dono): deslizando
// o mostrador, o treino de agora (séries e descanso) ou um convite para
// treinar, e um toque abre a tela do treino. Os dados são o último painel que
// a tela do relógio recebeu do celular (guardado em "ultimoPainel").
class BlocoTreino : TileService() {
    override fun onTileRequest(req: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val (l1, l2) = linhas(this)
        val abrir = ModifiersBuilders.Clickable.Builder().setId("abrir").setOnClick(
            ActionBuilders.LaunchAction.Builder().setAndroidActivity(
                ActionBuilders.AndroidActivity.Builder().setPackageName(packageName).setClassName(TelaRelogio::class.java.name).build()
            ).build()
        ).build()
        fun texto(t: String, tam: Float, cor: Int, negrito: Boolean) = LayoutElementBuilders.Text.Builder().setText(t).setMaxLines(2)
            .setFontStyle(LayoutElementBuilders.FontStyle.Builder().setSize(sp(tam)).setColor(argb(cor))
                .setWeight(if (negrito) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_NORMAL).build()).build()
        val botao = LayoutElementBuilders.Box.Builder()
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(abrir)
                .setBackground(ModifiersBuilders.Background.Builder().setColor(argb(0xFFDD2A7B.toInt()))
                    .setCorner(ModifiersBuilders.Corner.Builder().setRadius(dp(22f)).build()).build())
                .setPadding(ModifiersBuilders.Padding.Builder().setStart(dp(18f)).setEnd(dp(18f)).setTop(dp(8f)).setBottom(dp(8f)).build()).build())
            .addContent(texto("▶ ABRIR", 15f, 0xFFFFFFFF.toInt(), true)).build()
        val coluna = LayoutElementBuilders.Column.Builder().setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(abrir).build())
            .addContent(texto("TREINO LIVRE", 13f, 0xFFF58529.toInt(), true))
            .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(4f)).build())
            .addContent(texto(l1, 17f, 0xFFFFFFFF.toInt(), true))
            .addContent(texto(l2, 13f, 0xFF4DEBFF.toInt(), false))
            .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(10f)).build())
            .addContent(botao).build()
        val tile = TileBuilders.Tile.Builder().setResourcesVersion("1").setFreshnessIntervalMillis(60_000L)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(coluna)).build()
        return Futures.immediateFuture(tile)
    }

    override fun onTileResourcesRequest(req: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion("1").build())

    companion object {
        fun linhas(c: Context): Pair<String, String> {
            val j = try { c.getSharedPreferences("relogio", Context.MODE_PRIVATE).getString("ultimoPainel", null)?.let { JSONObject(it) } } catch (e: Exception) { null }
            val agora = System.currentTimeMillis()
            if (j == null || !j.optBoolean("ativo") || agora - j.optLong("recebido", 0L) > 4 * 3600_000L) {
                val cp = j?.optJSONArray("cp")
                return "Bora treinar? 💪" to (if (cp != null && cp.length() == 2) "🌅 Corpo " + cp.optInt(0) + " · " + cp.optString(1) else "Comece no celular")
            }
            if (j.optBoolean("fim")) return "Treino completo! 🎉" to "Finalize no celular"
            val ate = j.optLong("descansoAte", 0L)
            val l2 = if (ate > agora) "⏱ descanso: " + ((ate - agora + 59_999) / 60_000) + " min" else j.optString("ex")
            return (j.optInt("feitas").toString() + " de " + j.optInt("total") + " séries") to l2
        }
        fun atualizar(c: Context) {
            try { getUpdater(c).requestUpdate(BlocoTreino::class.java) } catch (e: Exception) { }
        }
    }
}
