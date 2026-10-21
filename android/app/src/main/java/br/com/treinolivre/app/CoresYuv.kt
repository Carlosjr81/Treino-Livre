package br.com.treinolivre.app

import kotlin.math.abs

// A cor do quadro dos óculos.
//
// O kit da Meta entrega o quadro decodificado em YUV 4:2:0, mas não diz em que
// arranjo: as duas cores (U e V) podem vir em planos separados (I420, YV12) ou
// intercaladas (NV12, NV21), e em ordens diferentes. A primeira versão mandava
// só o brilho (Y), que vem primeiro em qualquer arranjo — e a imagem saía em
// preto e branco. Aqui o arranjo é descoberto nos primeiros quadros:
//  1. intercalado ou em planos: em planos, bytes vizinhos são vizinhos na
//     imagem e quase iguais; intercalados, vizinhos são U e V, e diferem mais
//     do que os de duas casas de distância;
//  2. a ordem: V (vermelho) costuma ficar acima de U (azul) em cena com gente
//     e luz de academia, então o lado de média maior é o V.
// Quadro de cena cinza não diz nada e não vota. Até a decisão, sai o brilho.
object CoresYuv {
    const val I420 = 0   // plano U, depois plano V
    const val YV12 = 1   // plano V, depois plano U
    const val NV12 = 2   // U e V intercalados, U primeiro
    const val NV21 = 3   // V e U intercalados, V primeiro (o que o YuvImage quer)

    private fun b(d: ByteArray, i: Int) = d[i].toInt() and 0xFF

    // Só a estrutura: em planos (I420) ou intercalado (NV12). Em planos, bytes
    // vizinhos são vizinhos na imagem e quase iguais; intercalados, U e V se
    // alternam e diferem mais do que os de duas casas. Isso o quadro diz com
    // segurança. A ORDEM (U ou V primeiro) a cena não diz: no celular do dono, a
    // regra "V acima de U" acertou num dia e trocou as cores no outro (chão
    // cinza, tela do celular laranja na imagem). Fica U primeiro, que é o que
    // os decodificadores de vídeo do Android entregam, e o botão 🎨 inverte.
    fun votar(d: ByteArray, w: Int, h: Int, passo: Int): Int {
        val base = passo * h
        val n = minOf(6000, d.size - base - 2)
        if (n < 300) return -1
        var d1 = 0L
        var d2 = 0L
        for (i in 0 until n) {
            val a = b(d, base + i)
            d1 += abs(a - b(d, base + i + 1))
            d2 += abs(a - b(d, base + i + 2))
        }
        // intercalado: o vizinho é a outra cor (difere mais que o de duas casas)
        if (d1 > d2 * 3 / 2 && d1 - d2 > n / 2) return NV12
        // em planos: o vizinho é o pixel ao lado (difere menos que o de duas casas)
        if (d2 > d1 * 23 / 20 && d2 - d1 > n / 8) return I420
        return -1
    }

    fun invertido(arranjo: Int): Int = when (arranjo) {
        I420 -> YV12
        YV12 -> I420
        NV12 -> NV21
        NV21 -> NV12
        else -> arranjo
    }

    // Monta o NV21 (o formato que o Android comprime em JPEG). Sem arranjo
    // decidido (-1), as cores ficam neutras: preto e branco.
    fun paraNv21(d: ByteArray, w: Int, h: Int, passo: Int, arranjo: Int, saida: ByteArray) {
        for (y in 0 until h) System.arraycopy(d, y * passo, saida, y * w, w)
        val base = passo * h
        val cw = w / 2
        val ch = h / 2
        var o = w * h
        when (arranjo) {
            NV21, NV12 -> {
                if (d.size < base + (ch - 1) * passo + 2 * cw) { java.util.Arrays.fill(saida, w * h, saida.size, 128.toByte()); return }
                for (y in 0 until ch) {
                    val lin = base + y * passo
                    for (x in 0 until cw) {
                        val p = lin + 2 * x
                        if (arranjo == NV21) { saida[o] = d[p]; saida[o + 1] = d[p + 1] }
                        else { saida[o] = d[p + 1]; saida[o + 1] = d[p] }
                        o += 2
                    }
                }
            }
            I420, YV12 -> {
                val cp = passo / 2
                val p1 = base
                val p2 = base + cp * ch
                if (d.size < p2 + (ch - 1) * cp + cw) { java.util.Arrays.fill(saida, w * h, saida.size, 128.toByte()); return }
                for (y in 0 until ch) {
                    for (x in 0 until cw) {
                        val a = d[p1 + y * cp + x]
                        val c = d[p2 + y * cp + x]
                        // NV21 quer V e depois U
                        if (arranjo == I420) { saida[o] = c; saida[o + 1] = a } else { saida[o] = a; saida[o + 1] = c }
                        o += 2
                    }
                }
            }
            else -> java.util.Arrays.fill(saida, w * h, saida.size, 128.toByte())
        }
    }
}
