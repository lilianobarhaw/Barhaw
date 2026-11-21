# Les petites vidéos de la VF 1.0, au niveau 5 (rendues dans Blender, 30 images/s) :
#   boss-<id>-v5 : l'entrée d'un boss de BOSS LIVE (KRAKOR, MORGHAST, VORAXIA) : il jaillit de la mer dans une gerbe d'écume,
#                  la caméra tremble au choc (3 s, 720 × 720, le ciel d'orage rouge sombre de l'alerte du site)
#   ile-<id>-v5  : « Terre en vue ! » : un tour de caméra autour d'une île du niveau 5 et de son maître, qui sort de l'eau (4 s, 960 × 600)
# La même mise en scène que barhaw_clips_vf (ses vidéos restent : le site les montre quand le niveau 5 est coupé), avec les modèles
# du niveau 5 tels que le site les montre : leur lumière est cuite dans l'atlas (collections ile_<id>_v5, maitre_<id>_v5 à
# l'échelle 1,35 comme sur la carte, boss_<id>_v5) ; pas de trait d'encre ; la mer et le ciel de la carte au niveau 5 (une eau
# profonde, un lagon clair autour de l'île, le ressac sur la côte, le ciel qui s'y reflète). Rien n'est changé pour de bon dans
# les collections : ce que le rendu retouche (le ressac, les vitres, les matières claires, les lumières) est remis après.
# Usage dans Blender :
#   import barhaw_clips_v5 as C5 ; C5.essai("ile", "phare", 60)   (une image d'essai : rendus/clips/essai5-ile-phare-60.png)
#   C5.lancer()   (les collections qui manquent sont cuites, puis toutes les vidéos : rendus/clips/<genre>-<id>-v5.mp4 ;
#                  par bpy.app.timers, une étape à la fois ; le suivi dans C5.ETAT et rendus/clips/bilan-clips-v5.json)
# Puis, pour le site : sh outils/sons/clips.sh <dossier des .mp4 « -v5 »> <site>  ->  videos/boss/<id>-v5.*, videos/iles/<id>-v5.*
import json, math, os, time, bpy
from mathutils import Vector
import barhaw_base as B
import barhaw_accueil_vf as A
import barhaw_teaser_vf as T0
import barhaw_clips_vf as V4

FPS = 30
ILES = list(V4.ILES)
BOSS = list(V4.BOSS)
DOSSIER = V4.DOSSIER
FACE_ILE = V4.FACE_ILE
FACE_MAITRE = V4.FACE_MAITRE
FACE_BOSS = V4.FACE_BOSS
SOLEIL = (-0.5, -0.62, 0.62)  # le soleil des modèles du niveau 5 (celui de leur cuisson, et de la mer du site)
ECHELLE_MAITRE = 1.35  # sur la carte, un maître est 1,35 fois plus grand que son île
# la demi-taille de chaque maître sur la carte (ce qui sort de l'eau, à l'échelle 1,35) : le même tableau que js/grandline-3d.js
TAILLE_MAITRE = {"marais": 6.2, "phare": 4.4, "cristal": 5.2, "archipel": 6.4, "cimetiere": 4.1, "horloge": 8.5, "geants": 7.2, "forteresse": 6.6}
# les matières claires, aussi transparentes que sur le site (matiereGLB : glace 0,86, cristal 0,78, eau 0,85, verre 0,45)
OPACITE = {"glace.m5": 0.86, "cristal.m5": 0.78, "eau.m5": 0.85, "eau_douce.m5": 0.85, "verre.m5": 0.45}
# les collections du niveau 5 qu'il faut (re)cuire avant de filmer : (collection, module, arguments de construire)
A_CUIRE = {
    "ile_horloge_v5": ("barhaw_horloge_v5", {}), "ile_geants_v5": ("barhaw_geants_v5", {}),
    "ile_forteresse_v5": ("barhaw_forteresse_v5", {}), "ile_cimetiere_v5": ("barhaw_cimetiere_v5", {}),
    "ile_marais_v5": ("barhaw_marais_v5", {}), "ile_phare_v5": ("barhaw_phare_v5", {}), "ile_cristal_v5": ("barhaw_cristal_v5", {}),
    "ile_archipel_v5": ("barhaw_archipel_v5", {}), "maitre_marais_v5": ("barhaw_maitre_marais_v5", {}),
}
ETAT = {"etapes": [], "fait": [], "en_cours": "", "erreur": "", "fini": False, "debut": 0.0, "durees": {}}


def _lin(c):
    """Une couleur telle que le site l'affiche (0..1, sRGB) -> la couleur linéaire de Blender."""
    return (B.lineaire(c[0]), B.lineaire(c[1]), B.lineaire(c[2]), 1.0)


def _noeud(nt, genre, x=0, y=0, **reglages):
    n = nt.nodes.new(genre)
    n.location = (x, y)
    for k, v in reglages.items():
        setattr(n, k, v)
    return n


def _maths(nt, op, a, b=None, x=0, y=0, borne=False):
    n = _noeud(nt, "ShaderNodeMath", x, y, operation=op, use_clamp=borne)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _plage(nt, valeur, de0, de1, a0=0.0, a1=1.0, x=0, y=0, doux=True):
    n = _noeud(nt, "ShaderNodeMapRange", x, y, interpolation_type="SMOOTHSTEP" if doux else "LINEAR", clamp=True)
    nt.links.new(valeur, n.inputs["Value"])
    n.inputs["From Min"].default_value = de0
    n.inputs["From Max"].default_value = de1
    n.inputs["To Min"].default_value = a0
    n.inputs["To Max"].default_value = a1
    return n.outputs["Result"]


