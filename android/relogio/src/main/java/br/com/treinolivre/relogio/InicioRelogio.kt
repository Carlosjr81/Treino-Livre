package br.com.treinolivre.relogio

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Bundle
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import androidx.activity.ComponentActivity
import org.json.JSONObject
import kotlin.math.min
import kotlin.math.sin

// O ícone do Treino Livre no relógio (2026-11-25a, pedido do dono: "quando
// acionar o app pelo relógio, mostre uma tela dividida ao meio para escolher se
// é treino ou se é comida e água"). Em cima o TREINO, embaixo COMIDA & ÁGUA.
// Quando o celular abre o treino no relógio (relogio-tela), a tela do treino
// abre direto, sem passar por aqui.
class InicioRelogio : ComponentActivity() {
    private lateinit var tela: TelaDividida

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val emAndamento = try {
            val j = getSharedPreferences("relogio", MODE_PRIVATE).getString("ultimoPainel", null)?.let { JSONObject(it) }
            j != null && j.optBoolean("ativo") && !j.optBoolean("fim") && System.currentTimeMillis() - j.optLong("recebido", 0L) < 3 * 3600_000L
        } catch (e: Exception) { false }
        val letreiro: Typeface? = try { resources.getFont(R.font.letreiro) } catch (e: Exception) { null }
        tela = TelaDividida(this, emAndamento, letreiro) { metade ->
            AlertaRelogio.vibrar(this, longArrayOf(0, 25))
            val destino = if (metade == 0) TelaRelogio::class.java else ComidaRelogio::class.java
            startActivity(Intent(this, destino))
            finish()
        }
        setContentView(tela)
    }

    override fun onResume() { super.onResume(); tela.vivo = true }
    override fun onPause() { super.onPause(); tela.vivo = false }
}

class TelaDividida(c: Context, private val treinando: Boolean, private val fonte: Typeface?, private val aoEscolher: (Int) -> Unit) : View(c) {
    var vivo = false
        set(v) { field = v; if (v) invalidate() }
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val txt = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; color = Color.WHITE }
    private val sombra = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; color = Color.BLACK; style = Paint.Style.STROKE; strokeJoin = Paint.Join.ROUND }
    private var apertado = -1
    private val inicio = SystemClock.uptimeMillis()
    private val caminho = Path()

    override fun onDraw(cv: Canvas) {
        val w = width.toFloat(); val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val t = (SystemClock.uptimeMillis() - inicio) / 1000f
        val meio = h / 2f
        cv.drawColor(Cores.FUNDO_JOGO)
        // as duas metades, cada uma no degradê dela; a escolhida acende
        metade(cv, 0f, meio, w, intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO), apertado == 0, t)
        metade(cv, meio, h, w, intArrayOf(Color.parseColor("#1DD1A1"), Color.parseColor("#35E0F0"), Color.parseColor("#2E7BFF")), apertado == 1, t + 1.3f)
        // os efeitos de LED passando (os do resumo), fracos
        Telao.desenhar(cv, w, h, t, 0.35f, false, ((t % 4f) / 4f))
        // a costura do meio, uma faixa de luz que respira
        val r = min(w, h)
        p.shader = LinearGradient(0f, 0f, w, 0f, intArrayOf(0x00FFFFFF, Color.WHITE, 0x00FFFFFF), null, Shader.TileMode.CLAMP)
        p.alpha = (150 + 100 * sin(t * 3f)).toInt().coerceIn(0, 255)
        cv.drawRect(0f, meio - r * 0.008f, w, meio + r * 0.008f, p)
        p.shader = null
        if (fonte != null) { txt.typeface = fonte; sombra.typeface = fonte }
        escrever(cv, "\u{1F3CB}️", w / 2f, meio * 0.42f, r * 0.11f, false)
        escrever(cv, "TREINO", w / 2f, meio * 0.72f, r * 0.115f, true)
        if (treinando) {
            txt.typeface = Typeface.DEFAULT_BOLD
            txt.textSize = r * 0.05f
            txt.color = Cores.OURO
            cv.drawText("● em andamento", w / 2f, meio * 0.88f, txt)
            txt.color = Color.WHITE
            if (fonte != null) txt.typeface = fonte
        }
        escrever(cv, "COMIDA & ÁGUA", w / 2f, meio + (h - meio) * 0.36f, r * 0.085f, true)
        escrever(cv, "\u{1F4A7}\u{1F34E}", w / 2f, meio + (h - meio) * 0.66f, r * 0.1f, false)
        if (vivo) postInvalidateDelayed(40L)
    }

    private fun metade(cv: Canvas, y0: Float, y1: Float, w: Float, cores: IntArray, aceso: Boolean, t: Float) {
        val desl = (sin(t * 0.9f) * w * 0.25f)
        p.shader = LinearGradient(-w * 0.3f + desl, y0, w * 1.3f + desl, y1, cores, null, Shader.TileMode.MIRROR)
        p.alpha = if (aceso) 255 else 200
        cv.drawRect(0f, y0, w, y1, p)
        p.shader = null
        // escurece a borda de fora, para a metade parecer um botão redondo
        p.color = Color.BLACK
        p.alpha = if (aceso) 30 else 90
        cv.drawRect(0f, y0, w, y1, p)
        p.alpha = 255
    }

    private fun escrever(cv: Canvas, s: String, x: Float, y: Float, tam: Float, contorno: Boolean) {
        txt.textSize = tam
        if (contorno) {
            sombra.textSize = tam
            sombra.strokeWidth = tam * 0.18f
            cv.save(); cv.skew(-0.12f, 0f); cv.translate(y * 0.12f, 0f)
            cv.drawText(s, x, y + tam * 0.08f, sombra)
            cv.drawText(s, x, y, txt)
            cv.restore()
        } else cv.drawText(s, x, y, txt)
    }

    override fun onTouchEvent(e: MotionEvent): Boolean {
        val qual = if (e.y < height / 2f) 0 else 1
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> { apertado = qual; invalidate() }
            MotionEvent.ACTION_UP -> { val q = apertado; apertado = -1; invalidate(); if (q == qual) aoEscolher(qual) }
            MotionEvent.ACTION_CANCEL -> { apertado = -1; invalidate() }
        }
        return true
    }
}
