# Le son du générique : la musique (coupée sur ses mesures), la voix du capitaine, les bruitages, puis le mixage
# (la musique s'efface sous la voix, la brume étouffe la musique au début) et le niveau final (-16 LUFS, crête -1,5 dBTP).
# Usage : python3 mix_gen.py  ->  sortie/generique-son.wav
import json, math, os, subprocess
import numpy as np
from scipy.signal import butter, lfilter, lfilter_zi, fftconvolve
import plan_gen as P

SR = 48000
ICI = os.environ.get("GEN_DOSSIER", "/home/claude/generique/")  # voix/vf/, voix/ir_salle.wav et sortie/
SON = os.environ.get("GEN_SONS", "/mnt/user-data/uploads/Barhaw-3D/son/")  # la banque de bruitages et la musique
VOIX = ICI + "voix/vf/"
MUSIQUE = SON + "generique/Leva - Spark.wav"
SORTIE = ICI + "sortie/"
N = int((P.DUREE + 0.5) * SR)


def charger(chemin):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", chemin, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def poser(piste, son, t, gain_db=0.0, fondu_entree=0.0, fondu_sortie=0.0, duree=None, debut_source=0.0):
    a = int(round(t * SR))
    s = son[int(debut_source * SR):]
    if duree is not None:
        s = s[:int(duree * SR)]
    s = s * db(gain_db)
    if fondu_entree > 0:
        k = min(len(s), int(fondu_entree * SR))
        s[:k] *= np.linspace(0, 1, k)[:, None]
    if fondu_sortie > 0:
        k = min(len(s), int(fondu_sortie * SR))
        s[len(s) - k:] *= np.linspace(1, 0, k)[:, None]
    if a < 0:
        s = s[-a:]
        a = 0
    b = min(len(piste), a + len(s))
    piste[a:b] += s[:b - a]


def passe_bas(x, f, ordre=2):
    b, a = butter(ordre, min(0.99, f / (SR / 2)), "low")
    return lfilter(b, a, x, axis=0).astype(np.float32)


def passe_haut(x, f, ordre=2):
    b, a = butter(ordre, f / (SR / 2), "high")
    return lfilter(b, a, x, axis=0).astype(np.float32)


IR = charger(ICI + "voix/ir_salle.wav")
IR = IR / np.sqrt((IR ** 2).sum(axis=0, keepdims=True))  # une réponse d'énergie 1 : la salle ne monte pas le niveau


def salle(x, humide_db=-8.0):
    """Le son dans la grande salle (les bruits lointains : la cloche, la corne de brume)."""
    h = np.stack([fftconvolve(x[:, c], IR[:, c])[:len(x) + len(IR) - 1] for c in range(2)], axis=1).astype(np.float32)
    s = np.zeros_like(h)
    s[:len(x)] += x
    return s + h * db(humide_db)


def balayage_passe_bas(x, t0, t1, f0, f1, debut_piste):
    """La musique sort de la brume : un passe-bas qui s'ouvre de f0 à f1 entre t0 et t1 (secondes de la vidéo)."""
    y = np.zeros_like(x)
    bloc = 480
    zi = None
    for i in range(0, len(x), bloc):
        t = debut_piste + i / SR
        u = min(1.0, max(0.0, (t - t0) / (t1 - t0)))
        f = f0 * (f1 / f0) ** (u ** 1.6)
        b, a = butter(2, min(0.99, f / (SR / 2)), "low")
        if zi is None:
            zi = np.stack([lfilter_zi(b, a) * x[0, c] for c in range(2)], axis=1)
        seg, zi_new = [], []
        for c in range(2):
            out, z = lfilter(b, a, x[i:i + bloc, c], zi=zi[:, c])
            seg.append(out)
            zi_new.append(z)
        zi = np.stack(zi_new, axis=1)
        y[i:i + bloc] = np.stack(seg, axis=1)
    return y