def _melange(nt, fac, a, b, x=0, y=0):
    """Le mélange de deux couleurs (a et b : une sortie ou une couleur RGBA) selon fac (une sortie ou un nombre)."""
    n = _noeud(nt, "ShaderNodeMix", x, y, data_type="RGBA")
    for i, v in ((0, fac), (6, a), (7, b)):
        if isinstance(v, (int, float, tuple)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[2]


def _temps(socket, vitesse, depart=0.0):
    """Le socket suit l'image : depart + vitesse × secondes (un pilote simple, sans Python)."""
    d = socket.driver_add("default_value").driver
    d.type = "SCRIPTED"
    d.expression = f"{depart:.4f}+frame*{vitesse / FPS:.6f}"


def _bruit(nt, vecteur, echelle, detail=3.0, w=None, vitesse=0.0, x=0, y=0):
    n = _noeud(nt, "ShaderNodeTexNoise", x, y, noise_dimensions="4D" if (w is not None or vitesse) else "3D")
    nt.links.new(vecteur, n.inputs["Vector"])
    n.inputs["Scale"].default_value = echelle
    n.inputs["Detail"].default_value = detail
    if vitesse:
        _temps(n.inputs["W"], vitesse, w or 0.0)
    elif w is not None:
        n.inputs["W"].default_value = w
    return n.outputs["Fac"]


def materiau_mer5(nom="clip_mer5", orage=False):
    """La mer de la carte au niveau 5 (js/grandline-3d.js, la mer « cinéma ») : une eau profonde, un lagon clair autour de l'île
    (le nœud « rayon » : la côte, en unités du site), des vagues qui prennent la lumière, le ciel qui s'y reflète, les moutons.
    orage : l'eau sombre et agitée d'un boss (sans île), qui reflète le ciel rouge et les lumières de l'arène."""
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    sortie = _noeud(nt, "ShaderNodeOutputMaterial", 1800, 0)
    geo = _noeud(nt, "ShaderNodeNewGeometry", -1600, 0)
    # la position qui glisse un peu (le courant), pour les vagues
    glisse = _noeud(nt, "ShaderNodeMapping", -1400, -300)
    lien(geo.outputs["Position"], glisse.inputs["Vector"])
    for i, v in ((0, 0.10), (1, 0.06)):
        d = glisse.inputs["Location"].driver_add("default_value", i).driver
        d.type = "SCRIPTED"
        d.expression = f"frame*{v / FPS:.6f}"
    # la distance à la côte de l'île (au centre du monde)
    rayon = _noeud(nt, "ShaderNodeValue", -1600, 300)
    rayon.name = "rayon"
    rayon.outputs[0].default_value = -100.0 if orage else 8.5
    aplat = _noeud(nt, "ShaderNodeVectorMath", -1400, 300, operation="MULTIPLY")
    lien(geo.outputs["Position"], aplat.inputs[0])
    aplat.inputs[1].default_value = (1.0, 1.0, 0.0)
    loin = _noeud(nt, "ShaderNodeVectorMath", -1200, 300, operation="LENGTH")
    lien(aplat.outputs[0], loin.inputs[0])
    d_ile = _maths(nt, "SUBTRACT", loin.outputs["Value"], rayon.outputs[0], -1000, 300)
    bas = _plage(nt, d_ile, 0.0, 11.0, 1.0, 0.0, -800, 400)
    bas2 = _maths(nt, "MULTIPLY", _maths(nt, "MULTIPLY", bas, bas, -600, 400), 0.92, -400, 400)
    remous = _bruit(nt, glisse.outputs[0], 1.6, 2.0, w=3.0, vitesse=0.12, x=-1000, y=600)
    lagon = _plage(nt, _maths(nt, "SUBTRACT", d_ile, _maths(nt, "MULTIPLY", remous, 1.6, -800, 650), -600, 650), -1.5, 2.0, 0.7, 0.0, -400, 600)
    # l'eau : deux tons du fond selon de grandes nappes, puis le turquoise des hauts-fonds et du lagon
    nappes = _plage(nt, _bruit(nt, geo.outputs["Position"], 0.045, 3.0, w=1.0, vitesse=0.01, x=-1000, y=0), 0.32, 0.68, 0.0, 1.0, -800, 0, doux=False)
    if orage:
        fond = _melange(nt, nappes, _lin((0.05, 0.04, 0.12)), _lin((0.09, 0.07, 0.20)), -600, 0)
        eau = fond
    else:
        fond = _melange(nt, nappes, _lin((0.030, 0.185, 0.365)), _lin((0.055, 0.315, 0.490)), -600, 0)
        eau = _melange(nt, bas2, fond, _lin((0.13, 0.66, 0.66)), -200, 100)
        eau = _melange(nt, lagon, eau, _lin((0.36, 0.80, 0.74)), 0, 200)
    # les vagues : deux couches qui glissent l'une sur l'autre ; leur pente fait le relief de l'eau
    v1 = _bruit(nt, glisse.outputs[0], 0.55, 4.0, w=0.0, vitesse=0.25, x=-1000, y=-400)
    v2 = _bruit(nt, glisse.outputs[0], 1.9, 3.0, w=5.0, vitesse=0.45, x=-1000, y=-650)
    houle = _maths(nt, "ADD", _maths(nt, "MULTIPLY", v1, 0.7, -800, -400), _maths(nt, "MULTIPLY", v2, 0.3, -800, -650), -600, -500)
    bosse = _noeud(nt, "ShaderNodeBump", -400, -500)
    bosse.inputs["Strength"].default_value = 0.55 if orage else 0.4
    bosse.inputs["Distance"].default_value = 0.6
    lien(houle, bosse.inputs["Height"])
    normale = bosse.outputs["Normal"]
    # les pentes tournées vers le soleil s'éclairent (comme sur le site : 1 + 1,25 × la pente vers le soleil)
    s = Vector(SOLEIL).normalized()
    pente = _noeud(nt, "ShaderNodeVectorMath", -200, -500, operation="DOT_PRODUCT")
    lien(normale, pente.inputs[0])
    pente.inputs[1].default_value = (s.x, s.y, 0.0)
    clair = _maths(nt, "ADD", _maths(nt, "MULTIPLY", pente.outputs["Value"], 1.25, 0, -500), 1.0, 200, -500)
    eclairee = _noeud(nt, "ShaderNodeVectorMath", 400, 0, operation="SCALE")
    lien(eau, eclairee.inputs[0])
    lien(clair, eclairee.inputs["Scale"])
    # le ciel dans l'eau, calculé comme sur le site : le rayon réfléchi R (par la normale des vagues), la couleur du ciel selon
    # sa hauteur, le coefficient de Fresnel (presque rien d'en haut, presque tout au loin), le soleil sur les crêtes
    vers_oeil = geo.outputs["Incoming"]
    ni = _noeud(nt, "ShaderNodeVectorMath", 400, 400, operation="DOT_PRODUCT")
    lien(normale, ni.inputs[0])
    lien(vers_oeil, ni.inputs[1])
    double = _noeud(nt, "ShaderNodeVectorMath", 600, 400, operation="SCALE")
    lien(normale, double.inputs[0])
    lien(_maths(nt, "MULTIPLY", ni.outputs["Value"], 2.0, 500, 550), double.inputs["Scale"])
    reflet = _noeud(nt, "ShaderNodeVectorMath", 800, 400, operation="SUBTRACT")
    lien(double.outputs[0], reflet.inputs[0])
    lien(vers_oeil, reflet.inputs[1])
    rz = _noeud(nt, "ShaderNodeSeparateXYZ", 1000, 500)
    lien(reflet.outputs[0], rz.inputs[0])
    hauteur = _maths(nt, "POWER", _maths(nt, "MAXIMUM", rz.outputs["Z"], 0.0, 1150, 550), 0.55, 1300, 550)
    if orage:
        ciel = _melange(nt, _maths(nt, "MINIMUM", _maths(nt, "MULTIPLY", hauteur, 2.2, 1450, 600), 1.0, 1600, 600), B.rgba(0x6e1f5c), B.rgba(0x12050d), 1750, 500)
    else:
        ciel = _melange(nt, hauteur, _lin((0.82, 0.91, 0.97)), _lin((0.32, 0.57, 0.90)), 1450, 500)
    rasant = _maths(nt, "SUBTRACT", 1.0, _maths(nt, "MAXIMUM", ni.outputs["Value"], 0.0, 1150, 300), 1300, 300)
    fres = _maths(nt, "ADD", 0.02, _maths(nt, "MULTIPLY", _maths(nt, "POWER", rasant, 5.0, 1450, 300), 0.78 if orage else 0.98, 1600, 300), 1750, 300)
    mer = _melange(nt, fres, eclairee.outputs[0], ciel, 1950, 200)
    if not orage:
        rl = _noeud(nt, "ShaderNodeVectorMath", 1000, 750, operation="DOT_PRODUCT")
        lien(reflet.outputs[0], rl.inputs[0])
        rl.inputs[1].default_value = tuple(s)
        eclat = _maths(nt, "MULTIPLY", _maths(nt, "POWER", _maths(nt, "MAXIMUM", rl.outputs["Value"], 0.0, 1150, 750), 60.0, 1300, 750), 0.55, 1450, 750)
        brille = _noeud(nt, "ShaderNodeMix", 2150, 300, data_type="RGBA", blend_type="ADD")
        lien(eclat, brille.inputs[0])
        lien(mer, brille.inputs[6])
        brille.inputs[7].default_value = _lin((1.0, 0.95, 0.82))
        mer = brille.outputs[2]
    # les moutons au large (plus nombreux sous l'orage), jamais dans le lagon
    tache = _plage(nt, _bruit(nt, glisse.outputs[0], 0.5, 2.0, w=7.0, vitesse=0.3, x=-400, y=-900), 0.62 if orage else 0.66, 0.70 if orage else 0.73, 0.0, 1.0, -200, -900)
    zones = _plage(nt, _bruit(nt, geo.outputs["Position"], 0.06, 2.0, w=2.0, vitesse=0.02, x=-400, y=-1100), 0.45, 0.6, 0.0, 1.0, -200, -1100)
    mouton = _maths(nt, "MULTIPLY", _maths(nt, "MULTIPLY", tache, zones, 0, -1000), 0.6 if orage else 0.45, 200, -1000)
    if not orage:
        mouton = _maths(nt, "MULTIPLY", mouton, _maths(nt, "SUBTRACT", 1.0, bas, 200, -1200), 400, -1100)
    couleur = _melange(nt, mouton, mer, _lin((0.96, 0.98, 1.0)), 2350, 0)
    lumiere = _noeud(nt, "ShaderNodeEmission", 2550, 0)
    lien(couleur, lumiere.inputs["Color"])
    tout = lumiere
    if orage:
        # sous l'orage, l'eau prend aussi la lumière rose et violette de l'arène (des reflets flous sur les vagues)
        try:
            miroir = _noeud(nt, "ShaderNodeBsdfGlossy", 2550, -250)
        except RuntimeError:
            miroir = _noeud(nt, "ShaderNodeBsdfPrincipled", 2550, -250)
            miroir.inputs["Metallic"].default_value = 1.0
        miroir.inputs["Roughness"].default_value = 0.32
        if "Color" in miroir.inputs:
            miroir.inputs["Color"].default_value = (0.18, 0.18, 0.18, 1.0)
        lien(normale, miroir.inputs["Normal"])
        tout = _noeud(nt, "ShaderNodeAddShader", 2750, 0)
        lien(lumiere.outputs[0], tout.inputs[0])
        lien(miroir.outputs[0], tout.inputs[1])
    lien(tout.outputs[0], sortie.inputs["Surface"])
    return m


def _mer(coll, materiau, rayon):
    """Un grand plan de mer (le site : une mer opaque, au niveau 0) ; rayon : la côte de l'île pour le lagon."""
    me = bpy.data.meshes.get("clip_mer5")
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=4, y_segments=4, size=1000)
        me = bpy.data.meshes.new("clip_mer5")
        bm.to_mesh(me)
        bm.free()
    me.materials.clear()
    me.materials.append(materiau)
    n = materiau.node_tree.nodes.get("rayon")
    if n:
        n.outputs[0].default_value = rayon
    o = bpy.data.objects.new("clip_mer5", me)
    coll.objects.link(o)
    o.location = (0, 0, 0)
    return o


