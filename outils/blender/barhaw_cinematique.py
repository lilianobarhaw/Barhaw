# La cinématique de départ de GRAND LINE (6 s) : le navire de la commu quitte Port Barhaw, la caméra le suit
# vers le large, des mouettes passent, et « GRAND LINE » apparaît à la fin. Rendu dans Barhaw-3D/rendus/cinematique.mp4
# (pour l'annonce Discord, et le site la joue une fois à l'ouverture : videos/grandline-depart.mp4).
import math, os, bpy
from mathutils import Vector, Euler
import barhaw_base as B

IMAGES = 144  # 6 s à 24 images/s


def _instance(coll, source, nom):
    e = bpy.data.objects.new(nom, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = bpy.data.collections[source]
    coll.objects.link(e)
    return e


def _cle(o, image, loc=None, rot=None, ech=None):
    if loc is not None:
        o.location = Vector(loc)
        o.keyframe_insert("location", frame=image)
    if rot is not None:
        o.rotation_euler = Euler(rot)
        o.keyframe_insert("rotation_euler", frame=image)
    if ech is not None:
        o.scale = Vector(ech)
        o.keyframe_insert("scale", frame=image)


def construire():
    scene = bpy.context.scene
    coll = B.collection("cinematique")
    # la mer, et deux îles au loin
    L = B.Lot()
    L.ajouter(B.cyl(140, 140, 0.5, 96), "eau", B.mat4((20, 25, -0.52)))
    L.objet("cine_mer", coll)
    port = _instance(coll, "ile_port", "cine_port")
    for nom, (x, y) in (("ile_moussaillons", (52, 46)), ("ile_recif", (70, 8))):
        if bpy.data.collections.get(nom):
            _instance(coll, nom, "cine_" + nom).location = (x, y, 0)
    # le navire : au ponton, puis il vire et file vers le large (avec la houle)
    nav = _instance(coll, "navire", "cine_navire")
    nav.scale = (1.5, 1.5, 1.5)
    chemin = [(0, (10.6, 1.6), -145), (24, (11.4, 2.6), -120), (60, (16, 9), -60), (100, (26, 19), -40), (144, (40, 30), -35)]
    for image, (x, y), cap in chemin:
        _cle(nav, image, loc=(x, y, 0), rot=(0, 0, math.radians(cap)))
    for image in range(0, IMAGES + 1, 6):  # la houle : le navire roule un peu
        nav.rotation_euler.x = math.sin(image * 0.35) * 0.05
        nav.rotation_euler.y = math.sin(image * 0.27 + 1) * 0.04
        nav.keyframe_insert("rotation_euler", index=0, frame=image)
        nav.keyframe_insert("rotation_euler", index=1, frame=image)
    # les mouettes qui passent
    if bpy.data.collections.get("mouette"):
        for k, (a, b) in enumerate((((2, -4, 10), (34, 18, 17)), ((-8, 6, 12), (18, 36, 19)))):
            m = _instance(coll, "mouette", f"cine_mouette{k}")
            m.scale = (1.4, 1.4, 1.4)
            _cle(m, 0 + k * 10, loc=a, rot=(0, 0, math.radians(35)))
            _cle(m, IMAGES, loc=b, rot=(math.radians(8 * (1 if k else -1)), 0, math.radians(45)))
    # « GRAND LINE » en lettres d'or, qui apparaît à la fin
    texte = bpy.data.curves.new("cine_texte", "FONT")
    texte.body = "GRAND LINE"
    texte.align_x = "CENTER"
    texte.extrude = 0.25
    texte.bevel_depth = 0.04
    texte.size = 4.2
    t = bpy.data.objects.new("cine_texte", texte)
    coll.objects.link(t)
    t.data.materials.append(B.materiau("or"))
    # la caméra : près du port, elle recule et suit le navire
    cam_d = bpy.data.cameras.new("cine_cam")
    cam_d.lens = 32
    cam_d.clip_end = 1000
    cam = bpy.data.objects.new("cine_cam", cam_d)
    coll.objects.link(cam)
    vise = bpy.data.objects.new("cine_vise", None)
    coll.objects.link(vise)
    cont = cam.constraints.new("TRACK_TO")
    cont.target = vise
    cont.track_axis = "TRACK_NEGATIVE_Z"
    cont.up_axis = "UP_Y"
    plans = [(0, (24, -12, 9), (6, 2, 2)), (40, (26, -8, 11), (12, 5, 3)), (90, (20, -2, 14), (22, 15, 4)), (144, (21, 2, 15), (39, 33, 8))]
    for image, c, v in plans:
        _cle(cam, image, loc=c)
        _cle(vise, image, loc=v)
    # le texte : face à la caméra de fin, au-dessus du large
    t.location = (44, 44, 10)
    direction = Vector((21, 2, 15)) - Vector(t.location)
    t.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    _cle(t, 0, ech=(0.001, 0.001, 0.001))
    _cle(t, 100, ech=(0.001, 0.001, 0.001))
    _cle(t, 118, ech=(1.15, 1.15, 1.15))
    _cle(t, 128, ech=(1, 1, 1))
    for o in (nav, cam, vise, t):
        if o.animation_data and o.animation_data.action:
            for c in getattr(o.animation_data.action, "fcurves", []):
                for p in c.keyframe_points:
                    p.interpolation = "BEZIER"
    scene.camera = cam
    scene.frame_start, scene.frame_end = 0, IMAGES
    scene.render.fps = 24
    return {"objets": len(coll.objects)}


def rendre(taille=(1280, 720), qualite=16, debut=None, fin=None, image_seule=None):
    """Rend la cinématique en MP4 (ou une seule image, pour juger)."""
    scene = bpy.context.scene
    garder = {"cinematique", "ile_port", "navire", "mouette", "ile_moussaillons", "ile_recif"}
    sources = garder - {"cinematique"}
    lcs = {lc.name: lc for lc in bpy.context.view_layer.layer_collection.children}
    avant = {n: lcs[n].exclude for n in sources if n in lcs}
    for c in scene.collection.children:
        c.hide_render = c.name not in garder
    for n in avant:
        lcs[n].exclude = True  # les originaux cachés : seules les instances se voient
    monde = scene.world or bpy.data.worlds.new("monde")
    scene.world = monde
    fond = next((n for n in monde.node_tree.nodes if n.type == "BACKGROUND"), None) if monde.node_tree else None
    if fond:
        fond.inputs[0].default_value = B.rgba(0xf6e2c0)
        fond.inputs[1].default_value = 1.1
    soleil = bpy.data.objects.get("cine_soleil")
    if not soleil:
        s = bpy.data.lights.new("cine_soleil", "SUN")
        s.energy = 3.2
        soleil = bpy.data.objects.new("cine_soleil", s)
        bpy.data.collections["cinematique"].objects.link(soleil)
        soleil.rotation_euler = Euler((math.radians(45), math.radians(-15), math.radians(-30)))
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
    except Exception:
        pass
    r.use_freestyle = True
    r.line_thickness_mode = "ABSOLUTE"
    r.line_thickness = 1.3
    dossier = os.path.join(B.DOSSIER, "rendus")
    os.makedirs(dossier, exist_ok=True)
    try:
        if image_seule is not None:
            scene.frame_set(image_seule)
            try:
                r.image_settings.media_type = "IMAGE"
            except Exception:
                pass
            r.image_settings.file_format = "PNG"
            r.filepath = os.path.join(dossier, f"cine-{image_seule}.png")
            bpy.ops.render.render(write_still=True)
            return r.filepath
        try:
            r.image_settings.media_type = "VIDEO"  # Blender 5 : la vidéo est un type de média à part
        except Exception:
            pass
        r.image_settings.file_format = "FFMPEG"
        r.ffmpeg.format = "MPEG4"
        r.ffmpeg.codec = "H264"
        r.ffmpeg.constant_rate_factor = "HIGH"
        r.ffmpeg.ffmpeg_preset = "GOOD"
        r.ffmpeg.audio_codec = "NONE"
        scene.frame_start = 0 if debut is None else debut
        scene.frame_end = IMAGES if fin is None else fin
        r.filepath = os.path.join(dossier, "cinematique.mp4")
        bpy.ops.render.render(animation=True)
        return r.filepath
    finally:
        for c in scene.collection.children:
            c.hide_render = False
        for n, v in avant.items():
            lcs[n].exclude = v
