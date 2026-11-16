#!/usr/bin/env python3
"""Montage TikTok / Shorts du clip (1080x1920, 30 i/s).

python3 montage.py son            -> audio/mix.wav
python3 montage.py essai 7.3 15.9 -> essai-<t>.jpg (temps de sortie)
python3 montage.py video          -> video.mp4 puis final.mp4
"""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SEAM = 1080, 1920, 30, 640
SRC = "clip.mp4"
SON = "/mnt/user-data/uploads/Barhaw-3D/son/tiktok/"
FONT = "/root/.fonts/DelaGothicOne-Regular.ttf"
GRADE = "eq=gamma=1.10:contrast=1.05:saturation=1.10"

# Morceaux gardés, en images source à 30 i/s (deux silences coupés).
SEGS = [(18, 296), (312, 729), (749, 897)]
NOUT = sum(b - a for a, b in SEGS)
DUR = NOUT / FPS


def o(s):
    """Temps source -> temps de sortie."""
    acc = 0.0
    for a, b in SEGS:
        if s < b / FPS:
            return acc + max(s - a / FPS, 0.0)
        acc += (b - a) / FPS
    return acc


def src_frame(i):
    for a, b in SEGS:
        if i < b - a:
            return a + i
        i -= b - a
    return SEGS[-1][1] - 1


# ---------------------------------------------------------------- courbes
def ease(k, x):
    x = min(max(x, 0.0), 1.0)
    if k == "out":
        return 1 - (1 - x) ** 3
    if k == "io":
        return x * x * (3 - 2 * x)
    return x


def piste(keys, t):
    if t <= keys[0][0]:
        return np.array(keys[0][1], float)
    for (t0, v0, _), (t1, v1, k) in zip(keys, keys[1:]):
        if t <= t1:
            if t1 <= t0:
                return np.array(v1, float)
            e = ease(k, (t - t0) / (t1 - t0))
            return np.array(v0, float) + (np.array(v1, float) - np.array(v0, float)) * e
    return np.array(keys[-1][1], float)


F0, C0 = (540, 330), (540, 380)
VISAGE = [  # (temps sortie, (zoom, cx, cy), courbe)
    (0.0, (1.18, *F0), "lin"),
    (0.35, (1.0, *F0), "out"),
    (o(7.70), (1.07, 545, 340), "lin"),
    (o(7.82), (1.40, 550, 345), "out"),
    (o(9.85), (1.28, 550, 345), "lin"),
    (o(10.40), (1.12, 545, 340), "lin"),  # saut au moment de la coupe
    (o(11.6), (1.0, *F0), "out"),
    (o(12.82), (1.0, *C0), "lin"),
    (o(12.92), (1.12, *C0), "out"),
    (o(14.78), (1.12, *C0), "lin"),
    (o(14.88), (1.25, *C0), "out"),
    (o(15.54), (1.25, *C0), "lin"),
    (o(15.64), (1.38, *C0), "out"),
    (o(16.32), (1.38, *C0), "lin"),
    (o(16.42), (1.52, *C0), "out"),
    (o(16.95), (1.52, *C0), "lin"),
    (o(16.95), (1.0, *F0), "lin"),
    (o(21.95), (1.0, *C0), "lin"),
    (o(22.32), (1.40, *C0), "io"),
    (o(22.49), (1.40, *C0), "lin"),
    (o(22.49), (1.0, *F0), "lin"),
    (o(25.00), (1.0, *C0), "lin"),
    (o(25.10), (1.10, *C0), "out"),
    (o(26.22), (1.06, *C0), "lin"),
    (o(26.22), (1.0, 540, 420), "lin"),
    (o(26.36), (1.26, 540, 420), "out"),
    (o(27.6), (1.10, 540, 380), "io"),
    (DUR, (1.05, *F0), "io"),
]
G0 = (540, 640)
JEU = [
    (0.0, (1.18, *G0), "lin"),
    (0.35, (1.0, *G0), "out"),
    (o(16.95), (1.05, *G0), "lin"),
    (o(17.05), (1.50, 540, 600), "out"),
    (o(18.3), (1.14, *G0), "io"),
    (o(24.29), (1.22, *G0), "lin"),
    (o(24.97), (1.0, *G0), "lin"),
    (o(26.79), (1.0, *G0), "lin"),
    (o(26.88), (1.15, *G0), "out"),
    (o(27.6), (1.0, *G0), "io"),
]
SECOUSSES = [(o(16.95), 0.42, 26), (o(7.80), 0.25, 9)]
FLASH = [(o(26.80), 0.30, 0.55)]

