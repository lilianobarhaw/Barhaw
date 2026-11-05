# Le teaser de la VF 1.0 (version 2) : le montage en motion design, calé sur la musique (Artlist, 155 BPM).
# Usage : python3 montage.py h|v [scène …]     (h = 1920×1080, v = 1080×1920) ; sans scène : toutes, puis l'assemblage.
import math, os, random, subprocess, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from mg import *

ICI = "/home/claude/teaser2"
PL = ICI + "/plans/"
B3 = ICI + "/blender/"
TEMPS = 60 / 155
MES = 4 * TEMPS
FMT = sys.argv[1] if len(sys.argv) > 1 else "h"
W, H = (1920, 1080) if FMT == "h" else (1080, 1920)
V = FMT == "v"
SORT = f"{ICI}/scenes-{FMT}/"
os.makedirs(SORT, exist_ok=True)


def b(n):  # le début de la mesure n (vidéo)
    return n * MES


def bt(n):  # le temps n
    return n * TEMPS


def fond():
    return fond_encre(W, H).copy()


def plein(img, ech=1.0, dx=0.0, dy=0.0):
    """Une image 16:9 en plein cadre (horizontal), ou en bande au milieu sur un fond flou (vertical)."""
    if not V:
        im = img.convert("RGBA")
        if ech != 1.0 or dx or dy:
            w, h = int(W * ech), int(H * ech)
            im = im.resize((w, h), Image.BILINEAR)
            x, y = int((W - w) / 2 + dx), int((H - h) / 2 + dy)
            c = Image.new("RGBA", (W, H))
            c.paste(im, (x, y))
            return c
        return im.resize((W, H), Image.BILINEAR) if im.size != (W, H) else im
    # vertical : le fond, c'est la même image, agrandie, floutée, assombrie
    k = H / img.height
    grand = img.resize((int(img.width * k * 1.02), int(H * 1.02)), Image.BILINEAR)
    x = (grand.width - W) // 2
    fondu = grand.crop((x, 0, x + W, H)).filter(ImageFilter.GaussianBlur(26))
    fondu = Image.blend(fondu.convert("RGB"), Image.new("RGB", (W, H), ENCRE), 0.45).convert("RGBA")
    bande = img.convert("RGBA").resize((int(W * 1.18 * ech), int(W * 1.18 * ech * img.height / img.width)), Image.BILINEAR)
    poser(fondu, bande, W / 2 + dx, H * 0.5 + dy)
    return fondu


def recadre_vertical(img, cx=0.5, ech=1.0):
    """Pour un plan 3D en vertical : un recadrage 9:16 plein cadre (plan large → on garde le centre choisi)."""
    h = img.height
    w = int(h * 9 / 16 / ech)
    hh = int(h / ech)
    x = int(cl(cx * img.width - w / 2, 0, img.width - w))
    y = (h - hh) // 2
    return img.crop((x, y, x + w, y + hh)).resize((W, H), Image.BICUBIC).convert("RGBA")


def bandeau_cine(im, t):
    """Les bandes noires du cinéma (horizontal seulement)."""
    if V:
        return
    hb = int(96 * lisse(t))
    if hb > 0:
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, W, hb), fill=ENCRE + (255,))
        d.rectangle((0, H - hb, W, H), fill=ENCRE + (255,))


def legende(im, t, t0, gros, petit=None, x=None, y=None, taille=None, ancre="lm"):
    """Un titre qui monte en ressort, puis sa ligne en dessous."""
    u = t - t0
    if u < 0:
        return
    taille = taille or (92 if not V else 104)
    x = x if x is not None else (110 if not V else W / 2)
    y = y if y is not None else (H - 210 if not V else H * 0.80)
    a = sortie(u / 0.35)
    if V:
        ancre = "mm"
    poser(im, texte_img(gros, TITRE, taille), x, y + 40 * (1 - ressort(u / 0.6)), 1.0, 0, a, ancre)
    if petit:
        u2 = u - 0.25
        if u2 > 0:
            poser(im, etiquette_img(petit, 34 if not V else 40), x + (8 if not V else 0), y + taille * 0.95, 1.0, 2 * (1 - sortie(u2 / 0.4)), sortie(u2 / 0.3), ancre if not V else "mm")


def puce(im, t, t0, txt, x, y, taille=34, fond=ROSE, icone=None, ancre="mm", angle=0):
    u = t - t0
    if u < 0:
        return
    e = ressort(u / 0.5)
    poser(im, etiquette_img(txt, taille, fond, icone=icone), x, y, 0.4 + 0.6 * e, angle * (1 - e), cl(u / 0.15), ancre)


# ============ les scènes ============
SCENES = []


def scene(nom, debut, fin):
    def deco(f):
        SCENES.append((nom, debut, fin, f))
        return f
    return deco


