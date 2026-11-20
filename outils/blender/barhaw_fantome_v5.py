# Le vaisseau fantôme, « niveau 5 » (voir barhaw_niveau5.py) : l'événement en mer de GRAND LINE (js/grandline-3d.js,
# « fantome »). Tout est inventé. La même taille et les mêmes pièces qui bougent que la V4 (barhaw_maitres_v4.py) :
#   une longue coque grise bordée, abîmée (des trous où brille une lueur verte), la préceinte prune délavée, des algues
#   qui pendent de la flottaison ; les sabords qui luisent en vert ; le château arrière et ses fenêtres vertes ; la
#   figure de proue (un crâne cornu aux yeux verts), le beaupré, les chaînes qui pendent ; trois mâts (le dernier
#   cassé), des voiles grises en lambeaux qui battent (fantome_voile…), la hune et son fanion déchiré (fantome_fanion) ;
#   les lanternes vertes ; à la barre, le capitaine, une silhouette de lumière verte ; des flammes vertes sur les
#   plats-bords (fantome_flammes : elles clignotent), des feux follets qui tournent autour (fantome_follets) ; la brume
#   (repère « fumee ») et l'écume (repère « ecume ») que le site ajoute.
# Sorties : fantome-v5.glb (+ -leger) et son atlas.   Usage, dans Blender : import barhaw_fantome_v5 as F; F.construire()
import math, os, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_vie_mer_v5 as V

PI = math.pi
T, Rx, Ry, Rz, S = N.T, N.Rx, N.Ry, N.Rz, N.S

N.matiere("f_bois", N.tx_planches, 1.0, 0.8, c=0x7c8078, nb=6, graine=901, usure=0.95)
N.matiere("f_bois_sombre", N.tx_planches, 1.0, 0.8, c=0x474b44, nb=6, graine=902, usure=0.85)
N.matiere("f_voile", N.tx_uni, 0.8, 0.3, c=0xb9bdb0, graine=903, grain=0.25, taches=0.6, c2=0x868b7e, seuil=0.5)
N.matiere("f_prune", N.tx_uni, 0.8, 0.4, c=0x5f4b61, graine=904, grain=0.25, taches=0.5, c2=0x3c303e, seuil=0.55)
N.matiere("f_os", N.tx_uni, 0.5, 0.5, c=0xe2dbc6, graine=905, grain=0.3, taches=0.45, c2=0xa39a82, seuil=0.55)
N.matiere("f_algues", N.tx_uni, 0.6, 0.4, c=0x41593a, graine=906, grain=0.3, taches=0.5, c2=0x2b3c28, seuil=0.55)
N.matiere("f_fer", N.tx_uni, 0.6, 0.5, rugueux=0.6, metal=0.3, c=0x4c4b48, graine=907, grain=0.3, taches=0.55, c2=0x7b4c2f, seuil=0.55)
N.matiere("f_corde", N.tx_corde, 0.4, 0.4, c=0x8b8571, graine=908)

# la coque : comme la V4 (8,4 de long, 2,7 de large, le plat-bord à 1,2 au-dessus de l'eau, la quille à -0,3)
LG, BM, H, CREUX = 8.4, 1.35, 1.2, 1.5
GRIS = {"planches_sombres": "f_bois_sombre", "planches": "f_bois", "pont": "f_bois", "poutre": "f_bois_sombre", "fer": "f_fer", "corde": "f_corde"}


class Fantome(V.Sorte):
    pass


def griser(m):
    m.mats = [GRIS.get(x, x) for x in m.mats]


def flanc(larg, x, ph):
    """Un point du bordé : x le long de la coque, ph de 0 (plat-bord, bâbord) à PI (plat-bord, tribord)."""
    t = min(1.0, max(0.0, (x + LG / 2) / LG))
    b = larg(t)
    tonture = 0.12 * ((2 * t - 1) ** 2)
    prof = CREUX * (0.75 + 0.25 * math.sin(PI * min(1.0, t * 1.1)))
    return np.array((x, -b * math.cos(ph), H + tonture - prof * math.sin(ph) ** 0.75))


