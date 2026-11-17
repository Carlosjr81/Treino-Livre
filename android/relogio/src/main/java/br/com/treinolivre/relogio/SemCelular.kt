package br.com.treinolivre.relogio

import org.json.JSONArray
import org.json.JSONObject

// O treino no relógio sem o celular (pedido do dono, 2026-11-17b: "acabou a
// bateria do celular e o treino no relógio não deu continuidade").
//
// O celular manda, junto de cada painel, a cópia do treino ("copia", montada
// pelo motor do Jarvis da tela travada). Sem o celular, o relógio segue com
// ela: marca as séries, conta o descanso e vibra no fim, com as MESMAS regras
// do motor do celular (criarBolso, no index.html): a série da vez
// (alvoDaSessao), o descanso do exercício, sem descanso antes do drop e entre
// os parceiros do bi-set, e nada de descanso depois da última série.
//
// Cada série vira um acontecimento no formato do motor ({ t: "a", u, i, p, r,
// sg, k }), guardado até o celular voltar. O id (k) é o mesmo que foi no toque
// que ficou sem resposta: se o celular tiver recebido aquele toque, ele não
// entra duas vezes.
class SemCelular private constructor(
    val nome: String,
    val itens: MutableList<Item>,
    var foco: Int,
    var fimDesc: Long,
    val eventos: JSONArray,
    // o relógio de quando ficou sem o celular: painel do celular mais velho
    // que isto é o da memória do relógio, não o celular de volta
    val desde: Long,
    private var ultimoEi: Int,
    private var ultimoSi: Int,
) {
    class Serie(var feito: Boolean, var peso: String, var reps: String, var seg: String, val drop: Boolean, var aquec: Boolean)
    class Item(val u: String, val nome: String, val tempo: Boolean, val cardio: Boolean, val desc: Int, var rec: Double,
               val pulado: Boolean, val conjunto: String, val series: MutableList<Serie>)

    companion object {
        // a cópia que veio do celular vira o treino daqui
        fun daCopia(c: JSONObject, agora: Long): SemCelular? = try {
            ler(c, JSONArray(), agora, -1, -1)
        } catch (e: Exception) { null }

        // o que ficou guardado (o relógio reiniciou o app no meio do treino)
        fun guardado(texto: String?): SemCelular? = try {
            if (texto.isNullOrEmpty()) null else {
                val j = JSONObject(texto)
                ler(j, j.optJSONArray("ev") ?: JSONArray(), j.optLong("desde"), j.optInt("ue", -1), j.optInt("us", -1))
            }
        } catch (e: Exception) { null }

        private fun ler(c: JSONObject, ev: JSONArray, desde: Long, ue: Int, us: Int): SemCelular? {
            val lista = c.optJSONArray("it") ?: return null
            val itens = mutableListOf<Item>()
            for (i in 0 until lista.length()) {
                val o = lista.getJSONObject(i)
                val ss = o.optJSONArray("s") ?: JSONArray()
                val series = mutableListOf<Serie>()
                for (k in 0 until ss.length()) {
                    val s = ss.getJSONArray(k)
                    series.add(Serie(s.optInt(0) == 1, s.optString(1), s.optString(2), s.optString(3), s.optInt(4) == 1, s.optInt(5) == 1))
                }
                itens.add(Item(o.optString("u"), o.optString("n"), o.optInt("t") == 1, o.optInt("c") == 1,
                    o.optInt("d", 90).coerceIn(5, 1800), o.optDouble("r", 0.0), o.optInt("pu") == 1, o.optString("cj"), series))
            }
            if (itens.isEmpty()) return null
            val foco = c.optInt("foco", -1).let { if (it in itens.indices) it else -1 }
            return SemCelular(c.optString("nome"), itens, foco, c.optLong("da", 0L), ev, desde, ue, us)
        }

        fun num(v: Double): String {
            val r = Math.round(v * 100) / 100.0
            return if (r == Math.floor(r)) r.toLong().toString() else r.toString()
        }
    }

    fun guardar(): String {
        val it = JSONArray()
        itens.forEach { x ->
            val ss = JSONArray()
            x.series.forEach { s ->
                ss.put(JSONArray().put(if (s.feito) 1 else 0).put(s.peso).put(s.reps).put(s.seg).put(if (s.drop) 1 else 0).put(if (s.aquec) 1 else 0))
            }
            it.put(JSONObject().put("u", x.u).put("n", x.nome).put("t", if (x.tempo) 1 else 0).put("c", if (x.cardio) 1 else 0)
                .put("d", x.desc).put("r", x.rec).put("pu", if (x.pulado) 1 else 0).put("cj", x.conjunto).put("s", ss))
        }
        return JSONObject().put("v", 1).put("nome", nome).put("foco", foco).put("da", fimDesc).put("it", it)
            .put("ev", eventos).put("desde", desde).put("ue", ultimoEi).put("us", ultimoSi).toString()
    }

    // o que vai ao celular quando ele voltar
    fun pacote(): JSONObject = JSONObject().put("ev", eventos).put("foco", foco).put("da", fimDesc)

    // o celular confirmou que guardou estes ids
    fun entregues(ks: Set<String>) {
        for (i in eventos.length() - 1 downTo 0) {
            val k = eventos.optJSONObject(i)?.optString("k") ?: ""
            if (k.isNotEmpty() && ks.contains(k)) eventos.remove(i)
        }
    }

    private fun pendente(it: Item): Int = if (it.pulado) -1 else it.series.indexOfFirst { !it.feito }
    private fun feitas(it: Item) = it.series.count { s -> s.feito }
    private fun temPendente() = itens.any { pendente(it) >= 0 }

    // a série da vez: o mesmo alvoDaSessao do site
    private fun alvo(): Pair<Int, Int>? {
        if (!temPendente()) return null
        val f = foco
        if (f in itens.indices) {
            val c = itens[f].conjunto
            if (c.isNotEmpty()) {
                var ini = f; var fim = f
                while (ini > 0 && itens[ini - 1].conjunto == c) ini--
                while (fim + 1 < itens.size && itens[fim + 1].conjunto == c) fim++
                var melhor = -1
                for (i in ini..fim) {
                    if (pendente(itens[i]) < 0) continue
                    if (melhor < 0 || feitas(itens[i]) < feitas(itens[melhor])) melhor = i
                }
                if (melhor >= 0) return Pair(melhor, pendente(itens[melhor]))
            } else {
                val si = pendente(itens[f])
                if (si >= 0) return Pair(f, si)
            }
            for (k in 1 until itens.size) {
                val i = (f + k) % itens.size
                val si = pendente(itens[i])
                if (si >= 0) return Pair(i, si)
            }
            return null
        }
        for (i in itens.indices) { val si = pendente(itens[i]); if (si >= 0) return Pair(i, si) }
        return null
    }

    private fun reps(t: String): Int {
        val ns = Regex("\\d+").findAll(t).map { it.value.toInt() }.take(2).toList()
        return if (ns.isEmpty()) 0 else ns.sum() / ns.size
    }
    private fun peso(t: String) = t.replace(",", ".").toDoubleOrNull() ?: 0.0

    // quanto falta, na conta do celular (séries, descansos, troca de aparelho)
    private fun falta(agora: Long): Int {
        var s = 0.0
        var ultimoDesc = 0
        var primeiro = true
        itens.forEach { it ->
            if (it.pulado) return@forEach
            val faltam = it.series.filter { !it.feito }
            if (faltam.isEmpty()) return@forEach
            if (!primeiro) s += 45
            primeiro = false
            faltam.forEach { x ->
                s += when {
                    it.cardio -> (x.seg.toIntOrNull() ?: 0).toDouble().takeIf { v -> v > 0 } ?: ((reps(x.reps).takeIf { v -> v > 0 } ?: 30) * 60.0)
                    it.tempo -> (x.seg.toIntOrNull() ?: 30) + 15.0
                    else -> (reps(x.reps).takeIf { v -> v > 0 } ?: 10) * 3.5 + 15
                }
                s += it.desc
                ultimoDesc = it.desc
            }
        }
        s -= ultimoDesc
        if (fimDesc > agora) s += (fimDesc - agora) / 1000.0
        return Math.round(maxOf(0.0, s) / 60).toInt()
    }

    // o mesmo painel que o celular manda (bolso.painel)
    fun painel(agora: Long): JSONObject {
        val feitas = itens.sumOf { feitas(it) }
        val total = itens.sumOf { it.series.size }
        val out = JSONObject().put("v", 1).put("ativo", true).put("semCelular", true).put("treino", nome)
            .put("feitas", feitas).put("total", total).put("agora", agora)
            .put("descansoAte", if (fimDesc > agora) fimDesc else 0L)
        val f = falta(agora)
        if (f > 0 && feitas < total) out.put("falta", f)
        val a = alvo() ?: return out.put("fim", true)
        val it = itens[a.first]
        val s = it.series.getOrNull(a.second) ?: Serie(false, "", "", "", false, false)
        val trab = it.series.filter { !it.drop }
        val ant = it.series.take(a.second).lastOrNull { it.feito && !it.drop }
        out.put("ei", a.first).put("si", a.second).put("uid", it.u).put("ex", it.nome).put("drop", s.drop)
            .put("n", if (s.drop) 0 else trab.indexOf(s) + 1).put("de", trab.size)
            .put("tempo", it.tempo).put("cardio", it.cardio)
            .put("peso", peso(s.peso.ifEmpty { ant?.peso ?: "" }))
            .put("reps", reps(s.reps.ifEmpty { ant?.reps ?: "" }))
            .put("seg", (s.seg.ifEmpty { ant?.seg ?: "" }).toIntOrNull() ?: 0)
            .put("passo", 1).put("rec", it.rec)
        if (ant != null && (ant.peso.isNotEmpty() || ant.reps.isNotEmpty() || ant.seg.isNotEmpty())) {
            out.put("ant", if (ant.seg.isNotEmpty() && ant.reps.isEmpty()) ant.seg + " s"
                else (if (ant.peso.isNotEmpty()) num(peso(ant.peso)).replace('.', ',') + " kg × " else "") + ant.reps)
        }
        val prox = itens.withIndex().firstOrNull { (k, x) -> k > a.first && !x.pulado && x.series.any { !it.feito } }
            ?: itens.withIndex().firstOrNull { (k, x) -> k != a.first && !x.pulado && x.series.any { !it.feito } }
        out.put("prox", prox?.value?.nome ?: "")
        return out
    }

    // Um toque do relógio, aplicado aqui. Devolve se mudou o treino.
    fun acao(j: JSONObject, agora: Long): Boolean {
        when (j.optString("a")) {
            "feito" -> return feito(j, agora)
            "terminar" -> return terminar(j)
            "desfazer" -> return desfazer()
            "mais" -> { fimDesc = maxOf(fimDesc, agora) + 30_000L }
            "menos" -> { if (fimDesc > 0) fimDesc = maxOf(agora + 5000L, fimDesc - 15_000L) }
            "pular" -> { fimDesc = 0L }
            "proximo", "anterior" -> {
                val a = alvo()
                val ei = a?.first ?: maxOf(0, foco)
                val passo = if (j.optString("a") == "proximo") 1 else -1
                val n = itens.size
                for (k in 1 until n) {
                    val i = ((ei + passo * k) % n + n) % n
                    if (!itens[i].pulado && itens[i].series.any { !it.feito }) { foco = i; break }
                }
            }
        }
        return false
    }

    private fun feito(j: JSONObject, agora: Long): Boolean {
        val pedido = j.optInt("ei", -1)
        val ei = if (pedido in itens.indices && pendente(itens[pedido]) >= 0) pedido else (alvo()?.first ?: return false)
        val it = itens[ei]
        var si = it.series.indexOfFirst { !it.feito }
        if (si < 0) {
            val ult = it.series.lastOrNull()
            it.series.add(Serie(false, ult?.peso ?: "", ult?.reps ?: "", ult?.seg ?: "", false, false))
            si = it.series.size - 1
        }
        val s = it.series[si]
        val ev = JSONObject().put("t", "a").put("u", it.u).put("i", si)
        if (it.tempo) {
            val sg = j.optInt("sg", 0).takeIf { v -> v in 1..36000 } ?: (s.seg.toIntOrNull() ?: 0)
            if (sg <= 0) return false
            s.seg = sg.toString(); ev.put("sg", s.seg)
        } else {
            val r = j.optInt("r", 0).takeIf { v -> v in 1..1000 } ?: reps(s.reps)
            if (r <= 0) return false
            s.reps = r.toString(); ev.put("r", s.reps)
            val p = j.optDouble("p", 0.0)
            if (p > 0 && p <= 2000) { s.peso = num(p); ev.put("p", s.peso) }
        }
        if (s.aquec) ev.put("aq", 1)
        s.feito = true
        j.optString("k").takeIf { k -> k.isNotEmpty() }?.let { k -> ev.put("k", k) }
        eventos.put(ev)
        val p = peso(s.peso)
        if (!s.aquec && it.rec > 0 && p > it.rec) it.rec = p
        foco = ei
        ultimoEi = ei; ultimoSi = si
        val seguinte = itens.getOrNull(ei + 1)
        val noConjunto = it.conjunto.isNotEmpty() && seguinte != null && seguinte.conjunto == it.conjunto && seguinte.series.any { !it.feito }
        val dropAgora = it.series.getOrNull(si + 1)?.let { x -> x.drop && !x.feito } == true
        fimDesc = if (!temPendente() || dropAgora || noConjunto) 0L else agora + it.desc * 1000L
        return true
    }

    // Terminei o aeróbico: sem o celular não há esteira nem ▶ para medir, a
    // série fica feita com o que já tinha
    private fun terminar(j: JSONObject): Boolean {
        val pedido = j.optInt("ei", -1)
        val vale = { k: Int -> k in itens.indices && itens[k].cardio && pendente(itens[k]) >= 0 }
        val ei = if (vale(pedido)) pedido else itens.indices.firstOrNull { vale(it) } ?: return false
        val it = itens[ei]
        val si = it.series.indexOfFirst { !it.feito }
        it.series[si].feito = true
        val ev = JSONObject().put("t", "f").put("u", it.u).put("i", si)
        j.optString("k").takeIf { k -> k.isNotEmpty() }?.let { k -> ev.put("k", k) }
        eventos.put(ev)
        foco = ei
        ultimoEi = ei; ultimoSi = si
        fimDesc = 0L
        return true
    }

    private fun desfazer(): Boolean {
        val it = itens.getOrNull(ultimoEi) ?: return false
        val s = it.series.getOrNull(ultimoSi) ?: return false
        if (!s.feito) return false
        s.feito = false
        // anotado aqui e ainda não entregue: some sem deixar rastro
        val ult = if (eventos.length() > 0) eventos.optJSONObject(eventos.length() - 1) else null
        if (ult != null && ult.optString("u") == it.u && ult.optInt("i", -1) == ultimoSi && (ult.optString("t") == "a" || ult.optString("t") == "f"))
            eventos.remove(eventos.length() - 1)
        else eventos.put(JSONObject().put("t", "x").put("u", it.u).put("i", ultimoSi))
        foco = ultimoEi
        ultimoEi = -1; ultimoSi = -1
        fimDesc = 0L
        return true
    }
}
