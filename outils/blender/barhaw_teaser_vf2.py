# Le teaser de la VF 1.0, version 2 : les plans 3D en 1920 × 1080 à 30 images/s, chaque navire à ses couleurs.
#   a : Port Barhaw au coucher du soleil, la caméra s'approche du navire au mouillage (4,6 s)
#   b : la flotte part vers le soleil : Barhaw devant, Squirt.exe (violet et blanc, le calmar sur le mât et sur la grande
#       voile) côté caméra, Veyzo Family (or et rouge) au fond ; des petites pieuvres roses sautent du navire de Squirt.exe (6,2 s)
#   c : le navire de Barhaw file entre les nouvelles îles (4,5 s)
# Les voiles et drapeaux des commus : textures/voile_<commu>.png, voile_b_<commu>.png, drapeau_<commu>.png
# (faites à partir de img/flotte/<commu>.webp). Les pieuvres : un dessin original (tête ronde, deux yeux, six tentacules).
# Usage dans Blender :
#   import barhaw_teaser_vf2 as T2 ; T2.construire() ; T2.rendre("b", image_seule=60)   (une image d'essai)
#   for p in "abc": T2.rendre(p)      (les images dans rendus/teaser2/<plan>-NNNN.png)
#   T2.remettre()  quand c'est fini (les navires reprennent leurs matières communes)
import json, math, os, random, bmesh, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_accueil_vf as A
import barhaw_teaser_vf as T0

FPS = 30
PLANS = {"a": (0, 138), "b": (200, 385), "c": (400, 534)}
U, P, CAP, S = T0.U, T0.P, T0.CAP, T0.S
COMMUS = {
    "barhaw": (0xff5aae, 0x55ccff),
    "veyzo": (0xffc23d, 0xc8150f),
    "kikso": (0x6d2790, 0xffffff),
}
# b : (source, recul le long du cap, écart sur le côté) ; la caméra suit par l'arrière : le plus en recul est le plus proche
FLOTTE_B = {"barhaw": (0.0, 0.0), "kikso": (-10.0, -7.0), "veyzo": (-6.5, 7.5)}
LONG_B = 17.0
_avant = {}  # (objet, emplacement) -> matière d'origine


def _copie(nom, commu, couleur=None, image=None):
    base = B.materiau(nom)
    m = bpy.data.materials.get(f"{nom}_{commu}") or base.copy()
    m.name = f"{nom}_{commu}"
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if couleur is not None and bsdf:
        c = B.rgba(couleur)
        m.diffuse_color = c
        bsdf.inputs["Base Color"].default_value = c
    if image and bsdf:
        tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None) or nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(os.path.join(B.DOSSIER, "textures", image), check_existing=True)
        nt.links.new(tex.outputs[0], bsdf.inputs["Base Color"])
    return m


def habiller():
    """Chaque navire de la flotte prend ses couleurs, son drapeau et l'emblème de sa commu sur la grande voile."""
    for commu, (c1, c2) in COMMUS.items():
        coll = bpy.data.collections[f"navire_v4_{commu}"]
        mats = {
            "rose": _copie("rose", commu, c1), "violet": _copie("violet", commu, c2),
            "voile": _copie("voile", commu, image=f"voile_{commu}.png"), "voile_b": _copie("voile_b", commu, image=f"voile_b_{commu}.png"),
            "drapeau": _copie("drapeau", commu, image=f"drapeau_{commu}.png"),
        }
        for o in coll.all_objects:
            if o.type != "MESH":
                continue
            for k, slot in enumerate(o.material_slots):
                if slot.material and slot.material.name in mats:
                    _avant[(o.name, k)] = slot.material.name
                    slot.material = mats[slot.material.name]


def deshabiller():
    for (nom, k), mat in list(_avant.items()):
        o = bpy.data.objects.get(nom)
        if o and k < len(o.material_slots):
            o.material_slots[k].material = bpy.data.materials[mat]
    _avant.clear()


# ---------- la petite pieuvre (dessin original) ----------
def _mat(nom, couleur, rugosite=0.45, lumiere=0.0):
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    c = B.rgba(couleur)
    m.diffuse_color = c
    bsdf.inputs["Base Color"].default_value = c
    bsdf.inputs["Roughness"].default_value = rugosite
    if lumiere:
        bsdf.inputs["Emission Color"].default_value = c
        bsdf.inputs["Emission Strength"].default_value = lumiere
    return m


