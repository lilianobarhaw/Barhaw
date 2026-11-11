# Port Barhaw au niveau 5 : une vraie petite ville portuaire (tout est inventé).
# Un amphithéâtre autour du bassin, ouvert au sud (vers nous) : le quai de pierre et ses pontons, les entrepôts, la place du marché
# et sa fontaine, trois terrasses de maisons à colombages et à toits de tuiles, l'hôtel de ville et son beffroi, le moulin,
# les remparts et leurs tours, le phare au bout de la jetée, deux caboteurs à quai, des barques, des passants, des bannières.
# Sorties : ile-port-v5.glb (+ -leger) et son atlas ile-port-v5.png (la lumière cuite), à convertir en .webp.
# Usage, dans Blender :  import barhaw_port_v5 as P; P.construire()
import math, os, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf

PI = math.pi
T, Rz, Rx, Ry, S = N.T, N.Rz, N.Rx, N.Ry, N.S
N.matiere("eau_bassin", N.tx_uni, 1.5, 0.2, rugueux=0.3, c=0x4f9fc0, graine=201, grain=0.08, taches=0.2, c2=0x8fd0e6, seuil=0.7)
N.matiere("fond_marin", N.tx_uni, 3.0, 0.3, c=0x6fb0c0, graine=202, grain=0.1, taches=0.3, c2=0xd9cfa0, seuil=0.55)

BASSIN = (0.8, -8.0)  # le centre du bassin
RB = 4.4  # son rayon
CENTRE = (0.0, 1.0)  # le centre de l'île
RI = 9.2  # son rayon (du nord au sud)
LARGE = 1.1  # elle est un peu plus large que haute
TERRASSES = ((6.7, 7.5, 0.45, 1.25), (9.9, 10.7, 1.25, 2.15), (12.7, 14.2, 2.15, 3.1))  # (début, fin de la pente, bas, haut)


def _lisse(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def sol(x, y):
    """La hauteur du terrain : des terrasses en arcs autour du bassin, qui retombent vers la mer au bord de l'île."""
    u = math.hypot(x - BASSIN[0], y - BASSIN[1])
    h = 0.45
    for a, b, bas, haut in TERRASSES:
        h += (haut - bas) * _lisse(a, b, u)
    d = math.hypot((x - CENTRE[0]) / LARGE, (y - CENTRE[1]) * 1.04)
    bord = RI + 0.5 * math.sin(math.atan2(y - CENTRE[1], x - CENTRE[0]) * 5 + 1.3) + 0.3 * math.sin(math.atan2(y - CENTRE[1], x - CENTRE[0]) * 11)
    k = _lisse(bord, bord - 1.3, d)  # 1 sur l'île, 0 dans la mer
    h = h * k - 1.6 * (1 - k)
    if u < RB + 0.3 and y > BASSIN[1] + 0.4:  # le bassin (la pente se cache sous le dallage du quai)
        h = min(h, -1.2)
    elif u < RB:
        h = min(h, -1.2)
    return h


def sur_ile(x, y, marge=1.4):
    return math.hypot((x - CENTRE[0]) / LARGE, (y - CENTRE[1]) * 1.04) < RI - marge and sol(x, y) > 0.42


def vers(angle, rayon, de=BASSIN):
    """Un point à cet angle (en degrés, 90 = plein nord) et à cette distance du centre du bassin."""
    a = math.radians(angle)
    return de[0] + math.cos(a) * rayon, de[1] + math.sin(a) * rayon


# ---------- les pièces ----------
SOL = []  # (genre, nom, polygone au sol) des maisons, des tours, des arbres, des rochers : verifier() contrôle qu'ils ne se chevauchent pas


def occupe(L, genre, nom, poly):
    if L.nom == "ile_corps":
        SOL.append((genre, nom, poly))


def planche_mur(L, mat, M, x0, z0, x1, z1, larg=0.06, saillie=0.03):
    """Une pièce de bois sur un mur (le mur est le plan y = 0, dehors vers -y) : de (x0, z0) à (x1, z1)."""
    d = np.array([x1 - x0, z1 - z0], float)
    lg = np.linalg.norm(d) or 1
    d /= lg
    p = np.array([-d[1], d[0]]) * larg / 2
    c = [(x0 - p[0], z0 - p[1]), (x1 - p[0], z1 - p[1]), (x1 + p[0], z1 + p[1]), (x0 + p[0], z0 + p[1])]
    v = [(x, 0, z) for x, z in c] + [(x, -saillie, z) for x, z in c]
    L.ajouter(v, [(4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], mat, M)


def plaque_mur(L, mat, M, x0, z0, x1, z1, larg=0.06, saillie=0.012):
    """Une pièce de bois plaquée sur un mur : juste sa face (les petits reliefs sont dans les textures)."""
    d = np.array([x1 - x0, z1 - z0], float)
    d /= np.linalg.norm(d) or 1
    p = np.array([-d[1], d[0]]) * larg / 2
    L.ajouter([(x0 - p[0], -saillie, z0 - p[1]), (x1 - p[0], -saillie, z1 - p[1]), (x1 + p[0], -saillie, z1 + p[1]), (x0 + p[0], -saillie, z0 + p[1])], [(0, 1, 2, 3)], mat, M, tourne=abs(d[1]) > abs(d[0]))


def fenetre(L, V, rng, M, x, z, l=0.22, h=0.3, mat="fenetre", volets=None, allumee=None):
    """Une fenêtre sur un mur (plan y = 0) : l'image de la fenêtre, un appui, parfois des volets ; la nuit, sa vitre s'allume."""
    L.ajouter(*N.quad((x - l / 2, -0.014, z), (x + l / 2, -0.014, z), (x + l / 2, -0.014, z + h), (x - l / 2, -0.014, z + h)), mat, M)
    plaque_mur(L, "poutre", M, x - l / 2 - 0.03, z - 0.015, x + l / 2 + 0.03, z - 0.015, 0.04, 0.03)
    if volets:
        for s in (-1, 1):
            xv = x + s * (l / 2 + l * 0.27)
            L.ajouter(*N.quad((xv - l * 0.24, -0.02, z), (xv + l * 0.24, -0.02, z), (xv + l * 0.24, -0.02, z + h), (xv - l * 0.24, -0.02, z + h)), volets, M, tourne=True)
    if allumee if allumee is not None else rng.random() < 0.6:
        m = 0.13
        V.ajouter(*N.quad((x - l / 2 + l * m, -0.02, z + h * m), (x + l / 2 - l * m, -0.02, z + h * m), (x + l / 2 - l * m, -0.02, z + h - h * m), (x - l / 2 + l * m, -0.02, z + h - h * m)), "vitre", M)


PANNEAU = 0.26  # la largeur d'un panneau de la texture des pans de bois (deux par répétition)


def panneaux(lg):
    """Les centres des panneaux pleins d'un mur à pans de bois de longueur lg (là où vont les fenêtres)."""
    return [-lg / 2 + (j + 0.5) * PANNEAU for j in range(int(lg / PANNEAU)) if j % 2 == 1 and -lg / 2 + (j + 1) * PANNEAU < lg / 2 - 0.05]


CHEMINEES = []  # le haut de chaque cheminée (x, y, z) : le site y fait monter de la fumée


def cheminee(L, M, x, y, z, h=0.5, l=0.17):
    if L.nom == "ile_corps":
        CHEMINEES.append(tuple((M @ np.array([x, y, z + h + 0.16, 1.0]))[:3]))
    L.ajouter(*N.boite(l, l, h, haut=True), "briques", M @ T(x, y, z))
    L.ajouter(*N.boite(l + 0.06, l + 0.06, 0.05, bas=True), "pierres_sombres", M @ T(x, y, z + h))
    L.ajouter(*N.cylindre(0.045, 0.035, 0.1, 6), "tuiles_rouges", M @ T(x, y, z + h + 0.05))


def maison(L, V, rng, x, y, angle, lx=1.5, ly=1.1, etages=2, mur="crepi", toit="tuiles", bois=True, boutique=None, enseigne=False, bas="pierres", lucarne=False, z=None, he=0.52):
    """Une maison : un rez-de-chaussée de pierre, des étages en encorbellement à pans de bois, un toit de tuiles, cheminée, fenêtres.
    La façade (local -y) regarde vers `angle` - 90° ; `angle` est la direction du faîtage."""
    z = sol(x, y) if z is None else z
    M = T(x, y, z) @ Rz(angle)
    occupe(L, "maison", f"maison ({x:.1f}, {y:.1f})", Vf.rectangle(x, y, lx, ly, angle))
    murs = lambda lxx, lyy, zz: ((M @ T(0, -lyy / 2, zz), lxx, True), (M @ Rz(PI) @ T(0, -lyy / 2, zz), lxx, False), (M @ Rz(PI / 2) @ T(0, -lxx / 2, zz), lyy, False), (M @ Rz(-PI / 2) @ T(0, -lxx / 2, zz), lyy, False))
    L.ajouter(*N.boite(lx, ly, he + 0.2, haut=False), bas, M @ T(0, 0, -0.2))
    volets = rng.choice([None, None, "peint_bleu", "peint_vert", "peint_rouge"])
    # le rez-de-chaussée : la porte, une ou deux fenêtres, ou la boutique
    Mf = M @ T(0, -ly / 2, 0)
    xp = rng.choice([-1, 1]) * lx * 0.22
    L.ajouter(*N.quad((xp - 0.13, -0.012, 0.0), (xp + 0.13, -0.012, 0.0), (xp + 0.13, -0.012, 0.4), (xp - 0.13, -0.012, 0.4)), "porte", Mf)
    plaque_mur(L, "poutre", Mf, xp - 0.17, 0.43, xp + 0.17, 0.43, 0.06, 0.02)
    L.ajouter(*N.boite(0.34, 0.14, 0.05, bas=False), "pierres_sombres", Mf @ T(xp, -0.07, 0))
    if boutique:
        xb = -xp
        lb = lx * 0.42
        L.ajouter(*N.quad((xb - lb / 2, -0.012, 0.12), (xb + lb / 2, -0.012, 0.12), (xb + lb / 2, -0.012, 0.4), (xb - lb / 2, -0.012, 0.4)), "fenetre_haute", Mf, plein=True)
        L.ajouter(*N.boite(lb + 0.06, 0.05, 0.12), "planches_sombres", Mf @ T(xb, -0.03, 0))
        # l'auvent de toile rayée, sur deux perches
        a = [(xb - lb / 2 - 0.06, -0.01, 0.5), (xb + lb / 2 + 0.06, -0.01, 0.5), (xb + lb / 2 + 0.06, -0.38, 0.36), (xb - lb / 2 - 0.06, -0.38, 0.36)]
        L.ajouter(a + [(p[0], p[1], p[2] + 0.02) for p in a], [(7, 6, 5, 4), (0, 1, 2, 3), (3, 2, 6, 7), (0, 3, 7, 4), (2, 1, 5, 6)], boutique, Mf)
        for sx in (-1, 1):
            L.ajouter(*N.poutre((xb + sx * (lb / 2 + 0.04), -0.36, 0), (xb + sx * (lb / 2 + 0.04), -0.36, 0.36), 0.025), "planches_sombres", Mf)
        L.ajouter(*N.boite(lb, 0.18, 0.16), "planches_claires", Mf @ T(xb, -0.22, 0))
        for k in range(3):
            L.ajouter(*N.sphere(0.07, 6, 4, 0.6), rng.choice(["fruits", "legumes", "poisson", "tissu_rouge"]), Mf @ T(xb + (k - 1) * lb * 0.3, -0.22, 0.18))
    else:
        fenetre(L, V, rng, Mf, -xp, 0.16, 0.2, 0.24, volets=volets)
    if enseigne:
        L.ajouter(*N.poutre((xp, 0, 0.62), (xp, -0.3, 0.62), 0.025), "fer", Mf)
        L.ajouter(*N.boite(0.03, 0.22, 0.16, bas=True), rng.choice(["peint_rouge", "peint_bleu", "planches_claires"]), Mf @ T(xp, -0.19, 0.43))
    # les étages
    zz = he
    lxx, lyy = lx, ly
    for e in range(1, etages):
        d = 0.07 * e
        lxx, lyy = lx + d * 2, ly + d * 2
        L.ajouter(*N.boite(lxx, lyy, he, haut=False), (mur.replace("crepi", "colombage") if bois else mur), M @ T(0, 0, zz), cale=bois)
        L.ajouter(*N.boite(lxx + 0.03, lyy + 0.03, 0.05, haut=False, bas=True), "poutre", M @ T(0, 0, zz - 0.04))  # la sablière de l'encorbellement
        for Mw, lg, facade in murs(lxx, lyy, zz):
            if bois:
                for sx in (-1, 1):  # les poteaux d'angle
                    plaque_mur(L, "poutre", Mw, sx * (lg / 2 - 0.03), 0, sx * (lg / 2 - 0.03), he, 0.07)
            for xf in (panneaux(lg) if bois else [-lg / 4, lg / 4] if lg > 1.2 else [0.0]):
                if facade or rng.random() < 0.55:
                    fenetre(L, V, rng, Mw, xf, 0.14, 0.17 if bois else 0.2, 0.26, volets=volets if facade and not bois else None)
        zz += he
    if etages == 1:
        for Mw, lg, facade in murs(lxx, lyy, 0):
            if not facade and rng.random() < 0.7:
                fenetre(L, V, rng, Mw, 0, 0.16, 0.2, 0.24)
    # le toit
    h = lyy * (0.5 + rng.random() * 0.22)
    v, f = N.toit_pignon(lxx, lyy, h, 0.13)
    L.ajouter(v, [f[0], f[4]], toit, M @ T(0, 0, zz))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, zz))
    L.ajouter(*N.pignons(lxx, lyy, h), mur, M @ T(0, 0, zz))
    L.ajouter(*N.poutre((-lxx / 2 - 0.15, 0, zz + h + 0.05), (lxx / 2 + 0.15, 0, zz + h + 0.05), 0.07), "tuiles_rouges", M)  # le faîtage
    for sx in (-1, 1):  # un pan de bois et une petite fenêtre dans chaque pignon
        Mp = M @ Rz(sx * PI / 2) @ T(0, -lxx / 2, zz)
        if bois:
            plaque_mur(L, "poutre", Mp, 0, 0, 0, h - 0.05, 0.06)
            plaque_mur(L, "poutre", Mp, -lyy / 2 + 0.03, 0.035, lyy / 2 - 0.03, 0.035, 0.07)
            for sy in (-1, 1):
                plaque_mur(L, "poutre", Mp, sy * lyy * 0.25, 0.07, 0, h * 0.55, 0.05)
        if h > 0.5 and rng.random() < 0.7:
            fenetre(L, V, rng, Mp, 0.0 if not bois else 0.16 * sx, h * 0.25, 0.14, 0.18)
    cheminee(L, M, (rng.random() - 0.5) * lxx * 0.6, lyy * 0.2, zz + h * 0.45, 0.45 + rng.random() * 0.2)
    if lucarne:
        xl = (rng.random() - 0.5) * lxx * 0.4
        Ml = M @ T(xl, -lyy * 0.27, zz + h * 0.3)
        L.ajouter(*N.boite(0.26, 0.3, 0.26, haut=False), mur, Ml)
        v, f = N.toit_pignon(0.3, 0.26, 0.14, 0.04, 0.03)
        L.ajouter(v, f, toit, Ml @ T(0, 0.02, 0.26) @ Rz(PI / 2))
        fenetre(L, V, rng, Ml @ T(0, -0.15, 0), 0, 0.05, 0.15, 0.17)
    return zz + h


