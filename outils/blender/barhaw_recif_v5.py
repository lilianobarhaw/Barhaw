# Le Récif des Murmures, « niveau 5 » : un atoll de sable blanc autour de son lagon. Tout est inventé.
# (Son histoire, dans le bot : « des rochers qui chuchotent quand le vent passe ». Ce sont les pierres percées de la tête.)
# Un anneau de sable ouvert au sud-est (la passe), une tête de roche sombre et sa balise au nord-ouest, la cabane des
# perliers sur pilotis dans le lagon et sa passerelle, le parc à huîtres, les filets qui sèchent, des cocotiers, et partout
# les coraux qui dépassent de l'eau à marée basse. La vie : des perliers qui marchent, des crabes, des tortues qui nagent,
# la pirogue à balancier qui flotte, les mouettes.
# Sorties : ile-recif-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_plage_v5 as I

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
CORAUX = {"corail_rose": (0xff6f86, 0xffa3b1), "corail_orange": (0xff8c42, 0xffc078), "corail_violet": (0x8e5be8, 0xc19bff), "corail_jaune": (0xf7c948, 0xfff0a6), "corail_blanc": (0xf3ece0, 0xffffff)}
for _k, (_nom, (_c, _c2)) in enumerate(CORAUX.items()):
    N.matiere(_nom, N.tx_uni, 0.45, 0.6, c=_c, graine=321 + _k, grain=0.22, taches=0.45, c2=_c2, seuil=0.5)
N.matiere("carapace", N.tx_uni, 0.3, 0.6, c=0x4f6b3a, graine=331, grain=0.25, taches=0.5, c2=0x8a9a52, seuil=0.5)
N.matiere("peau_tortue", N.tx_uni, 0.3, 0.3, c=0x7c8f5a, graine=334, grain=0.2, taches=0.3, c2=0xa3b27a, seuil=0.5)
N.matiere("filet", N.tx_corde, 0.3, 0.8, c=0xb9a987, graine=332)
N.matiere("roche_recif", N.tx_roche, 1.4, 0.9, c=0x5f5c63, graine=333)

PASSE = math.radians(-42)  # la passe, au sud-est : l'anneau s'ouvre, le lagon communique avec le large
TETE = (-3.75, 3.75)  # la tête de roche, au nord-ouest
R_SOL = 9.6  # le sol de l'île est peint d'un seul tenant, de -R_SOL à R_SOL
PISTES = []  # le sable tassé des sentiers (rempli par _mailles)


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def r_dedans(th):
    """Le rayon de la rive du lagon dans cette direction."""
    return 3.7 + 0.35 * math.sin(2 * th + 1.1) + 0.2 * math.sin(5 * th)


def r_dehors(th):
    """Le rayon de la rive du large."""
    return 6.9 + 0.45 * math.sin(3 * th + 0.8) + 0.25 * math.sin(7 * th + 2.1)


def bord(x, y):
    """À peu près la distance au bord de l'eau ; > 0 : sur l'anneau de sable."""
    r, th = math.hypot(x, y), math.atan2(y, x)
    return min(r - r_dedans(th), r_dehors(th) - r) - 2.6 * math.exp(-((_ecart(th, PASSE) / 0.3) ** 2))


def tete(x, y):
    """1 au sommet de la tête de roche, 0 loin d'elle."""
    return math.exp(-((x - TETE[0]) ** 2 + (y - TETE[1]) ** 2) / 1.5)


def sol(x, y):
    """La hauteur du terrain : le sable qui monte des deux rives, la dune au milieu de l'anneau, la tête de roche."""
    d = bord(x, y)
    if d < 0:
        return max(-0.8, 0.5 * d) if math.hypot(x, y) < 5.2 else max(-1.6, 0.6 * d)
    h = 0.32 * (1 - math.exp(-d / 0.5)) + 0.5 * K.lisse(0.7, 1.5, d)
    h += 1.15 * tete(x, y) * (0.72 + 0.56 * K.bruit2(x * 2.3, y * 2.3, 9)) * K.lisse(0.2, 0.9, d)
    h += (K.bruit2(x * 0.9, y * 0.9, 5) - 0.5) * 0.1 * K.lisse(0.6, 1.4, d)
    return h


