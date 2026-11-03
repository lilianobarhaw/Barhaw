# Le navire V4 d'une commu (la démo V4) : un galion à trois mâts, stylisé mais détaillé, dessin original.
# Même repère que barhaw_navire.py : l'avant vers +X, le haut vers +Z, la ligne de flottaison à z = 0.
# Les noms comptent pour le site : navire_corps (tout ce qui ne bouge pas, ombres précalculées dans ses couleurs),
# voile_* (le site les gonfle), flamme, drapeau (le drapeau de la commu), matelot_* (ils bougent un peu).
# Les matières « rose » et « violet » prennent les deux couleurs de la commu sur le site.
# Usage, dans Blender :  import barhaw_navire_v4 as V; V.construire("barhaw")
import math, random, bmesh, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_navire as N

# chaque commu : sa figure de proue et ses deux couleurs (pour les rendus ; sur le site, elles viennent du bot)
COMMUS = {
    "barhaw": {"proue": "renne", "c1": 0xff5aae, "c2": 0x55ccff},
    "veyzo": {"proue": "tigre", "c1": 0xffc23d, "c2": 0xc8150f},
    "kikso": {"proue": "pieuvre", "c1": 0xffb347, "c2": 0xe0533c},
}
E = N.EXPOSANT
# les bandes de la coque, du plat-bord à la quille : couleur de la commu, moulure dorée, bordages avec leurs joints,
# préceintes sombres, liseré blanc à la flottaison, carène rouge sombre
NIV = [0.0, 0.05, 0.1, 0.125, 0.15, 0.22, 0.235, 0.3, 0.315, 0.37, 0.4, 0.47, 0.485, 0.55, 0.565, 0.62, 0.66, 0.69, 0.78, 0.88, 0.95, 1.0]
MAT = ["rose", "violet", "or", "bois_fonce", "bois", "bois_fonce", "bois2", "bois_fonce", "bois", "bois_fonce", "bois2", "bois_fonce", "bois", "bois_fonce", "bois2", "bois_fonce", "blanc", "rouge_fonce", "rouge_fonce", "rouge_fonce", "rouge_fonce"]


def cote_coque(u, f, cote=1):
    """Un point sur le flanc de la coque : u de la poupe (0) à la proue (1), f du plat-bord (0) à la quille (1)."""
    w = N.demi_largeur(u)
    top, d = N.plat_bord(u), N.quille(u)
    y = w * max(0.0, 1 - f ** E) ** (1 / E)
    return Vector((N.x_de(u), cote * y, top - f * (top - d)))


def coque():
    bm = bmesh.new()
    couche = bm.faces.layers.int.new("mat")
    noms = []

    def nm(n):
        if n not in noms:
            noms.append(n)
        return noms.index(n)

    S = 52
    sections = []
    for j in range(S + 1):
        u = j / S
        top = N.plat_bord(u)
        w = N.demi_largeur(u)
        win = max(0.02, w - N.EPAISSEUR)
        pont = top - N.BORDAGE
        boucle = [tuple(cote_coque(u, f, 1)) for f in NIV] + [tuple(cote_coque(u, f, -1)) for f in reversed(NIV[:-1])]
        boucle += [(N.x_de(u), -win, top), (N.x_de(u), -win, pont), (N.x_de(u), win, pont), (N.x_de(u), win, top)]
        sections.append([bm.verts.new(p) for p in boucle])
    P = len(sections[0])
    nb = len(NIV) - 1
    mats = MAT[:nb] + list(reversed(MAT[:nb])) + ["or", "bois_fonce", "planche", "bois_fonce", "or"]
    for j in range(S):
        for k in range(P):
            a, b = sections[j][k], sections[j][(k + 1) % P]
            c, d = sections[j + 1][(k + 1) % P], sections[j + 1][k]
            f = bm.faces.new((a, d, c, b))
            f[couche] = nm(mats[k])
    f = bm.faces.new(list(reversed(sections[0])))
    f[couche] = nm("bois_fonce")
    f = bm.faces.new(sections[-1])
    f[couche] = nm("violet")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm, noms


