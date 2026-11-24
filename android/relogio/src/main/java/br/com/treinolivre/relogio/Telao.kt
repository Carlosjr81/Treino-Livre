package br.com.treinolivre.relogio

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RadialGradient
import android.graphics.Shader
import android.graphics.Typeface
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

// O telão da arena (2026-11-24a, pedido do dono, com dois vídeos de jogo num
// ginásio: "quero esse efeito do telão no relógio e no app"). O mesmo desenho
// do resumo animado do app (desenharTelao, no index.html), só com o genérico
// de arena, sem nome, logo, liga nem patrocinador: a parede de LED com as
// faixas azuis correndo de lado, três lasers verdes varrendo de uma treliça, e
// a placa do perímetro em âmbar com palavras passando, com o fio ciano em cima.
// Linhas escuras por cima fazem os pontinhos de LED.
//
// Entra na comemoração de cada série (a camada da frente do Palco) e na festa
// dos 5 últimos segundos do descanso. Nunca no modo ambiente.
object Telao {
    private val AZUL = intArrayOf(Color.parseColor("#4FC3FF"), Color.parseColor("#1E6BFF"), Color.parseColor("#0A2BD9"))
    private const val LASER = 0x3BFF5A
    private val AMBAR = Color.parseColor("#FFB21A")
    private val AMARELO = Color.parseColor("#FFD23F")
    private val CIANO = Color.parseColor("#35E0F0")
    private val LETRA = Color.parseColor("#1A0B00")
    val FESTA = intArrayOf(
        Color.parseColor("#1E6BFF"), Color.parseColor("#3BFF5A"), Color.parseColor("#FFB21A"),
        Color.parseColor("#E1306C"), Color.parseColor("#35E0F0"), Color.parseColor("#FFD23F"),
    )

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val pLuz = Paint(Paint.ANTI_ALIAS_FLAG).apply { xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD) }
    private val pTexto = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER }
    private val feixe = Path()
    private var gradParede: LinearGradient? = null
    private var chaveParede = ""

    private fun alfa(cor: Int, a: Float): Int =
        Color.argb((a.coerceIn(0f, 1f) * 255).toInt(), Color.red(cor), Color.green(cor), Color.blue(cor))

    private fun corFesta(s: Float, k: Int): Int {
        val i = (floor(s * 7f).toInt() + k) % FESTA.size
        return FESTA[if (i < 0) i + FESTA.size else i]
    }

    /**
     * t: segundos (o relógio da animação); forca: 0 a 1 (some no fim da
     * comemoração); festa: as cores da festa trocando juntas.
     */
    fun desenhar(cv: Canvas, w: Float, h: Float, t: Float, forca: Float, festa: Boolean, palavras: Array<String>, fonte: Typeface?) {
        if (forca <= 0f || w <= 0f || h <= 0f) return
        val s = t
        val u = w / 450f // a régua: um relógio de 450 px
        // 1) a parede de LED
        val py = h * 0.13f
        val ph = h * 0.12f
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = alfa(Color.parseColor("#03051A"), 0.85f * forca)
        cv.drawRect(0f, py - 4f * u, w, py + ph + 4f * u, p)
        val kp = "$w:$py:$ph"
        if (kp != chaveParede) {
            chaveParede = kp
            gradParede = LinearGradient(0f, py, 0f, py + ph, AZUL, floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP)
        }
        val larg = 7f * u
        val passo = 10f * u
        val n = (w / passo).toInt() + 2
        val salto = floor(s * 2.5f)
        for (k in 0 until n) {
            val x = k * passo
            val ux = x / w
            var b = 0.75f * max(0f, sin(ux * 9f + s * 4.2f)).pow(2) + 0.6f * max(0f, sin(ux * 3.1f - s * 1.4f)).pow(3)
            b = min(1f, 0.16f + b + if (festa) 0.5f else 0f)
            val degrau = if (sin(k * 1.7f + salto * 2.3f) > 0.55f) 0.5f else 1f
            if (festa) { p.shader = null; p.color = alfa(corFesta(s, k / 6), b * forca) }
            else { p.shader = gradParede; p.color = Color.WHITE; p.alpha = (b * forca * 255).toInt() }
            cv.drawRect(x, py + ph * (1f - degrau), x + larg, py + ph, p)
        }
        p.shader = null
        p.color = alfa(Color.BLACK, 0.45f * forca)
        var y = py
        while (y < py + ph) { cv.drawRect(0f, y, w, y + 1.2f * u, p); y += 3f * u }
        // a treliça
        val yb = py + ph + 8f * u
        p.color = alfa(Color.parseColor("#5A5A6E"), 0.7f * forca)
        cv.drawRect(0f, yb, w, yb + 1.5f * u, p)

        // 2) os lasers: três fontes, os feixes subindo e abrindo; na festa,
        // feixes descendo também, varrendo depressa
        val f = min(1f, 0.45f + if (festa) 0.4f else 0f) * forca
        val fontes = floatArrayOf(0.3f, 0.5f, 0.7f)
        for (k in fontes.indices) {
            val fx = fontes[k]
            val x = w * fx
            for (sent in intArrayOf(-1, 1)) {
                if (sent > 0 && !festa) continue
                val base = if (sent < 0) (-Math.PI / 2).toFloat() + (fx - 0.5f) * 1.3f else (Math.PI / 2).toFloat() - (fx - 0.5f) * 1.6f
                val a = base + sin(s * (if (festa) 3.1f else 0.9f) + k * 2.1f + if (sent > 0) 1.3f else 0f) * 0.38f
                val comp = if (sent < 0) h * 0.4f else h * 0.95f
                val al = f * if (sent < 0) 1f else 0.42f
                val ex = x + cos(a) * comp
                val ey = yb + sin(a) * comp
                val ab = if (sent < 0) 0.08f else 0.05f
                pLuz.shader = LinearGradient(x, yb, ex, ey, alfa(LASER or 0xFF000000.toInt(), 0.55f * al), alfa(LASER or 0xFF000000.toInt(), 0f), Shader.TileMode.CLAMP)
                pLuz.style = Paint.Style.FILL
                feixe.reset()
                feixe.moveTo(x, yb)
                feixe.lineTo(x + cos(a - ab) * comp, yb + sin(a - ab) * comp)
                feixe.lineTo(x + cos(a + ab) * comp, yb + sin(a + ab) * comp)
                feixe.close()
                cv.drawPath(feixe, pLuz)
                pLuz.shader = LinearGradient(x, yb, ex, ey, alfa(Color.parseColor("#DCFFE1"), 0.9f * al), alfa(LASER or 0xFF000000.toInt(), 0f), Shader.TileMode.CLAMP)
                pLuz.style = Paint.Style.STROKE
                pLuz.strokeWidth = 2f * u
                cv.drawLine(x, yb, ex, ey, pLuz)
            }
            pLuz.style = Paint.Style.FILL
            pLuz.shader = RadialGradient(x, yb, 16f * u, intArrayOf(alfa(Color.parseColor("#EBFFF0"), min(1f, f + 0.3f)), alfa(LASER or 0xFF000000.toInt(), f), alfa(LASER or 0xFF000000.toInt(), 0f)), floatArrayOf(0f, 0.3f, 1f), Shader.TileMode.CLAMP)
            cv.drawCircle(x, yb, 16f * u, pLuz)
        }
        pLuz.shader = null

        // 3) a placa do perímetro, com as palavras passando, e o fio ciano
        val qy = h * 0.79f
        val qh = h * 0.075f
        p.color = alfa(CIANO, 0.95f * forca)
        val desl = (s * 120f * u) % (20f * u)
        var cx = -20f * u + (20f * u - desl)
        while (cx < w) { cv.drawRect(cx, qy - 7f * u, cx + 11f * u, qy - 4f * u, p); cx += 20f * u }
        cv.save()
        cv.clipRect(0f, qy, w, qy + qh)
        p.color = alfa(Color.parseColor("#120700"), forca)
        cv.drawRect(0f, qy, w, qy + qh, p)
        if (fonte != null) pTexto.typeface = fonte
        pTexto.textSize = qh * 0.55f
        val painel = 150f * u
        val anda = s * 70f * u
        val primeiro = floor(anda / painel).toInt()
        for (j in 0..(w / painel).toInt() + 2) {
            val idx = primeiro + j
            val x = idx * painel - anda
            p.color = alfa(if (festa) corFesta(s, idx) else if (idx % 2 != 0) AMBAR else AMARELO, forca)
            cv.drawRect(x + 1.5f * u, qy + 1f * u, x + painel - 1.5f * u, qy + qh - 1f * u, p)
            if (palavras.isNotEmpty()) {
                val txt = palavras[((idx % palavras.size) + palavras.size) % palavras.size]
                pTexto.color = alfa(LETRA, forca)
                val tam = pTexto.measureText(txt)
                val esc = if (tam > painel - 14f * u) (painel - 14f * u) / tam else 1f
                cv.save()
                cv.scale(esc, 1f, x + painel / 2f, qy)
                cv.drawText(txt, x + painel / 2f, qy + qh / 2f - (pTexto.descent() + pTexto.ascent()) / 2f, pTexto)
                cv.restore()
            }
        }
        p.color = alfa(Color.BLACK, 0.3f * forca)
        var yy = qy
        while (yy < qy + qh) { cv.drawRect(0f, yy, w, yy + 0.8f * u, p); yy += 2.5f * u }
        cv.restore()
    }
}