def normale(larg, x, ph):
    a, b = flanc(larg, x, ph - 0.05), flanc(larg, x, ph + 0.05)
    c = flanc(larg, x + 0.05, ph)
    n = np.cross(c - flanc(larg, x - 0.05, ph), b - a)
    n = n / (np.linalg.norm(n) or 1)
    return n if np.dot(n, flanc(larg, x, ph) - np.array((x, 0, H - 0.4))) > 0 else -n


def plaque_flanc(L, larg, x, ph, lx, lz, mat, dehors=0.012):
    """Un petit rectangle posé sur le bordé (un sabord, un trou, une planche arrachée), tourné vers dehors."""
    p, n = flanc(larg, x, ph), normale(larg, x, ph)
    u = np.array((1.0, 0, 0))
    w = np.cross(n, u)
    w = w / (np.linalg.norm(w) or 1)
    c = p + n * dehors
    pts = [c - u * lx / 2 - w * lz / 2, c + u * lx / 2 - w * lz / 2, c + u * lx / 2 + w * lz / 2, c - u * lx / 2 + w * lz / 2]
    L.ajouter([tuple(q) for q in pts], [(0, 1, 2, 3)], mat)


def lanterne_verte(L, U, M, r=0.12):
    L.ajouter(*N.cylindre(r * 0.8, r, 0.04, 6), "f_fer", M)
    U.ajouter(*N.cylindre(r * 0.85, r, r * 1.7, 6, haut=False), "spectre", M @ T(0, 0, 0.04))
    for k in range(4):
        a = k * PI / 2 + PI / 4
        L.ajouter(*N.poutre((math.cos(a) * r * 0.9, math.sin(a) * r * 0.9, 0.04), (math.cos(a) * r, math.sin(a) * r, 0.04 + r * 1.7), 0.018), "f_fer", M)
    L.ajouter(*N.cylindre(r * 1.08, 0.0, r * 0.85, 6), "f_fer", M @ T(0, 0, 0.04 + r * 1.7))


def voile_dechiree(K, nom, rng, mx, y0, y1, zz, hh, phase):
    """Une voile en lambeaux pendue à sa vergue : une grille d'où il manque des carreaux, le bas déchiré à des
    longueurs inégales, un peu creusée ; les deux faces (l'envers un rien décalé : la cuisson). Elle bat au vent
    (« drapeau » : le site la fait tourner autour du mât)."""
    G = K.anim(nom, (mx, 0.0, zz), anim="drapeau", phase=phase)
    nx, ny = (7, 5) if N.DETAIL >= 1 else (5, 4)
    longs = [hh * (0.55 + 0.45 * rng.random()) for _ in range(nx + 1)]
    v, f = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, w = i / nx, j / ny
            y = y0 + (y1 - y0) * u
            z = zz - longs[i] * w
            x = mx + 0.12 + 0.22 * math.sin(PI * u) * math.sin(PI * min(1.0, w * 1.2)) + 0.03 * math.sin(i * 1.7 + j)
            v.append((x, y, z))
    for j in range(ny):
        for i in range(nx):
            if (j > 0 and rng.random() < 0.2) or (j == ny - 1 and rng.random() < 0.35):
                continue
            a = j * (nx + 1) + i
            f.append((a, a + 1, a + nx + 2, a + nx + 1))
    G.ajouter(v, f, "f_voile")
    # (les faces de devant regardent vers -x : l'envers est donc un rien vers +x, tourné vers +x ; sinon elles se
    # regardent l'une l'autre et la cuisson les voit noires)
    G.ajouter([(p[0] + 0.012, p[1], p[2]) for p in v], [tuple(reversed(q)) for q in f], "f_voile")
    # des lambeaux qui pendent sous la voile
    for i in range(1, nx, 2):
        y = y0 + (y1 - y0) * i / nx
        z = zz - longs[i]
        bas = z - 0.45 - 0.3 * rng.random()
        G.ajouter([(mx + 0.13, y - 0.07, z + 0.05), (mx + 0.13, y + 0.07, z + 0.05), (mx + 0.14, y + 0.03, bas)], [(0, 1, 2)], "f_voile")
        G.ajouter([(mx + 0.142, y - 0.07, z + 0.05), (mx + 0.142, y + 0.07, z + 0.05), (mx + 0.152, y + 0.03, bas)], [(2, 1, 0)], "f_voile")