def ciel5(nom="clip_ciel5"):
    """Le ciel du niveau 5 (celui que la mer du site reflète) : clair à l'horizon, bleu en haut, de petits nuages bas.
    Il éclaire moins qu'il ne se voit (les modèles ont leur lumière cuite ; seuls les fanions et les toiles la prennent)."""
    w = bpy.data.worlds.get(nom) or bpy.data.worlds.new(nom)
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    sortie = _noeud(nt, "ShaderNodeOutputWorld", 1000, 0)
    coord = _noeud(nt, "ShaderNodeTexCoord", -900, 0)
    sep = _noeud(nt, "ShaderNodeSeparateXYZ", -700, 0)
    lien(coord.outputs["Generated"], sep.inputs[0])
    rampe = _noeud(nt, "ShaderNodeValToRGB", -500, 0)
    cr = rampe.color_ramp
    bas, haut = (0.82, 0.91, 0.97), (0.32, 0.57, 0.90)
    mix = lambda t: tuple(a + (b - a) * t for a, b in zip(bas, haut))
    cr.elements[0].position = 0.0
    cr.elements[0].color = _lin(bas)
    cr.elements[1].position = 1.0
    cr.elements[1].color = _lin(haut)
    for p, t in ((0.04, 0.17), (0.12, 0.31), (0.3, 0.52), (0.6, 0.76)):  # pow(sin(hauteur), 0.55), comme le reflet du site
        e = cr.elements.new(p)
        e.color = _lin(mix(t))
    lien(sep.outputs["Z"], rampe.inputs["Fac"])
    # les nuages : un bruit sur la direction, aplati, seulement un peu au-dessus de l'horizon
    ecrase = _noeud(nt, "ShaderNodeVectorMath", -700, -300, operation="MULTIPLY")
    lien(coord.outputs["Generated"], ecrase.inputs[0])
    ecrase.inputs[1].default_value = (1.0, 1.0, 4.5)
    n1 = _bruit(nt, ecrase.outputs[0], 2.2, 5.0, w=4.0, vitesse=0.004, x=-500, y=-300)
    nuage = _plage(nt, n1, 0.54, 0.68, 0.0, 1.0, -300, -300)
    bande = _maths(nt, "MULTIPLY", _plage(nt, sep.outputs["Z"], 0.015, 0.07, 0.0, 1.0, -500, -550), _plage(nt, sep.outputs["Z"], 0.32, 0.12, 0.0, 1.0, -500, -700), -300, -600)
    voile = _maths(nt, "MULTIPLY", nuage, bande, -100, -400)
    couleur = _melange(nt, _maths(nt, "MULTIPLY", voile, 0.92, 100, -400), rampe.outputs["Color"], _lin((0.99, 0.99, 1.0)), 300, 0)
    fond = _noeud(nt, "ShaderNodeBackground", 500, 100)
    lien(couleur, fond.inputs["Color"])
    fond.inputs["Strength"].default_value = 1.0
    # ce qui éclaire (pas la caméra) : le même ciel, moins fort
    eclaire = _noeud(nt, "ShaderNodeBackground", 500, -100)
    lien(couleur, eclaire.inputs["Color"])
    eclaire.inputs["Strength"].default_value = 0.45
    chemin = _noeud(nt, "ShaderNodeLightPath", 500, 300)
    choix = _noeud(nt, "ShaderNodeMixShader", 750, 0)
    lien(chemin.outputs["Is Camera Ray"], choix.inputs[0])
    lien(eclaire.outputs[0], choix.inputs[1])
    lien(fond.outputs[0], choix.inputs[2])
    lien(choix.outputs[0], sortie.inputs["Surface"])
    return w


