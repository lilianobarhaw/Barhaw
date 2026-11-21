# Le générique de GRAND LINE (VF 1.0) : les plans 3D, en 1920 × 1080 à 30 images/s (EEVEE).
# Une ouverture de nuit dans le brouillard (le vaisseau fantôme du capitaine Calcaire), une montée où l'on devine les îles,
# le monstre et les boss dans le noir, puis le plein jour sur GRAND LINE : les îles et leurs maîtres, la baleine, le monstre,
# les trois boss. Tout est inventé (les modèles du niveau 5 du site) : aucun navire d'équipage, aucun drapeau de commu.
# Les modèles du niveau 5 ont leur lumière cuite dans l'atlas (une matière « émission ») : la nuit, on les assombrit et on
# leur ajoute un liseré de lune (_nuit_poser), le temps du rendu ; tout est remis comme avant à la fin (_nuit_retirer).
# Usage dans Blender :
#   import barhaw_generique_vf as G ; G.essai("brume_proue", 40)       (une image d'essai : rendus/generique/essai-<plan>-40.png)
#   G.lancer(["brume_proue", ...])   (les plans, l'un après l'autre par bpy.app.timers ; le suivi dans rendus/generique/bilan.json)
# Chaque plan sort en images (rendus/generique/<plan>/img-NNNN.png) puis en .mp4 presque sans perte (rendus/generique/<plan>.mp4).
import json, math, os, time, bpy
from mathutils import Vector, Euler, Matrix
import barhaw_base as B
import barhaw_accueil_vf as A
import barhaw_teaser_vf as T0
import barhaw_clips_vf as V4
import barhaw_clips_v5 as C5

FPS = 30
TAILLE = (1920, 1080)
DOSSIER = os.path.join(B.DOSSIER, "rendus", "generique")
GLB = os.path.join(B.DOSSIER, "glb")
ETAT = {"etapes": [], "fait": [], "en_cours": "", "erreur": "", "fini": False, "debut": 0.0, "durees": {}}
LUNE = Vector((0.55, 0.62, 0.32)).normalized()  # d'où vient la lumière de la lune (haute, de côté, un peu de face)


# ---------------------------------------------------------------------------------------------------------------------
# 1. Les modèles qui ne sont pas dans le fichier : le vaisseau fantôme, le monstre, la vie en mer (leurs .glb du niveau 5)
# ---------------------------------------------------------------------------------------------------------------------
def _axe_blender(a):
    """Un axe du site (glTF, y vers le haut) dans Blender (z vers le haut)."""
    x, y, z = a
    return Vector((x, -z, y))


def _emission(mat, force=1.0, couleur=None, image=None):
    """Une matière importée (base noire + émission) -> l'émission seule, comme les modèles cuits du fichier. Le .glb n'a pas
    son atlas (le site le charge à part) : image, l'atlas cuit (glb/<modèle>.png)."""
    nt = mat.node_tree
    img = image
    for n in nt.nodes:
        if n.type == "TEX_IMAGE" and img is None:
            img = n.image
    if couleur is None:
        for n in nt.nodes:
            if n.type == "BSDF_PRINCIPLED":
                c = n.inputs["Emission Color"].default_value
                couleur = (c[0], c[1], c[2], 1.0)
                force = max(force, n.inputs["Emission Strength"].default_value)
    nt.nodes.clear()
    sortie = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = force
    if img is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        tex.interpolation = "Linear"
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = couleur or (1, 1, 1, 1)
    if img is None:  # une lueur : le cœur plein, les bords qui s'effacent dans l'air
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.5
        inv = nt.nodes.new("ShaderNodeMath")
        inv.operation = "POWER"
        nt.links.new(lw.outputs["Facing"], inv.inputs[0])
        inv.inputs[1].default_value = 1.6
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mx = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(inv.outputs[0], mx.inputs[0])
        nt.links.new(em.outputs[0], mx.inputs[1])
        nt.links.new(tr.outputs[0], mx.inputs[2])
        nt.links.new(mx.outputs[0], sortie.inputs["Surface"])
        try:
            mat.surface_render_method = "BLENDED"
        except Exception:
            pass
    else:
        nt.links.new(em.outputs[0], sortie.inputs["Surface"])
    mat["gen_lueur"] = img is None  # ce qui brille par soi-même (le vert du spectre, les lanternes) : la nuit ne l'éteint pas


def _anime(o):
    """Les pièces qui bougent, comme le site les anime (leurs « extras » : balance, drapeau, clignote, tourne, flotte)."""
    anim = o.get("anim")
    if not anim or o.get("role") == "repere":
        return
    t = f"(frame/{FPS})"
    ph = float(o.get("phase", 0.0))
    if anim == "balance":
        axe = _axe_blender(o.get("axe", (1, 0, 0)))
        ampl, v = float(o.get("ampl", 0.2)), float(o.get("vitesse", 1.0))
        i = max(range(3), key=lambda k: abs(axe[k]))
        o.rotation_mode = {0: "XYZ", 1: "XZY", 2: "ZYX"}[i]  # l'axe de la balance tourne en premier (après la pose de repos)
        repos = o.rotation_euler[i]
        signe = 1 if axe[i] >= 0 else -1
        A._pilote(o, "rotation_euler", i, f"{repos:.5f}+{signe}*sin({t}*{v:.4f}+{ph:.4f})*{ampl:.4f}")
    elif anim == "drapeau":  # les voiles et le fanion battent autour du mât
        o.rotation_mode = "ZYX"
        repos = o.rotation_euler[2]
        A._pilote(o, "rotation_euler", 2, f"{repos:.5f}+sin({t}*2.3+{ph:.3f})*0.07+sin({t}*5.7+{ph * 1.7:.3f})*0.03")
        A._pilote(o, "scale", 0, f"1+sin({t}*3.1+{ph:.3f})*0.05")
    elif anim == "clignote":
        for k in range(3):
            A._pilote(o, "scale", k, f"1+sin({t}*13.0+{k})*0.06*sin({t}*7.3)+sin({t}*21.0)*0.03")
    elif anim == "tourne":
        axe = _axe_blender(o.get("axe", (0, 1, 0)))
        v = float(o.get("vitesse", 0.5))
        i = max(range(3), key=lambda k: abs(axe[k]))
        signe = 1 if axe[i] >= 0 else -1
        A._pilote(o, "rotation_euler", i, f"{o.rotation_euler[i]:.5f}+{signe}*{t}*{v:.4f}")
    elif anim == "flotte":
        ampl = float(o.get("ampl", 0.3))
        A._pilote(o, "location", 2, f"{o.location.z:.5f}+sin({t}*1.3+{ph:.3f})*{ampl:.4f}")


def oublier(nom):
    """Retire un modèle importé (ses objets, ses maillages, ses matières), pour le réimporter."""
    coll = bpy.data.collections.get("gen_" + nom.replace("-", "_"))
    if not coll:
        return
    mailles, mats = set(), set()
    for o in list(coll.all_objects):
        if o.type == "MESH":
            mailles.add(o.data)
            mats.update(s.material for s in o.material_slots if s.material)
        bpy.data.objects.remove(o)
    bpy.data.collections.remove(coll)
    for me in mailles:
        if me.users == 0:
            bpy.data.meshes.remove(me)
    for m in mats:
        if m.users == 0:
            bpy.data.materials.remove(m)


