# L'Île aux Champignons Géants, « niveau 5 » : une île de mousse où poussent des champignons hauts comme des maisons, et le
# repaire que des pirates y ont monté. Tout est inventé.
# (Son histoire, dans le bot : « Des champignons hauts comme des maisons. Interdiction formelle d'en goûter un. »)
# La crique du sud et son ponton, le cotre des pirates à l'ancre, le camp dans la clairière (le feu, la tente, les
# tonneaux, le coffre), le panneau d'interdiction, le plus gros champignon aménagé en maison (une porte, des fenêtres, un
# balcon, une échelle de corde, une cheminée qui fume), des champignons de toutes tailles, certains qui luisent la nuit.
# La vie : des pirates qui marchent entre le ponton, le camp et la maison, la fumée, les spores, les oiseaux.
# Sorties : ile-champignons-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
CHAPEAUX = {"chapeau_rouge": (0xc23a32, 0xe0655a), "chapeau_violet": (0x7b4bb0, 0xa87fd6), "chapeau_orange": (0xe07f2c, 0xf2b05e), "chapeau_bleu": (0x2f9fb0, 0x7fd0d8), "chapeau_brun": (0x8a5a36, 0xb98958)}
for _k, (_nom, (_c, _c2)) in enumerate(CHAPEAUX.items()):
    N.matiere(_nom, N.tx_uni, 0.9, 0.5, c=_c, graine=351 + _k, grain=0.2, taches=0.5, c2=_c2, seuil=0.5)
N.matiere("pied_champi", N.tx_corde, 0.6, 0.6, c=0xe6dcc6, graine=361)
N.matiere("lamelles", N.tx_corde, 0.25, 0.8, c=0xd8c4a2, graine=362)
N.matiere("pois_blanc", N.tx_uni, 0.3, 0.3, c=0xf6f1e4, graine=363, grain=0.12, taches=0.2, c2=0xffffff, seuil=0.5)
N.matiere("or_coffre", N.tx_uni, 0.2, 0.4, rugueux=0.4, metal=0.6, c=0xe9b92e, graine=364, grain=0.2, taches=0.4, c2=0xffe27a, seuil=0.5)
N.matiere("toile_noire", N.tx_uni, 1.2, 0.3, c=0x2c2a30, graine=365, grain=0.18, taches=0.3, c2=0x45424a, seuil=0.55)

