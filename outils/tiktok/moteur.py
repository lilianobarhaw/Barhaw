#!/usr/bin/env python3
"""Moteur de montage TikTok / Shorts, D.A. « Barhaw ».

Chaque clip a son fichier de plan (plans/X.py) qui remplit un dict P puis
appelle lancer(P). Modes :
    python3 plans/X.py essai 1.0 5.2   -> images d'essai (temps de sortie)
    python3 plans/X.py son             -> audio/X-mix.wav
    python3 plans/X.py video           -> sorties/X.mp4 (image + son)

D.A. :
- 1080x1920, 30 i/s, léger étalonnage.
- Sous-titres mot par mot : Dela Gothic One, majuscules, blanc contour noir,
  mot prononcé en rose #ff5aae, mots clés en jaune #ffe14d, apparition « pop ».
- Étiquettes : boîte arrondie inclinée (blanc / jaune / rose), apparition pop.
- Zooms par panneau (caméra / jeu), secousses, flashs, glitchs.
- Son : voix nivelée, musique Artlist en fond (baissée sous la voix,
  étouffée ou coupée par moments), bruitages Artlist, -14 LUFS, crête -1 dB.
"""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SR = 1080, 1920, 30, 48000
ICI = os.path.dirname(os.path.abspath(__file__))
# Dossier des sons Artlist et police : réglables sans toucher au code.
SON = os.path.join(os.environ.get("SON_TIKTOK", "/mnt/user-data/uploads/Barhaw-3D/son/tiktok"), "")
FONT = os.environ.get("POLICE_TIKTOK", "/root/.fonts/DelaGothicOne-Regular.ttf")
BLANC, ROSE, JAUNE, NOIR = (255, 255, 255), (255, 90, 174), (255, 225, 77), (12, 12, 12)
K = True  # marqueur « mot clé » dans les sous-titres

# Instant du pic de chaque bruitage (s), pour caler le pic sur l'image voulue.
PIC = {"whoosh": 0.086, "pop": 0.007, "bonk": 0.249, "caisse": 0.434, "magie": 0.125,
       "applaudissements": 1.729, "scratch": 0.063, "criquets": 0.142, "vent": 0.386,
       "montee": 1.784, "glitch": 0.20, "boom": 0.233}


# ---------------------------------------------------------------- temps
def fait_o(segs):
    """segs en secondes source -> (o, segments en images, durée de sortie)."""
    fr = [(int(round(a * FPS)), int(round(b * FPS))) for a, b in segs]

    def o(s):
        acc = 0.0
        for a, b in fr:
            if s < b / FPS:
                return acc + max(s - a / FPS, 0.0)
            acc += (b - a) / FPS
        return acc

    dur = sum(b - a for a, b in fr) / FPS
    return o, fr, dur


def src_frame(fr, i):
    for a, b in fr:
        if i < b - a:
            return a + i
        i -= b - a
    return fr[-1][1] - 1


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


def punch(t, z0, z1, c, retour=None, z2=None, att=0.10):
    """Petit raccourci : zoom rapide de z0 à z1 à l'instant t (centre c)."""
    k = [(t, (z0, *c), "lin"), (t + att, (z1, *c), "out")]
    if retour:
        k.append((t + att + retour, (z2 if z2 is not None else z0, *c), "io"))
    return k


# ---------------------------------------------------------------- textes
_fonts = {}


def police(t):
    if t not in _fonts:
        _fonts[t] = ImageFont.truetype(FONT, t)
    return _fonts[t]


