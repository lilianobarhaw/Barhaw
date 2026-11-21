# Les images de l'interface au niveau 5 (fond transparent, pour la VF 1.0) :
#   img/iles/<id>-v5.webp : l'île du niveau 5 vue de trois quarts, dans son lagon qui se fond dans le transparent (la liste
#                           des escales, la fiche d'une île, « Terre en vue ! », la carte en 2D), 360 px de large ;
#   img/boss/<id>-v5.webp : le boss du niveau 5 en pied (l'alerte « LE BOSS EST LÀ !!! », l'affiche du combat), 600 px de haut.
# Les images d'avant (img/iles/<id>.webp, img/boss/<id>.webp) restent : le site les montre quand le niveau 5 est coupé.
# Les modèles sont ceux du site (collections ile_<id>_v5, boss_<id>_v5 : leur lumière est cuite dans l'atlas) ; le lagon et
# le ressac sont ceux des vidéos (barhaw_clips_v5). Rien n'est changé pour de bon dans les collections.
# Usage dans Blender :
#   import barhaw_images_v5 as I5 ; I5.une("ile", "phare")   (rendus/images-v5/ile-phare.png, détouré plus tard)
#   I5.lancer()   (les collections qui manquent sont cuites, puis toutes les images ; suivi dans I5.ETAT)
# Puis, sur le container : python3 outils/images_v5.py <dossier des .png> <site>  (recadre, réduit, en .webp)
import json, math, os, time, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_accueil_vf as A
import barhaw_teaser_vf as T0
import barhaw_clips_vf as V4
import barhaw_clips_v5 as C5

ILES = ["port", "moussaillons", "recif", "lucioles", "champignons", "braise", "givre", "engloutie", "vents", "marche", "arbre", "ambre",
        "phare", "tonnerre", "tresor", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"]
BOSS = ["krakor", "morghast", "voraxia"]
DOSSIER = os.path.join(B.DOSSIER, "rendus", "images-v5")
FACE_ILE = V4.FACE_ILE
FACE_BOSS = V4.FACE_BOSS
# les îles dont le module de construction ne suit pas la règle « barhaw_<id>_v5 »
MODULES = {"moussaillons": "barhaw_plage_v5"}
ETAT = {"etapes": [], "fait": [], "en_cours": "", "erreur": "", "fini": False, "debut": 0.0, "durees": {}}


def _lagon(rayon):
    """L'eau autour de l'île : le lagon clair contre la côte, plus profond plus loin, qui s'efface dans le transparent."""
    m = bpy.data.materials.get("image5_lagon") or bpy.data.materials.new("image5_lagon")
    m.use_nodes = True
    m.surface_render_method = "BLENDED"
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    geo = C5._noeud(nt, "ShaderNodeNewGeometry", -1400, 0)
    plat = C5._noeud(nt, "ShaderNodeVectorMath", -1200, 0, operation="MULTIPLY")
    lien(geo.outputs["Position"], plat.inputs[0])
    plat.inputs[1].default_value = (1.0, 1.0, 0.0)
    loin = C5._noeud(nt, "ShaderNodeVectorMath", -1000, 0, operation="LENGTH")
    lien(plat.outputs[0], loin.inputs[0])
    d = C5._maths(nt, "SUBTRACT", loin.outputs["Value"], rayon, -800, 0)
    fb = C5._bruit(nt, geo.outputs["Position"], 1.6, 2.0, w=3.0, x=-1000, y=300)
    dd = C5._maths(nt, "SUBTRACT", d, C5._maths(nt, "MULTIPLY", fb, 1.4, -800, 300), -600, 200)
    lagon = C5._plage(nt, dd, -1.5, 2.6, 1.0, 0.0, -400, 300)
    bas = C5._plage(nt, d, 0.0, 4.0, 1.0, 0.0, -400, 0)
    eau = C5._melange(nt, bas, C5._lin((0.07, 0.36, 0.52)), C5._lin((0.13, 0.66, 0.66)), -200, 0)
    eau = C5._melange(nt, lagon, eau, C5._lin((0.36, 0.80, 0.74)), 0, 100)
    # un peu de relief sur l'eau (les vagues prennent la lumière, comme sur la carte)
    v1 = C5._bruit(nt, geo.outputs["Position"], 0.55, 4.0, w=0.0, x=-800, y=-300)
    v2 = C5._bruit(nt, geo.outputs["Position"], 1.9, 3.0, w=5.0, x=-800, y=-500)
    houle = C5._maths(nt, "ADD", C5._maths(nt, "MULTIPLY", v1, 0.7, -600, -300), C5._maths(nt, "MULTIPLY", v2, 0.3, -600, -500), -400, -400)
    bosse = C5._noeud(nt, "ShaderNodeBump", -200, -400)
    bosse.inputs["Strength"].default_value = 0.4
    bosse.inputs["Distance"].default_value = 0.6
    lien(houle, bosse.inputs["Height"])
    s = Vector(C5.SOLEIL).normalized()
    pente = C5._noeud(nt, "ShaderNodeVectorMath", 0, -400, operation="DOT_PRODUCT")
    lien(bosse.outputs["Normal"], pente.inputs[0])
    pente.inputs[1].default_value = (s.x, s.y, 0.0)
    clair = C5._maths(nt, "ADD", C5._maths(nt, "MULTIPLY", pente.outputs["Value"], 1.25, 200, -400), 1.0, 400, -400)
    eclairee = C5._noeud(nt, "ShaderNodeVectorMath", 400, 0, operation="SCALE")
    lien(eau, eclairee.inputs[0])
    lien(clair, eclairee.inputs["Scale"])
    lum = C5._noeud(nt, "ShaderNodeEmission", 600, 0)
    lien(eclairee.outputs[0], lum.inputs["Color"])
    # l'eau s'efface au large (un bord qui ondule un peu, pas un rond parfait)
    alpha = C5._plage(nt, C5._maths(nt, "SUBTRACT", d, C5._maths(nt, "MULTIPLY", fb, 1.4, 400, 300), 600, 300), -0.4, 2.2, 0.96, 0.0, 800, 300)
    vide = C5._noeud(nt, "ShaderNodeBsdfTransparent", 800, 150)
    mix = C5._noeud(nt, "ShaderNodeMixShader", 1000, 0)
    lien(alpha, mix.inputs[0])
    lien(vide.outputs[0], mix.inputs[1])
    lien(lum.outputs[0], mix.inputs[2])
    sortie = C5._noeud(nt, "ShaderNodeOutputMaterial", 1200, 0)
    lien(mix.outputs[0], sortie.inputs["Surface"])
    return m


def _disque(coll, nom, rayon, materiau, z=0.0):
    me = bpy.data.meshes.get(nom)
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=96, radius=1.0)
        me = bpy.data.meshes.new(nom)
        bm.to_mesh(me)
        bm.free()
    me.materials.clear()
    me.materials.append(materiau)
    o = bpy.data.objects.new(nom, me)
    coll.objects.link(o)
    o.location = (0, 0, z)
    o.scale = (rayon, rayon, 1)
    return o


