package br.com.treinolivre.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.widget.Toast
import com.meta.wearable.dat.camera.Camera
import com.meta.wearable.dat.camera.addCamera
import com.meta.wearable.dat.camera.types.StreamConfiguration
import com.meta.wearable.dat.camera.types.VideoFrame
import com.meta.wearable.dat.camera.types.VideoQuality
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import java.io.ByteArrayOutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

// O estado dos óculos, visto pelo site em /estado e no cabeçalho de cada quadro.
object Oculos {
    @Volatile var estado = "iniciando"
        set(v) { val mudou = field != v; field = v; if (mudou) aoMudar?.invoke(v) }
    @Volatile var aoMudar: ((String) -> Unit)? = null
    @Volatile var quadro: ByteArray? = null
    @Volatile var numero = 0L
    @Volatile var ultimoPedido = 0L
    private val iniciado = AtomicBoolean(false)

    fun iniciar(contexto: Context): Boolean {
        if (iniciado.get()) return true
        var ok = false
        Wearables.initialize(contexto)
            .onSuccess { ok = true }
            .onFailure { _, _ -> ok = false }
        if (ok) iniciado.set(true)
        return ok
    }
}

// Mantém a sessão com os óculos e serve o quadro mais novo em
// http://127.0.0.1:47890, só para quem mostrar a chave sorteada pela página
// (e só a página do Treino Livre consegue ler: o CORS é do site dele).
// Para sozinho quando a página deixa de pedir quadros por 20 s — fechar o
// Eyes Scan, fechar o app, apagar a tela — e a notificação tem o "Parar".
class OculosService : Service() {
    companion object {
        const val PORTA = 47890
        private const val CANAL = "oculos"
        const val PARAR = "br.com.treinolivre.app.OCULOS_PARAR"
        private const val ORIGEM = "https://carlosjr81.github.io"

        fun ligar(contexto: Context, chave: String) {
            contexto.startForegroundService(Intent(contexto, OculosService::class.java).putExtra("k", chave))
        }
    }

