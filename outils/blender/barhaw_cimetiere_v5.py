# Le Cimetière de Navires, « niveau 5 » : une grève grise couverte d'épaves, dans le brouillard.
# (Son histoire, dans le bot : « Des épaves à perte de vue, du brouillard, et un navire gris qui n'a plus d'équipage
# vivant. »)
# L'idée : une île basse de galets gris et d'herbe morte, coupée de chenaux où entre la mer. Partout des épaves : des
# coques couchées sur la grève, une carcasse dont il ne reste que les côtes, une proue dressée qui sort des galets avec sa
# figure sculptée, des mâts brisés qui sortent de l'eau. Au milieu, la Nef : une grande coque retournée dont le gardien
# du cimetière a fait sa maison (une porte, des fenêtres, un tuyau qui fume). À côté, le cimetière des marins : des
# rames en croix, des planches, une roue de gouvernail, des ancres, et des lanternes vertes sur leurs piquets. Le vieux
# ponton, auquel il manque des planches. Et dans la baie, le Navire Gris : un trois-mâts entier, ses voiles en lambeaux,
# des lanternes vertes allumées… et personne à bord.
# La vie : le gardien fait sa tournée une lanterne à la main, le passeur rame entre le ponton et le Navire Gris, des feux
# follets au-dessus des chenaux, le brouillard qui traîne. Tout est inventé.
# La nuit : les lanternes vertes (« spectre »), les feux follets, la fenêtre de la Nef (« vitre »).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_ambre_v5 as Am
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
ZQ = 0.36  # le ponton
NEF = (-2.1, 0.9)  # la grande coque retournée, la maison du gardien
CAP_NEF = math.radians(18)
CIMETIERE = (1.7, 1.1)  # le cimetière des marins
NAVIRE_GRIS = (5.7, -5.5)  # dans la baie du sud-est
CAP_GRIS = math.radians(46)  # le long de la côte
# les chenaux où entre la mer (peu de points)
CHENAUX = [[(-7.6, 3.2), (-5.6, 2.9), (-4.1, 3.4), (-3.0, 4.6)], [(7.6, -0.6), (5.6, -0.2), (4.4, -1.1), (3.4, -2.4)], [(-1.0, 7.4), (-0.6, 5.8), (0.6, 4.9)]]
PISTES = []
SOL_CHEMINS = []


def tx_galets(c=0x9a958b, graine=1):
    """La grève : des galets gris serrés (des taches rondes claires et sombres), du sable humide entre eux."""
    n = N.TAILLE
    g1 = N.bruit(n, 60, 60, graine, 1)
    g2 = N.bruit(n, 140, 140, graine + 1, 1)
    b = N.bruit(n, 6, 6, graine + 2, 3)
    coul = N.mel(np.broadcast_to(N.hexa(0x6f6a62), (n, n, 3)).copy(), np.broadcast_to(N.hexa(c), (n, n, 3)), np.clip(0.3 + 0.8 * (g1 - 0.5) + 0.4 * (b - 0.5), 0, 1))
    coul = N.mel(coul, N.hexa(0xc9c4b8), N.lisse(0.7, 0.8, g2) * 0.6)
    coul = N.mel(coul, N.hexa(0x4e4a44), N.lisse(0.32, 0.22, g2) * 0.5)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.5 + 0.4 * (g1 - 0.5) + 0.2 * (g2 - 0.5), 0, 1).astype(np.float32)


N.matiere("bois_gris", N.tx_planches, 1.0, 0.8, c=0x8e8a80, nb=6, graine=811, usure=0.95)
N.matiere("bois_gris_sombre", N.tx_planches, 1.0, 0.8, c=0x4d4943, nb=6, graine=812, usure=0.7)
N.matiere("voile_grise", N.tx_uni, 0.8, 0.3, c=0xb4b1a8, graine=813, grain=0.2, taches=0.6, c2=0x8d897f, seuil=0.5)
N.matiere("pierre_grise", N.tx_uni, 0.8, 0.7, c=0x8b8a86, graine=814, grain=0.35, taches=0.5, c2=0x6a6964, seuil=0.5)
N.matiere("herbe_morte", N.tx_herbe, 1.5, 0.3, c=0x8b8460, graine=815, fleurs=False)


def rivage(th):
    """Le rayon de la côte dans cette direction : une côte basse, découpée."""
    return 7.0 + 0.5 * math.sin(2 * th + 0.3) + 0.35 * math.sin(3 * th + 2.1) + 0.25 * math.sin(6 * th + 0.9)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def d_chenal(x, y):
    return min(K.distance_au_trajet(x, y, [(a, b, 0.0) for a, b in ch]) for ch in CHENAUX)