def _camera(coll, pos, cible, objectif):
    d = bpy.data.cameras.new("image5_cam")
    d.lens = objectif
    d.clip_end = 1000
    c = bpy.data.objects.new("image5_cam", d)
    coll.objects.link(c)
    c.location = Vector(pos)
    c.rotation_euler = (Vector(cible) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return c


def _emprise(nom, centile=96):
    """Le rayon de ce qui dépasse de l'eau (les sommets au-dessus de 5 cm, sans les plus lointains : une jetée ne compte pas)."""
    import numpy as np
    rayons = []
    for o in bpy.data.collections[nom].all_objects:
        if o is None or o.type != "MESH" or o.hide_render:
            continue
        n = len(o.data.vertices)
        if not n:
            continue
        co = np.empty(n * 3, np.float32)
        o.data.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        M = np.array(o.matrix_world)
        w = co @ M[:3, :3].T + M[:3, 3]
        haut = w[w[:, 2] > 0.05]
        if len(haut):
            rayons.append(np.hypot(haut[:, 0], haut[:, 1]))
    if not rayons:
        return None
    return float(np.percentile(np.concatenate(rayons), centile))


def construire_ile(id_):
    coll = V4._vider()
    nom = f"ile_{id_}_v5"
    r = min(C5._repere(nom, "mer", 8.5), (_emprise(nom) or 99.0) + 0.6)  # le lagon autour de ce qui se voit vraiment
    mn, mx = V4._bornes(nom)
    _disque(coll, "image5_eau", r + 4.5, _lagon(r))
    A._instance(coll, nom, "image5_ile", (0, 0, 0))
    f = Vector((math.cos(FACE_ILE), math.sin(FACE_ILE), 0))
    elevation = math.radians(36)
    objectif = 50
    demi = (r + 2.0) / 0.92  # le lagon presque entier dans le cadre (l'image est recadrée ensuite)
    D = demi / math.tan(math.atan(18 / objectif))
    cible = Vector((0, 0, max(1.0, mx.z * 0.28)))
    pos = cible + (f * math.cos(elevation) + Vector((0, 0, math.sin(elevation)))) * D
    cam = _camera(coll, pos, cible, objectif)
    C5._soleil(coll)
    return {"cam": cam.name, "taille": (1600, 1400), "sources": {nom}, "monde": C5.ciel5(), "atlas": _atlas_complet(nom, f"ile-{id_}-v5.png")}


def construire_boss(id_):
    coll = V4._vider()
    nom = f"boss_{id_}_v5"
    mn, mx = V4._bornes(nom)
    A._instance(coll, nom, "image5_boss", (0, 0, 0))
    d = Vector((math.cos(FACE_BOSS), math.sin(FACE_BOSS), 0))
    objectif = 50
    haut = mx.z - min(0.0, mn.z)
    D = (haut * 0.62) / math.tan(math.atan(18 / objectif))
    cible = Vector((0, 0, min(0.0, mn.z) + haut * 0.5))
    pos = cible + (d * math.cos(math.radians(8)) + Vector((0, 0, math.sin(math.radians(8))))) * D
    cam = _camera(coll, pos, cible, objectif)
    C5._soleil(coll, force=2.6)
    return {"cam": cam.name, "taille": (1400, 1600), "sources": {nom}, "monde": C5.ciel5(), "atlas": _atlas_complet(nom, f"{id_}-v5.png")}


def _atlas_complet(nom_coll, fichier):
    """L'image de l'atlas de la collection complète : celle des cuissons « légères » (téléphone) peut être restée dans la
    matière (la dernière cuisson gagne) ; pour le rendu, on remet l'image de la version complète."""
    import barhaw_niveau5 as N
    chemin = os.path.join(N.dossier(), "glb", fichier)
    for o in bpy.data.collections[nom_coll].all_objects:
        for s in getattr(o, "material_slots", []):
            if s.material and s.material.name.startswith("atlas_") and s.material.use_nodes:
                for n in s.material.node_tree.nodes:
                    if n.type == "TEX_IMAGE" and n.image:
                        return (n.image, chemin)
    return None


def _rendre(info, chemin, qualite=48):
    """Le rendu, fond transparent (EEVEE). Ce qui est retouché pour le rendu est remis comme avant à la fin."""
    scene = bpy.context.scene
    vl = bpy.context.view_layer
    sources = info["sources"]
    garder = {"clips"} | sources
    objets = [o for n in sources for o in bpy.data.collections[n].all_objects if o is not None]
    lcs = {lc.name: lc for lc in vl.layer_collection.children}
    clips = bpy.data.collections["clips"]
    remettre, mailles, clairs = [], [], []
    image_avant = None

    def poser(o, attr, valeur):
        remettre.append((o, attr, getattr(o, attr)))
        setattr(o, attr, valeur)

    try:
        if info.get("atlas"):
            im, voulu = info["atlas"]
            if os.path.normcase(bpy.path.abspath(im.filepath)) != os.path.normcase(voulu) and os.path.exists(voulu):
                image_avant = (im, im.filepath)
                im.filepath = voulu
                im.reload()
        for c in scene.collection.children:
            poser(c, "hide_render", c.name not in garder)
        for o in list(scene.collection.objects):
            if o.name not in clips.objects:
                poser(o, "hide_render", True)
        ressac, ombre = C5._ecume_rivage(), C5._ombre_rivage()
        for o in objets:
            if o.type != "MESH":
                continue
            noms = [s.material.name if s.material else "" for s in o.material_slots]
            if "ecume" in noms or "ombre_eau" in noms:
                if all(o.data != me for me, _ in mailles):
                    mailles.append((o.data, list(o.data.materials)))
                    for i, nom in enumerate(noms):
                        if nom == "ecume":
                            o.data.materials[i] = ressac
                        elif nom == "ombre_eau":
                            o.data.materials[i] = ombre
                poser(o, "hide_render", False)
            elif o.name.startswith("ile_vitres"):
                poser(o, "hide_render", True)
        for nom, opacite in C5.OPACITE.items():
            mat = bpy.data.materials.get(nom)
            b = mat and mat.use_nodes and next((x for x in mat.node_tree.nodes if x.type == "BSDF_PRINCIPLED"), None)
            if b:
                clairs.append((b, b.inputs["Alpha"].default_value))
                b.inputs["Alpha"].default_value = opacite
        for n in sources:
            if n in lcs:
                poser(lcs[n], "exclude", True)
        r = scene.render
        for objet, attr, valeur in ((r, "engine", "BLENDER_EEVEE"), (r, "resolution_x", info["taille"][0]), (r, "resolution_y", info["taille"][1]),
                                    (r, "resolution_percentage", 100), (r, "film_transparent", True), (r, "use_freestyle", False),
                                    (scene.view_settings, "view_transform", "Standard"), (scene.view_settings, "look", "None"),
                                    (scene.view_settings, "exposure", 0.0), (scene.view_settings, "gamma", 1.0),
                                    (scene, "world", info["monde"]), (scene, "camera", bpy.data.objects[info["cam"]])):
            poser(objet, attr, valeur)
        try:
            poser(scene.eevee, "taa_render_samples", qualite)
        except Exception:
            pass
        try:
            r.image_settings.media_type = "IMAGE"
        except Exception:
            pass
        r.image_settings.file_format = "PNG"
        r.image_settings.color_mode = "RGBA"
        r.image_settings.color_depth = "8"
        os.makedirs(os.path.dirname(chemin), exist_ok=True)
        scene.frame_set(60)  # (les ressacs et l'écume sont animés : une image prise au milieu)
        r.filepath = chemin
        bpy.ops.render.render(write_still=True)
        return chemin
    finally:
        for b, alpha in clairs:
            b.inputs["Alpha"].default_value = alpha
        for me, mats in mailles:
            for i, mat in enumerate(mats):
                me.materials[i] = mat
        for objet, attr, valeur in reversed(remettre):
            try:
                setattr(objet, attr, valeur)
            except Exception:
                pass
        if image_avant:
            im, ancien = image_avant
            im.filepath = ancien
            im.reload()


def une(genre, id_):
    info = construire_boss(id_) if genre == "boss" else construire_ile(id_)
    try:
        return _rendre(info, os.path.join(DOSSIER, f"{genre}-{id_}.png"))
    finally:
        V4._vider()


def manquantes(iles=ILES, boss=BOSS):
    voulues = [f"ile_{i}_v5" for i in iles] + [f"boss_{b}_v5" for b in boss]
    faire = []
    for nom in voulues:
        c = bpy.data.collections.get(nom)
        cuite = c is not None and any(s.material and s.material.name.startswith("atlas_") for o in c.all_objects for s in o.material_slots)
        if not cuite:
            faire.append(nom)
    return faire


def _cuire(nom):
    import importlib
    if nom.startswith("ile_"):
        id_ = nom[4:-3]
        mod = importlib.import_module(MODULES.get(id_, f"barhaw_{id_}_v5"))
        infos = mod.construire(rendu=False, exporter=False)
    else:
        raise RuntimeError(f"{nom} : à cuire à la main (barhaw_boss_v5)")
    return {k: v for k, v in (infos or {}).items() if isinstance(v, (int, float, str, list))}


def _bilan():
    try:
        with open(os.path.join(DOSSIER, "bilan-images-v5.json"), "w", encoding="utf-8") as f:
            json.dump(ETAT, f, ensure_ascii=False, indent=1, default=str)
    except Exception:
        pass


def lancer(iles=ILES, boss=BOSS):
    """Tout, une étape à la fois (bpy.app.timers) : les cuissons qui manquent, puis les images."""
    os.makedirs(DOSSIER, exist_ok=True)
    etapes = [("cuire", n) for n in manquantes(iles, boss)] + [("ile", i) for i in iles] + [("boss", b) for b in boss]
    ETAT.update({"etapes": [f"{g}:{i}" for g, i in etapes], "fait": [], "en_cours": "", "erreur": "", "fini": False, "debut": time.time(), "durees": {}})
    file = list(etapes)

    def suivante():
        if not file:
            ETAT["fini"] = True
            ETAT["en_cours"] = ""
            _bilan()
            return None
        genre, id_ = file.pop(0)
        ETAT["en_cours"] = f"{genre}:{id_}"
        _bilan()
        t0 = time.time()
        try:
            if genre == "cuire":
                ETAT.setdefault("cuissons", {})[id_] = _cuire(id_)
            else:
                une(genre, id_)
        except Exception as e:
            import traceback
            ETAT["erreur"] = f"{genre}:{id_} : {e!r}"
            ETAT["trace"] = traceback.format_exc()[-1500:]
            ETAT["fini"] = True
            _bilan()
            return None
        ETAT["durees"][f"{genre}:{id_}"] = round(time.time() - t0, 1)
        ETAT["fait"].append(f"{genre}:{id_}")
        _bilan()
        return 0.5

    bpy.app.timers.register(suivante, first_interval=0.5)
    return ETAT["etapes"]
