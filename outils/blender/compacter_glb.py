# Rend les .glb exportés par Blender plus légers pour le site (le serveur ne compresse pas ce type de fichier) :
#   positions → entiers 16 bits (centre et demi-taille dans les extras de l'accesseur)
#   normales → entiers 8 bits, couleurs → 8 bits (déjà en sRGB), UV → 16 bits (min et écart dans les extras)
# Seul js/grandline-3d.js sait relire ces fichiers (c'est voulu : pas de chargeur externe).
# Usage : python3 compacter_glb.py dossier_entree dossier_sortie
import json, struct, sys, os
import numpy as np

TYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NB = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def lire(chemin):
    d = open(chemin, "rb").read()
    assert d[:4] == b"glTF"
    n = struct.unpack("<I", d[12:16])[0]
    g = json.loads(d[20:20 + n])
    m = struct.unpack("<I", d[20 + n:24 + n])[0]
    bin_ = d[28 + n:28 + n + m]
    return g, bin_


def donnees(g, bin_, i):
    a = g["accessors"][i]
    v = g["bufferViews"][a["bufferView"]]
    t = TYPES[a["componentType"]]
    k = NB[a["type"]]
    taille = np.dtype(t).itemsize
    pas = v.get("byteStride", taille * k)
    debut = v.get("byteOffset", 0) + a.get("byteOffset", 0)
    brut = np.frombuffer(bin_, dtype=np.uint8, count=pas * (a["count"] - 1) + taille * k, offset=debut)
    lignes = np.lib.stride_tricks.as_strided(brut, shape=(a["count"], taille * k), strides=(pas, 1)).copy()
    x = lignes.view(t).reshape(a["count"], k).astype(np.float64)
    if a.get("normalized"):
        x = x / float(np.iinfo(t).max)
    return x


def vers_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def compacter(entree, sortie):
    g, bin_ = lire(entree)
    neuf = bytearray()
    vues, accs = [], []

    def ajouter(tab, comp, type_, count, normalise=False, pas=None, extras=None, cible=None):
        while len(neuf) % 4:
            neuf.append(0)
        vue = {"buffer": 0, "byteOffset": len(neuf), "byteLength": len(tab)}
        if pas:
            vue["byteStride"] = pas
        if cible:
            vue["target"] = cible
        neuf.extend(tab)
        vues.append(vue)
        acc = {"bufferView": len(vues) - 1, "componentType": comp, "count": count, "type": type_}
        if normalise:
            acc["normalized"] = True
        if extras:
            acc["extras"] = extras
        accs.append(acc)
        return len(accs) - 1

    for mesh in g.get("meshes", []):
        for p in mesh["primitives"]:
            att = {}
            for nom, i in p["attributes"].items():
                x = donnees(g, bin_, i)
                n = len(x)
                if nom == "POSITION":
                    mn, mx = x.min(0), x.max(0)
                    centre = (mn + mx) / 2
                    demi = np.maximum((mx - mn) / 2, 1e-6)
                    q = np.round((x - centre) / demi * 32767).astype(np.int16)
                    q4 = np.zeros((n, 4), np.int16)
                    q4[:, :3] = q
                    att[nom] = ajouter(q4.tobytes(), 5122, "VEC3", n, True, 8, {"centre": [round(float(c), 6) for c in centre], "demi": [round(float(c), 6) for c in demi]}, 34962)
                elif nom == "NORMAL":
                    q4 = np.zeros((n, 4), np.int8)
                    q4[:, :3] = np.round(np.clip(x, -1, 1) * 127).astype(np.int8)
                    att[nom] = ajouter(q4.tobytes(), 5120, "VEC3", n, True, 4, None, 34962)
                elif nom.startswith("COLOR"):
                    c = vers_srgb(x[:, :3])
                    q4 = np.full((n, 4), 255, np.uint8)
                    q4[:, :3] = np.round(c * 255).astype(np.uint8)
                    att[nom] = ajouter(q4.tobytes(), 5121, "VEC4", n, True, 4, {"srgb": True}, 34962)
                elif nom.startswith("TEXCOORD"):
                    mn = x.min(0)
                    ecart = np.maximum(x.max(0) - mn, 1e-6)
                    q = np.round((x - mn) / ecart * 65535).astype(np.uint16)
                    att[nom] = ajouter(q.tobytes(), 5123, "VEC2", n, True, 4, {"min": [round(float(c), 6) for c in mn], "ecart": [round(float(c), 6) for c in ecart]}, 34962)
            p["attributes"] = att
            if "indices" in p:
                ix = donnees(g, bin_, p["indices"]).astype(np.int64).ravel()
                if ix.max() < 65536:
                    p["indices"] = ajouter(ix.astype(np.uint16).tobytes(), 5123, "SCALAR", len(ix), cible=34963)
                else:
                    p["indices"] = ajouter(ix.astype(np.uint32).tobytes(), 5125, "SCALAR", len(ix), cible=34963)
    while len(neuf) % 4:
        neuf.append(0)
    g["accessors"] = accs
    g["bufferViews"] = vues
    g["buffers"] = [{"byteLength": len(neuf)}]
    g["extensionsUsed"] = sorted(set(g.get("extensionsUsed", [])) | {"KHR_mesh_quantization"})
    g.setdefault("asset", {})["generator"] = "Barhaw compacter_glb.py"
    j = json.dumps(g, separators=(",", ":")).encode()
    while len(j) % 4:
        j += b" "
    total = 12 + 8 + len(j) + 8 + len(neuf)
    with open(sortie, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(j), 0x4E4F534A))
        f.write(j)
        f.write(struct.pack("<II", len(neuf), 0x004E4942))
        f.write(neuf)
    return os.path.getsize(entree), total


if __name__ == "__main__":
    de, vers = sys.argv[1], sys.argv[2]
    os.makedirs(vers, exist_ok=True)
    t0 = t1 = 0
    for nom in sorted(os.listdir(de)):
        if nom.endswith(".glb"):
            a, b = compacter(os.path.join(de, nom), os.path.join(vers, nom))
            t0 += a
            t1 += b
            print(f"{nom:24s} {a // 1024:5d} Ko → {b // 1024:5d} Ko")
    print(f"{'total':24s} {t0 // 1024:5d} Ko → {t1 // 1024:5d} Ko")