def construire(commu="barhaw", rendu=True, exporter=True):
    reg = COMMUS.get(commu, COMMUS["barhaw"])
    R = random.Random(7)
    coll = B.collection(f"navire_v4_{commu}")
    L = B.Lot()
    lanternes = []  # les points chauds (la lumière des lanternes, précalculée dans les couleurs)

    # ---- la coque : bordages, joints, préceintes, flottaison ----
    bm, noms = coque()
    L.ajouter(bm, None, couche_mat=("mat", noms))
    # des coquillages et des anatifes au ras de l'eau
    for k in range(70):
        u = 0.04 + R.random() * 0.88
        cote = R.choice((-1, 1))
        p = cote_coque(u, 0.7 + R.random() * 0.12, cote)
        L.ajouter(B.demi_sphere(0.035 + R.random() * 0.03, 8, 3), R.choice(("creme", "pierre", "corail")), B.mat4(p, (0, cote * math.pi / 2, 0)))
    # les clous dorés de la moulure
    for k in range(34):
        u = 0.05 + k / 34 * 0.88
        for cote in (-1, 1):
            L.ajouter(B.sphere(0.022, 6, 4), "or", B.mat4(cote_coque(u, 0.112, cote)))

    # ---- les sabords et les canons (cinq de chaque côté, couvercles ouverts) ----
    for cote in (-1, 1):
        for x in (-1.15, -0.45, 0.25, 0.95, 1.6):
            u = N.u_de(x)
            p = cote_coque(u, 0.27, cote)
            n = Vector((0, cote, 0))
            L.ajouter(B.boite(0.3, 0.05, 0.26), "noir", B.mat4(p + n * 0.005 - Vector((0, 0, 0.13))))
            L.ajouter(B.boite(0.34, 0.035, 0.05), "or", B.mat4(p + n * 0.02 + Vector((0, 0, 0.12))))
            L.ajouter(B.boite(0.32, 0.04, 0.28), "rouge_fonce", B.mat4(p + n * 0.05 + Vector((0, 0, 0.16)), (cote * math.radians(-62), 0, 0)))
            L.ajouter(B.tube([p - n * 0.05, p + n * 0.34], [0.085, 0.07], 10), "fer")
            L.ajouter(B.tore(0.075, 0.025, 10, 5), "fer", B.mat4(p + n * 0.34, (math.pi / 2, 0, 0)))
            L.ajouter(B.tore(0.088, 0.018, 10, 4), "fer", B.mat4(p + n * 0.12, (math.pi / 2, 0, 0)))

    # ---- le château arrière : deux étages, la galerie vitrée, les sculptures dorées, trois lanternes ----
    xa, xb = -2.72, -1.25
    ua, ub = N.u_de(xa), N.u_de(xb)
    larg = min(N.demi_largeur(ua), N.demi_largeur(ub)) - N.EPAISSEUR - 0.02
    sol = N.plat_bord(ua) - N.BORDAGE
    haut = 2.05
    L.ajouter(B.boite(xb - xa, larg * 2, haut - sol), "violet", B.mat4(((xa + xb) / 2, 0, sol)))
    # les planches du château (joints horizontaux)
    for z in [sol + 0.18 * k for k in range(1, int((haut - sol) / 0.18))]:
        for cote in (-1, 1):
            L.ajouter(B.boite(xb - xa + 0.005, 0.012, 0.018), "bois_fonce", B.mat4(((xa + xb) / 2, cote * (larg + 0.003), z)))
    L.ajouter(B.boite(xb - xa + 0.16, larg * 2 + 0.16, 0.1), "planche", B.mat4(((xa + xb) / 2, 0, haut)))
    L.ajouter(B.boite(xb - xa + 0.22, larg * 2 + 0.22, 0.07), "or", B.mat4(((xa + xb) / 2, 0, haut - 0.07)))
    # la galerie de poupe : un balcon, des fenêtres éclairées, des colonnettes
    for k in range(5):
        y = -larg + 0.2 + k * (2 * larg - 0.4) / 4
        L.ajouter(B.boite(0.03, 0.26, 0.34), "lumiere", B.mat4((xa - 0.012, y, 1.25)))
        L.ajouter(B.boite(0.05, 0.3, 0.04), "or", B.mat4((xa - 0.02, y, 1.6)))
        L.ajouter(B.boite(0.05, 0.035, 0.36), "bois_fonce", B.mat4((xa - 0.025, y, 1.24)))
        L.ajouter(B.boite(0.05, 0.3, 0.025), "bois_fonce", B.mat4((xa - 0.025, y, 1.42)))
        lanternes.append(Vector((xa - 0.1, y, 1.42)))
    L.ajouter(B.boite(0.28, larg * 2 + 0.1, 0.06), "planche", B.mat4((xa - 0.14, 0, 1.0)))
    for k in range(13):
        y = -larg + k * (2 * larg) / 12
        L.ajouter(B.cyl(0.022, 0.022, 0.24, 6), "creme", B.mat4((xa - 0.26, y, 1.06)))
    L.ajouter(B.tube([(xa - 0.26, -larg, 1.32), (xa - 0.26, larg, 1.32)], 0.03, 6), "or")
    # les sculptures dorées (des volutes) sous le balcon et aux coins
    for cote in (-1, 1):
        L.ajouter(B.tube(B.courbe((xa - 0.05, cote * larg * 0.95, 0.98), (xa - 0.05, cote * larg * 0.2, 0.62), (xa - 0.35, cote * larg * 0.75, 0.6), 10), [0.06, 0.05, 0.045, 0.04, 0.035, 0.03, 0.03, 0.025, 0.02, 0.02], 7), "or")
        L.ajouter(B.tore(0.09, 0.03, 12, 5), "or", B.mat4((xa - 0.05, cote * larg * 0.2, 0.6), (0, math.pi / 2, 0)))
        L.ajouter(B.tube(B.courbe((xa + 0.05, cote * (larg + 0.05), haut - 0.05), (xa + 0.45, cote * (larg + 0.06), sol + 0.2), (xa - 0.2, cote * (larg + 0.12), sol + 0.9), 10), 0.035, 6), "or")
    L.ajouter(B.etoile(0.2, 0.09, 0.06, 5, 0.6, math.pi / 2), "or", B.mat4((xa - 0.03, 0, 1.78), (math.pi / 2, 0, -math.pi / 2)))
    # trois grandes lanternes de poupe
    for y, z in ((-larg + 0.1, haut + 0.1), (0, haut + 0.25), (larg - 0.1, haut + 0.1)):
        base = Vector((xa + 0.02, y, z))
        L.ajouter(B.tube([base + Vector((0.25, 0, -0.1)), base + Vector((0.05, 0, 0.05)), base + Vector((-0.12, 0, 0.12))], 0.025, 5), "fer")
        c = base + Vector((-0.14, 0, 0.0))
        L.ajouter(B.cyl(0.13, 0.1, 0.05, 8), "or", B.mat4(c))
        L.ajouter(B.cyl(0.11, 0.11, 0.26, 8), "lumiere", B.mat4(c + Vector((0, 0, 0.05))))
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            L.ajouter(B.cyl(0.012, 0.012, 0.28, 4), "or", B.mat4(c + Vector((math.cos(a) * 0.115, math.sin(a) * 0.115, 0.04))))
        L.ajouter(B.cyl(0.13, 0.0, 0.16, 8), "or", B.mat4(c + Vector((0, 0, 0.31))))
        L.ajouter(B.tore(0.04, 0.012, 8, 4), "or", B.mat4(c + Vector((0, 0, 0.5)), (math.pi / 2, 0, 0)))
        lanternes.append(c + Vector((0, 0, 0.18)))
    # la rambarde du château et la barre
    for cote in (-1, 1):
        for k in range(10):
            L.ajouter(B.cyl(0.03, 0.03, 0.3, 6), "creme", B.mat4((xa + 0.06 + k / 9 * (xb - xa - 0.12), cote * (larg + 0.03), haut + 0.1)))
        L.ajouter(B.tube([(xa + 0.04, cote * (larg + 0.03), haut + 0.42), (xb - 0.04, cote * (larg + 0.03), haut + 0.42)], 0.04, 6), "rose")
    xr = xb - 0.38
    L.ajouter(B.boite(0.14, 0.14, 0.52), "bois_fonce", B.mat4((xr, 0, haut + 0.1)))
    centre = Vector((xr + 0.09, 0, haut + 0.72))
    L.ajouter(B.tore(0.3, 0.035, 24, 6), "bois_clair", B.mat4(centre, (0, math.pi / 2, 0)))
    L.ajouter(B.tore(0.16, 0.02, 16, 5), "or", B.mat4(centre, (0, math.pi / 2, 0)))
    for k in range(8):
        a = k * math.pi / 4
        d = Vector((0, math.cos(a), math.sin(a)))
        L.ajouter(B.tube([centre, centre + d * 0.44], [0.026, 0.036], 5), "bois_clair")
    L.ajouter(B.boite(0.04, 0.55, 0.75), "bois_fonce", B.mat4((xb + 0.02, 0.0, sol)))
    L.ajouter(B.tore(0.07, 0.02, 10, 5), "or", B.mat4((xb + 0.05, 0.13, sol + 0.38), (0, math.pi / 2, 0)))

    # ---- le gaillard d'avant ----
    xg = 2.0
    ug = N.u_de(xg)
    lg = N.demi_largeur(ug) - N.EPAISSEUR - 0.03
    L.ajouter(B.boite(0.08, lg * 2, 0.3), "violet", B.mat4((xg, 0, N.plat_bord(ug) - N.BORDAGE)))

    # ---- le pont : des planches, l'écoutille à caillebotis, le cabestan, la cloche ----
    zp = lambda x: N.plat_bord(N.u_de(x)) - N.BORDAGE
    for k in range(9):
        y = -0.8 + k * 0.2
        L.ajouter(B.boite(3.2, 0.012, 0.012), "bois_fonce", B.mat4((0.35, y, zp(0.35) + 0.002)))
    L.ajouter(B.boite(0.9, 0.7, 0.12), "bois_fonce", B.mat4((-0.6, 0, zp(-0.6))))
    for k in range(6):
        L.ajouter(B.boite(0.05, 0.7, 0.03), "bois_clair", B.mat4((-0.98 + k * 0.15, 0, zp(-0.6) + 0.12)))
        L.ajouter(B.boite(0.9, 0.04, 0.03), "bois_clair", B.mat4((-0.6, -0.3 + k * 0.12, zp(-0.6) + 0.13)))
    xc = 1.15
    L.ajouter(B.cyl(0.2, 0.16, 0.45, 12), "bois_fonce", B.mat4((xc, 0, zp(xc))))
    L.ajouter(B.cyl(0.24, 0.24, 0.06, 12), "or", B.mat4((xc, 0, zp(xc) + 0.45)))
    for k in range(6):
        a = k * math.pi / 3
        L.ajouter(B.tube([(xc, 0, zp(xc) + 0.4), (xc + math.cos(a) * 0.55, math.sin(a) * 0.55, zp(xc) + 0.4)], 0.025, 5), "bois_clair")
    cl = Vector((xg - 0.05, 0.0, zp(xg) + 0.3))
    L.ajouter(B.tube([cl + Vector((0, -0.25, 0)), cl + Vector((0, -0.25, 0.45)), cl + Vector((0, 0.25, 0.45)), cl + Vector((0, 0.25, 0))], 0.03, 6, caps=False), "bois_fonce")
    L.ajouter(B.tube([cl + Vector((0, 0, 0.44)), cl + Vector((0, 0, 0.36)), cl + Vector((0, 0, 0.22)), cl + Vector((0, 0, 0.16))], [0.03, 0.07, 0.1, 0.11], 12), "or")

    # ---- des accessoires partout : tonneaux, caisses, boulets, cordages, seaux, chaînes, lanternes ----
    def tonneau(x, y, couche=False, ech=1.0):
        z = zp(x)
        if couche:
            M = B.mat4((x, y, z + 0.2 * ech), (math.pi / 2, 0, R.random()), ech)
            pts = [(0, 0, -0.28), (0, 0, -0.16), (0, 0, 0), (0, 0, 0.16), (0, 0, 0.28)]
        else:
            M = B.mat4((x, y, z), (0, 0, R.random() * 6), ech)
            pts = [(0, 0, 0), (0, 0, 0.12), (0, 0, 0.28), (0, 0, 0.44), (0, 0, 0.56)]
        L.ajouter(B.tube(pts, [0.16, 0.2, 0.215, 0.2, 0.16], 14), "planche", M)
        for dz in ((-0.18, 0.18) if couche else (0.1, 0.46)):
            L.ajouter(B.tore(0.205, 0.022, 14, 4), "fer", M @ B.mat4((0, 0, dz)))
    for x, y in ((0.7, 0.62), (0.98, 0.42), (0.62, 0.32), (-0.98, -0.72), (1.6, -0.5)):
        tonneau(x, y)
    tonneau(0.85, -0.66, couche=True)
    for x, y, dz, r in ((-0.15, 0.72, 0, 0.2), (0.15, 0.78, 0, -0.15), (0.0, 0.72, 0.36, 0.4), (-1.05, 0.6, 0, 0.1)):
        z = zp(x) + dz
        L.ajouter(B.boite(0.36, 0.36, 0.36), "bois_clair", B.mat4((x, y, z), (0, 0, r)))
        for s in (-1, 1):
            L.ajouter(B.boite(0.38, 0.05, 0.05), "bois", B.mat4((x, y, z + 0.18 + s * 0.12), (0, 0, r)))
    # une pyramide de boulets
    xb2 = 0.45
    for niveau, n in enumerate((3, 2, 1)):
        for i in range(n):
            for j in range(n):
                L.ajouter(B.sphere(0.075, 10, 6), "fer", B.mat4((xb2 + (i - (n - 1) / 2) * 0.15, -0.55 + (j - (n - 1) / 2) * 0.15, zp(xb2) + 0.075 + niveau * 0.12)))
    # des cordages enroulés
    for x, y in ((-0.25, -0.62), (1.45, 0.55), (-1.6, -0.55)):
        for k in range(4):
            L.ajouter(B.tore(0.16 - k * 0.025, 0.025, 16, 5), "corde", B.mat4((x, y, zp(x) + 0.025 + k * 0.04)))
    # des seaux et une chaîne d'ancre qui traîne
    for x, y in ((0.3, 0.75), (-1.2, -0.3)):
        L.ajouter(B.cyl(0.08, 0.1, 0.16, 10), "planche", B.mat4((x, y, zp(x))))
        L.ajouter(B.tore(0.1, 0.012, 10, 4), "fer", B.mat4((x, y, zp(x) + 0.12)))
    for k in range(14):
        L.ajouter(B.tore(0.045, 0.014, 8, 4), "fer", B.mat4((1.4 + k * 0.07, -0.25 + math.sin(k * 0.6) * 0.06, zp(1.4) + 0.02), (0 if k % 2 else math.pi / 2, math.pi / 2, 0)))
    # des lanternes sur poteaux le long du pont
    for x, y in ((0.0, -0.78), (1.3, 0.72), (-0.95, 0.78)):
        base = Vector((x, y, zp(x)))
        L.ajouter(B.cyl(0.025, 0.025, 0.6, 6), "fer", B.mat4(base))
        L.ajouter(B.cyl(0.08, 0.06, 0.04, 8), "or", B.mat4(base + Vector((0, 0, 0.6))))
        L.ajouter(B.cyl(0.07, 0.07, 0.16, 8), "lumiere", B.mat4(base + Vector((0, 0, 0.63))))
        L.ajouter(B.cyl(0.08, 0.0, 0.1, 8), "or", B.mat4(base + Vector((0, 0, 0.79))))
        lanternes.append(base + Vector((0, 0, 0.7)))

    # ---- la proue : le beaupré, son bout-dehors, la lanterne de proue ----
    L.ajouter(B.tube([(2.5, 0, 1.15), (3.4, 0, 1.52), (4.5, 0, 1.95), (5.3, 0, 2.2)], [0.12, 0.09, 0.06, 0.04], 8), "bois_fonce")
    for x, z in ((3.4, 1.52), (4.5, 1.95)):
        L.ajouter(B.tore(0.1, 0.03, 10, 5), "or", B.mat4((x, 0, z), (0, math.radians(65), 0)))
    pl = Vector((4.55, 0, 1.75))
    L.ajouter(B.cyl(0.07, 0.07, 0.15, 8), "lumiere", B.mat4(pl))
    L.ajouter(B.cyl(0.08, 0.0, 0.08, 8), "or", B.mat4(pl + Vector((0, 0, 0.15))))
    lanternes.append(pl + Vector((0, 0, 0.07)))
    # l'ancre et sa chaîne
    xa2 = 2.15
    ya = N.demi_largeur(N.u_de(xa2)) + 0.06
    h = N.plat_bord(N.u_de(xa2))
    L.ajouter(B.tube([(xa2, ya, h - 0.15), (xa2, ya, h - 0.85)], 0.04, 6), "fer")
    L.ajouter(B.tube([(xa2 - 0.22, ya, h - 0.27), (xa2 + 0.22, ya, h - 0.27)], 0.03, 6), "fer")
    L.ajouter(B.tube(B.courbe((xa2 - 0.3, ya, h - 0.62), (xa2 + 0.3, ya, h - 0.62), (xa2, ya, h - 1.05), 9), 0.04, 6), "fer")
    for s in (-1, 1):
        L.ajouter(B.cyl(0.07, 0.0, 0.14, 6), "fer", B.mat4((xa2 + s * 0.3, ya, h - 0.66), (0, s * math.radians(-30), 0)))

    # ---- la figure de proue (sculptée, peinte) ----
    figure_de_proue(L, reg["proue"])

    # ---- les trois mâts, leurs hunes, leurs vergues ----
    mats_ = [(-1.95, haut, 4.6, "artimon"), (0.25, zp(0.25), 7.0, "grand"), (1.65, zp(1.65), 5.9, "misaine")]
    vergues = []
    for x, z0, z1, nom in mats_:
        L.ajouter(B.tube([(x, 0, z0 - 0.2), (x, 0, z1 * 0.6), (x, 0, z1)], [0.15, 0.11, 0.07], 10), "bois_fonce")
        for k in range(int((z1 - z0) / 0.6)):
            L.ajouter(B.tore(0.13 - k * 0.006, 0.02, 10, 4), "fer", B.mat4((x, 0, z0 + 0.4 + k * 0.6)))
        L.ajouter(B.sphere(0.1, 10, 6), "or", B.mat4((x, 0, z1 + 0.04)))
        hune = z1 * 0.6
        L.ajouter(B.cyl(0.45, 0.45, 0.06, 14), "planche", B.mat4((x, 0, hune)))
        L.ajouter(B.tore(0.45, 0.03, 18, 5), "or", B.mat4((x, 0, hune + 0.06)))
        n_v = 3 if nom == "grand" else 2
        for k in range(n_v):
            zv = hune - 0.25 + k * (z1 - hune) / n_v * 1.05 if k else hune - 0.25
            lv = (3.9 if nom == "grand" else 3.3 if nom == "misaine" else 2.4) * (1 - k * 0.22)
            if nom == "artimon" and k == 1:
                continue
            L.ajouter(B.tube([(x + 0.1, -lv / 2, zv), (x + 0.1, 0, zv + 0.03), (x + 0.1, lv / 2, zv)], [0.035, 0.065, 0.035], 8), "bois_fonce")
            for s in (-1, 1):
                L.ajouter(B.sphere(0.06, 8, 5), "or", B.mat4((x + 0.1, s * lv / 2, zv)))
            vergues.append((nom, k, x, zv, lv))
    # le nid de pie du grand mât (la vigie y monte)
    xm = 0.25
    L.ajouter(B.cyl(0.3, 0.42, 0.42, 14), "violet", B.mat4((xm, 0, 5.75)))
    L.ajouter(B.tore(0.42, 0.045, 18, 6), "or", B.mat4((xm, 0, 6.17)))
    L.ajouter(B.cyl(0.07, 0.07, 0.12, 8), "lumiere", B.mat4((xm + 0.3, -0.22, 6.17)))
    lanternes.append(Vector((xm + 0.3, -0.22, 6.25)))

    # ---- le gréement : haubans avec enfléchures, étais, bras des vergues ----
    def corde(a, b, r=0.02, flechir=0.0):
        a, b = Vector(a), Vector(b)
        if flechir:
            pts = B.courbe(a, b, (a + b) / 2 - Vector((0, 0, flechir)), 6)
            L.ajouter(B.tube(pts, r, 5, caps=False), "corde")
        else:
            L.ajouter(B.tube([a, b], r, 5, caps=False), "corde")
    for x, z0, z1, nom in mats_:
        tete = z1 * 0.6
        xs = (x - 0.45, x - 0.1, x + 0.25) if nom != "artimon" else (x - 0.35, x, x + 0.3)
        for cote in (-1, 1):
            pieds = []
            for xx in xs:
                if nom == "artimon":
                    p = Vector((xx, cote * (larg + 0.04), haut + 0.42))
                else:
                    p = N.bord(N.u_de(xx), cote, 0.2, 0.02)
                pieds.append(p)
                corde(p, (x, cote * 0.1, tete))
            for k in range(1, 7):
                t = k / 7
                corde(pieds[0].lerp(Vector((x, cote * 0.1, tete)), t), pieds[-1].lerp(Vector((x, cote * 0.1, tete)), t), 0.012)
    corde((-1.95, 0, 4.5), (0.25, 0, 6.85), 0.018, 0.12)
    corde((0.25, 0, 6.85), (1.65, 0, 5.8), 0.018, 0.1)
    corde((1.65, 0, 5.8), (5.25, 0, 2.2), 0.02, 0.2)
    corde((1.65, 0, 4.4), (4.5, 0, 1.95), 0.02, 0.15)
    corde((0.25, 0, 4.2), (1.65, 0, 3.4), 0.016, 0.08)
    for nom, k, x, zv, lv in vergues:
        for s in (-1, 1):
            corde((x + 0.1, s * lv / 2, zv), N.bord(N.u_de(x - 0.5), s, 0.25, 0.0) if nom != "artimon" else (x - 0.7, s * larg, haut + 0.42), 0.012, 0.15)

    corps = L.objet("navire_corps", coll, angle=36)

    # ---- les voiles : un peu usées (le site les dessine), gonflées par le vent ----
    def poser_voile(nom, mat, x, z, lh, lb, h, creux):
        verts, faces, uvs = N.voile(lh, lb, h, creux, 16, 11)
        o = B.Lot().faces(verts, faces, mat, True, uvs).objet(nom, coll, angle=80)
        o.location = (x + 0.17, 0, z)
        B.anime(o, "voile", axe=[1, 0, 0])
        return o
    g = {(nom, k): (x, zv, lv) for nom, k, x, zv, lv in vergues}
    x, zv, lv = g[("grand", 0)]
    poser_voile("voile_grande", "voile_b", x, zv, lv * 0.88, lv * 0.98, 1.95, 0.6)
    x, zv, lv = g[("grand", 1)]
    poser_voile("voile_hune", "voile", x, zv, lv * 0.85, g[("grand", 0)][2] * 0.86, zv - g[("grand", 0)][1] - 0.15, 0.5)
    x, zv, lv = g[("grand", 2)]
    poser_voile("voile_perroquet", "voile", x, zv, lv * 0.8, g[("grand", 1)][2] * 0.8, zv - g[("grand", 1)][1] - 0.12, 0.38)
    x, zv, lv = g[("misaine", 0)]
    poser_voile("voile_misaine", "voile", x, zv, lv * 0.88, lv * 0.98, 1.6, 0.52)
    x, zv, lv = g[("misaine", 1)]
    poser_voile("voile_misaine_hune", "voile", x, zv, lv * 0.82, g[("misaine", 0)][2] * 0.86, zv - g[("misaine", 0)][1] - 0.12, 0.42)
    x, zv, lv = g[("artimon", 0)]
    poser_voile("voile_artimon", "voile", x, zv + 1.0, lv * 0.55, lv * 0.95, 1.3, 0.4)
    # les focs : deux voiles triangulaires vers le beaupré
    for nom, a, b, c in (("voile_foc", (1.82, 0, 5.6), (5.2, 0, 2.25), (2.4, 0, 1.55)), ("voile_foc2", (1.8, 0, 4.3), (4.4, 0, 1.98), (2.3, 0, 1.5))):
        a, b, c = Vector(a), Vector(b), Vector(c)
        verts, faces, uvs = [], [], []
        n = 8
        for j in range(n + 1):
            for i in range(n + 1 - j):
                s, t = i / n, j / n
                p = a + (b - a) * s + (c - a) * t
                p.y += 0.3 * s * t * (1 - s - t) * 6
                verts.append(tuple(p - a))
        def ix(i, j):
            return sum(n + 1 - k for k in range(j)) + i
        for j in range(n):
            for i in range(n - j):
                faces.append([ix(i, j), ix(i + 1, j), ix(i, j + 1)])
                uvs.append([(i / n, j / n), ((i + 1) / n, j / n), (i / n, (j + 1) / n)])
                if i < n - j - 1:
                    faces.append([ix(i + 1, j), ix(i + 1, j + 1), ix(i, j + 1)])
                    uvs.append([((i + 1) / n, j / n), ((i + 1) / n, (j + 1) / n), (i / n, (j + 1) / n)])
        o = B.Lot().faces(verts, faces, "voile", True, uvs).objet(nom, coll, angle=80)
        o.location = tuple(a)
        B.anime(o, "voile", axe=[0, 1, 0])

    # ---- la flamme en haut du grand mât, le drapeau de la commu en haut du mât d'artimon ----
    verts, faces, uvs = [], [], []
    n = 12
    for i in range(n + 1):
        t = i / n
        hw = 0.18 * (1 - t) + 0.02
        verts += [(-t * 2.2, 0, hw), (-t * 2.2, 0, -hw)]
        if i:
            k = 2 * i
            faces.append([k - 2, k, k + 1, k - 1])
            uvs.append([((i - 1) / n, 1), (i / n, 1), (i / n, 0), ((i - 1) / n, 0)])
    fl = B.Lot().faces(verts, faces, "flamme", True, uvs).objet("flamme", coll, angle=80)
    fl.location = (0.25, 0, 7.0)
    B.anime(fl, "flamme")
    verts, faces, uvs = [], [], []
    nx, ny = 10, 7
    for j in range(ny + 1):
        for i in range(nx + 1):
            verts.append((-i / nx * 1.3, 0, -j / ny * 1.05))
    for j in range(ny):
        for i in range(nx):
            q = j * (nx + 1) + i
            faces.append([q, q + 1, q + nx + 2, q + nx + 1])
            uvs.append([(i / nx, 1 - j / ny), ((i + 1) / nx, 1 - j / ny), ((i + 1) / nx, 1 - (j + 1) / ny), (i / nx, 1 - (j + 1) / ny)])
    dr = B.Lot().faces(verts, faces, "drapeau", True, uvs).objet("drapeau", coll, angle=80)
    dr.location = (-1.97, 0, 4.62)
    B.anime(dr, "drapeau")

    # ---- l'équipage : cinq matelots (inventés), chacun à son poste ----
    matelots(coll, zp, haut, xr)

    B.nettoyer()
    # ---- la lumière précalculée : l'ombre des recoins (AO) et la chaleur des lanternes, dans les couleurs du corps ----
    infos = {"ao": precalculer(corps, lanternes)}
    infos["objets"] = len(coll.objects)
    infos["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")
    if exporter:
        infos["glb"] = B.exporter(coll.name, f"navire-{commu}.glb")
    if rendu:
        infos["rendus"] = rendre(coll.name, commu, reg)
    return infos


