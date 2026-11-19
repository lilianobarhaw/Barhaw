# Fabrique les images de l'appli Barhaw (la PWA) : l'icône « Le cri », un dessin inventé (une bulle de manga qui crie,
# avec le B de Barhaw, sur le dégradé du site), les icônes des raccourcis et les écrans de démarrage de l'iPhone.
# Rien n'est recopié d'un personnage ou d'un logo existant.
#
# À lancer depuis la racine du dépôt : python3 outils/appli/fabriquer_icones.py
# Il faut rsvg-convert (paquet librsvg) et Pillow. Tout est écrit dans img/appli/ ; le dessin source est gardé
# dans outils/appli/icone-barhaw.svg (outils/ n'est jamais servi par le site).
import math, os, random, subprocess, sys, tempfile
from PIL import Image

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SORTIE = os.path.join(RACINE, "img", "appli")
ENCRE, PAPIER, ROSE, ROSE_CLAIR, VIOLET, OMBRE, VIDE = "#12050d", "#fff2f8", "#ff4f9a", "#ff8fcb", "#9b4dff", "#6f22c9", "#12070f"

# le B de Barhaw, dessiné à la main (boîte 262 x 320), avec ses deux trous
B = ("M0,0 H150 C215,0 245,35 245,80 C245,112 228,135 200,148 C240,160 262,190 262,232 C262,285 222,320 155,320 H0 Z "
     "M80,58 H140 C162,58 172,70 172,86 C172,103 160,114 140,114 H80 Z "
     "M80,172 H150 C176,172 190,188 190,214 C190,242 175,260 150,260 H80 Z")

def etincelle(x, y, r, couleur, ep=7):
    k = r * 0.16
    d = (f"M{x},{y-r} C{x+k},{y-k} {x+k},{y-k} {x+r},{y} C{x+k},{y+k} {x+k},{y+k} {x},{y+r} "
         f"C{x-k},{y+k} {x-k},{y+k} {x-r},{y} C{x-k},{y-k} {x-k},{y-k} {x},{y-r} Z")
    return f'<path d="{d}" fill="{couleur}" stroke="{ENCRE}" stroke-width="{ep}" stroke-linejoin="round"/>'

def lettre_b(cx, cy, echelle, angle):
    w, h = 262 * echelle, 320 * echelle
    t = f"translate({cx - w/2:.1f},{cy - h/2:.1f}) rotate({angle} {w/2:.1f} {h/2:.1f}) scale({echelle})"
    ep = 10 / echelle
    return (f'<g transform="translate(10,12)"><path transform="{t}" d="{B}" fill="{ROSE}" fill-rule="evenodd" stroke="{ENCRE}" stroke-width="{ep:.1f}" stroke-linejoin="round"/></g>'
            f'<path transform="{t}" d="{B}" fill="{ENCRE}" fill-rule="evenodd" stroke="{ENCRE}" stroke-width="{ep:.1f}" stroke-linejoin="round"/>')

def bulle():
    random.seed(3)
    pts = []
    n = 16
    for i in range(2 * n):
        a = i / (2 * n) * 2 * math.pi - math.pi / 2
        if i % 2 == 0:
            rx, ry = random.uniform(190, 210), random.uniform(166, 184)
        else:
            rx, ry = random.uniform(148, 158), random.uniform(126, 136)
        pts.append((256 + rx * math.cos(a), 244 + ry * math.sin(a)))
    pts[2 * n * 5 // 8] = (118, 418)  # la pointe de la bulle, vers le bas à gauche
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"

def trame():
    points = []
    for gx in range(15):
        for gy in range(15):
            x, y = 20 + gx * 34 + (17 if gy % 2 else 0), 20 + gy * 34
            r = max(0, 9 * (1 - math.hypot(x - 512, y) / 724 * 1.6))
            if r > 0.8:
                points.append(f'<circle cx="{x}" cy="{y}" r="{r:.1f}" fill="{PAPIER}" opacity="0.35"/>')
    return "".join(points)

def icone(echelle_dessin=1.0, coins=False):
    """L'icône en 512 x 512. echelle_dessin < 1 resserre la bulle vers le centre (icônes « masquables » d'Android,
    qui peuvent être découpées en rond) ; coins=True arrondit les coins (fond transparent autour)."""
    d = bulle()
    dessin = (f'<g transform="translate(12,16)"><path d="{d}" fill="{OMBRE}" stroke="{ENCRE}" stroke-width="16" stroke-linejoin="round"/></g>'
              f'<path d="{d}" fill="{PAPIER}" stroke="{ENCRE}" stroke-width="16" stroke-linejoin="round"/>'
              + lettre_b(258, 244, 0.6, 6) + etincelle(404, 108, 28, PAPIER))
    if echelle_dessin != 1:
        dessin = f'<g transform="translate(256 256) scale({echelle_dessin}) translate(-256 -256)">{dessin}</g>'
    fond = f'<rect width="512" height="512" fill="url(#fond)"/>' + trame()
    defs = (f'<linearGradient id="fond" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{ROSE_CLAIR}"/>'
            f'<stop offset="0.42" stop-color="{ROSE}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient>')
    if coins:
        defs += '<clipPath id="coins"><rect width="512" height="512" rx="114.5"/></clipPath>'
        corps = f'<g clip-path="url(#coins)">{fond}{dessin}</g>'
    else:
        corps = fond + dessin
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>{defs}</defs>{corps}</svg>'

# les petits dessins des raccourcis (les mêmes que la barre du bas de l'appli, appli/appli.js)
PICTOS = {
    "live": '<rect x="3" y="5" width="18" height="12.5" rx="3"/><path d="M8.5 21h7M12 17.5V21"/><path d="M10.2 8.6v5.4l4.6-2.7z" fill="currentColor"/>',
    "grandline": '<circle cx="12" cy="12" r="8.6"/><path d="M15.6 8.4 13.1 13.1 8.4 15.6 10.9 10.9z" fill="currentColor"/>',
    "jeux": ('<path d="M7.2 7.5h9.6a4.6 4.6 0 0 1 4.4 3.3l1 3.7a3 3 0 0 1-5.1 2.9l-1.7-1.8H8.6l-1.7 1.8a3 3 0 0 1-5.1-2.9l1-3.7a4.6 4.6 0 0 1 4.4-3.3z"/>'
             '<path d="M7.5 10.2v3.2M5.9 11.8h3.2"/><circle cx="16.4" cy="10.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="18.1" cy="12.9" r="1.1" fill="currentColor" stroke="none"/>'),
    "discord": '<path d="M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v7.5a2.5 2.5 0 0 1-2.5 2.5h-6.5l-4.8 3.6V17H5a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 5 4.5z"/><path d="M8 10.8h.01M12 10.8h.01M16 10.8h.01" stroke-width="2.8"/>',
}

def raccourci(nom):
    p = PICTOS[nom]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">'
            f'<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{ROSE_CLAIR}"/>'
            f'<stop offset="0.45" stop-color="{ROSE}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient></defs>'
            f'<rect width="96" height="96" fill="url(#f)"/>'
            f'<g transform="translate(26 26) scale(1.8333)" fill="none" stroke="{PAPIER}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" color="{PAPIER}">{p}</g></svg>')

