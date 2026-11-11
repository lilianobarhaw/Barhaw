# L'Île Braise, « niveau 5 » : un volcan de basalte noir, son lac de lave, deux coulées qui descendent jusqu'à la mer. Tout
# est inventé.
# (Son histoire, dans le bot : « Le sol est chaud et le volcan gronde : on fait griller des brochettes au-dessus de la lave. »)
# Le cratère et son lac de lave, les deux coulées (la matière « lave » du site : elle coule et éclaire la roche), la
# grillade au bord de la coulée de l'est (une dalle, une grille de fer, des brochettes), le pont de bois par-dessus, le
# hameau de cases en pierre au sud-ouest, le ponton et sa barque, les orgues de basalte du nord, des aiguilles
# d'obsidienne, des arbres calcinés. La vie : des habitants qui marchent (du ponton au hameau, du hameau à la grillade,
# par le pont), la fumée du cratère, les étincelles, la vapeur là où la lave touche la mer.
# Sorties : ile-braise-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
N.matiere("basalte", N.tx_roche, 2.2, 1.0, c=0x4b4548, graine=371)
N.matiere("basalte_clair", N.tx_roche, 2.2, 1.0, c=0x6c6468, graine=372)
N.matiere("obsidienne", N.tx_uni, 0.8, 0.4, rugueux=0.25, metal=0.3, c=0x1e1826, graine=373, grain=0.15, taches=0.45, c2=0x4a3f66, seuil=0.55)
N.matiere("bois_brule", N.tx_corde, 0.4, 0.9, c=0x2b2523, graine=374)
N.matiere("viande", N.tx_uni, 0.2, 0.3, c=0x9a4a2e, graine=375, grain=0.25, taches=0.4, c2=0xd08a4a, seuil=0.5)

VOLCAN = (0.6, 2.0)  # le sommet
R_SOL = 9.6
PISTES = []
COULEES = [  # la lave, du cratère à la mer : vers le sud-est, vers l'ouest
    [(0.95, 1.35), (1.6, 0.4), (2.6, -0.5), (3.6, -1.6), (4.6, -2.6), (5.7, -3.7), (6.3, -4.3)],
    [(-0.1, 2.25), (-1.2, 2.0), (-2.6, 1.5), (-4.0, 1.2), (-5.4, 1.2), (-6.9, 1.3), (-7.5, 1.35)],
]


def rivage(th):
    """Le rayon de la côte dans cette direction."""
    return 6.9 + 0.5 * math.sin(2 * th + 0.3) + 0.4 * math.sin(3 * th + 1.7) + 0.25 * math.sin(7 * th)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def coulee(x, y):
    """La distance à la coulée de lave la plus proche."""
    return min(K.distance_au_trajet(x, y, c) for c in COULEES)