def enveloppe(x, attaque=0.02, relache=0.25):
    """L'enveloppe (en amplitude) d'un signal : pour faire s'effacer la musique sous la voix."""
    m = np.abs(x).max(axis=1)
    k = 240
    m = m[:len(m) // k * k].reshape(-1, k).max(axis=1)
    e = np.zeros_like(m)
    aa, rr = math.exp(-k / SR / attaque), math.exp(-k / SR / relache)
    v = 0.0
    for i, s in enumerate(m):
        v = aa * v + (1 - aa) * s if s > v else rr * v + (1 - rr) * s
        e[i] = v
    return np.repeat(e, k)


def mixer():
    musique = charger(MUSIQUE)
    # --- la musique : la mesure 63 à 80, puis 85 à la fin (les mesures 81 à 84 répètent 77 à 80) ---
    mus = np.zeros((N, 2), np.float32)
    for (s0, s1, v0) in P.MUSIQUE:
        morceau = musique[int(s0 * SR):int(s1 * SR)].copy()
        k = int(0.008 * SR)
        morceau[:k] *= np.linspace(0, 1, k)[:, None]
        morceau[-k:] *= np.linspace(1, 0, k)[:, None]
        poser(mus, morceau, v0)
    # la brume : la musique arrive étouffée (le passe-bas s'ouvre de 2,5 s à 10 s, au début de la montée)
    mus = balayage_passe_bas(mus, 2.5, 10.0, 380.0, 20000.0, 0.0)
    # son niveau : discret sous l'ouverture, plein au refrain
    gain = np.ones(N, np.float32)
    t = np.arange(N) / SR
    gain *= np.interp(t, [0, 2.5, 6.0, 10.0, 20.4, 23.5, 41.0, 45.5], [0, db(-9), db(-6), db(-3.5), db(-3), db(0), db(0), db(0)]).astype(np.float32)
    mus *= gain[:, None]

    # --- la voix du capitaine ---
    voix = np.zeros((N, 2), np.float32)
    rep = json.load(open(VOIX + "repliques.json"))
    for nom, t_parole in P.VOIX:
        v = charger(VOIX + nom + ".wav")
        poser(voix, v, t_parole - rep[nom]["debut_parole"], gain_db=0.0)
    # la musique s'efface sous la voix (jusqu'à -12 dB) ; les bruitages un peu moins (-8 dB), plus bas
    env = enveloppe(voix)
    env = np.pad(env, (0, max(0, N - len(env))))[:N]
    presence = np.clip(env / 0.2, 0, 1)
    mus *= (1 - presence * (1 - db(-12)))[:, None].astype(np.float32)
    reduc_fx = (1 - presence * (1 - db(-8)))[:, None].astype(np.float32)

    # --- les bruitages ---
    fx = np.zeros((N, 2), np.float32)
    S = lambda nom: charger(SON + nom)
    vent, vagues = S("recit-vent-plainte.wav"), S("mer-vagues.wav")
    # l'ouverture : la mer, le vent dans la brume ; ils s'arrêtent net au refrain, et reviennent à la fin
    poser(fx, passe_bas(vagues, 2500), 0.0, -9, fondu_entree=1.0, fondu_sortie=0.4, duree=23.4)
    poser(fx, vent, 0.0, -12, fondu_entree=1.5, fondu_sortie=0.4, duree=23.4, debut_source=3.0)
    poser(fx, passe_bas(vagues, 2500), 40.6, -16, fondu_entree=0.8, fondu_sortie=1.2, duree=4.9, debut_source=30.0)
    poser(fx, vent, 40.6, -20, fondu_entree=0.8, fondu_sortie=1.2, duree=4.9, debut_source=12.0)
    # au loin : la corne de brume, la cloche d'une bouée
    poser(fx, salle(passe_bas(S("recit-corne-brume.wav"), 1800), -4), 0.15, -16)
    poser(fx, salle(passe_bas(S("recit-cloche-navire.wav"), 3000), -6), 1.6, -24, duree=5.0, fondu_sortie=1.5)
    poser(fx, salle(passe_bas(S("recit-cloche-navire.wav"), 2500), -4), 42.4, -26, duree=3.0, fondu_sortie=1.2)
    # le vaisseau : le bois qui grince, des murmures autour du capitaine
    grince = S("recit-bois-grince.wav")
    poser(fx, grince, 3.4, -15, duree=3.0, fondu_sortie=0.5)
    poser(fx, grince, 6.5, -18, duree=2.5, fondu_sortie=0.5, debut_source=3.0)
    poser(fx, passe_haut(S("recit-murmures.wav"), 300), 6.1, -9, fondu_entree=0.6, fondu_sortie=0.8, duree=3.4)
    # la montée : le souffle du monstre, le tonnerre de l'éclair, puis la montée qui frappe au premier arrêt
    poser(fx, S("recit-souffle-monstre.wav"), 13.75, -10, fondu_sortie=0.4, duree=1.6)
    poser(fx, S("recit-tonnerre.wav"), 15.45 - 1.22, -10, fondu_sortie=1.0, duree=3.2)
    poser(fx, S("montee-impact.wav"), 20.5 - 4.30, -9, fondu_entree=0.5, duree=5.2)
    # les deux arrêts : un coup sourd sur chaque frappe de la musique
    coup = S("recit-coup-sombre.wav")
    poser(fx, coup, P.b(48) - 0.04, -8)
    poser(fx, coup, P.b(52) - 0.04, -9)
    # le refrain : un grand coup au plein jour, un souffle qui y mène
    poser(fx, S("impact-taiko.wav"), P.b(56) - 0.02, -5)
    sw = S("whoosh-elastique.wav")
    poser(fx, sw[::-1].copy(), P.b(56) - (len(sw) / SR - 0.42), -16)
    # les îles : une gerbe à chaque maître qui jaillit, et la petite signature de quelques îles
    plouf = S("plouf.wav")
    for k in range(8):
        poser(fx, plouf, P.b(64 + 2 * k) + 0.12, -12)
    poser(fx, S("recit-crapaud.wav"), P.b(66) + 0.1, -16)
    poser(fx, S("recit-verre-chante.wav"), P.b(68), -18, duree=0.75, fondu_sortie=0.2)
    poser(fx, S("recit-horloge.wav"), P.b(74), -12, duree=0.75, fondu_sortie=0.1, debut_source=1.0)
    poser(fx, S("recit-canon.wav"), P.b(78) + 0.25 - 0.58, -12)
    # la baleine, le monstre
    poser(fx, S("saut.wav"), P.b(80) + 0.15, -12)
    poser(fx, plouf, P.b(80) + 1.0, -9)
    poser(fx, S("recit-souffle-monstre.wav"), P.b(83), -11, duree=1.4, fondu_sortie=0.3, debut_source=5.0)
    poser(fx, plouf, P.b(83) + 0.35, -8)
    # les boss : un tambour à chaque nom, le tonnerre de l'orage
    tambour = S("impact-tambour.wav")
    for k, tb in enumerate((P.b(88), P.b(90.67), P.b(93.33))):
        poser(fx, tambour, tb, -7)
    poser(fx, S("recit-tonnerre.wav"), P.b(88) - 0.6, -13, duree=3.5, fondu_sortie=1.0)
    # la fin de la musique : le logo
    poser(fx, S("impact-taiko.wav"), P.b(96) - 0.02, -6)
    poser(fx, coup, P.b(96) - 0.04, -10)
    poser(fx, passe_haut(S("recit-murmures.wav"), 300), 41.3, -18, fondu_entree=0.8, fondu_sortie=1.2, duree=3.8)

    fx *= reduc_fx
    # --- le mélange ---
    np.save(SORTIE + "piste-musique.npy", (mus * db(-1.0))[::4])
    np.save(SORTIE + "piste-voix.npy", (voix * db(-1.5))[::4])
    np.save(SORTIE + "piste-bruits.npy", (fx * db(-2.0))[::4])
    tout = mus * db(-1.0) + voix * db(-1.5) + fx * db(-2.0)
    # la fin : tout s'éteint avec l'image
    t = np.arange(N) / SR
    tout *= np.interp(t, [0, P.DUREE - 1.2, P.DUREE], [1, 1, 0]).astype(np.float32)[:, None]
    brut = SORTIE + "generique-son-brut.wav"
    with open(brut + ".f32", "wb") as f:
        f.write(np.ascontiguousarray(tout[:int(P.DUREE * SR)]).astype(np.float32).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", brut + ".f32", "-c:a", "pcm_s24le", brut], check=True)
    os.remove(brut + ".f32")
    # le niveau final : une compression douce du mélange, -16 LUFS, crête -1,5 dBTP
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", brut, "-af", "acompressor=threshold=-18dB:ratio=2:attack=15:release=200,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex("{"):])
    filtre = (f"acompressor=threshold=-18dB:ratio=2:attack=15:release=200,loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:"
              f"measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", brut, "-af", filtre, "-ar", str(SR), "-c:a", "pcm_s24le", SORTIE + "generique-son.wav"], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", SORTIE + "generique-son.wav", "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    j2 = json.loads(r.stderr[r.stderr.rindex("{"):])
    print("niveau final", j2["input_i"], "LUFS, crête", j2["input_tp"], "dBTP")


if __name__ == "__main__":
    mixer()
