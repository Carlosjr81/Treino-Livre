package br.com.treinolivre.relogio

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

// A tela do relógio: o exercício da vez, a série, a carga e as repetições com
// − e +, o ✓ Feito, e o descanso contando com +30 s, −15 s e Pular.
//
// O treino mora no celular (o Jarvis da tela travada, BolsoService): daqui só
// saem toques, e o painel volta de lá. Por isso cada ✓ do relógio vira uma
// série anotada no celular, com o descanso, o recorde e a voz de sempre.
class TelaRelogio : Activity(), DataClient.OnDataChangedListener {
    private val linha = Handler(Looper.getMainLooper())
    private var painel: JSONObject? = null
    // o que a pessoa ajustou no relógio para a série da vez
    private var chave = ""
    private var peso = 0.0
    private var reps = 0
    private var seg = 0
    private var esperando = false

    private lateinit var topo: TextView
    private lateinit var exNome: TextView
    private lateinit var serie: TextView
    private lateinit var blocoDescanso: LinearLayout
    private lateinit var relogio: TextView
    private lateinit var blocoSerie: LinearLayout
    private lateinit var linhaPeso: LinearLayout
    private lateinit var linhaReps: LinearLayout
    private lateinit var linhaSeg: LinearLayout
    private lateinit var txtPeso: TextView
    private lateinit var txtReps: TextView
    private lateinit var txtSeg: TextView
    private lateinit var feito: Button
    private lateinit var anterior: TextView
    private lateinit var depois: TextView
    private lateinit var navegar: LinearLayout
    private lateinit var aviso: TextView

    private val ROSA = Color.parseColor("#E1306C")
    private val VERDE = Color.parseColor("#4CD137")
    private val CINZA = Color.parseColor("#9A9AA5")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val largura = resources.displayMetrics.widthPixels
        // tela redonda: as bordas de cima e dos lados ficam livres
        val lado = (largura * 0.12).toInt()

