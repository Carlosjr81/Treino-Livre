package br.com.treinolivre.relogio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.min
import kotlin.math.sin

// Comida e água no pulso (2026-11-25a, pedido do dono: "marcar alimentos e
// água com simples toques, sem pegar o celular, e levar para dentro do app").
// Cada toque vira um acontecimento com id (k), guardado aqui até o celular
// confirmar (/treino/comida-ok): sem o celular por perto, nada se perde. O
// celular guarda, avisa, e leva ao Jarvis Body Balance do site (#comida=).
// A meta, o que já entrou e os favoritos vêm do celular (/treino/comida-estado).
object ComidaPulso {
    const val ADD = "/treino/comida"
    const val OK = "/treino/comida-ok"
    const val ESTADO = "/treino/comida-estado"

    // Os rápidos de sempre, até o celular mandar os favoritos de quem usa
    // (os mesmos números do ALIMENTOS_BR do site: o teste-balance confere)
    val PADRAO = listOf(
        Rapido("cafe", "Café", "☕", 2, 0.1, 0.3, 0.0, 50),
        Rapido("banana", "Banana", "\u{1F34C}", 69, 0.9, 18.0, 0.1, 0),
        Rapido("pao", "Pão francês", "\u{1F956}", 150, 4.0, 29.3, 1.6, 0),
        Rapido("frango", "Frango grelhado", "\u{1F357}", 159, 32.0, 0.0, 2.5, 0),
        Rapido("pf", "Prato feito", "\u{1F37D}", 650, 42.0, 70.0, 20.0, 0),
        Rapido("whey", "Whey protein", "\u{1F964}", 120, 24.0, 3.0, 1.5, 0),
        Rapido("lanche", "Lanche", "\u{1F96A}", 320, 16.0, 32.0, 13.0, 0),
        Rapido("chocolate", "Chocolate ao leite", "\u{1F36B}", 135, 2.0, 15.0, 7.5, 0),
        Rapido("refri", "Refrigerante comum", "\u{1F964}", 140, 0.0, 35.0, 0.0, 350),
        Rapido("cerveja", "Cerveja", "\u{1F37A}", 147, 1.1, 12.0, 0.0, 350),
    )

    data class Rapido(val a: String, val n: String, val ic: String, val k: Int, val p: Double, val c: Double, val g: Double, val liq: Int)

