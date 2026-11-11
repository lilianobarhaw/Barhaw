# L'Archipel des Lucioles, « niveau 5 » : quatre îlots verts reliés par des passerelles de corde. Tout est inventé.
# (Son histoire, dans le bot : « La nuit, des milliers de lucioles dessinent des étoiles au-dessus de l'eau. »)
# La grande île et son arbre aux lanternes, le hameau des veilleurs (une cabane sur pilotis), l'îlot du cercle de pierres,
# l'îlot du ponton et sa barque ; partout des bocaux à lucioles sur leur piquet, des roseaux, des nénuphars. La vie : des
# veilleurs qui passent d'un îlot à l'autre, un qui tourne autour du grand arbre, la barque qui flotte, les roseaux et les
# feuillages au vent. Et les lucioles : le site les dessine (repère « lucioles » : un nuage de points, et des étoiles
# au-dessus des chenaux, qu'on voit surtout la nuit).
# Sorties : ile-lucioles-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
N.matiere("nenuphar", N.tx_uni, 0.4, 0.3, c=0x3f8f4a, graine=341, grain=0.2, taches=0.4, c2=0x62ad55, seuil=0.5)
N.matiere("fleur_rose", N.tx_uni, 0.3, 0.3, c=0xff8fb3, graine=342, grain=0.15, taches=0.3, c2=0xffd0de, seuil=0.5)
N.matiere("roseau", N.tx_uni, 0.3, 0.4, c=0x8fa05a, graine=343, grain=0.25, taches=0.4, c2=0xb8b86a, seuil=0.5)
N.matiere("ecorce_vieille", N.tx_corde, 0.5, 0.9, c=0x5d4632, graine=344)
N.matiere("corde_pont", N.tx_corde, 0.3, 0.8, c=0xb89a6a, graine=345)

# les quatre îlots : (centre, rayon, déphasage de son contour)
ILOTS = {"grande": ((0.2, -0.4), 2.9, 0.4), "hameau": ((5.3, 1.8), 1.8, 1.7), "cercle": ((-3.9, 3.3), 1.7, 2.9), "ponton": ((-3.9, -3.9), 1.45, 4.3)}
R_SOL = 9.6
PISTES = []


def rayon(nom, th):
    """Le rayon de la côte de cet îlot dans cette direction."""
    _, r, ph = ILOTS[nom]
    return r * (1 + 0.1 * math.sin(3 * th + ph) + 0.06 * math.sin(5 * th + 2 * ph))


def _bords(x, y):
    return {nom: rayon(nom, math.atan2(y - c[1], x - c[0])) - math.hypot(x - c[0], y - c[1]) for nom, (c, _, _) in ILOTS.items()}


def bord(x, y):
    """La distance au bord de l'eau de l'îlot le plus proche ; > 0 : à terre."""
    return max(_bords(x, y).values())


def sol(x, y):
    """La hauteur du terrain : la rive qui monte, le dos rond de chaque îlot, la butte du grand arbre."""
    d = bord(x, y)
    if d < 0:
        return max(-1.2, 0.55 * d)
    h = 0.3 * (1 - math.exp(-d / 0.4)) + 0.35 * K.lisse(0.5, 1.4, d)
    h += 0.3 * math.exp(-((x - ARBRE[0]) ** 2 + (y - ARBRE[1]) ** 2) / 1.6) * K.lisse(0.4, 1.0, d)
    h += (K.bruit2(x * 0.9, y * 0.9, 7) - 0.5) * 0.08 * K.lisse(0.5, 1.2, d)
    return h


ARBRE = (0.1, 0.25)  # le grand arbre aux lanternes, au cœur de la grande île