# les écrans de démarrage de l'iPhone (en portrait) : largeur, hauteur (en points) et densité de chaque modèle
ECRANS = [
    (440, 956, 3),  # 16 Pro Max, 17 Pro Max
    (430, 932, 3),  # 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
    (420, 912, 3),  # Air
    (402, 874, 3),  # 16 Pro, 17, 17 Pro
    (393, 852, 3),  # 14 Pro, 15, 15 Pro, 16
    (428, 926, 3),  # 12 Pro Max, 13 Pro Max, 14 Plus
    (390, 844, 3),  # 12, 12 Pro, 13, 13 Pro, 14, 16e
    (375, 812, 3),  # X, XS, 11 Pro, 12 mini, 13 mini
    (414, 896, 3),  # XS Max, 11 Pro Max
    (414, 896, 2),  # XR, 11
    (414, 736, 3),  # 6 Plus, 7 Plus, 8 Plus
    (375, 667, 2),  # 6, 7, 8, SE (2e et 3e)
]

def rendre(svg_texte, chemin_png, taille):
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f:
        f.write(svg_texte)
        tmp = f.name
    try:
        subprocess.run(["rsvg-convert", "-w", str(taille), "-h", str(taille), tmp, "-o", chemin_png], check=True)
    finally:
        os.unlink(tmp)

def compacter(chemin, sans_transparence=False):
    im = Image.open(chemin)
    im = im.convert("RGB") if sans_transparence else im.convert("RGBA")
    im.save(chemin, optimize=True)

def main():
    if subprocess.run(["which", "rsvg-convert"], capture_output=True).returncode:
        sys.exit("Il faut rsvg-convert (librsvg).")
    os.makedirs(SORTIE, exist_ok=True)
    with open(os.path.join(RACINE, "outils", "appli", "icone-barhaw.svg"), "w") as f:
        f.write(icone())
    # icônes « any » (coins arrondis, fond transparent autour) et « maskable » (pleine, le dessin resserré au centre)
    for taille in (192, 512):
        p = os.path.join(SORTIE, f"icone-{taille}.png")
        rendre(icone(coins=True), p, taille)
        compacter(p)
        p = os.path.join(SORTIE, f"icone-masque-{taille}.png")
        rendre(icone(echelle_dessin=0.8), p, taille)
        compacter(p, sans_transparence=True)
    # l'icône de l'écran d'accueil de l'iPhone : pleine, sans transparence (l'iPhone arrondit lui-même les coins)
    p = os.path.join(SORTIE, "apple-touch-icon.png")
    rendre(icone(), p, 180)
    compacter(p, sans_transparence=True)
    for nom in PICTOS:
        p = os.path.join(SORTIE, f"raccourci-{nom}.png")
        rendre(raccourci(nom), p, 96)
        compacter(p, sans_transparence=True)
    # les écrans de démarrage : le fond prune du site, l'icône au milieu
    grande = os.path.join(SORTIE, "_icone-tmp.png")
    rendre(icone(coins=True), grande, 512)
    ic = Image.open(grande).convert("RGBA")
    os.unlink(grande)
    for (w, h, dpr) in ECRANS:
        W, H = w * dpr, h * dpr
        fond = Image.new("RGB", (W, H), VIDE)
        cote = round(W * 0.3)
        petite = ic.resize((cote, cote), Image.LANCZOS)
        fond.paste(petite, ((W - cote) // 2, round(H * 0.44) - cote // 2), petite)
        # 128 couleurs suffisent (fond uni, icône au milieu) : environ 3 fois plus léger
        fond = fond.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        fond.save(os.path.join(SORTIE, f"demarrage-{W}x{H}.png"), optimize=True)
    print("Images de l'appli écrites dans", SORTIE)

if __name__ == "__main__":
    main()