    fun hoje(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun prefs(c: Context) = c.getSharedPreferences("comida", Context.MODE_PRIVATE)
    fun pendentes(c: Context): JSONArray = try { JSONArray(prefs(c).getString("pend", "[]")) } catch (e: Exception) { JSONArray() }
    fun locais(c: Context): JSONArray = try { JSONArray(prefs(c).getString("loc", "[]")) } catch (e: Exception) { JSONArray() }
    fun estado(c: Context): JSONObject? = try { prefs(c).getString("estado", null)?.let { JSONObject(it) } } catch (e: Exception) { null }

    fun guardarEstado(c: Context, json: String) { prefs(c).edit().putString("estado", json).apply() }

    fun anotar(c: Context, ev: JSONObject) {
        val p = pendentes(c).put(ev)
        // os de hoje ficam também para a conta da tela (até o estado do celular contar)
        val l = locais(c)
        val manter = JSONArray()
        for (i in 0 until l.length()) l.optJSONObject(i)?.let { if (it.optString("d") == hoje()) manter.put(it) }
        manter.put(ev)
        prefs(c).edit().putString("pend", ate(p, 200).toString()).putString("loc", ate(manter, 120).toString()).apply()
    }

    fun desfazerUltimo(c: Context): JSONObject? {
        val l = locais(c)
        if (l.length() == 0) return null
        val ult = l.optJSONObject(l.length() - 1) ?: return null
        if (ult.optString("tipo") == "desfazer") return null
        val novaL = JSONArray()
        for (i in 0 until l.length() - 1) novaL.put(l.get(i))
        val p = pendentes(c)
        val novaP = JSONArray()
        var tirouDaFila = false
        for (i in 0 until p.length()) { val e = p.optJSONObject(i); if (e != null && e.optString("k") == ult.optString("k")) tirouDaFila = true else novaP.put(e) }
        // já foi ao celular: vai um "desfazer" com a referência
        if (!tirouDaFila) novaP.put(JSONObject().put("k", novoK()).put("t", System.currentTimeMillis()).put("tipo", "desfazer").put("ref", ult.optString("k")).put("d", hoje()))
        prefs(c).edit().putString("pend", novaP.toString()).putString("loc", novaL.toString()).apply()
        return ult
    }

    fun confirmar(c: Context, ks: JSONArray) {
        val set = HashSet<String>()
        for (i in 0 until ks.length()) set.add(ks.optString(i))
        val p = pendentes(c)
        val n = JSONArray()
        for (i in 0 until p.length()) { val e = p.optJSONObject(i); if (e != null && !set.contains(e.optString("k"))) n.put(e) }
        prefs(c).edit().putString("pend", n.toString()).apply()
    }

    fun mandar(c: Context) {
        val p = pendentes(c)
        if (p.length() == 0) return
        val dados = JSONObject().put("ev", p).toString().toByteArray(Charsets.UTF_8)
        try {
            Wearable.getNodeClient(c).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no -> Wearable.getMessageClient(c).sendMessage(no.id, ADD, dados).addOnFailureListener { } }
            }.addOnFailureListener { }
        } catch (e: Exception) { }
    }

    fun novoK(): String = "r" + java.lang.Long.toString(System.currentTimeMillis(), 36) + java.lang.Long.toString((Math.random() * 1_679_616).toLong(), 36)

    private fun ate(a: JSONArray, max: Int): JSONArray {
        if (a.length() <= max) return a
        val n = JSONArray()
        for (i in a.length() - max until a.length()) n.put(a.get(i))
        return n
    }

    // O de hoje: o que o celular já contou + os toques daqui que ele ainda não viu
    data class Hoje(val k: Int, val meta: Int, val p: Double, val c: Double, val g: Double, val agua: Int, val metaAgua: Int, val pendentes: Int, val fase: String)
    fun contas(c: Context): Hoje {
        val e = estado(c)
        val doDia = e != null && e.optString("d") == hoje()
        var k = if (doDia) e!!.optInt("k") else 0
        var p = if (doDia) e!!.optDouble("p", 0.0) else 0.0
        var cc = if (doDia) e!!.optDouble("c", 0.0) else 0.0
        var g = if (doDia) e!!.optDouble("g", 0.0) else 0.0
        var agua = if (doDia) e!!.optInt("agua") else 0
        val vistos = HashSet<String>()
        e?.optJSONArray("vistos")?.let { for (i in 0 until it.length()) vistos.add(it.optString(i)) }
        val l = locais(c)
        for (i in 0 until l.length()) {
            val x = l.optJSONObject(i) ?: continue
            if (x.optString("d") != hoje() || (doDia && vistos.contains(x.optString("k")))) continue
            if (x.optString("tipo") == "agua") agua += x.optInt("ml")
            else { k += x.optInt("kc"); p += x.optDouble("p", 0.0); cc += x.optDouble("c", 0.0); g += x.optDouble("g", 0.0); agua += x.optInt("liq") }
        }
        return Hoje(k, e?.optInt("meta") ?: 0, p, cc, g, agua, e?.optInt("magua") ?: 0, pendentes(c).length(), e?.optString("ob") ?: "")
    }

    fun rapidos(c: Context): List<Rapido> {
        val fav = estado(c)?.optJSONArray("fav") ?: return PADRAO
        val l = mutableListOf<Rapido>()
        for (i in 0 until fav.length()) {
            val f = fav.optJSONObject(i) ?: continue
            if (f.optString("a").isEmpty()) continue
            l.add(Rapido(f.optString("a"), f.optString("n"), f.optString("ic", "\u{1F37D}"), f.optInt("k"), f.optDouble("p", 0.0), f.optDouble("c", 0.0), f.optDouble("g", 0.0), f.optInt("liq")))
        }
        return if (l.isEmpty()) PADRAO else l
    }
}

class ComidaRelogio : ComponentActivity(), MessageClient.OnMessageReceivedListener, DataClient.OnDataChangedListener {
    private lateinit var anel: AnelComida
    private lateinit var linha: TextView
    private lateinit var lista: LinearLayout
    private lateinit var aviso: TextView
    private val main = Handler(Looper.getMainLooper())
    private var letreiro: Typeface? = null
    private var passouAntes = false
    private val reenviar = object : Runnable {
        override fun run() { ComidaPulso.mandar(this@ComidaRelogio); main.postDelayed(this, 12000L) }
    }

