# La Grand Line de Barhaw, dans Blender : les outils communs (matières, formes, assemblage, rendu, export).
# Tout ce qui est modélisé ici est original (le navire, les îles, les décors).
# On s'en sert depuis Blender (Scripting, ou par le serveur MCP) :
#   import sys; sys.path.insert(0, r"C:\Users\<toi>\Documents\Barhaw-3D\scripts")
#   import barhaw_navire; barhaw_navire.construire()
# Les objets sont rangés par collection ; chaque collection s'exporte en un .glb pour le site
# (le site remet ses propres matières par nom : garder les noms de PALETTE).
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix, Euler, noise
from mathutils.bvhtree import BVHTree

DOSSIER = os.path.join(os.path.expanduser("~"), "Documents", "Barhaw-3D")

PALETTE = {
    "bois": 0x7a3b2e, "bois2": 0x683025, "bois_fonce": 0x4a2219, "bois_clair": 0xd2a676, "planche": 0x9a6a40,
    "rose": 0xff4f9a, "rose_pale": 0xffb3d1, "violet": 0x9b4dff, "violet_fonce": 0x5e2bb0, "prune": 0x5b1f4a,
    "or": 0xffd36b, "creme": 0xfbf1df, "blanc": 0xffffff, "rouge": 0xe0533c, "rouge_fonce": 0xc2283a,
    "jaune": 0xffb347, "orange": 0xff8a3d, "vert": 0x5fa646, "vert_clair": 0x8fcf5f, "vert_fonce": 0x3f7a35,
    "feuille": 0x4f9e4a, "pierre": 0xa39a8c, "pierre_fonce": 0x6b6258, "roche_noire": 0x3b3236,
    "neige": 0xf4f8ff, "glace": 0xbfe6ff, "lave": 0xff6a1a, "fer": 0x2a2a33, "corde": 0xc9a66b,
    "lumiere": 0xfff1a8, "eau": 0x6fb0c8, "turquoise": 0x3fd0c9, "luciole": 0xfff27a,
    "voile": 0xfbf1df, "voile_b": 0xfbf1df, "flamme": 0xff4f9a, "drapeau": 0xff4f9a, "terrain": 0xffffff,
    "gres": 0xd98a4a, "paille": 0xe8c66a, "feu": 0xff9a1f, "eau_douce": 0x5fd0d8, "corail": 0xff7a8a,
    "noir": 0x1f1a22, "sable": 0xe9cf98, "pois": 0xffffff, "gris": 0x8a8796, "champi_pied": 0xf6ead2, "nuage": 0x585466, "mirage": 0xffe3f0,
}
LUMINEUX = {"lave": 4.0, "lumiere": 3.0, "luciole": 3.0, "feu": 4.0}