# ---------------------------------------------------------------- textes
K = True
CAP = [
    [("VOUS", .74, .84), ("FAITES", .88, 1.04), ("TRAVAILLER", 1.08, 1.44)],
    [("EN", 1.46, 1.5), ("PLUS", 1.6, 1.8), ("UN", 1.96, 2.18), ("HOMME", 2.2, 2.52)],
    [("IL", 2.62, 2.68), ("TRAVAILLE", 2.72, 2.92), ("PAS", 2.94, 3.02), ("POUR", 3.04, 3.12), ("MOI", 3.16, 3.2)],
    [("IL", 3.24, 3.3), ("TRAVAILLE", 3.32, 3.58), ("POUR", 3.6, 3.68), ("LA", 3.72, 3.78), ("VILLE", 3.84, 3.98, K)],
    [("IL", 4.04, 4.08), ("A", 4.12, 4.2), ("FAIT", 4.22, 4.32), ("TOUT", 4.36, 4.48), ("LE...", 4.52, 4.68)],
    [("EH", 4.84, 4.88), ("BAH", 4.94, 5.0)],
    [("OUI", 5.02, 5.24), ("OUI", 5.34, 5.44), ("OUI", 5.54, 5.76)],
    [("ALORS", 5.84, 6.0), ("LÀ", 6.04, 6.08)],
    [("IL", 6.58, 6.6), ("A", 6.62, 6.66), ("FAIT", 6.7, 6.84)],
    [("C'EST", 7.94, 8.02), ("BIEN", 8.06, 8.18), ("ÇA", 8.26, 8.32)],
    [("MONSIEUR", 8.4, 8.58), ("DRAGON ?", 8.6, 8.92)],
    [("PROBLÈME", 8.96, 9.34), ("MANUEL", 9.38, 9.82)],
    [("MANUEL,", 10.46, 10.78), ("IL", 10.84, 10.92), ("A", 10.94, 11.0), ("UN", 11.04, 11.1), ("PROBLÈME", 11.22, 11.7)],
    [("S'IL", 12.0, 12.08), ("VOUS", 12.1, 12.18), ("PLAÎT", 12.22, 12.5)],
    [("MANUEL,", 12.82, 13.14), ("PROBLÈME", 13.24, 13.74)],
    [("MANUEL ?", 14.78, 15.08)],
    [("MANUEL ??", 15.54, 15.8)],
    [("MANUEL", 16.32, 16.58)],
    [("IL", 16.62, 16.68), ("EST", 16.68, 16.76), ("DANS", 16.76, 16.84), ("LE", 16.86, 16.92), ("CIMENT", 16.96, 17.16, K)],
    [("IL", 17.36, 17.42), ("EST", 17.44, 17.56), ("TRÈS...", 17.6, 17.9)],
    [("BEN", 18.04, 18.14), ("ÉCOUTEZ", 18.64, 19.08)],
    [("C'EST,", 19.32, 19.42), ("C'EST", 19.76, 19.86), ("DÉGUEULASSE", 19.9, 20.26)],
    [("DE", 20.3, 20.34), ("LE", 20.38, 20.44), ("FAIRE", 20.48, 20.6), ("TRAVAILLER", 20.64, 20.9)],
    [("GRATUITEMENT", 20.94, 21.38, K)],
    [("MAIS", 21.44, 21.5), ("IL", 21.52, 21.58), ("TRAVAILLE", 21.62, 21.82), ("VRAIMENT", 21.96, 22.2), ("BIEN", 22.24, 22.36)],
    [("BON", 22.5, 22.64), ("EUH", 22.84, 23.16)],
    [("MONSIEUR", 23.26, 23.46), ("DRAGON,", 23.48, 23.78), ("LÀ", 23.98, 24.16)],
    [("DIX", 25.02, 25.1, K), ("SILVERS", 25.14, 25.38, K)],
    [("DÉPÊCHEZ-VOUS", 25.44, 25.84)],
    [("IL,", 26.12, 26.18), ("IL", 26.46, 26.54), ("FAIRE", 26.6, 26.74), ("MAGIQUE", 26.8, 27.22, K)],
]
BLANC, ROSE, JAUNE = (255, 255, 255), (255, 90, 174), (255, 225, 77)
CAP_Y = 652  # centre des sous-titres, sur la jonction caméra / jeu

# fenêtres d'affichage en temps de sortie
FEN = []
for n, ch in enumerate(CAP):
    debut = o(ch[0][1]) - 0.04
    fin = o(ch[-1][2] + 0.45)
    if n + 1 < len(CAP):
        fin = min(fin, o(CAP[n + 1][0][1]) - 0.04)
    FEN.append((debut, fin, [o(m[1]) for m in ch]))

