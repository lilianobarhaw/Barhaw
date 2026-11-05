# Les petites vidéos de la VF 1.0 (rendues dans Blender, 30 images/s, avec le trait d'encre) :
#   boss-<id> : l'entrée d'un boss de BOSS LIVE (KRAKOR, MORGHAST, VORAXIA) : il jaillit de la mer dans une gerbe d'écume,
#               la caméra tremble au choc (3 s, 720 × 720, fond rouge sombre pour se fondre dans l'alerte du site)
#   ile-<id>  : « Terre en vue ! » : un tour de caméra autour d'une île de la V4 et de son maître, qui sort de l'eau (4 s, 960 × 600)
# Tout est original (les boss, les îles et les maîtres viennent de barhaw_boss, barhaw_iles_v4 et barhaw_maitres_v4).
# Usage dans Blender :
#   import barhaw_clips_vf as C ; C.essai("boss", "krakor", 30)   (une image d'essai dans rendus/clips/)
#   C.tout()   (toutes les vidéos : rendus/clips/<nom>.mp4, presque sans perte ; le site les réencode en léger)
import math, os, random, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_accueil_vf as A
import barhaw_teaser_vf as T0

FPS = 30
ILES = ["phare", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"]
BOSS = ["krakor", "morghast", "voraxia"]
DOSSIER = os.path.join(B.DOSSIER, "rendus", "clips")
FACE_BOSS = math.atan2(-26, 13)  # le côté que montrent les rendus des boss (vitrine de barhaw_boss)
FACE_ILE = math.atan2(-25, 17)  # le côté que montrent les vignettes des îles
FACE_MAITRE = math.atan2(-13, 17)  # et celui des maîtres
ETAT = {"fait": [], "erreur": ""}


def _bornes(nom):
    mn = Vector((1e9, 1e9, 1e9))
    mx = -mn
    for o in bpy.data.collections[nom].all_objects:
        if o.type != "MESH":
            continue
        for v in o.bound_box:
            w = o.matrix_world @ Vector(v)
            mn = Vector(map(min, mn, w))
            mx = Vector(map(max, mx, w))
    return mn, mx


def _monde_boss():
    """Un ciel d'orage rouge sombre (le même que le fond de l'alerte « LE BOSS EST LÀ !!! »)."""
    monde = bpy.data.worlds.get("clip_ciel_boss") or bpy.data.worlds.new("clip_ciel_boss")
    monde.use_nodes = True
    nt = monde.node_tree
    nt.nodes.clear()
    sortie = nt.nodes.new("ShaderNodeOutputWorld")
    fond = nt.nodes.new("ShaderNodeBackground")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])
    rampe = nt.nodes.new("ShaderNodeValToRGB")
    cr = rampe.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = B.rgba(0x9a1a44)
    cr.elements[1].position = 0.16
    cr.elements[1].color = B.rgba(0x5a0c2c)
    e = cr.elements.new(0.45)
    e.color = B.rgba(0x12050d)
    nt.links.new(sep.outputs["Z"], rampe.inputs["Fac"])
    nt.links.new(rampe.outputs["Color"], fond.inputs["Color"])
    nt.links.new(fond.outputs[0], sortie.inputs[0])
    return monde


def _cles(o, chemin, cles):
    for f, v in cles:
        setattr(o, chemin, v)
        o.keyframe_insert(chemin, frame=f)


def _visible(o, debut, fin):
    """L'objet ne se rend qu'entre deux images (avant et après, il est caché)."""
    for f, cache in ((0, True), (debut, False), (fin + 1, True)):
        o.hide_render = cache
        o.keyframe_insert("hide_render", frame=f)
        o.hide_viewport = cache
        o.keyframe_insert("hide_viewport", frame=f)


