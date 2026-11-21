# Le montage du générique de GRAND LINE : les plans 3D rendus dans Blender, l'étalonnage (nuit froide, jour vif), le grain,
# les titres (la police du site), les éclairs et les fondus. Le son est fait à part (mix_gen.py), puis tout est assemblé.
# Usage : python3 montage_gen.py [debut fin]      (sans argument : tout ; sinon un extrait, pour regarder)
#         python3 montage_gen.py apercu t1 t2 …     (quelques images fixes : apercu-<t>.jpg)
import sys, os, math, random, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "teaser2"))  # mg.py : les polices et les titres du teaser
import mg
from mg import texte_img, poser, police, TITRE, TEXTE, TEXTE_B, cl, lisse, sortie, entree, ressort, ENCRE, OMBRE, ROSE, VIOLET, PAPIER, OR
import plan_gen as P

W, H = 1920, 1080
FPS = P.FPS
RENDUS = os.environ.get("GEN_RENDUS", "/mnt/user-data/uploads/Barhaw-3D/rendus/generique/")  # les plans rendus par Blender
ICI = os.environ.get("GEN_DOSSIER", "/home/claude/generique/")  # le dossier de travail (sortie/ dedans)
SORTIE = ICI + "sortie/"
os.makedirs(SORTIE, exist_ok=True)


