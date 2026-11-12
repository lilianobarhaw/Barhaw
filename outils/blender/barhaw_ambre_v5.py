# Le Désert d'Ambre, « niveau 5 » : des dunes dorées, et en travers de l'île le lit d'une mer qui n'est plus là. Tout est
# inventé.
# (Son histoire, dans le récit : « Des dunes dorées à perte de vue, et un mirage qui promet un buffet à volonté. Ce n'était
# qu'un mirage. Sous le sable, pourtant, il y a des coquillages et des ancres. On raconte qu'ici, il y avait une mer. Avant
# que quelqu'un ne la raye de la carte. »)
# Le relief : une mer de dunes au nord (leurs pentes raides tournées vers le sud, d'où vient la lumière), la Table, une
# butte de grès en trois gradins à l'est, et l'ancien détroit qui coupe l'île d'ouest en est : un fond de sel craquelé,
# ses anciennes lignes de rivage sur les berges, une arche que les vagues ont creusée et que le sable a laissée à sec.
# Dans le lit : l'épave d'un trois-mâts couchée sur le flanc (les chercheurs y creusent), le squelette d'une bête de mer,
# des ancres plantées dans le sable, des coraux morts, des coquillages. Au sud-ouest : l'oasis (sa mare, ses palmiers, le
# puits) et le caravansérail (trois tentes rayées, le feu, le dromadaire couché), le ponton où l'on débarque. Au nord, sur
# un replat des dunes : le mirage, un buffet servi qui tremble dans la chaleur et s'efface ; un pirate y marche, s'arrête,
# fait demi-tour. L'indice : un trait noir, parfaitement droit, qui traverse l'île d'un bout à l'autre (les dunes, le lit
# de la mer, sous la poupe de l'épave), avec son pâté d'encre au départ : là où quelqu'un a rayé la mer.
# La vie : la caravane (un guide et deux dromadaires qui marchent sur leurs quatre pattes) fait le tour du détroit et passe
# sous l'arche ; le pirate du mirage ; un porteur d'eau ; un marin qui monte du ponton ; la vigie qui fait les cent pas sur
# la Table. Et le site : un tourbillon de sable qui se promène dans le lit de la mer, le sable que le vent arrache aux
# crêtes, les vautours au-dessus de la Table, la fumée du feu.
# Sorties : ile-ambre-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf
import barhaw_plage_v5 as Pl
import barhaw_arbre_v5 as A

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry


# ---------- les matières ----------
def tx_strates(graine=1):
    """Le grès de la Table : des couches presque horizontales (v : la hauteur) d'épaisseurs et de couleurs au hasard, dont
    une veine d'ambre ; dans chaque couche, de fines laminations, parfois croisées en biais ; les couches dures avancent,
    les tendres reculent (un joint sombre entre elles) ; des alvéoles que le vent a creusées ; les coulures sombres du
    vernis du désert, de longueurs inégales."""
    n = N.TAILLE
    x, y = N.grille(n)
    rng = np.random.default_rng(graine)
    pal = np.array([N.hexa(h) for h in (0xc8733f, 0xe2a866, 0xb4563a, 0xeec992, 0xa64b32, 0xd98f52, 0xe7b97a, 0xc98a5a)], np.float32)
    nb = 13
    ep = rng.uniform(0.025, 0.13, nb)
    bornes = np.cumsum(ep) / ep.sum()
    couleurs = pal[rng.integers(len(pal), size=nb)]
    couleurs[6] = N.hexa(0xb8651f)  # la veine d'ambre, sombre ; ses nodules sont clairs
    durete = rng.random(nb)
    durete[6] = 0.9
    croise = rng.random(nb) < 0.35
    gros = N.bruit(n, 4, 2, graine + 1, 4)
    v = (y + 0.006 * (gros - 0.5) + 0.004 * (N.bruit(n, 16, 3, graine + 2, 3) - 0.5)) % 1.0
    k = np.clip(np.searchsorted(bornes, v), 0, nb - 1)
    bas = np.where(k > 0, bornes[np.maximum(k - 1, 0)], 0.0)
    joint = np.minimum(v - bas, bornes[k] - v)
    grain = N.bruit(n, 64, 16, graine + 3, 2)
    fin = N.bruit(n, 200, 60, graine + 4, 1)
    coul = couleurs[k] * (0.84 + 0.16 * grain + 0.1 * (gros - 0.5) + 0.07 * (fin - 0.5))[..., None]
    lam = 0.5 + 0.5 * np.sin((v + 0.002 * np.sin(x * 40)) * 2 * PI * 110)  # les laminations
    biais = 0.5 + 0.5 * np.sin(((v - bas) * 2.2 + x * 0.9) * 2 * PI * 18)  # croisées, dans certaines couches
    coul *= (1 - 0.06 * np.where(croise[k], biais, lam))[..., None]
    rainure = N.lisse(0.006, 0.0, joint)
    coul *= (1 - 0.45 * rainure * (0.6 + 0.4 * (1 - durete[k])))[..., None]
    alv = N.lisse(0.72, 0.84, N.bruit(n, 22, 10, graine + 5, 2)) * (1 - durete[k])  # les alvéoles des couches tendres
    coul *= (1 - 0.38 * alv)[..., None]
    long_ = N.bruit(n, 3, 5, graine + 6, 3)
    coulee = N.lisse(0.66, 0.8, N.bruit(n, 70, 1, graine + 7, 2)) * N.lisse(0.45, 0.65, long_)
    coul = N.mel(coul, N.hexa(0x4a2c21) * (0.8 + 0.4 * grain)[..., None], coulee * 0.45)
    nod = (k == 6) * N.lisse(0.7, 0.78, N.bruit(n, 140, 40, graine + 8, 1))
    coul = N.mel(coul, N.hexa(0xffb540), nod * 0.75)
    relief = np.clip(0.32 + 0.5 * durete[k] - 0.5 * rainure - 0.35 * alv + 0.12 * (grain - 0.5) + 0.04 * lam, 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("gres", tx_strates, 2.0, 1.0, graine=601)
N.matiere("gres_clair", tx_strates, 2.0, 1.0, graine=602)
N.matiere("roche_desert", N.tx_roche, 0.9, 0.9, c=0xb8784c, graine=603)
N.matiere("sable_ambre", N.tx_uni, 1.2, 0.25, c=0xe3ad5f, graine=604, grain=0.25, taches=0.3, c2=0xf1c983, seuil=0.55)
N.matiere("os", N.tx_uni, 0.6, 0.45, c=0xeadfc7, graine=605, grain=0.25, taches=0.35, c2=0xc6b08a, seuil=0.55)
N.matiere("fer_rouille", N.tx_uni, 0.6, 0.6, metal=0.2, c=0x6e4430, graine=606, grain=0.3, taches=0.55, c2=0xa8643a, seuil=0.5)
N.matiere("bois_epave", N.tx_planches, 1.2, 0.8, c=0x8f7354, graine=607, usure=0.9)
N.matiere("bois_epave_sombre", N.tx_planches, 1.2, 0.8, c=0x3f3328, graine=608, usure=0.6)
N.matiere("pelage", N.tx_uni, 0.5, 0.3, c=0xc69664, graine=609, grain=0.3, taches=0.3, c2=0xa77446, seuil=0.55)
N.matiere("eau_oasis", N.tx_uni, 1.0, 0.1, rugueux=0.1, c=0x2a8f97, graine=610, grain=0.06, taches=0.25, c2=0x6cc9c2, seuil=0.62)
N.matiere("verre_noir", N.tx_uni, 0.5, 0.3, rugueux=0.12, metal=0.4, c=0x0f0e13, graine=611, grain=0.12, taches=0.4, c2=0x3a3552, seuil=0.6)
N.matiere("ambre", N.tx_uni, 0.4, 0.3, rugueux=0.15, c=0xd9821e, graine=612, grain=0.15, taches=0.45, c2=0xffc24a, seuil=0.5)
N.matiere("terre_cuite", N.tx_uni, 0.5, 0.35, c=0xb5643a, graine=613, grain=0.25, taches=0.3, c2=0xd38c58, seuil=0.55)
N.matiere("nacre", N.tx_uni, 0.3, 0.3, c=0xf3dcc8, graine=614, grain=0.2, taches=0.4, c2=0xe9a48e, seuil=0.55)
N.matiere("corail_blanc", N.tx_uni, 0.4, 0.5, c=0xf2ece0, graine=615, grain=0.35, taches=0.3, c2=0xd8cbb2, seuil=0.55)
N.matiere("plume_vautour", N.tx_uni, 0.4, 0.3, c=0x3b2d27, graine=616, grain=0.25, taches=0.3, c2=0x5c4838, seuil=0.55)
N.matiere("roseau_oasis", N.tx_uni, 0.4, 0.3, c=0x6f9a3c, graine=617, grain=0.25, taches=0.3, c2=0x9bbd57, seuil=0.55)
N.matiere("tapis", N.tx_toile, 0.5, 0.3, c1=0x8e2a35, c2=0xe2a640, bandes=9, graine=618)
N.matiere("tapis_bleu", N.tx_toile, 0.5, 0.3, c1=0x2c3f73, c2=0xd9b56a, bandes=7, graine=619)
N.matiere("toile_tente_rouge", N.tx_toile, 0.6, 0.4, c1=0xa8322b, c2=0xf0dcb4, bandes=7, graine=620)
N.matiere("toile_tente_brune", N.tx_toile, 0.6, 0.4, c1=0x5a3a28, c2=0xd8b27a, bandes=5, graine=621)
N.matiere("toile_tente_indigo", N.tx_toile, 0.6, 0.4, c1=0x2f3f78, c2=0xece0c4, bandes=9, graine=622)
N.matiere("roti", N.tx_uni, 0.3, 0.3, c=0x8a4a22, graine=623, grain=0.3, taches=0.4, c2=0xc27a3a, seuil=0.5)
N.matiere("gateau", N.tx_uni, 0.3, 0.2, c=0xf6e2c8, graine=624, grain=0.15, taches=0.3, c2=0xff9ab8, seuil=0.62)
N.matiere("puits_fond", N.tx_uni, 0.4, 0.1, rugueux=0.15, c=0x10262c, graine=626, grain=0.05, taches=0.2)
N.matiere("pain", N.tx_uni, 0.3, 0.3, c=0xcf9a52, graine=625, grain=0.3, taches=0.3, c2=0xe8bd78, seuil=0.55)

# ---------- l'île ----------
R_SOL = 9.6
LIT = [(-8.4, 0.8), (-5.0, 0.5), (-2.0, 0.55), (0.5, 0.2), (3.0, -0.35), (5.5, -0.5), (8.4, -0.35)]  # le milieu du détroit
LX, LY = np.array([p[0] for p in LIT]), np.array([p[1] for p in LIT])
W_LIT, Z_LIT = 1.3, 0.22  # la demi-largeur du fond, sa hauteur
VENT = (0.26, -0.966)  # où va le vent : vers le sud-sud-est
CAP_VENT = math.atan2(VENT[1], VENT[0])
MESA, Z_TOP, Z1, Z2 = (3.4, 3.35), 2.6, 1.15, 1.95  # la Table : son centre, son dessus, ses deux gradins
MARE, R_MARE = (-5.15, -2.85), 0.62
PAD = (-0.6, 3.45)  # le mirage
EPAVE, CAP_EPAVE, GITE = (0.9, 0.35), math.radians(20), 0.52
RATURE = ((-2.8, 6.0), (3.8, -5.8))
TOURB = (2.7, -0.9)
FEU = (-2.25, -4.3)
PISTES = []  # les chemins (peints sur le sol)
PAS = {"pieds": [], "sabots": []}  # les empreintes : (x, y, cap)


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def rivage(th):
    """Le rayon de la côte : une île presque ronde ; les deux bouches de l'ancien détroit l'échancrent à l'ouest et à l'est."""
    return 7.0 + 0.35 * math.sin(2 * th + 0.9) + 0.25 * math.sin(3 * th + 2.6) + 0.12 * math.sin(7 * th + 1.1) - 0.5 * math.exp(-((_ecart(th, math.radians(174)) / 0.22) ** 2)) - 0.5 * math.exp(-((_ecart(th, math.radians(-3)) / 0.22) ** 2))


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def yc(x):
    """Le milieu de l'ancien détroit, à cette abscisse."""
    return float(np.interp(x, LX, LY))


def r_mesa(th):
    return 1.15 * (1 + 0.12 * math.sin(2 * th + 1.0) + 0.07 * math.sin(3 * th + 2.2) + 0.05 * math.sin(5 * th + 0.7))


def plan_mesa(th, ech=1.0):
    r = r_mesa(th) * ech
    return MESA[0] + math.cos(th) * r * 1.18, MESA[1] + math.sin(th) * r


def dmesa(x, y):
    """À peu près la distance au pied de la Table (< 0 : dessous)."""
    qx, qy = (x - MESA[0]) / 1.18, y - MESA[1]
    return math.hypot(qx, qy) - r_mesa(math.atan2(qy, qx))


def dune(x, y, lam=2.4, raide=0.25):
    """Une mer de dunes en travers du vent : une pente douce au vent, la crête vive, la pente raide sous le vent (vers le
    sud-sud-est) ; les crêtes ondulent. 0 au creux, 1 à la crête."""
    u = x * VENT[0] + y * VENT[1]
    v = x * 0.966 + y * 0.26
    ph = (u + 0.5 * math.sin(v * 0.6 + 1.1) + 0.22 * math.sin(v * 1.45 + 0.3)) / lam
    p = ph - math.floor(ph)
    c = 1 - raide
    return (p / c) ** 1.4 if p < c else ((1 - p) / raide) ** 0.9


def sol_brut(x, y):
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.45 * d)
    h = 0.24 * (1 - math.exp(-d / 0.6)) + 0.38 * K.lisse(0.8, 2.6, d) + (K.bruit2(x * 0.7, y * 0.7, 23) - 0.5) * 0.08 * K.lisse(1.0, 2.4, d)
    e = y - yc(x)
    fond = min(Z_LIT + (K.bruit2(x * 1.3, y * 1.3, 29) - 0.5) * 0.03, 0.04 + 0.3 * (1 - math.exp(-d / 0.9)))
    h = fond + (h - fond) * K.lisse(W_LIT - 0.05, W_LIT + 0.7, abs(e))
    dm = dmesa(x, y)
    m = K.lisse(2.1, 3.4, e) * K.lisse(0.6, 2.4, d) * K.lisse(0.6, 1.6, dm)
    if m > 0:
        amp = (0.5 + 1.0 * K.lisse(2.6, 5.0, e)) * (0.75 + 0.4 * K.bruit2(x * 0.3, y * 0.3, 31))
        h += m * (0.14 + amp * dune(x, y, 2.4, 0.22)) + m * 0.42 * math.exp(-((x + 2.0) ** 2 + (y - 4.7) ** 2) / 2.4)
    ms = K.lisse(2.2, 3.3, -e) * K.lisse(0.8, 2.2, d) * K.lisse(1.4, 2.6, math.hypot(x - FEU[0], y - FEU[1] - 1.0))
    if ms > 0:
        h += ms * 0.1 * dune(x + 7.3, y - 2.1, 1.7, 0.3)
    if dm < 2.5:
        h += 0.3 * math.exp(-max(dm, 0.0) / 0.42) * K.lisse(0.3, 1.0, d)
    c, s = math.cos(CAP_EPAVE), math.sin(CAP_EPAVE)
    u, w = (x - EPAVE[0]) * c + (y - EPAVE[1]) * s, -(x - EPAVE[0]) * s + (y - EPAVE[1]) * c
    h += 0.17 * math.exp(-((u / 1.5) ** 2) - ((w - 0.5) / 0.32) ** 2)  # le sable que le vent a poussé contre la coque
    dp = math.hypot(x - MARE[0], y - MARE[1])
    h -= 0.3 * K.lisse(R_MARE + 0.3, R_MARE - 0.15, dp)
    return h


