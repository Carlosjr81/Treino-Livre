package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.os.SystemClock
import android.view.View
import kotlin.math.PI
import kotlin.math.sin

// O coração voltando, no pulso (2026-11-22g, pedido do dono: "aquele coração
// batendo e pulsando no resumo animado ficou bem legal; use essa ideia no app e
// no relógio"). O mesmo coração anatômico do resumo animado (o corpo, os átrios,
// a aorta com os três ramos, a veia cava, o tronco pulmonar, as coronárias e o
// brilho), batendo no batimento de agora com o "tum-tum", dentro da mira: o
// anel que enche conforme o coração volta (do pico da série até o alvo), a onda
// a cada batida e o anel tracejado girando. Voltou: verde, com o ✓.
// Anima só enquanto está à vista (a vista do coração no descanso).
class CoracaoArte(ctx: Context) : View(ctx) {
    var bpm = 70
    var volta = 0f          // 0..1: quanto do caminho do pico ao alvo já desceu
    var pronto = false
    var animando = false
        set(v) { val era = field; field = v; if (v && !era) postInvalidateOnAnimation() }
    // ms entre quadros: 33 no descanso, 66 atrás da série (meio ritmo, menos bateria)
    var intervalo = 33L
    // o anel da volta (só no descanso: atrás da série não há volta a medir)
    var anel = true

    override fun onVisibilityChanged(v: View, vis: Int) {
        super.onVisibilityChanged(v, vis)
        if (vis == VISIBLE && animando) postInvalidateOnAnimation()
    }
    private val t0 = SystemClock.uptimeMillis()

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val corpo = Path()
    private val COR_AR = Color.parseColor("#4DEBFF")

    init {
        // o mesmo desenho do resumo (corpoCoracao), de -1 a 1
        corpo.moveTo(-0.48f, -0.42f)
        corpo.cubicTo(-0.85f, -0.45f, -0.97f, 0.05f, -0.72f, 0.38f)
        corpo.cubicTo(-0.52f, 0.68f, -0.05f, 0.92f, 0.22f, 1.02f)
        corpo.cubicTo(0.42f, 0.82f, 0.84f, 0.48f, 0.85f, 0.05f)
        corpo.cubicTo(0.87f, -0.32f, 0.62f, -0.52f, 0.38f, -0.45f)
        corpo.cubicTo(0.18f, -0.4f, 0.02f, -0.36f, -0.12f, -0.4f)
        corpo.cubicTo(-0.25f, -0.44f, -0.38f, -0.45f, -0.48f, -0.42f)
        corpo.close()
    }

    // a batida: a sístole forte e o segundo som curto (batidaCoracao do site)
    private fun batida(ms: Long): Pair<Float, Float> {
        val f = ((ms * bpm.coerceIn(35, 230)) / 60000.0 % 1.0).toFloat()
        val lub = if (f < 0.16f) sin(f / 0.16f * PI).toFloat() else 0f
        val dub = if (f >= 0.2f && f < 0.32f) (sin((f - 0.2f) / 0.12f * PI) * 0.55).toFloat() else 0f
        return f to (lub + dub)
    }

    private fun tubo(c: Canvas, x0: Float, y0: Float, x1: Float, y1: Float, cx: Float?, cy: Float?, cx2: Float?, cy2: Float?, larg: Float, corA: Int, corB: Int, brilho: Int) {
        val path = Path().apply {
            moveTo(x0, y0)
            if (cx2 != null && cy2 != null && cx != null && cy != null) cubicTo(cx, cy, cx2, cy2, x1, y1)
            else if (cx != null && cy != null) quadTo(cx, cy, x1, y1)
            else lineTo(x1, y1)
        }
        p.style = Paint.Style.STROKE; p.strokeCap = Paint.Cap.ROUND; p.strokeJoin = Paint.Join.ROUND; p.shader = null
        p.color = 0x73000000; p.strokeWidth = larg + 0.03f; c.drawPath(path, p)
        p.shader = LinearGradient(x0 - larg, 0f, x0 + larg, 0f, intArrayOf(corB, corA, corB), floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP)
        p.strokeWidth = larg; c.drawPath(path, p)
        p.shader = null; p.color = brilho; p.alpha = 140; p.strokeWidth = larg * 0.22f; c.drawPath(path, p)
        p.alpha = 255
    }

