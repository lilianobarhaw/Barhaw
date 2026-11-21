#!/bin/bash
# Les versions du générique pour le site : 720p et 480p, en WebM (VP9 + Opus) et en MP4 (H.264 + AAC), plus l'affiche.
# Débit plafonné (la mer et les îles coûtent cher) : environ 5 Mo en 720p WebM, 3 Mo en 480p.
# Usage : bash encoder_site.sh <source.mp4 avec le son> <dossier de sortie>
set -e
SRC="$1"; OUT="$2"
mkdir -p "$OUT"
vp9() { # $1 hauteur  $2 crf  $3 débit visé  $4 plafond  $5 débit opus
  ffmpeg -v error -y -i "$SRC" -vf "scale=-2:$1:flags=lanczos" -c:v libvpx-vp9 -crf $2 -b:v $3 -minrate 250k -maxrate $4 \
    -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -c:a libopus -b:a $5 "$OUT/generique-gl-$1.tmp.webm"
  mv "$OUT/generique-gl-$1.tmp.webm" "$OUT/generique-gl-$1.webm"
}
h264() { # $1 hauteur  $2 crf  $3 plafond  $4 débit aac
  ffmpeg -v error -y -i "$SRC" -vf "scale=-2:$1:flags=lanczos" -c:v libx264 -crf $2 -maxrate $3 -bufsize $(( ${3%k} * 2 ))k -preset slow \
    -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a $4 "$OUT/generique-gl-$1.tmp.mp4"
  mv "$OUT/generique-gl-$1.tmp.mp4" "$OUT/generique-gl-$1.mp4"
}
vp9 720 36 1000k 1600k 96k
vp9 480 38 560k 900k 80k
h264 720 27 1500k 128k
h264 480 28 850k 112k
ffmpeg -v error -y -ss 2.2 -i "$SRC" -frames:v 1 -vf "scale=1280:-2:flags=lanczos" -q:v 4 "$OUT/generique-gl.jpg"
ls -la "$OUT"