H_PAD = float(np.mean([sol_brut(PAD[0] + math.cos(a) * r, PAD[1] + math.sin(a) * r) for r in (0.4, 0.9, 1.4) for a in np.linspace(0, 2 * PI, 12, endpoint=False)]))


def sol(x, y):
    """La hauteur du terrain (le replat du mirage aplani)."""
    h = sol_brut(x, y)
    t = K.lisse(1.7, 0.8, math.hypot(x - PAD[0], y - PAD[1]))
    return h + (H_PAD - h) * t


Z_EAU = sol(MARE[0] + R_MARE + 0.35, MARE[1]) - 0.11


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


# ---------- le sol ----------
def fissures(n, g, graine=0):
    """Des cellules de Voronoï sur toute l'île (g par côté), en cherchant seulement parmi les 9 germes voisins : la distance
    au joint (en cellules) et le numéro de la cellule."""
    x, y = N.grille(n)
    gx, gy = x * g, y * g
    ci, cj = np.floor(gx).astype(np.int32), np.floor(gy).astype(np.int32)
    jit = np.random.default_rng(graine).random((g + 2, g + 2, 2)).astype(np.float32)
    f1 = np.full((n, n), 9.0, np.float32)
    f2 = np.full((n, n), 9.0, np.float32)
    ident = np.zeros((n, n), np.int32)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            ii, jj = np.clip(ci + di, -1, g) + 1, np.clip(cj + dj, -1, g) + 1
            px = ci + di + 0.15 + 0.7 * jit[jj, ii, 0]
            py = cj + dj + 0.15 + 0.7 * jit[jj, ii, 1]
            dd = np.hypot(gx - px, gy - py)
            pres = dd < f1
            f2 = np.where(pres, f1, np.minimum(f2, dd))
            ident = np.where(pres, jj * (g + 2) + ii, ident)
            f1 = np.minimum(f1, dd)
    return f2 - f1, ident


def dist_traits(X, Y, pts):
    """La distance (numpy) de chaque point (X, Y) à une ligne brisée."""
    mini = np.full(X.shape, 9.0, np.float32)
    for (ax, ay, *_), (bx, by, *_) in zip(pts[:-1], pts[1:]):
        dx, dy = bx - ax, by - ay
        l2 = max(1e-9, dx * dx + dy * dy)
        t = np.clip(((X - ax) * dx + (Y - ay) * dy) / l2, 0, 1)
        mini = np.minimum(mini, np.hypot(X - (ax + t * dx), Y - (ay + t * dy)))
    return mini


def tampon(coul, rel, n, x, y, cap, lx, ly, teinte, force, creux):
    """Une empreinte : un ovale (lx × ly, tourné de cap) plus sombre et un peu creusé, posé sur le sol peint."""
    px = (x + R_SOL) / (2 * R_SOL) * n - 0.5
    py = (y + R_SOL) / (2 * R_SOL) * n - 0.5
    r = int(max(lx, ly) / (2 * R_SOL) * n) + 2
    i0, j0 = int(px) - r, int(py) - r
    if i0 < 0 or j0 < 0 or i0 + 2 * r + 1 >= n or j0 + 2 * r + 1 >= n:
        return
    oy, ox = np.mgrid[j0:j0 + 2 * r + 1, i0:i0 + 2 * r + 1].astype(np.float32)
    wx, wy = (ox - px) * 2 * R_SOL / n, (oy - py) * 2 * R_SOL / n
    c, s = math.cos(cap), math.sin(cap)
    u, v = wx * c + wy * s, -wx * s + wy * c
    q = (u / (lx / 2)) ** 2 + (v / (ly / 2)) ** 2
    m = N.lisse(1.0, 0.55, q) * force
    bloc = coul[j0:j0 + 2 * r + 1, i0:i0 + 2 * r + 1]
    coul[j0:j0 + 2 * r + 1, i0:i0 + 2 * r + 1] = bloc * (1 - m[..., None]) + bloc * np.asarray(teinte, np.float32) * m[..., None]
    rel[j0:j0 + 2 * r + 1, i0:i0 + 2 * r + 1] -= m * creux


