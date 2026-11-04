# Les nouvelles îles de la V4 (22 décembre) : chacune a une ambiance très marquée. Tout est inventé.
#   marais     Le Marais des Lanternes : une mangrove de nuit, des bougies, une cabane sur pilotis, des barques
#   cristal    Le Jardin de Cristal : des cristaux géants qui brillent, un jardin de pierre, une arche
#   archipel   L'Archipel Suspendu : des îlots qui flottent, des cascades, des blocs d'eau, un arc-en-ciel
#   cimetiere  Le Cimetière de Navires : des épaves, des membrures, des lanternes vertes, du brouillard
#   horloge    L'Île-Horloge : des engrenages géants qui tournent, une tour d'horloge, des tuyaux qui fument
#   geants     L'Île des Géants Endormis : les collines dessinent un géant couché ; une main sort de l'eau
#   forteresse La Forteresse des Corsaires : un fort de pierre, des tours, des canons, un port
# Chaque fonction renvoie (le décor fixe, les points chauds pour la patine). Usage : barhaw_iles_v4.construire("marais")
import math, random, bmesh
from mathutils import Vector
import barhaw_base as B
import barhaw_iles as IL


# ---------- les petites pièces communes ----------
def bougie(L, F, x, y, z, h=0.3, r=0.06):
    """Une bougie (dans le décor) et sa flamme (dans F, le lot des flammes qui vacillent)."""
    L.ajouter(B.cyl(r, r * 0.92, h, 8), "creme", B.mat4((x, y, z)))
    L.ajouter(B.cyl(r * 1.25, r * 0.6, 0.06, 8), "creme", B.mat4((x, y, z + h * 0.55)))  # une coulure de cire
    F.ajouter(B.cyl(r * 0.55, 0.0, r * 2.4, 6), "lumiere", B.mat4((x, y, z + h + 0.01)))


def lanterne_papier(L, M, couleur="rouge"):
    """Une lanterne de papier ronde, allumée."""
    L.ajouter(B.sphere(0.2, 12, 8), "lumiere", M @ B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 1.18)))
    for dz in (-0.2, 0.2):
        L.ajouter(B.cyl(0.09, 0.09, 0.05, 8), "noir", M @ B.mat4((0, 0, dz - 0.025)))
    for k in range(4):
        L.ajouter(B.tore(0.205 - abs(k - 1.5) * 0.03, 0.012, 16, 3), couleur, M @ B.mat4((0, 0, -0.14 + k * 0.095)))


def fanion(D, nom, pos, mat="rouge", taille=(1.2, 0.75), rot=0.0):
    """Un drapeau uni qui flotte (pas le drapeau d'une commu)."""
    nx, ny = 8, 4
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            verts.append((i / nx * taille[0], 0, -j / ny * taille[1] * (1 - 0.25 * i / nx)))
    for j in range(ny):
        for i in range(nx):
            q = j * (nx + 1) + i
            faces.append([q, q + nx + 1, q + nx + 2, q + 1])
    o = B.Lot().faces(verts, faces, mat, True).objet(f"{D.id}_{nom}", D.coll, angle=80)
    o.location = Vector(pos)
    o.rotation_euler = (0, 0, rot)
    o["role"] = "anim"
    B.anime(o, "drapeau")
    return o


def engrenage(L, M, r, ep, dents, mat="laiton", rayons=5):
    """Une roue dentée dans le plan XZ (son axe est Y), centrée sur l'origine de M."""
    rot = B.mat4((0, 0, 0), (math.pi / 2, 0, 0))
    L.ajouter(B.tore(r * 0.86, r * 0.12, max(24, dents * 2), 6), mat, M @ rot @ B.mat4(ech=(1, 1, ep / (r * 0.24))))
    for k in range(dents):
        a = k * 2 * math.pi / dents
        L.ajouter(B.boite(r * 0.16, ep, r * 0.2), mat, M @ B.mat4((math.cos(a) * r * 0.9, 0, math.sin(a) * r * 0.9), (0, -a + math.pi / 2, 0)))
    for k in range(rayons):
        a = k * 2 * math.pi / rayons
        L.ajouter(B.tube([(0, 0, 0), (math.cos(a) * r * 0.78, 0, math.sin(a) * r * 0.78)], r * 0.06, 6), mat, M)
    L.ajouter(B.cyl(r * 0.18, r * 0.18, ep * 1.4, 14), "cuivre", M @ B.mat4((0, ep * 0.7, 0), (math.pi / 2, 0, 0)))
    L.ajouter(B.cyl(r * 0.07, r * 0.07, ep * 1.8, 8), "fer", M @ B.mat4((0, ep * 0.9, 0), (math.pi / 2, 0, 0)))


def arbre_rond(L, base, h, r, mats=("feuille", "vert_clair"), graine=0, penche=(0.0, 0.0)):
    """Un petit arbre (tronc + boules de feuillage), posé où on veut (îlots volants compris)."""
    rnd = random.Random(graine)
    base = Vector(base)
    haut = base + Vector((penche[0], penche[1], h))
    L.ajouter(B.tube(B.courbe(base, haut, (base + haut) / 2 + Vector((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), 0)), 5), [r * 0.22, r * 0.16, r * 0.13, r * 0.11, r * 0.09], 7), "bois", B.mat4())
    for k in range(5):
        c = haut + Vector((rnd.uniform(-0.5, 0.5) * r, rnd.uniform(-0.5, 0.5) * r, rnd.uniform(-0.2, 0.35) * r))
        L.ajouter(B.caillou(r * rnd.uniform(0.45, 0.7), graine * 10 + k, 0.18, 2), mats[k % len(mats)], B.mat4(c))


def canon(L, M, longueur=1.0):
    """Un canon sur son affût, qui vise +X."""
    L.ajouter(B.boite(0.7 * longueur, 0.5, 0.22), "bois_fonce", M @ B.mat4((0, 0, 0.12)))
    for s in (-1, 1):
        for dx in (-0.22, 0.22):
            L.ajouter(B.cyl(0.13, 0.13, 0.06, 10), "bois2", M @ B.mat4((dx * longueur, s * 0.28, 0.13), (math.pi / 2, 0, 0)))
    L.ajouter(B.tube([(-0.35 * longueur, 0, 0.42), (0.1, 0, 0.44), (0.62 * longueur, 0, 0.46)], [0.16, 0.13, 0.11], 12), "fer", M)
    L.ajouter(B.tore(0.12, 0.03, 12, 4), "fer", M @ B.mat4((0.62 * longueur, 0, 0.46), (0, math.pi / 2, 0)))


def epave(L, M, lg=4.0, larg=1.4, casse=0.5, graine=0, mat="bois2"):
    """Une épave : la quille, des membrures (des côtes de bois), des bordages arrachés, un mât cassé."""
    rnd = random.Random(graine)
    L.ajouter(B.boite(lg, 0.22, 0.22), "bois_fonce", M @ B.mat4((0, 0, 0)))
    n = int(lg / 0.42)
    for k in range(n):
        x = -lg / 2 + 0.3 + k * (lg - 0.6) / max(1, n - 1)
        fin = 1 - abs(x) / (lg * 0.62)
        w = larg * max(0.35, fin)
        hh = 1.5 * (0.55 + 0.45 * fin)
        for s in (-1, 1):
            if rnd.random() < casse * 0.35 and s > 0:
                continue  # une membrure tombée
            haut = hh * (1 - rnd.random() * casse * 0.5)
            L.ajouter(B.tube(B.courbe((x, 0, 0.1), (x, s * w * 0.9, haut), (x, s * w * 1.05, 0.15), 6), 0.07, 5), "bois_fonce", M)
    for k in range(int(lg * 2.2)):
        x = rnd.uniform(-lg / 2 + 0.4, lg / 2 - 0.4)
        s = rnd.choice((-1, 1))
        if rnd.random() < casse:
            continue
        zz = rnd.uniform(0.3, 1.1)
        w = larg * max(0.35, 1 - abs(x) / (lg * 0.62))
        L.ajouter(B.boite(rnd.uniform(0.7, 1.6), 0.06, 0.16), rnd.choice((mat, "planche", "bois_fonce")), M @ B.mat4((x, s * w * (0.62 + zz * 0.3), zz), (s * 0.5, 0, rnd.uniform(-0.15, 0.15))))
    # le mât, cassé, et un lambeau de voile
    hm = rnd.uniform(1.6, 3.2)
    L.ajouter(B.cyl(0.11, 0.08, hm, 8), "bois", M @ B.mat4((lg * 0.08, 0, 0.1), (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.25, 0.25), 0)))
    L.ajouter(B.boite(0.04, 0.9, 0.7), "gris", M @ B.mat4((lg * 0.08, 0.35, hm * 0.6), (0.2, 0.1, 0.4)))


