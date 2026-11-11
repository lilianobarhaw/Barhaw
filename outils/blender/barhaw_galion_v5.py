# Le galion de la flotte, « niveau 5 » (démo, voir barhaw_niveau5.py) : un navire inventé, bien plus détaillé que celui de la V4.
# Coque bordée (carène, préceinte goudronnée, sabords et canons, bande peinte), château arrière à galerie dorée et bouteilles,
# gaillard d'avant, éperon et figure de proue (un hippocampe doré, inventé), trois mâts, hunes, vergues, haubans et enfléchures,
# roue, cabestan, caillebotis, chaloupe, ancres, lanternes de poupe, équipage.
# Ce qui change d'une commu à l'autre reste à part : les voiles, le drapeau et la flamme (matières du site, il y dessine
# l'emblème), et les bandes peintes (cuites en blanc, « zones » 1 et 2 : le site les teinte aux deux couleurs de la commu).
# Sorties : navire-v5.glb (+ -leger) et son atlas navire-v5.png.   Usage, dans Blender : import barhaw_galion_v5 as G; G.construire()
import math, os, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_port_v5 as P

PI = math.pi
T, Rz, Rx, Ry, S = N.T, N.Rz, N.Rx, N.Ry, N.S


# ---------- les matières du galion ----------
def tx_dorure(c=0xe6b041, sombre=0x5e3a14, graine=310, g=3):
    """Du bois sculpté et doré : des volutes dans des médaillons, un rang de perles."""
    n = N.TAILLE
    x, y = N.grille(n)
    fx, fy = (x * g) % 1 - 0.5, (y * g) % 1 - 0.5
    r = np.hypot(fx, fy)
    a = np.arctan2(fy, fx)
    volute = np.sin(r * 30 - a * 3) * 0.5 + 0.5
    motif = N.lisse(0.3, 0.7, volute) * (r < 0.43) + N.lisse(0.035, 0.0, np.abs(r - 0.46))
    perles = N.lisse(0.5, 0.2, np.hypot(((x * g * 4) % 1) - 0.5, ((y * g + 0.5) % 1 - 0.5) * 4)) * (np.abs(((y * g + 0.5) % 1) - 0.5) < 0.08)
    motif = np.clip(motif + perles, 0, 1)
    b = N.bruit(n, 6, 6, graine, 3)
    coul = N.mel(np.broadcast_to(N.hexa(sombre), (n, n, 3)), np.broadcast_to(N.hexa(c), (n, n, 3)), 0.22 + 0.78 * motif) * (0.82 + 0.36 * b)[..., None]
    coul = coul + (N.lisse(0.75, 1.0, motif) * 0.12)[..., None]
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.15 + 0.8 * motif, 0, 1).astype(np.float32)


def tx_sabord(bois=0x4a2f1c, graine=311):
    """Un sabord ouvert (une image entière) : le cadre, le trou noir de la batterie."""
    n = 128
    x, y = N.grille(n)
    bord = np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y))
    coul = np.broadcast_to(N.hexa(bois), (n, n, 3)).copy() * (0.8 + 0.4 * N.bruit(n, 4, 16, graine, 2))[..., None]
    trou = bord > 0.16
    coul[trou] = N.hexa(0x140e0c)
    coul[trou] += (N.lisse(0.5, 0.16, bord)[trou] * 0.08)[..., None]
    return np.clip(coul, 0, 1).astype(np.float32), np.where(trou, 0.0, 0.8).astype(np.float32)


def tx_caillebotis(bois=0x8a6238, graine=312, g=6):
    """Un caillebotis : une grille de lattes, les trous sombres de la cale."""
    n = N.TAILLE
    x, y = N.grille(n)
    fx, fy = (x * g) % 1, (y * g) % 1
    latte = (np.minimum(fx, 1 - fx) < 0.2) | (np.minimum(fy, 1 - fy) < 0.2)
    coul = np.where(latte[..., None], N.hexa(bois) * (0.8 + 0.4 * N.bruit(n, 8, 8, graine, 3))[..., None], N.hexa(0x17100c))
    return np.clip(coul, 0, 1).astype(np.float32), latte.astype(np.float32)


N.matiere("bordage", N.tx_planches, 0.66, 0.7, c=0x7c4b2a, nb=6, graine=301, usure=0.3)
N.matiere("bordage_sombre", N.tx_planches, 0.66, 0.7, c=0x33291f, nb=6, graine=302, usure=0.1)
N.matiere("carene", N.tx_planches, 0.8, 0.4, c=0x8f937c, nb=6, graine=303, usure=0.6)
N.matiere("peinture1", N.tx_planches, 0.66, 0.4, c=0xf1ebe0, nb=6, graine=304, usure=0.0)
N.matiere("peinture2", N.tx_planches, 0.66, 0.4, c=0xf1ebe0, nb=6, graine=305, usure=0.0)
N.matiere("dorure", tx_dorure, 0.42, 0.9, rugueux=0.45, metal=0.35)
N.matiere("pont_galion", N.tx_planches, 0.56, 0.6, c=0xb48c5c, nb=8, graine=306, usure=0.55)
N.matiere("mature", N.tx_planches, 0.7, 0.3, c=0xa9743c, nb=3, graine=307, usure=0.25)
N.matiere("canon", N.tx_uni, 0.6, 0.3, rugueux=0.45, metal=0.5, c=0x2b2b30, graine=308, taches=0.3, c2=0x6a4a2e, seuil=0.72)
N.matiere("laiton", N.tx_uni, 0.6, 0.3, rugueux=0.35, metal=0.5, c=0xd2a348, graine=309, taches=0.4, c2=0x8f6a26, seuil=0.7)
N.matiere("sabord", tx_sabord, 0, 0.6)
N.matiere("caillebotis", tx_caillebotis, 0.42, 0.7)
N.matiere("fenetre_poupe", N.tx_fenetre, 0, 0.6, cadre=0xc79a3c, carreaux=(3, 4), graine=313)

LG = 5.5  # la longueur de la coque (de la poupe, x = -LG/2, à l'étrave)
BM = 0.88  # la demi-largeur au maître-couple
Z_LISSE = 1.0  # la lisse de l'embelle (le milieu du navire)
# (début, fin, hauteur du pont, hauteur du pavois) : la dunette, le gaillard d'arrière, l'embelle, le gaillard d'avant
PONTS = ((0.0, 0.14, 1.78, 0.28), (0.14, 0.35, 1.32, 0.3), (0.35, 0.715, 0.68, 0.32), (0.715, 1.0, 1.14, 0.3))
RANGS = 9
MULT = (0.0, 0.5, 0.86, 1.0, 1.045, 1.02, 0.985, 0.95, 0.9)  # la largeur de chaque rang (rentrée des hauts)
EXPO = (0, 1.5, 1.9, 2.3, 2.6, 2.9, 3.2, 3.5, 3.8)  # vers l'avant : les fonds s'affinent vite, les hauts restent pleins
ARR = (0, 0.16, 0.3, 0.52, 0.66, 0.72, 0.74, 0.75, 0.76)  # à la poupe : les fonds pincés, le tableau large en haut


def x_de(t):
    return -LG / 2 + LG * t


def pont_de(t, apres=False):
    for a, b, z, h in PONTS:
        if a <= t < b or (t == b and not apres) or (t >= 1 and b == 1):
            if t == a and not apres and a > 0:
                continue
            return z, h
    return PONTS[-1][2], PONTS[-1][3]


def lisse_de(t, apres=False):
    z, h = pont_de(t, apres)
    rel = 0.1 * max(0.0, (0.14 - t) / 0.14) + 0.16 * max(0.0, (t - 0.8) / 0.2) ** 1.5  # la tonture : la poupe et la proue relevées
    return z + h + rel


