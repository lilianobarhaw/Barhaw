# La mer qui vit, « niveau 5 » (voir barhaw_niveau5.py) : tout ce qui nage, flotte et navigue entre les îles de GRAND
# LINE. Tout est inventé. Les mêmes sortes que la V4 (barhaw_vie_mer_v4.py), avec les mêmes noms et à peu près les mêmes
# tailles : le site les reconnaît au début de leur nom et les fait bouger lui-même (js/grandline-3d.js, « la mer qui vit »).
#   baleine   une grande baleine à bosses : peau d'ardoise tachée, ventre clair à sillons, longues nageoires claires à
#             bosselures, des anatifes sur la tête et le menton ; sa queue bat (baleine_queue)
#   dauphin   fuselé, dos gris-bleu, ventre blanc, aileron courbe
#   tortue    carapace à écailles, plastron, tête et pattes à petites écailles ; les nageoires avant battent
#   raie      une raie manta : dos noir, ventre blanc, cornes, longue queue ; ses ailes battent
#   poisson   un poisson volant : dos bleu, flancs d'argent, grandes nageoires-ailes
#   marchand  un petit caboteur : coque bordée, bande peinte, pont, cabine, cargaison (caisses, tonneaux, sacs), un mât,
#             une voile à corne et un foc, des marins, une lanterne de poupe
#   peche     une barque : le pêcheur assis sous son chapeau de paille, les filets et leurs flotteurs, le panier de poissons,
#             la lanterne sur sa perche ; la canne se balance (peche_canne)
#   bouee     une bouée de chenal rouge et blanche : la cage, la cloche, le feu qui clignote (bouee_feu)
#   epave     des tonneaux cerclés, une caisse, des planches, un bout de mât et son cordage, une mouette posée
# Tout est cuit dans un seul atlas, sous un soleil presque au zénith (ces bêtes et ces bateaux tournent sur la carte).
# Sorties : vie-mer-v5.glb (+ -leger) et son atlas.   Usage, dans Blender : import barhaw_vie_mer_v5 as V; V.construire()
import math, os, random
import numpy as np
import barhaw_niveau5 as N

PI = math.pi
T, Rx, Ry, Rz, S = N.T, N.Rx, N.Ry, N.Rz, N.S

N.matiere("peau_baleine", N.tx_uni, 2.0, 0.4, c=0x34465a, graine=501, grain=0.25, taches=0.45, c2=0x5d6f82, seuil=0.6)
N.matiere("ventre_baleine", N.tx_uni, 1.5, 0.3, c=0xd9d4c7, graine=502, grain=0.2, taches=0.35, c2=0x9fa3a6, seuil=0.62)
N.matiere("anatifes", N.tx_uni, 0.5, 0.9, c=0xd2cab9, graine=503, grain=0.5, taches=0.6, c2=0x7f776a, seuil=0.55)
N.matiere("peau_dauphin", N.tx_uni, 1.2, 0.2, c=0x667b8f, graine=504, grain=0.15, taches=0.25, c2=0x4f6274, seuil=0.62)
N.matiere("ventre_dauphin", N.tx_uni, 1.2, 0.2, c=0xe4e3dc, graine=505, grain=0.1, taches=0.2, c2=0xc9cbc8, seuil=0.65)
N.matiere("carapace", N.tx_tuiles, 0.9, 0.8, c1=0x6e5a33, c2=0x4d3f22, c3=0x94804c, rangs=4, cols=5, graine=506, mousse=0.35, rond=False)
N.matiere("plastron", N.tx_uni, 1.0, 0.3, c=0xd8c58f, graine=507, grain=0.2, taches=0.3, c2=0xb39e66, seuil=0.6)
N.matiere("peau_tortue", N.tx_paves, 0.5, 0.6, c=0x7f8c55, g=9, graine=508)
N.matiere("peau_raie", N.tx_uni, 1.5, 0.3, c=0x2c2838, graine=509, grain=0.2, taches=0.35, c2=0x4a4560, seuil=0.6)
N.matiere("ventre_raie", N.tx_uni, 1.5, 0.2, c=0xebe8e0, graine=510, grain=0.1, taches=0.3, c2=0x9a97a6, seuil=0.7)
N.matiere("dos_poisson", N.tx_uni, 0.5, 0.3, c=0x2a6a9c, graine=511, grain=0.2, taches=0.3, c2=0x4f97c6, seuil=0.6)
N.matiere("argent", N.tx_uni, 0.5, 0.2, rugueux=0.5, metal=0.2, c=0xd7dde2, graine=512, grain=0.1, taches=0.2, c2=0xaab4bd, seuil=0.6)
N.matiere("nageoire_bleue", N.tx_uni, 0.5, 0.1, c=0x8fc3dd, graine=513, grain=0.1, taches=0.3, c2=0x5e98bd, seuil=0.6)
N.matiere("oeil_noir", N.tx_uni, 0.2, 0.0, rugueux=0.2, c=0x0d0d10, graine=514, grain=0.05, taches=0.0)
N.matiere("bouee_rouge", N.tx_uni, 0.8, 0.4, rugueux=0.6, c=0xb33a2e, graine=515, grain=0.2, taches=0.45, c2=0x6e2a1e, seuil=0.6)
N.matiere("bouee_blanche", N.tx_uni, 0.8, 0.4, rugueux=0.6, c=0xe8e3d6, graine=516, grain=0.2, taches=0.4, c2=0xa59a86, seuil=0.62)
N.matiere("plumes", N.tx_uni, 0.3, 0.2, c=0xf2f0ea, graine=517, grain=0.1, taches=0.2, c2=0xb9bcc2, seuil=0.7)
N.matiere("paille", N.tx_uni, 0.4, 0.5, c=0xd9b96a, graine=518, grain=0.35, taches=0.3, c2=0xa8853f, seuil=0.6)


