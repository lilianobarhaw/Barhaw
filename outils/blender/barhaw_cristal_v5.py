# Le Jardin de Cristal, « niveau 5 » : EN CHANTIER (premier jet du 18/11 au soir ; pas encore cuit, pas sur le site).
# (Son histoire, dans le bot : « Des cristaux plus grands que le mât, qui brillent dès que la nuit tombe. »)
# L'idée : un jardin tenu, tout en symétrie. Une île de roche lilas et de pelouses menthe, en trois terrasses rondes : la
# pelouse basse, la terrasse des plates-bandes, et le piton où pousse la Grande Aiguille, une gerbe de prismes à six pans
# plus haute qu'un mât. Une allée de dalles monte tout droit du débarcadère : l'arche de cristal, le bassin miroir, deux
# volées de marches. Des bouquets de cristaux violets, roses, turquoise tout autour, et des plates-bandes de petits
# cristaux alignés comme des légumes. Les jardiniers vont et viennent. Tout est inventé.
# La nuit : chaque grand cristal a une peau de « vitre » (éteinte le jour, allumée avec les lampes, comme les fenêtres).
# RESTE À FAIRE (voir NOTES.md) : la serre, la géode fendue, l'atelier du polisseur, la pergola aux carillons, les murets,
# les buissons, plus de vie, la texture du sol à affiner, les lumières de la nuit à régler (nuit-ile.py), la version téléphone.
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_givre_v5 as Gv
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
PITON = (0.0, 1.3)  # le piton de la Grande Aiguille, dans l'axe du débarcadère
R2, R3 = 3.7, 1.75  # le rayon de la terrasse des plates-bandes, celui du piton
Z1, Z2, Z3 = 0.42, 0.98, 1.6  # la pelouse basse, la terrasse, le piton
DEMI_ALLEE = 0.42  # la demi-largeur de l'allée (les marches y remplacent le talus)
BASSIN, R_BASSIN = (0.0, -4.3), 0.7  # le bassin miroir, que l'allée contourne
PISTES = []  # les trajets (remplis par mailles()), pour peindre les dalles

N.matiere("cristal_violet", Gv.tx_glace, 1.6, 0.4, rugueux=0.12, lueur=0.35, c=0xdcc0ff, fond=0x8a5fd0, graine=701, givre=0.2, fissures=0.6)
N.matiere("cristal_rose", Gv.tx_glace, 1.6, 0.4, rugueux=0.12, lueur=0.35, c=0xffcbe8, fond=0xd874b4, graine=702, givre=0.2, fissures=0.6)
N.matiere("cristal_turquoise", Gv.tx_glace, 1.6, 0.4, rugueux=0.12, lueur=0.35, c=0xbdf5f0, fond=0x3fb0b8, graine=703, givre=0.2, fissures=0.6)
N.matiere("cristal_blanc", Gv.tx_glace, 1.6, 0.4, rugueux=0.1, lueur=0.3, c=0xf4f6ff, fond=0xa9b8e6, graine=704, givre=0.3, fissures=0.8)
CRISTAUX = ("cristal_violet", "cristal_rose", "cristal_turquoise", "cristal_blanc")


def rivage(th):
    """Le rayon de la côte dans cette direction."""
    return 7.3 + 0.5 * math.sin(2 * th + 0.3) + 0.3 * math.sin(3 * th + 1.9) + 0.2 * math.sin(5 * th + 0.7)


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


def r_terrasse(a):
    return R2 * (1 + 0.05 * math.sin(4 * a + 0.6))


def r_piton(a):
    return R3 * (1 + 0.06 * math.sin(3 * a + 2.0))


