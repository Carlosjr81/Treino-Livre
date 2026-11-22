package br.com.treinolivre.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.os.PowerManager
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

// O app do celular se atualiza sozinho (2026-11-22g, pedido do dono: "sempre
// que houver nova atualização, ele já atualiza automaticamente o relógio e o app
// do celular"). Sem toque nenhum:
// - a cada 3 horas (e ao abrir o app) o Android confere o número da última
//   versão publicada (o caminho do "latest" no GitHub, …/android-N/…);
// - há versão nova: baixa para dentro do app, em silêncio;
// - instala só quando é seguro: tela apagada e nenhum treino, corrida, óculos
//   ou instalação do relógio em andamento (instalar fecha o app). Senão,
//   tenta de novo em 15 minutos;
// - no Android 12 ou mais novo, a instalação vai sem perguntar
//   (USER_ACTION_NOT_REQUIRED), porque quem instalou a versão de antes foi o
//   próprio app. Quando o Android ainda pede a confirmação (a primeira vez, ou
//   o app instalado à mão pelo navegador), chega uma notificação "toque para
//   atualizar": um toque só.
// - instalado, o MY_PACKAGE_REPLACED (CelularAtualizado) atualiza o relógio
//   sozinho, como já fazia.
object AtualizaSozinho {
    private const val JOB_PERIODICO = 7101
    private const val JOB_AGORA = 7102
    private const val CANAL = "atualizacao"
    private const val PREFS = "atualizacao"

    // ao abrir o app: garante a conferida de 3 em 3 horas, e confere já (no
    // máximo uma vez por hora)
    fun agendar(c: Context) {
        val ctx = c.applicationContext
        val js = ctx.getSystemService(JobScheduler::class.java) ?: return
        val comp = ComponentName(ctx, TrabalhoAtualizar::class.java)
        try {
            if (js.getPendingJob(JOB_PERIODICO) == null) {
                js.schedule(JobInfo.Builder(JOB_PERIODICO, comp)
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPeriodic(3 * 3600_000L)
                    .setPersisted(true)
                    .build())
            }
        } catch (e: Exception) { }
        val pr = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (System.currentTimeMillis() - pr.getLong("conferidoEm", 0L) > 3600_000L) depois(ctx, 0L)
    }

    // uma conferida avulsa, daqui a "atraso" ms (com internet)
    fun depois(c: Context, atraso: Long) {
        val ctx = c.applicationContext
        val js = ctx.getSystemService(JobScheduler::class.java) ?: return
        try {
            js.schedule(JobInfo.Builder(JOB_AGORA, ComponentName(ctx, TrabalhoAtualizar::class.java))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setMinimumLatency(atraso)
                .build())
        } catch (e: Exception) { }
    }

    // é seguro instalar agora? (instalar fecha o app)
    fun seguro(c: Context): Boolean {
        val pm = c.getSystemService(PowerManager::class.java)
        if (pm != null && pm.isInteractive) return false
        if (BolsoService.instancia != null || CorridaService.instancia != null) return false
        if (InstaladorRelogio.aberto) return false
        return true
    }

    private fun meuNumero(c: Context) = try { c.packageManager.getPackageInfo(c.packageName, 0).longVersionCode } catch (e: Throwable) { 0L }

    // o número da última versão publicada: o "latest" do GitHub responde com o
    // endereço da versão (…/download/android-N/…), sem precisar baixar nada
    private fun ultimaPublicada(): Int {
        var url = URL(AtualizarApp.APK)
        repeat(4) {
            val con = url.openConnection() as HttpURLConnection
            con.instanceFollowRedirects = false
            con.useCaches = false
            con.setRequestProperty("Cache-Control", "no-cache")
            con.connectTimeout = 15000; con.readTimeout = 20000
            val cod = con.responseCode
            val prox = con.getHeaderField("Location")
            con.disconnect()
            if (cod !in 300..399 || prox == null) return 0
            Regex("android-(\\d+)").find(prox)?.let { return it.groupValues[1].toInt() }
            url = URL(url, prox)
        }
        return 0
    }