def sol(x, y):
    """La hauteur du terrain : la grève de sable noir, les basses terres, le cône, son cratère, le lit des coulées."""
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.5 * d)
    rv = math.hypot(x - VOLCAN[0], y - VOLCAN[1])
    h = 0.3 * (1 - math.exp(-d / 0.7)) + 0.35 * K.lisse(1.0, 3.0, d)
    h += 4.0 * math.exp(-((rv / 2.3) ** 2)) * K.lisse(0.3, 1.6, d)
    h -= 1.5 * math.exp(-((rv / 0.75) ** 2))
    h -= 0.2 * K.lisse(0.5, 0.0, coulee(x, y)) * K.lisse(0.15, 0.7, d)
    h += (K.bruit2(x * 1.3, y * 1.3, 13) - 0.5) * (0.1 + 0.16 * K.lisse(0.6, 2.6, h)) * K.lisse(0.5, 1.6, d)
    return h


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def tx_sol_braise(taille=2048, graine=91):
    """Le sol peint pixel par pixel : le sable noir de la grève, le basalte et ses plaques de cendre, la roche rougie du
    cône, les fissures qui rougeoient, la lueur le long des coulées, un peu d'herbe sèche au sud, la terre des sentiers."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL), n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    dc = K.agrandir(K.champ(coulee, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    sable, mouille = N.hexa(0x46403f), N.hexa(0x2c292b)
    coul = np.broadcast_to(sable, (n, n, 3)).copy() * (0.9 + 0.14 * b1 + 0.08 * fin + 0.14 * (grain - 0.5) + 0.3 * (semis > 0.99))[..., None]
    coul = N.mel(coul, mouille * (0.9 + 0.15 * b2)[..., None], N.lisse(0.16, 0.02, h + (b2 - 0.5) * 0.06))
    roche = N.hexa(0x4f494c) * (0.74 + 0.3 * b3 + 0.16 * fin + 0.12 * (grain - 0.5) + 0.07 * np.sin((h * 6 + b1 * 3) * 2 * PI))[..., None]
    roche = N.mel(roche, N.hexa(0x7a7376) * (0.85 + 0.25 * b3)[..., None], N.lisse(0.55, 0.75, b1) * 0.8)  # des plaques de cendre claire
    veines = np.abs(((b2 * 4.0 + b1 * 2.0 + b3 * 0.6) % 1.0) - 0.5)  # un réseau de fissures
    roche *= (1 - 0.4 * N.lisse(0.03, 0.0, veines))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.22, 0.4, h + (b2 - 0.5) * 0.14))
    coul = N.mel(coul, N.hexa(0x7b3d2b) * (0.8 + 0.3 * b3)[..., None], N.lisse(1.7, 3.3, h + (b2 - 0.5) * 0.5) * 0.7)  # le cône rougi
    coul = N.mel(coul, N.hexa(0x8f8c4e) * (0.8 + 0.3 * fin)[..., None], ((b3 > 0.66) & (b1 < 0.5))[..., None] * N.lisse(0.9, 0.5, h)[..., None] * N.lisse(0.25, 0.4, h)[..., None] * 0.7)  # l'herbe sèche
    terre = N.hexa(0x655a58) * (0.85 + 0.25 * b3 + 0.12 * (grain - 0.5))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.2, 0.08, piste + (b2 - 0.5) * 0.12) * N.lisse(0.2, 0.34, h))
    coul = N.mel(coul, N.hexa(0xff5a14), (N.lisse(0.022, 0.0, veines) * N.lisse(0.9, 2.2, h) * (b1 > 0.35))[..., None] * 0.85)  # les fissures qui rougeoient
    coul = N.mel(coul, N.hexa(0xff6a1a), N.lisse(0.75, 0.3, dc + (b2 - 0.5) * 0.2) * N.lisse(-0.05, 0.1, h) * 0.6)  # la lueur des coulées
    coul = N.mel(coul, N.hexa(0x1c1414), N.lisse(0.42, 0.3, dc + (b3 - 0.5) * 0.1) * N.lisse(-0.05, 0.1, h) * 0.8)  # la roche brûlée de leurs bords
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.4 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_braise", tx_sol_braise, 2 * R_SOL, 0.5)


# ---------- les pièces ----------
def ruban_de_lave(U, pts, l0=0.3, l1=0.75):
    """Une coulée : un ruban qui suit le relief (u le long, v en travers, pour que le site la fasse couler)."""
    trajet = K.suivre(pts, sol, 0.25)
    v, uv, f, u = [], [], [], 0.0
    for k, q in enumerate(trajet):
        a, b = trajet[max(0, k - 1)], trajet[min(len(trajet) - 1, k + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        lg = math.hypot(dx, dy) or 1.0
        t = k / (len(trajet) - 1)
        larg = (l0 + (l1 - l0) * t) * (1 + 0.18 * math.sin(k * 0.9))
        zz = max(0.035, sol(q[0], q[1]) + 0.05)
        if k:
            u += math.hypot(q[0] - trajet[k - 1][0], q[1] - trajet[k - 1][1])
        v += [(q[0] + dy / lg * larg / 2, q[1] - dx / lg * larg / 2, zz), (q[0] - dy / lg * larg / 2, q[1] + dx / lg * larg / 2, zz)]
        uv += [(u, 0.0), (u, 1.0)]
        if k:
            f.append((2 * k - 2, 2 * k - 1, 2 * k + 1, 2 * k))
    U.ajouter(v, f, "lave", uv=uv)


def flaque_de_lave(U, x, y, z, r, n=12):
    """Un lac ou une flaque de lave (u, v : sa place, pour que la croûte dérive)."""
    v = [(x, y, z)] + [(x + math.cos(2 * PI * k / n) * r * (1 + 0.12 * math.sin(k * 2.3)), y + math.sin(2 * PI * k / n) * r * (1 + 0.12 * math.sin(k * 2.3)), z) for k in range(n)]
    U.ajouter(v, [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)], "lave", uv=[(x, 0.5)] + [(x + math.cos(2 * PI * k / n) * r, 0.5 + 0.42 * math.sin(2 * PI * k / n)) for k in range(n)])


def case(L, V, U, rng, x, y, z, cap):
    """Une case de pierre : des murs de basalte, un toit de tuiles, une porte, une fenêtre qui s'allume, une cheminée."""
    M = T(x, y, z - 0.05) @ Rz(cap)
    L.ajouter(*N.boite(0.95, 0.78, 0.55, haut=False), "basalte_clair", M, tourne=True)
    v, f = N.toit_pointe(0.74, 0.5, 4, 0.14)
    L.ajouter(v, f, rng.choice(["tuiles_brunes", "tuiles_rouges"]), M @ T(0, 0, 0.55), tourne=True)
    L.ajouter(*N.quad((0.477, -0.14, 0.02), (0.477, 0.14, 0.02), (0.477, 0.14, 0.42), (0.477, -0.14, 0.42)), "porte", M)
    V.ajouter(*N.boite(0.03, 0.16, 0.16), "vitre", M @ T(-0.1, 0.39, 0.25) @ Rz(PI / 2))
    L.ajouter(*N.boite(0.14, 0.14, 0.4), "basalte", M @ T(-0.25, -0.12, 0.6))
    return (M @ np.array((-0.25, -0.12, 1.02, 1)))[:3]