def sur(nom, angle, dedans):
    """Un point de cet îlot : à cet angle (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    c, a = ILOTS[nom][0], math.radians(angle)
    r = rayon(nom, a) - dedans
    return c[0] + math.cos(a) * r, c[1] + math.sin(a) * r


def tx_sol_lucioles(taille=2048, graine=71):
    """Le sol peint pixel par pixel : la vase claire des rives, l'herbe épaisse et sa mousse, des fleurs, la terre des sentiers."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL), n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain, brins = N.bruit(n, 640, 640, graine + 4, 1), N.bruit(n, 760, 250, graine + 5, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    rive, mouille = N.hexa(0xd8c79a), N.hexa(0x8f8a68)
    coul = np.broadcast_to(rive, (n, n, 3)).copy() * (0.9 + 0.12 * b1 + 0.06 * fin + 0.1 * (grain - 0.5) - 0.12 * (semis < 0.015))[..., None]
    coul = N.mel(coul, mouille * (0.88 + 0.18 * b2)[..., None], N.lisse(0.14, 0.02, h + (b2 - 0.5) * 0.06))
    herbe = N.hexa(0x4f8f46) * (0.74 + 0.36 * b2 + 0.16 * fin + 0.32 * (brins - 0.5) + 0.1 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0x2f6b45) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.45, 0.7, b1))  # des plaques de mousse sombre
    herbe = N.mel(herbe, N.hexa(0x8fb04a) * (0.9 + 0.2 * b3)[..., None], N.lisse(0.62, 0.8, b2) * 0.6)  # et d'herbe claire
    coul = N.mel(coul, herbe, N.lisse(0.17, 0.3, h + (b2 - 0.5) * 0.12 + (b3 - 0.5) * 0.08))
    coul = N.mel(coul, np.array([1.0, 0.95, 0.6], np.float32), ((b3 > 0.8) & (semis > 0.8) & (fin > 0.6) & (h > 0.35))[..., None] * 0.85)  # des fleurs jaunes
    coul = N.mel(coul, np.array([0.98, 0.8, 0.9], np.float32), ((b3 < 0.22) & (semis > 0.86) & (fin > 0.62) & (h > 0.35))[..., None] * 0.8)  # des roses
    terre = N.hexa(0x8a6f4c) * (0.82 + 0.28 * b3 + 0.14 * (grain - 0.5) - 0.14 * (semis < 0.02))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.2, 0.08, piste + (b2 - 0.5) * 0.12) * N.lisse(0.15, 0.28, h))
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.35 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_lucioles", tx_sol_lucioles, 2 * R_SOL, 0.35)


# ---------- les pièces ----------
def bocal(L, U, x, y, z, h=0.5):
    """Un bocal à lucioles sur son piquet : la lumière des veilleurs."""
    L.ajouter(*N.cylindre(0.022, 0.018, h + 0.08, 5), "planches_sombres", T(x, y, z - 0.08))
    L.ajouter(*N.cylindre(0.045, 0.045, 0.012, 6), "planches_sombres", T(x, y, z + h))
    U.ajouter(*N.sphere(0.05, 7, 5, 1.15), "luciole", T(x, y, z + h + 0.06))


def arbre(L, U, rng, x, y, z, h=1.8, r=0.75, lanternes=0, mats=("feuillage", "feuillage_sombre")):
    """Un arbre au tronc tordu et à la couronne large (plusieurs boules de feuillage, qui bougent au vent) ; des bocaux à
    lucioles pendent à ses branches."""
    M = T(x, y, z)
    a0 = rng.random() * 6.28
    tronc = [(0, 0, -0.2), (math.cos(a0) * 0.06 * h, math.sin(a0) * 0.06 * h, h * 0.35), (math.cos(a0 + 1.5) * 0.05 * h, math.sin(a0 + 1.5) * 0.05 * h, h * 0.68)]
    L.ajouter(*N.tube(tronc, [0.085 * h, 0.06 * h, 0.04 * h], 7, bouts=False), "ecorce_vieille", M, tourne=True)
    nb = 4 + int(r * 3)
    for k in range(nb):
        a, dd = a0 + k * 2.4, r * 0.55 * (k > 0) * (0.7 + 0.5 * rng.random())
        rk = r * (0.62 if k else 0.8) * (0.85 + 0.3 * rng.random())
        if k:  # une branche jusqu'à sa touffe
            L.ajouter(*N.tube([tronc[2], (math.cos(a) * dd, math.sin(a) * dd, h * (0.74 + 0.05 * (k % 3)))], [0.03 * h, 0.018 * h], 5, bouts=False), "ecorce_vieille", M)
        L.ajouter(*N.sphere(rk, 8, 5, 0.72), mats[k % len(mats)], M @ T(math.cos(a) * dd, math.sin(a) * dd, h * (0.82 + 0.07 * (k % 3))) @ Rz(rng.random() * 3), zone=(1.0, 0.72 - 0.05 * (k % 3), 1.0))
    for k in range(lanternes):
        a, dd = a0 + 0.7 + k * 2 * PI / lanternes, r * (0.45 + 0.4 * rng.random())
        bas = h * (0.34 + 0.16 * rng.random())
        L.ajouter(*N.poutre((math.cos(a) * dd, math.sin(a) * dd, bas + 0.05), (math.cos(a) * dd, math.sin(a) * dd, h * 0.74), 0.008), "corde_pont", M)
        U.ajouter(*N.sphere(0.048, 7, 5, 1.15), "luciole", M @ T(math.cos(a) * dd, math.sin(a) * dd, bas))