# --- 1. l'ouverture : le kanji à l'encre ---
def image_ouverture(t):
    im = fond_encre(W, H, VIOLET).copy()
    d = ImageDraw.Draw(im)
    taille = 300 if not V else 280
    f = police(KANJI, taille)
    chars = "大航海"
    if V:
        pos = [(W / 2, H * 0.32 + k * taille * 1.02) for k in range(3)]
    else:
        pos = [(W / 2 + (k - 1) * taille * 1.05, H * 0.46) for k in range(3)]
    for k, c in enumerate(chars):
        u = (t - 0.15 - k * 0.32) / 0.55
        if u <= 0:
            continue
        g = Image.new("RGBA", (int(taille * 1.25), int(taille * 1.3)), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.text((g.width / 2 + 10, g.height / 2 + 12), c, font=f, fill=OMBRE + (255,), anchor="mm", stroke_width=10, stroke_fill=OMBRE + (255,))
        gd.text((g.width / 2, g.height / 2), c, font=f, fill=ROSE + (255,), anchor="mm", stroke_width=10, stroke_fill=ENCRE + (255,))
        # le pinceau : le caractère se dévoile de haut en bas
        m = Image.new("L", g.size, 0)
        hh = int(g.height * sortie(u))
        ImageDraw.Draw(m).rectangle((0, 0, g.width, hh), fill=255)
        m = m.filter(ImageFilter.GaussianBlur(10))
        g.putalpha(ImageChops.multiply(g.getchannel("A"), m))
        poser(im, g, pos[k][0], pos[k][1], 1.0 + 0.04 * (1 - sortie(u)))
        # éclaboussures d'encre rose
        rnd = random.Random(k)
        for i in range(7):
            if u < 0.3:
                break
            r = rnd.uniform(4, 16) * cl((u - 0.3) * 3)
            ax, ay = pos[k][0] + rnd.uniform(-taille * 0.7, taille * 0.7), pos[k][1] + rnd.uniform(-taille * 0.7, taille * 0.7)
            d.ellipse((ax - r, ay - r, ax + r, ay + r), fill=ROSE + (200,))
    y_txt = H * 0.74 if not V else H * 0.14
    u = t - 0.55
    if u > 0:
        poser(im, texte_img("LILIANOBARHAW PRÉSENTE", TEXTE, 34 if not V else 40, PAPIER, trait=0, ombre=0, espacement=9), W / 2, y_txt + 20 * (1 - sortie(u / 0.6)), 1, 0, sortie(u / 0.6))
    u = t - 1.35
    if u > 0:
        poser(im, texte_img("une nouvelle mer approche…", TEXTE, 40 if not V else 46, (230, 190, 220), trait=0, ombre=0), W / 2, y_txt + (64 if not V else 70), 1, 0, sortie(u / 0.6) * 0.9)
    etincelles(im, t, 22, 9)
    return im


@scene("ouverture", 0.0, b(2))
def s_ouverture(t, L):
    return image_ouverture(t)


# --- 2. Port Barhaw (Blender a) ---
@scene("port", b(2), b(5))
def s_port(t, L):
    src = L.get("a", B3 + "a.mp4").suivante()
    k = 1.0 + 0.05 * (t / (b(3)))
    im = plein(src, k) if not V else recadre_vertical(src, 0.58, 1.0 + 0.05 * t / b(3))
    bandeau_cine(im, t / 0.6)
    legende(im, t, 1.0, "Port Barhaw", "港 · le départ de la course", taille=86 if not V else 96)
    if t < 0.55:
        base = image_ouverture(b(2) + t)
        iris(base, im, t / 0.55)
        return base
    return im


# --- 3. la flotte (Blender b), les trois équipages, les pieuvres ---
NAV = {"veyzo": (0.14, "Veyzo Family", IMG + "flotte/veyzo.webp", 0.30), "barhaw": (0.40, "Barhaw", IMG + "flotte/barhaw.webp", 0.22),
       "kikso": (0.73, "Squirt.exe", IMG + "flotte/kikso.webp", 0.22)}


@scene("flotte", b(5), b(8))
def s_flotte(t, L):
    src = L.get("b", B3 + "b.mp4", debut=1.333).suivante()
    if not V:
        im = plein(src, 1.0 + 0.03 * t / b(3))
        bandeau_cine(im, 1)
        for k, nom in enumerate(("veyzo", "barhaw", "kikso")):
            x, txt, ic, y = NAV[nom]
            puce(im, t, bt(1) + k * TEMPS * 2, txt, x * W + (180 if nom == "kikso" else 120), y * H, 36, ROSE if nom != "kikso" else (109, 39, 144), ic)
        legende(im, t, bt(8), "Trois équipages.", "une seule mer · une seule course", taille=86)
    else:
        im = recadre_vertical(src, 0.72, 1.0 + 0.03 * t / b(3))
        x, txt, ic, y = NAV["kikso"]
        puce(im, t, bt(1), "Squirt.exe", W * 0.52, H * 0.2, 44, (109, 39, 144), ic)
        puce(im, t, bt(3), "Barhaw", W * 0.3, H * 0.13, 40, ROSE, NAV["barhaw"][2])
        puce(im, t, bt(5), "Veyzo Family", W * 0.62, H * 0.07, 40, ROSE, NAV["veyzo"][2])
        legende(im, t, bt(8), "Trois équipages.", "une seule mer · une seule course")
    balayage(im, (t - (b(3) - 0.42)) / 0.84)
    return im


# --- 4. le titre ---
def rayons(im, t, cx, cy, n=18, coul=ROSE, alpha=60):
    d = ImageDraw.Draw(im)
    R = math.hypot(W, H)
    for k in range(n):
        a0 = k / n * math.tau + t * 0.25
        a1 = a0 + math.tau / n * 0.45
        d.polygon([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1))], fill=coul + (alpha,))


@scene("titre", b(8), b(10))
def s_titre(t, L):
    im = fond()
    cx, cy = W / 2, H * (0.45 if not V else 0.42)
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rayons(calque, t, cx, cy, 20, ROSE, 46)
    im.alpha_composite(calque)
    poser(im, kanji_img("新", 760 if not V else 900, (255, 255, 255), 22), cx + (360 if not V else 0), cy, 1.0 + 0.05 * t)
    dx, dy = secousse(t, 0.0, 26)
    dx2, dy2 = secousse(t, bt(1), 18, graine=4)
    dx, dy = dx + dx2, dy + dy2
    e = ressort(t / 0.55, 5, 2.0)
    taille = 250 if not V else 150
    poser(im, texte_img("BARHAW", TITRE, taille, degrade=(ROSE, VIOLET), trait=12, ombre=16), cx + dx, cy + dy, 1.7 - 0.7 * e, 0, cl(t / 0.08))
    u = t - bt(1)
    if u > 0:
        tampon = etiquette_img("VF 1.0", 120 if not V else 110, ROSE)
        e2 = ressort(u / 0.45, 7, 2.2)
        poser(im, tampon, cx + (470 if not V else 160) + dx, cy + (215 if not V else 230) + dy, 2.2 - 1.2 * e2, -7, cl(u / 0.08))
    u = t - bt(3)
    if u > 0:
        poser(im, texte_img("LA GRANDE MISE À JOUR", TEXTE, 40 if not V else 44, PAPIER, trait=0, ombre=0, espacement=12), cx, cy + (330 if not V else 400), 1, 0, sortie(u / 0.5))
    etincelles(im, t, 30, 11)
    flash(im, 1 - t / 0.25)
    balayage(im, (t - (b(2) - 0.42)) / 0.84, angle=18)
    return im