ETIQ = [  # (texte, debut, fin, fond, couleur texte, angle)
    ("IL BOSSE GRATUIT\nPOUR LA VILLE", 0.05, 3.15, BLANC, (12, 12, 12), -3),
    ("IL A QUITTÉ SON PC", o(13.40), o(16.90), JAUNE, (12, 12, 12), 2.5),
    ("LE RETOUR", o(26.30), DUR + 1, ROSE, BLANC, -2.5),
]
ETIQ_Y = 1130

_fonts = {}


def police(t):
    if t not in _fonts:
        _fonts[t] = ImageFont.truetype(FONT, t)
    return _fonts[t]


def rendu_sous_titre(ch, actif):
    f = police(80)
    sw = 9
    espace = 26
    mots = [m[0] for m in ch]
    larg = [f.getbbox(m, stroke_width=sw)[2] - f.getbbox(m, stroke_width=sw)[0] for m in mots]
    lignes, cur, lw = [], [], 0
    for i, w in enumerate(larg):
        if cur and lw + espace + w > 940:
            lignes.append(cur)
            cur, lw = [], 0
        lw += (espace if cur else 0) + w
        cur.append(i)
    lignes.append(cur)
    lh = 104
    iw = max(sum(larg[i] for i in l) + espace * (len(l) - 1) for l in lignes) + 60
    ih = lh * len(lignes) + 50
    txt = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    ombre = Image.new("L", (iw, ih), 0)
    do = ImageDraw.Draw(ombre)
    for li, l in enumerate(lignes):
        total = sum(larg[i] for i in l) + espace * (len(l) - 1)
        x = (iw - total) / 2
        y = 25 + li * lh
        for i in l:
            mot = ch[i]
            coul = ROSE if i == actif else (JAUNE if len(mot) > 3 else BLANC)
            bx = f.getbbox(mot[0], stroke_width=sw)
            d.text((x - bx[0], y), mot[0], font=f, fill=coul, stroke_width=sw, stroke_fill=(0, 0, 0))
            do.text((x - bx[0], y + 7), mot[0], font=f, fill=200, stroke_width=sw + 3)
            x += larg[i] + espace
    ombre = ombre.filter(ImageFilter.GaussianBlur(8))
    out = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    out.putalpha(ombre)
    out.alpha_composite(txt)
    return out


def rendu_etiquette(texte, fond, coul, angle):
    f = police(66)
    lignes = texte.split("\n")
    bbs = [f.getbbox(l) for l in lignes]
    lw = max(b[2] - b[0] for b in bbs)
    lh = 84
    pw, ph = lw + 72, lh * len(lignes) + 40
    img = Image.new("RGBA", (pw + 60, ph + 60), (0, 0, 0, 0))
    sh = Image.new("L", img.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((30, 38, 30 + pw, 38 + ph), 26, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    img.putalpha(sh)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((30, 30, 30 + pw, 30 + ph), 26, fill=fond + (255,))
    for i, (l, b) in enumerate(zip(lignes, bbs)):
        x = 30 + (pw - (b[2] - b[0])) / 2 - b[0]
        d.text((x, 30 + 20 + i * lh - b[1] + 6), l, font=f, fill=coul)
    return img.rotate(angle, resample=Image.BICUBIC, expand=True)


def pop(t, t0, t1=None):
    """Échelle d'apparition / disparition."""
    x = t - t0
    if x < 0:
        return 0.0
    if x < 0.11:
        s = 0.55 + (1.12 - 0.55) * ease("out", x / 0.11)
    elif x < 0.20:
        s = 1.12 - 0.12 * ease("io", (x - 0.11) / 0.09)
    else:
        s = 1.0
    if t1 is not None and t > t1 - 0.12:
        s *= max(0.0, (t1 - t) / 0.12)
    return s


_cache = {}


def coller(fr, img, cx, cy, s):
    if s <= 0.02:
        return
    if abs(s - 1) > 0.005:
        img = img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))), Image.BICUBIC)
    fr.paste(img, (int(cx - img.width / 2), int(cy - img.height / 2)), img)


def zoom_panneau(fr, y0, h, z, cx, cy):
    if abs(z - 1) < 0.002:
        return
    cw, chh = W / z, h / z
    x0 = min(max(cx - cw / 2, 0), W - cw)
    yy = min(max(cy - chh / 2, 0), h - chh)
    part = fr.crop((0, y0, W, y0 + h)).transform((W, h), Image.EXTENT, (x0, yy, x0 + cw, yy + chh), Image.BICUBIC)
    fr.paste(part, (0, y0))