# ---------------------------------------------------------------------------------------------------------------------
# les sources : les vidéos rendues, lues à la suite (ffmpeg)
# ---------------------------------------------------------------------------------------------------------------------
class Source:
    def __init__(self, nom, debut):
        self.nom = nom
        self.dernier = None
        chemin = RENDUS + nom + ".mp4"
        self.p = None
        if not os.path.exists(chemin):
            self.fixe = self._remplacant(nom)
            return
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", chemin],
                           capture_output=True, text=True)
        w, h = map(int, r.stdout.strip().split(","))
        vf = []
        if (w, h) != (W, H):
            if w == W and h > H:  # les îles : 1920 × 1200, le même cadrage ; on garde le milieu
                vf.append(f"crop={W}:{H}:0:{(h - H) // 2}")
            else:
                vf.append(f"scale={W}:{H}:flags=lanczos")
        args = ["ffmpeg", "-v", "error", "-ss", f"{debut / FPS:.4f}", "-i", chemin]
        if vf:
            args += ["-vf", ",".join(vf)]
        args += ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
        self.p = subprocess.Popen(args, stdout=subprocess.PIPE)
        self.fixe = None

    def _remplacant(self, nom):
        """Pas encore rendu : une image d'essai s'il y en a une, sinon un aplat gris avec le nom du plan."""
        essais = sorted(f for f in os.listdir(RENDUS) if f.startswith(f"essai-{nom}-") and f.endswith(".png")) if os.path.isdir(RENDUS) else []
        if essais:
            im = Image.open(RENDUS + essais[0]).convert("RGB")
            if im.size != (W, H):
                im = im.crop((0, (im.height - H) // 2, W, (im.height - H) // 2 + H)) if im.width == W and im.height > H else im.resize((W, H))
            return np.asarray(im)
        im = Image.new("RGB", (W, H), (60, 60, 70))
        ImageDraw.Draw(im).text((W // 2, H // 2), f"[{nom}]", font=police(TITRE, 80), fill=(200, 200, 210), anchor="mm")
        return np.asarray(im)

    def image(self):
        if self.fixe is not None:
            return self.fixe
        b = self.p.stdout.read(W * H * 3)
        if len(b) == W * H * 3:
            self.dernier = np.frombuffer(b, np.uint8).reshape(H, W, 3)
        if self.dernier is None:
            self.dernier = np.zeros((H, W, 3), np.uint8)
        return self.dernier

    def fermer(self):
        if self.p:
            try:
                self.p.kill()
            except Exception:
                pass


# ---------------------------------------------------------------------------------------------------------------------
# l'étalonnage, le grain, le vignettage
# ---------------------------------------------------------------------------------------------------------------------
def _vignette(force):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
    return (1 - force * np.clip(d - 0.25, 0, 1) ** 1.6 / 0.75 ** 1.6)[..., None].astype(np.float32)


VIG_NUIT, VIG_JOUR = _vignette(0.42), _vignette(0.18)
GRAIN = np.random.default_rng(3).standard_normal((8, H // 2, W // 2)).astype(np.float32)


def etalonner(img, nuit, n):
    a = img.astype(np.float32) / 255.0
    if nuit:
        # la nuit : les noirs plus profonds, un peu de bleu-vert dans les ombres, un contraste doux
        a = np.clip((a - 0.018) / 0.982, 0, 1) ** 1.12
        ombre = (1 - a.mean(axis=2, keepdims=True)) ** 2
        a = a + ombre * np.array([-0.004, 0.006, 0.016], np.float32)
        a = a * VIG_NUIT
        g = GRAIN[n % 8]
        a = a + np.repeat(np.repeat(g, 2, axis=0), 2, axis=1)[..., None] * 0.013
    else:
        # le jour : un peu plus de couleur, un rien de chaud
        l = a.mean(axis=2, keepdims=True)
        a = l + (a - l) * 1.10
        a = a * np.array([1.012, 1.0, 0.985], np.float32)
        a = (a - 0.5) * 1.04 + 0.5
        a = a * VIG_JOUR
        g = GRAIN[n % 8]
        a = a + np.repeat(np.repeat(g, 2, axis=0), 2, axis=1)[..., None] * 0.006
    return np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)


def zoomer(img, z):
    if abs(z - 1) < 1e-3:
        return img
    w, h = int(W / z), int(H / z)
    x, y = (W - w) // 2, (H - h) // 2
    return np.asarray(Image.fromarray(img[y:y + h, x:x + w]).resize((W, H), Image.BILINEAR))


def melanger(a, b, t):
    return (a.astype(np.float32) * (1 - t) + b.astype(np.float32) * t).astype(np.uint8)


def eclair(img, force, couleur=(255, 255, 255)):
    if force <= 0.003:
        return img
    a = img.astype(np.float32)
    a = a + (np.array(couleur, np.float32) - a) * min(1.0, force)
    return a.astype(np.uint8)


# ---------------------------------------------------------------------------------------------------------------------
# les titres
# ---------------------------------------------------------------------------------------------------------------------
@functools.lru_cache(maxsize=4)
def titre_img(taille):
    return texte_img("GRAND LINE", TITRE, taille, couleur=PAPIER, espacement=int(taille * 0.06))


@functools.lru_cache(maxsize=4)
def sous_titre_img(txt, taille):
    return texte_img(txt, TEXTE, taille, couleur=PAPIER, espacement=int(taille * 0.28), ombre=0, trait=max(2, taille // 9))


@functools.lru_cache(maxsize=16)
def nom_img(txt, taille, degrade=None):
    return texte_img(txt, TITRE, taille, couleur=PAPIER, degrade=degrade, espacement=int(taille * 0.04))


@functools.lru_cache(maxsize=16)
def lieu_img(txt):
    return texte_img(txt, TEXTE_B, 34, couleur=PAPIER, ombre=0, trait=3)


def reflet(calque, u):
    """Un trait de lumière qui traverse les lettres (u de 0 à 1)."""
    if u <= 0 or u >= 1:
        return calque
    w, h = calque.size
    bande = Image.new("L", (w, h), 0)
    x = -0.3 * w + u * 1.6 * w
    ImageDraw.Draw(bande).polygon([(x, 0), (x + w * 0.12, 0), (x + w * 0.12 - h * 0.5, h), (x - h * 0.5, h)], fill=200)
    bande = bande.filter(ImageFilter.GaussianBlur(8))
    alpha = calque.getchannel("A")
    masque = Image.fromarray((np.asarray(bande, np.float32) * np.asarray(alpha, np.float32) / 255).astype(np.uint8))
    blanc = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    blanc.putalpha(masque)
    c = calque.copy()
    c.alpha_composite(blanc)
    return c


def titre(fond, t, t0, y=0.25, taille=160, fin=None, sous="BARHAW  ·  VF 1.0"):
    u = t - t0
    if u < 0 or (fin is not None and t > fin):
        return
    sortie_ = 1.0 if fin is None else cl((fin - t) / 0.25)
    e = ressort(u / 0.5, 7.0, 2.0)
    c = reflet(titre_img(taille), (u - 0.25) / 0.7)
    poser(fond, c, W / 2, H * y, 0.82 + 0.18 * e + 0.015 * u, 0, cl(u / 0.12) * sortie_)
    v = u - 0.35
    if v > 0 and sous:
        poser(fond, sous_titre_img(sous, 36), W / 2, H * y + taille * 0.80, 1.0, 0, sortie(v / 0.3) * sortie_)


def etiquette_ile(fond, t, t0, nom, lieu):
    u = t - t0
    if u < 0:
        return
    e = sortie(u / 0.18)
    x = 86 - 50 * (1 - e)
    poser(fond, nom_img(nom, 62), x, H - 170, 1.0, 0, e, ancre="lm")
    v = u - 0.06
    if v > 0:
        poser(fond, lieu_img(lieu), x + 4, H - 112, 1.0, 0, sortie(v / 0.18), ancre="lm")


def nom_boss(fond, t, t0, nom):
    u = t - t0
    if u < 0:
        return
    e = sortie(u / 0.16)
    dx, dy = mg.secousse(t, t0, 14, 0.3, graine=len(nom))
    poser(fond, nom_img(nom, 150, ((255, 214, 120), (255, 70, 96))), W / 2 + dx, H * 0.80 + dy, 1.35 - 0.35 * e, 0, cl(u / 0.06))


# ---------------------------------------------------------------------------------------------------------------------
# les plans spéciaux : le noir des arrêts (et l'aube qui vient), le logo
# ---------------------------------------------------------------------------------------------------------------------
@functools.lru_cache(maxsize=2)
def _brume_noire():
    rng = np.random.default_rng(11)
    b = rng.random((H // 16, W // 16)).astype(np.float32)
    im = Image.fromarray((b * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
    return np.asarray(im, np.float32) / 255.0


def plan_noir(t, t0, t1, reglages):
    u = t - t0
    a = np.zeros((H, W, 3), np.float32)
    # une brume à peine visible qui glisse
    br = np.roll(_brume_noire(), int(u * 40), axis=1)
    a += (br * 0.035)[..., None] * np.array([0.55, 0.62, 0.8], np.float32)
    if reglages.get("aube"):  # l'aube qui vient : une ligne d'horizon qui s'allume, de plus en plus large
        v = cl((t - (t1 - 1.15)) / 1.15)
        if v > 0:
            y = np.arange(H, dtype=np.float32)[:, None]
            x = np.arange(W, dtype=np.float32)[None, :]
            ligne = np.exp(-((y - H * 0.56) / (2 + 26 * v)) ** 2) * np.clip(1 - np.abs(x - W / 2) / (W * (0.08 + 0.55 * v)), 0, 1) ** 1.5
            a += (ligne * (0.15 + 0.85 * v ** 2))[..., None] * np.array([1.0, 0.78, 0.52], np.float32)
    img = np.clip(a * 255, 0, 255).astype(np.uint8)
    for e in reglages.get("eclairs", []):
        img = eclair(img, 0.95 * math.exp(-max(0.0, t - e) / 0.07) if t >= e else 0.0, (235, 240, 255))
    return img


@functools.lru_cache(maxsize=1)
def _fond_monde():
    """Le fond du logo : la dernière image du réveil (l'archipel vu de haut), là où on a commencé le voyage."""
    src = Source("jour_eveil", 110)  # on lit jusqu'au bout : la toute dernière image se lit mal en sautant dessus
    im = None
    for _ in range(12):
        im = src.image().copy()
    src.fermer()
    return im


@functools.lru_cache(maxsize=1)
def _halo_logo():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / W) ** 2 + ((y - H * 0.47) / H) ** 2)
    return (np.clip(1 - d * 1.9, 0, 1) ** 2)[..., None] * np.array([0.10, 0.07, 0.16], np.float32)


@functools.lru_cache(maxsize=1)
def _couchant():
    """Le soleil couchant (hors champ, à droite) : une lueur le long de l'horizon, et le haut du ciel qui fonce."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    hy = H * 0.212
    bande = np.exp(-((y - hy) / (H * 0.075)) ** 2) * (0.5 + 0.5 * np.exp(-((x - W * 0.78) / (W * 0.38)) ** 2))
    ciel = np.clip((hy - y) / hy, 0, 1)
    return bande[..., None].astype(np.float32), ciel[..., None].astype(np.float32)


PHARE = (1069.0, 794.0)  # la lanterne du phare sur la dernière image du réveil


def _feu_du_phare(z, force):
    """La lanterne du phare qui s'allume à la tombée de la nuit : un cœur chaud, un halo, un trait de lumière."""
    lx, ly = W / 2 + (PHARE[0] - W / 2) * z, H / 2 + (PHARE[1] - H / 2) * z
    x0, x1, y0, y1 = int(lx - 360), int(lx + 360), int(ly - 90), int(ly + 90)
    y, x = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d2 = (x - lx) ** 2 + (y - ly) ** 2
    v = 0.95 * np.exp(-d2 / (2 * 5.0 ** 2)) + 0.28 * np.exp(-d2 / (2 * 34.0 ** 2))
    v += 0.14 * np.exp(-((y - ly) / 2.2) ** 2) * np.exp(-((x - lx) / 190.0) ** 2)
    return (y0, y1, x0, x1), (v * force)[..., None] * np.array([1.0, 0.86, 0.58], np.float32)


@functools.lru_cache(maxsize=1)
def _etoiles():
    rng = random.Random(21)
    return [(rng.uniform(40, W - 40), rng.uniform(18, H * 0.30), rng.uniform(0.8, 2.2), rng.uniform(0, 6.28), rng.uniform(0.15, 0.95))
            for _ in range(70)]


def plan_logo(t, t0, t1):
    """Le logo : le soleil se couche sur GRAND LINE. L'archipel du début passe de l'or du soir au bleu de la nuit, les
    premières étoiles s'allument, la caméra avance à peine ; puis la brume de la fin reprend tout."""
    u = t - t0
    k = lisse(cl(u / (t1 - t0)))
    img = zoomer(_fond_monde(), 1.0 + 0.06 * k)
    a = img.astype(np.float32) / 255.0
    lum = a.mean(axis=2, keepdims=True)
    a = lum + (a - lum) * (0.95 - 0.55 * k)
    chaud, froid = np.array([1.14, 0.84, 0.64], np.float32), np.array([0.40, 0.48, 0.86], np.float32)
    a = a * (chaud * (1 - k) + froid * k) * (0.72 - 0.48 * k)
    bande, ciel = _couchant()
    a = a * (1 - ciel * (0.25 + 0.45 * k))
    a = a + bande * (np.array([1.0, 0.52, 0.30], np.float32) * 0.42 * (1 - k) ** 1.3 + np.array([0.50, 0.28, 0.62], np.float32) * 0.30 * k * (1 - k))
    a = a * VIG_NUIT + _halo_logo() * (0.6 + 0.4 * k)
    br = np.roll(_brume_noire(), int(u * 60), axis=1)
    a += (br * (0.03 + 0.06 * k))[..., None] * np.array([0.6, 0.62, 0.8], np.float32)
    f = lisse(cl((k - 0.28) / 0.3)) * (0.82 + 0.18 * math.cos(u * 2 * math.pi / 1.4))
    if f > 0:
        (y0, y1, x0, x1), lum_ = _feu_du_phare(1.0 + 0.06 * k, f)
        a[y0:y1, x0:x1] += lum_
    return np.clip(a * 255, 0, 255).astype(np.uint8)


def etoiles(fond, t, k):
    """Les premières étoiles, qui s'allument une à une pendant que la nuit tombe."""
    if k <= 0:
        return
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    for x, y, r, ph, seuil in _etoiles():
        v = cl((k - seuil * 0.8) / 0.2)
        if v <= 0:
            continue
        a = int(255 * v * (0.65 + 0.35 * math.sin(t * 5.0 + ph)))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(235, 238, 255, a))
    fond.alpha_composite(calque.filter(ImageFilter.GaussianBlur(0.6)))


# ---------------------------------------------------------------------------------------------------------------------
# le rendu image par image
# ---------------------------------------------------------------------------------------------------------------------
def plan_a(t):
    for k, (nom, a, b, d, r) in enumerate(P.PLANS):
        if a - 1e-6 <= t < b - 1e-6:
            return k
    return len(P.PLANS) - 1


class Monteur:
    def __init__(self):
        self.sources = {}

    def source(self, k, decalage=0):
        nom, a, b, d, r = P.PLANS[k]
        if k not in self.sources:
            self.sources[k] = Source(nom, d + decalage)
        return self.sources[k]

    def fermer_avant(self, k):
        for j in list(self.sources):
            if j < k - 1:
                self.sources.pop(j).fermer()

    def image(self, n, k_debut=None):
        t = n / FPS
        k = plan_a(t)
        self.fermer_avant(k)
        nom, a, b, d, r = P.PLANS[k]
        u = t - a
        nuit = bool(r.get("nuit"))
        if nom == "noir":
            img = plan_noir(t, a, b, r)
            nuit = False
            base = img
        elif nom == "logo":
            base = plan_logo(t, a, b)
        else:
            src = self.source(k, max(0, n - round(a * FPS)) if k_debut == k and n != round(a * FPS) else 0)
            base = src.image()
            if r.get("zoom"):
                base = zoomer(base, r["zoom"] + 0.03 * u)
            base = etalonner(base, nuit, n)
        img = base
        # les fondus
        if r.get("fondu_entree") and u < r["fondu_entree"]:
            img = (img.astype(np.float32) * lisse(u / r["fondu_entree"])).astype(np.uint8)
        if r.get("fondu_sortie") and t > b - r["fondu_sortie"]:
            img = (img.astype(np.float32) * lisse((b - t) / r["fondu_sortie"])).astype(np.uint8)
        # les éclairs aux coupes : les éclats de la montée, les îles, les boss, le refrain
        if 16.7 <= a < 20.5 and u < 0.12:
            img = eclair(img, 0.55 * (1 - u / 0.12))
        if r.get("ile") and u < 0.07:
            img = eclair(img, 0.22 * (1 - u / 0.07))
        if r.get("boss") and u < 0.14:
            img = eclair(img, 0.45 * (1 - u / 0.14), (255, 70, 80))
        if nom in ("jour_eveil", "logo") and u < 0.3:
            img = eclair(img, 0.85 * (1 - u / 0.3) ** 1.5)
        if nom == "nuit_boss":  # l'éclair qui le révèle (images 6 et 33 du rendu)
            for f in (6, 33):
                img = eclair(img, 0.35 * math.exp(-abs(n - round(a * FPS) + d - f) / 1.2) if n - round(a * FPS) + d >= f - 1 else 0, (225, 220, 255))
        # les titres
        fond = None
        if r.get("titre") or r.get("ile") or r.get("boss") or nom == "logo":
            fond = Image.fromarray(img).convert("RGBA")
            if r.get("titre"):
                titre(fond, t, a + 0.02, y=0.24, fin=b - 0.02)
            if r.get("ile"):
                etiquette_ile(fond, t, a + 0.05, *P.ILES[r["ile"]])
            if r.get("boss"):
                nom_boss(fond, t, a + 0.03, r["boss"])
            if nom == "logo":
                etoiles(fond, t, lisse(cl((t - a) / (b - a))))
                titre(fond, t, a + 0.02, y=0.46, taille=170, sous="BARHAW", fin=None)
                mg.etincelles(fond, t, n=12, graine=5, zone=(W * 0.22, H * 0.32, W * 0.78, H * 0.62), coul=(255, 220, 160))
                v = cl((t - (b - 0.45)) / 0.45)  # le logo s'efface dans la brume de la fin
                if v > 0:
                    fond.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * lisse(v) * 0.75))))
            img = np.asarray(fond.convert("RGB"))
        return img


def encoder(debut, fin, chemin):
    tmp = chemin[:-4] + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "15", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), tmp], stdin=subprocess.PIPE)
    m = Monteur()
    n0, n1 = round(debut * FPS), round(fin * FPS)
    for n in range(n0, n1):
        k = plan_a(n / FPS)
        img = m.image(n, k_debut=k if n == n0 else None)
        p.stdin.write(img.tobytes())
        if n % 60 == 0:
            print("image", n, "/", n1, flush=True)
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, chemin)
    for s in m.sources.values():
        s.fermer()


def apercu(instants):
    m = Monteur()
    for t in sorted(instants):
        n = round(t * FPS)
        # on rejoue depuis le début du plan pour avoir la bonne image
        k = plan_a(t)
        nom, a, b, d, r = P.PLANS[k]
        m.sources.pop(k, None)
        n0 = round(a * FPS)
        img = None
        for j in range(n0, n + 1):
            img = m.image(j, k_debut=k if j == n0 else None)
        Image.fromarray(img).resize((960, 540), Image.LANCZOS).save(f"{SORTIE}apercu-{t:05.2f}.jpg", quality=88)
    for s in m.sources.values():
        s.fermer()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "apercu":
        apercu([float(x) for x in sys.argv[2:]])
    elif len(sys.argv) == 3:
        encoder(float(sys.argv[1]), float(sys.argv[2]), f"{SORTIE}extrait-{sys.argv[1]}-{sys.argv[2]}.mp4")
    else:
        encoder(0, P.DUREE, f"{SORTIE}generique-image.mp4")