def _ecume_rivage():
    """Le ressac contre la côte (le ruban « ecume » des îles, ses UV : u le long du bord, v du bord (0) vers le large (1)) :
    deux lames qui arrivent et se retirent, une dentelle qui dérive, le liseré contre le sable (matiereRivage5 du site)."""
    m = bpy.data.materials.get("clip_ressac5") or bpy.data.materials.new("clip_ressac5")
    m.use_nodes = True
    m.surface_render_method = "BLENDED"
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    uv = _noeud(nt, "ShaderNodeUVMap", -1400, 0, uv_map="motif")
    sep = _noeud(nt, "ShaderNodeSeparateXYZ", -1200, 0)
    lien(uv.outputs[0], sep.inputs[0])
    u, v = sep.outputs["X"], sep.outputs["Y"]
    grain_v = _noeud(nt, "ShaderNodeCombineXYZ", -1000, -300)
    lien(_maths(nt, "MULTIPLY", u, 1.6, -1150, -250), grain_v.inputs["X"])
    lien(_maths(nt, "MULTIPLY", v, 1.4, -1150, -400), grain_v.inputs["Y"])
    grain = _bruit(nt, grain_v.outputs[0], 3.0, 4.0, w=0.0, vitesse=0.35, x=-800, y=-300)
    dentelle = _plage(nt, grain, 0.5, 0.62, 0.0, 1.0, -600, -300)
    alpha = None
    for k in range(2):
        # le front de la lame : du large (0,95) au sable (0,05), puis il se retire ; décalé selon l'endroit du bord
        decal = _bruit(nt, grain_v.outputs[0], 0.25, 1.0, w=9.0 * k, x=-1000, y=300 + 300 * k)
        phase = _maths(nt, "FRACT", _maths(nt, "ADD", decal, 0.5 * k, -800, 300 + 300 * k), None, -650, 300 + 300 * k)
        t = _noeud(nt, "ShaderNodeValue", -1000, 450 + 300 * k)
        _temps(t.outputs[0], 0.2)
        ph = _maths(nt, "FRACT", _maths(nt, "ADD", phase, t.outputs[0], -500, 350 + 300 * k), None, -350, 350 + 300 * k)
        avance = _plage(nt, ph, 0.0, 0.6, 0.0, 1.0, -200, 300 + 300 * k)
        retrait = _plage(nt, ph, 0.6, 1.0, 0.0, 1.0, -200, 450 + 300 * k)
        front = _maths(nt, "ADD", _maths(nt, "MULTIPLY", avance, -0.9, 0, 300 + 300 * k), _maths(nt, "ADD", 0.95, _maths(nt, "MULTIPLY", retrait, 0.2, 0, 450 + 300 * k), 150, 450 + 300 * k), 300, 350 + 300 * k)
        ecart = _maths(nt, "ABSOLUTE", _maths(nt, "SUBTRACT", v, front, 450, 350 + 300 * k), None, 600, 350 + 300 * k)
        crete = _plage(nt, ecart, 0.07, 0.0, 0.0, 1.0, 750, 350 + 300 * k)
        force = _maths(nt, "MULTIPLY", _plage(nt, ph, 0.0, 0.2, 0.0, 1.0, 750, 500 + 300 * k), _maths(nt, "SUBTRACT", 1.0, retrait, 750, 650 + 300 * k), 900, 550 + 300 * k)
        lame = _maths(nt, "MULTIPLY", _maths(nt, "MULTIPLY", crete, force, 1050, 400 + 300 * k), _maths(nt, "ADD", 0.45, _maths(nt, "MULTIPLY", dentelle, 0.55, 1050, 250), 1200, 250), 1350, 400 + 300 * k)
        alpha = lame if alpha is None else _maths(nt, "MAXIMUM", alpha, lame, 1500, 500)
    lisere = _maths(nt, "MULTIPLY", _plage(nt, v, 0.13, 0.0, 0.0, 1.0, 1300, -200), _plage(nt, grain, 0.42, 0.6, 0.25, 0.85, 1300, -350), 1500, -250)
    alpha = _maths(nt, "MAXIMUM", alpha, lisere, 1650, 200)
    alpha = _maths(nt, "MULTIPLY", alpha, _plage(nt, v, 1.0, 0.85, 0.0, 1.0, 1650, 0), 1800, 100, borne=True)
    alpha = _maths(nt, "MULTIPLY", alpha, 0.9, 1950, 100)
    blanc = _noeud(nt, "ShaderNodeEmission", 1950, -150)
    blanc.inputs["Color"].default_value = _lin((0.97, 0.99, 1.0))
    vide = _noeud(nt, "ShaderNodeBsdfTransparent", 1950, 300)
    mix = _noeud(nt, "ShaderNodeMixShader", 2150, 0)
    lien(alpha, mix.inputs[0])
    lien(vide.outputs[0], mix.inputs[1])
    lien(blanc.outputs[0], mix.inputs[2])
    sortie = _noeud(nt, "ShaderNodeOutputMaterial", 2350, 0)
    lien(mix.outputs[0], sortie.inputs["Surface"])
    return m