def roseaux(L, rng, x, y, z, nb=8):
    """Une touffe de roseaux : des tiges qui penchent et plient au vent, une quenouille brune au bout."""
    for k in range(nb):
        a, dd, h = rng.random() * 6.28, rng.random() * 0.14, 0.34 + rng.random() * 0.3
        p0 = (x + math.cos(a) * dd, y + math.sin(a) * dd, z - 0.1)
        p1 = (p0[0] + math.cos(a) * 0.05, p0[1] + math.sin(a) * 0.05, z + h)
        L.ajouter(*N.poutre(p0, p1, 0.012), "roseau", zone=(1.0, 0.55, 1.0))
        if k % 2 == 0:
            L.ajouter(*N.cylindre(0.017, 0.015, 0.07, 5), "planches_sombres", T(p1[0], p1[1], p1[2] - 0.02), zone=(1.0, 0.45, 1.0))


def passerelle(L, U, a, b, zd, larg=0.42):
    """Une passerelle de planches entre deux îlots : le tablier, ses pieux dans l'eau, des piquets et une corde de chaque
    côté, un bocal à lucioles à chaque bout."""
    Rf.tablier(L, a, b, zd, zd, larg)
    dx, dy = b[0] - a[0], b[1] - a[1]
    lg = math.hypot(dx, dy)
    ux, uy, nx, ny = dx / lg, dy / lg, -dy / lg, dx / lg
    for t in (0.33, 0.67):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.035, 0.03, zd + 0.9, 6, haut=False), "planches_sombres", T(a[0] + dx * t + nx * s * larg * 0.4, a[1] + dy * t + ny * s * larg * 0.4, -0.95))
    for s in (-1, 1):
        pts = [(a[0] + dx * t + nx * s * (larg / 2 - 0.02), a[1] + dy * t + ny * s * (larg / 2 - 0.02)) for t in (0.04, 0.35, 0.65, 0.96)]
        for q in pts:
            L.ajouter(*N.poutre((*q, zd - 0.03), (*q, zd + 0.3), 0.026), "planches_sombres")
        for q0, q1 in zip(pts[:-1], pts[1:]):
            L.ajouter(*N.poutre((*q0, zd + 0.28), (*q1, zd + 0.28), 0.012), "corde_pont")
    for q, s in ((a, 1), (b, -1)):
        bocal(L, U, q[0] - ux * 0.12 * s + nx * (larg / 2 + 0.09), q[1] - uy * 0.12 * s + ny * (larg / 2 + 0.09), zd - 0.05, 0.55)
    return Vf.rectangle((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, lg, larg, math.atan2(dy, dx))


def mailles(graine=59, leger=False):
    """leger : la version téléphone (un relief moins fin, moins d'arbres, de roseaux et de nénuphars, trois marcheurs)."""
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

    # --- le plan : les trois passerelles, les chemins des veilleurs (rien d'autre ne s'y pose) ---
    def vers_ilot(de, a, dedans=0.7):
        """Le point de l'îlot `de` tourné vers l'îlot `a`, à `dedans` du bord."""
        ca, cb = ILOTS[de][0], ILOTS[a][0]
        return sur(de, math.degrees(math.atan2(cb[1] - ca[1], cb[0] - ca[0])), dedans)

    ZD = 0.37  # la hauteur des tabliers
    liens = {nom: (vers_ilot("grande", nom), vers_ilot(nom, "grande")) for nom in ("hameau", "cercle", "ponton")}
    terre = lambda pts: K.suivre(pts, sol)

    def avant(nom, cote, dd=0.4):
        """Un point dans l'axe de cette passerelle, un peu avant son bout (côté 0 : sur la grande île ; 1 : sur l'îlot) :
        on y arrive droit, entre ses deux piquets."""
        qa, qb = liens[nom]
        lg = math.hypot(qb[0] - qa[0], qb[1] - qa[1])
        ux, uy = (qb[0] - qa[0]) / lg, (qb[1] - qa[1]) / lg
        return (qa[0] - ux * dd, qa[1] - uy * dd) if cote == 0 else (qb[0] + ux * dd, qb[1] + uy * dd)

    pont = lambda nom, sens=1: [(*q, ZD + 0.02) for q in liens[nom][::sens]]
    cg, ch, cc, cp = (ILOTS[k][0] for k in ("grande", "hameau", "cercle", "ponton"))
    hutte = (ch[0] + 0.75, ch[1] + 0.2)  # la cabane, à moitié sur l'eau du côté de l'est ; sa terrasse regarde la passerelle
    quai_a, quai_b = sur("ponton", -70, 0.55), sur("ponton", -70, -1.35)  # le ponton : de l'herbe vers le large
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        (terre([avant("cercle", 1), liens["cercle"][1]])[:-1] + pont("cercle", -1) + terre([liens["cercle"][0], avant("cercle", 0), (ARBRE[0] - 1.5, ARBRE[1] + 0.5)])[1:], False, 0.17, 0.0, 3.0),
        ([(ARBRE[0] + math.cos(a) * 1.25, ARBRE[1] + math.sin(a) * 1.25, sol(ARBRE[0] + math.cos(a) * 1.25, ARBRE[1] + math.sin(a) * 1.25) + 0.02) for a in np.arange(0, 2 * PI - 0.01, PI / 12)], True, 0.16, 0.3, 0),
        (terre([(cg[0] + 1.3, cg[1] - 0.2), avant("hameau", 0), liens["hameau"][0]])[:-1] + pont("hameau") + terre([liens["hameau"][1], avant("hameau", 1, 0.2)])[1:], False, 0.18, 0.5, 2.5),
        (terre([quai_a, avant("ponton", 1), liens["ponton"][1]])[:-1] + pont("ponton", -1) + terre([liens["ponton"][0], avant("ponton", 0), (cg[0] - 0.9, cg[1] - 1.5), (cg[0] + 0.7, cg[1] - 1.9)])[1:], False, 0.17, 0.7, 3.0),
    ]
    couloirs = [(pts, 0.07) for pts, *_ in chemins]

    def libre(x, y, r):
        """Cette place (un objet de rayon r) est-elle à terre, hors des passages et loin de ce qui est déjà posé ?"""
        if sol(x, y) < 0.1 or any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for p in ponts)

    def libre_eau(x, y, r):
        return sol(x, y) < -0.1 and all(Vf.penetration(Vf.rond(x, y, r + 0.12), p) == 0 for _, p in emprises) and math.hypot(x, y) < 7.2

    # --- le terrain (d'un seul tenant, à sommets partagés : la lumière glisse sur les buttes) ---
    n, R = (52 if leger else 68), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    PISTES[:] = [pts for pts, *_ in chemins]
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
    L.ajouter(sommets, faces, "sol_lucioles", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    # --- les trois passerelles ---
    for nom, (qa, qb) in liens.items():
        ponts.append(passerelle(L, U, qa, qb, ZD))
        emprises.append((f"la passerelle du {nom}", ponts[-1]))

    # --- le grand arbre aux lanternes, sur sa butte ; un banc de pierre à son pied ---
    arbre(L, U, rng, ARBRE[0], ARBRE[1], sol(*ARBRE), 3.3, 1.55, 5 if leger else 9, ("feuillage", "feuillage_sombre", "feuillage_dore"))
    SOL.append(("decor", "le grand arbre", Vf.rond(ARBRE[0], ARBRE[1], 0.42)))

    # --- le hameau des veilleurs : une cabane sur pilotis, des bocaux autour ---
    zh = max(0.05, min(sol(hutte[0] + dx, hutte[1] + dy) for dx in (-1.1, 1.1) for dy in (-0.85, 0.85)))  # ses pilotis de l'est sont dans l'eau
    Rf.cabane(L, U, hutte[0], hutte[1], PI, 0.42, zh - 0.02)
    SOL.append(("decor", "la cabane des veilleurs", Vf.rectangle(hutte[0], hutte[1], 2.5, 1.9, PI)))

    # --- l'îlot du cercle : six pierres levées, un grand bocal sur son socle au milieu ---
    for k in range(6):
        a = k * PI / 3 + 0.3
        x, y = cc[0] + math.cos(a) * 0.82, cc[1] + math.sin(a) * 0.82
        if not libre(x, y, 0.12):
            continue
        hh = 0.42 + 0.2 * rng.random()
        L.ajouter(*N.boite(0.2, 0.13, hh), "roche", T(x, y, sol(x, y) - 0.06) @ Rz(a + PI / 2) @ Rx(0.08 * math.sin(k * 2.1)), tourne=True)
        SOL.append(("rocher", "une pierre levée", Vf.rond(x, y, 0.13)))
    zc = sol(*cc)
    L.ajouter(*N.cylindre(0.16, 0.13, 0.26, 8), "roche_claire", T(cc[0], cc[1], zc - 0.04))
    U.ajouter(*N.sphere(0.1, 8, 6, 1.1), "luciole", T(cc[0], cc[1], zc + 0.33))
    SOL.append(("decor", "le socle du cercle", Vf.rond(cc[0], cc[1], 0.2)))

    # --- l'îlot du ponton : le ponton, sa barque ---
    dq = math.atan2(quai_b[1] - quai_a[1], quai_b[0] - quai_a[0])
    Rf.tablier(L, quai_a, quai_b, 0.36, 0.36, 0.45)
    lgq = math.hypot(quai_b[0] - quai_a[0], quai_b[1] - quai_a[1])
    for t in (0.45, 0.92):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.035, 0.03, 1.2, 6, haut=False), "planches_sombres", T(quai_a[0] + math.cos(dq) * lgq * t - math.sin(dq) * s * 0.18, quai_a[1] + math.sin(dq) * lgq * t + math.cos(dq) * s * 0.18, -0.9))
    ponts.append(Vf.rectangle((quai_a[0] + quai_b[0]) / 2, (quai_a[1] + quai_b[1]) / 2, lgq, 0.45, dq))
    emprises.append(("le ponton", ponts[-1]))
    bq = (quai_b[0] - math.cos(dq) * 0.5 - math.sin(dq) * 0.55, quai_b[1] - math.sin(dq) * 0.5 + math.cos(dq) * 0.55)
    Bq = N.Maille("barque")
    P.barque(Bq, rng, 0, 0, dq + 0.12)
    lots["animes"].append((Bq, (bq[0], bq[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.5}))
    emprises.append(("la barque", Vf.rectangle(bq[0], bq[1], 0.8, 0.32, dq + 0.12)))

    # --- les arbres des quatre îlots (quelques bocaux dans leurs branches) ---
    places = [("grande", 200, 0.9), ("grande", 300, 0.8), ("hameau", 110, 0.55), ("cercle", 60, 0.5), ("ponton", 150, 0.55), ("grande", 20, 1.0), ("grande", 150, 0.75),
              ("hameau", 250, 0.5), ("cercle", 200, 0.45), ("grande", 250, 1.3), ("hameau", 30, 0.5), ("ponton", 40, 0.5), ("grande", 95, 0.7),
              ("grande", 340, 0.6), ("grande", 180, 0.5), ("grande", 270, 0.55), ("cercle", 130, 0.4), ("ponton", 230, 0.45), ("hameau", 180, 0.4), ("grande", 60, 0.6), ("grande", 225, 0.45)]
    for k, (nom, a, dd) in enumerate(places[:10 if leger else 21]):
        x, y = sur(nom, a + (rng.random() - 0.5) * 12, dd)
        rr = 0.55 + rng.random() * 0.35
        if not libre(x, y, 0.28):  # le tronc, loin des sentiers
            continue
        arbre(L, U, rng, x, y, sol(x, y), 1.3 + rng.random() * 0.9, rr, 1 if k % 3 == 0 else 0)
        SOL.append(("arbre", "un arbre", Vf.rond(x, y, 0.2)))

    # --- les bocaux à lucioles sur leur piquet, le long des sentiers ---
    for k in range(7 if leger else 12):
        pts = chemins[k % len(chemins)][0]
        q = pts[(3 + k * 5) % len(pts)]
        a = rng.random() * 6.28
        x, y = q[0] + math.cos(a) * 0.3, q[1] + math.sin(a) * 0.3
        if not libre(x, y, 0.06):
            continue
        bocal(L, U, x, y, sol(x, y))
        SOL.append(("rocher", "un bocal à lucioles", Vf.rond(x, y, 0.06)))

    # --- les roseaux, au bord de l'eau ; les nénuphars et leurs fleurs, dans les chenaux ---
    for k in range(9 if leger else 20):
        nom = list(ILOTS)[k % 4]
        x, y = sur(nom, rng.random() * 360, -0.05 + rng.random() * 0.22)
        if any(Vf.penetration(Vf.rond(x, y, 0.22), p) > 0 for p in ponts) or any(K.distance_au_trajet(x, y, pts) < 0.3 for pts, _ in couloirs):
            continue
        roseaux(L, rng, x, y, max(0.0, sol(x, y)), 5 if leger else 8)
    faits = 0
    for essai in range(400):
        if faits >= (8 if leger else 18):
            break
        a, r = rng.random() * 2 * PI, 2.0 + rng.random() * 4.6
        x, y, rr = math.cos(a) * r, math.sin(a) * r, 0.1 + rng.random() * 0.09
        if not libre_eau(x, y, rr) or bord(x, y) < -1.3:
            continue
        L.ajouter(*N.cylindre(rr, rr * 0.96, 0.012, 9), "nenuphar", T(x, y, 0.036) @ Rz(a))
        if faits % 3 == 0:
            L.ajouter(*N.sphere(rr * 0.32, 6, 4, 0.8), "fleur_rose", T(x + rr * 0.2, y, 0.06))
        emprises.append(("un nénuphar", Vf.rond(x, y, rr)))
        faits += 1

    # --- les veilleurs (immobiles) : deux sur la terrasse, un dans le cercle, un au bout du ponton, un sous le grand arbre ---
    def poser(x, y, zz=None, cap=None):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz)
        SOL.append(("passant", "un veilleur", Vf.rond(x, y, 0.065)))

    zt = zh - 0.02 + 0.42 + 0.07
    poser(hutte[0] - 0.8, hutte[1] + 0.45, zt, 2.6)
    poser(hutte[0] - 0.95, hutte[1] - 0.45, zt, -2.6)
    poser(cc[0] + 0.4, cc[1] + 0.3, None, 3.8)
    poser(quai_b[0] - math.cos(dq) * 0.2, quai_b[1] - math.sin(dq) * 0.2, 0.38, dq)
    poser(ARBRE[0] + 0.62, ARBRE[1] - 0.5, None, 2.3)

    # --- la vie : les veilleurs qui marchent ; les lucioles (dessinées par le site) ; les oiseaux ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"veilleur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.022, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    etoiles = []  # les étoiles que dessinent les lucioles : au-dessus de chaque chenal, à côté de sa passerelle (x, y, z, rayon)
    for nom, (qa, qb) in list(liens.items())[:2 if leger else 3]:
        mx, my, dx, dy = (qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2, qb[0] - qa[0], qb[1] - qa[1]
        lg = math.hypot(dx, dy)
        etoiles += [round(mx - dy / lg * 1.25, 2), round(my + dx / lg * 1.25, 2), 1.5, 0.72]
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "lucioles", "nb": 110 if leger else 230, "rayon": 7.2, "haut": 2.6, "etoiles": etoiles}))
    lots["reperes"].append(((0.0, 0.0, 4.2), {"anim": "oiseaux", "nb": 2 if leger else 4, "rayon": 5.4, "envergure": 0.13}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.8, "genre": 2}))

    # --- sur l'eau (dessiné par le site) : le ressac autour de chaque îlot, l'ombre des passerelles, du ponton, de la barque ---
    Rv = N.Maille("rivage")
    for nom, (c, _, _) in ILOTS.items():
        tour = [(math.cos(a), math.sin(a), rayon(nom, a)) for a in np.linspace(0, 2 * PI, 91)]
        K.bande(Rv, [(c[0] + ca * (r - 0.03), c[1] + sa * (r - 0.03)) for ca, sa, r in tour], [(c[0] + ca * (r + 0.55), c[1] + sa * (r + 0.55)) for ca, sa, r in tour], mat="ecume", boucle=True)
    for nom, (qa, qb) in liens.items():
        K.tache(Rv, (qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2, math.hypot(qb[0] - qa[0], qb[1] - qa[1]) - 1.3, 0.42, math.atan2(qb[1] - qa[1], qb[0] - qa[0]), marge=0.28)
    K.tache(Rv, quai_a[0] + math.cos(dq) * (lgq / 2 + 0.3), quai_a[1] + math.sin(dq) * (lgq / 2 + 0.3), lgq - 0.7, 0.45, dq, marge=0.28)
    K.tache(Rv, bq[0], bq[1], 0.78, 0.3, dq + 0.12, rond=True, marge=0.24)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("lucioles-v5", (9, -20, 12), (0.4, 0, 0.5), 55), ("lucioles-v5-arbre", (3.6, -8.5, 3.6), (0.4, 0.2, 1.0), 60)] if rendu else []
    return K.construire("ile-lucioles-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="lucioles")
