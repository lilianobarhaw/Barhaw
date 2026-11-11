# Prépare l'atlas d'un modèle « niveau 5 » pour le site (voir barhaw_niveau5.py) :
#   · les pixels que la cuisson n'a pas touchés (entre les cartes) prennent la couleur de leurs voisins : sans ça, de
#     loin (quand la carte graphique réduit l'image), un liseré noir apparaît au bord de chaque mur ;
#   · l'image devient un .webp, bien plus léger qu'un .png, à côté du .glb (même nom).
# Usage : python3 atlas_niveau5.py modele.glb atlas.png sortie.webp [qualite]
# (le .glb est celui de Blender, avant compacter_glb.py : on y lit les UV pour savoir où sont les cartes)
import json, struct, sys
import numpy as np
from PIL import Image, ImageDraw

TYPES = {5126: "<f4", 5123: "<u2", 5125: "<u4", 5121: "u1"}
NB = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def cartes(chemin_glb, taille):
    """Le masque des pixels couverts par une face cuite (les matières dont le nom commence par « atlas »)."""
    glb = open(chemin_glb, "rb").read()
    lj = struct.unpack_from("<I", glb, 12)[0]
    g = json.loads(glb[20:20 + lj])
    debut = 20 + lj + 8

    def acc(i):
        a = g["accessors"][i]
        v = g["bufferViews"][a["bufferView"]]
        n = NB[a["type"]]
        x = np.frombuffer(glb, TYPES[a["componentType"]], a["count"] * n, debut + v.get("byteOffset", 0) + a.get("byteOffset", 0))
        return x.reshape(-1, n) if n > 1 else x

    masque = Image.new("L", (taille, taille), 0)
    d = ImageDraw.Draw(masque)
    tris = 0
    for m in g["meshes"]:
        for p in m["primitives"]:
            if not str(g["materials"][p["material"]]["name"]).startswith("atlas"):
                continue
            uv = acc(p["attributes"]["TEXCOORD_0"]) * taille
            for t in acc(p["indices"]).reshape(-1, 3):
                d.polygon([(float(uv[k][0]), float(uv[k][1])) for k in t], fill=255, outline=255)
                tris += 1
    return np.asarray(masque) > 0, tris


def etaler(img, plein, tours=24):
    """Les pixels vides prennent la moyenne de leurs voisins pleins, de proche en proche ; le reste, la couleur moyenne."""
    img = img.astype(np.float32)
    plein = plein.copy()
    for _ in range(tours):
        if plein.all():
            break
        somme = np.zeros_like(img)
        nb = np.zeros(plein.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            v = np.roll(np.roll(plein, dy, 0), dx, 1)
            c = np.roll(np.roll(img, dy, 0), dx, 1)
            # pas de bouclage d'un bord à l'autre
            if dy == 1: v[0, :] = False
            if dy == -1: v[-1, :] = False
            if dx == 1: v[:, 0] = False
            if dx == -1: v[:, -1] = False
            somme += c * v[:, :, None]
            nb += v
        neuf = (~plein) & (nb > 0)
        img[neuf] = somme[neuf] / nb[neuf][:, None]
        plein |= neuf
    if not plein.all():
        img[~plein] = img[plein].mean(0)
    return img


def preparer(chemin_glb, chemin_png, sortie, qualite=84, cote=None):
    im = Image.open(chemin_png).convert("RGB")
    taille = im.size[0]
    plein, tris = cartes(chemin_glb, taille)
    a = etaler(np.asarray(im), plein)
    res = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    if cote and cote != taille:
        res = res.resize((cote, cote), Image.LANCZOS)
    res.save(sortie, "WEBP", quality=qualite, method=6)
    return taille, tris, round(float(plein.mean()), 3)


if __name__ == "__main__":
    q = int(sys.argv[4]) if len(sys.argv) > 4 else 84
    print(preparer(sys.argv[1], sys.argv[2], sys.argv[3], q))
