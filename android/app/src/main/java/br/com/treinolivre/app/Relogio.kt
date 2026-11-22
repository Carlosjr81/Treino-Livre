package br.com.treinolivre.app

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

// O relógio (Galaxy Watch e outros com Wear OS): o app do relógio é um
// controle remoto do Jarvis da tela travada (BolsoService). Quem guarda a
// cópia do treino e conta o descanso continua sendo o celular; o relógio
// mostra o painel e manda os toques.
//
// Celular → relógio: o painel, num dado sincronizado (/treino/estado), que o
// relógio lê ao abrir e recebe a cada mudança; e os alertas (/treino/alerta:
// "fim" e "dez" do descanso), que fazem o relógio vibrar.
// Relógio → celular: os botões, numa mensagem (/treino/acao).
//
// Nada passa por servidor: é o Bluetooth entre os dois, pelo Google Play
// Services (no Galaxy, pelo app Galaxy Wearable). Sem relógio, tudo aqui
// falha calado.
object Relogio {
    const val ESTADO = "/treino/estado"
    const val ALERTA = "/treino/alerta"
    const val ACAO = "/treino/acao"
    // o relógio treinou sem o celular (2026-11-17b): ele manda o que anotou, e
    // o celular confirma o que guardou (e se o Jarvis está ligado)
    const val SEM_CELULAR = "/treino/sem-celular"
    const val SEM_CELULAR_OK = "/treino/sem-celular-ok"
    // a atualização com um toque (2026-11-13b): o relógio diz a versão dele e
    // ouve a do celular; pede para ser atualizado mandando o endereço no Wi-Fi
    const val VERSAO = "/treino/versao"
    const val CELULAR = "/treino/celular"
    const val ATUALIZAR = "/treino/atualizar"
    const val TELA_ATUALIZAR = "treinolivre://relogio-atualizar"
    // o endereço do relógio no Wi-Fi, que ele mesmo mandou (o instalador usa)
    @Volatile var dicaHost: String? = null
    @Volatile var dicaEm = 0L
    // as portas abertas que o relógio achou nele mesmo (2026-11-18b)
    const val PORTAS = "/treino/portas"
    @Volatile var dicaPortas: List<Int> = emptyList()
    // Celular → relógio: o andamento da instalação ("pct|etapa|texto"), para a
    // tela de atualizar do relógio mostrar o mesmo painel (2026-11-20j)
    const val PROGRESSO = "/treino/progresso"
    fun progresso(contexto: Context, pct: Int, etapa: String, texto: String) {
        val dados = (pct.toString() + "|" + etapa + "|" + texto).toByteArray(Charsets.UTF_8)
        try {
            Wearable.getNodeClient(contexto).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no -> Wearable.getMessageClient(contexto).sendMessage(no.id, PROGRESSO, dados).addOnFailureListener { } }
            }
        } catch (e: Exception) { }
    }

    fun versaoDoCelular(contexto: Context): Long = try {
        val i = contexto.packageManager.getPackageInfo(contexto.packageName, 0)
        if (android.os.Build.VERSION.SDK_INT >= 28) i.longVersionCode else @Suppress("DEPRECATION") i.versionCode.toLong()
    } catch (e: Exception) { 0L }

    // O relógio pediu para ser atualizado: abre o instalador no modo automático.
    // O Android só deixa um serviço abrir tela com "Aparecer sobre outros apps";
    // sem ela, uma notificação que abre com um toque.
    fun abrirAtualizacao(contexto: Context) {
        val uri = android.net.Uri.parse("treinolivre://instalar-relogio?auto=1")
        val abrir = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
            .setPackage(contexto.packageName)
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (android.os.Build.VERSION.SDK_INT >= 23 && android.provider.Settings.canDrawOverlays(contexto)) {
            try { contexto.startActivity(abrir); return } catch (e: Exception) { }
        }
        try {
            val nm = contexto.getSystemService(android.app.NotificationManager::class.java) ?: return
            nm.createNotificationChannel(android.app.NotificationChannel("relogio-atualizar", "Atualizar o relógio", android.app.NotificationManager.IMPORTANCE_HIGH))
            val pi = android.app.PendingIntent.getActivity(contexto, 77, abrir,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
            val n = androidx.core.app.NotificationCompat.Builder(contexto, "relogio-atualizar")
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle("⌚ Atualizar o app do relógio")
                .setContentText("Toque aqui: o celular instala sozinho.")
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()
            nm.notify(77, n)
        } catch (e: Exception) { }
    }

    fun publicar(contexto: Context, json: String) {
        // o widget da tela inicial mostra o mesmo painel
        WidgetTreino.guardar(contexto, json)
        try {
            val pedido = PutDataMapRequest.create(ESTADO).apply {
                dataMap.putString("json", json)
                // sem isto, o mesmo painel duas vezes não chega como mudança
                dataMap.putLong("t", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(contexto).putDataItem(pedido).addOnFailureListener { }
        } catch (e: Exception) { }
    }

    fun alertar(contexto: Context, tipo: String) {
        try {
            Wearable.getNodeClient(contexto).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no ->
                    Wearable.getMessageClient(contexto).sendMessage(no.id, ALERTA, tipo.toByteArray(Charsets.UTF_8)).addOnFailureListener { }
                }
            }.addOnFailureListener { }
        } catch (e: Exception) { }
    }

    // Pedido do dono: "sempre que estiver usando o app no celular, ele já abre
    // também automaticamente no relógio". O treino começou (o Jarvis 🔒 ligou):
    // a tela do Treino Livre abre em todo relógio conectado que tem o app.
    // Sem relógio, ou sem o app nele, não acontece nada.
    fun abrirNoRelogio(contexto: Context, endereco: String = "treinolivre://relogio-tela", aoResultado: ((String) -> Unit)? = null) {
        try {
            val intencao = android.content.Intent(android.content.Intent.ACTION_VIEW)
                .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
                .setData(android.net.Uri.parse(endereco))
            val f = androidx.wear.remote.interactions.RemoteActivityHelper(contexto, java.util.concurrent.Executors.newSingleThreadExecutor())
                .startRemoteActivity(intencao, null)
            if (aoResultado != null) f.addListener({
                val r = try { f.get(); "aberto" } catch (e: Exception) { "falhou: " + (e.cause?.message ?: e.message ?: e.javaClass.simpleName) }
                aoResultado(r)
            }, java.util.concurrent.Executors.newSingleThreadExecutor())
        } catch (e: Exception) { aoResultado?.invoke("falhou: " + (e.message ?: e.javaClass.simpleName)) }
    }

    // O relógio junto do celular (2026-11-20p, pedido do dono: "chamar sempre
    // o relógio quando a tela do celular estiver no Treino Livre, para
    // funcionarem simultaneamente"): ao abrir o app e a cada série marcada na
    // tela do celular, a tela do treino abre no relógio. No máximo uma vez por
    // minuto, para não arrancar o relógio de outra coisa a cada toque.
    @Volatile private var chamouEm = 0L
    fun chamarRelogio(contexto: Context) {
        val agora = System.currentTimeMillis()
        if (agora - chamouEm < 60_000L) return
        chamouEm = agora
        val app = contexto.applicationContext
        abrirNoRelogio(app) { r ->
            android.util.Log.i("TreinoLivre", "Relógio chamado: " + r)
            try { app.getSharedPreferences("relogio", Context.MODE_PRIVATE).edit().putString("chamada", r).putLong("chamadaEm", System.currentTimeMillis()).apply() } catch (e: Exception) { }
        }
    }

    // A atualização sem toque (pedido do dono, 2026-11-18e: "quando a
    // atualização for para o celular e o relógio, já busque o relógio e
    // atualize sem precisar apertar mais nada"). Toda vez que o relógio diz a
    // versão (ao abrir o app nele, ou respondendo ao /treino/qual-versao que
    // o celular manda logo depois de ser atualizado), o celular compara com a
    // dele. Relógio mais velho, celular já pareado e nenhum treino em
    // andamento: abre a tela de atualizar no relógio, que liga a depuração e
    // manda o endereço e a porta; o celular abre o instalador no modo
    // automático (sozinho, com "Aparecer sobre outros apps"; senão, uma
    // notificação). No treino, espera o treino acabar (BolsoService.encerrar).
    // Uma tentativa a cada 3 h por versão: um relógio fora do Wi-Fi não vira
    // uma tela abrindo sem parar.
    const val QUAL_VERSAO = "/treino/qual-versao"

    fun perguntarVersao(contexto: Context) {
        try {
            Wearable.getNodeClient(contexto).connectedNodes.addOnSuccessListener { nos ->
                nos.forEach { no -> Wearable.getMessageClient(contexto).sendMessage(no.id, QUAL_VERSAO, ByteArray(0)) }
            }
        } catch (e: Exception) { }
    }

    fun talvezAtualizar(contexto: Context) {
        if (!InstaladorRelogio.ATUALIZA_PELO_WIFI || InstaladorRelogio.aberto) return
        if (BolsoService.instancia != null) return
        // o celular se atualiza sozinho de tela apagada (de madrugada, 2026-11-22g):
        // a tela de atualizar não acende no pulso de quem dorme. Fica para quando
        // o celular estiver em uso (a conferida de 3 em 3 horas pergunta de novo)
        val tela = contexto.getSystemService(android.os.PowerManager::class.java)
        if (tela != null && !tela.isInteractive) return
        val pr = contexto.getSharedPreferences("relogio", Context.MODE_PRIVATE)
        val rel = pr.getLong("versao", 0L) - 1_000_000L
        val meu = versaoDoCelular(contexto)
        if (rel <= 0L || meu <= rel) return
        if (!contexto.getSharedPreferences("instalador", Context.MODE_PRIVATE).getBoolean("pareado", false)) return
        val agora = System.currentTimeMillis()
        if (pr.getLong("autoVersao", 0L) == meu && agora - pr.getLong("autoEm", 0L) < 3 * 3600_000L) return
        pr.edit().putLong("autoVersao", meu).putLong("autoEm", agora).apply()
        BolsoService.diario(contexto, "relógio na versão $rel, celular na $meu: atualizando o relógio sozinho")
        abrirNoRelogio(contexto, TELA_ATUALIZAR)
    }

    fun desligado(contexto: Context, semJarvis: Boolean = false) =
        publicar(contexto, JSONObject().put("v", 1).put("ativo", false).apply { if (semJarvis) put("semJarvis", true) }.toString())
}

