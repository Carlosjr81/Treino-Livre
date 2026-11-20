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
    private val bolha = Paint(Paint.ANTI_ALIAS_FLAG)
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
    // A pressão ao soltar (2026-11-20m, pedido do dono: "ação e animação para
    // eu ver as horas antes de voltar ao treino"): onde o dedo saiu, a esfera
    // afunda e volta balançando como geleia, e a tela toda estica e achata até
    // parar. A malha viva é a da esfera mais essa deformação, refeita a cada
    // quadro só enquanto ela dura.
    private var malhaViva = FloatArray(0)
    // A esfera de água (2026-11-20r, o dono: "uma esfera muito gelatinosa,
    // quase água, onde o número está projetado em cima e se move"). Os números
    // são uma figura colada numa bola de água: a água desliza (os números
    // correm sobre a curva e se apertam perto da borda), estica e achata
    // devagar, e cada toque solta ondas que andam pela superfície. O braço
    // mexe a água (o acelerômetro, pela Gelatina), e o pulso inclinado a faz
    // pender. Molas moles e pouco amortecidas: ~1 balanço por segundo, que
    // leva uns 3 s para acalmar.
    private var aguaX = 0f
    private var aguaY = 0f
    private var vAguaX = 0f
    private var vAguaY = 0f
    private var estica = 0f
    private var vEstica = 0f
    private var pendeX = 0f
    private var pendeY = 0f
    // as ondas: x, y (frações do raio, do meio), quando (s) e força
    private val ondas = FloatArray(ONDAS * 4)
    private var proxOnda = 0
    private var quadroEm = 0L
    private var soltouEm = 0L
    private var pressX = 0f
    private var pressY = 0f
    private val fio = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val caixaFio = RectF()
    private var chave = ""
    private val escalas = FloatArray(8)

    init { visibility = GONE }

    // Segurou: mostra, e fica enquanto o dedo estiver na tela.
    fun mostrar() {
        if (ambiente) return
        if (mostrando && saindoEm == 0L) return
        soltouEm = 0L
        mostrando = true
        inicio = SystemClock.uptimeMillis()
        saindoEm = 0L
        chave = ""
        visibility = VISIBLE
        // a bola de água chega caindo e balançando, com uma onda do meio
        aguaX = 0f; aguaY = -0.06f; vAguaX = 0f; vAguaY = 0.9f
        estica = 0f; vEstica = 1.3f
        ondas.fill(0f); quadroEm = 0L
        onda(0f, 0f, 0.8f)
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
        soltouEm = 0L
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
    fun soltar(x: Float = width / 2f, y: Float = height / 2f) {
        if (!mostrando || saindoEm != 0L) return
        removeCallbacks(sumir)
        postDelayed(sumir, FICA_MS)
        soltouEm = SystemClock.uptimeMillis()
        pressX = x; pressY = y
        // o dedo saiu: a água afunda ali, solta ondas e foge do ponto
        val r = lado / 2f
        if (r > 0f) {
            val nx = (x - width / 2f) / r
            val ny = (y - height / 2f) / r
            onda(nx, ny, 1.3f)
            vAguaX -= nx * 0.7f; vAguaY -= ny * 0.7f
            vEstica += 0.9f
        }
        postInvalidateOnAnimation()
    }

    // O braço mexeu (a Gelatina lê o acelerômetro): a água fica para trás e
    // balança. ix, iy: o empurrão na tela; ie: o quanto estica.
    fun empurrar(ix: Float, iy: Float, ie: Float) {
        if (!mostrando || ambiente) return
        vAguaX += ix * 2.4f; vAguaY += iy * 2.4f; vEstica += ie * 2f
        val forte = hypot(ix, iy)
        if (forte > 0.12f) onda(-ix / forte * 0.5f, -iy / forte * 0.5f, (forte * 2.5f).coerceAtMost(1.2f))
    }

    // o pulso inclinado: a água pende para baixo (x, y de -1 a 1, na tela)
    fun gravidade(x: Float, y: Float) { pendeX = x; pendeY = y }

    private fun onda(x: Float, y: Float, forca: Float) {
        val k = proxOnda * 4
        ondas[k] = x; ondas[k + 1] = y
        ondas[k + 2] = SystemClock.uptimeMillis() / 1000f
        ondas[k + 3] = forca
        proxOnda = (proxOnda + 1) % ONDAS
    }

    // a física da água, um passo por quadro
    private fun passoAgua(agora: Long) {
        val dt = if (quadroEm == 0L) 0.016f else ((agora - quadroEm) / 1000f).coerceIn(0.001f, 0.05f)
        quadroEm = agora
        val tx = pendeX * PENDE_AGUA
        val ty = pendeY * PENDE_AGUA
        vAguaX += (-38f * (aguaX - tx) - 1.5f * vAguaX) * dt
        vAguaY += (-38f * (aguaY - ty) - 1.5f * vAguaY) * dt
        aguaX = (aguaX + vAguaX * dt).coerceIn(-0.3f, 0.3f)
        aguaY = (aguaY + vAguaY * dt).coerceIn(-0.3f, 0.3f)
        vEstica += (-55f * estica - 1.4f * vEstica) * dt
        estica = (estica + vEstica * dt).coerceIn(-0.13f, 0.13f)
    }

    // A bola de água num instante: a figura dos números desliza sobre a curva
    // (o ponto d da figura vai para a esfera em d + água), estica e achata, e
    // as ondas empurram a superfície para fora e para dentro, a partir de
    // onde nasceram.
    private fun deformar(agora: Long): FloatArray {
        if (malhaViva.size != malha.size) malhaViva = FloatArray(malha.size)
        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2f
        val cy = h / 2f
        val raio = if (redonda) lado / 2f else hypot(w, h) / 2f
        val ts = agora / 1000f
        val n = MALHA
        var k = 0
        for (j in 0..n) for (i in 0..n) {
            // o ponto da figura, deslocado pela água
            var dx = (w * i / n - cx) / raio + aguaX
            var dy = (h * j / n - cy) / raio + aguaY
            // colado na bola
            val dist = sqrt(dx * dx + dy * dy)
            if (dist > 0.0001f && dist < 1f) {
                val f = (dist + ESFERA * (sin(dist * PI.toFloat() / 2f) - dist)) / dist
                dx *= f; dy *= f
            }
            // estica e achata
            dx *= 1f + estica
            dy *= 1f - estica
            // as ondas
            var o = 0
            while (o < ONDAS * 4) {
                val forca = ondas[o + 3]
                if (forca > 0f) {
                    val tau = ts - ondas[o + 2]
                    if (tau in 0f..3.2f) {
                        val rx = dx - ondas[o]
                        val ry = dy - ondas[o + 1]
                        val r = sqrt(rx * rx + ry * ry) + 0.0001f
                        // a frente da onda anda 1,1 raio por segundo
                        val frente = ((1.1f * tau - r) / 0.25f).coerceIn(0f, 1f)
                        val amp = forca * exp(-1.3f * tau) * exp(-0.7f * r) * frente
                        // o anel que corre, e o afundar no ponto de onde nasceu
                        val anel = 0.045f * amp * sin(9f * r - 10f * tau)
                        val afunda = -0.16f * forca * exp(-2.6f * tau) * kotlin.math.cos(6.5f * tau) * exp(-r * r / 0.1f)
                        val m = anel + afunda
                        dx += rx / r * m
                        dy += ry / r * m
                    }
                }
                o += 4
            }
            malhaViva[k++] = cx + dx * raio
            malhaViva[k++] = cy + dy * raio
        }
        return malhaViva
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
        numero.textSize = lado * 0.6f
        contorno.strokeWidth = lado * BORDA * 2f
        linhaAmb.strokeWidth = 1.6f * d
        preench.shader = LinearGradient(ox, oy, ox + larg, oy + alt,
            intArrayOf(Color.parseColor("#FFB36B"), Cores.LARANJA, Cores.ROSA, Color.parseColor("#B05BFF")),
            floatArrayOf(0f, 0.3f, 0.65f, 1f), Shader.TileMode.CLAMP)
        textoDia.textSize = lado * 0.038f
        textoInfo.textSize = lado * 0.08f
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
            // Igual ao modelo azul (2026-11-20n): cada número na altura de um
            // quadrante (a Bodoni tem algarismos de alturas diferentes: o 7 desce,
            // o 6 sobe; aqui todos ficam da mesma altura), encostado na cruz preta
            // do meio, vazando pelas bordas da tela.
            val emCima = i < 2
            val esq = i % 2 == 0
            val k = if (b.height() > 0f) alt * ALTURA / b.height() else 1f
            val m = android.graphics.Matrix()
            m.setScale(k, k, b.left, b.top)
            p.transform(m)
            p.computeBounds(b, true)
            val dx = if (esq) ox + larg * CRUZ_ESQ - b.right else ox + larg * CRUZ_DIR - b.left
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
            val tt = if (soltouEm > 0L && vivo) (agora - soltouEm) / 1000f else -1f
            // à vista, a água se mexe o tempo todo; parada (ambiente), a bola fixa
            val pontos = if (vivo) { passoAgua(agora); deformar(agora) } else malha
            c.drawBitmapMesh(bm, MALHA, MALHA, pontos, 0, null, 0, malhaPaint)
            // o fio da borda: o tempo que falta para o treino voltar
            if (tt >= 0f && tSai < 0f) {
                val resta = (1f - (agora - soltouEm) / FICA_MS.toFloat()).coerceIn(0f, 1f)
                val m = lado * 0.022f
                fio.strokeWidth = lado * 0.018f
                fio.shader = preench.shader
                if (redonda) caixaFio.set(ox + m, oy + m, ox + lado - m, oy + lado - m)
                else caixaFio.set(m, m, width - m, height - m)
                c.drawArc(caixaFio, -90f, 360f * resta, false, fio)
            }
        }

        // O dia (ou o descanso) numa linha em cima, longe dos números (2026-11-20l);
        // a bolinha laranja na borda esquerda. Antes: a bolha um
        // pouco à direita e abaixo do meio, o dia da semana em cima e o dia
        // embaixo, centrados no meio da tela; a bolinha laranja na borda
        // esquerda. No descanso, "DESCANSO" e o tempo que falta, na cor dele.
        val bx = ox + larg * 0.573f
        val by = oy + alt * 0.708f
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
            // a bolha do modelo: o dia da semana em cima e o dia embaixo; no
            // descanso, "DESCANSO" e o tempo que falta, na cor dele
            val raio = lado * 0.108f
            if (ambiente) {
                bolhaBorda.color = Cores.CINZA
                c.drawCircle(bx, by, raio, bolhaBorda)
            } else {
                bolha.color = Color.argb(185, 34, 34, 42)
                c.drawCircle(bx, by, raio, bolha)
            }
            val extra = info?.invoke()
            val cima = extra?.let { "DESCANSO" } ?: SEMANA[cal.get(Calendar.DAY_OF_WEEK) - 1]
            val baixo = extra?.first ?: cal.get(Calendar.DAY_OF_MONTH).toString()
            textoDia.color = when { ambiente -> Cores.CINZA; extra != null -> extra.second; else -> Color.parseColor("#FFB36B") }
            textoInfo.color = when { ambiente -> Cores.CINZA; extra != null -> extra.second; else -> Color.WHITE }
            textoDia.textAlign = Paint.Align.CENTER
            textoInfo.textAlign = Paint.Align.CENTER
            c.drawText(cima, bx, by - lado * 0.031f, textoDia)
            c.drawText(baixo, bx, by + lado * 0.072f, textoInfo)
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
        const val FICA_MS = 3500L
        // Igual ao modelo azul que o dono mandou (2026-11-20n: "preencha melhor
        // a tela"): quatro números enormes, retos, cada um num quadrante, com
        // uma cruz preta fina no meio, vazando pelas bordas. Conferido num
        // protótipo em canvas com a fonte e a esfera de verdade (10:27, 23:59,
        // 08:48). A 20l os pôs pequenos e inteiros; a 20f, grandes mas sem
        // alinhar pela cruz, saíam cortados até não se ler.
        // a altura de cada número, em fração da tela (20p: 0,48 cortava demais
        // os números na geleia; 0,44, e a geleia com metade da força)
        const val ALTURA = 0.44f
        // largura e o itálico desfeito (a Bodoni é itálica; positivo endireita)
        const val LARGURA = 1.3f
        const val INCLINACAO = 0.2f
        const val BORDA = 0.012f
        // a cruz: a base dos números de cima, o topo dos de baixo, e as bordas
        // dos da esquerda e da direita, em frações da tela
        const val LINHA_CIMA = 0.488f
        const val LINHA_BAIXO = 0.512f
        const val CRUZ_ESQ = 0.482f
        const val CRUZ_DIR = 0.51f
        const val ATRASO = 0.06f
        // a esfera: 0 é plano, 1 é a curva inteira de uma bola
        const val ESFERA = 0.2f
        const val MALHA = 36
        // as ondas ao mesmo tempo, e quanto a água pende com o pulso inclinado
        const val ONDAS = 4
        const val PENDE_AGUA = 0.07f
        val SEMANA = arrayOf("DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB.")
    }
}
