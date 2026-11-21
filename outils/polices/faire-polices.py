# Les polices du site, hébergées par le site lui-même (plus rien ne passe par Google Fonts) :
# Dela Gothic One (les titres, les onomatopées) et M PLUS Rounded 1c en 400, 500, 700 et 800 (le texte).
# Chaque graisse est coupée en morceaux woff2 ; le navigateur ne télécharge que ceux dont la page a besoin :
#  - latin    : le latin de base, plus les flèches et symboles que le site écrit (← → ★ ● ▶ ✦…) ; toujours utilisé ;
#  - ext      : les autres lettres latines (accents d'Europe de l'Est, vietnamien…), pour des pseudos par exemple ;
#  - grec-cyr : le grec et le cyrillique ;
#  - symboles : le reste des symboles de la police ;
#  - jp       : les kana, la ponctuation japonaise et les kanji écrits par le site (les autres kanji, rares, s'affichent
#               avec la police japonaise de l'appareil).
# Les deux polices sont sous licence SIL Open Font License 1.1 (sans nom réservé) : les couper et les héberger est permis ;
# leurs licences sont dans polices/.
#
# Si le site écrit un nouveau kanji ou un nouveau symbole, relancer ce script (il relit les fichiers du site) :
#   git clone --depth 1 --filter=blob:none --sparse https://github.com/google/fonts.git /tmp/gf
#   git -C /tmp/gf sparse-checkout set ofl/delagothicone ofl/mplusrounded1c
#   python3 -I outils/polices/faire-polices.py /tmp/gf/ofl .
# (fontTools est nécessaire ; s'il n'y a pas le module brotli de Python, la cale de outils/polices/cale passe par Node)
import glob, json, os, sys
ICI = os.path.dirname(os.path.abspath(__file__))
try:
    import brotli  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(ICI, "cale"))
from fontTools.ttLib import TTFont
from fontTools import subset

SRC, DEPOT = sys.argv[1], sys.argv[2]
VERSION = "v1"  # à changer si les morceaux changent : les fichiers sont gardés un an par les navigateurs
SORTIE = os.path.join(DEPOT, "polices", VERSION)
POLICES = [
    ("delagothicone/DelaGothicOne-Regular.ttf", "Dela Gothic One", "dela-gothic-one", 400),
    ("mplusrounded1c/MPLUSRounded1c-Regular.ttf", "M PLUS Rounded 1c", "m-plus-rounded-1c", 400),
    ("mplusrounded1c/MPLUSRounded1c-Medium.ttf", "M PLUS Rounded 1c", "m-plus-rounded-1c", 500),
    ("mplusrounded1c/MPLUSRounded1c-Bold.ttf", "M PLUS Rounded 1c", "m-plus-rounded-1c", 700),
    ("mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf", "M PLUS Rounded 1c", "m-plus-rounded-1c", 800),
]
FICHIERS_SITE = ["index.html", "site.js", "site.css", "obs.html", "obs.js", "mentions.html", "valorant.html", "valorant.js",
                 "manifest.webmanifest"] + glob.glob(os.path.join(DEPOT, "appli", "*.js")) + [f for f in glob.glob(os.path.join(DEPOT, "js", "*.js")) if "three" not in f]


def plages(*p):
    s = set()
    for x in p:
        a, b = x if isinstance(x, tuple) else (x, x)
        s.update(range(a, b + 1))
    return s


ecrits = set()
for f in FICHIERS_SITE:
    chemin = f if os.path.isabs(f) else os.path.join(DEPOT, f)
    if os.path.exists(chemin):
        ecrits.update(ord(c) for c in open(chemin, encoding="utf-8").read())
LATIN = plages((0x0000, 0x00FF), 0x0131, (0x0152, 0x0153), (0x02BB, 0x02BC), 0x02C6, 0x02DA, 0x02DC, 0x0304, 0x0308, 0x0329,
               (0x2000, 0x206F), 0x20AC, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD)
SYMBOLES_SITE = {c for c in ecrits if c > 0x7E and not (0x3000 <= c <= 0x9FFF or 0xFF00 <= c <= 0xFFEF)}
EXT = plages((0x0100, 0x036F), (0x1D00, 0x1DBF), (0x1E00, 0x1EFF), 0x2020, (0x20A0, 0x20CF), 0x2113, (0x2C60, 0x2C7F), (0xA720, 0xA7FF))
GREC_CYR = plages((0x0370, 0x03FF), (0x1F00, 0x1FFF), (0x0400, 0x052F), (0x1C80, 0x1C8F), (0x2DE0, 0x2DFF), (0xA640, 0xA69F))
JP = plages((0x3000, 0x30FF), (0x31F0, 0x31FF), (0xFF00, 0xFFEF)) | {c for c in ecrits if 0x4E00 <= c <= 0x9FFF}


def est_cjk(c):
    return 0x2E80 <= c <= 0x9FFF or 0xF900 <= c <= 0xFAFF or 0xFE30 <= c <= 0xFE4F or 0xFF00 <= c <= 0xFFEF or c >= 0x20000


def plage_css(codes):
    l = sorted(codes)
    morceaux, i = [], 0
    while i < len(l):
        j = i
        while j + 1 < len(l) and l[j + 1] == l[j] + 1:
            j += 1
        morceaux.append(f"U+{l[i]:X}" if i == j else f"U+{l[i]:X}-{l[j]:X}")
        i = j + 1
    return ", ".join(morceaux)


os.makedirs(SORTIE, exist_ok=True)
regles, bilan = [], []
for fichier, famille, nom, graisse in POLICES:
    cmap = set(TTFont(os.path.join(SRC, fichier)).getBestCmap())
    latin = cmap & (LATIN | SYMBOLES_SITE)
    jp = cmap & JP
    ext = (cmap & EXT) - latin
    grec_cyr = (cmap & GREC_CYR) - latin
    reste = {c for c in cmap if c not in latin and c not in jp and c not in ext and c not in grec_cyr and not est_cjk(c)}
    for morceau, codes in (("latin", latin), ("ext", ext), ("grec-cyr", grec_cyr), ("symboles", reste), ("jp", jp)):
        if not codes:
            continue
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.notdef_outline = True
        opts.hinting = True  # comme les fichiers d'origine (ces polices n'ont presque pas d'instructions)
        opts.desubroutinize = True
        police = TTFont(os.path.join(SRC, fichier))
        decoupe = subset.Subsetter(options=opts)
        decoupe.populate(unicodes=codes)
        decoupe.subset(police)
        sortie = f"{nom}-{graisse}-{morceau}.woff2"
        subset.save_font(police, os.path.join(SORTIE, sortie), opts)
        taille = os.path.getsize(os.path.join(SORTIE, sortie))
        bilan.append((sortie, len(codes), taille))
        regles.append(f"@font-face {{ font-family: \"{famille}\"; font-style: normal; font-weight: {graisse}; font-display: swap; "
                      f"src: url(/polices/{VERSION}/{sortie}) format(\"woff2\"); unicode-range: {plage_css(codes)}; }}")

css = ("/* Les polices du site (Dela Gothic One, M PLUS Rounded 1c), hébergées ici. Fabriqué par outils/polices/faire-polices.py :\n"
       "   ne pas modifier à la main. Licence SIL Open Font License 1.1 : voir polices/OFL-*.txt. */\n" + "\n".join(regles) + "\n")
open(os.path.join(DEPOT, "polices", "polices.css"), "w", encoding="utf-8").write(css)
for sortie, n, taille in bilan:
    print(f"{sortie:40s} {n:5d} caractères {taille / 1024:6.1f} ko")
print("polices.css :", len(css), "octets")