def terrain(x, y):
    """Une grève basse : elle monte à peine vers le milieu ; les chenaux la coupent jusque sous l'eau."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.4 * d)
    h = 0.3 * K.lisse(0.0, 1.0, d) + 0.16 * K.lisse(1.0, 4.0, d)
    h += (K.bruit2(x * 0.8, y * 0.8, 11) - 0.5) * 0.1 * K.lisse(0.4, 1.5, d)
    dc = d_chenal(x, y)
    h -= 0.62 * K.lisse(0.75, 0.2, dc)
    return h


sol = terrain


def tx_sol_cimetiere(taille=2048, graine=821):
    """Le sol : les galets gris de la grève, le sable mouillé au bord de l'eau, des plaques d'herbe morte vers le milieu,
    les sentiers de galets clairs, des algues échouées."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 240), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    g1, g2 = N.bruit(n, 420, 420, graine + 4, 1), N.bruit(n, 900, 900, graine + 5, 1)
    galets = N.mel(N.hexa(0x77726a), N.hexa(0xa7a196), np.clip(0.3 + 0.9 * (g1 - 0.5) + 0.4 * (b2 - 0.5), 0, 1))
    galets = N.mel(galets, N.hexa(0xd0cbc0), N.lisse(0.72, 0.82, g2) * 0.55)
    galets = N.mel(galets, N.hexa(0x4c4842), N.lisse(0.3, 0.2, g2) * 0.45)
    mouille = N.mel(N.hexa(0x5a5650), N.hexa(0x6f6a60), np.clip(b2, 0, 1)) * (0.92 + 0.16 * (fin - 0.5))[..., None]
    coul = N.mel(mouille, galets, N.lisse(0.08, 0.2, h + (b3 - 0.5) * 0.06))
    herbe = N.mel(N.hexa(0x7e7656), N.hexa(0xa39a72), np.clip(0.2 + 0.7 * b2, 0, 1)) * (0.86 + 0.28 * (fin - 0.5))[..., None]
    coul = N.mel(coul, herbe, N.lisse(0.55, 0.72, b1 + (h - 0.3) * 0.8) * N.lisse(0.25, 0.35, h) * 0.85)
    algues = N.lisse(0.62, 0.7, b3) * N.lisse(0.22, 0.12, np.abs(h - 0.12))
    coul = N.mel(coul, N.hexa(0x3e4a32), algues * 0.7)
    clair = N.mel(N.hexa(0xa39d91), N.hexa(0xb7b1a5), np.clip(g1, 0, 1))
    coul = N.mel(coul, clair, N.lisse(0.2, 0.1, piste + (fin - 0.5) * 0.08) * N.lisse(0.16, 0.24, h) * 0.38)
    relief = np.clip(0.5 + 0.35 * (g1 - 0.5) + 0.15 * (fin - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_cimetiere", tx_sol_cimetiere, 2 * R_SOL, 0.6, 0.95)


# --- les pièces ---
def griser(W):
    """Les épaves de cette île sont blanchies, grises : on change le bois de la maille W."""
    W.mats = [{"bois_epave": "bois_gris", "bois_epave_sombre": "bois_gris_sombre", "planches": "bois_gris", "planches_sombres": "bois_gris_sombre", "planches_claires": "bois_gris", "pont": "bois_gris"}.get(m, m) for m in W.mats]
    return W


def epave_couchee(L, rng, x, y, z, cap, lg=2.6, larg=0.9, roule=0.5, leger=False):
    W = N.Maille("epave")
    Am.epave(W, rng, np.eye(4), lg, larg, 0.45, 0.12, leger)
    A.fondre(L, griser(W), T(x, y, z) @ Rz(cap) @ Rx(roule))
    return Vf.rectangle(x, y, lg + 0.2, larg + 0.3, cap)


def carcasse(L, x, y, z, cap, lg=2.4, larg=1.0, nb=9):
    """Il ne reste que la quille et les côtes : des arceaux qui sortent des galets, de plus en plus courts vers les bouts,
    certains cassés."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.tube([(-lg / 2, 0, 0.02), (lg / 2, 0, 0.06), (lg / 2 + 0.2, 0, 0.35)], [0.06, 0.06, 0.04], 6, bouts=True), "bois_gris_sombre", M)
    for k in range(nb):
        t = k / (nb - 1)
        xk = -lg / 2 + 0.1 + (lg - 0.2) * t
        w = larg / 2 * math.sin(PI * (0.12 + 0.76 * t)) ** 0.6
        h = 0.55 + 0.3 * math.sin(PI * t)
        casse = 0.45 if k % 3 == 1 else 1.0
        for s in (-1, 1):
            if k % 4 == 3 and s > 0:
                continue
            pts = [(xk, 0, 0.0), (xk, s * w * 0.75, h * 0.25), (xk, s * w, h * 0.6), (xk, s * w * 0.95, h)]
            pts = pts[: 2 + int(round(2 * casse))]
            L.ajouter(*N.tube(pts, 0.035, 4, bouts=True), "bois_gris", M)
    return Vf.rectangle(x, y, lg + 0.4, larg + 0.2, cap)


def proue_dressee(L, x, y, z, cap):
    """Une proue entière qui sort des galets, dressée vers le ciel, sa figure sculptée (un poisson aux nageoires dorées)."""
    M = T(x, y, z) @ Rz(cap) @ Ry(-0.95)
    W = N.Maille("proue")
    P.coque(W, np.eye(4), 1.6, 0.8, 0.4, "bois_gris", 6, pont=None, franc=0.12, dedans="bois_gris_sombre")
    A.fondre(L, griser(W), M @ T(0.55, 0, 0))
    L.ajouter(*N.tube([(1.35, 0, 0.1), (1.7, 0, 0.35), (1.9, 0, 0.62)], [0.06, 0.045, 0.03], 6), "bois_gris_sombre", M)
    v, f = N.sphere(0.2, 10, 7, 1.0)
    L.ajouter([(a * 1.6, b * 0.55, c * 0.8) for a, b, c in v], f, "bois_gris", M @ T(1.42, 0, 0.25), doux=True)
    L.ajouter(*N.cylindre(0.14, 0.0, 0.2, 6), "or", M @ T(1.12, 0, 0.25) @ Ry(-PI / 2))
    for s in (-1, 1):
        L.ajouter([(0, 0, 0), (0.18, s * 0.02, 0.0), (0.06, s * 0.16, -0.08)], [(0, 1, 2), (2, 1, 0)], "or", M @ T(1.4, s * 0.08, 0.2))
    return Vf.rond(x, y, 0.75, 10)


def mat_brise(L, x, y, z, cap, h=1.6, penche=0.35):
    """Un mât brisé qui sort de l'eau ou des galets, penché, sa vergue de travers, un bout de cordage."""
    M = T(x, y, z - 0.3) @ Rz(cap) @ Ry(penche)
    L.ajouter(*N.cylindre(0.06, 0.045, h, 7, haut=False), "bois_gris_sombre", M)
    L.ajouter(*N.cylindre(0.045, 0.0, 0.12, 7, haut=False), "bois_gris", M @ T(0, 0, h) @ Ry(0.5))
    L.ajouter(*N.poutre((-0.45, 0.0, h * 0.7), (0.4, 0.05, h * 0.62), 0.035), "bois_gris_sombre", M)
    L.ajouter(*N.tube([(0.4, 0.05, h * 0.62), (0.5, 0.1, h * 0.35), (0.42, 0.12, 0.05)], 0.008, 3, bouts=False), "corde_arbre", M)


def tombe(L, rng, x, y, z, genre):
    """Une tombe de marin : une rame en croix, une croix de planches, une roue de gouvernail sur son pieu, une petite ancre
    plantée ; un tas de galets au pied."""
    for k in range(5):
        a = k * 1.3 + rng.random()
        L.ajouter(*N.sphere(0.05 + 0.02 * rng.random(), 5, 3, 0.7), "pierre_grise", T(x + math.cos(a) * 0.08, y + math.sin(a) * 0.08, z + 0.01))
    pench = (rng.random() - 0.5) * 0.25
    M = T(x, y, z) @ Rz(rng.random() * 0.4 - 0.2) @ Rx(pench)
    if genre == 0:  # une rame en croix
        L.ajouter(*N.boite(0.035, 0.035, 0.6), "bois_gris", M @ T(0, 0, -0.1))
        L.ajouter(*N.boite(0.07, 0.015, 0.16), "bois_gris", M @ T(0, 0, 0.36))
        L.ajouter(*N.boite(0.3, 0.03, 0.03), "bois_gris", M @ T(0, 0, 0.32))
    elif genre == 1:  # une croix de planches
        L.ajouter(*N.boite(0.07, 0.03, 0.55), "bois_gris_sombre", M @ T(0, 0, -0.08))
        L.ajouter(*N.boite(0.28, 0.03, 0.06), "bois_gris_sombre", M @ T(0, 0, 0.3))
    elif genre == 2:  # une roue de gouvernail sur son pieu
        L.ajouter(*N.boite(0.04, 0.04, 0.42), "bois_gris_sombre", M @ T(0, 0, -0.08))
        Mr = M @ T(0, 0, 0.42) @ Rx(PI / 2)
        L.ajouter(*N.tube([(math.cos(a) * 0.13, math.sin(a) * 0.13, 0) for a in np.linspace(0, 2 * PI, 11)], 0.014, 4, bouts=False), "bois_gris", Mr)
        for k in range(4):
            a = k * PI / 4
            L.ajouter(*N.poutre((math.cos(a) * 0.18, math.sin(a) * 0.18, 0), (-math.cos(a) * 0.18, -math.sin(a) * 0.18, 0), 0.012), "bois_gris", Mr)
    else:  # une petite ancre plantée
        L.ajouter(*N.tube([(0, 0, -0.05), (0, 0, 0.42)], 0.022, 5), "fer_rouille", M)
        L.ajouter(*N.poutre((0, -0.12, 0.36), (0, 0.12, 0.36), 0.02), "fer_rouille", M)
        L.ajouter(*N.tube([(-0.16, 0, 0.12), (-0.1, 0, 0.0), (0, 0, -0.02), (0.1, 0, 0.0), (0.16, 0, 0.12)], 0.018, 4), "fer_rouille", M)


def lanterne_verte(L, U, x, y, z, h=0.8):
    """Une lanterne verte au bout de son piquet courbé (la nuit, elle fait une flaque de lumière verte)."""
    L.ajouter(*N.tube([(x, y, z - 0.08), (x, y, z + h), (x + 0.14, y, z + h + 0.06)], [0.022, 0.018, 0.014], 5, bouts=False), "bois_gris_sombre")
    L.ajouter(*N.cylindre(0.06, 0.0, 0.05, 6), "fer", T(x + 0.16, y, z + h - 0.05))
    L.ajouter(*N.cylindre(0.05, 0.05, 0.02, 6), "fer", T(x + 0.16, y, z + h - 0.24))
    U.ajouter(*N.cylindre(0.042, 0.042, 0.17, 6), "spectre", T(x + 0.16, y, z + h - 0.22))


def nef(L, V, U, rng, x, y, cap):
    """La Nef : une grande coque retournée sur un muret de galets, la quille en l'air. Le gardien en a fait sa maison :
    une porte et une lanterne dans le tableau arrière, deux fenêtres dans le bordé, un tuyau de poêle qui fume, une
    échelle appuyée. Renvoie (son emprise, le haut du tuyau, le pas de sa porte)."""
    lg, larg, creux = 3.0, 1.5, 0.75
    z = sol(x, y)
    mur = 0.2  # la coque repose sur un muret de galets ronds de cette hauteur
    M = T(x, y, z + mur + 0.12) @ Rz(cap) @ Rx(PI)  # la coque à l'envers : sa quille en haut
    W = N.Maille("nef")
    P.coque(W, np.eye(4), lg, larg, creux, "bois_gris", 9, pont=None, franc=0.12, dedans="bois_gris_sombre")
    A.fondre(L, griser(W), M)
    Mh = T(x, y, z) @ Rz(cap)
    # la quille, en l'air, qui file d'un bout à l'autre ; l'étrave qui redescend jusqu'au sol (on reconnaît la coque)
    quille = [(-lg / 2 + lg * i / 9, 0.0, mur + 0.12 + creux * (0.75 if 0 < i < 9 else 0.3) + 0.05) for i in range(10)]
    quille += [(lg / 2 + 0.14, 0.0, mur + 0.2), (lg / 2 + 0.18, 0.0, -0.05)]
    L.ajouter(*N.tube(quille, 0.06, 5, bouts=True), "bois_gris_sombre", Mh)
    for i in range(1, 9, 2):  # des membrures qui dépassent du bordé arraché
        xm = -lg / 2 + lg * i / 9
        L.ajouter(*N.tube([(xm, -larg * 0.52, mur + 0.1), (xm, -larg * 0.43, mur + 0.12 + creux * 0.3), (xm, -larg * 0.2, mur + 0.12 + creux * 0.62)], 0.025, 4, bouts=True), "bois_gris_sombre", Mh)
    # le muret : des galets ronds tout le long du bord de la coque (plus de bloc de pierre), sauf devant la porte
    L.ajouter(*N.polygone([(math.cos(t) * lg * 0.43, math.sin(t) * larg * 0.41) for t in np.linspace(0, 2 * PI, 20, endpoint=False)], -0.1, mur + 0.02), "pierre_grise", Mh)
    for k in range(40):  # serrés, de toutes les tailles, pas tous alignés (un vrai muret de pierres sèches)
        t = 2 * PI * (k + 0.4 * rng.random()) / 40
        if math.cos(t) < -0.85:
            continue
        r_g = 0.08 + 0.07 * rng.random()
        e = 0.45 + 0.05 * rng.random()
        L.ajouter(*N.sphere(r_g, 6, 4, 0.6 + 0.25 * rng.random()), "pierre_grise", Mh @ T(math.cos(t) * lg * e, math.sin(t) * larg * e, r_g * 0.55) @ Rz(rng.random() * PI))
    # la porte, une fenêtre (allumée la nuit) et la lanterne, dans le tableau arrière (la poupe : -x local)
    L.ajouter(*N.quad((-lg / 2 - 0.012, 0.13, 0.12), (-lg / 2 - 0.012, -0.13, 0.12), (-lg / 2 - 0.012, -0.13, 0.6), (-lg / 2 - 0.012, 0.13, 0.6)), "porte", Mh)
    Mt = Mh @ T(-lg / 2 - 0.012, 0, 0) @ Rz(-PI / 2)
    P.fenetre(L, V, rng, Mt, -0.33, 0.38, 0.16, 0.16, allumee=True)
    q = Mh @ np.array((-lg / 2 - 0.1, -0.3, 0.78, 1.0))
    A.lanterne(L, U, tuple(q[:3]), True, 0.08)
    tuyau = Mh @ np.array((0.6, 0.0, 0.0, 1.0))
    L.ajouter(*N.cylindre(0.05, 0.05, 1.5, 7), "fer", T(tuyau[0], tuyau[1], z + 0.4))
    L.ajouter(*N.cylindre(0.09, 0.0, 0.07, 7), "fer", T(tuyau[0], tuyau[1], z + 1.9))
    pas_porte = Mh @ np.array((-lg / 2 - 0.42, 0.0, 0.0, 1.0))
    return Vf.rectangle(x, y, lg + 0.25, larg + 0.15, cap), (float(tuyau[0]), float(tuyau[1]), float(z + 2.05)), (float(pas_porte[0]), float(pas_porte[1]))


def navire_gris(L, U, x, y, cap, leger=False):
    """Le Navire Gris : un trois-mâts entier, à l'ancre, tout gris ; ses voiles pendent en lambeaux, ses lanternes vertes
    sont allumées, et il n'y a personne à bord."""
    lg, larg, creux, franc = 3.6, 1.1, 0.55, 0.3
    M = T(x, y, 0.0) @ Rz(cap)
    W = N.Maille("gris")
    sec = P.coque(W, np.eye(4), lg, larg, creux, "bois_gris_sombre", 10, pont="bois_gris", franc=franc)
    A.fondre(L, W, M)
    for s in (0, 4):  # le plat-bord
        L.ajouter(*N.tube([sec[i][s] for i in range(1, 11)], 0.025, 4, bouts=True), "bois_gris", M)
    L.ajouter(*N.boite(0.8, larg * 0.82, 0.32), "bois_gris_sombre", M @ T(-lg / 2 + 0.42, 0, franc + 0.05))  # le château arrière
    L.ajouter(*N.boite(0.85, larg * 0.86, 0.04), "bois_gris", M @ T(-lg / 2 + 0.42, 0, franc + 0.37))
    L.ajouter(*N.tube([(lg / 2 - 0.05, 0, franc + 0.2), (lg / 2 + 0.75, 0, franc + 0.55)], [0.045, 0.025], 6, bouts=True), "bois_gris_sombre", M)  # le beaupré
    mats_ = ((lg * 0.28, 2.1), (lg * -0.02, 2.5), (lg * -0.3, 1.8))
    for k, (mx, h) in enumerate(mats_):
        L.ajouter(*N.cylindre(0.055, 0.035, h, 7), "bois_gris_sombre", M @ T(mx, 0, franc - 0.1))
        for j, (zv, lv) in enumerate(((0.45, 0.62), (0.78, 0.48))):
            if leger and j:
                continue
            zz = franc + h * zv
            L.ajouter(*N.poutre((mx, -lv, zz), (mx, lv, zz), 0.025), "bois_gris_sombre", M)
            # la voile en lambeaux : des bandes qui pendent, de longueurs inégales, déchirées
            nb = 5
            for b in range(nb):
                y0, y1 = -lv * 0.92 + 1.84 * lv * b / nb, -lv * 0.92 + 1.84 * lv * (b + 1) / nb - 0.02
                long_ = h * 0.26 * (0.35 + 0.65 * ((b * 7 + k * 3 + j * 5) % 5) / 4)
                bas = zz - long_
                L.ajouter([(mx + 0.02, y0, zz - 0.02), (mx + 0.02, y1, zz - 0.02), (mx + 0.05, y1, bas + 0.04 * (b % 2)), (mx + 0.05, y0, bas)], [(0, 1, 2, 3), (3, 2, 1, 0)], "voile_grise", M)
        for s in (-1, 1):  # les haubans
            L.ajouter(*N.poutre((mx, s * larg * 0.48, franc + 0.05), (mx, 0, franc + h * 0.85), 0.008), "corde_arbre", M)
    for (lx_, ly_) in ((-lg / 2 + 0.05, 0.3), (-lg / 2 + 0.05, -0.3), (lg / 2 - 0.25, 0.0)):  # les lanternes vertes
        q = M @ np.array((lx_, ly_, franc + 0.5, 1.0))
        L.ajouter(*N.cylindre(0.05, 0.0, 0.05, 6), "fer", T(q[0], q[1], q[2] + 0.12))
        U.ajouter(*N.cylindre(0.042, 0.042, 0.14, 6), "spectre", T(q[0], q[1], q[2] - 0.02))
        U.ajouter(*N.sphere(0.03, 10, 7), "spectre", T(q[0], q[1], q[2] + 0.05))  # (caché dedans : le site garde ses lumières, même au téléphone)
    for k in range(10 if not leger else 5):  # la chaîne de l'ancre, qui plonge
        t = k / 9
        q = M @ np.array((lg / 2 - 0.3 + 0.6 * t, 0.35 + 0.1 * t, franc - 0.05 - 0.45 * t, 1.0))
        L.ajouter(*N.sphere(0.03, 5, 3), "fer_rouille", T(*q[:3]))
    return Vf.rectangle(x, y, lg + 1.0, larg + 0.3, cap)


def mat_signal(L, U, lots, x, y, z, h=3.4):
    """Le Mât-Signal : trois mâts de navires perdus, plantés en faisceau et liés en haut ; des vergues en travers, des
    lanternes vertes pendues aux bouts, une vigie de planches, un lambeau de pavillon gris qui claque (un objet à part)."""
    haut = (x, y, z + h)
    pieds = [(x + math.cos(a) * 0.55, y + math.sin(a) * 0.55, z - 0.1) for a in (0.3, 2.4, 4.5)]
    for p in pieds:
        L.ajouter(*N.tube([p, ((p[0] + x) / 2, (p[1] + y) / 2, z + h * 0.5), (x + (p[0] - x) * 0.05, y + (p[1] - y) * 0.05, z + h + 0.25)], [0.07, 0.055, 0.04], 7, bouts=True), "bois_gris_sombre")
        L.ajouter(*N.sphere(0.12, 6, 4, 0.6), "pierre_grise", T(p[0], p[1], p[2] + 0.08))
    for k in range(4):  # le cordage qui les lie
        L.ajouter(*N.tube([(x + math.cos(a) * (0.09 + 0.01 * k), y + math.sin(a) * (0.09 + 0.01 * k), z + h - 0.15 + 0.05 * k) for a in np.linspace(0, 2 * PI, 9)], 0.012, 3, bouts=False), "corde_arbre")
    L.ajouter(*N.cylindre(0.38, 0.38, 0.05, 10), "bois_gris", T(x, y, z + h * 0.62))  # la vigie
    for k in range(10):
        a = k * 2 * PI / 10
        L.ajouter(*N.boite(0.03, 0.03, 0.22), "bois_gris_sombre", T(x + math.cos(a) * 0.36, y + math.sin(a) * 0.36, z + h * 0.62 + 0.05))
    for j, (zv, lv, cap) in enumerate(((0.82, 0.95, 0.4), (0.45, 0.75, 1.9))):
        zz = z + h * zv
        dx, dy = math.cos(cap) * lv, math.sin(cap) * lv
        L.ajouter(*N.poutre((x - dx, y - dy, zz), (x + dx, y + dy, zz + 0.05), 0.04), "bois_gris_sombre")
        for s_ in (-1, 1):
            qx, qy = x + s_ * dx * 0.96, y + s_ * dy * 0.96
            L.ajouter(*N.poutre((qx, qy, zz), (qx, qy, zz - 0.18), 0.01), "fer")
            L.ajouter(*N.cylindre(0.05, 0.0, 0.05, 6), "fer", T(qx, qy, zz - 0.2))
            U.ajouter(*N.cylindre(0.042, 0.042, 0.15, 6), "spectre", T(qx, qy, zz - 0.36))
    F = N.Maille("lambeau")
    v, f = [], []
    for k in range(4):
        t = k / 3
        v += [(0.03 + 0.5 * t, 0.02 * math.sin(t * 4), 0.0), (0.03 + 0.42 * t, 0.02 * math.sin(t * 4), -0.28 + 0.1 * t * (k % 2))]
    for k in range(3):
        f += [(k * 2, k * 2 + 2, k * 2 + 3, k * 2 + 1), (k * 2 + 1, k * 2 + 3, k * 2 + 2, k * 2)]
    F.ajouter(v, f, "voile_grise")
    lots["animes"].append((F, (x, y, z + h + 0.2), {"anim": "drapeau", "ampl": 0.2, "vitesse": 1.2, "phase": 1.1}))
    return Vf.rond(x, y, 0.75, 10)


def arbre_mort(L, rng, x, y, z, h=1.4):
    """Un arbre mort, gris, ses branches nues tordues."""
    tronc = [(x, y, z - 0.1), (x + 0.05, y - 0.03, z + h * 0.45), (x - 0.04, y + 0.05, z + h * 0.8), (x + 0.02, y + 0.02, z + h)]
    L.ajouter(*N.tube(tronc, [0.09, 0.07, 0.045, 0.02], 6, bouts=False), "bois_gris_sombre")
    for k in range(5):
        a = rng.random() * 6.28
        p0 = tronc[1 + k % 3]
        lg = h * (0.25 + 0.2 * rng.random())
        p1 = (p0[0] + math.cos(a) * lg * 0.6, p0[1] + math.sin(a) * lg * 0.6, p0[2] + lg * 0.5)
        p2 = (p1[0] + math.cos(a + 0.6) * lg * 0.4, p1[1] + math.sin(a + 0.6) * lg * 0.4, p1[2] + lg * 0.15)
        L.ajouter(*N.tube([p0, p1, p2], [0.03, 0.018, 0.006], 4, bouts=False), "bois_gris_sombre")


def mailles(graine=811, leger=False):
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
    P.CHEMINEES.clear()

    quai_mer, quai_terre = vers(-90, -1.7), vers(-90, 0.8)
    porte = (NEF[0] + math.cos(CAP_NEF + PI) * 1.92, NEF[1] + math.sin(CAP_NEF + PI) * 1.92)
    tournee = [quai_terre, (0.0, -4.4), (0.4, -2.6), (CIMETIERE[0] - 0.2, CIMETIERE[1] - 1.75), (CIMETIERE[0] - 0.2, CIMETIERE[1] + 1.0), (CIMETIERE[0] - 1.4, CIMETIERE[1] + 1.55), (-1.6, 2.4), (-3.2, 2.2), (-4.1, 1.1), (porte[0] - 0.05, porte[1] + 0.3)]
    vers_nef = [(0.4, -2.6), (-1.1, -1.7), (porte[0] + 0.25, porte[1] - 0.35)]
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (tournee, vers_nef)]
    couloirs = [(pts, 0.14) for pts in PISTES]
    loin = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=0.12):
        if terrain(x, y) < bas or not loin(x, y, r):
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
    L.ajouter(sommets, faces, "sol_cimetiere", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)

    etape("le ponton")
    # --- le vieux ponton : des planches qui manquent, des pieux de travers ; la bannière ---
    lg = quai_terre[1] - quai_mer[1]
    nb_t = 7
    for k in range(nb_t):
        if k in (2, 5):
            continue  # des planches qui manquent
        a_ = (quai_mer[0], quai_mer[1] + lg * k / nb_t)
        b_ = (quai_mer[0], quai_mer[1] + lg * (k + 1) / nb_t - 0.03)
        Rf.tablier(L, a_, b_, ZQ - 0.02 * (k % 2), ZQ, 0.5, 0.05, "bois_gris")
    for k in (2, 5):  # là où il manque des planches : les deux longerons restent
        for s in (-1, 1):
            L.ajouter(*N.poutre((quai_mer[0] + s * 0.2, quai_mer[1] + lg * k / nb_t, ZQ - 0.06), (quai_mer[0] + s * 0.2, quai_mer[1] + lg * (k + 1) / nb_t, ZQ - 0.06), 0.05), "bois_gris_sombre")
    for t in (0.1, 0.42, 0.74):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.045, 0.035, ZQ + 1.0, 6, haut=False), "bois_gris_sombre", T(quai_mer[0] + s * 0.22, quai_mer[1] + lg * t, -1.0) @ Ry(s * 0.06))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.5, PI / 2)
    emprises.append(("le ponton", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.34, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    lanterne_verte(L, U, quai_mer[0] - 0.17, quai_mer[1] + 0.12, ZQ, 0.75)  # au bout du ponton

    etape("la Nef")
    emp, haut_tuyau, pas_porte = nef(L, V, U, rng, NEF[0], NEF[1], CAP_NEF)
    SOL.append(("decor", "la Nef", emp))
    P.CHEMINEES.append(haut_tuyau)
    # le bois de chauffage contre la Nef, un établi, des filets qui sèchent
    xb, yb = NEF[0] + math.cos(CAP_NEF + PI / 2) * 1.05, NEF[1] + math.sin(CAP_NEF + PI / 2) * 1.05
    if libre(xb, yb, 0.25):
        for k in range(6):
            L.ajouter(*N.cylindre(0.05, 0.05, 0.5, 6), "bois_gris", T(xb + (k % 3 - 1) * 0.1, yb, sol(xb, yb) + 0.05 + 0.09 * (k // 3)) @ Rz(CAP_NEF) @ Ry(PI / 2) @ T(0, 0, -0.25))
        SOL.append(("decor", "le bois de chauffage", Vf.rond(xb, yb, 0.28)))

    etape("le cimetière")
    # --- le cimetière des marins : des rangées de tombes, les lanternes vertes aux coins, une grande ancre au milieu ---
    cx, cy = CIMETIERE
    rangees = 3 if leger else 4
    for r_ in range(rangees):
        for k in range(5 if not leger else 3):
            x = cx + 0.25 + 0.42 * k * (1 if not leger else 1.4)
            y = cy - 1.1 + 0.62 * r_
            if libre(x, y, 0.12):
                tombe(L, rng, x, y, sol(x, y), (k + r_ * 2) % 4)
                SOL.append(("decor", "une tombe", Vf.rond(x, y, 0.12)))
    for (dx_, dy_) in ((0.12, -1.45), (2.2, -1.45), (0.12, 1.15), (2.2, 1.15)):
        x, y = cx + dx_, cy + dy_
        if libre(x, y, 0.07):
            lanterne_verte(L, U, x, y, sol(x, y))
            SOL.append(("decor", "une lanterne verte", Vf.rond(x, y, 0.07)))
    xa_, ya_ = cx + 1.2, cy + 1.75
    if libre(xa_, ya_, 0.5):
        terrain_ambre = Am.sol
        Am.sol = terrain
        try:
            Am.ancre(L, xa_, ya_, 0.7, 0.25, 0.3, True, 1.2)
        finally:
            Am.sol = terrain_ambre
        SOL.append(("decor", "la grande ancre", Vf.rond(xa_, ya_, 0.5)))

    etape("les épaves")
    cote_gris = CAP_GRIS - PI / 2  # le flanc du large
    trajet_passeur = [(quai_mer[0] + 0.6, quai_mer[1] + 0.4, 0.0), (1.8, -8.6, 0.0), (4.0, -8.4, 0.0), (NAVIRE_GRIS[0] + math.cos(cote_gris) * 0.9, NAVIRE_GRIS[1] + math.sin(cote_gris) * 0.9, 0.0)]
    au_large = lambda x, y, r: K.distance_au_trajet(x, y, trajet_passeur) > r and math.hypot(x - NAVIRE_GRIS[0], y - NAVIRE_GRIS[1]) > 2.6  # (ni sur la route du passeur, ni contre le Navire Gris)
    # --- les épaves de la grève : deux coques couchées, la carcasse, la proue dressée, des mâts brisés dans les chenaux ---
    for (x, y, cap, lg_, roule) in ((-4.6, -2.3, 0.5, 3.4, 0.5), (3.7, 3.4, 2.4, 3.0, -0.48), (-4.7, 0.7, 1.9, 2.6, 0.4), (2.7, -3.5, 0.9, 2.6, -0.45), (-2.6, -4.4, 2.8, 2.4, 0.5), (2.2, 5.5, 0.2, 2.6, 0.42))[: 3 if leger else 6]:
        if libre(x, y, 0.8, 0.0):
            SOL.append(("decor", "une coque couchée", epave_couchee(L, rng, x, y, sol(x, y) - 0.1, cap, lg_, 1.0 + 0.1 * (lg_ > 3), roule, leger)))
    x, y = -2.3, 4.6
    if libre(x, y, 1.0, -0.4):
        SOL.append(("decor", "la carcasse", carcasse(L, x, y, max(sol(x, y), -0.25) - 0.05, 0.9, 3.0, 1.15, 7 if leger else 9)))
    x, y = 0.1, 3.6
    if libre(x, y, 0.6, 0.05):
        SOL.append(("decor", "le Mât-Signal", mat_signal(L, U, lots, x, y, sol(x, y))))
    x, y = 4.7, 0.9
    if libre(x, y, 0.75, 0.05):
        SOL.append(("decor", "la proue dressée", proue_dressee(L, x, y, sol(x, y) - 0.1, math.radians(200))))
    mats_ = [(-5.2, 3.0, 0.4), (-3.6, 3.6, 2.2), (5.4, -0.3, 1.2), (4.2, -1.3, 3.0), (-0.7, 6.0, 0.9), (2.2, -6.6, 2.0), (-3.2, -6.0, 1.4)]
    mats_ += [(math.cos(a) * d, math.sin(a) * d, a * 3.1) for a, d in ((0.3, 8.6), (1.2, 8.9), (2.0, 8.4), (2.7, 9.0), (3.5, 8.7), (4.3, 9.1), (5.6, 8.8))]
    for k, (x, y, cap) in enumerate(mats_[: 6 if leger else 14]):
        if au_large(x, y, 0.9):
            mat_brise(L, x, y, min(sol(x, y), -0.05), cap, 1.2 + 0.5 * (k % 3) / 2, 0.25 + 0.15 * (k % 2))
    # à moitié coulées, tout autour de l'île : des coques dont on ne voit que le flanc et le plat-bord
    for k, (a, d, cap, roule) in enumerate(((0.7, 8.3, 2.0, 0.9), (1.75, 8.6, 0.4, -0.8), (2.45, 8.4, 3.9, 0.7), (3.3, 8.8, 1.1, -0.9), (4.0, 8.1, 5.6, 0.8), (4.45, 8.6, 2.6, -0.75))[: 3 if leger else 6]):
        x, y = math.cos(a) * d, math.sin(a) * d
        if au_large(x, y, 2.0):
            epave_couchee(L, rng, x, y, -0.18, cap, 2.6 + 0.4 * (k % 2), 0.95, roule * 0.65, True)
    for k in range(5 if leger else 9):  # des arbres morts
        x, y = vers(rng.random() * 360, 1.6 + rng.random() * 2.2)
        if libre(x, y, 0.35, 0.18):
            arbre_mort(L, rng, x, y, sol(x, y), 1.2 + 0.5 * rng.random())
            SOL.append(("arbre", "un arbre mort", Vf.rond(x, y, 0.15)))
    for k in range(8 if leger else 16):  # des rochers gris
        x, y = vers(rng.random() * 360, 0.1 + rng.random() * 1.4)
        if libre(x, y, 0.2, -0.1):
            A.rocher(L, rng, x, y, sol(x, y) - 0.06, 0.14 + 0.18 * rng.random(), "pierre_grise")
            SOL.append(("rocher", "un rocher", Vf.rond(x, y, 0.16)))
    for k in range(10 if leger else 20):  # des tonneaux, des caisses, des planches que la mer a rendus
        x, y = vers(rng.random() * 360, 0.3 + rng.random() * 1.6)
        if libre(x, y, 0.12, 0.05):
            zz = sol(x, y)
            if k % 3 == 0:
                P.tonneau(L, T(x, y, zz - 0.03) @ Rz(rng.random() * 6) @ Rx(PI / 2 * (k % 2)) @ T(0, 0, -0.09 * (k % 2)), 0.08, 0.2)
            elif k % 3 == 1:
                P.caisse(L, T(x, y, zz - 0.04) @ Rz(rng.random() * 6) @ Rx(0.3), 0.18, "bois_gris")
            else:
                L.ajouter(*N.poutre((x - 0.3, y, zz + 0.02), (x + 0.3, y + 0.1, zz + 0.04), 0.06, 0.025), "bois_gris")
            SOL.append(("rocher", "une épave rendue par la mer", Vf.rond(x, y, 0.12)))

    etape("le coin du gardien")
    # --- au milieu de la grève : le feu du gardien (sa marmite, son banc), le canot qu'il répare sur deux tréteaux ---
    rng2 = random.Random(graine + 77)  # (à part : le reste de l'île ne bouge pas)
    feu = (0.15, 1.0)
    if libre(feu[0], feu[1], 0.32):
        zf = sol(*feu)
        for k in range(8):
            a = k * 2 * PI / 8
            L.ajouter(*N.sphere(0.06, 5, 3, 0.8), "pierre_grise", T(feu[0] + math.cos(a) * 0.19, feu[1] + math.sin(a) * 0.19, zf + 0.02))
        for k in range(3):
            a = k * PI / 3 + 0.3
            L.ajouter(*N.poutre((feu[0] - math.cos(a) * 0.14, feu[1] - math.sin(a) * 0.14, zf + 0.04), (feu[0] + math.cos(a) * 0.14, feu[1] + math.sin(a) * 0.14, zf + 0.08), 0.032), "bois_gris_sombre")
        U.ajouter(*N.sphere(0.06, 6, 4, 1.5), "feu", T(feu[0], feu[1], zf + 0.12))
        for k in range(3):  # le trépied de fer et la marmite pendue
            a = k * 2 * PI / 3 + 0.5
            L.ajouter(*N.poutre((feu[0] + math.cos(a) * 0.27, feu[1] + math.sin(a) * 0.27, zf), (feu[0], feu[1], zf + 0.6), 0.014), "fer")
        L.ajouter(*N.cylindre(0.004, 0.004, 0.18, 3, haut=False), "fer", T(feu[0], feu[1], zf + 0.41))
        L.ajouter(*N.cylindre(0.1, 0.085, 0.12, 10, haut=False, bas=True), "fer", T(feu[0], feu[1], zf + 0.29))
        P.CHEMINEES.append((feu[0], feu[1], zf + 0.48))  # (sa fumée monte avec celle de la Nef)
        SOL.append(("decor", "le feu du gardien", Vf.rond(feu[0], feu[1], 0.32)))
        xb_, yb_ = feu[0] + 0.06, feu[1] - 0.58  # son banc : une bûche sur deux pierres
        if libre(xb_, yb_, 0.3):
            zb_ = sol(xb_, yb_)
            for sx in (-1, 1):
                L.ajouter(*N.sphere(0.075, 5, 3, 0.9), "pierre_grise", T(xb_ + sx * 0.24, yb_, zb_ + 0.03))
            L.ajouter(*N.cylindre(0.065, 0.065, 0.66, 7), "bois_gris", T(xb_ - 0.33, yb_, zb_ + 0.15) @ Ry(PI / 2))
            SOL.append(("decor", "le banc du gardien", Vf.rectangle(xb_, yb_, 0.7, 0.2, 0.0)))
    canot, cap_c = (-0.35, -0.55), math.radians(-25)
    if libre(canot[0], canot[1], 0.55):
        zc = sol(*canot)
        Mc = T(canot[0], canot[1], zc) @ Rz(cap_c)
        for xt in (-0.36, 0.36):  # les deux tréteaux
            L.ajouter(*N.poutre((xt, -0.24, 0.39), (xt, 0.24, 0.39), 0.03), "bois_gris_sombre", Mc)
            for sy in (-1, 1):
                for sx in (-1, 1):
                    L.ajouter(*N.poutre((xt + sx * 0.08, sy * 0.3, -0.02), (xt, sy * 0.2, 0.38), 0.018), "bois_gris_sombre", Mc)
        Cn = N.Maille("canot")
        P.barque(Cn, rng2, 0.0, 0.0, 0.0, 1.3)
        Cn.mats = ["bois_gris" if m in ("planches", "peint_bleu", "peint_rouge", "planches_claires") else m for m in Cn.mats]
        A.fondre(L, griser(Cn), Mc @ T(0, 0, 0.49) @ Rx(PI))  # retourné : la quille en haut
        P.caisse(L, Mc @ T(0.25, -0.62, 0.0) @ Rz(0.5), 0.17, "bois_gris")  # ses outils
        P.tonneau(L, Mc @ T(-0.62, -0.5, 0.0), 0.07, 0.16)  # le pot de goudron
        SOL.append(("decor", "le canot sur ses tréteaux", Vf.rectangle(canot[0], canot[1], 1.45, 0.75, cap_c)))
        SOL.append(("decor", "les outils du gardien", Vf.rectangle(*(np.array(canot) + [math.cos(cap_c) * 0.25 + math.sin(cap_c) * 0.62, math.sin(cap_c) * 0.25 - math.cos(cap_c) * 0.62]), 0.25, 0.25, cap_c + 0.5)))
        SOL.append(("decor", "le pot de goudron", Vf.rond(*(np.array(canot) + [math.cos(cap_c) * -0.62 + math.sin(cap_c) * 0.5, math.sin(cap_c) * -0.62 - math.cos(cap_c) * 0.5]), 0.09)))
    # ce que la mer a rendu, que le gardien a tiré au sec : des tonneaux, des caisses, un rouleau de cordage, des rames
    tas = (1.0, -3.3)
    if libre(tas[0], tas[1], 0.5):
        zt_ = sol(*tas)
        Mt_ = T(tas[0], tas[1], zt_) @ Rz(0.4)
        P.tonneau(L, Mt_ @ T(-0.22, 0.12, -0.02), 0.09, 0.22)
        P.tonneau(L, Mt_ @ T(-0.02, 0.24, 0.06) @ Rx(PI / 2) @ T(0, 0, -0.11), 0.09, 0.22)  # couché
        P.caisse(L, Mt_ @ T(0.2, -0.08, -0.03) @ Rz(0.3), 0.22, "bois_gris")
        P.caisse(L, Mt_ @ T(0.22, -0.06, 0.18) @ Rz(0.9), 0.16, "bois_gris")
        L.ajouter(*N.tube([(-0.05 + math.cos(t) * 0.13, -0.24 + math.sin(t) * 0.13, 0.04) for t in np.linspace(0, 2 * PI, 13)], 0.035, 5, bouts=False), "corde", Mt_)
        L.ajouter(*N.tube([(-0.05 + math.cos(t) * 0.08, -0.24 + math.sin(t) * 0.08, 0.1) for t in np.linspace(0, 2 * PI, 11)], 0.03, 5, bouts=False), "corde", Mt_)
        for k, dx in enumerate((0.38, 0.46)):  # deux rames appuyées
            L.ajouter(*N.poutre((dx, 0.3, 0.0), (dx - 0.1, 0.05 + 0.05 * k, 0.75), 0.022), "bois_gris", Mt_)
            L.ajouter(*N.boite(0.035, 0.11, 0.24), "bois_gris", Mt_ @ T(dx - 0.01, 0.27, 0.12) @ Rx(-0.3))
        SOL.append(("decor", "ce que la mer a rendu", Vf.rond(tas[0], tas[1], 0.5)))
    # la cloche du passeur, au bout du ponton côté terre : on la sonne, et il vient vous chercher en barque
    xc_, yc_ = quai_terre[0] - 0.65, quai_terre[1] + 0.45
    if libre(xc_, yc_, 0.3):
        zc_ = sol(xc_, yc_)
        for sy in (-1, 1):
            L.ajouter(*N.cylindre(0.035, 0.03, 1.0, 6, haut=True), "bois_gris_sombre", T(xc_, yc_ + sy * 0.2, zc_ - 0.05))
        L.ajouter(*N.poutre((xc_, yc_ - 0.27, zc_ + 0.93), (xc_, yc_ + 0.27, zc_ + 0.93), 0.035), "bois_gris_sombre")
        C = N.Maille("cloche")
        C.ajouter(*N.cylindre(0.008, 0.008, 0.06, 4), "fer", T(0, 0, -0.06))
        C.ajouter(*N.cylindre(0.12, 0.065, 0.18, 12, haut=True), "cuivre", T(0, 0, -0.24))
        C.ajouter(*N.cylindre(0.125, 0.125, 0.02, 12, haut=False), "cuivre", T(0, 0, -0.26))
        C.ajouter(*N.sphere(0.03, 6, 4), "fer", T(0, 0, -0.27))
        lots["animes"].append((C, (xc_, yc_, zc_ + 0.9), {"anim": "balance", "axe": [0.0, 1.0, 0.0], "ampl": 0.12, "vitesse": 0.8}))
        SOL.append(("decor", "la cloche du passeur", Vf.rectangle(xc_, yc_, 0.55, 0.2, PI / 2)))
    # des touffes d'herbe morte et des galets sur la grève du milieu
    for k in range(12 if leger else 26):
        x, y = -1.6 + 3.3 * rng2.random(), -2.6 + 5.4 * rng2.random()
        if libre(x, y, 0.1, 0.3):
            zt = sol(x, y)
            nb = 5 if leger else 7
            for j in range(nb):
                a = j * 2 * PI / nb + rng2.random() * 0.6
                L.ajouter(*N.cylindre(0.014, 0.0, 0.13 + 0.09 * rng2.random(), 3, haut=False), "herbe_morte", T(x, y, zt - 0.01) @ Rz(a) @ Ry(0.3 + 0.25 * rng2.random()))
            SOL.append(("buisson", "une touffe d'herbe morte", Vf.rond(x, y, 0.09)))
    for k in range(5 if leger else 10):
        x, y = -1.6 + 3.3 * rng2.random(), -2.6 + 5.4 * rng2.random()
        if libre(x, y, 0.14, 0.3):
            A.rocher(L, rng2, x, y, sol(x, y) - 0.05, 0.08 + 0.07 * rng2.random(), "pierre_grise")
            SOL.append(("rocher", "un galet", Vf.rond(x, y, 0.12)))

    etape("le Navire Gris")
    emprises.append(("le Navire Gris", navire_gris(L, U, NAVIRE_GRIS[0], NAVIRE_GRIS[1], CAP_GRIS, leger)))

    etape("la vie")
    # --- le gardien fait sa tournée (une lanterne à la main), le passeur rame du ponton au Navire Gris ---
    for x, y, cap in ((pas_porte[0] + 0.2, pas_porte[1] + 0.3, 0.5), (CIMETIERE[0] + 1.1, CIMETIERE[1] - 0.2, 2.6), (quai_terre[0] + 0.45, quai_terre[1] + 0.2, 1.4))[: 2 if leger else 3]:
        if libre(x, y, 0.07):
            P.passant(L, rng, x, y, angle=cap, z=sol(x, y))
            SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))
    G = N.Maille("gardien")
    P.passant(G, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=None)
    A.lanterne(G, G, (0.07, -0.07, 0.1), False, 0.1)
    G.mats = ["or" if m == "lumiere" else m for m in G.mats]  # (pas une lumière du site : elle se promène)
    chemins = [(K.suivre(tournee, sol, 0.22), False, 0.13, 0.0, 4.0), (K.suivre(vers_nef, sol, 0.22), False, 0.14, 0.5, 3.0)]
    for pts, *_ in chemins:
        for k, q in enumerate(pts):
            if bord(q[0], q[1]) < 0.8 and abs(q[0]) < 0.3:
                pts[k] = (q[0], q[1], ZQ + 0.02)
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:1] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        if k == 0:
            lots["animes"].append((G, pts[0], extras))
        else:
            lots["copies"].append((len(lots["animes"]) - 1, pts[0], extras))
    Bq = N.Maille("passeur")
    P.barque(Bq, rng, 0.0, 0.0, 0.0, 0.8)
    P.passant(Bq, rng, -0.05, 0.0, angle=0.0, z=-0.02)
    Bq.mats = ["bois_gris" if m in ("planches", "peint_bleu", "peint_rouge", "planches_claires") else m for m in Bq.mats]
    lots["animes"].append((Bq, trajet_passeur[0], {"anim": "marche", "chemin": [float(c) for p in trajet_passeur for c in p], "vitesse": 0.16, "phase": 0.2, "saut": 0.0, "pause": 5.0, "roulis": 0.05}))
    # les feux follets : des lueurs vertes au-dessus des chenaux
    hasard = random.Random(5)
    for k in range(4 if leger else 8):
        ch = CHENAUX[k % len(CHENAUX)]
        t = hasard.random()
        i = min(len(ch) - 2, int(t * (len(ch) - 1)))
        u = t * (len(ch) - 1) - i
        x = ch[i][0] + (ch[i + 1][0] - ch[i][0]) * u + (hasard.random() - 0.5) * 0.5
        y = ch[i][1] + (ch[i + 1][1] - ch[i][1]) * u + (hasard.random() - 0.5) * 0.5
        U.ajouter(*N.sphere(0.05 + 0.03 * hasard.random(), 4, 3), "spectre", T(x, y, 0.35 + 0.6 * hasard.random()))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in P.CHEMINEES for c in p], "grosseur": 0.4}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "brume", "nb": 8 if leger else 12, "rayon": 8.5, "haut": 0.5}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.6, "genre": 2}))

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
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("cimetiere-v5", (1.0, -31.0, 17.0), (0.0, 0.0, 1.0), 50), ("cimetiere-v5-nef", (-6.5, -6.0, 3.6), (-1.0, 1.0, 0.6), 45)] if rendu else []
    return K.construire("ile-cimetiere-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="cimetiere")
