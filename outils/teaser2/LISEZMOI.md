# Le teaser de la VF 1.0 (version 2)

68 s, en 16:9 (1920 × 1080) et en 9:16 (1080 × 1920), à 30 images/s.

- **Musique** : Ian Post, « Taiyō (Sun) », version instrumentale (Artlist, licence de LilianoBarhaw). Le teaser utilise l'extrait de 100,81 s à 162,74 s (155 BPM). Le montage est calé sur ses mesures.
- **Bruitages** : Artlist (souffles, impacts taiko, pops, plouf, mer).
- **Polices** : Dela Gothic One et M PLUS Rounded 1c (Google Fonts, licence OFL).

## Étapes

1. Plans 3D dans Blender : `outils/blender/barhaw_teaser_vf2.py` (port, flotte avec les pieuvres de Squirt.exe, îles). Rendu en 1080p 30 i/s, puis encodé en mp4 dans Blender.
2. Le site filmé image par image : `tournage.py` (horloge maîtrisée, vraies polices, éléments de l'aperçu cachés).
   - `plans_2d.py` filme l'accueil et les jeux ;
   - `plans_3d.py` filme la carte GRAND LINE en 3D.
3. Montage : `python3 montage.py h` puis `python3 montage.py v`. `mg.py` contient les briques : textes au trait d'encre, étiquettes, cadres, transitions et particules.
4. Son : `python3 mix.py`, normalisé autour de -14 LUFS.
5. Assemblage : `python3 assembler.py h|v`.

Le teaser ne contient rien de One Piece et aucun nom de joueur. Seuls les noms des commus apparaissent.
