package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.os.SystemClock
import android.text.format.DateFormat
import android.view.View
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

// A hora com um toque (pedido do dono, 2026-11-20d: "durante o treino eu não
// tenho visão da hora; 1 toque mostra a hora e já volta ao app, com a fonte e o
// efeito geleia da máscara do Galaxy Watch, nas cores do Treino Livre").
//
// O desenho é o da máscara que ele mandou: quatro números enormes, dois em cima
// e dois embaixo, vazando da tela redonda, com um contorno preto separando um do
// outro, e uma bolha translúcida com o dia. A fonte é a Bodoni Moda Black Italic
// (licença OFL, livre), a mais parecida com a da Samsung, que não é livre.
// O preenchimento é o degradê da marca, um só para a tela inteira.
//
// O efeito geleia: cada número entra de um em um, cresce passando do ponto e
// treme, achatando e esticando (como uma gelatina), até parar; a cada segundo
// os minutos dão um tremidinho; na saída, eles se achatam e somem.
//
// O que é a mais que a máscara: a bolha diz o descanso que falta (na cor do
// descanso) ou as séries feitas; a bolinha da borda anda com os segundos,
// com o rastro do minuto. No modo ambiente (tela apagada), a mesma hora só no
// contorno cinza, parada, que gasta quase nada numa tela OLED.
class HoraGeleia(contexto: Context) : View(contexto) {
    // o que vai na bolha embaixo do dia: (texto, cor), ou null para o dia sozinho
    var info: (() -> Pair<String, Int>?)? = null
    var aoSumir: (() -> Unit)? = null

    var ambiente = false
        set(v) { field = v; invalidate() }

    var mostrando = false
        private set
    private var inicio = 0L
    private var saindoEm = 0L
    private val fonte: Typeface = try { resources.getFont(R.font.bodoni_moda_black_italic) } catch (e: Exception) { Typeface.create(Typeface.SERIF, Typeface.BOLD_ITALIC) }