// Os toques do relógio chegam aqui (o Google Play Services acorda o app) e vão
// para o Jarvis da tela travada. Sem ele ligado não há treino para mexer, e o
// relógio diz como começar.
// O app do celular acabou de ser atualizado: pergunta a versão do relógio
// (o relógio novo responde sem abrir tela) e, se ele não responder em 10 s
// (o app do relógio antigo não sabe responder), abre o app nele, que diz a
// versão ao abrir. A resposta passa pelo talvezAtualizar.
class CelularAtualizado : android.content.BroadcastReceiver() {
    override fun onReceive(c: Context, i: android.content.Intent?) {
        if (i?.action != android.content.Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (!InstaladorRelogio.ATUALIZA_PELO_WIFI) return
        val ctx = c.applicationContext
        if (!ctx.getSharedPreferences("instalador", Context.MODE_PRIVATE).getBoolean("pareado", false)) return
        val pr = ctx.getSharedPreferences("relogio", Context.MODE_PRIVATE)
        val antes = pr.getLong("em", 0L)
        Relogio.perguntarVersao(ctx)
        val fim = goAsync()
        Handler(Looper.getMainLooper()).postDelayed({
            if (pr.getLong("em", 0L) == antes) Relogio.abrirNoRelogio(ctx)
            fim.finish()
        }, 9_000L)
    }
}

// O relógio chama o celular por mensagem. O sistema entrega acordando o
// OuvinteRelogio; o Xiaomi (e Oppo, Vivo, Huawei...) barra esse acordar sem o
// "Início automático" ligado, e o relógio ficava em "Procurando o celular…"
// (relato do dono, 2026-11-19a, Redmi + Galaxy Watch 6). Então, com o Jarvis
// 🔒 ligado (o treino aberto), o BolsoService também ouve, por um ouvinte vivo
// no próprio processo, que nenhuma marca barra. Os dois caminhos podem receber
// a mesma mensagem: o requestId de cada uma é guardado e ela só vale uma vez.
object OuvidoRelogio {
    private val vistos = LinkedHashSet<String>()
    private var ouvinte: com.google.android.gms.wearable.MessageClient.OnMessageReceivedListener? = null