def coque_epave(L, M, taille=1.0, graine=0, mat="bois2", casse=0.35):
    """Une coque échouée qu'on reconnaît : arrondie, cassée à l'arrière, des membrures à nu, un mât brisé."""
    rnd = random.Random(graine)
    S = M @ B.mat4(ech=taille)
    bm = B.demi_sphere(1.0, 22, 7)
    B.deformer(bm, lambda c: Vector((c.x * 2.3, c.y * 0.95 * (1 - max(0.0, c.x) * 0.4), -c.z * 1.0 + 0.95)))
    coupe = 2.3 * (1 - casse * 2)  # l'arrière arraché (les x les plus petits)
    trous = [f for f in bm.faces if f.calc_center_median().x < -coupe or (abs(f.calc_center_median().x - rnd.uniform(-0.6, 0.6)) < 0.25 and f.calc_center_median().y > 0.35 and f.calc_center_median().z > 0.4)]
    bmesh.ops.delete(bm, geom=trous, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    L.ajouter(bm, mat, S)
    # l'intérieur, plus sombre (la même coque, un peu plus petite, retournée)
    bi = B.demi_sphere(0.94, 22, 7)
    B.deformer(bi, lambda c: Vector((c.x * 2.3, c.y * 0.95 * (1 - max(0.0, c.x) * 0.4), -c.z * 1.0 + 0.97)))
    bmesh.ops.delete(bi, geom=[f for f in bi.faces if f.calc_center_median().x < -coupe], context="FACES")
    bmesh.ops.reverse_faces(bi, faces=bi.faces)
    L.ajouter(bi, "bois_fonce", S)
    t = B.tore(1.0, 0.06, 28, 5)
    B.deformer(t, lambda c: Vector((c.x * 2.3, c.y * 0.95 * (1 - max(0.0, c.x) * 0.4), c.z + 0.95)))
    bmesh.ops.delete(t, geom=[v for v in t.verts if v.co.x < -coupe], context="VERTS")
    L.ajouter(t, "bois_fonce", S)
    # les membrures qui dépassent là où la coque est arrachée
    for k in range(4):
        x = -coupe - 0.1 - k * 0.32
        for sgn in (-1, 1):
            if rnd.random() < 0.3:
                continue
            L.ajouter(B.tube(B.courbe((x, 0, 0.05), (x, sgn * 0.75 * (1 - k * 0.12), 0.9 - k * 0.15 - rnd.random() * 0.3), (x, sgn * 0.95, 0.15), 6), 0.055, 5), "bois_fonce", S)
    L.ajouter(B.boite(2.4 + coupe * 0.4, 0.14, 0.14), "bois_fonce", S @ B.mat4((-0.3, 0, -0.08)))  # la quille
    # le pont (quelques planches), le mât brisé, un lambeau de voile
    for k in range(5):
        if rnd.random() < 0.4:
            continue
        L.ajouter(B.boite(0.24, 1.3, 0.05), "planche", S @ B.mat4((0.9 - k * 0.42, 0, 0.72), (0, 0, rnd.uniform(-0.08, 0.08))))
    hm = rnd.uniform(1.4, 2.4)
    L.ajouter(B.cyl(0.09, 0.07, hm, 8), "bois", S @ B.mat4((0.4, 0, 0.6), (rnd.uniform(-0.35, 0.35), rnd.uniform(-0.3, 0.3), 0)))
    L.ajouter(B.boite(0.03, 0.8, 0.6), "gris", S @ B.mat4((0.45, 0.3, 0.6 + hm * 0.55), (0.25, 0.1, 0.5)))
    L.ajouter(B.boite(1.0, 0.07, 0.07), "bois", S @ B.mat4((0.4, 0, 0.6 + hm * 0.7), (0, 0, 0.3)))


def ilot_volant(L, c, r, graine=0, herbe="vert_clair"):
    """Un îlot qui flotte : un dessus d'herbe, un dessous de roche en pointe, des racines qui pendent."""
    rnd = random.Random(graine)
    c = Vector(c)
    L.ajouter(B.caillou(r, graine, 0.22, 2, (1.0, 1.0, 0.28)), herbe, B.mat4(c))
    L.ajouter(B.caillou(r * 0.95, graine + 50, 0.32, 2, (1.0, 1.0, 1.25)), "pierre", B.mat4(c + Vector((0, 0, -r * 0.62))))
    L.ajouter(B.caillou(r * 0.55, graine + 80, 0.35, 2, (1.0, 1.0, 1.4)), "pierre_fonce", B.mat4(c + Vector((r * 0.1, 0, -r * 1.55))))
    for k in range(7):
        a = rnd.uniform(0, 6.28)
        p0 = c + Vector((math.cos(a) * r * 0.75, math.sin(a) * r * 0.75, -r * 0.15))
        L.ajouter(B.tube([p0, p0 + Vector((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), -r * rnd.uniform(0.6, 1.3)))], [0.04, 0.015], 4), "bois_fonce", B.mat4())


