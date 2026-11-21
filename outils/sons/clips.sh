#!/bin/sh
# Les petites vidéos de la VF 1.0 (rendues par outils/blender/barhaw_clips_vf.py, presque sans perte) en version légère pour le site :
#   boss-<id>.mp4 (720 × 720, 3 s)  -> videos/boss/<id>.webm + .mp4 (640 × 640)
#   ile-<id>.mp4  (960 × 600, 4 s)  -> videos/iles/<id>.webm + .mp4 (960 × 600)
#   et celles du niveau 5 (outils/blender/barhaw_clips_v5.py) : boss-<id>-v5.mp4 -> videos/boss/<id>-v5.*, ile-<id>-v5.mp4 -> videos/iles/<id>-v5.*
#   (mettre dans <dossier des rendus> seulement les vidéos à réencoder : toutes celles qui y sont le sont)
# Usage : sh outils/sons/clips.sh <dossier des rendus> <dossier du site>
#   (CRF9=45 CRF4=30 sh … : plus léger ; les vidéos du niveau 5, pleines de détails, ont été faites ainsi)
set -e
SRC="$1"; SITE="$2"
mkdir -p "$SITE/videos/boss" "$SITE/videos/iles"
for f in "$SRC"/boss-*.mp4 "$SRC"/ile-*.mp4; do
  [ -f "$f" ] || continue
  nom=$(basename "$f" .mp4)
  case "$nom" in
    boss-*) id=${nom#boss-}; dest="$SITE/videos/boss/$id"; vf="scale=640:640:flags=lanczos"; crf9=${CRF9:-40}; crf4=${CRF4:-28} ;;
    ile-*) id=${nom#ile-}; dest="$SITE/videos/iles/$id"; vf="scale=960:600:flags=lanczos"; crf9=${CRF9:-40}; crf4=${CRF4:-28} ;;
  esac
  ffmpeg -v error -y -i "$f" -vf "$vf,format=yuv420p" -an -c:v libvpx-vp9 -b:v 0 -crf $crf9 -row-mt 1 -deadline good -cpu-used 2 -pass 1 -f null /dev/null
  ffmpeg -v error -y -i "$f" -vf "$vf,format=yuv420p" -an -c:v libvpx-vp9 -b:v 0 -crf $crf9 -row-mt 1 -deadline good -cpu-used 2 -pass 2 "$dest.webm"
  ffmpeg -v error -y -i "$f" -vf "$vf,format=yuv420p" -an -c:v libx264 -preset slow -crf $crf4 -profile:v high -movflags +faststart "$dest.mp4"
  rm -f ffmpeg2pass-0.log
  echo "$nom : $(du -k "$dest.webm" | cut -f1) ko (webm), $(du -k "$dest.mp4" | cut -f1) ko (mp4)"
done