def quille_de(t):
    return -0.5 + 1.0 * max(0.0, (t - 0.84) / 0.16) ** 2.0


def section(t, apres=False):
    """Les points d'un couple, côté tribord (y < 0), de la quille à la lisse."""
    x = x_de(t)
    zk = quille_de(t)
    zs = lisse_de(t, apres)
    hauts = [zk, zk * 0.72, zk * 0.32, 0.0, 0.3, 0.62, 0.8, Z_LISSE, max(zs, Z_LISSE)]
    if t > 0.84:  # l'étrave : la quille remonte, les rangs du bas la suivent
        for j in range(1, 4):
            hauts[j] = max(hauts[j], zk + (0.3 - zk) * j / 4 * 0.6)
        hauts[3] = max(hauts[3], zk + 0.02 * 3)
        for j in range(1, RANGS):
            hauts[j] = max(hauts[j], hauts[j - 1] + 0.01)
    pts = [(x, -0.035 if 0 < t < 1 else -0.03, zk)]
    for j in range(1, RANGS):
        if t < 0.4:
            k = math.sin(PI / 2 * t / 0.4)
            w = BM * (ARR[j] + (1 - ARR[j]) * k)
        else:
            w = BM * max(0.0, 1 - ((t - 0.4) / 0.6) ** EXPO[j])
        w = max(w * MULT[j], 0.035)
        if j == RANGS - 1:
            w = max(w - 0.05 * max(0.0, (zs - Z_LISSE)) / 0.8, 0.035)  # les châteaux rentrent un peu
        pts.append((x, -w, hauts[j]))
    return pts


def largeur(t, z, apres=False):
    """La demi-largeur de la coque (sa face extérieure) à cette hauteur."""
    s = section(t, apres)
    for a, b in zip(s, s[1:]):
        if a[2] <= z <= b[2] and b[2] > a[2]:
            return -(a[1] + (b[1] - a[1]) * (z - a[2]) / (b[2] - a[2]))
    return -s[-1][1] if z > s[-1][2] else -s[0][1]


def cap_de(t, z):
    """L'angle de la coque (vue de dessus) à cet endroit, côté bâbord (y > 0)."""
    d = 0.01
    return math.atan2(largeur(min(t + d, 1), z) - largeur(max(t - d, 0), z), LG * 2 * d)


def sym(v, f):
    """Le même morceau de l'autre côté du navire."""
    v2 = [(p[0], -p[1], p[2]) for p in np.asarray(v, np.float64)]
    f2 = N.Faces(tuple(reversed(q)) for q in f)
    d = getattr(f, "deroule", None)
    if d is not None:
        f2.deroule = [None if q is None else list(reversed(q)) for q in d]
    return v2, f2


def deux(L, v, f, mat, M=None, **k):
    """Ajoute un morceau des deux côtés (bâbord et tribord)."""
    w = np.asarray(v, np.float64)
    if M is not None:
        w = w @ M[:3, :3].T + M[:3, 3]
    L.ajouter(w, f, mat, **k)
    L.ajouter(*sym(w, f), mat, **k)


def plaque(x0, x1, z0, z1, y):
    """Un rectangle posé sur le flanc bâbord (il regarde vers +y)."""
    return [(x1, y, z0), (x0, y, z0), (x0, y, z1), (x1, y, z1)], [(0, 1, 2, 3)]


def flanc(t, z, dehors=0.0, cote=1):
    """Un repère posé sur la coque (cote = 1 : bâbord, -1 : tribord) : x le long du bordé, y vers le dehors, z vers le haut."""
    cap = cap_de(t, z)
    return T(x_de(t), cote * (largeur(t, z) + dehors), z) @ Rz(cap if cote > 0 else PI - cap)


def ruban(L, pts, mat, haut=0.05, dehors=0.02, zone=0, tourne=False):
    """Une moulure qui suit la coque des deux côtés : pts = [(x, demi-largeur, z)], le long du bordé."""
    v, f = [], N.Faces()
    f.deroule = []
    s = 0.0
    for i, (x, w, z) in enumerate(pts):
        if i:
            s += math.dist(pts[i - 1], pts[i])
        v += [(x, -w, z - haut / 2), (x, -w - dehors, z - haut / 2), (x, -w - dehors, z + haut / 2), (x, -w, z + haut / 2)]
        if i:
            a = (i - 1) * 4
            s0 = s - math.dist(pts[i - 1], pts[i])
            f += [(a + 1, a + 5, a + 6, a + 2), (a + 2, a + 6, a + 7, a + 3), (a, a + 4, a + 5, a + 1)]
            f.deroule += [[(s0, dehors), (s, dehors), (s, dehors + haut), (s0, dehors + haut)], [(s0, dehors + haut), (s, dehors + haut), (s, 2 * dehors + haut), (s0, 2 * dehors + haut)], [(s0, 0), (s, 0), (s, dehors), (s0, dehors)]]
    n = len(pts) - 1
    f += [(0, 1, 2, 3), (n * 4 + 3, n * 4 + 2, n * 4 + 1, n * 4)]
    f.deroule += [None, None]
    deux(L, v, f, mat, zone=zone, tourne=tourne)


# ---------- les pièces ----------
def canon(L, M, lg=0.42, r=0.05, affut=True):
    """Un canon pointé vers +y (du repère) : la volée, la bouche évasée, le bouton de culasse, son affût à roues."""
    A = M @ Rx(-PI / 2)
    L.ajouter(*N.cylindre(r, r * 0.74, lg, 8, haut=False), "canon", A)
    L.ajouter(*N.cylindre(r * 0.9, r * 0.98, 0.035, 8), "canon", A @ T(0, 0, lg - 0.035))
    L.ajouter(*N.cylindre(r * 1.08, r * 1.08, 0.03, 8, haut=False), "laiton", A @ T(0, 0, lg * 0.32))
    L.ajouter(*N.sphere(r * 0.55, 6, 4), "canon", A @ T(0, 0, -r * 0.4))
    if affut:
        L.ajouter(*N.boite(r * 2.6, lg * 0.62, r * 0.9, bas=True), "planches_sombres", M @ T(0, lg * 0.24, -r * 1.75))
        for sx in (-1, 1):
            for dy in (0.08, 0.4):
                L.ajouter(*N.cylindre(r * 0.62, r * 0.62, 0.03, 7, bas=True), "poutre", M @ T(sx * r * 1.5, lg * dy, -r * 1.5) @ Ry(PI / 2) @ T(0, 0, -0.015))


def lanterne(L, U, M, r=0.075):
    """Une lanterne de poupe : un pied de laiton, la cage de verre (elle brille), un chapeau doré."""
    L.ajouter(*N.cylindre(0.016, 0.016, 0.16, 5, haut=False), "laiton", M)
    L.ajouter(*N.cylindre(r * 0.7, r * 0.9, 0.03, 7), "laiton", M @ T(0, 0, 0.16))
    U.ajouter(*N.cylindre(r * 0.82, r, r * 1.7, 7, haut=False), "lumiere", M @ T(0, 0, 0.19))
    for k in range(4):
        a = k * PI / 2 + PI / 4
        L.ajouter(*N.poutre((math.cos(a) * r * 0.86, math.sin(a) * r * 0.86, 0.19), (math.cos(a) * r * 1.02, math.sin(a) * r * 1.02, 0.19 + r * 1.7), 0.012), "laiton", M)
    v, f = N.toit_pointe(r, r * 0.9, 7, 0.015, 0)
    L.ajouter(v, f, "dorure", M @ T(0, 0, 0.19 + r * 1.7))
    L.ajouter(*N.sphere(0.02, 5, 4), "laiton", M @ T(0, 0, 0.19 + r * 2.7))