# ---------- Le Marais des Lanternes ----------
def ile_marais(id_, coll):
    R = IL.Relief(7.4, 211, plage=0.86, anneaux=32, secteurs=104)

    def h(x, y, t):
        base = 0.22 + IL.lisse((1 - t / R.plage) * 2.2) * 0.42
        ch = IL.fbm(x, y, 0.3, 3, 5)  # des chenaux d'eau noire qui coupent l'île
        if ch > 0.12 and math.hypot(x - 1.6, y + 0.6) > 1.9:
            base -= (ch - 0.12) * 2.6
        return base + IL.fbm(x, y, 1.3, 2, 9) * 0.07

    def couleur(x, y, z, t, n):
        if z < 0.02:
            return IL.mel(0x34503f, 0x16302e, min(1.0, -z / 0.45))
        v = IL.fbm(x, y, 0.9, 3, 4)
        col = IL.mel(0x5d5636, 0x4d6e3a, max(0.0, min(1.0, 0.5 + v * 1.6)))
        if z < 0.14:
            col = IL.mel(col, 0x3f3a26, 0.55)  # la vase au bord de l'eau
        return col
    o, v, f = R.construire(f"{id_}_terrain", coll, h, couleur)
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(211)
    L = D.L
    F = B.Lot()  # les flammes
    chauds = []

    # les palétuviers : un tronc perché sur des racines en arceaux, un feuillage sombre, de la mousse qui pend
    def paletuvier(x, y, hh, graine):
        rr = random.Random(graine)
        z0 = D.z(x, y, 0.0)
        pied = Vector((x, y, z0 + 0.75))
        for k in range(7):
            a = k * 2 * math.pi / 7 + rr.uniform(-0.3, 0.3)
            d = rr.uniform(0.7, 1.15)
            q = Vector((x + math.cos(a) * d, y + math.sin(a) * d, 0))
            q.z = D.z(q.x, q.y, 0.1)
            L.ajouter(B.tube(B.courbe(pied, q, pied + Vector((math.cos(a) * d * 0.7, math.sin(a) * d * 0.7, 0.35)), 7), [0.07, 0.06, 0.055, 0.05, 0.045, 0.04, 0.04], 5), "bois_fonce")
        haut = pied + Vector((rr.uniform(-0.3, 0.3), rr.uniform(-0.3, 0.3), hh))
        L.ajouter(B.tube(B.courbe(pied, haut, (pied + haut) / 2 + Vector((0.25, -0.15, 0)), 6), [0.16, 0.14, 0.12, 0.11, 0.1, 0.08], 7), "bois_fonce")
        for k in range(3):
            a = k * 2.1 + rr.random()
            b = haut + Vector((math.cos(a) * 0.9, math.sin(a) * 0.9, 0.3))
            L.ajouter(B.tube([haut, (haut + b) / 2 + Vector((0, 0, 0.25)), b], [0.07, 0.05, 0.035], 5), "bois_fonce")
        for k in range(6):
            c = haut + Vector((rr.uniform(-1.0, 1.0), rr.uniform(-1.0, 1.0), rr.uniform(0.2, 0.7)))
            L.ajouter(B.caillou(rr.uniform(0.55, 0.85), graine * 10 + k, 0.25, 2, (1, 1, 0.6)), rr.choice(("vert_fonce", "mousse", "feuille")), B.mat4(c))
            for j in range(3):  # la mousse qui pend
                p0 = c + Vector((rr.uniform(-0.5, 0.5), rr.uniform(-0.5, 0.5), -0.25))
                L.ajouter(B.tube([p0, p0 + Vector((0.05, 0.02, -rr.uniform(0.4, 0.9)))], [0.04, 0.012], 4), "mousse")
    for k, (x, y, hh) in enumerate(((-3.2, -2.0, 2.4), (-1.0, 3.4, 2.8), (3.6, 2.8, 2.2), (-4.4, 1.8, 2.0), (3.9, -3.0, 2.6), (0.4, -3.8, 2.1))):
        paletuvier(x, y, hh, 300 + k)

    # la cabane sur pilotis, au-dessus d'une mare : plancher, murs de planches, toit de paille, fenêtre allumée
    cx, cy = 1.6, -0.6
    zp = 1.1
    for dx in (-0.9, 0, 0.9):
        for dy in (-0.7, 0.7):
            L.ajouter(B.cyl(0.08, 0.08, zp + 1.4, 7), "bois_fonce", B.mat4((cx + dx, cy + dy, -1.4), (rnd.uniform(-0.04, 0.04), rnd.uniform(-0.04, 0.04), 0)))
    L.ajouter(B.boite(2.4, 1.9, 0.12), "planche", B.mat4((cx, cy, zp)))
    for k in range(9):
        L.ajouter(B.boite(0.04, 1.92, 0.02), "bois_fonce", B.mat4((cx - 1.1 + k * 0.27, cy, zp + 0.12)))
    W = B.mat4((cx, cy, zp + 0.12), (0, 0, 0.05))
    L.ajouter(B.boite(1.7, 1.3, 1.1), "bois2", W)
    for k in range(6):
        L.ajouter(B.boite(1.72, 1.32, 0.025), "bois_fonce", W @ B.mat4((0, 0, 0.18 * k + 0.1)))
    L.ajouter(B.prisme(2.3, 1.9, 0.9), "paille", W @ B.mat4((0, 0, 1.1)))
    for k in range(10):  # des mèches de paille qui dépassent
        a = k * 0.63
        L.ajouter(B.tube([(math.cos(a) * 1.05, math.sin(a) * 0.85, 1.12), (math.cos(a) * 1.3, math.sin(a) * 1.05, 0.98)], 0.03, 4), "paille", W)
    L.ajouter(B.boite(0.42, 0.05, 0.36), "lumiere", W @ B.mat4((0.35, -0.66, 0.45)))
    L.ajouter(B.boite(0.5, 0.06, 0.06), "bois_fonce", W @ B.mat4((0.35, -0.68, 0.63)))
    L.ajouter(B.boite(0.4, 0.06, 0.8), "bois_fonce", W @ B.mat4((-0.45, -0.66, 0.0)))
    chauds += [Vector((cx + 0.35, cy - 0.8, zp + 0.6))]
    # l'échelle, la passerelle de planches et la cheminée qui fume
    for k in range(6):
        L.ajouter(B.boite(0.5, 0.06, 0.05), "planche", B.mat4((cx - 1.35, cy - 0.2, zp - k * 0.2), (0, 0, math.pi / 2)))
    for s in (-1, 1):
        L.ajouter(B.cyl(0.04, 0.04, zp + 0.5, 5), "bois_fonce", B.mat4((cx - 1.35, cy - 0.2 + s * 0.24, -0.3)))
    L.ajouter(B.cyl(0.12, 0.1, 0.7, 8), "pierre_fonce", W @ B.mat4((-0.55, 0.35, 1.3)))
    D.repere("fumee", "fumee", (cx - 0.5, cy + 0.4, zp + 2.2))
    # des lanternes accrochées sous l'avant-toit
    for k, dx in enumerate((-0.7, 0.7)):
        M = W @ B.mat4((dx, -0.95, 1.0))
        L.ajouter(B.tube([(0, 0, 0.3), (0, 0, 0.0)], 0.01, 3), "corde", M)
        lanterne_papier(L, M @ B.mat4((0, 0, -0.18)), "rouge_fonce")
        chauds.append(Vector((cx + dx, cy - 1.0, zp + 1.0)))

    # des bougies partout : sur les racines, au bord de l'eau, en cercles, sur le plancher
    for k in range(46):
        p = R.point(rnd, 0.05, 0.84)
        if not p:
            continue
        z = D.z(*p, 0.02)
        if z < 0.03:
            continue
        for j in range(rnd.randint(1, 3)):
            bougie(L, F, p[0] + rnd.uniform(-0.18, 0.18), p[1] + rnd.uniform(-0.18, 0.18), D.z(p[0], p[1], 0.02), rnd.uniform(0.15, 0.42))
    for k in range(7):
        bougie(L, F, cx - 1.0 + k * 0.32, cy - 0.85, zp + 0.12, rnd.uniform(0.12, 0.3))
    # les lanternes qui flottent sur l'eau, en trois groupes qui ne bougent pas ensemble
    for g in range(3):
        G = B.Lot()
        centre = None
        for k in range(5):
            a = rnd.uniform(0, 6.28)
            d = R.bord(a) * rnd.uniform(1.0, 1.28)
            x, y = math.cos(a) * d, math.sin(a) * d
            z = rnd.uniform(0.35, 1.6)
            centre = centre or Vector((x, y, z))
            lanterne_papier(G, B.mat4((x, y, z), (0, 0, rnd.uniform(0, 3))), rnd.choice(("rouge_fonce", "orange", "rose")))
            chauds.append(Vector((x, y, z)))
        D.anim(f"lanternes{g}", G, "flotte", origine=tuple(centre), ampl=0.18, phase=g * 2.1)
    # deux barques, chacune avec sa lanterne au bout d'une perche
    for k, (x, y, rot) in enumerate(((-2.2, -4.6, 0.6), (5.6, 0.8, 2.3))):
        G = B.Lot()
        M = B.mat4((x, y, 0.02), (0, 0, rot))
        IL.barque(G, M, "bois2", "rouge_fonce", 0.9)
        G.ajouter(B.tube([(0.5, 0, 0.1), (0.9, 0, 1.4), (1.1, 0, 1.55)], 0.025, 4), "bois_fonce", M)
        lanterne_papier(G, M @ B.mat4((1.15, 0, 1.25)), "orange")
        G.ajouter(B.tube([(1.1, 0, 1.55), (1.15, 0, 1.45)], 0.008, 3), "corde", M)
        D.anim(f"barque{k}", G, "flotte", origine=(x, y, 0), ampl=0.08, phase=k * 1.7)
    # des roseaux, des nénuphars en fleur, des souches
    for k in range(16):
        p = R.point(rnd, 0.74, 0.95)
        if not p:
            continue
        z = D.z(*p, 0.05)
        for j in range(rnd.randint(3, 5)):
            dx, dy = rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15)
            hh = rnd.uniform(0.5, 1.1)
            L.ajouter(B.tube([(p[0] + dx, p[1] + dy, z), (p[0] + dx * 2, p[1] + dy * 2, z + hh)], [0.025, 0.008], 4), rnd.choice(("mousse", "paille", "vert_fonce")))
            if j == 0:
                L.ajouter(B.cyl(0.035, 0.035, 0.18, 6), "bois_fonce", B.mat4((p[0] + dx * 2, p[1] + dy * 2, z + hh - 0.2)))
    for k in range(24):
        a = rnd.uniform(0, 6.28)
        d = R.bord(a) * rnd.uniform(0.95, 1.2)
        x, y = math.cos(a) * d, math.sin(a) * d
        L.ajouter(B.cyl(rnd.uniform(0.18, 0.3), rnd.uniform(0.18, 0.3), 0.02, 12), "vert", B.mat4((x, y, 0.02)))
        if k % 3 == 0:
            for j in range(5):
                b = j * 1.256
                L.ajouter(B.sphere(0.06, 6, 4), "rose_pale", B.mat4((x + math.cos(b) * 0.06, y + math.sin(b) * 0.06, 0.08), (0, 0, 0), (1, 1, 0.6)))
    for k in range(6):
        p = R.point(rnd, 0.3, 0.8)
        if p:
            L.ajouter(B.cyl(0.22, 0.28, 0.35, 9), "bois_fonce", B.mat4((p[0], p[1], D.z(*p, 0.05))))
    D.repere("lucioles", "lucioles", (0.5, 0.2, 0.8), rayon=7)
    D.anim("flammes", F, "clignote", lent=1)
    return D.finir(), chauds


# ---------- Le Jardin de Cristal ----------
def cristal(L, base, direction, h, r, mat="cristal", coeur=None):
    """Un cristal à six pans, pointu ; il peut avoir un cœur qui brille."""
    base = Vector(base)
    d = Vector(direction).normalized()
    rot = d.to_track_quat("Z", "Y").to_euler()
    M = B.mat4(base, rot)
    L.ajouter(B.cyl(r, r * 0.88, h * 0.78, 6), mat, M)
    L.ajouter(B.cyl(r * 0.88, 0.0, h * 0.22, 6), mat, M @ B.mat4((0, 0, h * 0.78)))
    if coeur:
        coeur.ajouter(B.cyl(r * 0.35, r * 0.3, h * 0.7, 6), "lumiere", M @ B.mat4((0, 0, h * 0.05)))


