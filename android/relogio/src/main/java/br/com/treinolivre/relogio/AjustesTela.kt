package br.com.treinolivre.relogio

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

// Poupar a bateria (2026-11-21f, pedido do dono: "deixe as configurações sempre
// sugestivas; se der, configure sozinho; senão, abra a tela que preciso
// configurar"). A tela do treino apaga no tempo do relógio desde a 21e, e
// quem a acende é o próprio relógio. Dois ajustes do relógio fazem isso dar
// certo, e os dois moram em Configurações › Tela no Galaxy Watch:
//   1. Levantar o pulso para ativar (acender ao olhar)
//   2. Mostrar último app: Sempre (acender já no treino, não no mostrador)
// O que dá para ligar sozinho é ligado (aplicarSozinho, com a permissão
// WRITE_SECURE_SETTINGS que o celular dá pelo ADB ao instalar). Cada marca
// guarda esses ajustes com nomes próprios, nem sempre ao alcance de um app:
// o que não der, esta tela explica e abre os ajustes de Tela num toque.
class AjustesTela : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val feitos = aplicarSozinho(this)
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val largura = resources.displayMetrics.widthPixels
        val margem = (largura * (if (resources.configuration.isScreenRound) 0.15 else 0.06)).toInt()
        fun texto(tam: Float, cor: Int, negrito: Boolean, t: String) = TextView(this).apply {
            textSize = tam; setTextColor(cor); gravity = Gravity.CENTER; text = t
            if (negrito) setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(2), 0, dp(2))
        }
        fun botao(rotulo: String, cheio: Boolean, acao: () -> Unit) = Button(this).apply {
            text = rotulo; isAllCaps = false; textSize = 13f
            setTypeface(typeface, Typeface.BOLD); setTextColor(Color.WHITE)
            stateListAnimator = null; minHeight = dp(38); minimumHeight = dp(38)
            setPadding(dp(12), 0, dp(12), 0)
            background = if (cheio) GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Cores.VERDE, Cores.CIANO)).apply { cornerRadius = dp(20).toFloat() }
            else GradientDrawable().apply { cornerRadius = dp(20).toFloat(); setColor(Color.parseColor("#2A2A33")) }
            setOnClickListener { acao() }
        }
        val coluna = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(margem, margem, margem, margem)
        }
        coluna.addView(texto(15f, Cores.VERDE, true, "🔋 Poupar bateria"))
        coluna.addView(texto(11f, Color.WHITE, false, "A tela apaga sozinha no treino e acende quando você olha o pulso, já no Treino Livre."))
        if (feitos.isNotEmpty()) coluna.addView(texto(11f, Cores.VERDE, true, "✓ Liguei sozinho: " + feitos.joinToString(", ")))
        coluna.addView(texto(12f, Cores.OURO, true, "Em Tela, confira:"))
        coluna.addView(texto(11.5f, Color.WHITE, false, "1. Levantar o pulso para ativar: LIGADO\n2. Mostrar último app: SEMPRE"))
        val lp = { LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) } }
        coluna.addView(botao("⚙ Abrir os ajustes de Tela", true) { abrirTela(this) }, lp())
        coluna.addView(botao("✓ Já ajustei", false) {
            getSharedPreferences("relogio", MODE_PRIVATE).edit().putBoolean("telaAjustada", true).apply()
            finish()
        }, lp())
        coluna.addView(texto(9.5f, Cores.CINZA, false, "A Tela sempre ligada é opcional: desligada poupa mais."))
        val rolagem = ScrollView(this).apply { isVerticalScrollBarEnabled = false; setBackgroundColor(Color.BLACK); addView(coluna) }
        setContentView(rolagem)
    }

    companion object {
        // os ajustes de acender ao levantar o pulso que o Android e o Wear OS
        // conhecem pelo nome. Só os que JÁ existem no relógio (não cria chave
        // nova) e só os que estão desligados são mexidos.
        private val CANDIDATOS = listOf(
            Triple("secure", "wake_gesture_enabled", "Levantar o pulso"),
            Triple("global", "tilt_to_wake", "Levantar o pulso"),
        )

        fun temPermissao(c: Context) = c.checkSelfPermission("android.permission.WRITE_SECURE_SETTINGS") == PackageManager.PERMISSION_GRANTED

        fun aplicarSozinho(c: Context): List<String> {
            if (!temPermissao(c)) return emptyList()
            val feitos = linkedSetOf<String>()
            for ((onde, chave, nome) in CANDIDATOS) {
                try {
                    val cr = c.contentResolver
                    val atual = if (onde == "secure") Settings.Secure.getString(cr, chave) else Settings.Global.getString(cr, chave)
                    if (atual == null || atual == "1") continue
                    val ok = if (onde == "secure") Settings.Secure.putInt(cr, chave, 1) else Settings.Global.putInt(cr, chave, 1)
                    if (ok) { feitos.add(nome); android.util.Log.i("TreinoLivre", "ajuste ligado: $onde $chave") }
                } catch (e: Exception) { }
            }
            return feitos.toList()
        }

        // Os ajustes de Tela do relógio; sem eles, os ajustes gerais
        fun abrirTela(a: Activity) {
            for (acao in listOf(Settings.ACTION_DISPLAY_SETTINGS, Settings.ACTION_SETTINGS)) {
                try { a.startActivity(Intent(acao).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return } catch (e: Exception) { }
            }
        }

        fun ajustada(c: Context) = c.getSharedPreferences("relogio", Context.MODE_PRIVATE).getBoolean("telaAjustada", false)
    }
}