# --- 5. le site fait peau neuve (l'accueil filmé) ---
@scene("site", b(10), b(13))
def s_site(t, L):
    im = fond()
    src = L.get("accueil", PL + "accueil.mp4").suivante()
    e = sortie(t / 1.2)
    if not V:
        carte = cadre_carte(src.resize((1344, 756), Image.BILINEAR), barre="barhaw.vercel.app")
        p = perspective(carte, ry=-16 * (1 - e) - 9, rx=3)
        poser(im, p, W * 0.665 + 140 * (1 - e), H * 0.52, 0.74, 0, cl(t / 0.2))
        poser(im, etiquette_img("LE SITE", 36), 110, H * 0.30, 1, 0, cl((t - 0.1) / 0.2), "lm")
        legende(im, t, 0.25, "fait peau", None, 105, H * 0.42, 104)
        legende(im, t, bt(1) + 0.25, "neuve.", None, 105, H * 0.42 + 120, 104)
        for k, (txt, x, y) in enumerate((("✦ un nouveau look", 125, H * 0.70), ("✦ des jeux en 3D", 125, H * 0.78), ("✦ ta commu en course", 125, H * 0.86))):
            puce(im, t, bt(4 + 2 * k), txt, x, y, 32, (60, 20, 60), ancre="lm")
    else:
        carte = cadre_carte(src.resize((960, 540), Image.BILINEAR), barre="barhaw.vercel.app")
        p = perspective(carte, ry=-12 * (1 - e), rx=4 * (1 - e))
        poser(im, p, W / 2, H * 0.54, 1.0, 0, cl(t / 0.2))
        poser(im, etiquette_img("LE SITE", 40), W / 2, H * 0.17, 1, 0, cl((t - 0.1) / 0.2))
        legende(im, t, 0.25, "fait peau neuve.", None, W / 2, H * 0.25, 96)
        for k, txt in enumerate(("✦ un nouveau look", "✦ des jeux en 3D", "✦ ta commu en course")):
            puce(im, t, bt(4 + 2 * k), txt, W / 2, H * (0.75 + 0.065 * k), 38, (60, 20, 60))
    etincelles(im, t, 16, 21)
    balayage(im, (t - (b(3) - 0.42)) / 0.84)
    return im


# --- 6. GRAND LINE (Blender c) ---
@scene("grandline", b(13), b(16))
def s_grandline(t, L):
    src = L.get("c", B3 + "c.mp4").suivante()
    im = plein(src, 1.02) if not V else recadre_vertical(src, 0.38)
    bandeau_cine(im, 1)
    # le titre arrive au milieu puis file se ranger en haut à gauche
    g = texte_img("GRAND LINE", TITRE, 190 if not V else 118, PAPIER, trait=12, ombre=14)
    k = texte_img("大航海", KANJI, 120 if not V else 96, ROSE, trait=8, ombre=10)
    u = lisse((t - 1.1) / 0.6)
    e = ressort(t / 0.5)
    if not V:
        x, y, s = W / 2 * (1 - u) + 120 * u, H * 0.45 * (1 - u) + 150 * u, 1.0 - 0.55 * u
        poser(im, k, x - (g.width * s / 2 + 10) * (1 - u), y - 140 * s * (1 - u) + (0 if u < 1 else 0), (0.4 + 0.6 * e) * s, -6, cl(t / 0.1), "mm" if u < 0.5 else "lm")
        poser(im, g, x + (0 if u < 0.5 else k.width * s * 0.9), y, (0.4 + 0.6 * e) * s, 0, cl(t / 0.1), "mm" if u < 0.5 else "lm")
    else:
        poser(im, k, W / 2, H * 0.30 - 130, 0.4 + 0.6 * e, -6, cl(t / 0.1))
        poser(im, g, W / 2, H * 0.30, 0.4 + 0.6 * e, 0, cl(t / 0.1))
    flash(im, 0.6 - t / 0.3)
    if not V:
        legende(im, t, bt(6), "Une course entre les commus.", "11 îles · un trésor au bout", taille=80)
    else:
        legende(im, t, bt(6), "Une course", None, y=H * 0.74, taille=96)
        legende(im, t, bt(6) + 0.15, "entre les commus.", "11 îles · un trésor au bout", y=H * 0.74 + 110, taille=96)
    return im


# --- 7. la carte 3D du site : Squirt.exe et ses pieuvres, puis toute la course ---
@scene("salle", b(16), b(16) + 6.4)
def s_salle(t, L):
    src = L.get("salle", PL + "salle.mp4").suivante()
    if not V:
        im = plein(src, 1.0)
        puce(im, t, 0.75, "Squirt.exe", 1340, 330, 40, (109, 39, 144), IMG + "flotte/kikso.webp")
        puce(im, t, 1.15, "des pieuvres dans son sillage", 1340, 410, 30, ROSE, ICI + "/pieuvre-icone.png")
        puce(im, t, 4.3, "La course : le premier au trésor gagne", W / 2, H - 140, 38, ROSE, IMG + "objets/coffre.webp")
        poser(im, etiquette_img("sur le site · GRAND LINE en 3D", 30, ENCRE), W - 60, H - 60, 1, 0, cl((t - 0.3) / 0.3), "rm")
    else:
        im = plein(src, 1.12, dy=-60)
        puce(im, t, 0.75, "Squirt.exe", W / 2, H * 0.24, 46, (109, 39, 144), IMG + "flotte/kikso.webp")
        puce(im, t, 1.15, "des pieuvres dans son sillage", W / 2, H * 0.30, 36, ROSE, ICI + "/pieuvre-icone.png")
        puce(im, t, 4.3, "le premier au trésor gagne", W / 2, H * 0.74, 40, ROSE, IMG + "objets/coffre.webp")
        legende(im, t, 0.2, "GRAND LINE", "en 3D, sur le site", W / 2, H * 0.12, 88)
    if t < 0.3:
        flash(im, 0.55 * (1 - t / 0.3))
    return im