def ile_cristal(id_, coll):
    R = IL.Relief(6.8, 223, plage=0.8, anneaux=30, secteurs=96)

    def h(x, y, t):
        return 0.3 + IL.lisse((1 - t / R.plage) * 2.4) * (1.3 + IL.fbm(x, y, 0.5, 3, 3) * 0.35) + IL.bosse(x, y, -1.4, 1.0, 0.9, 2.2)

    def couleur(x, y, z, t, n):
        if z < 0.02:
            return IL.mel(0xe9e2f2, 0x7fd8e6, min(1.0, -z / 0.7))
        if z < 0.42:
            return B.rgb(0xece4f2)
        v = IL.fbm(x, y, 0.8, 3, 7)
        col = IL.mel(0x9fd8a8, 0x7cc4a0, max(0.0, v) * 1.5)  # une herbe menthe
        if n.z < 0.8:
            col = IL.mel(col, 0xb7a6d6, min(1.0, (0.8 - n.z) / 0.25))  # la roche lilas
        return col
    o, v, f = R.construire(f"{id_}_terrain", coll, h, couleur)
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(223)
    L = D.L
    C = B.Lot()  # les cœurs qui brillent
    chauds = []

    def bouquet(x, y, n, hmax, rmax, mats, graine):
        rr = random.Random(graine)
        z = D.z(x, y, 0.15)
        for k in range(n):
            a = k * 2 * math.pi / n + rr.uniform(-0.3, 0.3)
            pench = rr.uniform(0.15, 0.6) if k else 0.0
            hh = hmax * (1.0 if k == 0 else rr.uniform(0.35, 0.75))
            rr_ = rmax * (1.0 if k == 0 else rr.uniform(0.4, 0.7))
            cristal(L, (x + math.cos(a) * rr_ * 0.8 * (k > 0), y + math.sin(a) * rr_ * 0.8 * (k > 0), z), (math.cos(a) * pench, math.sin(a) * pench, 1), hh, rr_, rr.choice(mats), C if k == 0 else None)
        chauds.append(Vector((x, y, z + hmax * 0.5)))
    # le grand cristal du milieu et ses bouquets
    bouquet(-1.4, 1.0, 9, 5.2, 0.62, ("cristal", "cristal", "glace"), 401)
    for k, (x, y, hh, mats) in enumerate(((2.4, 2.2, 2.6, ("rose_pale", "cristal")), (-3.6, -1.6, 2.2, ("glace", "turquoise")), (2.8, -2.4, 3.0, ("cristal", "violet")), (-0.2, -3.4, 1.8, ("rose_pale", "glace")), (-4.0, 2.4, 1.6, ("turquoise", "cristal")))):
        bouquet(x, y, 6, hh, 0.36, mats, 410 + k)
    # des petits éclats partout, et une arche de cristaux
    for k in range(40):
        p = R.point(rnd, 0.1, 0.82)
        if p:
            a = rnd.uniform(0, 6.28)
            cristal(L, (p[0], p[1], D.z(*p, 0.05)), (math.cos(a) * 0.4, math.sin(a) * 0.4, 1), rnd.uniform(0.25, 0.7), rnd.uniform(0.06, 0.13), rnd.choice(("cristal", "glace", "rose_pale", "turquoise")))
    a0, a1 = Vector((0.6, -1.0, 0)), Vector((1.0, 1.4, 0))
    a0.z, a1.z = D.z(a0.x, a0.y, 0.1), D.z(a1.x, a1.y, 0.1)
    pts = B.courbe(a0, a1, (a0 + a1) / 2 + Vector((0.6, 0, 4.2)), 11)
    for k in range(len(pts) - 1):
        cristal(L, pts[k], pts[k + 1] - pts[k], (pts[k + 1] - pts[k]).length * 1.3, 0.22, "cristal" if k % 2 else "rose_pale")
    # le jardin : un chemin de dalles, un petit bassin, des buissons à fleurs de cristal, des lanternes de pierre
    IL.trace_sol(D, [(-4.8, -3.6, 0), (-2.6, -2.2, 0), (0.0, -0.8, 0), (1.6, 0.4, 0), (3.4, 1.2, 0)], 0.6, "pierre", 0.04, 0.45)
    bx, by = 3.0, -0.4
    L.ajouter(B.cyl(0.95, 0.95, 0.12, 24), "eau_douce", B.mat4((bx, by, D.z(bx, by, 0.02))))
    L.ajouter(B.tore(1.0, 0.12, 24, 6), "pierre", B.mat4((bx, by, D.z(bx, by, 0.0) + 0.1)))
    for k in range(10):
        p = R.point(rnd, 0.2, 0.75)
        if p:
            z = D.z(*p, 0.05)
            L.ajouter(B.caillou(rnd.uniform(0.28, 0.42), 450 + k, 0.2, 2, (1, 1, 0.75)), rnd.choice(("vert_fonce", "feuille")), B.mat4((p[0], p[1], z + 0.15)))
            for j in range(4):
                b = rnd.uniform(0, 6.28)
                C.ajouter(B.ico(0.07, 1), rnd.choice(("lumiere",)), B.mat4((p[0] + math.cos(b) * 0.3, p[1] + math.sin(b) * 0.3, z + 0.35 + rnd.uniform(0, 0.2))))
    for k, (x, y) in enumerate(((-2.0, -2.6), (1.2, -0.2), (-3.4, -3.0))):
        z = D.z(x, y, 0.05)
        L.ajouter(B.boite(0.3, 0.3, 0.6), "pierre", B.mat4((x, y, z)))
        L.ajouter(B.boite(0.42, 0.42, 0.1), "pierre", B.mat4((x, y, z + 0.6)))
        C.ajouter(B.boite(0.2, 0.2, 0.18), "lumiere", B.mat4((x, y, z + 0.7)))
        L.ajouter(B.prisme(0.48, 0.48, 0.22), "pierre_fonce", B.mat4((x, y, z + 0.88)))
        chauds.append(Vector((x, y, z + 0.8)))
    IL.rochers_cote(D, R, 22, 227, ("pierre", "pierre_fonce"), 0.25, 0.7, 0.8, 1.04)
    D.repere("etincelles", "etincelles", (-1.4, 1.0, 4.0))
    D.anim("coeurs", C, "clignote", lent=1)
    return D.finir(), chauds


