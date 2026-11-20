package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.SystemClock
import android.text.format.DateFormat
import android.view.View
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

// A hora no relógio (pedido do dono, 2026-11-20d e 20f): "durante o treino não
// vejo a hora". ENQUANTO a pessoa segura a tela, aparece a hora; ao soltar,
// volta o treino. Segurar, e não tocar: um toque é comando do treino.
//
// O desenho é o da máscara do Galaxy Watch que ele mandou: quatro números
// enormes, dois em cima e dois embaixo, vazando da tela, com um contorno preto
// separando um do outro, e uma bolha translúcida com o dia. A fonte é a Bodoni
// Moda Black Italic (licença OFL, livre), a mais parecida com a da Samsung, que
// não é livre. O preenchimento é o degradê da marca, um só para a tela inteira.
//
// "A fonte parece montada sobre uma esfera": os números são desenhados numa
// camada e a camada é curvada como a pele de uma bola (drawBitmapMesh): o meio
// cresce e a borda encolhe, com sombra na borda e um brilho no alto à esquerda,
// só nos números.
//
// O efeito geleia: cada número entra de um em um, cresce passando do ponto e
// treme, achatando e esticando, até parar; a cada segundo os minutos dão um
// tremidinho; ao soltar, eles se achatam e somem.
//
// A bolha e a bolinha laranja da borda ficam onde estão no modelo; no descanso
// a bolha diz "DESCANSO" e o tempo que falta, na cor dele. No modo ambiente
// (tela apagada), a mesma hora só no contorno cinza, parada.
//
// Cada relógio: em tela redonda, o desenho do modelo num quadrado do tamanho do
// menor lado; em tela quadrada ou retangular (Oppo Watch, alguns Fossil e
// Mobvoi), os números ocupam a tela inteira, na proporção dela. Tudo é medido
// em frações da tela, então vale para tela pequena e grande.
class HoraGeleia(contexto: Context) : View(contexto) {
    // o que vai na bolha no lugar do dia: (texto, cor), ou null para o dia
    var info: (() -> Pair<String, Int>?)? = null
    var aoSumir: (() -> Unit)? = null

    var ambiente = false
        set(v) { field = v; chave = ""; invalidate() }