# --- 8. les drapeaux, et ce qui fait avancer les navires ---
FLOTTE = [("Barhaw", IMG + "flotte/barhaw.webp", "petale"), ("Veyzo Family", IMG + "flotte/veyzo.webp", "piece"), ("Squirt.exe", IMG + "flotte/kikso.webp", "pieuvre")]


@scene("drapeaux", b(16) + 6.4, b(24))
def s_drapeaux(t, L):
    im = fond()
    duree = b(24) - b(16) - 6.4
    zoom = 1.0 + 0.06 * entree(t / duree)
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sprites = {"petale": petale_img(46), "piece": piece_img(54), "pieuvre": pieuvre_img(96)}
    for k, (nom, ic, trace) in enumerate(FLOTTE):
        t0 = k * TEMPS
        u = t - t0
        if u < 0:
            continue
        if not V:
            cx, cy, taille = W * (0.25 + 0.25 * k), H * 0.40, 330
        else:
            cx, cy, taille = W / 2, H * (0.12 + 0.19 * k), 260
        zone = (cx - taille * 0.6, cx + taille * 0.6)
        pluie(calque, u, sprites[trace], n=9, graine=k + 3, vitesse=480 if trace != "pieuvre" else 420, zone=zone, tourne=trace != "pieuvre", echelle=(0.7, 1.1))
        drap = image(ic, "RGB").resize((taille, taille), Image.LANCZOS)
        carte = cadre_carte(drap, rayon=34, trait=7, ombre=18)
        e = ressort(u / 0.55)
        poser(calque, carte, cx, cy + 260 * (1 - e), (0.7 + 0.3 * e), (k - 1) * 4 * (1 - e) + (k - 1) * 2, cl(u / 0.12))
        if not V:
            poser(calque, texte_img(nom, TITRE, 56), cx, cy + taille / 2 + 70, 1, 0, cl((u - 0.2) / 0.2))
        else:
            poser(calque, texte_img(nom, TITRE, 56), cx + 0, cy + taille * 0.45 + 40, 1, 0, cl((u - 0.2) / 0.2))
    im.alpha_composite(calque)
    # ce qui fait avancer ton navire
    u = t - bt(4)
    if u > 0:
        y = H * 0.83 if not V else H * 0.86
        if not V:
            poser(im, texte_img("Ton Discord fait avancer ton navire", TITRE, 62), W / 2, y - 70, 1, 0, sortie(u / 0.3))
        else:
            poser(im, texte_img("Ton Discord fait", TITRE, 64), W / 2, y - 190, 1, 0, sortie(u / 0.3))
            poser(im, texte_img("avancer ton navire", TITRE, 64), W / 2, y - 110, 1, 0, sortie(u / 0.3))
        objets = [("tes messages", IMG + "objets/cloche.webp"), ("le vocal", IMG + "objets/casque.webp"), ("le live", IMG + "objets/camera.webp")]
        for k, (txt, ic) in enumerate(objets):
            x = W / 2 + (k - 1) * (430 if not V else 320)
            puce(im, t, bt(5 + k), txt, x, y + 30, 36 if not V else 30, VIOLET, ic)
    if zoom != 1.0:
        im = im.resize((int(W * zoom), int(H * zoom)), Image.BILINEAR).crop((int(W * (zoom - 1) / 2), int(H * (zoom - 1) / 2), int(W * (zoom - 1) / 2) + W, int(H * (zoom - 1) / 2) + H))
    flash(im, (t - (duree - 0.25)) / 0.25)
    return im


# --- 9. les jeux ---
JEUX = [
    ("memory", "MEMORY", "16 cartes · les mèmes de la commu", IMG + "jeux/memory.webp", "記"),
    ("quiz", "QUIZ", "10 questions · 3 niveaux", IMG + "jeux/quiz.webp", "問"),
    ("rumble", "RUMBLE", "7 transformations · une seule chance", IMG + "jeux/rumble.webp", "闘"),
    ("docteur", "DOCTEUR", "45 secondes pour soigner", IMG + "jeux/docteur.webp", "医"),
    ("course", "LA COURSE", "saute, cours, bats ton record", None, "走"),
]


