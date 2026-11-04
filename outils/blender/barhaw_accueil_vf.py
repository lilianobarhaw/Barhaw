# L'accueil de la VF 1.0 : une carte postale vivante de Port Barhaw au coucher du soleil (6 s qui bouclent).
# Le navire de Barhaw (VF 1.0) est au mouillage devant le port, il tangue ; ses drapeaux claquent ; trois mouettes
# tournent au-dessus ; la mer ondule et scintille ; le soleil à bandes se couche derrière l'île.
# Tout ce qui bouge est périodique sur 144 images (6 s à 24 images/s) : la vidéo boucle sans à-coup.
# Rendu en images PNG dans Barhaw-3D/rendus/accueil/ (la vidéo est encodée à part, pour rester sous 1 Mo).
# Usage, dans Blender :  import barhaw_accueil_vf as A; A.construire(); A.rendre(image_seule=0) ; puis A.rendre()
import math, os, bpy
from mathutils import Vector, Euler
import barhaw_base as B

IMAGES = 144
TOUR = f"(frame*{2 * math.pi / IMAGES:.6f})"  # un tour complet sur la boucle


def _instance(coll, source, nom, loc=(0, 0, 0), rot=(0, 0, 0), ech=1.0):
    e = bpy.data.objects.new(nom, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = bpy.data.collections[source]
    coll.objects.link(e)
    e.location = Vector(loc)
    e.rotation_euler = Euler(rot)
    e.scale = Vector((ech, ech, ech))
    return e


def _pilote(o, chemin, index, expression):
    """Un pilote (driver) sur une propriété : une expression simple de la frame (pas besoin de Python)."""
    o.driver_remove(chemin, index)
    d = o.driver_add(chemin, index).driver
    d.type = "SCRIPTED"
    d.expression = expression
    return d


ORIGINAUX = []  # (objet, chemin, index, valeur de repos) : pour tout remettre comme avant après le rendu
CLE = "accueil_repos"  # gardé dans la scène (pas sur les objets : sinon ça partirait dans les .glb)


def _anime_original(o, chemin, index, expression_sans_repos):
    import json
    reposes = json.loads(bpy.context.scene.get(CLE, "{}"))
    k = f"{o.name}|{chemin}|{index}"
    if k in reposes:  # déjà animé (un essai précédent) : on repart de la vraie pose de repos
        repos = reposes[k]
    else:
        repos = getattr(o, chemin)[index]
        reposes[k] = repos
        bpy.context.scene[CLE] = json.dumps(reposes)
    ORIGINAUX.append((o, chemin, index, repos))
    _pilote(o, chemin, index, f"{repos:.5f}+{expression_sans_repos}")


def materiau_mer():
    m = bpy.data.materials.get("accueil_mer") or bpy.data.materials.new("accueil_mer")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    sortie = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.32
    try:
        bsdf.inputs["Specular IOR Level"].default_value = 0.25
    except Exception:
        pass
    nt.links.new(bsdf.outputs[0], sortie.inputs[0])
    coord = nt.nodes.new("ShaderNodeTexCoord")
    # de grandes nappes plus claires ou plus sombres : un bruit 4D dont la 4e dimension fait un cercle (boucle parfaite)
    nappes = nt.nodes.new("ShaderNodeTexNoise")
    nappes.noise_dimensions = "4D"
    nappes.inputs["Scale"].default_value = 0.035
    nappes.inputs["Detail"].default_value = 3.0
    d = nappes.inputs["W"].driver_add("default_value").driver
    d.type = "SCRIPTED"
    d.expression = f"sin({TOUR})*0.6"
    nt.links.new(coord.outputs["Object"], nappes.inputs["Vector"])
    # les crêtes : des bandes fines, déformées, qui avancent (un nombre entier de tours sur la boucle)
    cretes = []
    for k, (echelle, angle, tours) in enumerate(((0.12, 0.35, 2), (0.21, -0.5, 3))):
        w = nt.nodes.new("ShaderNodeTexWave")
        w.wave_type = "BANDS"
        w.bands_direction = "X"
        w.wave_profile = "SIN"
        w.inputs["Scale"].default_value = echelle
        w.inputs["Distortion"].default_value = 6.0
        w.inputs["Detail"].default_value = 3.0
        w.inputs["Detail Scale"].default_value = 0.6
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0, 0, angle)
        nt.links.new(coord.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs[0], w.inputs["Vector"])
        d = w.inputs["Phase Offset"].driver_add("default_value").driver
        d.type = "SCRIPTED"
        d.expression = f"-{TOUR}*{tours}"
        r = nt.nodes.new("ShaderNodeMapRange")
        r.inputs["From Min"].default_value = 0.955 + k * 0.012
        r.inputs["From Max"].default_value = 0.99
        nt.links.new(w.outputs["Fac"], r.inputs["Value"])
        # des crêtes par morceaux seulement (un bruit les coupe en traits courts)
        coupe = nt.nodes.new("ShaderNodeTexNoise")
        coupe.noise_dimensions = "4D"
        coupe.inputs["Scale"].default_value = 0.22 + k * 0.1
        dd = coupe.inputs["W"].driver_add("default_value").driver
        dd.type = "SCRIPTED"
        dd.expression = f"cos({TOUR})*0.5+{k * 3}"
        nt.links.new(coord.outputs["Object"], coupe.inputs["Vector"])
        masque = nt.nodes.new("ShaderNodeMapRange")
        masque.inputs["From Min"].default_value = 0.56
        masque.inputs["From Max"].default_value = 0.66
        nt.links.new(coupe.outputs["Fac"], masque.inputs["Value"])
        fois = nt.nodes.new("ShaderNodeMath")
        fois.operation = "MULTIPLY"
        nt.links.new(r.outputs[0], fois.inputs[0])
        nt.links.new(masque.outputs[0], fois.inputs[1])
        cretes.append(fois)
    max_ = nt.nodes.new("ShaderNodeMath")
    max_.operation = "MAXIMUM"
    nt.links.new(cretes[0].outputs[0], max_.inputs[0])
    nt.links.new(cretes[1].outputs[0], max_.inputs[1])
    # au loin, l'écume s'efface (sinon l'horizon grouille)
    cam = nt.nodes.new("ShaderNodeCameraData")
    loin = nt.nodes.new("ShaderNodeMapRange")
    loin.inputs["From Min"].default_value = 40.0
    loin.inputs["From Max"].default_value = 140.0
    loin.inputs["To Min"].default_value = 1.0
    loin.inputs["To Max"].default_value = 0.0
    nt.links.new(cam.outputs["View Distance"], loin.inputs["Value"])
    ecume = nt.nodes.new("ShaderNodeMath")
    ecume.operation = "MULTIPLY"
    nt.links.new(max_.outputs[0], ecume.inputs[0])
    nt.links.new(loin.outputs[0], ecume.inputs[1])
    # la couleur : trois tons de bleu-violet selon les nappes, puis l'écume par-dessus
    rampe = nt.nodes.new("ShaderNodeValToRGB")
    cr = rampe.color_ramp
    cr.interpolation = "CONSTANT"
    cr.elements[0].position = 0.0
    cr.elements[0].color = B.rgba(0x283a86)
    cr.elements[1].position = 0.46
    cr.elements[1].color = B.rgba(0x33589f)
    e = cr.elements.new(0.6)
    e.color = B.rgba(0x4a77c0)
    nt.links.new(nappes.outputs["Fac"], rampe.inputs["Fac"])
    melange = nt.nodes.new("ShaderNodeMix")
    melange.data_type = "RGBA"
    nt.links.new(ecume.outputs[0], melange.inputs["Factor"])
    nt.links.new(rampe.outputs["Color"], melange.inputs[6])
    melange.inputs[7].default_value = B.rgba(0xfff0f7)
    nt.links.new(melange.outputs[2], bsdf.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    nt.links.new(cretes[0].outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m


def ciel():
    """Le ciel du soir (rose à l'horizon, violet, nuit en haut), par la direction de la vue."""
    monde = bpy.data.worlds.get("accueil_ciel") or bpy.data.worlds.new("accueil_ciel")
    monde.use_nodes = True
    nt = monde.node_tree
    nt.nodes.clear()
    sortie = nt.nodes.new("ShaderNodeOutputWorld")
    fond = nt.nodes.new("ShaderNodeBackground")
    fond.inputs["Strength"].default_value = 1.0
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])
    rampe = nt.nodes.new("ShaderNodeValToRGB")
    cr = rampe.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = B.rgba(0xffb3c6)
    cr.elements[1].position = 0.12
    cr.elements[1].color = B.rgba(0xd8679f)
    e = cr.elements.new(0.32)
    e.color = B.rgba(0x6a2a78)
    e = cr.elements.new(0.75)
    e.color = B.rgba(0x220b30)
    nt.links.new(sep.outputs["Z"], rampe.inputs["Fac"])
    nt.links.new(rampe.outputs["Color"], fond.inputs["Color"])
    nt.links.new(fond.outputs[0], sortie.inputs[0])
    return monde