def importer(nom):
    """Le modèle glb/<nom>.glb dans sa collection « gen_<nom> » (une seule fois), exclue de la vue : on la pose en instances."""
    coll_nom = "gen_" + nom.replace("-", "_")
    if coll_nom in bpy.data.collections and len(bpy.data.collections[coll_nom].all_objects):
        return coll_nom
    coll = bpy.data.collections.get(coll_nom) or bpy.data.collections.new(coll_nom)
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    vl = bpy.context.view_layer
    lc = next(l for l in vl.layer_collection.children if l.collection == coll)
    lc.exclude = False
    actif = vl.active_layer_collection
    vl.active_layer_collection = lc
    avant = set(bpy.data.materials)
    try:
        bpy.ops.import_scene.gltf(filepath=os.path.join(GLB, nom + ".glb"))
    finally:
        vl.active_layer_collection = actif
    atlas = os.path.join(GLB, nom + ".png")
    for mat in set(bpy.data.materials) - avant:
        if not mat.use_nodes:
            continue
        if mat.name.startswith("atlas_") and os.path.exists(atlas):
            _emission(mat, 1.0, image=bpy.data.images.load(atlas, check_existing=True))
        else:
            _emission(mat, 2.2)
    for o in [o for o in coll.all_objects if o is not None]:
        try:
            o.select_set(False)
        except Exception:
            pass
        _anime(o)
        if o.name.startswith("fantome_flammes"):
            o.hide_render = True  # les flammes du site (des cônes) : en gros plan, des lumières vertes les remplacent
        if o.name.startswith("fantome_follets"):
            o.hide_render = True  # des gouttes plates : remplacées par de petites boules lumineuses (_feux_follets)
    for mat in set(bpy.data.materials) - avant:
        if mat.get("gen_lueur"):
            for n in mat.node_tree.nodes:
                if n.type == "EMISSION":
                    n.inputs["Strength"].default_value = 1.5
    lc.exclude = True
    return coll_nom


# ---------------------------------------------------------------------------------------------------------------------
# 2. La nuit sur les modèles cuits : l'atlas assombri et bleui, un liseré de lune ; ce qui brille (vert, lanternes) reste
# ---------------------------------------------------------------------------------------------------------------------
NUIT = {"noeuds": []}  # (matière, [nœuds ajoutés], (sortie d'origine -> entrée)) : pour tout remettre