def vers(angle, t):
    """Un point de l'anneau : à cet angle (degrés, 90 = le nord), de la rive du lagon (t = 0) à celle du large (t = 1)."""
    a = math.radians(angle)
    r = r_dedans(a) + t * (r_dehors(a) - r_dedans(a))
    return math.cos(a) * r, math.sin(a) * r


def tx_sol_recif(taille=2048, graine=61):
    """Le sol peint pixel par pixel : le sable blanc et ses débris de corail, le sable mouillé des deux rives, l'herbe rase
    de la dune, le sable tassé des sentiers, la roche sombre de la tête."""
    n = taille
    hc = K.champ(sol, R_SOL)
    h = K.agrandir(hc, n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain, brins = N.bruit(n, 640, 640, graine + 4, 1), N.bruit(n, 760, 250, graine + 5, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    blanc, mouille = N.hexa(0xf6ead2), N.hexa(0xcdb894)
    coul = np.broadcast_to(blanc, (n, n, 3)).copy() * (0.92 + 0.1 * b1 + 0.06 * fin + 0.09 * (grain - 0.5))[..., None]
    coul = N.mel(coul, N.hexa(0xff9aa8), ((semis > 0.985) & (b2 > 0.4))[..., None] * 0.7)  # des débris de corail rose
    coul = N.mel(coul, N.hexa(0xffb070), ((semis < 0.012) & (b3 > 0.4))[..., None] * 0.6)  # et orangé
    coul *= (1 + 0.016 * np.sin(d * 16 + b1 * 14 + b2 * 4))[..., None]  # les rides du sable
    coul = N.mel(coul, mouille * (0.9 + 0.15 * b2)[..., None], N.lisse(0.16, 0.02, h + (b2 - 0.5) * 0.06))
    coul = N.mel(coul, np.array([0.99, 0.98, 0.96], np.float32), (N.lisse(0.05, 0.0, np.abs(d - 0.07 - (b2 - 0.5) * 0.12)) * (b3 > 0.42))[..., None] * 0.7)  # la frange d'écume séchée
    herbe = N.hexa(0x7fa24a) * (0.78 + 0.34 * b2 + 0.16 * fin + 0.3 * (brins - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0xb0a85a) * (0.85 + 0.25 * b3)[..., None], N.lisse(0.5, 0.75, b1))
    coul = N.mel(coul, herbe, N.lisse(0.6, 0.74, h + (b2 - 0.5) * 0.22 + (b3 - 0.5) * 0.14))
    terre = N.hexa(0xd9c39a) * (0.84 + 0.24 * b3 + 0.12 * (grain - 0.5))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.24, 0.1, piste + (b2 - 0.5) * 0.14) * N.lisse(0.22, 0.36, h))
    roche = N.hexa(0x66626a) * (0.78 + 0.08 * np.sin((h * 5 + b1 * 3) * 2 * PI) + 0.3 * b3 + 0.14 * fin)[..., None]
    sur_tete = K.agrandir(K.champ(tete, R_SOL), n)
    coul = N.mel(coul, roche, N.lisse(0.16, 0.34, sur_tete + (b2 - 0.5) * 0.14 + (b3 - 0.5) * 0.08) * N.lisse(0.05, 0.2, h))
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.35 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_recif", tx_sol_recif, 2 * R_SOL, 0.35)