    // o trabalho em si (numa linha à parte): devolve true se precisa tentar de novo
    fun trabalhar(c: Context): Boolean {
        val ctx = c.applicationContext
        val pr = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        pr.edit().putLong("conferidoEm", System.currentTimeMillis()).apply()
        if (!ctx.packageManager.canRequestPackageInstalls()) { avisarPermissao(ctx); return false }
        val meu = meuNumero(ctx)
        val numero = ultimaPublicada()
        if (numero <= 0 || numero <= meu) {
            File(ctx.filesDir, "auto.apk").delete()
            // o celular está em dia: o relógio também? (a resposta passa pelo
            // talvezAtualizar, que atualiza o relógio sozinho). Só com a tela do
            // celular ligada: abrir a tela de atualizar no pulso de madrugada acordaria
            val pm = ctx.getSystemService(PowerManager::class.java)
            if (numero > 0 && pm != null && pm.isInteractive) try { Relogio.perguntarVersao(ctx) } catch (e: Throwable) { }
            return false
        }
        val arq = File(ctx.filesDir, "auto.apk")
        // baixa uma vez só por versão
        if (pr.getInt("baixado", 0) != numero || !arq.exists() || arq.length() < 100_000L) {
            // a versão exata (o GitHub manda ao arquivo seguindo os desvios)
            val url = URL("https://github.com/carlosjr81/Treino-Livre/releases/download/android-$numero/treino-livre.apk")
            val con = url.openConnection() as HttpURLConnection
            con.instanceFollowRedirects = true
            con.useCaches = false; con.connectTimeout = 15000; con.readTimeout = 60000
            if (con.responseCode != 200) { con.disconnect(); return true }
            val total = con.contentLengthLong
            val tmp = File(ctx.filesDir, "auto.part")
            con.inputStream.use { ent -> tmp.outputStream().use { ent.copyTo(it, 64 * 1024) } }
            con.disconnect()
            if (total > 0 && tmp.length() != total) { tmp.delete(); return true }
            arq.delete(); tmp.renameTo(arq)
            pr.edit().putInt("baixado", numero).apply()
            try { BolsoService.diario(ctx, "versão $numero do app baixada; instala com a tela apagada") } catch (e: Throwable) { }
        }
        if (!seguro(ctx)) return true
        instalar(ctx, arq, numero)
        return false
    }

    private fun instalar(ctx: Context, arq: File, numero: Int) {
        val pi = ctx.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        params.setAppPackageName(ctx.packageName)
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        val id = pi.createSession(params)
        pi.openSession(id).use { s ->
            s.openWrite("treino-livre.apk", 0, arq.length()).use { sai -> arq.inputStream().use { it.copyTo(sai) }; s.fsync(sai) }
            val volta = Intent(ctx, StatusAutoAtualizar::class.java).putExtra("numero", numero)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            s.commit(PendingIntent.getBroadcast(ctx, 7, volta, flags).intentSender)
        }
    }

    private fun canal(ctx: Context): NotificationManager? {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return null
        try { nm.createNotificationChannel(NotificationChannel(CANAL, "Atualização do app", NotificationManager.IMPORTANCE_DEFAULT)) } catch (e: Exception) { }
        return nm
    }

    // o Android quer um toque: a notificação leva direto à confirmação
    fun avisarToque(ctx: Context, confirmar: Intent, numero: Int) {
        val nm = canal(ctx) ?: return
        val pi = PendingIntent.getActivity(ctx, 8, confirmar.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = android.app.Notification.Builder(ctx, CANAL)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("⬆ Treino Livre: versão $numero pronta")
            .setContentText("Toque para atualizar. Depois, o relógio se atualiza sozinho.")
            .setContentIntent(pi).setAutoCancel(true).build()
        try { nm.notify(7101, n) } catch (e: Exception) { }
    }

    // sem a permissão de instalar, a atualização sozinha não anda: avisa uma vez por dia
    private fun avisarPermissao(ctx: Context) {
        val pr = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (System.currentTimeMillis() - pr.getLong("avisouPerm", 0L) < 24 * 3600_000L) return
        pr.edit().putLong("avisouPerm", System.currentTimeMillis()).apply()
        val nm = canal(ctx) ?: return
        val abrir = Intent(ctx, AtualizarApp::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val pi = PendingIntent.getActivity(ctx, 9, abrir, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = android.app.Notification.Builder(ctx, CANAL)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("Treino Livre: deixe o app se atualizar sozinho")
            .setContentText("Toque e ligue \"Permitir desta fonte\", uma vez só.")
            .setContentIntent(pi).setAutoCancel(true).build()
        try { nm.notify(7102, n) } catch (e: Exception) { }
    }
}

class TrabalhoAtualizar : JobService() {
    override fun onStartJob(p: JobParameters?): Boolean {
        Thread {
            var deNovo = false
            try { deNovo = AtualizaSozinho.trabalhar(this) } catch (e: Throwable) { deNovo = true }
            // a conferida avulsa recomeça em 15 min quando não deu para instalar
            if (deNovo) AtualizaSozinho.depois(this, 15 * 60_000L)
            jobFinished(p, false)
        }.start()
        return true
    }

    override fun onStopJob(p: JobParameters?): Boolean = true
}

class StatusAutoAtualizar : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)
        val numero = i.getIntExtra("numero", 0)
        when (st) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirmar = i.getParcelableExtra<Intent>(Intent.EXTRA_INTENT) ?: return
                AtualizaSozinho.avisarToque(c, confirmar, numero)
            }
            PackageInstaller.STATUS_SUCCESS -> File(c.filesDir, "auto.apk").delete()
            else -> try { BolsoService.diario(c, "atualização sozinha não instalou: " + (i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: st.toString())) } catch (e: Throwable) { }
        }
    }
}
