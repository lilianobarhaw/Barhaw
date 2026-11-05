# Les bruitages du site (VF 1.0). Usage : python3 outils/sons/effets.py <sons Artlist> <son/ du site>
# effets courts : coupés, fondu de fin, niveau égalisé (crête RMS 50 ms à -14 dBFS, crête max -1 dB), AAC mono 96k
import subprocess, json, numpy as np, sys
SR = 44100
S = sys.argv[1].rstrip("/") + "/"  # les sons Artlist téléchargés (Documents/Barhaw-3D/son)
O = sys.argv[2].rstrip("/") + "/"  # le dossier son/ du site
def lire(p, ch=1):
    b = subprocess.run(["ffmpeg","-v","error","-i",p,"-ac",str(ch),"-ar",str(SR),"-f","f32le","-"],capture_output=True,check=True).stdout
    return np.frombuffer(b, np.float32).reshape(-1, ch).copy()
def ecrire(y, dst, ch=1, debit="96k"):
    subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac",str(ch),"-i","-","-c:a","aac","-b:a",debit,"-movflags","+faststart",dst], input=y.astype(np.float32).tobytes(), check=True)
EFFETS = {
 # nom: (source, début, fin, fondu de fin, cible dB)
 "pop": ("pop-bulle.wav", 0.0, 0.26, 0.06, -14),
 "souffle": ("whoosh-airy.wav", 0.0, 0.18, 0.03, -16),
 "clic": ("ui-mignon.wav", 0.04, 0.2, 0.03, -16),
 "taiko": ("impact-taiko.wav", 0.0, 3.2, 1.0, -9),
 "impact": ("impact-tambour.wav", 0.0, 2.5, 0.6, -9),
 "quiz-bon": ("quiz-bon.wav", 0.04, 1.3, 0.12, -13),
 "quiz-faux": ("quiz-faux.wav", 0.0, 1.2, 0.12, -14),
 "carte": ("carte.wav", 0.0, 0.64, 0.08, -14),
 "paire": ("paire.wav", 0.0, 0.95, 0.12, -14),
 "saut": ("saut.wav", 0.0, 1.0, 0.25, -14),
 "tonneau": ("tonneau.wav", 0.0, 0.8, 0.12, -12),
 "cloche": ("cloche.wav", 0.1, 1.45, 0.3, -11),
 "potion": ("potion.wav", 0.05, 2.5, 0.4, -14),
 "soin": ("soin.wav", 0.04, 2.7, 0.5, -15),
 "victoire": ("victoire.wav", 0.06, 1.5, 0.2, -13),

}
res = {}
for nom, (src, a, b, f, cible) in EFFETS.items():
    x = lire(S + src)[:, 0]
    y = x[int(a*SR):int(b*SR)].copy()
    nf = int(f*SR); y[-nf:] *= np.linspace(1, 0, nf) ** 2
    ni = int(0.004*SR); y[:ni] *= np.linspace(0, 1, ni)
    w = int(0.05*SR)
    rms = max(np.sqrt(np.mean(y[i:i+w]**2)) for i in range(0, max(1, len(y)-w), w//2))
    g = 10**(cible/20) / max(rms, 1e-6)
    g = min(g, 10**(-1/20) / max(np.abs(y).max(), 1e-6))
    y *= g
    ecrire(y, O + nom + ".m4a")
    res[nom] = round(len(y)/SR, 2)
print(json.dumps(res))
