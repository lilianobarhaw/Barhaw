# Étalonne l'atlas d'une île « niveau 5 » avant de l'installer : éclaircit les ombres (gamma), ravive un peu les couleurs.
# Pour une île que sa propre forme met à l'ombre (les orgues de basalte de l'Île Tonnerre : chaque colonne cache ses
# voisines) et qui sortirait trop sombre sur le site. L'image cuite par Blender n'est pas touchée : on écrit à côté.
# Usage : python3 etalonner_atlas.py atlas.png sortie.png gamma [saturation]
#   gamma < 1 : plus clair (0.8 : les ombres gagnent un tiers, les clairs un dixième) ; saturation > 1 : plus de couleur
import sys
import numpy as np
from PIL import Image

entree, sortie, gamma = sys.argv[1], sys.argv[2], float(sys.argv[3])
sat = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
im = Image.open(entree)
a = np.asarray(im.convert("RGBA"), np.float32) / 255
c = np.clip(a[..., :3], 0, 1) ** gamma
gris = (c * (0.299, 0.587, 0.114)).sum(-1, keepdims=True)
c = np.clip(gris + (c - gris) * sat, 0, 1)
a = np.concatenate([c, a[..., 3:]], -1)
Image.fromarray((a * 255 + 0.5).astype(np.uint8), "RGBA").convert(im.mode if im.mode in ("RGB", "RGBA") else "RGBA").save(sortie)
print("étalonné", sortie, "gamma", gamma, "saturation", sat)