def tour(L, V, rng, x, y, r=0.55, h=2.0, toit="tuiles_rouges", mur="pierres", creneaux=False, z=None, n=10):
    z = sol(x, y) if z is None else z
    M = T(x, y, z)
    occupe(L, "tour", f"tour ({x:.1f}, {y:.1f})", Vf.rond(x, y, r * 1.08))
    L.ajouter(*N.cylindre(r * 1.08, r, h + 0.3, n, haut=False), mur, M @ T(0, 0, -0.3))
    L.ajouter(*N.cylindre(r * 1.12, r * 1.12, 0.12, n, bas=True), "pierres_sombres", M @ T(0, 0, h))
    for k in range(3):
        fenetre(L, V, rng, M @ Rz(k * 2.1 + rng.random()) @ T(0, -r * 0.99, 0), 0, h * (0.35 + 0.2 * (k % 2)), 0.12, 0.2, mat="fenetre_haute")
    if creneaux:
        for k in range(n):
            L.ajouter(*N.boite(r * 0.34, 0.1, 0.18), mur, M @ Rz((k + 0.5) * 2 * PI / n) @ T(0, -r * 1.06, h + 0.12))
        L.ajouter(*N.cylindre(r * 0.9, r * 0.9, 0.02, n), "paves", M @ T(0, 0, h + 0.1))
    else:
        v, f = N.toit_pointe(r * 1.1, r * 2.1, n, 0.1, 0)
        tour_du_toit = N.Faces(f[:-1])
        tour_du_toit.deroule = f.deroule[:-1] if f.deroule else None
        L.ajouter(v, tour_du_toit, toit, M @ T(0, 0, h + 0.12))
        L.ajouter(*N.sphere(0.06, 6, 4), "or", M @ T(0, 0, h + 0.12 + r * 2.1 + 0.03))
    return z + h


def tonneau(L, M, r=0.09, h=0.2):
    L.ajouter(*N.cylindre(r * 0.85, r, h / 2, 8, haut=False), "planches", M, tourne=True)
    L.ajouter(*N.cylindre(r, r * 0.85, h / 2, 8), "planches", M @ T(0, 0, h / 2), tourne=True)
    for zc in (h * 0.2, h * 0.8):
        L.ajouter(*N.cylindre(r * 0.96, r * 0.96, 0.02, 8, haut=False), "fer", M @ T(0, 0, zc - 0.01))


def caisse(L, M, c=0.2, mat="planches_claires"):
    L.ajouter(*N.boite(c, c, c), mat, M)
    for s in (-1, 1):
        L.ajouter(*N.poutre((s * c / 2, -c / 2 - 0.004, 0.01), (-s * c / 2, -c / 2 - 0.004, c - 0.01), 0.02, 0.012), "planches_sombres", M)


def arbre(L, rng, x, y, h=1.0, r=0.42, genre="rond", z=None):
    z = sol(x, y) if z is None else z
    M = T(x, y, z)
    occupe(L, "arbre", f"arbre ({x:.1f}, {y:.1f})", Vf.rond(x, y, r * (0.5 if genre == "cypres" else 0.92)))
    if genre == "cypres":
        L.ajouter(*N.cylindre(0.04, 0.03, h * 0.25, 5, haut=False), "planches_sombres", M @ T(0, 0, -0.1))
        L.ajouter(*N.sphere(r * 0.45, 7, 6, h / (r * 0.9)), "feuillage_sombre", M @ T(0, 0, h * 0.62), zone=(1.0, 0.8, 1.0))
        return
    L.ajouter(*N.tube([(0, 0, -0.2), (0.03, 0, h * 0.4), (-0.02, 0.02, h * 0.75)], [0.07, 0.055, 0.04], 6, bouts=False), "planches_sombres", M)
    mat = rng.choice(["feuillage", "feuillage", "feuillage_dore"])
    for k in range(3):
        a = rng.random() * 6.28
        d = r * 0.45 * (k > 0)
        L.ajouter(*N.sphere(r * (0.78 if k else 1.0), 8, 5, 0.82), mat, M @ T(math.cos(a) * d, math.sin(a) * d, h * (0.95 + 0.14 * k)) @ Rz(rng.random() * 3), zone=(1.0, 0.66 - 0.08 * k, 1.0))


