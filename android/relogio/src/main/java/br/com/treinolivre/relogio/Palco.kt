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

    // O descanso passando em cor (pedido do dono, 2026-11-18a: "mais gradiente
    // para demonstrar o tempo passando"). Em vez de três degraus (verde, amarelo
    // nos 10 s, vermelho nos 3 s), a cor anda sem saltos pela fração que falta:
    // verde-água cheio, verde, lima, amarelo, laranja e vermelho no fim. O anel,
    // o número e o fundo têm sempre a mesma cor, a do momento (2026-11-18b).
    val DESCANSO_CORES = intArrayOf(
        Color.parseColor("#FF3B4E"), // 0: acabou
        Color.parseColor("#FF6A2B"), // laranja forte
        Color.parseColor("#FF9F1C"), // laranja
        Color.parseColor("#FFD23C"), // amarelo
        Color.parseColor("#B6E83A"), // lima
        Color.parseColor("#4CD964"), // verde
        Color.parseColor("#1DE9B6"), // 1: começou
    )
    val DESCANSO_POS = floatArrayOf(0f, 0.1f, 0.22f, 0.38f, 0.56f, 0.78f, 1f)

    fun doDescanso(fracao: Float): Int {
        val f = fracao.coerceIn(0f, 1f)
        for (i in 1 until DESCANSO_POS.size) {
            if (f <= DESCANSO_POS[i]) {
                val t = (f - DESCANSO_POS[i - 1]) / (DESCANSO_POS[i] - DESCANSO_POS[i - 1])
                return misturar(DESCANSO_CORES[i - 1], DESCANSO_CORES[i], t)
            }
        }
        return DESCANSO_CORES.last()
    }

    // Os 5 últimos segundos do descanso (pedido do dono, 2026-11-18c: "ficar
    // louco de cor para avisar que está chegando a hora"). As cores são as do
    // fim do descanso e as da marca (laranja, rosa, roxo), as mesmas dos botões
    // e do selo: a festa combina com o resto da tela. A tela inteira (anel,
    // fundo, número, botões) troca junto, no mesmo compasso (FESTA_MS), porque
    // todos leem a cor deste mesmo relógio (SystemClock.uptimeMillis).
    val FESTA = intArrayOf(
        Color.parseColor("#FF3B4E"),
        Color.parseColor("#FF9F1C"),
        Color.parseColor("#FFD23C"),
        Color.parseColor("#E1306C"),
        Color.parseColor("#B05BFF"),
        Color.parseColor("#FF6A2B"),
    )
    const val FESTA_MS = 180L
    fun festa(agora: Long = SystemClock.uptimeMillis(), passo: Int = 0): Int =
        FESTA[(((agora / FESTA_MS) + passo) % FESTA.size).toInt()]

    // nos 10 últimos segundos a cor do momento pisca (meia volta por 0,6 s)
    fun piscada(agora: Long = SystemClock.uptimeMillis()): Float =
        (0.5f + 0.5f * kotlin.math.sin(agora / 600.0 * 2 * Math.PI).toFloat())

    fun misturar(a: Int, b: Int, t: Float): Int {
        val u = t.coerceIn(0f, 1f)
        fun c(x: Int, y: Int) = (x + (y - x) * u).toInt()
        return Color.rgb(c(Color.red(a), Color.red(b)), c(Color.green(a), Color.green(b)), c(Color.blue(a), Color.blue(b)))
    }
}