def _mer_proche(coll):
    """Une mer bien découpée près de la caméra (la même matière que celle de l'accueil) : la grande mer est un disque
    en très grandes faces, que Freestyle ne prend pas pour un écran ; avec celle-ci, les traits sous l'eau sont cachés."""
    me = bpy.data.meshes.get("clip_mer")
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=96, y_segments=96, size=70)
        me = bpy.data.meshes.new("clip_mer")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(A.materiau_mer())
    o = bpy.data.objects.new("clip_mer", me)
    coll.objects.link(o)
    bpy.data.collections["accueil_effets"].objects.link(o)  # pas de trait d'encre sur la mer
    o.location = (0, 0, 0.04)
    return o


def _gerbe(coll, centre, debut, force=1.0, graine=1, n=26):
    """Une gerbe d'écume : un anneau qui s'ouvre et des gouttes qui montent puis retombent."""
    blanc = A.emissif("clip_ecume", 0xfff0f7, 1.15)
    me = bpy.data.meshes.get("clip_anneau")
    if not me:
        bm = B.tore(1.0, 0.22, 32, 8)
        me = bpy.data.meshes.new("clip_anneau")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(blanc)
    a = bpy.data.objects.new("clip_anneau", me)
    coll.objects.link(a)
    a.location = Vector(centre) + Vector((0, 0, 0.05))
    k = 3.0 * force
    _cles(a, "scale", [(debut, (1.2 * force, 1.2 * force, 0.8)), (debut + 16, (k, k, 0.55)), (debut + 30, (k * 1.3, k * 1.3, 0.2))])
    _visible(a, debut, debut + 31)
    goutte = bpy.data.meshes.get("clip_goutte")
    if not goutte:
        bm = B.ico(0.32, 2)
        goutte = bpy.data.meshes.new("clip_goutte")
        bm.to_mesh(goutte)
        bm.free()
        goutte.materials.append(blanc)
        for f in goutte.polygons:
            f.use_smooth = True
    rnd = random.Random(graine)
    for i in range(n):
        g = bpy.data.objects.new("clip_goutte", goutte)
        coll.objects.link(g)
        ang = i / n * math.tau + rnd.uniform(-0.2, 0.2)
        r0 = rnd.uniform(1.5, 3.2) * force
        r1 = r0 + rnd.uniform(1.5, 4.0) * force
        h = rnd.uniform(4.5, 10.0) * force
        d = rnd.randint(0, 4)
        p = lambda r, z: Vector(centre) + Vector((math.cos(ang) * r, math.sin(ang) * r, z))
        s = rnd.uniform(0.7, 1.5) * force
        _cles(g, "location", [(debut + d, p(r0, 0)), (debut + d + 9, p((r0 + r1) / 2, h)), (debut + d + 22, p(r1, -1.0))])
        _cles(g, "scale", [(debut + d, (s * 0.4, s * 0.4, s * 0.4)), (debut + d + 4, (s, s, s)), (debut + d + 18, (s * 0.8, s * 0.8, s * 0.8)), (debut + d + 22, (s * 0.3, s * 0.3, s * 0.3))])
        _visible(g, debut + d, debut + d + 21)


def _secousse(coll, cam, debut, duree, force):
    """La caméra tremble au choc : elle regarde un point accroché à sa cible, qui tremble autour d'elle."""
    cible = bpy.data.objects[cam.name + "_cible"]
    choc = bpy.data.objects.new(cam.name + "_choc", None)
    coll.objects.link(choc)
    choc.parent = cible
    for i, (f, ph) in enumerate(((7.1, 0.0), (5.3, 1.7), (6.2, 3.1))):
        A._pilote(choc, "location", i, f"sin(frame*{f}+{ph})*{force}*max(0,1-abs(frame-{debut + duree / 3:.1f})/{duree / 1.5:.1f})")
    for c in cam.constraints:
        if c.type == "TRACK_TO":
            c.target = choc


def _vider():
    coll = B.collection("clips")
    for o in list(coll.objects):
        bpy.data.objects.remove(o)
    return coll


