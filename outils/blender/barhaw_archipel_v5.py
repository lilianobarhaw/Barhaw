# L'Archipel Suspendu, « niveau 5 » : des îles qui flottent dans le ciel au-dessus d'une île de pêcheurs.
# (Son histoire, dans le bot : « Des îles qui flottent dans le ciel, des cascades qui tombent dans le vide et un arc-en-ciel
# pour monter. »)
# L'idée : en bas, le Pied, une île de roche et de prés, son village blanc aux toits bleus autour du débarcadère, et au
# nord le Bassin des Chutes, un lac rond au fond d'un cratère où tombe la grande cascade. Au-dessus, retenus par des
# chaînes, les îlots : le Grand Îlot et son Temple des Vents (une cloche dans une rotonde, un jardin, la source de la
# cascade), l'Îlot des Vergers (relié au Grand par un pont de corde ; sa cascade tombe dans la mer), l'Îlot de la Ferme
# (des moutons, un moulin ; un panier monte et descend au bout de sa corde depuis le treuil d'en bas), et plus haut
# l'épave d'un navire échoué sur un îlot (comment est-il arrivé là ?), et tout en haut, un pavillon noir sans emblème.
# L'arc-en-ciel part du Seuil, à l'ouest du village, et monte jusqu'au Grand Îlot : des pèlerins le gravissent.
# Des cailloux volants montent et descendent doucement, des nuages passent entre les îlots, des oiseaux tournent.
# Tout est inventé.
# La nuit : les lanternes du village et du temple, les fenêtres, et des cœurs bleus cachés dans l'arc-en-ciel (le site y
# pose ses lumières : l'arc sort de l'ombre avec ses couleurs).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_vents_v5 as Vt
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
BASSIN, R_BASSIN, ZE = (0.5, 1.2), 1.3, 0.32  # le Bassin des Chutes (au fond du cratère) et le niveau de son eau
ZQ = 0.42  # le débarcadère
# les îlots : (centre x, y), rayon, hauteur du dessus, profondeur de la roche dessous
G = ((0.6, 2.6), 2.0, 5.0, 2.1)  # le Grand Îlot, le Temple des Vents
VG = ((-4.4, 3.5), 1.35, 4.4, 1.6)  # l'Îlot des Vergers
F = ((4.3, 1.5), 1.3, 3.4, 1.5)  # l'Îlot de la Ferme
E = ((-1.4, 5.6), 1.15, 6.5, 1.3)  # l'Îlot de l'Épave
PV = ((3.2, 5.0), 0.55, 7.8, 0.8)  # l'Îlot du Pavillon
SEUIL = (-4.7, -2.3)  # le pied de l'arc-en-ciel
ARC = None  # les quatre points de l'arc (remplis par mailles())
PISTES = []  # les trajets du Pied (remplis par mailles()), pour peindre les chemins
EN_L_AIR = []  # (nom, points, en rond, îlot ou None) : les trajets des îlots, du pont et de l'arc (vérifiés à part)
ILOTS_FAITS = {}  # nom : (centre, rayon, dessus, emprises)


# --- les matières ---
def tx_strates(c=0xb3a58d, c2=0x7f7362, graine=1):
    """La roche du dessous des îlots : des bancs couchés (clairs et sombres), des fissures, des coulures d'eau."""
    n = N.TAILLE
    bancs = N.bruit(n, 2, 22, graine, 3)
    b2 = N.bruit(n, 6, 6, graine + 1, 3)
    fin = N.bruit(n, 90, 90, graine + 2, 1)
    coul = N.mel(np.broadcast_to(N.hexa(c2), (n, n, 3)).copy(), np.broadcast_to(N.hexa(c), (n, n, 3)), np.clip(0.15 + 0.85 * bancs + 0.25 * (b2 - 0.5), 0, 1))
    joints = N.lisse(0.03, 0.0, np.abs(N.bruit(n, 3, 16, graine + 5, 2) - 0.5)) * 0.3 * N.lisse(0.35, 0.6, N.bruit(n, 5, 3, graine + 7, 2))  # les joints entre les bancs, par endroits
    fente = N.lisse(0.02, 0.0, np.abs(N.bruit(n, 26, 2, graine + 3, 2) - 0.5)) * N.lisse(0.45, 0.6, N.bruit(n, 4, 8, graine + 6, 2))  # des fissures verticales, par endroits
    coul = N.mel(coul, N.hexa(0x4a4238), np.maximum(fente * 0.45, joints))
    coulure = N.lisse(0.6, 0.85, N.bruit(n, 14, 1, graine + 4, 2)) * 0.25
    coul = N.mel(coul, N.hexa(0x5c564c), coulure)
    coul = coul * (0.9 + 0.2 * (fin - 0.5))[..., None]
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.5 + 0.3 * (bancs - 0.5) - 0.3 * fente, 0, 1).astype(np.float32)


def tx_chute(graine=1):
    """L'eau qui tombe (u : en travers, v : le long de la chute) : blanche d'écume, des filets bleus dans le sens de la chute."""
    n = N.TAILLE
    filets = N.bruit(n, 7, 2, graine, 2)
    coul = N.mel(N.hexa(0xf3fbfe), N.hexa(0x86c9e2), N.lisse(0.48, 0.7, filets) * 0.85)
    return coul.astype(np.float32), np.clip(0.5 + 0.3 * (filets - 0.5), 0, 1).astype(np.float32)


N.matiere("tuiles_ciel", N.tx_tuiles, 1.3, 0.9, c1=0x4f9fc4, c2=0x356f96, c3=0x86c7de, graine=731, mousse=0.15)
N.matiere("roche_ilot", tx_strates, 2.2, 1.0, c=0xb9ab92, c2=0x7f7362, graine=732)
N.matiere("terre_ilot", N.tx_uni, 1.0, 0.8, c=0x6f5641, graine=733, grain=0.3, taches=0.4, c2=0x54402f, seuil=0.5)
N.matiere("marbre", N.tx_uni, 1.2, 0.3, rugueux=0.35, c=0xf1eee6, graine=734, grain=0.08, taches=0.2, c2=0xdcd6ca, seuil=0.6)
N.matiere("eau_chute", tx_chute, 1.0, 0.2, 0.15, graine=735)
N.matiere("ecume_chute", N.tx_uni, 0.5, 0.3, rugueux=0.6, c=0xf6fcff, graine=736, grain=0.06)
N.matiere("eau_lac", N.tx_uni, 1.5, 0.05, rugueux=0.06, c=0x3f9fbf, graine=737, grain=0.05, taches=0.3, c2=0x6cc0d4, seuil=0.55)
N.matiere("eau_source", N.tx_uni, 0.8, 0.05, rugueux=0.06, c=0x8fd3e6, graine=738, grain=0.04, taches=0.2, c2=0xc4ecf4, seuil=0.55)
COULEURS_ARC = (0xe2504a, 0xf2963a, 0xf5d24c, 0x6cc068, 0x4a9fdc, 0x8a62cc)
ARC_MATS = tuple(f"arc_{k}" for k in range(6))
for k, c in enumerate(COULEURS_ARC):
    N.matiere(ARC_MATS[k], N.tx_uni, 1.0, 0.05, rugueux=0.3, lueur=0.3, c=c, graine=740 + k, grain=0.03, taches=0.1, c2=c, seuil=0.6)