        val caixa = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(lado, (largura * 0.14).toInt(), lado, (largura * 0.22).toInt())
        }
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false) = TextView(this).apply {
            textSize = tam
            setTextColor(cor)
            gravity = Gravity.CENTER
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        fun botao(rotulo: String, fundo: Int, tam: Float = 15f, acao: () -> Unit) = Button(this).apply {
            text = rotulo
            textSize = tam
            isAllCaps = false
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply { cornerRadius = dp(24).toFloat(); setColor(fundo) }
            minHeight = dp(44)
            minimumHeight = dp(44)
            setPadding(dp(6), 0, dp(6), 0)
            setOnClickListener { v -> v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY); acao() }
        }
        fun lp(fator: Float = 0f, w: Int = LinearLayout.LayoutParams.MATCH_PARENT) =
            LinearLayout.LayoutParams(if (fator > 0f) 0 else w, LinearLayout.LayoutParams.WRAP_CONTENT, fator).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) }
        val cinzaEscuro = Color.parseColor("#2A2A33")
        fun ajuste(valor: TextView, menos: () -> Unit, mais: () -> Unit) = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(botao("−", cinzaEscuro, 20f, menos), lp(1f))
            addView(valor, lp(1.6f))
            addView(botao("+", cinzaEscuro, 20f, mais), lp(1f))
        }

        topo = texto(12f, CINZA)
        exNome = texto(16f, negrito = true).apply { maxLines = 2 }
        serie = texto(13f, ROSA, true)
        caixa.addView(topo); caixa.addView(exNome); caixa.addView(serie)

        relogio = texto(40f, VERDE, true)
        blocoDescanso = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(texto(12f, CINZA).apply { text = "Descanso" })
            addView(relogio)
            addView(LinearLayout(this@TelaRelogio).apply {
                orientation = LinearLayout.HORIZONTAL
                addView(botao("−15 s", cinzaEscuro) { enviar("menos") }, lp(1f))
                addView(botao("+30 s", cinzaEscuro) { enviar("mais") }, lp(1f))
            })
            addView(botao("⏭ Pular descanso", ROSA) { enviar("pular") }, lp())
        }
        caixa.addView(blocoDescanso)

        txtPeso = texto(18f, negrito = true)
        txtReps = texto(18f, negrito = true)
        txtSeg = texto(18f, negrito = true)
        linhaPeso = ajuste(txtPeso, { mudarPeso(-1) }, { mudarPeso(1) })
        linhaReps = ajuste(txtReps, { reps = maxOf(0, reps - 1); mostrarValores() }, { reps = minOf(999, reps + 1); mostrarValores() })
        linhaSeg = ajuste(txtSeg, { seg = maxOf(0, seg - 5); mostrarValores() }, { seg = minOf(3600, seg + 5); mostrarValores() })
        feito = botao("✓ Feito", ROSA, 18f) {
            val p = painel ?: return@botao
            val j = JSONObject().put("a", "feito").put("ei", p.optInt("ei", -1))
            if (p.optBoolean("tempo")) j.put("sg", seg) else { j.put("r", reps); if (peso > 0) j.put("p", peso) }
            esperando = true
            mostrar()
            enviar(j)
        }
        blocoSerie = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(linhaPeso); addView(linhaReps); addView(linhaSeg)
            addView(feito, lp())
        }
        caixa.addView(blocoSerie)

        anterior = texto(12f, CINZA)
        depois = texto(12f, CINZA)
        caixa.addView(anterior); caixa.addView(depois)

        navegar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(botao("◀", cinzaEscuro) { enviar("anterior") }, lp(1f))
            addView(botao("↩", cinzaEscuro) { enviar("desfazer") }, lp(1f))
            addView(botao("▶", cinzaEscuro) { enviar("proximo") }, lp(1f))
        }
        caixa.addView(navegar)
        caixa.addView(texto(10f, CINZA).apply { text = "◀ ▶ trocam o exercício · ↩ desfaz a última série" })

        aviso = texto(13f, Color.WHITE)
        caixa.addView(aviso)

        val rolagem = ScrollView(this).apply {
            setBackgroundColor(Color.BLACK)
            isVerticalScrollBarEnabled = false
            addView(caixa)
        }
        setContentView(rolagem)
        // a coroa (ou a moldura que gira, no Galaxy) rola a tela
        rolagem.requestFocus()
        mostrar()
    }

    override fun onResume() {
        super.onResume()
        val dados = Wearable.getDataClient(this)
        dados.addListener(this)
        // o último painel que o celular mandou (abre na hora, mesmo antes da resposta)
        dados.getDataItems(Uri.parse("wear://*/treino/estado")).addOnSuccessListener { buf ->
            try {
                var melhor: JSONObject? = null
                var t = -1L
                for (item in buf) {
                    val m = DataMapItem.fromDataItem(item).dataMap
                    val tt = m.getLong("t")
                    if (tt > t) { t = tt; melhor = try { JSONObject(m.getString("json") ?: "") } catch (e: Exception) { null } }
                }
                if (melhor != null && painel == null) receber(melhor)
            } finally { buf.release() }
        }
        enviar("estado")
        linha.post(tique)
    }

    override fun onPause() {
        Wearable.getDataClient(this).removeListener(this)
        linha.removeCallbacks(tique)
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onPause()
    }

    override fun onDataChanged(eventos: DataEventBuffer) {
        var ultimo: String? = null
        for (ev in eventos) {
            if (ev.type == DataEvent.TYPE_CHANGED && ev.dataItem.uri.path == "/treino/estado") {
                ultimo = DataMapItem.fromDataItem(ev.dataItem).dataMap.getString("json")
            }
        }
        val j = try { if (ultimo != null) JSONObject(ultimo) else null } catch (e: Exception) { null } ?: return
        runOnUiThread { receber(j) }
    }

    private fun receber(j: JSONObject) {
        painel = j
        esperando = false
        aviso.text = ""
        val nova = j.optString("uid") + ":" + j.optInt("si", -1)
        if (nova != chave) {
            chave = nova
            peso = j.optDouble("peso", 0.0)
            reps = j.optInt("reps", 0)
            seg = j.optInt("seg", 0)
        }
        mostrar()
    }

    private fun mudarPeso(sentido: Int) {
        val p = painel ?: return
        val passo = p.optDouble("passo", 2.5).takeIf { it > 0 } ?: 2.5
        peso = maxOf(0.0, Math.round((peso + sentido * passo) * 100) / 100.0)
        mostrarValores()
    }

    private fun num(v: Double): String {
        val r = Math.round(v * 100) / 100.0
        return if (r == Math.floor(r)) r.toLong().toString() else r.toString().replace('.', ',')
    }

    private fun mostrarValores() {
        txtPeso.text = if (peso > 0) num(peso) + " kg" else "sem carga"
        txtReps.text = "$reps reps"
        txtSeg.text = "$seg s"
    }

    private fun descansoAte(): Long {
        val p = painel ?: return 0L
        val ate = p.optLong("descansoAte", 0L)
        return if (ate > System.currentTimeMillis()) ate else 0L
    }

    private fun mostrar() {
        val p = painel
        val ativo = p != null && p.optBoolean("ativo", false)
        val mostra = { v: View, sim: Boolean -> v.visibility = if (sim) View.VISIBLE else View.GONE }
        if (p == null || !ativo || p.optBoolean("carregando") || p.optBoolean("fim")) {
            topo.text = if (p != null && ativo) p.optString("treino") else "Treino Livre"
            exNome.text = when {
                p == null -> "Procurando o celular…"
                !ativo -> "Comece o treino no celular"
                p.optBoolean("carregando") -> "Ligando o Jarvis no celular…"
                else -> "Treino completo! 🎉"
            }
            serie.text = ""
            aviso.text = when {
                p == null -> "Abra o Treino Livre no celular, pelo ícone do app."
                !ativo -> "Abra o Treino Livre pelo ícone do app no celular e comece uma ficha: o relógio acompanha o Jarvis da tela travada (🔒), que liga sozinho a cada série marcada."
                p.optBoolean("fim") -> "Toque em Finalizar treino no celular."
                else -> ""
            }
            mostra(blocoDescanso, false); mostra(blocoSerie, false); mostra(navegar, p != null && ativo && p.optBoolean("fim"))
            anterior.text = ""; depois.text = ""
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            return
        }
        val feitas = p.optInt("feitas"); val total = p.optInt("total")
        val nomeTreino = p.optString("treino")
        topo.text = (if (nomeTreino.isNotEmpty()) "$nomeTreino · " else "") + "$feitas/$total séries"
        exNome.text = p.optString("ex")
        serie.text = if (p.optBoolean("drop")) "↓ Drop" else "Série " + p.optInt("n") + " de " + p.optInt("de")
        val descansando = descansoAte() > 0
        mostra(blocoDescanso, descansando)
        val tempo = p.optBoolean("tempo")
        val cardio = p.optBoolean("cardio")
        mostra(blocoSerie, true)
        mostra(linhaPeso, !tempo && !cardio)
        mostra(linhaReps, !tempo && !cardio)
        mostra(linhaSeg, tempo && !cardio)
        mostra(feito, !cardio)
        feito.isEnabled = !esperando
        feito.text = if (esperando) "Anotando…" else "✓ Feito"
        mostrarValores()
        val ant = p.optString("ant")
        anterior.text = if (cardio) "Aeróbico: anote no celular." else if (ant.isNotEmpty()) "Anterior: $ant" else ""
        val prox = p.optString("prox")
        depois.text = if (prox.isNotEmpty()) "Depois: $prox" else ""
        mostra(navegar, true)
        // no descanso a tela fica acesa: é onde a pessoa olha o relógio
        if (descansando) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        atualizarRelogio()
    }

    private var estavaDescansando = false
    private fun atualizarRelogio() {
        val ate = descansoAte()
        if (ate <= 0L) {
            if (estavaDescansando) { estavaDescansando = false; mostrar() }
            return
        }
        estavaDescansando = true
        val resta = ((ate - System.currentTimeMillis() + 999) / 1000).toInt()
        relogio.text = (resta / 60).toString() + ":" + (resta % 60).toString().padStart(2, '0')
    }

    private val tique = object : Runnable {
        override fun run() {
            atualizarRelogio()
            linha.postDelayed(this, 500L)
        }
    }

    private fun enviar(acao: String) = enviar(JSONObject().put("a", acao))

    private fun enviar(j: JSONObject) {
        val dados = j.toString().toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            if (nos.isEmpty()) {
                esperando = false
                aviso.text = "Celular desconectado. Confira o Bluetooth e o app Galaxy Wearable."
                mostrar()
                return@addOnSuccessListener
            }
            nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/acao", dados) }
            // sem resposta em 6 s, o celular não recebeu
            if (esperando) linha.postDelayed({
                if (esperando) { esperando = false; aviso.text = "O celular não respondeu. Abra o Treino Livre nele."; mostrar() }
            }, 6000L)
        }.addOnFailureListener {
            esperando = false
            aviso.text = "Este relógio não alcança o celular (Google Play Services)."
            mostrar()
        }
    }
}
