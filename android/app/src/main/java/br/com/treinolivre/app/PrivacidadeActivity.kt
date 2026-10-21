package br.com.treinolivre.app

import android.graphics.Color
import android.os.Bundle
import android.text.method.LinkMovementMethod
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity

// O Health Connect mostra esta tela quando a pessoa pergunta por que o app
// quer os dados de saúde. É a mesma política de privacidade.html, do site.
class PrivacidadeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val texto = TextView(this).apply {
            setTextColor(Color.parseColor("#111111"))
            textSize = 16f
            setPadding(48, 64, 48, 64)
            movementMethod = LinkMovementMethod.getInstance()
            text = """
Treino Livre — o que acontece com os seus dados de saúde

O que o app lê no Health Connect: passos, distância, calorias em atividade, frequência cardíaca (inclusive em repouso), sono, peso e as atividades gravadas por outros apps, dos últimos 30 dias (peso: 120 dias).

Para quê: mostrar esses números na aba Saúde, usar o seu peso na conta de calorias do treino e pôr no histórico o batimento que o relógio gravou durante cada treino.

O que o app grava no Health Connect: só os treinos que você fez no Treino Livre (nome, início, fim e tipo), para o Samsung Health e o Google Fit também os enxergarem.

Para onde vão: para lugar nenhum. O Treino Livre não tem servidor nem conta. Os números ficam só neste celular, no armazenamento do navegador Chrome, junto dos seus treinos. Nada é vendido, compartilhado ou usado para propaganda.

Como desligar: no Health Connect, em Permissões do app → Treino Livre, você tira qualquer permissão a qualquer momento. Apagar os dados do Chrome para o site apaga também a cópia que ficou nele.

Política completa: ${Site.ENDERECO}privacidade.html
            """.trimIndent()
            android.text.util.Linkify.addLinks(this, android.text.util.Linkify.WEB_URLS)
        }
        setContentView(ScrollView(this).apply { addView(texto) })
    }
}
