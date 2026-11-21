# Les images du niveau 5 rendues par outils/blender/barhaw_images_v5.py (PNG, fond transparent, grandes) -> les images du site :
#   ile-<id>.png  -> img/iles/<id>-v5.webp (360 px de large, comme img/iles/<id>.webp)
#   boss-<id>.png -> img/boss/<id>-v5.webp (600 px de haut, comme img/boss/<id>.webp)
# L'image est recadrée au plus près de ce qui se voit (un peu de marge), réduite, puis gardée en WebP avec sa transparence.
# Usage : python3 outils/images_v5.py <dossier des .png> <dossier du site>
import os
import sys

from PIL import Image


def recadrer(im, marge=0.025, seuil=6):
    a = im.getchannel("A").point(lambda v: 255 if v > seuil else 0)
    boite = a.getbbox()
    if not boite:
        return im
    x0, y0, x1, y1 = boite
    m = int(max(x1 - x0, y1 - y0) * marge)
    return im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))


def main(src, site):
    for f in sorted(os.listdir(src)):
        if not f.endswith(".png") or "-" not in f:
            continue
        genre, id_ = f[:-4].split("-", 1)
        if genre not in ("ile", "boss"):
            continue
        im = recadrer(Image.open(os.path.join(src, f)).convert("RGBA"))
        if genre == "ile":
            taille = (360, max(1, round(im.height * 360 / im.width)))
            dest = os.path.join(site, "img", "iles", f"{id_}-v5.webp")
        else:
            taille = (max(1, round(im.width * 600 / im.height)), 600)
            dest = os.path.join(site, "img", "boss", f"{id_}-v5.webp")
        im = im.resize(taille, Image.LANCZOS)
        im.save(dest, "WEBP", quality=86, method=6)
        print(f"{dest} : {im.width} × {im.height}, {os.path.getsize(dest) // 1024} ko")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