# ---------- les pièces ----------
def corail(L, rng, x, y, genre, s=1.0, z=-0.28):
    """Une tête de corail dont le haut dépasse de l'eau : branchu, en boule, en table ou en éventail. Renvoie son rayon."""
    mat = rng.choice(list(CORAUX))
    M = T(x, y, z) @ Rz(rng.random() * 6.28)
    if genre == "branchu":
        L.ajouter(*N.sphere(0.2 * s, 7, 4, 0.7), "roche_recif", M)
        for k in range(7):
            a, e, h = k * 0.9 + rng.random() * 0.4, 0.1 + 0.2 * rng.random(), (0.5 + 0.35 * rng.random()) * s
            p0 = (math.cos(a) * 0.08 * s, math.sin(a) * 0.08 * s, 0.05)
            p1 = (math.cos(a) * (0.08 + e) * s, math.sin(a) * (0.08 + e) * s, h * 0.55)
            p2 = (math.cos(a + 0.4) * (0.1 + e * 1.5) * s, math.sin(a + 0.4) * (0.1 + e * 1.5) * s, h)
            p3 = (p1[0] + math.cos(a - 0.9) * 0.14 * s, p1[1] + math.sin(a - 0.9) * 0.14 * s, h * 0.9)
            L.ajouter(*N.tube([p0, p1, p2], [0.05 * s, 0.038 * s, 0.022 * s], 5), mat, M, tourne=True)
            L.ajouter(*N.tube([p1, p3], [0.03 * s, 0.018 * s], 5), mat, M, tourne=True)  # la fourche
            L.ajouter(*N.sphere(0.03 * s, 5, 3), mat, M @ T(*p2))
    elif genre == "boule":
        L.ajouter(*N.sphere(0.34 * s, 9, 6, 0.75), mat, M @ T(0, 0, 0.12 * s))
    elif genre == "table":
        L.ajouter(*N.cylindre(0.09 * s, 0.13 * s, 0.42 * s, 6, haut=False), "roche_recif", M)
        L.ajouter(*N.cylindre(0.42 * s, 0.3 * s, 0.07 * s, 10, bas=True), mat, M @ T(0, 0, 0.4 * s))
        L.ajouter(*N.cylindre(0.26 * s, 0.18 * s, 0.06 * s, 9, bas=True), mat, M @ T(0.12 * s, 0.05 * s, 0.52 * s))
    else:  # un éventail
        L.ajouter(*N.sphere(0.12 * s, 6, 3, 0.6), "roche_recif", M)
        for k in range(5):
            a = (k - 2) * 0.33
            L.ajouter(*N.tube([(0, 0, 0.05), (math.sin(a) * 0.22 * s, 0, 0.3 * s), (math.sin(a) * 0.42 * s, 0.03, (0.62 - 0.07 * abs(k - 2)) * s)], [0.03 * s, 0.022 * s, 0.012 * s], 4), mat, M, tourne=True)
    return 0.42 * s


def tablier(L, a, b, za, zb, larg=0.5, ep=0.05, mat="pont"):
    """Un tablier de planches de a à b (sa hauteur va de za à zb)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    l = math.hypot(dx, dy)
    nx, ny = -dy / l * larg / 2, dx / l * larg / 2
    v = [(a[0] - nx, a[1] - ny, za), (b[0] - nx, b[1] - ny, zb), (b[0] + nx, b[1] + ny, zb), (a[0] + nx, a[1] + ny, za)]
    v += [(x, y, zz - ep) for x, y, zz in v]
    L.ajouter(v, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], mat)


def cabane(L, U, x, y, cap, hp=0.5, z=0.0):
    """La cabane des perliers, sur pilotis dans le lagon : un plancher, la cabane de planches et son toit de palmes d'un
    côté, la terrasse de l'autre (du côté de la passerelle, vers +x), l'échelle qui descend dans l'eau, une lanterne."""
    M = T(x, y, z) @ Rz(cap)  # z : 0 sur l'eau ; à terre, la hauteur du sol moins ce que les pilotis s'enfoncent
    for sx in (-1.1, 0, 1.1):
        for sy in (-0.8, 0.8):
            L.ajouter(*N.cylindre(0.055, 0.05, hp + 0.75, 6, haut=False), "planches_sombres", M @ T(sx, sy, -0.75))
    L.ajouter(*N.boite(2.4, 1.8, 0.07, bas=True), "pont", M @ T(0, 0, hp))
    L.ajouter(*N.boite(1.2, 1.2, 0.8, haut=False), "planches_claires", M @ T(-0.5, 0, hp + 0.07), tourne=True)
    L.ajouter(*N.quad((0.102, -0.2, hp + 0.07), (0.102, 0.2, hp + 0.07), (0.102, 0.2, hp + 0.68), (0.102, -0.2, hp + 0.68)), "porte", M)
    v, f = N.toit_pointe(1.15, 0.85, 4, 0.22)
    L.ajouter(v, f, "paille", M @ T(-0.5, 0, hp + 0.87), tourne=True)
    for a, b in (((-1.17, -0.87), (1.17, -0.87)), ((-1.17, 0.87), (1.17, 0.87)), ((-1.17, -0.87), (-1.17, 0.87))):  # la rambarde
        L.ajouter(*N.poutre((*a, hp + 0.36), (*b, hp + 0.36), 0.035), "planches_sombres", M)
        for t in (0.0, 0.5, 1.0):
            q = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            L.ajouter(*N.poutre((*q, hp + 0.06), (*q, hp + 0.36), 0.03), "planches_sombres", M)
    for s in (-1, 1):  # l'échelle, qui descend dans le lagon (côté -y)
        L.ajouter(*N.poutre((0.75 + s * 0.13, -0.93, hp + 0.1), (0.75 + s * 0.13, -1.12, -0.35), 0.03), "planches", M)
    for k in range(5):
        t = (k + 0.5) / 5
        L.ajouter(*N.poutre((0.62, -1.12 + 0.19 * t, -0.35 + (hp + 0.45) * t), (0.88, -1.12 + 0.19 * t, -0.35 + (hp + 0.45) * t), 0.025), "planches", M)
    U.ajouter(*N.sphere(0.05, 6, 4), "lumiere", M @ T(0.22, 0.5, hp + 0.62))
    L.ajouter(*N.poutre((0.22, 0.5, hp + 0.66), (0.12, 0.5, hp + 0.86), 0.012), "fer", M)
    return M


