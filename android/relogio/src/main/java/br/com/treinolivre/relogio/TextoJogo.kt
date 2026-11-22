package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.widget.TextView

// O texto no visual do resumo animado (2026-11-22e, pedido do dono): a letra
// de letreiro (Rammetto One, a mesma do app, em res/font/letreiro.ttf), um
// pouco inclinada, com o contorno preto ATRÁS do preenchimento (por cima, ele
// risca por dentro das letras, como aconteceu no app em 2026-11-21b) e, nos
// números, o degradê amarelo, laranja e rosa. Sem `cores`, o preenchimento é
// a cor do texto (o número do descanso troca de cor com o tempo).
class TextoJogo(c: Context) : TextView(c) {
    var cores: IntArray? = null
        set(v) { field = v; chave = ""; invalidate() }
    var traco = 0f
    private var desenhando = false
    private var chave = ""
    private var degrade: Shader? = null

    init { paint.textSkewX = -0.14f }

    override fun invalidate() { if (!desenhando) super.invalidate() }

    override fun onDraw(canvas: Canvas) {
        val cs = cores
        if (cs != null) {
            val k = "$height:${cs.contentHashCode()}"
            if (k != chave) {
                chave = k
                degrade = LinearGradient(0f, totalPaddingTop.toFloat(), 0f, (height - totalPaddingBottom).toFloat(), cs, null, Shader.TileMode.CLAMP)
            }
        }
        if (traco <= 0f) { paint.shader = if (cs != null) degrade else null; super.onDraw(canvas); return }
        val cor = currentTextColor
        desenhando = true
        try {
            // a sombra dura e o contorno, atrás
            paint.shader = null
            setTextColor(Color.BLACK)
            paint.style = Paint.Style.STROKE
            paint.strokeJoin = Paint.Join.ROUND
            paint.strokeWidth = traco
            canvas.save(); canvas.translate(traco * 0.3f, traco * 0.45f); super.onDraw(canvas); canvas.restore()
            super.onDraw(canvas)
            // o preenchimento limpo, na frente
            paint.style = Paint.Style.FILL
            setTextColor(cor)
            if (cs != null) paint.shader = degrade
            super.onDraw(canvas)
        } finally {
            paint.shader = null
            paint.style = Paint.Style.FILL
            desenhando = false
        }
    }
}
