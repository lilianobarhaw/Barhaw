# L'Île Tonnerre, « niveau 5 » : une île de basalte noir où l'orage ne s'arrête jamais. Tout est inventé.
# (Son histoire, dans le bot : « L'orage ne s'arrête jamais ici. Chaque éclair montre un bout du chemin vers le trésor. »)
# Le Pic Foudroyé : des orgues de basalte (des colonnes à six pans, de toutes les hauteurs, fendues par la foudre) et, tout
# en haut, le Grand Paratonnerre : un mât de fer, sa couronne de pointes de cuivre, ses chaînes, et le gros câble de cuivre
# qui descend jusqu'à la Forge de foudre. Les Foudriers y mettent les éclairs en bocaux : les grands bocaux cerclés de
# cuivre luisent devant la forge, les petits sèchent sur leur râtelier. Sur la place, la Table des Éclairs : une dalle où
# la route du trésor est gravée, et dont les traits ne s'allument qu'un instant. À l'ouest, le hameau : des maisons basses
# aux toits d'ardoise, chacune avec son paratonnerre. Au fond de la baie, la jetée et le caboteur ; sur la grève de sable
# noir, des fulgurites (le sable que la foudre a changé en verre). Des arbres foudroyés, des orgues le long du rivage et
# en mer, une épave brûlée qui fume encore. La vie : les Foudriers qui vont et viennent, le guetteur, le cerf-volant de fer
# au bout de sa chaîne, les lanternes de tempête, la fumée ; et, sur le site, l'orage (effet « foudre » : les nuages, la
# pluie, les éclairs qui tombent sur le paratonnerre).
# Les orgues tiennent sur une seule grille d'hexagones (PAS) pour toute l'île : le sol peint dessine les mêmes hexagones
# au même endroit, si bien que la chaussée peinte et les colonnes en relief se raccordent.
# Sorties : ile-tonnerre-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_vents_v5 as Vt
import barhaw_ambre_v5 as Am
import barhaw_phare_v5 as Ph

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
_ecart, _local, _fentes, _tirage = Ph._ecart, Ph._local, Ph._fentes, Ph._tirage

R_SOL = 9.6
PIC = (0.3, 1.75)  # le cœur du Pic Foudroyé
R_PIC, H_PIC = 2.35, 5.2
VIGIE = (PIC[0] - 1.15, PIC[1] - 1.05)  # une terrasse à mi-hauteur, au sud-ouest du Pic
Z_VIGIE = 2.3
PLACE = (0.2, -1.25)  # la place, au pied du Pic : la Table des Éclairs
FORGE = (3.5, -0.45)  # la Forge de foudre
R_FORGE, H_FORGE = 0.62, 1.2
MAISONS = [  # (x, y, cap, lx, ly, cheminées, appentis) ; la façade regarde vers cap - 90°
    (-3.45, 0.2, math.radians(-12), 1.5, 1.0, 2, True),
    (-3.9, -1.75, math.radians(20), 1.15, 0.85, 1, False),
    (-1.95, -1.9, math.radians(-25), 1.1, 0.8, 1, False),
]
RATELIER, CAP_RATELIER = (3.6, -2.55), math.radians(10)
PAS = 0.38  # d'un plat à l'autre d'une colonne de basalte
RH, DY = PAS / math.sqrt(3), PAS * math.sqrt(3) / 2
ORGUES_MER = [  # (x, y, rayon, hauteur) : les orgues qui sortent de la mer
    (-5.9, -4.6, 0.78, 3.4), (-4.9, -5.9, 0.5, 1.6), (4.6, -5.6, 0.7, 2.6), (5.6, -4.9, 0.45, 1.3), (7.0, 0.6, 0.82, 3.8), (6.6, 2.0, 0.5, 1.9),
    (-6.9, 1.2, 0.7, 2.8), (-6.4, 2.7, 0.45, 1.5), (-2.0, 6.9, 0.7, 3.0), (2.6, 6.6, 0.55, 2.0), (0.8, 7.6, 0.42, 1.2), (6.5, -3.0, 0.5, 1.0),
]
EPAVE = (5.75, -3.75)


def rivage(th):
    """Le rayon de la côte : une île ronde, ouverte au sud par une baie (le mouillage), entre deux bras de roche."""
    return (5.3 + 0.35 * math.sin(2 * th + 0.9) + 0.22 * math.sin(3 * th + 2.1) + 0.12 * math.sin(5 * th + 0.5)
            - 2.0 * math.exp(-((_ecart(th, math.radians(-90)) / 0.5) ** 2))
            + 0.55 * math.exp(-((_ecart(th, math.radians(-128)) / 0.2) ** 2))
            + 0.6 * math.exp(-((_ecart(th, math.radians(-52)) / 0.2) ** 2)))


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


def profil_pic(x, y):
    """La hauteur du Pic à cet endroit (0 : hors du Pic) : des flancs raides, un sommet presque plat."""
    d = math.hypot(x - PIC[0], y - PIC[1])
    th = math.atan2(y - PIC[1], x - PIC[0])
    t = d / (R_PIC * (1 + 0.12 * math.sin(3 * th + 0.4) + 0.08 * math.sin(5 * th + 1.7)))
    return 0.0 if t >= 1 else H_PIC * (1 - t ** 2.2) ** 0.9


def terrain_brut(x, y):
    d = bord(x, y)
    if d < 0:
        return max(-0.9, d * 0.9)
    h = 0.5 * (1 - math.exp(-d / 0.22)) * (0.6 + 0.8 * K.bruit2(x * 0.9 + 3.0, y * 0.9, 31)) + 0.45 * K.lisse(0.5, 2.2, d)
    h += (K.bruit2(x * 1.2, y * 1.2, 37) - 0.5) * 0.3 * K.lisse(0.3, 1.4, d) + (K.bruit2(x * 3.1, y * 3.1, 39) - 0.5) * 0.07 * K.lisse(0.3, 1.0, d)
    h += 0.75 * K.lisse(R_PIC + 1.5, R_PIC - 0.3, math.hypot(x - PIC[0], y - PIC[1]))  # le socle du Pic
    h -= 0.3 * math.exp(-((x - 0.0) ** 2 + (y + 2.6) ** 2) / 1.6) * K.lisse(0.1, 0.6, d)  # la grève, au fond de la baie
    return h


PLATS = []  # (x, y, rayon plat, rayon du raccord, hauteur) : les terrasses


def _plat(x, y, r0, r1, plus=0.0):
    z = float(np.mean([terrain_brut(x + math.cos(a) * r, y + math.sin(a) * r) for r in (0.0, r0 * 0.5, r0) for a in np.linspace(0, 2 * PI, 10, endpoint=False)])) + plus
    PLATS.append((x, y, r0, r1, z))
    return z


Z_HAMEAU = 0.8  # le hameau tient sur un seul replat : ses terrasses se touchent
Z_MAISONS = [Z_HAMEAU for m in MAISONS]
PLATS.extend((m[0], m[1], max(m[3], m[4]) * 0.72 + 0.35, max(m[3], m[4]) * 0.72 + 1.15, Z_HAMEAU) for m in MAISONS)
Z_PLACE = 0.66
PLATS.append((PLACE[0], PLACE[1], 0.8, 1.5, Z_PLACE))
Z_FORGE = _plat(FORGE[0], FORGE[1], 1.15, 1.9, 0.05)
Z_RATELIER = _plat(RATELIER[0], RATELIER[1], 0.6, 1.1)
ZQ = 0.44  # le dessus de la jetée
JETEE_A, JETEE_B = np.array(vers(-90, 0.5)), np.array(vers(-90, -1.75))  # du fond de la baie vers le large
PLATS.append((float(JETEE_A[0]), float(JETEE_A[1]), 0.4, 0.9, ZQ - 0.015))


def terrain(x, y):
    """La hauteur du terrain (sans les orgues, qui sont posées dessus)."""
    h = terrain_brut(x, y)
    if h <= 0:
        return h
    for cx, cy, r0, r1, z in PLATS:
        t = K.lisse(r1, r0, math.hypot(x - cx, y - cy))
        if t > 0:
            h += (z - h) * t
    return h


sol = terrain  # là où l'on marche


# --- les orgues de basalte : une seule grille d'hexagones (pointe en haut) pour toute l'île ---
def centre(i, j):
    return PAS * (i + 0.5 * (j % 2)), DY * j


def cellule(x, y):
    """L'hexagone de la grille où tombe ce point."""
    j0 = math.floor(y / DY)
    mieux = None
    for j in (j0, j0 + 1):
        i = round(x / PAS - 0.5 * (j % 2))
        c = centre(i, j)
        d = (x - c[0]) ** 2 + (y - c[1]) ** 2
        if mieux is None or d < mieux[0]:
            mieux = (d, i, j)
    return mieux[1], mieux[2]