def construire_boss(id_):
    coll = _vider()
    _mer_proche(coll)
    e = A._instance(coll, "boss_" + id_, "clip_boss", (0, 0, -18), (0, 0, 0), 1.0)
    # il jaillit (un peu trop haut), retombe, puis se balance doucement
    _cles(e, "location", [(6, (0, 0, -18)), (22, (0, 0, 1.4)), (32, (0, 0, -0.5)), (42, (0, 0, 0.2)), (60, (0, 0, -0.15)), (89, (0, 0, 0.15))])
    _cles(e, "rotation_euler", [(6, (0.25, 0, -0.5)), (24, (-0.06, 0, 0.08)), (40, (0.0, 0, -0.03)), (89, (0.02, 0, 0.04))])
    _gerbe(coll, (0, 0, 0), 12, force=1.6, graine=3, n=30)
    # la caméra : basse, elle regarde l'eau qui bouillonne, puis lève les yeux vers le boss
    d = Vector((math.cos(FACE_BOSS), math.sin(FACE_BOSS), 0))
    l = Vector((-d.y, d.x, 0))
    cam = T0._camera(coll, "clip_cam", [
        (0, tuple(d * 23 + Vector((0, 0, 2.0))), (0, 0, 3.0)),
        (26, tuple(d * 19.5 + l * 0.8 + Vector((0, 0, 2.6))), (0, 0, 7.2)),
        (89, tuple(d * 17.5 + l * 3.0 + Vector((0, 0, 3.2))), (0, 0, 7.6)),
    ], 30)
    _secousse(coll, cam, 18, 30, 0.6)
    # deux lumières de contour derrière lui (rose et violet, comme l'arène du site)
    for nom, couleur, cote in (("clip_rose", 0xff4f9a, 1), ("clip_violet", 0x9b4dff, -1)):
        lu = bpy.data.lights.get(nom) or bpy.data.lights.new(nom, "AREA")
        lu.energy = 9000
        lu.size = 8
        lu.color = B.rgb(couleur)
        o = bpy.data.objects.new(nom, lu)
        coll.objects.link(o)
        o.location = -d * 14 + l * (9 * cote) + Vector((0, 0, 12))
        o.rotation_euler = (Vector((0, 0, 7)) - o.location).to_track_quat("-Z", "Y").to_euler()
    face = bpy.data.lights.get("clip_face") or bpy.data.lights.new("clip_face", "SUN")
    face.energy = 4.2
    face.color = B.rgb(0xffc7dc)
    o = bpy.data.objects.new("clip_face", face)
    coll.objects.link(o)
    o.rotation_euler = (d * 10 + Vector((0, 0, 8))).to_track_quat("Z", "Y").to_euler()
    return {"cam": cam.name, "images": (0, 89), "taille": (720, 720), "sources": {"boss_" + id_}, "monde": _monde_boss(), "decor": False}