def _ombre_rivage():
    """L'eau sombre au pied d'un quai (un ruban, v de 0 à 1, avec son liseré d'écume) ou sous un ponton (une tache, v de 2 à 3)."""
    m = bpy.data.materials.get("clip_ombre5") or bpy.data.materials.new("clip_ombre5")
    m.use_nodes = True
    m.surface_render_method = "BLENDED"
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    uv = _noeud(nt, "ShaderNodeUVMap", -1000, 0, uv_map="motif")
    sep = _noeud(nt, "ShaderNodeSeparateXYZ", -800, 0)
    lien(uv.outputs[0], sep.inputs[0])
    v = sep.outputs["Y"]
    tache = _maths(nt, "GREATER_THAN", v, 1.5, -600, 200)
    loin = _maths(nt, "SUBTRACT", v, _maths(nt, "MULTIPLY", tache, 2.0, -450, 200), -300, 100, borne=True)
    ombre = _maths(nt, "MULTIPLY", _maths(nt, "POWER", _maths(nt, "SUBTRACT", 1.0, loin, -150, 100), 1.7, 0, 100), 0.52, 150, 100)
    grain = _bruit(nt, uv.outputs[0], 8.0, 3.0, w=0.0, vitesse=0.4, x=-600, y=-250)
    lisere = _maths(nt, "MULTIPLY", _maths(nt, "MULTIPLY", _plage(nt, loin, 0.1, 0.0, 0.0, 1.0, -150, -150), _plage(nt, grain, 0.45, 0.6, 0.0, 1.0, -150, -300), 0, -200), _maths(nt, "SUBTRACT", 1.0, tache, 0, -350), 150, -250)
    alpha = _maths(nt, "MAXIMUM", ombre, _maths(nt, "MULTIPLY", lisere, 0.7, 300, -250), 450, 0)
    couleur = _melange(nt, lisere, _lin((0.03, 0.14, 0.18)), _lin((0.95, 0.98, 1.0)), 450, -300)
    e = _noeud(nt, "ShaderNodeEmission", 650, -200)
    lien(couleur, e.inputs["Color"])
    vide = _noeud(nt, "ShaderNodeBsdfTransparent", 650, 150)
    mix = _noeud(nt, "ShaderNodeMixShader", 850, 0)
    lien(alpha, mix.inputs[0])
    lien(vide.outputs[0], mix.inputs[1])
    lien(e.outputs[0], mix.inputs[2])
    sortie = _noeud(nt, "ShaderNodeOutputMaterial", 1050, 0)
    lien(mix.outputs[0], sortie.inputs["Surface"])
    return m


def _anneau_ecume(coll, centre, rayon, debut):
    """L'écume qui reste au pied du maître une fois sorti (le site dessine la même) : un anneau de dentelle qui respire."""
    m = bpy.data.materials.get("clip_anneau5") or bpy.data.materials.new("clip_anneau5")
    m.use_nodes = True
    m.surface_render_method = "BLENDED"
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    coord = _noeud(nt, "ShaderNodeTexCoord", -900, 0)
    plat = _noeud(nt, "ShaderNodeVectorMath", -700, 0, operation="MULTIPLY")
    lien(coord.outputs["Object"], plat.inputs[0])
    plat.inputs[1].default_value = (1.0, 1.0, 0.0)
    d = _noeud(nt, "ShaderNodeVectorMath", -500, 0, operation="LENGTH")
    lien(plat.outputs[0], d.inputs[0])
    dd = d.outputs["Value"]
    profil = _maths(nt, "MULTIPLY", _plage(nt, dd, 0.45, 0.78, 0.0, 1.0, -300, 100), _plage(nt, dd, 1.0, 0.78, 0.0, 1.0, -300, -50), -100, 0)
    grain = _bruit(nt, coord.outputs["Object"], 3.2, 4.0, w=0.0, vitesse=0.5, x=-300, y=-250)
    dentelle = _plage(nt, grain, 0.42, 0.6, 0.15, 1.0, -100, -250)
    alpha = _maths(nt, "MULTIPLY", _maths(nt, "MULTIPLY", profil, dentelle, 100, 0), 0.85, 250, 0)
    blanc = _noeud(nt, "ShaderNodeEmission", 400, -150)
    blanc.inputs["Color"].default_value = _lin((0.97, 0.99, 1.0))
    vide = _noeud(nt, "ShaderNodeBsdfTransparent", 400, 150)
    mix = _noeud(nt, "ShaderNodeMixShader", 600, 0)
    lien(alpha, mix.inputs[0])
    lien(vide.outputs[0], mix.inputs[1])
    lien(blanc.outputs[0], mix.inputs[2])
    sortie = _noeud(nt, "ShaderNodeOutputMaterial", 800, 0)
    lien(mix.outputs[0], sortie.inputs["Surface"])
    me = bpy.data.meshes.get("clip_anneau5")
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=48, radius=1.0)
        me = bpy.data.meshes.new("clip_anneau5")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(m)
    o = bpy.data.objects.new("clip_anneau5", me)
    coll.objects.link(o)
    o.location = Vector(centre) + Vector((0, 0, 0.06))
    V4._cles(o, "scale", [(debut, (rayon * 0.5, rayon * 0.5, 1)), (debut + 14, (rayon * 1.25, rayon * 1.25, 1)), (debut + 40, (rayon, rayon, 1)),
                          (debut + 75, (rayon * 1.08, rayon * 1.08, 1)), (debut + 105, (rayon * 0.98, rayon * 0.98, 1))])
    V4._visible(o, debut, 10_000)
    return o