def tx_sol_ambre(taille=2048, graine=151):
    """Le sol peint pixel par pixel : la grève, la mer de dunes (ambre au creux, dorée aux crêtes, ridée par le vent), le
    reg caillouteux du sud, le fond de l'ancienne mer (sel craquelé, coquillages, les anciennes lignes de rivage sur les
    berges), les éboulis de la Table, l'oasis et son herbe, le camp piétiné, les pistes et leurs empreintes, et le trait noir
    qui raye l'île, avec son pâté d'encre."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL), n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    crete = K.agrandir(K.champ(lambda x, y: dune(x, y), R_SOL, 240), n)
    mdune = K.agrandir(K.champ(lambda x, y: K.lisse(2.1, 3.4, y - yc(x)) * K.lisse(0.6, 2.4, bord(x, y)) * K.lisse(0.6, 1.6, dmesa(x, y)), R_SOL), n)
    dm = K.agrandir(K.champ(dmesa, R_SOL), n)
    xs = ((np.arange(n) + 0.5) / n * 2 - 1).astype(np.float32) * R_SOL
    X, Y = np.meshgrid(xs, xs)
    e = Y - np.interp(X, LX, LY).astype(np.float32)
    a = np.abs(e)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    # la grève et le sable sec
    coul = np.broadcast_to(N.hexa(0xe9cf9b), (n, n, 3)).copy() * (0.92 + 0.1 * b1 + 0.06 * fin + 0.1 * (grain - 0.5))[..., None]
    coul = N.mel(coul, N.hexa(0xb59a72) * (0.88 + 0.18 * b2)[..., None], N.lisse(0.16, 0.02, h + (b2 - 0.5) * 0.06))
    # les dunes : ambre au creux, or à la crête ; les rides du vent (en travers du vent)
    u = X * VENT[0] + Y * VENT[1]
    v = X * 0.966 + Y * 0.26
    sable = N.mel(N.hexa(0xd18f45) * (0.92 + 0.14 * b2)[..., None], N.hexa(0xf2cb7e) * (0.95 + 0.1 * b3)[..., None], np.clip(crete ** 1.6, 0, 1))
    sable = N.mel(sable, N.hexa(0xc9763c), N.lisse(0.55, 0.85, b1) * 0.3)  # de grandes taches plus rouges
    rides = np.sin((u + 0.045 * np.sin(v * 7.0) + (b3 - 0.5) * 0.18) * 2 * PI / 0.12)
    sable *= (1 + 0.05 * N.lisse(0.4, 1.0, rides) * (1 - crete * 0.5) - 0.035 * N.lisse(-0.5, -1.0, rides))[..., None]
    sur_terre = N.lisse(0.18, 0.34, h + (b2 - 0.5) * 0.1)
    coul = N.mel(coul, sable, sur_terre * np.clip(0.35 + 0.65 * mdune, 0, 1))
    # le reg du sud : du sable plus pâle, semé de cailloux
    reg = N.hexa(0xd7aa6c) * (0.88 + 0.2 * b2 + 0.12 * (grain - 0.5))[..., None]
    reg = np.where(((semis < 0.03) & (fin > 0.45))[..., None], reg * 0.62, reg)
    reg = np.where((semis > 0.993)[..., None], np.array([0.93, 0.88, 0.8], np.float32), reg)
    coul = N.mel(coul, reg, sur_terre * N.lisse(1.9, 2.8, -e) * (1 - mdune))
    # le fond de l'ancienne mer : sel craquelé, coquillages ; les anciennes lignes de rivage sur ses berges
    lit = N.lisse(W_LIT + 0.4, W_LIT - 0.05, a + (b2 - 0.5) * 0.25) * sur_terre
    dj, ident = fissures(n, 56, graine + 7)
    al = (np.sin(ident * 12.9898) * 43758.5453) % 1.0
    fond = N.hexa(0xd9c8a3) * (0.9 + 0.12 * al + 0.1 * (fin - 0.5))[..., None]
    fond = N.mel(fond, N.hexa(0xf2ece0), N.lisse(0.58, 0.72, b2) * 0.75)  # les croûtes de sel
    fond = N.mel(fond, N.hexa(0xb59f7b), N.lisse(0.38, 0.22, b1) * 0.5)  # le fond plus humide
    fond *= (1 - 0.45 * N.lisse(0.06, 0.0, dj) * N.lisse(0.3, 0.55, b3 + 0.2))[..., None]  # les craquelures
    coq = (semis > 0.9965) | ((semis < 0.0025) & (b3 > 0.4))
    fond = np.where(coq[..., None], np.where((semis > 0.998)[..., None], np.array([1.0, 0.8, 0.74], np.float32), np.array([0.98, 0.95, 0.9], np.float32)), fond)
    coul = N.mel(coul, fond, lit)
    berge = (1 - lit) * N.lisse(W_LIT + 1.0, W_LIT + 0.7, a) * N.lisse(W_LIT - 0.1, W_LIT + 0.1, a) * sur_terre
    for k, ak in enumerate((W_LIT + 0.18, W_LIT + 0.38, W_LIT + 0.6)):
        ligne = N.lisse(0.035, 0.0, np.abs(a - ak + (b3 - 0.5) * 0.06))
        coul = N.mel(coul, coul * np.array([0.82, 0.78, 0.72], np.float32), ligne * berge * (0.7 - 0.15 * k))
        coul = N.mel(coul, N.hexa(0xf0e4c8), N.lisse(0.07, 0.035, np.abs(a - ak - 0.05)) * berge * 0.35)
    coul = np.where((coq & (berge > 0.2))[..., None], np.array([0.98, 0.94, 0.88], np.float32), coul)
    # les éboulis au pied de la Table
    ebou = N.lisse(0.9, 0.1, dm + (b2 - 0.5) * 0.4) * sur_terre
    eb = N.hexa(0xb5714a) * (0.8 + 0.3 * b3 + 0.2 * (grain - 0.5))[..., None]
    eb = np.where((semis < 0.06)[..., None], eb * 0.7, eb)
    coul = N.mel(coul, eb, ebou * 0.8)
    # l'oasis : la vase, l'herbe en couronne, le sable humide
    dp = np.hypot(X - MARE[0], Y - MARE[1])
    coul = N.mel(coul, N.hexa(0x6a5a3e) * (0.85 + 0.25 * fin)[..., None], N.lisse(R_MARE + 0.45, R_MARE + 0.05, dp) * 0.7)
    herbe = N.hexa(0x7f9f45) * (0.75 + 0.35 * b3 + 0.2 * (grain - 0.5))[..., None]
    coul = N.mel(coul, herbe, N.lisse(R_MARE + 1.25, R_MARE + 0.45, dp + (b2 - 0.5) * 0.6) * N.lisse(R_MARE + 0.05, R_MARE + 0.3, dp) * 0.9)
    # le camp : la terre piétinée, la cendre du feu
    df = np.hypot(X - FEU[0], Y - FEU[1] - 0.6)
    coul = N.mel(coul, N.hexa(0xbe9461) * (0.85 + 0.25 * b3)[..., None], N.lisse(2.0, 0.9, df + (b2 - 0.5) * 0.8) * 0.55)
    coul = N.mel(coul, N.hexa(0x4b4540) * (0.8 + 0.4 * fin)[..., None], N.lisse(0.34, 0.2, np.hypot(X - FEU[0], Y - FEU[1]) + (b3 - 0.5) * 0.1) * 0.9)
    # les pistes
    xg = ((np.arange(512) + 0.5) / 512 * 2 - 1).astype(np.float32) * R_SOL
    Xg, Yg = np.meshgrid(xg, xg)
    for t_ in PISTES:
        dd = K.agrandir(dist_traits(Xg, Yg, t_), n)
        coul = N.mel(coul, coul * np.array([0.8, 0.72, 0.64], np.float32), N.lisse(0.16, 0.03, dd + (b3 - 0.5) * 0.06) * 0.75 * sur_terre)
    rel = np.clip(0.35 + 0.35 * b3 + 0.2 * fin + 0.06 * rides * mdune, 0, 1).astype(np.float32)
    for x, y, c in PAS["pieds"]:
        tampon(coul, rel, n, x, y, c, 0.055, 0.028, (0.62, 0.54, 0.46), 0.75, 0.2)
    for x, y, c in PAS["sabots"]:
        tampon(coul, rel, n, x, y, c, 0.05, 0.05, (0.64, 0.56, 0.48), 0.7, 0.2)
    # le trait noir, et son pâté d'encre
    (ax, ay), (bx, by) = RATURE
    dx, dy = bx - ax, by - ay
    t = np.clip(((X - ax) * dx + (Y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    dr = np.hypot(X - (ax + t * dx), Y - (ay + t * dy))
    w = (0.068 + 0.014 * np.sin(t * 41.0) + 0.016 * (b3 - 0.5)) * np.clip((1 - t) / 0.05, 0.15, 1)
    rr = dr + (fin - 0.5) * 0.03 + (grain - 0.5) * 0.012
    rng = np.random.default_rng(graine + 9)
    for k in range(9):  # le pâté au départ, et ses éclaboussures
        an, dd_ = rng.random() * 2 * PI, (0.0 if k == 0 else 0.35 + rng.random() * 0.55)
        r0 = 0.36 if k == 0 else 0.025 + rng.random() * 0.06
        db = np.hypot(X - (ax + math.cos(an) * dd_), Y - (ay + math.sin(an) * dd_)) - r0 * (1 + 0.18 * (b3 - 0.5) + 0.1 * np.sin(np.arctan2(Y - ay, X - ax) * 7))
        rr = np.minimum(rr - w, db) + w
    coeur = N.lisse(w + 0.012, w - 0.006, rr)
    halo = N.lisse(w + 0.28, w, dr) * (1 - coeur)
    coul *= (1 - 0.32 * halo)[..., None]
    coul = N.mel(coul, N.hexa(0x121116) * (0.9 + 0.2 * fin)[..., None], coeur)
    coul = N.mel(coul, N.hexa(0x3a3a4a), coeur * N.lisse(0.7, 0.9, fin) * 0.4)  # le noir brille par endroits
    rel *= (1 - 0.75 * coeur)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(rel, 0, 1).astype(np.float32)


N.matiere("sol_ambre", tx_sol_ambre, 2 * R_SOL, 0.35)


# ---------- les pièces ----------
def jarre(L, M, h=0.24, mat="terre_cuite"):
    """Une jarre (son profil tourné) ; M : son pied."""
    L.ajouter(*N.tube([(0, 0, 0.0), (0, 0, h * 0.28), (0, 0, h * 0.6), (0, 0, h * 0.86), (0, 0, h)], [h * 0.16, h * 0.3, h * 0.27, h * 0.12, h * 0.15], 7, bouts=True), mat, M, doux=True)


def dromadaire(D, rng, couche=False, charge=False, marche=False):
    """Un dromadaire (il regarde vers +x ; l'origine au sol, entre ses pattes) : le corps, la bosse, le long cou, la tête,
    les quatre pattes ; couché, les pattes repliées sous lui ; chargé, une couverture rayée et des ballots. marche : ses
    pattes sont marquées (rouge : la diagonale ; vert : la hauteur de la hanche ; bleu : où est la patte) pour que le site
    les fasse marcher."""
    zb = 0.17 if couche else 0.36
    v, f = N.sphere(0.15, 10, 6, 0.75)
    D.ajouter([(a * 1.75, b, c) for a, b, c in v], f, "pelage", T(0, 0, zb), doux=True)
    D.ajouter(*N.sphere(0.095, 8, 5, 0.85), "pelage", T(-0.03, 0, zb + 0.1), doux=True)
    cou = [(0.2, 0, zb + 0.04), (0.31, 0, zb + 0.07), (0.37, 0, zb + 0.2), (0.38, 0, zb + 0.29)]
    D.ajouter(*N.tube(cou, [0.07, 0.052, 0.042, 0.036], 7, bouts=False), "pelage", doux=True)
    v, f = N.sphere(0.05, 7, 5, 0.72)
    D.ajouter([(a * 1.6, b, c) for a, b, c in v], f, "pelage", T(0.43, 0, zb + 0.31), doux=True)
    D.ajouter(*N.sphere(0.03, 6, 4, 0.8), "pelage", T(0.5, 0, zb + 0.29), doux=True)
    for s in (-1, 1):
        D.ajouter(*N.cylindre(0.012, 0.0, 0.04, 4), "pelage", T(0.395, s * 0.028, zb + 0.34) @ Rx(-s * 0.4))
        D.ajouter(*N.sphere(0.007, 4, 3), "tissu_sombre", T(0.46, s * 0.034, zb + 0.325))
    D.ajouter(*N.tube([(-0.25, 0, zb + 0.05), (-0.28, 0, zb - 0.04), (-0.285, 0, zb - 0.13)], [0.014, 0.011, 0.008], 4, bouts=True), "pelage")
    if couche:
        for xl in (0.15, -0.15):
            for s in (-1, 1):
                D.ajouter(*N.tube([(xl, s * 0.09, 0.07), (xl + 0.1, s * 0.11, 0.03), (xl + 0.17, s * 0.1, 0.025)], [0.032, 0.026, 0.022], 5, bouts=True), "pelage", doux=True)
    else:
        pivot = zb - 0.05
        for xl, sy, sens in ((0.16, 1, 1), (0.16, -1, 0), (-0.17, -1, 1), (-0.17, 1, 0)):
            z_ = (float(sens), round(0.45 + pivot / 1.5, 3), round(0.25 + xl, 3)) if marche else 0
            jambe = [(xl, sy * 0.065, zb - 0.02), (xl + 0.01, sy * 0.066, pivot * 0.48), (xl, sy * 0.064, 0.025)]
            D.ajouter(*N.tube(jambe, [0.036, 0.022, 0.019], 6, bouts=False), "pelage", zone=z_)
            D.ajouter(*N.sphere(0.03, 6, 3, 0.45), "pelage", T(xl + 0.012, sy * 0.064, 0.012), zone=z_)
    if charge:
        # la couverture rayée drapée sur le dos et la bosse
        vv, uv, ff = [], [], []
        nx_, nt = 6, 7
        for i in range(nx_ + 1):
            x = -0.17 + 0.27 * i / nx_
            k = math.sqrt(max(0.0, 1 - (x / 0.262) ** 2))
            for j in range(nt + 1):
                th = -1.3 + 2.6 * j / nt
                bosse = 0.105 * math.exp(-((x + 0.03) / 0.085) ** 2) * math.cos(th) ** 2
                vv.append((x, math.sin(th) * 0.158 * k * 1.06, zb + math.cos(th) * 0.1125 * k * 1.06 + bosse))
                uv.append((i / nx_, j / nt * 1.5))
        for i in range(nx_):
            for j in range(nt):
                a_ = i * (nt + 1) + j
                ff.append((a_, a_ + 1, a_ + nt + 2, a_ + nt + 1))
        A.toile(D, vv, ff, rng.choice(["tapis", "tapis_bleu"]), ep=0.006, uv=uv)
        for s in (-1, 1):  # les ballots, de chaque côté
            D.ajouter(*N.sphere(0.07, 7, 5, 0.85), rng.choice(["toile_ecrue", "tissu_creme", "tissu_bleu"]), T(-0.06, s * 0.2, zb - 0.03), doux=True)
            jarre(D, T(0.06, s * 0.19, zb - 0.12) @ Rx(-s * 0.15), 0.15)
        D.ajouter(*N.tube([(-0.05, -0.17, zb + 0.16), (-0.05, 0.17, zb + 0.16)], 0.035, 7, bouts=True), "tapis", doux=True)  # un tapis roulé


def tente(L, U, rng, x, y, cap, mat, lx=1.1, ly=0.8):
    """Une tente du désert, ouverte devant (local -y ; cap : là où elle regarde) : la toile rayée tendue sur ses mâts (plus
    haute au faîte, elle se creuse entre les mâts), le lambrequin, le fond et les flancs fermés, les cordes et leurs piquets ;
    dedans, le tapis, les coussins, une jarre, la lanterne pendue au faîte. Renvoie l'emprise."""
    M = T(x, y, sol(x, y)) @ Rz(cap + PI / 2)
    zf, zr, zd = 0.5, 0.74, 0.4  # devant, au faîte, au fond
    yr = -0.05
    def haut(xx, yy):
        hy = zf + (zr - zf) * (yy + ly / 2) / (yr + ly / 2) if yy < yr else zr + (zd - zr) * (yy - yr) / (ly / 2 - yr)
        travee = ((xx + lx / 2) % (lx / 2)) / (lx / 2)
        creux = 0.05 * math.sin(PI * travee) * (1.0 if abs(yy - yr) > 0.05 else 0.4) + 0.03 * math.sin(PI * min(1.0, abs(yy - yr) / (ly / 2 + yr if yy > yr else yr + ly / 2)))
        return hy - creux
    nx_, ny_ = (6, 4) if N.DETAIL < 1 else (8, 6)
    vv, uv, ff = [], [], []
    for j in range(ny_ + 1):
        yy = -ly / 2 + ly * j / ny_
        for i in range(nx_ + 1):
            xx = -lx / 2 + lx * i / nx_
            vv.append((xx, yy, haut(xx, yy)))
            uv.append((xx / 0.6, yy / 0.6))
    for j in range(ny_):
        for i in range(nx_):
            a_ = j * (nx_ + 1) + i
            ff.append((a_, a_ + 1, a_ + nx_ + 2, a_ + nx_ + 1))
    A.toile(L, vv, ff, mat, M, ep=0.008, uv=uv)
    # le lambrequin devant, le fond, les flancs (fermés derrière le faîte)
    lam = [(xx, -ly / 2 - 0.004, haut(xx, -ly / 2)) for xx in np.linspace(-lx / 2, lx / 2, nx_ + 1)]
    vv = lam + [(p[0], p[1], p[2] - 0.08 - 0.015 * (k % 2)) for k, p in enumerate(lam)]
    A.toile(L, vv, [(k, k + 1, nx_ + 2 + k, nx_ + 1 + k) for k in range(nx_)], mat, M, ep=0.006, uv=[(p[0] / 0.6, 0.0) for p in lam] + [(p[0] / 0.6, 0.14) for p in lam])
    fond = [(xx, ly / 2 + 0.002, haut(xx, ly / 2)) for xx in np.linspace(-lx / 2, lx / 2, nx_ + 1)]
    vv = fond + [(p[0], p[1] + 0.04, -0.03) for p in fond]
    A.toile(L, vv, [(nx_ + 1 + k, nx_ + 2 + k, k + 1, k) for k in range(nx_)], mat, M, ep=0.006, uv=[(p[0] / 0.6, 0.0) for p in fond] + [(p[0] / 0.6, 0.7) for p in fond])
    for s in (-1, 1):
        bord_ = [(s * lx / 2 + s * 0.002, yy, haut(s * lx / 2, yy)) for yy in np.linspace(yr, ly / 2, 4)]
        vv = bord_ + [(p[0] + s * 0.03, p[1], -0.03) for p in bord_]
        ff = [(k, k + 1, 5 + k, 4 + k) if s > 0 else (4 + k, 5 + k, k + 1, k) for k in range(3)]
        A.toile(L, vv, ff, mat, M, ep=0.006, uv=[(p[1] / 0.6, 0.0) for p in bord_] + [(p[1] / 0.6, 0.7) for p in bord_])
    # les mâts, les cordes, les piquets
    for yy, zz in ((-ly / 2, zf), (yr, zr), (ly / 2, zd)):
        for xx in ((-lx / 2, 0.0, lx / 2) if yy != yr else (-lx / 4, lx / 4)):
            L.ajouter(*N.cylindre(0.014, 0.012, zz + 0.04, 5), "planches_sombres", M @ T(xx, yy, -0.04))
    for xx in (-lx / 2, lx / 2):
        for yy, zz, dy in ((-ly / 2, zf, -0.42), (ly / 2, zd, 0.35)):
            pq = (xx * 1.25, yy + dy, 0.0)
            L.ajouter(*N.poutre((xx, yy, zz), pq, 0.008), "corde_arbre", M)
            L.ajouter(*N.poutre((pq[0], pq[1], -0.04), (pq[0], pq[1], 0.05), 0.02), "planches_sombres", M)
    # dedans
    L.ajouter(*N.boite(lx * 0.8, ly * 0.75, 0.012), rng.choice(["tapis", "tapis_bleu"]), M @ T(0, 0.04, 0.0))
    for k in range(3 if N.DETAIL >= 1 else 1):
        L.ajouter(*N.sphere(0.07, 7, 4, 0.45), rng.choice(["tissu_rouge", "tissu_bleu", "tissu_vert", "tapis"]), M @ T(-0.3 + 0.3 * k, ly / 2 - 0.15, 0.03), doux=True)
    jarre(L, M @ T(lx / 2 - 0.12, ly / 2 - 0.12, 0.012), 0.2)
    A.lanterne(L, U, tuple((M @ np.array((0.05, yr - 0.05, zr - 0.2, 1.0)))[:3]), True, 0.16)
    return Vf.rectangle(x, y, lx + 0.2, ly + 0.8, cap + PI / 2)


def epave(L, rng, M, lg=3.0, larg=1.0, creux=0.5, franc=0.12, leger=False):
    """L'épave d'un trois-mâts (proue vers +x) : la coque bordée, ouverte à la poupe où les membrures sont à nu, le pont qui
    a perdu des planches, le plat-bord, le tronçon du grand mât, le beaupré. Renvoie les sections de la coque."""
    n = 8 if leger else 10
    sec = []
    for i in range(n + 1):
        t = i / n
        x = -lg / 2 + lg * t
        w = larg / 2 * (math.sin(PI * (0.08 + 0.92 * t) ** 0.8) ** 0.7 if t < 1 else 0.02) * (0.82 if i == 0 else 1)
        rel = 0.16 * creux * (abs(t - 0.45) * 2) ** 2.2
        sec.append([(x, -w, franc + rel), (x, -w * 0.84, -creux * 0.35), (x, 0, -creux * (0.75 if 0 < i < n else 0.35)), (x, w * 0.84, -creux * 0.35), (x, w, franc + rel)])
    v = [p for s in sec for p in s]
    f, fi = [], []
    for i in range(n):
        for k in range(4):
            if i == 0 and k in (0, 3) or i == 1 and k == 3:
                continue  # la poupe défoncée
            a_, b_ = i * 5 + k, i * 5 + k + 1
            f.append((a_, b_, b_ + 5, a_ + 5))
    L.ajouter(v, f, "bois_epave", M, tourne=True)
    L.ajouter(v, [tuple(reversed(q)) for q in f], "bois_epave_sombre", M, tourne=True)
    for i in range(0, 4):  # les membrures à nu, à la poupe ; certaines cassées plus haut
        pts = list(sec[i])
        haut_ = 0.06 + 0.1 * rng.random()
        pts = [(pts[0][0], pts[0][1] * 1.02, pts[0][2] + haut_)] + pts + [(pts[4][0], pts[4][1] * 1.02, pts[4][2] + 0.1 * rng.random())]
        L.ajouter(*N.tube(pts, 0.026, 4, bouts=True), "bois_epave", M)
    for s in (0, 4):  # le plat-bord (pas à la poupe)
        L.ajouter(*N.tube([sec[i][s] for i in range(2, n + 1)], 0.03, 4, bouts=True), "bois_epave_sombre", M)
    for i in range(2, n - 1):  # le pont : des bordages en long, certains arrachés
        for j in range(6):
            if rng.random() < 0.3:
                continue
            fy0, fy1 = -1 + j / 3, -1 + (j + 1) / 3 - 0.04
            a0, a1 = sec[i][0], sec[i + 1][0]
            b0, b1 = sec[i][4], sec[i + 1][4]
            zz = lambda p, q, t_: p[2] + (q[2] - p[2]) * t_ - 0.03
            pts = [(a0[0], b0[1] * fy0, zz(a0, b0, 0.5) - 0.02), (a1[0], b1[1] * fy0, zz(a1, b1, 0.5) - 0.02), (a1[0], b1[1] * fy1, zz(a1, b1, 0.5) - 0.02), (a0[0], b0[1] * fy1, zz(a0, b0, 0.5) - 0.02)]
            L.ajouter(pts + [(p[0], p[1], p[2] - 0.025) for p in pts], [(0, 1, 2, 3), (4, 7, 6, 5), (0, 3, 7, 4), (1, 5, 6, 2)], "bois_epave", M)
    mx = lg * 0.06
    L.ajouter(*N.cylindre(0.065, 0.06, 0.62, 8, haut=False), "bois_epave_sombre", M @ T(mx, 0, -0.25), tourne=True)
    L.ajouter(*N.cylindre(0.06, 0.0, 0.12, 8, haut=False), "bois_epave", M @ T(mx, 0, 0.37) @ Ry(0.35))  # cassé net, en biseau
    L.ajouter(*N.tube([(lg / 2 - 0.05, 0, franc + 0.12), (lg / 2 + 0.45, 0, franc + 0.42)], [0.04, 0.025], 6, bouts=True), "bois_epave_sombre", M)
    return sec


def ancre(L, x, y, cap, incline, enfonce=0.25, chaine=True, g=1.35):
    """Une grande ancre plantée dans le sable : la verge, le jas de bois, l'organeau, les deux bras et leurs pattes, et sa
    chaîne de maillons qui file sur le sable."""
    M = T(x, y, sol(x, y) - enfonce) @ Rz(cap) @ Rx(incline) @ np.diag([g, g, g, 1.0])
    L.ajouter(*N.tube([(0, 0, -0.05), (0, 0, 0.88)], [0.05, 0.04], 7, bouts=True), "fer_rouille", M)
    L.ajouter(*N.poutre((0, -0.3, 0.78), (0, 0.3, 0.78), 0.07, 0.06), "planches_sombres", M)
    L.ajouter(*N.tube([(0, 0.065 * math.cos(a), 0.95 + 0.065 * math.sin(a)) for a in np.linspace(0, 2 * PI, 10)], 0.018, 5, bouts=False), "fer_rouille", M)
    bras = [(-0.42, 0, 0.2), (-0.28, 0, 0.0), (0, 0, -0.07), (0.28, 0, 0.0), (0.42, 0, 0.2)]
    L.ajouter(*N.tube(bras, [0.04, 0.045, 0.05, 0.045, 0.04], 7, bouts=True), "fer_rouille", M)
    for s in (-1, 1):
        L.ajouter([(-0.09, -0.016, -0.1), (0.09, -0.016, -0.1), (0.0, -0.016, 0.12), (-0.09, 0.016, -0.1), (0.09, 0.016, -0.1), (0.0, 0.016, 0.12)], [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], "fer_rouille", M @ T(s * 0.42, 0, 0.24) @ Ry(-s * 0.55))
    if chaine:
        q = M @ np.array((0, 0, 1.0, 1.0))
        dirc = cap + 0.6
        pts = []
        for k in range(10):
            t = k / 9
            px, py = q[0] + math.cos(dirc) * 1.1 * t + 0.08 * math.sin(t * 5), q[1] + math.sin(dirc) * 1.1 * t
            pz = max(sol(px, py) + 0.02, q[2] * (1 - t) ** 2.2 + (sol(px, py) + 0.02) * (1 - (1 - t) ** 2.2))
            pts.append((px, py, pz))
        for k in range(len(pts) - 1):
            a_, b_ = np.array(pts[k]), np.array(pts[k + 1])
            m_ = (a_ + b_) / 2
            u = (b_ - a_) / (np.linalg.norm(b_ - a_) or 1.0)
            w = np.cross(u, (0, 0, 1.0)) if k % 2 else np.array((0, 0, 1.0)) - u * u[2]
            w = w / (np.linalg.norm(w) or 1.0)
            ln = float(np.linalg.norm(b_ - a_)) * 0.62
            ovale = [tuple(m_ + u * math.cos(t) * ln + w * math.sin(t) * 0.04) for t in np.linspace(0, 2 * PI, 7)]
            L.ajouter(*N.tube(ovale, 0.014, 3, bouts=False), "fer_rouille")


def conque(L, x, y, cap, taille=1.0, mat="nacre"):
    """Un gros coquillage en spirale, couché sur le sable."""
    pts, ray = [], []
    for k in range(11):
        t = k / 10
        a = t * 3.6 * PI
        r = 0.07 * (1 - t) ** 1.2 * taille
        pts.append((math.cos(a) * r, math.sin(a) * r, 0.16 * t * taille))
        ray.append(0.06 * (1 - t) ** 1.1 * taille + 0.004)
    M = T(x, y, sol(x, y) + 0.03 * taille) @ Rz(cap) @ Ry(1.35)
    L.ajouter(*N.tube(pts, ray, 6, bouts=True), mat, M, doux=True)


def corail(L, rng, x, y, h=0.4):
    """Un corail mort, blanchi : un tronc et ses branches."""
    z = sol(x, y) - 0.05
    tronc_ = [(x, y, z), (x + 0.02, y, z + h * 0.5)]
    L.ajouter(*N.tube(tronc_, [0.05, 0.035], 5, bouts=False), "corail_blanc")
    for k in range(4):
        a = k * 1.6 + rng.random()
        b = (x + 0.02 + math.cos(a) * h * 0.35, y + math.sin(a) * h * 0.35, z + h * (0.7 + 0.3 * rng.random()))
        L.ajouter(*N.tube([tronc_[1], ((tronc_[1][0] + b[0]) / 2, (tronc_[1][1] + b[1]) / 2, b[2] - 0.05), b], [0.032, 0.022, 0.012], 5, bouts=True), "corail_blanc", doux=True)


def vautour(L, x, y, z, cap):
    """Un vautour perché, les ailes repliées, la tête nue."""
    M = T(x, y, z) @ Rz(cap)
    v, f = N.sphere(0.06, 7, 5, 0.9)
    L.ajouter([(a * 1.35, b, c) for a, b, c in v], f, "plume_vautour", M @ T(0, 0, 0.07) @ Ry(-0.45), doux=True)
    for s in (-1, 1):
        v, f = N.sphere(0.045, 6, 4, 0.5)
        L.ajouter([(a * 2.0, b, c) for a, b, c in v], f, "plume_vautour", M @ T(-0.03, s * 0.045, 0.085) @ Ry(-0.3), doux=True)
    L.ajouter(*N.tube([(0.06, 0, 0.11), (0.085, 0, 0.15)], [0.016, 0.012], 5), "peau", M)
    L.ajouter(*N.sphere(0.022, 6, 4), "peau", M @ T(0.095, 0, 0.16))
    L.ajouter(*N.cylindre(0.01, 0.0, 0.03, 4), "toile_or", M @ T(0.115, 0, 0.155) @ Ry(PI / 2 + 0.4))
    L.ajouter(*N.sphere(0.04, 6, 3, 0.6), "tissu_creme", M @ T(0.045, 0, 0.11))  # la collerette


def touffe(L, rng, x, y, z, h=0.16):
    """Une touffe d'herbe sèche (le vent la fait frémir)."""
    for k in range(5):
        a = k * 1.25 + rng.random()
        L.ajouter(*N.cylindre(0.012, 0.0, h * (0.7 + 0.5 * rng.random()), 3), "herbe_seche", T(x + math.cos(a) * 0.03, y + math.sin(a) * 0.03, z - 0.01) @ Rz(a) @ Rx(0.35 + 0.2 * rng.random()), zone=(1.0, 0.8, 1.0))


def creuseur(L, rng, x, y, cap, z=None):
    """Un chercheur, sa pelle levée (le fer au sol, devant lui)."""
    z = sol(x, y) if z is None else z
    P.passant(L, rng, x, y, angle=cap, z=z, leve=1)
    M = T(x, y, z) @ Rz(cap)
    main = M @ np.array((0.01, 0.066, 0.32, 1.0))
    pied = M @ np.array((0.24, 0.05, 0.0, 1.0))
    L.ajouter(*N.poutre(tuple(main[:3]), (pied[0], pied[1], sol(pied[0], pied[1]) + 0.08), 0.016), "planches")
    L.ajouter(*N.boite(0.08, 0.012, 0.09), "fer", T(pied[0], pied[1], sol(pied[0], pied[1]) - 0.02) @ Rz(cap))


# ---------- la Table ----------
def table_de_gres(L, rng, leger):
    """La Table : trois gradins de grès, décentrés les uns sur les autres ; des parois un peu inclinées, bosselées, entaillées
    de ravines, coiffées d'un rebord dur qui avance ; des replats ensablés qui penchent ; un dessus bosselé. Renvoie le
    contour du dessus."""
    n = 22 if leger else 32
    ths = [k * 2 * PI / n for k in range(n)]
    ravines = [[rng.random() * 2 * PI for _ in range(4)] for _ in range(3)]
    decal = [(0.0, 0.0), (0.12, 0.06), (0.2, 0.14)]
    def forme(th, k_):
        f = 1 + 0.08 * math.sin(2 * th + k_ * 0.9) + 0.06 * math.sin(3 * th + k_ * 1.3) + 0.03 * math.sin(7 * th + k_ * 2.1) + 0.02 * math.sin(13 * th + k_)
        return f - sum(0.09 * math.exp(-((_ecart(th, g) / 0.07) ** 2)) for g in ravines[k_])
    def anneau(ech, z, k_, dz=0.0, phase=0.0):
        dx, dy = decal[k_]
        return [(plan_mesa(th, ech * forme(th, k_))[0] + dx, plan_mesa(th, ech * forme(th, k_))[1] + dy, z + dz * math.sin(2 * th + phase) + 0.5 * dz * math.sin(5 * th + phase * 2)) for th in ths]
    gradins = [(1.0, -0.4, Z1, [1.05, 1.02, 0.99, 0.98, 1.04]), (0.84, Z1, Z2, [1.03, 1.0, 0.98, 1.03]), (0.72, Z2, Z_TOP, [1.03, 1.0, 0.99, 1.04])]
    sommets = None
    for k, (ech, z0, z1, ondes) in enumerate(gradins):
        rings = []
        for j, o in enumerate(ondes):
            z = z0 + (z1 - z0) * j / (len(ondes) - 1)
            dz = 0.09 if j == len(ondes) - 1 else (0.0 if j == 0 else 0.05)
            rings.append(anneau(ech * o, z, k, dz, k * 1.7))
        if k > 0:  # le pied du gradin suit la pente du replat d'en dessous
            rings[0] = [(p[0], p[1], z0 + 0.09 * math.sin(2 * th + (k - 1) * 1.7) + 0.045 * math.sin(5 * th + (k - 1) * 3.4) + 0.01) for p, th in zip(rings[0], ths)]
        A.anneaux(L, rings, "gres" if k != 1 else "gres_clair")
        haut_ = rings[-1]
        if k < 2:  # le replat ensablé, jusqu'au pied du gradin suivant
            prochain = anneau(gradins[k + 1][0] * gradins[k + 1][3][0], z1, k + 1)
            prochain = [(p[0], p[1], q[2] + 0.01) for p, q in zip(prochain, haut_)]
            v = haut_ + prochain
            L.ajouter(v, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], "sable_ambre")
        else:
            sommets = haut_
    cx = sum(p[0] for p in sommets) / n
    cy = sum(p[1] for p in sommets) / n
    L.ajouter(sommets + [(cx, cy, Z_TOP + 0.04)], [(i, (i + 1) % n, n) for i in range(n)], "roche_desert")
    return [(p[0], p[1]) for p in sommets]