def rendu_sous_titre(ch, actif, taille=80, maxw=940):
    f = police(taille)
    sw = max(6, taille // 9)
    espace = int(taille * 0.33)
    mots = [m[0] for m in ch]
    bbs = [f.getbbox(m, stroke_width=sw) for m in mots]
    larg = [b[2] - b[0] for b in bbs]
    lignes, cur, lw = [], [], 0
    for i, w in enumerate(larg):
        if cur and lw + espace + w > maxw:
            lignes.append(cur)
            cur, lw = [], 0
        lw += (espace if cur else 0) + w
        cur.append(i)
    lignes.append(cur)
    lh = int(taille * 1.3)
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
            d.text((x - bbs[i][0], y), mot[0], font=f, fill=coul, stroke_width=sw, stroke_fill=(0, 0, 0))
            do.text((x - bbs[i][0], y + 7), mot[0], font=f, fill=200, stroke_width=sw + 3)
            x += larg[i] + espace
    ombre = ombre.filter(ImageFilter.GaussianBlur(8))
    out = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    out.putalpha(ombre)
    out.alpha_composite(txt)
    return out


def rendu_etiquette(texte, fond, coul, angle, taille=66):
    f = police(taille)
    lignes = texte.split("\n")
    bbs = [f.getbbox(l) for l in lignes]
    lw = max(b[2] - b[0] for b in bbs)
    lh = int(taille * 1.27)
    padx, pady = int(taille * 0.55), int(taille * 0.3)
    pw, ph = lw + 2 * padx, lh * len(lignes) + 2 * pady
    r = int(taille * 0.4)
    img = Image.new("RGBA", (pw + 60, ph + 60), (0, 0, 0, 0))
    sh = Image.new("L", img.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((30, 38, 30 + pw, 38 + ph), r, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    img.putalpha(sh)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((30, 30, 30 + pw, 30 + ph), r, fill=fond + (255,))
    for i, (l, b) in enumerate(zip(lignes, bbs)):
        x = 30 + (pw - (b[2] - b[0])) / 2 - b[0]
        d.text((x, 30 + pady + i * lh - b[1] + int(taille * 0.09)), l, font=f, fill=coul)
    return img.rotate(angle, resample=Image.BICUBIC, expand=True)


def pop(t, t0, t1=None):
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


def glitch(fr, k, graine):
    """Décalage des couches rouge/bleu + tranches horizontales décalées."""
    a = np.asarray(fr).copy()
    rng = np.random.default_rng(graine)
    dx = int(26 * k)
    a[:, :, 0] = np.roll(a[:, :, 0], dx, axis=1)
    a[:, :, 2] = np.roll(a[:, :, 2], -dx, axis=1)
    for _ in range(int(7 * k) + 1):
        y = rng.integers(0, H - 80)
        h = rng.integers(20, 120)
        a[y:y + h] = np.roll(a[y:y + h], int(rng.integers(-90, 90) * k), axis=1)
    return Image.fromarray(a)


# ---------------------------------------------------------------- image
class Rendu:
    def __init__(self, P):
        self.P = P
        self.cache = {}
        self.fen = []
        o = P["o"]
        cap = P.get("CAP", [])
        for n, ch in enumerate(cap):
            debut = o(ch[0][1]) - 0.04
            fin = o(ch[-1][2] + 0.45)
            if n + 1 < len(cap):
                fin = min(fin, o(cap[n + 1][0][1]) - 0.04)
            self.fen.append((debut, fin, [o(m[1]) for m in ch]))

    def composer(self, fr, t):
        P = self.P
        for y0, h, keys in P["PANNEAUX"]:
            z, cx, cy = keys(t) if callable(keys) else piste(keys, t)
            zoom_panneau(fr, y0, h, z, cx, cy)

        dx = dy = 0.0
        sc = 1.0
        for t0, d, amp in P.get("SECOUSSES", []):
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

        for t0, d, amp in P.get("GLITCHS", []):
            x = t - t0
            if 0 <= x < d:
                fr = glitch(fr, amp * (1 - x / d), int(t * FPS))

        for t0, d, amp in P.get("FLASHS", []):
            x = t - t0
            if 0 <= x < d:
                fr = Image.blend(fr, Image.new("RGB", (W, H), BLANC), amp * (1 - x / d) ** 1.5)

        for n, e in enumerate(P.get("ETIQ", [])):
            if e["a"] <= t < e["b"]:
                key = ("e", n)
                if key not in self.cache:
                    self.cache[key] = rendu_etiquette(e["t"], e.get("fond", BLANC), e.get("coul", NOIR),
                                                      e.get("ang", -3), e.get("taille", 66))
                wob = 1 + 0.015 * math.sin((t - e["a"]) * 2 * math.pi * 1.1)
                coller(fr, self.cache[key], e.get("x", 505), e.get("y", P.get("ETIQ_Y", 1130)),
                       pop(t, e["a"], e["b"]) * wob)

        for n, (a, b, debuts) in enumerate(self.fen):
            if a <= t < b:
                actif = max([i for i, d in enumerate(debuts) if d - 0.02 <= t] or [0])
                key = ("c", n, actif)
                if key not in self.cache:
                    self.cache[key] = rendu_sous_titre(P["CAP"][n], actif, P.get("CAP_TAILLE", 80))
                s = pop(t, a)
                coller(fr, self.cache[key], W / 2, P["CAP_Y"], 0.8 + 0.2 * s if s > 0 else 0)
        return fr


def filtre(P):
    return f"fps={FPS},scale={W}:{H}:flags=lanczos,setsar=1,{P.get('GRADE', 'eq=gamma=1.08:contrast=1.05:saturation=1.10')}"


def video(P):
    nom = P["NOM"]
    os.makedirs(os.path.join(ICI, "sorties"), exist_ok=True)
    tmp = os.path.join(ICI, f"sorties/.{nom}-image.mp4")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
                            "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", tmp],
                           stdin=subprocess.PIPE)
    fr = P["fr"]
    n_out = sum(b - a for a, b in fr)
    voulu = [src_frame(fr, i) for i in range(n_out)]
    garde = {}
    for i, f in enumerate(voulu):
        garde.setdefault(f, []).append(i)
    r = Rendu(P)
    lec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", os.path.join(ICI, P["SRC"]), "-vf", filtre(P),
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = 0
    dernier = None
    while n <= voulu[-1]:
        buf = lec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        dernier = buf
        for i in garde.get(n, []):
            im = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1).copy()
            enc.stdin.write(r.composer(im, i / FPS).tobytes())
        n += 1
    # si la source finit avant (arrondis), on répète la dernière image
    manque = [i for f, l in garde.items() if f >= n for i in l]
    for i in sorted(manque):
        im = Image.frombuffer("RGB", (W, H), dernier, "raw", "RGB", 0, 1).copy()
        enc.stdin.write(r.composer(im, i / FPS).tobytes())
    lec.kill()
    enc.stdin.close()
    assert enc.wait() == 0
    mix = os.path.join(ICI, f"audio/{nom}-mix.wav")
    sortie = os.path.join(ICI, f"sorties/{nom}.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-i", mix, "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
                    "-movflags", "+faststart", sortie + ".tmp.mp4"], check=True)
    os.replace(sortie + ".tmp.mp4", sortie)
    os.remove(tmp)
    print("vidéo", sortie, round(n_out / FPS, 2), "s")