def _tentacule(points, r0, r1):
    cu = bpy.data.curves.new("pieuvre_tentacule", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 3
    cu.resolution_u = 6
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (p[0], p[1], p[2], 1)
        sp.points[i].radius = r0 + (r1 - r0) * i / (len(points) - 1)
    sp.use_endpoint_u = True
    sp.order_u = 3
    o = bpy.data.objects.new("pieuvre_tentacule", cu)
    bpy.context.scene.collection.objects.link(o)
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o)
    bpy.data.curves.remove(cu)
    return me


def pieuvre_maillage():
    me_old = bpy.data.meshes.get("pieuvre")
    if me_old:
        return me_old
    mats = [_mat("pieuvre_rose", 0xff62a6, 0.4, 0.15), _mat("pieuvre_noir", 0x0a0206, 0.25), _mat("pieuvre_blanc", 0xffffff, 0.2, 0.6),
            _mat("pieuvre_joue", 0xff2f86, 0.5, 0.2), _mat("pieuvre_tache", 0xc9246f, 0.45)]
    bm = bmesh.new()

    def ajouter(me, index, mat=None):
        me.transform(mat) if mat is not None else None
        tmp = bmesh.new()
        tmp.from_mesh(me)
        for f in tmp.faces:
            f.material_index = index
        tmp.to_mesh(me)
        tmp.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)

    from mathutils import Matrix

    def boule(r, loc, ech=(1, 1, 1), index=0, seg=(16, 12)):
        me = bpy.data.meshes.new("tmp")
        t = bmesh.new()
        bmesh.ops.create_uvsphere(t, u_segments=seg[0], v_segments=seg[1], radius=r)
        for f in t.faces:
            f.smooth = True
        t.to_mesh(me)
        t.free()
        m = Matrix.Translation(loc) @ Matrix.Diagonal((*ech, 1))
        ajouter(me, index, m)

    tete = Matrix.Translation((-0.03, 0, 0.5)) @ Matrix.Rotation(0.22, 4, "Y") @ Matrix.Diagonal((1, 1, 1.12, 1))
    me = bpy.data.meshes.new("tmp")
    t = bmesh.new()
    bmesh.ops.create_uvsphere(t, u_segments=24, v_segments=16, radius=0.36)
    for f in t.faces:
        f.smooth = True
    t.to_mesh(me)
    t.free()
    ajouter(me, 0, tete)
    # les yeux (l'avant est vers +X), leur reflet, les joues
    for s in (-1, 1):
        boule(0.075, (0.31, s * 0.13, 0.46), (0.55, 1, 1.3), 1)
        boule(0.026, (0.35, s * 0.13 + 0.02, 0.5), (0.6, 1, 1), 2, (8, 6))
        boule(0.05, (0.27, s * 0.24, 0.36), (0.4, 1, 0.6), 3, (10, 6))
    # des taches sur le haut et l'arrière de la tête
    for x, y, z, r in ((-0.1, 0.3, 0.85, 0.06), (-0.4, -0.35, 0.75, 0.05), (-0.85, 0.05, 0.55, 0.055), (0.2, -0.62, 0.45, 0.045), (-0.55, 0.55, 0.35, 0.05)):
        d = Vector((x, y, z)).normalized() * (0.36 - r * 0.72)
        p = tete @ d
        boule(r, p, (1, 1, 1), 4, (10, 8))
    # six tentacules qui s'étalent et s'enroulent vers le haut au bout
    profil = [(0.12, 0.3), (0.28, 0.1), (0.46, 0.04), (0.6, 0.1), (0.66, 0.24), (0.58, 0.32), (0.5, 0.27)]
    for k in range(6):
        a = k / 6 * math.tau + math.pi / 6
        tord = 0.09 if k % 2 else -0.09
        pts = []
        for i, (r, z) in enumerate(profil):
            b = a + tord * i / (len(profil) - 1) * 2
            pts.append((math.cos(b) * r, math.sin(b) * r, z))
        ajouter(_tentacule(pts, 0.1, 0.03), 0)
    me = bpy.data.meshes.new("pieuvre")
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    return me


def _pos_navire(commu, f):
    du, dp = FLOTTE_B[commu]
    dep = S + U * du + P * dp
    b0, b1 = PLANS["b"]
    return dep + U * LONG_B * (f - b0) / (b1 - b0)


