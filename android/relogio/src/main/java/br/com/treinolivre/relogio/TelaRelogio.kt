package br.com.treinolivre.relogio

import androidx.activity.ComponentActivity
import androidx.wear.ambient.AmbientLifecycleObserver
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.text.SpannableString
import android.text.Spanned
import android.text.style.RelativeSizeSpan
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

// A tela do relógio: o exercício da vez, a série, a carga e as repetições com
// − e +, o ✓ Feito, e o descanso contando com +30 s, −15 s e Pular.
//
// O treino mora no celular (o Jarvis da tela travada, BolsoService): daqui só
// saem toques, e o painel volta de lá. Por isso cada ✓ do relógio vira uma
// série anotada no celular, com o descanso, o recorde e a voz de sempre.
//
// O visual (2026-11-13a, pedido do dono: "chame a atenção de todos"): o anel
// colorido da borda (Palco), botões em degradê, o clarão e o "✓ SÉRIE FEITA" a
// cada série, o dourado do recorde e do treino completo.
class TelaRelogio : ComponentActivity(), DataClient.OnDataChangedListener, MessageClient.OnMessageReceivedListener {
    private val linha = Handler(Looper.getMainLooper())
    // Relato do dono (2026-11-11k): a tela do relógio apagava e o app ia para
    // o segundo plano. Com o modo ambiente o app fica na frente, em preto e
    // cinza, e acende de novo no toque; o descanso continua contando.
    private var ambiente = false
    private val ambienteObs by lazy {
        AmbientLifecycleObserver(this, object : AmbientLifecycleObserver.AmbientLifecycleCallback {
            override fun onEnterAmbient(ambientDetails: AmbientLifecycleObserver.AmbientDetails) {
                ambiente = true
                palco.ambiente = true
                frente.ambiente = true
                celebra.animate().cancel()
                celebra.alpha = 0f
                linha.removeCallbacks(tique)
                mostrar()
            }
            override fun onUpdateAmbient() { atualizarRelogio() }
            override fun onExitAmbient() {
                ambiente = false
                palco.ambiente = false
                frente.ambiente = false
                mostrar()
                linha.post(tique)
            }
        })
    }
    private var painel: JSONObject? = null
    // o que a pessoa ajustou no relógio para a série da vez
    private var chave = ""
    private var peso = 0.0
    private var reps = 0
    private var seg = 0
    private var esperando = false
    // o ✓ que acabou de sair passava do recorde: a comemoração é dourada
    private var enviouRecorde = false
    // o tamanho do descanso, para o anel esvaziar na proporção certa
    private var descAteVisto = 0L
    private var descTotal = 0L
    private var ultimoSegundo = -1