    private fun coracao(c: Canvas) {
        val vermelho = Color.parseColor("#D33A4C"); val vinho = Color.parseColor("#6E0E1C"); val rosado = Color.parseColor("#FF9AA6")
        // a veia cava, os ramos da aorta e a aorta
        tubo(c, -0.5f, -0.3f, -0.52f, -1.05f, null, null, null, null, 0.2f, Color.parseColor("#4A6FC7"), Color.parseColor("#1E2E66"), Color.parseColor("#9DB6FF"))
        floatArrayOf(-0.02f, -0.92f, -0.06f, -1.3f, 0.13f, -0.98f, 0.14f, -1.34f, 0.28f, -0.97f, 0.34f, -1.3f).let { r ->
            for (k in 0 until 3) tubo(c, r[k * 4], r[k * 4 + 1], r[k * 4 + 2], r[k * 4 + 3], null, null, null, null, 0.08f, vermelho, vinho, rosado)
        }
        tubo(c, -0.06f, -0.36f, 0.5f, -0.66f, -0.1f, -1.08f, 0.45f, -1.12f, 0.24f, vermelho, vinho, rosado)
        // os átrios
        p.style = Paint.Style.FILL
        for (a in arrayOf(floatArrayOf(-0.66f, -0.2f, 0.3f, 0.32f), floatArrayOf(0.64f, -0.36f, 0.22f, 0.18f))) {
            p.shader = RadialGradient(a[0] - a[2] * 0.3f, a[1] - a[3] * 0.3f, a[2], Color.parseColor("#C8344A"), Color.parseColor("#5A0816"), Shader.TileMode.CLAMP)
            c.drawOval(RectF(a[0] - a[2], a[1] - a[3], a[0] + a[2], a[1] + a[3]), p)
        }
        // o corpo com luz de cima à esquerda
        p.shader = RadialGradient(-0.25f, -0.15f, 1.15f,
            intArrayOf(Color.parseColor("#F45F72"), Color.parseColor("#BE1C33"), Color.parseColor("#650A1B"), Color.parseColor("#33040D")),
            floatArrayOf(0f, 0.42f, 0.82f, 1f), Shader.TileMode.CLAMP)
        c.drawPath(corpo, p)
        c.save(); c.clipPath(corpo)
        p.shader = null; p.style = Paint.Style.STROKE
        // a gordura no sulco e as coronárias
        p.color = Color.argb(115, 232, 195, 106); p.strokeWidth = 0.07f
        c.drawPath(Path().apply { moveTo(-0.6f, -0.3f); quadTo(0.1f, -0.2f, 0.78f, -0.24f) }, p)
        val cor = arrayOf(
            floatArrayOf(0.04f, -0.3f, 0.1f, 0.2f, 0.16f, 0.6f, 0.22f, 0.98f, 0.04f),
            floatArrayOf(0.08f, 0.02f, 0.3f, 0.02f, 0.58f, 0.16f, 0f, 0f, 0.026f),
            floatArrayOf(0.12f, 0.36f, 0.3f, 0.42f, 0.5f, 0.58f, 0f, 0f, 0.022f),
            floatArrayOf(0.06f, 0.1f, -0.15f, 0.2f, -0.38f, 0.38f, 0f, 0f, 0.024f),
            floatArrayOf(-0.58f, -0.22f, -0.66f, 0.15f, -0.5f, 0.5f, 0f, 0f, 0.022f))
        for (k in cor) {
            val path = Path().apply { moveTo(k[0], k[1]); if (k[6] != 0f || k[7] != 0f) cubicTo(k[2], k[3], k[4], k[5], k[6], k[7]) else quadTo(k[2], k[3], k[4], k[5]) }
            p.color = Color.parseColor("#4A0712"); p.strokeWidth = k[8]; c.drawPath(path, p)
            p.color = Color.argb(140, 255, 140, 155); p.strokeWidth = k[8] * 0.35f; c.drawPath(path, p)
        }
        // o brilho úmido e a sombra embaixo
        p.style = Paint.Style.FILL
        p.shader = RadialGradient(-0.4f, -0.12f, 0.45f, Color.argb(107, 255, 255, 255), Color.TRANSPARENT, Shader.TileMode.CLAMP)
        c.drawRect(-1f, -1f, 1f, 1.1f, p)
        p.shader = LinearGradient(0f, 0.2f, 0.3f, 1.05f, Color.TRANSPARENT, Color.argb(115, 0, 0, 0), Shader.TileMode.CLAMP)
        c.drawRect(-1f, -1f, 1f, 1.1f, p)
        c.restore()
        p.shader = null; p.style = Paint.Style.STROKE; p.color = Color.argb(90, 255, 150, 170); p.strokeWidth = 0.02f
        c.drawPath(corpo, p)
        // o tronco pulmonar, na frente
        tubo(c, 0.2f, -0.34f, 0.02f, -0.84f, 0.34f, -0.76f, null, null, 0.2f, Color.parseColor("#7A5BC8"), Color.parseColor("#2E1E66"), Color.parseColor("#C9B6FF"))
    }

