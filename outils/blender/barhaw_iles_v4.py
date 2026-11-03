# Les îles V4 (la démo V4) : plus de détails, plus d'ambiance, la même place sur la carte que les îles V3.
# Première île : le Phare. Un phare blanc en ruine sur une île plate de sable blanc, un lagon turquoise, des maisons
# roses délavées à moitié écroulées, des roches calcaires, une épave de barque, un vieux ponton. Dessin original.
# Les ombres des recoins (AO) et l'usure (salissures en bas des murs, taches) sont précalculées dans les couleurs.
# Usage, dans Blender :  import barhaw_iles_v4 as I; I.construire("phare")
import math, random, bmesh, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_iles as IL


def ile_phare(id_, coll):
    R = IL.Relief(5.7, 131, plage=0.8, anneaux=30, secteurs=96)

    def h(x, y, t):
        # une île basse : une dalle calcaire, un petit tertre sous le phare
        return 0.22 + IL.lisse((1 - t / R.plage) * 3.2) * (0.75 + IL.fbm(x, y, 0.55, 3, 21) * 0.18) + IL.bosse(x, y, 0.4, 0.5, 0.55, 3.0)

    def couleur(x, y, z, t, n):
        sable, lagon = 0xf3ecdf, 0x3fd8d0
        if z < 0.02:
            return IL.mel(sable, lagon, min(1.0, -z / 0.7))
        if z < 0.42:
            return B.rgb(sable)
        v = IL.fbm(x, y, 0.8, 3, 7)
        col = IL.mel(0xe8e0cf, 0xc9c48c, max(0.0, v) * 1.4)  # du sable, quelques touffes d'herbe sèche
        if n.z < 0.82:
            col = IL.mel(col, 0xb9b0a0, min(1.0, (0.82 - n.z) / 0.25))  # la roche calcaire
        return col
    o, v, f = R.construire(f"{id_}_terrain", coll, h, couleur)
    sol = IL.Sol()
    sol.ajouter(v, f)
    D = IL.Deco(id_, coll, sol, R)
    rnd = random.Random(131)
    L = D.L

    # ---- le phare : socle à arcades en ruine, tour blanche fuselée, galerie de fer, lanterne ----
    px, py = 0.4, 0.5
    z0 = D.z(px, py, 0.1)
    L.ajouter(B.cyl(1.9, 2.0, 0.35, 28), "pierre", B.mat4((px, py, z0)))
    L.ajouter(B.cyl(1.75, 1.75, 0.12, 28), "blanc", B.mat4((px, py, z0 + 0.35)))
    # la galerie basse à arcades (des piliers, des arcs, certains tombés)
    for k in range(14):
        a = k * 2 * math.pi / 14
        q = Vector((px + math.cos(a) * 1.62, py + math.sin(a) * 1.62, z0 + 0.47))
        tombe = k in (3, 4, 9)
        hp = 0.35 if tombe else 0.95
        L.ajouter(B.boite(0.2, 0.2, hp), "blanc", B.mat4(q, (0, 0, a)))
        if not tombe:
            b = k + 1
            a2 = b * 2 * math.pi / 14
            q2 = Vector((px + math.cos(a2) * 1.62, py + math.sin(a2) * 1.62, z0 + 0.47))
            if b % 14 not in (3, 4, 9):
                L.ajouter(B.tube(B.courbe(q + Vector((0, 0, 0.95)), q2 + Vector((0, 0, 0.95)), (q + q2) / 2 + Vector((0, 0, 1.25)), 7), 0.07, 6), "blanc")
        else:
            for j in range(3):  # les pierres tombées
                c = q + Vector((math.cos(a) * (0.4 + j * 0.25), math.sin(a) * (0.4 + j * 0.25), 0))
                L.ajouter(B.caillou(0.13 + rnd.random() * 0.08, k * 7 + j, 0.3, 1, (1.2, 0.9, 0.7)), "blanc", B.mat4((c.x, c.y, D.z(c.x, c.y, 0.05))))
    # la tour : des anneaux blancs un peu fuselés, des fenêtres sombres, des fissures
    zt = z0 + 0.47
    nb, hauteur = 9, 0.95
    for k in range(nb):
        r1 = 1.05 - k * 0.045
        L.ajouter(B.cyl(r1, r1 - 0.045, hauteur, 26), "blanc", B.mat4((px, py, zt + k * hauteur)))
        if k % 2 == 1:
            a = 0.6 + k * 1.1
            r = r1 - 0.02
            L.ajouter(B.boite(0.05, 0.22, 0.34), "noir", B.mat4((px + math.cos(a) * r, py + math.sin(a) * r, zt + k * hauteur + 0.3), (0, 0, a)))
            L.ajouter(B.boite(0.06, 0.28, 0.05), "pierre", B.mat4((px + math.cos(a) * (r + 0.01), py + math.sin(a) * (r + 0.01), zt + k * hauteur + 0.27), (0, 0, a)))
    # une porte et quelques fissures
    L.ajouter(B.boite(0.08, 0.5, 0.85), "bois_fonce", B.mat4((px + 1.03, py, zt), (0, 0, 0)))
    for k in range(5):
        a = 2.2 + k * 0.9
        pts = [Vector((px + math.cos(a + j * 0.05) * (1.06 - (2 + k + j * 0.4) * 0.045), py + math.sin(a + j * 0.05) * (1.06 - (2 + k + j * 0.4) * 0.045), zt + (2 + k) * hauteur * 0.7 + j * 0.18)) for j in range(4)]
        L.ajouter(B.tube(pts, 0.012, 4, caps=False), "pierre_fonce")
    zh = zt + nb * hauteur
    # la galerie de fer, rouillée, avec sa rambarde
    L.ajouter(B.cyl(0.95, 0.95, 0.12, 26), "fer", B.mat4((px, py, zh)))
    for k in range(10):
        a = k * 2 * math.pi / 10
        L.ajouter(B.tube([(px + math.cos(a) * 0.62, py + math.sin(a) * 0.62, zh - 0.5), (px + math.cos(a) * 0.92, py + math.sin(a) * 0.92, zh)], 0.03, 5), "fer")
    for k in range(20):
        a = k * 2 * math.pi / 20
        L.ajouter(B.cyl(0.02, 0.02, 0.42, 4), "fer", B.mat4((px + math.cos(a) * 0.9, py + math.sin(a) * 0.9, zh + 0.12)))
    L.ajouter(B.tore(0.9, 0.03, 32, 4), "fer", B.mat4((px, py, zh + 0.54)))
    # la lanterne (elle clignote ; le faisceau tourne : le site s'en charge)
    lum = B.Lot()
    lum.ajouter(B.cyl(0.5, 0.5, 0.75, 16), "lumiere", B.mat4((0, 0, 0)))
    D.anim("lanterne", lum, "clignote", lent=1).location = (px, py, zh + 0.12)
    for k in range(8):
        a = k * math.pi / 4
        L.ajouter(B.cyl(0.035, 0.035, 0.78, 4), "fer", B.mat4((px + math.cos(a) * 0.52, py + math.sin(a) * 0.52, zh + 0.12)))
    L.ajouter(B.cyl(0.6, 0.12, 0.45, 16), "fer", B.mat4((px, py, zh + 0.9)))
    L.ajouter(B.cyl(0.04, 0.0, 0.5, 5), "fer", B.mat4((px, py, zh + 1.35)))
    L.ajouter(B.sphere(0.08, 8, 6), "or", B.mat4((px, py, zh + 1.85)))
    D.repere("faisceau", "faisceau", (px, py, zh + 0.5))

    # ---- les maisons roses délavées : deux debout, une à moitié écroulée, une sans toit ----
    def ruine(x, y, rot, w, d, h, toit=True, ecroulee=False):
        z = min(D.z(x + dx, y + dy, 0.2) for dx in (-w / 2, w / 2) for dy in (-d / 2, d / 2))
        W = B.mat4((x, y, z), (0, 0, rot))
        if ecroulee:
            # des pans de mur de hauteurs différentes, des poutres à nu, des gravats
            for k in range(5):
                hh = h * (0.4 + rnd.random() * 0.6)
                L.ajouter(B.boite(w / 5 + 0.01, 0.16, hh), "rose_pale", W @ B.mat4((-w / 2 + (k + 0.5) * w / 5, -d / 2, 0)))
            for s in (-1, 1):
                L.ajouter(B.boite(0.16, d, h * (0.55 if s < 0 else 0.9)), "rose_pale", W @ B.mat4((s * w / 2, 0, 0)))
            for k in range(3):
                L.ajouter(B.tube([(-w / 2 + 0.3 + k * 0.5, -d / 2, h * 0.85), (-w / 2 + 0.1 + k * 0.5, d / 2, h * 0.3)], 0.05, 5), "bois_fonce", W)
            for k in range(9):
                L.ajouter(B.caillou(0.1 + rnd.random() * 0.1, k + 40, 0.35, 1), rnd.choice(("rose_pale", "pierre", "blanc")), W @ B.mat4(((rnd.random() - 0.5) * w * 1.2, -d / 2 - 0.3 - rnd.random() * 0.4, 0.05)))
        else:
            L.ajouter(B.boite(w, d, h), "rose_pale", W)
            L.ajouter(B.boite(w + 0.06, d + 0.06, 0.12), "blanc", W @ B.mat4((0, 0, h)))
            if toit:
                L.ajouter(B.prisme(w + 0.3, d + 0.3, h * 0.55), "rouge_fonce", W @ B.mat4((0, 0, h + 0.1)))
            # des fenêtres (volets de travers), une porte
            for s in (-1, 1):
                L.ajouter(B.boite(0.3, 0.06, 0.36), "noir", W @ B.mat4((s * w * 0.28, -d / 2 - 0.01, h * 0.45)))
                L.ajouter(B.boite(0.14, 0.05, 0.38), "turquoise", W @ B.mat4((s * w * 0.28 + s * 0.24, -d / 2 - 0.04, h * 0.44), (0, s * 0.15, s * 0.25)))
            L.ajouter(B.boite(0.42, 0.06, 0.7), "bois_fonce", W @ B.mat4((0, -d / 2 - 0.01, 0)))
            L.ajouter(B.boite(w + 0.04, d + 0.04, 0.16), "pierre", W @ B.mat4((0, 0, -0.06)))
    ruine(-2.4, -1.6, 0.35, 1.7, 1.3, 1.2)
    ruine(2.7, -1.9, -0.4, 1.4, 1.2, 1.05, toit=False)
    ruine(-2.6, 1.6, -0.25, 1.6, 1.2, 1.15, ecroulee=True)
    ruine(1.7, 2.6, 0.9, 1.1, 1.0, 0.9)
    # un muret écroulé entre les maisons
    for k in range(8):
        x, y = -1.4 + k * 0.38, -2.7 + math.sin(k * 0.8) * 0.12
        L.ajouter(B.boite(0.36, 0.22, 0.25 + rnd.random() * 0.3), "blanc", B.mat4((x, y, D.z(x, y, 0.05)), (0, 0, rnd.random() * 0.2)))

    # ---- la côte : des roches calcaires plates, des roches sombres, des algues échouées ----
    IL.rochers_cote(D, R, 26, 137, ("pierre", "pierre_fonce", "blanc"), 0.25, 0.75, 0.78, 1.04)
    for k in range(30):
        p = R.point(rnd, 0.72, 0.84)
        if p:
            L.ajouter(B.tube([(p[0], p[1], D.z(*p, 0.02)), (p[0] + rnd.uniform(-0.3, 0.3), p[1] + rnd.uniform(-0.3, 0.3), D.z(*p, 0.02) + 0.02)], 0.035, 4), "vert_fonce")
    # des coquillages et des étoiles de mer sur le sable
    for k in range(18):
        p = R.point(rnd, 0.6, 0.8)
        if p:
            if k % 3:
                L.ajouter(B.demi_sphere(0.06, 8, 3), rnd.choice(("creme", "corail", "rose_pale")), B.mat4((p[0], p[1], D.z(*p, 0.02))))
            else:
                L.ajouter(B.etoile(0.12, 0.05, 0.03, 5, 0.6), "orange", B.mat4((p[0], p[1], D.z(*p, 0.01))))

    # ---- l'épave : une barque échouée sur le flanc, des tonneaux éventrés ----
    eb = Vector((3.3, 1.1, 0.0))
    eb.z = D.z(eb.x, eb.y, 0.12)
    IL.barque(L, B.mat4(eb, (0.0, 0.45, 2.3)), "bois2", "turquoise", 0.9)
    for k, (dx, dy) in enumerate(((0.7, -0.5), (-0.6, 0.7))):
        x, y = eb.x + dx, eb.y + dy
        L.ajouter(B.tube([(0, 0, -0.25), (0, 0, 0), (0, 0, 0.25)], [0.16, 0.2, 0.16], 12), "planche", B.mat4((x, y, D.z(x, y, -0.12)), (math.pi / 2, 0, 0.4 + k)))
    # le vieux ponton (des planches qui manquent) et une bouée
    a = math.radians(205)
    q0 = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 0.82
    q1 = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 1.3
    d = (q1 - q0)
    n = Vector((-d.y, d.x, 0)).normalized()
    rot = math.atan2(d.y, d.x)
    for k in range(14):
        if k in (4, 9, 10):
            continue
        c = q0 + d * (k + 0.5) / 14
        L.ajouter(B.boite(d.length / 14 - 0.04, 1.0, 0.08), "planche" if k % 2 else "bois2", B.mat4((c.x, c.y, 0.42), (0, 0, rot + rnd.uniform(-0.05, 0.05))))
    for k in range(4):
        c = q0 + d * (k / 3)
        for s in (-1, 1):
            q = c + n * s * 0.5
            L.ajouter(B.cyl(0.08, 0.08, 1.9, 7), "bois_fonce", B.mat4((q.x, q.y, -1.4), (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), 0)))
    L.ajouter(B.tore(0.25, 0.08, 16, 6), "rouge", B.mat4((q1.x - n.x * 0.6, q1.y - n.y * 0.6, 0.62), (math.pi / 2, 0, rot)))
    # une ancre rouillée à moitié enterrée, deux palmiers penchés, des lanternes de fortune
    xa, ya = -0.9, -2.0
    za = D.z(xa, ya, 0.2)
    L.ajouter(B.tube([(xa, ya, za), (xa + 0.3, ya, za + 0.9)], 0.06, 6), "fer")
    L.ajouter(B.tube(B.courbe((xa - 0.35, ya, za + 0.05), (xa + 0.45, ya, za - 0.05), (xa, ya, za - 0.4), 8), 0.06, 6), "fer")
    IL.palmier(D, -1.0, 2.9, 3.0, 133)
    IL.palmier(D, 3.6, -0.6, 2.6, 134)
    for x, y in ((-0.9, -0.9), (2.0, 0.9)):
        z = D.z(x, y, 0.05)
        L.ajouter(B.cyl(0.04, 0.04, 1.3, 6), "bois_fonce", B.mat4((x, y, z), (0.08, 0, 0)))
        L.ajouter(B.cyl(0.1, 0.1, 0.22, 8), "lumiere", B.mat4((x, y + 0.1, z + 1.25)))
        L.ajouter(B.cyl(0.12, 0.0, 0.12, 8), "fer", B.mat4((x, y + 0.1, z + 1.47)))

    decor = D.finir()
    return decor, [Vector((px, py, zh + 0.5)), Vector((-0.9, -0.8, 1.6)), Vector((2.0, 1.0, 1.6))]