# ---------- L'Archipel Suspendu ----------
def ile_archipel(id_, coll):
    R = IL.Relief(4.8, 239, plage=0.78, anneaux=26, secteurs=88)

    def h(x, y, t):
        return 0.25 + IL.lisse((1 - t / R.plage) * 2.2) * (0.7 + IL.fbm(x, y, 0.7, 3, 3) * 0.3) - IL.bosse(x, y, 0.8, -0.6, 0.9, 1.1)

    o, v, f = R.construire(f"{id_}_terrain", coll, h, IL.peindre(0xf1e2b8, 0x8fcf6a, 0x6aae4a, 0x9a9384, 1.1, graine=239))
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(239)
    L = D.L
    chauds = []
    # le bassin où tombent les cascades (de l'eau claire, de l'écume)
    L.ajouter(B.cyl(1.25, 1.25, 0.1, 24), "eau_douce", B.mat4((0.8, -0.6, 0.08)))
    D.repere("ecume", "ecume", (0.8, -0.6, 0.2))
    # les îlots qui flottent, chacun avec ce qu'il porte ; ils montent et descendent doucement
    ilots = [((0.8, -0.6, 7.2), 2.2, "temple"), ((-3.4, 1.8, 4.6), 1.5, "arbres"), ((3.6, 2.6, 5.4), 1.3, "maison"), ((-2.2, -3.4, 8.6), 1.1, "arbres"), ((4.4, -3.0, 3.8), 0.9, "rien")]
    for k, (c, r, quoi) in enumerate(ilots):
        G = B.Lot()
        c = Vector(c)
        ilot_volant(G, c, r, 500 + k)
        top = c + Vector((0, 0, r * 0.22))
        if quoi == "temple":
            # un petit temple rond : des colonnes blanches, un dôme doré
            for j in range(8):
                a = j * math.pi / 4
                G.ajouter(B.cyl(0.11, 0.11, 1.3, 8), "blanc", B.mat4(top + Vector((math.cos(a) * 0.95, math.sin(a) * 0.95, 0))))
            G.ajouter(B.cyl(1.2, 1.2, 0.18, 20), "blanc", B.mat4(top + Vector((0, 0, -0.05))))
            G.ajouter(B.cyl(1.15, 1.15, 0.14, 20), "blanc", B.mat4(top + Vector((0, 0, 1.3))))
            G.ajouter(B.demi_sphere(1.05, 18, 6), "or", B.mat4(top + Vector((0, 0, 1.44))))
            G.ajouter(B.sphere(0.12, 8, 6), "or", B.mat4(top + Vector((0, 0, 2.55))))
            G.ajouter(B.cyl(0.3, 0.3, 0.6, 10), "lumiere", B.mat4(top))
            chauds.append(top + Vector((0, 0, 0.4)))
        elif quoi == "arbres":
            for j in range(3):
                b = j * 2.1
                arbre_rond(G, top + Vector((math.cos(b) * r * 0.45, math.sin(b) * r * 0.45, -0.05)), rnd.uniform(0.9, 1.4), 0.7, ("feuille", "vert_clair", "rose_pale"), 520 + k * 5 + j)
        elif quoi == "maison":
            W = B.mat4(top + Vector((0, 0, -0.05)), (0, 0, 0.4))
            G.ajouter(B.boite(0.9, 0.8, 0.7), "creme", W)
            G.ajouter(B.prisme(1.1, 1.0, 0.55), "turquoise", W @ B.mat4((0, 0, 0.7)))
            G.ajouter(B.boite(0.25, 0.05, 0.25), "lumiere", W @ B.mat4((0.2, -0.41, 0.3)))
            G.ajouter(B.cyl(0.05, 0.05, 1.6, 6), "bois", W @ B.mat4((0.6, 0.3, 0)))
            G.ajouter(B.boite(0.04, 0.9, 0.18), "rose", W @ B.mat4((0.6, 0.7, 1.4), (0, 0, 0.0)))  # une girouette
            chauds.append(top + Vector((0.2, -0.4, 0.3)))
        # les cascades qui tombent du bord (un ruban d'eau jusqu'en bas)
        if quoi in ("temple", "arbres") and k < 3:
            a = rnd.uniform(0, 6.28) if k else math.atan2(-0.6 - c.y, 0.8 - c.x) + math.pi
            p0 = c + Vector((math.cos(a) * r * 0.92, math.sin(a) * r * 0.92, r * 0.1))
            p1 = Vector((p0.x + math.cos(a) * 0.3, p0.y + math.sin(a) * 0.3, 0.1)) if k else Vector((0.8 + math.cos(a) * 0.6, -0.6 + math.sin(a) * 0.6, 0.1))
            G.ajouter(B.tube(B.courbe(p0, p1, p0 + Vector((math.cos(a) * 0.5, math.sin(a) * 0.5, -0.2)), 9), [0.22, 0.2, 0.18, 0.17, 0.16, 0.16, 0.17, 0.2, 0.28], 8), "eau_douce", B.mat4())
        D.anim(f"ilot{k}", G, "flotte", origine=tuple(c), ampl=0.22 + k * 0.03, phase=k * 1.3)
    # les blocs d'eau cristalline qui flottent
    for k in range(7):
        G = B.Lot()
        c = Vector((rnd.uniform(-4.5, 4.5), rnd.uniform(-4.5, 4.5), rnd.uniform(2.0, 6.5)))
        s = rnd.uniform(0.3, 0.6)
        G.ajouter(B.boite(s, s, s), "glace", B.mat4(c + Vector((0, 0, -s / 2)), (rnd.uniform(0, 1), rnd.uniform(0, 1), rnd.uniform(0, 1))))
        D.anim(f"bloc{k}", G, "flotte", origine=tuple(c), ampl=0.3, phase=k * 0.9)
    # l'arc-en-ciel, du bassin jusqu'au grand îlot
    couleurs = ("rouge", "orange", "jaune", "vert_clair", "turquoise", "violet")
    p0, p1 = Vector((-4.2, -1.4, 0.0)), Vector((0.2, -0.2, 6.6))
    for j, mat in enumerate(couleurs):
        dec = Vector((0, 0, -j * 0.16))
        L.ajouter(B.tube(B.courbe(p0 + dec, p1 + dec, (p0 + p1) / 2 + Vector((-1.6, -0.4, 3.2)) + dec, 16), 0.085, 6), mat)
    # les chaînes qui retiennent les îlots, des rochers, des fleurs
    for k, (c, r, _) in enumerate(ilots[:3]):
        a = Vector(c) + Vector((0, 0, -r * 1.1))
        b = Vector((c[0] * 0.6, c[1] * 0.6, 0.0))
        b.z = D.z(b.x, b.y, 0.0)
        n = 14
        for j in range(n):
            q = a + (b - a) * (j / n) + Vector((0, 0, -math.sin(j / n * math.pi) * 0.4))
            L.ajouter(B.tore(0.1, 0.025, 10, 4), "fer", B.mat4(q, (0, (j % 2) * math.pi / 2, math.atan2(b.y - a.y, b.x - a.x))))
    IL.rochers_cote(D, R, 18, 241, ("pierre", "pierre_fonce"), 0.25, 0.6, 0.82, 1.04)
    IL.fleurs(D, R, 30, 243, ("rose", "jaune", "blanc", "violet"), 0.7, ((0.8, -0.6, 1.4),))
    D.repere("etincelles", "etincelles", (0.8, -0.6, 7.6))
    return D.finir(), chauds


# ---------- Le Cimetière de Navires ----------
def ile_cimetiere(id_, coll):
    R = IL.Relief(7.6, 251, plage=0.88, anneaux=30, secteurs=100)

    def h(x, y, t):
        base = 0.2 + IL.lisse((1 - t / R.plage) * 2.0) * 0.55 + IL.fbm(x, y, 0.6, 3, 2) * 0.12
        if IL.fbm(x, y, 0.25, 2, 6) > 0.2:
            base -= 0.35  # des flaques d'eau grise
        return base

    def couleur(x, y, z, t, n):
        if z < 0.02:
            return IL.mel(0x8fa3a6, 0x4f6670, min(1.0, -z / 0.6))
        v = IL.fbm(x, y, 1.0, 3, 8)
        return IL.mel(0xb6aea0, 0x8a857a, max(0.0, min(1.0, 0.5 + v * 1.5)))
    o, v, f = R.construire(f"{id_}_terrain", coll, h, couleur)
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(251)
    L = D.L
    Sp = B.Lot()  # ce qui luit en vert
    chauds = []
    # les épaves : de vraies coques couchées sur le flanc, à moitié enfoncées ; une carcasse à nu
    for k, (x, y, rot, taille, inc, enf) in enumerate(((-2.2, 1.6, 0.4, 1.25, 0.55, 0.35), (2.4, -1.8, -0.9, 1.1, -0.6, 0.3), (0.2, -3.6, 1.8, 0.9, 0.4, 0.3), (5.8, 2.2, 0.9, 1.3, 0.3, 0.7))):
        z = (D.z(x, y, 0.0) if abs(x) < 5 else 0.0) - enf
        coque_epave(L, B.mat4((x, y, z), (inc, 0, rot)), taille, 600 + k, ("bois2", "bois", "bois2", "planche")[k], 0.25 + k * 0.05)
    epave(L, B.mat4((-4.4, -2.2, D.z(-4.4, -2.2, 0.25)), (0.15, 0, 2.6)), 3.6, 1.1, 0.2, 640, "bois2")
    # une proue entière qui sort du sable, avec sa figure (un poisson sculpté)
    px, py = 3.2, 2.8
    pz = D.z(px, py, 0.4)
    M = B.mat4((px, py, pz), (0, -0.7, 2.2))
    L.ajouter(B.cyl(0.9, 0.3, 2.6, 10), "bois2", M @ B.mat4((0, 0, 0), (0, 0, 0), (0.6, 1, 1)))
    L.ajouter(B.tube([(0, 0, 2.5), (0, 0, 3.4), (0.2, 0, 3.9)], [0.12, 0.09, 0.06], 6), "bois_fonce", M)
    L.ajouter(B.sphere(0.35, 12, 8), "or", M @ B.mat4((0.35, 0, 2.3), (0, 0, 0), (1.4, 0.6, 0.8)))
    L.ajouter(B.cyl(0.25, 0.0, 0.4, 6), "or", M @ B.mat4((-0.1, 0, 2.3), (0, -math.pi / 2, 0), (1, 0.4, 1)))
    # des tombes de fortune : des rames en croix, des planches plantées, un chapeau posé
    for k in range(8):
        p = R.point(rnd, 0.1, 0.75)
        if not p:
            continue
        z = D.z(*p, 0.1)
        rot = rnd.uniform(-0.2, 0.2)
        L.ajouter(B.boite(0.08, 0.08, 0.9), "bois", B.mat4((p[0], p[1], z), (rot, rnd.uniform(-0.15, 0.15), 0)))
        L.ajouter(B.boite(0.5, 0.07, 0.07), "bois", B.mat4((p[0], p[1], z + 0.6), (rot, 0, rnd.uniform(-0.2, 0.2))))
        if k % 4 == 0:
            L.ajouter(B.tore(0.16, 0.05, 12, 4), "noir", B.mat4((p[0], p[1], z + 0.95)))
            L.ajouter(B.cyl(0.12, 0.1, 0.14, 10), "noir", B.mat4((p[0], p[1], z + 0.96)))
        if k % 3 == 0:  # des crânes (inventés : ronds, des trous pour les yeux)
            q = (p[0] + 0.3, p[1] - 0.2, D.z(p[0] + 0.3, p[1] - 0.2, 0.0))
            L.ajouter(B.sphere(0.13, 10, 8), "os", B.mat4((q[0], q[1], q[2] + 0.1)))
            for s in (-1, 1):
                L.ajouter(B.sphere(0.04, 6, 4), "noir", B.mat4((q[0] + 0.1, q[1] + s * 0.05, q[2] + 0.12)))
    # les lanternes vertes plantées sur des piquets, et des feux follets au-dessus de l'eau
    for k in range(9):
        p = R.point(rnd, 0.2, 0.85)
        if not p:
            continue
        z = D.z(*p, 0.05)
        L.ajouter(B.cyl(0.03, 0.03, 1.2, 5), "bois_fonce", B.mat4((p[0], p[1], z)))
        L.ajouter(B.tube([(p[0], p[1], z + 1.2), (p[0] + 0.25, p[1], z + 1.25)], 0.02, 4), "bois_fonce")
        L.ajouter(B.cyl(0.1, 0.1, 0.05, 6), "fer", B.mat4((p[0] + 0.25, p[1], z + 0.92)))
        Sp.ajouter(B.cyl(0.09, 0.09, 0.2, 6), "spectre", B.mat4((p[0] + 0.25, p[1], z + 0.97)))
        L.ajouter(B.cyl(0.11, 0.0, 0.1, 6), "fer", B.mat4((p[0] + 0.25, p[1], z + 1.17)))
    for k in range(10):
        a = rnd.uniform(0, 6.28)
        d = R.bord(a) * rnd.uniform(0.95, 1.25)
        Sp.ajouter(B.sphere(rnd.uniform(0.08, 0.14), 8, 6), "spectre", B.mat4((math.cos(a) * d, math.sin(a) * d, rnd.uniform(0.4, 1.6))))
    # des ancres, des chaînes, des canons rouillés, des tonneaux
    for k, (x, y, rot) in enumerate(((-0.6, -1.2, 0.5), (1.4, 1.0, 2.0))):
        z = D.z(x, y, 0.15)
        L.ajouter(B.tube([(x, y, z), (x + 0.2, y + 0.1, z + 1.2)], 0.07, 6), "fer")
        L.ajouter(B.tube(B.courbe((x - 0.45, y, z + 0.05), (x + 0.5, y + 0.2, z), (x, y, z - 0.45), 8), 0.07, 6), "fer")
        L.ajouter(B.tore(0.16, 0.04, 12, 4), "fer", B.mat4((x + 0.22, y + 0.11, z + 1.3), (math.pi / 2, 0, rot)))
        for j in range(10):
            q = (x + 0.25 + j * 0.2 * math.cos(rot), y + 0.1 + j * 0.2 * math.sin(rot), 0)
            L.ajouter(B.tore(0.08, 0.02, 8, 3), "fer", B.mat4((q[0], q[1], D.z(q[0], q[1], 0.0) + 0.04), ((j % 2) * math.pi / 2, 0, rot)))
    for k in range(4):
        p = R.point(rnd, 0.3, 0.8)
        if p:
            canon(L, B.mat4((p[0], p[1], D.z(*p, 0.2)), (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.2, 0.2), rnd.uniform(0, 6.28))), 0.9)
    for k in range(8):
        p = R.point(rnd, 0.2, 0.85)
        if p:
            IL.tonneau(L, B.mat4((p[0], p[1], D.z(*p, 0.1)), (rnd.choice((0, math.pi / 2)), 0, rnd.uniform(0, 3))))
    IL.rochers_cote(D, R, 24, 257, ("pierre_fonce", "roche_noire", "gris"), 0.25, 0.7, 0.85, 1.05)
    D.repere("fumee", "fumee", (-2.4, 1.4, 1.2))
    D.anim("feux", Sp, "clignote", lent=1)
    return D.finir(), []  # pas de chaleur ici : la lueur verte est dans la matière