def _gerbe5(coll, centre, debut, force=1.0, graine=1, n=26):
    """Une gerbe d'écume (celle de la V4, en plus fin) : un anneau qui s'ouvre et des gouttes qui montent puis retombent ;
    les gouttes prennent la lumière de la scène (sans trait d'encre, un blanc tout plat ferait des pastilles)."""
    import random
    m = bpy.data.materials.get("clip5_ecume") or bpy.data.materials.new("clip5_ecume")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    b = _noeud(nt, "ShaderNodeBsdfPrincipled", 0, 0)
    b.inputs["Base Color"].default_value = _lin((0.92, 0.96, 1.0))
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Emission Color"].default_value = _lin((0.92, 0.96, 1.0))
    b.inputs["Emission Strength"].default_value = 0.4
    sortie = _noeud(nt, "ShaderNodeOutputMaterial", 300, 0)
    nt.links.new(b.outputs[0], sortie.inputs["Surface"])
    # l'onde : une couronne d'écume en dentelle qui s'ouvre vite et s'efface (au lieu de l'anneau plein de la V4, fait pour le trait)
    onde = bpy.data.materials.get("clip5_onde") or bpy.data.materials.new("clip5_onde")
    onde.use_nodes = True
    onde.surface_render_method = "BLENDED"
    nt = onde.node_tree
    nt.nodes.clear()
    if nt.animation_data:
        nt.animation_data_clear()
    lien = nt.links.new
    coord = _noeud(nt, "ShaderNodeTexCoord", -900, 0)
    plat = _noeud(nt, "ShaderNodeVectorMath", -700, 0, operation="MULTIPLY")
    lien(coord.outputs["Object"], plat.inputs[0])
    plat.inputs[1].default_value = (1.0, 1.0, 0.0)
    rd = _noeud(nt, "ShaderNodeVectorMath", -500, 0, operation="LENGTH")
    lien(plat.outputs[0], rd.inputs[0])
    dd = rd.outputs["Value"]
    profil = _maths(nt, "MULTIPLY", _plage(nt, dd, 0.55, 0.86, 0.0, 1.0, -300, 100), _plage(nt, dd, 1.0, 0.86, 0.0, 1.0, -300, -50), -100, 0)
    grain = _bruit(nt, coord.outputs["Object"], 4.0, 4.0, w=1.0, vitesse=0.8, x=-300, y=-250)
    dentelle = _plage(nt, grain, 0.4, 0.58, 0.2, 1.0, -100, -250)
    force_onde = _noeud(nt, "ShaderNodeValue", -100, 200)
    force_onde.name = "force"
    alpha = _maths(nt, "MULTIPLY", _maths(nt, "MULTIPLY", profil, dentelle, 100, 0), force_onde.outputs[0], 250, 0)
    blanc = _noeud(nt, "ShaderNodeEmission", 400, -150)
    blanc.inputs["Color"].default_value = _lin((0.96, 0.98, 1.0))
    vide = _noeud(nt, "ShaderNodeBsdfTransparent", 400, 150)
    mix = _noeud(nt, "ShaderNodeMixShader", 600, 0)
    lien(alpha, mix.inputs[0])
    lien(vide.outputs[0], mix.inputs[1])
    lien(blanc.outputs[0], mix.inputs[2])
    sortie = _noeud(nt, "ShaderNodeOutputMaterial", 800, 0)
    lien(mix.outputs[0], sortie.inputs["Surface"])
    for image, v in ((debut, 0.0), (debut + 2, 1.0), (debut + 14, 0.85), (debut + 32, 0.0)):
        force_onde.outputs[0].default_value = v
        force_onde.outputs[0].keyframe_insert("default_value", frame=image)
    me = bpy.data.meshes.get("clip5_onde")
    if not me:
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=64, radius=1.0)
        me = bpy.data.meshes.new("clip5_onde")
        bm.to_mesh(me)
        bm.free()
    me.materials.clear()
    me.materials.append(onde)
    a = bpy.data.objects.new("clip5_onde", me)
    coll.objects.link(a)
    a.location = Vector(centre) + Vector((0, 0, 0.07))
    k = 4.2 * force
    V4._cles(a, "scale", [(debut, (1.4 * force, 1.4 * force, 1)), (debut + 16, (k, k, 1)), (debut + 32, (k * 1.35, k * 1.35, 1))])
    V4._visible(a, debut, debut + 32)
    goutte = bpy.data.meshes.get("clip5_goutte")
    if not goutte:
        bm = B.ico(0.32, 2)
        goutte = bpy.data.meshes.new("clip5_goutte")
        bm.to_mesh(goutte)
        bm.free()
        goutte.materials.append(m)
        for f in goutte.polygons:
            f.use_smooth = True
    rnd = random.Random(graine)
    for i in range(n):
        g = bpy.data.objects.new("clip5_goutte", goutte)
        coll.objects.link(g)
        ang = i / n * math.tau + rnd.uniform(-0.2, 0.2)
        r0 = rnd.uniform(1.5, 3.2) * force
        r1 = r0 + rnd.uniform(1.5, 4.0) * force
        h = rnd.uniform(4.5, 10.0) * force
        d = rnd.randint(0, 4)
        p = lambda r, z: Vector(centre) + Vector((math.cos(ang) * r, math.sin(ang) * r, z))
        t = rnd.uniform(0.4, 0.85) * force
        V4._cles(g, "location", [(debut + d, p(r0, 0)), (debut + d + 9, p((r0 + r1) / 2, h)), (debut + d + 22, p(r1, -1.0))])
        V4._cles(g, "scale", [(debut + d, (t * 0.4, t * 0.4, t * 0.4)), (debut + d + 4, (t, t, t)), (debut + d + 18, (t * 0.8, t * 0.8, t * 0.8)), (debut + d + 22, (t * 0.3, t * 0.3, t * 0.3))])
        V4._visible(g, debut + d, debut + d + 21)


def _ecran(cam, cible, p, lens=34.0, aspect=960 / 600):
    """Où tombe le point p dans l'image (x et y de -1 à 1, le haut en +1) pour une caméra en cam qui vise cible."""
    av = (Vector(cible) - Vector(cam)).normalized()
    droite = av.cross(Vector((0, 0, 1))).normalized()
    haut = droite.cross(av)
    d = Vector(p) - Vector(cam)
    prof = max(d.dot(av), 0.01)
    tx = 18.0 / lens
    return d.dot(droite) / prof / tx, d.dot(haut) / prof / (tx / aspect)


def _soleil(coll, force=3.2, couleur=(1.0, 0.87, 0.68)):
    lu = bpy.data.lights.get("clip_soleil5") or bpy.data.lights.new("clip_soleil5", "SUN")
    lu.energy = force
    lu.color = couleur
    lu.angle = math.radians(3.0)
    o = bpy.data.objects.new("clip_soleil5", lu)
    coll.objects.link(o)
    v = Vector(SOLEIL).normalized()
    o.rotation_euler = (math.acos(v.z), 0, math.atan2(v.x, -v.y))
    return o


def _repere(nom_coll, anim, defaut):
    for o in bpy.data.collections[nom_coll].all_objects:
        if o.get("role") == "repere" and o.get("anim") == anim:
            return float(o.get("rayon", defaut))
    return defaut