def rambarde(L, a, b, haut=0.24, pas=0.13, mat="mature", lisse="poutre", zone=0):
    """Une rambarde à balustres entre deux points (au niveau du pont)."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    lg = float(np.linalg.norm(b - a))
    n = max(2, int(round(lg / pas)))
    for k in range(n + 1):
        p = a + (b - a) * k / n
        gros = k in (0, n)
        L.ajouter(*N.cylindre(0.022 if gros else 0.013, 0.018 if gros else 0.011, haut, 5 if gros else 4, haut=False), mat, T(*p))
    L.ajouter(*N.poutre(a + (0, 0, haut), b + (0, 0, haut), 0.045, 0.03), lisse if not zone else "peinture" + str(zone), zone=zone)
    L.ajouter(*N.poutre(a + (0, 0, haut * 0.12), b + (0, 0, haut * 0.12), 0.03, 0.02), mat)


def echelle(L, a, b, larg=0.34, marches=5):
    """Un escalier raide entre deux ponts : deux limons, des marches."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    d = b - a
    cote = np.cross(d / np.linalg.norm(d), [0, 0, 1.0])
    cote = cote / np.linalg.norm(cote) * larg / 2
    for s in (-1, 1):
        L.ajouter(*N.poutre(a + cote * s, b + cote * s, 0.03, 0.07), "planches_sombres")
    for k in range(1, marches + 1):
        p = a + d * (k - 0.5) / marches
        cap = math.atan2(cote[1], cote[0])
        L.ajouter(*N.boite(larg, 0.1, 0.022, bas=True), "pont_galion", T(*p) @ Rz(cap))


def matelot(L, rng, x, y, z, angle=None, capitaine=False):
    """Un marin (inventé, tout petit) : la vareuse, la tête, le bonnet ou le tricorne."""
    M = T(x, y, z) @ Rz(rng.random() * 6.28 if angle is None else angle)
    habit = "tissu_sombre" if capitaine else rng.choice(["tissu_rouge", "tissu_bleu", "tissu_creme", "toile_ecrue"])
    L.ajouter(*N.cylindre(0.05, 0.045, 0.1, 6, haut=False), "tissu_sombre" if not capitaine else "tissu_creme", M)
    L.ajouter(*N.cylindre(0.05, 0.058, 0.12, 6), habit, M @ T(0, 0, 0.1))
    L.ajouter(*N.sphere(0.042, 6, 4), rng.choice(["peau", "peau", "peau_brune"]), M @ T(0, 0, 0.265))
    if capitaine:
        L.ajouter(*N.cylindre(0.085, 0.075, 0.012, 3), "tissu_sombre", M @ T(0, 0, 0.292) @ Rz(PI / 6))
        L.ajouter(*N.cylindre(0.042, 0.036, 0.04, 6), "tissu_sombre", M @ T(0, 0, 0.3))
        L.ajouter(*N.sphere(0.018, 5, 3), "or", M @ T(0.05, 0, 0.31))
    else:
        L.ajouter(*N.sphere(0.045, 6, 3, 0.75), rng.choice(["tissu_rouge", "tissu_sombre", "tissu_bleu"]), M @ T(0, 0, 0.29))
    for s in (-1, 1):
        L.ajouter(*N.tube([(0, s * 0.055, 0.2), (0.03 + rng.random() * 0.05, s * 0.08, 0.11)], 0.014, 4, bouts=False), habit, M)


def voile_carree(lh, lb, h, creux, nx=14, ny=9):
    """Une voile carrée gonflée vers l'avant (+x), autour du milieu de sa vergue ; les UV : toute l'image du site."""
    v, f, uv = [], [], []
    for j in range(ny + 1):
        b = j / ny
        l = lh + (lb - lh) * b
        for i in range(nx + 1):
            a = i / nx
            bombe = creux * math.sin(PI * a) * math.sin(PI * (0.12 + b * 0.75))
            v.append((bombe, (a - 0.5) * l, -b * h - 0.04 * math.sin(PI * a) * (b == 1)))
            uv.append((a, 1 - b))
    for j in range(ny):
        for i in range(nx):
            q = j * (nx + 1) + i
            f.append((q, q + nx + 1, q + nx + 2, q + 1))
    return v, f, uv


def voile_triangle(a, b, c, n=7, ventre=0.3):
    """Un foc entre trois points (les coordonnées partent du premier)."""
    a, b, c = (np.asarray(p, np.float64) for p in (a, b, c))
    v, f, uv = [], [], []
    for j in range(n + 1):
        for i in range(n + 1 - j):
            s, t = i / n, j / n
            p = (b - a) * s + (c - a) * t
            p[1] += ventre * s * t * (1 - s - t) * 6
            v.append(tuple(p))
            uv.append((s, t))
    ix = lambda i, j: sum(n + 1 - k for k in range(j)) + i
    for j in range(n):
        for i in range(n - j):
            f.append((ix(i, j), ix(i + 1, j), ix(i, j + 1)))
            if i < n - j - 1:
                f.append((ix(i + 1, j), ix(i + 1, j + 1), ix(i, j + 1)))
    return v, f, uv