def figure_de_proue(L, genre):
    """Une figure sculptée sous le beaupré, qui sort de l'étrave. Toutes inventées."""
    base = Vector((N.X1 - 0.05, 0, 0.95))
    inc = (0, math.radians(-35), 0)
    M = B.mat4(base, inc)
    # le buste qui sort de l'étrave
    L.ajouter(B.tube([(-0.35, 0, -0.25), (-0.05, 0, -0.05), (0.15, 0, 0.12)], [0.2, 0.24, 0.2], 12), "bois_clair" if genre != "pieuvre" else "violet", M)
    tete = Vector((0.32, 0, 0.32))
    if genre == "renne":
        # un renne-raton laveur : masque sombre autour des yeux, museau clair, oreilles rondes, bois dorés
        L.ajouter(B.sphere(0.24, 16, 12), "gres", M @ B.mat4(tete, (0, 0, 0), (1.05, 0.95, 0.9)))
        L.ajouter(B.sphere(0.12, 12, 8), "creme", M @ B.mat4(tete + Vector((0.2, 0, -0.07)), (0, 0, 0), (1.1, 0.9, 0.75)))
        L.ajouter(B.sphere(0.045, 8, 6), "noir", M @ B.mat4(tete + Vector((0.32, 0, -0.04))))
        L.ajouter(B.tube([tete + Vector((0.12, -0.2, 0.06)), tete + Vector((0.2, 0, 0.08)), tete + Vector((0.12, 0.2, 0.06))], [0.06, 0.075, 0.06], 10), "roche_noire", M)
        for s in (-1, 1):
            L.ajouter(B.sphere(0.04, 8, 6), "blanc", M @ B.mat4(tete + Vector((0.19, s * 0.08, 0.08))))
            L.ajouter(B.sphere(0.022, 6, 4), "noir", M @ B.mat4(tete + Vector((0.225, s * 0.08, 0.085))))
            L.ajouter(B.sphere(0.07, 10, 6), "gres", M @ B.mat4(tete + Vector((-0.05, s * 0.2, 0.18)), (0, 0, 0), (0.6, 1, 1.2)))
            b0 = tete + Vector((-0.05, s * 0.1, 0.2))
            b1 = b0 + Vector((-0.05, s * 0.18, 0.28))
            b2 = b1 + Vector((-0.12, s * 0.1, 0.22))
            L.ajouter(B.tube([b0, b1, b2], [0.035, 0.03, 0.02], 6), "or", M)
            L.ajouter(B.tube([b1, b1 + Vector((0.12, s * 0.08, 0.14))], [0.025, 0.015], 6), "or", M)
            L.ajouter(B.tube([b2 - (b2 - b1) * 0.4, b2 - (b2 - b1) * 0.4 + Vector((0.1, s * 0.06, 0.12))], [0.02, 0.012], 6), "or", M)
        # la queue rayée, enroulée le long de l'étrave
        for k in range(5):
            L.ajouter(B.tore(0.13 - k * 0.012, 0.045, 12, 6), "roche_noire" if k % 2 else "gres", M @ B.mat4((-0.42 - k * 0.06, 0, -0.32 - k * 0.05), (0, math.pi / 2, 0)))
    elif genre == "tigre":
        L.ajouter(B.sphere(0.25, 16, 12), "orange", M @ B.mat4(tete, (0, 0, 0), (1.05, 1.0, 0.9)))
        L.ajouter(B.sphere(0.13, 12, 8), "creme", M @ B.mat4(tete + Vector((0.2, 0, -0.08)), (0, 0, 0), (1.0, 1.1, 0.7)))
        L.ajouter(B.sphere(0.045, 8, 6), "noir", M @ B.mat4(tete + Vector((0.31, 0, -0.03))))
        for s in (-1, 1):
            L.ajouter(B.sphere(0.04, 8, 6), "jaune", M @ B.mat4(tete + Vector((0.2, s * 0.09, 0.08))))
            L.ajouter(B.cyl(0.08, 0.0, 0.16, 8), "orange", M @ B.mat4(tete + Vector((-0.02, s * 0.17, 0.18)), (s * -0.4, 0, 0)))
            for k in range(3):
                L.ajouter(B.tube([tete + Vector((0.0 - k * 0.08, s * 0.24, 0.05)), tete + Vector((0.05 - k * 0.08, s * 0.16, 0.2))], 0.02, 5), "noir", M)
            L.ajouter(B.cyl(0.02, 0.0, 0.1, 6), "blanc", M @ B.mat4(tete + Vector((0.28, s * 0.05, -0.12)), (math.pi, 0, 0)))
    else:
        # une pieuvre : une grosse tête, des tentacules qui s'enroulent autour de l'étrave
        L.ajouter(B.sphere(0.3, 16, 12), "violet", M @ B.mat4(tete + Vector((0, 0, 0.08)), (0, 0, 0), (1.0, 1.0, 1.25)))
        for s in (-1, 1):
            L.ajouter(B.sphere(0.06, 10, 8), "jaune", M @ B.mat4(tete + Vector((0.22, s * 0.12, 0.02))))
            L.ajouter(B.sphere(0.03, 6, 4), "noir", M @ B.mat4(tete + Vector((0.27, s * 0.12, 0.02))))
        for k in range(6):
            a = (k / 6) * math.pi * 2
            pts = [tete + Vector((0.05, math.cos(a) * 0.15, -0.2 + math.sin(a) * 0.05))]
            for j in range(1, 7):
                t = j / 6
                pts.append(pts[0] + Vector((-t * 0.7, math.cos(a + t * 2.5) * (0.15 + t * 0.15), -t * 0.45 + math.sin(a + t * 3) * 0.1)))
            L.ajouter(B.tube(pts, [0.07 * (1 - j / 7) + 0.015 for j in range(7)], 8), "violet", M)


