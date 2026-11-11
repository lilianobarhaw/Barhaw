# La Plage des Moussaillons, « niveau 5 » : un îlot de sable rose où les mousses apprennent le métier. Tout est inventé.
# Une anse au sud-est, un ponton et son canot, le camp (feu, marmite, bûches), la paillote sur pilotis, le mât d'exercice et
# ses mannequins, une épave sur la plage de l'ouest, le rocher du guetteur, une cocoteraie. La vie : des mousses qui marchent,
# qui courent autour du mât, des crabes, un hamac qui se balance, le canot qui flotte, la fumée du feu, les mouettes.
# Sorties : ile-moussaillons-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
N.matiere("sable_rose", N.tx_uni, 2.6, 0.25, c=0xf0cdb8, graine=301, grain=0.16, taches=0.3, c2=0xf8e2cf, seuil=0.55)
N.matiere("sable_mouille", N.tx_uni, 2.6, 0.2, c=0xcfa58e, graine=302, grain=0.12, taches=0.25, c2=0xdcb9a2, seuil=0.5)
N.matiere("ecorce_palmier", N.tx_corde, 0.34, 0.7, c=0x8a6e4e, graine=303)
N.matiere("palme_verte", N.tx_uni, 0.9, 0.3, c=0x3f8234, graine=304, grain=0.18, taches=0.35, c2=0x5fa043, seuil=0.45)
N.matiere("palme_jeune", N.tx_uni, 0.9, 0.3, c=0x6aa842, graine=305, grain=0.18, taches=0.3, c2=0x8cbf4e, seuil=0.5)
N.matiere("paille", N.tx_corde, 0.5, 0.8, c=0xc9a85a, graine=306)
N.matiere("noix", N.tx_uni, 0.4, 0.3, c=0x6a4a2c, graine=307, grain=0.3, taches=0.3)
N.matiere("cendre", N.tx_uni, 0.8, 0.4, c=0x3a3532, graine=308, grain=0.4, taches=0.5, c2=0x6a625c, seuil=0.6)

ANSE = math.radians(-52)  # l'anse, au sud-est
PONTON = math.radians(-112)  # le ponton, au sud-sud-ouest
BUTTE = (-1.4, 1.9)
ROCHER = (3.7, 4.0)


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def rivage(th):
    """Le rayon de la côte dans cette direction."""
    return 7.5 + 0.7 * math.sin(2 * th + 0.6) + 0.35 * math.sin(5 * th + 1.9) - 2.5 * math.exp(-((_ecart(th, ANSE) / 0.42) ** 2))


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau (au point de la côte le plus proche) ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def sol(x, y):
    """La hauteur du terrain : la plage qui monte doucement, la prairie, une butte, le rocher du guetteur."""
    d = bord(x, y)
    if d < 0:
        return max(-1.6, 0.42 * d)
    h = 0.34 * (1 - math.exp(-d / 0.9))
    h += 0.7 * K.lisse(1.8, 4.8, d)
    h += 1.15 * math.exp(-((x - BUTTE[0]) ** 2 + (y - BUTTE[1]) ** 2) / 4.6) * K.lisse(1.2, 2.8, d)
    h += 1.9 * math.exp(-((x - ROCHER[0]) ** 2 + (y - ROCHER[1]) ** 2) / 1.5) * K.lisse(0.3, 1.2, d)
    h += (K.bruit2(x * 0.9, y * 0.9, 3) - 0.5) * 0.12 * K.lisse(0.9, 2.6, d)
    return h


R_SOL = 10.2  # le sol de l'île est peint d'un seul tenant, de -R_SOL à R_SOL
PISTES = []  # la terre battue (remplie par _mailles) : les trajets que les mousses ont tracés à force de passer