def arche(L, rng, a, b, haut_=1.6, n_tour=12):
    """L'arche qu'ont creusée les vagues : un pont de grès d'un pied à l'autre (a, b : x, y), épais à ses pieds, aminci au
    sommet, sa section aplatie (plus large dans le sens de la marche), ses flancs bosselés. Ses couches de grès restent
    horizontales : le motif est projeté à plat (u : le long de l'arche, v : la hauteur)."""
    za, zb = sol(*a) - 0.35, sol(*b) - 0.35
    dx, dy = b[0] - a[0], b[1] - a[1]
    l_ = math.hypot(dx, dy)
    ux, uy = dx / l_, dy / l_
    nx, ny = -uy, ux
    nb = 16
    v, uv, f = [], [], []
    taille = N.MATIERES["gres"]["taille"]
    for k in range(nb + 1):
        t = k / nb
        sn = math.sin(PI * t)
        cx, cy = a[0] + dx * t, a[1] + dy * t
        cz = za + (zb - za) * t + (haut_ + 0.35) * min(1.0, sn ** 0.5 * 1.03)
        # la direction de l'arc (la section lui est perpendiculaire)
        t2 = min(1.0, t + 0.02)
        t1 = max(0.0, t - 0.02)
        z2 = za + (zb - za) * t2 + (haut_ + 0.35) * min(1.0, math.sin(PI * t2) ** 0.5 * 1.03)
        z1 = za + (zb - za) * t1 + (haut_ + 0.35) * min(1.0, math.sin(PI * t1) ** 0.5 * 1.03)
        pente = math.atan2(z2 - z1, l_ * (t2 - t1))
        ep = 0.2 + 0.32 * (1 - sn) ** 1.8  # l'épaisseur dans le plan de l'arc
        lar = 0.34 + 0.22 * (1 - sn) ** 1.5  # la largeur, en travers
        for j in range(n_tour):
            th = j * 2 * PI / n_tour
            bos = 1 + 0.08 * math.sin(3 * th + k * 1.3) + 0.05 * math.sin(5 * th + k * 2.1)
            e1 = math.cos(th) * ep * bos  # dans le plan de l'arc, perpendiculaire à sa course
            e2 = math.sin(th) * lar * bos
            px = cx + ux * (-math.sin(pente) * e1) + nx * e2
            py = cy + uy * (-math.sin(pente) * e1) + ny * e2
            pz = cz + math.cos(pente) * e1
            v.append((px, py, pz))
            uv.append((((px - a[0]) * ux + (py - a[1]) * uy + 0.6 * ((px - a[0]) * nx + (py - a[1]) * ny)) / taille, pz / taille))
    for k in range(nb):
        for j in range(n_tour):
            j2 = (j + 1) % n_tour
            f.append((k * n_tour + j, (k + 1) * n_tour + j, (k + 1) * n_tour + j2, k * n_tour + j2))  # tournées vers dehors
    L.ajouter(v, f, "gres", uv=uv, doux=True)