def matelots(coll, zp, haut, xr):
    """Cinq petits matelots ronds (inventés) : la vigie, le barreur, celui qui salue, le porteur, celui qui hisse."""
    def matelot(nom, pos, rot=0.0, bras="", ech=1.0):
        M = B.mat4(pos, (0, 0, rot), ech)
        C = B.Lot()
        C.ajouter(B.tube([(0, 0, 0.12), (0, 0, 0.3), (0, 0, 0.42)], [0.13, 0.15, 0.12], 12), "blanc", M)
        for k in range(3):
            C.ajouter(B.tore(0.14, 0.018, 12, 4), "rose", M @ B.mat4((0, 0, 0.2 + k * 0.08)))
        C.ajouter(B.tore(0.13, 0.025, 12, 4), "bois_fonce", M @ B.mat4((0, 0, 0.14)))
        for s in (-1, 1):
            C.ajouter(B.tube([(0, s * 0.06, 0.12), (0, s * 0.07, 0.0)], 0.05, 8), "violet", M)
            C.ajouter(B.sphere(0.055, 8, 6), "bois_fonce", M @ B.mat4((0.03, s * 0.07, 0.0), (0, 0, 0), (1.4, 1, 0.7)))
        C.ajouter(B.sphere(0.15, 14, 10), "sable", M @ B.mat4((0, 0, 0.56)))
        C.ajouter(B.demi_sphere(0.155, 14, 5), "violet", M @ B.mat4((0, 0, 0.6)))
        C.ajouter(B.sphere(0.04, 8, 6), "violet", M @ B.mat4((-0.15, 0.05, 0.62)))
        for s in (-1, 1):
            C.ajouter(B.sphere(0.022, 6, 4), "noir", M @ B.mat4((0.13, s * 0.05, 0.58)))
        C.ajouter(B.sphere(0.03, 6, 4), "corail", M @ B.mat4((0.15, 0, 0.53)))
        if bras != "salut":
            for s in (-1, 1):
                C.ajouter(B.tube([(0, s * 0.15, 0.38), (0.12, s * 0.18, 0.26)], 0.035, 6), "blanc", M)
        o = C.objet(nom, coll, angle=60, origine=tuple(pos))  # il se balance sur ses pieds
        B.anime(o, "balance", axe=[1, 0, 0], ampl=0.05, vitesse=1.6, phase=R2.random() * 6)
        if bras == "salut":
            A = B.Lot()
            A.ajouter(B.tube([(0, 0, 0), (0.02, 0.08, 0.14), (0.0, 0.1, 0.28)], 0.035, 6), "blanc")
            A.ajouter(B.sphere(0.04, 8, 6), "sable", B.mat4((0.0, 0.1, 0.3)))
            a = A.objet(nom + "_bras", coll, angle=60, origine=(0, 0, 0))
            a.location = Vector(pos) + Vector((0, 0.15 * ech, 0.4 * ech))
            a.rotation_euler = (0, 0, rot)
            a.scale = (ech, ech, ech)
            B.anime(a, "balance", axe=[1, 0, 0], ampl=0.5, vitesse=5.0, phase=0.0)
        if bras == "longue-vue":
            T = B.Lot()
            T.ajouter(B.tube([(0.12, -0.1, 0.5), (0.4, -0.12, 0.6)], [0.03, 0.04], 8), "or", M)
            T.objet(nom + "_longue_vue", coll, angle=60)
        return o
    global R2
    R2 = random.Random(3)
    matelot("matelot_vigie", (0.25, 0.0, 5.82), math.radians(10), "longue-vue")
    matelot("matelot_barreur", (xr - 0.22, 0.0, haut + 0.06), 0.0)
    matelot("matelot_salut", (2.2, 0.35, zp(2.2) + 0.02), math.radians(-20), "salut")
    matelot("matelot_porteur", (0.35, 0.35, zp(0.35)), math.radians(140))
    matelot("matelot_corde", (-0.4, -0.45, zp(-0.4)), math.radians(70))


