# Les briques du motion design du teaser : textes au trait d'encre, étiquettes, cadres, transitions, particules.
import math, os, random, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

FPS = 30
P = "/mnt/user-data/uploads/Barhaw-3D/son/"
TITRE = P + "DelaGothicOne-Regular.ttf"
TEXTE = P + "MPLUSRounded1c-ExtraBold.ttf"
TEXTE_B = P + "MPLUSRounded1c-Bold.ttf"
KANJI = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
ROSE, VIOLET, ENCRE, OMBRE, PAPIER, OR, BLEU = (255, 79, 154), (155, 77, 255), (18, 5, 13), (111, 34, 201), (255, 242, 248), (255, 211, 107), (85, 204, 255)
IMG = "/home/claude/barhaw/img/"


def police(chemin, taille, index=0):
    return _police(chemin, int(taille), index)


@functools.lru_cache(maxsize=256)
def _police(chemin, taille, index):
    return ImageFont.truetype(chemin, taille, index=index)


def cl(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lisse(x):
    x = cl(x)
    return x * x * (3 - 2 * x)


def sortie(x):  # ease-out cubique
    x = cl(x)
    return 1 - (1 - x) ** 3


def entree(x):
    x = cl(x)
    return x ** 3


def ressort(x, amorti=6.0, freq=2.2):
    """Un rebond (overshoot) qui se pose à 1."""
    x = cl(x)
    return 1 - math.exp(-amorti * x) * math.cos(freq * math.pi * x)


def melange(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


@functools.lru_cache(maxsize=64)
def image(chemin, mode="RGBA"):
    return Image.open(chemin).convert(mode)


@functools.lru_cache(maxsize=512)
def texte_img(txt, chemin, taille, couleur=PAPIER, trait=None, ombre=None, degrade=None, espacement=0, ombre_coul=OMBRE, trait_coul=ENCRE):
    """Un texte au trait d'encre avec l'ombre violette franche du site (rendu une fois, gardé)."""
    f = police(chemin, taille)
    trait = max(2, taille // 13) if trait is None else trait
    ombre = max(3, taille // 11) if ombre is None else ombre
    if espacement:
        larg = sum(f.getlength(c) + espacement for c in txt) - espacement
    else:
        larg = f.getlength(txt)
    asc, desc = f.getmetrics()
    L, H = int(larg + 2 * trait + ombre + 8), int(asc + desc + 2 * trait + ombre + 8)
    im = Image.new("RGBA", (L, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x0, y0 = trait + 4, trait + 4

    def ecrire(dd, x, y, fill, sw, sf):
        if espacement:
            cx = x
            for c in txt:
                dd.text((cx, y), c, font=f, fill=fill, stroke_width=sw, stroke_fill=sf)
                cx += f.getlength(c) + espacement
        else:
            dd.text((x, y), txt, font=f, fill=fill, stroke_width=sw, stroke_fill=sf)
    if ombre:
        ecrire(d, x0 + ombre, y0 + ombre, ombre_coul + (255,), trait, ombre_coul + (255,))
    ecrire(d, x0, y0, trait_coul + (255,), trait, trait_coul + (255,))
    if degrade:
        m = Image.new("L", (L, H), 0)
        ecrire(ImageDraw.Draw(m), x0, y0, 255, 0, 0)
        g = np.zeros((H, L, 3), np.uint8)
        a, b = degrade
        xs = np.linspace(0, 1, L)[None, :, None]
        g[:] = (np.array(a)[None, None, :] * (1 - xs) + np.array(b)[None, None, :] * xs).astype(np.uint8)
        im.paste(Image.fromarray(g), (0, 0), m)
    else:
        ecrire(d, x0, y0, couleur + (255,), 0, couleur + (255,))
    return im


@functools.lru_cache(maxsize=256)
def etiquette_img(txt, taille=34, fond=ROSE, couleur=(255, 255, 255), icone=None):
    """Une étiquette arrondie (comme les surtitres du site), avec une petite image à gauche si besoin."""
    f = police(TEXTE, taille)
    tw = int(f.getlength(txt))
    h = int(taille * 1.75)
    ic = 0
    if icone:
        ic = h - 12
    L = tw + h + ic + (10 if icone else 0)
    im = Image.new("RGBA", (L + 10, h + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 7, L + 6, h + 7), h // 2, fill=OMBRE + (255,))
    d.rounded_rectangle((0, 0, L, h), h // 2, fill=fond + (255,), outline=ENCRE + (255,), width=4)
    x = h // 2
    if icone:
        i = image(icone).copy()
        i.thumbnail((ic, ic))
        rond = Image.new("L", i.size, 0)
        ImageDraw.Draw(rond).ellipse((0, 0, i.size[0] - 1, i.size[1] - 1), fill=255)
        im.paste(i, (x - 6, (h - i.size[1]) // 2), rond)
        x += ic + 4
    d.text((x, h // 2 + 1), txt, font=f, fill=couleur + (255,), anchor="lm")
    return im


def poser(fond, calque, cx, cy, ech=1.0, angle=0.0, alpha=1.0, ancre="mm"):
    """Pose un calque RGBA centré (ou ancré) en (cx, cy), avec échelle, rotation (degrés) et transparence."""
    if alpha <= 0.003 or ech <= 0.003:
        return
    c = calque
    if abs(ech - 1) > 1e-3:
        c = c.resize((max(1, int(c.width * ech)), max(1, int(c.height * ech))), Image.BICUBIC if ech < 1.6 else Image.BILINEAR)
    if abs(angle) > 0.05:
        c = c.rotate(angle, resample=Image.BICUBIC, expand=True)
    if alpha < 0.999:
        a = c.getchannel("A").point(lambda v: int(v * alpha))
        c = c.copy()
        c.putalpha(a)
    if ancre == "mm":
        x, y = int(cx - c.width / 2), int(cy - c.height / 2)
    elif ancre == "lm":
        x, y = int(cx), int(cy - c.height / 2)
    elif ancre == "rm":
        x, y = int(cx - c.width), int(cy - c.height / 2)
    else:
        x, y = int(cx), int(cy)
    fond.alpha_composite(c, (x, y)) if _dans(fond, c, x, y) else _coller_bord(fond, c, x, y)


def _dans(f, c, x, y):
    return x >= 0 and y >= 0 and x + c.width <= f.width and y + c.height <= f.height


def _coller_bord(f, c, x, y):
    x0, y0 = max(0, -x), max(0, -y)
    x1, y1 = min(c.width, f.width - x), min(c.height, f.height - y)
    if x1 <= x0 or y1 <= y0:
        return
    f.alpha_composite(c.crop((x0, y0, x1, y1)), (x + x0, y + y0))


# ---------- les fonds ----------
@functools.lru_cache(maxsize=8)
def fond_encre(W, H, lueur=ROSE):
    """L'encre du site, une lueur rose en haut à droite, une violette en bas à gauche, une trame de points."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    im = np.zeros((H, W, 3), np.float32) + np.array(ENCRE, np.float32)
    for (cx, cy, r, col, k) in ((0.82 * W, 0.12 * H, 0.75 * max(W, H), lueur, 0.33), (0.1 * W, 0.95 * H, 0.7 * max(W, H), VIOLET, 0.28)):
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
        a = np.clip(1 - d, 0, 1) ** 2 * k
        im = im * (1 - a[..., None]) + np.array(col, np.float32) * a[..., None]
    pts = ((x % 26 < 2.2) & (y % 26 < 2.2)).astype(np.float32) * 0.06
    im = im + 255 * pts[..., None] * np.array([1, 0.6, 0.85])
    return Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).convert("RGBA")


def kanji_img(c, taille, couleur=(255, 255, 255), alpha=40, trait=0):
    f = police(KANJI, taille)
    b = f.getbbox(c)
    im = Image.new("RGBA", (b[2] + 20, b[3] + 20), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), c, font=f, fill=couleur + (alpha,), stroke_width=trait, stroke_fill=couleur + (alpha,))
    return im


# ---------- cadres ----------
def cadre_carte(img, rayon=28, trait=6, ombre=16, coul_ombre=OMBRE, barre=None):
    """Une capture dans une carte du site : coins ronds, trait d'encre, ombre violette franche ; barre de navigateur en option."""
    hb = 0
    if barre:
        hb = max(44, img.width // 32)
    W, H = img.width + 2 * trait, img.height + 2 * trait + hb
    im = Image.new("RGBA", (W + ombre, H + ombre), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((ombre, ombre, W + ombre - 1, H + ombre - 1), rayon, fill=coul_ombre + (255,))
    d.rounded_rectangle((0, 0, W - 1, H - 1), rayon, fill=ENCRE + (255,))
    if barre:
        d.rounded_rectangle((0, 0, W - 1, hb + rayon), rayon, fill=(44, 16, 40, 255))
        for k, c in enumerate(((255, 95, 135), (255, 200, 90), (120, 220, 140))):
            r = hb // 6
            d.ellipse((trait + 18 + k * (3 * r) - r, hb // 2 - r + 2, trait + 18 + k * (3 * r) + r, hb // 2 + r + 2), fill=c + (255,))
        f = police(TEXTE_B, int(hb * 0.42))
        lw = int(f.getlength(barre)) + 60
        cx = W // 2
        d.rounded_rectangle((cx - lw // 2, hb * 0.2 + 2, cx + lw // 2, hb * 0.8 + 2), hb // 3, fill=(24, 8, 22, 255))
        d.text((cx, hb // 2 + 2), "🔒 " + barre if False else barre, font=f, fill=(230, 200, 225, 255), anchor="mm")
    masque = Image.new("L", img.size, 0)
    ImageDraw.Draw(masque).rounded_rectangle((0, 0, img.width - 1, img.height - 1), max(4, rayon - trait), fill=255)
    if barre:
        masque = Image.new("L", img.size, 255)
        ImageDraw.Draw(masque).rectangle((0, 0, 1, 1), fill=255)
        # coins du bas arrondis seulement
        m2 = Image.new("L", img.size, 0)
        ImageDraw.Draw(m2).rounded_rectangle((0, -rayon, img.width - 1, img.height - 1), max(4, rayon - trait), fill=255)
        masque = m2
    im.paste(img.convert("RGB"), (trait, trait + hb), masque)
    d.rounded_rectangle((0, 0, W - 1, H - 1), rayon, outline=ENCRE + (255,), width=trait)
    return im


def perspective(img, ry=0.0, rx=0.0, f=2.2):
    """Une rotation 3D simple (degrés autour de y puis de x), projetée : pour faire pivoter une carte."""
    w, h = img.size
    ry, rx = math.radians(ry), math.radians(rx)
    pts = []
    for (x, y) in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
        X = x * math.cos(ry)
        Z = x * math.sin(ry)
        Y = y * math.cos(rx) - Z * math.sin(rx)
        Z = y * math.sin(rx) + Z * math.cos(rx)
        k = f * w / (f * w + Z)
        pts.append((X * k, Y * k))
    minx, miny = min(p[0] for p in pts), min(p[1] for p in pts)
    maxx, maxy = max(p[0] for p in pts), max(p[1] for p in pts)
    W, H = int(maxx - minx) + 2, int(maxy - miny) + 2
    dst = [(p[0] - minx, p[1] - miny) for p in pts]
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    coeffs = _coeffs(dst, src)
    return img.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC)


def _coeffs(pa, pb):
    m = []
    for p1, p2 in zip(pa, pb):
        m.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0] * p1[0], -p2[0] * p1[1]])
        m.append([0, 0, 0, p1[0], p1[1], 1, -p2[1] * p1[0], -p2[1] * p1[1]])
    A = np.array(m, np.float64)
    B = np.array(pb, np.float64).reshape(8)
    return np.linalg.solve(A, B).tolist()


# ---------- transitions ----------
def balayage(im, t, angle=-18, couleurs=(ROSE, VIOLET, ENCRE), largeur=None):
    """Trois bandes obliques qui traversent l'écran (0→0.5 : elles couvrent, 0.5→1 : elles dégagent)."""
    if t <= 0 or t >= 1:
        return
    W, H = im.size
    largeur = largeur or int(W * 0.5)
    d = ImageDraw.Draw(im)
    pente = math.tan(math.radians(angle)) * H
    for k, c in enumerate(couleurs):
        dec = k * 0.08
        u = cl((t - dec) / (1 - 0.16))
        x0 = -W * 1.6 + u * (W * 3.2) - k * 0
        bord1 = x0
        bord2 = x0 + largeur * 2.2
        d.polygon([(bord1, 0), (bord2, 0), (bord2 + pente, H), (bord1 + pente, H)], fill=c + (255,))


def iris(im, src, t, cx=None, cy=None):
    """Un rond d'encre qui s'ouvre sur src."""
    W, H = im.size
    cx = W / 2 if cx is None else cx
    cy = H / 2 if cy is None else cy
    r = sortie(t) * math.hypot(W, H) * 0.6
    if r < 1:
        return
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    im.paste(src, (0, 0), m)
    if t < 0.98:
        ImageDraw.Draw(im).ellipse((cx - r, cy - r, cx + r, cy + r), outline=ROSE + (255,), width=max(2, int(14 * (1 - t))))


def flash(im, force):
    if force <= 0.01:
        return
    blanc = Image.new("RGBA", im.size, (255, 240, 250, int(255 * cl(force))))
    im.alpha_composite(blanc)


def secousse(t, debut, force=18, duree=0.35, graine=1):
    """Un tremblement d'impact (dx, dy) qui s'éteint."""
    u = (t - debut) / duree
    if u < 0 or u > 1:
        return 0, 0
    a = (1 - u) ** 2 * force
    return a * math.sin(u * 47 + graine), a * math.cos(u * 39 + graine * 2)


# ---------- particules ----------
def etincelles(im, t, n=26, graine=3, zone=None, coul=(255, 255, 255)):
    W, H = im.size
    zone = zone or (0, 0, W, H)
    rnd = random.Random(graine)
    d = ImageDraw.Draw(im)
    for i in range(n):
        x = rnd.uniform(zone[0], zone[2])
        y = rnd.uniform(zone[1], zone[3])
        ph = rnd.uniform(0, 6.28)
        v = rnd.uniform(1.2, 3.0)
        s = (0.5 + 0.5 * math.sin(t * v * 3 + ph)) * rnd.uniform(6, 16)
        if s < 1:
            continue
        a = int(200 * (0.4 + 0.6 * math.sin(t * v * 3 + ph) ** 2))
        c = coul + (a,)
        d.polygon([(x, y - s), (x + s * 0.28, y - s * 0.28), (x + s, y), (x + s * 0.28, y + s * 0.28), (x, y + s), (x - s * 0.28, y + s * 0.28), (x - s, y), (x - s * 0.28, y - s * 0.28)], fill=c)


@functools.lru_cache(maxsize=8)
def petale_img(taille=40, coul=(255, 183, 213)):
    im = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((taille * 0.15, 0, taille * 0.85, taille), fill=coul + (255,), outline=(201, 60, 120, 255), width=2)
    d.polygon([(taille * 0.5, taille * 0.05), (taille * 0.42, 0), (taille * 0.58, 0)], fill=(0, 0, 0, 0))
    return im


@functools.lru_cache(maxsize=8)
def piece_img(taille=46):
    im = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((2, 2, taille - 3, taille - 3), fill=(255, 196, 61, 255), outline=(122, 72, 10, 255), width=3)
    d.ellipse((taille * 0.22, taille * 0.22, taille * 0.78, taille * 0.78), outline=(255, 232, 150, 255), width=3)
    f = police(TITRE, int(taille * 0.42))
    d.text((taille / 2, taille / 2 + 1), "V", font=f, fill=(150, 90, 10, 255), anchor="mm")
    return im


@functools.lru_cache(maxsize=8)
def pieuvre_img(taille=90):
    """La petite pieuvre rose (le même dessin original qu'en 3D), à plat."""
    S = taille * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rose, fonce, enc = (255, 98, 166, 255), (201, 36, 111, 255), (42, 12, 30, 255)
    cx, cy = S * 0.5, S * 0.42
    # tentacules : des arcs épais qui s'enroulent
    for k in range(6):
        a = math.pi * (0.15 + 0.7 * k / 5)
        pts = []
        for i in range(12):
            u = i / 11
            r = S * (0.12 + 0.3 * u)
            b = a + (0.9 * u * u) * (1 if k % 2 else -1)
            pts.append((cx + math.cos(b) * r * 1.05, cy + S * 0.12 + math.sin(b) * r * 0.55 + u * S * 0.12))
        for w, c in ((int(S * 0.075) + 10, enc), (int(S * 0.075), rose)):
            for i in range(len(pts) - 1):
                ww = int(w * (1 - 0.6 * i / 11))
                d.line([pts[i], pts[i + 1]], fill=c, width=max(3, ww))
                d.ellipse((pts[i + 1][0] - ww / 2, pts[i + 1][1] - ww / 2, pts[i + 1][0] + ww / 2, pts[i + 1][1] + ww / 2), fill=c)
    R = S * 0.27
    d.ellipse((cx - R - 6, cy - R * 1.1 - 6, cx + R + 6, cy + R * 0.95 + 6), fill=enc)
    d.ellipse((cx - R, cy - R * 1.1, cx + R, cy + R * 0.95), fill=rose)
    for (x, y, r) in ((0.12, -0.75, 0.07), (-0.35, -0.55, 0.05), (0.4, -0.45, 0.05)):
        d.ellipse((cx + x * R - r * S, cy + y * R - r * S, cx + x * R + r * S, cy + y * R + r * S), fill=fonce)
    for s in (-1, 1):
        ex, ey = cx + s * R * 0.38, cy + R * 0.1
        d.ellipse((ex - S * 0.035, ey - S * 0.05, ex + S * 0.035, ey + S * 0.05), fill=(12, 3, 8, 255))
        d.ellipse((ex - S * 0.012 + S * 0.01, ey - S * 0.03, ex + S * 0.012 + S * 0.01, ey - S * 0.005), fill=(255, 255, 255, 255))
        d.ellipse((cx + s * R * 0.68 - S * 0.03, cy + R * 0.42 - S * 0.018, cx + s * R * 0.68 + S * 0.03, cy + R * 0.42 + S * 0.018), fill=(255, 47, 134, 255))
    return im.resize((taille, taille), Image.LANCZOS)


def pluie(im, t, sprite, n=14, graine=5, debut=0.0, vitesse=520, zone=None, tourne=True, echelle=(0.6, 1.1)):
    """Des objets qui tombent en tournoyant (pétales, pièces, pieuvres)."""
    W, H = im.size
    zone = zone or (0, W)
    rnd = random.Random(graine)
    for i in range(n):
        x0 = rnd.uniform(*zone)
        t0 = debut + rnd.uniform(0, 1.2)
        v = vitesse * rnd.uniform(0.75, 1.25)
        u = t - t0
        if u < 0:
            continue
        y = -80 + u * v
        if y > H + 100:
            continue
        x = x0 + math.sin(u * rnd.uniform(1.5, 3) + i) * 40
        a = (u * rnd.uniform(-220, 220) + i * 40) if tourne else math.sin(u * 4 + i) * 15
        poser(im, sprite, x, y, rnd.uniform(*echelle), a)


# ---------- lecture des vidéos ----------
class Lecteur:
    """Lit les images d'une vidéo à la suite (ffmpeg), à partir d'un instant, à une taille donnée."""

    def __init__(self, chemin, debut=0.0, taille=None, crop=None):
        vf = []
        if crop:
            vf.append("crop=%d:%d:%d:%d" % crop)
        if taille:
            vf.append("scale=%d:%d:flags=lanczos" % taille)
        vf.append("fps=30")
        self.taille = taille
        if not taille:
            r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", chemin], capture_output=True, text=True)
            w, h = map(int, r.stdout.strip().split(","))
            self.taille = (crop[0], crop[1]) if crop else (w, h)
        self.p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(debut), "-i", chemin, "-vf", ",".join(vf), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
        self.dernier = None

    def suivante(self):
        w, h = self.taille
        b = self.p.stdout.read(w * h * 3)
        if len(b) == w * h * 3:
            self.dernier = Image.frombuffer("RGB", (w, h), b, "raw", "RGB", 0, 1)
        return self.dernier

    def fermer(self):
        try:
            self.p.kill()
        except Exception:
            pass


class Encodeur:
    def __init__(self, chemin, W, H):
        self.tmp = chemin[:-4] + ".tmp.mp4"
        self.chemin = chemin
        self.p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                   "-c:v", "libx264", "-crf", "17", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), self.tmp], stdin=subprocess.PIPE)

    def ajouter(self, im):
        self.p.stdin.write(im.convert("RGB").tobytes())

    def fin(self):
        self.p.stdin.close()
        if self.p.wait() == 0:
            os.replace(self.tmp, self.chemin)
        else:
            raise RuntimeError("ffmpeg a échoué : " + self.chemin)