// Pedido do dono (2026-11-13a): "chame a atenção de quem está em volta, além de
// quem usa". O palco é o anel colorido que gira na borda da tela redonda: no
// treino ele é dividido em uma fatia por série (as feitas acesas no degradê da
// marca, a da vez piscando); no descanso ele esvazia passando pelo degradê do
// tempo (Cores.doDescanso: verde, amarelo, laranja, vermelho), o anel inteiro
// numa cor só, a do momento; no fim do treino, dourado. Com
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
    private val pPisca = Paint(Paint.ANTI_ALIAS_FLAG)
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
        // O anel inteiro na cor do momento, com um brilho da mesma cor girando
        // (pedido do dono, 2026-11-18b: a cor seguinte não pode aparecer antes
        // de o tempo chegar nela; antes o anel mostrava o degradê todo). A cor
        // é medida em passos de 1/400 para o degradê não ser refeito a cada quadro.
        Modo.DESCANSO -> if (resta in 1..5) {
            // a festa: o anel com as cores da festa, girando depressa, e a
            // ordem muda no mesmo compasso da tela
            val a = SystemClock.uptimeMillis()
            intArrayOf(Cores.festa(a), Cores.festa(a, 1), Cores.festa(a, 2), Cores.festa(a, 3), Cores.festa(a))
        } else {
            val c = Cores.doDescanso((mostrada * 400f).toInt() / 400f)
            intArrayOf(c, Cores.misturar(c, Color.WHITE, 0.35f), c, Cores.misturar(c, Color.BLACK, 0.25f), c)
        }
        Modo.FIM -> intArrayOf(Cores.OURO, Cores.LARANJA, Cores.ROSA, Cores.ROXO, Cores.OURO)
        else -> intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO, Cores.ROSA, Cores.LARANJA)
    }

    private fun corFundo(): Int = when (modo) {
        // a luz do fundo acompanha a ponta do arco, escurecida
        Modo.DESCANSO -> if (resta in 1..5) Cores.misturar(Cores.festa(), Color.BLACK, 0.55f)
            else Cores.misturar(Cores.doDescanso(mostrada), Color.BLACK, 0.72f)
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
        if (modo == Modo.DESCANSO && resta in 1..10) piscar(cv, cx, cy, r, agora)

        val vel = when (modo) {
            Modo.DESCANSO -> if (resta <= 5) 720f else if (resta <= 10) 260f else 110f
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
            Modo.DESCANSO -> if (resta <= 5) 200 else if (resta <= 10) (70 + 150 * Cores.piscada(agora)).toInt() else 85
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
                    cometa(cv, cx, cy, sw, -90f + 360f * mostrada, if (resta in 1..5) Cores.festa(agora, 1) else Cores.doDescanso(mostrada))
                }
            }
        }
        if (vivo) postInvalidateDelayed(33L)
    }

    // Os 10 últimos segundos: a tela inteira pisca na cor do momento. Os 5
    // últimos: a festa, a tela trocando de cor no compasso FESTA_MS, com uma
    // onda saindo do centro a cada segundo e outra do meio para a borda.
    private fun piscar(cv: Canvas, cx: Float, cy: Float, r: Float, agora: Long) {
        pPisca.shader = null
        if (resta <= 5) {
            pPisca.style = Paint.Style.FILL
            pPisca.color = Cores.festa(agora)
            pPisca.alpha = (70 + 70 * Cores.piscada(agora * 3)).toInt()
            cv.drawCircle(cx, cy, r, pPisca)
            pPisca.style = Paint.Style.STROKE
            for (k in 0..1) {
                val t = ((agora + k * 500L) % 1000L) / 1000f
                pPisca.color = Cores.festa(agora, k + 2)
                pPisca.strokeWidth = r * 0.09f * (1f - t) + dens
                pPisca.alpha = ((1f - t) * 220).toInt()
                cv.drawCircle(cx, cy, r * (0.15f + 0.9f * t), pPisca)
            }
        } else {
            pPisca.style = Paint.Style.FILL
            pPisca.color = Cores.doDescanso(mostrada)
            pPisca.alpha = (95 * Cores.piscada(agora)).toInt()
            cv.drawCircle(cx, cy, r, pPisca)
        }
    }

    // a ponta do arco: um ponto branco com halo, o que mais chama o olho
    private fun cometa(cv: Canvas, cx: Float, cy: Float, sw: Float, graus: Float, halo: Int = Color.WHITE) {
        val rr = oval.width() / 2f
        val rad = Math.toRadians(graus.toDouble())
        val px = cx + rr * cos(rad).toFloat()
        val py = cy + rr * sin(rad).toFloat()
        pPonto.color = halo
        pPonto.alpha = if (halo == Color.WHITE) 70 else 150
        cv.drawCircle(px, py, sw * (if (halo == Color.WHITE) 1.1f else 1.5f), pPonto)
        pPonto.color = Color.WHITE
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