def voisine(i, j, k):
    """La cellule de l'autre côté de l'arête k (de son sommet k à son sommet k + 1 ; les sommets sont à 30° + 60° k)."""
    d = j % 2
    return ((i + d, j + 1), (i - 1 + d, j + 1), (i - 1, j), (i - 1 + d, j - 1), (i + d, j - 1), (i + 1, j))[k]


def hasard_cellule(i, j, graine=0):
    """Un nombre entre 0 et 1, toujours le même pour cette cellule."""
    n = ((i * 73856093) ^ (j * 19349663) ^ (graine * 83492791)) & 0xffffffff
    n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffff) / 65536.0


def _autour(x, y, r):
    i0, j0 = cellule(x, y)
    n = int(r / DY) + 2
    for j in range(j0 - n, j0 + n + 1):
        for i in range(i0 - n, i0 + n + 1):
            c = centre(i, j)
            if math.hypot(c[0] - x, c[1] - y) < r:
                yield i, j, c


ORGUE = {}  # (i, j) → la hauteur du dessus de la colonne
RIVAGE_ORGUES = []  # (x, y, rayon, hauteur) : les orgues du rivage


def _planter():
    """Toutes les colonnes de l'île : le Pic (son sommet plat, la terrasse de la Vigie, la faille), les orgues en mer,
    celles du rivage."""
    ORGUE.clear()
    RIVAGE_ORGUES.clear()
    ca, sa = math.cos(math.radians(105)), math.sin(math.radians(105))  # la faille traverse le Pic, à peu près du sud au nord
    for i, j, c in _autour(PIC[0], PIC[1], R_PIC * 1.25):
        h = profil_pic(*c)
        if h <= 0:
            continue
        d = math.hypot(c[0] - PIC[0], c[1] - PIC[1])
        h += (hasard_cellule(i, j, 1) - 0.5) * 0.7 * min(1.0, h / 1.5) * K.lisse(0.3, 0.9, d)
        travers = abs(-(c[0] - PIC[0]) * sa + (c[1] - PIC[1]) * ca)
        if travers < 0.17 and d > 0.55 and (c[0] - PIC[0]) * ca + (c[1] - PIC[1]) * sa < 0:  # la faille, sur le flanc sud
            h *= 0.42
        if d < 0.5:
            h = H_PIC
        if math.hypot(c[0] - VIGIE[0], c[1] - VIGIE[1]) < 0.62:
            h = Z_VIGIE
        if h > terrain(*c) + 0.3:
            ORGUE[(i, j)] = h
    for x, y, r, hm in ORGUES_MER:
        for i, j, c in _autour(x, y, r):
            d = math.hypot(c[0] - x, c[1] - y) / r
            h = hm * (1 - 0.6 * d * d) + (hasard_cellule(i, j, 2) - 0.5) * 0.5 * hm * 0.4
            if h > 0.3:
                ORGUE[(i, j)] = max(ORGUE.get((i, j), 0.0), h)
    hasard = random.Random(77)
    essais = 0
    while len(RIVAGE_ORGUES) < 13 and essais < 400:
        essais += 1
        ang = hasard.random() * 360
        if abs(_ecart(math.radians(ang), math.radians(-90))) < 0.62:  # pas dans la baie
            continue
        x, y = vers(ang, -0.2 + hasard.random() * 0.5)
        r, hm = 0.42 + hasard.random() * 0.3, 0.6 + hasard.random() * 0.9
        if any(math.hypot(x - q[0], y - q[1]) < r + q[2] + 0.5 for q in RIVAGE_ORGUES) or any(math.hypot(x - m[0], y - m[1]) < 1.6 for m in MAISONS) or math.hypot(x - FORGE[0], y - FORGE[1]) < 2.0 or math.hypot(x - RATELIER[0], y - RATELIER[1]) < 1.5:
            continue
        RIVAGE_ORGUES.append((x, y, r, hm))
        for i, j, c in _autour(x, y, r):
            d = math.hypot(c[0] - x, c[1] - y) / r
            h = max(0.0, terrain(*c)) + hm * (1 - 0.6 * d * d) + (hasard_cellule(i, j, 3) - 0.5) * 0.4
            if h > max(0.0, terrain(*c)) + 0.25:
                ORGUE[(i, j)] = max(ORGUE.get((i, j), 0.0), h)


_planter()