# ---------- L'Île-Horloge ----------
def ile_horloge(id_, coll):
    R = IL.Relief(6.6, 263, plage=0.78, anneaux=30, secteurs=96)

    def h(x, y, t):
        return 0.3 + IL.lisse((1 - t / R.plage) * 3.6) * (2.3 + IL.fbm(x, y, 0.4, 2, 1) * 0.2)

    o, v, f = R.construire(f"{id_}_terrain", coll, h, IL.peindre(0xeed9a6, 0xc9a86a, 0xb08a52, 0x9a6a3a, 2.6, graine=263, raide=0.75))
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(263)
    L = D.L
    chauds = []
    # les grands engrenages plantés dans la falaise : ils tournent (deux par deux, en sens contraires)
    roues = [((-3.6, -3.0, 1.4), 1.6, 0.6, 0.3), ((-1.7, -4.2, 1.0), 1.0, -0.96, 0.4), ((3.9, -2.4, 1.6), 1.9, 0.45, -0.6), ((4.7, 0.6, 1.2), 1.2, -0.72, -1.3), ((-4.6, 1.8, 1.5), 1.4, 0.5, 1.9)]
    for k, (c, r, v_, rot) in enumerate(roues):
        G = B.Lot()
        engrenage(G, B.mat4(c, (0, 0, rot)), r, 0.32, int(r * 12), "laiton" if k % 2 == 0 else "cuivre")
        D.anim(f"roue{k}", G, "tourne", origine=c, axe=[math.sin(rot) * -1, math.cos(rot), 0], vitesse=v_)
    # la tour de l'horloge : pierre, cadran crème, chiffres, aiguilles qui tournent, cloche
    tx, ty = 0.4, 0.6
    tz = D.z(tx, ty, 0.1)
    L.ajouter(B.boite(1.6, 1.6, 4.2), "pierre", B.mat4((tx, ty, tz)))
    for k in range(7):
        L.ajouter(B.boite(1.66, 1.66, 0.08), "pierre_fonce", B.mat4((tx, ty, tz + 0.5 + k * 0.6)))
    L.ajouter(B.boite(1.9, 1.9, 0.25), "pierre_fonce", B.mat4((tx, ty, tz + 4.2)))
    L.ajouter(B.prisme(2.0, 2.0, 1.4), "cuivre", B.mat4((tx, ty, tz + 4.45)))
    L.ajouter(B.cyl(0.06, 0.0, 0.9, 6), "laiton", B.mat4((tx, ty, tz + 5.8)))
    centre = Vector((tx, ty - 0.82, tz + 3.2))
    L.ajouter(B.cyl(0.66, 0.66, 0.08, 32), "creme", B.mat4(centre, (math.pi / 2, 0, 0)))
    L.ajouter(B.tore(0.68, 0.06, 32, 6), "laiton", B.mat4(centre, (math.pi / 2, 0, 0)))
    for k in range(12):
        a = k * math.pi / 6
        L.ajouter(B.boite(0.05, 0.03, 0.14 if k % 3 else 0.2), "noir", B.mat4(centre + Vector((math.cos(a) * 0.46, -0.1, math.sin(a) * 0.46)), (0, -a + math.pi / 2, 0)))
    for nom, lg, larg, vit in (("minutes", 0.5, 0.04, 0.8), ("heures", 0.33, 0.06, 0.07)):
        G = B.Lot()
        G.ajouter(B.boite(larg, 0.03, lg), "noir", B.mat4(centre + Vector((0, -0.13 if nom == "minutes" else -0.11, 0))))
        G.ajouter(B.cyl(0.06, 0.06, 0.08, 10), "laiton", B.mat4(centre + Vector((0, -0.08, 0)), (math.pi / 2, 0, 0)))
        D.anim(nom, G, "tourne", origine=tuple(centre), axe=[0, 1, 0], vitesse=vit)
    # la cloche qui se balance sous le toit
    G = B.Lot()
    bc = Vector((tx, ty, tz + 4.35))
    G.ajouter(B.cyl(0.4, 0.18, 0.5, 14), "laiton", B.mat4(bc + Vector((0, 0, -0.5))))
    G.ajouter(B.sphere(0.07, 8, 6), "fer", B.mat4(bc + Vector((0, 0, -0.55))))
    D.anim("cloche", G, "balance", origine=tuple(bc), axe=[1, 0, 0], ampl=0.25, vitesse=1.6)
    # le balancier géant, contre la falaise
    G = B.Lot()
    pb = Vector((-2.6, 3.0, 3.6))
    G.ajouter(B.tube([pb, pb + Vector((0, 0, -2.4))], 0.06, 6), "laiton")
    G.ajouter(B.cyl(0.45, 0.45, 0.12, 20), "laiton", B.mat4(pb + Vector((0, 0, -2.6)), (math.pi / 2, 0, 0)))
    D.anim("balancier", G, "balance", origine=tuple(pb), axe=[1, 0, 0], ampl=0.35, vitesse=1.2)
    L.ajouter(B.boite(0.3, 0.3, 0.3), "cuivre", B.mat4(pb + Vector((0, 0, -0.1))))
    # des tuyaux de cuivre qui courent, des vannes, des cheminées qui fument
    for k in range(5):
        a = k * 1.25 + 0.4
        p0 = Vector((tx + math.cos(a) * 1.0, ty + math.sin(a) * 1.0, 0))
        p1 = Vector((tx + math.cos(a) * 4.0, ty + math.sin(a) * 4.0, 0))
        pts = []
        for j in range(8):
            q = p0 + (p1 - p0) * (j / 7)
            q.z = D.z(q.x, q.y, -0.12)
            pts.append(q)
        L.ajouter(B.tube(pts, 0.1, 8), "cuivre")
        mid = pts[4]
        L.ajouter(B.tore(0.18, 0.04, 14, 4), "laiton", B.mat4(mid + Vector((0, 0, 0.2))))
        L.ajouter(B.cyl(0.04, 0.04, 0.2, 6), "laiton", B.mat4(mid))
    for k, (x, y) in enumerate(((2.4, 2.0), (-1.4, -1.6), (2.8, -0.8))):
        z = D.z(x, y, 0.05)
        L.ajouter(B.cyl(0.2, 0.16, 1.3, 10), "fer", B.mat4((x, y, z)))
        L.ajouter(B.tore(0.2, 0.04, 12, 4), "laiton", B.mat4((x, y, z + 1.25)))
        D.repere(f"vapeur{k}", "fumee", (x, y, z + 1.4))
    # des petites maisons aux fenêtres rondes, des rouages tombés par terre
    for k, (x, y, rot) in enumerate(((-1.8, 1.0, 0.4), (2.2, -2.8, -0.6), (-0.6, -3.0, 0.2))):
        IL.maison(D, x, y, rot, 1.1, 0.95, 0.9, "creme", "cuivre", True)
        z = D.z(x, y, 0.2)
        L.ajouter(B.tore(0.16, 0.04, 14, 4), "laiton", B.mat4((x + math.cos(rot - math.pi / 2) * 0.5, y + math.sin(rot - math.pi / 2) * 0.5, z + 0.55), (math.pi / 2, 0, rot)))
        L.ajouter(B.cyl(0.13, 0.13, 0.02, 12), "lumiere", B.mat4((x + math.cos(rot - math.pi / 2) * 0.49, y + math.sin(rot - math.pi / 2) * 0.49, z + 0.55), (math.pi / 2, 0, rot)))
        chauds.append(Vector((x, y, z + 0.6)))
    for k in range(10):
        p = R.point(rnd, 0.2, 0.75)
        if p:
            engrenage(L, B.mat4((p[0], p[1], D.z(*p, 0.0) + 0.05), (math.pi / 2, 0, rnd.uniform(0, 6))), rnd.uniform(0.2, 0.4), 0.08, rnd.randint(8, 12), rnd.choice(("laiton", "cuivre", "fer")), 4)
    IL.rochers_cote(D, R, 22, 267, ("gres", "pierre"), 0.25, 0.7, 0.8, 1.04)
    return D.finir(), chauds