def bloc(L, rng, x, y, r, mat="gres", z=None):
    """Un bloc de grès tombé : un pavé aux arêtes usées (une sphère poussée vers le cube), aplati, posé de travers ; ses
    couches restent à plat (motif projeté)."""
    z = sol(x, y) if z is None else z
    v, f = N.sphere(1.0, 7, 4)
    ex, ey, ez = r * (1.0 + 0.4 * rng.random()), r * (0.75 + 0.3 * rng.random()), r * (0.5 + 0.3 * rng.random())
    a0, pen = rng.random() * 2 * PI, (rng.random() - 0.5) * 0.4
    q = []
    for (a, b, c) in v:
        g = 1 + 0.08 * math.sin(a * 5 + b * 3 + a0)
        q.append((math.copysign(abs(a) ** 0.45, a) * ex * g, math.copysign(abs(b) ** 0.45, b) * ey * g, math.copysign(abs(c) ** 0.45, c) * ez * g))
    M = T(x, y, z + ez * 0.45) @ Rz(a0) @ Rx(pen)
    pts = [tuple((M @ np.array((*p, 1.0)))[:3]) for p in q]
    taille = N.MATIERES[mat]["taille"]
    L.ajouter(pts, f, mat, uv=[((p[0] + 0.6 * p[1]) / taille, p[2] / taille) for p in pts], doux=True)


def cristaux(L, rng, x, y, nb=5, h=0.22):
    """Un éclat d'ambre qui sort du sable : des prismes orangés."""
    z = sol(x, y) - 0.03
    for k in range(nb):
        a = rng.random() * 2 * PI
        L.ajouter(*N.cylindre(0.035 + 0.025 * rng.random(), 0.0, h * (0.5 + 0.6 * rng.random()), 5, haut=False), "ambre", T(x + math.cos(a) * 0.05, y + math.sin(a) * 0.05, z) @ Rz(a) @ Rx(0.2 + 0.5 * rng.random()))


# ---------- le mirage ----------
def buffet(Mi, rng):
    """Le buffet du mirage (le long de x ; l'origine au pied de la table) : la nappe qui tombe jusqu'au sable, le rôti et
    ses os, la pyramide de fruits, la pièce montée, le poisson, le pain, les cruches, les coupes, le chandelier, deux
    chaises."""
    Mi.ajouter(*N.boite(1.16, 0.48, 0.028), "tissu_creme", T(0, 0, 0.3))
    Mi.ajouter(*N.boite(1.18, 0.5, 0.24, haut=False, bas=False), "tissu_creme", T(0, 0, 0.07))
    Mi.ajouter(*N.cylindre(0.13, 0.13, 0.012, 10), "cuivre", T(-0.36, 0, 0.33))  # le rôti
    v, f = N.sphere(0.085, 8, 5, 0.7)
    Mi.ajouter([(a * 1.4, b, c) for a, b, c in v], f, "roti", T(-0.36, 0, 0.385), doux=True)
    for s in (-1, 1):
        Mi.ajouter(*N.tube([(-0.36 + s * 0.11, 0, 0.39), (-0.36 + s * 0.17, 0, 0.42)], [0.012, 0.009], 4, bouts=True), "os")
    Mi.ajouter(*N.cylindre(0.1, 0.1, 0.012, 10), "or", T(-0.08, 0.05, 0.33))  # les fruits
    for zz, nb, r_ in ((0.37, 6, 0.065), (0.42, 4, 0.04), (0.465, 1, 0.0)):
        for k in range(nb):
            a = k * 2 * PI / max(1, nb)
            Mi.ajouter(*N.sphere(0.03, 6, 4), "fruits", T(-0.08 + math.cos(a) * r_, 0.05 + math.sin(a) * r_, zz))
    for k, (r_, hh) in enumerate(((0.11, 0.07), (0.08, 0.06), (0.05, 0.05))):  # la pièce montée
        Mi.ajouter(*N.cylindre(r_, r_, hh, 10), "gateau", T(0.22, 0.03, 0.315 + sum(q[1] for q in ((0.11, 0.07), (0.08, 0.06), (0.05, 0.05))[:k])))
    Mi.ajouter(*N.sphere(0.018, 5, 3), "tissu_rouge", T(0.22, 0.03, 0.51))
    Mi.ajouter(*N.cylindre(0.12, 0.12, 0.01, 10), "cuivre", T(0.44, -0.08, 0.33))  # le poisson
    v, f = N.sphere(0.05, 8, 4, 0.5)
    Mi.ajouter([(a * 2.0, b, c) for a, b, c in v], f, "poisson", T(0.44, -0.08, 0.36), doux=True)
    Mi.ajouter(*N.cylindre(0.0, 0.045, 0.05, 4), "poisson", T(0.565, -0.08, 0.36) @ Ry(PI / 2))
    for k in range(3):  # le pain
        v, f = N.sphere(0.04, 6, 4, 0.6)
        Mi.ajouter([(a * 1.5, b, c) for a, b, c in v], f, "pain", T(-0.5 + 0.09 * k, -0.15, 0.335) @ Rz(0.3 * k), doux=True)
    for xx in (0.06, 0.36):  # les cruches
        jarre(Mi, T(xx, 0.16, 0.315), 0.13, "cuivre")
    for xx, yy in ((-0.22, -0.15), (0.08, -0.16), (0.32, 0.17)):  # les coupes
        Mi.ajouter(*N.cylindre(0.02, 0.02, 0.006, 6), "or", T(xx, yy, 0.315))
        Mi.ajouter(*N.cylindre(0.006, 0.006, 0.04, 4), "or", T(xx, yy, 0.32))
        Mi.ajouter(*N.cylindre(0.012, 0.024, 0.035, 6, haut=False), "or", T(xx, yy, 0.36))
    Mi.ajouter(*N.cylindre(0.035, 0.012, 0.03, 6), "or", T(0.02, -0.05, 0.315))  # le chandelier
    Mi.ajouter(*N.cylindre(0.01, 0.01, 0.2, 5), "or", T(0.02, -0.05, 0.34))
    Mi.ajouter(*N.poutre((-0.07, -0.05, 0.48), (0.11, -0.05, 0.48), 0.012), "or")
    for xx in (-0.07, 0.02, 0.11):
        Mi.ajouter(*N.cylindre(0.01, 0.01, 0.06, 5), "tissu_creme", T(xx, -0.05, 0.48 + (0.03 if xx == 0.02 else 0.0)))
        Mi.ajouter(*N.sphere(0.012, 4, 3, 1.6), "toile_or", T(xx, -0.05, 0.555 + (0.03 if xx == 0.02 else 0.0)))
    for s in (-1, 1):  # deux chaises, au bout de la table
        Mc = T(s * 0.75, 0, 0) @ Rz(PI if s > 0 else 0.0)
        Mi.ajouter(*N.boite(0.2, 0.2, 0.025), "planches", Mc @ T(0, 0, 0.19))
        for sx in (-0.085, 0.085):
            for sy in (-0.085, 0.085):
                Mi.ajouter(*N.boite(0.022, 0.022, 0.19), "planches_sombres", Mc @ T(sx, sy, 0))
        Mi.ajouter(*N.boite(0.022, 0.2, 0.26), "planches", Mc @ T(-0.09, 0, 0.21))