def orgues(L, leger=False):
    """Toutes les colonnes : le dessus (un hexagone, peint par le sol : mêmes hexagones au même endroit) et les pans qui
    dépassent des voisines (ou du terrain). Renvoie le nombre de colonnes."""
    taille = N.MATIERES["basalte"]["taille"]
    coins = [(RH * math.cos(math.radians(30 + 60 * k)), RH * math.sin(math.radians(30 + 60 * k))) for k in range(6)]
    for (i, j), h in ORGUE.items():
        cx, cy = centre(i, j)
        haut = [(cx + x, cy + y, h) for x, y in coins]
        L.ajouter(haut, [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 5)], "sol_tonnerre", uv=[((x + R_SOL) / (2 * R_SOL), (y + R_SOL) / (2 * R_SOL)) for x, y, _ in haut])
        u0 = hasard_cellule(i, j, 5) * 7.0
        t = hasard_cellule(i, j, 9)
        mat = BASALTES[0 if t < 0.5 else 1 if t < 0.74 else 2]
        for k in range(6):
            a, b = haut[k], haut[(k + 1) % 6]
            hv = ORGUE.get(voisine(i, j, k))
            bas = hv if hv is not None else min(terrain((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), terrain(cx, cy)) - 0.3
            bas = max(bas, -0.45)
            if bas > h - 0.03:
                continue
            ua, ub = u0 + k * RH, u0 + (k + 1) * RH
            L.ajouter([(a[0], a[1], bas), (b[0], b[1], bas), b, a], [(0, 1, 2, 3)], mat, uv=[(ua / taille, bas / taille), (ub / taille, bas / taille), (ub / taille, h / taille), (ua / taille, h / taille)])
    return len(ORGUE)


def hauteur_orgue(x, y):
    """Le dessus de la colonne qui se trouve là (None : pas de colonne)."""
    return ORGUE.get(cellule(x, y))


# --- les matières ---
def tx_basalte(graine=1, taille=512, c1=0x626772, c2=0x878b93, rouille=0.5):
    """Le flanc d'une colonne de basalte : gris bleuté, des fils verticaux (la roche s'est fendue en long), de rares
    cassures en travers, courtes et jamais à la même hauteur, des traînées de rouille, des coulures de pluie, des croûtes
    de lichen (jaune, gris clair)."""
    n = taille
    x, y = N.grille(n)
    rng = np.random.default_rng(graine)
    gros, grain, fin = N.bruit(n, 2, 3, graine + 1, 3), N.bruit(n, 64, 64, graine + 2, 2), N.bruit(n, 160, 160, graine + 3, 1)
    fil, bande = N.bruit(n, 110, 3, graine + 4, 2), N.bruit(n, 30, 2, graine + 14, 2)
    coul = N.mel(N.hexa(c1), N.hexa(c2), np.clip(0.1 + 0.8 * gros, 0, 1)) * (0.9 + 0.14 * (grain - 0.5) + 0.1 * (fin - 0.5) + 0.24 * (fil - 0.5) + 0.2 * (bande - 0.5))[..., None]
    roux = N.lisse(0.56, 0.72, N.bruit(n, 38, 3, graine + 5, 3)) * N.lisse(0.4, 0.62, N.bruit(n, 5, 6, graine + 6, 3))
    coul = N.mel(coul, N.mel(N.hexa(0x7d553a), N.hexa(0x9d7046), fin), roux * 0.5 * rouille)
    casse = np.zeros((n, n), np.float32)
    rebord = np.zeros((n, n), np.float32)
    for k, hk in enumerate(np.sort(rng.uniform(0, 1, 8))):
        ondule = (N.bruit(n, 9, 1, graine + 20 + k, 2) - 0.5) * 0.03
        present = N.lisse(0.54, 0.6, N.bruit(n, 6, 2, graine + 40 + k, 2))  # un trait court : un tiers de la largeur
        d = ((y - hk - ondule) % 1.0)
        d = np.minimum(d, 1 - d)
        casse = np.maximum(casse, N.lisse(0.0055, 0.0012, d) * present)
        rebord = np.maximum(rebord, N.lisse(0.016, 0.005, (hk + ondule - y) % 1.0) * present)
    coul = N.mel(coul, N.hexa(0xa9acb0), rebord * 0.22)  # sous la cassure, l'arête ébréchée prend la lumière
    coul *= (1 - 0.55 * casse)[..., None]
    coulee = N.lisse(0.66, 0.82, N.bruit(n, 70, 1, graine + 7, 2)) * N.lisse(0.45, 0.7, N.bruit(n, 4, 5, graine + 8, 3))
    coul = N.mel(coul, N.hexa(0x3b3f48), coulee * 0.36)
    coul = N.mel(coul, N.mel(N.hexa(0xa99f48), N.hexa(0xc7bf66), fin), N.lisse(0.77, 0.84, N.bruit(n, 22, 22, graine + 9, 3)) * 0.55)
    coul = N.mel(coul, N.hexa(0xb4b7b0) * (0.9 + 0.2 * (grain - 0.5))[..., None], N.lisse(0.74, 0.8, N.bruit(n, 15, 15, graine + 10, 3)) * 0.34)
    relief = np.clip(0.55 - 0.5 * casse + 0.22 * (fil - 0.5) + 0.14 * (grain - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


BASALTES = ("basalte", "basalte_roux", "basalte_nuit")
N.matiere("basalte", tx_basalte, 2.0, 0.9, 0.62, graine=801)
N.matiere("basalte_roux", tx_basalte, 2.0, 0.9, 0.62, graine=811, c1=0x6c6661, c2=0x90877e, rouille=1.0)
N.matiere("basalte_nuit", tx_basalte, 2.0, 0.9, 0.58, graine=821, c1=0x555b69, c2=0x777d8b, rouille=0.25)
N.matiere("verre_eclair", N.tx_uni, 0.5, 0.2, 0.25, c=0x8fd6e6)


def _hexagones(X, Y):
    """Pour chaque pixel : la distance au joint de son hexagone (en unités du monde) et un tirage par hexagone."""
    best_d = np.full(X.shape, 9.0, np.float32)
    bi = np.zeros(X.shape, np.int32)
    bj = np.zeros(X.shape, np.int32)
    j0 = np.floor(Y / DY).astype(np.int32)
    for dj in (0, 1):
        j = j0 + dj
        i = np.rint(X / PAS - 0.5 * (j % 2)).astype(np.int32)
        dx, dy = X - PAS * (i + 0.5 * (j % 2)), Y - DY * j
        d = dx * dx + dy * dy
        pres = d < best_d
        best_d = np.where(pres, d, best_d)
        bi, bj = np.where(pres, i, bi), np.where(pres, j, bj)
    dx, dy = np.abs(X - PAS * (bi + 0.5 * (bj % 2))), np.abs(Y - DY * bj)
    joint = PAS / 2 - np.maximum(dx, 0.5 * dx + 0.8660254 * dy)
    n = ((bi.astype(np.int64) * 73856093) ^ (bj.astype(np.int64) * 19349663)) & 0xffffffff
    n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
    return joint.astype(np.float32), (((n ^ (n >> 16)) & 0xffff) / 65536.0).astype(np.float32), bi, bj


def _colonnes(bi, bj):
    """Pour chaque pixel : y a-t-il une colonne dans son hexagone ?"""
    if not ORGUE:
        return np.zeros(bi.shape, np.float32)
    cles = np.array(list(ORGUE.keys()))
    i0, j0 = cles[:, 0].min(), cles[:, 1].min()
    occ = np.zeros((cles[:, 0].max() - i0 + 1, cles[:, 1].max() - j0 + 1), bool)
    occ[cles[:, 0] - i0, cles[:, 1] - j0] = True
    ii, jj = bi - i0, bj - j0
    dans = (ii >= 0) & (ii < occ.shape[0]) & (jj >= 0) & (jj < occ.shape[1])
    return (dans & occ[np.clip(ii, 0, occ.shape[0] - 1), np.clip(jj, 0, occ.shape[1] - 1)]).astype(np.float32)


PISTES = []  # les sentiers (remplis par mailles()), pour les peindre


def tx_sol_tonnerre(taille=2048, graine=271):
    """Le sol peint pixel par pixel. Le basalte nu : la chaussée d'hexagones (les mêmes que les colonnes en relief), chaque
    dalle de son gris, des flaques de pluie, des lichens jaunes ; le sable noir de la grève et des creux, strié par l'eau ;
    la lande rase et sombre (bruyère, mousse) sur les replats ; les sentiers de gravier clair ; l'estran et ses algues ;
    le sommet du Pic brûlé par la foudre."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 200), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    pic = K.agrandir(K.champ(profil_pic, R_SOL, 240), n)
    xs = (np.arange(n) + 0.5) / n * 2 * R_SOL - R_SOL
    X, Y = np.meshgrid(xs, xs)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    peigne, meches = N.bruit(n, 30, 560, graine + 5, 2), N.bruit(n, 9, 150, graine + 6, 2)
    gy, gx = np.gradient(h, 2 * R_SOL / n)
    pente = np.hypot(gx, gy)
    joint, ton, bi, bj = _hexagones(X, Y)
    col = _colonnes(bi, bj)
    # la chaussée d'hexagones : le dessus des colonnes, et le rocher plat du bas de l'île ; ailleurs, la roche fendue
    pave = np.maximum(col, N.lisse(0.5, 0.26, pente) * N.lisse(1.5, 1.22, h))
    dalle = N.mel(N.hexa(0x666b76), N.hexa(0x8f9197), np.clip(-0.05 + 0.8 * ton + 0.35 * b1, 0, 1)) * (0.92 + 0.2 * (b3 - 0.5) + 0.12 * (fin - 0.5) + 0.12 * (grain - 0.5))[..., None]
    dalle = N.mel(dalle, N.hexa(0x86705c) * (0.9 + 0.3 * (b3 - 0.5))[..., None], N.lisse(0.72, 0.9, (ton * 7.31) % 1.0) * 0.4)  # des dalles rousses
    dalle *= (0.78 + 0.22 * N.lisse(0.0, 0.07, joint))[..., None]  # le bord de chaque dalle, usé et plus sombre
    dalle = N.mel(dalle, N.hexa(0x2f3138), N.lisse(0.014, 0.004, joint) * 0.85)  # le joint
    flaque = N.lisse(0.6, 0.68, N.bruit(n, 46, 46, graine + 7, 3)) * N.lisse(0.05, 0.1, joint) * N.lisse(0.5, 0.2, pente) * (1 - col)
    dalle = N.mel(dalle, N.mel(N.hexa(0x4d5f78), N.hexa(0x8fa6bf), N.bruit(n, 120, 120, graine + 8, 2)), flaque * 0.75)  # les flaques : le ciel d'orage dedans
    dalle = N.mel(dalle, N.mel(N.hexa(0xb39b3c), N.hexa(0xcdbb5c), fin) * (0.85 + 0.3 * (grain - 0.5))[..., None], N.lisse(0.66, 0.73, N.bruit(n, 130, 130, graine + 9, 3)) * N.lisse(0.3, 0.6, h) * 0.6)  # le lichen jaune
    brule = N.lisse(H_PIC - 1.3, H_PIC - 0.1, pic + (b2 - 0.5) * 0.8)  # le sommet, noirci
    dalle = N.mel(dalle, N.hexa(0x25262b) * (0.8 + 0.5 * b3)[..., None], brule * 0.8)
    df, idf = _fentes(n, 56, 56, graine + 30, 0.35)  # la roche des pentes : fendue en blocs
    dc, idc = _fentes(n, 190, 190, graine + 31, 0.3)  # des cailloux dans les creux
    roche = N.mel(N.hexa(0x595d67), N.hexa(0x858890), np.clip(0.1 + 0.55 * _tirage(graine + 32, idf, 56 * 56) + 0.45 * b2, 0, 1)) * (0.9 + 0.24 * (b3 - 0.5) + 0.14 * (fin - 0.5) + 0.14 * (grain - 0.5))[..., None]
    roche = N.mel(roche, N.hexa(0x7d5a40), N.lisse(0.62, 0.78, N.bruit(n, 40, 40, graine + 33, 3)) * 0.3)  # de la rouille
    roche = N.mel(roche, N.hexa(0x2a2c33), N.lisse(0.055, 0.0, df) * 0.8)
    caillou = N.lisse(0.5, 0.62, N.bruit(n, 24, 24, graine + 34, 3)) * N.lisse(0.0, 0.1, dc)
    roche = N.mel(roche, N.mel(N.hexa(0x77797f), N.hexa(0xa3a4a6), _tirage(graine + 35, idc, 190 * 190))[...] * (0.85 + 0.3 * N.lisse(0.0, 0.3, dc))[..., None], caillou * 0.8)
    coul = N.mel(roche, dalle, pave)
    hz = h + (b2 - 0.5) * 0.1 + (b3 - 0.5) * 0.05
    coul = N.mel(coul, N.hexa(0x1d1f24) * (0.8 + 0.45 * b3)[..., None], N.lisse(0.2, 0.05, hz) * (pic < 0.2) * (1 - col) * 0.85)  # l'estran
    algue = N.lisse(0.5, 0.64, N.bruit(n, 70, 70, graine + 17, 2)) * N.lisse(0.13, 0.02, hz) * N.lisse(-0.14, -0.02, hz) * (1 - col)
    coul = N.mel(coul, N.mel(N.hexa(0x33491f), N.hexa(0x5a5a22), b3), algue * 0.8)
    sable = N.mel(N.hexa(0x3a3b42), N.hexa(0x5b5c63), b3) * (0.9 + 0.3 * (grain - 0.5) + 0.25 * (N.bruit(n, 12, 240, graine + 10, 2) - 0.5))[..., None]
    sable = N.mel(sable, N.hexa(0x9a9ca3), (N.bruit(n, 700, 700, graine + 11, 1) > 0.86) * 0.5)  # des grains qui brillent
    greve = N.lisse(1.9, 1.1, np.hypot(X - 0.0, Y + 2.6) + (b2 - 0.5) * 0.5) * N.lisse(-0.2, 0.0, h) * N.lisse(0.75, 0.5, h)
    creux = N.lisse(0.4, 0.33, b1 + 0.2 * (b2 - 0.5)) * N.lisse(0.5, 0.25, pente) * N.lisse(0.25, 0.45, h) * (pic < 0.2)
    m_sable = np.clip(greve + creux * 0.8, 0, 1) * (1 - col)
    coul = N.mel(coul, sable, m_sable * 0.95)
    lande = N.hexa(0x66783f) * (0.82 + 0.3 * (b2 - 0.5) + 0.3 * (peigne - 0.5) + 0.2 * (meches - 0.5) + 0.14 * (grain - 0.5))[..., None]
    lande = N.mel(lande, N.hexa(0x9c9a55) * (0.85 + 0.3 * (peigne - 0.5))[..., None], N.lisse(0.45, 0.75, b1 * 0.5 + b2 * 0.5) * 0.6)
    lande = N.mel(lande, N.mel(N.hexa(0x6f4a7c), N.hexa(0x9a6f9c), fin) * (0.8 + 0.4 * (grain - 0.5))[..., None], N.lisse(0.6, 0.72, N.bruit(n, 18, 18, graine + 12, 3)) * (0.3 + 0.6 * N.lisse(0.42, 0.56, N.bruit(n, 200, 200, graine + 13, 2))))
    m_l = N.lisse(0.44, 0.54, N.bruit(n, 11, 11, graine + 14, 4) + 0.12 * (b3 - 0.5)) * N.lisse(0.32, 0.5, h) * N.lisse(0.6, 0.35, pente) * (pic < 0.2) * (1 - m_sable) * N.lisse(0.22, 0.45, piste)
    m_l = np.maximum(m_l, N.lisse(0.03, 0.0, joint) * pave * N.lisse(0.3, 0.5, h) * (pic < 0.2) * (1 - m_sable) * 0.55 * N.lisse(0.4, 0.6, b2))  # la mousse dans les joints
    m_l = np.maximum(m_l, N.lisse(0.55, 0.68, N.bruit(n, 17, 17, graine + 36, 4)) * (1 - pave) * N.lisse(0.9, 0.5, pente) * N.lisse(0.3, 0.5, h) * (1 - m_sable) * 0.9)  # des touffes sur la roche des pentes
    coul = N.mel(coul, lande, m_l * 0.95)
    gravier = N.mel(N.hexa(0x8a857c), N.hexa(0xaaa397), b3) * (0.9 + 0.22 * (fin - 0.5) + 0.2 * (grain - 0.5))[..., None]
    gravier = N.mel(gravier, N.hexa(0x55575d), (N.bruit(n, 420, 420, graine + 15, 1) > 0.7) * 0.5)
    m_p = N.lisse(0.2, 0.09, piste + (b2 - 0.5) * 0.1 + (b3 - 0.5) * 0.06) * N.lisse(0.2, 0.34, h) * (1 - col)
    coul = N.mel(coul, gravier, m_p * 0.88)
    relief = np.clip(0.5 + 0.3 * (b3 - 0.5) + 0.2 * (fin - 0.5) - 0.35 * N.lisse(0.02, 0.0, joint) * pave * (1 - m_l) * (1 - m_sable) - 0.35 * N.lisse(0.05, 0.0, df) * (1 - pave) * (1 - m_l), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_tonnerre", tx_sol_tonnerre, 2 * R_SOL, 0.5, 0.9)


# --- les pièces ---
def arbre_foudroye(L, rng, x, y, z, h=1.3, cap=0.0):
    """Un arbre que la foudre a fendu : un tronc noirci, ouvert en deux, des moignons de branches, pas une feuille."""
    penche = (math.cos(cap) * 0.12 * h, math.sin(cap) * 0.12 * h)
    pts = [(x, y, z - 0.05), (x + penche[0] * 0.3, y + penche[1] * 0.3, z + h * 0.45), (x + penche[0], y + penche[1], z + h * 0.8)]
    L.ajouter(*N.tube(pts, [0.085 * h, 0.06 * h, 0.035 * h], 6), "bois_epave_sombre")
    haut = pts[-1]
    for k in range(3):
        a = cap + k * 2.2 + rng.random() * 0.6
        lg = h * (0.22 + 0.18 * rng.random())
        b = (haut[0] + math.cos(a) * lg * 0.7, haut[1] + math.sin(a) * lg * 0.7, haut[2] + lg * (0.5 + 0.5 * rng.random()))
        L.ajouter(*N.tube([haut, ((haut[0] + b[0]) / 2 + 0.03, (haut[1] + b[1]) / 2, (haut[2] + b[2]) / 2 + lg * 0.12), b], [0.03 * h, 0.02 * h, 0.006 * h], 4), "cendre" if k == 0 else "bois_epave_sombre")
    mi = pts[1]
    a = cap + 1.4
    L.ajouter(*N.tube([mi, (mi[0] + math.cos(a) * h * 0.2, mi[1] + math.sin(a) * h * 0.2, mi[2] + h * 0.1), (mi[0] + math.cos(a) * h * 0.33, mi[1] + math.sin(a) * h * 0.33, mi[2] + h * 0.24)], [0.03 * h, 0.018 * h, 0.006 * h], 4), "bois_epave_sombre")


def bocal(L, U, x, y, z, h=0.55, r=0.17, socle=True):
    """Un bocal à éclairs : sur son socle de pierre, une cage de cuivre (des cercles, des montants, un couvercle à pointe) et,
    dedans, l'éclair qui luit (jour et nuit)."""
    z0 = z
    if socle:
        L.ajouter(*N.cylindre(r * 1.15, r * 1.05, 0.14, 8, haut=True), "pierres_sombres", T(x, y, z - 0.02))
        z0 = z + 0.12
    U.ajouter(*N.sphere(r * 0.72, 8, 6, h / (2 * r * 0.72) * 0.82), "astre", T(x, y, z0 + h * 0.5))
    for t in (0.04, 0.5, 0.96):
        L.ajouter(*N.cylindre(r * (0.98 if t != 0.5 else 1.04), r * (0.98 if t != 0.5 else 1.04), 0.035, 8, haut=True, bas=True), "cuivre", T(x, y, z0 + h * t - 0.017))
    for k in range(4):
        a = k * PI / 2 + 0.4
        L.ajouter(*N.poutre((x + math.cos(a) * r, y + math.sin(a) * r, z0), (x + math.cos(a) * r, y + math.sin(a) * r, z0 + h), 0.02), "cuivre")
    L.ajouter(*N.cylindre(r * 0.9, r * 0.25, 0.1, 8, haut=True), "cuivre_vert", T(x, y, z0 + h))
    L.ajouter(*N.cylindre(0.012, 0.0, 0.16, 4), "fer", T(x, y, z0 + h + 0.09))


def paratonnerre(L, x, y, z, h=0.5, cable_vers=None, sol_z=None):
    """Un petit paratonnerre de toit : une tige de fer, sa pointe de cuivre, et son fil qui descend à terre."""
    L.ajouter(*N.cylindre(0.012, 0.008, h, 4), "fer", T(x, y, z))
    L.ajouter(*N.cylindre(0.02, 0.0, 0.07, 4), "cuivre", T(x, y, z + h))
    if cable_vers is not None:
        L.ajouter(*N.tube([(x, y, z + 0.02), ((x + cable_vers[0]) / 2, (y + cable_vers[1]) / 2, (z + sol_z) / 2 + 0.05), (cable_vers[0], cable_vers[1], sol_z)], 0.007, 3, bouts=False), "cuivre")


def forge(lots, L, V, U, rng, leger):
    """La Forge de foudre : une tour ronde de pierre sombre, sa coupole de cuivre vert, sa haute cheminée de fer, la porte
    au sud-ouest et sa lanterne, deux fenêtres rondes ; sur le toit, la borne où arrive le câble du Grand Paratonnerre.
    Renvoie le haut de la cheminée et la borne."""
    x, y, z = FORGE[0], FORGE[1], Z_FORGE
    n = 12 if leger else 16
    M0 = T(x, y, z - 0.05) @ Rz(PI / 2)
    L.ajouter(*N.cylindre(R_FORGE + 0.06, R_FORGE + 0.04, 0.2, n, haut=True), "pierres_sombres", M0)
    L.ajouter(*N.cylindre(R_FORGE, R_FORGE - 0.04, H_FORGE, n, haut=False), "pierres", M0 @ T(0, 0, 0.15))
    L.ajouter(*N.cylindre(R_FORGE + 0.05, R_FORGE + 0.05, 0.07, n, haut=True, bas=True), "pierres_sombres", M0 @ T(0, 0, H_FORGE + 0.12))
    L.ajouter(*N.sphere(R_FORGE + 0.02, n, 5, 0.62), "cuivre_vert", T(x, y, z + H_FORGE + 0.12), doux=True)
    zt = z + H_FORGE + 0.12 + (R_FORGE + 0.02) * 0.62
    L.ajouter(*N.cylindre(0.07, 0.05, 0.16, 6, haut=True), "cuivre", T(x, y, zt - 0.04))
    borne = (x, y, zt + 0.14)
    L.ajouter(*N.sphere(0.05, 6, 4), "cuivre", T(*borne))
    cap = math.radians(-135)  # la porte regarde la place
    ux, uy = math.cos(cap), math.sin(cap)
    Mp = T(x + ux * (R_FORGE - 0.03), y + uy * (R_FORGE - 0.03), z + 0.1) @ Rz(cap + PI / 2)
    L.ajouter(*N.boite(0.34, 0.07, 0.56), "pierres_sombres", Mp)
    L.ajouter(*N.quad((-0.12, -0.045, 0.0), (0.12, -0.045, 0.0), (0.12, -0.045, 0.46), (-0.12, -0.045, 0.46)), "porte", Mp)
    A.lanterne(L, U, (x + ux * (R_FORGE + 0.1) - uy * 0.26, y + uy * (R_FORGE + 0.1) + ux * 0.26, z + 0.72), grosse=True)
    for da in (-1.0, 1.05):
        a = cap + da
        Mf = T(x + math.cos(a) * (R_FORGE - 0.012), y + math.sin(a) * (R_FORGE - 0.012), z + 0.62) @ Rz(a + PI / 2)
        L.ajouter(*N.boite(0.26, 0.05, 0.3), "pierres_sombres", Mf @ T(0, 0, -0.03))
        V.ajouter(*N.quad((-0.09, -0.04, 0.02), (0.09, -0.04, 0.02), (0.09, -0.04, 0.22), (-0.09, -0.04, 0.22)), "vitre", Mf)
        L.ajouter(*N.quad((-0.09, -0.036, 0.02), (0.09, -0.036, 0.02), (0.09, -0.036, 0.22), (-0.09, -0.036, 0.22)), "fenetre", Mf)
    a = cap + PI  # la cheminée, derrière
    cx_, cy_ = x + math.cos(a) * (R_FORGE - 0.12), y + math.sin(a) * (R_FORGE - 0.12)
    L.ajouter(*N.cylindre(0.085, 0.06, H_FORGE + 1.25, 7, haut=True), "fer_rouille", T(cx_, cy_, z + 0.1))
    L.ajouter(*N.cylindre(0.09, 0.09, 0.05, 7, haut=True, bas=True), "fer", T(cx_, cy_, z + H_FORGE + 1.3))
    return (cx_, cy_, z + H_FORGE + 1.4), borne


def mailles(graine=233, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de monde et de bibelots)."""
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

    # --- le plan : la jetée, la chaussée, les sentiers ---
    pa, pb = JETEE_A, JETEE_B
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    cote_p = np.array((-dp[1], dp[0]))  # le côté est de la jetée
    lg = float(np.linalg.norm(pb - pa))
    cap_j = math.atan2(dp[1], dp[0])
    facades = [(math.cos(m[2] - PI / 2), math.sin(m[2] - PI / 2)) for m in MAISONS]
    portes = [(m[0] + f[0] * (m[4] / 2 + 0.28), m[1] + f[1] * (m[4] / 2 + 0.28)) for m, f in zip(MAISONS, facades)]
    coins = [(m[0] + math.cos(m[2]) * (m[3] / 2 + 0.35) + f[0] * (m[4] / 2 + 0.05), m[1] + math.sin(m[2]) * (m[3] / 2 + 0.35) + f[1] * (m[4] / 2 + 0.05)) for m, f in zip(MAISONS, facades)]  # le coin est de chaque façade
    porte_forge = (FORGE[0] + math.cos(math.radians(-135)) * (R_FORGE + 0.42), FORGE[1] + math.sin(math.radians(-135)) * (R_FORGE + 0.42))
    place_s, place_o, place_e = (PLACE[0] + 0.1, PLACE[1] - 0.72), (PLACE[0] - 0.85, PLACE[1] + 0.3), (PLACE[0] + 0.85, PLACE[1] + 0.05)
    chaussee = [(*(pa + dp * (lg - 0.6)), ZQ + 0.02), (*(pa + dp * 0.4), ZQ + 0.02)] + terre([tuple(pa - dp * 0.15), (0.15, -2.35), place_s])
    vers_ouest = terre([place_s, (-0.6, -1.6), (-1.45, -1.0), coins[0], portes[0]])
    vers_forge = terre([place_s, place_e, (2.0, -0.85), porte_forge])
    vers_hameau = terre([portes[2], (-2.75, -2.75), coins[1], portes[1]])
    ronde = terre([porte_forge, (2.75, -1.75), (3.02, -2.14)])
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        (chaussee, False, 0.16, 0.0, 4.0),
        (vers_forge, False, 0.17, 0.3, 4.0),
        (vers_ouest, False, 0.15, 0.6, 5.0),
        (vers_hameau, False, 0.14, 0.2, 5.0),
        (ronde, False, 0.13, 0.5, 4.0),
    ]
    PISTES[:] = [chaussee[1:], vers_ouest, vers_forge, vers_hameau, ronde, terre([(-1.45, -1.0), (-1.0, -1.9), coins[2], portes[2]])]
    couloirs = [(chaussee[1:], 0.12), (vers_ouest, 0.12), (vers_forge, 0.12), (vers_hameau, 0.11), (ronde, 0.11)]
    loin_des_sentiers = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r):
        """Cette place est-elle à terre, hors du Pic, des passages et de ce qui est déjà posé ?"""
        if terrain(x, y) < 0.16 or bord(x, y) < r + 0.12 or profil_pic(x, y) > 0.05 or not loin_des_sentiers(x, y, r):
            return False
        if any(hauteur_orgue(x + dx * r, y + dy * r) is not None for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (52 if leger else 76), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[terrain(x, y) for x in xs] for y in xs]
    dessous = [[profil_pic(x, y) > 1.6 for x in xs] for y in xs]
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
    L.ajouter(sommets, faces, "sol_tonnerre", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)

    etape("les orgues")
    orgues(L, leger)
    SOL.append(("decor", "le Pic Foudroyé", Vf.rond(PIC[0], PIC[1], R_PIC * 0.9, 18)))
    bornes_foudre = []
    for k, (x, y, r, hm) in enumerate(RIVAGE_ORGUES):
        if bord(x, y) > -r:
            SOL.append(("rocher", "des orgues du rivage", Vf.rond(x, y, r + 0.12)))
        zc = hauteur_orgue(x, y)
        if zc and k in (2, 3, 5, 9, 12):  # une borne de fer à pointe de cuivre : elle prend la foudre à la place des toits
            cc = centre(*cellule(x, y))
            paratonnerre(L, cc[0], cc[1], zc - 0.02, 0.9)
            bornes_foudre.append((cc[0], cc[1], zc + 0.95))

    etape("le Grand Paratonnerre")
    # --- au sommet : le mât de fer, sa couronne de pointes, sa boule de cuivre, ses chaînes ; le câble qui descend à la forge ---
    sx, sy, sz = PIC[0], PIC[1], H_PIC
    hm_ = 2.5
    L.ajouter(*N.cylindre(0.2, 0.16, 0.14, 8, haut=True), "pierres_sombres", T(sx, sy, sz - 0.02))
    L.ajouter(*N.cylindre(0.062, 0.03, hm_, 6, haut=False), "fer", T(sx, sy, sz + 0.1))
    for t in (0.3, 0.62):
        L.ajouter(*N.cylindre(0.075, 0.075, 0.05, 6, haut=True, bas=True), "cuivre", T(sx, sy, sz + 0.1 + hm_ * t))
    ztete = sz + 0.1 + hm_
    L.ajouter(*N.sphere(0.085, 8, 5), "cuivre", T(sx, sy, ztete - 0.02), doux=True)
    L.ajouter(*N.cylindre(0.02, 0.0, 0.5, 4), "cuivre", T(sx, sy, ztete + 0.04))
    for k in range(6):  # la couronne : six pointes en éventail
        a = k * PI / 3
        L.ajouter(*N.poutre((sx + math.cos(a) * 0.05, sy + math.sin(a) * 0.05, ztete - 0.06), (sx + math.cos(a) * 0.3, sy + math.sin(a) * 0.3, ztete + 0.2), 0.02, 0.006), "cuivre")
    for k in range(3):  # les chaînes qui tiennent le mât
        a = math.radians(-90 + 120 * k)
        q = (sx + math.cos(a) * 1.25, sy + math.sin(a) * 1.25)
        zq = hauteur_orgue(*q) or terrain(*q)
        L.ajouter(*N.tube([(sx, sy, sz + 0.1 + hm_ * 0.62), ((sx + q[0]) / 2, (sy + q[1]) / 2, (sz + hm_ * 0.62 + zq) / 2 - 0.12), (q[0], q[1], zq + 0.02)], 0.012, 3, bouts=False), "fer")
    cheminee, borne = forge(lots, L, V, U, rng, leger)
    SOL.append(("decor", "la Forge de foudre", Vf.rond(FORGE[0], FORGE[1], R_FORGE + 0.1, 14)))
    # le câble de cuivre : du pied du mât, par-dessus les orgues du flanc est, jusqu'à la borne de la forge
    relais = (PIC[0] + 1.75, PIC[1] - 0.95)
    zr = (hauteur_orgue(*relais) or terrain(*relais)) + 0.75
    L.ajouter(*N.cylindre(0.03, 0.022, 0.8, 5), "fer", T(relais[0], relais[1], zr - 0.78))
    L.ajouter(*N.sphere(0.04, 6, 4), "verre_eclair", T(relais[0], relais[1], zr + 0.03))
    cable = [(sx + 0.05, sy - 0.05, sz + 0.5), ((sx + relais[0]) / 2, (sy + relais[1]) / 2, (sz + 0.5 + zr) / 2 - 0.35), (relais[0], relais[1], zr), ((relais[0] + borne[0]) / 2, (relais[1] + borne[1]) / 2, (zr + borne[2]) / 2 - 0.3), borne]
    L.ajouter(*N.tube(cable, 0.022, 4, bouts=False), "cuivre")

    etape("la forge")
    # --- devant la forge : les deux grands bocaux, l'enclume, le baquet ; plus loin, le râtelier des petits bocaux ---
    grands_bocaux = []
    for dx, dy in ((-1.2, -0.14), (-0.14, -1.2)):
        bocal(L, U, FORGE[0] + dx, FORGE[1] + dy, Z_FORGE, 0.6, 0.18)
        grands_bocaux.append((FORGE[0] + dx, FORGE[1] + dy, Z_FORGE + 0.12 + 0.3))
        SOL.append(("decor", "un grand bocal à éclairs", Vf.rond(FORGE[0] + dx, FORGE[1] + dy, 0.24)))
    qe = (FORGE[0] + 0.85, FORGE[1] - 0.7)
    L.ajouter(*N.cylindre(0.1, 0.08, 0.2, 7, haut=True), "bois_epave", T(qe[0], qe[1], Z_FORGE - 0.02))
    L.ajouter(*N.boite(0.26, 0.09, 0.08), "fer", T(qe[0], qe[1], Z_FORGE + 0.18) @ Rz(0.5))
    SOL.append(("decor", "l'enclume", Vf.rond(qe[0], qe[1], 0.16)))
    P.tonneau(L, T(FORGE[0] + 1.02, FORGE[1] - 0.05, Z_FORGE - 0.01), 0.1, 0.24)
    SOL.append(("decor", "le baquet", Vf.rond(FORGE[0] + 1.02, FORGE[1] - 0.05, 0.12)))
    ur = (math.cos(CAP_RATELIER), math.sin(CAP_RATELIER))
    zr_ = Z_RATELIER
    for s in (-1, 1):
        q = (RATELIER[0] + ur[0] * s * 0.62, RATELIER[1] + ur[1] * s * 0.62)
        L.ajouter(*N.poutre((q[0], q[1], zr_ - 0.03), (q[0], q[1], zr_ + 0.74), 0.05), "poutre")
    for zz in (0.26, 0.56):
        L.ajouter(*N.boite(1.32, 0.2, 0.03), "planches_sombres", T(RATELIER[0], RATELIER[1], zr_ + zz) @ Rz(CAP_RATELIER))
        for k in range(3 if leger else 5):
            t = -0.5 + k / ((3 if leger else 5) - 1)
            bocal(L, U, RATELIER[0] + ur[0] * t, RATELIER[1] + ur[1] * t, zr_ + zz + 0.03, 0.17, 0.062, socle=False)
    L.ajouter(*N.quad((-0.72, -0.2, 0.86), (0.72, -0.2, 0.86), (0.72, 0.18, 0.76), (-0.72, 0.18, 0.76)), "bardeaux", T(RATELIER[0], RATELIER[1], zr_) @ Rz(CAP_RATELIER))
    L.ajouter(*N.quad((-0.72, 0.18, 0.75), (0.72, 0.18, 0.75), (0.72, -0.2, 0.85), (-0.72, -0.2, 0.85)), "planches_sombres", T(RATELIER[0], RATELIER[1], zr_) @ Rz(CAP_RATELIER))
    SOL.append(("decor", "le râtelier des bocaux", Vf.rectangle(RATELIER[0], RATELIER[1], 1.5, 0.46, CAP_RATELIER)))

    etape("la place")
    # --- la place : la Table des Éclairs (la route du trésor gravée : ses traits ne s'allument qu'un instant), des bancs ---
    tx_, ty_, tz_ = PLACE[0], PLACE[1], Z_PLACE
    L.ajouter(*N.cylindre(0.5, 0.44, 0.24, 6, haut=True), "pierres_sombres", T(tx_, ty_, tz_ - 0.03) @ Rz(PI / 6))
    L.ajouter(*N.cylindre(0.46, 0.46, 0.02, 6, haut=True), "ardoises", T(tx_, ty_, tz_ + 0.205) @ Rz(PI / 6))
    Tr = N.Maille("route_gravee")
    trace = [(-0.3, -0.2), (-0.16, -0.05), (-0.2, 0.12), (-0.02, 0.2), (0.12, 0.06), (0.1, -0.14), (0.28, -0.2)]
    for a, b in zip(trace, trace[1:]):
        Tr.ajouter(*N.poutre((a[0], a[1], 0.0), (b[0], b[1], 0.0), 0.022, 0.006), "astre")
    for k, (px_, py_) in enumerate(trace[1:-1]):
        Tr.ajouter(*N.cylindre(0.026, 0.026, 0.008, 6, haut=True), "astre", T(px_, py_, 0.0))
    for s in (-1, 1):  # la croix, au bout de la route
        Tr.ajouter(*N.poutre((0.28 - 0.05, -0.2 - 0.05 * s, 0.0), (0.28 + 0.05, -0.2 + 0.05 * s, 0.0), 0.02, 0.006), "astre")
    lots["libres"].append((Tr, (tx_, ty_, tz_ + 0.232), {"anim": "clignote"}))
    SOL.append(("decor", "la Table des Éclairs", Vf.rond(tx_, ty_, 0.54, 10)))
    for a in (math.radians(150), math.radians(30)):
        q = (tx_ + math.cos(a) * 0.95, ty_ + math.sin(a) * 0.95)
        L.ajouter(*N.boite(0.5, 0.14, 0.035), "pierres_claires", T(q[0], q[1], Z_PLACE + 0.14) @ Rz(a + PI / 2))
        for s in (-1, 1):
            L.ajouter(*N.boite(0.08, 0.12, 0.16), "pierres_sombres", T(q[0] - math.sin(a) * s * 0.18, q[1] + math.cos(a) * s * 0.18, Z_PLACE - 0.02) @ Rz(a + PI / 2))
        SOL.append(("decor", "un banc de pierre", Vf.rectangle(q[0], q[1], 0.54, 0.18, a + PI / 2)))
    for q in ((PLACE[0] - 1.0, PLACE[1] - 0.75), (PLACE[0] + 1.15, PLACE[1] - 0.9), (0.6, -2.15)):
        if loin_des_sentiers(q[0], q[1], 0.03):
            P.lampadaire(L, U, q[0], q[1], z=sol(*q), h=0.66)
            SOL.append(("decor", "une lanterne de tempête", Vf.rond(q[0], q[1], 0.05)))

    etape("le hameau")
    # --- le hameau des Foudriers : des maisons basses, des toits d'ardoise, un paratonnerre chacune ---
    cheminees = []
    for k, (m, zm, f) in enumerate(zip(MAISONS, Z_MAISONS, facades)):
        x, y, cap, lx, ly, nbc, app = m
        ch = Ph.maison_gardien(L, V, U, rng, x, y, zm, cap, lx=lx, ly=ly, hm=0.46, ht=0.42, appentis=app, cheminees=nbc, toit="ardoises", mur=("pierres", "pierres_sombres", "pierres")[k])
        cheminees += ch[:1]
        um = (math.cos(cap), math.sin(cap))
        SOL.append(("decor", "une maison du hameau", Vf.rectangle(x, y, lx + 0.12, ly + 0.04, cap)))
        if app:
            SOL.append(("decor", "l'appentis", Vf.rectangle(x + um[0] * 0.25 - f[0] * (ly / 2 + 0.26), y + um[1] * 0.25 - f[1] * (ly / 2 + 0.26), 0.9, 0.44, cap)))
        pied = (x - um[0] * (lx / 2 + 0.16) - f[0] * 0.1, y - um[1] * (lx / 2 + 0.16) - f[1] * 0.1)
        paratonnerre(L, x - um[0] * lx * 0.25, y - um[1] * lx * 0.25, zm + 0.46 + 0.42 + 0.04, 0.5, pied, sol(*pied))
    q = (MAISONS[0][0] + facades[0][0] * 0.25 - math.cos(MAISONS[0][2]) * 1.16, MAISONS[0][1] + facades[0][1] * 0.25 - math.sin(MAISONS[0][2]) * 1.16)
    for k in range(3):  # les barils de l'auberge
        qq = (q[0] + 0.19 * (k % 2), q[1] + 0.17 * (k // 2) - 0.1 * (k % 2))
        P.tonneau(L, T(qq[0], qq[1], Z_MAISONS[0] - 0.01), 0.08, 0.2)
    SOL.append(("decor", "les barils de l'auberge", Vf.rond(q[0] + 0.1, q[1] + 0.04, 0.26)))

    etape("la jetée")
    # --- la jetée de pierre, ses bittes, sa lanterne ; le caboteur, voiles serrées ; le canot ---
    nbj = 5
    for k in range(nbj):
        c = pa + dp * (lg * (k + 0.5) / nbj)
        L.ajouter(*N.boite(lg / nbj + 0.02, 0.74 + 0.04 * (k % 2), ZQ + 0.9), "quai", T(c[0], c[1], -0.9) @ Rz(cap_j))
        for s in (-1, 1):
            L.ajouter(*N.boite(lg / nbj - 0.02, 0.1, 0.03), "pierres_sombres", T(c[0] + cote_p[0] * s * 0.33, c[1] + cote_p[1] * s * 0.33, ZQ - 0.005) @ Rz(cap_j))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg + 0.1, 0.78, cap_j))
    emprises.append(("la jetée", Vf.rectangle(*(pa + dp * (lg / 2 + 0.2)), lg - 0.4, 0.78, cap_j)))
    for t in (0.45, 0.72, 0.95):
        q = pa + dp * lg * t - cote_p * 0.3
        L.ajouter(*N.cylindre(0.04, 0.05, 0.1, 6), "fer", T(q[0], q[1], ZQ + 0.02))
    q = pb - dp * 0.14 + cote_p * 0.27
    P.lampadaire(L, U, q[0], q[1], z=ZQ + 0.02, h=0.62)
    for k, (t, s, genre) in enumerate(((0.3, 0.25, "c"), (0.38, 0.27, "t"), (0.62, 0.26, "t"))[:2 if leger else 3]):
        q = pa + dp * lg * t + cote_p * s
        if genre == "c":
            P.caisse(L, T(q[0], q[1], ZQ + 0.02) @ Rz(k * 0.7), 0.16)
        else:
            P.tonneau(L, T(q[0], q[1], ZQ + 0.02), 0.07, 0.18)
    for t, s_ in ((0.16, 0.22), (0.22, 0.27)):  # deux bocaux prêts à embarquer
        q = pa + dp * lg * t + cote_p * s_
        bocal(L, U, q[0], q[1], ZQ + 0.02, 0.2, 0.07, socle=False)
    cb = pa + dp * (lg * 0.62) - cote_p * (0.37 + 0.41 + 0.1)
    Cb = N.Maille("caboteur")
    P.caboteur(Cb, N.Maille("rien"), rng, 0, 0, cap_j, 2.3, "toile_ecrue", "peint_rouge")
    lots["animes"].append((Cb, (cb[0], cb[1], 0.02), {"anim": "flotte", "mer": 1, "ampl": 0.03, "phase": 1.9}))
    emprises.append(("le caboteur", Vf.rectangle(cb[0], cb[1], 2.3, 0.82, cap_j)))
    bq = pa + dp * (lg - 0.5) + cote_p * (0.37 + 0.22 + 0.2)
    Bq = N.Maille("canot")
    P.barque(Bq, rng, 0, 0, cap_j + 0.12)
    lots["animes"].append((Bq, (bq[0], bq[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.035, "phase": 0.7}))
    emprises.append(("le canot", Vf.rectangle(bq[0], bq[1], 0.8, 0.32, cap_j + 0.12)))

    etape("la grève")
    # --- la grève de sable noir : les fulgurites (le sable que la foudre a changé en verre), une barque retournée ---
    faits = 0
    for essai in range(120):
        if faits >= (5 if leger else 9):
            break
        x, y = (rng.random() - 0.5) * 3.0, -2.5 + (rng.random() - 0.5) * 0.7
        if abs(x - pa[0]) < 0.7 or not libre(x, y, 0.07) or terrain(x, y) > 0.6:
            continue
        hf = 0.14 + rng.random() * 0.22
        pts = [(x, y, terrain(x, y) - 0.03), (x + (rng.random() - 0.5) * 0.07, y + (rng.random() - 0.5) * 0.07, terrain(x, y) + hf * 0.5), (x + (rng.random() - 0.5) * 0.12, y + (rng.random() - 0.5) * 0.12, terrain(x, y) + hf)]
        L.ajouter(*N.tube(pts, [0.03, 0.022, 0.006], 4), "verre_eclair" if faits % 3 else "verre_noir")
        SOL.append(("decor", "une fulgurite", Vf.rond(x, y, 0.05)))
        faits += 1
    qc = (-1.45, -2.45)
    if libre(qc[0], qc[1], 0.3):
        Ph.canot(L, T(qc[0], qc[1], terrain(*qc) + 0.19) @ Rz(0.5) @ Rx(PI), 0.8, "peint_bleu")
        SOL.append(("decor", "une barque retournée", Vf.rectangle(qc[0], qc[1], 0.84, 0.36, 0.5)))

    etape("le large")
    # --- au large : l'épave brûlée sur son récif, les cormorans sur les orgues ---
    Me = T(EPAVE[0], EPAVE[1], 0.22) @ Rz(2.5) @ Rx(-0.35) @ Ry(0.12)
    Am.epave(L, rng, Me, 2.5, 0.85, 0.42, 0.1, leger)
    pm = (Me @ np.array((0.1, 0.0, 0.25, 1.0)))[:3]
    pm2 = (Me @ np.array((0.1, 0.0, 1.5, 1.0)))[:3]
    L.ajouter(*N.tube([tuple(pm), tuple((pm + pm2) / 2), tuple(pm2)], [0.07, 0.055, 0.03], 5), "cendre")
    flots = []
    for x, y, r, hm in ORGUES_MER:
        flots.append([(x + math.cos(a) * r * 0.95, y + math.sin(a) * r * 0.95) for a in (k * PI / 6 for k in range(12))])
    for x, y, r, hm in RIVAGE_ORGUES:
        if bord(x, y) < r * 0.4:
            flots.append([(x + math.cos(a) * r * 0.95, y + math.sin(a) * r * 0.95) for a in (k * PI / 6 for k in range(12))])
    for k, (ox, oy) in enumerate(((-5.9, -4.6), (7.0, 0.6), (-2.0, 6.9))[:2 if leger else 3]):
        zc = hauteur_orgue(ox, oy)
        if zc:
            cc = centre(*cellule(ox, oy))
            Ph.cormoran(L, cc[0], cc[1], zc, 0.8 + k * 2.1)

    etape("la lande")
    # --- la terre : les arbres foudroyés, la bruyère, les rochers, les touffes ---
    for k, (x, y, hh, cap) in enumerate(((-2.75, 1.75, 1.5, 0.4), (2.55, -2.35, 1.2, 2.3), (-0.85, -2.6, 1.0, 5.0), (4.55, 1.25, 1.35, 1.2), (-4.75, -0.75, 1.1, 3.6), (1.9, 3.9, 1.25, 0.2), (-2.4, 3.6, 1.0, 2.8))[:4 if leger else 7]):
        if libre(x, y, 0.16):
            arbre_foudroye(L, rng, x, y, sol(x, y), hh, cap)
            SOL.append(("decor", "un arbre foudroyé", Vf.rond(x, y, 0.14)))
    faits = 0
    for essai in range(500):
        if faits >= (8 if leger else 16):
            break
        x, y = vers(rng.random() * 360, 0.5 + rng.random() * 2.6)
        r_ = 0.16 + rng.random() * 0.14
        if not libre(x, y, r_ + 0.05):
            continue
        A.buisson(L, rng, x, y, sol(x, y) - 0.03, r_)
        SOL.append(("rocher", "une touffe de bruyère", Vf.rond(x, y, r_ * 0.8)))
        faits += 1
    faits = 0
    for essai in range(500):
        if faits >= (9 if leger else 18):
            break
        x, y = vers(rng.random() * 360, 0.3 + rng.random() * 3.0)
        r_ = 0.13 + rng.random() * 0.2
        if not libre(x, y, r_ + 0.05):
            continue
        Vt.rocher(L, rng, x, y, terrain(x, y) - r_ * 0.2, r_, "roche_tonnerre")
        SOL.append(("rocher", "un bloc de basalte", Vf.rond(x, y, r_ * 0.85)))
        faits += 1
    faits = 0
    for essai in range(600):
        if faits >= (10 if leger else 24):
            break
        x, y = vers(rng.random() * 360, 0.3 + rng.random() * 3.0)
        if not libre(x, y, 0.08) or terrain(x, y) < 0.3 or not loin_des_sentiers(x + 0.2, y, 0.26):
            continue
        Vt.herbes(L, rng, x, y, sol(x, y), 4)
        faits += 1

    etape("les habitants")
    # --- les habitants (immobiles) ---
    def poser(x, y, zz=None, cap=None, **plus):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz, **plus)
        SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))

    cv = centre(*cellule(VIGIE[0] - 0.1, VIGIE[1] - 0.2))  # le Foudrier de la Vigie : il tient la chaîne du cerf-volant
    poser(cv[0], cv[1], Z_VIGIE, math.radians(-110), leve=1)
    bocal(L, U, cv[0] + 0.3, cv[1] + 0.12, Z_VIGIE, 0.3, 0.1, socle=False)
    poser(PLACE[0] - 0.12, PLACE[1] + 0.72, Z_PLACE, -PI / 2 + 0.2)  # devant la Table des Éclairs
    poser(FORGE[0] + 0.62, FORGE[1] - 1.0, Z_FORGE, 0.9)  # à l'enclume
    q = pa + dp * (lg * 0.5) - cote_p * 0.2
    poser(q[0], q[1], ZQ + 0.02, cap_j + PI / 2 + 0.3)  # sur la jetée
    if not leger:
        poser(portes[0][0] - 0.45, portes[0][1] - 0.35, None, 0.9)  # devant l'auberge
        poser(RATELIER[0] - 0.073 + 0.345, RATELIER[1] + 0.414 + 0.06, None, CAP_RATELIER - PI / 2)

    etape("la vie")
    # --- la vie : ceux qui marchent, le cerf-volant de fer, la fumée, l'orage ---
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
    # le cerf-volant de fer : un losange de cuivre au bout de sa chaîne, qui tire sur le vent (il pivote autour de la main)
    Cv = N.Maille("cerf_volant")
    main = (cv[0], cv[1], Z_VIGIE + 0.33)
    bout = (-1.5, -0.55, 2.9)  # où est le cerf-volant, vu de la main
    Cv.ajouter(*N.tube([(0, 0, 0), (bout[0] * 0.5, bout[1] * 0.5, bout[2] * 0.42), bout], 0.008, 3, bouts=False), "fer")
    A.toile(Cv, [(bout[0], bout[1], bout[2] + 0.3), (bout[0] - 0.05, bout[1] + 0.2, bout[2]), (bout[0], bout[1], bout[2] - 0.38), (bout[0] + 0.05, bout[1] - 0.2, bout[2])], [(0, 1, 2, 3)], "cuivre", ep=0.012)
    Cv.ajouter(*N.poutre((bout[0], bout[1], bout[2] + 0.3), (bout[0], bout[1], bout[2] - 0.38), 0.014), "fer")
    Cv.ajouter(*N.poutre((bout[0] - 0.05, bout[1] + 0.2, bout[2]), (bout[0] + 0.05, bout[1] - 0.2, bout[2]), 0.014), "fer")
    Cv.ajouter(*N.tube([(bout[0], bout[1], bout[2] - 0.38), (bout[0] - 0.1, bout[1] - 0.04, bout[2] - 0.62), (bout[0] - 0.05, bout[1] - 0.1, bout[2] - 0.86)], 0.006, 3, bouts=False), "corde")
    Cv.ajouter(*N.boite(0.03, 0.012, 0.06), "or", T(bout[0] - 0.05, bout[1] - 0.1, bout[2] - 0.93))  # la clé, au bout de la queue
    lots["animes"].append((Cv, main, {"anim": "balance", "axe": [0.35, -0.94, 0.0], "ampl": 0.07, "vitesse": 0.9, "phase": 0.4}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in (cheminees[:1] + [cheminee]) for c in p], "grosseur": 0.55, "cap": 0.0, "force": 1.0}))
    lots["reperes"].append((tuple(float(c) for c in pm2), {"anim": "fumees", "points": [0.0, 0.0, 0.0], "grosseur": 0.4, "cap": 0.0, "force": 0.8}))
    # l'orage (dessiné par le site) : le repère est à la pointe du Grand Paratonnerre ; « ailleurs » : les bornes et les
    # orgues en mer où la foudre tombe aussi (celles qu'on voit du sud, pas celles que le Pic cache)
    vues = [o for o in bornes_foudre if o[1] < 0.6 or abs(o[0]) > 4.6] + [(o[0], o[1], o[3] * 0.92) for o in ORGUES_MER if o[1] < 0.6 or abs(o[0]) > 4.6]
    lots["reperes"].append(((sx, sy, ztete + 0.54), {"anim": "foudre", "haut": 4.2, "rayon": 8.6, "nuages": 7 if leger else 11, "pluie": 260 if leger else 520, "cadence": 5.5,
                                                     "ailleurs": [round(float(c), 3) for o in vues[:8] for c in o], "cable": [round(float(c), 3) for p in [(sx, sy, ztete + 0.4)] + cable for c in p],
                                                     "bocaux": [round(float(c), 3) for p in grands_bocaux for c in p]}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.5, "genre": 2}))

    etape("sur l'eau")
    # --- sur l'eau (dessiné par le site) : le ressac autour de l'île et des orgues, l'ombre de la jetée et des coques ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    for tour in flots:
        cx_, cy_ = sum(p[0] for p in tour) / len(tour), sum(p[1] for p in tour) / len(tour)
        tour = tour + tour[:1]
        K.bande(Rv, [(cx_ + (x - cx_) * 0.97, cy_ + (y - cy_) * 0.97) for x, y in tour], [(x + (x - cx_) / math.hypot(x - cx_, y - cy_) * 0.5, y + (y - cy_) / math.hypot(x - cx_, y - cy_) * 0.5) for x, y in tour], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.35)), lg - 0.8, 0.8, cap_j)
    K.tache(Rv, cb[0], cb[1], 2.2, 0.76, cap_j, rond=True, marge=0.2)
    K.tache(Rv, bq[0], bq[1], 0.78, 0.3, cap_j + 0.12, rond=True, marge=0.16)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


N.matiere("roche_tonnerre", N.tx_roche, 1.5, 1.0, c=0x7f838b, graine=803)


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("tonnerre-v5", (1.0, -30.5, 17.5), (0.3, -0.2, 2.6), 50), ("tonnerre-v5-pic", (-5.5, -11.5, 6.5), (0.3, 0.3, 2.6), 55)] if rendu else []
    return K.construire("ile-tonnerre-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="tonnerre")
