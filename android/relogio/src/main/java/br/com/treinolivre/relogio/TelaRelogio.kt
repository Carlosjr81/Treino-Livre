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
import android.view.MotionEvent
import android.view.ViewConfiguration
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
// Sem o celular (2026-11-17b, a bateria dele acabou no meio do treino): com a
// cópia do treino que veio no último painel, o relógio segue sozinho
// (SemCelular), vibra no fim do descanso e entrega o que anotou quando o
// celular voltar (/treino/sem-celular).
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
                // tela apagada: a hora fica à vista, parada e só no contorno
                hora.fixarAmbiente(true)
                linha.removeCallbacks(tique)
                mostrar()
            }
            override fun onUpdateAmbient() { atualizarRelogio(); hora.invalidate() }
            override fun onExitAmbient() {
                ambiente = false
                palco.ambiente = false
                frente.ambiente = false
                hora.fixarAmbiente(false)
                mostrar()
                linha.post(tique)
            }
        })
    }
    private var painel: JSONObject? = null
    // o treino sem o celular, e a cópia que o celular mandou por último
    private var semCel: SemCelular? = null
    private var copia: JSONObject? = null
    // o toque que foi ao celular e ainda espera resposta (feito, terminar)
    private var aguardando: JSONObject? = null
    private val prefs by lazy { getSharedPreferences("relogio", MODE_PRIVATE) }
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
    // a hora com um toque (HoraGeleia), por cima de tudo
    private lateinit var hora: HoraGeleia
    private lateinit var raizTela: FrameLayout
    private lateinit var marca: TextView
    private lateinit var topo: TextView
    private lateinit var exNome: TextView
    private lateinit var serie: TextView
    private lateinit var blocoDescanso: LinearLayout
    private lateinit var rotuloDescanso: TextView
    private lateinit var botoesDescanso: LinearLayout
    // os fundos que mudam de cor com o descanso (2026-11-18c: "as cores
    // combinando com o layout"): os contornos do −15/+30, o Pular e o selo
    private val fundosContorno = mutableListOf<GradientDrawable>()
    private var fundoPular: GradientDrawable? = null
    private var fundoSerie: GradientDrawable? = null
    private var corPintada = 0
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
    private lateinit var terminar: Button
    private lateinit var continuar: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(ambienteObs)
        semCel = SemCelular.guardado(prefs.getString("semCelular", null))
        copia = try { prefs.getString("copia", null)?.let { JSONObject(it) } } catch (e: Exception) { null }
        // a atividade em andamento (TreinoNoPulso) mostra uma notificação:
        // no Wear OS 4+ ela precisa da permissão
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1)
        val d = resources.displayMetrics.density
        fun dp(v: Int) = (v * d).toInt()
        val largura = resources.displayMetrics.widthPixels
        // Cada relógio (2026-11-20f, pedido do dono: "adapte a tela para cada
        // modelo"): na tela redonda as bordas ficam para o anel e a curva corta
        // os cantos; na quadrada ou retangular (Oppo Watch, alguns Fossil e
        // Mobvoi) a margem é pequena. O texto acompanha o tamanho da tela: o
        // padrão é o Galaxy Watch de 44 mm (225 dp); um relógio de 40 mm ou o
        // Pixel Watch (~192 dp) fica um pouco menor, um de 47 mm, maior.
        val redonda = resources.configuration.isScreenRound
        val escala = (largura / d / 225f).coerceIn(0.84f, 1.15f)
        val lado = (largura * (if (redonda) 0.13 else 0.05)).toInt()

        val caixa = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(lado, (largura * (if (redonda) 0.13 else 0.06)).toInt(), lado, (largura * (if (redonda) 0.24 else 0.1)).toInt())
        }
        fun texto(tam: Float, cor: Int = Color.WHITE, negrito: Boolean = false) = TextView(this).apply {
            textSize = tam * escala
            setTextColor(cor)
            gravity = Gravity.CENTER
            if (negrito) setTypeface(typeface, Typeface.BOLD)
        }
        fun comToque(fundo: Drawable): Drawable = RippleDrawable(ColorStateList.valueOf(0x55FFFFFF), fundo, null)
        fun pilulaFundo(cores: IntArray): Drawable = comToque(GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, cores).apply { cornerRadius = dp(30).toFloat() })
        fun botao(rotulo: String, fundo: Drawable, tam: Float = 15f, acao: () -> Unit) = Button(this).apply {
            text = rotulo
            textSize = tam * escala
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
            background = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Cores.ROSA, Cores.ROXO)).apply { cornerRadius = dp(20).toFloat() }.also { fundoSerie = it }
        }
        caixa.addView(marca); caixa.addView(topo); caixa.addView(exNome)
        caixa.addView(serie, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0, dp(2), 0, dp(4)) })

        relogio = texto(48f, Cores.VERDE, true)
        rotuloDescanso = texto(11f, Cores.CINZA, true).apply { text = "DESCANSO"; letterSpacing = 0.25f }
        botoesDescanso = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(LinearLayout(this@TelaRelogio).apply {
                orientation = LinearLayout.HORIZONTAL
                listOf("−15 s" to "menos", "+30 s" to "mais").forEach { (rot, a) ->
                    val g = GradientDrawable().apply { cornerRadius = dp(30).toFloat(); setColor(0x22FFFFFF); setStroke(dp(2), Cores.CIANO) }
                    fundosContorno.add(g)
                    addView(botao(rot, comToque(g)) { enviar(a) }, lp(1f))
                }
            })
            val gp = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Cores.VERDE, Cores.CIANO)).apply { cornerRadius = dp(30).toFloat() }
            fundoPular = gp
            addView(botao("⏭ Pular descanso", comToque(gp)) { enviar("pular") }, lp())
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
        // Aeróbico (esteira, bicicleta...): o tempo e a distância são medidos no
        // celular; o relógio só diz que acabou (pedido do dono, 2026-11-14a)
        terminar = pilula("■ TERMINEI", intArrayOf(Cores.VERDE, Cores.CIANO), 19f) {
            val p = painel ?: return@pilula
            esperando = true
            mostrar()
            enviar(JSONObject().put("a", "terminar").put("ei", p.optInt("ei", -1)))
        }.apply { minHeight = dp(56); minimumHeight = dp(56); letterSpacing = 0.08f }
        blocoSerie = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(linhaPeso); addView(linhaReps); addView(linhaSeg)
            addView(txtRec)
            addView(feito, lp())
            addView(terminar, lp())
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
        // O celular voltou sem o treino (desligou e religou): o relógio pode
        // seguir com a cópia que tem. Um botão, e não sozinho: "sem treino no
        // celular" também é quem tocou em Finalizar treino lá.
        continuar = pilula("⌚ Continuar no relógio", intArrayOf(Cores.VERDE, Cores.CIANO)) {
            if (entrarSemCelular()) { semCel?.let { mostrarPainel(it.painel(System.currentTimeMillis())) }; agendarAlarmes() }
        }.apply { visibility = View.GONE }
        caixa.addView(continuar, lp())

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
        hora = HoraGeleia(this)
        hora.info = { infoDaHora() }
        raiz.addView(hora, FrameLayout.LayoutParams(tudo, tudo))
        raizTela = raiz
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
                if (melhor != null && painel == null && semCel == null) receber(melhor)
            } finally { buf.release() }
        }
        val sc = semCel
        if (sc != null) {
            mostrarPainel(sc.painel(System.currentTimeMillis()))
            agendarAlarmes()
            linha.removeCallbacks(procurarCelular)
            linha.post(procurarCelular)
        } else {
            enviar("estado")
            linha.removeCallbacks(chamarDeNovo)
            linha.postDelayed(chamarDeNovo, 10_000L)
        }
        if (!ambiente) linha.post(tique)
    }

    // um toque renova os 20 min da tela acesa (se o treino está aberto)
    override fun onUserInteraction() {
        super.onUserInteraction()
        if (acesoAte != 0L || ultimoPainelAtivo()) {
            acesoAte = System.currentTimeMillis() + ACESO_MS
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    // Segurar a tela mostra a hora (HoraGeleia), e soltar volta ao treino
    // (pedido do dono, 2026-11-20f: "um toque pode ser confundido com
    // comando"). Vale em qualquer lugar da tela, até em cima de um botão: ao
    // completar o tempo, o toque é cancelado para o que está embaixo (o botão
    // não dispara). Arrastar (rolar a tela) não conta.
    private var toqueX = 0f
    private var toqueY = 0f
    private var segurando = false
    private val segurarR = Runnable {
        if (ambiente || isFinishing) return@Runnable
        segurando = true
        cancelarToqueEmbaixo()
        hora.mostrar()
        try { getSystemService(Vibrator::class.java)?.vibrate(VibrationEffect.createOneShot(30L, VibrationEffect.DEFAULT_AMPLITUDE)) } catch (e: Exception) { }
    }

    // o toque deixa de ser do botão ou da rolagem embaixo
    private fun cancelarToqueEmbaixo() {
        val agora = android.os.SystemClock.uptimeMillis()
        val cancela = MotionEvent.obtain(agora, agora, MotionEvent.ACTION_CANCEL, toqueX, toqueY, 0)
        super.dispatchTouchEvent(cancela)
        cancela.recycle()
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                segurando = false
                linha.removeCallbacks(segurarR)
                toqueX = ev.x; toqueY = ev.y
                if (!ambiente) linha.postDelayed(segurarR, HoraGeleia.SEGURAR_MS)
            }
            MotionEvent.ACTION_POINTER_DOWN -> if (!segurando) linha.removeCallbacks(segurarR)
            MotionEvent.ACTION_MOVE -> if (!segurando &&
                Math.hypot((ev.x - toqueX).toDouble(), (ev.y - toqueY).toDouble()) > ViewConfiguration.get(this).scaledTouchSlop)
                linha.removeCallbacks(segurarR)
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                linha.removeCallbacks(segurarR)
                if (segurando) { segurando = false; onUserInteraction(); hora.esconder(); return true }
            }
        }
        if (segurando) return true
        return super.dispatchTouchEvent(ev)
    }

    // a bolha da hora: o descanso que falta, na cor dele; senão o dia
    private fun infoDaHora(): Pair<String, Int>? {
        val ate = descansoAte()
        val agora = System.currentTimeMillis()
        if (ate > agora) {
            val resta = ((ate - agora + 999) / 1000).toInt()
            val fracao = if (descTotal > 0) ((ate - agora).toFloat() / descTotal).coerceIn(0f, 1f) else 1f
            // no ambiente a tela só é redesenhada uma vez por minuto
            if (ambiente) return Pair("~" + ((resta + 59) / 60) + " min", Cores.CINZA)
            val cor = if (resta in 1..5) Cores.festa() else Cores.doDescanso(fracao)
            return Pair((resta / 60).toString() + ":" + (resta % 60).toString().padStart(2, '0'), cor)
        }
        return null
    }

    override fun onPause() {
        hora.esconderJa()
        palco.vivo = false
        frente.vivo = false
        Wearable.getDataClient(this).removeListener(this)
        Wearable.getMessageClient(this).removeListener(this)
        linha.removeCallbacks(tique)
        linha.removeCallbacks(procurarCelular)
        linha.removeCallbacks(chamarDeNovo)
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
        if (m.path == "/treino/sem-celular-ok") {
            val j = try { JSONObject(String(m.data, Charsets.UTF_8)) } catch (e: Exception) { return }
            runOnUiThread { entregou(j) }
            return
        }
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

    // O painel do celular. Sem o celular, só um painel novo (mais novo que a
    // hora em que o relógio ficou sozinho), ativo e com tudo entregue, devolve
    // o treino ao celular; antes disso, o que o relógio anotou vai primeiro.
    private fun receber(j: JSONObject) {
        semResposta = false
        semNo = false
        semPlay = false
        linha.removeCallbacks(semRespostaR)
        linha.removeCallbacks(chamarDeNovo)
        val sc = semCel
        if (sc != null) {
            val novo = j.optLong("agora", 0L) > sc.desde
            if (!novo) return
            if (sc.eventos.length() > 0) { entregar(); return }
            if (!j.optBoolean("ativo") || j.optBoolean("carregando")) return
            sairSemCelular()
        }
        j.optJSONObject("copia")?.let { c -> copia = c; prefs.edit().putString("copia", c.toString()).putLong("copiaEm", System.currentTimeMillis()).apply() }
        // o toque foi ao celular e ele respondeu sem o Jarvis ligado (o app
        // reabriu sem o treino): o relógio segue sozinho com a cópia
        val pendente = aguardando
        aguardando = null
        if (pendente != null && !j.optBoolean("ativo") && entrarSemCelular()) { aplicarAqui(pendente); return }
        mostrarPainel(j)
    }

    private fun mostrarPainel(j: JSONObject) {
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

    // ---- sem o celular ----
    private fun entrarSemCelular(): Boolean {
        if (semCel != null) return true
        val c = copia ?: painel?.optJSONObject("copia") ?: return false
        val sc = SemCelular.daCopia(c, System.currentTimeMillis()) ?: return false
        semCel = sc
        guardarSemCelular()
        AlertaRelogio.vibrar(this, longArrayOf(0, 60, 80, 60))
        linha.removeCallbacks(procurarCelular)
        linha.postDelayed(procurarCelular, 10_000L)
        return true
    }

    private fun sairSemCelular() {
        semCel = null
        prefs.edit().remove("semCelular").apply()
        linha.removeCallbacks(alarmeDez); linha.removeCallbacks(alarmeFim)
        linha.removeCallbacks(procurarCelular)
    }

    private fun guardarSemCelular() {
        val sc = semCel ?: return
        prefs.edit().putString("semCelular", sc.guardar()).apply()
    }

    // o toque aplicado aqui mesmo
    private fun aplicarAqui(j: JSONObject) {
        val sc = semCel ?: return
        val agora = System.currentTimeMillis()
        sc.acao(j, agora)
        guardarSemCelular()
        esperando = false
        mostrarPainel(sc.painel(agora))
        agendarAlarmes()
    }

    // o fim do descanso vibra no pulso (era o celular que avisava)
    private val alarmeDez = Runnable { if (semCel != null) AlertaRelogio.vibrar(this, longArrayOf(0, 160)) }
    private val alarmeFim = Runnable {
        val sc = semCel ?: return@Runnable
        AlertaRelogio.vibrar(this, longArrayOf(0, 450, 180, 450, 180, 700))
        mostrarPainel(sc.painel(System.currentTimeMillis()))
    }
    private fun agendarAlarmes() {
        linha.removeCallbacks(alarmeDez); linha.removeCallbacks(alarmeFim)
        val sc = semCel ?: return
        val falta = sc.fimDesc - System.currentTimeMillis()
        if (falta <= 0) return
        if (falta > 10_500L) linha.postDelayed(alarmeDez, falta - 10_000L)
        linha.postDelayed(alarmeFim, falta)
    }

    // A cada 10 s sem o celular, o relógio procura por ele e entrega o que anotou.
    private val procurarCelular = object : Runnable {
        override fun run() {
            if (semCel == null) return
            entregar()
            linha.postDelayed(this, 10_000L)
        }
    }

    private fun entregar() {
        val sc = semCel ?: return
        val dados = sc.pacote().toString().toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/sem-celular", dados) }
        }
    }

    // O celular guardou o que o relógio anotou. Com o Jarvis ligado, ele manda
    // o painel novo (com as séries daqui) e o relógio volta a ser o controle
    // dele; sem o Jarvis, o relógio segue sozinho e o celular avisa na tela.
    private fun entregou(j: JSONObject) {
        val sc = semCel ?: return
        val ks = HashSet<String>()
        val l = j.optJSONArray("ks")
        if (l != null) for (i in 0 until l.length()) ks.add(l.optString(i))
        sc.entregues(ks)
        guardarSemCelular()
        if (j.optBoolean("ativo")) {
            val dados = JSONObject().put("a", "estado").toString().toByteArray(Charsets.UTF_8)
            Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/acao", dados) }
            }
        }
        mostrar()
    }

    private fun novoK(): String =
        java.lang.Long.toString(System.currentTimeMillis(), 36) + java.lang.Long.toString((Math.random() * 1_679_616).toLong(), 36)

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

    private fun ultimoPainelAtivo(): Boolean {
        val p = painel ?: return false
        return p.optBoolean("ativo", false) && !p.optBoolean("fim") && !p.optBoolean("carregando")
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
                p == null && semPlay -> "Este relógio não alcança o celular (Google Play Services). Reinicie o relógio e confira o app Galaxy Wearable (ou Wear OS) no celular."
                p == null && semNo -> "O relógio não está ligado a nenhum celular. No celular: Bluetooth ligado e o Galaxy Wearable mostrando o relógio Conectado. Xiaomi, Redmi, POCO: libere Início automático e bateria do Galaxy Wearable, do plugin do relógio e do Google Play Services."
                p == null && semResposta -> "Conectado a " + (if (nomeCelular.isNotEmpty()) nomeCelular else "um celular") + ", mas o Treino Livre de lá não respondeu. No celular: abra o Treino Livre pelo ícone. Xiaomi, Redmi, POCO, Oppo, Vivo, Huawei: libere o Início automático e a bateria sem restrição (no app: Ajustes › Conectar aparelhos › Relógio › Testar a conexão)."
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
            if (semCel != null) aviso.text = avisoSemCelular()
            val podeContinuar = p != null && !ativo && p.optBoolean("semJarvis") && semCel == null && copiaComSerie() && !ambiente
            mostra(continuar, podeContinuar)
            if (podeContinuar) aviso.text = "O celular está sem o treino aberto. Para continuar a ficha de antes aqui no relógio, toque abaixo: as séries vão para o celular depois."
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
        mostra(continuar, false)
        val feitas = p.optInt("feitas"); val total = p.optInt("total")
        // só o progresso: o nome do treino quebrava em duas linhas, e a de cima
        // sumia na borda da tela redonda
        // e o tempo que falta (pedido do dono, 2026-11-17a), curto para caber
        // na borda redonda
        val falta = p.optInt("falta")
        topo.text = if (falta > 0) "$feitas de $total séries · ~" + textoFalta(falta) else "$feitas de $total séries"
        exNome.text = p.optString("ex")
        exNome.setTextColor(Color.WHITE)
        serie.text = if (p.optBoolean("drop")) "↓ DROP" else "SÉRIE " + p.optInt("n") + " DE " + p.optInt("de")
        mostra(serie, !ambiente)
        val descansando = descansoAte() > 0
        if (!descansando) { palco.treino(feitas, total); pintarDescanso(0) }
        mostra(blocoDescanso, descansando)
        mostra(botoesDescanso, !ambiente)
        val tempo = p.optBoolean("tempo")
        val cardio = p.optBoolean("cardio")
        mostra(blocoSerie, true)
        mostra(linhaPeso, !tempo && !cardio)
        mostra(linhaReps, !tempo && !cardio)
        mostra(linhaSeg, tempo && !cardio)
        mostra(feito, !cardio)
        mostra(terminar, cardio)
        terminar.isEnabled = !esperando
        terminar.alpha = if (esperando) 0.6f else 1f
        terminar.text = if (esperando) "Anotando…" else "■ TERMINEI"
        feito.isEnabled = !esperando
        feito.alpha = if (esperando) 0.6f else 1f
        feito.text = if (esperando) "Anotando…" else "✓ FEITO"
        mostrarValores()
        if (cardio) txtRec.visibility = View.GONE
        val ant = p.optString("ant")
        anterior.text = if (cardio) "Parou? Toque em Terminei: o tempo e a distância vão pelo celular." else if (ant.isNotEmpty()) "Anterior: $ant" else ""
        val prox = p.optString("prox")
        depois.text = if (prox.isNotEmpty()) "Depois: $prox" else ""
        mostra(navegar, !ambiente)
        mostra(dica, !ambiente)
        if (ambiente) { mostra(blocoSerie, false); anterior.text = ""; depois.text = "" }
        if (semCel != null) {
            aviso.text = if (ambiente) "📴 sem o celular" else avisoSemCelular()
            if (cardio && !ambiente) anterior.text = "Sem o celular o tempo não é medido: Terminei só marca a série."
        }
        // Com o treino aberto a tela fica acesa o tempo todo (pedido do dono,
        // 2026-11-18d: "a tela do relógio está apagando"; antes só no descanso).
        // Esquecido aberto, apaga sozinho: 20 min sem série nova, toque ou
        // descanso (o tique confere, acesoAte).
        acesoAte = System.currentTimeMillis() + ACESO_MS
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        atualizarRelogio()
    }

    // a cópia de um treino de hoje com série por fazer (de até 4 h atrás)
    private fun copiaComSerie(): Boolean {
        val c = copia ?: return false
        if (System.currentTimeMillis() - prefs.getLong("copiaEm", 0L) > 4 * 3600_000L) return false
        val l = c.optJSONArray("it") ?: return false
        for (i in 0 until l.length()) {
            val o = l.optJSONObject(i) ?: continue
            if (o.optInt("pu") == 1) continue
            val s = o.optJSONArray("s") ?: continue
            for (k in 0 until s.length()) if (s.optJSONArray(k)?.optInt(0) == 0) return true
        }
        return false
    }

    private fun avisoSemCelular(): String {
        val n = semCel?.eventos?.length() ?: 0
        return "📴 Sem o celular: o relógio anota sozinho" +
            (if (n > 0) " ($n para entregar)" else "") + ". Tudo vai para o celular quando ele voltar."
    }

    // o +30 s alonga o anel em vez de reenchê-lo; um descanso novo começa cheio
    private fun anotarTotal(ate: Long, agora: Long) {
        if (ate == descAteVisto) return
        descTotal = if (descAteVisto > agora && descTotal > 0) maxOf(1000L, descTotal + (ate - descAteVisto))
            else maxOf(1000L, ate - agora)
        descAteVisto = ate
    }

    private var acesoAte = 0L
    private val ACESO_MS = 20 * 60_000L
    // pediu o estado ao celular, conectado, e nada voltou em 8 s
    private var semResposta = false
    // 2026-11-19b: o "Celular desconectado" era escrito e o mostrar() o
    // apagava na hora com "Abra o Treino Livre no celular" (visto no Redmi com
    // o Watch 6). Hoje o motivo fica guardado e o mostrar() o usa.
    private var semNo = false
    private var semPlay = false
    private var nomeCelular = ""
    // enquanto não chega painel, o relógio chama o celular de novo a cada 10 s
    private val chamarDeNovo = object : Runnable {
        override fun run() {
            if (painel != null || semCel != null) return
            enviar("estado")
            linha.postDelayed(this, 10_000L)
        }
    }
    private val semRespostaR = Runnable { if (painel == null && semCel == null) { semResposta = true; mostrar() } }
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
        val fracao = ((ate - agora).toFloat() / descTotal).coerceIn(0f, 1f)
        // o número tem a cor da ponta do anel: muda aos poucos, do verde ao vermelho
        // nos 5 últimos, a cor da festa, no mesmo compasso do anel
        val cor = if (ambiente) Color.WHITE else if (resta in 1..5) Cores.festa() else Cores.doDescanso(fracao)
        relogio.setTextColor(cor)
        rotuloDescanso.setTextColor(if (ambiente) Cores.CINZA else cor)
        pintarDescanso(if (ambiente) 0 else cor)
        palco.descanso(fracao, resta)
        if (!ambiente && resta != ultimoSegundo) {
            ultimoSegundo = resta
            // os 5 últimos segundos pulsam
            if (resta in 1..5) {
                relogio.animate().cancel()
                relogio.scaleX = 1.35f; relogio.scaleY = 1.35f
                relogio.animate().scaleX(1f).scaleY(1f).setStartDelay(0L).setDuration(380L)
                    .setInterpolator(AccelerateInterpolator()).start()
            }
        }
    }

    // Os botões e o selo da série na cor do descanso; 0 volta às cores de sempre
    private fun pintarDescanso(cor: Int) {
        if (cor == corPintada) return
        corPintada = cor
        val d = resources.displayMetrics.density
        if (cor == 0) {
            fundosContorno.forEach { it.setStroke((2 * d).toInt(), Cores.CIANO) }
            fundoPular?.colors = intArrayOf(Cores.VERDE, Cores.CIANO)
            fundoSerie?.colors = intArrayOf(Cores.ROSA, Cores.ROXO)
            return
        }
        fundosContorno.forEach { it.setStroke((2 * d).toInt(), cor) }
        fundoPular?.colors = intArrayOf(cor, Cores.misturar(cor, Color.WHITE, 0.3f))
        fundoSerie?.colors = intArrayOf(Cores.misturar(cor, Color.BLACK, 0.15f), Cores.misturar(cor, Color.BLACK, 0.45f))
    }

    // a cada 250 ms; nos 10 últimos segundos, mais depressa, para o número e
    // os botões trocarem de cor junto com o anel
    private val tique = object : Runnable {
        override fun run() {
            atualizarRelogio()
            val ate = descansoAte()
            val agoraT = System.currentTimeMillis()
            if (ate > agoraT) acesoAte = maxOf(acesoAte, agoraT + ACESO_MS)
            if (acesoAte in 1 until agoraT) { acesoAte = 0L; window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
            val perto = ate > 0 && ate - System.currentTimeMillis() < 10_500L && !ambiente
            linha.postDelayed(this, if (perto) 60L else 250L)
        }
    }

    private fun enviar(acao: String) = enviar(JSONObject().put("a", acao))

    private fun enviar(j: JSONObject) {
        val a = j.optString("a")
        // sem o celular: "estado" é procurar por ele; o resto vale aqui mesmo
        if (semCel != null) {
            if (a == "estado") entregar() else { if (a == "feito" || a == "terminar") j.put("k", novoK()); aplicarAqui(j) }
            return
        }
        // o id da série: se o toque ficar sem resposta e for anotado aqui, o
        // celular não conta duas vezes
        if (a == "feito" || a == "terminar") { j.put("k", novoK()); aguardando = j }
        val dados = j.toString().toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nos ->
            if (nos.isEmpty()) {
                // sem celular por perto (a bateria dele acabou, o Bluetooth caiu)
                if (a != "estado" && entrarSemCelular()) { aguardando = null; aplicarAqui(j); return@addOnSuccessListener }
                aguardando = null
                esperando = false
                semNo = true
                semPlay = false
                mostrar()
                if (painel != null) aviso.text = "Celular desconectado. Confira o Bluetooth e o app do relógio no celular (Galaxy Wearable, Pixel Watch ou Wear OS)."
                return@addOnSuccessListener
            }
            semNo = false
            semPlay = false
            nomeCelular = nos.firstOrNull()?.displayName ?: ""
            nos.forEach { no -> Wearable.getMessageClient(this).sendMessage(no.id, "/treino/acao", dados) }
            if (a == "estado" && painel == null) { linha.removeCallbacks(semRespostaR); linha.postDelayed(semRespostaR, 8000L) }
            // sem resposta em 6 s, o celular não recebeu: anota aqui
            if (esperando) linha.postDelayed({
                if (esperando) {
                    val pend = aguardando
                    aguardando = null
                    if (pend != null && entrarSemCelular()) aplicarAqui(pend)
                    else { esperando = false; aviso.text = "O celular não respondeu. Abra o Treino Livre nele."; mostrar() }
                }
            }, 6000L)
        }.addOnFailureListener {
            if (a != "estado" && entrarSemCelular()) { aguardando = null; aplicarAqui(j); return@addOnFailureListener }
            esperando = false
            semPlay = true
            mostrar()
            if (painel != null) aviso.text = "Este relógio não alcança o celular (Google Play Services)."
        }
    }

    companion object {
        private const val SERIE = 1
        private const val RECORDE = 2
        private const val TREINO_COMPLETO = 3
    }

    private fun textoFalta(min: Int): String =
        if (min < 60) "$min min" else (min / 60).toString() + "h" + (min % 60).toString().padStart(2, '0')

}
