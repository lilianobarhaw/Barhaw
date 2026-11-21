# Une réponse impulsionnelle de grande salle sombre (stéréo, 2,8 s), pour la voix du capitaine
import numpy as np, wave, struct
SR = 48000
n = int(2.8 * SR)
rng = np.random.default_rng(7)
t = np.arange(n) / SR
ir = np.zeros((n, 2))
for c in range(2):
    bruit = rng.standard_normal(n)
    # les aigus s'éteignent plus vite que les graves : deux bandes, deux déclins
    from numpy.fft import rfft, irfft
    B = rfft(bruit)
    f = np.fft.rfftfreq(n, 1 / SR)
    grave = irfft(B * (f < 1800), n) * np.exp(-t / 0.62)
    aigu = irfft(B * (f >= 1800) * np.exp(-(f - 1800) / 6000), n) * np.exp(-t / 0.28)
    x = grave + 0.6 * aigu
    x *= np.minimum(1, t / 0.012)  # attaque douce
    ir[:, c] = x
# pré-délai 45 ms (la salle est grande)
pre = int(0.045 * SR)
ir = np.vstack([np.zeros((pre, 2)), ir])
ir /= np.abs(ir).max()
ir *= 0.5
with wave.open("ir_salle.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((ir * 32767).astype("<i2").tobytes())
print("ok", ir.shape)