    private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        letreiro = try { resources.getFont(R.font.letreiro) } catch (e: Exception) { null }
        val redondo = resources.configuration.isScreenRound
        val w = resources.displayMetrics.widthPixels
        val margem = (w * (if (redondo) 0.13 else 0.05)).toInt()
        val raiz = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL; setPadding(margem, margem / 2, margem, margem) }
        raiz.addView(TextView(this).apply {
            text = "COMIDA & ÁGUA"; gravity = Gravity.CENTER; setTextColor(Color.parseColor("#4DEBFF")); textSize = 13f
            letreiro?.let { typeface = it }; letterSpacing = 0.05f
        })
        anel = AnelComida(this, letreiro)
        raiz.addView(anel, LinearLayout.LayoutParams((w * 0.62).toInt(), (w * 0.62).toInt()).apply { topMargin = dp(4) })
        linha = TextView(this).apply { gravity = Gravity.CENTER; setTextColor(Color.parseColor("#C9C2D8")); textSize = 11.5f }
        raiz.addView(linha)
        aviso = TextView(this).apply { gravity = Gravity.CENTER; setTextColor(Cores.OURO); textSize = 13f; visibility = View.GONE; typeface = Typeface.DEFAULT_BOLD; setPadding(0, dp(4), 0, dp(4)) }
        raiz.addView(aviso)
        val agua = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        agua.addView(botao("\u{1F4A7} +200", intArrayOf(Color.parseColor("#1DD1A1"), Color.parseColor("#35E0F0"))) { anotarAgua(200) }, LinearLayout.LayoutParams(0, dp(48), 1f).apply { rightMargin = dp(4) })
        agua.addView(botao("\u{1F4A7} +500", intArrayOf(Color.parseColor("#35E0F0"), Color.parseColor("#2E7BFF"))) { anotarAgua(500) }, LinearLayout.LayoutParams(0, dp(48), 1f).apply { leftMargin = dp(4) })
        raiz.addView(agua, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) })
        lista = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        raiz.addView(lista, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) })
        raiz.addView(botao("↩ Desfazer o último", null) { desfazer() }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(44)).apply { topMargin = dp(8) })
        raiz.addView(botao("\u{1F3CB}️ Ir para o treino", null) {
            startActivity(android.content.Intent(this, TelaRelogio::class.java)); finish()
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(44)).apply { topMargin = dp(6) })
        val rolar = ScrollView(this).apply { isVerticalScrollBarEnabled = false; addView(raiz); setBackgroundColor(Cores.FUNDO_JOGO) }
        setContentView(rolar)
        montarRapidos()
        mostrar()
    }

    private fun botao(rotulo: String, cores: IntArray?, acao: () -> Unit) = Button(this).apply {
        text = rotulo; isAllCaps = false; setTextColor(Color.WHITE); textSize = 14f; typeface = Typeface.DEFAULT_BOLD
        background = if (cores != null) GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, cores).apply { cornerRadius = dp(24).toFloat() }
            else GradientDrawable().apply { cornerRadius = dp(24).toFloat(); setColor(0x22FFFFFF); setStroke(dp(2), Color.parseColor("#4DEBFF")) }
        setPadding(dp(6), 0, dp(6), 0)
        setOnClickListener {
            animate().scaleX(0.92f).scaleY(0.92f).setDuration(70).withEndAction { animate().scaleX(1f).scaleY(1f).setDuration(160).start() }.start()
            acao()
        }
    }

    private fun montarRapidos() {
        lista.removeAllViews()
        val cores = listOf(intArrayOf(Cores.LARANJA, Cores.ROSA), intArrayOf(Cores.ROSA, Cores.ROXO), intArrayOf(Cores.ROXO, Color.parseColor("#2E7BFF")))
        ComidaPulso.rapidos(this).forEachIndexed { i, r ->
            lista.addView(botao(r.ic + " " + r.n + " · " + r.k, cores[i % cores.size]) { anotarComida(r) },
                LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(46)).apply { topMargin = dp(5) })
        }
    }

    private fun anotarAgua(ml: Int) {
        ComidaPulso.anotar(this, JSONObject().put("k", ComidaPulso.novoK()).put("t", System.currentTimeMillis()).put("tipo", "agua").put("ml", ml).put("d", ComidaPulso.hoje()))
        AlertaRelogio.vibrar(this, longArrayOf(0, 30))
        anel.comemorar(Color.parseColor("#35E0F0"), "+$ml ml")
        ComidaPulso.mandar(this)
        mostrar()
    }

    private fun anotarComida(r: ComidaPulso.Rapido) {
        ComidaPulso.anotar(this, JSONObject().put("k", ComidaPulso.novoK()).put("t", System.currentTimeMillis()).put("tipo", "comida").put("a", r.a).put("q", 1)
            .put("kc", r.k).put("p", r.p).put("c", r.c).put("g", r.g).put("liq", r.liq).put("d", ComidaPulso.hoje()))
        AlertaRelogio.vibrar(this, longArrayOf(0, 30))
        anel.comemorar(Cores.ROSA, "+${r.k} kcal")
        ComidaPulso.mandar(this)
        mostrar()
    }

    private fun desfazer() {
        val u = ComidaPulso.desfazerUltimo(this)
        if (u == null) { aviso.text = "Nada para desfazer hoje"; aviso.visibility = View.VISIBLE; return }
        AlertaRelogio.vibrar(this, longArrayOf(0, 20, 60, 20))
        ComidaPulso.mandar(this)
        aviso.text = "↩ Desfeito"; aviso.visibility = View.VISIBLE
        mostrar()
    }

    private fun mostrar() {
        val h = ComidaPulso.contas(this)
        anel.atualizar(h)
        val faltaMl = (h.metaAgua - h.agua).coerceAtLeast(0)
        linha.text = (if (h.metaAgua > 0) "\u{1F4A7} ${"%.1f".format(h.agua / 1000.0)} de ${"%.1f".format(h.metaAgua / 1000.0)} L" else "\u{1F4A7} ${"%.1f".format(h.agua / 1000.0)} L") +
            (if (h.pendentes > 0) "\n⏳ ${h.pendentes} esperando o celular" else "\n✓ tudo no celular")
        if (faltaMl == 0 && h.metaAgua > 0) linha.append(" · água em dia")
        val passou = h.meta > 0 && h.k > h.meta
        if (passou && !passouAntes) {
            AlertaRelogio.vibrar(this, longArrayOf(0, 200, 100, 200))
            // passou da meta: o aeróbico que compensa (caminhada rápida, uns 4,6 kcal/min)
            val min = ((h.k - h.meta) / 4.6).toInt().coerceAtMost(60)
            aviso.text = "⚠ Passou ${h.k - h.meta} kcal\n\u{1F6B6} +$min min de caminhada compensam"
            aviso.setTextColor(Color.parseColor("#FF4D6D")); aviso.visibility = View.VISIBLE
        } else if (!passou && h.meta > 0 && h.k >= h.meta * 0.98) {
            aviso.text = "\u{1F3AF} META DO DIA ATINGIDA"; aviso.setTextColor(Cores.OURO); aviso.visibility = View.VISIBLE
        }
        passouAntes = passou
    }

    override fun onResume() {
        super.onResume()
        anel.vivo = true
        try { Wearable.getMessageClient(this).addListener(this) } catch (e: Exception) { }
        try { Wearable.getDataClient(this).addListener(this) } catch (e: Exception) { }
        lerEstado()
        main.post(reenviar)
    }

    override fun onPause() {
        super.onPause()
        anel.vivo = false
        main.removeCallbacks(reenviar)
        try { Wearable.getMessageClient(this).removeListener(this) } catch (e: Exception) { }
        try { Wearable.getDataClient(this).removeListener(this) } catch (e: Exception) { }
    }

    private fun lerEstado() {
        try {
            Wearable.getDataClient(this).getDataItems(Uri.parse("wear://*" + ComidaPulso.ESTADO)).addOnSuccessListener { itens ->
                var achou: String? = null
                for (i in itens) try { achou = DataMapItem.fromDataItem(i).dataMap.getString("json") } catch (e: Exception) { }
                itens.release()
                if (achou != null) { ComidaPulso.guardarEstado(this, achou); montarRapidos(); mostrar() }
            }
        } catch (e: Exception) { }
    }

    override fun onDataChanged(eventos: DataEventBuffer) {
        for (e in eventos) {
            if (e.dataItem.uri.path != ComidaPulso.ESTADO) continue
            val j = try { DataMapItem.fromDataItem(e.dataItem).dataMap.getString("json") } catch (x: Exception) { null } ?: continue
            ComidaPulso.guardarEstado(this, j)
            main.post { montarRapidos(); mostrar() }
        }
    }

    override fun onMessageReceived(m: MessageEvent) {
        if (m.path != ComidaPulso.OK) return
        val ks = try { JSONObject(String(m.data, Charsets.UTF_8)).optJSONArray("ks") } catch (e: Exception) { null } ?: return
        ComidaPulso.confirmar(this, ks)
        main.post { mostrar() }
    }
}

