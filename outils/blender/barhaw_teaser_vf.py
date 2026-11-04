# Le teaser de la VF 1.0 (un peu plus de 20 s) : trois plans rendus ici, puis les textes et le titre ajoutés par
# outils/teaser_vf.py (sur le container), et la vidéo assemblée avec ffmpeg.
#   a : Port Barhaw au coucher du soleil, la caméra s'approche du navire au mouillage (4,5 s)
#   b : la flotte des commus (trois navires) part vers le soleil, la caméra les suit de côté (5,5 s)
#   c : le navire de Barhaw file entre les nouvelles îles, le vaisseau fantôme au loin (4,5 s)
# Usage dans Blender :
#   import barhaw_teaser_vf as T ; T.construire() ; T.rendre("a") ; T.rendre("b") ; T.rendre("c") ; T.remettre()
import math, os, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_accueil_vf as A

PLANS = {"a": (0, 107), "b": (200, 331), "c": (400, 507)}
U = Vector((-0.871, 0.491, 0))  # le cap de la flotte : vers le soleil (la lumière vient de derrière la caméra)
P = Vector((-U.y, U.x, 0))  # sa gauche
CAP = math.atan2(U.y, U.x)  # l'avant des navires est vers +x
S = Vector((-30, 20, 0))  # où la flotte part


def _cle(o, image, loc=None, axes=(0, 1, 2)):
    o.location = Vector(loc)
    for i in axes:
        o.keyframe_insert("location", index=i, frame=image)


def _lineaire(o):
    ad = o.animation_data
    if ad and ad.action:
        try:
            for fc in ad.action.fcurves:
                for k in fc.keyframe_points:
                    k.interpolation = "LINEAR"
        except Exception:
            # Blender 5 : les courbes sont rangées dans des couches
            for couche in ad.action.layers:
                for bande in couche.strips:
                    for sac in bande.channelbags:
                        for fc in sac.fcurves:
                            for k in fc.keyframe_points:
                                k.interpolation = "LINEAR"


def _navire(coll, source, nom, depart, arrivee, debut, fin, phase=0.0):
    e = A._instance(coll, source, nom, (depart.x, depart.y, 0), (0, 0, CAP), 1.0)
    _cle(e, debut, depart, (0, 1))
    _cle(e, fin, arrivee, (0, 1))
    _lineaire(e)
    A._pilote(e, "location", 2, f"sin(frame*0.21+{phase})*0.13-0.05")
    A._pilote(e, "rotation_euler", 0, f"sin(frame*0.17+{phase + 0.6})*0.04")
    A._pilote(e, "rotation_euler", 1, f"sin(frame*0.23+{phase + 1.3})*0.03")
    return e


def _camera(coll, nom, cles, lens=30):
    d = bpy.data.cameras.new(nom)
    d.lens = lens
    d.clip_end = 2000
    c = bpy.data.objects.new(nom, d)
    coll.objects.link(c)
    cible = bpy.data.objects.new(nom + "_cible", None)
    coll.objects.link(cible)
    for image, pos, vise in cles:
        _cle(c, image, pos)
        _cle(cible, image, vise)
    contrainte = c.constraints.new("TRACK_TO")
    contrainte.target = cible
    contrainte.track_axis = "TRACK_NEGATIVE_Z"
    contrainte.up_axis = "UP_Y"
    return c


def construire():
    info = A.construire()
    coll = B.collection("teaser")
    cams = {}
    # a : Port Barhaw, on s'approche du navire au mouillage
    a0, a1 = PLANS["a"]
    cams["a"] = _camera(coll, "teaser_cam_a", [(a0, (46, -37, 13), (12.5, -3.5, 3.4)), (a1, (27.5, -22.5, 6.2), (9.5, -1.5, 3.6))], 30)
    # b : la flotte (Barhaw devant, Veyzo et Kikso de chaque côté) part vers le soleil
    b0, b1 = PLANS["b"]
    long_b = 17.0
    for k, (src, du, dp) in enumerate((("navire_v4_barhaw", 0, 0), ("navire_v4_veyzo", -7, 7.5), ("navire_v4_kikso", -9.5, -7))):
        dep = S + U * du + P * dp
        _navire(coll, src, f"teaser_b_{k}", dep, dep + U * long_b, b0, b1, phase=k * 1.7)
    centre0 = S + U * -5.5
    centre1 = centre0 + U * long_b
    cams["b"] = _camera(coll, "teaser_cam_b", [
        (b0, tuple(centre0 + Vector((15, -15, 3.4))), tuple(centre0 + Vector((0, 0, 2.6)))),
        (b1, tuple(centre1 + Vector((17, -9, 6.5))), tuple(centre1 + Vector((-2, 1.5, 2.4)))),
    ], 28)
    # c : Barhaw file entre les nouvelles îles ; le vaisseau fantôme au loin
    c0, c1 = PLANS["c"]
    D = S + U * 60
    for src, pos, rot in (("ile_phare_v4", D + P * 19 + U * 2, 0.4), ("ile_cristal_v4", D - P * 21 + U * 16, 1.9), ("ile_champignons", D + P * 24 + U * 38, 3.1), ("ile_forteresse_v4", D - P * 20 + U * 54, 4.4)):
        A._instance(coll, src, "teaser_" + src, (pos.x, pos.y, 0), (0, 0, rot), 1.0)
    fant = A._instance(coll, "fantome", "teaser_fantome", tuple(D + U * 92 + P * 5), (0, 0, CAP + math.pi * 0.75), 1.3)
    A._pilote(fant, "location", 2, "sin(frame*0.11)*0.25")
    dep_c = S + U * 34
    arr_c = dep_c + U * 30
    _navire(coll, "navire_v4_barhaw", "teaser_c", dep_c, arr_c, c0, c1, phase=0.9)
    cams["c"] = _camera(coll, "teaser_cam_c", [
        (c0, tuple(dep_c - U * 15 - P * 5 + Vector((0, 0, 4.2))), tuple(dep_c + U * 22 + Vector((0, 0, 3.0)))),
        (c1, tuple(arr_c - U * 12 - P * 9 + Vector((0, 0, 5.4))), tuple(arr_c + U * 26 + Vector((0, 0, 4.0)))),
    ], 26)
    for c in cams.values():
        _lineaire(c)
        _lineaire(bpy.data.objects[c.name + "_cible"])
    bpy.context.scene.render.fps = 24
    return {"accueil": info, "teaser": len(coll.objects)}


def remettre():
    A.remettre()
    B.collection("teaser")


def rendre(plan, taille=(1280, 720), qualite=24, image_seule=None):
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
    monde_avant = scene.world
    camera_avant = scene.camera
    scene.world = A.ciel()
    scene.camera = bpy.data.objects["teaser_cam_" + plan]
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    r.resolution_x, r.resolution_y = taille
    r.resolution_percentage = 100
    r.film_transparent = False
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
    r.line_thickness = 1.3
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("contour")
    ls_avant = (ls.select_by_collection, ls.collection, ls.collection_negation)
    ls.select_by_collection = True
    ls.collection = bpy.data.collections["accueil_effets"]
    ls.collection_negation = "EXCLUSIVE"
    dossier = os.path.join(B.DOSSIER, "rendus", "teaser")
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
        scene.world = monde_avant
        scene.camera = camera_avant