def _nuit_poser(sombre=0.13, teinte=(0.62, 0.72, 1.0), lisere=(0.30, 0.42, 0.75), force_lisere=0.9, garder=1.0, matieres=None,
                eclairs=(), seuils=((0.55, 0.85), (0.62, 0.92))):
    """Chaque matière d'atlas : couleur × (sombre × teinte) + liseré (Fresnel) ; les pixels très saturés et clairs (les
    lueurs cuites : sabords verts, fenêtres, lanternes) gardent leur éclat (garder : 1 = tout leur éclat)."""
    _nuit_retirer()
    for mat in matieres or bpy.data.materials:
        if not mat.use_nodes or not mat.name.startswith("atlas_"):
            continue
        nt = mat.node_tree
        em = next((n for n in nt.nodes if n.type == "EMISSION"), None)
        if not em or not em.inputs["Color"].is_linked:
            continue
        src = em.inputs["Color"].links[0].from_socket
        ajout = []
        def nv(t, **k):
            n = nt.nodes.new(t)
            for a, b in k.items():
                setattr(n, a, b)
            ajout.append(n)
            return n
        # la lueur : saturation et clarté hautes (les couleurs cuites qui « brillent »)
        hsv = nv("ShaderNodeSeparateColor", mode="HSV")
        nt.links.new(src, hsv.inputs[0])
        s = nv("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        nt.links.new(hsv.outputs[1], s.inputs["Value"])
        s.inputs["From Min"].default_value, s.inputs["From Max"].default_value = seuils[0]
        v = nv("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        nt.links.new(hsv.outputs[2], v.inputs["Value"])
        v.inputs["From Min"].default_value, v.inputs["From Max"].default_value = seuils[1]
        lueur = nv("ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(s.outputs[0], lueur.inputs[0])
        nt.links.new(v.outputs[0], lueur.inputs[1])
        f = nv("ShaderNodeMapRange")  # le facteur de nuit : sombre, ou garder pour les lueurs
        nt.links.new(lueur.outputs[0], f.inputs["Value"])
        f.inputs["To Min"].default_value, f.inputs["To Max"].default_value = sombre, garder
        if eclairs:  # l'éclair : le modèle s'éclaire d'un coup (presque sa couleur de jour), puis retombe dans le noir
            flash = "+".join(f"max(0,1-abs(frame-{e}-1)/2.2)" for e in eclairs)
            d = f.inputs["To Min"].driver_add("default_value").driver
            d.type = "SCRIPTED"
            d.expression = f"{sombre}+min(1,{flash})*{0.85 - sombre:.3f}"
        nuit = nv("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
        nuit.inputs[0].default_value = 1.0
        nt.links.new(src, nuit.inputs[6])
        nuit.inputs[7].default_value = (*teinte, 1.0)
        fois = nv("ShaderNodeVectorMath", operation="SCALE")
        nt.links.new(nuit.outputs[2], fois.inputs[0])
        nt.links.new(f.outputs[0], fois.inputs["Scale"])
        # le liseré : Fresnel (les bords tournés loin de la caméra), teinté, plus fort sur les parties claires
        lw = nv("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.35
        p = nv("ShaderNodeMath", operation="POWER")
        nt.links.new(lw.outputs["Facing"], p.inputs[0])
        p.inputs[1].default_value = 3.0
        q = nv("ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(p.outputs[0], q.inputs[0])
        q.inputs[1].default_value = force_lisere
        bord = nv("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
        bord.inputs[0].default_value = 1.0
        nt.links.new(src, bord.inputs[6])
        bord.inputs[7].default_value = (*lisere, 1.0)
        bf = nv("ShaderNodeVectorMath", operation="SCALE")
        nt.links.new(bord.outputs[2], bf.inputs[0])
        nt.links.new(q.outputs[0], bf.inputs["Scale"])
        somme = nv("ShaderNodeVectorMath", operation="ADD")
        nt.links.new(fois.outputs[0], somme.inputs[0])
        nt.links.new(bf.outputs[0], somme.inputs[1])
        nt.links.new(somme.outputs[0], em.inputs["Color"])
        NUIT["noeuds"].append((mat, ajout, src, em))


def _nuit_retirer():
    for mat, ajout, src, em in NUIT["noeuds"]:
        try:
            nt = mat.node_tree
            for n in ajout:
                for e in n.inputs:
                    try:
                        e.driver_remove("default_value")
                    except Exception:
                        pass
                nt.nodes.remove(n)
            nt.links.new(src, em.inputs["Color"])
        except Exception:
            pass
    NUIT["noeuds"] = []


# ---------------------------------------------------------------------------------------------------------------------
# 3. La nuit : la mer noire qui reflète, le ciel, le brouillard (un volume dans le monde), la lune
# ---------------------------------------------------------------------------------------------------------------------
def mer_nuit(nom="gen_mer_nuit", calme=1.0):
    """Une eau noire et lisse qui reflète la lune, les lanternes et le brouillard (les vagues : une normale qui bouge)."""
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    n = lambda t, x, y, **k: C5._noeud(nt, t, x, y, **k)
    sortie = n("ShaderNodeOutputMaterial", 900, 0)
    bsdf = n("ShaderNodeBsdfPrincipled", 600, 0)
    bsdf.inputs["Base Color"].default_value = (0.002, 0.004, 0.008, 1)
    bsdf.inputs["Roughness"].default_value = 0.11
    bsdf.inputs["IOR"].default_value = 1.33
    geo = n("ShaderNodeNewGeometry", -900, 0)
    glisse = n("ShaderNodeMapping", -700, 0)
    nt.links.new(geo.outputs["Position"], glisse.inputs["Vector"])
    for i, v in ((0, 0.25), (1, 0.12)):
        d = glisse.inputs["Location"].driver_add("default_value", i).driver
        d.type = "SCRIPTED"
        d.expression = f"frame*{v / FPS:.6f}"
    v1 = C5._bruit(nt, glisse.outputs[0], 0.35, 4.0, w=0.0, vitesse=0.18, x=-500, y=0)
    v2 = C5._bruit(nt, glisse.outputs[0], 1.6, 3.0, w=4.0, vitesse=0.4, x=-500, y=-250)
    houle = C5._maths(nt, "ADD", C5._maths(nt, "MULTIPLY", v1, 0.75, -300, 0), C5._maths(nt, "MULTIPLY", v2, 0.25, -300, -250), -150, -100)
    bosse = n("ShaderNodeBump", 200, -200)
    bosse.inputs["Strength"].default_value = 0.55 * calme
    bosse.inputs["Distance"].default_value = 0.5
    nt.links.new(houle, bosse.inputs["Height"])
    nt.links.new(bosse.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs[0], sortie.inputs["Surface"])
    return m


def ciel_nuit(nom="gen_ciel_nuit", brume=0.0, couleur_brume=(0.66, 0.71, 0.80), etoiles=True, aube=0.0, lune=None):
    """Le ciel de nuit (bleu nuit à l'horizon, noir en haut, quelques étoiles, la lune et son halo) et le brouillard du
    monde (un volume). lune : la direction de la lune (vers elle), ou None."""
    w = bpy.data.worlds.get(nom) or bpy.data.worlds.new(nom)
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    n = lambda t, x, y, **k: C5._noeud(nt, t, x, y, **k)
    sortie = n("ShaderNodeOutputWorld", 900, 0)
    coord = n("ShaderNodeTexCoord", -900, 0)
    sep = n("ShaderNodeSeparateXYZ", -700, 0)
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])
    rampe = n("ShaderNodeValToRGB", -500, 0)
    cr = rampe.color_ramp
    bas = (0.016 + 0.25 * aube, 0.024 + 0.12 * aube, 0.045 + 0.05 * aube)
    cr.elements[0].position, cr.elements[0].color = 0.0, (*bas, 1)
    cr.elements[1].position, cr.elements[1].color = 0.5, (0.004, 0.006, 0.014, 1)
    e = cr.elements.new(0.08)
    e.color = (0.008 + 0.05 * aube, 0.012 + 0.03 * aube, 0.026, 1)
    nt.links.new(sep.outputs["Z"], rampe.inputs["Fac"])
    couleur = rampe.outputs["Color"]
    if etoiles:
        vor = n("ShaderNodeTexVoronoi", -500, -300)
        vor.feature = "F1"
        nt.links.new(coord.outputs["Generated"], vor.inputs["Vector"])
        vor.inputs["Scale"].default_value = 420.0
        pt = C5._plage(nt, vor.outputs["Distance"], 0.03, 0.0, 0.0, 1.0, -300, -300)
        tri = C5._plage(nt, C5._bruit(nt, coord.outputs["Generated"], 60.0, 1.0, x=-500, y=-500), 0.62, 0.75, 0.0, 1.0, -300, -500)
        haut = C5._plage(nt, sep.outputs["Z"], 0.04, 0.2, 0.0, 1.0, -300, -650)
        e2 = C5._maths(nt, "MULTIPLY", C5._maths(nt, "MULTIPLY", pt, tri, -100, -400), haut, 50, -450)
        e3 = C5._maths(nt, "MULTIPLY", e2, 1.6, 200, -450)
        add = n("ShaderNodeMix", 400, -100, data_type="RGBA", blend_type="ADD")
        nt.links.new(e3, add.inputs[0])
        nt.links.new(couleur, add.inputs[6])
        add.inputs[7].default_value = (0.85, 0.9, 1.0, 1)
        couleur = add.outputs[2]
    if lune is not None:
        lv = Vector(lune).normalized()
        dl = n("ShaderNodeVectorMath", -500, 300, operation="DOT_PRODUCT")
        nt.links.new(coord.outputs["Generated"], dl.inputs[0])
        dl.inputs[1].default_value = tuple(lv)
        cosd = dl.outputs["Value"]
        disque = C5._plage(nt, cosd, math.cos(math.radians(0.95)), math.cos(math.radians(0.8)), 0.0, 14.0, -300, 300)
        halo1 = C5._maths(nt, "MULTIPLY", C5._maths(nt, "POWER", C5._maths(nt, "MAXIMUM", cosd, 0.0, -300, 450), 900.0, -150, 450), 1.6, 0, 450)
        halo2 = C5._maths(nt, "MULTIPLY", C5._maths(nt, "POWER", C5._maths(nt, "MAXIMUM", cosd, 0.0, -300, 600), 40.0, -150, 600), 0.10, 0, 600)
        tot = C5._maths(nt, "ADD", C5._maths(nt, "ADD", disque, halo1, 150, 400), halo2, 300, 450)
        add2 = n("ShaderNodeMix", 450, 200, data_type="RGBA", blend_type="ADD")
        nt.links.new(tot, add2.inputs[0])
        nt.links.new(couleur, add2.inputs[6])
        add2.inputs[7].default_value = (0.80, 0.86, 1.0, 1)
        couleur = add2.outputs[2]
    fond = n("ShaderNodeBackground", 600, 0)
    nt.links.new(couleur, fond.inputs["Color"])
    fond.inputs["Strength"].default_value = 1.0
    nt.links.new(fond.outputs[0], sortie.inputs["Surface"])
    if brume > 0:  # attention : un volume du monde éteint la lune (EEVEE le croit infini) ; préférer banc_brume
        vol = n("ShaderNodeVolumePrincipled", 600, -300)
        vol.inputs["Color"].default_value = (*couleur_brume, 1)
        vol.inputs["Density"].default_value = brume
        vol.inputs["Anisotropy"].default_value = 0.55  # la brume s'éclaire surtout vers la lune et autour des lanternes
        nt.links.new(vol.outputs[0], sortie.inputs["Volume"])
    return w


def banc_brume(coll, densite=0.09, hauteur=7.0, taille=260.0, centre=(0, 0), vent=(0.6, 0.15), couleur=(0.70, 0.75, 0.84), nom="gen_brume"):
    """Un banc de brume posé sur la mer : épais au ras de l'eau, il s'efface en montant (les mâts en sortent, la lune se voit
    au-dessus) ; des nappes plus denses que le vent pousse (un bruit qui glisse)."""
    import bmesh
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nom, me)
    coll.objects.link(o)
    o.location = (centre[0], centre[1], hauteur * 1.5)
    o.scale = (taille, taille, hauteur * 3.0)
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    n = lambda t, x, y, **k: C5._noeud(nt, t, x, y, **k)
    sortie = n("ShaderNodeOutputMaterial", 800, 0)
    vol = n("ShaderNodeVolumePrincipled", 500, 0)
    vol.inputs["Color"].default_value = (*couleur, 1)
    vol.inputs["Anisotropy"].default_value = 0.5
    geo = n("ShaderNodeNewGeometry", -900, 0)
    sep = n("ShaderNodeSeparateXYZ", -700, 200)
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    # épais en bas, presque rien au-dessus de « hauteur »
    profil = C5._plage(nt, sep.outputs["Z"], hauteur, 0.0, 0.0, 1.0, -500, 200)
    glisse = n("ShaderNodeMapping", -700, -200)
    nt.links.new(geo.outputs["Position"], glisse.inputs["Vector"])
    for i, v in ((0, vent[0]), (1, vent[1])):
        d = glisse.inputs["Location"].driver_add("default_value", i).driver
        d.type = "SCRIPTED"
        d.expression = f"-frame*{v / FPS:.6f}"
    nappes = C5._bruit(nt, glisse.outputs[0], 0.06, 3.0, w=2.0, vitesse=0.05, x=-500, y=-200)
    trous = C5._plage(nt, nappes, 0.36, 0.62, 0.25, 1.35, -300, -200)
    d1 = C5._maths(nt, "MULTIPLY", profil, trous, -100, 0)
    d2 = C5._maths(nt, "ADD", C5._maths(nt, "MULTIPLY", d1, densite, 100, 0), densite * 0.04, 300, 0)
    nt.links.new(d2, vol.inputs["Density"])
    nt.links.new(vol.outputs[0], sortie.inputs["Volume"])
    me.materials.append(m)
    o.display_type = "WIRE"
    return o


def _lampe(coll, nom, genre, couleur, force, loc=(0, 0, 0), rot=None, taille=None, rayon=None, parent=None):
    d = bpy.data.lights.new(nom, genre)
    d.color = couleur
    d.energy = force
    if taille is not None and genre == "AREA":
        d.size = taille
    if rayon is not None and genre in ("POINT", "SPOT"):
        d.shadow_soft_size = rayon
    if genre == "SUN":
        d.angle = math.radians(1.0)
    o = bpy.data.objects.new(nom, d)
    coll.objects.link(o)
    o.location = Vector(loc)
    if rot is not None:
        o.rotation_euler = rot
    if parent is not None:
        o.parent = parent
    return o


def _lune(coll, force=0.9, couleur=(0.70, 0.78, 1.0), direction=None):
    """La lune : une lumière lointaine (direction : vers elle)."""
    o = _lampe(coll, "gen_lune", "SUN", couleur, force)
    v = Vector(direction or LUNE).normalized()
    o.rotation_euler = (-v).to_track_quat("-Z", "Y").to_euler()
    return o


def lune_derriere(cam, cible, decalage=8.0, hauteur=9.0):
    """La direction de la lune (vers elle) : dans l'axe de la caméra, décalée de « decalage » degrés sur le côté (à gauche
    si positif) et « hauteur » degrés au-dessus de l'horizon."""
    v = Vector(cible) - Vector(cam)
    a = math.atan2(v.y, v.x) + math.radians(decalage)
    h = math.radians(hauteur)
    return (math.cos(a) * math.cos(h), math.sin(a) * math.cos(h), math.sin(h))


def _plan_mer(coll, mat, nom="gen_mer"):
    me = bpy.data.meshes.get(nom)
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=4, y_segments=4, size=1000)
        me = bpy.data.meshes.new(nom)
        bm.to_mesh(me)
        bm.free()
    me.materials.clear()
    me.materials.append(mat)
    o = bpy.data.objects.new(nom, me)
    coll.objects.link(o)
    return o


def _cam(coll, cles, lens=35.0, nom="gen_cam", doux=True):
    """Une caméra qui vise une cible ; cles : (image, position, cible). doux : les mouvements s'accélèrent et freinent."""
    cam = T0._camera(coll, nom, cles, lens)
    cam.data.sensor_width = 36.0
    cam.data.clip_start = 0.05
    if not doux:
        T0._lineaire(cam)
        T0._lineaire(bpy.data.objects[nom + "_cible"])
    return cam


def _cles(o, chemin, cles, lineaire=False):
    V4._cles(o, chemin, cles)
    if lineaire:
        T0._lineaire(o)


# ---------------------------------------------------------------------------------------------------------------------
# 4. Les plans de nuit : le vaisseau fantôme dans le brouillard
# ---------------------------------------------------------------------------------------------------------------------
def _scene_brume(coll, brume=0.06, avance=(0.0, 0.0), images=(0, 200), lanternes=1.0, lune=None, force_lune=1.6):
    """Le vaisseau fantôme (son .glb, à l'échelle 1,5 comme sur le site) qui avance doucement vers +X, la mer noire, la lune,
    les lumières vertes qui éclairent le brouillard. Renvoie le vaisseau (l'instance)."""
    src = importer("fantome-v5")
    _plan_mer(coll, mer_nuit())
    banc_brume(coll, densite=brume * 1.6)
    nav = A._instance(coll, src, "gen_fantome", (avance[0], 0, 0), (0, 0, 0), 1.5)
    # il avance (de avance[0] à avance[1] en X sur les images), il tangue et roule doucement (comme le site)
    _cles(nav, "location", [(images[0], (avance[0], 0, 0)), (images[1], (avance[1], 0, 0))], lineaire=True)
    A._pilote(nav, "location", 2, "sin(frame/30*1.1)*0.22-0.1")
    A._pilote(nav, "rotation_euler", 0, "sin(frame/30*0.9)*0.045")
    A._pilote(nav, "rotation_euler", 1, "sin(frame/30*0.7+1.0)*0.02")
    # les lumières vertes (lanternes, sabords, flammes) : elles éclairent le brouillard autour du navire
    for k, (x, y, z, f) in enumerate(((5.8, 0.0, 3.0, 70), (-4.6, 0.0, 3.9, 90), (0.6, 2.0, 1.9, 35), (0.6, -2.0, 1.9, 35), (-2.4, 0.0, 6.8, 30))):
        lu = _lampe(coll, f"gen_vert{k}", "POINT", (0.35, 1.0, 0.6), f * lanternes, (x, y, z), rayon=0.35, parent=nav)
        try:
            lu.data.volume_factor = 0.45  # elles teintent la brume autour d'elles, sans la noyer de vert
        except Exception:
            pass
        A._pilote(lu.data, "energy", -1, f"{f * lanternes}*(1+0.22*sin(frame*0.37+{k})*sin(frame*0.13+{k * 2}))")
    lu = _lune(coll, force=force_lune, direction=lune)
    try:
        lu.data.volume_factor = 1.4
    except Exception:
        pass
    return nav


def _contre_jour(coll, loc, vise, force=6000.0, taille=30.0, couleur=(0.62, 0.72, 0.95)):
    """Une grande lumière froide derrière le sujet, tournée vers la caméra : la brume s'éclaire, le navire se découpe."""
    o = _lampe(coll, "gen_contre_jour", "AREA", couleur, force, loc, taille=taille)
    o.rotation_euler = (Vector(vise) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


def _reglages_nuit(scene, echantillons=48):
    """EEVEE : le brouillard (volumes), ses ombres, les reflets sur l'eau (lancer de rayons)."""
    e = scene.eevee
    r = {}
    # la plage des volumes : sans elle, EEVEE étale le brouillard jusqu'au bout de la caméra (2000) et il disparaît ;
    # pas d'ombre du brouillard sur lui-même (la lune basse ne passerait plus), mais les voiles font bien leurs rayons
    for a, v in (("use_volume_custom_range", True), ("use_volumetric_shadows", False), ("volumetric_tile_size", "4"), ("volumetric_samples", 96),
                 ("volumetric_end", 150.0), ("volumetric_start", 0.1), ("volumetric_sample_distribution", 0.8), ("volumetric_light_clamp", 0.0),
                 ("use_raytracing", True), ("taa_render_samples", echantillons)):
        if hasattr(e, a):
            r[a] = getattr(e, a)
            try:
                setattr(e, a, v)
            except Exception:
                pass
    return r


def plan_brume_loin(coll):
    """0 : le brouillard ; au loin, une lueur verte (le vaisseau, caché dans la brume) ; la caméra glisse au ras de l'eau."""
    nav = _scene_brume(coll, avance=(-6.0, -1.0), images=(0, 89))
    cam = _cam(coll, [(0, (34, -3.0, 0.9), (-6, 0.5, 2.2)), (89, (29, -2.6, 0.75), (-5, 0.4, 2.3))], 50, doux=False)
    return {"cam": cam.name, "images": (0, 89), "monde": ciel_nuit(), "sources": {"gen_fantome_v5"}, "nuit": True}


def plan_brume_proue(coll):
    """La proue sort du brouillard et vient vers nous (le crâne cornu aux yeux verts) ; la caméra recule au ras de l'eau."""
    lune = lune_derriere((20, -4.5, 0.7), (5.5, 0.0, 3.4), decalage=-6.0, hauteur=10.0)
    nav = _scene_brume(coll, avance=(-4.0, 3.5), images=(0, 119), lune=lune, force_lune=0.9)
    cam = _cam(coll, [(0, (20, -4.5, 0.7), (5.5, 0.0, 3.4)), (119, (17.5, -5.2, 0.5), (8.0, 0.0, 3.8))], 38, doux=False)
    return {"cam": cam.name, "images": (0, 119), "monde": ciel_nuit(lune=lune), "sources": {"gen_fantome_v5"}, "nuit": True}


def plan_brume_depart(coll):
    """La fin : le vaisseau s'éloigne dans le brouillard, ses lumières vertes s'éteignent l'une après l'autre."""
    nav = _scene_brume(coll, avance=(2.0, -16.0), images=(0, 149))
    cam = _cam(coll, [(0, (24, 3.0, 1.0), (0, 0, 2.6)), (149, (23, 2.6, 1.1), (-10, 0, 2.8))], 45, doux=False)
    return {"cam": cam.name, "images": (0, 149), "monde": ciel_nuit(), "sources": {"gen_fantome_v5"}, "nuit": True}


PLANS = {
    "brume_proue": plan_brume_proue,
}


# ---------------------------------------------------------------------------------------------------------------------
# 4 bis. Les autres plans de nuit et le jour
# ---------------------------------------------------------------------------------------------------------------------
def sous_collection(src, prefixes, nom):
    """Une collection (exclue de la vue) avec seulement les objets de src dont le nom commence par un des préfixes
    (la vie en mer : toutes les bêtes sont au même endroit dans le .glb)."""
    c = bpy.data.collections.get(nom)
    if c is None:
        c = bpy.data.collections.new(nom)
        bpy.context.scene.collection.children.link(c)
        for o in bpy.data.collections[src].all_objects:
            if any(o.name.startswith(p) for p in prefixes):
                c.objects.link(o)
    lc = next(l for l in bpy.context.view_layer.layer_collection.children if l.collection == c)
    lc.exclude = True
    return nom


def _feux_follets(coll, nav, n=4):
    """Des feux follets : de petites boules vertes qui tournent lentement autour du navire et éclairent la brume."""
    me = bpy.data.meshes.get("gen_follet")
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.09)
        me = bpy.data.meshes.new("gen_follet")
        bm.to_mesh(me)
        bm.free()
        m = bpy.data.materials.new("gen_follet")
        m.use_nodes = True
        em = m.node_tree.nodes.new("ShaderNodeEmission")
        em.inputs["Color"].default_value = (0.30, 1.0, 0.50, 1)
        em.inputs["Strength"].default_value = 3.0
        out = next(x for x in m.node_tree.nodes if x.type == "OUTPUT_MATERIAL")
        m.node_tree.links.new(em.outputs[0], out.inputs["Surface"])
        me.materials.append(m)
    # une lueur verte assez douce : plus fort, la boule « brûle » en point blanc (on dirait une poussière sur l'image)
    em = next(x for x in me.materials[0].node_tree.nodes if x.type == "EMISSION")
    em.inputs["Color"].default_value = (0.12, 1.0, 0.35, 1)
    em.inputs["Strength"].default_value = 0.7
    for k in range(n):
        o = bpy.data.objects.new(f"gen_follet{k}", me)
        coll.objects.link(o)
        o.parent = nav
        o.scale = (0.8, 0.8, 0.8)
        r, h, v, ph = 4.2 + 0.8 * k, 2.2 + 1.1 * k, 0.35 + 0.07 * k, k * 1.7
        A._pilote(o, "location", 0, f"cos(frame/30*{v}+{ph})*{r}")
        A._pilote(o, "location", 1, f"sin(frame/30*{v}+{ph})*{r * 0.55}")
        A._pilote(o, "location", 2, f"{h}+sin(frame/30*1.3+{ph})*0.35")
        lu = _lampe(coll, f"gen_follet_lu{k}", "POINT", (0.4, 1.0, 0.6), 6.0, (0, 0, 0), rayon=0.05, parent=o)
        try:
            lu.data.volume_factor = 1.0
        except Exception:
            pass


def _calcaire(coll, cam_pos, avance=(0.0, 1.0), images=(0, 89)):
    """Le vaisseau et le capitaine Calcaire debout sur le gaillard d'avant (derrière le crâne cornu), tourné vers la
    caméra ; il se balance un peu, comme sur le pont qui roule."""
    nav = _scene_brume(coll, avance=avance, images=images, lanternes=1.2)
    _feux_follets(coll, nav)
    cap = A._instance(coll, "maitre_cimetiere_v5", "gen_calcaire", (4.6, 0.0, 1.55), (0, 0, 0), 0.16)
    cap.parent = nav
    rz = math.atan2(cam_pos[1], cam_pos[0] - 7.0) - V4.FACE_MAITRE
    cap.rotation_euler = (0, 0, rz)
    A._pilote(cap, "rotation_euler", 0, "sin(frame/30*1.7)*0.025")
    A._pilote(cap, "rotation_euler", 2, f"{rz:.4f}+sin(frame/30*0.6)*0.05")
    # une lanterne verte à ses pieds : elle l'éclaire par en dessous (le liseré fait le reste)
    _lampe(coll, "gen_vert_cap", "POINT", (0.4, 1.0, 0.6), 25.0, (5.2, -0.7, 1.9), rayon=0.2, parent=nav)
    return nav, cap


def plan_brume_calcaire(coll):
    """« Veyzo… Kikso… cette mer est mienne ! » : le capitaine Calcaire à la proue, en contre-plongée, la lune derrière."""
    cam_pos = Vector((15.0, -6.8, 1.5))
    nav, cap = _calcaire(coll, cam_pos)
    vise = (7.4, 0.0, 3.9)
    bpy.data.objects.remove(bpy.data.objects["gen_lune"])
    lune = lune_derriere(cam_pos, vise, decalage=-4.0, hauteur=22.0)
    lu = _lune(coll, force=0.7, direction=lune)
    lu.data.volume_factor = 1.4
    cam = _cam(coll, [(0, tuple(cam_pos), vise), (89, (13.6, -6.0, 1.7), (7.6, 0.0, 4.0))], 50, doux=False)
    return {"cam": cam.name, "images": (0, 89), "monde": ciel_nuit(lune=lune), "sources": {"gen_fantome_v5", "maitre_cimetiere_v5"}, "nuit": True}


def plan_brume_rire(coll):
    """Le rire : on s'approche lentement de la tête du capitaine (le tricorne, les orbites) ; la lune juste derrière lui."""
    cam_pos = Vector((12.4, -4.7, 3.2))
    nav, cap = _calcaire(coll, cam_pos, avance=(0.5, 1.0), images=(0, 104))
    vise = (7.5, 0.0, 3.85)
    bpy.data.objects.remove(bpy.data.objects["gen_lune"])
    lune = lune_derriere(cam_pos, vise, decalage=-3.0, hauteur=16.0)
    lu = _lune(coll, force=0.75, direction=lune)
    lu.data.volume_factor = 1.4
    cam = _cam(coll, [(0, tuple(cam_pos), vise), (104, (10.7, -3.8, 3.55), (7.6, 0.0, 3.95))], 60, doux=False)
    return {"cam": cam.name, "images": (0, 104), "monde": ciel_nuit(lune=lune), "sources": {"gen_fantome_v5", "maitre_cimetiere_v5"}, "nuit": True}


def plan_brume_loin_v2(coll):
    """0 : la brume, la nuit ; au loin, des lueurs vertes et la silhouette d'un navire ; la caméra glisse au ras de l'eau."""
    nav = _scene_brume(coll, avance=(-14.0, -11.0), images=(0, 119), lanternes=1.6)
    _feux_follets(coll, nav)
    lune = lune_derriere((34, -3.0, 0.8), (-12, 0.0, 4.0), decalage=9.0, hauteur=11.0)
    bpy.data.objects.remove(bpy.data.objects["gen_lune"])
    lu = _lune(coll, force=0.55, direction=lune)
    lu.data.volume_factor = 1.4
    cam = _cam(coll, [(0, (34, -3.0, 0.8), (-12, 0.0, 4.0)), (119, (28, -2.4, 0.7), (-12, 0.0, 4.2))], 45, doux=False)
    return {"cam": cam.name, "images": (0, 119), "monde": ciel_nuit(lune=lune), "sources": {"gen_fantome_v5"}, "nuit": True}


def plan_brume_depart_v2(coll):
    """La fin : le vaisseau s'éloigne dans la brume, de dos ; ses lueurs vertes se fondent dans le brouillard."""
    nav = _scene_brume(coll, avance=(6.0, -14.0), images=(0, 149), lanternes=1.4)
    nav.rotation_euler = (0, 0, 0)
    _feux_follets(coll, nav)
    lune = lune_derriere((30, 2.5, 0.9), (-10, 0, 4.0), decalage=-7.0, hauteur=12.0)
    bpy.data.objects.remove(bpy.data.objects["gen_lune"])
    lu = _lune(coll, force=0.6, direction=lune)
    lu.data.volume_factor = 1.4
    cam = _cam(coll, [(0, (30, 2.5, 0.9), (-2, 0, 4.0)), (149, (29, 2.2, 1.0), (-12, 0, 4.4))], 42, doux=False)
    return {"cam": cam.name, "images": (0, 149), "monde": ciel_nuit(lune=lune), "sources": {"gen_fantome_v5"}, "nuit": True}


def plan_nuit_phare(coll):
    """« Mes îles. » : le Phare du Bout du Monde dans la brume, de nuit ; le faisceau du phare balaie le brouillard."""
    _plan_mer(coll, mer_nuit())
    banc_brume(coll, densite=0.045, hauteur=13.0)
    A._instance(coll, "ile_phare_v5", "gen_ile", (0, 0, 0))
    haut = Vector((0.5, 1.2, 8.75))
    # le faisceau : un projecteur qui tourne (et sa lueur)
    pivot = bpy.data.objects.new("gen_phare_pivot", None)
    coll.objects.link(pivot)
    pivot.location = haut
    A._pilote(pivot, "rotation_euler", 2, "frame/30*1.3+2.75")  # vers l'image 40, le faisceau passe sur la caméra
    sp = _lampe(coll, "gen_faisceau", "SPOT", (1.0, 0.92, 0.72), 90000.0, (0, 0, 0), rayon=0.15, parent=pivot)
    sp.data.spot_size = math.radians(9.0)
    sp.data.use_shadow = False
    sp.data.spot_blend = 0.35
    sp.rotation_euler = (math.radians(86), 0, 0)
    try:
        sp.data.volume_factor = 1.6
    except Exception:
        pass
    _lampe(coll, "gen_lanterne", "POINT", (1.0, 0.85, 0.55), 220.0, tuple(haut), rayon=0.4)
    for k, (x, y) in enumerate(((-3.5, -4.0), (4.0, -3.0), (-5.5, 2.5))):  # les fenêtres du village au pied du phare
        lu = _lampe(coll, f"gen_village{k}", "POINT", (1.0, 0.7, 0.4), 18.0, (x, y, 1.6), rayon=0.5)
    lune = lune_derriere((-20, -24, 1.8), (0, 0, 5.0), decalage=-16.0, hauteur=14.0)
    lu = _lune(coll, force=0.4, direction=lune)
    lu.data.volume_factor = 1.3
    cam = _cam(coll, [(0, (-20, -24, 1.8), (0.3, 0.6, 5.6)), (59, (-18.6, -22.4, 1.9), (0.4, 0.8, 6.0))], 40, doux=False)
    return {"cam": cam.name, "images": (0, 59), "monde": ciel_nuit(lune=lune), "sources": {"ile_phare_v5"}, "nuit": True,
            "nuit_reglages": {"sombre": 0.10}}


def plan_nuit_monstre(coll):
    """« Mes monstres. » : la tête du monstre sort lentement de l'eau noire, ses yeux d'or s'allument ; contre-jour de lune."""
    src = importer("monstre-v5")
    _plan_mer(coll, mer_nuit())
    banc_brume(coll, densite=0.05, hauteur=5.0)
    mo = A._instance(coll, src, "gen_monstre", (0, 0, -9.0), (0, 0, 0), 1.0)
    _cles(mo, "location", [(0, (0, 0, -9.0)), (59, (0, 0, -1.2))])
    cam_pos = (2.0, -22.0, 1.2)
    lune = lune_derriere(cam_pos, (0, 11.5, 5.0), decalage=4.0, hauteur=12.0)
    lu = _lune(coll, force=0.5, direction=lune)
    lu.data.volume_factor = 1.4
    cam = _cam(coll, [(0, cam_pos, (0, 11.5, 3.5)), (59, (1.6, -19.5, 1.0), (0, 11.5, 4.5))], 34, doux=False)
    return {"cam": cam.name, "images": (0, 59), "monde": ciel_nuit(lune=lune), "sources": {src}, "nuit": True,
            "nuit_reglages": {"sombre": 0.045, "force_lisere": 1.6, "lisere": (0.45, 0.52, 0.85), "seuils": ((0.9, 1.0), (0.95, 1.0))}}


def _eclairs(coll, images, force=40000.0, couleur=(0.82, 0.78, 1.0), loc=(-30, 40, 60)):
    """Des éclairs : une grande lumière qui s'allume quelques images (images : les débuts des éclairs)."""
    o = _lampe(coll, "gen_eclair", "AREA", couleur, 0.0, loc, taille=60.0)
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cles = [(0, 0.0)]
    for d in images:
        cles += [(d - 1, 0.0), (d, force), (d + 1, force * 0.25), (d + 2, force * 0.9), (d + 4, 0.0)]
    cles.sort()
    for f, v in cles:
        o.data.energy = v
        o.data.keyframe_insert("energy", frame=f)
    return o


def plan_nuit_boss(coll):
    """« Mes règles. » : KRAKOR dans le noir, révélé par les éclairs ; la mer d'orage, la brume."""
    _plan_mer(coll, mer_nuit(calme=1.6))
    banc_brume(coll, densite=0.04, hauteur=4.0, couleur=(0.75, 0.70, 0.85))
    b = A._instance(coll, "boss_krakor_v5", "gen_boss", (0, 0, -2.5), (0, 0, 0), 1.0)
    _cles(b, "location", [(0, (0, 0, -2.5)), (59, (0, 0, -0.6))])
    d = Vector((math.cos(V4.FACE_BOSS), math.sin(V4.FACE_BOSS), 0))
    _eclairs(coll, (6, 33))
    lune = lune_derriere(tuple(d * 30 + Vector((0, 0, 2))), (0, 0, 7.0), decalage=-10.0, hauteur=18.0)
    lu = _lune(coll, force=0.35, direction=lune, couleur=(0.8, 0.7, 1.0))
    cam = _cam(coll, [(0, tuple(d * 30 + Vector((0, 0, 1.6))), (0, 0, 7.0)), (59, tuple(d * 26 + Vector((0, 0, 1.4))), (0, 0, 7.8))], 30, doux=False)
    V4._secousse(coll, cam, 6, 20, 0.35)
    return {"cam": cam.name, "images": (0, 59), "monde": ciel_nuit(lune=lune), "sources": {"boss_krakor_v5"}, "nuit": True,
            "nuit_reglages": {"sombre": 0.07, "force_lisere": 1.0, "lisere": (0.55, 0.40, 0.80), "eclairs": (6, 33)}}


# --- le jour ---
ILES_VUE = [("cristal", (-38, 58, -40)), ("archipel", (34, 74, 10)), ("geants", (-78, 112, 120)), ("horloge", (74, 118, -70)),
            ("forteresse", (-18, 152, 200)), ("marais", (112, 170, 60)), ("cimetiere", (-122, 178, -20)), ("vents", (42, 214, 0)),
            ("tonnerre", (-62, 246, 0)), ("champignons", (150, 260, 30)), ("lucioles", (-170, 250, 80))]


def plan_jour_eveil(coll):
    """Le titre : tout près de la lanterne du phare, la caméra recule et monte d'un coup ; GRAND LINE se découvre en plein
    soleil, les îles jusqu'à l'horizon (une brume légère au ras de l'eau)."""
    C5._mer(coll, C5.materiau_mer5("gen_mer_jour"), 8.5)
    banc_brume(coll, densite=0.025, hauteur=2.5, couleur=(0.97, 0.98, 1.0), vent=(0.2, 1.0), centre=(0, 100), taille=420.0)
    sources = {"ile_phare_v5"}
    A._instance(coll, "ile_phare_v5", "gen_ile_phare", (0, 0, 0), (0, 0, math.radians(200)), 1.0)
    for k, (i, (x, y, rz)) in enumerate(ILES_VUE):
        nom = f"ile_{i}_v5"
        A._instance(coll, nom, f"gen_ile{k}", (x, y, 0), (0, 0, math.radians(rz)), 1.0)
        sources.add(nom)
    C5._soleil(coll, force=3.0)
    cam = _cam(coll, [(0, (5.5, -8.0, 10.5), (0.0, 1.0, 9.0)), (119, (-5.0, -46.0, 25.0), (0.0, 72.0, 1.0))], 32)
    return {"cam": cam.name, "images": (0, 119), "monde": C5.ciel5(), "sources": sources, "volumes": True, "qualite": 32, "flou": True}


def _ile(id_):
    """Les îles et leurs maîtres (« Terre en vue ! » de barhaw_clips_v5), filmées plus grand : 1920 × 1200 (le même
    cadrage), le montage en garde 1920 × 1080. Les 49 premières images : le maître jaillit de l'eau."""
    def f(coll):
        info = C5.construire_ile(id_)
        info["taille"] = (1920, 1200)
        info["images"] = (0, 48)
        info["qualite"] = 32
        info["flou"] = True
        return info
    return f


def plan_jour_baleine(coll):
    """Une baleine saute hors de l'eau près de nous, et retombe sur le flanc ; trois dauphins filent devant."""
    src = importer("vie-mer-v5")
    bal = sous_collection(src, ("baleine_",), "gen_baleine")
    dau = sous_collection(src, ("dauphin_",), "gen_dauphin")
    C5._mer(coll, C5.materiau_mer5("gen_mer_jour"), -100.0)
    b = A._instance(coll, bal, "gen_baleine_i", (0, 13, -8), (0, math.radians(-70), math.radians(15)), 1.0)
    _cles(b, "location", [(0, (-0.5, 13, -8.5)), (12, (0.0, 13, -2.6)), (24, (0.6, 13, 1.2)), (34, (1.4, 13, 0.2)), (48, (2.2, 13, -5.5)), (59, (2.6, 13, -8.0))])
    _cles(b, "rotation_euler", [(0, (0, math.radians(-72), math.radians(15))), (24, (math.radians(-20), math.radians(-48), math.radians(15))),
                                (36, (math.radians(-65), math.radians(-5), math.radians(15))), (52, (math.radians(-95), math.radians(30), math.radians(15)))])
    C5._gerbe5(coll, (0.0, 13, 0), 10, force=1.6, graine=7, n=32)
    C5._gerbe5(coll, (1.6, 13, 0), 38, force=2.2, graine=9, n=38)
    C5._anneau_ecume(coll, (1.6, 13, 0), 6.0, 39)
    for k in range(3):
        d0 = 4 + k * 9
        x0 = -16 + k * 1.5
        o = A._instance(coll, dau, f"gen_dauphin{k}", (x0, 7 - k, -2), (0, 0, 0), 1.0)
        _cles(o, "location", [(d0, (x0, 7 - k, -1.5)), (d0 + 7, (x0 + 4, 7 - k, 1.6)), (d0 + 14, (x0 + 8, 7 - k, -1.5))])
        _cles(o, "rotation_euler", [(d0, (0, math.radians(-40), 0)), (d0 + 7, (0, 0, 0)), (d0 + 14, (0, math.radians(45), 0))])
        C5._gerbe5(coll, (x0 + 8, 7 - k, 0), d0 + 13, force=0.5, graine=20 + k, n=12)
    C5._soleil(coll)
    cam = _cam(coll, [(0, (-5, -12, 1.3), (0, 13, 3.0)), (59, (-3.5, -10.5, 1.2), (1.6, 13, 2.6))], 30, doux=False)
    return {"cam": cam.name, "images": (0, 59), "monde": C5.ciel5(), "sources": {bal, dau}, "qualite": 32, "flou": True}


def plan_jour_monstre(coll):
    """Le monstre jaillit de la mer en plein jour, ses tentacules autour de nous ; la caméra tremble au choc."""
    src = importer("monstre-v5")
    C5._mer(coll, C5.materiau_mer5("gen_mer_jour"), -100.0)
    mo = A._instance(coll, src, "gen_monstre", (0, 0, -14.0), (0, 0, 0), 1.0)
    _cles(mo, "location", [(0, (0, 0, -14.0)), (5, (0, 0, -12.0)), (17, (0, 0, 0.9)), (26, (0, 0, -0.5)), (36, (0, 0, 0.15)), (59, (0, 0, -0.1))])
    C5._gerbe5(coll, (0, 11.5, 0), 9, force=2.2, graine=5, n=40)
    for k, (x, y) in enumerate(((8.4, -1.8), (8.1, 4.3), (-8.0, 4.2), (-8.1, -2.3))):
        C5._gerbe5(coll, (x, y, 0), 10 + k, force=0.8, graine=30 + k, n=14)
    C5._anneau_ecume(coll, (0, 11.5, 0), 7.0, 12)
    C5._soleil(coll)
    cam = _cam(coll, [(0, (3.0, -24.0, 1.4), (0, 11.5, 3.0)), (20, (2.6, -22.5, 1.2), (0, 11.5, 6.0)), (59, (2.0, -21.0, 1.1), (0, 11.5, 6.4))], 26)
    V4._secousse(coll, cam, 14, 22, 0.5)
    return {"cam": cam.name, "images": (0, 59), "monde": C5.ciel5(), "sources": {src}, "qualite": 32, "flou": 0.12}


def _boss(id_):
    """Un boss jaillit de la mer d'orage (comme les vidéos du site), filmé en 16:9 ; des éclairs, la caméra tremble."""
    def f(coll):
        C5._mer(coll, C5.materiau_mer5("clip_mer5_orage", orage=True), -100.0)
        e = A._instance(coll, f"boss_{id_}_v5", "gen_boss", (0, 0, -18), (0, 0, 0), 1.0)
        V4._cles(e, "location", [(0, (0, 0, -18)), (4, (0, 0, -15)), (16, (0, 0, 1.4)), (26, (0, 0, -0.5)), (36, (0, 0, 0.2)), (59, (0, 0, -0.1))])
        V4._cles(e, "rotation_euler", [(0, (0.25, 0, -0.5)), (18, (-0.06, 0, 0.08)), (34, (0.0, 0, -0.03)), (59, (0.02, 0, 0.03))])
        C5._gerbe5(coll, (0, 0, 0), 8, force=1.7, graine=3, n=34)
        C5._anneau_ecume(coll, (0, 0, 0), 6.5, 10)
        d = Vector((math.cos(V4.FACE_BOSS), math.sin(V4.FACE_BOSS), 0))
        l = Vector((-d.y, d.x, 0))
        cam = _cam(coll, [(0, tuple(d * 31 + Vector((0, 0, 2.0))), (0, 0, 4.5)), (18, tuple(d * 26.5 + l * 1.2 + Vector((0, 0, 2.6))), (0, 0, 7.4)),
                          (59, tuple(d * 24.0 + l * 3.0 + Vector((0, 0, 3.0))), (0, 0, 7.8))], 26)
        V4._secousse(coll, cam, 12, 26, 0.55)
        for nom, couleur, cote in (("clip5_rose", 0xff4f9a, 1), ("clip5_violet", 0x9b4dff, -1)):
            lu = _lampe(coll, nom, "AREA", B.rgb(couleur), 9000, tuple(-d * 14 + l * (9 * cote) + Vector((0, 0, 12))), taille=8)
            lu.rotation_euler = (Vector((0, 0, 7)) - lu.location).to_track_quat("-Z", "Y").to_euler()
        face = _lampe(coll, "clip5_face", "SUN", B.rgb(0xffc7dc), 3.0)
        face.rotation_euler = (d * 10 + Vector((0, 0, 8))).to_track_quat("Z", "Y").to_euler()
        _eclairs(coll, (3, 41), force=25000.0, couleur=(1.0, 0.75, 0.9), loc=tuple(-d * 40 + Vector((0, 0, 50))))
        return {"cam": cam.name, "images": (0, 59), "monde": V4._monde_boss(), "sources": {f"boss_{id_}_v5"}, "qualite": 32, "flou": 0.12}
    return f


PLANS.update({
    "brume_loin": plan_brume_loin_v2,
    "brume_calcaire": plan_brume_calcaire,
    "brume_rire": plan_brume_rire,
    "brume_depart": plan_brume_depart_v2,
    "nuit_phare": plan_nuit_phare,
    "nuit_monstre": plan_nuit_monstre,
    "nuit_boss": plan_nuit_boss,
    "jour_eveil": plan_jour_eveil,
    "jour_baleine": plan_jour_baleine,
    "jour_monstre": plan_jour_monstre,
})
for _i in ("phare", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"):
    PLANS[f"ile_{_i}"] = _ile(_i)
for _b in ("krakor", "morghast", "voraxia"):
    PLANS[f"boss_{_b}"] = _boss(_b)


# ---------------------------------------------------------------------------------------------------------------------
# 5. Le rendu (comme barhaw_clips_v5._rendre, avec la nuit, le brouillard et les reflets ; tout est remis à la fin)
# ---------------------------------------------------------------------------------------------------------------------
def _rendre(info, dossier, image_seule=None, nom_essai="essai"):
    scene = bpy.context.scene
    vl = bpy.context.view_layer
    sources = set(info.get("sources", set()))
    garder = {"clips"} | sources
    objets = [o for n in sources for o in bpy.data.collections[n].all_objects if o is not None]
    lcs = {lc.name: lc for lc in vl.layer_collection.children}
    clips = bpy.data.collections["clips"]
    remettre = []
    mailles = []
    clairs = []
    nuit = info.get("nuit", False)

    def poser(o, attr, valeur):
        remettre.append((o, attr, getattr(o, attr)))
        setattr(o, attr, valeur)

    reglages = {}
    try:
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
                    for i, nm in enumerate(noms):
                        if nm == "ecume":
                            o.data.materials[i] = ressac
                        elif nm == "ombre_eau":
                            o.data.materials[i] = ombre
                poser(o, "hide_render", False)
            elif o.name.startswith("ile_vitres"):
                poser(o, "hide_render", not nuit)  # la nuit, les vitres s'allument (comme sur le site)
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
        taille = info.get("taille", TAILLE)
        for objet, attr, valeur in ((r, "engine", "BLENDER_EEVEE"), (r, "resolution_x", taille[0]), (r, "resolution_y", taille[1]),
                                    (r, "resolution_percentage", 100), (r, "film_transparent", bool(info.get("transparent"))), (r, "fps", FPS),
                                    (r, "use_freestyle", False), (scene.view_settings, "view_transform", "Standard"), (scene.view_settings, "look", "None"),
                                    (scene.view_settings, "exposure", info.get("exposition", -0.9 if nuit else 0.0)), (scene.view_settings, "gamma", 1.0),
                                    (scene, "world", info["monde"]), (scene, "camera", bpy.data.objects[info["cam"]])):
            poser(objet, attr, valeur)
        if info.get("flou"):  # le flou de mouvement : flou = la durée d'obturation (en images)
            poser(r, "use_motion_blur", True)
            try:
                poser(r, "motion_blur_shutter", 0.3 if info["flou"] is True else float(info["flou"]))
            except Exception:
                pass
        if nuit or info.get("volumes"):
            reglages = _reglages_nuit(scene, info.get("qualite", 48))
            if nuit:
                _nuit_poser(**info.get("nuit_reglages", {}))
        else:
            try:
                poser(scene.eevee, "taa_render_samples", info.get("qualite", 32))
            except Exception:
                pass
        os.makedirs(dossier, exist_ok=True)
        debut, fin = info["images"]
        try:
            r.image_settings.media_type = "IMAGE"
        except Exception:
            pass
        r.image_settings.file_format = "PNG"
        r.image_settings.color_mode = "RGBA" if info.get("transparent") else "RGB"
        r.image_settings.color_depth = "8"
        if image_seule is not None:
            scene.frame_set(image_seule)
            r.filepath = os.path.join(dossier, f"{nom_essai}-{image_seule}.png")
            bpy.ops.render.render(write_still=True)
            return r.filepath
        poser(scene, "frame_start", debut)
        poser(scene, "frame_end", fin)
        r.filepath = os.path.join(dossier, "img-")
        bpy.ops.render.render(animation=True)
        return dossier
    finally:
        _nuit_retirer()
        for a, v in reglages.items():
            try:
                setattr(scene.eevee, a, v)
            except Exception:
                pass
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


def _construire(plan):
    coll = V4._vider()
    info = PLANS[plan](coll)
    return info


def essai(plan, image, **plus):
    info = _construire(plan)
    info.update(plus)
    try:
        return _rendre(info, DOSSIER, image_seule=image, nom_essai=f"essai-{plan}")
    finally:
        V4._vider()


def un(plan, refaire=True):
    info = _construire(plan)
    dossier = os.path.join(DOSSIER, plan)
    try:
        deja = all(os.path.exists(os.path.join(dossier, f"img-{k:04d}.png")) for k in range(info["images"][0], info["images"][1] + 1))
        if refaire or not deja:
            _rendre(info, dossier)
    finally:
        V4._vider()
    sc = bpy.context.scene
    avant = (sc.render.resolution_x, sc.render.resolution_y)
    sc.render.resolution_x, sc.render.resolution_y = info.get("taille", TAILLE)
    try:
        if not info.get("transparent"):
            V4.encoder(dossier, os.path.join(DOSSIER, plan + ".mp4"), info["images"])
    finally:
        sc.render.resolution_x, sc.render.resolution_y = avant
    return plan


def _bilan():
    try:
        os.makedirs(DOSSIER, exist_ok=True)
        with open(os.path.join(DOSSIER, "bilan.json"), "w", encoding="utf-8") as f:
            json.dump(ETAT, f, ensure_ascii=False, indent=1, default=str)
    except Exception:
        pass


def lancer(plans=None):
    """Les plans l'un après l'autre (bpy.app.timers) : Blender reste libre entre deux ; le suivi dans bilan.json."""
    file = list(plans or PLANS)
    ETAT.update({"etapes": list(file), "fait": [], "en_cours": "", "erreur": "", "fini": False, "debut": time.time(), "durees": {}})

    def suivante():
        if not file:
            ETAT["fini"] = True
            ETAT["en_cours"] = ""
            _bilan()
            return None
        p = file.pop(0)
        ETAT["en_cours"] = p
        _bilan()
        t0 = time.time()
        try:
            un(p)
        except Exception as e:
            import traceback
            ETAT["erreur"] = f"{p} : {e!r}"
            ETAT["trace"] = traceback.format_exc()[-1500:]
            ETAT["fini"] = True
            _bilan()
            return None
        ETAT["durees"][p] = round(time.time() - t0, 1)
        ETAT["fait"].append(p)
        _bilan()
        return 0.5

    bpy.app.timers.register(suivante, first_interval=0.5)
    return ETAT["etapes"]
