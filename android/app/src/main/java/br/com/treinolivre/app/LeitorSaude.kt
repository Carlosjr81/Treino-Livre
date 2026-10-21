package br.com.treinolivre.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.aggregate.AggregateMetric
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.format.DateTimeFormatter

// Um treino do Treino Livre, como chega no link do site
data class TreinoDoSite(val id: String, val nome: String, val ini: Long, val fim: Long, val tipo: String, val gravar: Boolean)

object LeitorSaude {
    const val PACOTE_HC = "com.google.android.apps.healthdata"

    val LEITURA = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )
    val ESCRITA = setOf(HealthPermission.getWritePermission(ExerciseSessionRecord::class))
    val TODAS = LEITURA + ESCRITA

    private const val DIAS = 30

    fun lerPedido(texto: String?): List<TreinoDoSite> {
        if (texto.isNullOrEmpty()) return emptyList()
        return try {
            val p = JSONObject(Site.decodificar(texto))
            val t = p.optJSONArray("t") ?: return emptyList()
            (0 until minOf(t.length(), 60)).mapNotNull { i ->
                val o = t.optJSONObject(i) ?: return@mapNotNull null
                val ini = o.optLong("ini"); val fim = o.optLong("fim")
                if (fim <= ini || o.optString("id").isEmpty()) null
                else TreinoDoSite(o.optString("id").take(40), o.optString("nome", "Treino").take(60), ini, fim, o.optString("tipo"), o.optBoolean("g", true))
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun tipoParaHc(tipo: String): Int = when (tipo) {
        "musculacao" -> ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
        "corrida" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
        "caminhada" -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
        "trilha" -> ExerciseSessionRecord.EXERCISE_TYPE_HIKING
        "pedalada" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
        "eliptico" -> ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL
        "escada" -> ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING
        "remo" -> ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE
        "natacao" -> ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL
        else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
    }

    private fun nomeDoTipo(tipo: Int): Pair<String, String> = when (tipo) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING, ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "corrida" to "Corrida"
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "caminhada" to "Caminhada"
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "trilha" to "Trilha"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING, ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "pedalada" to "Pedalada"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "musculacao" to "Musculação"
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL, ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "natacao" to "Natação"
        ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL -> "eliptico" to "Elíptico"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "yoga" to "Yoga"
        ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "pilates" to "Pilates"
        ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE, ExerciseSessionRecord.EXERCISE_TYPE_ROWING -> "remo" to "Remo"
        ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING, ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING_MACHINE -> "escada" to "Escada"
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "hiit" to "HIIT"
        ExerciseSessionRecord.EXERCISE_TYPE_DANCING -> "danca" to "Dança"
        ExerciseSessionRecord.EXERCISE_TYPE_SOCCER -> "futebol" to "Futebol"
        else -> "outro" to "Atividade"
    }

    // Grava os treinos do app, lê o Health Connect e devolve o pacote que o
    // site entende (lerPacoteSaude, no index.html). Cada parte só roda com a
    // permissão dela: quem negou o sono continua vendo os passos.
    suspend fun ler(client: HealthConnectClient, permitidas: Set<String>, treinos: List<TreinoDoSite>, pacoteProprio: String): JSONObject {
        val tem = { p: String -> permitidas.contains(p) }
        val zona = ZoneId.systemDefault()
        val saida = JSONObject().put("v", 1).put("em", System.currentTimeMillis())
        val desde = Instant.now().minusSeconds(DIAS * 86400L)

        // 1. os treinos do Treino Livre vão para o Health Connect. O
        // clientRecordId faz o mesmo treino substituir, e não duplicar.
        val enviados = JSONArray()
        if (ESCRITA.all(tem)) {
            val novos = treinos.filter { it.gravar }.map { t ->
                val ini = Instant.ofEpochMilli(t.ini); val fim = Instant.ofEpochMilli(t.fim)
                ExerciseSessionRecord(
                    startTime = ini,
                    startZoneOffset = zona.rules.getOffset(ini),
                    endTime = fim,
                    endZoneOffset = zona.rules.getOffset(fim),
                    metadata = Metadata.manualEntry(clientRecordId = "treinolivre-" + t.id),
                    exerciseType = tipoParaHc(t.tipo),
                    title = t.nome,
                )
            }
            if (novos.isNotEmpty()) {
                try {
                    client.insertRecords(novos)
                    treinos.filter { it.gravar }.forEach { enviados.put(it.id) }
                } catch (e: Exception) { }
            }
        }
        saida.put("enviados", enviados)

        // 2. por dia: passos, distância, calorias e batimento
        val metricas = mutableSetOf<AggregateMetric<*>>()
        if (tem(HealthPermission.getReadPermission(StepsRecord::class))) metricas += StepsRecord.COUNT_TOTAL
        if (tem(HealthPermission.getReadPermission(DistanceRecord::class))) metricas += DistanceRecord.DISTANCE_TOTAL
        if (tem(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class))) metricas += ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
        val temFc = tem(HealthPermission.getReadPermission(HeartRateRecord::class))
        if (temFc) { metricas += HeartRateRecord.BPM_AVG; metricas += HeartRateRecord.BPM_MIN; metricas += HeartRateRecord.BPM_MAX }
        val dias = JSONArray()
        if (metricas.isNotEmpty()) {
            try {
                val inicio = LocalDate.now(zona).minusDays((DIAS - 1).toLong()).atStartOfDay()
                val grupos = client.aggregateGroupByPeriod(
                    AggregateGroupByPeriodRequest(
                        metrics = metricas,
                        timeRangeFilter = TimeRangeFilter.between(inicio, LocalDateTime.now(zona)),
                        timeRangeSlicer = Period.ofDays(1),
                    )
                )
                val fmt = DateTimeFormatter.ISO_LOCAL_DATE
                for (g in grupos) {
                    val r = g.result
                    val o = JSONObject().put("d", g.startTime.toLocalDate().format(fmt))
                    r[StepsRecord.COUNT_TOTAL]?.let { o.put("passos", it) }
                    r[DistanceRecord.DISTANCE_TOTAL]?.let { o.put("m", Math.round(it.inMeters)) }
                    r[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.let { o.put("kcal", Math.round(it.inKilocalories)) }
                    r[HeartRateRecord.BPM_AVG]?.let { o.put("fc", it) }
                    r[HeartRateRecord.BPM_MIN]?.let { o.put("fcMin", it) }
                    r[HeartRateRecord.BPM_MAX]?.let { o.put("fcMax", it) }
                    if (o.length() > 1) dias.put(o)
                }
            } catch (e: Exception) { }
        }
        saida.put("dias", dias)

        // 3. o batimento que o relógio gravou durante cada treino daqui
        val fcTreinos = JSONArray()
        if (temFc) {
            for (t in treinos) {
                try {
                    val r = client.aggregate(
                        AggregateRequest(
                            metrics = setOf(HeartRateRecord.BPM_AVG, HeartRateRecord.BPM_MAX, HeartRateRecord.MEASUREMENTS_COUNT),
                            timeRangeFilter = TimeRangeFilter.between(Instant.ofEpochMilli(t.ini), Instant.ofEpochMilli(t.fim)),
                        )
                    )
                    val medio = r[HeartRateRecord.BPM_AVG]; val max = r[HeartRateRecord.BPM_MAX]
                    if (medio != null && max != null) {
                        fcTreinos.put(JSONObject().put("id", t.id).put("medio", medio).put("max", max).put("amostras", r[HeartRateRecord.MEASUREMENTS_COUNT] ?: 0))
                    }
                } catch (e: Exception) { }
            }
        }
        saida.put("fcTreinos", fcTreinos)

        // 4. sono, peso, repouso e as atividades gravadas pelos outros apps
        val janela = TimeRangeFilter.after(desde)
        val sono = JSONArray()
        if (tem(HealthPermission.getReadPermission(SleepSessionRecord::class))) {
            try {
                client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, janela, pageSize = 200)).records.forEach {
                    sono.put(JSONObject().put("ini", it.startTime.toEpochMilli()).put("fim", it.endTime.toEpochMilli()))
                }
            } catch (e: Exception) { }
        }
        saida.put("sono", sono)

        val peso = JSONArray()
        if (tem(HealthPermission.getReadPermission(WeightRecord::class))) {
            try {
                client.readRecords(ReadRecordsRequest(WeightRecord::class, TimeRangeFilter.after(Instant.now().minusSeconds(120 * 86400L)), pageSize = 200)).records.forEach {
                    peso.put(JSONObject().put("t", it.time.toEpochMilli()).put("kg", Math.round(it.weight.inKilograms * 10) / 10.0))
                }
            } catch (e: Exception) { }
        }
        saida.put("peso", peso)

        val repouso = JSONArray()
        if (tem(HealthPermission.getReadPermission(RestingHeartRateRecord::class))) {
            try {
                client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, janela, pageSize = 200)).records.forEach {
                    repouso.put(JSONObject().put("t", it.time.toEpochMilli()).put("bpm", it.beatsPerMinute))
                }
            } catch (e: Exception) { }
        }
        saida.put("repouso", repouso)

        val atividades = JSONArray()
        if (tem(HealthPermission.getReadPermission(ExerciseSessionRecord::class))) {
            try {
                client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, janela, ascendingOrder = false, pageSize = 60)).records
                    .filter { it.metadata.dataOrigin.packageName != pacoteProprio }
                    .forEach {
                        val (tipo, nome) = nomeDoTipo(it.exerciseType)
                        atividades.put(
                            JSONObject().put("ini", it.startTime.toEpochMilli()).put("fim", it.endTime.toEpochMilli())
                                .put("tipo", tipo).put("nome", it.title?.takeIf { t -> t.isNotBlank() } ?: nome)
                                .put("app", it.metadata.dataOrigin.packageName)
                        )
                    }
            } catch (e: Exception) { }
        }
        saida.put("atividades", atividades)
        return saida
    }
}
