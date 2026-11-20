# Gera as duas camadas do fundo do resumo animado (resumo-fundo.webp e
# resumo-frente.webp) a partir de uma arte do dono (ver CLAUDE.md, "O fundo é a
# academia, não a praia"). Uso, na raiz do repositório:
#   pip install mediapipe opencv-python-headless pillow   (fora do repositório!)
#   curl -L -o /tmp/seg.tflite https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
#   python3 ferramentas/arte-resumo.py arte.png /tmp/seg.tflite
# No Linux sem tela o MediaPipe pede a libegl1. Arte nova, confira os pontos
# de ARTE_RESUMO (sol, neon, faróis, relógio, óculos) e o lugar do logo abaixo.
import sys
import numpy as np, cv2, mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

ARTE = sys.argv[1]
op = vision.ImageSegmenterOptions(base_options=mpp.BaseOptions(model_asset_path=sys.argv[2]),
                                  output_confidence_masks=True, output_category_mask=True)
seg = vision.ImageSegmenter.create_from_options(op)
bgr = cv2.imread(ARTE)
rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
r = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
cat = r.category_mask.numpy_view().copy().squeeze()
conf = [m.numpy_view().copy().squeeze() for m in r.confidence_masks]
conf = np.stack(conf)

# ---------- as camadas ----------
from PIL import Image

R = "./"
bgr = cv2.imread(ARTE)
H, W = bgr.shape[:2]
          # 6 x H x W: fundo, cabelo, pele, rosto, roupa, acessórios
pessoa = 1 - conf[0]

# ---------- a regata: só a roupa no meio do peito, a maior mancha ----------
roupa = (conf[4] > 0.45).astype(np.uint8)
caixa = np.zeros_like(roupa); caixa[360:1020, 290:740] = 1
roupa *= caixa
n, rot, st, _ = cv2.connectedComponentsWithStats(roupa)
maior = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
roupa = (rot == maior).astype(np.uint8)
roupa = cv2.morphologyEx(roupa, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

# o decote fecha um pouco: o tecido sobe pelo peito até logo abaixo da barba,
# entre as alças (é onde o logo cabe inteiro). Só onde é pele: a barba fica.
lum = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
peito = np.zeros_like(roupa)
pele = (conf[2] > 0.5) & (conf[2] >= conf[3]) & (conf[2] >= conf[1])
for y in range(560, 900):
    xs = np.where(roupa[y])[0]
    if len(xs) < 2: continue
    meio = 530
    esq = xs[xs < meio]; dir_ = xs[xs >= meio]
    if len(esq) == 0 or len(dir_) == 0: continue
    a, b = esq.max(), dir_.min()
    for x in range(a, b):
        yn = 628 + 26 * (1 - min(1, ((x - 530) / 115) ** 2))
        if y >= yn and pele[y, x]: peito[y, x] = 1
peito = cv2.morphologyEx(peito, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
pv = peito.astype(bool)
lp = lum[pv]
sombra_peito = np.clip((lum - np.percentile(lp, 3)) / (np.percentile(lp, 98) - np.percentile(lp, 3)), 0, 1)
lr = lum[roupa > 0]
sombra = np.clip((lum - np.percentile(lr, 5)) / (np.percentile(lr, 97) - np.percentile(lr, 5)), 0, 1)
sombra = np.where(pv, sombra_peito * 0.9, sombra)
sombra = cv2.GaussianBlur(sombra, (3, 3), 0)[..., None]
roupa = ((roupa > 0) | pv).astype(np.uint8)
mr = cv2.GaussianBlur(roupa.astype(np.float32), (5, 5), 0)[..., None]
# a borda do decote novo: uma costura mais escura, como a da regata
borda = cv2.morphologyEx(pv.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) & (~(conf[4] > 0.45)).astype(np.uint8)
escuro = np.array([28, 22, 30], np.float32)      # BGR: quase preto com um fundo roxo
claro = np.array([112, 92, 118], np.float32)
regata = escuro + (claro - escuro) * sombra ** 1.6
# o reflexo do pôr do sol na borda direita (laranja) e do neon na esquerda (rosa)
xs = np.linspace(0, 1, W)[None, :, None]
regata += (np.array([40, 90, 230], np.float32) * np.clip((xs - 0.55) / 0.15, 0, 1) +
           np.array([170, 40, 220], np.float32) * np.clip((0.42 - xs) / 0.12, 0, 1)) * 0.25 * sombra
saida = bgr.astype(np.float32) * (1 - mr) + regata * mr
saida[borda > 0] *= 0.45

# ---------- o logo estampado no peito ----------
logo = Image.open(R + "logo-treino-livre.webp").convert("RGBA")
lw = 150
lh = round(lw * logo.height / logo.width)
logo = np.array(logo.resize((lw, lh), Image.LANCZOS)).astype(np.float32)
cx, cy = 528, 762
x0, y0 = cx - lw // 2, cy - lh // 2
# um leve arco: o peito é redondo
mapa_x = np.tile(np.arange(lw, dtype=np.float32), (lh, 1))
mapa_y = np.tile(np.arange(lh, dtype=np.float32)[:, None], (1, lw))
mapa_y += 6 * (1 - ((mapa_x - lw / 2) / (lw / 2)) ** 2) - 6
logo = cv2.remap(logo, mapa_x, mapa_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
la = logo[..., 3:4] / 255.0
lc = logo[..., [2, 1, 0]]                       # RGB -> BGR
reg = saida[y0:y0 + lh, x0:x0 + lw]
som = 0.55 + 0.6 * sombra[y0:y0 + lh, x0:x0 + lw]   # tinta segue as dobras
tinta = np.clip(lc * som, 0, 255)
alfa = la * 0.96 * mr[y0:y0 + lh, x0:x0 + lw]       # só onde a regata aparece
saida[y0:y0 + lh, x0:x0 + lw] = reg * (1 - alfa) + tinta * alfa
saida = np.clip(saida, 0, 255).astype(np.uint8)

# ---------- as duas camadas: o fundo e quem está na frente ----------
frente = np.clip((pessoa - 0.35) / 0.3, 0, 1)
frente[1150:, :] = 1                              # os halteres de baixo vão junto
frente = cv2.GaussianBlur(frente, (3, 3), 0)
# o fundo atrás da pessoa é preenchido (a câmera anda pouco: só a borda aparece)
buraco = cv2.dilate((frente > 0.05).astype(np.uint8), np.ones((31, 31), np.uint8))
pq = cv2.resize(saida, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
bq = cv2.resize(buraco, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
cheio = cv2.inpaint(pq, bq, 9, cv2.INPAINT_TELEA)
cheio = cv2.GaussianBlur(cheio, (9, 9), 0)
cheio = cv2.resize(cheio, (W, H), interpolation=cv2.INTER_CUBIC)
fundo = np.where(buraco[..., None] > 0, cheio, saida)
cv2.imwrite(R + "resumo-fundo.webp", fundo, [cv2.IMWRITE_WEBP_QUALITY, 80])

topo = int(np.argmax((frente > 0.05).any(axis=1)))
rgba = np.dstack([saida, (frente * 255).astype(np.uint8)])[topo:]
cv2.imwrite(R + "resumo-frente.webp", rgba, [cv2.IMWRITE_WEBP_QUALITY, 84])
print("topo da frente:", topo, "tamanho", W, H)