@scene("ajouer", b(24), b(25))
def s_ajouer(t, L):
    im = fond()
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rayons(calque, t, W / 2, H / 2, 16, VIOLET, 50)
    im.alpha_composite(calque)
    dx, dy = secousse(t, 0, 30)
    e = ressort(t / 0.45, 6, 2.2)
    taille = 200 if not V else 150
    if not V:
        g1, g2 = texte_img("À toi de", TITRE, taille), texte_img("jouer.", TITRE, taille, degrade=(ROSE, VIOLET))
        tot = g1.width + g2.width + 30
        s = 1.6 - 0.6 * e
        poser(im, g1, W / 2 + (-tot / 2 + g1.width / 2) * s + dx, H * 0.42 + dy, s, 0, cl(t / 0.06))
        poser(im, g2, W / 2 + (tot / 2 - g2.width / 2) * s + dx, H * 0.42 + dy, s, 0, cl((t - 0.12) / 0.06))
    else:
        poser(im, texte_img("À toi de", TITRE, taille), W / 2 + dx, H * 0.40 + dy, 1.6 - 0.6 * e, 0, cl(t / 0.06))
        poser(im, texte_img("jouer.", TITRE, int(taille * 1.3), degrade=(ROSE, VIOLET)), W / 2 + dx, H * 0.40 + taille * 1.25 + dy, 1.6 - 0.6 * e, 0, cl((t - 0.12) / 0.06))
    borne = image(IMG + "objets/borne.webp")
    poser(im, borne, W * (0.5 if not V else 0.5), H * (0.74 if not V else 0.70), 1.2 * ressort((t - 0.2) / 0.5), 8 * math.sin(t * 9) * (1 - cl(t)), cl((t - 0.2) / 0.1))
    poser(im, texte_img("5 jeux en 3D", TEXTE, 44, PAPIER, trait=0, ombre=0, espacement=4), W / 2, H * (0.88 if not V else 0.84), 1, 0, sortie((t - 0.6) / 0.3))
    flash(im, 1 - t / 0.2)
    etincelles(im, t, 26, 5)
    return im


def kenburns(img, t, duree, sens=1):
    s = 1.08 + 0.10 * (t / duree)
    if not V:
        w, h = int(W * s), int(W * s * img.height / img.width)
        if h < H * s:
            h = int(H * s)
            w = int(h * img.width / img.height)
        r = img.resize((w, h), Image.BILINEAR)
        x = int((w - W) / 2 + sens * 40 * (t / duree - 0.5))
        y = int((h - H) / 2)
        return r.crop((x, y, x + W, y + H)).convert("RGBA")
    h = int(H * s)
    w = int(h * img.width / img.height)
    r = img.resize((w, h), Image.BILINEAR)
    x = int((w - W) / 2 + sens * 120 * (t / duree - 0.5))
    y = int((h - H) / 2)
    return r.crop((x, y, x + W, y + H)).convert("RGBA")


def ciel_course(t):
    """Le ciel du soir de la course, et ses îles (rendus originaux) qui défilent en parallaxe."""
    y = np.linspace(0, 1, H)[:, None, None]
    haut, bas = np.array((40, 14, 60)), np.array((255, 140, 170))
    ciel = (haut * (1 - y) + bas * y).astype(np.uint8)
    im = Image.fromarray(np.repeat(ciel, W, axis=1)).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.ellipse((W * 0.62, H * 0.38, W * 0.62 + 300, H * 0.38 + 300), fill=(255, 220, 160, 255))
    d.rectangle((0, H * 0.62, W, H), fill=(70, 30, 100, 255))
    iles = ["archipel", "cristal", "champignons", "phare", "forteresse", "tonnerre"]
    for k, n in enumerate(iles):
        img = image(IMG + f"jeux/course-ile-{n}.webp")
        v = 240 if k % 2 else 380
        x = (k * W / 3.2 - v * t) % (W + 800) - 400
        poser(im, img, x, H * (0.6 if k % 2 else 0.66), 0.9 if k % 2 else 1.25)
    return im


def titre_jeu(im, t, nom, sous, kanji):
    e = ressort(t / 0.4, 6, 2.2)
    if not V:
        x, y = 110, H - 230
        poser(im, kanji_img(kanji, 300, ROSE, 210, 0), W - 230, 220, 0.6 + 0.4 * e, -8, cl(t / 0.1))
        poser(im, texte_img(nom, TITRE, 150, PAPIER, trait=10, ombre=14), x, y, 0.5 + 0.5 * e, 0, cl(t / 0.08), "lm")
        if t > 0.18:
            poser(im, etiquette_img(sous, 36), x + 6, y + 110, 1, 0, sortie((t - 0.18) / 0.25), "lm")
    else:
        poser(im, kanji_img(kanji, 300, ROSE, 210, 0), W / 2, H * 0.13, 0.6 + 0.4 * e, -8, cl(t / 0.1))
        poser(im, texte_img(nom, TITRE, 140, PAPIER, trait=10, ombre=14), W / 2, H * 0.78, 0.5 + 0.5 * e, 0, cl(t / 0.08))
        if t > 0.18:
            poser(im, etiquette_img(sous, 40), W / 2, H * 0.78 + 120, 1, 0, sortie((t - 0.18) / 0.25))


