package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.view.Choreographer
import android.view.MotionEvent
import android.widget.FrameLayout
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin

// A tela inteira do relógio é uma esfera de gelatina (2026-11-20q, pedido do
// dono: "todo o layout nesse mesmo estilo de esfera gelatinosa, e ela sofrer
// variação pelo acelerômetro: chacoalha, balança, sofre pressão").
//
// - A esfera: o conteúdo é curvado como numa bola (a mesma conta da hora,
//   HoraGeleia), com a borda mais escura e um brilho no alto à esquerda.
// - A gravidade: inclinar o pulso faz o meio da gelatina "pender" para baixo;
//   a borda fica presa.
// - O acelerômetro: mexer o braço de repente faz a gelatina ficar para trás
//   pela inércia e voltar balançando, esticando e achatando.
// - A pressão: cada toque afunda a gelatina no ponto do dedo, e ela volta.
//
// O desenho curvo é um shader (AGSL), do Android 13 em diante (Wear OS 4: os
// Galaxy Watch 6, 7 e 8). No Wear OS 3 a mesma física move e estica a tela
// sem curvar. O toque é corrigido pela mesma conta: o botão continua onde ele
// aparece. Tela apagada (ambiente): sem nada disso, e o sensor desligado.
class Gelatina(c: Context) : FrameLayout(c), SensorEventListener, Choreographer.FrameCallback {
    companion object {
        // a curva da bola (0 é plano); menor que a da hora: aqui há texto
        const val ESFERA = 0.13f
        // quanto o meio pende com o pulso inclinado, em frações do raio
        const val PENDE = 0.035f
        const val MAX_DESLOCA = 0.12f
        const val MAX_ESTICA = 0.07f

        private const val SHADER = """
uniform shader conteudo;
uniform float2 centro;
uniform float raio;
uniform float esfera;
uniform float2 estica;
uniform float2 desloca;
uniform float2 aperto;
uniform float forca;
uniform float luz;

half4 main(float2 p) {
    float2 d = (p - centro) / raio;
    d = d / estica;
    float L = length(d);
    if (L > 0.0001 && L < 1.0) {
        float s = L;
        for (int i = 0; i < 3; i++) {
            float f = s + esfera * (sin(s * 1.5708) - s) - L;
            float df = 1.0 + esfera * (1.5708 * cos(s * 1.5708) - 1.0);
            s = s - f / df;
        }
        d = d * (s / L);
    }
    float borda = 1.0 - min(L * L, 1.0);
    d = d - desloca * borda;
    float2 q = d - aperto;
    float g = exp(-dot(q, q) / 0.09);
    d = aperto + q * (1.0 + forca * g);
    float4 cor = float4(conteudo.eval(centro + d * raio));
    if (L < 1.0) {
        float sombra = 1.0 - 0.28 * luz * pow(L, 6.0);
        float2 h = d - float2(-0.42, -0.5);
        float brilho = 0.10 * luz * exp(-dot(h, h) / 0.07);
        cor = float4(cor.rgb * sombra + float3(brilho * cor.a), cor.a);
    }
    return half4(cor);
}
"""
    }

