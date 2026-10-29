# La cinématique de départ de GRAND LINE (6 s) : le navire de la commu quitte Port Barhaw, la caméra le suit
# vers le large entre une dizaine d'îles, des poissons sautent, l'écume et les reflets brillent sur l'eau, des mouettes
# passent, et « GRAND LINE » apparaît à la fin dans un feu d'artifice. Rendu dans Barhaw-3D/rendus/cinematique.mp4
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
    for nom, (x, y) in (("ile_moussaillons", (34, 60)), ("ile_recif", (70, 8))):
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
    decor(coll, chemin)
    return {"objets": len(coll.objects)}


def rendre(taille=(1280, 720), qualite=16, debut=None, fin=None, image_seule=None):
    """Rend la cinématique en MP4 (ou une seule image, pour juger)."""
    scene = bpy.context.scene
    garder = {"cinematique", "cine_effets", "navire", "mouette"} | {c.name for c in scene.collection.children if c.name.startswith("ile_")}
    sources = garder - {"cinematique", "cine_effets"}
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
    # pas de contour sur les effets (écume, sillage, étincelles, reflets) : sinon ils sortent en petits traits sombres
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("contour")
    ls_avant = (ls.select_by_collection, ls.collection, ls.collection_negation)
    fx = bpy.data.collections.get("cine_effets")
    if fx:
        ls.select_by_collection = True
        ls.collection = fx
        ls.collection_negation = "EXCLUSIVE"
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
        ls.select_by_collection, ls.collection, ls.collection_negation = ls_avant
        for c in scene.collection.children:
            c.hide_render = False
        for n, v in avant.items():
            lcs[n].exclude = v



# ---------- le décor et les effets : des îles partout, des nuages, l'écume, le sillage, les mouettes qui battent
# des ailes, les voiles qui gonflent, et un feu d'artifice avec le titre ----------
def _sur_chemin(chemin, image):
    """La place du navire à une image donnée (interpolation linéaire entre les clés)."""
    for (i0, p0, _), (i1, p1, _) in zip(chemin, chemin[1:]):
        if i0 <= image <= i1:
            k = (image - i0) / max(1, i1 - i0)
            return (p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k)
    return chemin[-1][1]


def _brille(nom, hexa, force=1.1):
    """Une matière qui brille (étincelles, reflets) : couleur et émission."""
    m = B.materiau(nom)
    col = B.rgba(hexa)
    m.diffuse_color = col
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = col
        bsdf.inputs["Emission Color"].default_value = col
        bsdf.inputs["Emission Strength"].default_value = force
    return nom


def _point_ecran(image, sx, sy):
    """Le point de la mer (z = 0) vu à (sx, sy) de l'écran à cette image, et la droite de la caméra (à plat)."""
    sc = bpy.context.scene
    sc.frame_set(image)
    cam = sc.camera
    mw = cam.matrix_world.copy()
    tr, br, bl, tl = [mw @ v for v in cam.data.view_frame(scene=sc)]
    o = mw.translation.copy()
    d = (bl + (br - bl) * sx + (tl - bl) * sy) - o
    p = o + d * (-o.z / d.z)
    droite = mw.to_3x3() @ Vector((1, 0, 0))
    droite.z = 0
    return Vector((p.x, p.y, 0)), droite.normalized()


