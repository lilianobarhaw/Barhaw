# La prise « vf.wav » de Liliano (déjà grave) : on garde sa voix telle quelle (pas de changement de hauteur), on la soigne
# (graves, présence, un peu de grain, compression), une octave fantôme très discrète dessous, et une grande salle.
import json, subprocess, os
SEG = {"rire": (0.61, 3.79), "alors_comme_ca": (5.27, 6.21), "vous_voulez": (7.21, 9.34), "veyzo": (11.62, 12.44),
       "kikso": (13.28, 14.08), "cette_mer": (15.06, 16.32), "mes_iles_monstres": (17.87, 19.12), "mes_regles": (19.58, 20.53),
       "aucun_equipage": (21.82, 24.11), "bienvenue_sur": (25.41, 26.65), "grand_line": (27.94, 28.80)}
HUMIDE = float(os.environ.get("HUMIDE", "-12"))
def ff(*a):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *a], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-2000:])
info = {}
for nom, (a, b) in SEG.items():
    d0, d1 = max(0.0, a - 0.08), b + 0.30
    sec = f"vf/{nom}-sec.wav"
    graphe = (
        f"[0:a]pan=mono|c0=c0,atrim=start={d0}:end={d1},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st={d1 - d0 - 0.12:.3f}:d=0.12,"
        "highpass=f=70,lowpass=f=13500,apad=pad_dur=3.2,asplit=2[a][b];"
        "[a]equalizer=f=100:t=q:w=1:g=2,equalizer=f=330:t=q:w=1:g=-3,equalizer=f=3000:t=q:w=1.2:g=3,deesser=i=0.4,"
        "volume=4dB,asoftclip=type=tanh,acompressor=threshold=-20dB:ratio=3:attack=6:release=150:makeup=3[main];"
        "[b]rubberband=pitch=0.5:formant=shifted,lowpass=f=1200,volume=-24dB[oct];"
        "[main][oct]amix=inputs=2:normalize=0,pan=stereo|c0=c0|c1=c0[s]"
    )
    ff("-i", "brut/vf.wav", "-filter_complex", graphe, "-map", "[s]", "-ar", "48000", "-c:a", "pcm_s24le", sec)
    sortie = f"vf/{nom}.wav"
    graphe2 = (f"[0:a]asplit=2[d][e];[e][1:a]afir=dry=0:wet=1[w];[w]volume={HUMIDE}dB,highpass=f=150[w2];"
               "[d][w2]amix=inputs=2:normalize=0,silenceremove=stop_periods=1:stop_duration=0.6:stop_threshold=-62dB[m]")
    ff("-i", sec, "-i", "ir_salle.wav", "-filter_complex", graphe2, "-map", "[m]", "-ar", "48000", "-c:a", "pcm_s24le", sortie)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", sortie, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex("{"):])
    gain = -16.0 - float(j["input_i"])
    ff("-i", sortie, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false", "-ar", "48000", "-c:a", "pcm_s24le", f"vf/{nom}-n.wav")
    os.replace(f"vf/{nom}-n.wav", sortie)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", sortie], capture_output=True, text=True).stdout)
    info[nom] = {"debut_parole": round(a - d0, 3), "parole": round(b - a, 3), "duree": round(dur, 3)}
    print(f"{nom:18s} parole {b - a:4.2f} s  fichier {dur:4.2f} s  gain {gain:+5.1f} dB", flush=True)
info["mes_iles_monstres"]["coupure_monstres"] = round(18.41 - (17.87 - 0.08), 3)  # où commence « mes monstres » dans le fichier
json.dump(info, open("vf/repliques.json", "w"), indent=1)