def tx_sol_plage(taille=2048, graine=41):
    """Le sol peint pixel par pixel : le sable mouillé du rivage, le sable rose et ses rides, l'herbe qui gagne par touffes, la
    terre battue des sentiers, la roche des pentes raides, la cendre autour du feu."""
    n = taille
    hc = K.champ(sol, R_SOL)
    h = K.agrandir(hc, n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    gy, gx = np.gradient(hc, 2 * R_SOL / hc.shape[0])
    pente = K.agrandir(np.hypot(gx, gy).astype(np.float32), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    # le détail qu'on voit de tout près (un pixel fait un centimètre) : le grain du sable, quelques grains clairs ou sombres,
    # les brins de l'herbe
    grain, brins = N.bruit(n, 640, 640, graine + 4, 1), N.bruit(n, 760, 250, graine + 5, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    rose, mouille = N.hexa(0xf0cdb8), N.hexa(0xc79f88)
    coul = np.broadcast_to(rose, (n, n, 3)).copy() * (0.93 + 0.1 * b1 + 0.06 * fin + 0.09 * (grain - 0.5) + 0.1 * (semis > 0.988) - 0.13 * (semis < 0.012))[..., None]
    coul *= (1 + 0.016 * np.sin(d * 15 + b1 * 14 + b2 * 4))[..., None]  # les rides du sable
    coul = N.mel(coul, mouille * (0.9 + 0.15 * b2)[..., None], N.lisse(0.2, 0.02, h + (b2 - 0.5) * 0.08))
    coul = N.mel(coul, np.array([0.98, 0.97, 0.95], np.float32), (N.lisse(0.05, 0.0, np.abs(d - 0.06 - (b2 - 0.5) * 0.12)) * (b3 > 0.42))[..., None] * 0.7)  # la frange d'écume séchée
    herbe = N.hexa(0x6f9e44) * (0.78 + 0.34 * b2 + 0.16 * fin + 0.3 * (brins - 0.5) + 0.12 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0xa8a14a) * (0.85 + 0.25 * b3)[..., None], N.lisse(0.55, 0.75, b1))  # des plaques d'herbe sèche
    coul = N.mel(coul, herbe, N.lisse(0.36, 0.52, h + (b2 - 0.5) * 0.2 + (b3 - 0.5) * 0.12))
    coul = N.mel(coul, np.array([1.0, 0.95, 0.7], np.float32), ((b3 > 0.83) & (fin > 0.7) & (h > 0.55))[..., None] * 0.8)  # des fleurs
    terre = N.hexa(0x9a7650) * (0.82 + 0.28 * b3 + 0.1 * fin + 0.14 * (grain - 0.5) - 0.16 * (semis < 0.02))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.27, 0.12, piste + (b2 - 0.5) * 0.16) * N.lisse(0.3, 0.45, h))
    roche = N.hexa(0x8d8376) * (0.78 + 0.07 * np.sin((h * 5 + b1 * 3) * 2 * PI) + 0.3 * b3 + 0.14 * fin)[..., None]
    coul = N.mel(coul, roche, N.lisse(0.78, 1.0, pente + (b2 - 0.5) * 0.24))
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.35 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_plage", tx_sol_plage, 2 * R_SOL, 0.35)


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


# ---------- les pièces ----------
def palmier(L, rng, x, y, h=2.6, penche=0.6, cap=0.0, leger=False, z=None):
    """Un cocotier : un tronc courbe et fibreux, une couronne de palmes (une nervure, des folioles pointues de chaque côté, qui
    retombent), des noix. leger : moins de palmes, moins de folioles."""
    z0 = (sol(x, y) if z is None else z) - 0.1  # z : la hauteur du sol, pour une autre île que la plage
    pts = [(x + math.cos(cap) * penche * (k / 7) ** 2, y + math.sin(cap) * penche * (k / 7) ** 2, z0 + h * (k / 7) * (1.08 - 0.08 * k / 7)) for k in range(8)]
    L.ajouter(*N.tube(pts, [0.12 - 0.05 * k / 7 for k in range(8)], 7), "ecorce_palmier", tourne=True)
    cx, cy, cz = pts[-1]
    L.ajouter(*N.sphere(0.11, 6, 4, 0.8), "ecorce_palmier", T(cx, cy, cz))
    nb, ns = (7, 6) if leger else (11, 9)
    for k in range(nb):
        a = cap + k * 2 * PI / nb + rng.random() * 0.35
        lg = 1.25 + rng.random() * 0.5
        monte = 0.5 - 0.5 * (k % 3) / 2 + rng.random() * 0.15  # trois étages : des palmes dressées, d'autres qui pendent
        ca, sa = math.cos(a), math.sin(a)
        n = np.array((-sa, ca, 0.0))
        nerv = [np.array((cx + ca * lg * t, cy + sa * lg * t, cz + monte * lg * math.sin(PI * min(1.0, t * 1.15)) * 0.55 - 0.5 * lg * t * t)) for t in (i / ns for i in range(ns + 1))]
        v, f = [], []
        for i in range(ns):  # la nervure : une lame étroite
            q = len(v)
            v += [nerv[i] - n * 0.014, nerv[i] + n * 0.014, nerv[i + 1] + n * 0.01, nerv[i + 1] - n * 0.01]
            f.append((q, q + 1, q + 2, q + 3))
        for i in range(1, ns + 1):  # les folioles : un triangle de chaque côté, pointe vers le bas et vers le bout
            t = i / ns
            w = 0.34 * math.sin(PI * (0.1 + 0.86 * t)) ** 0.7
            pas = (nerv[i] - nerv[i - 1])
            for s_ in (-1, 1):
                q = len(v)
                pointe = nerv[i] + n * s_ * w + pas * 0.55 - np.array((0, 0, w * 0.75))
                v += [nerv[i - 1] + pas * 0.12, nerv[i] + pas * 0.02, pointe]
                f.append((q, q + 1, q + 2) if s_ > 0 else (q, q + 2, q + 1))
        L.ajouter(v, f + [tuple(reversed(g)) for g in f], "palme_verte" if k % 3 else "palme_jeune")
        poids = [(i + 0.5) / ns for i in range(ns)] + [i / ns for i in range(1, ns + 1) for _ in (0, 1)]  # la nervure, puis les folioles
        L.zones[-2 * len(f):] = [(1.0, round(1.0 - 0.9 * w ** 1.4, 2), 1.0) for w in poids] * 2
    for k in range(3):
        a = cap + k * 2.1 + 0.5
        L.ajouter(*N.sphere(0.075, 6, 4), "noix", T(cx + math.cos(a) * 0.12, cy + math.sin(a) * 0.12, cz - 0.13))


