# Le Phare du Bout du Monde, « niveau 5 » : un rocher tout seul au milieu de la mer, et le phare dessus. Tout est inventé.
# (Son histoire, dans le bot : « Un phare tout seul au milieu de la mer. Sa lumière montre la dernière route. » Son maître :
#  Mère Brume, la gardienne faite de brouillard, qui éteint la route de ceux qui passent : d'où la brume au pied du rocher.)
# Le Rocher (une falaise à couches, lichens, coulures), son plateau d'herbe rase et le phare : un fût de pierre peinte à
# bandes blanches et rouges, des fenêtres, la galerie et sa rambarde de fer, la lanterne vitrée, la coupole de cuivre vert,
# l'optique de laiton qui tourne. L'escalier taillé dans la falaise (des dalles sur corbeaux, une corde, des lanternes) monte
# de la maison du gardien (à l'ouest) jusqu'au plateau en traversant toute la face sud. En bas : la maison et sa cour, le
# linge qui sèche, le potager et son muret, des moutons, la remise, la jetée de pierre et le caboteur du ravitaillement, le
# hangar à bateaux de l'anse, le treuil qui hisse les caisses. Au large : l'Aiguille et ses oiseaux, des écueils, des phoques,
# l'épave d'un navire qui n'a pas vu la lumière. La vie : le gardien qui monte au phare, le marin du ravitaillement, le
# guetteur qui fait le tour de la galerie, le pêcheur qui fait le tour de ses bouées à la rame, la caisse du treuil, la
# cloche de brume, le linge, la girouette, les oiseaux, la fumée ; et, sur le site, la brume qui passe (effet « brume »),
# l'éclat de la lentille et les cônes de lumière de la lanterne (effet « phare » ; la nuit, la fête y pose ses pinceaux).
# Sorties : ile-phare-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_vents_v5 as Vt
import barhaw_ambre_v5 as Am

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 9.6
ROC = (0.5, 0.9)  # le cœur du Rocher
R_TOP = 2.0  # le rayon du plateau (à peu près)
ZT = 3.5  # la hauteur du plateau
TF, Z0R = 4.2, -0.3  # la matière « falaise » couvre toute la hauteur d'une falaise, de Z0R (sous l'eau) à Z0R + TF
PHARE = (0.5, 1.2)  # l'axe du phare
H_FUT0, H_GAL = 0.34, 4.7  # au-dessus du plateau : le haut du socle, la galerie
R_FUT0, R_FUT1 = 0.76, 0.5
VITESSE_OPTIQUE = 0.5  # un tour en douze secondes et demie : la vitesse des pinceaux que la fête pose la nuit (grandline-fete.js)
TH_ESC0, TH_ESC1 = math.radians(222), math.radians(362)  # l'escalier : du sud-ouest à l'est, en traversant toute la face sud
LARG_ESC = 0.5
MAISON, CAP_MAISON = (-3.6, 0.4), math.radians(-20)  # la façade regarde le sud-sud-ouest
JARDIN, CAP_JARDIN, LXJ, LYJ = (-3.35, -2.65), 0.3, 1.5, 1.1
REMISE, CAP_REMISE = (0.55, -3.35), 0.15
HANGAR, CAP_HANGAR = (2.45, -2.2), math.radians(-50)
ANSE = (2.74, -3.04)
TH_TREUIL = math.radians(185)
BOUEES = (6.1, -3.7)  # les bouées des casiers, dans la baie de l'est : le pêcheur en fait le tour à la rame
TOUR_RAMEUR = [(BOUEES[0] + 0.7 * math.cos(t) * math.cos(2.618) - 1.2 * math.sin(t) * math.sin(2.618), BOUEES[1] + 0.7 * math.cos(t) * math.sin(2.618) + 1.2 * math.sin(t) * math.cos(2.618)) for t in (k * math.pi / 6 for k in range(12))]
PISTES, PISTES_HAUT = [], []  # les chemins peints : sur l'île, sur le plateau
ECUEILS = [  # (x, y, rayon, hauteur, penche x, penche y, côtés) : l'Aiguille et sa voisine, le récif de l'épave, le rocher des phoques…
    (7.1, 0.9, 0.78, 3.3, 0.35, 0.1, 12), (6.2, 2.7, 0.5, 1.3, 0.0, 0.1, 9), (7.4, -1.2, 0.45, 0.8, 0.0, 0.0, 8),
    (-7.5, -1.2, 0.8, 0.5, 0.0, 0.0, 10), (-6.9, -2.3, 0.5, 0.75, 0.05, 0.0, 8), (-8.2, -0.3, 0.45, 0.9, 0.0, 0.05, 8), (-7.0, 0.1, 0.35, 0.4, 0.0, 0.0, 7),
    (-4.9, -5.9, 0.85, 0.3, 0.0, 0.0, 10), (-3.9, -6.6, 0.35, 0.5, 0.0, 0.0, 7),
    (2.2, -6.4, 0.4, 0.55, 0.0, 0.0, 7), (3.9, -5.2, 0.5, 0.8, 0.05, 0.0, 8),
    (-2.6, 6.5, 0.6, 1.7, 0.1, 0.1, 9), (3.3, 6.2, 0.7, 2.3, -0.15, 0.1, 10), (-6.0, 4.2, 0.55, 1.0, 0.0, 0.0, 8),
]


# ---------- les matières ----------
def _fentes(n, gx, gy, graine=0, tord=0.0):
    """Des cellules de Voronoï qui se répètent (gx en largeur, gy en hauteur), en cherchant parmi les 9 germes voisins : la
    distance au joint (en cellules) et le numéro de la cellule. Moins de rangs que de colonnes : des blocs plus hauts que
    larges. tord : les joints ne sont plus des lignes droites (de combien de cellules ils s'écartent)."""
    x, y = N.grille(n)
    qx, qy = x * gx, y * gy
    if tord:
        qx = qx + tord * (N.bruit(n, gx * 2, gy * 2, graine + 101, 3) - 0.5) * 2
        qy = qy + tord * (N.bruit(n, gx * 2, gy * 2, graine + 102, 3) - 0.5) * 2
    ci, cj = np.floor(qx).astype(np.int32), np.floor(qy).astype(np.int32)
    jit = np.random.default_rng(graine).random((gy, gx, 2)).astype(np.float32)
    f1 = np.full((n, n), 9.0, np.float32)
    f2 = np.full((n, n), 9.0, np.float32)
    ident = np.zeros((n, n), np.int32)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            ii, jj = (ci + di) % gx, (cj + dj) % gy
            dd = np.hypot(qx - (ci + di + 0.15 + 0.7 * jit[jj, ii, 0]), qy - (cj + dj + 0.15 + 0.7 * jit[jj, ii, 1]))
            pres = dd < f1
            f2 = np.where(pres, f1, np.minimum(f2, dd))
            ident = np.where(pres, jj * gx + ii, ident)
            f1 = np.minimum(f1, dd)
    return f2 - f1, ident


def _tirage(graine, ident, nb):
    """Un nombre au hasard (0 à 1) par cellule."""
    return np.random.default_rng(graine).random(nb).astype(np.float32)[ident]