# ---------- l'île entière ----------
def mailles(graine=137, leger=False):
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
    fumees = []
    lots["etapes"] = []
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))
    terre = lambda pts: K.suivre(pts, sol)

    # --- le plan : la boucle de la caravane, les chemins, le ponton ---
    boucle = [(-3.6, -1.7), (-1.5, -1.75), (1.0, -2.1), (3.0, -2.35), (4.6, -2.4), (4.6, -0.45), (4.6, 1.5), (2.0, 1.8), (-0.4, 2.45), (-2.6, 2.75), (-4.4, 2.7), (-5.4, 0.65), (-5.1, -1.0)]
    tour_ = terre(boucle + [boucle[0]])[:-1]
    reve = terre([(-0.9, -2.5), (-1.0, -0.6), (-0.95, 1.3), (-0.72, 2.62)])  # celui qui marche vers le mirage
    ac = -98
    pa, pb = np.array(vers(ac, 0.5)), np.array(vers(ac, -2.1))  # le ponton
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    cote_p = np.array((-dp[1], dp[0]))
    lg, ZQ = float(np.linalg.norm(pb - pa)), 0.4
    debarque = [(*(pa + dp * (lg - 0.5)), ZQ + 0.02), (*(pa + dp * 0.75), ZQ + 0.02), (*(pa + dp * 0.05), sol(*pa) + 0.06)] + terre([tuple(pa - dp * 0.1), (-1.45, -5.2), (-1.8, -4.85)])
    chemins = [(tour_, True, 0.15, 0.0, 0.0), (reve, False, 0.13, 0.3, 6.0), (debarque, False, 0.16, 0.55, 3.0)]
    PISTES[:] = [tour_ + tour_[:1], reve, debarque[2:]]
    PAS["pieds"][:] = []
    PAS["sabots"][:] = []
    for pts, pas_, cle, ecart in ((reve, 0.16, "pieds", 0.035), (tour_ + tour_[:1], 0.2, "sabots", 0.06)):
        tot = sum(math.dist(a_[:2], b_[:2]) for a_, b_ in zip(pts[:-1], pts[1:]))
        s_ = 0.1
        k = 0
        while s_ < tot - 0.05:
            q = A.point_a([(p[0], p[1], 0.0) for p in pts], s_)
            q2 = A.point_a([(p[0], p[1], 0.0) for p in pts], min(tot, s_ + 0.05))
            cap = math.atan2(q2[1] - q[1], q2[0] - q[0])
            cote = ecart * (1 if k % 2 else -1)
            PAS[cle].append((q[0] - math.sin(cap) * cote, q[1] + math.cos(cap) * cote, cap))
            s_ += pas_
            k += 1
    couloirs = [(tour_, 0.12), (reve, 0.12), (debarque[2:], 0.12)]
    loin_des_sentiers = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r):
        if sol(x, y) < 0.14 or bord(x, y) < r + 0.15 or not loin_des_sentiers(x, y, r):
            return False
        if dmesa(x, y) < 0.15 + r or math.hypot(x - MARE[0], y - MARE[1]) < R_MARE + r + 0.1 or math.hypot(x - PAD[0], y - PAD[1]) < 1.1 + r:
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n, R = (52 if leger else 76), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[sol(x, y) for x in xs] for y in xs]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H_[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    for j in range(n):
        for i in range(n):
            if max(H_[j][i], H_[j][i + 1], H_[j + 1][i + 1], H_[j + 1][i]) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_ambre", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    etape("la Table")
    # --- la Table, ses éboulis, la vigie, les échelles de corde ---
    dessus = table_de_gres(L, rng, leger)
    SOL.append(("decor", "la Table", [(x, y) for x, y in (plan_mesa(k * 2 * PI / 24, 1.0) for k in range(24))]))
    ponts.append(dessus)
    th_e = math.radians(-100)
    for ech, z_h, z_b, (ddx, ddy) in ((0.72, Z_TOP, Z2, (0.2, 0.14)), (0.84, Z2, Z1, (0.12, 0.06)), (1.0, Z1, None, (0.0, 0.0))):
        ph, pb_ = plan_mesa(th_e, ech * 1.12), plan_mesa(th_e, ech * (1.12 if z_b is not None else 1.3))
        ph, pb_ = (ph[0] + ddx, ph[1] + ddy), (pb_[0] + ddx, pb_[1] + ddy)
        zb_ = z_b if z_b is not None else sol(*pb_)
        for s in (-1, 1):
            dx, dy = -math.sin(th_e) * 0.09 * s, math.cos(th_e) * 0.09 * s
            L.ajouter(*N.poutre((ph[0] + dx, ph[1] + dy, z_h + 0.03), (pb_[0] + dx, pb_[1] + dy, zb_), 0.012), "corde_arbre")
        nb = int((z_h - zb_) / 0.22)
        z_h = z_h + 0.08
        for k in range(1, nb + 1):
            t = k / (nb + 1)
            q = (ph[0] + (pb_[0] - ph[0]) * t, ph[1] + (pb_[1] - ph[1]) * t, z_h + (zb_ - z_h) * t)
            L.ajouter(*N.poutre((q[0] - math.sin(th_e) * 0.1, q[1] + math.cos(th_e) * 0.1, q[2]), (q[0] + math.sin(th_e) * 0.1, q[1] - math.cos(th_e) * 0.1, q[2]), 0.025), "planches")
    SOL.append(("dur", "le pied de l'échelle", Vf.rond(*plan_mesa(th_e, 1.3), 0.15)))
    # la vigie, sur le dessus : son abri de toile, la longue-vue, le drapeau, la lanterne
    cv = (MESA[0] + 0.25, MESA[1] + 0.42)
    Mv = T(cv[0], cv[1], Z_TOP) @ Rz(math.radians(-130))
    for sx in (-0.3, 0.3):
        for sy in (-0.2, 0.2):
            L.ajouter(*N.cylindre(0.014, 0.012, 0.5 if sy < 0 else 0.42, 5), "planches_sombres", Mv @ T(sx, sy, 0))
    A.toile(L, [(-0.34, -0.24, 0.5), (0.34, -0.24, 0.5), (0.34, 0.24, 0.42), (-0.34, 0.24, 0.42)], [(0, 1, 2, 3)], "toile_tente_brune", Mv, uv=[(0, 0), (1.1, 0), (1.1, 0.8), (0, 0.8)])
    L.ajouter(*N.boite(0.2, 0.15, 0.13), "planches_claires", Mv @ T(0.15, 0.1, 0))
    jarre(L, Mv @ T(-0.18, 0.12, 0), 0.16)
    A.lanterne(L, U, tuple((Mv @ np.array((0.0, 0.0, 0.45, 1.0)))[:3]), True, 0.04)
    P.banniere(lots, cv[0] + 0.45, cv[1] + 0.35, Z_TOP, 1.0, "rose", math.radians(-130), 0.24, 0.5)
    vigie = [(MESA[0] - 0.3, MESA[1] - 0.12, Z_TOP + 0.04), (MESA[0] + 0.55, MESA[1] - 0.2, Z_TOP + 0.04)]
    chemins.append((vigie, False, 0.1, 0.1, 5.0))
    # les éboulis, les éclats d'ambre
    for k in range(9 if leger else 16):
        th = k * 2 * PI / (9 if leger else 16) + rng.random() * 0.3
        q = plan_mesa(th, 1.08 + 0.25 * rng.random())
        r_ = 0.12 + 0.18 * rng.random()
        if sol(*q) > 0.15 and loin_des_sentiers(q[0], q[1], r_ * 1.5) and math.dist(q, plan_mesa(th_e, 1.3)) > 0.45:
            bloc(L, rng, q[0], q[1], r_, rng.choice(["gres", "gres_clair"]))
            SOL.append(("rocher", "un éboulis", Vf.rond(q[0], q[1], r_ * 1.3)))
    for th in (-160, -40, 60, 150)[:2 if leger else 4]:
        q = plan_mesa(math.radians(th), 1.22)
        if libre(q[0], q[1], 0.12):
            cristaux(L, rng, q[0], q[1], 4 if leger else 6)
            SOL.append(("rocher", "de l'ambre", Vf.rond(q[0], q[1], 0.12)))

    etape("l'arche")
    # --- l'arche, au-dessus du lit, que la caravane passe dessous ---
    fa, fb = (3.62, yc(3.62) + 0.05), (5.58, yc(5.58) - 0.05)
    arche(L, rng, fa, fb, 1.6, 9 if leger else 12)
    for q in (fa, fb):
        SOL.append(("decor", "un pied de l'arche", Vf.rond(q[0], q[1], 0.5)))
        for k in range(2 if leger else 3):
            a = rng.random() * 2 * PI
            r_ = 0.1 + 0.08 * rng.random()
            x, y = q[0] + math.cos(a) * 0.72, q[1] + math.sin(a) * 0.72
            if libre(x, y, r_ * 1.3):
                bloc(L, rng, x, y, r_)
                SOL.append(("rocher", "un rocher", Vf.rond(x, y, r_ * 1.3)))

    etape("l'épave")
    # --- l'épave, couchée sur le flanc, et le chantier des chercheurs ---
    Me = T(EPAVE[0], EPAVE[1], sol(*EPAVE) + 0.02) @ Rz(CAP_EPAVE) @ Rx(GITE)
    sec = epave(L, rng, Me, leger=leger)
    SOL.append(("dur", "l'épave", Vf.rectangle(EPAVE[0], EPAVE[1], 3.1, 1.1, CAP_EPAVE)))
    hune = Me @ np.array((0.18, 0, 0.48, 1.0))
    vautour(L, hune[0], hune[1], hune[2] - 0.02, CAP_EPAVE - 2.4)
    # le grand mât, tombé dans le sable au nord, sa vergue et la voile déchirée
    m0, m1 = (-0.25, 1.2), (1.45, 1.45)
    L.ajouter(*N.tube([(m0[0], m0[1], sol(*m0) + 0.02), (m1[0], m1[1], sol(*m1) + 0.03)], [0.06, 0.045], 7, bouts=True), "bois_epave_sombre", tourne=True)
    vm = (0.55, 1.38)
    L.ajouter(*N.tube([(vm[0] - 0.08, vm[1] - 0.3, sol(vm[0] - 0.08, vm[1] - 0.3) + 0.05), (vm[0] + 0.12, vm[1] + 0.45, sol(vm[0] + 0.12, vm[1] + 0.45) + 0.04)], 0.03, 5, bouts=True), "bois_epave_sombre")
    vv, uv, ff = [], [], []
    for j in range(4):
        for i in range(5):
            x = vm[0] - 0.55 + 0.26 * i + 0.04 * rng.random()
            y = vm[1] - 0.12 + 0.2 * j + 0.03 * rng.random()
            vv.append((x, y, sol(x, y) + 0.025 + (0.05 * rng.random() if 0 < i < 4 and 0 < j < 3 else 0.0)))
            uv.append((i * 0.5, j * 0.5))
    for j in range(3):
        for i in range(4):
            if (i, j) in ((3, 2), (0, 0)):
                continue  # des trous dans la toile
            a_ = j * 5 + i
            ff.append((a_, a_ + 1, a_ + 6, a_ + 5))
    A.toile(L, vv, ff, "toile_ecrue", ep=0.006, uv=uv)
    SOL.append(("dur", "le mât tombé", Vf.rectangle((m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2, 1.8, 0.25, math.atan2(m1[1] - m0[1], m1[0] - m0[0]))))
    SOL.append(("rocher", "la voile", Vf.rectangle(vm[0] - 0.03, vm[1] + 0.2, 1.1, 0.7, 0.0)))
    # les chercheurs, la brouette, le tamis, le coffre plein de coquillages, la lanterne
    for x, y, cap in ((0.25, -0.72, 1.3), (1.45, -0.62, 1.9)):
        creuseur(L, rng, x, y, cap)
        SOL.append(("passant", "un chercheur", Vf.rond(x, y, 0.07)))
    bx, by = 0.72, -1.05  # la brouette
    Mb = T(bx, by, sol(bx, by)) @ Rz(0.35)
    L.ajouter(*N.cylindre(0.2, 0.15, 0.12, 6, haut=False, bas=True), "planches", Mb @ T(0, 0, 0.1))
    L.ajouter(*N.cylindre(0.065, 0.065, 0.03, 8), "planches_sombres", Mb @ T(0.24, 0, 0.065) @ Rx(PI / 2) @ T(0, 0, -0.015))
    for s in (-1, 1):
        L.ajouter(*N.poutre((0.2, s * 0.09, 0.08), (-0.38, s * 0.12, 0.2), 0.022), "planches_sombres", Mb)
        L.ajouter(*N.poutre((-0.12, s * 0.1, 0.1), (-0.12, s * 0.1, 0.0), 0.02), "planches_sombres", Mb)
    L.ajouter(*N.sphere(0.13, 7, 4, 0.4), "sable_ambre", Mb @ T(0, 0, 0.2), doux=True)
    SOL.append(("dur", "la brouette", Vf.rectangle(bx, by, 0.75, 0.4, 0.35)))
    tx_, ty_ = 2.0, -0.95  # le tamis sur ses tréteaux, et celui qui tamise
    Mt = T(tx_, ty_, sol(tx_, ty_)) @ Rz(0.5)
    L.ajouter(*N.boite(0.45, 0.32, 0.04, haut=False), "planches", Mt @ T(0, 0, 0.3))
    L.ajouter(*N.boite(0.43, 0.3, 0.006), "filet", Mt @ T(0, 0, 0.31))
    for sx in (-0.19, 0.19):
        for sy in (-0.13, 0.13):
            L.ajouter(*N.poutre((sx * 1.15, sy * 1.2, 0.0), (sx, sy, 0.3), 0.02), "planches_sombres", Mt)
    SOL.append(("dur", "le tamis", Vf.rectangle(tx_, ty_, 0.55, 0.42, 0.5)))
    q = Mt @ np.array((0.0, -0.32, 0.0, 1.0))
    P.passant(L, rng, q[0], q[1], angle=0.5 + PI / 2, z=sol(q[0], q[1]))
    SOL.append(("passant", "celui qui tamise", Vf.rond(q[0], q[1], 0.07)))
    cx_, cy_ = 0.95, -0.45  # le coffre, plein de coquillages
    Mk = T(cx_, cy_, sol(cx_, cy_) - 0.02) @ Rz(CAP_EPAVE + 0.2)
    L.ajouter(*N.boite(0.3, 0.2, 0.16), "planches_sombres", Mk)
    L.ajouter(*N.boite(0.31, 0.21, 0.02), "or", Mk @ T(0, 0, 0.08))
    L.ajouter(*N.boite(0.3, 0.2, 0.04), "planches_sombres", Mk @ T(0, 0.1, 0.16) @ Rx(-1.9) @ T(0, -0.1, 0))
    for k in range(7):
        L.ajouter(*N.sphere(0.025, 5, 3, 0.6), "nacre", Mk @ T(-0.1 + 0.035 * k, -0.04 + 0.03 * (k % 3), 0.165))
    SOL.append(("dur", "le coffre", Vf.rectangle(cx_, cy_, 0.36, 0.3, CAP_EPAVE + 0.2)))
    lx_, ly_ = 1.25, -1.05  # la lanterne du chantier, sur sa perche
    L.ajouter(*N.cylindre(0.02, 0.018, 0.75, 5), "planches_sombres", T(lx_, ly_, sol(lx_, ly_) - 0.05))
    L.ajouter(*N.poutre((lx_, ly_, sol(lx_, ly_) + 0.68), (lx_ + 0.14, ly_, sol(lx_, ly_) + 0.68), 0.018), "planches_sombres")
    A.lanterne(L, U, (lx_ + 0.14, ly_, sol(lx_, ly_) + 0.58), True, 0.1)
    SOL.append(("dur", "la perche", Vf.rond(lx_, ly_, 0.06)))

    etape("le squelette")
    # --- le squelette de la bête de mer, à l'ouest du lit ---
    sq = [(-4.7, 0.35), (-3.9, 0.42), (-3.0, 0.52), (-2.4, 0.64), (-2.0, 0.75)]
    pts, ray = [], []
    tot = sum(math.dist(a_, b_) for a_, b_ in zip(sq[:-1], sq[1:]))
    for k in range(13):
        q = A.point_a([(p[0], p[1], 0.0) for p in sq], tot * k / 12)
        pts.append((q[0], q[1], sol(q[0], q[1]) + 0.04 + 0.06 * k / 12))
        ray.append(0.035 + 0.045 * k / 12)
    L.ajouter(*N.tube(pts, ray, 6, bouts=True), "os", doux=True)
    for k in range(1, 12, 2 if leger else 1):  # les vertèbres et leurs épines
        q = pts[k]
        L.ajouter(*N.sphere(ray[k] * 1.5, 6, 4, 0.8), "os", T(*q), doux=True)
        L.ajouter(*N.cylindre(0.02 * (0.6 + k / 12), 0.0, 0.08 + 0.08 * k / 12, 4), "os", T(q[0], q[1], q[2] + ray[k]))
    for k in range(4, 10):  # les côtes, en arceaux ; certaines cassées
        q = pts[k]
        q2 = pts[k + 1]
        dirx, diry = (q2[0] - q[0]), (q2[1] - q[1])
        l_ = math.hypot(dirx, diry) or 1.0
        nx, ny = -diry / l_, dirx / l_
        tx_, ty_ = -dirx / l_, -diry / l_  # vers la queue
        for s in (-1, 1):
            grand = (0.62 + 0.33 * math.sin(PI * (k - 3) / 7)) * (0.85 + 0.25 * rng.random())
            casse = (k * 3 + s) % 5 == 0
            tombe = (k, s) in ((5, 1), (8, -1))
            arc = []
            for j, (lat, up) in enumerate(((0.04, 0.0), (0.16, 0.3), (0.34, 0.44), (0.52, 0.36), (0.64, 0.12), (0.7, -0.05)) if not leger else ((0.04, 0.0), (0.25, 0.4), (0.52, 0.36), (0.7, -0.05))):
                if casse and j > 3:
                    break
                px, py = q[0] + nx * s * lat * grand + tx_ * 0.12 * lat, q[1] + ny * s * lat * grand + ty_ * 0.12 * lat
                pz = (sol(px, py) + 0.03) if tombe else (q[2] + up * grand if j < 5 else sol(px, py) - 0.03)
                arc.append((px, py, pz))
            L.ajouter(*N.tube(arc, [0.036, 0.033, 0.029, 0.025, 0.022, 0.02][:len(arc)], 5, bouts=True), "os", doux=True)
    SOL.append(("decor", "le squelette", [(-4.75, 0.1), (-2.0, 0.4), (-1.5, 0.85), (-2.1, 1.55), (-3.4, 1.45), (-4.75, 0.6)]))
    # le crâne : la boîte, le long museau, la mâchoire ouverte qui s'enfonce dans le sable, les orbites, les dents
    hx, hy = pts[-1][0], pts[-1][1]
    dirc = math.atan2(sq[-1][1] - sq[-2][1], sq[-1][0] - sq[-2][0])
    Mcr = T(hx, hy, sol(hx, hy) + 0.12) @ Rz(dirc)
    v, f = N.sphere(0.13, 9, 6, 0.75)
    L.ajouter([(a * 1.5, b, c) for a, b, c in v], f, "os", Mcr @ T(0.12, 0, 0.02), doux=True)
    L.ajouter(*N.tube([(0.22, 0, 0.03), (0.4, 0, 0.0), (0.58, 0, -0.04)], [0.08, 0.05, 0.025], 7, bouts=True), "os", Mcr, doux=True)
    L.ajouter(*N.tube([(0.12, 0, -0.07), (0.3, 0, -0.12), (0.52, 0, -0.17)], [0.045, 0.032, 0.02], 6, bouts=True), "os", Mcr, doux=True)
    for s in (-1, 1):
        L.ajouter(*N.sphere(0.035, 6, 4), "tissu_sombre", Mcr @ T(0.17, s * 0.1, 0.06))
        for k in range(5):
            L.ajouter(*N.cylindre(0.012, 0.0, 0.035, 4), "os", Mcr @ T(0.28 + 0.06 * k, s * (0.04 - 0.004 * k), -0.03 - 0.008 * k) @ Rx(PI))
    vautour(L, hx + math.cos(dirc) * 0.12, hy + math.sin(dirc) * 0.12, sol(hx, hy) + 0.24, dirc + 2.6)
    # deux nageoires : des os en éventail, couchés
    for s in (-1, 1):
        q = pts[4]
        q2 = pts[5]
        dirx, diry = q2[0] - q[0], q2[1] - q[1]
        l_ = math.hypot(dirx, diry)
        nx, ny = -diry / l_ * s, dirx / l_ * s
        base = (q[0] + nx * 0.75, q[1] + ny * 0.75)
        if not leger:
            for j in range(4):
                a = math.atan2(ny, nx) + (j - 1.5) * 0.22
                b = (base[0] + math.cos(a) * 0.4, base[1] + math.sin(a) * 0.4)
                L.ajouter(*N.tube([(base[0], base[1], sol(*base) + 0.02), (b[0], b[1], sol(*b) + 0.015)], [0.02, 0.01], 4, bouts=True), "os")

    etape("le lit")
    # --- les ancres, les coraux, les coquillages, les éclats de verre noir le long du trait ---
    for k, (x, y, cap, inc, enf) in enumerate(((-2.0, -0.5, 0.7, 0.45, 0.3), (3.0, 0.85, 5.54, 1.2, 0.12), (-3.85, -0.35, -0.9, 0.3, 0.35))[:2 if leger else 3]):
        ancre(L, x, y, cap, inc, enf, not leger and k < 2)
        SOL.append(("dur", "une ancre", Vf.rond(x, y, 0.55)))
    for x, y, h in ((-2.7, -0.9, 0.42), (-0.2, -0.95, 0.32), (3.0, 0.95, 0.38))[:2 if leger else 3]:
        if libre(x, y, 0.22):
            corail(L, rng, x, y, h)
            SOL.append(("rocher", "un corail", Vf.rond(x, y, 0.22)))
    faits = 0
    for essai in range(200):
        if faits >= (3 if leger else 7):
            break
        x = -5.5 + rng.random() * 10.5
        y = yc(x) + (rng.random() * 2 - 1) * (W_LIT + 0.3)
        if not libre(x, y, 0.12):
            continue
        conque(L, x, y, rng.random() * 6.28, 0.8 + 0.5 * rng.random())
        SOL.append(("rocher", "un coquillage", Vf.rond(x, y, 0.12)))
        faits += 1
    (ax_, ay_), (bx_, by_) = RATURE
    lgr = math.dist(RATURE[0], RATURE[1])
    for k in range(int(lgr / (0.9 if leger else 0.55))):
        t = (k + 0.5) * (0.9 if leger else 0.55) / lgr
        x, y = ax_ + (bx_ - ax_) * t, ay_ + (by_ - ay_) * t
        if not libre(x, y, 0.07) or rng.random() < 0.25:
            continue
        a = rng.random() * 2 * PI
        L.ajouter(*N.cylindre(0.025 + 0.02 * rng.random(), 0.0, 0.08 + 0.1 * rng.random(), 4, haut=False), "verre_noir", T(x, y, sol(x, y) - 0.02) @ Rz(a) @ Rx(0.3 * (rng.random() - 0.5)))
        SOL.append(("rocher", "un éclat noir", Vf.rond(x, y, 0.06)))

    etape("l'oasis")
    # --- l'oasis : la mare, ses roseaux, les palmiers, le puits et son abreuvoir ---
    mare = [(MARE[0] + math.cos(a) * R_MARE * (1 + 0.12 * math.sin(3 * a + 1) + 0.06 * math.sin(5 * a)), MARE[1] + math.sin(a) * R_MARE * (1 + 0.12 * math.sin(3 * a + 1) + 0.06 * math.sin(5 * a))) for a in np.linspace(0, 2 * PI, 16, endpoint=False)]
    L.ajouter(*N.polygone(mare, Z_EAU - 0.02, Z_EAU), "eau_oasis")
    SOL.append(("dur", "la mare", mare))
    for k, (x, y) in enumerate(mare[::2] if not leger else mare[::5]):
        x2, y2 = MARE[0] + (x - MARE[0]) * 1.08, MARE[1] + (y - MARE[1]) * 1.08
        for j in range(4):
            a = rng.random() * 2 * PI
            L.ajouter(*N.cylindre(0.012, 0.0, 0.25 + 0.15 * rng.random(), 3), "roseau_oasis", T(x2 + math.cos(a) * 0.05, y2 + math.sin(a) * 0.05, Z_EAU - 0.02) @ Rz(a) @ Rx(0.12 + 0.15 * rng.random()), zone=(1.0, 0.75, 1.0))
    for x, y, hh, pc in ((-6.05, -2.3, 2.1, 40), (-5.6, -3.88, 1.8, 80), (-5.3, -1.82, 2.3, -30), (-4.55, -3.9, 1.7, 120))[:3 if leger else 4]:
        Pl.palmier(L, rng, x, y, hh, 0.45, math.radians(pc), True, sol(x, y))
        SOL.append(("arbre", "un palmier", Vf.rond(x, y, 0.18)))
    px_, py_ = -4.15, -2.05
    pz = sol(px_, py_)
    L.ajouter(*N.cylindre(0.25, 0.25, 0.3, 12, haut=False), "pierres_claires", T(px_, py_, pz - 0.05), tourne=True)
    L.ajouter(*N.cylindre(0.27, 0.27, 0.04, 12), "pierres", T(px_, py_, pz + 0.25))
    L.ajouter(*N.cylindre(0.2, 0.2, 0.01, 12), "puits_fond", T(px_, py_, pz + 0.27))
    for s in (-1, 1):
        L.ajouter(*N.poutre((px_ + s * 0.28, py_, pz + 0.2), (px_ + s * 0.28, py_, pz + 0.78), 0.045), "planches_sombres")
    L.ajouter(*N.poutre((px_ - 0.32, py_, pz + 0.74), (px_ + 0.32, py_, pz + 0.74), 0.04), "planches_sombres")
    L.ajouter(*N.cylindre(0.055, 0.055, 0.025, 8), "planches", T(px_, py_ - 0.012, pz + 0.66) @ Rx(PI / 2) @ T(0, 0, -0.012))
    L.ajouter(*N.poutre((px_ + 0.05, py_, pz + 0.66), (px_ + 0.05, py_, pz + 0.42), 0.008), "corde_arbre")
    L.ajouter(*N.cylindre(0.045, 0.055, 0.08, 7, haut=False, bas=True), "planches", T(px_ + 0.05, py_, pz + 0.34))
    A.lanterne(L, U, (px_ - 0.28, py_ - 0.06, pz + 0.66), True, 0.06)
    SOL.append(("dur", "le puits", Vf.rond(px_, py_, 0.34)))
    ab = (-3.45, -2.4)  # l'abreuvoir
    L.ajouter(*N.boite(0.55, 0.2, 0.12, haut=False), "planches", T(ab[0], ab[1], sol(*ab)) @ Rz(-0.3))
    L.ajouter(*N.boite(0.5, 0.15, 0.01), "eau_oasis", T(ab[0], ab[1], sol(*ab) + 0.1) @ Rz(-0.3))
    SOL.append(("dur", "l'abreuvoir", Vf.rectangle(ab[0], ab[1], 0.6, 0.25, -0.3)))
    P.passant(L, rng, px_ + 0.05, py_ - 0.38, angle=PI / 2, z=sol(px_ + 0.05, py_ - 0.38), leve=1)
    SOL.append(("passant", "celle qui tire l'eau", Vf.rond(px_ + 0.05, py_ - 0.38, 0.07)))

    etape("le caravansérail")
    # --- le caravansérail : trois tentes autour du feu, le dromadaire couché, le poteau d'attache, le panneau ---
    for (x, y, cap, mat) in ((-3.8, -3.75, -50, "toile_tente_rouge"), (-2.0, -2.8, -95, "toile_tente_brune"), (-0.6, -3.95, -140, "toile_tente_indigo")):
        emp = tente(L, U, rng, x, y, math.radians(cap), mat)
        emprises.append(("une tente", emp))
    fz = sol(*FEU)
    for k in range(8):
        a = k * 2 * PI / 8
        L.ajouter(*N.sphere(0.07 + 0.02 * (k % 2), 6, 4, 0.75), "roche_desert", T(FEU[0] + math.cos(a) * 0.24, FEU[1] + math.sin(a) * 0.24, fz + 0.02) @ Rz(k))
    for k in range(3):
        a = k * PI / 3
        L.ajouter(*N.poutre((FEU[0] - math.cos(a) * 0.17, FEU[1] - math.sin(a) * 0.17, fz + 0.05), (FEU[0] + math.cos(a) * 0.17, FEU[1] + math.sin(a) * 0.17, fz + 0.07), 0.04), "planches_sombres")
    for k in range(3):
        a = k * 2 * PI / 3 + 0.3
        L.ajouter(*N.poutre((FEU[0] + math.cos(a) * 0.3, FEU[1] + math.sin(a) * 0.3, fz), (FEU[0], FEU[1], fz + 0.55), 0.022), "planches_sombres")
    L.ajouter(*N.poutre((FEU[0], FEU[1], fz + 0.55), (FEU[0], FEU[1], fz + 0.36), 0.01), "fer")
    L.ajouter(*N.cylindre(0.1, 0.12, 0.12, 8), "fer", T(FEU[0], FEU[1], fz + 0.24))
    Fl = N.Maille("flammes")
    Fl.ajouter(*N.cylindre(0.11, 0.0, 0.2, 6, haut=False), "lumiere", T(0, 0, 0))
    Fl.ajouter(*N.cylindre(0.06, 0.0, 0.14, 5, haut=False), "lumiere", T(0.06, 0.03, 0))
    lots["libres"].append((Fl, (FEU[0], FEU[1], fz + 0.04), {"anim": "clignote"}))
    SOL.append(("dur", "le feu", Vf.rond(FEU[0], FEU[1], 0.4)))
    fumees.append((FEU[0], FEU[1], fz + 0.6))
    for k, a in enumerate((0.6, 2.2, 4.0, 5.2)[:2 if leger else 4]):
        q = (FEU[0] + math.cos(a) * 0.62, FEU[1] + math.sin(a) * 0.62)
        if libre(q[0], q[1], 0.07):
            P.passant(L, rng, q[0], q[1], angle=a + PI, z=sol(*q), leve=1 if k == 1 else 0)
            SOL.append(("passant", "quelqu'un au feu", Vf.rond(q[0], q[1], 0.07)))
    for k, (x, y, a) in enumerate(((-2.95, -4.55, 0.4), (-1.5, -4.7, 2.5))):
        L.ajouter(*N.boite(0.5, 0.32, 0.012), rng.choice(["tapis", "tapis_bleu"]), T(x, y, sol(x, y) + 0.005) @ Rz(a))
        SOL.append(("decor", "un tapis", Vf.rectangle(x, y, 0.5, 0.32, a)))
    dc = N.Maille("dromadaire_couche")
    dromadaire(dc, rng, couche=True)
    A.fondre(L, dc, T(-4.75, -4.5, sol(-4.75, -4.5)) @ Rz(0.4))
    SOL.append(("dur", "le dromadaire couché", Vf.rectangle(-4.7, -4.47, 0.8, 0.4, 0.4)))
    pa_ = (-4.3, -5.0)  # le poteau d'attache, une selle posée dessus
    L.ajouter(*N.poutre((pa_[0] - 0.3, pa_[1], sol(*pa_) + 0.32), (pa_[0] + 0.3, pa_[1], sol(*pa_) + 0.32), 0.04), "planches_sombres")
    for s in (-1, 1):
        L.ajouter(*N.poutre((pa_[0] + s * 0.28, pa_[1], sol(*pa_) - 0.05), (pa_[0] + s * 0.28, pa_[1], sol(*pa_) + 0.34), 0.045), "planches_sombres")
    L.ajouter(*N.boite(0.22, 0.2, 0.08), "tapis_bleu", T(pa_[0] + 0.05, pa_[1], sol(*pa_) + 0.32) @ Ry(0.1))
    SOL.append(("dur", "le poteau d'attache", Vf.rectangle(pa_[0], pa_[1], 0.66, 0.15, 0.0)))
    for k, (x, y) in enumerate(((-3.0, -4.95), (-2.85, -5.05), (-1.25, -4.55))):
        if libre(x, y, 0.09):
            jarre(L, T(x, y, sol(x, y)), 0.2 + 0.05 * (k % 2))
            SOL.append(("dur", "une jarre", Vf.rond(x, y, 0.08)))
    sg = (-1.1, -2.15)  # le panneau aux trois flèches
    L.ajouter(*N.cylindre(0.025, 0.022, 0.62, 5), "planches_sombres", T(sg[0], sg[1], sol(*sg) - 0.05))
    for k, (cap, z) in enumerate(((1.6, 0.52), (0.1, 0.43), (-2.6, 0.34))):
        Mf = T(sg[0], sg[1], sol(*sg) + z) @ Rz(cap)
        L.ajouter(*N.boite(0.3, 0.02, 0.07), "planches_claires", Mf @ T(0.13, 0.0, 0))
        L.ajouter([(0.28, -0.012, 0.0), (0.33, -0.012, 0.035), (0.28, -0.012, 0.07), (0.28, 0.012, 0.0), (0.33, 0.012, 0.035), (0.28, 0.012, 0.07)], [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2)], "planches_claires", Mf)
    SOL.append(("dur", "le panneau", Vf.rond(sg[0], sg[1], 0.06)))
    P.banniere(lots, -2.9, -3.15, sol(-2.9, -3.15), 1.3, "rose", math.radians(-95), 0.26, 0.6)

    etape("le ponton")
    # --- le ponton où l'on débarque, la barque ---
    pr = pa + dp * 0.7
    Rf.tablier(L, tuple(pa), tuple(pr), sol(*pa) + 0.03, ZQ, 0.55)
    Rf.tablier(L, tuple(pr), tuple(pb), ZQ, ZQ, 0.55)
    for k in range(int(lg / 0.6) + 1):
        for s in (-1, 1):
            q = pa + dp * (0.2 + k * 0.6) + cote_p * s * 0.24
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6, haut=False), "planches_sombres", T(q[0], q[1], -0.85))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.55, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[-1]))
    lp = pa + dp * (lg - 0.1) + cote_p * 0.22
    L.ajouter(*N.cylindre(0.03, 0.025, 0.75, 5), "planches_sombres", T(lp[0], lp[1], ZQ))
    L.ajouter(*N.poutre((lp[0], lp[1], ZQ + 0.72), (lp[0] - cote_p[0] * 0.14, lp[1] - cote_p[1] * 0.14, ZQ + 0.72), 0.02), "fer")
    A.lanterne(L, U, (lp[0] - cote_p[0] * 0.14, lp[1] - cote_p[1] * 0.14, ZQ + 0.6), True, 0.1)
    brq = pa + dp * (lg - 0.9) + cote_p * 0.6
    cap_b = math.atan2(dp[1], dp[0])
    P.barque(L, rng, brq[0], brq[1], cap_b, 0.9)
    emprises.append(("la barque", Vf.rectangle(brq[0], brq[1], 0.9, 0.36, cap_b)))
    q = pa + dp * (lg - 0.25) - cote_p * 0.12
    P.passant(L, rng, q[0], q[1], angle=cap_b, z=ZQ)
    SOL.append(("passant", "un pêcheur", Vf.rond(q[0], q[1], 0.065)))

    etape("les plantes")
    # --- les touffes sèches, les rochers du reg ---
    faits = 0
    for essai in range(300):
        if faits >= (6 if leger else 16):
            break
        x, y = vers(rng.random() * 360, 0.6 + rng.random() * 3.0)
        if abs(y - yc(x)) < W_LIT + 0.4 or not libre(x, y, 0.12):
            continue
        touffe(L, rng, x, y, sol(x, y))
        SOL.append(("rocher", "une touffe", Vf.rond(x, y, 0.1)))
        faits += 1
    faits = 0
    for essai in range(300):
        if faits >= (4 if leger else 9):
            break
        x, y = vers(rng.random() * 360, 0.1 + rng.random() * 1.2)
        r_ = 0.08 + rng.random() * 0.12
        if not libre(x, y, r_):
            continue
        bloc(L, rng, x, y, r_, rng.choice(["gres", "gres_clair"]))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r_ * 1.3)))
        faits += 1

    etape("le mirage")
    # --- le mirage : le buffet, sur le replat des dunes (un objet à part : il tremble et s'efface) ---
    Mi = N.Maille("mirage")
    buffet(Mi, rng)
    lots["animes"].append((Mi, (PAD[0], PAD[1], H_PAD + 0.03), {"anim": "mirage", "eclipse": True, "ampl": 0.015, "cycle": 15, "phase": 0.15}))

    etape("la vie")
    # --- la vie : la caravane, les marcheurs, la fumée, le tourbillon, le sable des crêtes, les vautours ---
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
    total = sum(math.dist(a_, b_) for a_, b_ in zip(tour_, tour_[1:] + tour_[:1]))
    Dr = N.Maille("dromadaire")
    dromadaire(Dr, rng, charge=True, marche=True)
    for k in range(1 if leger else 2):
        extras = {"anim": "marche", "boucle": True, "chemin": [float(c) for p in tour_ for c in p], "vitesse": 0.15, "phase": -(0.62 + 0.62 * k) / total, "saut": 0.0, "pause": 0.0}
        if k == 0:
            i_dr = len(lots["animes"])
            lots["animes"].append((Dr, tour_[0], extras))
        else:
            lots["copies"].append((i_dr, tour_[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in fumees for c in p], "grosseur": 0.42, "cap": CAP_VENT, "force": 0.6}))
    lots["reperes"].append(((TOURB[0], TOURB[1], sol(*TOURB)), {"anim": "tourbillon", "rayon": 0.55, "haut": 1.9, "large": 0.38, "nb": 90 if leger else 150, "vie": 24}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "rafales", "nb": 6 if leger else 10, "rayon": 6.5, "haut": 0.9, "bas": 0.55, "cap": CAP_VENT, "couleur": [0.96, 0.84, 0.62]}))
    lots["reperes"].append(((MESA[0], MESA[1], Z_TOP + 1.2), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 2.2, "envergure": 0.18}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.0, "genre": 2}))

    etape("sur l'eau")
    # --- sur l'eau (dessiné par le site) : le ressac tout le long du rivage, l'ombre du ponton et de la barque ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.35)), lg - 0.8, 0.55, math.atan2(dp[1], dp[0]))
    K.tache(Rv, brq[0], brq[1], 0.85, 0.32, cap_b, rond=True, marge=0.16)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("ambre-v5", (0, -25, 14), (0, 0.4, 1.0), 55), ("ambre-v5-epave", (2.6, -8.0, 3.4), (0.6, 0.0, 0.7), 50)] if rendu else []
    return K.construire("ile-ambre-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="ambre")