# ---------- L'Île des Géants Endormis ----------
def ile_geants(id_, coll):
    R = IL.Relief(8.8, 271, plage=0.86, anneaux=48, secteurs=140)
    # le géant, couché sur le dos (le haut de la tête vers -X, les pieds vers +X) : chaque partie du corps est une colline
    corps = [(-5.3, 0.0, 2.6, 1.3), (-3.9, 0.0, 0.9, 0.35),  # tête, cou
             (-2.5, 0.0, 2.7, 2.0), (0.4, 0.0, 3.4, 2.6), (-0.6, 2.0, 1.4, 0.45), (-0.6, -2.0, 1.4, 0.45),  # torse, ventre, mains
             (3.2, 0.95, 2.0, 0.9), (3.2, -0.95, 2.0, 0.9), (5.7, 1.0, 1.8, 0.3), (5.7, -1.0, 1.8, 0.3)]  # genoux, pieds
    sur_corps = lambda x, y: sum(IL.bosse(x, y, cx, cy, hh, l) for cx, cy, hh, l in corps) > 0.6

    def h(x, y, t):
        base = 0.3 + IL.lisse((1 - t / R.plage) * 2.2) * 0.6
        return base + sum(IL.bosse(x, y, cx, cy, hh, l) for cx, cy, hh, l in corps) + IL.fbm(x, y, 0.8, 2, 4) * 0.08

    o, v, f = R.construire(f"{id_}_terrain", coll, h, IL.peindre(0xf0dcae, 0x93c26a, 0x76a650, 0x9a8f7a, 3.4, graine=271, raide=0.7))
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(271)
    L = D.L
    chauds = []
    # le visage (vers le ciel) : deux paupières fermées, des sourcils de buissons, un nez de roche, une bouche qui ronfle
    for s in (-1, 1):
        x, y = -5.75, s * 0.5
        z = D.z(x, y, 0.0)
        L.ajouter(B.tube(B.courbe((x, y - 0.32 * s, D.z(x, y - 0.32 * s, 0.0)), (x, y + 0.3 * s, D.z(x, y + 0.3 * s, 0.0)), (x + 0.18, y, z + 0.12), 7), 0.075, 6), "roche_noire")
        for j in range(4):
            q = (x - 0.32, y - 0.3 * s + j * 0.2 * s)
            L.ajouter(B.caillou(0.13, 700 + j + (s > 0) * 5, 0.25, 1), "vert_fonce", B.mat4((q[0], q[1], D.z(*q, 0.02))))
    L.ajouter(B.caillou(0.42, 701, 0.15, 2, (1.1, 0.75, 0.9)), "pierre", B.mat4((-5.3, 0, D.z(-5.3, 0, 0.1))))
    zb = D.z(-4.85, 0, 0.0)
    L.ajouter(B.tube(B.courbe((-4.85, -0.35, D.z(-4.85, -0.35, 0.0)), (-4.85, 0.35, D.z(-4.85, 0.35, 0.0)), (-4.75, 0, zb + 0.05), 7), 0.07, 6), "roche_noire")
    D.repere("souffle", "fumee", (-4.85, 0.0, zb + 0.4))
    # les « Z » qui montent du géant qui ronfle
    for k in range(3):
        G = B.Lot()
        c = Vector((-4.6 + k * 0.5, 0.4 + k * 0.35, zb + 1.2 + k * 0.9))
        e = 0.35 + k * 0.12
        M = B.mat4(c, (math.pi / 2, 0, 0.5))
        G.ajouter(B.boite(e, 0.08, 0.1), "blanc", M @ B.mat4((0, 0, e * 0.5)))
        G.ajouter(B.boite(e, 0.08, 0.1), "blanc", M @ B.mat4((0, 0, -e * 0.5)))
        G.ajouter(B.boite(e * 1.35, 0.08, 0.1), "blanc", M @ B.mat4((0, 0, -0.05), (0, -0.78, 0)))
        D.anim(f"z{k}", G, "flotte", origine=tuple(c), ampl=0.25, phase=k * 1.1)
    # la chevelure : une forêt autour de la tête
    for k in range(14):
        a = math.pi / 2 + k * math.pi / 13
        x, y = -5.3 + math.cos(a) * 2.0, math.sin(a) * 2.0
        IL.arbre(D, x - 0.5, y, rnd.uniform(1.0, 1.5), rnd.uniform(0.6, 0.85), ("vert_fonce", "feuille"), 720 + k)
    # un petit village sur le ventre, un chemin, des moutons (des boules de laine)
    for k, (x, y, rot, toit) in enumerate(((0.0, 0.6, 0.2, "rouge"), (0.8, -0.5, -0.4, "turquoise"), (-0.6, -0.7, 0.9, "orange"))):
        IL.maison(D, x, y, rot, 0.9, 0.8, 0.7, "creme", toit, k == 0)
        chauds.append(Vector((x, y, D.z(x, y, 0.0) + 0.5)))
    IL.trace_sol(D, [(5.0, -2.6, 0), (3.6, -2.2, 0), (1.8, -1.4, 0), (0.4, -0.2, 0), (-1.4, 0.2, 0), (-3.0, 0.4, 0)], 0.35, "sable", 0.04, 0.4)
    for k in range(9):
        p = R.point(rnd, 0.2, 0.8)
        if p:
            z = D.z(*p, 0.0)
            L.ajouter(B.caillou(0.2, 730 + k, 0.4, 1), "blanc", B.mat4((p[0], p[1], z + 0.18), (0, 0, 0), (1.2, 0.9, 0.85)))
            L.ajouter(B.sphere(0.08, 8, 6), "noir", B.mat4((p[0] + 0.22, p[1], z + 0.2)))
    # la main d'un autre géant qui sort de l'eau, à côté
    hx, hy = 1.5, 8.2
    for k in range(4):
        a = -0.6 + k * 0.4
        b = Vector((hx + math.cos(a) * 0.9, hy + math.sin(a) * 0.4, -0.3))
        L.ajouter(B.tube([b, b + Vector((0.1, 0.05, 1.2 + k % 2 * 0.3)), b + Vector((0.35, 0.1, 1.9 + k % 2 * 0.3))], [0.3, 0.27, 0.22], 9), "pierre")
    L.ajouter(B.tube([(hx - 1.0, hy, -0.3), (hx - 1.1, hy - 0.2, 0.7), (hx - 0.7, hy - 0.3, 1.2)], [0.32, 0.28, 0.24], 9), "pierre")
    L.ajouter(B.caillou(1.2, 740, 0.25, 2, (1.2, 0.8, 0.6)), "pierre", B.mat4((hx, hy, -0.1)))
    for k in range(26):
        p = R.point(rnd, 0.1, 0.8)
        if p and not sur_corps(*p):
            IL.arbre(D, p[0], p[1], rnd.uniform(0.6, 1.1), rnd.uniform(0.4, 0.6), ("feuille", "vert_clair"), 760 + k)
    IL.fleurs(D, R, 40, 277, ("rose", "jaune", "blanc"), 0.8)
    IL.rochers_cote(D, R, 28, 279, ("pierre", "pierre_fonce"), 0.25, 0.7, 0.86, 1.04)
    return D.finir(), chauds


