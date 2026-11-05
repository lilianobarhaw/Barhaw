# Assemble les scènes d'un format (h ou v) dans l'ordre, puis pose le son : teaser-vf.mp4 / teaser-vf-vertical.mp4
import json, os, subprocess, sys
ICI = "/home/claude/teaser2"
fmt = sys.argv[1]
d = f"{ICI}/scenes-{fmt}/"
import montage  # noqa : pour l'ordre des scènes
ordre = [n for (n, *_ ) in montage.SCENES]
liste = d + "liste.txt"
with open(liste, "w") as f:
    for n in ordre:
        assert os.path.exists(d + n + ".mp4"), n
        f.write(f"file '{d}{n}.mp4'\n")
video = f"{ICI}/video-{fmt}.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste, "-c", "copy", video], check=True)
nom = "teaser-vf.mp4" if fmt == "h" else "teaser-vf-vertical.mp4"
sortie = f"/mnt/user-data/outputs/{nom}"
tmp = sortie[:-4] + ".tmp.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", f"{ICI}/teaser-son.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", tmp], check=True)
os.replace(tmp, sortie)
r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size", "-of", "csv=p=0", sortie], capture_output=True, text=True)
print(sortie, r.stdout.strip())