def terrain(x, y):
    """La hauteur du sol : la plage, la pelouse basse, le talus de la terrasse, celui du piton. Dans l'axe de l'allée, les
    talus s'allongent en rampes (les marches sont posées dessus)."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.45 * d)
    h = Z1 * K.lisse(0.0, 0.9, d)
    dx, dy = x - PITON[0], y - PITON[1]
    rr, a = math.hypot(dx, dy), math.atan2(dy, dx)
    doux = K.lisse(DEMI_ALLEE + 0.25, DEMI_ALLEE, abs(dx)) if dy < 0 else 0.0  # 1 dans l'allée, au sud du piton
    l2, l3 = 0.1 + 0.45 * doux, 0.12 + 0.4 * doux
    h += (Z2 - Z1) * K.lisse(r_terrasse(a) + l2, r_terrasse(a) - l2, rr)
    h += (Z3 - Z2) * K.lisse(r_piton(a) + l3, r_piton(a) - l3, rr)
    if h > 0.2:
        h += (K.bruit2(x * 0.9, y * 0.9, 5) - 0.5) * 0.04 * (1 - doux)
    return h


sol = terrain


def tx_sol_cristal(taille=2048, graine=711):
    """Le sol peint : le sable lilas pâle de la plage, la pelouse menthe (tondue : des bandes à peine visibles), la roche
    lilas des talus, les dalles claires de l'allée et leurs joints, des éclats de cristal semés dans l'herbe."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 240), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)  # la pente (hauteur par unité de sol)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    sable = N.mel(N.hexa(0xe4daee), N.hexa(0xf3ecf8), np.clip(0.2 + 0.7 * b2, 0, 1)) * (0.94 + 0.12 * (grain - 0.5))[..., None]
    herbe = N.mel(N.hexa(0x7cc4a0), N.hexa(0xa6dcae), np.clip(0.15 + 0.7 * b2 + 0.3 * (b1 - 0.5), 0, 1)) * (0.9 + 0.2 * (fin - 0.5) + 0.14 * (grain - 0.5))[..., None]
    yy = np.linspace(0, 1, n, endpoint=False)[:, None] * np.ones((1, n))
    herbe *= (1.0 + 0.035 * np.sign(np.sin(yy * 2 * R_SOL * PI / 0.45)))[..., None]  # les bandes de la tonte
    coul = N.mel(sable, herbe, N.lisse(0.26, 0.36, h + (b3 - 0.5) * 0.06))
    roche = N.mel(N.hexa(0x9a86c6), N.hexa(0xc0b0e0), np.clip(0.2 + 0.7 * b3 + 0.3 * (b2 - 0.5), 0, 1)) * (0.88 + 0.24 * (fin - 0.5))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.55, 1.1, pente + (b3 - 0.5) * 0.3) * N.lisse(0.3, 0.42, h))
    # les dalles : des rangées décalées (comme un mur de briques vu de dessus), un joint sombre entre elles.
    # SURTOUT PAS N.cellules(n, 110, …) ici : il parcourt toute l'image pour chaque cellule (12 100 fois 4 millions de
    # points : un quart d'heure dans Blender, vu le 18/11).
    gx_, gy_ = N.grille(n)
    v_ = gy_ * 2 * R_SOL / 0.24
    u_ = gx_ * 2 * R_SOL / 0.36 + 0.5 * (np.floor(v_) % 2)
    d = np.minimum(1 - 2 * np.abs((u_ % 1) - 0.5), 1 - 2 * np.abs((v_ % 1) - 0.5)).astype(np.float32)  # 0 sur un joint
    ident = (np.floor(u_) * 7 + np.floor(v_) * 13).astype(np.int64)
    dalle = N.mel(N.hexa(0xd9d2e6), N.hexa(0xf0ebf6), ((ident % 7) / 6.0).astype(np.float32)) * (0.95 + 0.1 * (grain - 0.5))[..., None]
    dalle = N.mel(dalle, N.hexa(0x8f86a6), N.lisse(0.1, 0.0, d)[..., None] * 0.8)
    coul = N.mel(coul, dalle, N.lisse(0.36, 0.3, piste) * N.lisse(0.28, 0.36, h))
    eclats = N.lisse(0.9, 0.94, N.bruit(n, 230, 230, graine + 7, 1)) * N.lisse(0.3, 0.4, h) * N.lisse(0.4, 0.6, piste)
    coul = N.mel(coul, N.hexa(0xf6ecff), eclats * 0.8)
    relief = np.clip(0.5 + 0.2 * (b3 - 0.5) + 0.15 * (fin - 0.5) - 0.25 * N.lisse(0.1, 0.0, d) * N.lisse(0.36, 0.3, piste), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_cristal", tx_sol_cristal, 2 * R_SOL, 0.5, 0.85)


# --- les pièces ---
def cristal(L, V, x, y, z, h, r, mat, cap=0.0, penche=0.0, nuit=True):
    """Un prisme à six pans et sa pointe, planté dans le sol, penché de `penche` vers `cap`. Ses facettes restent nettes.
    nuit : une peau de « vitre » l'enveloppe (rien le jour ; elle s'allume avec les lampes, et il éclaire autour de lui)."""
    M = T(x, y, z - 0.1) @ Rz(cap) @ Ry(penche)
    L.ajouter(*N.cylindre(r, r * 0.86, h * 0.8 + 0.1, 6, haut=False, bas=False), mat, M)
    L.ajouter(*N.cylindre(r * 0.86, 0.0, h * 0.2, 6, bas=False), mat, M @ T(0, 0, h * 0.8 + 0.1))
    if nuit:
        V.ajouter(*N.cylindre(r * 1.03, r * 0.89, h * 0.8 - 0.05, 6, haut=False, bas=False), "vitre", M @ T(0, 0, 0.15))
        V.ajouter(*N.cylindre(r * 0.89, 0.0, h * 0.2 + 0.01, 6, bas=False), "vitre", M @ T(0, 0, h * 0.8 + 0.1))


def bouquet(L, V, rng, x, y, z, h, r, mats, nb=6, nuit=True):
    """Un bouquet de cristaux : un grand, droit, et les autres penchés tout autour, de plus en plus petits."""
    cristal(L, V, x, y, z, h, r, mats[0], rng.random() * 6.28, 0.04, nuit)
    for k in range(1, nb):
        a = k * 2 * PI / (nb - 1) + rng.random() * 0.5
        hh, rr = h * (0.34 + 0.34 * rng.random()), r * (0.42 + 0.26 * rng.random())
        cristal(L, V, x + math.cos(a) * r * 0.75, y + math.sin(a) * r * 0.75, z, hh, rr, mats[k % len(mats)], a, 0.3 + 0.35 * rng.random(), nuit and k % 2 == 1)


def marches(L, x, y0, y1, larg, nb=6):
    """Une volée de marches de pierre claire le long de l'allée (vers le nord) : chacune affleure la rampe du terrain en
    son milieu (un marcheur ne bute pas dessus)."""
    for k in range(nb):
        y = y0 + (y1 - y0) * (k + 0.5) / nb
        zz = terrain(x, y) + 0.025
        L.ajouter(*N.boite(larg, (y1 - y0) / nb + 0.015, 0.3), "pierres_claires", T(x, y, zz - 0.3))


def mailles(graine=523, leger=False):
    """leger : la version téléphone (pas encore réglée : ce premier jet ne fait qu'alléger le relief)."""
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

    # --- le plan : l'allée (le débarcadère, l'arche, le tour du bassin, les deux volées de marches), les trajets ---
    quai_mer, quai_terre = vers(-90, -1.6), vers(-90, 0.75)
    y_t, y_p = PITON[1] - r_terrasse(-PI / 2), PITON[1] - r_piton(-PI / 2)  # là où l'allée coupe les deux talus
    tour_bassin = lambda cote: [(BASSIN[0] + cote * math.cos(a) * (R_BASSIN + 0.45), BASSIN[1] + math.sin(a) * (R_BASSIN + 0.45)) for a in (-PI / 2, -PI / 4, 0.0, PI / 4, PI / 2)]
    allee_est = [quai_terre, (0.0, quai_terre[1] + 0.55)] + tour_bassin(1) + [(0.0, y_t - 0.52), (0.0, y_t + 0.8), (0.0, y_p - 0.75), (0.0, y_p + 0.62)]
    allee_ouest = [(0.0, quai_terre[1] + 0.55)] + tour_bassin(-1) + [(0.0, y_t - 0.52)]
    ronde = [(PITON[0] + math.cos(a) * (R2 - 0.9), PITON[1] + math.sin(a) * (R2 - 0.9)) for a in np.arange(-PI / 2, 3 * PI / 2 - 0.01, PI / 10)]  # le tour de la terrasse
    chemins = [  # (points au sol, en rond, vitesse, départ, pause)
        (K.suivre([quai_mer] + allee_est, sol, 0.22), False, 0.16, 0.0, 4.0),
        (K.suivre(ronde + ronde[:1], sol, 0.25)[:-1], True, 0.14, 0.4, 0),
        (K.suivre(allee_ouest[::-1] + [quai_terre], sol, 0.22), False, 0.15, 0.6, 3.0),
    ]
    for pts, *_ in chemins:  # sur le débarcadère, on marche sur les planches
        for k, q in enumerate(pts):
            if bord(q[0], q[1]) < 0.75 and abs(q[0]) < 0.3:
                pts[k] = (q[0], q[1], Z1 + 0.02)
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (allee_est, allee_ouest, ronde + ronde[:1])]  # peu de points : la texture du sol mesure sa distance à chacun
    couloirs = [(pts, 0.12) for pts in PISTES]
    loin_des_allees = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=0.3):
        """Cette place est-elle à terre, hors des allées et de ce qui est déjà posé ?"""
        if terrain(x, y) < bas or not loin_des_allees(x, y, r):
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
    L.ajouter(sommets, faces, "sol_cristal", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)

    etape("l'allée")
    # --- le débarcadère et sa bannière, les deux volées de marches, le bassin miroir, l'arche de cristal ---
    e = Rf.tablier(L, quai_mer, quai_terre, Z1, Z1, 0.5)
    lg = quai_terre[1] - quai_mer[1]
    for t in (0.12, 0.45, 0.78):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.034, Z1 + 0.95, 6, haut=False), "planches_sombres", T(quai_mer[0] + s * 0.21, quai_mer[1] + lg * t, -0.95))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.5, PI / 2)
    emprises.append(("le débarcadère", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.34, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    marches(L, 0.0, y_t - 0.5, y_t + 0.5, 2 * DEMI_ALLEE, 6)
    marches(L, 0.0, y_p - 0.48, y_p + 0.48, 2 * DEMI_ALLEE, 6)
    zb = sol(*BASSIN)
    L.ajouter(*N.cylindre(R_BASSIN + 0.1, R_BASSIN + 0.1, 0.16, 20, haut=False), "pierres_claires", T(BASSIN[0], BASSIN[1], zb - 0.06))
    L.ajouter(*N.cylindre(R_BASSIN, R_BASSIN, 0.02, 20, bas=False), "eau_oasis" if "eau_oasis" in N.MATIERES else "glace_lac", T(BASSIN[0], BASSIN[1], zb + 0.06))
    cristal(L, V, BASSIN[0], BASSIN[1], zb + 0.05, 0.75, 0.13, "cristal_blanc", 0.4, 0.0)
    SOL.append(("decor", "le bassin miroir", Vf.rond(BASSIN[0], BASSIN[1], R_BASSIN + 0.12, 14)))
    ya = quai_terre[1] + 0.4  # l'arche : deux gerbes qui se penchent l'une vers l'autre et se croisent au-dessus de l'allée
    for s_ in (-1, 1):
        for k in range(4):
            cristal(L, V, s_ * (0.95 - 0.07 * k), ya + 0.06 * (k % 2) * s_, sol(s_ * 0.85, ya), 0.9 + 0.4 * k, 0.13 - 0.012 * k, CRISTAUX[(k + (s_ > 0)) % 3], PI if s_ > 0 else 0.0, 0.1 + 0.135 * k, k >= 2)
        SOL.append(("decor", "un pied de l'arche", Vf.rond(s_ * 0.85, ya, 0.2)))

    etape("la Grande Aiguille")
    # --- la Grande Aiguille : une gerbe de prismes sur le piton, le plus haut plus grand qu'un mât ---
    zp = sol(PITON[0], PITON[1] + 0.3)
    bouquet(L, V, rng, PITON[0], PITON[1] + 0.3, zp, 5.4, 0.5, ("cristal_violet", "cristal_blanc", "cristal_rose", "cristal_violet", "cristal_turquoise"), 5 if leger else 9)
    SOL.append(("decor", "la Grande Aiguille", Vf.rond(PITON[0], PITON[1] + 0.3, 0.95, 12)))

    etape("les bouquets")
    # --- les bouquets : aux quatre coins de la terrasse, sur la pelouse basse, au bord de l'eau ---
    places = [(PITON[0] + math.cos(a) * (R2 - 0.45), PITON[1] + math.sin(a) * (R2 - 0.45), 2.2 + 0.5 * (k % 2), 0.26) for k, a in enumerate(math.radians(g) for g in (35, 145, 215, 325))]
    places += [(*vers(g, 1.5 + 0.5 * (k % 2)), 1.5 + 0.7 * ((k * 5) % 3) / 2, 0.2) for k, g in enumerate((15, 60, 120, 165, 205, 250, 290, 335))]
    for k, (x, y, h, r) in enumerate(places[: 7 if leger else 12]):
        if libre(x, y, r * 2.2):
            bouquet(L, V, rng, x, y, sol(x, y), h, r, tuple(CRISTAUX[(k + j) % 4] for j in range(3)), 4 if leger else 6)
            SOL.append(("decor", "un bouquet de cristaux", Vf.rond(x, y, r * 2.0)))

    etape("les plates-bandes")
    # --- les plates-bandes de la terrasse : de petits cristaux alignés comme des légumes, entre l'allée ronde et le piton ---
    for q in range(4 if leger else 8):
        a0 = PI / 8 + q * PI / 4
        for rang_ in range(2):
            rr = R3 + 0.5 + 0.32 * rang_
            for k in range(3 if leger else 5):
                a = a0 + (k - 2) * 0.13
                x, y = PITON[0] + math.cos(a) * rr, PITON[1] + math.sin(a) * rr
                if libre(x, y, 0.06, 0.8):
                    cristal(L, V, x, y, sol(x, y), 0.2 + 0.12 * ((k + rang_ + q) % 3), 0.045, CRISTAUX[q % 4], a, 0.08, False)

    etape("les jardiniers")
    def poser(x, y, cap=None, **plus):
        if libre(x, y, 0.07):
            P.passant(L, rng, x, y, angle=cap, z=sol(x, y), **plus)
            SOL.append(("passant", "un jardinier", Vf.rond(x, y, 0.065)))

    poser(BASSIN[0] - 1.6, BASSIN[1] + 0.3, 0.2)
    poser(PITON[0] + 2.1, PITON[1] - 1.5, 2.6)
    poser(PITON[0] - 1.9, PITON[1] + 1.9, -0.8, leve=1)

    etape("la vie")
    types = []
    for k in range(2):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=("toile_ecrue", None)[k])
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:2] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.5, "genre": 2}))

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
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("cristal-v5", (1.0, -30.5, 17.5), (0.0, 0.4, 1.6), 50), ("cristal-v5-aiguille", (-3.5, -9.5, 5.6), (0.0, 0.8, 2.2), 50)] if rendu else []
    return K.construire("ile-cristal-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="cristal")