def aiguilles(L, rng, x, y, z, nb=4):
    """Des aiguilles d'obsidienne : des prismes noirs et luisants, qui pointent de travers."""
    for k in range(nb):
        a, dd, h = rng.random() * 6.28, rng.random() * 0.22, 0.35 + rng.random() * 0.75
        L.ajouter(*N.cylindre(0.06 + 0.08 * rng.random(), 0.0, h, 5, haut=False), "obsidienne", T(x + math.cos(a) * dd, y + math.sin(a) * dd, z - 0.08) @ Rz(a) @ Rx(0.12 + 0.25 * rng.random()))


def arbre_calcine(L, rng, x, y, z):
    """Un arbre mort, noirci : un tronc tordu, trois branches nues."""
    h, a0 = 0.9 + rng.random() * 0.7, rng.random() * 6.28
    M = T(x, y, z)
    haut = (math.cos(a0) * 0.12 * h, math.sin(a0) * 0.12 * h, h)
    L.ajouter(*N.tube([(0, 0, -0.15), (math.cos(a0) * 0.05, math.sin(a0) * 0.05, h * 0.5), haut], [0.06 * h, 0.045 * h, 0.02 * h], 6), "bois_brule", M, tourne=True)
    for k in range(3):
        a, zz = a0 + 1.2 + k * 2.1, h * (0.5 + 0.14 * k)
        L.ajouter(*N.tube([(0, 0, zz), (math.cos(a) * 0.22 * h, math.sin(a) * 0.22 * h, zz + 0.18 * h), (math.cos(a + 0.4) * 0.36 * h, math.sin(a + 0.4) * 0.36 * h, zz + 0.2 * h)], [0.028 * h, 0.018 * h, 0.008 * h], 5), "bois_brule", M)


