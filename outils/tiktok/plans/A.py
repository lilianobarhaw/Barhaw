# Clip A : le discours des 100 follows (Detroit, piano du jeu en fond)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from moteur import *

SEGS = [(0.2, 10.4), (13.3, 20.3), (21.15, 23.95), (25.1, 29.9)]
o, fr, DUR = fait_o(SEGS)
F, G = (540, 380), (540, 640)
SEAM = 640

VISAGE = [
    (0.0, (1.15, *F), "lin"), (0.35, (1.0, *F), "out"),
    (o(8.5), (1.12, *F), "lin"), (o(8.54) + 0.1, (1.32, *F), "out"),
    (o(10.39), (1.26, *F), "lin"), (o(13.3), (1.05, *F), "lin"),
    (o(19.7), (1.15, *F), "lin"), (o(19.74) + 0.1, (1.34, *F), "out"),
    (o(20.29), (1.3, *F), "lin"), (o(21.15), (1.08, *F), "lin"),
    (o(23.1), (1.18, *F), "lin"), (o(23.12) + 0.1, (1.4, *F), "out"),
    (o(23.94), (1.34, *F), "lin"), (o(25.1), (1.1, *F), "lin"),
    (o(26.02), (1.14, *F), "lin"), (o(26.04) + 0.1, (1.52, *F), "out"),
    (o(27.4), (1.25, *F), "io"), (o(27.46) + 0.1, (1.48, *F), "out"),
    (DUR, (1.22, *F), "io"),
]
JEU = [
    (0.0, (1.15, *G), "lin"), (0.35, (1.0, *G), "out"),
    (o(10.39), (1.1, *G), "lin"), (o(13.3), (1.0, *G), "lin"),
    (o(20.29), (1.1, *G), "lin"), (o(21.15), (1.0, *G), "lin"),
    (o(26.02), (1.08, *G), "lin"), (o(26.04) + 0.1, (1.3, *G), "out"),
    (DUR, (1.12, *G), "io"),
]

CAP = [
    [("ALORS", .36, .52), ("OUI,", .54, .76)],
    [("IL", 1.2, 1.24), ("Y", 1.3, 1.32), ("EN", 1.32, 1.32), ("A", 1.32, 1.4), ("QUI", 1.44, 1.5), ("VONT", 1.54, 1.64), ("DIRE", 1.68, 1.88)],
    [("100", 2.74, 2.86, K), ("FOLLOWS,", 2.94, 3.2), ("C'EST", 3.3, 3.46), ("PETIT", 3.5, 3.8)],
    [("100", 4.14, 4.28, K), ("FOLLOWS,", 4.36, 4.56), ("C'EST", 4.66, 4.84), ("PAS", 5.4, 5.48), ("GRAND-CHOSE", 5.52, 5.96)],
    [("MAIS", 6.92, 6.98), ("AU", 7.0, 7.04), ("FINAL...", 7.1, 7.38)],
    [("100", 8.54, 8.72, K), ("PERSONNES.", 8.78, 9.38)],
    [("OH", 13.48, 13.64), ("QUE", 13.7, 13.78), ("OUI,", 13.84, 13.96)],
    [("100", 14.1, 14.28, K), ("PERSONNES.", 14.34, 14.86)],
    [("100", 15.88, 16.04, K), ("PERSONNES", 16.14, 16.46), ("ME", 16.5, 16.56), ("SUIVENT", 16.6, 16.84)],
    [("MAINTENANT,", 16.88, 17.1), ("AUJOURD'HUI.", 17.12, 17.5)],
    [("ET", 18.38, 18.46), ("DEMAIN,", 18.5, 18.74), ("PEUT-ÊTRE,", 18.82, 19.2)],
    [("ON", 19.4, 19.48), ("SERA", 19.52, 19.68), ("1 000.", 19.74, 19.96, K)],
    [("ALLEZ,", 21.3, 21.54), ("PEUT-ÊTRE", 21.8, 22.08), ("QUE", 22.1, 22.16), ("DEMAIN,", 22.22, 22.46)],
    [("ON", 22.72, 22.8), ("SERA", 22.84, 23.0), ("10 000.", 23.12, 23.54, K)],
    [("ET", 25.22, 25.28), ("POURQUOI", 25.56, 25.78), ("PAS", 25.84, 25.94)],
    [("100 000,", 26.04, 26.4, K), ("PEUT-ÊTRE ?", 26.48, 26.78)],
    [("100 000,", 27.46, 27.82, K), ("PEUT-ÊTRE.", 27.86, 28.24)],
]

ETIQ = [
    dict(t="LE DISCOURS\nDES 100 FOLLOWS", a=0.05, b=2.95, fond=BLANC, coul=NOIR, ang=-3),
    dict(t="100", a=o(8.54), b=o(10.39), fond=JAUNE, coul=NOIR, ang=-4, taille=120),
    dict(t="1 000", a=o(19.74), b=o(22.7), fond=JAUNE, coul=NOIR, ang=3, taille=130),
    dict(t="10 000", a=o(23.12), b=o(26.0), fond=JAUNE, coul=NOIR, ang=-3, taille=140),
    dict(t="100 000", a=o(26.04), b=DUR + 1, fond=ROSE, coul=BLANC, ang=2, taille=150),
]

SFX = [
    ("whoosh", 0.0, -4), ("pop", 0.06, -5),
    ("whoosh", o(8.54) - PIC["whoosh"], -7), ("pop", o(8.54), -4),
    ("boom", o(19.74) - PIC["boom"], -11), ("pop", o(19.74), -3, 1.1),
    ("boom", o(23.12) - PIC["boom"], -8), ("pop", o(23.12), -2, 1.2),
    ("montee", o(26.04) - PIC["montee"], -7), ("boom", o(26.04) - PIC["boom"], -4),
    ("pop", o(26.04), -2, 1.3), ("applaudissements", o(26.04) - 0.3, -11),
    ("boom", o(27.46) - PIC["boom"], -9),
]

P = dict(NOM="A-discours-100-follows", SRC="A.mp4", o=o, fr=fr, DUR=DUR,
         PANNEAUX=[(0, SEAM, VISAGE), (SEAM, H - SEAM, JEU)],
         SECOUSSES=[(o(19.74), 0.25, 10), (o(23.12), 0.3, 14), (o(26.04), 0.45, 24), (o(27.46), 0.3, 14)],
         FLASHS=[(o(26.04), 0.3, 0.6), (o(27.46), 0.25, 0.35)],
         CAP=CAP, CAP_Y=652, ETIQ=ETIQ, ETIQ_Y=1150, SFX=SFX, MUSIQUE=None, FONDU_FIN=0.6)

if __name__ == "__main__":
    lancer(P)
