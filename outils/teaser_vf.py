# Le teaser de la VF 1.0 : assemble les trois plans rendus dans Blender (outils/blender/barhaw_teaser_vf.py),
# le passage des jeux (les décors de img/jeux/) et le titre, ajoute les textes, un petit habillage sonore
# fait ici (la mer, des souffles, un coup de tambour, des étincelles : rien d'emprunté), et sort deux vidéos :
#   teaser-vf.mp4 (16:9, pour Discord, Twitch, YouTube) et teaser-vf-vertical.mp4 (9:16, pour les Shorts et TikTok).
# Usage : python3 outils/teaser_vf.py <dossier des rendus Blender> <dossier img/jeux> <dossier de sortie> [<captures des jeux>]
#   (les captures : memory.png, quiz.png, rumble.png, docteur.png, des panneaux des jeux en VF ; sans elles, les décors seuls)
# Aucun nom de joueur : seulement Barhaw, la VF 1.0 et la date.
import math, os, random, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RENDUS, JEUX, SORTIE = sys.argv[1:4]
CAPTURES = sys.argv[4] if len(sys.argv) > 4 else ""
L, H, FPS = 1280, 720, 24
POLICE = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
ROSE, VIOLET, ENCRE, OMBRE, PAPIER, OR = (255, 79, 154), (155, 77, 255), (18, 5, 13), (111, 34, 201), (255, 242, 248), (255, 212, 121)
police = lambda t: ImageFont.truetype(POLICE, t, index=0)


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def texte(im, txt, xy, taille, fond=None, couleur=PAPIER, ancre="la", alpha=1.0, ombre=True, trait=None):
    """Un texte au trait d'encre, avec l'ombre violette franche du site."""
    if alpha <= 0:
        return
    calque = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    f = police(taille)
    trait = trait if trait is not None else max(2, taille // 14)
    x, y = xy
    if ombre:
        dec = max(3, taille // 12)
        d.text((x + dec, y + dec), txt, font=f, fill=OMBRE + (255,), anchor=ancre, stroke_width=trait, stroke_fill=OMBRE + (255,))
    d.text((x, y), txt, font=f, fill=couleur + (255,), anchor=ancre, stroke_width=trait, stroke_fill=ENCRE + (255,))
    if alpha < 1:
        a = calque.getchannel("A").point(lambda v: int(v * alpha))
        calque.putalpha(a)
    im.alpha_composite(calque)


def etiquette(im, txt, xy, taille, alpha=1.0, couleur=ROSE):
    """Une petite étiquette rose penchée, comme les surtitres du site."""
    if alpha <= 0:
        return
    f = police(taille)
    l, h = f.getbbox(txt)[2] + taille, int(taille * 1.7)
    e = Image.new("RGBA", (l + 12, h + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(e)
    d.rounded_rectangle((5, 5, l + 5, h + 5), h // 2, fill=OMBRE + (255,))
    d.rounded_rectangle((0, 0, l, h), h // 2, fill=couleur + (255,), outline=ENCRE + (255,), width=3)
    d.text((l // 2, h // 2), txt, font=f, fill=(255, 255, 255, 255), anchor="mm")
    e = e.rotate(3, expand=True, resample=Image.BICUBIC)
    if alpha < 1:
        e.putalpha(e.getchannel("A").point(lambda v: int(v * alpha)))
    im.alpha_composite(e, (int(xy[0]), int(xy[1])))


def voile_bas(im, force=0.55):
    """Un dégradé sombre en bas, pour lire les textes."""
    g = Image.new("L", (1, H))
    for y in range(H):
        g.putpixel((0, y), int(255 * force * ease((y - H * 0.45) / (H * 0.55))))
    v = Image.new("RGBA", im.size, ENCRE + (0,))
    v.putalpha(g.resize(im.size))
    im.alpha_composite(v)


def plan_blender(lettre, debut, n):
    fichiers = [os.path.join(RENDUS, f"{lettre}-{debut + k:04d}.png") for k in range(n)]
    manque = [f for f in fichiers if not os.path.exists(f)]
    if manque:
        raise SystemExit(f"il manque {len(manque)} images du plan {lettre} (ex. {manque[0]})")
    return fichiers


def main():
    os.makedirs(SORTIE, exist_ok=True)
    images = os.path.join(SORTIE, "images")
    os.makedirs(images, exist_ok=True)
    A = plan_blender("a", 0, 108)
    B = plan_blender("b", 200, 132)
    C = plan_blender("c", 400, 108)
    noms_jeux = ("memory", "quiz", "rumble", "docteur")
    jeux = [Image.open(os.path.join(JEUX, f"{n}.webp")).convert("RGB") for n in noms_jeux]
    # le vrai écran de chaque jeu (sans son titre), posé de biais devant son décor
    panneaux = []
    for nom in noms_jeux:
        f = os.path.join(CAPTURES, f"{nom}.png") if CAPTURES else ""
        if not f or not os.path.exists(f):
            panneaux.append(None)
            continue
        c = Image.open(f).convert("RGBA")
        c = c.crop((0, int(c.height * 0.075), c.width, c.height))
        k = 560 / c.height
        c = c.resize((int(c.width * k), 560), Image.LANCZOS)
        cadre_p = Image.new("RGBA", (c.width + 26, c.height + 26), (0, 0, 0, 0))
        dp = ImageDraw.Draw(cadre_p)
        dp.rounded_rectangle((14, 14, c.width + 20, c.height + 20), 22, fill=OMBRE + (255,))
        dp.rounded_rectangle((0, 0, c.width + 6, c.height + 6), 22, fill=ENCRE + (255,))
        masque = Image.new("L", c.size, 0)
        ImageDraw.Draw(masque).rounded_rectangle((0, 0, c.width - 1, c.height - 1), 18, fill=255)
        cadre_p.paste(c, (3, 3), masque)
        panneaux.append(cadre_p.rotate(-2.5 if len(panneaux) % 2 else 2.5, expand=True, resample=Image.BICUBIC))
    hasard = random.Random(4)
    etincelles = [(hasard.random() * L, hasard.random() * H, hasard.random() * 6.28, 2 + hasard.random() * 4) for _ in range(46)]
    n = 0
    fondu = 8

    def sortir(im):
        nonlocal n
        im.convert("RGB").save(os.path.join(images, f"{n:05d}.png"))
        n += 1

    def cadre(f):
        return Image.open(f).convert("RGBA").resize((L, H), Image.LANCZOS)

    # 1. Port Barhaw (4,5 s)
    for k, f in enumerate(A):
        im = cadre(f)
        if k < 12:
            im = Image.blend(Image.new("RGBA", (L, H), ENCRE + (255,)), im, k / 12)
        voile_bas(im, 0.5)
        t = k / FPS
        etiquette(im, "BARHAW · VF 1.0", (70, 470), 22, ease((t - 0.4) / 0.4))
        texte(im, "Un soir de décembre,", (72, 525), 46, alpha=ease((t - 0.7) / 0.5))
        texte(im, "à Port Barhaw…", (72, 585), 46, alpha=ease((t - 1.5) / 0.5))
        sortir(im)
    # 2. La flotte (5,5 s), en fondu depuis le port
    precedent = cadre(A[-1])
    for k, f in enumerate(B):
        im = cadre(f)
        if k < fondu:
            im = Image.blend(precedent, im, (k + 1) / (fondu + 1))
        voile_bas(im, 0.55)
        t = k / FPS
        texte(im, "Trois commus.", (72, 520), 52, alpha=ease((t - 0.4) / 0.5))
        texte(im, "Un seul trésor.", (72, 588), 52, couleur=(255, 211, 230), alpha=ease((t - 1.4) / 0.5))
        etiquette(im, "La course commence", (78, 452), 22, ease((t - 2.6) / 0.4))
        sortir(im)
    # 3. Les îles (4,5 s)
    precedent = cadre(B[-1])
    for k, f in enumerate(C):
        im = cadre(f)
        if k < fondu:
            im = Image.blend(precedent, im, (k + 1) / (fondu + 1))
        voile_bas(im, 0.55)
        t = k / FPS
        texte(im, "De nouvelles îles.", (72, 520), 52, alpha=ease((t - 0.3) / 0.5))
        texte(im, "Leurs maîtres vous attendent.", (72, 590), 38, couleur=(255, 211, 230), alpha=ease((t - 1.3) / 0.5))
        sortir(im)
    # 4. Les jeux (4 décors, 0,9 s chacun, avec un éclair rose entre chaque)
    par_jeu = 22
    for j, decor in enumerate(jeux):
        for k in range(par_jeu):
            z = 1.0 + 0.08 * (k / par_jeu)
            w, h = int(L * z), int(H * z)
            im = decor.resize((w, h), Image.LANCZOS).crop(((w - L) // 2, (h - H) // 2, (w - L) // 2 + L, (h - H) // 2 + H)).convert("RGBA")
            if panneaux[j] is not None:
                im = im.filter(ImageFilter.GaussianBlur(3))
                pn = panneaux[j]
                glisse = 40 * (1 - ease(k / 8))
                im.alpha_composite(pn, (int(L - pn.width - 70 + glisse), int((H - pn.height) / 2 + 6)))
            if k < 4:
                im = Image.blend(Image.new("RGBA", (L, H), (255, 214, 232, 255)), im, k / 4)
            voile_bas(im, 0.6)
            texte(im, "Tous les jeux,", (72, 520), 52, alpha=1.0 if j else ease(k / 6))
            texte(im, "refaits en relief.", (72, 588), 52, couleur=(255, 211, 230), alpha=1.0 if j else ease((k - 6) / 6))
            sortir(im)
    # 5. Le titre (5,5 s) : « VF 1.0 », la date, l'heure, le live
    for k in range(132):
        t = k / FPS
        im = Image.new("RGBA", (L, H), (26, 8, 22, 255))
        lueur = Image.new("RGBA", (L, H), (0, 0, 0, 0))
        dl = ImageDraw.Draw(lueur)
        for r, a in ((520, 40), (380, 60), (240, 80)):
            dl.ellipse((L / 2 - r, H / 2 - r * 0.7, L / 2 + r, H / 2 + r * 0.7), fill=ROSE + (a,))
        im.alpha_composite(lueur.filter(ImageFilter.GaussianBlur(90)))
        texte(im, "航海", (L / 2, H / 2 + 10), 330, couleur=(70, 26, 70), ancre="mm", ombre=False, trait=0)
        for (x, y, ph, s) in etincelles:
            v = 0.5 + 0.5 * math.sin(t * 5 + ph)
            ImageDraw.Draw(im).regular_polygon((x, y, s * (0.6 + v)), 4, rotation=45, fill=(255, 220, 240, int(200 * v)))
        etiquette(im, "BARHAW", (L / 2 - 80, 150), 26, ease((t - 0.1) / 0.3))
        pop = ease((t - 0.35) / 0.35)
        if pop > 0:
            taille = int(150 * (0.6 + 0.4 * pop + 0.08 * math.sin(min(1, (t - 0.35) / 0.5) * math.pi)))
            texte(im, "VF 1.0", (L / 2, H / 2 - 10), taille, couleur=PAPIER, ancre="mm", alpha=pop)
        texte(im, "MARDI 22 DÉCEMBRE · 21 H 30", (L / 2, H / 2 + 120), 40, couleur=OR, ancre="mm", alpha=ease((t - 1.2) / 0.4))
        texte(im, "en live sur twitch.tv/lilianobarhaw", (L / 2, H / 2 + 182), 28, ancre="mm", alpha=ease((t - 1.9) / 0.4), ombre=False)
        if k > 120:
            im = Image.blend(im, Image.new("RGBA", (L, H), ENCRE + (255,)), (k - 120) / 12)
        sortir(im)
    return n


def son(total, chemin):
    """La mer en fond, un souffle à chaque changement de plan, un coup de tambour sur le titre, des étincelles."""
    sr = 44100
    duree = total / FPS
    t = np.arange(int(sr * duree)) / sr
    rng = np.random.default_rng(3)
    bruit = rng.standard_normal(t.size)
    # la mer : du bruit adouci, qui respire lentement
    mer = np.convolve(bruit, np.ones(400) / 400, mode="same") * (0.6 + 0.4 * np.sin(2 * np.pi * t / 5.5)) * 3.2
    x = mer * np.clip(t / 1.5, 0, 1) * np.clip((duree - t) / 1.0, 0, 1)
    plans = [108 / FPS, 240 / FPS, 348 / FPS, 436 / FPS]
    for p in plans:  # un souffle qui monte et retombe
        env = np.exp(-((t - p) / 0.22) ** 2)
        x += np.convolve(bruit, np.ones(40) / 40, mode="same") * env * 1.4
    titre = 436 / FPS + 0.35
    tambour = np.where(t >= titre, np.sin(2 * np.pi * (55 + 40 * np.exp(-(t - titre) * 9)) * (t - titre)) * np.exp(-(t - titre) * 3.2), 0)
    x += tambour * 0.9
    for k in range(6):  # des étincelles : de petites notes aiguës
        d = titre + 0.6 + k * 0.32
        x += np.where(t >= d, np.sin(2 * np.pi * (1760 + 220 * k) * (t - d)) * np.exp(-(t - d) * 10), 0) * 0.12
    x = x / max(1e-6, np.abs(x).max()) * 0.8
    with wave.open(chemin, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def vertical(images, total, dossier):
    """La version 9:16 : l'image au milieu, le même plan flouté derrière, en haut et en bas."""
    os.makedirs(dossier, exist_ok=True)
    for k in range(total):
        im = Image.open(os.path.join(images, f"{k:05d}.png"))
        fond = im.resize((int(1920 * L / H), 1920), Image.BILINEAR).crop((int((1920 * L / H - 1080) / 2), 0, int((1920 * L / H - 1080) / 2) + 1080, 1920))
        fond = fond.filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.55))
        fond.paste(im.resize((1080, 608), Image.LANCZOS), (0, 656))
        fond.save(os.path.join(dossier, f"{k:05d}.png"))


if __name__ == "__main__":
    total = main()
    images = os.path.join(SORTIE, "images")
    son(total, os.path.join(SORTIE, "son.wav"))
    commun = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(images, "%05d.png"), "-i", os.path.join(SORTIE, "son.wav"), *commun, os.path.join(SORTIE, "teaser-vf.mp4")], check=True)
    vertical(images, total, os.path.join(SORTIE, "vertical"))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(SORTIE, "vertical", "%05d.png"), "-i", os.path.join(SORTIE, "son.wav"), *commun, os.path.join(SORTIE, "teaser-vf-vertical.mp4")], check=True)
    print(f"{total} images · {total / FPS:.1f} s")