def jeu_scene(cle, nom, sous, decor, kanji, k):
    debut, fin = b(25) + k * MES, b(26) + k * MES

    @scene(cle, debut, fin)
    def s(t, L):
        if decor:
            im = kenburns(image(decor, "RGB"), t, MES, 1 if k % 2 else -1)
        else:
            im = ciel_course(t)
        voile = Image.new("RGBA", (W, H), ENCRE + (70,))
        im.alpha_composite(voile)
        # le jeu filmé, dans sa carte
        if cle == "memory":
            src = L.get("memory", PL + "memory.mp4", debut=0.9, crop=(980, 510, 230, 500)).suivante()
            carte = cadre_carte(src.resize((860, 448) if not V else (900, 468), Image.BILINEAR), rayon=26)
            poser(im, perspective(carte, ry=10 - 6 * t), W * 0.6 if not V else W / 2, H * 0.42 if not V else H * 0.45, 0.95, -3, cl(t / 0.15))
        elif cle == "rumble":
            src = L.get("rumble", PL + "rumble.mp4", debut=0.55, crop=(1330, 760, 39, 240)).suivante()
            carte = cadre_carte(src.resize((860, 491) if not V else (900, 514), Image.BILINEAR), rayon=26)
            poser(im, perspective(carte, ry=-10 + 6 * t), W * 0.6 if not V else W / 2, H * 0.42 if not V else H * 0.45, 0.95, 3, cl(t / 0.15))
        elif cle == "course":
            src = L.get("course", PL + "course.mp4", debut=0.35, crop=(2600, 1140, 76, 216)).suivante()
            carte = cadre_carte(src.resize((1040, 456) if not V else (960, 421), Image.BILINEAR), rayon=26)
            poser(im, carte, W * 0.55 if not V else W / 2, H * 0.42 if not V else H * 0.45, 1.0, -2, cl(t / 0.15))
        elif cle == "quiz":
            # les buzzers clignotent en rythme
            if not V:
                for (bx, by) in ((W * 0.12, H * 0.62), (W * 0.88, H * 0.62)):
                    on = int(t / TEMPS) % 2 == (0 if bx < W / 2 else 1)
                    if on:
                        g = Image.new("RGBA", (360, 360), (0, 0, 0, 0))
                        ImageDraw.Draw(g).ellipse((0, 0, 359, 359), fill=(255, 80, 120, 110))
                        poser(im, g.filter(ImageFilter.GaussianBlur(40)), bx, by)
            for i, (niv, c) in enumerate((("Facile", (46, 160, 90)), ("Moyen", VIOLET), ("Difficile", (230, 40, 80)))):
                if not V:
                    puce(im, t, 0.3 + i * TEMPS, niv, W / 2 + (i - 1) * 300, H * 0.36, 48, c)
                else:
                    puce(im, t, 0.3 + i * TEMPS, niv, W / 2, H * (0.38 + 0.07 * i), 52, c)
        elif cle == "docteur":
            remedes = ["calin", "glace", "pansement", "tisane", "bonbon", "creme", "sieste", "viande"]
            for i, r in enumerate(remedes):
                u = t - i * TEMPS / 2
                if u < 0:
                    continue
                a = i / len(remedes) * math.tau - math.pi / 2
                R = (330 if not V else 330)
                cx, cy = (W * 0.6, H * 0.42) if not V else (W / 2, H * 0.45)
                poser(im, image(IMG + f"jeux/remede-{r}.webp"), cx + R * math.cos(a), cy + R * 0.62 * math.sin(a), 1.3 * ressort(u / 0.4), 10 * math.sin(t * 6 + i), cl(u / 0.1))
        titre_jeu(im, t, nom, sous, kanji)
        if t < 0.12:
            flash(im, 0.7 * (1 - t / 0.12))
        return im
    return s


for k, j in enumerate(JEUX):
    jeu_scene(*j, k)


