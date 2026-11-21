import numpy as np, plan_gen as P
SR = 12000
m, v, f = (np.load(f"../sortie/piste-{n}.npy") for n in ("musique", "voix", "bruits"))
def rms(x, a, b):
    s = x[int(a*SR):int(b*SR)]
    return 20*np.log10(np.sqrt(np.mean(s**2)) + 1e-9)
print("réplique              voix   musique+bruits   écart")
for nom, t in P.VOIX:
    # la fenêtre de parole : du début à ~0,9 s (les répliques courtes) ou plus
    d = {"rire": 3.1, "vous_voulez": 2.1, "aucun_equipage": 2.2, "mes_iles_monstres": 1.2, "bienvenue_sur": 1.2, "cette_mer": 1.2}.get(nom, 0.8)
    rv = rms(v, t, t + d); rb = rms(m + f, t, t + d)
    print(f"{nom:20s} {rv:6.1f}   {rb:6.1f}        {rv - rb:+5.1f} dB")
print()
print("le niveau dans le temps (par 1,5 s) : musique / voix / bruits / total")
for a in np.arange(0, P.DUREE, 1.5):
    tot = m + v + f
    print(f"{a:5.1f}s  mus {rms(m,a,a+1.5):6.1f}  voix {rms(v,a,a+1.5):6.1f}  bruits {rms(f,a,a+1.5):6.1f}  total {rms(tot,a,a+1.5):6.1f}")