def construire_ile(id_):
    coll = V4._vider()
    nom_ile, nom_maitre = f"ile_{id_}_v5", f"maitre_{id_}_v5"
    r = _repere(nom_ile, "mer", 8.5)  # la côte de l'île, comme le site la prend pour sa mer
    taille = TAILLE_MAITRE.get(id_, 5.5)
    mn, mx = V4._bornes(nom_maitre)
    haut = mx.z * ECHELLE_MAITRE
    _mer(coll, materiau_mer5(), r)
    A._instance(coll, nom_ile, "clip_ile", (0, 0, 0))
    # le maître sort de l'eau devant l'île, sur le côté, assez loin pour ne pas la toucher (comme sur la carte)
    f = Vector((math.cos(FACE_ILE), math.sin(FACE_ILE), 0))
    cote = Vector((-f.y, f.x, 0))
    rm = max(abs(mn.x), abs(mn.y), mx.x, mx.y) * ECHELLE_MAITRE  # le rayon du maître sur l'eau
    pm = (cote * 3.0 + f * 0.2).normalized() * (r + rm * 0.95 + 0.6)
    pivot = pm * 0.45 + Vector((0, 0, 3.4 + max(0.0, haut - 10.5) * 0.45))
    # la caméra assez loin pour garder l'île et le maître en entier pendant tout le tour
    demi = max(pivot.dot(cote) + r, pm.dot(cote) + rm - pivot.dot(cote))
    R = max(29.0, (demi + 1.5) * 34 / 18)
    milieu = Vector((math.cos(FACE_ILE) * R, math.sin(FACE_ILE) * R, 8))
    vers = math.atan2(milieu.y - pm.y, milieu.x - pm.x)
    tourne = vers - FACE_MAITRE
    fond = -(haut + 1.5)
    m = A._instance(coll, nom_maitre, "clip_maitre", (pm.x, pm.y, fond), (0, 0, tourne), ECHELLE_MAITRE)
    V4._cles(m, "location", [(6, (pm.x, pm.y, fond)), (22, (pm.x, pm.y, 1.0)), (31, (pm.x, pm.y, -0.35)), (40, (pm.x, pm.y, 0.1)), (75, (pm.x, pm.y, -0.25)), (119, (pm.x, pm.y, 0.2))])
    V4._cles(m, "rotation_euler", [(6, (0.2, 0, tourne - 0.4)), (26, (0, 0, tourne + 0.05)), (119, (0, 0, tourne - 0.06))])
    force = min(1.7, max(1.0, taille / 4.4))
    _gerbe5(coll, (pm.x, pm.y, 0), 13, force=force, graine=sum(map(ord, id_)), n=22)
    _anneau_ecume(coll, (pm.x, pm.y, 0), _repere(nom_maitre, "ecume", 2.6) * ECHELLE_MAITRE * 1.15, 14)
    # le tour de caméra : un arc de 45° autour d'un point entre l'île et son maître, qui descend un peu ; elle recule tant que
    # l'île ou le maître (au plus haut de son saut) sort du cadre à un moment du tour
    mni, mxi = V4._bornes(nom_ile)

    # le maître : les coins de sa boîte (un peu rentrés : les coins d'une boîte sont rarement pleins), tourné et posé comme il l'est
    from mathutils import Matrix
    tour_m = Matrix.Rotation(tourne, 3, "Z")
    centre_m = (mn + mx) / 2
    coins = [pm + tour_m @ (Vector((centre_m.x + (x - centre_m.x) * 0.9, centre_m.y + (y - centre_m.y) * 0.9, max(z, 0.0))) * ECHELLE_MAITRE)
             for x in (mn.x, mx.x) for y in (mn.y, mx.y) for z in (mn.z, mx.z)]

    def temoins(image):
        pts = [v * r for v in (cote, -cote, f, -f)] + [Vector((0, 0, mxi.z))]
        if image >= 16:  # le maître est sorti (au plus haut de son saut vers l'image 22)
            dz = 1.0 if image <= 28 else 0.2
            pts += [c + Vector((0, 0, dz)) for c in coins]
        return pts

    def tour(R, hausse):
        cles = []
        n = 12
        for k in range(n + 1):
            t = k / n
            e = t * t * (3 - 2 * t)
            a = FACE_ILE + math.radians(-25 + 45 * e)
            h = 11.0 + (pivot.z - 3.4) - 3.6 * e
            rr = R * (1.05 - 0.1 * e)
            cles.append((round(119 * t), (pivot.x + math.cos(a) * rr, pivot.y + math.sin(a) * rr, h), tuple(pivot + Vector((0, 0, hausse - 0.4 * e)))))
        return cles

    hausse = 0.0
    for _ in range(24):
        cles = tour(R, hausse)
        cote_dehors = haut_dehors = False
        for image, c, v in cles:
            for p in temoins(image):
                x, y = _ecran(c, v, p)
                cote_dehors |= abs(x) > 0.94 or y < -0.94
                haut_dehors |= y > 0.86
        if cote_dehors:
            R *= 1.04
        elif haut_dehors:
            hausse += 0.35
        else:
            break
    cam = T0._camera(coll, "clip_cam", cles, 34)
    T0._lineaire(cam)
    T0._lineaire(bpy.data.objects["clip_cam_cible"])
    _soleil(coll)
    return {"cam": cam.name, "images": (0, 119), "taille": (960, 600), "sources": {nom_ile, nom_maitre}, "monde": ciel5(), "recul": round(R, 1), "hausse": round(hausse, 2)}


def construire_boss(id_):
    coll = V4._vider()
    _mer(coll, materiau_mer5("clip_mer5_orage", orage=True), -100.0)
    e = A._instance(coll, f"boss_{id_}_v5", "clip_boss", (0, 0, -18), (0, 0, 0), 1.0)
    # il jaillit (un peu trop haut), retombe, puis se balance doucement (la même chorégraphie que la V4)
    V4._cles(e, "location", [(6, (0, 0, -18)), (22, (0, 0, 1.4)), (32, (0, 0, -0.5)), (42, (0, 0, 0.2)), (60, (0, 0, -0.15)), (89, (0, 0, 0.15))])
    V4._cles(e, "rotation_euler", [(6, (0.25, 0, -0.5)), (24, (-0.06, 0, 0.08)), (40, (0.0, 0, -0.03)), (89, (0.02, 0, 0.04))])
    _gerbe5(coll, (0, 0, 0), 12, force=1.6, graine=3, n=30)
    _anneau_ecume(coll, (0, 0, 0), 6.5, 14)
    d = Vector((math.cos(FACE_BOSS), math.sin(FACE_BOSS), 0))
    l = Vector((-d.y, d.x, 0))
    cam = T0._camera(coll, "clip_cam", [
        (0, tuple(d * 23 + Vector((0, 0, 2.0))), (0, 0, 3.0)),
        (26, tuple(d * 19.5 + l * 0.8 + Vector((0, 0, 2.6))), (0, 0, 7.2)),
        (89, tuple(d * 17.5 + l * 3.0 + Vector((0, 0, 3.2))), (0, 0, 7.6)),
    ], 30)
    V4._secousse(coll, cam, 18, 30, 0.6)
    # deux lumières derrière lui (rose et violet, comme l'arène du site) : elles allument l'eau et ce qui luit
    for nom, couleur, cote in (("clip5_rose", 0xff4f9a, 1), ("clip5_violet", 0x9b4dff, -1)):
        lu = bpy.data.lights.get(nom) or bpy.data.lights.new(nom, "AREA")
        lu.energy = 9000
        lu.size = 8
        lu.color = B.rgb(couleur)
        o = bpy.data.objects.new(nom, lu)
        coll.objects.link(o)
        o.location = -d * 14 + l * (9 * cote) + Vector((0, 0, 12))
        o.rotation_euler = (Vector((0, 0, 7)) - o.location).to_track_quat("-Z", "Y").to_euler()
    face = bpy.data.lights.get("clip5_face") or bpy.data.lights.new("clip5_face", "SUN")
    face.energy = 3.0
    face.color = B.rgb(0xffc7dc)
    o = bpy.data.objects.new("clip5_face", face)
    coll.objects.link(o)
    o.rotation_euler = (d * 10 + Vector((0, 0, 8))).to_track_quat("Z", "Y").to_euler()
    return {"cam": cam.name, "images": (0, 89), "taille": (720, 720), "sources": {f"boss_{id_}_v5"}, "monde": V4._monde_boss()}