def tortue():
    """Une tortue de mer : la carapace bombée, la tête, quatre nageoires. Elle regarde vers +x."""
    Tt = N.Maille("tortue")
    Tt.ajouter(*N.sphere(0.2, 9, 5, 0.5), "carapace", T(0, 0, -0.01))
    Tt.ajouter(*N.sphere(0.065, 6, 4, 0.8), "peau_tortue", T(0.24, 0, 0.0))
    for sx, sy, r in ((0.13, 0.2, 0.1), (0.13, -0.2, 0.1), (-0.15, 0.15, 0.065), (-0.15, -0.15, 0.065)):
        Tt.ajouter(*N.sphere(r, 6, 3, 0.22), "peau_tortue", T(sx, sy, -0.01) @ Rz(0.6 if sy > 0 else -0.6))
    return Tt


def pirogue(rng):
    """Une pirogue à balancier : la coque, deux traverses, le flotteur."""
    Pg = N.Maille("pirogue")
    P.barque(Pg, rng, 0, 0, 0.0, 1.0)
    for xb in (-0.22, 0.24):
        Pg.ajouter(*N.poutre((xb, 0.0, 0.1), (xb, 0.62, 0.05), 0.025), "planches_sombres")
    Pg.ajouter(*N.tube([(-0.4, 0.62, 0.03), (0.0, 0.62, 0.0), (0.42, 0.62, 0.05)], [0.03, 0.045, 0.03], 6), "planches_claires", tourne=True)
    return Pg


def _cotes():
    """Les deux rives de l'anneau, de degré en degré, à partir de la passe : (rive du large, rive du lagon)."""
    large, lagon = [], []
    for k in range(360):
        a = PASSE + math.radians(k)
        ca, sa = math.cos(a), math.sin(a)
        rm = (r_dedans(a) + r_dehors(a)) / 2
        if sol(ca * rm, sa * rm) <= 0.03:  # la passe : pas de terre dans cette direction
            continue
        res = []
        for loin in (10.0, 0.4):
            r0, r1 = rm, loin
            for _ in range(22):
                r = (r0 + r1) / 2
                if sol(ca * r, sa * r) > 0:
                    r0 = r
                else:
                    r1 = r
            res.append((ca, sa, r1))
        large.append(res[0])
        lagon.append(res[1])
    return large, lagon