# ---------- le galion ----------
def mailles(graine=7, leger=False):
    """leger : la version téléphone (moins de côtés aux formes rondes, des voiles moins fines, moins de petites pièces)."""
    N.DETAIL = 0.62 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _mailles(graine, leger):
    rng = random.Random(graine)
    L = N.Maille("navire_corps")  # tout ce qui est cuit dans l'atlas
    V = N.Maille("navire_vitres")  # les fenêtres de la galerie (« vitre » : elles s'allument la nuit)
    U = N.Maille("navire_lumieres")  # les lanternes
    lots = {"corps": L, "vitres": V, "lumieres": U, "toiles": []}  # toiles : (Maille, nom, origine, extras)

    # --- la coque : des couples, de la poupe à l'étrave (deux couples au même endroit là où le pont change de hauteur) ---
    ts = []
    for a, b, _, _ in PONTS:
        n = max(2, int(round((b - a) / (0.07 if leger else 0.045))))
        ts += [(a + (b - a) * k / n, k == 0 and a > 0) for k in range(n + (1 if b == 1 else 0))]
        if b < 1:
            ts.append((b, False))
    ts = [(t, ap) for t, ap in ts if t < 0.999] + [(0.985, False), (1.0, False)]
    ts = sorted(set(ts), key=lambda q: (q[0], q[1]))
    sec = [section(t, ap) for t, ap in ts]
    ns = len(sec)
    cum = [0.0]  # la longueur le long de la préceinte
    for i in range(1, ns):
        cum.append(cum[-1] + math.dist(sec[i - 1][4], sec[i][4]))
    tour = []  # le développé de chaque couple, à partir de la flottaison
    for s in sec:
        g = [0.0] * RANGS
        for j in range(4, RANGS):
            g[j] = g[j - 1] + math.dist(s[j - 1], s[j])
        for j in range(2, -1, -1):
            g[j] = g[j + 1] - math.dist(s[j], s[j + 1])
        tour.append(g)
    bandes = ((0, 3, "carene", 0), (3, 4, "bordage_sombre", 0), (4, 5, "bordage", 0), (5, 6, "peinture1", 1), (6, 7, "bordage", 0), (7, 8, "bordage", 0))
    for j0, j1, mat, zone in bandes:
        v, f = [], N.Faces()
        f.deroule = []
        for i in range(ns):
            v += sec[i]
        for i in range(ns - 1):
            if sec[i + 1][0][0] - sec[i][0][0] < 1e-6:
                continue
            for j in range(j0, j1):
                a, b, c, d = i * RANGS + j, (i + 1) * RANGS + j, (i + 1) * RANGS + j + 1, i * RANGS + j + 1
                if math.dist(v[a], v[d]) < 2e-3 and math.dist(v[b], v[c]) < 2e-3:
                    continue
                f.append((a, b, c, d))
                f.deroule.append([(cum[i], tour[i][j]), (cum[i + 1], tour[i + 1][j]), (cum[i + 1], tour[i + 1][j + 1]), (cum[i], tour[i][j + 1])])
        deux(L, v, f, mat, zone=zone)
    # le tableau arrière (plat), sous la galerie
    s0 = sec[0]
    for j in range(RANGS - 1):
        a, b = s0[j], s0[j + 1]
        L.ajouter([(a[0], -a[1], a[2]), a, b, (b[0], -b[1], b[2])], [(0, 1, 2, 3)], "carene" if j < 3 else "bordage_sombre" if j < 4 else "bordage")
    # la quille, l'étambot, l'étrave, le gouvernail
    L.ajouter(*N.poutre((x_de(0.0) - 0.02, 0, -0.52), (x_de(0.84), 0, -0.52), 0.07, 0.09), "bordage_sombre")
    etrave = [(x_de(t), 0, quille_de(t) - 0.02) for t in (0.84, 0.9, 0.95, 0.985)] + [(x_de(1.0) + 0.03, 0, 0.62), (x_de(1.0) + 0.06, 0, lisse_de(1.0) + 0.04)]
    L.ajouter(*N.tube(etrave, 0.045, 5), "bordage_sombre")
    L.ajouter(*N.boite(0.26, 0.05, 1.25, bas=True), "bordage_sombre", T(x_de(0) - 0.15, 0, -0.5))
    for z in (-0.25, 0.15, 0.5):
        L.ajouter(*N.boite(0.14, 0.07, 0.035, bas=True), "fer", T(x_de(0) - 0.06, 0, z))

    # --- les moulures : la préceinte, les filets dorés, la lisse de plat-bord, la bande aux couleurs sur les châteaux ---
    ruban(L, [(s[4][0], -s[4][1], s[4][2]) for s in sec if s[4][1] < -0.05], "bordage_sombre", 0.085, 0.028)
    ruban(L, [(s[5][0], -s[5][1], s[5][2]) for s in sec if s[5][1] < -0.05], "dorure", 0.04, 0.016)
    ruban(L, [(s[6][0], -s[6][1], s[6][2]) for s in sec if s[6][1] < -0.05], "dorure", 0.04, 0.016)
    for a, b, zp, hp in PONTS:
        pts = [(s[8][0], -s[8][1], s[8][2]) for (t, ap), s in zip(ts, sec) if a <= t <= b and not (t == a and not ap and a > 0) and not (t == b and ap) and s[8][1] < -0.05]
        if len(pts) > 1:
            ruban(L, pts, "poutre", 0.05, 0.03)
            if zp > 1:  # sur les châteaux : une frise aux couleurs de la commu sous la lisse, un filet doré au niveau de l'embelle
                ruban(L, [(x, w + 0.004, z - 0.11) for x, w, z in pts], "peinture2", 0.1, 0.012, zone=2)
                ruban(L, [(s[7][0], -s[7][1], s[7][2]) for (t, ap), s in zip(ts, sec) if a <= t <= b and s[7][1] < -0.05], "dorure", 0.05, 0.02)

    # --- les ponts, l'intérieur des pavois, les cloisons ---
    ep = 0.045
    for a, b, zp, hp in PONTS:
        ici = [(t, ap, s) for (t, ap), s in zip(ts, sec) if a <= t <= b and not (t == a and not ap and a > 0) and not (t == b and ap)]
        for (t0, _, s0_), (t1, _, s1_) in zip(ici, ici[1:]):
            w0, w1 = max(largeur(t0, zp, True) - ep, 0.01), max(largeur(t1, zp, False) - ep, 0.01)
            x0, x1 = s0_[0][0], s1_[0][0]
            L.ajouter([(x0, -w0, zp), (x1, -w1, zp), (x1, w1, zp), (x0, w0, zp)], [(0, 1, 2, 3)], "pont_galion")
            h0, h1 = -s0_[8][1] - ep, -s1_[8][1] - ep
            z0, z1 = s0_[8][2], s1_[8][2]
            if min(h0, h1) > 0.04:
                deux(L, [(x0, -w0, zp), (x1, -w1, zp), (x1, -h1, z1), (x0, -h0, z0)], [(0, 3, 2, 1)], "bordage")
                deux(L, [(x0, s0_[8][1], z0), (x1, s1_[8][1], z1), (x1, -h1, z1), (x0, -h0, z0)], [(0, 1, 2, 3)], "poutre")  # le dessus du pavois
    cl = {}  # les cloisons : (t) → (largeur, bas, haut)
    for (a, b, zp, hp), (_, _, zq, _) in zip(PONTS, PONTS[1:]):
        bas, haut = min(zp, zq), max(zp, zq)
        w = largeur(b, haut, zq > zp) - 0.02
        xb = x_de(b)
        vers_avant = zp > zq  # la cloison regarde vers l'avant (dunette, gaillard d'arrière) ou vers l'arrière (gaillard d'avant)
        q = [(xb, -w, bas), (xb, w, bas), (xb, w, haut), (xb, -w, haut)]
        L.ajouter(q, [(0, 1, 2, 3) if vers_avant else (1, 0, 3, 2)], "bordage")
        L.ajouter(*N.poutre((xb, -w, haut - 0.03), (xb, w, haut - 0.03), 0.07, 0.07), "dorure")
        cl[b] = (w, bas, haut, vers_avant)
        # la rambarde au bord du pont du haut, et deux escaliers
        s_ = 1 if vers_avant else -1
        if haut - bas > 0.5:
            rambarde(L, (xb + 0.02 * s_, -w + 0.34, haut), (xb + 0.02 * s_, w - 0.34, haut), 0.25, zone=0)
            for y in (-w + 0.17, w - 0.17):
                echelle(L, (xb + s_ * 0.5, y, bas), (xb + s_ * 0.02, y, haut), 0.3, 5)
            Mc = T(xb + s_ * 0.004, 0, bas) @ Rz(PI / 2 if vers_avant else -PI / 2)
            L.ajouter(*N.quad((-0.13, -0.012, 0), (0.13, -0.012, 0), (0.13, -0.012, 0.44), (-0.13, -0.012, 0.44)), "porte", Mc)
            for dx in (-0.42, 0.42):
                P.fenetre(L, V, rng, Mc, dx, 0.2, 0.2, 0.22, mat="fenetre_poupe", allumee=True)
        else:
            rambarde(L, (xb + 0.02 * s_, -w + 0.05, haut), (xb + 0.02 * s_, -0.22, haut), 0.25)
            rambarde(L, (xb + 0.02 * s_, 0.22, haut), (xb + 0.02 * s_, w - 0.05, haut), 0.25)
            echelle(L, (xb + s_ * 0.36, 0, bas), (xb + s_ * 0.02, 0, haut), 0.36, 4)

    # --- la poupe : la galerie vitrée et dorée, les bouteilles sur les flancs, le couronnement, les trois lanternes ---
    xp = x_de(0)
    wg = largeur(0, 1.4) * 0.97
    zg0, zg1 = 1.0, 1.52
    L.ajouter(*N.boite(0.16, wg * 2, zg1 - zg0, bas=True), "bordage", T(xp - 0.08, 0, zg0))
    Mp = T(xp - 0.162, 0, 0) @ Rz(-PI / 2)
    nf = 5
    for k in range(nf):
        P.fenetre(L, V, rng, Mp, (k - (nf - 1) / 2) * wg * 2 * 0.9 / nf, zg0 + 0.1, wg * 2 * 0.9 / nf * 0.82, 0.34, mat="fenetre_poupe", allumee=True)
    for z, h in ((zg0 - 0.03, 0.07), (zg1, 0.08)):
        L.ajouter(*N.boite(0.2, wg * 2 + 0.06, h, bas=True), "dorure", T(xp - 0.09, 0, z))
    # au-dessus : le tableau peint aux couleurs de la commu, ses volutes, le couronnement
    wt = largeur(0, 1.9) * 0.97
    zt = lisse_de(0)
    L.ajouter([(xp - 0.01, wg, zg1 + 0.08), (xp - 0.01, -wg, zg1 + 0.08), (xp - 0.01, -wt, zt), (xp - 0.01, wt, zt)], [(0, 1, 2, 3)], "peinture1", zone=1)
    L.ajouter(*N.cylindre(0.2, 0.2, 0.03, 12, bas=True), "dorure", T(xp - 0.012, 0, (zg1 + 0.08 + zt) / 2) @ Ry(-PI / 2))
    L.ajouter(*N.cylindre(0.12, 0.12, 0.03, 10, bas=True), "peinture2", T(xp - 0.03, 0, (zg1 + 0.08 + zt) / 2) @ Ry(-PI / 2), zone=2)
    arc = [(xp - 0.03, wt * math.cos(a), zt + 0.02 + 0.16 * math.sin(a)) for a in [PI * k / 8 for k in range(9)]]
    L.ajouter(*N.tube(arc, 0.04, 5), "dorure")
    for s in (-1, 1):
        L.ajouter(*N.boite(0.07, 0.07, zt - zg1 + 0.05, bas=True), "dorure", T(xp - 0.03, s * wt * 0.99, zg1 + 0.02))
        lanterne(L, U, T(xp - 0.06, s * wt * 0.72, zt + 0.1 + 0.16 * 0.7), 0.07)
    lanterne(L, U, T(xp - 0.08, 0, zt + 0.19), 0.09)
    # les bouteilles : deux petites tourelles vitrées de chaque côté
    for s in (-1, 1):
        tb = 0.06
        wb = largeur(tb, 1.3)
        Mb = T(x_de(tb), s * wb, 1.02) @ Rz(0 if s < 0 else PI)
        L.ajouter(*N.boite(0.5, 0.2, 0.46, bas=True), "bordage", Mb @ T(0, -0.06, 0))
        L.ajouter(*N.boite(0.56, 0.24, 0.05, bas=True), "dorure", Mb @ T(0, -0.07, -0.04))
        v, f = N.toit_pignon(0.56, 0.26, 0.12, 0.02, 0.03)
        L.ajouter(v, f, "dorure", Mb @ T(0, -0.06, 0.46))
        for dx in (-0.12, 0.12):
            P.fenetre(L, V, rng, Mb @ T(0, -0.16, 0), dx, 0.1, 0.17, 0.26, mat="fenetre_poupe", allumee=True)

    # --- les sabords et leurs canons (la batterie), les mantelets ouverts aux couleurs de la commu ---
    for t in ((0.2, 0.32, 0.44, 0.56, 0.68) if leger else (0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71)):
        z = 0.47
        for cote in (1, -1):
            F = flanc(t, z, 0.006, cote)
            L.ajouter(*plaque(-0.085, 0.085, -0.085, 0.085, 0), "sabord", F)
            L.ajouter(*N.boite(0.19, 0.19, 0.02, bas=True), "peinture1", F @ T(0, 0.01, 0.092) @ Rx(0.32) @ T(0, 0.095, 0), zone=1)
            for sx in (-1, 1):  # les garants du mantelet
                L.ajouter(*N.tube([(sx * 0.07, 0.0, 0.2), (sx * 0.07, 0.17, 0.15)], 0.005, 3, bouts=False), "corde", F)
            canon(L, F @ T(0, -0.16, 0), 0.34, 0.045, affut=False)

    # --- les jambettes : des montants sombres sur le bordé, entre les sabords ; les fenêtres des châteaux ---
    for t in ((0.23, 0.38, 0.5, 0.62, 0.77) if leger else (0.125, 0.215, 0.305, 0.395, 0.485, 0.575, 0.665, 0.755, 0.83, 0.9)):
        zs_ = min(lisse_de(t, True), lisse_de(t, False)) - 0.03
        for cote in (1, -1):
            pts = [(x_de(t), cote * (largeur(t, z) + 0.012), z) for z in (0.02, 0.3, 0.62, 0.99)]
            if zs_ > 1.1:
                pts.append((x_de(t), cote * (largeur(t, zs_, True) + 0.012), zs_))
            L.ajouter(*N.tube(pts, 0.024, 4), "bordage_sombre")
    for t, z, l, h in ((0.185, 1.1, 0.17, 0.22), (0.26, 1.1, 0.17, 0.22), (0.325, 1.06, 0.15, 0.2), (0.795, 1.04, 0.14, 0.18), (0.07, 1.62, 0.15, 0.2)):
        for cote in (1, -1):
            if z + h < min(lisse_de(t, True), lisse_de(t, False)) - 0.1:
                P.fenetre(L, V, rng, flanc(t, z, 0.004, cote) @ Rz(PI), 0, 0, l, h, mat="fenetre_poupe", allumee=True)

    # --- l'éperon : la guibre qui avance, la figure de proue (un hippocampe doré), les herpes, le beaupré ---
    xe, ze = x_de(1.0), 0.95
    bec = [(xe - 0.1, 0, ze - 0.12), (xe + 0.35, 0, ze + 0.02), (xe + 0.72, 0, ze + 0.22), (xe + 0.95, 0, ze + 0.5)]
    L.ajouter(*N.tube(bec, [0.07, 0.06, 0.05, 0.04], 6), "bordage_sombre")
    for s in (-1, 1):
        herpe = [(x_de(0.9), s * largeur(0.9, 1.25), 1.28), (xe + 0.2, s * 0.14, 1.12), (xe + 0.6, s * 0.06, 1.14), (xe + 0.9, 0, ze + 0.46)]
        L.ajouter(*N.tube(herpe, 0.022, 4), "dorure")
        herpe2 = [(x_de(0.92), s * largeur(0.92, 0.9), 0.9), (xe + 0.3, s * 0.1, ze - 0.02), (xe + 0.7, s * 0.04, ze + 0.2)]
        L.ajouter(*N.tube(herpe2, 0.018, 4), "peinture2", zone=2)
    # l'hippocampe : le corps en S, le ventre, la tête penchée, le museau, la crête, la queue enroulée
    hx, hz = xe + 0.98, ze + 0.52
    corps = [(hx - 0.1, 0, hz - 0.3), (hx + 0.02, 0, hz - 0.14), (hx + 0.0, 0, hz + 0.04), (hx + 0.1, 0, hz + 0.2), (hx + 0.2, 0, hz + 0.26)]
    L.ajouter(*N.tube(corps, [0.035, 0.075, 0.07, 0.055, 0.05], 7), "dorure")
    L.ajouter(*N.sphere(0.07, 7, 5, 1.0), "dorure", T(hx + 0.22, 0, hz + 0.27))
    L.ajouter(*N.tube([(hx + 0.26, 0, hz + 0.25), (hx + 0.4, 0, hz + 0.17)], [0.035, 0.022], 6), "dorure")
    for k in range(4):
        L.ajouter(*N.boite(0.05, 0.016, 0.07, bas=True), "laiton", T(hx + 0.12 - k * 0.055, 0, hz + 0.27 - k * 0.075) @ Ry(-0.5))
    queue = [(hx - 0.1, 0, hz - 0.3), (hx - 0.2, 0, hz - 0.38), (hx - 0.27, 0, hz - 0.32), (hx - 0.24, 0, hz - 0.24), (hx - 0.19, 0, hz - 0.28)]
    L.ajouter(*N.tube(queue, [0.035, 0.03, 0.024, 0.018, 0.012], 5), "dorure")
    for s in (-1, 1):
        L.ajouter(*N.sphere(0.014, 5, 3), "canon", T(hx + 0.25, s * 0.058, hz + 0.3))
    # le beaupré et sa civadière ferlée
    b0, b1 = np.array((x_de(0.8), 0, 1.3)), np.array((xe + 2.05, 0, 2.5))
    L.ajouter(*N.tube([b0, b0 + (b1 - b0) * 0.5, b1], [0.09, 0.075, 0.045], 7), "mature")
    L.ajouter(*N.poutre(tuple(b0 + (b1 - b0) * 0.62 + (0, -0.75, -0.06)), tuple(b0 + (b1 - b0) * 0.62 + (0, 0.75, -0.06)), 0.045), "mature")
    L.ajouter(*N.tube([tuple(b0 + (b1 - b0) * 0.62 + (0, -0.66, -0.12)), tuple(b0 + (b1 - b0) * 0.62 + (0, 0, -0.15)), tuple(b0 + (b1 - b0) * 0.62 + (0, 0.66, -0.12))], [0.035, 0.06, 0.035], 5), "toile_ecrue")
    L.ajouter(*N.cylindre(0.012, 0.01, 0.4, 4), "mature", T(*b1) @ T(0, 0, -0.02))

    # --- les ancres, à l'avant ---
    for s in (-1, 1):
        A = T(x_de(0.86), s * (largeur(0.86, 0.72) + 0.05), 0.42) @ Rz(0 if s > 0 else PI)
        L.ajouter(*N.poutre((0, 0, 0), (0, 0, 0.52), 0.04), "fer", A)
        L.ajouter(*N.tube([(-0.17, 0, 0.14), (-0.1, 0, 0.02), (0, 0, -0.02), (0.1, 0, 0.02), (0.17, 0, 0.14)], [0.014, 0.022, 0.026, 0.022, 0.014], 4), "fer", A)
        for sx in (-1, 1):
            L.ajouter(*N.boite(0.07, 0.012, 0.06, bas=True), "fer", A @ T(sx * 0.165, 0, 0.11) @ Ry(sx * 0.6))
        L.ajouter(*N.poutre((0, -0.15, 0.48), (0, 0.15, 0.48), 0.035), "planches_sombres", A)
        L.ajouter(*N.tube([(0, 0, 0.52), (0, 0.0, 0.62), (0.02, -0.02 * s, 0.9)], 0.014, 4, bouts=False), "corde", A)

    # --- les mâts : bas-mât, hune à rambarde, mât de hune, vergues, haubans et enfléchures, étais ---
    mats = (("misaine", 0.755, 5.6, 1.3), ("grand", 0.5, 6.55, 1.55), ("artimon", 0.2, 4.85, 1.05))
    infos = {}
    for nom, tm, haut, lv in mats:
        xm = x_de(tm)
        zp = pont_de(tm, True)[0]
        zh = zp + (haut - zp) * 0.5  # la hune
        L.ajouter(*N.cylindre(0.125, 0.095, zh - zp + 0.25, 8, haut=False), "mature", T(xm, 0, zp - 0.02))
        for z in (zp + 0.3, zp + (zh - zp) * 0.45, zh - 0.3):
            L.ajouter(*N.cylindre(0.125, 0.12, 0.04, 8, haut=False), "fer", T(xm, 0, z))
        L.ajouter(*N.cylindre(0.15, 0.17, 0.06, 8, haut=False, bas=True), "dorure", T(xm, 0, zp))
        # la hune : un plateau rond, sa rambarde, les jottereaux dessous
        L.ajouter(*N.cylindre(0.24, 0.38, 0.05, 10, bas=True), "planches_sombres", T(xm, 0, zh))
        L.ajouter(*N.cylindre(0.38, 0.4, 0.19, 10, haut=False), "peinture1", T(xm, 0, zh + 0.05), zone=1)
        L.ajouter(*N.cylindre(0.415, 0.415, 0.04, 10, haut=False), "dorure", T(xm, 0, zh + 0.235))
        L.ajouter(*N.cylindre(0.38, 0.4, 0.19, 10, haut=False, z0=0), "planches_sombres", T(xm, 0, zh + 0.05) @ S(-1, 1, 1) @ S(0.97, 0.97, 1))
        # le mât de hune et le mât de perroquet
        L.ajouter(*N.cylindre(0.08, 0.048, haut - zh + 0.1, 7), "mature", T(xm + 0.08, 0, zh - 0.1))
        L.ajouter(*N.boite(0.2, 0.1, 0.05, bas=True), "planches_sombres", T(xm + 0.04, 0, zh + 0.2))
        L.ajouter(*N.sphere(0.035, 6, 4), "dorure", T(xm + 0.08, 0, haut + 0.02))
        # les vergues (la basse, celle de hune, celle de perroquet pour le grand mât)
        vergues = [(zh - 0.3, lv, 0.068)]
        vergues.append((zh + (haut - zh) * 0.62, lv * 0.72, 0.055))
        if nom == "grand":
            vergues.append((haut - 0.12, lv * 0.5, 0.044))
        if nom == "artimon":
            vergues = [(zh + (haut - zh) * 0.5, lv * 0.8, 0.055)]
        for zv, l, r in vergues:
            L.ajouter(*N.tube([(xm + 0.14, -l, zv), (xm + 0.14, -l * 0.5, zv + 0.012), (xm + 0.14, l * 0.5, zv + 0.012), (xm + 0.14, l, zv)], [r * 0.6, r, r, r * 0.6], 6), "mature")
            for s in (-1, 1):  # les balancines
                L.ajouter(*N.tube([(xm + 0.14, s * l * 0.92, zv + 0.02), (xm + 0.09, 0, zv + min(0.9, l * 0.6))], 0.007, 3, bouts=False), "corde")
        infos[nom] = (xm, zp, zh, haut, vergues)
        # les haubans, du bord de la hune au porte-haubans ; les enfléchures entre eux
        zb = lisse_de(tm, True) - 0.04
        nh = 3 if leger else 4
        for s in (-1, 1):
            wb = largeur(tm, zb, True) + 0.07
            L.ajouter(*N.boite(0.62, 0.1, 0.035, bas=True), "planches_sombres", T(xm - 0.12, s * (wb - 0.02), zb - 0.02))
            pieds = [(xm - 0.38 + k * 0.52 / (nh - 1), s * wb, zb) for k in range(nh)]
            tetes = [(xm - 0.05 + k * 0.1 / (nh - 1), s * 0.31, zh + 0.02) for k in range(nh)]
            for a, b in zip(pieds, tetes):
                L.ajouter(*N.tube([a, b], 0.015, 3, bouts=False), "corde")
                L.ajouter(*N.sphere(0.026, 4, 3), "planches_sombres", T(a[0], a[1], a[2] + 0.05))
            ne = 4 if leger else 8
            for k in range(1, ne + 1):
                u = k / (ne + 1)
                a = np.array(pieds[0]) + (np.array(tetes[0]) - pieds[0]) * u
                b = np.array(pieds[-1]) + (np.array(tetes[-1]) - pieds[-1]) * u
                L.ajouter(*N.tube([a, b], 0.009, 3, bouts=False), "corde")
            # les haubans de hune, plus courts
            for k in range(2):
                L.ajouter(*N.tube([(xm - 0.06 + k * 0.22, s * 0.32, zh + 0.2), (xm + 0.08, s * 0.03, haut - 0.35)], 0.008, 3, bouts=False), "corde")
    # les étais (de mât en mât, et vers le beaupré), les galhaubans
    xg, _, zhg, hg, _ = infos["grand"]
    xf, _, zhf, hf, _ = infos["misaine"]
    xa, _, zha, ha, _ = infos["artimon"]
    for a, b in (((xg, 0, hg - 0.1), (xf + 0.05, 0, zhf + 0.3)), ((xg, 0, zhg + 0.1), (xf - 0.1, 0, pont_de(0.74, True)[0] + 0.5)), ((xf, 0, hf - 0.1), tuple(b1 - (0.1, 0, 0.02))), ((xf, 0, zhf + 0.1), tuple(b0 + (b1 - b0) * 0.6)),
                 ((xa, 0, ha - 0.1), (xg - 0.05, 0, zhg + 0.3)), ((xa, 0, zha + 0.1), (xg - 0.12, 0, pont_de(0.5)[0] + 0.6))):
        L.ajouter(*N.tube([a, b], 0.009, 3, bouts=False), "corde")
    for s in (-1, 1):
        L.ajouter(*N.tube([(xg + 0.08, s * 0.03, hg - 0.3), (xg - 0.9, s * (largeur(0.42, 1.0) + 0.02), 1.02)], 0.008, 3, bouts=False), "corde")
        L.ajouter(*N.tube([(xa + 0.08, s * 0.03, ha - 0.3), (xa - 0.6, s * (largeur(0.1, 1.9) - 0.02), 2.1)], 0.008, 3, bouts=False), "corde")

    # --- sur les ponts : le caillebotis et la chaloupe, le cabestan, la roue, l'habitacle, la cloche, les canons de pont ---
    ze_ = PONTS[2][2]
    xc = x_de(0.58)
    L.ajouter(*N.boite(0.74, 0.5, 0.07, haut=False), "planches_sombres", T(xc, 0, ze_))
    L.ajouter(*N.quad((xc - 0.37, -0.25, ze_ + 0.07), (xc + 0.37, -0.25, ze_ + 0.07), (xc + 0.37, 0.25, ze_ + 0.07), (xc - 0.37, 0.25, ze_ + 0.07)), "caillebotis")
    # la chaloupe, sur ses chantiers au-dessus du caillebotis
    Mch = T(xc, 0, ze_ + 0.3)
    for dx in (-0.25, 0.25):
        L.ajouter(*N.boite(0.05, 0.4, 0.16, bas=True), "planches_sombres", T(xc + dx, 0, ze_ + 0.07))
    P.coque(L, Mch, 0.92, 0.36, 0.15, "planches_claires", 5 if leger else 7, franc=0.07, dedans="planches")
    for xb_ in (-0.2, 0.14):
        L.ajouter(*N.boite(0.05, 0.3, 0.014, bas=True), "planches_sombres", Mch @ T(xb_, 0, 0.03))
    for s in (-1, 1):
        L.ajouter(*N.poutre((-0.36, s * 0.07, 0.07), (0.36, s * 0.07, 0.06), 0.02), "mature", Mch)
    # le cabestan (devant le grand mât)
    Mcab = T(x_de(0.435), 0, ze_)
    L.ajouter(*N.cylindre(0.1, 0.075, 0.2, 8), "planches_sombres", Mcab)
    L.ajouter(*N.cylindre(0.11, 0.11, 0.05, 8, bas=True), "dorure", Mcab @ T(0, 0, 0.2))
    for k in range(3 if leger else 6):
        a = k * PI / (1.5 if leger else 3)
        L.ajouter(*N.poutre((math.cos(a) * 0.08, math.sin(a) * 0.08, 0.225), (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.225), 0.022), "mature", Mcab)
    # la roue, sur le gaillard d'arrière ; l'habitacle et son compas
    zq = PONTS[1][2]
    Mr = T(x_de(0.27), 0, zq)
    L.ajouter(*N.boite(0.07, 0.2, 0.26, bas=True), "planches_sombres", Mr)
    for k in range(8):
        a = k * PI / 4
        L.ajouter(*N.poutre((0.05, 0, 0.3), (0.05, math.cos(a) * 0.2, 0.3 + math.sin(a) * 0.2), 0.014), "mature", Mr)
    cercle = [(0.05, math.cos(a) * 0.155, 0.3 + math.sin(a) * 0.155) for a in [k * PI / 6 for k in range(13)]]
    L.ajouter(*N.tube(cercle, 0.014, 4, bouts=False), "laiton", Mr)
    L.ajouter(*N.sphere(0.03, 6, 4), "dorure", Mr @ T(0.06, 0, 0.3))
    L.ajouter(*N.boite(0.12, 0.14, 0.2), "planches_sombres", Mr @ T(0.3, 0, 0))
    L.ajouter(*N.sphere(0.04, 6, 4, 0.7), "laiton", Mr @ T(0.3, 0, 0.21))
    # la cloche, au fronteau du gaillard d'avant
    Mcl = T(x_de(0.715) - 0.02, 0, PONTS[3][2] + 0.27)
    for s in (-1, 1):
        L.ajouter(*N.boite(0.035, 0.035, 0.26, bas=True), "dorure", Mcl @ T(0, s * 0.1, -0.02))
    L.ajouter(*N.poutre((0, -0.13, 0.25), (0, 0.13, 0.25), 0.04), "dorure", Mcl)
    L.ajouter(*N.cylindre(0.062, 0.03, 0.09, 7, bas=True), "laiton", Mcl @ T(0, 0, 0.12))
    # les canons de pont, à l'embelle (ils tirent par-dessus le pavois) et deux pierriers sur la dunette
    for t in ((0.47, 0.64) if leger else (0.4, 0.49, 0.62, 0.69)):
        for s in (-1, 1):
            w = largeur(t, ze_ + 0.2) - 0.42
            canon(L, T(x_de(t), s * w, ze_ + 0.13) @ Rz(0 if s > 0 else PI), 0.34, 0.042)
    # des tonneaux, des caisses, des boulets, des glènes de cordage
    for (t, y, quoi) in ((0.39, 0.32, "t"), (0.385, -0.34, "c"), (0.7, 0.34, "t"), (0.695, -0.3, "t"), (0.3, 0.42, "c"), (0.76, -0.36, "c"), (0.9, 0.12, "t")):
        zp = pont_de(t, True)[0]
        if quoi == "t":
            P.tonneau(L, T(x_de(t), y, zp), 0.07, 0.17)
        else:
            P.caisse(L, T(x_de(t), y, zp) @ Rz(rng.random()), 0.15)
    for (t, y) in ((0.52, 0.5), (0.52, -0.5), (0.66, 0.46)):
        for k in range(3):
            L.ajouter(*N.sphere(0.026, 5, 3), "canon", T(x_de(t) + (k - 1) * 0.055, y, ze_ + 0.024))
        L.ajouter(*N.sphere(0.026, 5, 3), "canon", T(x_de(t), y, ze_ + 0.066))
    for (t, y) in ((0.31, -0.3), (0.8, 0.3), (0.62, -0.52)):
        L.ajouter(*N.cylindre(0.07, 0.065, 0.035, 7), "corde", T(x_de(t), y, pont_de(t, True)[0]))

    # --- l'équipage : le capitaine sur la dunette, le timonier, la vigie dans la grande hune, des gabiers ---
    matelot(L, rng, x_de(0.08), 0.1, PONTS[0][2], 0.2, capitaine=True)
    matelot(L, rng, x_de(0.27) - 0.13, 0, zq, 0.0)
    matelot(L, rng, xg + 0.02, 0.22, zhg + 0.05, 0.6)
    if not leger:
        matelot(L, rng, x_de(0.46), -0.45, ze_, -1.4)
        matelot(L, rng, x_de(0.66), 0.3, ze_, 2.0)
        matelot(L, rng, x_de(0.86), -0.12, PONTS[3][2], 0.3)
        matelot(L, rng, x_de(0.3), 0.5, zq, 1.2)

    # --- ce que le site habille aux couleurs de la commu : les voiles, la flamme, le drapeau ---
    nx, ny = (9, 6) if leger else (14, 9)

    def voile(nom, mat, xm, zv, lh, lb, h, creux):
        Vm = N.Maille(nom)
        v, f, uv = voile_carree(lh, lb, h, creux, nx, ny)
        Vm.ajouter(v, f, mat, uv=uv)
        lots["toiles"].append((Vm, nom, (xm + 0.2, 0, zv - 0.05), {"anim": "voile", "axe": [1.0, 0.0, 0.0]}))

    _, _, _, _, vg = infos["grand"]
    _, _, _, _, vf = infos["misaine"]
    _, _, _, _, va = infos["artimon"]
    voile("voile_grande", "voile_b", xg, vg[0][0], vg[0][1] * 1.74, vg[0][1] * 1.9, vg[0][0] - ze_ - 0.75, 0.6)
    voile("voile_hune", "voile", xg, vg[1][0], vg[1][1] * 1.74, vg[0][1] * 1.7, vg[1][0] - vg[0][0] - 0.16, 0.5)
    voile("voile_perroquet", "voile", xg, vg[2][0], vg[2][1] * 1.7, vg[1][1] * 1.66, vg[2][0] - vg[1][0] - 0.14, 0.36)
    voile("voile_misaine", "voile", xf, vf[0][0], vf[0][1] * 1.74, vf[0][1] * 1.9, vf[0][0] - PONTS[3][2] - 0.55, 0.52)
    voile("voile_misaine_hune", "voile", xf, vf[1][0], vf[1][1] * 1.74, vf[0][1] * 1.7, vf[1][0] - vf[0][0] - 0.16, 0.42)
    voile("voile_artimon", "voile", xa, va[0][0], va[0][1] * 1.3, va[0][1] * 1.9, va[0][0] - PONTS[1][2] - 0.85, 0.4)
    focs = (("voile_foc", (xf + 0.1, 0, zhf + (hf - zhf) * 0.78), tuple(b0 + (b1 - b0) * 0.9 + (0, 0, 0.06)), tuple(b0 + (b1 - b0) * 0.38 + (0, 0, 0.14))),
            ("voile_foc2", (xf + 0.1, 0, zhf + 0.15), tuple(b0 + (b1 - b0) * 0.58 + (0, 0, 0.06)), tuple(b0 + (b1 - b0) * 0.16 + (0, 0, 0.14))))
    for nom, a, b, c in focs:
        Vm = N.Maille(nom)
        v, f, uv = voile_triangle(a, b, c, 5 if leger else 7)
        Vm.ajouter(v, f, "voile", uv=uv)
        lots["toiles"].append((Vm, nom, a, {"anim": "voile", "axe": [0.0, 1.0, 0.0]}))
    # la flamme en haut du grand mât
    Fm = N.Maille("flamme")
    v, f, uv = [], [], []
    n = 10
    for i in range(n + 1):
        t = i / n
        hw = 0.17 * (1 - t) + 0.02
        v += [(-t * 2.1, 0, hw), (-t * 2.1, 0, -hw)]
        uv += [(t, 1), (t, 0)]
        if i:
            k = 2 * i
            f.append((k - 2, k, k + 1, k - 1))
    Fm.ajouter(v, f, "flamme", uv=uv)
    lots["toiles"].append((Fm, "flamme", (xg + 0.08, 0, hg + 0.42), {"anim": "flamme"}))
    L.ajouter(*N.cylindre(0.014, 0.01, 0.62, 4), "mature", T(xg + 0.08, 0, hg))
    # le drapeau de la commu en haut du mât d'artimon
    Dm = N.Maille("drapeau")
    v, f, uv = [], [], []
    dx_, dy_ = 8, 6
    for j in range(dy_ + 1):
        for i in range(dx_ + 1):
            v.append((-i / dx_ * 1.3, 0, -j / dy_ * 1.05))
            uv.append((i / dx_, 1 - j / dy_))
    for j in range(dy_):
        for i in range(dx_):
            q = j * (dx_ + 1) + i
            f.append((q, q + 1, q + dx_ + 2, q + dx_ + 1))
    Dm.ajouter(v, f, "drapeau", uv=uv)
    lots["toiles"].append((Dm, "drapeau", (xa + 0.06, 0, ha + 1.2), {"anim": "drapeau"}))
    L.ajouter(*N.cylindre(0.016, 0.012, 1.24, 4), "mature", T(xa + 0.08, 0, ha))
    L.ajouter(*N.sphere(0.03, 5, 4), "dorure", T(xa + 0.08, 0, ha + 1.26))
    return lots