def decor(coll, chemin):
    import random
    rnd = random.Random(31)
    fx = B.collection("cine_effets")  # les effets : rendus sans contour (voir rendre)
    brille = {n: _brille("cine_" + n, h) for n, h in (("rose", 0xff2e8a), ("or", 0xffb000), ("violet", 0x8a4dff), ("turquoise", 0x00c8c0), ("blanc", 0xfff3c0))}
    reflet = _brille("cine_reflet", 0xffffff, 2.0)
    # d'autres îles, au loin et sur les côtés (le large n'est plus vide)
    places = {"ile_braise": (-30, 40), "ile_phare": (36, -14), "ile_vents": (8, 58), "ile_champignons": (78, 52), "ile_tresor": (96, 26),
              "ile_givre": (-14, 82), "ile_arbre": (6, 92), "ile_lucioles": (110, 70), "ile_engloutie": (28, 98), "ile_tonnerre": (-48, 8)}
    for nom, (x, y) in places.items():
        if bpy.data.collections.get(nom):
            e = _instance(coll, nom, "cine_" + nom)
            e.location = (x, y, 0)
            e.rotation_euler = (0, 0, rnd.uniform(0, 6.28))
    # des rochers et des bouées dans l'eau
    L = B.Lot()
    for k in range(26):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(14, 90)
        x, y = 20 + math.cos(a) * d, 25 + math.sin(a) * d
        L.ajouter(B.caillou(rnd.uniform(0.5, 1.4), k + 300, 0.35, 1, ech=(1, 1, 0.7)), "pierre_fonce", B.mat4((x, y, -0.2)))
    for k, (x, y) in enumerate(((14, -2), (20, 6), (27, 14), (33, 21))):  # le chenal de sortie, balisé
        L.ajouter(B.cyl(0.45, 0.3, 1.2, 12), "rouge" if k % 2 else "blanc", B.mat4((x + 3, y - 3, -0.3)))
        L.ajouter(B.sphere(0.22, 10, 6), "lumiere", B.mat4((x + 3, y - 3, 1.0)))
    L.objet("cine_rochers", coll)
    # l'écume sur la mer : des petits arcs blancs qui montent et descendent
    for k in range(80):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(6, 85)
        x, y = 22 + math.cos(a) * d, 26 + math.sin(a) * d
        V = B.Lot()
        V.ajouter(B.tube(B.courbe((-1.1, 0, 0), (1.1, 0, 0), (0, 0.4, 0.1), 7), [0.04, 0.1, 0.14, 0.15, 0.14, 0.1, 0.04], 5), "blanc")
        o = V.objet(f"cine_vague{k}", fx, angle=80)
        o.location = (x, y, -0.05)
        o.rotation_euler = (0, 0, rnd.uniform(-0.6, 0.6))
        ph = rnd.uniform(0, 6.28)
        for image in range(0, IMAGES + 1, 18):
            s = 0.6 + 0.6 * (0.5 + 0.5 * math.sin(image * 0.12 + ph))
            o.scale = (s, s, s)
            o.keyframe_insert("scale", frame=image)
    # les reflets du soleil sur l'eau : de petites étoiles qui scintillent
    for k in range(60):
        x, y = rnd.uniform(-2, 62), rnd.uniform(-6, 60)
        R = B.Lot()
        R.ajouter(B.etoile(0.55, 0.1, 0.02, 4, 0.2), reflet)
        o = R.objet(f"cine_reflet{k}", fx, angle=80)
        o.location = (x, y, 0.04)
        o.rotation_euler = (0, 0, rnd.uniform(0, 1.5))
        _cle(o, 0, ech=(0.001, 0.001, 0.001))
        t = rnd.randint(0, 14)
        while t < IMAGES - 4:
            _cle(o, t, ech=(0.001, 0.001, 0.001))
            _cle(o, t + 3, ech=(1, 1, 1))
            _cle(o, t + 7, ech=(0.001, 0.001, 0.001))
            t += rnd.randint(16, 40)
    # les nuages, qui dérivent doucement
    for k in range(12):
        N = B.Lot()
        for j in range(5):
            N.ajouter(B.sphere(rnd.uniform(1.6, 2.8), 14, 9), "blanc", B.mat4((j * 2.2 - 4.4, rnd.uniform(-0.8, 0.8), rnd.uniform(-0.3, 0.6)), ech=(1, 1, 0.7)))
        o = N.objet(f"cine_nuage{k}", coll)
        a = rnd.uniform(0.2, 2.6)
        d = rnd.uniform(40, 120)
        x, y, z = 25 + math.cos(a) * d, 20 + math.sin(a) * d, rnd.uniform(16, 30)
        _cle(o, 0, loc=(x, y, z))
        _cle(o, IMAGES, loc=(x + rnd.uniform(4, 9), y + 2, z))
    # le sillage : des ronds d'écume derrière le navire, qui s'ouvrent puis disparaissent
    for image in range(14, IMAGES, 6):
        x, y = _sur_chemin(chemin, image)
        S = B.Lot()
        S.ajouter(B.tore(0.9, 0.09, 24, 4), "blanc", B.mat4(ech=(1.4, 1, 0.4)))
        o = S.objet(f"cine_sillage{image}", fx, angle=80)
        o.location = (x, y, -0.03)
        _cle(o, image - 1, ech=(0.01, 0.01, 0.01))
        _cle(o, image + 3, ech=(1, 1, 1))
        _cle(o, image + 18, ech=(2.2, 2.2, 0.01))
        o.keyframe_insert("scale", frame=image + 19)
    # le navire vit : les voiles gonflent, le drapeau et la flamme claquent ; les mouettes battent des ailes
    def onduler(nom, chemin_prop, index, base, ampl, vitesse, pas=3):
        o = bpy.data.objects.get(nom)
        if not o:
            return
        for image in range(0, IMAGES + 1, pas):
            v = list(getattr(o, chemin_prop))
            v[index] = base + math.sin(image * vitesse) * ampl
            setattr(o, chemin_prop, v)
            o.keyframe_insert(chemin_prop, index=index, frame=image)
    for v in ("voile_grande", "voile_hune", "voile_misaine", "voile_perroquet"):
        onduler(v, "scale", 0, 1.08, 0.08, 0.35)
    onduler("drapeau", "rotation_euler", 2, 0, 0.35, 0.9)
    onduler("flamme", "rotation_euler", 2, 0, 0.45, 1.3)
    onduler("mouette_aile_g", "rotation_euler", 0, 0, 0.6, 1.2, pas=2)
    onduler("mouette_aile_d", "rotation_euler", 0, 0, -0.6, 1.2, pas=2)
    for k, n in enumerate(("port_barque0", "port_barque1")):
        o = bpy.data.objects.get(n)
        if o:
            z0 = o.location.z
            for image in range(0, IMAGES + 1, 6):
                o.location.z = z0 + math.sin(image * 0.3 + k) * 0.12
                o.keyframe_insert("location", index=2, frame=image)
    # plus de mouettes (plus bas que le titre)
    if bpy.data.collections.get("mouette"):
        for k in range(3):
            m = _instance(coll, "mouette", f"cine_mouette_plus{k}")
            m.scale = (1.3, 1.3, 1.3)
            a = (rnd.uniform(-10, 10), rnd.uniform(-10, 20), rnd.uniform(7, 10))
            b = (a[0] + rnd.uniform(25, 40), a[1] + rnd.uniform(15, 30), a[2] + rnd.uniform(0, 2))
            _cle(m, rnd.randint(0, 30), loc=a, rot=(0, 0, math.atan2(b[1] - a[1], b[0] - a[0])))
            _cle(m, IMAGES, loc=b)
    # le feu d'artifice autour du titre (à la fin) : une fusée qui monte, une gerbe d'étincelles et un anneau de lumière
    centre = Vector((44, 44, 10))
    vers_cam = Vector((21, 2, 15)) - centre
    face = vers_cam.to_track_quat("Z", "Y").to_euler()
    for k, (dx, dz, image, coul) in enumerate(((-10, 5, 112, "rose"), (10, 6, 117, "or"), (0, 8, 122, "violet"), (-7, 3, 127, "turquoise"), (8, 4, 132, "rose"), (-2, 6, 137, "or"))):
        o0 = centre + Vector((dx, 2, dz))
        # la fusée et sa traînée
        for q in range(4):
            F = B.Lot()
            F.ajouter(B.sphere(0.28 - q * 0.05, 8, 5), brille["blanc"] if q == 0 else brille[coul])
            o = F.objet(f"cine_fusee{k}_{q}", fx)
            depart = Vector((o0.x, o0.y, 0.0))
            _cle(o, image - 10 + q, loc=tuple(depart), ech=(0.01, 0.01, 0.01))
            _cle(o, image - 9 + q, ech=(1, 1, 1))
            _cle(o, image - 1, loc=tuple(o0 - Vector((0, 0, q * 0.7))), ech=(1, 1, 1))
            _cle(o, image, ech=(0.01, 0.01, 0.01))
        # la gerbe
        for j in range(22):
            a = j * 2 * math.pi / 22
            d = Vector((math.cos(a), rnd.uniform(-0.3, 0.3), math.sin(a))).normalized() * rnd.uniform(3.8, 6.0)
            E = B.Lot()
            E.ajouter(B.sphere(0.3, 8, 5), brille["blanc"] if j % 4 == 0 else brille[coul])
            o = E.objet(f"cine_etincelle{k}_{j}", fx)
            _cle(o, image - 1, loc=tuple(o0), ech=(0.01, 0.01, 0.01))
            _cle(o, image, ech=(1.2, 1.2, 1.2))
            _cle(o, image + 10, loc=tuple(o0 + d), ech=(0.9, 0.9, 0.9))
            _cle(o, image + 20, loc=tuple(o0 + d * 1.15 + Vector((0, 0, -1.8))), ech=(0.01, 0.01, 0.01))
        # l'anneau qui s'ouvre
        A = B.Lot()
        A.ajouter(B.tore(1.0, 0.06, 32, 4), brille[coul])
        o = A.objet(f"cine_anneau{k}", fx)
        o.location = o0
        o.rotation_euler = face
        _cle(o, image - 1, ech=(0.01, 0.01, 0.01))
        _cle(o, image, ech=(0.4, 0.4, 0.4))
        _cle(o, image + 7, ech=(5.5, 5.5, 5.5))
        _cle(o, image + 8, ech=(0.01, 0.01, 0.01))
    # des paillettes d'or qui tombent devant le titre
    for j in range(40):
        P = B.Lot()
        P.ajouter(B.boite(0.25, 0.02, 0.18), brille["or"] if j % 2 else brille["rose"])
        o = P.objet(f"cine_paillette{j}", fx)
        x, y, z = centre.x + rnd.uniform(-12, 12), centre.y + rnd.uniform(-8, 2), centre.z + rnd.uniform(3, 7)
        t0 = rnd.randint(112, 130)
        _cle(o, t0 - 1, loc=(x, y, z), rot=(0, 0, 0), ech=(0.01, 0.01, 0.01))
        _cle(o, t0, ech=(1, 1, 1))
        _cle(o, IMAGES + 4, loc=(x + rnd.uniform(-2, 2), y, z - rnd.uniform(6, 9)), rot=(rnd.uniform(4, 9), rnd.uniform(4, 9), rnd.uniform(2, 6)))
    # des poissons qui sautent près du navire (une éclaboussure à l'entrée et à la sortie)
    # placés à l'écran (x, y entre 0 et 1, à mi-saut), de part et d'autre du navire
    sauts = ((24, 0.8, 0.3, 1), (48, 0.2, 0.26, -1), (70, 0.22, 0.3, 1), (90, 0.78, 0.28, -1), (110, 0.74, 0.24, 1), (124, 0.28, 0.2, -1))
    for k, (t0, sx, sy, sens) in enumerate(sauts):
        m, droite = _point_ecran(t0 + 6, sx, sy)
        a = tuple(m - droite * 2.6 * sens)[:2]
        b = tuple(m + droite * 2.6 * sens)[:2]
        P = B.Lot()
        P.ajouter(B.sphere(0.5, 14, 9), "violet" if k % 2 else "turquoise", B.mat4(ech=(1.7, 0.55, 0.7)))
        P.ajouter(B.boite(0.5, 0.06, 0.7), "rose", B.mat4((-0.95, 0, 0), (0, math.radians(30), 0)))
        P.ajouter(B.sphere(0.09, 8, 5), "noir", B.mat4((0.55, -0.22, 0.12)))
        P.ajouter(B.sphere(0.09, 8, 5), "noir", B.mat4((0.55, 0.22, 0.12)))
        o = P.objet(f"cine_poisson{k}", coll)
        cap = math.atan2(b[1] - a[1], b[0] - a[0])
        duree, haut = 12, 2.4
        _cle(o, t0 - 1, loc=(a[0], a[1], -2.0), rot=(0, math.radians(50), cap), ech=(0.01, 0.01, 0.01))
        for q in range(0, duree + 1, 2):
            u = q / duree
            x, y = a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u
            z = -0.6 + 4 * haut * u * (1 - u)
            pente = math.atan2(4 * haut * (1 - 2 * u), math.hypot(b[0] - a[0], b[1] - a[1]))
            _cle(o, t0 + q, loc=(x, y, z), rot=(0, -pente, cap), ech=(1, 1, 1))
        _cle(o, t0 + duree + 1, loc=(b[0], b[1], -2.0), ech=(0.01, 0.01, 0.01))
        for (x, y), t in ((a, t0), (b, t0 + duree)):
            for j, r in enumerate((0.6, 0.35)):
                G = B.Lot()
                G.ajouter(B.tore(r, 0.07, 20, 4), "blanc", B.mat4(ech=(1, 1, 0.5)))
                o = G.objet(f"cine_plouf{k}_{t}_{j}", fx)
                o.location = (x, y, 0.0)
                _cle(o, t - 1, ech=(0.01, 0.01, 0.01))
                _cle(o, t + 1 + j, ech=(1, 1, 1))
                _cle(o, t + 12 + j, ech=(3.2, 3.2, 0.01))
                o.keyframe_insert("scale", frame=t + 13 + j)
            for j in range(6):  # les gouttes
                G = B.Lot()
                G.ajouter(B.sphere(0.12, 6, 4), "blanc")
                o = G.objet(f"cine_goutte{k}_{t}_{j}", fx)
                ang = j * math.pi / 3 + 0.3
                _cle(o, t - 1, loc=(x, y, 0), ech=(0.01, 0.01, 0.01))
                _cle(o, t, ech=(1, 1, 1))
                _cle(o, t + 4, loc=(x + math.cos(ang) * 0.9, y + math.sin(ang) * 0.9, 1.1))
                _cle(o, t + 9, loc=(x + math.cos(ang) * 1.5, y + math.sin(ang) * 1.5, -0.3), ech=(0.6, 0.6, 0.6))
                _cle(o, t + 10, ech=(0.01, 0.01, 0.01))
    bpy.context.scene.frame_set(0)