    private val escopo = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile private var chave = ""
    private var servidor: ServerSocket? = null
    private var sessao: DeviceSession? = null
    private var camera: Camera? = null
    private var rodando = false
    @Volatile private var ultimoEnvio = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            val canal = NotificationChannel(CANAL, "Câmera dos óculos", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(1, aviso(), ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
            } else {
                startForeground(1, aviso())
            }
        } catch (e: Exception) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action == PARAR) { encerrar(); return START_NOT_STICKY }

        // A página fala com o serviço pelo canal do TWA: "vivo" mantém a
        // câmera ligada, "parar" desliga.
        Canal.aoMensagem = { m ->
            when {
                m.startsWith("vivo") -> Oculos.ultimoPedido = System.currentTimeMillis()
                m.startsWith("parar") -> Handler(Looper.getMainLooper()).post { encerrar() }
            }
        }
        Oculos.aoMudar = { e ->
            Canal.enviar("E:" + e)
            val frase = when (e) {
                "procurando" -> "Óculos: procurando os óculos…"
                "conectando" -> "Óculos: conectando à câmera…"
                "transmitindo" -> "Óculos: imagem chegando ✓"
                "sem-oculos" -> "Óculos: não achei os óculos (ligados, no rosto e conectados ao Meta AI?)"
                "sem-permissao" -> "Óculos: a câmera dos óculos não foi liberada no Meta AI"
                "erro" -> "Óculos: a conexão falhou"
                else -> null
            }
            if (frase != null) Handler(Looper.getMainLooper()).post { Toast.makeText(applicationContext, frase, Toast.LENGTH_LONG).show() }
        }
        val nova = intent?.getStringExtra("k").orEmpty()
        if (nova.length >= 16) chave = nova
        Oculos.ultimoPedido = System.currentTimeMillis()
        if (!rodando) {
            rodando = true
            Toast.makeText(applicationContext, "Óculos: serviço ligado", Toast.LENGTH_SHORT).show()
            abrirServidor()
            escopo.launch {
                try { conectar() } catch (e: Exception) {
                    Oculos.estado = "erro"
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(applicationContext, "Óculos: " + (e.message ?: e.javaClass.simpleName), Toast.LENGTH_LONG).show()
                    }
                }
            }
            escopo.launch { vigiar() }
        }
        return START_NOT_STICKY
    }

    private fun aviso(): Notification {
        val parar = PendingIntent.getService(
            this, 0, Intent(this, OculosService::class.java).setAction(PARAR),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return Notification.Builder(this, CANAL)
            .setContentTitle("Treino Livre: câmera dos óculos ligada")
            .setContentText("O Eyes Scan está contando pela câmera dos seus óculos.")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Parar", parar).build())
            .build()
    }

    // ---- os óculos ----
    private suspend fun conectar() {
        Oculos.estado = "procurando"
        var criada: DeviceSession? = null
        Wearables.createSession(AutoDeviceSelector())
            .onSuccess { criada = it }
            .onFailure { _, _ -> Oculos.estado = "sem-oculos" }
        val s = criada ?: return
        sessao = s
        s.start()
        val pronta = withTimeoutOrNull(30_000L) { s.state.first { it == DeviceSessionState.STARTED } }
        if (pronta == null) { Oculos.estado = "sem-oculos"; return }

        Oculos.estado = "conectando"
        s.addCamera(StreamConfiguration(videoQuality = VideoQuality.LOW, frameRate = 15))
            .onSuccess { cam ->
                camera = cam
                escopo.launch { cam.stream.videoStream.collect { quadro -> receber(quadro) } }
                cam.stream.start().onFailure { _, _ -> Oculos.estado = "erro" }
            }
            .onFailure { _, _ -> Oculos.estado = "sem-permissao" }
    }

    // A cor: o arranjo YUV do quadro é descoberto nos primeiros quadros
    // (CoresYuv). Até a decisão, a imagem sai em tons de cinza.
    private val votos = IntArray(4)
    @Volatile private var arranjo = -1

    private fun receber(f: VideoFrame) {
        if (f.isCompressed) return
        val w = f.width
        val h = f.height
        if (w <= 0 || h <= 0) return
        val buf = f.buffer.duplicate()
        val total = buf.remaining()
        // passo da linha: o tamanho exato de um YUV 4:2:0 sem folga, ou com folga no fim de cada linha
        val passo = if (total >= w * h * 3 / 2) maxOf(w, (total * 2 / 3) / h) else w
        if (total < passo * (h - 1) + w) return
        val dados = ByteArray(total)
        buf.get(dados)
        if (arranjo < 0) {
            val v = CoresYuv.votar(dados, w, h, passo)
            if (v >= 0) {
                votos[v]++
                val melhor = votos.indices.maxByOrNull { votos[it] } ?: 0
                if (votos[melhor] >= 6) arranjo = melhor
            }
        }
        val nv21 = ByteArray(w * h * 3 / 2)
        CoresYuv.paraNv21(dados, w, h, passo, arranjo, nv21)
        val saida = ByteArrayOutputStream(w * h / 4)
        YuvImage(nv21, ImageFormat.NV21, w, h, null).compressToJpeg(Rect(0, 0, w, h), 70, saida)
        val jpg = saida.toByteArray()
        Oculos.quadro = jpg
        // pelo canal do TWA, no máximo uns 12 quadros por segundo
        val agora = System.currentTimeMillis()
        if (agora - ultimoEnvio >= 80L && Canal.pronto) {
            ultimoEnvio = agora
            Canal.enviar("Q:" + android.util.Base64.encodeToString(jpg, android.util.Base64.NO_WRAP))
        }
        Oculos.numero++
        Oculos.estado = "transmitindo"
    }

    // A página parou de pedir: o Eyes Scan fechou. Nada de câmera ligada à toa.
    private suspend fun vigiar() {
        while (rodando) {
            delay(5_000L)
            if (System.currentTimeMillis() - Oculos.ultimoPedido > 20_000L) { encerrar(); return }
        }
    }

    // ---- o servidor local ----
    private fun abrirServidor() {
        Thread {
            val s = try {
                ServerSocket().apply {
                    reuseAddress = true
                    bind(java.net.InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORTA), 8)
                }
            } catch (e: Exception) {
                Oculos.estado = "erro"
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(applicationContext, "Óculos: não consegui abrir a porta local (" + (e.message ?: e.javaClass.simpleName) + ")", Toast.LENGTH_LONG).show()
                }
                return@Thread
            }
            servidor = s
            while (!s.isClosed) {
                val cliente = try { s.accept() } catch (e: Exception) { break }
                Thread { atender(cliente) }.start()
            }
        }.apply { isDaemon = true }.start()
    }

    private fun atender(c: Socket) {
        c.use { sock ->
            sock.soTimeout = 5_000
            val entrada = sock.getInputStream().bufferedReader(Charsets.ISO_8859_1)
            val primeira = entrada.readLine() ?: return
            while (true) { val l = entrada.readLine() ?: break; if (l.isEmpty()) break }
            val partes = primeira.split(" ")
            if (partes.size < 2) return
            val metodo = partes[0]
            val alvo = partes[1]
            val caminho = alvo.substringBefore("?")
            val k = Regex("[?&]k=([^&]+)").find(alvo)?.groupValues?.get(1).orEmpty()
            val saida = sock.getOutputStream()
            val comuns = "Access-Control-Allow-Origin: $ORIGEM\r\n" +
                "Access-Control-Allow-Private-Network: true\r\n" +
                "Access-Control-Allow-Methods: GET\r\n" +
                "Access-Control-Expose-Headers: X-Estado, X-Quadro\r\n" +
                "Cache-Control: no-store\r\nConnection: close\r\n"
            if (metodo == "OPTIONS") {
                saida.write("HTTP/1.1 204 No Content\r\n${comuns}Content-Length: 0\r\n\r\n".toByteArray()); return
            }
            if (chave.isEmpty() || k != chave) {
                saida.write("HTTP/1.1 403 Forbidden\r\n${comuns}Content-Length: 0\r\n\r\n".toByteArray()); return
            }
            Oculos.ultimoPedido = System.currentTimeMillis()
            val cab = comuns + "X-Estado: ${Oculos.estado}\r\nX-Quadro: ${Oculos.numero}\r\n"
            when (caminho) {
                "/quadro.jpg" -> {
                    val q = Oculos.quadro
                    if (q == null) saida.write("HTTP/1.1 204 No Content\r\n${cab}Content-Length: 0\r\n\r\n".toByteArray())
                    else {
                        saida.write("HTTP/1.1 200 OK\r\n${cab}Content-Type: image/jpeg\r\nContent-Length: ${q.size}\r\n\r\n".toByteArray())
                        saida.write(q)
                    }
                }
                "/estado" -> {
                    val corpo = "{\"estado\":\"${Oculos.estado}\",\"quadros\":${Oculos.numero}}".toByteArray()
                    saida.write("HTTP/1.1 200 OK\r\n${cab}Content-Type: application/json\r\nContent-Length: ${corpo.size}\r\n\r\n".toByteArray())
                    saida.write(corpo)
                }
                "/parar" -> {
                    saida.write("HTTP/1.1 204 No Content\r\n${cab}Content-Length: 0\r\n\r\n".toByteArray())
                    encerrar()
                }
                else -> saida.write("HTTP/1.1 404 Not Found\r\n${cab}Content-Length: 0\r\n\r\n".toByteArray())
            }
            saida.flush()
        }
    }

    // ---- fim ----
    @Synchronized private fun encerrar() {
        if (!rodando && servidor == null) { stopSelf(); return }
        rodando = false
        try { camera?.stop() } catch (e: Exception) { }
        try { sessao?.stop() } catch (e: Exception) { }
        camera = null
        sessao = null
        try { servidor?.close() } catch (e: Exception) { }
        servidor = null
        Oculos.quadro = null
        Canal.enviar("E:parado")
        Canal.aoMensagem = null
        Oculos.estado = "iniciando"
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        encerrar()
        escopo.cancel()
        super.onDestroy()
    }
}