def rivage(th):
    """Le rayon de la côte dans cette direction."""
    return 6.5 + 0.45 * math.sin(2 * th + 1.1) + 0.3 * math.sin(3 * th + 0.4) + 0.2 * math.sin(5 * th + 2.2)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de la mer ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de la mer (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def terrain(x, y):
    """La hauteur du Pied : la plage, les prés qui montent doucement vers le nord, le cratère du Bassin des Chutes et son
    rebord de roche."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.45 * d)
    nord = K.lisse(-3.0, 4.0, y)
    h = 0.42 * K.lisse(0.0, 0.9, d) + (0.25 + 0.55 * nord) * K.lisse(0.8, 3.2, d)
    h += (K.bruit2(x * 0.7, y * 0.7, 3) - 0.5) * 0.12 * K.lisse(0.5, 2.0, d)
    rr = math.hypot(x - BASSIN[0], y - BASSIN[1])
    h += 0.14 * math.exp(-((rr - (R_BASSIN + 0.32)) / 0.25) ** 2)
    creux = K.lisse(R_BASSIN + 0.25, R_BASSIN - 0.15, rr)
    return h * (1 - creux) + (ZE - 0.22) * creux


sol = terrain


def tx_sol_archipel(taille=2048, graine=751):
    """Le sol peint du Pied : le sable de la plage, les prés (des fleurs blanches et roses semées), la roche claire sur les
    pentes et dans le cratère, la roche mouillée et la mousse au bord du bassin, les chemins de terre battue."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 240), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    sable = N.mel(N.hexa(0xe9d9b0), N.hexa(0xf4e8c8), np.clip(0.2 + 0.7 * b2, 0, 1)) * (0.94 + 0.12 * (grain - 0.5))[..., None]
    herbe = N.mel(N.hexa(0x5b8a3c), N.hexa(0x8fb95c), np.clip(0.1 + 0.7 * b2 + 0.4 * (b1 - 0.5), 0, 1)) * (0.86 + 0.24 * (fin - 0.5) + 0.16 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0xb8b06e), N.lisse(0.6, 0.8, b1) * 0.4)  # des herbes sèches par plaques
    herbe = N.mel(herbe, N.hexa(0x45703a), N.lisse(0.62, 0.78, b3) * 0.35)  # des touffes plus sombres
    gx0, gy0 = N.grille(n)
    Y0 = (gy0 * 2 - 1) * R_SOL
    X0 = (gx0 * 2 - 1) * R_SOL
    plage = N.lisse(-3.2, -4.4, Y0) * N.lisse(3.2, 2.4, np.abs(X0))  # la plage du village, au sud ; ailleurs la côte est de roche
    cote_roche = N.mel(N.hexa(0x8a8072), N.hexa(0xb3a78f), np.clip(0.2 + 0.7 * b3 + 0.3 * (b2 - 0.5), 0, 1)) * (0.85 + 0.3 * (fin - 0.5))[..., None]
    rivage_ = N.mel(cote_roche, sable, plage[..., None] if plage.ndim == 2 else plage)
    coul = N.mel(rivage_, herbe, N.lisse(0.3, 0.48, h + (b3 - 0.5) * 0.1))
    roche = N.mel(N.hexa(0x8f8676), N.hexa(0xbcb09a), np.clip(0.2 + 0.7 * b3 + 0.3 * (b2 - 0.5), 0, 1)) * (0.86 + 0.28 * (fin - 0.5))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.55, 1.0, pente + (b3 - 0.5) * 0.35) * N.lisse(0.25, 0.4, h))
    affleure = N.lisse(0.66, 0.74, N.bruit(n, 18, 18, graine + 8, 3)) * N.lisse(0.75, 1.0, h)  # des affleurements de roche dans les prés du nord
    coul = N.mel(coul, roche, affleure * 0.85)
    gx_, gy_ = N.grille(n)
    X, Y = (gx_ * 2 - 1) * R_SOL, (gy_ * 2 - 1) * R_SOL
    rr = np.hypot(X - BASSIN[0], Y - BASSIN[1])
    mouille = N.lisse(R_BASSIN + 0.35, R_BASSIN, rr) * N.lisse(ZE + 0.45, ZE + 0.05, h)
    coul = N.mel(coul, N.mel(N.hexa(0x4f574a), N.hexa(0x3f6a3c), np.clip(b2, 0, 1)), mouille * 0.85)
    terre = N.mel(N.hexa(0xb39a72), N.hexa(0xcdb68c), np.clip(0.2 + 0.7 * b3, 0, 1)) * (0.92 + 0.16 * (grain - 0.5))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.3, 0.2, piste + (fin - 0.5) * 0.06) * N.lisse(0.28, 0.36, h))
    fleurs = N.lisse(0.93, 0.96, N.bruit(n, 260, 260, graine + 7, 1)) * N.lisse(0.45, 0.6, h) * N.lisse(0.35, 0.55, piste) * (1 - N.lisse(0.5, 0.9, pente))
    coul = N.mel(coul, N.mel(N.hexa(0xf7f4ee), N.hexa(0xf2a6c8), N.lisse(0.4, 0.6, b2)), fleurs * 0.75)
    relief = np.clip(0.5 + 0.2 * (b3 - 0.5) + 0.15 * (fin - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_archipel", tx_sol_archipel, 2 * R_SOL, 0.5, 0.9)


# --- les îlots ---
_DZ_DESSUS = ((0.0, 0.1), (0.45, 0.085), (0.8, 0.05), (1.0, 0.0))  # la bosse du dessus : (fraction du rayon, hauteur)


def _dz(f):
    for (f0, z0), (f1, z1) in zip(_DZ_DESSUS[:-1], _DZ_DESSUS[1:]):
        if f <= f1:
            return z0 + (z1 - z0) * (f - f0) / (f1 - f0)
    return 0.0


def rayon_ilot(r, graine):
    """Le contour d'un îlot (le rayon dans chaque direction) : il n'est pas rond."""
    rng = random.Random(graine)
    ph = [rng.random() * 6.28 for _ in range(3)]
    return lambda a: r * (1 + 0.08 * math.sin(3 * a + ph[0]) + 0.05 * math.sin(5 * a + ph[1]) + 0.03 * math.sin(7 * a + ph[2]))


def ilot(L, nom, c, r, z, prof, graine, herbe="herbe", n=None):
    """Un îlot qui flotte : le dessus d'herbe un peu bombé (sa côte n'est pas ronde), une bande de terre, et dessous la
    roche en bancs qui descend en pointe, bosselée, des racines qui pendent. Renvoie la hauteur du dessus en (x, y)."""
    rng = random.Random(graine)
    n = n or (16 if N.DETAIL < 1 else 26)
    ph = [rng.random() * 6.28 for _ in range(3)]
    rb = rayon_ilot(r, graine)
    angles = [k * 2 * PI / n for k in range(n)]
    cx, cy = c
    # le dessus
    v = [(cx, cy, z + _dz(0.0))]
    for f, _ in _DZ_DESSUS[1:]:
        for a in angles:
            v.append((cx + math.cos(a) * rb(a) * f, cy + math.sin(a) * rb(a) * f, z + _dz(f) + (rng.random() - 0.5) * 0.02 * (f < 1)))
    faces = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    for i in range(len(_DZ_DESSUS) - 2):
        a0, a1 = 1 + i * n, 1 + (i + 1) * n
        faces += [(a0 + k, a1 + k, a1 + (k + 1) % n, a0 + (k + 1) % n) for k in range(n)]
    L.ajouter(v, faces, herbe)
    # le dessous : des anneaux qui rétrécissent, puis la pointe (un peu décentrée)
    anneaux = [(1.0, 0.0), (1.03, -0.1), (0.97, -0.3), (0.84, -0.55), (0.64, -0.78), (0.4, -0.93)]
    if N.DETAIL < 1:
        anneaux = [(1.0, 0.0), (1.03, -0.1), (0.9, -0.42), (0.58, -0.8)]
    pointe = (cx + (rng.random() - 0.5) * r * 0.3, cy + (rng.random() - 0.5) * r * 0.3, z - prof)
    bruits = [[1 + (rng.random() - 0.5) * 0.14 for _ in angles] for _ in anneaux]
    v, cote = [], []
    for j, (f, dzr) in enumerate(anneaux):
        for k, a in enumerate(angles):
            q = f * (bruits[j][k] if j > 1 else 1.0)
            zz = z + dzr * prof + (0 if j < 2 else (rng.random() - 0.5) * 0.08)
            v.append((cx + math.cos(a) * rb(a) * q, cy + math.sin(a) * rb(a) * q, zz))
    v.append(pointe)
    tete = len(v) - 1
    terre, roche = [], []
    for j in range(len(anneaux) - 1):
        a0, a1 = j * n, (j + 1) * n
        (terre if j == 0 else roche).extend([(a0 + k, a1 + k, a1 + (k + 1) % n, a0 + (k + 1) % n) for k in range(n)])
    a0 = (len(anneaux) - 1) * n
    roche += [(a0 + k, tete, a0 + (k + 1) % n) for k in range(n)]
    L.ajouter(v, terre, "terre_ilot")
    L.ajouter(v, roche, "roche_ilot")
    # des racines qui pendent du bord, et quelques touffes d'herbe qui débordent
    for k in range(5 if N.DETAIL >= 1 else 2):
        a = rng.random() * 6.28
        p0 = (cx + math.cos(a) * rb(a) * 0.98, cy + math.sin(a) * rb(a) * 0.98, z - 0.08)
        lg = r * (0.25 + 0.4 * rng.random())
        L.ajouter(*N.tube([p0, (p0[0] + math.cos(a) * 0.06, p0[1] + math.sin(a) * 0.06, p0[2] - lg * 0.5), (p0[0] + math.cos(a) * 0.04, p0[1] + math.sin(a) * 0.04, p0[2] - lg)], [0.025, 0.015, 0.006], 4, bouts=False), "ecorce_branche")

    def dessus(x, y):
        d, a = math.hypot(x - cx, y - cy), math.atan2(y - cy, x - cx)
        return z + _dz(min(1.0, d / rb(a)))

    ILOTS_FAITS[nom] = (c, r, dessus, [], rb)
    return dessus


def sur_ilot(nom, x, y, rayon, marge=0.12):
    """Cette place est-elle sur l'îlot (assez loin du bord) et libre de ce qui y est déjà posé ?"""
    c, r, _, pris, rb = ILOTS_FAITS[nom]
    if math.hypot(x - c[0], y - c[1]) + rayon > rb(math.atan2(y - c[1], x - c[0])) * 0.92 - marge:
        return False
    return all(Vf.penetration(Vf.rond(x, y, rayon), p) == 0 for _, p in pris)


def poser_ilot(nom, quoi, poly):
    ILOTS_FAITS[nom][3].append((quoi, poly))


def chute(L, lots, depart, cap, z_haut, z_bas, larg=0.18, avance=0.32, ecume=True, nuages=None):
    """Une cascade : l'eau quitte le bord d'un îlot vers `cap`, s'en écarte un peu et tombe jusqu'à z_bas en s'élargissant ;
    l'écume en bas, et les ronds de l'écume du site (repère)."""
    dx, dy = math.cos(cap), math.sin(cap)
    tx, ty = -dy, dx
    hauteur = z_haut - z_bas
    zs = [z_haut + 0.01, z_haut - 0.06] + [z_haut - 0.12 - hauteur * t for t in (0.05, 0.15, 0.3, 0.5, 0.7, 0.88, 1.0)]
    v, f, uv = [], [], []
    for k, zz in enumerate(zs):
        t = (z_haut - zz) / hauteur
        sort = avance * (0.0 if k == 0 else 0.55 if k == 1 else 0.75 + 0.6 * t ** 0.5)
        lg = larg * (1 + 1.1 * t)
        ox, oy = depart[0] + dx * sort, depart[1] + dy * sort
        ondule = 0.02 * math.sin(zz * 3.1)
        v += [(ox + tx * (lg + ondule), oy + ty * (lg + ondule), zz), (ox - tx * (lg - ondule), oy - ty * (lg - ondule), zz)]
        uv += [(0.0, (z_haut - zz) * 1.1), (1.0, (z_haut - zz) * 1.1)]
    for k in range(len(zs) - 1):
        f.append((2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2))
        f.append((2 * k + 2, 2 * k + 3, 2 * k + 1, 2 * k))  # l'eau se voit des deux côtés
    L.ajouter(v, f, "eau_chute", uv=uv)
    bas = (depart[0] + dx * avance * 1.35, depart[1] + dy * avance * 1.35)
    if ecume:
        for k in range(3):
            o = (k - 1) * larg * 1.2
            L.ajouter(*N.sphere(larg * (0.9 if k == 1 else 0.65), 8, 5, 0.45), "ecume_chute", T(bas[0] + tx * o, bas[1] + ty * o, z_bas + 0.02))
        lots["reperes"].append(((float(bas[0]), float(bas[1]), float(z_bas)), {"anim": "ecume", "rayon": larg * 2.6}))
    return bas


# --- les pièces ---
def maisonnette(L, V, rng, x, y, z, cap, lx=0.95, ly=0.72, hm=0.55, ht=0.36, mur="crepi_blanc", toit="tuiles_ciel"):
    """Une maison du village : un soubassement de pierre, des murs blanchis, un toit de tuiles bleues, la porte, des
    fenêtres (allumées la nuit), une cheminée. Sa façade (local -y) regarde vers cap - 90°. Renvoie son emprise."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.boite(lx + 0.04, ly + 0.04, 0.26, haut=False), "pierres", M @ T(0, 0, -0.2))
    L.ajouter(*N.boite(lx, ly, hm - 0.06, haut=False), mur, M @ T(0, 0, 0.06))
    L.ajouter(*N.pignons(lx, ly, ht), mur, M @ T(0, 0, hm))
    v, f = N.toit_pignon(lx, ly, ht, 0.1, 0.05)
    L.ajouter(v, [f[0], f[4]], toit, M @ T(0, 0, hm))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, hm))
    Mf = M @ T(0, -ly / 2, 0)
    xp = rng.choice([-1, 1]) * lx * 0.24
    L.ajouter(*N.quad((xp - 0.11, -0.012, 0.0), (xp + 0.11, -0.012, 0.0), (xp + 0.11, -0.012, 0.36), (xp - 0.11, -0.012, 0.36)), "porte", Mf)
    P.fenetre(L, V, rng, Mf, -xp, 0.18, 0.18, 0.2, volets="peint_bleu", allumee=True)
    P.fenetre(L, V, rng, M @ Rz(PI / 2) @ T(0, -lx / 2, 0), 0.0, 0.2, 0.16, 0.18, allumee=rng.random() < 0.6)
    P.fenetre(L, V, rng, M @ Rz(PI) @ T(0, -ly / 2, 0), 0.0, 0.2, 0.16, 0.18, allumee=False)
    P.cheminee(L, M, lx * 0.3, ly * 0.18, hm + ht * 0.45, 0.3, 0.13)
    return Vf.rectangle(x, y, lx + 0.1, ly + 0.1, cap)


def temple(L, U, lots, x, y, z):
    """Le Temple des Vents : une rotonde de marbre sur deux marches, huit colonnes, un dôme doré, et dedans la grande cloche
    (le vent la balance) ; quatre lanternes pendues entre les colonnes."""
    L.ajouter(*N.cylindre(1.0, 1.04, 0.18, 22, haut=True), "pierres_claires", T(x, y, z - 0.08))
    L.ajouter(*N.cylindre(0.88, 0.9, 0.1, 22, haut=True), "marbre", T(x, y, z + 0.1))
    nc = 8 if N.DETAIL >= 1 else 6
    for k in range(nc):
        a = k * 2 * PI / nc + PI / nc
        cx, cy = x + math.cos(a) * 0.72, y + math.sin(a) * 0.72
        L.ajouter(*N.cylindre(0.075, 0.075, 0.06, 8), "marbre", T(cx, cy, z + 0.2))
        L.ajouter(*N.cylindre(0.06, 0.052, 0.98, 8 if N.DETAIL >= 1 else 6, haut=False), "marbre", T(cx, cy, z + 0.26))
        L.ajouter(*N.boite(0.15, 0.15, 0.06), "marbre", T(cx, cy, z + 1.24) @ Rz(a))
    L.ajouter(*N.cylindre(0.86, 0.86, 0.16, 22, haut=True, bas=True), "marbre", T(x, y, z + 1.3))
    v, f = N.sphere(0.8, 18, 10, 0.85)
    dome = [q for q in f if all(v[i][2] >= -1e-6 for i in q)]
    L.ajouter(v, dome, "or", T(x, y, z + 1.46), doux=True)
    L.ajouter(*N.cylindre(0.06, 0.02, 0.38, 6), "or", T(x, y, z + 2.12))
    L.ajouter(*N.sphere(0.07, 8, 5), "or", T(x, y, z + 2.54))
    # la cloche : elle pend sous le dôme, à son joug ; le vent la balance (un objet à part)
    L.ajouter(*N.poutre((x - 0.5, y, z + 1.22), (x + 0.5, y, z + 1.22), 0.05), "planches_sombres")
    C = N.Maille("cloche")
    C.ajouter(*N.cylindre(0.012, 0.012, 0.1, 4), "fer", T(0, 0, -0.1))
    C.ajouter(*N.cylindre(0.11, 0.2, 0.3, 14, haut=True), "cuivre", T(0, 0, -0.4))
    C.ajouter(*N.cylindre(0.21, 0.21, 0.03, 14, haut=False), "cuivre", T(0, 0, -0.42))
    C.ajouter(*N.sphere(0.045, 6, 4), "fer", T(0, 0, -0.44))
    lots["animes"].append((C, (x, y, z + 1.2), {"anim": "balance", "axe": [1.0, 0.0, 0.0], "ampl": 0.16, "vitesse": 1.1}))
    for k in range(4):
        a = k * PI / 2
        A.lanterne(L, U, (x + math.cos(a) * 0.72, y + math.sin(a) * 0.72, z + 1.0), True, 0.3)
    return Vf.rond(x, y, 1.06, 14)


def carillon(L, lots, x, y, z, phase):
    """Un carillon à vent sur son poteau : un bras, et des tubes de cuivre qui se balancent (un objet à part)."""
    L.ajouter(*N.cylindre(0.025, 0.02, 0.62, 5, haut=False), "planches_sombres", T(x, y, z - 0.05))
    L.ajouter(*N.poutre((x, y, z + 0.55), (x + 0.16, y, z + 0.55), 0.02), "planches_sombres")
    C = N.Maille("carillon")
    C.ajouter(*N.cylindre(0.06, 0.06, 0.012, 8), "planches_sombres", T(0, 0, -0.05))
    for k in range(5):
        a = k * 2 * PI / 5
        h = 0.12 + 0.03 * k
        C.ajouter(*N.cylindre(0.008, 0.008, h, 4, haut=False), "cuivre", T(math.cos(a) * 0.045, math.sin(a) * 0.045, -0.06 - h))
    lots["animes"].append((C, (x + 0.16, y, z + 0.53), {"anim": "balance", "axe": [0.0, 1.0, 0.0], "ampl": 0.22, "vitesse": 1.6, "phase": phase}))


def ruche(L, x, y, z, cap):
    """Une ruche de bois : trois hausses blanches, un toit de planches, sur deux briques."""
    M = T(x, y, z) @ Rz(cap)
    for sx in (-0.07, 0.07):
        L.ajouter(*N.boite(0.05, 0.2, 0.06), "pierres_claires", M @ T(sx, 0, -0.02))
    for k in range(3):
        L.ajouter(*N.boite(0.22, 0.2, 0.075), ("bois_ruche", "planches_claires", "bois_ruche")[k], M @ T(0, 0, 0.04 + 0.078 * k))
    L.ajouter(*N.boite(0.27, 0.25, 0.03), "planches_sombres", M @ T(0, 0, 0.28))
    return Vf.rectangle(x, y, 0.27, 0.25, cap)


N.matiere("bois_ruche", N.tx_planches, 0.6, 0.5, c=0xece2c4, nb=4, graine=761, usure=0.4)


def moulinet(L, lots, x, y, z, cap, h=0.9):
    """Le petit moulin de la ferme : une tour de planches, et ses quatre ailes de toile qui tournent (un objet à part)."""
    L.ajouter(*N.cylindre(0.2, 0.14, h, 8, haut=False), "planches_claires", T(x, y, z - 0.05))
    v, f = N.toit_pointe(0.18, 0.26, 8, 0.04, 0.0)
    L.ajouter(v, f, "tuiles_ciel", T(x, y, z + h - 0.05))
    W = N.Maille("ailes")
    for k in range(4):
        a = k * PI / 2 + 0.3
        Ma = Rx(a)
        W.ajouter(*N.poutre((0, 0, 0), (0, 0, 0.62), 0.025), "planches_sombres", Ma)
        W.ajouter(*N.boite(0.008, 0.18, 0.44), "toile_ecrue", Ma @ T(0.0, 0.1, 0.16))
    W.ajouter(*N.sphere(0.05, 6, 4), "planches_sombres")
    o = (x + math.cos(cap) * 0.2, y + math.sin(cap) * 0.2, z + h * 0.8)
    lots["animes"].append((W, o, {"anim": "tourne", "axe": [math.cos(cap), math.sin(cap), 0.0], "vitesse": 1.1}))
    return Vf.rond(x, y, 0.22, 8)


def meule(L, x, y, z, r=0.26, h=0.42):
    """Une meule de foin."""
    L.ajouter(*N.cylindre(r, r * 0.95, h * 0.55, 10, haut=False), "paille", T(x, y, z - 0.03))
    v, f = N.toit_pointe(r * 0.98, h * 0.55, 10, 0.03, 0.0)
    L.ajouter(v, f, "paille", T(x, y, z + h * 0.5))
    return Vf.rond(x, y, r, 8)


def chaine(L, a, b, fleche=0.4, ep=0.05):
    """Une grosse chaîne de fer qui pend de a à b : des maillons en travers, l'un sur deux tourné d'un quart de tour."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    lg = float(np.linalg.norm(b - a))
    nb = max(4, int(lg / (0.16 if N.DETAIL >= 1 else 0.26)))
    pts = [a + (b - a) * (k / nb) - np.array((0, 0, fleche * 4 * (k / nb) * (1 - k / nb))) for k in range(nb + 1)]
    for k in range(nb):
        p, q = pts[k], pts[k + 1]
        L.ajouter(*N.poutre(tuple(p), tuple(q), ep if k % 2 else ep * 0.55, ep * 0.55 if k % 2 else ep), "fer")


def arc_point(t):
    """Un point de l'arc-en-ciel (Bézier cubique), t de 0 (le Seuil) à 1 (le Grand Îlot)."""
    a, c1, c2, b = (np.array(p, np.float64) for p in ARC)
    u = 1 - t
    return u ** 3 * a + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t ** 3 * b


def arc_en_ciel(L, U, larg=0.62, ep=0.05):
    """L'arc-en-ciel : six bandes de couleur côte à côte, une mince lame qui monte du Seuil jusqu'au Grand Îlot. Des cœurs
    bleus cachés dans son épaisseur (« astre ») : la nuit, le site y pose ses lumières. Renvoie le trajet du milieu."""
    nb = 44 if N.DETAIL >= 1 else 28
    pts = [arc_point(k / nb) for k in range(nb + 1)]
    trajet = []
    bandes = [[] for _ in range(7)]  # les bords des bandes, en travers
    for k, p in enumerate(pts):
        q = pts[min(nb, k + 1)] - pts[max(0, k - 1)]
        cap = math.atan2(q[1], q[0])
        nx, ny = -math.sin(cap), math.cos(cap)
        for j in range(7):
            o = -larg / 2 + larg * j / 6
            bandes[j].append((p[0] + nx * o, p[1] + ny * o, p[2]))
        trajet.append((float(p[0]), float(p[1]), float(p[2] + 0.02)))
    for j in range(6):
        v = bandes[j] + bandes[j + 1]
        haut = [(k, nb + 1 + k, nb + 1 + k + 1, k + 1) for k in range(nb)]
        L.ajouter(v, [tuple(reversed(q)) for q in haut], ARC_MATS[j])
        vb = [(x, y, z - ep) for x, y, z in v]
        L.ajouter(vb, haut, ARC_MATS[j])
    for cote, j in ((0, 0), (1, 6)):  # les deux tranches
        v = bandes[j] + [(x, y, z - ep) for x, y, z in bandes[j]]
        fs = [(k, k + 1, nb + 1 + k + 1, nb + 1 + k) for k in range(nb)]
        L.ajouter(v, fs if cote else [tuple(reversed(q)) for q in fs], ARC_MATS[min(j, 5)])
    pas = 5 if N.DETAIL >= 1 else 7
    for k in range(3, nb - 1, pas):
        p = pts[k]
        q = pts[k + 1] - pts[k - 1]
        cap = math.atan2(q[1], q[0])
        for j in (-1, 1):  # en travers de l'arc (à plat), bien dans son épaisseur
            M = T(p[0] - math.sin(cap) * j * 0.15, p[1] + math.cos(cap) * j * 0.15, p[2] - ep * 0.5)
            U.ajouter(*N.cylindre(0.03, 0.0, 0.012, 8, haut=False), "astre", M)
            U.ajouter(*N.cylindre(0.03, 0.0, 0.012, 8, haut=False), "astre", M @ Rx(PI))
    return trajet


def passant_marcheur(rng, nom, tient=None):
    Pm = N.Maille(nom)
    P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=tient)
    return Pm


def mailles(graine=611, leger=False):
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _mailles(graine, leger):
    global ARC
    rng = random.Random(graine)
    L, V, U = N.Maille("ile_corps"), N.Maille("ile_vitres"), N.Maille("ile_lumieres")
    lots = {"corps": L, "vitres": V, "lumieres": U, "bannieres": [], "animes": [], "copies": [], "libres": [], "reperes": []}
    SOL, emprises, ponts = [], [], []
    EN_L_AIR.clear()
    ILOTS_FAITS.clear()
    P.CHEMINEES.clear()
    lots["etapes"] = []
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))

    # --- le plan du Pied : le débarcadère, la place du village, les chemins (vers le bassin, le Seuil, le treuil) ---
    quai_mer, quai_terre = vers(-90, -1.6), vers(-90, 0.75)
    PLACE = (0.0, -3.3)
    rb_f0 = rayon_ilot(F[1], 903)
    cap_t = math.radians(-100)
    TREUIL = (F[0][0] + math.cos(cap_t) * (rb_f0(cap_t) + 0.32), F[0][1] + math.sin(cap_t) * (rb_f0(cap_t) + 0.32))  # sous le bras de la ferme : le panier monte et descend là
    chemin_bassin = [quai_terre, (0.0, -4.6), PLACE, (0.25, -1.9), (0.42, -0.55)]
    chemin_seuil = [PLACE, (-1.3, -3.05), (-2.6, -2.75), (-3.55, -2.35)]
    chemin_treuil = [PLACE, (1.4, -2.6), (2.7, -1.5), (3.55, -0.62)]
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (chemin_bassin, chemin_seuil, chemin_treuil)]
    couloirs = [(pts, 0.14) for pts in PISTES]
    loin_des_chemins = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=0.3):
        if terrain(x, y) < bas or not loin_des_chemins(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (48 if leger else 76), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[terrain(x, y) for x in xs] for y in xs]
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
            if max(H_[j][i], H_[j][i + 1], H_[j + 1][i + 1], H_[j + 1][i]) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_archipel", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)
    # le Bassin des Chutes : l'eau au fond du cratère, des rochers sur son bord
    L.ajouter(*N.cylindre(R_BASSIN + 0.12, R_BASSIN + 0.12, 0.02, 28, bas=False), "eau_lac", T(BASSIN[0], BASSIN[1], ZE - 0.02))
    SOL.append(("decor", "le Bassin des Chutes", Vf.rond(BASSIN[0], BASSIN[1], R_BASSIN + 0.3, 18)))
    for k in range(9 if leger else 16):
        a = k * 2 * PI / (9 if leger else 16) + rng.random() * 0.3
        rr = R_BASSIN + 0.05 + rng.random() * 0.12
        x, y = BASSIN[0] + math.cos(a) * rr, BASSIN[1] + math.sin(a) * rr
        A.rocher(L, rng, x, y, ZE - 0.05, 0.12 + rng.random() * 0.1, "roche")

    etape("le village")
    # --- le débarcadère et sa bannière, la barque, les maisons du Pied autour de la place, le puits, les lanternes ---
    Rf.tablier(L, quai_mer, quai_terre, ZQ, ZQ, 0.5)
    lg = quai_terre[1] - quai_mer[1]
    for t in (0.12, 0.45, 0.78):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.034, ZQ + 0.95, 6, haut=False), "planches_sombres", T(quai_mer[0] + s * 0.21, quai_mer[1] + lg * t, -0.95))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.5, PI / 2)
    emprises.append(("le débarcadère", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.34, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    P.barque(L, rng, quai_mer[0] - 0.55, quai_mer[1] + 0.9, math.radians(80), 0.75)
    maisons = [(-1.45, -4.35, 0.12), (1.5, -4.5, -0.18), (-2.15, -2.35, 0.42), (2.0, -3.3, -0.5), (1.45, -5.55, 0.08), (-1.2, -5.6, -0.1)]
    for k, (x, y, cap) in enumerate(maisons[: 4 if leger else 6]):
        if libre(x, y, 0.55):
            SOL.append(("decor", f"une maison ({x:.1f}, {y:.1f})", maisonnette(L, V, rng, x, y, sol(x, y), cap)))
    xp, yp = PLACE[0] - 0.6, PLACE[1] - 0.45  # le puits
    zp = sol(xp, yp)
    L.ajouter(*N.cylindre(0.2, 0.2, 0.26, 12, haut=False), "pierres", T(xp, yp, zp - 0.05))
    L.ajouter(*N.cylindre(0.17, 0.17, 0.02, 12, bas=False), "eau_source", T(xp, yp, zp + 0.12))
    for sx in (-0.17, 0.17):
        L.ajouter(*N.boite(0.04, 0.04, 0.55), "planches_sombres", T(xp + sx, yp, zp + 0.18))
    L.ajouter(*N.poutre((xp - 0.2, yp, zp + 0.72), (xp + 0.2, yp, zp + 0.72), 0.04), "planches_sombres")
    v, f = N.toit_pignon(0.5, 0.36, 0.16, 0.04, 0.03)
    L.ajouter(v, f, "tuiles_ciel", T(xp, yp, zp + 0.74))
    SOL.append(("decor", "le puits", Vf.rond(xp, yp, 0.24, 10)))
    for x, y in [(0.5, -4.9), (-0.5, -3.7), (0.55, -2.5), (-2.9, -2.35), (2.3, -1.85)][: 3 if leger else 5]:
        if libre(x, y, 0.06):
            P.lampadaire(L, U, x, y, sol(x, y))
            SOL.append(("rocher", "une lanterne", Vf.rond(x, y, 0.05)))

    etape("le Seuil et l'arc-en-ciel")
    # --- le Seuil : une plateforme ronde de pierre, trois marches, deux bornes à lanterne ; l'arc en part ---
    zs = sol(*SEUIL)
    z_seuil = zs + 0.16
    L.ajouter(*N.cylindre(0.62, 0.66, 0.4, 20, haut=True), "pierres_claires", T(SEUIL[0], SEUIL[1], z_seuil - 0.4))
    for k in range(3):
        L.ajouter(*N.boite(0.5, 0.16, z_seuil - zs - k * 0.055 + 0.15), "pierres_claires", T(SEUIL[0] + 0.62 + 0.08 + 0.15 * k, SEUIL[1] + 0.05, zs - 0.15) @ Rz(PI / 2))
    for s in (-1, 1):
        bx, by = SEUIL[0] + 0.5, SEUIL[1] + 0.05 + s * 0.5
        L.ajouter(*N.boite(0.12, 0.12, 0.62), "pierres_claires", T(bx, by, z_seuil - 0.05))
        A.lanterne(L, U, (bx, by, z_seuil + 0.72), True, 0.12)
    SOL.append(("decor", "le Seuil", Vf.rond(SEUIL[0], SEUIL[1], 0.68, 14)))
    (gx, gy), rg, zg, pg = G
    ARC = ((SEUIL[0] - 0.1, SEUIL[1] - 0.1, z_seuil), (-5.7, 0.0, 2.7), (-3.5, 2.0, 5.6), (gx + math.cos(math.radians(205)) * 1.72, gy + math.sin(math.radians(205)) * 1.72, zg + 0.04))
    trajet_arc = arc_en_ciel(L, U)

    etape("les îlots")
    # --- les îlots : le Grand (le temple), les Vergers, la Ferme, l'Épave, le Pavillon ---
    dessus_g = ilot(L, "grand", (gx, gy), rg, zg, pg, 901)
    dessus_v = ilot(L, "vergers", VG[0], VG[1], VG[2], VG[3], 902)
    (fx, fy), rf, zf, pf = F
    dessus_f = ilot(L, "ferme", (fx, fy), rf, zf, pf, 903)
    (ex, ey), re_, ze, pe = E
    dessus_e = ilot(L, "epave", (ex, ey), re_, ze, pe, 904)
    (px, py), rp, zpv, pp = PV
    dessus_p = ilot(L, "pavillon", (px, py), rp, zpv, pp, 905, n=12)

    etape("le Grand Îlot")
    rb_g = ILOTS_FAITS["grand"][4]
    TC = (gx, gy + 0.2)  # le temple, un peu au nord du milieu (la source est au sud)
    pol = lambda a, d: (TC[0] + math.cos(math.radians(a)) * d, TC[1] + math.sin(math.radians(a)) * d)
    poser_ilot("grand", "le temple", temple(L, U, lots, TC[0], TC[1], dessus_g(*TC)))
    poser_ilot("grand", "l'arrivée de l'arc", Vf.rond(ARC[3][0], ARC[3][1], 0.38, 10))
    L.ajouter(*N.cylindre(0.4, 0.42, 0.06, 12), "pierres_claires", T(ARC[3][0], ARC[3][1], ARC[3][2] - 0.05))
    # la source : un bassin rond au sud du temple, le ruisseau jusqu'au bord, la cascade jusqu'au Bassin des Chutes
    cap_chute = math.radians(-92)
    d_src = rb_g(cap_chute) - 0.62
    sx_, sy_ = gx + math.cos(cap_chute) * d_src, gy + math.sin(cap_chute) * d_src
    zsrc = dessus_g(sx_, sy_)
    L.ajouter(*N.cylindre(0.3, 0.32, 0.1, 14, haut=False), "pierres_claires", T(sx_, sy_, zsrc - 0.04))
    L.ajouter(*N.cylindre(0.27, 0.27, 0.02, 14, bas=False), "eau_source", T(sx_, sy_, zsrc + 0.03))
    poser_ilot("grand", "la source", Vf.rond(sx_, sy_, 0.34, 10))
    bord_g = (gx + math.cos(cap_chute) * rb_g(cap_chute) * 0.97, gy + math.sin(cap_chute) * rb_g(cap_chute) * 0.97)
    pts_r = (sx_ + math.cos(cap_chute) * 0.28, sy_ + math.sin(cap_chute) * 0.28)
    zr0, zr1 = dessus_g(*pts_r) + 0.02, dessus_g(*bord_g) + 0.01
    Rf.tablier(L, pts_r, bord_g, zr0, zr1, 0.16, 0.02, "eau_source")
    chute(L, lots, bord_g, cap_chute, zr1, ZE, 0.16, 0.3)
    # le pont de corde vers les Vergers (il part du bord ouest)
    (vx, vy), rv, zv, pv = VG
    rb_v = ILOTS_FAITS["vergers"][4]
    cap_pont = math.atan2(vy - gy, vx - gx)
    pa = (gx + math.cos(cap_pont) * (rb_g(cap_pont) - 0.2), gy + math.sin(cap_pont) * (rb_g(cap_pont) - 0.2))
    pb = (vx - math.cos(cap_pont) * (rb_v(cap_pont + PI) - 0.2), vy - math.sin(cap_pont) * (rb_v(cap_pont + PI) - 0.2))
    trajet_pont, _ = A.pont_de_corde(L, (pa[0], pa[1], dessus_g(*pa) + 0.03), (pb[0], pb[1], dessus_v(*pb) + 0.03), 0.4, 0.14)
    poser_ilot("grand", "le pont de corde", Vf.rond(pa[0], pa[1], 0.28))
    poser_ilot("vergers", "le pont de corde", Vf.rond(pb[0], pb[1], 0.28))
    # le jardin : deux carillons, deux lanternes, des arbres en fleurs, des fleurs semées ; le gardien fait le tour par le nord
    for k, a in enumerate((70, 112)):
        x, y = pol(a, 1.47)
        if sur_ilot("grand", x, y, 0.1, 0.0):
            carillon(L, lots, x, y, dessus_g(x, y), k * 1.7)
            poser_ilot("grand", "un carillon", Vf.rond(x, y, 0.08))
    for a in (-48, -132):
        x, y = pol(a, 1.5)
        if sur_ilot("grand", x, y, 0.06, 0.05):
            P.lampadaire(L, U, x, y, dessus_g(x, y), 0.55)
            poser_ilot("grand", "une lanterne", Vf.rond(x, y, 0.06))
    faits = 0
    for a in (20, 40, 140, 160, -20, -160, 90, 0, 180, -70):
        if faits >= (3 if leger else 6):
            break
        x, y = pol(a, 1.52)
        if sur_ilot("grand", x, y, 0.22, 0.0):
            zz = dessus_g(x, y)
            L.ajouter(*N.tube([(x, y, zz - 0.1), (x + 0.04, y, zz + 0.4), (x - 0.02, y + 0.03, zz + 0.7)], [0.06, 0.045, 0.03], 6, bouts=False), "ecorce_branche")
            for j in range(3):
                b = j * 2.1 + a
                A.grappe(L, rng, x + math.cos(b) * 0.16, y + math.sin(b) * 0.16, zz + 0.82 + 0.08 * (j % 2), 0.3 if j == 0 else 0.22, 0.78, ("fleur_rose", "frondaison_claire", "fleur_rose")[j], fin=False, agite=0.72)
            poser_ilot("grand", "un arbre en fleurs", Vf.rond(x, y, 0.22))
            faits += 1
    hasard = random.Random(77)
    for _ in range(60 if not leger else 20):
        a, d = hasard.random() * 360, 1.5 + hasard.random() * 0.5
        x, y = pol(a, d)
        if sur_ilot("grand", x, y, 0.07, 0.0):
            L.ajouter(*N.sphere(0.06, 5, 3, 0.7), hasard.choice(["fleur_rose", "fleur_blanche", "fleur_jaune"]), T(x, y, dessus_g(x, y) + 0.02))
    ronde = [pol(a, 1.25) for a in range(-20, 201, 10)]
    EN_L_AIR.append(("le gardien du temple", [(x, y, dessus_g(x, y) + 0.01) for x, y in ronde], False, "grand"))

    etape("les Vergers")
    xc, yc = vx - 0.3, vy + 0.55
    if sur_ilot("vergers", xc, yc, 0.4, 0.0):
        haut_c = A.cabane(L, V, U, rng, T(xc, yc, dessus_v(xc, yc)) @ Rz(-0.4), 0.72, 0.55, 0.42, 0.3)
        P.CHEMINEES.append(haut_c)
        poser_ilot("vergers", "la cabane du verger", Vf.rectangle(xc, yc, 0.8, 0.62, -0.4))
    cap_cv = math.radians(165)
    bord_v = (vx + math.cos(cap_cv) * rb_v(cap_cv) * 0.95, vy + math.sin(cap_cv) * rb_v(cap_cv) * 0.95)
    zbv = dessus_v(*bord_v)
    src_v = (vx - 0.55, vy + 0.0)
    Rf.tablier(L, src_v, bord_v, dessus_v(*src_v) + 0.02, zbv + 0.01, 0.12, 0.02, "eau_source")
    L.ajouter(*N.cylindre(0.12, 0.13, 0.06, 10, haut=False), "pierres_claires", T(src_v[0], src_v[1], dessus_v(*src_v) - 0.02))
    poser_ilot("vergers", "le ruisseau", Vf.rectangle((src_v[0] + bord_v[0]) / 2, (src_v[1] + bord_v[1]) / 2, math.dist(src_v, bord_v) + 0.2, 0.2, math.atan2(bord_v[1] - src_v[1], bord_v[0] - src_v[0])))
    chute(L, lots, bord_v, cap_cv, zbv, 0.0, 0.13, 0.25)
    for k, (dx_, dy_) in enumerate(((0.25, -0.8), (0.58, -0.62))):
        x, y = vx + dx_, vy + dy_
        if sur_ilot("vergers", x, y, 0.16, 0.0):
            poser_ilot("vergers", "une ruche", ruche(L, x, y, dessus_v(x, y), 0.3 + k * 0.4))
    for k, (dx_, dy_) in enumerate(((0.55, 0.4), (-0.75, -0.38), (-0.15, -0.45), (0.05, 0.12), (0.62, -0.05))[: 3 if leger else 5]):
        x, y = vx + dx_, vy + dy_
        if sur_ilot("vergers", x, y, 0.22, 0.0):
            zz = dessus_v(x, y)
            A.petit_arbre(L, rng, x, y, zz, 1.0, 0.42)
            for j in range(4 if not leger else 2):
                b = j * 1.6 + k
                L.ajouter(*N.sphere(0.04, 5, 3), "fruits", T(x + math.cos(b) * 0.3, y + math.sin(b) * 0.3, zz + 0.72 + 0.1 * (j % 2)))
            poser_ilot("vergers", "un pommier", Vf.rond(x, y, 0.2))
    fin_g = (pa[0] - math.cos(cap_pont) * 0.38, pa[1] - math.sin(cap_pont) * 0.38)  # tout droit dans l'axe du pont
    EN_L_AIR.append(("le cueilleur", [(vx + 0.35, vy - 0.3, dessus_v(vx + 0.35, vy - 0.3) + 0.01)] + [pt for pt in trajet_pont[::-1]] + [(fin_g[0], fin_g[1], dessus_g(*fin_g) + 0.01)], False, None))

    etape("la Ferme")
    # --- la Ferme : la maison, la meule de foin, le moulin, les moutons dans leur enclos, le bras du panier ---
    xm, ym = fx + 0.15, fy + 0.35
    poser_ilot("ferme", "la ferme", maisonnette(L, V, rng, xm, ym, dessus_f(xm, ym), 0.25, 0.8, 0.6, 0.48, 0.32))
    for k, (dx_, dy_) in enumerate(((-0.62, 0.35), (-0.55, -0.15))):
        x, y = fx + dx_, fy + dy_
        if sur_ilot("ferme", x, y, 0.24):
            poser_ilot("ferme", "une meule de foin", meule(L, x, y, dessus_f(x, y), 0.2 + 0.04 * k, 0.36))
    x, y = fx + 0.75, fy - 0.25
    if sur_ilot("ferme", x, y, 0.22, 0.05):
        poser_ilot("ferme", "le moulin", moulinet(L, lots, x, y, dessus_f(x, y), math.radians(-60)))
    for k in range(4 if not leger else 2):
        x, y = fx - 0.1 + 0.32 * (k % 2), fy - 0.55 + 0.22 * (k // 2)
        if sur_ilot("ferme", x, y, 0.1):
            Vt.mouton(L, rng, x, y, dessus_f(x, y), rng.random() * 6.28, k % 2 == 0)
            poser_ilot("ferme", "un mouton", Vf.rond(x, y, 0.1))
    cap_bras = math.atan2(TREUIL[1] - fy, TREUIL[0] - fx)
    pied_bras = (fx + math.cos(cap_bras) * (rf * 0.82), fy + math.sin(cap_bras) * (rf * 0.82))
    zb = dessus_f(*pied_bras)
    L.ajouter(*N.boite(0.1, 0.1, 0.82), "planches_sombres", T(pied_bras[0], pied_bras[1], zb - 0.05))
    L.ajouter(*N.poutre((pied_bras[0], pied_bras[1], zb + 0.72), (TREUIL[0], TREUIL[1], zb + 0.72), 0.07), "planches_sombres")
    L.ajouter(*N.poutre((pied_bras[0], pied_bras[1], zb + 0.3), (pied_bras[0] + (TREUIL[0] - pied_bras[0]) * 0.55, pied_bras[1] + (TREUIL[1] - pied_bras[1]) * 0.55, zb + 0.7), 0.045), "planches_sombres")
    L.ajouter(*N.cylindre(0.07, 0.07, 0.05, 10), "fer", T(TREUIL[0], TREUIL[1], zb + 0.62) @ Rx(PI / 2) @ T(0, 0, -0.025))
    poser_ilot("ferme", "le bras du panier", Vf.rond(pied_bras[0], pied_bras[1], 0.08))
    EN_L_AIR.append(("le fermier", [(fx - 0.6, fy - 0.6, dessus_f(fx - 0.6, fy - 0.6) + 0.01), (fx + 0.05, fy - 0.85, dessus_f(fx + 0.05, fy - 0.85) + 0.01), (pied_bras[0] + (fx - pied_bras[0]) * 0.32, pied_bras[1] + (fy - pied_bras[1]) * 0.32, dessus_f(pied_bras[0] + (fx - pied_bras[0]) * 0.32, pied_bras[1] + (fy - pied_bras[1]) * 0.32) + 0.01)], False, "ferme"))

    etape("l'Épave et le Pavillon")
    # --- l'Épave : un petit navire échoué, couché sur l'îlot, la proue au-dessus du vide ; une échelle de corde qui pend ---
    W, Wv = N.Maille("epave"), N.Maille("epave_vitres")
    P.caboteur(W, Wv, rng, 0.0, 0.0, 0.0, 1.9, "toile_ecrue", "peint_bleu")
    cap_n = math.radians(200)  # couché sur le flanc, la proue qui dépasse du bord et pique vers le vide
    nx_, ny_ = ex + math.cos(cap_n) * 0.3, ey + math.sin(cap_n) * 0.3
    A.fondre(L, W, T(nx_, ny_, dessus_e(nx_, ny_) - 0.26) @ Rz(cap_n) @ Rx(0.55) @ Ry(0.16))
    poser_ilot("epave", "le navire échoué", Vf.rectangle(nx_, ny_, 1.9, 0.8, cap_n))
    for k, (dx_, dy_, quoi) in enumerate(((0.35, 0.55, "caisse"), (0.62, 0.3, "tonneau"), (0.15, 0.78, "caisse"), (-0.2, 0.62, "tonneau"))):
        x, y = ex + dx_, ey + dy_
        if sur_ilot("epave", x, y, 0.12, 0.0):
            Mc = T(x, y, dessus_e(x, y) - 0.02) @ Rz(k * 0.9) @ (Rx(PI / 2) if quoi == "tonneau" and k > 1 else np.eye(4))
            P.caisse(L, Mc, 0.18) if quoi == "caisse" else P.tonneau(L, Mc, 0.08, 0.2)
            poser_ilot("epave", "une épave de cargaison", Vf.rond(x, y, 0.12))
    if sur_ilot("epave", ex + 0.55, ey - 0.55, 0.06, 0.0):  # elle éclaire le haut de l'échelle
        P.lampadaire(L, U, ex + 0.55, ey - 0.55, dessus_e(ex + 0.55, ey - 0.55), 0.5)
        poser_ilot("epave", "une lanterne", Vf.rond(ex + 0.55, ey - 0.55, 0.06))
    for k in range(2):  # l'échelle de corde qui pend vers le Grand Îlot
        s = (k - 0.5) * 0.24
        L.ajouter(*N.tube([(ex + 0.55 + s, ey - 0.95, dessus_e(ex, ey) - 0.02), (ex + 0.6 + s, ey - 1.05, dessus_e(ex, ey) - 1.0)], 0.01, 4, bouts=False), "corde_arbre")
    for k in range(6):
        zz = dessus_e(ex, ey) - 0.12 - 0.16 * k
        L.ajouter(*N.poutre((ex + 0.43, ey - 0.96 - 0.016 * k, zz), (ex + 0.67, ey - 0.96 - 0.016 * k, zz), 0.022), "planches_claires")
    # --- le Pavillon : tout en haut, un mât et un pavillon noir, sans emblème (un objet à part : il claque au vent) ---
    zh = dessus_p(px, py)
    L.ajouter(*N.cylindre(0.03, 0.022, 1.1, 6), "planches_sombres", T(px, py, zh - 0.05))
    Fl = N.Maille("pavillon_noir")
    nbf = 4
    vfl, ffl = [], []
    for k in range(nbf + 1):
        t = k / nbf
        yy = math.sin(t * PI * 1.4) * 0.03
        vfl += [(0.03 + 0.5 * t, yy, 0.0), (0.03 + 0.5 * t, yy, -0.32)]
    for k in range(nbf):
        ffl.append((k * 2, k * 2 + 2, k * 2 + 3, k * 2 + 1))
        ffl.append((k * 2 + 1, k * 2 + 3, k * 2 + 2, k * 2))
    Fl.ajouter(vfl, ffl, "ruban_noir")
    lots["animes"].append((Fl, (px, py, zh + 1.02), {"anim": "drapeau", "ampl": 0.18, "vitesse": 1.4, "phase": 0.7}))

    etape("le treuil et les chaînes")
    # --- le treuil d'en bas : sa cabane, sa roue (elle tourne), le câble jusqu'au bras ; le panier monte et descend ---
    zt = sol(*TREUIL)
    xt, yt = TREUIL[0] + 0.62, TREUIL[1] - 0.35
    haut_t = A.cabane(L, V, U, rng, T(xt, yt, sol(xt, yt)) @ Rz(math.radians(60)), 0.7, 0.5, 0.42, 0.28)
    P.CHEMINEES.append(haut_t)
    SOL.append(("decor", "la cabane du treuil", Vf.rectangle(xt, yt, 0.8, 0.6, math.radians(60))))
    xr, yr = TREUIL[0] - 0.42, TREUIL[1] - 0.22
    zr = sol(xr, yr)
    for s_ in (-0.09, 0.09):
        L.ajouter(*N.poutre((xr + s_, yr, zr - 0.05), (xr + s_, yr, zr + 0.45), 0.05), "planches_sombres")
    Rw = N.Maille("roue")
    Rw.ajouter(*N.cylindre(0.3, 0.3, 0.05, 14), "planches", Ry(PI / 2) @ Rz(0.0) @ T(0, 0, -0.025))
    for k in range(4):
        Rw.ajouter(*N.poutre((0, 0, 0), (0, math.cos(k * PI / 4) * 0.36, math.sin(k * PI / 4) * 0.36), 0.03), "planches_sombres")
        Rw.ajouter(*N.poutre((0, 0, 0), (0, -math.cos(k * PI / 4) * 0.36, -math.sin(k * PI / 4) * 0.36), 0.03), "planches_sombres")
    lots["animes"].append((Rw, (xr, yr, zr + 0.4), {"anim": "tourne", "axe": [1.0, 0.0, 0.0], "vitesse": 0.6}))
    SOL.append(("decor", "la roue du treuil", Vf.rond(xr, yr, 0.2)))
    L.ajouter(*N.poutre((xr, yr, zr + 0.4), (TREUIL[0], TREUIL[1], zt + 0.08), 0.012), "corde_arbre")
    L.ajouter(*N.poutre((TREUIL[0], TREUIL[1], zt + 0.05), (TREUIL[0], TREUIL[1], zb + 0.6), 0.012), "corde_arbre")
    L.ajouter(*N.boite(0.3, 0.3, 0.04), "planches_sombres", T(TREUIL[0], TREUIL[1], zt - 0.02))
    SOL.append(("decor", "le pied du câble", Vf.rond(TREUIL[0], TREUIL[1], 0.18)))
    Pn = N.Maille("panier")
    Pn.ajouter(*N.cylindre(0.15, 0.17, 0.18, 10, haut=False, bas=True), "paille")
    for k in range(3):
        a = k * 2 * PI / 3
        Pn.ajouter(*N.poutre((math.cos(a) * 0.15, math.sin(a) * 0.15, 0.18), (0, 0, 0.55), 0.008), "corde_arbre")
    for k in range(3):
        Pn.ajouter(*N.sphere(0.05, 5, 3), "fruits", T(-0.05 + 0.05 * k, 0.02 * (k % 2), 0.17))
    chemin_panier = [(TREUIL[0], TREUIL[1], zt + 0.03), (TREUIL[0], TREUIL[1], zb - 0.05)]
    lots["animes"].append((Pn, chemin_panier[0], {"anim": "marche", "chemin": [float(c) for p in chemin_panier for c in p], "vitesse": 0.35, "phase": 0.2, "saut": 0.0, "pause": 4.0, "suspendu": 1}))
    # les chaînes qui retiennent les îlots, et leurs bornes
    for (bx, by), haut_ch in (((2.3, 4.6), (gx + 1.0, gy + 1.2, zg - pg * 0.55)), ((-1.0, 4.5), (gx - 0.9, gy + 1.0, zg - pg * 0.55)), ((-3.2, 1.6), (vx + 0.5, vy - 0.5, zv - pv * 0.5)), ((5.4, 0.2), (fx + 0.6, fy - 0.4, zf - pf * 0.5)))[: 3 if leger else 4]:
        if libre(bx, by, 0.2, 0.2):
            zbb = sol(bx, by)
            L.ajouter(*N.cylindre(0.2, 0.24, 0.42, 8), "pierres", T(bx, by, zbb - 0.1))
            L.ajouter(*N.cylindre(0.08, 0.08, 0.06, 8), "fer", T(bx, by, zbb + 0.32))
            chaine(L, (bx, by, zbb + 0.36), haut_ch, 0.35)
            SOL.append(("decor", "une borne de chaîne", Vf.rond(bx, by, 0.24, 8)))

    etape("les cailloux volants et les nuages")
    # --- les cailloux volants : de petits îlots qui montent et descendent doucement (chacun un objet à part) ---
    cailloux = [(-2.6, 0.8, 3.2, 0.32), (2.4, -0.2, 2.6, 0.26), (-5.6, 1.2, 2.4, 0.3), (5.8, 3.8, 4.8, 0.38), (-3.4, 6.0, 5.6, 0.34), (1.6, 6.2, 6.4, 0.3), (-6.0, 4.8, 6.2, 0.25), (3.0, -2.8, 3.6, 0.22)]
    for k, (x, y, z, r) in enumerate(cailloux[: 4 if leger else 8]):
        C = N.Maille(f"caillou{k}")
        ilot(C, f"caillou{k}", (0.0, 0.0), r, 0.0, r * 1.6, 950 + k, n=10)
        if k % 3 == 0:
            A.buisson(C, rng, 0.0, 0.0, 0.05, r * 0.45)
        lots["animes"].append((C, (x, y, z), {"anim": "flotte", "ampl": 0.1 + 0.03 * (k % 3), "phase": k * 1.3}))
    # des nuages accrochés sous les grands îlots
    for (cx, cy, cz, s) in ((gx - 1.2, gy - 0.4, zg - 1.4, 0.55), (gx + 1.1, gy + 0.6, zg - 1.7, 0.45), (vx + 0.3, vy - 0.6, zv - 1.1, 0.42), (fx - 0.2, fy + 0.6, zf - 1.0, 0.38))[: 2 if leger else 4]:
        for j in range(3):
            L.ajouter(*N.sphere(s * (1.0 if j == 0 else 0.7), 9, 6, 0.55), "nuage", T(cx + (j - 1) * s * 0.9, cy + (j % 2) * s * 0.3, cz + (0.05 if j == 0 else -0.05)), doux=True)

    etape("les arbres et les rochers du Pied")
    for k in range(9 if leger else 16):
        x, y = vers(rng.random() * 360, 1.4 + rng.random() * 2.8)
        sous_arc = any(math.hypot(x - q[0], y - q[1]) < 1.0 for q in trajet_arc if q[2] < sol(x, y) + 2.4)
        if libre(x, y, 0.4) and y > -3.0 and math.hypot(x - BASSIN[0], y - BASSIN[1]) > R_BASSIN + 0.8 and not sous_arc:
            A.petit_arbre(L, rng, x, y, sol(x, y), 1.1 + 0.4 * rng.random(), 0.5)
            SOL.append(("arbre", "un arbre", Vf.rond(x, y, 0.22)))
    for k in range(10 if leger else 22):
        x, y = vers(rng.random() * 360, 0.2 + rng.random() * 0.7)
        if libre(x, y, 0.2, 0.05):
            A.rocher(L, rng, x, y, sol(x, y) - 0.05, 0.14 + 0.16 * rng.random(), "roche_claire")
            SOL.append(("rocher", "un rocher", Vf.rond(x, y, 0.16)))

    etape("les habitants")
    # --- les habitants du Pied : posés, et ceux qui marchent ; le pèlerin de l'arc, le cueilleur, le gardien, le fermier ---
    for k, (x, y, cap) in enumerate([(-0.55, -4.05, 0.4), (0.62, -2.95, 2.4), (-3.4, -1.95, 3.5), (3.4, -0.95, 1.0), (1.3, -0.6, 1.6)][: 3 if leger else 5]):
        if libre(x, y, 0.07):
            P.passant(L, rng, x, y, angle=cap, z=sol(x, y))
            SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))
    for nom, (x, y), dessus, cap in (("vergers", (vx + 0.2, vy + 0.15), dessus_v, 2.0), ("ferme", (fx - 0.45, fy - 0.4), dessus_f, 0.6), ("epave", (ex + 0.3, ey - 0.62), dessus_e, -1.0)):
        if sur_ilot(nom, x, y, 0.07):
            P.passant(L, rng, x, y, angle=cap, z=dessus(x, y))
            poser_ilot(nom, "un habitant", Vf.rond(x, y, 0.065))
    chemins = [
        (K.suivre([quai_mer] + chemin_bassin, sol, 0.22), False, 0.15, 0.0, 3.0),
        (K.suivre(chemin_seuil, sol, 0.22), False, 0.14, 0.5, 2.0),
        (K.suivre(chemin_treuil, sol, 0.22), False, 0.15, 0.3, 3.0),
    ]
    for pts, *_ in chemins:  # sur le débarcadère, on marche sur les planches
        for k, q in enumerate(pts):
            if bord(q[0], q[1]) < 0.75 and abs(q[0]) < 0.3:
                pts[k] = (q[0], q[1], ZQ + 0.02)
    marcheurs = [passant_marcheur(rng, f"marcheur{k}", ("toile_ecrue", None, "fruits")[k]) for k in range(3)]
    deja = {}

    def marcher(k_type, pts, rond, vit, depart, pause, suspendu=False):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        if rond:
            extras["boucle"] = 1
        if suspendu:
            extras["suspendu"] = 1
        if k_type not in deja:
            deja[k_type] = len(lots["animes"])
            lots["animes"].append((marcheurs[k_type], pts[0], extras))
        else:
            lots["copies"].append((deja[k_type], pts[0], extras))

    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:2] if leger else chemins):
        marcher(k % 2, pts, rond, vit, depart, pause)
    marcher(1, trajet_arc, False, 0.13, 0.15, 3.0, True)  # le pèlerin de l'arc-en-ciel
    EN_L_AIR.append(("le pèlerin de l'arc", trajet_arc, False, None))
    for nom, pts, rond, ilot_ in EN_L_AIR:
        if nom == "le pèlerin de l'arc" or (leger and nom != "le gardien du temple"):
            continue
        marcher(2 if nom == "le cueilleur" else 0, pts, rond, 0.12, 0.35, 2.5, True)

    etape("la vie")
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in P.CHEMINEES for c in p], "grosseur": 0.4}))
    lots["reperes"].append(((float(gx), float(gy), float(zg - 2.6)), {"anim": "brume", "nb": 5 if leger else 8, "rayon": 7.5, "haut": 0.6}))
    lots["reperes"].append(((float(gx), float(gy), float(zg + 1.2)), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 4.5}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.0, "genre": 2}))

    etape("sur l'eau")
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 0.9 / math.hypot(x, y)), y * (1 + 0.9 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    qa, qb = np.array(quai_mer), np.array(vers(-90, 0.0))
    K.tache(Rv, *((qa + qb) / 2), float(np.linalg.norm(qb - qa)), 0.56, PI / 2)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan : celles du Pied (barhaw_ile_v5.controler), puis celles d'en haut : deux choses l'une dans
    l'autre sur un même îlot, un marcheur d'en haut qui bute ou qui n'est pas sur son îlot."""
    lots = lots or mailles(leger=leger)
    erreurs = K.controler(lots, sol)
    for nom, (c, r, dessus, pris, rb) in ILOTS_FAITS.items():
        for i in range(len(pris)):
            for j in range(i + 1, len(pris)):
                e = Vf.penetration(pris[i][1], pris[j][1])
                if e > 0.03 and "habitant" not in pris[i][0] + pris[j][0] and "mouton" not in pris[i][0] + pris[j][0]:
                    erreurs.append(f"{nom} : {pris[i][0]} et {pris[j][0]} se chevauchent de {e:.2f}")
    O = Vf.Obstacles(lots["corps"])
    for nom, pts, rond, ilot_ in EN_L_AIR:
        if leger and nom not in ("le gardien du temple", "le pèlerin de l'arc"):
            continue
        bloques = Vf.chemin_bloque(pts, O, 0.07, rond, 0.17)
        if bloques:
            erreurs.append(f"{nom} bute {len(bloques)} fois, par exemple en {bloques[0]} et {bloques[-1]}")
        if ilot_:
            dessus = ILOTS_FAITS[ilot_][2]
            for q in Vf.points_du_chemin(pts, rond):
                if abs(q[2] - dessus(q[0], q[1])) > 0.15:
                    erreurs.append(f"{nom} n'est pas sur son îlot en ({q[0]:.2f}, {q[1]:.2f})")
                    break
    return erreurs


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("archipel-v5", (1.5, -31.0, 19.0), (0.0, 1.0, 3.0), 50), ("archipel-v5-temple", (-5.5, -9.5, 8.0), (0.0, 2.0, 4.6), 45)] if rendu else []
    return K.construire("ile-archipel-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="archipel")