    private val sensores = c.getSystemService(SensorManager::class.java)
    private val acel: Sensor? = try { sensores?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) } catch (e: Exception) { null }
    private val shader: Any? = if (Build.VERSION.SDK_INT >= 33) try { RuntimeShader(SHADER) } catch (e: Throwable) { null } else null
    private val curvo get() = shader != null

    var ambiente = false
        set(v) { field = v; if (v) { parar(); zerar() } else if (ligado) comecar() }
    private var ligado = false

    // a gravidade lida (m/s², nos eixos do sensor)
    private var gx = 0f; private var gy = 0f; private var gz = 9.81f
    private var temGravidade = false
    // o meio da gelatina (frações do raio, eixos da tela) e a velocidade
    private var px = 0f; private var py = 0f; private var vx = 0f; private var vy = 0f
    // esticar na largura e achatar na altura (e o contrário)
    private var w = 0f; private var vw = 0f
    // a pressão do dedo
    private var f = 0f; private var vf = 0f; private var ax = 0f; private var ay = 0f
    private var ultimo = 0L
    private var rodando = false
    // quem mais sente o braço (a hora de água): empurrão na tela (x, y, esticar)
    // e a gravidade na tela (de -1 a 1)
    var aoTranco: ((Float, Float, Float) -> Unit)? = null
    var aoInclinar: ((Float, Float) -> Unit)? = null

    init { clipChildren = false }

    fun ligar() {
        ligado = true
        if (!ambiente) comecar()
    }

    fun desligar() {
        ligado = false
        parar()
    }

    private fun comecar() {
        try { if (acel != null) sensores?.registerListener(this, acel, SensorManager.SENSOR_DELAY_GAME) } catch (e: Exception) { }
        animar()
    }

    private fun parar() {
        try { sensores?.unregisterListener(this) } catch (e: Exception) { }
        if (rodando) { Choreographer.getInstance().removeFrameCallback(this); rodando = false }
    }

    private fun zerar() {
        px = 0f; py = 0f; vx = 0f; vy = 0f; w = 0f; vw = 0f; f = 0f; vf = 0f
        temGravidade = false
        aplicar()
    }

    private fun animar() {
        if (rodando || ambiente) return
        rodando = true; ultimo = 0L
        Choreographer.getInstance().postFrameCallback(this)
    }

    override fun onAccuracyChanged(s: Sensor?, a: Int) {}

    override fun onSensorChanged(e: SensorEvent) {
        if (ambiente) return
        val x = e.values[0]; val y = e.values[1]; val z = e.values[2]
        if (!temGravidade) { gx = x; gy = y; gz = z; temGravidade = true; animar(); return }
        gx += (x - gx) * 0.08f; gy += (y - gy) * 0.08f; gz += (z - gz) * 0.08f
        // o que sobra da gravidade é o braço se mexendo
        val lx = x - gx; val ly = y - gy; val lz = z - gz
        val forte = hypot(hypot(lx, ly), lz)
        if (forte > 1.2f) {
            // a gelatina fica para trás do movimento (inércia); y da tela é o
            // contrário do y do sensor
            val ganho = 0.0045f * min(forte, 25f) / forte
            vx -= lx * ganho * forte / 3f
            vy += ly * ganho * forte / 3f
            vw += (abs(lx) - abs(ly) + lz * 0.5f) * 0.006f
            aoTranco?.invoke(-lx * ganho * forte / 3f, ly * ganho * forte / 3f, (abs(lx) - abs(ly) + lz * 0.5f) * 0.006f)
            animar()
        }
        aoInclinar?.invoke(-gx / 9.81f, gy / 9.81f)
        // inclinou o pulso: o meio passa a pender para outro lado
        if (abs(alvoX() - px) > 0.004f || abs(alvoY() - py) > 0.004f) animar()
    }

    private fun alvoX() = if (temGravidade) (-gx / 9.81f * PENDE) else 0f
    private fun alvoY() = if (temGravidade) (gy / 9.81f * PENDE) else 0f

    override fun doFrame(nanos: Long) {
        rodando = false
        if (ambiente) return
        val agora = nanos / 1_000_000L
        val dt = if (ultimo == 0L) 0.016f else ((agora - ultimo) / 1000f).coerceIn(0.001f, 0.05f)
        ultimo = agora
        // molas sub-amortecidas: balançam umas vezes e param
        val tx = alvoX(); val ty = alvoY()
        vx += (-60f * (px - tx) - 3f * vx) * dt
        vy += (-60f * (py - ty) - 3f * vy) * dt
        px = (px + vx * dt).coerceIn(-MAX_DESLOCA, MAX_DESLOCA)
        py = (py + vy * dt).coerceIn(-MAX_DESLOCA, MAX_DESLOCA)
        vw += (-80f * w - 3f * vw) * dt
        w = (w + vw * dt).coerceIn(-MAX_ESTICA, MAX_ESTICA)
        vf += (-90f * f - 3.5f * vf) * dt
        f = (f + vf * dt).coerceIn(-0.45f, 0.45f)
        aplicar()
        val quieto = abs(px - tx) < 0.0015f && abs(py - ty) < 0.0015f && abs(vx) < 0.01f && abs(vy) < 0.01f &&
            abs(w) < 0.0015f && abs(vw) < 0.01f && abs(f) < 0.003f && abs(vf) < 0.02f
        if (!quieto) { rodando = true; Choreographer.getInstance().postFrameCallback(this) }
    }

    private fun aplicar() {
        if (width == 0) return
        if (curvo && Build.VERSION.SDK_INT >= 33) {
            if (ambiente) { setRenderEffect(null); return }
            val sh = shader as RuntimeShader
            val r = min(width, height) / 2f
            sh.setFloatUniform("centro", width / 2f, height / 2f)
            sh.setFloatUniform("raio", r)
            sh.setFloatUniform("esfera", ESFERA)
            sh.setFloatUniform("estica", 1f + w, 1f - w)
            sh.setFloatUniform("desloca", px, py)
            sh.setFloatUniform("aperto", ax, ay)
            sh.setFloatUniform("forca", f)
            sh.setFloatUniform("luz", 1f)
            try { setRenderEffect(RenderEffect.createRuntimeShaderEffect(sh, "conteudo")) } catch (e: Throwable) { }
        } else {
            // sem o shader: a mesma física, movendo e esticando a tela
            val r = min(width, height) / 2f
            translationX = px * r * 0.6f
            translationY = py * r * 0.6f
            scaleX = 1f + w - f * 0.08f
            scaleY = 1f - w - f * 0.08f
        }
    }

    override fun onSizeChanged(nw: Int, nh: Int, ow: Int, oh: Int) {
        super.onSizeChanged(nw, nh, ow, oh)
        aplicar()
    }

    // O ponto do conteúdo que aparece em (x, y) na tela: a mesma conta do
    // shader, sem a pressão (que dura um instante).
    private fun fonte(x: Float, y: Float): FloatArray {
        val r = min(width, height) / 2f
        val cx = width / 2f; val cy = height / 2f
        var dx = (x - cx) / r / (1f + w)
        var dy = (y - cy) / r / (1f - w)
        val l = hypot(dx, dy)
        if (l > 0.0001f && l < 1f) {
            var s = l
            repeat(3) {
                val fs = s + ESFERA * (sin(s * 1.5708f) - s) - l
                val df = 1f + ESFERA * (1.5708f * cos(s * 1.5708f) - 1f)
                s -= fs / df
            }
            dx *= s / l; dy *= s / l
        }
        val borda = 1f - min(l * l, 1f)
        dx -= px * borda; dy -= py * borda
        return floatArrayOf(cx + dx * r, cy + dy * r)
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ambiente || !curvo || width == 0) {
            if (!ambiente && ev.actionMasked == MotionEvent.ACTION_DOWN) apertar(ev.x, ev.y)
            return super.dispatchTouchEvent(ev)
        }
        if (ev.actionMasked == MotionEvent.ACTION_DOWN) apertar(ev.x, ev.y)
        val p = fonte(ev.x, ev.y)
        val e = MotionEvent.obtain(ev)
        e.setLocation(p[0], p[1])
        val r = super.dispatchTouchEvent(e)
        e.recycle()
        return r
    }

    // o dedo afunda a gelatina, e ela volta balançando
    private fun apertar(x: Float, y: Float) {
        val r = min(width, height) / 2f
        if (r <= 0f) return
        ax = (x - width / 2f) / r; ay = (y - height / 2f) / r
        vf += 3.2f
        vw += 0.25f
        animar()
    }

    // chacoalhão de fora (uma série feita, um recorde): o mesmo de um tranco no braço
    fun sacudir(forca: Float = 1f) {
        if (ambiente) return
        vw += 0.9f * forca
        vy += 0.5f * forca
        animar()
    }
}