def tx_falaise(graine=1, taille=1024):
    """La roche des falaises. u fait le tour du rocher (le motif se répète), v est la hauteur vraie : du pied dans l'eau
    jusqu'au sommet. Des couches d'épaisseurs très inégales, qui plongent et ondulent, chacune de son gris (du froid au
    chaud) ; des diaclases qui découpent des blocs plus hauts que larges ; puis, comme sur une vraie côte, les étages :
    en bas la roche noire et mouillée, les algues, la ligne claire des balanes ; au-dessus la ceinture des lichens orange ;
    plus haut les lichens gris-vert, les coulures sombres des fentes, les fientes blanches sous les vires ; tout en haut
    la terre et la mousse qui débordent du plateau."""
    n = taille
    x, y = N.grille(n)
    rng = np.random.default_rng(graine)
    z = y * TF + Z0R  # la hauteur vraie
    gros, moyen = N.bruit(n, 3, 2, graine + 1, 3), N.bruit(n, 11, 9, graine + 2, 3)
    grain, fin = N.bruit(n, 96, 96, graine + 3, 2), N.bruit(n, 256, 256, graine + 4, 1)
    nb = 24
    ep = rng.uniform(0.35, 1.0, nb) ** 2.2
    bornes = np.cumsum(ep) / ep.sum()
    v = np.clip(y + 0.03 * np.sin(x * 2 * PI + 0.7) + 0.012 * np.sin(x * 6 * PI + 1.0) + 0.022 * (N.bruit(n, 5, 3, graine + 5, 3) - 0.5), 0, 0.9999)
    k = np.clip(np.searchsorted(bornes, v), 0, nb - 1)
    bas = np.where(k > 0, bornes[np.maximum(k - 1, 0)], 0.0)
    dj = np.minimum(v - bas, bornes[k] - v) * TF  # la distance au joint de la couche
    sous = (bornes[k] - v) * TF  # la distance au joint du dessus : la couche du dessus fait de l'ombre
    ton, chaud, marque = (rng.uniform(-0.1, 0.1, nb).astype(np.float32)[k], rng.random(nb).astype(np.float32)[k], rng.uniform(0.3, 1.0, nb).astype(np.float32)[k])
    coul = N.mel(N.hexa(0x8d877f), N.hexa(0xab9f8f), np.clip(0.2 + 0.55 * gros + 0.4 * (chaud - 0.5), 0, 1))
    coul = coul * (0.88 + ton + 0.16 * (moyen - 0.5) + 0.2 * (grain - 0.5) + 0.1 * (fin - 0.5))[..., None]
    d1, i1 = _fentes(n, 15, 3, graine + 6, 0.28)
    d2, i2 = _fentes(n, 30, 12, graine + 7, 0.3)
    coul *= (1 + 0.16 * (_tirage(graine + 8, i1, 45) - 0.5) + 0.07 * (_tirage(graine + 9, i2, 360) - 0.5))[..., None]
    lit = N.lisse(0.024, 0.0, dj) * marque * (0.45 + 0.55 * N.lisse(0.3, 0.6, N.bruit(n, 9, 30, graine + 10, 2)))
    ombre = N.lisse(0.09, 0.0, sous) * marque * 0.22
    fente = np.maximum(N.lisse(0.06, 0.0, d1) * (0.35 + 0.65 * N.lisse(0.3, 0.62, moyen)), N.lisse(0.07, 0.0, d2) * N.lisse(0.5, 0.72, N.bruit(n, 7, 7, graine + 11, 2)) * 0.45)
    coul *= (1 - 0.42 * np.maximum(lit, fente))[..., None] * (1 - ombre)[..., None]
    b_m = N.bruit(n, 24, 24, graine + 12, 3)
    zz = z + 0.14 * (b_m - 0.5) + 0.06 * (moyen - 0.5)
    coul = N.mel(coul, N.hexa(0xa9ad98) * (0.85 + 0.3 * grain)[..., None], N.lisse(0.6, 0.68, N.bruit(n, 22, 22, graine + 13, 3)) * N.lisse(0.7, 1.3, zz) * 0.5)  # le lichen gris-vert
    orange = N.bruit(n, 30, 30, graine + 14, 3)
    m_or = N.lisse(0.5, 0.6, orange) * N.lisse(0.28, 0.45, zz) * N.lisse(1.3, 0.7, zz) * 0.8 + N.lisse(0.7, 0.76, orange) * N.lisse(1.0, 1.6, zz) * 0.55
    coul = N.mel(coul, N.mel(N.hexa(0xc38a2c), N.hexa(0xdcb54c), fin) * (0.8 + 0.3 * grain)[..., None], np.clip(m_or, 0, 0.85))  # le lichen orange
    coul = N.mel(coul, N.hexa(0x24221f) * (0.8 + 0.5 * grain)[..., None], N.lisse(0.34, 0.1, zz) * 0.86)  # la roche noire, mouillée
    balanes = N.lisse(0.7, 0.78, N.bruit(n, 400, 400, graine + 15, 1)) * N.lisse(0.06, 0.14, zz) * N.lisse(0.36, 0.24, zz)
    coul = N.mel(coul, N.hexa(0xd6d0bd), balanes * 0.65)
    algue = N.lisse(0.16, 0.0, zz) * N.lisse(0.4, 0.62, N.bruit(n, 46, 10, graine + 16, 2))
    coul = N.mel(coul, N.mel(N.hexa(0x33491f), N.hexa(0x5a5a22), moyen), algue * 0.75)
    coulee = N.lisse(0.7, 0.84, N.bruit(n, 110, 1, graine + 17, 2)) * N.lisse(0.5, 0.7, N.bruit(n, 4, 6, graine + 18, 3)) * N.lisse(0.5, 1.0, z)
    coul = N.mel(coul, N.hexa(0x3a322d), coulee * 0.36)
    fiente = N.lisse(0.78, 0.9, N.bruit(n, 140, 1, graine + 19, 2)) * N.lisse(0.52, 0.72, N.bruit(n, 6, 9, graine + 20, 2)) * N.lisse(1.7, 2.7, z)
    coul = N.mel(coul, N.hexa(0xe6e3d6), fiente * 0.5)
    haut = N.lisse(ZT - 0.36, ZT - 0.05, z + 0.2 * (b_m - 0.5)) * N.lisse(0.35, 0.6, moyen)
    coul = N.mel(coul, N.mel(N.hexa(0x5c6a36), N.hexa(0x6b5a40), grain) * (0.8 + 0.3 * fin)[..., None], haut * 0.7)
    relief = np.clip(0.5 + 0.3 * (_tirage(graine + 8, i1, 45) - 0.5) + 0.25 * (marque - 0.6) - 0.5 * np.maximum(lit, fente) + 0.12 * (grain - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


def tx_enduit(c=0xf3eee2, graine=1, use=0.6):
    """La maçonnerie peinte du phare : la peinture épaisse, les assises de pierre qu'on devine dessous, les coulures de la
    pluie, des plaques écaillées où la pierre revient, un peu de rouille."""
    n = N.TAILLE
    x, y = N.grille(n)
    b1, grain = N.bruit(n, 5, 5, graine, 4), N.bruit(n, 90, 90, graine + 1, 2)
    coul = np.broadcast_to(N.hexa(c), (n, n, 3)).copy() * (0.9 + 0.12 * b1 + 0.08 * (grain - 0.5))[..., None]
    rangs = 8
    ry = (y * rangs) % 1.0
    xx = (x * 5 + 0.5 * (np.floor(y * rangs) % 2)) % 1.0
    joint = np.maximum(N.lisse(0.06, 0.0, np.minimum(ry, 1 - ry)), N.lisse(0.03, 0.0, np.minimum(xx, 1 - xx)))
    coul *= (1 - 0.1 * joint)[..., None]
    sale = N.lisse(0.52, 0.8, N.bruit(n, 70, 2, graine + 2, 2)) * (0.35 + 0.65 * N.bruit(n, 3, 3, graine + 3, 2))
    coul = N.mel(coul, N.hexa(0x5a544c), sale * 0.3 * use)
    ecaille = N.lisse(0.66, 0.72, N.bruit(n, 9, 9, graine + 4, 4))
    coul = N.mel(coul, N.hexa(0x9a9488) * (0.85 + 0.3 * grain)[..., None], ecaille * 0.8 * use)
    rouille = N.lisse(0.8, 0.9, N.bruit(n, 60, 1, graine + 5, 2)) * N.lisse(0.5, 0.7, N.bruit(n, 4, 6, graine + 6, 2))
    coul = N.mel(coul, N.hexa(0x8a4a22), rouille * 0.35 * use)
    relief = np.clip(0.5 - 0.25 * joint - 0.3 * ecaille + 0.1 * (grain - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("falaise", tx_falaise, TF, 1.0, graine=701)
N.matiere("roche_phare", N.tx_roche, 1.5, 1.0, c=0x938c83, graine=702)
N.matiere("phare_blanc", tx_enduit, 2.0, 0.5, c=0xf3eee2, graine=703)
N.matiere("phare_rouge", tx_enduit, 2.0, 0.5, c=0xb5382b, graine=704)
N.matiere("cuivre_vert", N.tx_uni, 0.8, 0.4, rugueux=0.55, metal=0.25, c=0x4f9d88, graine=705, grain=0.2, taches=0.4, c2=0x9a6a3c, seuil=0.68)
N.matiere("lentille", N.tx_uni, 0.5, 0.2, rugueux=0.12, lueur=0.35, c=0xc9eef0, graine=706, grain=0.06, taches=0.2, c2=0xffffff, seuil=0.7)
N.matiere("bronze_phare", N.tx_uni, 0.6, 0.4, rugueux=0.5, metal=0.35, c=0x8f6d35, graine=707, grain=0.2, taches=0.4, c2=0x4f8a78, seuil=0.66)
N.matiere("phoque", N.tx_uni, 0.5, 0.2, rugueux=0.5, c=0x7d8087, graine=708, grain=0.15, taches=0.35, c2=0x4d5056, seuil=0.55)
N.matiere("plume_cormoran", N.tx_uni, 0.3, 0.3, c=0x1d2126, graine=709, grain=0.2, taches=0.3)
N.matiere("voile_epave", N.tx_uni, 1.0, 0.4, c=0x9c9588, graine=710, grain=0.25, taches=0.45, c2=0x5e5a52, seuil=0.55)
N.matiere("drap", N.tx_uni, 0.6, 0.2, c=0xf4efe4, graine=711, grain=0.1, taches=0.12)
N.matiere("drap_bleu", N.tx_uni, 0.6, 0.2, c=0x8fb3cf, graine=712, grain=0.1, taches=0.12)
N.matiere("terre_jardin", N.tx_uni, 0.8, 0.5, c=0x5d4631, graine=713, grain=0.3, taches=0.3, c2=0x3f2f22, seuil=0.6)
N.matiere("choux", N.tx_feuillage, 0.3, 0.6, c=0x6fa35a, graine=714, g=6)


# ---------- l'île ----------
def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def rivage(th):
    """Le rayon de la côte : une île de roche, plus large à l'ouest (la maison du gardien), échancrée au sud-est (l'anse du
    hangar à bateaux), avec une petite pointe au sud (la jetée)."""
    return (5.15 + 0.3 * math.sin(2 * th + 0.6) + 0.2 * math.sin(3 * th + 2.1) + 0.09 * math.sin(7 * th + 1.3)
            + 1.05 * math.exp(-((_ecart(th, math.radians(192)) / 0.6) ** 2))
            - 0.8 * math.exp(-((_ecart(th, math.radians(-48)) / 0.2) ** 2))
            + 0.3 * math.exp(-((_ecart(th, math.radians(-92)) / 0.22) ** 2)))


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


# --- le Rocher : son contour (vu de dessus), son profil (il s'évase vers le bas) ---
def f_roc(th):
    return 1 + 0.09 * math.sin(2 * th + 0.5) + 0.05 * math.sin(3 * th + 1.9) + 0.03 * math.sin(5 * th + 0.8)


_PT, _PR = (0.0, 0.2, 0.45, 0.7, 0.9, 1.0), (1.3, 1.2, 1.11, 1.045, 1.0, 1.0)


def r_roc(th, z):
    """Le rayon du Rocher dans cette direction, à cette hauteur (la paroi lisse : la vraie roche est un peu en retrait)."""
    return R_TOP * f_roc(th) * float(np.interp(min(1.0, max(0.0, z / ZT)), _PT, _PR))


def au_roc(th, z, plus=0.0):
    """Un point de la paroi (plus : à cette distance devant elle)."""
    r = r_roc(th, z) + plus
    return (ROC[0] + math.cos(th) * r, ROC[1] + math.sin(th) * r, z)


def d_roc(x, y, z=0.0):
    """La distance à la paroi du Rocher, à cette hauteur (< 0 : dedans)."""
    qx, qy = x - ROC[0], y - ROC[1]
    return math.hypot(qx, qy) - r_roc(math.atan2(qy, qx), z)


BUTTES = [(3.95, 1.7, 0.75, 0.9), (-4.7, -2.9, 0.45, 1.1), (-1.6, 4.3, 0.6, 1.0)]  # (x, y, hauteur, étendue)


def terrain_brut(x, y):
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.5 * d)
    h = 0.4 * (1 - math.exp(-d / 0.2)) * (0.55 + 0.9 * K.bruit2(x * 0.9 + 3.0, y * 0.9, 23)) + 0.42 * K.lisse(0.5, 2.0, d)  # un rivage de roche, plus ou moins haut
    h += (K.bruit2(x * 1.2, y * 1.2, 17) - 0.5) * 0.3 * K.lisse(0.3, 1.4, d) + (K.bruit2(x * 3.1, y * 3.1, 19) - 0.5) * 0.07 * K.lisse(0.3, 1.0, d)
    for bx, by, bh, bl in BUTTES:
        h += bh * math.exp(-((x - bx) ** 2 + (y - by) ** 2) / bl) * K.lisse(0.2, 0.9, d)
    h += 0.55 * math.exp(-max(d_roc(x, y), 0.0) / 0.6) * K.lisse(0.2, 0.9, d)  # l'éboulis au pied du Rocher
    h -= 0.3 * K.lisse(1.5, 0.5, math.hypot(x - ANSE[0], y - ANSE[1])) * K.lisse(0.0, 0.6, d)  # la grève de l'anse
    return h


PLATS = []  # (x, y, rayon plat, rayon du raccord, hauteur) : les terrasses


def _plat(x, y, r0, r1, plus=0.0):
    z = float(np.mean([terrain_brut(x + math.cos(a) * r, y + math.sin(a) * r) for r in (0.0, r0 * 0.5, r0) for a in np.linspace(0, 2 * PI, 10, endpoint=False)])) + plus
    PLATS.append((x, y, r0, r1, z))
    return z


PIED = au_roc(TH_ESC0, 1.1, 0.34)[:2]  # le palier, au pied de l'escalier
Z_MAISON = _plat(MAISON[0], MAISON[1], 1.15, 1.9)
Z_PIED = _plat(PIED[0], PIED[1], 0.42, 1.3, 0.05)
Z_JARDIN = _plat(JARDIN[0], JARDIN[1], 1.0, 1.6)
Z_REMISE = _plat(REMISE[0], REMISE[1], 0.6, 1.1)
Z_HANGAR = _plat(HANGAR[0], HANGAR[1], 0.75, 1.2, 0.08)
ZQ = 0.44  # le dessus de la jetée
JETEE_A, JETEE_B = np.array(vers(-92, 0.6)), np.array(vers(-92, -2.75))  # de la terre vers le large
PLATS.append((float(JETEE_A[0]), float(JETEE_A[1]), 0.5, 1.15, ZQ - 0.015))  # la terre monte jusqu'à son dallage


def terrain(x, y):
    """La hauteur du terrain (sans le Rocher, qui est posé dessus) : l'estran, la terre basse, l'éboulis, les terrasses."""
    h = terrain_brut(x, y)
    if h <= 0:
        return h
    for cx, cy, r0, r1, z in PLATS:
        t = K.lisse(r1, r0, math.hypot(x - cx, y - cy))
        if t > 0:
            h += (z - h) * t
    return h


def sol(x, y):
    """Là où l'on marche : le terrain, ou le plateau en haut du Rocher."""
    return ZT if d_roc(x, y, ZT) < 0 else terrain(x, y)


def _local(X, Y, c, cap):
    """Des coordonnées autour de c, tournées de cap (numpy ou nombres)."""
    return (X - c[0]) * math.cos(cap) + (Y - c[1]) * math.sin(cap), -(X - c[0]) * math.sin(cap) + (Y - c[1]) * math.cos(cap)


def _herbe(n, b1, b2, b3, fin, grain, peigne, meches, graine):
    """L'herbe rase d'un rocher en mer : peignée par le vent d'ouest (de longues mèches), jaunie par plaques, des touffes
    plus sombres, de la bruyère ; semée d'arméries roses (par bouquets) et de petites fleurs blanches."""
    herbe = N.hexa(0x9cc155) * (0.9 + 0.3 * (b2 - 0.5) + 0.14 * (fin - 0.5) + 0.3 * (peigne - 0.5) + 0.2 * (meches - 0.5) + 0.12 * (grain - 0.5))[..., None]
    seche = N.hexa(0xcdc477) * (0.9 + 0.3 * (b3 - 0.5) + 0.3 * (peigne - 0.5))[..., None]
    herbe = N.mel(herbe, seche, N.lisse(0.45, 0.75, b1 * 0.6 + b2 * 0.4) * 0.75)
    herbe = N.mel(herbe, N.hexa(0x6f9a48) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.6, 0.8, N.bruit(n, 40, 40, graine + 1, 3)) * 0.55)
    mouchete = N.lisse(0.42, 0.56, N.bruit(n, 200 if n > 1024 else 100, 200 if n > 1024 else 100, graine + 5, 2))  # la bruyère : des coussins, pas un aplat
    herbe = N.mel(herbe, N.mel(N.hexa(0x8c5c9a), N.hexa(0xb98ab8), fin) * (0.8 + 0.4 * (grain - 0.5))[..., None], N.lisse(0.64, 0.76, N.bruit(n, 18, 18, graine + 2, 3)) * (0.25 + 0.6 * mouchete))
    semis = np.repeat(np.repeat(np.random.default_rng(graine + 3).random((n // 2, n // 2)).astype(np.float32), 2, axis=0), 2, axis=1)  # des points de 2 × 2
    bouquet = N.lisse(0.58, 0.74, N.bruit(n, 50, 50, graine + 4, 2))
    herbe[(semis > 0.996) | ((semis > 0.95) & (bouquet > 0.85))] = np.array([0.93, 0.52, 0.72], np.float32)
    herbe[semis < 0.003] = np.array([1.0, 0.99, 0.92], np.float32)
    return herbe, seche


def tx_sol_phare(taille=2048, graine=171):
    """Le sol peint pixel par pixel. La roche nue : des dalles fendues (grandes, puis petites), de gris froids et chauds,
    des strates sur les pentes ; l'estran noir, ses algues, ses balanes ; la ceinture des lichens orange, les lichens gris
    plus haut ; l'herbe rase peignée par le vent, qui pousse aussi dans les fentes ; les galets de l'anse (mouillés au bord) ;
    les pierres de l'éboulis au pied du Rocher ; la terre battue et caillouteuse des sentiers, l'herbe usée de leurs bords ;
    les dalles de la cour (de la mousse dans les joints) ; la terre du potager et ses sillons."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 200), n)
    dr = K.agrandir(K.champ(lambda x, y: d_roc(x, y, 0.0), R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    xs = (np.arange(n) + 0.5) / n * 2 * R_SOL - R_SOL
    X, Y = np.meshgrid(xs, xs)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    peigne, meches = N.bruit(n, 30, 560, graine + 5, 2), N.bruit(n, 9, 150, graine + 6, 2)
    gy, gx = np.gradient(h, 2 * R_SOL / n)
    pente = np.hypot(gx, gy)
    d1, i1 = _fentes(n, 40, 40, graine + 10, 0.35)
    d2, i2 = _fentes(n, 112, 112, graine + 11, 0.3)
    ton = _tirage(graine + 12, i1, 1600) - 0.5
    roche = N.mel(N.hexa(0x8d877f), N.hexa(0xab9f8f), np.clip(0.1 + 0.8 * b1 + 0.5 * ton, 0, 1))
    roche = roche * (0.88 + 0.24 * (b3 - 0.5) + 0.14 * (fin - 0.5) + 0.14 * (grain - 0.5) + 0.14 * ton + 0.06 * (_tirage(graine + 13, i2, 12544) - 0.5))[..., None]
    fente = np.maximum(N.lisse(0.07, 0.0, d1) * 0.5, N.lisse(0.09, 0.0, d2) * 0.26 * N.lisse(0.4, 0.6, b2))
    strate = 0.5 + 0.5 * np.sin((h * 9.0 + b1 * 1.6) * 2 * PI)
    coul = roche * (1 - 0.16 * strate * N.lisse(0.25, 0.7, pente))[..., None] * (1 - fente)[..., None]
    hz = h + (b2 - 0.5) * 0.1 + (b3 - 0.5) * 0.05
    coul = N.mel(coul, N.hexa(0xa9ad98) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.58, 0.66, N.bruit(n, 60, 60, graine + 14, 3)) * N.lisse(0.3, 0.6, hz) * 0.5)  # le lichen gris-vert
    m_or = N.lisse(0.57, 0.66, N.bruit(n, 120, 120, graine + 15, 3)) * N.lisse(0.17, 0.3, hz) * N.lisse(0.85, 0.45, hz + (b1 - 0.5) * 0.3)
    coul = N.mel(coul, N.mel(N.hexa(0xc38a2c), N.hexa(0xdcb54c), fin) * (0.8 + 0.3 * grain)[..., None], m_or * 0.72)  # le lichen orange : une ceinture au-dessus de l'estran
    coul = N.mel(coul, N.hexa(0x262422) * (0.8 + 0.45 * b3)[..., None], N.lisse(0.2, 0.05, hz) * 0.9)  # l'estran
    balanes = (N.bruit(n, 500, 500, graine + 16, 1) > 0.68) * N.lisse(0.04, 0.1, hz) * N.lisse(0.25, 0.16, hz)
    coul = N.mel(coul, N.hexa(0xd6d0bd), balanes * 0.7)
    algue = N.lisse(0.5, 0.64, N.bruit(n, 70, 70, graine + 17, 2)) * N.lisse(0.13, 0.02, hz) * N.lisse(-0.14, -0.02, hz)
    coul = N.mel(coul, N.mel(N.hexa(0x33491f), N.hexa(0x5a5a22), b3), algue * 0.8)
    dg, ig = _fentes(n, 300, 300, graine + 18, 0.2)  # les galets de l'anse
    galet = N.mel(N.hexa(0x6f6b66), N.hexa(0xb9b2a4), _tirage(graine + 19, ig, 90000)) * (0.7 + 0.4 * N.lisse(0.0, 0.35, dg) + 0.2 * (b3 - 0.5))[..., None]
    galet = N.mel(galet, galet * 0.55, N.lisse(0.17, 0.03, h))
    m_g = N.lisse(1.7, 1.0, np.hypot(X - ANSE[0], Y - ANSE[1]) + (b2 - 0.5) * 0.4) * N.lisse(-0.15, 0.0, h) * N.lisse(0.62, 0.4, h)
    coul = N.mel(coul, galet, m_g * 0.95)
    herbe, seche = _herbe(n, b1, b2, b3, fin, grain, peigne, meches, graine + 20)
    u, w = _local(X, Y, MAISON, CAP_MAISON)  # la cour dallée, devant la façade
    cour_ = N.lisse(1.3, 1.12, np.abs(u) + (b3 - 0.5) * 0.12) * N.lisse(-1.42, -1.26, w + (b3 - 0.5) * 0.1) * N.lisse(-0.4, -0.5, w)
    u, w = _local(X, Y, JARDIN, CAP_JARDIN)  # le potager
    potager_ = N.lisse(LXJ / 2 + 0.5, LXJ / 2 + 0.2, np.abs(u)) * N.lisse(LYJ / 2 + 0.5, LYJ / 2 + 0.2, np.abs(w))
    m_h = N.lisse(0.3, 0.5, h + (b2 - 0.5) * 0.3 + (b3 - 0.5) * 0.16) * N.lisse(0.9, 0.5, pente + (b3 - 0.5) * 0.2) * N.lisse(0.1, 0.4, dr + (b3 - 0.5) * 0.24) * (1 - m_g)
    affleure = N.lisse(0.63, 0.73, N.bruit(n, 13, 13, graine + 21, 4) + 0.1 * (b3 - 0.5)) * N.lisse(0.3, 0.15, cour_ + potager_) * N.lisse(0.25, 0.45, piste)
    m_h = m_h * (1 - 0.9 * affleure)  # la roche qui affleure, par plaques
    m_h = np.maximum(m_h, N.lisse(0.14, 0.0, d1) * N.lisse(0.24, 0.4, hz) * N.lisse(0.2, 0.5, dr) * (1 - m_g) * 0.6)  # et dans les fentes de la roche
    herbe = N.mel(herbe, seche, N.lisse(0.42, 0.2, piste + (b2 - 0.5) * 0.14) * 0.6)  # usée au bord des sentiers
    coul = N.mel(coul, herbe, m_h * 0.96)
    de, ie = _fentes(n, 230, 230, graine + 30, 0.25)  # l'éboulis au pied du Rocher : de la terre, des pierres de toutes tailles
    de2, ie2 = _fentes(n, 96, 96, graine + 35, 0.3)
    te, te2 = _tirage(graine + 31, ie, 52900), _tirage(graine + 36, ie2, 9216)
    eboulis = N.lisse(0.55, 0.1, dr + (b2 - 0.5) * 0.4 + (b3 - 0.5) * 0.14) * N.lisse(0.2, 0.4, h)
    coul = N.mel(coul, N.mel(N.hexa(0x7d705e), N.hexa(0x9a8e7a), b3) * (0.85 + 0.3 * (grain - 0.5))[..., None], eboulis * 0.8 * N.lisse(0.35, 0.6, b2 + 0.3 * eboulis))
    pierre = N.mel(N.hexa(0x7c766f), N.hexa(0xb7ae9e), te) * (0.78 + 0.3 * N.lisse(0.0, 0.4, de) + 0.14 * (grain - 0.5))[..., None]
    coul = N.mel(coul, pierre, eboulis * (te > 0.42) * N.lisse(0.04, 0.16, de) * 0.95)
    bloc = N.mel(N.hexa(0x817a72), N.hexa(0xaea596), te2) * (0.8 + 0.28 * N.lisse(0.0, 0.4, de2) + 0.2 * (b3 - 0.5) + 0.14 * (grain - 0.5))[..., None]
    gros_blocs = eboulis * (te2 > 0.62) * N.lisse(0.05, 0.14, de2)
    coul = N.mel(coul, bloc, gros_blocs * 0.95)
    terre = N.mel(N.hexa(0xa48d68), N.hexa(0xc2ab80), b3) * (0.9 + 0.2 * (fin - 0.5) + 0.16 * (grain - 0.5))[..., None]
    terre = N.mel(terre, N.hexa(0x9d978c) * (0.8 + 0.4 * grain)[..., None], (N.bruit(n, 420, 420, graine + 32, 1) > 0.72) * 0.7)  # des cailloux
    m_p = N.lisse(0.2, 0.08, piste + (b2 - 0.5) * 0.1 + (b3 - 0.5) * 0.06) * N.lisse(0.2, 0.34, h)
    coul = N.mel(coul, terre, m_p * 0.93)
    cour = cour_
    df, idf = _fentes(n, 62, 62, graine + 33, 0.2)
    dalle = N.mel(N.hexa(0x8f887c), N.hexa(0xb6ad9b), _tirage(graine + 34, idf, 3844)) * (0.92 + 0.14 * (grain - 0.5) + 0.1 * (fin - 0.5))[..., None]
    dalle = N.mel(dalle, N.hexa(0x56633a) * (0.8 + 0.4 * grain)[..., None], N.lisse(0.1, 0.0, df) * 0.8)
    coul = N.mel(coul, dalle, cour * 0.95)
    u, w = _local(X, Y, JARDIN, CAP_JARDIN)  # le potager : la terre et ses sillons
    potager = N.lisse(LXJ / 2 - 0.06, LXJ / 2 - 0.14, np.abs(u)) * N.lisse(LYJ / 2 - 0.06, LYJ / 2 - 0.14, np.abs(w))
    coul = N.mel(coul, N.hexa(0x5d4631) * (0.78 + 0.2 * np.sin(w * 2 * PI * 5.5) + 0.2 * (grain - 0.5))[..., None], potager * 0.95)
    relief = np.clip(0.5 + 0.3 * (b3 - 0.5) + 0.2 * (fin - 0.5) - 0.4 * fente * (1 - m_h) + 0.3 * (N.lisse(0.0, 0.3, de) - 0.5) * eboulis * (te > 0.42) + 0.3 * gros_blocs + 0.25 * (N.lisse(0.0, 0.3, dg) - 0.5) * m_g - 0.2 * N.lisse(0.1, 0.0, df) * cour, 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


RP = 2.7  # le dessus du Rocher tient dans un carré de ce demi-côté


def tx_plateau(taille=1024, graine=181):
    """Le dessus du Rocher : l'herbe rase peignée par le vent, le rebord de roche fendue et ses lichens, les dalles posées
    en rond autour du phare (de la mousse dans les joints), la terre battue des passages."""
    n = taille
    xs = (np.arange(n) + 0.5) / n * 2 * RP - RP
    X, Y = np.meshgrid(xs + ROC[0], xs + ROC[1])
    th = np.arctan2(Y - ROC[1], X - ROC[0])
    de = R_TOP * (1 + 0.09 * np.sin(2 * th + 0.5) + 0.05 * np.sin(3 * th + 1.9) + 0.03 * np.sin(5 * th + 0.8)) - np.hypot(X - ROC[0], Y - ROC[1])
    dt = np.hypot(X - PHARE[0], Y - PHARE[1])
    b1, b2, b3, fin, grain = N.bruit(n, 3, 3, graine + 9, 3), N.bruit(n, 16, 16, graine, 3), N.bruit(n, 50, 50, graine + 1, 2), N.bruit(n, 128, 128, graine + 2, 1), N.bruit(n, 320, 320, graine + 3, 1)
    peigne, meches = N.bruit(n, 8, 158, graine + 5, 2), N.bruit(n, 3, 42, graine + 6, 2)
    coul, seche = _herbe(n, b1, b2, b3, fin, grain, peigne, meches, graine + 20)
    d1, i1 = _fentes(n, 12, 12, graine + 10, 0.35)
    roche = N.mel(N.hexa(0x8d877f), N.hexa(0xab9f8f), _tirage(graine + 11, i1, 144)) * (0.86 + 0.26 * (b3 - 0.5) + 0.14 * (fin - 0.5) + 0.12 * (grain - 0.5))[..., None]
    roche *= (1 - 0.55 * N.lisse(0.07, 0.0, d1))[..., None]
    roche = N.mel(roche, N.hexa(0xa9ad98), N.lisse(0.55, 0.64, N.bruit(n, 20, 20, graine + 12, 3)) * 0.5)
    roche = N.mel(roche, N.mel(N.hexa(0xc38a2c), N.hexa(0xdcb54c), fin), N.lisse(0.62, 0.7, N.bruit(n, 26, 26, graine + 13, 3)) * 0.75)
    coul = N.mel(coul, roche, N.lisse(0.36, 0.1, de + (b2 - 0.5) * 0.26 + (b3 - 0.5) * 0.1))
    if PISTES_HAUT:
        xs_ = np.linspace(-RP, RP, 150)
        dp = np.array([[min(K.distance_au_trajet(x + ROC[0], y + ROC[1], p) for p in PISTES_HAUT) for x in xs_] for y in xs_], np.float32)
        piste = K.agrandir(dp, n)
        coul = N.mel(coul, seche, N.lisse(0.4, 0.2, piste + (b2 - 0.5) * 0.12) * 0.6)
        terre = N.mel(N.hexa(0xa48d68), N.hexa(0xc2ab80), b3) * (0.9 + 0.2 * (fin - 0.5) + 0.16 * (grain - 0.5))[..., None]
        coul = N.mel(coul, terre, N.lisse(0.19, 0.08, piste + (b2 - 0.5) * 0.1) * 0.92)
    an = np.arctan2(Y - PHARE[1], X - PHARE[0]) / (2 * PI) + 0.5
    rg = np.floor(dt * 5.2).astype(np.int32)
    ia = np.floor(an * 22 + 0.5 * (rg % 2)).astype(np.int32) % 22
    jr, ja = np.abs((dt * 5.2) % 1.0 - 0.5), np.abs((an * 22 + 0.5 * (rg % 2)) % 1.0 - 0.5)
    jd = np.maximum(N.lisse(0.42, 0.5, jr), N.lisse(0.45, 0.5, ja))
    tirage = np.random.default_rng(graine + 14).random((40, 22)).astype(np.float32)[np.clip(rg, 0, 39), ia]
    dalle = N.mel(N.hexa(0x928a7d), N.hexa(0xb9b09e), tirage) * (0.92 + 0.14 * (grain - 0.5) + 0.1 * (fin - 0.5))[..., None]
    dalle = N.mel(dalle, N.hexa(0x56633a) * (0.8 + 0.4 * grain)[..., None], jd * 0.8)
    pave = N.lisse(1.26, 1.14, dt + (b3 - 0.5) * 0.12)
    coul = N.mel(coul, dalle, pave * 0.95)
    relief = np.clip(0.5 + 0.3 * (b3 - 0.5) + 0.2 * (fin - 0.5) - 0.25 * jd * pave, 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_phare", tx_sol_phare, 2 * R_SOL, 0.5)
N.matiere("plateau_phare", tx_plateau, 2 * RP, 0.5)


# ---------- les pièces ----------
def z_escalier(th):
    """La hauteur de l'escalier dans cette direction (None : il ne passe pas par là). Avant son pied, on compte le palier et
    le sentier qui y mène ; après sa dernière marche, le bord du plateau."""
    t = (th - (TH_ESC0 - 0.45)) % (2 * PI)
    tour = TH_ESC1 - TH_ESC0
    if t <= 0.45:
        return Z_PIED
    if t <= 0.45 + tour:
        return Z_PIED + 0.06 + (ZT - Z_PIED - 0.06) * (t - 0.45) / tour
    return ZT if t <= 0.75 + tour else None


def place_roc(th, z):
    """De combien la roche peut sortir de sa paroi lisse à cet endroit (1 : librement ; 0 : pas du tout, l'escalier y passe
    ou va y passer). Sous l'escalier, la roche est libre : elle le porte."""
    ze = z_escalier(th)
    if ze is not None:
        return K.lisse(ze - 0.6, ze - 1.4, z)
    t = (th - (TH_ESC0 - 0.45)) % (2 * PI)
    d0, d1 = 2 * PI - t, t - (0.75 + TH_ESC1 - TH_ESC0)  # l'écart avec le début, avec la fin de l'escalier
    if d0 < d1:
        return max(K.lisse(0.0, 0.35, d0), K.lisse(Z_PIED - 0.6, Z_PIED - 1.4, z))
    return max(K.lisse(0.0, 0.35, d1), K.lisse(ZT - 0.6, ZT - 1.4, z))


CONTREFORTS = [  # (direction en degrés, largeur en radians, de combien il sort, jusqu'à quelle hauteur)
    (305, 0.2, 0.26, 2.1), (344, 0.17, 0.22, 2.7), (22, 0.2, 0.24, 3.2), (62, 0.25, 0.2, 2.4), (112, 0.22, 0.22, 3.0),
    (150, 0.2, 0.25, 3.3), (176, 0.14, 0.16, 2.3), (262, 0.16, 0.2, 1.5),
]
FAILLES = [(118, 0.07), (40, 0.06), (255, 0.045), (330, 0.06), (200, 0.05), (232, 0.04), (285, 0.05), (165, 0.05)]  # (direction, largeur)


def roc_vrai(th, z, dernier=False):
    """Le rayon de la vraie roche : la paroi lisse, creusée (des bosses, des failles, deux ressauts dont la marche varie),
    et là où elle a la place, des contreforts qui sortent, plus larges vers le pied."""
    if dernier:
        return r_roc(th, z)
    b = K.bruit2(math.cos(th) * 2.6 + 7.0, math.sin(th) * 2.6 + 7.0 + z * 1.9, 41)
    b2 = K.bruit2(math.cos(th) * 7.0 + 3.0, math.sin(th) * 7.0 + 3.0 + z * 4.0, 43)
    b3 = K.bruit2(math.cos(th) * 1.4 + 11.0, math.sin(th) * 1.4 + 11.0, 47)
    creux = 0.075 * (1 - b) + 0.02 * (1 - b2)
    creux += sum(0.1 * math.exp(-((_ecart(th, math.radians(a)) / l) ** 2)) for a, l in FAILLES) * K.lisse(ZT, ZT - 0.9, z) * (0.6 + 0.4 * b)
    creux += 0.05 * (0.4 + 1.2 * b3) * (K.lisse(1.18, 1.22, z) + K.lisse(2.48, 2.52, z)) * 0.5  # les ressauts : la roche recule en montant
    ze = z_escalier(th)
    if ze is not None:  # là où l'escalier s'accroche (et au pied, le long du sentier), la roche ne recule presque pas
        creux *= 1 - 0.88 * K.lisse(ze - 0.95, ze - 0.6, z) * K.lisse(ze + 0.8, ze + 0.45, z)
    place = place_roc(th, z)
    sort = sum(amp * math.exp(-((_ecart(th, math.radians(a)) / l) ** 2)) * K.lisse(haut, haut - 1.6, z) * (0.7 + 0.6 * b) for a, l, amp, haut in CONTREFORTS)
    sort += 0.12 * b3 * K.lisse(1.3, 0.1, z)
    return r_roc(th, max(z, 0.0)) * (1 - creux * K.lisse(ZT, ZT - 0.25, z) + sort * place)


def rocher_central(L, rng, leger):
    """Le Rocher : des anneaux de roche du pied (sous le terrain) au plateau ; le dessus est le plateau (sa matière peinte).
    La couture du motif est au nord."""
    n = 32 if leger else 54
    ths = [PI / 2 + k * 2 * PI / n for k in range(n)]
    niveaux = [Z0R, 0.15, 0.5, 0.85, 1.19, 1.21, 1.5, 1.8, 2.15, 2.49, 2.51, 2.8, 3.05, 3.25, 3.42, ZT]
    if leger:
        niveaux = [z for k, z in enumerate(niveaux) if k not in (1, 6, 8, 11, 13)]
    hasard = random.Random(4242)  # (à part : ne décale pas les tirages du reste de l'île)
    rings = []
    for j, z in enumerate(niveaux):
        ring = []
        for th in ths:
            r = roc_vrai(th, z, j == len(niveaux) - 1)
            if 0 < j < len(niveaux) - 1:  # la roche taillée à facettes : chaque sommet recule plus ou moins
                ze = z_escalier(th)
                tenu = 0.0 if ze is None else K.lisse(ze - 0.95, ze - 0.6, z) * K.lisse(ze + 0.8, ze + 0.45, z)
                r -= (0.03 + 0.15 * hasard.random() ** 1.5) * (1 - 0.85 * tenu) * K.lisse(ZT, ZT - 0.3, z)
            ring.append((ROC[0] + math.cos(th) * r, ROC[1] + math.sin(th) * r, z + (hasard.random() - 0.5) * (0.07 if 1 < j < len(niveaux) - 2 else 0.0)))
        rings.append(ring)
    A.anneaux(L, rings, "falaise")
    haut = rings[-1]
    uv = [((x - ROC[0] + RP) / (2 * RP), (y - ROC[1] + RP) / (2 * RP)) for x, y, _ in haut] + [(0.5, 0.5)]
    L.ajouter(haut + [(ROC[0], ROC[1], ZT)], [(i, (i + 1) % n, n) for i in range(n)], "plateau_phare", uv=uv)
    return [(x, y) for x, y, _ in haut]


def ecueil(L, rng, x, y, r, h, px=0.0, py=0.0, n=10, leger=False):
    """Un écueil ou une aiguille : des anneaux de roche qui sortent de l'eau, de plus en plus étroits, penchés ; son dessus
    en roche à lichens. Renvoie son contour à fleur d'eau (pour l'écume)."""
    n = max(6, int(n * 0.7)) if leger else n
    g = rng.random() * 9
    nb = 3 if h < 0.6 else (5 if h < 1.6 else 7)
    forme = lambda a, j: 1 + 0.16 * math.sin(3 * a + g + j * 0.8) + 0.1 * math.sin(5 * a + 2 * g + 1.7 * j)
    anneau = lambda t, j: [(x + px * t + math.cos(a) * r * (1.28 - 0.62 * t ** 1.4) * forme(a, j), y + py * t + math.sin(a) * r * (1.28 - 0.62 * t ** 1.4) * forme(a, j), Z0R + (h - Z0R) * t + 0.08 * h * math.sin(2 * a + g) * t) for a in (PI / 2 + k * 2 * PI / n for k in range(n))]
    rings = [anneau(j / nb, j) for j in range(nb + 1)]
    A.anneaux(L, rings, "falaise")
    haut = rings[-1]
    cz = max(p[2] for p in haut) + 0.06 * r
    L.ajouter(haut + [(x + px, y + py, cz)], [(i, (i + 1) % n, n) for i in range(n)], "roche_phare")
    return [(q[0], q[1]) for q in anneau(-Z0R / (h - Z0R), 0)]


def escalier(L, U, leger):
    """L'escalier de la falaise : des dalles de pierre qui sortent de la paroi, portées par des corbeaux ; des piquets de
    fer, une corde, une lanterne tous les neuf pas. Renvoie (le trajet du marcheur, les dalles pour le contrôle)."""
    pas = 0.2 if leger else 0.17
    long = (TH_ESC1 - TH_ESC0) * (r_roc((TH_ESC0 + TH_ESC1) / 2, (Z_PIED + ZT) / 2) + 0.27)
    nb = int(long / pas)
    trajet, ponts, poteaux = [], [], []
    for k in range(nb + 1):
        t = k / nb
        th = TH_ESC0 + (TH_ESC1 - TH_ESC0) * t
        z = Z_PIED + 0.06 + (ZT - Z_PIED - 0.06) * t
        ri = r_roc(th, z) - 0.06
        M = T(ROC[0], ROC[1], 0) @ Rz(th)
        L.ajouter(*N.boite(LARG_ESC + 0.08, pas + 0.04, 0.085), "quai", M @ T(ri + (LARG_ESC + 0.08) / 2, 0, z - 0.085))
        if k % 2 == 0:  # un corbeau : une pierre en biais, de la paroi au bout de la dalle
            L.ajouter(*N.poutre((ri + 0.03, 0, z - 0.52), (ri + LARG_ESC - 0.05, 0, z - 0.1), 0.11, 0.13), "pierres_sombres", M)
        q = au_roc(th, z, 0.26)
        trajet.append((q[0], q[1], z + 0.02))
        coins = [(ri - 0.02, -pas / 2 - 0.03), (ri + LARG_ESC + 0.1, -pas / 2 - 0.03), (ri + LARG_ESC + 0.1, pas / 2 + 0.03), (ri - 0.02, pas / 2 + 0.03)]
        ponts.append([(ROC[0] + math.cos(th) * a - math.sin(th) * b, ROC[1] + math.sin(th) * a + math.cos(th) * b) for a, b in coins])
        if k % 3 == 1:
            q = au_roc(th, z, LARG_ESC - 0.03)
            L.ajouter(*N.poutre((q[0], q[1], z - 0.03), (q[0], q[1], z + 0.3), 0.026), "fer")
            poteaux.append((q[0], q[1], z + 0.27))
            if k % 9 == 4:
                L.ajouter(*N.cylindre(0.045, 0.0, 0.045, 5), "fer", T(q[0], q[1], z + 0.41))
                U.ajouter(*N.sphere(0.06, 8, 6, 1.15), "lumiere", T(q[0], q[1], z + 0.355))
    L.ajouter(*N.tube(poteaux, 0.011, 3, bouts=False), "corde")
    return trajet, ponts


def r_fut(h):
    """Le rayon du fût du phare à cette hauteur au-dessus du plateau (il s'évase vers le pied)."""
    t = min(1.0, max(0.0, (h - H_FUT0) / (H_GAL - 0.3 - H_FUT0)))
    return R_FUT1 + (R_FUT0 - R_FUT1) * (1 - t) ** 1.7


def cercle(cx, cy, r, z, n, depart=PI / 2):
    return [(cx + math.cos(depart + k * 2 * PI / n) * r, cy + math.sin(depart + k * 2 * PI / n) * r, z) for k in range(n)]


def phare(lots, L, V, U, rng, leger):
    """Le phare : le socle et son perron, le fût à bandes, la porte et les fenêtres, l'encorbellement et la galerie, la
    lanterne vitrée, la coupole, le paratonnerre et sa girouette, l'optique qui tourne. Renvoie le cœur de la lanterne."""
    cx, cy = PHARE
    n = 10 if leger else 16
    M0 = T(cx, cy, ZT)
    L.ajouter(*N.cylindre(0.94, 0.9, H_FUT0 + 0.2, 12, haut=True), "quai", M0 @ T(0, 0, -0.2))
    for k in range(2):  # le perron, au sud
        L.ajouter(*N.boite(0.56, 0.17, H_FUT0 * (2 - k) / 3 + 0.2), "quai", M0 @ T(0, -(0.9 + 0.085 + 0.17 * k), -0.2))
    # le fût : cinq bandes, blanche, rouge, blanche…
    bornes = [H_FUT0 + (H_GAL - 0.3 - H_FUT0) * k / 5 for k in range(6)]
    for k in range(5):
        hs = [bornes[k] + (bornes[k + 1] - bornes[k]) * j / 2 for j in range(3)]
        A.anneaux(L, [cercle(cx, cy, r_fut(h), ZT + h, n) for h in hs], "phare_rouge" if k % 2 else "phare_blanc")
    for k in range(1, 5):  # un cordon de pierre à chaque changement de bande
        L.ajouter(*N.cylindre(r_fut(bornes[k]) + 0.022, r_fut(bornes[k]) + 0.022, 0.05, n, haut=True, bas=True), "pierres_sombres", M0 @ T(0, 0, bornes[k] - 0.025) @ Rz(PI / 2))
    for k in range(8):  # les consoles de la galerie
        a = k * PI / 4 + 0.2
        L.ajouter(*N.poutre((cx + math.cos(a) * (r_fut(H_GAL - 0.5) - 0.01), cy + math.sin(a) * (r_fut(H_GAL - 0.5) - 0.01), ZT + H_GAL - 0.52), (cx + math.cos(a) * 0.8, cy + math.sin(a) * 0.8, ZT + H_GAL - 0.07), 0.05, 0.07), "pierres_sombres")
    # la porte (au sud), son encadrement de pierre, sa lanterne
    Mp = M0 @ T(0, -r_fut(H_FUT0 + 0.2) - 0.012, H_FUT0)
    L.ajouter(*N.quad((-0.13, 0, 0.0), (0.13, 0, 0.0), (0.13, 0, 0.44), (-0.13, 0, 0.44)), "porte", Mp)
    for sx in (-1, 1):
        L.ajouter(*N.boite(0.07, 0.07, 0.47), "pierres_sombres", Mp @ T(sx * 0.165, 0.01, 0))
    L.ajouter(*N.boite(0.44, 0.09, 0.08), "pierres_sombres", Mp @ T(0, 0.01, 0.45))
    L.ajouter(*N.poutre((0.24, 0, 0.5), (0.24, -0.12, 0.5), 0.016), "fer", Mp)
    U.ajouter(*N.sphere(0.045, 6, 4), "lumiere", Mp @ T(0.24, -0.12, 0.45))
    # les fenêtres, en colimaçon (la plupart tournées vers le sud)
    for h, cap in ((1.05, -52), (1.85, -128), (2.65, -78), (3.4, -20), (3.45, -160), (2.2, 70))[:5 if leger else 6]:
        Mf = M0 @ Rz(math.radians(cap + 90)) @ T(0, -r_fut(h + 0.1) - 0.006, 0)
        P.fenetre(L, V, rng, Mf, 0, h, 0.13, 0.2, mat="fenetre_haute", allumee=True)
        L.ajouter(*N.boite(0.19, 0.045, 0.04), "pierres_sombres", Mf @ T(0, 0.008, h + 0.2))
    # l'encorbellement, la galerie, sa rambarde de fer
    zg = ZT + H_GAL
    A.anneaux(L, [cercle(cx, cy, r, z, n) for r, z in ((r_fut(H_GAL - 0.3), zg - 0.3), (0.6, zg - 0.17), (0.82, zg - 0.05), (0.88, zg - 0.05), (0.88, zg))], "pierres_sombres")
    haut = cercle(cx, cy, 0.88, zg, n)
    L.ajouter(haut + [(cx, cy, zg)], [(i, (i + 1) % n, n) for i in range(n)], "paves")
    nbp = 10 if leger else 16
    pieds = cercle(cx, cy, 0.84, zg, nbp, 0.2)
    for k, q in enumerate(pieds):
        L.ajouter(*N.poutre(q, (q[0], q[1], zg + 0.21), 0.02), "fer")
        q2 = pieds[(k + 1) % nbp]
        for dz in (0.2, 0.11):
            L.ajouter(*N.poutre((q[0], q[1], zg + dz), (q2[0], q2[1], zg + dz), 0.014), "fer")
    # la lanterne : le soubassement, les montants, les vitres, la corniche
    zl0, zl1 = zg + 0.2, zg + 0.84
    L.ajouter(*N.cylindre(0.46, 0.46, 0.2, 12 if not leger else 8, haut=True), "phare_rouge", T(cx, cy, zg))
    nv = 8
    for k in range(nv):
        a0, a1 = PI / 8 + k * 2 * PI / nv, PI / 8 + (k + 1) * 2 * PI / nv
        p0, p1 = (cx + math.cos(a0) * 0.42, cy + math.sin(a0) * 0.42), (cx + math.cos(a1) * 0.42, cy + math.sin(a1) * 0.42)
        L.ajouter(*N.poutre((p0[0], p0[1], zl0), (p0[0], p0[1], zl1), 0.03), "fer")
        V.ajouter(*N.quad((p0[0], p0[1], zl0 + 0.02), (p1[0], p1[1], zl0 + 0.02), (p1[0], p1[1], zl1 - 0.02), (p0[0], p0[1], zl1 - 0.02)), "vitre")
        L.ajouter(*N.poutre((p0[0], p0[1], zl0 + 0.32), (p1[0], p1[1], zl0 + 0.32), 0.016), "fer")
    L.ajouter(*N.cylindre(0.5, 0.52, 0.06, 12 if not leger else 8, haut=True, bas=True), "fer", T(cx, cy, zl1))
    # la coupole de cuivre, sa boule, le paratonnerre
    zc = zl1 + 0.06
    nd = 8 if leger else 12
    A.anneaux(L, [cercle(cx, cy, r, zc + dz, nd) for r, dz in ((0.5, 0.0), (0.47, 0.1), (0.39, 0.22), (0.26, 0.33), (0.1, 0.4))], "cuivre_vert", haut=True)
    L.ajouter(*N.sphere(0.075, 8, 5), "cuivre_vert", T(cx, cy, zc + 0.45))
    L.ajouter(*N.poutre((cx, cy, zc + 0.5), (cx, cy, zc + 0.95), 0.014), "fer")
    Gi = N.Maille("girouette")  # la girouette : une flèche et son empennage, qui cherche le vent
    Gi.ajouter(*N.poutre((-0.2, 0, 0), (0.22, 0, 0), 0.016), "fer")
    Gi.ajouter(*N.cylindre(0.035, 0.0, 0.09, 4), "fer", T(0.22, 0, 0) @ Ry(PI / 2))
    A.toile(Gi, [(-0.2, 0, -0.07), (-0.06, 0, -0.01), (-0.06, 0, 0.01), (-0.2, 0, 0.07)], [(0, 1, 2, 3)], "cuivre_vert", ep=0.008)
    lots["animes"].append((Gi, (cx, cy, zc + 0.8), {"anim": "balance", "axe": [0.0, 0.0, 1.0], "ampl": 0.45, "vitesse": 0.31, "phase": 1.2}))
    # l'optique : une cage de laiton, deux grandes lentilles dos à dos, qui tournent ; la lampe au milieu
    zo = zl0 + 0.31
    Op = N.Maille("optique")
    for dz in (-0.27, 0.24):
        Op.ajouter(*N.cylindre(0.2, 0.2, 0.035, 8, haut=True, bas=True), "or", T(0, 0, dz))
    for k in range(4):
        a = PI / 4 + k * PI / 2
        Op.ajouter(*N.poutre((math.cos(a) * 0.19, math.sin(a) * 0.19, -0.25), (math.cos(a) * 0.19, math.sin(a) * 0.19, 0.25), 0.022), "or")
    for s in (-1, 1):
        Op.ajouter(*N.cylindre(0.2, 0.17, 0.03, 10, haut=True), "lentille", T(s * 0.15, 0, 0) @ Ry(s * PI / 2))
        Op.ajouter(*N.sphere(0.09, 8, 4, 0.45), "lentille", T(s * 0.185, 0, 0) @ Ry(s * PI / 2))
    lots["animes"].append((Op, (cx, cy, zo), {"anim": "tourne", "axe": [0.0, 0.0, 1.0], "vitesse": VITESSE_OPTIQUE}))
    U.ajouter(*N.sphere(0.085, 14, 9), "lumiere", T(cx, cy, zo))  # (serrée : le plus gros amas brillant de l'île, pour que la nuit lui donne son halo même sur un téléphone)
    return (cx, cy, zo)


def maison_gardien(L, V, U, rng, x, y, z, cap, lx=1.4, ly=1.0, hm=0.52, ht=0.5, appentis=True, cheminees=2, toit="ardoises", mur="pierres_claires"):
    """La maison du gardien : des murs de pierre sur un soubassement, un toit d'ardoises, deux souches de cheminée aux
    pignons, la porte au milieu de la façade (local -y) et sa lanterne, des fenêtres à volets bleus, un banc, un appentis
    de planches contre le mur du fond. Renvoie le haut de ses cheminées."""
    M = T(x, y, z - 0.06) @ Rz(cap)
    z0 = 0.06
    L.ajouter(*N.boite(lx + 0.1, ly + 0.1, 0.36), "pierres_sombres", M @ T(0, 0, -0.3))
    L.ajouter(*N.boite(lx, ly, hm, haut=False), mur, M @ T(0, 0, z0))
    L.ajouter(*N.pignons(lx, ly, ht), mur, M @ T(0, 0, z0 + hm))
    v, f = N.toit_pignon(lx, ly, ht, 0.11, 0.055)
    L.ajouter(v, [f[0], f[4]], toit, M @ T(0, 0, z0 + hm))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, z0 + hm))
    L.ajouter(*N.poutre((-lx / 2 - 0.12, 0, z0 + hm + ht + 0.045), (lx / 2 + 0.12, 0, z0 + hm + ht + 0.045), 0.07), "pierres_sombres", M)
    hauts = []
    for s in (-1, 1)[:cheminees]:
        xc, hc = s * (lx / 2 - 0.13), hm + ht + 0.2
        L.ajouter(*N.boite(0.2, 0.24, hc), "pierres", M @ T(xc, 0, z0))
        L.ajouter(*N.boite(0.26, 0.3, 0.045, bas=True), "pierres_sombres", M @ T(xc, 0, z0 + hc))
        L.ajouter(*N.cylindre(0.045, 0.035, 0.1, 6), "tuiles_rouges", M @ T(xc, 0, z0 + hc + 0.045))
        hauts.append(tuple((M @ np.array((xc, 0, z0 + hc + 0.2, 1.0)))[:3]))
    Mf = M @ T(0, -ly / 2, 0)
    L.ajouter(*N.quad((-0.13, -0.012, z0), (0.13, -0.012, z0), (0.13, -0.012, z0 + 0.4), (-0.13, -0.012, z0 + 0.4)), "porte", Mf)
    L.ajouter(*N.boite(0.36, 0.05, 0.05), "pierres_sombres", Mf @ T(0, -0.02, z0 + 0.4))
    L.ajouter(*N.boite(0.4, 0.2, 0.05), "pierres_sombres", Mf @ T(0, -0.1, z0 - 0.045))
    L.ajouter(*N.poutre((0.22, -0.01, z0 + 0.42), (0.22, -0.11, z0 + 0.42), 0.016), "fer", Mf)
    U.ajouter(*N.sphere(0.04, 6, 4), "lumiere", Mf @ T(0.22, -0.11, z0 + 0.37))
    for sx in (-1, 1):
        P.fenetre(L, V, rng, Mf, sx * lx * 0.31, z0 + 0.15, 0.2, 0.24, volets="peint_bleu", allumee=True)
    P.fenetre(L, V, rng, M @ Rz(PI) @ T(0, -ly / 2, 0), lx * 0.25, z0 + 0.15, 0.2, 0.24, allumee=True)
    for s in (-1, 1):
        P.fenetre(L, V, rng, M @ Rz(s * PI / 2) @ T(0, -lx / 2, 0), 0.0 if cheminees < 2 else 0.24, z0 + hm - 0.1, 0.13, 0.17, allumee=s > 0)
    L.ajouter(*N.boite(0.42, 0.12, 0.035), "planches_claires", Mf @ T(-lx * 0.31, -0.12, z0 + 0.1))  # le banc, sous la fenêtre
    for sx in (-0.16, 0.16):
        L.ajouter(*N.boite(0.035, 0.1, 0.1), "planches_sombres", Mf @ T(-lx * 0.31 + sx, -0.12, z0))
    if appentis:  # contre le mur du fond (local +y) : des planches grises, un toit d'un seul pan
        la, pa_ = 0.8, 0.42
        Ma = M @ T(lx * 0.18, ly / 2 + pa_ / 2, 0)
        L.ajouter(*N.boite(la, pa_, 0.34, haut=False), "planches_grises", Ma @ T(0, 0, z0), tourne=True)
        a = [(-la / 2 - 0.05, -pa_ / 2, z0 + 0.5), (la / 2 + 0.05, -pa_ / 2, z0 + 0.5), (la / 2 + 0.05, pa_ / 2 + 0.07, z0 + 0.3), (-la / 2 - 0.05, pa_ / 2 + 0.07, z0 + 0.3)]
        L.ajouter(a + [(p[0], p[1], p[2] + 0.03) for p in a], [(4, 5, 6, 7), (2, 3, 7, 6), (3, 0, 4, 7), (1, 2, 6, 5)], "bardeaux", Ma)
        for sx in (-1, 1):
            L.ajouter([(sx * la / 2, -pa_ / 2, z0 + 0.34), (sx * la / 2, pa_ / 2, z0 + 0.34), (sx * la / 2, -pa_ / 2, z0 + 0.5)], [(0, 1, 2) if sx > 0 else (1, 0, 2)], "planches_grises", Ma)
    return hauts


def hangar(L, U, rng, x, y, z, cap, lx=1.25, ly=0.85, hm=0.44, ht=0.36):
    """Le hangar à bateaux : des planches sombres, un toit de bardeaux, le grand portail ouvert du côté de l'eau (local +x),
    une lanterne au pignon."""
    M = T(x, y, z - 0.05) @ Rz(cap)
    L.ajouter(*N.boite(lx, ly, hm + 0.05, haut=False), "planches_sombres", M, tourne=True)
    L.ajouter(*N.pignons(lx, ly, ht), "planches_sombres", M @ T(0, 0, hm + 0.05))
    v, f = N.toit_pignon(lx, ly, ht, 0.1, 0.05)
    L.ajouter(v, [f[0], f[4]], "bardeaux", M @ T(0, 0, hm + 0.05))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, hm + 0.05))
    xd = lx / 2 + 0.008
    L.ajouter(*N.quad((xd, -0.26, 0.05), (xd, 0.26, 0.05), (xd, 0.26, 0.42), (xd, -0.26, 0.42)), "tissu_sombre", M)
    for s in (-1, 1):  # les deux vantaux, ouverts
        L.ajouter(*N.boite(0.26, 0.03, 0.37), "planches_grises", M @ T(xd + 0.1, s * 0.33, 0.05) @ Rz(s * 0.55), tourne=True)
    L.ajouter(*N.poutre((xd, 0, hm + ht - 0.02), (xd + 0.14, 0, hm + ht - 0.02), 0.018), "fer", M)
    U.ajouter(*N.sphere(0.045, 6, 4), "lumiere", M @ T(xd + 0.14, 0, hm + ht - 0.07))


def canot(L, M, lg=0.8, mat="peint_rouge"):
    """Un canot (proue vers +x), posé où l'on veut (au sec sur sa cale, par exemple)."""
    P.coque(L, M, lg, lg * 0.4, 0.14, mat, 5, franc=0.07, dedans="planches_claires")
    for xb in (-lg * 0.18, lg * 0.15):
        L.ajouter(*N.boite(0.05, lg * 0.34, 0.015, bas=True), "planches_claires", M @ T(xb, 0, 0.03))
    L.ajouter(*N.boite(lg * 0.8, lg * 0.3, 0.01), "planches_sombres", M @ T(0, 0, -0.04))


def muret(L, rng, pts, h=0.24, ep=0.13):
    """Un mur de pierres sèches le long de ces points : des blocs inégaux. Renvoie ses emprises (une par tronçon)."""
    emp = []
    pts3 = [(p[0], p[1], 0.0) for p in pts]
    total, pas = Vt.longueur(pts3), 0.18
    nb = max(2, int(total / pas))
    for k in range(nb):
        a, b = A.point_a(pts3, total * k / nb), A.point_a(pts3, total * (k + 1) / nb)
        mx, my, cap = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, math.atan2(b[1] - a[1], b[0] - a[0])
        hh = h * (0.82 + 0.36 * rng.random())
        L.ajouter(*N.boite(pas + 0.03, ep * (0.9 + 0.25 * rng.random()), hh + 0.12), ("pierres", "pierres_sombres", "pierres", "pierres_claires")[k % 4], T(mx, my, sol(mx, my) - 0.12) @ Rz(cap + (rng.random() - 0.5) * 0.12))
        emp.append(Vf.rectangle(mx, my, pas + 0.03, ep + 0.04, cap))
    return emp


def phoque(L, rng, x, y, z, cap, dresse=True):
    """Un phoque qui se chauffe sur son rocher : un corps en fuseau, la tête levée (ou non), les nageoires."""
    M = T(x, y, z) @ Rz(cap)
    pts = [(-0.21, 0, 0.03), (-0.09, 0, 0.055), (0.05, 0, 0.065), (0.14, 0, 0.1 if dresse else 0.065), (0.19, 0, 0.165 if dresse else 0.075)]
    L.ajouter(*N.tube(pts, [0.022, 0.052, 0.062, 0.047, 0.032], 6), "phoque", M, doux=True)
    L.ajouter(*N.sphere(0.036, 6, 4), "phoque", M @ T(pts[-1][0] + 0.022, 0, pts[-1][2] + 0.012))
    for s in (-1, 1):
        L.ajouter(*N.boite(0.08, 0.035, 0.014), "phoque", M @ T(0.04, s * 0.075, 0.005) @ Rz(s * 0.5))
        L.ajouter(*N.boite(0.07, 0.03, 0.012), "phoque", M @ T(-0.25, s * 0.025, 0.015) @ Rz(s * 0.35))


def cormoran(L, x, y, z, cap):
    """Un cormoran qui sèche ses ailes, debout sur sa pierre."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.tube([(0, 0, 0.0), (0, 0, 0.09), (0.012, 0, 0.15), (0.03, 0, 0.175)], [0.02, 0.03, 0.013, 0.01], 5), "plume_cormoran", M)
    L.ajouter(*N.cylindre(0.008, 0.0, 0.03, 4), "or", M @ T(0.035, 0, 0.176) @ Ry(PI / 2))
    for s in (-1, 1):
        A.toile(L, [(0, s * 0.02, 0.12), (-0.01, s * 0.1, 0.13), (-0.02, s * 0.11, 0.07), (0, s * 0.03, 0.05)], [(0, 1, 2, 3) if s > 0 else (3, 2, 1, 0)], "plume_cormoran", M, ep=0.006)


def cloche_de_brume(lots, L, x, y, z, cap):
    """La cloche de brume : un portique de bois, la cloche de bronze qui se balance."""
    u = (math.cos(cap), math.sin(cap))
    for s in (-1, 1):
        L.ajouter(*N.poutre((x + u[0] * s * 0.22, y + u[1] * s * 0.22, z - 0.05), (x + u[0] * s * 0.22, y + u[1] * s * 0.22, z + 0.56), 0.05), "poutre")
        L.ajouter(*N.poutre((x + u[0] * s * 0.22 - u[1] * 0.16, y + u[1] * s * 0.22 + u[0] * 0.16, z - 0.02), (x + u[0] * s * 0.22, y + u[1] * s * 0.22, z + 0.3), 0.035), "poutre")
    L.ajouter(*N.poutre((x - u[0] * 0.3, y - u[1] * 0.3, z + 0.56), (x + u[0] * 0.3, y + u[1] * 0.3, z + 0.56), 0.06), "poutre")
    Cl = N.Maille("cloche")
    A.anneaux(Cl, [cercle(0, 0, r, dz, 9) for r, dz in ((0.125, -0.26), (0.1, -0.22), (0.082, -0.13), (0.07, -0.06), (0.03, -0.03))], "bronze_phare", haut=True)
    Cl.ajouter(*N.poutre((0, 0, -0.03), (0, 0, 0.0), 0.02), "fer")
    Cl.ajouter(*N.sphere(0.028, 6, 4), "fer", T(0, 0, -0.25))
    lots["animes"].append((Cl, (x, y, z + 0.53), {"anim": "balance", "axe": [u[0], u[1], 0.0], "ampl": 0.3, "vitesse": 1.9, "phase": 0.4}))


def linge(lots, L, a, b, z):
    """La corde à linge : deux perches, la corde, trois draps qui battent au vent (un seul objet, qui se balance)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    lg = float(np.linalg.norm(b - a))
    u = (b - a) / lg
    cap = math.atan2(u[1], u[0])
    for q in (a, b):
        L.ajouter(*N.poutre((q[0], q[1], sol(*q) - 0.08), (q[0], q[1], z + 0.47), 0.035), "planches_grises")
    Vt.corde(L, (a[0], a[1], z + 0.45), (b[0], b[1], z + 0.45), 0.02)
    Li = N.Maille("linge")
    for t, larg, haut, mat in ((0.2, 0.3, 0.3, "drap"), (0.5, 0.2, 0.19, "drap_bleu"), (0.78, 0.3, 0.26, "drap")):
        x0 = (t - 0.5) * lg
        A.toile(Li, [(x0 - larg / 2, 0, 0), (x0 + larg / 2, 0, 0), (x0 + larg / 2, 0.03, -haut), (x0 - larg / 2, 0.03, -haut)], [(0, 1, 2, 3)], mat, Rz(cap), ep=0.008)
    m = (a + b) / 2
    lots["animes"].append((Li, (m[0], m[1], z + 0.43), {"anim": "balance", "axe": [float(u[0]), float(u[1]), 0.0], "ampl": 0.24, "vitesse": 1.7, "phase": 0.6}))
    return Vf.rectangle(m[0], m[1], lg + 0.1, 0.16, cap)


def mailles(graine=149, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de monde et de bibelots, trois marcheurs)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _mailles(graine, leger):
    rng = random.Random(graine)
    L, V, U = N.Maille("ile_corps"), N.Maille("ile_vitres"), N.Maille("ile_lumieres")
    lots = {"corps": L, "vitres": V, "lumieres": U, "bannieres": [], "animes": [], "copies": [], "libres": [], "reperes": []}
    SOL, emprises, ponts = [], [], []
    lots["etapes"] = []
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))
    terre = lambda pts: K.suivre(pts, sol)

    # --- le plan : la jetée, les sentiers, l'escalier, le plateau ---
    pa, pb = JETEE_A, JETEE_B
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    cote_p = np.array((-dp[1], dp[0]))  # le côté est de la jetée
    lg = float(np.linalg.norm(pb - pa))
    cap_j = math.atan2(dp[1], dp[0])
    fd = (math.cos(CAP_MAISON - PI / 2), math.sin(CAP_MAISON - PI / 2))  # où regarde la façade
    porte = (MAISON[0] + fd[0] * 0.78, MAISON[1] + fd[1] * 0.78)
    est = (MAISON[0] + math.cos(CAP_MAISON) * 1.05 + fd[0] * 0.55, MAISON[1] + math.sin(CAP_MAISON) * 1.05 + fd[1] * 0.55)  # le coin de la cour, à l'est
    etape("l'escalier")
    trajet_esc, ponts_esc = escalier(L, U, leger)
    ponts += ponts_esc
    th1 = TH_ESC1
    arrivee = [au_roc(th1, ZT, -0.32)[:2], au_roc(th1 - 0.55, ZT, -0.75)[:2], (PHARE[0] + 0.12, PHARE[1] - 1.5)]  # sur le plateau : de l'escalier au perron
    haut_esc = [(x, y, ZT + 0.02) for x, y in arrivee]
    avant_pied = au_roc(TH_ESC0 - 0.22, 1.1, 0.6)[:2]
    sentier_gardien = terre([porte, est, avant_pied, au_roc(TH_ESC0 - 0.04, 1.1, 0.3)[:2]])
    monte = sentier_gardien + trajet_esc + haut_esc
    ravitaille = [(*(pa + dp * (lg - 0.7)), ZQ + 0.02), (*(pa + dp * 0.4), ZQ + 0.02)] + terre([tuple(pa - dp * 0.15), (-0.75, -3.75), (-1.75, -2.2), (-2.5, -1.15), (est[0] + 0.15, est[1] - 0.2)])
    zgal = ZT + H_GAL + 0.02
    ronde = [(PHARE[0] + math.cos(k * 2 * PI / 16) * 0.68, PHARE[1] + math.sin(k * 2 * PI / 16) * 0.68, zgal) for k in range(16)]  # le guetteur, sur la galerie
    veille = [(x, y, ZT + 0.02) for x, y in ((PHARE[0] - 0.35, PHARE[1] - 1.45), (PHARE[0] - 0.8, PHARE[1] - 1.5), (PHARE[0] - 1.22, PHARE[1] - 1.18))]  # du perron à la cloche
    peche = terre([(3.48, -2.65), (4.0, -2.0), (4.45, -0.9), (4.6, 0.6)])
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        (monte, False, 0.17, 0.0, 5.0),
        (ravitaille, False, 0.16, 0.35, 3.0),
        (ronde, True, 0.09, 0.0, 0.0),
        (veille, False, 0.12, 0.5, 4.0),
        (peche, False, 0.15, 0.2, 5.0),
    ]
    PISTES[:] = [sentier_gardien, ravitaille[1:], peche, terre([(-1.75, -2.2), (-2.5, -2.3), (JARDIN[0] + 0.95, JARDIN[1] + 0.1)]), terre([tuple(pa - dp * 0.15), (0.3, -4.1), (REMISE[0] - 0.1, REMISE[1] - 0.55)]), terre([(-1.75, -2.2), (-1.9, -1.4), avant_pied])]
    PISTES_HAUT[:] = [haut_esc, veille, [(PHARE[0] + math.cos(k * PI / 8) * 1.22, PHARE[1] + math.sin(k * PI / 8) * 1.22, 0) for k in range(17)]]
    couloirs = [(sentier_gardien, 0.12), (ravitaille[1:], 0.12), (peche, 0.1)]
    loin_des_sentiers = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r):
        """Cette place est-elle à terre, hors du Rocher, des passages et de ce qui est déjà posé ?"""
        if terrain(x, y) < 0.16 or bord(x, y) < r + 0.12 or d_roc(x, y, 0.6) < r + 0.3 or not loin_des_sentiers(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    # --- le terrain (d'un seul tenant, à sommets partagés ; rien sous le Rocher) ---
    n, R = (52 if leger else 76), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[terrain(x, y) for x in xs] for y in xs]
    dessous = [[d_roc(x, y, max(0.0, H_[j][i])) < -0.4 for i, x in enumerate(xs)] for j, y in enumerate(xs)]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H_[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    debut_sol = len(L.f)
    for j in range(n):
        for i in range(n):
            if max(H_[j][i], H_[j][i + 1], H_[j + 1][i + 1], H_[j + 1][i]) < -0.25 or (dessous[j][i] and dessous[j][i + 1] and dessous[j + 1][i + 1] and dessous[j + 1][i]):
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_phare", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)

    etape("le Rocher")
    contour = rocher_central(L, rng, leger)
    # le parapet du plateau : un muret bas qui suit le bord, ouvert là où arrive l'escalier
    nbm = 44 if leger else 64
    for k in range(nbm):
        th = k * 2 * PI / nbm
        if abs(_ecart(th, th1 - 0.02)) < 0.27:
            continue
        q = au_roc(th, ZT, -0.1)
        L.ajouter(*N.boite(2 * PI * R_TOP / nbm + 0.03, 0.13, 0.15 * (0.85 + 0.3 * rng.random())), ("pierres", "pierres_sombres", "pierres_claires")[k % 3], T(q[0], q[1], ZT - 0.01) @ Rz(th + PI / 2 + (rng.random() - 0.5) * 0.1))

    for a, plus, r_, h_, vx, vy in ((150, 0.55, 0.62, 3.0, 0.3, -0.1), (30, 0.6, 0.7, 3.3, -0.35, -0.15), (95, 0.5, 0.55, 2.2, 0.0, -0.3))[:2 if leger else 3]:  # les dents de roche, contre le Rocher
        q = au_roc(math.radians(a), 0.8, plus)
        ecueil(L, rng, q[0], q[1], r_, h_, vx, vy, 10, leger)
        SOL.append(("dur", "une dent de roche", Vf.rond(q[0], q[1], r_ * 1.2)))

    etape("le phare")
    coeur = phare(lots, L, V, U, rng, leger)
    ponts.append(Vf.rond(PHARE[0], PHARE[1], 0.9, 16))
    SOL.append(("decor", "le phare", Vf.rond(PHARE[0], PHARE[1], 0.9, 14)))

    etape("le plateau")
    # --- sur le plateau : la cloche de brume, le mât des signaux, la table d'orientation, le treuil, des barils ---
    qc = au_roc(math.radians(215), ZT, -0.44)
    cloche_de_brume(lots, L, qc[0], qc[1], ZT, math.radians(215) + PI / 2)
    SOL.append(("decor", "la cloche de brume", Vf.rectangle(qc[0], qc[1], 0.62, 0.36, math.radians(215) + PI / 2)))
    qm = au_roc(math.radians(296), ZT, -0.3)
    hm_ = 1.7
    L.ajouter(*N.cylindre(0.035, 0.02, hm_, 6), "planches_claires", T(qm[0], qm[1], ZT - 0.02))
    L.ajouter(*N.poutre((qm[0] - 0.3, qm[1], ZT + hm_ * 0.78), (qm[0] + 0.3, qm[1], ZT + hm_ * 0.78), 0.022), "planches_claires")
    for s in (-1, 1):
        L.ajouter(*N.tube([(qm[0] + s * 0.3, qm[1], ZT + hm_ * 0.78), (qm[0] + s * 0.32, qm[1] + 0.02, ZT + 0.04)], 0.007, 3, bouts=False), "corde")
    Vt.flamme(lots, qm[0], qm[1], ZT + hm_ - 0.06, 0.62, "rose", 0.15)
    for k, coul_ in enumerate(("or", "turquoise", "creme")):
        Vt.flamme(lots, qm[0] + 0.3, qm[1], ZT + hm_ * 0.74 - k * 0.2, 0.26, coul_, 0.15)
    SOL.append(("decor", "le mât des signaux", Vf.rond(qm[0], qm[1], 0.07)))
    qt = au_roc(math.radians(258), ZT, -0.36)
    L.ajouter(*N.cylindre(0.1, 0.085, 0.2, 8), "pierres_claires", T(qt[0], qt[1], ZT - 0.02))
    L.ajouter(*N.cylindre(0.15, 0.15, 0.025, 10, haut=True, bas=True), "bronze_phare", T(qt[0], qt[1], ZT + 0.18))
    L.ajouter(*N.cylindre(0.02, 0.0, 0.05, 4), "or", T(qt[0], qt[1], ZT + 0.205))
    SOL.append(("decor", "la table d'orientation", Vf.rond(qt[0], qt[1], 0.16)))
    # le treuil : la potence au bord du plateau, sa poulie, la corde, le tambour ; la caisse monte et descend
    q0, q1 = au_roc(TH_TREUIL, ZT, -0.3), au_roc(TH_TREUIL, ZT, 0.55)
    L.ajouter(*N.poutre((q0[0], q0[1], ZT - 0.05), (q0[0], q0[1], ZT + 0.95), 0.07), "poutre")
    L.ajouter(*N.poutre((q0[0], q0[1], ZT + 0.92), (q1[0], q1[1], ZT + 0.92), 0.065), "poutre")
    qj = au_roc(TH_TREUIL, ZT, 0.12)
    L.ajouter(*N.poutre((q0[0], q0[1], ZT + 0.4), (qj[0], qj[1], ZT + 0.9), 0.045), "poutre")
    z_charge = terrain(q1[0], q1[1])
    L.ajouter(*N.poutre((q1[0], q1[1], ZT + 0.88), (q1[0], q1[1], z_charge + 0.3), 0.012), "corde")
    qw = au_roc(TH_TREUIL + 0.2, ZT, -0.55)
    L.ajouter(*N.cylindre(0.07, 0.07, 0.3, 8, haut=True, bas=True), "planches", T(qw[0], qw[1], ZT + 0.2) @ Rz(TH_TREUIL + PI / 2) @ Ry(PI / 2) @ T(0, 0, -0.15))
    for s in (-1, 1):
        L.ajouter(*N.boite(0.05, 0.05, 0.24), "planches_sombres", T(qw[0] - math.sin(TH_TREUIL) * s * 0.17, qw[1] + math.cos(TH_TREUIL) * s * 0.17, ZT - 0.02))
    SOL.append(("decor", "le treuil", Vf.rectangle((q0[0] + qw[0]) / 2, (q0[1] + qw[1]) / 2, 0.7, 0.44, TH_TREUIL)))
    Ch = N.Maille("charge")
    P.caisse(Ch, T(0, 0, 0), 0.22)
    for s in (-1, 1):
        Ch.ajouter(*N.poutre((s * 0.11, 0, 0.22), (0, 0, 0.42), 0.012), "corde")
        Ch.ajouter(*N.poutre((0, s * 0.11, 0.22), (0, 0, 0.42), 0.012), "corde")
    lots["animes"].append((Ch, (q1[0], q1[1], z_charge + 0.04), {"anim": "marche", "suspendu": True, "chemin": [float(q1[0]), float(q1[1]), float(z_charge + 0.04), float(q1[0]), float(q1[1]), float(ZT + 0.3)], "vitesse": 0.13, "phase": 0.3, "saut": 0.0, "pause": 6.0}))
    SOL.append(("dur", "la caisse du treuil", Vf.rond(q1[0], q1[1], 0.3)))
    for k, (dx, dy) in enumerate(((-0.5, -1.0), (-0.66, -0.9))):  # l'huile de la lampe, près de la porte
        P.tonneau(L, T(PHARE[0] + dx, PHARE[1] + dy, ZT), 0.075, 0.2)
    P.caisse(L, T(PHARE[0] - 0.4, PHARE[1] - 1.13, ZT) @ Rz(0.4), 0.15)
    SOL.append(("decor", "les barils d'huile", Vf.rond(PHARE[0] - 0.52, PHARE[1] - 1.0, 0.22)))

    etape("la maison")
    # --- la maison du gardien, sa cour, le linge, le potager, la remise ---
    cheminees = maison_gardien(L, V, U, rng, MAISON[0], MAISON[1], Z_MAISON, CAP_MAISON)
    um = (math.cos(CAP_MAISON), math.sin(CAP_MAISON))
    SOL.append(("decor", "la maison du gardien", Vf.rectangle(MAISON[0], MAISON[1], 1.52, 1.02, CAP_MAISON)))
    SOL.append(("decor", "l'appentis", Vf.rectangle(MAISON[0] + um[0] * 0.25 - fd[0] * 0.76, MAISON[1] + um[1] * 0.25 - fd[1] * 0.76, 0.9, 0.44, CAP_MAISON)))
    qb = (MAISON[0] - um[0] * 0.9 + fd[0] * 0.62, MAISON[1] - um[1] * 0.9 + fd[1] * 0.62)  # la barrique d'eau de pluie, au coin
    P.tonneau(L, T(qb[0], qb[1], Z_MAISON), 0.1, 0.26)
    SOL.append(("decor", "la barrique", Vf.rond(qb[0], qb[1], 0.11)))
    la, lb = (MAISON[0] + fd[0] * 1.75 - um[0] * 0.55, MAISON[1] + fd[1] * 1.75 - um[1] * 0.55), (MAISON[0] + fd[0] * 1.95 + um[0] * 0.75, MAISON[1] + fd[1] * 1.95 + um[1] * 0.75)
    SOL.append(("decor", "le linge", linge(lots, L, la, lb, max(sol(*la), sol(*lb)))))
    uj = (math.cos(CAP_JARDIN), math.sin(CAP_JARDIN))
    coin = lambda a, b: (JARDIN[0] + uj[0] * a - uj[1] * b, JARDIN[1] + uj[1] * a + uj[0] * b)
    for pts in ([coin(LXJ / 2, 0.22), coin(LXJ / 2, LYJ / 2), coin(-LXJ / 2, LYJ / 2), coin(-LXJ / 2, -LYJ / 2), coin(LXJ / 2, -LYJ / 2), coin(LXJ / 2, -0.22)],):
        for e in muret(L, rng, pts):
            SOL.append(("rocher", "le muret du potager", e))
    for i in range(4):  # les rangs de choux et de poireaux
        for j in range(3 if leger else 5):
            q = coin(-LXJ / 2 + 0.25 + (LXJ - 0.5) * (j + 0.5 * (i % 2)) / 5, -LYJ / 2 + 0.2 + (LYJ - 0.4) * i / 3)
            if i % 2:
                L.ajouter(*N.sphere(0.05, 6, 4, 0.75), "choux", T(q[0], q[1], sol(*q) + 0.03) @ Rz(i + j), doux=True)
            else:
                Vt.herbes(L, rng, q[0], q[1], sol(*q), 3)
    rem = maison_gardien(L, V, U, rng, REMISE[0], REMISE[1], Z_REMISE, CAP_REMISE, lx=0.95, ly=0.72, hm=0.42, ht=0.36, appentis=False, cheminees=0, mur="pierres")
    SOL.append(("decor", "la remise", Vf.rectangle(REMISE[0], REMISE[1], 1.06, 0.84, CAP_REMISE)))
    ur = (math.cos(CAP_REMISE), math.sin(CAP_REMISE))
    for k in range(3 if leger else 5):  # ses barils et ses caisses, contre le pignon
        q = (REMISE[0] + ur[0] * (0.66 + 0.17 * (k % 2)) - ur[1] * (-0.2 + 0.2 * (k // 2)), REMISE[1] + ur[1] * (0.66 + 0.17 * (k % 2)) + ur[0] * (-0.2 + 0.2 * (k // 2)))
        if k % 3 == 2:
            P.caisse(L, T(q[0], q[1], sol(*q) - 0.01) @ Rz(k * 0.6), 0.17)
        else:
            P.tonneau(L, T(q[0], q[1], sol(*q) - 0.01), 0.075, 0.2)
    SOL.append(("decor", "les barils de la remise", Vf.rectangle(REMISE[0] + ur[0] * 0.75, REMISE[1] + ur[1] * 0.75, 0.42, 0.62, CAP_REMISE)))

    etape("la jetée")
    # --- la jetée de pierre, ses bittes, sa lanterne, sa potence ; le caboteur du ravitaillement, le canot ---
    nbj = 6
    for k in range(nbj):
        c = pa + dp * (lg * (k + 0.5) / nbj)
        L.ajouter(*N.boite(lg / nbj + 0.02, 0.74 + 0.04 * (k % 2), ZQ + 0.9), "quai", T(c[0], c[1], -0.9) @ Rz(cap_j))
        for s in (-1, 1):
            L.ajouter(*N.boite(lg / nbj - 0.02, 0.1, 0.03), "pierres_sombres", T(c[0] + cote_p[0] * s * 0.33, c[1] + cote_p[1] * s * 0.33, ZQ - 0.005) @ Rz(cap_j))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg + 0.1, 0.78, cap_j))
    emprises.append(("la jetée", Vf.rectangle(*(pa + dp * (lg / 2 + 0.2)), lg - 0.4, 0.78, cap_j)))
    for t in (0.42, 0.68, 0.94):
        q = pa + dp * lg * t - cote_p * 0.3
        L.ajouter(*N.cylindre(0.04, 0.05, 0.1, 6), "fer", T(q[0], q[1], ZQ + 0.02))
    q = pb - dp * 0.14 + cote_p * 0.27
    P.lampadaire(L, U, q[0], q[1], z=ZQ + 0.02, h=0.62)
    for k in range(4):  # l'escalier de la jetée, côté est, pour le canot
        q = pa + dp * (lg - 0.75 - 0.16 * k) + cote_p * 0.47
        L.ajouter(*N.boite(0.17, 0.22, 0.12 + (ZQ - 0.08) * k / 3 + 0.5), "quai", T(q[0], q[1], -0.5) @ Rz(cap_j))
    q = pa + dp * (lg * 0.3) + cote_p * 0.25  # la potence et son palan
    L.ajouter(*N.poutre((q[0], q[1], ZQ), (q[0], q[1], ZQ + 0.7), 0.05), "poutre")
    q2 = q + cote_p * 0.45
    L.ajouter(*N.poutre((q[0], q[1], ZQ + 0.68), (q2[0], q2[1], ZQ + 0.78), 0.045), "poutre")
    L.ajouter(*N.poutre((q[0], q[1], ZQ + 0.3), (q[0] + cote_p[0] * 0.28, q[1] + cote_p[1] * 0.28, ZQ + 0.7), 0.035), "poutre")
    L.ajouter(*N.poutre((q2[0], q2[1], ZQ + 0.76), (q2[0], q2[1], ZQ + 0.36), 0.01), "corde")
    L.ajouter(*N.cylindre(0.02, 0.0, 0.05, 4), "fer", T(q2[0], q2[1], ZQ + 0.31))
    for k, (t, s, genre) in enumerate(((0.13, -0.24, "c"), (0.2, -0.26, "t"), (0.14, 0.24, "t"), (0.52, 0.26, "c"), (0.58, 0.25, "t"))[:3 if leger else 5]):  # ce qu'on débarque
        q = pa + dp * lg * t + cote_p * s
        if genre == "c":
            P.caisse(L, T(q[0], q[1], ZQ + 0.02) @ Rz(k * 0.7), 0.16)
        else:
            P.tonneau(L, T(q[0], q[1], ZQ + 0.02), 0.07, 0.18)
    cb = pa + dp * (lg * 0.63) - cote_p * (0.37 + 0.41 + 0.1)
    Cb = N.Maille("caboteur")
    P.caboteur(Cb, N.Maille("rien"), rng, 0, 0, cap_j, 2.4, "toile_ecrue", "peint_bleu")
    lots["animes"].append((Cb, (cb[0], cb[1], 0.02), {"anim": "flotte", "mer": 1, "ampl": 0.012, "phase": 1.9}))
    emprises.append(("le caboteur", Vf.rectangle(cb[0], cb[1], 2.4, 0.82, cap_j)))
    bq = pa + dp * (lg - 0.6) + cote_p * (0.37 + 0.22 + 0.2)
    Bq = N.Maille("canot")
    P.barque(Bq, rng, 0, 0, cap_j + 0.12)
    lots["animes"].append((Bq, (bq[0], bq[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.7}))
    emprises.append(("le canot", Vf.rectangle(bq[0], bq[1], 0.8, 0.32, cap_j + 0.12)))

    etape("l'anse")
    # --- l'anse : le hangar à bateaux, sa cale de bois, un canot au sec, des casiers, les filets qui sèchent ---
    hangar(L, U, rng, HANGAR[0], HANGAR[1], Z_HANGAR, CAP_HANGAR)
    SOL.append(("decor", "le hangar à bateaux", Vf.rectangle(HANGAR[0], HANGAR[1], 1.35, 0.95, CAP_HANGAR)))
    uh = np.array((math.cos(CAP_HANGAR), math.sin(CAP_HANGAR)))
    nh = np.array((-uh[1], uh[0]))
    h0, h1 = np.array(HANGAR) + uh * 0.66, np.array(HANGAR) + uh * 2.0
    for s in (-1, 1):  # la cale : deux longerons, des traverses
        L.ajouter(*N.poutre((*(h0 + nh * s * 0.17), Z_HANGAR + 0.0), (*(h1 + nh * s * 0.17), -0.08), 0.045), "planches_sombres")
    for k in range(6):
        c = h0 + (h1 - h0) * (k + 0.5) / 6
        zc_ = Z_HANGAR + (-0.08 - Z_HANGAR) * (k + 0.5) / 6
        L.ajouter(*N.poutre((*(c - nh * 0.24), zc_ - 0.01), (*(c + nh * 0.24), zc_ - 0.01), 0.04), "planches_grises")
    emprises.append(("la cale", Vf.rectangle(*((h0 + h1) / 2), 1.34, 0.5, CAP_HANGAR)))
    cc = h0 + (h1 - h0) * 0.36
    pente = math.atan2(Z_HANGAR + 0.08, 1.34)
    canot(L, T(cc[0], cc[1], Z_HANGAR + (-0.08 - Z_HANGAR) * 0.36 + 0.1) @ Rz(CAP_HANGAR) @ Ry(pente))
    for k in range(2 if leger else 4):  # les casiers
        q = np.array(HANGAR) - nh * (0.72 + 0.02 * k) + uh * (-0.35 + 0.24 * k)
        L.ajouter(*N.boite(0.2, 0.15, 0.12), "filet", T(q[0], q[1], sol(*q) - 0.01) @ Rz(CAP_HANGAR + 0.2 * k))
    SOL.append(("decor", "les casiers", Vf.rectangle(*(np.array(HANGAR) - nh * 0.75), 1.0, 0.24, CAP_HANGAR)))
    f0, f1 = np.array(HANGAR) + nh * 0.85 - uh * 0.45, np.array(HANGAR) + nh * 0.95 + uh * 0.5  # le séchoir à filets
    for q in (f0, f1):
        L.ajouter(*N.poutre((q[0], q[1], sol(*q) - 0.08), (q[0], q[1], sol(*q) + 0.42), 0.035), "planches_grises")
    zf = max(sol(*f0), sol(*f1)) + 0.4
    Vt.corde(L, (f0[0], f0[1], zf), (f1[0], f1[1], zf), 0.03)
    A.toile(L, [(f0[0], f0[1], zf - 0.015), (f1[0], f1[1], zf - 0.015), (f1[0] + nh[0] * 0.06, f1[1] + nh[1] * 0.06, zf - 0.3), (f0[0] + nh[0] * 0.06, f0[1] + nh[1] * 0.06, zf - 0.27)], [(0, 1, 2, 3)], "filet", ep=0.008)
    SOL.append(("decor", "le séchoir à filets", Vf.rectangle(*((f0 + f1) / 2), 1.05, 0.16, math.atan2((f1 - f0)[1], (f1 - f0)[0]))))

    etape("le large")
    # --- au large : l'Aiguille, les écueils, l'épave sur son récif, les phoques, les cormorans ---
    flots, rivages = [], []
    for k, (x, y, r, h, px, py, nc) in enumerate(ECUEILS):
        if leger and k in (2, 6, 8, 13):
            continue
        flots.append(ecueil(L, rng, x, y, r, h, px, py, nc, leger))
    faits = 0
    for essai in range(400):  # les rochers du rivage, à cheval sur la ligne d'eau (pas devant la jetée ni dans l'anse)
        if faits >= (16 if leger else 34):
            break
        ang = rng.random() * 360
        if abs(_ecart(math.radians(ang), math.radians(-92))) < 0.3 or abs(_ecart(math.radians(ang), math.radians(-48))) < 0.34:
            continue
        x, y = vers(ang, -0.5 + rng.random() * 0.75)
        r_ = 0.17 + rng.random() * 0.27
        if any(math.hypot(x - q[0], y - q[1]) < r_ + q[2] + 0.12 for q in rivages) or any(K.distance_au_trajet(x, y, pts) < r_ * 1.3 + 0.2 for pts, _ in couloirs):
            continue
        ecueil(L, rng, x, y, r_, 0.16 + rng.random() * 0.5, 0.0, 0.0, 7, leger)
        rivages.append((x, y, r_))
        if bord(x, y) > -r_:
            SOL.append(("rocher", "un rocher du rivage", Vf.rond(x, y, r_ * 1.25)))
        faits += 1
    Me = T(-7.35, -1.45, 0.3) @ Rz(0.7) @ Rx(0.42) @ Ry(-0.1)  # l'épave : couchée sur le récif de l'ouest
    Am.epave(L, rng, Me, 2.5, 0.85, 0.42, 0.12, leger)
    mat_ = [(0.15, 0.0, 0.2), (0.3, -0.25, 1.15), (0.36, -0.42, 1.75)]  # ce qui reste du grand mât, et un lambeau de voile
    L.ajouter(*N.tube(mat_, [0.055, 0.045, 0.03], 6), "bois_epave_sombre", Me)
    L.ajouter(*N.poutre((0.3, -0.75, 1.2), (0.3, 0.22, 1.2), 0.035), "bois_epave_sombre", Me)
    A.toile(L, [(0.3, -0.7, 1.19), (0.3, 0.16, 1.19), (0.34, 0.05, 0.78), (0.4, -0.2, 0.55), (0.36, -0.52, 0.7)], [(0, 1, 2), (0, 2, 3, 4)], "voile_epave", Me, ep=0.008)
    x, y = ECUEILS[7][0], ECUEILS[7][1]  # le rocher des phoques
    for k, (dx, dy, cap, dresse) in enumerate(((-0.25, 0.1, 0.4, True), (0.22, -0.18, 2.6, False), (0.3, 0.3, -1.2, False))[:2 if leger else 3]):
        phoque(L, rng, x + dx, y + dy, ECUEILS[7][3] + 0.02, cap, dresse)
    for k, (i, dx, dy) in enumerate(((0, 0.35, 0.1), (1, 0.0, 0.1), (10, 0.05, 0.0), (12, -0.15, 0.1))[:2 if leger else 4]):
        e = ECUEILS[i]
        cormoran(L, e[0] + e[4] + dx * 0.2, e[1] + e[5] + dy * 0.2, e[3] + 0.06 * e[2] + 0.02, 0.8 + k * 1.7)

    etape("la terre")
    # --- la terre basse : l'arbre que le vent a couché, la bruyère, les herbes, les rochers, les moutons ---
    for x, y, h in ((-4.95, -2.2, 1.45),) + (() if leger else ((3.95, 1.75, 1.1),)):
        Vt.arbre_vent(L, rng, x, y, sol(x, y), h, not leger)
        SOL.append(("arbre", "un arbre couché par le vent", Vf.rond(x, y, 0.14)))
    faits = 0
    for essai in range(500):
        if faits >= (8 if leger else 16):
            break
        x, y = vers(rng.random() * 360, 0.4 + rng.random() * 2.6)
        r_ = 0.16 + rng.random() * 0.2
        if not libre(x, y, r_ * 0.8):
            continue
        v, f = N.sphere(r_, 7, 4, 0.5)
        g = rng.random() * 9
        v = [(a * q, b * q, c * q) for (a, b, c) in v for q in [1 + 0.2 * math.sin(a / r_ * 4.3 + g) * math.sin(b / r_ * 3.7 + g)]]
        L.ajouter(v, f, rng.choice(["bruyere", "bruyere", "feuillage_vent"]), T(x, y, sol(x, y) + r_ * 0.22) @ Rz(g), zone=(1.0, 0.86, 1.0), doux=True)
        SOL.append(("arbre", "une touffe de bruyère", Vf.rond(x, y, r_ * 0.7)))
        faits += 1
    faits = 0
    for essai in range(600):
        if faits >= (10 if leger else 20):
            break
        x, y = vers(rng.random() * 360, 0.35 + rng.random() * 2.8)
        r_ = 0.1 + rng.random() * 0.2
        if not libre(x, y, r_):
            continue
        Vt.rocher(L, rng, x, y, sol(x, y) - r_ * 0.25, r_, "roche_phare")
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r_ * 0.85)))
        faits += 1
    for k in range(10 if leger else 22):  # les blocs tombés au pied du Rocher
        th = rng.random() * 2 * PI
        q = au_roc(th, 0.6, 0.25 + rng.random() * 0.5)
        r_ = 0.14 + rng.random() * 0.22
        if terrain(q[0], q[1]) < 0.3 or not loin_des_sentiers(q[0], q[1], r_) or any(Vf.penetration(Vf.rond(q[0], q[1], r_), p) > 0 for _, _, p in SOL):
            continue
        if any(Vf.penetration(Vf.rond(q[0], q[1], r_ + 0.1), p) > 0 for p in ponts_esc) or math.hypot(q[0] - PIED[0], q[1] - PIED[1]) < 0.9:
            continue
        Vt.rocher(L, rng, q[0], q[1], terrain(q[0], q[1]) - r_ * 0.2, r_, "roche_phare")
        SOL.append(("rocher", "un bloc tombé", Vf.rond(q[0], q[1], r_ * 0.85)))
    faits = 0
    for essai in range(700):
        if faits >= (14 if leger else 32):
            break
        x, y = vers(rng.random() * 360, 0.3 + rng.random() * 3.0)
        if not libre(x, y, 0.08) or terrain(x, y) < 0.3 or not loin_des_sentiers(x + 0.2, y, 0.26):
            continue
        Vt.herbes(L, rng, x, y, sol(x, y), 4 if leger else 5)
        faits += 1
    for k in range(5 if leger else 10):  # l'herbe du plateau, le long du parapet
        th = rng.random() * 2 * PI
        q = au_roc(th, ZT, -0.3 - rng.random() * 0.25)
        if math.hypot(q[0] - PHARE[0], q[1] - PHARE[1]) < 1.45 or min(K.distance_au_trajet(q[0], q[1], p) for p in PISTES_HAUT[:2]) < 0.2 or any(Vf.penetration(Vf.rond(q[0], q[1], 0.1), p) > 0 for g_, _, p in SOL if g_ == "decor"):
            continue
        Vt.herbes(L, rng, q[0], q[1], ZT, 4)
    for k, (x, y, cap, broute) in enumerate(((-4.35, -3.25, 0.5, True), (-3.75, -3.95, 2.4, False), (-2.25, -3.95, -0.6, True))[:2 if leger else 3]):
        if libre(x, y, 0.12):
            Vt.mouton(L, rng, x, y, sol(x, y), cap, broute)
            SOL.append(("passant", "un mouton", Vf.rond(x, y, 0.1)))

    etape("les habitants")
    # --- les habitants (immobiles) ---
    def poser(x, y, zz=None, cap=None, **plus):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz, **plus)
        SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))

    qg = au_roc(math.radians(238), ZT, -0.42)  # le guetteur du plateau, la main en visière, tourné vers le large
    poser(qg[0], qg[1], ZT, math.radians(238), leve=1)
    q = coin(0.1, 0.05)
    poser(q[0], q[1], sol(*q), CAP_JARDIN + 2.0)  # au potager
    q = pa + dp * (lg * 0.36) - cote_p * 0.2
    poser(q[0], q[1], ZQ + 0.02, cap_j + PI / 2 + 0.3)  # sur la jetée, devant les caisses
    q = (MAISON[0] + fd[0] * 0.72 - um[0] * 0.43, MAISON[1] + fd[1] * 0.72 - um[1] * 0.43)
    poser(q[0], q[1], Z_MAISON, CAP_MAISON - PI / 2)  # devant le banc
    if not leger:
        poser(-3.3, -3.8, None, 1.1)  # le berger
        q = np.array(HANGAR) + uh * 1.0 - nh * 0.55
        poser(q[0], q[1], None, CAP_HANGAR + 0.4)  # à la cale

    etape("la vie")
    # --- la vie : ceux qui marchent, la fumée, les oiseaux, la brume, le faisceau du phare ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        if rond:
            extras["boucle"] = True
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    Ra = N.Maille("rameur")  # le pêcheur qui fait le tour de ses casiers, à la rame
    P.barque(Ra, rng, 0, 0, 0.0, 0.9)
    P.passant(Ra, rng, -0.08, 0, angle=0.0, z=0.0)
    for s_ in (-1, 1):
        Ra.ajouter(*N.poutre((0.02, s_ * 0.12, 0.13), (0.1, s_ * 0.5, 0.0), 0.022), "planches_claires")
    Bo = N.Maille("bouees")  # ses bouées : un flotteur de liège peint, une perche, un bout de chiffon
    for k, (dx, dy, mat) in enumerate(((0.0, 0.0, "peint_rouge"), (-0.2, 0.42, "peint_bleu"), (0.14, -0.4, "peint_rouge"))[:2 if leger else 3]):
        Bo.ajouter(*N.cylindre(0.05, 0.035, 0.07, 6, haut=True), mat, T(dx, dy, -0.02))
        Bo.ajouter(*N.poutre((dx, dy, 0.04), (dx + 0.02, dy, 0.3), 0.012), "planches_sombres")
        A.toile(Bo, [(dx + 0.02, dy, 0.3), (dx + 0.02, dy, 0.22), (dx + 0.13, dy + 0.02, 0.25)], [(0, 1, 2)], "drap", ep=0.006)
    lots["animes"].append((Bo, (BOUEES[0], BOUEES[1], 0.0), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 2.6}))
    lots["animes"].append((Ra, (*TOUR_RAMEUR[0], 0.075), {"anim": "marche", "chemin": [float(c) for x, y in TOUR_RAMEUR for c in (x, y, 0.075)], "boucle": 1, "vitesse": 0.3, "saut": 0.0, "roulis": 0.05, "phase": 0.2}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in cheminees[:1] for c in p], "grosseur": 0.5, "cap": 0.0, "force": 0.7}))
    lots["reperes"].append((coeur, {"anim": "phare", "vitesse": VITESSE_OPTIQUE, "portee": 17.0, "nuit": 1}))
    lots["reperes"].append(((PHARE[0], PHARE[1], ZT + H_GAL + 1.9), {"anim": "oiseaux", "nb": 4 if leger else 6, "rayon": 2.7, "envergure": 0.2}))
    e = ECUEILS[0]
    lots["reperes"].append(((e[0] + e[4], e[1] + e[5], e[3] + 0.9), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 1.7, "envergure": 0.17}))
    lots["reperes"].append(((ROC[0], ROC[1], 0.0), {"anim": "brume", "rayon": 8.4, "nb": 5 if leger else 9, "haut": 0.5}))  # (au cœur du Rocher : deux écharpes s'y accrochent)
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.5, "genre": 2}))

    etape("sur l'eau")
    # --- sur l'eau (dessiné par le site) : le ressac autour de l'île et de chaque écueil, l'ombre de la jetée et des coques ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    for tour in flots:
        cx_, cy_ = sum(p[0] for p in tour) / len(tour), sum(p[1] for p in tour) / len(tour)
        tour = tour + tour[:1]
        K.bande(Rv, [(cx_ + (x - cx_) * 0.97, cy_ + (y - cy_) * 0.97) for x, y in tour], [(x + (x - cx_) / math.hypot(x - cx_, y - cy_) * 0.5, y + (y - cy_) / math.hypot(x - cx_, y - cy_) * 0.5) for x, y in tour], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.35)), lg - 0.8, 0.8, cap_j)
    K.tache(Rv, cb[0], cb[1], 2.3, 0.76, cap_j, rond=True, marge=0.2)
    K.tache(Rv, bq[0], bq[1], 0.78, 0.3, cap_j + 0.12, rond=True, marge=0.16)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("phare-v5", (1.0, -30.5, 17.5), (0.3, -0.2, 2.7), 50), ("phare-v5-escalier", (-5.5, -10.5, 6.0), (0.2, 0.2, 2.6), 55)] if rendu else []
    return K.construire("ile-phare-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="phare")