    var mostrando = false
        private set
    private var inicio = 0L
    private var saindoEm = 0L
    private val fonte: Typeface = try { resources.getFont(R.font.bodoni_moda_black_italic) } catch (e: Exception) { Typeface.create(Typeface.SERIF, Typeface.BOLD_ITALIC) }
    private val redonda = resources.configuration.isScreenRound

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
    private val sombra = Paint(Paint.ANTI_ALIAS_FLAG).apply { xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_ATOP) }
    private val brilho = Paint(Paint.ANTI_ALIAS_FLAG).apply { xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_ATOP) }
    private val malhaPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val fundo = Paint().apply { color = Color.BLACK }
    private val bolhaBorda = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val textoDia = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
        textAlign = Paint.Align.CENTER
        letterSpacing = 0.08f
    }
    private val textoInfo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        textAlign = Paint.Align.CENTER
    }
    private val ponto = Paint(Paint.ANTI_ALIAS_FLAG)

    // os quatro números já recortados no lugar, refeitos quando a hora muda
    private class Digito(val path: Path, val px: Float, val py: Float)
    private var digitos = emptyList<Digito>()
    private var horaFeita = ""
    // o quadro do desenho: na redonda, o quadrado do menor lado; na
    // retangular, a tela toda
    private var lado = 0f
    private var larg = 0f
    private var alt = 0f
    private var ox = 0f
    private var oy = 0f
    private var ultimoSeg = -1
    private var segEm = 0L
    // a camada dos números e a malha que a curva em esfera
    private var camada: Bitmap? = null
    private var tela: Canvas? = null
    private var malha = FloatArray(0)
    private var chave = ""
    private val escalas = FloatArray(8)

    init { visibility = GONE }

    // Segurou: mostra, e fica enquanto o dedo estiver na tela.
    fun mostrar() {
        if (ambiente) return
        if (mostrando && saindoEm == 0L) return
        mostrando = true
        inicio = SystemClock.uptimeMillis()
        saindoEm = 0L
        chave = ""
        visibility = VISIBLE
        removeCallbacks(sumir)
        // segurança: se o soltar se perder, a hora não fica para sempre
        postDelayed(sumir, LIMITE_MS)
        postInvalidateOnAnimation()
    }

    // soltou: a geleia achata e o treino volta
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

    // à vista e ainda não saindo (o dedo pode já ter soltado)
    val aberta: Boolean get() = mostrando && saindoEm == 0L

    // soltou o dedo: fica FICA_MS à vista, sem o dedo na frente, e então sai
    fun soltar() {
        if (!mostrando || saindoEm != 0L) return
        removeCallbacks(sumir)
        postDelayed(sumir, FICA_MS)
    }

    override fun onSizeChanged(w: Int, h: Int, ow: Int, oh: Int) {
        super.onSizeChanged(w, h, ow, oh)
        if (w <= 0 || h <= 0) return
        lado = min(w, h).toFloat()
        if (redonda) {
            larg = lado; alt = lado
            ox = (w - lado) / 2f; oy = (h - lado) / 2f
        } else {
            larg = w.toFloat(); alt = h.toFloat()
            ox = 0f; oy = 0f
        }
        // na tela retangular o número cresce com a altura (há mais espaço)
        numero.textSize = (if (redonda) lado else min(alt, larg * 1.15f)) * TAMANHO
        contorno.strokeWidth = lado * BORDA * 2f
        linhaAmb.strokeWidth = 1.6f * d
        preench.shader = LinearGradient(ox, oy, ox + larg, oy + alt,
            intArrayOf(Color.parseColor("#FFB36B"), Cores.LARANJA, Cores.ROSA, Color.parseColor("#B05BFF")),
            floatArrayOf(0f, 0.3f, 0.65f, 1f), Shader.TileMode.CLAMP)
        textoDia.textSize = lado * 0.05f
        textoInfo.textSize = lado * 0.062f
        bolhaBorda.strokeWidth = 1.5f * d
        horaFeita = ""
        chave = ""

        // a camada e a esfera
        camada?.recycle()
        val bm = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        camada = bm
        tela = Canvas(bm)
        val cx = w / 2f
        val cy = h / 2f
        val raio = if (redonda) lado / 2f else hypot(w.toFloat(), h.toFloat()) / 2f
        sombra.shader = RadialGradient(cx, cy, raio,
            intArrayOf(Color.TRANSPARENT, Color.TRANSPARENT, Color.argb(51, 0, 0, 0), Color.argb(115, 0, 0, 0)),
            floatArrayOf(0f, 0.5f, 0.82f, 1f), Shader.TileMode.CLAMP)
        brilho.shader = RadialGradient(cx - raio * 0.28f, cy - raio * 0.34f, raio * 0.62f,
            intArrayOf(Color.argb(80, 255, 255, 255), Color.argb(25, 255, 255, 255), Color.TRANSPARENT),
            floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP)
        // A pele da bola: o ponto que estava a uma distância d (0 no meio, 1 na
        // borda) vai para sin(d·π/2), misturado com a força: o meio cresce e a
        // borda encolhe, como uma figura colada numa esfera vista de frente.
        val n = MALHA
        malha = FloatArray((n + 1) * (n + 1) * 2)
        var k = 0
        for (j in 0..n) for (i in 0..n) {
            val x = w * i / n.toFloat()
            val y = h * j / n.toFloat()
            val dx = (x - cx) / raio
            val dy = (y - cy) / raio
            val dist = sqrt(dx * dx + dy * dy)
            var f = 1f
            if (dist > 0.0001f && dist < 1f) {
                val curva = sin(dist * PI.toFloat() / 2f)
                f = (dist + ESFERA * (curva - dist)) / dist
            }
            malha[k++] = cx + (x - cx) * f
            malha[k++] = cy + (y - cy) * f
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        camada?.recycle(); camada = null; tela = null
    }

    private fun montar(texto: String) {
        if (texto == horaFeita || lado <= 0f) return
        horaFeita = texto
        chave = ""
        val b = RectF()
        digitos = texto.mapIndexed { i, ch ->
            val p = Path()
            numero.getTextPath(ch.toString(), 0, 1, 0f, 0f, p)
            p.computeBounds(b, true)
            val cx = ox + larg * COLUNAS[i]
            val emCima = i < 2
            val dx = cx - b.centerX()
            val dy = if (emCima) oy + alt * LINHA_CIMA - b.bottom else oy + alt * LINHA_BAIXO - b.top
            p.offset(dx, dy)
            p.computeBounds(b, true)
            // a geleia treme presa no canto do número que fica perto do meio
            val px = (ox + larg / 2).coerceIn(b.left, b.right)
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

        val t = (agora - inicio) / 1000f
        val tSai = if (saindoEm > 0L) (agora - saindoEm) / 1000f else -1f
        val vivo = !ambiente && mostrando

        // o fundo escurece rápido na entrada e clareia na saída
        val alfaFundo = when {
            !vivo -> 1f
            tSai >= 0f -> (1f - (tSai - 0.12f) / 0.18f).coerceIn(0f, 1f)
            else -> (t / 0.1f).coerceIn(0f, 1f)
        }
        fundo.alpha = (alfaFundo * 255).toInt()
        c.drawRect(0f, 0f, width.toFloat(), height.toFloat(), fundo)

        // a geleia de cada número (0 = ainda não entrou ou já saiu)
        var tudoSaiu = true
        for (i in digitos.indices) {
            var sx = 1f
            var sy = 1f
            if (vivo) {
                val ti = t - i * ATRASO
                if (ti <= 0f) { tudoSaiu = false; sx = 0f; sy = 0f }
                else {
                    // entra crescendo, passa do ponto e treme achatando e esticando
                    val a = (ti / 0.16f).coerceIn(0f, 1f)
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
                        val p = ((tSai - (3 - i) * 0.03f) / 0.18f).coerceIn(0f, 1f)
                        if (p < 1f) tudoSaiu = false
                        sx *= 1f + 0.4f * p
                        sy *= 1f - p
                        if (p >= 1f) { sx = 0f; sy = 0f }
                    } else tudoSaiu = false
                }
            }
            escalas[i * 2] = sx
            escalas[i * 2 + 1] = sy
        }

        // a camada só é redesenhada quando algo mudou (a geleia parada não custa nada)
        val bm = camada
        val tc = tela
        if (bm != null && tc != null) {
            val nova = buildString {
                append(texto); append(ambiente)
                for (i in 0 until digitos.size * 2) { append(','); append((escalas[i] * 400).toInt()) }
            }
            if (nova != chave) {
                chave = nova
                bm.eraseColor(Color.TRANSPARENT)
                digitos.forEachIndexed { i, dg ->
                    val sx = escalas[i * 2]
                    val sy = escalas[i * 2 + 1]
                    if (sx <= 0.001f || sy <= 0.001f) return@forEachIndexed
                    tc.save()
                    tc.scale(sx, sy, dg.px, dg.py)
                    if (ambiente) tc.drawPath(dg.path, linhaAmb)
                    else { tc.drawPath(dg.path, contorno); tc.drawPath(dg.path, preench) }
                    tc.restore()
                }
                if (!ambiente) {
                    tc.drawRect(0f, 0f, bm.width.toFloat(), bm.height.toFloat(), sombra)
                    tc.drawRect(0f, 0f, bm.width.toFloat(), bm.height.toFloat(), brilho)
                }
            }
            c.drawBitmapMesh(bm, MALHA, MALHA, malha, 0, null, 0, malhaPaint)
        }

        // O dia (ou o descanso) numa linha em cima, longe dos números (2026-11-20l);
        // a bolinha laranja na borda esquerda. Antes: a bolha um
        // pouco à direita e abaixo do meio, o dia da semana em cima e o dia
        // embaixo, centrados no meio da tela; a bolinha laranja na borda
        // esquerda. No descanso, "DESCANSO" e o tempo que falta, na cor dele.
        val bx = ox + larg * 0.5f
        val by = oy + alt * 0.13f
        var esc = 1f
        if (vivo) {
            val tb = t - 0.25f
            esc = if (tb <= 0f) 0f else {
                val a = (tb / 0.2f).coerceIn(0f, 1f)
                a * (1f + 0.25f * exp(-5f * tb) * sin(15f * tb))
            }
            if (tSai >= 0f) esc *= (1f - tSai / 0.12f).coerceIn(0f, 1f)
        }
        if (esc > 0.01f) {
            c.save()
            c.scale(esc, esc, bx, by)
            // uma linha: "SEX. 20", ou "DESCANSO 0:45" na cor do descanso
            val extra = info?.invoke()
            val cima = (extra?.let { "DESCANSO" } ?: SEMANA[cal.get(Calendar.DAY_OF_WEEK) - 1]) + "  "
            val baixo = extra?.first ?: cal.get(Calendar.DAY_OF_MONTH).toString()
            textoDia.color = when { ambiente -> Cores.CINZA; extra != null -> extra.second; else -> Color.parseColor("#FFB36B") }
            textoInfo.color = when { ambiente -> Cores.CINZA; extra != null -> extra.second; else -> Color.WHITE }
            textoDia.textAlign = Paint.Align.LEFT
            textoInfo.textAlign = Paint.Align.LEFT
            val w1 = textoDia.measureText(cima)
            val w2 = textoInfo.measureText(baixo)
            val x0 = bx - (w1 + w2) / 2f
            c.drawText(cima, x0, by + lado * 0.02f, textoDia)
            c.drawText(baixo, x0 + w1, by + lado * 0.02f, textoInfo)
            c.restore()
        }

        // a bolinha laranja da borda esquerda, como no modelo: pulsa a cada segundo
        if (!ambiente && esc > 0.01f) {
            val ts = (agora - segEm) / 1000f
            val pulso = 1f + 0.45f * exp(-6f * ts)
            ponto.color = Cores.LARANJA
            ponto.alpha = (255 * min(1f, esc)).toInt()
            ponto.setShadowLayer(7f * d * pulso, 0f, 0f, Cores.LARANJA)
            c.drawCircle(ox + larg * 0.025f, oy + alt * 0.5f, lado * 0.017f * pulso, ponto)
            ponto.clearShadowLayer()
            ponto.alpha = 255
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
        // segurança: o dedo segurando mais que isto já não é para ver a hora
        const val LIMITE_MS = 60_000L
        // quanto segurar para a hora aparecer
        const val SEGURAR_MS = 380L
        // depois de soltar o dedo, a hora fica este tempo à vista (2026-11-20l,
        // o dono: "com o dedo na tela fica difícil ver a hora")
        const val FICA_MS = 2000L
        // Os quatro números inteiros dentro da tela (2026-11-20l, o dono com o
        // print do relógio: a versão que vazava da tela, como na máscara, não
        // deixava ler a hora). Conferido num protótipo em canvas com a fonte e
        // a esfera de verdade, com 14:57, 23:59 e 10:11.
        const val TAMANHO = 0.34f
        const val LARGURA = 1.15f
        const val INCLINACAO = 0.10f
        const val BORDA = 0.022f
        // a base dos números de cima e o topo dos de baixo, em frações da tela
        const val LINHA_CIMA = 0.49f
        const val LINHA_BAIXO = 0.535f
        const val ATRASO = 0.06f
        // a esfera: 0 é plano, 1 é a curva inteira de uma bola (mais que isto
        // aumenta o meio e corta os números na borda)
        const val ESFERA = 0.25f
        const val MALHA = 28
        // o itálico puxa a linha de baixo para a esquerda: ela vai um pouco à direita
        val COLUNAS = floatArrayOf(0.39f, 0.62f, 0.41f, 0.645f)
        val SEMANA = arrayOf("DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB.")
    }
}