def lineaire(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    return ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255


def rgba(h):
    r, g, b = rgb(h)
    return (lineaire(r), lineaire(g), lineaire(b), 1.0)


# ---------- les matières (une par nom de PALETTE) ----------
def materiau(nom):
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    try:
        m.use_nodes = True
    except Exception:
        pass
    col = rgba(PALETTE.get(nom, 0xff00ff))
    m.diffuse_color = col
    nt = m.node_tree
    if nt is not None:
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
            sortie = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
            nt.links.new(bsdf.outputs[0], sortie.inputs[0])
        bsdf.inputs["Base Color"].default_value = col
        bsdf.inputs["Roughness"].default_value = 0.42
        if nom in LUMINEUX:
            bsdf.inputs["Emission Color"].default_value = col
            bsdf.inputs["Emission Strength"].default_value = LUMINEUX[nom]
        image = os.path.join(DOSSIER, "textures", nom + ".png")
        if os.path.exists(image):
            # pour les rendus seulement : le site dessine ses propres toiles (l'export n'emporte pas d'image)
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image = bpy.data.images.load(image, check_existing=True)
            nt.links.new(tex.outputs[0], bsdf.inputs["Base Color"])
            bsdf.inputs["Roughness"].default_value = 0.7
        if nom == "glace":
            bsdf.inputs["Roughness"].default_value = 0.08
        if nom == "terrain":
            # la couleur vient des sommets (attribut « Couleur »)
            attr = nt.nodes.new("ShaderNodeVertexColor")
            attr.layer_name = "Couleur"
            nt.links.new(attr.outputs[0], bsdf.inputs["Base Color"])
            bsdf.inputs["Roughness"].default_value = 0.85
    return m


# ---------- les collections ----------
def collection(nom, vider=True):
    c = bpy.data.collections.get(nom)
    if c is None:
        c = bpy.data.collections.new(nom)
        bpy.context.scene.collection.children.link(c)
    elif vider:
        for o in list(c.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
    return c


def nettoyer():
    for blocs in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for b in list(blocs):
            if b.users == 0:
                blocs.remove(b)


# ---------- les formes (des bmesh) ----------
def mat4(loc=(0, 0, 0), rot=(0, 0, 0), ech=1.0):
    if isinstance(ech, (int, float)):
        ech = (ech, ech, ech)
    return Matrix.LocRotScale(Vector(loc), Euler(rot), Vector(ech))


def cyl(r1, r2, h, seg=12, caps=True):
    """Un cylindre (ou un cône) posé sur z = 0."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    return bm


def boite(x, y, z):
    """Une boîte posée sur z = 0."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(x, y, z), verts=bm.verts)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, z / 2))
    return bm


def sphere(r, seg=16, anneaux=10):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=anneaux, radius=r)
    return bm


def ico(r, sub=2):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return bm


def demi_sphere(r, seg=16, anneaux=6, bas=False):
    """Un dôme (le dessus d'une sphère), fermé dessous."""
    bm = bmesh.new()
    pts = []
    for i in range(anneaux + 1):
        a = (math.pi / 2) * i / anneaux
        pts.append((math.cos(a) * r, math.sin(a) * r))
    rangs = []
    for rr, z in pts[:-1]:
        rangs.append([bm.verts.new((math.cos(2 * math.pi * k / seg) * rr, math.sin(2 * math.pi * k / seg) * rr, z)) for k in range(seg)])
    haut = bm.verts.new((0, 0, r))
    for i in range(len(rangs) - 1):
        for k in range(seg):
            bm.faces.new((rangs[i][k], rangs[i][(k + 1) % seg], rangs[i + 1][(k + 1) % seg], rangs[i + 1][k]))
    for k in range(seg):
        bm.faces.new((rangs[-1][k], rangs[-1][(k + 1) % seg], haut))
    bm.faces.new(list(reversed(rangs[0])))
    return bm


def tore(R, r, seg=24, segr=8):
    bm = bmesh.new()
    rangs = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        rangs.append([bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
                      for b in [2 * math.pi * j / segr for j in range(segr)]])
    for i in range(seg):
        for j in range(segr):
            bm.faces.new((rangs[i][j], rangs[(i + 1) % seg][j], rangs[(i + 1) % seg][(j + 1) % segr], rangs[i][(j + 1) % segr]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def tube(points, rayons, seg=8, caps=True):
    """Un tube qui suit une ligne (troncs, branches, cordes, tentacules…)."""
    pts = [Vector(p) for p in points]
    n = len(pts)
    if isinstance(rayons, (int, float)):
        rayons = [rayons] * n
    bm = bmesh.new()
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    nrm = t0.cross(ref).normalized()
    anneaux = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        nrm = (nrm - t * nrm.dot(t)).normalized()
        b = t.cross(nrm)
        anneaux.append([bm.verts.new(p + (nrm * math.cos(a) + b * math.sin(a)) * rayons[i])
                        for a in [2 * math.pi * k / seg for k in range(seg)]])
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((anneaux[i][k], anneaux[i][(k + 1) % seg], anneaux[i + 1][(k + 1) % seg], anneaux[i + 1][k]))
    if caps:
        bm.faces.new(list(reversed(anneaux[0])))
        bm.faces.new(anneaux[-1])
    return bm


def courbe(a, b, c, n=8):
    """Les points d'une courbe de Bézier (a → b, tirée par c)."""
    a, b, c = Vector(a), Vector(b), Vector(c)
    return [a * (1 - t) ** 2 + c * 2 * t * (1 - t) + b * t * t for t in [i / (n - 1) for i in range(n)]]


def ruban(points, largeurs, haut=(0, 0, 1), pli=0.18):
    """Une feuille : un ruban en V (une nervure au milieu)."""
    pts = [Vector(p) for p in points]
    n = len(pts)
    if isinstance(largeurs, (int, float)):
        largeurs = [largeurs] * n
    up = Vector(haut).normalized()
    bm = bmesh.new()
    rangs = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        s = t.cross(up)
        if s.length < 1e-4:
            s = Vector((1, 0, 0))
        s.normalize()
        w = largeurs[i]
        rangs.append([bm.verts.new(p - s * w - up * pli * w), bm.verts.new(p + up * pli * w * 0.3), bm.verts.new(p + s * w - up * pli * w)])
    for i in range(n - 1):
        for k in range(2):
            bm.faces.new((rangs[i][k], rangs[i][k + 1], rangs[i + 1][k + 1], rangs[i + 1][k]))
    return bm


def etoile(r1, r2, ep, branches=5, bombe=0.6, depart=math.pi / 2):
    """Une étoile bombée (comme un bijou), dans le plan XY, épaisse en Z."""
    bm = bmesh.new()
    pts = []
    for k in range(branches * 2):
        a = depart + k * math.pi / branches
        r = r1 if k % 2 == 0 else r2
        pts.append((math.cos(a) * r, math.sin(a) * r))
    devant = [bm.verts.new((x, y, ep / 2)) for x, y in pts]
    derriere = [bm.verts.new((x, y, -ep / 2)) for x, y in pts]
    c1 = bm.verts.new((0, 0, ep / 2 + bombe * r2))
    c2 = bm.verts.new((0, 0, -ep / 2 - bombe * r2 * 0.4))
    m = len(pts)
    for k in range(m):
        bm.faces.new((devant[k], devant[(k + 1) % m], c1))
        bm.faces.new((derriere[(k + 1) % m], derriere[k], c2))
        bm.faces.new((devant[(k + 1) % m], devant[k], derriere[k], derriere[(k + 1) % m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def caillou(r, graine=0, rugosite=0.35, sub=2, ech=(1, 1, 1)):
    """Un rocher : une sphère cabossée."""
    bm = ico(r, sub)
    off = Vector((graine * 7.31, graine * 3.17, graine * 1.93))
    for v in bm.verts:
        d = noise.fractal(v.co * (1.6 / max(r, 0.01)) + off, 0.8, 2.0, 3)
        v.co *= 1 + d * rugosite
        v.co.x *= ech[0]
        v.co.y *= ech[1]
        v.co.z *= ech[2]
    return bm


def prisme(w, d, h):
    """Un toit à deux pans (le faîte selon X), posé sur z = 0."""
    bm = bmesh.new()
    a = [bm.verts.new(p) for p in [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0), (-w / 2, 0, h), (w / 2, 0, h)]]
    bm.faces.new((a[0], a[1], a[5], a[4]))
    bm.faces.new((a[2], a[3], a[4], a[5]))
    bm.faces.new((a[0], a[4], a[3]))
    bm.faces.new((a[1], a[2], a[5]))
    bm.faces.new((a[0], a[3], a[2], a[1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def deformer(bm, f):
    for v in bm.verts:
        v.co = f(v.co)
    return bm


# ---------- l'assemblage : des morceaux rangés par matière, réunis en un seul objet ----------
class Lot:
    def __init__(self):
        self.v, self.f, self.m, self.s, self.uv, self.mats = [], [], [], [], [], []
        self.couleurs = None

    def mat(self, nom):
        if nom not in self.mats:
            self.mats.append(nom)
        return self.mats.index(nom)

    def ajouter(self, bm, mat, M=None, lisse=True, couche_mat=None):
        """couche_mat : le nom d'une couche int de faces (bm.faces.layers.int) qui indexe une liste de matières."""
        if M is not None:
            bm.transform(M)
        bm.verts.index_update()
        o = len(self.v)
        self.v.extend(v.co.copy() for v in bm.verts)
        uvl = bm.loops.layers.uv.active
        fl = bm.faces.layers.int.get(couche_mat[0]) if couche_mat else None
        k = self.mat(mat) if mat else 0
        for f in bm.faces:
            self.f.append([v.index + o for v in f.verts])
            self.m.append(self.mat(couche_mat[1][f[fl]]) if fl is not None else k)
            self.s.append(lisse)
            self.uv.append([tuple(l[uvl].uv) for l in f.loops] if uvl else None)
        bm.free()
        return self

    def faces(self, verts, faces, mat, lisse=True, uvs=None):
        o = len(self.v)
        k = self.mat(mat)
        self.v.extend(Vector(p) for p in verts)
        for i, f in enumerate(faces):
            self.f.append([j + o for j in f])
            self.m.append(k)
            self.s.append(lisse)
            self.uv.append(uvs[i] if uvs else None)
        return self

    def vide(self):
        return not self.f

    def objet(self, nom, coll, angle=38, parent=None, origine=None):
        me = bpy.data.meshes.new(nom)
        verts = [tuple(v - Vector(origine)) if origine else tuple(v) for v in self.v]
        me.from_pydata(verts, [], self.f)
        for n in self.mats:
            me.materials.append(materiau(n))
        me.polygons.foreach_set("material_index", self.m)
        me.polygons.foreach_set("use_smooth", self.s)
        if any(u is not None for u in self.uv):
            couche = me.uv_layers.new(name="UVMap")
            for p, uvs in zip(me.polygons, self.uv):
                for n, li in enumerate(p.loop_indices):
                    couche.data[li].uv = uvs[n] if uvs else (0.0, 0.0)
        if self.couleurs is not None:
            attr = me.color_attributes.new("Couleur", "FLOAT_COLOR", "POINT")
            for i, c in enumerate(self.couleurs):
                attr.data[i].color = c
        me.update()
        try:
            me.set_sharp_from_angle(angle=math.radians(angle))
        except Exception:
            pass
        o = bpy.data.objects.new(nom, me)
        coll.objects.link(o)
        if origine:
            o.location = Vector(origine)
        if parent:
            o.parent = parent
        return o


def anime(o, genre, **reglages):
    """Ce que le site doit animer sur cet objet (exporté dans les « extras » du glTF)."""
    o["anim"] = genre
    for k, v in reglages.items():
        o[k] = v
    return o


# ---------- poser sur un relief ----------
class Sol:
    def __init__(self, verts, faces):
        self.bvh = BVHTree.FromPolygons([tuple(v) for v in verts], faces)

    def z(self, x, y, defaut=0.0):
        hit = self.bvh.ray_cast(Vector((x, y, 60)), Vector((0, 0, -1)))
        return hit[0].z if hit[0] is not None else defaut

    def normale(self, x, y):
        hit = self.bvh.ray_cast(Vector((x, y, 60)), Vector((0, 0, -1)))
        return hit[1] if hit[1] is not None else Vector((0, 0, 1))


# ---------- la vitrine : un rendu pour montrer le travail ----------
def vitrine(collections, cam, cible, objectif=50, nom="rendu", taille=(1600, 1000), mer=True, mer_taille=80, trait=1.6, transparent=False):
    scene = bpy.context.scene
    garder = set(collections) | {"vitrine"}
    for c in scene.collection.children:
        c.hide_render = c.name not in garder
        c.hide_viewport = c.name not in garder
    for o in scene.collection.objects:
        o.hide_render = True
        o.hide_viewport = True
    v = collection("vitrine")
    camera = bpy.data.cameras.new("cam_vitrine")
    camera.lens = objectif
    camera.clip_end = 2000
    co = bpy.data.objects.new("cam_vitrine", camera)
    v.objects.link(co)
    co.location = Vector(cam)
    direction = Vector(cible) - Vector(cam)
    co.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = co
    soleil = bpy.data.lights.new("soleil_vitrine", "SUN")
    soleil.energy = 3.2
    soleil.angle = math.radians(8)
    so = bpy.data.objects.new("soleil_vitrine", soleil)
    v.objects.link(so)
    so.rotation_euler = Euler((math.radians(42), math.radians(-18), math.radians(-35)))
    if mer:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=48, y_segments=48, size=mer_taille)
        me = bpy.data.meshes.new("mer_vitrine")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(materiau("eau"))
        mo = bpy.data.objects.new("mer_vitrine", me)
        v.objects.link(mo)
        mo.location.z = -0.02
    monde = scene.world or bpy.data.worlds.new("monde")
    scene.world = monde
    try:
        monde.use_nodes = True
    except Exception:
        pass
    fond = next((n for n in monde.node_tree.nodes if n.type == "BACKGROUND"), None) if monde.node_tree else None
    if fond:
        fond.inputs[0].default_value = rgba(0xf3e3c3)
        fond.inputs[1].default_value = 1.15
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = taille
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "None"
    except Exception:
        pass
    try:
        scene.eevee.taa_render_samples = 48
    except Exception:
        pass
    # un trait d'encre autour des formes (comme les figurines du site)
    try:
        scene.render.use_freestyle = trait > 0
        scene.render.line_thickness_mode = "ABSOLUTE"
        scene.render.line_thickness = max(trait, 0.1)
        vl = scene.view_layers[0]
        vl.use_freestyle = True
        fs = vl.freestyle_settings
        ls = fs.linesets[0] if fs.linesets else fs.linesets.new("contour")
        ls.linestyle.color = rgb(0x2a160c)
        ls.select_by_visibility = True
        ls.select_silhouette = True
        ls.select_border = False
        ls.select_crease = True
        fs.crease_angle = math.radians(120)
    except Exception:
        pass
    dossier = os.path.join(DOSSIER, "rendus")
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, nom + ".png")
    scene.render.filepath = chemin
    bpy.ops.render.render(write_still=True)
    return chemin


def fin_vitrine():
    scene = bpy.context.scene
    collection("vitrine")
    for c in scene.collection.children:
        c.hide_render = False
        c.hide_viewport = False
    nettoyer()


# ---------- l'export pour le site ----------
def exporter(collection_nom, fichier):
    dossier = os.path.join(DOSSIER, "glb")
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, fichier)
    c = bpy.data.collections[collection_nom]
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in c.all_objects:
        o.hide_set(False)
        o.select_set(True)
    reglages = dict(filepath=chemin, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                    export_extras=True, export_materials="EXPORT", export_texcoords=True, export_normals=True,
                    export_cameras=False, export_lights=False, export_animations=False, export_image_format="NONE")
    try:
        bpy.ops.export_scene.gltf(**reglages, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**reglages)
    for o in c.all_objects:
        o.select_set(False)
    return chemin, os.path.getsize(chemin)