def fantome(K, rng):
    L, U = K.corps, K.lumieres
    larg = V.coque(L, LG, BM, H, CREUX, "f_prune", n=24, m=12, tableau=0.7)
    V.pont(L, LG, larg, H, n=12, mat="pont")
    # le bordé abîmé : des planches arrachées, des trous où brille une lueur verte ; des algues à la flottaison
    for x, ph, lx, lz in ((-1.0, 0.55, 0.7, 0.45), (1.9, 2.5, 0.5, 0.35), (-2.4, 2.6, 0.45, 0.3), (0.6, 0.62, 0.35, 0.28)):
        plaque_flanc(L, larg, x, ph, lx + 0.18, lz + 0.14, "f_bois_sombre", 0.01)
        plaque_flanc(U, larg, x, ph, lx, lz, "spectre", 0.02)
    for k in range(6):
        x = -2.6 + k * 1.05
        for ph in (0.34, PI - 0.34):
            plaque_flanc(L, larg, x, ph, 0.42, 0.34, "f_bois_sombre", 0.012)  # le mantelet
            plaque_flanc(U, larg, x, ph, 0.3, 0.22, "spectre", 0.022)
    for k in range(30 if N.DETAIL >= 1 else 16):
        x = rng.uniform(-3.8, 3.4)
        ph = rng.choice((rng.uniform(1.0, 1.3), rng.uniform(PI - 1.3, PI - 1.0)))
        p, n = flanc(larg, x, ph), normale(larg, x, ph)
        if p[2] > 0.5:
            continue
        q = p + n * 0.03
        L.ajouter(*N.tube([tuple(q), tuple(q + n * 0.05 + np.array((0, 0, -rng.uniform(0.35, 0.8))))], [0.05, 0.012], 4), "f_algues")
    # le château arrière, ses fenêtres vertes, sa lisse ; la barre et le capitaine (une silhouette de lumière verte)
    xc, lc, hc = -3.35, 1.6, 0.95
    L.ajouter(*N.boite(lc, 1.75, hc), "f_bois", T(xc, 0, H - 0.05))
    L.ajouter(*N.boite(lc + 0.1, 1.85, 0.06), "f_bois_sombre", T(xc, 0, H - 0.05 + hc))
    for k in range(3):
        U.ajouter(*N.boite(0.04, 0.3, 0.38), "spectre", T(xc - lc / 2 - 0.01, -0.55 + k * 0.55, H + 0.3))
        L.ajouter(*N.boite(0.05, 0.38, 0.05), "f_bois_sombre", T(xc - lc / 2 - 0.02, -0.55 + k * 0.55, H + 0.7))
    for s in (-1, 1):
        for k in range(2):
            U.ajouter(*N.boite(0.3, 0.04, 0.3), "spectre", T(xc - 0.3 + k * 0.6, s * 0.885, H + 0.32))
        for k in range(6):
            L.ajouter(*N.cylindre(0.025, 0.025, 0.28, 5), "f_bois_sombre", T(xc - lc / 2 + 0.1 + k * (lc - 0.2) / 5, s * 0.85, H - 0.05 + hc + 0.06))
        L.ajouter(*N.poutre((xc - lc / 2 + 0.05, s * 0.85, H + hc + 0.35), (xc + lc / 2 - 0.05, s * 0.85, H + hc + 0.35), 0.035), "f_bois_sombre")
    L.ajouter(*N.cylindre(0.05, 0.05, 0.8, 6), "f_bois_sombre", T(-2.25, 0, H - 0.05))
    roue = T(-2.18, 0, H + 0.82) @ Ry(PI / 2)
    L.ajouter(*N.cylindre(0.32, 0.32, 0.05, 14), "f_bois_sombre", roue)
    for k in range(8):
        a = k * PI / 4
        L.ajouter(*N.poutre((0, 0, 0), (math.cos(a) * 0.46, math.sin(a) * 0.46, 0), 0.025), "f_bois_sombre", roue @ T(0, 0, 0.05))
    U.ajouter(*N.cylindre(0.2, 0.1, 0.7, 8), "spectre", T(-2.6, 0, H - 0.05))  # le capitaine : le manteau, la tête, le tricorne
    U.ajouter(*N.sphere(0.13, 8, 6), "spectre", T(-2.6, 0, H + 0.78))
    U.ajouter(*N.cylindre(0.2, 0.17, 0.08, 3), "spectre", T(-2.6, 0, H + 0.9))
    for s in (-1, 1):
        U.ajouter(*N.tube([(-2.6, s * 0.15, H + 0.55), (-2.4, s * 0.2, H + 0.75), (-2.22, s * 0.16, H + 0.86)], 0.045, 4), "spectre")
    # la proue : le beaupré, la figure (un crâne cornu aux yeux verts), les chaînes qui pendent
    L.ajouter(*N.tube([(3.7, 0, H + 0.1), (5.0, 0, H + 0.75), (6.2, 0, H + 1.3)], [0.13, 0.09, 0.045], 7), "f_bois_sombre")
    f = np.array((4.32, 0, H + 0.32))
    L.ajouter(*N.sphere(0.34, 12, 9), "f_os", T(*f) @ Ry(0.3) @ S(1.1, 0.9, 1.0))
    L.ajouter(*N.sphere(0.2, 10, 6), "f_os", T(*(f + (0.12, 0, -0.22))) @ S(1.1, 0.85, 0.7))  # la mâchoire
    for s in (-1, 1):
        U.ajouter(*N.sphere(0.075, 6, 4), "spectre", T(*(f + (0.3, s * 0.12, 0.05))))
        L.ajouter(*N.tube([tuple(f + (-0.05, s * 0.25, 0.18)), tuple(f + (-0.22, s * 0.56, 0.48)), tuple(f + (0.08, s * 0.72, 0.8))], [0.085, 0.06, 0.012], 6), "f_os")
        for k in range(9 if N.DETAIL >= 1 else 5):
            q = (3.55 + k * 0.05, s * (0.98 - k * 0.025), H - 0.12 - k * 0.15)
            L.ajouter(*N.sphere(0.055, 5, 3), "f_fer", T(*q) @ S(1.0, 0.6, 1.3))
    # les lanternes vertes, à la poupe et à la proue
    for x, z in ((-4.05, H + hc), (3.85, H + 0.1)):
        L.ajouter(*N.cylindre(0.035, 0.035, 0.9, 5), "f_fer", T(x, 0, z))
        lanterne_verte(L, U, T(x, 0, z + 0.9))
    # trois mâts (le dernier cassé), leurs vergues, les voiles en lambeaux, les haubans et des cordages qui pendent
    for k, (mx, h, casse) in enumerate(((1.8, 6.0, False), (-0.6, 7.2, False), (-2.8, 4.0, True))):
        if casse:
            L.ajouter(*N.cylindre(0.15, 0.12, 2.2, 8), "f_bois_sombre", T(mx + 0.55, 0, H - 0.1) @ Ry(-0.08))
            L.ajouter(*N.cylindre(0.11, 0.09, 2.5, 8), "f_bois_sombre", T(mx + 0.35, 0.45, H + 0.05) @ Rx(0.95) @ Ry(0.35))
            continue
        L.ajouter(*N.cylindre(0.15, 0.1, h, 9), "f_bois_sombre", T(mx, 0, H - 0.1))
        for j in range(2):
            zz = H + 1.3 + j * (h - 1.5) * 0.5
            hh = (h - 1.5) * 0.42
            lv = 1.5 - j * 0.3
            L.ajouter(*N.cylindre(0.065, 0.065, 2 * lv, 6), "f_bois_sombre", T(mx + 0.06, -lv, zz + 0.05) @ Rx(-PI / 2))
            voile_dechiree(K, f"voile{k}{j}", rng, mx, -lv * 0.95, lv * 0.95, zz, hh, k + j)
        for s in (-1, 1):
            for xh in (mx - 0.45, mx + 0.35):
                L.ajouter(*N.tube([(xh, s * larg(min(1, (xh + LG / 2) / LG)) * 0.97, H + 0.1), (mx, s * 0.05, H + h * 0.8)], 0.014, 3, bouts=False), "f_corde")
    for k in range(10 if N.DETAIL >= 1 else 5):
        a = np.array((rng.uniform(-2.6, 2.6), rng.uniform(-1.0, 1.0), H + 0.05))
        L.ajouter(*N.tube([tuple(a), tuple(a + (rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), rng.uniform(1.6, 4.0)))], 0.02, 3), "f_corde")
    # la hune du grand mât et son fanion déchiré (un œil vert en spirale, inventé)
    L.ajouter(*N.cylindre(0.55, 0.45, 0.28, 12), "f_bois_sombre", T(-0.6, 0, H + 5.0))
    L.ajouter(*N.cylindre(0.03, 0.03, 1.1, 5), "f_bois_sombre", T(-0.6, 0, H + 7.1))
    D = K.anim("fanion", (-0.6, 0, H + 8.05), anim="drapeau", phase=0.7)
    nx, ny = 7, 3
    v, fz = [], []
    for jj in range(ny + 1):
        for ii in range(nx + 1):
            v.append((-0.6 + ii / nx * 1.6, 0.0, H + 8.05 - jj / ny * 0.9 * (1 - 0.3 * ii / nx) - (0.12 * rng.random() if ii == nx else 0)))
    for jj in range(ny):
        for ii in range(nx):
            if ii > 4 and rng.random() < 0.18:
                continue
            q = jj * (nx + 1) + ii
            fz.append((q, q + nx + 1, q + nx + 2, q + 1))
    D.ajouter(v, fz, "f_voile")
    D.ajouter([(p[0], p[1] + 0.012, p[2]) for p in v], [tuple(reversed(q)) for q in fz], "f_voile")  # (devant : -y ; l'envers vers +y)
    Dl = K.anim("fanion_oeil", (-0.6, 0, H + 8.05), anim="drapeau", phase=0.7)
    Dl.ajouter(*N.cylindre(0.2, 0.2, 0.04, 12), "spectre", T(-0.05, 0.026, H + 7.63) @ Rx(PI / 2))
    # des flammes vertes sur les plats-bords (elles clignotent), des feux follets qui tournent autour
    F = K.anim("flammes", (0, 0, 0), anim="clignote")
    for k in range(7):
        x = -2.9 + k * 1.05
        s = 1 if k % 2 else -1
        p = flanc(larg, x, 0.0 if s < 0 else PI)
        F.ajouter(*N.cylindre(0.14, 0.0, 0.55, 6), "spectre", T(p[0], p[1] * 0.97, p[2] + 0.03))
        F.ajouter(*N.cylindre(0.08, 0.0, 0.35, 5), "spectre", T(p[0] + 0.08, p[1] * 0.97, p[2] + 0.05))
    W = K.anim("follets", (0, 0, 0), anim="tourne", axe=[0, 0, 1], vitesse=0.5)  # (les axes des extras sont ceux de Blender : Z vers le haut)
    for k in range(6):
        a = k * 2 * PI / 6
        c = np.array((math.cos(a) * 5.0, math.sin(a) * 3.0, 2.0 + (k % 3) * 0.8))
        d = np.array((-math.sin(a), math.cos(a), 0.0))
        W.ajouter(*N.sphere(0.2, 10, 8), "spectre", T(*c))
        W.ajouter(*N.tube([tuple(c), tuple(c - d * 0.5 + (0, 0, 0.05)), tuple(c - d * 1.0 + (0, 0, 0.15))], [0.16, 0.1, 0.02], 6), "spectre")
    griser(L)