def emissif(nom, hexa, force=1.0):
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    s = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = B.rgba(hexa)
    e.inputs["Strength"].default_value = force
    nt.links.new(e.outputs[0], s.inputs[0])
    return m


def construire():
    scene = bpy.context.scene
    coll = B.collection("accueil")
    fx = B.collection("accueil_effets")
    # la mer : un grand disque
    bm = B.cyl(400, 400, 0.2, 128)
    me = bpy.data.meshes.new("accueil_mer")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(materiau_mer())
    mer = bpy.data.objects.new("accueil_mer", me)
    fx.objects.link(mer)
    mer.location = (0, 0, -0.18)
    # Port Barhaw, le navire au mouillage, trois mouettes
    _instance(coll, "ile_port", "accueil_port", (0, 0, 0), (0, 0, math.radians(20)))
    nav = _instance(coll, "navire_v4_barhaw", "accueil_navire", (15.8, -6.2, 0.0), (0, 0, math.radians(-128)), 1.0)
    _pilote(nav, "location", 2, f"sin({TOUR}*2)*0.14-0.05")
    _pilote(nav, "rotation_euler", 0, f"sin({TOUR}*2+0.6)*0.035")
    _pilote(nav, "rotation_euler", 1, f"sin({TOUR}*3+1.3)*0.025")
    for k, (cx, cy, cz, r, ph, sens) in enumerate(((13, -4, 9.0, 4.0, 0.0, 1), (8, 1, 10.0, 5.0, 2.1, -1), (17, -9, 7.8, 3.0, 4.0, 1))):
        m = _instance(coll, "mouette", f"accueil_mouette{k}", ech=0.55)
        a = f"({TOUR}*{sens}+{ph})"
        _pilote(m, "location", 0, f"{cx}+cos{a}*{r}")
        _pilote(m, "location", 1, f"{cy}+sin{a}*{r}")
        _pilote(m, "location", 2, f"{cz}+sin({TOUR}*2+{ph})*0.6")
        _pilote(m, "rotation_euler", 2, f"{a}+{1.5708 * sens:.4f}")
        _pilote(m, "rotation_euler", 0, f"{-0.35 * sens:.2f}")
    # les drapeaux et les ailes des mouettes (sur les originaux : toutes les copies bougent)
    ORIGINAUX.clear()
    for o in bpy.data.collections["navire_v4_barhaw"].all_objects:
        if o.get("anim") in ("drapeau", "flamme"):
            _anime_original(o, "rotation_euler", 2, f"sin({TOUR}*6+{len(ORIGINAUX)})*0.28")
    for o in bpy.data.collections["mouette"].all_objects:
        if "aile" in o.name:
            s = 1 if o.name.endswith("_g") else -1
            _anime_original(o, "rotation_euler", 0, f"sin({TOUR}*12)*{0.55 * s:.2f}")
    # le soleil à bandes derrière l'île, et quelques nuages roses
    soleil = bpy.data.meshes.new("accueil_soleil")
    bm = B.cyl(14, 14, 0.2, 48)
    bm.to_mesh(soleil)
    bm.free()
    so = bpy.data.objects.new("accueil_soleil", soleil)
    so.data.materials.append(emissif("accueil_soleil", 0xffe6c8, 1.25))
    fx.objects.link(so)
    so.location = (-170, 95, 9)
    so.rotation_euler = (math.radians(90), 0, math.radians(60))
    for k in range(3):
        z = 3.0 + k * 3.2
        bm = B.boite(2 * math.sqrt(14 ** 2 - (z - 9) ** 2) * 0.98, 0.3, 1.1)
        me = bpy.data.meshes.new(f"accueil_bande{k}")
        bm.to_mesh(me)
        bm.free()
        b = bpy.data.objects.new(f"accueil_bande{k}", me)
        b.data.materials.append(emissif("accueil_bande", 0xff8fb0, 2.0))
        fx.objects.link(b)
        b.location = Vector((-170 + 0.9, 95 - 0.5, z))
        b.rotation_euler = (0, 0, math.radians(60))
    for k, (x, y, z, l) in enumerate(((-120, 160, 26, 40), (-60, 180, 40, 55), (-200, 40, 34, 46), (60, 200, 30, 36))):
        for j in range(4):
            bm = B.sphere(1, 16, 10)
            me = bpy.data.meshes.new(f"accueil_nuage{k}{j}")
            bm.to_mesh(me)
            bm.free()
            n = bpy.data.objects.new(f"accueil_nuage{k}{j}", me)
            n.data.materials.append(emissif("accueil_nuage", 0xffc2d8, 1.1))
            fx.objects.link(n)
            n.location = Vector((x + j * l * 0.22, y, z + (j % 2) * 2))
            n.scale = (l * 0.3, l * 0.12, l * 0.07)
    # la lumière : un soleil chaud, de devant-gauche de la caméra (on voit bien le navire)
    for o in list(coll.objects):
        if o.type == "LIGHT":
            bpy.data.objects.remove(o, do_unlink=True)
    lum = bpy.data.lights.new("accueil_lumiere", "SUN")
    lum.energy = 3.6
    lum.color = B.rgb(0xffe2cc)
    lum.angle = math.radians(6)
    lo = bpy.data.objects.new("accueil_lumiere", lum)
    coll.objects.link(lo)
    # elle vient de derrière la caméra, en hauteur
    lo.rotation_euler = Vector((-0.55, 0.62, -0.62)).normalized().to_track_quat("-Z", "Y").to_euler()
    # la caméra
    cam_d = bpy.data.cameras.new("accueil_cam")
    cam_d.lens = 32
    cam_d.clip_end = 2000
    cam = bpy.data.objects.new("accueil_cam", cam_d)
    coll.objects.link(cam)
    cam.location = (26, -21, 5.4)
    vise = Vector((8.5, -0.5, 3.6))
    cam.rotation_euler = (vise - cam.location).to_track_quat("-Z", "Y").to_euler()
    _pilote(cam, "location", 2, f"5.4+sin({TOUR})*0.2")
    scene.camera = cam
    scene.frame_start, scene.frame_end = 0, IMAGES - 1
    scene.render.fps = 24
    return {"objets": len(coll.objects) + len(fx.objects), "originaux": len(ORIGINAUX)}