def paillote(L, V, U, rng, x, y, cap, hp=0.72):
    """La paillote des mousses : un plancher sur pilotis, une cabane de planches, un grand toit de chaume, une échelle, une lanterne."""
    z = min(sol(x + dx, y + dy) for dx in (-1, 1) for dy in (-0.8, 0.8))
    M = T(x, y, z) @ Rz(cap)
    for sx in (-0.92, 0, 0.92):
        for sy in (-0.72, 0.72):
            L.ajouter(*N.cylindre(0.055, 0.05, hp + 0.5, 6, haut=False), "planches_sombres", M @ T(sx, sy, -0.45))
    L.ajouter(*N.boite(2.1, 1.7, 0.07, bas=True), "pont", M @ T(0, 0, hp))
    L.ajouter(*N.boite(1.45, 1.15, 0.86, haut=False), "planches_claires", M @ T(0.15, 0.12, hp + 0.07), tourne=True)
    L.ajouter(*N.quad((-0.07, -0.462, hp + 0.07), (0.33, -0.462, hp + 0.07), (0.33, -0.462, hp + 0.7), (-0.07, -0.462, hp + 0.7)), "porte", M)
    P.fenetre(L, V, rng, M @ T(0.15, 0.12, hp + 0.07) @ Rz(PI / 2) @ T(0, -0.726, 0), 0, 0.34, 0.24, 0.26, allumee=True)
    v, f = N.toit_pointe(1.42, 0.98, 4, 0.2)
    L.ajouter(v, f, "paille", M @ T(0.1, 0.08, hp + 0.9), tourne=True)
    for (a, b) in (((-1.02, -0.82), (1.02, -0.82)), ((-1.02, -0.82), (-1.02, 0.82)), ((1.02, -0.82), (1.02, 0.1))):  # la rambarde
        L.ajouter(*N.poutre((*a, hp + 0.34), (*b, hp + 0.34), 0.035), "planches_sombres", M)
        for t in (0.0, 0.5, 1.0):
            L.ajouter(*N.poutre((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, hp + 0.06), (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, hp + 0.34), 0.03), "planches_sombres", M)
    for s in (-1, 1):  # l'échelle, du côté de l'est
        L.ajouter(*N.poutre((1.5, 0.45 + s * 0.14, -0.05), (1.06, 0.45 + s * 0.14, hp + 0.05), 0.03), "planches", M)
    for k in range(5):
        t = (k + 0.5) / 5
        L.ajouter(*N.poutre((1.5 - 0.44 * t, 0.31, -0.05 + (hp + 0.1) * t), (1.5 - 0.44 * t, 0.59, -0.05 + (hp + 0.1) * t), 0.025), "planches", M)
    U.ajouter(*N.sphere(0.05, 6, 4), "lumiere", M @ T(-0.5, -0.5, hp + 0.62))
    L.ajouter(*N.poutre((-0.5, -0.5, hp + 0.66), (-0.5, -0.44, hp + 0.9), 0.012), "fer", M)
    return M, z + hp + 0.07


