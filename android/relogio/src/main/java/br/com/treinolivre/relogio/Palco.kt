package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.SweepGradient
import android.os.SystemClock
import android.view.View
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

// As cores da marca, iguais às do app do celular
object Cores {
    val LARANJA = Color.parseColor("#F58529")
    val ROSA = Color.parseColor("#E1306C")
    val ROXO = Color.parseColor("#833AB4")
    val VERDE = Color.parseColor("#4CD137")
    val CIANO = Color.parseColor("#1DD1A1")
    val AMARELO = Color.parseColor("#FFC93C")
    val VERMELHO = Color.parseColor("#FF4757")
    val OURO = Color.parseColor("#FFD43B")
    val CINZA = Color.parseColor("#9A9AA5")
}

// Pedido do dono (2026-11-13a): "chame a atenção de quem está em volta, além de
// quem usa". O palco é o anel colorido que gira na borda da tela redonda: no
// treino ele é dividido em uma fatia por série (as feitas acesas no degradê da
// marca, a da vez piscando); no descanso ele esvazia em verde, fica amarelo nos
// últimos 10 s e vermelho nos 3 últimos; no fim do treino, dourado. Com
// `frente`, a mesma classe desenha por cima de tudo só o clarão e a onda da
// comemoração (sem pegar toque).
//
// No modo ambiente (tela apagada) é só um fio cinza, parado: a tela OLED não
// pode ficar com cor acesa, e o relógio só redesenha uma vez por minuto.
class Palco(c: Context, private val frente: Boolean = false) : View(c) {
    enum class Modo { PROCURANDO, PARADO, TREINO, DESCANSO, FIM }

    var ambiente = false
        set(v) { field = v; invalidate() }
    // só anima com a tela à vista (onResume/onPause): poupa a bateria
    var vivo = false
        set(v) { field = v; ultimo = 0L; if (v) invalidate() }

    private var modo = Modo.PROCURANDO
    private var alvo = 0f
    private var mostrada = 0f
    private var segmentos = 0
    private var feitos = 0
    private var resta = 0
    private var giro = 0f
    private var ultimo = 0L
    private var flashCor = 0
    private var flashEm = 0L
    private val dens = c.resources.displayMetrics.density

    private val pTrilho = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val pArco = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val pBrilho = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val pPonto = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val pFundo = Paint(Paint.ANTI_ALIAS_FLAG)
    private val pFlash = Paint(Paint.ANTI_ALIAS_FLAG)
    private val oval = RectF()
    private val giroM = Matrix()
    private var chaveFundo = ""
    private var chaveArco = ""
    private var gradArco: SweepGradient? = null

    fun procurando() = mudar(Modo.PROCURANDO, 0f, 0, 0, 0)
    fun parado() = mudar(Modo.PARADO, 1f, 0, 0, 0)
    fun treino(feitas: Int, total: Int) =
        mudar(Modo.TREINO, if (total > 0) feitas.toFloat() / total else 0f, total, feitas, 0)
    fun descanso(fracao: Float, segundos: Int) = mudar(Modo.DESCANSO, fracao, 0, 0, segundos)
    fun completo() = mudar(Modo.FIM, 1f, 0, 0, 0)

    fun flash(cor: Int) {
        flashCor = cor
        flashEm = SystemClock.uptimeMillis()
        invalidate()
    }

    private fun mudar(m: Modo, a: Float, seg: Int, f: Int, r: Int) {
        if (m != modo) mostrada = if (m == Modo.DESCANSO) 1f else 0f
        modo = m
        alvo = a.coerceIn(0f, 1f)
        segmentos = seg
        feitos = f
        resta = r
        invalidate()
    }