def mailles(leger=False):
    N.DETAIL = 0.6 if leger else 1.0
    try:
        K = Fantome("fantome")
        fantome(K, random.Random(919))
        for m, *_ in K.anims:
            griser(m)
        K.recentrer()
        return K
    finally:
        N.DETAIL = 1.0


def verifier(leger=False):
    """Sans Blender : il se construit, rien de faux, la taille de la V4 (11,4 de long avec les feux follets, 8,4 de coque)."""
    K = mailles(leger)
    tout = [K.corps, K.lumieres] + [m for m, *_ in K.anims]
    coque = np.concatenate(K.corps.v)
    pts = np.concatenate([coque] + [np.concatenate(m.v) + np.asarray(o) for m, _, o, _ in K.anims if m.v])
    erreurs = []
    if not np.isfinite(pts).all():
        erreurs.append("des points faux (NaN)")
    dim = pts.max(0) - pts.min(0)
    dc = coque.max(0) - coque.min(0)
    if not 9.5 < dim[0] < 13.5:
        erreurs.append(f"{dim[0]:.2f} de long en tout, la V4 en faisait 11,4")
    if not 9.0 < dc[0] < 11.5 or not 2.4 < dc[1] < 3.2:
        erreurs.append(f"la coque (beaupré compris) fait {dc[0]:.2f} × {dc[1]:.2f}")
    return {"erreurs": erreurs, "taille": [round(float(x), 2) for x in dim], "coque": [round(float(x), 2) for x in dc],
            "triangles": sum(m.triangles() for m in tout), "pieces": [p for _, p, _, _ in K.anims]}


