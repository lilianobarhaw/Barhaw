# Le son du teaser : la musique (Artlist, Ian Post « Taiyō (Sun) », version instrumentale) et les bruitages Artlist,
# calés sur le montage. Sort teaser-son.wav (48 kHz stéréo), normalisé autour de -14 LUFS.
import subprocess, sys, json, math
import numpy as np

SR = 48000
S = "/mnt/user-data/uploads/Barhaw-3D/son/"
TEMPS = 60 / 155
MES = 4 * TEMPS
DUREE = float(sys.argv[1]) if len(sys.argv) > 1 else 68.34
DEBUT_MUSIQUE = 100.81
COUPE = 10 * MES * 4  # 61.94 : la musique s'arrête net sur la carte de fin


def lire(nom):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", S + nom, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()


piste = np.zeros((int(DUREE * SR) + SR, 2), np.float32)


def poser(son, t, db=0.0, fondu_entree=0.0, fondu_sortie=0.0, duree=None):
    g = 10 ** (db / 20)
    x = son if duree is None else son[: int(duree * SR)]
    x = x * g
    n = len(x)
    if fondu_entree:
        k = min(n, int(fondu_entree * SR))
        x[:k] *= np.linspace(0, 1, k)[:, None]
    if fondu_sortie:
        k = min(n, int(fondu_sortie * SR))
        x[n - k:] *= np.linspace(1, 0, k)[:, None]
    i = int(t * SR)
    if i < 0:
        x = x[-i:]
        i = 0
    j = min(len(piste), i + len(x))
    piste[i:j] += x[: j - i]


# la musique
m = lire("musique-taiyo.wav")
extrait = m[int(DEBUT_MUSIQUE * SR): int((DEBUT_MUSIQUE + COUPE) * SR)]
poser(extrait, 0.0, -1.5, fondu_entree=1.6, fondu_sortie=0.02)

# l'ambiance de la mer : l'ouverture et les navires, puis la fin
mer = lire("mer-navire.wav")
poser(mer, 0.0, -13, fondu_entree=0.8, fondu_sortie=2.2, duree=12.6)
poser(mer[20 * SR:], COUPE + 0.2, -17, fondu_entree=1.2, fondu_sortie=2.0, duree=DUREE - COUPE - 0.2)

woosh = lire("whoosh-elastique.wav")
air = lire("whoosh-airy.wav")
taiko = lire("impact-taiko.wav")
tambour = lire("impact-tambour.wav")
montee = lire("montee-impact.wav")
pop = lire("pop-bulle.wav")
mignon = lire("ui-mignon.wav")
plouf = lire("plouf.wav")
bulles = lire("bulles-montee.wav")

b = lambda n: n * MES
bt = lambda n: n * TEMPS

# l'ouverture du port : un souffle
poser(air, b(2) - 0.05, -8)
poser(bulles, b(2) - 0.3, -16)
# les pieuvres qui plongent (plan b, à partir de 1,333 s dans le plan)
for tb in (1.867, 2.367, 2.833, 3.2, 3.833, 4.1, 4.733, 5.1, 5.633):
    t = b(5) + tb - 1.333
    if t < b(8) - 0.1:
        poser(plouf, t - 0.44, -14 + (2 if tb in (2.367, 3.833) else 0))
# les étiquettes des trois navires
for k in range(3):
    poser(pop, b(5) + bt(1) + k * 2 * TEMPS, -16)
# les balayages : un woosh qui culmine au milieu
for t in (b(8) - 0.2, b(10) - 0.2, b(13) - 0.2, b(32) - 0.2, b(36) - 0.2):
    poser(woosh, t - 0.99, -6)
# le titre : l'impact, puis le tampon VF 1.0
poser(taiko, b(8), -1)
poser(tambour, b(8), -4)
poser(tambour, b(8) + bt(1), -7)
# le site : les puces
for k in range(3):
    poser(mignon, b(10) + bt(4 + 2 * k), -12)
# GRAND LINE (plan c) : un woosh d'entrée et le titre
poser(air, b(13), -6)
poser(tambour, b(13) + 0.02, -9)
# la carte 3D : les bulles des pieuvres
poser(air, b(16), -7)
poser(bulles, b(16) + 0.6, -10)
poser(pop, b(16) + 0.75, -13)
poser(pop, b(16) + 1.15, -15)
poser(mignon, b(16) + 4.3, -11)
# les drapeaux
d0 = b(16) + 6.4
for k in range(3):
    poser(pop, d0 + k * TEMPS, -12)
for k in range(3):
    poser(mignon, d0 + bt(5 + k), -13)
# la montée vers les jeux : la montée Artlist dont l'impact tombe sur la mesure 24
poser(montee, b(24) - 4.238, -3, fondu_entree=0.5)
poser(taiko, b(24), -2)
# chaque jeu
for k in range(5):
    t = b(25) + k * MES
    poser(air, t - 0.03, -8)
    poser(tambour, t, -12)
# les gains et le boss
for k in range(5):
    poser(pop, b(30) + k * TEMPS / 2, -17)
for k in range(3):
    poser(mignon, b(30) + bt(4 + k), -12)
for k in range(3):
    poser(taiko, b(32) + k * 2 * TEMPS, -9 - 2 * k)
# les îles
poser(bulles, b(34), -12)
# le montage final : un souffle à chaque coupe
for k in range(12):
    poser(air if k % 2 else pop, b(36) + k * TEMPS - 0.02, -14 if k % 2 else -16)
poser(tambour, b(39) + TEMPS, -8)
# la carte de fin : le gros impact, la musique s'arrête
poser(taiko, COUPE, 0)
poser(tambour, COUPE, -2)
poser(woosh, COUPE - 0.99, -9)

piste = piste[: int(DUREE * SR)]
crete = np.abs(piste).max()
if crete > 0.98:
    piste *= 0.98 / crete
brut = "/home/claude/teaser2/son-brut.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", brut], input=piste.astype(np.float32).tobytes(), check=True)
# le volume des plateformes : -14 LUFS, crêtes à -1 dB
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", brut, "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", str(SR), "/home/claude/teaser2/teaser-son.wav"], check=True)
print("son prêt", round(DUREE, 2), "s")