def composer(fr, t):
    z, cx, cy = piste(VISAGE, t)
    zoom_panneau(fr, 0, SEAM, z, cx, cy)
    z, cx, cy = piste(JEU, t)
    zoom_panneau(fr, SEAM, H - SEAM, z, cx, cy)

    # secousse
    dx = dy = 0.0
    sc = 1.0
    for t0, d, amp in SECOUSSES:
        x = t - t0
        if 0 <= x < d:
            k = (1 - x / d) ** 2
            dx += amp * k * math.sin(x * 2 * math.pi * 17 + 0.7)
            dy += amp * k * math.cos(x * 2 * math.pi * 21)
            sc = max(sc, 1 + 0.05 * k)
    if sc > 1.0001 or abs(dx) > 0.1:
        a = 1 / sc
        fr = fr.transform((W, H), Image.AFFINE,
                          (a, 0, W / 2 - (W / 2 + dx) * a, 0, a, H / 2 - (H / 2 + dy) * a), Image.BICUBIC)

    # flash
    for t0, d, amp in FLASH:
        x = t - t0
        if 0 <= x < d:
            al = amp * (1 - x / d) ** 1.5
            fr = Image.blend(fr, Image.new("RGB", (W, H), BLANC), al)

    # étiquettes
    for n, (txt, a, b, fond, coul, ang) in enumerate(ETIQ):
        if a <= t < b:
            key = ("e", n)
            if key not in _cache:
                _cache[key] = rendu_etiquette(txt, fond, coul, ang)
            wob = 1 + 0.015 * math.sin((t - a) * 2 * math.pi * 1.1)
            coller(fr, _cache[key], 505, ETIQ_Y, pop(t, a, b) * wob)

    # sous-titres
    for n, (a, b, debuts) in enumerate(FEN):
        if a <= t < b:
            actif = max([i for i, d in enumerate(debuts) if d - 0.02 <= t] or [0])
            key = ("c", n, actif)
            if key not in _cache:
                _cache[key] = rendu_sous_titre(CAP[n], actif)
            s = pop(t, a)
            s = 0.8 + 0.2 * s if s > 0 else 0
            coller(fr, _cache[key], W / 2, CAP_Y, s)
    return fr


def lecteur():
    cmd = ["ffmpeg", "-v", "error", "-i", SRC, "-vf",
           f"fps={FPS},scale={W}:{H}:flags=lanczos,{GRADE}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=W * H * 3 * 2)
    n = 0
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        yield n, buf
        n += 1


def video():
    tmp = "video.tmp.mp4"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
                            "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", tmp],
                           stdin=subprocess.PIPE)
    voulu = [src_frame(i) for i in range(NOUT)]
    garde = {f: i for i, f in enumerate(voulu)}
    for n, buf in lecteur():
        if n in garde:
            i = garde[n]
            fr = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1).copy()
            fr = composer(fr, i / FPS)
            enc.stdin.write(fr.tobytes())
            if i % 60 == 0:
                print("image", i, "/", NOUT, flush=True)
        if n >= voulu[-1]:
            break
    enc.stdin.close()
    assert enc.wait() == 0
    os.replace(tmp, "video.mp4")


def essai(ts):
    for t in ts:
        i = min(int(round(t * FPS)), NOUT - 1)
        s = src_frame(i) / FPS
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s:.4f}", "-i", SRC, "-frames:v", "1", "-vf",
                              f"scale={W}:{H}:flags=lanczos,{GRADE}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                             capture_output=True).stdout
        fr = Image.frombuffer("RGB", (W, H), raw, "raw", "RGB", 0, 1).copy()
        composer(fr, i / FPS).save(f"essai-{t:.2f}.jpg", quality=88)


# ---------------------------------------------------------------- son
SR = 48000


