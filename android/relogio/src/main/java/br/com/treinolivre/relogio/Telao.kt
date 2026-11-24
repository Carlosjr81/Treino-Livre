package br.com.treinolivre.relogio

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Shader
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

// Os efeitos de LED (2026-11-24a, pedido do dono, com dois vídeos de jogo num
// ginásio: "use só os efeitos visuais do telão para recriar as animações; são
// futuristas"). Os mesmos do resumo animado do app (desenharTelao, no
// index.html), sem telão desenhado, sem nome nem marca: barras de luz verticais
// de larguras diferentes correndo de lado e acendendo em ondas, com a textura
// de pontinhos de LED; uma faixa delas atravessando a tela bem acesa (a
// varredura); e os lasers descendo do alto e varrendo. Na festa as cores
// trocam juntas.
//
// Entra na comemoração de cada série (a camada da frente do Palco) e na festa
// dos 5 últimos segundos do descanso. Nunca no modo ambiente.
object Telao {
    private val AZUL = intArrayOf(Color.parseColor("#7FD8FF"), Color.parseColor("#2E7BFF"), Color.parseColor("#0A2BD9"))
    private val LASER = Color.parseColor("#3BFF5A")
    val FESTA = intArrayOf(
        Color.parseColor("#2E7BFF"), Color.parseColor("#3BFF5A"), Color.parseColor("#FFB21A"),
        Color.parseColor("#E1306C"), Color.parseColor("#35E0F0"), Color.parseColor("#B05BFF"),
    )

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val pLuz = Paint(Paint.ANTI_ALIAS_FLAG).apply { xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD) }
    private val feixe = Path()
    private var grad: LinearGradient? = null
    private var chave = 0f

    private fun alfa(cor: Int, a: Float): Int =
        Color.argb((a.coerceIn(0f, 1f) * 255).toInt(), Color.red(cor), Color.green(cor), Color.blue(cor))

    private fun corFesta(s: Float, k: Int): Int {
        val i = (floor(s * 7f).toInt() + k) % FESTA.size
        return FESTA[if (i < 0) i + FESTA.size else i]
    }

    /**
     * t: segundos (o relógio da animação); forca: 0 a 1; festa: as cores
     * trocando juntas; varre: 0 a 1 enquanto a faixa da varredura atravessa
     * (negativo, sem varredura).
     */
    fun desenhar(cv: Canvas, w: Float, h: Float, t: Float, forca: Float, festa: Boolean, varre: Float) {
        if (forca <= 0f || w <= 0f || h <= 0f) return
        val s = t
        val u = w / 450f // a régua: um relógio de 450 px
        if (h != chave) {
            chave = h
            grad = LinearGradient(0f, 0f, 0f, h, intArrayOf(alfa(AZUL[1], 0f), AZUL[0], AZUL[1], AZUL[2], alfa(AZUL[2], 0f)),
                floatArrayOf(0f, 0.18f, 0.5f, 0.82f, 1f), Shader.TileMode.CLAMP)
        }
        // 1) as barras de luz, com a faixa da varredura
        val xc = if (varre >= 0f) -120f * u + varre * (w + 240f * u) else -1e6f
        val desl = (s * 30f * u) % (28f * u)
        var x = -desl - 28f * u
        var k = floor(s * 30f / 28f).toInt()
        val salto = floor(s * 2.5f)
        cv.saveLayer(0f, 0f, w, h, null)
        while (x < w) {
            val larg = (5 + (k * 37 % 5 + 5) % 5 * 3) * u
            val ux = x / w
            var b = 0.7f * max(0f, sin(ux * 7f + s * 3.6f)).pow(2) + 0.5f * max(0f, sin(ux * 2.3f - s * 1.2f)).pow(3)
            b = 0.18f * (0.35f + b) + if (festa) 0.3f * (0.5f + 0.5f * sin(k * 1.3f + s * 9f)) else 0f
            val perto = abs(x - xc)
            if (perto < 130f * u) b += 0.85f * (1f - perto / (130f * u))
            val corte = if (sin(k * 1.7f + salto * 2.3f) > 0.6f) 0.55f else 1f
            if (b > 0.01f) {
                val a = min(1f, b) * forca
                if (festa) { p.shader = null; p.color = alfa(corFesta(s, k / 3), a) }
                else { p.shader = grad; p.color = Color.WHITE; p.alpha = (a * 255).toInt() }
                val y0 = if (corte < 1f && k % 2 != 0) h * (1f - corte) else 0f
                cv.drawRect(x, y0, x + larg, y0 + h * corte, p)
            }
            x += larg + (6 + (k * 13 % 3 + 3) % 3 * 4) * u
            k++
        }
        // os pontinhos do LED: linhas escuras recortando só as barras
        p.shader = null
        p.color = Color.BLACK
        p.xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_OUT)
        var y = 0f
        while (y < h) { cv.drawRect(0f, y, w, y + 1.4f * u, p); y += 3.6f * u }
        p.xfermode = null
        cv.restore()

        // 2) os lasers descendo do alto e varrendo
        val f = (if (festa) 0.8f else 0.35f) * forca
        val yb = -8f * u
        val fontes = floatArrayOf(0.2f, 0.5f, 0.8f)
        for (n in fontes.indices) {
            val x0 = w * fontes[n]
            for (lado in intArrayOf(-1, 1)) {
                val a = (Math.PI / 2).toFloat() + lado * (0.25f + 0.2f * n) + sin(s * (if (festa) 3.2f else 0.8f) + n * 2.1f + lado) * 0.3f
                val comp = h * 1.1f
                val ex = x0 + cos(a) * comp
                val ey = yb + sin(a) * comp
                val cor = if (festa) corFesta(s, n * 2 + if (lado > 0) 1 else 0) else LASER
                val gr = LinearGradient(x0, yb, ex, ey, intArrayOf(alfa(cor, 0.45f * f), alfa(cor, 0.1f * f), alfa(cor, 0f)),
                    floatArrayOf(0f, 0.7f, 1f), Shader.TileMode.CLAMP)
                pLuz.shader = gr
                pLuz.style = Paint.Style.FILL
                feixe.reset()
                feixe.moveTo(x0, yb)
                feixe.lineTo(x0 + cos(a - 0.035f) * comp, yb + sin(a - 0.035f) * comp)
                feixe.lineTo(x0 + cos(a + 0.035f) * comp, yb + sin(a + 0.035f) * comp)
                feixe.close()
                cv.drawPath(feixe, pLuz)
                pLuz.style = Paint.Style.STROKE
                pLuz.strokeWidth = 1.6f * u
                cv.drawLine(x0, yb, ex, ey, pLuz)
            }
        }
        pLuz.shader = null
    }
}