def remettre():
    """Enlève les pilotes posés sur les originaux (le navire, la mouette) et leur rend leur pose."""
    import json
    for k, repos in json.loads(bpy.context.scene.get(CLE, "{}")).items():
        nom, chemin, index = k.split("|")
        o = bpy.data.objects.get(nom)
        if o:
            o.driver_remove(chemin, int(index))
            getattr(o, chemin)[int(index)] = repos
    if CLE in bpy.context.scene:
        del bpy.context.scene[CLE]
    ORIGINAUX.clear()


def rendre(taille=(960, 600), qualite=24, image_seule=None, debut=0, fin=IMAGES - 1):
    scene = bpy.context.scene
    garder = {"accueil", "accueil_effets", "ile_port", "navire_v4_barhaw", "mouette"}
    sources = {"ile_port", "navire_v4_barhaw", "mouette"}
    lcs = {lc.name: lc for lc in bpy.context.view_layer.layer_collection.children}
    avant = {n: lcs[n].exclude for n in sources if n in lcs}
    cacher = {c.name: c.hide_render for c in scene.collection.children}
    for c in scene.collection.children:
        c.hide_render = c.name not in garder
    for n in avant:
        lcs[n].exclude = True  # les originaux cachés : seules les copies posées se voient
    monde_avant = scene.world
    scene.world = ciel()
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
    r.line_thickness = 1.25
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("contour")
    ls_avant = (ls.select_by_collection, ls.collection, ls.collection_negation)
    ls.select_by_collection = True
    ls.collection = bpy.data.collections["accueil_effets"]
    ls.collection_negation = "EXCLUSIVE"
    dossier = os.path.join(B.DOSSIER, "rendus", "accueil")
    os.makedirs(dossier, exist_ok=True)
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
        for c in scene.collection.children:
            c.hide_render = cacher.get(c.name, False)
        for n, v in avant.items():
            lcs[n].exclude = v
        scene.world = monde_avant
