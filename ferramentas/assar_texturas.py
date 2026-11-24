# Gera texturas PBR (altura/rugosidade, normal e cor) em alta resolução para o 3D – tratamento de imagem com numpy/OpenCV.
import numpy as np, cv2, os
rng = np.random.default_rng(7); OUT = '/home/claude/novo/assets/texturas'
def norm01(a): a = a - a.min(); return a / (a.max() + 1e-9)
def ruido(T, escalas=(4, 16, 64, 256), pesos=(0.5, 0.25, 0.15, 0.1)):
    acc = np.zeros((T, T), np.float32)
    for s, p in zip(escalas, pesos):
        n = rng.random((s, s)).astype(np.float32); n = cv2.resize(n, (T, T), interpolation=cv2.INTER_CUBIC); acc += n * p
    return norm01(acc)
def para_normal(h, forca):
    h = h.astype(np.float32); p = 2; hp = np.pad(h, p, mode='wrap')  # bordas contínuas (textura repetível)
    gx = cv2.Sobel(hp, cv2.CV_32F, 1, 0, ksize=3)[p:-p, p:-p]; gy = cv2.Sobel(hp, cv2.CV_32F, 0, 1, ksize=3)[p:-p, p:-p]
    nx, ny, nz = -gx * forca, gy * forca, np.ones_like(h); L = np.sqrt(nx**2 + ny**2 + nz**2)  # convenção OpenGL (verde = +V)
    n = np.dstack([nz / L, ny / L, nx / L]) * 0.5 + 0.5  # BGR = (z, y, x)
    return (n * 255).astype(np.uint8)
def salvar(nome, alt, forca, cor=None):
    a8 = (np.clip(alt, 0, 1) * 255).astype(np.uint8)
    cv2.imwrite(f'{OUT}/{nome}_alt.webp', a8, [cv2.IMWRITE_WEBP_QUALITY, 90])
    cv2.imwrite(f'{OUT}/{nome}_nor.webp', para_normal(alt, forca), [cv2.IMWRITE_WEBP_QUALITY, 92])
    if cor is not None: cv2.imwrite(f'{OUT}/{nome}_cor.webp', cor, [cv2.IMWRITE_WEBP_QUALITY, 90])

# metal escovado / usinado (riscos horizontais finos + microtextura)
T = 1024
linhas = rng.random((T, 1)).astype(np.float32); linhas = cv2.resize(linhas, (T * 4, T), interpolation=cv2.INTER_LINEAR)[:, :T]
risc = cv2.GaussianBlur(np.repeat(rng.random((T, 1)).astype(np.float32), T, 1) + rng.random((T, T)).astype(np.float32) * 0.15, (0, 0), sigmaX=40, sigmaY=0.6)
alt = 0.78 + 0.18 * norm01(risc) + 0.04 * ruido(T, (32, 128, 512), (0.3, 0.4, 0.3))
salvar('escovado', alt, 3.0)

# fundição (areia) com nervura e cabeças de parafuso abauladas
alt = 0.75 + 0.2 * ruido(T, (16, 64, 256, 1024), (0.15, 0.3, 0.3, 0.25))
alt[int(T*0.48):int(T*0.52), :] += 0.12
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
for i in range(6):
    cx, cy = (i + 0.5) * T / 6, T * 0.18; d = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    alt += np.clip(1 - d / 22, 0, 1) ** 0.6 * 0.25; alt -= ((np.abs(yy - cy) < 2.5) & (np.abs(xx - cx) < 12)) * 0.2
salvar('fundido', np.clip(alt, 0, 1), 4.0)

# painéis da fuselagem: juntas (sulcos), rebites abaulados, portinholas, casca de laranja
T = 2048
alt = 0.8 + 0.03 * ruido(T, (64, 256, 1024), (0.3, 0.4, 0.3))
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
juntas = [int(v * T) for v in (0, 0.23, 0.5, 0.71)]; lin = [int(v * T) for v in (0, 0.38, 0.66)]
for p in juntas: alt[:, max(0, p - 3):p + 3] -= 0.35
for p in lin: alt[max(0, p - 3):p + 3, :] -= 0.35
reb = np.zeros((T, T), np.float32)
passo = 26
for p in juntas:
    for off in (-14, 14):
        x = (p + off) % T
        for y in range(0, T, passo): cv2.circle(reb, (x, y), 5, 1.0, -1)
for p in lin:
    for x in range(0, T, passo): cv2.circle(reb, (x, (p + 14) % T), 5, 1.0, -1)
reb = cv2.GaussianBlur(reb, (0, 0), 2.2); alt += norm01(reb) * 0.18
for (a, b, w, h) in [(0.3, 0.45, 0.12, 0.1), (0.78, 0.15, 0.09, 0.12), (0.55, 0.78, 0.1, 0.07)]:
    x0, y0, x1, y1 = int(a*T), int(b*T), int((a+w)*T), int((b+h)*T)
    cv2.rectangle(alt, (x0, y0), (x1, y1), float(alt.mean() - 0.3), 4)
    for (px, py) in [(x0+12, y0+12), (x1-12, y0+12), (x0+12, y1-12), (x1-12, y1-12)]: cv2.circle(alt, (px, py), 6, 1.0, -1)
salvar('painel', np.clip(alt, 0, 1), 6.0)

# coloração de calor (inconel/aço): palha → bronze → azul → violeta
T = 1024
g = np.linspace(0, 1, T, dtype=np.float32)[:, None]
stops = [(0, (200, 212, 217)), (0.25, (138, 185, 214)), (0.45, (90, 138, 176)), (0.62, (142, 106, 125)), (0.8, (154, 103, 86)), (1, (153, 143, 138))]  # BGR
cor = np.zeros((T, T, 3), np.float32)
for k in range(3):
    xs = [s[0] for s in stops]; ys = [s[1][k] for s in stops]; cor[..., k] = np.interp(g, xs, ys)
cor *= (0.9 + 0.2 * ruido(T, (8, 32, 128), (0.4, 0.4, 0.2)))[..., None]
alt = 0.8 + 0.12 * ruido(T, (32, 128, 512), (0.3, 0.4, 0.3))
salvar('calor', alt, 2.5, np.clip(cor, 0, 255).astype(np.uint8))

# mangueira trançada de aço inox
T = 512
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
a = np.sin((xx + yy) * 2 * np.pi / 16); b = np.sin((xx - yy) * 2 * np.pi / 16)
alt = norm01(np.maximum(a, b) + 0.15 * ruido(T, (16, 64), (0.5, 0.5)))
salvar('trancado', alt, 5.0)
print(sorted(os.listdir(OUT)))