def passant(L, rng, x, y, angle=None, z=None, marcheur=False):
    """Un habitant (30 cm à l'échelle de l'île) : deux jambes et leurs souliers, un buste (tunique, ou robe longue), deux bras
    et leurs mains, le cou, la tête, des cheveux, un chapeau de paille ou un bonnet. Il regarde vers +x.
    marcheur : ses membres sont marqués par une couleur de sommet (rouge : le sens du balancement ; vert : 0 une jambe, 1 un
    bras ; bleu sous 0,5 : un membre) ; le site les fait balancer au rythme de ses pas (animee5 dans js/grandline-3d.js)."""
    z = sol(x, y) if z is None else z
    M = T(x, y, z) @ Rz(rng.random() * 6.28 if angle is None else angle)
    habit = rng.choice(["tissu_rouge", "tissu_bleu", "tissu_vert", "tissu_creme", "tissu_sombre", "toile_ecrue"])
    bas = rng.choice(["tissu_sombre", "tissu_sombre", "tissu_bleu", "tissu_creme"])
    peau = rng.choice(["peau", "peau", "peau_brune"])
    robe = rng.random() < 0.3
    # bleu : 0,25 + sa place (x) dans l'objet, pour que ses membres tournent autour de lui (un marcheur seul : 0,25)
    marque = (lambda sens, bras: (float(sens), float(bras), round(0.25 + x, 3))) if marcheur else (lambda sens, bras: 0)
    for s, sens in ((1, 0), (-1, 1)):  # les jambes ; le pied dépasse vers l'avant
        L.ajouter(*N.tube([(0, s * 0.024, 0.14), (0, s * 0.026, 0.016)], [0.021, 0.016], 5), habit if robe else bas, M, zone=marque(sens, 0))
        L.ajouter(*N.boite(0.05, 0.027, 0.018), "planches_sombres", M @ T(0.012, s * 0.026, 0), zone=marque(sens, 0))
    if robe:
        L.ajouter(*N.cylindre(0.062, 0.042, 0.1, 7, haut=False), habit, M @ T(0, 0, 0.045))
    L.ajouter(*N.cylindre(0.037, 0.047, 0.085, 7, haut=False), habit, M @ T(0, 0, 0.127))
    L.ajouter(*N.cylindre(0.047, 0.026, 0.022, 7), habit, M @ T(0, 0, 0.212))
    L.ajouter(*N.cylindre(0.04, 0.04, 0.012, 7, haut=False), "planches_sombres", M @ T(0, 0, 0.127))  # la ceinture
    for s, sens in ((1, 1), (-1, 0)):  # les bras : chacun va avec la jambe d'en face
        L.ajouter(*N.tube([(0, s * 0.053, 0.21), (0.004, s * 0.059, 0.158), (0.013, s * 0.057, 0.115)], [0.0145, 0.0125, 0.011], 5), habit, M, zone=marque(sens, 1))
        L.ajouter(*N.sphere(0.0135, 5, 3), peau, M @ T(0.015, s * 0.057, 0.106), zone=marque(sens, 1))
    L.ajouter(*N.cylindre(0.015, 0.014, 0.022, 5, haut=False), peau, M @ T(0, 0, 0.226))
    L.ajouter(*N.sphere(0.036, 7, 5), peau, M @ T(0.003, 0, 0.27))
    genre = rng.random()
    cheveux = rng.choice(["planches_sombres", "tissu_sombre", "planches", "paves_clairs"])
    if genre < 0.35:  # un chapeau de paille
        L.ajouter(*N.cylindre(0.078, 0.072, 0.01, 8), "sable", M @ T(0, 0, 0.292))
        L.ajouter(*N.cylindre(0.04, 0.032, 0.034, 7), "sable", M @ T(0, 0, 0.3))
    elif genre < 0.6:  # un bonnet, un foulard
        L.ajouter(*N.sphere(0.039, 7, 4, 0.72), rng.choice(["tissu_sombre", "tissu_rouge", "tissu_bleu"]), M @ T(-0.002, 0, 0.286))
    else:  # tête nue : les cheveux, plus longs sur la nuque
        L.ajouter(*N.sphere(0.039, 7, 4, 0.7), cheveux, M @ T(-0.004, 0, 0.283))
        L.ajouter(*N.sphere(0.03, 6, 4, 0.9), cheveux, M @ T(-0.018, 0, 0.262))


def coque(L, M, lg, larg, creux, mat="planches", n=7, pont=None, franc=0.08, dedans=None):
    """Une coque de bateau (proue vers +x), posée pour flotter : z = 0 est la ligne d'eau."""
    sec = []
    for i in range(n + 1):
        t = i / n
        x = -lg / 2 + lg * t
        w = larg / 2 * (math.sin(PI * (0.08 + 0.92 * t) ** 0.8) ** 0.7 if t < 1 else 0.02) * (0.72 if i == 0 else 1)
        releve = 0.16 * creux * (abs(t - 0.45) * 2) ** 2.2
        sec.append([(x, -w, franc + releve), (x, -w * 0.82, -creux * 0.35), (x, 0, -creux * (0.75 if 0 < i < n else 0.3)), (x, w * 0.82, -creux * 0.35), (x, w, franc + releve)])
    v = [p for s in sec for p in s]
    f = []
    for i in range(n):
        for k in range(4):
            a, b = i * 5 + k, i * 5 + k + 1
            f.append((a, b, b + 5, a + 5))
    L.ajouter(v, f, mat, M, tourne=True)
    L.ajouter(v, [(4, 3, 2, 1, 0)], mat, M)  # le tableau arrière
    if dedans:
        L.ajouter(v, [tuple(reversed(q)) for q in f] + [(0, 1, 2, 3, 4)], dedans, M, tourne=True)
    if pont:
        pts = [(s[0][0], s[0][1] * 0.96, franc - 0.02 + (s[0][2] - franc) * 0.5) for s in sec] + [(s[4][0], s[4][1] * 0.96, franc - 0.02 + (s[4][2] - franc) * 0.5) for s in reversed(sec)]
        for i in range(n):
            L.ajouter([pts[i], pts[i + 1], pts[2 * n + 1 - (i + 1)], pts[2 * n + 1 - i]], [(0, 1, 2, 3)], pont, M)
    return sec


def barque(L, rng, x, y, angle, lg=0.8):
    M = T(x, y, 0.0) @ Rz(angle)
    coque(L, M, lg, lg * 0.4, 0.14, rng.choice(["planches", "peint_bleu", "peint_rouge", "planches_claires"]), 5, franc=0.07, dedans="planches_claires")
    for xb in (-lg * 0.18, lg * 0.15):
        L.ajouter(*N.boite(0.05, lg * 0.34, 0.015, bas=True), "planches_claires", M @ T(xb, 0, 0.03))
    L.ajouter(*N.boite(lg * 0.8, lg * 0.3, 0.01), "planches_sombres", M @ T(0, 0, -0.04))


def caboteur(L, V, rng, x, y, angle, lg=2.6, voile="toile_ecrue", bande="peint_rouge"):
    """Un petit navire de commerce à quai : coque ronde, château arrière, un mât, la voile ferlée sur sa vergue, des haubans."""
    M = T(x, y, 0.0) @ Rz(angle)
    sec = coque(L, M, lg, lg * 0.34, 0.3, "planches_sombres", 9, pont="pont", franc=0.26)
    for i in range(len(sec) - 1):  # la lisse peinte
        for k in (0, 4):
            a, b = np.array(sec[i][k]), np.array(sec[i + 1][k])
            L.ajouter(*N.poutre(a + (0, 0, 0.02), b + (0, 0, 0.02), 0.05, 0.045), bande, M)
    # le château arrière et sa fenêtre
    L.ajouter(*N.boite(lg * 0.24, lg * 0.27, 0.3), "planches", M @ T(-lg * 0.34, 0, 0.26), tourne=True)
    L.ajouter(*N.boite(lg * 0.27, lg * 0.3, 0.03, bas=True), "pont", M @ T(-lg * 0.34, 0, 0.56))
    fenetre(L, V, rng, M @ Rz(-PI / 2) @ T(0, -(lg * 0.34 + lg * 0.12), 0.3), 0, 0.04, 0.16, 0.16)
    # le mât, la vergue, la voile ferlée, les haubans, le nid
    hm = lg * 0.95
    L.ajouter(*N.cylindre(0.045, 0.028, hm, 6), "planches_claires", M @ T(lg * 0.05, 0, 0.2))
    zv = 0.2 + hm * 0.72
    L.ajouter(*N.poutre((lg * 0.05, -lg * 0.36, zv), (lg * 0.05, lg * 0.36, zv), 0.04), "planches_claires", M)
    L.ajouter(*N.tube([(lg * 0.05, -lg * 0.33, zv - 0.05), (lg * 0.05, -lg * 0.12, zv - 0.09), (lg * 0.05, lg * 0.12, zv - 0.09), (lg * 0.05, lg * 0.33, zv - 0.05)], [0.04, 0.065, 0.065, 0.04], 6), voile, M)
    L.ajouter(*N.cylindre(0.09, 0.11, 0.08, 7), "planches_sombres", M @ T(lg * 0.05, 0, 0.2 + hm * 0.86))
    for s in (-1, 1):
        for dx in (-0.16, 0.0, 0.16):
            L.ajouter(*N.tube([(lg * 0.05 + dx, s * lg * 0.165, 0.3), (lg * 0.05, s * 0.02, 0.2 + hm * 0.84)], 0.008, 3, bouts=False), "corde", M)
    L.ajouter(*N.tube([(lg * 0.5, 0, 0.42), (lg * 0.05, 0, 0.2 + hm * 0.95)], 0.008, 3, bouts=False), "corde", M)
    L.ajouter(*N.tube([(lg * 0.44, 0, 0.36), (lg * 0.66, 0, 0.56)], [0.035, 0.02], 5), "planches_claires", M)  # le beaupré
    for k in range(3):
        caisse(L, M @ T(lg * (0.2 + 0.07 * k), (k - 1) * 0.12, 0.25) @ Rz(k), 0.12)
    tonneau(L, M @ T(-lg * 0.1, 0.1, 0.25), 0.06, 0.14)
    return M @ T(lg * 0.05, 0, 0.2 + hm)  # le haut du mât (pour un fanion)


