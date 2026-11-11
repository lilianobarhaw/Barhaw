# Prépare l'atlas d'un modèle « niveau 5 » pour le site (voir barhaw_niveau5.py) :
#   · les pixels que la cuisson n'a pas touchés (entre les cartes) prennent la couleur de leurs voisins : sans ça, de
#     loin (quand la carte graphique réduit l'image), un liseré noir apparaît au bord de chaque mur ;
#   · l'image devient un .webp, bien plus léger qu'un .png, à côté du .glb (même nom).
# Usage : python3 atlas_niveau5.py modele.glb atlas.png sortie.webp [qualite]
# (le .glb est celui de Blender, avant compacter_glb.py : on y lit les UV pour savoir où sont les cartes)
import json, struct, sys
import numpy as np
from PIL import Image

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

    # Un pixel est « plein » quand il est tout entier dans une carte (ses quatre coins dans une face). Blender cuit aussi les
    # pixels dont seul le centre est dedans, au bord droit ou bas d'une carte, mais mal : une partie de ses rayons part d'à côté
    # de la face, sous le sol voisin, et le pixel sort 10 à 20 % trop sombre (un fin trait sombre courait le long des raccords
    # du sol). Ces pixels de bord sont donc rendus à leurs voisins, comme le vide entre les cartes. Une face plus fine qu'un
    # pixel, qui n'en a aucun d'entier, garde ceux dont le centre est dedans.
    centre = np.zeros((taille, taille), bool)
    coins = np.zeros((taille + 1, taille + 1), bool)
    tris = 0

    def dedans(a, b, c, aire, decal, borne):
        x0, x1 = max(0, int(np.ceil(min(a[0], b[0], c[0]) - decal - 1e-3))), min(borne, int(np.floor(max(a[0], b[0], c[0]) - decal + 1e-3)))
        y0, y1 = max(0, int(np.ceil(min(a[1], b[1], c[1]) - decal - 1e-3))), min(borne, int(np.floor(max(a[1], b[1], c[1]) - decal + 1e-3)))
        if x1 < x0 or y1 < y0:
            return None
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + decal, np.arange(y0, y1 + 1) + decal)
        w0 = ((b[0] - a[0]) * (Y - a[1]) - (b[1] - a[1]) * (X - a[0])) / aire
        w1 = ((c[0] - b[0]) * (Y - b[1]) - (c[1] - b[1]) * (X - b[0])) / aire
        w2 = ((a[0] - c[0]) * (Y - c[1]) - (a[1] - c[1]) * (X - c[0])) / aire
        return (slice(y0, y1 + 1), slice(x0, x1 + 1)), (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)

    for m in g["meshes"]:
        for p in m["primitives"]:
            if not str(g["materials"][p["material"]]["name"]).startswith("atlas"):
                continue
            uv = acc(p["attributes"]["TEXCOORD_0"]).astype(np.float64) * taille
            for t in acc(p["indices"]).reshape(-1, 3):
                a, b, c = uv[t[0]], uv[t[1]], uv[t[2]]
                tris += 1
                aire = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
                r = dedans(a, b, c, aire, 0.5, taille - 1) if abs(aire) > 1e-9 else None
                if r is not None and r[1].any():
                    centre[r[0]] |= r[1]
                    q = dedans(a, b, c, aire, 0.0, taille)
                    if q is not None:
                        coins[q[0]] |= q[1]
                else:  # une face plus fine qu'un pixel : au moins le pixel de son milieu
                    mx, my = (a + b + c) / 3
                    centre[min(taille - 1, max(0, int(my))), min(taille - 1, max(0, int(mx)))] = True
    entier = coins[:-1, :-1] & coins[1:, :-1] & coins[:-1, 1:] & coins[1:, 1:] & centre
    pres = entier.copy()  # à un pixel d'un pixel entier
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            pres[max(0, dy):taille + min(0, dy), max(0, dx):taille + min(0, dx)] |= entier[max(0, -dy):taille + min(0, -dy), max(0, -dx):taille + min(0, -dx)]
    return entier | (centre & ~pres), tris


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