def _rendre(info, dossier, image_seule=None, qualite=32, nom_essai="essai5"):
    """Le rendu (EEVEE, sans trait d'encre). Tout ce qui est retouché pour le rendu est remis comme avant à la fin."""
    scene = bpy.context.scene
    vl = bpy.context.view_layer
    sources = info["sources"]
    garder = {"clips"} | sources
    # les objets des collections filmées, relevés avant tout changement (une collection exclue ne les donne plus)
    objets = [o for n in sources for o in bpy.data.collections[n].all_objects if o is not None]
    lcs = {lc.name: lc for lc in vl.layer_collection.children}
    clips = bpy.data.collections["clips"]
    remettre = []  # (objet, attribut, valeur d'avant)
    mailles = []  # (maille, ses matières d'avant)
    clairs = []  # (nœud, alpha d'avant)

    def poser(o, attr, valeur):
        remettre.append((o, attr, getattr(o, attr)))
        setattr(o, attr, valeur)

    try:
        for c in scene.collection.children:
            poser(c, "hide_render", c.name not in garder)  # les copies se rendent si leur collection d'origine n'est pas cachée
        for o in list(scene.collection.objects):  # ce qui pend à la racine de la scène (le soleil des cuissons, ...) ne se rend pas
            if o.name not in clips.objects:
                poser(o, "hide_render", True)
        ressac, ombre = _ecume_rivage(), _ombre_rivage()
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
                poser(o, "hide_render", False)  # le ressac : le site le dessine ; ici, sa copie en matière Blender
            elif o.name.startswith("ile_vitres"):
                poser(o, "hide_render", True)  # de jour, les vitres allumées ne se voient pas (comme sur le site)
        for nom, opacite in OPACITE.items():
            mat = bpy.data.materials.get(nom)
            b = mat and mat.use_nodes and next((x for x in mat.node_tree.nodes if x.type == "BSDF_PRINCIPLED"), None)
            if b:
                clairs.append((b, b.inputs["Alpha"].default_value))
                b.inputs["Alpha"].default_value = opacite
        for n in sources:
            if n in lcs:
                poser(lcs[n], "exclude", True)  # les originaux cachés : seules les copies posées se voient
        r = scene.render
        for objet, attr, valeur in ((r, "engine", "BLENDER_EEVEE"), (r, "resolution_x", info["taille"][0]), (r, "resolution_y", info["taille"][1]),
                                    (r, "resolution_percentage", 100), (r, "film_transparent", False), (r, "fps", FPS), (r, "use_freestyle", False),
                                    (scene.view_settings, "view_transform", "Standard"), (scene.view_settings, "look", "None"),
                                    (scene.view_settings, "exposure", 0.0), (scene.view_settings, "gamma", 1.0),
                                    (scene, "world", info["monde"]), (scene, "camera", bpy.data.objects[info["cam"]])):
            poser(objet, attr, valeur)
        try:
            poser(scene.eevee, "taa_render_samples", qualite)
        except Exception:
            pass
        os.makedirs(dossier, exist_ok=True)
        debut, fin = info["images"]
        try:
            r.image_settings.media_type = "IMAGE"
        except Exception:
            pass
        r.image_settings.file_format = "PNG"
        r.image_settings.color_mode = "RGB"
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


def _info(genre, id_):
    return construire_boss(id_) if genre == "boss" else construire_ile(id_)


def essai(genre, id_, image, qualite=32):
    info = _info(genre, id_)
    try:
        return _rendre(info, DOSSIER, image_seule=image, qualite=qualite, nom_essai=f"essai5-{genre}-{id_}")
    finally:
        V4._vider()


def un(genre, id_, refaire=True):
    info = _info(genre, id_)
    nom = f"{genre}-{id_}-v5"
    dossier = os.path.join(DOSSIER, nom)
    try:
        deja = all(os.path.exists(os.path.join(dossier, f"img-{k:04d}.png")) for k in range(info["images"][0], info["images"][1] + 1))
        if refaire or not deja:
            _rendre(info, dossier)
    finally:
        V4._vider()
    sc = bpy.context.scene
    avant = (sc.render.resolution_x, sc.render.resolution_y)
    sc.render.resolution_x, sc.render.resolution_y = info["taille"]
    try:
        V4.encoder(dossier, os.path.join(DOSSIER, nom + ".mp4"), info["images"])
    finally:
        sc.render.resolution_x, sc.render.resolution_y = avant
    return nom


def manquantes(boss=BOSS, iles=ILES, recuire=()):
    """Les collections du niveau 5 qu'il faut cuire avant de filmer (absentes, ou pas encore cuites : sans leur atlas)."""
    voulues = [f"boss_{b}_v5" for b in boss] + [f"ile_{i}_v5" for i in iles] + [f"maitre_{i}_v5" for i in iles]
    faire = []
    for nom in voulues:
        c = bpy.data.collections.get(nom)
        cuite = c is not None and any(s.material and s.material.name.startswith("atlas_") for o in c.all_objects for s in o.material_slots)
        if nom in recuire or not cuite:
            faire.append(nom)
    return faire


def _cuire(nom):
    import importlib
    if nom not in A_CUIRE:
        raise RuntimeError(f"{nom} : pas de recette pour la cuire ici (barhaw_maitres_v5 / barhaw_boss_v5 à la main)")
    module, reglages = A_CUIRE[nom]
    mod = importlib.import_module(module)
    infos = mod.construire(rendu=False, exporter=False, **reglages)
    return {k: v for k, v in (infos or {}).items() if isinstance(v, (int, float, str, list))}


def _bilan():
    try:
        with open(os.path.join(DOSSIER, "bilan-clips-v5.json"), "w", encoding="utf-8") as f:
            json.dump(ETAT, f, ensure_ascii=False, indent=1, default=str)
    except Exception:
        pass


def lancer(boss=BOSS, iles=ILES, recuire=(), seulement_cuire=False):
    """Tout, une étape à la fois (bpy.app.timers) : les cuissons qui manquent, puis les vidéos. Blender reste libre entre deux."""
    os.makedirs(DOSSIER, exist_ok=True)
    etapes = [("cuire", n) for n in manquantes(boss, iles, recuire)]
    if not seulement_cuire:
        etapes += [("boss", b) for b in boss] + [("ile", i) for i in iles]
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
                un(genre, id_)
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


def nettoyer():
    V4._vider()