def construire_ile(id_):
    coll = _vider()
    nom_ile = f"ile_{id_}_v4"
    mn, mx = _bornes(nom_ile)
    r_ile = max(abs(mn.x), abs(mn.y), mx.x, mx.y)
    _mer_proche(coll)
    A._instance(coll, nom_ile, "clip_ile", (0, 0, 0))
    # le maître sort de l'eau devant l'île, sur le côté (il ne la cache jamais pendant le tour)
    f = Vector((math.cos(FACE_ILE), math.sin(FACE_ILE), 0))
    cote = Vector((-f.y, f.x, 0))
    pm = cote * (r_ile * 0.55 + 7.5) + f * 4.0
    R = 31 + max(0, r_ile - 8) * 1.4
    milieu = Vector((math.cos(FACE_ILE) * R, math.sin(FACE_ILE) * R, 8))
    vers = math.atan2(milieu.y - pm.y, milieu.x - pm.x)
    m = A._instance(coll, "maitre_" + id_, "clip_maitre", (pm.x, pm.y, -10), (0, 0, vers - FACE_MAITRE), 1.0)
    _cles(m, "location", [(6, (pm.x, pm.y, -10)), (22, (pm.x, pm.y, 1.0)), (31, (pm.x, pm.y, -0.35)), (40, (pm.x, pm.y, 0.1)), (75, (pm.x, pm.y, -0.25)), (119, (pm.x, pm.y, 0.2))])
    _cles(m, "rotation_euler", [(6, (0.2, 0, vers - FACE_MAITRE - 0.4)), (26, (0, 0, vers - FACE_MAITRE + 0.05)), (119, (0, 0, vers - FACE_MAITRE - 0.06))])
    _gerbe(coll, (pm.x, pm.y, 0), 13, force=1.0, graine=sum(map(ord, id_)), n=22)
    # le tour de caméra : un arc de 48° autour d'un point entre l'île et son maître, qui descend un peu
    pivot = pm * 0.45 + Vector((0, 0, 3.4))
    cles = []
    n = 12
    for k in range(n + 1):
        t = k / n
        e = t * t * (3 - 2 * t)
        a = FACE_ILE + math.radians(-25 + 45 * e)
        h = 11.0 - 3.6 * e
        rr = R * (1.05 - 0.1 * e)
        cles.append((round(119 * t), (pivot.x + math.cos(a) * rr, pivot.y + math.sin(a) * rr, h), tuple(pivot + Vector((0, 0, -0.4 * e)))))
    cam = T0._camera(coll, "clip_cam", cles, 34)
    T0._lineaire(cam)
    T0._lineaire(bpy.data.objects["clip_cam_cible"])
    lu = bpy.data.objects["accueil_lumiere"]
    o = bpy.data.objects.new("clip_soleil", lu.data)
    coll.objects.link(o)
    o.rotation_euler = lu.rotation_euler.copy()
    return {"cam": cam.name, "images": (0, 119), "taille": (960, 600), "sources": {nom_ile, "maitre_" + id_}, "monde": A.ciel(), "decor": True}


def _rendre(info, dossier, image_seule=None, qualite=24, epaisseur=1.5):
    scene = bpy.context.scene
    sources = info["sources"]
    garder = {"clips", "accueil_effets"} | sources  # les copies ne se rendent que si leur collection d'origine n'est pas cachée au rendu
    lcs = {lc.name: lc for lc in bpy.context.view_layer.layer_collection.children}
    avant = {n: lcs[n].exclude for n in sources if n in lcs}
    cacher = {c.name: c.hide_render for c in scene.collection.children}
    for c in scene.collection.children:
        c.hide_render = c.name not in garder
    for n in avant:
        lcs[n].exclude = True  # les originaux cachés : seules les copies posées se voient
    # pour les boss : seulement la mer (pas le soleil du soir ni les nuages)
    decor = [o for o in bpy.data.collections["accueil_effets"].objects if o.name not in ("accueil_mer",) and not o.name.startswith("clip_")]
    # les repères des maîtres (l'anneau d'écume que le site anime lui-même) ne se dessinent pas ici
    reperes = [o for n in sources for o in bpy.data.collections[n].all_objects if o.get("role") == "repere"]
    reperes_avant = {o.name: o.hide_render for o in reperes}
    for o in reperes:
        o.hide_render = True
    decor_avant = {o.name: o.hide_render for o in decor}
    for o in decor:
        o.hide_render = not info["decor"]
    monde_avant, camera_avant = scene.world, scene.camera
    scene.world = info["monde"]
    scene.camera = bpy.data.objects[info["cam"]]
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    r.resolution_x, r.resolution_y = info["taille"]
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
    culling_avant = vl.freestyle_settings.use_culling
    vl.freestyle_settings.use_culling = False
    ls.select_by_collection = True
    ls.collection = bpy.data.collections["accueil_effets"]
    ls.collection_negation = "EXCLUSIVE"
    os.makedirs(dossier, exist_ok=True)
    debut, fin = info["images"]
    try:
        try:
            r.image_settings.media_type = "IMAGE"
        except Exception:
            pass
        r.image_settings.file_format = "PNG"
        r.image_settings.color_mode = "RGB"
        if image_seule is not None:
            scene.frame_set(image_seule)
            r.filepath = os.path.join(dossier, f"essai-{image_seule}.png")
            bpy.ops.render.render(write_still=True)
            return r.filepath
        scene.frame_start, scene.frame_end = debut, fin
        r.filepath = os.path.join(dossier, "img-")
        bpy.ops.render.render(animation=True)
        return dossier
    finally:
        ls.select_by_collection, ls.collection, ls.collection_negation = ls_avant
        vl.freestyle_settings.use_culling = culling_avant
        for c in scene.collection.children:
            c.hide_render = cacher.get(c.name, False)
        for n, v in avant.items():
            lcs[n].exclude = v
        for o in decor:
            o.hide_render = decor_avant[o.name]
        for o in reperes:
            o.hide_render = reperes_avant[o.name]
        scene.world, scene.camera = monde_avant, camera_avant


