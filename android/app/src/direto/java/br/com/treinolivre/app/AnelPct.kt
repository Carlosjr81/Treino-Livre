package br.com.treinolivre.app

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import android.os.SystemClock
import android.view.View
import android.view.animation.DecelerateInterpolator

// O anel da porcentagem no celular, o mesmo do relógio (2026-11-20n, pedido
// do dono: "a tela do relógio ficou ótima, a do celular não está bem
// enquadrada"): a trilha escura, o andamento no degradê da marca e um brilho
// girando enquanto trabalha. Uma cor fixa no fim (verde) ou parado (âmbar).
class AnelPct(c: Context) : View(c) {
    private var fracao = 0f
    private var corFixa = 0
    private val trilha = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = Color.parseColor("#22222A") }
    private val arco = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val brilho = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND; color = Color.WHITE; alpha = 150 }
    private val caixa = RectF()
    private var anim: ValueAnimator? = null

    fun ir(p: Int) {
        val f = (p / 100f).coerceIn(0f, 1f)
        if (f == fracao) return
        anim?.cancel()
        anim = ValueAnimator.ofFloat(fracao, f).apply {
            duration = 500L; interpolator = DecelerateInterpolator()
            addUpdateListener { fracao = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    fun cor(c: Int) { if (c != corFixa) { corFixa = c; invalidate() } }

    override fun onDraw(cv: Canvas) {
        val w = width.toFloat(); val h = height.toFloat()
        val lado = minOf(w, h)
        val esp = lado * 0.075f
        trilha.strokeWidth = esp; arco.strokeWidth = esp; brilho.strokeWidth = esp * 0.45f
        val m = esp / 2f + 2f
        caixa.set((w - lado) / 2f + m, (h - lado) / 2f + m, (w + lado) / 2f - m, (h + lado) / 2f - m)
        cv.drawArc(caixa, 0f, 360f, false, trilha)
        if (corFixa != 0) { arco.shader = null; arco.color = corFixa }
        else arco.shader = SweepGradient(w / 2f, h / 2f, intArrayOf(Color.parseColor("#F58529"), Color.parseColor("#E1306C"), Color.parseColor("#833AB4"), Color.parseColor("#F58529")), null)
        val varre = 360f * fracao
        if (varre > 0.5f) cv.drawArc(caixa, -90f, varre, false, arco)
        if (fracao < 1f && corFixa == 0) {
            val t = (SystemClock.uptimeMillis() % 1600L) / 1600f
            cv.drawArc(caixa, -90f + 360f * t, 16f, false, brilho)
            postInvalidateOnAnimation()
        }
    }
}