def essai(P, ts):
    r = Rendu(P)
    os.makedirs(os.path.join(ICI, "essais"), exist_ok=True)
    fr = P["fr"]
    n_out = sum(b - a for a, b in fr)
    noms = []
    for t in ts:
        i = min(int(round(t * FPS)), n_out - 1)
        s = src_frame(fr, i) / FPS
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s:.4f}", "-i", os.path.join(ICI, P["SRC"]),
                              "-frames:v", "1", "-vf", filtre(P).replace(f"fps={FPS},", ""),
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        im = Image.frombuffer("RGB", (W, H), raw, "raw", "RGB", 0, 1).copy()
        nom = os.path.join(ICI, f"essais/{P['NOM']}-{t:05.2f}.jpg")
        r.composer(im, i / FPS).save(nom, quality=88)
        noms.append(nom)
    # planche
    ims = [Image.open(n).resize((270, 480)) for n in noms]
    cols = min(6, len(ims))
    rows = (len(ims) + cols - 1) // cols
    pl = Image.new("RGB", (270 * cols, 480 * rows), "black")
    for k, im in enumerate(ims):
        pl.paste(im, ((k % cols) * 270, (k // cols) * 480))
    pl.save(os.path.join(ICI, f"essais/{P['NOM']}-planche.jpg"), quality=85)


# ---------------------------------------------------------------- son
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
    return 10 ** (np.asarray(x) / 20)


def ecrire(p, a):
    pcm = (np.clip(a, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", p],
                   input=pcm, check=True)


def lufs(p):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float([l for l in out.splitlines() if l.strip().startswith("I:")][-1].split()[1])


def son(P):
    nom = P["NOM"]
    os.makedirs(os.path.join(ICI, "audio"), exist_ok=True)
    src = os.path.join(ICI, P["SRC"])
    voix_src = charger(src, af="highpass=f=70,dynaudnorm=f=250:g=15:p=0.9:m=6:r=0.3:s=12,"
                               "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=1")
    fr, dur = P["fr"], P["DUR"]
    n = int(round(dur * SR))
    voix = np.zeros((n, 2), np.float32)
    pos, xf = 0, int(0.008 * SR)
    for a, b in fr:
        seg = voix_src[int(a / FPS * SR):int(b / FPS * SR)].copy()
        r = np.linspace(0, 1, xf)[:, None]
        seg[:xf] *= r
        seg[-xf:] *= r[::-1]
        L = min(len(seg), n - pos)
        voix[pos:pos + L] += seg[:L]
        pos += L
    voix *= db(P.get("VOIX_GAIN", 0.0))
    t = np.arange(n) / SR

    # enveloppe de parole (ducking)
    hop = int(0.02 * SR)
    rms = np.sqrt(np.convolve((voix ** 2).mean(1), np.ones(hop * 2) / (hop * 2), "same"))
    act = (20 * np.log10(rms + 1e-9) > -36).astype(float)[::hop]
    env_d, e = np.zeros(len(act)), 0.0
    att, rel = 1 - math.exp(-hop / (0.04 * SR)), 1 - math.exp(-hop / (0.35 * SR))
    for i, x in enumerate(act):
        e += (x - e) * (att if x > e else rel)
        env_d[i] = e
    env = np.interp(np.arange(n), np.arange(len(env_d)) * hop, env_d)

    musique = np.zeros((n, 2), np.float32)
    M = P.get("MUSIQUE")
    if M:
        f = SON + M["fichier"]
        plein = charger(f, M["debut"], dur + 1)[:n]
        sourd = charger(f, M["debut"], dur + 1, "lowpass=f=480,lowpass=f=480")[:n]
        plein = np.pad(plein, ((0, n - len(plein)), (0, 0)))
        sourd = np.pad(sourd, ((0, n - len(sourd)), (0, 0)))
        ecrire(os.path.join(ICI, "audio/.m.wav"), plein)
        ecrire(os.path.join(ICI, "audio/.v.wav"), voix)
        ref = lufs(os.path.join(ICI, "audio/.v.wav"))
        cal = (ref + M.get("rel", -4.0)) - lufs(os.path.join(ICI, "audio/.m.wav"))
        w = np.zeros(n)
        for a, b in M.get("sourd", []):
            w = np.maximum(w, np.clip((t - a) / 0.4, 0, 1) * (1 - np.clip((t - b) / 0.12, 0, 1)))
        coupe = np.ones(n)
        for a, b in M.get("coupe", []):
            coupe = np.minimum(coupe, 1 - np.clip((t - a) / 0.05, 0, 1) * (1 - np.clip((t - b) / 0.06, 0, 1)))
        gain_t = np.interp(t, *zip(*M.get("gain", [(0, 0.0)]))) if M.get("gain") else 0.0
        g = db(cal + gain_t - M.get("duck", 5.0) * env - 2.0 * w) * coupe
        fondu = np.clip(t / M.get("entree", 0.05), 0, 1)
        musique = (plein * (1 - w)[:, None] + sourd * db(-1.5) * w[:, None]) * (g * fondu)[:, None]

    sfx = np.zeros((n, 2), np.float32)
    cache = {}
    for item in P.get("SFX", []):
        nomf, t0, gain = item[:3]
        vit = item[3] if len(item) > 3 else 1.0
        if nomf not in cache:
            cache[nomf] = charger(SON + nomf + ".wav")
        a = cache[nomf]
        if vit != 1.0:
            idx = np.arange(0, len(a) - 1, vit)
            a = np.stack([np.interp(idx, np.arange(len(a)), a[:, c]) for c in range(2)], 1)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            a, i0 = a[-i0:], 0
        L = max(0, min(len(a), n - i0))
        sfx[i0:i0 + L] += a[:L] * db(gain)

    mix = voix + musique + sfx
    mix *= np.clip((dur - t) / P.get("FONDU_FIN", 0.25), 0, 1)[:, None]
    brut = os.path.join(ICI, f"audio/{nom}-brut.wav")
    ecrire(brut, mix)
    gain = -14.0 - lufs(brut)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", brut, "-af",
                    f"volume={gain:.2f}dB,alimiter=limit=0.79:level=false:attack=3:release=60",
                    "-ar", str(SR), os.path.join(ICI, f"audio/{nom}-mix.wav")], check=True)
    print("son", nom, "gain", round(gain, 2), "->", round(lufs(os.path.join(ICI, f"audio/{nom}-mix.wav")), 1), "LUFS")


def lancer(P):
    mode = sys.argv[1] if len(sys.argv) > 1 else "tout"
    if mode == "essai":
        essai(P, [float(x) for x in sys.argv[2:]])
    elif mode == "son":
        son(P)
    elif mode == "video":
        video(P)
    elif mode == "tout":
        son(P)
        video(P)
    print("durée", round(P["DUR"], 2), "s")