def etal(L, rng, x, y, angle, toile="toile_rose", z=None):
    z = sol(x, y) if z is None else z
    M = T(x, y, z) @ Rz(angle)
    for sx in (-1, 1):
        for sy, hh in ((-1, 0.42), (1, 0.52)):
            L.ajouter(*N.poutre((sx * 0.26, sy * 0.17, 0), (sx * 0.26, sy * 0.17, hh), 0.025), "planches_sombres", M)
    a = [(-0.33, -0.25, 0.4), (0.33, -0.25, 0.4), (0.33, 0.22, 0.54), (-0.33, 0.22, 0.54)]
    L.ajouter(a + [(p[0], p[1], p[2] + 0.02) for p in a], [(4, 5, 6, 7), (3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5), (3, 0, 4, 7)], toile, M, tourne=True)
    L.ajouter(*N.boite(0.5, 0.26, 0.17), "planches_claires", M)
    for k in range(4):
        L.ajouter(*N.sphere(0.055, 6, 4, 0.7), rng.choice(["fruits", "legumes", "poisson", "tissu_rouge", "tissu_bleu", "or"]), M @ T(-0.18 + k * 0.12, (rng.random() - 0.5) * 0.1, 0.19))


def lampadaire(L, U, x, y, z=None, h=0.62):
    z = sol(x, y) if z is None else z
    M = T(x, y, z)
    L.ajouter(*N.cylindre(0.022, 0.016, h, 5, haut=False), "fer", M)
    L.ajouter(*N.cylindre(0.05, 0.0, 0.05, 5), "fer", M @ T(0, 0, h + 0.07))
    U.ajouter(*N.sphere(0.042, 6, 4), "lumiere", M @ T(0, 0, h + 0.035))


def banniere(lots, x, y, z, h=1.1, couleur="rose", angle=0.0, larg=0.26, long=0.62):
    """Un mât et sa bannière aux couleurs de la commu (elle bouge sur le site : un objet à part)."""
    L = lots["corps"]
    L.ajouter(*N.cylindre(0.022, 0.016, h, 5), "planches_sombres", T(x, y, z))
    L.ajouter(*N.sphere(0.035, 6, 4), "or", T(x, y, z + h + 0.02))
    B = N.Maille()
    n = 4
    pts = [(0.02 + larg * (k / n) * 0.0, 0, 0) for k in range(n + 1)]
    v, f = [], []
    for k in range(n + 1):
        t = k / n
        yy = math.sin(t * PI * 1.4) * 0.03
        v += [(0.02, yy, -long * t), (0.02 + larg, yy, -long * t - (0.08 if k == n else 0))]
    v.append((0.02 + larg / 2, 0.02, -long + 0.06))
    for k in range(n):
        f.append((k * 2, k * 2 + 2, k * 2 + 3, k * 2 + 1))
    B.ajouter(v, f, "fanion_" + couleur, Rz(angle))
    lots["bannieres"].append((B, (x, y, z + h - 0.04), {"anim": "drapeau", "ampl": 0.12, "vitesse": 1.2, "phase": (x * 3 + y) % 6.28}))