def precalculer(o, lanternes, echantillons=48):
    """L'ombre des recoins (AO, calculée par Cycles) et la chaleur des lanternes, rangées dans les couleurs du maillage."""
    scene = bpy.context.scene
    me = o.data
    attr = me.color_attributes.get("Couleur") or me.color_attributes.new("Couleur", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = attr
    moteur = scene.render.engine
    try:
        scene.render.engine = "CYCLES"
        scene.cycles.samples = echantillons
        try:
            scene.cycles.device = "GPU"
        except Exception:
            pass
        for x in bpy.context.selected_objects:
            x.select_set(False)
        o.hide_set(False)
        o.hide_render = False
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        scene.render.bake.target = "VERTEX_COLORS"
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        ok = True
    except Exception as e:
        ok = str(e)
    finally:
        scene.render.engine = moteur
    # la chaleur des lanternes (orangé), un peu de froid dans les ombres (bleuté), pas de noir complet
    chaud = (1.0, 0.72, 0.42)
    for i, v in enumerate(me.vertices):
        c = attr.data[i].color
        ao = max(0.0, min(1.0, c[0])) if ok is True else 1.0
        ao = 0.66 + 0.34 * ao  # des ombres douces : le bois reste lisible
        w = 0.0
        for p in lanternes:
            d = (v.co - p).length
            w += max(0.0, 1 - d / 1.3) ** 2
        w = min(1.0, w)
        ombre = (0.86, 0.9, 1.06)
        attr.data[i].color = tuple(min(1.6, ao * (ombre[j] * (1 - ao) + ao) * (1 + w * (chaud[j] - 0.55) * 1.2)) for j in range(3)) + (1.0,)
    me.update()
    return ok


def rendre(collection_nom, commu, reg):
    """Deux rendus (trois quarts avant et arrière) pour l'aperçu : la lumière des lanternes, la brume du soir."""
    anciens = {}
    for nom, h in (("rose", reg["c1"]), ("violet", reg["c2"])):
        m = B.materiau(nom)
        anciens[nom] = tuple(m.diffuse_color)
        coul = B.rgba(h)
        m.diffuse_color = coul
        bsdf = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
        if bsdf:
            bsdf.inputs["Base Color"].default_value = coul
    try:
        r1 = B.vitrine([collection_nom], cam=(14.5, -15.5, 8.0), cible=(0.9, 0, 2.9), objectif=50, nom=f"navire-v4-{commu}")
        r2 = B.vitrine([collection_nom], cam=(-13.0, 12.0, 11.5), cible=(0.3, 0, 2.6), objectif=50, nom=f"navire-v4-{commu}-arriere")
        B.fin_vitrine()
    finally:
        for nom, coul in anciens.items():
            m = B.materiau(nom)
            m.diffuse_color = coul
            bsdf = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
            if bsdf:
                bsdf.inputs["Base Color"].default_value = coul
    return [r1, r2]
