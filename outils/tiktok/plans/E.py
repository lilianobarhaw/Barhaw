# Clip E : le bisou dans le cou (deux caméras)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from moteur import *

SEGS = [(0.0, 2.5), (3.6, 10.3), (11.4, 13.05)]
o, fr, DUR = fait_o(SEGS)
SEAM = 644
F1, F2, COU = (470, 300), (584, 424), (850, 730)

HAUT = [
    (0.0, (1.12, *F1), "lin"), (0.35, (1.0, *F1), "out"),
    (o(4.34), (1.0, *F1), "lin"), (o(4.34) + 0.1, (1.2, *F1), "out"), (o(5.5), (1.0, *F1), "io"),
    (o(6.76), (1.0, *F1), "lin"), (o(6.76) + 0.1, (1.25, *F1), "out"), (o(7.5), (1.0, *F1), "io"),
]
BAS = [
    (0.0, (1.12, *F2), "lin"), (0.35, (1.0, *F2), "out"),
    (0.40, (1.0, *F2), "lin"), (0.50, (1.2, *F2), "out"), (1.6, (1.05, *F2), "io"),
    (o(6.75), (1.05, *F2), "lin"), (o(6.76), (1.0, *COU), "lin"), (o(6.76) + 0.1, (1.8, *COU), "out"),
    (o(7.9), (1.7, *COU), "lin"), (o(7.92), (1.0, *F2), "lin"),
    (o(8.76), (1.0, *F2), "lin"), (o(8.76) + 0.1, (1.3, *F2), "out"), (o(10.29), (1.2, *F2), "lin"),
    (o(11.4), (1.0, *F2), "lin"), (DUR, (1.1, *F2), "lin"),
]

CAP = [
    [("LA", 0.0, .06), ("ROUND", .1, .2), ("DE...", .24, .34)],
    [("ATTENDS,", .58, .78), ("ÇA,", .96, 1.0), ("PRENDS.", 1.48, 1.8)],
    [("LÀ", 3.82, 3.94), ("SUR", 3.98, 4.059), ("LE", 4.08, 4.14), ("COUP,", 4.18, 4.28)],
    [("LÀ,", 4.34, 4.4), ("T'AS,", 4.5, 4.62), ("T'AS,", 4.68, 4.84), ("T'AS...", 4.94, 5.32)],
    [("NON,", 5.94, 6.04), ("MAIS", 6.1, 6.22), ("C'EST...", 6.26, 6.42)],
    [("ÇA,", 6.76, 6.84), ("LÀ ?", 6.92, 7.04)],
    [("C'EST", 7.56, 7.6), ("RIEN.", 7.64, 7.94)],
    [("ÇA,", 8.0, 8.119), ("C'EST", 8.32, 8.44), ("LE", 8.76, 8.9), ("MÉTIER", 8.92, 9.2, K), ("ET", 9.24, 9.24), ("TOUT.", 9.26, 9.36)],
    [("C'EST...", 9.4, 9.68)],
    [("ALLEZ.", 11.56, 11.7)],
]

ETIQ = [
    dict(t="IL A UN BISOU\nDANS LE COU", a=0.05, b=o(4.3), fond=BLANC, coul=NOIR, ang=-3, taille=54, x=298, y=880),
    dict(t="LA PREUVE", a=o(6.8), b=o(7.92), fond=ROSE, coul=BLANC, ang=-3, x=400, y=1500),
    dict(t="LE MÉTIER", a=o(8.76), b=o(10.29), fond=JAUNE, coul=NOIR, ang=3, taille=70, x=275, y=880),
]

SFX = [
    ("whoosh", 0.0, -4), ("pop", 0.06, -5),
    ("boom", 0.45 - PIC["boom"], -6),
    ("pop", o(4.34), -8),
    ("scratch", o(6.76) - PIC["scratch"], -4), ("pop", o(6.8), -5),
    ("boom", o(8.76) - PIC["boom"], -4), ("pop", o(8.78), -5),
    ("whoosh", o(11.4) - PIC["whoosh"], -8),
]

P = dict(NOM="E-bisou-dans-le-cou", SRC="E.mp4", o=o, fr=fr, DUR=DUR,
         PANNEAUX=[(0, SEAM, HAUT), (SEAM, H - SEAM, BAS)],
         SECOUSSES=[(0.45, 0.25, 12), (o(8.76), 0.35, 18)],
         FLASHS=[(0.45, 0.2, 0.4)],
         CAP=CAP, CAP_Y=656, ETIQ=ETIQ, ETIQ_Y=1470, SFX=SFX,
         MUSIQUE=dict(fichier="musique-swag.wav", debut=19.68, rel=-3, coupe=[(o(6.74), o(8.0))]),
         FONDU_FIN=0.35)

if __name__ == "__main__":
    lancer(P)