class Sorte:
    """Ce qui fait une sorte : son corps (cuit), ses lumières (le site les allume la nuit), ses pièces qui bougent."""

    def __init__(self, nom):
        self.nom = nom
        self.corps = N.Maille(f"{nom}_corps")
        self.lumieres = N.Maille(f"{nom}_lumieres")
        self.anims = []  # (Maille, partie, origine, extras)

    def anim(self, partie, origine, **extras):
        """Une pièce qui bouge : on la dessine à sa place (comme le reste), elle est ramenée autour de son origine à la fin
        (N.objet pose l'objet à l'origine, sa maille autour de lui)."""
        m = N.Maille(f"{self.nom}_{partie}")
        self.anims.append((m, partie, tuple(origine), extras))
        return m

    def recentrer(self):
        for m, partie, origine, extras in self.anims:
            m.v = [np.asarray(a, np.float64) - np.asarray(origine, np.float64) for a in m.v]


# ---------------------------------------------------------------------------------------------------------------------
# des formes pour les bêtes
# ---------------------------------------------------------------------------------------------------------------------
def fuseau(L, sections, dos, ventre=None, n=14, seuil=-0.3, M=None):
    """Un corps fuselé le long de X : sections (x, demi-largeur, demi-hauteur, z du centre), d'un bout à l'autre ; les
    bouts se ferment en pointe. Le ventre (les faces tournées vers le bas) prend une autre matière. Le motif est déroulé
    d'un seul tenant (le tour de chaque anneau, la longueur du corps) : pas de coutures en damier sur la peau, et une
    seule carte dans l'atlas pour le dos, une pour le ventre (la couture est cachée dessous)."""
    n = N._cotes(n)
    ang = lambda k: -PI / 2 + k * 2 * PI / n  # k = 0 : sous le ventre
    v = []
    for x, ry, rz, zc in sections:
        for k in range(n):
            a = ang(k)
            v.append((x, math.cos(a) * ry, zc + math.sin(a) * rz))
    nb = len(sections)
    x0, x1 = sections[0][0], sections[-1][0]
    sens = 1 if x1 > x0 else -1
    v.append((x0 - sens * 0.02, 0, sections[0][3]))
    v.append((x1 + sens * 0.02, 0, sections[-1][3]))
    a0, a1 = len(v) - 2, len(v) - 1
    long = [0.0]
    for j in range(1, nb):
        long.append(long[-1] + math.hypot(sections[j][0] - sections[j - 1][0], sections[j][3] - sections[j - 1][3]))
    pas = [PI * (1.5 * (ry + rz) - math.sqrt(ry * rz)) / n for _, ry, rz, _ in sections]  # le tour de l'ellipse, divisé
    haut, bas = N.Faces(), N.Faces()
    haut.deroule, bas.deroule = [], []

    def ranger(face, ks, dr):
        s = sum(math.sin(ang(k)) for k in ks) / len(ks)
        if ventre and s < seuil:
            bas.append(face)
            bas.deroule.append(None if dr is None else [(u - (n * pj if ks[0] >= n // 2 else 0), w) for (u, w), pj in dr])
        else:
            haut.append(face)
            haut.deroule.append(None if dr is None else [(u, w) for (u, w), _ in dr])

    for j in range(nb - 1):
        pj, pk, vj, vk = pas[j], pas[j + 1], long[j], long[j + 1]
        for k in range(n):
            a, b = j * n + k, j * n + (k + 1) % n
            if sens > 0:
                f, dr = (a, b, b + n, a + n), [((k * pj, vj), pj), (((k + 1) * pj, vj), pj), (((k + 1) * pk, vk), pk), ((k * pk, vk), pk)]
            else:
                f, dr = (a, a + n, b + n, b), [((k * pj, vj), pj), ((k * pk, vk), pk), (((k + 1) * pk, vk), pk), (((k + 1) * pj, vj), pj)]
            ranger(f, (k, (k + 1) % n), dr)
    for k in range(n):
        k2 = (k + 1) % n
        ranger((a0, k2, k) if sens > 0 else (a0, k, k2), (k, k2), None)
        e = (nb - 1) * n
        ranger((a1, e + k, e + k2) if sens > 0 else (a1, e + k2, e + k), (k, k2), None)
    L.ajouter(v, haut, dos, M, doux=True)
    if bas:
        L.ajouter(v, bas, ventre, M, doux=True)
    return v


def surface(sections, x, a):
    """Un point de la peau d'un fuseau : à l'abscisse x, à l'angle a (0 : le flanc gauche +y, PI/2 : le dos)."""
    xs = [s[0] for s in sections]
    if xs[0] > xs[-1]:
        sections = sections[::-1]
        xs = xs[::-1]
    x = min(max(x, xs[0]), xs[-1])
    for j in range(len(xs) - 1):
        if xs[j] <= x <= xs[j + 1]:
            t = (x - xs[j]) / ((xs[j + 1] - xs[j]) or 1)
            ry, rz, zc = (sections[j][i] + (sections[j + 1][i] - sections[j][i]) * t for i in (1, 2, 3))
            return np.array((x, math.cos(a) * ry, zc + math.sin(a) * rz))
    return np.array((x, 0.0, 0.0))


def plaque(L, pts, ep, dessus, dessous=None, cote=None, M=None, bombe=0.0):
    """Une nageoire, une aile : un contour (x, y) plat, d'épaisseur ep (plus mince au bord), triangulé depuis son centre.
    bombe : le centre bombé vers le haut. Le contour peut tourner dans un sens ou dans l'autre : on le remet dans le
    sens inverse des aiguilles (sinon le dessus regarde vers le bas, et la cuisson le voit de l'intérieur : noir)."""
    if sum(pts[k][0] * pts[(k + 1) % len(pts)][1] - pts[(k + 1) % len(pts)][0] * pts[k][1] for k in range(len(pts))) < 0:
        pts = pts[::-1]
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    n = len(pts)
    v = [(x, y, ep / 2) for x, y in pts] + [(x, y, -ep / 2) for x, y in pts] + [(cx, cy, ep + bombe), (cx, cy, -ep * 0.6)]
    h, b = 2 * n, 2 * n + 1
    dsus = [(h, k, (k + 1) % n) for k in range(n)]
    dsous = [(b, n + (k + 1) % n, n + k) for k in range(n)]
    bords = [(k, n + k, n + (k + 1) % n, (k + 1) % n) for k in range(n)]
    L.ajouter(v, dsus, dessus, M, doux=True)
    L.ajouter(v, dsous, dessous or dessus, M, doux=True)
    L.ajouter(v, bords, cote or dessus, M)


def oeil(L, p, r):
    L.ajouter(*N.sphere(r, 8, 6), "oeil_noir", T(*p))
    L.ajouter(*N.sphere(r * 0.3, 5, 4), "bouee_blanche", T(p[0] + r * 0.45, p[1] + math.copysign(r * 0.55, p[1]), p[2] + r * 0.45))


# ---------------------------------------------------------------------------------------------------------------------
# les bêtes
# ---------------------------------------------------------------------------------------------------------------------
def baleine(K, rng):
    L = K.corps
    sec = [(5.2, 0.05, 0.05, -0.3), (5.0, 0.5, 0.38, -0.3), (4.4, 1.12, 0.82, -0.28), (3.4, 1.58, 1.22, -0.24),
           (2.1, 1.9, 1.48, -0.18), (0.7, 1.98, 1.55, -0.12), (-0.8, 1.86, 1.46, -0.05), (-2.2, 1.48, 1.18, 0.0),
           (-3.3, 0.98, 0.82, 0.04), (-4.1, 0.62, 0.57, 0.05), (-4.45, 0.5, 0.5, 0.05)]
    fuseau(L, sec, "peau_baleine", "ventre_baleine", n=22, seuil=-0.35)
    # les sillons du ventre, du menton au nombril
    for k in range(-4, 5):
        pts = []
        for x in np.linspace(4.9, 0.6 + abs(k) * 0.25, 9):
            p = surface(sec, x, -PI / 2 + k * 0.17)
            pts.append(p + np.array((0, 0, -0.012)))
        L.ajouter(*N.tube(pts, 0.022, 4, bouts=False), "peau_baleine")
    # la bouche, longue et courbe ; les yeux ; l'évent (deux narines)
    for s in (-1, 1):
        pts = [surface(sec, x, s * (PI if s < 0 else 0) + (-0.42 if s > 0 else 0.42)) for x in np.linspace(5.05, 2.55, 8)]
        pts = [p + np.array((0, s * 0.012, 0.04 * math.sin(i / 7 * PI))) for i, p in enumerate(pts)]
        L.ajouter(*N.tube(pts, 0.03, 4, bouts=False), "oeil_noir")
        e = surface(sec, 2.45, (0 if s > 0 else PI) + (-0.32 if s > 0 else 0.32))
        oeil(L, e + np.array((0, s * 0.02, 0)), 0.085)
    for s in (-1, 1):
        p = surface(sec, 3.05, PI / 2)
        L.ajouter(*N.sphere(0.13, 8, 5, 0.35), "oeil_noir", T(p[0], s * 0.09, p[2] - 0.02) @ S(1.4, 0.55, 1))
    # les bosses de la tête et du menton, couvertes d'anatifes
    for k in range(34 if N.DETAIL >= 1 else 16):
        x = rng.uniform(3.3, 5.0)
        a = rng.choice((PI / 2 + rng.uniform(-0.7, 0.7), -PI / 2 + rng.uniform(-0.55, 0.55)))
        p = surface(sec, x, a)
        r = rng.uniform(0.045, 0.1)
        nz = 1 if a > 0 else -1
        L.ajouter(*N.cylindre(r, r * 0.6, r * 0.8, 6), "anatifes", T(*p) @ (Rx(PI) if nz < 0 else np.eye(4)))
    # la petite bosse et l'aileron du dos
    p = surface(sec, -2.5, PI / 2)
    plaque(L, [(0.5, 0), (0.0, 0.0), (-0.55, 0.0), (-0.2, 0.35), (0.15, 0.42)], 0.16, "peau_baleine", M=T(p[0], 0, p[2] - 0.08) @ Rx(PI / 2))
    # les longues nageoires claires, bosselées au bord d'attaque
    for s in (-1, 1):
        base = surface(sec, 1.7, (0 if s > 0 else PI) + (-0.75 if s > 0 else 0.75))
        M = T(*base) @ Rz(s * -0.55) @ Rx(s * -0.55)
        contour = [(0.55, 0.0), (0.42, s * 1.2), (0.25, s * 2.4), (0.05, s * 3.4), (-0.18, s * 3.55), (-0.32, s * 2.5), (-0.45, s * 1.25), (-0.6, 0.0)]
        if s < 0:
            contour = contour[::-1]
        plaque(L, contour, 0.14, "ventre_baleine", "ventre_baleine", "peau_baleine", M=M)
        for j in range(7):
            t = (j + 0.5) / 7
            L.ajouter(*N.sphere(0.08 - 0.03 * t, 6, 4), "anatifes" if j % 3 == 0 else "ventre_baleine", M @ T(0.5 - 0.5 * t, s * 3.35 * t, 0.02))
    # la queue : le pédoncule et les deux grands lobes (elle bat de haut en bas)
    Q = K.anim("queue", (-4.2, 0, 0.05), anim="balance", axe=[0, 1, 0], ampl=0.28, vitesse=1.4)
    qsec = [(-4.2, 0.62, 0.57, 0.05), (-5.0, 0.42, 0.45, 0.06), (-5.7, 0.26, 0.32, 0.08), (-6.15, 0.16, 0.2, 0.1)]
    fuseau(Q, qsec, "peau_baleine", "ventre_baleine", n=14, seuil=-0.45)
    lobe = [(-5.95, 0.0), (-6.25, 0.55), (-6.75, 1.45), (-7.15, 2.25), (-7.4, 2.15), (-7.15, 1.35), (-6.95, 0.7), (-7.0, 0.05)]
    for s in (-1, 1):
        c = [(x, s * y) for x, y in lobe]
        plaque(Q, c if s > 0 else c[::-1], 0.1, "peau_baleine", "ventre_baleine", M=T(0, 0, 0.1))


def dauphin(K, rng):
    L = K.corps
    sec = [(1.78, 0.035, 0.035, -0.1), (1.55, 0.08, 0.07, -0.1), (1.25, 0.17, 0.2, -0.04), (0.95, 0.3, 0.34, 0.02),
           (0.45, 0.41, 0.44, 0.0), (-0.15, 0.38, 0.4, 0.0), (-0.65, 0.26, 0.28, 0.02), (-1.05, 0.13, 0.15, 0.03), (-1.22, 0.09, 0.1, 0.03)]
    fuseau(L, sec, "peau_dauphin", "ventre_dauphin", n=16, seuil=-0.2)
    for s in (-1, 1):
        e = surface(sec, 0.98, 0.25 if s > 0 else PI - 0.25)
        oeil(L, e, 0.035)
        p = surface(sec, 0.55, -0.6 if s > 0 else PI + 0.6)
        c = [(0.12, 0.0), (0.0, s * 0.42), (-0.12, s * 0.5), (-0.14, 0.0)]
        plaque(L, c if s > 0 else c[::-1], 0.05, "peau_dauphin", "ventre_dauphin", M=T(*p) @ Rx(s * -0.7))
    p = surface(sec, -0.15, PI / 2)
    plaque(L, [(0.3, 0.0), (-0.05, 0.47), (-0.2, 0.5), (-0.12, 0.25), (-0.3, 0.0)], 0.06, "peau_dauphin", M=T(p[0], 0, p[2] - 0.04) @ Rx(PI / 2))
    for s in (-1, 1):
        c = [(-1.15, 0.0), (-1.38, s * 0.25), (-1.55, s * 0.5), (-1.62, s * 0.46), (-1.5, s * 0.2), (-1.45, 0.0)]
        plaque(L, c if s > 0 else c[::-1], 0.04, "peau_dauphin", "ventre_dauphin", M=T(0, 0, 0.03))


def tortue(K, rng):
    L = K.corps
    L.ajouter(*N.sphere(1.0, 20, 10), "carapace", T(0, 0, 0) @ S(1.15, 0.95, 0.44))
    L.ajouter(*N.cylindre(1.0, 0.96, 0.1, 22), "plastron", T(0, 0, -0.12) @ S(1.13, 0.93, 1))
    # la tête (petites écailles), le bec, les yeux ; les pattes arrière, la petite queue
    tete = [(1.05, 0.2, 0.17, 0.0), (1.35, 0.21, 0.18, 0.04), (1.6, 0.16, 0.14, 0.06), (1.72, 0.07, 0.07, 0.05)]
    fuseau(L, tete, "peau_tortue", n=10)
    L.ajouter(*N.sphere(0.08, 6, 4), "anatifes", T(1.72, 0, 0.0) @ S(1, 1.2, 0.7))
    for s in (-1, 1):
        oeil(L, (1.52, s * 0.14, 0.12), 0.035)
        c = [(-0.65, 0.0), (-0.85, s * 0.45), (-1.15, s * 0.6), (-1.2, s * 0.42), (-1.0, s * 0.1)]
        plaque(L, c if s > 0 else c[::-1], 0.06, "peau_tortue", M=T(0, s * 0.45, -0.05))
    L.ajouter(*N.cylindre(0.07, 0.0, 0.3, 5), "peau_tortue", T(-1.15, 0, -0.03) @ Ry(-PI / 2))
    # les nageoires avant, longues et courbes (elles battent, l'une après l'autre)
    for s in (-1, 1):
        G = K.anim("nageoire" + ("d" if s > 0 else "g"), (0.6, s * 0.75, -0.05), anim="balance", axe=[1, 0, 0], ampl=0.4, vitesse=1.1, phase=0.0 if s > 0 else PI)
        c = [(0.8, s * 0.7), (0.62, s * 1.25), (0.25, s * 1.85), (-0.05, s * 2.0), (0.12, s * 1.45), (0.35, s * 0.9), (0.45, s * 0.7)]
        plaque(G, c if s > 0 else c[::-1], 0.07, "peau_tortue", M=T(0, 0, -0.05))


def raie(K, rng):
    L = K.corps
    sec = [(1.25, 0.32, 0.1, 0.0), (0.9, 0.6, 0.2, 0.0), (0.3, 0.78, 0.27, 0.02), (-0.4, 0.6, 0.21, 0.02), (-1.0, 0.24, 0.1, 0.0), (-1.2, 0.09, 0.05, 0.0)]
    fuseau(L, sec, "peau_raie", "ventre_raie", n=14, seuil=-0.25)
    for s in (-1, 1):
        oeil(L, surface(sec, 1.0, 0.2 if s > 0 else PI - 0.2), 0.045)
        c = [(1.15, s * 0.3), (1.55, s * 0.36), (1.62, s * 0.5), (1.4, s * 0.52), (1.1, s * 0.45)]
        plaque(L, c if s > 0 else c[::-1], 0.05, "peau_raie", "ventre_raie", M=T(0, 0, 0.0) @ Rx(s * 0.5))
    L.ajouter(*N.tube([(-1.15, 0, 0.0), (-2.1, 0, 0.04), (-3.0, 0, 0.08), (-3.5, 0, 0.1)], [0.06, 0.035, 0.02, 0.008], 5), "peau_raie")
    for k in range(6):
        L.ajouter(*N.sphere(0.06, 6, 4, 0.4), "bouee_blanche", T(-0.4 + k * 0.22, 0.25 * (1 if k % 2 else -1), 0.27))
    # les ailes (elles battent ensemble, comme on vole)
    for s in (-1, 1):
        G = K.anim("aile" + ("d" if s > 0 else "g"), (0.0, s * 0.65, 0.0), anim="balance", axe=[1, 0, 0], ampl=0.35, vitesse=1.3, phase=0.0 if s > 0 else PI)
        c = [(0.95, s * 0.6), (0.6, s * 1.3), (0.15, s * 2.15), (-0.12, s * 2.75), (-0.3, s * 2.6), (-0.35, s * 1.6), (-0.6, s * 0.6)]
        plaque(G, c if s > 0 else c[::-1], 0.1, "peau_raie", "ventre_raie", M=T(0, 0, 0.02), bombe=0.04)


def poisson(K, rng):
    L = K.corps
    sec = [(0.47, 0.02, 0.02, -0.01), (0.38, 0.07, 0.07, -0.01), (0.2, 0.11, 0.12, 0.0), (-0.1, 0.1, 0.11, 0.0), (-0.32, 0.05, 0.06, 0.0), (-0.42, 0.03, 0.035, 0.0)]
    fuseau(L, sec, "dos_poisson", "argent", n=10, seuil=-0.1)
    for s in (-1, 1):
        oeil(L, surface(sec, 0.33, 0.25 if s > 0 else PI - 0.25), 0.022)
        c = [(0.18, s * 0.08), (0.05, s * 0.45), (-0.2, s * 0.62), (-0.26, s * 0.5), (-0.08, s * 0.08)]
        plaque(L, c if s > 0 else c[::-1], 0.015, "nageoire_bleue", M=T(0, 0, 0.05) @ Rx(s * -0.08))
        c = [(-0.4, 0.0), (-0.55, s * 0.08), (-0.66, s * 0.2), (-0.6, s * 0.06), (-0.62, 0.0)]
        plaque(L, c if s > 0 else c[::-1], 0.012, "nageoire_bleue", M=Rx(PI / 2))


# ---------------------------------------------------------------------------------------------------------------------
# les bateaux
# ---------------------------------------------------------------------------------------------------------------------
def coque(L, lg, bm, haut, creux, bande, n=16, m=10, tableau=0.72):
    """Une coque bordée, de la poupe (x = -lg/2, tableau plat) à l'étrave (pointue) ; bande : la matière de la préceinte
    peinte, sous le plat-bord. Rend la largeur à chaque abscisse (pour poser le pont et le reste)."""
    n, m = N._cotes(n, 8), N._cotes(m, 6)

    def larg(t):
        return bm * (tableau + (1 - tableau) * math.sin(min(1.0, t / 0.45) * PI / 2)) if t < 0.45 else bm * max(0.03, math.cos((t - 0.45) / 0.55 * PI / 2)) ** 0.75

    v, bas, peint = [], [], []
    for i in range(n + 1):
        t = i / n
        x = -lg / 2 + lg * t
        b = larg(t)
        tonture = 0.12 * ((2 * t - 1) ** 2)  # le plat-bord remonte aux deux bouts
        prof = creux * (0.75 + 0.25 * math.sin(PI * min(1.0, t * 1.1)))
        for j in range(m + 1):
            ph = PI * j / m
            y = -b * math.cos(ph)
            z = haut + tonture - prof * math.sin(ph) ** 0.75
            v.append((x, y, z))
    for i in range(n):
        for j in range(m):
            a, b2 = i * (m + 1) + j, (i + 1) * (m + 1) + j
            f = (a, a + 1, b2 + 1, b2)
            (peint if j in (0, m - 1) else bas).append(f)
    L.ajouter(v, bas, "planches_sombres", tourne=True)
    L.ajouter(v, peint, bande, tourne=True)
    # le tableau arrière
    L.ajouter(v, [tuple(reversed(range(0, m + 1)))], "planches")
    return larg


def pont(L, lg, larg, haut, n=10, mat="pont"):
    v, f = [], []
    for i in range(n + 1):
        t = i / n * 0.97
        x = -lg / 2 + lg * t
        b = larg(t) * 0.94
        z = haut + 0.12 * ((2 * t - 1) ** 2) - 0.06
        v += [(x, -b, z), (x, b, z)]
    for i in range(n):
        f.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    L.ajouter(v, f, mat)
    # le plat-bord : une lisse de chaque côté
    for s in (-1, 1):
        pts = []
        for i in range(n + 1):
            t = i / n * 0.995
            pts.append((-lg / 2 + lg * t, s * larg(t), haut + 0.12 * ((2 * t - 1) ** 2) + 0.02))
        L.ajouter(*N.tube(pts, 0.035, 4, bouts=False), "poutre")


def tonneau(L, M, h=0.42, r=0.17, couche=False):
    if couche:
        M = M @ Rx(PI / 2) @ T(0, 0, -h / 2)
    L.ajouter(*N.tube([(0, 0, 0), (0, 0, h * 0.5), (0, 0, h)], [r * 0.86, r, r * 0.86], 10), "planches", M)
    for z in (0.12, 0.88):
        L.ajouter(*N.cylindre(r * 0.93, r * 0.93, 0.03, 10, haut=False), "fer", M @ T(0, 0, h * z - 0.015))


def caisse(L, M, l=0.4, mat="planches_claires"):
    L.ajouter(*N.boite(l, l, l * 0.85), mat, M)
    for s in (-1, 1):
        L.ajouter(*N.poutre((-l / 2, s * l / 2, 0.02), (l / 2, s * l / 2, l * 0.83), 0.035), "poutre", M)


def sac(L, M, rng):
    L.ajouter(*N.sphere(0.2, 8, 6), "toile_ecrue", M @ S(1.15, 0.9, 0.7) @ T(0, 0, 0.17))
    L.ajouter(*N.cylindre(0.05, 0.03, 0.08, 5), "corde", M @ T(0.18, 0, 0.18) @ Ry(PI / 2))


def marin(L, rng, x, y, z, angle, h=0.62, assis=False, habit=None, chapeau=None):
    """Un marin (inventé) : le pantalon, la vareuse, les bras, la tête, le bonnet ou le chapeau de paille."""
    M = T(x, y, z) @ Rz(angle) @ S(h / 0.62)
    habit = habit or rng.choice(["tissu_rouge", "tissu_bleu", "tissu_creme", "toile_ecrue"])
    if assis:
        for s in (-1, 1):
            L.ajouter(*N.tube([(0, s * 0.06, 0.04), (0.2, s * 0.07, 0.05), (0.24, s * 0.07, -0.12)], 0.045, 5), "tissu_sombre", M)
        z0 = 0.0
    else:
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.045, 0.04, 0.24, 5), "tissu_sombre", M @ T(0, s * 0.055, 0))
        z0 = 0.22
    L.ajouter(*N.cylindre(0.1, 0.09, 0.24, 7), habit, M @ T(0, 0, z0))
    L.ajouter(*N.sphere(0.075, 7, 5), rng.choice(["peau", "peau", "peau_brune"]), M @ T(0, 0, z0 + 0.32))
    for s in (-1, 1):
        L.ajouter(*N.tube([(0, s * 0.1, z0 + 0.21), (0.08, s * 0.14, z0 + 0.1), (0.16, s * 0.1, z0 + 0.08)], 0.028, 4, bouts=False), habit, M)
    if chapeau == "paille":
        L.ajouter(*N.cylindre(0.17, 0.16, 0.015, 10), "paille", M @ T(0, 0, z0 + 0.37))
        L.ajouter(*N.cylindre(0.07, 0.0, 0.11, 8), "paille", M @ T(0, 0, z0 + 0.38))
    else:
        L.ajouter(*N.sphere(0.078, 7, 4, 0.7), rng.choice(["tissu_rouge", "tissu_sombre", "tissu_bleu"]), M @ T(0, 0, z0 + 0.36))


def lanterne(L, U, M, r=0.09):
    L.ajouter(*N.cylindre(r * 0.8, r, 0.03, 6), "fer", M)
    U.ajouter(*N.cylindre(r * 0.85, r, r * 1.6, 6, haut=False), "lumiere", M @ T(0, 0, 0.03))
    for k in range(4):
        a = k * PI / 2 + PI / 4
        L.ajouter(*N.poutre((math.cos(a) * r * 0.9, math.sin(a) * r * 0.9, 0.03), (math.cos(a) * r, math.sin(a) * r, 0.03 + r * 1.6), 0.014), "fer", M)
    L.ajouter(*N.cylindre(r * 1.05, 0.0, r * 0.8, 6), "fer", M @ T(0, 0, 0.03 + r * 1.6))


def voile(L, pts, mat, n=6, creux=0.12):
    """Une voile (un quadrilatère ou un triangle, coins dans l'ordre), un peu creusée, des deux côtés."""
    P = [np.asarray(p, np.float64) for p in pts]
    if len(P) == 3:
        P = [P[0], P[1], P[2], P[2]]
    nrm = np.cross(P[1] - P[0], P[3] - P[0])
    nrm = nrm / (np.linalg.norm(nrm) or 1)
    v, f = [], []
    for i in range(n + 1):
        for j in range(n + 1):
            u, w = i / n, j / n
            p = (1 - u) * (1 - w) * P[0] + u * (1 - w) * P[1] + u * w * P[2] + (1 - u) * w * P[3]
            v.append(tuple(p + nrm * creux * math.sin(PI * u) * math.sin(PI * w)))
    for i in range(n):
        for j in range(n):
            a = i * (n + 1) + j
            f.append((a, a + n + 1, a + n + 2, a + 1))
    L.ajouter(v, f, mat)
    # l'envers, un rien décalé : deux faces au même endroit, la cuisson les voit l'une dans l'autre (noires)
    L.ajouter([tuple(np.asarray(p) - nrm * 0.012) for p in v], [tuple(reversed(x)) for x in f], mat)


def marchand(K, rng):
    L, U = K.corps, K.lumieres
    lg, H = 5.2, 0.62
    larg = coque(L, lg, 0.95, H, 0.85, "peint_vert", n=18)
    pont(L, lg, larg, H)
    # la cabine de poupe, sa porte et son toit
    L.ajouter(*N.boite(1.05, 1.25, 0.6), "planches", T(-1.95, 0, H + 0.04))
    v, f = N.toit_pignon(1.15, 1.35, 0.3, 0.06, 0.04)
    L.ajouter(v, f, "bardeaux", T(-1.95, 0, H + 0.64) @ Rz(PI / 2))
    L.ajouter(*N.boite(0.04, 0.32, 0.46), "porte", T(-1.41, 0, H + 0.06))
    lanterne(L, U, T(-2.62, 0, H + 0.2))
    # la cargaison : des caisses, des tonneaux debout et couchés, des sacs
    for k, (x, y) in enumerate(((0.95, -0.3), (1.35, 0.25), (0.95, 0.32), (1.75, -0.15))):
        caisse(L, T(x, y, H - 0.04) @ Rz(rng.uniform(-0.3, 0.3)), 0.36 + 0.06 * (k % 2), rng.choice(("planches_claires", "planches")))
    caisse(L, T(1.15, 0.0, H + 0.3) @ Rz(0.4), 0.3)
    for k in range(3):
        tonneau(L, T(-0.6 + k * 0.42, 0.42, H - 0.04))
    tonneau(L, T(-0.35, -0.38, H + 0.12) @ Rz(0.2), couche=True)
    for k in range(3):
        sac(L, T(0.25 + k * 0.3, -0.4, H - 0.04) @ Rz(rng.uniform(0, 3)), rng)
    # le mât, la bôme, la corne, la voile à corne, le foc et le beaupré, les haubans
    mx = 0.35
    L.ajouter(*N.cylindre(0.075, 0.05, 4.7, 8), "poutre", T(mx, 0, H - 0.05))
    L.ajouter(*N.poutre((mx - 0.05, 0, H + 0.55), (-2.3, 0, H + 0.95), 0.07), "poutre")
    L.ajouter(*N.poutre((mx - 0.05, 0, H + 3.6), (-1.85, 0, H + 4.3), 0.06), "poutre")
    voile(L, [(mx - 0.08, 0, H + 0.68), (-2.2, 0, H + 1.02), (-1.78, 0, H + 4.18), (mx - 0.08, 0, H + 3.52)], "toile_ecrue", n=7, creux=0.18)
    L.ajouter(*N.poutre((2.45, 0, H + 0.12), (3.55, 0, H + 0.5), 0.07), "poutre")
    voile(L, [(3.45, 0, H + 0.55), (mx + 0.08, 0, H + 0.8), (mx + 0.08, 0, H + 4.1)], "toile_or", n=6, creux=0.14)
    for s in (-1, 1):
        for x in (-0.25, 0.75):
            L.ajouter(*N.tube([(x, s * 0.92, H + 0.12), (mx, s * 0.04, H + 4.4)], 0.012, 3, bouts=False), "corde")
    L.ajouter(*N.tube([(mx, 0, H + 4.6), (3.5, 0, H + 0.52)], 0.012, 3, bouts=False), "corde")
    L.ajouter(*N.cylindre(0.03, 0.03, 0.4, 4), "poutre", T(mx, 0, H + 4.6))
    L.ajouter(*N.boite(0.02, 0.5, 0.22), "toile_turquoise", T(mx, 0.26, H + 4.82))
    # deux marins (inventés) : l'un à la barre, l'autre sur la cargaison
    marin(L, rng, -2.35, 0.2, H + 0.0, 0.0, 0.6)
    marin(L, rng, 0.55, 0.05, H - 0.02, 2.4, 0.6)
    L.ajouter(*N.poutre((-2.55, 0, H + 0.2), (-2.75, 0, H - 0.25), 0.05), "poutre")  # la barre (le safran)


def peche(K, rng):
    L, U = K.corps, K.lumieres
    lg, H = 3.0, 0.42
    larg = coque(L, lg, 0.66, H, 0.5, "peint_bleu", n=12, m=8, tableau=0.6)
    pont(L, lg, larg, H, n=6, mat="planches_claires")
    for x in (-0.5, 0.45):
        L.ajouter(*N.boite(0.2, 1.1, 0.05), "planches", T(x, 0, H + 0.02))
    # le pêcheur, assis sous son chapeau de paille
    marin(L, rng, -0.55, 0.0, H + 0.08, 0.15, 0.7, assis=True, habit="tissu_creme", chapeau="paille")
    # le filet en tas et ses flotteurs, le panier de poissons, le seau
    for k in range(7):
        a = k * 0.9
        L.ajouter(*N.tube([(0.9 + 0.2 * math.cos(a), 0.2 * math.sin(a), H + 0.02), (0.9 + 0.12 * math.cos(a + 1.5), 0.12 * math.sin(a + 1.5), H + 0.12), (1.0, 0.02, H + 0.16)], 0.025, 4), "corde")
    for k in range(5):
        L.ajouter(*N.sphere(0.05, 6, 4), "bouee_rouge", T(0.75 + rng.uniform(0, 0.35), rng.uniform(-0.25, 0.25), H + 0.1 + rng.uniform(0, 0.08)))
    L.ajouter(*N.cylindre(0.2, 0.24, 0.2, 10, haut=False), "planches_claires", T(0.2, -0.3, H - 0.02))
    for k in range(5):
        L.ajouter(*N.sphere(0.08, 6, 4), "poisson", T(0.2 + rng.uniform(-0.1, 0.1), -0.3 + rng.uniform(-0.1, 0.1), H + 0.16) @ Rz(rng.uniform(0, 3)) @ S(1.6, 0.6, 0.5))
    L.ajouter(*N.cylindre(0.11, 0.12, 0.16, 8, haut=False), "fer", T(0.25, 0.32, H - 0.02))
    # la perche et sa lanterne, à la poupe
    L.ajouter(*N.cylindre(0.025, 0.02, 1.0, 5), "poutre", T(-1.3, 0, H))
    lanterne(L, U, T(-1.3, 0, H + 1.0), 0.07)
    # la canne à pêche, son fil et son bouchon (elle se balance)
    G = K.anim("canne", (0.0, 0.15, 0.6), anim="balance", axe=[0, 1, 0], ampl=0.08, vitesse=0.9)
    G.ajouter(*N.tube([(-0.35, 0.12, H + 0.32), (0.6, 0.38, H + 1.05), (1.4, 0.62, H + 1.38), (2.0, 0.72, H + 1.45)], [0.025, 0.018, 0.012, 0.008], 4), "poutre")
    G.ajouter(*N.tube([(2.0, 0.72, H + 1.45), (2.18, 0.76, 0.12)], 0.006, 3, bouts=False), "bouee_blanche")
    G.ajouter(*N.sphere(0.06, 6, 4), "bouee_rouge", T(2.18, 0.76, 0.1))


def bouee(K, rng):
    L = K.corps
    L.ajouter(*N.cylindre(0.62, 0.5, 0.26, 16), "bouee_rouge", T(0, 0, -0.1))
    for k in range(3):
        L.ajouter(*N.cylindre(0.46 - k * 0.07, 0.4 - k * 0.07, 0.3, 14), "bouee_rouge" if k % 2 == 0 else "bouee_blanche", T(0, 0, 0.16 + k * 0.3))
    L.ajouter(*N.cylindre(0.66, 0.66, 0.06, 16), "fer", T(0, 0, 0.12))
    for k in range(4):
        a = k * PI / 2 + PI / 4
        L.ajouter(*N.poutre((math.cos(a) * 0.24, math.sin(a) * 0.24, 1.05), (math.cos(a) * 0.17, math.sin(a) * 0.17, 1.62), 0.035), "fer")
    L.ajouter(*N.cylindre(0.3, 0.3, 0.05, 12), "fer", T(0, 0, 1.03))
    L.ajouter(*N.cylindre(0.14, 0.24, 0.24, 12), "cuivre", T(0, 0, 1.1))
    L.ajouter(*N.sphere(0.04, 5, 4), "fer", T(0, 0, 1.08))
    L.ajouter(*N.cylindre(0.24, 0.0, 0.22, 8), "fer", T(0, 0, 1.62))
    for k in range(10):
        a = rng.uniform(0, 2 * PI)
        L.ajouter(*N.sphere(rng.uniform(0.03, 0.06), 5, 3), "anatifes", T(math.cos(a) * 0.6, math.sin(a) * 0.6, rng.uniform(-0.05, 0.08)))
    G = K.anim("feu", (0, 0, 1.45), anim="clignote", lent=1)
    G.ajouter(*N.sphere(0.12, 8, 6), "lumiere", T(0, 0, 1.45))


def epave(K, rng):
    L = K.corps
    for k, (x, y, r) in enumerate(((0.0, 0.0, 0.0), (0.72, 0.38, 1.3), (-0.62, 0.52, 0.55))):
        tonneau(L, T(x, y, 0.05) @ Rz(r), 0.56, 0.24, couche=True)
    caisse(L, T(-0.12, -0.62, -0.2) @ Rz(0.5) @ Rx(0.15), 0.5, "planches_grises")
    for k in range(3):
        L.ajouter(*N.boite(1.6 - k * 0.3, 0.2, 0.05), "planches_grises", T(0.25 + k * 0.1, -0.15 - k * 0.24, 0.0 + k * 0.03) @ Rz(0.3 + k * 0.2))
    # un bout de mât cassé, son cordage qui traîne
    L.ajouter(*N.cylindre(0.1, 0.09, 1.9, 7), "poutre", T(-1.05, -0.35, 0.02) @ Rz(0.9) @ Ry(PI / 2 - 0.05))
    L.ajouter(*N.tube([(-0.3, -0.75, 0.08), (0.2, -1.05, 0.0), (0.8, -0.9, -0.02), (1.3, -1.15, 0.0)], 0.025, 4, bouts=False), "corde")
    # une mouette posée sur la caisse
    M = T(-0.12, -0.62, 0.26) @ Rz(0.4)
    L.ajouter(*N.sphere(0.12, 8, 6), "plumes", M @ S(1.5, 0.85, 0.85) @ T(0, 0, 0.1))
    L.ajouter(*N.sphere(0.07, 6, 5), "plumes", M @ T(0.17, 0, 0.24))
    L.ajouter(*N.cylindre(0.025, 0.0, 0.09, 5), "or", M @ T(0.22, 0, 0.23) @ Ry(PI / 2))
    for s in (-1, 1):
        L.ajouter(*N.boite(0.26, 0.04, 0.07), "tissu_sombre", M @ T(-0.08, s * 0.09, 0.14) @ Ry(0.25))
        L.ajouter(*N.sphere(0.014, 4, 3), "oeil_noir", M @ T(0.22, s * 0.04, 0.27))


SORTES = {"baleine": baleine, "dauphin": dauphin, "tortue": tortue, "raie": raie, "poisson": poisson,
          "marchand": marchand, "peche": peche, "bouee": bouee, "epave": epave}


def mailles(leger=False):
    """leger : la version téléphone (moins de côtés aux formes rondes, moins de petites pièces)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        sortes = {}
        for k, (nom, fabrique) in enumerate(SORTES.items()):
            K = Sorte(nom)
            fabrique(K, random.Random(600 + k))
            K.recentrer()
            sortes[nom] = K
        return sortes
    finally:
        N.DETAIL = 1.0


def verifier(leger=False):
    """Sans Blender : chaque sorte se construit, sa taille reste celle de la V4 (le site compte dessus), rien de vide."""
    V4 = {"baleine": 12.2, "dauphin": 3.4, "tortue": 3.9, "raie": 5.0, "poisson": 1.15, "marchand": 6.3, "peche": 3.4, "bouee": 1.3, "epave": 2.6}
    sortes = mailles(leger)
    bilan, erreurs = {}, []
    for nom, K in sortes.items():
        tout = [K.corps] + [m for m, *_ in K.anims]
        pts = np.concatenate([np.concatenate(K.corps.v)] + [np.concatenate(m.v) + np.asarray(o) for m, _, o, _ in K.anims if m.v])
        if not np.isfinite(pts).all():
            erreurs.append(f"{nom} : des points faux (NaN)")
        dim = pts.max(0) - pts.min(0)
        bilan[nom] = {"triangles": sum(m.triangles() for m in tout), "taille": [round(float(x), 2) for x in dim]}
        if abs(max(dim[0], dim[1]) - V4[nom]) > 0.35 * V4[nom]:
            erreurs.append(f"{nom} : {max(dim[0], dim[1]):.2f} de long, la V4 en faisait {V4[nom]}")
    return {"erreurs": erreurs, "sortes": bilan, "triangles": sum(b["triangles"] for b in bilan.values())}


def construire(rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender : toutes les sortes, leur lumière cuite dans un atlas, l'export, une planche (les sortes côte à côte).
    Toutes les sortes sont dessinées au même endroit (le site les place) : pour la cuisson, on les écarte les unes des
    autres, sinon elles se font de l'ombre (la voile du caboteur sur la baleine, la baleine sur tout le reste)."""
    nom = "vie-mer-v5" + ("-leger" if leger else "")
    sortes = mailles(leger)
    site = lambda m: bool(m.mats) and all(x in N.SITE for x in m.mats)  # que des matières du site (le feu de la bouée) : rien à cuire
    cuites = [K.corps for K in sortes.values()] + [m for K in sortes.values() for m, *_ in K.anims if not site(m)]
    infos = {"triangles": sum(m.triangles() for m in cuites), "finesse": [round(x, 2) for x in N.emballer(cuites, taille)]}
    coll = N.collection("vie_mer_v5" + ("_leger" if leger else ""))
    objets = []
    for nom_s, K in sortes.items():
        objets.append(N.objet(K.corps, coll, f"{nom_s}_corps", extras={"role": "decor"}))
        if K.lumieres.v:
            N.objet(K.lumieres, coll, f"{nom_s}_lumieres", extras={"role": "decor"})
        for m, partie, origine, extras in K.anims:
            o = N.objet(m, coll, f"{nom_s}_{partie}", origine=origine, extras=dict(extras, role="anim"))
            if not site(m):
                objets.append(o)

    def placer(table, sens):
        for o in coll.objects:
            d = table.get(o.name.split("_")[0].split(".")[0], (0, 0, 0))
            o.location = (o.location[0] + sens * d[0], o.location[1] + sens * d[1], o.location[2] + sens * d[2])

    autres = [n for n in SORTES if n != "baleine"]
    loin = {n: (24 * math.cos(k * 2 * PI / len(autres)), 24 * math.sin(k * 2 * PI / len(autres)), 0) for k, n in enumerate(autres)}
    if cuire:
        # ces bêtes et ces bateaux tournent sur la carte : un soleil presque au zénith, un ciel fort (pas de côté à l'ombre)
        placer(loin, 1)
        N.soleil_et_ciel(soleil=(-0.16, -0.28, 0.95), force=3.3, force_ciel=1.2, taille=8.0)
        infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom="vie_mer")
        placer(loin, -1)
    N.soleil_et_ciel()
    if rendu:
        decal = {"baleine": (0, 0, 0), "dauphin": (1, 7, 0), "tortue": (5, 6, 0), "raie": (-6, 6, 0), "poisson": (7, 2.5, 1),
                 "marchand": (-9, -6, 0), "peche": (3, -6.5, 0), "bouee": (8.5, -3, 0), "epave": (8, 0, 0)}
        placer(decal, 1)
        infos["rendu"] = N.rendre(nom, (17, -22, 13), (0, 0, 0.6), 40, taille=(1600, 1000), echantillons=64, collections=[coll.name])
        placer(decal, -1)
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