def mannequin(L, rng, x, y, cap):
    """Un mannequin d'exercice : un poteau, une traverse, une tête de paille, un bouclier peint."""
    M = T(x, y, sol(x, y)) @ Rz(cap)
    L.ajouter(*N.cylindre(0.035, 0.03, 0.42, 6), "planches_sombres", M @ T(0, 0, -0.06))
    L.ajouter(*N.poutre((0, -0.17, 0.27), (0, 0.17, 0.27), 0.03), "planches_sombres", M)
    L.ajouter(*N.sphere(0.06, 6, 4), "paille", M @ T(0, 0, 0.42))
    L.ajouter(*N.cylindre(0.085, 0.085, 0.02, 8, bas=True), rng.choice(["peint_rouge", "peint_bleu"]), M @ T(0.03, 0.12, 0.25) @ Ry(PI / 2))


def crabe():
    C = N.Maille("crabe")
    C.ajouter(*N.sphere(0.045, 7, 4, 0.55), "peint_rouge", T(0, 0, 0.035))
    for s in (-1, 1):
        C.ajouter(*N.sphere(0.022, 5, 3), "peint_rouge", T(0.05, s * 0.03, 0.04))
        for k in range(3):
            C.ajouter(*N.poutre((-0.02 + k * 0.02, s * 0.03, 0.03), (-0.03 + k * 0.025, s * 0.075, 0.0), 0.009), "peint_rouge")
    return C