# ---------- la ville ----------
def mailles(graine=22, leger=False):
    """leger : la version téléphone (moins de côtés aux formes rondes, un terrain moins fin, un passant sur deux)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _mailles(graine, leger):
    rng = random.Random(graine)
    CHEMINEES.clear()
    SOL.clear()
    L = N.Maille("ile_corps")  # tout ce qui est cuit
    V = N.Maille("ile_vitres")  # les vitres qui s'allument la nuit (matière « vitre » du site)
    U = N.Maille("ile_lumieres")  # les lanternes (matière « lumiere »)
    # animes : (Maille dessinée autour de son origine, origine, extras) ; copies : (numéro dans animes, origine, extras), le même
    # objet posé ailleurs ; reperes : (position, extras), là où le site pose un effet (fumée, mouettes, faisceau du phare)
    lots = {"corps": L, "vitres": V, "lumieres": U, "bannieres": [], "animes": [], "copies": [], "libres": [], "reperes": []}

    # --- le terrain : une grille, la matière selon la hauteur, la pente et le quartier ---
    n, R = (54 if leger else 76), 11.6
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    debut_terrain = len(L.f)
    for j in range(n):
        for i in range(n):
            hs = [H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i]]
            if max(hs) < -0.25:  # sous la mer (elle est opaque sur le site) : rien à montrer
                continue
            x, y = (xs[i] + xs[i + 1]) / 2, (xs[j] + xs[j + 1]) / 2
            pente = (max(hs) - min(hs)) / (2 * R / n)
            u = math.hypot(x - BASSIN[0], y - BASSIN[1])
            an = math.degrees(math.atan2(y - BASSIN[1], x - BASSIN[0]))
            moyen = sum(hs) / 4
            rue = any(abs(an - a) < (2.6 if a == 90 else 2.0) * 6.5 / max(u, 4) for a in (52, 90, 128)) and u > 5.4
            if pente > 0.85:  # une pente raide : la roche (même au bord de l'eau), ou les pavés d'une rue qui monte
                mat = "paves" if rue and moyen > 0.3 else "roche"
            elif moyen < 0.12:
                mat = "sable" if moyen > -0.5 else "fond_marin"
            elif u < 6.7:
                mat = "paves_clairs"
            elif moyen < 0.4:
                mat = "sable"
            elif u > 13.3 and not rue:
                mat = "herbe" if math.sin(x * 1.7 + 0.6) * math.sin(y * 1.9 + 1.1) < 0.72 else "terre"
            elif not sur_ile(x, y, 1.75):
                mat = "herbe_seche" if math.sin(x * 2.3) * math.sin(y * 2.1 + 0.5) < 0.5 else "roche"
            else:
                mat = "herbe" if (not rue and math.sin(x * 1.25 + 2.0) * math.sin(y * 1.45 + 0.7) > 0.62) else "paves"
            L.ajouter([(xs[i], xs[j], hs[0]), (xs[i + 1], xs[j], hs[1]), (xs[i + 1], xs[j + 1], hs[2]), (xs[i], xs[j + 1], hs[3])], [(0, 1, 2, 3)], mat)

    L.regrouper(debut_terrain, None, 4, 0.75)  # le terrain : de grandes cartes vues de dessus, un peu moins fines
    # --- le quai : un mur de pierre en arc autour du bassin, son dallage, ses bittes, ses escaliers ---
    a0, a1, pas = 8, 172, 4
    for a in range(a0, a1, pas):
        p0, p1 = vers(a, RB), vers(a + pas, RB)
        q0, q1 = vers(a, RB + 1.25), vers(a + pas, RB + 1.25)
        L.ajouter(*N.quad((*p1, -0.3), (*p0, -0.3), (*p0, 0.47), (*p1, 0.47)), "quai")
        L.ajouter(*N.quad((*p0, 0.47), (*q0, 0.47), (*q1, 0.47), (*p1, 0.47)), "paves_clairs")
        r0, r1 = vers(a, RB + 0.12), vers(a + pas, RB + 0.12)
        L.ajouter(*N.poutre((*r0, 0.5), (*r1, 0.5), 0.14, 0.07), "pierres_sombres")
    # trois pontons de bois
    PONTONS = ((48, 2.3), (90, 2.6), (132, 2.3))
    emprises = []  # (nom, polygone au sol) des pontons et des bateaux : aucune ne doit en toucher une autre (voir verifier)
    for a, lg in PONTONS:
        d = np.array(vers(a, 1.0, (0, 0)))
        base = np.array(vers(a, RB))
        emprises.append((f"ponton {a}", Vf.rectangle(*(base - d * lg / 2), lg, 0.5, math.radians(a))))
        M = T(base[0], base[1], 0) @ Rz(math.radians(a) + PI)
        L.ajouter(*N.boite(lg, 0.5, 0.05, bas=True), "pont", M @ T(lg / 2, 0, 0.38))
        for k in range(int(lg / 0.55) + 1):
            for s in (-1, 1):
                L.ajouter(*N.cylindre(0.04, 0.035, 0.75 + 0.12 * ((k + s) % 2), 6), "planches_sombres", M @ T(0.15 + k * 0.55, s * 0.24, -0.25))
        for k in range(int(lg / 0.55)):
            L.ajouter(*N.poutre((0.15 + k * 0.55, -0.24, 0.2), (0.15 + (k + 1) * 0.55, 0.24, 0.05), 0.03), "planches_sombres", M)
        lampadaire(L, U, *(base - d * (lg - 0.15))[:2], z=0.43, h=0.5)
        tonneau(L, M @ T(lg - 0.5, 0.14, 0.43))
        caisse(L, M @ T(lg - 0.85, -0.12, 0.43) @ Rz(0.4), 0.16)

    # --- le plan de circulation : où marchent les habitants. Rien d'autre ne s'y pose (voir libre() et verifier()) ---
    # le quai, du bord vers les maisons (rayons depuis le centre du bassin) : la bordure (bittes, lanternes), les tas de
    # caisses et ceux qui regardent la mer, deux files de passants, la charrette, puis les façades (RB + 1,02)
    R_BORD, R_TAS = RB + 0.2, RB + 0.36
    R_VOIE_A, R_VOIE_B, R_CHAR = RB + 0.64, RB + 0.8, RB + 0.8  # la charrette roule à l'ouest, sur la file B (le passant de cette file reste à l'est)
    R_RUE2, R_RUE3 = 7.98, 10.88  # les rues des deuxième et troisième terrasses
    px, py = vers(90, 5.75)  # la place du marché, sa fontaine au milieu
    fz = 0.47

    def arc(r, a0_, a1_, pas_=6.0, z=None):
        pts = []
        a_ = float(a0_)
        while a_ <= a1_ + 1e-6:
            x, y = vers(a_, r)
            pts.append((x, y, (sol(x, y) + 0.02) if z is None else z))
            a_ += pas_
        return pts

    def escalier(a_, depart, arrivee):
        """Monter une rue en escalier, une marche après l'autre, du quai (ou de la place) jusqu'à une rue d'en haut."""
        pts = [(*vers(a_, depart), 0.47)]
        for (r0, r1, zb, zh) in TERRASSES:
            if r1 > arrivee:
                break
            pts.append((*vers(a_, r0 - 0.12), zb + 0.02))
            pts.append((*vers(a_, r0 - 0.005), zb + (zh - zb) * 0.16 + 0.04))  # le pied sur la première marche
            for k in range(6):
                pts.append((*vers(a_, r0 + (r1 - r0) * (k / 6 + 0.08)), zb + (zh - zb) * (k / 6 + 0.16) + 0.04))
            pts.append((*vers(a_, r1 + 0.12), zh + 0.02))
        x, y = vers(a_, arrivee)
        pts.append((x, y, sol(x, y) + 0.02))
        return pts

    place_e = [(px + 0.74, py - 0.1, fz), (px + 1.85, py - 0.1, fz)]
    place_o = [(px - 0.74, py - 0.1, fz), (px - 1.85, py - 0.1, fz)]
    ponton_48 = [(*vers(48, RB + 0.5), 0.47), (*vers(48, RB + 0.02), 0.47), (*vers(48, RB - 0.12), 0.43), (*vers(48, RB - 1.2), 0.43)]
    chemins = [  # (points, en rond, vitesse, départ, pause au bout) ; les cinq premiers suffisent à la version légère
        (arc(R_VOIE_A, 22, 158, 6, 0.47), False, 0.26, 0.0, 1.5),
        (place_e, False, 0.1, 0.1, 4.0),
        (escalier(90, 6.45, R_RUE3), False, 0.2, 0.3, 2.0),
        (arc(R_RUE2, 41, 152, 6), False, 0.21, 0.55, 1.5),
        (ponton_48, False, 0.16, 0.2, 5.0),
        (arc(R_VOIE_B, 22, 84, 6, 0.47), False, 0.23, 0.5, 1.5),
        (place_o, False, 0.1, 0.62, 4.0),
        (escalier(52, RB + 1.1, R_RUE3), False, 0.19, 0.7, 2.0),
        (escalier(128, RB + 1.1, R_RUE3), False, 0.2, 0.15, 2.0),
        (arc(R_RUE3, 51.5, 144, 5), False, 0.18, 0.4, 1.5),  # à l'est, une tour des remparts ferme la rue
    ]
    voie_charrette = arc(R_CHAR, 100, 156, 8, 0.47)
    couloirs = [(pts, 0.07) for pts, *_ in chemins] + [(voie_charrette, 0.17)]

    def hors_couloirs(x, y, r):
        """Ce point (un objet de rayon r) laisse-t-il le passage aux habitants ?"""
        q = np.array((x, y))
        for pts, rc in couloirs:
            for a_, b_ in zip(pts[:-1], pts[1:]):
                a2, b2 = np.array(a_[:2]), np.array(b_[:2])
                t = min(1.0, max(0.0, float(np.dot(q - a2, b2 - a2) / max(1e-9, np.dot(b2 - a2, b2 - a2)))))
                if np.linalg.norm(q - (a2 + (b2 - a2) * t)) < r + rc + 0.03:
                    return False
        return True

    # --- les bateaux : deux caboteurs à quai, chacun le long de son ponton, du côté libre ; des barques ---
    def au_ponton(a, le_long, de_cote):
        c, si = math.cos(math.radians(a)), math.sin(math.radians(a))
        bx, by = vers(a, RB - le_long)
        return bx - si * de_cote, by + c * de_cote

    def navire_a_quai(nom, a, le_long, de_cote, angle, lg, bande):
        x, y = au_ponton(a, le_long, de_cote)
        caboteur(L, V, rng, x, y, angle, lg, bande=bande)
        emprises.append((nom, Vf.rectangle(x, y, lg, lg * 0.34, angle)))

    navire_a_quai("caboteur rouge", 90, 1.55, 0.72, math.radians(90) + PI, 2.7, "peint_rouge")  # à l'ouest du ponton du milieu
    navire_a_quai("caboteur bleu", 48, 1.45, -0.7, math.radians(48), 2.4, "peint_bleu")  # à l'est du ponton de l'est, côté large
    # le rameur fait le tour du bassin, au large des pontons
    bxm, bym = BASSIN
    tour_bassin = [(bxm - 3.3, bym - 1.3), (bxm - 1.2, bym + 0.55), (bxm + 0.9, bym + 0.5), (bxm + 3.4, bym - 1.1), (bxm + 0.2, bym - 2.7)]
    # les barques : chacune est un objet à part, qui monte et descend avec la houle du site (« mer ») ; sinon la mer, qui
    # bouge, les noie une vague sur deux. Elles flottent un peu haut (HB) : leur plancher reste au-dessus de l'eau, que le
    # site dessine à plat (sans cela on verrait la mer dans la barque). Chaque place est essayée : libre, à l'écart du
    # quai, des pontons, des navires, des autres barques et de la route du rameur
    HB = 0.075
    route = Vf.points_du_chemin([(x, y, 0.0) for x, y in tour_bassin], True, 0.15)
    places = []
    for a, r, an in ((150, 3.5, 0.4), (166, 2.6, -0.3), (112, 3.45, 1.2), (20, 2.2, 2.6), (66, 3.5, 0.2), (8, 3.5, 1.0), (30, 1.0, 0.3), (140, 1.3, 2.0), (100, 0.3, 0.5), (172, 3.6, 0.9)):
        x, y = vers(a, r)
        large = Vf.rectangle(x, y, 0.8 + 0.3, 0.32 + 0.3, an)  # avec 15 cm de marge de chaque côté
        if r > RB - 0.55 and y > BASSIN[1] - 0.2:
            continue
        if any(Vf.penetration(large, e) > 0 for _, e in emprises) or min(math.hypot(x - q[0], y - q[1]) for q in route) < 0.75:
            continue
        places.append((x, y, an))
        emprises.append((f"barque {len(places)}", Vf.rectangle(x, y, 0.8, 0.32, an)))
        if len(places) == 5:
            break
    assert len(places) == 5, f"seulement {len(places)} places de barque libres"
    for k, (x, y, an) in enumerate(places):
        Bq = N.Maille("barque_flotte")
        barque(Bq, rng, 0, 0, an)
        if leger and k in (1, 2):  # le téléphone en garde trois
            continue
        lots["animes"].append((Bq, (x, y, HB), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 1.7 * k + 0.4}))
    Bq = N.Maille("barque_rame")  # et celle-là traverse le bassin, un rameur à bord
    barque(Bq, rng, 0, 0, 0.0, 0.9)
    passant(Bq, rng, -0.08, 0, angle=0.0, z=0.0)
    for s_ in (-1, 1):
        Bq.ajouter(*N.poutre((0.02, s_ * 0.12, 0.13), (0.1, s_ * 0.5, 0.0), 0.022), "planches_claires")
    lots["animes"].append((Bq, (*tour_bassin[0], HB), {"anim": "marche", "chemin": [c for x, y in tour_bassin for c in (x, y, HB)], "boucle": 1, "vitesse": 0.34, "saut": 0.0, "roulis": 0.06, "phase": 0.2}))
    lots["plan"] = {"emprises": emprises, "rameur": tour_bassin, "sol": SOL}
    # --- sur l'eau (dessiné par le site) : le reflet sombre du quai, des pontons et des coques ; un liseré d'écume au pied du mur ---
    import barhaw_ile_v5 as K
    Rv = N.Maille("rivage")
    K.bande(Rv, [vers(a, RB - 0.01) for a in range(172, 7, -4)], [vers(a, RB - 0.75) for a in range(172, 7, -4)], mat="ombre_eau")
    for nom, poly in emprises:  # l'ombre de chaque ponton, de chaque coque
        if leger and nom in ("barque 2", "barque 3"):  # les deux barques que le téléphone n'a pas
            continue
        (x0, y0), (x1, y1), (x2, y2) = poly[0], poly[1], poly[2]
        lx, ly = math.hypot(x1 - x0, y1 - y0), math.hypot(x2 - x1, y2 - y1)
        coque_ = not nom.startswith("ponton")
        K.tache(Rv, (x0 + x2) / 2, (y0 + y2) / 2, lx * (0.96 if coque_ else 1.0), ly * (0.9 if coque_ else 1.0), math.atan2(y1 - y0, x1 - x0), rond=coque_, marge=0.3 if coque_ else 0.36)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))

    # --- les entrepôts et les maisons du quai (premier rang, face au bassin) ---
    def rang(angles, rayon, jeu=2.0, **k):
        for a in angles:
            x, y = vers(a + (rng.random() - 0.5) * jeu, rayon + (rng.random() - 0.5) * 0.2)
            if "z" not in k and not sur_ile(x, y):
                continue
            reglages = dict(k)
            if callable(reglages.get("f")):
                reglages.update(reglages.pop("f")(a))
            reglages.pop("f", None)
            maison(L, V, rng, x, y, math.radians(a) + PI / 2 + (rng.random() - 0.5) * 0.12, **reglages)

    murs = ["crepi", "crepi_ocre", "crepi_rose", "crepi_blanc", "crepi_bleu"]
    toits = ["tuiles", "tuiles", "tuiles_rouges", "tuiles_brunes"]
    alea = lambda a: dict(lx=1.25 + rng.random() * 0.55, ly=0.95 + rng.random() * 0.3, etages=rng.choice([2, 2, 3]), mur=rng.choice(murs), toit=rng.choice(toits), lucarne=rng.random() < 0.4,
                          boutique=rng.choice([None, None, "toile_rose", "toile_violette", "toile_or", "toile_turquoise"]), enseigne=rng.random() < 0.35)
    # les entrepôts : grands, en planches, toits bruns
    # chaque rangée laisse passer les trois rues en escalier (à 52°, 90° et 128°) ; au milieu du premier rang, la place du marché
    for a in (40, 140):  # un entrepôt de chaque côté ; aux bouts du quai : la batterie (est), la jetée du phare (ouest)
        x, y = vers(a, 6.05)
        maison(L, V, rng, x, y, math.radians(a) + PI / 2, lx=1.6, ly=1.25, etages=2, mur=rng.choice(["planches", "planches_grises", "planches_sombres"]), toit="tuiles_brunes", bois=False, bas="pierres_sombres", z=0.47)
    rang((63, 117), 6.15, jeu=0.4, f=lambda a: {**alea(a), "lx": 1.3 + rng.random() * 0.2}, z=0.47)
    # la deuxième terrasse (deux jardins à la place d'une maison, de chaque côté)
    rang((31, 43, 61, 81, 99, 119, 137, 149), 9.05, jeu=0.6, f=alea)
    # la troisième terrasse (l'hôtel de ville est au milieu)
    rang((36, 45.5, 58.5, 69, 111, 121.5, 134.5, 144), 12.0, jeu=0.6, f=alea)
    # tout en haut, quelques maisons et des arbres
    rang((82, 98, 110, 125.5, 137), 14.9, f=lambda a: dict(lx=1.2 + rng.random() * 0.4, ly=1.0, etages=2, mur=rng.choice(murs), toit=rng.choice(["ardoises", "tuiles_rouges"])))

    # --- la place du marché : la fontaine, les étals, les bannières ---
    L.ajouter(*N.cylindre(0.5, 0.5, 0.16, 8, haut=False), "pierres_claires", T(px, py, fz))
    L.ajouter(*N.cylindre(0.56, 0.56, 0.05, 8, bas=True), "pierres_sombres", T(px, py, fz + 0.16))
    L.ajouter(*N.cylindre(0.44, 0.44, 0.02, 8), "eau_bassin", T(px, py, fz + 0.13))
    L.ajouter(*N.cylindre(0.07, 0.05, 0.42, 6), "pierres_claires", T(px, py, fz + 0.1))
    L.ajouter(*N.cylindre(0.2, 0.08, 0.06, 8), "pierres_claires", T(px, py, fz + 0.5) @ Rx(PI) @ T(0, 0, -0.06))
    L.ajouter(*N.sphere(0.07, 7, 5), "or", T(px, py, fz + 0.62))
    # quatre étals en rang au fond de la place, de part et d'autre de la fontaine ; ils regardent le quai
    ETALS = (-1.72, -1.0, 1.0, 1.72)
    ETAL_Y = 0.46
    for k, dx in enumerate(ETALS):
        etal(L, rng, px + dx, py + ETAL_Y, 0.0, ["toile_rose", "toile_violette", "toile_or", "toile_turquoise"][k % 4], z=fz)
    for dx, dy, c in ((-1.4, 0.8, "rose"), (1.4, 0.8, "violet"), (-0.5, 0.86, "violet"), (0.5, 0.86, "rose")):
        banniere(lots, px + dx, py + dy, fz, 1.25, c)
    for dx, dy in ((-0.62, -0.3), (0.62, -0.3), (-1.4, -0.34), (1.4, -0.34)):
        lampadaire(L, U, px + dx, py + dy, z=fz)

    # --- l'hôtel de ville et son beffroi (troisième terrasse, plein nord) ---
    hx, hy = vers(90, 11.75)
    hz = sol(hx, hy)
    maison(L, V, rng, hx - 1.35, hy, 0.0, lx=2.3, ly=1.35, etages=3, mur="crepi_blanc", toit="ardoises", lucarne=True, z=hz)
    maison(L, V, rng, hx + 1.35, hy, 0.0, lx=2.3, ly=1.35, etages=3, mur="crepi_ocre", toit="ardoises", lucarne=True, z=hz)
    Mb = T(hx, hy - 0.15, hz)
    L.ajouter(*N.boite(1.15, 1.15, 3.9, haut=False), "pierres_claires", Mb @ T(0, 0, -0.5))
    for zc in (1.1, 2.3, 3.36):
        L.ajouter(*N.boite(1.27, 1.27, 0.09, bas=True), "pierres_sombres", Mb @ T(0, 0, zc))
    for k in range(4):
        Mw = Mb @ Rz(k * PI / 2) @ T(0, -0.576, 0)
        L.ajouter(*N.quad((-0.36, -0.01, 2.5), (0.36, -0.01, 2.5), (0.36, -0.01, 3.22), (-0.36, -0.01, 3.22)), "cadran_nu" if k == 0 else "cadran", Mw)
        fenetre(L, V, rng, Mw, 0, 1.45, 0.24, 0.5, mat="fenetre_haute", allumee=True)
        if k == 0:
            L.ajouter(*N.quad((-0.24, -0.012, 0.0), (0.24, -0.012, 0.0), (0.24, -0.012, 0.62), (-0.24, -0.012, 0.62)), "porte", Mw)
    # la chambre des cloches : quatre piliers, la cloche, la flèche d'ardoise et ses quatre clochetons
    zc = 3.45
    for sx in (-1, 1):
        for sy in (-1, 1):
            L.ajouter(*N.boite(0.2, 0.2, 0.7), "pierres_claires", Mb @ T(sx * 0.47, sy * 0.47, zc))
            v, f = N.toit_pointe(0.11, 0.36, 4, 0.03)
            L.ajouter(v, f, "ardoises", Mb @ T(sx * 0.5, sy * 0.5, zc + 0.82))
    Cl = N.Maille("cloche")  # la cloche se balance
    Cl.ajouter(*N.cylindre(0.2, 0.09, 0.26, 8, bas=True), "cuivre", T(0, 0, -0.3))
    Cl.ajouter(*N.sphere(0.045, 6, 4), "fer", T(0, 0, -0.33))
    Cl.ajouter(*N.poutre((-0.3, 0, 0), (0.3, 0, 0), 0.05), "planches_sombres")
    lots["animes"].append((Cl, (hx, hy - 0.15, hz + zc + 0.5), {"anim": "balance", "axe": [1.0, 0.0, 0.0], "ampl": 0.32, "vitesse": 2.1}))
    for nom_, lg_, ep_, tour_, dy_ in (("aiguille_minutes", 0.3, 0.034, 3600, 0.022), ("aiguille_heures", 0.2, 0.05, 43200, 0.034)):
        Ai = N.Maille(nom_)  # les aiguilles du cadran sud : le site les met à l'heure de Paris
        Ai.ajouter(*N.boite(ep_, 0.01, lg_ + 0.04, bas=True), "fer", T(0, 0, -0.04))
        lots["animes"].append((Ai, (hx, hy - 0.15 - 0.586 - dy_, hz + 2.86), {"anim": "aiguille", "axe": [0.0, -1.0, 0.0], "tour": tour_}))
    L.ajouter(*N.boite(1.27, 1.27, 0.1, bas=True), "pierres_sombres", Mb @ T(0, 0, zc + 0.7))
    v, f = N.toit_pointe(0.62, 1.7, 4, 0.1)
    L.ajouter(v, f, "ardoises", Mb @ T(0, 0, zc + 0.8))
    L.ajouter(*N.sphere(0.08, 7, 5), "or", Mb @ T(0, 0, zc + 2.55))
    L.ajouter(*N.cylindre(0.012, 0.012, 0.3, 4), "or", Mb @ T(0, 0, zc + 2.55))
    banniere(lots, hx - 0.52, hy - 0.8, hz + 2.2, 0.5, "rose", long=0.9, larg=0.34)
    banniere(lots, hx + 0.52, hy - 0.8, hz + 2.2, 0.5, "violet", long=0.9, larg=0.34)

    # --- le moulin (à l'est, sur la troisième terrasse) : la tour, la calotte ; les ailes tournent (un objet à part, cuit lui aussi) ---
    mx, my = 5.6, 5.3
    mz = sol(mx, my)
    L.ajouter(*N.cylindre(0.56, 0.4, 1.9, 10, haut=False), "crepi_blanc", T(mx, my, mz - 0.4))
    v, f = N.toit_pointe(0.42, 0.6, 10, 0.08, 0)
    L.ajouter(v, f, "bardeaux", T(mx, my, mz + 1.5))
    fenetre(L, V, rng, T(mx, my, mz) @ Rz(0.5) @ T(0, -0.5, 0), 0, 0.5, 0.14, 0.2)
    L.ajouter(*N.quad((-0.12, -0.56, 0), (0.12, -0.56, 0), (0.12, -0.52, 0.36), (-0.12, -0.52, 0.36)), "porte", T(mx, my, mz) @ Rz(-0.4))
    ax = (mx - 0.42 * math.cos(1.1), my - 0.42 * math.sin(1.1) - 0.02, mz + 1.62)
    A = N.Maille("moulin_ailes")
    Ma = Rz(1.1 + PI / 2) @ Rx(PI / 2)  # les ailes dans un plan vertical, face au sud-ouest
    A.ajouter(*N.cylindre(0.06, 0.05, 0.16, 6), "fer", Ma @ T(0, 0, -0.04))
    for k in range(4):
        Mk = Ma @ Rz(k * PI / 2 + 0.3)
        A.ajouter(*N.poutre((0, 0, 0.06), (1.25, 0, 0.06), 0.035), "planches_sombres", Mk)
        A.ajouter([(0.22, 0.02, 0.07), (1.2, 0.02, 0.07), (1.2, 0.3, 0.09), (0.22, 0.3, 0.09), (0.22, 0.02, 0.055), (1.2, 0.02, 0.055), (1.2, 0.3, 0.075), (0.22, 0.3, 0.075)], [(0, 1, 2, 3), (7, 6, 5, 4)], "toile_ecrue", Mk)
        for xx in (0.22, 0.55, 0.88, 1.2):
            A.ajouter(*N.poutre((xx, 0.02, 0.075), (xx, 0.3, 0.095), 0.018), "planches_sombres", Mk)
    lots["animes"].append((A, ax, {"anim": "tourne", "axe": [-math.cos(1.1), -math.sin(1.1), 0.0], "vitesse": 0.5}))

    # --- les remparts : un mur crénelé sur le pourtour (nord, est, ouest), cinq tours rondes, la porte de l'ouest ---
    Rw = 8.15
    pts = []
    for a in range(-14, 195, 4):
        r = Rw + 0.25 * math.sin(a * 0.11)
        pts.append((CENTRE[0] + math.cos(math.radians(a)) * r * LARGE, CENTRE[1] + math.sin(math.radians(a)) * r * 0.96))
    for k in range(len(pts) - 1):
        (xa, ya), (xb, yb) = pts[k], pts[k + 1]
        zb = min(sol(xa, ya), sol(xb, yb))
        zt = max(sol(xa, ya), sol(xb, yb)) + 0.75
        an = math.atan2(yb - ya, xb - xa)
        lg = math.hypot(xb - xa, yb - ya)
        M = T((xa + xb) / 2, (ya + yb) / 2, zb - 0.35) @ Rz(an)
        L.ajouter(*N.boite(lg + 0.04, 0.26, zt - zb + 0.35), "pierres", M)
        for c in range(2):
            L.ajouter(*N.boite(lg * 0.26, 0.09, 0.14), "pierres", M @ T((c - 0.5) * lg * 0.5, 0.085, zt - zb + 0.35))
    for a in (-10, 38, 90, 142, 190):
        r = Rw + 0.25 * math.sin(a * 0.11)
        tour(L, V, rng, CENTRE[0] + math.cos(math.radians(a)) * r * LARGE, CENTRE[1] + math.sin(math.radians(a)) * r * 0.96, 0.6, 1.75 if a != 90 else 2.3, toit="tuiles_rouges" if a != 90 else "ardoises")
    banniere(lots, CENTRE[0] + Rw * math.cos(math.radians(90)) + 0.0, CENTRE[1] + Rw * 0.96 + 0.25 * math.sin(9.9) * 0.96, sol(0, CENTRE[1] + Rw * 0.96) + 3.75, 0.5, "rose", long=0.7)

    # --- le phare, au bout de la jetée de l'ouest ; la batterie, à l'est ---
    fx, fy = -5.75, -6.55
    for k in range(7):
        t = k / 6
        x, y = -4.95 + (fx + 4.95) * t + 0.14 * math.sin(k * 2.1), -5.55 + (fy + 5.55) * t
        L.ajouter(*N.sphere(0.75 - 0.2 * t, 8, 5, 0.7), "roche", T(x, y, 0.0) @ Rz(k))
        occupe(L, "rocher", f"rocher de la jetée {k}", Vf.rond(x, y, (0.75 - 0.2 * t) * 0.8))
    L.ajouter(*N.cylindre(0.75, 0.68, 0.5, 10), "pierres_sombres", T(fx, fy, 0.25))
    L.ajouter(*N.cylindre(0.5, 0.36, 2.5, 12, haut=False), "crepi_blanc", T(fx, fy, 0.75))
    L.ajouter(*N.cylindre(0.455, 0.42, 0.42, 12, haut=False), "peint_rouge", T(fx, fy, 1.55), tourne=True)
    L.ajouter(*N.cylindre(0.52, 0.52, 0.06, 12, bas=True), "pierres_sombres", T(fx, fy, 3.25))
    for k in range(12):
        an = k * PI / 6
        L.ajouter(*N.cylindre(0.012, 0.012, 0.16, 4, haut=False), "fer", T(fx + math.cos(an) * 0.5, fy + math.sin(an) * 0.5, 3.31))
    L.ajouter(*N.cylindre(0.51, 0.51, 0.015, 12, haut=False), "fer", T(fx, fy, 3.46))
    U.ajouter(*N.cylindre(0.24, 0.24, 0.36, 8, haut=False), "lumiere", T(fx, fy, 3.31))
    for k in range(8):
        an = k * PI / 4
        L.ajouter(*N.cylindre(0.014, 0.014, 0.36, 4, haut=False), "fer", T(fx + math.cos(an) * 0.25, fy + math.sin(an) * 0.25, 3.31))
    v, f = N.toit_pointe(0.3, 0.34, 8, 0.05, 0)
    L.ajouter(v, f, "cuivre", T(fx, fy, 3.67))
    L.ajouter(*N.sphere(0.05, 6, 4), "or", T(fx, fy, 4.05))
    fenetre(L, V, rng, T(fx, fy, 0.75) @ Rz(0.6) @ T(0, -0.47, 0), 0, 0.5, 0.12, 0.2, mat="fenetre_haute")
    fenetre(L, V, rng, T(fx, fy, 0.75) @ Rz(-1.2) @ T(0, -0.42, 0), 0, 1.5, 0.12, 0.2, mat="fenetre_haute")
    bx, by = 6.75, -5.35
    for k in range(5):  # son socle de rochers, du côté du large
        an = math.radians(-120 + 40 * k)
        x, y, rr = bx + math.cos(an) * 0.88, by + math.sin(an) * 0.88, 0.66 - 0.05 * k
        L.ajouter(*N.sphere(rr, 8, 5, 0.7), "roche", T(x, y, 0.0) @ Rz(k * 1.3))
        occupe(L, "rocher", f"rocher de la batterie {k}", Vf.rond(x, y, rr * 0.8))
    tour(L, V, rng, bx, by, 0.8, 0.95, creneaux=True, z=0.3, mur="pierres_sombres", n=12)
    for k in range(3):
        an = -1.2 - k * 0.55
        Mc = T(bx, by, 1.37) @ Rz(an)
        L.ajouter(*N.cylindre(0.05, 0.04, 0.4, 6), "fer", Mc @ T(0.3, 0, 0.08) @ Ry(PI / 2 - 0.12))
        L.ajouter(*N.boite(0.22, 0.14, 0.07), "planches_sombres", Mc @ T(0.36, 0, 0))
    banniere(lots, bx, by, 1.37, 0.9, "violet")

    # --- sur le quai : la grue de bois, des tas de caisses et de tonneaux, des filets, des lanternes ---
    gx, gy = vers(80, R_TAS)
    Mg = T(gx, gy, 0.47) @ Rz(math.radians(80) + PI)
    L.ajouter(*N.boite(0.42, 0.42, 0.08), "planches_sombres", Mg)
    L.ajouter(*N.poutre((0, 0, 0.08), (0, 0, 1.1), 0.08), "planches", Mg)
    Gr = N.Maille("grue_bras")  # le bras tourne lentement, sa caisse au bout du câble (au-dessus des têtes)
    Mgl = Rz(math.radians(80) + PI)
    Gr.ajouter(*N.poutre((-0.25, 0, 0.48), (0.95, 0, 0.98), 0.06), "planches", Mgl)
    Gr.ajouter(*N.poutre((0, 0, 0.03), (0.5, 0, 0.78), 0.04), "planches_sombres", Mgl)
    Gr.ajouter(*N.tube([(0.92, 0, 0.96), (0.92, 0, 0.28)], 0.008, 3, bouts=False), "corde", Mgl)
    caisse(Gr, Mgl @ T(0.92, 0, 0.08), 0.2)
    lots["animes"].append((Gr, (gx, gy, 0.94), {"anim": "balance", "axe": [0.0, 0.0, 1.0], "ampl": 0.5, "vitesse": 0.28}))
    L.ajouter(*N.cylindre(0.2, 0.2, 0.09, 10, bas=True), "planches_claires", Mg @ T(-0.13, 0.0, 0.42) @ Ry(PI / 2))  # la roue, le long du quai
    # les tas : rangés le long du quai, côté bassin
    for a in (20, 33, 62, 104, 118, 146, 162):
        x, y = vers(a, R_TAS + (rng.random() - 0.5) * 0.04)
        M = T(x, y, 0.47) @ Rz(math.radians(a) + PI / 2 + (rng.random() - 0.5) * 0.2)
        genre = rng.random()
        if genre < 0.45:
            caisse(L, M @ T(-0.1, 0, 0), 0.18)
            caisse(L, M @ T(0.12, 0.01, 0) @ Rz(0.2), 0.16)
            caisse(L, M @ T(-0.03, 0.0, 0.18) @ Rz(0.4), 0.14)
        elif genre < 0.8:
            for k in range(3):
                tonneau(L, M @ T((k - 1) * 0.19, (k % 2) * 0.07 - 0.035, 0))
        else:
            L.ajouter(*N.sphere(0.19, 7, 4, 0.35), "corde", M @ T(-0.08, 0, 0.05))
            L.ajouter(*N.sphere(0.11, 6, 4, 0.5), "poisson", M @ T(0.17, 0.02, 0.04))
    reserve = lambda a: any(abs(a - ap) < 4.6 for ap, _ in PONTONS)  # l'entrée des pontons reste libre
    for a in (12, 25, 38, 57, 71, 99, 113, 141, 155, 168):
        lampadaire(L, U, *vers(a, R_BORD), z=0.47)
    for a in range(14, 170, 12):  # les bittes d'amarrage, sur la bordure
        if not reserve(a):
            L.ajouter(*N.cylindre(0.04, 0.052, 0.12, 6), "fer", T(*vers(a, RB + 0.09), 0.5))

    # --- les rues : des escaliers de pierre entre les terrasses, des lanternes, des arbres, des jardins ---
    for a in (52, 90, 128):
        for (r0, r1, zb, zh) in TERRASSES:
            for k in range(6):
                t = k / 6
                x, y = vers(a, r0 + (r1 - r0) * (t + 0.08))
                L.ajouter(*N.boite(0.62, (r1 - r0) / 6 + 0.02, 0.07), "pierres_claires", T(x, y, zb + (zh - zb) * (t + 0.16) - 0.03) @ Rz(math.radians(a) + PI / 2))
            lampadaire(L, U, *vers(a + 3.6, r1 + 0.03))
    for a, r in ((22, 9.6), (36, 13.4), (49, 15.6), (64, 16.4), (80, 15.8), (100, 16.0), (116, 16.5), (131, 15.5), (144, 13.5), (158, 9.6), (90, 14.75), (57.5, 10.25), (122.5, 10.25), (84, 13.2), (96, 13.2), (18, 7.4), (162, 7.4), (71, 9.38), (71.4, 8.74), (109, 9.38), (108.6, 8.74)):
        x, y = vers(a, r)
        if sol(x, y) > 0.4:
            arbre(L, rng, x, y, 0.75 + rng.random() * 0.45, 0.34 + rng.random() * 0.14, "cypres" if rng.random() < 0.35 else "rond")
    for a, r in ((60, 10.35), (120, 10.35), (75, 13.3), (105, 13.3)):
        x, y = vers(a, r)
        L.ajouter(*N.sphere(0.2, 7, 4, 0.7), "feuillage", T(x, y, sol(x, y) + 0.05))

    # --- les passants (immobiles) : chacun à une place libre, hors des passages des habitants qui marchent ---
    rien = N.Maille("rien")  # version légère : un passant sur deux (tiré quand même, pour que la ville reste la même)
    nb = [0]

    def ou():
        nb[0] += 1
        return rien if leger and nb[0] % 2 == 0 else L

    O = Vf.Obstacles(L)  # tout ce qui est déjà posé : personne ne se tient dans une caisse, un étal ou un mur
    debout = []

    def poser_passant(x, y, z, angle=None):
        """Pose un passant ici si la place est libre (rien à 8 cm, hors des passages, pas collé à un autre)."""
        if O.touche(x, y, z, 0.085) or not hors_couloirs(x, y, 0.065) or any(math.hypot(x - q[0], y - q[1]) < 0.19 for q in debout):
            return False
        passant(ou(), rng, x, y, angle=angle, z=z)
        debout.append((x, y))
        return True

    def poser_vers(a, r, z=None, face=None):
        """La même chose en essayant quelques places voisines le long de l'arc."""
        for da in (0, 1.3, -1.3, 2.6, -2.6):
            x, y = vers(a + da, r)
            if poser_passant(x, y, sol(x, y) if z is None else z, None if face is None else math.radians(a + da) + face):
                return True
        return False

    for a in (9, 26.5, 39.5, 56, 68.5, 97.5, 111, 124, 139, 153, 168):  # au bord du quai, ils regardent le bassin
        poser_vers(a, R_TAS - 0.02, 0.47, PI + (rng.random() - 0.5) * 0.8)
    for k, dx in enumerate(ETALS):  # au marché : le marchand derrière son étal, un client devant
        poser_passant(px + dx + 0.02, py + ETAL_Y + 0.23, fz, -PI / 2)
        poser_passant(px + dx + (0.12 if k % 2 else -0.1), py + ETAL_Y - 0.36, fz, PI / 2)
    poser_passant(px + 0.45, py - 0.52, fz, 2.2)  # près de la fontaine
    for a in (36, 46, 66, 76, 104, 114, 144):  # dans la rue de la deuxième terrasse, devant les maisons
        poser_vers(a, 8.25)
    for a, lg in PONTONS:  # au bout de chaque ponton
        d = np.array(vers(a, 1.0, (0, 0)))
        q = np.array(vers(a, RB)) - d * (lg - 0.3) + np.array((-d[1], d[0])) * 0.14
        poser_passant(q[0], q[1], 0.43, math.radians(a) + PI + 0.9)
    lots["plan"]["debout"] = len(debout)

    # --- la vie : des habitants qui marchent (quatre modèles, posés à dix endroits), la charrette, la fumée, les mouettes, le phare ---
    types = []
    for k in range(4):
        Pm = N.Maille(f"habitant{k}")
        passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)

    Ch = N.Maille("charrette")  # un marchand pousse sa charrette à bras le long du quai (elle avance vers +x)
    passant(Ch, rng, -0.15, 0, angle=0.0, z=0.0, marcheur=True)
    Ch.ajouter(*N.boite(0.3, 0.17, 0.02, bas=True), "planches_claires", T(0.13, 0, 0.1))
    for s_ in (-1, 1):
        Ch.ajouter(*N.boite(0.3, 0.015, 0.05, bas=True), "planches", T(0.13, s_ * 0.085, 0.11))
        Ch.ajouter(*N.cylindre(0.075, 0.075, 0.022, 8, bas=True), "planches_sombres", T(0.15, s_ * 0.11, 0.075) @ Rx(PI / 2) @ T(0, 0, -0.011))
        Ch.ajouter(*N.poutre((-0.02, s_ * 0.075, 0.115), (-0.13, s_ * 0.075, 0.15), 0.014), "planches_sombres")
    tonneau(Ch, T(0.07, 0.0, 0.12), 0.055, 0.12)
    caisse(Ch, T(0.2, 0.01, 0.12) @ Rz(0.3), 0.1)

    faits = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:5] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.022, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in faits:
            faits[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((faits[t_], pts[0], extras))
    lots["animes"].append((Ch, voie_charrette[0], {"anim": "marche", "chemin": [float(c) for p_ in voie_charrette for c in p_], "vitesse": 0.13, "phase": 0.35, "saut": 0.0, "pause": 4.0}))
    choisies = sorted(CHEMINEES, key=lambda c: math.atan2(c[1] - BASSIN[1], c[0] - BASSIN[0]))
    choisies = choisies[::max(1, len(choisies) // (3 if leger else 8))][:3 if leger else 8]
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in choisies for c in p], "grosseur": 0.6}))
    lots["reperes"].append(((BASSIN[0], BASSIN[1] + 1.6, 3.7), {"anim": "oiseaux", "nb": 4 if leger else 7, "rayon": 3.8, "envergure": 0.13}))
    lots["reperes"].append(((fx, fy, 4.5), {"anim": "oiseaux", "nb": 2 if leger else 3, "rayon": 1.5, "envergure": 0.12}))
    lots["reperes"].append(((fx, fy, 3.5), {"anim": "faisceau", "taille": 0.4, "nuit": 1}))  # « nuit » : éteint le jour
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan, à corriger avant de cuire : un bateau sur un autre, sur un ponton ou dans le quai ; un habitant qui
    traverse un mur, une caisse, un étal, quelqu'un ; un trajet qui quitte la terre ferme. Renvoie la liste (vide : tout va bien)."""
    lots = lots or mailles(leger=leger)
    erreurs = []
    E = lots["plan"]["emprises"]
    for i in range(len(E)):
        for j in range(i + 1, len(E)):
            if Vf.penetration(E[i][1], E[j][1]) > 0.005:
                erreurs.append(f"{E[i][0]} et {E[j][0]} se chevauchent de {Vf.penetration(E[i][1], E[j][1]):.2f}")
    for nom, poly in E:
        if nom.startswith("ponton"):
            continue
        for x, y in poly:
            if sol(x, y) > -0.5 or (y > BASSIN[1] and math.hypot(x - BASSIN[0], y - BASSIN[1]) > RB - 0.03):
                erreurs.append(f"{nom} : un coin dans le quai ou sur le fond ({x:.2f}, {y:.2f})")
                break
    for q in Vf.points_du_chemin([(x, y, 0.0) for x, y in lots["plan"]["rameur"]], True, 0.1):
        for nom, poly in E:
            if Vf.penetration(Vf.rond(q[0], q[1], 0.42), poly) > 0:
                erreurs.append(f"le rameur passe sur {nom} en ({q[0]:.2f}, {q[1]:.2f})")
                break
    S = lots["plan"]["sol"]
    for i in range(len(S)):
        for j in range(i + 1, len(S)):
            (g1, n1, p1), (g2, n2, p2) = S[i], S[j]
            if g1 == g2 and g1 in ("arbre", "rocher"):
                continue  # deux arbres ou deux rochers peuvent se toucher
            if g1 == "rocher" and g2 == "tour" or g1 == "tour" and g2 == "rocher":
                continue  # une tour sur son socle de rochers
            e_ = Vf.penetration(p1, p2)
            if e_ > 0.04:
                erreurs.append(f"{n1} et {n2} se chevauchent de {e_:.2f}")
    O = Vf.Obstacles(lots["corps"])
    pontons = [poly for nom, poly in E if nom.startswith("ponton")]
    marcheurs = [(A.nom, e) for A, _, e in lots["animes"]] + [(lots["animes"][k][0].nom, e) for k, _, e in lots["copies"]]
    for n, (nom, e) in enumerate(marcheurs):
        if e.get("anim") != "marche" or e.get("roulis"):
            continue
        c = e["chemin"]
        pts = [c[k:k + 3] for k in range(0, len(c), 3)]
        monte = max(q[2] for q in pts) - min(q[2] for q in pts) > 0.5  # un escalier : on enjambe ses marches (15 cm), pas une caisse
        bloques = Vf.chemin_bloque(pts, O, 0.17 if nom == "charrette" else 0.07, bool(e.get("boucle")), bas=0.17 if monte else 0.12)
        if bloques:
            erreurs.append(f"{nom} (trajet {n}) bute {len(bloques)} fois, par exemple en {bloques[0]} et {bloques[-1]}")
        for q in Vf.points_du_chemin(pts, bool(e.get("boucle"))):
            u = math.hypot(q[0] - BASSIN[0], q[1] - BASSIN[1])
            sur_quai = RB <= u <= RB + 1.25 and q[1] > BASSIN[1]
            sur_ponton = any(Vf.penetration(Vf.rond(q[0], q[1], 0.03), poly) > 0 for poly in pontons)
            if not (sur_quai or sur_ponton or sol(q[0], q[1]) > 0.4):
                erreurs.append(f"{nom} (trajet {n}) quitte la terre ferme en ({q[0]:.2f}, {q[1]:.2f})")
                break
            if not (sur_quai or sur_ponton) and abs(q[2] - sol(q[0], q[1])) > 0.3:
                erreurs.append(f"{nom} (trajet {n}) n'est pas à la hauteur du sol en ({q[0]:.2f}, {q[1]:.2f}) : {q[2]:.2f} pour {sol(q[0], q[1]):.2f}")
                break
    return erreurs


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    """Dans Blender : la ville, sa lumière cuite dans l'atlas, l'export, deux rendus (voir barhaw_ile_v5.construire).
    leger : la version téléphone (ile-port-v5-leger)."""
    import barhaw_ile_v5 as K
    lots = mailles(leger=leger)
    rendus = [("port-v5", (13, -30, 17), (0.5, -1, 1.2), 55), ("port-v5-quai", (5.5, -19, 5.2), (0.6, -4.2, 0.9), 60)] if rendu else []
    return K.construire("ile-port-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="port")  # 3072 : net au plus près ; la ville est grande, le téléphone a 2048