CRIQUE = math.radians(-95)  # la crique, au sud
MAISON = (2.3, 2.5)  # le plus gros champignon, sur sa butte
CAMP = (-0.6, -0.4)  # le feu, au milieu de la clairière
R_SOL = 9.6
PISTES = []


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def rivage(th):
    """Le rayon de la côte dans cette direction."""
    return 6.6 + 0.6 * math.sin(2 * th + 0.9) + 0.35 * math.sin(5 * th + 2.2) - 2.2 * math.exp(-((_ecart(th, CRIQUE) / 0.36) ** 2))


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def sol(x, y):
    """La hauteur du terrain : la grève, le plateau de mousse, la butte de la maison."""
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.45 * d)
    h = 0.34 * (1 - math.exp(-d / 0.8)) + 0.7 * K.lisse(1.4, 4.2, d)
    h += 0.85 * math.exp(-((x - MAISON[0]) ** 2 + (y - MAISON[1]) ** 2) / 3.2) * K.lisse(1.0, 2.4, d)
    h += (K.bruit2(x * 0.9, y * 0.9, 11) - 0.5) * 0.12 * K.lisse(0.9, 2.4, d)
    return h


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def tx_sol_champi(taille=2048, graine=81):
    """Le sol peint pixel par pixel : la grève claire, la mousse verte et ses plaques de lichen violet, les ronds de
    sorcière (des anneaux pâles), des spores roses, la terre des sentiers."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL), n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain, brins = N.bruit(n, 640, 640, graine + 4, 1), N.bruit(n, 760, 250, graine + 5, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    rive, mouille = N.hexa(0xcdbb96), N.hexa(0x8a8468)
    coul = np.broadcast_to(rive, (n, n, 3)).copy() * (0.9 + 0.12 * b1 + 0.06 * fin + 0.1 * (grain - 0.5) - 0.12 * (semis < 0.015))[..., None]
    coul = N.mel(coul, mouille * (0.88 + 0.18 * b2)[..., None], N.lisse(0.16, 0.02, h + (b2 - 0.5) * 0.06))
    mousse = N.hexa(0x4a7d48) * (0.72 + 0.36 * b2 + 0.16 * fin + 0.3 * (brins - 0.5) + 0.1 * (grain - 0.5))[..., None]
    mousse = N.mel(mousse, N.hexa(0x6b4f8c) * (0.8 + 0.34 * b3 + 0.12 * (grain - 0.5))[..., None], N.lisse(0.5, 0.68, b1) * 0.85)  # le lichen violet
    mousse = N.mel(mousse, N.hexa(0x2e5a40) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.6, 0.8, b2) * 0.7)
    ronds = np.abs(((b1 * 3.1 + b2 * 0.7) % 1.0) - 0.5)  # des anneaux pâles : les ronds de sorcière
    mousse = N.mel(mousse, N.hexa(0xd9d2b4), (N.lisse(0.035, 0.0, ronds) * (b3 > 0.45))[..., None] * 0.5)
    coul = N.mel(coul, mousse, N.lisse(0.24, 0.42, h + (b2 - 0.5) * 0.14 + (b3 - 0.5) * 0.1))
    coul = N.mel(coul, np.array([1.0, 0.7, 0.85], np.float32), ((semis > 0.988) & (h > 0.4))[..., None] * 0.8)  # des spores roses
    terre = N.hexa(0x6f5741) * (0.82 + 0.28 * b3 + 0.14 * (grain - 0.5) - 0.14 * (semis < 0.02))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.22, 0.08, piste + (b2 - 0.5) * 0.12) * N.lisse(0.2, 0.36, h))
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.35 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_champi", tx_sol_champi, 2 * R_SOL, 0.35)


# ---------- les pièces ----------
def dome(r, hd, n=14, m=5):
    """Un chapeau de champignon : (le dessus bombé, le dessous un peu creux), chacun en (sommets, faces)."""
    v, f = [(0.0, 0.0, hd)], []
    for j in range(1, m + 1):
        t = j / m
        rr, zz = r * math.sin(t * PI / 2) ** 0.9, hd * math.cos(t * PI / 2) ** 0.8
        v += [(math.cos(2 * PI * i / n) * rr, math.sin(2 * PI * i / n) * rr, zz) for i in range(n)]
    f += [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    for j in range(m - 1):
        f += [(1 + j * n + i, 1 + (j + 1) * n + i, 1 + (j + 1) * n + (i + 1) % n, 1 + j * n + (i + 1) % n) for i in range(n)]
    bord_ = v[1 + (m - 1) * n:]
    return (v, f), ([(0.0, 0.0, hd * 0.2)] + bord_, [(0, 1 + (i + 1) % n, 1 + i) for i in range(n)])


def champignon(L, U, rng, x, y, z, h, r, mat=None, pois=True, lanternes=0, penche=0.05, fin=True):
    """Un champignon : un pied renflé qui penche un peu, sa collerette, les lamelles, le chapeau bombé et ses pois ; des
    lanternes de pirate pendues au bord du chapeau. Renvoie (la matrice de son pied, le rayon du pied, le haut du pied)."""
    mat = mat or rng.choice(list(CHAPEAUX))
    a = rng.random() * 6.28
    px, py = math.cos(a) * penche * h, math.sin(a) * penche * h
    rp = r * 0.2 + 0.03
    M = T(x, y, z)
    L.ajouter(*N.tube([(0, 0, -0.25), (px * 0.25, py * 0.25, h * 0.3), (px * 0.7, py * 0.7, h * 0.62), (px, py, h * 0.9)], [rp * 1.5, rp * 1.05, rp * 0.86, rp * 0.8], 9 if fin else 6, bouts=False), "pied_champi", M, tourne=True)
    Mc = M @ T(px, py, h * 0.82)
    if fin:
        L.ajouter(*N.cylindre(rp * 1.75, rp * 0.9, h * 0.05, 9, haut=False), "lamelles", M @ T(px * 0.72, py * 0.72, h * 0.6))
    dessus, dessous = dome(r, r * (0.5 + 0.25 * rng.random()), 14 if fin else 8, 5 if fin else 3)
    L.ajouter(*dessus, mat, Mc, tourne=True)
    L.ajouter(*dessous, "lamelles", Mc)
    if pois:
        for k in range(int(4 + r * 4) if fin else 3):
            b, t = rng.random() * 6.28, 0.18 + rng.random() * 0.68
            rr, zz = r * math.sin(t * PI / 2) ** 0.9, dessus[0][0][2] * math.cos(t * PI / 2) ** 0.8
            L.ajouter(*N.sphere(r * (0.07 + 0.06 * rng.random()), 6, 3, 0.35), "pois_blanc", Mc @ T(math.cos(b) * rr, math.sin(b) * rr, zz - 0.01))
    for k in range(lanternes):
        b = a + 1.0 + k * 2 * PI / lanternes
        q = (math.cos(b) * r * 0.82, math.sin(b) * r * 0.82)
        L.ajouter(*N.poutre((*q, -0.42), (*q, 0.08), 0.009), "fer", Mc)
        U.ajouter(*N.sphere(0.055, 7, 5, 1.2), "lumiere", Mc @ T(*q, -0.46))
    return M, rp, h * 0.9


def touffe(L, U, rng, x, y, z, luit=False):
    """Une touffe de petits champignons ; certaines luisent la nuit."""
    for k in range(3 + int(rng.random() * 3)):
        a, dd, h, r = rng.random() * 6.28, rng.random() * 0.16, 0.12 + rng.random() * 0.2, 0.05 + rng.random() * 0.06
        Mk = T(x + math.cos(a) * dd, y + math.sin(a) * dd, z)
        L.ajouter(*N.cylindre(r * 0.3, r * 0.22, h + 0.05, 5, haut=False), "pied_champi", Mk @ T(0, 0, -0.05))
        dessus, _ = dome(r, r * 0.7, 7, 2)
        (U if luit else L).ajouter(*dessus, "luciole" if luit else rng.choice(list(CHAPEAUX)), Mk @ T(0, 0, h - 0.01))


def coffre(L, M):
    """Le coffre des pirates : ouvert, plein de pièces."""
    L.ajouter(*N.boite(0.3, 0.2, 0.14), "planches_sombres", M, tourne=True)
    L.ajouter(*N.boite(0.26, 0.16, 0.03), "or_coffre", M @ T(0, 0, 0.125))
    L.ajouter(*N.boite(0.3, 0.03, 0.2), "planches_sombres", M @ T(0, 0.11, 0.12) @ Rx(-0.35))
    for sx in (-0.13, 0.13):
        L.ajouter(*N.boite(0.025, 0.21, 0.15), "fer", M @ T(sx, 0, 0))
    for k in range(5):
        L.ajouter(*N.cylindre(0.022, 0.022, 0.008, 6), "or_coffre", M @ T(-0.2 + 0.09 * k, -0.2 + 0.04 * (k % 2), 0.0))


def mailles(graine=67, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de champignons, trois marcheurs)."""
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

    # --- le plan : le ponton, la porte de la maison, les chemins des pirates (rien d'autre ne s'y pose) ---
    ac = math.degrees(CRIQUE)
    pa, pb = np.array(vers(ac, 0.7)), np.array(vers(ac, -2.3))  # le ponton : de la grève vers le large
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    lg, ZQ = float(np.linalg.norm(pb - pa)), 0.4
    cap_porte = math.atan2(CAMP[1] - MAISON[1], CAMP[0] - MAISON[0])  # la porte regarde la clairière
    seuil = (MAISON[0] + math.cos(cap_porte) * 1.25, MAISON[1] + math.sin(cap_porte) * 1.25)
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    arc = lambda a0, a1, dedans, pas=3: [z(vers(a, dedans)) for a in np.arange(a0, a1 + 0.01, pas)]
    terre = lambda pts: K.suivre(pts, sol)
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        ([(*(pa + dp * (lg - 0.85)), ZQ + 0.02), (*(pa + dp * 0.5), ZQ + 0.02)] + terre([pa - dp * 0.3, (-0.9, -2.5), (CAMP[0] + 0.2, CAMP[1] - 1.05)]), False, 0.18, 0.0, 3.0),
        (terre([(CAMP[0] + 1.0, CAMP[1] + 0.5), (1.0, 1.0), seuil]), False, 0.17, 0.4, 3.5),
        (arc(150, 226, 1.7), False, 0.17, 0.2, 2.5),
        (arc(-38, 28, 1.3), False, 0.16, 0.7, 2.5),
    ]
    couloirs = [(pts, 0.07) for pts, *_ in chemins]

    def libre(x, y, r):
        """Cette place (un objet de rayon r) est-elle à terre, hors des passages et loin de ce qui est déjà posé ?"""
        if sol(x, y) < 0.14 or any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL)

    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n, R = (52 if leger else 68), R_SOL
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
    L.ajouter(sommets, faces, "sol_champi", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    # --- le ponton de la crique, le cotre des pirates à l'ancre le long de lui ---
    Rf.tablier(L, tuple(pa), tuple(pb), ZQ, ZQ, 0.5)
    for k in range(int(lg / 0.6) + 1):
        for s in (-1, 1):
            q = pa + dp * (0.2 + k * 0.6) + np.array((-dp[1], dp[0])) * s * 0.22
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6, haut=False), "planches_sombres", T(q[0], q[1], -0.85))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.5, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[0]))
    P.tonneau(L, T(*(pa + dp * (lg - 0.25) + np.array((-dp[1], dp[0])) * 0.13), ZQ))
    nav = pa + dp * (lg - 1.1) + np.array((-dp[1], dp[0])) * -0.82
    cap_n = math.atan2(-dp[1], -dp[0])  # la proue vers la grève
    P.caboteur(L, V, rng, nav[0], nav[1], cap_n, 2.3, "toile_noire", "planches_sombres")
    emprises.append(("le cotre des pirates", Vf.rectangle(nav[0], nav[1], 2.3, 2.3 * 0.34, cap_n)))

    # --- la maison : le plus gros champignon, sa porte, ses fenêtres, son balcon, son échelle de corde, sa cheminée ---
    zm = sol(*MAISON)
    Mm, rp, hp = champignon(L, U, rng, MAISON[0], MAISON[1], zm, 4.3, 2.3, "chapeau_rouge", True, 3 if leger else 5, 0.0)
    rp *= 1.05
    Mp = Mm @ Rz(cap_porte)
    L.ajouter(*N.boite(0.05, 0.3, 0.52), "porte", Mp @ T(rp * 1.22, 0, 0.0), tourne=True)
    U.ajouter(*N.sphere(0.045, 6, 4, 1.2), "lumiere", Mp @ T(rp * 1.3, 0.26, 0.5))
    for b, zz in ((0.9, 1.25), (-1.0, 1.5), (2.4, 2.2), (-2.3, 2.5), (0.2, 2.55)):
        V.ajouter(*N.boite(0.04, 0.17, 0.2), "vitre", Mm @ Rz(cap_porte + b) @ T(rp * (1.0 - 0.06 * zz), 0, zz))
        L.ajouter(*N.boite(0.03, 0.23, 0.26), "planches_sombres", Mm @ Rz(cap_porte + b) @ T(rp * (1.0 - 0.06 * zz) - 0.012, 0, zz - 0.03))
    zb = 1.9  # le balcon : un anneau de planches, sa rambarde
    L.ajouter(*N.cylindre(rp * 1.9, rp * 1.9, 0.05, 12), "pont", Mm @ T(0, 0, zb))
    for k in range(12):
        b = k * PI / 6
        q0, q1 = (math.cos(b) * rp * 1.82, math.sin(b) * rp * 1.82), (math.cos(b + PI / 6) * rp * 1.82, math.sin(b + PI / 6) * rp * 1.82)
        L.ajouter(*N.poutre((*q0, zb + 0.04), (*q0, zb + 0.3), 0.022), "planches_sombres", Mm)
        if k != 0:
            L.ajouter(*N.poutre((*q0, zb + 0.29), (*q1, zb + 0.29), 0.014), "corde_champi", Mm)
    for s in (-0.11, 0.11):  # l'échelle de corde, du balcon au sol
        L.ajouter(*N.poutre((rp * 1.86, s + 0.26, zb + 0.02), (rp * 1.95, s + 0.26, 0.02), 0.014), "corde_champi", Mp)
    for k in range(7):
        t = (k + 0.5) / 7
        L.ajouter(*N.poutre((rp * 1.86 + 0.09 * (1 - t), 0.15, 0.04 + zb * t), (rp * 1.86 + 0.09 * (1 - t), 0.37, 0.04 + zb * t), 0.018), "planches", Mp)
    chem = Mm @ Rz(cap_porte + 2.0) @ T(1.0, 0, hp + 0.55)  # la cheminée, plantée dans le chapeau
    L.ajouter(*N.cylindre(0.09, 0.075, 0.6, 7), "fer", chem)
    pc = chem @ np.array((0, 0, 0.62, 1))
    SOL.append(("decor", "la maison champignon", Vf.rond(MAISON[0], MAISON[1], rp * 1.9 + 0.05)))

    # --- le camp des pirates : le feu, la tente, les tonneaux, les caisses, le coffre ; le panneau d'interdiction ---
    fz = sol(*CAMP)
    for k in range(7):
        a = k * 2 * PI / 7
        L.ajouter(*N.sphere(0.07 + 0.02 * (k % 2), 6, 4, 0.75), "roche", T(CAMP[0] + math.cos(a) * 0.24, CAMP[1] + math.sin(a) * 0.24, fz + 0.02) @ Rz(k))
    for k in range(3):
        a = k * PI / 3
        L.ajouter(*N.poutre((CAMP[0] - math.cos(a) * 0.17, CAMP[1] - math.sin(a) * 0.17, fz + 0.05), (CAMP[0] + math.cos(a) * 0.17, CAMP[1] + math.sin(a) * 0.17, fz + 0.07), 0.04), "planches_sombres")
    Fl = N.Maille("flammes")
    Fl.ajouter(*N.cylindre(0.11, 0.0, 0.2, 6, haut=False), "lumiere", T(0, 0, 0))
    Fl.ajouter(*N.cylindre(0.06, 0.0, 0.14, 5, haut=False), "lumiere", T(0.06, 0.03, 0))
    lots["libres"].append((Fl, (CAMP[0], CAMP[1], fz + 0.04), {"anim": "clignote"}))
    SOL.append(("dur", "le feu", Vf.rond(CAMP[0], CAMP[1], 0.36)))
    tente = (CAMP[0] - 1.35, CAMP[1] + 0.75)
    Mt = T(tente[0], tente[1], sol(*tente)) @ Rz(0.5)
    for s in (-1, 1):  # deux pans de toile noire sur une faîtière
        L.ajouter(*N.quad((-0.6, 0, 0.62), (0.6, 0, 0.62), (0.6, s * 0.5, 0.0), (-0.6, s * 0.5, 0.0)) if s > 0 else N.quad((0.6, 0, 0.62), (-0.6, 0, 0.62), (-0.6, s * 0.5, 0.0), (0.6, s * 0.5, 0.0)), "toile_noire", Mt)
    L.ajouter(*N.poutre((-0.66, 0, 0.62), (0.66, 0, 0.62), 0.03), "planches_sombres", Mt)
    for sx in (-0.62, 0.62):
        L.ajouter(*N.poutre((sx, 0, -0.05), (sx, 0, 0.64), 0.03), "planches_sombres", Mt)
    SOL.append(("decor", "la tente", Vf.rectangle(tente[0], tente[1], 1.35, 1.1, 0.5)))
    butin = (CAMP[0] + 0.95, CAMP[1] - 0.55)
    zbu = sol(*butin)
    coffre(L, T(butin[0], butin[1], zbu) @ Rz(2.2))
    P.tonneau(L, T(butin[0] + 0.32, butin[1] + 0.22, zbu))
    P.tonneau(L, T(butin[0] + 0.36, butin[1] - 0.05, zbu), 0.08, 0.18)
    P.caisse(L, T(butin[0] - 0.05, butin[1] + 0.34, zbu) @ Rz(0.4))
    SOL.append(("decor", "le butin", Vf.rond(butin[0] + 0.12, butin[1] + 0.1, 0.52)))
    pan = (-1.45, -2.75)  # « Interdiction formelle d'en goûter un » : un champignon peint, barré d'une croix rouge
    Mn = T(pan[0], pan[1], sol(*pan)) @ Rz(1.9)
    L.ajouter(*N.cylindre(0.03, 0.025, 0.62, 6), "planches_sombres", Mn @ T(0, 0, -0.08))
    L.ajouter(*N.boite(0.03, 0.42, 0.32), "planches_claires", Mn @ T(0.02, 0, 0.36), tourne=True)
    L.ajouter(*N.boite(0.012, 0.05, 0.12), "pied_champi", Mn @ T(0.04, 0, 0.4))
    L.ajouter(*N.boite(0.012, 0.18, 0.07), "chapeau_violet", Mn @ T(0.04, 0, 0.52))
    for s in (-1, 1):
        L.ajouter(*N.poutre((0.052, -0.17, 0.52 - s * 0.13), (0.052, 0.17, 0.52 + s * 0.13), 0.012, 0.035), "peint_rouge", Mn)
    SOL.append(("rocher", "le panneau", Vf.rond(pan[0], pan[1], 0.2)))

    # --- les champignons géants, puis les moyens, puis les touffes (certaines luisent la nuit) ---
    geants = [(-3.2, 2.2, 3.9, 1.9, "chapeau_rouge", 2), (-1.2, 3.7, 3.0, 1.5, "chapeau_violet", 1), (4.3, 0.2, 3.2, 1.6, "chapeau_orange", 2), (-3.9, -1.0, 3.4, 1.7, "chapeau_orange", 1),
              (1.5, -3.0, 2.8, 1.4, "chapeau_brun", 1), (3.5, -2.4, 2.6, 1.3, "chapeau_bleu", 0), (0.7, 4.4, 2.4, 1.2, "chapeau_bleu", 0), (-2.7, -3.3, 2.3, 1.2, "chapeau_violet", 0), (-4.9, 1.3, 2.2, 1.1, "chapeau_bleu", 0)]
    for x, y, h, r, mat, lant in geants[:6 if leger else 9]:
        if not libre(x, y, r * 0.2 + 0.25):
            continue
        champignon(L, U, rng, x, y, sol(x, y), h, r, mat, True, lant, 0.04 + 0.05 * rng.random())
        SOL.append(("arbre", "un champignon géant", Vf.rond(x, y, r * 0.3 + 0.08)))
    faits = 0
    for essai in range(300):
        if faits >= (8 if leger else 16):
            break
        x, y = vers(rng.random() * 360, 0.9 + rng.random() * 4.2)
        h, r = 0.7 + rng.random() * 0.9, 0.3 + rng.random() * 0.4
        if not libre(x, y, r * 0.2 + 0.2):
            continue
        champignon(L, U, rng, x, y, sol(x, y), h, r, None, rng.random() < 0.6, 0, 0.06, fin=not leger)
        SOL.append(("arbre", "un champignon", Vf.rond(x, y, r * 0.3 + 0.06)))
        faits += 1
    faits = 0
    for essai in range(300):
        if faits >= (10 if leger else 24):
            break
        x, y = vers(rng.random() * 360, 0.5 + rng.random() * 4.8)
        if not libre(x, y, 0.24):
            continue
        touffe(L, U, rng, x, y, sol(x, y), faits % 3 == 0)
        SOL.append(("rocher", "une touffe de champignons", Vf.rond(x, y, 0.2)))
        faits += 1

    # --- les pirates (immobiles) : deux près du feu, un devant la maison, un sur le balcon, un au bout du ponton ---
    def poser(x, y, zz=None, cap=None):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz)
        SOL.append(("passant", "un pirate", Vf.rond(x, y, 0.065)))

    for a in (2.4, 4.6):
        poser(CAMP[0] + math.cos(a) * 0.58, CAMP[1] + math.sin(a) * 0.58, None, a + PI)
    poser(seuil[0] + 0.5, seuil[1] - 0.35, None, cap_porte + 2.6)
    qb = Mm @ Rz(cap_porte - 1.2) @ np.array((rp * 1.45, 0, 0, 1))
    poser(qb[0], qb[1], zm + zb + 0.05, cap_porte - 1.2)
    bout = pa + dp * (lg - 0.2) + np.array((-dp[1], dp[0])) * -0.12
    poser(bout[0], bout[1], ZQ + 0.02, math.atan2(dp[1], dp[0]))

    # --- la vie : les pirates qui marchent, la fumée (le feu, la cheminée), les spores, les oiseaux ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"pirate{k}")
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
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(CAMP[0]), float(CAMP[1]), float(fz + 0.4), float(pc[0]), float(pc[1]), float(pc[2])], "grosseur": 0.5}))
    lots["reperes"].append(((0.0, 0.0, 0.6), {"anim": "spores"}))
    lots["reperes"].append(((0.0, 0.0, 5.6), {"anim": "oiseaux", "nb": 2 if leger else 4, "rayon": 5.4, "envergure": 0.13}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.6, "genre": 2}))

    # --- sur l'eau (dessiné par le site) : le ressac tout le long du rivage, l'ombre du ponton et du cotre ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.35)), lg - 0.8, 0.5, math.atan2(dp[1], dp[0]))
    K.tache(Rv, nav[0], nav[1], 2.3 * 0.96, 2.3 * 0.34 * 0.9, cap_n, rond=True, marge=0.3)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


N.matiere("corde_champi", N.tx_corde, 0.3, 0.8, c=0xb89a6a, graine=366)


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("champignons-v5", (9, -20, 12), (0.3, 0, 1.2), 55), ("champignons-v5-camp", (-3.2, -9.5, 3.8), (0.4, 0.4, 1.3), 60)] if rendu else []
    return K.construire("ile-champignons-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="champignons")