def charger(p, ss=None, t=None, af=None):
    cmd = ["ffmpeg", "-v", "error"]
    if ss is not None:
        cmd += ["-ss", str(ss)]
    if t is not None:
        cmd += ["-t", str(t)]
    cmd += ["-i", p]
    if af:
        cmd += ["-af", af]
    cmd += ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def son():
    os.makedirs("audio", exist_ok=True)
    voix_src = charger("voix.wav")
    n = int(round(DUR * SR))
    voix = np.zeros((n, 2), np.float32)
    pos = 0
    xf = int(0.008 * SR)
    for a, b in SEGS:
        seg = voix_src[int(a / FPS * SR):int(b / FPS * SR)].copy()
        r = np.linspace(0, 1, xf)[:, None]
        seg[:xf] *= r
        seg[-xf:] *= r[::-1]
        L = min(len(seg), n - pos)
        voix[pos:pos + L] += seg[:L]
        pos += L

    # enveloppe de parole pour le ducking
    hop = int(0.02 * SR)
    rms = np.sqrt(np.convolve((voix ** 2).mean(1), np.ones(hop * 2) / (hop * 2), "same"))
    act = (20 * np.log10(rms + 1e-9) > -36).astype(float)
    env = np.zeros(n)
    att, rel = 1 - math.exp(-1 / (0.04 * SR)), 1 - math.exp(-1 / (0.35 * SR))
    e = 0.0
    act_d = act[::hop]
    env_d = np.zeros(len(act_d))
    att, rel = 1 - math.exp(-hop / (0.04 * SR)), 1 - math.exp(-hop / (0.35 * SR))
    for i, x in enumerate(act_d):
        e += (x - e) * (att if x > e else rel)
        env_d[i] = e
    env = np.interp(np.arange(n), np.arange(len(env_d)) * hop, env_d)

    # musique : pleine + étouffée, mélangées selon l'absence
    M0 = 93.48
    plein = charger(SON + "musique.wav", M0, DUR + 1)[:n]
    sourd = charger(SON + "musique.wav", M0, DUR + 1, "lowpass=f=480,lowpass=f=480")[:n]
    plein = np.pad(plein, ((0, n - len(plein)), (0, 0)))
    sourd = np.pad(sourd, ((0, n - len(sourd)), (0, 0)))
    t = np.arange(n) / SR
    w = np.clip((t - o(13.05)) / 0.5, 0, 1) * (1 - np.clip((t - o(26.27)) / 0.12, 0, 1))
    base = np.where(t < o(26.27), -12.0, -9.5) - 5.0 * env - 2.0 * w
    g = db(base)[:, None]
    musique = (plein * (1 - w)[:, None] + sourd * db(-1.5) * w[:, None]) * g

    sfx = np.zeros((n, 2), np.float32)

    def poser(nom, t0, gain, vit=1.0):
        a = charger(SON + nom + ".wav")
        if vit != 1.0:
            idx = np.arange(0, len(a) - 1, vit)
            a = np.stack([np.interp(idx, np.arange(len(a)), a[:, c]) for c in range(2)], 1)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            a, i0 = a[-i0:], 0
        L = min(len(a), n - i0)
        sfx[i0:i0 + L] += a[:L] * db(gain)

    poser("whoosh", 0.0, -3)
    poser("pop", 0.06, -4)
    poser("whoosh", o(7.82) - 0.086, -6)
    for k, s in enumerate([12.82, 14.78, 15.54, 16.32]):
        poser("pop", o(s) + 0.05, -7 + k, 1.0 + 0.13 * k)
    poser("whoosh", o(13.40) - 0.086, -6)
    poser("pop", o(13.40) + 0.02, -6)
    poser("bonk", o(16.96) - 0.249, 1)
    poser("pop", o(22.24), -5, 1.15)
    poser("caisse", o(25.0), -12)
    poser("whoosh", o(26.30) - 0.086, -3)
    poser("pop", o(26.32), -5)
    poser("magie", o(26.80) - 0.03, -5)

    mix = voix + musique + sfx
    for nom, x in (("voix", voix), ("musique", musique), ("sfx", sfx)):
        write_wav(f"audio/{nom}.wav", x)
    fin = np.clip((DUR - t) / 0.25, 0, 1)[:, None]
    mix *= fin
    brut = "audio/brut.wav"
    write_wav(brut, mix)
    mesure = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", brut, "-af", "ebur128", "-f", "null", "-"],
                            capture_output=True, text=True).stderr
    I = float([l for l in mesure.splitlines() if l.strip().startswith("I:")][-1].split()[1])
    gain = -14.0 - I
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", brut, "-af",
                    f"volume={gain:.2f}dB,alimiter=limit=0.79:level=false:attack=3:release=60",
                    "-ar", str(SR), "audio/mix.wav"], check=True)
    print("intégré avant", I, "gain", round(gain, 2))


def write_wav(p, a):
    pcm = (np.clip(a, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", p],
                   input=pcm, check=True)


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "son":
        son()
    elif mode == "essai":
        essai([float(x) for x in sys.argv[2:]])
    elif mode == "video":
        video()
    print("durée", round(DUR, 3))