    @Synchronized fun primeiraVez(m: MessageEvent): Boolean {
        val id = m.sourceNodeId + ":" + m.requestId + ":" + m.path + ":" + m.data.size
        if (!vistos.add(id)) return false
        while (vistos.size > 200) vistos.remove(vistos.first())
        return true
    }

    fun ligar(contexto: Context) {
        if (ouvinte != null) return
        val c = contexto.applicationContext
        val o = com.google.android.gms.wearable.MessageClient.OnMessageReceivedListener { m -> OuvinteRelogio.tratar(c, m) }
        ouvinte = o
        try { Wearable.getMessageClient(c).addListener(o) } catch (e: Exception) { ouvinte = null }
    }

    fun desligar(contexto: Context) {
        val o = ouvinte ?: return
        ouvinte = null
        try { Wearable.getMessageClient(contexto.applicationContext).removeListener(o) } catch (e: Exception) { }
    }
}

class OuvinteRelogio : WearableListenerService() {
    override fun onMessageReceived(m: MessageEvent) = tratar(applicationContext, m)

    companion object {
    fun tratar(contexto: Context, m: MessageEvent) {
        if (!m.path.startsWith("/treino")) return
        if (!OuvidoRelogio.primeiraVez(m)) return
        if (m.path == Relogio.VERSAO) {
            // guarda a versão do relógio (o site mostra se há versão nova) e
            // responde com a do celular: o relógio oferece o ⬆ Atualizar
            val v = String(m.data, Charsets.UTF_8).trim().toLongOrNull() ?: 0L
            contexto.getSharedPreferences("relogio", Context.MODE_PRIVATE).edit().putLong("versao", v).putLong("em", System.currentTimeMillis()).apply()
            val meu = if (InstaladorRelogio.ATUALIZA_PELO_WIFI) Relogio.versaoDoCelular(contexto) else 0L
            try { Wearable.getMessageClient(contexto).sendMessage(m.sourceNodeId, Relogio.CELULAR, meu.toString().toByteArray(Charsets.UTF_8)) } catch (e: Exception) { }
            Handler(Looper.getMainLooper()).post { Relogio.talvezAtualizar(contexto) }
            return
        }
        if (m.path == Relogio.PORTAS) {
            val t = String(m.data, Charsets.UTF_8).trim()
            val ip = t.substringBefore("|")
            val ps = t.substringAfter("|", "").split(",").mapNotNull { it.trim().toIntOrNull() }.filter { it in 1..65535 }
            // A busca do relógio antigo (app 1000126) dava mais de mil portas
            // "abertas": o Bluetooth do relógio aceita a conexão por ele
            // (relato do dono, 2026-11-20j). A Depuração por Wi-Fi abre uma ou
            // duas; uma lista grande é falsa, e vale só o endereço.
            if (ip.isNotEmpty()) { Relogio.dicaHost = ip; Relogio.dicaEm = System.currentTimeMillis() }
            Relogio.dicaPortas = if (ps.size in 1..6) ps else emptyList()
            return
        }
        if (m.path == Relogio.ATUALIZAR) {
            val ip = String(m.data, Charsets.UTF_8).trim()
            if (ip.isNotEmpty()) { Relogio.dicaHost = ip; Relogio.dicaEm = System.currentTimeMillis() }
            // o instalador já aberto pega o endereço sozinho; senão, abre
            if (!InstaladorRelogio.aberto) Relogio.abrirAtualizacao(contexto)
            return
        }
        if (m.path == Relogio.SEM_CELULAR) {
            val j = try { JSONObject(String(m.data, Charsets.UTF_8)) } catch (e: Exception) { return }
            val ev = j.optJSONArray("ev") ?: org.json.JSONArray()
            val no = m.sourceNodeId
            Handler(Looper.getMainLooper()).post {
                val n = BolsoService.guardarDoRelogio(contexto, ev, j.optInt("foco", -1), j.optLong("da", 0L))
                val s = BolsoService.instancia
                if (s != null) s.incorporarRelogio() else if (n > 0) BolsoService.avisarRelogio(contexto, n)
                val ks = org.json.JSONArray()
                for (i in 0 until ev.length()) ev.optJSONObject(i)?.optString("k")?.let { if (it.isNotEmpty()) ks.put(it) }
                val ok = JSONObject().put("ks", ks).put("ativo", s != null).toString().toByteArray(Charsets.UTF_8)
                try { Wearable.getMessageClient(contexto).sendMessage(no, Relogio.SEM_CELULAR_OK, ok) } catch (e: Exception) { }
            }
            return
        }
        if (m.path != Relogio.ACAO) return
        val texto = String(m.data, Charsets.UTF_8)
        // o batimento do descanso (2026-11-22f): sem o treino aberto aqui, não
        // há para onde levar, e não pode desligar o relógio por isso
        val ehFc = try { JSONObject(texto).optString("a") == "fc" } catch (e: Exception) { false }
        Handler(Looper.getMainLooper()).post {
            val s = BolsoService.instancia
            if (ehFc) { s?.acaoRelogio(texto); return@post }
            // sem o Jarvis ligado: o celular religou sem o treino (a bateria tinha
            // acabado). O relógio pode seguir com a cópia dele (semJarvis);
            // o Finalizar treino desliga sem essa marca.
            if (s != null) s.acaoRelogio(texto) else Relogio.desligado(contexto, true)
        }
    }
    }
}