def pieuvres(coll, n=11, graine=7):
    """Des petites pieuvres sautent du navire de Squirt.exe, font la roue, plongent à côté et nagent dans le sillage."""
    me = pieuvre_maillage()
    rnd = random.Random(graine)
    b0, b1 = PLANS["b"]
    face = math.atan2(-21.5, 11.3)  # vers la caméra (qui suit la flotte par l'arrière)
    plouf = []
    for i in range(n):
        f0 = b0 + 8 + i * 14 + rnd.randint(-3, 3)
        if f0 + 22 > b1:
            break
        o = bpy.data.objects.new(f"teaser_pieuvre_{i}", me)
        coll.objects.link(o)
        cote = -1 if i % 2 == 0 else 1
        # elles sautent vers l'arrière du navire (vers la caméra qui suit) : on les voit retomber dans le sillage
        dep = _pos_navire("kikso", f0) + P * (1.2 * cote) + U * rnd.uniform(-2.6, 0.4) + Vector((0, 0, 2.7))
        haut = dep + P * (1.3 * cote) - U * 1.6 + Vector((0, 0, 2.0 + rnd.uniform(0, 0.6)))
        eau = dep + P * (2.4 * cote) - U * 3.6 + Vector((0, 0, -2.85))
        nage = eau + P * (0.6 * cote) - U * 1.4
        ech = 1.1 + rnd.uniform(-0.12, 0.12)
        rz = face + rnd.uniform(-0.35, 0.35)
        for f, loc, sc, rx in ((f0, dep, 0.05, 0.0), (f0 + 3, dep + Vector((0, 0, 0.5)), ech, 0.6), (f0 + 10, haut, ech, math.pi), (f0 + 20, eau, ech, math.tau),
                               (f0 + 34, eau.lerp(nage, 0.45) + Vector((0, 0, 0.1)), ech, math.tau), (f0 + 50, nage, ech, math.tau),
                               (f0 + 62, nage - U * 0.3 + Vector((0, 0, -1.3)), 0.0, math.tau)):
            o.location = loc
            o.scale = (sc, sc, sc)
            o.rotation_euler = (rx, 0, rz)
            o.keyframe_insert("location", frame=f)
            o.keyframe_insert("scale", frame=f)
            o.keyframe_insert("rotation_euler", frame=f)
        o.scale = (0.0, 0.0, 0.0)
        o.keyframe_insert("scale", frame=f0 - 1)
        plouf.append(round((f0 + 20 - b0) / FPS, 3))
    return plouf


def construire():
    """Les trois plans à 30 images/s (Port Barhaw et ses effets viennent de barhaw_accueil_vf)."""
    info = A.construire()
    habiller()
    coll = B.collection("teaser")
    cams = {}
    a0, a1 = PLANS["a"]
    cams["a"] = T0._camera(coll, "teaser_cam_a", [(a0, (46, -37, 13), (12.5, -3.5, 3.4)), (a1, (27.5, -22.5, 6.2), (9.5, -1.5, 3.6))], 30)
    b0, b1 = PLANS["b"]
    for k, commu in enumerate(("barhaw", "kikso", "veyzo")):
        dep = _pos_navire(commu, b0)
        T0._navire(coll, f"navire_v4_{commu}", f"teaser_b_{commu}", dep, dep + U * LONG_B, b0, b1, phase=k * 1.7)
    centre0 = S + U * -5.0 - P * 2.5
    centre1 = centre0 + U * LONG_B
    cams["b"] = T0._camera(coll, "teaser_cam_b", [
        (b0, tuple(centre0 + Vector((15, -15, 3.4))), tuple(centre0 + Vector((0, 0, 2.6)))),
        (b1, tuple(centre1 + Vector((17, -9, 6.5))), tuple(centre1 + Vector((-2, 1.5, 2.4)))),
    ], 28)
    plouf = pieuvres(coll)
    c0, c1 = PLANS["c"]
    D = S + U * 60
    for src, pos, rot in (("ile_phare_v4", D + P * 19 + U * 2, 0.4), ("ile_cristal_v4", D - P * 21 + U * 16, 1.9), ("ile_champignons", D + P * 24 + U * 38, 3.1), ("ile_forteresse_v4", D - P * 20 + U * 54, 4.4)):
        A._instance(coll, src, "teaser_" + src, (pos.x, pos.y, 0), (0, 0, rot), 1.0)
    fant = A._instance(coll, "fantome", "teaser_fantome", tuple(D + U * 92 + P * 5), (0, 0, CAP + math.pi * 0.75), 1.3)
    A._pilote(fant, "location", 2, "sin(frame*0.088)*0.25")
    dep_c = S + U * 34
    arr_c = dep_c + U * 30
    T0._navire(coll, "navire_v4_barhaw", "teaser_c", dep_c, arr_c, c0, c1, phase=0.9)
    cams["c"] = T0._camera(coll, "teaser_cam_c", [
        (c0, tuple(dep_c - U * 15 - P * 5 + Vector((0, 0, 4.2))), tuple(dep_c + U * 22 + Vector((0, 0, 3.0)))),
        (c1, tuple(arr_c - U * 12 - P * 9 + Vector((0, 0, 5.4))), tuple(arr_c + U * 26 + Vector((0, 0, 4.0)))),
    ], 26)
    for c in cams.values():
        T0._lineaire(c)
        T0._lineaire(bpy.data.objects[c.name + "_cible"])
    # la houle des navires : même allure qu'à 24 images/s
    for o in coll.objects:
        ad = o.animation_data
        if ad:
            for d in ad.drivers:
                d.driver.expression = d.driver.expression.replace("frame*0.21", "frame*0.168").replace("frame*0.17", "frame*0.136").replace("frame*0.23", "frame*0.184")
    bpy.context.scene.render.fps = FPS
    infos = {"accueil": info, "teaser": len(coll.objects), "plouf_b": plouf}
    json.dump(infos, open(os.path.join(B.DOSSIER, "rendus", "teaser2-infos.json"), "w"), default=str)
    return infos


