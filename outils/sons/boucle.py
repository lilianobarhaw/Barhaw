# fabrique une boucle musicale sans couture (alignée sur les temps) + 0,5 s de marge de chaque côté
import subprocess, sys, json, numpy as np
SR = 44100
def lire(p, ch=2):
    b = subprocess.run(["ffmpeg","-v","error","-i",p,"-ac",str(ch),"-ar",str(SR),"-f","f32le","-"],capture_output=True,check=True).stdout
    return np.frombuffer(b, np.float32).reshape(-1, ch).copy()
def onsets(m, hop=512, n=2048):
    w = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(m, n)[::hop] * w
    S = np.abs(np.fft.rfft(frames, axis=1))
    S = np.log1p(S * 10)
    flux = np.maximum(0, np.diff(S, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux -= np.convolve(flux, np.ones(16)/16, mode="same")
    return np.maximum(flux, 0), hop / SR
def score(env, dt, t0, t1, P, phi):
    ts = np.arange(phi, t1, P); ts = ts[ts >= t0]
    idx = (ts / dt).astype(int); idx = idx[idx < len(env)]
    # tolérance ±1 trame
    v = np.maximum(env[idx], np.maximum(env[np.minimum(idx+1, len(env)-1)], env[np.maximum(idx-1, 0)]))
    return v.mean()
def principal(src, dst, bpm, debut, temps, xf_temps=1, pad=0.5, debit="128k", gain_db=0.0):
    x = lire(src); m = x.mean(axis=1)
    env, dt = onsets(m)
    t0, t1 = debut, debut + 40
    best = None
    for b in np.arange(bpm - 2, bpm + 2.001, 0.05):
        P = 60 / b
        for phi in np.arange(debut, debut + P, 0.005):
            s = score(env, dt, t0, t1, P, phi)
            if best is None or s > best[0]: best = (s, b, phi)
    _, b, phi = best
    P = 60 / b
    L = temps * P
    s = int(round(phi * SR)); n = int(round(L * SR)); X = int(round(xf_temps * P * SR))
    A = x[s:s + n + X]
    y = A[:n].copy()
    t = np.linspace(0, np.pi / 2, X)[:, None]
    y[:X] = A[:X] * np.sin(t) + A[n:n + X] * np.cos(t)
    p = int(pad * SR)
    out = np.concatenate([y[-p:], y, y[:p]]) * (10 ** (gain_db / 20))
    pk = np.abs(out).max()
    if pk > 0.95: out *= 0.95 / pk
    raw = out.astype(np.float32).tobytes()
    subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","2","-i","-","-c:a","aac","-b:a",debit,"-movflags","+faststart",dst], input=raw, check=True)
    return dict(bpm=round(float(b),2), debut=round(float(phi),3), boucle=round(float(n / SR), 4), marge=pad)
if __name__ == "__main__":
    a = json.loads(sys.argv[1])
    print(json.dumps(principal(**a)))