    private fun coresArco(): IntArray = when (modo) {
        Modo.DESCANSO -> when {
            resta <= 3 -> intArrayOf(Cores.VERMELHO, Cores.LARANJA, Cores.VERMELHO)
            resta <= 10 -> intArrayOf(Cores.AMARELO, Cores.LARANJA, Cores.AMARELO)
            else -> intArrayOf(Cores.VERDE, Cores.CIANO, Cores.VERDE)
        }
        Modo.FIM -> intArrayOf(Cores.OURO, Cores.LARANJA, Cores.ROSA, Cores.ROXO, Cores.OURO)
        else -> intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO, Cores.ROSA, Cores.LARANJA)
    }

    private fun corFundo(): Int = when (modo) {
        Modo.DESCANSO -> when {
            resta <= 3 -> Color.parseColor("#3D0A10")
            resta <= 10 -> Color.parseColor("#3A2A06")
            else -> Color.parseColor("#06301C")
        }
        Modo.FIM -> Color.parseColor("#3A2C00")
        else -> Color.parseColor("#2E0B33")
    }

    override fun onDraw(cv: Canvas) {
        val agora = SystemClock.uptimeMillis()
        val dt = if (ultimo == 0L) 16L else min(100L, agora - ultimo)
        ultimo = agora
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val cx = w / 2f
        val cy = h / 2f
        val r = min(w, h) / 2f

        if (frente) {
            desenharFlash(cv, cx, cy, r, agora)
            if (vivo && !ambiente && flashEm != 0L) postInvalidateDelayed(16L)
            return
        }

        if (ambiente) {
            cv.drawColor(Color.BLACK)
            val fio = 2f * dens
            val ins = fio * 2f
            oval.set(cx - r + ins, cy - r + ins, cx + r - ins, cy + r - ins)
            pTrilho.shader = null; pTrilho.strokeWidth = fio; pTrilho.color = Color.parseColor("#333333")
            cv.drawArc(oval, 0f, 360f, false, pTrilho)
            if (alvo > 0f && modo != Modo.PARADO) {
                pArco.shader = null; pArco.strokeWidth = fio; pArco.strokeCap = Paint.Cap.ROUND
                pArco.color = Cores.CINZA
                cv.drawArc(oval, -90f, 360f * alvo, false, pArco)
            }
            return
        }

        // o fundo: uma luz na cor do momento, saindo do centro
        val cf = corFundo()
        val kf = "${w}x$h:$cf"
        if (kf != chaveFundo) {
            chaveFundo = kf
            pFundo.shader = RadialGradient(cx, cy, r * 1.05f, intArrayOf(cf, Color.BLACK), floatArrayOf(0f, 1f), Shader.TileMode.CLAMP)
        }
        cv.drawColor(Color.BLACK)
        cv.drawRect(0f, 0f, w, h, pFundo)

        val vel = when (modo) {
            Modo.DESCANSO -> if (resta <= 10) 260f else 110f
            Modo.FIM -> 200f
            Modo.PROCURANDO -> 240f
            else -> 55f
        }
        giro = (giro + vel * dt / 1000f) % 360f
        mostrada += (alvo - mostrada) * min(1f, dt / 220f)

        val sw = r * 0.075f
        val ins = sw * 0.5f + 2f * dens
        oval.set(cx - r + ins, cy - r + ins, cx + r - ins, cy + r - ins)

        val cores = coresArco()
        val ka = cores.joinToString(",") + ":$cx:$cy"
        if (ka != chaveArco) {
            chaveArco = ka
            gradArco = SweepGradient(cx, cy, cores, null)
        }
        giroM.setRotate(giro, cx, cy)
        gradArco?.setLocalMatrix(giroM)

        pTrilho.shader = null; pTrilho.strokeWidth = sw; pTrilho.color = 0x26FFFFFF
        pTrilho.strokeCap = Paint.Cap.BUTT
        pArco.shader = gradArco; pArco.strokeWidth = sw; pArco.alpha = 255
        pBrilho.shader = gradArco; pBrilho.strokeWidth = sw * 2.6f
        val pulso = 0.5f + 0.5f * sin(agora / 160.0).toFloat()
        pBrilho.alpha = when (modo) {
            Modo.FIM -> (60 + 90 * pulso).toInt()
            Modo.DESCANSO -> if (resta <= 10) (50 + 100 * pulso).toInt() else 60
            else -> 55
        }

        when (modo) {
            Modo.PROCURANDO -> {
                cv.drawArc(oval, 0f, 360f, false, pTrilho)
                pArco.strokeCap = Paint.Cap.ROUND
                cv.drawArc(oval, giro - 90f, 80f, false, pBrilho)
                cv.drawArc(oval, giro - 90f, 80f, false, pArco)
            }
            Modo.PARADO -> {
                pArco.strokeCap = Paint.Cap.BUTT
                pArco.alpha = 110
                cv.drawArc(oval, 0f, 360f, false, pArco)
                pArco.alpha = 255
            }
            Modo.FIM -> {
                pArco.strokeCap = Paint.Cap.BUTT
                cv.drawArc(oval, 0f, 360f, false, pBrilho)
                cv.drawArc(oval, 0f, 360f, false, pArco)
            }
            Modo.TREINO -> {
                val n = segmentos
                if (n in 2..48) {
                    // uma fatia por série: dá para contar de longe quantas faltam
                    val cada = 360f / n
                    val vao = if (n > 24) 2f else 3.5f
                    if (feitos > 0) cv.drawArc(oval, -90f, cada * feitos, false, pBrilho)
                    pArco.strokeCap = Paint.Cap.BUTT
                    for (i in 0 until n) {
                        val ini = -90f + i * cada + vao / 2f
                        val arco = cada - vao
                        when {
                            i < feitos -> cv.drawArc(oval, ini, arco, false, pArco)
                            i == feitos -> {
                                cv.drawArc(oval, ini, arco, false, pTrilho)
                                pArco.alpha = (60 + 160 * pulso).toInt()
                                cv.drawArc(oval, ini, arco, false, pArco)
                                pArco.alpha = 255
                            }
                            else -> cv.drawArc(oval, ini, arco, false, pTrilho)
                        }
                    }
                } else {
                    cv.drawArc(oval, 0f, 360f, false, pTrilho)
                    pArco.strokeCap = Paint.Cap.ROUND
                    if (mostrada > 0.005f) {
                        cv.drawArc(oval, -90f, 360f * mostrada, false, pBrilho)
                        cv.drawArc(oval, -90f, 360f * mostrada, false, pArco)
                        cometa(cv, cx, cy, sw, -90f + 360f * mostrada)
                    }
                }
            }
            Modo.DESCANSO -> {
                cv.drawArc(oval, 0f, 360f, false, pTrilho)
                pArco.strokeCap = Paint.Cap.ROUND
                if (mostrada > 0.005f) {
                    cv.drawArc(oval, -90f, 360f * mostrada, false, pBrilho)
                    cv.drawArc(oval, -90f, 360f * mostrada, false, pArco)
                    cometa(cv, cx, cy, sw, -90f + 360f * mostrada)
                }
            }
        }
        if (vivo) postInvalidateDelayed(33L)
    }

    // a ponta do arco: um ponto branco com halo, o que mais chama o olho
    private fun cometa(cv: Canvas, cx: Float, cy: Float, sw: Float, graus: Float) {
        val rr = oval.width() / 2f
        val rad = Math.toRadians(graus.toDouble())
        val px = cx + rr * cos(rad).toFloat()
        val py = cy + rr * sin(rad).toFloat()
        pPonto.color = Color.WHITE
        pPonto.alpha = 70
        cv.drawCircle(px, py, sw * 1.1f, pPonto)
        pPonto.alpha = 255
        cv.drawCircle(px, py, sw * 0.5f, pPonto)
    }

    private fun desenharFlash(cv: Canvas, cx: Float, cy: Float, r: Float, agora: Long) {
        if (flashEm == 0L || ambiente) return
        val t = (agora - flashEm) / 1000f
        if (t >= 1f) { flashEm = 0L; return }
        val u = 1f - t
        pFlash.shader = null
        pFlash.style = Paint.Style.FILL
        pFlash.color = flashCor
        pFlash.alpha = (u * u * 140).toInt()
        cv.drawCircle(cx, cy, r, pFlash)
        // duas ondas saindo do centro
        pFlash.style = Paint.Style.STROKE
        for (k in 0..1) {
            val tt = t * 1.25f - k * 0.25f
            if (tt <= 0f || tt >= 1f) continue
            pFlash.strokeWidth = r * 0.07f * (1f - tt) + dens
            pFlash.alpha = ((1f - tt) * 255).toInt()
            cv.drawCircle(cx, cy, r * (0.2f + 0.85f * tt), pFlash)
        }
    }
}