def mailles(graine=31, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de palmes, trois marcheurs)."""
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

    # --- le plan : où sont les choses, où marchent les mousses (rien d'autre ne s'y pose) ---
    feu = vers(-150, 2.35)
    hutte, cap_h = vers(-18, 2.9), math.radians(-18) + PI
    mat = (-0.2, -1.5)
    epave = vers(168, 0.95)
    pa, pb = np.array(vers(math.degrees(PONTON), 0.7)), np.array(vers(math.degrees(PONTON), -2.5))  # le ponton : du sable vers le large
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    pied_echelle = (hutte[0] + math.cos(cap_h) * 1.62 - math.sin(cap_h) * 0.45, hutte[1] + math.sin(cap_h) * 1.62 + math.cos(cap_h) * 0.45)
    arc = lambda a0, a1, dedans, pas=3: [z(vers(a, dedans)) for a in np.arange(a0, a1 + 0.01, pas)]
    terre = lambda pts: K.suivre(pts, sol)  # un trajet à terre épouse le relief
    chemins = [  # (points, en rond, vitesse, départ, pause, saut) ; les trois premiers suffisent au téléphone
        ([(*(pa + dp * 2.7), 0.45), (*(pa + dp * 0.55), 0.45)] + terre([pa - dp * 0.5, (feu[0] + 1.0, feu[1] + 0.85), (0.9, -3.3), (pied_echelle[0] + 0.1, pied_echelle[1] - 0.35)]), False, 0.2, 0.0, 3.0, 0.022),
        ([z((mat[0] + math.cos(a) * 1.15, mat[1] + math.sin(a) * 1.15)) for a in np.arange(0, 2 * PI - 0.01, PI / 12)], True, 0.42, 0.3, 0, 0.035),
        (arc(-176, -128, 0.8), False, 0.18, 0.5, 2.0, 0.022),
        (arc(140, 186, 1.9), False, 0.17, 0.2, 2.5, 0.022),
        (terre([(1.3, -0.4), (1.9, 1.3), (2.5, 2.6), (2.75, 3.2)]), False, 0.16, 0.7, 4.0, 0.022),
    ]
    crabes = [(arc(-100, -84, 0.42), 0.1), (arc(118, 132, 0.4), 0.2), (arc(-30, -18, 0.42), 0.6)]
    couloirs = [(pts, 0.07) for pts, *_ in chemins] + [(pts, 0.05) for pts, _ in crabes]

    def libre(x, y, r):
        """Cette place (un objet de rayon r) est-elle à terre, hors des passages et loin de ce qui est déjà posé ?"""
        if any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL)

    # --- le terrain ---
    n, R = (46 if leger else 66), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    PISTES[:] = [chemins[0][0][2:], chemins[4][0]]  # la terre battue : du ponton au camp et à la paillote, puis vers le guetteur
    uv = lambda x, y: ((x + R) / (2 * R), (y + R) / (2 * R))
    for j in range(n):
        for i in range(n):
            hs = [H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i]]
            if max(hs) < -0.25:
                continue
            coins = [(xs[i], xs[j]), (xs[i + 1], xs[j]), (xs[i + 1], xs[j + 1]), (xs[i], xs[j + 1])]
            L.ajouter([(*c, hh) for c, hh in zip(coins, hs)], [(0, 1, 2, 3)], "sol_plage", uv=[uv(*c) for c in coins])
    L.regrouper(0, None, 4, 0.75)

    # --- le ponton et son canot ---
    lg = 3.2
    Mp = T(pa[0], pa[1], 0) @ Rz(math.atan2(dp[1], dp[0]))
    L.ajouter(*N.boite(lg, 0.5, 0.05, bas=True), "pont", Mp @ T(lg / 2, 0, 0.38))
    for k in range(int(lg / 0.55) + 1):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6), "planches_sombres", Mp @ T(0.12 + k * 0.55, s * 0.24, -0.8))
    P.tonneau(L, Mp @ T(lg - 0.3, 0.13, 0.43))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.5, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[0]))
    cq = pa + dp * (lg - 0.6) + np.array((-dp[1], dp[0])) * 0.62
    Bq = N.Maille("canot")
    P.barque(Bq, rng, 0, 0, math.atan2(dp[1], dp[0]) + 0.1)
    lots["animes"].append((Bq, (cq[0], cq[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.7}))
    emprises.append(("le canot", Vf.rectangle(cq[0], cq[1], 0.8, 0.32, math.atan2(dp[1], dp[0]) + 0.1)))

    # --- le camp : le feu dans son cercle de pierres, la marmite sur son trépied, trois bûches pour s'asseoir ---
    fz = sol(*feu)
    for k in range(9):
        a = k * 2 * PI / 9
        L.ajouter(*N.sphere(0.07 + 0.02 * (k % 2), 6, 4, 0.75), "roche", T(feu[0] + math.cos(a) * 0.24, feu[1] + math.sin(a) * 0.24, fz + 0.02) @ Rz(k))
    L.ajouter(*N.cylindre(0.2, 0.2, 0.02, 8), "cendre", T(feu[0], feu[1], fz + 0.01))
    for k in range(3):
        a = k * PI / 3
        L.ajouter(*N.poutre((feu[0] - math.cos(a) * 0.17, feu[1] - math.sin(a) * 0.17, fz + 0.05), (feu[0] + math.cos(a) * 0.17, feu[1] + math.sin(a) * 0.17, fz + 0.07), 0.04), "planches_sombres")
        b = k * 2 * PI / 3 + 0.5
        L.ajouter(*N.poutre((feu[0] + math.cos(b) * 0.3, feu[1] + math.sin(b) * 0.3, fz), (feu[0], feu[1], fz + 0.5), 0.018), "fer")
    L.ajouter(*N.sphere(0.09, 7, 4, 0.8), "fer", T(feu[0], feu[1], fz + 0.3))
    Fl = N.Maille("flammes")  # les flammes : la matière « lumiere » du site, elles tremblent
    Fl.ajouter(*N.cylindre(0.11, 0.0, 0.2, 6, haut=False), "lumiere", T(0, 0, 0))
    Fl.ajouter(*N.cylindre(0.06, 0.0, 0.14, 5, haut=False), "lumiere", T(0.06, 0.03, 0))
    lots["libres"].append((Fl, (feu[0], feu[1], fz + 0.04), {"anim": "clignote"}))
    SOL.append(("dur", "le feu", Vf.rond(feu[0], feu[1], 0.36)))
    for k in range(3):
        a = k * 2.1 + 0.2
        c = np.array((feu[0] + math.cos(a) * 0.78, feu[1] + math.sin(a) * 0.78))
        tng = np.array((-math.sin(a), math.cos(a))) * 0.3
        zc = sol(*c) + 0.07
        L.ajouter(*N.tube([(*(c - tng), zc), (*(c + tng), zc)], 0.075, 7), "ecorce_palmier", tourne=True)
        SOL.append(("dur", f"la bûche {k}", Vf.rectangle(c[0], c[1], 0.62, 0.16, a + PI / 2)))

    # --- la paillote sur pilotis, sa lanterne ---
    Mh, z_pl = paillote(L, V, U, rng, hutte[0], hutte[1], cap_h)
    SOL.append(("dur", "la paillote", Vf.rectangle(hutte[0], hutte[1], 2.1, 1.7, cap_h)))

    # --- le mât d'exercice : la hune, la vergue, les haubans à enfléchures, le pavillon ; deux mannequins, le râtelier ---
    mz = sol(*mat)
    L.ajouter(*N.cylindre(0.07, 0.045, 2.7, 8), "planches_sombres", T(mat[0], mat[1], mz - 0.15))
    L.ajouter(*N.cylindre(0.2, 0.26, 0.16, 8, bas=True), "planches", T(mat[0], mat[1], mz + 1.75))
    L.ajouter(*N.poutre((mat[0], mat[1] - 0.75, mz + 1.45), (mat[0], mat[1] + 0.75, mz + 1.45), 0.045), "planches_sombres")
    for s in (-1, 1):
        haut, bas = (mat[0], mat[1] + s * 0.2, mz + 1.75), (mat[0] + 0.1, mat[1] + s * 0.62, mz)
        L.ajouter(*N.tube([haut, bas], 0.012, 4, bouts=False), "corde")
        L.ajouter(*N.cylindre(0.025, 0.02, 0.1, 5), "planches_sombres", T(bas[0], bas[1], bas[2] - 0.03))
        SOL.append(("dur", "un piquet du mât", Vf.rond(bas[0], bas[1], 0.04)))
    for k in range(6):
        t = (k + 1) / 7
        L.ajouter(*N.tube([(mat[0] + 0.1 * (1 - t), mat[1] - 0.2 - 0.42 * (1 - t), mz + 1.75 * t), (mat[0] + 0.1 * (1 - t), mat[1] + 0.2 + 0.42 * (1 - t), mz + 1.75 * t)], 0.008, 3, bouts=False), "corde")
    P.banniere(lots, mat[0], mat[1], mz + 2.5, 0.55, "rose")
    SOL.append(("dur", "le mât", Vf.rond(mat[0], mat[1], 0.1)))
    for k, (dx, dy, cap) in enumerate(((-2.2, 0.55, 0.3), (-2.0, -0.5, -0.4))):
        mannequin(L, rng, mat[0] + dx, mat[1] + dy, cap)
        SOL.append(("dur", f"le mannequin {k}", Vf.rond(mat[0] + dx, mat[1] + dy, 0.2)))
    rx, ry = mat[0] + 2.05, mat[1] + 0.9
    rzs = sol(rx, ry)
    for s in (-1, 1):
        L.ajouter(*N.cylindre(0.025, 0.02, 0.36, 5), "planches_sombres", T(rx, ry + s * 0.26, rzs - 0.04))
    L.ajouter(*N.poutre((rx, ry - 0.3, rzs + 0.28), (rx, ry + 0.3, rzs + 0.28), 0.025), "planches_sombres")
    for k in range(4):
        L.ajouter(*N.poutre((rx + 0.09, ry - 0.2 + k * 0.13, rzs + 0.02), (rx - 0.02, ry - 0.2 + k * 0.13, rzs + 0.34), 0.02, 0.012), "planches_claires")
    SOL.append(("dur", "le râtelier", Vf.rectangle(rx + 0.03, ry, 0.2, 0.62)))
    for k, (dx, dy) in enumerate(((1.7, -0.45), (1.95, -0.35), (1.8, -0.7))):  # les vivres : des tonneaux, une caisse
        (P.tonneau if k < 2 else P.caisse)(L, T(mat[0] + dx, mat[1] + dy, sol(mat[0] + dx, mat[1] + dy)))
        SOL.append(("dur", "les vivres", Vf.rond(mat[0] + dx, mat[1] + dy, 0.12)))

    # --- l'épave, à demi ensablée sur la plage de l'ouest : la quille, les membrures, quelques bordés gris ---
    ez = sol(*epave)
    Me = T(epave[0], epave[1], ez - 0.05) @ Rz(1.1) @ Rx(0.32)
    L.ajouter(*N.poutre((-1.1, 0, 0.02), (1.15, 0, 0.1), 0.07), "planches_sombres", Me)
    for k in range(8):
        xk = -0.95 + k * 0.27
        w = 0.42 * math.sin(PI * (0.12 + 0.8 * k / 7)) ** 0.7
        for s in ((-1, 1) if k % 3 else (-1,)):
            L.ajouter(*N.tube([(xk, 0, 0.04), (xk, s * w * 0.75, 0.1), (xk, s * w, 0.34), (xk, s * w * 0.96, 0.55)], 0.022, 5), "planches_grises", Me)
    for k in range(3):
        L.ajouter(*N.quad((-0.9 + k * 0.5, -0.34, 0.2), (-0.35 + k * 0.5, -0.4, 0.22), (-0.35 + k * 0.5, -0.41, 0.36), (-0.9 + k * 0.5, -0.36, 0.34)), "planches_grises", Me)
    L.ajouter(*N.cylindre(0.05, 0.04, 0.7, 6), "planches_grises", Me @ T(0.2, 0, 0.05) @ Rx(-0.5))
    SOL.append(("dur", "l'épave", Vf.rectangle(epave[0], epave[1], 2.4, 0.95, 1.1)))

    # --- le rocher du guetteur : une plate-forme, sa longue-vue, le brasero des signaux ---
    gz = sol(*ROCHER)
    Mgt = T(ROCHER[0], ROCHER[1], gz) @ Rz(0.6)
    for sx in (-0.4, 0.4):
        for sy in (-0.4, 0.4):
            L.ajouter(*N.cylindre(0.04, 0.035, 1.0, 6, haut=False), "planches_sombres", Mgt @ T(sx, sy, -0.45))
    L.ajouter(*N.boite(1.0, 1.0, 0.06, bas=True), "pont", Mgt @ T(0, 0, 0.5))
    for a, b in (((-0.48, -0.48), (0.48, -0.48)), ((0.48, -0.48), (0.48, 0.48)), ((0.48, 0.48), (-0.48, 0.48))):
        L.ajouter(*N.poutre((*a, 0.84), (*b, 0.84), 0.03), "planches_sombres", Mgt)
    L.ajouter(*N.cylindre(0.03, 0.022, 0.24, 6), "cuivre", Mgt @ T(0.2, -0.38, 0.86) @ Ry(PI / 2 - 0.2))
    L.ajouter(*N.cylindre(0.09, 0.12, 0.1, 7, haut=False), "fer", Mgt @ T(-0.25, 0.25, 0.58))
    U.ajouter(*N.sphere(0.07, 6, 4, 0.7), "lumiere", Mgt @ T(-0.25, 0.25, 0.68))
    SOL.append(("dur", "le guetteur", Vf.rectangle(ROCHER[0], ROCHER[1], 1.0, 1.0, 0.6)))
    P.passant(L, rng, ROCHER[0] + 0.1, ROCHER[1] - 0.1, angle=-1.0, z=gz + 0.56)

    # --- la cocoteraie, le hamac, les buissons, les rochers de la plage ---
    palmes = []
    essais = 0
    while len(palmes) < (9 if leger else 15) and essais < 400:
        essais += 1
        a, d = rng.random() * 360, 1.1 + rng.random() * 3.4
        x, y = vers(a, d)
        if sol(x, y) > 1.5 or not libre(x, y, 0.22) or any(math.hypot(x - q[0], y - q[1]) < 1.0 for q in palmes):
            continue
        if any(math.hypot(x - c[0], y - c[1]) < r_ for c, r_ in ((mat, 2.0), (hutte, 2.7), (ROCHER, 2.3), (feu, 1.5))):
            continue  # pas de palmes dans la hune du mât, le chaume de la paillote, la plate-forme du guetteur ni au-dessus du feu
        palmes.append((x, y))
        cap = math.atan2(y, x) + (rng.random() - 0.5) * 1.6  # ils penchent plutôt vers le large
        palmier(L, rng, x, y, 2.2 + rng.random() * 1.1, 0.35 + rng.random() * 0.6, cap, leger)
        SOL.append(("arbre", f"le cocotier {len(palmes)}", Vf.rond(x, y, 0.14)))
    h1, h2 = np.array(vers(-78, 2.3)), np.array(vers(-66, 2.5))  # deux cocotiers droits pour le hamac
    for q in (h1, h2):
        palmier(L, rng, q[0], q[1], 2.5, 0.12, rng.random() * 6, leger)
        SOL.append(("arbre", "un cocotier du hamac", Vf.rond(q[0], q[1], 0.14)))
    Hm = N.Maille("hamac")  # il se balance (un objet à part, cuit lui aussi)
    milieu, demi = (h1 + h2) / 2, (h2 - h1) / 2
    zh = max(sol(*h1), sol(*h2)) + 0.62
    lgh = np.linalg.norm(demi)
    u_, n_ = demi / lgh, np.array((-demi[1], demi[0])) / lgh
    v, f = [], []
    for i in range(9):
        t = i / 8 * 2 - 1
        c = np.array((*(u_ * t * (lgh - 0.25)), -0.3 * (1 - t * t)))
        w = 0.2 * (1 - 0.75 * t * t)
        v += [c + (*(n_ * w), 0.06 * (1 - t * t)), c - (*(n_ * w), -0.06 * (1 - t * t))]
    for i in range(8):
        f.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    Hm.ajouter(v, f + [tuple(reversed(g)) for g in f], "toile_ecrue")
    for s in (-1, 1):
        Hm.ajouter(*N.tube([(*(u_ * s * (lgh - 0.25)), 0.0), (*(u_ * s * (lgh - 0.1)), 0.02)], 0.01, 3, bouts=False), "corde")
    lots["animes"].append((Hm, (milieu[0], milieu[1], zh), {"anim": "balance", "axe": [float(u_[0]), float(u_[1]), 0.0], "ampl": 0.16, "vitesse": 1.1}))
    for k in range(10 if leger else 20):
        a, d = rng.random() * 360, 1.6 + rng.random() * 3.6
        x, y = vers(a, d)
        r = 0.2 + rng.random() * 0.2
        if sol(x, y) < 0.42 or not libre(x, y, r):
            continue
        L.ajouter(*N.sphere(r, 7, 4, 0.7), rng.choice(["feuillage", "feuillage", "feuillage_sombre"]), T(x, y, sol(x, y) + r * 0.2), zone=(1.0, 0.8, 1.0))
        SOL.append(("rocher", "un buisson", Vf.rond(x, y, r * 0.8)))
    for k in range(8 if leger else 14):
        a, d = rng.random() * 360, 0.25 + rng.random() * 1.1
        x, y = vers(a, d)
        r = 0.12 + rng.random() * 0.22
        if not libre(x, y, r):
            continue
        L.ajouter(*N.sphere(r, 7, 4, 0.6), rng.choice(["roche", "roche_claire"]), T(x, y, sol(x, y)) @ Rz(k))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r * 0.85)))

    # --- les mousses (immobiles) : deux près du feu, un qui pêche au bout du ponton, un sur le plancher de la paillote, deux au mât ---
    def poser(x, y, zz=None, cap=None):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz)
        SOL.append(("passant", "un mousse", Vf.rond(x, y, 0.065)))

    for a in (1.3, 3.4):
        poser(feu[0] + math.cos(a) * 0.55, feu[1] + math.sin(a) * 0.55, None, a + PI)
    bout = pa + dp * (lg - 0.25) - np.array((-dp[1], dp[0])) * 0.15
    poser(bout[0], bout[1], 0.43, math.atan2(dp[1], dp[0]))
    hp_ = (Mh @ np.array((-0.72, -0.5, 0, 1)))[:2]
    poser(hp_[0], hp_[1], z_pl, cap_h - PI / 2)
    for dx, dy, cap in ((-1.75, 0.5, 2.9), (-1.6, -0.45, 2.6)):
        poser(mat[0] + dx, mat[1] + dy, None, cap)

    # --- la vie : les mousses qui marchent, ceux qui courent autour du mât, les crabes, la fumée, les mouettes ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"mousse{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    faits = {}
    for k, (pts, rond, vit, depart, pause, saut) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": saut, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in faits:
            faits[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((faits[t_], pts[0], extras))
    if not leger:  # un second coureur autour du mât, à l'opposé
        pts, _, vit, depart, pause, saut = chemins[1]
        lots["copies"].append((faits[0], pts[0], {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart + 0.5, "saut": saut, "boucle": 1}))
    Cr = crabe()
    premier = None
    for k, (pts, depart) in enumerate(crabes[:1] if leger else crabes):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": 0.09, "phase": depart, "saut": 0.0, "pause": 2.5, "rayon": 0.04}
        if premier is None:
            premier = len(lots["animes"])
            lots["animes"].append((Cr, pts[0], extras))
        else:
            lots["copies"].append((premier, pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(feu[0]), float(feu[1]), float(fz + 0.45)], "grosseur": 0.5}))
    lots["reperes"].append(((0.5, 0.0, 4.2), {"anim": "oiseaux", "nb": 3 if leger else 6, "rayon": 5.2, "envergure": 0.13}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.4, "genre": 2}))  # pour la mer du site : une île naturelle, son lagon
    # --- sur l'eau (dessiné par le site) : le ressac tout le long du rivage, le reflet du ponton et du canot ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.25 / math.hypot(x, y)), y * (1 + 1.25 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.3)), lg - 0.8, 0.56, math.atan2(dp[1], dp[0]))
    K.tache(Rv, cq[0], cq[1], 0.82, 0.3, math.atan2(dp[1], dp[0]) + 0.1, rond=True, marge=0.26)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts + [Vf.rectangle(hutte[0], hutte[1], 2.1, 1.7, cap_h)]}
    return lots


def verifier(lots=None, leger=False):
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("plage-v5", (11, -22, 12), (0, -0.6, 0.8), 55), ("plage-v5-camp", (-1.5, -13.5, 3.6), (-0.6, -2.6, 0.7), 60)] if rendu else []
    return K.construire("ile-moussaillons-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="plage")  # 3072 : net au plus près ; 2048 sur téléphone