def patiner(o, lanternes, echantillons=48):
    """Les ombres des recoins (AO), le sale en bas des murs, des taches d'humidité, la chaleur des lanternes."""
    scene = bpy.context.scene
    me = o.data
    attr = me.color_attributes.get("Couleur") or me.color_attributes.new("Couleur", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = attr
    moteur = scene.render.engine
    ok = True
    try:
        scene.render.engine = "CYCLES"
        scene.cycles.samples = echantillons
        for x in bpy.context.selected_objects:
            x.select_set(False)
        o.hide_set(False)
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        scene.render.bake.target = "VERTEX_COLORS"
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        ok = str(e)
    finally:
        scene.render.engine = moteur
    for i, v in enumerate(me.vertices):
        c = attr.data[i].color
        # une patine douce : les grands volumes (la tour, les murs) restent clairs, seuls les recoins s'assombrissent
        ao = 0.78 + 0.22 * (max(0.0, min(1.0, c[0])) if ok is True else 1.0)
        z = v.co.z
        sale = 1.0 - 0.1 * max(0.0, 1 - z / 0.5)  # le bas des murs, éclaboussé
        tache = 1.0 - 0.07 * max(0.0, IL.fbm(v.co.x, v.co.y + z, 1.6, 2, 5))
        w = min(1.0, sum(max(0.0, 1 - (v.co - p).length / 1.6) ** 2 for p in lanternes))
        base = ao * sale * tache
        attr.data[i].color = (min(1.5, base * (1 + w * 0.5)), min(1.5, base * 0.98 * (1 + w * 0.2)), min(1.5, base * (1.04 - w * 0.15)), 1.0)
    me.update()
    return ok


def construire(id_="phare", rendu=True, exporter=True):
    coll = B.collection(f"ile_{id_}_v4")
    decor, lanternes = ile_phare(id_, coll)
    infos = {"patine": patiner(decor, lanternes)}
    B.nettoyer()
    infos["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")
    if exporter:
        infos["glb"] = B.exporter(coll.name, f"ile-{id_}-v4.glb")
    if rendu:
        infos["rendu"] = B.vitrine([coll.name], cam=(16, -27, 20), cible=(0, 0, 3.6), objectif=50, nom=f"ile-{id_}-v4", taille=(1000, 680))
        B.fin_vitrine()
    return infos