// O anel do dia: as kcal enchendo na cor dos macros, a água num anel de dentro,
// e o número no meio. Passou da meta, o anel fica vermelho e pulsa.
class AnelComida(c: Context, private val fonte: Typeface?) : View(c) {
    var vivo = false
        set(v) { field = v; if (v) invalidate() }
    private var h: ComidaPulso.Hoje? = null
    private val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val txt = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; color = Color.WHITE }
    private val oval = RectF()
    private var festaCor = 0
    private var festaTxt = ""
    private var festaEm = 0L
    fun atualizar(x: ComidaPulso.Hoje) { h = x; invalidate() }
    fun comemorar(cor: Int, t: String) { festaCor = cor; festaTxt = t; festaEm = SystemClock.uptimeMillis(); invalidate() }

    override fun onDraw(cv: Canvas) {
        val x = h ?: return
        val w = width.toFloat(); val hh = height.toFloat()
        val r = min(w, hh) / 2f
        val cx = w / 2f; val cy = hh / 2f
        val agora = SystemClock.uptimeMillis()
        val sw = r * 0.14f
        oval.set(cx - r + sw / 2, cy - r + sw / 2, cx + r - sw / 2, cy + r - sw / 2)
        p.strokeWidth = sw; p.color = 0x22FFFFFF; p.shader = null
        cv.drawArc(oval, 0f, 360f, false, p)
        val meta = if (x.meta > 0) x.meta.toFloat() else 2000f
        val passou = x.meta > 0 && x.k > x.meta
        val pulso = if (passou) 0.75f + 0.25f * sin(agora / 160f) else 1f
        // as fatias dos macros, na ordem do corpo (proteína, carbo, gordura, resto)
        val kp = (x.p * 4).toFloat(); val kc = (x.c * 4).toFloat(); val kg = (x.g * 9).toFloat()
        val resto = (x.k - kp - kc - kg).coerceAtLeast(0f)
        val total = (kp + kc + kg + resto).coerceAtLeast(1f)
        val varredura = 360f * min(1f, x.k / meta)
        var ini = -90f
        listOf(kp to "#FF4D6D", kc to "#FFB21A", kg to "#B05BFF", resto to "#8A8F9E").forEach { (v, cor) ->
            if (v <= 0f) return@forEach
            val ang = varredura * (v / total)
            p.color = if (passou) Color.parseColor("#FF4D6D") else Color.parseColor(cor)
            p.alpha = (255 * pulso).toInt()
            cv.drawArc(oval, ini, ang, false, p)
            ini += ang
        }
        // a água, por dentro
        val sw2 = r * 0.07f
        val r2 = r - sw - sw2
        oval.set(cx - r2, cy - r2, cx + r2, cy + r2)
        p.strokeWidth = sw2; p.color = 0x22FFFFFF; p.alpha = 255
        cv.drawArc(oval, 0f, 360f, false, p)
        if (x.metaAgua > 0) { p.color = Color.parseColor("#35E0F0"); cv.drawArc(oval, -90f, 360f * min(1f, x.agua.toFloat() / x.metaAgua), false, p) }
        // o número
        fonte?.let { txt.typeface = it }
        txt.color = if (passou) Color.parseColor("#FF4D6D") else Color.WHITE
        txt.textSize = r * 0.32f
        cv.drawText("%,d".format(x.k).replace(',', '.'), cx, cy + r * 0.06f, txt)
        txt.typeface = Typeface.DEFAULT_BOLD
        txt.textSize = r * 0.12f
        txt.color = Color.parseColor("#C9C2D8")
        cv.drawText(if (x.meta > 0) "de " + "%,d".format(x.meta).replace(',', '.') + " kcal" else "kcal hoje", cx, cy + r * 0.27f, txt)
        if (x.fase.isNotEmpty()) { txt.textSize = r * 0.1f; txt.color = Color.parseColor("#4DEBFF"); cv.drawText(x.fase, cx, cy - r * 0.3f, txt) }
        // o "+200 ml" subindo depois do toque
        val t = (agora - festaEm) / 900f
        if (festaEm > 0 && t < 1f) {
            txt.color = festaCor; txt.alpha = ((1f - t) * 255).toInt(); txt.textSize = r * 0.16f
            cv.drawText(festaTxt, cx, cy - r * 0.5f - t * r * 0.25f, txt)
            txt.alpha = 255
            p.color = festaCor; p.alpha = ((1f - t) * 160).toInt(); p.strokeWidth = r * 0.04f
            cv.drawCircle(cx, cy, r * (0.4f + 0.6f * t), p)
            p.alpha = 255
        }
        if (vivo && ((festaEm > 0 && t < 1f) || passou)) postInvalidateDelayed(33L)
    }
}