@scene("gains", b(30), b(32))
def s_gains(t, L):
    im = fond()
    tuiles = [IMG + "jeux/memory.webp", IMG + "jeux/quiz.webp", IMG + "jeux/rumble.webp", IMG + "jeux/docteur.webp", IMG + "jeux/course-ile-cristal.webp"]
    for k, p in enumerate(tuiles):
        u = t - k * TEMPS / 2
        if u < 0:
            continue
        if not V:
            cx = W * (0.14 + 0.18 * k)
            cy = H * 0.33 + (k % 2) * 40
            tw = 330
        else:
            cx = W * (0.25 + 0.5 * (k % 2)) if k < 4 else W / 2
            cy = H * (0.17 + 0.17 * (k // 2))
            tw = 440
        c = cadre_carte(image(p, "RGB").resize((tw, int(tw * 0.667)), Image.BILINEAR), rayon=22, trait=6, ombre=12)
        e = ressort(u / 0.45)
        poser(im, c, cx, cy - 200 * (1 - e), 0.6 + 0.4 * e, (k - 2) * 3, cl(u / 0.1))
    u = t - bt(3)
    y0 = H * 0.62 if not V else H * 0.66
    if u > 0:
        poser(im, texte_img("Chaque partie compte.", TITRE, 84 if not V else 70), W / 2, y0, 1, 0, sortie(u / 0.3))
    gains = [("des milles pour ton navire", ROSE, IMG + "objets/bouteille.webp"), ("des coups au boss de la semaine", VIOLET, IMG + "objets/epees.webp"), ("des éclats pour ton album", (60, 20, 60), IMG + "objets/trophee.webp")]
    for k, (txt, c, ic) in enumerate(gains):
        if not V:
            puce(im, t, bt(4 + k), txt, W / 2, y0 + 110 + k * 86, 38, c, ic)
        else:
            puce(im, t, bt(4 + k), txt, W / 2, y0 + 120 + k * 96, 38, c, ic)
    etincelles(im, t, 20, 31)
    balayage(im, (t - (b(2) - 0.42)) / 0.84, angle=18)
    return im


# --- 10. les boss et les îles ---
@scene("boss", b(32), b(34))
def s_boss(t, L):
    im = fond_encre(W, H, (230, 40, 80)).copy()
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rayons(calque, t, W / 2, H * 0.45, 14, (255, 60, 90), 40)
    im.alpha_composite(calque)
    boss = ["krakor", "morghast", "voraxia"]
    for k, nb in enumerate(boss):
        u = t - k * TEMPS * 2
        if u < 0:
            continue
        img = image(IMG + f"boss/{nb}.webp")
        if not V:
            cx, cy, s = W * (0.22 + 0.28 * k), H * 0.47, 0.95
        else:
            cx, cy, s = W * (0.19 + 0.31 * k), H * 0.42, 0.6
        e = ressort(u / 0.4, 7, 2.4)
        poser(im, img, cx + secousse(t, k * TEMPS * 2, 14)[0], cy, s * (1.5 - 0.5 * e), (k - 1) * -5, cl(u / 0.08))
    u = t - bt(6)
    if u > 0:
        y = H * 0.84 if not V else H * 0.70
        poser(im, texte_img("Le boss de la semaine", TITRE, 92 if not V else 74), W / 2, y - 40, 0.5 + 0.5 * ressort(u / 0.4), 0, cl(u / 0.1))
        poser(im, etiquette_img("toute la commu frappe ensemble", 38, ENCRE), W / 2, y + 60 if not V else y + 70, 1, 0, sortie((u - 0.2) / 0.25))
    # la jauge de PV qui fond
    if t > bt(2):
        jw = 900 if not V else 820
        x0, y0 = W / 2 - jw / 2, (H * 0.13 if not V else H * 0.16)
        d = ImageDraw.Draw(im)
        part = 1 - 0.75 * lisse((t - bt(2)) / (b(2) - bt(2)))
        d.rounded_rectangle((x0 - 6, y0 - 6, x0 + jw + 6, y0 + 46), 26, fill=ENCRE + (255,))
        d.rounded_rectangle((x0, y0, x0 + jw * part, y0 + 40), 20, fill=(255, 60, 90, 255))
        d.text((W / 2, y0 + 20), f"{int(400000 * part):,} PV".replace(",", " "), font=police(TITRE, 30), fill=(255, 255, 255, 255), anchor="mm")
    flash(im, 0.7 - t / 0.2)
    return im


@scene("iles", b(34), b(36))
def s_iles(t, L):
    im = fond()
    noms = ["phare", "cristal", "champignons", "forteresse", "givre", "braise", "lucioles", "horloge", "marais", "geants", "cimetiere", "tresor", "archipel", "vents"]
    rnd = random.Random(4)
    for k, n in enumerate(noms):
        img = image(IMG + f"iles/{n}.webp")
        rang = k % 3
        v = (300 + 120 * rang) * (1 if rang != 1 else -1)
        x0 = (k // 3) * (W / 4.4) + rnd.uniform(-40, 40) - (0 if v > 0 else -W * 0.2)
        x = (x0 + v * t) % (W + 500) - 250
        if not V:
            y = H * (0.25 + 0.27 * rang)
            s = 0.8 + 0.25 * rang
        else:
            y = H * (0.14 + 0.2 * rang)
            s = 0.75 + 0.2 * rang
        poser(im, img, x, y, s, 0, cl(t / 0.2))
    bas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = np.zeros((H, W, 4), np.uint8)
    g[..., :3] = ENCRE
    g[..., 3] = (np.clip((np.linspace(0, 1, H) - 0.62) / 0.25, 0, 1) * 235).astype(np.uint8)[:, None]
    im.alpha_composite(Image.fromarray(g))
    u = t - TEMPS
    if u > 0:
        if not V:
            poser(im, texte_img("Des îles à découvrir", TITRE, 100), W / 2, H * 0.86, 0.5 + 0.5 * ressort(u / 0.4), 0, cl(u / 0.1))
        else:
            poser(im, texte_img("Des îles", TITRE, 110), W / 2, H * 0.74, 0.5 + 0.5 * ressort(u / 0.4), 0, cl(u / 0.1))
            poser(im, texte_img("à découvrir", TITRE, 110), W / 2, H * 0.74 + 130, 0.5 + 0.5 * ressort(u / 0.4), 0, cl(u / 0.1))
    puce(im, t, bt(3), "chaque île a son maître", W / 2 + (-330 if not V else 0), H * (0.95 if not V else 0.90) - (0 if not V else 0), 34, VIOLET)
    puce(im, t, bt(4), "les votes de ta commu choisissent la route", W / 2 + (300 if not V else 0), H * (0.95 if not V else 0.95), 34, ROSE)
    balayage(im, (t - (b(2) - 0.42)) / 0.84)
    return im


# --- 11. le montage final, sur chaque deux temps ---
@scene("final", b(36), b(40))
def s_final(t, L):
    coupes = [("b", 2.6), ("b", 4.6), ("a", 3.4), ("salle", 1.4), ("img", IMG + "jeux/rumble.webp"), ("img", IMG + "jeux/quiz.webp"),
              ("img", IMG + "boss/krakor.webp"), ("img", IMG + "boss/morghast.webp"), ("c", 2.2), ("c", 3.6), ("accueil", 1.0), ("salle", 4.6)]
    n = int(t / TEMPS)
    if n < len(coupes):
        u = t - n * TEMPS
        cle, val = coupes[n]
        if cle == "img":
            src = image(val, "RGB")
            if src.size[0] < 900:
                bg = fond()
                poser(bg, image(val), W / 2, H / 2, 1.4 + 0.2 * u)
                im = bg
            else:
                im = kenburns(src, u, TEMPS)
        else:
            chemins = {"a": B3 + "a.mp4", "b": B3 + "b.mp4", "c": B3 + "c.mp4", "salle": PL + "salle.mp4", "accueil": PL + "accueil.mp4"}
            lec = L.get(f"final{n}", chemins[cle], debut=val)
            src = lec.suivante()
            if V and cle in ("a", "b", "c"):
                im = recadre_vertical(src, 0.55, 1.05 + 0.3 * u)
            else:
                im = plein(src, 1.08 + 0.3 * u)
        flash(im, 0.55 * (1 - u / 0.12))
        # un mot par coupe, au rythme
        mots = ["TA", "COMMU", "TON", "NAVIRE", "TES", "JEUX", "LE", "BOSS", "LES", "ÎLES", "LE", "SITE"]
        poser(im, texte_img(mots[n], TITRE, 150 if not V else 170, PAPIER, trait=10, ombre=14), W / 2, H / 2, 1.25 - 0.25 * ressort(u / 0.25), 0, cl(u / 0.04) * (1 - cl((u - 0.33) / 0.05)))
        return im
    # la dernière mesure : le logo se forme
    u = t - len(coupes) * TEMPS
    im = fond()
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rayons(calque, t, W / 2, H * 0.45, 22, ROSE, int(40 + 30 * cl(u / MES)))
    im.alpha_composite(calque)
    e = ressort(u / 0.6, 5, 2.0)
    poser(im, texte_img("BARHAW", TITRE, 250 if not V else 150, degrade=(ROSE, VIOLET), trait=12, ombre=16), W / 2, H * 0.45, 0.6 + 0.4 * e + 0.08 * u, 0, cl(u / 0.1))
    u2 = u - TEMPS
    if u2 > 0:
        poser(im, etiquette_img("VF 1.0", 110, ROSE), W / 2 + (470 if not V else 160), H * 0.45 + (215 if not V else 200), 2.2 - 1.2 * ressort(u2 / 0.45, 7, 2.2), -7, cl(u2 / 0.08))
    etincelles(im, t, 40, 77)
    flash(im, (u - (MES - 0.12)) / 0.12)
    return im


# --- 12. la carte de fin ---
@scene("fin", b(40), b(40) + 6.4)
def s_fin(t, L):
    im = fond()
    poser(im, kanji_img("大航海", 360 if not V else 300, (255, 255, 255), 24), W / 2, H * (0.5 if not V else 0.5), 1.0 + 0.02 * t)
    dx, dy = secousse(t, 0, 24)
    e = ressort(t / 0.5, 6, 2.2)
    if not V:
        poser(im, texte_img("BARHAW", TITRE, 150, degrade=(ROSE, VIOLET), trait=10, ombre=12), W / 2 - 150 + dx, H * 0.20 + dy, 0.6 + 0.4 * e, 0, cl(t / 0.06))
        poser(im, etiquette_img("VF 1.0", 64, ROSE), W / 2 + 430 + dx, H * 0.21 + dy, 0.6 + 0.4 * e, -6, cl(t / 0.06))
        u = t - 0.35
        poser(im, texte_img("MARDI 22 DÉCEMBRE", TITRE, 96, PAPIER), W / 2, H * 0.44, 0.6 + 0.4 * ressort(u / 0.45), 0, cl(u / 0.08))
        u = t - 0.75
        poser(im, texte_img("21 H 30", TITRE, 230, degrade=(ROSE, (255, 140, 200)), trait=12, ombre=16), W / 2, H * 0.64, 0.6 + 0.4 * ressort(u / 0.45), 0, cl(u / 0.08))
        u = t - 1.4
        if u > 0:
            poser(im, etiquette_img("barhaw.vercel.app", 40, ENCRE), W / 2 - 290, H * 0.86, 1, 0, sortie(u / 0.3))
            poser(im, etiquette_img("twitch.tv/lilianobarhaw", 40, VIOLET), W / 2 + 270, H * 0.86, 1, 0, sortie((u - 0.15) / 0.3))
    else:
        poser(im, texte_img("BARHAW", TITRE, 150, degrade=(ROSE, VIOLET), trait=10, ombre=12), W / 2 + dx, H * 0.18 + dy, 0.6 + 0.4 * e, 0, cl(t / 0.06))
        poser(im, etiquette_img("VF 1.0", 64, ROSE), W / 2 + dx, H * 0.27 + dy, 0.6 + 0.4 * e, -6, cl(t / 0.06))
        u = t - 0.35
        poser(im, texte_img("MARDI", TITRE, 110, PAPIER), W / 2, H * 0.42, 0.6 + 0.4 * ressort(u / 0.45), 0, cl(u / 0.08))
        poser(im, texte_img("22 DÉCEMBRE", TITRE, 110, PAPIER), W / 2, H * 0.49, 0.6 + 0.4 * ressort(u / 0.45), 0, cl(u / 0.08))
        u = t - 0.75
        poser(im, texte_img("21 H 30", TITRE, 220, degrade=(ROSE, (255, 140, 200)), trait=12, ombre=16), W / 2, H * 0.62, 0.6 + 0.4 * ressort(u / 0.45), 0, cl(u / 0.08))
        u = t - 1.4
        if u > 0:
            poser(im, etiquette_img("barhaw.vercel.app", 44, ENCRE), W / 2, H * 0.78, 1, 0, sortie(u / 0.3))
            poser(im, etiquette_img("twitch.tv/lilianobarhaw", 44, VIOLET), W / 2, H * 0.85, 1, 0, sortie((u - 0.15) / 0.3))
    etincelles(im, t, 30, 99)
    flash(im, 1 - t / 0.3)
    noir = cl((t - 5.6) / 0.8)
    if noir > 0:
        im.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * noir))))
    return im