def mailles(graine=73, leger=False):
    """leger : la version téléphone (un relief moins fin, moins d'aiguilles et d'arbres, trois marcheurs)."""
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

    # --- le plan : le ponton, le pont sur la coulée, la grillade, le hameau, les chemins (rien d'autre ne s'y pose) ---
    pa, pb = np.array(vers(-100, 0.6)), np.array(vers(-100, -2.1))  # le ponton : de la grève vers le large
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    lg, ZQ = float(np.linalg.norm(pb - pa)), 0.4
    A, B = np.array((3.46, -2.74)), np.array((4.74, -1.46))  # le pont de bois, par-dessus la coulée de l'est
    ub = (B - A) / np.linalg.norm(B - A)
    ZP = max(sol(*A), sol(*B)) + 0.14
    grill = (2.58, -1.52)  # la grillade, sur la rive ouest de la coulée
    hameau = [(-3.05, -3.55, 0.5), (-0.85, -4.05, 1.2), (-3.5, -2.25, -0.2), (-1.85, -2.05, 2.0)]
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    arc = lambda a0, a1, dedans, pas=3: [z(vers(a, dedans)) for a in np.arange(a0, a1 + 0.01, pas)]
    terre = lambda pts: K.suivre(pts, sol)
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        ([(*(pa + dp * (lg - 0.85)), ZQ + 0.02), (*(pa + dp * 0.5), ZQ + 0.02)] + terre([pa - dp * 0.3, (-1.6, -4.6), (-2.1, -3.05)]), False, 0.18, 0.0, 3.0),
        (terre([(-1.2, -2.95), (0.3, -2.5), (1.6, -2.05), (grill[0] - 0.45, grill[1] - 0.3)]), False, 0.17, 0.4, 4.0),
        (terre([(2.3, -3.2), tuple(A - ub * 0.4), tuple(A)])[:-1] + [(*A, ZP + 0.02), (*B, ZP + 0.02)] + terre([tuple(B), tuple(B + ub * 0.4), vers(-6, 1.3)])[1:], False, 0.17, 0.2, 2.5),
        (arc(196, 246, 1.3), False, 0.16, 0.7, 2.5),
    ]
    couloirs = [(pts, 0.07) for pts, *_ in chemins]

    def libre(x, y, r):
        """Cette place est-elle à terre, hors des passages, loin de la lave et de ce qui est déjà posé ?"""
        if sol(x, y) < 0.14 or coulee(x, y) < r + 0.55 or any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for p in ponts)

    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n, R = (56 if leger else 74), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    PISTES[:] = [chemins[0][0][2:], chemins[1][0]]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    for j in range(n):
        for i in range(n):
            if max(H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i]) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_braise", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    # --- la lave : le lac du cratère, les deux coulées, trois flaques au pied du cône ---
    zc = sol(*VOLCAN)
    flaque_de_lave(U, VOLCAN[0], VOLCAN[1], zc + 0.16, 0.7, 14)
    for c in COULEES:
        ruban_de_lave(U, c)
    for x, y, r in ((2.4, 3.1, 0.3), (-1.4, 0.3, 0.26), (1.9, 3.9, 0.22))[:2 if leger else 3]:
        flaque_de_lave(U, x, y, sol(x, y) + 0.04, r, 9)
        SOL.append(("dur", "une flaque de lave", Vf.rond(x, y, r + 0.1)))

    # --- le ponton et sa barque ---
    Rf.tablier(L, tuple(pa), tuple(pb), ZQ, ZQ, 0.5)
    for k in range(int(lg / 0.6) + 1):
        for s in (-1, 1):
            q = pa + dp * (0.2 + k * 0.6) + np.array((-dp[1], dp[0])) * s * 0.22
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6, haut=False), "planches_sombres", T(q[0], q[1], -0.85))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.5, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[0]))
    bq = pa + dp * (lg - 0.6) + np.array((-dp[1], dp[0])) * 0.62
    Bq = N.Maille("barque")
    P.barque(Bq, rng, 0, 0, math.atan2(dp[1], dp[0]) + 0.1)
    lots["animes"].append((Bq, (bq[0], bq[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.7}))
    emprises.append(("la barque", Vf.rectangle(bq[0], bq[1], 0.8, 0.32, math.atan2(dp[1], dp[0]) + 0.1)))

    # --- le pont de bois par-dessus la coulée : le tablier, quatre poteaux, deux cordes, une lanterne à chaque bout ---
    Rf.tablier(L, tuple(A), tuple(B), ZP, ZP, 0.46)
    nb_ = np.array((-ub[1], ub[0]))
    for t in (0.0, 1.0):
        for s in (-1, 1):
            q = A + (B - A) * t + nb_ * s * 0.21
            L.ajouter(*N.cylindre(0.035, 0.03, 0.55 + ZP - sol(*q), 6), "bois_brule", T(q[0], q[1], sol(*q) - 0.1))
            U.ajouter(*N.sphere(0.04, 6, 4, 1.2), "lumiere", T(q[0], q[1], ZP + 0.5)) if s > 0 else None
    for s in (-1, 1):
        L.ajouter(*N.poutre((*(A + nb_ * s * 0.21), ZP + 0.32), (*(B + nb_ * s * 0.21), ZP + 0.32), 0.014), "fer")
    ponts.append(Vf.rectangle(*((A + B) / 2), float(np.linalg.norm(B - A)), 0.46, math.atan2(ub[1], ub[0])))

    # --- la grillade : une dalle au bord de la coulée, une grille de fer au-dessus de la lave, des brochettes ---
    zg = sol(*grill)
    ag = math.atan2(-1.05 - grill[1], 3.1 - grill[0])  # vers la lave
    Mg = T(grill[0], grill[1], zg) @ Rz(ag)
    L.ajouter(*N.boite(0.7, 0.9, 0.12), "basalte_clair", Mg @ T(0, 0, -0.03), tourne=True)
    for k in range(5):
        L.ajouter(*N.poutre((0.3, -0.32 + k * 0.16, 0.16), (0.98, -0.32 + k * 0.16, 0.2), 0.014), "fer", Mg)
    for sy in (-0.36, 0.36):
        L.ajouter(*N.poutre((0.28, sy, 0.16), (1.0, sy, 0.2), 0.022), "fer", Mg)
    for k in range(4):  # les brochettes : une pique de bois, trois morceaux
        yb = -0.26 + k * 0.17
        L.ajouter(*N.poutre((0.42, yb, 0.215), (0.92, yb + 0.03, 0.235), 0.01), "planches_claires", Mg)
        for m in range(3):
            L.ajouter(*N.boite(0.05, 0.045, 0.04), ("viande", "peint_vert", "viande")[m], Mg @ T(0.56 + m * 0.11, yb + 0.01 + m * 0.006, 0.2))
    SOL.append(("decor", "la grillade", Vf.rectangle(grill[0], grill[1], 0.8, 1.0, ag)))

    # --- le hameau : quatre cases de pierre ---
    cheminees = []
    for x, y, cap in hameau[:3 if leger else 4]:
        cheminees.append(case(L, V, U, rng, x, y, sol(x, y), cap))
        SOL.append(("decor", "une case", Vf.rectangle(x, y, 1.05, 0.9, cap)))

    # --- les orgues de basalte, sur la côte du nord-est ; les aiguilles d'obsidienne ; les arbres calcinés ; des rochers ---
    for k in range(9 if leger else 16):
        x, y = vers(52 + (k % 8) * 3.2, 0.25 + 0.3 * (k // 8) + 0.1 * math.sin(k * 1.7))
        hh = 0.5 + 0.9 * abs(math.sin(k * 1.3 + 0.4))
        L.ajouter(*N.cylindre(0.17, 0.17, hh + 0.3, 6), "basalte", T(x, y, max(0.0, sol(x, y)) - 0.3) @ Rz(k * 0.5), tourne=True)
    SOL.append(("decor", "les orgues de basalte", Vf.rond(*vers(64, 0.4), 0.95)))
    faits = 0
    for essai in range(300):
        if faits >= (7 if leger else 15):
            break
        x, y = vers(rng.random() * 360, 0.5 + rng.random() * 4.0)
        if not libre(x, y, 0.3):
            continue
        aiguilles(L, rng, x, y, sol(x, y), 3 if leger else 4)
        SOL.append(("rocher", "des aiguilles d'obsidienne", Vf.rond(x, y, 0.28)))
        faits += 1
    faits = 0
    for essai in range(300):
        if faits >= (4 if leger else 9):
            break
        x, y = vers(rng.random() * 360, 0.9 + rng.random() * 3.2)
        if not libre(x, y, 0.2) or sol(x, y) > 1.6:
            continue
        arbre_calcine(L, rng, x, y, sol(x, y))
        SOL.append(("arbre", "un arbre calciné", Vf.rond(x, y, 0.12)))
        faits += 1
    for k in range(8 if leger else 16):
        x, y = vers(rng.random() * 360, 0.3 + rng.random() * 3.6)
        r = 0.14 + rng.random() * 0.26
        if not libre(x, y, r):
            continue
        L.ajouter(*N.sphere(r, 6, 4, 0.65), rng.choice(["basalte", "basalte_clair"]), T(x, y, sol(x, y)) @ Rz(k) @ Rx(0.2 * math.sin(k)))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r * 0.85)))

    # --- les habitants (immobiles) : deux à la grillade, un sur le pont, deux au hameau, un au bout du ponton ---
    def poser(x, y, zz=None, cap=None):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz)
        SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))

    for dy in (-0.25, 0.28):
        q = Mg @ np.array((0.12, dy, 0.09, 1))
        poser(q[0], q[1], zg + 0.09, ag)
    veille = B + ub * 0.75 + nb_ * 0.4  # un qui regarde la lave, au bout du pont
    poser(veille[0], veille[1], None, math.atan2(-ub[1], -ub[0]) + 0.5)
    poser(-2.6, -2.75, None, 0.8)
    poser(-1.55, -3.2, None, 2.6)
    bout = pa + dp * (lg - 0.2) - np.array((-dp[1], dp[0])) * 0.12
    poser(bout[0], bout[1], ZQ + 0.02, math.atan2(dp[1], dp[0]))

    # --- la vie : les habitants qui marchent, la fumée, les étincelles, la vapeur ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"habitant{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.022, "pause": pause}
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(VOLCAN[0]), float(VOLCAN[1]), float(zc + 0.7)], "grosseur": 1.5}))
    petites = [c for q in cheminees for c in (float(q[0]), float(q[1]), float(q[2]))] + [6.25, -4.25, 0.15, -7.4, 1.35, 0.15]  # les cheminées, et la vapeur là où la lave touche la mer
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": petites, "grosseur": 0.55}))
    lots["reperes"].append(((float(VOLCAN[0]), float(VOLCAN[1]), float(zc + 0.3)), {"anim": "etincelles"}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.8, "genre": 2}))

    # --- sur l'eau (dessiné par le site) : le ressac tout le long du rivage, l'ombre du ponton et de la barque ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.3)), lg - 0.7, 0.5, math.atan2(dp[1], dp[0]))
    K.tache(Rv, bq[0], bq[1], 0.78, 0.3, math.atan2(dp[1], dp[0]) + 0.1, rond=True, marge=0.24)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("braise-v5", (10, -20, 12), (0.3, 0.3, 1.2), 55), ("braise-v5-grillade", (6.0, -8.0, 3.2), (2.9, -1.4, 0.6), 60)] if rendu else []
    return K.construire("ile-braise-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="braise")