def remettre():
    deshabiller()
    T0.remettre()


def rendre(plan, taille=(1920, 1080), qualite=16, epaisseur=1.9, image_seule=None):
    """Comme le premier teaser (même ciel, mêmes réglages), en 1080p, avec le trait d'encre un peu plus épais."""
    scene = bpy.context.scene
    garder = {"accueil", "accueil_effets", "teaser"}
    sources = {"ile_port", "navire_v4_barhaw", "navire_v4_veyzo", "navire_v4_kikso", "mouette", "fantome", "ile_phare_v4", "ile_cristal_v4", "ile_champignons", "ile_forteresse_v4"}
    garder |= sources  # les copies ne se rendent que si leur collection d'origine n'est pas cachée au rendu
    lcs = {lc.name: lc for lc in bpy.context.view_layer.layer_collection.children}
    avant = {n: lcs[n].exclude for n in sources if n in lcs}
    cacher = {c.name: c.hide_render for c in scene.collection.children}
    for c in scene.collection.children:
        c.hide_render = c.name not in garder
    for n in avant:
        lcs[n].exclude = True  # les originaux cachés : seules les copies posées se voient
    monde_avant, camera_avant = scene.world, scene.camera
    scene.world = A.ciel()
    scene.camera = bpy.data.objects["teaser_cam_" + plan]
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    r.resolution_x, r.resolution_y = taille
    r.resolution_percentage = 100
    r.film_transparent = False
    r.fps = FPS
    try:
        scene.eevee.taa_render_samples = qualite
    except Exception:
        pass
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "None"
    except Exception:
        pass
    r.use_freestyle = True
    r.line_thickness_mode = "ABSOLUTE"
    r.line_thickness = epaisseur
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("contour")
    ls_avant = (ls.select_by_collection, ls.collection, ls.collection_negation)
    ls.select_by_collection = True
    ls.collection = bpy.data.collections["accueil_effets"]
    ls.collection_negation = "EXCLUSIVE"
    dossier = os.path.join(B.DOSSIER, "rendus", "teaser2")
    os.makedirs(dossier, exist_ok=True)
    debut, fin = PLANS[plan]
    try:
        try:
            r.image_settings.media_type = "IMAGE"
        except Exception:
            pass
        r.image_settings.file_format = "PNG"
        r.image_settings.color_mode = "RGB"
        if image_seule is not None:
            scene.frame_set(debut + image_seule)
            r.filepath = os.path.join(dossier, f"essai-{plan}-{image_seule}.png")
            bpy.ops.render.render(write_still=True)
            return r.filepath
        scene.frame_start, scene.frame_end = debut, fin
        r.filepath = os.path.join(dossier, f"{plan}-")
        bpy.ops.render.render(animation=True)
        return dossier
    finally:
        ls.select_by_collection, ls.collection, ls.collection_negation = ls_avant
        for c in scene.collection.children:
            c.hide_render = cacher.get(c.name, False)
        for n, v in avant.items():
            lcs[n].exclude = v
        scene.world, scene.camera = monde_avant, camera_avant