# ============ le rendu ============
class Lecteurs:
    def __init__(self):
        self.l = {}

    def get(self, cle, chemin, debut=0.0, crop=None):
        if cle not in self.l:
            self.l[cle] = Lecteur(chemin, debut, crop=crop)
        return self.l[cle]

    def fermer(self):
        for x in self.l.values():
            x.fermer()


def rendre(nom, debut, fin, f):
    n0, n1 = round(debut * FPS), round(fin * FPS)
    enc = Encodeur(f"{SORT}{nom}.mp4", W, H)
    L = Lecteurs()
    for n in range(n0, n1):
        t = n / FPS - debut
        im = f(t, L)
        if im.size != (W, H):
            im = im.resize((W, H))
        enc.ajouter(im)
    enc.fin()
    L.fermer()
    return n1 - n0


def apercu(nom, instants):
    """Quelques images fixes d'une scène, pour regarder avant le rendu (la scène est jouée jusqu'au dernier instant)."""
    for (n, debut, fin, f) in SCENES:
        if n != nom:
            continue
        L = Lecteurs()
        cibles = {round(ti * FPS): k for k, ti in enumerate(instants)}
        for m in range(max(cibles) + 1):
            im = f(m / FPS, L)
            if m in cibles:
                im.convert("RGB").save(f"{ICI}/apercu-{FMT}-{nom}-{cibles[m]}.jpg", quality=88)
        L.fermer()


if __name__ == "__main__":
    voulues = sys.argv[2:]
    if voulues and voulues[0] == "apercu":
        nom = voulues[1]
        apercu(nom, [float(x) for x in voulues[2:]])
        sys.exit()
    for (nom, debut, fin, f) in SCENES:
        if voulues and nom not in voulues:
            continue
        n = rendre(nom, debut, fin, f)
        print(nom, n, "images", flush=True)
    json.dump([(n, d, f) for (n, d, f, _) in SCENES], open(f"{SORT}scenes.json", "w"))