def construire(rendu=True, cuire=True, exporter=True, taille=2048, echantillons=64, leger=False, alleger=True, couleurs=((1.0, 0.31, 0.6), (0.61, 0.3, 1.0))):
    """Dans Blender : le galion, sa lumière cuite dans l'atlas, l'export, deux rendus (aux couleurs de Barhaw)."""
    import bpy
    nom = "navire-v5" + ("-leger" if leger else "")
    coll_nom = "navire_v5" + ("_leger" if leger else "")
    lots = mailles(leger=leger)
    L = lots["corps"]
    infos = {"triangles_avant": L.triangles()}

    def poser():
        coll = N.collection(coll_nom)
        infos["finesse"] = [round(x, 2) for x in N.emballer([L], taille)]
        corps = N.objet(L, coll, "navire_corps", extras={"role": "decor"})
        vitres = N.objet(lots["vitres"], coll, "navire_vitres", extras={"role": "decor"})
        N.objet(lots["lumieres"], coll, "navire_lumieres", extras={"role": "decor"})
        for Vm, nomv, origine, extras in lots["toiles"]:
            N.objet(Vm, coll, nomv, lisse_angle=80, origine=origine, extras=extras)
        vitres.hide_render = True
        return coll, corps, vitres

    N.soleil_et_ciel()
    for m in ("peinture1", "peinture2"):
        N.teinter(m)
    if cuire and alleger:
        coll, corps, vitres = poser()
        N.cuire_ensemble([corps], None, 1024, 16, nom="essai", remplacer=False)
        infos["faces_retirees"] = L.garder([not c for c in N.cachees(L, N.pixels_atlas("essai"))])
    coll, corps, vitres = poser()
    infos["triangles"] = L.triangles()
    infos["toiles"] = sum(Vm.triangles() for Vm, _, _, _ in lots["toiles"])
    if rendu:
        N.teinter("peinture1", couleurs[0])
        N.teinter("peinture2", couleurs[1])
        infos["rendus"] = [N.rendre("galion-v5", (10.5, -13.5, 6.4), (0.7, 0, 3.0), 44, collections=[coll.name]), N.rendre("galion-v5-poupe", (-8.8, -6.8, 4.4), (-0.4, 0, 2.1), 46, collections=[coll.name])]
        N.teinter("peinture1")
        N.teinter("peinture2")
    if cuire:
        infos["atlas"] = N.cuire_ensemble([corps], os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom="navire")
    vitres.hide_render = False
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb", couleurs=True)
    return infos