# ---------- La Forteresse des Corsaires ----------
def ile_forteresse(id_, coll):
    R = IL.Relief(7.2, 281, plage=0.8, anneaux=30, secteurs=96)

    def h(x, y, t):
        v = 0.3 + IL.lisse((1 - t / R.plage) * 3.0) * (2.4 + IL.fbm(x, y, 0.5, 3, 4) * 0.4)
        return min(v, 2.3 + IL.fbm(x, y, 1.0, 2, 5) * 0.06)  # un plateau pour le fort

    o, v, f = R.construire(f"{id_}_terrain", coll, h, IL.peindre(0xe8d6a6, 0x9fb86a, 0x8a9c5a, 0x8a7f6c, 2.4, graine=281, raide=0.78))
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(281)
    L = D.L
    chauds = []
    zf = 2.3
    # le mur d'enceinte (huit pans) avec ses créneaux, quatre tours rondes aux toits rouges
    n, rr = 8, 3.0
    coins = [Vector((math.cos(k * 2 * math.pi / n) * rr, math.sin(k * 2 * math.pi / n) * rr, zf - 0.05)) for k in range(n)]
    for k in range(n):
        a, b = coins[k], coins[(k + 1) % n]
        d = b - a
        rot = math.atan2(d.y, d.x)
        c = (a + b) / 2
        if k == 6:  # la porte
            for s in (-1, 1):
                q = c + d.normalized() * s * 0.75
                L.ajouter(B.boite(d.length * 0.3, 0.45, 1.5), "pierre", B.mat4(q, (0, 0, rot)))
            L.ajouter(B.boite(0.9, 0.45, 0.4), "pierre", B.mat4(c + Vector((0, 0, 1.1)), (0, 0, rot)))
            for j in range(5):
                L.ajouter(B.boite(0.04, 0.05, 1.1), "fer", B.mat4(c + d.normalized() * (-0.36 + j * 0.18) + Vector((0, 0, 0.0)), (0, 0, rot)))
            continue
        L.ajouter(B.boite(d.length, 0.45, 1.5), "pierre", B.mat4(c, (0, 0, rot)))
        L.ajouter(B.boite(d.length, 0.5, 0.08), "pierre_fonce", B.mat4(c + Vector((0, 0, 1.5)), (0, 0, rot)))
        for j in range(int(d.length / 0.45)):
            q = a + d.normalized() * (0.25 + j * 0.45)
            if j % 2 == 0:
                L.ajouter(B.boite(0.28, 0.45, 0.32), "pierre", B.mat4(q + Vector((0, 0, 1.58)), (0, 0, rot)))
        # un canon par pan, qui vise le large
        nrm = Vector((math.cos(rot - math.pi / 2), math.sin(rot - math.pi / 2), 0))
        if nrm.dot(c) < 0:
            nrm = -nrm
        canon(L, B.mat4(c + nrm * 0.05 + Vector((0, 0, 1.58)), (0, 0, math.atan2(nrm.y, nrm.x))), 0.75)
    for k in (1, 3, 5, 7):
        q = coins[k]
        L.ajouter(B.cyl(0.7, 0.75, 2.3, 16), "pierre", B.mat4(q))
        L.ajouter(B.cyl(0.8, 0.8, 0.12, 16), "pierre_fonce", B.mat4(q + Vector((0, 0, 2.3))))
        L.ajouter(B.cyl(0.85, 0.0, 1.0, 16), "rouge_fonce", B.mat4(q + Vector((0, 0, 2.42))))
        L.ajouter(B.boite(0.12, 0.05, 0.3), "noir", B.mat4(q + Vector((q.x * 0.24, q.y * 0.24, 1.4)) * 1.0, (0, 0, math.atan2(q.y, q.x) + math.pi / 2)))
    # le donjon au milieu, le mât et le drapeau des corsaires (rouge, pas celui d'une commu)
    L.ajouter(B.boite(1.8, 1.8, 2.6), "pierre", B.mat4((0, 0, zf - 0.05)))
    L.ajouter(B.boite(2.0, 2.0, 0.14), "pierre_fonce", B.mat4((0, 0, zf + 2.55)))
    for k in range(8):
        a = k * math.pi / 4
        L.ajouter(B.boite(0.3, 0.3, 0.3), "pierre", B.mat4((math.cos(a) * 0.85, math.sin(a) * 0.85, zf + 2.69)))
    for s in (-1, 1):
        L.ajouter(B.boite(0.35, 0.05, 0.5), "lumiere", B.mat4((s * 0.45, -0.91, zf + 1.2)))
        chauds.append(Vector((s * 0.45, -1.0, zf + 1.4)))
    L.ajouter(B.cyl(0.06, 0.05, 2.6, 6), "bois_fonce", B.mat4((0, 0, zf + 2.6)))
    fanion(D, "drapeau", (0.05, 0, zf + 5.1), "rouge", (1.5, 0.9))
    L.ajouter(B.sphere(0.09, 8, 6), "or", B.mat4((0, 0, zf + 5.25)))
    # la cour : des boulets en pyramide, des tonneaux de poudre, des caisses, des torches
    for k in range(4):
        for j in range(4 - k):
            for i in range(4 - k):
                L.ajouter(B.sphere(0.12, 8, 6), "noir", B.mat4((1.2 + i * 0.24 + k * 0.12, -1.6 + j * 0.24 + k * 0.12, zf + 0.12 + k * 0.2)))
    for k in range(6):
        IL.tonneau(L, B.mat4((-1.6 + (k % 3) * 0.45, 1.3 + (k // 3) * 0.45, zf)))
    for k in range(3):
        IL.caisse(L, B.mat4((1.6, 1.2 + k * 0.5, zf), (0, 0, 0.1 * k)))
    for q in coins[::2]:
        x, y = q.x * 0.82, q.y * 0.82
        L.ajouter(B.cyl(0.04, 0.04, 0.9, 5), "bois_fonce", B.mat4((x, y, zf)))
        L.ajouter(B.cyl(0.09, 0.0, 0.25, 6), "feu", B.mat4((x, y, zf + 0.9)))
        chauds.append(Vector((x, y, zf + 1.0)))
    # l'escalier vers le port, le quai, un petit navire corsaire à l'ancre
    a = math.radians(250)
    for k in range(12):
        t = 0.36 + k * 0.042
        x, y = math.cos(a) * R.bord(a) * t, math.sin(a) * R.bord(a) * t
        L.ajouter(B.boite(0.9, 0.42, 0.2), "pierre", B.mat4((x, y, D.z(x, y, 0.1)), (0, 0, a + math.pi / 2)))
    p0 = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 0.86
    p1 = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 1.35
    IL.ponton(D, p0, p1, 1.1, 0.55, ("bois2", "planche"))
    G = B.Lot()
    M = B.mat4(p1 + Vector((1.2, -0.6, 0.0)), (0, 0, a + math.pi / 2))
    IL.barque(G, M, "bois_fonce", "rouge", 1.6)
    G.ajouter(B.cyl(0.05, 0.04, 2.2, 6), "bois", M @ B.mat4((0.1, 0, 0.1)))
    G.ajouter(B.boite(0.04, 1.0, 1.1), "creme", M @ B.mat4((0.15, 0, 0.9), (0, 0, 0.2)))
    D.anim("sloop", G, "flotte", origine=tuple(p1 + Vector((1.2, -0.6, 0.0))), ampl=0.08)
    IL.rochers_cote(D, R, 26, 287, ("pierre", "pierre_fonce", "roche_noire"), 0.3, 0.8, 0.82, 1.04)
    return D.finir(), chauds


ILES = {"marais": ile_marais, "cristal": ile_cristal, "archipel": ile_archipel, "cimetiere": ile_cimetiere, "horloge": ile_horloge, "geants": ile_geants, "forteresse": ile_forteresse}