def encoder(dossier, sortie, images):
    """Les images PNG en une vidéo H.264 presque sans perte (le site la réencode en léger, en WebM et en MP4)."""
    sc = bpy.data.scenes.new("clips_encodage")
    try:
        sc.render.resolution_x, sc.render.resolution_y = bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y
        sc.render.resolution_percentage = 100
        sc.render.fps = FPS
        try:
            sc.view_settings.view_transform = "Standard"
            sc.view_settings.look = "None"
            sc.sequencer_colorspace_settings.name = "sRGB"
        except Exception:
            pass
        se = sc.sequence_editor_create()
        fichiers = [f"img-{k:04d}.png" for k in range(images[0], images[1] + 1)]
        bande = se.strips if hasattr(se, "strips") else se.sequences
        s = bande.new_image(name="images", filepath=os.path.join(dossier, fichiers[0]), channel=1, frame_start=1)
        for f in fichiers[1:]:
            s.elements.append(f)
        sc.frame_start, sc.frame_end = 1, len(fichiers)
        try:
            sc.render.image_settings.media_type = "VIDEO"
        except Exception:
            pass
        sc.render.image_settings.file_format = "FFMPEG"
        sc.render.ffmpeg.format = "MPEG4"
        sc.render.ffmpeg.codec = "H264"
        sc.render.ffmpeg.constant_rate_factor = "PERC_LOSSLESS"
        sc.render.ffmpeg.audio_codec = "NONE"
        sc.render.filepath = sortie
        sc.render.use_file_extension = False
        bpy.ops.render.render(animation=True, scene=sc.name)
    finally:
        bpy.data.scenes.remove(sc)
    return sortie


def essai(genre, id_, image):
    info = construire_boss(id_) if genre == "boss" else construire_ile(id_)
    return _rendre(info, DOSSIER, image_seule=image)


def un(genre, id_, refaire=False):
    info = construire_boss(id_) if genre == "boss" else construire_ile(id_)
    nom = f"{genre}-{id_}"
    dossier = os.path.join(DOSSIER, nom)
    deja = all(os.path.exists(os.path.join(dossier, f"img-{k:04d}.png")) for k in range(info["images"][0], info["images"][1] + 1))
    if refaire or not deja:
        _rendre(info, dossier)
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = info["taille"]
    encoder(dossier, os.path.join(DOSSIER, nom + ".mp4"), info["images"])
    ETAT["fait"].append(nom)
    return nom


def tout(boss=BOSS, iles=ILES, refaire=False):
    ETAT["fait"].clear()
    ETAT["erreur"] = ""
    try:
        for b in boss:
            un("boss", b, refaire)
        for i in iles:
            un("ile", i, refaire)
    except Exception as e:
        ETAT["erreur"] = repr(e)
        raise
    finally:
        _vider()
    return ETAT


def nettoyer():
    _vider()