def mailles(graine=47, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de coraux et de palmes, trois marcheurs, une tortue)."""
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

    # --- le plan : où sont les choses, où marchent les perliers, où nagent les tortues (rien d'autre ne s'y pose) ---
    HUTTE, HP = (1.6, 0.3), 0.5
    Z_PL = HP + 0.07  # le plancher de la cabane et de la passerelle
    A, B, pied = (2.85, 0.3), (4.25, 0.3), vers(4, 0.3)  # la passerelle : de la terrasse à la rive, puis la rampe jusqu'au sable
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    arc = lambda a0, a1, t, pas=3: [z(vers(a, t)) for a in np.arange(a0, a1 + 0.01, pas)]
    terre = lambda pts: K.suivre(pts, sol)  # un trajet à terre épouse le relief
    filets = vers(46, 0.7)
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        ([(2.5, 0.3, Z_PL + 0.02), (*B, Z_PL + 0.02)] + terre([pied, vers(18, 0.5), vers(30, 0.52), vers(38, 0.5)]), False, 0.18, 0.0, 3.0),
        (arc(150, 212, 0.5), False, 0.17, 0.4, 2.5),
        (arc(-112, -68, 0.55), False, 0.18, 0.7, 2.0),
        (terre([vers(74, 0.5), vers(86, 0.52), vers(98, 0.5), vers(110, 0.48)]), False, 0.16, 0.2, 3.5),
    ]
    crabes = [(arc(60, 72, 0.1), 0.1), (arc(-150, -138, 0.1), 0.6)]
    nages = [  # les tortues : une dans le lagon, une au large
        [(-1.6 + math.cos(a) * 1.0, 0.6 + math.sin(a) * 0.75, 0.01) for a in np.arange(0, 2 * PI - 0.01, PI / 14)],
        [(-8.5 + math.cos(a) * 0.65, -0.8 + math.sin(a) * 0.65, 0.01) for a in np.arange(0, 2 * PI - 0.01, PI / 10)],
    ]
    couloirs = [(pts, 0.07) for pts, *_ in chemins] + [(pts, 0.05) for pts, _ in crabes]

    def libre(x, y, r):
        """Cette place (un objet de rayon r) est-elle à terre, hors des passages et loin de ce qui est déjà posé ?"""
        if sol(x, y) < 0.12 or any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL)

    def libre_eau(x, y, r):
        """Cette place, dans l'eau, est-elle loin de la cabane, de la passerelle, du parc, de la pirogue et des tortues ?"""
        if sol(x, y) > -0.12 or abs(_ecart(math.atan2(y, x), PASSE)) < 0.42 and math.hypot(x, y) > 3.0:
            return False
        if any(K.distance_au_trajet(x, y, pts) < r + 0.3 for pts in nages):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r + 0.15), p) == 0 for _, p in emprises)

    # --- le terrain ---
    # (d'un seul tenant, avec des sommets partagés : la lumière glisse sur la dune au lieu de marquer chaque carreau)
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
    L.ajouter(sommets, faces, "sol_recif", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    # --- la cabane des perliers et sa passerelle ---
    cabane(L, U, HUTTE[0], HUTTE[1], 0.0, HP)
    ponts.append(Vf.rectangle(HUTTE[0], HUTTE[1], 2.4, 1.8, 0.0))
    emprises.append(("la cabane", ponts[-1]))
    tablier(L, (HUTTE[0] + 1.18, A[1]), B, Z_PL, Z_PL)
    tablier(L, B, pied, Z_PL, sol(*pied) + 0.03)
    for xp in (3.1, 3.9):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.035, 1.25, 6, haut=False), "planches_sombres", T(xp, A[1] + s * 0.2, -0.75))
    ponts.append(Vf.rectangle((A[0] + B[0]) / 2, A[1], B[0] - A[0], 0.5, 0.0))
    emprises.append(("la passerelle", ponts[-1]))
    ponts.append(Vf.rectangle((B[0] + pied[0]) / 2, (B[1] + pied[1]) / 2, math.hypot(pied[0] - B[0], pied[1] - B[1]) + 0.1, 0.5, math.atan2(pied[1] - B[1], pied[0] - B[0])))
    ponts.append(Vf.rectangle((HUTTE[0] + 1.2 + A[0]) / 2, A[1], 0.2, 0.5, 0.0))  # le raccord entre la terrasse et la passerelle
    for xl in (B[0] - 0.05, A[0] + 0.1):  # deux lanternes sur leur piquet
        L.ajouter(*N.cylindre(0.025, 0.02, 0.62, 5), "planches_sombres", T(xl, A[1] + 0.3, Z_PL - 0.05))
        U.ajouter(*N.sphere(0.045, 6, 4), "lumiere", T(xl, A[1] + 0.3, Z_PL + 0.62))

    # --- le parc à huîtres, dans le lagon : des piquets, une corde, des paniers qui trempent ---
    for cx, cy, ang in ((-1.9, -1.6, 0.5), (-0.5, -2.45, 0.15)):
        Mq = T(cx, cy, 0) @ Rz(ang)
        for k in range(4):
            L.ajouter(*N.cylindre(0.035, 0.03, 0.8, 6), "planches_sombres", Mq @ T(-0.75 + k * 0.5, 0, -0.42))
            if k < 3:
                L.ajouter(*N.poutre((-0.75 + k * 0.5, 0, 0.33), (-0.25 + k * 0.5, 0, 0.33), 0.014), "filet", Mq)
                L.ajouter(*N.boite(0.13, 0.13, 0.12), "paille", Mq @ T(-0.5 + k * 0.5, 0, 0.04))
                L.ajouter(*N.poutre((-0.5 + k * 0.5, 0, 0.16), (-0.5 + k * 0.5, 0, 0.33), 0.01), "filet", Mq)
        emprises.append(("le parc à huîtres", Vf.rectangle(cx, cy, 1.75, 0.3, ang)))

    # --- la pirogue à balancier, qui flotte dans le lagon ---
    pg = (-0.3, 2.25)
    lots["animes"].append((pirogue(rng), (pg[0], pg[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.9}))
    emprises.append(("la pirogue", Vf.rectangle(pg[0], pg[1] + 0.3, 1.05, 1.0, 0.0)))

    # --- les coraux : dans le lagon, puis au large (jamais dans la passe) ---
    genres = ["branchu", "boule", "table", "eventail", "branchu", "boule", "eventail"]
    faits = 0
    for essai in range(900):
        if faits >= (14 if leger else 26):
            break
        dans_lagon = faits < (8 if leger else 15)
        a = rng.random() * 2 * PI
        r = r_dedans(a) - 0.45 - rng.random() * 2.7 if dans_lagon else r_dehors(a) + 0.4 + rng.random() * 0.8
        x, y, s = math.cos(a) * r, math.sin(a) * r, 0.8 + rng.random() * 0.55
        if not libre_eau(x, y, 0.42 * s):
            continue
        rayon = corail(L, rng, x, y, genres[faits % len(genres)], s)
        emprises.append(("un corail", Vf.rond(x, y, rayon)))
        faits += 1

    # --- la tête de roche et sa balise : trois perches liées, une lanterne sous son petit toit ---
    zt = sol(*TETE)
    for k in range(3):
        a = k * 2 * PI / 3 + 0.4
        L.ajouter(*N.poutre((TETE[0] + math.cos(a) * 0.36, TETE[1] + math.sin(a) * 0.36, sol(TETE[0] + math.cos(a) * 0.36, TETE[1] + math.sin(a) * 0.36) - 0.05), (TETE[0], TETE[1], zt + 1.3), 0.045), "planches_sombres")
    v, f = N.toit_pointe(0.3, 0.2, 4, 0.06)
    L.ajouter(v, f, "paille", T(TETE[0], TETE[1], zt + 1.3), tourne=True)
    U.ajouter(*N.sphere(0.075, 7, 5), "lumiere", T(TETE[0], TETE[1], zt + 1.05))
    L.ajouter(*N.poutre((TETE[0], TETE[1], zt + 1.12), (TETE[0], TETE[1], zt + 1.3), 0.012), "fer")
    SOL.append(("decor", "la balise", Vf.rond(TETE[0], TETE[1], 0.45)))
    # les pierres percées : des arches de roche où le vent s'engouffre (ce sont elles qui « murmurent »)
    for k, (x, y, cap, s_) in enumerate(((TETE[0] + 0.95, TETE[1] - 0.25, 0.5, 1.15), (TETE[0] - 0.2, TETE[1] - 1.05, 2.0, 1.0), (*vers(112, 0.8), 0.2, 0.9), (*vers(156, 0.82), 1.3, 1.05))[:3 if leger else 4]):
        if not libre(x, y, 0.3 * s_):
            continue
        L.ajouter(*N.tube([(-0.24 * s_, 0, -0.12), (-0.21 * s_, 0, 0.46 * s_), (0, 0, 0.7 * s_), (0.21 * s_, 0, 0.46 * s_), (0.24 * s_, 0, -0.12)], [0.14 * s_, 0.115 * s_, 0.1 * s_, 0.115 * s_, 0.14 * s_], 6), "roche_recif", T(x, y, sol(x, y)) @ Rz(cap), tourne=True)
        SOL.append(("rocher", "une pierre percée", Vf.rond(x, y, 0.3 * s_)))
    for k in range(6 if leger else 10):  # le chaos de blocs sur ses flancs
        a, dd = k * 2.4 + rng.random(), 0.55 + rng.random() * 0.75
        x, y, r = TETE[0] + math.cos(a) * dd, TETE[1] + math.sin(a) * dd, 0.2 + rng.random() * 0.24
        if bord(x, y) < 0.25 or not libre(x, y, r * 0.7):
            continue
        L.ajouter(*N.sphere(r, 5, 3, 0.8), "roche_recif", T(x, y, sol(x, y) + r * 0.15) @ Rz(a) @ Rx(0.3 * math.sin(k)))
        SOL.append(("rocher", "un bloc", Vf.rond(x, y, r * 0.8)))

    # --- les filets qui sèchent : deux piquets, le filet tendu jusqu'au sable ---
    af = math.atan2(filets[1], filets[0]) + PI / 2
    fa, fb = (filets[0] - math.cos(af) * 0.65, filets[1] - math.sin(af) * 0.65), (filets[0] + math.cos(af) * 0.65, filets[1] + math.sin(af) * 0.65)
    dehors = (math.cos(af - PI / 2) * 0.55, math.sin(af - PI / 2) * 0.55)
    for q in (fa, fb):
        L.ajouter(*N.cylindre(0.03, 0.025, 0.85, 6), "planches_sombres", T(q[0], q[1], sol(*q) - 0.08))
    za, zb = sol(*fa) + 0.72, sol(*fb) + 0.72
    L.ajouter(*N.poutre((*fa, za), (*fb, zb), 0.016), "filet")
    pa_, pb_ = (fa[0] + dehors[0], fa[1] + dehors[1]), (fb[0] + dehors[0], fb[1] + dehors[1])
    L.ajouter(*N.quad((*pa_, sol(*pa_) + 0.03), (*pb_, sol(*pb_) + 0.03), (*fb, zb), (*fa, za)), "filet")
    L.ajouter(*N.quad((*pb_, sol(*pb_) + 0.03), (*pa_, sol(*pa_) + 0.03), (*fa, za), (*fb, zb)), "filet")
    SOL.append(("decor", "les filets", Vf.rectangle(filets[0] + dehors[0] / 2, filets[1] + dehors[1] / 2, 1.45, 0.7, af)))

    # --- les cocotiers, sur la dune ---
    for k, (a, t) in enumerate(((24, 0.62), (163, 0.6), (245, 0.6), (84, 0.62), (58, 0.42), (198, 0.44), (286, 0.56), (128, 0.72), (224, 0.7), (10, 0.75), (180, 0.72), (262, 0.45), (40, 0.4), (150, 0.4))[:5 if leger else 14]):
        x, y = vers(a + (rng.random() - 0.5) * 4, t)
        if not libre(x, y, 0.2):
            continue
        I.palmier(L, rng, x, y, 2.1 + rng.random() * 0.9, 0.3 + rng.random() * 0.6, math.radians(a) + (rng.random() - 0.5) * 1.6, leger, z=sol(x, y))
        SOL.append(("arbre", "un cocotier", Vf.rond(x, y, 0.16)))

    # --- les rochers (autour de la tête, sur la rive du large), les étoiles de mer sur le sable mouillé ---
    for k in range(7 if leger else 13):
        if k < 5:
            a = rng.random() * 2 * PI
            x, y = TETE[0] + math.cos(a) * (0.9 + rng.random() * 0.9), TETE[1] + math.sin(a) * (0.9 + rng.random() * 0.9)
        else:
            x, y = vers(rng.random() * 360, 0.86 + rng.random() * 0.1)
        r = 0.14 + rng.random() * 0.26
        if not libre(x, y, r):
            continue
        L.ajouter(*N.sphere(r, 7, 4, 0.6), "roche_recif", T(x, y, sol(x, y)) @ Rz(k))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r * 0.85)))
    for k in range(4 if leger else 8):
        x, y = vers(rng.random() * 360, 0.07 + rng.random() * 0.07)
        if not libre(x, y, 0.09):
            continue
        Me = T(x, y, sol(x, y) + 0.012) @ Rz(rng.random() * 6.28)
        mat = rng.choice(["corail_orange", "corail_rose", "peint_rouge"])
        for b in range(5):
            L.ajouter(*N.poutre((0, 0, 0), (math.cos(b * 1.257) * 0.075, math.sin(b * 1.257) * 0.075, 0), 0.026, 0.014), mat, Me)
        SOL.append(("rocher", "une étoile de mer", Vf.rond(x, y, 0.08)))

    # --- les perliers (immobiles) : deux sur la terrasse, deux près des filets, un au pied de la balise ---
    def poser(x, y, zz=None, cap=None):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz)
        SOL.append(("passant", "un perlier", Vf.rond(x, y, 0.065)))

    poser(HUTTE[0] + 0.75, HUTTE[1] + 0.5, Z_PL, 0.3)
    poser(HUTTE[0] + 0.95, HUTTE[1] - 0.5, Z_PL, -2.2)
    for dx, dy, cap in ((-0.25, -0.5, 1.2), (0.45, -0.55, 2.1)):
        poser(filets[0] + dx, filets[1] + dy, None, cap)
    poser(TETE[0] + 1.25, TETE[1] - 1.05, None, 2.4)

    # --- la vie : les perliers qui marchent, les crabes, les tortues, les mouettes ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"perlier{k}")
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
    Cr, premier = I.crabe(), None
    for pts, depart in (crabes[:1] if leger else crabes):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": 0.09, "phase": depart, "saut": 0.0, "pause": 2.5, "rayon": 0.04}
        if premier is None:
            premier = len(lots["animes"])
            lots["animes"].append((Cr, pts[0], extras))
        else:
            lots["copies"].append((premier, pts[0], extras))
    Tt, premiere = tortue(), None
    for k, pts in enumerate(nages[:1] if leger else nages):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "boucle": 1, "vitesse": 0.2 + 0.05 * k, "saut": 0.0, "roulis": 0.03, "phase": 0.3 * k}
        if premiere is None:
            premiere = len(lots["animes"])
            lots["animes"].append((Tt, pts[0], extras))
        else:
            lots["copies"].append((premiere, pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 4.0), {"anim": "oiseaux", "nb": 3 if leger else 6, "rayon": 5.0, "envergure": 0.13}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.7, "genre": 2}))  # pour la mer du site : une île naturelle, son lagon

    # --- sur l'eau (dessiné par le site) : le ressac sur les deux rives, l'ombre de la cabane, de la passerelle, de la pirogue ---
    Rv = N.Maille("rivage")
    large, lagon = _cotes()
    fin = lambda k, nb: min(1.0, k / 6, (nb - 1 - k) / 6)
    K.bande(Rv, [(ca * (r - 0.04), sa * (r - 0.04)) for ca, sa, r in large], [(ca * (r + 0.06 + 1.1 * fin(k, len(large))), sa * (r + 0.06 + 1.1 * fin(k, len(large)))) for k, (ca, sa, r) in enumerate(large)], mat="ecume")
    K.bande(Rv, [(ca * (r + 0.04), sa * (r + 0.04)) for ca, sa, r in lagon], [(ca * (r - 0.06 - 0.6 * fin(k, len(lagon))), sa * (r - 0.06 - 0.6 * fin(k, len(lagon)))) for k, (ca, sa, r) in enumerate(lagon)], mat="ecume")
    K.tache(Rv, HUTTE[0], HUTTE[1], 2.4, 1.8)
    K.tache(Rv, (A[0] + B[0]) / 2, A[1], B[0] - A[0], 0.5)
    K.tache(Rv, pg[0], pg[1], 0.95, 0.34, rond=True, marge=0.26)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("recif-v5", (10, -21, 12), (0, 0, 0.4), 55), ("recif-v5-lagon", (4.5, -10.5, 3.8), (1.0, 0.2, 0.5), 60)] if rendu else []
    return K.construire("ile-recif-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="recif")  # autour de 100 pixels par unité, autant que le sol peint
