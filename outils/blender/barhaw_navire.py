# Le navire de la commu Barhaw : un petit galion-jouet (dessin original), aux couleurs de Barhaw.
# Repère : l'avant vers +X, le haut vers +Z, la ligne de flottaison à z = 0. Longueur ~7 (beaupré compris).
# Objets exportés (les noms comptent pour le site) :
#   navire_corps (tout ce qui ne bouge pas), voile_grande (avec le « B »), voile_hune, voile_misaine,
#   voile_perroquet, voile_foc, flamme, drapeau.
import math, bmesh
from mathutils import Vector
import barhaw_base as B

X0, X1 = -2.75, 2.95  # la poupe, la proue


def demi_largeur(u):
    if u < 0.42:
        return 1.38 - ((0.42 - u) / 0.42) ** 2 * 0.36
    k = (u - 0.42) / 0.58
    return max(0.035, 1.38 * max(0.0, 1 - min(1.0, k) ** 2.3) ** 0.75)


def quille(u):
    if u > 0.45:
        return -0.86 + 0.5 * ((u - 0.45) / 0.55) ** 2.2
    return -0.86 + 0.32 * ((0.45 - u) / 0.45) ** 2


def plat_bord(u):
    return 0.8 + 0.38 * (2 * u - 1) ** 2 + 0.2 * max(0.0, (u - 0.86) / 0.14) ** 2


def x_de(u):
    return X0 + (X1 - X0) * u


def u_de(x):
    return (x - X0) / (X1 - X0)


BORDAGE = 0.26  # la hauteur du bastingage au-dessus du pont
EPAISSEUR = 0.09
NIVEAUX = [0.0, 0.07, 0.14, 0.24, 0.34, 0.44, 0.54, 0.6, 0.67, 0.77, 0.86, 0.94, 1.0]
BANDES = ["rose", "rose", "bois", "bois2", "bois", "bois2", "or", "prune", "prune", "prune", "prune", "prune"]
EXPOSANT = 2.6


def coque():
    """La coque : des couples (sections) reliés, avec le bastingage, le pont et le tableau arrière."""
    bm = bmesh.new()
    couche = bm.faces.layers.int.new("mat")
    noms = []

    def nm(n):
        if n not in noms:
            noms.append(n)
        return noms.index(n)

    N = 34
    sections = []
    for j in range(N + 1):
        u = j / N
        x = x_de(u)
        w = demi_largeur(u)
        top = plat_bord(u)
        d = quille(u)
        win = max(0.02, w - EPAISSEUR)
        pont = top - BORDAGE
        boucle = []
        for f in NIVEAUX:  # bâbord, du haut vers la quille
            y = w * max(0.0, 1 - f ** EXPOSANT) ** (1 / EXPOSANT)
            boucle.append((x, y, top - f * (top - d)))
        for f in reversed(NIVEAUX[:-1]):  # tribord, de la quille vers le haut
            y = w * max(0.0, 1 - f ** EXPOSANT) ** (1 / EXPOSANT)
            boucle.append((x, -y, top - f * (top - d)))
        boucle += [(x, -win, top), (x, -win, pont), (x, win, pont), (x, win, top)]
        sections.append([bm.verts.new(p) for p in boucle])
    P = len(sections[0])
    nb = len(NIVEAUX) - 1
    mats = BANDES[:nb] + list(reversed(BANDES[:nb])) + ["or", "bois_fonce", "bois_clair", "bois_fonce", "or"]
    for j in range(N):
        for k in range(P):
            a, b = sections[j][k], sections[j][(k + 1) % P]
            c, d = sections[j + 1][(k + 1) % P], sections[j + 1][k]
            f = bm.faces.new((a, d, c, b))
            f[couche] = nm(mats[k])
    f = bm.faces.new(list(reversed(sections[0])))
    f[couche] = nm("bois_fonce")
    f = bm.faces.new(sections[-1])
    f[couche] = nm("rose")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm, noms


def bord(u, cote=1, dz=0.0, dedans=0.0):
    """Un point sur le plat-bord."""
    return Vector((x_de(u), cote * (demi_largeur(u) - dedans), plat_bord(u) + dz))