    override fun onDraw(c: Canvas) {
        val L = minOf(width, height).toFloat()
        if (L <= 0f) return
        val ms = SystemClock.uptimeMillis() - t0
        val (f, forca) = if (animando) batida(ms) else 0.5f to 0f
        val cx = width / 2f; val cy = height / 2f; val r0 = L * 0.43f
        val corRgb = if (pronto) Color.rgb(76, 209, 55) else Color.rgb(255, 40, 80)
        // a luz atrás, pulsando
        p.style = Paint.Style.FILL
        p.shader = RadialGradient(cx, cy, L * 0.5f, Color.argb((90 + 90 * forca).toInt().coerceIn(0, 255), Color.red(corRgb), Color.green(corRgb), Color.blue(corRgb)),
            Color.TRANSPARENT, Shader.TileMode.CLAMP)
        c.drawCircle(cx, cy, L * 0.5f, p)
        p.shader = null
        // atrás dos dados, sem o anel tracejado da mira: a borda da tela já tem
        // o anel do descanso, e três anéis juntos virariam ruído
        // o anel da volta
        p.style = Paint.Style.STROKE; p.pathEffect = null
        p.strokeCap = Paint.Cap.ROUND; p.strokeWidth = L * 0.05f
        val arco = RectF(cx - r0 * 0.94f, cy - r0 * 0.94f, cx + r0 * 0.94f, cy + r0 * 0.94f)
        if (anel) {
            p.color = 0x1AFFFFFF; c.drawArc(arco, 0f, 360f, false, p)
            val frac = if (pronto) 1f else volta.coerceIn(0f, 1f)
            if (frac > 0f) { p.color = if (pronto) Cores.VERDE else COR_AR; c.drawArc(arco, -90f, frac * 360f, false, p) }
        }
        // a onda de cada batida
        if (animando && f < 0.6f) {
            p.strokeWidth = L * 0.016f; p.color = if (pronto) Cores.VERDE else Color.parseColor("#FF3B5C")
            p.alpha = ((1 - f / 0.6f) * 140).toInt()
            c.drawCircle(cx, cy, r0 * (0.55f + f * 0.6f), p); p.alpha = 255
        }
        // o coração batendo
        val esc = r0 * 0.5f * (1 + 0.07f * forca)
        c.save(); c.translate(cx, cy + r0 * 0.08f); c.rotate(-7f); c.scale(esc, esc * (1 - 0.02f * forca))
        coracao(c)
        c.restore()
        // o ✓ quando voltou
        if (pronto) {
            p.style = Paint.Style.FILL; p.color = Cores.VERDE
            c.drawCircle(cx + r0 * 0.72f, cy + r0 * 0.72f, L * 0.1f, p)
            p.style = Paint.Style.STROKE; p.color = Color.parseColor("#0B0418"); p.strokeWidth = L * 0.024f
            p.strokeCap = Paint.Cap.ROUND; p.strokeJoin = Paint.Join.ROUND
            c.drawPath(Path().apply { moveTo(cx + r0 * 0.62f, cy + r0 * 0.73f); lineTo(cx + r0 * 0.7f, cy + r0 * 0.81f); lineTo(cx + r0 * 0.84f, cy + r0 * 0.62f) }, p)
        }
        if (animando && isAttachedToWindow && visibility == VISIBLE) postInvalidateDelayed(intervalo)
    }
}
