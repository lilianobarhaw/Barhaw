# Le Marais des Lanternes, « niveau 5 » : une mangrove, de l'eau noire, des lumières partout. Tout est inventé.
# (Son histoire, dans le bot : « Une mangrove de nuit. Des bougies partout, une cabane sur pilotis et des barques qui
# flottent toutes seules. »)
# L'idée : une digue de vase fait le tour de l'île et enferme une lagune d'eau noire (elle cache la mer du site), couverte
# de lentilles et de nénuphars. Dans la lagune, des îlots plats reliés par des passerelles de planches sur pieux : l'îlot
# du Grand Palétuvier (un arbre immense perché sur ses racines en arceaux, des lanternes pendues à toutes ses branches),
# l'îlot de la Cabane (sur pilotis, ses fenêtres allumées, son poêle qui fume), l'îlot de l'Autel des Bougies (trois
# marches de pierre couvertes de bougies, une grande lanterne), l'îlot de l'entrée, et de petits îlots de palétuviers.
# Au sud, le débarcadère. La vie : les veilleurs qui vont d'îlot en îlot, deux barques qui glissent toutes seules sur
# l'eau avec leur lanterne, des barques amarrées, des grenouilles, des hérons, la brume, les lucioles, des ronds dans
# l'eau, la fumée du poêle.
# Sorties : ile-marais-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier().
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_lucioles_v5 as Lu
import barhaw_marche_v5 as Mr
import barhaw_phare_v5 as Ph
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
_ecart = Ph._ecart

R_SOL = 10.0  # le sol de l'île est peint d'un seul tenant, de -R_SOL à R_SOL
ZE = 0.045  # le niveau de l'eau noire de la lagune (juste au-dessus de la mer du site, qu'elle cache)
ZH = 0.34  # la hauteur de la digue, des îlots et des passerelles : on marche partout de plain-pied
FOND = -0.3  # le fond de la lagune
ARBRE = (0.5, 2.1)  # le Grand Palétuvier aux lanternes
ILOTS = {  # (centre, rayon) : leur dessus est plat jusqu'à 55 % du rayon
    "arbre": (ARBRE, 2.75), "cabane": ((-3.3, 0.6), 2.1), "autel": ((3.4, -0.6), 1.7), "entree": ((0.1, -2.9), 1.45),
    "nord": ((-1.9, 4.6), 1.15), "est": ((3.9, 3.0), 1.2), "ouest": ((-3.9, -2.9), 1.1),
}
CABANE, CAP_CABANE = (-4.35, 1.23), math.radians(59)  # la cabane, à cheval sur l'eau, sa façade tournée vers son îlot
PISTES = []  # les sentiers (remplis par mailles()), pour les peindre

N.matiere("mousse_pendante", N.tx_uni, 0.3, 0.4, c=0x7f9a6a, graine=621, grain=0.25, taches=0.3, c2=0x9ab07a, seuil=0.5)
N.matiere("cire", N.tx_uni, 0.3, 0.2, c=0xf3ead2, graine=622, grain=0.08)
N.matiere("grenouille", N.tx_uni, 0.2, 0.3, c=0x5fae3f, graine=623, grain=0.2, taches=0.4, c2=0x3f8a34, seuil=0.5)
N.matiere("plume_heron", N.tx_uni, 0.3, 0.3, c=0xdfe4e6, graine=624, grain=0.12, taches=0.3, c2=0xaab4ba, seuil=0.6)
N.matiere("papier_lanterne", N.tx_uni, 0.3, 0.3, c=0xd9482f, graine=625, grain=0.12, taches=0.25, c2=0xf08a3c, seuil=0.55)