def voile(largeur_haut, largeur_bas, hauteur, creux, nx=14, ny=9):
    """Une voile carrée gonflée vers l'avant (+X) ; l'origine est au milieu de la vergue."""
    verts, faces, uvs = [], [], []
    for j in range(ny + 1):
        v = j / ny
        l = largeur_haut + (largeur_bas - largeur_haut) * v
        for i in range(nx + 1):
            u = i / nx
            y = (u - 0.5) * l
            bombe = creux * math.sin(math.pi * u) * math.sin(math.pi * (0.12 + v * 0.75))
            verts.append((bombe, y, -v * hauteur))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append([a, a + nx + 1, a + nx + 2, a + 1])
            uvs.append([(i / nx, 1 - j / ny), (i / nx, 1 - (j + 1) / ny), ((i + 1) / nx, 1 - (j + 1) / ny), ((i + 1) / nx, 1 - j / ny)])
    return verts, faces, uvs


def construire(rendu=True):
    coll = B.collection("navire")
    L = B.Lot()

    # ---- la coque ----
    bm, noms = coque()
    L.ajouter(bm, None, couche_mat=("mat", noms))

    # ---- le château arrière (violet, fenêtres dorées) ----
    xa, xb = -2.72, -1.32
    ua, ub = u_de(xa), u_de(xb)
    larg = min(demi_largeur(ua), demi_largeur(ub)) - EPAISSEUR - 0.02
    sol = plat_bord(ua) - BORDAGE
    haut_ch = 1.92
    L.ajouter(B.boite(xb - xa, larg * 2, haut_ch - sol), "violet", B.mat4(((xa + xb) / 2, 0, sol)))
    L.ajouter(B.boite(xb - xa + 0.14, larg * 2 + 0.14, 0.1), "bois_clair", B.mat4(((xa + xb) / 2, 0, haut_ch)))
    L.ajouter(B.boite(xb - xa + 0.2, larg * 2 + 0.2, 0.08), "or", B.mat4(((xa + xb) / 2, 0, haut_ch - 0.08)))
    # la rambarde du château
    for k in range(9):
        t = k / 8
        for cote in (-1, 1):
            L.ajouter(B.cyl(0.035, 0.035, 0.3, 6), "creme", B.mat4((xa + 0.05 + t * (xb - xa - 0.1), cote * (larg + 0.02), haut_ch + 0.1)))
    for k in range(5):
        y = -larg + k * larg / 2
        L.ajouter(B.cyl(0.035, 0.035, 0.3, 6), "creme", B.mat4((xa + 0.05, y, haut_ch + 0.1)))
    coins = [(xa + 0.05, -larg - 0.02), (xb - 0.05, -larg - 0.02), (xb - 0.05, larg + 0.02), (xa + 0.05, larg + 0.02), (xa + 0.05, -larg - 0.02)]
    L.ajouter(B.tube([(x, y, haut_ch + 0.42) for x, y in coins], 0.045, 6, caps=False), "rose")
    # les fenêtres (à l'arrière et sur les côtés) : des hublots dorés éclairés
    def hublot(centre, normale, r=0.15):
        n = Vector(normale)
        rot = n.to_track_quat("Z", "Y").to_euler()
        L.ajouter(B.tore(r, 0.045, 18, 6), "or", B.mat4(centre, rot))
        L.ajouter(B.cyl(r, r, 0.02, 16), "lumiere", B.mat4(Vector(centre) - n * 0.01, rot))
    for y in (-0.6, 0.6):
        hublot((xa - 0.01, y, 1.4), (-1, 0, 0), 0.17)
    L.ajouter(B.etoile(0.26, 0.11, 0.08, 5, 0.6, math.pi / 2), "or", B.mat4((xa - 0.03, 0, 1.42), (math.pi / 2, 0, -math.pi / 2)))
    for cote in (-1, 1):
        for x in (-2.3, -1.75):
            hublot((x, cote * (larg + 0.01), 1.45), (0, cote, 0), 0.14)
    # les portes du château (vers l'avant)
    L.ajouter(B.boite(0.04, 0.5, 0.7), "bois_fonce", B.mat4((xb + 0.02, 0.0, sol)))
    L.ajouter(B.tore(0.07, 0.02, 10, 5), "or", B.mat4((xb + 0.05, 0.12, sol + 0.36), (0, math.pi / 2, 0)))
    # la bouée (rose et blanche) sur le château
    bouee = B.tore(0.22, 0.07, 20, 8)
    L.ajouter(bouee, "rose", B.mat4((xb + 0.04, -0.62, sol + 0.55), (0, math.pi / 2, 0)))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        L.ajouter(B.cyl(0.075, 0.075, 0.09, 8), "blanc", B.mat4((xb + 0.04, -0.62 + math.cos(a) * 0.22, sol + 0.55 + math.sin(a) * 0.22), (a, 0, 0)))
    # la barre (le gouvernail) sur le château
    xr = xb - 0.32
    L.ajouter(B.boite(0.12, 0.12, 0.5), "bois_fonce", B.mat4((xr, 0, haut_ch + 0.1)))
    centre = Vector((xr + 0.08, 0, haut_ch + 0.68))
    L.ajouter(B.tore(0.3, 0.035, 24, 6), "bois_clair", B.mat4(centre, (0, math.pi / 2, 0)))
    L.ajouter(B.cyl(0.07, 0.07, 0.1, 10), "or", B.mat4(centre - Vector((0.05, 0, 0)), (0, math.pi / 2, 0)))
    for k in range(8):
        a = k * math.pi / 4
        d = Vector((0, math.cos(a), math.sin(a)))
        L.ajouter(B.tube([centre, centre + d * 0.42], [0.025, 0.035], 5), "bois_clair")
    # les lanternes aux coins du château
    for cote in (-1, 1):
        base = Vector((xa + 0.12, cote * (larg - 0.05), haut_ch + 0.1))
        L.ajouter(B.cyl(0.03, 0.03, 0.45, 6), "fer", B.mat4(base))
        L.ajouter(B.cyl(0.11, 0.09, 0.05, 8), "or", B.mat4(base + Vector((0, 0, 0.45))))
        L.ajouter(B.sphere(0.12, 12, 8), "lumiere", B.mat4(base + Vector((0, 0, 0.6))))
        L.ajouter(B.cyl(0.12, 0.02, 0.12, 8), "or", B.mat4(base + Vector((0, 0, 0.7))))

    # ---- le gaillard d'avant (un petit pont surélevé) ----
    xg = 2.05
    ug = u_de(xg)
    lg = demi_largeur(ug) - EPAISSEUR - 0.03
    L.ajouter(B.boite(0.08, lg * 2, 0.28), "violet", B.mat4((xg, 0, plat_bord(ug) - BORDAGE)))

    # ---- le bastingage : des balustres et une main courante dorée ----
    for cote in (-1, 1):
        ligne = []
        for k in range(26):
            u = u_de(xb + 0.05) + (k / 25) * (0.97 - u_de(xb + 0.05))
            p = bord(u, cote, 0.0, EPAISSEUR / 2)
            ligne.append(p + Vector((0, 0, 0.22)))
            if k % 2 == 0 and k < 25:
                L.ajouter(B.cyl(0.03, 0.03, 0.22, 6), "creme", B.mat4(p))
        L.ajouter(B.tube(ligne, 0.04, 6, caps=False), "or")

    # ---- la proue : le beaupré et l'étoile dorée ----
    L.ajouter(B.tube([(2.55, 0, 1.15), (3.4, 0, 1.5), (4.3, 0, 1.88)], [0.11, 0.08, 0.05], 8), "bois_fonce")
    L.ajouter(B.tore(0.1, 0.03, 10, 5), "or", B.mat4((3.4, 0, 1.5), (0, math.radians(65), 0)))
    pointe = Vector((X1 + 0.02, 0, 1.0))
    L.ajouter(B.etoile(0.62, 0.27, 0.18, 5, 0.9, math.pi), "or", B.mat4(pointe + Vector((0.14, 0, 0.05)), (0, math.radians(90 - 22), 0)))
    L.ajouter(B.sphere(0.09, 10, 6), "rose", B.mat4(pointe + Vector((0.32, 0, 0.12))))

    # ---- les canons (deux de chaque côté) ----
    for cote in (-1, 1):
        for x in (-0.6, 0.85):
            u = u_de(x)
            w = demi_largeur(u)
            z = plat_bord(u) - 0.42
            L.ajouter(B.boite(0.34, 0.06, 0.3), "or", B.mat4((x, cote * (w - 0.005), z - 0.15)))
            L.ajouter(B.boite(0.26, 0.07, 0.22), "fer", B.mat4((x, cote * (w + 0.005), z - 0.11)))
            L.ajouter(B.tube([(x, cote * (w - 0.1), z), (x, cote * (w + 0.38), z)], [0.1, 0.085], 10), "fer")
            L.ajouter(B.tore(0.1, 0.03, 12, 5), "fer", B.mat4((x, cote * (w + 0.38), z), (math.pi / 2, 0, 0)))

    # ---- les hublots de la coque ----
    for cote in (-1, 1):
        for x in (-1.95, 0.12, 1.55):
            u = u_de(x)
            z = plat_bord(u) - 0.5
            f = 0.5 / (plat_bord(u) - quille(u))
            y = demi_largeur(u) * max(0.0, 1 - f ** EXPOSANT) ** (1 / EXPOSANT)
            hublot((x, cote * (y + 0.005), z), (0, cote, 0), 0.1)

    # ---- l'ancre (à bâbord, à l'avant) ----
    xa2 = 2.1
    ya = demi_largeur(u_de(xa2)) + 0.06
    h = plat_bord(u_de(xa2))
    L.ajouter(B.tube([(xa2, ya, h - 0.15), (xa2, ya, h - 0.85)], 0.04, 6), "fer")
    L.ajouter(B.tore(0.08, 0.025, 10, 5), "fer", B.mat4((xa2, ya, h - 0.08), (math.pi / 2, 0, 0)))
    L.ajouter(B.tube([(xa2 - 0.22, ya, h - 0.27), (xa2 + 0.22, ya, h - 0.27)], 0.03, 6), "fer")
    L.ajouter(B.tube(B.courbe((xa2 - 0.3, ya, h - 0.62), (xa2 + 0.3, ya, h - 0.62), (xa2, ya, h - 1.05), 9), 0.04, 6), "fer")
    for s in (-1, 1):
        L.ajouter(B.cyl(0.07, 0.0, 0.14, 6), "fer", B.mat4((xa2 + s * 0.3, ya, h - 0.66), (0, s * math.radians(-30), 0)))

    # ---- les mâts, les vergues, la hune ----
    xm, xf = 0.1, 1.72
    zp = plat_bord(u_de(xm)) - BORDAGE
    L.ajouter(B.tube([(xm, 0, zp - 0.2), (xm, 0, 6.45)], [0.14, 0.08], 10), "bois_fonce")
    L.ajouter(B.tube([(xf, 0, zp - 0.2), (xf, 0, 5.05)], [0.12, 0.07], 10), "bois_fonce")
    for x, z in ((xm, 6.45), (xf, 5.05)):
        L.ajouter(B.sphere(0.12, 10, 6), "or", B.mat4((x, 0, z + 0.05)))
    # la hune (le nid de pie)
    L.ajouter(B.cyl(0.32, 0.5, 0.42, 16), "violet", B.mat4((xm, 0, 4.0)))
    L.ajouter(B.tore(0.5, 0.05, 20, 6), "or", B.mat4((xm, 0, 4.42)))
    L.ajouter(B.tore(0.33, 0.04, 16, 5), "or", B.mat4((xm, 0, 4.0)))
    vergues = [(xm, 3.78, 3.5), (xm, 5.78, 2.5), (xf, 3.4, 3.0), (xf, 4.78, 2.0)]
    for x, z, l in vergues:
        L.ajouter(B.tube([(x + 0.1, -l / 2, z), (x + 0.1, l / 2, z)], [0.055, 0.055], 8), "bois_fonce")
        for s in (-1, 1):
            L.ajouter(B.sphere(0.07, 8, 5), "or", B.mat4((x + 0.1, s * l / 2, z)))

    # ---- le gréement : haubans, étais ----
    def corde(a, b, r=0.022):
        L.ajouter(B.tube([a, b], r, 5, caps=False), "corde")
    for x_mat, z_haut, xs in ((xm, 3.72, (-0.45, -0.05, 0.35)), (xf, 3.3, (1.35, 1.7, 2.05))):
        for cote in (-1, 1):
            pieds = []
            for x in xs:
                u = u_de(x)
                p = bord(u, cote, 0.2, 0.02)
                pieds.append(p)
                corde(p, Vector((x_mat, cote * 0.08, z_haut)))
            for k in range(1, 5):  # les enfléchures (les barreaux)
                t = k / 5
                a = pieds[0].lerp(Vector((x_mat, cote * 0.08, z_haut)), t)
                b = pieds[-1].lerp(Vector((x_mat, cote * 0.08, z_haut)), t)
                corde(a, b, 0.014)
    corde((xm, 0, 6.3), (xf, 0, 4.95))
    corde((xf, 0, 4.98), (4.28, 0, 1.88))
    corde((xf, 0, 3.9), (3.6, 0, 1.56))
    for cote in (-1, 1):
        corde((xm, 0, 6.2), (xa + 0.2, cote * 0.85, haut_ch + 0.45))

    # ---- le pont : des tonneaux, des caisses, l'écoutille ----
    def tonneau(x, y):
        z = plat_bord(u_de(x)) - BORDAGE
        L.ajouter(B.tube([(x, y, z), (x, y, z + 0.12), (x, y, z + 0.28), (x, y, z + 0.44), (x, y, z + 0.56)], [0.16, 0.2, 0.215, 0.2, 0.16], 12), "planche")
        for dz in (0.1, 0.46):
            L.ajouter(B.tore(0.205, 0.022, 14, 4), "fer", B.mat4((x, y, z + dz)))
    tonneau(0.75, 0.62)
    tonneau(1.05, 0.3)
    tonneau(-0.95, -0.72)
    for x, y, dz, r in ((-0.85, 0.66, 0, 0.2), (-0.55, 0.78, 0, -0.15), (-0.72, 0.7, 0.36, 0.4)):
        z = plat_bord(u_de(x)) - BORDAGE + dz
        L.ajouter(B.boite(0.36, 0.36, 0.36), "bois_clair", B.mat4((x, y, z), (0, 0, r)))
        L.ajouter(B.boite(0.38, 0.06, 0.38), "bois", B.mat4((x, y, z - 0.01), (0, 0, r)))
    L.ajouter(B.boite(0.8, 0.62, 0.1), "bois_fonce", B.mat4((-0.55, -0.05, zp)))
    for k in range(4):
        L.ajouter(B.boite(0.05, 0.62, 0.04), "or", B.mat4((-0.85 + k * 0.2, -0.05, zp + 0.1)))

    corps = L.objet("navire_corps", coll, angle=36)

    # ---- les voiles (chacune un objet : le site les gonfle avec le vent) ----
    def poser_voile(nom, mat, x, z, lh, lb, h, creux):
        verts, faces, uvs = voile(lh, lb, h, creux)
        V = B.Lot().faces(verts, faces, mat, True, uvs)
        o = V.objet(nom, coll, angle=80)
        o.location = (x + 0.16, 0, z)
        B.anime(o, "voile", axe=[1, 0, 0])
        return o
    poser_voile("voile_grande", "voile_b", xm, 3.72, 3.3, 3.75, 2.25, 0.62)
    poser_voile("voile_hune", "voile", xm, 5.72, 2.3, 2.95, 1.2, 0.45)
    poser_voile("voile_misaine", "voile", xf, 3.34, 2.75, 3.1, 1.75, 0.5)
    poser_voile("voile_perroquet", "voile", xf, 4.72, 1.75, 2.35, 1.12, 0.38)
    # le foc : une voile triangulaire entre le mât de misaine et le beaupré
    a, b, c = Vector((xf + 0.15, 0, 4.7)), Vector((4.05, 0, 1.82)), Vector((2.45, 0, 1.55))
    verts, faces, uvs = [], [], []
    n = 8
    for j in range(n + 1):
        for i in range(n + 1 - j):
            s, t = i / n, j / n
            p = a + (b - a) * s + (c - a) * t
            p.y += 0.35 * s * t * (1 - s - t) * 6
            verts.append(tuple(p))
    def ix(i, j):
        return sum(n + 1 - k for k in range(j)) + i
    for j in range(n):
        for i in range(n - j):
            faces.append([ix(i, j), ix(i + 1, j), ix(i, j + 1)])
            uvs.append([(i / n, j / n), ((i + 1) / n, j / n), (i / n, (j + 1) / n)])
            if i < n - j - 1:
                faces.append([ix(i + 1, j), ix(i + 1, j + 1), ix(i, j + 1)])
                uvs.append([((i + 1) / n, j / n), ((i + 1) / n, (j + 1) / n), (i / n, (j + 1) / n)])
    foc = B.Lot().faces(verts, faces, "voile", True, uvs).objet("voile_foc", coll, angle=80, origine=tuple(a))
    B.anime(foc, "voile", axe=[0, 1, 0])

    # ---- la flamme (en haut du grand mât) et le drapeau (à l'arrière) ----
    verts, faces, uvs = [], [], []
    n = 10
    for i in range(n + 1):
        t = i / n
        hw = 0.2 * (1 - t) + 0.02
        verts += [(-t * 1.9, 0, hw), (-t * 1.9, 0, -hw)]
        if i:
            k = 2 * i
            faces.append([k - 2, k, k + 1, k - 1])
            uvs.append([((i - 1) / n, 1), (i / n, 1), (i / n, 0), ((i - 1) / n, 0)])
    fl = B.Lot().faces(verts, faces, "flamme", True, uvs).objet("flamme", coll, angle=80)
    fl.location = (xm, 0, 6.32)
    B.anime(fl, "flamme")
    L2 = B.Lot()
    L2.ajouter(B.cyl(0.035, 0.03, 1.3, 6), "bois_fonce", B.mat4((xa + 0.1, 0, haut_ch + 0.1)))
    L2.ajouter(B.sphere(0.06, 8, 5), "or", B.mat4((xa + 0.1, 0, haut_ch + 1.42)))
    L2.objet("mat_drapeau", coll)
    verts, faces, uvs = [], [], []
    nx, ny = 8, 4
    for j in range(ny + 1):
        for i in range(nx + 1):
            verts.append((-i / nx * 1.15, 0, -j / ny * 0.72))
    for j in range(ny):
        for i in range(nx):
            q = j * (nx + 1) + i
            faces.append([q, q + 1, q + nx + 2, q + nx + 1])
            uvs.append([(i / nx, 1 - j / ny), ((i + 1) / nx, 1 - j / ny), ((i + 1) / nx, 1 - (j + 1) / ny), (i / nx, 1 - (j + 1) / ny)])
    dr = B.Lot().faces(verts, faces, "drapeau", True, uvs).objet("drapeau", coll, angle=80)
    dr.location = (xa + 0.08, 0, haut_ch + 1.36)
    B.anime(dr, "drapeau")

    B.nettoyer()
    infos = {"objets": [o.name for o in coll.objects], "triangles": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")}
    if rendu:
        infos["rendu"] = B.vitrine(["navire"], cam=(13.0, -14.5, 7.5), cible=(0.7, 0, 2.6), objectif=50, nom="navire")
        infos["rendu2"] = B.vitrine(["navire"], cam=(-12.5, 11.0, 12.0), cible=(0.3, 0, 2.2), objectif=50, nom="navire-arriere")
        B.fin_vitrine()
    return infos