    private val d = resources.displayMetrics.density
    private val numero = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = fonte
        textScaleX = LARGURA
        textSkewX = INCLINACAO
    }
    private val preench = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val contorno = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = Color.BLACK
        strokeJoin = Paint.Join.ROUND
    }
    private val linhaAmb = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = Cores.CINZA
        strokeJoin = Paint.Join.ROUND
    }
    private val fundo = Paint().apply { color = Color.BLACK }
    private val bolha = Paint(Paint.ANTI_ALIAS_FLAG)
    private val bolhaBorda = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val textoDia = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
        textAlign = Paint.Align.CENTER
        letterSpacing = 0.08f
    }
    private val textoInfo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif", Typeface.NORMAL)
        textAlign = Paint.Align.CENTER
    }
    private val ponto = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rastro = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }

    // os quatro números já recortados no lugar, refeitos quando a hora muda
    private class Digito(val path: Path, val px: Float, val py: Float)
    private var digitos = emptyList<Digito>()
    private var horaFeita = ""
    private var lado = 0f
    private var ox = 0f
    private var oy = 0f
    private var ultimoSeg = -1
    private var segEm = 0L

    init { visibility = GONE }

    // Um toque: mostra, e volta sozinho ao treino.
    fun mostrar() {
        if (ambiente) return
        mostrando = true
        inicio = SystemClock.uptimeMillis()
        saindoEm = 0L
        visibility = VISIBLE
        removeCallbacks(sumir)
        postDelayed(sumir, DURACAO_MS)
        postInvalidateOnAnimation()
    }

    // a saída com a geleia achatando
    fun esconder() {
        if (!mostrando || saindoEm != 0L) return
        removeCallbacks(sumir)
        saindoEm = SystemClock.uptimeMillis()
        postInvalidateOnAnimation()
    }

    // sem animação (a tela vai apagar, o app saiu da frente)
    fun esconderJa() {
        removeCallbacks(sumir)
        if (!mostrando) { if (!ambiente) visibility = GONE; return }
        mostrando = false
        saindoEm = 0L
        if (!ambiente) visibility = GONE
        aoSumir?.invoke()
    }

    // no modo ambiente fica à vista, parada e só no contorno
    fun fixarAmbiente(sim: Boolean) {
        removeCallbacks(sumir)
        mostrando = false
        saindoEm = 0L
        ambiente = sim
        visibility = if (sim) VISIBLE else GONE
        invalidate()
    }

    private val sumir = Runnable { esconder() }

    override fun onSizeChanged(w: Int, h: Int, ow: Int, oh: Int) {
        super.onSizeChanged(w, h, ow, oh)
        lado = min(w, h).toFloat()
        ox = (w - lado) / 2f
        oy = (h - lado) / 2f
        numero.textSize = lado * TAMANHO
        contorno.strokeWidth = lado * BORDA * 2f
        linhaAmb.strokeWidth = 1.6f * d
        preench.shader = LinearGradient(ox, oy, ox + lado, oy + lado,
            intArrayOf(Color.parseColor("#FFB36B"), Cores.LARANJA, Cores.ROSA, Color.parseColor("#B05BFF")),
            floatArrayOf(0f, 0.3f, 0.65f, 1f), Shader.TileMode.CLAMP)
        textoDia.textSize = lado * 0.045f
        textoInfo.textSize = lado * 0.078f
        bolhaBorda.strokeWidth = 1.5f * d
        rastro.strokeWidth = 3f * d
        rastro.shader = SweepGradient(ox + lado / 2, oy + lado / 2, intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO, Cores.LARANJA), null)
        horaFeita = ""
    }

    private fun montar(texto: String) {
        if (texto == horaFeita || lado <= 0f) return
        horaFeita = texto
        val b = RectF()
        digitos = texto.mapIndexed { i, ch ->
            val p = Path()
            numero.getTextPath(ch.toString(), 0, 1, 0f, 0f, p)
            p.computeBounds(b, true)
            val cx = ox + lado * COLUNAS[i]
            val emCima = i < 2
            val dx = cx - b.centerX()
            val dy = if (emCima) oy + lado * LINHA_CIMA - b.bottom else oy + lado * LINHA_BAIXO - b.top
            p.offset(dx, dy)
            p.computeBounds(b, true)
            // a geleia treme presa no canto do número que fica perto do meio
            val px = (ox + lado / 2).coerceIn(b.left, b.right)
            val py = if (emCima) b.bottom else b.top
            Digito(p, px, py)
        }
    }

    override fun onDraw(c: Canvas) {
        if (lado <= 0f) return
        val agora = SystemClock.uptimeMillis()
        val cal = Calendar.getInstance()
        var h = cal.get(Calendar.HOUR_OF_DAY)
        if (!DateFormat.is24HourFormat(context)) { h %= 12; if (h == 0) h = 12 }
        val texto = h.toString().padStart(2, '0') + cal.get(Calendar.MINUTE).toString().padStart(2, '0')
        montar(texto)
        val seg = cal.get(Calendar.SECOND)
        if (seg != ultimoSeg) { ultimoSeg = seg; segEm = agora }

        val cx = ox + lado / 2
        val cy = oy + lado / 2
        val t = (agora - inicio) / 1000f
        val tSai = if (saindoEm > 0L) (agora - saindoEm) / 1000f else -1f
        val vivo = !ambiente && mostrando

        // o fundo escurece rápido na entrada e clareia na saída
        val alfaFundo = when {
            !vivo -> 1f
            tSai >= 0f -> (1f - (tSai - 0.18f) / 0.2f).coerceIn(0f, 1f)
            else -> (t / 0.12f).coerceIn(0f, 1f)
        }
        fundo.alpha = (alfaFundo * 255).toInt()
        c.drawRect(0f, 0f, width.toFloat(), height.toFloat(), fundo)

        var tudoSaiu = true
        digitos.forEachIndexed { i, dg ->
            var sx = 1f
            var sy = 1f
            if (vivo) {
                val ti = t - i * ATRASO
                if (ti <= 0f) { tudoSaiu = false; return@forEachIndexed }
                // entra crescendo, passa do ponto e treme achatando e esticando
                val a = (ti / 0.18f).coerceIn(0f, 1f)
                val e = 1f - (1f - a) * (1f - a) * (1f - a)
                val w = 0.3f * exp(-4.2f * ti) * sin(17f * ti)
                sx = e * (1f - w)
                sy = e * (1f + w)
                // a cada segundo, os minutos dão um tremidinho
                if (i >= 2 && ti > 1f) {
                    val ts = (agora - segEm) / 1000f
                    val w2 = 0.045f * exp(-7f * ts) * sin(22f * ts)
                    sx *= 1f - w2; sy *= 1f + w2
                }
                if (tSai >= 0f) {
                    val p = ((tSai - (3 - i) * 0.04f) / 0.22f).coerceIn(0f, 1f)
                    if (p < 1f) tudoSaiu = false
                    sx *= 1f + 0.4f * p
                    sy *= 1f - p
                    if (p >= 1f) return@forEachIndexed
                } else tudoSaiu = false
            }
            c.save()
            c.scale(sx, sy, dg.px, dg.py)
            if (ambiente) c.drawPath(dg.path, linhaAmb)
            else { c.drawPath(dg.path, contorno); c.drawPath(dg.path, preench) }
            c.restore()
        }

        // a bolha com o dia (e o descanso ou as séries)
        val bx = ox + lado * 0.57f
        val by = oy + lado * 0.71f
        var esc = 1f
        if (vivo) {
            val tb = t - 0.3f
            esc = if (tb <= 0f) 0f else {
                val a = (tb / 0.2f).coerceIn(0f, 1f)
                a * (1f + 0.25f * exp(-5f * tb) * sin(15f * tb))
            }
            if (tSai >= 0f) esc *= (1f - tSai / 0.15f).coerceIn(0f, 1f)
        }
        if (esc > 0.01f) {
            c.save()
            c.scale(esc, esc, bx, by)
            val raio = lado * 0.105f
            if (ambiente) {
                bolhaBorda.color = Cores.CINZA
                c.drawCircle(bx, by, raio, bolhaBorda)
            } else {
                bolha.color = Color.argb(185, 18, 18, 24)
                c.drawCircle(bx, by, raio, bolha)
                bolhaBorda.color = Color.argb(90, 255, 255, 255)
                c.drawCircle(bx, by, raio, bolhaBorda)
            }
            val semana = SEMANA[cal.get(Calendar.DAY_OF_WEEK) - 1]
            val dia = cal.get(Calendar.DAY_OF_MONTH).toString()
            val extra = info?.invoke()
            val tx = ox + lado * 0.5f
            textoDia.color = if (ambiente) Cores.CINZA else Color.parseColor("#FFB36B")
            if (extra == null) {
                c.drawText(semana, tx, by - lado * 0.025f, textoDia)
                textoInfo.color = if (ambiente) Cores.CINZA else Color.WHITE
                c.drawText(dia, tx, by + lado * 0.06f, textoInfo)
            } else {
                c.drawText("$semana $dia", tx, by - lado * 0.025f, textoDia)
                textoInfo.color = if (ambiente) Cores.CINZA else extra.second
                c.drawText(extra.first, tx, by + lado * 0.06f, textoInfo)
            }
            c.restore()
        }

        // a bolinha que anda com os segundos, com o rastro do minuto
        if (!ambiente && esc > 0.01f) {
            val frac = (seg + (agora - segEm).coerceIn(0L, 999L) / 1000f) / 60f
            val r = lado / 2 - 9f * d
            rastro.alpha = (255 * min(1f, esc)).toInt()
            val caixa = RectF(cx - r, cy - r, cx + r, cy + r)
            c.save()
            c.rotate(-90f, cx, cy)
            c.drawArc(caixa, 0f, frac * 360f, false, rastro)
            c.restore()
            val ang = frac * 2 * PI - PI / 2
            val px = cx + (r * cos(ang)).toFloat()
            val py = cy + (r * sin(ang)).toFloat()
            ponto.color = Color.BLACK
            c.drawCircle(px, py, lado * 0.03f, ponto)
            ponto.color = Color.WHITE
            ponto.setShadowLayer(8f * d, 0f, 0f, Cores.LARANJA)
            c.drawCircle(px, py, lado * 0.019f, ponto)
            ponto.clearShadowLayer()
        }

        if (vivo) {
            if (tSai >= 0f && tudoSaiu && alfaFundo <= 0f) {
                mostrando = false
                saindoEm = 0L
                visibility = GONE
                aoSumir?.invoke()
            } else postInvalidateOnAnimation()
        }
    }

    companion object {
        const val DURACAO_MS = 3_800L
        // o desenho conferido contra a foto da máscara (protótipo em canvas, os
        // números sobrepostos aos dela: cabem na tela redonda como no modelo)
        const val TAMANHO = 0.63f
        const val LARGURA = 1.18f
        const val INCLINACAO = 0.13f
        const val BORDA = 0.0275f
        // a base dos números de cima e o topo dos de baixo, em frações da tela
        const val LINHA_CIMA = 0.495f
        const val LINHA_BAIXO = 0.511f
        const val ATRASO = 0.07f
        val COLUNAS = floatArrayOf(0.295f, 0.806f, 0.20f, 0.755f)
        val SEMANA = arrayOf("DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB.")
    }
}