def rivage(th):
    """Le rayon de la côte dans cette direction : une île ronde, un peu lobée."""
    return 7.4 + 0.42 * math.sin(2 * th + 0.9) + 0.28 * math.sin(3 * th + 0.4) + 0.18 * math.sin(5 * th + 2.2)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de la mer (au point de la côte le plus proche) ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de la mer (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def ilots(x, y):
    """1 sur le dessus plat d'un îlot, 0 hors des îlots (leur contour est un peu lobé)."""
    m = 0.0
    for (cx, cy), r in ILOTS.values():
        dd = math.hypot(x - cx, y - cy) * (1 + 0.08 * math.sin(3 * math.atan2(y - cy, x - cx) + cx * 1.7))
        if dd < r:
            m = max(m, K.lisse(r, r * 0.55, dd))
    return m


def terrain(x, y):
    """La hauteur du sol : la vase qui monte de la mer, la digue plate tout autour, le fond de la lagune, les îlots plats."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.4 * d)
    large = 1.15 + 0.3 * math.sin(3 * math.atan2(y, x) + 1.3)  # la digue est plus ou moins large
    digue = ZH * K.lisse(0.0, 0.45, d) - (ZH - FOND) * K.lisse(large, large + 0.8, d)
    h = max(digue, FOND + (ZH - FOND) * ilots(x, y))
    if h > 0.1:
        h += (K.bruit2(x * 1.1, y * 1.1, 9) - 0.5) * 0.045
    return h


sol = terrain


def tx_sol_marais(taille=2048, graine=601):
    """Le sol peint pixel par pixel : la vase sombre et luisante au bord de l'eau, la terre brune, la mousse et l'herbe rase
    sur le dessus des îlots et de la digue, les feuilles mortes, la terre battue des sentiers."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 200), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    vase = N.mel(N.hexa(0x3b3524), N.hexa(0x55492f), np.clip(0.2 + 0.6 * b2 + 0.3 * (b1 - 0.5), 0, 1)) * (0.9 + 0.2 * (fin - 0.5) + 0.12 * (grain - 0.5))[..., None]
    terre = N.mel(N.hexa(0x5a4a30), N.hexa(0x77633f), np.clip(0.2 + 0.7 * b2, 0, 1)) * (0.9 + 0.2 * (b3 - 0.5) + 0.14 * (grain - 0.5))[..., None]
    coul = N.mel(vase, terre, N.lisse(0.12, 0.3, h + (b2 - 0.5) * 0.1))
    herbe = N.mel(N.hexa(0x3c5c2e), N.hexa(0x66853d), np.clip(0.15 + 0.7 * b2 + 0.3 * (b3 - 0.5), 0, 1)) * (0.86 + 0.26 * (fin - 0.5) + 0.18 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0x7f9c3f), N.lisse(0.6, 0.72, N.bruit(n, 18, 18, graine + 6, 3)) * 0.5)  # la mousse claire
    talus = N.lisse(0.3, 0.12, h)  # sur les talus, une mousse plus sombre
    herbe = N.mel(herbe, N.hexa(0x33492a), talus[..., None] * 0.6)
    m_h = N.lisse(0.07, 0.17, h + (b3 - 0.5) * 0.07) * N.lisse(0.2, 0.42, b1 * 0.5 + b2 * 0.6 + (b3 - 0.5) * 0.25 + 0.25 * talus)
    coul = N.mel(coul, herbe, m_h * 0.93)
    feuilles = N.lisse(0.72, 0.8, N.bruit(n, 150, 150, graine + 7, 2)) * N.lisse(0.12, 0.26, h)  # des feuilles mortes
    coul = N.mel(coul, N.mel(N.hexa(0x8a6a2e), N.hexa(0xb08a3c), fin), feuilles * 0.75)
    battue = N.mel(N.hexa(0x6f5d3d), N.hexa(0x8a7650), b3) * (0.93 + 0.14 * (grain - 0.5))[..., None]
    coul = N.mel(coul, battue, N.lisse(0.2, 0.07, piste + (b2 - 0.5) * 0.08) * N.lisse(0.2, 0.3, h) * 0.9)
    mouille = N.lisse(0.1, 0.02, h + (b3 - 0.5) * 0.04)  # la vase mouillée, au ras de l'eau
    coul = N.mel(coul, N.hexa(0x2a281b), mouille * 0.75)
    relief = np.clip(0.5 + 0.25 * (b3 - 0.5) + 0.2 * (fin - 0.5) + 0.15 * feuilles - 0.2 * mouille, 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_marais", tx_sol_marais, 2 * R_SOL, 0.5, 0.9)


def tx_eau_marais(taille=1024, graine=611):
    """L'eau noire de la lagune, vue du ciel : des reflets verts sombres, et des nappes de lentilles d'eau près des rives."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 160), n)
    b1, b2, fin = N.bruit(n, 6, 6, graine, 3), N.bruit(n, 34, 34, graine + 1, 3), N.bruit(n, 220, 220, graine + 2, 1)
    coul = N.mel(N.hexa(0x10231f), N.hexa(0x1f3f35), np.clip(0.15 + 0.75 * b1, 0, 1)) * (0.92 + 0.16 * (b2 - 0.5))[..., None]
    rive = N.lisse(-0.3, -0.02, h)  # près d'une rive
    lentilles = N.lisse(0.52, 0.66, b2 * 0.75 + 0.42 * rive) * N.lisse(0.3, 0.55, b1 + 0.35 * rive)
    coul = N.mel(coul, N.mel(N.hexa(0x4f7d2f), N.hexa(0x86a843), fin), lentilles * 0.85)
    relief = np.clip(0.5 + 0.12 * lentilles + 0.04 * (fin - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("eau_marais", tx_eau_marais, 2 * R_SOL, 0.12, 0.14)


# --- les pièces ---
def _arceau(x, y, a, dd, z_haut, z_bas, n=5, depart=0.0):
    """Les points d'une racine en arceau : elle part du tronc presque à plat, s'arrondit et plonge droit dans la vase."""
    c, si = math.cos(a), math.sin(a)
    pts = []
    for k in range(n):
        t = k / (n - 1)
        rr = depart + (dd - depart) * math.sin(t * PI / 2) ** 0.85
        pts.append((x + c * rr, y + si * rr, z_haut - (z_haut - z_bas) * (1 - math.cos(t * PI / 2)) ** 1.15))
    return pts + [(x + c * (dd + 0.02), y + si * (dd + 0.02), z_bas - 0.28)]


def paletuvier(L, rng, x, y, z, h=1.6, r=0.7, racines=6, mousse=3, sobre=False):
    """Un palétuvier : un tronc perché sur des racines en arceaux qui plongent dans la vase, une couronne sombre et large,
    de la mousse qui pend. sobre : ceux du rivage, vus de loin (moins de facettes)."""
    zr = z + 0.26 + 0.1 * h
    a0 = rng.random() * 6.28
    for k in range(racines):
        a = a0 + k * 2 * PI / racines + (rng.random() - 0.5) * 0.4
        dd = (0.3 + 0.2 * rng.random()) * (0.55 + 0.45 * h / 1.6)
        pts = _arceau(x, y, a, dd, zr, z, 3 if sobre else 4, 0.02)
        L.ajouter(*N.tube(pts, [0.036 - 0.004 * i for i in range(len(pts))], 4 if sobre else 5, bouts=False), "ecorce_branche", doux=True)
    haut = (x + (rng.random() - 0.5) * 0.25, y + (rng.random() - 0.5) * 0.25, z + h)
    L.ajouter(*N.tube([(x, y, zr - 0.03), ((x + haut[0]) / 2 + 0.06, (y + haut[1]) / 2 - 0.04, (zr + haut[2]) / 2), haut], [0.075, 0.06, 0.045], 5 if sobre else 6, bouts=False), "ecorce_branche", doux=True)
    for k in range(2 if sobre else 3):
        a = a0 + k * (3.0 if sobre else 2.1)
        A.grappe(L, rng, haut[0] + math.cos(a) * r * 0.45, haut[1] + math.sin(a) * r * 0.45, haut[2] + 0.08 + 0.1 * k, r * ((0.7 if sobre else 0.62) - 0.08 * k), 0.55, "frondaison_sombre" if k != 1 else "frondaison", fin=k == 0 and not sobre and N.DETAIL >= 1)
    for k in range(mousse):
        a = a0 + 1.0 + k * 2.3
        p0 = (haut[0] + math.cos(a) * r * 0.62, haut[1] + math.sin(a) * r * 0.62, haut[2] - 0.02)
        L.ajouter(*N.poutre(p0, (p0[0] + 0.02, p0[1] + 0.01, p0[2] - 0.3 - 0.25 * rng.random()), 0.022), "mousse_pendante", zone=(1.0, 0.6, 1.0))


def grand_paletuvier(L, U, rng, leger):
    """Le Grand Palétuvier : ses racines en arceaux (les grandes, et de plus fines qui en repartent), un tronc épais, six
    maîtresses branches et leur feuillage, des racines qui tombent des branches jusqu'à l'eau, la mousse qui pend, et les
    lanternes de papier pendues à toutes les hauteurs."""
    x, y, z = ARBRE[0], ARBRE[1], ZH
    zr = z + 1.05
    nbr = 7 if leger else 10
    for k in range(nbr):
        a = k * 2 * PI / nbr + 0.2 * math.sin(k * 1.7)
        dd = 0.62 + 0.26 * ((k * 37) % 5) / 4
        pts = _arceau(x, y, a, dd, zr + 0.08, z, 4 if leger else 6, 0.08)
        L.ajouter(*N.tube(pts, [0.115 - 0.011 * i * (6 / len(pts)) for i in range(len(pts))], 6, bouts=False), "ecorce_branche", doux=True)
        if k % 2 == 0 and not leger:  # une racine plus fine, qui repart de la grande et plonge plus près du tronc
            m = pts[2]
            a2 = a + 0.5
            L.ajouter(*N.tube([m, (m[0] + math.cos(a2) * 0.16, m[1] + math.sin(a2) * 0.16, (m[2] + z) / 2 + 0.1), (m[0] + math.cos(a2) * 0.22, m[1] + math.sin(a2) * 0.22, z - 0.2)], [0.045, 0.036, 0.028], 4, bouts=False), "ecorce_branche", doux=True)
    tronc = [(x, y, zr - 0.16), (x + 0.03, y - 0.02, zr + 0.3), (x + 0.08, y - 0.05, zr + 0.9), (x - 0.05, y + 0.06, zr + 1.5)]
    L.ajouter(*N.tube(tronc, [0.2, 0.3, 0.24, 0.2], 9, bouts=True), "ecorce_branche", doux=True)
    haut = tronc[-1]
    for k in range(6):
        a = 0.5 + k * 2 * PI / 6
        c, s = math.cos(a), math.sin(a)
        lg = 1.5 + 0.3 * (k % 2)
        bout = (x + c * lg, y + s * lg, haut[2] + 0.5 + 0.25 * (k % 3))
        mi = ((haut[0] + bout[0]) / 2, (haut[1] + bout[1]) / 2, (haut[2] + bout[2]) / 2 + 0.3)
        A.branche(L, [haut, mi, bout], [0.12, 0.08, 0.05], 6)
        A.grappe(L, rng, bout[0], bout[1], bout[2] + 0.15, 0.85 + 0.1 * (k % 2), 0.55, "frondaison_sombre" if k % 2 else "frondaison", fin=not leger)
        for j in range(1 if leger else 2):  # la mousse qui pend sous le feuillage
            p0 = (bout[0] + (rng.random() - 0.5) * 0.9, bout[1] + (rng.random() - 0.5) * 0.9, bout[2] - 0.1)
            L.ajouter(*N.poutre(p0, (p0[0] + 0.02, p0[1], p0[2] - 0.45 - 0.35 * rng.random()), 0.026), "mousse_pendante", zone=(1.0, 0.6, 1.0))
        if k % 2 and not leger:  # une racine qui tombe de la branche, droit jusqu'au sol de l'îlot ou jusqu'à l'eau
            q = (x + c * lg * 0.86, y + s * lg * 0.86, bout[2] - 0.05)
            L.ajouter(*N.poutre(q, (q[0] + 0.03 * s, q[1] - 0.03 * c, min(ZH, max(FOND, terrain(q[0], q[1]))) - 0.05), 0.02), "ecorce_branche")
        for j in range(2):  # deux lanternes par branche, à des hauteurs différentes
            if leger and j and k % 2:
                continue
            t = 0.5 + 0.38 * j
            q = tuple(mi[i] + (bout[i] - mi[i]) * (2 * t - 1) if t > 0.5 else haut[i] + (mi[i] - haut[i]) * 2 * t for i in range(3))
            pend = 0.6 + 0.42 * ((k + 2 * j) % 3)
            L.ajouter(*N.poutre((q[0], q[1], q[2] - 0.02), (q[0], q[1], q[2] - pend), 0.008), "corde_pont")
            lanterne_papier(L, U, (q[0], q[1], q[2] - pend - 0.1), leger or (k + j) % 3 == 0)
    A.grappe(L, rng, x, y, haut[2] + 0.8, 1.15, 0.6, "frondaison", fin=not leger)
    return Vf.rond(x, y, 0.95, 12)


def lanterne_papier(L, U, q, grosse=True, mat="feu"):
    """Une lanterne de papier : un ballon qui luit (orangé, ou jaune pâle pour celles des mâts), serré entre deux coiffes
    de bois sombre, un gland rouge dessous. grosse : False, une petite ; True, une moyenne ; 2, une grande.
    La nuit, sur le site, eclairerIle (js/grandline-fete.js) pose une flaque de lumière là où il y a le plus de sommets
    brillants, matière par matière : les grandes lanternes jaunes des mâts ont donc chacune la leur, tout autour de la
    lagune, sans rien prendre aux lanternes orangées du Grand Palétuvier ni aux bougies."""
    x, y, z = q
    r = (0.058, 0.085, 0.105)[int(grosse)]
    nu, nv = ((6, 4), (8, 6), (10, 7))[int(grosse)]
    U.ajouter(*N.sphere(r, nu, nv, 1.12), mat, T(x, y, z))
    L.ajouter(*N.cylindre(r * 0.5, r * 0.4, r * 0.24, 6), "planches_sombres", T(x, y, z + r * 0.98))
    L.ajouter(*N.cylindre(r * 0.4, r * 0.5, r * 0.22, 6), "planches_sombres", T(x, y, z - r * 1.2))
    if grosse:
        L.ajouter(*N.poutre((x, y, z - r * 1.2), (x, y, z - r * 2.3), 0.014), "tissu_rouge")


def mat_lanterne(L, U, x, y, z, cap, h=1.15):
    """Un mât à lanterne : un pieu planté dans la vase, une potence, et la grande lanterne de papier qui pend au bout."""
    c, si = math.cos(cap), math.sin(cap)
    L.ajouter(*N.cylindre(0.036, 0.028, h + 0.3, 6), "planches_sombres", T(x, y, z - 0.3))
    L.ajouter(*N.poutre((x - c * 0.05, y - si * 0.05, z + h - 0.04), (x + c * 0.26, y + si * 0.26, z + h + 0.03), 0.022), "planches_sombres")
    L.ajouter(*N.poutre((x, y, z + h - 0.3), (x + c * 0.17, y + si * 0.17, z + h - 0.01), 0.016), "planches_sombres")
    q = (x + c * 0.23, y + si * 0.23, z + h - 0.22)
    L.ajouter(*N.poutre((q[0], q[1], q[2] + 0.1), (q[0], q[1], z + h + 0.02), 0.008), "corde_pont")
    lanterne_papier(L, U, q, 2, "luciole")


def passerelle(L, U, a, b, zd, larg=0.42):
    """Une passerelle de planches : le tablier, ses pieux dans l'eau, des piquets et une corde de chaque côté, et une bougie
    sur le premier et le dernier piquet. Renvoie son emprise."""
    Rf.tablier(L, a, b, zd, zd, larg)
    dx, dy = b[0] - a[0], b[1] - a[1]
    lg = math.hypot(dx, dy)
    nx, ny = -dy / lg, dx / lg
    for t in ((0.33, 0.67) if lg < 2.6 else (0.25, 0.5, 0.75)):
        for s_ in (-1, 1):
            L.ajouter(*N.cylindre(0.035, 0.03, zd + 0.9, 6, haut=False), "planches_sombres", T(a[0] + dx * t + nx * s_ * larg * 0.4, a[1] + dy * t + ny * s_ * larg * 0.4, -0.95))
    for s_ in (-1, 1):
        pts = [(a[0] + dx * t + nx * s_ * (larg / 2 - 0.02), a[1] + dy * t + ny * s_ * (larg / 2 - 0.02)) for t in (0.04, 0.35, 0.65, 0.96)]
        for q in pts:
            L.ajouter(*N.poutre((*q, zd - 0.03), (*q, zd + 0.3), 0.026), "planches_sombres")
        for q0, q1 in zip(pts[:-1], pts[1:]):
            L.ajouter(*N.poutre((*q0, zd + 0.28), (*q1, zd + 0.28), 0.012), "corde_pont")
        q = pts[0] if s_ > 0 else pts[-1]  # une bougie sur un piquet, à chaque bout (un côté puis l'autre)
        bougie(L, U, q[0], q[1], zd + 0.3, 0.06)
    return Vf.rectangle((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, lg, larg, math.atan2(dy, dx))


def bougie(L, U, x, y, z, h=0.08):
    """Une bougie : la cire, la flamme."""
    L.ajouter(*N.cylindre(0.016, 0.016, h, 5), "cire", T(x, y, z))
    U.ajouter(*N.sphere(0.015, 4, 3, 1.7), "lumiere", T(x, y, z + h + 0.022))


def heron(L, x, y, z, cap):
    """Un héron immobile, les pattes dans l'eau : deux pattes fines, le corps, le cou en S, la tête et le bec."""
    M = T(x, y, z) @ Rz(cap)
    for s in (-1, 1):
        L.ajouter(*N.poutre((0.0, s * 0.02, -0.1), (0.01, s * 0.02, 0.2), 0.008), "planches_sombres", M)
    L.ajouter(*N.sphere(0.07, 7, 5, 0.75), "plume_heron", M @ T(0.0, 0, 0.24) @ Ry(0.35) @ N.S(1.5, 0.9, 1.0))
    L.ajouter(*N.tube([(0.06, 0, 0.27), (0.11, 0, 0.36), (0.07, 0, 0.44), (0.1, 0, 0.5)], [0.02, 0.016, 0.014, 0.014], 5, bouts=True), "plume_heron", M)
    L.ajouter(*N.sphere(0.024, 5, 4), "plume_heron", M @ T(0.11, 0, 0.51))
    L.ajouter(*N.poutre((0.12, 0, 0.51), (0.2, 0, 0.49), 0.01), "or", M)


def grenouille():
    """Une grenouille (elle saute le long de la digue) : le corps, les yeux, les cuisses."""
    G = N.Maille("grenouille")
    G.ajouter(*N.sphere(0.035, 6, 4, 0.7), "grenouille", T(0, 0, 0.018))
    for s in (-1, 1):
        G.ajouter(*N.sphere(0.011, 4, 3), "cire", T(0.02, s * 0.015, 0.042))
        G.ajouter(*N.sphere(0.018, 5, 3, 0.7), "grenouille", T(-0.022, s * 0.028, 0.012))
    return G


def barque(rng, lanterne=True):
    """Une barque vide (elle flotte toute seule) : la coque, un banc, une lanterne de papier au bout d'une perche."""
    Bq = N.Maille("barque")
    Mr.sampan(Bq, T(0, 0, 0), rng, 1.05, None, False, "planches_sombres")
    if lanterne:
        Bq.ajouter(*N.poutre((0.36, 0, 0.0), (0.4, 0, 0.36), 0.014), "planches_sombres")
        lanterne_papier(Bq, Bq, (0.4, 0, 0.36), True)
    return Bq


def mailles(graine=421, leger=False):
    """leger : la version téléphone (un relief moins fin, moins d'arbres, de monde et de lumières)."""
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
    ZM = ZH + 0.02  # la hauteur des pieds de ceux qui marchent

    # --- le plan : les passerelles (de l'eau à franchir à chaque fois), les trajets des veilleurs ---
    C = {nom: c for nom, (c, _) in ILOTS.items()}
    quai_mer, quai_digue = vers(-90, -1.7), vers(-90, 0.6)
    liens = {  # (d'où, vers où) : toujours sur le dessus plat des îlots ou de la digue
        "quai": (quai_mer, quai_digue),
        "entree": (vers(-90, 0.95), (C["entree"][0], C["entree"][1] - 0.7)),
        "arbre": ((C["entree"][0] + 0.1, C["entree"][1] + 0.7), (ARBRE[0] - 0.05, ARBRE[1] - 1.4)),
        "cabane": ((C["entree"][0] - 0.68, C["entree"][1] + 0.2), (C["cabane"][0] + 0.9, C["cabane"][1] - 0.45)),
        "autel": ((C["entree"][0] + 0.68, C["entree"][1] + 0.2), (C["autel"][0] - 0.8, C["autel"][1] - 0.4)),
        "nord": ((ARBRE[0] - 1.0, ARBRE[1] + 1.0), (C["nord"][0] + 0.4, C["nord"][1] - 0.4)),
        "est": ((ARBRE[0] + 1.36, ARBRE[1] + 0.4), (C["est"][0] - 0.55, C["est"][1] - 0.15)),
    }

    def au_dela(nom, bout, d=0.3):
        """Le point à d du bout d'une passerelle (0 : son départ, 1 : son arrivée), dans son axe : on y entre toujours tout
        droit (un bocal sur son piquet garde chaque bout, sur le côté)."""
        (ax, ay), (bx, by) = liens[nom]
        lg = math.hypot(bx - ax, by - ay)
        ux, uy = (bx - ax) / lg, (by - ay) / lg
        return (bx + ux * d, by + uy * d, ZM) if bout else (ax - ux * d, ay - uy * d, ZM)

    pont = lambda nom, sens=1: [au_dela(nom, 0), *((*q, ZM) for q in liens[nom]), au_dela(nom, 1)][::sens]
    R_TOUR = 1.14  # le sentier qui fait le tour du Grand Palétuvier, entre ses racines et le bord de son îlot
    tour = lambda *angles: [(ARBRE[0] + math.cos(math.radians(a)) * R_TOUR, ARBRE[1] + math.sin(math.radians(a)) * R_TOUR, ZM) for a in angles]
    autel = (C["autel"][0] + 0.15, C["autel"][1] + 0.1)
    cab, cap_c = CABANE, CAP_CABANE
    echelle = (cab[0] + math.sin(cap_c) * 1.5, cab[1] - math.cos(cap_c) * 1.5, ZM)  # au pied de l'échelle de la cabane
    grenouilles = [[(*vers(a0 + (a1 - a0) * t / 3, 0.58 + 0.1 * (t % 2)), ZH + 0.01) for t in range(4)] for a0, a1 in ((-76, -66), (128, 141), (30, 42))]
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        ([(*quai_mer, ZM), (*quai_digue, ZM)] + pont("entree")[1:] + pont("autel"), False, 0.16, 0.0, 4.0),
        (tour(*range(0, 360, 15)), True, 0.15, 0.3, 0),
        ([echelle] + pont("cabane", -1) + pont("arbre") + tour(-110, -130, -150), False, 0.17, 0.5, 3.0),
        (tour(95, 115) + pont("nord"), False, 0.16, 0.7, 4.0),
        (tour(-20, 0) + pont("est"), False, 0.17, 0.2, 3.5),
    ]
    PISTES[:] = [pts for pts, *_ in chemins]
    couloirs = [(pts, 0.1) for pts, *_ in chemins] + [(pts, 0.05) for pts in grenouilles]
    loin_des_sentiers = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=0.2):
        """Cette place est-elle à terre, hors des passages et de ce qui est déjà posé ?"""
        if terrain(x, y) < bas or not loin_des_sentiers(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    def libre_eau(x, y, r):
        """Cette place est-elle sur l'eau de la lagune, loin des passerelles et des barques ?"""
        return terrain(x, y) < -0.12 and bord(x, y) > 1.5 and all(Vf.penetration(Vf.rond(x, y, r + 0.1), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (48 if leger else 72), R_SOL
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
    L.ajouter(sommets, faces, "sol_marais", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)
    # l'eau noire de la lagune : une nappe d'un seul tenant, son bord caché sous la digue
    nb = 40 if leger else 64
    eau = [(0.0, 0.0, ZE)] + [(*vers(k * 360 / nb, 0.75), ZE) for k in range(nb)]
    L.ajouter(eau, [(0, 1 + k, 1 + (k + 1) % nb) for k in range(nb)], "eau_marais", uv=[((x + R) / (2 * R), (y + R) / (2 * R)) for x, y, _ in eau])

    etape("les passerelles")
    for nom, (qa, qb) in liens.items():
        e = passerelle(L, U, qa, qb, ZH, 0.42)
        emprises.append((f"la passerelle ({nom})", e))
        ponts.append(e)
    P.banniere(lots, quai_mer[0] + 0.3, quai_mer[1] + 0.25, -0.3, 1.7, "rose", math.radians(100))

    etape("le Grand Palétuvier")
    SOL.append(("decor", "le Grand Palétuvier", grand_paletuvier(L, U, rng, leger)))
    for k in range(5 if leger else 9):  # des bougies entre ses racines
        a = 0.35 + k * 2 * PI / 9
        bougie(L, U, ARBRE[0] + math.cos(a) * 0.5, ARBRE[1] + math.sin(a) * 0.5, ZH - 0.01, 0.06 + 0.04 * (k % 3))

    etape("la cabane")
    # --- la cabane sur pilotis : son plancher, ses pieux, l'échelle, deux lanternes sous l'avant-toit, le poêle qui fume ---
    zc = ZH + 0.42
    Mc = T(cab[0], cab[1], zc) @ Rz(cap_c)
    L.ajouter(*N.boite(2.0, 1.6, 0.05), "planches", Mc @ T(0, -0.14, -0.05))
    for sx in (-0.92, 0, 0.92):
        for sy in (-0.86, 0.58):
            L.ajouter(*N.cylindre(0.045, 0.038, zc + 0.44, 5), "planches_sombres", Mc @ T(sx, sy, -zc - 0.3))
    for sx in (-0.92, 0.92):  # une traverse entre les pieux, de chaque côté
        L.ajouter(*N.poutre((sx, -0.86, -0.3), (sx, 0.58, -0.16), 0.03), "planches_sombres", Mc)
    tuyau = A.cabane(L, V, U, rng, Mc @ T(0, 0.1, 0), 1.45, 1.0, 0.62, 0.46)
    for s_ in (-1, 1):  # l'échelle, devant
        L.ajouter(*N.poutre((s_ * 0.14, -0.92, 0.0), (s_ * 0.14, -1.26, -0.44), 0.026), "poutre", Mc)
    for k in range(4):
        L.ajouter(*N.poutre((-0.14, -0.98 - 0.075 * k, -0.08 - 0.1 * k), (0.14, -0.98 - 0.075 * k, -0.08 - 0.1 * k), 0.02), "poutre", Mc)
    for sx in (-0.66, 0.66):  # deux lanternes sous l'avant-toit
        q = (Mc @ np.array((sx, -0.58, 0.52, 1.0)))[:3]
        lanterne_papier(L, U, tuple(float(c) for c in q), 2)
        L.ajouter(*N.poutre((q[0], q[1], q[2] + 0.08), (q[0], q[1], q[2] + 0.16), 0.008), "corde_pont")
    q = (Mc @ np.array((0.62, -0.72, 0.0, 1.0)))[:3]  # un veilleur sur le plancher, devant sa porte
    P.passant(L, rng, float(q[0]), float(q[1]), angle=cap_c - PI / 2, z=float(q[2]))
    q = (Mc @ np.array((-0.7, -0.7, 0.0, 1.0)))[:3]  # un tonneau et une caisse
    L.ajouter(*N.cylindre(0.085, 0.085, 0.2, 8), "planches_sombres", T(float(q[0]), float(q[1]), float(q[2])))
    SOL.append(("decor", "la cabane sur pilotis", Vf.rectangle(cab[0] + math.sin(cap_c) * 0.14, cab[1] - math.cos(cap_c) * 0.14, 2.1, 1.7, cap_c)))

    etape("l'autel")
    # --- l'Autel des Bougies : trois marches de pierre rondes, couvertes de bougies, et la grande lanterne sur son mât ---
    for k, (r, mat) in enumerate(((0.6, "pierres_sombres"), (0.44, "pierres_claires"), (0.28, "pierres_sombres"))):
        L.ajouter(*N.cylindre(r, r * 0.96, 0.11, 12 if not leger else 9), mat, T(autel[0], autel[1], ZH - 0.02 + 0.11 * k))
    L.ajouter(*N.cylindre(0.035, 0.028, 0.95, 6), "planches_sombres", T(autel[0], autel[1], ZH + 0.3))
    L.ajouter(*N.poutre((autel[0], autel[1], ZH + 1.22), (autel[0] + 0.22, autel[1], ZH + 1.22), 0.02), "planches_sombres")
    lanterne_papier(L, U, (autel[0] + 0.22, autel[1], ZH + 1.04), 2)
    L.ajouter(*N.poutre((autel[0] + 0.22, autel[1], ZH + 1.14), (autel[0] + 0.22, autel[1], ZH + 1.22), 0.008), "corde_pont")
    hasard = random.Random(4343)
    for k in range(14 if leger else 30):
        marche = k % 3
        r0, r1 = ((0.46, 0.57), (0.3, 0.41), (0.08, 0.24))[marche]
        a, rr = hasard.random() * 2 * PI, r0 + (r1 - r0) * hasard.random()
        bougie(L, U, autel[0] + math.cos(a) * rr, autel[1] + math.sin(a) * rr, ZH + 0.09 + 0.11 * marche, 0.05 + 0.07 * hasard.random())
    SOL.append(("decor", "l'Autel des Bougies", Vf.rond(autel[0], autel[1], 0.62, 12)))

    etape("les mâts à lanterne")
    # un cercle de grandes lanternes autour de la lagune (la nuit, c'est lui qui dessine l'île), une sur chaque petit îlot
    mats = [(*vers(-90 + 45 * k, 1.0), math.radians(-90 + 45 * k + 180)) for k in ((1, 3, 4, 5, 7) if leger else (1, 2, 3, 4, 5, 6, 7))]
    mats += [(C["entree"][0] + 0.6, C["entree"][1] - 0.5, 2.4)]
    if not leger:
        mats += [(C["ouest"][0] + 0.45, C["ouest"][1] - 0.3, 0.6), (C["nord"][0] + 0.2, C["nord"][1] + 0.4, -1.2), (C["est"][0] - 0.15, C["est"][1] + 0.5, -2.2)]
    for x, y, cap in mats:
        if libre(x, y, 0.07):
            mat_lanterne(L, U, x, y, sol(x, y), cap)
            SOL.append(("rocher", "un mât à lanterne", Vf.rond(x, y, 0.06)))

    etape("les palétuviers")
    # --- les palétuviers : sur les petits îlots, au bord des grands, sur la digue (côté lagune) ---
    places = [(*C["ouest"], 1.9, 0.8), (C["nord"][0] - 0.35, C["nord"][1] + 0.3, 1.7, 0.7), (C["est"][0] + 0.35, C["est"][1] + 0.3, 1.8, 0.75),
              (C["cabane"][0] + 0.75, C["cabane"][1] + 0.85, 1.5, 0.65), (C["autel"][0] + 0.55, C["autel"][1] + 0.75, 1.5, 0.65), (C["entree"][0] - 0.85, C["entree"][1] - 0.45, 1.3, 0.55)]
    for k, (x, y, h, r) in enumerate(places[: 3 if leger else 6]):
        if not libre(x, y, 0.24):
            continue
        paletuvier(L, rng, x, y, sol(x, y), h, r, 5 if leger else 6, 2 if leger else 3)
        SOL.append(("arbre", "un palétuvier", Vf.rond(x, y, 0.2)))
    # ceux de la digue (côté lagune) et ceux du rivage, les racines dans la mer : ils cachent la digue
    nb_d = 0
    for k in range(60):
        if nb_d >= (7 if leger else 20):
            break
        ang = k * 137.5 + rng.random() * 8
        dedans = (0.14 + 0.2 * rng.random()) if k % 2 else (0.85 + 0.35 * rng.random())
        x, y = vers(ang, dedans)
        if abs(((ang + 90 + 180) % 360) - 180) < 9 or not libre(x, y, 0.3, 0.02):  # pas devant le débarcadère
            continue
        paletuvier(L, rng, x, y, max(0.02, sol(x, y)), 1.25 + 0.75 * rng.random(), 0.6 + 0.25 * rng.random(), 5, 1 if leger else 2, True)
        SOL.append(("arbre", "un palétuvier", Vf.rond(x, y, 0.2)))
        nb_d += 1

    etape("le sous-bois")
    # --- les roseaux au ras de l'eau, les fougères et les buissons sur la digue et les îlots, des bougies le long des rives ---
    nbr = 0
    for _ in range(400):
        if nbr >= (10 if leger else 24):
            break
        a, rr = rng.random() * 2 * PI, 0.6 + rng.random() * 5.6
        x, y = math.cos(a) * rr, math.sin(a) * rr
        if 0.0 < terrain(x, y) < 0.2 and bord(x, y) > 1.2 and all(Vf.penetration(Vf.rond(x, y, 0.16), p) == 0 for _, p in emprises):
            Lu.roseaux(L, rng, x, y, max(terrain(x, y), ZE), 4 if leger else 5)
            nbr += 1
    for k in range(7 if leger else 20):
        for _ in range(30):
            x, y = vers(rng.random() * 360, 0.55 + rng.random() * 0.45) if k % 2 else (lambda c, r_: (c[0] + (rng.random() - 0.5) * r_, c[1] + (rng.random() - 0.5) * r_))(*rng.choice(list(ILOTS.values())))
            if libre(x, y, 0.2):
                if k % 4 == 2:
                    A.buisson(L, rng, x, y, sol(x, y) - 0.03, 0.18 + rng.random() * 0.08, None)
                else:
                    A.fougere(L, rng, x, y, sol(x, y), 5 if leger else 6, 0.22, 0.34, 2 if leger else 3)
                SOL.append(("rocher", "une fougère", Vf.rond(x, y, 0.18)))
                break
    for k in range(6 if leger else 16):  # des bougies posées çà et là, au bord de l'eau
        for _ in range(30):
            x, y = vers(rng.random() * 360, 1.0 + rng.random() * 0.3) if k % 2 else (lambda c, r_: (c[0] + (rng.random() - 0.5) * r_ * 1.1, c[1] + (rng.random() - 0.5) * r_ * 1.1))(*rng.choice(list(ILOTS.values())))
            if libre(x, y, 0.05):
                bougie(L, U, x, y, sol(x, y) - 0.01, 0.05 + 0.05 * rng.random())
                break

    etape("sur la lagune")
    # --- sur la lagune : les nénuphars et leurs fleurs, les hérons, les barques amarrées ---
    nbn = 0
    for _ in range(500):
        if nbn >= (12 if leger else 30):
            break
        a, rr_ = rng.random() * 2 * PI, 0.4 + rng.random() * 5.4
        x, y, rr = math.cos(a) * rr_, math.sin(a) * rr_, 0.1 + rng.random() * 0.13
        if libre_eau(x, y, rr):
            bord_f = [(math.cos(0.3 + t * 5.7 / 8) * rr, math.sin(0.3 + t * 5.7 / 8) * rr, 0.0) for t in range(9)]
            L.ajouter([(0.0, 0.0, 0.0)] + bord_f, [(0, 1 + t, 2 + t) for t in range(8)], "nenuphar", T(x, y, ZE + 0.012) @ Rz(a))
            if nbn % 4 == 0:
                L.ajouter(*N.sphere(rr * 0.32, 6, 4, 0.8), "fleur_rose", T(x + rr * 0.2, y, ZE + 0.03))
            nbn += 1
    for nom, a0 in (("ouest", 20), ("est", 250), ("nord", 200))[: 1 if leger else 3]:
        (cx_, cy_), r_ = ILOTS[nom]
        for da in range(0, 360, 20):  # le premier endroit où il a de l'eau à mi-pattes
            a = math.radians(a0 + da)
            x, y = cx_ + math.cos(a) * r_ * 0.86, cy_ + math.sin(a) * r_ * 0.86
            if -0.16 < terrain(x, y) < -0.03 and all(Vf.penetration(Vf.rond(x, y, 0.25), p) == 0 for _, p in emprises):
                heron(L, x, y, ZE - 0.02, a + 2.0)
                break
    for k, (x, y, cap) in enumerate(AMARRES):
        if libre_eau(x, y, 0.3):
            Bq = N.Maille(f"barque_amarree{k}")
            Mr.sampan(Bq, Rz(cap), rng, 1.05, None, False, "planches_sombres")
            lots["animes"].append((Bq, (float(x), float(y), ZE + 0.03), {"anim": "flotte", "ampl": 0.012, "roulis": 0.025, "phase": 0.7 * k}))
            emprises.append(("une barque amarrée", Vf.rectangle(x, y, 1.1, 0.4, cap)))

    etape("les habitants")
    def poser(x, y, cap=None, **plus):
        if not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y), **plus)
        SOL.append(("passant", "un veilleur", Vf.rond(x, y, 0.065)))

    poser(autel[0] - 0.55, autel[1] + 0.62, -0.9)  # devant l'autel
    poser(autel[0] + 0.5, autel[1] - 0.68, 2.2, leve=1)
    poser(C["entree"][0] - 0.35, C["entree"][1] + 0.5, 1.2)
    poser(C["cabane"][0] + 0.3, C["cabane"][1] - 0.85, -1.2)
    if not leger:
        poser(*vers(-66, 0.75), 1.9)  # sur la digue, il regarde la lagune
        poser(C["est"][0] - 0.1, C["est"][1] - 0.35, -2.3)

    etape("la vie")
    types = []
    for k in range(3):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=("lumiere", None, "lumiere")[k])  # ils portent une lumière
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    # les barques qui flottent toutes seules : elles font le tour d'un bassin, leur lanterne au bout de sa perche
    premiere = None
    for k, (cx_, cy_, rr, sens) in enumerate(BASSINS[: 1 if leger else len(BASSINS)]):
        tour = [(cx_ + math.cos(a * sens) * rr, cy_ + math.sin(a * sens) * rr * 0.8, ZE + 0.03) for a in np.arange(0, 2 * PI - 0.01, PI / 8)]
        if not all(libre_eau(q[0], q[1], 0.25) for q in tour):
            emprises.append((f"la barque du bassin {k} (hors de l'eau libre)", Vf.rond(0.0, 0.0, 0.5)))  # une erreur de plan, exprès
        extras = {"anim": "marche", "chemin": [float(c) for q in tour for c in q], "boucle": 1, "vitesse": 0.11 + 0.02 * k, "saut": 0.0, "roulis": 0.03, "phase": 0.4 * k}
        if premiere is None:
            premiere = len(lots["animes"])
            lots["animes"].append((barque(rng), tour[0], extras))
        else:
            lots["copies"].append((premiere, tour[0], extras))
    # les grenouilles de la digue
    Gr = grenouille()
    premiere = None
    for k, pts in enumerate(grenouilles[: 1 if leger else 3]):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": 0.1, "phase": 0.3 * k, "saut": 0.06, "pause": 2.5, "rayon": 0.04}
        if premiere is None:
            premiere = len(lots["animes"])
            lots["animes"].append((Gr, pts[0], extras))
        else:
            lots["copies"].append((premiere, pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for c in tuyau], "grosseur": 0.4}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "lucioles", "nb": 90 if leger else 200, "rayon": 6.4, "haut": 2.4, "etoiles": []}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "brume", "rayon": 6.6, "nb": 4 if leger else 8, "haut": 0.3}))
    for k, (cx_, cy_, rr, _) in enumerate(BASSINS[: 1 if leger else 3]):  # des ronds dans l'eau
        lots["reperes"].append(((float(cx_ + 0.2), float(cy_ - 0.1), ZE + 0.012), {"anim": "ecume", "rayon": 0.2}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.6, "genre": 2}))

    etape("sur l'eau")
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 0.9 / math.hypot(x, y)), y * (1 + 0.9 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    qa, qb = np.array(quai_mer), np.array(vers(-90, 0.0))
    K.tache(Rv, *((qa + qb) / 2), float(np.linalg.norm(qb - qa)), 0.5, math.atan2(qb[1] - qa[1], qb[0] - qa[0]))
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


# les bassins où tournent les barques qui flottent toutes seules : (centre x, y, rayon, sens)
BASSINS = [(2.8, -3.0, 1.0, -1), (-2.0, -4.0, 1.0, 1), (-3.2, 3.4, 0.85, 1), (4.8, 1.2, 0.9, -1)]
AMARRES = [(0.78, -5.2, math.radians(84)), (-5.21, 1.75, math.radians(59))]  # les barques amarrées : (x, y, cap)


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("marais-v5", (1.0, -30.5, 17.5), (0.0, 0.4, 1.2), 50), ("marais-v5-arbre", (-3.5, -9.0, 5.2), (0.5, 1.4, 1.5), 50)] if rendu else []
    return K.construire("ile-marais-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="marais")
