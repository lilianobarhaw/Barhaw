# Clip C : le live dans le live (effet miroir à l'infini)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from moteur import *

# Le passage de 23,3 s à 37,5 s est volontairement retiré du montage.
SEGS = [(2.8, 23.2)]
o, fr, DUR = fait_o(SEGS)
C0 = (540, 960)

COUPS = [(o(4.54), 0.16), (o(7.02), 0.10), (o(8.96), 0.12), (o(11.62), 0.10), (o(12.46), 0.14),
         (o(19.68), 0.18), (o(22.38), 0.12)]


def plein(t):
    z = 1.0 + 0.45 * t / DUR
    if t < 0.35:
        z *= 1.12 - 0.12 * ease("out", t / 0.35)
    for t0, amp in COUPS:
        x = t - t0
        if x >= 0:
            z *= 1 + amp * ease("out", min(1, x / 0.08)) * (1 - ease("io", (x - 0.08) / 0.55))
    return (z, *C0)


CAP = [
    [("ÇA", 3.98, 4.059), ("FAIT", 4.12, 4.24), ("TROP", 4.28, 4.48), ("PEUR.", 4.54, 4.78, K)],
    [("MAIS", 5.12, 5.26), ("QU'EST-CE", 5.3, 5.54), ("QU'IL", 5.56, 5.68), ("FAIT ?", 5.8, 5.96)],
    [("REGARDE.", 6.5, 6.88)],
    [("MAIS", 6.92, 7.0), ("LILIANO,", 7.02, 7.46)],
    [("MAIS", 7.7, 7.9), ("QU'EST-CE", 7.92, 8.1), ("QU'ON", 8.32, 8.48), ("SE", 8.54, 8.6), ("MET ?", 8.64, 8.72)],
    [("IL", 8.74, 8.76), ("EST", 8.78, 8.94), ("BOURRÉ,", 8.96, 9.26, K), ("LE", 9.34, 9.44), ("BOUG.", 9.52, 9.8)],
    [("QU'EST-CE", 10.52, 10.66), ("QU'IL", 10.68, 10.8), ("A", 10.82, 10.9), ("FAIT ?", 10.98, 11.2)],
    [("LILIANO,", 11.62, 12.32), ("LILIANO,", 12.46, 12.76)],
    [("QU'EST-CE", 12.88, 13.2), ("QUI", 13.22, 13.28), ("SE", 13.32, 13.36), ("PASSE ?", 13.38, 13.48)],
    [("COMMENT", 13.5, 13.66), ("ÇA", 13.72, 13.78), ("SE", 13.82, 13.86), ("PASSE ?", 13.92, 14.1)],
    [("Y", 14.62, 14.66), ("A", 14.7, 14.74), ("PERSONNE", 14.86, 15.26), ("DANS", 15.3, 15.38), ("LE", 15.4, 15.48), ("JEU", 15.52, 15.64)],
    [("LÀ,", 15.7, 15.78), ("IL", 15.8, 15.84), ("FAUT", 15.9, 15.96), ("ATTENDRE.", 16.02, 16.42)],
    [("QU'EST-CE", 16.46, 16.66), ("QUE", 16.68, 16.8), ("TU", 16.8, 16.8), ("FAIS", 16.84, 17.06), ("LÀ ?", 17.1, 17.28)],
    [("C'EST", 17.38, 17.44), ("QUOI", 17.54, 17.78), ("ÇA ?", 17.92, 18.02)],
    [("BAH,", 18.7, 18.9), ("C'EST", 19.08, 19.22), ("POUR", 19.24, 19.36)],
    [("ANIMER", 19.68, 19.98, K), ("LE", 20.02, 20.12), ("LIVE.", 20.16, 20.56, K)],
    [("Y", 21.32, 21.36), ("A,", 21.6, 21.7), ("Y", 21.78, 21.82), ("A", 22.3, 22.34), ("LILIANO,", 22.38, 22.98), ("LÀ.", 23.04, 23.16)],
]

ETIQ = [
    dict(t="IL A MIS SON LIVE\nDANS SON LIVE", a=0.05, b=3.0, fond=BLANC, coul=NOIR, ang=-3),
    dict(t="EN ATTENDANT LA PARTIE", a=o(14.62), b=o(16.5), fond=JAUNE, coul=NOIR, ang=3, taille=52, x=540),
    dict(t="LE LIVE EST ANIMÉ", a=o(20.6), b=DUR + 1, fond=ROSE, coul=BLANC, ang=-3),
]

SFX = [
    ("glitch", 0.0, -6), ("pop", 0.06, -5),
    ("glitch", o(4.54) - PIC["glitch"], -7), ("whoosh", o(4.54) - PIC["whoosh"], -9),
    ("pop", o(7.02), -8),
    ("boom", o(8.96) - PIC["boom"], -8),
    ("glitch", o(11.62) - PIC["glitch"], -11), ("glitch", o(12.46) - PIC["glitch"], -10, 1.1),
    ("pop", o(14.62), -6),
    ("magie", o(19.68) - 0.03, -6),
    ("whoosh", o(20.6) - PIC["whoosh"], -6), ("pop", o(20.62), -5),
]

P = dict(NOM="C-live-dans-le-live", SRC="C.mp4", o=o, fr=fr, DUR=DUR,
         PANNEAUX=[(0, H, plein)],
         SECOUSSES=[(o(4.54), 0.3, 12), (o(8.96), 0.3, 12)],
         GLITCHS=[(0.0, 0.3, 1.0), (o(4.54), 0.25, 0.8), (o(11.62), 0.2, 0.55), (o(12.46), 0.2, 0.6),
                  (o(19.68), 0.22, 0.6)],
         FLASHS=[(o(19.68), 0.3, 0.45)],
         CAP=CAP, CAP_Y=1260, CAP_TAILLE=84, ETIQ=ETIQ, ETIQ_Y=560, SFX=SFX,
         MUSIQUE=dict(fichier="musique-chateau.wav", debut=28.0, rel=-4), FONDU_FIN=0.3)

if __name__ == "__main__":
    lancer(P)
