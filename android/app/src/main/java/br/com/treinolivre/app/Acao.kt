package br.com.treinolivre.app

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator

// Botões com ação (pedido do dono, 2026-11-20i: "mais ação nos botões"): o
// toque afunda o botão, ele volta com mola e o aparelho dá um toque de
// vibração; o principal da tela pulsa devagar, para chamar o dedo. Tudo por
// cima do clique de sempre: o toque continua indo para o botão.
object Acao {
    @SuppressLint("ClickableViewAccessibility")
    fun vivo(v: View) {
        v.setOnTouchListener { b, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    pulsos[b]?.forEach { it.pause() }
                    b.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                    b.animate().scaleX(0.92f).scaleY(0.92f).setDuration(80L).setInterpolator(DecelerateInterpolator()).start()
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
                    b.animate().scaleX(1f).scaleY(1f).setDuration(360L).setInterpolator(OvershootInterpolator(4f))
                        .withEndAction { pulsos[b]?.forEach { it.resume() } }.start()
            }
            false
        }
    }

    // os pulsos de cada botão: param enquanto o dedo aperta (os dois mexem na escala)
    private val pulsos = java.util.WeakHashMap<View, List<ObjectAnimator>>()

    // a respiração do botão principal: cresce 4% e volta, sem parar
    fun pulsar(v: View) {
        pulsos[v] = listOf("scaleX", "scaleY").map { p ->
            ObjectAnimator.ofFloat(v, p, 1f, 1.04f, 1f).apply {
                duration = 1600L; repeatCount = ValueAnimator.INFINITE; startDelay = 600L
                start()
            }
        }
    }
}