    private lateinit var palco: Palco
    private lateinit var frente: Palco
    private lateinit var celebra: TextView
    private lateinit var marca: TextView
    private lateinit var topo: TextView
    private lateinit var exNome: TextView
    private lateinit var serie: TextView
    private lateinit var blocoDescanso: LinearLayout
    private lateinit var rotuloDescanso: TextView
    private lateinit var botoesDescanso: LinearLayout
    private lateinit var relogio: TextView
    private lateinit var blocoSerie: LinearLayout
    private lateinit var linhaPeso: LinearLayout
    private lateinit var linhaReps: LinearLayout
    private lateinit var linhaSeg: LinearLayout
    private lateinit var txtPeso: TextView
    private lateinit var txtReps: TextView
    private lateinit var txtSeg: TextView
    private lateinit var txtRec: TextView
    private lateinit var feito: Button
    private lateinit var fundoFeito: Drawable
    private lateinit var fundoRecorde: Drawable
    private lateinit var anterior: TextView
    private lateinit var depois: TextView
    private lateinit var navegar: LinearLayout
    private lateinit var dica: TextView
    private lateinit var aviso: TextView
    private lateinit var atualizar: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(ambienteObs)
        // a atividade em andamento (TreinoNoPulso) mostra uma notificação:
        // no Wear OS 4+ ela precisa da permissão
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1)
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val largura = resources.displayMetrics.widthPixels
        // tela redonda: as bordas ficam para o anel
        val lado = (largura * 0.13).toInt()

        val caixa = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(lado, (largura * 0.13).toInt(), lado, (largura * 0.24).toInt())
        }
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false) = TextView(this).apply {
            textSize = tam
            setTextColor(cor)
            gravity = Gravity.CENTER
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        fun comToque(fundo: Drawable): Drawable = RippleDrawable(ColorStateList.valueOf(0x55FFFFFF), fundo, null)
        fun pilulaFundo(cores: IntArray): Drawable = comToque(GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, cores).apply { cornerRadius = dp(30).toFloat() })
        fun botao(rotulo: String, fundo: Drawable, tam: Float = 15f, acao: () -> Unit) = Button(this).apply {
            text = rotulo
            textSize = tam
            isAllCaps = false
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            background = fundo
            stateListAnimator = null
            minHeight = dp(46)
            minimumHeight = dp(46)
            setPadding(dp(6), 0, dp(6), 0)
            setOnClickListener { v -> v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY); acao() }
        }
        fun pilula(rotulo: String, cores: IntArray, tam: Float = 15f, acao: () -> Unit) = botao(rotulo, pilulaFundo(cores), tam, acao)
        fun contorno(rotulo: String, cor: Int, tam: Float = 15f, acao: () -> Unit) = botao(rotulo,
            comToque(GradientDrawable().apply { cornerRadius = dp(30).toFloat(); setColor(0x22FFFFFF); setStroke(dp(2), cor) }), tam, acao)
        fun lp(fator: Float = 0f, w: Int = LinearLayout.LayoutParams.MATCH_PARENT) =
            LinearLayout.LayoutParams(if (fator > 0f) 0 else w, LinearLayout.LayoutParams.WRAP_CONTENT, fator).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) }
        fun ajuste(valor: TextView, menos: () -> Unit, mais: () -> Unit) = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(contorno("−", Cores.ROSA, 22f, menos), lp(1f))
            addView(valor, lp(1.7f))
            addView(contorno("+", Cores.ROSA, 22f, mais), lp(1f))
        }
        val fioCinza = 0x55FFFFFF

        // a marca, em degradê: é o que se lê de longe no pulso
        marca = texto(10f, Color.WHITE, true).apply {
            text = "TREINO LIVRE"
            letterSpacing = 0.25f
            addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> pintarMarca() }
        }
        topo = texto(11f, Cores.CINZA)
        exNome = texto(17f, negrito = true).apply { maxLines = 2; setPadding(0, dp(2), 0, dp(2)) }
        serie = texto(11f, Color.WHITE, true).apply {
            letterSpacing = 0.12f
            setPadding(dp(12), dp(3), dp(12), dp(3))
            background = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Cores.ROSA, Cores.ROXO)).apply { cornerRadius = dp(20).toFloat() }
        }
        caixa.addView(marca); caixa.addView(topo); caixa.addView(exNome)
        caixa.addView(serie, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0, dp(2), 0, dp(4)) })

        relogio = texto(48f, Cores.VERDE, true)
        rotuloDescanso = texto(11f, Cores.CINZA, true).apply { text = "DESCANSO"; letterSpacing = 0.25f }
        botoesDescanso = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(LinearLayout(this@TelaRelogio).apply {
                orientation = LinearLayout.HORIZONTAL
                addView(contorno("−15 s", Cores.CIANO) { enviar("menos") }, lp(1f))
                addView(contorno("+30 s", Cores.CIANO) { enviar("mais") }, lp(1f))
            })
            addView(pilula("⏭ Pular descanso", intArrayOf(Cores.VERDE, Cores.CIANO)) { enviar("pular") }, lp())
        }
        blocoDescanso = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(rotuloDescanso)
            addView(relogio)
            addView(botoesDescanso)
        }
        caixa.addView(blocoDescanso)

        txtPeso = texto(24f, negrito = true)
        txtReps = texto(24f, negrito = true)
        txtSeg = texto(24f, negrito = true)
        txtRec = texto(11f, Cores.CINZA, true)
        linhaPeso = ajuste(txtPeso, { mudarPeso(-1) }, { mudarPeso(1) })
        linhaReps = ajuste(txtReps, { reps = maxOf(0, reps - 1); mostrarValores() }, { reps = minOf(999, reps + 1); mostrarValores() })
        linhaSeg = ajuste(txtSeg, { seg = maxOf(0, seg - 5); mostrarValores() }, { seg = minOf(3600, seg + 5); mostrarValores() })
        fundoFeito = pilulaFundo(intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO))
        fundoRecorde = pilulaFundo(intArrayOf(Cores.OURO, Cores.LARANJA, Cores.ROSA))
        feito = botao("✓ FEITO", fundoFeito, 20f) {
            val p = painel ?: return@botao
            val j = JSONObject().put("a", "feito").put("ei", p.optInt("ei", -1))
            val tempo = p.optBoolean("tempo")
            if (tempo) j.put("sg", seg) else { j.put("r", reps); if (peso > 0) j.put("p", peso) }
            val rec = p.optDouble("rec", 0.0)
            enviouRecorde = !tempo && rec > 0 && peso > rec
            esperando = true
            mostrar()
            enviar(j)
        }.apply { minHeight = dp(56); minimumHeight = dp(56); letterSpacing = 0.08f }
        blocoSerie = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(linhaPeso); addView(linhaReps); addView(linhaSeg)
            addView(txtRec)
            addView(feito, lp())
        }
        caixa.addView(blocoSerie)

        anterior = texto(12f, Cores.CINZA)
        depois = texto(12f, Cores.CINZA)
        caixa.addView(anterior); caixa.addView(depois)

        navegar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(contorno("◀", fioCinza) { enviar("anterior") }, lp(1f))
            addView(contorno("↩", fioCinza) { enviar("desfazer") }, lp(1f))
            addView(contorno("▶", fioCinza) { enviar("proximo") }, lp(1f))
        }
        caixa.addView(navegar)
        dica = texto(10f, Cores.CINZA).apply { text = "◀ ▶ trocam o exercício · ↩ desfaz a última série" }
        caixa.addView(dica)

        aviso = texto(13f, Color.WHITE)
        caixa.addView(aviso)
        // o celular tem versão nova do app do relógio (2026-11-13b): um toque
        atualizar = pilula("⬆ Atualizar o app", intArrayOf(Cores.OURO, Cores.LARANJA)) {
            startActivity(android.content.Intent(this, PreparaAtualizacao::class.java))
        }.apply { visibility = View.GONE }
        caixa.addView(atualizar, lp())

        val rolagem = ScrollView(this).apply {
            isVerticalScrollBarEnabled = false
            addView(caixa)
        }
        palco = Palco(this)
        frente = Palco(this, true)
        // a comemoração: por cima de tudo, sem pegar toque
        celebra = texto(30f, Color.WHITE, true).apply {
            alpha = 0f
            setShadowLayer(dp(10).toFloat(), 0f, 0f, Color.BLACK)
        }
        val tudo = FrameLayout.LayoutParams.MATCH_PARENT
        val raiz = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            addView(palco, FrameLayout.LayoutParams(tudo, tudo))
            addView(rolagem, FrameLayout.LayoutParams(tudo, tudo))
            addView(frente, FrameLayout.LayoutParams(tudo, tudo))
            addView(celebra, FrameLayout.LayoutParams(tudo, tudo))
        }
        setContentView(raiz)
        // a coroa (ou a moldura que gira, no Galaxy) rola a tela
        rolagem.requestFocus()
        mostrar()
    }

    private fun pintarMarca() {
        if (ambiente || marca.width == 0) { marca.paint.shader = null; marca.invalidate(); return }
        val larg = marca.paint.measureText(marca.text.toString())
        val ini = (marca.width - larg) / 2f
        marca.paint.shader = LinearGradient(ini, 0f, ini + larg, 0f,
            intArrayOf(Cores.LARANJA, Cores.ROSA, Cores.ROXO), null, Shader.TileMode.CLAMP)
        marca.invalidate()
    }

    override fun onResume() {
        super.onResume()
        palco.vivo = true
        frente.vivo = true
        val dados = Wearable.getDataClient(this)
        dados.addListener(this)
        Wearable.getMessageClient(this).addListener(this)
        enviarVersao()
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
        if (!ambiente) linha.post(tique)
    }

    override fun onPause() {
        palco.vivo = false
        frente.vivo = false
        Wearable.getDataClient(this).removeListener(this)
        Wearable.getMessageClient(this).removeListener(this)
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

    // A versão: o relógio diz a dele, o celular responde com a dele. Celular
    // mais novo (o app do relógio sai junto com o do celular) = ⬆ Atualizar.
    private fun minhaVersao(): Long = try {
        packageManager.getPackageInfo(packageName, 0).longVersionCode - 1_000_000L
    } catch (e: Exception) { 0L }

    private fun enviarVersao() {
        val dados = (minhaVersao() + 1_000_000L).toString().toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/versao", dados) }
        }
    }

    override fun onMessageReceived(m: MessageEvent) {
        if (m.path != "/treino/celular") return
        val v = String(m.data, Charsets.UTF_8).trim().toLongOrNull() ?: 0L
        getSharedPreferences("relogio", MODE_PRIVATE).edit().putLong("celular", v).apply()
        runOnUiThread { mostrarAtualizar() }
    }

    private fun mostrarAtualizar() {
        val cel = getSharedPreferences("relogio", MODE_PRIVATE).getLong("celular", 0L)
        val meu = minhaVersao()
        atualizar.visibility = if (!ambiente && cel > 0 && meu > 0 && cel > meu) View.VISIBLE else View.GONE
    }

    private fun receber(j: JSONObject) {
        val antes = painel
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
        // a série entrou no celular (do relógio, da voz ou do ✓ de lá): festa no pulso
        if (antes != null && antes.optBoolean("ativo") && j.optBoolean("ativo") && !antes.optBoolean("carregando")) {
            if (!antes.optBoolean("fim") && j.optBoolean("fim")) celebrar(TREINO_COMPLETO)
            else if (j.optInt("feitas") > antes.optInt("feitas")) celebrar(if (enviouRecorde) RECORDE else SERIE)
            if (j.optInt("feitas") != antes.optInt("feitas")) enviouRecorde = false
        }
    }

    private fun celebrar(tipo: Int) {
        if (ambiente) return
        val cor = when (tipo) { RECORDE -> Cores.OURO; TREINO_COMPLETO -> Cores.VERDE; else -> Cores.ROSA }
        frente.flash(cor)
        celebra.text = when (tipo) {
            RECORDE -> "🏆\nRECORDE!"
            TREINO_COMPLETO -> "🎉\nTREINO\nCOMPLETO!"
            else -> "✓\nSÉRIE FEITA"
        }
        celebra.setTextColor(if (tipo == SERIE) Color.WHITE else cor)
        celebra.animate().cancel()
        celebra.alpha = 0f; celebra.scaleX = 0.3f; celebra.scaleY = 0.3f
        celebra.animate().alpha(1f).scaleX(1f).scaleY(1f).setStartDelay(0L).setDuration(380L)
            .setInterpolator(OvershootInterpolator(2.5f))
            .withEndAction {
                celebra.animate().alpha(0f).scaleX(1.25f).scaleY(1.25f)
                    .setStartDelay(if (tipo == SERIE) 500L else 1300L).setDuration(350L)
                    .setInterpolator(AccelerateInterpolator()).start()
            }.start()
        try {
            val vib = getSystemService(Vibrator::class.java)
            vib?.vibrate(when (tipo) {
                RECORDE -> VibrationEffect.createWaveform(longArrayOf(0, 90, 70, 90, 70, 240), -1)
                TREINO_COMPLETO -> VibrationEffect.createWaveform(longArrayOf(0, 200, 100, 200, 100, 400), -1)
                else -> VibrationEffect.createOneShot(70L, VibrationEffect.DEFAULT_AMPLITUDE)
            })
        } catch (e: Exception) { }
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

    // o número grande e a unidade pequena: "80 kg"
    private fun comUnidade(valor: String, unidade: String): CharSequence {
        val s = SpannableString(valor + unidade)
        s.setSpan(RelativeSizeSpan(0.5f), valor.length, s.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        return s
    }

    private fun mostrarValores() {
        txtPeso.text = if (peso > 0) comUnidade(num(peso), " kg") else "sem carga"
        txtReps.text = comUnidade("$reps", " reps")
        txtSeg.text = comUnidade("$seg", " s")
        val p = painel
        val rec = p?.optDouble("rec", 0.0) ?: 0.0
        val tempo = p?.optBoolean("tempo") == true
        val novo = !tempo && rec > 0 && peso > rec
        txtRec.visibility = if (!tempo && rec > 0) View.VISIBLE else View.GONE
        txtRec.text = if (novo) "🏆 NOVO RECORDE! (era " + num(rec) + " kg)" else "🏆 Recorde: " + num(rec) + " kg"
        txtRec.setTextColor(if (novo) Cores.OURO else Cores.CINZA)
        feito.background = if (novo) fundoRecorde else fundoFeito
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
        pintarMarca()
        mostrarAtualizar()
        marca.setTextColor(if (ambiente) Cores.CINZA else Color.WHITE)
        mostra(serie, false)
        if (p == null || !ativo || p.optBoolean("carregando") || p.optBoolean("fim")) {
            topo.text = if (p != null && ativo) p.optString("treino") else ""
            exNome.text = when {
                p == null -> "Procurando o celular…"
                !ativo -> "Comece o treino no celular"
                p.optBoolean("carregando") -> "Ligando o Jarvis no celular…"
                else -> "Treino completo! 🎉"
            }
            exNome.setTextColor(if (p != null && ativo && p.optBoolean("fim") && !ambiente) Cores.OURO else Color.WHITE)
            aviso.text = when {
                p == null -> "Abra o Treino Livre no celular, pelo ícone do app."
                !ativo -> "Abra o Treino Livre pelo ícone do app no celular e comece uma ficha: o relógio acompanha o Jarvis da tela travada (🔒), que liga sozinho a cada série marcada."
                p.optBoolean("fim") -> "Toque em Finalizar treino no celular."
                else -> ""
            }
            when {
                p == null || p.optBoolean("carregando") -> palco.procurando()
                !ativo -> palco.parado()
                else -> palco.completo()
            }
            mostra(blocoDescanso, false); mostra(blocoSerie, false)
            mostra(navegar, p != null && ativo && p.optBoolean("fim") && !ambiente)
            mostra(dica, false)
            anterior.text = ""; depois.text = ""
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            if (p != null && (!ativo || p.optBoolean("fim"))) TreinoNoPulso.desligar(this)
            else if (p != null && ativo) TreinoNoPulso.ligar(this)
            return
        }
        TreinoNoPulso.ligar(this)
        val feitas = p.optInt("feitas"); val total = p.optInt("total")
        // só o progresso: o nome do treino quebrava em duas linhas, e a de cima
        // sumia na borda da tela redonda
        topo.text = "$feitas de $total séries"
        exNome.text = p.optString("ex")
        exNome.setTextColor(Color.WHITE)
        serie.text = if (p.optBoolean("drop")) "↓ DROP" else "SÉRIE " + p.optInt("n") + " DE " + p.optInt("de")
        mostra(serie, !ambiente)
        val descansando = descansoAte() > 0
        if (!descansando) palco.treino(feitas, total)
        mostra(blocoDescanso, descansando)
        mostra(botoesDescanso, !ambiente)
        val tempo = p.optBoolean("tempo")
        val cardio = p.optBoolean("cardio")
        mostra(blocoSerie, true)
        mostra(linhaPeso, !tempo && !cardio)
        mostra(linhaReps, !tempo && !cardio)
        mostra(linhaSeg, tempo && !cardio)
        mostra(feito, !cardio)
        feito.isEnabled = !esperando
        feito.alpha = if (esperando) 0.6f else 1f
        feito.text = if (esperando) "Anotando…" else "✓ FEITO"
        mostrarValores()
        if (cardio) txtRec.visibility = View.GONE
        val ant = p.optString("ant")
        anterior.text = if (cardio) "Aeróbico: anote no celular." else if (ant.isNotEmpty()) "Anterior: $ant" else ""
        val prox = p.optString("prox")
        depois.text = if (prox.isNotEmpty()) "Depois: $prox" else ""
        mostra(navegar, !ambiente)
        mostra(dica, !ambiente)
        if (ambiente) { mostra(blocoSerie, false); anterior.text = ""; depois.text = "" }
        // no descanso a tela fica acesa: é onde a pessoa olha o relógio
        if (descansando) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        atualizarRelogio()
    }

    // o +30 s alonga o anel em vez de reenchê-lo; um descanso novo começa cheio
    private fun anotarTotal(ate: Long, agora: Long) {
        if (ate == descAteVisto) return
        descTotal = if (descAteVisto > agora && descTotal > 0) maxOf(1000L, descTotal + (ate - descAteVisto))
            else maxOf(1000L, ate - agora)
        descAteVisto = ate
    }

    private var estavaDescansando = false
    private fun atualizarRelogio() {
        val ate = descansoAte()
        if (ate <= 0L) {
            descAteVisto = 0L
            if (estavaDescansando) { estavaDescansando = false; mostrar() }
            return
        }
        estavaDescansando = true
        val agora = System.currentTimeMillis()
        anotarTotal(ate, agora)
        val resta = ((ate - agora + 999) / 1000).toInt()
        // no ambiente a tela só é redesenhada uma vez por minuto
        relogio.text = if (ambiente) "~" + ((resta + 59) / 60) + " min" else (resta / 60).toString() + ":" + (resta % 60).toString().padStart(2, '0')
        val cor = when {
            ambiente -> Color.WHITE
            resta <= 3 -> Cores.VERMELHO
            resta <= 10 -> Cores.AMARELO
            else -> Cores.VERDE
        }
        relogio.setTextColor(cor)
        rotuloDescanso.setTextColor(if (ambiente) Cores.CINZA else cor)
        palco.descanso(((ate - agora).toFloat() / descTotal).coerceIn(0f, 1f), resta)
        if (!ambiente && resta != ultimoSegundo) {
            ultimoSegundo = resta
            // os 3 últimos segundos pulsam
            if (resta in 1..3) {
                relogio.animate().cancel()
                relogio.scaleX = 1.35f; relogio.scaleY = 1.35f
                relogio.animate().scaleX(1f).scaleY(1f).setStartDelay(0L).setDuration(380L)
                    .setInterpolator(AccelerateInterpolator()).start()
            }
        }
    }

    private val tique = object : Runnable {
        override fun run() {
            atualizarRelogio()
            linha.postDelayed(this, 250L)
        }
    }

    private fun enviar(acao: String) = enviar(JSONObject().put("a", acao))

    private fun enviar(j: JSONObject) {
        val dados = j.toString().toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            if (nos.isEmpty()) {
                esperando = false
                aviso.text = "Celular desconectado. Confira o Bluetooth e o app do relógio no celular (Galaxy Wearable, Pixel Watch ou Wear OS)."
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

    companion object {
        private const val SERIE = 1
        private const val RECORDE = 2
        private const val TREINO_COMPLETO = 3
    }
}
