# Fait, à côté de chaque .glb compacté du site, une version compressée .glbz (environ 4 fois plus légère, sans aucune perte) :
#   1. dans chaque accesseur (positions, normales, couleurs, UV, indices), chaque valeur est remplacée par son écart avec
#      la précédente (les sommets voisins se ressemblent : beaucoup de petits nombres) ;
#   2. les octets sont rangés par « plans » (tous les octets faibles, puis tous les forts, colonne par colonne) ;
#   3. le tout est compressé en gzip (le serveur ne compresse pas les .glb lui-même).
# js/grandline-3d.js (lireGLB) prend le .glbz si le navigateur sait décompresser (DecompressionStream), défait les étapes 2 et 1,
# et retrouve exactement les mêmes octets que le .glb. Sinon il lit le .glb, qui reste là.
# Chaque fichier est vérifié ici : on refait le chemin inverse et on compare au .glb, octet par octet.
# Usage : python3 compresser_glb.py modeles            (tous les .glb du dossier et de ses sous-dossiers)
#         python3 compresser_glb.py modeles/grandline/navire-v4.glb
# À relancer après chaque nouvel export de Blender (après compacter_glb.py).
import gzip, json, os, struct, sys
import numpy as np

TYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32}
NB = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
FILTRE = "delta-octets"


def lire(chemin):
    d = open(chemin, "rb").read()
    assert d[:4] == b"glTF", f"{chemin} : pas un .glb"
    n = struct.unpack("<I", d[12:16])[0]
    g = json.loads(d[20:20 + n])
    m = struct.unpack("<I", d[20 + n:24 + n])[0]
    return g, bytearray(d[28 + n:28 + n + m])


def ecrire_glb(g, bin_):
    j = json.dumps(g, separators=(",", ":")).encode()
    while len(j) % 4:
        j += b" "
    total = 12 + 8 + len(j) + 8 + len(bin_)
    return struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(j), 0x4E4F534A) + j + struct.pack("<II", len(bin_), 0x004E4942) + bytes(bin_)


def zones(g):
    """Pour chaque accesseur : où sont ses octets, son type et combien de colonnes par sommet (le pas compris)."""
    for a in g["accessors"]:
        v = g["bufferViews"][a["bufferView"]]
        t = np.dtype(TYPES[a["componentType"]])
        k = NB[a["type"]]
        pas = v.get("byteStride", t.itemsize * k)
        assert pas % t.itemsize == 0
        debut = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        yield debut, a["count"], pas // t.itemsize, t


def filtrer(g, bin_):
    for debut, n, cols, t in zones(g):
        x = np.frombuffer(bytes(bin_[debut:debut + n * cols * t.itemsize]), t).reshape(n, cols)
        d = x.copy()
        d[1:] = x[1:] - x[:-1]  # arithmétique modulaire : le navigateur fait la même en sens inverse
        plans = d.view(np.uint8).reshape(n, cols, t.itemsize).transpose(2, 1, 0)
        bin_[debut:debut + n * cols * t.itemsize] = plans.tobytes()
    return bin_


def defiltrer(g, bin_):
    """Le chemin inverse (le même que js/grandline-3d.js), pour vérifier."""
    for debut, n, cols, t in zones(g):
        plans = np.frombuffer(bytes(bin_[debut:debut + n * cols * t.itemsize]), np.uint8).reshape(t.itemsize, cols, n)
        d = plans.transpose(2, 1, 0).copy().view(t).reshape(n, cols)
        x = np.cumsum(d, axis=0, dtype=t)
        bin_[debut:debut + n * cols * t.itemsize] = x.tobytes()
    return bin_


def compresser(chemin):
    g, bin_ = lire(chemin)
    if g.get("asset", {}).get("extras", {}).get("filtre"):
        raise ValueError(f"{chemin} est déjà filtré")
    origine = bytes(bin_)
    filtre = filtrer(g, bytearray(bin_))
    g.setdefault("asset", {}).setdefault("extras", {})["filtre"] = FILTRE
    donnees = gzip.compress(ecrire_glb(g, filtre), compresslevel=9, mtime=0)
    # vérification : décompresser, défaire le filtre, comparer
    d = gzip.decompress(donnees)
    n = struct.unpack("<I", d[12:16])[0]
    g2 = json.loads(d[20:20 + n])
    m = struct.unpack("<I", d[20 + n:24 + n])[0]
    retour = defiltrer(g2, bytearray(d[28 + n:28 + n + m]))
    assert bytes(retour) == origine, f"{chemin} : la vérification a échoué"
    sortie = chemin + "z"
    with open(sortie, "wb") as f:
        f.write(donnees)
    return os.path.getsize(chemin), len(donnees)


if __name__ == "__main__":
    cible = sys.argv[1] if len(sys.argv) > 1 else "modeles"
    fichiers = [cible] if cible.endswith(".glb") else sorted(os.path.join(r, f) for r, _, fs in os.walk(cible) for f in fs if f.endswith(".glb"))
    t0 = t1 = 0
    for c in fichiers:
        a, b = compresser(c)
        t0 += a
        t1 += b
        print(f"{os.path.relpath(c, cible if not cible.endswith('.glb') else os.path.dirname(c)):42s} {a // 1024:5d} Ko → {b // 1024:5d} Ko")
    print(f"{'total (' + str(len(fichiers)) + ' fichiers)':42s} {t0 // 1024:5d} Ko → {t1 // 1024:5d} Ko")
