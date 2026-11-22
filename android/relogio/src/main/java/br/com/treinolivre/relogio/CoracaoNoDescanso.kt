package br.com.treinolivre.relogio

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager

// O coração no descanso (2026-11-22a, pedido do dono: "o relógio mostra o
// batimento entre as séries e avisa quando voltou"). O sensor do próprio
// relógio, sem passar pelo celular. Liga só com a tela do treino aberta e um
// treino ativo, e desliga com ela.
//
// A régua é a da própria pessoa naquele treino:
// - a base é o batimento mais baixo visto no treino (a média de 5 leituras);
// - o pico é o mais alto dos 20 s antes de o descanso começar (a série);
// - "pronto" é voltar a 35% do caminho entre a base e o pico (no mínimo
//   base + 10), e só conta depois de 15 s de descanso.
// Não é exame nem diz quando é seguro treinar: só mostra o batimento e quando
// ele voltou perto do de antes da série.
class CoracaoNoDescanso(private val ctx: Context, private val aoPronto: () -> Unit) : SensorEventListener {
    private val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private var ligado = false
    var bpm = 0
        private set
    var medidoEm = 0L
        private set
    private var media = 0.0
    private var base = 0.0
    private val recentes = ArrayDeque<Pair<Long, Double>>()
    private var descIni = 0L
    private var pico = 0.0
    var alvo = 0
        private set
    var prontoEm = 0L
        private set
    // segundos que o coração levou para voltar no último descanso (0: não voltou ou não mediu)
    var ultimaRecuperacao = 0
        private set

    fun temPermissao() = ctx.checkSelfPermission(android.Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED

    fun ligar() {
        if (ligado || sm == null || !temPermissao()) return
        val s = sm.getDefaultSensor(Sensor.TYPE_HEART_RATE) ?: return
        ligado = try { sm.registerListener(this, s, SensorManager.SENSOR_DELAY_NORMAL) } catch (e: Exception) { false }
    }

    fun desligar() {
        if (!ligado) return
        try { sm?.unregisterListener(this) } catch (e: Exception) { }
        ligado = false
    }

    // leitura com mais de 10 s não vale (o relógio saiu do pulso)
    fun fresco(agora: Long) = bpm > 0 && agora - medidoEm < 10_000L

    override fun onSensorChanged(e: SensorEvent) {
        if (e.sensor.type != Sensor.TYPE_HEART_RATE) return
        if (e.accuracy == SensorManager.SENSOR_STATUS_NO_CONTACT || e.accuracy == SensorManager.SENSOR_STATUS_UNRELIABLE) return
        val v = e.values.firstOrNull()?.toDouble() ?: return
        if (v < 35 || v > 230) return
        val agora = System.currentTimeMillis()
        media = if (media <= 0) v else media * 0.6 + v * 0.4
        bpm = Math.round(media).toInt()
        medidoEm = agora
        recentes.addLast(agora to media)
        while (recentes.isNotEmpty() && agora - recentes.first().first > 25_000L) recentes.removeFirst()
        if (recentes.size >= 5 && (base <= 0 || media < base)) base = media
        conferir(agora)
    }

    override fun onAccuracyChanged(s: Sensor?, a: Int) {}

    fun inicioDescanso(agora: Long) {
        descIni = agora
        prontoEm = 0L
        pico = recentes.filter { agora - it.first <= 20_000L }.maxOfOrNull { it.second } ?: media
        alvo = if (base > 0 && pico > base) Math.round(maxOf(base + 10, base + (pico - base) * 0.35)).toInt() else 0
    }

    fun fimDescanso() {
        ultimaRecuperacao = if (prontoEm > 0 && descIni > 0) ((prontoEm - descIni) / 1000).toInt().coerceIn(1, 600) else 0
        descIni = 0L
        alvo = 0
    }

    // a recuperação do descanso que acabou vai junto do ✓ e é usada uma vez
    fun tirarRecuperacao(): Int { val r = ultimaRecuperacao; ultimaRecuperacao = 0; return r }

    private fun conferir(agora: Long) {
        if (descIni <= 0 || prontoEm > 0 || alvo <= 0) return
        if (agora - descIni < 15_000L) return
        if (media <= alvo) { prontoEm = agora; aoPronto() }
    }
}