def construire(rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender : le navire, sa lumière cuite dans un atlas, l'export, un rendu. Le site le tourne d'un demi-tour
    (rotation.y = PI) : le soleil de la cuisson est donc celui des îles, tourné d'un demi-tour lui aussi."""
    nom = "fantome-v5" + ("-leger" if leger else "")
    K = mailles(leger)
    site = lambda m: bool(m.mats) and all(x in N.SITE for x in m.mats)
    cuites = [K.corps] + [m for m, *_ in K.anims if not site(m)]
    infos = {"triangles": sum(m.triangles() for m in cuites), "finesse": [round(x, 2) for x in N.emballer(cuites, taille)]}
    coll = N.collection("fantome_v5" + ("_leger" if leger else ""))
    objets = [N.objet(K.corps, coll, "fantome_corps", extras={"role": "decor"})]
    if K.lumieres.v:
        N.objet(K.lumieres, coll, "fantome_lumieres", extras={"role": "decor"})
    for m, partie, origine, extras in K.anims:
        o = N.objet(m, coll, f"fantome_{partie}", origine=origine, extras=dict(extras, role="anim"))
        if not site(m):
            objets.append(o)
    N.repere(coll, "fantome_brume", (0.0, 0.0, 0.8), {"anim": "fumee"})
    N.repere(coll, "fantome_eau", (0.0, 0.0, 0.05), {"anim": "ecume", "rayon": 4.0})
    if cuire:
        N.soleil_et_ciel(soleil=(0.5, 0.62, 0.62), force=3.6, force_ciel=1.0, taille=6.0)
        infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom="fantome")
    N.soleil_et_ciel(soleil=(0.5, 0.62, 0.62))
    if rendu:
        infos["rendu"] = N.rendre(nom, (-16, 15, 9), (0.5, 0, 3.2), 40, taille=(1600, 1000), echantillons=64, collections=[coll.name])
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
