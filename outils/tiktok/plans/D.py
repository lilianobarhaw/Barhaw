# Clip D : le compliment raté (RP Minecraft)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from moteur import *

SEGS = [(0.0, 11.8)]
o, fr, DUR = fait_o(SEGS)
SEAM = 652
F, G, DUO = (570, 330), (540, 634), (560, 560)

VISAGE = [
    (0.0, (1.15, *F), "lin"), (0.35, (1.0, *F), "out"),
    (3.46, (1.04, *F), "lin"), (3.56, (1.32, *F), "out"), (4.9, (1.36, *F), "lin"),
    (4.92, (1.0, *F), "lin"),
    (6.3, (1.0, *F), "lin"), (6.4, (1.25, *F), "out"), (7.4, (1.12, *F), "io"),
    (8.3, (1.12, *F), "lin"), (8.4, (1.4, *F), "out"), (9.6, (1.2, *F), "io"),
    (10.5, (1.2, *F), "lin"), (10.6, (1.45, *F), "out"), (DUR, (1.32, *F), "lin"),
]
JEU = [
    (0.0, (1.15, *G), "lin"), (0.35, (1.0, *G), "out"),
    (4.2, (1.0, *DUO), "lin"), (4.3, (1.35, *DUO), "out"), (5.3, (1.0, *G), "io"),
]

CAP = [
    [("LA,", .14, .38), ("LA,", .44, .44), ("LA", .48, .54), ("COULEUR", .66, .96)],
    [("ÉGAYE", 1.06, 1.32), ("TOUJOURS", 1.34, 1.62), ("LES", 1.64, 1.72), ("JOURNÉES.", 1.76, 2.1)],
    [("TOUJOURS", 2.44, 2.74), ("AVEC", 2.8, 2.96), ("LE", 3.0, 3.06), ("SOURIRE,", 3.16, 3.44)],
    [("TORBJÖRN.", 3.48, 3.84, K)],
    [("EUH,", 4.2, 4.34), ("TEDDY.", 4.44, 4.64, K)],
    [("WAOUH !", 4.92, 5.08)],
]

ETIQ = [
    dict(t="LE COMPLIMENT\nLE PLUS RATÉ", a=0.05, b=3.4, fond=BLANC, coul=NOIR, ang=-3),
    dict(t="MAUVAIS PRÉNOM", a=3.5, b=4.9, fond=JAUNE, coul=NOIR, ang=3),
    dict(t="LE VENT", a=4.95, b=8.2, fond=ROSE, coul=BLANC, ang=-3, taille=80),
]

SFX = [
    ("whoosh", 0.0, -4), ("pop", 0.06, -5),
    ("scratch", 3.48 - PIC["scratch"], -3), ("pop", 3.5, -5),
    ("vent", 4.95 - PIC["vent"], -2), ("pop", 4.97, -6),
    ("pop", 6.3, -8, 1.1), ("pop", 8.3, -7, 1.2), ("pop", 10.5, -6, 1.3),
]

P = dict(NOM="D-compliment-rate", SRC="D.mp4", o=o, fr=fr, DUR=DUR,
         PANNEAUX=[(0, SEAM, VISAGE), (SEAM, H - SEAM, JEU)],
         SECOUSSES=[(3.48, 0.25, 10), (4.92, 0.35, 16)],
         CAP=CAP, CAP_Y=664, ETIQ=ETIQ, ETIQ_Y=1160, SFX=SFX,
         MUSIQUE=dict(fichier="musique-chateau.wav", debut=13.0, rel=-4, coupe=[(3.46, 4.93)]),
         FONDU_FIN=0.4)

if __name__ == "__main__":
    lancer(P)
